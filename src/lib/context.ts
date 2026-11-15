export type Block = {
  /** 块在文档里的起始位置 */
  from: number
  /** 块在文档里的结束位置 */
  to: number
  /** 块的纯文本 */
  text: string
}

export type SelectionSource = 'selection' | 'paragraph'

export type ContextPayload = {
  /** 送给模型的主体文字 */
  selection: string
  /** 主体来自人工选区，还是光标所在段落 */
  source: SelectionSource
  /** 选区前一段 */
  before: string
  /** 选区后一段 */
  after: string
  /** 是否因为上限删掉了内容 */
  truncated: boolean
  /** 实际送出的字符数 */
  charCount: number
}

export const CONTEXT_LIMIT = 1500

const ELLIPSIS = '…'

function head(text: string, max: number): string {
  if (max <= 0) return ''
  if (text.length <= max) return text
  return text.slice(0, Math.max(0, max - 1)) + ELLIPSIS
}

function tail(text: string, max: number): string {
  if (max <= 0) return ''
  if (text.length <= max) return text
  return ELLIPSIS + text.slice(text.length - Math.max(0, max - 1))
}

function nearestIndex(blocks: Block[], pos: number): number {
  let best = 0
  let bestDistance = Number.POSITIVE_INFINITY
  blocks.forEach((block, index) => {
    const inside = pos >= block.from && pos <= block.to
    const distance = inside ? 0 : Math.min(Math.abs(pos - block.from), Math.abs(pos - block.to))
    if (distance < bestDistance) {
      best = index
      bestDistance = distance
    }
  })
  return best
}

export type Chunk = {
  /** 这一段在文档里的起止位置（起 = 第一个字，止 = 最后一个字） */
  from: number
  to: number
  /** 这一段要送出的文字 */
  text: string
}

/** 把一段过长的文字按句号切成不超过 limit 的片 */
function sliceBySentence(text: string, limit: number): string[] {
  const pieces: string[] = []
  const sentences = text.match(/[^。！？!?；;\n]*[。！？!?；;\n]?/g) ?? [text]
  let current = ''
  for (const sentence of sentences) {
    if (sentence.length === 0) continue
    if (sentence.length > limit) {
      // 单句就超长，只能硬切
      if (current) {
        pieces.push(current)
        current = ''
      }
      for (let index = 0; index < sentence.length; index += limit) {
        pieces.push(sentence.slice(index, index + limit))
      }
      continue
    }
    if (current.length + sentence.length > limit) {
      pieces.push(current)
      current = sentence
    } else {
      current += sentence
    }
  }
  if (current) pieces.push(current)
  return pieces
}

/**
 * 超长选区切段：每段不超过 limit 字。
 * 段落本身超长时在段落内部按句子再切，否则粘贴进来的整篇一大段仍然只有开头有批注。
 * 选区不超长时只返回一段。
 */
export function splitSelection(blocks: Block[], from: number, to: number, limit: number = CONTEXT_LIMIT): Chunk[] {
  // 没有选区（只是光标）时不切段，交给 buildContext 按段落处理
  if (to <= from) return []
  const usable = blocks.filter((block) => block.text.trim().length > 0 && block.to > from && block.from < to)
  if (usable.length === 0) return []

  const chunks: Chunk[] = []
  let currentText = ''
  let currentFrom = -1
  let currentTo = -1

  const flush = () => {
    if (currentFrom < 0) return
    chunks.push({ from: currentFrom, to: currentTo, text: currentText })
    currentText = ''
    currentFrom = -1
    currentTo = -1
  }

  for (const block of usable) {
    if (block.text.length > limit) {
      flush()
      const pieces = sliceBySentence(block.text, limit)
      let offset = 0
      for (const piece of pieces) {
        const start = block.from + 1 + offset
        chunks.push({ from: start, to: start + piece.length - 1, text: piece })
        offset += piece.length
      }
      continue
    }

    if (currentFrom >= 0 && currentText.length + block.text.length + 2 > limit) flush()
    if (currentFrom < 0) {
      currentFrom = block.from + 1
      currentTo = block.from + 1 + block.text.length - 1
    } else {
      currentTo = block.from + 1 + block.text.length - 1
    }
    currentText += (currentText.length > 0 ? '\n\n' : '') + block.text
    if (currentText.length >= limit) flush()
  }
  flush()

  return chunks
}

/** 给某一段组装上下文：本段文字 + 前后各一小段，总量不超过 limit */
export function buildChunkContext(blocks: Block[], chunk: Chunk, limit: number = CONTEXT_LIMIT): ContextPayload {
  const previous = blocks.filter((block) => block.to <= chunk.from && block.text.trim().length > 0).slice(-1)[0]
  const next = blocks.find((block) => block.from >= chunk.to && block.text.trim().length > 0)

  const budget = Math.max(0, limit - chunk.text.length - 4)
  const half = Math.floor(budget / 2)
  const before = previous ? tail(previous.text, half) : ''
  const after = next ? head(next.text, budget - half) : ''

  return {
    selection: chunk.text,
    source: 'selection',
    before,
    after,
    truncated: false,
    charCount: chunk.text.length + before.length + after.length,
  }
}

/** 组装一次分析要送出的文字。 */
/**
 * 有选区时取选区覆盖的块，没有选区时取光标所在的块，前后各带一段，总量不超过 limit。
 */
export function buildContext(
  blocks: Block[],
  from: number,
  to: number,
  limit: number = CONTEXT_LIMIT,
): ContextPayload {
  const usable = blocks.filter((block) => block.text.trim().length > 0)

  if (usable.length === 0) {
    return { selection: '', source: 'paragraph', before: '', after: '', truncated: false, charCount: 0 }
  }

  const hasSelection = to > from
  let firstIndex: number
  let lastIndex: number

  if (hasSelection) {
    const covered = usable
      .map((block, index) => (block.to > from && block.from < to ? index : -1))
      .filter((index) => index >= 0)

    if (covered.length > 0) {
      firstIndex = covered[0]
      lastIndex = covered[covered.length - 1]
    } else {
      firstIndex = lastIndex = nearestIndex(usable, from)
    }
  } else {
    firstIndex = lastIndex = nearestIndex(usable, from)
  }

  const core = hasSelection
    ? usable.slice(firstIndex, lastIndex + 1).map((block) => block.text).join('\n\n')
    : usable[firstIndex].text

  const previousText = usable[firstIndex - 1]?.text ?? ''
  const nextText = usable[lastIndex + 1]?.text ?? ''

  let selection = core
  let before = ''
  let after = ''
  let truncated = false

  if (selection.length >= limit) {
    selection = head(selection, limit)
    truncated = true
  } else {
    const budget = limit - selection.length - 4
    const half = Math.floor(budget / 2)
    before = tail(previousText, half)
    after = head(nextText, budget - half)
    truncated = before.length < previousText.length || after.length < nextText.length
  }

  return {
    selection,
    source: hasSelection ? 'selection' : 'paragraph',
    before,
    after,
    truncated,
    charCount: selection.length + before.length + after.length,
  }
}
