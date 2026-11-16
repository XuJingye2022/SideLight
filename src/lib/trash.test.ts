import assert from 'node:assert/strict'
import test from 'node:test'

import { pickTrashSource, shouldWriteCurrent } from './trash.ts'

const NAME = '20261117-010203-abc-干净.md'

test('撤销选源：只有整份备份时用备份', () => {
  assert.equal(pickTrashSource([{ name: NAME, size: 24 }], NAME), NAME)
})

test('撤销选源：备份之外还有一个 0 字节 .current.md 时不许用它（删除干净文件丢正文的回归锁）', () => {
  const entries = [
    { name: `${NAME}.current.md`, size: 0 },
    { name: NAME, size: 24 },
  ]
  assert.equal(pickTrashSource(entries, NAME), NAME)
})

test('撤销选源：.current.md 非空时优先它（恢复未保存的改动）', () => {
  const entries = [
    { name: `${NAME}.current.md`, size: 31 },
    { name: NAME, size: 24 },
  ]
  assert.equal(pickTrashSource(entries, NAME), `${NAME}.current.md`)
})

test('撤销选源：两个副本都没有时返回 null', () => {
  assert.equal(pickTrashSource([], NAME), null)
  // 回收站里同名的 .draft/.json 缓存不算正文副本
  assert.equal(pickTrashSource([{ name: `${NAME}.draft`, size: 10 }], NAME), null)
})

test('shouldWriteCurrent：干净文件（null）不写 .current.md', () => {
  assert.equal(shouldWriteCurrent(null), false)
})

test('shouldWriteCurrent：整篇删空仍是 null 以外的正文，照样写', () => {
  assert.equal(shouldWriteCurrent(''), true)
})
