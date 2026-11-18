import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import type { OutlineItem } from '../lib/outline.ts'
import {
  buildOutlineTree,
  expandAncestors,
  nearestScrollTop,
  resolveRovingId,
  stepRowId,
  visibleActiveId,
  visibleRows,
} from '../lib/outlineTree.ts'

type Props = {
  items: OutlineItem[]
  activeId: string | null
  onJump: (item: OutlineItem) => void
}

/**
 * 大纲面板。纯展示：光标在哪一节由调用方算好传进来，
 * 这里不监听编辑器，只把折叠集合留在内存里（会话内有效，不持久化）。
 * 第 65 轮 B-138：补 tree/treeitem 语义、roving tabindex 与方向键，键盘用户可整篇跳章节。
 */
export function Outline({ items, activeId, onJump }: Props) {
  const nodes = useMemo(() => buildOutlineTree(items), [items])
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set())
  /** roving tabindex 的落点：最后聚焦的行。Tab 出大纲再 Shift+Tab 回来仍停在这一行 */
  const [focusedId, setFocusedId] = useState<string | null>(null)
  /** 滚动的量取它：`.outline` 的 parentElement 才是带 overflow 的 `.file-tree-list` */
  const asideRef = useRef<HTMLElement | null>(null)

  // 光标跳到被折叠的子树里时自动展开祖先，不然当前节会「消失」
  useEffect(() => {
    setCollapsed((previous) => expandAncestors(previous, nodes, activeId))
  }, [activeId, nodes])

  // 折叠后的可见行。引用要稳：跟随滚动的 effect 靠它判断「行集合变了」，每次渲染都新数组会白滚
  const rows = useMemo(() => visibleRows(nodes, collapsed), [nodes, collapsed])

  // 当前节被折叠时高亮最外层被折叠的祖先，折叠后仍能定位
  const visibleId = useMemo(
    () => visibleActiveId(nodes, collapsed, activeId),
    [nodes, collapsed, activeId],
  )

  const rovingId = resolveRovingId(rows, focusedId, visibleId)

  /** 把焦点送到某一行；focusedId 先落，元素不存在时也不丢 roving 落点 */
  const focusRow = (id: string | null) => {
    if (!id) return
    setFocusedId(id)
    asideRef.current?.querySelector<HTMLElement>(`[data-outline-id="${id}"]`)?.focus()
  }

  const toggleNode = (id: string) => {
    setCollapsed((previous) => {
      const next = new Set(previous)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

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
      <div role="tree" aria-label="大纲" className="outline-list">
        {rows.map((node) => {
          const active = node.id === visibleId
          const isCollapsed = collapsed.has(node.id)
          return (
            <Fragment key={node.id}>
              {node.hasChildren ? (
                <button
                  type="button"
                  className="outline-toggle"
                  // 折叠钮只是鼠标快捷方式：键盘走 treeitem 的左右键。aria-hidden 不让读屏重复念两遍展开状态
                  tabIndex={-1}
                  aria-hidden="true"
                  aria-expanded={!isCollapsed}
                  aria-label={`折叠/展开「${node.text}」`}
                  style={{ width: 14, padding: 0, border: 0, background: 'none', color: 'inherit' }}
                  onClick={() => toggleNode(node.id)}
                >
                  {isCollapsed ? '▸' : '▾'}
                </button>
              ) : (
                <span aria-hidden="true" style={{ width: 14 }} />
              )}
              <button
                type="button"
                role="treeitem"
                aria-level={node.level}
                aria-expanded={node.hasChildren ? !isCollapsed : undefined}
                aria-current={active ? 'location' : undefined}
                tabIndex={node.id === rovingId ? 0 : -1}
                className={active ? 'outline-item is-active' : 'outline-item'}
                data-outline-id={node.id}
                style={{ paddingLeft: `${(node.level - 1) * 10}px` }}
                title={node.text}
                onFocus={() => setFocusedId(node.id)}
                onClick={() => onJump(node)}
                onKeyDown={(event) => {
                  if (event.ctrlKey || event.metaKey || event.altKey) return
                  // Enter / Space 交给 button 的原生激活：直接触发 onClick → jumpTo
                  const index = rows.findIndex((row) => row.id === node.id)
                  switch (event.key) {
                    case 'ArrowDown':
                      event.preventDefault()
                      focusRow(stepRowId(rows, node.id, 1))
                      break
                    case 'ArrowUp':
                      event.preventDefault()
                      focusRow(stepRowId(rows, node.id, -1))
                      break
                    case 'Home':
                      event.preventDefault()
                      focusRow(rows[0]?.id ?? null)
                      break
                    case 'End':
                      event.preventDefault()
                      focusRow(rows[rows.length - 1]?.id ?? null)
                      break
                    case 'ArrowRight': {
                      event.preventDefault()
                      if (!node.hasChildren) break
                      if (isCollapsed) {
                        toggleNode(node.id)
                        break
                      }
                      // 已展开：按树的惯例走进第一个子行
                      const child = rows[index + 1]
                      if (child && child.parentId === node.id) focusRow(child.id)
                      break
                    }
                    case 'ArrowLeft':
                      event.preventDefault()
                      // 展开的父级先收起；已收起或没有子级时回到父行
                      if (node.hasChildren && !isCollapsed) toggleNode(node.id)
                      else focusRow(node.parentId)
                      break
                    default:
                      break
                  }
                }}
              >
                {node.text}
              </button>
            </Fragment>
          )
        })}
      </div>
    </aside>
  )
}
