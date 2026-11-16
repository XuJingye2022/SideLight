import assert from 'node:assert/strict'
import test from 'node:test'

import { getSchema, type JSONContent } from '@tiptap/core'
import { StarterKit } from '@tiptap/starter-kit'

import { activeOutlineId, extractOutline } from './outline.ts'
import { buildOutlineTree, expandAncestors, visibleActiveId } from './outlineTree.ts'

const schema = getSchema([StarterKit])

function heading(level: number, text: string): JSONContent {
  return { type: 'heading', attrs: { level }, content: [{ type: 'text', text }] }
}

function paragraph(text: string): JSONContent {
  return { type: 'paragraph', content: [{ type: 'text', text }] }
}

function makeDoc(content: JSONContent[]) {
  return schema.nodeFromJSON({ type: 'doc', content })
}

/** 三节，层级 1-2-3，中间夹正文 */
const doc = makeDoc([
  heading(1, '第一章 起'),
  paragraph('正文一。'),
  heading(2, '  第一节 承  '),
  paragraph('正文二。'),
  heading(3, '小节 转'),
])

/** 正文开头，第一个标题不在 0 位置；两节位置是 6 与 17 */
const sectionsDoc = makeDoc([
  paragraph('开场白。'),
  heading(2, '上篇'),
  paragraph('上篇正文。'),
  heading(2, '下篇'),
  paragraph('下篇正文。'),
])

/** 引用里也放一个标题，它不是章节起点 */
const quotedDoc = makeDoc([
  heading(1, '章首'),
  {
    type: 'blockquote',
    content: [heading(2, '引文里的标题'), paragraph('引用内容。')],
  },
  heading(2, '章末'),
])

/* ---------- 取大纲 ---------- */

test('多个标题按文档顺序给出层级与起始位置', () => {
  const items = extractOutline(doc)

  assert.deepEqual(items, [
    { id: 'h-0', level: 1, text: '第一章 起', pos: 0 },
    { id: 'h-13', level: 2, text: '第一节 承', pos: 13 },
    { id: 'h-30', level: 3, text: '小节 转', pos: 30 },
  ])

  // pos 是标题节点的起点，不是文本下标：+1 才是标题文字的第一个字
  assert.equal(doc.nodeAt(30)?.type.name, 'heading')
  assert.equal(doc.textBetween(31, 36), '小节 转')
})

test('没有标题的文档给出空大纲', () => {
  const plain = makeDoc([paragraph('只有正文。'), paragraph('还是没有标题。')])

  assert.deepEqual(extractOutline(plain), [])
  assert.equal(activeOutlineId([], 3), null)
})

test('标题文字去掉首尾空白', () => {
  const spaced = makeDoc([heading(1, '  为什么要写  '), heading(2, '\u3000好文\u3000')])

  assert.deepEqual(
    extractOutline(spaced).map((item) => item.text),
    ['为什么要写', '好文'],
  )
})

test('引用里的标题不被收录', () => {
  // 引用里确实有一个 heading，但它埋在 blockquote 里
  assert.equal(quotedDoc.child(1).type.name, 'blockquote')
  assert.equal(quotedDoc.child(1).child(0).type.name, 'heading')

  const items = extractOutline(quotedDoc)

  assert.deepEqual(
    items.map((item) => [item.id, item.level, item.text, item.pos]),
    [
      ['h-0', 1, '章首', 0],
      ['h-21', 2, '章末', 21],
    ],
  )
})

/* ---------- 光标落在哪一节 ---------- */

test('光标在第一个标题之前时算第一节', () => {
  const items = extractOutline(sectionsDoc)
  assert.deepEqual(
    items.map((item) => item.pos),
    [6, 17],
  )

  assert.equal(activeOutlineId(items, 0), 'h-6')
  assert.equal(activeOutlineId(items, 3), 'h-6')
})

test('光标正好在标题处算这一节，光标在文末算最后一节', () => {
  const items = extractOutline(sectionsDoc)

  assert.equal(activeOutlineId(items, 6), 'h-6')
  assert.equal(activeOutlineId(items, 17), 'h-17')
  assert.equal(activeOutlineId(items, 1000), 'h-17')
})

test('光标落在两标题之间时算前一节', () => {
  const items = extractOutline(sectionsDoc)

  // 12 在第一节正文里，15 是正文的最后一个字，还没到第二节的标题
  assert.equal(activeOutlineId(items, 12), 'h-6')
  assert.equal(activeOutlineId(items, 15), 'h-6')
  // 16 是第一节正文的结束边界，仍算第一节
  assert.equal(activeOutlineId(items, 16), 'h-6')
})

/* ---------- 折叠树 ---------- */

test('扁平大纲补成父子树，跳级标题归到前方最近的更高级标题', () => {
  const nodes = buildOutlineTree(extractOutline(doc))

  assert.deepEqual(
    nodes.map((node) => [node.id, node.level, node.parentId, node.hasChildren]),
    [
      ['h-0', 1, null, true],
      ['h-13', 2, 'h-0', true],
      ['h-30', 3, 'h-13', false],
    ],
  )

  // H1 直接接 H3：中间没有 H2，父级仍是 H1
  const skippedItems = extractOutline(makeDoc([heading(1, '甲'), heading(3, '甲子'), heading(2, '乙')]))
  const skipped = buildOutlineTree(skippedItems)
  assert.deepEqual(
    skipped.map((node) => [node.id, node.parentId, node.hasChildren]),
    [
      [skippedItems[0].id, null, true],
      [skippedItems[1].id, skippedItems[0].id, false],
      [skippedItems[2].id, skippedItems[0].id, false],
    ],
  )
})

test('展开祖先：当前节在折叠的子树里时清掉祖先的折叠标记', () => {
  const nodes = buildOutlineTree(extractOutline(doc))
  const collapsed = new Set(['h-13'])
  const next = expandAncestors(collapsed, nodes, 'h-30')

  assert.equal(next.has('h-13'), false)
  // 无变化时返回原集合，避免多余渲染
  const unchanged = new Set<string>()
  assert.equal(expandAncestors(unchanged, nodes, 'h-30'), unchanged)
  // 当前节可见时不展开任何祖先
  assert.equal(expandAncestors(collapsed, nodes, 'h-0').has('h-13'), true)
})

test('当前节被折叠时高亮最外层被折叠的祖先，展开后回到当前节', () => {
  const nodes = buildOutlineTree(extractOutline(doc))

  assert.equal(visibleActiveId(nodes, new Set(['h-13']), 'h-30'), 'h-13')
  assert.equal(visibleActiveId(nodes, new Set(), 'h-30'), 'h-30')
  assert.equal(visibleActiveId(nodes, new Set(), null), null)
})
