import assert from 'node:assert/strict'
import test from 'node:test'

import { repairCalloutMarkers } from './escapes.ts'

test('还原一层引用的 callout 标记', () => {
  assert.equal(repairCalloutMarkers('> \\[!note\\] 想法'), '> [!note] 想法')
})

test('还原嵌套引用', () => {
  assert.equal(repairCalloutMarkers('>> \\[!tip\\] 提示'), '>> [!tip] 提示')
})

test('还原带前导空格的引用', () => {
  assert.equal(repairCalloutMarkers('  > \\[!warning\\] 注意'), '  > [!warning] 注意')
})

test('正文里的转义方括号不动', () => {
  assert.equal(repairCalloutMarkers('正文里写 \\[1, 2\\] 这样。'), '正文里写 \\[1, 2\\] 这样。')
})

test('没有 callout 时原样返回', () => {
  const text = '普通引用\n\n> 只是一句话。'
  assert.equal(repairCalloutMarkers(text), text)
})

test('多行 callout 一起还原', () => {
  const input = ['> \\[!note\\] 一', '> 正文', '> \\[!tip\\] 二'].join('\n')
  assert.equal(repairCalloutMarkers(input), ['> [!note] 一', '> 正文', '> [!tip] 二'].join('\n'))
})
