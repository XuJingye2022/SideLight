import { useEffect, useRef } from 'react'
import type { RefObject } from 'react'

import { firstTabbableIndex, lastTabbableIndex } from '../lib/dialogFocus.ts'

/** 对话框内可聚焦的选择器；第 126 轮导出给窄窗抽屉的 Tab 环回用（`MarginRail` 的 onRailKeyDown）。 */
export const FOCUSABLE = [
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
 * `overlaySelector`：包住对话框的那层浮层（默认 `.overlay`；快速打开用的是 `.quick-open-backdrop`）。
 * `restoreFocus`：关闭时是否还原到打开者。组件卸载即关闭、关闭后由调用方按视图分派焦点时传 false，
 * 否则会先落到打开它的按钮上，再被调用方的 rAF 抢走（第 68 轮 B-146）。
 */
export function useDialogFocus(
  open: boolean,
  dialogRef: RefObject<HTMLElement | null>,
  overlaySelector = '.overlay',
  restoreFocus = true,
): void {
  const openerRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!open) return
    const dialog = dialogRef.current
    if (!dialog) return

    openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const focusables = () => Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE))
    /**
     * Tab 序只算 tabIndex ≥ 0 的项（第 82 轮 B-109）：主题单选组是 roving tabindex，组内只有选中项
     * 进 Tab 序；拿 −1 项当初始落点或环边界，会让焦点落在未选中项、Shift+Tab 还会直接跑出对话框。
     * 首/末都取 tabIndex ≥ 0 的项，中间夹着的 −1 项一并剔掉。
     */
    const tabbables = () => {
      const items = focusables()
      const tabs = items.map((element) => element.tabIndex)
      const from = firstTabbableIndex(tabs)
      const to = lastTabbableIndex(tabs)
      if (from < 0 || to < 0) return []
      return items.slice(from, to + 1).filter((element) => element.tabIndex >= 0)
    }
    // 一项可 Tab 的都没有时退回老行为（仍然送焦，不把用户留在对话框外）
    const initial = tabbables()[0] ?? focusables()[0]
    initial?.focus()

    const overlay = dialog.closest(overlaySelector)
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
      // 环的边界用 Tab 序；全组都不可 Tab 时退回全部可聚焦项，焦点一样不许跑出对话框
      const usable = tabbables()
      const items = usable.length > 0 ? usable : focusables()
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
      if (!restoreFocus) return
      // opener 可能随菜单/对话框一起被卸载；退到显式兜底节点或「文件」按钮，绝不落到 body
      const fallback =
        document.querySelector<HTMLElement>('[data-focus-fallback]') ??
        document.querySelector<HTMLElement>('.file-menu-trigger')
      const target =
        opener && opener !== document.body && document.contains(opener) ? opener : fallback
      target?.focus()
    }
  }, [open, dialogRef, overlaySelector, restoreFocus])
}
