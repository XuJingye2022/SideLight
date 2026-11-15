import { formatStats, type TextStats } from '../lib/wordcount.ts'

type Props = {
  stats: TextStats
  mode: 'edit' | 'source' | 'preview'
  focusMode: boolean
  typewriterMode: boolean
  draftLabel?: string
  hasFrontmatter?: boolean
  /** 宿主文档：状态栏显示「保存到 <文件名>」 */
  hostFileName?: string
  /** 宿主草稿恢复后显示「草稿已恢复」 */
  draftRestored?: boolean
  autoSaveLabel?: string
  autoSaveTone?: 'ok' | 'warn' | 'error'
}

export function StatusBar({
  stats,
  mode,
  focusMode,
  typewriterMode,
  draftLabel,
  hasFrontmatter,
  hostFileName,
  draftRestored,
  autoSaveLabel,
  autoSaveTone = 'ok',
}: Props) {
  return (
    <footer className="status-bar">
      <span className="status-left">
        {formatStats(stats)}
        {hasFrontmatter && <span className="status-chip status-chip-quiet">元数据</span>}
        {hostFileName && (
          <span className="status-chip status-chip-quiet" title="Ctrl+S 保存到这个文件">
            保存到 {hostFileName}
          </span>
        )}
        {draftRestored && (
          <span className="status-chip" title="正文来自宿主草稿；原文件没有变化">
            草稿已恢复
          </span>
        )}
        {autoSaveLabel && (
          <span className={`status-chip auto-save-chip auto-save-${autoSaveTone}`} title="停笔 2 秒自动保存；有格式损失时只提示">
            {autoSaveLabel}
          </span>
        )}
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
