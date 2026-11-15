import assert from 'node:assert/strict'
import test from 'node:test'

import { diffLines, type DiffLine } from './diff.ts'
import { activeLosses, baselineLosses, classify, type Loss } from './risk.ts'

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

/* ---------- 保存前的结构损失分类（第 07 轮） ---------- */

const has = (losses: Loss[], kind: Loss['kind']) => losses.some((loss) => loss.kind === kind)

test('引用式链接定义被删：基线命中，保存要拦', () => {
  const before = '正文 [Tiptap][tiptap] 结束。\n\n[tiptap]: https://tiptap.dev\n'
  const after = '正文 [Tiptap](https://tiptap.dev) 结束。\n'
  const baseline = baselineLosses(before, after)
  assert.ok(has(baseline, 'reference-links'))
  const active = activeLosses(before, after, baseline)
  assert.ok(has(active, 'reference-links'))
})

test('基线为空时永不拦：正常编辑不弹框', () => {
  const before = '正文 [Tiptap][tiptap] 结束。\n\n[tiptap]: https://tiptap.dev\n'
  const after = '正文 [Tiptap](https://tiptap.dev) 结束。\n'
  assert.deepEqual(activeLosses(before, after, []), [])
})

test('代码围栏里的定义不算引用式链接', () => {
  const before = '```md\n[tiptap]: https://tiptap.dev\n```\n'
  const after = '```md\n```\n'
  assert.ok(!has(classify(before, after), 'reference-links'))
})

test('表格只有分隔行宽度/空格变化才算损失', () => {
  const before = '| 名字 | 数量 |\n| :----- | -----: |\n| 甲 | 1 |\n'
  const after = '| 名字 | 数量 |\n| :--- | ----: |\n| 甲 | 1 |\n'
  assert.ok(has(classify(before, after), 'table-separator'))
})

test('改单元格值 / 删表格行不报结构损失', () => {
  const before = '| 名字 | 数量 |\n| :----- | -----: |\n| 甲 | 1 |\n| 乙 | 2 |\n'
  const valueChanged = '| 名字 | 数量 |\n| :----- | -----: |\n| 甲 | 9 |\n| 乙 | 2 |\n'
  const rowDeleted = '| 名字 | 数量 |\n| :----- | -----: |\n| 甲 | 1 |\n'
  assert.ok(!has(classify(before, valueChanged), 'table-separator'))
  assert.ok(!has(classify(before, rowDeleted), 'table-separator'))
})

test('含 & 的行内 HTML 被转义', () => {
  const before = '<span title="甲 & 乙">说明</span>\n'
  const after = '<span title="甲 &amp; 乙">说明</span>\n'
  assert.ok(has(classify(before, after), 'html-ampersand'))
})

test('自动链接被改写', () => {
  const before = '见 <https://example.com/a> 说明。\n'
  const after = '见 [https://example.com/a](https://example.com/a) 说明。\n'
  assert.ok(has(classify(before, after), 'autolink'))
})

test('多行脚注续行被丢掉', () => {
  const before = '正文[^1]。\n\n[^1]: 第一行\n    续行内容\n'
  const after = '正文[^1]。\n\n[^1]: 第一行\n'
  assert.ok(has(classify(before, after), 'footnote-continuation'))
})

test('\\ 硬换行是等价改写，不拦保存', () => {
  const before = '第一行\\\n第二行\n'
  const after = '第一行\n第二行\n'
  const losses = classify(before, after)
  const hard = losses.find((loss) => loss.kind === 'hard-break')
  assert.ok(hard)
  assert.equal(hard.blocking, false)
  assert.deepEqual(activeLosses(before, after, losses.filter((loss) => loss.blocking)), [])
})

test('末尾换行被补回，不拦保存', () => {
  const losses = classify('甲\n乙\n', '甲\n乙')
  const trailing = losses.find((loss) => loss.kind === 'trailing-newline')
  assert.ok(trailing)
  assert.equal(trailing.blocking, false)
})

test('用户删整段不报结构损失', () => {
  const before = '第一段。\n\n[tiptap]: https://tiptap.dev\n\n第二段。\n'
  const after = '第一段。\n'
  assert.deepEqual(classify(before, after).filter((loss) => loss.blocking), [])
})
