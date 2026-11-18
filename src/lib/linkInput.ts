import { Extension } from '@tiptap/core'
import { Plugin, PluginKey, TextSelection, type EditorState, type Transaction } from '@tiptap/pm/state'

/**
 * 手打的行内链接（第 84 轮 B-124）。
 *
 * 病根：三枚行内语法/数学的输入规则收不到「收尾键」——`(` 会被智能配对补成 `()`，最后打 `)`
 * 走的是 `smartTyping.ts` 的 `skip` 分支，只 `setSelection`、正文不变（`docChanged=false`），
 * Tiptap 的 InputRule 因此永远看不到完整语法；保存时 `[乙](url)` 就被序列化器转义成
 * `\[乙\](url)`（只丢语义、不丢字符）。
 *
 * 做法：用 `appendTransaction` 看「光标刚跨过收尾 `)`」这一下（真插入或越过自动补的 `)` 都算），
 * 再按光标前的文本判断整段是不是一条完整的 Markdown 链接；是就把定界符删掉、内容加上 link mark，
 * 写回由 Link 扩展的 markdown 序列化补出 `[文本](目标 "标题")`（与手打字节相同）。
 *
 * 只认「手打收尾符」这一条路（粘贴、点段尾、在旧字面链接里插字都不转），所以下面把判据拆成
 * 纯函数 `typedLink`，单测直接喂「光标前文本」的前后两版，不需要编辑器 DOM。
 */

/** 光标前往回看多少字符：够长（一条链接很少超过这个量级），又不至于扫全篇 */
const MAX_LOOKBEHIND = 1024
/** 占位符：公式等 atom 在 textBetween 里占 1 个字符（与智能标点同口径） */
const ATOM = '\ufffc'

/**
 * 与 Tiptap Link 扩展的 markdown 写法同形；只认**结束在光标处**的一段。
 * `(?<!!)` 排除图片语法，目标段不许空白/括号（与 `markdownLinkInputRule` 的保守口径一致）。
 */
const LINK_TAIL = /(?<!!)\[([^\[\]\n]+)\]\(([^()\s]+)(?:\s+"([^"\n]*)")?\)$/
/** 不让 `javascript:` 这类目标变成可点链接 */
const UNSAFE_HREF = /^(?:javascript|data|vbscript):/i
/** 这些字符在链接文字里要另外转义，保守起见不自动提升（保持字面文本） */
const UNSAFE_TEXT = /[`*_<>~|$]/

export type TypedLinkInput = {
  /** 本次事务是否改了正文（真插入 `)` 为 true；越过自动补的 `)` 为 false） */
  docChanged: boolean
  /** 本次事务让光标前进了几个字符（插入长度，或越过自动补的 `)` 的 1） */
  insertedLength: number
  /** 事务前同一区间的文本；越界（光标太靠前）给 null */
  oldRangeText: string | null
  /** 事务后光标前的文本（含刚插入/跨过的那枚 `)`） */
  newRangeText: string
}

export type TypedLink = {
  /** 链接文字（不含方括号） */
  text: string
  href: string
  title: string | null
  /** 命中的整段（含 `[` `](` `)`，用来从光标位置回推起点） */
  match: string
}

/**
 * 判定「这一次手打是否刚好收尾了一条链接」。命中回内容与目标，否则 null。
 *
 * 顺序即优先级——先排除掉不可能是「手打收尾」的形状，再做正则匹配：
 * 1. 光标没前进 / 越界：点段尾、选区移动
 * 2. 光标前后同一区间没变化：纯点击
 * 3. 一次写入的字符数 ≥ 候选区长度：整段粘贴或程序化写入
 * 4. 旧区间已经是完整链接：旧文档里的字面链接不再提升，也不在它内部插字时转换
 * 5. 只认「前进 1 位」：收尾符是一枚字符
 * 6. 尾锚匹配 + 危险目标 / 需要再转义的文字
 * 7. 未改正文（越过自动配对的 `)`）时，旧文本必须恰好等于新文本去掉末位
 */
export function typedLink(input: TypedLinkInput): TypedLink | null {
  const { docChanged, insertedLength, oldRangeText, newRangeText } = input
  if (insertedLength < 1) return null
  if (oldRangeText === null) return null
  if (oldRangeText === newRangeText) return null
  if (insertedLength >= newRangeText.length) return null
  if (LINK_TAIL.test(oldRangeText)) return null
  if (insertedLength !== 1) return null
  if (!docChanged && oldRangeText.length + 1 !== newRangeText.length) return null
  const match = LINK_TAIL.exec(newRangeText)
  if (!match) return null
  const text = match[1]
  const href = match[2]
  const title = match[3] ?? null
  if (UNSAFE_HREF.test(href)) return null
  if (UNSAFE_TEXT.test(text)) return null
  if (/[<>]/.test(href)) return null
  return { text, href, title, match: match[0] }
}

/** 插件事务的标记：补丁事务不再触发本插件（一轮即停，不递归） */
const LINK_INPUT_META = 'sidelightLinkInput'
const linkInputKey = new PluginKey('sidelightLinkInput')

/** 本次事务是否「光标刚跨过收尾 `)`」，以及跨过的字符数（1）；否则 null */
function typedClosingParen(
  trs: readonly Transaction[],
  oldState: EditorState,
  newState: EditorState,
): { docChanged: boolean } | null {
  if (!trs.length) return null
  const oldSel = oldState.selection
  const newSel = newState.selection
  // 只认空选区：有选区时输入规则/智能配对走别的分支
  if (!oldSel.empty || !newSel.empty) return null
  const oldPos = oldSel.from
  const newPos = newSel.from
  if (newPos !== oldPos + 1) return null
  const docChanged = trs.some((tr) => tr.docChanged)
  const $new = newState.doc.resolve(newPos)
  if (!$new.parent.isTextblock || $new.parentOffset < 1) return null
  // 光标前那一位必须正是 `)`：插入的就是它，或越过的是自动补的那一枚
  const before = $new.parent.textBetween($new.parentOffset - 1, $new.parentOffset, null, ATOM)
  if (before !== ')') return null
  // 真插入时，事务前该位置不能已经是一个 `)`（否则是「在 ) 前面又打一个 )」，不是收尾）
  if (docChanged) {
    const $old = oldState.doc.resolve(oldPos)
    if (!$old.parent.isTextblock) return null
    const previous = $old.parentOffset > 0 ? $old.parent.textBetween($old.parentOffset - 1, $old.parentOffset, null, ATOM) : ''
    if (previous === ')') return null
  }
  return { docChanged }
}

/**
 * 插件本体：`appendTransaction` 里判形状 → 删定界符 → 加 link mark → 光标落到链接文字之后。
 * 与输入规则不同，纯选区事务（越过自动补的 `)`）也会走到这里，这正是 A1 的触发点。
 */
export function linkInputPlugin(options?: { isComposing?: () => boolean }): Plugin {
  return new Plugin({
    key: linkInputKey,
    appendTransaction(trs, oldState, newState) {
      if (trs.some((tr) => tr.getMeta(LINK_INPUT_META))) return null
      if (options?.isComposing?.()) return null
      const typed = typedClosingParen(trs, oldState, newState)
      if (!typed) return null
      const sel = newState.selection
      if (!sel.empty) return null
      const $from = sel.$from
      if (!$from.parent.isTextblock || $from.parent.type.spec.code) return null
      const code = newState.schema.marks.code
      if (code && code.isInSet($from.marks())) return null
      const link = newState.schema.marks.link
      if (!link) return null

      const offset = $from.parentOffset
      const from = Math.max(0, offset - MAX_LOOKBEHIND)
      const newRangeText = $from.parent.textBetween(from, offset, null, ATOM)
      const oldRangeText = newRangeText.length > 1 ? newRangeText.slice(0, -1) : null
      const hit = typedLink({
        docChanged: typed.docChanged,
        insertedLength: 1,
        oldRangeText,
        newRangeText,
      })
      if (!hit) return null

      const start = sel.from - hit.match.length
      if (start < $from.start() || start < 0) return null
      const contentStart = start + 1
      const contentEnd = contentStart + hit.text.length
      if (contentEnd > sel.from) return null
      // 已经是链接（或已提升过一次）：不重复处理
      if (newState.doc.rangeHasMark(contentStart, contentEnd, link)) return null

      const tr = newState.tr
      // 先删 `](url "标题")`，再删开头的 `[`：前一步不影响更靠前的偏移
      tr.delete(contentEnd, sel.from)
      tr.delete(start, contentStart)
      const caret = start + hit.text.length
      tr.addMark(start, caret, link.create({ href: hit.href, title: hit.title }))
      tr.setSelection(TextSelection.create(tr.doc, caret))
      tr.setMeta(LINK_INPUT_META, true)
      return tr
    },
  })
}

/** 注册进 schema 旁边：手打 `[文字](目标)` 收尾时自动变链接，保存字节与手打相同 */
export const LinkInput = Extension.create({
  name: 'linkInput',
  addProseMirrorPlugins() {
    return [linkInputPlugin({ isComposing: () => this.editor.view.composing })]
  },
})
