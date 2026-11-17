import assert from 'node:assert/strict'
import test from 'node:test'

import { getSchema } from '@tiptap/core'
import { StarterKit } from '@tiptap/starter-kit'

import {
  __getLastError,
  __getLoadCount,
  __setLoaderForTest,
  ensureMermaid,
  fallbackHint,
  isMermaidLanguage,
  listMermaidBlocks,
  mermaidHash,
  removeMermaidContainer,
  renderDiagram,
  resolveMermaidTheme,
} from './mermaidLazy.ts'

const schema = getSchema([StarterKit])

function fakeMermaid(impl?: { render?: (id: string, text: string) => Promise<{ svg: string }> }) {
  const calls: string[] = []
  const inits: Array<Record<string, unknown>> = []
  return {
    calls,
    inits,
    module: {
      mermaid: {
        initialize(config: Record<string, unknown>) {
          inits.push(config)
        },
        async render(id: string, text: string) {
          calls.push(text)
          if (impl?.render) return impl.render(id, text)
          return { svg: `<svg id="${id}"></svg>` }
        },
      },
    },
  }
}

test('mermaid：渲染成功拿到 svg，不改入参', async () => {
  const fake = fakeMermaid()
  __setLoaderForTest(async () => fake.module)
  const code = 'graph TD; A-->B'
  const before = `${code}`
  const result = await renderDiagram(code)
  assert.ok('svg' in result && result.svg.includes('<svg'))
  assert.equal(code, before)
  assert.equal(fake.inits.length, 1)
})

test('mermaid：渲染失败不抛错，给一句话提示', async () => {
  const fake = fakeMermaid({
    render: async () => {
      throw new Error('bad syntax')
    },
  })
  __setLoaderForTest(async () => fake.module)
  const result = await renderDiagram('not a valid diagram')
  assert.ok('error' in result)
  assert.ok(typeof result.error === 'string' && result.error.length > 0)
  assert.ok(fallbackHint().includes('原文'))
  assert.ok(__getLastError() instanceof Error)
})

test('mermaid：只加载一次，同一份代码只渲染一次', async () => {
  const fake = fakeMermaid()
  __setLoaderForTest(async () => fake.module)
  await renderDiagram('graph TD; A-->B')
  await renderDiagram('graph LR; C-->D')
  assert.equal(__getLoadCount(), 1)
  assert.equal(fake.calls.length, 2)

  await renderDiagram('graph TD; A-->B')
  assert.equal(__getLoadCount(), 1)
  assert.equal(fake.calls.length, 2)
  // 第 46 轮 R1：ensureMermaid() 的早退分支现在每次都会过 configure()，
  // 靠 appliedTheme 守卫保证同主题不重复 initialize（Node 下主题恒 default）
  assert.equal(fake.inits.length, 1)
})

test('mermaid：同一份代码并发渲染只调一次 loader', async () => {
  const fake = fakeMermaid()
  __setLoaderForTest(async () => fake.module)
  await Promise.all([ensureMermaid(), ensureMermaid(), ensureMermaid()])
  assert.equal(__getLoadCount(), 1)
  assert.equal(fake.inits.length, 1)
})

test('mermaid：收集代码块，跳过其它语言', () => {
  const doc = schema.nodeFromJSON({
    type: 'doc',
    content: [
      { type: 'codeBlock', attrs: { language: 'mermaid' }, content: [{ type: 'text', text: 'graph TD;\n  A-->B\n' }] },
      { type: 'paragraph', content: [{ type: 'text', text: '中间一段' }] },
      { type: 'codeBlock', attrs: { language: 'js' }, content: [{ type: 'text', text: 'const a = 1' }] },
      { type: 'codeBlock', attrs: { language: 'mermaid' }, content: [{ type: 'text', text: 'graph LR;\n  C-->D' }] },
    ],
  })
  const blocks = listMermaidBlocks(doc)
  assert.equal(blocks.length, 2)
  assert.equal(blocks[0].code, 'graph TD;\n  A-->B')
  assert.equal(blocks[1].code, 'graph LR;\n  C-->D')
  assert.ok(blocks[1].pos > blocks[0].pos)
  assert.notEqual(blocks[0].hash, blocks[1].hash)
  assert.equal(blocks[0].hash, mermaidHash(blocks[0].code))
  assert.equal(isMermaidLanguage('mermaid'), true)
  assert.equal(isMermaidLanguage('Mermaid'), true)
  assert.equal(isMermaidLanguage('js'), false)
  assert.equal(isMermaidLanguage(null), false)
})

test('mermaid：没有 mermaid 块就不加载', () => {
  __setLoaderForTest(async () => {
    throw new Error('不该被调用')
  })
  const doc = schema.nodeFromJSON({
    type: 'doc',
    content: [
      { type: 'paragraph', content: [{ type: 'text', text: '纯文字' }] },
      { type: 'codeBlock', attrs: { language: 'ts' }, content: [{ type: 'text', text: 'let a = 1' }] },
    ],
  })
  assert.deepEqual(listMermaidBlocks(doc), [])
  assert.equal(__getLoadCount(), 0)
})

test('mermaid：列表项里的围栏也收集（第 38 轮）', () => {
  const doc = schema.nodeFromJSON({
    type: 'doc',
    content: [
      {
        type: 'bulletList',
        content: [
          {
            type: 'listItem',
            content: [
              { type: 'paragraph', content: [{ type: 'text', text: '一项' }] },
              { type: 'codeBlock', attrs: { language: 'mermaid' }, content: [{ type: 'text', text: 'graph TD;\n  A-->B' }] },
            ],
          },
        ],
      },
    ],
  })
  const blocks = listMermaidBlocks(doc)
  assert.equal(blocks.length, 1)
  assert.equal(blocks[0].code, 'graph TD;\n  A-->B')
  assert.ok(blocks[0].pos > 0)
})

test('mermaid：引用块里的围栏也收集，pos 单调递增', () => {
  const doc = schema.nodeFromJSON({
    type: 'doc',
    content: [
      {
        type: 'blockquote',
        content: [
          { type: 'codeBlock', attrs: { language: 'mermaid' }, content: [{ type: 'text', text: 'graph LR;\n  Q-->R' }] },
        ],
      },
      { type: 'codeBlock', attrs: { language: 'mermaid' }, content: [{ type: 'text', text: 'graph TD;\n  S-->T' }] },
    ],
  })
  const blocks = listMermaidBlocks(doc)
  assert.equal(blocks.length, 2)
  assert.ok(blocks[1].pos > blocks[0].pos)
  // 顶层行为不变
  assert.equal(blocks[1].code, 'graph TD;\n  S-->T')
})

/* ---------- 第 46 轮 T3：主题解析（纯函数，不碰 document/matchMedia） ---------- */

test('mermaid 主题：data-theme=dark → dark', () => {
  assert.equal(resolveMermaidTheme('dark', false), 'dark')
})

test('mermaid 主题：data-theme=light 时系统深色也按浅色', () => {
  assert.equal(resolveMermaidTheme('light', true), 'default')
})

test('mermaid 主题：没设置 data-theme 时跟随系统（深色）', () => {
  assert.equal(resolveMermaidTheme(null, true), 'dark')
})

test('mermaid 主题：system + 系统浅色 → default', () => {
  assert.equal(resolveMermaidTheme('system', false), 'default')
})

/* ---------- 第 47 轮 T3：错误图不留在 body 下 ---------- */

test('mermaid：initialize 带 suppressErrorRendering', async () => {
  const fake = fakeMermaid()
  __setLoaderForTest(async () => fake.module)
  await renderDiagram('graph TD; A-->B')
  assert.equal(fake.inits[0].suppressErrorRendering, true)
})

test('mermaid：清理只认自己那个容器，找不到时不抛', async () => {
  const removed: string[] = []
  const doc = {
    getElementById(elementId: string) {
      if (elementId !== 'dmermaid-preview-1') return null
      return { remove: () => removed.push(elementId) }
    },
  }
  removeMermaidContainer('mermaid-preview-1', doc)
  removeMermaidContainer('mermaid-preview-2', doc)
  removeMermaidContainer('mermaid-preview-1', null)
  assert.deepEqual(removed, ['dmermaid-preview-1'])
})

