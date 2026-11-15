import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import katex from 'katex'

type Props = {
  /** 公式在屏幕上的位置，输入框盖在它上面 */
  anchor: DOMRect
  latex: string
  display: boolean
  onChange: (latex: string) => void
  onCommit: () => void
  onCancel: () => void
}

const WIDTH = 320

/**
 * 块级公式的就地编辑器：输入框压在公式上，下面紧跟渲染结果。
 * 没有标题与按钮条——Enter 完成，Esc 取消，点别处也算完成。
 */
export function MathInlineEditor({ anchor, latex, display, onChange, onCommit, onCancel }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const committedRef = useRef(false)

  useEffect(() => {
    const input = inputRef.current
    if (!input) return
    input.focus()
    input.select()
  }, [])

  const preview = (() => {
    if (latex.trim().length === 0) return ''
    try {
      return katex.renderToString(latex, { throwOnError: false, displayMode: display })
    } catch {
      return ''
    }
  })()

  const commit = () => {
    if (committedRef.current) return
    committedRef.current = true
    onCommit()
  }

  const width = Math.max(200, Math.min(WIDTH, window.innerWidth - 32))
  const left = Math.min(Math.max(12, anchor.left), window.innerWidth - width - 12)

  return createPortal(
    <div
      className="math-inline"
      style={{ position: 'fixed', left, top: Math.max(12, anchor.top - 4), width }}
      onMouseDown={(event) => event.stopPropagation()}
    >
      <input
        ref={inputRef}
        className="math-inline-input"
        value={latex}
        spellCheck={false}
        placeholder="输入 LaTeX，例如 x^2"
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault()
            commit()
          }
          if (event.key === 'Escape') {
            event.preventDefault()
            committedRef.current = true
            onCancel()
          }
        }}
        onBlur={() => commit()}
      />
      <div
        className={`math-inline-preview${preview ? '' : ' is-empty'}`}
        dangerouslySetInnerHTML={{ __html: preview || '（预览会出现在这里）' }}
      />
    </div>,
    document.body,
  )
}
