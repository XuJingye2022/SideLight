import assert from 'node:assert/strict'
import test from 'node:test'

import { Schema, type Node as ProseMirrorNode } from '@tiptap/pm/model'
import { EditorState, TextSelection, type Transaction } from '@tiptap/pm/state'
import { history, undo } from '@tiptap/pm/history'

import {
  buildPairTransaction,
  collectPairs,
  commitPair,
  delimiterPairPlugin,
  type ArmedRange,
  type DelimiterPair,
} from './delimiterPair.ts'

/**
 * 第 93 轮 B1：已存定界符对后填（用户缺陷 2）。
 *
 * 输入规则的尾锚定要求「整条语法正好结束在光标处」，而用户常先把 `$$` 打好再回头填内容，
 * 收尾符一直在光标后面。这里守四件容易悄悄坏的事：
 * 1. `collectPairs` 只认「真的成对」的定界符（货币、转义、空内容、贴空白都不算）；
 * 2. armed 只认「这一次编辑碰过」的区间——载入文档、粘贴落下的对不 arm；
 * 3. 三个离开时机（光标离开 / 回车 / 失焦）各自的几何条件；
 * 4. 收尾事务一次成型：公式走 atom（光标不选中它）、mark 类只留内容。
 */

const schema = new Schema({
  nodes: {
    doc: { content: 'block+' },
    paragraph: { content: 'inline*', group: 'block' },
    text: { group: 'inline' },
    codeBlock: { content: 'text*', group: 'block', marks: '', code: true },
    inlineMath: { attrs: { latex: { default: '' } }, group: 'inline', inline: true, atom: true },
    blockMath: { attrs: { latex: { default: '' } }, group: 'block', atom: true },
  },
  marks: {
    eqHighlight: {},
    caretSup: {},
    tildeSub: {},
    code: {},
  },
})

const para = (children: readonly ProseMirrorNode[] = []) => schema.node('paragraph', null, children)
const inlineMath = (latex: string) => schema.nodes.inlineMath.create({ latex })

/** 一段文字里的全部对（doc 位置从 1 起：段落内容起点） */
const pairsOf = (text: string, options?: { inlineSyntax?: boolean }) =>
  collectPairs(text, 1, { inlineSyntax: options?.inlineSyntax })

const kinds = (text: string) => pairsOf(text).map((pair) => pair.kind)

/** 建一个带本插件的编辑器状态；默认文档是一段 `$$`，光标在末尾 */
function makeState(
  doc: ProseMirrorNode = schema.node('doc', null, [para([schema.text('$$')])]),
  plugins: ReturnType<typeof delimiterPairPlugin>[] = [],
) {
  const plugin = delimiterPairPlugin()
  const state = EditorState.create({ schema, doc, plugins: [plugin, ...plugins] })
  return { plugin, state }
}

const armedOf = (plugin: ReturnType<typeof delimiterPairPlugin>, state: EditorState): ArmedRange[] =>
  plugin.getState(state)?.armed ?? []

/** 敲一个字：没有 paste/drop 标记，按「打字」处理 */
const type = (state: EditorState, text: string, at: number) => state.apply(state.tr.insertText(text, at))

const moveTo = (state: EditorState, pos: number) =>
  state.apply(state.tr.setSelection(TextSelection.create(state.doc, pos)))

const count = (doc: ProseMirrorNode, name: string) => {
  let total = 0
  doc.descendants((node) => {
    if (node.type.name === name) total += 1
    return true
  })
  return total
}

/** 撤销一步（历史插件的命令在本仓库测试里也是这么驱动） */
const undoOnce = (from: EditorState): EditorState => {
  let next = from
  undo(from, (tr) => {
    next = next.apply(tr)
  })
  return next
}

/* ---------- collectPairs：五类定界符 ---------- */

test('① 行内公式：`$x$` 的一对，内容区间与偏移都对得上', () => {
  const [pair] = pairsOf('$x$')
  assert.equal(pair.kind, 'inlineMath')
  assert.deepEqual([pair.from, pair.to, pair.contentFrom, pair.contentTo], [1, 4, 2, 3])
  assert.equal(pair.content, 'x')
})

test('② 块级公式：整段 `$$x$$` 只出一对，内容去空白', () => {
  const pairs = pairsOf('  $$ x + y $$  ')
  assert.equal(pairs.length, 1)
  assert.equal(pairs[0].kind, 'blockMath')
  assert.equal(pairs[0].content, 'x + y')
  assert.deepEqual([pairs[0].from, pairs[0].to], [3, 14])
})

test('③ 三类快捷行内语法各出一对（`==` / `^` / `~`）', () => {
  assert.deepEqual(kinds('==高亮=='), ['eqHighlight'])
  assert.deepEqual(kinds('^上^'), ['caretSup'])
  assert.deepEqual(kinds('~下~'), ['tildeSub'])
})

test('④ 一行里多对按位置排序；混排也不串台', () => {
  const pairs = pairsOf('$a$ 与 $b$')
  assert.deepEqual(
    pairs.map((pair) => [pair.kind, pair.content]),
    [
      ['inlineMath', 'a'],
      ['inlineMath', 'b'],
    ],
  )
  assert.ok(pairs[0].from < pairs[1].from)
})

/* ---------- collectPairs：负例 ---------- */

test('⑤ 货币不是公式：`$5 到 $` 与空内容都不成对', () => {
  assert.deepEqual(pairsOf('$5 到 $'), [])
  assert.deepEqual(pairsOf('$$'), [])
  assert.deepEqual(pairsOf('$ $'), [])
})

test('⑥ 转义 `\\$x\\$` 不成对；`$$` 连续段不当行内定界符', () => {
  assert.deepEqual(pairsOf('\\$x\\$'), [])
  // `$$` 之后接的 `$x$` 仍是一对：连续段只清掉待配位，不吃后面的单 $
  const pairs = pairsOf('$$ $x$')
  assert.deepEqual(
    pairs.map((pair) => [pair.kind, pair.content]),
    [['inlineMath', 'x']],
  )
})

test('⑦ 只贴一侧空白、夹 atom 的都不算（与输入规则同一口径）', () => {
  assert.deepEqual(kinds('== a =='), [])
  assert.deepEqual(kinds('==a =='), [])
  assert.deepEqual(kinds('$a\ufffcb$'), [])
})

/* ---------- collectPairs：开关 ---------- */

test('⑧ 快捷行内语法关掉：`==x==` 不收，`$x$` 照收', () => {
  assert.deepEqual(pairsOf('==x==', { inlineSyntax: false }), [])
  assert.deepEqual(kinds('$x$').length, 1)
  assert.deepEqual(pairsOf('$x$', { inlineSyntax: false }).map((pair) => pair.kind), ['inlineMath'])
})

/* ---------- commitPair：几何与 armed ---------- */

const pair = (from: number, to: number, content = 'E=mc^2'): DelimiterPair => ({
  kind: 'inlineMath',
  from,
  to,
  contentFrom: from + 1,
  contentTo: to - 1,
  content,
})

test('⑨ leave：armed 且光标贴着区间外 ≤1 才提交', () => {
  const target = pair(1, 9)
  const armed = [{ from: 1, to: 9 }]
  assert.equal(commitPair([target], armed, 9, { trigger: 'leave', docChanged: false }), target)
  assert.equal(commitPair([target], armed, 10, { trigger: 'leave', docChanged: false }), target)
  assert.equal(commitPair([target], armed, 11, { trigger: 'leave', docChanged: false }), null)
})

test('⑩ 没 armed 的对不提交（旧稿里的字面 `$x$` 只点一下不该变公式）', () => {
  const target = pair(1, 9)
  assert.equal(commitPair([target], [], 9, { trigger: 'leave', docChanged: false }), null)
  assert.equal(commitPair([target], [{ from: 2, to: 9 }], 9, { trigger: 'leave', docChanged: false }), null)
})

test('⑪ leave 只认纯选区事务：`docChanged` 为真时跳过（打字中一律不提交）', () => {
  const target = pair(1, 9)
  const armed = [{ from: 1, to: 9 }]
  assert.equal(commitPair([target], armed, 9, { trigger: 'leave', docChanged: true }), null)
})

test('⑫ enter / blur 允许光标在内容区间内；leave 不允许', () => {
  const target = pair(1, 9)
  const armed = [{ from: 1, to: 9 }]
  assert.equal(commitPair([target], armed, 5, { trigger: 'leave', docChanged: false }), null)
  assert.equal(commitPair([target], armed, 5, { trigger: 'enter', docChanged: false }), target)
  assert.equal(commitPair([target], armed, 5, { trigger: 'blur', docChanged: false }), target)
  // 收尾定界符之后不算「对内」
  assert.equal(commitPair([target], armed, 9, { trigger: 'enter', docChanged: false }), null)
})

test('⑬ 空内容不提交：`$$` + 回车仍归 MathInputRules 建空块级公式', () => {
  const empty = pair(1, 3, '')
  assert.equal(commitPair([empty], [{ from: 1, to: 3 }], 2, { trigger: 'enter', docChanged: false }), null)
})

/* ---------- 插件状态：armed 何时成立 ---------- */

test('⑭ 打字把一对定界符补齐 → arm；光标离开就收成行内公式（一次事务）', () => {
  let { plugin, state } = makeState()
  state = moveTo(state, 2) // `$$` 里，光标在两枚 $ 之间
  assert.deepEqual(armedOf(plugin, state), [])
  state = type(state, 'E', 2) // `$E$`
  assert.deepEqual(armedOf(plugin, state), [{ from: 1, to: 4 }])
  state = moveTo(state, 4) // 光标越过收尾 $：离开
  assert.equal(count(state.doc, 'inlineMath'), 1, '离开时收成公式 atom')
  assert.equal(state.doc.childCount, 1)
  assert.equal(state.doc.firstChild?.childCount, 1, '`$E$` 三段合成一颗 atom')
  // 光标落在 atom 之后，不是选中 atom（否则 mathReveal 会继续露 `$…$`）
  assert.equal(state.selection.empty, true)
  assert.equal(state.selection.from, 2)
  assert.deepEqual(armedOf(plugin, state), [])
})

test('⑮ 载入（addToHistory:false）里的定界符对不 arm，点进去按方向键也不变', () => {
  let { plugin, state } = makeState(schema.node('doc', null, [para([schema.text('$E$')])]))
  // 模拟 setMarkdown：整篇替换 + addToHistory:false
  const load = state.tr
    .replaceWith(0, state.doc.content.size, schema.node('doc', null, [para([schema.text('$E$')])]).content)
    .setMeta('addToHistory', false) as Transaction
  state = state.apply(load)
  assert.deepEqual(armedOf(plugin, state), [])
  state = state.apply(state.tr.setSelection(TextSelection.create(state.doc, 2)))
  assert.deepEqual(armedOf(plugin, state), [])
  state = moveTo(state, 4)
  assert.equal(count(state.doc, 'inlineMath'), 0, '没 arm 的对不该被悄悄改成公式')
})

test('⑯ 粘贴 / 拖入不 arm（一次落下不是回头填内容）', () => {
  const { plugin, state } = makeState(schema.node('doc', null, [para()]))
  const pasted = state.apply(
    state.tr.insertText('$E$', 1).setMeta('uiEvent', 'paste'),
  )
  assert.equal(count(pasted.doc, 'inlineMath'), 0)
  assert.deepEqual(armedOf(plugin, pasted), [])
  // 同样的位置换成打字就 arm —— 上面的空结果不是因为位置算错
  const typed = state.apply(state.tr.insertText('$E$', 1))
  assert.deepEqual(armedOf(plugin, typed), [{ from: 1, to: 4 }])
})

test('⑰ 区间被整段替换 / 定界符被删掉 → armed 自动清掉', () => {
  let { plugin, state } = makeState()
  state = moveTo(state, 2)
  state = type(state, 'E', 2)
  assert.deepEqual(armedOf(plugin, state), [{ from: 1, to: 4 }])
  // 删掉收尾 $：现文档里没有这一对了
  state = state.apply(state.tr.delete(3, 4))
  assert.deepEqual(armedOf(plugin, state), [])
  // 整段换成别的段落：位置塌掉，也不留
  state = state.apply(state.tr.replaceWith(0, state.doc.content.size, para([schema.text('无关')])))
  assert.deepEqual(armedOf(plugin, state), [])
})

/* ---------- 插件守卫 ---------- */

test('⑱ 代码围栏里不 arm（`spec.code`）', () => {
  const { plugin, state } = makeState(
    schema.node('doc', null, [schema.node('codeBlock', null, [schema.text('$$')])]),
  )
  const typed = type(moveTo(state, 2), 'E', 2)
  assert.deepEqual(armedOf(plugin, typed), [])
  assert.equal(count(typed.doc, 'inlineMath'), 0)
})

test('⑲ 行内代码里不 arm（code mark）；光标挪到代码外也不收', () => {
  const code = schema.marks.code.create()
  const doc = schema.node('doc', null, [
    schema.node('paragraph', null, [schema.text('$$', [code]), schema.text(' 尾')]),
  ])
  const { plugin, state } = makeState(doc)
  const typed = type(moveTo(state, 2), 'E', 2)
  assert.deepEqual(armedOf(plugin, typed), [])
  // 真机实测：光标用 → 挪到代码片段外一位后 code mark 不在 `$from.marks()` 里了，
  // 只看光标会漏判；这里按「这一对的范围整体带 code mark」再挡一层。
  const outside = moveTo(typed, typed.doc.content.size)
  assert.equal(count(outside.doc, 'inlineMath'), 0)
})

test('⑳ 已是补丁事务（appendedTransaction）的选区事务不再触发判定', () => {
  let { plugin, state } = makeState()
  state = moveTo(state, 2)
  state = type(state, 'E', 2)
  // 造一个「贴着区间外、但带 appendedTransaction 标记」的选区事务
  state = state.apply(
    state.tr.setSelection(TextSelection.create(state.doc, 4)).setMeta('appendedTransaction', state.tr),
  )
  assert.equal(count(state.doc, 'inlineMath'), 0, '补丁事务里不能再嵌套一轮收尾')
})

/* ---------- 收尾结果：atom / mark / 块级整段 ---------- */

test('㉑ 块级：整段 `$$x$$` 收成一个 blockMath，原段落消失', () => {
  const { state } = makeState(schema.node('doc', null, [para([schema.text('$$')]), para([schema.text('后')])]))
  const target = collectPairs('$$x$$', 1)[0]
  const tr = buildPairTransaction(state, target)
  assert.ok(tr)
  const next = state.apply(tr)
  assert.equal(next.doc.childCount, 2)
  assert.equal(next.doc.firstChild?.type.name, 'blockMath')
  assert.equal(next.doc.firstChild?.attrs.latex, 'x')
  assert.equal(next.doc.lastChild?.textContent, '后')
  assert.equal(next.selection.empty, true, '光标落在后面的段落里，不选中 atom')
  assert.equal(next.selection.from, 2)
})

test('㉒ mark 类：`==高亮==` 收成 eqHighlight mark，定界符删干净', () => {
  const { state } = makeState(schema.node('doc', null, [para([schema.text('==高亮==')])]))
  const target = collectPairs('==高亮==', 1)[0]
  const tr = buildPairTransaction(state, target)
  assert.ok(tr)
  const next = state.apply(tr)
  assert.equal(next.doc.textContent, '高亮')
  assert.equal(next.doc.nodeAt(1)?.marks.length, 1)
  assert.equal(next.doc.nodeAt(1)?.marks[0].type.name, 'eqHighlight')
  assert.equal(next.selection.from, 3, '光标落在内容末尾')
})

test('㉓ 收尾后的 JSON 仍是原节点名与 latex：Markdown 写回契约不变', () => {
  const { state } = makeState(schema.node('doc', null, [para([schema.text('$E=mc^2$')])]))
  const tr = buildPairTransaction(state, collectPairs('$E=mc^2$', 1)[0])
  assert.ok(tr)
  const json = state.apply(tr).doc.toJSON()
  const inline = JSON.stringify(json)
  assert.ok(inline.includes('"type":"inlineMath"'))
  assert.ok(inline.includes('"latex":"E=mc^2"'))
  assert.equal(schema.nodeFromJSON(json).firstChild?.childCount, 1)
})

test('㉔ 撤销：收尾事务独立成一步，一次 Ctrl+Z 只回字面定界符', () => {
  let { state } = makeState(undefined, [history()])
  state = moveTo(state, 2)
  state = type(state, 'E', 2)
  state = moveTo(state, 4) // 离开出口：补丁事务由 appendTransaction 返回
  assert.equal(count(state.doc, 'inlineMath'), 1)
  const one = undoOnce(state)
  assert.equal(count(one.doc, 'inlineMath'), 0, '撤销后公式 atom 不残留')
  // 早先这里只断言 `includes('$')`：补丁事务并进打字事件时，一次撤销把 `$E$` 整段撤光、
  // 退回初始的 `$$` 也含 `$`，断言照样成立 —— 正是第 93 轮 tester 真机抓到的那条失败。
  assert.equal(one.doc.textContent, '$E$', '一次 Ctrl+Z 只撤收尾事务，回到字面 `$E$`')
  const two = undoOnce(one)
  assert.equal(two.doc.textContent, '$$', '再撤一次才撤掉打的字')
})

test('㉖ mark 类收尾同样独立成一步撤销：一次 Ctrl+Z 回到 `==高亮==`', () => {
  let { state } = makeState(schema.node('doc', null, [para()]), [history()])
  state = type(state, '====', 1)
  state = moveTo(state, 3)
  state = type(state, '高亮', 3)
  state = moveTo(state, 7) // 离开出口
  assert.equal(state.doc.textContent, '高亮')
  assert.equal(state.doc.nodeAt(1)?.marks[0]?.type.name, 'eqHighlight')
  const one = undoOnce(state)
  assert.equal(one.doc.textContent, '==高亮==', '一次 Ctrl+Z 只撤收尾事务')
  assert.equal(one.doc.nodeAt(1)?.marks.length, 0, 'mark 也一起撤掉')
  const two = undoOnce(one)
  assert.equal(two.doc.textContent, '', '再撤一次才撤掉打的字（初始是空段落）')
})

test('㉗ 撤销不重新武装：还原的字面定界符不会被下一条装饰事务又收成公式', () => {
  let { plugin, state } = makeState(undefined, [history()])
  state = moveTo(state, 2)
  state = type(state, 'E', 2)
  state = moveTo(state, 4)
  assert.equal(count(state.doc, 'inlineMath'), 1)
  state = undoOnce(state)
  assert.equal(state.doc.textContent, '$E$')
  // 第 93 轮返修真机：撤销事务若按「插入即 arm」，紧接着 App 派发的
  // `addToHistory:false` 纯选区装饰事务（`decorations.ts:40`）会把它又收成公式。
  assert.deepEqual(armedOf(plugin, state), [], '撤销事务不再 arm')
  state = state.apply(state.tr.setMeta('addToHistory', false))
  assert.equal(count(state.doc, 'inlineMath'), 0, '撤销后的字面定界符保持字面')
  assert.equal(state.doc.textContent, '$E$')
})

test('㉕ 每次重渲染派发的装饰事务（addToHistory:false、无步骤）不清掉 armed', () => {
  // 真机实测：App 每次 React 渲染都会用 addToHistory:false 派发纯选区装饰事务
  //（src/lib/decorations.ts:35 的 renderFocus / renderFind 链）。早先「见到 addToHistory:false
  // 就清空」的口径把它当成载入，arm 完立刻被清，真机 0 转换。
  let { plugin, state } = makeState()
  state = moveTo(state, 2)
  state = type(state, 'E', 2)
  assert.deepEqual(armedOf(plugin, state), [{ from: 1, to: 4 }])
  const decorated = state.apply(state.tr.setMeta('addToHistory', false))
  assert.equal(decorated.doc.eq(state.doc), true)
  assert.deepEqual(armedOf(plugin, decorated), [{ from: 1, to: 4 }], '装饰事务之后 armed 还在')
  // 载入那种「真改了正文」的 addToHistory:false 事务仍然清空
  const loaded = state.apply(
    state.tr.replaceWith(0, state.doc.content.size, para([schema.text('$E$')])).setMeta('addToHistory', false),
  )
  assert.deepEqual(armedOf(plugin, loaded), [])
})
