import assert from 'node:assert/strict'
import test from 'node:test'

import { serializeDocument } from './serializeDocument.ts'

/**
 * 保存唯一出口的回归锁（第 42 轮）。
 * 只需要能吐 Markdown 的对象：假源就是 { getMarkdown }，不引入 tiptap。
 * 这些断言锁的是当前输出，不是语义规格——改序列化链时若输出变化，要判断是修好了还是破功。
 */
const source = (markdown: string) => ({ getMarkdown: () => markdown })

test('① 无 original：正文原样输出，不多加尾部空行', () => {
  const markdown = '# 甲\n\n正文。\n'
  assert.equal(serializeDocument(source(markdown)), markdown)
})

test('② original 以 \\n 结尾：输出保留同样一个换行', () => {
  const original = '# 甲\n\n正文。\n'
  assert.equal(serializeDocument(source('# 甲\n\n正文。'), { original }), original)
})

test('③ original 是 CRLF：结尾换行是 \\r\\n，正文仍是 \\n（整篇转换在 prepareSave）', () => {
  const out = serializeDocument(source('# 甲\n\n正文。'), { original: '# 甲\r\n\r\n正文。\r\n' })
  assert.equal(out, '# 甲\n\n正文。\r\n')
  assert.equal(out.replace(/\r\n$/, '').includes('\r'), false)
})

test('④ frontmatter 选项拼在正文前，正文开头的空行跟随原文', () => {
  const original = '---\ntitle: 甲\n---\n\n正文。\n'
  const out = serializeDocument(source('正文。\n'), { frontmatter: '---\ntitle: 甲\n---\n', original })
  assert.equal(out, original)
})

test('⑤ footnotes 选项拼在正文后，与正文空一行', () => {
  const out = serializeDocument(source('正文。[^1]'), { footnotes: '[^1]: 注释' })
  assert.equal(out, '正文。[^1]\n\n[^1]: 注释')
})

test('⑥ repairTildes 生效：序列化出的 \\~ 还成 ~', () => {
  assert.equal(serializeDocument(source('水的写法 H\\~2\\~O。')), '水的写法 H~2~O。')
})

test('⑦ repairCalloutMarkers 生效：被转义的 callout 标记还原', () => {
  assert.equal(
    serializeDocument(source('> \\[!NOTE\\]\n> 注释行\n')),
    '> [!NOTE]\n> 注释行\n',
  )
})

test('⑧ repairHtml 用原文还原实体：原文写 & 就解，原文写 &amp; 就保持', () => {
  const original = 'A & B 与 a < b\n'
  assert.equal(serializeDocument(source('A &amp; B 与 a &lt; b'), { original }), original)
  const literal = '讲转义：&amp; 这条实体\n'
  assert.equal(serializeDocument(source('讲转义：&amp; 这条实体'), { original: literal }), literal)
})

test('⑨ reuseTables：原文里没改动的表格块按字节复用（单元格空白不重排）', () => {
  const original = '# 表\n\n| 甲   | 乙 |\n| --- | --- |\n| 1   | 2  |\n'
  const serialized = '# 表\n\n| 甲 | 乙 |\n| --- | --- |\n| 1 | 2 |\n'
  const out = serializeDocument(source(serialized), { original })
  assert.equal(out, original)
  assert.ok(out.includes('| 甲   | 乙 |'))
})

test('⑩ collapseBlankParagraphs：连续空段落里的 &nbsp; 行被收掉', () => {
  assert.equal(serializeDocument(source('段一\n\n&nbsp;\n\n段二\n')), '段一\n\n段二\n')
})
