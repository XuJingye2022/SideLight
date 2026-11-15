import { useEffect, useRef, useState } from 'react'

type Props = {
  onNew: () => void
  onSaveAs: () => void
  onOpenFile: () => void
  onOpenFolder: () => void
}

const ITEMS: Array<{ label: string; keys: string; keyshortcuts: string; action: 'new' | 'saveAs' | 'openFile' | 'openFolder' }> = [
  { label: '新建', keys: 'Ctrl+Alt+N', keyshortcuts: 'Control+Alt+N', action: 'new' },
  { label: '另存为…', keys: 'Ctrl+Alt+S', keyshortcuts: 'Control+Alt+S', action: 'saveAs' },
  { label: '打开文件…', keys: 'Ctrl+Alt+O', keyshortcuts: 'Control+Alt+O', action: 'openFile' },
  { label: '打开文件夹…', keys: 'Ctrl+Alt+Shift+O', keyshortcuts: 'Control+Alt+Shift+O', action: 'openFolder' },
]

/**
 * 顶栏「文件 ▾」：方向键在菜单里走，Tab 关闭，动作后焦点按动作归还
 * （新建回正文，其余回触发器）。Esc 关闭并把焦点还给按钮。
 */
export function FileMenu({ onNew, onSaveAs, onOpenFile, onOpenFolder }: Props) {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const menuRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open) return
    menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus()

    const onDown = (event: MouseEvent) => {
      const target = event.target as Node | null
      if (!target) return
      if (menuRef.current?.contains(target) || triggerRef.current?.contains(target)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  const closeTo = (target: 'trigger' | 'editor') => {
    setOpen(false)
    requestAnimationFrame(() => {
      if (target === 'editor') {
        const editor = document.querySelector<HTMLElement>('.ProseMirror')
        editor?.focus()
        return
      }
      triggerRef.current?.focus()
    })
  }

  const run = (action: (typeof ITEMS)[number]['action']) => {
    if (action === 'new') {
      onNew()
      closeTo('editor')
      return
    }
    if (action === 'saveAs') onSaveAs()
    else if (action === 'openFile') onOpenFile()
    else onOpenFolder()
    closeTo('trigger')
  }

  return (
    <div className="file-menu-wrap">
      <button
        ref={triggerRef}
        type="button"
        className="file-menu-trigger"
        data-focus-fallback
        aria-haspopup="menu"
        aria-expanded={open}
        aria-keyshortcuts="Control+Alt+N"
        onClick={() => setOpen((value) => !value)}
      >
        文件 ▾
      </button>
      {open && (
        <div
          ref={menuRef}
          className="menu file-menu"
          role="menu"
          aria-label="文件"
          onKeyDown={(event) => {
            const items = Array.from(menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])
            const index = items.indexOf(document.activeElement as HTMLElement)
            if (event.key === 'ArrowDown') {
              event.preventDefault()
              items[(index + 1) % items.length]?.focus()
            } else if (event.key === 'ArrowUp') {
              event.preventDefault()
              items[(index - 1 + items.length) % items.length]?.focus()
            } else if (event.key === 'Home') {
              event.preventDefault()
              items[0]?.focus()
            } else if (event.key === 'End') {
              event.preventDefault()
              items[items.length - 1]?.focus()
            } else if (event.key === 'Tab') {
              event.preventDefault()
              closeTo('trigger')
            } else if (event.key === 'Escape') {
              event.preventDefault()
              closeTo('trigger')
            }
          }}
        >
          {ITEMS.map((item) => (
            <button
              key={item.action}
              type="button"
              role="menuitem"
              aria-keyshortcuts={item.keyshortcuts}
              onClick={() => run(item.action)}
            >
              <span>{item.label}</span>
              <kbd>{item.keys}</kbd>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
