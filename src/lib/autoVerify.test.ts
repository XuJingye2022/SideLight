import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import { autoVerifyTargets, runVerifyPool, verifyQuery, VERIFY_CONCURRENCY } from './autoVerify.ts'

/**
 * 第 138 轮：联网核对默认自动。
 *
 * 用户在队列里提的要求：有搜索 Key 时，分析一结束就自动核对出处，不用再手点；
 * 卡片显示「核对中…」→ 出处，失败才留「重新核对」，没 Key 跳过，且不阻塞正文。
 *
 * 纯函数部分（搜索词 / 去重 / 限并发）在这里测；接线（分析结束调 autoVerify、
 * 卡片按状态换字样）用文件静态门兜底，真机证据在 `.tmp/e2e-r138-auto-verify.mjs`
 * 与 `docs/iteration/round-138/impl.md`。
 */

/* ---------- verifyQuery：手动与自动同一条查询 ---------- */

test('verifyQuery：原文 + 批注，空白压成一个空格', () => {
  assert.equal(verifyQuery({ quote: '  一年增长\n 三倍 ', note: '这个数字没有出处' }), '一年增长 三倍 这个数字没有出处')
})

test('verifyQuery：只有原文 / 只有批注都不留多余空格', () => {
  assert.equal(verifyQuery({ quote: '原文', note: '   ' }), '原文')
  assert.equal(verifyQuery({ quote: '', note: '批注' }), '批注')
})

test('verifyQuery：超长截到 200 字（搜索服务对查询长度有限制）', () => {
  const query = verifyQuery({ quote: '甲'.repeat(150), note: '乙'.repeat(150) })
  assert.equal(query.length, 200)
  assert.equal(query, `${'甲'.repeat(150)} ${'乙'.repeat(49)}`)
})

/* ---------- autoVerifyTargets：同一条批注只搜一次 ---------- */

test('autoVerifyTargets：按 id 去重且保持首次出现的顺序', () => {
  const fresh = [
    { id: 'b', quote: '乙', note: '二' },
    { id: 'a', quote: '甲', note: '一' },
    { id: 'b', quote: '乙', note: '二' },
  ]
  assert.deepEqual(
    autoVerifyTargets(fresh).map((item) => item.id),
    ['b', 'a'],
  )
})

test('autoVerifyTargets：空数组原样', () => {
  assert.deepEqual(autoVerifyTargets([]), [])
})

/* ---------- runVerifyPool：并发上限 2，谁都不丢 ---------- */

test('runVerifyPool：每条恰好跑一次，按数组顺序取件', async () => {
  const items = ['a', 'b', 'c', 'd']
  const seen: string[] = []
  await runVerifyPool(items, 2, async (item) => {
    seen.push(item)
  })
  assert.deepEqual(seen, items)
})

test('runVerifyPool：并发不超过 limit（自动核对是 2）', async () => {
  let active = 0
  let peak = 0
  const starts: number[] = []
  const startedAt = Date.now()
  await runVerifyPool([1, 2, 3, 4, 5], VERIFY_CONCURRENCY, async () => {
    active += 1
    peak = Math.max(peak, active)
    starts.push(Date.now() - startedAt)
    await new Promise((resolve) => setTimeout(resolve, 20))
    active -= 1
  })
  assert.equal(peak, 2)
  // 第 3 条必须等前两条之一回来才开跑：它的开始时间不早于第 1 条 + 20 ms
  assert.ok(starts[2] >= starts[0] + 15, `第三条开始得太早：${starts.join(',')}`)
})

test('runVerifyPool：limit 夹到 1..条数（0 / 负数 / NaN / 超长）', async () => {
  const run = async (limit: number) => {
    let active = 0
    let peak = 0
    await runVerifyPool([1, 2, 3], limit, async () => {
      active += 1
      peak = Math.max(peak, active)
      await new Promise((resolve) => setTimeout(resolve, 5))
      active -= 1
    })
    return peak
  }
  assert.equal(await run(0), 1)
  assert.equal(await run(-3), 1)
  assert.equal(await run(Number.NaN), 1)
  assert.equal(await run(99), 3)
})

test('runVerifyPool：空数组不调 worker，直接 resolve', async () => {
  let calls = 0
  await runVerifyPool([], 2, async () => {
    calls += 1
  })
  assert.equal(calls, 0)
})

test('runVerifyPool：单条抛错不打断其余（全部跑完、池子不 reject）', async () => {
  const seen: number[] = []
  await runVerifyPool([1, 2, 3], 2, async (item) => {
    seen.push(item)
    if (item === 1) throw new Error('搜索服务挂了')
  })
  assert.deepEqual(seen.sort((a, b) => a - b), [1, 2, 3])
})

/* ---------- 接线静态门：省略这两处，前面全是死代码 ---------- */

/** 先摘注释：注释里写属性名不算接线（`railDiffA11y.test.ts:21-25` 同一口径） */
const source = (path: string): string =>
  readFileSync(path, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/^\s*\/\/.*$/gm, ' ')

const count = (haystack: string, needle: string): number => haystack.split(needle).length - 1

const appSource = source('src/App.tsx')
const railSource = source('src/components/MarginRail.tsx')

test('App.tsx：分析结束调 autoVerify（恰 1 处），自动核对按 VERIFY_CONCURRENCY 跑池子', () => {
  assert.equal(count(appSource, 'autoVerify(freshTargets)'), 1, '分析结束没有调 autoVerify')
  assert.equal(count(appSource, 'runVerifyPool(targets, VERIFY_CONCURRENCY'), 1, '自动核对没走限并发池子')
  // 正文不等搜索：池子不能被 await（只许 `void runVerifyPool(`）
  assert.equal(count(appSource, 'await runVerifyPool('), 0, '自动核对被 await 了会阻塞正文')
})

test('App.tsx：搜索服务仍是动态 import，不进首屏', () => {
  assert.equal(count(appSource, "from './lib/search.ts'"), 0, 'search.ts 被静态 import 了')
  assert.equal(count(appSource, "await import('./lib/search.ts')"), 1, 'search.ts 的动态 import 口变了')
})

test('MarginRail.tsx：单条 verifyingId 换成按 id 记的 verifyStates，成功隐藏按钮、失败留「重新核对」', () => {
  assert.equal(count(railSource, 'verifyingId'), 0, '旧的单条 verifyingId 还在')
  assert.equal(count(railSource, 'verifyStates[annotation.id]'), 3, 'disabled / 核对中 / 重新核对 应各读一次状态')
  assert.equal(count(railSource, '核对中…'), 1, '「核对中…」字样应恰 1 处')
  assert.equal(count(railSource, '重新核对'), 1, '「重新核对」只在失败态出现，应恰 1 处')
  assert.equal(count(railSource, 'annotation.sources?.length ?? 0) === 0'), 1, '有出处时没隐藏核对按钮')
})
