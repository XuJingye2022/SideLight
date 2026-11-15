export type RenameValidation = { ok: true; name: string } | { ok: false; error: string }

const RESERVED = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\..*)?$/i
const MARKDOWN = /\.(md|markdown)$/i

/** 只允许同目录文件名：空名、非法字符、保留名、非 Markdown 都原地拒绝 */
export function validateRename(raw: string, oldName: string): RenameValidation {
  const name = raw.trim()
  if (name.length === 0) return { ok: false, error: '文件名不能为空。' }
  if (name.includes('\\')) return { ok: false, error: '文件名不能含反斜杠。' }
  if (/[<>:"/|?*]/.test(name)) return { ok: false, error: '文件名不能含 < > : " / | ? *。' }
  if (/[\u0000-\u001f]/.test(name)) return { ok: false, error: '文件名不能含控制字符。' }
  if (/[. ]$/.test(name)) return { ok: false, error: '文件名不能以点或空格结尾。' }
  if (name.startsWith('.')) return { ok: false, error: '文件名不能以点开头。' }
  const dot = name.lastIndexOf('.')
  const base = dot > 0 ? name.slice(0, dot) : name
  if (RESERVED.test(base)) return { ok: false, error: '这是 Windows 保留名，请换一个。' }
  if (name === oldName) return { ok: false, error: '名字没有变化。' }
  if (dot > 0 && !MARKDOWN.test(name)) {
    return { ok: false, error: '保留 .md 结尾，否则文件会从树里消失。' }
  }
  const withExtension = MARKDOWN.test(name) ? name : `${name}.md`
  if (withExtension.length > 120) return { ok: false, error: '文件名太长（上限 120 字符）。' }
  if (!MARKDOWN.test(withExtension)) return { ok: false, error: '保留 .md 结尾，否则文件会从树里消失。' }
  return { ok: true, name: withExtension }
}

export type ProbeResult = 'free' | 'same' | 'taken' | 'unknown'

/** getFileHandle(create:false) 探测；同句柄视为仅大小写改名，允许继续 */
export async function probeTarget(
  parent: FileSystemDirectoryHandle,
  name: string,
  source: FileSystemFileHandle,
): Promise<ProbeResult> {
  try {
    const target = await parent.getFileHandle(name, { create: false })
    try {
      const same = await (source as FileSystemFileHandle & {
        isSameEntry?: (other: FileSystemFileHandle) => Promise<boolean>
      }).isSameEntry?.(target)
      return same ? 'same' : 'taken'
    } catch {
      return 'unknown'
    }
  } catch (error) {
    const code = error instanceof DOMException ? error.name : ''
    if (code === 'NotFoundError') return 'free'
    if (code === 'NotAllowedError') return 'unknown'
    return 'unknown'
  }
}

export type RenameResult =
  | { ok: true; name: string }
  | { ok: false; error: string; partialName?: string }

type Movable = FileSystemFileHandle & { move?: (name: string) => Promise<void> }

function moveErrorCopy(error: unknown): string {
  if (error instanceof DOMException) {
    if (error.name === 'InvalidModificationError') return '目标已存在，没有覆盖它。'
    if (error.name === 'NotAllowedError') return '没有改名权限。'
    if (error.name === 'NotFoundError') return '原文件或目标目录不见了。'
  }
  if (error instanceof TypeError) return '文件名不合法（可能含反斜杠或系统不接受这个写法）。'
  return `改名失败：${error instanceof Error && error.message ? error.message : '未知错误'}。`
}

async function attemptMove(handle: FileSystemFileHandle, name: string): Promise<RenameResult> {
  const movable = handle as Movable
  if (typeof movable.move !== 'function') {
    return { ok: false, error: '这个浏览器不支持文件改名（没有 move）。' }
  }
  try {
    await movable.move(name)
    return { ok: true, name }
  } catch (error) {
    return { ok: false, error: moveErrorCopy(error) }
  }
}

/**
 * 同目录改名：两道探测 + move，失败不复制不删源。
 * 仅大小写改名走「临时名 → 目标名」；第二段失败时保留临时名并如实返回 partialName。
 */
export async function renameFile(
  parent: FileSystemDirectoryHandle,
  handle: FileSystemFileHandle,
  oldName: string,
  newName: string,
  probeHook?: () => Promise<void>,
): Promise<RenameResult> {
  const first = await probeTarget(parent, newName, handle)
  if (first === 'taken') return { ok: false, error: '已有同名文件，没有覆盖它。' }
  if (first === 'unknown') return { ok: false, error: '无法确认目标文件名是否被占用，已拒绝。' }

  if (probeHook) await probeHook()
  const second = await probeTarget(parent, newName, handle)
  if (second === 'taken') return { ok: false, error: '刚才出现了同名文件，请重试。' }
  if (second === 'unknown') return { ok: false, error: '无法确认目标文件名是否被占用，已拒绝。' }

  const onlyCase = oldName.toLowerCase() === newName.toLowerCase() && oldName !== newName
  if (!onlyCase) return attemptMove(handle, newName)

  const stamp = Date.now().toString(36)
  const temporary = `.rename-${stamp}-${newName}`
  const firstLeg = await attemptMove(handle, temporary)
  if (!firstLeg.ok) return firstLeg
  const secondLeg = await attemptMove(handle, newName)
  if (secondLeg.ok) return secondLeg
  // 第二段失败：临时名已经生效，不谎称回滚
  return {
    ok: false,
    error: `已改为临时名 ${temporary}，第二段改名失败：${secondLeg.error} 请手动改回或改成目标名。`,
    partialName: temporary,
  }
}
