import type { Node as ProseMirrorNode } from '@tiptap/pm/model'

export type OutlineItem = {
  /** 稳定 id，形如 h-12，数字是标题节点在文档里的起始位置 */
  id: string
  /** 标题级别，1..6 */
  level: number
  /** 标题文字，去掉首尾空白 */
  text: string
  /** 标题节点在文档里的起始位置 */
  pos: number
}

/**
 * 取大纲。只认文档顶层的 heading：引用、列表里嵌着的标题不是章节起点，
 * 点了也带不动读者，所以不收。顺序与文档顺序一致。
 */
export function extractOutline(doc: ProseMirrorNode): OutlineItem[] {
  const items: OutlineItem[] = []

  doc.forEach((node, offset) => {
    if (node.type.name !== 'heading') return
    items.push({
      id: `h-${offset}`,
      level: Number(node.attrs.level),
      text: node.textContent.trim(),
      pos: offset,
    })
  })

  return items
}

/**
 * 光标落在哪一节：取起始位置不超过 cursorPos 的最后一个标题。
 * 光标在第一个标题之前时算第一节，正好落在标题处算这一节。
 */
export function activeOutlineId(items: OutlineItem[], cursorPos: number): string | null {
  if (items.length === 0) return null

  let active = items[0]
  for (const item of items) {
    if (item.pos > cursorPos) break
    active = item
  }

  return active.id
}
