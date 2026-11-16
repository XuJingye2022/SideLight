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
await page.evaluate(() => {
  window.__fs.install({ 'small.md': '# 10 KB\n', 'big.md': 'A'.repeat(6.1 * 1024 * 1024), 'ok.md': 'B'.repeat(5.2 * 1024 * 1024) })
})
await page.waitForSelector('.editor')
await page.keyboard.press('Control+Alt+Shift+O')
await page.waitForTimeout(800)
const row = (name) => page.locator('[role="treeitem"]', { hasText: name }).first()
await row('big.md').click()
await page.waitForTimeout(1800)
const toast = await page.evaluate(() => document.querySelector('.toast-text')?.textContent ?? '')
check('6.1 MiB 打开 2 秒内报「5.5 MiB」', toast.includes('5.5 MiB') && toast.includes('文件太大'), toast)
check('超限时旧文档不变', (await page.evaluate(() => window.__slState?.name)) !== 'big.md')
await row('ok.md').click()
await page.waitForTimeout(2500)
check('5.2 MiB 在上限内可打开', (await page.evaluate(() => window.__slState?.name)) === 'ok.md')
console.log(String(results.filter((item) => item.ok).length) + '/' + String(results.length) + ' PASS')
await page.close()
await context.close()
await browser.close()
if (results.some((item) => !item.ok)) process.exit(1)
