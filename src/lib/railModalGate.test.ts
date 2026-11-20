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
const diffSource = source('src/components/RailDiffPanel.tsx')
const reviewSource = source('src/components/RailReviewPanel.tsx')

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

test('MarginRail.tsx：只读面板（在审）的挂载谓词带 !appDialogOpen', () => {
  // 第 139 轮 B-229：面板改按开合挂载（lazy chunk），谓词从「数据非空」换成「点开过」的状态
  // 第 140 轮 A2：「对比」搬去 App 的全宽模式，右栏只剩「在审」这一处让位谓词
  assert.ok(
    railSource.includes("const reviewActive = reviewOn && railTab === 'notes' && !appDialogOpen"),
    '「在审」的 reviewActive 必须带 !appDialogOpen',
  )
  assert.equal(count(railSource, '!appDialogOpen'), 1, '右栏只剩在审面板一处 !appDialogOpen')
})

test('MarginRail.tsx：在审面板的挂载条件走 reviewActive，portal 与焦点接管在面板文件里', () => {
  // 第 139 轮 B-229：portal 跟面板一起搬出；MarginRail 只剩「开关 + 就地 Suspense」这一层
  assert.match(railSource, /\{reviewActive && \(\s*<RailReviewPanel/, '挂载条件必须是 reviewActive（打开状态 × 页签 × 让位）')
  assert.ok(reviewSource.includes('createPortal('), 'portal 应在 RailReviewPanel.tsx')
  assert.ok(
    reviewSource.includes("useDialogFocus(true, sheetRef, '.rail-review-overlay')"),
    '焦点接管跟面板走',
  )
  // 第 140 轮 A2：全宽对比不是模态——不许再走 portal / useDialogFocus
  assert.ok(!diffSource.includes('createPortal('), '全宽对比不该再挂 body')
  assert.ok(!diffSource.includes('useDialogFocus('), '全宽对比不该接管焦点')
})

test('MarginRail.tsx：换文档清掉在审面板的打开态（让位期间不挂载也不留上一篇）', () => {
  assert.match(
    railSource,
    /setReviewOn\(false\)\s*\}, \[docName\]\)/,
    'docName effect 里要把在审面板收掉：关掉对话框回来时不许还是上一篇的面板',
  )
  // 第 140 轮 A2：对比的换篇重置搬去 App（docInstance effect）
  assert.match(appSource, /setDiffOpen\(false\)\s*\}, \[docInstance\]\)/, '对比面板换篇要收掉（P1-1）')
})

/*
 * 第 131 轮 B-262：右侧只读面板开着时 App 级快捷键穿透。
 * 面板是 MarginRail 的组件内 state，App 看不见，于是 window keydown 照常执行 Ctrl+Z/Ctrl+K/Ctrl+F，
 * 正文被改、焦点被送进遮罩后的输入框。修法是按键里按 DOM 事实取模态态（`.rail-diff-overlay`），
 * 与 `dialogOpen` 走同一个吞键分支。这里按源码文本把五处接线钉死。
 */

test('App.tsx：只读面板的模态态由唯一一处 querySelector 判定', () => {
  assert.equal(count(appSource, '.rail-diff-overlay'), 1, '选择器只许出现一次（多一处就多一个真源）')
  assert.ok(
    appSource.includes("const railModal = document.querySelector('.rail-diff-overlay, #diff-view') !== null"),
    '模态态必须按 DOM 事实取：在审面板挂 body、全宽对比是 main 的子节点，App state 看不见',
  )
})

test('App.tsx：撤销组合键只判一次，且带 altKey 守卫', () => {
  assert.equal(count(appSource, 'const undoCombo'), 1, 'undoCombo 只许定义一次')
  assert.ok(
    appSource.includes("const undoCombo = mod && !event.altKey && (key === 'z' || key === 'y')"),
    "撤销/重做组合必须是 mod+z|y 且不带 alt（AltGr 等输入法键不吞）",
  )
})

test('App.tsx：吞键分支把只读面板并入 dialogOpen', () => {
  assert.ok(
    appSource.includes('if (dialogOpen || railModal) {'),
    '只许一个吞键分支：只读面板与对话框同口径，不许另开一条 early return',
  )
  assert.equal(count(appSource, 'if (dialogOpen || railModal)'), 1, '吞键分支只许一处')
})

test('App.tsx：撤销默认动作只对只读面板吞，不对所有模态态吞', () => {
  assert.ok(
    appSource.includes('if (productCombo || customId !== null || (railModal && undoCombo)) event.preventDefault()'),
    'preventDefault 条件必须含 railModal && undoCombo：对话框里的输入框仍要有原生撤销',
  )
  assert.ok(!appSource.includes('if (undoCombo) event.preventDefault()'), '不许单独吞 undoCombo')
})

test('App.tsx：Escape 仍在吞键分支之前处理（Esc 照旧先关面板）', () => {
  const escAt = appSource.indexOf("if (event.key === 'Escape') {")
  const swallowAt = appSource.indexOf('if (dialogOpen || railModal) {')
  assert.ok(escAt >= 0, '找不到 Escape 分支')
  assert.ok(swallowAt > escAt, '吞键分支必须在 Escape 之后，否则一次 Esc 关不掉面板')
})
