import assert from 'node:assert/strict'
import test from 'node:test'

import { MarkdownManager } from '@tiptap/markdown'
import { StarterKit } from '@tiptap/starter-kit'

import { escapeHtmlForParse } from './html.ts'
import { inlineSyntaxMarks } from './inlineSyntax.ts'
import { serializeDocumentBody } from './serializeDocument.ts'
import { disableSingleTildeStrike } from './tilde.ts'

/**
 * 第 55 轮 B-101：`==高亮==` / `^上标^` / `~下标~`。
 * 开关是一个可变的闸门（与 App 的 ref 同形）：同一个 manager 里切开关，才测得到「不刷新也不改已有字面」。
 * 注意：@tiptap/markdown 用的是全局 marked 单例，同一进程里建两个带不同闸门的 manager 会互相串味，
 * 所以本文件只建一个 manager，用例之间只改闸门（第 55 轮实测）。
 */
let enabled = false
const manager = new MarkdownManager({ extensions: [StarterKit, ...inlineSyntaxMarks()] })
disableSingleTildeStrike(manager, () => enabled)

/** 与 App 保存链同口径：解析前转义标签形状的 `<`，序列化后过 serializeDocument 的 repair 链 */
function roundTrip(source: string): string {
  const parsed = manager.parse(escapeHtmlForParse(source))
  return serializeDocumentBody({ getMarkdown: () => manager.serialize(parsed) }, source)
}

type Json = { type?: string; text?: string; marks?: { type?: string }[]; content?: Json[] }

/** 数 mark（strike 之类也是 mark，不在 node 上） */
function countMark(node: Json, type: string): number {
  const own = (node.marks ?? []).filter((mark) => mark.type === type).length
  return own + (node.content ?? []).reduce((sum, child) => sum + countMark(child, type), 0)
}

/** 正文文字里带这个 mark 的文本节点内容 */
function markedText(node: Json, type: string): string[] {
  const out: string[] = []
  if (node.type === 'text' && (node.marks ?? []).some((mark) => mark.type === type)) out.push(node.text ?? '')
  for (const child of node.content ?? []) out.push(...markedText(child, type))
  return out
}

/** 关时四例：四条互不相同的行，各自成段 */
const FOUR = '==a==\n\n^b^\n\n~c~\n\n<mark>a</mark>\n'

test('关时四例往返逐字节同（默认关）', () => {
  enabled = false
  assert.equal(roundTrip(FOUR), FOUR)
  const parsed = manager.parse(escapeHtmlForParse(FOUR)) as Json
  for (const type of ['eqHighlight', 'caretSup', 'tildeSub']) {
    assert.equal(countMark(parsed, type), 0, `关着不该出 ${type}`)
  }
})

test('开时 ==a== 变 eqHighlight，写回仍是 ==a==', () => {
  enabled = true
  const parsed = manager.parse(escapeHtmlForParse('==a==')) as Json
  assert.equal(countMark(parsed, 'eqHighlight'), 1)
  assert.deepEqual(markedText(parsed, 'eqHighlight'), ['a'])
  assert.equal(roundTrip('==a=='), '==a==')
})

test('开时 ^b^ 变 caretSup、~c~ 变 tildeSub，写回符号不变', () => {
  enabled = true
  const sup = manager.parse(escapeHtmlForParse('x^b^')) as Json
  assert.equal(countMark(sup, 'caretSup'), 1)
  assert.deepEqual(markedText(sup, 'caretSup'), ['b'])
  const sub = manager.parse(escapeHtmlForParse('H~c~O')) as Json
  assert.equal(countMark(sub, 'tildeSub'), 1)
  assert.deepEqual(markedText(sub, 'tildeSub'), ['c'])
  assert.equal(roundTrip('x^b^\n\nH~c~O\n'), 'x^b^\n\nH~c~O\n')
})

test('开时 <mark>a</mark> 仍走行内 HTML 白名单，不归 eqHighlight', () => {
  enabled = true
  const parsed = manager.parse(escapeHtmlForParse('<mark>a</mark>')) as Json
  assert.equal(countMark(parsed, 'eqHighlight'), 0)
  assert.equal(countMark(parsed, 'inlineMark'), 0, 'Node 里没有 DOM，白名单标签是字面文本')
  assert.equal(roundTrip('<mark>a</mark>'), '<mark>a</mark>')
})

test('开时 ~~删除线~~ 仍是删除线，不被下标抢走', () => {
  enabled = true
  const parsed = manager.parse(escapeHtmlForParse('~~删除线~~')) as Json
  assert.equal(countMark(parsed, 'strike'), 1)
  assert.equal(countMark(parsed, 'tildeSub'), 0)
  assert.equal(roundTrip('~~删除线~~\n'), '~~删除线~~\n')
})

test('开时行内代码与围栏里的符号一个字节都不动', () => {
  enabled = true
  const source = '用 `==a==` 与 `~c~` 表示字面。\n\n```\n==x==\n^y^\n~z~\n```\n'
  const parsed = manager.parse(escapeHtmlForParse(source)) as Json
  assert.equal(countMark(parsed, 'eqHighlight'), 0)
  assert.equal(countMark(parsed, 'tildeSub'), 0)
  assert.equal(roundTrip(source), source)
})

test('边界不误判：====、2^10、孤立 ~ 都还是字面', () => {
  enabled = true
  for (const source of ['====\n', '2^10 是 1024。\n', '温度 25~ 左右。\n', 'a == b\n']) {
    assert.equal(countMark(manager.parse(escapeHtmlForParse(source)) as Json, 'eqHighlight'), 0)
    assert.equal(countMark(manager.parse(escapeHtmlForParse(source)) as Json, 'caretSup'), 0)
    assert.equal(countMark(manager.parse(escapeHtmlForParse(source)) as Json, 'tildeSub'), 0)
    assert.equal(roundTrip(source), source)
  }
})

test('同会话关开关不刷新：已解析的字面不改，再解析才变', () => {
  enabled = true
  const literal = manager.parse(escapeHtmlForParse('==a==')) as Json
  assert.equal(countMark(literal, 'eqHighlight'), 1)
  // 关掉开关（不重建 manager、不刷新页面）：已经解析好的文档不重排
  enabled = false
  assert.equal(countMark(literal, 'eqHighlight'), 1, '已有文档不因关开关被重排')
  assert.equal(countMark(manager.parse(escapeHtmlForParse('==a==')) as Json, 'eqHighlight'), 0)
  enabled = true
})

test('开关前后写回字节一致（开与关都写回 ==a==）', () => {
  enabled = true
  const on = roundTrip('==a== 与 ^b^ 与 ~c~\n')
  enabled = false
  const off = roundTrip('==a== 与 ^b^ 与 ~c~\n')
  enabled = true
  assert.equal(on, '==a== 与 ^b^ 与 ~c~\n')
  assert.equal(off, on)
})
