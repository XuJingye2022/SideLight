export type LastSession =
  | { kind: 'workspace'; handle: FileSystemDirectoryHandle; name: string; path: string }
  | { kind: 'file'; handle: FileSystemFileHandle; name: string }

export type SessionPermission = 'granted' | 'prompt' | 'denied' | 'unknown'

const DB_NAME = 'sidelight.session'
const STORE = 'handles'
const KEY = 'last'

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE)
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('IndexedDB 打不开'))
  })
}

/** 只存 FSA 句柄与路径；不存正文、不存批注 */
export async function saveSession(session: LastSession): Promise<void> {
  try {
    const db = await openDb()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite')
      tx.objectStore(STORE).put(session, KEY)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error ?? new Error('写入会话失败'))
    })
    db.close()
  } catch {
    // IndexedDB 不可用时静默降级
  }
}

export async function loadSession(): Promise<LastSession | null> {
  try {
    const db = await openDb()
    const value = await new Promise<LastSession | null>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly')
      const request = tx.objectStore(STORE).get(KEY)
      request.onsuccess = () => resolve((request.result as LastSession | undefined) ?? null)
      request.onerror = () => reject(request.error ?? new Error('读取会话失败'))
    })
    db.close()
    if (!value || (value.kind !== 'workspace' && value.kind !== 'file') || !value.handle) return null
    return value
  } catch {
    return null
  }
}

/** queryPermission 不存在时按 granted（宿主/旧实现没有这个 API） */
export async function permissionOf(handle: FileSystemHandle): Promise<SessionPermission> {
  const query = (handle as FileSystemHandle & {
    queryPermission?: (descriptor: { mode: 'readwrite' }) => Promise<PermissionState>
  }).queryPermission
  if (typeof query !== 'function') return 'granted'
  try {
    const state = await query.call(handle, { mode: 'readwrite' })
    return state === 'granted' || state === 'prompt' || state === 'denied' ? state : 'unknown'
  } catch {
    return 'unknown'
  }
}

export type RestorePlan =
  | { action: 'host' }
  | { action: 'restore'; session: LastSession }
  | { action: 'confirm'; session: LastSession }
  | { action: 'none' }

/** 启动顺序：宿主文档优先；会话 granted 静默恢复；prompt 只提示；其余走 localStorage */
export function restorePlan(
  hostDoc: boolean,
  session: LastSession | null,
  permission: SessionPermission,
): RestorePlan {
  if (hostDoc) return { action: 'host' }
  if (!session) return { action: 'none' }
  if (permission === 'granted') return { action: 'restore', session }
  if (permission === 'prompt') return { action: 'confirm', session }
  return { action: 'none' }
}
