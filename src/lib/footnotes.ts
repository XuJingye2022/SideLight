const DEFINITION = /^\[\^[^\]]+\]:/

export type FootnoteSplit = {
  /** 去掉脚注定义之后的正文 */
  body: string
  /** 脚注定义块，原样保留，拼回时逐字节一致 */
  footnotes: string
}

function splitLines(text: string): string[] {
  return text.replace(/\r\n/g, '\n').split('\n')
}

/**
 * 把文末的脚注定义块从正文里摘出去。
 * 只有「从某一行开始到最后全是定义行（中间允许空行）」才算，正文中间的零散定义不动。
 */
export function extractFootnotes(text: string): FootnoteSplit {
  const lines = splitLines(text)
  let start = -1

  for (let index = 0; index < lines.length; index += 1) {
    if (DEFINITION.test(lines[index])) {
      start = index
      break
    }
  }

  if (start < 0) return { body: text, footnotes: '' }

  for (let index = start; index < lines.length; index += 1) {
    const line = lines[index]
    if (line.trim().length === 0) continue
    if (!DEFINITION.test(line)) return { body: text, footnotes: '' }
  }

  let bodyEnd = start
  while (bodyEnd > 0 && lines[bodyEnd - 1].trim().length === 0) bodyEnd -= 1

  return {
    body: lines.slice(0, bodyEnd).join('\n'),
    footnotes: lines.slice(start).join('\n'),
  }
}

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
