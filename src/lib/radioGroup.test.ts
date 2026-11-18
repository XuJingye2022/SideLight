import assert from 'node:assert/strict'
import test from 'node:test'

import { nextRadioIndex, rovingTabIndex } from './radioGroup.ts'

test('右箭头与下箭头前进一项', () => {
  assert.equal(nextRadioIndex('ArrowRight', 0, 4), 1)
  assert.equal(nextRadioIndex('ArrowDown', 1, 4), 2)
})

test('末项按右箭头回到首项', () => {
  assert.equal(nextRadioIndex('ArrowRight', 3, 4), 0)
  assert.equal(nextRadioIndex('ArrowDown', 4 - 1, 4), 0)
})

test('左箭头与上箭头后退一项', () => {
  assert.equal(nextRadioIndex('ArrowLeft', 2, 4), 1)
  assert.equal(nextRadioIndex('ArrowUp', 3, 4), 2)
})

test('首项按左箭头到末项', () => {
  assert.equal(nextRadioIndex('ArrowLeft', 0, 4), 3)
  assert.equal(nextRadioIndex('ArrowUp', 0, 4), 3)
})

test('Home 到首项、End 到末项', () => {
  assert.equal(nextRadioIndex('Home', 2, 4), 0)
  assert.equal(nextRadioIndex('End', 0, 4), 3)
})

test('单项组按任何方向键都停在第 0 项', () => {
  for (const key of ['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp', 'Home', 'End']) {
    assert.equal(nextRadioIndex(key, 0, 1), 0, key)
  }
})

test('未知键返回 null，空组（count 0）也返回 null', () => {
  for (const key of ['Enter', 'Tab', 'Escape', ' ', 'a', 'PageDown']) {
    assert.equal(nextRadioIndex(key, 1, 4), null, key)
  }
  assert.equal(nextRadioIndex('ArrowRight', 0, 0), null)
  assert.equal(nextRadioIndex('Home', 0, 0), null)
})

test('当前索引越界时按首项算，不会卡在 null', () => {
  assert.equal(nextRadioIndex('ArrowRight', -1, 4), 1)
  assert.equal(nextRadioIndex('ArrowRight', 9, 4), 1)
  assert.equal(nextRadioIndex('End', -1, 4), 3)
})

test('rovingTabIndex：选中项 0、其余 −1', () => {
  assert.equal(rovingTabIndex(1, 1), 0)
  assert.equal(rovingTabIndex(0, 1), -1)
  assert.equal(rovingTabIndex(2, 1), -1)
  assert.equal(rovingTabIndex(3, 3), 0)
})

test('rovingTabIndex：没有选中项时首项是唯一 Tab 站', () => {
  assert.equal(rovingTabIndex(0, -1), 0)
  assert.equal(rovingTabIndex(1, -1), -1)
  assert.equal(rovingTabIndex(3, -1), -1)
})
