import assert from 'node:assert/strict'
import test from 'node:test'

import { FIND_NOTE_ID, findBarControls, replaceNoticeText } from './findBarState.ts'

const SOURCE_REASON = '源码模式下不支持查找定位与替换：切回富文本（Ctrl+/）再查'
const PREVIEW_REASON = '预览是只读视图，不支持查找与替换：切回编辑（Ctrl+Shift+P）再查'

test('源码模式：输入、开关、动作钮全锁', () => {
  const controls = findBarControls(SOURCE_REASON, 3)
  assert.equal(controls.locked, true)
  assert.equal(controls.inputsReadOnly, true)
  assert.equal(controls.togglesDisabled, true)
  assert.equal(controls.actionsDisabled, true)
})

test('预览模式：输入、开关、动作钮全锁', () => {
  const controls = findBarControls(PREVIEW_REASON, 0)
  assert.equal(controls.locked, true)
  assert.equal(controls.inputsReadOnly, true)
  assert.equal(controls.togglesDisabled, true)
  assert.equal(controls.actionsDisabled, true)
})

test('reason 为 undefined 时不锁', () => {
  const controls = findBarControls(undefined, 5)
  assert.equal(controls.locked, false)
  assert.equal(controls.inputsReadOnly, false)
  assert.equal(controls.togglesDisabled, false)
  assert.equal(controls.actionsDisabled, false)
})

test('reason 为空串时不锁（空串不等于「有说明」）', () => {
  const controls = findBarControls('', 2)
  assert.equal(controls.locked, false)
  assert.equal(controls.inputsReadOnly, false)
  assert.equal(controls.togglesDisabled, false)
  assert.equal(controls.actionsDisabled, false)
})

test('未锁但 0 命中：只锁动作钮', () => {
  const controls = findBarControls(undefined, 0)
  assert.equal(controls.locked, false)
  assert.equal(controls.inputsReadOnly, false)
  assert.equal(controls.togglesDisabled, false)
  assert.equal(controls.actionsDisabled, true)
})

test('未锁且有命中：什么都不锁', () => {
  const controls = findBarControls(undefined, 1)
  assert.deepEqual(controls, {
    locked: false,
    actionsDisabled: false,
    inputsReadOnly: false,
    togglesDisabled: false,
  })
})

test('说明文字的 id 稳定（输入框 aria-describedby 指着它）', () => {
  assert.equal(FIND_NOTE_ID, 'find-locked-note')
})

test('替换提示：1 / 3 处成功，0 与负数为没有可替换的匹配', () => {
  assert.equal(replaceNoticeText(1), '替换了 1 处')
  assert.equal(replaceNoticeText(3), '替换了 3 处')
  assert.equal(replaceNoticeText(0), '没有可替换的匹配')
  assert.equal(replaceNoticeText(-1), '没有可替换的匹配')
})
