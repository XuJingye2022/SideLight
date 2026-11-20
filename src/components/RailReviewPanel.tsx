import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import { REVIEW_STATUS_LABELS, type Annotation } from '../lib/annotations.ts'
import type { RevisionSummary } from '../lib/revisionList.ts'
import {
  applyLiveReviewRow,
  countOpenAnnotations,
  hasUnclosedReview,
  reviewTruncatedNote,
  type ReviewFilesResult,
} from '../lib/reviewFiles.ts'
import { flattenFiles, relativePath, type Workspace } from '../lib/workspace.ts'
import { useDialogFocus } from './useDialogFocus.ts'

/**
 * 「在审文件」只读面板（第 101 轮 B-228）+ 修订快照清单（第 114 轮 B-247）。
 *
 * 第 139 轮 B-229：从 `MarginRail.tsx` 拆成按开合加载的 lazy chunk。数据层（`reviewFiles` 的
 * 行合并）与两块 JSX 一起搬走，常驻的 `MarginRail-*.js` 不再背这块字；点「在审」才下载，
 * 关掉即卸载，换文档由调用方卸载（在途读取靠 run 序号作废）。
 *
 * 复用 diff 面板的外壳与行样式：同一套 80vh / 60vh 上限、同一套关闭语义，省一遍样式与焦点代码。
 * 验收证据：`docs/iteration/round-139/impl.md`、`.tmp/e2e-r101-review.mjs`。
 */
type Props = {
  annotations: Annotation[]
  activePath: string | null
  docName: string
  /** 快照写入代际（第 124 轮 B-257）：保存写完快照就 +1，面板开着时据此重读清单 */
  revisionEpoch: number
  /** 「在审文件」面板取当前工作区（null = 没打开文件夹） */
  getReviewWorkspace: () => Workspace | null
  /** 修订快照清单的目录与键；返回 null 表示这篇没有可读的 .sidelight */
  getRevisionSource: () => Promise<{ dir: FileSystemDirectoryHandle; key: string } | null>
  /** 点一行：App 找节点并打开；同篇只关面板不重载 */
  onOpenReviewFile: (path: string) => void
  onClose: () => void
}

export default function RailReviewPanel({
  annotations,
  activePath,
  docName,
  revisionEpoch,
  getReviewWorkspace,
  getRevisionSource,
  onOpenReviewFile,
  onClose,
}: Props) {
  const [reviewData, setReviewData] = useState<ReviewFilesResult | null>(null)
  /** 没有工作区：与「有工作区但一篇批注也没有」给不同提示 */
  const [reviewNoWorkspace, setReviewNoWorkspace] = useState(false)
  const [reviewBusy, setReviewBusy] = useState(true)
  /** 修订快照清单（第 114 轮 B-247）：null = 还没读到（不渲染这一段），[] = 读到但没有快照 */
  const [snapData, setSnapData] = useState<RevisionSummary[] | null>(null)
  const sheetRef = useRef<HTMLDivElement | null>(null)
  /** 连点两次只认最后一次的扫描结果 */
  const reviewRunRef = useRef(0)
  /** 第 124 轮 B-257：快照读取另用一条序号——epoch 重读与面板重开可能同时在途，只认后发起的那次 */
  const snapSeqRef = useRef(0)
  /** 上一次重读快照时的代际：挂载现读一次就同步，effect 不跟着重复读 */
  const loadedEpochRef = useRef(revisionEpoch)
  // 本组件只在打开时挂载（让位期间由调用方卸载），第一参恒 true
  useDialogFocus(true, sheetRef, '.rail-review-overlay')

  /**
   * 快照清单走惰性 import（第 114 轮体积口径）：数据层只在点开面板时加载，不进常驻 chunk。
   * 源为空 / 动态 import 失败 / 读目录失败都只让这一段不显示，不影响在审列表，永不抛。
   */
  const loadSnapshots = (run: number) => {
    const seq = snapSeqRef.current + 1
    snapSeqRef.current = seq
    void (async () => {
      try {
        const source = await getRevisionSource()
        if (!source || reviewRunRef.current !== run || snapSeqRef.current !== seq) return
        const { listRevisions } = await import('../lib/revisionList.ts')
        const rows = await listRevisions(source.dir, source.key)
        if (reviewRunRef.current === run && snapSeqRef.current === seq) setSnapData(rows)
      } catch {
        // 读不到快照不影响在审列表
      }
    })()
  }

  /**
   * 第 124 轮 B-257：保存成功写完快照（`revisionEpoch` +1）时，面板开着就重读清单。
   * 面板关着不读、也不更新 `loadedEpochRef`——下次开面板由挂载那次现读。
   * epoch 路径不推进 `reviewRunRef`：那个序号管面板有效期，推进会让扫描的 finally 判不了 busy。
   */
  useEffect(() => {
    if (revisionEpoch === loadedEpochRef.current) return
    loadedEpochRef.current = revisionEpoch
    loadSnapshots(reviewRunRef.current)
  }, [revisionEpoch])

  /**
   * 点入口才现读：批注档在磁盘上，面板里的 open 数永远是这一刻的。
   * 扫描逻辑走惰性 import（第 136 轮体积，B-229）：数据层只在点开面板时加载，不进常驻 chunk。
   * 动态 import 失败时按「没有在审文件」的空态收场，绝不留 unhandled rejection。
   */
  const scan = async () => {
    setReviewData(null)
    setReviewNoWorkspace(false)
    setReviewBusy(true)
    setSnapData(null)
    const run = reviewRunRef.current + 1
    reviewRunRef.current = run
    // 这次现读就是最新的一份，effect 不用再读一遍
    loadedEpochRef.current = revisionEpoch
    try {
      const workspace = getReviewWorkspace()
      if (!workspace) {
        if (reviewRunRef.current === run) setReviewNoWorkspace(true)
        return
      }
      // 两份清单并行读：在审列表与快照互不等待
      loadSnapshots(run)
      const { collectReviewFiles } = await import('../lib/reviewScan.ts')
      const result = await collectReviewFiles(workspace, flattenFiles(workspace.root))
      if (reviewRunRef.current === run) setReviewData(result)
    } catch {
      // 数据层没加载起来（动态 import 或读目录抛错）只让「在审」这一段空着，面板其余部分照常
    } finally {
      if (reviewRunRef.current === run) setReviewBusy(false)
    }
  }

  // 挂载即现读一次；卸载时推进 run，让在途的扫描与快照读取作废
  useEffect(() => {
    void scan()
    return () => {
      reviewRunRef.current += 1
    }
  }, [])

  // App 的 Esc 链挂在 window 上：在 document 就停掉冒泡，一次按键只关面板（第 101 轮起就是这个语义）
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.stopPropagation()
      reviewRunRef.current += 1
      onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  const overall = annotations
  /**
   * 当前篇那一行改用内存里的批注算（第 103 轮）：写盘有 600 ms 防抖，
   * 改档后立刻开面板读到的是旧档，而面板开着不重扫。渲染时按 path 合并，
   * 面板开着时 `annotations` 变了（含流式到货）也立刻是新数。
   */
  const liveReviewRow =
    activePath && overall.length > 0
      ? { path: activePath, name: docName, open: countOpenAnnotations(overall), total: overall.length }
      : null
  // 第 105 轮 B-234：当前篇全结项时只删行——磁盘档可能还写着 open（600 ms 防抖未落盘）
  const liveClosed = overall.length > 0 && !hasUnclosedReview(overall)
  const reviewRows = reviewData ? applyLiveReviewRow(reviewData, liveReviewRow, liveClosed) : null
  // 第 133 轮：提示按上限写死，不按行数拼——结项后 LIVE 行被删，行数 50→49 仍算截断
  const reviewNote = reviewRows ? reviewTruncatedNote(reviewRows) : null

  const closeReview = () => {
    reviewRunRef.current += 1
    onClose()
  }

  return createPortal(
    <div
      className="rail-diff-overlay rail-review-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) closeReview()
      }}
    >
      <div
        className="rail-diff-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="rail-review-title"
        tabIndex={-1}
        ref={sheetRef}
      >
        <div className="rail-diff-head">
          <span className="rail-diff-title" id="rail-review-title">
            在审文件
          </span>
          <span>按待处理数排序</span>
          <button type="button" className="rail-diff-close" aria-label="关闭在审文件" onClick={closeReview}>
            ×
          </button>
        </div>
        {reviewBusy ? (
          <p className="rail-diff-empty">正在读…</p>
        ) : reviewNoWorkspace ? (
          <p className="rail-diff-empty">先点「打开文件夹」，才能看到在审文件。</p>
        ) : reviewRows === null || reviewRows.rows.length === 0 ? (
          <p className="rail-diff-empty">还没有在审的文件：有未结项的批注才会出现在这里。</p>
        ) : (
          <>
            {reviewRows.capped && <p className="rail-diff-empty">文件太多，只扫了前 {reviewRows.scanned} 篇。</p>}
            {reviewNote && <p className="rail-diff-empty">{reviewNote}</p>}
            <ul className="rail-diff-rows">
              {reviewRows.rows.map((row) => (
                <li key={row.path}>
                  <button
                    type="button"
                    className={row.path === activePath ? 'rail-review-row is-current' : 'rail-review-row'}
                    aria-current={row.path === activePath ? 'true' : undefined}
                    title={row.path}
                    onClick={() => {
                      closeReview()
                      onOpenReviewFile(row.path)
                    }}
                  >
                    <span>{relativePath(row.path)}</span>
                    <span className="rail-diff-count">{`${REVIEW_STATUS_LABELS.open} ${row.open} · 共 ${row.total} 条`}</span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
        {/* 第 114 轮 B-247：修订快照清单（只读、只列时刻/字节/批注数，不存正文）。
            与在审列表同一张 sheet，放在列表下面；读取中或没有工作区都不渲染 */}
        {!reviewBusy && !reviewNoWorkspace && snapData !== null && (
          <section className="rail-snap" aria-label="修订快照">
            <h3 className="rail-snap-title">修订快照</h3>
            {snapData.length === 0 ? (
              <p className="rail-snap-empty">保存一次后才会记录。</p>
            ) : (
              <ul className="rail-snap-rows">
                {snapData.map((row) => (
                  <li key={row.name} className="rail-snap-row rail-diff-row">
                    {row.label}
                  </li>
                ))}
              </ul>
            )}
            <p className="rail-snap-note">快照只记批注与字节数，不存正文，不能回到旧版正文。</p>
          </section>
        )}
      </div>
    </div>,
    document.body,
  )
}
