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

/** 把前景色按 alpha 铺在背景上（sRGB 逐通道四舍五入）：算 hover 的合成底 */
function mix(fg: string, bg: string, alpha: number): string {
  const rgb = (hex: string) => [0, 2, 4].map((offset) => parseInt(hex.replace('#', '').slice(offset, offset + 2), 16))
  const front = rgb(fg)
  const back = rgb(bg)
  return `#${front
    .map((channel, index) => Math.round(channel * alpha + back[index] * (1 - alpha)).toString(16).padStart(2, '0'))
    .join('')}`
}

test('暖纸文件列表的悬停底与当前行底上，10.5px 路径仍 ≥4.5:1（第 61 轮 B3）', () => {
  const vars = cssVars("html[data-theme='sepia']")
  // 悬停底 = accent-wash 70% 铺在侧栏底 panel 上；当前行是实色 accent-wash（最坏底）
  const hover = mix(vars['--accent-wash'], vars['--panel'], 0.7)
  const rows: [string, string][] = [
    ['悬停合成底', hover],
    ['当前行实色底', vars['--accent-wash']],
  ]
  for (const [name, background] of rows) {
    const ratio = contrastRatio(vars['--ink-faint'], background)
    assert.ok(ratio >= 4.5, `${name}上 --ink-faint 只有 ${ratio.toFixed(3)}:1`)
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

/** 抽出某个规则块里的普通声明（只看 `属性: 值;` 行） */
function ruleDeclarations(selector: string): Record<string, string> {
  const css = readFileSync('src/styles.css', 'utf8')
  const start = css.indexOf(`${selector} {`)
  assert.ok(start >= 0, `styles.css 里找不到 ${selector}`)
  const block = css.slice(css.indexOf('{', start) + 1, css.indexOf('}', start))
  const declarations: Record<string, string> = {}
  for (const line of block.split('\n')) {
    const match = /^\s*([a-z-]+):\s*(.+);\s*$/.exec(line)
    if (match) declarations[match[1]] = match[2].trim()
  }
  return declarations
}

/** 把 var(--x) 与 color-mix(in srgb, var(--x) N%, var(--y)) 换成实色，才算得出对比度 */
function resolveColor(value: string, vars: Record<string, string>): string {
  const direct = /^var\((--[\w-]+)\)$/.exec(value)
  if (direct) return vars[direct[1]]
  const mixed = /^color-mix\(in srgb, var\((--[\w-]+)\) (\d+)%, var\((--[\w-]+)\)\)$/.exec(value)
  if (mixed) return mix(vars[mixed[1]], vars[mixed[3]], Number(mixed[2]) / 100)
  assert.fail(`认不出的颜色写法：${value}`)
}

test('批注五档紧急度的字色与底色在三套主题下都 ≥4.5:1（第 95 轮 B-222）', () => {
  const tiers = ['none', 'low', 'medium', 'high', 'urgent']
  const styles: Record<string, Record<string, string>> = { none: ruleDeclarations('.note-priority') }
  for (const tier of tiers.slice(1)) styles[tier] = ruleDeclarations(`.note-priority-${tier}`)

  const themes: [string, string][] = [
    ['浅色', ':root'],
    ['暖纸', "html[data-theme='sepia']"],
    ['深色', "html[data-theme='dark']"],
  ]
  const table: string[] = []
  for (const [name, selector] of themes) {
    const vars = cssVars(selector)
    for (const tier of tiers) {
      const declarations = styles[tier]
      assert.ok(declarations.color, `${tier} 没写字色`)
      assert.ok(declarations.background, `${tier} 没写底色`)
      const ratio = contrastRatio(
        resolveColor(declarations.color, vars),
        resolveColor(declarations.background, vars),
      )
      table.push(`${name}/${tier}=${ratio.toFixed(2)}`)
      assert.ok(ratio >= 4.5, `${name}的 ${tier} 只有 ${ratio.toFixed(3)}:1`)
    }
  }
  // 15 对全算过：档位数或主题数被改少时这里先红
  assert.equal(table.length, 15, table.join(' '))
})

test('批注四态字色与底色在三套主题下都 ≥4.5:1（第 97 轮 B-224）', () => {
  // wont-fix 与 open 共用基础配色：CSS 里没有单独规则，这里也按同一份声明算
  const base = ruleDeclarations('.note-status')
  const styles: Record<string, Record<string, string>> = {
    open: base,
    'in-progress': ruleDeclarations('.note-status-in-progress'),
    resolved: ruleDeclarations('.note-status-resolved'),
    'wont-fix': base,
  }

  const themes: [string, string][] = [
    ['浅色', ':root'],
    ['暖纸', "html[data-theme='sepia']"],
    ['深色', "html[data-theme='dark']"],
  ]
  const table: string[] = []
  for (const [name, selector] of themes) {
    const vars = cssVars(selector)
    for (const [status, declarations] of Object.entries(styles)) {
      assert.ok(declarations.color, `${status} 没写字色`)
      assert.ok(declarations.background, `${status} 没写底色`)
      const ratio = contrastRatio(
        resolveColor(declarations.color, vars),
        resolveColor(declarations.background, vars),
      )
      table.push(`${name}/${status}=${ratio.toFixed(2)}`)
      assert.ok(ratio >= 4.5, `${name}的 ${status} 只有 ${ratio.toFixed(3)}:1`)
    }
  }
  // 12 对全算过：四态或主题数被改少时这里先红
  assert.equal(table.length, 12, table.join(' '))
})
