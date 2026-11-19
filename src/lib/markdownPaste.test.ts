import assert from 'node:assert/strict'
import test from 'node:test'

import { MarkdownManager } from '@tiptap/markdown'
import { StarterKit } from '@tiptap/starter-kit'
import { InlineMath } from '@tiptap/extension-mathematics'

import {
  MAX_PASTE_CHARS,
  looksLikeMarkdown,
  pasteCandidate,
  pastePlan,
  plainTextOfHtml,
  type PasteJson,
} from './markdownPaste.ts'

/**
 * 第 92 轮 A1（用户缺陷 1）：纯文本 Markdown 粘贴的判定与插入形态。
 * 浏览器项另在 `.tmp/e2e-r92-a1-paste.mjs`（CDP 57270），这里只验纯函数与解析链。
 */

type Json = { type?: string; marks?: { type?: string }[]; content?: Json[] }

/** 节点与 mark 一起数：strong / link / code 是 mark，heading / list 是 node */
function countType(node: Json, type: string): number {
  const own = node.type === type ? 1 : 0
  const marks = (node.marks ?? []).filter((mark) => mark.type === type).length
  return own + marks + (node.content ?? []).reduce((sum, child) => sum + countType(child, type), 0)
}

/** 与 App 解析链同形的 manager：StarterKit 给标题/列表/粗体/链接/行内代码，InlineMath 给 `$…$` */
function makeManager(): MarkdownManager {
  return new MarkdownManager({ extensions: [StarterKit, InlineMath] })
}

// ---------------------------------------------------------------- looksLikeMarkdown：8 正

test('① 标题：`# 标题` 与 `## 二级` 都算 Markdown', () => {
  assert.equal(looksLikeMarkdown('# 标题'), true)
  assert.equal(looksLikeMarkdown('## 二级\n\n正文'), true)
})

test('② 无序列表与任务项：`- a` / `- [ ] 待办`', () => {
  assert.equal(looksLikeMarkdown('- a\n- b'), true)
  assert.equal(looksLikeMarkdown('- [ ] 待办'), true)
})

test('③ 有序列表：`1. a` / `2) b`', () => {
  assert.equal(looksLikeMarkdown('1. 第一'), true)
  assert.equal(looksLikeMarkdown('2) 第二'), true)
})

test('④ 引用：`> 引用一句`', () => {
  assert.equal(looksLikeMarkdown('> 引用一句'), true)
})

test('⑤ 围栏：```js 代码块', () => {
  assert.equal(looksLikeMarkdown('```js\nconst a = 1\n```'), true)
  assert.equal(looksLikeMarkdown('~~~\nx\n~~~'), true)
})

test('⑥ 分隔线与表格：`---` / 整行被 | 包住', () => {
  assert.equal(looksLikeMarkdown('---'), true)
  assert.equal(looksLikeMarkdown('| a | b |\n| --- | --- |'), true)
})

test('⑦ 行内三种：`**粗体**` / `` `代码` `` / `[文字](目标)`', () => {
  assert.equal(looksLikeMarkdown('**粗体**'), true)
  assert.equal(looksLikeMarkdown('这一句里有 `code`'), true)
  assert.equal(looksLikeMarkdown('[文字](https://e.com)'), true)
})

test('⑧ 行内公式：`$x^2$` 算，内侧留空白的 `$5 到 $` 不算', () => {
  assert.equal(looksLikeMarkdown('$x^2$'), true)
  assert.equal(looksLikeMarkdown('公式 $a+b$ 结尾'), true)
})

// ---------------------------------------------------------------- looksLikeMarkdown：5 负

test('⑨ 负例：货币写法不是公式', () => {
  assert.equal(looksLikeMarkdown('价格 $5 到 $'), false)
  assert.equal(looksLikeMarkdown('价格 $5 到 $10，很便宜'), false)
})

test('⑩ 负例：纯中文一句没有标记', () => {
  assert.equal(looksLikeMarkdown('今天天气不错，我们出去走走吧。'), false)
})

test('⑪ 负例：两段纯文本（空行分段）不是 Markdown', () => {
  assert.equal(looksLikeMarkdown('第一段\n\n第二段'), false)
})

test('⑫ 负例：单个星号当乘号', () => {
  assert.equal(looksLikeMarkdown('a * b * c'), false)
  assert.equal(looksLikeMarkdown('2 * 3 = 6'), false)
})

test('⑬ 负例：空串与普通路径/网址', () => {
  assert.equal(looksLikeMarkdown(''), false)
  assert.equal(looksLikeMarkdown('见 README.md 与 https://example.com/a_b'), false)
})

// ---------------------------------------------------------------- pasteCandidate：6

test('⑭ pasteCandidate：剪贴板里有图片就不按 Markdown 解析', () => {
  assert.equal(pasteCandidate({ text: '# 标题', fileCount: 1 }), false)
})

test('⑮ pasteCandidate：超过 200,000 字符不解析，正好 200,000 字符仍解析', () => {
  const long = `# ${'a'.repeat(MAX_PASTE_CHARS - 2)}`
  assert.equal(looksLikeMarkdown(long), true)
  assert.equal(pasteCandidate({ text: long, fileCount: 0 }), true)
  assert.equal(pasteCandidate({ text: `${long}a`, fileCount: 0 }), false)
})

test('⑯ pasteCandidate：HTML 纯文字与 text/plain 折空白后相等 → 放行（`<p>` 归一）', () => {
  assert.equal(pasteCandidate({ text: '**粗体**', html: '<p>**粗体**</p>', fileCount: 0 }), true)
  assert.equal(pasteCandidate({ text: '**粗体**', html: '<p>**粗体**</p>\n', fileCount: 0 }), true)
  // 两个 <p> 折完空白就是一句 `a b`：判定只看文字，不保留标签
  assert.equal(pasteCandidate({ text: 'a\nb', html: '<div><p>a</p><p>b</p></div>', fileCount: 0 }), false)
  assert.equal(plainTextOfHtml('<div><p>a</p><p>b</p></div>').replace(/\s+/g, ' ').trim(), 'a b')
  assert.equal(plainTextOfHtml('<p>a<br>b</p>'), 'a\nb\n')
})

test('⑰ pasteCandidate：HTML 里带真结构（`<b>`）→ 不是纯文本，交回 PM', () => {
  assert.equal(pasteCandidate({ text: '**粗体**', html: '<b>**粗体**</b>', fileCount: 0 }), false)
})

test('⑱ pasteCandidate：编辑器内部复制的 `data-pm-slice` 与带属性的 span 都不放行', () => {
  const html = '<meta charset="utf-8"><p data-pm-slice="0 0 []">**粗体**</p>'
  assert.equal(pasteCandidate({ text: '**粗体**', html, fileCount: 0 }), false)
  assert.equal(pasteCandidate({ text: '高亮', html: '<p><span class="sl-eq">高亮</span></p>', fileCount: 0 }), false)
})

test('⑲ pasteCandidate：不带 HTML 的纯文本 Markdown 正常放行', () => {
  assert.equal(pasteCandidate({ text: '# 标题\n- a', fileCount: 0 }), true)
  assert.equal(pasteCandidate({ text: '**粗体**', html: '', fileCount: 0 }), true)
  assert.equal(pasteCandidate({ text: '普通一句。', html: '', fileCount: 0 }), false)
})

// ---------------------------------------------------------------- pastePlan：3

test('⑳ pastePlan：单个段落 + 文本块里 → inline（不拆段）', () => {
  const one: PasteJson = { type: 'doc', content: [{ type: 'paragraph', content: [] }] }
  assert.equal(pastePlan(one, { inTextblock: true, inTable: false }), 'inline')
  // 两个块（哪怕第二块是空段落）就得整块插，段中会拆段
  assert.equal(pastePlan({ type: 'doc', content: [{ type: 'paragraph' }, { type: 'paragraph' }] }, { inTextblock: true, inTable: false }), 'blocks')
})

test('㉑ pastePlan：多块 → blocks；不在文本块里 → blocks', () => {
  const two: PasteJson = { type: 'doc', content: [{ type: 'paragraph' }, { type: 'paragraph' }] }
  assert.equal(pastePlan(two, { inTextblock: true, inTable: false }), 'blocks')
  assert.equal(pastePlan({ type: 'doc', content: [{ type: 'heading' }] }, { inTextblock: true, inTable: false }), 'blocks')
  assert.equal(pastePlan({ type: 'doc', content: [{ type: 'paragraph' }] }, { inTextblock: false, inTable: false }), 'blocks')
})

test('㉒ pastePlan：表格单元格只装行内内容——单段 inline，多块 literal，空 doc literal', () => {
  assert.equal(pastePlan({ type: 'doc', content: [{ type: 'paragraph' }] }, { inTextblock: true, inTable: true }), 'inline')
  assert.equal(pastePlan({ type: 'doc', content: [{ type: 'paragraph' }, { type: 'paragraph' }] }, { inTextblock: true, inTable: true }), 'literal')
  assert.equal(pastePlan({ type: 'doc' }, { inTextblock: true, inTable: false }), 'literal')
})

// ---------------------------------------------------------------- MarkdownManager：2

test('㉓ 解析链：`# 标题` + 列表 + `**粗体**` + 链接 + 行内代码 各一份', () => {
  const manager = makeManager()
  // schema 里粗体 mark 叫 `bold`（不是 strong），链接与行内代码同 StarterKit 的既有名字
  const parsed = manager.parse('# 标题\n- a\n**粗体** [链接](https://e.com) `code`') as Json
  assert.equal(countType(parsed, 'heading'), 1)
  assert.equal(countType(parsed, 'bulletList'), 1)
  assert.equal(countType(parsed, 'bold'), 1)
  assert.equal(countType(parsed, 'link'), 1)
  assert.equal(countType(parsed, 'code'), 1)
})

test('㉔ 解析链：`$x^2$` 得到 inlineMath，围栏里的 `**不粗**` 不粗', () => {
  const manager = makeManager()
  const math = manager.parse('$x^2$') as Json
  assert.equal(countType(math, 'inlineMath'), 1)
  const fence = manager.parse('```\n**不粗**\n```') as Json
  assert.equal(countType(fence, 'codeBlock'), 1)
  assert.equal(countType(fence, 'bold'), 0)
})
