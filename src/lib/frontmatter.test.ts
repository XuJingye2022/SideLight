import assert from 'node:assert/strict'
import test from 'node:test'

import { joinFrontmatter, leadingNewlines, splitFrontmatter } from './frontmatter.ts'

const BOM = '\uFEFF'

test('常规 frontmatter：两行分隔符与结尾换行都留在 frontmatter 里', () => {
  const text = '---\ntitle: 笔记\ntags: [草稿]\n---\n正文第一行\n'
  const result = splitFrontmatter(text)
  assert.equal(result.frontmatter, '---\ntitle: 笔记\ntags: [草稿]\n---\n')
  assert.equal(result.body, '正文第一行\n')
})

test('没有 frontmatter 时原样返回正文', () => {
  const text = '# 标题\n\n正文'
  const result = splitFrontmatter(text)
  assert.equal(result.frontmatter, '')
  assert.equal(result.body, text)
})

test('正文中间的 --- 不算 frontmatter', () => {
  const text = '开头\n\n---\ntitle: 不是 frontmatter\n---\n结束\n'
  const result = splitFrontmatter(text)
  assert.equal(result.frontmatter, '')
  assert.equal(result.body, text)
})

test('CRLF 文件拆开再拼回仍是 CRLF', () => {
  const text = '---\r\ntitle: 笔记\r\n---\r\n正文\r\n'
  const result = splitFrontmatter(text)
  assert.equal(result.frontmatter, '---\r\ntitle: 笔记\r\n---\r\n')
  assert.equal(result.body, '正文\r\n')
  assert.equal(joinFrontmatter(result.frontmatter, result.body), text)
})

test('BOM 之后仍算开头，BOM 留在 frontmatter 里', () => {
  const text = BOM + '---\ntitle: 笔记\n---\n正文\n'
  const result = splitFrontmatter(text)
  assert.equal(result.frontmatter, BOM + '---\ntitle: 笔记\n---\n')
  assert.equal(result.body, '正文\n')
  assert.equal(joinFrontmatter(result.frontmatter, result.body), text)
})

test('空 frontmatter 也能识别', () => {
  assert.deepEqual(splitFrontmatter('---\n---\n正文\n'), {
    frontmatter: '---\n---\n',
    body: '正文\n',
  })
  assert.deepEqual(splitFrontmatter('---\n---\n'), { frontmatter: '---\n---\n', body: '' })
})

test('只有起始分隔符、没有结束行时不算 frontmatter', () => {
  const text = '---\ntitle: 笔记\n正文\n'
  assert.deepEqual(splitFrontmatter(text), { frontmatter: '', body: text })
})

test('结束行在文件末尾且没有换行时也能拆开', () => {
  const text = '---\ntitle: 笔记\n---'
  assert.deepEqual(splitFrontmatter(text), { frontmatter: text, body: '' })
})

test('分隔符行尾带空白也算', () => {
  const text = '---  \ntitle: 笔记\n---\t\n正文\n'
  const result = splitFrontmatter(text)
  assert.equal(result.frontmatter, '---  \ntitle: 笔记\n---\t\n')
  assert.equal(result.body, '正文\n')
})

test('joinFrontmatter 没有 frontmatter 时原样返回正文', () => {
  assert.equal(joinFrontmatter('', '正文\n'), '正文\n')
  assert.equal(joinFrontmatter('', ''), '')
})

test('joinFrontmatter 给缺结尾换行的 frontmatter 补一个换行', () => {
  assert.equal(joinFrontmatter('---\ntitle: 笔记\n---', '正文'), '---\ntitle: 笔记\n---\n正文')
})

test('拆分再拼回逐字节不变', () => {
  const samples = [
    '---\ntitle: 笔记\n---\n正文\n',
    '---\r\ntitle: 笔记\r\n---\r\n正文',
    '---\n---\n只有空 frontmatter\n',
    BOM + '---\nkey: value\n---\n正文',
    '# 没有 frontmatter\n\n正文\n',
    '',
    '---\n没有结束行\n',
    '正文\n---\n中间的分隔线\n---\n',
  ]
  for (const sample of samples) {
    const { frontmatter, body } = splitFrontmatter(sample)
    assert.equal(joinFrontmatter(frontmatter, body), sample)
  }
})

/* ---------- frontmatter 与正文之间的空行（第 10 轮） ---------- */

test('leadingNewlines 数正文开头的空行：0/1/2/3', () => {
  assert.equal(leadingNewlines('正文\n'), 0)
  assert.equal(leadingNewlines('\n正文\n'), 1)
  assert.equal(leadingNewlines('\n\n正文\n'), 2)
  assert.equal(leadingNewlines('\n\n\n正文\n'), 3)
  assert.equal(leadingNewlines('\r\n\r\n正文'), 2)
  assert.equal(leadingNewlines(''), 0)
})

test('frontmatter 后 0/1/2/3 个空行 split→join 逐字节往返', () => {
  const frontmatter = '---\ntitle: 笔记\n---\n'
  for (const blank of [0, 1, 2, 3]) {
    const text = `${frontmatter}${'\n'.repeat(blank)}正文\n`
    const split = splitFrontmatter(text)
    assert.equal(leadingNewlines(split.body), blank)
    assert.equal(joinFrontmatter(split.frontmatter, split.body, blank), text)
  }
})

test('leading 只在正文非空时补，空正文不多出换行', () => {
  assert.equal(joinFrontmatter('---\n---\n', '', 2), '---\n---\n')
})

test('不传 leading 时 joinFrontmatter 行为与旧版逐字节相同', () => {
  assert.equal(joinFrontmatter('---\n---\n', '\n正文'), '---\n---\n\n正文')
  assert.equal(joinFrontmatter('---\n---', '正文'), '---\n---\n正文')
})
