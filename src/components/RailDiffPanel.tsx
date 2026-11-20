import { useEffect, useRef, useState } from 'react'

import { stripLineMarkup } from '../lib/annotations.ts'
import { diffView, type DiffRow, type DiffViewResult } from '../lib/diffView.ts'

/**
 * 「与打开时相比」的只读 diff（第 100 轮 B-227）。
 *
 * 第 140 轮 A2：从右栏的悬浮小窗改成顶栏「对比」切换的全宽模式——面板是 `main` 的直系子节点
 * （编辑块 hidden 让位），宽度天然等于 `main.clientWidth`，不再是 portal + 模态。面板与 `diffView`
 * 仍是按开合加载的 lazy chunk：点开才下载，关掉即卸载。
 *
 * 点一行回正文：行文本是 Markdown（`## 标题`、`- 项`、`**粗**`），App 的 `onJump` 负责剥标记、
 * 在正文索引里定位、关面板、等编辑块可见再选中。空行 / 围栏 / 表格 / removed 行不给手型、不定位。
 */
type Props = {
  /** 点开时才调：这一刻的正文 vs 打开时；null = 这篇没有可对比的正文 */
  getDiff: () => { before: string; after: string } | null
  /** 点一行：App 关面板并把正文选区落到这一行 */
  onJump: (row: DiffRow) => void
  onClose: () => void
}

const markOf = (kind: 'same' | 'added' | 'removed') =>
  kind === 'added' ? '+' : kind === 'removed' ? '−' : ' '

/** 空行、围栏、表格、removed 行剥完是空串：不定位、也不弹提示 */
const jumpable = (row: DiffRow) => row.kind !== 'removed' && stripLineMarkup(row.text).length > 0

export default function RailDiffPanel({ getDiff, onJump, onClose }: Props) {
  /** 挂载即算一次：面板只在打开时挂载，行永远是「点开这一刻」的；长文上限 2,000 行 */
  const [diffData] = useState<DiffViewResult | 'none'>(() => {
    const pair = getDiff()
    return pair === null ? 'none' : diffView(pair.before, pair.after, { maxRows: 2000 })
  })
  const rowsRef = useRef<HTMLUListElement | null>(null)
  const closeRef = useRef<HTMLButtonElement | null>(null)

  // 打开即把焦点送进行列表（长 diff 要能用键盘读第二屏）；空态没有列表就落到关闭钮
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      if (rowsRef.current) rowsRef.current.focus()
      else closeRef.current?.focus()
    })
    return () => cancelAnimationFrame(frame)
  }, [])

  return (
    <section id="diff-view" className="diff-view" aria-label="改动对比">
      <div className="rail-diff-head">
        <span className="rail-diff-title">与打开时相比</span>
        {diffData !== 'none' && (diffData.added > 0 || diffData.removed > 0) && (
          <span className="rail-diff-count">
            +{diffData.added} −{diffData.removed} 行
          </span>
        )}
        <button ref={closeRef} type="button" className="rail-diff-close" aria-label="关闭对比" onClick={onClose}>
          ×
        </button>
      </div>
      {diffData === 'none' ? (
        <p className="rail-diff-empty">这篇还没有可对比的正文。</p>
      ) : diffData.added === 0 && diffData.removed === 0 ? (
        <p className="rail-diff-empty">与打开时相比，没有改动。</p>
      ) : (
        <>
          {diffData.truncated && <p className="rail-diff-empty">改动太多，只显示前 2,000 行。</p>}
          {/* 第 120 轮 B-250：ul 自己进 Tab 序（面板打开即聚焦），PageDown/End 能读到后面 */}
          <ul className="rail-diff-rows" role="list" tabIndex={0} aria-label="改动对比行" ref={rowsRef}>
            {diffData.rows.map((row, index) => (
              <li
                key={index}
                className={`rail-diff-row is-${row.kind}${jumpable(row) ? ' is-jump' : ''}`}
                onClick={jumpable(row) ? () => onJump(row) : undefined}
              >
                {`${markOf(row.kind)} ${row.text || ' '}`}
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}
