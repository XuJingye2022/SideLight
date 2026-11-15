import { useMemo, useSyncExternalStore } from 'react'

import katex from '../lib/katexLazy.ts'
import { isKatexReady, subscribe } from '../lib/katexLazy.ts'
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
 * 只读预览：复用导出的渲染与编辑器排版；frontmatter 与脚注跟导出一致，公式由 KaTeX 当场补渲染。
 * KaTeX 惰性加载完成前显示占位，加载后由 useSyncExternalStore 自动重画。
 */
export function PreviewPane({ bodyHtml, frontmatter, footnotes }: Props) {
  const ready = useSyncExternalStore(subscribe, isKatexReady, () => false)
  const hasMath = bodyHtml.includes('data-type="inline-math"') || bodyHtml.includes('data-type="block-math"')

  const html = useMemo(() => {
    if (hasMath && !ready) return ''
    return `${renderFrontmatter(frontmatter)}${renderMath(bodyHtml)}${renderFootnotes(footnotes)}`
  }, [bodyHtml, frontmatter, footnotes, hasMath, ready])

  if (hasMath && !ready) {
    return (
      <div className="doc-column preview-column">
        <p className="math-pending-note">公式预览加载中…</p>
      </div>
    )
  }

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
