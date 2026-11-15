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
    JSON.stringify({
      baseUrl: 'https://api.deepseek.com/v1',
      apiKey: '',
      model: 'deepseek-chat',
      fontSize: 17,
      searchProvider: 'tavily',
      searchApiKey: 'tvly-test',
    }),
  )
})
await page.reload({ waitUntil: 'networkidle' })
await page.waitForSelector('.doc-column .ProseMirror', { timeout: 15000 })
await page.waitForTimeout(400)

// 用一个假的搜索接口，验 UI 与请求组装
await page.evaluate(() => {
  const realFetch = window.fetch.bind(window)
  window.fetch = async (input, init) => {
    const requestUrl = typeof input === 'string' ? input : input.url
    if (requestUrl.includes('api.tavily.com')) {
      window.__lastSearchBody = init && init.body ? String(init.body) : ''
      window.__lastSearchAuth = init && init.headers ? JSON.stringify(init.headers) : ''
      return new Response(
        JSON.stringify({
          results: [
            { title: '某统计年鉴', url: 'https://example.org/data', content: '三成左右的读者会在第一章停下。' },
            { title: '某读书报告', url: 'https://example.net/report', content: '放弃原因多为方向不明。' },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      )
    }
    return realFetch(input, init)
  }
})

// 出一批批注
const paragraph = page.locator('.doc-column .ProseMirror p').nth(2)
const box = await paragraph.boundingBox()
await page.mouse.move(box.x + 4, box.y + 8)
await page.mouse.down()
await page.mouse.move(box.x + box.width - 12, box.y + box.height - 8, { steps: 12 })
await page.mouse.up()
await page.waitForTimeout(250)
await page.locator('.analyze-bubble').click()
await page.waitForTimeout(2700)

const verifyButtons = page.locator('.note').first().locator('button', { hasText: '联网核对' })
check('1 有联网核对按钮', (await verifyButtons.count()) === 1)
check('1b 配好 key 后按钮可用', !(await verifyButtons.isDisabled()))

await verifyButtons.click()
await page.waitForTimeout(1200)
const sources = await page.locator('.note').first().locator('.sources a').allTextContents()
check('2 出处显示出来', sources.length === 2, JSON.stringify(sources))
const href = await page.locator('.note').first().locator('.sources a').first().getAttribute('href')
check('2b 出处带链接', href === 'https://example.org/data', href ?? 'none')

const body = await page.evaluate(() => window.__lastSearchBody)
const auth = await page.evaluate(() => window.__lastSearchAuth)
check('3 请求带查询词', body.includes('三成') || body.includes('主灯'), String(body).slice(0, 80))
check('3b 请求带 Bearer key', auth.includes('tvly-test'))

const notice = (await page.locator('.toast').textContent())?.trim() ?? ''
check('4 有结果提示', notice.includes('2 条出处'), notice)

await page.screenshot({ path: 'shots/search-sources.png' })
check('无控制台错误', errors.length === 0, errors.slice(0, 2).join(' | '))
await page.close()
await browser.close()
