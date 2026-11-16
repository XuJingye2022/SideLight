import assert from 'node:assert/strict'
import test from 'node:test'

import { getSchema } from '@tiptap/core'
import { StarterKit } from '@tiptap/starter-kit'

import { DEFAULT_ANALYSIS_PROMPT } from './prompt.ts'
import { loadSettings } from './settings.ts'
import {
  buildTextIndex,
  findRange,
  parseStream,
  parseAnnotationStore,
  replaceInWindow,
  resolveAnnotations,
  serializeAnnotationStore,
  shiftAnnotations,
  type Annotation,
  type ParsedAnnotation,
} from './annotations.ts'

const PARA_ONE = '第一段写得很平。这里重复一句话。'
const PARA_TWO_HEAD = '第二段前半句还在讲道理，'
const PARA_TWO_TAIL = '后半句突然加重语气。'
const PARA_THREE = '第三段也写。这里重复一句话。'

/** 跨两个文本节点的引文：前半截在普通文本，后半截在粗体里 */
const BOLD_QUOTE = '还在讲道理，后半句突然'

const schema = getSchema([StarterKit])

const doc = schema.nodeFromJSON({
  type: 'doc',
  content: [
    {
      type: 'paragraph',
      content: [{ type: 'text', text: PARA_ONE }],
    },
    {
      type: 'paragraph',
      content: [
        { type: 'text', text: PARA_TWO_HEAD },
        { type: 'text', marks: [{ type: 'bold' }], text: PARA_TWO_TAIL },
      ],
    },
    {
      type: 'paragraph',
      content: [{ type: 'text', text: PARA_THREE }],
    },
  ],
})

/* ---------- 流式解析 ---------- */

test('半行留在 rest，补齐后才产出一条批注', () => {
  const line = '{"kind":"evaluation","quote":"这里重复一句话。","note":"重复了。"}\n'
  const cut = 18
  const first = parseStream(line.slice(0, cut))

  assert.equal(first.items.length, 0)
  assert.equal(first.rest, line.slice(0, cut))

  const second = parseStream(first.rest + line.slice(cut))
  assert.deepEqual(second.items, [{ kind: 'evaluation', quote: '这里重复一句话。', note: '重复了。' }])
  assert.equal(second.rest, '')
})

test('已经完整的行立即产出，剩下的留到下一次', () => {
  const buffer = '{"kind":"evaluation","quote":"第三段也写。","note":"太短。"}\n{"kind":"eval'
  const step = parseStream(buffer)

  assert.equal(step.items.length, 1)
  assert.equal(step.rest, '{"kind":"eval')

  const done = parseStream(`${step.rest}uation","quote":"这里重复一句话。","note":"重复。"}\n`)
  assert.deepEqual(done.items, [{ kind: 'evaluation', quote: '这里重复一句话。', note: '重复。' }])
  assert.equal(done.rest, '')
  assert.deepEqual(parseStream(''), { items: [], rest: '' })
})

test('代码围栏包裹的 JSONL 能剥掉', () => {
  const fenced = [
    '```json',
    '{"kind":"revision","quote":"这里重复一句话。","note":"重复了。","replacement":"这句话只留一次。"}',
    '{"kind":"evaluation","quote":"第三段也写。","note":"收尾太仓促。"}',
    '```',
  ].join('\n')

  const result = parseStream(`${fenced}\n`)
  assert.equal(result.rest, '')
  assert.equal(result.items.length, 2)
  assert.deepEqual(result.items[0], {
    kind: 'revision',
    quote: '这里重复一句话。',
    note: '重复了。',
    replacement: '这句话只留一次。',
  })
  assert.deepEqual(result.items[1], { kind: 'evaluation', quote: '第三段也写。', note: '收尾太仓促。' })
})

test('坏行静默跳过，好行照常返回', () => {
  const lines = [
    'not json',
    '[]',
    'null',
    '42',
    '{"kind":"praise","quote":"甲","note":"乙"}',
    '{"kind":"evaluation","quote":"","note":"乙"}',
    '{"kind":"evaluation","quote":"甲","note":"   "}',
    '{"kind":"evaluation","quote":"甲"}',
    '{"kind":"revision","quote":"甲","note":"乙"}',
    '{"kind":"revision","quote":"甲","note":"乙","replacement":""}',
    '{"kind":"revision","quote":"甲","note":"乙","replacement":3}',
    '{"kind":"evaluation","quote":"第一段写得很平。","note":"起句太虚。"}',
    '{"kind":"revision","quote":"第三段也写。","note":"收尾太仓促。","replacement":"第三段收束全篇。"}',
  ]

  const result = parseStream(`${lines.join('\n')}\n`)
  assert.equal(result.rest, '')
  assert.deepEqual(result.items, [
    { kind: 'evaluation', quote: '第一段写得很平。', note: '起句太虚。' },
    { kind: 'revision', quote: '第三段也写。', note: '收尾太仓促。', replacement: '第三段收束全篇。' },
  ])
})

/* ---------- 正文索引与定位 ---------- */

test('buildTextIndex 用换行分隔段落，positions 与 text 等长', () => {
  const index = buildTextIndex(doc)

  assert.equal(index.text, `${PARA_ONE}\n${PARA_TWO_HEAD}${PARA_TWO_TAIL}\n${PARA_THREE}`)
  assert.equal(index.positions.length, index.text.length)
  assert.equal(index.text.split('\n').length, 3)
  assert.equal(index.positions[16], 18)
  assert.equal(index.positions[39], 42)

  // 第一个字的位置就是文档位置，不是文本下标
  assert.equal(doc.textBetween(index.positions[0], index.positions[0] + 1), '第')

  for (let i = 1; i < index.positions.length; i++) {
    assert.ok(index.positions[i] >= index.positions[i - 1], `第 ${i} 个位置倒退了`)
  }
})

test('引文跨粗体文本节点时定位到正确 from/to', () => {
  // 第二段由两个文本节点组成，引文前半截正常、后半截带粗体
  assert.equal(doc.child(1).childCount, 2)

  const index = buildTextIndex(doc)
  const range = findRange(index, BOLD_QUOTE)

  assert.ok(range)
  assert.deepEqual(range, { from: 25, to: 36 })
  assert.equal(doc.textBetween(range.from, range.to), BOLD_QUOTE)
})

test('正文里没有的引文返回 null', () => {
  const index = buildTextIndex(doc)
  assert.equal(findRange(index, '这句话正文里没有。'), null)
})

test('引文跨段（含分隔符）时返回 null', () => {
  const index = buildTextIndex(doc)

  // 这段文字在 text 里确实连在一起，但中间隔着块分隔符，不能算命中
  assert.ok(index.text.includes('一句话。\n第二段前半句'))
  assert.equal(findRange(index, '一句话。\n第二段前半句'), null)
})

test('两段有相同文字时，各自落在自己那段', () => {
  const index = buildTextIndex(doc)
  const quote = '这里重复一句话。'

  const first = findRange(index, quote)
  assert.ok(first)
  assert.deepEqual(first, { from: 9, to: 17 })
  assert.equal(doc.textBetween(first.from, first.to), quote)

  const second = findRange(index, quote, first.to)
  assert.ok(second)
  assert.deepEqual(second, { from: 49, to: 57 })
  assert.equal(doc.textBetween(second.from, second.to), quote)

  // 引文带上第三段独有的前缀，只可能落在第三段
  assert.deepEqual(findRange(index, PARA_THREE), { from: 43, to: 57 })
})

/* ---------- 解析结果落到批注 ---------- */

test('resolveAnnotations 丢掉定位失败的条目，并给每条不同 id', () => {
  const index = buildTextIndex(doc)
  const items: ParsedAnnotation[] = [
    {
      kind: 'revision',
      quote: BOLD_QUOTE,
      note: '语气跳得太快。',
      replacement: '还在讲道理，后半句忽然加重。',
    },
    { kind: 'evaluation', quote: '这句正文里没有。', note: '定位不到。' },
    { kind: 'evaluation', quote: '第三段也写。', note: '收尾太仓促。' },
  ]

  const annotations: Annotation[] = resolveAnnotations(items, index)

  assert.equal(annotations.length, 2)
  assert.deepEqual(
    { from: annotations[0].from, to: annotations[0].to },
    { from: 25, to: 36 },
  )
  assert.equal(annotations[0].kind, 'revision')
  assert.equal(annotations[0].status, 'pending')
  assert.equal(annotations[0].note, '语气跳得太快。')
  assert.equal(annotations[0].replacement, '还在讲道理，后半句忽然加重。')

  assert.deepEqual({ from: annotations[1].from, to: annotations[1].to }, { from: 43, to: 49 })
  assert.equal(annotations[1].kind, 'evaluation')
  assert.equal(annotations[1].replacement, undefined)

  assert.notEqual(annotations[0].id, annotations[1].id)
  assert.ok(annotations.every((annotation) => annotation.id.length > 0))
})

test('同一条引文出现两次时落到两处，不挤在同一段', () => {
  const index = buildTextIndex(doc)
  const items: ParsedAnnotation[] = [
    { kind: 'evaluation', quote: '这里重复一句话。', note: '第一处。' },
    { kind: 'evaluation', quote: '这里重复一句话。', note: '第二处。' },
  ]

  const annotations = resolveAnnotations(items, index)

  assert.equal(annotations.length, 2)
  assert.deepEqual(
    annotations.map((annotation) => [annotation.from, annotation.to]),
    [
      [9, 17],
      [49, 57],
    ],
  )
})

/* ---------- 编辑之后修正位置 ---------- */

test('shiftAnnotations 区分编辑点之前、之内、之后', () => {
  const list = [
    { from: 2, to: 6, label: '编辑点之前' },
    { from: 10, to: 14, label: '跨越编辑点' },
    { from: 20, to: 24, label: '编辑点之后' },
  ]

  const shifted = shiftAnnotations(list, 12, 5)

  assert.deepEqual(shifted, [
    { from: 2, to: 6, label: '编辑点之前' },
    { from: 10, to: 19, label: '跨越编辑点' },
    { from: 25, to: 29, label: '编辑点之后' },
  ])

  // 原列表不动
  assert.deepEqual(list, [
    { from: 2, to: 6, label: '编辑点之前' },
    { from: 10, to: 14, label: '跨越编辑点' },
    { from: 20, to: 24, label: '编辑点之后' },
  ])
})

test('shiftAnnotations 处理删除，批注起点正好在编辑点也平移', () => {
  const list = [
    { from: 2, to: 6 },
    { from: 10, to: 16 },
    { from: 12, to: 16 },
    { from: 20, to: 24 },
  ]

  assert.deepEqual(shiftAnnotations(list, 12, -4), [
    { from: 2, to: 6 },
    { from: 10, to: 12 },
    { from: 8, to: 12 },
    { from: 16, to: 20 },
  ])
})

test('意图说明行能解析，且不参与定位', () => {
  const line = '{"kind":"meta","note":"我判断这段的意图是：写产品需求。"}'
  const parsed = parseStream(`${line}\n`)
  assert.equal(parsed.items.length, 1)
  assert.equal(parsed.items[0].kind, 'meta')
  assert.equal(parsed.items[0].quote, '')

  const schema = getSchema([StarterKit])
  const doc = schema.nodeFromJSON({
    type: 'doc',
    content: [{ type: 'paragraph', content: [{ type: 'text', text: '正文。' }] }],
  })
  const resolved = resolveAnnotations(parsed.items, buildTextIndex(doc), 0)
  assert.equal(resolved.length, 0)
})

/* ---------- 长文里重复句的定位 ---------- */

function repeatedDoc(): { index: ReturnType<typeof buildTextIndex>; starts: number[] } {
  const schema = getSchema([StarterKit])
  const doc = schema.nodeFromJSON({
    type: 'doc',
    content: [
      { type: 'paragraph', content: [{ type: 'text', text: '开头一段。' }] },
      { type: 'paragraph', content: [{ type: 'text', text: '这是重复的句子，出现在很多段里。' }] },
      { type: 'paragraph', content: [{ type: 'text', text: '这是重复的句子，出现在很多段里。' }] },
      { type: 'paragraph', content: [{ type: 'text', text: '这是重复的句子，出现在很多段里。' }] },
      { type: 'paragraph', content: [{ type: 'text', text: '结尾有个独一份的句子。' }] },
    ],
  })
  const index = buildTextIndex(doc)
  const quote = '这是重复的句子'
  const starts: number[] = []
  let cursor = index.text.indexOf(quote)
  while (cursor >= 0) {
    starts.push(cursor)
    cursor = index.text.indexOf(quote, cursor + 1)
  }
  return { index, starts }
}

test('重复句只落在给定窗口内', () => {
  const { index, starts } = repeatedDoc()
  const window = { start: starts[1], end: starts[2] - 1 }
  const resolved = resolveAnnotations([{ kind: 'evaluation', quote: '这是重复的句子', note: '重复' }], index, window)
  assert.equal(resolved.length, 1)
  assert.equal(resolved[0].from, index.positions[starts[1]])
})

test('窗口里有两次重复时按出现顺序各取一处', () => {
  const { index, starts } = repeatedDoc()
  const window = { start: starts[0], end: starts[2] - 1 }
  const items = [
    { kind: 'evaluation' as const, quote: '这是重复的句子', note: '一' },
    { kind: 'evaluation' as const, quote: '这是重复的句子', note: '二' },
  ]
  const resolved = resolveAnnotations(items, index, window)
  assert.equal(resolved.length, 2)
  assert.equal(resolved[0].from, index.positions[starts[0]])
  assert.equal(resolved[1].from, index.positions[starts[1]])
})

test('窗口外的唯一引文可以回退全篇', () => {
  const { index, starts } = repeatedDoc()
  const window = { start: starts[0], end: starts[0] + 6 }
  const resolved = resolveAnnotations([{ kind: 'evaluation', quote: '独一份的句子', note: '唯一' }], index, window)
  assert.equal(resolved.length, 1)
})

test('窗口外的重复引文不回退，避免绑到别的段落', () => {
  const { index } = repeatedDoc()
  const head = index.text.indexOf('开头一段')
  const window = { start: head, end: head + 3 }
  const resolved = resolveAnnotations([{ kind: 'evaluation', quote: '这是重复的句子', note: '重复' }], index, window)
  assert.equal(resolved.length, 0)
})

test('v2：overall 不需要 quote，未定位转 DocNote', () => {
  const parsed = parseStream('{"kind":"overall","note":"全文总评"}\n')
  assert.equal(parsed.items[0].kind, 'overall')
  assert.equal(parsed.items[0].quote, '')
  const store = parseAnnotationStore(JSON.stringify([{ id: 'a', kind: 'evaluation', status: 'pending', from: 1, to: 2, quote: 'q', note: 'n' }]))
  assert.equal(store.v, 2)
  assert.equal(store.annotations.length, 1)
  assert.deepEqual(JSON.parse(serializeAnnotationStore(store)), { v: 2, annotations: store.annotations, notes: [] })
})

test('replaceInWindow：两次重跑不翻倍、窗口外保留、id 复用', () => {
  const old = [
    { id: 'keep', kind: 'evaluation', status: 'pending', from: 100, to: 110, quote: '窗外', note: '保留' },
    { id: 'reuse', kind: 'evaluation', status: 'pending', from: 10, to: 20, quote: '窗内', note: '同一句' },
  ] as Annotation[]
  const fresh = [
    { id: 'new', kind: 'evaluation', status: 'pending', from: 11, to: 20, quote: '窗内', note: '同一句' },
  ] as Annotation[]
  const once = replaceInWindow(old, fresh, { start: 5, end: 30 })
  const twice = replaceInWindow(once, fresh, { start: 5, end: 30 })
  assert.equal(once.length, 2)
  assert.equal(twice.length, 2)
  assert.equal(once.find((item) => item.quote === '窗内')?.id, 'reuse')
  assert.ok(once.some((item) => item.id === 'keep'))
})

test('提示词 <=1500 字且含 overall 与硬规则', () => {
  assert.ok(DEFAULT_ANALYSIS_PROMPT.length <= 1500)
  assert.match(DEFAULT_ANALYSIS_PROMPT, /"kind":"overall"/)
  assert.match(DEFAULT_ANALYSIS_PROMPT, /最多 1 条 revision/)
})

test('设置：自定义提示词保留，空值回落默认', () => {
  const map = new Map()
  ;(globalThis as { localStorage?: unknown }).localStorage = {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => map.set(key, value),
    removeItem: (key: string) => map.delete(key),
    clear: () => map.clear(),
  }
  map.set('sidelight.settings.v1', JSON.stringify({ analysisPrompt: '我的自定义' }))
  assert.equal(loadSettings().analysisPrompt, '我的自定义')
  map.set('sidelight.settings.v1', JSON.stringify({ analysisPrompt: '' }))
  assert.equal(loadSettings().analysisPrompt, DEFAULT_ANALYSIS_PROMPT)
})
