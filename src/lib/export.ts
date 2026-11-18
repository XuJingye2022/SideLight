import type { Node as ProseMirrorNode } from '@tiptap/pm/model'

import katex from './katexLazy.ts'

import { mathToPlainText, replaceMathHtml } from './math.ts'
import { isTocMarkerText, tocEntries, tocParagraphPositions, tocShouldRender } from './toc.ts'

const ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}

export function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (character) => ESCAPES[character] ?? character)
}

/**
 * 第 76 轮 B-134：导出目录。编辑视图里的目录是 `Decoration.widget`，`getHTML()` 看不到，
 * `[TOC]` 段落只会按字面 `<p>[TOC]</p>` 写进导出文件。这里不靠 DOM：先按文档算出条目与
 * 锚点 id，再当纯函数插进 HTML 串（App 里只有导出时才加载这个模块）。
 */
export type ExportToc = {
  /** 顶层标题的锚点 id，顺序与文档一致；下标 k 对应第 k 个顶层 `<h1–h6>` */
  ids: string[]
  /** 要替掉 `[TOC]` 段落的 `<nav>` 片段 */
  nav: string
}

/** 文档口径的目录：没有标题、没有 `[TOC]` 段落、或原文里标记行全被转义时 null（导出保留字面） */
export function buildExportToc(doc: ProseMirrorNode, original?: string | null): ExportToc | null {
  const entries = tocEntries(doc)
  if (entries.length === 0) return null
  if (!tocShouldRender(tocParagraphPositions(doc).length, entries.length, original)) return null
  const ids = entries.map((_entry, index) => `sl-toc-${index}`)
  const items = entries.map(
    (entry, index) =>
      `<a class="sl-toc-item" data-level="${entry.level}" data-toc-index="${index}" href="#${ids[index]}">${escapeHtml(entry.text)}</a>`,
  )
  return { ids, nav: `<nav class="sl-toc" aria-label="目录">${items.join('')}</nav>` }
}

const VOID_ELEMENTS = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'param',
  'source',
  'track',
  'wbr',
])

type HtmlSpan = { start: number; end: number }

/**
 * 扫一遍正文 HTML，取顶层标题开标签与顶层 `[TOC]` 段落的区间。
 * 深度 0 才算顶层：引用块里的 `<h2>` 不是章节起点（与 `extractOutline` 同口径）；
 * 空元素（`<br>` / `<img>` 等）不增深度，否则 `</p>` 一收深度就错，后面的标题全被判成嵌套。
 */
function scanTopLevelBlocks(bodyHtml: string): { headings: HtmlSpan[]; markers: HtmlSpan[] } {
  const headings: HtmlSpan[] = []
  const markers: HtmlSpan[] = []
  const tokens = /<[^>]*>|[^<]+/g
  let depth = 0
  let paragraph: { start: number; textStart: number } | null = null
  let match: RegExpExecArray | null
  while ((match = tokens.exec(bodyHtml)) !== null) {
    const token = match[0]
    if (!token.startsWith('<')) continue
    const start = match.index
    if (token.startsWith('<!')) continue // 注释与 doctype 不参与深度
    const closing = /^<\/([A-Za-z][A-Za-z0-9-]*)\s*>$/.exec(token)
    if (closing) {
      if (depth > 0) {
        depth -= 1
        if (depth === 0 && paragraph !== null) {
          const text = bodyHtml.slice(paragraph.textStart, start).replace(/<[^>]*>/g, '')
          if (isTocMarkerText(text)) markers.push({ start: paragraph.start, end: start + token.length })
          paragraph = null
        }
      }
      continue
    }
    const opening = /^<([A-Za-z][A-Za-z0-9-]*)([^>]*)>$/.exec(token)
    if (!opening) continue
    const name = opening[1].toLowerCase()
    const selfClosing = /\/\s*$/.test(opening[2]) || VOID_ELEMENTS.has(name)
    if (depth === 0) {
      if (/^h[1-6]$/.test(name)) headings.push({ start, end: start + token.length })
      if (name === 'p') paragraph = { start, textStart: start + token.length }
    }
    if (!selfClosing) depth += 1
  }
  return { headings, markers }
}

/**
 * 把目录插进导出正文：第 k 个顶层标题加 `id="sl-toc-k"`，`[TOC]` 段落整块换成 `<nav>`。
 * 顶层标题数与目录条目数不等时原样返回（半套锚点比没有目录更坏）。
 */
export function applyExportTocHtml(bodyHtml: string, toc: ExportToc | null): string {
  if (!toc || toc.ids.length === 0) return bodyHtml
  const { headings, markers } = scanTopLevelBlocks(bodyHtml)
  if (headings.length !== toc.ids.length) return bodyHtml
  const edits: Array<HtmlSpan & { html: string }> = headings.map((span, index) => ({
    ...span,
    html: `${bodyHtml.slice(span.start, span.end - 1)} id="${toc.ids[index]}">`,
  }))
  for (const span of markers) edits.push({ ...span, html: toc.nav })
  edits.sort((a, b) => a.start - b.start)
  let result = ''
  let cursor = 0
  for (const edit of edits) {
    if (edit.start < cursor) continue
    result += bodyHtml.slice(cursor, edit.start) + edit.html
    cursor = edit.end
  }
  return result + bodyHtml.slice(cursor)
}

export type HtmlExportOptions = {
  /** 文档名，用来做标题与文件名，`.md` 会被去掉 */
  title: string
  /** 编辑器渲染出的 HTML 片段 */
  bodyHtml: string
  /** 正文字号 */
  fontSize?: number
  /** 粗体、斜体、表格都靠这段样式，导出文件不依赖外部资源 */
  fontFamily?: string
  /** YAML frontmatter，原样展示在正文上方 */
  frontmatter?: string
  /** 脚注定义块，渲染成文末的注释列表 */
  footnotes?: string
}

/** 续行判据与 `footnotes.ts:3` 同一套：4 空格或 tab 开头 + 非空白 */
const FOOTNOTE_CONTINUATION = /^(?: {4,}|\t)\S/

/**
 * 把 `[^id]: 内容` 形式的脚注定义转成列表项；缩进续行跟同一条，用 `<br>` 连接。
 *
 * 分派规则与 `src/lib/footnotes.ts` 同一套：定义行开新条，缩进续行接当前条，
 * 其余行（引用式定义 `[label]:`、正文）结束当前条；块内空行**不**结束当前条
 * （`footnotes.ts:47-51` 就把空行拼回同一块，渲染层必须跟上）。
 * 行为变化：完全空的 `[^1]:`（后面没有任何续行）不出 `<li>`；而 `[^1]:` + 缩进续行
 * 现在输出 `<li>续行</li>`（旧实现两处都输出 `''`）。
 */
export function renderFootnotes(footnotes: string): string {
  const items: string[][] = []
  let current: string[] | null = null
  for (const raw of footnotes.replace(/\r\n?/g, '\n').split('\n')) {
    // 块内空行不结束当前条
    if (raw.trim().length === 0) continue
    const definition = /^\[\^([^\]]+)\]:\s*(.*)$/.exec(raw)
    if (definition) {
      current = [definition[2]]
      items.push(current)
      continue
    }
    if (current !== null && FOOTNOTE_CONTINUATION.test(raw)) {
      current.push(raw.trim())
      continue
    }
    current = null // `[label]:` 引用式定义、正文行都结束当前条
  }
  const rendered = items
    .map((lines) => lines.map((line) => line.trim()).filter((line) => line.length > 0))
    .filter((lines) => lines.length > 0)
    .map((lines) => `<li>${lines.map(escapeHtml).join('<br>')}</li>`)

  if (rendered.length === 0) return ''
  return `<section class="footnotes"><h2>注释</h2><ol>${rendered.join('')}</ol></section>`
}

/** 把 YAML frontmatter 原样放进一个等宽小字块，至少不丢 */
export function renderFrontmatter(frontmatter: string): string {
  const body = frontmatter.replace(/^---\s*\n?/, '').replace(/\n?---\s*$/, '').trim()
  if (body.length === 0) return ''
  return `<pre class="frontmatter">${escapeHtml(body)}</pre>`
}

const STYLES = `
  :root { color-scheme: light dark; }
  body {
    margin: 0 auto;
    max-width: 42rem;
    padding: 56px 24px 120px;
    font-family: inherit;
    font-size: var(--export-size, 17px);
    line-height: 1.9;
    color: #1d2023;
    background: #fffdf8;
    -webkit-font-smoothing: antialiased;
  }
  h1, h2, h3, h4 { line-height: 1.4; margin: 1.6em 0 0.6em; }
  h1 { font-size: 1.8em; }
  h2 { font-size: 1.35em; }
  h3 { font-size: 1.12em; }
  p { margin: 0 0 1em; }
  ul, ol { padding-left: 1.4em; margin: 0 0 1em; }
  blockquote {
    margin: 1.2em 0;
    padding: 2px 0 2px 16px;
    border-left: 2px solid #2b6d64;
    color: #565c61;
  }
  code {
    font-family: ui-monospace, "Cascadia Code", Consolas, monospace;
    font-size: 0.88em;
    background: #e8f0ed;
    padding: 0.12em 0.36em;
    border-radius: 4px;
  }
  pre {
    padding: 14px 16px;
    border: 1px solid #e4dfd4;
    border-radius: 8px;
    overflow-x: auto;
    font-size: 0.86em;
    line-height: 1.7;
  }
  pre code { background: none; padding: 0; }
  table { border-collapse: collapse; width: 100%; margin: 1.2em 0; font-size: 0.9em; }
  th, td { border: 1px solid #e4dfd4; padding: 6px 10px; text-align: left; vertical-align: top; }
  th { background: #e8f0ed; }
  th > p, td > p { margin: 0; }
  img { max-width: 100%; border-radius: 8px; }
  hr { border: 0; border-top: 1px solid #e4dfd4; margin: 2em 0; }
  a { color: #2b6d64; }
  input[type="checkbox"] { accent-color: #2b6d64; }
  pre.frontmatter {
    margin: 0 0 2em;
    padding: 10px 12px;
    border-left: 3px solid #e4dfd4;
    background: transparent;
    color: #8b9096;
    font-size: 0.78em;
    line-height: 1.6;
  }
  section.footnotes {
    margin-top: 3em;
    padding-top: 1em;
    border-top: 1px solid #e4dfd4;
    font-size: 0.86em;
    color: #565c61;
  }
  section.footnotes h2 { font-size: 0.9em; letter-spacing: 0.1em; color: #8b9096; }
  section.footnotes ol { padding-left: 1.4em; }
  nav.sl-toc {
    margin: 1.4em 0;
    padding: 10px 14px;
    border: 1px solid #e4dfd4;
    border-radius: 8px;
    font-size: 0.92em;
    line-height: 1.7;
  }
  nav.sl-toc a.sl-toc-item {
    display: block;
    padding: 2px 0;
    color: #2b6d64;
    text-decoration: none;
  }
  nav.sl-toc a.sl-toc-item[data-level="2"] { padding-left: 1.4em; }
  nav.sl-toc a.sl-toc-item[data-level="3"] { padding-left: 2.4em; }
  nav.sl-toc a.sl-toc-item[data-level="4"],
  nav.sl-toc a.sl-toc-item[data-level="5"],
  nav.sl-toc a.sl-toc-item[data-level="6"] { padding-left: 3.4em; }
  @media (prefers-color-scheme: dark) {
    body { color: #e9e6e0; background: #15171a; }
    code { background: #22302e; }
    pre, th, td, hr { border-color: #2a2e33; }
    th { background: #22302e; }
    blockquote { color: #a8adaf; }
    nav.sl-toc { border-color: #2a2e33; }
    nav.sl-toc a.sl-toc-item { color: #8ec5bb; }
  }
  @media print {
    :root { color-scheme: light; }
    body { color: #1d2023; background: #fff; }
    code, th { background: #e8f0ed; }
    pre, th, td, hr { border-color: #e4dfd4; }
    blockquote, section.footnotes { color: #565c61; }
    nav.sl-toc { border-color: #e4dfd4; }
    nav.sl-toc a.sl-toc-item { color: #2b6d64; }
  }
`

/** 公式 → MathML（自包含，不依赖 KaTeX 的 CSS 与字体）；解析失败退回 `$latex$` 原文 */
function renderMathml(latex: string, display: boolean): string {
  const attr = escapeHtml(latex)
  const fallback = `<code class="math-fallback" data-latex="${attr}">${display ? `$$${escapeHtml(latex)}$$` : `$${escapeHtml(latex)}$`}</code>`
  try {
    const mathml = katex.renderToString(latex, { output: 'mathml', throwOnError: false, displayMode: display })
    // throwOnError:false 时非法输入会返回 katex-error 的 span，而不是 MathML
    if (!mathml.includes('<math') || mathml.includes('katex-error')) return fallback
    return `<span class="math math-${display ? 'block' : 'inline'}" data-latex="${attr}">${mathml}</span>`
  } catch {
    return fallback
  }
}

/** 编辑器 HTML → 纯文本：公式先还原成 `$latex$`，再剥标签、解码实体 */
export function buildPlainText(html: string): string {
  return mathToPlainText(html)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|h[1-6]|li|blockquote|pre|tr)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export function buildHtmlDocument(options: HtmlExportOptions): string {
  const title = escapeHtml(options.title.replace(/\.md$/i, ''))
  const size = options.fontSize ?? 17
  const font = options.fontFamily ?? '"Source Han Serif SC", "Noto Serif SC", "Songti SC", Georgia, serif'

  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<style>
  :root { --export-size: ${size}px; }
  body { font-family: ${font}; }
${STYLES}
</style>
</head>
<body>
${renderFrontmatter(options.frontmatter ?? '')}
${replaceMathHtml(options.bodyHtml, renderMathml)}
${renderFootnotes(options.footnotes ?? '')}
</body>
</html>
`
}

/** 导出文件名：把扩展名换掉 */
export function exportName(title: string, extension: string): string {
  const base = title.replace(/\.[^./\\]+$/, '') || '未命名'
  return `${base}.${extension}`
}
