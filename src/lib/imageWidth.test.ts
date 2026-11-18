import assert from 'node:assert/strict'
import test from 'node:test'

import { MarkdownManager } from '@tiptap/markdown'
import { StarterKit } from '@tiptap/starter-kit'

import { ResolvingImage } from './assetImage.ts'
import { escapeHtmlForParse } from './html.ts'
import {
  clampImageWidth,
  imageHtmlOf,
  imageMarkdownOf,
  imageWidthFromDrag,
  isImageHtmlLine,
  parseImageHtml,
} from './imageWidth.ts'

/* ---------- 写回形态：有宽度出规范形 HTML 行（第 87 轮 B-103） ---------- */

const IMG = (width: string) => `<img src="assets/a.png" alt="a" width="${width}">`

test('合规宽度写成规范形整行（src→alt→width，无 />）', () => {
  assert.equal(imageHtmlOf({ src: 'assets/a.png', alt: 'a', width: '320' }), IMG('320'))
  assert.equal(imageHtmlOf({ src: 'assets/a.png', alt: 'a', width: 80 }), IMG('80'))
})

test('title 非空才写，位置在 alt 与 width 之间', () => {
  assert.equal(
    imageHtmlOf({ src: 'assets/a.png', alt: 'a', title: '图注', width: 320 }),
    '<img src="assets/a.png" alt="a" title="图注" width="320">',
  )
  assert.equal(imageHtmlOf({ src: 'assets/a.png', alt: 'a', title: '', width: 320 }), IMG('320'))
})

test('不合规宽度不写 HTML：缺省、空串、非整数、越界夹取', () => {
  assert.equal(imageHtmlOf({ src: 'assets/a.png', alt: 'a' }), null)
  assert.equal(imageHtmlOf({ src: 'assets/a.png', alt: 'a', width: '' }), null)
  assert.equal(imageHtmlOf({ src: 'assets/a.png', alt: 'a', width: '320.5' }), null)
  // 越界是夹取（不是退回 markdown）：写入永远是 40–2000 的整数
  assert.equal(imageHtmlOf({ src: 'assets/a.png', alt: 'a', width: 12 }), IMG('40'))
  assert.equal(imageHtmlOf({ src: 'assets/a.png', alt: 'a', width: '9999' }), IMG('2000'))
})

test('属性值放不进双引号时退回 null（P2-2：宽度丢、图不丢）', () => {
  assert.equal(imageHtmlOf({ src: 'assets/a"b.png', alt: 'a', width: 320 }), null)
  assert.equal(imageHtmlOf({ src: 'assets/a.png', alt: 'a"b', width: 320 }), null)
  assert.equal(imageHtmlOf({ src: 'assets/a.png', alt: 'a', title: 'x"y', width: 320 }), null)
  assert.equal(imageHtmlOf({ src: 'assets/a<b.png', alt: 'a', width: 320 }), null)
  // 退回 markdown 仍是一张图：宽度丢、图不丢
  assert.equal(imageMarkdownOf({ src: 'assets/a.png', alt: 'a"b', width: 320 }), '![a"b](assets/a.png)')
})

test('无宽度时写回仍是图片 markdown（老文档字节不变）', () => {
  assert.equal(imageMarkdownOf({ src: 'assets/a.png', alt: 'a' }), '![a](assets/a.png)')
  assert.equal(imageMarkdownOf({ src: 'assets/a.png', alt: 'a', title: '图注' }), '![a](assets/a.png "图注")')
})

test("节点属性是字符串 '320' 时也写得出宽度（H6）", () => {
  const html = imageMarkdownOf({ src: 'assets/a.png', alt: 'a', width: '320' })
  assert.equal(html, IMG('320'))
  assert.equal(parseImageHtml(html)?.width, 320)
})

/* ---------- 严格全行解析：五类负向一律不认 ---------- */

test('规范形整行解析出四个值', () => {
  assert.deepEqual(parseImageHtml(IMG('320')), {
    src: 'assets/a.png',
    alt: 'a',
    title: null,
    width: 320,
  })
  assert.deepEqual(parseImageHtml('<img src="a.png" alt="x" title="t" width="80">'), {
    src: 'a.png',
    alt: 'x',
    title: 't',
    width: 80,
  })
})

test('负向：没有 width 不是规范形', () => {
  assert.equal(parseImageHtml('<img src="assets/a.png" alt="a">'), null)
  assert.equal(isImageHtmlLine('<img src="assets/a.png" alt="a">'), false)
})

test('负向：单引号不是规范形', () => {
  assert.equal(parseImageHtml("<img src='assets/a.png' alt='a' width='320'>"), null)
  assert.equal(isImageHtmlLine("<img src='assets/a.png' alt='a' width='320'>"), false)
})

test('负向：自闭合的 /> 不是规范形', () => {
  assert.equal(parseImageHtml('<img src="assets/a.png" alt="a" width="320" />'), null)
  assert.equal(isImageHtmlLine('<img src="assets/a.png" alt="a" width="320" />'), false)
})

test('负向：属性顺序不同不是规范形', () => {
  assert.equal(parseImageHtml('<img alt="a" src="assets/a.png" width="320">'), null)
  assert.equal(parseImageHtml('<img src="assets/a.png" width="320" alt="a">'), null)
  assert.equal(isImageHtmlLine('<img alt="a" src="assets/a.png" width="320">'), false)
})

test('负向：多属性不是规范形（height / data-*）', () => {
  assert.equal(isImageHtmlLine('<img src="assets/a.png" alt="a" height="10" width="320">'), false)
  assert.equal(imageHtmlOf({ src: 'assets/a.png', alt: 'a', width: 320, height: '10' }), IMG('320'))
  // 写回不写 height，所以带 height 的行永远不会被认成规范形（保存时保持字面）
  assert.equal(isImageHtmlLine('<img src="assets/a.png" alt="a" data-x="1" width="320">'), false)
})

test('宽度必须是规范十进制写法（0320 不算）', () => {
  assert.equal(parseImageHtml('<img src="assets/a.png" alt="a" width="0320">'), null)
  assert.equal(isImageHtmlLine('<img src="assets/a.png" alt="a" width="0320">'), false)
})

/* ---------- 夹取与拖拽换算（H4/H6） ---------- */

test('clampImageWidth：字符串、上下界、非整数', () => {
  assert.equal(clampImageWidth('320'), 320)
  assert.equal(clampImageWidth(320), 320)
  assert.equal(clampImageWidth(40), 40)
  assert.equal(clampImageWidth(39), 40)
  assert.equal(clampImageWidth(2000), 2000)
  assert.equal(clampImageWidth(2001), 2000)
  assert.equal(clampImageWidth(320.5), null)
  assert.equal(clampImageWidth('abc'), null)
  assert.equal(clampImageWidth(''), null)
  assert.equal(clampImageWidth(null), null)
  assert.equal(clampImageWidth(undefined), null)
})

test('imageWidthFromDrag：起点 + dx 再夹取', () => {
  assert.equal(imageWidthFromDrag('320', 80), 400)
  assert.equal(imageWidthFromDrag('1990', 80), 2000)
  assert.equal(imageWidthFromDrag(40, -80), 40)
  assert.equal(imageWidthFromDrag('abc', 80), 120)
  assert.equal(imageWidthFromDrag(400, 10.4), 410)
})

/* ---------- 序列化接线：注册的节点扩展真的写回 HTML 行 ---------- */

const manager = new MarkdownManager({ extensions: [StarterKit, ResolvingImage] })

const imageDoc = (attrs: Record<string, unknown>) => ({
  type: 'doc',
  content: [{ type: 'image', attrs: { src: 'assets/a.png', alt: 'a', title: null, height: null, ...attrs } }],
})

test('manager.serialize：有宽度写规范形 HTML 行', () => {
  assert.equal(manager.serialize(imageDoc({ width: '320' })), '<img src="assets/a.png" alt="a" width="320">')
})

test('manager.serialize：无宽度仍写图片 markdown', () => {
  assert.equal(manager.serialize(imageDoc({ width: null })), '![a](assets/a.png)')
})

/* ---------- 解析放行：整行规范形原样，其余照旧转义（H1/H2） ---------- */

test('正向：顶层整行规范形原样放行', () => {
  const line = IMG('320')
  assert.equal(escapeHtmlForParse(line), line)
})

test('正向：列表 2 空格与二级列表 4 空格续行原样', () => {
  const nested = `- 项\n    ${IMG('320')}`
  assert.equal(escapeHtmlForParse(nested), nested)
  const twoLevel = `- 项\n  - 项\n    ${IMG('320')}`
  assert.equal(escapeHtmlForParse(twoLevel), twoLevel)
})

test('正向：引用 `> `、`> > ` 与「引用内列表」`>   ` 三种前缀原样（P2-1）', () => {
  for (const line of [`> ${IMG('320')}`, `> > ${IMG('320')}`, `>   ${IMG('320')}`]) {
    assert.equal(escapeHtmlForParse(line), line)
  }
})

test('负向：行内夹着 `<img>` 与行内代码旁的一律转义', () => {
  const inlineAfterText = `前文${IMG('320')}`
  assert.equal(escapeHtmlForParse(inlineAfterText), inlineAfterText.replace('<img', '&lt;img'))
  const afterCode = '`x` ' + IMG('320')
  assert.equal(escapeHtmlForParse(afterCode), '`x` ' + IMG('320').replace('<img', '&lt;img'))
})

test('负向：老文档四形（无 width / 单引号 / /> / 顺序不同）全部转义', () => {
  const forms = [
    '<img src="assets/a.png" alt="a">',
    "<img src='assets/a.png' alt='a' width='320'>",
    '<img src="assets/a.png" alt="a" width="320" />',
    '<img alt="a" src="assets/a.png" width="320">',
  ]
  for (const form of forms) {
    assert.equal(escapeHtmlForParse(form), form.replace('<img', '&lt;img'))
  }
})

test('负向：多属性行与 4 空格顶层缩进的非规范形仍转义', () => {
  const multi = '<img src="assets/a.png" alt="a" height="10" width="320">'
  assert.equal(escapeHtmlForParse(multi), multi.replace('<img', '&lt;img'))
  const indentedBad = `    <img src="assets/a.png" alt="a">`
  assert.equal(escapeHtmlForParse(indentedBad), indentedBad.replace('<img', '&lt;img'))
})

test('围栏与行内代码里的规范形一个字节都不动（既有口径）', () => {
  const fenced = '```\n' + IMG('320') + '\n```\n'
  assert.equal(escapeHtmlForParse(fenced), fenced)
  assert.equal(escapeHtmlForParse('用 `' + IMG('320') + '` 表示图片。'), '用 `' + IMG('320') + '` 表示图片。')
})
