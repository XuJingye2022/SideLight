import { useState } from 'react'

import type { Annotation, DocNote } from '../lib/annotations.ts'
import { noteAriaLabel, noteJumpKey } from '../lib/noteA11y.ts'
import { InlineText } from './InlineText.tsx'

type Props = {
  annotations: Annotation[]
  tops: Record<string, number>
  activeId: string | null
  analyzing: boolean
  unresolved: number
  /** 全文总评与未定位批注，不写正文 */
  docNotes?: DocNote[]
  /** 没配 API Key，批注是本地模拟生成的 */
  simulated: boolean
  /** 卡片区需要为「整体评价」面板让出的高度（栏内 px）；0 表示不需要 spacer */
  railSpace: number
  /** 右侧页签：对话 / 批注（第 94 轮 B-221）。默认「批注」 */
  railTab: 'chat' | 'notes'
  onTabChange: (tab: 'chat' | 'notes') => void
  /** 窄窗抽屉的关闭按钮；宽窗不传就不显示 */
  onClose?: () => void
  goal: string
  discussingId: string | null
  verifyingId: string | null
  searchReady: boolean
  onHover: (id: string | null) => void
  onFocusNote: (annotation: Annotation) => void
  /** 卡片拿到焦点后按 Enter：跳到正文里对应的句子（第 86 轮 B-141） */
  onJumpToNote: (annotation: Annotation) => void
  onDiscuss: (annotation: Annotation, text: string) => void
  onVerify: (annotation: Annotation) => void
  onRefine: (annotation: Annotation) => void
  onGoalRetry: () => void
  onRequestLayout: () => void
  onAccept: (annotation: Annotation) => void
  onDismiss: (annotation: Annotation) => void
  registerRef: (id: string, node: HTMLElement | null) => void
  railRef: React.RefObject<HTMLDivElement | null>
}

export function MarginRail({
  annotations,
  tops,
  activeId,
  analyzing,
  unresolved,
  docNotes = [],
  simulated,
  onClose,
  goal,
  discussingId,
  verifyingId,
  searchReady,
  onHover,
  onFocusNote,
  onJumpToNote,
  onDiscuss,
  onVerify,
  onRefine,
  onGoalRetry,
  onRequestLayout,
  onAccept,
  onDismiss,
  registerRef,
  railRef,
  railSpace,
  railTab,
  onTabChange,
}: Props) {
  const pending = annotations.filter((annotation) => annotation.status === 'pending')
  const [openThread, setOpenThread] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [overallOpen, setOverallOpen] = useState(true)
  const overall = docNotes.filter((note) => note.kind === 'overall')
  const unresolvedNotes = docNotes.filter((note) => note.kind === 'unresolved')

  return (
    <aside className="margin-rail" id="margin-rail" ref={railRef} aria-label="侧灯">
      <div className="rail-head">
        <span className="rail-light" aria-hidden="true" />
        <span className="rail-title">侧灯</span>
        {analyzing && <span className="rail-busy">正在读</span>}
        {!analyzing && pending.length > 0 && <span className="rail-count">{pending.length} 条</span>}
        {onClose && (
          <button type="button" className="rail-close" onClick={onClose} aria-label="关闭批注">
            ×
          </button>
        )}
      </div>

      {/* 第 94 轮 B-221：右侧双页签。只做页签与占位，对话内容下一批接入 */}
      <div className="rail-tabs" role="tablist" aria-label="侧灯页签">
        {(['chat', 'notes'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            role="tab"
            id={`rail-tab-${tab}`}
            aria-selected={railTab === tab}
            aria-controls={`rail-panel-${tab}`}
            tabIndex={railTab === tab ? 0 : -1}
            className={railTab === tab ? 'is-active' : ''}
            onClick={() => onTabChange(tab)}
            onKeyDown={(event) => {
              if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
              event.preventDefault()
              const next =
                event.key === 'Home'
                  ? 'chat'
                  : event.key === 'End'
                    ? 'notes'
                    : tab === 'chat'
                      ? 'notes'
                      : 'chat'
              onTabChange(next)
              requestAnimationFrame(() => document.getElementById(`rail-tab-${next}`)?.focus())
            }}
          >
            {tab === 'chat' ? '对话' : '批注'}
          </button>
        ))}
      </div>

      {/* 包一层只做页签显隐：不加 position / overflow，卡片的绝对定位仍参照 .margin-rail，
          「整体评价」也仍是相对 .doc-scroll 的 sticky */}
      <div
        id="rail-panel-notes"
        className="rail-panel-notes"
        role="tabpanel"
        aria-labelledby="rail-tab-notes"
        hidden={railTab !== 'notes'}
      >
      {goal && (
        <div className="rail-goal">
          <span className="rail-goal-label">我的理解</span>
          <span className="rail-goal-text">{goal.replace(/^我判断这段的意图是[：:]\s*/, '')}</span>
          <button type="button" className="rail-goal-retry" onClick={onGoalRetry}>
            判错了，重来
          </button>
        </div>
      )}

      {unresolved > 0 && (
        <p className="rail-notice">
          {simulated ? '这段太短，选中一段正文再试。' : `${unresolved} 条引文没找到，已收进整体评价。`}
        </p>
      )}

      {simulated && <p className="rail-notice-mock">未配置 API Key，下面是本地模拟批注，不调用模型</p>}

      {pending.length === 0 && !analyzing && (
        <div className="rail-empty">
          <p className="rail-empty-title">选中一段，按 Ctrl + Enter</p>
          <p className="rail-empty-sub">批注会停在对应的句子旁边。</p>
        </div>
      )}

      {pending.map((annotation, index) => (
        <article
          key={annotation.id}
          ref={(node) => registerRef(annotation.id, node)}
          className={`note note-${annotation.kind}${activeId === annotation.id ? ' is-active' : ''}`}
          style={{ top: `${tops[annotation.id] ?? 0}px` }}
          // 第 86 轮 B-141：卡片自己成为一个 Tab 站，读屏拿到「第 N 处 + 类型 + 引文」
          tabIndex={0}
          role="group"
          aria-label={noteAriaLabel(index, annotation)}
          onKeyDown={(event) => {
            if (!noteJumpKey(event)) return
            event.preventDefault()
            onJumpToNote(annotation)
          }}
          onClick={() => onFocusNote(annotation)}
          onMouseEnter={() => onHover(annotation.id)}
          onMouseLeave={() => onHover(null)}
        >
          <header className="note-head">
            <span className={`note-kind note-kind-${annotation.kind}`}>
              {annotation.kind === 'revision' ? '修订' : '评价'}
            </span>
            {simulated && <span className="note-kind note-kind-mock">模拟</span>}
            <span className="note-index">第 {index + 1} 处</span>
          </header>

          {annotation.kind === 'revision' ? (
            <div className="note-diff">
              <span className="diff-old">{annotation.quote}</span>
              <span className="diff-arrow">→</span>
              <span className="diff-new">{annotation.replacement}</span>
            </div>
          ) : (
            <p className="note-quote">“{annotation.quote}”</p>
          )}

          <p className="note-text">
            <InlineText text={annotation.note} />
          </p>

          {annotation.thread && annotation.thread.length > 0 && (
            <div className="thread">
              {annotation.thread.map((turn, index) => (
                <p key={index} className={`thread-turn thread-${turn.role}`}>
                  {turn.text ? <InlineText text={turn.text} /> : <span className="thread-typing">…</span>}
                </p>
              ))}
            </div>
          )}

          <footer className="note-actions" onClick={(event) => event.stopPropagation()}>
            {annotation.kind === 'revision' ? (
              <>
                <button type="button" className="accept" onClick={() => onAccept(annotation)}>
                  采纳
                </button>
                <button type="button" onClick={() => onDismiss(annotation)}>
                  忽略
                </button>
              </>
            ) : (
              <button type="button" onClick={() => onDismiss(annotation)}>
                知道了
              </button>
            )}
            <button
              type="button"
              className={openThread === annotation.id ? 'is-on' : ''}
              onClick={() => {
                setOpenThread(openThread === annotation.id ? null : annotation.id)
                onRequestLayout()
              }}
            >
              追问
            </button>
            <button
              type="button"
              disabled={!searchReady || verifyingId === annotation.id}
              title={searchReady ? '用搜索服务找可引用的出处' : '先在设置里选搜索服务并填 Key'}
              onClick={() => {
                onVerify(annotation)
                onRequestLayout()
              }}
            >
              {verifyingId === annotation.id ? '核对中…' : '联网核对'}
            </button>
          </footer>

          {annotation.sources && annotation.sources.length > 0 && (
            <>
              <ul className="sources">
                {annotation.sources.map((source) => (
                  <li key={source.url}>
                    <a href={source.url} target="_blank" rel="noreferrer noreferrer">
                      {source.title}
                    </a>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                className="link-button"
                disabled={discussingId === annotation.id}
                onClick={(event) => {
                  event.stopPropagation()
                  onRefine(annotation)
                  onRequestLayout()
                }}
              >
                让侧灯按这些出处重写核实
              </button>
            </>
          )}

          {openThread === annotation.id && (
            <div className="thread-input" onClick={(event) => event.stopPropagation()}>
              <input
                value={draft}
                placeholder="就这条批注追问一句…"
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key !== 'Enter') return
                  event.preventDefault()
                  if (draft.trim().length === 0 || discussingId === annotation.id) return
                  onDiscuss(annotation, draft.trim())
                  setDraft('')
                  onRequestLayout()
                }}
              />
              <button
                type="button"
                disabled={discussingId === annotation.id || draft.trim().length === 0}
                onClick={() => {
                  onDiscuss(annotation, draft.trim())
                  setDraft('')
                  onRequestLayout()
                }}
              >
                {discussingId === annotation.id ? '…' : '发送'}
              </button>
            </div>
          )}
        </article>
      ))}
      {/* 给钉在视口底的「整体评价」面板让位：卡片是绝对定位，不占流，不让位就会被面板压住 */}
      {pending.length > 0 && railSpace > 0 && (
        <div className="rail-cards-space" style={{ height: `${railSpace}px` }} aria-hidden="true" />
      )}
      {(overall.length > 0 || unresolvedNotes.length > 0) && (
        <section className="rail-overall" aria-label="整体评价">
          <button
            type="button"
            className="rail-overall-head"
            aria-expanded={overallOpen}
            onClick={() => setOverallOpen(!overallOpen)}
          >
            <span>整体评价</span>
            <span className="rail-overall-count">{overall.length + unresolvedNotes.length}</span>
            <span aria-hidden="true">{overallOpen ? '收起' : '展开'}</span>
          </button>
          {overallOpen && (
            <div className="rail-overall-body">
              {overall.map((note) => (
                <p key={note.id} className="rail-overall-note">
                  <InlineText text={note.note} />
                </p>
              ))}
              {unresolvedNotes.map((note) => (
                <div key={note.id} className="rail-unresolved">
                  <span className="rail-unresolved-label">未定位</span>
                  {note.quote && <span className="rail-unresolved-quote">“{note.quote}”</span>}
                  <p>
                    <InlineText text={note.note} />
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
      </div>

      <div
        id="rail-panel-chat"
        className="rail-panel-chat"
        role="tabpanel"
        aria-labelledby="rail-tab-chat"
        hidden={railTab !== 'chat'}
      >
        <div className="rail-empty rail-chat-empty">
          <p className="rail-empty-title">对话还没接入</p>
          <p className="rail-empty-sub">这里会放和侧灯的一问一答。</p>
        </div>
        {/* 禁用是刻意的：本轮只交付页签与占位，输入与发送下一批接入 */}
        <div className="rail-chat-compose">
          <input disabled aria-label="对话输入（未接入）" placeholder="和侧灯说一句…" />
          <button type="button" disabled>
            发送
          </button>
        </div>
        <p className="rail-chat-hint">下一批接入对话、消息与生成批注</p>
      </div>
    </aside>
  )
}
