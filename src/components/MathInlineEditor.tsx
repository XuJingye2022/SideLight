import { useEffect, useRef, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import katex, { isKatexReady, subscribe } from '../lib/katexLazy.ts'

type Props = {
  anchor: DOMRect
  latex: string
  display: boolean
  onChange: (latex: string) => void
  onCommit: () => void
  onCancel: () => void
}

const WIDTH = 360

/** 公式就地编辑器：Enter 提交，Esc 取消；块级 Shift+Enter 换行 */
export function MathInlineEditor({ anchor, latex, display, onChange, onCommit, onCancel }: Props) {
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null)
  const committedRef = useRef(false)
  const katexReady = useSyncExternalStore(subscribe, isKatexReady, () => false)

  useEffect(() => {
    const input = inputRef.current
    if (!input) return
    input.focus()
    input.select()
  }, [])

  const preview = (() => {
    if (!katexReady) return ''
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

  const width = Math.max(220, Math.min(WIDTH, window.innerWidth - 32))
  const left = Math.min(Math.max(12, anchor.left), window.innerWidth - width - 12)
  const top = Math.min(Math.max(72, anchor.top - 4), window.innerHeight - 220)

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (event.key === 'Enter') {
      if (display && event.shiftKey) return
      event.preventDefault()
      commit()
      return
    }
    if (event.key === 'Escape') {
      event.preventDefault()
      // 只取消弹层：同一个 Esc 不能再冒泡到 window 去退出源码 / 预览（第 43 轮，与 FindBar 同族）
      event.stopPropagation()
      committedRef.current = true
      onCancel()
    }
  }

  const shared = {
    className: 'math-inline-input',
    'aria-label': display ? '块级公式 LaTeX' : '行内公式 LaTeX',
    value: latex,
    spellCheck: false,
    placeholder: '输入 LaTeX，例如 x^2',
    onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange(event.target.value),
    onKeyDown,
    onBlur: () => commit(),
  }

  return createPortal(
    <div
      className={`math-inline${display ? ' is-block' : ''}`}
      style={{ position: 'fixed', left, top, width }}
      onMouseDown={(event) => event.stopPropagation()}
    >
      {display ? (
        <textarea ref={inputRef as React.RefObject<HTMLTextAreaElement>} rows={3} {...shared} />
      ) : (
        <input ref={inputRef as React.RefObject<HTMLInputElement>} {...shared} />
      )}
      <div
        className={`math-inline-preview${katexReady && preview ? '' : ' is-empty'}`}
        dangerouslySetInnerHTML={{
          __html: katexReady ? preview || '（预览会出现在这里）' : '公式排版加载中…',
        }}
      />
      <p className="math-inline-hint">
        <kbd>Enter</kbd> 提交{display ? <><kbd>Shift</kbd>+<kbd>Enter</kbd> 换行</> : null} <kbd>Esc</kbd> 取消
      </p>
    </div>,
    document.body,
  )
}
