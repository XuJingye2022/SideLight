import { useEffect, useRef, useState, type CSSProperties } from 'react'

import { DELETE_RECOVER_TAIL, DELETE_TRASH_DIR, deleteDialogLead } from '../lib/deleteDialogText.ts'
import { renameFile, validateRename } from '../lib/rename.ts'
import type { WorkspaceFileNode, WorkspaceNode } from '../lib/workspace.ts'
import { useDialogFocus } from './useDialogFocus.ts'

const MENU_WIDTH = 168
/** 右边留 8px：窗口再窄，菜单也不越界（168 + 8） */
const VIEWPORT_GUTTER = MENU_WIDTH + 8
/** 菜单下面至少留 120px，避免贴到窗口底边被裁 */
const BOTTOM_RESERVE = 120

const MENU_STYLE: CSSProperties = {
  position: 'fixed',
  zIndex: 40,
  minWidth: MENU_WIDTH,
  padding: 4,
  border: '1px solid var(--line)',
  borderRadius: 8,
  background: 'var(--paper-raised)',
  boxShadow: '0 12px 32px rgba(18, 20, 22, 0.16)',
}
const ROW_MENU_STYLE: CSSProperties = { ...MENU_STYLE, zIndex: 50 }

/**
 * 第 147 轮：树头菜单贴触发钮。
 * 锚点来自触发钮的 getBoundingClientRect()（视口坐标），菜单用 position:fixed，
 * 不再跟着 `top:calc(100%+4px); left:0` 落到左栏末尾。
 * 「⋯」按右缘对齐：left = min(x - 菜单宽, 窗口宽 - 176)；新建菜单按左缘对齐。
 */
function headerMenuStyle(anchor: { x: number; y: number; align: 'left' | 'right' }): CSSProperties {
  const left =
    anchor.align === 'right'
      ? Math.min(anchor.x - MENU_WIDTH, window.innerWidth - VIEWPORT_GUTTER)
      : Math.min(anchor.x, window.innerWidth - VIEWPORT_GUTTER)
  return {
    ...MENU_STYLE,
    left,
    top: Math.min(anchor.y, window.innerHeight - BOTTOM_RESERVE),
  }
}
const ITEM_STYLE: CSSProperties = {
  display: 'block',
  width: '100%',
  padding: '5px 8px',
  border: 0,
  borderRadius: 6,
  background: 'none',
  textAlign: 'left',
  fontSize: 'var(--text-xs)',
  color: 'var(--ink)',
}

type Props = {
  menu: { node: WorkspaceNode; x: number; y: number } | null
  deleteTarget: WorkspaceFileNode | null
  headerMenu: 'new' | 'more' | null
  /** 触发钮的视口坐标（第 147 轮）：菜单贴按钮下方 4px，窄窗夹在视口内 */
  headerAnchor: { x: number; y: number; align: 'left' | 'right' } | null
  onCloseMenu: () => void
  onAskDelete: (file: WorkspaceFileNode) => void
  onCancelDelete: () => void
  onConfirmDelete: (file: WorkspaceFileNode) => void
  deleteIsDirty: boolean
  onNewFile: () => void
  onNewFolder: () => void
  onOpenFolder: () => void
  onCloseHeaderMenu: () => void
  onRename: (file: WorkspaceFileNode) => void
}

/** 行内重命名输入框：懒加载 chunk 内完成校验、两道探测与 move，成功后交给 App 同步身份 */
export function RenameInput({
  file,
  rootHandle,
  onBeforeRename,
  onDone,
  onCancel,
}: {
  file: WorkspaceFileNode
  rootHandle: FileSystemDirectoryHandle
  onBeforeRename: () => Promise<void>
  onDone: (newName: string) => void
  onCancel: () => void
}) {
  const [value, setValue] = useState(file.name)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const busyRef = useRef(false)

  useEffect(() => {
    const input = inputRef.current
    if (!input) return
    input.focus()
    const dot = file.name.lastIndexOf('.')
    input.setSelectionRange(0, dot > 0 ? dot : file.name.length)
  }, [file.name])

  const commit = async () => {
    if (busyRef.current) return
    const validation = validateRename(value, file.name)
    if (!validation.ok) {
      setError(validation.error)
      return
    }
    busyRef.current = true
    setBusy(true)
    setError(null)
    try {
      const parts = file.path.split('/').filter(Boolean)
      if (parts[0] === rootHandle.name) parts.shift()
      parts.pop()
      let parent = rootHandle
      for (const part of parts) parent = await parent.getDirectoryHandle(part)
      await onBeforeRename()
      const result = await renameFile(parent, file.handle!, file.name, validation.name)
      if (!result.ok) {
        setError(result.error)
        return
      }
      onDone(result.name)
    } catch (failure) {
      setError(`改名失败：${failure instanceof Error && failure.message ? failure.message : '未知错误'}。`)
    } finally {
      busyRef.current = false
      setBusy(false)
    }
  }

  return (
    <span style={{ display: 'flex', flex: 1, minWidth: 0, alignItems: 'center', gap: 6 }}>
      <input
        ref={inputRef}
        style={{
          flex: 1,
          minWidth: 0,
          maxWidth: 181,
          padding: '1px 4px',
          border: '1px solid var(--accent)',
          borderRadius: 4,
          background: 'var(--paper-raised)',
          font: 'inherit',
        }}
        value={value}
        disabled={busy}
        className="tree-rename-input"
        aria-label={`重命名 ${file.name}`}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          event.stopPropagation()
          if (event.key === 'Enter') {
            if (event.nativeEvent.isComposing) return
            event.preventDefault()
            void commit()
          } else if (event.key === 'Escape') {
            event.preventDefault()
            onCancel()
          }
        }}
        onBlur={() => {
          if (!busyRef.current) onCancel()
        }}
        onClick={(event) => event.stopPropagation()}
        onMouseDown={(event) => event.stopPropagation()}
      />
      {error && (
        <span
          className="tree-rename-error"
          style={{
            flex: 'none',
            maxWidth: 210,
            overflow: 'hidden',
            color: 'var(--warn)',
            fontSize: 11,
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {error}
        </span>
      )}
    </span>
  )
}

/** 行菜单、删除确认与树头下拉只在用户操作时才加载，避免占首屏 */
export default function TreeActions({
  menu,
  deleteTarget,
  headerMenu,
  headerAnchor,
  onCloseMenu,
  onAskDelete,
  onCancelDelete,
  onConfirmDelete,
  deleteIsDirty,
  onNewFile,
  onNewFolder,
  onOpenFolder,
  onCloseHeaderMenu,
  onRename,
}: Props) {
  const dialogRef = useRef<HTMLDivElement | null>(null)
  const cancelRef = useRef<HTMLButtonElement | null>(null)
  useDialogFocus(deleteTarget !== null, dialogRef)

  useEffect(() => {
    if (!deleteTarget) return
    const frame = requestAnimationFrame(() => cancelRef.current?.focus())
    return () => cancelAnimationFrame(frame)
  }, [deleteTarget])

  return (
    <>
      {headerMenu === 'new' && headerAnchor && (
        <div className="tree-popover" style={headerMenuStyle(headerAnchor)} role="menu" aria-label="新建">
          <button
            type="button"
            role="menuitem"
            style={ITEM_STYLE}
            onClick={() => {
              onCloseHeaderMenu()
              onNewFile()
            }}
          >
            新建文件
          </button>
          <button
            type="button"
            role="menuitem"
            style={ITEM_STYLE}
            onClick={() => {
              onCloseHeaderMenu()
              onNewFolder()
            }}
          >
            新建文件夹
          </button>
        </div>
      )}

      {headerMenu === 'more' && headerAnchor && (
        <div className="tree-popover" style={headerMenuStyle(headerAnchor)} role="menu" aria-label="更多">
          <button
            type="button"
            role="menuitem"
            style={ITEM_STYLE}
            onClick={() => {
              onCloseHeaderMenu()
              onOpenFolder()
            }}
          >
            打开其他文件夹…
          </button>
        </div>
      )}

      {menu && (
        <div className="tree-row-menu" style={{ ...ROW_MENU_STYLE, left: menu.x, top: menu.y }} role="menu">
          {menu.node.kind === 'file' && (
            <button
              type="button"
              role="menuitem"
              style={ITEM_STYLE}
              onClick={() => {
                onRename(menu.node as WorkspaceFileNode)
                onCloseMenu()
              }}
            >
              重命名
            </button>
          )}
          <button type="button" role="menuitem" style={ITEM_STYLE} onClick={() => {
            if (menu.node.kind === 'file') onAskDelete(menu.node)
            onCloseMenu()
          }}>
            删除（移到回收站）
          </button>
        </div>
      )}

      {deleteTarget && (
        <div className="overlay" role="presentation" onMouseDown={onCancelDelete}>
          <div
            ref={dialogRef}
            className="dialog"
            role="dialog"
            aria-modal="true"
            aria-label="删除文件"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <h2>删除「{deleteTarget.name}」？</h2>
            <p className="dialog-note">
              {deleteDialogLead(deleteIsDirty)}
              <code>{DELETE_TRASH_DIR}</code>
              {DELETE_RECOVER_TAIL}
            </p>
            <div className="dialog-actions">
              <button ref={cancelRef} type="button" onClick={onCancelDelete}>
                取消
              </button>
              <button
                type="button"
                style={{
                  borderColor: 'color-mix(in srgb, var(--warn) 65%, var(--line-strong))',
                  color: 'color-mix(in srgb, var(--warn) 70%, var(--ink))',
                }}
                onClick={() => onConfirmDelete(deleteTarget)}
              >
                移到回收站
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
