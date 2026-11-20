import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import { createPortal } from 'react-dom'

import { errorCopy, streamChat } from '../lib/ai.ts'
import {
  ANNOTATION_PRIORITIES,
  ANNOTATION_PRIORITY_LABELS,
  REVIEW_STATUSES,
  REVIEW_STATUS_LABELS,
  isClosedReview,
  reviewStatusOf,
  threadText,
  type Annotation,
  type AnnotationPriority,
  type DocNote,
  type ReviewStatus,
} from '../lib/annotations.ts'
import { appendDelta, buildChatMessages, chatContextFor, chatNearBottom, chatRefocusAfterStream, chatScrollOnUpdate, chatSpeaker, dropEmptyAssistantTail, pushTurn, type ChatTurn } from '../lib/chat.ts'
import type { Block } from '../lib/context.ts'
import { diffView, type DiffViewResult } from '../lib/diffView.ts'
import { noteAriaLabel, noteJumpKey } from '../lib/noteA11y.ts'
import type { RevisionSummary } from '../lib/revisionList.ts'
import {
  applyLiveReviewRow,
  collectReviewFiles,
  countOpenAnnotations,
  hasUnclosedReview,
  type ReviewFilesResult,
} from '../lib/reviewFiles.ts'
import type { Settings } from '../lib/settings.ts'
import { flattenFiles, relativePath, type Workspace } from '../lib/workspace.ts'
import { InlineText } from './InlineText.tsx'
import { FOCUSABLE, useDialogFocus } from './useDialogFocus.ts'

type Props = {
  /** 第 119 轮 B-249：App 级对话框开着时两个只读面板不挂载（否则 z 60 + inert 压住确认框） */
  appDialogOpen: boolean
  /**
   * 第 126 轮 A1：窄窗（≤1119px）抽屉开着。抽屉在 `<main>` 里、主区不能整个 inert，
   * 所以用 `role=dialog` + `aria-modal` 声明，并靠 onRailKeyDown 把 Tab 收在栏内。
   */
  drawerOpen: boolean
  annotations: Annotation[]
  tops: Record<string, number>
  activeId: string | null
  analyzing: boolean
  unresolved: number
  /** 全文总评与未定位批注，不写正文 */
  docNotes?: DocNote[]
  /** 没配 API Key，批注是本地模拟生成的 */
  simulated: boolean
  /** 卡片区需要为「整体评价」面板让出的高度（栏内 px）；0 表示不需要 spacer */
  railSpace: number
  /** 右侧页签：对话 / 批注（第 94 轮 B-221）。默认「批注」 */
  railTab: 'chat' | 'notes'
  onTabChange: (tab: 'chat' | 'notes') => void
  /** 对话页签请求模型用（第 96 轮 B-223） */
  settings: Settings
  /** 当前文档名：换了文档就清空对话 */
  docName: string
  /** 取当前正文的块与光标/选区（拼装与截断在 chat.ts）；null = 没有编辑器（还没有正文） */
  getChatSource: () => { blocks: Block[]; from: number; to: number } | null
  /**
   * 「与打开时相比」的一对正文（第 100 轮 B-227）。面板点开时才调，换文档后 App 那边会换基线；
   * 返回 null 表示这篇还没有可对比的正文（宿主正文取不到等）
   */
  getDiff: () => { before: string; after: string } | null
  /** 「在审文件」面板取当前工作区（null = 没打开文件夹，第 101 轮 B-228） */
  getReviewWorkspace: () => Workspace | null
  /**
   * 修订快照清单的目录与键（第 114 轮 B-247）。只在面板点开时调；
   * 返回 null 表示这篇没有可读的 .sidelight（示例 / 单文件打开 / 没句柄）
   */
  getRevisionSource: () => Promise<{ dir: FileSystemDirectoryHandle; key: string } | null>
  /** 快照写入代际（第 124 轮 B-257）：保存写完快照就 +1，面板开着时据此重读清单 */
  revisionEpoch: number
  /** 当前打开的文档路径：面板给这一行标 aria-current */
  activePath: string | null
  /** 点一行：App 找节点并打开；同篇只关面板不重载 */
  onOpenReviewFile: (path: string) => void
  /** 「生成批注」：把输入框里这句话交给 App 跑一次分析 */
  onGenerateNotes: (instruction: string) => void
  /** 只有编辑视图能生成批注：源码 / 预览态下批注落不进正文 */
  canGenerate: boolean
  /** 窄窗抽屉的关闭按钮；宽窗不传就不显示 */
  onClose?: () => void
  goal: string
  discussingId: string | null
  verifyingId: string | null
  searchReady: boolean
  onHover: (id: string | null) => void
  onFocusNote: (annotation: Annotation) => void
  /** 卡片拿到焦点后按 Enter：跳到正文里对应的句子（第 86 轮 B-141） */
  onJumpToNote: (annotation: Annotation) => void
  onDiscuss: (annotation: Annotation, text: string) => void
  onVerify: (annotation: Annotation) => void
  onRefine: (annotation: Annotation) => void
  onGoalRetry: () => void
  onRequestLayout: () => void
  onAccept: (annotation: Annotation) => void
  onDismiss: (annotation: Annotation) => void
  /** 卡头下拉改档位（第 95 轮 B-222）：手改过的档位重跑时保留 */
  onSetPriority: (annotation: Annotation, priority: AnnotationPriority) => void
  /** 卡头下拉改四态（第 97 轮 B-224）：只换标记，不移除、不影响出卡 */
  onSetReviewStatus: (annotation: Annotation, reviewStatus: ReviewStatus) => void
  registerRef: (id: string, node: HTMLElement | null) => void
  railRef: React.RefObject<HTMLDivElement | null>
}

export function MarginRail({
  appDialogOpen,
  drawerOpen,
  annotations,
  tops,
  activeId,
  analyzing,
  unresolved,
  docNotes = [],
  simulated,
  onClose,
  goal,
  discussingId,
  verifyingId,
  searchReady,
  onHover,
  onFocusNote,
  onJumpToNote,
  onDiscuss,
  onVerify,
  onRefine,
  onGoalRetry,
  onRequestLayout,
  onAccept,
  onDismiss,
  onSetPriority,
  onSetReviewStatus,
  registerRef,
  railRef,
  railSpace,
  railTab,
  onTabChange,
  settings,
  docName,
  getChatSource,
  getDiff,
  getReviewWorkspace,
  getRevisionSource,
  revisionEpoch,
  activePath,
  onOpenReviewFile,
  onGenerateNotes,
  canGenerate,
}: Props) {
  const pending = annotations.filter((annotation) => annotation.status === 'pending')
  const [openThread, setOpenThread] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [overallOpen, setOverallOpen] = useState(true)

  /* ---------- 对话页签（第 96 轮 B-223） ---------- */

  const [turns, setTurns] = useState<ChatTurn[]>([])
  const [chatDraft, setChatDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [chatError, setChatError] = useState('')
  const ctrlRef = useRef<AbortController | null>(null)
  const logRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLTextAreaElement | null>(null)
  /** 卸载后流式回调还会到：先记活着，再决定要不要 setState */
  const aliveRef = useRef(true)
  /** 第 112 轮 A1：上一次渲染的轮数 / 页签，只认「整轮变化」（delta 只加字，不加条） */
  const turnCountRef = useRef(0)
  const prevTabRef = useRef(railTab)

  const resetChat = () => {
    ctrlRef.current?.abort()
    ctrlRef.current = null
    setTurns([])
    setChatDraft('')
    setChatError('')
    setBusy(false)
  }

  useEffect(() => {
    aliveRef.current = true
    return () => {
      aliveRef.current = false
      ctrlRef.current?.abort()
    }
  }, [])

  // 换文档就清空：上一轮的对话和这一篇无关，留着会让人以为上下文还在
  useEffect(() => {
    resetChat()
  }, [docName])

  // 第 112 轮 A1：上翻看历史时 delta 不拽回。整轮 +1（新提问 / 切回页签）才无条件贴底；
  // 流式 delta 只在读者本来贴着底部时才跟（判据现场读，不缓存——缓存会被切页签与换文档弄过期）。
  // 第 104 轮 B-232 的前提仍成立：批注页签下面板 hidden、scrollHeight 恒 0，所以切回时才贴底。
  useEffect(() => {
    const tabChanged = prevTabRef.current !== railTab
    prevTabRef.current = railTab
    if (railTab !== 'chat') return
    const log = logRef.current
    if (!log) return
    const grew = turns.length !== turnCountRef.current || tabChanged
    turnCountRef.current = turns.length
    if (!chatScrollOnUpdate(grew, chatNearBottom(log))) return
    log.scrollTop = log.scrollHeight
  }, [turns, railTab])

  const send = async () => {
    const text = chatDraft.trim()
    if (!text || busy) return
    const next = pushTurn(turns, 'user', text)
    // 先放一条空的 assistant 占位：流式回来的字才有地方落
    setTurns([...next, { role: 'assistant', text: '' }])
    setChatDraft('')
    setChatError('')
    setBusy(true)

    const controller = new AbortController()
    ctrlRef.current = controller
    // 第 125 轮 A1：上下文跟选区/光标走；没有编辑器就是空串（buildChatMessages 走「还没有正文」）
    const source = getChatSource()
    const docText = source ? chatContextFor(source.blocks, source.from, source.to) : ''
    try {
      await streamChat({
        settings,
        messages: buildChatMessages(docText, next),
        signal: controller.signal,
        onDelta: (delta) => {
          if (!aliveRef.current) return
          setTurns((previous) => appendDelta(previous, delta))
        },
      })
    } catch (error) {
      const aborted = error instanceof DOMException && error.name === 'AbortError'
      // 第 113 轮 B-243：失败收尾撤掉从没被填过的空占位，别在记录底部留一条空框
      if (!aborted && aliveRef.current) {
        setChatError(errorCopy(error).text)
        setTurns((previous) => dropEmptyAssistantTail(previous))
      }
    } finally {
      if (ctrlRef.current === controller) ctrlRef.current = null
      if (aliveRef.current) {
        setBusy(false)
        // 第 111 轮 B-240：中止（换文档 / 卸载）或读者已把焦点移出对话面板时，收尾别再抢焦点
        const panel = document.getElementById('rail-panel-chat')
        const focusInPanel = !!panel?.contains(document.activeElement)
        if (chatRefocusAfterStream(controller.signal.aborted, focusInPanel)) inputRef.current?.focus()
      }
    }
  }

  const generateNotes = () => {
    const instruction = chatDraft.trim()
    if (!instruction || busy || analyzing || !canGenerate) return
    // 第 104 轮 B-232：这句指令留在对话记录里。它没有送模型（只作分析偏好），
    // 但失败/早退（Key 错、正文太短）时读者还能照着这句重来，不是凭空清空。
    setTurns((previous) => pushTurn(previous, 'user', instruction))
    setChatDraft('')
    setChatError('')
    onGenerateNotes(instruction)
  }

  /* ---------- 「与打开时相比」的只读 diff 面板（第 100 轮 B-227） ---------- */

  /** null = 面板关着；'none' = 这篇没有可对比的正文；其余是算好的行 */
  const [diffData, setDiffData] = useState<DiffViewResult | 'none' | null>(null)
  const diffSheetRef = useRef<HTMLDivElement | null>(null)
  /** 面板只挂在「批注」页签上，且 App 级对话框开着时让位（第 119 轮 B-249）；切到对话页签就关 */
  const diffOpen = diffData !== null && railTab === 'notes' && !appDialogOpen
  useDialogFocus(diffOpen, diffSheetRef, '.rail-diff-overlay', railTab === 'notes')

  useEffect(() => {
    if (railTab !== 'notes') setDiffData(null)
  }, [railTab])

  /* ---------- 页签焦点交接（第 102 轮 B-230） ---------- */

  /** 上一次渲染的页签：只认「生成批注替读者从对话切到批注」这一路 */
  const lastTabRef = useRef(railTab)

  /**
   * 对话页签里点「生成批注」，App 先 setRailTab('notes')（src/App.tsx:6026-6030），
   * 对话面板随即 hidden；被收起的面板里的按钮失焦后浏览器把焦点送回 body，
   * 再按一次 Tab 就落到状态栏。焦点原本在被收起的对话面板里（或已经丢了）才接管，
   * 正文与页签自己的焦点不动——hidden 落地并不同步 blur，这里读到的往往还是那颗按钮。
   * 不给首张卡：卡片随分析异步到位，抢焦点会打断读者。
   */
  useEffect(() => {
    const previous = lastTabRef.current
    lastTabRef.current = railTab
    if (previous !== 'chat' || railTab !== 'notes') return
    const active = document.activeElement
    const chatEl = document.getElementById('rail-panel-chat')
    if (active && active !== document.body && !chatEl?.contains(active)) return
    requestAnimationFrame(() => document.getElementById('rail-tab-notes')?.focus())
  }, [railTab])

  // App 的 Esc 链挂在 window 上：在 document 就停掉冒泡，一次按键只关面板
  useEffect(() => {
    if (!diffOpen) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.stopPropagation()
      setDiffData(null)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [diffOpen])

  /** 点入口才现算：面板里的行永远是「这一刻的正文 vs 打开时」 */
  const openDiff = () => {
    const pair = getDiff()
    setDiffData(pair === null ? 'none' : diffView(pair.before, pair.after))
  }

  const markOf = (kind: 'same' | 'added' | 'removed') =>
    kind === 'added' ? '+' : kind === 'removed' ? '−' : ' '

  /* ---------- 「在审文件」只读面板（第 101 轮 B-228） ---------- */

  const [reviewOpen, setReviewOpen] = useState(false)
  const [reviewData, setReviewData] = useState<ReviewFilesResult | null>(null)
  /** 没有工作区：与「有工作区但一篇批注也没有」给不同提示 */
  const [reviewNoWorkspace, setReviewNoWorkspace] = useState(false)
  const [reviewBusy, setReviewBusy] = useState(false)
  const reviewSheetRef = useRef<HTMLDivElement | null>(null)
  /** 连点两次只认最后一次的扫描结果 */
  const reviewRunRef = useRef(0)
  /** 第 124 轮 B-257：快照读取另用一条序号——epoch 重读与面板重开可能同时在途，只认后发起的那次 */
  const snapSeqRef = useRef(0)
  /** 上一次重读快照时的代际：openReview 现读一次就同步，effect 不跟着重复读 */
  const loadedEpochRef = useRef(revisionEpoch)
  const reviewActive = reviewOpen && railTab === 'notes' && !appDialogOpen
  useDialogFocus(reviewActive, reviewSheetRef, '.rail-review-overlay', railTab === 'notes')

  /** 修订快照清单（第 114 轮 B-247）：null = 还没读到（不渲染这一段），[] = 读到但没有快照 */
  const [snapData, setSnapData] = useState<RevisionSummary[] | null>(null)

  // 面板只挂在「批注」页签上：切到对话页签就收掉（同一次 run 递增也让在途的快照读取作废）
  useEffect(() => {
    if (railTab !== 'notes') {
      reviewRunRef.current += 1
      setReviewOpen(false)
      setSnapData(null)
    }
  }, [railTab])

  // 面板开着换文档：面板收掉，上一份的快照行与在审行一个都不留（CR-4③，推进 run 让在途读取作废）
  // 第 119 轮 B-249：让位期间（App 对话框开着）面板不挂载但 diffData 还在，换文档也要清，回来才是新一篇
  useEffect(() => {
    reviewRunRef.current += 1
    setReviewOpen(false)
    setReviewBusy(false)
    setReviewData(null)
    setSnapData(null)
    setDiffData(null)
  }, [docName])

  // App 的 Esc 链挂在 window 上：在 document 就停掉冒泡，一次按键只关面板
  useEffect(() => {
    if (!reviewActive) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.stopPropagation()
      setReviewOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [reviewActive])

  const closeReview = () => {
    reviewRunRef.current += 1
    setSnapData(null)
    setReviewOpen(false)
    setReviewBusy(false)
    setReviewData(null)
    setReviewNoWorkspace(false)
  }

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
   * 面板关着不读、也不更新 `loadedEpochRef`——下次开面板由 `openReview` 现读。
   * epoch 路径不推进 `reviewRunRef`：那个序号管面板有效期，推进会让 `openReview` 的 finally 判不了 busy。
   */
  useEffect(() => {
    if (revisionEpoch === loadedEpochRef.current || !reviewActive) return
    loadedEpochRef.current = revisionEpoch
    loadSnapshots(reviewRunRef.current)
  }, [revisionEpoch, reviewActive])

  /** 点入口才现读：批注档在磁盘上，面板里的 open 数永远是这一刻的 */
  const openReview = async () => {
    setReviewOpen(true)
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
      const result = await collectReviewFiles(workspace, flattenFiles(workspace.root))
      if (reviewRunRef.current === run) setReviewData(result)
    } finally {
      if (reviewRunRef.current === run) setReviewBusy(false)
    }
  }

  const overall = docNotes.filter((note) => note.kind === 'overall')
  const unresolvedNotes = docNotes.filter((note) => note.kind === 'unresolved')

  /**
   * 当前篇那一行改用内存里的批注算（第 103 轮）：写盘有 600 ms 防抖，
   * 改档后立刻开面板读到的是旧档，而面板开着不重扫。渲染时按 path 合并，
   * 面板开着时 `annotations` 变了（含流式到货）也立刻是新数。
   */
  const liveReviewRow =
    activePath && annotations.length > 0
      ? { path: activePath, name: docName, open: countOpenAnnotations(annotations), total: annotations.length }
      : null
  // 第 105 轮 B-234：当前篇全结项时只删行——磁盘档可能还写着 open（600 ms 防抖未落盘）
  const liveClosed = annotations.length > 0 && !hasUnclosedReview(annotations)
  const reviewRows = reviewData ? applyLiveReviewRow(reviewData, liveReviewRow, liveClosed) : null

  /**
   * 第 126 轮 A1：窄窗抽屉的 Tab 环回。抽屉挂在 `<main>` 里（背板与页边栏都是 main 的后代），
   * 主区不能整个 inert，所以只把 Tab 收在栏内的 Tab 序里：末站与根（aside，tabIndex −1）Tab → 首站，
   * 首站与根 Shift+Tab → 末站。焦点在栏外的门后节点时 at === −1，同样收回来。
   */
  const onRailKeyDown = (event: ReactKeyboardEvent<HTMLElement>) => {
    if (event.key !== 'Tab' || !drawerOpen) return
    const rail = railRef.current
    if (!rail) return
    const items = Array.from(rail.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
      (element) => element.tabIndex >= 0 && element.getClientRects().length > 0,
    )
    if (items.length === 0) return
    const at = items.indexOf(document.activeElement as HTMLElement)
    if (!event.shiftKey && (at === -1 || at === items.length - 1)) {
      event.preventDefault()
      items[0].focus()
    } else if (event.shiftKey && at <= 0) {
      event.preventDefault()
      items[items.length - 1].focus()
    }
  }

  return (
    <aside
      className="margin-rail"
      id="margin-rail"
      ref={railRef}
      role={drawerOpen ? 'dialog' : undefined}
      aria-modal={drawerOpen ? 'true' : undefined}
      aria-label="侧灯"
      tabIndex={-1}
      onKeyDown={onRailKeyDown}
    >
      <div className="rail-head">
        <span className="rail-light" aria-hidden="true" />
        <span className="rail-title">侧灯</span>
        {analyzing && <span className="rail-busy">正在读</span>}
        {!analyzing && pending.length > 0 && <span className="rail-count">{pending.length} 条</span>}
        {onClose && (
          <button
            type="button"
            className="rail-close"
            onClick={onClose}
            aria-label={railTab === 'chat' ? '关闭对话' : '关闭批注'}
          >
            ×
          </button>
        )}
        {/* 第 100 轮 B-227：只在批注页签给入口。16px 高、别动 .rail-head 的盒模型 */}
        {railTab === 'notes' && (
          <button
            type="button"
            className="rail-diff-open"
            aria-haspopup="dialog"
            title="与打开时相比"
            onClick={openDiff}
          >
            对比
          </button>
        )}
        {/* 第 101 轮 B-228：「在审文件」。跟在「对比」后面，右缘贴着 head 右缘；两钮间距 7px 走 .rail-head 的 gap */}
        {railTab === 'notes' && (
          <button
            type="button"
            className="rail-review-open"
            aria-haspopup="dialog"
            title="在审文件"
            onClick={() => void openReview()}
          >
            在审
          </button>
        )}
      </div>

      {/* 第 94 轮 B-221：右侧双页签。只做页签与占位，对话内容下一批接入 */}
      <div className="rail-tabs" role="tablist" aria-label="侧灯页签">
        {(['chat', 'notes'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            role="tab"
            id={`rail-tab-${tab}`}
            aria-selected={railTab === tab}
            aria-controls={`rail-panel-${tab}`}
            tabIndex={railTab === tab ? 0 : -1}
            className={railTab === tab ? 'is-active' : ''}
            onClick={() => onTabChange(tab)}
            onKeyDown={(event) => {
              if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
              event.preventDefault()
              const next =
                event.key === 'Home'
                  ? 'chat'
                  : event.key === 'End'
                    ? 'notes'
                    : tab === 'chat'
                      ? 'notes'
                      : 'chat'
              onTabChange(next)
              requestAnimationFrame(() => document.getElementById(`rail-tab-${next}`)?.focus())
            }}
          >
            {tab === 'chat' ? '对话' : '批注'}
          </button>
        ))}
      </div>

      {/* 包一层只做页签显隐：不加 position / overflow，卡片的绝对定位仍参照 .margin-rail，
          「整体评价」也仍是相对 .doc-scroll 的 sticky */}
      <div
        id="rail-panel-notes"
        className="rail-panel-notes"
        role="tabpanel"
        aria-labelledby="rail-tab-notes"
        hidden={railTab !== 'notes'}
      >
      {goal && (
        <div className="rail-goal">
          <span className="rail-goal-label">我的理解</span>
          <span className="rail-goal-text">{goal.replace(/^我判断这段的意图是[：:]\s*/, '')}</span>
          <button type="button" className="rail-goal-retry" onClick={onGoalRetry}>
            判错了，重来
          </button>
        </div>
      )}

      {unresolved > 0 && (
        <p className="rail-notice">
          {simulated ? '这段太短，选中一段正文再试。' : `${unresolved} 条引文没找到，已收进整体评价。`}
        </p>
      )}

      {simulated && <p className="rail-notice-mock">未配置 API Key，下面是本地模拟批注，不调用模型</p>}

      {pending.length === 0 && !analyzing && (
        <div className="rail-empty">
          <p className="rail-empty-title">选中一段，按 Ctrl + Enter</p>
          <p className="rail-empty-sub">批注会停在对应的句子旁边。</p>
        </div>
      )}

      {pending.map((annotation, index) => (
        <article
          key={annotation.id}
          ref={(node) => registerRef(annotation.id, node)}
          className={`note note-${annotation.kind}${activeId === annotation.id ? ' is-active' : ''}${
            isClosedReview(annotation) ? ' is-closed' : ''
          }${simulated ? ' is-simulated' : ''}`}
          style={{ top: `${tops[annotation.id] ?? 0}px` }}
          // 第 86 轮 B-141：卡片自己成为一个 Tab 站，读屏拿到「第 N 处 + 类型 + 引文」
          tabIndex={0}
          role="group"
          aria-label={noteAriaLabel(index, annotation)}
          onKeyDown={(event) => {
            if (!noteJumpKey(event)) return
            event.preventDefault()
            onJumpToNote(annotation)
          }}
          onClick={() => onFocusNote(annotation)}
          onMouseEnter={() => onHover(annotation.id)}
          onMouseLeave={() => onHover(null)}
        >
          <header className="note-head">
            <span className={`note-kind note-kind-${annotation.kind}`}>
              {annotation.kind === 'revision' ? '修订' : '评价'}
            </span>
            {simulated && <span className="note-kind note-kind-mock">模拟</span>}
            {/* 五档紧急度：原生 select 自带键盘与读屏支持，底色由 class 给。
                click 必须 stopPropagation——冒泡到卡片会调 onFocusNote 改正文选区 */}
            <span className="note-field-label" aria-hidden="true">紧急度</span>
            <select
              className={`note-priority note-priority-${annotation.priority}`}
              value={annotation.priority}
              aria-label={`第 ${index + 1} 处紧急度`}
              onClick={(event) => event.stopPropagation()}
              onChange={(event) =>
                onSetPriority(annotation, event.target.value as AnnotationPriority)
              }
            >
              {ANNOTATION_PRIORITIES.map((priority) => (
                <option key={priority} value={priority}>
                  {ANNOTATION_PRIORITY_LABELS[priority]}
                </option>
              ))}
            </select>
            {/* 四态复核状态（第 97 轮 B-224）：和紧急度同盒。
                click 同理要 stopPropagation，不然冒泡到卡片会改正文选区。结项的卡片画虚线，正文不再高亮 */}
            <span className="note-field-label" aria-hidden="true">状态</span>
            <select
              className={`note-status note-status-${reviewStatusOf(annotation)}`}
              value={reviewStatusOf(annotation)}
              aria-label={`第 ${index + 1} 处状态`}
              onClick={(event) => event.stopPropagation()}
              onChange={(event) =>
                onSetReviewStatus(annotation, event.target.value as ReviewStatus)
              }
            >
              {REVIEW_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {REVIEW_STATUS_LABELS[status]}
                </option>
              ))}
            </select>
            <span className="note-index">第 {index + 1} 处</span>
          </header>

          {annotation.kind === 'revision' ? (
            <div className="note-diff">
              <span className="diff-old">{annotation.quote}</span>
              <span className="diff-arrow">→</span>
              <span className="diff-new">{annotation.replacement}</span>
            </div>
          ) : (
            <p className="note-quote">“{annotation.quote}”</p>
          )}

          <p className="note-text">
            <InlineText text={annotation.note} />
          </p>

          {annotation.thread && annotation.thread.length > 0 && (
            <div className="thread">
              {annotation.thread.map((turn, index) => (
                <p key={index} className={`thread-turn thread-${turn.role}`}>
                  {turn.text ? <InlineText text={threadText(turn)} /> : <span className="thread-typing">…</span>}
                </p>
              ))}
            </div>
          )}

          <footer className="note-actions" onClick={(event) => event.stopPropagation()}>
            {annotation.kind === 'revision' ? (
              <>
                <button type="button" className="accept" onClick={() => onAccept(annotation)}>
                  采纳
                </button>
                <button type="button" onClick={() => onDismiss(annotation)}>
                  忽略
                </button>
              </>
            ) : (
              <button type="button" onClick={() => onDismiss(annotation)}>
                知道了
              </button>
            )}
            <button
              type="button"
              className={openThread === annotation.id ? 'is-on' : ''}
              onClick={() => {
                setOpenThread(openThread === annotation.id ? null : annotation.id)
                onRequestLayout()
              }}
            >
              追问
            </button>
            <button
              type="button"
              disabled={!searchReady || verifyingId === annotation.id}
              title={searchReady ? '用搜索服务找可引用的出处' : '先在设置里选搜索服务并填 Key'}
              onClick={() => {
                onVerify(annotation)
                onRequestLayout()
              }}
            >
              {verifyingId === annotation.id ? '核对中…' : '联网核对'}
            </button>
          </footer>

          {annotation.sources && annotation.sources.length > 0 && (
            <>
              <ul className="sources">
                {annotation.sources.map((source) => (
                  <li key={source.url}>
                    <a href={source.url} target="_blank" rel="noreferrer noreferrer">
                      {source.title}
                    </a>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                className="link-button"
                disabled={discussingId === annotation.id}
                onClick={(event) => {
                  event.stopPropagation()
                  onRefine(annotation)
                  onRequestLayout()
                }}
              >
                让侧灯按这些出处重写核实
              </button>
            </>
          )}

          {openThread === annotation.id && (
            <div className="thread-input" onClick={(event) => event.stopPropagation()}>
              <input
                value={draft}
                placeholder="就这条批注追问一句…"
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key !== 'Enter') return
                  event.preventDefault()
                  if (draft.trim().length === 0 || discussingId === annotation.id) return
                  onDiscuss(annotation, draft.trim())
                  setDraft('')
                  onRequestLayout()
                }}
              />
              <button
                type="button"
                disabled={discussingId === annotation.id || draft.trim().length === 0}
                onClick={() => {
                  onDiscuss(annotation, draft.trim())
                  setDraft('')
                  onRequestLayout()
                }}
              >
                {discussingId === annotation.id ? '…' : '发送'}
              </button>
            </div>
          )}
        </article>
      ))}
      {/* 给钉在视口底的「整体评价」面板让位：卡片是绝对定位，不占流，不让位就会被面板压住 */}
      {pending.length > 0 && railSpace > 0 && (
        <div className="rail-cards-space" style={{ height: `${railSpace}px` }} aria-hidden="true" />
      )}
      {(overall.length > 0 || unresolvedNotes.length > 0) && (
        <section className="rail-overall" aria-label="整体评价">
          <button
            type="button"
            className="rail-overall-head"
            aria-expanded={overallOpen}
            onClick={() => setOverallOpen(!overallOpen)}
          >
            <span>整体评价</span>
            <span className="rail-overall-count">{overall.length + unresolvedNotes.length}</span>
            <span aria-hidden="true">{overallOpen ? '收起' : '展开'}</span>
          </button>
          {overallOpen && (
            <div className="rail-overall-body">
              {overall.map((note) => (
                <p key={note.id} className="rail-overall-note">
                  <InlineText text={note.note} />
                </p>
              ))}
              {unresolvedNotes.map((note) => (
                <div key={note.id} className="rail-unresolved">
                  <span className="rail-unresolved-label">未定位</span>
                  {note.quote && <span className="rail-unresolved-quote">“{note.quote}”</span>}
                  <p>
                    <InlineText text={note.note} />
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
      </div>

      <div
        id="rail-panel-chat"
        className="rail-panel-chat"
        role="tabpanel"
        aria-labelledby="rail-tab-chat"
        hidden={railTab !== 'chat'}
      >
        <div className="rail-chat-head">
          <span className="rail-chat-title">和侧灯说一句</span>
          <button
            type="button"
            className="rail-chat-reset"
            disabled={busy || (turns.length === 0 && !chatDraft)}
            onClick={resetChat}
          >
            新对话
          </button>
        </div>

        {simulated && <p className="rail-chat-mock">未配置 API Key，回答是本地模拟的，不调用模型</p>}

        <div className="rail-chat-log" tabIndex={0} role="log" aria-live={busy ? 'off' : 'polite'} aria-busy={busy} aria-label="对话记录" ref={logRef}>
          {turns.length === 0 && (
            <div className="rail-empty rail-chat-empty">
              <p className="rail-empty-title">和侧灯说一句</p>
              <p className="rail-empty-sub">让它找问题、给改法；要落正文点「生成批注」。上下文最多 2000 字：有选区用选区，没选区取光标所在段；刚打开时取开头。</p>
            </div>
          )}
          {turns.map((turn, index) => (
            <p key={index} className={`rail-chat-turn is-${turn.role}`}>
              {(turn.text || busy) && <span className="rail-chat-speaker">{chatSpeaker(turn.role)}</span>}
              {turn.text || (busy && turn.role === 'assistant' ? '…' : '')}
            </p>
          ))}
        </div>

        {chatError && (
          <p className="rail-chat-error" role="alert">
            {chatError}
          </p>
        )}

        <div className="rail-chat-compose">
          <textarea
            ref={inputRef}
            className="rail-chat-input"
            rows={2}
            aria-label="和侧灯说一句"
            placeholder="和侧灯说一句…"
            value={chatDraft}
            onChange={(event) => setChatDraft(event.target.value)}
            onKeyDown={(event) => {
              // 组合输入里的回车是选字，不是发送；Shift+Enter 换行
              if (event.key !== 'Enter' || event.shiftKey || event.nativeEvent.isComposing) return
              event.preventDefault()
              void send()
            }}
          />
          <button type="button" className="rail-chat-send" disabled={busy || !chatDraft.trim()} onClick={() => void send()}>
            发送
          </button>
          <button
            type="button"
            className="rail-chat-generate"
            disabled={busy || !chatDraft.trim() || analyzing || !canGenerate}
            title={
              !canGenerate
                ? '切回编辑视图再生成批注'
                : !chatDraft.trim()
                  ? '先写一句要落成批注的话'
                  : analyzing
                    ? '正在分析，稍等'
                    : '按这句话分析当前这一段，生成批注'
            }
            onClick={generateNotes}
          >
            生成批注
          </button>
        </div>
      </div>

      {/* 第 100 轮 B-227：面板挂到 body（栏里卡片是绝对定位，塞进 .margin-rail 流会被压）。
          只读：没有输入框、没有可编辑区，也不碰正文与批注。第 119 轮 B-249：appDialogOpen 时不挂 */}
      {diffData !== null &&
        diffOpen &&
        createPortal(
          <div
            className="rail-diff-overlay"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) setDiffData(null)
            }}
          >
            <div
              className="rail-diff-sheet"
              role="dialog"
              aria-modal="true"
              aria-labelledby="rail-diff-title"
              tabIndex={-1}
              ref={diffSheetRef}
            >
              <div className="rail-diff-head">
                <span className="rail-diff-title" id="rail-diff-title">
                  改动对比
                </span>
                <span>与打开时相比</span>
                {diffData !== 'none' && (diffData.added > 0 || diffData.removed > 0) && (
                  <span className="rail-diff-count">
                    +{diffData.added} −{diffData.removed} 行
                  </span>
                )}
                <button
                  type="button"
                  className="rail-diff-close"
                  aria-label="关闭对比"
                  onClick={() => setDiffData(null)}
                >
                  ×
                </button>
              </div>
              {diffData === 'none' ? (
                <p className="rail-diff-empty">这篇还没有可对比的正文。</p>
              ) : diffData.added === 0 && diffData.removed === 0 ? (
                <p className="rail-diff-empty">与打开时相比，没有改动。</p>
              ) : (
                <>
                  {diffData.truncated && <p className="rail-diff-empty">改动太多，只显示前 400 行。</p>}
                  {/* 第 120 轮 B-250：面板里只有关闭钮一个 Tab 站，长 diff 键盘读不到第二屏——ul 自己进 Tab 序、焦点环走全局 :focus-visible */}
                  <ul className="rail-diff-rows" role="list" tabIndex={0} aria-label="改动对比行">
                    {diffData.rows.map((row, index) => (
                      <li key={index} className={`rail-diff-row is-${row.kind}`}>
                        {`${markOf(row.kind)} ${row.text || ' '}`}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          </div>,
          document.body,
        )}

      {/* 第 101 轮 B-228：在审文件列表（只读）。复用 diff 面板的外壳与行样式：
          同一套 80vh / 60vh 上限、同一套关闭语义，省一遍样式与焦点代码 */}
      {reviewActive &&
        createPortal(
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
              ref={reviewSheetRef}
            >
              <div className="rail-diff-head">
                <span className="rail-diff-title" id="rail-review-title">
                  在审文件
                </span>
                <span>按 open 数排序</span>
                <button
                  type="button"
                  className="rail-diff-close"
                  aria-label="关闭在审文件"
                  onClick={closeReview}
                >
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
                  {reviewRows.capped && (
                    <p className="rail-diff-empty">文件太多，只扫了前 {reviewRows.scanned} 篇。</p>
                  )}
                  {reviewRows.truncated && (
                    <p className="rail-diff-empty">在审文件太多，只显示前 {reviewRows.rows.length} 篇。</p>
                  )}
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
                          <span className="rail-diff-count">{`open ${row.open} · 共 ${row.total} 条`}</span>
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
        )}
    </aside>
  )
}
