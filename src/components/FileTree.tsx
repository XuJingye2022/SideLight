import { useState } from 'react'

import type { Workspace, WorkspaceFileNode, WorkspaceNode } from '../lib/workspace.ts'

type Props = {
  workspace: Workspace | null
  activePath: string | null
  collapsed: boolean
  onToggle: () => void
  onOpenFolder: () => void
  onOpenSingleFile: () => void
  onOpenDemo: () => void
  onOpenFile: (file: WorkspaceFileNode) => void
}

type BranchProps = {
  nodes: WorkspaceNode[]
  expanded: Set<string>
  activePath: string | null
  onToggleDir: (path: string) => void
  onOpenFile: (file: WorkspaceFileNode) => void
}

function TreeBranch({ nodes, expanded, activePath, onToggleDir, onOpenFile }: BranchProps) {
  return (
    <>
      {nodes.map((node) => {
        if (node.kind === 'file') {
          return (
            <button
              key={node.path}
              type="button"
              className={node.path === activePath ? 'tree-file is-active' : 'tree-file'}
              aria-current={node.path === activePath ? 'true' : undefined}
              title={node.path}
              onClick={() => onOpenFile(node)}
            >
              {node.name}
            </button>
          )
        }

        const open = expanded.has(node.path)
        return (
          <div key={node.path} className="tree-dir">
            <button
              type="button"
              className="tree-dir-name"
              aria-expanded={open}
              onClick={() => onToggleDir(node.path)}
            >
              <span aria-hidden="true">{open ? '▾ ' : '▸ '}</span>
              {node.name}
            </button>
            {open && node.children.length > 0 && (
              <TreeBranch
                nodes={node.children}
                expanded={expanded}
                activePath={activePath}
                onToggleDir={onToggleDir}
                onOpenFile={onOpenFile}
              />
            )}
          </div>
        )
      })}
    </>
  )
}

// 根节点通常是文件夹，只渲染它的子项，文件夹名已经在上面的头里了
function rootNodes(workspace: Workspace): WorkspaceNode[] {
  if (!workspace.root) return []
  return workspace.root.kind === 'dir' ? workspace.root.children : [workspace.root]
}

export function FileTree({
  workspace,
  activePath,
  collapsed,
  onToggle,
  onOpenFolder,
  onOpenSingleFile,
  onOpenDemo,
  onOpenFile,
}: Props) {
  // 展开状态只放本地，记的是目录的相对路径
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set())

  const toggleDir = (path: string) => {
    setExpanded((current) => {
      const next = new Set(current)
      if (next.has(path)) {
        next.delete(path)
      } else {
        next.add(path)
      }
      return next
    })
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
          <p className="file-tree-empty-sub">当前是示例，可以直接改</p>
          <div className="file-tree-actions">
            <button type="button" onClick={onOpenFolder}>
              打开文件夹
            </button>
            <button type="button" onClick={onOpenSingleFile}>
              打开文件
            </button>
            <button type="button" onClick={onOpenDemo}>
              试用示例
            </button>
          </div>
        </div>
      </aside>
    )
  }

  const nodes = rootNodes(workspace)

  return (
    <aside className="file-tree" aria-label="文件树">
      <header className="file-tree-head">
        <span className="file-tree-name" title={workspace.name}>
          {workspace.name}
        </span>
        <button type="button" onClick={onToggle} aria-label="收起文件树" title="收起文件树">
          ‹
        </button>
      </header>

      <div className="file-tree-list">
        {nodes.length > 0 ? (
          <TreeBranch
            nodes={nodes}
            expanded={expanded}
            activePath={activePath}
            onToggleDir={toggleDir}
            onOpenFile={onOpenFile}
          />
        ) : (
          <p className="file-tree-empty">这个文件夹里没有 Markdown 文件</p>
        )}
      </div>
    </aside>
  )
}
