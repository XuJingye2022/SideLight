import { Image } from '@tiptap/extension-image'

import { getResolvedAsset, isRelativeAsset, resolveAsset, subscribeResolved } from './assetResolve.ts'

/** 属性照抄到 img 上；正文节点里仍是相对路径，只有 DOM 的 src 被换掉 */
function paintAttributes(img: HTMLImageElement, attrs: Record<string, unknown>): void {
  img.alt = typeof attrs.alt === 'string' ? attrs.alt : ''
  if (typeof attrs.title === 'string' && attrs.title) img.title = attrs.title
  else img.removeAttribute('title')
  for (const key of ['width', 'height'] as const) {
    const value = attrs[key]
    if (value === null || value === undefined || value === '') img.removeAttribute(key)
    else img.setAttribute(key, String(value))
  }
}

/**
 * 和内置 Image 一样，只是把工作区相对路径的 src 换成本地 blob URL 显示。
 * 只改 DOM，不改节点属性：保存与导出仍是 assets/xxx.png。
 */
export const ResolvingImage = Image.extend({
  addNodeView() {
    return ({ node }) => {
      const img = document.createElement('img')
      let rawSrc = ''
      let shown = ''
      let unsubscribe: (() => void) | null = null

      const paint = (url: string): void => {
        shown = url
        if (img.getAttribute('src') !== url) img.setAttribute('src', url)
      }

      const bind = (src: string): void => {
        unsubscribe?.()
        unsubscribe = null
        rawSrc = src
        paint(src)
        if (!isRelativeAsset(src)) return
        void resolveAsset(src).then((url) => {
          if (url && rawSrc === src) paint(url)
        })
        // 缓存晚到只能靠订阅回填：PM 对未变更的节点不调 update()
        unsubscribe = subscribeResolved(() => {
          const next = getResolvedAsset(src)
          if (next && next !== shown) paint(next)
        })
      }

      paintAttributes(img, node.attrs)
      bind(String(node.attrs?.src ?? ''))

      return {
        dom: img,
        update: (updated: { type: { name: string }; attrs: Record<string, unknown> }) => {
          if (updated.type.name !== node.type.name) return false
          paintAttributes(img, updated.attrs)
          const nextSrc = String(updated.attrs?.src ?? '')
          if (nextSrc !== rawSrc) bind(nextSrc)
          return true
        },
        // 只退订，不 revoke：切预览时编辑器会卸载，revoke 早了预览就破图
        destroy: () => {
          unsubscribe?.()
          unsubscribe = null
        },
        ignoreMutation: () => true,
      }
    }
  },
})
