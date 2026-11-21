import type { WorkspaceNode } from './workspace.ts'

/**
 * 目录变化自动刷新（第 146 轮 B2）。
 *
 * 工作区在磁盘上被别的编辑器改动（新增/删除/改名）时，树要自己跟上，但**不能打断当前文档**
 * （不重载正文、不清脏、不动选区）。两条触发路径：
 * 1. 浏览器有 `FileSystemObserver` 就观察根目录（递归），回调 300 ms 合并后刷新；
 * 2. 没有就走 2.5 s 轮询，只在页面可见时跑；`window.focus` 与 `visibilitychange`→visible 立即补一次。
 * 两条都受同一个 `MIN_GAP_MS` 节流，避免连续事件把刷新打成队列。
 */

/** 没有 FileSystemObserver 时的轮询间隔 */
export const POLL_INTERVAL_MS = 2500
/** 两次后台刷新之间的最小间隔（focus / 可见性补刷也走这条） */
export const MIN_GAP_MS = 800
/** observer 回调的合并窗口：一次批量变化只刷一次 */
export const OBSERVER_DEBOUNCE_MS = 300

/**
 * 树的指纹：只看结构与路径（顺序由 refreshWorkspace 的排序决定）。
 * 相同就不 setWorkspace——避免每 2.5 s 一次无意义的整树重渲染。
 */
export function treeSignature(root: WorkspaceNode | null): string {
  if (!root) return ''
  const parts: string[] = []
  const walk = (node: WorkspaceNode) => {
    if (node.kind === 'file') {
      parts.push(`f:${node.path}`)
      return
    }
    parts.push(`d:${node.path}`)
    for (const child of node.children) walk(child)
    return
  }
  walk(root)
  return parts.join('\n')
}

export type AutoRefreshInput = {
  /** 有没有可观察的根目录（示例工作区没有句柄） */
  hasRoot: boolean
  /** 页面可见：后台刷新在隐藏页上没意义，也省电 */
  visible: boolean
  /** 已有刷新在飞：交给 refreshTree 自己的排队合并，不叠一条 */
  refreshing: boolean
  /** 上一次后台刷新的时刻（0 = 还没刷过） */
  lastAt: number
  now: number
}

/** 节流 + 可见性 + 单个在飞的判定；返回 true 才允许排一次后台刷新 */
export function shouldAutoRefresh(input: AutoRefreshInput): boolean {
  if (!input.hasRoot) return false
  if (!input.visible) return false
  if (input.refreshing) return false
  if (input.lastAt > 0 && input.now - input.lastAt < MIN_GAP_MS) return false
  return true
}

/** FileSystemObserver 的类型不在 TS 的 DOM lib 里（Chrome 133+），这里给最小本地形状 */
type ObserverRecord = { type?: string }
type ObserverCallback = (records: ObserverRecord[]) => void

export type FileSystemObserverLike = {
  observe: (handle: FileSystemHandle, options?: { recursive?: boolean }) => Promise<void> | void
  disconnect: () => void
}

export type FileSystemObserverCtor = new (callback: ObserverCallback) => FileSystemObserverLike

/** 探测 `window.FileSystemObserver`：没有就返回 null（调用方退回轮询） */
export function observerCtor(win: unknown): FileSystemObserverCtor | null {
  const candidate = (win as { FileSystemObserver?: unknown } | null | undefined)?.FileSystemObserver
  return typeof candidate === 'function' ? (candidate as FileSystemObserverCtor) : null
}
