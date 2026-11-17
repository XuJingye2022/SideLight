import assert from 'node:assert/strict'
import test from 'node:test'

import { Schema } from '@tiptap/pm/model'

import { buildTocDecorations } from './tocRender.ts'

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

test('一个 [TOC] 段落挂一个 widget，键带位置与标题签名', () => {
  const doc = withToc('一', '二')
  const result = buildTocDecorations(doc)
  assert.equal(result.active, true)
  const found = result.set.find()
  assert.equal(found.length, 1)
  // 两个标题（3 + 3）之后是 TOC 段落
  assert.equal(found[0].from, 6)
  assert.equal(found[0].to, 6)
  assert.match(String(found[0].spec.key), /^toc@6-1:一\|2:二$/)
})

test('标题文字变了键就变（不然 ProseMirror 会复用旧 DOM）', () => {
  const before = buildTocDecorations(withToc('旧标题')).set.find()[0].spec.key
  const after = buildTocDecorations(withToc('新标题')).set.find()[0].spec.key
  assert.notEqual(before, after)
})

test('同一文档两个 [TOC] 各自一个 widget，键不撞', () => {
  const doc = schema.node('doc', null, [heading(1, '一'), para('[TOC]'), para('[TOC]')])
  const found = buildTocDecorations(doc).set.find()
  assert.equal(found.length, 2)
  assert.equal(new Set(found.map((item) => item.spec.key)).size, 2)
})

test('原文只有转义写法 \\[TOC\\] 时不挂目录（plan-review R2）', () => {
  const doc = withToc('一')
  assert.equal(buildTocDecorations(doc, { original: '\\[TOC\\]\n' }).active, false)
  assert.equal(buildTocDecorations(doc, { original: '[TOC]\n' }).active, true)
  // 新建文档没有原文：照常挂
  assert.equal(buildTocDecorations(doc, { original: null }).active, true)
})

test('没有 [TOC] 段落或没有标题时不挂', () => {
  assert.equal(buildTocDecorations(schema.node('doc', null, [heading(1, '一'), para('正文')])).active, false)
  assert.equal(buildTocDecorations(schema.node('doc', null, [para('[TOC]')])).active, false)
})
