import { useEffect, useRef } from 'react'

import { useDialogFocus } from './useDialogFocus.ts'

type Props = {
  open: boolean
  fileName: string
  onCancel: () => void
  onSaveDraft: () => void
  onDiscard: () => void
}

/**
 * 宿主关窗三选一。焦点显式放到「取消」：默认聚焦不可依赖 DOM 顺序，
 * 误按 Enter 也不能丢掉未写回的改动。
 */
export function CloseGuardDialog({ open, fileName, onCancel, onSaveDraft, onDiscard }: Props) {
  const dialogRef = useRef<HTMLDivElement | null>(null)
  const cancelRef = useRef<HTMLButtonElement | null>(null)
  useDialogFocus(open, dialogRef)

  useEffect(() => {
    if (!open) return
    const frame = requestAnimationFrame(() => cancelRef.current?.focus())
    return () => cancelAnimationFrame(frame)
  }, [open])

  if (!open) return null

  return (
    <div className="overlay" role="presentation" onMouseDown={onCancel}>
      <div
        ref={dialogRef}
        className="dialog close-guard-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="关闭确认"
        aria-labelledby="close-guard-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <h2 id="close-guard-title">「{fileName}」有改动还没写回文件</h2>
        <p className="dialog-note">现在关窗，这些改动会丢失。</p>
        <div className="dialog-actions">
          <button ref={cancelRef} type="button" onClick={onCancel}>
            取消
          </button>
          <button type="button" onClick={onSaveDraft}>
            保存草稿并关闭
          </button>
          <button type="button" className="primary" onClick={onDiscard}>
            放弃并关闭
          </button>
        </div>
      </div>
    </div>
  )
}
