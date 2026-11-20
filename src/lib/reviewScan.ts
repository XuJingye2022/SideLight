import { readAnnotationStore, type AnnotationStore } from './annotations.ts'
import { cacheKey } from './cache.ts'
import {
  compareRows,
  countOpenAnnotations,
  hasUnclosedReview,
  REVIEW_MAX_ROWS,
  type ReviewFileRow,
  type ReviewFilesOptions,
  type ReviewFilesResult,
} from './reviewFiles.ts'
import { parentDirectory, type Workspace, type WorkspaceFileNode } from './workspace.ts'

/**
 * 「在审文件」的磁盘扫描（第 136 轮从 `reviewFiles.ts` 拆出来）：
 * 只在点开侧栏「在审」面板时加载，不进常驻 chunk（B-229）。
 * 第 103/105/135 轮的口径（open 计数、未结项判定、排序、两个上限）仍由 `reviewFiles.ts` 提供，
 * 两边共用同一份实现，不各写一遍。
 */

const DEFAULT_MAX_FILES = 200

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

/**
 * 只读扫描工作区里的批注档，列出「在审」文件（第 101 轮 B-228）。
 *
 * 在审 = 至少一条批注是 open 或 in-progress（第 105 轮 B-234 前是「有批注档且 annotations 非空」）；
 * 只有 `notes`（全文总评 / 未定位批注）的档、或全部 resolved / wont-fix 的档都不入列。
 * open 只算 `reviewStatusOf === 'open'` 的条目（旧档按内部 status 迁移），其余三档只进 total。
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
  const maxRows = atLeast(options.maxRows, REVIEW_MAX_ROWS, 0)

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
    if (!hasUnclosedReview(store.annotations)) continue

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
