import type { Node as ProseMirrorNode } from '@tiptap/pm/model'

import { TOC_ESCAPED_LINE } from './escapes.ts'
import { extractOutline, type OutlineItem } from './outline.ts'
import { fenceMap } from './risk.ts'

/**
 * 第 58 轮 B-106：`[TOC]` 目录的最小实现。
 * 标记的写法定为「独占一行的 `[TOC]`」（不分大小写），与 Typora 一致；
 * 被作者转义成 `\[TOC\]` 的写法是字面文本，不算标记（否则特意转义的那一行也会挂上目录）。
 */

/**
 * 一段文字是不是整个就是 `[TOC]` 标记（`\[TOC\]` 不算）。
 * 没有 `m`：软换行段落里夹的一行 `[TOC]` 不是标记（第 62 轮 B-132，段落整段都算一个）。
 */
export function isTocMarkerText(text: string): boolean {
  return /^[ \t]*\[toc\][ \t]*$/i.test(text)
}

/**
 * 一行 / 一段文字里是不是含独占一行的 `[TOC]` 标记（`\[TOC\]` 不算）。
 * 带 `m` 只给「原文」「粘贴片段」这类多行文本用；段落判据请用 `isTocMarkerText`。
 */
export function hasTocMarker(text: string): boolean {
  return /^[ \t]*\[toc\][ \t]*$/im.test(text)
}

/** 顶层段落里文字正好是 `[TOC]`：目录 widget 挂在这种段落前面 */
export function isTocParagraph(node: ProseMirrorNode): boolean {
  return node.type.name === 'paragraph' && isTocMarkerText(node.textContent)
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

/**
 * 原文里「整行被转义成 `\[TOC\]`」的行数。
 * 口径与 `escapes.ts` 的 `repairTocMarkers` 一致：围栏代码块与 `$$` 公式段里不算。
 */
export function escapedTocLineCount(text: string): number {
  if (!/\\\[toc/i.test(text)) return 0
  const fenced = fenceMap(text)
  const lines = text.split('\n')
  let inMath = false
  let count = 0
  for (let index = 0; index < lines.length; index += 1) {
    if (fenced[index].fenced) continue
    const trimmed = lines[index].trim()
    if (trimmed.startsWith('$$')) {
      if (!(trimmed.length > 4 && trimmed.endsWith('$$'))) inMath = !inMath
      continue
    }
    if (inMath) continue
    if (TOC_ESCAPED_LINE.test(lines[index])) count += 1
  }
  return count
}

/**
 * 目录该不该挂（第 62 轮 B-133）：文档里有 `[TOC]` 段、有标题，
 * 且原文不是「这些标记行全被转义」。
 * 按行数对照：原文一行被转义、文档里另有手打的标记时仍然挂（当场两份目录）；
 * 手打（原文没有 `[TOC]`）与新建文档（没有原文）都挂。
 * 调用方已经有区间与条目时直接传计数，不必重扫全篇（plan-review H5）。
 */
export function tocShouldRender(sourceCount: number, entryCount: number, original?: string | null): boolean {
  if (sourceCount === 0 || entryCount === 0) return false
  if (typeof original !== 'string' || original.length === 0) return true
  return escapedTocLineCount(original) < sourceCount
}

/** 文档口径的 `tocShouldRender`：App 的只读预览与单测用（自己扫区间与条目） */
export function hasTocSource(doc: ProseMirrorNode, original?: string | null): boolean {
  return tocShouldRender(tocParagraphPositions(doc).length, tocEntries(doc).length, original)
}
