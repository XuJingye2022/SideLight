import { InlineMath } from '@tiptap/extension-mathematics'
import { TextSelection } from '@tiptap/pm/state'
import type { EditorView } from '@tiptap/pm/view'

import { isKatexReady, render, subscribe } from './katexLazy.ts'
import { closeMathEditTransaction, mathInputSelection } from './mathInput.ts'

/**
 * 第 90 轮 A1（用户反馈 #1）：行内公式就地编辑。
 *
 * 旧实现点公式弹 `MathInlineEditor` 浮层，atom 本身 `contenteditable=false`，光标进不去。
 * Typora 的做法是把公式当普通文本：光标进入就展开成 `$…$`，改完失焦回渲染。这里不改存储形态
 * （仍是 `inlineMath` atom，Markdown 仍写 `$latex$`），只在 NodeView 的 DOM 里放一个真输入框：
 *
 * - 非编辑态：`span[data-type="inline-math"][data-latex]` 里直接是 KaTeX 成品（与上游 NodeView 一致，
 *   `mathReveal` 的 `::after` 与打印恢复规则都按这个结构写）。
 * - 编辑态：外层加 `.is-editing`，KaTeX 由 CSS 收起；`.sl-math-inline-edit` = `$` + `<input>` + `$`。
 * - Enter / 失焦提交（`setNodeMarkup` 改 latex）；Esc 取消（新建的空 atom 删掉）；←/→ 到两端提交后移出。
 *
 * 注册表：`enterMathEdit(view, pos)` 用 `view.nodeDOM(pos)` 找到 NodeView 的 DOM，再查 WeakMap。
 * 这样插入入口（工具栏 / Ctrl+M）不用自己拼 NodeView 实例。
 */

/** 一个 NodeView 的就地编辑入口 */
export type MathEditorHandle = { enter: (isNew: boolean) => void }

const editors = new WeakMap<object, MathEditorHandle>()

/** 登记一个 DOM 对应的编辑入口（NodeView 创建时调用） */
export function registerMathEditor(dom: object, handle: MathEditorHandle): void {
  editors.set(dom, handle)
}

/** 查某个 DOM 的编辑入口；未登记（或不是对象）返回 null */
export function mathEditorFor(dom: unknown): MathEditorHandle | null {
  if (!dom || typeof dom !== 'object') return null
  return editors.get(dom) ?? null
}

/**
 * 从文档位置进入就地编辑。返回 false = 这个位置不是带 NodeView 的公式（调用方自己兜底）。
 * `view.nodeDOM` 对越界位置可能抛错，这里一律当「没找到」。
 */
export function enterMathEdit(
  view: EditorView,
  position: number,
  options: { isNew?: boolean } = {},
): boolean {
  let dom: Node | null = null
  try {
    dom = view.nodeDOM(position)
  } catch {
    return false
  }
  const handle = mathEditorFor(dom)
  if (!handle) return false
  handle.enter(options.isNew === true)
  return true
}

/** 编辑框随内容缩短/变长；`ch` 宽度对等宽字体最接近 */
const MIN_INPUT_CH = 3

type NodeLike = { type: { name: string }; attrs: Record<string, unknown> }

/**
 * 行内公式 NodeView。上游 `InlineMath` 只把 KaTeX 画进 wrapper，这里换成带输入框的版本。
 */
export const SidelightInlineMath = InlineMath.extend({
  addNodeView() {
    return ({ node, editor, getPos }) => {
      const wrapper = document.createElement('span')
      wrapper.className = 'tiptap-mathematics-render'
      if (editor.isEditable) wrapper.classList.add('tiptap-mathematics-render--editable')
      wrapper.dataset.type = 'inline-math'

      let latex = String(node.attrs.latex ?? '')
      wrapper.setAttribute('data-latex', latex)

      let editing = false
      let destroyed = false
      /** 新建的空 atom：Esc 时要删掉（B-157），提交时并入插入那一步的撤销 */
      let isNew = false
      /** 进入新建编辑的时间戳：提交事务沿用这个 time，撤销一次就整条撤回 */
      let newEditTime = 0
      let input: HTMLInputElement | null = null
      let edit: HTMLSpanElement | null = null
      let unsubReady: (() => void) | null = null

      const paintMath = (): void => {
        wrapper.setAttribute('data-latex', latex)
        if (latex.trim().length === 0) {
          // 空公式没有可排的内容：KaTeX 空渲染会留一个 0 尺寸的盒子
          wrapper.replaceChildren()
          return
        }
        render(latex, wrapper)
      }

      const closeEdit = (): void => {
        if (input) {
          input.removeEventListener('keydown', onKeyDown)
          input.removeEventListener('blur', onBlur)
          input.removeEventListener('input', onInput)
        }
        unsubReady?.()
        unsubReady = null
        // 先摘监听再移除：移除焦点元素在部分浏览器里会补一次 blur
        edit?.remove()
        edit = null
        input = null
        editing = false
        wrapper.classList.remove('is-editing')
      }

      /**
       * 关闭编辑并落库。
       * - `enter`：Enter / Ctrl+S（键盘路径，写选区并回正文）
       * - `blur`：失焦（只写节点属性，不夺点击处的选区，P2-5）
       * - `escape`：还原（新建的空 atom 删掉）
       * - `before` / `after`：←/→ 到两端，提交后把光标移出 atom
       */
      const finish = (action: 'enter' | 'blur' | 'escape' | 'before' | 'after'): void => {
        if (!editing) return
        const value = input?.value ?? latex
        const pos = getPos()
        closeEdit()
        if (destroyed || typeof pos !== 'number') return
        const view = editor.view
        const state = view.state
        const node = state.doc.nodeAt(pos)
        if (!node || node.type.name !== 'inlineMath') return

        // Esc 一律还原成进入编辑前的 latex；空内容提交则等于删除（Markdown 里没有 `$ $` 这种公式）
        const next = action === 'escape' ? latex : value.trim()
        const remove = action === 'escape' ? isNew : next.length === 0
        if (remove) {
          const tr = closeMathEditTransaction(state, { from: pos, to: pos + node.nodeSize, remove: true })
          view.dispatch(tr)
          if (action !== 'blur') view.focus()
          return
        }

        let tr = state.tr
        if (next !== latex) {
          tr = tr.setNodeMarkup(pos, undefined, { ...node.attrs, latex: next })
          // 新建公式：提交与插入合并成一个撤销事件（Ctrl+Z 一次撤回整条公式）。
          // 历史插件按事务自带的时间戳判组；沿用进入编辑那一刻的时间即可。
          if (isNew && newEditTime > 0) tr.setTime(newEditTime)
        }
        if (action === 'blur') {
          // 点到别处结束编辑：光标落在用户点的地方，不再拉回公式（P2-5）
          if (next !== latex) view.dispatch(tr)
          return
        }
        if (action === 'before') {
          tr.setSelection(TextSelection.near(tr.doc.resolve(Math.max(0, pos)), -1))
        } else if (action === 'after') {
          tr.setSelection(TextSelection.near(tr.doc.resolve(Math.min(tr.doc.content.size, pos + node.nodeSize)), 1))
        } else {
          tr.setSelection(mathInputSelection(tr.doc, pos))
        }
        view.dispatch(tr)
        view.focus()
      }

      const syncInputWidth = (): void => {
        if (!input) return
        input.style.width = `${Math.max(MIN_INPUT_CH, input.value.length + 1)}ch`
      }

      const onInput = (): void => syncInputWidth()

      const onKeyDown = (event: KeyboardEvent): void => {
        // 组合输入（中文输入法）期间的回车/Esc 是候选字操作，不能拿来提交/取消
        if (event.isComposing || event.keyCode === 229) return
        if (event.key === 'Enter') {
          event.preventDefault()
          event.stopPropagation()
          finish('enter')
          return
        }
        if (event.key === 'Escape') {
          // 同一个 Esc 不能再冒泡到 App 的 window 链：那里会把焦点送到状态栏字数入口（P1-2）
          event.preventDefault()
          event.stopPropagation()
          finish('escape')
          return
        }
        const mod = event.ctrlKey || event.metaKey
        if (mod && !event.altKey && !event.shiftKey && event.key.toLowerCase() === 's') {
          // 先在正文里落库，再让 App 的 Ctrl+S 保存（不拦截事件，冒泡照常）
          finish('enter')
          return
        }
        if (event.key === 'ArrowLeft' && (input?.selectionStart ?? 0) === 0 && (input?.selectionEnd ?? 0) === 0) {
          event.preventDefault()
          finish('before')
          return
        }
        if (
          event.key === 'ArrowRight' &&
          (input?.selectionStart ?? 0) === (input?.value.length ?? 0) &&
          (input?.selectionEnd ?? 0) === (input?.value.length ?? 0)
        ) {
          event.preventDefault()
          finish('after')
        }
      }

      const onBlur = (): void => {
        finish('blur')
      }

      const enter = (created: boolean): void => {
        if (destroyed) return
        if (editing) {
          input?.focus()
          return
        }
        editing = true
        isNew = created
        newEditTime = created ? Date.now() : 0
        wrapper.classList.add('is-editing')

        const box = document.createElement('span')
        box.className = 'sl-math-inline-edit'
        const field = document.createElement('input')
        field.className = 'sl-math-inline-input'
        field.type = 'text'
        field.spellcheck = false
        field.value = latex
        field.setAttribute('aria-label', '行内公式 LaTeX')
        field.setAttribute('autocomplete', 'off')
        field.setAttribute('autocapitalize', 'off')
        field.addEventListener('keydown', onKeyDown)
        field.addEventListener('blur', onBlur)
        field.addEventListener('input', onInput)
        box.append(document.createTextNode('$'), field, document.createTextNode('$'))
        wrapper.appendChild(box)
        edit = box
        input = field
        syncInputWidth()
        field.focus()
        // 光标落尾：点开已有公式时直接从 TeX 末尾接着改
        field.setSelectionRange(field.value.length, field.value.length)

        // KaTeX 还在惰性加载时，`katexLazy` 的 flush 会重写 wrapper 内容，把编辑框冲掉；
        // 加载完成后若编辑仍在进行，就把编辑框补回去（窗口只有首次加载的几十毫秒）。
        if (!isKatexReady()) {
          unsubReady = subscribe(() => {
            if (!editing || destroyed) return
            if (edit && !edit.isConnected) wrapper.appendChild(edit)
            if (input && document.activeElement !== input) input.focus()
          })
        }
      }

      const onMouseDown = (event: MouseEvent): void => {
        if (destroyed) return
        if (editing) {
          // 编辑态：输入框自己要默认行为（定位光标、选中文字），其余点击不让 PM 起选区
          if (event.target !== input) event.preventDefault()
          return
        }
        // 不进编辑的那一下点击会把公式选成 NodeSelection、mathReveal 露出 `$…$`；
        // 这里同时挡掉 PM 的默认选区与冒泡的点击处理
        event.preventDefault()
        event.stopPropagation()
        enter(false)
      }

      wrapper.addEventListener('mousedown', onMouseDown)
      paintMath()
      registerMathEditor(wrapper, { enter })

      return {
        dom: wrapper,
        update: (updated: NodeLike) => {
          if (updated.type.name !== 'inlineMath') return false
          const next = String(updated.attrs.latex ?? '')
          if (next === latex) return true
          latex = next
          wrapper.setAttribute('data-latex', latex)
          if (!editing) paintMath()
          return true
        },
        // 编辑框里的输入、焦点变化都不进 ProseMirror 的 DOM 解析
        ignoreMutation: () => true,
        // 编辑期间编辑框自己的事件不能交给 PM（否则 click 会把输入框失焦、打开 NodeSelection）
        stopEvent: (event: Event) => {
          if (!editing) return false
          const target = event.target
          return target instanceof Node && wrapper.contains(target)
        },
        destroy: () => {
          destroyed = true
          wrapper.removeEventListener('mousedown', onMouseDown)
          closeEdit()
        },
      }
    }
  },
})
