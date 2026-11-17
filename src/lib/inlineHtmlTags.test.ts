import assert from 'node:assert/strict'
import test from 'node:test'

import { MarkdownManager } from '@tiptap/markdown'
import { StarterKit } from '@tiptap/starter-kit'

import { escapeHtmlForParse } from './html.ts'
import { escapeInlineHtml, inlineMarks } from './inlineHtmlTags.ts'

/* ---------- 转义：白名单成对标签留在原文里（第 47 轮 T1） ---------- */

test('解析前保留四个白名单成对标签', () => {
  assert.equal(escapeHtmlForParse('按 <kbd>Ctrl</kbd> 触发。'), '按 <kbd>Ctrl</kbd> 触发。')
  assert.equal(escapeHtmlForParse('<mark>重点</mark>'), '<mark>重点</mark>')
  assert.equal(escapeHtmlForParse('H<sub>2</sub>O'), 'H<sub>2</sub>O')
  assert.equal(escapeHtmlForParse('x<sup>2</sup>'), 'x<sup>2</sup>')
})

test('同一行两组白名单标签都保留', () => {
  assert.equal(
    escapeHtmlForParse('<kbd>Ctrl</kbd> 与 <kbd>Esc</kbd>'),
    '<kbd>Ctrl</kbd> 与 <kbd>Esc</kbd>',
  )
})

test('白名单之外的标签仍然转义（带属性、单开、内容含 & 与跨行）', () => {
  // 带属性：不还原
  assert.equal(escapeHtmlForParse('<kbd class="x">'), '&lt;kbd class="x">')
  // 单开：不还原
  assert.equal(escapeHtmlForParse('按 <kbd> 开始'), '按 &lt;kbd> 开始')
  assert.equal(escapeInlineHtml('</kbd>'), '&lt;/kbd>')
  // 内容含 &：宁可不渲染，也不改字节
  assert.equal(escapeHtmlForParse('<kbd>R&D</kbd>'), '&lt;kbd>R&D&lt;/kbd>')
  // 内容含 <：不还原
  assert.equal(escapeHtmlForParse('<kbd>a<b</kbd>'), '&lt;kbd>a&lt;b&lt;/kbd>')
  // 跨行：不还原
  assert.equal(escapeHtmlForParse('<kbd>Ctrl\n</kbd>'), '&lt;kbd>Ctrl\n&lt;/kbd>')
  // 比较符号本来就不转义
  assert.equal(escapeHtmlForParse('如果 a < b 就换行。'), '如果 a < b 就换行。')
})

test('空内容与纯空白内容的成对标签不还原（成不了文本节点，会丢字节）', () => {
  assert.equal(escapeHtmlForParse('<kbd></kbd>'), '&lt;kbd>&lt;/kbd>')
  assert.equal(escapeHtmlForParse('<kbd> </kbd>'), '&lt;kbd> &lt;/kbd>')
})

test('围栏与行内代码里的白名单标签一个字节都不动', () => {
  assert.equal(escapeHtmlForParse('```\n<kbd>Ctrl</kbd>\n```\n'), '```\n<kbd>Ctrl</kbd>\n```\n')
  assert.equal(escapeHtmlForParse('用 `<kbd>` 表示按键。'), '用 `<kbd>` 表示按键。')
})

test('作者本来写的就是实体时保持逐字节不变（先占位再转义）', () => {
  const entity = '写成 &lt;kbd>Ctrl&lt;/kbd> 才是转义示例。'
  assert.equal(escapeHtmlForParse(entity), entity)
  assert.equal(escapeHtmlForParse('转义示例 &lt;mark>x&lt;/mark&gt; 与 <kbd>Ctrl</kbd>。'), '转义示例 &lt;mark>x&lt;/mark&gt; 与 <kbd>Ctrl</kbd>。')
})

test('原文含占位符字符时退回纯转义，不吞字符', () => {
  assert.equal(escapeInlineHtml('a \u0001 b <kbd>x</kbd>'), 'a \u0001 b &lt;kbd>x&lt;/kbd>')
})

test('嵌套：外层保持字面，内层干净的成对仍还原（口径 2）', () => {
  assert.equal(escapeHtmlForParse('<kbd><mark>x</mark></kbd>'), '&lt;kbd><mark>x</mark>&lt;/kbd>')
})

/* ---------- 序列化：注册的 mark 写回原标签（Node 可判的唯一接线证据） ---------- */

const withMarks = new MarkdownManager({ extensions: [StarterKit, ...inlineMarks] })
const withoutMarks = new MarkdownManager({ extensions: [StarterKit] })

const inlineDoc = {
  type: 'doc',
  content: [
    {
      type: 'paragraph',
      content: [
        { type: 'text', text: '按 ' },
        { type: 'text', text: 'Ctrl', marks: [{ type: 'inlineKbd' }] },
        { type: 'text', text: ' 加 Enter，看 ' },
        { type: 'text', text: '重点', marks: [{ type: 'inlineMark' }] },
        { type: 'text', text: '、H' },
        { type: 'text', text: '2', marks: [{ type: 'inlineSub' }] },
        { type: 'text', text: 'O、x' },
        { type: 'text', text: '2', marks: [{ type: 'inlineSup' }] },
        { type: 'text', text: '。' },
      ],
    },
  ],
}

test('注册的四个 mark 序列化回真标签（手搓 doc，不经 parse）', () => {
  assert.equal(
    withMarks.serialize(inlineDoc),
    '按 <kbd>Ctrl</kbd> 加 Enter，看 <mark>重点</mark>、H<sub>2</sub>O、x<sup>2</sup>。',
  )
})

test('不注册 mark 时四个标签全丢：改前红、改后绿', () => {
  assert.equal(withoutMarks.serialize(inlineDoc), '按 Ctrl 加 Enter，看 重点、H2O、x2。')
})
