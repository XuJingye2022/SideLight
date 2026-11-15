import { chromium } from 'playwright-core'

const url = process.argv[2] ?? 'http://localhost:5173'
const browser = await chromium.connectOverCDP('http://127.0.0.1:9222')
const context = browser.contexts()[0] ?? (await browser.newContext())
const page = await context.newPage()
await page.setViewportSize({ width: 1440, height: 900 })

const errors = []
page.on('pageerror', (error) => errors.push(String(error)))
const answers = ['https://example.com/文档', 'E=mc^2']
page.on('dialog', (dialog) => void dialog.accept(answers.shift() ?? 'https://example.com'))
const check = (label, ok, extra = '') => console.log(`${ok ? 'PASS' : 'FAIL'} ${label}${extra ? ` (${extra})` : ''}`)

const reset = async () => {
  await page.goto(url, { waitUntil: 'networkidle' })
  await page.evaluate(() => localStorage.clear())
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForSelector('.doc-column .ProseMirror', { timeout: 15000 })
  await page.waitForTimeout(350)
}

/* 1. 源码模式与专注/打字机互斥 */
await reset()
await page.getByRole('button', { name: '专注', exact: true }).click()
await page.getByRole('button', { name: '打字机', exact: true }).click()
await page.waitForTimeout(300)
await page.getByRole('button', { name: '源码', exact: true }).click()
await page.waitForTimeout(400)
const focusDisabled = await page.getByRole('button', { name: '专注', exact: true }).isDisabled()
const typeDisabled = await page.getByRole('button', { name: '打字机', exact: true }).isDisabled()
const statusText = (await page.textContent('.status-bar'))?.replace(/\s+/g, ' ').trim() ?? ''
check('1 源码模式禁用另两个开关', focusDisabled && typeDisabled, `status=${statusText}`)
check('1b 状态栏不再显示专注与打字机', !statusText.includes('专注') && !statusText.includes('打字机'), statusText)
await page.getByRole('button', { name: '源码', exact: true }).click()
await page.waitForTimeout(400)

/* 2. 点批注卡片会选中正文里的对应句子 */
await reset()
const paragraph = page.locator('.doc-column .ProseMirror p').nth(2)
const box = await paragraph.boundingBox()
await page.mouse.move(box.x + 4, box.y + 8)
await page.mouse.down()
await page.mouse.move(box.x + box.width - 12, box.y + box.height - 8, { steps: 12 })
await page.mouse.up()
await page.waitForTimeout(250)
await page.locator('.analyze-bubble').click()
await page.waitForTimeout(2700)
const quote = (await page.locator('.note-quote').first().textContent())?.replace(/[“”]/g, '').trim() ?? ''
await page.locator('.note').first().click()
await page.waitForTimeout(600)
// 选中的效果：卡片变高亮，且正文旁浮出「分析」按钮（只有非空选区才出现）
const activeCard = await page.locator('.note.is-active').count()
const bubble = await page.locator('.analyze-bubble').count()
const selected = await page.evaluate(() => window.getSelection()?.toString() ?? '')
check('2 点卡片后文案被选中', activeCard === 1 && bubble === 1, `高亮卡=${activeCard} 浮标=${bubble} 选中=${selected.slice(0, 12)}`)

/* 3. 点链接进入编辑 */
await reset()
const word = page.locator('.doc-column .ProseMirror p').nth(1)
const wordBox = await word.boundingBox()
await page.mouse.move(wordBox.x + 4, wordBox.y + 8)
await page.mouse.down()
await page.mouse.move(wordBox.x + 120, wordBox.y + 20, { steps: 8 })
await page.mouse.up()
await page.waitForTimeout(200)
await page.getByRole('button', { name: '插入 ▾' }).click()
await page.waitForTimeout(200)
await page.getByRole('button', { name: '链接', exact: true }).click()
await page.waitForTimeout(500)
check('3 插入后出现链接', (await page.locator('.editor a').count()) > 0)
await page.locator('.editor a').first().click()
await page.waitForTimeout(400)
check('3b 点链接弹出编辑框', (await page.locator('.dialog[aria-label="编辑链接"]').count()) === 1)
const hrefValue = await page.locator('.dialog[aria-label="编辑链接"] input').inputValue()
check('3c 编辑框带原地址', hrefValue.includes('example.com'), hrefValue)
await page.locator('.dialog[aria-label="编辑链接"] input').fill('https://tiptap.dev')
await page.locator('.dialog[aria-label="编辑链接"] button', { hasText: '保存' }).click()
await page.waitForTimeout(400)
const newHref = await page.locator('.editor a').first().getAttribute('href')
check('3d 地址被改掉', newHref === 'https://tiptap.dev', newHref ?? 'none')

/* 4. 公式可编辑并预览 */
await page.locator('.editor').click()
await page.keyboard.press('Control+End')
await page.getByRole('button', { name: '插入 ▾' }).click()
await page.waitForTimeout(200)
await page.getByRole('button', { name: '公式', exact: true }).click()
await page.waitForTimeout(600)
const mathCount = await page.locator('.editor .katex').count()
check('4 公式已插入', mathCount > 0, `katex=${mathCount}`)
await page.locator('.editor .katex').first().dispatchEvent('click', { bubbles: true })
await page.waitForTimeout(400)
check('4b 点公式弹出编辑框', (await page.locator('.dialog[aria-label="编辑公式"]').count()) === 1)
const preview = (await page.locator('.math-preview').textContent())?.trim() ?? ''
check('4c 编辑框里有实时预览', preview.length > 0, preview.slice(0, 12))
await page.locator('.dialog[aria-label="编辑公式"] textarea').fill('a^2+b^2=c^2')
await page.waitForTimeout(300)
await page.locator('.dialog[aria-label="编辑公式"] button', { hasText: '保存' }).click()
await page.waitForTimeout(500)
await page.getByRole('button', { name: '源码', exact: true }).click()
await page.waitForTimeout(400)
const source = await page.locator('.source-editor').inputValue()
check('4d 源码里是新的 LaTeX', source.includes('a^2+b^2=c^2'), source.slice(-40).replace(/\n/g, ' '))

check('无控制台错误', errors.length === 0, errors.slice(0, 2).join(' | '))
await page.screenshot({ path: 'shots/fixes5.png' })
await page.close()
await browser.close()
