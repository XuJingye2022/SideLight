import { applyTrailingNewlines } from './serializeDocument.ts'
import assert from 'node:assert/strict'
import test from 'node:test'

import { diffLines, type DiffLine } from './diff.ts'
import { activeLosses, baselineLosses, classify, type Loss } from './risk.ts'
import { collectTables, reuseTables, splitCells } from './tableReuse.ts'

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

/* ---------- 表格整块复用（第 10 轮） ---------- */

const ORIGINAL_TABLE = '| 项目 | 一月 | 二月 |\n|:-----|-----:|:----:|\n| 房租 | 3200 | 3200 |\n| 书  | 180  | 240  |\n'
const SERIALIZED_TABLE = '| 项目  | 一月   | 二月   |\n| :--- | ----: | :----: |\n| 房租  | 3200 | 3200 |\n| 书   | 180  | 240  |\n'

test('未改动的表格整块换回原文（分隔行/列宽/对齐逐字节）', () => {
  assert.equal(reuseTables(ORIGINAL_TABLE, SERIALIZED_TABLE), ORIGINAL_TABLE)
})

test('改单元格值：签名不命中，保留规范输出', () => {
  const edited = SERIALIZED_TABLE.replace('| 房租  | 3200', '| 房租  | 3300')
  assert.equal(reuseTables(ORIGINAL_TABLE, edited), edited)
})

test('加列：列数变化，不重用', () => {
  const edited = '| 项目 | 一月 | 二月 | 三月 |\n| :--- | ----: | :----: | --- |\n| 房租 | 3200 | 3200 | 0 |\n'
  assert.equal(reuseTables(ORIGINAL_TABLE, edited), edited)
})

test('删一行：数据单元格变化，不重用', () => {
  const edited = '| 项目 | 一月 | 二月 |\n| :--- | ----: | :----: |\n| 房租 | 3200 | 3200 |\n'
  assert.equal(reuseTables(ORIGINAL_TABLE, edited), edited)
})

test('改对齐：对齐三元组变化，不重用', () => {
  const edited = SERIALIZED_TABLE.replace('| :--- | ----: | :----: |', '| :--- | :---: | :---: |')
  assert.equal(reuseTables(ORIGINAL_TABLE, edited), edited)
})

test('围栏里的假表格不算表格', () => {
  const fenced = '```md\n| a | b |\n| --- | --- |\n| 1 | 2 |\n```\n'
  assert.equal(collectTables(fenced).length, 0)
  assert.equal(reuseTables(fenced, fenced), fenced)
})

test('多张同表头表格按出现序号配对', () => {
  const before = `${ORIGINAL_TABLE}\n第二张：\n\n${ORIGINAL_TABLE.replace('房租', '水电')}`
  const after = `${SERIALIZED_TABLE}\n第二张：\n\n${SERIALIZED_TABLE.replace('房租', '水电')}`
  const reused = reuseTables(before, after)
  // 两张都命中：第一张换原文，第二张也换原文
  assert.equal(reused, before)
  // 只改第二张的单元格：第一张仍复用原文，第二张保留规范输出
  const secondChanged = after.replace('| 水电  | 3200', '| 水电  | 9999')
  const mixed = reuseTables(before, secondChanged)
  assert.ok(mixed.startsWith(ORIGINAL_TABLE))
  assert.ok(mixed.includes('| 水电  | 9999'))
  assert.ok(!mixed.includes('| 水电  | 3200 |\n| 书   | 180  | 240  |\n\n'))
})

test('splitCells 支持 \\| 转义，不把转义符当列分隔', () => {
  assert.deepEqual(splitCells('| 管道 \\| 字符 | 1 |'), ['管道 | 字符', '1'])
})

test('表格前后空行不属于表格块，复用只换表格行', () => {
  const before = '前文\n\n\n' + ORIGINAL_TABLE + '\n\n\n后文\n'
  const after = '前文\n\n\n' + SERIALIZED_TABLE + '\n\n\n后文\n'
  const reused = reuseTables(before, after)
  assert.equal(reused, before)
  const tables = collectTables(before)
  assert.equal(tables.length, 1)
  assert.equal(tables[0].lines.length, 4)
})

test('定义消失但正文仍引用 → 拦截', () => {
  const before = '正文[^1]。\n\n[^1]: 定义\n'
  const after = '正文[^1]。\n'
  const loss = classify(before, after).find((item) => item.kind === 'footnote-loss')
  assert.ok(loss)
  assert.equal(loss.blocking, true)
})

test('引用与定义一起删 → 不拦截', () => {
  const before = '正文[^1]。\n\n[^1]: 定义\n'
  const after = '正文。\n'
  assert.equal(classify(before, after).some((item) => item.kind === 'footnote-loss'), false)
})

test('多行续行仍在时定义消失不被重复计入', () => {
  const before = '正文[^1]。\n\n[^1]: 首行\n    续行\n'
  const after = '正文[^1]。\n\n[^1]: 首行\n'
  const kinds = classify(before, after).map((item) => item.kind)
  assert.equal(kinds.includes('footnote-loss'), false)
  assert.equal(kinds.includes('footnote-continuation'), true)
})
test('公式里的 \\$ 转义消失 → 拦截', () => {
  const before = '价格 \\$100 与 $x^2$。\n'
  const after = '价格 $100 与 $x^2$。\n'
  const loss = classify(before, after).find((item) => item.kind === 'math-escape')
  assert.ok(loss)
  assert.equal(loss.blocking, true)
})

test('公式环境消失 → 拦截', () => {
  const before = '$$\n\\begin{aligned}a&=b\\end{aligned}\n$$\n'
  const after = '$$\na=b\n$$\n'
  assert.ok(classify(before, after).some((item) => item.kind === 'math-escape' && item.blocking))
})

test('公式与转义都在 → 不误报 math-escape', () => {
  const text = '价格 \\$100 与 $x^2$。\n'
  assert.equal(classify(text, text).some((item) => item.kind === 'math-escape'), false)
})

test('2 空格段首正文不被当作脚注续行', () => {
  const before = '正文[^a]。\n\n[^a]: 定义\n  两空格段落\n'
  const after = '正文[^a]。\n\n[^a]: 定义\n\n  两空格段落\n'
  assert.equal(classify(before, after).some((item) => item.kind === 'footnote-loss' || item.kind === 'footnote-continuation'), false)
})

for (const eol of ['\n', '\r\n']) {
  const name = eol === '\n' ? 'LF' : 'CRLF'
  for (let pairs = 0; pairs <= 5; pairs += 1) {
    test(`尾部空行 ${pairs} 对（${name}）三次保存稳定`, () => {
      let text = `A${eol.repeat(pairs)}`
      const dirty = 'A\n\n&nbsp;\n&nbsp;\n'
      for (let round = 0; round < 3; round += 1) text = applyTrailingNewlines(dirty, text)
      assert.equal(text, `A${eol.repeat(pairs)}`)
      assert.equal((text.match(/&nbsp;/g) ?? []).length, 0)
      if (pairs > 0 && eol === '\r\n') assert.ok(text.includes('\r\n'))
    })
  }
}