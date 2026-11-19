import { Extension } from '@tiptap/core'
import { closeHistory, isHistoryTransaction } from '@tiptap/pm/history'
import type { MarkType } from '@tiptap/pm/model'
import { Plugin, PluginKey, TextSelection, type EditorState, type Transaction } from '@tiptap/pm/state'
import { ReplaceAroundStep, ReplaceStep } from '@tiptap/pm/transform'

import { pasteMatches, type InlineSyntaxKind } from './inlineSyntax.ts'
import { isMathBody } from './math.ts'
import { mathInputSelection } from './mathInput.ts'
import { isMathEditing } from './mathNodeView.ts'
import { inTableAncestry } from './tableScope.ts'

/**
 * 已存定界符对后填（第 93 轮 B1，用户缺陷 2）。
 *
 * 病根：三枚数学/行内语法的输入规则都要求「整条语法正好结束在光标处」（`mathInput.ts:111`
 * 的 `\$([^$\n]+)\$$`、`inlineSyntax.ts:65` 的 `typed` 尾锚定）。可用户更常见的写法是
 * **先把一对定界符打好，再回头往中间填内容**：`$$` → `←` → `E=mc^2` → `→`。这时收尾符
 * 一直在光标**后面**，输入规则永远看不到完整语法，正文就留成字面 `$E=mc^2$`。
 *
 * 做法与 `linkInput.ts` 同形（`appendTransaction` + 纯判定函数）：插件记下「本次打字碰过、
 * 且现在正好是一对定界符」的区间（armed），等三个离开时机之一到来再把定界符收成
 * atom / mark：
 * - 光标离开（→/End/点击到区间外）：纯选区事务，`docChanged=false`；
 * - Enter：`props.handleKeyDown`，空内容不提交（`$$` + Enter 仍归 `MathInputRules`）；
 * - 焦点离开编辑器：`spec.view` 挂 `<div contenteditable>` 的 blur。
 *
 * 打字中一律不提交，否则每敲一个字就重建节点、光标乱跳。
 *
 * armed 是必须的：文档里本来就有字面 `$x$`（转义写坏的旧稿）时，用户只是点进去看一眼、
 * 随手按方向键，不该被悄悄改写成公式。只有「这一次编辑确实插在它上面」的定界符对才算数
 * （载入文档的 `addToHistory:false` 事务、粘贴/拖入都不 arm）。
 *
 * 收尾事务要单独成一步撤销：离开出口的收尾由 `appendTransaction` 返回，而
 * `prosemirror-history` 的 `newGroup` 判据是 `prevTime == 0 || (!appended && …)`——补丁事务的
 * `appended` 为真，不 `closeHistory` 就永远并进上一段打字，一次 `Ctrl+Z` 会把刚打的字一起撤光。
 * 三个出口一律 `closeHistory`（与 `App.tsx` 的粘贴撤回同法），撤销只回退「定界符 → 公式 / mark」这一下。
 * 撤销 / 重做本身不 arm：它把公式还原成字面定界符，按「插入即 arm」会立刻重新武装，
 * App 下一条装饰事务就会把它又收回去（真机上看着像「Ctrl+Z 没反应」）。
 */

/** 本次编辑碰过的定界符对区间（doc 位置，`to` 是收尾定界符之后） */
export type ArmedRange = { from: number; to: number }

export type DelimiterPairKind = 'inlineMath' | 'blockMath' | InlineSyntaxKind

/** 一对完整的定界符（位置都是 doc 位置） */
export type DelimiterPair = {
  kind: DelimiterPairKind
  /** 开定界符的第一个字符 */
  from: number
  /** 收尾定界符之后一位 */
  to: number
  /** 内容起点（开定界符之后） */
  contentFrom: number
  /** 内容终点（收尾定界符之前） */
  contentTo: number
  /** 定界符之间的文本；块级公式已去掉两端空白 */
  content: string
}

export type CommitTrigger = 'leave' | 'enter' | 'blur'

export type CollectOptions = {
  /** 快捷行内语法开关（`==` / `^` / `~`）；关着只认公式，与输入规则同一条闸门 */
  inlineSyntax?: boolean
}

/** 行内 atom / 硬换行在 `textBetween` 里占 1 个字符：位置换算才对得上 */
const ATOM = '\ufffc'
/** 文本块超过这么多字符就不扫：正常人不会把一整段写成 20 万字，值也不值当 */
const MAX_PARAGRAPH_CHARS = 200_000
/** armed 上限：一段里不可能同时有几十对在等你回头填内容 */
const MAX_ARMED = 64
/** 收尾 `$` 不能是转义的 `\$`；连续 `$$` 单独按块级口径看 */
const DOLLAR_RUN = /(?<!\\)\$+/g
/** 整段只有一对 `$$…$$` 才是块级公式（与 `mathInput.ts:128` 的输入规则同一条口径） */
const BLOCK_MATH = /^\s*\$\$([\s\S]+?)\$\$\s*$/
/** `==` / `^` / `~` 三类：名字与 `inlineSyntax.ts` 的 mark 名一致 */
const SYNTAX_KINDS: readonly InlineSyntaxKind[] = ['eqHighlight', 'caretSup', 'tildeSub']

/** 这段文字里全部已成对的定界符；`offset` 是这段文字在文档里的起点 */
export function collectPairs(text: string, offset = 0, options: CollectOptions = {}): DelimiterPair[] {
  const out: DelimiterPair[] = []
  const inlineSyntax = options.inlineSyntax !== false

  // 块级公式：整段只有 `$$…$$`（含前后空白）。命中即整段一对，不再看行内
  const block = BLOCK_MATH.exec(text)
  if (block) {
    const lead = text.length - text.trimStart().length
    const end = text.trimEnd().length
    const content = text.slice(lead + 2, end - 2)
    if (content.trim()) {
      out.push({
        kind: 'blockMath',
        from: offset + lead,
        to: offset + end,
        contentFrom: offset + lead + 2,
        contentTo: offset + end - 2,
        content: content.trim(),
      })
    }
    return out
  }

  // 行内公式：只认单 `$` 对。`(?<!\\)` 已跳过 `\$`；`$$`/`$$$` 这种连续段不当定界符
  let open: number | null = null
  for (const run of text.matchAll(DOLLAR_RUN)) {
    const index = run.index ?? 0
    if (run[0].length !== 1) {
      open = null
      continue
    }
    if (open === null) {
      open = index
      continue
    }
    const content = text.slice(open + 1, index)
    // 与 MathInputRules 同一套口径：空内容、跨行、内侧贴空白、夹 atom 都不算公式
    const ok =
      content.length > 0 && !content.includes('\n') && !content.includes(ATOM) && isMathBody(content)
    if (!ok) {
      open = index
      continue
    }
    out.push({
      kind: 'inlineMath',
      from: offset + open,
      to: offset + index + 1,
      contentFrom: offset + open + 1,
      contentTo: offset + index,
      content,
    })
    open = null
  }

  // `==` / `^` / `~`：守卫与粘贴规则共用一个纯函数，开关关着就整类跳过
  if (inlineSyntax) {
    for (const kind of SYNTAX_KINDS) {
      for (const match of pasteMatches(kind, text)) {
        const span = match.text.length - match.replaceWith.length
        if (span <= 0 || span % 2 !== 0) continue
        const half = span / 2
        const from = offset + match.index
        out.push({
          kind,
          from,
          to: from + match.text.length,
          contentFrom: from + half,
          contentTo: from + match.text.length - half,
          content: match.replaceWith,
        })
      }
    }
  }

  out.sort((a, b) => a.from - b.from || a.to - b.to)
  return out
}

/**
 * 该提交哪一对（纯函数，单测直接喂三样东西）。
 *
 * - 只认 armed（这一次编辑碰过的）区间，位置必须完全一致；
 * - 空内容不提交：`$$` 加回车是「建空块级公式」，归 `MathInputRules` 的 Enter；
 * - `leave`（光标离开）：必须是纯选区事务、光标在区间外、且与区间距离 ≤1；
 * - `enter` / `blur`：光标在**内容区间**内才算数（收尾定界符前后都不算）。
 * 多条命中取离光标最近的那条。
 */
export function commitPair(
  pairs: readonly DelimiterPair[],
  armed: readonly ArmedRange[],
  caret: number,
  options: { trigger: CommitTrigger; docChanged?: boolean },
): DelimiterPair | null {
  let best: DelimiterPair | null = null
  let bestDistance = Number.POSITIVE_INFINITY
  for (const pair of pairs) {
    if (!pair.content.trim()) continue
    if (!armed.some((range) => range.from === pair.from && range.to === pair.to)) continue
    let distance: number
    if (options.trigger === 'leave') {
      if (options.docChanged) continue
      const inside = caret > pair.from && caret < pair.to
      if (inside) continue
      distance = caret <= pair.from ? pair.from - caret : caret - pair.to
      if (distance > 1) continue
    } else {
      if (caret < pair.contentFrom || caret > pair.contentTo) continue
      distance = 0
    }
    if (distance < bestDistance) {
      best = pair
      bestDistance = distance
    }
  }
  return best
}

/** 补丁事务的标记：本插件自己发出的收尾事务不再触发判定（一轮即停，不递归） */
const PAIR_META = 'sidelightDelimiterPair'

type PairState = { armed: ArmedRange[] }

const EMPTY_STATE: PairState = { armed: [] }

/** 当前光标所在文本块里全部已成对的定界符（含代码守卫） */
function pairsInState(state: EditorState, inlineSyntax: () => boolean): DelimiterPair[] {
  const selection = state.selection
  if (!selection.empty) return []
  const $from = selection.$from
  const parent = $from.parent
  if (!parent.isTextblock || parent.type.spec.code) return []
  if (parent.content.size > MAX_PARAGRAPH_CHARS) return []
  const code = state.schema.marks.code
  if (code && code.isInSet($from.marks())) return []
  const text = parent.textBetween(0, parent.content.size, null, ATOM)
  const pairs = collectPairs(text, $from.start(), { inlineSyntax: inlineSyntax() })
  // 行内代码里的定界符不是语法（与 `MathInputRules` 的 code 口径一致）。只看光标上的 mark 不够：
  // 光标一旦挪到代码片段外一位（`→` 离开），`$from.marks()` 就空了，代码里的 `$x$` 会被收成公式。
  if (!code) return pairs
  return pairs.filter((pair) => pair.to - pair.from <= 1 || !state.doc.rangeHasMark(pair.from, pair.to, code))
}

/** 这次事务插入的区间（映射到最终文档）：「赋值即打字碰过」判据 */
function insertedRanges(tr: Transaction): ArmedRange[] {
  const ranges: ArmedRange[] = []
  tr.steps.forEach((step, index) => {
    if (!(step instanceof ReplaceStep) && !(step instanceof ReplaceAroundStep)) return
    const slice = step.slice
    if (!slice || slice.size === 0) return
    const rest = tr.mapping.slice(index + 1)
    const start = rest.map(step.from, 1)
    const end = rest.map(step.from + slice.size, -1)
    ranges.push(start <= end ? { from: start, to: end } : { from: end, to: start })
  })
  return ranges
}

const sameRange = (range: ArmedRange, pairs: readonly DelimiterPair[]): boolean =>
  pairs.some((pair) => pair.from === range.from && pair.to === range.to)

/** 把 armed 区间按事务映射到新文档；塌成一点或反序的丢掉 */
function mapArmed(tr: Transaction, armed: readonly ArmedRange[]): ArmedRange[] {
  return armed
    .map((range) => ({ from: tr.mapping.map(range.from, 1), to: tr.mapping.map(range.to, -1) }))
    .filter((range) => range.to - range.from > 1)
}

/** 插件状态推进：先映射旧区间，再按「这次打字碰过」arm，最后只留与现文档重合的项 */
function nextArmed(
  tr: Transaction,
  value: PairState,
  newState: EditorState,
  inlineSyntax: () => boolean,
): PairState {
  const patch = tr.getMeta(PAIR_META) as ArmedRange | undefined
  if (patch) {
    return { armed: value.armed.filter((range) => range.from !== patch.from || range.to !== patch.to) }
  }
  // 撤销 / 重做事务只按位置映射已有的 armed，不按「插入即 arm」重新武装：撤销把公式还原成
  // 字面 `$…$`，若在这里 arm，紧接着 App 派发的纯选区装饰事务（`addToHistory:false`，
  // `decorations.ts:40`）就会把它又收成公式 —— 真机上表现为「一次 Ctrl+Z 没反应」。
  if (isHistoryTransaction(tr)) return { armed: mapArmed(tr, value.armed) }
  // 载入 / 整篇替换不进撤销栈：文档里原有的定界符对不算「这次编辑碰过」。
  // 只认真改了正文的（`docChanged`）—— App 每次渲染都会用 `addToHistory:false` 派发
  // 纯选区装饰事务（`src/lib/decorations.ts`），那种不能把 armed 清掉。
  if (tr.getMeta('addToHistory') === false) return tr.docChanged ? EMPTY_STATE : value
  if (!tr.docChanged) {
    if (!value.armed.length) return value
    const mapped = mapArmed(tr, value.armed)
    const stable =
      mapped.length === value.armed.length &&
      mapped.every((range, index) => range.from === value.armed[index].from && range.to === value.armed[index].to)
    return stable ? value : { armed: mapped }
  }

  const pairs = pairsInState(newState, inlineSyntax)
  const kept = mapArmed(tr, value.armed).filter((range) => sameRange(range, pairs))
  // 粘贴/拖入的整段文字不 arm：那是「一次落下」，不是回头填内容
  const uiEvent = tr.getMeta('uiEvent')
  if (uiEvent === 'paste' || uiEvent === 'drop') return { armed: kept.slice(0, MAX_ARMED) }

  const inserted = insertedRanges(tr)
  if (!inserted.length) return { armed: kept }
  const next = [...kept]
  for (const pair of pairs) {
    if (next.some((range) => range.from === pair.from && range.to === pair.to)) continue
    // 区间相交（含贴边）：打字把这对定界符补齐时，插入区间正好落在两枚定界符之间
    if (!inserted.some((range) => range.from <= pair.to && pair.from <= range.to)) continue
    next.push({ from: pair.from, to: pair.to })
  }
  return { armed: next.slice(0, MAX_ARMED) }
}

/**
 * 收尾事务的公共收口：打补丁标记（一轮即停，不递归）+ 切断历史分组。
 * 不切断的话，离开出口的补丁事务会被 prosemirror-history 并进上一段打字（见文件头注释）。
 */
function closePairHistory(tr: Transaction, pair: DelimiterPair): Transaction {
  tr.setMeta(PAIR_META, { from: pair.from, to: pair.to })
  return closeHistory(tr)
}

/**
 * 把一对定界符收成 atom / mark 的事务。
 * 公式走 `mathInputSelection`（不选中 atom，`mathReveal` 才不会继续露 `$…$`）；
 * mark 类先删后侧定界符再删前侧，光标落在内容末尾。
 */
export function buildPairTransaction(state: EditorState, pair: DelimiterPair): Transaction | null {
  const length = pair.contentTo - pair.contentFrom
  if (length <= 0) return null
  if (pair.kind === 'inlineMath') {
    const type = state.schema.nodes.inlineMath
    if (!type) return null
    const tr = state.tr.replaceWith(pair.from, pair.to, type.create({ latex: pair.content }))
    tr.setSelection(mathInputSelection(tr.doc, pair.from))
    return closePairHistory(tr, pair)
  }
  if (pair.kind === 'blockMath') {
    const type = state.schema.nodes.blockMath
    if (!type) return null
    const $pos = state.doc.resolve(pair.from)
    if (!$pos.parent.isTextblock) return null
    // 块级公式是块节点，Markdown 表格单元格装不进去（与 `MathInputRules` 同一条守卫）
    const names: string[] = []
    for (let depth = $pos.depth; depth > 0; depth -= 1) names.push($pos.node(depth).type.name)
    if (inTableAncestry(names)) return null
    // 整段换成块级公式：段落位置 = 内容起点前一位
    const start = $pos.start($pos.depth) - 1
    const tr = state.tr.replaceWith(start, start + $pos.parent.nodeSize, type.create({ latex: pair.content }))
    tr.setSelection(mathInputSelection(tr.doc, start, 1))
    return closePairHistory(tr, pair)
  }
  const mark = (state.schema.marks as Record<string, MarkType | undefined>)[pair.kind]
  if (!mark) return null
  const tr = state.tr
  tr.delete(pair.contentTo, pair.to)
  tr.delete(pair.from, pair.contentFrom)
  const caret = pair.from + length
  tr.addMark(pair.from, caret, mark.create())
  tr.setSelection(TextSelection.create(tr.doc, caret))
  return closePairHistory(tr, pair)
}

export type DelimiterPairPluginOptions = {
  inlineSyntax?: () => boolean
  isComposing?: () => boolean
}

const delimiterPairKey = new PluginKey<PairState>('sidelightDelimiterPair')

/** 插件本体：`state.apply` 维护 armed；三个离开时机各走一条出口 */
export function delimiterPairPlugin(options: DelimiterPairPluginOptions = {}): Plugin<PairState> {
  const inlineSyntax = () => options.inlineSyntax?.() ?? true
  const blocked = () => options.isComposing?.() === true || isMathEditing()

  /**
   * 三个出口共用的收口：判 → 建事务 → 交给调用方决定怎么 dispatch。
   * 返回 null = 没有可提交的对，调用方保持原行为。
   */
  const resolve = (state: EditorState, trigger: CommitTrigger, docChanged: boolean): Transaction | null => {
    if (blocked()) return null
    const armed = delimiterPairKey.getState(state)?.armed ?? []
    if (!armed.length) return null
    const pairs = pairsInState(state, inlineSyntax)
    if (!pairs.length) return null
    const hit = commitPair(pairs, armed, state.selection.from, { trigger, docChanged })
    if (!hit) return null
    return buildPairTransaction(state, hit)
  }

  return new Plugin<PairState>({
    key: delimiterPairKey,
    state: {
      init: () => EMPTY_STATE,
      apply: (tr, value, _oldState, newState) => nextArmed(tr, value, newState, inlineSyntax),
    },
    props: {
      handleKeyDown: (view, event) => {
        if (event.key !== 'Enter' || event.shiftKey || event.altKey || event.ctrlKey || event.metaKey) return false
        if (event.isComposing || options.isComposing?.()) return false
        const tr = resolve(view.state, 'enter', false)
        // 放行 Enter：空内容那一下仍要交给 `MathInputRules`（`$$` + 回车建空块级公式）
        if (tr) view.dispatch(tr)
        return false
      },
    },
    appendTransaction: (trs, _oldState, newState) => {
      if (!trs.length) return null
      // 补丁事务不再进判定（P2-1②）：一次编辑只处理一对，避免连锁
      if (trs.some((tr) => tr.getMeta('appendedTransaction') || tr.getMeta(PAIR_META))) return null
      if (!newState.selection.empty) return null
      const docChanged = trs.some((tr) => tr.docChanged)
      if (docChanged) return null
      return resolve(newState, 'leave', false)
    },
    view: (editorView) => {
      let destroyed = false
      const onBlur = () => {
        if (destroyed) return
        const tr = resolve(editorView.state, 'blur', false)
        if (tr) editorView.dispatch(tr)
      }
      editorView.dom.addEventListener('blur', onBlur)
      return {
        destroy: () => {
          destroyed = true
          editorView.dom.removeEventListener('blur', onBlur)
        },
      }
    },
  })
}

/** 注册进 schema 旁边：已存的一对定界符，回头填好内容再离开就收成公式 / 行内语法 */
export const DelimiterPair = Extension.create<DelimiterPairPluginOptions>({
  name: 'delimiterPair',
  addOptions() {
    return { inlineSyntax: undefined, isComposing: undefined }
  },
  addProseMirrorPlugins() {
    return [
      delimiterPairPlugin({
        inlineSyntax: this.options.inlineSyntax,
        isComposing: () => this.editor.view.composing,
      }),
    ]
  },
})
