import { mapOutsideCode } from './codeScan.ts'

const ESCAPED_TAG = /&lt;(\/?[a-zA-Z!][^&\n]*?)&gt;/g
/** 序列化器对非代码文本做的三条转义（`@tiptap/core` 的 encodeHtmlEntities） */
const ESCAPED_ENTITY = /&(amp|lt|gt);/g
const TAG_NAME = /^[a-zA-Z][a-zA-Z0-9-]*/
/** 行首到实体之间只剩块级标记（引用、列表）：留下的 `>` 会被 marked 当成引用块 */
const BLOCK_START = /^[ \t]*(?:(?:>[ \t]*)|(?:[-*+][ \t]+)|(?:\d{1,9}[.)][ \t]+))*$/
/** 解出来的 `&` 紧跟「名字;」「#数字;」「#x十六进制;」时，它自己就成了一条实体 */
const ENTITY_AHEAD = /^(?:#[0-9]+|#[xX][0-9a-fA-F]+|[a-zA-Z][a-zA-Z0-9]*);/

/**
 * 编辑器把行内 HTML 当普通文字，序列化时转义成 &lt;kbd&gt;。
 * 这里还原两类东西：
 * 1. 标签/注释形状的转义（`&lt;kbd&gt;` → `<kbd>`）；
 * 2. 序列化器对正文每个 `&`、`<`、`>` 写的实体（`a &lt; b` → `a < b`）。
 * 代码围栏与行内代码里的字节不动（第 41 轮）。原文里真的写过某条实体时，那一类整篇保持不动：
 * 讲转义的段落、代码样例不能变成真标签或真字符。
 */
export function repairHtml(markdown: string, original?: string | null): string {
  const source = typeof original === 'string' ? original : null
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
      // 原文里真的写过这条实体：这一整类解码会让「讲转义」的文档改字节
      if (source !== null && source.includes(whole)) return whole
      if (kind === 'amp') {
        // 解成 `&` 会自成实体（作者写字面 `&lt;`，存下来是 `&amp;lt;`）：保持，否则重开只剩一个 `<`
        return ENTITY_AHEAD.test(restored.slice(offset + whole.length)) ? whole : '&'
      }
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
 */
export function escapeHtmlForParse(text: string): string {
  return mapOutsideCode(text, (segment) => segment.replace(/<(?=[a-zA-Z/!])/g, '&lt;'))
}
