/**
 * 复现：一万字文档里全选后分析，批注只落在开头。
 * 判据是「批注覆盖到文档后段」——用户看到的就是这个。
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

// 两百段、约一万字，每段都能被认出来
const long = Array.from(
  { length: 200 },
  (_, i) =>
    `## 第 ${i} 节\n\n这是第 ${i} 段的正文，用来把文档撑到一万字以上。写作是一件需要耐心的事，句子之间要有呼吸，段落之间要有台阶。`,
).join('\n\n')
await page.getByRole('button', { name: '源码', exact: true }).click()
await page.waitForTimeout(300)
await page.locator('.source-editor').fill(long)
await page.waitForTimeout(300)
await page.getByRole('button', { name: '源码', exact: true }).click()
await page.waitForTimeout(900)

const statsText = (await page.textContent('.status-bar'))?.replace(/\s+/g, ' ').trim() ?? ''
const count = Number(((statsText.match(/([\d,]+) 字/) ?? [])[1] ?? '0').replace(/,/g, ''))
check('0 文档已是一万字', count > 8000, `${count} 字`)

// 全选 → Ctrl+Enter
await page.locator('.editor').click()
await page.keyboard.press('Control+a')
await page.waitForTimeout(200)
await page.keyboard.press('Control+Enter')

// 一直等到「分析中」结束，而不是死等固定时间
const deadline = Date.now() + 20000
while (Date.now() < deadline) {
  const busy = await page.locator('.analyze-button').evaluate((el) => el.textContent?.includes('分析中') ?? false).catch(() => false)
  if (!busy) break
  await page.waitForTimeout(250)
}
await page.waitForTimeout(400)

const notes = await page.locator('.note').count()
const coverage = await page.evaluate(() => {
  const scroller = document.querySelector('.doc-scroll')
  const total = scroller ? scroller.scrollHeight : 1
  const tops = Array.from(document.querySelectorAll('.editor .annot')).map((node) => {
    const rect = node.getBoundingClientRect()
    const scrollTop = scroller ? scroller.scrollTop : 0
    return Math.round(rect.top + scrollTop)
  })
  return { total, tops }
})
const furthest = coverage.tops.length > 0 ? Math.max(...coverage.tops) : 0
const ratio = coverage.total > 0 ? furthest / coverage.total : 0

check('1 有批注产生', notes > 0, `批注=${notes}`)
check('2 批注覆盖到文档后段', ratio > 0.6, `最远一处=${(ratio * 100).toFixed(0)}% 高亮数=${coverage.tops.length}`)
check('无控制台错误', errors.length === 0, errors.slice(0, 2).join(' | '))

await page.close()
await browser.close()
process.exit(failed === 0 ? 0 : 1)
