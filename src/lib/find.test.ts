import assert from 'node:assert/strict'
import test from 'node:test'

import type { TextIndex } from './annotations.ts'
import { findAll, findNext, findPrevious, type FindOptions, type Match } from './find.ts'

const INSENSITIVE: FindOptions = { caseSensitive: false, wholeWord: false }
const SENSITIVE: FindOptions = { caseSensitive: true, wholeWord: false }
const WHOLE: FindOptions = { caseSensitive: false, wholeWord: true }
const WHOLE_SENSITIVE: FindOptions = { caseSensitive: true, wholeWord: true }

/** 手写一个索引：每个字符的文档位置从 1 起逐个加一，模拟递增的文档位置 */
function makeIndex(text: string): TextIndex {
  return { text, positions: Array.from({ length: text.length }, (_, i) => i + 1) }
}

/** 命中盖住的那截正文，用来断言命中的是哪个词。只配 makeIndex 造的索引（位置从 1 起） */
function quoteAt(index: TextIndex, match: Match): string {
  return index.text.slice(match.from - 1, match.to - 1)
}

/* ---------- 找命中 ---------- */

const MIXED_CASE = 'Alpha 开头。\n第二段写 alpha，结尾再写 ALPHA。'
const mixedIndex = makeIndex(MIXED_CASE)

test('不区分大小写时三种写法都命中', () => {
  const matches = findAll(mixedIndex, 'alpha', INSENSITIVE)

  assert.equal(matches.length, 3)
  assert.deepEqual(
    matches.map((match) => [match.from, match.to]),
    [
      [1, 6],
      [16, 21],
      [27, 32],
    ],
  )
  assert.deepEqual(
    matches.map((match) => quoteAt(mixedIndex, match).toLowerCase()),
    ['alpha', 'alpha', 'alpha'],
  )
})

test('大小写敏感时只命中完全一致的写法', () => {
  assert.deepEqual(findAll(mixedIndex, 'alpha', SENSITIVE), [{ from: 16, to: 21 }])
  assert.deepEqual(findAll(mixedIndex, 'Alpha', SENSITIVE), [{ from: 1, to: 6 }])
  assert.deepEqual(findAll(mixedIndex, 'ALPHA', SENSITIVE), [{ from: 27, to: 32 }])
  assert.deepEqual(findAll(mixedIndex, 'aLpHa', SENSITIVE), [])
})

test('中文查询照常命中，两种大小写模式结果一样', () => {
  const index = makeIndex('第一段写得很平。\n第二段也写得很平。')

  const expected = [
    { from: 4, to: 8 },
    { from: 14, to: 18 },
  ]
  assert.deepEqual(findAll(index, '写得很平', INSENSITIVE), expected)
  assert.deepEqual(findAll(index, '写得很平', SENSITIVE), expected)
  assert.deepEqual(
    findAll(index, '写得很平', SENSITIVE).map((match) => quoteAt(index, match)),
    ['写得很平', '写得很平'],
  )
})

test('空查询或全是空白的查询返回空数组', () => {
  assert.deepEqual(findAll(mixedIndex, '', INSENSITIVE), [])
  assert.deepEqual(findAll(mixedIndex, '', SENSITIVE), [])
  assert.deepEqual(findAll(mixedIndex, '   ', INSENSITIVE), [])
  assert.deepEqual(findAll(mixedIndex, ' \n\t ', INSENSITIVE), [])
})

test('正文里没有的查询返回空数组', () => {
  assert.deepEqual(findAll(mixedIndex, '正文里没有的词', INSENSITIVE), [])
  assert.deepEqual(findAll(makeIndex('短'), '比正文长很多的查询', INSENSITIVE), [])
})

test('跨块的候选被跳过，块内的照常命中', () => {
  const index = makeIndex('一句话。\n第二段前半句。')
  const across = '一句话。\n第二段'

  // 这段文字在 text 里确实连在一起，但命中区间含分隔符，不能算命中
  assert.ok(index.text.includes(across))
  assert.deepEqual(findAll(index, across, INSENSITIVE), [])

  // 不带换行的查询落在第二块里，照常命中
  assert.deepEqual(findAll(index, '第二段', INSENSITIVE), [{ from: 6, to: 9 }])
})

test('重叠命中给出两处', () => {
  assert.deepEqual(findAll(makeIndex('aaa'), 'aa', SENSITIVE), [
    { from: 1, to: 3 },
    { from: 2, to: 4 },
  ])

  assert.deepEqual(findAll(makeIndex('写写写'), '写写', SENSITIVE), [
    { from: 1, to: 3 },
    { from: 2, to: 4 },
  ])
})

test('from/to 用 positions 换算，不是正文下标', () => {
  const index: TextIndex = {
    text: '甲乙丙甲乙',
    positions: [101, 102, 103, 105, 106],
  }

  assert.deepEqual(findAll(index, '甲乙', SENSITIVE), [
    { from: 101, to: 103 },
    { from: 105, to: 107 },
  ])
})

test('整词下 state 不命中 states', () => {
  const index = makeIndex('State 与 state，还有 STATE 与 states。')
  const quotes = findAll(index, 'state', WHOLE).map((match) => quoteAt(index, match))

  assert.deepEqual(quotes, ['State', 'state', 'STATE'])
})

test('整词下 state 命中独立单词，两个开关能叠加', () => {
  const index = makeIndex('State 与 state，还有 STATE 与 states。')

  assert.deepEqual(
    findAll(index, 'state', WHOLE).map((match) => [match.from, match.to]),
    [
      [1, 6],
      [9, 14],
      [18, 23],
    ],
  )
  // 区分大小写 + 整词：只剩独立的小写 state
  assert.deepEqual(findAll(index, 'state', WHOLE_SENSITIVE).map((match) => quoteAt(index, match)), ['state'])
  // 只开区分大小写：states 里的 state 仍算命中（子串匹配，不做词边界）
  assert.equal(findAll(index, 'state', SENSITIVE).length, 2)
})

test('中文查询在整词下与原行为一致', () => {
  const index = makeIndex('第一段写得很平。\n第二段也写得很平。')
  const expected = [
    { from: 4, to: 8 },
    { from: 14, to: 18 },
  ]

  assert.deepEqual(findAll(index, '写得很平', WHOLE), expected)
  assert.deepEqual(findAll(index, '写得很平', WHOLE_SENSITIVE), expected)
})

/* ---------- 在命中之间移动 ---------- */

const MATCHES: Match[] = [
  { from: 1, to: 6 },
  { from: 16, to: 21 },
  { from: 27, to: 32 },
]

test('findNext 在中间位置取下一处，末尾循环回第一处', () => {
  assert.equal(findNext(MATCHES, 0), 0)
  assert.equal(findNext(MATCHES, 2), 1)
  assert.equal(findNext(MATCHES, 17), 2)

  // 位置正好落在某处起点时，取这一处
  assert.equal(findNext(MATCHES, 16), 1)

  // 过了最后一处就绕回第一处
  assert.equal(findNext(MATCHES, 32), 0)
  assert.equal(findNext(MATCHES, 1000), 0)

  // 没有命中
  assert.equal(findNext([], 0), -1)
})

test('findPrevious 对称：取上一处，开头循环回最后一处', () => {
  assert.equal(findPrevious(MATCHES, 100), 2)
  assert.equal(findPrevious(MATCHES, 27), 1)
  assert.equal(findPrevious(MATCHES, 17), 1)

  // 位置正好落在某处起点时，取这一处之前的那处
  assert.equal(findPrevious(MATCHES, 16), 0)

  // 在第一处之前就绕回最后一处
  assert.equal(findPrevious(MATCHES, 1), 2)
  assert.equal(findPrevious(MATCHES, 0), 2)

  // 没有命中
  assert.equal(findPrevious([], 5), -1)
})

test('只有一处命中时，两个方向都留在原处', () => {
  const single: Match[] = [{ from: 5, to: 8 }]

  assert.equal(findNext(single, 5), 0)
  assert.equal(findNext(single, 9), 0)
  assert.equal(findPrevious(single, 6), 0)
  assert.equal(findPrevious(single, 5), 0)
})
