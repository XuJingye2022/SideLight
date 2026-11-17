/**
 * 表格单元格里的 `<br>` 还原成 hardBreak（第 39 轮）。
 *
 * 应用自己把单元格内的换行序列化成 `<br>`，但载入时 `escapeHtmlForParse` 会把 `<br>`
 * 转成 `&lt;br&gt;` 文字（正文行内 HTML 必须保住），schema 只看到一个普通文本节点，
 * 于是重开显示成字面 `3A<br>B`——自己写出来的语法自己读不回来。
 *
 * 这里在 `schema.nodeFromJSON` 之前把单元格里的文本节点切开。纯函数，不 import tiptap，
 * 可以在 Node 里直接单测。无表文档原样返回同一对象（不深拷贝：1 MB 文档不能白扫一遍）。
 */

export type JSONContentLike = {
  type?: string
  text?: string
  marks?: unknown[]
  attrs?: Record<string, unknown>
  content?: JSONContentLike[]
}

const BREAK = /<br\s*\/?>/gi
const CELL_TYPES = new Set(['tableCell', 'tableHeader'])

function hasMarks(node: JSONContentLike): boolean {
  return Array.isArray(node.marks) && node.marks.length > 0
}

/**
 * 把一段文本按 `<br>` 切成 text / hardBreak 交替的节点序列。
 * 没有 `<br>` 返回 null（调用方保留原节点，避免无谓复制）。
 * 带格式（marks 非空）的文本不拆：拆开会让 `**A<br>B**` 第一次保存变成 `**A**<br>**B**`，
 * 字节变了、这张表也随之退出「整块写回原文」（`tableReuse` 签名含全部单元格）。
 */
function splitTextNode(node: JSONContentLike): JSONContentLike[] | null {
  const text = node.text
  if (typeof text !== 'string' || hasMarks(node)) return null
  const segments = text.split(BREAK)
  if (segments.length < 2) return null
  const pieces: JSONContentLike[] = []
  for (let index = 0; index < segments.length; index += 1) {
    if (index > 0) pieces.push({ type: 'hardBreak' })
    // 空串不产出文本节点：`A<br>` 不能留一个空文本节点
    if (segments[index]) pieces.push({ type: 'text', text: segments[index] })
  }
  return pieces
}

function walk(node: JSONContentLike, parentInCell: boolean): JSONContentLike {
  const inCell = parentInCell || CELL_TYPES.has(String(node.type ?? ''))
  const content = node.content
  if (!Array.isArray(content) || content.length === 0) return node
  let changed = false
  const next: JSONContentLike[] = []
  for (const child of content) {
    if (inCell && child.type === 'text') {
      const pieces = splitTextNode(child)
      if (pieces) {
        next.push(...pieces)
        changed = true
        continue
      }
    }
    const walked = walk(child, inCell)
    if (walked !== child) changed = true
    next.push(walked)
  }
  // 没改动就返回原对象：调用方（含缓存）拿到的还是同一份 JSON
  return changed ? { ...node, content: next } : node
}

/** 只在 tableCell / tableHeader 内部把文本里的 `<br>` 换成 hardBreak；其余原样。 */
export function splitTableCellBreaks(json: JSONContentLike): JSONContentLike {
  return walk(json, false)
}
