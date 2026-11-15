import assert from 'node:assert/strict'
import test from 'node:test'

import { protectMathPairs, repairMath } from './math.ts'

test('真正的公式不动', () => {
  assert.equal(protectMathPairs('行内 $E=mc^2$ 结束。'), '行内 $E=mc^2$ 结束。')
})

test('货币写法被转义，不当公式', () => {
  assert.equal(protectMathPairs('价格 $5 到 $10 之间。'), '价格 \\$5 到 \\$10 之间。')
})

test('开头的美元符号后是空白时转义', () => {
  assert.equal(protectMathPairs('写 $ x + y $ 这样。'), '写 \\$ x + y \\$ 这样。')
})

test('块级公式不动', () => {
  assert.equal(protectMathPairs('$$\n\\frac{a}{b}\n$$'), '$$\n\\frac{a}{b}\n$$')
})

test('没有美元符号时原样返回', () => {
  const text = '普通正文，没有公式。'
  assert.equal(protectMathPairs(text), text)
})

test('多个公式都保留', () => {
  assert.equal(protectMathPairs('$a$ 与 $b$ 两个。'), '$a$ 与 $b$ 两个。')
})

test('同一行里公式与货币混排', () => {
  assert.equal(protectMathPairs('方程 $y=2x$ 卖了 $30 元 $40 元。'), '方程 $y=2x$ 卖了 \\$30 元 \\$40 元。')
})

test('公式块里的反斜杠还原', () => {
  assert.equal(repairMath('$$\n\\\\frac{a}{b} = c\n$$'), '$$\n\\frac{a}{b} = c\n$$')
})

test('行内公式里的反斜杠还原', () => {
  assert.equal(repairMath('写 $\\\\alpha + \\\\beta$ 就行。'), '写 $\\alpha + \\beta$ 就行。')
})

test('公式外部的反斜杠不动', () => {
  assert.equal(repairMath('正文里的 \\\\ 不动。'), '正文里的 \\\\ 不动。')
})
