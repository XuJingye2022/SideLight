import assert from 'node:assert/strict'
import test from 'node:test'

import { repairCalloutMarkers, repairTocMarkers } from './escapes.ts'

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

/* ---------- 第 58 轮 A2：`[TOC]` 标记的字节保真 ---------- */

test('TOC 标记：编辑器转义成 \\[TOC\\] 的整行按行还原', () => {
  assert.equal(repairTocMarkers('\\[TOC\\]\n\n# 一\n'), '[TOC]\n\n# 一\n')
  // 不分大小写；前导空白与行尾空白保留
  assert.equal(repairTocMarkers('  \\[Toc\\]  '), '  [TOC]  ')
  // 一行里还有别的字不算标记
  assert.equal(repairTocMarkers('正文 \\[TOC\\]\n'), '正文 \\[TOC\\]\n')
})

test('TOC 标记：行内代码、引用行、围栏代码、公式段不动', () => {
  assert.equal(repairTocMarkers('`\\[TOC\\]`\n'), '`\\[TOC\\]`\n')
  assert.equal(repairTocMarkers('> \\[TOC\\]\n'), '> \\[TOC\\]\n')
  assert.equal(repairTocMarkers('```\n\\[TOC\\]\n```\n'), '```\n\\[TOC\\]\n```\n')
  assert.equal(repairTocMarkers('$$\n\\[TOC\\]\n$$\n'), '$$\n\\[TOC\\]\n$$\n')
})

test('TOC 标记：原文写过 \\[TOC\\] 时整篇不还原', () => {
  assert.equal(repairTocMarkers('\\[TOC\\]\n', '\\[TOC\\]\n'), '\\[TOC\\]\n')
  // 原文有转义写法时，另一处 `[TOC]` 也不还原（保守口径：保住作者写的字面标记）
  assert.equal(repairTocMarkers('\\[TOC\\]\n\n\\[TOC\\]\n', '\\[TOC\\]\n\n\\[TOC\\]\n'), '\\[TOC\\]\n\n\\[TOC\\]\n')
})

test('TOC 标记：没有标记时原样返回', () => {
  const text = '# 一\n\n正文 [toc] 在句中\n'
  assert.equal(repairTocMarkers(text), text)
})

test('TOC 标记：CRLF 行尾保持', () => {
  assert.equal(repairTocMarkers('\\[TOC\\]\r\n\r\n# 一\r\n'), '[TOC]\r\n\r\n# 一\r\n')
})

