import { Extension, InputRule } from '@tiptap/core'

import { isMathBody } from './math.ts'

type Options = {
  /** 新建块级公式后回调，用来立刻打开就地编辑 */
  onBlockCreated?: (position: number) => void
}

/**
 * Tiptap 自带的数学输入规则只认 $$…$$（行内）和 $$$…$$$（块级），
 * 单 $ 与「$$ + 回车」都不认。这里补齐 Typora 的习惯：
 * - 打 $x^2$ 得到行内公式
 * - 一整行只有 $$latex$$ 时得到块级公式
 * - 空行里打 $$ 再回车，得到空的块级公式并立刻进入编辑
 */
export const MathInputRules = Extension.create<Options>({
  name: 'mathInputRules',
  priority: 1000,

  addOptions() {
    return { onBlockCreated: undefined }
  },

  // 正在就地编辑某条公式时，别再让输入规则把它抢走
  addStorage() {
    return { draft: false }
  },

  addInputRules() {
    return [
      new InputRule({
        find: /\$([^$\n]+)\$$/,
        handler: ({ state, range, match }) => {
          if (this.storage.draft) return
          const body = match[1]
          // 与载入路径共用「内侧不能是空白」：`$5 到 $` 是货币，不是公式
          if (!body.trim() || !isMathBody(body)) return
          const latex = body.trim()
          const type = state.schema.nodes.inlineMath
          if (!latex || !type) return
          state.tr.replaceWith(range.from, range.to, type.create({ latex }))
        },
      }),
      new InputRule({
        find: /^\$\$([\s\S]+?)\$\$$/,
        handler: ({ state, range, match }) => {
          if (this.storage.draft) return
          const latex = match[1].trim()
          const type = state.schema.nodes.blockMath
          if (!latex || !type) return
          const $from = state.doc.resolve(range.from)
          const paragraph = $from.parent
          const start = $from.start() - 1
          state.tr.replaceWith(start, start + paragraph.nodeSize, type.create({ latex }))
        },
      }),
    ]
  },

  addKeyboardShortcuts() {
    return {
      Enter: () => {
        if (this.storage.draft) return false
        const { state } = this.editor
        if (!state.selection.empty) return false
        const { $from } = state.selection
        if ($from.parent.textContent.trim() !== '$$') return false
        const blockMath = state.schema.nodes.blockMath
        if (!blockMath) return false

        const start = $from.before()
        const end = start + $from.parent.nodeSize

        // 先数一下现在有几个块级公式，插完按序号找回新加的那个
        let before = 0
        state.doc.descendants((node) => {
          if (node.type.name === 'blockMath') before += 1
          return true
        })

        this.editor
          .chain()
          .insertContentAt({ from: start, to: end }, { type: 'blockMath', attrs: { latex: ' ' } })
          .run()

        // 空公式渲染出来是一块空白，马上把编辑框打开，用户才有东西可打。
        // 放到下一帧：新节点这时还没进 DOM，拿不到尺寸。
        const findCreated = (attempt: number) => {
          const doc = this.editor.state.doc
          let index = 0
          let position = -1
          doc.descendants((node, pos) => {
            if (position >= 0) return false
            if (node.type.name === 'blockMath') {
              if (index === before) {
                position = pos
                return false
              }
              index += 1
            }
            return true
          })
          if (position >= 0) {
            this.options.onBlockCreated?.(position)
            return
          }
          if (attempt < 5) requestAnimationFrame(() => findCreated(attempt + 1))
        }
        requestAnimationFrame(() => findCreated(0))
        return true
      },
    }
  },
})
