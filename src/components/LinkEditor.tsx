import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

type Props = {
  anchor: DOMRect
  text: string
  href: string
  /** 打开时先聚焦哪个输入框 */
  focus: 'text' | 'href'
  onTextChange: (text: string) => void
  onHrefChange: (href: string) => void
  onSave: () => void
  onCancel: () => void
}

const WIDTH = 340

/** Ctrl+K 就地链接浮层：文字 / 地址两个输入框，Tab 切换，Enter 保存，Esc 取消 */
export function LinkEditor({
  anchor,
  text,
  href,
  focus,
  onTextChange,
  onHrefChange,
  onSave,
  onCancel,
}: Props) {
  const textRef = useRef<HTMLInputElement | null>(null)
  const hrefRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    const target = focus === 'text' ? textRef.current : hrefRef.current
    target?.focus()
    target?.select()
  }, [focus])

  const width = Math.max(220, Math.min(WIDTH, window.innerWidth - 32))
  const left = Math.min(Math.max(12, anchor.left), window.innerWidth - width - 12)
  const top = Math.min(anchor.bottom + 6, window.innerHeight - 190)

  return createPortal(
    <div
      className="link-editor"
      role="dialog"
      aria-label="编辑链接"
      style={{ position: 'fixed', left, top, width }}
      onMouseDown={(event) => event.stopPropagation()}
    >
      <label className="link-editor-label">
        文字
        <input
          ref={textRef}
          className="link-editor-input"
          aria-label="链接文字"
          value={text}
          placeholder="链接文字"
          onChange={(event) => onTextChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Tab' && !event.shiftKey) {
              event.preventDefault()
              hrefRef.current?.focus()
              hrefRef.current?.select()
            }
            if (event.key === 'Enter') {
              event.preventDefault()
              onSave()
            }
            if (event.key === 'Escape') {
              event.preventDefault()
              // 只取消弹层，不冒泡到 window 退出源码 / 预览（第 43 轮）
              event.stopPropagation()
              onCancel()
            }
          }}
        />
      </label>
      <label className="link-editor-label">
        地址
        <input
          ref={hrefRef}
          className="link-editor-input"
          aria-label="链接地址"
          value={href}
          placeholder="https://"
          onChange={(event) => onHrefChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Tab' && event.shiftKey) {
              event.preventDefault()
              textRef.current?.focus()
              textRef.current?.select()
            }
            if (event.key === 'Tab' && !event.shiftKey) {
              event.preventDefault()
              textRef.current?.focus()
              textRef.current?.select()
            }
            if (event.key === 'Enter') {
              event.preventDefault()
              onSave()
            }
            if (event.key === 'Escape') {
              event.preventDefault()
              // 只取消弹层，不冒泡到 window 退出源码 / 预览（第 43 轮）
              event.stopPropagation()
              onCancel()
            }
          }}
        />
      </label>
      <p className="link-editor-hint">
        普通链接用 <kbd>Enter</kbd> 保存，<kbd>Esc</kbd> 取消
      </p>
    </div>,
    document.body,
  )
}
