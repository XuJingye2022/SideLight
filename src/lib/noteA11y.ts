/**
 * 页边批注卡的无障碍文案与键盘判定（第 86 轮 B-141）。
 *
 * 卡片是 `article.note`：读屏用户 Tab 进来只听到「文章」两个字，既不知道是第几处，
 * 也拿不到引文上下文；卡片本身也没有 Enter 跳句。这里把两件事抽成纯函数，
 * DOM 与事件只做传递（`MarginRail.tsx`），判定可以在 Node 里直接测。
 */

export type NoteLabelInput = {
  /** 模型给的批注类型 */
  kind: 'revision' | 'evaluation'
  /** 正文里的引文（可能含换行） */
  quote: string
  /** 批注正文；引文为空时拿它的第一句顶上 */
  note: string
}

/** 引文最长这一段字符，超出加省略号（读屏播报别把整段念完） */
const QUOTE_LIMIT = 20

/** 换行与连续空白都压成一个空格：引文跨行时读屏会把换行念成「换行」 */
function flatten(text: string): string {
  return text.replace(/\s+/g, ' ').trim()
}

/** 超长截断，短的原样返回 */
function clip(text: string): string {
  return text.length > QUOTE_LIMIT ? `${text.slice(0, QUOTE_LIMIT)}…` : text
}

/** 引文为空时退回批注的第一句（句末标点或换行处截断） */
function firstSentence(note: string): string {
  const flat = flatten(note)
  const end = flat.search(/[。！？!?]/)
  return end < 0 ? flat : flat.slice(0, end + 1)
}

/**
 * 卡片的无障碍名字：「第 N 处 修订/评价：「引文」」。
 * `index` 是 0 起的位置，与卡片上「第 N 处」同一口径（显示时 +1）。
 */
export function noteAriaLabel(index: number, input: NoteLabelInput): string {
  const ordinal = Number.isFinite(index) && index >= 0 ? Math.floor(index) : 0
  const kind = input.kind === 'revision' ? '修订' : '评价'
  const quote = clip(flatten(input.quote) || firstSentence(input.note))
  return `第 ${ordinal + 1} 处 ${kind}：「${quote}」`
}

/** `noteJumpKey` 只关心这几个字段（KeyboardEvent 原样传进来也成立） */
export type NoteJumpEvent = {
  key: string
  target: unknown
  currentTarget: unknown
  defaultPrevented?: boolean
}

/**
 * Enter 跳句：只认**卡片自己**拿到焦点的 Enter。
 * 卡片里的按钮（采纳 / 追问 / 联网核对）拿到焦点时事件照样冒泡到 article，
 * 这时 `target !== currentTarget`，必须放行让按钮自己的 Enter 生效——否则想把
 * 「追问」按下去，正文选区却被改掉了。
 */
export function noteJumpKey(event: NoteJumpEvent): boolean {
  if (event.key !== 'Enter') return false
  if (event.defaultPrevented === true) return false
  return event.target === event.currentTarget
}
