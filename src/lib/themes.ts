/**
 * 主题清单（第 55 轮 B-105，MVP）：一套内置主题 = 一个 `data-theme` id + 一串 CSS 变量 + 显示名。
 *
 * 为什么清单与 styles.css 各写一份：CSS 是真正上屏的地方（刷新时在 JS 之前就生效，不闪底色），
 * 清单是设置面板的列表与对比度自查的入口。两份值必须逐项一致，`themes.test.ts` 读 styles.css 对照，
 * 对不上就红——「清单值 = computed 值」不靠人眼。
 *
 * 深色/浅色/跟随系统三档不在这里：那是主题模式（THEME_MODES），由 `data-theme` 的 light/dark/system 表达。
 */

export const BUILTIN_THEMES = [
  {
    /** 与 `data-theme` 属性值、styles.css 里的选择器一致 */
    id: 'sepia',
    /** 设置面板里显示的名字 */
    name: '暖纸',
    /** CSS 变量 → 值；必须与 styles.css 的 `html[data-theme='<id>']` 块逐项相同 */
    vars: {
      '--paper': '#f4e8d2',
      '--paper-raised': '#fbf3e3',
      '--panel': '#efe2c9',
      '--ink': '#3a2f21',
      '--ink-soft': '#6b5d48',
      '--ink-faint': '#736349',
      '--line': '#ddcbaa',
      '--line-strong': '#cbb58e',
      '--accent': '#7a5a2a',
      '--accent-ink': '#64471f',
      '--accent-wash': '#eee0c2',
      '--mark': '#8a5420',
      '--mark-wash': '#f0dfc0',
      '--mark-bg': '#ecd7a6',
      '--note': '#4a6a7a',
      '--note-wash': '#e9e3d5',
      '--warn': '#96432c',
      '--danger': '#a8402f',
      '--on-accent': '#fffdf7',
      '--on-mark': '#fffdf7',
      '--line-input': '#8a7a62',
      '--mark-strong': '#7a5423',
      '--focus-color': '#7a5a2a',
      '--focus-ring': '2px solid #7a5a2a',
      '--shadow': 'rgba(60, 45, 25, 0.08)',
      'color-scheme': 'light',
    },
  },
] as const

export type BuiltinTheme = (typeof BUILTIN_THEMES)[number]
export type BuiltinThemeId = BuiltinTheme['id']

/** 三档主题模式：与内置主题一起构成设置里的单选组 */
export const THEME_MODES = ['light', 'dark', 'system'] as const

export type ThemeMode = (typeof THEME_MODES)[number]

/** 主题选择的合法值：三档模式或清单里的内置主题 id */
export type ThemeChoice = ThemeMode | BuiltinThemeId

export function isThemeChoice(value: unknown): value is ThemeChoice {
  if (typeof value !== 'string') return false
  if ((THEME_MODES as readonly string[]).includes(value)) return true
  return BUILTIN_THEMES.some((theme) => theme.id === value)
}

export function themeById(id: string): BuiltinTheme | undefined {
  return BUILTIN_THEMES.find((theme) => theme.id === id)
}

/** 相对亮度（WCAG 2.x），用于「正文与纸底 ≥4.5:1」的自查 */
export function luminance(hex: string): number {
  const value = hex.replace('#', '')
  const channels = [0, 2, 4].map((offset) => parseInt(value.slice(offset, offset + 2), 16) / 255)
  const linear = channels.map((channel) =>
    channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
  )
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2]
}

/** 两个颜色的对比度（≥4.5 是 WCAG AA 正文门槛） */
export function contrastRatio(foreground: string, background: string): number {
  const a = luminance(foreground)
  const b = luminance(background)
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
}
