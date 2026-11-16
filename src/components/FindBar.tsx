import type { Match } from '../lib/find.ts'

type Props = {
  open: boolean
  query: string
  replacement: string
  matches: Match[]
  activeIndex: number
  onQueryChange: (value: string) => void
  onReplacementChange: (value: string) => void
  onPrev: () => void
  onNext: () => void
  onReplace: () => void
  onReplaceAll: () => void
  onClose: () => void
}

export function FindBar({
  open,
  query,
  replacement,
  matches,
  activeIndex,
  onQueryChange,
  onReplacementChange,
  onPrev,
  onNext,
  onReplace,
  onReplaceAll,
  onClose,
}: Props) {
  if (!open) return null

  const total = matches.length
  const position = total === 0 ? 0 : activeIndex + 1

  return (
    <div className="find-bar">
      <div className="find-row">
        <input
          className="find-input"
          value={query}
          placeholder="查找"
          autoFocus
          onChange={(event) => onQueryChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              if (event.shiftKey) onPrev()
              else onNext()
            }
            if (event.key === 'Escape') onClose()
          }}
        />
        <span className="find-count">
          {query.trim() === '' ? '' : total === 0 ? '无结果' : `${position} / ${total}`}
        </span>
        <button type="button" onClick={onPrev} disabled={total === 0} title="上一处" aria-label="上一处">
          ↑
        </button>
        <button type="button" onClick={onNext} disabled={total === 0} title="下一处" aria-label="下一处">
          ↓
        </button>
        <button type="button" onClick={onClose} title="关闭" aria-label="关闭查找">
          ✕
        </button>
      </div>

      <div className="find-row">
        <input
          className="find-input"
          value={replacement}
          placeholder="替换为"
          onChange={(event) => onReplacementChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              onReplace()
            }
            if (event.key === 'Escape') onClose()
          }}
        />
        <button type="button" onClick={onReplace} disabled={total === 0}>
          替换
        </button>
        <button type="button" onClick={onReplaceAll} disabled={total === 0}>
          全部替换
        </button>
      </div>
    </div>
  )
}
