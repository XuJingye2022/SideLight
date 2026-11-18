import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet, type EditorView } from '@tiptap/pm/view'
import type { Node as PMNode } from '@tiptap/pm/model'

import {
  ensureMermaid,
  fallbackHint,
  listMermaidBlocks,
  mermaidTheme,
  renderDiagram,
  type MermaidBlock,
  type MermaidTheme,
} from './mermaidLazy.ts'

/**
 * 在 ```mermaid 代码块下面挂一个预览 widget（第 36 轮，ADR-0017）。
 * 不改 codeBlock 节点、不改 Markdown 序列化：widget 是装饰，getHTML() 看不到它。
 * 懒加载：首次见到代码块才下载 mermaid 本体。
 * 第 46 轮：缓存键带主题（`theme|hash`），切主题时清缓存并用新主题重绘（含跟随系统）。
 */
const mermaidKey = new PluginKey<DecorationSet>('sidelightMermaid')
const DEBOUNCE_MS = 400
/** 纯 meta 事务：主题变了，重建装饰。addToHistory:false 与 lib/decorations.ts 同一写法 */
const THEME_META = 'sidelightMermaidTheme'

/** 上一次 build 用的主题；变了就清缓存（主题只在这里读一次，避免同一帧两套键） */
let renderedTheme: MermaidTheme | null = null

const svgCache = new Map<string, string>()
const errorCache = new Map<string, string>()
const pendingTimers = new Map<string, ReturnType<typeof setTimeout>>()
const inFlight = new Set<string>()
/** widget DOM 按 `renderKey@pos` 记：同一文档两个相同代码块各得一个节点（不能共用） */
const domCache = new Map<string, HTMLElement>()

function applyContent(element: HTMLElement, renderKey: string): void {
  const svg = svgCache.get(renderKey)
  if (svg) {
    element.innerHTML = svg
    element.classList.remove('is-error')
    element.classList.add('is-ready')
    return
  }
  const error = errorCache.get(renderKey)
  if (error) {
    element.classList.remove('is-ready')
    element.classList.add('is-error')
    element.textContent = error
    return
  }
  element.classList.remove('is-ready', 'is-error')
  element.textContent = '图表渲染中…'
}

function refreshLivePreviews(renderKey: string): void {
  for (const element of domCache.values()) {
    if (element.dataset.renderKey === renderKey) applyContent(element, renderKey)
  }
}

async function runRender(block: MermaidBlock, renderKey: string): Promise<void> {
  inFlight.add(renderKey)
  const result = await renderDiagram(block.code)
  inFlight.delete(renderKey)
  if ('svg' in result && typeof result.svg === 'string') svgCache.set(renderKey, result.svg)
  else errorCache.set(renderKey, 'error' in result && result.error ? result.error : fallbackHint())
  // 就地更新已经挂上的 widget：不为每张图 dispatch 一次事务
  refreshLivePreviews(renderKey)
}

function scheduleRender(block: MermaidBlock, renderKey: string): void {
  if (svgCache.has(renderKey) || errorCache.has(renderKey)) return
  if (pendingTimers.has(renderKey) || inFlight.has(renderKey)) return
  // 首次见到 mermaid 块就开下载，不必等 400 ms 防抖
  void ensureMermaid().catch(() => undefined)
  pendingTimers.set(
    renderKey,
    setTimeout(() => {
      pendingTimers.delete(renderKey)
      void runRender(block, renderKey)
    }, DEBOUNCE_MS),
  )
}

function makePreview(block: MermaidBlock, renderKey: string): HTMLElement {
  const element = document.createElement('div')
  element.className = 'mermaid-preview'
  element.setAttribute('contenteditable', 'false')
  element.dataset.hash = block.hash
  element.dataset.renderKey = renderKey
  applyContent(element, renderKey)
  domCache.set(`${renderKey}@${block.pos}`, element)
  return element
}

function build(doc: PMNode): DecorationSet {
  const theme = mermaidTheme()
  if (theme !== renderedTheme) {
    renderedTheme = theme
    svgCache.clear()
    errorCache.clear()
    // 切主题前已排队的定时器作废：否则会拿旧 renderKey 再白跑一次（旧 widget 已经不在）
    for (const timer of pendingTimers.values()) clearTimeout(timer)
    pendingTimers.clear()
  }
  const decorations: Decoration[] = []
  const liveKeys = new Set<string>()
  for (const block of listMermaidBlocks(doc)) {
    const renderKey = `${theme}|${block.hash}`
    const domKey = `${renderKey}@${block.pos}`
    liveKeys.add(domKey)
    decorations.push(Decoration.node(block.pos, block.pos + block.nodeSize, { class: 'is-mermaid' }))
    decorations.push(
      Decoration.widget(block.pos + block.nodeSize, () => makePreview(block, renderKey), {
        side: 1,
        ignoreSelection: true,
        // spec.key 不变时 ProseMirror 会复用旧 DOM；带上 renderKey 才会在切主题时重建
        key: `mermaid-${domKey}`,
      }),
    )
    scheduleRender(block, renderKey)
  }
  // 已经被删掉的块（或旧主题的键）：清掉缓存与 DOM 记录，不留堆
  for (const key of [...domCache.keys()]) {
    if (!liveKeys.has(key)) domCache.delete(key)
  }
  return DecorationSet.create(doc, decorations)
}

function dispatchTheme(view: EditorView): void {
  const theme = mermaidTheme()
  if (theme === renderedTheme) return
  view.dispatch(view.state.tr.setMeta(THEME_META, theme).setMeta('addToHistory', false))
}

export const MermaidPreview = Extension.create({
  name: 'mermaidPreview',
  addProseMirrorPlugins() {
    return [
      new Plugin<DecorationSet>({
        key: mermaidKey,
        state: {
          init: (_config, state) => build(state.doc),
          apply(transaction, previous, _oldState, newState) {
            if (transaction.docChanged || transaction.getMeta(THEME_META) !== undefined) return build(newState.doc)
            return previous.map(transaction.mapping, transaction.doc)
          },
        },
        // 主题写在 documentElement 上（App.tsx 保存时一次、SettingsDialog 点选时一次），
        // 系统主题变化走 matchMedia；两条都只 dispatch 一个纯 meta 事务，缓存与 widget 在 build 里换键
        view(editorView) {
          const root = typeof document === 'undefined' ? null : document.documentElement
          const observer =
            root && typeof MutationObserver === 'function'
              ? new MutationObserver(() => dispatchTheme(editorView))
              : null
          observer?.observe(root as HTMLElement, { attributes: true, attributeFilter: ['data-theme'] })
          const media = typeof matchMedia === 'function' ? matchMedia('(prefers-color-scheme: dark)') : null
          const onMedia = () => dispatchTheme(editorView)
          media?.addEventListener('change', onMedia)
          return {
            update() {},
            destroy() {
              observer?.disconnect()
              media?.removeEventListener('change', onMedia)
            },
          }
        },
        props: {
          decorations(state) {
            return mermaidKey.getState(state) ?? DecorationSet.empty
          },
        },
      }),
    ]
  },
})
