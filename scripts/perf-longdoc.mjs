import { chromium } from 'playwright-core'
import { mkdirSync, writeFileSync } from 'node:fs'

const URL = process.env.SIDELIGHT_URL ?? 'http://localhost:5173'
const CDP = process.env.SIDELIGHT_CDP ?? 'http://127.0.0.1:9222'
const OUT = '.tmp/perf-longdoc.json'
const results = []

const browser = await chromium.connectOverCDP(CDP)

const textFor = (bytes) => {
  const line = '侧灯只补光，不替你写。写完一段，再看哪里还能更清楚。\n'
  const head = '# 长文性能样本\n\n'
  const target = Math.max(line.length, bytes - head.length)
  return head + line.repeat(Math.ceil(target / line.length)).slice(0, target)
}

const p95 = (values) => {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))]
}
const median = (values) => {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.floor(sorted.length / 2)]
}

const measure = async (label, bytes) => {
  console.log('start', label)
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await context.newPage()
  page.setDefaultTimeout(20000)
  console.log('page ready', label)
  await page.goto(URL, { waitUntil: 'domcontentloaded' })
  console.log('goto done', label)
  await page.evaluate(({ key, text }) => localStorage.setItem(key, JSON.stringify({ text, name: `perf-${text.length}.md`, savedAt: Date.now() })), {
    key: 'sidelight.doc.v1',
    text: textFor(bytes),
  })
  const loadSamples = []
  for (let round = 0; round < 4; round += 1) {
    const start = Date.now()
    await page.reload({ waitUntil: 'domcontentloaded' })
    console.log('reload', label, round)
    await page.locator('.ProseMirror').first().waitFor({ state: 'visible', timeout: 30000 })
    await page.waitForTimeout(800)
    const elapsed = Date.now() - start
    if (round > 0) loadSamples.push(elapsed)
  }
  console.log('load done', label, loadSamples)
  await page.locator('.ProseMirror').click()
  await page.keyboard.press('Control+End')
  const p95Runs = []
  for (let run = 0; run < 4; run += 1) {
    const samples = []
    for (let i = 0; i < 20; i += 1) {
      const start = performance.now()
      await page.keyboard.type('字')
      samples.push(performance.now() - start)
    }
    if (run > 0) p95Runs.push(p95(samples))
  }
  const load = median(loadSamples)
  const typing = median(p95Runs)
  await context.close()
  return { label, bytes: textFor(bytes).length, loadMs: load, p95Ms: typing, loadSamples, p95Runs }
}

const only = process.argv[2]
const sizes = [['10 KB', 10 * 1024], ['100 KB', 100 * 1024], ['1 MB', 1024 * 1024]].filter(([label]) => !only || label === only)

try {
  for (const [label, bytes] of sizes) {
    try {
      const result = await measure(label, bytes)
      results.push(result)
      console.log(`${label}: load=${result.loadMs}ms p95=${result.p95Ms}ms`)
    } catch (error) {
      console.log(`${label}: FAILED ${error instanceof Error ? error.message : String(error)}`)
      results.push({ label, failed: String(error) })
    }
  }
} finally {
  await browser.close()
}

mkdirSync('.tmp', { recursive: true })
writeFileSync(OUT, JSON.stringify({ generatedAt: new Date().toISOString(), results }, null, 2), 'utf8')
console.log('JSON:', OUT)
if (results.some((item) => item.failed || item.p95Ms == null)) process.exit(1)
