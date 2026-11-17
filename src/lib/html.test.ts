import assert from 'node:assert/strict'
import test from 'node:test'

import { escapeHtmlForParse, hasHtml, repairHtml } from './html.ts'

test('行内标签被还原', () => {
  assert.equal(repairHtml('按 &lt;kbd&gt;Ctrl&lt;/kbd&gt; + Enter。'), '按 <kbd>Ctrl</kbd> + Enter。')
})

test('带属性的标签被还原', () => {
  assert.equal(repairHtml('&lt;div class="callout"&gt;'), '<div class="callout">')
})

test('自闭合与结束标签被还原', () => {
  assert.equal(repairHtml('&lt;br/&gt; 与 &lt;/p&gt;'), '<br/> 与 </p>')
})

// 第 41 轮：序列化器把正文里每个 < > & 都写成实体，这里还原成字符（旧期望「保持原样」作废）
test('正文里的比较符号还原成字符', () => {
  assert.equal(repairHtml('如果 a &lt; b 就换一行。'), '如果 a < b 就换一行。')
})

test('正文里的 &amp; 与 &gt; 也还原', () => {
  assert.equal(repairHtml('A &amp; B'), 'A & B')
  assert.equal(repairHtml('a &gt; b'), 'a > b')
})

test('没有转义时原样返回', () => {
  const text = '普通正文，没有标签。'
  assert.equal(repairHtml(text), text)
})

test('多处标签都还原', () => {
  assert.equal(
    repairHtml('&lt;kbd&gt;A&lt;/kbd&gt; 和 &lt;kbd&gt;B&lt;/kbd&gt;'),
    '<kbd>A</kbd> 和 <kbd>B</kbd>',
  )
})

test('识别文档里是否有 HTML', () => {
  assert.equal(hasHtml('按 <kbd>Ctrl</kbd> 触发。'), true)
  assert.equal(hasHtml('<div class="x">块</div>'), true)
  assert.equal(hasHtml('纯文字，没有标签。'), false)
  assert.equal(hasHtml('比较 a < b。'), false)
})

test('成对白名单标签还原，其余仍转义', () => {
  assert.equal(
    escapeHtmlForParse('按 <kbd>Ctrl</kbd> + Enter 触发。'),
    '按 <kbd>Ctrl</kbd> + Enter 触发。',
  )
})

test('比较符号不被转义', () => {
  assert.equal(escapeHtmlForParse('如果 a < b 就换行。'), '如果 a < b 就换行。')
})

test('转义后再修复能回到原文', () => {
  const original = '按 <kbd>Ctrl</kbd> + Enter 触发。'
  const escaped = escapeHtmlForParse(original)
  // 模拟编辑器把 &lt; 原样留下、把 > 也转义
  const serialized = escaped.replace(/>/g, '&gt;')
  assert.equal(repairHtml(serialized), original)
})

test('围栏里的字面实体原样：原文别处有真注释也不能动它', () => {
  assert.equal(repairHtml('```\n&lt;!-- 备注 --&gt;\n```\n', '<!-- 备注 -->\n'), '```\n&lt;!-- 备注 --&gt;\n```\n')
})

test('正文里的字面实体原样（讲转义的段落不变成真注释）', () => {
  const source = '写成 &lt;!-- 备注 --&gt; 才不会变注释。\n'
  assert.equal(repairHtml(source, source), source)
})

test('真注释与 DOCTYPE 在原文里有同一条时还原', () => {
  assert.equal(
    repairHtml('&lt;!-- 给编辑看的备注 --&gt;\n', '<!-- 给编辑看的备注 -->\n'),
    '<!-- 给编辑看的备注 -->\n',
  )
  assert.equal(repairHtml('&lt;!DOCTYPE html&gt;\n', '<!DOCTYPE html>\n'), '<!DOCTYPE html>\n')
})

test('块首的 &gt; 保持实体：解开会变成引用块', () => {
  assert.equal(repairHtml('&gt;100 人的团队。'), '&gt;100 人的团队。')
  assert.equal(repairHtml('&gt; x'), '&gt; x')
  assert.equal(repairHtml('> &gt;x'), '> &gt;x')
})

test('列表标记之后也算块首', () => {
  assert.equal(repairHtml('- &gt;100 人'), '- &gt;100 人')
  assert.equal(repairHtml('1. &gt; x'), '1. &gt; x')
})

test('行内代码后面的 &gt; 不算块首', () => {
  assert.equal(repairHtml('`x` &gt;y'), '`x` >y')
})

test('多行文档里的块首守卫按真实行号算', () => {
  // 围栏在前：围栏那一支也要累加行起点，否则前缀带上围栏行、守卫判成非块首
  assert.equal(repairHtml('```js\nx\n```\n&gt;100 人\n'), '```js\nx\n```\n&gt;100 人\n')
  // 第二行才是块首：行起点不能用常数 0
  assert.equal(repairHtml('甲\n&gt;100 人\n'), '甲\n&gt;100 人\n')
  // 反向锁：上一行是正文时，同一段里的 &gt; 必须照解
  assert.equal(repairHtml('甲\n前文 &gt; 比较\n'), '甲\n前文 > 比较\n')
})

test('围栏与行内代码里的实体不解码', () => {
  assert.equal(repairHtml('```\n&lt;kbd&gt;\n```\n'), '```\n&lt;kbd&gt;\n```\n')
  assert.equal(repairHtml('用 `&lt;kbd&gt;` 说'), '用 `&lt;kbd&gt;` 说')
})

test('原文里写的是字面实体时保持实体（含闭合标签）', () => {
  assert.equal(repairHtml('&lt;div&gt;', '&lt;div&gt;'), '&lt;div&gt;')
  assert.equal(repairHtml('&lt;/div&gt;', '&lt;/div&gt;'), '&lt;/div&gt;')
})

test('原文没有标签时也能靠解码兜底还原', () => {
  assert.equal(repairHtml('&lt;kbd&gt;', null), '<kbd>')
})

test('&amp; 只在解出来的 & 不成实体时才解（前视守卫）', () => {
  // 作者在新文档里打的是字面 4 个字符 &lt;，存下来是 &amp;lt;：解开会变成 1 个 <
  assert.equal(repairHtml('&amp;lt;', null), '&amp;lt;')
  assert.equal(repairHtml('&amp;#42;', null), '&amp;#42;')
  assert.equal(repairHtml('&amp;lt', null), '&lt')
  assert.equal(repairHtml('A &amp; B', null), 'A & B')
})

test('原文里有某个标签时，被用户改过属性的那一条仍然还原', () => {
  assert.equal(repairHtml('&lt;kbd class="x"&gt;', '按 <kbd>Ctrl</kbd> 触发。\n'), '<kbd class="x">')
})

test('解析前不转义围栏与行内代码里的标签', () => {
  assert.equal(escapeHtmlForParse('```\n<div>x</div>\n```\n'), '```\n<div>x</div>\n```\n')
  assert.equal(escapeHtmlForParse('用 `<kbd>` 表示按键。'), '用 `<kbd>` 表示按键。')
  assert.equal(escapeHtmlForParse('按 <kbd>Ctrl</kbd> 触发。'), '按 <kbd>Ctrl</kbd> 触发。')
})
