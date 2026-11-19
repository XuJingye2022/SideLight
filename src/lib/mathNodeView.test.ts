import assert from 'node:assert/strict'
import test from 'node:test'

import { SidelightInlineMath, enterMathEdit, registerMathEditor } from './mathNodeView.ts'

/**
 * 第 90 轮 A1：行内公式就地编辑（用户反馈 #1）的纯逻辑单测。
 * NodeView 的 DOM 行为只能真机验（ego 浏览器；CDP 9222–9226 不可用），这里守住三件容易悄悄坏的事：
 * 扩展覆盖没改序列化契约、插入入口靠 DOM 注册表找 NodeView、注册表按 DOM 分流不串台。
 */

/* ---------- 1. 覆盖 NodeView 不改 schema 名与 Markdown 写回 ---------- */

test('就地编辑的扩展仍叫 inlineMath，Markdown 写回仍是 $latex$', () => {
  assert.equal(SidelightInlineMath.name, 'inlineMath')
  const renderMarkdown = SidelightInlineMath.config.renderMarkdown as
    | ((node: { attrs: Record<string, unknown> }) => string)
    | undefined
  assert.equal(typeof renderMarkdown, 'function')
  assert.equal(renderMarkdown?.({ attrs: { latex: 'x^2' } }), '$x^2$')
  // 空 latex 的写回形状是上游约定（`$$`，由 repair 链还原），不要因为换了 NodeView 而变
  assert.equal(renderMarkdown?.({ attrs: { latex: '' } }), '$$')
})

/* ---------- 2. 入口找不到 NodeView 时返回 false，不抛 ---------- */

test('enterMathEdit 对没有登记的位置返回 false（越界 pos 也不抛）', () => {
  // nodeDOM 返回 null（位置不是节点）、返回陌生 DOM（不是公式 NodeView）、抛错（越界）三种都不该进编辑
  assert.equal(enterMathEdit({ nodeDOM: () => null } as never, 3, { isNew: true }), false)
  assert.equal(enterMathEdit({ nodeDOM: () => ({}) } as never, 3), false)
  assert.equal(
    enterMathEdit(
      {
        nodeDOM: () => {
          throw new RangeError('no node')
        },
      } as never,
      3,
    ),
    false,
  )
})

/* ---------- 3. 注册表按 DOM 分流，isNew 透传 ---------- */

test('enterMathEdit 用 view.nodeDOM 找到登记表，按 isNew 调 enter，两个公式不串台', () => {
  const first: boolean[] = []
  const second: boolean[] = []
  const domA = {}
  const domB = {}
  registerMathEditor(domA, { enter: (isNew) => first.push(isNew) })
  registerMathEditor(domB, { enter: (isNew) => second.push(isNew) })

  assert.equal(enterMathEdit({ nodeDOM: () => domA } as never, 0, { isNew: true }), true)
  assert.equal(enterMathEdit({ nodeDOM: () => domB } as never, 0), true)
  assert.equal(enterMathEdit({ nodeDOM: () => domA } as never, 0, { isNew: false }), true)
  assert.deepEqual(first, [true, false])
  assert.deepEqual(second, [false])
})
