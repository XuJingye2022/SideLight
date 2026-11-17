const NBSP_LINE = /^[ \t]*&nbsp;[ \t]*$/i
const FENCE_LINE = /^ {0,3}(`{3,}|~{3,})/
const isBlank = (line: string) => line.trim() === ''

/**
 * 围栏外：把「含整行 &nbsp; 的空行段」截断到第一个 &nbsp; 之前——连续空段落因此收成 1 个空段落，
 * 不再往 .md 里写 &nbsp;。段里没有空行（用户手写的 &nbsp; 段落）、围栏内、其它多空行一律不动。
 */
export function collapseBlankParagraphs(body: string): string {
  const lines = body.split('\n')
  const out: string[] = []
  let fence: string | null = null
  let index = 0
  while (index < lines.length) {
    const line = lines[index]
    const marker = FENCE_LINE.exec(line)
    if (fence) {
      out.push(line)
      if (marker && marker[1][0] === fence[0] && marker[1].length >= fence.length) fence = null
      index += 1
      continue
    }
    if (marker) {
      fence = marker[1]
      out.push(line)
      index += 1
      continue
    }
    if (isBlank(line) || NBSP_LINE.test(line)) {
      let end = index
      let hasBlank = false
      let firstNbsp = -1
      while (end < lines.length && (isBlank(lines[end]) || NBSP_LINE.test(lines[end])) && !FENCE_LINE.test(lines[end])) {
        if (isBlank(lines[end])) hasBlank = true
        if (firstNbsp < 0 && NBSP_LINE.test(lines[end])) firstNbsp = end
        end += 1
      }
      const stop = hasBlank && firstNbsp >= 0 ? firstNbsp : end
      for (let cursor = index; cursor < stop; cursor += 1) out.push(lines[cursor])
      index = end
      continue
    }
    out.push(line)
    index += 1
  }
  return out.join('\n')
}
