/**
 * 保存前的「磁盘现状」快照（第 51 轮 F1）。
 *
 * 以前每次保存都先 `getFile().text()` 整篇读回旧文件，只为写盘期间身份变了时回滚。
 * 1 MB 文档保存因此要读 1 MB。这里记住「磁盘上现在是什么」：只要字节数与 mtime
 * 都对得上，就直接拿内存里那份旧正文回滚，不读盘；对不上再读全文。
 */
export type DiskSnapshot = {
  /** 磁盘上这份文件的正文 */
  text: string
  /** UTF-8 字节数，与 `File.size` 同口径 */
  size: number
  /** 文件最后修改时间；null 表示还没读到（未知就不能复用） */
  mtime: number | null
}

/** 以 UTF-8 计字节，和 `File.size` 对齐 */
export function byteLength(text: string): number {
  return new TextEncoder().encode(text).length
}

/** 记一份已知的磁盘正文；mtime 由调用方随后异步补 */
export function diskSnapshot(text: string, mtime: number | null = null): DiskSnapshot {
  return { text, size: byteLength(text), mtime }
}

/**
 * 快照能代表磁盘现状就返回它的正文，否则返回 null 让调用方读全文。
 * `''` 是有效正文（空文件），所以不能用假值判断。
 */
export function reusableDiskText(entry: DiskSnapshot | null, size: number, mtime: number): string | null {
  if (!entry || entry.mtime === null) return null
  if (entry.size !== size || entry.mtime !== mtime) return null
  return entry.text
}
