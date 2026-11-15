// T5 字体裁剪验收：证明被删的 4 个装饰 face 不被请求，同时 Regular 族仍加载。
// 用法：node scripts/font-probe.mjs [url]
// 前置：dev server 在 http://localhost:5173；CDP 9224 可达（headless Edge）。
// 用独立 browser.newContext()，不污染已有页面与 localStorage。
import { chromium } from 'playwright-core'

const url = process.argv[2] ?? 'http://localhost:5173'

const DROPPED = [
  'KaTeX_Fraktur-Bold',
  'KaTeX_Caligraphic-Bold',
  'KaTeX_SansSerif-Bold',
  'KaTeX_SansSerif-Italic',
]

// 只覆盖 Regular 族的 10 个样本：会用 \mathcal / \mathfrak / \mathsf 的 Regular，
// 不使用 \mathbf{\mathfrak{…}} 这类会命中被删粗/斜体的嵌套。
const SAMPLES = [
  '\\mathcal{F}',
  '\\mathfrak{g}',
  '\\mathsf{T}',
  '\\mathbf{x}',
  '\\mathit{y}',
  '\\sum_{i=1}^{n} i^2',
  '\\int_0^1 x\\,dx',
  '\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}',
  '\\sqrt{\\frac{a}{b}}',
  '\\hat{\\theta} \\cdot \\nabla f',
]

const requests = new Set()
let failed = 0
function check(name, ok, detail) {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`)
  if (!ok) failed += 1
}

const browser = await chromium.connectOverCDP('http://127.0.0.1:9224')
const context = await browser.newContext()
const page = await context.newPage()
page.on('request', (request) => {
  const target = request.url()
  if (target.includes('.woff2')) requests.add(target.split('/').pop())
})
const errors = []
page.on('pageerror', (error) => errors.push(String(error)))

await page.goto(url, { waitUntil: 'networkidle' })
await page.waitForSelector('.doc-column .ProseMirror', { timeout: 20000 })

// 用工具栏「插入 → 公式」逐条插入：它走 window.prompt，按队列喂 10 个样本，
// 比在正文里敲 $…$ 稳定（输入规则对个别 LaTeX 字符会不触发）。
const queue = [...SAMPLES]
page.on('dialog', async (dialog) => {
  await dialog.accept(queue.shift() ?? 'x^2')
})
for (let index = 0; index < SAMPLES.length; index += 1) {
  await page.getByRole('button', { name: '插入 ▾' }).first().click()
  await page.getByRole('button', { name: '公式', exact: true }).click()
  await page.waitForTimeout(350)
}
await page.waitForTimeout(1500)

const katexCount = await page.locator('.katex').count()
const fonts = await page.evaluate(() =>
  [...document.fonts]
    .filter((font) => /KaTeX/.test(font.family))
    .map((font) => `${font.family} ${font.weight} ${font.style} ${font.status}`),
)

const requested = [...requests].sort()
const droppedRequested = requested.filter((name) => DROPPED.some((face) => name.startsWith(face)))

// 第一段：被删的 face 一个都没被请求
check('被删 face 未请求（4 个装饰粗/斜体）', droppedRequested.length === 0, droppedRequested.length ? droppedRequested.join(', ') : `请求 ${requested.length} 个 woff2`)

// 第二段：Regular 族仍加载
const loaded = fonts.filter((line) => line.endsWith('loaded'))
const mainRegular = loaded.some((line) => line.startsWith('KaTeX_Main 400 normal'))
check(
  'Regular 族仍加载（KaTeX_Main 400 normal 等）',
  mainRegular && loaded.length >= 4 && katexCount >= SAMPLES.length,
  `loaded=${loaded.length} katex=${katexCount}/${SAMPLES.length} fonts=${loaded.slice(0, 4).join(' | ')}`,
)

if (errors.length > 0) check('无 pageerror', false, errors.slice(0, 2).join(' | '))
console.log(`woff2 requested: ${requested.join(', ') || '(none)'}`)

await context.close()
await browser.close()
console.log(failed === 0 ? 'summary: 2/2 PASS' : `summary: ${failed} FAIL`)
process.exit(failed === 0 ? 0 : 1)
