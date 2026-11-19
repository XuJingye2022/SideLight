import type { Node as ProseMirrorNode } from '@tiptap/pm/model'

export type AnnotationKind = 'revision' | 'evaluation'
export type AnnotationStatus = 'pending' | 'accepted' | 'dismissed'

/* ---------- 紧急度（第 95 轮 B-222） ---------- */

/** 五档紧急度：从「不标」到「立刻改」。顺序就是卡头下拉的显示顺序 */
export const ANNOTATION_PRIORITIES = ['none', 'low', 'medium', 'high', 'urgent'] as const
export type AnnotationPriority = (typeof ANNOTATION_PRIORITIES)[number]

/** 下拉里的文案：none 显示成 `-`，其余用英文档名（与用户队列的写法一致） */
export const ANNOTATION_PRIORITY_LABELS: Record<AnnotationPriority, string> = {
  none: '-',
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  urgent: 'Urgent',
}

/** 任何来源的档位都过这里：缺字段、`p0`、数字、别的字符串一律回 none */
export function normalizePriority(value: unknown): AnnotationPriority {
  return typeof value === 'string' && (ANNOTATION_PRIORITIES as readonly string[]).includes(value)
    ? (value as AnnotationPriority)
    : 'none'
}

/** 模型先给一条意图说明，再给批注；overall 是不锚定的全文总评 */
export type ParsedKind = AnnotationKind | 'meta' | 'overall'

export type ParsedAnnotation = {
  kind: ParsedKind
  quote: string
  note: string
  replacement?: string
  /** 只有模型给了合法档位才有这个字段；缺省表示「没判断」，落库时归一成 none */
  priority?: AnnotationPriority
}

/** 不写正文的页边条目：全文总评或未定位的批注 */
export type DocNote = {
  id: string
  kind: 'overall' | 'unresolved'
  note: string
  quote?: string
  createdAt: number
}

export type AnnotationStore = {
  v: 2
  annotations: Annotation[]
  notes: DocNote[]
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
  /** 五档紧急度；旧档没有这个字段，读进来归一成 none */
  priority: AnnotationPriority
  /** 用户手动改过档位：重跑时保留，不被模型的新判断覆盖 */
  priorityManual?: true
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
 * priority 是可选的：只有命中五档才写进结果，缺省/非法不写（落库时归一成 none）。
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
  if (kind !== 'revision' && kind !== 'evaluation' && kind !== 'meta' && kind !== 'overall') return null

  const note = record.note
  if (typeof note !== 'string' || note.trim() === '') return null

  // 意图说明与全文总评只需要一句 note，不需要定位
  if (kind === 'meta' || kind === 'overall') return { kind, quote: '', note: note.trim() }

  const quote = record.quote
  if (typeof quote !== 'string' || quote.trim() === '') return null

  const parsedPriority = readPriority(record.priority)
  const withPriority = parsedPriority ? { priority: parsedPriority } : {}

  if (kind === 'evaluation') return { kind, quote, note, ...withPriority }

  const replacement = record.replacement
  if (typeof replacement !== 'string' || replacement === '') return null
  return { kind, quote, note, replacement, ...withPriority }
}

/** 缺失/非法档位返回 undefined，好让调用方「不写这个字段」 */
function readPriority(value: unknown): AnnotationPriority | undefined {
  if (typeof value !== 'string') return undefined
  return (ANNOTATION_PRIORITIES as readonly string[]).includes(value)
    ? (value as AnnotationPriority)
    : undefined
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
    // 意图说明与全文总评不锚定位置，交给调用方单独处理
    if (item.kind === 'meta' || item.kind === 'overall') continue
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
      // 模型没给档位就是 none：卡头下拉永远有一个合法选中项
      priority: normalizePriority(item.priority),
    }
    if (item.replacement !== undefined) annotation.replacement = item.replacement
    annotations.push(annotation)
  }

  return annotations
}

/**
 * v2 协议：解析批注 + 把定位失败/overall 收进 DocNote；旧数组读成 v2 不丢内容。
 * 旧档条目的 priority 在这里逐条归一（v 仍是 2）：缺字段的旧文件读进来是 none，
 * 条目本身一条不少；手改标记 priorityManual 由 spread 原样带过。
 */
export function parseAnnotationStore(raw: string | null): AnnotationStore {
  if (!raw) return { v: 2, annotations: [], notes: [] }
  try {
    const value = JSON.parse(raw) as unknown
    if (Array.isArray(value)) {
      return { v: 2, annotations: value.map(normalizeStoredAnnotation), notes: [] }
    }
    if (value && typeof value === 'object' && (value as { v?: number }).v === 2) {
      const store = value as Partial<AnnotationStore>
      return {
        v: 2,
        annotations: Array.isArray(store.annotations)
          ? store.annotations.map(normalizeStoredAnnotation)
          : [],
        notes: Array.isArray(store.notes) ? store.notes : [],
      }
    }
  } catch {
    // 坏文件当空
  }
  return { v: 2, annotations: [], notes: [] }
}

/** 读库时的唯一归一入口：只补 priority，别的字段原样保留 */
function normalizeStoredAnnotation(item: Annotation): Annotation {
  return { ...item, priority: normalizePriority(item.priority) }
}

export function serializeAnnotationStore(store: AnnotationStore): string {
  return JSON.stringify({ v: 2, annotations: store.annotations, notes: store.notes })
}

/** 把 overall 与未定位项转成 DocNote；未定位保留 quote 供页边显示 */
export function collectDocNotes(
  items: ParsedAnnotation[],
  annotations: Annotation[],
  now = Date.now(),
): DocNote[] {
  const notes: DocNote[] = []
  for (const item of items) {
    if (item.kind === 'overall') {
      notes.push({ id: crypto.randomUUID(), kind: 'overall', note: item.note, createdAt: now })
      continue
    }
    if (item.kind === 'meta') continue
    const hit = annotations.some(
      (annotation) =>
        annotation.quote === item.quote && annotation.note === item.note && annotation.kind === item.kind,
    )
    if (!hit) {
      notes.push({
        id: crypto.randomUUID(),
        kind: 'unresolved',
        note: item.note,
        quote: item.quote,
        createdAt: now,
      })
    }
  }
  return notes
}

/**
 * 重跑一段：移除与窗口相交的 pending，窗口外保留；完全相同的新条目复用旧 id/thread/sources。
 *
 * `reuse` 是「可复用候选」（默认就是 `previous` 里 pending 那批）：调用方在窗口开始时先拍一份快照，
 * 后面逐条补进来的 fresh 仍能按引文找回旧 id。这样同窗口第 2/3 条批注重跑后 id 也不会变，
 * 用户手改过的档位（priorityManual）跟着旧条目一起保留。
 */
export function replaceInWindow(
  previous: Annotation[],
  fresh: Annotation[],
  window: ResolveWindow,
  reuse: Annotation[] = previous,
): Annotation[] {
  const start = Math.min(window.start, window.end)
  const end = Math.max(window.start, window.end)
  const kept = previous.filter(
    (item) => item.status !== 'pending' || item.to < start || item.from > end,
  )
  const reusable = reuse.filter((item) => item.status === 'pending')
  const used = new Set<string>()
  const merged = fresh.map((item) => {
    const old = reusable.find(
      (candidate) =>
        !used.has(candidate.id) &&
        candidate.quote === item.quote &&
        candidate.kind === item.kind &&
        candidate.note === item.note &&
        candidate.replacement === item.replacement,
    )
    if (!old) return item
    used.add(old.id)
    return {
      ...item,
      id: old.id,
      thread: old.thread,
      sources: old.sources,
      status: old.status,
      // 手改过档位的条目连同标记一起搬过去：不然第一次重跑后标记就丢了，第二次重跑又回模型值
      ...(old.priorityManual ? { priority: old.priority, priorityManual: true as const } : {}),
    }
  })
  return [...kept, ...merged].sort((a, b) => a.from - b.from)
}

/** 读 v2 批注文件；旧数组兼容。目录不存在返回空 store。 */
export async function readAnnotationStore(
  parent: FileSystemDirectoryHandle,
  key: string,
): Promise<AnnotationStore> {
  try {
    const dir = await parent.getDirectoryHandle('.sidelight')
    const annotations = await dir.getDirectoryHandle('annotations')
    const file = await annotations.getFileHandle(`${key}.json`)
    return parseAnnotationStore(await (await file.getFile()).text())
  } catch {
    return { v: 2, annotations: [], notes: [] }
  }
}

/** 写 v2，首次迁移前把旧文件复制成 `.bak-<时间>`，不删旧内容。 */
export async function writeAnnotationStore(
  parent: FileSystemDirectoryHandle,
  key: string,
  store: AnnotationStore,
  backup = true,
): Promise<void> {
  const dir = await parent.getDirectoryHandle('.sidelight', { create: true })
  const annotations = await dir.getDirectoryHandle('annotations', { create: true })
  if (backup) {
    try {
      const old = await annotations.getFileHandle(`${key}.json`)
      const raw = await (await old.getFile()).text()
      parseAnnotationStore(raw)
      const backupName = `${key}.json.bak-${Date.now()}`
      const target = await annotations.getFileHandle(backupName, { create: true })
      const writer = await target.createWritable()
      await writer.write(raw)
      await writer.close()
    } catch {
      // 没有旧文件/读不了就不备份
    }
  }
  const file = await annotations.getFileHandle(`${key}.json`, { create: true })
  const writer = await file.createWritable()
  await writer.write(serializeAnnotationStore(store))
  await writer.close()
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
