import assert from 'node:assert/strict'
import test from 'node:test'

import {
  __setLoaderForTest,
  ensureKatex,
  isKatexReady,
  onReady,
  render,
  renderToString,
  subscribe,
} from './katexLazy.ts'

type FakeElement = {
  isConnected: boolean
  style: Record<string, string>
  textContent: string
  onclick: ((event: { preventDefault: () => void }) => void) | null
  classes: Set<string>
  attrs: Map<string, string>
  classList: { add: (name: string) => void; remove: (name: string) => void; contains: (name: string) => boolean }
  setAttribute: (name: string, value: string) => void
  getAttribute: (name: string) => string | null
  closest: (selector: string) => unknown
}

function fakeElement(block = false, connected = true): FakeElement {
  const classes = new Set<string>()
  const attrs = new Map<string, string>()
  return {
    isConnected: connected,
    style: {},
    textContent: '',
    onclick: null,
    classes,
    attrs,
    classList: {
      add: (name) => classes.add(name),
      remove: (name) => classes.delete(name),
      contains: (name) => classes.has(name),
    },
    setAttribute: (name, value) => attrs.set(name, value),
    getAttribute: (name) => attrs.get(name) ?? null,
    closest: (selector) => (block && selector.includes('block-math') ? {} : null),
  }
}

const fakeKatex = () => {
  const calls: Array<{ latex: string; options: Record<string, unknown> }> = []
  return {
    calls,
    katex: {
      render(latex: string, element: unknown, options: Record<string, unknown> = {}) {
        calls.push({ latex, options })
        ;(element as FakeElement).textContent = `rendered:${latex}`
      },
      renderToString(latex: string) {
        return `<span class="katex">${latex}</span>`
      },
    },
  }
}

test('未就绪时 renderToString 返回空串（契约）', () => {
  __setLoaderForTest(async () => fakeKatex())
  assert.equal(isKatexReady(), false)
  assert.equal(renderToString('x^2'), '')
})

test('注入 loader 后只加载一次，renderToString 含 class="katex"', async () => {
  let loads = 0
  const fake = fakeKatex()
  __setLoaderForTest(async () => {
    loads += 1
    return fake
  })
  await Promise.all([ensureKatex(), ensureKatex()])
  await onReady()
  assert.equal(loads, 1)
  assert.equal(isKatexReady(), true)
  assert.match(renderToString('x^2'), /class="katex"/)
})

test('未就绪 render 先占位，加载后自动 flush 并去掉 math-pending', async () => {
  const fake = fakeKatex()
  __setLoaderForTest(async () => fake)
  const element = fakeElement(false)
  render('a+b', element as unknown as HTMLElement)
  assert.equal(element.classList.contains('math-pending'), true)
  assert.equal(fake.calls.length, 0)
  await ensureKatex()
  assert.equal(element.classList.contains('math-pending'), false)
  assert.equal(fake.calls.length, 1)
  assert.equal(element.textContent, 'rendered:a+b')
  assert.equal(fake.calls[0].options.displayMode, false)
})

test('块级元素推导 displayMode，并显示块级占位', async () => {
  const fake = fakeKatex()
  __setLoaderForTest(async () => fake)
  const element = fakeElement(true)
  render('\\int x', element as unknown as HTMLElement)
  assert.equal(element.style.minHeight, '2.8em')
  await ensureKatex()
  assert.equal(fake.calls[0].options.displayMode, true)
})

test('断连元素在 flush 时跳过，不抛也不调用 render', async () => {
  const fake = fakeKatex()
  __setLoaderForTest(async () => fake)
  const element = fakeElement(false, false)
  render('gone', element as unknown as HTMLElement)
  await ensureKatex()
  assert.equal(fake.calls.length, 0)
})

test('单条 render 抛错只影响该元素：写回 $latex$ 原文 + math-fallback', async () => {
  __setLoaderForTest(async () => ({
    katex: {
      render() {
        throw new Error('boom')
      },
      renderToString() {
        return ''
      },
    },
  }))
  const element = fakeElement(false)
  render('\\bad{', element as unknown as HTMLElement)
  await ensureKatex()
  assert.equal(element.classList.contains('math-fallback'), true)
  assert.equal(element.textContent, '$\\bad{$')
  assert.equal(element.getAttribute('title'), '公式排版没加载成功，点击重试')
})

test('subscribe 在加载完成后收到通知', async () => {
  __setLoaderForTest(async () => fakeKatex())
  let notified = 0
  const unsubscribe = subscribe(() => {
    notified += 1
  })
  await ensureKatex()
  assert.ok(notified >= 1)
  unsubscribe()
})
