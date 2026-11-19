import type { Editor } from '@tiptap/core'
import { BlockMath, InlineMath } from '@tiptap/extension-mathematics'
import { NodeSelection, TextSelection } from '@tiptap/pm/state'
import type { EditorView } from '@tiptap/pm/view'

import { isKatexReady, render, subscribe } from './katexLazy.ts'
import { closeMathEditTransaction, mathInputSelection } from './mathInput.ts'

/**
 * 第 90 轮 A1（用户反馈 #1）+ 第 91 轮 B1（用户反馈 #2）：公式就地编辑。
 *
 * 旧实现点公式弹 `MathInlineEditor` 浮层，atom 本身 `contenteditable=false`，光标进不去。
 * Typora 的做法是把公式当普通文本：光标进入就展开成源码，改完失焦回渲染。这里不改存储形态
 * （仍是 `inlineMath` / `blockMath` atom，Markdown 仍写 `$latex$` / `$$\nlatex\n$$`），
 * 只在 NodeView 的 DOM 里放一个真输入框：
 *
 * - 行内：非编辑态是 KaTeX 成品；编辑态 `.sl-math-inline-edit` = `$` + `<input>` + `$`。
 * - 块级：非编辑态是 `.block-math-inner` 里的 KaTeX 成品；编辑态收起它，换成
 *   `.sl-math-block-edit` = `<textarea class="sl-math-block-input">` + 实时 KaTeX 预览。
 * - 出口：行内 Enter / 失焦提交；块级 Ctrl+S / 失焦提交（Enter 在 textarea 里换行）；
 *   Esc 还原（新建的空 atom 删掉）；行内 ←/→ 到两端、块级首行 ↑ / 末行 ↓ 提交后移出。
 *
 * 注册表：`enterMathEdit(view, pos)` 用 `view.nodeDOM(pos)` 找到 NodeView 的 DOM，再查 WeakMap。
 * 这样插入入口（工具栏 / Ctrl+M / Ctrl+Shift+M / `$$` 回车 / 点公式）不用自己拼 NodeView 实例。
 */

/** 一个 NodeView 的就地编辑入口 */
export type MathEditorHandle = { enter: (isNew: boolean) => void }

const editors = new WeakMap<object, MathEditorHandle>()

/**
 * 正在就地编辑的公式条数（模块级，第 93 轮 B1）。
 * 用户正在输入框里改 TeX 时，别的 appendTransaction（如 `delimiterPair`）不该去收正文里的
 * 定界符对：那一瞬间的选区还停在 atom 上，动正文会把用户的输入框连根拔掉。
 * `storage.draft` 恒为 false（第 92 轮 B1 计划里那条判据不成立），所以改用这个计数。
 */
let editingCount = 0

/** 当前是否有公式在就地编辑（行内输入框或块级 textarea） */
export function isMathEditing(): boolean {
  return editingCount > 0
}

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
/** 块级输入框最少两行、最多 12 行（再长自己滚） */
const MIN_BLOCK_ROWS = 2
const MAX_BLOCK_ROWS = 12

type MathKind = 'inlineMath' | 'blockMath'
type FinishAction = 'enter' | 'blur' | 'escape' | 'before' | 'after'
type NodeLike = { type: { name: string }; attrs: Record<string, unknown> }

type ControllerOptions = {
  kind: MathKind
  editor: Editor
  wrapper: HTMLElement
  getPos: () => number | undefined
  /** NodeView 缓存里的已提交 latex */
  readLatex: () => string
}

type MathEditController = {
  enter: (isNew: boolean) => void
  isEditing: () => boolean
  destroy: () => void
}

/** 去掉公式内容两端的空白；块级中间换行保留（TeX 里换行等价空格） */
const normalizeLatex = (value: string): string => value.replace(/^\s+|\s+$/g, '')

/** 焦点在首行 / 末行（折叠光标）？块级 ↑/↓ 靠它决定是移出还是正常移动光标 */
const onFirstLine = (field: HTMLTextAreaElement): boolean => {
  const start = field.selectionStart ?? 0
  return start === (field.selectionEnd ?? 0) && !field.value.slice(0, start).includes('\n')
}
const onLastLine = (field: HTMLTextAreaElement): boolean => {
  const end = field.selectionEnd ?? 0
  return end === (field.selectionStart ?? 0) && !field.value.slice(end).includes('\n')
}

/**
 * 行内/块级共用的编辑器：建输入框、收键、提交/还原、移出选区。
 * 两种公式的差异只在输入框形态、快捷键与预览，统一在这里按 `kind` 分支。
 */
function createMathEditor(options: ControllerOptions): MathEditController {
  const { kind, editor, wrapper, getPos, readLatex } = options
  const display = kind === 'blockMath'

  let editing = false
  let destroyed = false
  /** 新建的空 atom：Esc 时要删掉（B-157），提交时并入插入那一步的撤销 */
  let isNew = false
  /** 进入新建编辑的时间戳：提交事务沿用这个 time，撤销一次就整条撤回 */
  let newEditTime = 0
  let field: HTMLInputElement | HTMLTextAreaElement | null = null
  let box: HTMLElement | null = null
  let preview: HTMLElement | null = null
  let unsubReady: (() => void) | null = null

  const closeEdit = (): void => {
    if (field) {
      field.removeEventListener('keydown', onKeyDown)
      field.removeEventListener('blur', onBlur)
      field.removeEventListener('input', onInput)
    }
    unsubReady?.()
    unsubReady = null
    // 先摘监听再移除：移除焦点元素在部分浏览器里会补一次 blur
    box?.remove()
    box = null
    preview = null
    field = null
    if (editing) {
      editingCount = Math.max(0, editingCount - 1)
      editing = false
    }
    wrapper.classList.remove('is-editing')
  }

  const renderPreview = (): void => {
    if (!preview || !field) return
    const value = field.value
    if (value.trim().length === 0) {
      preview.replaceChildren()
      return
    }
    render(value, preview)
  }

  const syncBlockRows = (): void => {
    if (!field || !display) return
    const lines = field.value.split('\n').length
    const rows = Math.min(MAX_BLOCK_ROWS, Math.max(MIN_BLOCK_ROWS, lines))
    ;(field as HTMLTextAreaElement).rows = rows
  }

  const syncInputWidth = (): void => {
    if (!field || display) return
    field.style.width = `${Math.max(MIN_INPUT_CH, field.value.length + 1)}ch`
  }

  const onInput = (): void => {
    syncInputWidth()
    syncBlockRows()
    if (display) renderPreview()
  }

  /**
   * 关闭编辑并落库。
   * - `enter`：键盘提交（行内 Enter、块级 Ctrl+S，写选区并回正文）
   * - `blur`：失焦（只写节点属性；行内不夺点击处的选区，块级把选区移出 atom）
   * - `escape`：还原（新建的空 atom 删掉）
   * - `before` / `after`：到边界，提交后把光标移出 atom
   */
  const finish = (action: FinishAction): void => {
    if (!editing) return
    const value = field?.value ?? readLatex()
    let pos: number | undefined
    try {
      pos = getPos()
    } catch {
      pos = undefined
    }
    const previous = readLatex()
    closeEdit()
    if (destroyed || typeof pos !== 'number') return
    const view = editor.view
    const state = view.state
    const node = state.doc.nodeAt(pos)
    if (!node || node.type.name !== kind) return

    // Esc 一律还原成进入编辑前的 latex；空内容提交则等于删除（Markdown 里没有 `$ $` 这种公式）
    const next = action === 'escape' ? previous : normalizeLatex(value)
    const remove = action === 'escape' ? isNew : next.length === 0
    if (remove) {
      const tr = closeMathEditTransaction(state, { from: pos, to: pos + node.nodeSize, remove: true })
      view.dispatch(tr)
      if (action !== 'blur') view.focus()
      return
    }

    const changed = next !== previous
    let tr = state.tr
    if (changed) {
      tr = tr.setNodeMarkup(pos, undefined, { ...node.attrs, latex: next })
      // 新建公式：提交与插入合并成一个撤销事件（Ctrl+Z 一次撤回整条公式）。
      // 历史插件按事务自带的时间戳判组；沿用进入编辑那一刻的时间即可。
      if (isNew && newEditTime > 0) tr.setTime(newEditTime)
    }
    if (action === 'blur') {
      if (display) {
        // 块级离开编辑时选区可能还停在 atom 上（↑/↓ 进来的就是 NodeSelection）：
        // 不移出的话 mathReveal 会把 `$$…$$` 一直露着。点到正文别处时 PM 的 mousedown
        // 随后会按点击位置再设一次选区，这里只是兜底。
        tr = tr.setSelection(mathInputSelection(tr.doc, pos))
      }
      // 点到别处结束编辑：行内光标落在用户点的地方，不再拉回公式（P2-5）
      if (changed || tr.selectionSet) view.dispatch(tr)
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

  const onKeyDown = (raw: Event): void => {
    // 输入框是 input/textarea 的联合类型，addEventListener 的重载收窄不到 KeyboardEvent
    const event = raw as KeyboardEvent
    // 组合输入（中文输入法）期间的回车/Esc 是候选字操作，不能拿来提交/取消
    if (event.isComposing || event.keyCode === 229) return
    if (event.key === 'Enter') {
      // 行内：Enter 提交；块级：textarea 里换行（默认行为，不拦）
      if (!display) {
        event.preventDefault()
        event.stopPropagation()
        finish('enter')
      }
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
    if (display) {
      const textarea = field as HTMLTextAreaElement | null
      if (!textarea || event.shiftKey || event.altKey || mod) return
      if (event.key === 'ArrowUp' && onFirstLine(textarea)) {
        event.preventDefault()
        finish('before')
        return
      }
      if (event.key === 'ArrowDown' && onLastLine(textarea)) {
        event.preventDefault()
        finish('after')
      }
      return
    }
    const input = field as HTMLInputElement | null
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

  const buildField = (): void => {
    const created: HTMLInputElement | HTMLTextAreaElement = display
      ? document.createElement('textarea')
      : document.createElement('input')
    created.className = display ? 'sl-math-block-input' : 'sl-math-inline-input'
    if (!display) (created as HTMLInputElement).type = 'text'
    created.spellcheck = false
    created.setAttribute('aria-label', display ? '块级公式 LaTeX' : '行内公式 LaTeX')
    created.setAttribute('autocomplete', 'off')
    created.setAttribute('autocapitalize', 'off')
    const initial = readLatex()
    // 新建的空块级公式内部存的是一个空格（Markdown 需要非空才能再解析回来），编辑框里显示空
    created.value = isNew && normalizeLatex(initial).length === 0 ? '' : initial
    created.addEventListener('keydown', onKeyDown)
    created.addEventListener('blur', onBlur)
    created.addEventListener('input', onInput)
    field = created
  }

  const enter = (created: boolean): void => {
    if (destroyed || !editor.isEditable) return
    if (editing) {
      // 已经开着（例如插入时先是 NodeSelection 触发了一次 enter(false)，onBlockCreated 又调一次）：
      // 新建标记要被提升，否则 Esc 不会把空块删掉（B1「$$+Enter→Esc 空块 0」）
      if (created) {
        isNew = true
        if (newEditTime === 0) newEditTime = Date.now()
      }
      field?.focus()
      return
    }
    editing = true
    editingCount += 1
    isNew = created
    newEditTime = created ? Date.now() : 0
    wrapper.classList.add('is-editing')
    buildField()

    if (display) {
      const textarea = field as HTMLTextAreaElement
      textarea.rows = MIN_BLOCK_ROWS
      const wrap = document.createElement('div')
      wrap.className = 'sl-math-block-edit'
      preview = document.createElement('div')
      preview.className = 'sl-math-block-preview'
      preview.setAttribute('aria-hidden', 'true')
      wrap.append(textarea, preview)
      wrapper.appendChild(wrap)
      box = wrap
      syncBlockRows()
      renderPreview()
    } else {
      const input = field as HTMLInputElement
      const wrap = document.createElement('span')
      wrap.className = 'sl-math-inline-edit'
      wrap.append(document.createTextNode('$'), input, document.createTextNode('$'))
      wrapper.appendChild(wrap)
      box = wrap
      syncInputWidth()
      // KaTeX 还在惰性加载时，`katexLazy` 的 flush 会重写 wrapper 内容，把编辑框冲掉；
      // 加载完成后若编辑仍在进行，就把编辑框补回去（窗口只有首次加载的几十毫秒）。
      if (!isKatexReady()) {
        unsubReady = subscribe(() => {
          if (!editing || destroyed) return
          if (box && !box.isConnected) wrapper.appendChild(box)
          if (field && !display && document.activeElement !== field) field.focus()
        })
      }
    }

    field?.focus()
    // 光标落尾：点开已有公式时直接从 TeX 末尾接着改
    const length = field?.value.length ?? 0
    if (display) {
      ;(field as HTMLTextAreaElement).setSelectionRange(length, length)
    } else {
      ;(field as HTMLInputElement).setSelectionRange(length, length)
    }
  }

  return {
    enter,
    isEditing: () => editing,
    destroy: () => {
      destroyed = true
      closeEdit()
    },
  }
}

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

      const paintMath = (): void => {
        wrapper.setAttribute('data-latex', latex)
        if (latex.trim().length === 0) {
          // 空公式没有可排的内容：KaTeX 空渲染会留一个 0 尺寸的盒子
          wrapper.replaceChildren()
          return
        }
        render(latex, wrapper)
      }

      const controller = createMathEditor({
        kind: 'inlineMath',
        editor,
        wrapper,
        getPos,
        readLatex: () => latex,
      })

      const onMouseDown = (event: MouseEvent): void => {
        if (event.target === wrapper.querySelector('.sl-math-inline-input')) return
        if (controller.isEditing()) {
          // 编辑态里点输入框之外的地方：别让 PM 起选区，也不要抢输入框焦点
          event.preventDefault()
          return
        }
        // 不进编辑的那一下点击会把公式选成 NodeSelection、mathReveal 露出 `$…$`；
        // 这里同时挡掉 PM 的默认选区与冒泡的点击处理
        event.preventDefault()
        event.stopPropagation()
        controller.enter(false)
      }

      wrapper.addEventListener('mousedown', onMouseDown)
      paintMath()
      registerMathEditor(wrapper, controller)

      return {
        dom: wrapper,
        update: (updated: NodeLike) => {
          if (updated.type.name !== 'inlineMath') return false
          const next = String(updated.attrs.latex ?? '')
          if (next === latex) return true
          latex = next
          wrapper.setAttribute('data-latex', latex)
          if (!controller.isEditing()) paintMath()
          return true
        },
        // 编辑框里的输入、焦点变化都不进 ProseMirror 的 DOM 解析
        ignoreMutation: () => true,
        // 编辑期间编辑框自己的事件不能交给 PM：PM 的 keypress/keydown 会在
        // NodeSelection 下把输入的字插进正文（replaceSelectionWith），Enter 也会被吞掉
        stopEvent: (event: Event) => {
          if (!controller.isEditing()) return false
          const target = event.target
          return target instanceof Node && wrapper.contains(target)
        },
        destroy: () => {
          wrapper.removeEventListener('mousedown', onMouseDown)
          controller.destroy()
        },
      }
    }
  },
})

/** 块级公式的 KaTeX 成品容器（与上游 DOM 同构：`wrapper > .block-math-inner`） */
const createBlockInner = (): HTMLElement => {
  const inner = document.createElement('div')
  inner.className = 'block-math-inner'
  return inner
}

/**
 * 块级公式 NodeView（第 91 轮 B1，用户反馈 #2）：块内直接改 TeX + 实时公式预览。
 * 点击或方向键选中（NodeSelection）就进编辑；Esc 还原；首行 ↑ / 末行 ↓ 把光标送出块。
 */
export const SidelightBlockMath = BlockMath.extend({
  addNodeView() {
    return ({ node, editor, getPos }) => {
      const wrapper = document.createElement('div')
      wrapper.className = 'tiptap-mathematics-render'
      if (editor.isEditable) wrapper.classList.add('tiptap-mathematics-render--editable')
      wrapper.dataset.type = 'block-math'

      let latex = String(node.attrs.latex ?? '')
      wrapper.setAttribute('data-latex', latex)

      const inner = createBlockInner()
      wrapper.appendChild(inner)

      const paintMath = (): void => {
        wrapper.setAttribute('data-latex', latex)
        if (latex.trim().length === 0) {
          inner.replaceChildren()
          return
        }
        // 对 `inner` 渲染而不是整个 wrapper：编辑框是 wrapper 的另一个子节点，不能被冲掉
        render(latex, inner)
      }

      const controller = createMathEditor({
        kind: 'blockMath',
        editor,
        wrapper,
        getPos,
        readLatex: () => latex,
      })

      let destroyed = false

      const onMouseDown = (event: MouseEvent): void => {
        const target = event.target
        if (controller.isEditing()) {
          // 输入框自己要默认行为（定位光标、选中文字）；预览区/空白处点击不结束编辑、别让 PM 起选区
          if (target instanceof HTMLElement && target.closest('.sl-math-block-input')) return
          event.preventDefault()
          return
        }
        // 点公式进编辑：挡掉 PM 的 click 默认行为，别把它选成 NodeSelection（会露出 $$…$$）
        event.preventDefault()
        event.stopPropagation()
        controller.enter(false)
      }

      // 方向键把光标移进 atom（NodeSelection）就进编辑：用户不必再点一下
      const onSelectionUpdate = (): void => {
        if (controller.isEditing() || destroyed) return
        let pos: number | undefined
        try {
          pos = getPos()
        } catch {
          return
        }
        if (typeof pos !== 'number') return
        const selection = editor.state.selection
        if (selection instanceof NodeSelection && selection.from === pos) controller.enter(false)
      }

      wrapper.addEventListener('mousedown', onMouseDown)
      editor.on('selectionUpdate', onSelectionUpdate)
      paintMath()
      registerMathEditor(wrapper, controller)

      return {
        dom: wrapper,
        update: (updated: NodeLike) => {
          if (updated.type.name !== 'blockMath') return false
          const next = String(updated.attrs.latex ?? '')
          if (next === latex) return true
          latex = next
          wrapper.setAttribute('data-latex', latex)
          if (!controller.isEditing()) paintMath()
          return true
        },
        ignoreMutation: () => true,
        // 编辑期间（含 textarea 里的回车、Ctrl+A、粘贴）不能交给 PM 处理
        stopEvent: (event: Event) => {
          if (!controller.isEditing()) return false
          const target = event.target
          return target instanceof Node && wrapper.contains(target)
        },
        destroy: () => {
          destroyed = true
          wrapper.removeEventListener('mousedown', onMouseDown)
          editor.off('selectionUpdate', onSelectionUpdate)
          controller.destroy()
        },
      }
    }
  },
})
