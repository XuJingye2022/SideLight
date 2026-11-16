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
  /** 字数明细面板是否打开（触发按钮的 aria-expanded） */
  statsOpen?: boolean
  onStatsClick?: () => void
  /** 选区的字数（中日韩字 + 拉丁词）；0 或非编辑视图时不显示 */
  selectionWords?: number
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
  statsOpen = false,
  onStatsClick,
  selectionWords = 0,
}: Props) {
  return (
    <footer className="status-bar">
      <span className="status-left">
        <button
          type="button"
          className="stats-trigger"
          aria-haspopup="dialog"
          aria-expanded={statsOpen}
          aria-controls={statsOpen ? 'stats-detail' : undefined}
          title="点开看字数明细：字符、词、句、段、阅读时间与选区内计数"
          onClick={onStatsClick}
        >
          {formatStats(stats)}
        </button>
        {selectionWords > 0 && (
          <span className="status-chip status-chip-quiet status-selection" title="选中文字的字数：中日韩字 + 拉丁词，与字数明细的选区行同口径">
            选区 {selectionWords.toLocaleString('en-US')} 字
          </span>
        )}
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
