import { useEffect, useMemo, useSyncExternalStore, type MouseEvent as ReactMouseEvent } from 'react'

import katex from '../lib/katexLazy.ts'
import { ensureKatex, isKatexReady, subscribe } from '../lib/katexLazy.ts'
import { getAssetVersion, getResolvedAsset, isRelativeAsset, resolveAsset, subscribeResolved } from '../lib/assetResolve.ts'
import { renderFootnotes, renderFrontmatter } from '../lib/export.ts'
import { hasTocMarker } from '../lib/toc.ts'

type Props = {
  bodyHtml: string
  frontmatter: string
  footnotes: string
  /**
   * 原文里有 `[TOC]` 标记：只读预览把标记段落换成同一份目录（第 61 轮 B2）。
   * 转义的 `\[TOC\]` 不传 true，预览保留字面文本。
   */
  tocActive?: boolean
}

/**
 * 只读预览里的目录：只收顶层标题（引用块、列表里的标题不算章节），
 * 把文字正好是 `[TOC]` 的顶层段落换成一个 `<nav class="sl-toc">`。
 * 与编辑视图的目录 widget 同一套类名与点击跳转口径。
 */
function renderPreviewToc(doc: Document): void {
  const children = [...doc.body.children]
  const headings = children.filter((element) => /^H[1-6]$/.test(element.tagName))
  if (headings.length === 0) return
  const marker = children.find((element) => element.tagName === 'P' && hasTocMarker(element.textContent ?? ''))
  if (!marker) return
  const nav = doc.createElement('nav')
  nav.className = 'sl-toc preview-toc'
  nav.setAttribute('aria-label', '目录')
  headings.forEach((heading, index) => {
    const button = doc.createElement('button')
    button.type = 'button'
    button.className = 'sl-toc-item'
    button.dataset.level = heading.tagName.slice(1)
    button.dataset.tocIndex = String(index)
    button.textContent = heading.textContent?.trim() ?? ''
    nav.append(button)
  })
  marker.replaceWith(nav)
}

/** 编辑器序列化出来的公式只有 latex，没有渲染结果；预览里补上 KaTeX */
function renderMath(html: string, tocActive: boolean): string {
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
  // 工作区相对路径图片换成已解析的 blob URL；没解析到就保持原样（预览是只读副本，不改正文）
  for (const img of doc.querySelectorAll('img[src]')) {
    const next = getResolvedAsset(img.getAttribute('src') ?? '')
    if (next) img.setAttribute('src', next)
  }
  if (tocActive) renderPreviewToc(doc)
  return doc.body.innerHTML
}

/**
 * 只读预览：复用导出的渲染与编辑器排版；frontmatter 与脚注跟导出一致，公式由 KaTeX 当场补渲染。
 * KaTeX 惰性加载完成前显示占位，加载后由 useSyncExternalStore 自动重画。
 */
export function PreviewPane({ bodyHtml, frontmatter, footnotes, tocActive = false }: Props) {
  const ready = useSyncExternalStore(subscribe, isKatexReady, () => false)
  // 图片解析版本号：源码模式下编辑器没有挂载，缓存不会自己热起来，只能预览自己发起解析
  const assetVersion = useSyncExternalStore(subscribeResolved, getAssetVersion, () => 0)
  const hasMath = bodyHtml.includes('data-type="inline-math"') || bodyHtml.includes('data-type="block-math"')

  useEffect(() => {
    if (!bodyHtml) return
    const doc = new DOMParser().parseFromString(bodyHtml, 'text/html')
    for (const img of doc.querySelectorAll('img[src]')) {
      const src = img.getAttribute('src') ?? ''
      if (isRelativeAsset(src) && !getResolvedAsset(src)) void resolveAsset(src)
    }
  }, [bodyHtml, assetVersion])

  // 防御性修复（第 43 轮）：renderToString 的契约是「未就绪返回空串，调用方先 await ensureKatex()」，
  // 预览是唯一没履约的调用方。改前正常路径由 App 的 setMarkdown 预取覆盖，这里是兜底锁。
  useEffect(() => {
    if (!hasMath || ready) return
    void ensureKatex().catch(() => undefined)
  }, [hasMath, ready])

  const html = useMemo(() => {
    if (hasMath && !ready) return ''
    return `${renderFrontmatter(frontmatter)}${renderMath(bodyHtml, tocActive)}${renderFootnotes(footnotes)}`
  }, [bodyHtml, frontmatter, footnotes, hasMath, ready, assetVersion, tocActive])

  // 目录条目是 dangerouslySetInnerHTML 里的按钮：在根节点上用事件委托统一处理点击
  const onClick = (event: ReactMouseEvent<HTMLElement>) => {
    const target = event.target as HTMLElement | null
    const button = target?.closest?.('.sl-toc-item')
    if (!button) return
    const index = Number(button.getAttribute('data-toc-index'))
    const headings = [...event.currentTarget.children].filter((element) => /^H[1-6]$/.test(element.tagName))
    const heading = headings[index]
    if (heading instanceof HTMLElement) heading.scrollIntoView({ block: 'start', behavior: 'auto' })
  }

  if (hasMath && !ready) {
    return (
      <div className="doc-layout preview-layout">
        <div className="doc-column preview-column">
          <p className="math-pending-note">公式预览加载中…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="doc-layout preview-layout">
      <div className="doc-column preview-column">
        <article
          className="ProseMirror doc-body preview-pane"
          contentEditable={false}
          // 内容来自当前文档的编辑器序列化，与导出的 HTML 同源
          dangerouslySetInnerHTML={{ __html: html }}
          onClick={onClick}
        />
      </div>
    </div>
  )
}
