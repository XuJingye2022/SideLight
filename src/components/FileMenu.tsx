import { useEffect, useRef, useState } from 'react'

type Props = {
  onNew: () => void
  onSaveAs: () => void
  onOpenFile: () => void
  onOpenFolder: () => void
}

/**
 * 顶栏「文件 ▾」：新建 / 另存为 / 打开文件 / 打开文件夹随时可用。
 * Esc 关闭菜单并把焦点还给按钮；aria-haspopup / aria-expanded 让读屏也知道是菜单。
 */
export function FileMenu({ onNew, onSaveAs, onOpenFile, onOpenFolder }: Props) {
  const [open, setOpen] = useState(false)
  const buttonRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      setOpen(false)
      buttonRef.current?.focus()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open])

  const pick = (action: () => void) => {
    setOpen(false)
    action()
  }

  return (
    <div className="file-menu-wrap">
      <button
        ref={buttonRef}
        type="button"
        className="file-menu-trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        文件 ▾
      </button>
      {open && (
        <div className="menu file-menu" role="menu" aria-label="文件">
          <button type="button" role="menuitem" onClick={() => pick(onNew)}>
            新建
          </button>
          <button type="button" role="menuitem" onClick={() => pick(onSaveAs)}>
            另存为…
          </button>
          <button type="button" role="menuitem" onClick={() => pick(onOpenFile)}>
            打开文件…
          </button>
          <button type="button" role="menuitem" onClick={() => pick(onOpenFolder)}>
            打开文件夹…
          </button>
        </div>
      )}
    </div>
  )
}
