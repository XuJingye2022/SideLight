import { fenceMap, TABLE_SEPARATOR } from './risk.ts'

/**
 * 表格块复用：未改动的表格整块换回原文，保表内行内字节（分隔行、对齐写法、列宽、`\|`）。
 * 边界：只复用表格行本身，表格前后的空行仍由文档级 `\n\n` 决定（0/1 个空行与原文一致；≥2 个会被规范化）。
 */
export type TableBlock = {
  /** 表头行下标（含） */
  start: number
  /** 最后一行数据之后（不含） */
  end: number
  lines: string[]
  header: string
  separator: string
  rows: string[]
  signature: string
}

/** 按未转义的 `|` 切单元格；`\|` 留在单元格文本里，不当列分隔 */
export function splitCells(line: string): string[] {
  const trimmed = line.trim().replace(/^\|/, '').replace(/\|$/, '')
  const cells: string[] = []
  let current = ''
  for (let index = 0; index < trimmed.length; index += 1) {
    const char = trimmed[index]
    if (char === '\\' && trimmed[index + 1] === '|') {
      current += '|'
      index += 1
      continue
    }
    if (char === '|') {
      cells.push(current.trim())
      current = ''
      continue
    }
    current += char
  }
  cells.push(current.trim())
  return cells
}

function alignmentOf(separatorCell: string): string {
  const cell = separatorCell.trim()
  if (cell.startsWith(':') && cell.endsWith(':')) return 'center'
  if (cell.endsWith(':')) return 'right'
  if (cell.startsWith(':')) return 'left'
  return 'none'
}

function signatureOf(lines: string[]): string {
  if (lines.length < 2) return ''
  const header = splitCells(lines[0]).join('\u0001')
  const separators = splitCells(lines[1])
  const alignments = separators.map(alignmentOf).join(',')
  const rows = lines.slice(2).map((line) => splitCells(line).join('\u0001')).join('\u0002')
  return `${header}\u0003${separators.length}\u0003${alignments}\u0003${rows}`
}

/** 收集文本里的表格块（代码围栏内不算）；表格块 = 表头 + 分隔行 + 数据行，不含前后空行 */
export function collectTables(text: string): TableBlock[] {
  const lines = text.replace(/\r\n?/g, '\n').split('\n')
  const fenced = fenceMap(text)
  const tables: TableBlock[] = []
  let index = 0
  while (index < lines.length) {
    if (fenced[index]?.fenced || !lines[index].includes('|') || index + 1 >= lines.length) {
      index += 1
      continue
    }
    if (!TABLE_SEPARATOR.test(lines[index + 1]) || !lines[index + 1].includes('|')) {
      index += 1
      continue
    }
    let end = index + 2
    while (end < lines.length && !fenced[end]?.fenced && lines[end].includes('|') && lines[end].trim() !== '') {
      end += 1
    }
    const blockLines = lines.slice(index, end)
    tables.push({
      start: index,
      end,
      lines: blockLines,
      header: blockLines[0],
      separator: blockLines[1],
      rows: blockLines.slice(2),
      signature: signatureOf(blockLines),
    })
    index = end
  }
  return tables
}

/**
 * 原文与序列化结果里的表格按出现序号一一配对；签名命中就把整块换回原文行。
 * 签名 = 表头单元格 + 列数 + 对齐三元组 + 全部数据单元格（改值/加列/删行/改对齐都会退让）。
 */
export function reuseTables(original: string | null, serialized: string): string {
  if (!original) return serialized
  const before = collectTables(original)
  if (before.length === 0) return serialized
  const after = collectTables(serialized)
  if (after.length === 0) return serialized

  const lines = serialized.replace(/\r\n?/g, '\n').split('\n')
  const replacements: Array<{ start: number; end: number; lines: string[] }> = []
  const count = Math.min(before.length, after.length)
  for (let index = 0; index < count; index += 1) {
    // 多表按出现序号配对：第 i 张表对第 i 张表
    if (before[index].signature !== after[index].signature) continue
    replacements.push({ start: after[index].start, end: after[index].end, lines: before[index].lines })
  }
  // 从后往前替换，避免前面的行数变化影响后面的下标
  for (const replacement of replacements.reverse()) {
    lines.splice(replacement.start, replacement.end - replacement.start, ...replacement.lines)
  }
  return lines.join('\n')
}
