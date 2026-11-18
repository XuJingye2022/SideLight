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

/* ---------- 第 78 轮 B-160：打印纸面不出现露出定界符 ---------- */

type LocatedRule = { selector: string; body: string; at: number }

/** 带位置切规则：注释先摘掉，否则注释里提到的选择器会被当成一条规则 */
const locatedRules = (): LocatedRule[] =>
  [...readFileSync('src/styles.css', 'utf8').matchAll(/([^{}]*)\{([^{}]*)\}/g)].map((match) => ({
    selector: match[1].replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\s+/g, ' ').trim(),
    body: match[2].replace(/\s+/g, ' '),
    at: match.index ?? 0,
  }))

/** `@media print` 块的 [起点, 终点]：括号配对取匹配的右花括号，全文只有这一个打印块 */
const printRange = (): [number, number] => {
  const css = readFileSync('src/styles.css', 'utf8')
  const start = css.indexOf('@media print')
  assert.ok(start >= 0, 'styles.css 里找不到 @media print')
  let depth = 0
  for (let i = start; i < css.length; i += 1) {
    if (css[i] === '{') depth += 1
    else if (css[i] === '}') {
      depth -= 1
      if (depth === 0) return [start, i]
    }
  }
  assert.fail('@media print 块的花括号没有配对')
}

const REVEAL_SELECTOR = /sl-math-reveal|sl-eq-delim/

const splitSelectors = (selector: string): string[] =>
  selector
    .split(',')
    .map((part) => part.replace(/\s+/g, ' ').trim())
    .filter(Boolean)

const P = '.doc-body .tiptap-mathematics-render.sl-math-reveal'
const P_INLINE_AFTER = `${P}[data-type='inline-math']::after`
const P_BLOCK = `${P}[data-type='block-math']`
const P_BLOCK_AFTER = `${P}[data-type='block-math']::after`
/** 第 79 轮 B-161：`==` 的定界符从伪元素改成两条 `Decoration.widget`，打印直接藏元素 */
const EQ_DELIM = '.doc-body .sl-eq-delim'
const P_KATEX = `${P} > .katex`
const P_BLOCK_INNER = `${P} > .block-math-inner`

test('打印块的露出恢复规则与屏幕露出规则逐条对应，且整块都排在屏幕规则之后', () => {
  const [printStart, printEnd] = printRange()
  const reveal = locatedRules().filter((rule) => REVEAL_SELECTOR.test(rule.selector))
  const screen = reveal.filter((rule) => rule.at < printStart)
  const print = reveal.filter((rule) => rule.at > printStart && rule.at < printEnd)

  // 屏幕侧：公式 6 条（`:2129`、`:2136`、`:2140`、`:2144`、`:2148-2149` 两条）+ 定界符 1 条 = 7，
  // 第 79 轮 B-161 起 `==` 定界符是一条选择器（widget），不再有 ::before/::after 两条重复。
  const screenSelectors = screen.flatMap((rule) => splitSelectors(rule.selector))
  assert.equal(screenSelectors.length, 7, '屏幕露出规则按逗号拆应为 7 条（公式 6 + 定界符 1）')
  const screenSet = [...new Set(screenSelectors)].sort()
  assert.equal(screenSet.length, 7, `屏幕露出选择器去重后应为 7 条：${screenSet.join(' | ')}`)

  const printSet = [...new Set(print.flatMap((rule) => splitSelectors(rule.selector)))].sort()
  assert.deepEqual(printSet, screenSet, '打印块的恢复规则必须与屏幕露出规则逐字同一组选择器（少一条就漏一个定界符）')

  // 同权重靠顺序胜出：整块起点晚于每一条屏幕露出规则，写成简写也不会被屏幕规则翻回来
  for (const rule of screen) {
    assert.ok(printStart > rule.at, `打印块起点 ${printStart} 应晚于屏幕露出规则 ${rule.at}（${rule.selector}）`)
  }
})

test('打印块的恢复声明：公式定界符 content:none、`==` widget display:none、公式可见、块根居中、顶栏仍隐藏', () => {
  const [printStart, printEnd] = printRange()
  const print = locatedRules().filter((rule) => rule.at > printStart && rule.at < printEnd)
  const findPrint = (selector: string): Map<string, string> => {
    const rule = print.find((candidate) => splitSelectors(candidate.selector).includes(selector))
    assert.ok(rule, `打印块里找不到选择器「${selector}」`)
    return declarations(rule)
  }

  const root = findPrint(P)
  assert.equal(root.get('font-family'), 'inherit', '露出态是等宽字体，纸面要回到正文')
  assert.equal(root.get('font-size'), 'inherit')
  assert.equal(root.get('color'), 'inherit', '露出态用强调色，纸面要回到正文色')
  assert.equal(root.get('white-space'), 'normal', '露出态是 pre-wrap，纸面要正常折行')
  assert.equal(findPrint(P_BLOCK).get('text-align'), 'center', '屏幕露出态是 left，纸面回到块级公式的居中')

  const delimiters = print.find((rule) =>
    splitSelectors(rule.selector).includes(P_INLINE_AFTER),
  )
  assert.ok(delimiters, '打印块里找不到定界符规则')
  assert.deepEqual(
    [...new Set(splitSelectors(delimiters.selector))].sort(),
    [P_BLOCK_AFTER, P_INLINE_AFTER].sort(),
    '两个公式定界符必须在同一个规则块里一起关掉，漏一个就会把 `$…$` 打进纸面',
  )
  assert.equal(declarations(delimiters).get('content'), 'none')

  // 第 79 轮 B-161：`==` 定界符是 widget 元素，纸面用 display:none 收掉（不再靠 content:none）
  assert.equal(findPrint(EQ_DELIM).get('display'), 'none', '`==` 定界符 widget 在纸面要藏掉')
  assert.equal(findPrint(P_KATEX).get('display'), 'inline', '屏幕露出时 KaTeX 成品被 display:none 收起，打印要放回来')
  assert.equal(findPrint(P_BLOCK_INNER).get('display'), 'block')
  assert.equal(findPrint('.topbar').get('display'), 'none !important', '顶栏在纸面上仍要隐藏')
})
