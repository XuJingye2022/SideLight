import type { DiffLine } from '../lib/diff.ts'

type Props = {
  open: boolean
  diff: DiffLine[]
  onConfirm: () => void
  onCancel: () => void
}

const MAX_PREVIEW = 60

export function SaveDialog({ open, diff, onConfirm, onCancel }: Props) {
  if (!open) return null

  const changed = diff.filter((line) => line.kind !== 'same')
  const shown = changed.filter((line) => line.text.trim().length > 0).slice(0, MAX_PREVIEW)
  const blank = changed.length - changed.filter((line) => line.text.trim().length > 0).length

  return (
    <div className="overlay" role="presentation" onMouseDown={onCancel}>
      <div
        className="dialog save-dialog"
        role="dialog"
        aria-label="保存前确认"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <h2>保存后文件会有这些差异</h2>
        <p className="dialog-note">
          这里既有你自己的改动，也有编辑器把 Markdown 规范化的结果。frontmatter 与脚注已经原样保留，其余以这里为准。
        </p>

        <div className="diff-view">
          {shown.map((line, index) => (
            <div key={`${line.kind}-${index}`} className={`diff-line diff-${line.kind}`}>
              <span className="diff-sign">{line.kind === 'added' ? '+' : '−'}</span>
              <span className="diff-text">{line.text || ' '}</span>
            </div>
          ))}
        </div>

        <p className="dialog-note">
          共 {changed.length} 行变化，最多预览 {MAX_PREVIEW} 行。这次只提示一次。
          {blank > 0 && `另有 ${blank} 行空行调整未列出。`}
        </p>

        <div className="dialog-actions">
          <button type="button" onClick={onCancel}>
            取消
          </button>
          <button type="button" className="primary" onClick={onConfirm}>
            仍然保存
          </button>
        </div>
      </div>
    </div>
  )
}
