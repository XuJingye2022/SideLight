import { lazy, Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Extension, type ChainedCommands, type Editor } from '@tiptap/core'
import { Markdown } from '@tiptap/markdown'
import { EditorContent, useEditor } from '@tiptap/react'
import { StarterKit } from '@tiptap/starter-kit'
import { Strike } from '@tiptap/extension-strike'
import type { Node as PMNode } from '@tiptap/pm/model'
import type { Transaction } from '@tiptap/pm/state'
import { TextSelection } from '@tiptap/pm/state'
import { isHistoryTransaction } from 'prosemirror-history'
import { Image } from '@tiptap/extension-image'
import { Mathematics } from '@tiptap/extension-mathematics'
import { Table, TableCell, TableHeader, TableRow } from '@tiptap/extension-table'
import { TaskItem } from '@tiptap/extension-task-item'
import { TaskList } from '@tiptap/extension-task-list'

import { FileMenu } from './components/FileMenu.tsx'
import { FileTree } from './components/FileTree.tsx'
import { InlinePopover } from './components/InlinePopover.tsx'
import { MathDraftPreview } from './components/MathDraftPreview.tsx'
import { MathInlineEditor } from './components/MathInlineEditor.tsx'
import { MarginRail } from './components/MarginRail.tsx'
import { PreviewPane } from './components/PreviewPane.tsx'
import { SaveDialog } from './components/SaveDialog.tsx'
import { CloseGuardDialog } from './components/CloseGuardDialog.tsx'

// 查找条与大纲面板只在打开时加载，不占首屏
const FindBar = lazy(() => import('./components/FindBar.tsx').then((module) => ({ default: module.FindBar })))
const Outline = lazy(() => import('./components/Outline.tsx').then((module) => ({ default: module.Outline })))
import { SettingsDialog } from './components/SettingsDialog.tsx'
import { ShortcutsDialog } from './components/ShortcutsDialog.tsx'
import { StatusBar } from './components/StatusBar.tsx'
import { useDialogFocus } from './components/useDialogFocus.ts'
import { errorCopy, messageOf, streamAnnotations, streamChat, type ChatMessage } from './lib/ai.ts'
import {
  buildTextIndex,
  findRange,
  parseStream,
  resolveAnnotations,
  type Annotation,
  type ParsedAnnotation,
} from './lib/annotations.ts'
import { cacheKey, legacyKeyFor, readCache, removeCache, writeCache } from './lib/cache.ts'
import { buildChunkContext, buildContext, splitSelection, type Block, type ContextPayload } from './lib/context.ts'
import { AnnotationDecorations, renderAnnotations, renderFind, renderFocus } from './lib/decorations.ts'
import { MathInputRules } from './lib/mathInput.ts'
import { activeLosses, baselineLosses, countReferenceDefinitions, hasReferenceDefinitions, lossLabels, type Loss } from './lib/risk.ts'
import { repairCalloutMarkers } from './lib/escapes.ts'
import { buildHtmlDocument, buildPlainText, exportName } from './lib/export.ts'
import { ensureKatex } from './lib/katexLazy.ts'
import { findAll, type Match } from './lib/find.ts'
import { extractFootnotes, joinFootnotes, repairFootnoteRefs } from './lib/footnotes.ts'
import { joinFrontmatter, leadingNewlines, splitFrontmatter } from './lib/frontmatter.ts'
import { serializeDocument, serializeDocumentBody } from './lib/serializeDocument.ts'
import { repairHtml, escapeHtmlForParse } from './lib/html.ts'
import { protectMathPairs, repairMath } from './lib/math.ts'
import { activeOutlineId, extractOutline, type OutlineItem } from './lib/outline.ts'
import { clampFontSize, DEFAULT_SETTINGS } from './lib/settings.ts'
import { searchWeb } from './lib/search.ts'
import { hasKey, loadSettings, saveSettings, type Settings } from './lib/settings.ts'
import { countText, type TextStats } from './lib/wordcount.ts'
import {
  demoWorkspace,
  flattenFiles,
  parentDirectory,
  pickFile,
  pickWorkspace,
  readNode,
  refreshWorkspace,
  saveAsFile,
  writeNode,
  type FileWriteTarget,
  type Workspace,
  type WorkspaceFileNode,
} from './lib/workspace.ts'
import { assetFileName, writeAsset } from './lib/asset.ts'

declare global {
  interface Window {
    /** 宿主与验收脚本读的脏标记与文档名；round-02 跨组契约，随 [dirty, docName] 更新 */
    __slState?: { dirty: boolean; name: string; readOnly?: boolean; viewMode?: 'edit' | 'source' | 'preview' }
    /** WebView2 宿主桥：只在宿主里存在；浏览器里是 undefined */
    chrome?: {
      webview?: {
        postMessage: (message: unknown) => void
        addEventListener: (type: 'message', listener: (event: { data: unknown }) => void) => void
        removeEventListener: (type: 'message', listener: (event: { data: unknown }) => void) => void
      }
    }
  }
}

const DOC_KEY = 'sidelight.doc.v1'

/** 第一次打开时正文就是示例，文档名也说明这一点，别让三处说法互相矛盾 */
const DEMO_DOC_NAME = '示例 · 未命名.md'

/**
 * 删除线只绑 Mod-Shift-x。Tiptap 自带的 Strike 用 Mod-Shift-s，
 * 和「保存」的 Ctrl+S 家族以及浏览器「另存网页」抢键，必须整条换掉而不是再补一条。
 */
const StrikeShortcut = Strike.extend({
  addKeyboardShortcuts() {
    return { 'Mod-Shift-x': () => this.editor.commands.toggleStrike() }
  },
})

/**
 * 表格序列化去掉首尾换行：Tiptap 的表格 renderMarkdown 自带前后 `\n`，
 * 和文档级 `\n\n` 叠加会每存一次多两行。实测 MarkdownManager 用的是这里注册的扩展。
 */
const ReusableTable = Table.extend({
  renderMarkdown(node, helpers) {
    // 用运行时 parent 调原实现：Tiptap 的 this 类型带 name/options/storage，这里只取 parent
    const parent = (this as unknown as { parent: (node: unknown, helpers: unknown) => string }).parent
    return parent
      .call(this, node, helpers)
      .replace(/^\n+/, '')
      .replace(/\n+$/, '')
  },
})

const SAMPLE = `# 侧灯

这是 Sidelight 的原型。左边写，右边批注。
选中一段文字，按 Ctrl + Enter。侧灯会在对应的句子旁边留一条边注。
## 为什么叫侧灯

主灯是人，侧灯只补光。工具不该替你写，只该在你写完一段之后，告诉你哪里还能更清楚。
写作是件要自己完成的事。有三成的人会在第一章放弃；原因往往不是不会写，是不知道自己在写什么。
## 快捷键
- Ctrl + Enter：对选区下批注
- Ctrl + B / I：粗体、斜体
- Ctrl + S：保存
`

function readBlocks(editor: Editor): Block[] {
  const blocks: Block[] = []
  editor.state.doc.forEach((node, offset) => {
    blocks.push({ from: offset, to: offset + node.nodeSize, text: node.textContent })
  })
  return blocks
}

function blockPosOf(editor: Editor): number {
  const from = editor.state.selection.$from
  return from.depth >= 1 ? from.before(1) : 0
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('图片读取失败'))
    reader.readAsDataURL(file)
  })
}

/** 编辑器读不全的语法，用来提示用户走源码模式 */

/** 失败原因：优先用错误自带的 message，没有就给一句通用的 */
function reasonOf(error: unknown): string {
  if (error instanceof Error && error.message) return error.message
  return '原因未知'
}

/** 编辑器正文 → 与保存一致的 Markdown（只出正文；frontmatter / 脚注由调用方拼） */
function serializeBody(current: Editor, original?: string | null): string {
  return serializeDocumentBody(current, original)
}

/** 文档位置 → 文本下标（buildTextIndex 的 text 与文档位置不是同一坐标系） */
function offsetForPosition(index: { positions: number[] }, position: number): number {
  let low = 0
  let high = index.positions.length - 1
  let best = 0
  while (low <= high) {
    const mid = (low + high) >> 1
    if (index.positions[mid] <= position) {
      best = mid
      low = mid + 1
    } else {
      high = mid - 1
    }
  }
  return best
}

type SelectionState = {
  chars: number
  from: number
  to: number
  source: 'selection' | 'paragraph'
}

/** 全局提示：错误带原因与下一步，且不自动消失 */
type Notice = {
  text: string
  kind: 'info' | 'error'
  action?: { label: string; onClick: () => void }
  /** 多个动作（例如「从列表移除」「重试」）；与 action 可同时存在 */
  actions?: Array<{ label: string; onClick: () => void }>
  /** true 时跳过 6 秒计时器：保存结果这类信息要一直留着 */
  persist?: boolean
  /** 自定义存活时长（毫秒），优先于默认 6 秒 */
  ttl?: number
}

/** 宿主 `/__doc` 提供的信息：页面不拿完整路径，只认文件名与元数据 */
type HostDoc = {
  writable: boolean
  fileName: string
  mtime: number
  ready: boolean
}

/** 保存目标：四条路径共用同一个差异门 */
type SaveTarget = 'host' | 'file' | 'saveAs' | 'switch'

type PendingConfirm = {
  normalized: string
  withEol: string
  target: SaveTarget
  losses: Loss[]
  /** 保存成功后执行（例如打开最近项）；取消或失败不执行 */
  after?: () => void
}

/** 宿主文档的解析上限：marked 的行内正则对超长单行会在 8 MB 左右爆栈，这里留余量 */
const MAX_HOST_DOC_LENGTH = 6 * 1024 * 1024
type HostDocResponse = {
  v?: number
  ok?: boolean
  text?: string
  fileName?: string
  eol?: string
  readOnly?: boolean
  mtime?: number
  error?: string
}

/** 宿主 `/__recent` 的一条：页面只拿 id/seq/name/dir，没有完整路径 */
type RecentItem = { id: string; seq: number; name: string; dir: string }

type RecentState =
  | { kind: 'no-host' }
  | { kind: 'disabled'; reason: string }
  | { kind: 'volatile'; items: RecentItem[]; reason?: string }
  | { kind: 'ok'; items: RecentItem[]; reason?: string }
  | { kind: 'error'; message: string }

/** 宿主错误码 → 用户文案（只映射，不发明新码） */
function recentError(error: string | undefined): string {
  switch (error) {
    case 'STALE':
      return '最近记录已过期，正在刷新。'
    case 'FILE_GONE':
      return '文件不存在或已移动。'
    case 'READONLY':
      return '这个文件只能只读打开。'
    case 'ENCODING':
      return '文件编码无法识别。'
    case 'TOO_LARGE':
      return '文件超过 6 MB，暂不支持。'
    case 'BAD_REQUEST':
      return '请求被拒绝。'
    case 'IO':
      return '读取失败，可能是网络盘或权限问题。'
    case 'NO_STATE_DIR':
      return '最近记录功能不可用（没有可写状态目录）。'
    default:
      return '打开失败，请重试。'
  }
}

/** .NET ticks（100ns，0001 起）→ JS 毫秒；宿主 `/__doc`、`/__draft` 用 ticks */
function ticksToMillis(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return Date.now()
  return value > 1e15 ? Math.round((value - 621355968000000000) / 10000) : value
}

/** 宿主写回的错误码 → 用户能读懂的一句话 */
function hostErrorCopy(code: string): string {
  switch (code) {
    case 'READONLY':
      return '这个文件是只读的，宿主没有写盘。请把文件属性改成可写，或用「另存为」存到别处。'
    case 'FILE_LOCKED':
      return '文件正被别的程序占用，宿主没有写盘。关掉占用它的程序后再重试。'
    case 'PATH_CHANGED':
      return '文件在打开后被外部修改过，为了避免覆盖别人的改动，这次没有写盘。请确认后再重试或另存为。'
    case 'FILE_GONE':
      return '原文件不见了，宿主没有写盘。请用「另存为」保存到新位置。'
    case 'ENCODING':
      return '这个文件的编码没法安全写回（会改动原字节），这次没有写盘。请用「另存为」存成 UTF-8。'
    case 'TOO_LARGE':
      return '文件超过 32 MB，宿主拒绝写回。请用别的编辑器处理，或另存为。'
    case 'EOL_MISMATCH':
      return '换行结构与打开时不一致，宿主拒绝写回，避免整篇换行被改写。请用「另存为」。'
    case 'BAD_REQUEST':
      return '宿主拒绝了这次保存请求（请求格式不对），没有写盘。'
    default:
      return '宿主写回失败，没有写盘。改动还在，可以重试或另存为。'
  }
}


export default function App() {
  const [settings, setSettings] = useState<Settings>(() => loadSettings())
  // 没配 Key 时走本地模拟流，界面必须明说，否则用户会以为模型读过文章
  const simulated = !hasKey(settings)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const exportTriggerRef = useRef<HTMLButtonElement | null>(null)
  const [workspace, setWorkspace] = useState<Workspace | null>(null)
  /** 回收站不可用原因（.sidelight 是文件/没权限）；null 表示可用 */
  const [trashReason, setTrashReason] = useState<string | null>(null)
  const [treeRefreshing, setTreeRefreshing] = useState(false)
  const [activeFile, setActiveFile] = useState<WorkspaceFileNode | null>(null)
  const [treeCollapsed, setTreeCollapsed] = useState(false)
  /** 窄窗时页边栏变抽屉：顶栏「批注」开关它 */
  const [railOpen, setRailOpen] = useState(false)
  const [sidebarTab, setSidebarTab] = useState<'files' | 'outline'>('files')
  const [annotations, setAnnotations] = useState<Annotation[]>([])
  const [analyzing, setAnalyzing] = useState(false)
  const [discussingId, setDiscussingId] = useState<string | null>(null)
  const [verifyingId, setVerifyingId] = useState<string | null>(null)
  const [analysisGoal, setAnalysisGoal] = useState('')
  const [unresolved, setUnresolved] = useState(0)
  const [notice, setNotice] = useState<Notice | null>(null)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [selection, setSelection] = useState<SelectionState>({ chars: 0, from: 0, to: 0, source: 'paragraph' })
  const [tops, setTops] = useState<Record<string, number>>({})
  const [bubble, setBubble] = useState<{ top: number; left: number } | null>(null)
  const [tick, setTick] = useState(0)
  const [dirty, setDirty] = useState(false)

  /** 普通提示：6 秒后自动消失 */
  const show = useCallback((text: string) => setNotice({ text, kind: 'info' }), [])
  /** 错误提示：中文原因 + 下一步，不自动消失；401/断网给「打开设置」 */
  const fail = useCallback((error: unknown, retry?: () => void) => {
    const copy = errorCopy(error)
    let action: Notice['action']
    if (copy.action === 'settings') action = { label: '打开设置', onClick: () => setSettingsOpen(true) }
    else if (retry) action = { label: '重试', onClick: retry }
    setNotice({ text: copy.text, kind: 'error', action })
  }, [])
  const [outline, setOutline] = useState<OutlineItem[]>([])
  const [activeOutline, setActiveOutline] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'edit' | 'source' | 'preview'>('edit')
  const [sourceConfirm, setSourceConfirm] = useState<'restore' | 'exit' | null>(null)
  const [sourceRefCount, setSourceRefCount] = useState(0)
  const sourceMode = viewMode === 'source'
  const previewMode = viewMode === 'preview'
  const [sourceText, setSourceText] = useState('')
  const [focusMode, setFocusMode] = useState(false)
  const [typewriterMode, setTypewriterMode] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)
  const [risks, setRisks] = useState<string[]>([])
  const [findOpen, setFindOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [replacement, setReplacement] = useState('')
  const [matches, setMatches] = useState<Match[]>([])
  const [matchIndex, setMatchIndex] = useState(0)
  const [pendingConfirm, setPendingConfirm] = useState<PendingConfirm | null>(null)
  const eolRef = useRef<'lf' | 'crlf'>('lf')
  const [pendingSwitch, setPendingSwitch] = useState<{
    text: string
    name: string
    file: WorkspaceFileNode | null
    /** 确认之后要做的事（例如「新建」还要先建文件）；没有就直接载入 text */
    after?: () => void
  } | null>(
    null,
  )
  const [linkEdit, setLinkEdit] = useState<{ href: string; from: number; to: number; anchor: DOMRect } | null>(null)
  const [mathEdit, setMathEdit] = useState<{ latex: string; from: number; to: number; anchor: DOMRect } | null>(null)
  const [mathDraft, setMathDraft] = useState<{
    from: number
    to: number
    latex: string
    block: boolean
    top: number
    left: number
  } | null>(null)
  const mathDraftRef = useRef<{ from: number; to: number; block: boolean; text: string } | null>(null)

  // 草稿、文档名、frontmatter 一起恢复，避免刷新后元数据与文件名丢失
  const [initial] = useState(() => {
    const fallback = {
      text: SAMPLE,
      frontmatter: '',
      footnotes: '',
      name: DEMO_DOC_NAME,
      savedAt: 0,
      readOnly: false,
    }
    try {
      const raw = localStorage.getItem(DOC_KEY)
      if (!raw) {
        const split = splitFrontmatter(SAMPLE)
        const footnoteSplit = extractFootnotes(split.body)
        return { ...fallback, text: footnoteSplit.body, frontmatter: split.frontmatter, footnotes: footnoteSplit.footnotes }
      }
      const parsed = JSON.parse(raw) as { text?: string; name?: string; savedAt?: number; readOnly?: boolean }
      const text = typeof parsed.text === 'string' ? parsed.text : raw
      const split = splitFrontmatter(text)
      const footnoteSplit = extractFootnotes(split.body)
      return {
        text: footnoteSplit.body,
        frontmatter: split.frontmatter,
        footnotes: footnoteSplit.footnotes,
        name: parsed.name ?? DEMO_DOC_NAME,
        savedAt: typeof parsed.savedAt === 'number' ? parsed.savedAt : 0,
        // 宿主 argv 打开的文件是只读的：保存只能另存为，不能假装写回原文件
        readOnly: parsed.readOnly === true,
      }
    } catch {
      return fallback
    }
  })

  const [docName, setDocName] = useState(initial.name)
  const [readOnly, setReadOnly] = useState(initial.readOnly)
  /** 宿主文档（`/__doc` 成功才有）；null 表示普通浏览器文档 */
  const [hostDoc, setHostDoc] = useState<HostDoc | null>(null)
  const [hostError, setHostError] = useState<string | null>(null)
  /** 宿主草稿比原文件新：先问恢复还是丢弃 */
  const [hostDraftPrompt, setHostDraftPrompt] = useState<{ text: string; mtime: number } | null>(null)
  const [draftRestored, setDraftRestored] = useState(false)
  /** 关窗三选一：宿主请求排队/显示中 */
  const [closeRequested, setCloseRequested] = useState(false)
  const [closeGuardOpen, setCloseGuardOpen] = useState(false)
  /** 自动保存排队与状态（状态栏 chip） */
  const [autoSaveScheduled, setAutoSaveScheduled] = useState(false)
  const [autoSaveState, setAutoSaveState] = useState<'idle' | 'saved' | 'manual' | 'failed' | 'external'>('idle')
  const [autoSavedAt, setAutoSavedAt] = useState<number | null>(null)
  /** 最近打开：宿主才有的列表；浏览器里保持 no-host，整段不渲染 */
  const [recent, setRecent] = useState<RecentState>({ kind: 'no-host' })
  const [recentStaleId, setRecentStaleId] = useState<string | null>(null)
  /** 冷启动时发现未保存草稿：先问用户保留草稿还是继续打开宿主文件 */
  const [draftPrompt, setDraftPrompt] = useState<{ fileName: string; savedAt: number } | null>(null)
  const hostPayloadRef = useRef<HostDocResponse | null>(null)
  const draftDialogRef = useRef<HTMLDivElement | null>(null)
  /** 等宿主写回结束再切文档的排队（不复制 saving 状态机） */
  const hostSaveWaitersRef = useRef<Array<() => void>>([])
  /** 宿主写回进行中：按钮显示「保存中…」，再按一次只排队一次 */
  const [saving, setSaving] = useState(false)
  /** 宿主写回失败/超时的可见原因（带重试与另存为） */
  const [saveError, setSaveError] = useState<string | null>(null)
  const [frontmatter, setFrontmatter] = useState(initial.frontmatter)
  const [footnotes, setFootnotes] = useState(initial.footnotes)
  const [originalText, setOriginalText] = useState<string | null>(null)
  const [saveWarned, setSaveWarned] = useState(false)
  const [draftShown, setDraftShown] = useState(initial.savedAt > 0)
  const [stats, setStats] = useState<TextStats>(() => countText(initial.text))

  const abortRef = useRef<AbortController | null>(null)
  const chatAbortRef = useRef<AbortController | null>(null)
  const railRef = useRef<HTMLDivElement | null>(null)
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const cardRefs = useRef(new Map<string, HTMLElement>())
  const analyzeRef = useRef<() => void>(() => {})
  const typewriterRef = useRef<() => void>(() => {})
  const sourceBaselineRef = useRef('')
  /** 载入后直接进源码（原文件）：未编辑时不能被富文本序列化基线判成 dirty */
  const sourceOriginalEntryRef = useRef(false)

  /** 进源码模式的唯一入口：seed 源码框与基线，再切视图（漏 seed 会让 Ctrl+S 写空文件） */
  const enterSourceFor = useCallback((text: string, fromLoad = false) => {
    setSourceText(text)
    sourceBaselineRef.current = text
    sourceOriginalEntryRef.current = fromLoad
    setViewMode('source')
    setFocusMode(false)
    setTypewriterMode(false)
  }, [])
  /** 保存基线：当前正文与它不等才算脏；载入、保存成功、草稿恢复时更新 */
  const baselineRef = useRef<string | null>(null)
  /** 另存为拿到的落点：第二次保存直接写它，不再弹选择器 */
  const saveTargetRef = useRef<FileWriteTarget | null>(null)
  /** 「另存为」的入口：提示条上的按钮与文件菜单都用它 */
  const saveAsCopyRef = useRef<() => void>(() => {})
  /** 当前正文的序列化结果（onUpdate 里做基线比较用，避开 useCallback 的声明顺序） */
  const contentRef = useRef<() => string>(() => '')
  const acceptedRef = useRef<Array<{ annotation: Annotation; from: number; to: number; replacement: string }>>([])
  const fileRef = useRef<WorkspaceFileNode | null>(null)
  const workspaceRef = useRef<Workspace | null>(null)
  const openLinkRef = useRef<(anchor: HTMLAnchorElement) => void>(() => {})
  const mathEditRef = useRef<(position: number) => void>(() => {})
  const toggleSourceRef = useRef<() => void>(() => {})
  const togglePreviewRef = useRef<() => void>(() => {})
  const draftTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  /** 宿主草稿：generation 用过期的回包一律丢弃 */
  const draftGenerationRef = useRef(0)
  const draftPendingRef = useRef<{ id: number; generation: number; ack: Promise<void>; resolve: () => void } | null>(null)
  const nextDraftIdRef = useRef(0)
  const draftSuppressedRef = useRef(false)
  const scheduleHostDraftRef = useRef<(text: string) => void>(() => {})
  const scheduleAutoSaveRef = useRef<() => void>(() => {})
  const cancelAutoSaveRef = useRef<() => void>(() => {})
  const clearHostDraftRef = useRef<() => Promise<void>>(async () => {})
  /** 同步的「宿主写回在飞」标记：state 下一次渲染才更新，auto 判定要用它 */
  const savingRef = useRef(false)
  /** 删除/刷新期间禁止写盘：generation 在删除前递增，旧请求据此作废 */
  const deletingRef = useRef(false)
  const refreshingRef = useRef(false)
  const autoSaveGenerationRef = useRef(0)
  /** 切换文档请求的序号：等在飞保存期间又发生改名/再次切换时，旧请求作废 */
  const loadEpochRef = useRef(0)
  const performingCommitRef = useRef<Promise<unknown> | null>(null)
  /** 最近打开：请求 id → resolve；同一行在飞时忽略重复点击 */
  const recentRequestsRef = useRef(new Map<string, (data: { ok?: boolean; error?: string }) => void>())
  const nextRecentIdRef = useRef(0)
  const recentOpeningRef = useRef<string | null>(null)
  const lastClearIdRef = useRef<number | null>(null)
  /** 宿主文档「保存并切换」：save-result ok 后再执行切换/打开最近项 */
  const hostSwitchPendingRef = useRef(false)
  const hostDocRef = useRef<HostDoc | null>(null)
  /** 自动保存：2 秒防抖 + 输入法组合保护 */
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const composeUntilRef = useRef(0)
  const autoFailCountRef = useRef(0)
  const fileMtimeRef = useRef(0)
  /** onUpdate 里同步维护，自动保存定时器不读可能过期的 state */
  const dirtyRef = useRef(false)
  const railToggleRef = useRef<HTMLButtonElement | null>(null)
  /** 宿主文档模式：onUpdate 不再往 localStorage 写整篇正文（大文件会撑爆配额） */
  const hostModeRef = useRef(false)
  /** 写回状态机：pendingIds + pendingHostSave + saving 是唯一一套 */
  const pendingIdsRef = useRef(new Set<number>())
  /** 宿主写回队列（保存中再按一次只留最新一份） */
  const pendingHostSave = useRef<{ text: string } | null>(null)
  /** 载入时的结构损失基线：只有这些结构以后才可能被拦 */
  const baselineLossesRef = useRef<Loss[]>([])
  /** 文件原文：源码模式在「未编辑」时显示它，保存成功后更新为刚写入的文本 */
  const rawTextRef = useRef<string | null>(null)
  const sentTextRef = useRef<{ id: number; text: string } | null>(null)
  const saveTimersRef = useRef(new Map<number, ReturnType<typeof setTimeout>>())
  const nextSaveIdRef = useRef(0)
  const sendHostSaveRef = useRef<(text: string) => void>(() => {})
  const hostSaveSuccessRef = useRef<(id: number, payload: { mtime?: number }) => void>(() => {})

  /** 写回还没结束就切文档：等回包或超时再放行，避免旧回包清掉新文档的 dirty */
  const waitForHostSave = useCallback(
    () =>
      new Promise<void>((resolve) => {
        if (pendingIdsRef.current.size === 0) {
          resolve()
          return
        }
        hostSaveWaitersRef.current.push(resolve)
      }),
    [],
  )

  const flushHostSaveWaiters = useCallback(() => {
    if (pendingIdsRef.current.size > 0) return
    const waiters = hostSaveWaitersRef.current.splice(0)
    for (const resolve of waiters) resolve()
  }, [])

  /** 删除前等在飞的手动/自动保存结束；最多 2 秒 */
  const waitForCommit = useCallback(async () => {
    const inFlight = performingCommitRef.current
    if (inFlight) {
      await Promise.race([inFlight.catch(() => undefined), new Promise<void>((resolve) => setTimeout(resolve, 2000))])
    }
    await Promise.race([waitForHostSave(), new Promise<void>((resolve) => setTimeout(resolve, 2000))])
  }, [waitForHostSave])

  useEffect(() => {
    fileRef.current = activeFile
  }, [activeFile])

  useEffect(() => {
    workspaceRef.current = workspace
  }, [workspace])

  /** 文档所在目录的句柄，用来在 .sidelight 里写缓存；示例与单文件打开时拿不到 */
  const cacheDirFor = useCallback(async (): Promise<FileSystemDirectoryHandle | null> => {
    const space = workspaceRef.current
    const file = fileRef.current
    if (!space || !file?.path) return null
    return parentDirectory(space, file.path)
  }, [])
  const insertImageRef = useRef<(file: File) => void>(() => {})
  const imageInputRef = useRef<HTMLInputElement | null>(null)
  const frontmatterRef = useRef(initial.frontmatter)
  const footnotesRef = useRef(initial.footnotes)
  const docNameRef = useRef(initial.name)
  const switchDialogRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    frontmatterRef.current = frontmatter
  }, [frontmatter])

  useEffect(() => {
    footnotesRef.current = footnotes
  }, [footnotes])

  useEffect(() => {
    docNameRef.current = docName
  }, [docName])

  // 跨组契约：宿主与验收脚本从这里读脏标记，不看编辑器内部状态
  useEffect(() => {
    window.__slState = { dirty, name: docName, readOnly, viewMode }
  }, [dirty, docName, readOnly, viewMode])

  // 主题：设置变化时同步到 <html data-theme>；取消对话框也靠这里还原到已保存值
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', settings.theme)
  }, [settings.theme, settingsOpen])

  // 宿主文档：窗口标题显示文件名（转发/另存为后会跟着变）
  useEffect(() => {
    hostDocRef.current = hostDoc
    document.title = hostDoc?.ready ? `${hostDoc.fileName} — Sidelight` : 'Sidelight'
  }, [hostDoc])

  useEffect(() => {
    dirtyRef.current = dirty
  }, [dirty])

  // 切换文档的确认框与另外两个对话框共用一套焦点逻辑
  useDialogFocus(pendingSwitch !== null, switchDialogRef)

  /** 关上窄窗抽屉，并把焦点还给顶栏「批注」按钮 */
  const closeRail = useCallback(() => {
    setRailOpen(false)
    railToggleRef.current?.focus()
  }, [])

  const openRail = useCallback(() => {
    setRailOpen(true)
    // 抽屉渲染出来再把焦点送进去，键盘用户才不会掉在背景里
    requestAnimationFrame(() => document.querySelector<HTMLElement>('.rail-close')?.focus())
  }, [])

  const shortcutExtension = useMemo(
    () =>
      Extension.create({
        name: 'sidelightShortcut',
        priority: 1000,
        addKeyboardShortcuts: () => ({
          'Mod-Enter': () => {
            analyzeRef.current()
            return true
          },
        }),
      }),
    [],
  )

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ strike: false }),
      StrikeShortcut,
      Image.configure({ allowBase64: true }),
      Mathematics.configure({
        // 点公式就进编辑：位置交给节点自己报，比从 DOM 反推准
        inlineOptions: {
          onClick: (_node, position) => mathEditRef.current(position),
        },
        blockOptions: {
          onClick: (_node, position) => mathEditRef.current(position),
        },
      }),
      ReusableTable,
      TableRow,
      TableHeader,
      TableCell,
      TaskList,
      TaskItem.configure({ nested: true }),
      Markdown.configure({ indentation: { style: 'space', size: 2 } }),
      AnnotationDecorations,
      shortcutExtension,
      MathInputRules.configure({
        onBlockCreated: (position) => mathEditRef.current?.(position),
      }),
    ],
    content: '',
    contentType: 'markdown',
    editorProps: {
      attributes: { class: 'editor', spellcheck: 'false' },
      handleDrop: (_view, event, _slice, moved) => {
        if (moved) return false
        const files = Array.from(event.dataTransfer?.files ?? []).filter((file) => file.type.startsWith('image/'))
        if (files.length === 0) return false
        event.preventDefault()
        for (const file of files) insertImageRef.current(file)
        return true
      },
      handlePaste: (_view, event) => {
        const files = Array.from(event.clipboardData?.files ?? []).filter((file) => file.type.startsWith('image/'))
        if (files.length === 0) return false
        event.preventDefault()
        for (const file of files) insertImageRef.current(file)
        return true
      },
      handleClick: (_view, _pos, event) => {
        const target = event.target as HTMLElement | null
        if (!target) return false
        const anchor = target.closest('a')
        if (anchor) {
          event.preventDefault()
          openLinkRef.current(anchor as HTMLAnchorElement)
          return true
        }
        const math = target.closest('.tiptap-mathematics-render, [data-type="inline-math"], [data-type="block-math"]')
        if (math) {
          // 公式由节点自己的 onClick 处理，这里只挡掉默认的选区行为
          event.preventDefault()
          return true
        }
        return false
      },
    },
    onUpdate: ({ editor: current, transaction }) => {
      // 载入文档的那次替换带 addToHistory:false，不算用户改动。
      if (transaction?.getMeta('addToHistory') === false) return
      // 脏 = 当前正文与保存基线不等：撤销回原样会自动变干净，不再要求必存一次
      if (baselineRef.current !== null) {
        const dirtyNow = contentRef.current().replace(/\r\n/g, '\n') !== baselineRef.current
        dirtyRef.current = dirtyNow
        setDirty(dirtyNow)
      }
      setOutline(extractOutline(current.state.doc))
      setStats(countText(current.state.doc.textContent))

      const body = repairCalloutMarkers(repairHtml(repairMath(repairFootnoteRefs(current.getMarkdown()))))
      const original = rawTextRef.current
      const draft = joinFrontmatter(
        frontmatterRef.current,
        joinFootnotes(body, footnotesRef.current),
        original ? leadingNewlines(splitFrontmatter(original).body) : undefined,
      )

      // 宿主文档不写 localStorage：大文件会撑爆配额，正文由宿主保管
      if (!hostModeRef.current) {
        try {
          localStorage.setItem(DOC_KEY, JSON.stringify({ text: draft, name: docNameRef.current, savedAt: Date.now() }))
        } catch {
          // 存储被禁用或配额满：只保留内存状态，别让一次写盘失败拖垮字数与大纲
        }
      }

      // 宿主文档：草稿交给宿主写到文档同目录的 .sidelight/drafts
      if (hostModeRef.current) {
        draftSuppressedRef.current = false
        scheduleHostDraftRef.current(draft.replace(/\r\n/g, '\n'))
      }

      // 有磁盘目录时，再往 .sidelight/drafts 写一份。
      const file = fileRef.current
      const space = workspaceRef.current
      if (file?.path && space && !space.demo) {
        if (draftTimerRef.current) clearTimeout(draftTimerRef.current)
        draftTimerRef.current = setTimeout(() => {
          void (async () => {
            const dir = await parentDirectory(space, file.path)
            if (dir) {
              const key = cacheKey(file.name)
              await writeCache(dir, 'draft', key, draft)
              const legacy = legacyKeyFor(file.name)
              if (legacy) await removeCache(dir, 'draft', legacy)
            }
          })()
        }, 800)
      }

      // 停笔 2 秒自动保存（默认开；有结构损失/输入法组合/模态时不动）
      scheduleAutoSaveRef.current()
    },
    onSelectionUpdate: ({ editor: current }) => {
      const { from, to } = current.state.selection
      const context = buildContext(readBlocks(current), from, to)
      setSelection({ chars: context.selection.length, from, to, source: context.source })
      setActiveOutline(activeOutlineId(extractOutline(current.state.doc), from))
      requestAnimationFrame(() => typewriterRef.current())
    },
  })

  // setContent 走 markdown 时会先转 HTML，行内 HTML 标签会被吞掉；先自己解析成 JSON 再设置。
  // 载入文档不进撤销栈，否则 Ctrl+Z 会把上一篇的正文拉回来。
  const setMarkdown = useCallback(
    (body: string) => {
      if (!editor) return
      // 含公式：先非阻塞预取 KaTeX，再同步 parse；不 await，避免首屏被惰性 chunk 卡住
      if (/\$\$|\$[^$\n]+\$/.test(body)) void ensureKatex().catch(() => undefined)
      const manager = editor.markdown ?? editor.storage.markdown?.manager
      if (!manager) {
        editor.commands.setContent(body, { contentType: 'markdown' })
        return
      }
      const parsed = manager.parse(escapeHtmlForParse(protectMathPairs(body)))
      const node = editor.schema.nodeFromJSON(parsed)
      const transaction = editor.state.tr
        .replaceWith(0, editor.state.doc.content.size, node.content)
        .setMeta('addToHistory', false)
      editor.view.dispatch(transaction)
      editor.commands.setTextSelection(0)
    },
    [editor],
  )

  /** 载入或整篇替换之后，字数、大纲、当前章节都要跟着刷新（这类替换不进 onUpdate） */
  const syncDocInfo = useCallback((current: Editor) => {
    const items = extractOutline(current.state.doc)
    setOutline(items)
    setStats(countText(current.state.doc.textContent))
    setActiveOutline(activeOutlineId(items, current.state.selection.from))
  }, [])

  useEffect(() => {
    if (!editor) return
    setMarkdown(initial.text)
    // 保存基线取「序列化后的正文」而不是原始文本：撤销回初始内容时必须刚好等于基线
    baselineRef.current = serializeDocument(editor, {
      frontmatter: initial.frontmatter,
      footnotes: initial.footnotes,
      original: initial.text,
    }).replace(/\r\n/g, '\n')
    saveTargetRef.current = null
    setDirty(false)
    const { from, to } = editor.state.selection
    const context = buildContext(readBlocks(editor), from, to)
    setSelection({ chars: context.selection.length, from, to, source: context.source })
    syncDocInfo(editor)
  }, [editor, initial.text, setMarkdown, syncDocInfo])

  useDialogFocus(draftPrompt !== null, draftDialogRef)

  /** 把 `/__doc` 的正文装进编辑器：宿主文档的唯一入口 */
  const applyHostPayload = useCallback(
    (data: HostDocResponse) => {
      if (!editor || typeof data.text !== 'string') return
      const writable = data.readOnly !== true
      hostModeRef.current = true
      const split = splitFrontmatter(data.text)
      const footnoteSplit = extractFootnotes(split.body)
      setFrontmatter(split.frontmatter)
      frontmatterRef.current = split.frontmatter
      setFootnotes(footnoteSplit.footnotes)
      footnotesRef.current = footnoteSplit.footnotes
      try {
        setMarkdown(footnoteSplit.body)
      } catch {
        // 结构异常（例如超深嵌套）也会在这里爆栈：给可见错误，不留一个空白页面
        setHostError('这个文件没法安全载入（解析失败，可能是结构异常或超过解析上限）。请用别的编辑器处理。')
        setMarkdown('')
        setDirty(false)
        return
      }
      baselineRef.current = data.text.replace(/\r\n/g, '\n')
      setOriginalText(data.text)
      rawTextRef.current = data.text
      eolRef.current = data.eol === 'crlf' ? 'crlf' : 'lf'
      // 载入即存在的结构损失才算基线；之后只拦仍命中同一结构位置的
      baselineLossesRef.current = baselineLosses(
        data.text,
        serializeDocument(editor, {
          frontmatter: split.frontmatter,
          footnotes: footnoteSplit.footnotes,
          original: data.text,
        }),
      )
      setRisks(lossLabels(baselineLossesRef.current))
      setDocName(data.fileName ?? docNameRef.current)
      docNameRef.current = data.fileName ?? docNameRef.current
      saveTargetRef.current = null
      setHostDoc({ writable, fileName: data.fileName ?? '未命名.md', mtime: Number(data.mtime ?? 0), ready: true })
      setReadOnly(!writable)
      setSaveWarned(false)
      setDraftShown(false)
      cancelAutoSaveRef.current()
      setAutoSaveState('idle')
      setAutoSavedAt(null)
      setDraftRestored(false)
      setDirty(false)
      setSaveError(null)
      setHostError(null)
      document.title = `${data.fileName ?? '未命名.md'} — Sidelight`
      // 旧版本把 readOnly 写进草稿；清掉这个字段，避免下次又当成只读
      try {
        const raw = localStorage.getItem(DOC_KEY)
        if (raw) {
          const parsed = JSON.parse(raw) as Record<string, unknown>
          if (parsed && 'readOnly' in parsed) {
            delete parsed.readOnly
            localStorage.setItem(DOC_KEY, JSON.stringify(parsed))
          }
        }
      } catch {
        // 草稿坏了不影响宿主正文
      }
      syncDocInfo(editor)
      setSourceRefCount(countReferenceDefinitions(data.text))
      if (hasReferenceDefinitions(data.text)) enterSourceFor(data.text, true)
      else setViewMode('edit')
      const { from, to } = editor.state.selection
      const context = buildContext(readBlocks(editor), from, to)
      setSelection({ chars: context.selection.length, from, to, source: context.source })
    },
    [editor, enterSourceFor, setMarkdown, syncDocInfo],
  )

  /**
   * 宿主文档：只从 `/__doc` 取正文与元数据，绝不再回退到 localStorage 旧草稿。
   * 浏览器里 dev server 的 SPA fallback 会返回 HTML，按普通浏览器启动。
   */
  useEffect(() => {
    if (!editor) return
    let cancelled = false

    /** 宿主信息取不到：显示错误、清空正文，绝不回退到 localStorage 旧草稿 */
    const hostUnavailable = (message: string) => {
      if (cancelled) return
      hostModeRef.current = true
      setHostError(message)
      setHostDoc(null)
      setMarkdown('')
      baselineRef.current = ''
      setOriginalText('')
      setDocName('未命名.md')
      docNameRef.current = '未命名.md'
      setFrontmatter('')
      frontmatterRef.current = ''
      setFootnotes('')
      footnotesRef.current = ''
      setRisks([])
      setDirty(false)
      setSaveError(null)
      document.title = 'Sidelight'
    }

    const loadHostDoc = async () => {
      let response: Response
      try {
        response = await fetch('/__doc', { cache: 'no-store' })
      } catch {
        hostUnavailable('无法从宿主读取文档信息（网络异常）。这次没有载入任何正文，也没有回退到旧草稿。')
        return
      }
      const contentType = response.headers.get('content-type') ?? ''
      if (contentType.includes('text/html')) return
      // 404 = 宿主没有当前文档（无 argv 启动）：按普通浏览器启动，恢复草稿/示例，不报错
      if (response.status === 404) return
      if (!response.ok) {
        hostUnavailable(`宿主返回 ${response.status}，这次没有载入正文，也没有回退到旧草稿。`)
        return
      }

      let data: HostDocResponse | null = null
      try {
        data = (await response.json()) as HostDocResponse
      } catch {
        hostUnavailable('宿主文档信息不是 JSON，这次没有载入正文，也没有回退到旧草稿。')
        return
      }
      if (cancelled) return
      if (!data || data.v !== 1 || data.ok === false || typeof data.text !== 'string') {
        hostUnavailable(
          `宿主没有提供可用的正文（${data?.error ?? (data?.v !== 1 ? '版本不符' : '格式不对')}），这次没有载入正文。`,
        )
        return
      }

      // 解析上限：marked 对超长单行会在 8 MB 左右爆栈，宁可明确报错也不留一个停在示例的页面
      if (data.text.length > MAX_HOST_DOC_LENGTH) {
        const megabytes = (data.text.length / (1024 * 1024)).toFixed(1)
        hostUnavailable(
          `文件过大，暂不支持（上限 ${MAX_HOST_DOC_LENGTH / (1024 * 1024)} MB）。这个文件约 ${megabytes} MB，这次没有载入正文；请用别的编辑器处理，或先用工具把它拆小。`,
        )
        return
      }

      // 宿主草稿：比原文件新就先问恢复/丢弃（404 = 没有草稿）
      try {
        const draftResponse = await fetch('/__draft', { cache: 'no-store' })
        if (draftResponse.ok) {
          const draftData = (await draftResponse.json()) as {
            v?: number
            exists?: boolean
            text?: string
            mtime?: number
          }
          if (
            draftData?.v === 1 &&
            draftData.exists === true &&
            typeof draftData.text === 'string' &&
            Number(draftData.mtime ?? 0) > Number(data.mtime ?? 0) &&
            draftData.text !== data.text
          ) {
            hostPayloadRef.current = data
            setHostDraftPrompt({ text: draftData.text, mtime: Number(draftData.mtime ?? 0) })
            return
          }
        }
      } catch {
        // 草稿接口不可用就算了，正文优先
      }

      // 冷启动：localStorage 里有未保存草稿且与宿主正文不同，先问一句再覆盖
      try {
        const raw = localStorage.getItem(DOC_KEY)
        if (raw) {
          const draft = JSON.parse(raw) as { text?: string; savedAt?: number; name?: string }
          if (typeof draft.text === 'string' && typeof draft.savedAt === 'number' && draft.savedAt > 0 && draft.text !== data.text) {
            hostPayloadRef.current = data
            setDraftPrompt({ fileName: data.fileName ?? '未命名.md', savedAt: draft.savedAt })
            return
          }
        }
      } catch {
        // 草稿解析失败就当没有草稿，继续载入宿主正文
      }

      applyHostPayload(data)
    }

    void loadHostDoc()
    return () => {
      cancelled = true
    }
  }, [editor, applyHostPayload, setMarkdown, syncDocInfo])

  /* ---------- 批注 ---------- */

  const runAnalysis = useCallback(async () => {
    if (!editor || analyzing) return
    const { from, to } = editor.state.selection
    const blocks = readBlocks(editor)
    const context = buildContext(blocks, from, to)
    if (!context.selection.trim()) {
      show('先选中一段文字，再按 Ctrl + Enter。')
      return
    }

    setNotice(null)
    setUnresolved(0)
    setAnalysisGoal('')
    setAnalyzing(true)

    const index = buildTextIndex(editor.state.doc)

    // 选区超长时切段，逐段分析；否则只分析一次。
    // 以前超长选区会被截成前 1500 字，看起来就像「只有开头有批注」。
    const chunks = to > from ? splitSelection(blocks, from, to) : []

    let goalSeen = false
    let completed = 0

    const controller = new AbortController()
    abortRef.current = controller

    /** 分析一段：送出去、收回来、落位置 */
    const runOne = async (payload: ContextPayload, rangeFrom: number, rangeTo: number) => {
      if (controller.signal.aborted || !payload.selection.trim()) return
      const start = offsetForPosition(index, rangeFrom)
      const windowEnd = Math.max(offsetForPosition(index, rangeTo), start)
      let cursor = start
      let buffer = ''

      const intake = (items: ParsedAnnotation[]) => {
        for (const item of items) {
          // 只认第一条意图说明；后面的忽略，也不阻塞批注
          if (item.kind === 'meta') {
            if (!goalSeen) {
              goalSeen = true
              setAnalysisGoal(item.note)
            }
            continue
          }
          const hit = resolveAnnotations([item], index, { start: cursor, end: windowEnd })
          if (hit.length === 0) {
            setUnresolved((count) => count + 1)
            continue
          }
          const [annotation] = hit
          cursor = Math.max(cursor, offsetForPosition(index, annotation.to))
          setAnnotations((previous) => [...previous, annotation])
        }
      }

      await streamAnnotations({
        settings,
        context: payload,
        signal: controller.signal,
        onDelta: (delta) => {
          buffer += delta
          const parsed = parseStream(buffer)
          buffer = parsed.rest
          intake(parsed.items)
        },
      })
      if (buffer.trim()) intake(parseStream(`${buffer}\n`).items)
      completed += 1
    }

    try {
      if (chunks.length > 0) {
        for (const chunk of chunks) {
          if (controller.signal.aborted) break
          await runOne(buildChunkContext(blocks, chunk), chunk.from, chunk.to)
        }
      } else {
        // 没有选区：按光标所在段落分析
        const hostBlock = blocks.find((block) => from >= block.from && from <= block.to) ?? blocks[0]
        await runOne(context, hostBlock?.from ?? from, hostBlock?.to ?? to)
      }

      if (!goalSeen && !controller.signal.aborted) {
        show('模型没按约定格式回，重试一次看看。')
      }
      if (chunks.length > 1 && completed > 1) {
        show(`长文分成 ${chunks.length} 段分析，已处理 ${completed} 段。`)
      }
    } catch (error) {
      const aborted = error instanceof DOMException && error.name === 'AbortError'
      if (!aborted) fail(error, () => analyzeRef.current())
    } finally {
      if (abortRef.current === controller) abortRef.current = null
      setAnalyzing(false)
    }
  }, [editor, settings, analyzing])

  useEffect(() => {
    analyzeRef.current = runAnalysis
  }, [runAnalysis])

  /** 联网核对：用搜索服务找可引用的出处，挂在批注上 */
  const verifySources = useCallback(
    async (annotation: Annotation) => {
      if (verifyingId) return
      const provider = settings.searchProvider
      const apiKey = settings.searchApiKey.trim()
      if (provider === 'off' || apiKey.length === 0) {
        show('先在设置里选一个搜索服务并填 Key。')
        return
      }

      setVerifyingId(annotation.id)
      try {
        const query = `${annotation.quote} ${annotation.note}`.replace(/\s+/g, ' ').trim().slice(0, 200)
        const sources = await searchWeb({ provider, apiKey }, query)
        setAnnotations((previous) =>
          previous.map((item) => (item.id === annotation.id ? { ...item, sources } : item)),
        )
        show(sources.length > 0 ? `找到 ${sources.length} 条出处` : '没有找到可用的出处')
      } catch (error) {
        setNotice({ text: messageOf(error), kind: 'error' })
      } finally {
        setVerifyingId(null)
      }
    },
    [settings.searchProvider, settings.searchApiKey, verifyingId],
  )

  /** 就一条批注追问：把原文、批注与已有对话一起发给模型 */
  const discuss = useCallback(
    async (annotation: Annotation, text: string) => {
      if (!editor || discussingId) return
      const question = text.trim()
      if (!question) return

      const id = annotation.id
      const history = annotation.thread ?? []
      setDiscussingId(id)
      setAnnotations((previous) =>
        previous.map((item) =>
          item.id === id
            ? {
                ...item,
                thread: [...history, { role: 'user', text: question }, { role: 'assistant', text: '' }],
              }
            : item,
        ),
      )

      const context = buildContext(readBlocks(editor), annotation.from, annotation.to)
      const messages: ChatMessage[] = [
        { role: 'system', content: '你在和作者讨论他文中的一处批注。回答要短、具体、直说；不确定就说不确定，不要编造。' },
        {
          role: 'user',
          content: `原文：「${annotation.quote}」\n批注：${annotation.note}\n\n上下文：\n${context.selection}`,
        },
        ...history.map((turn) => ({ role: turn.role, content: turn.text })),
        { role: 'user', content: question },
      ]

      const controller = new AbortController()
      chatAbortRef.current = controller
      try {
        await streamChat({
          settings,
          messages,
          signal: controller.signal,
          onDelta: (delta) => {
            setAnnotations((previous) =>
              previous.map((item) => {
                if (item.id !== id) return item
                const thread = [...(item.thread ?? [])]
                const last = thread[thread.length - 1]
                if (last && last.role === 'assistant') {
                  thread[thread.length - 1] = { ...last, text: last.text + delta }
                }
                return { ...item, thread }
              }),
            )
          },
        })
      } catch (error) {
        const aborted = error instanceof DOMException && error.name === 'AbortError'
        if (!aborted) fail(error)
      } finally {
        if (chatAbortRef.current === controller) chatAbortRef.current = null
        setDiscussingId(null)
      }
    },
    [editor, settings, discussingId],
  )

  const accept = useCallback(
    (annotation: Annotation) => {
      if (!editor || annotation.kind !== 'revision' || annotation.replacement === undefined) return

      // 正文可能被改过，先用引文核对位置；对不上就按引文重新找一个。
      const doc = editor.state.doc
      let range: { from: number; to: number } | null = null
      if (doc.textBetween(annotation.from, annotation.to, '\n') === annotation.quote) {
        range = { from: annotation.from, to: annotation.to }
      } else {
        range = findRange(buildTextIndex(doc), annotation.quote, 0)
      }

      if (!range) {
        show('这条批注指向的位置已经变了，请重新分析这一段。')
        return
      }

      editor.chain().focus().insertContentAt(range, annotation.replacement).run()
      acceptedRef.current.push({
        annotation: { ...annotation, from: range.from, to: range.to },
        from: range.from,
        to: range.to,
        replacement: annotation.replacement,
      })
      setAnnotations((previous) => previous.filter((item) => item.id !== annotation.id))
    },
    [editor],
  )

  const dismiss = useCallback((annotation: Annotation) => {
    setAnnotations((previous) => previous.filter((item) => item.id !== annotation.id))
  }, [])

  useEffect(() => {
    if (!editor) return
    const onTransaction = ({ transaction }: { transaction: Transaction }) => {
      if (!transaction.docChanged) return
      // 整篇替换（载入文档、源码切回）会把所有位置映射到开头，别拿它平移批注；
      // 这类替换由调用方按引文重新定位。
      if (transaction.getMeta('addToHistory') === false) return

      // 先按事务映射平移现有批注
      setAnnotations((previous) => {
        if (previous.length === 0) return previous
        let changed = false
        const next: Annotation[] = []
        for (const annotation of previous) {
          const from = transaction.mapping.map(annotation.from, 1)
          const to = transaction.mapping.map(annotation.to, -1)
          if (to <= from) {
            changed = true
            continue
          }
          if (from !== annotation.from || to !== annotation.to) changed = true
          next.push(from === annotation.from && to === annotation.to ? annotation : { ...annotation, from, to })
        }
        return changed ? next : previous
      })

      // 撤销采纳：改写文字不在了，就把那条建议放回页边（位置是撤销后的原位置，不能再被映射）。
      if (isHistoryTransaction(transaction) && acceptedRef.current.length > 0) {
        const doc = transaction.doc
        const restored: Annotation[] = []
        acceptedRef.current = acceptedRef.current.filter((item) => {
          const end = Math.min(item.from + item.replacement.length, doc.content.size)
          if (doc.textBetween(item.from, end, '\n') === item.replacement) return true
          restored.push(item.annotation)
          return false
        })
        if (restored.length > 0) setAnnotations((previous) => [...previous, ...restored])
      }
    }
    editor.on('transaction', onTransaction)
    return () => {
      editor.off('transaction', onTransaction)
    }
  }, [editor])

  useEffect(() => {
    if (editor) renderAnnotations(editor, annotations, activeId)
  }, [editor, annotations, activeId])

  // 批注写进 .sidelight/annotations，换文档或刷新后还能回来
  useEffect(() => {
    const timer = setTimeout(() => {
      void (async () => {
        const dir = await cacheDirFor()
        const file = fileRef.current
        if (!dir || !file) return
        if (annotations.length === 0) {
          await removeCache(dir, 'annotations', cacheKey(file.name))
          return
        }
        const key = cacheKey(file.name)
      await writeCache(dir, 'annotations', key, JSON.stringify(annotations))
      const legacy = legacyKeyFor(file.name)
      if (legacy) await removeCache(dir, 'annotations', legacy)
      })()
    }, 600)
    return () => clearTimeout(timer)
  }, [annotations, cacheDirFor])

  useEffect(() => {
    if (editor) renderFocus(editor, focusMode ? blockPosOf(editor) : null)
  }, [editor, focusMode, tick])

  /* ---------- 字号与查找 ---------- */

  useEffect(() => {
    document.documentElement.style.setProperty('--editor-size', `${settings.fontSize}px`)
  }, [settings.fontSize])

  const setFontSize = useCallback((value: number) => {
    setSettings((current) => {
      const next = { ...current, fontSize: clampFontSize(value) }
      saveSettings(next)
      return next
    })
  }, [])

  useEffect(() => {
    if (!editor) return
    if (!findOpen || query.trim().length === 0) {
      setMatches([])
      return
    }
    const index = buildTextIndex(editor.state.doc)
    const found = findAll(index, query, { caseSensitive: false })
    setMatches(found)
    setMatchIndex((current) => (found.length === 0 ? 0 : Math.min(current, found.length - 1)))
  }, [editor, findOpen, query, tick])

  useEffect(() => {
    if (editor) renderFind(editor, findOpen ? matches : [], matchIndex)
  }, [editor, findOpen, matches, matchIndex])

  const goToMatch = useCallback(
    (index: number) => {
      if (!editor || matches.length === 0) return
      const safe = Math.max(0, Math.min(index, matches.length - 1))
      const match = matches[safe]
      // 不抢焦点：焦点留在查找框里，才能连续按 Enter 跳下一个。
      editor.commands.setTextSelection({ from: match.from, to: match.to })
      editor.commands.scrollIntoView()
      setMatchIndex(safe)
    },
    [editor, matches],
  )

  const nextMatch = useCallback(() => {
    if (matches.length === 0) return
    goToMatch((matchIndex + 1) % matches.length)
  }, [goToMatch, matchIndex, matches.length])

  const prevMatch = useCallback(() => {
    if (matches.length === 0) return
    goToMatch((matchIndex - 1 + matches.length) % matches.length)
  }, [goToMatch, matchIndex, matches.length])

  const replaceCurrent = useCallback(() => {
    if (!editor || matches.length === 0) return
    const match = matches[matchIndex]
    // 批注位置由事务映射自动跟随；也不抢焦点，避免打断连续查找
    editor.commands.insertContentAt({ from: match.from, to: match.to }, replacement)
  }, [editor, matches, matchIndex, replacement])

  const replaceEvery = useCallback(() => {
    if (!editor || matches.length === 0) return
    let transaction = editor.state.tr
    for (let index = matches.length - 1; index >= 0; index -= 1) {
      const match = matches[index]
      transaction =
        replacement.length > 0
          ? transaction.insertText(replacement, match.from, match.to)
          : transaction.delete(match.from, match.to)
    }
    editor.view.dispatch(transaction)
    editor.commands.focus()
    setAnnotations([])
  }, [editor, matches, replacement])

  /* ---------- 滚动与页边定位 ---------- */

  const typewriterScroll = useCallback(() => {
    if (!editor || !typewriterMode) return
    const scroller = scrollRef.current
    if (!scroller) return
    try {
      const coords = editor.view.coordsAtPos(editor.state.selection.head)
      const rect = scroller.getBoundingClientRect()
      const delta = coords.top - (rect.top + rect.height * 0.45)
      if (Math.abs(delta) > 24) scroller.scrollTop += delta
    } catch {
      // 位置越界时不动
    }
  }, [editor, typewriterMode])

  // 普通提示六秒后自动消失；错误与 persist 提示留着，等用户处理
  useEffect(() => {
    if (!notice || notice.kind === 'error' || notice.persist) return
    const timer = setTimeout(() => setNotice(null), notice.ttl ?? 6000)
    return () => clearTimeout(timer)
  }, [notice])

  useEffect(() => {
    typewriterRef.current = typewriterScroll
  }, [typewriterScroll])

  // 源码模式：脏按保存基线算；改动仍要写草稿，否则退出前保存会丢
  useEffect(() => {
    if (!sourceMode) return
    if (sourceText !== sourceBaselineRef.current) sourceOriginalEntryRef.current = false
    if (sourceOriginalEntryRef.current && sourceText === sourceBaselineRef.current) {
      setDirty(false)
    } else if (baselineRef.current !== null) {
      setDirty(sourceText.replace(/\r\n/g, '\n') !== baselineRef.current)
    }
    if (sourceText === sourceBaselineRef.current) return
    try {
      localStorage.setItem(DOC_KEY, JSON.stringify({ text: sourceText, name: docNameRef.current, savedAt: Date.now() }))
    } catch {
      // 存储不可用时只保留内存
    }
  }, [sourceMode, sourceText])

  useEffect(() => {
    if (!editor) return
    let frame = 0
    const bump = () => {
      if (frame) return
      frame = requestAnimationFrame(() => {
        frame = 0
        setTick((value) => value + 1)
      })
    }
    editor.on('update', bump)
    editor.on('selectionUpdate', bump)
    const scroll = scrollRef.current
    scroll?.addEventListener('scroll', bump, { passive: true })
    window.addEventListener('resize', bump)
    return () => {
      editor.off('update', bump)
      editor.off('selectionUpdate', bump)
      scroll?.removeEventListener('scroll', bump)
      window.removeEventListener('resize', bump)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [editor])

  useLayoutEffect(() => {
    if (!editor || sourceMode) return
    const rail = railRef.current
    if (!rail) return

    const railRect = rail.getBoundingClientRect()
    const docSize = editor.state.doc.content.size
    let floor = Number.NEGATIVE_INFINITY
    const next: Record<string, number> = {}

    for (const annotation of annotations.filter((item) => item.status === 'pending')) {
      const position = Math.min(Math.max(annotation.from, 0), Math.max(docSize - 1, 0))
      const height = cardRefs.current.get(annotation.id)?.offsetHeight ?? 96
      let natural = floor + 12
      try {
        natural = editor.view.coordsAtPos(position).top - railRect.top
      } catch {
        natural = floor + 12
      }
      const top = Math.max(natural, floor + 12, 40)
      next[annotation.id] = Math.round(top)
      floor = top + height
    }

    setTops((previous) => (JSON.stringify(previous) === JSON.stringify(next) ? previous : next))

    if (selection.to > selection.from) {
      try {
        const coords = editor.view.coordsAtPos(selection.to)
        setBubble({
          top: coords.bottom + 8,
          left: Math.min(coords.right + 8, window.innerWidth - 96),
        })
      } catch {
        setBubble(null)
      }
    } else {
      setBubble(null)
    }
  }, [annotations, editor, selection, sourceMode, tick])

  /* ---------- 文件 ---------- */

  /** 打开文档时把上次的批注从 .sidelight/annotations 恢复回来 */
  const restoreAnnotationsFor = useCallback(
    async (file: WorkspaceFileNode | null) => {
      if (!editor || !file?.path) return
      const space = workspaceRef.current
      if (!space || space.demo) return
      const dir = await parentDirectory(space, file.path)
      if (!dir) return
      const raw = await readCache(dir, 'annotations', cacheKey(file.name), legacyKeyFor(file.name))
      if (!raw) return

      try {
        const saved = JSON.parse(raw) as Annotation[]
        const index = buildTextIndex(editor.state.doc)
        const restored: Annotation[] = []
        for (const item of saved) {
          if (!item?.quote) continue
          const hit = findRange(index, item.quote, 0)
          if (!hit) continue
          restored.push({ ...item, from: hit.from, to: hit.to })
        }
        if (restored.length > 0) {
          setAnnotations(restored)
          show(`从 .sidelight 恢复了 ${restored.length} 条批注`)
        }
      } catch {
        // 缓存坏了就当没有
      }
    },
    [editor],
  )

  const loadIntoEditor = useCallback(
    (text: string, name: string, file: WorkspaceFileNode | null) => {
      if (!editor) return
      const split = splitFrontmatter(text)
      const footnoteSplit = extractFootnotes(split.body)
      eolRef.current = text.includes('\r\n') ? 'crlf' : 'lf'
      // 换了一篇文档：旧句柄不能跟过来
      saveTargetRef.current = null
      setFrontmatter(split.frontmatter)
      frontmatterRef.current = split.frontmatter
      setFootnotes(footnoteSplit.footnotes)
      footnotesRef.current = footnoteSplit.footnotes
      setOriginalText(text.length > 0 ? text : null)
      rawTextRef.current = text.length > 0 ? text : null
      setSaveWarned(false)
      setDraftShown(false)
      setAnalysisGoal('')
      // 切换文档时掐断正在跑的批注请求，结果不再落到新文档上
      abortRef.current?.abort()
      setAnalyzing(false)
      setMarkdown(footnoteSplit.body)
      // 载入即存在的结构损失才算基线；之后只拦仍命中同一结构位置的
      baselineLossesRef.current =
        text.length > 0
          ? baselineLosses(
              text,
              serializeDocument(editor, {
                frontmatter: split.frontmatter,
                footnotes: footnoteSplit.footnotes,
                original: text,
              }),
            )
          : []
      setRisks(lossLabels(baselineLossesRef.current))
      // 基线用序列化结果：撤销回到载入态时应当刚好等于它
      baselineRef.current = serializeDocument(editor, {
        frontmatter: split.frontmatter,
        footnotes: footnoteSplit.footnotes,
        original: text,
      }).replace(/\r\n/g, '\n')
      setDocName(name)
      setActiveFile(file)
      cancelAutoSaveRef.current()
      setAutoSaveState('idle')
      setAutoSavedAt(null)
      setDraftRestored(false)
      draftGenerationRef.current += 1
      draftSuppressedRef.current = false
      if (draftTimerRef.current) {
        clearTimeout(draftTimerRef.current)
        draftTimerRef.current = null
      }
      fileMtimeRef.current = 0
      if (file?.handle) {
        void file.handle.getFile().then((blob) => {
          fileMtimeRef.current = blob.lastModified
        })
      }
      // 换成普通文档：宿主模式结束，之后保存不再写回 argv 文件
      setHostDoc(null)
      hostModeRef.current = false
      setSaveError(null)
      setReadOnly(false)
      setAnnotations([])
      setUnresolved(0)
      setNotice(null)
      setDirty(false)
      setSourceRefCount(countReferenceDefinitions(text))
      if (text.length > 0 && hasReferenceDefinitions(text)) enterSourceFor(text, true)
      else setViewMode('edit')
      localStorage.setItem(DOC_KEY, JSON.stringify({ text, name, savedAt: Date.now() }))
      syncDocInfo(editor)
      void restoreAnnotationsFor(file)
    },
    [editor, enterSourceFor, setMarkdown, restoreAnnotationsFor, syncDocInfo],
  )

  // 切换文档前先拦住未保存的改动
  const requestLoad = useCallback(
    (text: string, name: string, file: WorkspaceFileNode | null) => {
      void (async () => {
        const epoch = ++loadEpochRef.current
        // 宿主写回还在飞：先等它结束（或超时），别让旧回包改到新文档
        await waitForHostSave()
        if (epoch !== loadEpochRef.current) return
        if (dirty) {
          setPendingSwitch({ text, name, file })
          return
        }
        loadIntoEditor(text, name, file)
      })()
    },
    [dirty, loadIntoEditor, waitForHostSave],
  )

  const openFolder = useCallback(async () => {
    try {
      const next = await pickWorkspace()
      if (next) {
        setWorkspace(next)
        setSidebarTab('files')
        setNotice(null)
        if (next.rootHandle && !next.demo) {
          void import('./lib/trash.ts').then(({ ensureTrashDir }) =>
            ensureTrashDir(next.rootHandle!).then((result) => {
              setTrashReason(result.dir ? null : (result.error ?? '回收站不可用。'))
            }),
          )
        } else {
          setTrashReason(null)
        }
      }
    } catch (error) {
      setNotice({ text: messageOf(error), kind: 'error' })
    }
  }, [])

  const openSingleFile = useCallback(async () => {
    try {
      const picked = await pickFile()
      if (!picked) return
      requestLoad(picked.text, picked.name, {
        kind: 'file',
        name: picked.name,
        path: picked.name,
        handle: picked.handle,
      })
    } catch (error) {
      setNotice({ text: messageOf(error), kind: 'error' })
    }
  }, [requestLoad])

  const openWorkspaceFile = useCallback(
    async (file: WorkspaceFileNode) => {
      try {
        const text = await readNode(file)
        requestLoad(text, file.name, file)
      } catch (error) {
        setNotice({ text: messageOf(error), kind: 'error' })
      }
    },
    [requestLoad],
  )

  /** 刷新文件树：重读目录、按 path 重绑句柄；找不到就清掉可写句柄 */
  const refreshTree = useCallback(
    async (options?: { skipPath?: string }): Promise<Workspace | null> => {
    const space = workspaceRef.current
    if (!space || space.demo || !space.rootHandle) return null
    if (refreshingRef.current) return null
    refreshingRef.current = true
    setTreeRefreshing(true)
    cancelAutoSaveRef.current()
    try {
      const next = await refreshWorkspace(space)
      if (!next) {
        setNotice({ text: '读不到文件夹了。请点「打开其他文件夹」重新授权。', kind: 'error' })
        return null
      }
      const before = flattenFiles(space.root)
      const after = flattenFiles(next.root)
      const afterByPath = new Map(after.map((file) => [file.path, file]))
      setWorkspace(next)
      let missingName: string | null = null
      if (activeFile && !deletingRef.current) {
        const rebound = afterByPath.get(activeFile.path) ?? (options?.skipPath ? afterByPath.get(options.skipPath) : undefined)
        if (rebound) {
          setActiveFile(rebound)
          saveTargetRef.current = rebound.handle ? { handle: rebound.handle, name: rebound.name } : null
        } else {
          setActiveFile(null)
          saveTargetRef.current = null
          missingName = activeFile.name
        }
      }
      const added = after.filter((file) => !before.some((old) => old.path === file.path)).length
      const gone = before.filter((file) => !afterByPath.has(file.path)).length
      if (added > 0 || gone > 0) show(`已刷新：新增 ${added} 个，消失 ${gone} 个`)
      if (missingName) {
        setNotice({
          text: `「${missingName}」已不在磁盘上（可能已删除、改名或移走），保存只能另存为。`,
          kind: 'error',
        })
      }
      return next
    } finally {
      refreshingRef.current = false
      setTreeRefreshing(false)
    }
  }, [activeFile, show])

  /** 重命名提交前：等在飞保存、停草稿计时、递增两套 generation */
  const prepareRename = useCallback(async () => {
    await waitForCommit()
    deletingRef.current = true
    autoSaveGenerationRef.current += 1
    draftGenerationRef.current += 1
    cancelAutoSaveRef.current()
    if (draftTimerRef.current) {
      clearTimeout(draftTimerRef.current)
      draftTimerRef.current = null
    }
    deletingRef.current = false
  }, [waitForCommit])

  /** 改名成功后一次性同步身份、保存目标、标题、本地草稿名与缓存键 */
  const handleRenamedFile = useCallback(
    async (oldFile: WorkspaceFileNode, newName: string) => {
      const cut = oldFile.path.lastIndexOf('/')
      const newPath = cut >= 0 ? `${oldFile.path.slice(0, cut)}/${newName}` : newName
      const wasActive = activeFile?.path === oldFile.path
      loadEpochRef.current += 1
      if (wasActive) {
        const renamed: WorkspaceFileNode = { ...oldFile, name: newName, path: newPath }
        setActiveFile(renamed)
        fileRef.current = renamed
        docNameRef.current = newName
        setDocName(newName)
        saveTargetRef.current = renamed.handle ? { handle: renamed.handle, name: newName } : null
        document.title = `${newName} — Sidelight`
        try {
          const raw = localStorage.getItem(DOC_KEY)
          if (raw) {
            const parsed = JSON.parse(raw) as Record<string, unknown>
            parsed.name = newName
            localStorage.setItem(DOC_KEY, JSON.stringify(parsed))
          }
        } catch {
          // 草稿名同步失败不影响磁盘改名
        }
      }

      const space = workspaceRef.current
      if (space && !space.demo && oldFile.name !== newName && cacheKey(oldFile.name) !== cacheKey(newName)) {
        try {
          const dir = await parentDirectory(space, oldFile.path)
          if (dir) {
            for (const kind of ['draft', 'annotations'] as const) {
              const legacy = legacyKeyFor(oldFile.name)
              const text = await readCache(dir, kind, cacheKey(oldFile.name), legacy)
              if (text === null) continue
              const written = await writeCache(dir, kind, cacheKey(newName), text)
              if (written) {
                await removeCache(dir, kind, cacheKey(oldFile.name))
                if (legacy) await removeCache(dir, kind, legacy)
              } else {
                setNotice({
                  text: '旧草稿/批注仍在，未自动迁移（可在 .sidelight 手动处理）。',
                  kind: 'error',
                })
              }
            }
          }
        } catch {
          setNotice({ text: '缓存迁移失败，旧草稿/批注仍在。', kind: 'error' })
        }
      }

      await refreshTree({ skipPath: newPath })
    },
    [activeFile, refreshTree],
  )

  const createFolder = useCallback(async () => {
    const space = workspaceRef.current
    const root = space && !space.demo ? space.rootHandle : null
    if (!root) return
    const input = window.prompt('新建文件夹的名字')
    const name = (input ?? '').trim()
    if (!name) return
    try {
      try {
        await root.getDirectoryHandle(name, { create: false })
        setNotice({ text: '已存在同名文件夹。', kind: 'error' })
        return
      } catch (error) {
        if (!(error instanceof DOMException && error.name === 'NotFoundError')) throw error
      }
      await root.getDirectoryHandle(name, { create: true })
      await refreshTree()
      show(`已新建文件夹 ${name}`)
    } catch (error) {
      setNotice({ text: `新建文件夹失败：${reasonOf(error)}。`, kind: 'error' })
    }
  }, [refreshTree, show])

  /** 删除文件到 .sidelight/trash：删除前停写、等保存、清缓存，成功后刷新与撤销 */
  const removeFile = useCallback(
    async (node: WorkspaceFileNode) => {
      const space = workspaceRef.current
      const root = space && !space.demo ? space.rootHandle : null
      if (!root) return
      deletingRef.current = true
      autoSaveGenerationRef.current += 1
      cancelAutoSaveRef.current()
      if (draftTimerRef.current) {
        clearTimeout(draftTimerRef.current)
        draftTimerRef.current = null
      }
      setPendingConfirm(null)
      setPendingSwitch(null)
      try {
        await waitForCommit()
        const { deleteFileToTrash } = await import('./lib/trash.ts')
        const wasActive = activeFile?.path === node.path
        const files = flattenFiles(workspaceRef.current?.root ?? null)
        const index = files.findIndex((file) => file.path === node.path)
        const nextFile = files[index + 1] ?? files[index - 1] ?? null
        const result = await deleteFileToTrash(root, node)
        if (!result.ok) {
          setNotice({ text: result.error ?? '移到回收站失败。', kind: 'error' })
          return
        }
        try {
          const dir = await parentDirectory(space!, node.path)
          if (dir) {
            await removeCache(dir, 'draft', cacheKey(node.name))
            await removeCache(dir, 'annotations', cacheKey(node.name))
          }
        } catch {
          // 缓存清不掉不影响删除结果
        }
        const fresh = await refreshTree()
        if (wasActive) {
          saveTargetRef.current = null
          setActiveFile(null)
          setDirty(false)
          const rebound = fresh && nextFile ? flattenFiles(fresh.root).find((file) => file.path === nextFile.path) : null
          if (rebound) {
            const text = await readNode(rebound)
            loadIntoEditor(text, rebound.name, rebound)
          } else {
            loadIntoEditor('', '未命名.md', null)
          }
        }
        const trashFile = result.trashName
        setNotice({
          text: `已移到回收站：${node.name}`,
          kind: 'info',
          persist: true,
          action: trashFile
            ? {
                label: '撤销',
                onClick: () => {
                  void (async () => {
                    const { restoreFromTrash } = await import('./lib/trash.ts')
                    const restored = await restoreFromTrash(root, trashFile, node.path)
                    if (restored.ok) {
                      await refreshTree()
                      show(`已恢复 ${node.name}`)
                    } else {
                      setNotice({ text: restored.error ?? '恢复失败。', kind: 'error' })
                    }
                  })()
                },
              }
            : undefined,
        })
      } finally {
        deletingRef.current = false
      }
    },
    [activeFile, loadIntoEditor, refreshTree, show, waitForCommit],
  )

  const nextNewName = useCallback((space: Workspace): string => {
    const used = new Set<string>()
    if (space.root?.kind === 'dir') for (const child of space.root.children) used.add(child.name)
    if (!used.has('未命名.md')) return '未命名.md'
    let index = 2
    while (used.has(`未命名 ${index}.md`)) index += 1
    return `未命名 ${index}.md`
  }, [])

  /** 新建：有真实文件夹就建空文件并刷新树快照；示例/空态只换内存文档 */
  const startNewDocument = useCallback(async () => {
    await waitForHostSave()
    const space = workspaceRef.current
    const root = space && !space.demo ? space.rootHandle : null
    if (!space || space.demo || !root || space.root?.kind !== 'dir') {
      loadIntoEditor('', '未命名.md', null)
      // 纯键盘流程：新建后直接能打字
      requestAnimationFrame(() => document.querySelector<HTMLElement>('.ProseMirror')?.focus())
      return
    }
    try {
      const name = nextNewName(space)
      const handle = await root.getFileHandle(name, { create: true })
      const file: WorkspaceFileNode = { kind: 'file', name, path: name, handle }
      loadIntoEditor('', name, file)
      await refreshTree()
      show(`已新建 ${name}`)
      // 纯键盘流程：新建后直接能打字
      requestAnimationFrame(() => document.querySelector<HTMLElement>('.ProseMirror')?.focus())
    } catch (error) {
      setNotice({ text: `新建失败：${reasonOf(error)}。`, kind: 'error' })
    }
  }, [loadIntoEditor, nextNewName, refreshTree, show])

  /** 新建前先走同一套未保存确认；取消则什么都不做 */
  const newDocument = useCallback(() => {
    if (dirty) {
      setPendingSwitch({ text: '', name: '未命名.md', file: null, after: () => void startNewDocument() })
      return
    }
    void startNewDocument()
  }, [dirty, startNewDocument])

  /** 冷启动草稿确认：保留草稿 → 不载入宿主文件、之后保存走另存为 */
  const keepDraft = useCallback(() => {
    setDraftPrompt(null)
    hostPayloadRef.current = null
    hostModeRef.current = false
    setHostDoc(null)
    setNotice({ text: '已保留本地草稿；宿主文件没有载入，保存会走「另存为」。', kind: 'info', persist: true })
  }, [])

  /** 冷启动草稿确认：继续打开 → 载入宿主正文 */
  const openHostAnyway = useCallback(() => {
    const payload = hostPayloadRef.current
    hostPayloadRef.current = null
    setDraftPrompt(null)
    if (payload) applyHostPayload(payload)
  }, [applyHostPayload])

  /** Blob + a.download；失败就抛给调用方，让用户看到「保存 / 导出失败」 */
  const saveBlob = useCallback((name: string, content: string, type: string) => {
    const blob = new Blob([content], { type })
    const url = URL.createObjectURL(blob)
    try {
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = name
      anchor.click()
    } finally {
      URL.revokeObjectURL(url)
    }
  }, [])

  /** 保存成功后的统一收尾：新句柄就是文档身份，基线更新，提示留下不消失 */
  const finishSaved = useCallback(
    (name: string, target: FileWriteTarget, normalized: string, withEol: string, keepLosses = false) => {
      const oldName = docNameRef.current
      saveTargetRef.current = target
      baselineRef.current = normalized
      docNameRef.current = name
      setDocName(name)
      setActiveFile((previous) => {
        const cut = previous?.path ? previous.path.lastIndexOf('/') : -1
        return {
          kind: 'file',
          name,
          path: cut >= 0 ? `${previous!.path.slice(0, cut)}/${name}` : name,
          handle: target.handle,
        }
      })
      setOriginalText(withEol)
      rawTextRef.current = withEol
      // 刚写入的内容就是新基线：不再有已知结构损失
      // 源码模式保存的是原文：保留载入时的结构损失基线，切回富文本后仍要拦
      if (!keepLosses) {
        baselineLossesRef.current = []
        setRisks([])
      }
      setDraftRestored(false)
      setDraftShown(false)
      setDirty(false)
      // 另存为之后有了新落点，只读横幅可以撤掉
      setReadOnly(false)
      // 另存为成功：告诉宿主忘掉 argv 路径，之后 Ctrl+S 走句柄/另存为
      if (hostDoc) {
        void clearHostDraftRef.current()
        window.chrome?.webview?.postMessage({ v: 1, type: 'forget' })
        hostModeRef.current = false
        setHostDoc(null)
        document.title = `${name} — Sidelight`
      }
      autoFailCountRef.current = 0
      setAutoSaveState('idle')
      setNotice({
        text: `已保存 ${name}`,
        kind: 'info',
        persist: true,
        action: { label: '另存为', onClick: () => saveAsCopyRef.current() },
      })
      localStorage.setItem(DOC_KEY, JSON.stringify({ text: withEol, name, savedAt: Date.now() }))
      // 另存为之后旧名字的草稿留着会误导恢复，两个名字都清一遍
      void (async () => {
        const dir = await cacheDirFor()
        if (!dir) return
        await removeCache(dir, 'draft', cacheKey(oldName))
        await removeCache(dir, 'draft', cacheKey(name))
      })()
    },
    [cacheDirFor, hostDoc],
  )

  /** 真正写盘：有句柄写句柄，没有就弹保存位置；调用前已经过差异门 */
  const performCommit = useCallback(
    async (normalized: string, withEol: string, keepLosses = false) => {
      setDraftShown(false)
      const generation = autoSaveGenerationRef.current
      const currentHandle = activeFile?.handle ?? null
      const target =
        saveTargetRef.current ??
        (activeFile?.handle ? { handle: activeFile.handle, name: activeFile.name } : null)

      try {
        if (target) {
          // 删除/刷新开始后旧句柄不能再写，否则会「复活」已删文件
          if (
            deletingRef.current ||
            refreshingRef.current ||
            generation !== autoSaveGenerationRef.current ||
            (currentHandle !== null && target.handle !== currentHandle)
          ) {
            return false
          }
          const writing = writeNode({ kind: 'file', name: target.name, path: activeFile?.path ?? target.name, handle: target.handle }, withEol)
          performingCommitRef.current = writing
          try {
            await writing
          } finally {
            performingCommitRef.current = null
          }
          // 写回与删除交错：删除已经发生就把刚写回的文件再删一次
          if (deletingRef.current || refreshingRef.current) {
            try {
              const root = workspaceRef.current?.rootHandle
              if (root && activeFile?.path) {
                let parent = root
                for (const part of activeFile.path.split('/').slice(0, -1)) {
                  parent = await parent.getDirectoryHandle(part)
                }
                await parent.removeEntry(target.name)
              }
            } catch {
              // 已经不存在就算了
            }
            return false
          }
          finishSaved(target.name, target, normalized, withEol, keepLosses)
          return true
        }

        const result = await saveAsFile(docName, withEol)
        if (result === null) {
          // 用户取消：不留「已保存」的假象
          setNotice({ text: '已取消保存。', kind: 'info' })
          return false
        }
        if (result === 'unsupported') {
          saveBlob(docName, withEol, 'text/markdown;charset=utf-8')
          setNotice({
            text: '无法确认落点：已交给浏览器下载。要写回文件，请用「另存为」选择位置。',
            kind: 'info',
            persist: true,
            action: { label: '另存为', onClick: () => saveAsCopyRef.current() },
          })
          return false
        }
        finishSaved(result.name, result, normalized, withEol)
        return true
      } catch (error) {
        setNotice({ text: `保存失败：${reasonOf(error)}。改动还在，可以再试一次。`, kind: 'error' })
        return false
      }
    },
    [activeFile, docName, finishSaved, saveBlob],
  )

  const currentMarkdown = useCallback(() => {
    if (sourceMode) return sourceText
    if (!editor) return ''
    const original = rawTextRef.current ?? originalText
    return serializeDocument(editor, {
      frontmatter: frontmatterRef.current,
      footnotes: footnotesRef.current,
      original,
    })
  }, [editor, sourceMode, sourceText, originalText])

  // onUpdate 里拿不到这个 useCallback（声明在后面），用 ref 转一手
  useEffect(() => {
    contentRef.current = currentMarkdown
  }, [currentMarkdown])

  /** 保存前统一准备：LF 给宿主，EOL 给文件；末尾换行跟随原文（保住字节） */
  const prepareSave = useCallback(() => {
    let normalized = currentMarkdown().replace(/\r\n/g, '\n')
    if (originalText !== null && originalText.endsWith('\n') && !normalized.endsWith('\n')) normalized += '\n'
    const withEol = eolRef.current === 'crlf' ? normalized.replace(/\n/g, '\r\n') : normalized
    return { normalized, withEol }
  }, [currentMarkdown, originalText])

  /** 另存为的实际写入（调用前已过差异门） */
  const performSaveAs = useCallback(
    async (normalized: string, withEol: string) => {
      try {
        const result = await saveAsFile(docName, withEol)
        if (result === null) {
          setNotice({ text: '已取消保存。', kind: 'info' })
          return
        }
        if (result === 'unsupported') {
          saveBlob(docName, withEol, 'text/markdown;charset=utf-8')
          setNotice({
            text: '无法确认落点：已交给浏览器下载。要写回文件，请换一个支持选择保存位置的浏览器。',
            kind: 'info',
            persist: true,
          })
          return
        }
        finishSaved(result.name, result, normalized, withEol)
      } catch (error) {
        setNotice({ text: `保存失败：${reasonOf(error)}。改动还在，可以再试一次。`, kind: 'error' })
      }
    },
    [docName, finishSaved, saveBlob],
  )

  const performSwitch = useCallback(() => {
    const next = pendingSwitch
    setPendingSwitch(null)
    if (!next) return
    if (next.after) {
      next.after()
      return
    }
    loadIntoEditor(next.text, next.name, next.file)
  }, [pendingSwitch, loadIntoEditor])

  const runSave = useCallback(
    async (pending: PendingConfirm) => {
      if (pending.target === 'host') {
        // 宿主只收 LF 归一化文本
        sendHostSaveRef.current(pending.normalized)
        return
      }
      if (pending.target === 'saveAs') {
        await performSaveAs(pending.normalized, pending.withEol)
        return
      }
      if (pending.target === 'switch' && hostDoc?.ready && hostDoc.writable) {
        // 宿主文档：先写回，save-result ok 后再切换/打开最近项
        hostSwitchPendingRef.current = true
        sendHostSaveRef.current(pending.normalized)
        return
      }
      const ok = await performCommit(pending.normalized, pending.withEol, sourceMode)
      if (!ok) return
      if (pending.target === 'switch') performSwitch()
      else pending.after?.()
    },
    [hostDoc, performSaveAs, performCommit, performSwitch, sourceMode],
  )

  /** 四条保存路径的唯一入口：先过差异门，确认后才真正写 */
  const requestSave = useCallback(
    (target: SaveTarget, after?: () => void) => {
      if (!editor) return
      cancelAutoSaveRef.current()
      let goal = target
      if (goal === 'host' && (hostDoc === null || !hostDoc.ready)) return
      if (goal === 'host' && hostDoc && !hostDoc.writable) goal = 'saveAs'
      if (goal === 'host' && !dirty) {
        setNotice({ text: '没有改动，未写入。', kind: 'info', ttl: 1500 })
        return
      }
      if (goal === 'switch' && after) {
        // 脏文档点最近项：走统一的「保存并切换」确认，after 只挂在这条新目标上
        setPendingSwitch({ text: '', name: '最近打开', file: null, after })
        return
      }
      if (goal === 'switch' && !dirty) {
        performSwitch()
        return
      }

      const { normalized, withEol } = prepareSave()
      const losses = originalText !== null ? activeLosses(originalText, normalized, baselineLossesRef.current) : []
      if (losses.length > 0 && !saveWarned) {
        setPendingConfirm({ normalized, withEol, target: goal, losses, after })
        return
      }
      void runSave({ normalized, withEol, target: goal, losses: [], after })
    },
    [editor, hostDoc, dirty, originalText, saveWarned, prepareSave, runSave, performSwitch],
  )

  /** 确认回调：唯一置 saveWarned 的地方 */
  const confirmSave = useCallback(() => {
    const pending = pendingConfirm
    if (!pending) return
    setSaveWarned(true)
    setPendingConfirm(null)
    void runSave(pending)
  }, [pendingConfirm, runSave])

  /** 取消：不写任何字节，也不动 dirty */
  const cancelConfirm = useCallback(() => setPendingConfirm(null), [])

  /* ---------- 最近打开（T1/T2） ---------- */

  const loadRecent = useCallback(async () => {
    const webview = window.chrome?.webview
    if (!webview) {
      setRecent({ kind: 'no-host' })
      return
    }
    try {
      const response = await fetch('/__recent', { cache: 'no-store' })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const data = (await response.json()) as {
        v?: number
        state?: string
        items?: RecentItem[]
        reason?: string
      }
      if (!data || data.v !== 1) throw new Error('BAD_RESPONSE')
      if (data.state === 'disabled') {
        setRecent({ kind: 'disabled', reason: data.reason || '最近记录功能不可用。' })
        return
      }
      const items = (data.items ?? []).filter(
        (item) => item && typeof item.id === 'string' && typeof item.seq === 'number' && typeof item.name === 'string',
      )
      setRecent({
        kind: data.state === 'volatile' ? 'volatile' : 'ok',
        items,
        reason: data.reason,
      })
    } catch {
      setRecent({ kind: 'error', message: '读不出来，重开应用再试。' })
    }
  }, [])

  useEffect(() => {
    void loadRecent()
  }, [loadRecent])

  /**
   * 最近记录协议：open/remove 的 id 是条目 id（字符串），回包按它匹配；
   * clear/restore 没有条目 id，用自增请求 id 匹配。
   */
  const sendRecent = useCallback(
    (type: string, payload: Record<string, unknown> = {}) =>
      new Promise<{ ok: boolean; error?: string; id: number }>((resolve) => {
        const webview = window.chrome?.webview
        if (!webview) {
          resolve({ ok: false, error: 'IO', id: 0 })
          return
        }
        const isItemScoped = type === 'open-recent' || type === 'recent-remove'
        const requestId = (nextRecentIdRef.current += 1)
        const key = isItemScoped ? `${type}:${String(payload.id)}` : `${type}:${requestId}`
        recentRequestsRef.current.set(key, (data) => resolve({ ok: data.ok === true, error: data.error, id: requestId }))
        const message = isItemScoped
          ? { v: 1, type, ...payload }
          : { v: 1, type, id: requestId }
        webview.postMessage(message)
        setTimeout(() => {
          if (recentRequestsRef.current.delete(key)) resolve({ ok: false, error: 'IO', id: requestId })
        }, 10000)
      }),
    [],
  )

  const removeRecent = useCallback(
    async (item: RecentItem) => {
      const result = await sendRecent('recent-remove', { id: item.id, seq: item.seq })
      if (result.ok) {
        setNotice(null)
        await loadRecent()
        return
      }
      setNotice({ text: `移除失败：${recentError(result.error)}`, kind: 'error' })
    },
    [loadRecent, sendRecent],
  )

  const sendOpenRecent = useCallback(
    async (item: RecentItem) => {
      if (recentOpeningRef.current === item.id) return
      recentOpeningRef.current = item.id
      const result = await sendRecent('open-recent', { id: item.id, seq: item.seq })
      recentOpeningRef.current = null
      if (result.ok) return // 宿主会 reload，页面重新 /__doc
      if (result.error === 'STALE') {
        setRecentStaleId(item.id)
        await loadRecent()
        setRecentStaleId(null)
        setNotice({ text: '最近记录已更新，请按新列表重试。', kind: 'info', ttl: 4000 })
        return
      }
      setNotice({
        text: recentError(result.error),
        kind: 'error',
        actions: [
          { label: '从列表移除', onClick: () => void removeRecent(item) },
          { label: '重试', onClick: () => void sendOpenRecent(item) },
        ],
      })
    },
    [loadRecent, removeRecent, sendRecent],
  )

  const openRecentItem = useCallback(
    (item: RecentItem) => {
      if (dirty) {
        // 脏文档：先走「保存并切换」，after 只挂在这次点击上
        requestSave('switch', () => void sendOpenRecent(item))
        return
      }
      void sendOpenRecent(item)
    },
    [dirty, requestSave, sendOpenRecent],
  )

  const restoreRecent = useCallback(async () => {
    const result = await sendRecent('recent-restore')
    if (result.ok) {
      await loadRecent()
      return
    }
    setNotice({ text: `撤销失败：${recentError(result.error)}`, kind: 'error' })
  }, [loadRecent, sendRecent])

  const clearRecent = useCallback(async (): Promise<boolean> => {
    const result = await sendRecent('recent-clear')
    if (result.ok) {
      setNotice({
        text: '已清除最近记录。',
        kind: 'info',
        ttl: 6000,
        actions: [{ label: '撤销', onClick: () => void restoreRecent() }],
      })
      await loadRecent()
      return true
    }
    setNotice({ text: `清除失败：${recentError(result.error)} 最近记录还在。`, kind: 'error' })
    return false
  }, [loadRecent, restoreRecent, sendRecent])


  /* ---------- 宿主草稿（T1） ---------- */

  const scheduleHostDraft = useCallback((text: string) => {
    if (!hostModeRef.current || draftSuppressedRef.current) return
    if (draftTimerRef.current) clearTimeout(draftTimerRef.current)
    draftTimerRef.current = setTimeout(() => {
      const webview = window.chrome?.webview
      if (!webview || !hostModeRef.current || draftSuppressedRef.current) return
      const id = (nextDraftIdRef.current += 1)
      const generation = draftGenerationRef.current
      let resolveAck: () => void = () => {}
      const ack = new Promise<void>((resolve) => {
        resolveAck = resolve
      })
      draftPendingRef.current = { id, generation, ack, resolve: resolveAck }
      webview.postMessage({ v: 1, type: 'draft-save', id, text })
    }, 800)
  }, [])

  useEffect(() => {
    scheduleHostDraftRef.current = scheduleHostDraft
  }, [scheduleHostDraft])

  /** 保存成功后清宿主草稿：先停计时器、等当前 draft-save 回包（最多 1 s），再发 clear */
  const clearHostDraft = useCallback(async () => {
    if (draftTimerRef.current) {
      clearTimeout(draftTimerRef.current)
      draftTimerRef.current = null
    }
    const pending = draftPendingRef.current
    if (pending) {
      await Promise.race([pending.ack, new Promise<void>((resolve) => setTimeout(resolve, 1000))])
    }
    draftGenerationRef.current += 1
    draftSuppressedRef.current = true
    draftPendingRef.current = null
    window.chrome?.webview?.postMessage({ v: 1, type: 'draft-clear', id: (nextDraftIdRef.current += 1) })
  }, [])

  const recoverHostDraft = useCallback(() => {
    const payload = hostPayloadRef.current
    const draft = hostDraftPrompt
    if (!payload || !draft) return
    // 基线仍取原文件：草稿不是原文
    applyHostPayload(payload)
    const split = splitFrontmatter(draft.text)
    const footnoteSplit = extractFootnotes(split.body)
    setFrontmatter(split.frontmatter)
    frontmatterRef.current = split.frontmatter
    setFootnotes(footnoteSplit.footnotes)
    footnotesRef.current = footnoteSplit.footnotes
    setMarkdown(footnoteSplit.body)
    setDirty(true)
    setDraftRestored(true)
    // 草稿恢复不进源码模式：用户要看到恢复的草稿正文
    setViewMode('edit')
    setHostDraftPrompt(null)
    hostPayloadRef.current = null
  }, [applyHostPayload, hostDraftPrompt, setMarkdown])

  const discardHostDraft = useCallback(() => {
    const payload = hostPayloadRef.current
    hostPayloadRef.current = null
    setHostDraftPrompt(null)
    void clearHostDraft()
    if (payload) applyHostPayload(payload)
  }, [applyHostPayload, clearHostDraft])

  /* ---------- 自动保存（T3） ---------- */

  const cancelAutoSave = useCallback(() => {
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current)
      autoSaveTimerRef.current = null
    }
    setAutoSaveScheduled(false)
  }, [])

  const writeDraftFallback = useCallback(async (text: string) => {
    if (hostModeRef.current) {
      scheduleHostDraftRef.current(text)
      return
    }
    const file = fileRef.current
    const space = workspaceRef.current
    if (file?.path && space && !space.demo) {
      const dir = await parentDirectory(space, file.path)
      if (dir) {
        await writeCache(dir, 'draft', cacheKey(file.name), text)
        return
      }
    }
    // 单文件打开拿不到目录：退回 localStorage，至少关窗还能恢复
    try {
      localStorage.setItem(DOC_KEY, JSON.stringify({ text, name: docNameRef.current, savedAt: Date.now() }))
    } catch {
      // 配额满就算了，状态栏已经提示失败
    }
  }, [])

  const runAutoSave = useCallback(async () => {
    setAutoSaveScheduled(false)
    if (!settings.autoSave || !editor) return
    if (Date.now() < composeUntilRef.current) return
    if (autoFailCountRef.current >= 3) return
    if (saving || pendingIdsRef.current.size > 0 || savingRef.current) return
    if (deletingRef.current || refreshingRef.current) return
    const generation = autoSaveGenerationRef.current
    if (pendingConfirm !== null || pendingSwitch !== null || closeRequested || closeGuardOpen || settingsOpen) {
      return
    }
    if (!dirtyRef.current) return
    const hasFileTarget = Boolean(saveTargetRef.current ?? activeFile?.handle)
    if (!(hostDoc?.ready && hostDoc.writable) && !hasFileTarget) return

    const { normalized, withEol } = prepareSave()
    const losses = originalText !== null ? activeLosses(originalText, normalized, baselineLossesRef.current) : []
    if (losses.length > 0) {
      // 有结构损失：只提示「需手动保存」，绝不弹确认框
      setAutoSaveState('manual')
      return
    }

    if (hostDoc?.ready && hostDoc.writable) {
      // 宿主：先比 mtime，外部改过就不覆盖
      try {
        const response = await fetch('/__doc', { cache: 'no-store' })
        if (response.ok) {
          const fresh = (await response.json()) as HostDocResponse
          if (Number(fresh.mtime ?? 0) > hostDoc.mtime) {
            setAutoSaveState('external')
            return
          }
        }
      } catch {
        // 取不到就按原 mtime 继续，写回失败还有草稿兜底
      }
      if (generation !== autoSaveGenerationRef.current || deletingRef.current || refreshingRef.current) return
      sendHostSaveRef.current(normalized)
      setAutoSaveState('saved')
      setAutoSavedAt(Date.now())
      autoFailCountRef.current = 0
      return
    }

    if (generation !== autoSaveGenerationRef.current || deletingRef.current || refreshingRef.current) return
    const ok = await performCommit(normalized, withEol)
    if (ok) {
      setAutoSaveState('saved')
      setAutoSavedAt(Date.now())
      autoFailCountRef.current = 0
    } else {
      autoFailCountRef.current += 1
      setAutoSaveState('failed')
      void writeDraftFallback(normalized)
    }
  }, [
    activeFile,
    closeGuardOpen,
    closeRequested,
    editor,
    hostDoc,
    originalText,
    pendingConfirm,
    pendingSwitch,
    performCommit,
    prepareSave,
    saving,
    settings.autoSave,
    settingsOpen,
    writeDraftFallback,
  ])

  const scheduleAutoSave = useCallback(() => {
    if (!settings.autoSave) return
    cancelAutoSave()
    setAutoSaveScheduled(true)
    autoSaveTimerRef.current = setTimeout(() => {
      void runAutoSave()
    }, 2000)
  }, [cancelAutoSave, runAutoSave, settings.autoSave])

  useEffect(() => {
    scheduleAutoSaveRef.current = scheduleAutoSave
    cancelAutoSaveRef.current = cancelAutoSave
    clearHostDraftRef.current = clearHostDraft
  }, [scheduleAutoSave, cancelAutoSave, clearHostDraft])

  // 输入法组合：组合期间与结束后 400 ms 内都不写盘
  useEffect(() => {
    if (!editor) return
    const dom = editor.view.dom
    const onStart = () => {
      composeUntilRef.current = Number.POSITIVE_INFINITY
    }
    const onEnd = () => {
      composeUntilRef.current = Date.now() + 400
      // 组合结束后重新排一次自动保存：组合期间 onUpdate 被 400ms 门槛挡住
      scheduleAutoSaveRef.current()
    }
    dom.addEventListener('compositionstart', onStart)
    dom.addEventListener('compositionend', onEnd)
    return () => {
      dom.removeEventListener('compositionstart', onStart)
      dom.removeEventListener('compositionend', onEnd)
    }
  }, [editor])

  /* ---------- 关窗保护（T2） ---------- */

  const cancelCloseGuard = useCallback(() => {
    setCloseGuardOpen(false)
    window.chrome?.webview?.postMessage({ v: 1, type: 'close-answer', action: 'cancel' })
  }, [])

  const saveDraftAndClose = useCallback(() => {
    const { normalized } = prepareSave()
    setCloseGuardOpen(false)
    window.chrome?.webview?.postMessage({ v: 1, type: 'close-answer', action: 'save-draft', text: normalized })
  }, [prepareSave])

  const discardAndClose = useCallback(() => {
    setCloseGuardOpen(false)
    window.chrome?.webview?.postMessage({ v: 1, type: 'close-answer', action: 'discard' })
  }, [])

  // close-request 排队：其它模态或写回还没结束就先记下，结束后再弹
  useEffect(() => {
    if (!closeRequested || closeGuardOpen) return
    if (pendingConfirm !== null || pendingSwitch !== null || saving || settingsOpen || shortcutsOpen) return
    setCloseRequested(false)
    setCloseGuardOpen(true)
  }, [closeRequested, closeGuardOpen, pendingConfirm, pendingSwitch, saving, settingsOpen, shortcutsOpen])

  // 浏览器关页：只在真的会丢改动时拦；自动保存排队/写回中不打扰
  useEffect(() => {
    if (!(dirty && !autoSaveScheduled && !saving)) {
      window.onbeforeunload = null
      return
    }
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.onbeforeunload = handler
    return () => {
      window.onbeforeunload = null
    }
  }, [dirty, autoSaveScheduled, saving])

  const saveFile = useCallback(() => {
    if (hostDoc?.ready) {
      requestSave(hostDoc.writable ? 'host' : 'saveAs')
      return
    }
    requestSave('file')
  }, [hostDoc, requestSave])

  const saveFileRef = useRef<() => void>(() => {})
  useEffect(() => {
    saveFileRef.current = saveFile
  }, [saveFile])

  // KaTeX 加载失败后点击公式占位：先重试加载，成功后重建公式 NodeView
  useEffect(() => {
    const root = scrollRef.current
    if (!root || !editor) return
    const handler = (event: MouseEvent) => {
      const target = (event.target as HTMLElement | null)?.closest?.('.math-fallback')
      if (!target) return
      event.preventDefault()
      event.stopPropagation()
      void ensureKatex()
        .then(() => {
          // 直接 reparse 当前 Markdown：替换掉失败态节点，让新 NodeView 用已加载的 KaTeX 排版
          setMarkdown(editor.getMarkdown())
        })
        .catch(() => undefined)
    }
    root.addEventListener('mousedown', handler, true)
    root.addEventListener('click', handler, true)
    return () => {
      root.removeEventListener('mousedown', handler, true)
      root.removeEventListener('click', handler, true)
    }
  }, [editor, setMarkdown])

  useEffect(() => {
    saveAsCopyRef.current = () => requestSave('saveAs')
  }, [requestSave])

  /** 宿主文档：把一次写回发给宿主；同一时间只有一个 id 在飞 */
  const sendHostSave = useCallback(
    (text: string) => {
      const webview = window.chrome?.webview
      if (!webview || !hostDoc?.ready || !hostDoc.writable) return
      if (pendingIdsRef.current.size > 0) {
        // 保存中再按一次：只记最新一份，回包后补发
        pendingHostSave.current = { text }
        return
      }
      const id = (nextSaveIdRef.current += 1)
      pendingIdsRef.current.add(id)
      savingRef.current = true
      sentTextRef.current = { id, text }
      setSaving(true)
      setSaveError(null)
      // 只发正文，不带任何路径/文件名
      webview.postMessage({ v: 1, type: 'save', id, text })
      const timer = setTimeout(() => {
        if (!pendingIdsRef.current.has(id)) return
        pendingIdsRef.current.delete(id)
        saveTimersRef.current.delete(id)
        savingRef.current = pendingIdsRef.current.size > 0
        setSaving(false)
        setSaveError('保存超时：宿主 10 秒没有回应。改动还在，可以重试。')
        flushHostSaveWaiters()
      }, 10000)
      saveTimersRef.current.set(id, timer)
    },
    [hostDoc, flushHostSaveWaiters],
  )

  useEffect(() => {
    sendHostSaveRef.current = sendHostSave
  }, [sendHostSave])

  /** 宿主写回成功：基线、dirty、mtime 一起更新 */
  const applyHostSaveSuccess = useCallback(
    (id: number, payload: { mtime?: number }) => {
      const sent = sentTextRef.current
      if (!sent || sent.id !== id) return
      sentTextRef.current = null
      // 文档已经换走（宿主模式结束）：旧回包只丢掉，不动新文档的 dirty 与提示
      if (!hostDoc?.ready) {
        savingRef.current = false
        setSaving(false)
        setSaveError(null)
        return
      }
      baselineRef.current = sent.text
      setOriginalText(sent.text)
      rawTextRef.current = sent.text
      baselineLossesRef.current = []
      setRisks([])
      setDirty(false)
      setSaving(false)
      savingRef.current = false
      setSaveError(null)
      setHostDoc((previous) => (previous ? { ...previous, mtime: Number(payload.mtime ?? previous.mtime) } : previous))
      autoFailCountRef.current = 0
      setAutoSaveState('idle')
      setAutoSavedAt(null)
      setDraftRestored(false)
      void clearHostDraft()
      if (hostSwitchPendingRef.current) {
        hostSwitchPendingRef.current = false
        performSwitch()
      }
      // 正在等切文档：不弹「已保存」，免得新文档上挂着旧文档的成功提示
      if (hostSaveWaitersRef.current.length === 0) {
        setNotice({ text: `已保存到 ${hostDoc.fileName}`, kind: 'info', persist: true })
      }
    },
    [hostDoc, performSwitch],
  )

  useEffect(() => {
    hostSaveSuccessRef.current = applyHostSaveSuccess
  }, [applyHostSaveSuccess])

  // 宿主回包：只认 pendingIds 里的 id；失败保留 dirty，可重试
  useEffect(() => {
    const webview = window.chrome?.webview
    if (!webview) return
    const onMessage = (event: { data: unknown }) => {
      const data = event.data as
        | { v?: number; type?: string; id?: number; ok?: boolean; error?: string; mtime?: number }
        | null
      if (!data || data.v !== 1) return

      if (
        typeof data.type === 'string' &&
        data.type.endsWith('-result') &&
        (data.type === 'open-recent-result' ||
          data.type === 'recent-remove-result' ||
          data.type === 'recent-clear-result' ||
          data.type === 'recent-restore-result')
      ) {
        const sourceType = data.type.replace(/-result$/, '')
        const key = `${sourceType}:${String(data.id)}`
        const resolve = recentRequestsRef.current.get(key)
        if (resolve) {
          recentRequestsRef.current.delete(key)
          resolve({ ok: data.ok === true, error: data.error })
        }
        return
      }

      if (data.type === 'close-request') {
        setCloseRequested(true)
        return
      }

      if (data.type === 'draft-save-result') {
        const pending = draftPendingRef.current
        if (!pending || pending.id !== data.id) return
        pending.resolve()
        if (pending.generation === draftGenerationRef.current) draftPendingRef.current = null
        return
      }

      if (data.type !== 'save-result') return
      const id = Number(data.id)
      if (!pendingIdsRef.current.has(id)) return // 晚到/旧回包一律丢弃
      pendingIdsRef.current.delete(id)
      const timer = saveTimersRef.current.get(id)
      if (timer) {
        clearTimeout(timer)
        saveTimersRef.current.delete(id)
      }
      savingRef.current = pendingIdsRef.current.size > 0
      if (data.ok === true) {
        hostSaveSuccessRef.current(id, { mtime: data.mtime })
      } else {
        setSaving(false)
        setSaveError(hostErrorCopy(String(data.error ?? 'IO')))
      }
      // 保存中按过的那一次：用最新正文补发
      const queued = pendingHostSave.current
      pendingHostSave.current = null
      if (queued) sendHostSaveRef.current(queued.text)
      flushHostSaveWaiters()
    }
    webview.addEventListener('message', onMessage)
    return () => webview.removeEventListener('message', onMessage)
  }, [flushHostSaveWaiters])

  const cancelSwitch = useCallback(() => setPendingSwitch(null), [])

  const discardAndSwitch = useCallback(() => {
    const next = pendingSwitch
    setPendingSwitch(null)
    if (!next) return
    if (next.after) {
      next.after()
      return
    }
    loadIntoEditor(next.text, next.name, next.file)
  }, [pendingSwitch, loadIntoEditor])

  const saveAndSwitch = useCallback(() => {
    requestSave('switch')
  }, [requestSave])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const mod = event.ctrlKey || event.metaKey
      const key = event.key.toLowerCase()
      const dialogOpen = settingsOpen || shortcutsOpen || pendingConfirm !== null || pendingSwitch !== null
      const productCombo =
        (mod && !event.shiftKey && !event.altKey && key === 's') ||
        (mod && event.altKey && !event.shiftKey && ['n', 'o', 's', 'e'].includes(key)) ||
        (mod && event.altKey && event.shiftKey && key === 'o') ||
        (mod && !event.altKey && (key === 'f' || key === 'h')) ||
        (mod && !event.altKey && event.shiftKey && key === 'p') ||
        (mod && (event.key === '=' || event.key === '+' || event.key === '-' || event.key === '0'))

      if (event.key === 'Escape') {
        if (railOpen) {
          setRailOpen(false)
          railToggleRef.current?.focus()
          return
        }
        if (findOpen) {
          setFindOpen(false)
          return
        }
        if (settingsOpen) {
          setSettingsOpen(false)
          return
        }
        if (shortcutsOpen) {
          setShortcutsOpen(false)
          return
        }
        if (pendingConfirm !== null) {
          setPendingConfirm(null)
          return
        }
        if (sourceConfirm !== null) {
          setSourceConfirm(null)
          return
        }
        if (pendingSwitch !== null) {
          cancelSwitch()
          return
        }
        if (menuOpen || exportOpen) {
          setMenuOpen(false)
          setExportOpen(false)
          if (exportOpen) exportTriggerRef.current?.focus()
          return
        }
        // 停在源码或预览里时，Esc 回到编辑；源码里改过的内容按「切回」规则落回正文
        if (sourceMode) {
          toggleSourceRef.current()
          return
        }
        if (previewMode) {
          togglePreviewRef.current()
          return
        }
        return
      }

      // 对话框开着时，产品快捷键只吞掉浏览器默认动作，不执行
      if (dialogOpen) {
        if (productCombo) event.preventDefault()
        return
      }

      // `?` 只在非输入区打开快捷键一览；正文里打问号照常输入
      const target = event.target
      const typing =
        target instanceof HTMLElement &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
      if (!typing && (event.key === '?' || (event.key === '/' && event.shiftKey))) {
        event.preventDefault()
        setShortcutsOpen(true)
        return
      }

      if (mod && event.altKey && !event.shiftKey && key === 'n') {
        event.preventDefault()
        newDocument()
        return
      }
      if (mod && event.altKey && !event.shiftKey && key === 'o') {
        event.preventDefault()
        void openSingleFile()
        return
      }
      if (mod && event.altKey && event.shiftKey && key === 'o') {
        event.preventDefault()
        void openFolder()
        return
      }
      if (mod && event.altKey && !event.shiftKey && key === 's') {
        event.preventDefault()
        saveAsCopyRef.current()
        return
      }
      if (mod && event.altKey && !event.shiftKey && key === 'e') {
        event.preventDefault()
        setExportOpen(true)
        // 等菜单挂上 DOM 再把焦点送进第一项，键盘可以直接 Enter
        requestAnimationFrame(() => document.querySelector<HTMLElement>('.export-menu button')?.focus())
        return
      }

      if (mod && !event.altKey && !event.shiftKey && key === 's') {
        event.preventDefault()
        saveFile()
        return
      }
      if (mod && !event.altKey && !event.shiftKey && (key === 'f' || key === 'h')) {
        event.preventDefault()
        setFindOpen(true)
        return
      }
      if (mod && !event.altKey && event.shiftKey && !event.ctrlKey && key === 'p') {
        event.preventDefault()
        togglePreviewRef.current()
        return
      }
      if (mod && (event.key === '=' || event.key === '+')) {
        event.preventDefault()
        setFontSize(settings.fontSize + 1)
        return
      }
      if (mod && event.key === '-') {
        event.preventDefault()
        setFontSize(settings.fontSize - 1)
        return
      }
      if (mod && event.key === '0') {
        event.preventDefault()
        setFontSize(DEFAULT_SETTINGS.fontSize)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [
    saveFile,
    findOpen,
    settingsOpen,
    shortcutsOpen,
    pendingConfirm,
    pendingSwitch,
    menuOpen,
    exportOpen,
    cancelSwitch,
    settings.fontSize,
    setFontSize,
    sourceMode,
    previewMode,
    railOpen,
    newDocument,
    openSingleFile,
    openFolder,
  ])

  // 导出菜单打开后焦点进第一项（键盘可以直接走）
  useEffect(() => {
    if (!exportOpen) return
    const frame = requestAnimationFrame(() =>
      document.querySelector<HTMLElement>('.export-menu button')?.focus(),
    )
    return () => cancelAnimationFrame(frame)
  }, [exportOpen])

  // 点菜单外面关掉菜单
  useEffect(() => {
    if (!menuOpen && !exportOpen) return
    const onDown = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null
      if (target?.closest('.menu') || target?.closest('.menu-trigger') || target?.closest('.export-wrap')) return
      setMenuOpen(false)
      setExportOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [menuOpen, exportOpen])

  const commitSettings = useCallback((next: Settings) => {
    const safe = { ...next, fontSize: clampFontSize(next.fontSize) }
    setSettings(safe)
    saveSettings(safe)
    setSettingsOpen(false)
    // 提示词被改没了输出格式，模型多半会不按约定回；不阻止，但先提醒
    if (!/json/i.test(safe.analysisPrompt)) {
      show('提示词里没提 JSON 格式，模型可能不按约定回；已保存，可在设置里恢复默认。')
    }
  }, [])

  /* ---------- 视图 ---------- */

  const run = useCallback(
    (command: (chain: ChainedCommands) => ChainedCommands) => {
      if (!editor) return
      command(editor.chain().focus()).run()
      setMenuOpen(false)
    },
    [editor],
  )

  /** 把源码框里的内容写回编辑器：退出源码、切到预览、按 Esc 都走这一条路 */
  const applySource = useCallback(() => {
    if (!editor) return
    const split = splitFrontmatter(sourceText)
    const footnoteSplit = extractFootnotes(split.body)
    setFrontmatter(split.frontmatter)
    frontmatterRef.current = split.frontmatter
    setFootnotes(footnoteSplit.footnotes)
    footnotesRef.current = footnoteSplit.footnotes
    setMarkdown(footnoteSplit.body)
    // 源码往返不清空批注：按引文在当前正文里重新定位，找不到的才丢
    const index = buildTextIndex(editor.state.doc)
    setAnnotations((previous) =>
      previous.flatMap((item) => {
        const hit = findRange(index, item.quote, 0)
        return hit ? [{ ...item, from: hit.from, to: hit.to }] : []
      }),
    )
    syncDocInfo(editor)
    // 离开源码：脏按保存基线算，不能只看「源码里改没改」
    if (baselineRef.current !== null) setDirty(sourceText.replace(/\r\n/g, '\n') !== baselineRef.current)
  }, [editor, sourceText, setMarkdown, syncDocInfo])

  /**
   * 三种视图统一在这里切：离开源码时先把源码写回正文，
   * 否则「源码 → 预览 / 源码 → 源码」会把刚改的字弄丢。
   */
  const switchView = useCallback(
    (next: 'edit' | 'source' | 'preview') => {
      if (!editor) return
      if (viewMode === 'source' && next !== 'source') applySource()
      if (next === 'source') {
        // 未编辑时显示文件原文（引用式链接定义还在）；编辑过才显示当前内容
        const text =
          viewMode === 'source'
            ? sourceText
            : (!dirty || draftRestored) && rawTextRef.current !== null
              ? rawTextRef.current
              : currentMarkdown()
        sourceBaselineRef.current = text
        setSourceText(text)
      }
      if (next !== 'edit') {
        // 源码与预览都会替换掉编辑器视图，专注与打字机在这里没有意义
        setFocusMode(false)
        setTypewriterMode(false)
      }
      setViewMode(next)
    },
    [editor, viewMode, sourceText, dirty, draftRestored, currentMarkdown, applySource],
  )

  const toggleSource = useCallback(() => {
    switchView(sourceMode ? 'edit' : 'source')
  }, [switchView, sourceMode])

  /** 源码里「回到富文本编辑」：dirty 时先确认，不静默覆盖 */
  const backToRich = useCallback(() => {
    if (!sourceMode) return
    if (dirty) {
      setSourceConfirm('exit')
      return
    }
    switchView('edit')
  }, [dirty, sourceMode, switchView])

  /** 从横幅/按钮进源码：编辑视图里按原文 seed；已在源码则等于「回到富文本编辑」 */
  const openSourceOriginal = useCallback(() => {
    if (!editor) return
    if (sourceMode) {
      backToRich()
      return
    }
    const text = rawTextRef.current ?? originalText
    if (text === null) return
    if (dirty) {
      setSourceConfirm('restore')
      return
    }
    enterSourceFor(text)
  }, [editor, sourceMode, backToRich, dirty, originalText, enterSourceFor])

  const resolveSourceConfirm = useCallback(() => {
    const action = sourceConfirm
    setSourceConfirm(null)
    if (action === 'restore') {
      const text = rawTextRef.current ?? originalText
      if (text !== null) enterSourceFor(text)
      return
    }
    if (action === 'exit') switchView('edit')
  }, [sourceConfirm, originalText, enterSourceFor, switchView])

  const togglePreview = useCallback(() => {
    switchView(previewMode ? 'edit' : 'preview')
  }, [switchView, previewMode])

  useEffect(() => {
    toggleSourceRef.current = toggleSource
    togglePreviewRef.current = togglePreview
  }, [toggleSource, togglePreview])
  const jumpTo = useCallback(
    (item: OutlineItem) => {
      if (!editor) return
      editor.chain().focus().setTextSelection(item.pos + 1).scrollIntoView().run()
    },
    [editor],
  )

  const exportAs = useCallback(
    async (kind: 'html' | 'markdown' | 'text') => {
      if (!editor) return
      setExportOpen(false)
      try {
        // 导出 HTML 需要 KaTeX 的 MathML；无条件等一下，已就绪时是一次微任务
        await ensureKatex().catch(() => undefined)
        // 源码里刚改的内容还没进编辑器；先写回，否则导出的 HTML / TXT 会丢最新改动
        if (sourceMode) applySource()
        if (kind === 'markdown') {
          const name = exportName(docName, 'md')
          saveBlob(name, currentMarkdown(), 'text/markdown;charset=utf-8')
          show(`已导出 ${name}`)
          return
        }
        if (kind === 'html') {
          const bodyHtml = editor.getHTML()
          const html = buildHtmlDocument({
            title: docName,
            bodyHtml,
            fontSize: settings.fontSize,
            frontmatter: frontmatterRef.current,
            footnotes: footnotesRef.current,
          })
          const name = exportName(docName, 'html')
          saveBlob(name, html, 'text/html;charset=utf-8')
          const hadMath =
            bodyHtml.includes('data-type="inline-math"') || bodyHtml.includes('data-type="block-math"')
          if (html.includes('math-fallback') || (hadMath && !html.includes('<math'))) {
            setNotice({ text: '公式排版没加载成功，已按 LaTeX 原文导出。', kind: 'error' })
          } else {
            show(`已导出 ${name}`)
          }
          return
        }
        const name = exportName(docName, 'txt')
        // 纯文本从 HTML 转：公式要保留 $latex$，editor.getText() 会把公式整段吞掉
        saveBlob(name, buildPlainText(editor.getHTML()), 'text/plain;charset=utf-8')
        show(`已导出 ${name}`)
      } catch (error) {
        setNotice({ text: `导出失败：${reasonOf(error)}。改动还在，可以再试一次。`, kind: 'error' })
      }
    },
    [editor, docName, currentMarkdown, settings.fontSize, saveBlob, show, sourceMode, applySource],
  )

  const insertImageFile = useCallback(
    async (file: File) => {
      if (!editor || !file.type.startsWith('image/')) return

      const docPath = activeFile?.path ?? (workspace ? `${workspace.name}/${docName}` : '')
      const dir = workspace ? await parentDirectory(workspace, docPath) : null

      if (dir) {
        try {
          const name = assetFileName(file.name || 'image.png', Date.now())
          const relative = await writeAsset(dir, name, file)
          editor.chain().focus().setImage({ src: relative, alt: file.name }).run()
          return
        } catch (error) {
          setNotice({ text: messageOf(error), kind: 'error' })
        }
      }

      try {
        const dataUrl = await fileToDataUrl(file)
        editor.chain().focus().setImage({ src: dataUrl, alt: file.name }).run()
        show('图片暂时内联在正文里；打开文件夹后再拖入，才会存成 assets 相对路径。')
      } catch (error) {
        setNotice({ text: messageOf(error), kind: 'error' })
      }
    },
    [editor, workspace, activeFile, docName],
  )

  useEffect(() => {
    insertImageRef.current = (file: File) => void insertImageFile(file)
  }, [insertImageFile])

  // 点链接进入编辑：选中整段链接文字，弹出地址框
  useEffect(() => {
    openLinkRef.current = (anchor: HTMLAnchorElement) => {
      if (!editor) return
      const position = editor.view.posAtDOM(anchor, 0)
      editor.chain().setTextSelection(position).extendMarkRange('link').run()
      const { from, to } = editor.state.selection
      setLinkEdit({ href: anchor.getAttribute('href') ?? '', from, to, anchor: anchor.getBoundingClientRect() })
    }
  }, [editor])

  // 点公式：就地展开成 $…$ 源码并全选，预览浮在下面（Typora 的做法）
  useEffect(() => {
    if (!editor) return

    mathEditRef.current = (position) => {
      const view = editor.view
      const { state } = view
      // 位置可能差一格（块级节点前后边界），就近找那个数学节点
      let node = state.doc.nodeAt(position)
      if (!node || !node.type.name.toLowerCase().includes('math')) {
        node = state.doc.nodeAt(position - 1) ?? state.doc.nodeAt(position + 1) ?? null
      }
      if (!node || !node.type.name.toLowerCase().includes('math')) return
      const latex = String(node.attrs.latex ?? '')
      const block = node.type.name === 'blockMath'

      // 块级公式的 $$…$$ 会被扩展的输入规则立刻收成行内公式，
      // 所以块级走「贴着公式的输入框」，行内走 Typora 那套就地展开。
      if (block) {
        const dom = view.nodeDOM(position)
        let rect = dom instanceof HTMLElement ? dom.getBoundingClientRect() : null
        if (!rect || (rect.width === 0 && rect.height === 0)) {
          // 刚建出来的空公式没有尺寸，用光标位置兜底
          const coords = view.coordsAtPos(Math.min(position + 1, state.doc.content.size))
          rect = new DOMRect(coords.left, coords.top, 1, Math.max(1, coords.bottom - coords.top))
        }
        setMathEdit({ latex, from: position, to: position + node.nodeSize, anchor: rect })
        return
      }

      const delimiters = `$${latex}$`

      const text = state.schema.text(delimiters)
      const replacement = text
      const from = position
      const to = from + delimiters.length

      const tr = state.tr.replaceWith(position, position + node.nodeSize, replacement)
      tr.setSelection(TextSelection.create(tr.doc, from, to))
      view.dispatch(tr)
      view.focus()
      // 先记范围与源码，监听器在进入草稿的那一帧就能读到
      mathDraftRef.current = { from, to, block: false, text: delimiters }
      // 编辑期间关掉输入规则，免得打完整的一对 $ 立刻被换走
      const storage = (editor.storage as { mathInputRules?: { draft: boolean } }).mathInputRules
      if (storage) storage.draft = true
      setMathDraft({ from, to, latex, block: false, top: 0, left: 0 })
    }
  }, [editor])

  // 跟着输入刷新预览；光标离开草稿就把源码还原成公式
  useEffect(() => {
    if (!editor || !mathDraft) return

    // 提交时按「刚才编辑的那段源码文本」在文档里找回它，不依赖位置映射
    const commit = () => {
      const draft = mathDraftRef.current
      setMathDraft(null)
      mathDraftRef.current = null
      const storage = (editor.storage as { mathInputRules?: { draft: boolean } }).mathInputRules
      if (storage) storage.draft = false
      editor.setOptions({ enableInputRules: true, enablePasteRules: true })
      if (!draft) return

      const { state } = editor
      const target = draft.text.trim()
      if (!target) return
      // 用文本形状判断是块级还是行内，比记下来的标记可靠
      const isBlock = /^\$\$[\s\S]+\$\$$/.test(target)

      let found: { pos: number; node: PMNode } | null = null
      state.doc.descendants((node, pos) => {
        if (found) return false
        if (!node.isTextblock) return true
        const text = node.textContent
        if (isBlock ? text.trim() === target : text.includes(target)) {
          found = { pos, node }
          return false
        }
        return true
      })
      if (!found && isBlock) {
        // 扩展的输入规则会把 $$…$$ 直接收成行内公式；按 latex 找回来改成块级
        const latex = target.replace(/^\$\$/, '').replace(/\$\$$/, '').trim()
        if (latex) {
          let hitPos = -1
          state.doc.descendants((node, pos) => {
            if (hitPos >= 0) return false
            if (node.type.name === 'inlineMath' && String(node.attrs.latex ?? '').trim() === latex) {
              hitPos = pos
              return false
            }
            return true
          })
          if (hitPos >= 0) {
            const $hit = state.doc.resolve(hitPos)
            const start = $hit.start() - 1
            editor
              .chain()
              .insertContentAt({ from: start, to: start + $hit.parent.nodeSize }, { type: 'blockMath', attrs: { latex } })
              .run()
            return
          }
        }
      }

      const picked = found as unknown as { pos: number; node: PMNode } | null
      if (!picked) return

      const { pos, node } = picked
      const type = state.schema.nodes[isBlock ? 'blockMath' : 'inlineMath']
      if (!type) return

      if (isBlock) {
        const latex = target.replace(/^\$\$/, '').replace(/\$\$$/, '').trim()
        if (!latex) return
        editor
          .chain()
          .insertContentAt({ from: pos, to: pos + node.nodeSize }, { type: type.name, attrs: { latex } })
          .run()
        return
      }

      const index = node.textContent.indexOf(target)
      const match = target.match(/^\$([^$]+)\$$/)
      if (index < 0 || !match) return
      const latex = match[1].trim()
      if (!latex) return
      editor
        .chain()
        .insertContentAt(
          { from: pos + 1 + index, to: pos + 1 + index + target.length },
          { type: type.name, attrs: { latex } },
        )
        .run()
    }

    const refresh = (from: number, to: number) => {
      const { state } = editor
      if (to > state.doc.content.size) return
      const raw = state.doc.textBetween(from, to, '\n')
      const latex = raw.replace(/^\$\$?/, '').replace(/\$\$?$/, '')

      let top = 0
      let left = 0
      try {
        const coords = editor.view.coordsAtPos(Math.min(to, state.doc.content.size))
        top = coords.bottom
        left = coords.left
      } catch {
        // 位置越界时这次的坐标就先不用
      }

      setMathDraft((current) => (current ? { ...current, from, to, latex, top, left } : current))
    }

    const lastTransactionRef = { current: null as Transaction | null }

    const handle = (transaction: Transaction) => {
      const draft = mathDraftRef.current
      if (!draft) return

      // 一次 dispatch 会同时触发 update 与 selectionUpdate，映射只能做一次
      if (lastTransactionRef.current !== transaction) {
        lastTransactionRef.current = transaction
        mathDraftRef.current = {
          ...draft,
          from: transaction.mapping.map(draft.from, -1),
          to: transaction.mapping.map(draft.to, 1),
          text: editor.state.doc.textBetween(
            Math.max(0, transaction.mapping.map(draft.from, -1)),
            Math.min(editor.state.doc.content.size, transaction.mapping.map(draft.to, 1)),
            '\n',
          ),
        }
      }

      const current = mathDraftRef.current
      if (!current) return
      const selection = editor.state.selection
      if (selection.to < current.from || selection.from > current.to) {
        // 源码还没写完整（缺收尾的 $）就先不收，等写完再收
        const text = current.text.trim()
        const complete = /^\$\$[\s\S]+\$\$$/.test(text) || /^\$[^$]+\$$/.test(text)
        if (complete) {
          commit()
          return
        }
        return
      }
      refresh(current.from, current.to)
    }

    const onUpdate = ({ transaction }: { transaction: Transaction }) => handle(transaction)
    const onSelection = ({ transaction }: { transaction: Transaction }) => handle(transaction)

    editor.on('update', onUpdate)
    editor.on('selectionUpdate', onSelection)
    refresh(mathDraft.from, mathDraft.to)

    return () => {
      editor.off('update', onUpdate)
      editor.off('selectionUpdate', onSelection)
    }
    // 只在进入/退出草稿时重挂监听，编辑过程中的范围走 ref
  }, [editor, mathDraft !== null])

  const applyMath = useCallback(() => {
    if (!editor || !mathEdit) return
    const latex = mathEdit.latex.trim()
    if (latex.length > 0) {
      editor
        .chain()
        .focus()
        .insertContentAt({ from: mathEdit.from, to: mathEdit.to }, { type: 'blockMath', attrs: { latex } })
        .run()
    }
    // 内容为空时保留这个公式块：刚打 $$ 回车建出来就被失焦删掉，用户会以为没生效
    setMathEdit(null)
  }, [editor, mathEdit])

  const applyLink = useCallback(() => {
    if (!editor || !linkEdit) return
    const href = linkEdit.href.trim()
    const chain = editor.chain().focus().setTextSelection({ from: linkEdit.from, to: linkEdit.to }).extendMarkRange('link')
    if (href.length === 0) chain.unsetLink().run()
    else chain.setLink({ href }).run()
    setLinkEdit(null)
  }, [editor, linkEdit])

  return (
    <div className={`app${focusMode ? ' focus-mode' : ''}${railOpen ? ' rail-open' : ''}`}>
      {/* 第一下 Tab 就到这里；Enter 直接把焦点送进正文 */}
      <a className="skip-link" href="#editor">
        跳到正文
      </a>
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true" />
          Sidelight
        </div>
        <FileMenu
          onNew={newDocument}
          onSaveAs={() => saveAsCopyRef.current()}
          onOpenFile={() => void openSingleFile()}
          onOpenFolder={() => void openFolder()}
          recent={recent.kind === 'no-host' ? null : recent}
          recentDisabledId={recentStaleId}
          onRefreshRecent={() => void loadRecent()}
          onOpenRecent={openRecentItem}
          onClearRecent={clearRecent}
        />
        <div className="doc-name" title={hostDoc?.ready ? '保存会写回这个文件' : undefined}>
          {docName}
          {dirty && <span className="dirty" title="有未保存的改动" />}
        </div>
        <div className="spacer" />
        <button
          type="button"
          className="analyze-button"
          onClick={runAnalysis}
          disabled={selection.chars === 0 || analyzing}
          title={simulated ? '未配置 API Key：从本地生成模拟批注' : undefined}
        >
          {analyzing
            ? '分析中…'
            : selection.to > selection.from
              ? simulated
                ? '分析选中（模拟）'
                : '分析选中'
              : simulated
                ? '分析本段（模拟）'
                : '分析本段'}
        </button>
        <div className="export-wrap">
          <button
            ref={exportTriggerRef}
            type="button"
            aria-haspopup="menu"
            aria-expanded={exportOpen}
            onClick={() => setExportOpen((value) => !value)}
          >
            导出 ▾
          </button>
          {exportOpen && (
            <div
              className="menu export-menu"
              role="menu"
              aria-label="导出"
              onKeyDown={(event) => {
                const items = Array.from(document.querySelectorAll<HTMLElement>('.export-menu button'))
                const index = items.indexOf(document.activeElement as HTMLElement)
                if (event.key === 'ArrowDown') {
                  event.preventDefault()
                  items[(index + 1) % items.length]?.focus()
                } else if (event.key === 'ArrowUp') {
                  event.preventDefault()
                  items[(index - 1 + items.length) % items.length]?.focus()
                } else if (event.key === 'Home') {
                  event.preventDefault()
                  items[0]?.focus()
                } else if (event.key === 'End') {
                  event.preventDefault()
                  items[items.length - 1]?.focus()
                } else if (event.key === 'Tab' || event.key === 'Escape') {
                  event.preventDefault()
                  setExportOpen(false)
                  exportTriggerRef.current?.focus()
                }
              }}
            >
              <button
                type="button"
                onClick={() => {
                  exportAs('html')
                  exportTriggerRef.current?.focus()
                }}
              >
                HTML
              </button>
              <button
                type="button"
                onClick={() => {
                  exportAs('markdown')
                  exportTriggerRef.current?.focus()
                }}
              >
                <span>Markdown</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  exportAs('text')
                  exportTriggerRef.current?.focus()
                }}
              >
                <span>纯文本</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setExportOpen(false)
                  exportTriggerRef.current?.focus()
                  window.print()
                }}
              >
                <span>打印 / PDF</span>
              </button>
            </div>
          )}
        </div>
        <button type="button" onClick={() => setShortcutsOpen(true)} aria-label="快捷键" title="快捷键">
          ?
        </button>
        <button type="button" onClick={saveFile} aria-busy={saving}>
          {saving ? '保存中…' : '保存'}
        </button>
        <button type="button" onClick={() => setSettingsOpen(true)}>
          设置
        </button>
        <button
          ref={railToggleRef}
          type="button"
          className="rail-toggle"
          aria-expanded={railOpen}
          aria-controls="margin-rail"
          onClick={() => (railOpen ? closeRail() : openRail())}
        >
          批注
        </button>
      </header>

      <div className="toolbar">
        <div className="toolbar-group">
          <button
            type="button"
            className={`menu-trigger${menuOpen ? ' is-open' : ''}`}
            onClick={() => setMenuOpen((value) => !value)}
            onPointerDown={() => void ensureKatex().catch(() => undefined)}
          >
            插入 ▾
          </button>
          {menuOpen && (
            <div className="menu">
              <button type="button" onClick={() => run((chain) => chain.insertTable({ rows: 3, cols: 3, withHeaderRow: true }))}>
                表格
              </button>
              <button type="button" onClick={() => run((chain) => chain.toggleCodeBlock())}>
                代码块
              </button>
              <button type="button" onClick={() => run((chain) => chain.toggleBlockquote())}>
                引用
              </button>
              <button type="button" onClick={() => run((chain) => chain.toggleTaskList())}>
                任务列表
              </button>
              <button type="button" onClick={() => run((chain) => chain.setHorizontalRule())}>
                分割线
              </button>
              <button
                type="button"
                onClick={() => {
                  imageInputRef.current?.click()
                  setMenuOpen(false)
                }}
              >
                图片
              </button>
              <button
                type="button"
                onClick={() => {
                  const latex = window.prompt('行内公式的 LaTeX')
                  if (latex) run((chain) => chain.insertContent({ type: 'inlineMath', attrs: { latex } }))
                  setMenuOpen(false)
                }}
              >
                公式
              </button>
              <button
                type="button"
                onClick={() => {
                  const latex = window.prompt('公式块的 LaTeX')
                  if (latex) run((chain) => chain.insertContent({ type: 'blockMath', attrs: { latex } }))
                  setMenuOpen(false)
                }}
              >
                公式块
              </button>
              <button
                type="button"
                onClick={() => {
                  const href = window.prompt('链接地址')
                  if (href) run((chain) => chain.extendMarkRange('link').setLink({ href }))
                  setMenuOpen(false)
                }}
              >
                链接
              </button>
            </div>
          )}
        </div>

        <div className="toolbar-group">
          <button type="button" onClick={() => run((chain) => chain.toggleHeading({ level: 1 }))}>
            H1
          </button>
          <button type="button" onClick={() => run((chain) => chain.toggleHeading({ level: 2 }))}>
            H2
          </button>
          <button type="button" onClick={() => run((chain) => chain.toggleBold())} title="粗体">
            B
          </button>
          <button type="button" className="italic" onClick={() => run((chain) => chain.toggleItalic())} title="斜体">
            I
          </button>
          <button type="button" className="strike" onClick={() => run((chain) => chain.toggleStrike())} title="删除线">
            S
          </button>
          <button type="button" className="mono" onClick={() => run((chain) => chain.toggleCode())} title="行内代码">
            {'</>'}
          </button>
        </div>

        <div className="spacer" />

        <div className="toolbar-group">
          <button
            type="button"
            className={focusMode ? 'is-on' : ''}
            disabled={viewMode !== 'edit'}
            title={viewMode === 'edit' ? '只显示光标所在块' : '只有编辑视图支持'}
            onClick={() => setFocusMode((value) => !value)}
          >
            专注
          </button>
          <button
            type="button"
            className={typewriterMode ? 'is-on' : ''}
            disabled={viewMode !== 'edit'}
            title={viewMode === 'edit' ? '光标保持在视口中部' : '只有编辑视图支持'}
            onClick={() => {
              setTypewriterMode((value) => !value)
              requestAnimationFrame(() => typewriterRef.current())
            }}
          >
            打字机
          </button>
          <button
            type="button"
            className={sourceMode ? 'is-on' : ''}
            title={
              sourceMode
                ? '回到编辑视图'
                : dirty
                  ? '源码：你的改动 + 编辑器整理结果（不是文件原文）'
                  : '源码：显示文件原文'
            }
            onClick={toggleSource}
          >
            源码
          </button>
          <button
            type="button"
            className={previewMode ? 'is-on' : ''}
            title="只读预览（Ctrl+Shift+P）"
            onClick={togglePreview}
          >
            预览
          </button>
        </div>
      </div>

      {findOpen && (
        <Suspense fallback={null}>
          <FindBar
            open
            query={query}
            replacement={replacement}
            matches={matches}
            activeIndex={matchIndex}
            onQueryChange={setQuery}
            onReplacementChange={setReplacement}
            onPrev={prevMatch}
            onNext={nextMatch}
            onReplace={replaceCurrent}
            onReplaceAll={replaceEvery}
            onClose={() => setFindOpen(false)}
          />
        </Suspense>
      )}

      {editor?.isActive('table') && (
        <div className="table-bar">
          <span className="table-bar-label">表格</span>
          <button type="button" onClick={() => run((chain) => chain.addRowBefore())}>
            上插入
          </button>
          <button type="button" onClick={() => run((chain) => chain.addRowAfter())}>
            下插入
          </button>
          <button type="button" onClick={() => run((chain) => chain.addColumnBefore())}>
            左插入
          </button>
          <button type="button" onClick={() => run((chain) => chain.addColumnAfter())}>
            右插入
          </button>
          <button type="button" onClick={() => run((chain) => chain.deleteRow())}>
            删行
          </button>
          <button type="button" onClick={() => run((chain) => chain.deleteColumn())}>
            删列
          </button>
          <button type="button" onClick={() => run((chain) => chain.deleteTable())}>
            删表
          </button>
        </div>
      )}

      <div className="workbench">
        <div className={`sidebar${treeCollapsed ? ' is-collapsed' : ''}`}>
          {!treeCollapsed && (
            <div className="sidebar-tabs">
              <button
                type="button"
                className={sidebarTab === 'files' ? 'is-active' : ''}
                onClick={() => setSidebarTab('files')}
              >
                文件
              </button>
              <button
                type="button"
                className={sidebarTab === 'outline' ? 'is-active' : ''}
                onClick={() => setSidebarTab('outline')}
              >
                大纲
              </button>
            </div>
          )}

          {sidebarTab === 'files' || treeCollapsed ? (
            <FileTree
              workspace={workspace}
              activePath={activeFile?.path ?? null}
              collapsed={treeCollapsed}
              onToggle={() => setTreeCollapsed((value) => !value)}
              onOpenFolder={openFolder}
              onNewFile={newDocument}
              onNewFolder={() => void createFolder()}
              onRefresh={() => void refreshTree()}
              onDeleteFile={(file) => void removeFile(file)}
              trashReason={trashReason}
              refreshing={treeRefreshing}
              onBeforeRename={prepareRename}
              onRenameFile={(file, newName) => void handleRenamedFile(file, newName)}
              onOpenFile={openWorkspaceFile}
            />
          ) : (
            <aside className="file-tree outline-pane">
              <div className="file-tree-list">
                <Suspense fallback={null}>
                  <Outline items={outline} activeId={activeOutline} onJump={jumpTo} />
                </Suspense>
              </div>
            </aside>
          )}
        </div>

        <main id="editor" tabIndex={-1} className="doc-scroll" ref={scrollRef}>
          {hostError && (
            <div className="host-error-banner" role="alert">
              <span>{hostError}</span>
              <button type="button" onClick={() => window.location.reload()}>
                重新载入
              </button>
            </div>
          )}
          {saveError && (
            <div className="save-error-banner" role="alert">
              <span>{saveError}</span>
              <button type="button" onClick={() => saveFileRef.current()}>
                重试
              </button>
              <button type="button" onClick={() => saveAsCopyRef.current()}>
                另存为
              </button>
            </div>
          )}
          {hostDoc && hostDoc.writable === false && (
            <div className="readonly-banner" role="status">
              <span>这个文件目前不能写回。保存会请你另选位置。</span>
              <button type="button" onClick={() => saveAsCopyRef.current()}>
                另存为
              </button>
            </div>
          )}
          {risks.length > 0 && (
            <div className="risk-banner" role="status">
              <span>
                这篇载入时就有会被改写的结构（{risks.length} 类）：{risks.join('；')}
              </span>
              <button type="button" onClick={openSourceOriginal}>
                {sourceMode ? '回到富文本编辑' : '在源码模式打开原文'}
              </button>
              <button type="button" className="risk-dismiss" onClick={() => setRisks([])}>
                知道了
              </button>
            </div>
          )}

          {sourceMode ? (
            <div className="doc-layout source-layout">
              <div className="source-note" role="status">
                <span>
                  源码模式 · {dirty ? '你的改动 + 编辑器整理结果（不是文件原文）' : '文件原文'}
                </span>
                {sourceRefCount > 0 && (
                  <span>
                    这篇有 {sourceRefCount} 条引用式链接定义，富文本编辑保存时会删掉定义
                  </span>
                )}
                <button type="button" onClick={backToRich}>
                  回到富文本编辑
                </button>
              </div>
              <textarea
                className="source-editor"
                value={sourceText}
                spellCheck={false}
                onChange={(event) => setSourceText(event.target.value)}
              />
            </div>
          ) : previewMode ? (
            <PreviewPane bodyHtml={editor?.getHTML() ?? ''} frontmatter={frontmatter} footnotes={footnotes} />
          ) : (
            <div className="doc-layout">
              <div className="doc-column">
                <EditorContent editor={editor} />
              </div>
              <MarginRail
                annotations={annotations}
                tops={tops}
                activeId={activeId}
                analyzing={analyzing}
                unresolved={unresolved}
                simulated={simulated}
                onClose={closeRail}
                goal={analysisGoal}
                onGoalRetry={() => {
                  setAnalysisGoal('')
                  setAnnotations([])
                  void runAnalysis()
                }}
                discussingId={discussingId}
                verifyingId={verifyingId}
                searchReady={settings.searchProvider !== 'off' && settings.searchApiKey.trim().length > 0}
                onVerify={verifySources}
                onRefine={(annotation) => {
                  const list = (annotation.sources ?? [])
                    .map((source, index) => `${index + 1}. ${source.title} — ${source.url}`)
                    .join('\n')
                  void discuss(
                    annotation,
                    `请根据下面这些出处，重写这条批注的「核实」部分：逐条注明是第几号出处；出处不足以支撑的地方，直接说缺什么。\n${list}`,
                  )
                }}
                onRequestLayout={() => setTick((value) => value + 1)}
                onDiscuss={discuss}
                onHover={setActiveId}
                onFocusNote={(annotation) => {
                  if (!editor) return
                  // 点卡片就把正文里的对应句子选中并滚到眼前，专注模式下也顺带切到那一段
                  editor.commands.setTextSelection({ from: annotation.from, to: annotation.to })
                  editor.commands.scrollIntoView()
                  setActiveId(annotation.id)
                }}
                onAccept={accept}
                onDismiss={dismiss}
                registerRef={(id, node) => {
                  if (node) cardRefs.current.set(id, node)
                  else cardRefs.current.delete(id)
                }}
                railRef={railRef}
              />
            </div>
          )}
        </main>
      </div>

      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {notice && notice.kind !== 'error' ? notice.text : ''}
      </div>

      {notice && (
        <div className={`toast${notice.kind === 'error' ? ' is-error' : ''}`} aria-hidden="true">
          <span className="toast-text">{notice.text}</span>
          {notice.action && (
            <button type="button" className="toast-action" onClick={notice.action.onClick}>
              {notice.action.label}
            </button>
          )}
          {notice.actions?.map((entry) => (
            <button key={entry.label} type="button" className="toast-action" onClick={entry.onClick}>
              {entry.label}
            </button>
          ))}
          {notice.kind === 'error' && (
            <button type="button" className="toast-close" aria-label="关闭提示" onClick={() => setNotice(null)}>
              ×
            </button>
          )}
        </div>
      )}

      {bubble && selection.to > selection.from && !analyzing && viewMode === 'edit' && !findOpen && (
        <button
          type="button"
          className="analyze-bubble"
          style={{ top: bubble.top, left: bubble.left }}
          onMouseDown={(event) => event.preventDefault()}
          onClick={runAnalysis}
        >
          分析
        </button>
      )}

      <StatusBar
        stats={sourceMode ? countText(sourceText) : stats}
        mode={viewMode}
        focusMode={focusMode}
        typewriterMode={typewriterMode}
        hasFrontmatter={frontmatter.length > 0}
        hostFileName={hostDoc?.ready ? hostDoc.fileName : undefined}
        draftRestored={draftRestored}
        autoSaveLabel={
          autoSaveScheduled
            ? '自动保存排队中'
            : autoSaveState === 'saved'
              ? `已自动保存 ${new Date(autoSavedAt ?? Date.now()).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`
              : autoSaveState === 'manual'
                ? '需手动保存'
                : autoSaveState === 'failed'
                  ? '自动保存失败'
                  : autoSaveState === 'external'
                    ? '文件已被外部修改'
                    : undefined
        }
        autoSaveTone={
          autoSaveState === 'failed' || autoSaveState === 'external'
            ? 'error'
            : autoSaveState === 'manual'
              ? 'warn'
              : 'ok'
        }
        draftLabel={
          draftShown && initial.savedAt > 0
            ? `草稿 ${new Date(initial.savedAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`
            : undefined
        }
      />

      {railOpen && (
        <button type="button" className="rail-backdrop" aria-label="关闭批注" onClick={closeRail} />
      )}

      <SaveDialog
        open={pendingConfirm !== null}
        losses={pendingConfirm?.losses ?? []}
        onConfirm={confirmSave}
        onCancel={cancelConfirm}
        onOpenSource={() => {
          cancelConfirm()
          openSourceOriginal()
        }}
      />

      {sourceConfirm && (
        <div className="overlay" role="presentation" onMouseDown={() => setSourceConfirm(null)}>
          <div
            className="dialog"
            role="dialog"
            aria-modal="true"
            aria-label="源码与原文确认"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <h2>{sourceConfirm === 'exit' ? '切回富文本编辑？' : '打开源码原文？'}</h2>
            <p className="dialog-note">
              {sourceConfirm === 'exit'
                ? '源码里有未保存的改动。切回富文本会把这些改动写进正文，确定继续？'
                : '当前有未保存的改动，打开源码原文会丢掉它们，确定继续？'}
            </p>
            <div className="dialog-actions">
              <button type="button" onClick={() => setSourceConfirm(null)}>
                取消
              </button>
              <button type="button" className="primary" onClick={resolveSourceConfirm}>
                继续
              </button>
            </div>
          </div>
        </div>
      )}

      {hostDraftPrompt && (
        <div className="overlay" role="presentation" onMouseDown={discardHostDraft}>
          <div
            className="dialog"
            role="dialog"
            aria-modal="true"
            aria-label="恢复宿主草稿"
            aria-labelledby="host-draft-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <h2 id="host-draft-title">有比原文件更新的草稿</h2>
            <p className="dialog-note">
              保存于{' '}
              {new Date(ticksToMillis(hostDraftPrompt.mtime)).toLocaleTimeString('zh-CN', {
                hour: '2-digit',
                minute: '2-digit',
              })}
              。恢复它，还是丢弃并打开原文件？
            </p>
            <div className="dialog-actions">
              <button type="button" onClick={discardHostDraft}>
                丢弃草稿
              </button>
              <button type="button" className="primary" onClick={recoverHostDraft}>
                恢复草稿
              </button>
            </div>
          </div>
        </div>
      )}

      <CloseGuardDialog
        open={closeGuardOpen}
        fileName={hostDoc?.fileName ?? docName}
        onCancel={cancelCloseGuard}
        onSaveDraft={saveDraftAndClose}
        onDiscard={discardAndClose}
      />

      {draftPrompt && (
        <div className="overlay" role="presentation" onMouseDown={keepDraft}>
          <div
            ref={draftDialogRef}
            className="dialog"
            role="dialog"
            aria-modal="true"
            aria-label="未保存的草稿"
            aria-labelledby="draft-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <h2 id="draft-title">有未保存的草稿</h2>
            <p className="dialog-note">
              有未保存的草稿（保存于{' '}
              {new Date(draftPrompt.savedAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}）。打开{' '}
              {draftPrompt.fileName} 会替换它。
            </p>
            <div className="dialog-actions">
              <button type="button" onClick={keepDraft}>
                保留草稿
              </button>
              <button type="button" className="primary" onClick={openHostAnyway}>
                继续打开
              </button>
            </div>
          </div>
        </div>
      )}

      {pendingSwitch && (
        <div className="overlay" role="presentation" onMouseDown={cancelSwitch}>
          <div
            ref={switchDialogRef}
            className="dialog"
            role="dialog"
            aria-modal="true"
            aria-label="切换文档"
            aria-labelledby="switch-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <h2 id="switch-title">这篇还有没保存的改动</h2>
            <p className="dialog-note">切到「{pendingSwitch.name}」之前，要先把当前这篇存下来吗？</p>
            <div className="dialog-actions">
              <button type="button" onClick={cancelSwitch}>
                取消
              </button>
              <button type="button" onClick={discardAndSwitch}>
                不保存
              </button>
              <button type="button" className="primary" onClick={saveAndSwitch}>
                保存并切换
              </button>
            </div>
          </div>
        </div>
      )}

      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0]
          event.target.value = ''
          if (file) void insertImageFile(file)
        }}
      />

      {linkEdit && (
        <InlinePopover anchor={linkEdit.anchor} label="编辑链接" onClose={() => setLinkEdit(null)}>
          <p className="popover-title">链接</p>
          <input
            className="dialog-input"
            value={linkEdit.href}
            autoFocus
            placeholder="https://"
            onChange={(event) => setLinkEdit({ ...linkEdit, href: event.target.value })}
            onKeyDown={(event) => {
              if (event.key === 'Enter') applyLink()
            }}
          />
          <p className="popover-note">地址留空并保存，就把链接变回普通文字。</p>
          <div className="popover-actions">
            <button type="button" onClick={() => setLinkEdit(null)}>
              取消
            </button>
            <button type="button" className="primary" onClick={applyLink}>
              保存
            </button>
          </div>
        </InlinePopover>
      )}

      {mathDraft && (
        <MathDraftPreview top={mathDraft.top} left={mathDraft.left} latex={mathDraft.latex} display={mathDraft.block} />
      )}

      {mathEdit && (
        <MathInlineEditor
          anchor={mathEdit.anchor}
          latex={mathEdit.latex}
          display
          onChange={(latex) => setMathEdit({ ...mathEdit, latex })}
          onCommit={applyMath}
          onCancel={() => setMathEdit(null)}
        />
      )}

      <SettingsDialog
        open={settingsOpen}
        settings={settings}
        onSave={commitSettings}
        onClose={() => setSettingsOpen(false)}
        onShowShortcuts={() => {
          setSettingsOpen(false)
          setShortcutsOpen(true)
        }}
      />

      <ShortcutsDialog open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
    </div>
  )
}
