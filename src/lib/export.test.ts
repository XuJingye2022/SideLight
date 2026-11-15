import assert from 'node:assert/strict'
import test from 'node:test'

import katexReal from 'katex'

import { __setLoaderForTest, ensureKatex } from './katexLazy.ts'
import {
  buildHtmlDocument,
  buildPlainText,
  escapeHtml,
  exportName,
  renderFootnotes,
  renderFrontmatter,
} from './export.ts'

// 测试进程里 KaTeX 是同步可用的：注入 real loader，避免动态 import CSS
__setLoaderForTest(async () => ({ katex: katexReal }))
await ensureKatex()

// fixture 来自第 05 轮 dev 页面 `document.querySelector('.editor').innerHTML`
// （Tiptap 的 editor.getHTML() 输出同构）：外层属性与顺序原样，KaTeX 内层只保留一层。
const INLINE_MATH_HTML =
  '<p>正文 <span class="tiptap-mathematics-render tiptap-mathematics-render--editable" data-type="inline-math" data-latex="E=mc^2" contenteditable="false"><span class="katex"><span class="katex-mathml"><math xmlns="http://www.w3.org/1998/Math/MathML"><semantics><mrow><mi>E</mi><mo>=</mo><mi>m</mi><msup><mi>c</mi><mn>2</mn></msup></mrow><annotation encoding="application/x-tex">E=mc^2</annotation></semantics></math></span></span></span> 结束。</p>'

const BLOCK_MATH_HTML =
  '<div class="tiptap-mathematics-render tiptap-mathematics-render--editable" data-type="block-math" data-latex="\\frac{a}{b}" contenteditable="false"><div class="block-math-inner"><span class="katex"><span class="katex-mathml"><math><semantics><mfrac><mi>a</mi><mi>b</mi></mfrac></semantics></math></span></span></div></div>'

// 属性顺序反过来（data-latex 在前）也必须能取到 latex
const LATEX_FIRST_HTML =
  '<span class="tiptap-mathematics-render" data-latex="E=mc^2" data-type="inline-math" contenteditable="false"></span>'

test('HTML 特殊字符被转义', () => {
  assert.equal(escapeHtml('<div> & "引号" \'单\''), '&lt;div&gt; &amp; &quot;引号&quot; &#39;单&#39;')
})

test('导出文件包含标题与正文', () => {
  const html = buildHtmlDocument({ title: '周记.md', bodyHtml: '<p>正文</p>', fontSize: 18 })
  assert.ok(html.startsWith('<!doctype html>'))
  assert.ok(html.includes('<title>周记</title>'))
  assert.ok(html.includes('<p>正文</p>'))
  assert.ok(html.includes('--export-size: 18px'))
})

test('标题里的 HTML 会被转义，正文原样保留', () => {
  const html = buildHtmlDocument({ title: '<危险>.md', bodyHtml: '<p>保留</p>' })
  assert.ok(html.includes('<title>&lt;危险&gt;</title>'))
  assert.ok(html.includes('<p>保留</p>'))
})

test('样式内联在文件里，不依赖外部资源', () => {
  const html = buildHtmlDocument({ title: 'a.md', bodyHtml: '<p>x</p>' })
  assert.ok(html.includes('<style>'))
  assert.ok(!html.includes('<link'))
  assert.ok(!html.includes('<script'))
})

test('文件名换扩展名', () => {
  assert.equal(exportName('周记.md', 'html'), '周记.html')
  assert.equal(exportName('a.b.md', 'txt'), 'a.b.txt')
  assert.equal(exportName('', 'html'), '未命名.html')
})

test('frontmatter 渲染成文字块', () => {
  const html = renderFrontmatter('---\ntitle: 周记\ntags: [a, b]\n---\n')
  assert.ok(html.includes('<pre class="frontmatter">'))
  assert.ok(html.includes('title: 周记'))
  assert.ok(!html.includes('---'))
})

test('没有 frontmatter 时不输出空块', () => {
  assert.equal(renderFrontmatter(''), '')
})

test('脚注渲染成列表并转义', () => {
  const html = renderFootnotes('[^1]: 第一条\n[^note]: 带 <标签> 的')
  assert.ok(html.includes('<section class="footnotes">'))
  assert.ok(html.includes('<li>第一条</li>'))
  assert.ok(html.includes('&lt;标签&gt;'))
})

test('没有脚注时不输出空节', () => {
  assert.equal(renderFootnotes(''), '')
})

test('导出时把元数据与脚注一起带上', () => {
  const html = buildHtmlDocument({
    title: '周记.md',
    bodyHtml: '<p>正文</p>',
    frontmatter: '---\ntitle: 周记\n---\n',
    footnotes: '[^1]: 第一条',
  })
  assert.ok(html.includes('title: 周记'))
  assert.ok(html.includes('注释'))
  assert.ok(html.includes('<p>正文</p>'))
})

test('HTML 导出的行内公式渲染成 MathML', () => {
  const html = buildHtmlDocument({ title: '公式.md', bodyHtml: INLINE_MATH_HTML })
  assert.ok(html.includes('<math'))
  assert.ok(html.includes('E=mc<sup>2</sup>') || html.includes('E=mc^2'))
  assert.ok(!html.includes('data-latex=""'))
  assert.ok(html.includes('data-latex="E=mc^2"'))
})

test('HTML 导出的块级公式也渲染成 MathML', () => {
  const html = buildHtmlDocument({ title: '公式.md', bodyHtml: BLOCK_MATH_HTML })
  assert.ok(html.includes('<math'))
  assert.ok(html.includes('mfrac'))
})

test('属性顺序为 data-latex 在前时也能替换', () => {
  const html = buildHtmlDocument({ title: '公式.md', bodyHtml: LATEX_FIRST_HTML })
  assert.ok(html.includes('<math'))
  assert.ok(html.includes('data-latex="E=mc^2"'))
})

test('非法 latex 回退成原文，仍保留 data-latex', () => {
  const broken =
    '<span class="tiptap-mathematics-render" data-type="inline-math" data-latex="\\bad{" contenteditable="false"></span>'
  const html = buildHtmlDocument({ title: '公式.md', bodyHtml: broken })
  assert.ok(html.includes('math-fallback'))
  assert.ok(html.includes('data-latex="\\bad{"'))
  assert.ok(html.includes('$\\bad{$'))
})

test('TXT 导出保留 $latex$，块级保留 $$…$$', () => {
  const text = buildPlainText(`${INLINE_MATH_HTML}${BLOCK_MATH_HTML}`)
  assert.ok(text.includes('$E=mc^2$'))
  assert.ok(text.includes('$$\\frac{a}{b}$$'))
  assert.ok(!text.includes('<math'))
})

test('TXT 导出剥掉标签、保留段落', () => {
  assert.equal(buildPlainText('<p>甲</p><p>乙</p>'), '甲\n乙')
})
