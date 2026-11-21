import {
  lazy,
  Suspense,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
} from 'react'

import type { Workspace, WorkspaceFileNode, WorkspaceNode } from '../lib/workspace.ts'
import { flattenFiles, relativePath } from '../lib/workspace.ts'

const TreeActions = lazy(() => import('./TreeActions.tsx'))
const RenameInput = lazy(() =>
  import('./TreeActions.tsx').then((module) => ({ default: module.RenameInput })),
)

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
  onBeforeRename: () => Promise<void>
  onRenameFile: (file: WorkspaceFileNode, newName: string) => void
  dirtyPath?: string | null
  /** 文件呈现方式：树形逐层展开 / 平铺列表（第 59 轮 B-102） */
  view: 'tree' | 'list'
  onViewChange: (view: 'tree' | 'list') => void
  panelId?: string
  hidden?: boolean
  inert?: boolean
}

type Row = { node: WorkspaceNode; level: number }

/**
 * 「写不进去」那行警示的 id（第 141 轮）：文件树的「＋ 新建」用 aria-describedby 指向它。
 * 原因以前只放在 title 里，键盘与触屏用户看不到；现在必须有一行可见文本。
 */
const WRITE_WARNING_ID = 'tree-write-warning'

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
  onBeforeRename,
  onRenameFile,
  dirtyPath,
  view,
  onViewChange,
  panelId,
  hidden,
  inert,
}: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set())
  const [newMenuOpen, setNewMenuOpen] = useState(false)
  const [moreMenuOpen, setMoreMenuOpen] = useState(false)
  const [rowMenu, setRowMenu] = useState<{ node: WorkspaceNode; x: number; y: number } | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<WorkspaceFileNode | null>(null)
  const [renamePath, setRenamePath] = useState<string | null>(null)
  const [focusPath, setFocusPath] = useState<string | null>(activePath)
  const treeRef = useRef<HTMLDivElement | null>(null)
  const listRef = useRef<HTMLDivElement | null>(null)
  const scrollTopRef = useRef(0)
  const wasHiddenRef = useRef(false)
  const wasFocusedRef = useRef(false)

  useLayoutEffect(() => {
    if (hidden) {
      wasHiddenRef.current = true
      return
    }
    if (!wasHiddenRef.current || !listRef.current) return
    wasHiddenRef.current = false
    const frame = requestAnimationFrame(() => {
      if (listRef.current) listRef.current.scrollTop = scrollTopRef.current
    })
    return () => cancelAnimationFrame(frame)
  }, [hidden])

  useEffect(() => {
    setFocusPath((previous) => previous ?? activePath)
    if (!wasFocusedRef.current) return
    if (document.activeElement?.closest('.ProseMirror')) return // 第 34 轮：快速打开后焦点已交还正文，别抢
    const target =
      activePath ?? treeRef.current?.querySelector<HTMLElement>('[role="treeitem"]')?.dataset.path ?? null
    if (!target) return
    const frame = requestAnimationFrame(() => {
      // 第 68 轮：在「抢」的那一帧再判一次。判在排 rAF 之前会被同一帧里别的聚焦排程翻盘
      // （快速打开选中后 App 的聚焦排在 rAF 里，这一帧谁先谁后不定），正文/源码框拿到焦点就不抢。
      if (document.activeElement?.closest('.ProseMirror, textarea.source-editor')) return
      const row = treeRef.current?.querySelector<HTMLElement>(`[data-path="${CSS.escape(target)}"]`)
      row?.focus()
    })
    return () => cancelAnimationFrame(frame)
  }, [activePath])

  const nodes = workspace ? rootNodes(workspace) : []
  const flatFiles = workspace ? flattenFiles(workspace.root) : []
  const rows = visibleRows(nodes, expanded)
  const visiblePaths = new Set(rows.map((row) => row.node.path))
  const focusVisible = focusPath && visiblePaths.has(focusPath) ? focusPath : null
  const activeVisible = activePath && visiblePaths.has(activePath) ? activePath : null
  // 折叠祖先后：activePath 不可见时回退到最近可见祖先，再不行用第一行，保证树始终有一个 tab 站
  const nearestAncestor = ((): string | null => {
    if (!activePath) return null
    const parts = activePath.split('/')
    while (parts.length > 0) {
      parts.pop()
      const candidate = parts.join('/')
      if (candidate && visiblePaths.has(candidate)) return candidate
    }
    return null
  })()
  const tabbablePath = focusVisible ?? activeVisible ?? nearestAncestor ?? rows[0]?.node.path ?? null

  // 列表态单独算 roving tabindex（第 61 轮 B3）：不能复用 tabbablePath——
  // 它按树的可见 rows 算，当前文件在折叠目录里时会回退成目录，列表态就一个键盘站都没有
  const listPaths = new Set(flatFiles.map((file) => file.path))
  const listTabbable =
    focusPath && listPaths.has(focusPath)
      ? focusPath
      : activePath && listPaths.has(activePath)
        ? activePath
        : (flatFiles[0]?.path ?? null)

  // 当前文件换路径（打开/刷新/改名）时逐级展开祖先，保证选中行可见
  useEffect(() => {
    if (!activePath) return
    const parts = activePath.split('/')
    if (parts.length <= 1) return
    const ancestors: string[] = []
    for (let index = 1; index < parts.length; index += 1) ancestors.push(parts.slice(0, index).join('/'))
    setExpanded((current) => {
      if (ancestors.every((path) => current.has(path))) return current
      const next = new Set(current)
      for (const path of ancestors) next.add(path)
      return next
    })
  }, [activePath])

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

  // 列表态的键盘导航（第 61 轮 B3）：方向键只移焦点，Enter/Space 交给原生 button 打开文件
  const focusListRow = (path: string) => {
    setFocusPath(path)
    listRef.current?.querySelector<HTMLElement>(`.file-list-row[data-path="${CSS.escape(path)}"]`)?.focus()
  }

  const onListKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (!flatFiles.length) return
    const index = Math.max(
      0,
      flatFiles.findIndex((file) => file.path === listTabbable),
    )
    const move = (next: number) => {
      event.preventDefault()
      const target = flatFiles[Math.max(0, Math.min(flatFiles.length - 1, next))]
      if (target) focusListRow(target.path)
    }
    if (event.key === 'ArrowDown') move(index + 1)
    else if (event.key === 'ArrowUp') move(index - 1)
    else if (event.key === 'Home') move(0)
    else if (event.key === 'End') move(flatFiles.length - 1)
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
    } else if (event.key === 'Delete' || event.key === 'F2' || (event.key === 'F10' && event.shiftKey)) {
      event.preventDefault()
      event.stopPropagation()
      if (row.node.kind === 'dir') return
      if (event.key === 'F2') {
        if (workspace?.rootHandle) setRenamePath(row.node.path)
        return
      }
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
      <aside
        className="file-tree file-tree-collapsed"
        aria-label="文件树"
        {...(panelId ? { id: panelId, role: 'tabpanel' as const, 'aria-labelledby': 'sidebar-tab-files' } : {})}
        hidden={hidden}
        inert={inert}
      >
        <button type="button" onClick={onToggle} aria-label="展开文件树" title="展开文件树">
          ›
        </button>
      </aside>
    )
  }

  if (!workspace) {
    return (
      <aside
        className="file-tree"
        aria-label="文件树"
        {...(panelId ? { id: panelId, role: 'tabpanel' as const, 'aria-labelledby': 'sidebar-tab-files' } : {})}
        hidden={hidden}
        inert={inert}
      >
        <div className="file-tree-empty">
          <p className="file-tree-empty-title">还没有打开文件夹</p>
          <p className="file-tree-empty-sub">打开一个文件夹后，保存会写回原文件</p>
          <div className="file-tree-actions">
            <button type="button" className="file-tree-open-wide" style={{ width: '100%' }} onClick={onOpenFolder}>
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
      style: { paddingLeft: 6 + (level - 1) * 14 },
      className: `${node.kind === 'file' ? 'tree-file' : 'tree-dir-name'}${active ? ' is-active' : ''}`,
      onFocus: () => setFocusPath(node.path),
      onKeyDown: (event: ReactKeyboardEvent) => {
        if (event.key === 'F2') {
          event.preventDefault()
          event.stopPropagation()
          if (node.kind === 'file' && workspace?.rootHandle) setRenamePath(node.path)
          return
        }
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
            title={node.name}
            onClick={() => {
              wasFocusedRef.current = true
              onOpenFile(node)
            }}
          >
            {renamePath === node.path && workspace?.rootHandle ? (
              <Suspense fallback={node.name}>
                <RenameInput
                  file={node}
                  rootHandle={workspace.rootHandle}
                  onBeforeRename={onBeforeRename}
                  onCancel={() => setRenamePath(null)}
                  onDone={(newName) => {
                    const cut = node.path.lastIndexOf('/')
                    const newPath = cut >= 0 ? `${node.path.slice(0, cut)}/${newName}` : newName
                    setRenamePath(null)
                    setFocusPath(newPath)
                    onRenameFile(node, newName)
                  }}
                />
              </Suspense>
            ) : (
              node.name
            )}
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
            {node.children.length === 0 ? (
              <p className="tree-empty-dir" role="none">这个文件夹里没有 Markdown 文件</p>
            ) : (
              node.children.map((child) => renderRow({ node: child, level: level + 1 }))
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <aside
      className="file-tree"
      aria-label="文件树"
      {...(panelId ? { id: panelId, role: 'tabpanel' as const, 'aria-labelledby': 'sidebar-tab-files' } : {})}
      hidden={hidden}
      inert={inert}
    >
      <header className="file-tree-head">
        <span className="file-tree-name" title={workspace.name}>
          {workspace.name}
        </span>
        <div className="tree-view-toggle" role="group" aria-label="文件显示方式">
          <button
            type="button"
            className={view === 'tree' ? 'is-on' : ''}
            aria-pressed={view === 'tree'}
            title="树形显示（按文件夹逐层展开）"
            onClick={() => onViewChange('tree')}
          >
            树
          </button>
          <button
            type="button"
            className={view === 'list' ? 'is-on' : ''}
            aria-pressed={view === 'list'}
            title="列表显示（全部文件按相对路径平铺）"
            onClick={() => onViewChange('list')}
          >
            列表
          </button>
        </div>
        <button type="button" onClick={onToggle} aria-label="收起文件树" title="收起文件树">
          ‹
        </button>
      </header>

      <div className="file-tree-head-actions">
          <div className="tree-new-wrap">
            <button
              type="button"
              className="tree-new-main"
              onClick={onNewFile}
              title={trashReason ?? '新建文件'}
              aria-describedby={trashReason ? WRITE_WARNING_ID : undefined}
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

      {trashReason ? (
        <p className="tree-write-warning" id={WRITE_WARNING_ID} role="status">
          {trashReason}能打开也能编辑，保存会失败：请用「文件 → 另存为」换一个位置。
        </p>
      ) : null}

      {view === 'list' ? (
        <div
          className="file-tree-list file-list"
          ref={(node) => {
            listRef.current = node
          }}
          onScroll={(event) => {
            scrollTopRef.current = event.currentTarget.scrollTop
          }}
          onKeyDown={onListKeyDown}
          onFocus={() => {
            wasFocusedRef.current = true
          }}
        >
          {flatFiles.length === 0 ? (
            <p className="file-tree-empty">这个文件夹里没有 Markdown 文件</p>
          ) : (
            <ul className="file-list-rows" role="list" aria-label="文件列表">
              {flatFiles.map((file) => {
                const active = file.path === activePath
                return (
                  <li key={file.path}>
                    <button
                      type="button"
                      className={`file-list-row${active ? ' is-active' : ''}`}
                      data-path={file.path}
                      // roving tabindex：列表只占一个 Tab 站，方向键在行间移动（第 61 轮 B3）
                      tabIndex={file.path === listTabbable ? 0 : -1}
                      aria-current={active ? 'true' : undefined}
                      title={file.path}
                      onFocus={() => setFocusPath(file.path)}
                      onClick={() => {
                        wasFocusedRef.current = true
                        onOpenFile(file)
                      }}
                    >
                      <span className="file-list-name">{file.name}</span>
                      <span className="file-list-path">{relativePath(file.path)}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      ) : (
        <div
          ref={(node) => {
            treeRef.current = node
            listRef.current = node
          }}
          className="file-tree-list"
          role="tree"
          aria-label="文件树"
          onScroll={(event) => {
            scrollTopRef.current = event.currentTarget.scrollTop
          }}
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
      )}

      <Suspense fallback={null}>
        <TreeActions
          menu={rowMenu}
          deleteTarget={deleteTarget}
          headerMenu={newMenuOpen ? 'new' : moreMenuOpen ? 'more' : null}
          onNewFile={onNewFile}
          onNewFolder={onNewFolder}
          onOpenFolder={onOpenFolder}
          onCloseHeaderMenu={() => {
            setNewMenuOpen(false)
            setMoreMenuOpen(false)
          }}
          onCloseMenu={() => setRowMenu(null)}
          onRename={(file) => {
            if (workspace?.rootHandle) setRenamePath(file.path)
          }}
          onAskDelete={(file) => setDeleteTarget(file)}
          onCancelDelete={() => setDeleteTarget(null)}
          deleteIsDirty={Boolean(deleteTarget && dirtyPath === deleteTarget.path)}
          onConfirmDelete={(file) => {
            setDeleteTarget(null)
            onDeleteFile(file)
          }}
        />
      </Suspense>
    </aside>
  )
}
