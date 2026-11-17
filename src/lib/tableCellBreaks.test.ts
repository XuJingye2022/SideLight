import assert from 'node:assert/strict'
import test from 'node:test'

import { splitTableCellBreaks, type JSONContentLike } from './tableCellBreaks.ts'

function text(value: string, marks?: unknown[]): JSONContentLike {
  return marks ? { type: 'text', text: value, marks } : { type: 'text', text: value }
}

function cell(...content: JSONContentLike[]): JSONContentLike {
  return { type: 'tableCell', content: [{ type: 'paragraph', content }] }
}

function table(...cells: JSONContentLike[]): JSONContentLike {
  return {
    type: 'doc',
    content: [{ type: 'table', content: [{ type: 'tableRow', content: cells }] }],
  }
}

function firstCellContent(json: JSONContentLike): JSONContentLike[] {
  const tableNode = json.content?.[0]
  const row = tableNode?.content?.[0]
  const firstCell = row?.content?.[0]
  return firstCell?.content?.[0]?.content ?? []
}

const BREAK = { type: 'hardBreak' }

test('单元格内单个 <br> 拆成 text / hardBreak / text', () => {
  const out = splitTableCellBreaks(table(cell(text('3A<br>B'))))
  assert.deepEqual(firstCellContent(out), [text('3A'), BREAK, text('B')])
})

test('<br/>、<br /> 与大小写 <BR> 都认', () => {
  for (const markup of ['<br/>', '<br />', '<BR>', '<Br />']) {
    const out = splitTableCellBreaks(table(cell(text(`3A${markup}B`))))
    assert.deepEqual(firstCellContent(out), [text('3A'), BREAK, text('B')], markup)
  }
})

test('两个连续 <br> 产出两个 hardBreak', () => {
  const out = splitTableCellBreaks(table(cell(text('a<br><br>b'))))
  assert.deepEqual(firstCellContent(out), [text('a'), BREAK, BREAK, text('b')])
})

test('行尾 <br> 不产出空文本节点', () => {
  const out = splitTableCellBreaks(table(cell(text('a<br>'))))
  assert.deepEqual(firstCellContent(out), [text('a'), BREAK])
})

test('单元格没有 <br> 时返回同一对象（不复制）', () => {
  const doc = table(cell(text('普通单元格')))
  assert.equal(splitTableCellBreaks(doc), doc)
})

test('正文段落里的 <br> 不转换（只作用于单元格）', () => {
  const doc: JSONContentLike = {
    type: 'doc',
    content: [{ type: 'paragraph', content: [text('正文<br>不拆')] }],
  }
  assert.equal(splitTableCellBreaks(doc), doc)
  assert.deepEqual(doc.content?.[0].content, [text('正文<br>不拆')])
})

test('带格式的文本不拆（保住字节与表格整块复用）', () => {
  const bold = [{ type: 'bold' }]
  const doc = table(cell(text('A<br>B', bold)))
  assert.equal(splitTableCellBreaks(doc), doc)
  assert.deepEqual(firstCellContent(doc), [text('A<br>B', bold)])
})

test('不原地改入参：结果里没有指向旧数组的引用', () => {
  const doc = table(cell(text('3A<br>B')))
  const before = JSON.stringify(doc)
  const out = splitTableCellBreaks(doc)
  assert.equal(JSON.stringify(doc), before)
  assert.notEqual(out, doc)
  assert.deepEqual(firstCellContent(out), [text('3A'), BREAK, text('B')])
})
