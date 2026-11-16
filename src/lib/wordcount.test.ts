import assert from 'node:assert/strict'
import test from 'node:test'

import { countSentences, countText, formatStats } from './wordcount.ts'

test('纯中文只数字，句号不算字', () => {
  const stats = countText('写作是把想法变成文字。')
  assert.equal(stats.cjk, 10)
  assert.equal(stats.words, 0)
  assert.equal(stats.chars, 11)
  assert.equal(stats.paragraphs, 1)
  assert.equal(stats.minutes, 1)
})

test('中英混排分别统计中文字与英文词', () => {
  const stats = countText('用 TypeScript 写 Markdown，字数统计别算错。')
  assert.equal(stats.cjk, 9)
  assert.equal(stats.words, 2)
  assert.equal(stats.chars, 29)
  assert.equal(stats.paragraphs, 1)
})

test('只有标点与空白时不计字，字符数只留非空白', () => {
  const stats = countText('，。！？　——　……')
  assert.equal(stats.cjk, 0)
  assert.equal(stats.words, 0)
  assert.equal(stats.chars, 8)
  assert.equal(stats.paragraphs, 1)
  assert.equal(stats.minutes, 1)
})

test('空串与全空白都不计字，阅读时间仍是 1 分钟', () => {
  assert.deepEqual(countText(''), { cjk: 0, words: 0, chars: 0, paragraphs: 0, minutes: 1 })
  assert.deepEqual(countText('   \n\t\n　'), { cjk: 0, words: 0, chars: 0, paragraphs: 0, minutes: 1 })
})

test('多段落只数非空的段', () => {
  const stats = countText('第一段。\n\n第二段有点长。\n　　\n第三段 English words here.')
  assert.equal(stats.paragraphs, 3)
  assert.equal(stats.cjk, 12)
  assert.equal(stats.words, 3)
  assert.equal(stats.chars, 31)
})

test('西文按空白与标点切词，撇号与连字符留在词里', () => {
  const stats = countText("Don't stop—state-of-the-art, 2nd place")
  assert.equal(stats.words, 5)
  assert.equal(stats.cjk, 0)
  assert.equal(stats.chars, 35)
})

test('阅读时间按 300 字 / 200 词相加后向上取整', () => {
  assert.equal(countText('字'.repeat(300)).minutes, 1)
  assert.equal(countText('字'.repeat(301)).minutes, 2)
  assert.equal(countText('word '.repeat(200)).minutes, 1)
  assert.equal(countText('word '.repeat(201)).minutes, 2)
  // 中文 150 字加英文 100 词，正好一分钟
  assert.equal(countText('字'.repeat(150) + ' ' + 'word '.repeat(100)).minutes, 1)
})

test('formatStats 的字数是中文加英文，并带千位分隔', () => {
  const mixed = countText('字'.repeat(1238) + ' word word')
  assert.equal(formatStats(mixed), '1,240 字 · 阅读约 5 分钟')
  assert.equal(formatStats(countText('短文')), '2 字 · 阅读约 1 分钟')
  // 空文档不显示阅读时间，避免「0 字 · 阅读约 1 分钟」这种自相矛盾
  assert.equal(formatStats({ cjk: 0, words: 0, chars: 0, paragraphs: 0, minutes: 1 }), '0 字')
})

test('句数：中文句末标点、西文句号后空白、换行都切句', () => {
  assert.equal(countSentences('写作是把想法变成文字。Use TypeScript and Markdown. 第三个问题？'), 3)
  assert.equal(countSentences('第一段\n\n第二段\n'), 2)
  assert.equal(countSentences('单句没有标点'), 1)
})

test('句数：句末标点连写只算一次，缩写在句号处多算一句（已知取舍）', () => {
  assert.equal(countSentences('真的吗？！'), 1)
  assert.equal(countSentences('Hello, e.g. this one.'), 2)
})

test('句数：空串与全空白 0 句，只剩标点也不计', () => {
  assert.equal(countSentences(''), 0)
  assert.equal(countSentences(' \n\t\r\n '), 0)
  assert.equal(countSentences('……！？？'), 0)
})

