import { useEffect, useRef, useState } from 'react'

import { errorCopy, streamChat } from '../lib/ai.ts'
import {
  appendDelta,
  buildChatMessages,
  chatContextFor,
  chatNearBottom,
  chatRefocusAfterStream,
  chatScrollOnUpdate,
  chatSpeaker,
  dropEmptyAssistantTail,
  pushTurn,
  type ChatTurn,
} from '../lib/chat.ts'
import type { Block } from '../lib/context.ts'
import type { Settings } from '../lib/settings.ts'

/**
 * 「对话」页签（第 96 轮 B-223；第 104 轮 B-232 / 111 轮 B-240 / 112 轮 B-245 / 116 轮 B-242 /
 * 118 轮 B-244 / 134 轮 B-264 的焦点、贴底、署名、Tab 站都在这块）。
 *
 * 第 139 轮 B-229：从 `MarginRail.tsx` 拆成按开合加载的 lazy chunk——`chat.ts` 随组件走，
 * 常驻的 `MarginRail-*.js` 不再背对话逻辑与 JSX。首开 `railTab === 'chat'` 才挂载，
 * 之后 `#rail-panel-chat` 保持挂载（hidden）保住 `turns`；换文档由调用方 `key={docKey}` 重挂清空。
 *
 * 验收证据：`docs/iteration/round-139/impl.md`、`.tmp/e2e-r96-a1-chat.mjs`、`.tmp/e2e-r139-suspense.mjs`。
 */
type Props = {
  settings: Settings
  /** 没配 API Key，回答是本地模拟的 */
  simulated: boolean
  /** 页签是否停在对话：贴底判据与 `hidden` 面板的 scrollHeight 前提都按它判 */
  tabActive: boolean
  analyzing: boolean
  /** 只有编辑视图能生成批注：源码 / 预览态下批注落不进正文 */
  canGenerate: boolean
  /** 取当前正文的块与光标/选区（拼装与截断在 chat.ts）；null = 没有编辑器（还没有正文） */
  getChatSource: () => { blocks: Block[]; from: number; to: number } | null
  /** 「生成批注」：把输入框里这句话交给 App 跑一次分析 */
  onGenerateNotes: (instruction: string) => void
}

export default function RailChat({
  settings,
  simulated,
  tabActive,
  analyzing,
  canGenerate,
  getChatSource,
  onGenerateNotes,
}: Props) {
  const [turns, setTurns] = useState<ChatTurn[]>([])
  const [chatDraft, setChatDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [chatError, setChatError] = useState('')
  const ctrlRef = useRef<AbortController | null>(null)
  const logRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLTextAreaElement | null>(null)
  /** 卸载后流式回调还会到：先记活着，再决定要不要 setState */
  const aliveRef = useRef(true)
  /** 第 112 轮 A1：上一次渲染的轮数 / 页签，只认「整轮变化」（delta 只加字，不加条） */
  const turnCountRef = useRef(0)
  const prevTabRef = useRef(tabActive)

  const resetChat = () => {
    ctrlRef.current?.abort()
    ctrlRef.current = null
    setTurns([])
    setChatDraft('')
    setChatError('')
    setBusy(false)
  }

  useEffect(() => {
    aliveRef.current = true
    return () => {
      aliveRef.current = false
      ctrlRef.current?.abort()
    }
  }, [])

  // 第 112 轮 A1：上翻看历史时 delta 不拽回。整轮 +1（新提问 / 切回页签）才无条件贴底；
  // 流式 delta 只在读者本来贴着底部时才跟（判据现场读，不缓存——缓存会被切页签与换文档弄过期）。
  // 第 104 轮 B-232 的前提仍成立：批注页签下面板 hidden、scrollHeight 恒 0，所以切回时才贴底。
  useEffect(() => {
    const tabChanged = prevTabRef.current !== tabActive
    prevTabRef.current = tabActive
    if (!tabActive) return
    const log = logRef.current
    if (!log) return
    const grew = turns.length !== turnCountRef.current || tabChanged
    turnCountRef.current = turns.length
    if (!chatScrollOnUpdate(grew, chatNearBottom(log))) return
    log.scrollTop = log.scrollHeight
  }, [turns, tabActive])

  const send = async () => {
    const text = chatDraft.trim()
    if (!text || busy) return
    // 第 134 轮 A1（B-264）：鼠标点「发送」后钮会置灰，Chromium 把焦点还给 body；先移焦再置灰
    inputRef.current?.focus()
    const next = pushTurn(turns, 'user', text)
    // 先放一条空的 assistant 占位：流式回来的字才有地方落
    setTurns([...next, { role: 'assistant', text: '' }])
    setChatDraft('')
    setChatError('')
    setBusy(true)

    const controller = new AbortController()
    ctrlRef.current = controller
    // 第 125 轮 A1：上下文跟选区/光标走；没有编辑器就是空串（buildChatMessages 走「还没有正文」）
    const source = getChatSource()
    const docText = source ? chatContextFor(source.blocks, source.from, source.to) : ''
    try {
      await streamChat({
        settings,
        messages: buildChatMessages(docText, next),
        signal: controller.signal,
        onDelta: (delta) => {
          if (!aliveRef.current) return
          setTurns((previous) => appendDelta(previous, delta))
        },
      })
    } catch (error) {
      const aborted = error instanceof DOMException && error.name === 'AbortError'
      // 第 113 轮 B-243：失败收尾撤掉从没被填过的空占位，别在记录底部留一条空框
      if (!aborted && aliveRef.current) {
        setChatError(errorCopy(error).text)
        setTurns((previous) => dropEmptyAssistantTail(previous))
      }
    } finally {
      if (ctrlRef.current === controller) ctrlRef.current = null
      if (aliveRef.current) {
        setBusy(false)
        // 第 111 轮 B-240：中止（换文档 / 卸载）或读者已把焦点移出对话面板时，收尾别再抢焦点
        // 第 134 轮 A1（B-264）：鼠标点「发送」会让钮置灰、焦点掉 body——读到 body 就是「丢焦点」，不算读者走开
        const panel = document.getElementById('rail-panel-chat')
        const focusInPanel = !!panel?.contains(document.activeElement) || document.activeElement === document.body
        if (chatRefocusAfterStream(controller.signal.aborted, focusInPanel)) inputRef.current?.focus()
      }
    }
  }

  const generateNotes = () => {
    const instruction = chatDraft.trim()
    if (!instruction || busy || analyzing || !canGenerate) return
    // 第 104 轮 B-232：这句指令留在对话记录里。它没有送模型（只作分析偏好），
    // 但失败/早退（Key 错、正文太短）时读者还能照着这句重来，不是凭空清空。
    setTurns((previous) => pushTurn(previous, 'user', instruction))
    setChatDraft('')
    setChatError('')
    onGenerateNotes(instruction)
  }

  return (
    <>
      <div className="rail-chat-head">
        <span className="rail-chat-title">和侧灯说一句</span>
        <button
          type="button"
          className="rail-chat-reset"
          disabled={busy || (turns.length === 0 && !chatDraft)}
          onClick={resetChat}
        >
          新对话
        </button>
      </div>

      {simulated && <p className="rail-chat-mock">未配置 API Key，回答是本地模拟的，不调用模型</p>}

      <div className="rail-chat-log" tabIndex={0} role="log" aria-live={busy ? 'off' : 'polite'} aria-busy={busy} aria-label="对话记录" ref={logRef}>
        {turns.length === 0 && (
          <div className="rail-empty rail-chat-empty">
            <p className="rail-empty-title">和侧灯说一句</p>
            <p className="rail-empty-sub">让它找问题、给改法；要落正文点「生成批注」。上下文最多 2000 字：有选区用选区，没选区取光标所在段；刚打开时取开头。</p>
          </div>
        )}
        {turns.map((turn, index) => (
          <p key={index} className={`rail-chat-turn is-${turn.role}`}>
            {(turn.text || busy) && <span className="rail-chat-speaker">{chatSpeaker(turn.role)}</span>}
            {turn.text || (busy && turn.role === 'assistant' ? '…' : '')}
          </p>
        ))}
      </div>

      {chatError && (
        <p className="rail-chat-error" role="alert">
          {chatError}
        </p>
      )}

      <div className="rail-chat-compose">
        <textarea
          ref={inputRef}
          className="rail-chat-input"
          rows={2}
          aria-label="和侧灯说一句"
          placeholder="和侧灯说一句…"
          value={chatDraft}
          onChange={(event) => setChatDraft(event.target.value)}
          onKeyDown={(event) => {
            // 组合输入里的回车是选字，不是发送；Shift+Enter 换行
            if (event.key !== 'Enter' || event.shiftKey || event.nativeEvent.isComposing) return
            event.preventDefault()
            void send()
          }}
        />
        <button type="button" className="rail-chat-send" disabled={busy || !chatDraft.trim()} onClick={() => void send()}>
          发送
        </button>
        <button
          type="button"
          className="rail-chat-generate"
          disabled={busy || !chatDraft.trim() || analyzing || !canGenerate}
          title={
            !canGenerate
              ? '切回编辑视图再生成批注'
              : !chatDraft.trim()
                ? '先写一句要落成批注的话'
                : analyzing
                  ? '正在分析，稍等'
                  : '按这句话分析当前这一段，生成批注'
          }
          onClick={generateNotes}
        >
          生成批注
        </button>
      </div>
    </>
  )
}
