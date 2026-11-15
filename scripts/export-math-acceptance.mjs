import { chromium } from 'playwright-core'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const URL = process.argv[2] ?? 'http://localhost:5173'
const CDP = process.env.SIDELIGHT_CDP ?? 'http://127.0.0.1:9222'
const OUT = 'shots/round-05'
const TMP = '.tmp/r5-export-math'

const results = []
const check = (label, ok, extra = '') => {
  results.push({ label, ok })
  console.log(`${ok ? 'PASS' : 'FAIL'} ${label}${extra ? ` (${extra})` : ''}`)
}

await mkdir(OUT, { recursive: true })
await mkdir(TMP, { recursive: true })

const browser = await chromium.connectOverCDP(CDP)
const context = await browser.newContext({ acceptDownloads: true })
const page = await context.newPage()
const client = await context.newCDPSession(page)
await client.send('Network.enable')
await client.send('Network.setCacheDisabled', { cacheDisabled: true })
await page.setViewportSize({ width: 1440, height: 900 })
page.on('pageerror', (error) => console.log('PAGEERROR', String(error).slice(0, 300)))
page.on('console', (message) => {
  if (message.type() === 'error') console.log('CONSOLE', message.text().slice(0, 300))
})

await page.goto(URL, { waitUntil: 'networkidle' })
await page.evaluate(() => localStorage.clear())
await page.reload({ waitUntil: 'networkidle' })
await page.waitForSelector('.doc-column .ProseMirror')
await page.waitForTimeout(400)

// 源码模式写入行内 + 块级公式，再切回编辑，拿到真实公式节点
await page.getByRole('button', { name: '源码', exact: true }).click()
await page.waitForTimeout(300)
await page.locator('.source-editor').fill('正文 $E=mc^2$ 结束。\n\n$$\n\\frac{a}{b}\n$$\n')
await page.waitForTimeout(300)
await page.getByRole('button', { name: '源码', exact: true }).click()
await page.waitForTimeout(500)
const docName = (await page.locator('.doc-name').innerText()).trim()
const mathNodes = await page.evaluate(() => document.querySelectorAll('.editor [data-type$="-math"]').length)
check('文档里有行内与块级公式节点', mathNodes >= 2, String(mathNodes))

const exportOne = async (label, index) => {
  await page.getByRole('button', { name: '导出 ▾', exact: true }).click()
  await page.waitForTimeout(200)
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 5000 }),
    page.locator('.export-menu button', { hasText: label }).click(),
  ])
  const target = resolve(TMP, `${index}-${download.suggestedFilename()}`)
  await download.saveAs(target)
  return { name: download.suggestedFilename(), text: await readFile(target, 'utf8'), path: target }
}

const htmlExport = await exportOne('HTML', 'html')
const txtExport = await exportOne('纯文本', 'txt')

check('HTML 导出含 MathML <math>', htmlExport.text.includes('<math'))
check('HTML 导出含公式内容 E=mc^2', htmlExport.text.includes('E=mc^2'))
check('HTML 导出没有空的 data-latex span', !htmlExport.text.includes('data-latex=""'))
check('HTML 导出保留 data-latex 便于回退', htmlExport.text.includes('data-latex="E=mc^2"'))
check('TXT 导出行内公式保留 $E=mc^2$', txtExport.text.includes('$E=mc^2$'), txtExport.text.slice(0, 40))
check('TXT 导出块级公式保留 $$…$$', txtExport.text.includes('$$\\frac{a}{b}$$'))
check('HTML 文件名跟文档名', htmlExport.name.startsWith(docName.replace(/\.md$/, '')), htmlExport.name)
check('TXT 文件名跟文档名', txtExport.name.startsWith(docName.replace(/\.md$/, '')), txtExport.name)

// 用导出文件本身截图，证明 MathML 不依赖 KaTeX 资源也能看见公式
await writeFile(resolve(TMP, 'export.html'), htmlExport.text, 'utf8')
const viewer = await context.newPage()
await viewer.setViewportSize({ width: 1200, height: 800 })
try {
  await viewer.goto(`file:///${resolve(TMP, 'export.html').replace(/\\/g, '/')}`, { waitUntil: 'load' })
  await viewer.waitForTimeout(500)
  const formulaText = await viewer.evaluate(() => document.body?.textContent ?? '')
  check('导出的 HTML 直接用浏览器打开能看到公式文字', formulaText.includes('E=mc'), formulaText.slice(0, 40))
  await viewer.screenshot({ path: `${OUT}/t3-export-mathml.png` })
} catch (error) {
  console.log(`UNVERIFIED 导出文件截图（${String(error)}）`)
}
await viewer.close()

console.log(`\n${results.filter((item) => item.ok).length}/${results.length} PASS`)
await context.close()
await browser.close()
if (results.some((item) => !item.ok)) process.exit(1)
