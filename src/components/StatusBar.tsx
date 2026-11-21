import { formatStats, type TextStats } from '../lib/wordcount.ts'

type Props = {
  stats: TextStats
  /** 宿主草稿恢复后显示「草稿已恢复」 */
  draftRestored?: boolean
  autoSaveLabel?: string
  autoSaveTone?: 'ok' | 'warn' | 'error'
  /** 字数明细面板是否打开（触发按钮的 aria-expanded） */
  statsOpen?: boolean
  onStatsClick?: () => void
  /** 选区的字数（中日韩字 + 拉丁词）；0 或非编辑视图时不显示。第 143 轮起并入字数入口 */
  selectionWords?: number
  /** 整页缩放百分比；100 时不显示 */
  pageZoom?: number
  onZoomReset?: () => void
  /**
   * 删除后的恢复入口（第 84 轮 B-142）：文案来自 `restoreEntry.ts` 的 `restoreLabel`，
   * 空串/缺省时不渲染。它与 toast 分开保存，所以保存提示换掉 toast 后这里仍可撤销。
   */
  restoreLabel?: string
  onRestore?: () => void
  onDismissRestore?: () => void
}

/**
 * 状态栏只报写作事实（第 143 轮 B2）：字数、保存、错误与撤销。
 * 视图模式 4 个 chip、元数据、保存到 X、草稿时间都撤掉了——等价入口在「文件 → 视图」。
 */
export function StatusBar({
  stats,
  draftRestored,
  autoSaveLabel,
  autoSaveTone = 'ok',
  statsOpen = false,
  onStatsClick,
  selectionWords = 0,
  pageZoom = 100,
  onZoomReset,
  restoreLabel,
  onRestore,
  onDismissRestore,
}: Props) {
  return (
    <footer className="status-bar">
      <span className="status-left">
        <button
          type="button"
          className="stats-trigger"
          aria-label="字数明细"
          aria-haspopup="dialog"
          aria-expanded={statsOpen}
          aria-controls={statsOpen ? 'stats-detail' : undefined}
          title="点开看字数明细：字符、词、句、段、阅读时间与选区内计数"
          onClick={onStatsClick}
        >
          {formatStats(stats)}
          {selectionWords > 0 && ` · 选区 ${selectionWords.toLocaleString('en-US')} 字`}
        </button>
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
        {restoreLabel && (
          <span className="status-restore" title={`${restoreLabel}：点「撤销」把文件搬回原位置`}>
            <span className="status-restore-text">{restoreLabel}</span>
            <button type="button" className="status-restore-undo" onClick={onRestore}>
              撤销
            </button>
            <button
              type="button"
              className="status-restore-close"
              aria-label="关闭删除恢复入口"
              title="不再提供撤销（文件仍在回收站文件夹里）"
              onClick={onDismissRestore}
            >
              ×
            </button>
          </span>
        )}
      </span>
      <span className="status-right">
        {pageZoom !== 100 && (
          <button
            type="button"
            className="status-chip status-chip-quiet status-zoom"
            title="整页缩放：Ctrl+Shift+= 放大、Ctrl+Shift+- 缩小、Ctrl+Shift+0 回到 100%（也可以 Ctrl+滚轮）"
            aria-label={`整页缩放 ${pageZoom}%，点击回到 100%`}
            onClick={onZoomReset}
          >
            缩放 {pageZoom}%
          </button>
        )}
      </span>
    </footer>
  )
}
