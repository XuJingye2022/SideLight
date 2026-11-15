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
  /** 停笔 2 秒自动保存（默认开；有结构损失时只提示，不写） */
  autoSave: boolean
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
  autoSave: true,
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
        parsed.searchProvider === 'tavily' || parsed.searchProvider === 'bocha' ? parsed.searchProvider : 'off',
      searchApiKey: parsed.searchApiKey ?? '',
      analysisPrompt:
        typeof parsed.analysisPrompt === 'string' && parsed.analysisPrompt.trim().length > 0
          ? parsed.analysisPrompt
          : DEFAULT_ANALYSIS_PROMPT,
      autoSave: parsed.autoSave !== false,
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
