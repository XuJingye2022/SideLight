import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

/**
 * 第 120 轮 A1：B-250 的静态接线门。
 *
 * 「改动对比」面板的长 diff 只能靠鼠标滚轮读：`.rail-diff-rows` 是 `max-height:60vh; overflow:auto` 的
 * `<ul>`，行是纯 `<li>`，面板里唯一的 Tab 站是关闭钮。键盘用户落在关闭钮上按 PageDown / ArrowDown / End
 * 都不动（第 119 轮 finder 实测 `.tmp/r119-finder-ui2.json`）。修法是让 ul 自己进 Tab 序并给读屏一个名字。
 *
 * 两处 `<ul className="rail-diff-rows">` 共用同一套样式：
 * - 对比面板（`diffData.rows`）：本轮要 `tabIndex={0}` + `role="list"` + `aria-label`；
 * - 在审文件面板（`reviewRows.rows`）：行是整行按钮，Tab 站已有，**不加** tabIndex（否则 Tab 序多一站）。
 * 按「开标签之后 120 字」（即子节点区）分派两条，避免按行号或书写顺序耦合。
 *
 * 这是文本门不是行为门：行为证据见 `.tmp/e2e-r120-diff-kb.mjs --phase before|after`
 * 与 `docs/iteration/round-120/impl.md`。
 */

/** 先摘注释：注释里写属性名/选择器不算接线（railModalGate.test.ts 同一口径），行首 `//` 一并摘 */
const source = (path: string): string =>
  readFileSync(path, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/^\s*\/\/.*$/gm, ' ')

const railSource = source('src/components/MarginRail.tsx')
const styles = source('src/styles.css')

/** 取 `needle` 起的一段，给「哪条 ul 下面是哪种行」按子节点分派用 */
const sliceFrom = (haystack: string, needle: string, length: number): string => {
  const at = haystack.indexOf(needle)
  assert.ok(at >= 0, `找不到「${needle}」`)
  return haystack.slice(at, at + length)
}

const count = (haystack: string, needle: string): number => haystack.split(needle).length - 1

const rowsTags = [...railSource.matchAll(/<ul\b[^>]*className="rail-diff-rows"[^>]*>/g)].map((match) => match)
const tagText = (match: RegExpMatchArray): string => match[0]
const childText = (match: RegExpMatchArray): string =>
  railSource.slice((match.index ?? 0) + tagText(match).length, (match.index ?? 0) + tagText(match).length + 120)

test('MarginRail.tsx：rail-diff-rows 的 ul 恰两处（对比 / 在审各一条）', () => {
  assert.equal(rowsTags.length, 2, `rail-diff-rows 的 ul 应恰 2 处，实际 ${rowsTags.length}`)
})

test('对比面板那条 ul：含 tabIndex={0}、role="list"、aria-label="改动对比行"', () => {
  const diffTag = rowsTags.find((match) => childText(match).includes('diffData.rows'))
  assert.ok(diffTag, '找不到子节点里是 diffData.rows 的那条 ul')
  const tag = tagText(diffTag)
  assert.ok(tag.includes('tabIndex={0}'), '对比面板的 ul 要进 Tab 序（tabIndex={0}）')
  assert.ok(tag.includes('role="list"'), '对比面板的 ul 要有 role="list"')
  assert.ok(tag.includes('aria-label="改动对比行"'), '对比面板的 ul 要有可读名字')
})

test('在审文件那条 ul：行是按钮、不加 tabIndex（Tab 序只多对比面板一站）', () => {
  const reviewTag = rowsTags.find((match) => childText(match).includes('reviewRows.rows'))
  assert.ok(reviewTag, '找不到子节点里是 reviewRows.rows 的那条 ul')
  assert.ok(!tagText(reviewTag).includes('tabIndex'), '在审文件列表的 ul 不许加 tabIndex')
})

test('全文件 tabIndex={0} 恰 3 处（批注卡 / 对话记录 / 本轮对比 ul），且滚动样式不改', () => {
  assert.equal(count(railSource, 'tabIndex={0}'), 3, 'tabIndex={0} 的处数变了：先确认新增/删除是否本轮计划内')
  // CSS 0 行：焦点环走 :192 的全局 :focus-visible，滚动仍是这块的 max-height + overflow
  const at = styles.indexOf('.rail-diff-rows {')
  assert.ok(at >= 0, '找不到 .rail-diff-rows 的样式块')
  const block = styles.slice(at, styles.indexOf('}', at) + 1)
  assert.ok(block.includes('max-height: 60vh'), '滚动上限 max-height: 60vh 不见了')
  assert.ok(block.includes('overflow: auto'), '滚动容器 overflow: auto 不见了')
})
