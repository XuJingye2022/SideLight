import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import { formatSavedAt, revisionLabel } from './revisionList.ts'

/**
 * 第 135 轮 A2：复核状态「待处理」文案的单源静态门。
 *
 * 第 128 轮把下拉四态改成中文（`annotations.ts:36-41`），但三处显示仍写英文 `open`：
 * - 在审文件面板表头「按 open 数排序」（`MarginRail.tsx:1016`）；
 * - 在审文件行「open N · 共 M 条」（`MarginRail.tsx:1054`）；
 * - 修订快照行「…（open N）」（`revisionList.ts:32`）。
 *
 * 定案：三处一律取 `REVIEW_STATUS_LABELS.open`（单源），枚举 / 存盘 / 排序键不动。
 * 这是文本门不是行为门：真机证据见 `.tmp/e2e-r135-labels.mjs` 与
 * `docs/iteration/round-135/impl.md`。
 */

/** 先摘注释：注释里写属性名/文案不算接线（`railDiffA11y.test.ts:22-25` 同一口径），行首 `//` 一并摘 */
const source = (path: string): string =>
  readFileSync(path, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/^\s*\/\/.*$/gm, ' ')

const count = (haystack: string, needle: string): number => haystack.split(needle).length - 1

const railSource = source('src/components/MarginRail.tsx')
const reviewSource = source('src/components/RailReviewPanel.tsx')
const listSource = source('src/lib/revisionList.ts')

test('revisionLabel：待处理数与 formatSavedAt 拼成「· 6 B · 批注 2 条（待处理 1）」', () => {
  const savedAt = 1_700_000_000_000
  const label = revisionLabel(savedAt, 6, 2, 1)
  assert.equal(label, `${formatSavedAt(savedAt)} · 6 B · 批注 2 条（待处理 1）`)
  assert.equal(label.includes('open'), false, '快照行不许再写英文 open')
})

test('在审面板（第 139 轮起是 RailReviewPanel.tsx）：表头与行都走 REVIEW_STATUS_LABELS.open，没有手写 open 文案', () => {
  assert.equal(reviewSource.includes('按 open'), false, '表头还有「按 open」')
  assert.equal(reviewSource.includes('open ${row.open}'), false, '在审行还手写 `open ${row.open}`')
  assert.equal(count(reviewSource, 'REVIEW_STATUS_LABELS.open'), 1, '在审行的待处理数应恰一处取中文单源')
  // 第 139 轮 B-229：整块搬走后 MarginRail 不许还留一份文案副本
  assert.equal(count(railSource, 'REVIEW_STATUS_LABELS.open'), 0, '文案副本不许留在 MarginRail.tsx')
})

test('revisionList：快照行取 REVIEW_STATUS_LABELS.open，没有手写「（open N）」', () => {
  assert.equal(listSource.includes('（open ${open}'), false, '快照行还手写 `（open ${open}`')
  assert.equal(listSource.includes('（open '), false, '快照行或注释还写「（open 」')
  assert.equal(count(listSource, 'REVIEW_STATUS_LABELS.open'), 1, '快照行的待处理数应恰一处取中文单源')
})
