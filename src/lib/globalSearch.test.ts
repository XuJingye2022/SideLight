import assert from 'node:assert/strict'
import test from 'node:test'

import {
  MAX_SEARCH_BYTES,
  MAX_SEARCH_HITS,
  collectDocs,
  searchWorkspace,
} from './globalSearch.ts'
import { MAX_DOC_BYTES, type WorkspaceFileNode } from './workspace.ts'

// 假句柄只带 readNode 用到的 getFile；File 自带 size/text，大小判定走真实现
function fakeNode(text: string, path = '工作区/a.md'): WorkspaceFileNode {
  return {
    kind: 'file',
    name: path.split('/').at(-1) ?? path,
    path,
    handle: {
      kind: 'file',
      name: path,
      getFile: async () => new File([text], path),
    } as unknown as FileSystemFileHandle,
  }
}

function brokenNode(path = '工作区/坏.md'): WorkspaceFileNode {
  return {
    kind: 'file',
    name: '坏.md',
    path,
    handle: {
      kind: 'file',
      name: path,
      getFile: async () => {
        throw new DOMException('read failed', 'NotFoundError')
      },
    } as unknown as FileSystemFileHandle,
  }
}

test('行列号：行从 1 起、列按 UTF-16 码元从 1 起', () => {
  const doc = { path: '工作区/甲.md', text: '# 标题\n\n第一段提到灯火。\n' }
  const report = searchWorkspace([doc], '灯火')
  assert.equal(report.hits.length, 1)
  assert.deepEqual(report.hits[0], {
    path: '工作区/甲.md',
    line: 3,
    column: 6,
    snippet: '第一段提到灯火。',
  })
  assert.equal(report.truncated, false)
  assert.equal(report.scanned, 1)
})

test('同一行出现多次各记一条；CRLF 不改变行号', () => {
  const report = searchWorkspace([{ path: 'w/a.md', text: '甲甲甲\r\n乙灯火\r\n' }], '甲')
  assert.deepEqual(
    report.hits.map((hit) => [hit.line, hit.column]),
    [
      [1, 1],
      [1, 2],
      [1, 3],
    ],
  )

  const crlf = searchWorkspace([{ path: 'w/b.md', text: '第一行\r\n第二行灯火\r\n' }], '灯火')
  assert.equal(crlf.hits[0].line, 2)
  assert.equal(crlf.hits[0].column, 4)
})

test('200 条截断：多出来的不列，标记 truncated', () => {
  const lines = Array.from({ length: 250 }, (_, index) => `第${index + 1}行 灯火`)
  const report = searchWorkspace([{ path: 'w/长.md', text: lines.join('\n') }], '灯火')
  assert.equal(report.hits.length, MAX_SEARCH_HITS)
  assert.equal(report.truncated, true)
  assert.equal(report.hits.at(-1)?.line, MAX_SEARCH_HITS)

  const few = searchWorkspace([{ path: 'w/短.md', text: '灯火\n灯火\n' }], '灯火')
  assert.equal(few.hits.length, 2)
  assert.equal(few.truncated, false)
})

test('超过 1 MiB 的文档不搜：oversized 计数，字节数按 UTF-8 算', () => {
  const ascii = 'x'.repeat(MAX_SEARCH_BYTES + 1)
  const report = searchWorkspace(
    [
      { path: 'w/大.md', text: ascii },
      { path: 'w/中.md', text: '灯火' },
    ],
    '灯火',
  )
  assert.equal(report.oversized, 1)
  assert.equal(report.scanned, 1)
  assert.deepEqual(report.hits.map((hit) => hit.path), ['w/中.md'])

  // 40 万个汉字 = 1.2 MB，字符数没超 1 Mi，但字节数超了
  const cjk = '灯'.repeat(400_000)
  assert.equal(searchWorkspace([{ path: 'w/cjk.md', text: cjk }], '灯').oversized, 1)
})

test('大小写：默认不区分，打开 caseSensitive 后只认原样', () => {
  const doc = { path: 'w/en.md', text: 'Light and light' }
  const loose = searchWorkspace([doc], 'LIGHT')
  assert.deepEqual(loose.hits.map((hit) => hit.column), [1, 11])

  const strict = searchWorkspace([doc], 'light', { caseSensitive: true })
  assert.deepEqual(strict.hits.map((hit) => hit.column), [11])

  assert.equal(searchWorkspace([doc], 'LIGHT', { caseSensitive: true }).hits.length, 0)
})

test('空查询不搜；正则特殊字符按字面匹配', () => {
  assert.deepEqual(searchWorkspace([{ path: 'w/a.md', text: '灯火' }], '   '), {
    hits: [],
    truncated: false,
    scanned: 0,
    oversized: 0,
  })
  const report = searchWorkspace([{ path: 'w/a.md', text: '价格 $5 (含税) a.b' }], 'a.b')
  assert.equal(report.hits.length, 1)
  assert.equal(report.hits[0].column, 12)
})

test('collectDocs：读不到的跳过、超过 1 MiB 的跳过，其余按原顺序保留', async () => {
  const files = [
    fakeNode('第一', 'w/b.md'),
    brokenNode('w/坏.md'),
    fakeNode('x'.repeat(MAX_SEARCH_BYTES + 1), 'w/大.md'),
    fakeNode('灯'.repeat(400_000), 'w/cjk.md'),
    fakeNode('第四', 'w/a.md'),
  ]
  const collected = await collectDocs(files)
  assert.deepEqual(
    collected.docs.map((doc) => doc.path),
    ['w/b.md', 'w/a.md'],
  )
  assert.equal(collected.skipped, 3)
  assert.equal(collected.capped, false)
})

test('collectDocs：正好 1 MiB 仍搜，多 1 字节就跳过；文件数超上限只读前面这些', async () => {
  const exact = await collectDocs([fakeNode('x'.repeat(MAX_SEARCH_BYTES), 'w/满.md')])
  assert.equal(exact.docs.length, 1)
  assert.equal(exact.skipped, 0)

  const over = await collectDocs([fakeNode('x'.repeat(MAX_SEARCH_BYTES + 1), 'w/超.md')])
  assert.equal(over.docs.length, 0)
  assert.equal(over.skipped, 1)

  const many = Array.from({ length: 4 }, (_, index) => fakeNode('灯火', `w/${index}.md`))
  const capped = await collectDocs(many, { maxFiles: 2 })
  assert.deepEqual(capped.docs.map((doc) => doc.path), ['w/0.md', 'w/1.md'])
  assert.equal(capped.capped, true)
})

test('readNode 的超大文件门槛与搜索门槛是两条线，互不影响', () => {
  // 搜索门槛 1 MiB 必须小于打开门槛 5.5 MiB，否则「能打开却搜不到」会没有解释
  assert.ok(MAX_SEARCH_BYTES < MAX_DOC_BYTES)
})
