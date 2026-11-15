import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

type Props = {
  /** 被点元素的屏幕坐标，浮层贴它出现 */
  anchor: DOMRect
  label: string
  onClose: () => void
  children: React.ReactNode
}

const WIDTH = 360
const MARGIN = 12
const ESTIMATED_HEIGHT = 190

/**
 * 贴着元素的小浮层。宽度固定、横向夹在视口内，
 * 下方空间不够就翻到上面；Esc、点外面都关闭。
 */
export function InlinePopover({ anchor, label, onClose, children }: Props) {
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (ref.current && event.target instanceof Node && ref.current.contains(event.target)) return
      onClose()
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.stopPropagation()
      onClose()
    }

    document.addEventListener('mousedown', onPointerDown, true)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown, true)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [onClose])

  const viewportWidth = typeof window === 'undefined' ? 1280 : window.innerWidth
  const viewportHeight = typeof window === 'undefined' ? 800 : window.innerHeight
  const width = Math.min(WIDTH, viewportWidth - MARGIN * 2)
  const left = Math.min(Math.max(MARGIN, anchor.left), viewportWidth - width - MARGIN)

  const below = anchor.bottom + 8
  const flipUp = below + ESTIMATED_HEIGHT > viewportHeight && anchor.top > ESTIMATED_HEIGHT
  const top = flipUp ? Math.max(MARGIN, anchor.top - ESTIMATED_HEIGHT - 8) : below

  return createPortal(
    <div
      className="popover"
      role="dialog"
      aria-label={label}
      ref={ref}
      style={{ position: 'fixed', left, top, width }}
    >
      {children}
    </div>,
    document.body,
  )
}
