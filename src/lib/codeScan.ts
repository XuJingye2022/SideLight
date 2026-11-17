import { fenceMap } from './risk.ts'

/** 块引用前缀：`> ```js` 也是围栏。判定前先去掉（只用于判定，输出仍用原行） */
const BLOCKQUOTE_PREFIX = /^(?: {0,3}> ?)+/
const INLINE_CODE = /(`+)([\s\S]*?)\1/g
/** 行内公式：`$` 后不能是空白、`$` 前不能是空白（与 math.ts 的 isMathBody 同一口径） */
const INLINE_MATH = /(?<!\\)\$(?=\S)[^$\n]*?\S\$/g
const BLOCK_MATH = /^\s*\$\$/

/**
 * 逐行跳过代码围栏、行内代码（`protectMath` 时再跳过公式），只把剩下的片段交给 fn。
 * 围栏/代码/公式里的内容一个字节都不动：repairTildes 与 repairHtml 共用这一份实现。
 */
export function mapOutsideCode(
  markdown: string,
  fn: (segment: string) => string,
  protectMath = false,
): string {
  const lines = markdown.split('\n')
  const stripped = lines.map((line) => line.replace(BLOCKQUOTE_PREFIX, ''))
  const fences = fenceMap(stripped.join('\n'))
  // fenceMap 会把孤立的 \r 也当换行；行数对不上时退化成「不认围栏」
  const fenced = fences.length === lines.length ? fences.map((item) => item.fenced) : lines.map(() => false)
  let inBlockMath = false
  return lines
    .map((line, index) => {
      if (fenced[index]) return line
      const text = stripped[index].trim()
      if (inBlockMath) {
        if (text.endsWith('$$')) inBlockMath = false
        return line
      }
      if (protectMath && BLOCK_MATH.test(stripped[index])) {
        if (!text.slice(2).includes('$$')) inBlockMath = true
        return line
      }
      return mapOutsideInlineSpans(line, fn, protectMath)
    })
    .join('\n')
}

function mapOutsideInlineSpans(line: string, fn: (segment: string) => string, protectMath: boolean): string {
  const spans: [number, number][] = []
  for (const match of line.matchAll(INLINE_CODE)) {
    const at = match.index ?? 0
    spans.push([at, at + match[0].length])
  }
  if (protectMath) {
    for (const match of line.matchAll(INLINE_MATH)) {
      const at = match.index ?? 0
      if (spans.some(([start, end]) => at >= start && at < end)) continue
      spans.push([at, at + match[0].length])
    }
  }
  spans.sort((a, b) => a[0] - b[0])
  let out = ''
  let last = 0
  for (const [start, end] of spans) {
    if (start < last) continue
    out += fn(line.slice(last, start)) + line.slice(start, end)
    last = end
  }
  return out + fn(line.slice(last))
}
