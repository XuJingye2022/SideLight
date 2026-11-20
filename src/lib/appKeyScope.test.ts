import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

/**
 * 第 132 轮 B-263 的静态接线门：App 级产品键只许在编辑器正文 / 源码框里动手。
 *
 * 症状（第 131 轮 finder 记的 B-263）：焦点在右侧「对话」的 `textarea.rail-chat-input` 里时按
 * Ctrl+K / Ctrl+F，window keydown 照旧执行命令，链接编辑框 / 查找条抢走焦点，正在写的指令被半截打断。
 * 修法是 `App.tsx` 里一条新守卫：`typing` 为真但目标不在「正文 / 源码框」里时，只吞浏览器默认动作、
 * 不执行命令；保存例外（外置输入框里 Ctrl+S 仍要写盘）。
 *
 * 少接一处不会报错（命令照旧执行），打字时也看不出后台动作，所以这里按源码文本判红。
 * 这是文本门不是行为门：行为证据见 `.tmp/e2e-r132-chatkeys.mjs --phase before|after`
 * （before ①② 红、after ①–⑫ 全绿）与 `docs/iteration/round-132/impl.md`。
 */

/** 先摘注释：注释里写选择器/状态名不算接线（`railModalGate.test.ts` / `touchTargets.test.ts` 同一口径） */
const source = (path: string): string =>
  readFileSync(path, 'utf8').replace(/\/\*[\s\S]*?\*\//g, ' ')

const appSource = source('src/App.tsx')
const fileTreeSource = source('src/components/FileTree.tsx')

const count = (haystack: string, needle: string): number => haystack.split(needle).length - 1

/** 取 `needle` 起的一段，给「守卫里到底写了什么」按项断言用 */
const sliceFrom = (haystack: string, needle: string, length: number): string => {
  const at = haystack.indexOf(needle)
  assert.ok(at >= 0, `找不到「${needle}」`)
  return haystack.slice(at, at + length)
}

/** 放行集的选择器串：正文与源码框。两处必须逐字相同，不然一处改了另一处就是死的 */
const SCOPE_SELECTOR = '.ProseMirror, textarea.source-editor'

test('App.tsx：放行判据只定义一次，全文件恰好两处引用（定义 + 守卫）', () => {
  assert.equal(count(appSource, 'const foreignTyping'), 1, '判据只许有一个定义处')
  assert.equal(count(appSource, 'foreignTyping'), 2, '判据只许两处出现：定义一次、守卫里用一次')
})

test('App.tsx 与 FileTree.tsx：放行集选择器逐字相同，且各只出现一次', () => {
  assert.equal(
    count(appSource, SCOPE_SELECTOR),
    1,
    'App.tsx 里放行集选择器只许写一次（多一处就多一个真源）',
  )
  assert.equal(
    count(fileTreeSource, SCOPE_SELECTOR),
    1,
    'FileTree.tsx 的抢焦点守卫必须用同一个选择器串（第 68 轮的那条）',
  )
  const guard = sliceFrom(appSource, 'const foreignTyping', 400)
  assert.ok(
    guard.includes(`target.closest('${SCOPE_SELECTOR}')`),
    '守卫必须按 event.target 的 closest 判放行集，别改成别的东西',
  )
})

test('App.tsx：守卫在 `?` 块之后、8 条可改命令分派之前', () => {
  const questionAt = appSource.indexOf("if (!typing && (event.key === '?'")
  const guardAt = appSource.indexOf('const foreignTyping')
  const dispatchAt = appSource.indexOf('if (customId !== null) {')
  assert.ok(questionAt >= 0, '找不到 `?` 块')
  assert.ok(dispatchAt >= 0, '找不到 customId 分派块')
  assert.ok(guardAt > questionAt, '守卫必须在 `?` 块之后：问号是输入，不该被产品键守卫拦')
  assert.ok(guardAt < dispatchAt, '守卫必须在 customId 分派之前，否则命令已经执行了')
  assert.equal(count(appSource, 'if (customId !== null) {'), 1, 'customId 分派块只许一处')
})

test('App.tsx：守卫体先吞浏览器默认动作再 return，保存放行', () => {
  assert.ok(
    appSource.includes("if (foreignTyping && customId !== 'save') {"),
    '保存必须例外放行：外置输入框里 Ctrl+S 仍要写盘',
  )
  const body = sliceFrom(appSource, "if (foreignTyping && customId !== 'save') {", 200)
  assert.ok(
    body.includes('if (productCombo || customId !== null) event.preventDefault()'),
    '只对产品键组合吞默认动作：普通打字、Enter、IME 候选键一律不碰',
  )
  assert.match(body, /\n\s*return\s*\n/, '守卫要 return，别落进下面的命令分派')
  assert.ok(!body.includes('show('), '守卫里不许弹提示：外置输入框里每次 Ctrl+F 都提示就是噪声')
})

test('package.json：test 链带上本门', () => {
  const pkg = source('package.json')
  assert.ok(
    pkg.includes('node --experimental-strip-types src/lib/appKeyScope.test.ts'),
    'test 链要追加 src/lib/appKeyScope.test.ts，否则这条门不进 npm test',
  )
})
