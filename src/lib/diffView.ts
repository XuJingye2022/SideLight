import { diffLines } from './diff.ts'

export type DiffRow = {
  /** 这一行在两段文字里的状态 */
  kind: 'same' | 'added' | 'removed'
  /** 行内容；超过 maxLine 时已截断并补「…」 */
  text: string
}

export type DiffViewOptions = {
  /** 每个改动块前后各保留的行数，默认 2 */
  context?: number
  /** 最多返回的行数，默认 400；超出只留前段并置 truncated */
  maxRows?: number
  /** 单行最多保留的字符数，默认 500；超出截断并补「…」 */
  maxLine?: number
}

export type DiffViewResult = {
  rows: DiffRow[]
  /** 全文新增行数，不受 context / maxRows 影响 */
  added: number
  /** 全文删除行数，不受 context / maxRows 影响 */
  removed: number
  /** rows 被 maxRows 截断过 */
  truncated: boolean
}

const DEFAULT_CONTEXT = 2
const DEFAULT_MAX_ROWS = 400
const DEFAULT_MAX_LINE = 500

/** 截断标记：单行超长与行数超限都用它（行数超限另有 truncated 字段） */
const ELLIPSIS = '…'

/** 取值兜底：非有限数用默认值，小于下限的抬到下限 */
function atLeast(value: number | undefined, fallback: number, min: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback
  const rounded = Math.floor(value)
  return rounded < min ? min : rounded
}

function clip(text: string, maxLine: number): string {
  return text.length > maxLine ? text.slice(0, maxLine) + ELLIPSIS : text
}

/**
 * 给界面看的行差分：只调 diff.ts 的 diffLines，再按「上下文 N 行」裁成小块。
 * 与 diff.ts 的分工：那边给完整差分（含全部 same 行），这边负责窗口、行数上限与长行截断。
 * 计数（added / removed）始终按全文算，界面上的「+3 −1」不会随 context / maxRows 变。
 */
export function diffView(
  before: string,
  after: string,
  options: DiffViewOptions = {},
): DiffViewResult {
  const context = atLeast(options.context, DEFAULT_CONTEXT, 0)
  const maxRows = atLeast(options.maxRows, DEFAULT_MAX_ROWS, 0)
  const maxLine = atLeast(options.maxLine, DEFAULT_MAX_LINE, 1)

  const lines = diffLines(before, after)
  let added = 0
  let removed = 0
  for (const line of lines) {
    if (line.kind === 'added') added += 1
    else if (line.kind === 'removed') removed += 1
  }

  // 没有改动（含只差 CRLF / 末尾空行，diff.ts 已归一）：不画任何行
  if (added === 0 && removed === 0) {
    return { rows: [], added: 0, removed: 0, truncated: false }
  }

  // 每处改动前后各留 context 行；重叠或相邻的窗口合并，同一行只出一次
  const windows: { from: number; to: number }[] = []
  for (let index = 0; index < lines.length; index += 1) {
    if (lines[index].kind === 'same') continue
    const from = Math.max(0, index - context)
    const to = Math.min(lines.length - 1, index + context)
    const last = windows[windows.length - 1]
    if (last && from <= last.to + 1) last.to = Math.max(last.to, to)
    else windows.push({ from, to })
  }

  const rows: DiffRow[] = []
  for (const window of windows) {
    for (let index = window.from; index <= window.to; index += 1) {
      const line = lines[index]
      rows.push({ kind: line.kind, text: clip(line.text, maxLine) })
    }
  }

  if (rows.length <= maxRows) return { rows, added, removed, truncated: false }
  return { rows: rows.slice(0, maxRows), added, removed, truncated: true }
}
