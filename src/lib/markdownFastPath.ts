/**
 * 1 MB 多节点文档的载入热点（第 52 轮 B-013）：marked 的 blockTokens 在**每个块位置**都调用
 * 全部 block tokenizer，并把「剩下的整篇」当 src 传进来（`extensions.block.some(...)` 那段）。
 * 表格与任务列表的 tokenizer 一进来就 split 全文，于是 ~4.4 万个块 × 1 MB 变成 O(n²)：
 * 实测 110.9 s 里「表格 start」占 23.8%、「任务列表 parseIndentedBlocks」占 71.1%。
 * 这里只加一层「先看前两行 / 第一个非空行」的廉价守卫：不命中立刻返回，命中时原样调用
 * 依赖里的实现。不换依赖、不改解析语义——守卫条件与依赖里 tokenizer 的首个判定一一对应。
 */

import type { MarkdownToken, MarkdownTokenizer } from '@tiptap/core'

export type BlockTokenizer = MarkdownTokenizer

/** 表格分隔行：与 @tiptap/extension-table 里的判定逐字相同 */
const TABLE_SEPARATOR = /^[ \t|:]*-[ \t|:-]*$/
/** 任务项首行：与 @tiptap/extension-task-list 的 itemPattern 在单行上的判定相同 */
const TASK_ITEM_LINE = /^[ \t]*[-+*][ \t]+\[[ xX]\][ \t]+/
/** 任务项守卫只看开头这么多字符：更靠后的非空行不可能是任务项的起点 */
const TASK_HEAD = 2048

/** 前两行（第二行没有时 sep 为 null）：表格只可能从「第二行是分隔行」的位置开始 */
function firstTwoLines(src: string): { first: string; sep: string | null } {
  const first = src.indexOf('\n')
  if (first < 0) return { first: src, sep: null }
  const second = src.indexOf('\n', first + 1)
  return {
    first: src.slice(0, first),
    sep: second < 0 ? src.slice(first + 1) : src.slice(first + 1, second),
  }
}

function tableCandidate(src: string): boolean {
  const { sep } = firstTwoLines(src)
  return sep !== null && sep.includes('|') && TABLE_SEPARATOR.test(sep)
}

/** 表格 tokenizer：start 与 tokenize 都先只看两行；分隔行不成立时原实现本来也会返回空 */
export function tableTokenizer(base: BlockTokenizer): BlockTokenizer {
  return {
    ...base,
    start: (src) => {
      const { first, sep } = firstTwoLines(src)
      if (sep === null || !sep.includes('|') || !TABLE_SEPARATOR.test(sep)) return -1
      return first.includes('|') ? 0 : -1
    },
    tokenize: (src, tokens, helper) => (tableCandidate(src) ? base.tokenize(src, tokens, helper) : undefined),
  }
}

/**
 * 任务列表 tokenizer：原实现在开头就 `src.split('\n')` 全文再找一个任务项。
 * 守卫只看头 2048 字符里的第一个非空行；窗口内全是空行（看不全）时退回原实现，不猜。
 */
export function taskListTokenizer(base: BlockTokenizer): BlockTokenizer {
  return {
    ...base,
    tokenize: (src, tokens, helper) => {
      const head = src.slice(0, TASK_HEAD)
      const line = head.split('\n').find((item) => item.trim() !== '')
      if (line === undefined) {
        if (head.length >= TASK_HEAD) return base.tokenize(src, tokens, helper)
        return undefined
      }
      if (!TASK_ITEM_LINE.test(line)) return undefined
      return base.tokenize(src, tokens, helper)
    },
  }
}
