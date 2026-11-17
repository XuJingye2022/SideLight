import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
import type { Node as PMNode } from '@tiptap/pm/model'

import { ensureMermaid, fallbackHint, listMermaidBlocks, renderDiagram, type MermaidBlock } from './mermaidLazy.ts'

/**
 * 在 ```mermaid 代码块下面挂一个预览 widget（第 36 轮，ADR-0017）。
 * 不改 codeBlock 节点、不改 Markdown 序列化：widget 是装饰，getHTML() 看不到它。
 * 懒加载：首次见到代码块才下载 mermaid 本体。
 */
const mermaidKey = new PluginKey<DecorationSet>('sidelightMermaid')
const DEBOUNCE_MS = 400

const svgCache = new Map<string, string>()
const errorCache = new Map<string, string>()
const pendingTimers = new Map<string, ReturnType<typeof setTimeout>>()
const inFlight = new Set<string>()
/** widget DOM 按 `${pos}:${hash}` 记，同一文档两个相同代码块各得一个节点（不能共用） */
const domCache = new Map<string, HTMLElement>()

function applyContent(element: HTMLElement, hash: string): void {
  const svg = svgCache.get(hash)
  if (svg) {
    element.innerHTML = svg
    element.classList.remove('is-error')
    element.classList.add('is-ready')
    return
  }
  const error = errorCache.get(hash)
  if (error) {
    element.classList.remove('is-ready')
    element.classList.add('is-error')
    element.textContent = error
    return
  }
  element.classList.remove('is-ready', 'is-error')
  element.textContent = '图表渲染中…'
}

function refreshLivePreviews(hash: string): void {
  for (const [key, element] of domCache) {
    if (key.slice(key.indexOf(':') + 1) === hash) applyContent(element, hash)
  }
}

async function runRender(block: MermaidBlock): Promise<void> {
  inFlight.add(block.hash)
  const result = await renderDiagram(block.code)
  inFlight.delete(block.hash)
  if ('svg' in result && typeof result.svg === 'string') svgCache.set(block.hash, result.svg)
  else errorCache.set(block.hash, 'error' in result && result.error ? result.error : fallbackHint())
  // 就地更新已经挂上的 widget：不为每张图 dispatch 一次事务
  refreshLivePreviews(block.hash)
}

function scheduleRender(block: MermaidBlock): void {
  if (svgCache.has(block.hash) || errorCache.has(block.hash)) return
  if (pendingTimers.has(block.hash) || inFlight.has(block.hash)) return
  // 首次见到 mermaid 块就开下载，不必等 400 ms 防抖
  void ensureMermaid().catch(() => undefined)
  pendingTimers.set(
    block.hash,
    setTimeout(() => {
      pendingTimers.delete(block.hash)
      void runRender(block)
    }, DEBOUNCE_MS),
  )
}

function makePreview(block: MermaidBlock): HTMLElement {
  const element = document.createElement('div')
  element.className = 'mermaid-preview'
  element.setAttribute('contenteditable', 'false')
  element.dataset.hash = block.hash
  applyContent(element, block.hash)
  domCache.set(`${block.pos}:${block.hash}`, element)
  return element
}

function build(doc: PMNode): DecorationSet {
  const decorations: Decoration[] = []
  const liveKeys = new Set<string>()
  for (const block of listMermaidBlocks(doc)) {
    const key = `${block.pos}:${block.hash}`
    liveKeys.add(key)
    decorations.push(Decoration.node(block.pos, block.pos + block.nodeSize, { class: 'is-mermaid' }))
    decorations.push(
      Decoration.widget(block.pos + block.nodeSize, () => makePreview(block), {
        side: 1,
        ignoreSelection: true,
        key: `mermaid-${key}`,
      }),
    )
    scheduleRender(block)
  }
  // 已经被删掉的块：清掉缓存与未触发的定时器，不留堆
  for (const key of [...domCache.keys()]) {
    if (!liveKeys.has(key)) domCache.delete(key)
  }
  return DecorationSet.create(doc, decorations)
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
            if (transaction.docChanged) return build(newState.doc)
            return previous.map(transaction.mapping, transaction.doc)
          },
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
