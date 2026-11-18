import assert from 'node:assert/strict'
import test from 'node:test'

import { firstTabbableIndex, lastTabbableIndex } from './dialogFocus.ts'

test('firstTabbableIndex：跳过 tabIndex=-1 的项', () => {
  assert.equal(firstTabbableIndex([0]), 0)
  assert.equal(firstTabbableIndex([0, 0]), 0)
  assert.equal(firstTabbableIndex([-1, 0, -1]), 1)
  assert.equal(firstTabbableIndex([-1, -1, 0]), 2)
})

test('lastTabbableIndex：从末尾找第一个 tabIndex>=0 的项', () => {
  assert.equal(lastTabbableIndex([0]), 0)
  assert.equal(lastTabbableIndex([0, 0]), 1)
  assert.equal(lastTabbableIndex([-1, 0, -1]), 1)
  assert.equal(lastTabbableIndex([0, -1, -1]), 0)
})

test('全部是 -1：首尾都返回 −1（调用方退回原行为）', () => {
  assert.equal(firstTabbableIndex([-1, -1]), -1)
  assert.equal(lastTabbableIndex([-1, -1, -1]), -1)
})

test('空数组：首尾都返回 −1', () => {
  assert.equal(firstTabbableIndex([]), -1)
  assert.equal(lastTabbableIndex([]), -1)
})

test('roving 组（恰 1 个 0）首尾落在选中项', () => {
  const tabs = [-1, 0, -1, -1]
  assert.equal(firstTabbableIndex(tabs), 1)
  assert.equal(lastTabbableIndex(tabs), 1)
})
