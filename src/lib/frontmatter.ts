export type SplitResult = {
  /** 原文开头的 frontmatter，含两行分隔符与结尾换行；没有时为空串 */
  frontmatter: string
  /** 两行分隔符之后的内容；没有 frontmatter 时就是原文 */
  body: string
}

const BOM = '\uFEFF'

/** 分隔符行：单独一行 ---，行尾允许空白 */
const DELIMITER = /^---[ \t]*$/

type Line = {
  /** 行内容，不含换行符 */
  text: string
  /** 下一行的起点 */
  next: number
}

/** 读从 start 开始的一行，支持 \n 与 \r\n */
function readLine(text: string, start: number): Line | null {
  if (start >= text.length) return null
  const breakAt = text.indexOf('\n', start)
  if (breakAt < 0) return { text: text.slice(start), next: text.length }
  const end = breakAt > start && text[breakAt - 1] === '\r' ? breakAt - 1 : breakAt
  return { text: text.slice(start, end), next: breakAt + 1 }
}

function newlineOf(text: string): string {
  return text.includes('\r\n') ? '\r\n' : '\n'
}

/**
 * 从文件开头拆出 YAML frontmatter。
 * 只认位置 0（BOM 之后仍算开头）：第一行必须是单独一行 ---，后面第一处单独一行 --- 就是结束。
 * frontmatter 保留原字节（含 BOM、两行分隔符与结尾换行），拼回时不改变文件。
 * 找不到合法 frontmatter 时原样返回，body 含 BOM。
 */
export function splitFrontmatter(text: string): SplitResult {
  const start = text.startsWith(BOM) ? BOM.length : 0
  const first = readLine(text, start)
  if (first === null || !DELIMITER.test(first.text)) return { frontmatter: '', body: text }

  let index = first.next
  while (index < text.length) {
    const line = readLine(text, index)
    if (line === null) break
    if (DELIMITER.test(line.text)) {
      return { frontmatter: text.slice(0, line.next), body: text.slice(line.next) }
    }
    index = line.next
  }

  return { frontmatter: '', body: text }
}

/**
 * 正文开头连续换行（空行）的个数。独立函数：不改 SplitResult，避免既有 deepEqual 断言全红。
 */
export function leadingNewlines(text: string): number {
  const match = /^(?:\r?\n)+/.exec(text)
  return match ? (match[0].match(/\n/g)?.length ?? 0) : 0
}

/**
 * 把 frontmatter 与正文拼回完整文本，与 splitFrontmatter 互逆。
 * 没有 frontmatter 时原样返回正文；frontmatter 缺结尾换行时补一个，避免分隔符粘住正文。
 * leading 给出时按它补正文开头的空行（解析器会吞掉 1 个空行）；body 为空不补。
 */
export function joinFrontmatter(frontmatter: string, body: string, leading?: number): string {
  if (frontmatter.length === 0) return body
  let head = frontmatter
  if (!head.endsWith('\n')) head += newlineOf(frontmatter)
  if (body.length > 0 && typeof leading === 'number') {
    const current = leadingNewlines(body)
    if (current < leading) head += newlineOf(frontmatter).repeat(leading - current)
  }
  return head + body
}
