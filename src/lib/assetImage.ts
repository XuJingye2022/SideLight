import { Image } from '@tiptap/extension-image'

import * as assets from './assetResolve.ts'
import { imageMarkdownOf, imageWidthFromDrag } from './imageWidth.ts'

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

/** 双击判定窗口（毫秒）：两次 pointerdown 之间比它短就算双击 */
const DOUBLE_TAP_MS = 400

/**
 * 和内置 Image 一样，只是把工作区相对路径的 src 换成本地 blob URL 显示。
 * 只改 DOM，不改节点属性：保存与导出仍是 assets/xxx.png。
 *
 * 第 87 轮（B-103）起外面包一层 `.sl-image`：右下角一个拖拽手柄改宽度，
 * 松开时才 `updateAttributes({ width })`，写回由 renderMarkdown 变成规范形 HTML 行。
 */
export const ResolvingImage = Image.extend({
  /** 有宽度（拖拽改过）写规范形 HTML 行，否则与内置 Image 一样写图片 markdown（第 87 轮 B-103） */
  renderMarkdown(node) {
    return imageMarkdownOf(node.attrs ?? {})
  },
  addNodeView() {
    return ({ node, editor, getPos }) => {
      const wrapper = document.createElement('div')
      wrapper.className = 'sl-image'
      const img = document.createElement('img')
      const handle = document.createElement('span')
      handle.className = 'sl-image-handle'
      handle.setAttribute('aria-hidden', 'true')
      wrapper.append(img, handle)
      let rawSrc = ''
      let shown = ''
      let unsubscribe: (() => void) | null = null
      let lastPointerDown = 0
      // 当前节点（update 会换一份）：写属性要基于最新的 attrs
      let currentNode: { type: { name: string }; attrs: Record<string, unknown> } = node
      // 拖拽期间挂在 window 上的监听：手柄只有 12 px，鼠标一移出去就收不到 pointermove
      let dragMove: ((event: PointerEvent) => void) | null = null
      let dragEnd: (() => void) | null = null

      const stopDrag = (): void => {
        if (dragMove) window.removeEventListener('pointermove', dragMove)
        if (dragEnd) {
          window.removeEventListener('pointerup', dragEnd)
          window.removeEventListener('pointercancel', dragEnd)
        }
        dragMove = null
        dragEnd = null
      }

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
        // 有工作区文档路径、或宿主单文件文档（docPath 恒空但走 /__asset）时，相对图在解析成功前
        // 不写 src：否则浏览器立刻去请求那个相对 URL（宿主下 404），事后再移除 src 已经晚了
        // （解析失败本来就该一个请求都不发）。data:/blob:/http(s) 保持原样：它们本来就该直接显示。
        const waitResolve = assets.shouldWaitAssetPaint(src, assets.getAssetDocPath(), assets.isHostAssetMode())
        if (waitResolve) {
          img.removeAttribute('src')
          img.removeAttribute('data-asset-missing')
          shown = ''
        } else {
          paint(src)
        }
        if (!assets.isRelativeAsset(src)) return
        void assets.resolveAsset(src).then((url) => {
          if (rawSrc !== src) return
          if (url) paint(url)
          else if (waitResolve) markMissing()
        })
        // 缓存晚到只能靠订阅回填：PM 对未变更的节点不调 update()
        unsubscribe = assets.subscribeResolved(() => {
          const next = assets.getResolvedAsset(src)
          if (next && next !== shown) paint(next)
        })
      }

      /** 松手才写节点属性：拖拽过程只改 style.width，不进撤销栈、不逐帧触发序列化 */
      const commitWidth = (width: number | null): void => {
        img.style.width = ''
        const pos = getPos()
        if (typeof pos !== 'number') return
        // 不先 setNodeSelection：选中的不是这张图时也能按位置写，且不动用户的光标
        const attrs = { ...(currentNode.attrs as Record<string, unknown>), width: width === null ? null : String(width) }
        editor.view.dispatch(editor.state.tr.setNodeMarkup(pos, undefined, attrs))
      }

      const onHandlePointerDown = (event: PointerEvent): void => {
        // 不让 PM 起自己的拖拽/选区，也别把手柄的点击算成正文点击
        event.preventDefault()
        event.stopPropagation()
        if (event.button !== 0) return
        const now = performance.now()
        const doubled = now - lastPointerDown < DOUBLE_TAP_MS
        lastPointerDown = doubled ? 0 : now
        if (doubled) {
          // 双击手柄：去掉宽度，回到 `![alt](src)`（保存逐字节等于改前原文）
          stopDrag()
          commitWidth(null)
          return
        }
        const startX = event.clientX
        const startWidth = Math.round(img.getBoundingClientRect().width) || 1
        let next = startWidth
        let moved = false
        dragMove = (moveEvent: PointerEvent) => {
          next = imageWidthFromDrag(startWidth, moveEvent.clientX - startX)
          moved = moved || next !== startWidth
          img.style.width = `${next}px`
        }
        dragEnd = () => {
          stopDrag()
          if (!moved) {
            // 只点了一下手柄：不改宽度、不写属性
            img.style.width = ''
            return
          }
          commitWidth(next)
        }
        window.addEventListener('pointermove', dragMove)
        window.addEventListener('pointerup', dragEnd)
        window.addEventListener('pointercancel', dragEnd)
      }

      // 手柄自己吃掉 dblclick：有的浏览器在 pointerdown preventDefault 后仍补发它
      const onHandleDoubleClick = (event: MouseEvent): void => {
        event.preventDefault()
        event.stopPropagation()
        stopDrag()
        commitWidth(null)
      }

      handle.addEventListener('pointerdown', onHandlePointerDown)
      handle.addEventListener('dblclick', onHandleDoubleClick)

      paintAttributes(img, node.attrs)
      bind(String(node.attrs?.src ?? ''))

      return {
        dom: wrapper,
        // 选中才显形（CSS 也认 :hover），键盘用户与鼠标用户都能看出这里能拖
        selectNode: () => wrapper.classList.add('is-selected'),
        deselectNode: () => wrapper.classList.remove('is-selected'),
        update: (updated: {
          type: { name: string }
          attrs: Record<string, unknown>
        }) => {
          if (updated.type.name !== node.type.name) return false
          currentNode = updated
          paintAttributes(img, updated.attrs)
          img.style.width = ''
          const nextSrc = String(updated.attrs?.src ?? '')
          if (nextSrc !== rawSrc) bind(nextSrc)
          return true
        },
        // 只退订，不 revoke：切预览时编辑器会卸载，revoke 早了预览就破图
        destroy: () => {
          stopDrag()
          handle.removeEventListener('pointerdown', onHandlePointerDown)
          handle.removeEventListener('dblclick', onHandleDoubleClick)
          unsubscribe?.()
          unsubscribe = null
        },
        ignoreMutation: () => true,
      }
    }
  },
})
