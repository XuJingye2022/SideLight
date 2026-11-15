import { useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'

import katex, { isKatexReady, subscribe } from '../lib/katexLazy.ts'

type Props = {
  /** 源码行在屏幕上的位置，预览挂在它下面 */
  top: number
  left: number
  latex: string
  display: boolean
}

/** 编辑公式时贴在下面的一小块实时预览，Typora 的浮层就是这个位置 */
export function MathDraftPreview({ top, left, latex, display }: Props) {
  const ready = useSyncExternalStore(subscribe, isKatexReady, () => false)
  if (latex.trim().length === 0) return null

  const width = Math.min(420, window.innerWidth - 32)
  const safeLeft = Math.min(Math.max(12, left), window.innerWidth - width - 12)

  // 未就绪也给占位，不返回 null：否则加载完成后没有重画锚点
  const html = ready
    ? (() => {
        try {
          return katex.renderToString(latex, { throwOnError: false, displayMode: display })
        } catch {
          return ''
        }
      })()
    : ''

  return createPortal(
    <div
      className="math-draft-preview"
      style={{ position: 'fixed', top: top + 8, left: safeLeft, width }}
      // 预览只是镜子，不能抢焦点
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: ready ? html : '公式排版加载中…' }}
    />,
    document.body,
  )
}
