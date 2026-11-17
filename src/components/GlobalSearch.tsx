import { useRef, useState } from 'react'

import { collectDocs, searchWorkspace, type SearchHit } from '../lib/globalSearch.ts'
import { relativePath, type WorkspaceFileNode } from '../lib/workspace.ts'
import { useDialogFocus } from './useDialogFocus.ts'

type Props = {
  /** 工作区里全部 Markdown 文件（顺序与文件树一致） */
  files: WorkspaceFileNode[]
  onOpen: (hit: SearchHit, query: string) => void
  onClose: () => void
}

/**
 * Ctrl+Shift+F 全局搜索：先按回车搜整个工作区，再点一条结果跳到那个文件并回填查找条。
 * 只在打开时加载（App 里 lazy）；焦点进出交给 useDialogFocus。
 */
export function GlobalSearch({ files, onOpen, onClose }: Props) {
  const dialogRef = useRef<HTMLDivElement | null>(null)
  useDialogFocus(true, dialogRef)

  const [query, setQuery] = useState('')
  const [hits, setHits] = useState<SearchHit[]>([])
  const [note, setNote] = useState('输入关键词后按回车，搜索整个工作区')
  const [busy, setBusy] = useState(false)
  const [searched, setSearched] = useState(false)

  const run = async () => {
    const needle = query.trim()
    if (needle === '') return
    setBusy(true)
    try {
      const collected = await collectDocs(files)
      const report = searchWorkspace(collected.docs, needle)
      setHits(report.hits)
      setSearched(true)
      if (report.hits.length === 0) {
        setNote(
          collected.docs.length === 0 ? '工作区里没有可搜的 Markdown 文件' : '没有匹配的文本',
        )
        return
      }
      const parts = [`${report.hits.length} 处`]
      if (report.truncated) parts.push('只显示前 200 处')
      if (collected.skipped > 0) parts.push(`跳过 ${collected.skipped} 个读不到或超过 1 MiB 的文件`)
      if (collected.capped) parts.push('文件太多，只搜了前 200 个')
      setNote(parts.join('；'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="overlay" role="presentation" onMouseDown={onClose}>
      <div
        ref={dialogRef}
        className="dialog global-search-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="全局搜索"
        aria-labelledby="global-search-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <h2 id="global-search-title">全局搜索</h2>
        <p className="dialog-note">
          在工作区的 Markdown 文件里查找。结果行是「相对路径:行号」；点一条打开文件并跳到查找条。
        </p>

        <div className="global-search-row">
          <input
            className="global-search-input"
            value={query}
            placeholder="搜索整个工作区"
            aria-label="全局搜索关键词"
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                void run()
              } else if (event.key === 'Escape') {
                // 一个按键只处理一次：不再冒泡到 window 的 Esc 分支
                event.preventDefault()
                event.stopPropagation()
                onClose()
              }
            }}
          />
          <button type="button" className="primary" onClick={() => void run()} disabled={busy}>
            {busy ? '搜索中…' : '搜索'}
          </button>
        </div>

        <p className="global-search-note" role="status" aria-live="polite">
          {note}
        </p>

        {hits.length > 0 && (
          <ul className="global-search-results" aria-label="搜索结果">
            {hits.map((hit, index) => (
              <li key={`${hit.path}:${hit.line}:${hit.column}:${index}`}>
                <button
                  type="button"
                  className="global-search-hit"
                  title={`${hit.path}:${hit.line}`}
                  onClick={() => onOpen(hit, query.trim())}
                >
                  <span className="global-search-path">
                    {relativePath(hit.path)}:{hit.line}
                  </span>
                  <span className="global-search-snippet">{hit.snippet}</span>
                </button>
              </li>
            ))}
          </ul>
        )}

        {searched && hits.length === 0 && <p className="global-search-empty">没有结果。</p>}

        <div className="dialog-actions">
          <button type="button" onClick={onClose}>
            关闭
          </button>
        </div>
      </div>
    </div>
  )
}
