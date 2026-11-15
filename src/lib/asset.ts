// 文件名主体只留这些字符，其余一律换成 -
const UNSAFE_BODY = /[^a-zA-Z0-9\u4e00-\u9fa5_-]/g

// 扩展名只接受这些字符，防止名字里带出 / 之类的路径分隔符
const SAFE_EXTENSION = /^[a-zA-Z0-9]+$/

// 主体太长会让路径难读，超过这个长度就截断
const MAX_BODY_LENGTH = 40

const DEFAULT_BODY = 'image'

const DEFAULT_EXTENSION = 'png'

// 连续 - 合并成一条，再去掉首尾的 -，截断后末尾可能又出现 -
function safeBody(name: string): string {
  const cleaned = name
    .replace(UNSAFE_BODY, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, MAX_BODY_LENGTH)
    .replace(/-+$/g, '')
  return cleaned || DEFAULT_BODY
}

/**
 * 把原文件名变成可以落盘的图片名：保留扩展名，主体去掉不安全字符，再加时间戳的 base36 前缀防重名。
 * 没有扩展名、或扩展名带不安全字符时补 .png；原名为空时主体用 image。
 */
export function assetFileName(originalName: string, timestamp: number): string {
  const dot = originalName.lastIndexOf('.')
  const hasExtension = dot > 0
  const body = hasExtension ? originalName.slice(0, dot) : originalName
  const extension = hasExtension ? originalName.slice(dot + 1) : ''
  const safeExtension = SAFE_EXTENSION.test(extension) ? extension : DEFAULT_EXTENSION

  return `${timestamp.toString(36)}-${safeBody(body)}.${safeExtension}`
}

/**
 * 把图片写进文档旁边的 assets/ 目录，返回正文里要用的相对路径。
 */
export async function writeAsset(
  dir: FileSystemDirectoryHandle,
  fileName: string,
  blob: Blob,
): Promise<string> {
  const assets = await dir.getDirectoryHandle('assets', { create: true })
  const file = await assets.getFileHandle(fileName, { create: true })
  const writable = await file.createWritable()
  await writable.write(blob)
  await writable.close()
  return `assets/${fileName}`
}
