import type { Node as ProseMirrorNode } from '@tiptap/pm/model'

export type AnnotationKind = 'revision' | 'evaluation'
export type AnnotationStatus = 'pending' | 'accepted' | 'dismissed'

/** 模型先给一条意图说明，再给批注 */
export type ParsedKind = AnnotationKind | 'meta'

export type ParsedAnnotation = {
  kind: ParsedKind
  quote: string
  note: string
  replacement?: string
}

export type Annotation = {
  id: string
  kind: AnnotationKind
  status: AnnotationStatus
  from: number
  to: number
  quote: string
  note: string
  replacement?: string
  /** 用户与这条批注的追问记录 */
  thread?: ChatTurn[]
  /** 联网核对拿回来的出处 */
  sources?: SearchSource[]
}

export type ChatTurn = {
  role: 'user' | 'assistant'
  text: string
}

export type SearchSource = {
  title: string
  url: string
  snippet: string
}

/** 正文索引：text 是拼好的纯文本，positions[i] 是 text[i] 对应的文档位置 */
export type TextIndex = {
  text: string
  positions: number[]
}

const FENCE = '```'

/** 块与块之间的分隔符，引文跨过它就不算命中 */
const BLOCK_SEPARATOR = '\n'

/**
 * 剥掉代码围栏。模型偶尔把整段 JSON Lines 包在 ```json 里，围栏行本身不是批注。
 * 剥完是空串或者只剩语言标记（json / JSON），返回空串，由调用方跳过。
 */
function stripFence(line: string): string {
  let out = line.trim()
  if (out.startsWith(FENCE)) out = out.slice(FENCE.length).trim()
  if (out.endsWith(FENCE)) out = out.slice(0, -FENCE.length).trim()
  if (/^[A-Za-z]+$/.test(out)) return ''
  const language = out.match(/^[A-Za-z]+\s+/)
  if (language) out = out.slice(language[0].length).trim()
  return out
}

/**
 * 解析一行。任何不合格的输入都返回 null，不抛异常：
 * kind 必须是两个值之一，quote 与 note 必须是非空字符串，
 * revision 必须带非空 replacement（空串表示删掉整段，按产品约定丢弃）。
 */
function readLine(line: string): ParsedAnnotation | null {
  let value: unknown
  try {
    value = JSON.parse(line)
  } catch {
    return null
  }

  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null
  const record = value as Record<string, unknown>

  const kind = record.kind
  if (kind !== 'revision' && kind !== 'evaluation' && kind !== 'meta') return null

  const note = record.note
  if (typeof note !== 'string' || note.trim() === '') return null

  // 意图说明只需要一句 note，不需要定位
  if (kind === 'meta') return { kind, quote: '', note: note.trim() }

  const quote = record.quote
  if (typeof quote !== 'string' || quote.trim() === '') return null

  if (kind === 'evaluation') return { kind, quote, note }

  const replacement = record.replacement
  if (typeof replacement !== 'string' || replacement === '') return null
  return { kind, quote, note, replacement }
}

/**
 * 从流式缓冲里取出所有完整的行（以 \n 结尾）逐行解析。
 * 最后一截不完整的行放回 rest，等下次增量到达再拼。
 * 坏行静默跳过，绝不抛异常。
 */
export function parseStream(buffer: string): { items: ParsedAnnotation[]; rest: string } {
  const breakAt = buffer.lastIndexOf('\n')
  const complete = breakAt >= 0 ? buffer.slice(0, breakAt) : ''
  const rest = breakAt >= 0 ? buffer.slice(breakAt + 1) : buffer

  const items: ParsedAnnotation[] = []
  if (complete !== '') {
    for (const raw of complete.split('\n')) {
      const line = stripFence(raw)
      if (line === '') continue
      const item = readLine(line)
      if (item) items.push(item)
    }
  }

  return { items, rest }
}

/**
 * 把文档里的文本块拼成索引。每个文本块（段落、标题、代码块……）算一块，
 * 块之间插一个 '\n'，引文就不会跨段误匹配。
 * 分隔符的 position 用后一块的起始位置，保证 positions 单调不减。
 */
export function buildTextIndex(doc: ProseMirrorNode): TextIndex {
  let text = ''
  const positions: number[] = []

  doc.descendants((node, pos) => {
    if (!node.isTextblock) return true

    let blockText = ''
    const blockPositions: number[] = []
    node.forEach((child, offset) => {
      if (!child.isText) return
      const value = child.text ?? ''
      blockText += value
      for (let i = 0; i < value.length; i++) {
        blockPositions.push(pos + 1 + offset + i)
      }
    })

    if (blockText !== '') {
      if (text !== '') {
        text += BLOCK_SEPARATOR
        positions.push(pos)
      }
      text += blockText
      for (const position of blockPositions) positions.push(position)
    }

    return false
  })

  return { text, positions }
}

/**
 * 在索引里找引文的第一次出现，把字符下标换成文档位置。
 * 命中必须完全落在 [searchFrom, searchTo] 之内（searchTo 是最后一个字符的下标）。
 * 引文跨块（含分隔符）或者命中的位置不连续（跨硬换行、跨内联节点）都算找不到。
 */
export function findRange(
  index: TextIndex,
  quote: string,
  searchFrom = 0,
  searchTo = index.text.length - 1,
): { from: number; to: number } | null {
  if (quote.length === 0) return null
  if (quote.includes(BLOCK_SEPARATOR)) return null
  if (quote.length > searchTo - searchFrom + 1) return null

  const start = index.text.indexOf(quote, Math.max(0, searchFrom))
  if (start < 0) return null
  if (start + quote.length - 1 > searchTo) return null

  const from = index.positions[start]
  if (from === undefined) return null
  for (let i = 1; i < quote.length; i++) {
    if (index.positions[start + i] !== from + i) return null
  }

  return { from, to: index.positions[start + quote.length - 1] + 1 }
}

/** 这段引文在全文出现几次，用来判断能不能安全地回退全篇定位 */
function countOccurrences(index: TextIndex, quote: string): number {
  if (quote.length === 0) return 0
  let count = 0
  let cursor = index.text.indexOf(quote)
  while (cursor >= 0) {
    count += 1
    if (count > 1) return count
    cursor = index.text.indexOf(quote, cursor + 1)
  }
  return count
}

export type ResolveWindow = {
  start: number
  end: number
}

/**
 * 把解析出的批注落到正文位置上，定位失败的丢弃。
 * 只在给定窗口内找（窗口 = 这次送出去的选区/段落），
 * 窗口内找不到时，只有全文唯一的引文才回退全篇——重复句不能乱绑到别处。
 */
export function resolveAnnotations(
  items: ParsedAnnotation[],
  index: TextIndex,
  window?: ResolveWindow | number,
): Annotation[] {
  const span: ResolveWindow =
    typeof window === 'number'
      ? { start: window, end: index.text.length - 1 }
      : (window ?? { start: 0, end: index.text.length - 1 })

  const annotations: Annotation[] = []
  const cursors = new Map<string, number>()

  for (const item of items) {
    // 意图说明不锚定位置，交给调用方单独处理
    if (item.kind === 'meta') continue
    const start = cursors.get(item.quote) ?? span.start
    let range = findRange(index, item.quote, start, span.end)

    if (!range && start !== 0 && countOccurrences(index, item.quote) === 1) {
      range = findRange(index, item.quote, 0, index.text.length - 1)
    }

    if (!range) continue
    cursors.set(item.quote, range.to)

    const annotation: Annotation = {
      id: crypto.randomUUID(),
      kind: item.kind,
      status: 'pending',
      from: range.from,
      to: range.to,
      quote: item.quote,
      note: item.note,
    }
    if (item.replacement !== undefined) annotation.replacement = item.replacement
    annotations.push(annotation)
  }

  return annotations
}

/**
 * 一次编辑之后修正其余批注的位置。
 * 编辑点之后的整体平移；跨越编辑点的只改结尾；编辑点之前的原样不动。
 * 返回新数组，不改动传入的列表。
 */
export function shiftAnnotations<T extends { from: number; to: number }>(
  list: T[],
  changeStart: number,
  delta: number,
): T[] {
  return list.map((item) => {
    if (item.from >= changeStart) {
      return { ...item, from: item.from + delta, to: item.to + delta }
    }
    if (item.to > changeStart) {
      return { ...item, to: item.to + delta }
    }
    return item
  })
}
