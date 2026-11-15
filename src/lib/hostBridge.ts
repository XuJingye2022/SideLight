/** Windows WebView2 与 macOS WKWebView 的统一宿主桥；浏览器里没有宿主时返回 null */
export type HostTransport = {
  postMessage(message: unknown): void
  addEventListener(listener: (data: unknown) => void): () => void
}

declare global {
  interface Window {
    chrome?: {
      webview?: {
        postMessage: (message: unknown) => void
        addEventListener: (type: 'message', listener: (event: { data: unknown }) => void) => void
        removeEventListener: (type: 'message', listener: (event: { data: unknown }) => void) => void
      }
    }
    webkit?: { messageHandlers?: { sidelight?: { postMessage: (message: unknown) => void } } }
  }
}

/** Windows 优先，其次 macOS；都没有则返回 null（调用方据此不发宿主消息） */
export function getHostTransport(): HostTransport | null {
  const w = window
  const webview = w.chrome?.webview
  const handler = w.webkit?.messageHandlers?.sidelight
  if (webview) {
    return {
      postMessage: (message) => webview.postMessage(message),
      addEventListener(listener) {
        const onMessage = (event: { data: unknown }) => listener(event.data)
        webview.addEventListener('message', onMessage)
        return () => webview.removeEventListener('message', onMessage)
      },
    }
  }
  if (!handler) return null
  return {
    postMessage: (message) => handler.postMessage(message),
    addEventListener(listener) {
      const onMessage = (event: Event) => listener((event as CustomEvent<unknown>).detail)
      w.addEventListener('sidelight-host', onMessage)
      return () => w.removeEventListener('sidelight-host', onMessage)
    },
  }
}
