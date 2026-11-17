import { DEFAULT_USER_PROMPT } from './prompt.ts'
import type { SearchProvider } from './search.ts'

export type ThemeMode = 'light' | 'dark' | 'system'

export type Settings = {
  baseUrl: string
  apiKey: string
  model: string
  /** 正文字号，像素 */
  fontSize: number
  /** 整页缩放，百分比：只缩界面与正文，不改 --editor-size（第 51 轮 B-001） */
  pageZoom: number
  /** 浅色 / 深色 / 跟随系统 */
  theme: ThemeMode
  /** 联网核对用的搜索服务；off 表示不启用 */
  searchProvider: SearchProvider
  searchApiKey: string
  /** 作者偏好与检查重点，设置里可改；格式与安全规则在 prompt.ts 的内置 system 里，改不到 */
  userPrompt: string
  /** 默认 user 提示词版本：用于把旧默认升级成新默认，不碰自定义 */
  promptVersion: number
  /** 停笔 2 秒自动保存（默认开；有结构损失时只提示，不写） */
  autoSave: boolean
  /** 键盘输入把直引号 / -- / ... / 中文后半角标点换成排版符，并自动配对括号引号 */
  smartPunctuation: boolean
}

const STORAGE_KEY = 'sidelight.settings.v1'

export const MIN_FONT_SIZE = 12
export const MAX_FONT_SIZE = 26

/** 整页缩放范围与步长（百分比）；与正文字号的 12–26 px 是两条独立的链 */
export const MIN_PAGE_ZOOM = 50
export const MAX_PAGE_ZOOM = 200
export const PAGE_ZOOM_STEP = 10

export const DEFAULT_SETTINGS: Settings = {
  baseUrl: 'https://api.deepseek.com/v1',
  apiKey: '',
  model: 'deepseek-chat',
  fontSize: 17,
  pageZoom: 100,
  theme: 'system',
  searchProvider: 'off',
  searchApiKey: '',
  userPrompt: DEFAULT_USER_PROMPT,
  promptVersion: 3,
  autoSave: true,
  smartPunctuation: true,
}

/** 旧默认提示词的指纹（v1）：长度 + FNV-1a；命中才升级，用户改过的不动 */
export const LEGACY_PROMPT_FINGERPRINT = '5967:3d38bf01'
/** 第 26–34 轮的默认提示词指纹（v2，795 字，整段当 system 用）；拆分后命中就换成新的默认 user 提示词 */
export const LEGACY_PROMPT_FINGERPRINT_V2 = '795:ebaf07b2'

export function promptFingerprint(text: string): string {
  let hash = 2166136261
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index)
    hash = Math.imul(hash, 16777619) >>> 0
  }
  return `${text.length}:${hash.toString(16)}`
}

export function clampFontSize(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_SETTINGS.fontSize
  return Math.min(MAX_FONT_SIZE, Math.max(MIN_FONT_SIZE, Math.round(value)))
}

export function clampPageZoom(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_SETTINGS.pageZoom
  return Math.min(MAX_PAGE_ZOOM, Math.max(MIN_PAGE_ZOOM, Math.round(value)))
}

/** 落盘形状：新键 userPrompt；旧版把字段叫 analysisPrompt，读的时候兼容一次 */
type StoredSettings = Partial<Settings> & { analysisPrompt?: string }

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULT_SETTINGS }
    const parsed = JSON.parse(raw) as StoredSettings
    const savedPrompt =
      typeof parsed.userPrompt === 'string'
        ? parsed.userPrompt
        : typeof parsed.analysisPrompt === 'string'
          ? parsed.analysisPrompt
          : ''
    const savedVersion = typeof parsed.promptVersion === 'number' ? parsed.promptVersion : 0
    const fingerprint = savedPrompt.trim().length > 0 ? promptFingerprint(savedPrompt) : ''
    const legacyDefault = fingerprint === LEGACY_PROMPT_FINGERPRINT || fingerprint === LEGACY_PROMPT_FINGERPRINT_V2
    // 空值回落默认；旧默认（v1/v2）升级成新默认；自定义原样保留，绝不覆盖
    const userPrompt =
      savedPrompt.trim().length === 0 || (savedVersion < 3 && legacyDefault) ? DEFAULT_USER_PROMPT : savedPrompt
    return {
      baseUrl: parsed.baseUrl?.trim() || DEFAULT_SETTINGS.baseUrl,
      apiKey: parsed.apiKey ?? '',
      model: parsed.model?.trim() || DEFAULT_SETTINGS.model,
      fontSize: clampFontSize(parsed.fontSize ?? DEFAULT_SETTINGS.fontSize),
      // 旧存档没有这个键：读出来必须是 100，不能把整页放大成别倍
      pageZoom: clampPageZoom(parsed.pageZoom ?? DEFAULT_SETTINGS.pageZoom),
      theme:
        parsed.theme === 'light' || parsed.theme === 'dark' || parsed.theme === 'system'
          ? parsed.theme
          : DEFAULT_SETTINGS.theme,
      searchProvider:
        parsed.searchProvider === 'tavily' || parsed.searchProvider === 'bocha' || parsed.searchProvider === 'deepseek' ? parsed.searchProvider : 'off',
      searchApiKey: parsed.searchApiKey ?? '',
      userPrompt,
      promptVersion: userPrompt === DEFAULT_USER_PROMPT ? 3 : savedVersion || 0,
      autoSave: parsed.autoSave !== false,
      // 旧存档没有这个键，读出来必须是开（不能把老用户的功能默认关掉）
      smartPunctuation: parsed.smartPunctuation !== false,
    }
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

export function saveSettings(settings: Settings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
}

export function hasKey(settings: Settings): boolean {
  return settings.apiKey.trim().length > 0
}
