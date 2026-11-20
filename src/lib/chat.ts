import type { ChatMessage } from './ai.ts'

/**
 * 对话页签的纯逻辑（第 96 轮 B-223）：消息拼装、追加、换文档清空。
 * 组件只负责 DOM 与流式请求，这里不碰 DOM，方便单测。
 */

export type ChatTurn = {
  role: 'user' | 'assistant'
  text: string
}

/** 文档节选上限：整篇塞进 system 会把每次请求都撑大 */
export const CHAT_CONTEXT_LIMIT = 2000

/** 只带最近 12 轮（用户 + 助手合计），更早的丢掉 */
export const CHAT_HISTORY_LIMIT = 12

/**
 * 对话的 system 提示词：短、具体、不编造。
 * 「生成批注」是唯一能把意见落到页边的入口，正文只在人点「采纳」后才变。
 */
export const CHAT_SYSTEM_PROMPT = `你是 Sidelight 的侧灯，在右侧和作者讨论他正在写的这一篇。
回答要短、具体、直说：先给判断，再给一句能照着改的动作。不确定就说不确定，不编造事实，不替作者写正文。
作者想把某条意见落到页边，就点「生成批注」——那会按这句话给正文下批注；正文只在他点「采纳」后才变。`

/**
 * 送去模型的文档节选：去首尾空白，超长截断并留省略号。
 * 空文档回 `''`，让 buildChatMessages 走「还没有正文」那一支。
 */
export function chatContextOf(text: string, limit: number = CHAT_CONTEXT_LIMIT): string {
  const clean = text.trim()
  if (!clean) return ''
  if (clean.length <= limit) return clean
  return `${clean.slice(0, Math.max(0, limit - 1))}…`
}

/**
 * 一次对话请求的消息组：system（角色 + 文档节选）+ 最近若干轮。
 * 切片第一条是 assistant 时整段丢掉——没有对应的提问，助手那句就无从理解。
 */
export function buildChatMessages(docText: string, turns: ChatTurn[]): ChatMessage[] {
  const context = chatContextOf(docText)
  const system = context
    ? `${CHAT_SYSTEM_PROMPT}\n\n当前文档节选：\n${context}`
    : `${CHAT_SYSTEM_PROMPT}\n\n（当前文档还没有正文）`

  const recent = turns.slice(-CHAT_HISTORY_LIMIT)
  const firstUser = recent.findIndex((turn) => turn.role === 'user')
  const history = firstUser > 0 ? recent.slice(firstUser) : recent

  return [
    { role: 'system', content: system },
    ...history.map((turn) => ({ role: turn.role, content: turn.text })),
  ]
}

/** 追加一条：同角色也各占一条，不合并（合并会把两次提问压成一句） */
export function pushTurn(turns: ChatTurn[], role: ChatTurn['role'], text: string): ChatTurn[] {
  return [...turns, { role, text }]
}

/**
 * 流式追加：只补最后一条 assistant。
 * 没有可补的（空数组或末条是用户）就原样返回，免得每次 delta 都多一次渲染。
 */
export function appendDelta(turns: ChatTurn[], delta: string): ChatTurn[] {
  const last = turns[turns.length - 1]
  if (!last || last.role !== 'assistant') return turns
  return [...turns.slice(0, -1), { ...last, text: last.text + delta }]
}

/**
 * 第 111 轮 B-240：流式收尾要不要把焦点送回输入框。
 *
 * 只有「读者还在对话面板里」才送。两条出口都不送：
 * - 流式中止（换文档 / 点子元素卸载）：上下文已经换了，这一轮的字不该再把焦点抢回来；
 * - 焦点已经不在 `#rail-panel-chat` 里（点正文、点文件树、快速打开）：那是读者自己走开的。
 *
 * 普通收流且焦点仍在输入框 → 回焦，保留「Enter 发完接着写下一句」的既有手感。
 */
export function chatRefocusAfterStream(aborted: boolean, focusInPanel: boolean): boolean {
  return !aborted && focusInPanel
}

/**
 * 第 112 轮 A1：对话记录「还在看最新一条」的像素余量。
 *
 * 距底小于这个数就算贴底。不缓存「读者是不是上翻了」的判断：切页签、换文档、
 * 程序化滚动之后缓存都会过期，这里每次现场读三个数（`chatNearBottom`）。
 */
export const CHAT_STICK_SLACK = 32

/** `chatNearBottom` 只要这三个数，方便单测直接喂对象（不依赖 DOM） */
export type ChatScrollBox = { scrollTop: number; scrollHeight: number; clientHeight: number }

/**
 * 读者是否还贴着底部：距底 < slack。
 * 读更新后的值——delta 刚落进 DOM 时用新的 `scrollHeight` 算，单条分片增高超过
 * slack 就不再跟（方向是「少跟」而不是「拽回」）。
 */
export function chatNearBottom(rect: ChatScrollBox, slack: number = CHAT_STICK_SLACK): boolean {
  return rect.scrollHeight - rect.clientHeight - rect.scrollTop < slack
}

/**
 * 这一次更新要不要把记录滚到底。
 *
 * `grew` 是「整轮 +1」（新提问 / 切回对话页签）：无条件贴底，否则读者看不见自己刚发的那句。
 * 流式 delta 不算整轮，只在读者本来就贴底时才跟——上翻看历史时不能再被拽回（本缺陷）。
 */
export function chatScrollOnUpdate(grew: boolean, stick: boolean): boolean {
  return grew || stick
}
