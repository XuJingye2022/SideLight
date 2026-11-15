export type DiffLine = {
  /** 这一行在两段文字里的状态 */
  kind: 'same' | 'added' | 'removed'
  /** 行内容，不含换行符 */
  text: string
}

/** 任一侧行数超过它就不再算 LCS，直接退化，避免 O(n·m) 卡住 */
const MAX_DIFF_LINES = 4000

/** 统一换行符，并去掉末尾空行：末尾换行与末尾空行都不算差异 */
function toLines(text: string): string[] {
  const lines = text.replace(/\r\n?/g, '\n').split('\n')
  while (lines.length > 0 && lines[lines.length - 1] === '') lines.pop()
  return lines
}

/** 同一处改动里把删除排在新增前面，让用户先看到原来的行 */
function removedFirst(lines: DiffLine[]): DiffLine[] {
  const out: DiffLine[] = []
  let index = 0
  while (index < lines.length) {
    if (lines[index].kind === 'same') {
      out.push(lines[index])
      index += 1
      continue
    }
    const removed: DiffLine[] = []
    const added: DiffLine[] = []
    while (index < lines.length && lines[index].kind !== 'same') {
      if (lines[index].kind === 'removed') removed.push(lines[index])
      else added.push(lines[index])
      index += 1
    }
    out.push(...removed, ...added)
  }
  return out
}

/**
 * 基础 LCS 差分。dir 记录回溯方向：1 相同，2 取上（删除），3 取左（新增）。
 * 方向表是 Uint8Array，两侧各 4000 行时约 16MB。
 */
function diffByLcs(before: string[], after: string[]): DiffLine[] {
  const n = before.length
  const m = after.length
  const width = m + 1
  const dir = new Uint8Array((n + 1) * width)
  let previous = new Int32Array(width)
  let current = new Int32Array(width)

  for (let i = 1; i <= n; i += 1) {
    for (let j = 1; j <= m; j += 1) {
      const at = i * width + j
      if (before[i - 1] === after[j - 1]) {
        current[j] = previous[j - 1] + 1
        dir[at] = 1
      } else if (previous[j] >= current[j - 1]) {
        current[j] = previous[j]
        dir[at] = 2
      } else {
        current[j] = current[j - 1]
        dir[at] = 3
      }
    }
    const swap = previous
    previous = current
    current = swap
    current.fill(0)
  }

  const lines: DiffLine[] = []
  let i = n
  let j = m
  while (i > 0 && j > 0) {
    const direction = dir[i * width + j]
    if (direction === 1) {
      lines.push({ kind: 'same', text: before[i - 1] })
      i -= 1
      j -= 1
    } else if (direction === 2) {
      lines.push({ kind: 'removed', text: before[i - 1] })
      i -= 1
    } else {
      lines.push({ kind: 'added', text: after[j - 1] })
      j -= 1
    }
  }
  while (i > 0) {
    lines.push({ kind: 'removed', text: before[i - 1] })
    i -= 1
  }
  while (j > 0) {
    lines.push({ kind: 'added', text: after[j - 1] })
    j -= 1
  }

  return removedFirst(lines.reverse())
}

/**
 * 大文档退化：公共前缀 + 公共后缀 + 中间整段替换。
 * 只改一行也能给出很小的差异，不会退化成「全删再全加」。
 */
function diffCoarse(before: string[], after: string[]): DiffLine[] {
  let start = 0
  while (start < before.length && start < after.length && before[start] === after[start]) start += 1

  let endBefore = before.length
  let endAfter = after.length
  while (endBefore > start && endAfter > start && before[endBefore - 1] === after[endAfter - 1]) {
    endBefore -= 1
    endAfter -= 1
  }

  const lines: DiffLine[] = []
  for (let index = 0; index < start; index += 1) lines.push({ kind: 'same', text: before[index] })
  for (let index = start; index < endBefore; index += 1) lines.push({ kind: 'removed', text: before[index] })
  for (let index = start; index < endAfter; index += 1) lines.push({ kind: 'added', text: after[index] })
  for (let index = endBefore; index < before.length; index += 1) lines.push({ kind: 'same', text: before[index] })
  return lines
}

/**
 * 按行比较两段文字，返回合并后的差异序列。
 * 统一换行符，末尾空行不算差异；任一侧超过 4000 行时走粗粒度差分。
 */
export function diffLines(before: string, after: string): DiffLine[] {
  const beforeLines = toLines(before)
  const afterLines = toLines(after)

  if (beforeLines.length > MAX_DIFF_LINES || afterLines.length > MAX_DIFF_LINES) {
    return diffCoarse(beforeLines, afterLines)
  }

  return diffByLcs(beforeLines, afterLines)
}
