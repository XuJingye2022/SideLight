import { Extension } from '@tiptap/core'
import type { Fragment, Node as ProseMirrorNode } from '@tiptap/pm/model'
import { Plugin, PluginKey, type Transaction } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'

import type { OutlineItem } from './outline.ts'
import { hasTocMarker, isTocParagraph, tocEntries } from './toc.ts'

/**
 * 第 58 轮 B-106：`[TOC]` 段落的渲染。
 * 做法是文档装饰：在每个 `[TOC]` 段落前挂一个 block widget（`side: -1`），
 * 源段落不隐藏——写了什么还能看见，删掉标记目录就消失。
 * 点击条目走 `onJump(item)`，与侧栏大纲同一个跳转入口。
 */
export type TocOptions = {
  onJump: (item: OutlineItem) => void
  /**
   * 文档原文：原文里只有被转义的 `\[TOC\]` 时不渲染（第 58 轮 plan-review R2）。
   * 不传按「没有原文」处理，照常渲染。
   */
  original?: () => string | null
}

export type TocBuildOptions = {
  onJump?: (item: OutlineItem) => void
  original?: string | null
}

export type TocDecorations = {
  set: DecorationSet
  /** 有没有挂上目录 widget：没有时逐键不必重建（第 58 轮 plan-review R3） */
  active: boolean
}

/** 目录按钮的 DOM：`<nav class="sl-toc">` 里一列 `<button>` */
function makeToc(entries: OutlineItem[], onJump?: (item: OutlineItem) => void): HTMLElement {
  const nav = document.createElement('nav')
  nav.className = 'sl-toc'
  nav.setAttribute('aria-label', '目录')
  nav.setAttribute('contenteditable', 'false')
  for (const entry of entries) {
    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'sl-toc-item'
    button.dataset.level = String(entry.level)
    button.textContent = entry.text
    // 不抢正文选区：按下先挡默认，点击再跳
    button.addEventListener('mousedown', (event) => event.preventDefault())
    button.addEventListener('click', () => onJump?.(entry))
    nav.append(button)
  }
  return nav
}

/**
 * 纯函数：算出目录 widget 装饰。单测直接调它，不建 Editor。
 * 快路径：没有 `[TOC]` 段落直接返回空集；原文只有转义写法时也不挂。
 */
export function buildTocDecorations(doc: ProseMirrorNode, options: TocBuildOptions = {}): TocDecorations {
  const positions: number[] = []
  doc.forEach((node, offset) => {
    if (isTocParagraph(node)) positions.push(offset)
  })
  if (positions.length === 0) return { set: DecorationSet.empty, active: false }
  const original = options.original ?? null
  if (typeof original === 'string' && original.length > 0 && !hasTocMarker(original)) {
    return { set: DecorationSet.empty, active: false }
  }
  const entries = tocEntries(doc)
  if (entries.length === 0) return { set: DecorationSet.empty, active: false }
  // key 带上标题签名：标题变了要换 DOM；同一文档两个 [TOC] 也不会撞键（第 58 轮 R3）
  const signature = entries.map((entry) => `${entry.level}:${entry.text}`).join('|')
  const decorations = positions.map((pos) =>
    Decoration.widget(pos, () => makeToc(entries, options.onJump), {
      side: -1,
      ignoreSelection: true,
      key: `toc@${pos}-${signature}`,
    }),
  )
  return { set: DecorationSet.create(doc, decorations), active: true }
}

/** 这次事务有没有可能造出 `[TOC]` 段落：只看光标所在段落和插入片段，不全篇扫 */
function maybeTocTouched(transaction: Transaction): boolean {
  const parent = transaction.selection.$from.parent
  if (parent.isTextblock && hasTocMarker(parent.textContent)) return true
  for (const step of transaction.steps) {
    const slice = (step as { slice?: { content: Fragment } }).slice
    if (!slice || slice.content.size === 0) continue
    if (hasTocMarker(slice.content.textBetween(0, slice.content.size, '\n', '\ufffc'))) return true
  }
  return false
}

const tocKey = new PluginKey<TocDecorations>('sidelightToc')

export function createToc(options: TocOptions): Extension {
  return Extension.create({
    name: 'sidelightToc',
    addProseMirrorPlugins() {
      const build = (doc: ProseMirrorNode) =>
        buildTocDecorations(doc, { onJump: options.onJump, original: options.original?.() ?? null })
      return [
        new Plugin<TocDecorations>({
          key: tocKey,
          state: {
            init: (_config, state) => build(state.doc),
            apply(transaction, previous) {
              if (!transaction.docChanged) return previous
              // 没有目录时，只有改动可能造出 [TOC] 才重建：1 MB 文档逐键不做全篇扫描
              if (!previous.active && !maybeTocTouched(transaction)) return previous
              return build(transaction.doc)
            },
          },
          props: {
            decorations: (state) => tocKey.getState(state)?.set ?? null,
          },
        }),
      ]
    },
  })
}
