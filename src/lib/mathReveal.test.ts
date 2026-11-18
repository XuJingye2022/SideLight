import assert from 'node:assert/strict'
import test from 'node:test'

import { Schema } from '@tiptap/pm/model'
import { EditorState, NodeSelection, TextSelection } from '@tiptap/pm/state'

import {
  collectMathRanges,
  createRangeRevealPlugin,
  decorateMathReveal,
  mathRevealKey,
  mathTouchesTransaction,
  revealIndexes,
} from './mathReveal.ts'

const schema = new Schema({
  nodes: {
    doc: { content: 'block+' },
    paragraph: { content: 'inline*', group: 'block' },
    text: { group: 'inline' },
    inlineMath: { attrs: { latex: { default: '' } }, group: 'inline', inline: true, atom: true },
    blockMath: { attrs: { latex: { default: '' } }, group: 'block', atom: true },
  },
})

const para = (text: string) => schema.node('paragraph', null, text ? [schema.text(text)] : [])
const inlineMath = (latex: string) => schema.node('inlineMath', { latex })

/** 行内 `$\alpha$` 在前段、块级 `$$\beta$$` 在后、尾段在最后 */
const mathDoc = () =>
  schema.node('doc', null, [schema.node('paragraph', null, [schema.text('前 '), inlineMath('\\alpha')]), schema.node('blockMath', { latex: '\\beta' }), para('尾段')])

const plugin = () => createRangeRevealPlugin({
  key: mathRevealKey,
  scan: collectMathRanges,
  decorate: decorateMathReveal,
  touches: mathTouchesTransaction,
})

test('collectMathRanges：行内与块级公式都收进来，区间覆盖 atom 的那一个位置', () => {
  const doc = mathDoc()
  const ranges = collectMathRanges(doc)
  assert.equal(ranges.length, 2)
  assert.deepEqual(ranges.map((range) => range.type), ['inlineMath', 'blockMath'])
  for (const range of ranges) {
    assert.equal(range.to - range.from, 1)
    assert.equal(doc.nodeAt(range.from)?.type.name, range.type)
  }
  // 行内公式在「前 」之后：段落内容从 1 起，两个汉字占 2 → 3
  assert.equal(ranges[0].from, 3)
})

test('revealIndexes：选中公式露一处，选区在正文里一处不露', () => {
  const ranges = collectMathRanges(mathDoc())
  assert.deepEqual(revealIndexes(ranges, 3, 4), [0])
  assert.deepEqual(revealIndexes(ranges, 5, 6), [1])
  assert.deepEqual(revealIndexes(ranges, 1, 2), [])
  // 整篇选区（0..文末）把两处都算上
  assert.deepEqual(revealIndexes(ranges, 0, 7), [0, 1])
})

test('同一文档换选区 10 次：DecorationSet 是同一个引用（不重建）', () => {
  const state0 = EditorState.create({ schema, doc: mathDoc(), plugins: [plugin()] })
  const first = mathRevealKey.getState(state0)
  assert.ok(first)
  assert.equal(first.builds, 1)
  let state = state0
  for (let round = 0; round < 10; round += 1) {
    // 1 与 2 都在「前 」里，都不碰公式：显隐集合不变
    state = state.apply(state.tr.setSelection(TextSelection.create(state.doc, 1 + (round % 2))))
    const current = mathRevealKey.getState(state)
    assert.ok(current)
    assert.equal(current.set, first.set)
    assert.equal(current.builds, 1)
  }
})

test('NodeSelection 选中公式露类，移开撤掉；成品 DOM 不参与（装饰只挂 NodeView 外层）', () => {
  const doc = mathDoc()
  const ranges = collectMathRanges(doc)
  let state = EditorState.create({ schema, doc, plugins: [plugin()] })
  state = state.apply(state.tr.setSelection(NodeSelection.create(state.doc, ranges[0].from)))
  let current = mathRevealKey.getState(state)
  assert.ok(current)
  assert.deepEqual(current.revealed, [0])
  const found = current.set.find()
  assert.equal(found.length, 1)
  assert.equal(found[0].from, ranges[0].from)
  assert.equal(found[0].to, ranges[0].to)
  assert.deepEqual((found[0] as unknown as { type: { attrs: Record<string, unknown> } }).type.attrs, { class: 'sl-math-reveal' })
  // 移回正文：类撤掉，回到同一个空集
  state = state.apply(state.tr.setSelection(TextSelection.create(state.doc, 1)))
  current = mathRevealKey.getState(state)
  assert.ok(current)
  assert.deepEqual(current.revealed, [])
  assert.equal(current.set.find().length, 0)
})

test('非公式编辑只映射位置（不重扫）；插入公式才重扫', () => {
  let state = EditorState.create({ schema, doc: mathDoc(), plugins: [plugin()] })
  const before = mathRevealKey.getState(state)
  assert.ok(before)
  // 段首插一个字：公式整体后移 1，builds 不变
  state = state.apply(state.tr.insertText('x', 1))
  const afterText = mathRevealKey.getState(state)
  assert.ok(afterText)
  assert.equal(afterText.builds, before.builds)
  assert.equal(afterText.ranges[0].from, before.ranges[0].from + 1)
  assert.equal(afterText.ranges[1].from, before.ranges[1].from + 1)
  // 新插一个行内公式：重扫并收进来
  const pos = afterText.ranges[0].from
  state = state.apply(state.tr.replaceWith(pos, pos, inlineMath('\\gamma')))
  const afterMath = mathRevealKey.getState(state)
  assert.ok(afterMath)
  assert.equal(afterMath.builds, before.builds + 1)
  assert.equal(afterMath.ranges.length, 3)
})
