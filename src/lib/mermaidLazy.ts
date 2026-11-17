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
/** 上一次 initialize 用的主题：同主题不重复 initialize，切主题才重跑 */
let appliedTheme: 'dark' | 'default' | null = null
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

/**
 * data-theme 属性 + 系统偏好 → mermaid 主题。纯函数：Node 测试直接调，不碰 document/matchMedia。
 * `system`/未设置跟随系统，与 styles.css 里 `@media (prefers-color-scheme: dark)` 的分支一致。
 */
export function resolveMermaidTheme(attr: string | null, prefersDark: boolean): 'dark' | 'default' {
  if (attr === 'dark') return 'dark'
  if (attr === 'light') return 'default'
  return prefersDark ? 'dark' : 'default'
}

/** 当前应该用的 mermaid 主题（第 46 轮 T3：system 也跟随系统，不再恒按浅色渲染） */
export function mermaidTheme(): 'dark' | 'default' {
  // node 测试里没有 document：不守卫会直接炸（katexLazy 没这个问题）
  if (typeof document === 'undefined') return 'default'
  const attr = document.documentElement.getAttribute('data-theme')
  const prefersDark = typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches
  return resolveMermaidTheme(attr, prefersDark)
}

function configure(module: MermaidModule): void {
  const theme = mermaidTheme()
  if (initialized && appliedTheme === theme) return
  appliedTheme = theme
  initialized = true
  try {
    module.initialize({ startOnLoad: false, securityLevel: 'strict', theme })
  } catch (error) {
    lastError = error
  }
}

/** 惰性加载 Mermaid 并初始化；并发调用共用同一个 promise。主题变了要重新 initialize */
export function ensureMermaid(): Promise<void> {
  if (mermaid) {
    // 早退分支也必须过一遍 configure()：唯一调用点在下方首次加载分支，
    // 不给这里加路径的话，切主题后 initialize 永不重跑（第 46 轮 R1，整条任务的隐藏前提）
    configure(mermaid)
    return Promise.resolve()
  }
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
  // 入口取一次主题供命中查询；await 之后再取一次算写键——两处现取会在 await 期间切主题时
  // 把浅色 SVG 存进深色键（同一键再也不失效，第 46 轮 R3）
  const themeAtEntry = mermaidTheme()
  const cached = svgCache.get(`${themeAtEntry}|${hash}`)
  if (cached !== undefined) return { svg: cached }
  try {
    await ensureMermaid() // 里面 configure() 同步应用「此刻」的主题
    if (!mermaid) return { error: fallbackHint() }
    const theme = mermaidTheme() // 与 configure() 同一次读法；写缓存必须用它
    const key = `${theme}|${hash}`
    const hit = svgCache.get(key)
    if (hit !== undefined) return { svg: hit }
    renderSeq += 1
    const result = await mermaid.render(`mermaid-preview-${renderSeq}`, code)
    const svg = result && typeof result.svg === 'string' ? result.svg : ''
    if (!svg) return { error: fallbackHint() }
    svgCache.set(key, svg)
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
  appliedTheme = null
  renderSeq = 0
  svgCache.clear()
}

export function __getLoadCount(): number {
  return loadCount
}

export function __getLastError(): unknown {
  return lastError
}
