import assert from 'node:assert/strict'
import test from 'node:test'

import { classify } from './risk.ts'

// 第 41 轮：T1 修好 escapeHtmlForParse / repairHtml 之后，围栏里的注释与正文的真注释都不再改字节，
// 风险门不能把它们报成「HTML 注释损失」。

test('围栏里的注释原样时不产生 html-comment 损失', () => {
  const text = '```\n<!-- x -->\n```\n'
  assert.equal(classify(text, text).filter((loss) => loss.kind === 'html-comment').length, 0)
})

test('正文里修复后的真注释不产生损失', () => {
  const text = '正文 <!-- 备注 --> 结尾。\n'
  assert.deepEqual(classify(text, text), [])
})

test('真丢注释仍然拦，并说清是写法被改动', () => {
  const losses = classify('正文 <!-- 备注 --> 结尾。\n', '正文 结尾。\n').filter((loss) => loss.kind === 'html-comment')
  assert.equal(losses.length, 1)
  assert.equal(losses[0].blocking, true)
  assert.equal(losses[0].label, 'HTML 注释的写法会被改动')
})
