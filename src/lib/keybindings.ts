/**
 * 自定义快捷键（第 89 轮 B-107）：纯逻辑。
 *
 * 8 条命令可改键；其余键位固定，见 RESERVED_KEYBINDINGS（与 ShortcutsDialog 的清单同一份口径）。
 * 键位串的规范形是 `Ctrl+Alt+Shift+键` 的这个顺序：Ctrl 兼 ⌘，必须带 Ctrl 或 Alt，键限字母、数字与 `/`。
 * 冲突只有一条路：bindKey 先查保留键（label 给「加链接」这类固定键的名字），再查另一条命令的当前键位。
 */

export type KeyBindingId =
  | 'save'
  | 'find'
  | 'globalSearch'
  | 'quickOpen'
  | 'toggleSource'
  | 'togglePreview'
  | 'newDocument'
  | 'exportMenu'

/** 8 条命令的当前键位（都是 normalizeBinding 过的规范串） */
export type Keybindings = Record<KeyBindingId, string>

export type KeyBindingCommand = { id: KeyBindingId; label: string; keys: string }

/** 数组序 = 设置面板的行序 = resolveKeybindings 的折叠顺序 */
export const KEYBINDING_COMMANDS: readonly KeyBindingCommand[] = [
  { id: 'save', label: '保存', keys: 'Ctrl+S' },
  { id: 'find', label: '查找', keys: 'Ctrl+F' },
  { id: 'globalSearch', label: '全局搜索', keys: 'Ctrl+Shift+F' },
  { id: 'quickOpen', label: '快速打开文件', keys: 'Ctrl+P' },
  { id: 'toggleSource', label: '切换源码 / 编辑', keys: 'Ctrl+/' },
  { id: 'togglePreview', label: '切换预览', keys: 'Ctrl+Shift+P' },
  { id: 'newDocument', label: '新建文档', keys: 'Ctrl+Alt+N' },
  { id: 'exportMenu', label: '导出菜单', keys: 'Ctrl+Alt+E' },
]

export const DEFAULT_KEYBINDINGS: Keybindings = Object.fromEntries(
  KEYBINDING_COMMANDS.map((command) => [command.id, command.keys]),
) as Keybindings

/**
 * 固定键位（不能分给 8 条命令）。只收 normalizeBinding 能产出的形状：
 * `Ctrl+=`、`F11` 这类键位不在可改键的字符集里，天然改不到，不占表。
 */
export const RESERVED_KEYBINDINGS: readonly { keys: string; label: string }[] = [
  { keys: 'Ctrl+Alt+O', label: '打开文件' },
  { keys: 'Ctrl+Alt+Shift+O', label: '打开文件夹' },
  { keys: 'Ctrl+Alt+S', label: '另存为' },
  { keys: 'Ctrl+H', label: '查找' },
  { keys: 'Ctrl+K', label: '加链接' },
  { keys: 'Ctrl+M', label: '行内公式' },
  { keys: 'Ctrl+Shift+M', label: '块级公式' },
  { keys: 'Ctrl+B', label: '粗体' },
  { keys: 'Ctrl+I', label: '斜体' },
  { keys: 'Ctrl+E', label: '行内代码' },
  { keys: 'Ctrl+Shift+X', label: '删除线' },
  { keys: 'Ctrl+Shift+V', label: '粘贴为纯文本' },
  { keys: 'Ctrl+L', label: '删除表格行' },
  { keys: 'Ctrl+Shift+1', label: '大纲页签' },
  { keys: 'Ctrl+Shift+3', label: '文件页签' },
  { keys: 'Ctrl+Shift+L', label: '收起侧栏' },
  { keys: 'Ctrl+1', label: '标题 1' },
  { keys: 'Ctrl+2', label: '标题 2' },
  { keys: 'Ctrl+3', label: '标题 3' },
  { keys: 'Ctrl+4', label: '标题 4' },
  { keys: 'Ctrl+5', label: '标题 5' },
  { keys: 'Ctrl+6', label: '标题 6' },
  { keys: 'Ctrl+0', label: '正文' },
  { keys: 'Ctrl+Alt+0', label: '字号复位' },
  { keys: 'Ctrl+N', label: '新建窗口（浏览器保留）' },
  { keys: 'Ctrl+O', label: '打开文件（浏览器保留）' },
  { keys: 'Ctrl+Shift+S', label: '另存网页（浏览器保留）' },
  { keys: 'Ctrl+W', label: '关闭标签页（浏览器保留）' },
  { keys: 'Ctrl+T', label: '新标签页（浏览器保留）' },
]

const MODIFIER_ORDER = ['Ctrl', 'Alt', 'Shift'] as const

/** 键位串能不能当可改键：规范成 `Ctrl+Alt+Shift+键`，不认识就 null */
export function normalizeBinding(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const parts = raw
    .split('+')
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
  if (parts.length < 2 || parts.length > 4) return null
  const modifiers = new Set<string>()
  let key = ''
  for (const part of parts) {
    const lower = part.toLowerCase()
    const modifier =
      lower === 'ctrl' || lower === 'control' || lower === 'cmd' || lower === 'meta' || part === '⌘'
        ? 'Ctrl'
        : lower === 'alt' || lower === 'option' || part === '⌥'
          ? 'Alt'
          : lower === 'shift'
            ? 'Shift'
            : null
    if (modifier !== null) {
      modifiers.add(modifier)
      continue
    }
    if (key.length > 0) return null
    if (!/^[a-z0-9/]$/i.test(part)) return null
    key = part.toUpperCase()
  }
  // 必须带 Ctrl 或 Alt，且必须有键：Shift+字母、裸字母都不收（会和正文输入抢键）
  if (key.length === 0 || (!modifiers.has('Ctrl') && !modifiers.has('Alt'))) return null
  return [...MODIFIER_ORDER.filter((modifier) => modifiers.has(modifier)), key].join('+')
}

/** 按键事件的最小形状（不依赖 DOM 类型，单测可手写对象） */
export type KeyLike = {
  key: string
  ctrlKey?: boolean
  metaKey?: boolean
  altKey?: boolean
  shiftKey?: boolean
}

/** 事件 → 规范键位串；不可当快捷键的键（F11、Enter、裸字母、Shift+？）回 null */
export function bindingFromEvent(event: KeyLike): string | null {
  if (typeof event.key !== 'string' || event.key.length !== 1) return null
  const parts: string[] = []
  if (event.ctrlKey || event.metaKey) parts.push('Ctrl')
  if (event.altKey) parts.push('Alt')
  if (event.shiftKey) parts.push('Shift')
  parts.push(event.key)
  return normalizeBinding(parts.join('+'))
}

/** 严格匹配：修饰键全等（多按一个 Shift/Alt 就不算），字母不分大小写，⌘ 当 Ctrl */
export function matchBinding(event: KeyLike, binding: string): boolean {
  const normalized = normalizeBinding(binding)
  return normalized !== null && bindingFromEvent(event) === normalized
}

/** 事件命中的命令（按当前键位表），没命中回 null */
export function matchKeybinding(event: KeyLike, table: Keybindings): KeyBindingId | null {
  const pressed = bindingFromEvent(event)
  if (pressed === null) return null
  for (const command of KEYBINDING_COMMANDS) {
    if (table[command.id] === pressed) return command.id
  }
  return null
}

export type BindKeyResult = { ok: true; keys: string } | { ok: false; label: string; reason: string }

/**
 * 冲突单路：格式 → 保留键 → 另一条命令的当前键位。
 * 失败时 label 是被撞上的固定键/命令名（格式不对时为空串），reason 是给用户看的整句。
 */
export function bindKey(table: Keybindings, id: KeyBindingId, candidate: unknown): BindKeyResult {
  const keys = normalizeBinding(candidate)
  if (keys === null) return { ok: false, label: '', reason: '这个键位不支持：用 Ctrl 或 Alt 加字母、数字或 /' }
  const reserved = RESERVED_KEYBINDINGS.find((entry) => entry.keys === keys)
  if (reserved) return { ok: false, label: reserved.label, reason: `与「${reserved.label}」重复` }
  for (const command of KEYBINDING_COMMANDS) {
    if (command.id !== id && table[command.id] === keys) {
      return { ok: false, label: command.label, reason: `与「${command.label}」重复` }
    }
  }
  return { ok: true, keys }
}

/**
 * 存档值 → 8 条键位：缺键、非法值、未知 id、与固定键或前一条撞车，
 * 都按命令序逐个绑，失败的退回该命令的默认键（不会把整份设置清掉）。
 */
export function resolveKeybindings(stored: unknown): Keybindings {
  const resolved: Keybindings = { ...DEFAULT_KEYBINDINGS }
  if (stored === null || typeof stored !== 'object') return resolved
  const record = stored as Record<string, unknown>
  for (const command of KEYBINDING_COMMANDS) {
    const raw = record[command.id]
    if (raw === undefined) continue
    const bound = bindKey(resolved, command.id, raw)
    resolved[command.id] = bound.ok ? bound.keys : command.keys
  }
  return resolved
}
