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

// 键太长会让路径难读，超过这个长度就截断
const MAX_KEY_LENGTH = 40

const DEFAULT_KEY = 'untitled'

/**
 * 把文件名变成缓存键：去掉扩展名，非安全字符换成 -，连续 - 合并，首尾的 - 去掉，超长截断。
 * 键为空时用 untitled。
 */
export function cacheKey(fileName: string): string {
  const dot = fileName.lastIndexOf('.')
  const body = dot > 0 ? fileName.slice(0, dot) : fileName
  const cleaned = body
    .replace(UNSAFE_KEY, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, MAX_KEY_LENGTH)
    .replace(/-+$/g, '')
  return cleaned || DEFAULT_KEY
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
 * 读缓存。文件不存在返回 null；其它错误（无权限、内容读不出来）也返回 null，不抛。
 */
export async function readCache(
  parent: FileSystemDirectoryHandle,
  kind: CacheKind,
  key: string,
): Promise<string | null> {
  const dir = await findCacheDir(parent, kind)
  if (!dir) return null

  try {
    const file = await dir.getFileHandle(cacheFileName(kind, key))
    const blob = await file.getFile()
    return await blob.text()
  } catch {
    return null
  }
}

/**
 * 删缓存。文件不存在算删成功；无权限等错误也吞掉，不抛。
 */
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
