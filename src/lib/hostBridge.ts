/** Windows WebView2 与 macOS WKWebView 的统一宿主桥；浏览器里没有宿主时返回 null */
export type HostTransport = {
  postMessage(message: unknown): void
  addEventListener(listener: (data: unknown) => void): () => void
}

type WebView2 = {
  postMessage: (message: unknown) => void
  addEventListener: (type: 'message', listener: (event: { data: unknown }) => void) => void
  removeEventListener: (type: 'message', listener: (event: { data: unknown }) => void) => void
}

declare global {
  interface Window {
    chrome?: { webview?: WebView2 }
    webkit?: {
      messageHandlers?: {
        sidelight?: { postMessage: (message: unknown) => void }
      }
    }
  }
}

let wkTransport: HostTransport | null = null
const wkListeners = new Set<(data: unknown) => void>()
let wkListenerInstalled = false

function ensureWkEventBridge(): void {
  if (wkListenerInstalled) return
  wkListenerInstalled = true
  window.addEventListener('sidelight-host', (event) => {
    // WK 宿主的原生脚本处理器把回包转成 CustomEvent 的 detail
    const data = (event as CustomEvent<unknown>).detail
    for (const listener of [...wkListeners]) listener(data)
  })
}

function createWkTransport(handler: { postMessage: (message: unknown) => void }): HostTransport {
  if (wkTransport) return wkTransport
  ensureWkEventBridge()
  wkTransport = {
    postMessage(message) {
      handler.postMessage(message)
    },
    addEventListener(listener) {
      wkListeners.add(listener)
      return () => wkListeners.delete(listener)
    },
  }
  return wkTransport
}

function createWebView2Transport(webview: WebView2): HostTransport {
  return {
    postMessage(message) {
      webview.postMessage(message)
    },
    addEventListener(listener) {
      const onMessage = (event: { data: unknown }) => listener(event.data)
      webview.addEventListener('message', onMessage)
      return () => webview.removeEventListener('message', onMessage)
    },
  }
}

/** Windows 优先，其次 macOS；都没有则返回 null（调用方据此不发宿主消息） */
export function getHostTransport(): HostTransport | null {
  const webview = window.chrome?.webview
  if (webview) return createWebView2Transport(webview)
  const handler = window.webkit?.messageHandlers?.sidelight
  if (handler) return createWkTransport(handler)
  return null
}
