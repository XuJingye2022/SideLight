import assert from 'node:assert/strict'
import test from 'node:test'

import { diffView, type DiffViewResult } from './diffView.ts'

/** 把 rows 压成「状态:文本」，断言一眼看清 */
function shape(result: DiffViewResult): string[] {
  return result.rows.map((row) => `${row.kind}:${row.text}`)
}

const numbers = (count: number) => Array.from({ length: count }, (_, index) => `${index + 1}`)

test('没有改动：rows 为空、计数为 0、不截断', () => {
  const result = diffView('甲\n乙\n丙\n', '甲\n乙\n丙\n')
  assert.deepEqual(result.rows, [])
  assert.equal(result.added, 0)
  assert.equal(result.removed, 0)
  assert.equal(result.truncated, false)
})

test('只差 CRLF 与末尾换行也算没有改动', () => {
  assert.deepEqual(diffView('甲\r\n乙\r\n', '甲\n乙\n').rows, [])
  assert.deepEqual(diffView('甲\n乙', '甲\n乙\n\n').rows, [])
  assert.deepEqual(diffView('', '').rows, [])
})

test('单行修改：前后各留默认 2 行上下文', () => {
  const before = '1\n2\n3\n4\n5\n6\n7\n8\n9'
  const after = '1\n2\n3\n4\n5改\n6\n7\n8\n9'
  const result = diffView(before, after)
  assert.deepEqual(shape(result), [
    'same:3',
    'same:4',
    'removed:5',
    'added:5改',
    'same:6',
    'same:7',
  ])
  assert.equal(result.added, 1)
  assert.equal(result.removed, 1)
  assert.equal(result.truncated, false)
})

test('context=0：只出改动行', () => {
  const result = diffView('1\n2\n3\n4\n5', '1\n2\n3\n4\n5改', { context: 0 })
  assert.deepEqual(shape(result), ['removed:5', 'added:5改'])
})

test('相邻改动合并成一块，同一行只出一次', () => {
  const before = '1\n2\n3\n4\n5\n6\n7\n8\n9'
  const after = '1\n2\n3\n4改\n5\n6改\n7\n8\n9'
  const result = diffView(before, after, { context: 1 })
  assert.deepEqual(shape(result), [
    'same:3',
    'removed:4',
    'added:4改',
    'same:5',
    'removed:6',
    'added:6改',
    'same:7',
  ])
  assert.equal(shape(result).filter((line) => line === 'same:5').length, 1)
})

test('计数按全文：不受 context 与 maxRows 影响', () => {
  const before = numbers(30).join('\n')
  const after = [...numbers(30)].map((line) => (line === '15' ? '15改' : line)).join('\n')
  const wide = diffView(before, after, { context: 10 })
  const narrow = diffView(before, after, { context: 0 })
  const capped = diffView(before, after, { context: 10, maxRows: 2 })
  for (const result of [wide, narrow, capped]) {
    assert.equal(result.added, 1)
    assert.equal(result.removed, 1)
  }
  assert.equal(capped.rows.length, 2)
  assert.equal(capped.truncated, true)
})

test('空 before：所有行都是新增', () => {
  const result = diffView('', '甲\n乙\n丙\n')
  assert.deepEqual(shape(result), ['added:甲', 'added:乙', 'added:丙'])
  assert.equal(result.added, 3)
  assert.equal(result.removed, 0)
})

test('空 after：所有行都是删除', () => {
  const result = diffView('甲\n乙\n丙\n', '')
  assert.deepEqual(shape(result), ['removed:甲', 'removed:乙', 'removed:丙'])
  assert.equal(result.added, 0)
  assert.equal(result.removed, 3)
})

test('maxRows 截断：只留前段并置 truncated', () => {
  const before = numbers(20).join('\n')
  const after = numbers(20)
    .map((line) => `${line}改`)
    .join('\n')
  const result = diffView(before, after, { maxRows: 8 })
  assert.equal(result.rows.length, 8)
  assert.equal(result.truncated, true)
  assert.equal(result.added, 20)
  assert.equal(result.removed, 20)
  // 截断的是后段：留下的仍是「先删后增」的头部
  assert.equal(result.rows[0].kind, 'removed')
})

test('maxRows 恰好等于行数：不截断', () => {
  const result = diffView('1\n2\n3', '1\n2改\n3')
  const exact = diffView('1\n2\n3', '1\n2改\n3', { maxRows: result.rows.length })
  assert.equal(exact.rows.length, result.rows.length)
  assert.equal(exact.truncated, false)
})

test('超长行截到 500 个字符并补「…」', () => {
  const long = 'x'.repeat(900)
  const result = diffView('短行', long, { context: 0 })
  const added = result.rows.find((row) => row.kind === 'added')
  assert.ok(added)
  assert.equal(added.text.length, 501)
  assert.ok(added.text.endsWith('…'))
  assert.ok(result.rows.every((row) => row.text.length <= 501))
  // 计数不受截断影响
  assert.equal(result.added, 1)
  assert.equal(result.removed, 1)
})

test('超过 4000 行退粗粒度差分：计数仍准、只报真实改动', () => {
  const lines = numbers(5000)
  const changed = [...lines]
  changed[2500] = '改过的第 2501 行'
  const result = diffView(lines.join('\n'), changed.join('\n'))
  assert.equal(result.added, 1)
  assert.equal(result.removed, 1)
  assert.ok(result.rows.length <= 400)
  assert.ok(result.rows.some((row) => row.text === '改过的第 2501 行'))
})

test('粗粒度差分下 maxRows 上限同样生效', () => {
  const before = numbers(5000).join('\n')
  const after = numbers(5000)
    .map((line) => `${line}改`)
    .join('\n')
  const result = diffView(before, after, { maxRows: 50 })
  assert.equal(result.rows.length, 50)
  assert.equal(result.truncated, true)
  assert.equal(result.added, 5000)
  assert.equal(result.removed, 5000)
})

test('默认参数：context 2 / maxRows 400 / maxLine 500', () => {
  // context 2：6 行里改第 3 行，第 6 行不出现
  const six = diffView('1\n2\n3\n4\n5\n6', '1\n2\n3改\n4\n5\n6')
  assert.deepEqual(shape(six), ['same:1', 'same:2', 'removed:3', 'added:3改', 'same:4', 'same:5'])
  // maxLine 500：600 字的行截到 501
  const long = diffView('a', 'y'.repeat(600), { context: 0 })
  assert.equal(long.rows[1].text.length, 501)
  // maxRows 400：全部改动时只留 400 行
  const capped = diffView(numbers(300).join('\n'), numbers(300).map((line) => `${line}改`).join('\n'))
  assert.equal(capped.rows.length, 400)
  assert.equal(capped.truncated, true)
})

/**
 * 第 140 轮 A2：全宽对比面板用 `maxRows: 2000`（原来小窗是 400）。
 * 2,400 行全改时只留前 2,000 行，计数仍按全文；两处改动的上下文窗口各自只留 2 行。
 */
test('maxRows 2000：2,400 行全改只留前 2,000 行，计数仍按全文', () => {
  const before = numbers(2400).join('\n')
  const after = numbers(2400)
    .map((line) => `${line}改`)
    .join('\n')
  const result = diffView(before, after, { maxRows: 2000 })
  assert.equal(result.rows.length, 2000)
  assert.equal(result.truncated, true)
  assert.equal(result.added, 2400)
  assert.equal(result.removed, 2400)
  // 截断的是后段：留下的仍是「先删后增」的头部
  assert.equal(result.rows[0].kind, 'removed')
})

test('两处改动各留默认 2 行上下文，窗口之间不串', () => {
  const before = numbers(12).join('\n')
  const after = [...numbers(12)]
    .map((line) => (line === '3' || line === '10' ? `${line}改` : line))
    .join('\n')
  const result = diffView(before, after)
  assert.deepEqual(shape(result), [
    'same:1',
    'same:2',
    'removed:3',
    'added:3改',
    'same:4',
    'same:5',
    'same:8',
    'same:9',
    'removed:10',
    'added:10改',
    'same:11',
    'same:12',
  ])
  assert.equal(result.added, 2)
  assert.equal(result.removed, 2)
  assert.equal(result.truncated, false)
})
