import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

/**
 * 第 130 轮 A1（B-261）静态接线门：对话清空按文档身份（实例计数），不按 basename。
 *
 * 三处接线同时成立，换篇才会真的清空对话：
 * ① `MarginRail.tsx` 的 Props 声明 `docKey: number`，解构里拿到它；
 * ② 对话清空 effect 依赖 `[docKey]`；
 * ③ `App.tsx` 在 `loadIntoEditor` 的换篇计数点 +1，并把 `docKey={docInstance}` 传下去。
 *
 * 漏一处不报错：没有 prop 时 `docKey` 恒 undefined，effect 只在挂载跑一次，上一轮的对话会留在新文档上
 * （第 123 轮 finder `.tmp/r123-finder-code.json` 的「新文档后对话记录应清空」`ok:false`）。
 * 行为证据见 `.tmp/r130-e2e-after.json` / `.tmp/r130-e2e-before.json`。
 */

/** 先摘块注释、再剥每行 `//` 注释：注释里写标识符不算接线（同 railModalGate.test.ts 口径） */
const source = (path: string): string =>
  readFileSync(path, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .split('\n')
    .map((line) => line.replace(/\/\/.*$/, ''))
    .join('\n')

const appSource = source('src/App.tsx')
const railSource = source('src/components/MarginRail.tsx')

const count = (haystack: string, needle: string): number => haystack.split(needle).length - 1

test('MarginRail.tsx：Props 声明 docKey: number 恰一处', () => {
  assert.equal(count(railSource, 'docKey: number'), 1, 'Props 里 docKey 只许声明一次')
})

test('MarginRail.tsx：解构里 docKey 恰一处（漏了就是 always undefined）', () => {
  assert.equal(count(railSource, 'docKey,'), 1, '解构里 docKey 只许写一次')
})

test('MarginRail.tsx：对话清空 effect 依赖 [docKey] 恰一处', () => {
  assert.equal(count(railSource, '}, [docKey])'), 1, '换文档清空对话必须依赖 docKey')
})

test('MarginRail.tsx：面板清空 effect 仍依赖 [docName]（第 119 轮 B-249 不回归）', () => {
  assert.equal(
    count(railSource, '}, [docName])'),
    1,
    '对比 / 在审面板的换文档 effect 仍按 docName（railModalGate.test.ts 钉着它）',
  )
})

test('App.tsx：换篇计数点 +1 并作为 docKey 传下去，各恰一处', () => {
  const needle = 'setDocInstance((value) => value + 1)'
  assert.equal(count(appSource, needle), 1, '文档身份只许在换篇点 +1')
  const anchor = appSource.indexOf('activeDocIdRef.current += 1')
  assert.ok(anchor >= 0, '找不到 loadIntoEditor 的换篇计数点')
  const bump = appSource.indexOf(needle)
  assert.ok(bump >= 0, '找不到 setDocInstance 调用')
  const gap = bump - anchor
  assert.ok(gap > 0 && gap <= 300, `setDocInstance 要跟换篇点在 300 字内（实际差 ${gap}）`)
  assert.equal(count(appSource, 'docKey={docInstance}'), 1, 'MarginRail 的 docKey 入参只许写一次')
})
