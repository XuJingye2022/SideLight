import type { OutlineItem } from './outline.ts'

export type OutlineNode = OutlineItem & {
  /** 父标题 id；一级标题为 null */
  parentId: string | null
  hasChildren: boolean
}

/**
 * 把扁平大纲补成父子树：父节点是前面最近的、级别更小的标题（跳级 H1→H3 也算 H1 的子级）。
 * 只由懒加载的 Outline 面板与测试 import，不进首屏。
 */
export function buildOutlineTree(items: OutlineItem[]): OutlineNode[] {
  const nodes: OutlineNode[] = items.map((item) => ({ ...item, parentId: null, hasChildren: false }))
  const stack: OutlineNode[] = []
  for (const node of nodes) {
    while (stack.length > 0 && stack[stack.length - 1].level >= node.level) stack.pop()
    const parent = stack[stack.length - 1]
    if (parent) {
      node.parentId = parent.id
      parent.hasChildren = true
    }
    stack.push(node)
  }
  return nodes
}

/** 展开 activeId 的全部祖先；没有需要展开的祖先时返回原集合，避免多余渲染。 */
export function expandAncestors(collapsed: Set<string>, nodes: OutlineNode[], activeId: string | null): Set<string> {
  if (!activeId) return collapsed
  const byId = new Map(nodes.map((node) => [node.id, node]))
  const ancestors: string[] = []
  let parentId = byId.get(activeId)?.parentId ?? null
  while (parentId) {
    ancestors.push(parentId)
    parentId = byId.get(parentId)?.parentId ?? null
  }
  if (!ancestors.some((id) => collapsed.has(id))) return collapsed
  const next = new Set(collapsed)
  for (const id of ancestors) next.delete(id)
  return next
}

/**
 * 当前节被折叠时，把高亮挪到最外层被折叠的祖先，保证大纲里仍看得到「你在哪」。
 * 可见时原样返回 activeId。
 */
export function visibleActiveId(nodes: OutlineNode[], collapsed: Set<string>, activeId: string | null): string | null {
  if (!activeId) return null
  const byId = new Map(nodes.map((node) => [node.id, node]))
  if (!byId.has(activeId)) return null
  let outermost: string | null = null
  let parentId = byId.get(activeId)?.parentId ?? null
  while (parentId) {
    if (collapsed.has(parentId)) outermost = parentId
    parentId = byId.get(parentId)?.parentId ?? null
  }
  return outermost ?? activeId
}
