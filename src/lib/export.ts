import katex from './katexLazy.ts'

import { mathToPlainText, replaceMathHtml } from './math.ts'

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

/** 把 `[^id]: 内容` 形式的脚注定义转成列表项 */
export function renderFootnotes(footnotes: string): string {
  const items = footnotes
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('[^'))
    .map((line) => line.replace(/^\[\^[^\]]+\]:\s*/, ''))
    .filter((line) => line.length > 0)

  if (items.length === 0) return ''
  return `<section class="footnotes"><h2>注释</h2><ol>${items
    .map((item) => `<li>${escapeHtml(item)}</li>`)
    .join('')}</ol></section>`
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
  @media (prefers-color-scheme: dark) {
    body { color: #e9e6e0; background: #15171a; }
    code { background: #22302e; }
    pre, th, td, hr { border-color: #2a2e33; }
    th { background: #22302e; }
    blockquote { color: #a8adaf; }
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
