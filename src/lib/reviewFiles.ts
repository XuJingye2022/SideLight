import { readAnnotationStore, reviewStatusOf, type Annotation, type AnnotationStore } from './annotations.ts'
import { cacheKey } from './cache.ts'
import { parentDirectory, type Workspace, type WorkspaceFileNode } from './workspace.ts'

/** 侧栏「在审文件」一行：一篇有批注的文档 */
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

const DEFAULT_MAX_FILES = 200
const DEFAULT_MAX_ROWS = 50

/** 取值兜底：非有限数用默认值，小于下限的抬到下限（与 diffView 的 atLeast 同口径） */
function atLeast(value: number | undefined, fallback: number, min: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback
  const rounded = Math.floor(value)
  return rounded < min ? min : rounded
}

/** 文件所在目录的缓存键：首段是工作区名、末段是文件名，中间才是逐级要进的目录 */
function directoryKey(path: string): string {
  return path.split('/').slice(1, -1).join('/')
}

/** 定序：open 多的在前；open 相同按 path 升序（码点序，结果与运行环境无关） */
function compareRows(a: ReviewFileRow, b: ReviewFileRow): number {
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
 * 把「当前打开这一篇」的内存行合并进磁盘扫描结果（第 103 轮）。
 *
 * 批注写盘走 600 ms 防抖（`src/App.tsx` 的写盘 effect），改完档立刻开面板读到的仍是旧档，
 * 而打开的面板不会重扫，看起来像改档没生效。内存与写盘本来是同一份数据，
 * 所以渲染时按 path 覆盖/补上这一行：写盘落地与否，面板里的数都是这一刻真值。
 *
 * `live` 为 null 或 `total === 0` 时原样返回（载入期还没恢复批注、或当前篇一条不剩时
 * 不凭空造行——写盘可能还在飞，关掉重开即真值）。行数超过 `DEFAULT_MAX_ROWS` 时截断并置
 * truncated，与 `collectReviewFiles` 同一口径。
 */
export function applyLiveReviewRow(
  result: ReviewFilesResult,
  live: ReviewFileRow | null,
): ReviewFilesResult {
  if (!live || live.total === 0) return result
  const rows = result.rows.filter((row) => row.path !== live.path)
  rows.push(live)
  rows.sort(compareRows)
  const truncated = rows.length > DEFAULT_MAX_ROWS
  return {
    ...result,
    rows: truncated ? rows.slice(0, DEFAULT_MAX_ROWS) : rows,
    truncated: result.truncated || truncated,
  }
}

/**
 * 只读扫描工作区里的批注档，列出「在审」文件（第 101 轮 B-228）。
 *
 * 在审 = 有 `.sidelight/annotations/<cacheKey(name)>.json` 且 `annotations` 非空；
 * 只有 `notes`（全文总评 / 未定位批注）的档不入列。open 只算 `reviewStatusOf === 'open'`
 * 的条目（旧档按内部 status 迁移），其余三档只进 total。
 *
 * 纯读：`readAnnotationStore` 不传 create，也不写任何文件；坏档、目录缺失、
 * `parentDirectory` 拿不到（工作区根句柄为空）或抛错都跳过该文件，绝不抛。
 *
 * 两个硬上限：`maxFiles` 管「扫多少个文件」（防止几千篇的工作区每次都全扫），
 * `maxRows` 管「返回多少行」（面板最多 50 行）；两者的结果分别用 capped / truncated 告诉界面。
 */
export async function collectReviewFiles(
  workspace: Workspace,
  files: WorkspaceFileNode[],
  options: ReviewFilesOptions = {},
): Promise<ReviewFilesResult> {
  const maxFiles = atLeast(options.maxFiles, DEFAULT_MAX_FILES, 0)
  const maxRows = atLeast(options.maxRows, DEFAULT_MAX_ROWS, 0)

  const capped = files.length > maxFiles
  const scanFiles = capped ? files.slice(0, maxFiles) : files

  // 同一目录只解析一次：201 篇通常在几层里，逐个文件重走 getDirectoryHandle 会白跑一遍
  const directories = new Map<string, FileSystemDirectoryHandle | null>()
  const rows: ReviewFileRow[] = []

  for (const file of scanFiles) {
    const dirKey = directoryKey(file.path)
    if (!directories.has(dirKey)) {
      let dir: FileSystemDirectoryHandle | null = null
      try {
        dir = await parentDirectory(workspace, file.path)
      } catch {
        dir = null
      }
      directories.set(dirKey, dir)
    }
    const dir = directories.get(dirKey) ?? null
    if (!dir) continue

    let store: AnnotationStore
    try {
      store = await readAnnotationStore(dir, cacheKey(file.name))
    } catch {
      continue
    }
    if (store.annotations.length === 0) continue

    const open = countOpenAnnotations(store.annotations)
    rows.push({ path: file.path, name: file.name, open, total: store.annotations.length })
  }

  rows.sort(compareRows)
  const truncated = rows.length > maxRows
  return {
    rows: truncated ? rows.slice(0, maxRows) : rows,
    scanned: scanFiles.length,
    capped,
    truncated,
  }
}
