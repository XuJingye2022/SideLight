import type { OutlineItem } from '../lib/outline.ts'

type Props = {
  items: OutlineItem[]
  activeId: string | null
  onJump: (item: OutlineItem) => void
}

/**
 * 大纲面板。纯展示：光标在哪一节由调用方算好传进来，
 * 这里既不监听编辑器，也不自己保存展开状态。
 */
export function Outline({ items, activeId, onJump }: Props) {
  if (items.length === 0) {
    return (
      <aside className="outline" aria-label="大纲">
        <p className="outline-empty">这篇还没有标题</p>
      </aside>
    )
  }

  return (
    <aside className="outline" aria-label="大纲">
      <nav className="outline-list">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            className={item.id === activeId ? 'outline-item is-active' : 'outline-item'}
            style={{ paddingLeft: `${(item.level - 1) * 10}px` }}
            title={item.text}
            onClick={() => onJump(item)}
          >
            {item.text}
          </button>
        ))}
      </nav>
    </aside>
  )
}
