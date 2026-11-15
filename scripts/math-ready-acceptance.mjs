import { readFileSync } from 'node:fs'
import { chromium } from 'playwright-core'

const URL = process.env.SIDELIGHT_URL ?? 'http://localhost:5173'
const CDP = process.env.SIDELIGHT_CDP ?? 'http://127.0.0.1:9222'
const OUT = 'shots/round-11'

const results = []
const check = (label, ok, extra = '') => {
  results.push({ label, ok })
  console.log(`${ok ? 'PASS' : 'FAIL'} ${label}${extra ? ` (${extra})` : ''}`)
}

const browser = await chromium.connectOverCDP(CDP)

const makePage = async ({ formula = false } = {}) => {
  const context = await browser.newContext({ acceptDownloads: true, viewport: { width: 1440, height: 900 } })
  const page = await context.newPage()
  const katexRequests = []
  page.on('request', (request) => {
    const url = request.url()
    if (/katex[^/]*\.(js|mjs|css)/i.test(url) || /katex-(?:.*)\.(js|css)/i.test(url)) katexRequests.push(url)
  })
  await page.addInitScript(() => {
    window.prompt = (message) => (typeof message === 'string' && message.includes('LaTeX') ? 'a^2+b^2=c^2' : null)
    window.__setFile = (name, text) => {
      window.__io = window.__io || { files: {}, writes: [] }
      window.__io.files[name] = { text }
    }
  })
  await page.route('**/__doc', (route) => route.fulfill({ status: 404, contentType: 'application/json', body: '{"v":1,"ok":false}' }))
  await page.goto(URL, { waitUntil: 'networkidle' })
  await page.evaluate(() => localStorage.clear())
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForSelector('.editor', { timeout: 15000 })
  await page.waitForTimeout(300)
  if (formula) {
    await page.locator('.editor').click()
    await page.keyboard.type('$x^2$')
    await page.keyboard.press('Space')
    await page.waitForTimeout(300)
  }
  return { context, page, katexRequests }
}

// 1) 无公式文档首屏不请求 KaTeX
{
  const { context, page, katexRequests } = await makePage()
  await page.waitForTimeout(800)
  check('无公式文档首屏没有 KaTeX 请求', katexRequests.length === 0, katexRequests.join(' '))
  await context.close()
}

// 2) 含公式：排版态出现，占位清零，字体 face 到位
{
  const { context, page } = await makePage({ formula: true })
  let rendered = true
  try {
    await page.waitForSelector('.editor .katex', { timeout: 8000 })
    await page.waitForFunction(() => !document.querySelector('.math-pending'), null, { timeout: 8000 })
  } catch {
    rendered = false
  }
  check('含公式文档出现排版态且占位清零', rendered)
  const rawDollar = await page.evaluate(() => /(^|[^$])\$[^$\n]+\$/.test(document.querySelector('.editor')?.textContent ?? ''))
  check('排版后不闪裸 $…$', !rawDollar)
  const faces = await page.evaluate(() => [...document.fonts].filter((font) => /KaTeX/.test(font.family)).length)
  check('KaTeX face 数量 ≥ 16', faces >= 16, String(faces))
  await context.close()
}

// 3) 阻断 KaTeX chunk：出现 math-fallback，且没有裸 $
{
  const context = await browser.newContext({ acceptDownloads: true })
  const page = await context.newPage()
  await page.addInitScript(() => {
    window.prompt = () => 'a^2+b^2=c^2'
  })
  // 阻断 KaTeX 的 CSS：模块导入会 reject，进入失败态；JS 已取到，重试可只补 CSS
  await page.route('**/katex.min.css*', (route) => route.abort())
  await page.route('**/__doc', (route) => route.fulfill({ status: 404, body: '{}' }))
  await page.goto(URL, { waitUntil: 'networkidle' })
  await page.waitForSelector('.editor')
  await page.locator('.editor').click()
  await page.keyboard.type('$x^2$')
  await page.keyboard.press('Space')
  await page.waitForTimeout(1200)
  const fallback = await page.locator('.editor .math-fallback').count()
  const text = await page.evaluate(() => document.querySelector('.editor')?.textContent ?? '')
  check('阻断 chunk 后出现 math-fallback', fallback > 0, String(fallback))
  check('失败态不是空白、有可复制原文', text.includes('$x^2$'), text.slice(0, 40))
  // 解除阻断后点失败块：至少应重新发起 KaTeX 请求（dev 的模块失败缓存可能仍拒绝，页面刷新才彻底恢复）
  let retryRequests = 0
  page.on('request', (request) => {
    if (/katex/i.test(request.url())) retryRequests += 1
  })
  await page.unrouteAll({ behavior: 'wait' })
  await page.evaluate(() => document.querySelector('.editor .math-fallback')?.click())
  await page.waitForTimeout(900)
  const retryable = await page.evaluate(() => {
    const element = document.querySelector('.editor .math-fallback')
    return element
      ? { title: element.getAttribute('title'), cursor: getComputedStyle(element).cursor }
      : null
  })
  check(
    '失败态可点击重试（会重新发起加载）',
    Boolean(retryable) && retryRequests > 0,
    `${retryRequests} 次请求 / ${JSON.stringify(retryable)}`,
  )
  await context.close()
}

// 4) 插入 / 预览 / 导出三条路径（源码与打印由 T1 阶段 B 补）
{
  const { context, page } = await makePage({ formula: true })
  await page.getByRole('button', { name: '插入 ▾' }).click()
  await page.getByRole('button', { name: '公式块', exact: true }).click()
  await page.waitForTimeout(500)
  check('菜单插入公式后仍是排版态', (await page.locator('.editor .katex').count()) > 0)
  const block = await page.evaluate(() => {
    const element = document.querySelector('.editor [data-type="block-math"]')
    if (!element) return null
    const style = getComputedStyle(element)
    return { display: style.display, align: style.textAlign }
  })
  check('块级公式按 display 排版（居中）', block?.display === 'block' && block?.align === 'center', JSON.stringify(block))
  await page.screenshot({ path: `${OUT}/t1-block.png` })
  await page.getByRole('button', { name: '预览', exact: true }).click()
  await page.waitForTimeout(400)
  check('预览里出现 KaTeX', (await page.locator('.preview-pane .katex').count()) > 0)
  await page.getByRole('button', { name: '预览', exact: true }).click()
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 5000 }).catch(() => null),
    page.getByRole('button', { name: '导出 ▾' }).click().then(() => page.getByRole('menuitem', { name: 'HTML', exact: true }).click()),
  ])
  if (download) {
    const path = await download.path()
    const html = path ? readFileSync(path, 'utf8') : ''
    check('导出 HTML 含 MathML', html.includes('<math'))
  } else {
    check('导出 HTML 含 MathML', false, 'download 未触发')
  }
  await page.screenshot({ path: `${OUT}/t1-formula.png` })
  await context.close()
}

console.log(`\n${results.filter((item) => item.ok).length}/${results.length} PASS`)
await browser.close()
if (results.some((item) => !item.ok)) process.exit(1)
