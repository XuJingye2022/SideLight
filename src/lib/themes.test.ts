import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import { BUILTIN_THEMES, contrastRatio, isThemeChoice, luminance, themeById } from './themes.ts'

/**
 * 第 55 轮 B-105：主题清单与 styles.css 必须逐项一致。
 * 这条测试就是「computed --paper = 清单值」的静态证据：浏览器按 CSS 算，CSS 与清单相同。
 */

/** 抽出某个选择器块里的自定义属性；选择器连大括号一起给，例如 `html[data-theme='sepia']` */
function cssVars(selector: string): Record<string, string> {
  const css = readFileSync('src/styles.css', 'utf8')
  const start = css.indexOf(`${selector} {`)
  assert.ok(start >= 0, `styles.css 里找不到 ${selector} 块`)
  const end = css.indexOf('}', start)
  const block = css.slice(start, end)
  const vars: Record<string, string> = {}
  for (const line of block.split('\n')) {
    const match = /^\s*(--[\w-]+|color-scheme):\s*([^;]+);/.exec(line)
    if (match) vars[match[1]] = match[2].trim()
  }
  return vars
}

function cssThemeVars(id: string): Record<string, string> {
  return cssVars(`html[data-theme='${id}']`)
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

test('暖纸的弱文字对纸底与侧栏都 ≥4.5:1（第 57 轮 B-118）', () => {
  const vars = cssVars("html[data-theme='sepia']")
  const paper = contrastRatio(vars['--ink-faint'], vars['--paper'])
  const panel = contrastRatio(vars['--ink-faint'], vars['--panel'])
  assert.ok(paper >= 4.5, `--ink-faint 在 --paper 上只有 ${paper.toFixed(3)}:1`)
  assert.ok(panel >= 4.5, `--ink-faint 在 --panel 上只有 ${panel.toFixed(3)}:1`)
  // 层次不能反过来：亮底上的弱文字必须比 --ink-soft 更浅（亮度更高）
  assert.ok(luminance(vars['--ink-faint']) > luminance(vars['--ink-soft']), '--ink-faint 应比 --ink-soft 浅')
})

test('浅色与深色档的 --ink-faint 也 ≥4.5:1（同口径回归）', () => {
  const rows: [string, string][] = [['浅色', ':root'], ['深色', "html[data-theme='dark']"]]
  for (const [name, selector] of rows) {
    const vars = cssVars(selector)
    for (const surface of ['--paper', '--panel']) {
      const ratio = contrastRatio(vars['--ink-faint'], vars[surface])
      assert.ok(ratio >= 4.5, `${name}的 --ink-faint 在 ${surface} 上只有 ${ratio.toFixed(3)}:1`)
    }
  }
})

test('弱文字的两个入口都吃 --ink-faint（改 token 才会跟着变）', () => {
  const css = readFileSync('src/styles.css', 'utf8')
  for (const selector of ['.status-chip-quiet', '.file-tree-empty-sub']) {
    const start = css.indexOf(`${selector} {`)
    assert.ok(start >= 0, `styles.css 里找不到 ${selector}`)
    const block = css.slice(start, css.indexOf('}', start))
    assert.match(block, /color:\s*var\(--ink-faint\)/, `${selector} 没有用 --ink-faint`)
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
