import assert from 'node:assert/strict'
import test from 'node:test'

import { Schema } from '@tiptap/pm/model'

import { hasTocMarker, isTocParagraph, tocEntries, tocParagraphPositions } from './toc.ts'

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
