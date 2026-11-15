/**
 * 复现：键盘直接打 $…$ 和 $$ 能不能进公式。
 * 说「能」才变绿——它断言的是用户按出来的结果，不是代码路径跑通。
 */
import { chromium } from 'playwright-core'

const url = process.argv[2] ?? 'http://localhost:5173'
const browser = await chromium.connectOverCDP('http://127.0.0.1:9222')
const context = browser.contexts()[0] ?? (await browser.newContext())
const page = await context.newPage()
await page.setViewportSize({ width: 1440, height: 900 })

const errors = []
page.on('pageerror', (error) => errors.push(String(error)))
const results = []
const check = (label, ok, extra = '') => {
  results.push(ok)
  console.log(`${ok ? 'PASS' : 'FAIL'} ${label}${extra ? ` (${extra})` : ''}`)
}

await page.goto(url, { waitUntil: 'networkidle' })
await page.evaluate(() => localStorage.clear())
await page.reload({ waitUntil: 'networkidle' })
await page.waitForSelector('.doc-column .ProseMirror', { timeout: 15000 })

// 一份干净的两段文档，避免示例文本干扰
await page.getByRole('button', { name: '源码', exact: true }).click()
await page.waitForTimeout(300)
await page.locator('.source-editor').fill('# 测试\n\n')
await page.waitForTimeout(300)
await page.getByRole('button', { name: '源码', exact: true }).click()
await page.waitForTimeout(700)

// 1. 在空段落里打 $x^2$
await page.locator('.editor').click()
await page.keyboard.press('Control+End')
await page.keyboard.press('Enter')
await page.waitForTimeout(200)
await page.keyboard.type('$x^2$')
await page.waitForTimeout(500)
const inlineTyped = await page.locator('.editor [data-type="inline-math"]').count()
const paragraphText = (await page.locator('.doc-column .ProseMirror').textContent()) ?? ''
check('1 打 $x^2$ 得到行内公式', inlineTyped === 1, `公式=${inlineTyped} 正文尾=${paragraphText.slice(-12).replace(/\n/g, ' ')}`)

// 1b. 打 $$x^2$$（扩展自带规则认双美元）
await page.keyboard.press('Control+End')
await page.keyboard.press('Enter')
await page.keyboard.type('$$y^2$$')
await page.waitForTimeout(500)
const doubleTyped = await page.locator('.editor [data-type="inline-math"], .editor [data-type="block-math"]').count()
check('1b 打 $$y^2$$ 得到公式', doubleTyped >= 2, `公式总数=${doubleTyped}`)

// 2. 空段落里打 $$ 回车
await page.keyboard.press('Control+End')
await page.keyboard.press('Enter')
await page.keyboard.type('$$')
await page.keyboard.press('Enter')
await page.waitForTimeout(500)
const blockTyped = await page.locator('.editor [data-type="block-math"]').count()
check('2 打 $$ 回车得到公式块', blockTyped >= 1, `块级=${blockTyped}`)

// 2b. 建完能直接编辑：要么自动打开了编辑框，要么点一下能打开
let editable = (await page.locator('.math-inline-input').count()) === 1
if (!editable) {
  const created = page.locator('[data-type="block-math"]').first()
  const createdBox = await created.boundingBox()
  if (createdBox) {
    await page.mouse.click(createdBox.x + createdBox.width / 2, createdBox.y + Math.min(6, createdBox.height / 2))
    await page.waitForTimeout(400)
    editable = (await page.locator('.math-inline-input').count()) === 1
  }
}
check('2b 新公式块能马上编辑', editable)

// 2c. 直接在编辑框里写 LaTeX 并回车
if (editable) {
  await page.locator('.math-inline-input').fill('E = mc^2')
  await page.keyboard.press('Enter')
  await page.waitForTimeout(500)
  const latex = await page.evaluate(() => {
    const node = document.querySelector('[data-type="block-math"]')
    return node ? node.getAttribute('data-latex') : ''
  })
  check('2c 回车后块级公式带着新内容', latex === 'E = mc^2', String(latex))
}

// 4. 句子中间打公式
await page.keyboard.press('Control+End')
await page.keyboard.press('Enter')
await page.keyboard.type('体积是 $V = \frac{4}{3}\pi r^3$ 立方厘米。')
await page.waitForTimeout(600)
const midSentence = await page.locator('.editor [data-type="inline-math"]').count()
const textAfter = (await page.locator('.doc-column .ProseMirror').textContent()) ?? ''
check('4 句子中间也能打公式', midSentence >= 2 && textAfter.includes('立方厘米'), `行内=${midSentence}`)

// 3. 公式块可编辑：点一下应有就地输入
if (blockTyped >= 1) {
  const box = await page.locator('[data-type="block-math"]').first().boundingBox()
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
  await page.waitForTimeout(400)
  check('3 点公式块进入编辑', (await page.locator('.math-inline-input').count()) === 1)
}

check('无控制台错误', errors.length === 0, errors.slice(0, 2).join(' | '))

await page.close()
await browser.close()
process.exit(results.every(Boolean) ? 0 : 1)
