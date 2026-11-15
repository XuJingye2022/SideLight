import { chromium } from 'playwright-core'

const url = process.argv[2] ?? 'http://localhost:5173'
const browser = await chromium.connectOverCDP('http://127.0.0.1:9222')
const context = browser.contexts()[0] ?? (await browser.newContext())
const page = await context.newPage()
await page.setViewportSize({ width: 1440, height: 900 })
const errors = []
page.on('pageerror', (error) => errors.push(String(error)))
page.on('dialog', (dialog) => void dialog.accept('E=mc^2'))
const check = (label, ok, extra = '') => console.log(`${ok ? 'PASS' : 'FAIL'} ${label}${extra ? ` (${extra})` : ''}`)

await page.goto(url, { waitUntil: 'networkidle' })
await page.evaluate(() => localStorage.clear())
await page.reload({ waitUntil: 'networkidle' })
await page.waitForSelector('.doc-column .ProseMirror', { timeout: 15000 })
await page.waitForTimeout(300)

// 放一条行内公式
await page.getByRole('button', { name: '源码', exact: true }).click()
await page.waitForTimeout(300)
await page.locator('.source-editor').fill('# 光学笔记\n\n透镜公式是 $\\frac{1}{f} = \\frac{1}{u} + \\frac{1}{v}$，其中 f 是焦距。')
await page.waitForTimeout(300)
await page.getByRole('button', { name: '源码', exact: true }).click()
await page.waitForTimeout(800)
check('0 公式已渲染', (await page.locator('.editor .katex').count()) === 1)

// 1. 点公式：就地展开成 $…$ 源码并全选
const katex = page.locator('.editor .katex').first()
const box = await katex.boundingBox()
await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
await page.waitForTimeout(500)
const selected = await page.evaluate(() => window.getSelection()?.toString() ?? '')
const hasDollars = selected.startsWith('$') && selected.endsWith('$')
check('1 点公式展开成源码并全选', hasDollars, selected.slice(0, 18))
check('1b 没有弹窗', (await page.locator('.dialog, .popover').count()) === 0)

// 2. 预览浮在源码下方
const previewBox = await page.locator('.math-draft-preview').boundingBox().catch(() => null)
const selBox = await page.evaluate(() => {
  const range = window.getSelection()?.getRangeAt(0)
  const rect = range?.getBoundingClientRect()
  return rect ? { bottom: Math.round(rect.bottom), left: Math.round(rect.left) } : null
})
check('2 下方有实时预览', !!previewBox && previewBox.y >= (selBox?.bottom ?? 0), JSON.stringify({ preview: previewBox && Math.round(previewBox.y), bottom: selBox?.bottom }))

// 3. 在选中的源码上直接改：整段被替换成新写法，预览跟着变
await page.keyboard.type('$\\frac{1}{f} = \\frac{1}{u} - \\frac{1}{v}$')
await page.waitForTimeout(600)
const previewHtml = (await page.locator('.math-draft-preview').innerHTML().catch(() => '')) ?? ''
check('3 输入时预览实时更新', previewHtml.includes('katex'), String(previewHtml.length))

// 4. 点别处：还原成渲染态
await page.locator('.doc-column h1').click()
await page.waitForTimeout(600)
check('4 失焦后回到渲染态', (await page.locator('.math-draft-preview').count()) === 0 && (await page.locator('.editor .katex').count()) === 1)
check('4b 正文里没有残留的美元符', !((await page.locator('.doc-column .ProseMirror').textContent()) ?? '').includes('$'))

// 5. 源码里是新公式
await page.getByRole('button', { name: '源码', exact: true }).click()
await page.waitForTimeout(400)
const source = await page.locator('.source-editor').inputValue()
check('5 源码里是改后的公式', source.includes('- \\frac{1}{v}'), source.slice(source.indexOf('透镜'), source.indexOf('透镜') + 60))

// 6. 块级公式同样就地编辑
await page.keyboard.press('Escape')
await page.locator('.editor').click()
await page.keyboard.press('Control+End')
await page.getByRole('button', { name: '插入 ▾' }).click()
await page.waitForTimeout(200)
await page.locator('.menu button', { hasText: /^公式块$/ }).click()
await page.waitForTimeout(800)
const blockCount = await page.locator('[data-type="block-math"]').count()
check('6 块级公式已插入', blockCount > 0, String(blockCount))
if (blockCount > 0) {
  const blockBox = await page.locator('[data-type="block-math"]').first().boundingBox()
  await page.mouse.click(blockBox.x + blockBox.width / 2, blockBox.y + blockBox.height / 2)
  await page.waitForTimeout(500)
  const inlineInput = await page.locator('.math-inline-input').count()
  const inlineTop = await page.locator('.math-inline').boundingBox().catch(() => null)
  const gap = inlineTop ? Math.abs(inlineTop.y - blockBox.y) : 999
  check('6b 块级公式就地输入（贴住公式）', inlineInput === 1 && gap < 30, `间距=${Math.round(gap)}`)
  await page.locator('.math-inline-input').fill('E = mc^2 + 1')
  await page.waitForTimeout(300)
  await page.keyboard.press('Enter')
  await page.waitForTimeout(600)
  const blockNodes = await page.locator('[data-type="block-math"]').count()
  check('6c 块级公式提交后仍是块级', blockNodes > 0, `block=${blockNodes}`)
}

await page.screenshot({ path: 'shots/math-in-place.png' })
check('无控制台错误', errors.length === 0, errors.slice(0, 2).join(' | '))
await page.close()
await browser.close()
