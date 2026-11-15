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

// 跑一次批注
const paragraph = page.locator('.doc-column .ProseMirror p').nth(2)
const box = await paragraph.boundingBox()
await page.mouse.move(box.x + 4, box.y + 8)
await page.mouse.down()
await page.mouse.move(box.x + box.width - 12, box.y + box.height - 8, { steps: 12 })
await page.mouse.up()
await page.waitForTimeout(250)
await page.locator('.analyze-bubble').click()
await page.waitForTimeout(2700)
check('0 批注已生成', (await page.locator('.note').count()) > 0)

// 1. 追问输入框
await page.locator('.note').first().locator('button', { hasText: '追问' }).click()
await page.waitForTimeout(300)
check('1 追问输入框出现', (await page.locator('.thread-input input').count()) === 1)

// 2. 发一句话，看到用户与助手两条
const topsBefore = await page.locator('.note').evaluateAll((nodes) => nodes.map((n) => Math.round(n.getBoundingClientRect().top)))
await page.locator('.thread-input input').fill('这句还能更短吗？')
await page.locator('.thread-input button', { hasText: '发送' }).click()
await page.waitForTimeout(600)
check('2 用户问题进入线程', (await page.locator('.thread-user').count()) === 1)
await page.waitForTimeout(2500)
const reply = (await page.locator('.thread-assistant').first().textContent())?.trim() ?? ''
check('2b 助手有回复', reply.length > 3, reply.slice(0, 20))

// 3. 卡片变高之后，页边卡片不重叠
const boxes = await page.locator('.note').evaluateAll((nodes) =>
  nodes.map((n) => {
    const rect = n.getBoundingClientRect()
    return { top: Math.round(rect.top), bottom: Math.round(rect.bottom) }
  }),
)
const overlap = boxes.some((box2, index) => index > 0 && box2.top < boxes[index - 1].bottom - 2)
check('3 卡片没有重叠', !overlap, JSON.stringify(boxes))
check('3b 第一张卡片确实变高了', boxes[0].bottom - boxes[0].top > 120, String(boxes[0].bottom - boxes[0].top))

// 4. 追问线程在重新渲染后还在
await page.locator('.note').nth(1).hover()
await page.waitForTimeout(400)
check('4 线程仍在', (await page.locator('.thread-user').count()) === 1)

await page.screenshot({ path: 'shots/discussion.png' })
check('无控制台错误', errors.length === 0, errors.slice(0, 2).join(' | '))
await page.close()
await browser.close()
