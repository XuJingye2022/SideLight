/**
 * 联网核对的自动化（第 138 轮）：分析一结束就自动搜出处，不用再手点卡片上的按钮。
 *
 * 两条规矩写在这里，App 只负责状态与请求：
 * - 搜索词只有一处（`verifyQuery`）：手动「重新核对」与自动核对必须发同一条查询；
 * - 并发有上限（`runVerifyPool` + `VERIFY_CONCURRENCY`）：一次分析可能出好几条批注，
 *   全都一起打搜索服务既费配额又容易被限流。
 *
 * `search.ts` 仍是惰性 chunk（第 136 轮体积），这里只放纯函数，**不要**静态 import 它。
 */

/** 一条批注的核对状态：只在「核对中」与「失败」时记录；成功的不留（出处已经列在卡上） */
export type VerifyState = 'verifying' | 'failed'

/** 自动核对的并发上限：同时搜 2 条，回来一条再补一条 */
export const VERIFY_CONCURRENCY = 2

/**
 * 搜索词：原文 + 批注，压掉空白后截 200 字。
 * 第 138 轮从 `App.tsx` 的 `verifySources` 抽出——手动与自动两条路径共用，避免口径漂移。
 */
export function verifyQuery(annotation: { quote: string; note: string }): string {
  return `${annotation.quote} ${annotation.note}`.replace(/\s+/g, ' ').trim().slice(0, 200)
}

/**
 * 自动核对的目标：按 id 去重、保持原顺序。
 * 同一次分析里一条批注可能被同窗口重算两次（`replaceInWindow` 复用 id），只该搜一次。
 */
export function autoVerifyTargets<T extends { id: string }>(fresh: readonly T[]): T[] {
  const seen = new Set<string>()
  const out: T[] = []
  for (const item of fresh) {
    if (seen.has(item.id)) continue
    seen.add(item.id)
    out.push(item)
  }
  return out
}

/**
 * 有限并发跑一遍：`limit` 夹到 1..items.length，按数组顺序取件，单条抛错不打断其余。
 * 单条失败由 worker 自己记状态（卡片留「重新核对」），池子只保证并发数与「谁都不丢」。
 */
export async function runVerifyPool<T>(
  items: readonly T[],
  limit: number,
  worker: (item: T) => Promise<void>,
): Promise<void> {
  const total = items.length
  if (total === 0) return
  const requested = Number.isFinite(limit) ? Math.floor(limit) : 1
  const width = Math.min(Math.max(requested, 1), total)
  let next = 0
  const lanes = Array.from({ length: width }, async () => {
    while (next < total) {
      const index = next
      next += 1
      try {
        await worker(items[index])
      } catch {
        // 这条算结束：其余批注照搜，失败的那条已经由 worker 写成「失败」
      }
    }
  })
  await Promise.all(lanes)
}
