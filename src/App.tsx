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
import { Mathematics } from '@tiptap/extension-mathematics'
import { Table, TableCell, TableHeader, TableRow } from '@tiptap/extension-table'
import { TaskItem } from '@tiptap/extension-task-item'
import { TaskList } from '@tiptap/extension-task-list'

import { FileMenu } from './components/FileMenu.tsx'
import { FileTree } from './components/FileTree.tsx'
import { InlinePopover } from './components/InlinePopover.tsx'
import { MathDraftPreview } from './components/MathDraftPreview.tsx'
import { MathInlineEditor } from './components/MathInlineEditor.tsx'
import { LinkEditor } from './components/LinkEditor.tsx'
const MarginRail = lazy(() =>
  import('./components/MarginRail.tsx').then((module) => ({ default: module.MarginRail })),
)
const PreviewPane = lazy(() =>
  import('./components/PreviewPane.tsx').then((module) => ({ default: module.PreviewPane })),
)
import { SaveDialog } from './components/SaveDialog.tsx'
import { CloseGuardDialog } from './components/CloseGuardDialog.tsx'

// 查找条与大纲面板只在打开时加载，不占首屏
const FindBar = lazy(() => import('./components/FindBar.tsx').then((module) => ({ default: module.FindBar })))
const Outline = lazy(() => import('./components/Outline.tsx').then((module) => ({ default: module.Outline })))
const QuickOpen = lazy(() => import('./components/QuickOpen.tsx').then((module) => ({ default: module.QuickOpen })))
const SettingsDialog = lazy(() =>
  import('./components/SettingsDialog.tsx').then((module) => ({ default: module.SettingsDialog })),
)
const ShortcutsDialog = lazy(() =>
  import('./components/ShortcutsDialog.tsx').then((module) => ({ default: module.ShortcutsDialog })),
)
// 字数明细面板只在点状态栏时加载
const StatsDetail = lazy(() =>
  import('./components/StatsDetail.tsx').then((module) => ({ default: module.StatsDetail })),
)
import { StatusBar } from './components/StatusBar.tsx'
import { useDialogFocus } from './components/useDialogFocus.ts'
import { errorCopy, messageOf, streamAnnotations, streamChat, type ChatMessage } from './lib/ai.ts'
import {
  buildTextIndex,
  collectDocNotes,
  findRange,
  parseAnnotationStore,
  parseStream,
  readAnnotationStore,
  replaceInWindow,
  resolveAnnotations,
  writeAnnotationStore,
  type Annotation,
  type DocNote,
  type ParsedAnnotation,
} from './lib/annotations.ts'
import { cacheKey, legacyKeyFor, readCache, readCacheText, removeCache, writeCache } from './lib/cache.ts'
import { buildChunkContext, buildContext, splitSelection, type Block, type ContextPayload } from './lib/context.ts'
import { AnnotationDecorations, renderAnnotations, renderFind, renderFocus } from './lib/decorations.ts'
import { MathInputRules } from './lib/mathInput.ts'
import { DISCUSS_SYSTEM_PROMPT } from './lib/prompt.ts'
import { activeLosses, baselineLosses, countReferenceDefinitions, hasReferenceDefinitions, lossLabels, type Loss } from './lib/risk.ts'
import { repairCalloutMarkers } from './lib/escapes.ts'
import { ensureKatex } from './lib/katexLazy.ts'
import { MermaidPreview } from './lib/mermaidPreview.ts'
import { findAll, type Match } from './lib/find.ts'
import { extractFootnotes, joinFootnotes, repairFootnoteRefs } from './lib/footnotes.ts'
import { joinFrontmatter, leadingNewlines, splitFrontmatter } from './lib/frontmatter.ts'
import { serializeDocument, serializeDocumentBody } from './lib/serializeDocument.ts'
import { repairHtml, escapeHtmlForParse } from './lib/html.ts'
import { splitTableCellBreaks } from './lib/tableCellBreaks.ts'
import { protectMathPairs, repairMath } from './lib/math.ts'
import { activeOutlineId, extractOutline, type OutlineItem } from './lib/outline.ts'
import { clampFontSize, DEFAULT_SETTINGS } from './lib/settings.ts'
import { searchWeb } from './lib/search.ts'
import { hasKey, loadSettings, saveSettings, type Settings } from './lib/settings.ts'
import { createSmartTyping } from './lib/smartTyping.ts'
import { countParagraphs, countText, type TextStats } from './lib/wordcount.ts'
import {
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
import { clearAssetCache, resolveAsset, resolveAssetSegments, setAssetDocPath, setAssetResolver } from './lib/assetResolve.ts'
import { ResolvingImage } from './lib/assetImage.ts'
import { getHostTransport } from './lib/hostBridge.ts'
import { loadSession, permissionOf, restorePlan, saveSession } from './lib/session.ts'

declare global {
  interface Window {
    /** 宿主与验收脚本读的脏标记与文档名；round-02 跨组契约，随 [dirty, docName] 更新 */
    __slState?: { dirty: boolean; name: string; readOnly?: boolean; viewMode?: 'edit' | 'source' | 'preview' }
  }
}

const DOC_KEY = 'sidelight.doc.v1'

/** 第一次打开时正文就是示例，文档名也说明这一点，别让三处说法互相矛盾 */
const DEMO_DOC_NAME = '示例 · 侧灯.md'

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

这是 Sidelight 的示例文档。左边写，右边批注。
选中一段文字，按 Ctrl + Enter。侧灯会在对应的句子旁边留一条边注。
## 为什么叫侧灯

主灯是人，侧灯只补光。工具不该替你写，只该在你写完一段之后，告诉你哪里还能更清楚。
写作是件要自己完成的事。有三成的人会在第一章放弃；原因往往不是不会写，是不知道自己在写什么。
## 快捷键
- Ctrl + Enter：对选区下批注
- Ctrl + F：查找替换
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
  /** 选区的字数：中日韩字 + 拉丁词，与字数明细的选区行同口径 */
  words: number
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


/**
 * 把焦点送回正文：关浮层/关查找后都用它，否则下一次击键掉在 body 上（第 34 轮）
 * 模块级常量：不进 useCallback 依赖数组，也省掉陈旧闭包
 */
const focusEditor = () => requestAnimationFrame(() => document.querySelector<HTMLElement>('.ProseMirror')?.focus())

/**
 * 把焦点送进源码框：进源码后不聚焦，之后打的字全掉在 body 上（第 36 轮）。
 * 选择器与关查找条的 `textarea.source-editor` 一致；rAF 等 setViewMode 挂载完再聚焦。
 * 第 37 轮：按比例落 caret——长文里 caret 停在 0 时，第一次击键会插到文首。
 * ratio 缺省/非法时只聚焦、不动选区（关查找条走这条，一次 Esc 不能丢写作位置）。
 */
const focusSourceEditor = (ratio?: number) =>
  requestAnimationFrame(() => {
    const box = document.querySelector<HTMLTextAreaElement>('textarea.source-editor')
    if (!box) return
    // 先落选区再 focus：这个顺序浏览器会把 caret 滚进视口（反序实测停在文首）
    if (ratio === undefined || !Number.isFinite(ratio)) {
      box.focus()
      return
    }
    const at = Math.round(box.value.length * Math.min(1, Math.max(0, ratio)))
    box.setSelectionRange(at, at)
    box.focus()
  })

/** 富文本光标在正文里的相对位置：进源码时按同一比例落 caret（第 37 轮） */
const caretRatioOf = (editor: Editor | null) => {
  if (!editor) return undefined
  const total = Math.max(1, editor.state.doc.content.size)
  return Math.min(1, Math.max(0, editor.state.selection.from / total))
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
  /** 宿主桥每次渲染取一次；Windows/WK 单例稳定，浏览器为 null */
  const host = getHostTransport()
  const [treeCollapsed, setTreeCollapsed] = useState(false)
  const [quickOpen, setQuickOpen] = useState(false)
  /** 窄窗时页边栏变抽屉：顶栏「批注」开关它 */
  const [railOpen, setRailOpen] = useState(false)
  const [sidebarTab, setSidebarTab] = useState<'files' | 'outline'>('files')
  const [annotations, setAnnotations] = useState<Annotation[]>([])
  const [docNotes, setDocNotes] = useState<DocNote[]>([])
  const [analyzing, setAnalyzing] = useState(false)
  const [discussingId, setDiscussingId] = useState<string | null>(null)
  const [verifyingId, setVerifyingId] = useState<string | null>(null)
  const [analysisGoal, setAnalysisGoal] = useState('')
  const [unresolved, setUnresolved] = useState(0)
  const [notice, setNotice] = useState<Notice | null>(null)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [selection, setSelection] = useState<SelectionState>({ chars: 0, words: 0, from: 0, to: 0, source: 'paragraph' })
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
  const [linkEdit, setLinkEdit] = useState<{
    text: string
    href: string
    from: number
    to: number
    focus: 'text' | 'href'
    anchor: DOMRect
  } | null>(null)
  const [mathEdit, setMathEdit] = useState<{
    latex: string
    from: number
    to: number
    block: boolean
    isNew: boolean
    anchor: DOMRect
  } | null>(null)
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
      text: '',
      frontmatter: '',
      footnotes: '',
      name: '未命名.md',
      savedAt: 0,
      readOnly: false,
    }
    try {
      const raw = localStorage.getItem(DOC_KEY)
      if (!raw) return fallback
      const parsed = JSON.parse(raw) as { text?: string; name?: string; savedAt?: number; readOnly?: boolean }
      if (parsed.name === DEMO_DOC_NAME) return fallback
      const text = typeof parsed.text === 'string' ? parsed.text : raw
      const split = splitFrontmatter(text)
      const footnoteSplit = extractFootnotes(split.body)
      return {
        text: footnoteSplit.body,
        frontmatter: split.frontmatter,
        footnotes: footnoteSplit.footnotes,
        name: parsed.name ?? '未命名.md',
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
  // 字数明细面板：null = 关闭；打开时冻结当时的正文与选区文本
  // paragraphs 可选：源码模式解析失败时为 undefined，面板回退到「空行分段」的旧口径
  const [statsDetail, setStatsDetail] = useState<{ text: string; selection: string; paragraphs?: number } | null>(null)

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
  const enterSourceFor = useCallback((text: string, fromLoad = false, caretRatio?: number) => {
    setSourceText(text)
    sourceBaselineRef.current = text
    sourceOriginalEntryRef.current = fromLoad
    setViewMode('source')
    setFocusMode(false)
    setTypewriterMode(false)
    // 载入即源码不抢焦点；用户主动进源码才聚焦，否则之后的击键掉在 body 上（第 36 轮）
    if (!fromLoad) focusSourceEditor(caretRatio)
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
  const openLinkRef = useRef<(anchor: HTMLAnchorElement, pos: number) => void>(() => {})
  const openLinkAtCursorRef = useRef<() => void>(() => {})
  const mathEditRef = useRef<(position: number) => void>(() => {})
  const openMathAtCursorRef = useRef<(block: boolean) => void>(() => {})
  const mathAnchorRef = useRef<DOMRect | null>(null)
  const mathIsNewRef = useRef(false)
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
  /** 文档身份代号：切文档/新建/另存为/改名/删除都递增，旧回包据此作废 */
  const activeDocIdRef = useRef(0)
  const pendingRefreshRef = useRef<{ mode?: 'adopt' | 'check'; activePath?: string } | null>(null)
  const statsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const deriveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const refreshTreeRef = useRef<(options?: { mode?: 'adopt' | 'check'; activePath?: string }) => Promise<Workspace | null>>(
    async () => null,
  )
  /** 新建空文档在首次手动保存前没有基线：不允许自动保存写盘 */
  const hasSavedBaselineRef = useRef(false)
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
  const sentTextRef = useRef<{ id: number; text: string; version?: number } | null>(null)
  const contentVersionRef = useRef(0)
  const savedContentVersionRef = useRef(0)
  const lastResentVersionRef = useRef(-1)
  const draftPromptTokenRef = useRef<string | null>(null)
  const annotationsHydratedRef = useRef(false)

  /** 所有写 DOC_KEY 的路径共用：宿主模式跳过、>256KiB 不写、配额错误吞掉 */
  const persistDocKey = useCallback((text: string) => {
    if (hostModeRef.current || text.length > 256 * 1024) return
    try {
      localStorage.setItem(DOC_KEY, JSON.stringify({ text, name: docNameRef.current, savedAt: Date.now() }))
    } catch {
      // 配额满/禁用：只保留内存
    }
  }, [])
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

  // 智能标点开关走 ref：把 settings 放进 useEditor 依赖会重建编辑器、丢撤销栈
  const smartPunctRef = useRef(true)
  useEffect(() => {
    smartPunctRef.current = settings.smartPunctuation
  }, [settings.smartPunctuation])
  const smartTypingExtension = useMemo(() => createSmartTyping({ isEnabled: () => smartPunctRef.current }), [])

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
      ResolvingImage.configure({ allowBase64: true }),
      Mathematics.configure({
        // 点公式就进编辑：位置交给节点自己报，比从 DOM 反推准
        inlineOptions: {
          onClick: (_node, position) => mathEditRef.current(position),
        },
        blockOptions: {
          onClick: (_node, position) => mathEditRef.current(position),
        },
      }),
      // 表头边界可拖拽改列宽（第 37 轮）：columnResizing 插件已在静态依赖里，JS 增量 0
      ReusableTable.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      TaskList,
      TaskItem.configure({ nested: true }),
      Markdown.configure({ indentation: { style: 'space', size: 2 } }),
      AnnotationDecorations,
      MermaidPreview,
      shortcutExtension,
      smartTypingExtension,
      MathInputRules.configure({
        onBlockCreated: (position) => mathEditRef.current?.(position),
      }),
    ],
    content: '',
    contentType: 'markdown',
    editorProps: {
      attributes: { class: 'editor', spellcheck: 'false', 'aria-label': '正文编辑器' },
      handleKeyDown: (view, event) => {
        let inTable = false
        for (let depth = view.state.selection.$from.depth; depth > 0; depth -= 1) {
          const name = view.state.selection.$from.node(depth).type.name
          if (name === 'table' || name === 'tableRow' || name === 'tableCell' || name === 'tableHeader') {
            inTable = true
            break
          }
        }
        const mod = event.ctrlKey || event.metaKey
        if (inTable && mod && event.key === 'Enter') {
          event.preventDefault()
          editor?.chain().focus().addRowAfter().run()
          return true
        }
        if (inTable && mod && event.key.toLowerCase() === 'l') {
          event.preventDefault()
          editor?.chain().focus().deleteRow().run()
          return true
        }
        // 列表内 Tab / Shift+Tab：缩进 / 反缩进。表格优先（上面已返回），
        // 文档开头的 Tab 仍留给 skip link（那里不在列表项里）
        if (event.key === 'Tab' && !inTable && !event.isComposing) {
          let listKind: 'listItem' | 'taskItem' | null = null
          for (let depth = view.state.selection.$from.depth; depth > 0; depth -= 1) {
            const name = view.state.selection.$from.node(depth).type.name
            if (name === 'listItem' || name === 'taskItem') {
              listKind = name
              break
            }
          }
          if (listKind) {
            event.preventDefault()
            if (event.shiftKey) editor?.chain().focus().liftListItem(listKind).run()
            else editor?.chain().focus().sinkListItem(listKind).run()
            return true
          }
        }
        if (event.key !== 'Tab' || event.shiftKey || event.isComposing) return false
        // 表格里保留默认 Tab（跳格）
        if (inTable) return false
        event.preventDefault()
        const { from, to } = view.state.selection
        // 文档开头保留给 skip link：不清掉无障碍入口
        if (from === 1 && to === 1) return false
        view.dispatch(view.state.tr.insertText('  ', from, to))
        return true
      },
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
      handleClick: (_view, pos, event) => {
        const target = event.target as HTMLElement | null
        if (!target) return false
        const anchor = target.closest('a')
        if (anchor) {
          event.preventDefault()
          openLinkRef.current(anchor as HTMLAnchorElement, pos)
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
      if (statsTimerRef.current) clearTimeout(statsTimerRef.current)
      statsTimerRef.current = setTimeout(() => {
        statsTimerRef.current = null
        setOutline(extractOutline(current.state.doc))
        setStats(countText(current.state.doc.textContent))
      }, 180)

      // 正文派生物（markdown/正则修复/draft）延后 300ms，避免每个键都做全文正则
      if (deriveTimerRef.current) clearTimeout(deriveTimerRef.current)
      deriveTimerRef.current = setTimeout(() => {
        deriveTimerRef.current = null
        const body = repairCalloutMarkers(repairHtml(repairMath(repairFootnoteRefs(current.getMarkdown()))))
        const original = rawTextRef.current
        const draft = joinFrontmatter(
          frontmatterRef.current,
          joinFootnotes(body, footnotesRef.current),
          original ? leadingNewlines(splitFrontmatter(original).body) : undefined,
        )

        // 宿主文档不写 localStorage：大文件会撑爆配额，正文由宿主保管
        if (!hostModeRef.current && draft.length <= 256 * 1024) {
          persistDocKey(draft)
        }

        // 宿主文档：草稿交给宿主写到文档同目录的 .sidelight/drafts
        if (hostModeRef.current) {
          draftSuppressedRef.current = false
          scheduleHostDraftRef.current(draft.replace(/\r\n/g, '\n'))
        }

        // 有磁盘目录时，再往 .sidelight/drafts 写一份。
        const file = fileRef.current
        const space = workspaceRef.current
        if (file?.path && space) {
          if (draftTimerRef.current) clearTimeout(draftTimerRef.current)
          draftTimerRef.current = setTimeout(() => {
            void (async () => {
              // 保存成功会清掉这个计时器并推进代际；已经在飞的一轮要在每个 await 后自己复查。
              const targetPath = file.path
              const generation = draftGenerationRef.current
              const stale = () =>
                !dirtyRef.current ||
                fileRef.current?.path !== targetPath ||
                deletingRef.current ||
                generation !== draftGenerationRef.current
              if (stale()) return
              const dir = await parentDirectory(space, file.path)
              if (!dir || stale()) return
              const key = cacheKey(file.name)
              await writeCache(dir, 'draft', key, draft)
              // writeCache 内部还有几段 await：保存可能就落在里面，这里补删刚写下的草稿
              if (stale()) {
                await removeCache(dir, 'draft', key)
                return
              }
              const legacy = legacyKeyFor(file.name)
              if (legacy) await removeCache(dir, 'draft', legacy)
            })()
          }, 800)
        }
      }, 300)

      // 停笔 2 秒自动保存（默认开；有结构损失/输入法组合/模态时不动）
      scheduleAutoSaveRef.current()
    },
    onSelectionUpdate: ({ editor: current }) => {
      const { from, to } = current.state.selection
      const context = buildContext(readBlocks(current), from, to)
      const selected = from === to ? '' : current.state.doc.textBetween(from, to, '\n')
      // 只扫一遍：同一个字符串不能调两次 countText（全选 1 MB 时会白扫 1 MB）
      const selectedStats = selected.length > 0 ? countText(selected) : null
      setSelection({
        chars: context.selection.length,
        words: selectedStats ? selectedStats.cjk + selectedStats.words : 0,
        from,
        to,
        source: context.source,
      })
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
      // 单元格里的 <br> 被 escapeHtmlForParse 转义成了文字：解析回 hardBreak，否则重开显示字面 <br>
      const node = editor.schema.nodeFromJSON(splitTableCellBreaks(parsed))
      if (import.meta.env.DEV) performance.mark('sl-parse-done')
      const transaction = editor.state.tr
        .replaceWith(0, editor.state.doc.content.size, node.content)
        .setMeta('addToHistory', false)
      editor.view.dispatch(transaction)
      editor.commands.setTextSelection(0)
      if (import.meta.env.DEV) performance.mark('sl-dispatch-done')
    },
    [editor],
  )

  /** 载入或整篇替换之后，字数、大纲、当前章节都要跟着刷新（这类替换不进 onUpdate） */
  const syncDocInfo = useCallback((current: Editor) => {
    if (statsTimerRef.current) {
      clearTimeout(statsTimerRef.current)
      statsTimerRef.current = null
    }
    const items = extractOutline(current.state.doc)
    setOutline(items)
    setStats(countText(current.state.doc.textContent))
    setActiveOutline(activeOutlineId(items, current.state.selection.from))
  }, [])

  useEffect(() => {
    if (!editor) return
    if (import.meta.env.DEV) performance.mark('sl-load-start')
    setMarkdown(initial.text)
    // 保存基线取「序列化后的正文」而不是原始文本：撤销回初始内容时必须刚好等于基线
    baselineRef.current = serializeDocument(editor, {
      frontmatter: initial.frontmatter,
      footnotes: initial.footnotes,
      original: initial.text,
    }).replace(/\r\n/g, '\n')
    if (import.meta.env.DEV) performance.mark('sl-serialize-done')
    saveTargetRef.current = null
    setDirty(false)
    const { from, to } = editor.state.selection
    const context = buildContext(readBlocks(editor), from, to)
    setSelection({ chars: context.selection.length, words: 0, from, to, source: context.source })
    syncDocInfo(editor)
    if (import.meta.env.DEV) performance.mark('sl-sync-done')
  }, [editor, initial.text, setMarkdown, syncDocInfo])

  useDialogFocus(draftPrompt !== null, draftDialogRef)

  /** 把 `/__doc` 的正文装进编辑器：宿主文档的唯一入口 */
  const applyHostPayload = useCallback(
    (data: HostDocResponse) => {
      if (!editor || typeof data.text !== 'string') return
      // 宿主只有 /__doc，没有目录句柄：清掉上一篇工作区文档的路径，图片一律不解析
      setAssetDocPath('')
      const writable = data.readOnly !== true
      hostModeRef.current = true
      setDocNotes([])
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
      setSelection({ chars: context.selection.length, words: 0, from, to, source: context.source })
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
      setAssetDocPath('')
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

    const applySession = async (session: import('./lib/session.ts').LastSession) => {
      if (cancelled) return
      try {
        if (session.kind === 'workspace') {
          const base: Workspace = { name: session.name, root: null, rootHandle: session.handle }
          const next = await refreshWorkspace(base)
          if (!next) {
            show('上次的文件夹已经不可用，已退回普通文档。')
            return
          }
          setWorkspace(next)
          setSidebarTab('files')
          const target = flattenFiles(next.root).find((file) => file.path === session.path)
          if (!target) {
            show('上次打开的文件不在了，已恢复文件夹但没有打开正文。')
            return
          }
          const text = await readNode(target)
          loadIntoEditor(text, target.name, target)
          saveTargetRef.current = target.handle ? { handle: target.handle, name: target.name } : null
        } else {
          const text = await (await session.handle.getFile()).text()
          const file: WorkspaceFileNode = {
            kind: 'file',
            name: session.name,
            path: session.name,
            handle: session.handle,
          }
          loadIntoEditor(text, session.name, file)
          saveTargetRef.current = { handle: session.handle, name: session.name }
        }
      } catch {
        show('上次的文档恢复失败，已退回普通文档。')
      }
    }

    const restoreFromSession = async (hostDocument: boolean) => {
      const session = await loadSession()
      if (!session) return
      const permission = await permissionOf(session.handle)
      const plan = restorePlan(hostDocument, session, permission)
      if (plan.action === 'restore') {
        await applySession(plan.session)
        return
      }
      if (plan.action !== 'confirm') return
      const label = plan.session.kind === 'workspace' ? plan.session.name : plan.session.name
      setNotice({
        text: `继续上次：${label}？`,
        kind: 'info',
        persist: true,
        action: {
          label: '继续上次',
          onClick: () => {
            void (async () => {
              const handle = plan.session.handle as FileSystemHandle & {
                requestPermission?: (descriptor: { mode: 'readwrite' }) => Promise<PermissionState>
              }
              const requested = handle.requestPermission
                ? await handle.requestPermission({ mode: 'readwrite' })
                : 'granted'
              if (requested === 'granted') await applySession(plan.session)
              else setNotice({ text: '没有获得文件夹权限，可以重新打开。', kind: 'error' })
            })()
          },
        },
      })
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
      if (contentType.includes('text/html')) {
        await restoreFromSession(false)
        return
      }
      // 404 = 宿主没有当前文档（无 argv 启动）：按普通浏览器启动，恢复会话/草稿/示例
      if (response.status === 404) {
        await restoreFromSession(false)
        return
      }
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

      // 宿主重开：正文走宿主，但上次的文件夹/树也要回来（先于草稿提示）
      let hostFile: WorkspaceFileNode | null = null
      let hostDir: FileSystemDirectoryHandle | null = null
      try {
        const session = await loadSession()
        if (session?.kind === 'workspace' && (await permissionOf(session.handle)) === 'granted') {
          const next = await refreshWorkspace({
            name: session.name,
            root: null,
            rootHandle: session.handle,
          })
          if (next && !cancelled) {
            setWorkspace(next)
            setSidebarTab('files')
            const matches = flattenFiles(next.root).filter((file) => file.name === (data.fileName ?? ''))
            if (matches.length === 1) {
              hostFile = matches[0]
              setActiveFile(hostFile)
              hostDir = await parentDirectory(next, hostFile.path)
            }
          }
        }
      } catch {
        // 文件夹恢复失败不影响宿主正文
      }

      // 批注只取一个来源：workspace 缓存优先，没有才读宿主；先于草稿提示
      annotationsHydratedRef.current = false
      try {
        let loaded = false
        if (hostDir && hostFile) {
          const store = await readAnnotationStore(hostDir, cacheKey(hostFile.name))
          if (store.annotations.length > 0 || store.notes.length > 0) {
            if (!cancelled) {
              setAnnotations(store.annotations)
              setDocNotes(store.notes)
            }
            loaded = true
          }
        }
        if (!loaded) {
          const response = await fetch('/__annotations', { cache: 'no-store' })
          if (response.ok) {
            const store = parseAnnotationStore(await response.text())
            if (!cancelled) {
              setAnnotations(store.annotations)
              setDocNotes(store.notes)
            }
          }
        }
      } catch {
        // 批注接口不可用就当没有
      } finally {
        annotationsHydratedRef.current = true
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
    setDocNotes([])
    setAnalysisGoal('')
    setAnalyzing(true)

    const index = buildTextIndex(editor.state.doc)

    // 选区超长时切段，逐段分析；否则只分析一次。
    // 以前超长选区会被截成前 1500 字，看起来就像「只有开头有批注」。
    const chunks = to > from ? splitSelection(blocks, from, to) : []

    let goalSeen = false
    let completed = 0
    let addedCount = 0
    const runNotes: DocNote[] = []
    const pushNotes = (notes: DocNote[]) => {
      if (notes.length === 0) return
      runNotes.push(...notes)
      setDocNotes([...runNotes])
    }

    const controller = new AbortController()
    abortRef.current = controller

    /** 分析一段：送出去、收回来、落位置 */
    const runOne = async (payload: ContextPayload, rangeFrom: number, rangeTo: number) => {
      if (controller.signal.aborted || !payload.selection.trim()) return
      const start = offsetForPosition(index, rangeFrom)
      const windowEnd = Math.max(offsetForPosition(index, rangeTo), start)
      let cursor = start
      let buffer = ''
      let windowReplaced = false

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
          if (item.kind === 'overall') {
            pushNotes([{ id: crypto.randomUUID(), kind: 'overall', note: item.note, createdAt: Date.now() }])
            continue
          }
          const hit = resolveAnnotations([item], index, { start: cursor, end: windowEnd })
          if (hit.length === 0) {
            setUnresolved((count) => count + 1)
            pushNotes(
              collectDocNotes([item], [], Date.now()).map((note) => ({
                ...note,
                kind: 'unresolved' as const,
                quote: item.quote,
              })),
            )
            continue
          }
          const [annotation] = hit
          cursor = Math.max(cursor, offsetForPosition(index, annotation.to))
          if (!windowReplaced) {
            windowReplaced = true
            setAnnotations((previous) =>
              replaceInWindow(previous, [annotation], { start: rangeFrom, end: rangeTo }),
            )
          } else {
            setAnnotations((previous) => [...previous, annotation])
          }
          addedCount += 1
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

      if (context.selection.length >= 3000 || chunks.length > 1) {
        try {
          const summary = `这是摘要，不是全文。\n${blocks
            .map((block) => block.text.trim())
            .filter(Boolean)
            .map((line, index, list) =>
              index === list.length - 1 || line.startsWith('#') ? line : line.slice(0, 180),
            )
            .join('\n')
            .slice(0, 4000)}`
          let fullBuffer = ''
          let fullEvaluations = 0
          await streamAnnotations({
            settings,
            context: {
              before: '',
              selection: summary,
              after: '',
              source: 'selection',
              truncated: true,
              charCount: summary.length,
            },
            mode: 'full',
            signal: controller.signal,
            onDelta: (delta) => {
              fullBuffer += delta
              const parsed = parseStream(fullBuffer)
              fullBuffer = parsed.rest
              for (const item of parsed.items) {
                if (item.kind === 'overall') {
                  pushNotes([{ id: crypto.randomUUID(), kind: 'overall', note: item.note, createdAt: Date.now() }])
                } else if (item.kind === 'evaluation' && fullEvaluations < 2) {
                  fullEvaluations += 1
                  const fullIndex = buildTextIndex(editor.state.doc)
                  const hit = resolveAnnotations([item], fullIndex, {
                    start: 0,
                    end: fullIndex.text.length - 1,
                  })
                  if (hit.length > 0) {
                    setAnnotations((previous) => [...previous, hit[0]])
                    addedCount += 1
                  } else {
                    setUnresolved((count) => count + 1)
                    pushNotes([
                      {
                        id: crypto.randomUUID(),
                        kind: 'unresolved',
                        note: item.note,
                        quote: item.quote,
                        createdAt: Date.now(),
                      },
                    ])
                  }
                }
              }
            },
          })
        } catch {
          // 全文总评失败不影响分段结果
        }
      }

      if (!goalSeen && !controller.signal.aborted) {
        show('模型没按约定格式回，重试一次看看。')
      }
      if (chunks.length > 1 && completed > 1) {
        show(`长文分成 ${chunks.length} 段分析，已处理 ${completed} 段。`)
      }
      if (addedCount > 0 && window.matchMedia('(max-width: 1119px)').matches) openRail()
    } catch (error) {
      const aborted = error instanceof DOMException && error.name === 'AbortError'
      if (!aborted) fail(error, () => analyzeRef.current())
    } finally {
      if (abortRef.current === controller) abortRef.current = null
      setAnalyzing(false)
    }
  }, [editor, settings, analyzing, openRail])

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
        { role: 'system', content: DISCUSS_SYSTEM_PROMPT },
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
      contentVersionRef.current += 1
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
        if (!annotationsHydratedRef.current) return
        if (hostModeRef.current) {
          host?.postMessage({
            v: 1,
            type: 'annotations-save',
            id: `annotations-${Date.now()}`,
            text: JSON.stringify({ v: 2, annotations, notes: docNotes }),
          })
          return
        }
        const dir = await cacheDirFor()
        const file = fileRef.current
        if (!dir || !file) return
        if (annotations.length === 0 && docNotes.length === 0) {
          await removeCache(dir, 'annotations', cacheKey(file.name))
          return
        }
        const key = cacheKey(file.name)
        await writeAnnotationStore(dir, key, { v: 2, annotations, notes: docNotes }, false)
        const legacy = legacyKeyFor(file.name)
        if (legacy) await removeCache(dir, 'annotations', legacy)
      })()
    }, 600)
    return () => clearTimeout(timer)
  }, [annotations, docNotes, cacheDirFor])

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
      persistDocKey(sourceText)
    } catch {
      // 存储不可用时只保留内存
    }
  }, [sourceMode, sourceText])

  // 首屏把光标送进正文：对话框/查找/切换确认打开时不抢焦点
  useEffect(() => {
    if (!editor) return
    const frame = requestAnimationFrame(() => {
      if (settingsOpen || shortcutsOpen || findOpen || pendingConfirm || pendingSwitch) return
      if (document.activeElement && document.activeElement !== document.body) return
      document.querySelector<HTMLElement>('.ProseMirror')?.focus()
    })
    return () => cancelAnimationFrame(frame)
  }, [editor])

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
      if (!space || !space.rootHandle) return
      const dir = await parentDirectory(space, file.path)
      if (!dir) return
      const key = cacheKey(file.name)
      const store = await readAnnotationStore(dir, key)
      let saved = store.annotations
      let savedNotes = store.notes
      if (saved.length === 0 && savedNotes.length === 0) {
        const raw = await readCache(dir, 'annotations', key, legacyKeyFor(file.name))
        if (raw) {
          const legacy = parseAnnotationStore(raw)
          saved = legacy.annotations
          savedNotes = legacy.notes
          await writeAnnotationStore(dir, key, { v: 2, annotations: saved, notes: savedNotes }, true)
        }
      }
      if (saved.length === 0 && savedNotes.length === 0) return

      try {
        const index = buildTextIndex(editor.state.doc)
        const restored: Annotation[] = []
        const missing: DocNote[] = []
        for (const item of saved) {
          if (!item?.quote) continue
          const hit = findRange(index, item.quote, 0)
          if (!hit) {
            missing.push({
              id: crypto.randomUUID(),
              kind: 'unresolved',
              note: item.note,
              quote: item.quote,
              createdAt: Date.now(),
            })
            continue
          }
          restored.push({ ...item, from: hit.from, to: hit.to })
        }
        setDocNotes([...savedNotes, ...missing])
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
      // 必须早于下面的 setMarkdown：它同步 dispatch 建 NodeView，图片解析现读这个路径
      // 读 workspaceRef 而不是 workspace：本函数的 deps 里没有 workspace，闭包会一直看到 null
      setAssetDocPath(file?.path ?? (workspaceRef.current ? `${workspaceRef.current.name}/${name}` : ''))
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
      hasSavedBaselineRef.current = false
      savedContentVersionRef.current = contentVersionRef.current
      loadEpochRef.current += 1
      activeDocIdRef.current += 1
      setSaveWarned(false)
      setDraftShown(false)
      setAnalysisGoal('')
      // 切换文档时掐断正在跑的批注请求，结果不再落到新文档上
      abortRef.current?.abort()
      setAnalyzing(false)
      if (import.meta.env.DEV) performance.mark('sl-load-start')
      setMarkdown(footnoteSplit.body)
      // 载入即存在的结构损失才算基线；之后只拦仍命中同一结构位置的
      // 一次全文序列化同时给下面两处用：原来是两次入参逐字相同的调用（1 MB 文档纯浪费）
      const serialized = serializeDocument(editor, {
        frontmatter: split.frontmatter,
        footnotes: footnoteSplit.footnotes,
        original: text,
      })
      if (import.meta.env.DEV) performance.mark('sl-serialize-done')
      baselineLossesRef.current = text.length > 0 ? baselineLosses(text, serialized) : []
      setRisks(lossLabels(baselineLossesRef.current))
      // 基线用序列化结果：撤销回到载入态时应当刚好等于它
      baselineRef.current = serialized.replace(/\r\n/g, '\n')
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
      setDocNotes([])
      setUnresolved(0)
      setNotice(null)
      setDirty(false)
      setSourceRefCount(countReferenceDefinitions(text))
      if (text.length > 0 && hasReferenceDefinitions(text)) enterSourceFor(text, true)
      else setViewMode('edit')
      try {
        persistDocKey(text)
      } catch {
        // 大文件/配额满：内存里继续，别让载入失败
      }
      syncDocInfo(editor)
      if (import.meta.env.DEV) performance.mark('sl-sync-done')
      annotationsHydratedRef.current = false
      void restoreAnnotationsFor(file).finally(() => {
        annotationsHydratedRef.current = true
      })
      if (file?.handle) {
        const space = workspaceRef.current
        if (space?.rootHandle) {
          void saveSession({
            kind: 'workspace',
            handle: space.rootHandle,
            name: space.name,
            path: file.path,
          })
        } else {
          void saveSession({ kind: 'file', handle: file.handle, name: file.name })
        }
      }
      // 文件夹文档：.sidelight 草稿比磁盘新才提示恢复（同一文档只弹一次）
      if (file?.handle && workspaceRef.current) {
        void (async () => {
          try {
            const disk = await file.handle!.getFile()
            const dir = await parentDirectory(workspaceRef.current!, file.path)
            const cached = dir ? await readCacheText(dir, 'draft', cacheKey(file.name)) : null
            if (!cached || cached.mtime <= disk.lastModified || cached.text === text) return
            if (draftPromptTokenRef.current === file.path) return
            draftPromptTokenRef.current = file.path
            const key = cacheKey(file.name)
            setNotice({
              text: '发现比磁盘新的草稿。恢复草稿，还是丢弃并保留磁盘正文？',
              kind: 'info',
              persist: true,
              actions: [
                {
                  label: '恢复草稿',
                  onClick: () => {
                    setMarkdown(cached.text)
                    setDirty(true)
                    dirtyRef.current = true
                    setNotice(null)
                  },
                },
                {
                  label: '丢弃',
                  onClick: () => {
                    void (async () => {
                      if (dir) await removeCache(dir, 'draft', key)
                      setNotice(null)
                    })()
                  },
                },
              ],
            })
          } catch {
            // 草稿读不到就当没有
          }
        })()
      }
    },
    [editor, enterSourceFor, setMarkdown, restoreAnnotationsFor, syncDocInfo],
  )

  // 切换文档前先拦住未保存的改动
  const requestLoad = useCallback(
    (text: string, name: string, file: WorkspaceFileNode | null) => {
      void (async () => {
        const epoch = ++loadEpochRef.current
        // 宿主写回还在飞：先等它结束（或超时），别让旧回包改到新文档
        await Promise.all([waitForHostSave(), waitForCommit()])
        if (epoch !== loadEpochRef.current) return
        if (dirty) {
          // 选中的就是当前这篇（快速打开里回车、文件树上点自己）：没有切换可言，别弹「要保存吗」
          const same = file?.handle && activeFile?.handle ? await file.handle.isSameEntry(activeFile.handle) : false
          if (same) {
            focusEditor()
            return
          }
          setPendingSwitch({ text, name, file })
          return
        }
        loadIntoEditor(text, name, file)
      })()
    },
    [dirty, loadIntoEditor, waitForHostSave, activeFile],
  )

  const openFolder = useCallback(async () => {
    try {
      const next = await pickWorkspace()
      if (next) {
        setWorkspace(next)
        setSidebarTab('files')
        setNotice(null)
        if (next.rootHandle) {
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

  /** 超大文件被拒时说清正文仍是哪一篇：否则用户以为窗口里是刚点的大文件，Ctrl+S 会写错篇 */
  const tooLargeNote = (name: string) => `「${name}」超过 5.5 MiB，仍在「${docNameRef.current}」`

  const openSingleFile = useCallback(async () => {
    try {
      const picked = await pickFile()
      if (!picked) return
      if ('tooLarge' in picked) {
        setNotice({ text: tooLargeNote(picked.name), kind: 'error' })
        return
      }
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
        setNotice({
          text: error instanceof Error && error.message.includes('文件太大') ? tooLargeNote(file.name) : messageOf(error),
          kind: 'error',
        })
      }
    },
    [requestLoad],
  )

  /** 刷新文件树：adopt=按新路径重绑（新建/另存为/改名）；check=找不到就清成只能另存为 */
  const refreshTree = useCallback(
    async (options?: { mode?: 'adopt' | 'check'; activePath?: string }): Promise<Workspace | null> => {
      const space = workspaceRef.current
      if (!space || !space.rootHandle) return null
      if (refreshingRef.current) {
        // 排队合并：当前刷新结束后用最新一次参数再跑一遍
        pendingRefreshRef.current = options ?? {}
        return null
      }
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
        const mode = options?.mode ?? 'check'
        const targetPath = options?.activePath ?? (deletingRef.current ? null : activeFile?.path)
        let missingName: string | null = null
        if (targetPath) {
          const rebound = afterByPath.get(targetPath)
          if (rebound) {
            // 只有编辑器里载入的就是这个文件，才把身份与保存目标接过去。
            // 删除后撤销、改名「非当前」文件时，rebound 是别的文件：接过去会把当前正文写进它。
            if (fileRef.current?.path === rebound.path) {
              setActiveFile(rebound)
              saveTargetRef.current = rebound.handle ? { handle: rebound.handle, name: rebound.name } : null
            }
          } else if (mode === 'check') {
            setActiveFile(null)
            saveTargetRef.current = null
            missingName = activeFile?.name ?? targetPath.split('/').pop() ?? targetPath
          }
          // adopt 找不到时保留调用方刚设置的新值，不拿旧闭包清空
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
        const queued = pendingRefreshRef.current
        pendingRefreshRef.current = null
        if (queued) void refreshTreeRef.current(queued)
      }
    },
    [activeFile, show],
  )
  refreshTreeRef.current = refreshTree

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
      activeDocIdRef.current += 1
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
      if (space && oldFile.name !== newName && cacheKey(oldFile.name) !== cacheKey(newName)) {
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

      await refreshTree({ mode: 'adopt', activePath: newPath })
    },
    [activeFile, refreshTree],
  )

  const createFolder = useCallback(async () => {
    const space = workspaceRef.current
    const root = space ? space.rootHandle : null
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
      const root = space ? space.rootHandle : null
      if (!root) return
      deletingRef.current = true
      autoSaveGenerationRef.current += 1
      loadEpochRef.current += 1
      activeDocIdRef.current += 1
      cancelAutoSaveRef.current()
      if (draftTimerRef.current) {
        clearTimeout(draftTimerRef.current)
        draftTimerRef.current = null
      }
      setPendingConfirm(null)
      setPendingSwitch(null)
      try {
        await waitForCommit()
        const { deleteDocumentToTrash } = await import('./lib/trash.ts')
        const wasActive = activeFile?.path === node.path
        const files = flattenFiles(workspaceRef.current?.root ?? null)
        const index = files.findIndex((file) => file.path === node.path)
        const nextFile = files[index + 1] ?? files[index - 1] ?? null
        const currentText = wasActive && dirtyRef.current ? currentMarkdown() : null
        const result = await deleteDocumentToTrash(root, node, currentText)
        if (!result.ok) {
          setNotice({ text: result.error ?? '移到回收站失败。', kind: 'error' })
          return
        }
        // 缓存已提前搬进 trash，不再 removeCache
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
                    const { restoreDocumentFromTrash } = await import('./lib/trash.ts')
                    const restored = await restoreDocumentFromTrash(root, node, trashFile)
                    if (restored.ok) {
                      // 用最新一次 refreshTree（它捕获的 activeFile 是当前正文），
                      // 不用删除那一刻的闭包，否则会把被删文件接成 activeFile
                      await refreshTreeRef.current()
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
    // 新建/关闭文档：始终从空白未命名文档开始，不替用户在文件夹里建文件
    loadIntoEditor('', '未命名.md', null)
    focusEditor()
  }, [loadIntoEditor, waitForHostSave])

  /** 新建前先走同一套未保存确认；取消则什么都不做 */
  const createWorkspaceFile = useCallback(async () => {
    await waitForHostSave()
    const space = workspaceRef.current
    const root = space?.rootHandle
    if (!space || !root || space.root?.kind !== 'dir') {
      loadIntoEditor('', '未命名.md', null)
      focusEditor()
      return
    }
    try {
      const name = nextNewName(space)
      const handle = await root.getFileHandle(name, { create: true })
      const path = `${space.name}/${name}`
      const file: WorkspaceFileNode = { kind: 'file', name, path, handle }
      loadIntoEditor('', name, file)
      setActiveFile(file)
      saveTargetRef.current = { handle, name }
      await refreshTree({ mode: 'adopt', activePath: path })
      show(`已新建 ${name}`)
      show(`已新建 ${name}`)
      focusEditor()
    } catch (error) {
      setNotice({ text: `新建失败：${reasonOf(error)}。`, kind: 'error' })
    }
  }, [loadIntoEditor, nextNewName, refreshTree, show, waitForHostSave])

  const newFileInWorkspace = useCallback(() => {
    if (dirty) {
      setPendingSwitch({ text: '', name: '未命名.md', file: null, after: () => void createWorkspaceFile() })
      return
    }
    void createWorkspaceFile()
  }, [createWorkspaceFile, dirty])

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
    (name: string, target: FileWriteTarget, normalized: string, withEol: string, keepLosses = false, expected?: { epoch: number; docId: number; path: string }) => {
      if (
        expected &&
        (expected.epoch !== loadEpochRef.current ||
          expected.docId !== activeDocIdRef.current ||
          expected.path !== (fileRef.current?.path ?? expected.path))
      ) {
        // 写盘期间文档身份已变：只丢弃这次收尾，不改 activeFile/docName/baseline/dirty
        return false
      }
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
      hasSavedBaselineRef.current = true
      savedContentVersionRef.current = contentVersionRef.current
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
        host?.postMessage({ v: 1, type: 'forget' })
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
      try {
        persistDocKey(withEol)
      } catch {
        // 配额满：磁盘已保存成功，本地兜底可失败
      }
      // 保存成功等于草稿作废：停掉还没触发的草稿计时器，并推进代际让在飞的一轮写入跳过
      if (draftTimerRef.current) {
        clearTimeout(draftTimerRef.current)
        draftTimerRef.current = null
      }
      draftGenerationRef.current += 1
      // 另存为之后旧名字的草稿留着会误导恢复，两个名字都清一遍
      void (async () => {
        const dir = await cacheDirFor()
        if (!dir) return
        await removeCache(dir, 'draft', cacheKey(oldName))
        await removeCache(dir, 'draft', cacheKey(name))
      })()
      return true
    },
    [cacheDirFor, hostDoc],
  )

  /** 真正写盘：有句柄写句柄，没有就弹保存位置；调用前已经过差异门 */
  /** 有真实工作区时，无句柄保存落到根目录，不弹系统另存为 */
  const saveIntoWorkspace = useCallback(
    async (normalized: string, withEol: string): Promise<boolean> => {
      const space = workspaceRef.current
      const root = space?.rootHandle
      if (!space || !root || space.root?.kind !== 'dir') return false
      const name = nextNewName(space)
      const handle = await root.getFileHandle(name, { create: true })
      const file: WorkspaceFileNode = { kind: 'file', name, path: `${space.name}/${name}`, handle }
      await writeNode(file, withEol)
      finishSaved(name, { handle, name }, normalized, withEol)
      setActiveFile(file)
      await refreshTree({ mode: 'adopt', activePath: file.path })
      setNotice({ text: `已保存到 ${name}`, kind: 'info', persist: true })
      return true
    },
    [finishSaved, nextNewName, refreshTree],
  )

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
          // 删除开始后旧句柄不能再写；刷新只影响绑定，不阻止已开始的写盘
          if (
            deletingRef.current ||
            generation !== autoSaveGenerationRef.current ||
            (currentHandle !== null && target.handle !== currentHandle)
          ) {
            return false
          }
          const startedEpoch = loadEpochRef.current
          const startedDocId = activeDocIdRef.current
          const startedPath = fileRef.current?.path ?? ''
          const previousText = await target.handle.getFile().then((file) => file.text()).catch(() => null)
          const writing = writeNode(
            { kind: 'file', name: target.name, path: activeFile?.path ?? target.name, handle: target.handle },
            withEol,
            () =>
              startedEpoch === loadEpochRef.current &&
              startedDocId === activeDocIdRef.current &&
              startedPath === (fileRef.current?.path ?? '') &&
              !deletingRef.current,
          )
          performingCommitRef.current = writing
          try {
            await writing
          } finally {
            performingCommitRef.current = null
          }
          // 写后身份校验：不匹配就只清收尾，不回写身份状态
          if (
            startedEpoch !== loadEpochRef.current ||
            startedDocId !== activeDocIdRef.current ||
            startedPath !== (fileRef.current?.path ?? '') ||
            target.handle !== (saveTargetRef.current?.handle ?? target.handle)
          ) {
            // 写盘期间身份已变：把旧正文写回去，别把新字留在旧文件里
            if (previousText !== null) {
              try {
                const writable = await target.handle.createWritable()
                await writable.write(previousText)
                await writable.close()
              } catch {
                // 回滚失败也不改身份；文件内容以磁盘为准
              }
            }
            return false
          }
          // 删除与写回交错：删除已经发生就把刚写回的文件再删一次；刷新不删
          if (deletingRef.current) {
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
          const ok = finishSaved(target.name, target, normalized, withEol, keepLosses, {
            epoch: startedEpoch,
            docId: startedDocId,
            path: startedPath,
          })
          return ok
        }

        if (await saveIntoWorkspace(normalized, withEol)) return true
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
        loadEpochRef.current += 1
        activeDocIdRef.current += 1
        finishSaved(result.name, result, normalized, withEol)
        return true
      } catch (error) {
        setNotice({ text: `保存失败：${reasonOf(error)}。改动还在，可以再试一次。`, kind: 'error' })
        return false
      }
    },
    [activeFile, docName, finishSaved, saveBlob, saveIntoWorkspace],
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
    if (!host) {
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
        if (!host) {
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
        host.postMessage(message)
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
      if (!host || !hostModeRef.current || draftSuppressedRef.current) return
      const id = (nextDraftIdRef.current += 1)
      const generation = draftGenerationRef.current
      let resolveAck: () => void = () => {}
      const ack = new Promise<void>((resolve) => {
        resolveAck = resolve
      })
      draftPendingRef.current = { id, generation, ack, resolve: resolveAck }
      host.postMessage({ v: 1, type: 'draft-save', id, text })
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
    host?.postMessage({ v: 1, type: 'draft-clear', id: (nextDraftIdRef.current += 1) })
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
    if (file?.path && space) {
      const dir = await parentDirectory(space, file.path)
      if (dir) {
        await writeCache(dir, 'draft', cacheKey(file.name), text)
        return
      }
    }
    // 单文件打开拿不到目录：退回 localStorage，至少关窗还能恢复
    persistDocKey(text)
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
    // 新建后还没有任何基线（0 字节、没保存过）：首次手动保存前绝不自动写盘
    if (originalText === null && !hasSavedBaselineRef.current) return
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
    host?.postMessage({ v: 1, type: 'close-answer', action: 'cancel' })
  }, [])

  const saveDraftAndClose = useCallback(() => {
    const { normalized } = prepareSave()
    setCloseGuardOpen(false)
    host?.postMessage({ v: 1, type: 'close-answer', action: 'save-draft', text: normalized })
  }, [prepareSave])

  const discardAndClose = useCallback(() => {
    setCloseGuardOpen(false)
    host?.postMessage({ v: 1, type: 'close-answer', action: 'discard' })
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
      if (!host || !hostDoc?.ready || !hostDoc.writable) return
      if (pendingIdsRef.current.size > 0) {
        // 保存中再按一次：只记最新一份，回包后补发
        pendingHostSave.current = { text }
        return
      }
      const id = (nextSaveIdRef.current += 1)
      pendingIdsRef.current.add(id)
      savingRef.current = true
      sentTextRef.current = { id, text, version: contentVersionRef.current }
      setSaving(true)
      setSaveError(null)
      // 只发正文，不带任何路径/文件名
      host.postMessage({ v: 1, type: 'save', id, text })
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
      // 回包前又打了字：保 dirty/旧基线/草稿，补发最新正文（同版本只补一次）
      if (typeof sent.version === 'number' && contentVersionRef.current !== sent.version) {
        setSaving(false)
        savingRef.current = false
        setSaveError(null)
        setHostDoc((previous) => (previous ? { ...previous, mtime: Number(payload.mtime ?? previous.mtime) } : previous))
        const version = contentVersionRef.current
        if (version !== lastResentVersionRef.current) {
          lastResentVersionRef.current = version
          pendingHostSave.current = { text: currentMarkdown() }
        }
        if (hostSaveWaitersRef.current.length === 0) {
          setNotice({ text: '保存回包前有新改动，正在补发。', kind: 'info' })
        }
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
      // 走到这里说明回包版本 === 当前版本：保存期间没有新输入，可以清宿主草稿
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
    if (!host) return
    const onMessage = (payload: unknown) => {
      const data = payload as
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
    return host.addEventListener(onMessage)
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
        (mod && !event.altKey && (key === 'f' || key === 'h' || key === 'k' || key === 'm' || key === 'p')) ||
        (mod && !event.altKey && event.shiftKey && (key === 'p' || key === 'm')) ||
        (mod && !event.altKey && /^[0-6]$/.test(key)) ||
        (mod && !event.altKey && key === '/') ||
        (mod && event.shiftKey && !event.altKey && (event.code === 'Digit1' || event.code === 'Digit3' || key === 'l')) ||
        (mod && (event.key === '=' || event.key === '+' || event.key === '-' || event.key === '0'))

      if (event.key === 'Escape') {
        // 放在 Escape 判断之内：放外面会把所有按键都吃掉
        if (statsDetail !== null) {
          setStatsDetail(null)
          document.querySelector<HTMLElement>('.stats-trigger')?.focus()
          return
        }
        if (railOpen) {
          setRailOpen(false)
          railToggleRef.current?.focus()
          return
        }
        if (findOpen) {
          setFindOpen(false)
          focusEditor()
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
          focusEditor()
          return
        }
        if (previewMode) {
          togglePreviewRef.current()
          focusEditor()
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
      if (mod && !event.altKey && !event.shiftKey && key === 'k') {
        event.preventDefault()
        openLinkAtCursorRef.current()
        return
      }
      if (mod && !event.altKey && key === 'm') {
        event.preventDefault()
        openMathAtCursorRef.current(event.shiftKey)
        return
      }
      if (mod && !event.altKey && !event.shiftKey && key === 'p') {
        event.preventDefault()
        setQuickOpen(true)
        return
      }
      if (mod && !event.altKey && !event.shiftKey && /^[1-6]$/.test(key)) {
        event.preventDefault()
        editor?.chain().focus().setHeading({ level: Number(key) as 1 | 2 | 3 | 4 | 5 | 6 }).run()
        return
      }
      if (mod && !event.altKey && !event.shiftKey && key === '0') {
        event.preventDefault()
        editor?.chain().focus().setParagraph().run()
        return
      }
      if (mod && !event.altKey && key === '/') {
        event.preventDefault()
        toggleSourceRef.current()
        return
      }
      if (mod && event.shiftKey && !event.altKey && event.code === 'Digit1') {
        event.preventDefault()
        setSidebarTab('outline')
        setTreeCollapsed(false)
        return
      }
      if (mod && event.shiftKey && !event.altKey && event.code === 'Digit3') {
        event.preventDefault()
        setSidebarTab('files')
        setTreeCollapsed(false)
        return
      }
      if (mod && event.shiftKey && !event.altKey && key === 'l') {
        event.preventDefault()
        setTreeCollapsed((value) => !value)
        return
      }
      if (mod && !event.altKey && event.shiftKey && key === 'p') {
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
      if (mod && event.altKey && event.key === '0') {
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
    statsDetail,
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
      const leavingSource = viewMode === 'source' && next !== 'source'
      if (leavingSource) applySource()
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
      // 两个方向都要聚焦，否则键盘用户进源码打的字全丢（第 36 轮）。
      // 预览不是聚焦目标：PreviewPane 是 contentEditable=false 且无 tabindex
      // 按富文本光标的比例落 caret：长文进源码不再把视野甩到文首或文末（第 37 轮）
      if (next === 'source') focusSourceEditor(caretRatioOf(editor))
      else if (leavingSource && next === 'edit') focusEditor()
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
    enterSourceFor(text, false, caretRatioOf(editor))
  }, [editor, sourceMode, backToRich, dirty, originalText, enterSourceFor])

  const resolveSourceConfirm = useCallback(() => {
    const action = sourceConfirm
    setSourceConfirm(null)
    if (action === 'restore') {
      const text = rawTextRef.current ?? originalText
      if (text !== null) enterSourceFor(text, false, caretRatioOf(editor))
      return
    }
    if (action === 'exit') switchView('edit')
  }, [sourceConfirm, originalText, enterSourceFor, switchView, editor])

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

  const openStatsDetail = useCallback(() => {
    setStatsDetail((current) => {
      // 再点一次触发按钮就关掉
      if (current !== null) return null
      if (!editor) return null
      const body = sourceMode ? splitFrontmatter(sourceText).body : null
      const text = body ?? editor.state.doc.textContent
      const { from, to } = editor.state.selection
      // 点状态栏会把焦点移出正文，但 ProseMirror 的选区保留
      const selection = from === to ? '' : editor.state.doc.textBetween(from, to, '\n')
      // 段数按正文文本块算（与编辑模式同口径）；源码解析不了就传 undefined 让面板回退旧口径
      const countInSource = (): number | undefined => {
        const manager = editor.markdown ?? editor.storage.markdown?.manager
        if (!manager) return undefined
        try {
          const node = editor.schema.nodeFromJSON(manager.parse(escapeHtmlForParse(protectMathPairs(body ?? ''))))
          return countParagraphs(node)
        } catch {
          return undefined
        }
      }
      const paragraphs = body === null ? countParagraphs(editor.state.doc) : countInSource()
      return { text, selection, paragraphs }
    })
  }, [editor, sourceMode, sourceText])

  const exportAs = useCallback(
    async (kind: 'html' | 'markdown' | 'text') => {
      if (!editor) return
      setExportOpen(false)
      try {
        // 导出只在用到时加载：首屏不背 fmt/导出模板的字节
        const { buildHtmlDocument, buildPlainText, exportName } = await import('./lib/export.ts')
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
          // 先解析一次再插节点：否则插入瞬间会闪一下破图（失败不影响插入）
          await resolveAsset(relative)
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

  // 工作区图片解析器（第 38 轮）：assets/xxx.png 按文档所在目录读成 blob URL
  useEffect(() => {
    if (!editor) return
    setAssetResolver(async (src, docPath) => {
      const space = workspaceRef.current
      if (!space?.rootHandle) return null
      // 来源校验：宿主（空串）与单文件打开的裸名（图.md）都不许按工作区根解析，
      // 否则会把别人的目录里的同名图显示成本篇的图
      if (!docPath || !docPath.startsWith(space.name + '/')) return null
      try {
        // 从工作区根走：../ 要先从文档目录弹一层，不能拿 parentDirectory 当起点
        const parts = resolveAssetSegments(docPath.split('/').slice(1, -1), src)
        if (!parts) return null
        let dir = space.rootHandle
        for (const segment of parts.slice(0, -1)) dir = await dir.getDirectoryHandle(segment)
        const handle = await dir.getFileHandle(parts[parts.length - 1])
        return URL.createObjectURL(await handle.getFile())
      } catch {
        // 文件不存在/无权限：返回 null 且不缓存，补上文件后还能重试
        return null
      }
    })
    return () => {
      setAssetResolver(null)
      clearAssetCache()
    }
  }, [workspace, editor])

  // 预热本篇的相对路径图片：订阅者晚到或缓存被清后，NodeView 靠订阅把 src 换回来
  useEffect(() => {
    if (!editor) return
    // 宿主重开时 setWorkspace/setActiveFile 会让本 effect 先跑一轮，不能覆盖宿主设的空路径
    if (hostModeRef.current) {
      setAssetDocPath('')
      return
    }
    setAssetDocPath(activeFile?.path ?? (workspace ? `${workspace.name}/${docName}` : ''))
    // 只在编辑视图预热：源码/预览里没有 NodeView，抢着解析会让预览面板「看起来」不靠自己也能显示
    if (viewMode !== 'edit') return
    const sources = new Set<string>()
    editor.state.doc.descendants((node) => {
      if (node.type.name === 'image') {
        const src = String(node.attrs?.src ?? '')
        if (src) sources.add(src)
      }
      return true
    })
    for (const src of sources) void resolveAsset(src)
  }, [workspace, activeFile?.path, docName, editor, viewMode])

  // 点链接进入编辑：选中整段链接文字，弹出文字/地址框
  useEffect(() => {
    openLinkAtCursorRef.current = () => {
      if (!editor) return
      const { from, to, empty } = editor.state.selection
      if (editor.isActive('link')) {
        editor.chain().extendMarkRange('link').run()
        const range = editor.state.selection
        const coords = editor.view.coordsAtPos(range.from)
        setLinkEdit({
          text: editor.state.doc.textBetween(range.from, range.to, ' '),
          href: String(editor.getAttributes('link').href ?? ''),
          from: range.from,
          to: range.to,
          focus: 'text',
          anchor: new DOMRect(coords.left, coords.top, coords.right - coords.left, coords.bottom - coords.top),
        })
        return
      }
      const coords = editor.view.coordsAtPos(from)
      setLinkEdit({
        text: empty ? '' : editor.state.doc.textBetween(from, to, ' '),
        href: '',
        from,
        to,
        focus: empty ? 'href' : 'text',
        anchor: new DOMRect(coords.left, coords.top, coords.right - coords.left, coords.bottom - coords.top),
      })
    }
  }, [editor])

  // 点正文里的链接：把选区扩到整个链接，再弹出同一个文字/地址浮层
  useEffect(() => {
    openLinkRef.current = (anchor: HTMLAnchorElement, pos: number) => {
      if (!editor) return
      const view = editor.view
      const size = view.state.doc.content.size
      const hasLink = (at: number) =>
        at >= 0 && at <= size && view.state.doc.resolve(at).marks().some((mark) => mark.type.name === 'link')
      // 点击位置在链接文字内部；落在内边距/空节点时按 DOM 位置兜底，再没有就静默返回
      let at = pos
      if (!hasLink(at)) {
        try {
          at = view.posAtDOM(anchor, 0)
        } catch {
          return
        }
      }
      if (!hasLink(at)) return
      editor.chain().setTextSelection(at).extendMarkRange('link').run()
      const range = editor.state.selection
      const coords = view.coordsAtPos(range.from)
      setLinkEdit({
        text: editor.state.doc.textBetween(range.from, range.to, ' '),
        href: String(editor.getAttributes('link').href ?? ''),
        from: range.from,
        to: range.to,
        focus: 'text',
        anchor: new DOMRect(coords.left, coords.top, coords.right - coords.left, coords.bottom - coords.top),
      })
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
      const dom = view.nodeDOM(position)
      let rect = dom instanceof HTMLElement ? dom.getBoundingClientRect() : null
      if (!rect || (rect.width === 0 && rect.height === 0)) {
        // 刚建出来的空公式没有尺寸，用光标位置兜底
        const coords = view.coordsAtPos(Math.min(position + 1, state.doc.content.size))
        rect =
          mathAnchorRef.current ??
          new DOMRect(coords.left, coords.top, 1, Math.max(1, coords.bottom - coords.top))
      }
      setMathEdit({
        latex,
        from: position,
        to: position + node.nodeSize,
        block,
        isNew: mathIsNewRef.current,
        anchor: rect,
      })
      mathIsNewRef.current = false
    }
  }, [editor])

  useEffect(() => {
    if (!editor) return
    openMathAtCursorRef.current = (block) => {
      const { from } = editor.state.selection
      const node = editor.state.doc.nodeAt(from)
      if (node && node.type.name.toLowerCase().includes('math')) {
        mathIsNewRef.current = false
        mathEditRef.current(from)
        return
      }
      const coords = editor.view.coordsAtPos(from)
      mathAnchorRef.current = new DOMRect(
        coords.left,
        coords.top,
        coords.right - coords.left,
        coords.bottom - coords.top,
      )
      mathIsNewRef.current = true
      editor.chain().focus().insertContent({ type: block ? 'blockMath' : 'inlineMath', attrs: { latex: '' } }).run()
      const after = editor.state.selection.from
      for (const candidate of [after - 1, after, after - 2]) {
        const hit = editor.state.doc.nodeAt(candidate)
        if (hit && hit.type.name.toLowerCase().includes('math')) {
          mathEditRef.current(candidate)
          return
        }
      }
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
        .insertContentAt(
          { from: mathEdit.from, to: mathEdit.to },
          { type: mathEdit.block ? 'blockMath' : 'inlineMath', attrs: { latex } },
        )
        .run()
    } else {
      editor.commands.focus()
    }
    // 内容为空时保留这个公式块：刚打 $$ 回车建出来就被失焦删掉，用户会以为没生效
    setMathEdit(null)
  }, [editor, mathEdit])

  const applyLink = useCallback(() => {
    if (!editor || !linkEdit) return
    const href = linkEdit.href.trim()
    const text = linkEdit.text.trim() || href
    const { from, to } = linkEdit
    if (href.length === 0) {
      if (to > from) editor.chain().focus().setTextSelection({ from, to }).extendMarkRange('link').unsetLink().run()
      setLinkEdit(null)
      return
    }
    const original = editor.state.doc.textBetween(from, to, ' ')
    if (from === to || text !== original) {
      editor
        .chain()
        .focus()
        .insertContentAt(
          { from, to },
          { type: 'text', text, marks: [{ type: 'link', attrs: { href } }] },
        )
        .setTextSelection(from + text.length)
        .run()
    } else {
      editor.chain().focus().setTextSelection({ from, to }).extendMarkRange('link').setLink({ href }).run()
    }
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
          onCloseDocument={newDocument}
          onSaveAs={() => saveAsCopyRef.current()}
          onOpenFile={() => void openSingleFile()}
          onOpenFolder={() => void openFolder()}
          onFind={() => setFindOpen(true)}
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
                role="menuitem"
                onClick={() => {
                  exportAs('html')
                  exportTriggerRef.current?.focus()
                }}
              >
                HTML
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  exportAs('markdown')
                  exportTriggerRef.current?.focus()
                }}
              >
                <span>Markdown</span>
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  exportAs('text')
                  exportTriggerRef.current?.focus()
                }}
              >
                <span>纯文本</span>
              </button>
              <button
                type="button"
                role="menuitem"
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
          aria-label={`批注（${annotations.length} 条）`}
          title={`批注（${annotations.length} 条）`}
          onClick={() => (railOpen ? closeRail() : openRail())}
        >
          批注
          {railOpen && annotations.length > 0 && <span className="rail-count">{annotations.length}</span>}
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
                  setMenuOpen(false)
                  openMathAtCursorRef.current(false)
                }}
              >
                公式
              </button>
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false)
                  openMathAtCursorRef.current(true)
                }}
              >
                公式块
              </button>
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false)
                  openLinkAtCursorRef.current()
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
            unavailableReason={
              sourceMode
                ? '源码模式下不支持查找定位与替换：切回富文本（Ctrl+/）再查'
                : undefined
            }
            onClose={() => {
              setFindOpen(false)
              if (sourceMode) {
                // 源码模式里 .ProseMirror 不在 DOM：focusEditor() 是空操作，焦点会掉到 body，改回源码输入框。
                // 不传 ratio：关查找条不动 caret，否则一次 Esc 就丢写作位置（第 37 轮）
                focusSourceEditor()
              } else if (!previewMode) {
                focusEditor()
              }
              // 预览模式显式不聚焦：预览 pane 是 contentEditable=false 且无 tabindex，
              // focusEditor() 对它无效；预览只读、快捷键由 window 处理，不存在丢键
            }}
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
            <div className="sidebar-tabs" role="tablist" aria-label="侧栏">
              {(['files', 'outline'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  role="tab"
                  id={`sidebar-tab-${tab}`}
                  aria-selected={sidebarTab === tab}
                  aria-controls={`sidebar-${tab}`}
                  tabIndex={sidebarTab === tab ? 0 : -1}
                  className={sidebarTab === tab ? 'is-active' : ''}
                  onClick={() => setSidebarTab(tab)}
                  onKeyDown={(event) => {
                    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
                    event.preventDefault()
                    const next =
                      event.key === 'Home'
                        ? 'files'
                        : event.key === 'End'
                          ? 'outline'
                          : tab === 'files'
                            ? 'outline'
                            : 'files'
                    setSidebarTab(next)
                    requestAnimationFrame(() => document.getElementById(`sidebar-tab-${next}`)?.focus())
                  }}
                >
                  {tab === 'files' ? '文件' : '大纲'}
                </button>
              ))}
            </div>
          )}

          <FileTree
            panelId="sidebar-files"
            hidden={sidebarTab !== 'files' && !treeCollapsed}
            inert={sidebarTab !== 'files' && !treeCollapsed}
            workspace={workspace}
            activePath={activeFile?.path ?? null}
            collapsed={treeCollapsed}
            onToggle={() => setTreeCollapsed((value) => !value)}
            onOpenFolder={openFolder}
            onNewFile={newFileInWorkspace}
            onNewFolder={() => void createFolder()}
            onRefresh={() => void refreshTree()}
            onDeleteFile={(file) => void removeFile(file)}
            trashReason={trashReason}
            refreshing={treeRefreshing}
            onBeforeRename={prepareRename}
            onRenameFile={(file, newName) => void handleRenamedFile(file, newName)}
            dirtyPath={dirty ? (activeFile?.path ?? null) : null}
            onOpenFile={openWorkspaceFile}
          />

          {sidebarTab === 'outline' && !treeCollapsed && (
            <aside
              id="sidebar-outline"
              role="tabpanel"
              aria-labelledby="sidebar-tab-outline"
              className="file-tree outline-pane"
            >
              <div className="file-tree-list">
                <Suspense fallback={null}>
                  <Outline items={outline} activeId={activeOutline} onJump={jumpTo} />
                </Suspense>
              </div>
            </aside>
          )}
        </div>

        <main
          id="editor"
          tabIndex={-1}
          className="doc-scroll"
          ref={scrollRef}
          onKeyDownCapture={(event) => {
            // 自动聚焦正文后仍保留「第一个 Tab 到 skip link」；只在文档开头劫持
            if (event.key !== 'Tab' || event.shiftKey || !editor) return
            const { from, to } = editor.state.selection
            if (from !== 1 || to !== 1) return
            event.preventDefault()
            document.querySelector<HTMLElement>('.skip-link')?.focus()
          }}
        >
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
            <div className="readonly-banner" role="region" aria-label="只读提示">
              <span>这个文件目前不能写回。保存会请你另选位置。</span>
              <button type="button" onClick={() => saveAsCopyRef.current()}>
                另存为
              </button>
            </div>
          )}
          {risks.length > 0 && (
            <div className="risk-banner" role="region" aria-label="结构风险提示">
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
              <div className="source-note" role="region" aria-label="源码模式说明">
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
                {!sourceMode && !previewMode && stats.chars === 0 && (
                  <div className="editor-placeholder" aria-hidden="true">从这一句开始写</div>
                )}
                <EditorContent editor={editor} />
              </div>
              <Suspense fallback={null}>
              <MarginRail
                annotations={annotations}
                tops={tops}
                activeId={activeId}
                analyzing={analyzing}
                unresolved={unresolved}
                docNotes={docNotes}
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
              </Suspense>
            </div>
          )}
        </main>
      </div>

      {notice && (
        <div className={`toast${notice.kind === 'error' ? ' is-error' : ''}`}>
          <div
            className="toast-live"
            style={{ flex: 1, minWidth: 0 }}
            role={notice.kind === 'error' ? 'alert' : 'status'}
            aria-atomic="true"
          >
            <span className="toast-text">{notice.text}</span>
          </div>
          {(notice.action || notice.actions?.length || notice.kind === 'error') && (
            <div role="group" aria-label="提示操作" style={{ display: 'flex', gap: 6 }}>
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
        stats={sourceMode ? countText(splitFrontmatter(sourceText).body) : stats}
        statsOpen={statsDetail !== null}
        onStatsClick={openStatsDetail}
        selectionWords={viewMode === 'edit' ? selection.words : 0}
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

      {/* 面板必须是 footer 的兄弟节点：8 个脚本用 .status-bar 整栏文本抓字数 */}
      {statsDetail !== null && (
        <Suspense fallback={null}>
          <StatsDetail
            text={statsDetail.text}
            selection={statsDetail.selection}
            paragraphs={statsDetail.paragraphs}
            onClose={() => setStatsDetail(null)}
          />
        </Suspense>
      )}

      {railOpen && (
        <button type="button" className="rail-backdrop" aria-label="关闭批注" onClick={closeRail} />      )}

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

      {quickOpen && (
        <Suspense fallback={null}>
          <QuickOpen
            files={flattenFiles(workspace?.root ?? null).map((file) => ({ name: file.name, path: file.path }))}
            onSelect={(picked) => {
              const node = flattenFiles(workspace?.root ?? null).find((file) => file.path === picked.path)
              if (node) void openWorkspaceFile(node)
              setQuickOpen(false)
              focusEditor()
            }}
            onClose={() => {
              setQuickOpen(false)
              focusEditor()
            }}
          />
        </Suspense>
      )}

      {linkEdit && (
        <LinkEditor
          anchor={linkEdit.anchor}
          text={linkEdit.text}
          href={linkEdit.href}
          focus={linkEdit.focus}
          onTextChange={(text) => setLinkEdit({ ...linkEdit, text })}
          onHrefChange={(href) => setLinkEdit({ ...linkEdit, href })}
          onSave={applyLink}
          onCancel={() => {
            setLinkEdit(null)
            editor?.commands.focus()
          }}
        />
      )}

      {mathDraft && (
        <MathDraftPreview top={mathDraft.top} left={mathDraft.left} latex={mathDraft.latex} display={mathDraft.block} />
      )}

      {mathEdit && (
        <MathInlineEditor
          anchor={mathEdit.anchor}
          latex={mathEdit.latex}
          display={mathEdit.block}
          onChange={(latex) => setMathEdit({ ...mathEdit, latex })}
          onCommit={applyMath}
          onCancel={() => {
            if (mathEdit.isNew) {
              editor?.chain().focus().deleteRange({ from: mathEdit.from, to: mathEdit.to }).run()
            }
            setMathEdit(null)
            editor?.commands.focus()
          }}
        />
      )}

      {settingsOpen && (
        <Suspense
          fallback={
            <div className="overlay">
              <div className="dialog" aria-busy="true">
                <p>正在打开设置…</p>
              </div>
            </div>
          }
        >
          <SettingsDialog
            open
            settings={settings}
            onSave={commitSettings}
            onClose={() => setSettingsOpen(false)}
            onShowShortcuts={() => {
              setSettingsOpen(false)
              setShortcutsOpen(true)
            }}
          />
        </Suspense>
      )}

      {shortcutsOpen && (
        <Suspense
          fallback={
            <div className="overlay">
              <div className="dialog" aria-busy="true">
                <p>正在打开快捷键…</p>
              </div>
            </div>
          }
        >
          <ShortcutsDialog open onClose={() => setShortcutsOpen(false)} />
        </Suspense>
      )}
    </div>
  )
}
