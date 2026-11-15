import type { WorkspaceFileNode } from './workspace.ts'

export type TrashResult = {
  ok: boolean
  trashName?: string
  mode?: 'move' | 'copy'
  error?: string
}

const RESERVED = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\..*)?$/i
const UNSAFE = /[<>:"/\\|?*\u0000-\u001f]/g

/** Windows 文件名清洗：非法字符换成 -，保留名加 _，去尾部点与空格，整名 ≤120 */
export function sanitizeTrashName(name: string): string {
  const dot = name.lastIndexOf('.')
  const extension = dot > 0 ? name.slice(dot) : ''
  const base = dot > 0 ? name.slice(0, dot) : name
  let cleaned = base.replace(UNSAFE, '-').replace(/-+/g, '-').replace(/^[.\s]+|[.\s]+$/g, '')
  if (cleaned.length === 0) cleaned = 'file'
  if (RESERVED.test(cleaned)) cleaned = `_${cleaned}`
  const room = Math.max(1, 120 - extension.length)
  return `${cleaned.slice(0, room)}${extension}`
}

function stamp(date = new Date()): string {
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`
}

function randomSuffix(): string {
  let value = ''
  const cryptoObject = globalThis.crypto
  if (cryptoObject?.getRandomValues) {
    const bytes = new Uint8Array(4)
    cryptoObject.getRandomValues(bytes)
    value = [...bytes].map((byte) => byte.toString(36)).join('').slice(0, 6)
  } else {
    value = Math.random().toString(36).slice(2, 8)
  }
  return (value || Math.random().toString(36).slice(2, 6)).slice(0, 6)
}

/** 回收站文件名：YYYYMMDD-HHmmss-<随机 4–6 位 base36>-<清洗名> */
export function trashName(name: string): string {
  const prefix = `${stamp()}-${randomSuffix()}-`
  return `${prefix}${sanitizeTrashName(name).slice(0, Math.max(1, 120 - prefix.length))}`
}

type TrashDirResult = { dir: FileSystemDirectoryHandle | null; error?: string }

/** 工作区根目录下的 .sidelight/trash；.sidelight 是文件/无权限时返回可显示的原因 */
export async function ensureTrashDir(root: FileSystemDirectoryHandle): Promise<TrashDirResult> {
  try {
    const cacheDir = await root.getDirectoryHandle('.sidelight', { create: false })
    const trash = await cacheDir.getDirectoryHandle('trash', { create: true })
    return { dir: trash }
  } catch (error) {
    const name = error instanceof DOMException ? error.name : ''
    if (name === 'TypeMismatchError') return { dir: null, error: '.sidelight 是一个文件，无法创建回收站。' }
    if (name === 'NotAllowedError') return { dir: null, error: '没有写入这个文件夹的权限，删除不可用。' }
    if (name === 'NotFoundError') {
      try {
        const cacheDir = await root.getDirectoryHandle('.sidelight', { create: true })
        const trash = await cacheDir.getDirectoryHandle('trash', { create: true })
        return { dir: trash }
      } catch (second) {
        return { dir: null, error: `无法创建回收站：${second instanceof Error ? second.message : '未知错误'}` }
      }
    }
    return { dir: null, error: `无法创建回收站：${error instanceof Error ? error.message : '未知错误'}` }
  }
}

async function sha256(buffer: ArrayBuffer): Promise<string> {
  if (!globalThis.crypto?.subtle) return ''
  const digest = await globalThis.crypto.subtle.digest('SHA-256', buffer)
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

async function parentForPath(root: FileSystemDirectoryHandle, path: string): Promise<FileSystemDirectoryHandle> {
  const parts = path.split('/').filter(Boolean)
  // workspace 的 path 以根目录名开头（如「工作区/笔记/a.md」），找父目录时要去掉它
  if (parts[0] === root.name) parts.shift()
  let dir = root
  for (const part of parts.slice(0, -1)) {
    dir = await dir.getDirectoryHandle(part)
  }
  return dir
}

type MovableFileHandle = FileSystemFileHandle & {
  move?: (directory: FileSystemDirectoryHandle, name?: string) => Promise<void>
}

/** 复制到回收站并逐字节核对 SHA-256；失败时清掉半成品、保留原件 */
async function copyThenVerify(source: FileSystemFileHandle, parent: FileSystemDirectoryHandle, name: string, trashDir: FileSystemDirectoryHandle, finalName: string): Promise<TrashResult> {
  let target: FileSystemFileHandle | null = null
  try {
    const buffer = await (await source.getFile()).arrayBuffer()
    target = await trashDir.getFileHandle(finalName, { create: true })
    const writable = await target.createWritable()
    await writable.write(buffer)
    await writable.close()
    const copied = await (await target.getFile()).arrayBuffer()
    const [before, after] = await Promise.all([sha256(buffer), sha256(copied)])
    if (!before || before !== after || copied.byteLength !== buffer.byteLength) {
      await trashDir.removeEntry(finalName).catch(() => undefined)
      return { ok: false, error: '复制后内容校验不一致，已保留原文件。' }
    }
    await parent.removeEntry(name)
    return { ok: true, trashName: finalName, mode: 'copy' }
  } catch (error) {
    if (target) await trashDir.removeEntry(finalName).catch(() => undefined)
    return { ok: false, error: `删除失败：${error instanceof Error ? error.message : '未知错误'}` }
  }
}

/** 只删文件：优先 move()，否则 copy → SHA-256 校验 → remove；目录不提供入口 */
export async function deleteFileToTrash(root: FileSystemDirectoryHandle, node: WorkspaceFileNode): Promise<TrashResult> {
  if (!node.handle) return { ok: false, error: '这个文件没有磁盘句柄，无法移到回收站。' }
  let trashDir: FileSystemDirectoryHandle
  try {
    const ensured = await ensureTrashDir(root)
    if (!ensured.dir) return { ok: false, error: ensured.error ?? '回收站不可用。' }
    trashDir = ensured.dir
  } catch (error) {
    return { ok: false, error: `回收站不可用：${error instanceof Error ? error.message : '未知错误'}` }
  }

  let parent: FileSystemDirectoryHandle
  try {
    parent = await parentForPath(root, node.path)
  } catch (error) {
    return { ok: false, error: `找不到原文件所在目录：${error instanceof Error ? error.message : '未知错误'}` }
  }

  const finalName = trashName(node.name)
  const movable = node.handle as MovableFileHandle
  if (typeof movable.move === 'function') {
    try {
      await movable.move(trashDir, finalName)
      return { ok: true, trashName: finalName, mode: 'move' }
    } catch {
      // move 不支持/跨实现失败：走复制校验回退
    }
  }
  return copyThenVerify(node.handle, parent, node.name, trashDir, finalName)
}

/** 撤销：把 trash 里的文件移回原路径（优先 move，否则复制+校验后删 trash 副本） */
export async function restoreFromTrash(root: FileSystemDirectoryHandle, trashNameValue: string, targetPath: string): Promise<TrashResult> {
  try {
    const ensured = await ensureTrashDir(root)
    if (!ensured.dir) return { ok: false, error: ensured.error ?? '回收站不可用。' }
    const trashDir = ensured.dir
    const source = await trashDir.getFileHandle(trashNameValue)
    const parts = targetPath.split('/').filter(Boolean)
    // 与 deleteFileToTrash 一致：去掉 workspace 根目录名
    if (parts[0] === root.name) parts.shift()
    let parent = root
    for (const part of parts.slice(0, -1)) parent = await parent.getDirectoryHandle(part, { create: true })
    const name = parts[parts.length - 1]
    const movable = source as MovableFileHandle
    if (typeof movable.move === 'function') {
      await movable.move(parent, name)
      return { ok: true, mode: 'move' }
    }
    let target: FileSystemFileHandle | null = null
    try {
      const buffer = await (await source.getFile()).arrayBuffer()
      target = await parent.getFileHandle(name, { create: true })
      const writable = await target.createWritable()
      await writable.write(buffer)
      await writable.close()
      const copied = await (await target.getFile()).arrayBuffer()
      const [before, after] = await Promise.all([sha256(buffer), sha256(copied)])
      if (!before || before !== after) {
        await parent.removeEntry(name).catch(() => undefined)
        return { ok: false, error: '恢复后内容校验不一致，trash 副本仍在。' }
      }
      await trashDir.removeEntry(trashNameValue)
      return { ok: true, mode: 'copy' }
    } catch (error) {
      if (target) await parent.removeEntry(name).catch(() => undefined)
      return { ok: false, error: `恢复失败：${error instanceof Error ? error.message : '未知错误'}` }
    }
  } catch (error) {
    return { ok: false, error: `恢复失败：${error instanceof Error ? error.message : '未知错误'}` }
  }
}
