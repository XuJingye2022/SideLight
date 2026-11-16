import { chromium } from 'playwright-core'

const URL = process.env.SIDELIGHT_URL ?? 'http://localhost:5173'
const CDP = process.env.SIDELIGHT_CDP ?? 'http://127.0.0.1:9222'
const results = []
const check = (label, ok, extra = '') => {
  results.push({ label, ok })
  console.log(`${ok ? 'PASS' : 'FAIL'} ${label}${extra ? ` (${extra})` : ''}`)
}

const harness = () => {
  const nodes = new Map([['', { type: 'dir', children: new Set() }]])
  const state = { nodes, writes: [], slowWriteMs: 0 }
  window.__fs = state
  const norm = (p) => p.replace(/^\.\//, '').replace(/\/+$/, '')
  const parent = (p) => norm(p).split('/').filter(Boolean).slice(0, -1).join('/')
  const base = (p) => norm(p).split('/').filter(Boolean).slice(-1)[0] ?? ''
  const ensureDir = (p) => {
    let cur = ''
    for (const part of norm(p).split('/').filter(Boolean)) {
      cur = cur ? `${cur}/${part}` : part
      if (!nodes.has(cur)) nodes.set(cur, { type: 'dir', children: new Set() })
      nodes.get(parent(cur))?.children.add(part)
    }
  }
  const setFile = (p, text) => {
    ensureDir(parent(p))
    nodes.set(norm(p), { type: 'file', text })
    nodes.get(parent(p))?.children.add(base(p))
  }
  const handle = (p) => {
    let cur = norm(p)
    return {
      kind: 'file',
      name: base(cur),
      async getFile() {
        if (!nodes.has(cur)) throw new DOMException('不存在', 'NotFoundError')
        return new File([nodes.get(cur).text], base(cur), { type: 'text/markdown' })
      },
      async isSameEntry(other) {
        return other?.__path === cur
      },
      async createWritable() {
        const before = nodes.get(cur)?.text ?? ''
        return {
          async write(chunk) {
            if (!nodes.has(cur)) {
              ensureDir(parent(cur))
              nodes.set(cur, { type: 'file', text: '' })
              nodes.get(parent(cur)).children.add(base(cur))
            }
            nodes.get(cur).text = typeof chunk === 'string' ? chunk : new TextDecoder().decode(chunk)
          },
          async close() {
            if (state.slowWriteMs) await new Promise((resolve) => setTimeout(resolve, state.slowWriteMs))
            state.writes.push(cur)
          },
          async abort() {
            state.aborts = (state.aborts ?? 0) + 1
            if (nodes.has(cur)) nodes.get(cur).text = before
          },
        }
      },
    }
  }
  const dir = (p) => {
    const clean = norm(p)
    return {
      kind: 'directory',
      name: clean ? base(clean) : '工作区',
      async getDirectoryHandle(name, options = {}) {
        const child = clean ? `${clean}/${name}` : name
        if (!nodes.has(child)) {
          if (!options.create) throw new DOMException('不存在', 'NotFoundError')
          ensureDir(child)
        }
        return dir(child)
      },
      async getFileHandle(name, options = {}) {
        const child = clean ? `${clean}/${name}` : name
        if (!nodes.has(child)) {
          if (!options.create) throw new DOMException('不存在', 'NotFoundError')
          setFile(child, '')
        }
        return handle(child)
      },
      async removeEntry(name) {
        nodes.delete(clean ? `${clean}/${name}` : name)
      },
      async *entries() {
        const node = nodes.get(clean)
        for (const name of [...(node?.children ?? [])]) {
          const child = clean ? `${clean}/${name}` : name
          if (!nodes.has(child)) continue
          yield [name, nodes.get(child).type === 'dir' ? dir(child) : handle(child)]
        }
      },
    }
  }
  for (const d of ['', '.sidelight', '.sidelight/trash', '.sidelight/drafts']) ensureDir(d)
  window.showDirectoryPicker = async () => dir('')
  state.install = (files) => {
    for (const [p, text] of Object.entries(files)) setFile(p, text)
  }
  state.read = (p) => nodes.get(norm(p))?.text ?? null
}

const browser = await chromium.connectOverCDP(CDP)
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
const page = await context.newPage()
await page.addInitScript(harness)
await page.route('**/__doc', (route) => route.fulfill({ status: 404, contentType: 'application/json', body: '{"v":1,"ok":false}' }))
await page.goto(URL, { waitUntil: 'networkidle' })
await page.evaluate(() => localStorage.clear())
await page.reload({ waitUntil: 'networkidle' })
await page.evaluate(() => window.__fs.install({ 'a.md': 'OLD-A\n', 'b.md': 'OLD-B\n' }))
await page.waitForSelector('.editor')
await page.keyboard.press('Control+Alt+Shift+O')
await page.waitForTimeout(800)

const row = (name) => page.locator('[role="treeitem"]', { hasText: name }).first()
await row('a.md').click()
await page.waitForTimeout(500)
await page.evaluate(() => {
  window.__fs.slowWriteMs = 2500
})
await page.locator('.ProseMirror').click()
await page.keyboard.type('NEW-A')
await page.keyboard.press('Control+s')
await page.waitForTimeout(300)
await row('b.md').click()
await page.locator('.dialog[aria-label="切换文档"]').waitFor({ timeout: 4000 }).catch(() => undefined)
if (await page.locator('.dialog[aria-label="切换文档"]').count()) {
  await page.locator('.dialog[aria-label="切换文档"] button', { hasText: '不保存' }).click()
}
await page.waitForTimeout(2800)
check('慢写回包到达后标题仍是 b.md', (await page.evaluate(() => window.__slState?.name)) === 'b.md', await page.evaluate(() => window.__slState?.name))
check('慢写回包不改 b.md 正文', (await page.evaluate(() => document.querySelector('.ProseMirror')?.innerText ?? '')).includes('OLD-B'))
await page.keyboard.press('Control+s')
await page.waitForTimeout(900)
check('随后 Ctrl+S 写 b.md 而不是 a.md', (await page.evaluate(() => window.__fs.read('b.md'))).includes('OLD-B'))
check('a.md 仍是旧内容', (await page.evaluate(() => window.__fs.read('a.md'))) === 'OLD-A\n', JSON.stringify(await page.evaluate(() => ({ text: window.__fs.read('a.md'), aborts: window.__fs.aborts, writes: window.__fs.writes }))))

console.log(`\n${results.filter((item) => item.ok).length}/${results.length} PASS`)
await page.close()
await context.close()
await browser.close()
if (results.some((item) => !item.ok)) process.exit(1)
