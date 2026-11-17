import { Mark } from '@tiptap/core'
import type {
  JSONContent,
  MarkdownParseHelpers,
  MarkdownRendererHelpers,
  MarkdownToken,
} from '@tiptap/core'
import type { MarkdownManager } from '@tiptap/markdown'

/**
 * 快捷行内语法（第 55 轮 B-101）：`==高亮==`、`^上标^`、`~下标~`。默认关，设置里打开。
 *
 * 三个专用 mark 一直注册在 schema 里：开关只改**解析**，不重建编辑器（重建会丢撤销栈）。
 * 解析走 marked 的行内 token（见 tilde.ts 里的一次 `use()`），序列化由 renderMarkdown 写回同样的符号。
 * 与第 47 轮的行内 HTML 白名单互不干扰：`<mark>` / `<sup>` / `<sub>` 仍归 inlineMark / inlineSup / inlineSub。
 */

export type InlineSyntaxKind = 'eqHighlight' | 'caretSup' | 'tildeSub'

type SyntaxSpec = {
  /** mark 名（也是 marked token 的类型名） */
  kind: InlineSyntaxKind
  /** 编辑器里画的类名：不用 HTML 标签名，免得与白名单抢解析 */
  className: string
  /** 序列化写回的两端（对称符号） */
  delimiter: string
  /** 从一段文本开头匹配一整条；第 1 组是要渲染的内容 */
  whole: RegExp
  /** marked 的 start 语义：入参是去掉首字符后的剩余源码，返回下一个候选起点 */
  candidate: RegExp
}

/** 清单顺序就是 marked 里的优先级顺序（见 tilde.ts），也是设置里提示的书写顺序 */
export const INLINE_SYNTAX: readonly SyntaxSpec[] = [
  { kind: 'eqHighlight', className: 'sl-eq', delimiter: '==', whole: /^==(?!=)([^=\n]+?)==(?!==)/, candidate: /==/ },
  { kind: 'caretSup', className: 'sl-sup', delimiter: '^', whole: /^\^([^\n^]+?)\^/, candidate: /\^/ },
  { kind: 'tildeSub', className: 'sl-sub', delimiter: '~', whole: /^(?<!~)~(?!~)([^\n~]+?)~(?!~)/, candidate: /(?<!~)~(?!~)/ },
]

function syntaxMark(spec: SyntaxSpec) {
  return Mark.create({
    name: spec.kind,
    // 只可能来自 markdown token；HTML 里没有这个标签（<mark> 等仍是 inlineMarks 的）
    parseHTML: () => [],
    renderHTML: () => ['span', { class: spec.className }, 0],
    markdownTokenName: spec.kind,
    parseMarkdown(token: MarkdownToken, helpers: MarkdownParseHelpers) {
      return helpers.applyMark(spec.kind, helpers.parseInline(token.tokens ?? []))
    },
    renderMarkdown(node: JSONContent, helpers: MarkdownRendererHelpers): string {
      return `${spec.delimiter}${helpers.renderChildren(node.content ?? [])}${spec.delimiter}`
    },
    // 跨节点（如夹了 <br>）时用同一对符号重新打开：写回字节仍是 ==…== / ^…^ / ~…~
    markdownOptions: { htmlReopen: { open: spec.delimiter, close: spec.delimiter } },
  })
}

/** 三个 mark：与 App 的行内 HTML mark 一次注册进 schema */
export function inlineSyntaxMarks() {
  return INLINE_SYNTAX.map(syntaxMark)
}

/**
 * 三个行内 tokenizer。开关只在 tokenize 里读：关着就是「不认这几种符号」，它们退回字面文本，
 * 与第 55 轮之前的行为一致（`==a==` / `^b^` / `~c~` 逐字节保存）。
 * marked 的 use() 对行内 tokenizer 用 unshift（后注册的排前面），所以这三个的实际顺序见 tilde.ts。
 *
 * 这里用的是 marked 的原生扩展形状（键名 `tokenizer`，不是 Tiptap 的 `tokenize`）：
 * 注册走 `manager.instance.use()`，早于 marked 自己的 del 规则，`~c~` 才抢得过删除线。
 */
type MarkedUseOptions = Parameters<MarkdownManager['instance']['use']>[0]
export type MarkedInlineTokenizer = NonNullable<MarkedUseOptions['extensions']>[number]

/** marked 的 Lexer 只需要这一个方法：把片段再切成行内 token */
type LexerLike = { inlineTokens(src: string): unknown[] }

function makeTokenizer(spec: SyntaxSpec, isEnabled: () => boolean) {
  return function tokenize(this: { lexer?: LexerLike } | undefined, src: string) {
    if (!isEnabled()) return undefined
    const match = spec.whole.exec(src)
    if (!match) return undefined
    const children = this?.lexer ? this.lexer.inlineTokens(match[1]) : []
    // 自定义 token 不在 marked 的 Tokens 联合里；解析侧只读 type / raw / tokens 三个字段
    return { type: spec.kind, raw: match[0], tokens: children } as never
  }
}

export function inlineSyntaxTokenizers(isEnabled: () => boolean): MarkedInlineTokenizer[] {
  return INLINE_SYNTAX.map(
    (spec) =>
      ({
        name: spec.kind,
        level: 'inline',
        start: (src: string): number => {
          const at = src.search(spec.candidate)
          return at < 0 ? src.length : at
        },
        tokenizer: makeTokenizer(spec, isEnabled),
      }) as MarkedInlineTokenizer,
  )
}
