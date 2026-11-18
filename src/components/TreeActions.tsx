import { useEffect, useRef, useState, type CSSProperties } from 'react'

import { DELETE_RECOVER_TAIL, DELETE_TRASH_DIR, deleteDialogLead } from '../lib/deleteDialogText.ts'
import { renameFile, validateRename } from '../lib/rename.ts'
import type { WorkspaceFileNode, WorkspaceNode } from '../lib/workspace.ts'
import { useDialogFocus } from './useDialogFocus.ts'

const MENU_STYLE: CSSProperties = {
  position: 'absolute',
  top: 'calc(100% + 4px)',
  left: 0,
  zIndex: 40,
  minWidth: 168,
  padding: 4,
  border: '1px solid var(--line)',
  borderRadius: 8,
  background: 'var(--paper-raised)',
  boxShadow: '0 12px 32px rgba(18, 20, 22, 0.16)',
}
const MENU_MORE_STYLE: CSSProperties = { ...MENU_STYLE, left: 'auto', right: 0 }
const ROW_MENU_STYLE: CSSProperties = { ...MENU_STYLE, position: 'fixed', zIndex: 50 }
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
  trashReason: string | null
  onCloseMenu: () => void
  onAskDelete: (file: WorkspaceFileNode) => void
  onCancelDelete: () => void
  onConfirmDelete: (file: WorkspaceFileNode) => void
  deleteIsDirty: boolean
  onNewFile: () => void
  onNewFolder: () => void
  onOpenFolder: () => void
  onRefresh: () => void
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
  trashReason,
  onCloseMenu,
  onAskDelete,
  onCancelDelete,
  onConfirmDelete,
  deleteIsDirty,
  onNewFile,
  onNewFolder,
  onOpenFolder,
  onRefresh,
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
      {headerMenu === 'new' && (
        <div className="tree-popover" style={MENU_STYLE} role="menu" aria-label="新建">
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
            disabled={Boolean(trashReason)}
            title={trashReason ?? undefined}
            onClick={() => {
              onCloseHeaderMenu()
              onNewFolder()
            }}
          >
            新建文件夹
          </button>
        </div>
      )}

      {headerMenu === 'more' && (
        <div className="tree-popover" style={MENU_MORE_STYLE} role="menu" aria-label="更多">
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
          <button
            type="button"
            role="menuitem"
            style={ITEM_STYLE}
            onClick={() => {
              onCloseHeaderMenu()
              onRefresh()
            }}
          >
            刷新
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
