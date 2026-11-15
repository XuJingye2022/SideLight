import assert from 'node:assert/strict'
import test from 'node:test'

import { extractFootnotes, joinFootnotes, repairFootnoteRefs } from './footnotes.ts'

const ORIGINAL = ['正文第一段。', '', '这里有个引用[^1]，还有一个[^note]。', '', '[^1]: 第一条脚注。', '[^note]: 带名字的脚注。'].join(
  '\n',
)

test('文末的脚注定义被摘出来，正文保持干净', () => {
  const result = extractFootnotes(ORIGINAL)
  assert.equal(result.body, ['正文第一段。', '', '这里有个引用[^1]，还有一个[^note]。'].join('\n'))
  assert.equal(result.footnotes, ['[^1]: 第一条脚注。', '[^note]: 带名字的脚注。'].join('\n'))
})

test('没有脚注时原样返回', () => {
  const result = extractFootnotes('只是正文，没有脚注。')
  assert.equal(result.body, '只是正文，没有脚注。')
  assert.equal(result.footnotes, '')
})

test('正文中间的定义不算脚注块', () => {
  const text = ['正文。', '', '[^1]: 定义在中间。', '', '后面还有正文。'].join('\n')
  const result = extractFootnotes(text)
  assert.equal(result.body, text)
  assert.equal(result.footnotes, '')
})

test('摘出再拼回与原文逐字节一致', () => {
  const result = extractFootnotes(ORIGINAL)
  assert.equal(joinFootnotes(result.body, result.footnotes), ORIGINAL)
})

test('没有脚注时拼回等于正文', () => {
  assert.equal(joinFootnotes('只有正文。', ''), '只有正文。')
})

test('定义之间隔着空行也能识别', () => {
  const text = ['正文。', '', '[^1]: 第一条。', '', '[^2]: 第二条。'].join('\n')
  const result = extractFootnotes(text)
  assert.equal(result.body, '正文。')
  assert.equal(result.footnotes, ['[^1]: 第一条。', '', '[^2]: 第二条。'].join('\n'))
})

test('修复被转义的脚注引用', () => {
  assert.equal(repairFootnoteRefs('这段有脚注\\[^1\\]，还有\\[^note\\]。'), '这段有脚注[^1]，还有[^note]。')
})

test('不碰其它被转义的方括号', () => {
  assert.equal(repairFootnoteRefs('数组写成 \\[1, 2\\] 就好。'), '数组写成 \\[1, 2\\] 就好。')
})

test('没有转义时原样返回', () => {
  assert.equal(repairFootnoteRefs('普通正文[^1]。'), '普通正文[^1]。')
})
