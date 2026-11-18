import assert from 'node:assert/strict'
import test from 'node:test'

import { Schema, type Node as ProseMirrorNode } from '@tiptap/pm/model'
import { EditorState, NodeSelection, TextSelection } from '@tiptap/pm/state'

import { closeMathEditTransaction, mathInputSelection } from './mathInput.ts'
import {
  collectMathRanges,
  createRangeRevealPlugin,
  decorateMathReveal,
  mathRevealKey,
  mathTouchesTransaction,
} from './mathReveal.ts'

/**
 * 第 75 轮 A1（B-157）：点开公式编辑再取消，光标停在 atom 上是 NodeSelection，
 * mathReveal 于是继续画 `$…$` / `$$…$$`。两个出口（`mathInputSelection` 落点、
 * `closeMathEditTransaction` 关编辑器）都必须把光标放到 atom 外面。
 * 这里用 state 层验证，浏览器项另记 UNVERIFIED（CDP 9222–9226 不可用）。
 */

const schema = new Schema({
  nodes: {
    doc: { content: 'block+' },
    paragraph: { content: 'inline*', group: 'block' },
    text: { group: 'inline' },
    inlineMath: { attrs: { latex: { default: '' } }, group: 'inline', inline: true, atom: true },
    blockMath: { attrs: { latex: { default: '' } }, group: 'block', atom: true },
  },
  marks: {},
})

/** 与 App 挂的是同一个插件形状（mathReveal.ts 的工厂默认判定） */
const plugin = () =>
  createRangeRevealPlugin({
    key: mathRevealKey,
    scan: collectMathRanges,
    decorate: decorateMathReveal,
    touches: mathTouchesTransaction,
  })

const revealed = (state: EditorState) => mathRevealKey.getState(state)?.revealed ?? null
const para = (children: readonly ProseMirrorNode[] = []) => schema.node('paragraph', null, children)
const inlineMath = (latex: string) => schema.nodes.inlineMath.create({ latex })
const blockMath = (latex: string) => schema.node('blockMath', { latex })

test('① mathInputSelection：`ab$x^2$` 换成 atom 后落在 4，公式不露源码', () => {
  // 真实链路：光标在 7，敲 `$` 后输入规则把 [3,8) 换成行内 atom
  const base = EditorState.create({ schema, doc: schema.node('doc', null, [para([schema.text('ab$x^2')])]), plugins: [plugin()] })
  const tr = base.tr
    .setSelection(TextSelection.create(base.doc, 7))
    .insertText('$', 7, 7)
    .replaceWith(3, 8, inlineMath('x^2'))
  const selection = mathInputSelection(tr.doc, 3)
  assert.ok(selection instanceof TextSelection, '落点必须是文本光标，不能选中 atom')
  assert.equal(selection.from, 4)
  assert.equal(selection.to, 4)
  tr.setSelection(selection)
  const next = base.apply(tr)
  assert.deepEqual(collectMathRanges(next.doc).map((range) => [range.from, range.to]), [[3, 4]])
  assert.deepEqual(revealed(next), [])
})

test('② 选中过的行内公式取消编辑：光标落到公式后面，不再露 $…$', () => {
  const doc = schema.node('doc', null, [para([schema.text('前 '), inlineMath('\\alpha'), schema.text(' 后')])])
  let state = EditorState.create({ schema, doc, plugins: [plugin()] })
  const from = collectMathRanges(state.doc)[0].from
  state = state.apply(state.tr.setSelection(NodeSelection.create(state.doc, from)))
  assert.deepEqual(revealed(state), [0], '前置条件：NodeSelection 在 atom 上时已露源码')

  state = state.apply(closeMathEditTransaction(state, { from, to: from + 1, remove: false }))
  assert.deepEqual(revealed(state), [])
  assert.equal(state.selection.empty, true)
  assert.equal(state.selection.from, from + 1, '取消后光标在公式后面，接着打字不会插进公式前')
  assert.equal(state.doc.childCount, 1, '取消不删已有公式')
})

test('③ 取消新建的行内公式：删掉 atom，光标在删点 from，不露源码', () => {
  const doc = schema.node('doc', null, [para([schema.text('前 '), inlineMath(''), schema.text(' 后')])])
  let state = EditorState.create({ schema, doc, plugins: [plugin()] })
  const from = collectMathRanges(state.doc)[0].from
  state = state.apply(state.tr.setSelection(NodeSelection.create(state.doc, from)))
  assert.deepEqual(revealed(state), [0])

  state = state.apply(closeMathEditTransaction(state, { from, to: from + 1, remove: true }))
  assert.equal(collectMathRanges(state.doc).length, 0, '新建后取消要删掉这条公式')
  assert.equal(state.selection.from, from)
  assert.notEqual(state.doc.nodeAt(from)?.type.name, 'inlineMath')
  assert.deepEqual(revealed(state), [])
})

test('④ 块级公式取消编辑：落点不盖住 atom（[2,3)）', () => {
  // 空段落 + 块级公式：atom 正好占 [2,3)
  const doc = schema.node('doc', null, [para(), blockMath('x')])
  let state = EditorState.create({ schema, doc, plugins: [plugin()] })
  const range = collectMathRanges(state.doc)[0]
  assert.deepEqual([range.from, range.to], [2, 3])
  state = state.apply(state.tr.setSelection(NodeSelection.create(state.doc, range.from)))
  assert.deepEqual(revealed(state), [0])

  state = state.apply(closeMathEditTransaction(state, { from: range.from, to: range.to, remove: false }))
  assert.deepEqual(revealed(state), [])
  assert.equal(state.selection.from < range.to && state.selection.to > range.from, false, '落点与 blockMath [2,3) 相交')
})

test('⑤ 文末 / 整篇唯一块级公式：夹到 content.size、不抛', () => {
  // 文末块级公式：向后落会退回 NodeSelection（critic 实测），必须改向前落
  const docEnd = schema.node('doc', null, [para([schema.text('前')]), blockMath('x')])
  let state = EditorState.create({ schema, doc: docEnd, plugins: [plugin()] })
  const range = collectMathRanges(state.doc)[0]
  assert.deepEqual([range.from, range.to], [3, 4])
  state = state.apply(state.tr.setSelection(NodeSelection.create(state.doc, range.from)))
  assert.deepEqual(revealed(state), [0])

  // to 故意给越界值：落点要夹到 content.size，不能抛
  const tr = closeMathEditTransaction(state, { from: range.from, to: 99, remove: false })
  state = state.apply(tr)
  assert.deepEqual(revealed(state), [])
  assert.equal(state.selection instanceof NodeSelection, false, '文末 keep 不能退成 NodeSelection')
  assert.ok(state.selection.from <= state.doc.content.size)

  // 整篇只有一条块级公式：没有文本位置可落，退回 NodeSelection（已知退化，不插空段改正文）；
  // 但「新建后取消」这条路仍能恢复成文本光标（删除由 ProseMirror 补一个空段落）
  const onlyDoc = schema.node('doc', null, [blockMath('x')])
  let single = EditorState.create({ schema, doc: onlyDoc, plugins: [plugin()] })
  single = single.apply(single.tr.setSelection(NodeSelection.create(single.doc, 0)))
  assert.deepEqual(revealed(single), [0])
  single = single.apply(closeMathEditTransaction(single, { from: 0, to: 1, remove: false }))
  assert.equal(single.doc.childCount, 1)
  assert.equal(single.doc.firstChild?.type.name, 'blockMath')
  assert.deepEqual(revealed(single), [0], '唯一块级公式的 keep 是已知退化：仍露 $$…$$')

  let removed = EditorState.create({ schema, doc: onlyDoc, plugins: [plugin()] })
  removed = removed.apply(removed.tr.setSelection(NodeSelection.create(removed.doc, 0)))
  removed = removed.apply(closeMathEditTransaction(removed, { from: 0, to: 1, remove: true }))
  assert.equal(removed.doc.childCount, 1)
  assert.notEqual(removed.doc.firstChild?.type.name, 'blockMath')
  assert.equal(removed.selection instanceof NodeSelection, false)
  assert.deepEqual(revealed(removed), [])
})
