export type CacheKind = 'draft' | 'annotations'

/** 缓存目录名，固定 .sidelight */
export const CACHE_DIR = '.sidelight'

// kind 对应的子目录
const SUBDIRS: Record<CacheKind, string> = {
  draft: 'drafts',
  annotations: 'annotations',
}

// kind 对应的文件扩展名，草稿是正文，批注是 JSON
const EXTENSIONS: Record<CacheKind, string> = {
  draft: 'md',
  annotations: 'json',
}

// 键里只留这些字符，其余一律换成 -
const UNSAFE_KEY = /[^a-zA-Z0-9\u4e00-\u9fa5_-]/g

// 键太长会让路径难读，超过这个长度就在 40 位后加 4 位哈希
const MAX_KEY_LENGTH = 40

const DEFAULT_KEY = 'untitled'

/** 4 位十六进制哈希（FNV-1a，UTF-8 字节，与宿主 CacheKey 逐字节一致） */
function shortHash(text: string): string {
  const bytes = new TextEncoder().encode(text)
  let hash = 2166136261
  for (let index = 0; index < bytes.length; index += 1) {
    hash ^= bytes[index]
    hash = Math.imul(hash, 16777619)
  }
  return (hash & 0xffff).toString(16).padStart(4, '0')
}

function cleanKey(fileName: string): string {
  const dot = fileName.lastIndexOf('.')
  const body = dot > 0 ? fileName.slice(0, dot) : fileName
  return body
    .replace(UNSAFE_KEY, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/**
 * 把文件名变成缓存键：去扩展名、非法字符换 -、连续 - 合并、首尾 - 去掉。
 * 清洗后 ≤40 字符的键与旧算法逐字节相同（既有草稿/批注不搬家）；
 * 超过 40 字符才取前 36 位 + `-<4 位哈希>`，与宿主 `CacheKey` 逐字节一致。
 */
export function cacheKey(fileName: string): string {
  const cleaned = cleanKey(fileName)
  if (!cleaned) return DEFAULT_KEY
  if (cleaned.length <= MAX_KEY_LENGTH) return cleaned
  // 与宿主一致：前 36 位（去尾部 -）+ - + 4 位哈希
  const base = cleaned.slice(0, 36).replace(/-+$/g, '')
  return `${base}-${shortHash(cleaned)}`
}

/** 旧算法（40 位截断、不加哈希）：只用于读旧键与迁移 */
export function legacyCacheKey(fileName: string): string {
  const cleaned = cleanKey(fileName)
    .slice(0, MAX_KEY_LENGTH)
    .replace(/-+$/g, '')
  return cleaned || DEFAULT_KEY
}

/** 新键是否需要回看旧键：只有被截断过的长名才有旧键差异 */
export function legacyKeyFor(fileName: string): string | null {
  const current = cacheKey(fileName)
  const legacy = legacyCacheKey(fileName)
  return current === legacy ? null : legacy
}

// 缓存文件名：草稿 .md，批注 .json
function cacheFileName(kind: CacheKind, key: string): string {
  return `${key}.${EXTENSIONS[kind]}`
}

/**
 * 缓存文件的相对路径：草稿是 .sidelight/drafts/<key>.md，批注是 .sidelight/annotations/<key>.json。
 */
export function cachePath(kind: CacheKind, key: string): string {
  return `${CACHE_DIR}/${SUBDIRS[kind]}/${cacheFileName(kind, key)}`
}

/**
 * 在给定目录下取出或创建 .sidelight（以及 kind 子目录）。
 * 失败返回 null，不抛。
 */
export async function ensureCacheDir(
  parent: FileSystemDirectoryHandle,
  kind: CacheKind,
): Promise<FileSystemDirectoryHandle | null> {
  try {
    const root = await parent.getDirectoryHandle(CACHE_DIR, { create: true })
    return await root.getDirectoryHandle(SUBDIRS[kind], { create: true })
  } catch {
    return null
  }
}

// 读与删都走这里：只取目录，不创建，没有就返回 null
async function findCacheDir(
  parent: FileSystemDirectoryHandle,
  kind: CacheKind,
): Promise<FileSystemDirectoryHandle | null> {
  try {
    const root = await parent.getDirectoryHandle(CACHE_DIR)
    return await root.getDirectoryHandle(SUBDIRS[kind])
  } catch {
    return null
  }
}

/**
 * 写缓存。成功 true；无权限、配额用尽、目录建不出来都返回 false，不抛。
 */
export async function writeCache(
  parent: FileSystemDirectoryHandle,
  kind: CacheKind,
  key: string,
  text: string,
): Promise<boolean> {
  const dir = await ensureCacheDir(parent, kind)
  if (!dir) return false

  try {
    const file = await dir.getFileHandle(cacheFileName(kind, key), { create: true })
    const writable = await file.createWritable()
    try {
      await writable.write(text)
      await writable.close()
    } catch {
      // 写一半失败时放弃这次写入，免得留下半截缓存
      await writable.abort().catch(() => undefined)
      return false
    }
    return true
  } catch {
    return false
  }
}

/**
 * 读缓存。先读新键；长名传了 legacyKey 时再读旧截断键，命中后搬到新键并删旧键。
 * 文件不存在返回 null；其它错误（无权限、内容读不出来）也返回 null，不抛。
 */
export async function readCache(
  parent: FileSystemDirectoryHandle,
  kind: CacheKind,
  key: string,
  legacyKey?: string | null,
): Promise<string | null> {
  const dir = await findCacheDir(parent, kind)
  if (!dir) return null

  const read = async (name: string): Promise<string | null> => {
    try {
      const file = await dir.getFileHandle(name)
      const blob = await file.getFile()
      return await blob.text()
    } catch {
      return null
    }
  }

  const direct = await read(cacheFileName(kind, key))
  if (direct !== null) return direct

  if (!legacyKey || legacyKey === key) return null
  const old = await read(cacheFileName(kind, legacyKey))
  if (old === null) return null
  // 旧键命中：搬到新键，再删旧键；搬失败也先把内容交给调用方
  await writeCache(parent, kind, key, old)
  await removeCache(parent, kind, legacyKey)
  return old
}

/**
 * 带 mtime 的草稿读取：只有比磁盘文件新时才提示恢复。
 * 既有 readCache 语义不变。
 */
export async function readCacheText(
  parent: FileSystemDirectoryHandle,
  kind: CacheKind,
  key: string,
): Promise<{ text: string; mtime: number } | null> {
  const dir = await findCacheDir(parent, kind)
  if (!dir) return null
  try {
    const handle = await dir.getFileHandle(cacheFileName(kind, key))
    const file = await handle.getFile()
    return { text: await file.text(), mtime: file.lastModified }
  } catch {
    return null
  }
}

/** 删缓存；文件不存在算成功。 */
export async function removeCache(
  parent: FileSystemDirectoryHandle,
  kind: CacheKind,
  key: string,
): Promise<void> {
  const dir = await findCacheDir(parent, kind)
  if (!dir) return

  try {
    await dir.removeEntry(cacheFileName(kind, key))
  } catch {
    // NotFoundError 说明缓存本来就不在；别的错误也不往上抛
  }
}
