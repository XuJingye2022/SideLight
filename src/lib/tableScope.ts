/** 表格相关的节点名：Markdown 表格只装行内内容，块级命令在这些节点里一律拦 */
export const TABLE_SCOPE_NAMES = ['table', 'tableRow', 'tableCell', 'tableHeader'] as const

/**
 * 从内到外的祖先节点名里有没有表格节点（深度 1 是文档根，不含）。
 * 键盘守卫、工具条守卫、块级公式守卫共用这一条判据，避免三处各写一遍。
 */
export function inTableAncestry(names: readonly string[]): boolean {
  return names.some((name) => (TABLE_SCOPE_NAMES as readonly string[]).includes(name))
}

/**
 * 单元格里正在手打的块级标记：`#` / `>` / `-` / `1.` / ```` ``` ```` 后面那个空格。
 * 输入规则命中它就会把段落换成 heading/blockquote/list，而 Markdown 表格只装行内内容，
 * 存盘时这些块会被写成表格里装不下的语法（第 52 轮 B-007）。守卫只认「块首的标记 + 一个空格」。
 */
const MARKER_BEFORE_SPACE = /^[ \t]*(?:#{1,6}|>|[-+*]|\d{1,9}[.)]|`{3,}|~{3,}|-{3,}|\*{3,}|_{3,})$/

export function typingBlockMarkerInCell(names: readonly string[], markdownBeforeCursor: string): boolean {
  return inTableAncestry(names) && MARKER_BEFORE_SPACE.test(markdownBeforeCursor)
}
