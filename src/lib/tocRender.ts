import { Extension } from '@tiptap/core'
import type { Fragment, Node as ProseMirrorNode } from '@tiptap/pm/model'
import { Plugin, PluginKey, type Selection, type Transaction } from '@tiptap/pm/state'
import type { EditorView } from '@tiptap/pm/view'
import { Decoration, DecorationSet } from '@tiptap/pm/view'

import type { OutlineItem } from './outline.ts'
import { hasTocMarker, isTocMarkerText, isTocParagraph, tocEntries, tocShouldRender } from './toc.ts'

/**
 * 第 58 轮 B-106：`[TOC]` 段落的渲染。
 * 做法是文档装饰：在每个 `[TOC]` 段落前挂一个 block widget（`side: -1`），
 * 源段落本身不参与序列化。第 61 轮 B2 起，源段落在编辑视图里收起（`toc-source`），
 * 光标进入时露出（`is-revealed`），所以标记与目录不再同时可见。
 * 点击条目走 `onJump(item)`，与侧栏大纲同一个跳转入口。
 */
export type TocOptions = {
  onJump: (item: OutlineItem) => void
  /**
   * 文档原文：原文里只有被转义的 `\[TOC\]` 时不渲染（第 58 轮 plan-review R2）。
   * 不传按「没有原文」处理，照常渲染。
   */
  original?: () => string | null
}

export type TocBuildOptions = {
  onJump?: (item: OutlineItem) => void
  original?: string | null
  /** 当前选区：只用来算「光标落在哪个 [TOC] 段里」（决定 is-revealed），不给也照常构建 */
  selection?: Selection | null
}

export type TocRange = { from: number; to: number }

export type TocDecorations = {
  set: DecorationSet
  /** 没有挂上目录 widget：没有目录时逐键不必重建（第 58 轮 plan-review R3） */
  active: boolean
  /** 目录条目（点击跳转用；正文改动后只映射，不重扫） */
  entries: OutlineItem[]
  /** 只有目录按钮的装饰集：选区变化重建「标记段显隐」时直接复用，不扫全篇 */
  widgetSet: DecorationSet
  /** 顶层标题区间：改动命中才重建目录（第 61 轮 B1） */
  headings: TocRange[]
  /** 顶层 `[TOC]` 段落区间：既是重建命中的判据，也是隐藏标记段的装饰来源 */
  sources: TocRange[]
  /** 光标落在第几个 `[TOC]` 段里（-1 = 不在任何一段里） */
  revealed: number
  /** 上次构建后有「改了但没重建」的改动：停笔 300 ms 由插件 view 派 resync 兜底 */
  stale: boolean
  /** 诊断计数：真正重建目录的次数（单测用它证明「正文只映射、标题才重建」） */
  builds: number
}

/** 目录按钮的 DOM：`<nav class="sl-toc">` 里一列 `<button>` */
function makeToc(entries: OutlineItem[], onJump: ((item: OutlineItem) => void) | undefined, view?: EditorView): HTMLElement {
  const nav = document.createElement('nav')
  nav.className = 'sl-toc'
  nav.setAttribute('aria-label', '目录')
  nav.setAttribute('contenteditable', 'false')
  entries.forEach((entry, index) => {
    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'sl-toc-item'
    button.dataset.level = String(entry.level)
    button.dataset.tocIndex = String(index)
    button.textContent = entry.text
    // 不抢正文选区：按下先挡默认，点击再跳
    button.addEventListener('mousedown', (event) => event.preventDefault())
    button.addEventListener('click', () => {
      // 正文改动后条目位置只映射没有重建：跳转时按当前插件 state 取条目，别用挂载时捕获的旧位置
      const current = view ? tocKey.getState(view.state)?.entries : null
      const item = current?.[index] ?? entries[index]
      if (item) onJump?.(item)
    })
    nav.append(button)
  })
  return nav
}

/** 光标是否落在某个区间里（`[TOC]` 段落显隐用） */
function revealedIndex(sources: TocRange[], from: number): number {
  for (let index = 0; index < sources.length; index += 1) {
    if (from >= sources[index].from && from <= sources[index].to) return index
  }
  return -1
}

/** 目录按钮 + 标记段显隐合成一个装饰集；只给源区间算类，不重扫正文 */
function composeSet(
  doc: ProseMirrorNode,
  widgetSet: DecorationSet,
  sources: TocRange[],
  revealed: number,
): DecorationSet {
  if (sources.length === 0) return widgetSet
  const decorations = [...widgetSet.find()]
  sources.forEach((range, index) => {
    decorations.push(
      Decoration.node(range.from, range.to, {
        class: index === revealed ? 'toc-source is-revealed' : 'toc-source',
      }),
    )
  })
  return DecorationSet.create(doc, decorations)
}

const emptyState = (): TocDecorations => ({
  set: DecorationSet.empty,
  active: false,
  entries: [],
  widgetSet: DecorationSet.empty,
  headings: [],
  sources: [],
  revealed: -1,
  stale: false,
  builds: 1,
})

/**
 * 纯函数：算出目录装饰（按钮 widget + 标记段隐藏类）。单测直接调它，不建 Editor。
 * 快路径：没有 `[TOC]` 段落直接返回空集；原文只有转义写法时也不挂。
 */
export function buildTocDecorations(doc: ProseMirrorNode, options: TocBuildOptions = {}): TocDecorations {
  const sources: TocRange[] = []
  doc.forEach((node, offset) => {
    if (isTocParagraph(node)) sources.push({ from: offset, to: offset + node.nodeSize })
  })
  if (sources.length === 0) return emptyState()
  const original = options.original ?? null
  const entries = tocEntries(doc)
  // 第 62 轮 B-133：只有「原文里这些标记行全被转义」才不挂；手打的标记当场生效。
  if (!tocShouldRender(sources.length, entries.length, original)) {
    // 原文是转义的 \[TOC\]：不挂目录，也不隐藏那一行（隐藏了字面文本就看不见了）
    return emptyState()
  }
  const headings: TocRange[] = []
  doc.forEach((node, offset) => {
    if (node.type.name === 'heading') headings.push({ from: offset, to: offset + node.nodeSize })
  })
  // key 带上标题签名：标题变了要换 DOM；同一文档两个 [TOC] 也不会撞键（第 58 轮 R3）
  const signature = entries.map((entry) => `${entry.level}:${entry.text}`).join('|')
  const widgets = sources.map((range) =>
    Decoration.widget(range.from, (view) => makeToc(entries, options.onJump, view), {
      side: -1,
      ignoreSelection: true,
      key: `toc@${range.from}-${signature}`,
    }),
  )
  const widgetSet = DecorationSet.create(doc, widgets)
  const reveal = options.selection ? revealedIndex(sources, options.selection.from) : -1
  return {
    set: composeSet(doc, widgetSet, sources, reveal),
    active: true,
    entries,
    widgetSet,
    headings,
    sources,
    revealed: reveal,
    stale: false,
    builds: 1,
  }
}

/** 这次事务有没有可能造出 `[TOC]` 段落：只看光标所在段落和插入片段，不全篇扫 */
function maybeTocTouched(transaction: Transaction): boolean {
  const parent = transaction.selection.$from.parent
  // 段落按整段判定：软换行段落里夹的 `[TOC]` 不重建（第 62 轮 B-132）
  if (parent.isTextblock && isTocMarkerText(parent.textContent)) return true
  for (const step of transaction.steps) {
    const slice = (step as { slice?: { content: Fragment } }).slice
    if (!slice || slice.content.size === 0) continue
    if (hasTocMarker(slice.content.textBetween(0, slice.content.size, '\n', '\ufffc'))) return true
  }
  return false
}

/** 改动区间里出现了标题节点：正文变标题的结构改动（停笔后 resync 兜底） */
function stepsReachHeading(transaction: Transaction): boolean {
  let reached = false
  for (const step of transaction.steps) {
    if (reached) break
    step.getMap().forEach((_oldStart, _oldEnd, newStart, newEnd) => {
      if (reached) return
      const from = Math.max(0, Math.min(newStart, newEnd))
      const to = Math.min(transaction.doc.content.size, Math.max(newStart, newEnd))
      transaction.doc.nodesBetween(from, Math.max(from + 1, to), (node) => {
        if (node.type.name === 'heading') reached = true
      })
    })
  }
  return reached
}

/** 事务的替换区间有没有命中缓存区间；插入（空区间）落在区间内也算命中 */
function stepHits(transaction: Transaction, ranges: TocRange[]): boolean {
  if (ranges.length === 0) return false
  for (const step of transaction.steps) {
    let hit = false
    step.getMap().forEach((oldStart, oldEnd) => {
      if (hit) return
      for (const range of ranges) {
        const inside =
          oldStart === oldEnd
            ? oldStart >= range.from && oldStart < range.to
            : oldStart < range.to && oldEnd > range.from
        if (inside) {
          hit = true
          return
        }
      }
    })
    if (hit) return true
  }
  return false
}

/** 正文改动：位置与条目只映射，不重扫全篇（第 61 轮 B1 的快路径） */
function mapState(previous: TocDecorations, transaction: Transaction): TocDecorations {
  const mapRange = (range: TocRange): TocRange => ({
    from: transaction.mapping.map(range.from, 1),
    to: transaction.mapping.map(range.to, -1),
  })
  const headings = previous.headings.map(mapRange)
  const sources = previous.sources.map(mapRange)
  const entries = previous.entries.map((entry) => {
    const pos = transaction.mapping.map(entry.pos, 1)
    return { ...entry, pos, id: `h-${pos}` }
  })
  const widgetSet = previous.widgetSet.map(transaction.mapping, transaction.doc)
  const revealed = revealedIndex(sources, transaction.selection.from)
  const stale = stepsReachHeading(transaction)
  if (revealed === previous.revealed) {
    return {
      ...previous,
      set: previous.set.map(transaction.mapping, transaction.doc),
      widgetSet,
      headings,
      sources,
      entries,
      stale,
    }
  }
  return { ...previous, set: composeSet(transaction.doc, widgetSet, sources, revealed), widgetSet, headings, sources, entries, revealed, stale }
}

const tocKey = new PluginKey<TocDecorations>('sidelightToc')

/** 插件单独导出：单测用 `EditorState.create({ schema, plugins: [plugin] })` 验重建判据 */
export function createTocPlugin(options: TocOptions): Plugin<TocDecorations> {
  const rebuild = (doc: ProseMirrorNode, selection: Selection, previous?: TocDecorations): TocDecorations => {
    const next = buildTocDecorations(doc, {
      onJump: options.onJump,
      original: options.original?.() ?? null,
      selection,
    })
    return { ...next, builds: (previous?.builds ?? 0) + 1 }
  }
  return new Plugin<TocDecorations>({
    key: tocKey,
    state: {
      init: (_config, state) => rebuild(state.doc, state.selection),
      apply(transaction, previous) {
        // (1) 停笔 300 ms 的 resync：没有 docChanged 也要重建（第 60 轮 plan-review R2）
        if (transaction.getMeta(tocKey)?.resync) return rebuild(transaction.doc, transaction.selection, previous)
        if (!transaction.docChanged) {
          // 只换了选区：只更新「光标在 [TOC] 段里」的显隐，不重扫全篇（B2）
          const revealed = revealedIndex(previous.sources, transaction.selection.from)
          if (revealed === previous.revealed) return previous
          return {
            ...previous,
            revealed,
            set: composeSet(transaction.doc, previous.widgetSet, previous.sources, revealed),
          }
        }
        // (2) 有目录时的逐键判定：命中缓存标题区间 / [TOC] 段，或正敲着新标记，才重建；否则只映射
        if (previous.active) {
          if (
            maybeTocTouched(transaction) ||
            stepHits(transaction, previous.headings) ||
            stepHits(transaction, previous.sources)
          ) {
            return rebuild(transaction.doc, transaction.selection, previous)
          }
          return mapState(previous, transaction)
        }
        // (3) 没有目录：只有改动可能造出 [TOC] 才重建；1 MB 文档逐键不做全篇扫描
        if (maybeTocTouched(transaction)) return rebuild(transaction.doc, transaction.selection, previous)
        // 有 [TOC] 但还没有标题：结构改动可能造出第一个标题，停笔后兜底
        if (previous.sources.length > 0) return { ...mapState(previous, transaction), stale: true }
        return previous
      },
    },
    props: {
      decorations: (state) => tocKey.getState(state)?.set ?? null,
    },
    // 第 61 轮 B1：停笔 300 ms 兜底重建。必须是插件顶层 view（不是 props.view），
    // 否则 ProseMirror 静默忽略，装饰永远不重建。
    view(editorView) {
      let timer: ReturnType<typeof setTimeout> | null = null
      const flush = () => {
        timer = null
        const state = tocKey.getState(editorView.state)
        if (!state?.stale) return
        editorView.dispatch(
          editorView.state.tr.setMeta(tocKey, { resync: true }).setMeta('addToHistory', false),
        )
      }
      return {
        update(view) {
          const state = tocKey.getState(view.state)
          if (!state?.stale) return
          if (timer) clearTimeout(timer)
          timer = setTimeout(flush, 300)
        },
        destroy() {
          if (timer) clearTimeout(timer)
          timer = null
        },
      }
    },
  })
}

export function createToc(options: TocOptions): Extension {
  return Extension.create({
    name: 'sidelightToc',
    addProseMirrorPlugins() {
      return [createTocPlugin(options)]
    },
  })
}
