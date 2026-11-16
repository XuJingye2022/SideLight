export type TextStats = {
  /** 中日韩字符个数（逐字计，标点不算） */
  cjk: number
  /** 拉丁词个数（按空白与标点切分） */
  words: number
  /** 去掉所有空白后的字符数 */
  chars: number
  /** 非空段落数 */
  paragraphs: number
  /** 预计阅读分钟数，向上取整，最少 1 */
  minutes: number
}

/**
 * 中日韩文字：汉字基本区、扩展 A、兼容区、补充平面（扩展 B 及以后），
 * 外加日文假名与韩文谚文。标点不在这些区间里，例如「、」「。」「・」。
 */
const CJK =
  /[\u3041-\u3096\u309D-\u309E\u30A1-\u30FA\u30FC-\u30FE\u3400-\u4DBF\u4E00-\u9FFF\uAC00-\uD7A3\uF900-\uFAFF\u{20000}-\u{3134F}]/u

/** 拉丁词：字母数字开头，中间可带撇号或连字符 */
const LATIN_WORD = /[A-Za-z0-9]+(?:['’-][A-Za-z0-9]+)*/g

/** 中文每分钟 300 字、英文每分钟 200 词，两者通分到 600 份 */
const UNITS_PER_MINUTE = 600

function countCjk(text: string): number {
  let count = 0
  for (const char of text) {
    if (CJK.test(char)) count += 1
  }
  return count
}

function countWords(text: string): number {
  return text.match(LATIN_WORD)?.length ?? 0
}

function estimateMinutes(cjk: number, words: number): number {
  // 中文每字 2 份、英文每词 3 份。全程用整数算，
  // 避免浮点误差把正好 4 分钟算成 5 分钟。
  const units = cjk * 2 + words * 3
  return Math.max(1, Math.ceil(units / UNITS_PER_MINUTE))
}

/** 统计一段纯文本的字数、词数、字符数、段落数与预计阅读时间 */
export function countText(text: string): TextStats {
  const cjk = countCjk(text)
  const words = countWords(text)
  return {
    cjk,
    words,
    chars: text.replace(/\s/g, '').length,
    paragraphs: text.split(/\r?\n/).filter((line) => line.trim().length > 0).length,
    minutes: estimateMinutes(cjk, words),
  }
}

/** 状态栏文案，例如「1,240 字 · 阅读约 5 分钟」。字数 = 中日韩字数 + 拉丁词数 */
export function formatStats(stats: TextStats): string {
  const total = stats.cjk + stats.words
  const count = total.toLocaleString('en-US')
  if (total === 0) return `${count} 字`
  return `${count} 字 · 阅读约 ${stats.minutes} 分钟`
}

/**
 * 句数：先删 `\r`，再按中文句末标点（。！？；…）、西文句号后跟空白、换行切分，
 * 去掉首尾空白后非空的片段计 1 句。拉丁缩写（`e.g.`、`Dr.`）不特殊处理，
 * 会在缩写处多切一句 —— 已知取舍，宁可多算不吞句。
 */
export function countSentences(text: string): number {
  const normalized = text.replace(/\r/g, '')
  if (normalized.trim().length === 0) return 0
  return normalized
    .split(/[。！？!?；;…]+|(?<=[.!?])\s+|\n+/)
    .filter((part) => part.trim().length > 0).length
}
