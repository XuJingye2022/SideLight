import { useEffect, useMemo, useRef, useState } from 'react'

export type QuickFile = { name: string; path: string }

type Props = {
  files: QuickFile[]
  onSelect: (file: QuickFile) => void
  onClose: () => void
}

/** Ctrl+P 快速打开：文件名优先、路径次之；空查询列出全部（最多 50） */
export function QuickOpen({ files, onSelect, onClose }: Props) {
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const inputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase()
    const scored = files.map((file) => {
      const name = file.name.toLowerCase()
      const path = file.path.toLowerCase()
      if (!q) return { file, score: 0 }
      if (name === q) return { file, score: 3 }
      if (name.startsWith(q)) return { file, score: 2 }
      if (name.includes(q)) return { file, score: 1 }
      if (path.includes(q)) return { file, score: 0 }
      return null
    })
    return scored
      .filter((item): item is { file: QuickFile; score: number } => item !== null)
      .sort((a, b) => b.score - a.score || a.file.path.localeCompare(b.file.path))
      .slice(0, 50)
      .map((item) => item.file)
  }, [files, query])

  useEffect(() => {
    setActive(0)
  }, [query])

  const choose = (index: number) => {
    const file = matches[index]
    if (file) onSelect(file)
  }

  return (
    <div className="quick-open-backdrop" onMouseDown={onClose}>
      <div
        className="quick-open"
        role="dialog"
        aria-label="快速打开"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <input
          ref={inputRef}
          className="quick-open-input"
          value={query}
          placeholder="按文件名或路径过滤"
          aria-label="快速打开文件名"
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'ArrowDown') {
              event.preventDefault()
              setActive((value) => Math.min(matches.length - 1, value + 1))
            } else if (event.key === 'ArrowUp') {
              event.preventDefault()
              setActive((value) => Math.max(0, value - 1))
            } else if (event.key === 'Enter') {
              event.preventDefault()
              choose(active)
            } else if (event.key === 'Escape') {
              event.preventDefault()
              onClose()
            }
          }}
        />
        <ul className="quick-open-list" role="listbox">
          {matches.length === 0 && <li className="quick-open-empty">没有匹配的文件</li>}
          {matches.map((file, index) => (
            <li key={file.path}>
              <button
                type="button"
                role="option"
                aria-selected={index === active}
                className={index === active ? 'is-active' : ''}
                onMouseEnter={() => setActive(index)}
                onClick={() => choose(index)}
              >
                <span className="quick-open-name">{file.name}</span>
                <span className="quick-open-path">{file.path}</span>
              </button>
            </li>
          ))}
        </ul>
        <p className="quick-open-hint">
          <kbd>↑</kbd><kbd>↓</kbd> 选择 <kbd>Enter</kbd> 打开 <kbd>Esc</kbd> 关闭
        </p>
      </div>
    </div>
  )
}
