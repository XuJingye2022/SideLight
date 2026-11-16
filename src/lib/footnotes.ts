const DEF = /^\[\^[^\]]+\]:/
const REF = /^\[[^\]]+\]:/
const CONT = /^(?: {4,}|\t)\S/

export type FootnoteBlock = {
  /** `footnote` 是 `[^id]:` 定义，`ref` 是 `[label]:` 引用式链接定义 */
  kind: 'footnote' | 'ref'
  /** 块原文（含续行），不 trim，拼回时逐字节保留 */
  text: string
  /** 与上一块之间的空行数；第一块是正文与脚注块之间的空行数 */
  gapBefore: number
}

export type FootnoteSplit = {
  /** 去掉脚注定义之后的正文 */
  body: string
  /** 脚注定义块，原样保留，拼回时逐字节一致 */
  footnotes: string
  /** 结构化视图：脚注与引用定义按原序分块 */
  blocks: FootnoteBlock[]
}

const linesOf = (text: string): string[] => text.replace(/\r\n/g, '\n').split('\n')

/** 从 `start` 起解析尾部块组；出现非定义、非续行的内容就返回 null。 */
function parseBlocks(lines: string[], start: number): FootnoteBlock[] | null {
  const blocks: FootnoteBlock[] = []
  let gap = 0
  for (let index = start; index < lines.length; index += 1) {
    const line = lines[index]
    if (line.trim().length === 0) {
      gap += 1
      continue
    }
    const kind: FootnoteBlock['kind'] | null = DEF.test(line)
      ? 'footnote'
      : REF.test(line)
        ? 'ref'
        : null
    if (kind) {
      blocks.push({ kind, text: line, gapBefore: gap })
      gap = 0
      continue
    }
    if (blocks.length === 0 || !CONT.test(line)) return null
    const block = blocks[blocks.length - 1]
    if (gap > 0) {
      // 块内空行：续行前的空行属于这一块，不能丢
      block.text += '\n'.repeat(gap)
      gap = 0
    }
    block.text += `\n${line}`
  }
  return blocks.length > 0 ? blocks : null
}

/**
 * 把文末的脚注定义块从正文里摘出去。
 * 尾部可以同时有 `[^id]:` 脚注定义与 `[label]:` 引用式链接定义；
 * 脚注块内允许 2+ 空格或 tab 开头的续行。正文中间的零散定义不动。
 */
export function extractFootnotes(text: string): FootnoteSplit {
  const lines = linesOf(text)
  for (let start = 0; start < lines.length; start += 1) {
    if (!DEF.test(lines[start])) continue
    const blocks = parseBlocks(lines, start)
    if (!blocks) continue
    let bodyEnd = start
    while (bodyEnd > 0 && lines[bodyEnd - 1].trim().length === 0) bodyEnd -= 1
    return { body: lines.slice(0, bodyEnd).join('\n'), footnotes: lines.slice(start).join('\n'), blocks }
  }
  return { body: text, footnotes: '', blocks: [] }
}

/** 拼回：正文与脚注块之间空一行；脚注块原样附在末尾（块内空行、块间空行都保留）。 */
export function joinFootnotes(body: string, footnotes: string): string {
  if (footnotes.trim().length === 0) return body
  return `${body.replace(/\s+$/, '')}\n\n${footnotes}`
}

/**
 * 编辑器会把行内的 [^1] 序列化成 \[^1\]，这里把脚注引用还原。
 * 只处理「[^」开头的方括号，不碰其它转义。
 */
export function repairFootnoteRefs(markdown: string): string {
  return markdown.replace(/\\\[(\^[^\\\]]+)\\\]/g, '[$1]')
}
