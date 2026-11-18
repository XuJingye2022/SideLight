import assert from 'node:assert/strict'
import test from 'node:test'

import { Schema } from '@tiptap/pm/model'
import { EditorState } from '@tiptap/pm/state'

import { buildTocDecorations, createTocPlugin } from './tocRender.ts'

/** 直接测纯函数 buildTocDecorations：不建 Editor、不碰 DOM（widget 的 DOM 只在视图挂载时才生成） */
const schema = new Schema({
  nodes: {
    doc: { content: 'block+' },
    paragraph: { content: 'inline*', group: 'block' },
    heading: { attrs: { level: { default: 1 } }, content: 'inline*', group: 'block' },
    text: { group: 'inline' },
  },
})

const para = (text: string) => schema.node('paragraph', null, text ? [schema.text(text)] : [])
const heading = (level: number, text: string) => schema.node('heading', { level }, text ? [schema.text(text)] : [])
const withToc = (...headings: string[]) =>
  schema.node('doc', null, [...headings.map((text, index) => heading(index + 1, text)), para('[TOC]')])

/** set 里现在混着「按钮 widget」与「标记段隐藏类」两种装饰：widget 的 spec 有 key，节点装饰没有 */
const widgets = (result: { set: ReturnType<typeof buildTocDecorations>['set'] }) =>
  result.set.find().filter((item) => item.spec?.key !== undefined)

test('一个 [TOC] 段落挂一个 widget，键带位置与标题签名', () => {
  const doc = withToc('一', '二')
  const result = buildTocDecorations(doc)
  assert.equal(result.active, true)
  const found = widgets(result)
  assert.equal(found.length, 1)
  // 两个标题（3 + 3）之后是 TOC 段落
  assert.equal(found[0].from, 6)
  assert.equal(found[0].to, 6)
  assert.match(String(found[0].spec.key), /^toc@6-1:一\|2:二$/)
})

test('标题文字变了键就变（不然 ProseMirror 会复用旧 DOM）', () => {
  const before = widgets(buildTocDecorations(withToc('旧标题')))[0].spec.key
  const after = widgets(buildTocDecorations(withToc('新标题')))[0].spec.key
  assert.notEqual(before, after)
})

test('同一文档两个 [TOC] 各自一个 widget，键不撞', () => {
  const doc = schema.node('doc', null, [heading(1, '一'), para('[TOC]'), para('[TOC]')])
  const found = widgets(buildTocDecorations(doc))
  assert.equal(found.length, 2)
  assert.equal(new Set(found.map((item) => item.spec.key)).size, 2)
})

test('原文只有转义写法 \\[TOC\\] 时不挂目录（plan-review R2）', () => {
  const doc = withToc('一')
  const escaped = buildTocDecorations(doc, { original: '\\[TOC\\]\n' })
  assert.equal(escaped.active, false)
  // 转义写法也不隐藏那一行：隐藏了字面文本就看不见了（第 61 轮 B2）
  assert.equal(escaped.sources.length, 0)
  assert.equal(buildTocDecorations(doc, { original: '[TOC]\n' }).active, true)
  // 新建文档没有原文：照常挂
  assert.equal(buildTocDecorations(doc, { original: null }).active, true)
  // 第 62 轮 B-133：原文没有 `[TOC]`、手打的标记照样当场挂
  assert.equal(buildTocDecorations(doc, { original: '# 一\n\n正文\n' }).active, true)
  // 第 62 轮 B-132：软换行段落里夹的 `[TOC]` 不算标记段
  const soft = buildTocDecorations(schema.node('doc', null, [heading(1, '一'), para('a\n[TOC]\nb')]))
  assert.equal(soft.active, false)
  assert.equal(soft.sources.length, 0)
})

test('没有 [TOC] 段落或没有标题时不挂', () => {
  assert.equal(buildTocDecorations(schema.node('doc', null, [heading(1, '一'), para('正文')])).active, false)
  assert.equal(buildTocDecorations(schema.node('doc', null, [para('[TOC]')])).active, false)
})

test('标记段挂 toc-source 节点装饰，光标在段内才加 is-revealed（第 61 轮 B2）', () => {
  const doc = withToc('一')
  // 段落位置 3..10（heading 3 + paragraph 7）
  const away = buildTocDecorations(doc)
  assert.deepEqual(away.sources, [{ from: 3, to: 10 }])
  assert.equal(away.revealed, -1)
  const near = buildTocDecorations(doc, { selection: EditorState.create({ schema, doc }).selection })
  // 默认选区在文首（heading 里），不在标记段
  assert.equal(near.revealed, -1)
})

// ---------- 第 61 轮 B1：逐键按事务判定重建 ----------

test('resync meta 没有 docChanged 也重建（停笔 300 ms 的兜底路径）', () => {
  const plugin = createTocPlugin({ onJump: () => {} })
  const doc = withToc('一')
  let state = EditorState.create({ schema, doc, plugins: [plugin] })
  const first = plugin.getState(state)
  assert.ok(first)
  assert.equal(first.builds, 1)
  // 没有改动、只有 meta：也要重扫一遍（正文变标题靠这条路进目录）
  state = state.apply(state.tr.setMeta(plugin, { resync: true }))
  const second = plugin.getState(state)
  assert.ok(second)
  assert.equal(second.builds, 2)
  assert.notEqual(second.entries, first.entries)
})

test('正文只映射、标题才重建（事务判定）', () => {
  const plugin = createTocPlugin({ onJump: () => {} })
  // heading(3) + 正文段(4) + [TOC](7)：标记段 from=7
  const doc = schema.node('doc', null, [heading(1, '甲'), para('正文'), para('[TOC]')])
  let state = EditorState.create({ schema, doc, plugins: [plugin] })
  const before = plugin.getState(state)
  assert.ok(before)

  // 在正文段插一个字：只映射，不重建
  state = state.apply(state.tr.insertText('x', 4))
  const afterBody = plugin.getState(state)
  assert.ok(afterBody)
  assert.equal(afterBody.builds, before.builds)
  assert.equal(afterBody.entries[0].pos, 0)
  // 标记段与按钮 widget 的位置一起映射（7 → 8）
  assert.equal(afterBody.sources[0].from, 8)
  assert.equal(afterBody.widgetSet.find()[0].from, 8)
  // 正文段本身不是标题：没有待 resync 的结构改动
  assert.equal(afterBody.stale, false)

  // 改标题文字：命中缓存标题区间 → 立即重建
  state = state.apply(state.tr.insertText('改', 1))
  const afterHeading = plugin.getState(state)
  assert.ok(afterHeading)
  assert.equal(afterHeading.builds, before.builds + 1)
  assert.equal(afterHeading.entries[0].text, '改甲')
})
