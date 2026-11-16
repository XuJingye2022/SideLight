import assert from 'node:assert/strict'

import { chromium } from 'playwright-core'

import {
  collectDocNotes,
  parseStream,
  parseAnnotationStore,
  replaceInWindow,
  serializeAnnotationStore,
} from '../src/lib/annotations.ts'

const checks = []
const check = (label, fn) => {
  try {
    fn()
    checks.push({ label, ok: true })
    console.log(`PASS ${label}`)
  } catch (error) {
    checks.push({ label, ok: false })
    console.log(`FAIL ${label}: ${error instanceof Error ? error.message : String(error)}`)
  }
}

const previous = [
  { id: 'keep', kind: 'evaluation', status: 'pending', from: 100, to: 110, quote: '窗口外', note: '保留' },
  { id: 'reuse', kind: 'evaluation', status: 'pending', from: 10, to: 20, quote: '窗口内', note: '同一句' },
]
const fresh = [{ id: 'fresh', kind: 'evaluation', status: 'pending', from: 11, to: 20, quote: '窗口内', note: '同一句' }]

check('两次重跑不翻倍', () => {
  const once = replaceInWindow(previous, fresh, { start: 5, end: 30 })
  const twice = replaceInWindow(once, fresh, { start: 5, end: 30 })
  assert.equal(once.length, 2)
  assert.equal(twice.length, 2)
})
check('窗口外不误删且 id 复用', () => {
  const once = replaceInWindow(previous, fresh, { start: 5, end: 30 })
  assert.ok(once.some((item) => item.id === 'keep'))
  assert.equal(once.find((item) => item.quote === '窗口内').id, 'reuse')
})
check('overall 进入 DocNote', () => {
  const parsed = parseStream('{"kind":"overall","note":"全文总评"}\n{"kind":"evaluation","quote":"找不到的引文","note":"未定位"}\n')
  assert.equal(parsed.items[0].kind, 'overall')
  const notes = collectDocNotes(parsed.items, [])
  assert.equal(notes.filter((note) => note.kind === 'overall').length, 1)
})
check('unresolved 保留 quote', () => {
  const parsed = parseStream('{"kind":"evaluation","quote":"找不到的引文","note":"未定位"}\n')
  const notes = collectDocNotes(parsed.items, [])
  assert.equal(notes[0].kind, 'unresolved')
  assert.equal(notes[0].quote, '找不到的引文')
})
check('旧数组兼容并写回 v2', () => {
  const store = parseAnnotationStore(JSON.stringify(previous))
  assert.equal(store.v, 2)
  assert.equal(store.annotations.length, 2)
  const round = JSON.parse(serializeAnnotationStore(store))
  assert.equal(round.v, 2)
  assert.equal(round.annotations.length, 2)
})

const content = [
  '{"kind":"meta","note":"我判断这段的意图是：介绍产品。"}',
  '{"kind":"overall","note":"全文最值得改的一处：先给读者动作，再补证据。"}',
  '{"kind":"evaluation","quote":"Sidelight","note":"论证：这里需要一句读者能验证的依据。"}',
  '{"kind":"evaluation","quote":"找不到的引文-ROUTE","note":"证据：引文在正文里不存在。"}',
].join('\n')
const sseBody = `data: ${JSON.stringify({ choices: [{ delta: { content } }] })}\n\ndata: [DONE]\n\n`

const browser = await chromium.connectOverCDP(process.env.SIDELIGHT_CDP ?? 'http://127.0.0.1:9222')
const page = await browser.newPage()
await page.addInitScript(() => {
  localStorage.setItem('sidelight.settings.v1', JSON.stringify({ apiKey: 'route-test', analysisPrompt: '' }))
})
await page.route('**/chat/completions', (route) =>
  route.fulfill({ status: 200, contentType: 'text/event-stream', body: sseBody }),
)
await page.goto(process.env.SIDELIGHT_URL ?? 'http://localhost:5173', { waitUntil: 'networkidle' })
await page.locator('.ProseMirror').click()
await page.keyboard.press('Control+A')
await page.keyboard.press('Control+Enter')
await page.waitForTimeout(1200)
const first = await page.evaluate(() => ({
  cards: document.querySelectorAll('.margin-rail article').length,
  overall: document.querySelectorAll('.rail-overall').length,
  unresolved: document.querySelectorAll('.rail-unresolved').length,
}))
await page.screenshot({ path: 'shots/round-26/annotation-overall.png' }).catch(() => undefined)
await page.keyboard.press('Control+Enter')
await page.waitForTimeout(1200)
const second = await page.evaluate(() => ({
  cards: document.querySelectorAll('.margin-rail article').length,
  overall: document.querySelectorAll('.rail-overall').length,
  unresolved: document.querySelectorAll('.rail-unresolved').length,
}))
check('route 两次重跑卡片不翻倍', () => {
  assert.ok(first.cards > 0 && first.cards === second.cards, `${first.cards}/${second.cards}`)
})
check('route overall 出现', () => {
  assert.ok(second.overall === 1 && second.cards > 0, String(second.overall))
})
check('route unresolved 保留', () => {
  assert.ok(second.unresolved >= 1, String(second.unresolved))
})

const failed = checks.filter((item) => !item.ok)
console.log(`summary: ${checks.length - failed.length}/${checks.length} PASS`)
process.exit(failed.length > 0 ? 1 : 0)
