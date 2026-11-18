import { Mark, markInputRule, markPasteRule } from '@tiptap/core'
import type {
  JSONContent,
  MarkdownParseHelpers,
  MarkdownRendererHelpers,
  MarkdownToken,
} from '@tiptap/core'
import type { MarkdownManager } from '@tiptap/markdown'

/**
 * 快捷行内语法（第 55 轮 B-101）：`==高亮==`、`^上标^`、`~下标~`。第 75 轮起默认开，设置里可关
 * （开是 Typora 的习惯；旧存档里那个 false 在 settings.ts 一次性迁移，见 B-158）。
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
  /**
   * 从一段文本开头匹配一整条；第 1 组是要渲染的内容。
   * 第 56 轮 B-119 加 flanking：开定界符后不贴空白、收定界符前不贴空白（`== a ==` 不再解析）。
   * 左邻判定做不了：marked 传进来的就是候选位起的剩余串，位置 0 之前没有字符可看。
   */
  whole: RegExp
  /** marked 的 start 语义：入参是去掉首字符后的剩余源码，返回下一个候选起点 */
  candidate: RegExp
  /**
   * 输入规则用的尾锚定模板（第 84 轮 B-214）：收到的是「光标前的整段文本」，只有匹配正好
   * 结束在光标处才算手打完成。左邻守卫用负向后顾（`\` 与同类符号都不算开定界符），
   * `~` 还要 `(?!~)`/`(?<!~)`，把 `~~删除线~~` 留给 Strike。
   * 第 1 组是内容；`markInputRule` 删掉两端定界符，写回由 renderMarkdown 补。
   */
  typed: RegExp
  /**
   * 粘贴规则用的全局形状（第 86 轮 B-215）：守卫与 `typed` 同一套，但**不**尾锚定——
   * 一次粘贴里可能有多对（`==a== 与 ==b==`），`pasteMatches` 用 `matchAll` 逐对取，
   * 每对都回 `{index,text,replaceWith}` 交给 tiptap 的 `markPasteRule`。
   * 这里只存源串、不带 `g`，调用时新建（不留 `lastIndex` 状态）。
   */
  pasted: RegExp
  /**
   * 连续符号段守卫：候选位同符号连续 ≥N 个时整段按字面吃（`====` 的第三、四个 `=` 不再当开定界符）。
   * `~` 不守：`~~…~~` 是删除线，必须留给 marked 的 del 规则。
   */
  literalRun: RegExp | null
}

/** 清单顺序就是 marked 里的优先级顺序（见 tilde.ts），也是设置里提示的书写顺序 */
export const INLINE_SYNTAX: readonly SyntaxSpec[] = [
  {
    kind: 'eqHighlight',
    className: 'sl-eq',
    delimiter: '==',
    whole: /^==(?![=\s])([^\n=]+?)(?<!\s)==(?!==)/,
    candidate: /==/,
    typed: /(?<![\\=])==(?![=\s])([^=\n]+?)(?<!\s)==$/,
    pasted: /(?<![\\=])==(?![=\s])([^=\n]+?)(?<!\s)==/,
    literalRun: /^={3,}/,
  },
  {
    kind: 'caretSup',
    className: 'sl-sup',
    delimiter: '^',
    whole: /^\^(?![\s^])([^\n^]+?)(?<!\s)\^/,
    candidate: /\^/,
    typed: /(?<![\\^])\^(?![\s^])([^\n^]+?)(?<!\s)\^$/,
    pasted: /(?<![\\^])\^(?![\s^])([^\n^]+?)(?<!\s)\^/,
    literalRun: /^\^{2,}/,
  },
  {
    kind: 'tildeSub',
    className: 'sl-sub',
    delimiter: '~',
    whole: /^(?<!~)~(?![\s~])([^\n~]+?)(?<!\s)~(?!~)/,
    candidate: /(?<!~)~(?!~)/,
    typed: /(?<!~)~(?![\s~])([^\n~]+?)(?<!\s)~(?!~)$/,
    pasted: /(?<!~)~(?![\s~])([^\n~]+?)(?<!\s)~(?!~)/,
    literalRun: null,
  },
]

/** 转义用的 `\=`：不是快捷语法，开关关着也要认（字节保真），所以单独一个 mark */
let escapeSlot = 0

/**
 * `\=` 的字节保真 mark（第 83 轮 A2）。marked 的 escape 规则会把 `\=` 吃成 `=`，
 * 保存时反斜杠就丢了。这里在 marked 的 escape 规则之前接住 `\=`，正文里仍是 `=`，
 * 序列化时每枚 mark 补回一枚 `\`。
 *
 * `slot` 属性必须留：相邻两枚 `\=`（`\=\=`）在 Fragment 里会并成一个文本节点，
 * 两枚 mark 也就并成一份，写回只剩一枚反斜杠（planner 探针实测）。slot 让两份 mark 不相等，
 * 各占一个文本节点，`renderMarkdown` 才各补一枚。属性本身不落盘、也不进 DOM。
 */
const EqEscaped = Mark.create({
  name: 'eqEscaped',
  inclusive: false,
  addAttributes: () => ({ slot: { default: 0, parseHTML: () => null, renderHTML: () => null } }),
  // 只可能来自 markdown token：粘贴 HTML 里没有这个标签（已知残余：复制 `\=` 再粘回会丢反斜杠）
  parseHTML: () => [],
  renderHTML: () => ['span', { class: 'sl-eq-escaped' }, 0],
  markdownTokenName: 'eqEscaped',
  parseMarkdown(token: MarkdownToken, helpers: MarkdownParseHelpers) {
    return helpers.applyMark('eqEscaped', helpers.parseInline(token.tokens ?? []), { slot: ++escapeSlot })
  },
  renderMarkdown(node: JSONContent, helpers: MarkdownRendererHelpers): string {
    return `\\${helpers.renderChildren(node.content ?? [])}`
  },
})

function syntaxMark(spec: SyntaxSpec, isEnabled: () => boolean) {
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
    /**
     * 手打也生效（第 84 轮 B-214）：此前三个 mark 只有 parseMarkdown，手打的 `==红==` 要等重开
     * 文档才渲染（真机 .sl-eq 0/0/0）。输入规则与解析共用同一个开关闸门：设置关着就保持字面。
     */
    addInputRules() {
      return [
        markInputRule({
          find: (text: string) => (isEnabled() ? typedMatch(spec.kind, text) : null),
          type: this.type,
        }),
      ]
    },
    /**
     * 粘贴也生效（第 86 轮 B-215）：手打有输入规则，粘贴却是「整段文字一次性落进文档」，
     * 输入规则不跑，`==红==` 只能等重开文档才渲染。这里给同一枚 mark 挂 tiptap 的粘贴规则：
     * 一次粘贴里的**每一对**都加 mark，定界符删掉（写回由 renderMarkdown 补同一对符号）。
     *
     * 围栏代码块：`run` 在 `node.type.spec.code` 处 return，块内文本节点 `contentSize` 是 0
     * （`0 ?? nodeSize` 仍是 0）也会提前 return —— 不匹配，字面保留。
     * 行内代码：`markPasteRule` 自身会查 `getMarksBetween` 里 excluded 的 code mark，命中即 return null
     * （不删字符、不加 mark）。
     * 编辑器内部复制粘贴（HTML 带 `data-pm-slice`）整条规则不跑，这是 tiptap 的既有语义。
     */
    addPasteRules() {
      return [
        markPasteRule({
          find: (text: string) => (isEnabled() ? pasteMatches(spec.kind, text) : []),
          type: this.type,
        }),
      ]
    },
  })
}

/**
 * 输入规则的判定（纯函数，单测直接喂「光标前的文本」）：只认**正好结束在光标处**的一段。
 * 命中回 `{index, text, replaceWith}`：`index` 是这段在入参里的起点，`text` 是整段（含定界符），
 * `replaceWith` 是内容——Tiptap 的 `markInputRule` 拿它算内容区间，缺了它整条规则空转
 * （`match[match.length - 1]` 是 undefined）。内容一定是 `text` 的子串，不会触发 tiptap 的 warn。
 */
export function typedMatch(
  kind: InlineSyntaxKind,
  text: string,
): { index: number; text: string; replaceWith: string } | null {
  const spec = INLINE_SYNTAX.find((item) => item.kind === kind)
  if (!spec) return null
  const match = spec.typed.exec(text)
  if (!match || match.index === undefined) return null
  return { index: match.index, text: match[0], replaceWith: match[1] }
}

/**
 * 粘贴规则的判定（纯函数）：入参是「这次粘贴落进文档的那段文字」，返回**全部**不重叠的命中。
 * 与 `typedMatch` 共用守卫（不贴空白、`\` 与同类符号不算开定界符、`~~` 留给删除线），
 * 区别只在不尾锚定，所以一行里有多对时每对都出；`index` 是每对在入参里的起点。
 *
 * 每次调用新建 `g` 正则：同一个 `pasted` 源串反复用不会留 `lastIndex` 状态。
 */
export function pasteMatches(
  kind: InlineSyntaxKind,
  text: string,
): Array<{ index: number; text: string; replaceWith: string }> {
  const spec = INLINE_SYNTAX.find((item) => item.kind === kind)
  if (!spec) return []
  const pattern = new RegExp(spec.pasted.source, 'g')
  const out: Array<{ index: number; text: string; replaceWith: string }> = []
  let match: RegExpExecArray | null
  while ((match = pattern.exec(text)) !== null) {
    // 内容组一定有 ≥1 字（正则里是 `+?`），零长度只是防御：不前进就会死循环
    if (match[0].length === 0) {
      pattern.lastIndex += 1
      continue
    }
    out.push({ index: match.index, text: match[0], replaceWith: match[1] })
  }
  return out
}

/** 三个 mark + 转义用的 eqEscaped：与 App 的行内 HTML mark 一次注册进 schema */
export function inlineSyntaxMarks(isEnabled: () => boolean = () => true) {
  return [...INLINE_SYNTAX.map((spec) => syntaxMark(spec, isEnabled)), EqEscaped]
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
    // 连续符号段整段按字面吃：raw 与 text 都要给，只给 raw 会被解析侧当空文本吞掉
    const run = spec.literalRun?.exec(src)
    if (run) return { type: 'text', raw: run[0], text: run[0] } as never
    const match = spec.whole.exec(src)
    if (!match) return undefined
    const children = this?.lexer ? this.lexer.inlineTokens(match[1]) : []
    // 自定义 token 不在 marked 的 Tokens 联合里；解析侧只读 type / raw / tokens 三个字段
    return { type: spec.kind, raw: match[0], tokens: children } as never
  }
}

/** marked 的行内扩展：只在 `\=` 处起手，吃掉两个字符，内容是一个普通 `=`。不随开关关（字节保真） */
const EQ_ESCAPED_TOKENIZER = {
  name: 'eqEscaped',
  level: 'inline',
  start: (src: string): number => {
    const at = src.search(/\\=/)
    return at < 0 ? src.length : at
  },
  tokenizer(src: string) {
    if (!/^\\=/.test(src)) return undefined
    // raw 给全两个字符，text 只给 `=`：反斜杠不进正文，序列化时由 renderMarkdown 补回
    return { type: 'eqEscaped', raw: '\\=', tokens: [{ type: 'text', raw: '=', text: '=' }] } as never
  },
} as MarkedInlineTokenizer

export function inlineSyntaxTokenizers(isEnabled: () => boolean): MarkedInlineTokenizer[] {
  return [
    ...INLINE_SYNTAX.map(
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
    ),
    EQ_ESCAPED_TOKENIZER,
  ]
}
