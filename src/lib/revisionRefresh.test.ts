import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

/**
 * 第 124 轮 A1：B-257 的静态接线门。
 *
 * 「在审面板开着时，保存写到磁盘的快照跟着出现」靠四处接线同时成立：
 * ① `App.tsx` 有 `revisionEpoch` 代际状态（初值 0）；
 * ② `recordRevision` 拿到 `writeRevision` 的 id 才递增（写失败/没目录不推）；
 * ③ `App.tsx` 通过 `revisionEpoch={revisionEpoch}` 交给 `MarginRail` 一次，Props 与解构各一处；
 * ④ `MarginRail.tsx` 的 effect 只在面板开着（`reviewActive`）且代际变了时重读，
 *    重读判据含 `reviewRunRef` + `snapSeqRef` 双 ref，且 epoch 路径不推进 `reviewRunRef`。
 *
 * 少接一处不会报错，只会让空态那句「保存一次后才会记录。」继续跟磁盘矛盾（第 123 轮 finder
 * `.tmp/r123-finder-bug-def.json`）。所以这里按源码文本判红。
 *
 * 这是文本门不是行为门：行为证据见 `.tmp/e2e-r124-a1-snap-refresh.mjs` 与
 * `docs/iteration/round-124/impl.md`。
 */

/** 先摘注释：注释里写状态名/序号不算接线（railModalGate.test.ts 同一口径） */
const source = (path: string): string =>
  readFileSync(path, 'utf8').replace(/\/\*[\s\S]*?\*\//g, ' ')

const appSource = source('src/App.tsx')
const railSource = source('src/components/MarginRail.tsx')
const reviewSource = source('src/components/RailReviewPanel.tsx')

const count = (haystack: string, needle: string): number => haystack.split(needle).length - 1

/** 取 `start` 到 `end` 之间的一段，按段断言（避免按长度切到别的函数） */
const between = (haystack: string, start: string, end: string): string => {
  const at = haystack.indexOf(start)
  assert.ok(at >= 0, `找不到「${start}」`)
  const stop = haystack.indexOf(end, at + start.length)
  assert.ok(stop > at, `找不到「${start}」之后的「${end}」`)
  return haystack.slice(at, stop)
}

test('App.tsx：revisionEpoch 代际状态恰一处、初值 0', () => {
  assert.equal(
    count(appSource, 'const [revisionEpoch, setRevisionEpoch] = useState(0)'),
    1,
    'revisionEpoch 只许有一个定义处，且初值 0（面板首次打开不额外重读）',
  )
})

test('App.tsx：recordRevision 拿到 id 才递增代际（await writeRevision 之后、if (id) 守卫）', () => {
  const block = between(appSource, 'const recordRevision', 'const performCommit')
  const atWrite = block.indexOf('await writeRevision(')
  const atBump = block.indexOf('setRevisionEpoch(')
  assert.ok(atWrite >= 0, 'recordRevision 里要 await writeRevision：拿到 id 才能判断写没写成')
  assert.ok(atBump > atWrite, 'setRevisionEpoch 必须在 await writeRevision 之后（写到才推代际）')
  assert.equal(count(block, 'setRevisionEpoch('), 1, 'recordRevision 里只许递增一次')
  assert.ok(
    block.slice(atWrite, atBump).includes('if (id)'),
    '递增要受 if (id) 守卫：没目录、写失败都不许推代际',
  )
})

test('App.tsx 与 MarginRail.tsx：revisionEpoch 接线恰好各一处，并转交给面板', () => {
  assert.equal(
    count(appSource, 'revisionEpoch={revisionEpoch}'),
    1,
    'MarginRail 的 revisionEpoch 入参只许写一次',
  )
  const rail = between(appSource, 'getRevisionSource={async () => {', 'activePath=')
  assert.ok(rail.includes('revisionEpoch={revisionEpoch}'), 'getRevisionSource 之后就要给代际')
  assert.equal(count(railSource, 'revisionEpoch: number'), 1, 'Props 里 revisionEpoch 只许声明一次')
  assert.equal(count(railSource, '\n  revisionEpoch,\n'), 1, '解构里 revisionEpoch 只许写一次')
  // 第 139 轮 B-229：快照清单搬进 RailReviewPanel，MarginRail 只做一次转交
  assert.equal(count(railSource, 'revisionEpoch={revisionEpoch}'), 1, 'MarginRail 要把代际转交给面板一次')
  assert.equal(count(reviewSource, 'revisionEpoch: number'), 1, '面板 Props 里 revisionEpoch 只许声明一次')
})

test('RailReviewPanel.tsx：epoch effect 只在面板开着时重读（挂载态），双 ref 判据，且不推进 reviewRunRef', () => {
  // 第 139 轮 B-229：整块搬进面板；「面板开着」由挂载本身保证（关掉即卸载），effect 不再重复判一次
  const block = between(reviewSource, 'const loadSnapshots', 'const scan')
  assert.ok(block.includes('revisionEpoch === loadedEpochRef.current'), '代际没变就不重读')
  assert.ok(block.includes('snapSeqRef.current !== seq'), '发起后的判据要含 snapSeqRef（后发起者胜出）')
  assert.ok(block.includes('snapSeqRef.current === seq'), '写回前的判据也要含 snapSeqRef')
  assert.ok(
    block.includes('loadSnapshots(reviewRunRef.current)'),
    'epoch 路径按当前 run 重读，不新起一个面板世代',
  )
  assert.ok(!block.includes('reviewRunRef.current += 1'), 'epoch 路径不许推进 reviewRunRef（会让 busy 永真）')
  // 卸载才推进 run（在途读取作废）
  assert.ok(reviewSource.includes('return () => {\n      reviewRunRef.current += 1\n    }'), '卸载要作废在途读取')
})
