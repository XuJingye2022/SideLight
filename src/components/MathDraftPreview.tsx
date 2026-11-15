import { createPortal } from 'react-dom'
import katex from 'katex'

type Props = {
  /** 源码行在屏幕上的位置，预览挂在它下面 */
  top: number
  left: number
  latex: string
  display: boolean
}

/** 编辑公式时贴在下面的一小块实时预览，Typora 的浮层就是这个位置 */
export function MathDraftPreview({ top, left, latex, display }: Props) {
  if (latex.trim().length === 0) return null

  const html = (() => {
    try {
      return katex.renderToString(latex, { throwOnError: false, displayMode: display })
    } catch {
      return ''
    }
  })()
  if (!html) return null

  const width = Math.min(420, window.innerWidth - 32)
  const safeLeft = Math.min(Math.max(12, left), window.innerWidth - width - 12)

  return createPortal(
    <div
      className="math-draft-preview"
      style={{ position: 'fixed', top: top + 8, left: safeLeft, width }}
      // 预览只是镜子，不能抢焦点
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: html }}
    />,
    document.body,
  )
}
