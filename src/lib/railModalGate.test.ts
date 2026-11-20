import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

/**
 * 第 119 轮 A2：B-249 的静态接线门。
 *
 * 「App 级对话框开着时两个只读面板不挂载」靠三处接线同时成立：
 * ① `App.tsx` 渲染期谓词 `appDialogOpen`（十个模态态，含宿主草稿确认）；
 * ② 通过 `appDialogOpen={appDialogOpen}` 交给 `MarginRail` 一次；
 * ③ `MarginRail.tsx` 的「对比」与「在审」两个挂载谓词各带 `!appDialogOpen`，且对比面板的 portal
 *    条件用 `diffOpen`（前段 `diffData !== null` 只供 TS 收窄）。
 *
 * 少接一处不会报错：面板照旧挂到 body、z 60 压住 `.overlay` 的 40，还各自把 `#root` 设成 inert，
 * 键盘就再也够不着确认框（第 119 轮 finder 实测 `.tmp/r119-finder4.json`）。所以这里按源码文本判红。
 *
 * 这是文本门不是行为门：行为证据见 `.tmp/e2e-r119-a1-stack.mjs --phase before|after`
 * （before 7/7 复现旧态、after 34/34）与 `docs/iteration/round-119/impl.md`。
 */

/** 先摘注释：注释里写选择器/状态名不算接线（touchTargets.test.ts 同一口径） */
const source = (path: string): string =>
  readFileSync(path, 'utf8').replace(/\/\*[\s\S]*?\*\//g, ' ')

const appSource = source('src/App.tsx')
const railSource = source('src/components/MarginRail.tsx')

const count = (haystack: string, needle: string): number => haystack.split(needle).length - 1

/** 取 `needle` 起的一段，给「谓词里到底有哪几项」按项断言用 */
const sliceFrom = (haystack: string, needle: string, length: number): string => {
  const at = haystack.indexOf(needle)
  assert.ok(at >= 0, `找不到「${needle}」`)
  return haystack.slice(at, at + length)
}

test('App.tsx：appDialogOpen 定义恰一处，谓词含 hostDraftPrompt 与九个既有模态态', () => {
  assert.equal(count(appSource, 'const appDialogOpen'), 1, 'appDialogOpen 只许有一个定义处')
  assert.equal(count(appSource, 'appDialogOpen ='), 1, '不许第二个 appDialogOpen 赋值')
  const block = sliceFrom(appSource, 'const appDialogOpen', 700)
  const states = [
    'settingsOpen',
    'shortcutsOpen',
    'globalSearch',
    'quickOpen',
    'pendingConfirm !== null',
    'pendingSwitch !== null',
    'sourceConfirm !== null',
    'draftPrompt !== null',
    'closeGuardOpen',
    'hostDraftPrompt !== null',
  ]
  const missing = states.filter((name) => !block.includes(name))
  assert.deepEqual(missing, [], `appDialogOpen 漏了这些模态态：${missing.join('、')}`)
})

test('App.tsx：谓词只通过 appDialogOpen={appDialogOpen} 交给 MarginRail 一次', () => {
  assert.equal(
    count(appSource, 'appDialogOpen={appDialogOpen}'),
    1,
    'MarginRail 的 appDialogOpen 入参只许写一次',
  )
  const rail = sliceFrom(appSource, '<MarginRail', 400)
  assert.ok(rail.includes('appDialogOpen={appDialogOpen}'), '<MarginRail> 的第一眼就要看到让位谓词')
})

test('MarginRail.tsx：Props 与解构各一处（漏了就是 always undefined）', () => {
  assert.equal(count(railSource, 'appDialogOpen: boolean'), 1, 'Props 里 appDialogOpen 只许声明一次')
  assert.equal(count(railSource, 'appDialogOpen,'), 1, '解构里 appDialogOpen 只许写一次')
})

test('MarginRail.tsx：两个只读面板的挂载谓词都带 !appDialogOpen', () => {
  assert.ok(
    railSource.includes("const diffOpen = diffData !== null && railTab === 'notes' && !appDialogOpen"),
    '「对比」的 diffOpen 必须带 !appDialogOpen',
  )
  assert.ok(
    railSource.includes("const reviewActive = reviewOpen && railTab === 'notes' && !appDialogOpen"),
    '「在审」的 reviewActive 必须带 !appDialogOpen',
  )
  assert.ok(count(railSource, '!appDialogOpen') >= 2, '两个面板各要一处 !appDialogOpen')
})

test('MarginRail.tsx：对比面板的 portal 条件走 diffOpen，不再是 railTab === notes', () => {
  assert.match(
    railSource,
    /\{diffData !== null &&\s+diffOpen &&\s+createPortal\(/,
    'portal 条件必须是 diffData !== null && diffOpen（前段只供 TS 收窄）',
  )
})

test('MarginRail.tsx：换文档清掉对比数据（让位期间不挂载也要清）', () => {
  assert.match(
    railSource,
    /setSnapData\(null\)\s+setDiffData\(null\)\s*\}, \[docName\]\)/,
    'docName effect 里要 setDiffData(null)：关掉对话框回来时不许挂上一篇的 diff',
  )
})
