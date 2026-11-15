import { chromium } from 'playwright-core'

const url = process.argv[2] ?? 'http://localhost:5173'

const browser = await chromium.connectOverCDP('http://127.0.0.1:9222')
const context = browser.contexts()[0] ?? (await browser.newContext())
const page = await context.newPage()
await page.setViewportSize({ width: 1440, height: 900 })

const errors = []
page.on('console', (message) => {
  if (message.type() === 'error' && !message.text().includes('favicon')) errors.push(message.text())
})
page.on('pageerror', (error) => errors.push(String(error)))
page.on('dialog', (dialog) => void dialog.accept('a^2+b^2=c^2'))

const check = (label, ok, extra = '') => console.log(`${ok ? 'PASS' : 'FAIL'} ${label}${extra ? ` (${extra})` : ''}`)

await page.goto(url, { waitUntil: 'networkidle' })
await page.evaluate(() => localStorage.clear())
await page.reload({ waitUntil: 'networkidle' })
await page.waitForSelector('.doc-column .ProseMirror', { timeout: 15000 })
await page.waitForTimeout(400)

// 1. 草稿：改一行，刷新，内容还在
await page.locator('.editor').click()
await page.keyboard.press('Control+End')
await page.keyboard.type(' 草稿验收一行。')
await page.waitForTimeout(600)
const beforeReload = await page.locator('.editor').innerText()
await page.reload({ waitUntil: 'networkidle' })
await page.waitForSelector('.doc-column .ProseMirror')
await page.waitForTimeout(500)
const afterReload = await page.locator('.editor').innerText()
check('草稿恢复', afterReload.includes('草稿验收一行。') && beforeReload.includes('草稿验收一行。'))

// 2. 查找替换
await page.keyboard.press('Control+f')
await page.waitForTimeout(250)
await page.locator('.find-input').first().fill('侧灯')
await page.waitForTimeout(350)
const count = (await page.textContent('.find-count'))?.trim() ?? ''
check('查找命中', /\/\s*\d+/.test(count), count)
await page.keyboard.press('Escape')
await page.waitForTimeout(200)

// 3. 数学公式
await page.getByRole('button', { name: '插入 ▾' }).click()
await page.waitForTimeout(200)
await page.getByRole('button', { name: '公式', exact: true }).click()
await page.waitForTimeout(500)
check('公式渲染', (await page.locator('.editor .katex').count()) > 0)

// 4. 表格工具条
await page.getByRole('button', { name: '插入 ▾' }).click()
await page.waitForTimeout(200)
await page.getByRole('button', { name: '表格', exact: true }).click()
await page.waitForTimeout(400)
check('表格工具条', (await page.locator('.table-bar').count()) === 1)
await page.keyboard.press('Escape')

// 5. 导出
await page.getByRole('button', { name: '导出 ▾' }).click()
await page.waitForTimeout(200)
let exported = ''
try {
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 4000 }),
    page.getByRole('button', { name: 'HTML', exact: true }).click(),
  ])
  exported = download.suggestedFilename()
} catch {
  exported = 'no-download'
}
check('导出 HTML', exported.endsWith('.html'), exported)

// 6. Markdown 保真：frontmatter / 脚注 / 行内 HTML
await page.getByRole('button', { name: '试用示例' }).first().click()
await page.waitForTimeout(300)
await page.locator('.tree-file').nth(3).click()
await page.waitForTimeout(400)
// 当前文档有改动时会先弹切换确认，选放弃
if (await page.locator('.dialog[aria-label="切换文档"]').count()) {
  await page.locator('.dialog[aria-label="切换文档"] button', { hasText: '放弃改动' }).click()
  await page.waitForTimeout(500)
}
await page.getByRole('button', { name: '源码', exact: true }).click()
await page.waitForTimeout(400)
const source = await page.locator('.source-editor').inputValue()
check('frontmatter 保真', source.startsWith('---\ntitle: 周记'))
check('脚注保真', source.includes('[^1]: 第一条脚注。'))
check('行内 HTML 保真', source.includes('<kbd>Ctrl</kbd>'))

await page.getByRole('button', { name: '源码', exact: true }).click()
await page.waitForTimeout(300)
await page.screenshot({ path: 'shots/acceptance.png' })
check('无控制台错误', errors.length === 0, errors.join(' | ').slice(0, 120))

await page.close()
await browser.close()
