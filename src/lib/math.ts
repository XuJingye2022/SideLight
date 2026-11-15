/** 一对 `$...$`，不含跨行与嵌套 */
const PAIR = /\$([^$\n]+)\$/g

/**
 * 成对 `$` 之间是否像公式：内侧不能是空白。
 * 载入（protectMathPairs）与打字（mathInput 的输入规则）共用这一条，两条路径才不会分叉。
 */
export function isMathBody(body: string): boolean {
  return !/^\s/.test(body) && !/\s$/.test(body)
}

/**
 * 数学公式按 `$…$` 解析，但「价格 $5 到 $10」也会被吃成公式。
 * 按 KaTeX 的通行规则判断：开头的 `$` 后不能是空白、结尾的 `$` 前不能是空白，
 * 不满足的成对美元符号转成 `\$`，让解析器当普通文字。
 * 反斜杠在解析阶段就被吃掉，正文里留下的是普通 `$`，写回时不会多出转义。
 */
export function protectMathPairs(markdown: string): string {
  return markdown.replace(PAIR, (match, body: string) => {
    return isMathBody(body) ? match : match.replace(/\$/g, '\\$')
  })
}

/**
 * 序列化会把公式里的反斜杠写成两个（`\frac` 变 `\\frac`），这里还原。
 * 只动公式内部，正文里的反斜杠不碰。
 */
export function repairMath(markdown: string): string {
  return markdown
    .replace(/\$\$[\s\S]*?\$\$/g, (block) => block.replace(/\\\\/g, '\\'))
    .replace(/\$[^$\n]+\$/g, (inline) => inline.replace(/\\\\/g, '\\'))
}
