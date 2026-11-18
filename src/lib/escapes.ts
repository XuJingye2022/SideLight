import { fenceMap } from './risk.ts'

/**
 * 编辑器会把 Obsidian 的 callout 标记 `[!note]` 当成链接语法，序列化时转义成 \[!note\]。
 * 这里把整行的 callout 标记还原。
 */
export function repairCalloutMarkers(markdown: string): string {
  // 正则要匹配的就是 `\[!`：没有这两个字节就不可能命中（第 42 轮守卫，1 MB 每键省 0.9 ms→0.0x）
  if (!markdown.includes('\\[!')) return markdown
  return markdown.replace(/^(\s*(?:>\s*)+)\\\[!([a-zA-Z]+)\\\]/gm, '$1[!$2]')
}

/** 整行只是一个被转义的 `\[TOC\]`（前导空白与 CR 允许；行尾空格也吃掉） */
export const TOC_ESCAPED_LINE = /^([ \t]*)\\\[toc\\\]([ \t]*)(\r?)$/i
/** 原文里出现过被转义的 `\[TOC\]`：说明作者是故意写成字面标记，整篇不还原 */
const TOC_ESCAPED_SOURCE = /\\\[toc\\\]/i

/**
 * 第 58 轮 B-106：`[TOC]` 段落会被序列化成 `\[TOC\]`，这里按行还原。
 * 三条边界：
 * - 原文里出现过 `\[TOC\]`（不分大小写）时整篇不还原（第 49 轮「按原文次数对照」同一口径）；
 * - 围栏代码块里（`fenceMap`）不动；行内代码、引用行、列表行因为整行锚定天然不命中；
 * - 显示公式段（独占一行的 `$$` 之间）不动。
 * 行尾保持原样（CRLF 文件的 `\r` 原样留在行尾）。
 */
export function repairTocMarkers(markdown: string, original?: string | null): string {
  // 快路径：没有 `[toc`（不分大小写）就没有可还原的东西。
  // 不能要求闭合 `]`：序列化器写的是 `\[TOC\]`，收尾方括号前面还有一个反斜杠。
  if (!/\[toc/i.test(markdown)) return markdown
  if (typeof original === 'string' && TOC_ESCAPED_SOURCE.test(original)) return markdown
  const fenced = fenceMap(markdown)
  const lines = markdown.split('\n')
  let inMath = false
  let changed = false
  for (let index = 0; index < lines.length; index += 1) {
    if (fenced[index].fenced) continue
    const trimmed = lines[index].trim()
    if (trimmed.startsWith('$$')) {
      // 独占一行的 $$ 翻转整段公式；`$$x$$` 这种单行公式不翻转
      if (!(trimmed.length > 4 && trimmed.endsWith('$$'))) inMath = !inMath
      continue
    }
    if (inMath) continue
    const next = lines[index].replace(TOC_ESCAPED_LINE, '$1[TOC]$2$3')
    if (next === lines[index]) continue
    lines[index] = next
    changed = true
  }
  return changed ? lines.join('\n') : markdown
}
