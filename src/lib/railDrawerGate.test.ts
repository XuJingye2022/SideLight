import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

/**
 * 第 126 轮 A1/A2：窄窗抽屉（1024×700）的静态接线门（第 123 轮 F1、计划 P1-2）。
 *
 * 四件事必须同时接上，少一处都不报错、只是行为退回去：
 * ① `App.tsx` 在窄窗、编辑视图、抽屉开着时把 `drawerOpen` 交给 `MarginRail`（宽度变化靠 resize→setTick）；
 * ② `MarginRail.tsx` 的 `<aside>` 按 `drawerOpen` 声明 `role=dialog` / `aria-modal`、可程序聚焦（tabIndex −1）、挂 `onKeyDown`；
 * ③ `onRailKeyDown` 只拦 Tab，按栏内 FOCUSABLE 的可见站收口；
 * ④ 字数明细（`StatsDetail`，z 40）与抽屉（背板 z 44）永不同时在场，关闭钮的标签跟页签。
 *
 * 这是文本门不是行为门：行为证据见 `.tmp/e2e-r126-drawer-focus.mjs` 与 `docs/iteration/round-126/impl.md`。
 * 按 `sliceFrom` 断切片而不是全文计数：`onKeyDown={`（既有 4 处内联）、`setStatsDetail(null)`（全篇 3 处）都会撞。
 */

/** 先摘块注释：注释里写选择器/状态名不算接线（railModalGate.test.ts 同一口径） */
const source = (path: string): string =>
  readFileSync(path, 'utf8').replace(/\/\*[\s\S]*?\*\//g, ' ')

const appSource = source('src/App.tsx')
const railSource = source('src/components/MarginRail.tsx')

const count = (haystack: string, needle: string): number => haystack.split(needle).length - 1

/** 取 `needle` 起的一段，给「这块里到底有什么」按项断言用 */
const sliceFrom = (haystack: string, needle: string, length: number): string => {
  const at = haystack.indexOf(needle)
  assert.ok(at >= 0, `找不到「${needle}」`)
  return haystack.slice(at, at + length)
}

test('App.tsx：抽屉谓词只交给 MarginRail 一次，且含 railOpen / 编辑视图 / 窄窗 matchMedia', () => {
  assert.equal(count(appSource, 'drawerOpen='), 1, 'MarginRail 的 drawerOpen 入参只许写一次')
  const rail = sliceFrom(appSource, '<MarginRail', 600)
  assert.ok(rail.includes('appDialogOpen={appDialogOpen}'), '<MarginRail> 的让位谓词要还在')
  assert.ok(rail.includes('drawerOpen={railOpen'), 'drawerOpen 必须跟 railOpen 走')
  assert.ok(rail.includes("viewMode === 'edit'"), '预览/源码态不渲染页边栏，谓词要带编辑视图')
  assert.ok(rail.includes("window.matchMedia('(max-width: 1119px)')"), '宽度判定要与抽屉背板同一断点')
})

test('MarginRail.tsx：Props 与解构各一处（漏了就是 always undefined）', () => {
  assert.equal(count(railSource, 'drawerOpen: boolean'), 1, 'Props 里 drawerOpen 只许声明一次')
  assert.equal(count(railSource, 'drawerOpen,'), 1, '解构里 drawerOpen 只许写一次')
})

test('MarginRail.tsx：aside 带条件 role/aria-modal、tabIndex −1 与 onKeyDown', () => {
  const aside = sliceFrom(railSource, '<aside', 700)
  assert.ok(aside.includes("role={drawerOpen ? 'dialog' : undefined}"), 'role 只在抽屉态声明 dialog')
  assert.ok(aside.includes('aria-modal={drawerOpen'), 'aria-modal 必须跟 drawerOpen 走（宽窗要消失）')
  assert.ok(aside.includes('tabIndex={-1}'), '点 .rail-title 要能把焦点落到 aside 根')
  assert.ok(aside.includes('onKeyDown={onRailKeyDown}'), 'aside 必须挂 Tab 环回的 onKeyDown')
})

test('MarginRail.tsx：onRailKeyDown 只拦 Tab，按栏内可见站收口', () => {
  assert.equal(count(railSource, 'const onRailKeyDown'), 1, 'onRailKeyDown 只许定义一次')
  const handler = sliceFrom(railSource, 'const onRailKeyDown', 1000)
  assert.ok(handler.includes("event.key !== 'Tab'"), '只认 Tab')
  assert.ok(handler.includes('!drawerOpen'), '宽窗不拦截 Tab')
  assert.ok(handler.includes('railRef.current'), '只数栏内节点')
  assert.ok(handler.includes('getClientRects().length > 0'), '隐藏页签里的按钮不算 Tab 站')
  assert.ok(handler.includes('items.indexOf(document.activeElement'), '按当前焦点在不在站上判边界')
  assert.ok(count(handler, 'preventDefault()') >= 2, '首末两端都要拦住浏览器默认的 Tab')
})

test('MarginRail.tsx：关闭钮标签跟页签（批注 / 对话）', () => {
  const close = sliceFrom(railSource, 'className="rail-close"', 300)
  assert.ok(close.includes("railTab === 'chat'"), '.rail-close 的标签要读页签')
  assert.equal(count(railSource, "'关闭对话'"), 1, '「关闭对话」只许出现一次')
  assert.equal(count(railSource, "'关闭批注'"), 1, '「关闭批注」只许出现一次')
  assert.ok(
    close.indexOf('关闭对话') < close.indexOf('关闭批注'),
    '顺序：chat → 关闭对话，否则念反',
  )
})

test('App.tsx：字数明细与抽屉永不同时在场', () => {
  const openRail = sliceFrom(appSource, 'const openRail = useCallback', 400)
  assert.ok(openRail.includes('setStatsDetail(null)'), '开抽屉要关掉字数明细')
  const openStats = sliceFrom(appSource, 'const openStatsDetail = useCallback', 300)
  assert.ok(openStats.includes('if (railOpen) setRailOpen(false)'), '开字数明细要关掉抽屉')
  const deps = sliceFrom(appSource, '}, [editor, sourceMode, sourceText', 60)
  assert.ok(deps.includes('railOpen]'), 'openStatsDetail 的 deps 要补 railOpen')
})
