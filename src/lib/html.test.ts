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

test('不是标签的转义保持原样', () => {
  assert.equal(repairHtml('如果 a &lt; b 就换一行。'), '如果 a &lt; b 就换一行。')
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

test('解析前把标签的尖括号转成实体', () => {
  assert.equal(
    escapeHtmlForParse('按 <kbd>Ctrl</kbd> + Enter 触发。'),
    '按 &lt;kbd>Ctrl&lt;/kbd> + Enter 触发。',
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
