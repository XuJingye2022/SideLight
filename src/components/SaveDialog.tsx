import { useRef } from 'react'

import type { Loss } from '../lib/risk.ts'
import { useDialogFocus } from './useDialogFocus.ts'

type Props = {
  open: boolean
  /** 要拦下来的结构损失（已按 activeLosses 过滤） */
  losses: Loss[]
  onConfirm: () => void
  onCancel: () => void
  onOpenSource?: () => void
}

const MAX_LINES = 3

/** 按类别分组，同一类只列一次；每类最多列 3 行原文 */
function groupsOf(losses: Loss[]): Array<{ label: string; kind: string; before: string[]; count: number; blocking: boolean }> {
  const groups = new Map<string, { label: string; kind: string; before: string[]; count: number; blocking: boolean }>()
  for (const loss of losses) {
    const key = `${loss.kind}:${loss.label}`
    const group = groups.get(key)
    if (group) {
      group.count += loss.count
      for (const line of loss.before) {
        if (group.before.length < MAX_LINES) group.before.push(line)
      }
      continue
    }
    groups.set(key, {
      label: loss.label,
      kind: loss.kind,
      before: loss.before.slice(0, MAX_LINES),
      count: loss.count,
      blocking: loss.blocking,
    })
  }
  return [...groups.values()]
}

export function SaveDialog({ open, losses, onConfirm, onCancel, onOpenSource }: Props) {
  const dialogRef = useRef<HTMLDivElement | null>(null)
  useDialogFocus(open, dialogRef)
  if (!open) return null

  const groups = groupsOf(losses)
  const blocking = groups.filter((group) => group.blocking)
  const equivalent = groups.filter((group) => !group.blocking)

  return (
    <div className="overlay" role="presentation" onMouseDown={onCancel}>
      <div
        ref={dialogRef}
        className="dialog save-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="保存前确认"
        aria-labelledby="save-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <h2 id="save-title">保存后这些写法会被改写</h2>
        <p className="dialog-note">
          下面这些结构在载入时就存在，保存后会丢掉或重排。取消不会写入任何字节。
        </p>

        <div className="loss-view">
          {blocking.map((group) => (
            <section key={`${group.kind}-${group.label}`} className="loss-group" data-kind={group.kind}>
              <h3>{group.label}</h3>
              <p className="loss-count">影响 {group.count} 处</p>
              <pre className="loss-sample">{group.before.join('\n') || '（无原文可显示）'}</pre>
            </section>
          ))}
          {blocking.length === 0 && <p className="dialog-note">没有会丢的结构，只有等价改写。</p>}
          {equivalent.length > 0 && (
            <section className="loss-group loss-group-quiet">
              <h3>等价改写（不拦保存）</h3>
              <ul>
                {equivalent.map((group) => (
                  <li key={group.kind}>{group.label}：{group.count} 处</li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <div className="dialog-actions">
          {onOpenSource && (
            <button type="button" onClick={onOpenSource}>
              在源码模式看原文
            </button>
          )}
          <button type="button" onClick={onCancel}>
            取消
          </button>
          <button type="button" className="primary" onClick={onConfirm}>
            仍然保存
          </button>
        </div>
      </div>
    </div>
  )
}
