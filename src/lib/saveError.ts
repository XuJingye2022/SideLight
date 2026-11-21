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

/**
 * 一直失败时的兜底提示（第 145 轮 A2）：用户现场是便携版以低完整性运行，
 * 写普通文件夹被 Windows 拒绝。这种情形换位置没用，得从正常桌面启动。
 * 不写英文、不写错误码：用户只需要知道「换一种启动方式」。
 */
const SANDBOX_HINT =
  '如果一直失败，请从正常桌面双击启动 Sidelight 再保存：受限账户或沙箱里，应用不能写普通文件夹。'

/** 写类错误（第 145 轮 A1）：`performCommit` 据此从「写当前文件夹失败」直接转「另存为」 */
const WRITE_DENIED_NAMES = [
  'NoModificationAllowedError',
  'NotAllowedError',
  'InvalidStateError',
  'SecurityError',
  'NotFoundError',
]

/** 这个错误是不是「写不进去」：是就给「另存为」当下一步，别只说一句失败 */
export function isWriteDenied(error: unknown): boolean {
  return WRITE_DENIED_NAMES.includes(nameOf(error))
}

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
 * 写盘失败的中文短原因（第 142 轮）：回收站、删除、缓存搬移、恢复、新建共用一句。
 * 只按错误类别说话，**不拼 `error.message`**：Chromium 的 DOMException 把 W3C 英文原文
 * 直接甩给用户，原文只留在错误对象里给调试用，不上屏。
 */
export function writeReasonOf(error: unknown): string {
  switch (nameOf(error)) {
    case 'NoModificationAllowedError':
      return '这个位置不允许写入'
    case 'NotAllowedError':
      return '没有写入这个位置的权限'
    case 'NotFoundError':
      return '这个位置已经不存在'
    case 'QuotaExceededError':
      return '磁盘空间不足'
    case 'InvalidStateError':
    case 'SecurityError':
      return '系统拒绝了这次写入'
    case 'TypeMismatchError':
      return '同名位置被一个文件占住了'
    case 'NotReadableError':
      return '读不到文件内容'
    default:
      return '原因未知'
  }
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
        text: `保存失败：系统不允许改写「${name}」。常见原因是文件被别的程序占用、文件夹只读，或应用没有这个位置的写入权限。请用「另存为」换一个位置。${SANDBOX_HINT}`,
        canSaveAs: true,
      }
    case 'NotAllowedError':
      return {
        text: `保存失败：没有写入「${name}」的权限。请重新打开这个文件夹并允许写入，或用「另存为」保存副本。${SANDBOX_HINT}`,
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
    case 'SecurityError':
      // 第 145 轮 A2：不再拼原始 message（那是 W3C/Chromium 英文），统一用中文短原因
      return {
        text: `保存失败：「${name}」没有写进去（${writeReasonOf(error)}）。改动还在，可以用「另存为」保存副本。${SANDBOX_HINT}`,
        canSaveAs: true,
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
