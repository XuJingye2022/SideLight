import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import type { OutlineItem } from '../lib/outline.ts'
import { buildOutlineTree, expandAncestors, nearestScrollTop, visibleActiveId } from '../lib/outlineTree.ts'

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
  /** 滚动的量取它：`.outline` 的 parentElement 才是带 overflow 的 `.file-tree-list` */
  const asideRef = useRef<HTMLElement | null>(null)

  // 光标跳到被折叠的子树里时自动展开祖先，不然当前节会「消失」
  useEffect(() => {
    setCollapsed((previous) => expandAncestors(previous, nodes, activeId))
  }, [activeId, nodes])

  // 折叠后的可见行。引用要稳：跟随滚动的 effect 靠它判断「行集合变了」，每次渲染都新数组会白滚
  const rows = useMemo(() => {
    const byId = new Map(nodes.map((node) => [node.id, node]))
    return nodes.filter((node) => {
      let parentId = node.parentId
      while (parentId) {
        if (collapsed.has(parentId)) return false
        parentId = byId.get(parentId)?.parentId ?? null
      }
      return true
    })
  }, [nodes, collapsed])

  // 当前节被折叠时高亮最外层被折叠的祖先，折叠后仍能定位
  const visibleId = useMemo(
    () => visibleActiveId(nodes, collapsed, activeId),
    [nodes, collapsed, activeId],
  )

  /**
   * 当前节跟随滚动（第 64 轮 B-137）：长文里当前条常落在面板可见区外，大纲却停在文首。
   * 只在「越界」时补最小距离（nearestScrollTop），手滚面板不会被抢回去。
   * 容器从 `.outline` 的 parentElement 取：文件树里也有同名 `.file-tree-list`（不可见），
   * querySelector 会量到它。滚动放到一帧后做，等折叠/展开引起的重排落地。
   */
  useEffect(() => {
    if (!visibleId) return undefined
    const frame = requestAnimationFrame(() => {
      const aside = asideRef.current
      const scroller = aside?.parentElement
      if (!aside || !scroller) return
      const row = aside.querySelector<HTMLElement>(`[data-outline-id="${visibleId}"]`)
      if (!row) return
      const box = scroller.getBoundingClientRect()
      const rect = row.getBoundingClientRect()
      // 面板不可见（切到文件页签、侧栏收窄）时矩形全是 0：不抢滚动
      if (box.height <= 0 || rect.height <= 0) return
      // 可见区是容器的内边距盒：`.file-tree-list` 上下还有 2px / 16px padding，
      // 按边框盒算会让首条永远落不到 scrollTop 0（回顶差 2px）。
      const style = getComputedStyle(scroller)
      const padTop = Number.parseFloat(style.paddingTop) || 0
      const padBottom = Number.parseFloat(style.paddingBottom) || 0
      const next = nearestScrollTop({
        scrollTop: scroller.scrollTop,
        containerTop: box.top + padTop,
        containerBottom: box.bottom - padBottom,
        itemTop: rect.top,
        itemBottom: rect.bottom,
        maxScrollTop: Math.max(0, scroller.scrollHeight - scroller.clientHeight),
      })
      if (Math.abs(next - scroller.scrollTop) > 1) scroller.scrollTop = next
    })
    return () => cancelAnimationFrame(frame)
  }, [visibleId, rows])

  if (items.length === 0) {
    return (
      <aside className="outline" aria-label="大纲" ref={asideRef}>
        <p className="outline-empty">这篇还没有标题</p>
      </aside>
    )
  }

  return (
    <aside className="outline" aria-label="大纲" ref={asideRef}>
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
                data-outline-id={node.id}
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
