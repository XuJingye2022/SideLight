import { chromium } from 'playwright-core'

const url = process.argv[2] ?? 'http://localhost:5173'
const browser = await chromium.connectOverCDP('http://127.0.0.1:9222')
const context = browser.contexts()[0] ?? (await browser.newContext())
const page = await context.newPage()
await page.setViewportSize({ width: 1440, height: 900 })

const errors = []
page.on('pageerror', (error) => errors.push(String(error)))
const answers = ['https://example.com', 'E=mc^2']
page.on('dialog', (dialog) => void dialog.accept(answers.shift() ?? 'x'))
const check = (label, ok, extra = '') => console.log(`${ok ? 'PASS' : 'FAIL'} ${label}${extra ? ` (${extra})` : ''}`)

await page.goto(url, { waitUntil: 'networkidle' })
await page.evaluate(() => localStorage.clear())
await page.reload({ waitUntil: 'networkidle' })
await page.waitForSelector('.doc-column .ProseMirror', { timeout: 15000 })
await page.waitForTimeout(300)

/* 1. 长文锚定 + 2. 字数同步 */
const long = Array.from(
  { length: 200 },
  (_, i) => `## 第 ${i} 节\n\n这是第 ${i} 段的正文，用来把文档撑到一万字以上。写作是一件需要耐心的事，句子之间要有呼吸。`,
).join('\n\n')
await page.getByRole('button', { name: '源码', exact: true }).click()
await page.waitForTimeout(300)
await page.locator('.source-editor').fill(long)
await page.waitForTimeout(300)
await page.getByRole('button', { name: '源码', exact: true }).click()
await page.waitForTimeout(900)

const statsText = (await page.textContent('.status-bar'))?.replace(/\s+/g, ' ').trim() ?? ''
const countNumber = Number(((statsText.match(/([\d,]+) 字/) ?? [])[1] ?? '0').replace(/,/g, ''))
check('2 源码灌文后字数同步', countNumber > 8000, `${countNumber} 字`)

const target = page.locator('.doc-column .ProseMirror p').nth(150)
await target.scrollIntoViewIfNeeded()
await page.waitForTimeout(500)
const box = await target.boundingBox()
await page.mouse.move(box.x + 4, box.y + 6)
await page.mouse.down()
await page.mouse.move(box.x + box.width - 10, box.y + box.height - 6, { steps: 10 })
await page.mouse.up()
await page.waitForTimeout(300)
await page.locator('.analyze-bubble').click()
await page.waitForTimeout(3300)

const geom = await page.evaluate(() => {
  const paragraph = Array.from(document.querySelectorAll('.doc-column .ProseMirror p')).find((node, index) => index === 150)
  const rect = paragraph?.getBoundingClientRect()
  return {
    paragraphTop: rect ? Math.round(rect.top) : -1,
    paragraphBottom: rect ? Math.round(rect.bottom) : -1,
    ann: Array.from(document.querySelectorAll('.editor .annot')).map((n) => Math.round(n.getBoundingClientRect().top)),
    notes: Array.from(document.querySelectorAll('.note')).map((n) => Math.round(n.getBoundingClientRect().top)),
  }
})
const insideParagraph = geom.ann.every((top) => top >= geom.paragraphTop - 4 && top <= geom.paragraphBottom + 4)
check('1 长文里每条高亮都落在选中的段落', insideParagraph, JSON.stringify(geom))
check('1b 第一张卡片与高亮对齐', geom.notes.length > 0 && Math.abs(geom.notes[0] - geom.ann[0]) <= 8, `${geom.notes[0]} vs ${geom.ann[0]}`)

/* 3. 链接与公式的原地浮层 */
await page.getByRole('button', { name: '源码', exact: true }).click()
await page.waitForTimeout(400)
await page.locator('.source-editor').fill('# 标题\n\n这一段里放一个链接和一条公式。')
await page.waitForTimeout(300)
await page.getByRole('button', { name: '源码', exact: true }).click()
await page.waitForTimeout(700)

const para = page.locator('.doc-column .ProseMirror p').first()
const paraBox = await para.boundingBox()
await page.mouse.move(paraBox.x + 4, paraBox.y + 6)
await page.mouse.down()
await page.mouse.move(paraBox.x + 120, paraBox.y + 18, { steps: 8 })
await page.mouse.up()
await page.getByRole('button', { name: '插入 ▾' }).click()
await page.waitForTimeout(200)
await page.getByRole('button', { name: '链接', exact: true }).click()
await page.waitForTimeout(500)
const linkBox = await page.locator('.editor a').first().boundingBox()
await page.locator('.editor a').first().click()
await page.waitForTimeout(400)
const popoverText = await page.locator('.popover').count()
const popoverBox = await page.locator('.popover').first().boundingBox()
const anchorGap = popoverBox && linkBox ? Math.abs(popoverBox.y - (linkBox.y + linkBox.height)) : 999
check('3 点链接弹出浮层', popoverText === 1 && anchorGap < 40, `间距=${Math.round(anchorGap)}`)
await page.locator('.popover input').fill('https://tiptap.dev')
await page.keyboard.press('Enter')
await page.waitForTimeout(400)
check('3b Enter 保存地址', (await page.locator('.editor a').first().getAttribute('href')) === 'https://tiptap.dev')
check('3c 保存后浮层关闭', (await page.locator('.popover').count()) === 0)

await page.locator('.editor').click()
await page.keyboard.press('Control+End')
await page.getByRole('button', { name: '插入 ▾' }).click()
await page.waitForTimeout(200)
await page.getByRole('button', { name: '公式', exact: true }).click()
await page.waitForTimeout(600)
await page.locator('.editor .katex').first().dispatchEvent('click', { bubbles: true })
await page.waitForTimeout(400)
check('4 点公式弹出带预览的浮层', (await page.locator('.popover .math-preview .katex').count()) === 1)
await page.keyboard.press('Escape')
await page.waitForTimeout(300)
check('4b Esc 关掉浮层', (await page.locator('.popover').count()) === 0)

/* 5. 预览 */
await page.getByRole('button', { name: '预览', exact: true }).click()
await page.waitForTimeout(600)
const previewInfo = await page.evaluate(() => ({
  headings: document.querySelectorAll('.preview-pane h1, .preview-pane h2').length,
  katex: document.querySelectorAll('.preview-pane .katex').length,
  links: document.querySelectorAll('.preview-pane a').length,
  editable: document.querySelector('.preview-pane')?.getAttribute('contenteditable'),
  chip: document.querySelector('.status-bar')?.textContent?.includes('预览') ?? false,
}))
check('5 预览渲染正文与公式', previewInfo.headings > 0 && previewInfo.katex > 0 && previewInfo.links > 0, JSON.stringify(previewInfo))
check('5b 预览不可编辑且状态栏显示预览', previewInfo.editable === 'false' && previewInfo.chip)
await page.keyboard.press('Escape')
await page.waitForTimeout(500)
check('5c Esc 回到编辑', (await page.locator('.preview-pane').count()) === 0 && (await page.locator('.doc-column .ProseMirror').count()) === 1)

await page.screenshot({ path: 'shots/preview-and-popover.png' })
check('无控制台错误', errors.length === 0, errors.slice(0, 2).join(' | '))
await page.close()
await browser.close()
