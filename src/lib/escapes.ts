/**
 * 编辑器会把 Obsidian 的 callout 标记 `[!note]` 当成链接语法，序列化时转义成 \[!note\]。
 * 这里把整行的 callout 标记还原。
 */
export function repairCalloutMarkers(markdown: string): string {
  return markdown.replace(/^(\s*(?:>\s*)+)\\\[!([a-zA-Z]+)\\\]/gm, '$1[!$2]')
}
