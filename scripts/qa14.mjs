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
await page.evaluate(() => {
  localStorage.clear()
  localStorage.setItem(
    'sidelight.settings.v1',
    JSON.stringify({ baseUrl: 'https://api.deepseek.com/v1', apiKey: '', model: 'm', fontSize: 17, searchProvider: 'tavily', searchApiKey: 'tvly-test' }),
  )
})
await page.reload({ waitUntil: 'networkidle' })
await page.waitForSelector('.doc-column .ProseMirror', { timeout: 15000 })
await page.evaluate(() => {
  const realFetch = window.fetch.bind(window)
  window.fetch = async (input, init) => {
    const requestUrl = typeof input === 'string' ? input : input.url
    if (requestUrl.includes('api.tavily.com')) {
      return new Response(
        JSON.stringify({ results: [{ title: '某统计年鉴', url: 'https://example.org/data', content: '三成读者会在第一章停下。' }] }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      )
    }
    return realFetch(input, init)
  }
})
const paragraph = page.locator('.doc-column .ProseMirror p').nth(2)
const box = await paragraph.boundingBox()
await page.mouse.move(box.x + 4, box.y + 8)
await page.mouse.down()
await page.mouse.move(box.x + box.width - 12, box.y + box.height - 8, { steps: 12 })
await page.mouse.up()
await page.waitForTimeout(250)
await page.locator('.analyze-bubble').click()
await page.waitForTimeout(2700)
await page.locator('.note').first().locator('button', { hasText: '联网核对' }).click()
await page.waitForTimeout(1000)
const refine = page.locator('.note').first().locator('button', { hasText: '让侧灯按这些出处重写核实' })
check('1 出处下方有重写按钮', (await refine.count()) === 1)
await refine.click()
await page.waitForTimeout(2600)
const userTurn = await page.locator('.note').first().locator('.thread-user').textContent()
const assistant = await page.locator('.note').first().locator('.thread-assistant').textContent()
check('2 追问里带出处编号', (userTurn ?? '').includes('1. 某统计年鉴'), (userTurn ?? '').slice(0, 30))
check('2b 助手有回复', (assistant ?? '').length > 3, (assistant ?? '').slice(0, 20))
await page.screenshot({ path: 'shots/refine.png' })
check('无控制台错误', errors.length === 0, errors.slice(0, 2).join(' | '))
await page.close()
await browser.close()
