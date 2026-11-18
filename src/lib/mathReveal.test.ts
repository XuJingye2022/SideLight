import assert from 'node:assert/strict'
import test from 'node:test'

import { Schema } from '@tiptap/pm/model'
import { EditorState, NodeSelection, TextSelection } from '@tiptap/pm/state'

import {
  collectEqRanges,
  collectMathRanges,
  createRangeRevealPlugin,
  decorateEqReveal,
  decorateMathReveal,
  eqRevealKey,
  eqTouchesTransaction,
  mathRevealKey,
  mathTouchesTransaction,
  revealIndexes,
  revealIndexesTouching,
} from './mathReveal.ts'

const schema = new Schema({
  nodes: {
    doc: { content: 'block+' },
    paragraph: { content: 'inline*', group: 'block' },
    text: { group: 'inline' },
    inlineMath: { attrs: { latex: { default: '' } }, group: 'inline', inline: true, atom: true },
    blockMath: { attrs: { latex: { default: '' } }, group: 'block', atom: true },
  },
  marks: {
    eqHighlight: {},
    strong: {},
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

/* ── `==高亮==` 定界符露出（第 74 轮 B2）──────────────────────────────── */

const eqMark = schema.marks.eqHighlight.create()

/** 段落「前 ==高亮== 后」：高亮区间 3..5，文字是「高亮」 */
const eqDoc = () =>
  schema.node('doc', null, [
    schema.node('paragraph', null, [schema.text('前 '), schema.text('高亮', [eqMark]), schema.text(' 后')]),
  ])

const eqPlugin = () =>
  createRangeRevealPlugin({
    key: eqRevealKey,
    scan: collectEqRanges,
    decorate: decorateEqReveal,
    touches: eqTouchesTransaction,
    hit: revealIndexesTouching,
  })

test('collectEqRanges：高亮 mark 的连续区间合并，没 mark 的文字不收', () => {
  const ranges = collectEqRanges(eqDoc())
  assert.equal(ranges.length, 1)
  assert.deepEqual(ranges[0], { from: 3, to: 5, type: 'eqHighlight' })
  // 中间夹了别的 mark（等价于 ==a**b**c==）也仍是一段
  const split = schema.node('doc', null, [
    schema.node('paragraph', null, [
      schema.text('a', [eqMark]),
      schema.text('b', [eqMark, schema.marks.strong.create()]),
      schema.text('c', [eqMark]),
    ]),
  ])
  const merged = collectEqRanges(split)
  assert.equal(merged.length, 1)
  assert.equal(merged[0].to - merged[0].from, 3)
})

test('revealIndexesTouching：光标贴两端也算进入，隔一个字就收回', () => {
  const ranges = collectEqRanges(eqDoc())
  assert.deepEqual(revealIndexesTouching(ranges, 4, 4), [0]) // 区间里
  assert.deepEqual(revealIndexesTouching(ranges, 3, 3), [0]) // 起点
  assert.deepEqual(revealIndexesTouching(ranges, 5, 5), [0]) // 末端（B2 验收）
  assert.deepEqual(revealIndexesTouching(ranges, 2, 2), []) // 前一个字
  assert.deepEqual(revealIndexesTouching(ranges, 6, 6), []) // 后一个字
  // 公式那套「只认相交」的判定不变：空选区贴边仍是 0
  assert.deepEqual(revealIndexes(ranges, 3, 3), [])
})

test('eq 插件：光标进高亮画两枚定界符 widget（前后各一），贴末端仍露，移开归零', () => {
  let state = EditorState.create({ schema, doc: eqDoc(), plugins: [eqPlugin()] })
  const away = eqRevealKey.getState(state)
  assert.ok(away)
  assert.deepEqual(away.revealed, [])
  state = state.apply(state.tr.setSelection(TextSelection.create(state.doc, 3)))
  const current = eqRevealKey.getState(state)
  assert.ok(current)
  assert.deepEqual(current.revealed, [0])
  const found = current.set.find()
  assert.equal(found.length, 2, '第 79 轮 B-161：一个高亮区间恰两枚定界符（旧实现是 1 条行内装饰）')
  const shape = (decoration: (typeof found)[number]) => ({
    from: decoration.from,
    to: decoration.to,
    side: (decoration as unknown as { type: { side: number } }).type.side,
    widget: (decoration as unknown as { widget: boolean }).widget,
  })
  // 区间 3..5：起点一枚 side −1、终点一枚 side +1；widget 的 from 与 to 相同
  assert.deepEqual(found.map(shape), [
    { from: 3, to: 3, side: -1, widget: true },
    { from: 5, to: 5, side: 1, widget: true },
  ])
  state = state.apply(state.tr.setSelection(TextSelection.create(state.doc, 5)))
  assert.deepEqual(eqRevealKey.getState(state)?.revealed, [0])
  state = state.apply(state.tr.setSelection(TextSelection.create(state.doc, 6)))
  const awayAgain = eqRevealKey.getState(state)
  assert.ok(awayAgain)
  assert.deepEqual(awayAgain.revealed, [])
  assert.equal(awayAgain.set.find().length, 0)
})

test('`==a**b**c==`（三个文本节点同一区间）仍只画 2 枚 widget —— 第 79 轮 B-161', () => {
  const split = schema.node('doc', null, [
    schema.node('paragraph', null, [
      schema.text('a', [eqMark]),
      schema.text('b', [eqMark, schema.marks.strong.create()]),
      schema.text('c', [eqMark]),
    ]),
  ])
  const ranges = collectEqRanges(split)
  assert.equal(ranges.length, 1)
  assert.equal(ranges[0].to - ranges[0].from, 3)
  let state = EditorState.create({ schema, doc: split, plugins: [eqPlugin()] })
  state = state.apply(state.tr.setSelection(TextSelection.create(state.doc, 2)))
  const current = eqRevealKey.getState(state)
  assert.ok(current)
  assert.deepEqual(current.revealed, [0])
  const found = current.set.find()
  assert.equal(found.length, 2, '三个文本节点也只该有两枚定界符：inline 装饰会让伪元素逐 span 重画')
  assert.deepEqual(
    found.map((decoration) => ({
      from: decoration.from,
      side: (decoration as unknown as { type: { side: number } }).type.side,
    })),
    [
      { from: 1, side: -1 },
      { from: 4, side: 1 },
    ],
  )
})

test('eq 插件：区间里插字重扫并收进来，区外插字只映射（不重扫）', () => {
  let state = EditorState.create({ schema, doc: eqDoc(), plugins: [eqPlugin()] })
  state = state.apply(state.tr.setSelection(TextSelection.create(state.doc, 4)))
  const selected = eqRevealKey.getState(state)
  assert.ok(selected)
  assert.equal(selected.builds, 1) // 换选区不重扫，只有 init 那一次
  // 区间里插入带 mark 的字（打字继承 mark 的等价形状）
  state = state.apply(state.tr.replaceWith(4, 4, schema.text('x', [eqMark])))
  const grown = eqRevealKey.getState(state)
  assert.ok(grown)
  assert.equal(grown.builds, selected.builds + 1)
  assert.equal(grown.ranges[0].to - grown.ranges[0].from, 3)
  assert.equal(state.doc.textBetween(grown.ranges[0].from, grown.ranges[0].to), '高x亮')
  // 区外插字：不重扫，区间整体后移 1
  state = state.apply(state.tr.insertText('y', 1))
  const shifted = eqRevealKey.getState(state)
  assert.ok(shifted)
  assert.equal(shifted.builds, grown.builds)
  assert.equal(shifted.ranges[0].from, grown.ranges[0].from + 1)
})
