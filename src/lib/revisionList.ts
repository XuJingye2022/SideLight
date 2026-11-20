import { reviewStatusOf } from './annotations.ts'
import { CACHE_DIR } from './cache.ts'
import {
  MAX_REVISIONS,
  REVISIONS_DIR,
  parseRevision,
  parseRevisionName,
  revisionKeyHash,
} from './revisions.ts'

/* ---------- 修订快照清单（第 114 轮 B-247，只读） ---------- */

/** 一行快照：时刻按文件名、字节数与批注数按 JSON；label 拼好给面板直接渲染 */
export type RevisionSummary = {
  name: string
  savedAt: number
  bytes: number
  total: number
  open: number
  label: string
}

const pad2 = (value: number) => String(value).padStart(2, '0')

/** 本地时区 `MM-DD HH:MM:SS`，逐段补零（快照时刻在同一台机器上看） */
export function formatSavedAt(savedAt: number): string {
  const at = new Date(savedAt)
  return `${pad2(at.getMonth() + 1)}-${pad2(at.getDate())} ${pad2(at.getHours())}:${pad2(at.getMinutes())}:${pad2(at.getSeconds())}`
}

/** 面板一行的文案：时刻 · 字节数 · 批注数（open 数） */
export function revisionLabel(savedAt: number, bytes: number, total: number, open: number): string {
  return `${formatSavedAt(savedAt)} · ${bytes} B · 批注 ${total} 条（open ${open}）`
}

/**
 * 只读取 `.sidelight/revisions`：照 `cache.ts` 的 findCacheDir，不带 create。
 * 没有目录、没有权限都回 null，不建任何东西（CR-1）。
 */
async function findSnapshotsDir(
  parent: FileSystemDirectoryHandle,
): Promise<FileSystemDirectoryHandle | null> {
  try {
    const cache = await parent.getDirectoryHandle(CACHE_DIR)
    return await cache.getDirectoryHandle(REVISIONS_DIR)
  } catch {
    return null
  }
}

/**
 * 读一篇文档的修订快照清单（只读，不建目录、不写、不删）。
 * 文件名解析出来的 `savedAt` 是权威时刻：JSON 里的 `savedAt` 可能是旧值或 0（CR-3）。
 * 他键、坏名、旧格式不入列也不读；坏档、读失败的那份跳过，不补位。永不抛。
 */
export async function listRevisions(
  parent: FileSystemDirectoryHandle,
  key: string,
  max = MAX_REVISIONS,
): Promise<RevisionSummary[]> {
  try {
    const dir = await findSnapshotsDir(parent)
    if (!dir) return []
    const keyHash = revisionKeyHash(key)
    const entries: { name: string; savedAt: number }[] = []
    for await (const [name, handle] of dir.entries()) {
      if (handle.kind !== 'file') continue
      const savedAt = parseRevisionName(name, keyHash)
      if (savedAt === null) continue
      entries.push({ name, savedAt })
    }
    entries.sort(
      (a, b) => b.savedAt - a.savedAt || (a.name < b.name ? -1 : a.name > b.name ? 1 : 0),
    )
    const rows: RevisionSummary[] = []
    for (const entry of entries.slice(0, max)) {
      try {
        const file = await dir.getFileHandle(entry.name)
        const revision = parseRevision(await (await file.getFile()).text())
        if (!revision) continue
        const total = revision.annotations.length
        const open = revision.annotations.filter((item) => reviewStatusOf(item) === 'open').length
        rows.push({
          name: entry.name,
          savedAt: entry.savedAt,
          bytes: revision.bytes,
          total,
          open,
          label: revisionLabel(entry.savedAt, revision.bytes, total, open),
        })
      } catch {
        // 读失败或坏档：这一份不进清单
      }
    }
    return rows
  } catch {
    return []
  }
}
