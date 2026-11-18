import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import katexReal from 'katex'
import { Schema } from '@tiptap/pm/model'

import { __setLoaderForTest, ensureKatex } from './katexLazy.ts'
import {
  applyExportTocHtml,
  buildExportToc,
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

test('脚注缩进续行跟同一条，用 <br> 连接', () => {
  const html = renderFootnotes('[^1]: 第一行定义\n    续行接着写')
  assert.ok(html.includes('第一行定义<br>续行接着写'))
  assert.equal((html.match(/<li>/g) ?? []).length, 1)
})

test('多条脚注各自带上自己的续行', () => {
  const html = renderFootnotes('[^a]: 甲\n    甲续\n[^b]: 乙')
  assert.equal((html.match(/<li>/g) ?? []).length, 2)
  assert.ok(html.includes('甲<br>甲续'))
  assert.ok(html.includes('<li>乙</li>'))
})

test('引用式定义的续行不追加到上一条脚注', () => {
  const html = renderFootnotes('[^1]: 第一行\n    续行\n[label]: 引用定义\n    不该追加')
  assert.ok(html.includes('第一行<br>续行'))
  assert.equal((html.match(/<li>/g) ?? []).length, 1)
  assert.ok(!html.includes('不该追加'))
})

test('脚注定义与续行之间隔空行仍算同一条', () => {
  const html = renderFootnotes('[^1]: 甲\n\n    乙')
  assert.ok(html.includes('甲<br>乙'))
  assert.equal((html.match(/<li>/g) ?? []).length, 1)
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

test('导出 HTML 的打印块用浅底深字，且排在深色块之后', () => {
  const html = buildHtmlDocument({ title: '打印.md', bodyHtml: '<p>正文</p>' })
  const at = html.indexOf('@media print')
  assert.ok(at > 0, '导出 HTML 里没有 @media print')
  // 只看打印块内部：body 规则在文件前面就写着 color: #1d2023，全文件 includes 没有鉴别力
  const printBlock = html.slice(at, at + 400)
  assert.match(printBlock, /body\s*\{\s*color:\s*#1d2023/)
  assert.ok(html.indexOf('prefers-color-scheme: dark') < at, '深色块必须在打印块之前')
})

/* ---------- 第 76 轮 A1（B-134）：HTML 导出带目录、去掉字面 [TOC] ---------- */

const tocSchema = new Schema({
  nodes: {
    doc: { content: 'block+' },
    paragraph: { content: 'inline*', group: 'block' },
    heading: { attrs: { level: { default: 1 } }, content: 'inline*', group: 'block' },
    blockquote: { content: 'block+', group: 'block' },
    text: { group: 'inline' },
  },
})

const tocPara = (text: string) => tocSchema.node('paragraph', null, text ? [tocSchema.text(text)] : [])
const tocHeading = (level: number, text: string) =>
  tocSchema.node('heading', { level }, text ? [tocSchema.text(text)] : [])

test('导出目录：多标题得到锚点 id、nav 与可跳转的 href', () => {
  const doc = tocSchema.node('doc', null, [tocHeading(1, '一'), tocPara('[TOC]'), tocHeading(2, '二')])
  const toc = buildExportToc(doc)
  assert.ok(toc)
  assert.deepEqual(toc.ids, ['sl-toc-0', 'sl-toc-1'])
  assert.ok(toc.nav.startsWith('<nav class="sl-toc"'))
  assert.ok(toc.nav.includes('href="#sl-toc-0"'))
  assert.ok(toc.nav.includes('data-level="2"'))
  const out = applyExportTocHtml('<h1>一</h1><p>[TOC]</p><h2>二</h2>', toc)
  assert.ok(out.includes('<h1 id="sl-toc-0">一</h1>'))
  assert.ok(out.includes('<h2 id="sl-toc-1">二</h2>'))
  assert.ok(!out.includes('[TOC]'))
  assert.ok(out.includes(toc.nav))
  // nav 落在原来标记段的位置：标题一之后、标题二之前
  assert.ok(out.indexOf('id="sl-toc-0"') < out.indexOf('<nav'))
  assert.ok(out.indexOf('<nav') < out.indexOf('id="sl-toc-1"'))
})

test('导出目录：没有标题时不生成目录', () => {
  const doc = tocSchema.node('doc', null, [tocPara('正文'), tocPara('[TOC]')])
  assert.equal(buildExportToc(doc), null)
  assert.equal(applyExportTocHtml('<p>[TOC]</p>', null), '<p>[TOC]</p>')
})

test('导出目录：没有 [TOC] 标记时返回 null，标题不加 id', () => {
  const doc = tocSchema.node('doc', null, [tocHeading(1, '一'), tocPara('正文')])
  assert.equal(buildExportToc(doc), null)
  const body = '<h1>一</h1><p>正文</p>'
  const out = applyExportTocHtml(body, null)
  assert.equal(out, body)
  assert.ok(!out.includes('id="sl-toc-0"'))
})

test('导出目录：原文里标记行全被转义时不出目录，字面保留', () => {
  const doc = tocSchema.node('doc', null, [tocHeading(1, '一'), tocPara('[TOC]')])
  assert.equal(buildExportToc(doc, '\\[TOC\\]\n'), null)
  const body = '<h1>一</h1><p>[TOC]</p>'
  const out = applyExportTocHtml(body, null)
  assert.equal(out, body)
  assert.ok(out.includes('<p>[TOC]</p>'))
  // 对照：原文里是未转义标记时照常生成
  assert.ok(buildExportToc(doc, '[TOC]\n'))
})

test('导出目录：引用块里的标题不计入，标题前的 <br> 段落不挡 id', () => {
  const doc = tocSchema.node('doc', null, [
    tocPara('[TOC]'),
    tocSchema.node('blockquote', null, [tocHeading(2, '引用里的标题')]),
    tocHeading(1, '真章节'),
  ])
  const toc = buildExportToc(doc)
  assert.ok(toc)
  assert.equal(toc.ids.length, 1)
  const body = '<p>[TOC]</p><blockquote><h2>引用里的标题</h2></blockquote><p>甲<br>乙</p><h1>真章节</h1>'
  const out = applyExportTocHtml(body, toc)
  assert.ok(out.includes('<h1 id="sl-toc-0">真章节</h1>'))
  assert.ok(!out.includes('id="sl-toc-1"'))
  assert.ok(out.includes('<blockquote><h2>引用里的标题</h2></blockquote>'))
  assert.ok(!out.includes('[TOC]'))
})

test('导出目录：标题文字里的 <b> 与 & 已转义，小写 [toc] 也换成 nav', () => {
  const doc = tocSchema.node('doc', null, [tocHeading(1, 'A<b>&C'), tocPara('[toc]')])
  const toc = buildExportToc(doc)
  assert.ok(toc)
  assert.ok(toc.nav.includes('A&lt;b&gt;&amp;C'))
  const out = applyExportTocHtml('<h1>A&lt;b&gt;&amp;C</h1><p> [toc] </p>', toc)
  assert.ok(out.includes('<h1 id="sl-toc-0">A&lt;b&gt;&amp;C</h1>'))
  assert.ok(out.includes(toc.nav))
  assert.ok(!out.includes('[toc]'))
})

/* ---------- 第 86 轮 A2（B-216）：导出样式补三条行内语法 ---------- */

type CssRule = { selector: string; body: string; at: number }

/** 按规则块切导出文件里的 `<style>`；注释先摘掉，否则注释里提到的选择器会被当成一条规则 */
const exportStyleRules = (): CssRule[] => {
  const html = buildHtmlDocument({ title: '样式.md', bodyHtml: '<p>正文</p>' })
  const start = html.indexOf('<style>') + '<style>'.length
  const style = html.slice(start, html.indexOf('</style>'))
  return [...style.matchAll(/([^{}]*)\{([^{}]*)\}/g)].map((match) => ({
    selector: match[1].replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\s+/g, ' ').trim(),
    body: match[2].replace(/\s+/g, ' '),
    at: match.index ?? 0,
  }))
}

const declarations = (rule: CssRule): Map<string, string> => {
  const map = new Map<string, string>()
  // 规则体里也可能夹注释（styles.css 的 `:root` 就是），不摘掉会把下一个 token 的键粘连
  const body = rule.body.replace(/\/\*[\s\S]*?\*\//g, ' ')
  for (const part of body.split(';')) {
    const at = part.indexOf(':')
    if (at < 0) continue
    map.set(part.slice(0, at).trim(), part.slice(at + 1).trim())
  }
  return map
}

/** 导出样式里的行内语法规则：`.sl-eq` 三条（浅色 / 深色块 / 打印块），sup/sub 各一条 */
const syntaxRules = (selector: string, expected = 1): CssRule[] => {
  const found = exportStyleRules().filter((rule) => rule.selector === selector)
  assert.equal(found.length, expected, `${selector} 应有 ${expected} 条，实际 ${found.length}`)
  return found
}

test('导出样式：.sl-eq 浅底内边距圆角，深色块与打印块各自改底色', () => {
  const [light, dark, print] = syntaxRules('.sl-eq', 3)
  const base = declarations(light)
  assert.equal(base.get('background'), '#f0e0bd', '==高亮== 在导出页也要有底色（app 的 --mark-bg 浅色值）')
  assert.equal(base.get('padding'), '0 1px')
  assert.equal(base.get('border-radius'), '2px')
  assert.equal(declarations(dark).get('background'), '#453618', '深色系统下换成深色 --mark-bg')
  assert.equal(declarations(print).get('background'), '#f0e0bd', '打印回浅底')
  // 顺序：深色块在打印块之前（同权重靠顺序胜出）
  assert.ok(dark.at < print.at, '深色块必须排在打印块之前')
})

test('导出样式：.sl-sup / .sl-sub 五项与屏幕规则同值', () => {
  for (const selector of ['.sl-sup', '.sl-sub']) {
    const [rule] = syntaxRules(selector)
    const found = declarations(rule)
    assert.equal(found.get('font-size'), '0.75em', `${selector} 字号要比正文小`)
    assert.equal(found.get('line-height'), '0')
    assert.equal(found.get('position'), 'relative')
    assert.equal(found.get('vertical-align'), 'baseline')
  }
  assert.equal(declarations(syntaxRules('.sl-sup')[0]).get('top'), '-0.5em', '上标要抬起来')
  assert.equal(declarations(syntaxRules('.sl-sub')[0]).get('bottom'), '-0.25em', '下标要沉下去')
})

test('导出样式漂移门：底色与 sup/sub 五项逐项读 src/styles.css 对照', () => {
  const css = readFileSync('src/styles.css', 'utf8')
  const rules: CssRule[] = [...css.matchAll(/([^{}]*)\{([^{}]*)\}/g)].map((match) => ({
    selector: match[1].replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\s+/g, ' ').trim(),
    body: match[2].replace(/\s+/g, ' '),
    at: match.index ?? 0,
  }))
  const vars = (selector: string): Map<string, string> => {
    const rule = rules.find((candidate) => candidate.selector === selector)
    assert.ok(rule, `styles.css 里找不到「${selector}」变量块`)
    return declarations(rule)
  }
  const light = vars(':root')
  const dark = vars("html[data-theme='dark']")

  // 三个 token 就是导出页上的三处底色
  assert.equal(vars('.doc-body .sl-eq').get('background'), 'var(--mark-bg)')
  assert.equal(declarations(syntaxRules('.sl-eq', 3)[0]).get('background'), light.get('--mark-bg'))
  assert.equal(declarations(syntaxRules('.sl-eq', 3)[1]).get('background'), dark.get('--mark-bg'))

  for (const selector of ['.sl-sup', '.sl-sub']) {
    const screenRule = rules.find((rule) => rule.selector === `.doc-body ${selector}`)
    assert.ok(screenRule, `styles.css 里找不到「.doc-body ${selector}」`)
    const screen = declarations(screenRule)
    const exported = declarations(syntaxRules(selector)[0])
    const properties = ['font-size', 'line-height', 'position', 'vertical-align', selector === '.sl-sup' ? 'top' : 'bottom']
    for (const property of properties) {
      assert.equal(exported.get(property), screen.get(property), `${selector} 的 ${property} 与屏幕不一致`)
    }
  }
})
