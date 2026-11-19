import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

/**
 * 第 107 轮 A1：右侧三个小钮的可点口径（B-236）。
 *
 * `.rail-diff-open` / `.rail-review-open` / `.rail-chat-reset` 原来只有 35×16、35×16、52.5×21，
 * 低于 24×24 的机械口径。这里按 `mathStyle.test.ts` 的做法切 `styles.css` 的规则块：
 * 先摘注释再按块取声明，**按块**断言——全文出现 `min-height: 24px` 十次，只测「全文有这个属性」会假绿。
 *
 * 数值口径：`*{box-sizing:border-box}`（`styles.css` 全局 reset），所以 `min-height: 24px` 就是总高 24。
 * 浏览器项（真实矩形、`.rail-tabs` 下移 8px 的已知偏差）在 `.tmp/e2e-r107-targets.mjs` 与
 * `docs/iteration/round-107/impl.md` 里记，单测只管静态声明。
 */

type CssRule = { selector: string; selectors: string[]; body: string }

const DIFF = '.rail-diff-open'
const REVIEW = '.rail-review-open'
const RESET = '.rail-chat-reset'
const HEAD = '.rail-head'
/** 24×24 可点口径；两个入口宽 35，`新对话` 宽 52.5，宽度本轮不动 */
const MIN_TARGET = 24

const rules = (): CssRule[] => {
  const css = readFileSync('src/styles.css', 'utf8')
  const out: CssRule[] = []
  for (const match of css.matchAll(/([^{}]*)\{([^{}]*)\}/g)) {
    // 注释里也会提到选择器：先摘掉注释再判，免得把注释算成一条规则
    const selector = match[1].replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\s+/g, ' ').trim()
    if (selector.length === 0) continue
    out.push({
      selector,
      selectors: selector
        .split(',')
        .map((part) => part.replace(/\s+/g, ' ').trim())
        .filter(Boolean),
      body: match[2].replace(/\s+/g, ' '),
    })
  }
  return out
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

/** 只认 px：`24px` → 24。写成 `1.5rem` 之类会让口径随字号漂移，直接判红 */
const pxValue = (value: string): number => {
  const match = /^(-?\d+(?:\.\d+)?)px$/.exec(value.trim())
  assert.ok(match, `尺寸只认 px 值，实际「${value}」`)
  return Number(match[1])
}

/** 规则块里写到的高度：`min-height` 与 `height` 都算，至少写一个，且都不小于口径 */
const targetSizes = (rule: CssRule): { declared: string[]; small: string[] } => {
  const decl = declarations(rule)
  const declared: string[] = []
  const small: string[] = []
  for (const property of ['min-height', 'height']) {
    const value = decl.get(property)
    if (value === undefined) continue
    declared.push(`${property}: ${value}`)
    if (pxValue(value) < MIN_TARGET) small.push(`${property}: ${value}`)
  }
  return { declared, small }
}

test('「对比」「在审」在同一规则块，min-height ≥24（写了 height 也须 ≥24）', () => {
  const shared = rules().find(
    (rule) => rule.selectors.length === 2 && rule.selectors.includes(DIFF) && rule.selectors.includes(REVIEW),
  )
  assert.ok(
    shared,
    `styles.css 里必须有一条规则块同时写 ${DIFF} 与 ${REVIEW}（两条分开写会各写各的高度，迟早漂）`,
  )
  const { declared, small } = targetSizes(shared)
  assert.ok(declared.length > 0, `${DIFF} / ${REVIEW} 的规则块要写 min-height（24×24 口径）`)
  assert.deepEqual(small, [], `两个入口的可点高度必须 ≥${MIN_TARGET}px，现在：${small.join('、')}`)
})

test('「新对话」同口径 ≥24，且 margin-left:auto 撑着右对齐', () => {
  const rule = rules().find((candidate) => candidate.selectors.includes(RESET))
  assert.ok(rule, `styles.css 里找不到 ${RESET} 规则块`)
  const { declared, small } = targetSizes(rule)
  assert.ok(declared.length > 0, `${RESET} 要写 min-height（24×24 口径）`)
  assert.deepEqual(small, [], `${RESET} 的可点高度必须 ≥${MIN_TARGET}px，现在：${small.join('、')}`)
  assert.equal(declarations(rule).get('margin-left'), 'auto', '「新对话」靠 margin-left:auto 贴右侧，不能被顺手删掉')
})

test('.rail-head 不写 height：钮高改不动行高，偏差只许来自子元素', () => {
  const rule = rules().find((candidate) => candidate.selectors.length === 1 && candidate.selectors[0] === HEAD)
  assert.ok(rule, `styles.css 里找不到 ${HEAD} 规则块`)
  const decl = declarations(rule)
  assert.equal(
    decl.get('height'),
    undefined,
    `${HEAD} 不许定高：定高会把 24px 的钮裁掉，或让「空态 15 / 带卡 16」这类写法回潮`,
  )
})
