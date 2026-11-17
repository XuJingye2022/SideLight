import { Mark } from '@tiptap/core'
import type { JSONContent, MarkdownRendererHelpers } from '@tiptap/core'

/**
 * 行内 HTML 白名单（第 47 轮）：只有这四个标签在编辑视图与预览里成为真样式。
 * 其余标签（含带属性、单开、跨行、内容里带 `<` 或 `&`）一律保持字面文本，保存时由 repairHtml 原样还原。
 */
export const INLINE_HTML_TAGS = ['kbd', 'mark', 'sub', 'sup'] as const

/** 成对、同一行、内容里没有 `<` `&` 换行；空内容与纯空白内容不还原（成不了文本节点，会丢字节） */
const PAIR = /<(kbd|mark|sub|sup)>([^<&\n]*?)<\/\1>/g
/** 与 html.ts 原来那条逐字一致：只转义标签形状的 `<` */
const ANGLE = /<(?=[a-zA-Z/!])/g
const PLACEHOLDER = /\u0001(\d+)\u0001/g

/**
 * 解析前把标签形状的 `<` 转成实体，但先给白名单里的真成对标签开一条口子。
 *
 * 顺序必须是「先占位、再转义、最后换回」：转义后的 `&lt;kbd>` 看不出作者写的是真标签
 * 还是本来就写的实体，转义后还原会把讲转义的段落改成真标签（第 47 轮 P1-1）。
 * 段来自 mapOutsideCode 的逐行回调，所以围栏与行内代码里的 `<kbd>` 根本不进这里。
 */
export function escapeInlineHtml(segment: string): string {
  // 原文真含占位符字符：放弃还原，退回纯转义（不吞字符）
  if (segment.includes('\u0001')) return segment.replace(ANGLE, '&lt;')
  const saved: string[] = []
  const masked = segment.replace(PAIR, (whole: string, _tag: string, inner: string) => {
    if (!/\S/.test(inner)) return whole
    saved.push(whole)
    return `\u0001${saved.length - 1}\u0001`
  })
  return masked
    .replace(ANGLE, '&lt;')
    .replace(PLACEHOLDER, (_whole: string, index: string) => saved[Number(index)] ?? '')
}

/** 序列化器把 mark 的内容当成一个占位符文本节点交回来（见 @tiptap/markdown 的 getMarkOpening） */
function inlineMark(tag: (typeof INLINE_HTML_TAGS)[number]) {
  return Mark.create({
    name: `inline${tag[0].toUpperCase()}${tag.slice(1)}`,
    parseHTML: () => [{ tag }],
    renderHTML: () => [tag, 0],
    renderMarkdown(node: JSONContent, helpers: MarkdownRendererHelpers): string {
      return `<${tag}>${helpers.renderChildren(node.content ?? [])}</${tag}>`
    },
    markdownOptions: { htmlReopen: { open: `<${tag}>`, close: `</${tag}>` } },
  })
}

/** 四个 mark：inlineKbd / inlineMark / inlineSub / inlineSup（与 App 的扩展表一次注册） */
export const inlineMarks = INLINE_HTML_TAGS.map(inlineMark)
