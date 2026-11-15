import assert from 'node:assert/strict'
import test from 'node:test'

import { buildHtmlDocument, escapeHtml, exportName, renderFootnotes, renderFrontmatter } from './export.ts'

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
