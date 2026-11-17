import type { Node as ProseMirrorNode } from '@tiptap/pm/model'

import { extractOutline, type OutlineItem } from './outline.ts'

/**
 * 第 58 轮 B-106：`[TOC]` 目录的最小实现。
 * 标记的写法定为「独占一行的 `[TOC]`」（不分大小写），与 Typora 一致；
 * 被作者转义成 `\[TOC\]` 的写法是字面文本，不算标记（否则特意转义的那一行也会挂上目录）。
 */

/** 一行 / 一段文字是不是独占一段的 `[TOC]` 标记（`\[TOC\]` 不算） */
export function hasTocMarker(text: string): boolean {
  return /^[ \t]*\[toc\][ \t]*$/im.test(text)
}

/** 顶层段落里文字正好是 `[TOC]`：目录 widget 挂在这种段落前面 */
export function isTocParagraph(node: ProseMirrorNode): boolean {
  return node.type.name === 'paragraph' && hasTocMarker(node.textContent)
}

/** 文档里所有 `[TOC]` 段落的起始位置（与 heading 的 pos 同口径，顶层偏移） */
export function tocParagraphPositions(doc: ProseMirrorNode): number[] {
  const positions: number[] = []
  doc.forEach((node, offset) => {
    if (isTocParagraph(node)) positions.push(offset)
  })
  return positions
}

/** 目录条目：复用大纲口径（只收顶层标题，顺序与文档一致） */
export function tocEntries(doc: ProseMirrorNode): OutlineItem[] {
  return extractOutline(doc)
}
