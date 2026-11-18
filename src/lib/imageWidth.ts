/**
 * 图片宽度（第 87 轮 B-103）：写回形态、解析放行与拖拽换算的纯函数。
 *
 * 编辑器自己只写一种形态：`<img src="S" alt="A"[ title="T"] width="W">`
 * （src→alt→title→width、无 `/>`、值里不带引号与实体）。没有宽度时仍写 `![alt](src "title")`，
 * 老文档的其它写法（单引号、`/>`、顺序不同、多属性）在解析前保持字面，保存时由 repairHtml 原样还原。
 * 这个文件不 import tiptap，单测能直接在 Node 里跑。
 */

/** 拖拽与写回共用的宽度上下界（像素） */
export const MIN_IMAGE_WIDTH = 40
export const MAX_IMAGE_WIDTH = 2000

/** 能安全放进双引号的属性值：引号、尖括号、实体符与换行都不行 */
const UNSAFE_VALUE = /["<>&\n\r]/
/** 规范形里每个属性值的允许字符（空串也允许） */
const SAFE_VALUE = '[^"<>&\\n\\r]*'
/** 规范形逐字符同构：只有它才在解析前放行，宽度必须是规范十进制写法 */
const CANONICAL_IMAGE = new RegExp(
  `^<img src="(${SAFE_VALUE})" alt="(${SAFE_VALUE})"(?: title="(${SAFE_VALUE})")? width="([0-9]+)">$`,
)
/** 引用与列表前缀（`> `、`> > `、`>   `），列表续行的缩进算在后面的空白里 */
const LINE_PREFIX = /^(?:[ \t]*>[ \t]*)*[ \t]*/
/** 行尾空白（含 CRLF 的 `\r`）：序列化器不会写，剥掉不算改字节 */
const LINE_TRAILING = /[ \t\r]+$/

export type ImageWidthAttrs = {
  src?: unknown
  alt?: unknown
  title?: unknown
  width?: unknown
  /** 只为了让节点 attrs 原样传进来；写回不写 height */
  height?: unknown
}

/**
 * 宽度夹取：先 Number() 再判整数（节点属性可能是字符串 `'320'`，H6），得到 40–2000。
 * 空值、非数字、非整数一律返回 null——那种情况不写宽度，仍写图片 markdown。
 */
export function clampImageWidth(value: unknown): number | null {
  if (value === null || value === undefined) return null
  if (typeof value === 'string' && value.trim() === '') return null
  const num = Number(value)
  if (!Number.isFinite(num) || !Number.isInteger(num)) return null
  return Math.min(MAX_IMAGE_WIDTH, Math.max(MIN_IMAGE_WIDTH, num))
}

/**
 * 拖拽换算（H4）：起点宽度先夹取，加 dx 再夹回 40–2000。
 * `imageWidthFromDrag('320', 80)` = 400，`('1990', 80)` = 2000。
 */
export function imageWidthFromDrag(start: unknown, dx: number): number {
  const base = clampImageWidth(start) ?? MIN_IMAGE_WIDTH
  const delta = Number.isFinite(dx) ? Math.round(dx) : 0
  return Math.min(MAX_IMAGE_WIDTH, Math.max(MIN_IMAGE_WIDTH, base + delta))
}

/**
 * 有合法宽度且属性值放得进双引号时，返回规范形整行；否则 null。
 * null 不代表图片丢了：调用方退回 `![alt](src "title")`，宽度丢、图不丢（P2-2）。
 */
export function imageHtmlOf(attrs: ImageWidthAttrs): string | null {
  const src = typeof attrs.src === 'string' ? attrs.src : ''
  const alt = typeof attrs.alt === 'string' ? attrs.alt : ''
  const title = typeof attrs.title === 'string' ? attrs.title : ''
  const width = clampImageWidth(attrs.width)
  if (width === null) return null
  if (UNSAFE_VALUE.test(src) || UNSAFE_VALUE.test(alt)) return null
  if (title && UNSAFE_VALUE.test(title)) return null
  const titlePart = title ? ` title="${title}"` : ''
  return `<img src="${src}" alt="${alt}"${titlePart} width="${width}">`
}

/** 节点的写回形态：有宽度走规范形 HTML 行，否则与内置 Image 一样写图片 markdown */
export function imageMarkdownOf(attrs: ImageWidthAttrs): string {
  const html = imageHtmlOf(attrs)
  if (html) return html
  const src = typeof attrs.src === 'string' ? attrs.src : ''
  const alt = typeof attrs.alt === 'string' ? attrs.alt : ''
  const title = typeof attrs.title === 'string' ? attrs.title : ''
  return title ? `![${alt}](${src} "${title}")` : `![${alt}](${src})`
}

/**
 * 严格全行解析：整行必须与规范形逐字符同构（含无 `/`、双引号、属性顺序、无多余属性）。
 * 宽度必须是规范十进制写法（`0320` 不算），其它一律 null。
 */
export function parseImageHtml(line: string): { src: string; alt: string; title: string | null; width: number } | null {
  const match = CANONICAL_IMAGE.exec(line)
  if (!match) return null
  const width = clampImageWidth(match[4])
  if (width === null || String(width) !== match[4]) return null
  const title = match[3] === undefined ? null : match[3]
  if (title === '') return null
  return { src: match[1], alt: match[2], title, width }
}

/**
 * 这一整行是不是规范形图片行（H1+H2）：先剥引用/列表前缀与行尾空白，再逐字符判。
 * mapOutsideCode 交给回调的 segment 已经是「整行」或「行内代码之间的一段」，
 * 所以调用方还要另判「这段是不是整行」（见 html.ts 的 escapeHtmlForParse）。
 */
export function isImageHtmlLine(segment: string): boolean {
  if (!segment.includes('<img')) return false
  return parseImageHtml(segment.replace(LINE_PREFIX, '').replace(LINE_TRAILING, '')) !== null
}
