import { mapOutsideCode } from './codeScan.ts'
import { escapeInlineHtml } from './inlineHtmlTags.ts'

const ESCAPED_TAG = /&lt;(\/?[a-zA-Z!][^&\n]*?)&gt;/g
/** 序列化器对非代码文本做的三条转义（`@tiptap/core` 的 encodeHtmlEntities） */
const ESCAPED_ENTITY = /&(amp|lt|gt);/g
const TAG_NAME = /^[a-zA-Z][a-zA-Z0-9-]*/
/** 行首到实体之间只剩块级标记（引用、列表）：留下的 `>` 会被 marked 当成引用块 */
const BLOCK_START = /^[ \t]*(?:(?:>[ \t]*)|(?:[-*+][ \t]+)|(?:\d{1,9}[.)][ \t]+))*$/
/** 解出来的 `&` 紧跟「名字;」「#数字;」「#x十六进制;」时，它自己就成了一条实体 */
const ENTITY_AHEAD = /^(?:#[0-9]+|#[xX][0-9a-fA-F]+|[a-zA-Z][a-zA-Z0-9]*);/
/** 原文里的真实体：按出现次数统计（只数代码外，围栏/行内代码里的不算） */
const ENTITY_IN_SOURCE = /&([a-zA-Z][a-zA-Z0-9]*|#[0-9]+|#[xX][0-9a-fA-F]+);/g
/** 原文里被当成「转义写法」提过的名字：`&amp;<名>;`（讲转义的段落），同名真实体与它长得一样 */
const ENTITY_MENTION = /&amp;([a-zA-Z][a-zA-Z0-9]*|#[0-9]+|#[xX][0-9a-fA-F]+);/g
/**
 * 解析层自己会解码的实体名：`@tiptap/core` 的 decodeHtmlEntities 只认 lt|gt|quot|amp 与数字体，
 * 所以正文里的 `&amp;<这些名字>;` 只可能来自作者手打的字面文本，不能参与「按次数解码」（R49-10）
 */
const PARSED_ENTITY = /^(?:amp|lt|gt|quot|#[0-9]+|#[xX][0-9a-fA-F]+)$/

/**
 * 编辑器把行内 HTML 当普通文字，序列化时转义成 &lt;kbd&gt;。
 * 这里还原两类东西：
 * 1. 标签/注释形状的转义（`&lt;kbd&gt;` → `<kbd>`）；
 * 2. 序列化器对正文每个 `&`、`<`、`>` 写的实体（`a &lt; b` → `a < b`）。
 * 代码围栏与行内代码里的字节不动（第 41 轮）。原文里写过某条实体时按**出现次数**对照：
 * 本稿同名 `&amp;<名>;` 的条数与原文真实体的条数一样多才逐一解回；原文里用 `&amp;<名>;`
 * 讲转义时该名字保守地整条保持（第 49 轮）。
 */
export function repairHtml(markdown: string, original?: string | null): string {
  const source = typeof original === 'string' ? original : null
  // 两条正则的必要条件就是这三类实体之一：都没有就不可能有命中，直接走快路径（第 42 轮守卫）
  if (!markdown.includes('&lt;') && !markdown.includes('&amp;') && !markdown.includes('&gt;')) return markdown
  const realCount = new Map<string, number>()
  const mentionCount = new Map<string, number>()
  if (source !== null) {
    mapOutsideCode(source, (segment) => {
      for (const match of segment.matchAll(ENTITY_IN_SOURCE)) {
        const body = match[1]
        realCount.set(body, (realCount.get(body) ?? 0) + 1)
      }
      for (const match of segment.matchAll(ENTITY_MENTION)) {
        const body = match[1]
        mentionCount.set(body, (mentionCount.get(body) ?? 0) + 1)
      }
      return segment
    })
  }
  // 本稿里同名 `&amp;<名>;` 的条数：先数完再解，解哪一处就与文档顺序无关（第 49 轮 R49-11）
  const draftCount = new Map<string, number>()
  if (realCount.size > 0 && markdown.includes('&amp;')) {
    mapOutsideCode(markdown, (segment) => {
      for (const match of segment.matchAll(ENTITY_MENTION)) {
        const body = match[1]
        draftCount.set(body, (draftCount.get(body) ?? 0) + 1)
      }
      return segment
    })
  }
  return mapOutsideCode(markdown, (segment, start) => {
    const restored = segment.replace(ESCAPED_TAG, (whole: string, inner: string) => {
      if (inner.startsWith('!')) {
        if (source === null || !source.includes(`<${inner}>`)) return whole
        return `<${inner}>`
      }
      // 名字取不到（纯标点之类）时按旧行为还原
      const name = TAG_NAME.exec(inner.replace(/^\//, ''))?.[0]
      if (source === null || name === undefined) return `<${inner}>`
      // 原文里写过这个标签才还原：`&lt;div&gt;` 这种字面实体（闭合标签同理）保持实体
      return source.includes(`<${name}`) ? `<${inner}>` : whole
    })
    if (!/&(?:amp|lt|gt);/.test(restored)) return restored
    const lineStart = markdown.lastIndexOf('\n', Math.max(start - 1, 0)) + 1
    return restored.replace(ESCAPED_ENTITY, (whole: string, kind: string, offset: number) => {
      if (kind === 'amp') {
        const ahead = ENTITY_AHEAD.exec(restored.slice(offset + whole.length))?.[0]
        if (ahead !== undefined) {
          // 实体形状的 `&amp;<名>;`：按「原文里出现过几次」对照，而不是「整篇出现过没有」
          const body = ahead.slice(0, -1)
          // 解析层会自己解码的名字（amp/lt/gt/quot/数字体）不参与：解掉的一定是作者手打的字面文本
          if (!PARSED_ENTITY.test(body)) {
            const want = realCount.get(body) ?? 0
            const drafted = draftCount.get(body) ?? 0
            // 原文里把这个名字当转义写法提过：分不清是哪一处，保守地整条保持
            const mentioned = (mentionCount.get(body) ?? 0) > 0
            // 条数一一对应才解回字符；条数不齐（作者另有手打的字面实体）就整类保持，不改用户字节
            if (!mentioned && want > 0 && drafted === want) return '&'
          }
          return whole
        }
        // 不是实体形状（如 `A &amp; B`、`&amp;lt`）：旧守卫只在这一支生效
        return source !== null && source.includes(whole) ? whole : '&'
      }
      // lt / gt 两支照旧：原文里真的写过这条实体时保持（旧守卫在这两支仍然生效）
      if (source !== null && source.includes(whole)) return whole
      if (kind === 'gt') {
        // 行首（含引用/列表标记之后）的 `&gt;` 解开会变成引用块标记：保持
        const prefix = markdown.slice(lineStart, start) + restored.slice(0, offset)
        return BLOCK_START.test(prefix) ? whole : '>'
      }
      return '<'
    })
  })
}

/** 文档里有没有 HTML，用来决定是否提示 */
export function hasHtml(text: string): boolean {
  return /<[a-z][^>]*>/i.test(text)
}

/**
 * 解析前把标签形状的 `<` 转成实体。
 * 浏览器里的解析器会把 <kbd> 当成真元素，schema 不认识就整段丢掉；
 * 转成实体后它只是普通文字，能原样留在正文里，保存时再由 repairHtml 还原。
 * 代码围栏、行内代码里的 `<` 不转义（第 41 轮）：那里本来就该是字面代码，转义会让保存永久漂移。
 * 白名单里的真成对标签（kbd/mark/sub/sup）例外：留着真标签，让解析器建成真样式（第 47 轮）。
 * 图片规范形整行也例外（第 87 轮 B-103）：放行后由 marked 交成图片节点，宽度才存得住。
 */
export function escapeHtmlForParse(text: string): string {
  return mapOutsideCode(text, (segment, start) => {
    // 这段是不是整行：贴着行首且贴着行尾（行内代码会把一行切成多段）
    const atLineStart = start === 0 || text[start - 1] === '\n'
    const after = start + segment.length
    const atLineEnd = after >= text.length || text[after] === '\n'
    return escapeInlineHtml(segment, atLineStart && atLineEnd)
  })
}
