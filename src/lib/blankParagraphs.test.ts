import assert from 'node:assert/strict'
import test from 'node:test'

import { collapseBlankParagraphs } from './blankParagraphs.ts'

test('开头 2 个空段落收到 1 个', () => {
  assert.equal(collapseBlankParagraphs('\n\n&nbsp;\n\n# 标题\n\n正文。'), '\n\n# 标题\n\n正文。')
})

test('开头 3 个空段落收到 1 个', () => {
  assert.equal(
    collapseBlankParagraphs('\n\n&nbsp;\n\n&nbsp;\n\n# 标题\n\n正文。'),
    '\n\n# 标题\n\n正文。',
  )
})

test('中间 2 个空段落收到 1 个', () => {
  assert.equal(collapseBlankParagraphs('# 标题\n\n\n\n&nbsp;\n\n正文。'), '# 标题\n\n\n\n正文。')
})

test('中间 3 个空段落收到 1 个', () => {
  assert.equal(
    collapseBlankParagraphs('# 标题\n\n\n\n&nbsp;\n\n&nbsp;\n\n正文。'),
    '# 标题\n\n\n\n正文。',
  )
})

test('末尾 2 个空段落：截到 &nbsp; 之前（尾部换行由 applyTrailingNewlines 收）', () => {
  assert.equal(collapseBlankParagraphs('# 标题\n\n正文。\n\n\n\n&nbsp;'), '# 标题\n\n正文。\n\n\n')
})

test('没有 &nbsp; 的连续空行原样', () => {
  assert.equal(collapseBlankParagraphs('# 标题\n\n\n\n正文。'), '# 标题\n\n\n\n正文。')
})

test('围栏内的 4 个空行与 ~~~ 围栏原样', () => {
  const backtick = '```\nA\n\n\n\nB\n```\n'
  assert.equal(collapseBlankParagraphs(backtick), backtick)
  const tilde = '~~~\nA\n\n\n\nB\n~~~\n'
  assert.equal(collapseBlankParagraphs(tilde), tilde)
})

test('围栏内的字面 &nbsp; 行、用户手写的 &nbsp; 段落、脚注块内空行都原样', () => {
  const fenced = '```\n&nbsp;\n```\n'
  assert.equal(collapseBlankParagraphs(fenced), fenced)
  const standalone = '第一段。\n&nbsp;\n第二段。'
  assert.equal(collapseBlankParagraphs(standalone), standalone)
  const footnote = '正文[^1]。\n\n[^1]: 第一段\n\n\n    第二段\n'
  assert.equal(collapseBlankParagraphs(footnote), footnote)
})

test('普通文档不变、输出不含 &nbsp; 子串', () => {
  const source = '# 标题\n\n正文一。\n\n正文二。\n'
  assert.equal(collapseBlankParagraphs(source), source)
  assert.ok(!collapseBlankParagraphs('\n\n&nbsp;\n\n正文。').includes('&nbsp;'))
})
