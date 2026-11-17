import assert from 'node:assert/strict'
import test from 'node:test'

import { MarkdownManager } from '@tiptap/markdown'
import { StarterKit } from '@tiptap/starter-kit'

import { disableSingleTildeStrike, repairTildes } from './tilde.ts'

/** 只需要行内 mark / 代码块的扩展集；表格与任务列表不参与本文件断言 */
function makeManager(): MarkdownManager {
  const manager = new MarkdownManager({ extensions: [StarterKit] })
  disableSingleTildeStrike(manager)
  return manager
}

type Json = { type?: string; marks?: { type?: string }[]; content?: Json[] }

/** strike 是 mark 不是 node：两处都要数 */
function countType(node: Json, type: string): number {
  const own = node.type === type ? 1 : 0
  const marks = (node.marks ?? []).filter((mark) => mark.type === type).length
  return own + marks + (node.content ?? []).reduce((sum, child) => sum + countType(child, type), 0)
}

const manager = makeManager()

/** 与 App 的保存链一致的这几步：序列化器会把正文里的 ~ 转义成 \~，所以最后要过 repairTildes */
function throughChain(source: string): string {
  return repairTildes(manager.serialize(manager.parse(source)))
}

test('单个 ~ 不再解析成删除线，整链回到 H~2~O', () => {
  const source = 'H~2~O 是水。'
  assert.equal(countType(manager.parse(source) as Json, 'strike'), 0)
  assert.equal(throughChain(source), source)
})

test('成对的 ~~删除线~~ 仍是删除线', () => {
  const parsed = manager.parse('这是 ~~删除线~~ 文字。')
  assert.equal(countType(parsed as Json, 'strike'), 1)
  assert.ok(manager.serialize(parsed).includes('~~删除线~~'))
})

test('正文里被序列化器转义的 \\~ 能还原成 ~', () => {
  assert.equal(repairTildes('温度 25\\~ 度。\n'), '温度 25~ 度。\n')
})

test('~~~ 围栏里的 \\~ 一个字节都不动', () => {
  const source = '~~~\nconst re = /\\~/\n~~~\n'
  assert.equal(repairTildes(source), source)
})

test('反引号围栏里的 \\~ 一个字节都不动', () => {
  const source = '```\nconst re = /\\~/\n```\n'
  assert.equal(repairTildes(source), source)
})

test('行内代码里的 \\~ 一个字节都不动', () => {
  const source = '试试 `a\\~b` 这段。\n'
  assert.equal(repairTildes(source), source)
})

test('围栏代码里的单个 ~ 与 ~2~ 经整链不被改写', () => {
  const source = '```js\nlet a = ~b\nb~2~d\n```'
  assert.equal(throughChain(source), source)
})

test('未闭合的 ~~abc 不抛错、原样输出', () => {
  assert.equal(throughChain('~~abc'), '~~abc')
})

test('链接文字里的单个 ~ 不变', () => {
  const source = '[H~2~O](https://example.com)'
  assert.equal(throughChain(source), source)
})

test('同一个 manager 重复注册不抛错、输出不变', () => {
  const first = throughChain('H~2~O')
  disableSingleTildeStrike(manager)
  assert.equal(throughChain('H~2~O'), first)
})

test('引用块里的围栏（> ```）与嵌套引用围栏都不动', () => {
  const flat = '> ```js\n> const re = /\\~/\n> ```\n'
  assert.equal(repairTildes(flat), flat)
  const nested = '> > ```js\n> > const re = /\\~/\n> > ```\n'
  assert.equal(repairTildes(nested), nested)
})

test('行内公式里的 \\~ 与 \\~{n} 都不动', () => {
  const source = '公式 $a \\~ b$ 与 $\\~{n}$。\n'
  assert.equal(repairTildes(source), source)
})

test('$$ 块里的 \\~ 不动，价格写法不是公式、正文照修', () => {
  const block = '$$\na \\~ b\n$$\n'
  assert.equal(repairTildes(block), block)
  assert.equal(repairTildes('价格 $5 到 $10，约 25\\~ 度。'), '价格 $5 到 $10，约 25~ 度。')
})
