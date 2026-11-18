import assert from 'node:assert/strict'
import test from 'node:test'

import { Schema } from '@tiptap/pm/model'

import { escapedTocLineCount, hasTocMarker, hasTocSource, isTocParagraph, tocEntries, tocParagraphPositions } from './toc.ts'

/** 只造目录用得到的三种节点；测试不建 Editor（与 outline.test.ts 同一思路，但要真实 ProseMirror 节点） */
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

test('标记判据：独占一段的 [TOC]（不分大小写）才是标记', () => {
  const toc = para('[TOC]')
  assert.equal(isTocParagraph(toc), true)
  assert.equal(isTocParagraph(para('[toc]')), true)
  assert.equal(isTocParagraph(para('  [Toc]  ')), true)
  assert.equal(isTocParagraph(para('[TOC] 后面还有字')), false)
  assert.equal(isTocParagraph(heading(1, '[TOC]')), false)
  assert.equal(isTocParagraph(para('正文 [TOC]')), false)
})

test('软换行段落里夹一行 [TOC] 不算标记（第 62 轮 B-132）', () => {
  // CommonMark 里软换行仍在同一个段落：整段文字不是「正好 [TOC]」，不能整段收起/换成目录
  assert.equal(isTocParagraph(para('a\n[TOC]\nb')), false)
  assert.equal(isTocParagraph(para('[TOC]\n这里是目录说明。')), false)
  assert.equal(isTocParagraph(para('第一行文字\n[TOC]\n第三行文字')), false)
  // 前面有空白、整段仍是标记时仍然算
  assert.equal(isTocParagraph(para('  [TOC]  ')), true)
})

test('软换行段落的文档里没有标记段位置（第 62 轮 B-132）', () => {
  const doc = schema.node('doc', null, [heading(1, '甲'), para('a\n[TOC]\nb')])
  assert.deepEqual(tocParagraphPositions(doc), [])
})

test('转义的 \\[TOC\\] 是字面文本，不算标记', () => {
  assert.equal(hasTocMarker('[TOC]'), true)
  assert.equal(hasTocMarker('  [TOC]  '), true)
  assert.equal(hasTocMarker('\\[TOC\\]'), false)
  assert.equal(hasTocMarker('正文 \\[TOC\\]'), false)
})

test('目录段落在文档里的位置与顶层偏移同口径', () => {
  const doc = schema.node('doc', null, [heading(1, '一'), para('正文'), para('[TOC]')])
  // 标题 3 + 段落 4 = 7
  assert.deepEqual(tocParagraphPositions(doc), [7])
})

test('目录条目复用大纲口径：只收顶层标题，顺序与级别照原样', () => {
  const doc = schema.node('doc', null, [heading(1, '一'), para('正文'), heading(2, '二'), para('[TOC]')])
  assert.deepEqual(
    tocEntries(doc).map((item) => ({ level: item.level, text: item.text, pos: item.pos })),
    [
      { level: 1, text: '一', pos: 0 },
      { level: 2, text: '二', pos: 7 },
    ],
  )
})

// ---------- 第 62 轮 B-133：手打 [TOC] 当场生效 ----------

test('原文的标记行全被转义时不挂目录（围栏与公式里的写法不算转义）', () => {
  const doc = schema.node('doc', null, [heading(1, '甲'), para('[TOC]')])
  assert.equal(hasTocSource(doc, '# 甲\n\n\\[TOC\\]\n'), false)
  // 围栏代码块与 $$ 公式段里的 \[TOC\] 是字面示例，不算「作者转义过」
  assert.equal(escapedTocLineCount('```\n\\[TOC\\]\n```\n'), 0)
  assert.equal(escapedTocLineCount('$$\n\\[TOC\\]\n$$\n'), 0)
  assert.equal(hasTocSource(doc, '# 甲\n\n```\n\\[TOC\\]\n```\n'), true)
})

test('原文没有 [TOC] 时手打的标记照样挂（B-133 的回归点）', () => {
  const doc = schema.node('doc', null, [heading(1, '甲'), para('正文'), para('[TOC]')])
  assert.equal(hasTocSource(doc, '# 甲\n\n正文\n'), true)
  // 新建的文档没有原文
  assert.equal(hasTocSource(doc, null), true)
  // 没有 `[TOC]` 段或没有标题仍然不挂
  assert.equal(hasTocSource(schema.node('doc', null, [heading(1, '甲'), para('正文')]), null), false)
  assert.equal(hasTocSource(schema.node('doc', null, [para('[TOC]')]), null), false)
})

test('原文一行被转义、另有手打标记时仍挂（混合文档当场两份目录）', () => {
  const doc = schema.node('doc', null, [heading(1, '甲'), para('[TOC]'), para('正文'), para('[TOC]')])
  const original = '# 甲\n\n\\[TOC\\]\n\n正文\n\n[TOC]\n'
  assert.equal(escapedTocLineCount(original), 1)
  assert.equal(hasTocSource(doc, original), true)
})
