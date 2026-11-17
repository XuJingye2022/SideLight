import assert from 'node:assert/strict'
import test from 'node:test'

import { normalizeForBaseline } from './baseline.ts'

test('已有末尾换行：原样', () => {
  assert.equal(normalizeForBaseline('a\n', 'a\n'), 'a\n')
})

test('原文以换行结尾、串里没有：补一个（与 prepareSave 同源）', () => {
  assert.equal(normalizeForBaseline('a', 'a\n'), 'a\n')
})

test('原文不以换行结尾：不补', () => {
  assert.equal(normalizeForBaseline('a', 'a'), 'a')
})

test('CRLF 先折成 LF，再按原文补末尾换行', () => {
  assert.equal(normalizeForBaseline('a\r\nb\r\n', 'x\n'), 'a\nb\n')
  assert.equal(normalizeForBaseline('a\r\nb', 'x\r\n'), 'a\nb\n')
})

test('原文为空串 / null：不补', () => {
  assert.equal(normalizeForBaseline('a', ''), 'a')
  assert.equal(normalizeForBaseline('a', null), 'a')
})

test('幂等：对同一原文重复调用结果不变', () => {
  const samples: Array<[string, string | null]> = [
    ['a\n', 'a\n'],
    ['a', 'a\n'],
    ['a', 'a'],
    ['a\r\nb\r\n', 'x\n'],
    ['a', ''],
    ['a', null],
  ]
  for (const [text, original] of samples) {
    const once = normalizeForBaseline(text, original)
    assert.equal(normalizeForBaseline(once, original), once, `${JSON.stringify(text)} / ${JSON.stringify(original)}`)
  }
})
