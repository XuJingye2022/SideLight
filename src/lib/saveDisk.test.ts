import assert from 'node:assert/strict'
import test from 'node:test'

import { byteLength, diskSnapshot, reusableDiskText } from './saveDisk.ts'

test('byteLength 与 UTF-8 字节数同口径（中文 3 字节、emoji 4 字节）', () => {
  assert.equal(byteLength(''), 0)
  assert.equal(byteLength('abc'), 3)
  assert.equal(byteLength('甲'), 3)
  assert.equal(byteLength('a甲'), 4)
  assert.equal(byteLength('😀'), 4)
})

test('diskSnapshot 记下字节数与 mtime：mtime 默认未知', () => {
  const entry = diskSnapshot('甲')
  assert.deepEqual(entry, { text: '甲', size: 3, mtime: null })
  assert.equal(diskSnapshot('', 1234).mtime, 1234)
})

test('空文件也是有效正文：size 与 mtime 对上就复用 `\'\'`', () => {
  const entry = diskSnapshot('', 1700000000000)
  assert.equal(reusableDiskText(entry, 0, 1700000000000), '')
})

test('mtime 未知不复用（宁可多读一次，不能用不可靠的缓存）', () => {
  assert.equal(reusableDiskText(diskSnapshot('甲'), 3, 1700000000000), null)
})

test('没有快照不复用', () => {
  assert.equal(reusableDiskText(null, 3, 1700000000000), null)
})

test('字节数变了不复用：同长度不同内容也能靠 mtime 分辨', () => {
  const entry = diskSnapshot('甲', 1700000000000)
  assert.equal(reusableDiskText(entry, 4, 1700000000000), null)
  assert.equal(reusableDiskText(entry, 3, 1700000001000), null)
})

test('三样全中才复用', () => {
  const entry = diskSnapshot('甲', 1700000000000)
  assert.equal(reusableDiskText(entry, 3, 1700000000000), '甲')
})

test('mtime 补上之后同一份快照从不可用变可用（异步补 mtime 的路径）', () => {
  const entry = diskSnapshot('甲\n')
  entry.mtime = 42
  assert.equal(reusableDiskText(entry, 4, 42), '甲\n')
})
