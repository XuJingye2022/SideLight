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

// 第 43 轮：classify 的相等快路径。这 5 条**改前也是绿的**（上面 :16 已有同型断言），
// 只锁「等价输入不报损失」的语义；快路径落地的正向证据是 git grep
// "if (beforeText === afterText) return" -- src/lib/risk.ts（改后 1 命中）。

test('相等快路径：表格 + 标题逐字节相同不报损失', () => {
  const text = '# 标题\n\n| a | b |\n| --- | --- |\n| 1 | 2 |\n'
  assert.deepEqual(classify(text, text), [])
})

test('相等快路径：脚注定义 + 引用逐字节相同不报损失', () => {
  const text = '正文[^1]。\n\n[^1]: 脚注正文。\n'
  assert.deepEqual(classify(text, text), [])
})

test('相等快路径：公式 + HTML 注释逐字节相同不报损失', () => {
  const text = '行内 $x^2$\n\n$$\na+b\n$$\n\n正文 <!-- 备注 --> 结尾。\n'
  assert.deepEqual(classify(text, text), [])
})

test('相等快路径：CRLF 归一后相等不报损失', () => {
  assert.deepEqual(classify('a\r\nb\n', 'a\nb\n'), [])
})

test('相等快路径的正对照：真有差异仍报 blank-lines（不吞）', () => {
  const losses = classify('a\n\nb\n', 'a\nb\n')
  const blank = losses.filter((loss) => loss.kind === 'blank-lines')
  assert.equal(blank.length, 1)
  assert.equal(blank[0].blocking, false)
})
