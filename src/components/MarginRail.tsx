import { Suspense, lazy, useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent } from 'react'

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
import type { VerifyState } from '../lib/autoVerify.ts'
import type { Block } from '../lib/context.ts'
import { noteAriaLabel, noteJumpKey } from '../lib/noteA11y.ts'
import type { Settings } from '../lib/settings.ts'
import type { Workspace } from '../lib/workspace.ts'
import { InlineText } from './InlineText.tsx'
import { FOCUSABLE } from './useDialogFocus.ts'

/**
 * 第 139 轮 B-229：三个面板按开合加载。静态 import 会把它们并进常驻的 `MarginRail-*.js`，
 * 真实首载一字节不降——只允许 `lazy(() => import(...))`，点开才下载。
 * 第 140 轮 A2：「对比」搬去 App 的顶栏与全宽模式，这里只剩「在审」与「对话」两块。
 */
const RailReviewPanel = lazy(() => import('./RailReviewPanel.tsx'))
const RailChat = lazy(() => import('./RailChat.tsx'))

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
  /** 当前文档名：在审行名与面板清空用（对话清空改按 docKey，第 130 轮 B-261） */
  docName: string
  /**
   * 文档身份（第 130 轮 B-261）：App 每换一篇 +1。对话清空按它判，不按 `docName`——
   * 新建恒 `未命名.md`、异目录同名文档 basename 相同，按名字判都不会清。
   */
  docKey: number
  /** 取当前正文的块与光标/选区（拼装与截断在 chat.ts）；null = 没有编辑器（还没有正文） */
  getChatSource: () => { blocks: Block[]; from: number; to: number } | null
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
  /**
   * 第 140 轮 A1：宽窗贴右缘的网格轨宽度（280–520）。拖拽期间只写 CSS 变量，
   * 抬手才 `onResize` 回传；键盘 ←/→ 直接按步长回传。
   */
  railWidth: number
  onResize: (width: number) => void
  /** 折叠右栏（宽窗）：App 收掉网格轨、把焦点交给右缘的展开钮 */
  onCollapse: () => void
  goal: string
  discussingId: string | null
  /** 每条批注的核对状态（第 138 轮）：只在「核对中 / 失败」时有；成功不留，出处就列在卡上 */
  verifyStates: Record<string, VerifyState>
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
  railWidth,
  onResize,
  onCollapse,
  goal,
  discussingId,
  verifyStates,
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
  docKey,
  getChatSource,
  getReviewWorkspace,
  getRevisionSource,
  revisionEpoch,
  activePath,
  onOpenReviewFile,
  onGenerateNotes,
  canGenerate,
}: Props) {
  const pending = annotations
    .filter((annotation) => annotation.status === 'pending')
    // 第 140 轮 A1：卡片按正文位置升序（分析流回来的顺序不保证），与 App 的 tops 排布同一口径
    .sort((left, right) => left.from - right.from)
  const [openThread, setOpenThread] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [overallOpen, setOverallOpen] = useState(true)

  /* ---------- 对话页签（第 96 轮 B-223） ---------- */

  /**
   * 第 139 轮 B-229：对话面板首开 `railTab === 'chat'` 才加载（lazy chunk，`chat.ts` 随组件走），
   * 之后保持挂载（外层 `#rail-panel-chat` 用 hidden 藏住）保住 `turns`；换文档由 `key={docKey}`
   * 重挂清空。逻辑与 JSX 都在 `RailChat.tsx`。
   */
  const [chatMounted, setChatMounted] = useState(railTab === 'chat')

  useEffect(() => {
    if (railTab === 'chat') setChatMounted(true)
  }, [railTab])

  /** 第 134 轮 A1（B-264）：追问输入框，与「点完发送该回哪条线程」的意图 id（追问在批注卡上） */
  const threadInputRef = useRef<HTMLInputElement | null>(null)
  const threadRefocusRef = useRef<string | null>(null)

  // 第 134 轮 A1（B-264）：追问流式收尾把「发送」钮还原时，焦点可能已在 body 上；
  // 只认本次点击记下的那条线程，且读者没把焦点交给别处（body = 丢焦点，仍在本条线程里 = 没走开）。
  useEffect(() => {
    if (discussingId !== null) return
    const want = threadRefocusRef.current
    if (want === null) return
    threadRefocusRef.current = null
    if (want !== openThread) return
    const notes = document.getElementById('rail-panel-notes')
    if (document.activeElement === document.body || !!notes?.contains(document.activeElement)) {
      threadInputRef.current?.focus()
    }
  }, [discussingId])

  /* ---------- 宽窗拖宽 / 折叠（第 140 轮 A1） ---------- */

  const RAIL_MIN = 280
  const RAIL_MAX = 520
  const clampRailWidth = (value: number) => Math.min(RAIL_MAX, Math.max(RAIL_MIN, Math.round(value)))

  /** 拖拽期间只改布局节点的自定义属性：逐帧 setState 会把整栏（含批注卡）重排一遍 */
  const paintWidth = (width: number) => {
    const layout = railRef.current?.closest<HTMLElement>('.doc-layout')
    layout?.style.setProperty('--rail-width', `${width}px`)
  }

  /**
   * pointerdown 记起点；move 按「左移变宽」算（除以整页缩放，100% 时就是 1:1），
   * 抬手才把最终宽度回传 App（`onResize`）。
   */
  const startResize = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.preventDefault()
    const zoom = settings.pageZoom / 100
    const startX = event.clientX
    const startWidth = railWidth
    let latest = startWidth
    const move = (moveEvent: PointerEvent) => {
      latest = clampRailWidth(startWidth + (startX - moveEvent.clientX) / zoom)
      paintWidth(latest)
    }
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      onResize(latest)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

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

  // App 的 Esc 链挂在 window 上：在 document 就停掉冒泡，一次按键只关面板。
  // 第 139 轮 B-229：Esc 处理随面板搬进 RailDiffPanel / RailReviewPanel（挂载即注册）。

  /* ---------- 「在审文件」只读面板（第 101 轮 B-228） ---------- */

  /**
   * 第 139 轮 B-229：与对比面板同法——点「在审」才挂载 lazy chunk；换文档、切页签、
   * App 对话框都收掉。面板自己的扫描/快照在途读取由卸载（run 序号）作废。
   */
  const [reviewOn, setReviewOn] = useState(false)
  const reviewActive = reviewOn && railTab === 'notes' && !appDialogOpen

  // 面板只挂在「批注」页签上：切到对话页签就收掉
  useEffect(() => {
    if (railTab !== 'notes') setReviewOn(false)
  }, [railTab])

  // 换文档：「在审」面板收掉（第 119 轮 B-249：让位期间不挂载，回来也不能是上一篇的）
  useEffect(() => {
    setReviewOn(false)
  }, [docName])

  const overall = docNotes.filter((note) => note.kind === 'overall')
  const unresolvedNotes = docNotes.filter((note) => note.kind === 'unresolved')

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
      {/* 第 140 轮 A1：拖宽把手（宽窗）。role=separator + 键盘 ←/→ 各 16px */}
      <div
        className="rail-resize"
        role="separator"
        aria-orientation="vertical"
        aria-label="调整侧栏宽度"
        aria-valuemin={RAIL_MIN}
        aria-valuemax={RAIL_MAX}
        aria-valuenow={railWidth}
        tabIndex={0}
        onPointerDown={startResize}
        onKeyDown={(event) => {
          const step = event.key === 'ArrowLeft' ? 16 : event.key === 'ArrowRight' ? -16 : 0
          if (step === 0) return
          event.preventDefault()
          onResize(clampRailWidth(railWidth + step))
        }}
      />
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
        {/* 第 101 轮 B-228：「在审文件」。右缘贴着 head 右缘；间距 7px 走 .rail-head 的 gap */}
        {railTab === 'notes' && (
          <button
            type="button"
            className="rail-review-open"
            aria-haspopup="dialog"
            title="在审文件"
            onClick={() => setReviewOn(true)}
          >
            在审
          </button>
        )}
        {/* 第 140 轮 A1：折叠右栏（宽窗）。窄窗由 CSS 隐藏，出口是顶栏「批注」抽屉 */}
        <button
          type="button"
          className="rail-collapse"
          aria-expanded="true"
          aria-controls="rail-panel-notes"
          title="收起批注栏"
          onClick={onCollapse}
        >
          ▸
        </button>
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
            {/* 联网核对（第 138 轮起默认自动）：有出处时不再留按钮，出处已经列在卡上；
                核对中显示「核对中…」，搜失败或没搜到才留「重新核对」 */}
            {(annotation.sources?.length ?? 0) === 0 && (
              <button
                type="button"
                disabled={!searchReady || verifyStates[annotation.id] === 'verifying'}
                title={searchReady ? '用搜索服务找可引用的出处' : '先在设置里选搜索服务并填 Key'}
                onClick={() => {
                  onVerify(annotation)
                  onRequestLayout()
                }}
              >
                {verifyStates[annotation.id] === 'verifying'
                  ? '核对中…'
                  : verifyStates[annotation.id] === 'failed'
                    ? '重新核对'
                    : '联网核对'}
              </button>
            )}
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
                ref={threadInputRef}
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
                  // 第 134 轮 A1（B-264）：追问的「发送」点完也置灰；先移焦到输入框并记下这条线程
                  threadInputRef.current?.focus()
                  threadRefocusRef.current = annotation.id
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
        {/* 第 139 轮 B-229：首开才加载，之后保持挂载（hidden）保 turns；就地包 Suspense，
            首开只让这一格空一帧，`.margin-rail` 与页签不换 null（B-230 的回焦依赖它还在） */}
        <Suspense fallback={null}>
          {chatMounted && (
            <RailChat
              key={docKey}
              settings={settings}
              simulated={simulated}
              tabActive={railTab === 'chat'}
              analyzing={analyzing}
              canGenerate={canGenerate}
              getChatSource={getChatSource}
              onGenerateNotes={onGenerateNotes}
            />
          )}
        </Suspense>
      </div>

      {/* 第 101 轮 B-228：在审文件列表（只读）。复用 diff 面板的外壳与行样式：
          同一套 80vh / 60vh 上限、同一套关闭语义，省一遍样式与焦点代码。
          第 139 轮 B-229：与对比面板同法按开合加载；第 140 轮 A2 起「对比」搬去 App 的全宽模式 */}
      <Suspense fallback={null}>
        {reviewActive && (
          <RailReviewPanel
            annotations={annotations}
            activePath={activePath}
            docName={docName}
            revisionEpoch={revisionEpoch}
            getReviewWorkspace={getReviewWorkspace}
            getRevisionSource={getRevisionSource}
            onOpenReviewFile={onOpenReviewFile}
            onClose={() => setReviewOn(false)}
          />
        )}
      </Suspense>
    </aside>
  )
}
