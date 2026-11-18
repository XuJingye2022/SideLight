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
  mermaidConfig,
  mermaidHash,
  removeMermaidContainer,
  renderDiagram,
  resolveMermaidTheme,
} from './mermaidLazy.ts'
import { contrastRatio, themeById } from './themes.ts'

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

/* ---------- 第 76 轮 A2（B-122）：暖纸主题下 Mermaid 用暖色配色 ---------- */

test('mermaid 主题：data-theme=sepia 恒为 sepia，系统深色也不改', () => {
  assert.equal(resolveMermaidTheme('sepia', false), 'sepia')
  assert.equal(resolveMermaidTheme('sepia', true), 'sepia')
  // 对照：其它三档口径不变
  assert.equal(resolveMermaidTheme('system', true), 'dark')
})

test('mermaid 配置：default/dark 只带 theme，不带 themeVariables', () => {
  assert.deepEqual(mermaidConfig('default'), { theme: 'default' })
  assert.deepEqual(mermaidConfig('dark'), { theme: 'dark' })
  assert.equal('themeVariables' in mermaidConfig('dark'), false)
  assert.equal('themeVariables' in mermaidConfig('default'), false)
})

test('mermaid 配置：sepia 走 base，颜色与内置暖纸主题逐项相同', () => {
  const sepia = themeById('sepia')
  assert.ok(sepia)
  const config = mermaidConfig('sepia')
  assert.equal(config.theme, 'base')
  const vars = config.themeVariables as Record<string, string>
  const pairs: Array<[string, string]> = [
    ['background', '--paper'],
    ['primaryColor', '--paper-raised'],
    ['mainBkg', '--paper-raised'],
    ['edgeLabelBackground', '--paper-raised'],
    ['primaryBorderColor', '--line-strong'],
    ['nodeBorder', '--line-strong'],
    ['clusterBorder', '--line-strong'],
    ['primaryTextColor', '--ink'],
    ['textColor', '--ink'],
    ['lineColor', '--ink-soft'],
    ['clusterBkg', '--panel'],
  ]
  for (const [mermaidKey, cssVar] of pairs) {
    assert.equal(vars[mermaidKey], sepia.vars[cssVar as keyof typeof sepia.vars], `${mermaidKey} 与 ${cssVar} 不一致`)
  }
  assert.equal(Object.keys(vars).length, pairs.length)
})

test('mermaid 配置：暖纸图表文字对节点底色对比度 ≥4.5', () => {
  const vars = mermaidConfig('sepia').themeVariables as Record<string, string>
  assert.ok(contrastRatio(vars.textColor, vars.primaryColor) >= 4.5, 'textColor 对 primaryColor 不足 4.5:1')
  assert.ok(contrastRatio(vars.primaryTextColor, vars.mainBkg) >= 4.5, 'primaryTextColor 对 mainBkg 不足 4.5:1')
  assert.ok(contrastRatio(vars.primaryBorderColor, vars.primaryColor) >= 1, '描边与填充同色就看不见了')
})

test('mermaid：sepia 渲染拿到 base + 暖色变量，同主题不重复 initialize、切回 default 重来', async () => {
  const fake = fakeMermaid()
  __setLoaderForTest(async () => fake.module)
  const sepiaVars = mermaidConfig('sepia').themeVariables as Record<string, string>
  await renderDiagram('graph TD; A-->B', 'sepia')
  assert.equal(fake.inits.length, 1)
  assert.equal(fake.inits[0].theme, 'base')
  assert.deepEqual(fake.inits[0].themeVariables, sepiaVars)
  // 同主题第二张图：不重复 initialize
  await renderDiagram('graph LR; C-->D', 'sepia')
  assert.equal(fake.inits.length, 1)
  // 切回 default：重新 initialize，且不再带 themeVariables
  await renderDiagram('graph TD; E-->F', 'default')
  assert.equal(fake.inits.length, 2)
  assert.equal(fake.inits[1].theme, 'default')
  assert.equal('themeVariables' in fake.inits[1], false)
  // 生产调用点不传主题：Node 里没有 document，仍按 default 初始化
  const plain = fakeMermaid()
  __setLoaderForTest(async () => plain.module)
  await renderDiagram('graph TD; G-->H')
  assert.equal(plain.inits[0].theme, 'default')
})

