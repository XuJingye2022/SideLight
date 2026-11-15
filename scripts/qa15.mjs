import { chromium } from 'playwright-core'

const url = process.argv[2] ?? 'http://localhost:5173'
const browser = await chromium.connectOverCDP('http://127.0.0.1:9222')
const context = browser.contexts()[0] ?? (await browser.newContext())
const page = await context.newPage()
await page.setViewportSize({ width: 1440, height: 900 })
const errors = []
page.on('pageerror', (error) => errors.push(String(error)))
const check = (label, ok, extra = '') => console.log(`${ok ? 'PASS' : 'FAIL'} ${label}${extra ? ` (${extra})` : ''}`)

await page.goto(url, { waitUntil: 'networkidle' })
await page.evaluate(() => localStorage.clear())
await page.reload({ waitUntil: 'networkidle' })
await page.waitForSelector('.doc-column .ProseMirror', { timeout: 15000 })
await page.waitForTimeout(400)

const paragraph = page.locator('.doc-column .ProseMirror p').nth(2)
const box = await paragraph.boundingBox()
await page.mouse.move(box.x + 4, box.y + 8)
await page.mouse.down()
await page.mouse.move(box.x + box.width - 12, box.y + box.height - 8, { steps: 12 })
await page.mouse.up()
await page.waitForTimeout(250)
await page.locator('.analyze-bubble').click()
await page.waitForTimeout(2800)

const goal = (await page.locator('.rail-goal-text').textContent())?.trim() ?? ''
check('1 页边显示模型的理解', goal.length > 0, goal)
check('1b 标签写「我的理解」', (await page.locator('.rail-goal-label').textContent())?.trim() === '我的理解')
check('1c 意图独立于卡片', (await page.locator('.note .rail-goal').count()) === 0)

const cardsBefore = await page.locator('.note').count()
await page.locator('.rail-goal-retry').click()
await page.waitForTimeout(3000)
const cardsAfter = await page.locator('.note').count()
check('2 判错了可以重来', cardsAfter > 0 && cardsAfter === cardsBefore, `${cardsBefore} -> ${cardsAfter}`)

// 设置里能改提示词
await page.getByRole('button', { name: '设置', exact: true }).click()
await page.waitForTimeout(300)
const promptBox = page.locator('.dialog textarea')
const defaultText = await promptBox.inputValue()
check('3 设置里有提示词框', defaultText.includes('JSON Lines') && defaultText.length > 100, String(defaultText.length))
await promptBox.fill('你是批注员。请直接输出 JSON 行。')
await page.locator('.dialog button.primary').click()
await page.waitForTimeout(500)
const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('sidelight.settings.v1') ?? '{}').analysisPrompt)
check('3b 改写被保存', saved === '你是批注员。请直接输出 JSON 行。', String(saved).slice(0, 20))

await page.getByRole('button', { name: '设置', exact: true }).click()
await page.waitForTimeout(300)
await page.locator('.dialog button', { hasText: '恢复默认提示词' }).click()
const restored = await page.locator('.dialog textarea').inputValue()
check('3c 能恢复默认', restored.includes('JSON Lines') && restored.length > 100, String(restored.length))
// 改回默认再保存，免得影响后面的用例
await page.locator('.dialog button.primary').click()
await page.waitForTimeout(400)

await page.screenshot({ path: 'shots/intent.png' })
check('无控制台错误', errors.length === 0, errors.slice(0, 2).join(' | '))
await page.close()
await browser.close()
