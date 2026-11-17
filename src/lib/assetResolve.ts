/**
 * 工作区相对路径图片（assets/xxx.png）的解析与缓存。
 * 正文里仍是相对路径；只有 DOM 上的 src 换成 blob URL，导出与保存不受影响。
 * 这个文件不 import tiptap，单测能直接在 Node 里跑。
 */

/** 不自带协议的地址交给浏览器；其余一律当工作区相对路径 */
const ABSOLUTE = /^(?:data|blob|https?|file):/i

/** 纯函数：这个 src 需不需要按目录句柄解析 */
export function isRelativeAsset(src: unknown): boolean {
  if (typeof src !== 'string') return false
  const trimmed = src.trim()
  if (!trimmed) return false
  return !ABSOLUTE.test(trimmed)
}

type Resolver = (src: string, docPath: string) => Promise<string | null>

// 当前文档路径（带工作区名前缀）；resolver 调用时现读，不在 effect 里闭包捕获
let currentDocPath = ''
// 代际：换文档/清缓存都会 +1，在飞的结果回来先比它
let epoch = 0
let resolver: Resolver | null = null
const cache = new Map<string, string>()
// 同一个 src 只解析一次：并发调用共用同一个 promise
const inFlight = new Map<string, Promise<string | null>>()
const listeners = new Set<() => void>()
let assetVersion = 0

export function setAssetResolver(next: Resolver | null): void {
  resolver = next
}

export function getAssetDocPath(): string {
  return currentDocPath
}

function revokeAll(): void {
  for (const url of cache.values()) {
    try {
      URL.revokeObjectURL(url)
    } catch {
      // 单测在 Node 里没有真 blob：revoke 失败不影响缓存语义
    }
  }
  cache.clear()
}

/**
 * 切文档：路径没变什么都不做（同一篇里重载不该把刚解析好的图全丢掉）。
 * 变了就换代并撤销旧 URL——旧目录解析出来的 blob 可能指向别的文件。
 */
export function setAssetDocPath(path: string): void {
  const next = typeof path === 'string' ? path : ''
  if (next === currentDocPath) return
  currentDocPath = next
  epoch += 1
  revokeAll()
}

/** 同步读缓存：预览面板改写 DOM 用 */
export function getResolvedAsset(src: string): string | null {
  return cache.get(src) ?? null
}

/** 订阅解析结果：NodeView 靠它回填，预览面板靠它重画 */
export function subscribeResolved(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function getAssetVersion(): number {
  return assetVersion
}

/**
 * 解析一个相对路径。缓存命中直接返回且**不通知**订阅者（否则自订阅会自激）。
 * 失败返回 null 且不写缓存：文件补上后同一会话还能重试。
 */
export function resolveAsset(src: string): Promise<string | null> {
  const cached = cache.get(src)
  if (cached !== undefined) return Promise.resolve(cached)
  const flying = inFlight.get(src)
  if (flying) return flying
  const run = resolver
  if (!run) return Promise.resolve(null)
  const started = epoch
  const docPath = currentDocPath
  const task = (async () => {
    try {
      const url = await run(src, docPath)
      if (!url) return null
      if (epoch !== started) {
        // 换文档后旧结果作废：revoke 掉，别让它在下一篇里闪一下
        try {
          URL.revokeObjectURL(url)
        } catch {
          // 同上
        }
        return null
      }
      cache.set(src, url)
      assetVersion += 1
      for (const listener of listeners) listener()
      return url
    } catch {
      return null
    } finally {
      // 同一个 src 的在飞表只在落定时删；期间不会有新的同 src 任务插进来
      inFlight.delete(src)
    }
  })()
  inFlight.set(src, task)
  return task
}

/** 换工作区时清空：旧目录的 blob 全部撤销，再由预热 effect 按新 resolver 重建 */
export function clearAssetCache(): void {
  epoch += 1
  revokeAll()
  assetVersion += 1
  for (const listener of listeners) listener()
}
