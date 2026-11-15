import { useEffect, useRef } from 'react'
import type { RefObject } from 'react'

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

/**
 * 对话框焦点：打开时记住打开者、把焦点送进框内、Tab / Shift+Tab 在框内循环，关闭时还原焦点。
 * 打开期间给 overlay 之外的兄弟节点加 inert：`aria-modal` 只是声明，inert 才真的挡住 Tab 与读屏。
 */
export function useDialogFocus(open: boolean, dialogRef: RefObject<HTMLElement | null>): void {
  const openerRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!open) return
    const dialog = dialogRef.current
    if (!dialog) return

    openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const focusables = () => Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE))
    focusables()[0]?.focus()

    const overlay = dialog.closest('.overlay')
    const backdrop: HTMLElement[] = []
    const parent = overlay?.parentElement
    if (parent) {
      for (const sibling of Array.from(parent.children)) {
        if (sibling === overlay || !(sibling instanceof HTMLElement)) continue
        sibling.setAttribute('inert', '')
        backdrop.push(sibling)
      }
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return
      const items = focusables()
      if (items.length === 0) return
      const first = items[0]
      const last = items[items.length - 1]
      const active = document.activeElement
      const outside = !(active instanceof HTMLElement) || !dialog.contains(active)
      if (event.shiftKey && (outside || active === first)) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && (outside || active === last)) {
        event.preventDefault()
        first.focus()
      }
    }
    dialog.addEventListener('keydown', onKeyDown)

    return () => {
      dialog.removeEventListener('keydown', onKeyDown)
      for (const element of backdrop) element.removeAttribute('inert')
      const opener = openerRef.current
      openerRef.current = null
      // opener 可能随菜单/对话框一起被卸载；退到显式兜底节点或「文件」按钮，绝不落到 body
      const fallback =
        document.querySelector<HTMLElement>('[data-focus-fallback]') ??
        document.querySelector<HTMLElement>('.file-menu-trigger')
      const target =
        opener && opener !== document.body && document.contains(opener) ? opener : fallback
      target?.focus()
    }
  }, [open, dialogRef])
}
