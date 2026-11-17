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
  /** 区分大小写与整词：会话内的开关，跟 Typora 一样不落盘 */
  caseSensitive: boolean
  wholeWord: boolean
  onToggleCaseSensitive: () => void
  onToggleWholeWord: () => void
  /** 当前视图下查找/替换不可用时的说明（源码模式）：有值就整体锁住，不再假装成功 */
  unavailableReason?: string
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
  caseSensitive,
  wholeWord,
  onToggleCaseSensitive,
  onToggleWholeWord,
  unavailableReason,
}: Props) {
  if (!open) return null

  const total = matches.length
  const position = total === 0 ? 0 : activeIndex + 1
  const locked = Boolean(unavailableReason)
  const disabled = locked || total === 0

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
              // 锁住时也要吞掉事件：按钮 disabled 拦不住 Enter
              event.preventDefault()
              if (locked) return
              if (event.shiftKey) onPrev()
              else onNext()
            }
            if (event.key === 'Escape') {
              // 一个按键只处理一次：不再冒泡到 window 的 Esc 分支（否则同一个 Esc 会连带退出源码/预览）
              event.preventDefault()
              event.stopPropagation()
              onClose()
            }
          }}
        />
        <span className="find-count">
          {locked ? '' : query.trim() === '' ? '' : total === 0 ? '无结果' : `${position} / ${total}`}
        </span>
        <button
          type="button"
          className={caseSensitive ? 'is-on' : undefined}
          aria-pressed={caseSensitive}
          title="区分大小写"
          onClick={onToggleCaseSensitive}
        >
          Aa
        </button>
        <button
          type="button"
          className={wholeWord ? 'is-on' : undefined}
          aria-pressed={wholeWord}
          title="整词匹配（只认 ASCII 词边界，中文按原样匹配）"
          onClick={onToggleWholeWord}
        >
          ab
        </button>
        <button type="button" onClick={onPrev} disabled={disabled} title="上一处" aria-label="上一处">
          ↑
        </button>
        <button type="button" onClick={onNext} disabled={disabled} title="下一处" aria-label="下一处">
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
              // 替换框的 Enter 直接调 onReplace()：只把按钮设成 disabled 拦不住它
              event.preventDefault()
              if (locked) return
              onReplace()
            }
            if (event.key === 'Escape') {
              event.preventDefault()
              event.stopPropagation()
              onClose()
            }
          }}
        />
        <button type="button" onClick={onReplace} disabled={disabled}>
          替换
        </button>
        <button type="button" onClick={onReplaceAll} disabled={disabled}>
          全部替换
        </button>
      </div>

      {locked && <p className="find-note">{unavailableReason}</p>}
    </div>
  )
}
