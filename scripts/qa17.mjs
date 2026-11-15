import { chromium } from 'playwright-core'

const url = process.argv[2] ?? 'http://localhost:5173'
const browser = await chromium.connectOverCDP('http://127.0.0.1:9222')
const context = browser.contexts()[0] ?? (await browser.newContext())
const page = await context.newPage()
await page.setViewportSize({ width: 1440, height: 900 })
const errors = []
page.on('pageerror', (error) => errors.push(String(error)))
const answers = ['E=mc^2']
page.on('dialog', (dialog) => void dialog.accept(answers.shift() ?? 'x'))
const check = (label, ok, extra = '') => console.log(`${ok ? 'PASS' : 'FAIL'} ${label}${extra ? ` (${extra})` : ''}`)

const state = () =>
  page.evaluate(() => ({
    source: !!document.querySelector('.source-editor'),
    preview: !!document.querySelector('.preview-pane'),
    editor: !!document.querySelector('.doc-column .ProseMirror:not(.preview-pane)'),
    chips: Array.from(document.querySelectorAll('.status-chip')).map((n) => n.textContent),
  }))

await page.goto(url, { waitUntil: 'networkidle' })
await page.evaluate(() => localStorage.clear())
await page.reload({ waitUntil: 'networkidle' })
await page.waitForSelector('.doc-column .ProseMirror', { timeout: 15000 })
await page.waitForTimeout(300)

/* 1. 源码改动在切到预览时不能丢 */
await page.getByRole('button', { name: '源码', exact: true }).click()
await page.waitForTimeout(300)
const before = await page.locator('.source-editor').inputValue()
await page.locator('.source-editor').fill(`${before}\n\n源码里新加的一段。`)
await page.waitForTimeout(300)
await page.getByRole('button', { name: '预览', exact: true }).click()
await page.waitForTimeout(500)
const previewHas = await page.locator('.preview-pane').evaluate((el) => el.textContent.includes('源码里新加'))
check('1 源码 → 预览保留改动', previewHas, JSON.stringify(await state()))

/* 2. 预览 → 源码也保留 */
await page.getByRole('button', { name: '源码', exact: true }).click()
await page.waitForTimeout(400)
const sourceHas = (await page.locator('.source-editor').inputValue()).includes('源码里新加')
check('2 预览 → 源码保留改动', sourceHas)

/* 3. 源码 → 源码（点两次）不丢 */
await page.locator('.source-editor').fill(`${await page.locator('.source-editor').inputValue()}\n\n再补一句。`)
await page.waitForTimeout(300)
await page.getByRole('button', { name: '源码', exact: true }).click()
await page.waitForTimeout(400)
const editorText = (await page.locator('.doc-column .ProseMirror').textContent())?.trim() ?? ''
check('3 Esc/切回后正文含新内容', editorText.includes('再补一句') && editorText.includes('源码里新加'))

/* 4. Esc 从源码回编辑，保留改动 */
await page.getByRole('button', { name: '源码', exact: true }).click()
await page.waitForTimeout(300)
await page.locator('.source-editor').fill(`${await page.locator('.source-editor').inputValue()}\n\nEsc 前写的。`)
await page.waitForTimeout(200)
await page.keyboard.press('Escape')
await page.waitForTimeout(500)
const afterEsc = (await page.locator('.doc-column .ProseMirror').textContent())?.trim() ?? ''
check('4 Esc 从源码回编辑保留改动', afterEsc.includes('Esc 前写的'), JSON.stringify(await state()))

/* 5. 视图互斥：源码里点预览，按钮状态要对 */
await page.getByRole('button', { name: '预览', exact: true }).click()
await page.waitForTimeout(400)
const chips = await page.locator('.status-chip').allTextContents()
check('5 预览时状态栏只有预览', chips.length === 1 && chips[0] === '预览', JSON.stringify(chips))
check('5b 专注与打字机被禁用', (await page.getByRole('button', { name: '专注', exact: true }).isDisabled()) === true)

await page.screenshot({ path: 'shots/mode-switch.png' })
check('无控制台错误', errors.length === 0, errors.slice(0, 2).join(' | '))
await page.close()
await browser.close()
