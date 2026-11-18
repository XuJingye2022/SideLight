import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

/**
 * 第 75 轮 A3：块级公式排版（B-159，用户反馈「行间公式不如 Typora 美观」）。
 *
 * 按规则块切 styles.css，只取「选择器含 [data-type='block-math'] 且不含 sl-math-reveal」的四块：
 * 根块、`.block-math-inner`、`.katex-display`、`.katex`。属性必须**按块**成对断言——同一属性
 * 全文出现多次（`overflow-x: auto` 6 处、`font-size: 1.08em` 2 处），只测「全文有这个属性」会假绿。
 * 浏览器项（真实长公式的 scrollWidth / 字号 px）另记 UNVERIFIED：CDP 9222–9226 不可用。
 */

type CssRule = { selector: string; body: string }

const blockMathRules = (): CssRule[] => {
  const css = readFileSync('src/styles.css', 'utf8')
  const rules: CssRule[] = []
  for (const match of css.matchAll(/([^{}]*)\{([^{}]*)\}/g)) {
    // 注释里也会提到选择器：先摘掉注释再判，免得把注释算成选择器
    const selector = match[1].replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\s+/g, ' ').trim()
    if (!selector.includes("[data-type='block-math']")) continue
    if (selector.includes('sl-math-reveal')) continue
    rules.push({ selector, body: match[2].replace(/\s+/g, ' ') })
  }
  return rules
}

const declarations = (rule: CssRule): Map<string, string> => {
  const map = new Map<string, string>()
  for (const part of rule.body.split(';')) {
    const at = part.indexOf(':')
    if (at < 0) continue
    map.set(part.slice(0, at).trim(), part.slice(at + 1).trim())
  }
  return map
}

const findRule = (rules: CssRule[], suffix: string): CssRule => {
  const rule = rules.find((candidate) => candidate.selector.endsWith(suffix))
  assert.ok(rule, `styles.css 里找不到选择器以「${suffix}」结尾的块级公式规则`)
  return rule
}

test('块级公式的四个规则块都在，根块外边距、内层横向滚动、KaTeX 字号不变', () => {
  const rules = blockMathRules()
  assert.equal(
    rules.length,
    4,
    `选择器含 [data-type='block-math'] 且不含 sl-math-reveal 的规则块应为 4，实际 ${rules.length}：${rules
      .map((rule) => rule.selector)
      .join(' | ')}`,
  )
  const root = declarations(findRule(rules, "[data-type='block-math']"))
  assert.equal(root.get('margin'), '1.4em 0', '根块外边距是 Typora 段落外边距的对照值，不能被顺手改掉')
  const inner = declarations(findRule(rules, '.block-math-inner'))
  assert.equal(inner.get('overflow-x'), 'auto', '长公式要靠这一层横向滚动')
  const katex = declarations(findRule(rules, '.katex'))
  assert.equal(katex.get('font-size'), '1.08em', '块级公式字号定案 1.08em（第 75 轮 A3）')
})

test('.katex-display 居中且超宽可滚：margin / width / min-width 三项成对', () => {
  const display = declarations(findRule(blockMathRules(), '.katex-display'))
  assert.equal(display.get('margin'), '0 auto')
  assert.equal(display.get('width'), 'fit-content')
  assert.equal(display.get('min-width'), '100%')
})
