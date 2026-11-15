import type { TextIndex } from './annotations.ts'

export type FindOptions = { caseSensitive: boolean }

/** 文档里的一处命中，from/to 是文档位置，可直接用作 ProseMirror 选区 */
export type Match = { from: number; to: number }

/** 块与块之间的分隔符，命中跨过它就不算 */
const BLOCK_SEPARATOR = '\n'

/**
 * 找出全文所有命中。查询为空或全是空白时没有命中。
 * 不区分大小写时两边都转小写再比，中文与其它非拉丁字符转小写后不变，等于按原样比。
 * 可重叠：每次命中后从下一个字符继续找，'aaa' 里查 'aa' 得到两处。
 * 命中区间带块分隔符的跳过，也从下一个字符继续找，引文就不会跨段误匹配。
 */
export function findAll(index: TextIndex, query: string, options: FindOptions): Match[] {
  if (query.trim() === '') return []

  // 整篇只转一次小写，比在每个位置切片再转快。代价是极少数字符
  // （例如 'İ' 小写后是 'i̇'）转完长度会变，含这类字符的正文里下标可能错位。
  const haystack = options.caseSensitive ? index.text : index.text.toLowerCase()
  const needle = options.caseSensitive ? query : query.toLowerCase()
  const length = query.length

  const matches: Match[] = []
  let cursor = 0
  while (cursor + length <= haystack.length) {
    const start = haystack.indexOf(needle, cursor)
    if (start < 0) break

    const from = index.positions[start]
    const last = index.positions[start + length - 1]
    if (from === undefined || last === undefined) break

    const candidate = haystack.slice(start, start + length)
    if (!candidate.includes(BLOCK_SEPARATOR)) {
      matches.push({ from, to: last + 1 })
    }

    cursor = start + 1
  }

  return matches
}

/**
 * 下一处命中的下标：第一个 from 不小于传入位置的命中。
 * 传入位置在最后一处之后时回到第一处，没有命中返回 -1。
 * 传进来的 matches 按 from 递增，findAll 的输出就是这个顺序。
 */
export function findNext(matches: Match[], from: number): number {
  if (matches.length === 0) return -1
  const next = matches.findIndex((match) => match.from >= from)
  return next >= 0 ? next : 0
}

/**
 * 上一处命中的下标：最后一个 from 小于传入位置的命中。
 * 传入位置在第一处之前时回到最后一处，没有命中返回 -1。
 */
export function findPrevious(matches: Match[], from: number): number {
  for (let i = matches.length - 1; i >= 0; i--) {
    if (matches[i].from < from) return i
  }
  return matches.length - 1
}
