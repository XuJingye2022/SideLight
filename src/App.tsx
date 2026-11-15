import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Extension, type ChainedCommands, type Editor } from '@tiptap/core'
import { Markdown } from '@tiptap/markdown'
import { EditorContent, useEditor } from '@tiptap/react'
import { StarterKit } from '@tiptap/starter-kit'
import type { Node as PMNode } from '@tiptap/pm/model'
import type { Transaction } from '@tiptap/pm/state'
import { TextSelection } from '@tiptap/pm/state'
import { isHistoryTransaction } from 'prosemirror-history'
import { Image } from '@tiptap/extension-image'
import { Mathematics } from '@tiptap/extension-mathematics'
import { Table, TableCell, TableHeader, TableRow } from '@tiptap/extension-table'
import { TaskItem } from '@tiptap/extension-task-item'
import { TaskList } from '@tiptap/extension-task-list'

import { FileTree } from './components/FileTree.tsx'
import { FindBar } from './components/FindBar.tsx'
import { InlinePopover } from './components/InlinePopover.tsx'
import { MathDraftPreview } from './components/MathDraftPreview.tsx'
import { MathInlineEditor } from './components/MathInlineEditor.tsx'
import { MarginRail } from './components/MarginRail.tsx'
import { Outline } from './components/Outline.tsx'
import { PreviewPane } from './components/PreviewPane.tsx'
import { SaveDialog } from './components/SaveDialog.tsx'
import { SettingsDialog } from './components/SettingsDialog.tsx'
import { StatusBar } from './components/StatusBar.tsx'
import { useDialogFocus } from './components/useDialogFocus.ts'
import { messageOf, streamAnnotations, streamChat, type ChatMessage } from './lib/ai.ts'
import {
  buildTextIndex,
  findRange,
  parseStream,
  resolveAnnotations,
  type Annotation,
  type ParsedAnnotation,
} from './lib/annotations.ts'
import { cacheKey, readCache, removeCache, writeCache } from './lib/cache.ts'
import { buildChunkContext, buildContext, splitSelection, type Block, type ContextPayload } from './lib/context.ts'
import { AnnotationDecorations, renderAnnotations, renderFind, renderFocus } from './lib/decorations.ts'
import { MathInputRules } from './lib/mathInput.ts'
import { diffLines, type DiffLine } from './lib/diff.ts'
import { repairCalloutMarkers } from './lib/escapes.ts'
import { buildHtmlDocument, exportName } from './lib/export.ts'
import { findAll, type Match } from './lib/find.ts'
import { extractFootnotes, joinFootnotes, repairFootnoteRefs } from './lib/footnotes.ts'
import { joinFrontmatter, splitFrontmatter } from './lib/frontmatter.ts'
import { repairHtml, escapeHtmlForParse } from './lib/html.ts'
import { protectMathPairs, repairMath } from './lib/math.ts'
import { activeOutlineId, extractOutline, type OutlineItem } from './lib/outline.ts'
import { clampFontSize, DEFAULT_SETTINGS } from './lib/settings.ts'
import { searchWeb } from './lib/search.ts'
import { hasKey, loadSettings, saveSettings, type Settings } from './lib/settings.ts'
import { countText, type TextStats } from './lib/wordcount.ts'
import {
  demoWorkspace,
  parentDirectory,
  pickFile,
  pickWorkspace,
  readNode,
  writeNode,
  type Workspace,
  type WorkspaceFileNode,
} from './lib/workspace.ts'
import { assetFileName, writeAsset } from './lib/asset.ts'

declare global {
  interface Window {
    /** 宿主与验收脚本读的脏标记与文档名；round-02 跨组契约，随 [dirty, docName] 更新 */
    __slState?: { dirty: boolean; name: string }
  }
}

const DOC_KEY = 'sidelight.doc.v1'

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
function findRiskySyntax(text: string): string[] {
  const found: string[] = []
  if (/^\[[^\]]+\]:\s+\S+/m.test(text.replace(/^\[\^[^\]]+\]:.*$/gm, ''))) found.push('引用式链接')
  return found
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

export default function App() {
  const [settings, setSettings] = useState<Settings>(() => loadSettings())
  // 没配 Key 时走本地模拟流，界面必须明说，否则用户会以为模型读过文章
  const simulated = !hasKey(settings)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [workspace, setWorkspace] = useState<Workspace | null>(null)
  const [activeFile, setActiveFile] = useState<WorkspaceFileNode | null>(null)
  const [treeCollapsed, setTreeCollapsed] = useState(false)
  const [sidebarTab, setSidebarTab] = useState<'files' | 'outline'>('files')
  const [annotations, setAnnotations] = useState<Annotation[]>([])
  const [analyzing, setAnalyzing] = useState(false)
  const [discussingId, setDiscussingId] = useState<string | null>(null)
  const [verifyingId, setVerifyingId] = useState<string | null>(null)
  const [analysisGoal, setAnalysisGoal] = useState('')
  const [unresolved, setUnresolved] = useState(0)
  const [notice, setNotice] = useState('')
  const [activeId, setActiveId] = useState<string | null>(null)
  const [selection, setSelection] = useState<SelectionState>({ chars: 0, from: 0, to: 0, source: 'paragraph' })
  const [tops, setTops] = useState<Record<string, number>>({})
  const [bubble, setBubble] = useState<{ top: number; left: number } | null>(null)
  const [tick, setTick] = useState(0)
  const [dirty, setDirty] = useState(false)
  const [outline, setOutline] = useState<OutlineItem[]>([])
  const [activeOutline, setActiveOutline] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'edit' | 'source' | 'preview'>('edit')
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
  const [saveDiff, setSaveDiff] = useState<DiffLine[]>([])
  const [pendingSave, setPendingSave] = useState<string | null>(null)
  const eolRef = useRef<'lf' | 'crlf'>('lf')
  const [pendingSwitch, setPendingSwitch] = useState<{ text: string; name: string; file: WorkspaceFileNode | null } | null>(
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
    const fallback = { text: SAMPLE, frontmatter: '', footnotes: '', name: '未命名.md', savedAt: 0 }
    try {
      const raw = localStorage.getItem(DOC_KEY)
      if (!raw) {
        const split = splitFrontmatter(SAMPLE)
        const footnoteSplit = extractFootnotes(split.body)
        return { ...fallback, text: footnoteSplit.body, frontmatter: split.frontmatter, footnotes: footnoteSplit.footnotes }
      }
      const parsed = JSON.parse(raw) as { text?: string; name?: string; savedAt?: number }
      const text = typeof parsed.text === 'string' ? parsed.text : raw
      const split = splitFrontmatter(text)
      const footnoteSplit = extractFootnotes(split.body)
      return {
        text: footnoteSplit.body,
        frontmatter: split.frontmatter,
        footnotes: footnoteSplit.footnotes,
        name: parsed.name ?? '未命名.md',
        savedAt: typeof parsed.savedAt === 'number' ? parsed.savedAt : 0,
      }
    } catch {
      return fallback
    }
  })

  const [docName, setDocName] = useState(initial.name)
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
  const acceptedRef = useRef<Array<{ annotation: Annotation; from: number; to: number; replacement: string }>>([])
  const fileRef = useRef<WorkspaceFileNode | null>(null)
  const workspaceRef = useRef<Workspace | null>(null)
  const openLinkRef = useRef<(anchor: HTMLAnchorElement) => void>(() => {})
  const mathEditRef = useRef<(position: number) => void>(() => {})
  const toggleSourceRef = useRef<() => void>(() => {})
  const togglePreviewRef = useRef<() => void>(() => {})
  const draftTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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
    window.__slState = { dirty, name: docName }
  }, [dirty, docName])

  // 切换文档的确认框与另外两个对话框共用一套焦点逻辑
  useDialogFocus(pendingSwitch !== null, switchDialogRef)

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
      StarterKit,
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
      Table,
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
      setDirty(true)
      setOutline(extractOutline(current.state.doc))
      setStats(countText(current.state.doc.textContent))

      const body = repairCalloutMarkers(repairHtml(repairMath(repairFootnoteRefs(current.getMarkdown()))))
      const draft = joinFrontmatter(frontmatterRef.current, joinFootnotes(body, footnotesRef.current))

      try {
        localStorage.setItem(DOC_KEY, JSON.stringify({ text: draft, name: docNameRef.current, savedAt: Date.now() }))
      } catch {
        // 存储被禁用或配额满：只保留内存状态，别让一次写盘失败拖垮字数与大纲
      }

      // 有磁盘目录时，再往 .sidelight/drafts 写一份。
      const file = fileRef.current
      const space = workspaceRef.current
      if (file?.path && space && !space.demo) {
        if (draftTimerRef.current) clearTimeout(draftTimerRef.current)
        draftTimerRef.current = setTimeout(() => {
          void (async () => {
            const dir = await parentDirectory(space, file.path)
            if (dir) await writeCache(dir, 'draft', cacheKey(file.name), draft)
          })()
        }, 800)
      }
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
    const { from, to } = editor.state.selection
    const context = buildContext(readBlocks(editor), from, to)
    setSelection({ chars: context.selection.length, from, to, source: context.source })
    syncDocInfo(editor)
  }, [editor, initial.text, setMarkdown, syncDocInfo])

  /* ---------- 批注 ---------- */

  const runAnalysis = useCallback(async () => {
    if (!editor || analyzing) return
    const { from, to } = editor.state.selection
    const blocks = readBlocks(editor)
    const context = buildContext(blocks, from, to)
    if (!context.selection.trim()) {
      setNotice('先选中一段文字，再按 Ctrl + Enter。')
      return
    }

    setNotice('')
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
        setNotice('模型没按约定格式回，重试一次看看。')
      }
      if (chunks.length > 1 && completed > 1) {
        setNotice(`长文分成 ${chunks.length} 段分析，已处理 ${completed} 段。`)
      }
    } catch (error) {
      const aborted = error instanceof DOMException && error.name === 'AbortError'
      if (!aborted) setNotice(messageOf(error))
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
        setNotice('先在设置里选一个搜索服务并填 Key。')
        return
      }

      setVerifyingId(annotation.id)
      try {
        const query = `${annotation.quote} ${annotation.note}`.replace(/\s+/g, ' ').trim().slice(0, 200)
        const sources = await searchWeb({ provider, apiKey }, query)
        setAnnotations((previous) =>
          previous.map((item) => (item.id === annotation.id ? { ...item, sources } : item)),
        )
        setNotice(sources.length > 0 ? `找到 ${sources.length} 条出处` : '没有找到可用的出处')
      } catch (error) {
        setNotice(messageOf(error))
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
        if (!aborted) setNotice(messageOf(error))
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
        setNotice('这条批注指向的位置已经变了，请重新分析这一段。')
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
        await writeCache(dir, 'annotations', cacheKey(file.name), JSON.stringify(annotations))
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

  // 提示显示在全局，源码模式下也看得见；六秒后自动消失
  useEffect(() => {
    if (!notice) return
    const timer = setTimeout(() => setNotice(''), 6000)
    return () => clearTimeout(timer)
  }, [notice])

  useEffect(() => {
    typewriterRef.current = typewriterScroll
  }, [typewriterScroll])

  // 源码模式下的改动也要置脏并写草稿，否则退出前保存会丢
  useEffect(() => {
    if (!sourceMode) return
    if (sourceText === sourceBaselineRef.current) return
    setDirty(true)
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
      const raw = await readCache(dir, 'annotations', cacheKey(file.name))
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
          setNotice(`从 .sidelight 恢复了 ${restored.length} 条批注`)
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
      setFrontmatter(split.frontmatter)
      frontmatterRef.current = split.frontmatter
      setFootnotes(footnoteSplit.footnotes)
      footnotesRef.current = footnoteSplit.footnotes
      setOriginalText(text)
      setSaveWarned(false)
      setRisks(findRiskySyntax(text))
      setAnalysisGoal('')
      // 切换文档时掐断正在跑的批注请求，结果不再落到新文档上
      abortRef.current?.abort()
      setAnalyzing(false)
      setMarkdown(footnoteSplit.body)
      setDocName(name)
      setActiveFile(file)
      setAnnotations([])
      setUnresolved(0)
      setNotice('')
      setDirty(false)
      setViewMode('edit')
      localStorage.setItem(DOC_KEY, JSON.stringify({ text, name, savedAt: Date.now() }))
      syncDocInfo(editor)
      void restoreAnnotationsFor(file)
    },
    [editor, setMarkdown, restoreAnnotationsFor, syncDocInfo],
  )

  // 切换文档前先拦住未保存的改动
  const requestLoad = useCallback(
    (text: string, name: string, file: WorkspaceFileNode | null) => {
      if (dirty) {
        setPendingSwitch({ text, name, file })
        return
      }
      loadIntoEditor(text, name, file)
    },
    [dirty, loadIntoEditor],
  )

  const openFolder = useCallback(async () => {
    try {
      const next = await pickWorkspace()
      if (next) {
        setWorkspace(next)
        setSidebarTab('files')
        setNotice('')
      }
    } catch (error) {
      setNotice(messageOf(error))
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
      setNotice(messageOf(error))
    }
  }, [requestLoad])

  const openWorkspaceFile = useCallback(
    async (file: WorkspaceFileNode) => {
      try {
        const text = await readNode(file)
        requestLoad(text, file.name, file)
      } catch (error) {
        setNotice(messageOf(error))
      }
    },
    [requestLoad],
  )

  const commitSave = useCallback(
    async (text: string) => {
      setPendingSave(null)
      setSaveDiff([])
      setSaveWarned(true)
      setDraftShown(false)

      // 保留原文件的换行风格，Windows 上不至于整篇变成 LF
      const normalized = text.replace(/\r\n/g, '\n')
      const withEol = eolRef.current === 'crlf' ? normalized.replace(/\n/g, '\r\n') : normalized

      if (activeFile?.handle) {
        try {
          await writeNode(activeFile, withEol)
          setOriginalText(withEol)
          setDirty(false)
          setNotice('')
          const dir = await cacheDirFor()
          if (dir) await removeCache(dir, 'draft', cacheKey(activeFile.name))
        } catch (error) {
          setNotice(messageOf(error))
        }
        return
      }

      const blob = new Blob([withEol], { type: 'text/markdown;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = docName
      anchor.click()
      URL.revokeObjectURL(url)
      setOriginalText(withEol)
      // 没有磁盘句柄时只是下载了一份副本，原文件没动，所以仍然算未保存
      setDirty(true)
      setNotice('这篇没有磁盘句柄，已下载一份副本；要写回原文件，请用「打开文件夹」打开它所在的目录。')
    },
    [activeFile, docName, cacheDirFor],
  )

  const currentMarkdown = useCallback(() => {
    if (sourceMode) return sourceText
    if (!editor) return ''
    const body = repairCalloutMarkers(repairHtml(repairMath(repairFootnoteRefs(editor.getMarkdown()))))
    return joinFrontmatter(frontmatterRef.current, joinFootnotes(body, footnotesRef.current))
  }, [editor, sourceMode, sourceText])

  const saveFile = useCallback(() => {
    if (!editor) return
    const text = currentMarkdown()

    // 第一次保存这篇文档时，把规范化造成的改动摆出来；确认过一次就不再打扰
    if (originalText !== null && !saveWarned && originalText !== text) {
      const changed = diffLines(originalText, text).filter((line) => line.kind !== 'same')
      if (changed.length > 0) {
        setSaveDiff(changed)
        setPendingSave(text)
        return
      }
    }

    void commitSave(text)
  }, [editor, originalText, saveWarned, commitSave, currentMarkdown])

  const cancelSwitch = useCallback(() => setPendingSwitch(null), [])

  const discardAndSwitch = useCallback(() => {
    const next = pendingSwitch
    setPendingSwitch(null)
    if (next) loadIntoEditor(next.text, next.name, next.file)
  }, [pendingSwitch, loadIntoEditor])

  const saveAndSwitch = useCallback(() => {
    const next = pendingSwitch
    setPendingSwitch(null)
    void commitSave(currentMarkdown()).then(() => {
      if (next) loadIntoEditor(next.text, next.name, next.file)
    })
  }, [pendingSwitch, commitSave, currentMarkdown, loadIntoEditor])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const mod = event.ctrlKey || event.metaKey
      const key = event.key.toLowerCase()
      const dialogOpen = settingsOpen || pendingSave !== null || pendingSwitch !== null

      if (event.key === 'Escape') {
        if (findOpen) {
          setFindOpen(false)
          return
        }
        if (settingsOpen) {
          setSettingsOpen(false)
          return
        }
        if (pendingSave !== null) {
          setPendingSave(null)
          setSaveDiff([])
          return
        }
        if (pendingSwitch !== null) {
          cancelSwitch()
          return
        }
        if (menuOpen || exportOpen) {
          setMenuOpen(false)
          setExportOpen(false)
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

      // 对话框开着时，全局快捷键一律让路
      if (dialogOpen) return

      if (mod && event.shiftKey && key === 'p') {
        event.preventDefault()
        togglePreviewRef.current()
        return
      }

      if (mod && key === 's') {
        event.preventDefault()
        saveFile()
        return
      }
      if (mod && (key === 'f' || key === 'h')) {
        event.preventDefault()
        setFindOpen(true)
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
    pendingSave,
    pendingSwitch,
    menuOpen,
    exportOpen,
    cancelSwitch,
    settings.fontSize,
    setFontSize,
    sourceMode,
    previewMode,
  ])

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
      setNotice('提示词里没提 JSON 格式，模型可能不按约定回；已保存，可在设置里恢复默认。')
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
    if (sourceText !== sourceBaselineRef.current) setDirty(true)
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
        const text = viewMode === 'source' ? sourceText : currentMarkdown()
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
    [editor, viewMode, sourceText, currentMarkdown, applySource],
  )

  const toggleSource = useCallback(() => {
    switchView(sourceMode ? 'edit' : 'source')
  }, [switchView, sourceMode])

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

  const downloadFile = useCallback((name: string, content: string, type: string) => {
    const blob = new Blob([content], { type })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = name
    anchor.click()
    URL.revokeObjectURL(url)
  }, [])

  const exportAs = useCallback(
    (kind: 'html' | 'markdown' | 'text') => {
      if (!editor) return
      setExportOpen(false)
      if (kind === 'markdown') {
        downloadFile(exportName(docName, 'md'), currentMarkdown(), 'text/markdown;charset=utf-8')
        return
      }
      if (kind === 'html') {
        const html = buildHtmlDocument({
          title: docName,
          bodyHtml: editor.getHTML(),
          fontSize: settings.fontSize,
          frontmatter: frontmatterRef.current,
          footnotes: footnotesRef.current,
        })
        downloadFile(exportName(docName, 'html'), html, 'text/html;charset=utf-8')
        return
      }
      downloadFile(exportName(docName, 'txt'), editor.getText(), 'text/plain;charset=utf-8')
    },
    [editor, docName, currentMarkdown, settings.fontSize, downloadFile],
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
          setNotice(messageOf(error))
        }
      }

      try {
        const dataUrl = await fileToDataUrl(file)
        editor.chain().focus().setImage({ src: dataUrl, alt: file.name }).run()
        setNotice('图片暂时内联在正文里；打开文件夹后再拖入，才会存成 assets 相对路径。')
      } catch (error) {
        setNotice(messageOf(error))
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
    <div className={`app${focusMode ? ' focus-mode' : ''}`}>
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true" />
          Sidelight
        </div>
        <div className="doc-name">
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
          <button type="button" onClick={() => setExportOpen((value) => !value)}>
            导出 ▾
          </button>
          {exportOpen && (
            <div className="menu export-menu">
              <button type="button" onClick={() => exportAs('html')}>
                HTML
              </button>
              <button type="button" onClick={() => exportAs('markdown')}>
                Markdown
              </button>
              <button type="button" onClick={() => exportAs('text')}>
                纯文本
              </button>
              <button
                type="button"
                onClick={() => {
                  setExportOpen(false)
                  window.print()
                }}
              >
                打印 / PDF
              </button>
            </div>
          )}
        </div>
        <button type="button" onClick={saveFile}>
          保存
        </button>
        <button type="button" onClick={() => setSettingsOpen(true)}>
          设置
        </button>
      </header>

      <div className="toolbar">
        <div className="toolbar-group">
          <button
            type="button"
            className={`menu-trigger${menuOpen ? ' is-open' : ''}`}
            onClick={() => setMenuOpen((value) => !value)}
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
            title="显示原始 Markdown"
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

      <FindBar
        open={findOpen}
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
              onOpenSingleFile={openSingleFile}
              onOpenDemo={() => {
                setWorkspace(demoWorkspace())
                setNotice('')
              }}
              onOpenFile={openWorkspaceFile}
            />
          ) : (
            <aside className="file-tree outline-pane">
              <div className="file-tree-list">
                <Outline items={outline} activeId={activeOutline} onJump={jumpTo} />
              </div>
            </aside>
          )}
        </div>

        <div className="doc-scroll" ref={scrollRef}>
          {risks.length > 0 && viewMode === 'edit' && (
            <div className="risk-banner">
              <span>这篇用到 {risks.join('、')}，编辑器读不全，保存会改写。</span>
              <button type="button" onClick={toggleSource}>
                改用源码模式
              </button>
              <button type="button" className="risk-dismiss" onClick={() => setRisks([])}>
                知道了
              </button>
            </div>
          )}

          {sourceMode ? (
            <div className="doc-layout source-layout">
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
        </div>
      </div>

      {notice && (
        <div className={`toast${/失败|错误|无法|不能/.test(notice) ? ' is-error' : ''}`} role="status">
          {notice}
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
        draftLabel={
          draftShown && initial.savedAt > 0
            ? `草稿 ${new Date(initial.savedAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`
            : undefined
        }
      />

      <SaveDialog
        open={pendingSave !== null}
        diff={saveDiff}
        onConfirm={() => {
          if (pendingSave) void commitSave(pendingSave)
        }}
        onCancel={() => {
          // 取消这次保存：保留脏标记，下次保存会重新提示，不当作用户已经看过
          setPendingSave(null)
          setSaveDiff([])
        }}
      />

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
                放弃改动
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
      />
    </div>
  )
}
