import assert from 'node:assert/strict'
import test from 'node:test'

import { diffLines, type DiffLine } from './diff.ts'

/** 把差异压成「状态:行」的数组，断言起来一目了然 */
function shape(lines: DiffLine[]): string[] {
  return lines.map((line) => `${line.kind}:${line.text}`)
}

test('完全相同的两段文字全是 same', () => {
  const lines = diffLines('甲\n乙\n丙\n', '甲\n乙\n丙\n')
  assert.deepEqual(shape(lines), ['same:甲', 'same:乙', 'same:丙'])
})

test('单行修改给出删除与新增', () => {
  const lines = diffLines('第一行\n第二行\n第三行\n', '第一行\n第二行改了\n第三行\n')
  assert.deepEqual(shape(lines), [
    'same:第一行',
    'removed:第二行',
    'added:第二行改了',
    'same:第三行',
  ])
})

test('插入一行', () => {
  const lines = diffLines('甲\n丙\n', '甲\n乙\n丙\n')
  assert.deepEqual(shape(lines), ['same:甲', 'added:乙', 'same:丙'])
})

test('删除一行', () => {
  const lines = diffLines('甲\n乙\n丙\n', '甲\n丙\n')
  assert.deepEqual(shape(lines), ['same:甲', 'removed:乙', 'same:丙'])
})

test('末尾换行有无不算差异', () => {
  assert.deepEqual(shape(diffLines('甲\n乙\n', '甲\n乙')), ['same:甲', 'same:乙'])
  assert.deepEqual(shape(diffLines('甲\n乙', '甲\n乙\n\n')), ['same:甲', 'same:乙'])
})

test('多行块替换：删除在前、新增在后', () => {
  const lines = diffLines('1\n2\n3\n4\n5\n', '1\nX\nY\n5\n')
  assert.deepEqual(shape(lines), [
    'same:1',
    'removed:2',
    'removed:3',
    'removed:4',
    'added:X',
    'added:Y',
    'same:5',
  ])
})

test('CRLF 与 LF 视为同样的换行', () => {
  assert.deepEqual(shape(diffLines('甲\r\n乙\r\n', '甲\n乙\n')), ['same:甲', 'same:乙'])
})

test('空文本之间没有差异', () => {
  assert.deepEqual(diffLines('', ''), [])
  assert.deepEqual(shape(diffLines('', '甲\n')), ['added:甲'])
})

test('超过 4000 行时只报真实改动，不退化成全删再全加', () => {
  const lines = Array.from({ length: 5000 }, (_, index) => `第 ${index} 行`)
  const changed = [...lines]
  changed[2500] = '改过的第 2500 行'

  const result = diffLines(lines.join('\n'), changed.join('\n'))
  const changedLines = result.filter((line) => line.kind !== 'same')
  assert.ok(changedLines.length <= 4, `变化行数 ${changedLines.length}`)
  assert.ok(changedLines.some((line) => line.text === '改过的第 2500 行'))
})

test('大文档完全相同时没有差异', () => {
  const big = Array.from({ length: 5000 }, (_, index) => `第 ${index} 行`).join('\n')
  const result = diffLines(big, big)
  assert.equal(result.filter((line) => line.kind !== 'same').length, 0)
})
