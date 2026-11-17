import type { Node as PMNode } from '@tiptap/pm/model'

/**
 * Mermaid 惰性加载与渲染（第 36 轮，ADR-0017）。
 * 首屏不含 mermaid：只有正文里出现 ```mermaid 块时才动态下载。
 * 契约同 katexLazy：loader 可替换、按 code 缓存、失败不抛错。
 */
export type MermaidModule = {
  initialize: (config: Record<string, unknown>) => void
  render: (id: string, text: string) => Promise<{ svg: string }>
}

export type MermaidBlock = {
  /** 块节点起始位置（Decoration.node 的 from） */
  pos: number
  nodeSize: number
  /** 去掉尾部空行的源码 */
  code: string
  hash: string
}

type Loader = () => Promise<{ mermaid: MermaidModule }>

let loader: Loader = () => import('./mermaidLoader.ts').then((module) => module.default)
let mermaid: MermaidModule | null = null
let loadCount = 0
let loading: Promise<MermaidModule | null> | null = null
let lastError: unknown = null
let initialized = false
let renderSeq = 0
const svgCache = new Map<string, string>()

/** djb2：代码相同就复用同一份渲染结果 */
export function mermaidHash(code: string): string {
  let hash = 5381
  for (let index = 0; index < code.length; index += 1) {
    hash = ((hash << 5) + hash + code.charCodeAt(index)) | 0
  }
  return (hash >>> 0).toString(36)
}

export function isMermaidLanguage(language: unknown): boolean {
  return typeof language === 'string' && language.trim().toLowerCase() === 'mermaid'
}

/** 渲染失败时给用户的一句话：不吞代码块，原文还在 */
export function fallbackHint(): string {
  return '图表没渲染出来，代码块内容仍是原文，可以继续编辑。'
}

function themeName(): string {
  // node 测试里没有 document：不守卫会直接炸（katexLazy 没这个问题）
  if (typeof document === 'undefined') return 'default'
  return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'default'
}

function configure(module: MermaidModule): void {
  if (initialized) return
  initialized = true
  try {
    module.initialize({ startOnLoad: false, securityLevel: 'strict', theme: themeName() })
  } catch (error) {
    lastError = error
  }
}

/** 惰性加载 Mermaid 并初始化一次；并发调用共用同一个 promise */
export function ensureMermaid(): Promise<void> {
  if (mermaid) return Promise.resolve()
  if (loading) return loading.then(() => undefined)
  loading = (async () => {
    loadCount += 1
    try {
      const module = await loader()
      mermaid = module.mermaid
      configure(mermaid)
      return mermaid
    } catch (error) {
      lastError = error
      throw error
    } finally {
      loading = null
    }
  })()
  return loading.then(() => undefined)
}

/** 渲染一段 Mermaid 源码；成功返回 svg，失败返回一句话，永不抛错 */
export async function renderDiagram(code: string): Promise<{ svg: string } | { error: string }> {
  const hash = mermaidHash(code)
  const cached = svgCache.get(hash)
  if (cached !== undefined) return { svg: cached }
  try {
    await ensureMermaid()
    if (!mermaid) return { error: fallbackHint() }
    renderSeq += 1
    const result = await mermaid.render(`mermaid-preview-${renderSeq}`, code)
    const svg = result && typeof result.svg === 'string' ? result.svg : ''
    if (!svg) return { error: fallbackHint() }
    svgCache.set(hash, svg)
    return { svg }
  } catch (error) {
    lastError = error
    return { error: fallbackHint() }
  }
}

/**
 * 收集文档里的 mermaid 代码块（顶层与列表项/引用块里的嵌套块都算）；
 * 没有就返回空数组，也不会触发加载。
 */
export function listMermaidBlocks(doc: PMNode): MermaidBlock[] {
  const blocks: MermaidBlock[] = []
  doc.descendants((node, pos) => {
    if (node.type.name !== 'codeBlock' || !isMermaidLanguage(node.attrs?.language)) return true
    const code = node.textContent.replace(/\n+$/u, '')
    blocks.push({ pos, nodeSize: node.nodeSize, code, hash: mermaidHash(code) })
    // 代码块没有子节点，不必再往下钻
    return false
  })
  return blocks
}

/** 测试专用：注入假 loader 并重置模块状态（不碰真 mermaid 包） */
export function __setLoaderForTest(next: Loader | null): void {
  loader = next ?? (() => import('./mermaidLoader.ts').then((module) => module.default))
  __resetForTest()
}

export function __resetForTest(): void {
  mermaid = null
  loadCount = 0
  loading = null
  lastError = null
  initialized = false
  renderSeq = 0
  svgCache.clear()
}

export function __getLoadCount(): number {
  return loadCount
}

export function __getLastError(): unknown {
  return lastError
}
