import { chromium } from 'playwright-core'
import { mkdir, readFile } from 'node:fs/promises'

const URL = process.argv[2] ?? 'http://localhost:5173'
const CDP = process.env.SIDELIGHT_CDP ?? 'http://127.0.0.1:9222'
const OUT = '.tmp/r4-export'

const results = []
const check = (label, ok, extra = '') => {
  results.push({ label, ok })
  console.log(`${ok ? 'PASS' : 'FAIL'} ${label}${extra ? ` (${extra})` : ''}`)
}

await mkdir(OUT, { recursive: true })

const browser = await chromium.connectOverCDP(CDP)
const context = browser.contexts()[0] ?? (await browser.newContext())
const page = await context.newPage()
const client = await context.newCDPSession(page)
await client.send('Network.enable')
await client.send('Network.setCacheDisabled', { cacheDisabled: true })
await page.setViewportSize({ width: 1440, height: 900 })

await page.goto(URL, { waitUntil: 'networkidle' })
await page.evaluate(() => localStorage.clear())
await page.reload({ waitUntil: 'networkidle' })
await page.waitForSelector('.doc-column .ProseMirror')
await page.waitForTimeout(400)

const docName = (await page.locator('.doc-name').innerText()).trim()
console.log('doc name:', docName)

const exportOne = async (label, index) => {
  await page.getByRole('button', { name: '导出 ▾', exact: true }).click()
  await page.waitForTimeout(200)
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 5000 }),
    page.getByRole('button', { name: label, exact: true }).click(),
  ])
  const target = `${OUT}/${index}-${download.suggestedFilename()}`
  await download.saveAs(target)
  const text = await readFile(target, 'utf8')
  return { name: download.suggestedFilename(), text }
}

// 正文打字 → 源码追加标记 → 连续导出 HTML / TXT / MD
await page.locator('.editor').click()
await page.keyboard.press('Control+End')
await page.keyboard.type('正文里先写一句。')
await page.waitForTimeout(400)
await page.getByRole('button', { name: '源码', exact: true }).click()
await page.waitForTimeout(400)
const source = await page.locator('.source-editor').inputValue()
await page.locator('.source-editor').fill(`${source}\n\nSRC-ONLY-MARK 源码里新加的。\n`)
await page.waitForTimeout(400)

const html = await exportOne('HTML', 'html')
const txt = await exportOne('纯文本', 'txt')
const md = await exportOne('Markdown', 'md')
console.log('exports:', JSON.stringify([html.name, txt.name, md.name]))

check('HTML 导出含源码模式最新标记', html.text.includes('SRC-ONLY-MARK'))
check('TXT 导出含源码模式最新标记', txt.text.includes('SRC-ONLY-MARK'))
check('Markdown 导出含源码模式最新标记', md.text.includes('SRC-ONLY-MARK'))
check('导出文件名跟文档名（HTML）', html.name.startsWith(docName.replace(/\.md$/, '')), html.name)
check('导出文件名跟文档名（TXT）', txt.name.startsWith(docName.replace(/\.md$/, '')), txt.name)
check('导出文件名跟文档名（Markdown）', md.name.startsWith(docName.replace(/\.md$/, '')), md.name)
check('HTML 导出仍含正文先前写的一句', html.text.includes('正文里先写一句'))
await page.screenshot({ path: 'shots/round-04/t3-export.png' })

console.log(`\n${results.filter((item) => item.ok).length}/${results.length} PASS`)
await page.close()
await browser.close()
if (results.some((item) => !item.ok)) process.exit(1)
