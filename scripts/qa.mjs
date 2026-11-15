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
page.on('dialog', (dialog) => void dialog.accept('E=mc^2'))

const log = (label, detail) => console.log(`${label} :: ${detail}`)

await page.goto(url, { waitUntil: 'networkidle' })
await page.evaluate(() => localStorage.clear())
await page.reload({ waitUntil: 'networkidle' })
await page.waitForSelector('.doc-column .ProseMirror', { timeout: 15000 })
await page.waitForTimeout(400)

/* A. 切换文档时未保存改动是否丢失 */
await page.getByRole('button', { name: '试用示例' }).first().click()
await page.waitForTimeout(300)
await page.locator('.tree-file').nth(0).click()
await page.waitForTimeout(350)
await page.locator('.editor').click()
await page.keyboard.press('Control+End')
await page.keyboard.type(' 未保存的临时改动。')
await page.waitForTimeout(500)
const typed = await page.locator('.editor').innerText()
await page.locator('.tree-file').nth(1).click()
await page.waitForTimeout(400)
await page.locator('.tree-file').nth(0).click()
await page.waitForTimeout(400)
const afterSwitch = await page.locator('.editor').innerText()
log('A 切换文档后内容', `类型时含改动=${typed.includes('未保存的临时改动。')} 切回后含改动=${afterSwitch.includes('未保存的临时改动。')} dirty提示=${await page.locator('.dirty').count()}`)

/* B. 设置对话框是否显示当前字号 */
await page.keyboard.press('Control+=')
await page.keyboard.press('Control+=')
await page.waitForTimeout(300)
const liveSize = await page.locator('.editor').evaluate((el) => getComputedStyle(el).fontSize)
await page.getByRole('button', { name: '设置', exact: true }).click()
await page.waitForTimeout(300)
const dialogSize = await page.locator('.dialog input[type="number"]').inputValue()
await page.getByRole('button', { name: '取消', exact: true }).click()
await page.waitForTimeout(200)
log('B 设置字号', `实际=${liveSize} 对话框显示=${dialogSize}`)

/* C. 字号越界输入 */
await page.getByRole('button', { name: '设置', exact: true }).click()
await page.waitForTimeout(250)
await page.locator('.dialog input[type="number"]').fill('999')
await page.locator('.dialog button.primary').click()
await page.waitForTimeout(500)
const huge = await page.locator('.editor').evaluate((el) => getComputedStyle(el).fontSize)
log('C 字号上限', `输入 999 后实际=${huge}`)
await page.evaluate(() => localStorage.removeItem('sidelight.settings.v1'))

/* D. 批注位置在手动编辑后是否漂移 */
await page.reload({ waitUntil: 'networkidle' })
await page.waitForSelector('.doc-column .ProseMirror')
await page.waitForTimeout(400)
const paragraph = page.locator('.doc-column .ProseMirror p').nth(2)
const box = await paragraph.boundingBox()
await page.mouse.move(box.x + 4, box.y + 10)
await page.mouse.down()
await page.mouse.move(box.x + box.width - 12, box.y + box.height - 10, { steps: 12 })
await page.mouse.up()
await page.waitForTimeout(250)
await page.locator('.analyze-bubble').click()
await page.waitForTimeout(2600)
const annotBefore = await page.locator('.editor .annot').allTextContents()
await page.locator('.editor').click()
await page.keyboard.press('Control+Home')
await page.keyboard.type('开头插入一句。')
await page.waitForTimeout(500)
const annotAfter = await page.locator('.editor .annot').allTextContents()
log('D 批注漂移', `插字前=${JSON.stringify(annotBefore)} 插字后=${JSON.stringify(annotAfter)}`)

/* E. 采纳后撤销，卡片与正文是否一致 */
const acceptButton = page.locator('.note-actions .accept').first()
if (await acceptButton.count()) {
  const before = await page.locator('.editor').innerText()
  await acceptButton.click()
  await page.waitForTimeout(500)
  const accepted = await page.locator('.editor').innerText()
  await page.keyboard.press('Control+z')
  await page.waitForTimeout(500)
  const undone = await page.locator('.editor').innerText()
  log('E 撤销采纳', `采纳改了正文=${before !== accepted} 撤销回到原文=${undone === before} 剩余卡片=${await page.locator('.note').count()}`)
}

/* F. 空文档 */
await page.locator('.editor').click()
await page.keyboard.press('Control+a')
await page.keyboard.press('Backspace')
await page.waitForTimeout(500)
log('F 空文档', `状态栏=${(await page.textContent('.status-bar'))?.replace(/\s+/g, ' ').trim()} 大纲=${await page.locator('.outline-item').count()}`)
await page.keyboard.type('重新开始写。')
await page.waitForTimeout(400)
log('F 空文档后输入', `正文="${(await page.locator('.editor').innerText()).slice(0, 20)}"`)

/* G. 查找面板打开时继续输入 */
await page.keyboard.press('Control+f')
await page.waitForTimeout(250)
await page.locator('.find-input').first().fill('的')
await page.waitForTimeout(300)
const countBefore = (await page.textContent('.find-count'))?.trim()
await page.locator('.editor').click()
await page.keyboard.type('的的')
await page.waitForTimeout(500)
const countAfter = (await page.textContent('.find-count'))?.trim()
log('G 查找实时更新', `输入前=${countBefore} 输入后=${countAfter}`)
await page.keyboard.press('Escape')

/* H. 专注模式与光标 */
await page.getByRole('button', { name: '专注', exact: true }).click()
await page.waitForTimeout(300)
const dim1 = await page.locator('.editor .is-dimmed').count()
await page.locator('.editor').click()
await page.keyboard.press('Control+Home')
await page.waitForTimeout(400)
const dim2 = await page.locator('.editor .is-dimmed').count()
log('H 专注模式', `初始暗块=${dim1} 移动光标后=${dim2}`)
await page.getByRole('button', { name: '专注', exact: true }).click()

/* I. 深色模式外观 */
await page.emulateMedia({ colorScheme: 'dark' })
await page.waitForTimeout(400)
await page.screenshot({ path: 'shots/qa-dark.png' })
await page.emulateMedia({ colorScheme: 'light' })
await page.waitForTimeout(300)

/* J. 窄窗口 */
await page.setViewportSize({ width: 1024, height: 800 })
await page.waitForTimeout(400)
await page.screenshot({ path: 'shots/qa-narrow.png' })
await page.setViewportSize({ width: 1440, height: 900 })

log('控制台错误', errors.length ? errors.slice(0, 4).join(' | ') : 'none')

await page.close()
await browser.close()
