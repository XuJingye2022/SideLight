/** 表格相关的节点名：Markdown 表格只装行内内容，块级命令在这些节点里一律拦 */
export const TABLE_SCOPE_NAMES = ['table', 'tableRow', 'tableCell', 'tableHeader'] as const

/**
 * 从内到外的祖先节点名里有没有表格节点（深度 1 是文档根，不含）。
 * 键盘守卫、工具条守卫、块级公式守卫共用这一条判据，避免三处各写一遍。
 */
export function inTableAncestry(names: readonly string[]): boolean {
  return names.some((name) => (TABLE_SCOPE_NAMES as readonly string[]).includes(name))
}
