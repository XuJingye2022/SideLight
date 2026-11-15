import type { ContextPayload } from './context.ts'
import type { ParsedAnnotation } from './annotations.ts'
import { DEFAULT_ANALYSIS_PROMPT, buildUserMessage } from './prompt.ts'
import type { Settings } from './settings.ts'

export type StreamOptions = {
  settings: Settings
  context: ContextPayload
  onDelta: (delta: string) => void
  signal?: AbortSignal
}

export type ChatMessage = {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export function buildMessages(context: ContextPayload, prompt = DEFAULT_ANALYSIS_PROMPT): ChatMessage[] {
  return [
    { role: 'system', content: prompt },
    { role: 'user', content: buildUserMessage(context) },
  ]
}

export function messageOf(error: unknown): string {
  if (error instanceof Error && error.message) return error.message
  return '请求失败，原因未知。'
}

export type ModelErrorKind = 'auth' | 'rate' | 'network' | 'server' | 'unknown'

/** 模型请求失败：kind 决定给用户看的话，status / detail 只作调试信息 */
export class ModelRequestError extends Error {
  readonly kind: ModelErrorKind
  readonly status?: number
  readonly detail?: string

  constructor(kind: ModelErrorKind, message: string, status?: number, detail?: string) {
    super(message)
    this.name = 'ModelRequestError'
    this.kind = kind
    this.status = status
    this.detail = detail
  }
}

export type ErrorCopy = { text: string; action?: 'settings' | 'retry' }

function kindOfStatus(status: number): ModelErrorKind {
  if (status === 401 || status === 403) return 'auth'
  if (status === 429) return 'rate'
  if (status >= 500) return 'server'
  return 'unknown'
}

function looksLikeNetwork(error: unknown): boolean {
  if (error instanceof TypeError) return true
  const message = error instanceof Error ? error.message : String(error ?? '')
  return /Failed to fetch|NetworkError|fetch failed|network|连不上/i.test(message)
}

/**
 * 把错误翻成「原因 + 下一步」的纯函数（不碰 DOM，可单测）。
 * action 表示该给用户哪个按钮：打开设置，或重试。
 */
export function errorCopy(error: unknown): ErrorCopy {
  const kind = error instanceof ModelRequestError ? error.kind : looksLikeNetwork(error) ? 'network' : 'unknown'
  const status = error instanceof ModelRequestError ? error.status : undefined
  if (kind === 'auth') {
    return { text: 'API Key 无效或没有权限。下一步：打开设置检查 Key 和接口地址。', action: 'settings' }
  }
  if (kind === 'rate') {
    return { text: '请求被限流了。下一步：等一会儿再重试，或换个模型。', action: 'retry' }
  }
  if (kind === 'network') {
    return { text: '连不上接口地址。下一步：检查网络，或确认设置里的「接口地址」没填错。', action: 'settings' }
  }
  if (kind === 'server') {
    return { text: `模型接口返回 ${status ?? '错误'}。下一步：稍后重试；还不行就换模型或接口地址。`, action: 'retry' }
  }
  return { text: '操作没成功。下一步：再试一次；还不行请把这句话发给开发者。', action: 'retry' }
}

async function requestChat(url: string, init: RequestInit): Promise<Response> {
  try {
    return await fetch(url, init)
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error
    throw new ModelRequestError('network', '连不上接口地址', undefined, messageOf(error))
  }
}


/**
 * 一次批注请求。没有填 API Key 时走模拟流，返回形状与真模型一致（JSON Lines）。
 */
export async function streamAnnotations(options: StreamOptions): Promise<void> {
  if (!options.settings.apiKey.trim()) {
    await mockStream(options)
    return
  }
  await remoteStream(options)
}

async function remoteStream({ settings, context, onDelta, signal }: StreamOptions): Promise<void> {
  const url = `${settings.baseUrl.replace(/\/+$/, '')}/chat/completions`
  const response = await requestChat(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${settings.apiKey.trim()}`,
    },
    body: JSON.stringify({
      model: settings.model,
      temperature: 0.3,
      stream: true,
      messages: buildMessages(context, settings.analysisPrompt),
    }),
    signal,
  })

  await readSse(response, onDelta)
}

/** 读 OpenAI 兼容的 SSE 流，逐段回调内容 */
async function readSse(response: Response, onDelta: (delta: string) => void): Promise<void> {
  if (!response.ok || !response.body) {
    const detail = await response.text().catch(() => '')
    throw new ModelRequestError(
      kindOfStatus(response.status),
      `模型接口返回 ${response.status}`,
      response.status,
      detail.slice(0, 300),
    )
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  for (;;) {
    let chunk: ReadableStreamReadResult<Uint8Array>
    try {
      chunk = await reader.read()
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') throw error
      throw new ModelRequestError('network', '连不上接口地址', undefined, messageOf(error))
    }
    const { done, value } = chunk
    if (done) break
    buffer += decoder.decode(value, { stream: true })

    let newline = buffer.indexOf('\n')
    while (newline >= 0) {
      const line = buffer.slice(0, newline).trim()
      buffer = buffer.slice(newline + 1)
      newline = buffer.indexOf('\n')

      if (!line.startsWith('data:')) continue
      const payload = line.slice(5).trim()
      if (payload === '[DONE]') return
      try {
        const parsed = JSON.parse(payload) as {
          choices?: Array<{ delta?: { content?: string } }>
        }
        const delta = parsed.choices?.[0]?.delta?.content
        if (delta) onDelta(delta)
      } catch {
        // 半截的行留到下一次读取再拼
      }
    }
  }
}

export type ChatOptions = {
  settings: Settings
  messages: ChatMessage[]
  onDelta: (delta: string) => void
  signal?: AbortSignal
}

/** 普通多轮对话，用于「和这条批注讨论」 */
export async function streamChat({ settings, messages, onDelta, signal }: ChatOptions): Promise<void> {
  if (!settings.apiKey.trim()) {
    await mockChat(messages, onDelta, signal)
    return
  }

  const url = `${settings.baseUrl.replace(/\/+$/, '')}/chat/completions`
  const response = await requestChat(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${settings.apiKey.trim()}`,
    },
    body: JSON.stringify({
      model: settings.model,
      temperature: 0.4,
      stream: true,
      messages,
    }),
    signal,
  })

  await readSse(response, onDelta)
}

async function mockChat(messages: ChatMessage[], onDelta: (delta: string) => void, signal?: AbortSignal): Promise<void> {
  const lastUser = [...messages].reverse().find((message) => message.role === 'user')?.content ?? ''
  const clipped = lastUser.replace(/\s+/g, ' ').trim().slice(0, 24)
  const reply = `（模拟回复）你问的是「${clipped}」。现在还没有填 API Key，等接上模型后这里会是真实回答。`
  for (let index = 0; index < reply.length; index += 3) {
    if (signal?.aborted) throw new DOMException('已取消', 'AbortError')
    await new Promise((resolve) => setTimeout(resolve, 20))
    onDelta(reply.slice(index, index + 3))
  }
}

/* ---------- 模拟流：没有 key 时也能看到批注长什么样 ---------- */

function clip(text: string, max = 24): string {
  return text.length > max ? text.slice(0, max) : text
}

type Rewrite = { replacement: string; note: string }

function rewrite(sentence: string): Rewrite | null {
  const filler = sentence.match(/往往|其实|基本上|实际上|非常/)
  if (filler) return { replacement: sentence.replace(filler[0], ''), note: '删掉不承担意思的词，句子更硬。' }

  const number = sentence.match(/\d+\s*(成|%)/)
  if (number) return { replacement: sentence.replace(number[0], `约${number[0]}`), note: '比例缺出处，先加「约」，再补来源。' }

  const comma = sentence.indexOf('，')
  if (comma > 0 && comma < sentence.length - 1) {
    const head = sentence.slice(0, comma)
    const tail = sentence.slice(comma + 1).replace(/[。！？!?]$/, '')
    return { replacement: `${tail}，${head}${sentence.slice(-1)}`, note: '语序换一下，把结论放到后面。' }
  }

  if (sentence.endsWith('了。')) {
    return { replacement: `${sentence.slice(0, -2)}。`, note: '「了」可以去掉，语气更快。' }
  }

  return null
}

export function mockItems(context: ContextPayload): ParsedAnnotation[] {
  const sentences = context.selection
    .split(/(?<=[。！？!?；;])/)
    .map((line) => line.trim())
    .filter((line) => line.length >= 6)

  const pool = sentences.length > 0 ? sentences : [context.selection.trim()].filter((line) => line.length > 0)
  if (pool.length === 0) return []

  const items: ParsedAnnotation[] = [
    { kind: 'meta', quote: '', note: '我判断这段的意图是：给一个观点补理由。' },
  ]
  const first = pool[0]
  const second = pool[1] ?? pool[0]

  items.push({
    kind: 'evaluation',
    quote: clip(first, 22),
    note: '这句是整段的重心，位置偏后；读者读到才知道你要说什么。',
  })

  const changed = rewrite(second)
  if (changed) {
    // quote 与 replacement 必须是同一段原文，否则采纳会只替换前半句、留下后半句
    items.push({
      kind: 'revision',
      quote: second,
      note: changed.note,
      replacement: changed.replacement,
    })
  }

  items.push({
    kind: 'evaluation',
    quote: clip(pool[2] ?? first, 12),
    note: '这个说法能立住，但缺一个具体例子，读者会自己补。',
  })

  return items
}

async function mockStream({ context, onDelta, signal }: StreamOptions): Promise<void> {
  const payload = `${mockItems(context).map((item) => JSON.stringify(item)).join('\n')}\n`
  const step = 12
  for (let index = 0; index < payload.length; index += step) {
    if (signal?.aborted) throw new DOMException('已取消', 'AbortError')
    await new Promise((resolve) => setTimeout(resolve, 26))
    onDelta(payload.slice(index, index + step))
  }
}
