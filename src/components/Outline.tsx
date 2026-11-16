import { Fragment, useEffect, useMemo, useState } from 'react'
import type { OutlineItem } from '../lib/outline.ts'
import { buildOutlineTree, expandAncestors, visibleActiveId } from '../lib/outlineTree.ts'

type Props = {
  items: OutlineItem[]
  activeId: string | null
  onJump: (item: OutlineItem) => void
}

/**
 * 大纲面板。纯展示：光标在哪一节由调用方算好传进来，
 * 这里不监听编辑器，只把折叠集合留在内存里（会话内有效，不持久化）。
 */
export function Outline({ items, activeId, onJump }: Props) {
  const nodes = useMemo(() => buildOutlineTree(items), [items])
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set())

  // 光标跳到被折叠的子树里时自动展开祖先，不然当前节会「消失」
  useEffect(() => {
    setCollapsed((previous) => expandAncestors(previous, nodes, activeId))
  }, [activeId, nodes])

  if (items.length === 0) {
    return (
      <aside className="outline" aria-label="大纲">
        <p className="outline-empty">这篇还没有标题</p>
      </aside>
    )
  }

  const byId = new Map(nodes.map((node) => [node.id, node]))
  const rows = nodes.filter((node) => {
    let parentId = node.parentId
    while (parentId) {
      if (collapsed.has(parentId)) return false
      parentId = byId.get(parentId)?.parentId ?? null
    }
    return true
  })
  // 当前节被折叠时高亮最外层被折叠的祖先，折叠后仍能定位
  const visibleId = visibleActiveId(nodes, collapsed, activeId)

  return (
    <aside className="outline" aria-label="大纲">
      <nav className="outline-list" style={{ display: 'grid', gridTemplateColumns: '14px minmax(0, 1fr)' }}>
        {rows.map((node) => {
          const active = node.id === visibleId
          const isCollapsed = collapsed.has(node.id)
          return (
            <Fragment key={node.id}>
              {node.hasChildren ? (
                <button
                  type="button"
                  className="outline-toggle"
                  aria-expanded={!isCollapsed}
                  aria-label={`折叠/展开「${node.text}」`}
                  style={{ width: 14, padding: 0, border: 0, background: 'none', color: 'inherit' }}
                  onClick={() =>
                    setCollapsed((previous) => {
                      const next = new Set(previous)
                      if (next.has(node.id)) next.delete(node.id)
                      else next.add(node.id)
                      return next
                    })
                  }
                >
                  {isCollapsed ? '▸' : '▾'}
                </button>
              ) : (
                <span aria-hidden="true" style={{ width: 14 }} />
              )}
              <button
                type="button"
                className={active ? 'outline-item is-active' : 'outline-item'}
                aria-current={active ? 'location' : undefined}
                style={{ paddingLeft: `${(node.level - 1) * 10}px` }}
                title={node.text}
                onClick={() => onJump(node)}
              >
                {node.text}
              </button>
            </Fragment>
          )
        })}
      </nav>
    </aside>
  )
}
