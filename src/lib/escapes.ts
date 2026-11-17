/**
 * 编辑器会把 Obsidian 的 callout 标记 `[!note]` 当成链接语法，序列化时转义成 \[!note\]。
 * 这里把整行的 callout 标记还原。
 */
export function repairCalloutMarkers(markdown: string): string {
  // 正则要匹配的就是 `\[!`：没有这两个字节就不可能命中（第 42 轮守卫，1 MB 每键省 0.9 ms→0.0x）
  if (!markdown.includes('\\[!')) return markdown
  return markdown.replace(/^(\s*(?:>\s*)+)\\\[!([a-zA-Z]+)\\\]/gm, '$1[!$2]')
}
