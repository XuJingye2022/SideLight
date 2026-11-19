import { isMathBody } from './math.ts'

/**
 * 纯文本 Markdown 粘贴（第 92 轮 A1，用户缺陷 1）。
 *
 * 病根：粘贴一直是「整段文字一次性落进文档」，`# 标题` / `- a` / `**粗体**` 都留成字面，
 * 输入规则也不跑。这里在 `handlePaste` 里先判「这一段值不值得按 Markdown 解析」，再走
 * 打开文档时的那条解析链（`escapeHtmlForParse` → `protectMathPairs` → `manager.parse` →
 * `splitTableCellBreaks`），把节点/标记插进光标处。
 *
 * 判定全在这里，且都是纯函数：`looksLikeMarkdown` 决定要不要解析，`pasteCandidate` 再挡掉
 * 图片、超长文本与「HTML 里本来就有结构」的富文本，`pastePlan` 决定插行内内容还是整块。
 * 真富文本（含编辑器内部复制）一律不碰：`text/html` 与 `text/plain` 不等价就交回 PM 自己的粘贴链。
 */

/** 一次粘贴最多认这么多字符的纯文本 Markdown；再长交回 PM（解析 + 建节点不值当） */
export const MAX_PASTE_CHARS = 200_000

/** `pastePlan` 只需要 type/content 两个字段，单测不必造 schema */
export type PasteJson = { type?: string; content?: PasteJson[] }

export type PasteCandidateInput = {
  /** `text/plain` */
  text: string
  /** `text/html`；没有就传空串 */
  html?: string | null
  /** 剪贴板里的文件数（图片由 handlePaste 的图片分支先处理） */
  fileCount: number
}

export type PasteContext = {
  /** 光标所在节点是文本块（段落/标题/列表项里的段落） */
  inTextblock: boolean
  /** 光标在表格单元格里：Markdown 表格只装行内内容 */
  inTable: boolean
}

export type PastePlan = 'inline' | 'blocks' | 'literal'

/** 块级信号（行首锚定）：命中任意一条就按 Markdown 解析 */
const BLOCK_SIGNALS: readonly RegExp[] = [
  /^#{1,6}[ \t]+\S/m, // ATX 标题
  /^[ \t]*[-*+][ \t]+\S/m, // 无序列表 / 任务项
  /^[ \t]*\d{1,9}[.)][ \t]+\S/m, // 有序列表
  /^[ \t]*>[ \t]?\S/m, // 引用
  /^[ \t]*(?:```|~~~)/m, // 围栏
  /^[ \t]*(?:-{3,}|\*{3,}|_{3,})[ \t]*$/m, // 分隔线
  /^[ \t]*\|.*\|[ \t]*$/m, // 表格行（整行被 | 包住）
]

/** 行内信号：`**粗体**` / `` `代码` `` / `[文字](目标)`；`$公式$` 另算（要看内侧有没有空白） */
const INLINE_SIGNALS: readonly RegExp[] = [
  /\*\*(?=\S)[^*\n]+?(?<=\S)\*\*/,
  /`[^`\n]+`/,
  /(?<!!)\[[^\[\]\n]+\]\([^()\s]+\)/,
]

/** 成对 `$`（已转义的 `\$` 不算开头）；与 math.ts 的公式口径同一条 */
const INLINE_MATH = /(?<!\\)\$([^$\n]+)\$/g

/**
 * 这段纯文本像不像 Markdown。块级信号只看行首标记，行内信号看四种写法；
 * `$…$` 必须过 `isMathBody`（内侧不能是空白），否则「价格 $5 到 $」会被当成公式。
 */
export function looksLikeMarkdown(text: string): boolean {
  if (!text) return false
  if (BLOCK_SIGNALS.some((pattern) => pattern.test(text))) return true
  if (INLINE_SIGNALS.some((pattern) => pattern.test(text))) return true
  const math = new RegExp(INLINE_MATH.source, 'g')
  let match: RegExpExecArray | null
  while ((match = math.exec(text)) !== null) {
    if (isMathBody(match[1])) return true
  }
  return false
}

/** 只认这几种实体：其余（含代码里的 `&lt;` 这类字面文本）原样保留，与写入端同口径 */
const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: '\u00a0',
}

/** 数字实体先夹到合法码点：`&#99999999;` 不能抛 RangeError */
function codePointText(value: number): string | null {
  if (!Number.isFinite(value) || value < 0 || value > 0x10ffff) return null
  try {
    return String.fromCodePoint(value)
  } catch {
    return null
  }
}

function decodeEntities(value: string): string {
  return value.replace(
    /&(?:#(\d{1,7})|#[xX]([0-9a-fA-F]{1,6})|([a-zA-Z][a-zA-Z0-9]{1,30}));/g,
    (whole: string, dec: string | undefined, hex: string | undefined, name: string | undefined) => {
      if (dec) return codePointText(Number(dec)) ?? whole
      if (hex) return codePointText(Number.parseInt(hex, 16)) ?? whole
      return (name ? NAMED_ENTITIES[name.toLowerCase()] : undefined) ?? whole
    },
  )
}

/**
 * 取 HTML 的纯文字，只剥**不带属性**的 `p` / `div` / `span`，`<br>` 与 `</p>`、`</div>` 当换行。
 * 带属性的标签（`<b>`、`<span class="sl-eq">`）留字面：那是真结构，不该按纯文本重解析
 * （plan-review P1-1：编辑器内复制 `==高亮==` 的 span 不能被剥成空壳）。
 */
export function plainTextOfHtml(html: string): string {
  return decodeEntities(
    html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(?:p|div)\s*>/gi, '\n')
      .replace(/<\/?(?:p|div|span)\s*>/gi, ''),
  )
}

const foldWhitespace = (value: string): string => value.replace(/\s+/g, ' ').trim()

/**
 * 这一段值得按纯文本 Markdown 解析吗？
 * 1. 剪贴板里有文件（图片）→ 否，走 handlePaste 的图片分支
 * 2. 空文本 / 超过 `MAX_PASTE_CHARS` → 否
 * 3. 编辑器内部复制（HTML 带 `data-pm-slice`）→ 否，交回 PM 自己的 slice
 * 4. HTML 的纯文字与 text/plain 折完空白不等（真富文本）→ 否
 * 5. 以上都过，再交给 `looksLikeMarkdown`
 */
export function pasteCandidate({ text, html, fileCount }: PasteCandidateInput): boolean {
  if (fileCount > 0) return false
  if (!text || text.length > MAX_PASTE_CHARS) return false
  if (html && html.includes('data-pm-slice')) return false
  if (html && foldWhitespace(plainTextOfHtml(html)) !== foldWhitespace(text)) return false
  return looksLikeMarkdown(text)
}

/**
 * 解析结果怎么插：`inline` = 只取那个段落的内容插进当前段落（不拆段）；
 * `blocks` = 整块插（段中会拆成三段）；`literal` = 不管这一下，交回 PM 默认粘贴。
 * 表格单元格只装行内内容：多块就交回默认链（与手打块级标记的守卫同口径）。
 */
export function pastePlan(json: PasteJson, { inTextblock, inTable }: PasteContext): PastePlan {
  const blocks = Array.isArray(json.content) ? json.content : []
  if (blocks.length === 0) return 'literal'
  const singleParagraph = blocks.length === 1 && blocks[0]?.type === 'paragraph'
  if (inTable) return singleParagraph ? 'inline' : 'literal'
  return inTextblock && singleParagraph ? 'inline' : 'blocks'
}
