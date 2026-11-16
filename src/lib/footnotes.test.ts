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

const MULTILINE = [
  '# 脚注',
  '',
  '正文[^a] 与[^b]。',
  '',
  '[^a]: 第一行',
  '    续行内容',
  '[^b]: 第二行',
].join('\n')

test('4 空格续行并入同一脚注块', () => {
  const result = extractFootnotes(MULTILINE)
  assert.equal(result.body, ['# 脚注', '', '正文[^a] 与[^b]。'].join('\n'))
  assert.equal(result.footnotes, ['[^a]: 第一行', '    续行内容', '[^b]: 第二行'].join('\n'))
  assert.deepEqual(
    result.blocks.map((block) => [block.kind, block.text, block.gapBefore]),
    [
      ['footnote', '[^a]: 第一行\n    续行内容', 0],
      ['footnote', '[^b]: 第二行', 0],
    ],
  )
  assert.equal(joinFootnotes(result.body, result.footnotes), MULTILINE)
})

test('tab 续行也并入同一脚注块', () => {
  const text = ['正文[^a]。', '', '[^a]: 第一行', '\t续行'].join('\n')
  const result = extractFootnotes(text)
  assert.equal(result.blocks.length, 1)
  assert.equal(result.blocks[0].text, '[^a]: 第一行\n\t续行')
  assert.equal(joinFootnotes(result.body, result.footnotes), text)
})

test('脚注块与 [ref]: 引用定义混合尾部按原序拼回', () => {
  const text = [
    '# 混合',
    '',
    '正文[^a]。',
    '',
    '[^a]: 脚注首行',
    '    续行',
    '[ref]: https://example.com',
  ].join('\n')
  const result = extractFootnotes(text)
  assert.equal(result.body, ['# 混合', '', '正文[^a]。'].join('\n'))
  assert.deepEqual(result.blocks.map((block) => block.kind), ['footnote', 'ref'])
  assert.equal(joinFootnotes(result.body, result.footnotes), text)
})

test('脚注块之间空行按 gapBefore 保留', () => {
  const text = ['正文。', '', '[^1]: 一。', '', '[^2]: 二。', '    续'].join('\n')
  const result = extractFootnotes(text)
  assert.deepEqual(result.blocks.map((block) => block.gapBefore), [0, 1])
  assert.equal(joinFootnotes(result.body, result.footnotes), text)
})

test('两次往返逐字节稳定（多行 + 引用定义）', () => {
  const text = ['正文[^a]。', '', '[^a]: 首行', '    续行', '[ref]: https://example.com'].join('\n')
  const first = extractFootnotes(text)
  const once = joinFootnotes(first.body, first.footnotes)
  const second = extractFootnotes(once)
  const twice = joinFootnotes(second.body, second.footnotes)
  assert.equal(once, text)
  assert.equal(twice, once)
})