import { isClosedReview, reviewStatusOf, type Annotation } from './annotations.ts'

/** 侧栏「在审文件」一行：一篇还有未结项批注的文档 */
export type ReviewFileRow = {
  /** 工作区里的完整路径（首段是工作区名），点行时原样交给 App */
  path: string
  name: string
  /** 四态仍是 open 的条数 */
  open: number
  /** 该文件的批注总条数（open / in-progress / resolved / wont-fix） */
  total: number
}

export type ReviewFilesOptions = {
  /** 最多扫多少个文件，默认 200：超了只扫前 200 个并置 capped */
  maxFiles?: number
  /** 最多返回多少行，默认 50：超了只留前 50 行并置 truncated */
  maxRows?: number
}

export type ReviewFilesResult = {
  rows: ReviewFileRow[]
  /** 实际扫过的文件数（= min(files.length, maxFiles)） */
  scanned: number
  /** 文件数超过 maxFiles，后面的没扫 */
  capped: boolean
  /** 在审文件数超过 maxRows，只返回了前 maxRows 行 */
  truncated: boolean
}

export const REVIEW_MAX_ROWS = 50

/** 定序：open 多的在前；open 相同按 path 升序（码点序，结果与运行环境无关） */
export function compareRows(a: ReviewFileRow, b: ReviewFileRow): number {
  if (a.open !== b.open) return b.open - a.open
  if (a.path < b.path) return -1
  return a.path > b.path ? 1 : 0
}

/**
 * 四态里仍是 open 的条数。内存里的当前篇与磁盘档共用这一个口径（第 103 轮）：
 * 两处各写一遍，改档规则一变就漂移。
 */
export function countOpenAnnotations(annotations: Annotation[]): number {
  let open = 0
  for (const annotation of annotations) {
    if (reviewStatusOf(annotation) === 'open') open += 1
  }
  return open
}

/**
 * 是否还有未结项的批注（open 或 in-progress）。第 105 轮 B-234 的入列口径：
 * 至少一条未结项才算出「在审」；全部 resolved / wont-fix 的文档不入列
 * （Review Mode 可处理集 = open + in-progress）。
 */
export function hasUnclosedReview(annotations: Annotation[]): boolean {
  return annotations.some((annotation) => !isClosedReview(annotation))
}

/**
 * 把「当前打开这一篇」的内存行合并进磁盘扫描结果（第 103 轮）。
 *
 * 批注写盘走 600 ms 防抖（`src/App.tsx` 的写盘 effect），改完档立刻开面板读到的仍是旧档，
 * 而打开的面板不会重扫，看起来像改档没生效。内存与写盘本来是同一份数据，
 * 所以渲染时按 path 覆盖/补上这一行：写盘落地与否，面板里的数都是这一刻真值。
 *
 * `live` 为 null 或 `total === 0` 时原样返回（载入期还没恢复批注、或当前篇一条不剩时
 * 不凭空造行——写盘可能还在飞，关掉重开即真值）。行数超过 `REVIEW_MAX_ROWS` 时截断并置
 * truncated，与 `collectReviewFiles` 同一口径。
 *
 * `liveClosed` 为真时（第 105 轮 B-234：当前篇全部结项）只删掉同 path 的那一行，
 * 不 push、不重排、也不把被截掉的第 51 行顶回来（`truncated` 原样不动）；
 * 磁盘档的那一行可能还是旧值，所以不必等 600 ms 防抖落盘。
 */
export function applyLiveReviewRow(
  result: ReviewFilesResult,
  live: ReviewFileRow | null,
  liveClosed = false,
): ReviewFilesResult {
  if (!live || live.total === 0) return result
  const rows = result.rows.filter((row) => row.path !== live.path)
  if (liveClosed) return { ...result, rows }
  rows.push(live)
  rows.sort(compareRows)
  const truncated = rows.length > REVIEW_MAX_ROWS
  return {
    ...result,
    rows: truncated ? rows.slice(0, REVIEW_MAX_ROWS) : rows,
    truncated: result.truncated || truncated,
  }
}

/**
 * 截断提示的文案（第 133 轮）：固定说「最多显示 REVIEW_MAX_ROWS 篇」，不读 `rows.length`。
 *
 * 当前篇全部结项时 `applyLiveReviewRow` 的 liveClosed 分支只删行（第 105 轮 B-234），
 * 盘上仍截断、行数 50→49；按行数拼文案会写成「只显示前 49 篇」，与上限自相矛盾。
 * 只收 `truncated`，结构上拿不到 `rows`，以后行数再变也不会把提示带偏。
 */
export function reviewTruncatedNote(result: Pick<ReviewFilesResult, 'truncated'>): string | null {
  return result.truncated ? `在审文件太多，最多显示 ${REVIEW_MAX_ROWS} 篇。` : null
}
