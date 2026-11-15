import { useEffect, useRef, type CSSProperties } from 'react'

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
  onNewFile: () => void
  onNewFolder: () => void
  onOpenFolder: () => void
  onRefresh: () => void
  onCloseHeaderMenu: () => void
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
  onNewFile,
  onNewFolder,
  onOpenFolder,
  onRefresh,
  onCloseHeaderMenu,
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
              移到这个文件夹的 <code>.sidelight/trash/</code>，不会当场永久删除。要恢复，用文件管理器把 trash 里的文件移回原位。
            </p>
            <div className="dialog-actions">
              <button ref={cancelRef} type="button" onClick={onCancelDelete}>
                取消
              </button>
              <button type="button" className="warn" onClick={() => onConfirmDelete(deleteTarget)}>
                移到回收站
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
