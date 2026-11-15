import { chromium } from 'playwright-core'
import { readFileSync } from 'node:fs'

const url = process.argv[2] ?? 'http://localhost:5173'
const browser = await chromium.connectOverCDP('http://127.0.0.1:9222')
const context = browser.contexts()[0] ?? (await browser.newContext())
const page = await context.newPage()
await page.setViewportSize({ width: 1440, height: 900 })

const errors = []
page.on('pageerror', (error) => errors.push(String(error)))
const check = (label, ok, extra = '') => console.log(`${ok ? 'PASS' : 'FAIL'} ${label}${extra ? ` (${extra})` : ''}`)

const reset = async () => {
  await page.goto(url, { waitUntil: 'networkidle' })
  await page.evaluate(() => localStorage.clear())
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForSelector('.doc-column .ProseMirror', { timeout: 15000 })
  await page.waitForTimeout(350)
}

/* 1. 导出 HTML 带上元数据与脚注 */
await reset()
await page.getByRole('button', { name: '试用示例' }).first().click()
await page.waitForTimeout(300)
await page.locator('.tree-file').nth(3).click()
await page.waitForTimeout(500)
await page.getByRole('button', { name: '导出 ▾' }).click()
await page.waitForTimeout(200)
const [dl] = await Promise.all([
  page.waitForEvent('download'),
  page.getByRole('button', { name: 'HTML', exact: true }).click(),
])
const html = readFileSync(await dl.path(), 'utf8')
check(
  '1 导出含元数据与脚注',
  html.includes('title: 周记') && html.includes('第一条脚注') && html.includes('frontmatter'),
  `长度=${html.length}`,
)

/* 2. 无句柄保存：提示且保持脏 */
await page.locator('.editor').click()
await page.keyboard.press('Control+End')
await page.keyboard.type(' 再改一处。')
await page.waitForTimeout(400)
const downloadPromise = page.waitForEvent('download', { timeout: 8000 }).catch(() => null)
await page.keyboard.press('Control+s')
await page.waitForTimeout(700)
if (await page.locator('.save-dialog').count()) {
  await page.locator('.save-dialog button', { hasText: '仍然保存' }).click()
  await page.waitForTimeout(600)
}
const dl2 = await downloadPromise
await page.waitForTimeout(400)
const notice = (await page.locator('.rail-notice').first().textContent())?.trim() ?? ''
const dirty = await page.locator('.dirty').count()
check(
  '2 无句柄保存有提示且保持脏',
  notice.includes('副本') && dirty === 1,
  `${notice.slice(0, 20)}… dirty=${dirty} file=${dl2 ? dl2.suggestedFilename() : '无下载'}`,
)

/* 3. 模拟批注采纳不重复半句 */
await reset()
const target = page.locator('.doc-column .ProseMirror p').nth(2)
const box = await target.boundingBox()
await page.mouse.move(box.x + 4, box.y + 8)
await page.mouse.down()
await page.mouse.move(box.x + box.width - 12, box.y + box.height - 8, { steps: 12 })
await page.mouse.up()
await page.waitForTimeout(250)
await page.locator('.analyze-bubble').click()
await page.waitForTimeout(2800)
const hasRevision = (await page.locator('.note-actions .accept').count()) > 0
check('3 出现可采纳的修订', hasRevision)
if (hasRevision) {
  const oldText = (await page.locator('.note-diff .diff-old').first().textContent())?.trim() ?? ''
  const before = await page.locator('.editor').innerText()
  await page.locator('.note-actions .accept').first().click()
  await page.waitForTimeout(600)
  const after = await page.locator('.editor').innerText()
  check('3b 采纳替换整句不留残句', !(oldText.length > 0 && after.includes(oldText)), `原句长度=${oldText.length}`)
  check('3c 正文确实变了', before !== after)
}

/* 4. Esc 关设置；设置里 Ctrl+S 不触发保存 */
await reset()
await page.getByRole('button', { name: '设置', exact: true }).click()
await page.waitForTimeout(300)
check('4 设置已打开', (await page.locator('.dialog[aria-label="设置"]').count()) === 1)
await page.keyboard.press('Control+s')
await page.waitForTimeout(400)
check('4b 设置里 Ctrl+S 不保存', (await page.locator('.save-dialog').count()) === 0)
await page.keyboard.press('Escape')
await page.waitForTimeout(300)
check('4c Esc 关掉设置', (await page.locator('.dialog[aria-label="设置"]').count()) === 0)

/* 5. 菜单点外面关掉 */
await page.getByRole('button', { name: '插入 ▾' }).click()
await page.waitForTimeout(250)
check('5 插入菜单已开', (await page.locator('.menu').count()) > 0)
await page.locator('.editor').click({ position: { x: 40, y: 20 } })
await page.waitForTimeout(300)
check('5b 点正文关掉菜单', (await page.locator('.menu').count()) === 0)

/* 6. 保存对比取消后仍保持脏 */
await reset()
await page.getByRole('button', { name: '试用示例' }).first().click()
await page.waitForTimeout(300)
await page.locator('.tree-file').nth(3).click()
await page.waitForTimeout(500)
await page.locator('.editor').click()
await page.keyboard.press('Control+End')
await page.keyboard.type(' 改动一。')
await page.waitForTimeout(400)
await page.keyboard.press('Control+s')
await page.waitForTimeout(600)
if (await page.locator('.save-dialog').count()) {
  await page.locator('.save-dialog button', { hasText: '取消' }).click()
  await page.waitForTimeout(400)
}
check('6 取消后仍为脏', (await page.locator('.dirty').count()) === 1)
await page.keyboard.press('Control+s')
await page.waitForTimeout(600)
check('6b 再按保存会重新提示', (await page.locator('.save-dialog').count()) === 1)

check('无控制台错误', errors.length === 0, errors.slice(0, 2).join(' | '))
await page.screenshot({ path: 'shots/fixes3.png' })
await page.close()
await browser.close()
