import { useEffect, useRef, useState } from 'react'

import type { Keybindings } from '../lib/keybindings.ts'

type RecentItem = { id: string; seq: number; name: string; dir: string }

/** 顶栏「视图」组五项的开关态（第 143 轮 B1：从格式栏搬进菜单，aria-checked 与真实状态一致） */
export type ViewState = { diff: boolean; focus: boolean; typewriter: boolean; source: boolean; preview: boolean }
type ViewId = keyof ViewState

type Props = {
  onNew: () => void
  /** 重命名当前文档（第 144 轮 A3）：与双击顶栏标题同一个动作 */
  onRename: () => void
  onSaveAs: () => void
  onOpenFile: () => void
  onOpenFolder: () => void
  onFind: () => void
  onExport: (kind: 'html' | 'markdown' | 'text' | 'print') => void
  view: ViewState
  /** 非编辑视图里 对比/专注/打字机 不可用（与原工具栏 disabled 同口径） */
  editView: boolean
  onToggleView: (id: ViewId) => void
  onShortcuts: () => void
  onSettings: () => void
  /** 8 条可改命令的当前键位：菜单里的键位提示跟着设置走（第 89 轮 B-107） */
  keybindings: Keybindings
  /** 最近打开：no-host 由 App 传 null，整段不渲染 */
  recent: { kind: 'disabled'; reason: string } | { kind: 'volatile' | 'ok'; items: RecentItem[]; reason?: string } | { kind: 'error'; message: string } | null
  recentDisabledId?: string | null
  onRefreshRecent: () => void
  onOpenRecent: (item: RecentItem) => void
  onClearRecent: () => Promise<boolean>
  /** Ctrl+Alt+E：打开菜单并把焦点送进「导出」组首项（token 变一次动作一次） */
  openGroup?: { token: number; group: 'export' } | null
}

const ITEMS: Array<{ label: string; keys: string; action: 'new' | 'rename' | 'saveAs' | 'openFile' | 'openFolder' | 'find' }> = [
  { label: '新建', keys: 'Ctrl+Alt+N', action: 'new' },
  { label: '重命名文档…', keys: '', action: 'rename' },
  { label: '另存为…', keys: 'Ctrl+Alt+S', action: 'saveAs' },
  { label: '打开文件…', keys: 'Ctrl+Alt+O', action: 'openFile' },
  { label: '打开文件夹…', keys: 'Ctrl+Alt+Shift+O', action: 'openFolder' },
  { label: '查找替换…', keys: 'Ctrl+F', action: 'find' },
]

const EXPORTS: Array<{ label: string; kind: 'html' | 'markdown' | 'text' | 'print' }> = [
  { label: 'HTML', kind: 'html' },
  { label: 'Markdown', kind: 'markdown' },
  { label: '纯文本', kind: 'text' },
  { label: '打印 / PDF', kind: 'print' },
]

const VIEWS: Array<{ label: string; id: ViewId; keys: string }> = [
  { label: '对比', id: 'diff', keys: '' },
  { label: '专注', id: 'focus', keys: 'F8' },
  { label: '打字机', id: 'typewriter', keys: '' },
  { label: '源码', id: 'source', keys: 'Ctrl+/' },
  { label: '预览', id: 'preview', keys: 'Ctrl+Shift+P' },
]

/** aria-keyshortcuts 只认 Control/Alt/Shift 这套写法 */
const ariaKeys = (keys: string) => keys.replace('Ctrl', 'Control')

/**
 * 顶栏「文件 ▾」：菜单分文件 / 导出 / 视图 / 帮助四组，方向键在组内走，Tab 关闭，
 * 动作后焦点按动作归还（新建回正文，其余回触发器）。Esc 关闭并把焦点还给按钮。
 */
export function FileMenu({
  onNew,
  onRename,
  onSaveAs,
  onOpenFile,
  onOpenFolder,
  onFind,
  onExport,
  view,
  editView,
  onToggleView,
  onShortcuts,
  onSettings,
  keybindings,
  recent,
  recentDisabledId,
  onRefreshRecent,
  onOpenRecent,
  onClearRecent,
  openGroup,
}: Props) {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const menuRef = useRef<HTMLDivElement | null>(null)
  const pendingFocusRef = useRef<'export' | null>(null)
  const lastTokenRef = useRef(0)

  // Ctrl+Alt+E：菜单没开就排队「打开后聚焦导出组」；已经开着就直接把焦点送过去
  useEffect(() => {
    const token = openGroup?.token ?? 0
    if (!token || token === lastTokenRef.current) return
    lastTokenRef.current = token
    if (open) {
      requestAnimationFrame(() => menuRef.current?.querySelector<HTMLElement>('[data-group="export"]')?.focus())
      return
    }
    pendingFocusRef.current = 'export'
    setOpen(true)
  }, [openGroup?.token, open])

  useEffect(() => {
    if (!open) return
    // 每次打开都重新拉一次：宿主可能刚转发过新文件
    onRefreshRecent()
    const target = pendingFocusRef.current === 'export' ? menuRef.current?.querySelector<HTMLElement>('[data-group="export"]') : null
    pendingFocusRef.current = null
    ;(target ?? menuRef.current?.querySelector<HTMLElement>('[role="menuitem"], [role="menuitemradio"]'))?.focus()

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
    if (action === 'rename') {
      // 菜单关掉但焦点留给顶栏的新输入框：closeTo('trigger') 的 rAF 会把焦点抢回去
      onRename()
      setOpen(false)
      return
    }
    if (action === 'saveAs') onSaveAs()
    else if (action === 'openFile') onOpenFile()
    else if (action === 'find') onFind()
    else onOpenFolder()
    closeTo('trigger')
  }

  // 键位文案跟着设置走；固定键照写
  const menuItems = ITEMS.map((item) =>
    item.action === 'new'
      ? { ...item, keys: keybindings.newDocument }
      : item.action === 'find'
        ? { ...item, keys: keybindings.find }
        : item,
  )

  const items = (): RecentItem[] => (recent && (recent.kind === 'ok' || recent.kind === 'volatile') ? recent.items : [])

  const focusableItems = () =>
    Array.from(
      menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]:not([disabled]), [role="menuitemradio"]:not([disabled])') ?? [],
    )

  return (
    <div className="file-menu-wrap">
      <button
        ref={triggerRef}
        type="button"
        className="file-menu-trigger"
        data-focus-fallback
        aria-haspopup="menu"
        aria-expanded={open}
        aria-keyshortcuts={ariaKeys(keybindings.newDocument)}
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
              // 菜单自己的 Esc/Tab 不再冒到 window：对比模式开着时 window 的 Esc 会顺手关面板（第 143 轮 B1）
              event.stopPropagation()
              closeTo('trigger')
            } else if (event.key === 'Escape') {
              event.preventDefault()
              event.stopPropagation()
              closeTo('trigger')
            }
          }}
        >
          {menuItems.map((item) => (
            <button
              key={item.action}
              type="button"
              role="menuitem"
              aria-keyshortcuts={item.keys ? ariaKeys(item.keys) : undefined}
              onClick={() => run(item.action)}
            >
              <span>{item.label}</span>
              <kbd>{item.keys}</kbd>
            </button>
          ))}

          <div className="menu-separator" role="separator" />
          <div className="menu-section-title" role="presentation">
            导出
            <kbd>{keybindings.exportMenu}</kbd>
          </div>
          {EXPORTS.map((item) => (
            <button
              key={item.kind}
              type="button"
              role="menuitem"
              data-group="export"
              onClick={() => {
                onExport(item.kind)
                closeTo('trigger')
              }}
            >
              <span>{item.label}</span>
            </button>
          ))}

          <div className="menu-separator" role="separator" />
          <div className="menu-section-title" role="presentation">
            视图
          </div>
          {VIEWS.map((item) => {
            const locked = !editView && item.id !== 'source' && item.id !== 'preview'
            return (
              <button
                key={item.id}
                type="button"
                role="menuitemradio"
                aria-checked={view[item.id]}
                disabled={locked}
                onClick={() => {
                  onToggleView(item.id)
                  closeTo('editor')
                }}
              >
                <span>{item.label}</span>
                <kbd>{item.keys}</kbd>
              </button>
            )
          })}

          <div className="menu-separator" role="separator" />
          <div className="menu-section-title" role="presentation">
            帮助
          </div>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false)
              onShortcuts()
            }}
          >
            <span>快捷键一览</span>
            <kbd>?</kbd>
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false)
              onSettings()
            }}
          >
            <span>设置…</span>
          </button>

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
