import { Extension, type Editor } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'

import { marksBody, type Annotation } from './annotations.ts'
import type { Match } from './find.ts'

const annotationKey = new PluginKey<DecorationSet>('sidelightAnnotations')
const focusKey = new PluginKey<DecorationSet>('sidelightFocus')
const findKey = new PluginKey<DecorationSet>('sidelightFind')

function makePlugin(key: PluginKey<DecorationSet>) {
  return new Plugin({
    key,
    state: {
      init: () => DecorationSet.empty,
      apply(transaction, previous) {
        const next = transaction.getMeta(key) as DecorationSet | undefined
        if (next) return next
        return previous.map(transaction.mapping, transaction.doc)
      },
    },
    props: {
      decorations(state) {
        return key.getState(state)
      },
    },
  })
}

export const AnnotationDecorations = Extension.create({
  name: 'annotationDecorations',
  addProseMirrorPlugins() {
    return [makePlugin(annotationKey), makePlugin(focusKey), makePlugin(findKey)]
  },
})

function dispatch(editor: Editor, key: PluginKey<DecorationSet>, decorations: Decoration[]): void {
  const set = DecorationSet.create(editor.state.doc, decorations)
  editor.view.dispatch(editor.state.tr.setMeta(key, set).setMeta('addToHistory', false))
}

/**
 * 把批注画到正文上。高亮范围与页边卡片用同一个 from/to，保证两边指的是一处。
 * 四态里 resolved / wont-fix 算结项：正文不再画，卡片那一份另行保留（可改回）。
 */
export function renderAnnotations(editor: Editor, annotations: Annotation[], activeId: string | null = null): void {
  const docSize = editor.state.doc.content.size
  const decorations = annotations
    .filter(
      (annotation) =>
        marksBody(annotation) &&
        annotation.from >= 0 &&
        annotation.to <= docSize &&
        annotation.from < annotation.to,
    )
    .map((annotation) =>
      Decoration.inline(annotation.from, annotation.to, {
        class: `annot annot-${annotation.kind}${annotation.id === activeId ? ' is-active' : ''}`,
      }),
    )

  dispatch(editor, annotationKey, decorations)
}

/**
 * 查找结果：命中处全部高亮，当前这一处更重。
 */
export function renderFind(editor: Editor, matches: Match[], activeIndex: number): void {
  const decorations = matches.map((match, index) =>
    Decoration.inline(match.from, match.to, {
      class: index === activeIndex ? 'find-hit is-current' : 'find-hit',
    }),
  )

  dispatch(editor, findKey, decorations)
}

/**
 * 专注模式：把光标所在块之外的顶层块压暗。
 */
export function renderFocus(editor: Editor, blockPos: number | null): void {
  if (blockPos === null) {
    dispatch(editor, focusKey, [])
    return
  }

  const decorations: Decoration[] = []
  editor.state.doc.forEach((node, offset) => {
    if (offset !== blockPos) {
      decorations.push(Decoration.node(offset, offset + node.nodeSize, { class: 'is-dimmed' }))
    }
  })

  dispatch(editor, focusKey, decorations)
}
