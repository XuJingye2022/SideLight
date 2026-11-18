import assert from 'node:assert/strict'
import test from 'node:test'

import { nextRestoreEntry, restoreLabel, type RestoreEntry } from './restoreEntry.ts'

/**
 * 第 84 轮 B-142：删除后的撤销入口曾被下一条通知顶掉。
 * 单测只锁状态迁移与文案：保存提示 / 普通 toast / refreshTree 不清入口，树与工作区变了才清。
 */
const ENTRY: RestoreEntry = { name: 'a.md', path: 'wf/a.md', trashName: '20261118-101010-ab12-a.md' }
const OTHER: RestoreEntry = { name: 'b.md', path: 'wf/b.md', trashName: '20261118-101111-cd34-b.md' }

test('删除事件记下凭据（名字/路径/回收站副本名）', () => {
  assert.deepEqual(nextRestoreEntry(null, { type: 'deleted', entry: ENTRY }), ENTRY)
})

test('再删一次只留最近一次（不排队、不累积）', () => {
  const first = nextRestoreEntry(null, { type: 'deleted', entry: ENTRY })
  assert.deepEqual(nextRestoreEntry(first, { type: 'deleted', entry: OTHER }), OTHER)
})

test('删除事件存的是副本，不与被删对象共享引用', () => {
  const entry = { ...ENTRY }
  const next = nextRestoreEntry(null, { type: 'deleted', entry })
  assert.notEqual(next, entry, '不能把调用方的对象直接塞进 state')
  entry.name = '改过.md'
  assert.equal(next?.name, 'a.md')
})

test('撤销成功清掉入口', () => {
  assert.equal(nextRestoreEntry(ENTRY, { type: 'restored' }), null)
})

test('用户关掉 chip 清掉入口', () => {
  assert.equal(nextRestoreEntry(ENTRY, { type: 'dismissed' }), null)
})

test('新建 / 重命名（tree-changed）清掉入口', () => {
  assert.equal(nextRestoreEntry(ENTRY, { type: 'tree-changed' }), null)
})

test('开合文件夹（workspace-changed）清掉入口', () => {
  assert.equal(nextRestoreEntry(ENTRY, { type: 'workspace-changed' }), null)
})

test('清空状态再收到清空事件仍是 null（幂等，不抛错）', () => {
  for (const type of ['restored', 'dismissed', 'tree-changed', 'workspace-changed'] as const) {
    assert.equal(nextRestoreEntry(null, { type }), null)
  }
})

test('保存提示 / 普通 toast / 刷新树不是本模块的事件：入口不动', () => {
  // 这些事件根本不在 RestoreEvent 联合里；调用方遇到它们就不调用本函数。
  // 这里用手写的事件对象覆盖 default 分支，锁住「未知事件原样返回」这条兜底。
  const unknown = { type: 'saved' } as unknown as { type: 'dismissed' }
  assert.equal(nextRestoreEntry(ENTRY, unknown), ENTRY)
})

test('chip 文案带文件名；没有入口时是空串', () => {
  assert.equal(restoreLabel(ENTRY), '已删除 a.md')
  assert.equal(restoreLabel(OTHER), '已删除 b.md')
  assert.equal(restoreLabel(null), '')
})
