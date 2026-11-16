import { useEffect, useRef, useState } from 'react'

type RecentItem = { id: string; seq: number; name: string; dir: string }

type Props = {
  onNew: () => void
  onSaveAs: () => void
  onOpenFile: () => void
  onOpenFolder: () => void
  onFind: () => void
  /** 最近打开：no-host 由 App 传 null，整段不渲染 */
  recent: { kind: 'disabled'; reason: string } | { kind: 'volatile' | 'ok'; items: RecentItem[]; reason?: string } | { kind: 'error'; message: string } | null
  recentDisabledId?: string | null
  onRefreshRecent: () => void
  onOpenRecent: (item: RecentItem) => void
  onClearRecent: () => Promise<boolean>
}

const ITEMS: Array<{ label: string; keys: string; keyshortcuts: string; action: 'new' | 'saveAs' | 'openFile' | 'openFolder' | 'find' }> = [
  { label: '新建', keys: 'Ctrl+Alt+N', keyshortcuts: 'Control+Alt+N', action: 'new' },
  { label: '另存为…', keys: 'Ctrl+Alt+S', keyshortcuts: 'Control+Alt+S', action: 'saveAs' },
  { label: '打开文件…', keys: 'Ctrl+Alt+O', keyshortcuts: 'Control+Alt+O', action: 'openFile' },
  { label: '打开文件夹…', keys: 'Ctrl+Alt+Shift+O', keyshortcuts: 'Control+Alt+Shift+O', action: 'openFolder' },
  { label: '查找替换…', keys: 'Ctrl+F', keyshortcuts: 'Control+F', action: 'find' },
]

/**
 * 顶栏「文件 ▾」：方向键在菜单里走，Tab 关闭，动作后焦点按动作归还
 * （新建回正文，其余回触发器）。Esc 关闭并把焦点还给按钮。
 */
export function FileMenu({
  onNew,
  onSaveAs,
  onOpenFile,
  onOpenFolder,
  onFind,
  recent,
  recentDisabledId,
  onRefreshRecent,
  onOpenRecent,
  onClearRecent,
}: Props) {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const menuRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open) return
    // 每次打开都重新拉一次：宿主可能刚转发过新文件
    onRefreshRecent()
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
    else if (action === 'find') onFind()
    else onOpenFolder()
    closeTo('trigger')
  }

  const items = (): RecentItem[] => (recent && (recent.kind === 'ok' || recent.kind === 'volatile') ? recent.items : [])

  const focusableItems = () =>
    Array.from(menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]:not([disabled])') ?? [])

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
            const focusable = focusableItems()
            const index = focusable.indexOf(document.activeElement as HTMLElement)
            if (event.key === 'ArrowDown') {
              event.preventDefault()
              focusable[(index + 1) % focusable.length]?.focus()
            } else if (event.key === 'ArrowUp') {
              event.preventDefault()
              focusable[(index - 1 + focusable.length) % focusable.length]?.focus()
            } else if (event.key === 'Home') {
              event.preventDefault()
              focusable[0]?.focus()
            } else if (event.key === 'End') {
              event.preventDefault()
              focusable[focusable.length - 1]?.focus()
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

          {recent && (
            <>
              <div className="menu-separator" role="separator" />
              <div className="menu-section-title" role="presentation">
                最近打开
                {recent.kind === 'volatile' && <span className="recent-volatile">临时目录，重启可能丢失</span>}
              </div>

              {recent.kind === 'disabled' && <p className="recent-note">{recent.reason}</p>}
              {recent.kind === 'error' && <p className="recent-note">{recent.message}</p>}
              {(recent.kind === 'ok' || recent.kind === 'volatile') && items().length === 0 && (
                <p className="recent-note">还没有最近打开的文件。</p>
              )}
              {(recent.kind === 'ok' || recent.kind === 'volatile') &&
                items().map((item) => (
                  <button
                    key={`${item.id}-${item.seq}`}
                    type="button"
                    role="menuitem"
                    className="recent-item"
                    title={`${item.name} · ${item.dir}`}
                    disabled={recentDisabledId === item.id}
                    onClick={() => {
                      onOpenRecent(item)
                      closeTo('trigger')
                    }}
                  >
                    <span className="recent-name">{item.name}</span>
                    <span className="recent-dir">{item.dir}</span>
                  </button>
                ))}

              <div className="menu-separator" role="separator" />
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  void onClearRecent().then((cleared) => {
                    if (cleared) closeTo('trigger')
                  })
                }}
              >
                <span>清除最近记录</span>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
