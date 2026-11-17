import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import { BUILTIN_THEMES, contrastRatio, isThemeChoice, luminance, themeById } from './themes.ts'

/**
 * 第 55 轮 B-105：主题清单与 styles.css 必须逐项一致。
 * 这条测试就是「computed --paper = 清单值」的静态证据：浏览器按 CSS 算，CSS 与清单相同。
 */

/** 抽出 `html[data-theme='<id>'] { ... }` 那一段里的自定义属性 */
function cssThemeVars(id: string): Record<string, string> {
  const css = readFileSync('src/styles.css', 'utf8')
  const start = css.indexOf(`html[data-theme='${id}'] {`)
  assert.ok(start >= 0, `styles.css 里找不到 html[data-theme='${id}'] 块`)
  const end = css.indexOf('}', start)
  const block = css.slice(start, end)
  const vars: Record<string, string> = {}
  for (const line of block.split('\n')) {
    const match = /^\s*(--[\w-]+|color-scheme):\s*([^;]+);/.exec(line)
    if (match) vars[match[1]] = match[2].trim()
  }
  return vars
}

test('sepia 主题的每个变量都与 styles.css 一致', () => {
  const theme = themeById('sepia')
  assert.ok(theme, '清单里应有 sepia')
  const css = cssThemeVars('sepia')
  assert.deepEqual(Object.keys(theme.vars).sort(), Object.keys(css).sort(), '清单与 CSS 的变量集合不同')
  for (const [name, value] of Object.entries(theme.vars)) {
    assert.equal(css[name], value, `${name} 两份值不一致`)
  }
})

test('sepia 的正文与纸底对比度 ≥4.5:1（WCAG AA）', () => {
  const theme = themeById('sepia')
  assert.ok(theme)
  const ratio = contrastRatio(theme.vars['--ink'], theme.vars['--paper'])
  assert.ok(ratio >= 4.5, `对比度 ${ratio.toFixed(2)} < 4.5`)
})

test('主题清单：id 唯一、名字非空、纸底是浅色', () => {
  const ids = BUILTIN_THEMES.map((theme) => theme.id)
  assert.equal(new Set(ids).size, ids.length)
  for (const theme of BUILTIN_THEMES) {
    assert.ok(theme.name.trim().length > 0)
    // 暖纸是浅色底：亮度要明显高于正文色，否则深色主题不该挂在浅色档
    assert.ok(luminance(theme.vars['--paper']) > luminance(theme.vars['--ink']))
    assert.equal(theme.vars['color-scheme'], 'light')
  }
})

test('主题选择只认三档模式与清单里的 id，别的一律回落默认', () => {
  assert.equal(isThemeChoice('light'), true)
  assert.equal(isThemeChoice('dark'), true)
  assert.equal(isThemeChoice('system'), true)
  assert.equal(isThemeChoice('sepia'), true)
  assert.equal(isThemeChoice('midnight'), false)
  assert.equal(isThemeChoice(''), false)
  assert.equal(isThemeChoice(undefined), false)
  assert.equal(isThemeChoice(3), false)
})
