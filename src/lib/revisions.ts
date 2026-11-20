import {
  parseAnnotationStore,
  shiftAnnotations,
  type Annotation,
  type DocNote,
  type TextIndex,
} from './annotations.ts'
import { CACHE_DIR } from './cache.ts'

/* ---------- 修订快照（第 99 轮 B-226） ---------- */

/** 快照目录：与草稿、批注同住 .sidelight，只多一个 revisions 子目录 */
export const REVISIONS_DIR = 'revisions'

/** 每篇文档保留的快照数：再多也只有小 json，留最近 8 份够回看 */
export const MAX_REVISIONS = 8

/** 一份修订快照。正文不存（1 MB 文档会双写）：只留 digest 认身份与字节数 */
export type Revision = {
  v: 1
  id: string
  key: string
  savedAt: number
  bytes: number
  annotations: Annotation[]
  notes: DocNote[]
}

/**
 * 快照 id：键 + `\0` + 正文（LF 规范形）的 FNV-1a 32 位，8 位十六进制。
 * 键进哈希是为了两篇同文本文件不撞同一份文件；正文与键之间用 `\0` 隔开，避免拼接歧义。
 */
export function revisionDigest(key: string, text: string): string {
  const bytes = new TextEncoder().encode(`${key}\u0000${text}`)
  let hash = 2166136261
  for (let index = 0; index < bytes.length; index += 1) {
    hash ^= bytes[index]
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0).toString(16).padStart(8, '0')
}

/**
 * 造一份快照。`text` 只拿来算 digest（调用方传 LF 规范形），落盘字节数按 `bytesText` 算：
 * CRLF 文件的实际写盘文本比 `text` 长，S1 的「bytes == 磁盘字节」靠这个口径。
 */
export function buildRevision(
  key: string,
  text: string,
  annotations: Annotation[],
  notes: DocNote[],
  savedAt: number,
  bytesText = text,
): Revision {
  return {
    v: 1,
    id: revisionDigest(key, text),
    key,
    savedAt,
    bytes: new TextEncoder().encode(bytesText).length,
    annotations,
    notes,
  }
}

export function serializeRevision(revision: Revision): string {
  return JSON.stringify(revision)
}

/** 坏 JSON、`v` 不是 1、缺 id 都当没有；批注走读库同一个归一入口 */
export function parseRevision(raw: string | null): Revision | null {
  if (!raw) return null
  try {
    const value = JSON.parse(raw) as unknown
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null
    const record = value as Record<string, unknown>
    if (record.v !== 1) return null
    if (typeof record.id !== 'string' || record.id === '') return null
    if (typeof record.key !== 'string') return null
    const store = parseAnnotationStore(
      JSON.stringify({ v: 2, annotations: record.annotations, notes: record.notes }),
    )
    return {
      v: 1,
      id: record.id,
      key: record.key,
      savedAt: typeof record.savedAt === 'number' ? record.savedAt : 0,
      bytes: typeof record.bytes === 'number' ? record.bytes : 0,
      annotations: store.annotations,
      notes: store.notes,
    }
  } catch {
    return null
  }
}

/** 一次整篇替换的「编辑点 + 长度差」：批注只能按这条移动，不用动 to/tracking */
export type RevisionMove = {
  changeStart: number
  delta: number
}

/**
 * 两次正文索引的差别能不能当成一次单点编辑（第 99 轮 B-226）。
 * 公共前缀/后缀把变化夹出来；夹出来的旧段/新段任一含换行（跨块）或超过 512 字就不认。
 * 再门一层：文档内容尺寸差必须等于文本长度差（包裹节点会让 size +2 而文本不变），
 * 且变化点在两份索引里的位置必须相同，否则回 null 走旧的引文重定位。
 */
export function migrationOf(
  oldIndex: TextIndex,
  newIndex: TextIndex,
  oldSize: number,
  newSize: number,
): RevisionMove | null {
  const oldText = oldIndex.text
  const newText = newIndex.text
  const limit = Math.min(oldText.length, newText.length)
  let prefix = 0
  while (prefix < limit && oldText[prefix] === newText[prefix]) prefix += 1
  const changeStart = oldIndex.positions[prefix]
  if (changeStart === undefined) return null
  if (newIndex.positions[prefix] === undefined) return null
  let suffix = 0
  while (
    suffix < limit - prefix &&
    oldText[oldText.length - 1 - suffix] === newText[newText.length - 1 - suffix]
  ) {
    suffix += 1
  }
  const oldSpan = oldText.slice(prefix, oldText.length - suffix)
  const newSpan = newText.slice(prefix, newText.length - suffix)
  if (oldSpan.includes('\n') || newSpan.includes('\n')) return null
  if (oldSpan.length > 512 || newSpan.length > 512) return null
  const delta = newText.length - oldText.length
  if (newSize - oldSize !== delta) return null
  if (newIndex.positions[prefix] !== changeStart) return null
  return { changeStart, delta }
}

/** 快照目录里的一行：清理只认 key 与时间，不读正文 */
export type RevisionEntry = {
  name: string
  key: string
  savedAt: number
}

/**
 * 同键快照超过 `max` 时该删哪些：`savedAt` 降序（同值按文件名）留前 `max` 份。
 * `keep`（刚写的那份）无论排序都必留。别的键一律不碰。
 */
export function pruneRevisions(
  entries: RevisionEntry[],
  key: string,
  max = MAX_REVISIONS,
  keep?: string,
): string[] {
  const same = entries.filter((entry) => entry.key === key)
  if (same.length <= max) return []
  const sorted = [...same].sort(
    (a, b) => b.savedAt - a.savedAt || (a.name < b.name ? -1 : a.name > b.name ? 1 : 0),
  )
  const kept = sorted.slice(0, max)
  if (keep && !kept.some((entry) => entry.name === keep)) {
    const keptEntry = sorted.find((entry) => entry.name === keep)
    if (keptEntry) {
      kept.pop()
      kept.push(keptEntry)
    }
  }
  const keptNames = new Set(kept.map((entry) => entry.name))
  return same.filter((entry) => !keptNames.has(entry.name)).map((entry) => entry.name)
}

/**
 * 引文重定位失败后，按单点编辑平移批注；平移到正文外的丢掉（返回新数组）。
 * 删除时起点落在被删区间里的整条丢：平移后它会压到别的文字上。
 * `move` 为 null 表示这次替换不像单点编辑，全部丢——宁可少一条批注，也不能乱绑。
 */
export function migrateAnnotations<T extends { from: number; to: number }>(
  list: T[],
  move: RevisionMove | null,
  docSize: number,
): T[] {
  if (!move) return []
  const { changeStart, delta } = move
  const shifted = shiftAnnotations(list, changeStart, delta)
  return shifted.filter((item, index) => {
    const before = list[index]
    if (delta < 0 && before.from >= changeStart && before.from < changeStart - delta) return false
    if (item.from < 1) return false
    if (item.to <= item.from) return false
    if (item.to > docSize) return false
    return true
  })
}

async function revisionsDir(parent: FileSystemDirectoryHandle): Promise<FileSystemDirectoryHandle> {
  const cache = await parent.getDirectoryHandle(CACHE_DIR, { create: true })
  return cache.getDirectoryHandle(REVISIONS_DIR, { create: true })
}

/**
 * 文件名里键的短哈希：把同键快照聚在一起；8 位与 id 同宽，清理前按前缀筛。
 * 第 114 轮起导出给只读清单 `revisionList.ts` 复用同一口径。
 */
export function revisionKeyHash(key: string): string {
  return revisionDigest(key, '')
}

/**
 * 快照文件名：`<键哈希>-<保存时刻 base36>-<正文 id>.json`。
 * 同键判定、保存时刻与正文 id 都在文件名里，清理不必为每份快照读正文。
 */
function revisionFileName(key: string, savedAt: number, id: string): string {
  return `${revisionKeyHash(key)}-${savedAt.toString(36)}-${id}.json`
}

/**
 * 从文件名反解保存时刻。只认本键的三段名：键哈希、正整数 base36 时刻、8 位十六进制 id。
 * 旧格式 `<id>.json` 与坏名一律返回 null：不进清理集合（不排序、不读、不删）。
 * 第 114 轮起导出给只读清单 `revisionList.ts`，清单与清理按同一份文件名规则。
 */
export function parseRevisionName(name: string, keyHash: string): number | null {
  if (!name.endsWith('.json')) return null
  const parts = name.slice(0, -'.json'.length).split('-')
  if (parts.length !== 3 || parts[0] !== keyHash) return null
  if (!/^[0-9a-z]+$/.test(parts[1])) return null
  const savedAt = Number.parseInt(parts[1], 36)
  if (!Number.isSafeInteger(savedAt) || savedAt <= 0) return null
  if (savedAt.toString(36) !== parts[1]) return null
  if (!/^[0-9a-f]{8}$/.test(parts[2])) return null
  return savedAt
}

/**
 * 写一份快照并清旧：目录或写入失败全吞，返回 null（保存本身不受影响）。
 * 同一份正文（同 id，看文件名后缀）已存在就直接返回，不重复写；写完才按同键份额清理。
 * 列目录失败只跳过这两步，本次快照照常写：宁多一份，不丢快照。
 */
export async function writeRevision(
  parent: FileSystemDirectoryHandle,
  key: string,
  text: string,
  annotations: Annotation[],
  notes: DocNote[],
  bytesText = text,
): Promise<string | null> {
  try {
    const revision = buildRevision(key, text, annotations, notes, Date.now(), bytesText)
    const dir = await revisionsDir(parent)
    const keyHash = revisionKeyHash(key)
    const entry: RevisionEntry = {
      name: revisionFileName(key, revision.savedAt, revision.id),
      key,
      savedAt: revision.savedAt,
    }
    const entries: RevisionEntry[] = []
    try {
      for await (const [fileName, handle] of dir.entries()) {
        if (handle.kind !== 'file') continue
        const savedAt = parseRevisionName(fileName, keyHash)
        if (savedAt === null) continue
        entries.push({ name: fileName, key, savedAt })
      }
    } catch {
      entries.length = 0
    }
    if (entries.some((old) => old.name.endsWith(`-${revision.id}.json`))) return revision.id
    const file = await dir.getFileHandle(entry.name, { create: true })
    const writer = await file.createWritable()
    await writer.write(serializeRevision(revision))
    await writer.close()
    entries.push(entry)
    for (const old of pruneRevisions(entries, key, MAX_REVISIONS, entry.name)) {
      try {
        await dir.removeEntry(old)
      } catch {
        // 删不掉就留着，下一轮再清
      }
    }
    return revision.id
  } catch {
    return null
  }
}
