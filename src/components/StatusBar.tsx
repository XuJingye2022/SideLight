import { formatStats, type TextStats } from '../lib/wordcount.ts'

type Props = {
  stats: TextStats
  mode: 'edit' | 'source' | 'preview'
  focusMode: boolean
  typewriterMode: boolean
  draftLabel?: string
  hasFrontmatter?: boolean
}

export function StatusBar({ stats, mode, focusMode, typewriterMode, draftLabel, hasFrontmatter }: Props) {
  return (
    <footer className="status-bar">
      <span className="status-left">
        {formatStats(stats)}
        {hasFrontmatter && <span className="status-chip status-chip-quiet">元数据</span>}
      </span>
      <span className="status-right">
        {draftLabel && <span className="status-chip status-chip-quiet">{draftLabel}</span>}
        {mode === 'source' && <span className="status-chip">源码</span>}
        {mode === 'preview' && <span className="status-chip">预览</span>}
        {focusMode && <span className="status-chip">专注</span>}
        {typewriterMode && <span className="status-chip">打字机</span>}
      </span>
    </footer>
  )
}
