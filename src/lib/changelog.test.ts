import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

/**
 * 第 85 轮 A3：CHANGELOG「Unreleased」标题区间的机械门（B-140）。
 *
 * 标题 `## Unreleased（第 29–74 轮，未发版）` 第 69 轮刚修过又漂到 74，而同节正文已到第 84 轮：
 * 按标题写 release notes 会漏 75–84 轮。这里直接把标题区间和正文里的「第 N 轮」对齐，
 * 以后新增轮次忘改标题时 `npm test` 会红。
 *
 * 发版后 `## Unreleased` 换成 0.x 条目：那时删掉本测试；无该节时三个用例直接算过。
 */

/** en dash（U+2013）：标题区间用的不是连字符，写死码点免得看成 `-` */
const EN_DASH = '\u2013'
const TITLE_PATTERN = new RegExp(`^## Unreleased（第 (\\d+)${EN_DASH}(\\d+) 轮，未发版）$`)

type UnreleasedSection = { title: string; rounds: number[] }

const readUnreleased = (): UnreleasedSection | null => {
  const lines = readFileSync('docs/CHANGELOG.md', 'utf8').split(/\r?\n/)
  const start = lines.findIndex((line) => line.startsWith('## Unreleased'))
  if (start < 0) return null
  let end = lines.length
  for (let index = start + 1; index < lines.length; index += 1) {
    if (lines[index].startsWith('## ')) {
      end = index
      break
    }
  }
  const rounds: number[] = []
  for (let index = start + 1; index < end; index += 1) {
    const match = /^\*\*第 (\d+) 轮/.exec(lines[index])
    if (match) rounds.push(Number(match[1]))
  }
  return { title: lines[start], rounds }
}

const section = readUnreleased()
const skipped = '已发版：CHANGELOG 无 Unreleased 节，跳过'

/** 三段断言共用：拿标题里的两个数；标题格式不对时给出完整标题 */
const titleRange = (title: string): { lower: number; upper: number } => {
  const match = TITLE_PATTERN.exec(title)
  assert.ok(match, `标题不匹配「## Unreleased（第 A–B 轮，未发版）」：${title}`)
  return { lower: Number(match[1]), upper: Number(match[2]) }
}

test('标题格式：Unreleased + 全角括号 + en dash + 未发版', () => {
  if (!section) {
    assert.ok(true, skipped)
    return
  }
  titleRange(section.title)
})

test('标题上界 = 正文最大轮次（漏写新轮次时红，报文带两数）', () => {
  if (!section) {
    assert.ok(true, skipped)
    return
  }
  assert.ok(section.rounds.length > 0, 'Unreleased 节里没有「**第 N 轮」条目')
  const { upper } = titleRange(section.title)
  const max = Math.max(...section.rounds)
  assert.equal(upper, max, `标题上界 ${upper} 与正文最大轮次 ${max} 不一致：标题应写到 ${max}`)
})

test('标题下界不晚于正文最早轮次（区间起点不虚高）', () => {
  if (!section) {
    assert.ok(true, skipped)
    return
  }
  assert.ok(section.rounds.length > 0, 'Unreleased 节里没有「**第 N 轮」条目')
  const { lower } = titleRange(section.title)
  const min = Math.min(...section.rounds)
  assert.ok(lower <= min, `标题下界 ${lower} 晚于正文最早轮次 ${min}：区间起点虚高`)
})
