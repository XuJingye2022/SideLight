/**
 * 变体复现：整篇是一个大段落（从别处粘贴的常见形态），全选后分析。
 * 与 diag-longdoc-annot 的差别只在「段落数」。
 */
import { chromium } from 'playwright-core'

const url = process.argv[2] ?? 'http://localhost:5173'
const browser = await chromium.connectOverCDP('http://127.0.0.1:9222')
const context = browser.contexts()[0] ?? (await browser.newContext())
const page = await context.newPage()
await page.setViewportSize({ width: 1440, height: 900 })

const errors = []
page.on('pageerror', (error) => errors.push(String(error)))
let failed = 0
const check = (label, ok, extra = '') => {
  if (!ok) failed += 1
  console.log(`${ok ? 'PASS' : 'FAIL'} ${label}${extra ? ` (${extra})` : ''}`)
}

await page.goto(url, { waitUntil: 'networkidle' })
await page.evaluate(() => localStorage.clear())
await page.reload({ waitUntil: 'networkidle' })
await page.waitForSelector('.doc-column .ProseMirror', { timeout: 15000 })

// 一万字，但只有一段
const sentence = '写作是一件需要耐心的事，句子之间要有呼吸，段落之间要有台阶。'
const single = sentence.repeat(1200)
await page.getByRole('button', { name: '源码', exact: true }).click()
await page.waitForTimeout(300)
await page.locator('.source-editor').fill(single)
await page.waitForTimeout(300)
await page.getByRole('button', { name: '源码', exact: true }).click()
await page.waitForTimeout(900)

const statsText = (await page.textContent('.status-bar'))?.replace(/\s+/g, ' ').trim() ?? ''
const count = Number(((statsText.match(/([\d,]+) 字/) ?? [])[1] ?? '0').replace(/,/g, ''))
check('0 一万字单段', count > 8000, `${count} 字`)

await page.locator('.editor').click()
await page.keyboard.press('Control+a')
await page.keyboard.press('Control+Enter')
const deadline = Date.now() + 40000
while (Date.now() < deadline) {
  const busy = await page.locator('.analyze-button').evaluate((el) => el.textContent?.includes('分析中') ?? false).catch(() => false)
  if (!busy) break
  await page.waitForTimeout(300)
}
await page.waitForTimeout(500)

const data = await page.evaluate(() => {
  const scroller = document.querySelector('.doc-scroll')
  const total = scroller ? scroller.scrollHeight : 1
  const tops = Array.from(document.querySelectorAll('.editor .annot')).map((node) => {
    const rect = node.getBoundingClientRect()
    const scrollTop = scroller ? scroller.scrollTop : 0
    return Math.round(rect.top + scrollTop)
  })
  return { total, tops }
})
const furthest = data.tops.length > 0 ? Math.max(...data.tops) : 0
const ratio = data.total > 0 ? furthest / data.total : 0

check('1 有批注产生', data.tops.length > 0, `高亮=${data.tops.length}`)
check('2 单段长文的批注也覆盖后段', ratio > 0.6, `最远一处=${(ratio * 100).toFixed(0)}% 高亮=${data.tops.length}`)
check('无控制台错误', errors.length === 0, errors.slice(0, 2).join(' | '))

await page.close()
await browser.close()
process.exit(failed === 0 ? 0 : 1)
