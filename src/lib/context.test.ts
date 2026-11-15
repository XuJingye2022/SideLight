import assert from 'node:assert/strict'
import test from 'node:test'

import { buildContext, CONTEXT_LIMIT, splitSelection, type Block } from './context.ts'

const doc: Block[] = [
  { from: 0, to: 10, text: '第一段：开场。' },
  { from: 11, to: 30, text: '第二段：正文主体，讨论问题。' },
  { from: 31, to: 45, text: '第三段：收尾。' },
]

test('光标落在段落里时，主体取该段', () => {
  const result = buildContext(doc, 15, 15)
  assert.equal(result.source, 'paragraph')
  assert.equal(result.selection, '第二段：正文主体，讨论问题。')
  assert.equal(result.before, '第一段：开场。')
  assert.equal(result.after, '第三段：收尾。')
  assert.equal(result.truncated, false)
})

test('选区跨段时，主体包含整段并保留顺序', () => {
  const result = buildContext(doc, 5, 25)
  assert.equal(result.source, 'selection')
  assert.equal(result.selection, '第一段：开场。\n\n第二段：正文主体，讨论问题。')
  assert.equal(result.before, '')
  assert.equal(result.after, '第三段：收尾。')
})

test('光标在文末时取最后一段', () => {
  const result = buildContext(doc, 999, 999)
  assert.equal(result.source, 'paragraph')
  assert.equal(result.selection, '第三段：收尾。')
  assert.equal(result.after, '')
})

test('空文档给出空上下文', () => {
  const result = buildContext([], 0, 0)
  assert.equal(result.selection, '')
  assert.equal(result.charCount, 0)
})

test('超长选区只送选区，并标记截断', () => {
  const long = '甲'.repeat(CONTEXT_LIMIT + 200)
  const result = buildContext([{ from: 0, to: long.length, text: long }], 0, long.length)
  assert.equal(result.selection.length, CONTEXT_LIMIT)
  assert.equal(result.before, '')
  assert.equal(result.after, '')
  assert.equal(result.truncated, true)
})

test('总量不超过上限', () => {
  const big = '乙'.repeat(800)
  const blocks: Block[] = [
    { from: 0, to: 800, text: big },
    { from: 801, to: 1601, text: big },
    { from: 1602, to: 2402, text: big },
  ]
  const result = buildContext(blocks, 900, 900)
  assert.ok(result.charCount <= CONTEXT_LIMIT, `实际 ${result.charCount}`)
  assert.equal(result.truncated, true)
})

test('超长选区按块切段，每段不超过上限', () => {
  const blockText = '字'.repeat(400)
  const blocks: Block[] = [
    { from: 0, to: 400, text: blockText },
    { from: 401, to: 801, text: blockText },
    { from: 802, to: 1202, text: blockText },
    { from: 1203, to: 1603, text: blockText },
  ]
  const chunks = splitSelection(blocks, 0, 1603, 1000)
  assert.equal(chunks.length, 2)
  assert.equal(chunks[0].from, 1)
  assert.equal(chunks[1].to, 1603)
})

test('短选区只切出一段', () => {
  const blocks: Block[] = [
    { from: 0, to: 20, text: '一'.repeat(20) },
    { from: 21, to: 41, text: '二'.repeat(20) },
  ]
  const chunks = splitSelection(blocks, 0, 41, 1000)
  assert.equal(chunks.length, 1)
})

test('单个超长段落按句子切开，每片不超过上限', () => {
  const sentence = '写作是一件需要耐心的事，句子之间要有呼吸。'
  const long = sentence.repeat(100)
  const blocks: Block[] = [{ from: 0, to: long.length + 2, text: long }]
  const chunks = splitSelection(blocks, 0, long.length + 2, 1000)
  assert.ok(chunks.length > 1, `只切出 ${chunks.length} 段`)
  for (const chunk of chunks) {
    assert.ok(chunk.text.length <= 1000, `有一段 ${chunk.text.length} 字`)
    assert.ok(chunk.from > 0)
    assert.ok(chunk.to >= chunk.from)
  }
  assert.equal(chunks.map((chunk) => chunk.text).join(''), long)
})

test('没有选区时切不出段', () => {
  const blocks: Block[] = [{ from: 0, to: 10, text: '一'.repeat(10) }]
  assert.deepEqual(splitSelection(blocks, 5, 5, 1000), [])
})
