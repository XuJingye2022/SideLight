import { DEFAULT_ANALYSIS_PROMPT } from './prompt.ts'
import type { SearchProvider } from './search.ts'

export type ThemeMode = 'light' | 'dark' | 'system'

export type Settings = {
  baseUrl: string
  apiKey: string
  model: string
  /** 正文字号，像素 */
  fontSize: number
  /** 浅色 / 深色 / 跟随系统 */
  theme: ThemeMode
  /** 联网核对用的搜索服务；off 表示不启用 */
  searchProvider: SearchProvider
  searchApiKey: string
  /** 批注用的系统提示词，用户可改 */
  analysisPrompt: string
  /** 默认提示词版本：用于把旧默认升级成新默认，不碰自定义 */
  promptVersion: number
  /** 停笔 2 秒自动保存（默认开；有结构损失时只提示，不写） */
  autoSave: boolean
  /** 键盘输入把直引号 / -- / ... / 中文后半角标点换成排版符，并自动配对括号引号 */
  smartPunctuation: boolean
}

const STORAGE_KEY = 'sidelight.settings.v1'

export const MIN_FONT_SIZE = 12
export const MAX_FONT_SIZE = 26

export const DEFAULT_SETTINGS: Settings = {
  baseUrl: 'https://api.deepseek.com/v1',
  apiKey: '',
  model: 'deepseek-chat',
  fontSize: 17,
  theme: 'system',
  searchProvider: 'off',
  searchApiKey: '',
  analysisPrompt: DEFAULT_ANALYSIS_PROMPT,
  promptVersion: 2,
  autoSave: true,
  smartPunctuation: true,
}

/** 旧默认提示词的指纹：长度 + FNV-1a；命中才升级，用户改过的不动 */
export const LEGACY_PROMPT_FINGERPRINT = '5967:3d38bf01'

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

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULT_SETTINGS }
    const parsed = JSON.parse(raw) as Partial<Settings>
    const savedPrompt = typeof parsed.analysisPrompt === 'string' ? parsed.analysisPrompt : ''
    const savedVersion = typeof parsed.promptVersion === 'number' ? parsed.promptVersion : 0
    const legacyDefault = savedPrompt.trim().length > 0 && promptFingerprint(savedPrompt) === LEGACY_PROMPT_FINGERPRINT
    const analysisPrompt =
      savedPrompt.trim().length === 0 || (savedVersion < 2 && legacyDefault)
        ? DEFAULT_ANALYSIS_PROMPT
        : savedPrompt
    return {
      baseUrl: parsed.baseUrl?.trim() || DEFAULT_SETTINGS.baseUrl,
      apiKey: parsed.apiKey ?? '',
      model: parsed.model?.trim() || DEFAULT_SETTINGS.model,
      fontSize: clampFontSize(parsed.fontSize ?? DEFAULT_SETTINGS.fontSize),
      theme:
        parsed.theme === 'light' || parsed.theme === 'dark' || parsed.theme === 'system'
          ? parsed.theme
          : DEFAULT_SETTINGS.theme,
      searchProvider:
        parsed.searchProvider === 'tavily' || parsed.searchProvider === 'bocha' || parsed.searchProvider === 'deepseek' ? parsed.searchProvider : 'off',
      searchApiKey: parsed.searchApiKey ?? '',
      analysisPrompt,
      promptVersion: analysisPrompt === DEFAULT_ANALYSIS_PROMPT ? 2 : savedVersion || 0,
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
