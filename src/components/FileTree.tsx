import {
  lazy,
  Suspense,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
} from 'react'

import type { Workspace, WorkspaceFileNode, WorkspaceNode } from '../lib/workspace.ts'

const TreeActions = lazy(() => import('./TreeActions.tsx'))

type Props = {
  workspace: Workspace | null
  activePath: string | null
  collapsed: boolean
  trashReason: string | null
  refreshing: boolean
  onToggle: () => void
  onOpenFolder: () => void
  onOpenFile: (file: WorkspaceFileNode) => void
  onNewFile: () => void
  onNewFolder: () => void
  onRefresh: () => void
  onDeleteFile: (file: WorkspaceFileNode) => void
}

type Row = { node: WorkspaceNode; level: number }

function visibleRows(nodes: WorkspaceNode[], expanded: Set<string>, level = 1): Row[] {
  const rows: Row[] = []
  for (const node of nodes) {
    rows.push({ node, level })
    if (node.kind === 'dir' && expanded.has(node.path)) {
      rows.push(...visibleRows(node.children, expanded, level + 1))
    }
  }
  return rows
}

function rootNodes(workspace: Workspace): WorkspaceNode[] {
  if (!workspace.root) return []
  return workspace.root.kind === 'dir' ? workspace.root.children : [workspace.root]
}

export function FileTree({
  workspace,
  activePath,
  collapsed,
  trashReason,
  refreshing,
  onToggle,
  onOpenFolder,
  onOpenFile,
  onNewFile,
  onNewFolder,
  onRefresh,
  onDeleteFile,
}: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set())
  const [newMenuOpen, setNewMenuOpen] = useState(false)
  const [moreMenuOpen, setMoreMenuOpen] = useState(false)
  const [rowMenu, setRowMenu] = useState<{ node: WorkspaceNode; x: number; y: number } | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<WorkspaceFileNode | null>(null)
  const [focusPath, setFocusPath] = useState<string | null>(activePath)
  const treeRef = useRef<HTMLDivElement | null>(null)
  const wasFocusedRef = useRef(false)

  useEffect(() => {
    setFocusPath((previous) => previous ?? activePath)
    if (!wasFocusedRef.current) return
    const target =
      activePath ?? treeRef.current?.querySelector<HTMLElement>('[role="treeitem"]')?.dataset.path ?? null
    if (!target) return
    const frame = requestAnimationFrame(() => {
      const row = treeRef.current?.querySelector<HTMLElement>(`[data-path="${CSS.escape(target)}"]`)
      row?.focus()
    })
    return () => cancelAnimationFrame(frame)
  }, [activePath])

  const nodes = workspace ? rootNodes(workspace) : []
  const rows = visibleRows(nodes, expanded)
  const selectedPath = activePath ?? rows[0]?.node.path ?? null
  const tabbablePath = focusPath && rows.some((row) => row.node.path === focusPath) ? focusPath : selectedPath

  const toggleDir = (path: string) => {
    setExpanded((current) => {
      const next = new Set(current)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return next
    })
  }

  const focusRow = (path: string) => {
    setFocusPath(path)
    treeRef.current?.querySelector<HTMLElement>(`[data-path="${CSS.escape(path)}"]`)?.focus()
  }

  const onTreeKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (!rows.length) return
    const index = Math.max(
      0,
      rows.findIndex((row) => row.node.path === tabbablePath),
    )
    const row = rows[index]
    if (!row) return
    const move = (next: number) => {
      event.preventDefault()
      const target = rows[Math.max(0, Math.min(rows.length - 1, next))]
      if (target) focusRow(target.node.path)
    }
    if (event.key === 'ArrowDown') move(index + 1)
    else if (event.key === 'ArrowUp') move(index - 1)
    else if (event.key === 'Home') move(0)
    else if (event.key === 'End') move(rows.length - 1)
    else if (event.key === 'ArrowRight') {
      if (row.node.kind === 'dir') {
        event.preventDefault()
        if (!expanded.has(row.node.path)) toggleDir(row.node.path)
        else {
          const child = rows[index + 1]
          if (child && child.level > row.level) focusRow(child.node.path)
        }
      }
    } else if (event.key === 'ArrowLeft') {
      if (row.node.kind === 'dir' && expanded.has(row.node.path)) {
        event.preventDefault()
        toggleDir(row.node.path)
      } else {
        const parent = [...rows.slice(0, index)].reverse().find((candidate) => candidate.level < row.level)
        if (parent) move(rows.indexOf(parent))
      }
    } else if (event.key === 'Enter') {
      event.preventDefault()
      if (row.node.kind === 'dir') toggleDir(row.node.path)
      else onOpenFile(row.node)
    } else if (event.key === 'Delete' || (event.key === 'F10' && event.shiftKey)) {
      event.preventDefault()
      event.stopPropagation()
      if (row.node.kind === 'dir') return
      if (event.key === 'Delete') setDeleteTarget(row.node)
      else setRowMenu({ node: row.node, x: 32, y: 120 })
    } else if (event.key === 'ContextMenu') {
      event.preventDefault()
      event.stopPropagation()
      if (row.node.kind === 'file') setRowMenu({ node: row.node, x: 32, y: 120 })
    }
    // Tab 不拦截：roving tabindex 只让树占一个 tab 站，焦点自然离开
  }

  if (collapsed) {
    return (
      <aside className="file-tree file-tree-collapsed" aria-label="文件树">
        <button type="button" onClick={onToggle} aria-label="展开文件树" title="展开文件树">
          ›
        </button>
      </aside>
    )
  }

  if (!workspace) {
    return (
      <aside className="file-tree" aria-label="文件树">
        <div className="file-tree-empty">
          <p className="file-tree-empty-title">现在打开的是示例</p>
          <p className="file-tree-empty-sub">打开一个文件夹后，保存会写回原文件</p>
          <div className="file-tree-actions">
            <button type="button" className="file-tree-open-wide" onClick={onOpenFolder}>
              打开文件夹…
            </button>
          </div>
        </div>
      </aside>
    )
  }

  const renderRow = (row: Row) => {
    const { node, level } = row
    const active = node.path === activePath
    const tabIndex = node.path === tabbablePath ? 0 : -1
    const common = {
      role: 'treeitem' as const,
      'aria-level': level,
      'data-path': node.path,
      tabIndex,
      className: `${node.kind === 'file' ? 'tree-file' : 'tree-dir-name'}${active ? ' is-active' : ''}`,
      onFocus: () => setFocusPath(node.path),
      onKeyDown: (event: ReactKeyboardEvent) => {
        if (event.key === 'Delete' || (event.key === 'F10' && event.shiftKey)) {
          event.preventDefault()
          event.stopPropagation()
          if (node.kind === 'file') {
            if (event.key === 'Delete') setDeleteTarget(node)
            else setRowMenu({ node, x: 32, y: 120 })
          }
        }
      },
      onContextMenu: (event: ReactMouseEvent) => {
        event.preventDefault()
        event.stopPropagation()
        if (node.kind === 'file') setRowMenu({ node, x: event.clientX, y: event.clientY })
      },
    }

    if (node.kind === 'file') {
      return (
        <div className="tree-row" key={node.path} role="none">
          <div
            {...common}
            aria-selected={active}
            title={node.path}
            onClick={() => {
              wasFocusedRef.current = true
              onOpenFile(node)
            }}
          >
            {node.name}
          </div>
          <button
            type="button"
            className="tree-row-more"
            aria-label={`${node.name} 的操作`}
            tabIndex={-1}
            onClick={(event) => {
              event.stopPropagation()
              const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
              setRowMenu({ node, x: rect.left, y: rect.bottom })
            }}
          >
            ⋯
          </button>
        </div>
      )
    }

    const open = expanded.has(node.path)
    return (
      <div className="tree-dir" key={node.path} role="none">
        <div
          {...common}
          aria-expanded={open}
          onClick={() => {
            wasFocusedRef.current = true
            toggleDir(node.path)
          }}
        >
          <span aria-hidden="true">{open ? '▾ ' : '▸ '}</span>
          {node.name}
        </div>
        {open && (
          <div role="group" className="tree-group">
            {node.children.map((child) => renderRow({ node: child, level: level + 1 }))}
          </div>
        )}
      </div>
    )
  }

  return (
    <aside className="file-tree" aria-label="文件树">
      <header className="file-tree-head">
        <span className="file-tree-name" title={workspace.name}>
          {workspace.name}
        </span>
        {workspace.demo && <span className="file-badge">示例</span>}
        <button type="button" onClick={onToggle} aria-label="收起文件树" title="收起文件树">
          ‹
        </button>
      </header>

      {workspace.demo ? (
        <p className="file-tree-demo-note">改动不写盘，保存会另存为</p>
      ) : (
        <div className="file-tree-head-actions">
          <div className="tree-new-wrap">
            <button
              type="button"
              className="tree-new-main"
              onClick={onNewFile}
              disabled={Boolean(trashReason)}
              title={trashReason ?? '新建文件'}
            >
              ＋ 新建
            </button>
            <button
              type="button"
              className="tree-new-caret"
              aria-haspopup="menu"
              aria-expanded={newMenuOpen}
              aria-label="新建选项"
              onClick={() => setNewMenuOpen((value) => !value)}
            >
              ▾
            </button>
          </div>
          <button
            type="button"
            className="tree-icon"
            aria-label="刷新文件树"
            title="刷新"
            aria-busy={refreshing}
            onClick={onRefresh}
          >
            ⟳
          </button>
          <div className="tree-more-wrap">
            <button
              type="button"
              className="tree-icon"
              aria-label="更多文件树操作"
              aria-haspopup="menu"
              aria-expanded={moreMenuOpen}
              onClick={() => setMoreMenuOpen((value) => !value)}
            >
              ⋯
            </button>
          </div>
        </div>
      )}

      <div
        ref={treeRef}
        className="file-tree-list"
        role="tree"
        aria-label="文件树"
        onKeyDown={onTreeKeyDown}
        onFocus={() => {
          wasFocusedRef.current = true
        }}
      >
        {nodes.length > 0 ? (
          nodes.map((node) => renderRow({ node, level: 1 }))
        ) : (
          <p className="file-tree-empty">这个文件夹里没有 Markdown 文件</p>
        )}
      </div>

      <Suspense fallback={null}>
        <TreeActions
          menu={rowMenu}
          deleteTarget={deleteTarget}
          headerMenu={newMenuOpen ? 'new' : moreMenuOpen ? 'more' : null}
          trashReason={trashReason}
          onNewFile={onNewFile}
          onNewFolder={onNewFolder}
          onOpenFolder={onOpenFolder}
          onRefresh={onRefresh}
          onCloseHeaderMenu={() => {
            setNewMenuOpen(false)
            setMoreMenuOpen(false)
          }}
          onCloseMenu={() => setRowMenu(null)}
          onAskDelete={(file) => setDeleteTarget(file)}
          onCancelDelete={() => setDeleteTarget(null)}
          onConfirmDelete={(file) => {
            setDeleteTarget(null)
            onDeleteFile(file)
          }}
        />
      </Suspense>
    </aside>
  )
}
