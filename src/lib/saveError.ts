/**
 * 保存失败的文案：Chromium File System Access 的 DOMException 会把 W3C 英文原文
 * 直接甩给用户（`NoModificationAllowedError` 的 message 是一整句英文），
 * 而且原来的提示既不说是什么文件、也不给一条走得通的下一步。
 * 这里按 DOMException 的 name 翻成中文，并告诉调用方要不要挂「另存为」按钮。
 *
 * 真实触发场景（都会落到 `NoModificationAllowedError` 一类）：
 * 文件被别的程序占用、文件或文件夹只读、没有写入权限、文件已被移走、磁盘满。
 */

/** 调用方拿到这句话直接进提示条：`canSaveAs` 为真时挂「另存为」 */
export type SaveFailure = {
  text: string
  canSaveAs: boolean
}

/** 拿不到文件名时的兜底称呼 */
const FALLBACK_DOC_NAME = '当前文档'

/** 取 DOMException 的名称：测试与宿主回包可能是普通对象，取不到 name 就当没有 */
function nameOf(error: unknown): string {
  if (typeof DOMException !== 'undefined' && error instanceof DOMException) return error.name
  const name = (error as { name?: unknown } | null | undefined)?.name
  return typeof name === 'string' ? name : ''
}

/** 取原始 message：普通对象也认，空串当没有 */
function messageOf(error: unknown): string {
  if (error instanceof Error && error.message) return error.message
  const message = (error as { message?: unknown } | null | undefined)?.message
  return typeof message === 'string' ? message : ''
}

/**
 * 把一次保存失败翻成中文、可执行的一句话。
 * 文案顺序固定：先说发生了什么，再说下一步。
 */
export function describeSaveFailure(error: unknown, docName: string): SaveFailure {
  const name = (typeof docName === 'string' ? docName : '').trim() || FALLBACK_DOC_NAME
  const failureName = nameOf(error)

  switch (failureName) {
    case 'NoModificationAllowedError':
      return {
        text: `保存失败：系统不允许改写「${name}」。常见原因是文件被别的程序占用、文件夹只读，或应用没有这个位置的写入权限。请用「另存为」换一个位置。`,
        canSaveAs: true,
      }
    case 'NotAllowedError':
      return {
        text: `保存失败：没有写入「${name}」的权限。请重新打开这个文件夹并允许写入，或用「另存为」保存副本。`,
        canSaveAs: true,
      }
    case 'NotFoundError':
      return {
        text: `保存失败：「${name}」已经不在原位置（被移动或删除）。请用「另存为」保存副本。`,
        canSaveAs: true,
      }
    case 'QuotaExceededError':
      return {
        text: `保存失败：磁盘空间不足，没有写入「${name}」。请清理空间后重试，或用「另存为」换一个位置。`,
        canSaveAs: true,
      }
    case 'InvalidStateError':
    case 'SecurityError': {
      // 这两类内部原因差别太大：把 name 与原始 message 一起带上，别自己编原因
      const message = messageOf(error)
      const detail = message ? `${failureName}：${message}` : failureName
      return {
        text: `保存失败：系统拒绝了这次写入（${detail}）。改动还在，可以用「另存为」保存副本。`,
        canSaveAs: true,
      }
    }
    default:
      break
  }

  // 普通 Error：保留原口径，说明改动还在
  const message = messageOf(error)
  if (error instanceof Error && message) {
    return { text: `保存失败：${message}。改动还在，可以再试一次。`, canSaveAs: true }
  }
  return { text: '保存失败：原因未知。改动还在，可以再试一次。', canSaveAs: true }
}
