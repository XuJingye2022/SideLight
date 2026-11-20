import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import { diffView, type DiffViewResult } from '../lib/diffView.ts'
import { useDialogFocus } from './useDialogFocus.ts'

/**
 * 「与打开时相比」的只读 diff 面板（第 100 轮 B-227）。
 *
 * 第 139 轮 B-229：从 `MarginRail.tsx` 拆成按开合加载的 lazy chunk。面板 JSX 与 `diffView`
 * 一起搬走，常驻的 `MarginRail-*.js` 不再背这块字；点「对比」才下载，关掉即卸载。
 * 面板挂到 body（栏里卡片是绝对定位，塞进 `.margin-rail` 流会被压），只读，不碰正文与批注。
 *
 * 验收证据：`docs/iteration/round-139/impl.md`、`.tmp/e2e-r100-diff.mjs`。
 */
type Props = {
  /** 点开时才调：这一刻的正文 vs 打开时；null = 这篇没有可对比的正文 */
  getDiff: () => { before: string; after: string } | null
  onClose: () => void
}

const markOf = (kind: 'same' | 'added' | 'removed') =>
  kind === 'added' ? '+' : kind === 'removed' ? '−' : ' '

export default function RailDiffPanel({ getDiff, onClose }: Props) {
  /** 挂载即算一次：面板只在打开时挂载，行永远是「点开这一刻」的 */
  const [diffData] = useState<DiffViewResult | 'none'>(() => {
    const pair = getDiff()
    return pair === null ? 'none' : diffView(pair.before, pair.after)
  })
  const sheetRef = useRef<HTMLDivElement | null>(null)
  // 本组件只在打开时挂载，第一参恒 true（首帧 ref 仍由 useDialogFocus 自己等 effect）
  useDialogFocus(true, sheetRef, '.rail-diff-overlay')

  // App 的 Esc 链挂在 window 上：在 document 就停掉冒泡，一次按键只关面板
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.stopPropagation()
      onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  return createPortal(
    <div
      className="rail-diff-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        className="rail-diff-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="rail-diff-title"
        tabIndex={-1}
        ref={sheetRef}
      >
        <div className="rail-diff-head">
          <span className="rail-diff-title" id="rail-diff-title">
            改动对比
          </span>
          <span>与打开时相比</span>
          {diffData !== 'none' && (diffData.added > 0 || diffData.removed > 0) && (
            <span className="rail-diff-count">
              +{diffData.added} −{diffData.removed} 行
            </span>
          )}
          <button type="button" className="rail-diff-close" aria-label="关闭对比" onClick={onClose}>
            ×
          </button>
        </div>
        {diffData === 'none' ? (
          <p className="rail-diff-empty">这篇还没有可对比的正文。</p>
        ) : diffData.added === 0 && diffData.removed === 0 ? (
          <p className="rail-diff-empty">与打开时相比，没有改动。</p>
        ) : (
          <>
            {diffData.truncated && <p className="rail-diff-empty">改动太多，只显示前 400 行。</p>}
            {/* 第 120 轮 B-250：面板里只有关闭钮一个 Tab 站，长 diff 键盘读不到第二屏——ul 自己进 Tab 序、焦点环走全局 :focus-visible */}
            <ul className="rail-diff-rows" role="list" tabIndex={0} aria-label="改动对比行">
              {diffData.rows.map((row, index) => (
                <li key={index} className={`rail-diff-row is-${row.kind}`}>
                  {`${markOf(row.kind)} ${row.text || ' '}`}
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>,
    document.body,
  )
}
