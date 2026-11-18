import assert from 'node:assert/strict'
import test from 'node:test'

import type { Mark } from '@tiptap/core'
import { MarkdownManager } from '@tiptap/markdown'
import { StarterKit } from '@tiptap/starter-kit'

import { escapeHtmlForParse } from './html.ts'
import { inlineSyntaxMarks, pasteMatches, typedMatch } from './inlineSyntax.ts'
import { serializeDocumentBody } from './serializeDocument.ts'
import { disableSingleTildeStrike } from './tilde.ts'

/**
 * 第 55 轮 B-101：`==高亮==` / `^上标^` / `~下标~`。
 * 开关是一个可变的闸门（与 App 的 ref 同形）：同一个 manager 里切开关，才测得到「不刷新也不改已有字面」。
 * 注意：@tiptap/markdown 用的是全局 marked 单例，同一进程里建两个带不同闸门的 manager 会互相串味，
 * 所以本文件只建一个 manager，用例之间只改闸门（第 55 轮实测）。
 */
let enabled = false
/** 第 84 轮 B-214：输入规则的闸门与解析同一个 ref（App 传 `() => inlineSyntaxRef.current`） */
const SYNTAX_MARKS = inlineSyntaxMarks(() => enabled)
const manager = new MarkdownManager({ extensions: [StarterKit, ...SYNTAX_MARKS] })
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

type RuleFinder = (text: string) => { index: number; text: string; replaceWith?: string } | null

/** 取一枚 mark 的输入规则。Tiptap 在 `addInputRules` 里读 `this.type` 建 mark；这里只测 `find`，
 * 给 `type: null` 就够（handler 里的 type.create 不会被调用）。
 */
function inputRulesOf(mark: Mark): Array<{ find: RuleFinder | RegExp }> {
  const add = mark.config.addInputRules as unknown as
    | ((this: { type: unknown }) => Array<{ find: RuleFinder | RegExp }>)
    | undefined
  assert.equal(typeof add, 'function', `${mark.name} 应有 addInputRules`)
  if (typeof add !== 'function') throw new Error(`${mark.name} 缺 addInputRules`)
  return add.call({ type: null })
}

/** 第 86 轮 B-215：粘贴规则与输入规则分开测（同一枚 mark 上各 1 条） */
type PasteFinder = (text: string, event?: ClipboardEvent | null) => Array<{ index: number; text: string; replaceWith?: string }> | null | undefined

function pasteRulesOf(mark: Mark): Array<{ find: PasteFinder | RegExp }> {
  const add = (mark.config as { addPasteRules?: unknown }).addPasteRules as unknown as
    | ((this: { type: unknown }) => Array<{ find: PasteFinder | RegExp }>)
    | undefined
  assert.equal(typeof add, 'function', `${mark.name} 应有 addPasteRules`)
  if (typeof add !== 'function') throw new Error(`${mark.name} 缺 addPasteRules`)
  return add.call({ type: null })
}

function pasteFinderOf(mark: Mark): PasteFinder {
  const rules = pasteRulesOf(mark)
  assert.equal(rules.length, 1, `${mark.name} 应恰有 1 条粘贴规则`)
  const find = rules[0].find
  assert.equal(typeof find, 'function', `${mark.name} 的粘贴规则要能吃字符串（函数式 finder）`)
  return find as PasteFinder
}

function finderOf(mark: Mark): RuleFinder {
  const rules = inputRulesOf(mark)
  assert.equal(rules.length, 1, `${mark.name} 应恰有 1 条输入规则`)
  const find = rules[0].find
  assert.equal(typeof find, 'function', `${mark.name} 的规则要能吃「光标前文本」字符串（函数式 finder）`)
  return find as RuleFinder
}

function markNamed(name: string): Mark {
  const found = SYNTAX_MARKS.find((mark) => mark.name === name)
  assert.ok(found, `没有 ${name}`)
  return found
}

/** 关时四例：四条互不相同的行，各自成段 */
const FOUR = '==a==\n\n^b^\n\n~c~\n\n<mark>a</mark>\n'

test('显式关时四例往返逐字节同（设置里关掉）', () => {
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

/**
 * 第 56 轮 B-119：finder 复现串。修前 5 条都红（连续符号段把第二对当定界符、空格旁的单侧符号被吃成定界符）。
 * 期望：连续段与不贴内容的定界符按字面保存，写回逐字节不变。
 */
test('B-119：==== 与 ==不闭合 按字面保存', () => {
  enabled = true
  const source = '==== 与 ==不闭合\n'
  const parsed = manager.parse(escapeHtmlForParse(source)) as Json
  assert.deepEqual(markedText(parsed, 'eqHighlight'), [])
  assert.equal(roundTrip(source), source)
})

test('B-119：x ==== y ==z 按字面保存', () => {
  enabled = true
  const source = 'x ==== y ==z\n'
  const parsed = manager.parse(escapeHtmlForParse(source)) as Json
  assert.deepEqual(markedText(parsed, 'eqHighlight'), [])
  assert.equal(roundTrip(source), source)
})

test('B-119：^^ 与 ^不闭合 按字面保存', () => {
  enabled = true
  const source = '^^ 与 ^不闭合\n'
  const parsed = manager.parse(escapeHtmlForParse(source)) as Json
  assert.deepEqual(markedText(parsed, 'caretSup'), [])
  assert.equal(roundTrip(source), source)
})

test('B-119：a ^ b 与 c^d 按字面保存', () => {
  enabled = true
  const source = 'a ^ b 与 c^d\n'
  const parsed = manager.parse(escapeHtmlForParse(source)) as Json
  assert.deepEqual(markedText(parsed, 'caretSup'), [])
  assert.equal(roundTrip(source), source)
})

test('B-119：~a~ ~b~ 与 a ~ b 与 H~2~O 只认成对且不贴空白的', () => {
  enabled = true
  const source = '~a~ ~b~ 与 a ~ b 与 H~2~O\n'
  const parsed = manager.parse(escapeHtmlForParse(source)) as Json
  assert.deepEqual(markedText(parsed, 'tildeSub'), ['a', 'b', '2'])
  assert.equal(roundTrip(source), source)
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

/**
 * 第 83 轮 A2：`\=` 保存后字节保真。
 * marked 的 escape 规则会把 `\=` 吃成 `=`，保存时反斜杠就丢了；现在 `\=` 由 eqEscaped mark 接住、
 * 序列化时补回反斜杠。`\=` 不是快捷语法，开关关着也要保真。
 */
test('A2：\\==a== 保存字节同，且不产生 eqHighlight', () => {
  enabled = true
  const source = '\\==a== 结尾\n'
  assert.equal(roundTrip(source), source)
  assert.equal(countMark(manager.parse(escapeHtmlForParse(source)) as Json, 'eqHighlight'), 0)
  assert.deepEqual(markedText(manager.parse(escapeHtmlForParse(source)) as Json, 'eqEscaped'), ['='])
})

test('A2：\\==**b**c== 保存字节同，不产生 eqHighlight', () => {
  enabled = true
  const source = '\\==**b**c==\n'
  assert.equal(roundTrip(source), source)
  assert.equal(countMark(manager.parse(escapeHtmlForParse(source)) as Json, 'eqHighlight'), 0)
})

test('A2：\\===a=== 只转义第一枚 =，剩下 ==a== 仍解析且二次解析计数不变', () => {
  enabled = true
  const source = '\\===a===\n'
  const first = roundTrip(source)
  assert.equal(first, source)
  assert.equal(countMark(manager.parse(escapeHtmlForParse(source)) as Json, 'eqHighlight'), 1)
  // 二次解析：写回的字节再读一遍，eqHighlight 仍是 1（不是靠第一次解析的残留在撑）
  assert.equal(countMark(manager.parse(escapeHtmlForParse(first)) as Json, 'eqHighlight'), 1)
})

test('A2：空格旁的 \\= 与公式里的 TeX \\= 都保存字节同', () => {
  enabled = true
  for (const source of ['a \\== b\n', '\\== 单独\n', '$\\alpha \\= x$\n']) {
    assert.equal(roundTrip(source), source, `字节应不变：${JSON.stringify(source)}`)
  }
  // 这个 manager 没装公式扩展，`$…$` 只是普通文本，`\=` 仍走 eqEscaped；
  // 真解析路径（inlineMath 1、escapedNodes 0）由带 Mathematics 的探针锁：.tmp/r83-a2-eq-escape.ts
  assert.equal(countMark(manager.parse(escapeHtmlForParse('$\\alpha \\= x$')) as Json, 'eqEscaped'), 1)
})

test('A2：相邻两枚 \\=\\= 各占一个文本节点，写回两枚反斜杠', () => {
  enabled = true
  const source = '\\=\\=\n'
  const parsed = manager.parse(escapeHtmlForParse(source)) as Json
  assert.deepEqual(markedText(parsed, 'eqEscaped'), ['=', '='], '两枚 mark 不能并成一个文本节点')
  assert.equal(roundTrip(source), source)
  assert.equal(roundTrip('x \\=\\= y\n'), 'x \\=\\= y\n')
})

test('A2：开关关着 \\= 也保真，行内代码里的 \\= 不产生 mark', () => {
  enabled = false
  assert.equal(roundTrip('\\==a==\n'), '\\==a==\n')
  const code = '用 `\\=` 表示字面。\n'
  assert.equal(countMark(manager.parse(escapeHtmlForParse(code)) as Json, 'eqEscaped'), 0)
  assert.equal(roundTrip(code), code)
  enabled = true
})


/**
 * 第 84 轮 B-214：手打不渲染（真机 `.sl-eq`/`.sl-sup`/`.sl-sub` 0/0/0，重解析才 1/1/1）。
 * 现在三枚 mark 带输入规则：Tiptap 把「光标前的整段文本」交给 finder，只有匹配正好结束在光标处
 * （入参末尾）才转换；`markInputRule` 删两端定界符、写回由 renderMarkdown 补。
 * 下面按「光标状态」喂前缀串，直接测 finder 的判定。
 */
test('输入规则：==红== 与 甲==乙== 命中，replaceWith 是内容', () => {
  enabled = true
  const hit = typedMatch('eqHighlight', '==红==')
  assert.deepEqual(hit, { index: 0, text: '==红==', replaceWith: '红' })
  // 前面还有别的字：只吃最后一对
  assert.deepEqual(typedMatch('eqHighlight', '甲==乙=='), { index: 1, text: '==乙==', replaceWith: '乙' })
})

test('输入规则：x^上^ / H~2~ / ~a~ ~b~ 命中，只吃最后一对', () => {
  enabled = true
  assert.deepEqual(typedMatch('caretSup', 'x^上^'), { index: 1, text: '^上^', replaceWith: '上' })
  assert.deepEqual(typedMatch('tildeSub', 'H~2~'), { index: 1, text: '~2~', replaceWith: '2' })
  // 前一对称号已经收尾：光标停在最后一位时只该转换最后一对
  assert.deepEqual(typedMatch('tildeSub', '~a~ ~b~'), { index: 4, text: '~b~', replaceWith: 'b' })
})

test('输入规则负例：==== / == a == / a == b 都不命中', () => {
  enabled = true
  for (const text of ['====', '== a ==', 'a == b', '==不闭合']) {
    assert.equal(typedMatch('eqHighlight', text), null, `${JSON.stringify(text)} 不该命中`)
  }
})

test('输入规则负例：2^10 / \==a== / ~~删除线~~ 都不命中', () => {
  enabled = true
  assert.equal(typedMatch('caretSup', '2^10'), null)
  assert.equal(typedMatch('eqHighlight', '\\==a=='), null)
  assert.equal(typedMatch('tildeSub', '~~删除线~~'), null, '删除线留给 Strike')
  assert.equal(typedMatch('tildeSub', '温度 25~'), null)
})

test('输入规则：关态（设置里关掉）规则 find 恒 null，开态才命中', () => {
  const marks = inlineSyntaxMarks(() => enabled)
  const eq = marks.find((mark) => mark.name === 'eqHighlight')
  assert.ok(eq)
  enabled = false
  assert.equal(finderOf(eq)('==红=='), null, '关态手打保持字面')
  enabled = true
  assert.deepEqual(finderOf(eq)('==红=='), { index: 0, text: '==红==', replaceWith: '红' })
})

test('输入规则：三枚语法 mark 各 1 条规则，\\= 的 eqEscaped 没有', () => {
  for (const name of ['eqHighlight', 'caretSup', 'tildeSub']) {
    assert.equal(inputRulesOf(markNamed(name)).length, 1, `${name} 应恰 1 条`)
  }
  const escaped = markNamed('eqEscaped')
  const add = escaped.config.addInputRules as unknown
  assert.equal(add, undefined, 'eqEscaped 不该有输入规则（\\= 只走解析）')
})

test('输入规则：尾锚定——符号后面还有字（光标没停在收尾符上）不命中', () => {
  enabled = true
  const find = finderOf(markNamed('eqHighlight'))
  assert.equal(find('==红== 后面还有字'), null)
  assert.equal(find('字面文本'), null)
  assert.deepEqual(find('==红=='), { index: 0, text: '==红==', replaceWith: '红' })
})

test('输入规则：replaceWith 一定是命中串的子串（否则 Tiptap 会 warn）', () => {
  enabled = true
  for (const kind of ['eqHighlight', 'caretSup', 'tildeSub'] as const) {
    const find = finderOf(markNamed(kind))
    const sample = kind === 'eqHighlight' ? '==内容==' : kind === 'caretSup' ? '^内容^' : '~内容~'
    const hit = find(sample)
    assert.ok(hit, `${kind} 应命中`)
    assert.equal(typeof hit.replaceWith, 'string', `${kind} 缺 replaceWith`)
    assert.ok(hit.text.includes(hit.replaceWith ?? ''), `${kind} 的 replaceWith 不是子串`)
  }
})

test('输入规则：规则的 find 与 typedMatch 逐条一致', () => {
  enabled = true
  const cases: Array<[string, string]> = [
    ['==红==', 'eqHighlight'],
    ['甲==乙==', 'eqHighlight'],
    ['x^上^', 'caretSup'],
    ['H~2~', 'tildeSub'],
    ['~a~ ~b~', 'tildeSub'],
  ]
  for (const [text, kind] of cases) {
    const find = finderOf(markNamed(kind))
    assert.deepEqual(find(text), typedMatch(kind as never, text), `${kind} 的 find 应与 typedMatch 相同：${text}`)
  }
})

test('输入规则：手打转换后的文档与解析出来的结构同形（写回字节也同）', () => {
  enabled = true
  // 模拟输入规则产出的结构：定界符已删，只剩带 mark 的内容
  const typedDoc = {
    type: 'doc',
    content: [
      { type: 'paragraph', content: [{ type: 'text', text: '甲' }] },
      { type: 'paragraph', content: [{ type: 'text', text: '乙', marks: [{ type: 'eqHighlight' }] }] },
    ],
  }
  const serialized = manager.serialize(typedDoc)
  assert.equal(serialized, '甲\n\n==乙==')
  const parsed = manager.parse(escapeHtmlForParse(serialized)) as Json
  assert.equal(countMark(parsed, 'eqHighlight'), 1)
  assert.deepEqual(markedText(parsed, 'eqHighlight'), ['乙'])
})

/**
 * 第 86 轮 B-215：粘贴也出 mark。手打有输入规则，粘贴是整段文字一次落进文档、输入规则不跑，
 * 所以给同一枚 mark 挂 tiptap 的 `markPasteRule`。判定仍是纯函数 `pasteMatches`，
 * 它比 `typedMatch` 多的只有「不尾锚定、一次返回全部不重叠的命中」。
 */
test('粘贴规则：一行两对 ==a== 与 ==b== 全命中，index 是各对起点', () => {
  enabled = true
  const hits = pasteMatches('eqHighlight', '==a== 与 ==b==')
  assert.deepEqual(hits, [
    { index: 0, text: '==a==', replaceWith: 'a' },
    { index: 8, text: '==b==', replaceWith: 'b' },
  ])
  assert.equal(pasteFinderOf(markNamed('eqHighlight'))('==a== 与 ==b==')?.length, 2)
})

test('粘贴规则：==红== 与 ^上^ 与 ~下~ 三枚各 1 对，互不抢', () => {
  enabled = true
  const text = '==红== 与 ^上^ 与 ~下~'
  assert.deepEqual(pasteMatches('eqHighlight', text), [{ index: 0, text: '==红==', replaceWith: '红' }])
  assert.deepEqual(pasteMatches('caretSup', text), [{ index: 8, text: '^上^', replaceWith: '上' }])
  assert.deepEqual(pasteMatches('tildeSub', text), [{ index: 14, text: '~下~', replaceWith: '下' }])
})

test('粘贴规则负例：a == b / ==== / \\==a== / 2^10 都不命中', () => {
  enabled = true
  assert.deepEqual(pasteMatches('eqHighlight', 'a == b'), [])
  assert.deepEqual(pasteMatches('eqHighlight', '===='), [])
  assert.deepEqual(pasteMatches('eqHighlight', '\\==a=='), [])
  assert.deepEqual(pasteMatches('caretSup', '2^10'), [])
  assert.deepEqual(pasteMatches('caretSup', 'a ^ b'), [])
  assert.deepEqual(pasteMatches('tildeSub', '温度 25~ 左右'), [])
})

test('粘贴规则：~~删除线~~ 留给 Strike，~a~ ~b~ 仍是两对下标', () => {
  enabled = true
  assert.deepEqual(pasteMatches('tildeSub', '~~删除线~~'), [])
  assert.equal(pasteMatches('tildeSub', '~a~ ~b~').length, 2)
})

test('粘贴规则：三枚语法 mark 各 1 条，\\= 的 eqEscaped 没有', () => {
  for (const name of ['eqHighlight', 'caretSup', 'tildeSub']) {
    assert.equal(pasteRulesOf(markNamed(name)).length, 1, `${name} 应恰 1 条粘贴规则`)
  }
  const escaped = markNamed('eqEscaped') as unknown as { config: { addPasteRules?: unknown } }
  assert.equal(escaped.config.addPasteRules, undefined, 'eqEscaped 不该有粘贴规则（\\= 只走解析）')
})

test('粘贴规则：关态 find 返回 []，开态才命中；replaceWith 一定是命中串子串', () => {
  const marks = inlineSyntaxMarks(() => enabled)
  const eq = marks.find((mark) => mark.name === 'eqHighlight')
  assert.ok(eq)
  const find = pasteFinderOf(eq)
  enabled = false
  assert.deepEqual(find('==红=='), [], '关态粘贴保持字面')
  enabled = true
  for (const kind of ['eqHighlight', 'caretSup', 'tildeSub'] as const) {
    const sample = kind === 'eqHighlight' ? '==内容==' : kind === 'caretSup' ? '^内容^' : '~内容~'
    const hits = pasteFinderOf(markNamed(kind))(sample) ?? []
    assert.equal(hits.length, 1, `${kind} 应命中`)
    const hit = hits[0]
    assert.equal(typeof hit.replaceWith, 'string', `${kind} 缺 replaceWith`)
    assert.ok(hit.text.includes(hit.replaceWith ?? ''), `${kind} 的 replaceWith 不是命中串子串`)
  }
})

test('粘贴规则：末尾一对与 typedMatch 一致；光标没停在收尾符上也照样命中', () => {
  enabled = true
  const cases: Array<[string, string]> = [
    ['==红==', 'eqHighlight'],
    ['甲==乙==', 'eqHighlight'],
    ['x^上^', 'caretSup'],
    ['H~2~', 'tildeSub'],
    ['~a~ ~b~', 'tildeSub'],
  ]
  for (const [text, kind] of cases) {
    const hits = pasteMatches(kind as never, text)
    assert.deepEqual(hits[hits.length - 1], typedMatch(kind as never, text), `${kind} 末尾一对应与 typedMatch 同：${text}`)
  }
  // 差别就在尾锚定：后面还有字时手打规则不命中（光标没停在收尾符），粘贴规则仍要命中
  assert.equal(typedMatch('eqHighlight', '==红== 后面还有字'), null)
  assert.deepEqual(pasteMatches('eqHighlight', '==红== 后面还有字'), [
    { index: 0, text: '==红==', replaceWith: '红' },
  ])
})
