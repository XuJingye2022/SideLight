import { Extension } from '@tiptap/core'
import { Plugin, TextSelection } from '@tiptap/pm/state'

/**
 * 键盘输入时的排版符替换结果。
 * - `insert`：在光标处插入 `text`，光标落在 `text` 内偏移 `caret`（配对时 caret=1，光标在里侧）
 * - `replace`：把光标前 `from`（负数）到 `to`（通常是 0）这一段换成 `text`
 * - `skip`：只把光标前移一位，越过刚补上的关闭符，不改正文
 */
export type SmartResult =
  | { kind: 'insert'; text: string; caret: number }
  | { kind: 'replace'; from: number; to: number; text: string }
  | { kind: 'skip' }

/** 成对符号的左右半边，下标偶数开、奇数闭 */
const PAIRS = '()[]{}'
/** 视为「句首」的字符：开引号 / 未闭合的左括号都算 */
const OPENERS = '([{“‘'
/** 中文后半角标点，与下半角表同序 */
const HALF = ',;:?!'
const FULL = '，；：？！'
/** 中文标点的判据：汉字、日文假名、韩文谚文 */
const CJK = /[\u4e00-\u9fff\u3400-\u4dbf\u3040-\u30ff\uac00-\ud7af]/

/**
 * 唯一的判定入口：不碰 view，不碰选区。
 * `before` / `after` 是光标前 / 后最多 4 个字符（不跨节点）。
 * `lineBefore` 是光标所在文本块里光标之前的全文，只在按 `-` 时传：
 * 这一行里有 `|` 就可能是手打的表格分隔行，不许把 `--` 换成 `—`。
 * 命中返回结果，不命中返回 `null`（不是 `false`，不是 `undefined`）。
 *
 * 边界：`skip` 只对光标（空选区）成立——函数签名里看不到选区，
 * 「有选区时不得吞掉这次输入」由插件在 dispatch 前判。
 */
export function smartInput(before: string, inserted: string, after: string, lineBefore = ''): SmartResult | null {
  const last = before.slice(-1)
  const next = after.slice(0, 1)
  const atStart = last === '' || /\s/.test(last) || OPENERS.includes(last)

  // 引号：先定开 / 闭，再决定配对、越过还是只换字
  if (inserted === '"' || inserted === "'") {
    // don't、1990's 的撇号必须能原样打出来
    if (inserted === "'" && /[a-z0-9]/i.test(last)) return null
    if (atStart) return { kind: 'insert', text: inserted === '"' ? '“”' : '‘’', caret: 1 }
    const close = inserted === '"' ? '”' : '’'
    // 越过刚才补上的关闭引号（这里判的是产出物，不是 ASCII 半边）
    if (next === close) return { kind: 'skip' }
    return { kind: 'insert', text: close, caret: 1 }
  }

  const pair = PAIRS.indexOf(inserted)
  if (pair >= 0) {
    if (pair % 2 === 0) return { kind: 'insert', text: inserted + PAIRS[pair + 1], caret: 1 }
    if (next === inserted) return { kind: 'skip' }
    return null
  }

  // 手打的表格分隔行 | --- | --- | 不能被改成 | —- | —- |：这一行有 | 就整行不动
  if (inserted === '-' && lineBefore.includes('|')) return null
  // -- → —：第三根 - 的 before 末尾已是 —，不命中，交回 HorizontalRule 的输入规则
  if (inserted === '-' && last === '-') return { kind: 'replace', from: -1, to: 0, text: '—' }
  if (inserted === '.' && before.slice(-2) === '..') return { kind: 'replace', from: -2, to: 0, text: '…' }

  const half = HALF.indexOf(inserted)
  // 中文后的 ! 紧跟 [ 时不动，否则 Markdown 图片语法 ![图](a.png) 会被打断
  if (half >= 0 && CJK.test(last) && !(inserted === '!' && next === '[')) {
    return { kind: 'insert', text: FULL[half], caret: 1 }
  }

  return null
}

const SOURCE = 'sidelightSmartTyping'

export function createSmartTyping(options: { isEnabled: () => boolean }): Extension {
  return Extension.create({
    name: SOURCE,
    addProseMirrorPlugins() {
      return [
        new Plugin({
          props: {
            handleTextInput: (view, from, to, inserted) => {
              if (!options.isEnabled()) return false
              // 组合期间 handleTextInput 会被调用，靠 composing 挡，与 prosemirror-inputrules 同一做法
              if (view.composing) return false
              // 输入法上屏常一次提交多个字：多字符一律放行
              if (inserted.length !== 1) return false
              const state = view.state
              const $from = state.doc.resolve(from)
              const parent = $from.parent
              // 排除 1：代码块
              if (parent.type.spec.code) return false
              // 排除 2：公式等非文本块
              if (!parent.isTextblock) return false
              // 排除 3：行内代码
              const codeMark = state.schema.marks.code
              if (codeMark) {
                const inCode =
                  from === to
                    ? codeMark.isInSet(state.storedMarks ?? $from.marks()) !== undefined
                    : state.doc.rangeHasMark(from, to, codeMark)
                if (inCode) return false
              }
              const offset = $from.parentOffset
              const before = parent.textBetween(Math.max(0, offset - 4), offset, null, '\ufffc')
              const after = parent.textBetween(offset, Math.min(parent.content.size, offset + 4), null, '\ufffc')
              // 整行文本只在按 - 时取：其余键用不到，别让每个键都拼一次段落
              const lineBefore = inserted === '-' ? parent.textBetween(0, offset, null, '\ufffc') : ''
              const result = smartInput(before, inserted, after, lineBefore)
              // 不命中时返回 false：否则会截断后面的 prop，输入规则收不到这次输入
              if (!result) return false
              const tr = state.tr
              if (result.kind === 'skip') {
                // skip 只对空选区；有选区时交回默认，不吞输入
                if (!state.selection.empty) return false
                tr.setSelection(TextSelection.create(state.doc, from + 1))
              } else if (result.kind === 'replace') {
                tr.insertText(result.text, from + result.from, from + result.to)
                tr.setSelection(TextSelection.create(tr.doc, from + result.from + result.text.length))
              } else if (from !== to && result.text.length === 2) {
                // 有选区：把选区套起来，光标落在外侧
                tr.insertText(result.text[1], to)
                tr.insertText(result.text[0], from)
                tr.setSelection(TextSelection.create(tr.doc, from + 1 + (to - from) + 1))
              } else {
                tr.insertText(result.text, from, to)
                tr.setSelection(TextSelection.create(tr.doc, from + result.caret))
              }
              // 一条 transaction 一次 dispatch：Ctrl+Z 一次撤掉这次改写
              view.dispatch(tr)
              return true
            },
          },
        }),
      ]
    },
  })
}
