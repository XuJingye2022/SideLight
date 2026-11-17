import { mapOutsideCode } from './codeScan.ts'

const ESCAPED_TAG = /&lt;(\/?[a-zA-Z!][^&\n]*?)&gt;/g

/**
 * 编辑器把行内 HTML 当普通文字，序列化时转义成 &lt;kbd&gt;。
 * 这里只还原「看起来是标签」的转义，`a &lt; b` 这种比较符号不动。
 * 代码围栏、行内代码里的字节不动；`!` 开头的（注释、DOCTYPE）只在原文里真的写过同一条时还原：
 * 用户原文里是字面实体（讲转义的段落、代码样例）时不能改成真标签。
 */
export function repairHtml(markdown: string, original?: string | null): string {
  const source = typeof original === 'string' ? original : null
  return mapOutsideCode(markdown, (segment) =>
    segment.replace(ESCAPED_TAG, (whole: string, inner: string) => {
      if (inner.startsWith('!') && (source === null || !source.includes(`<${inner}>`))) return whole
      return `<${inner}>`
    }),
  )
}

/** 文档里有没有 HTML，用来决定是否提示 */
export function hasHtml(text: string): boolean {
  return /<[a-z][^>]*>/i.test(text)
}

/**
 * 解析前把标签形状的 `<` 转成实体。
 * 浏览器里的解析器会把 <kbd> 当成真元素，schema 不认识就整段丢掉；
 * 转成实体后它只是普通文字，能原样留在正文里，保存时再由 repairHtml 还原。
 */
export function escapeHtmlForParse(text: string): string {
  return text.replace(/<(?=[a-zA-Z/!])/g, '&lt;')
}
