export type KatexModule = {
  render: (latex: string, element: HTMLElement, options?: Record<string, unknown>) => void
  renderToString: (latex: string, options?: Record<string, unknown>) => string
}

type Loader = () => Promise<{ katex: KatexModule }>

type Pending = {
  element: HTMLElement
  latex: string
  options: Record<string, unknown>
  displayMode: boolean
  fromRetry?: boolean
}

let loader: Loader = () => import('./katexLoader.ts').then((module) => module.default)
let loadAttempts = 0
let katex: KatexModule | null = null
let ready = false
let failed = false
let loading: Promise<void> | null = null
let lastError: unknown = null
const listeners = new Set<() => void>()
const pending = new Map<HTMLElement, Pending>()

function notify(): void {
  for (const listener of [...listeners]) {
    try {
      listener()
    } catch {
      // 订阅者自己的错误不能拖垮其它组件
    }
  }
}

export function isKatexReady(): boolean {
  return ready
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function placeholder(element: HTMLElement, displayMode: boolean): void {
  element.classList.add('math-pending')
  if (displayMode) {
    element.style.display = 'block'
    element.style.minHeight = '2.8em'
  } else {
    element.style.display = 'inline-block'
    element.style.minWidth = '2.2em'
    element.style.height = '1.25em'
  }
}

function clearPlaceholder(element: HTMLElement): void {
  element.classList.remove('math-pending')
  element.style.display = ''
  element.style.minHeight = ''
  element.style.minWidth = ''
  element.style.height = ''
}

function showFallback(element: HTMLElement, latex: string, displayMode: boolean): void {
  clearPlaceholder(element)
  element.classList.add('math-fallback')
  element.setAttribute('data-latex', latex)
  element.setAttribute('title', '公式排版没加载成功，点击重试')
  element.textContent = displayMode ? `$$${latex}$$` : `$${latex}$`
  element.onclick = (event) => {
    event.preventDefault()
    // 不让点击继续冒泡到 ProseMirror：否则会打开公式编辑器、把当前占位节点换掉
    event.stopPropagation()
    element.onclick = null
    element.classList.remove('math-fallback')
    element.textContent = ''
    // 失败后允许重试一次：重置错误态，重新加载并重画
    failed = false
    lastError = null
    render(latex, element, {})
  }
  // 捕获阶段就挡住 mousedown：公式 NodeView 在 mousedown 时打开编辑器，会换掉这个占位节点
  if (typeof element.addEventListener === 'function') {
    element.addEventListener(
      'mousedown',
      (event) => {
        event.preventDefault()
        event.stopPropagation()
      },
      { capture: true },
    )
  }
}

function flush(): void {
  for (const [element, item] of [...pending.entries()]) {
    pending.delete(element)
    if (!element.isConnected || !katex) continue
    try {
      katex.render(item.latex, element, { ...item.options, displayMode: item.displayMode })
      clearPlaceholder(element)
      element.classList.remove('math-fallback')
    } catch (error) {
      lastError = error
      showFallback(element, item.latex, item.displayMode)
    }
  }
  notify()
}

/** 首次加载用静态动态 import（Vite 生成惰性 chunk）；失败后的重试用 cache-bust URL 绕过模块缓存 */
async function loadModule(): Promise<{ katex: KatexModule }> {
  loadAttempts += 1
  if (loadAttempts === 1) return loader()
  try {
    const url = new URL('./katexLoader.ts', import.meta.url)
    url.searchParams.set('retry', String(Date.now()))
    const module = (await import(/* @vite-ignore */ url.href)) as { default: { katex: KatexModule } }
    return module.default
  } catch {
    // 生产构建里 loader 是带 hash 的独立 chunk，相对 URL 可能不存在；退回原 loader
    return loader()
  }
}

/** 惰性加载 KaTeX；已就绪时 resolve 很快，失败后 reject 并保留错误态 */
export function ensureKatex(): Promise<void> {
  if (ready) return Promise.resolve()
  if (loading) return loading
  loading = (async () => {
    try {
      const module = await loadModule()
      katex = module.katex
      ready = true
      failed = false
      flush()
    } catch (error) {
      failed = true
      lastError = error
      for (const [element, item] of [...pending.entries()]) {
        pending.delete(element)
        if (element.isConnected) showFallback(element, item.latex, item.displayMode)
      }
      notify()
      throw error
    } finally {
      loading = null
    }
  })()
  return loading
}

/** 等加载完成；失败时也 resolve，调用方自己决定兜底 */
export function onReady(): Promise<void> {
  return ensureKatex().catch(() => undefined)
}

export function render(latex: string, element: HTMLElement, options: Record<string, unknown> = {}): void {
  const displayMode = Boolean(element.closest('[data-type="block-math"]'))
  if (ready && katex) {
    try {
      katex.render(latex, element, { ...options, displayMode })
      element.classList.remove('math-fallback')
      clearPlaceholder(element)
    } catch (error) {
      lastError = error
      showFallback(element, latex, displayMode)
    }
    return
  }

  if (failed) {
    showFallback(element, latex, displayMode)
    return
  }

  pending.set(element, { element, latex, options, displayMode })
  placeholder(element, displayMode)
  void ensureKatex().catch(() => undefined)
}

export function renderToString(latex: string, options: Record<string, unknown> = {}): string {
  // 契约：未就绪返回空串，调用方（导出）先 await ensureKatex()
  if (!ready || !katex) return ''
  try {
    return katex.renderToString(latex, options)
  } catch {
    return ''
  }
}

/** 测试专用：注入不 import CSS 的假 loader，并重置模块状态 */
export function __setLoaderForTest(next: Loader | null): void {
  loader = next ?? (() => import('./katexLoader.ts').then((module) => module.default))
  loadAttempts = 0
  katex = null
  ready = false
  failed = false
  loading = null
  lastError = null
  pending.clear()
  listeners.clear()
}

export function __getLastError(): unknown {
  return lastError
}

const katexLazy = { render, renderToString, ensureKatex }

export default katexLazy
