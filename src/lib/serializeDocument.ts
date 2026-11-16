import { joinFootnotes, repairFootnoteRefs } from './footnotes.ts'
import { joinFrontmatter, leadingNewlines, splitFrontmatter } from './frontmatter.ts'
import { repairHtml } from './html.ts'
import { repairMath } from './math.ts'
import { repairCalloutMarkers } from './escapes.ts'
import { reuseTables } from './tableReuse.ts'

/** 只需要能吐出编辑器 Markdown 的对象：App 的 Editor 与 roundtrip 的 MarkdownManager 都能满足 */
export type MarkdownSource = { getMarkdown(): string }

export type SerializeOptions = {
  frontmatter?: string
  footnotes?: string
  /** 文件原文：用来复用未改动的表格块；null/缺省则不复用 */
  original?: string | null
  /** frontmatter 与正文之间的空行个数；缺省跟随 original */
  leading?: number
}

/** 尾部换行对数：`\r\n` 与 `\n` 都算一个换行 */
function trailingNewlines(text: string): number {
  const match = /(?:\r\n|\n)+$/.exec(text)
  return match ? (match[0].match(/\r\n|\n/g) ?? []).length : 0
}

/**
 * 只在字符串层收尾：删掉末尾空段落与 `&nbsp;` 行，再按原文的换行对数补回。
 * 保留原文的 CRLF（CRLF 文件写 CRLF，LF 文件写 LF）；正文中间的空行不动。
 */
export function applyTrailingNewlines(output: string, original: string | null): string {
  if (!original || output.length === 0) return output
  const eol = original.includes('\r\n') ? '\r\n' : '\n'
  const want = trailingNewlines(original)
  const trimmed = output.replace(/\r\n/g, '\n').replace(/(?:\n[ \t]*(?:&nbsp;[ \t]*)?)+$/, '')
  return trimmed + eol.repeat(want)
}

/** 只要编辑器正文（frontmatter / 脚注由调用方拼） */
export function serializeDocumentBody(editor: MarkdownSource, original?: string | null): string {
  return serializeDocument(editor, { original: original ?? null })
}

/**
 * App 与报告脚本共用的唯一序列化出口。
 * 顺序：编辑器 Markdown → 既有 repair 链 → 表格整块复用 → 拼脚注 → 拼 frontmatter。
 * 边界：只保证表格行内字节；表格前后的空行仍由文档级 `\n\n` 决定。
 */
export function serializeDocument(editor: MarkdownSource, options: SerializeOptions = {}): string {
  const frontmatter = options.frontmatter ?? ''
  const footnotes = options.footnotes ?? ''
  const raw = editor.getMarkdown()
  const repaired = repairCalloutMarkers(repairHtml(repairMath(repairFootnoteRefs(raw))))
  const reused = reuseTables(options.original ?? null, repaired)
  const body = joinFootnotes(reused, footnotes)
  const leading =
    options.leading ??
    (options.original ? leadingNewlines(splitFrontmatter(options.original).body) : undefined)
  let output = joinFrontmatter(frontmatter, body, leading)
  // 末尾换行跟随原文，并清掉序列化器补的尾部空段落 / &nbsp;
  output = applyTrailingNewlines(output, options.original ?? null)
  return output
}
