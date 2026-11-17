import { Image } from '@tiptap/extension-image'

import {
  getAssetDocPath,
  getResolvedAsset,
  isRelativeAsset,
  resolveAsset,
  subscribeResolved,
} from './assetResolve.ts'

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
        img.removeAttribute('data-asset-missing')
        if (img.getAttribute('title') === `图片未找到：${rawSrc}`) img.removeAttribute('title')
        if (img.getAttribute('src') !== url) img.setAttribute('src', url)
      }

      /** 解析不到：留可见占位，别给用户一个破图图标（样式走 img[data-asset-missing]） */
      const markMissing = (): void => {
        img.setAttribute('data-asset-missing', '')
        if (!img.alt) img.alt = '图片未找到'
        if (!img.title) img.title = `图片未找到：${rawSrc}`
      }

      const bind = (src: string): void => {
        unsubscribe?.()
        unsubscribe = null
        rawSrc = src
        // 有工作区文档路径时，相对图在解析成功前不写 src：否则浏览器立刻去请求那个相对 URL，
        // 事后再移除 src 已经晚了（解析失败本来就该一个请求都不发）。
        // 宿主/单文件（没有文档路径）与 data:/blob:/http(s) 保持原样：它们本来就该直接显示。
        const waitResolve = isRelativeAsset(src) && getAssetDocPath() !== ''
        if (waitResolve) {
          img.removeAttribute('src')
          img.removeAttribute('data-asset-missing')
          shown = ''
        } else {
          paint(src)
        }
        if (!isRelativeAsset(src)) return
        void resolveAsset(src).then((url) => {
          if (rawSrc !== src) return
          if (url) paint(url)
          else if (waitResolve) markMissing()
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
