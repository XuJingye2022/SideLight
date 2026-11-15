import { useMemo } from 'react'
import katex from 'katex'

import { renderFootnotes, renderFrontmatter } from '../lib/export.ts'

type Props = {
  bodyHtml: string
  frontmatter: string
  footnotes: string
}

/** 编辑器序列化出来的公式只有 latex，没有渲染结果；预览里补上 KaTeX */
function renderMath(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  for (const element of doc.querySelectorAll('[data-type="inline-math"], [data-type="block-math"]')) {
    const latex = element.getAttribute('data-latex') ?? ''
    const holder = doc.createElement('span')
    holder.innerHTML = katex.renderToString(latex, {
      throwOnError: false,
      displayMode: element.getAttribute('data-type') === 'block-math',
    })
    element.replaceWith(holder)
  }
  return doc.body.innerHTML
}

/**
 * 只读预览：复用导出的渲染与编辑器排版，
 * frontmatter 与脚注跟导出保持一致，公式由 KaTeX 当场补渲染。
 */
export function PreviewPane({ bodyHtml, frontmatter, footnotes }: Props) {
  const html = useMemo(
    () => `${renderFrontmatter(frontmatter)}${renderMath(bodyHtml)}${renderFootnotes(footnotes)}`,
    [bodyHtml, frontmatter, footnotes],
  )

  return (
    <div className="doc-column preview-column">
      <article
        className="ProseMirror preview-pane"
        contentEditable={false}
        // 内容来自当前文档的编辑器序列化，与导出的 HTML 同源
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  )
}
