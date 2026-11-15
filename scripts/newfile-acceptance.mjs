import { chromium } from 'playwright-core'

const URL = process.env.SIDELIGHT_URL ?? 'http://localhost:5173'
const CDP = process.env.SIDELIGHT_CDP ?? 'http://127.0.0.1:9222'
const OUT = 'shots/round-14'

const results = []
const check = (label, ok, extra = '') => {
  results.push({ label, ok })
  console.log(`${ok ? 'PASS' : 'FAIL'} ${label}${extra ? ` (${extra})` : ''}`)
}

const harness = () => {
  const nodes = new Map()
  nodes.set('', { type: 'dir', children: new Set() })
  const state = { nodes, writes: [], moves: 0 }
  window.__fs = state
  const normalize = (path) => path.replace(/^\.\//, '').replace(/\/+/g, '/').replace(/\/$/, '')
  const split = (path) => normalize(path).split('/').filter(Boolean)
  const parentPath = (path) => split(path).slice(0, -1).join('/')
  const baseName = (path) => split(path).slice(-1)[0] ?? ''
  const ensureDir = (path) => {
    let current = ''
    for (const part of split(path)) {
      current = current ? `${current}/${part}` : part
      if (!nodes.has(current)) nodes.set(current, { type: 'dir', children: new Set() })
      nodes.get(parentPath(current))?.children.add(part)
    }
    return nodes.get(normalize(path))
  }
  const setFile = (path, text) => {
    const clean = normalize(path)
    ensureDir(parentPath(clean))
    nodes.set(clean, { type: 'file', text })
    nodes.get(parentPath(clean)).children.add(baseName(clean))
  }
  const remove = (path) => {
    const clean = normalize(path)
    nodes.delete(clean)
    nodes.get(parentPath(clean))?.children.delete(baseName(clean))
  }
  const fileHandle = (path) => {
    let current = normalize(path)
    const handle = {
      kind: 'file',
      name: baseName(current),
      async getFile() {
        const node = nodes.get(current)
        if (!node) throw new DOMException('不存在', 'NotFoundError')
        return new File([node.text], baseName(current), { type: 'text/markdown' })
      },
      async isSameEntry(other) {
        return other?.__path === current
      },
      async createWritable() {
        return {
          async write(chunk) {
            if (!nodes.has(current)) {
              ensureDir(parentPath(current))
              nodes.set(current, { type: 'file', text: '' })
              nodes.get(parentPath(current)).children.add(baseName(current))
            }
            nodes.get(current).text = typeof chunk === 'string' ? chunk : new TextDecoder().decode(chunk)
          },
          async close() {
            state.writes.push(current)
          },
          async abort() {},
        }
      },
    }
    Object.defineProperty(handle, '__path', { get: () => current })
    Object.defineProperty(handle, 'move', {
      value: async (name) => {
        const node = nodes.get(current)
        const destination = `${parentPath(current) ? `${parentPath(current)}/` : ''}${name}`
        remove(current)
        setFile(destination, node.text)
        current = destination
        handle.name = name
      },
    })
    return handle
  }
  const dirHandle = (path) => {
    const clean = normalize(path)
    const handle = {
      kind: 'directory',
      name: clean ? baseName(clean) : '工作区',
      async getDirectoryHandle(name, options = {}) {
        const child = clean ? `${clean}/${name}` : name
        if (!nodes.has(child)) {
          if (!options.create) throw new DOMException('不存在', 'NotFoundError')
          ensureDir(child)
        }
        return dirHandle(child)
      },
      async getFileHandle(name, options = {}) {
        const child = clean ? `${clean}/${name}` : name
        if (!nodes.has(child)) {
          if (!options.create) throw new DOMException('不存在', 'NotFoundError')
          setFile(child, '')
        }
        return fileHandle(child)
      },
      async removeEntry(name) {
        remove(clean ? `${clean}/${name}` : name)
      },
      async *entries() {
        const node = nodes.get(clean)
        for (const name of [...(node?.children ?? [])]) {
          const child = clean ? `${clean}/${name}` : name
          if (!nodes.has(child)) continue
          yield [name, nodes.get(child).type === 'dir' ? dirHandle(child) : fileHandle(child)]
        }
      },
    }
    Object.defineProperty(handle, '__path', { value: clean })
    return handle
  }
  for (const directory of ['', '.sidelight', '.sidelight/trash', '.sidelight/drafts']) ensureDir(directory)
  window.showDirectoryPicker = async () => dirHandle('')
  state.setFile = setFile
  state.handle = (path) => fileHandle(path)
  state.remove = remove
  state.read = (path) => nodes.get(normalize(path))?.text ?? null
  state.exists = (path) => nodes.has(normalize(path))
  state.size = (path) => nodes.get(normalize(path))?.text?.length ?? -1
  state.install = (files) => {
    for (const [path, text] of Object.entries(files)) setFile(path, text)
  }
  state.sha = async (path) => {
    const node = nodes.get(normalize(path))
    if (!node) return null
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(node.text))
    return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
  }
}

const browser = await chromium.connectOverCDP(CDP)

const openPage = async (files) => {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await context.newPage()
  await page.addInitScript(harness)
  await page.route('**/__doc', (route) =>
    route.fulfill({ status: 404, contentType: 'application/json', body: '{"v":1,"ok":false}' }),
  )
  await page.goto(URL, { waitUntil: 'networkidle' })
  await page.evaluate(() => localStorage.clear())
  await page.reload({ waitUntil: 'networkidle' })
  await page.evaluate((payload) => window.__fs.install(payload), files)
  await page.waitForSelector('.editor')
  await page.keyboard.press('Control+Alt+Shift+O')
  await page.waitForTimeout(800)
  return { context, page }
}

const row = (page, name) => page.locator('[role="treeitem"]', { hasText: name }).first()
const sha = (page, path) => page.evaluate((value) => window.__fs.sha(value), path)
const read = (page, path) => page.evaluate((value) => window.__fs.read(value), path)

const newFile = async (page) => {
  await page.locator('.tree-new-main').click()
  await page.waitForTimeout(500)
}

const typeMarker = async (page, text) => {
  await page.locator('.ProseMirror').click()
  await page.keyboard.type(text)
  await page.waitForTimeout(400)
}

// ---------- 1 新建后 Ctrl+S 写新文件 ----------
{
  const { context, page } = await openPage({ 'a.md': 'OLD-A\n' })
  await row(page, 'a.md').click()
  await page.waitForTimeout(500)
  const oldSha = await sha(page, 'a.md')
  await newFile(page)
  await typeMarker(page, 'NEW-DOC-MARKER')
  await page.keyboard.press('Control+s')
  await page.waitForTimeout(900)
  check('新建后 Ctrl+S 写未命名.md 且含标记', (await read(page, '未命名.md'))?.includes('NEW-DOC-MARKER'), JSON.stringify(await read(page, '未命名.md')))
  check('a.md SHA 不变', (await sha(page, 'a.md')) === oldSha)
  const identity = await page.evaluate(() => ({
    name: window.__slState?.name,
    bar: document.querySelector('.doc-name')?.textContent?.trim() ?? '',
    selected: document.querySelector('[role="treeitem"][aria-selected="true"]')?.getAttribute('data-path') ?? '',
  }))
  check('标题/树选中/__slState 都是未命名.md', identity.name === '未命名.md' && identity.bar.includes('未命名.md') && identity.selected.endsWith('未命名.md'), JSON.stringify(identity))
  await page.screenshot({ path: `${OUT}/t1-newfile-save.png` })
  await context.close()
}

// ---------- 2 不保存等 4 秒：旧文件不变、新文件 0 字节 ----------
{
  const { context, page } = await openPage({ 'a.md': 'OLD-A\n' })
  await row(page, 'a.md').click()
  await page.waitForTimeout(500)
  const oldSha = await sha(page, 'a.md')
  await newFile(page)
  await typeMarker(page, 'AUTOSAVE-MUST-NOT')
  await page.waitForTimeout(4000)
  check('停 4 秒：a.md SHA 不变', (await sha(page, 'a.md')) === oldSha)
  check('停 4 秒：新文件仍 0 字节', (await page.evaluate(() => window.__fs.size('未命名.md'))) === 0, String(await page.evaluate(() => window.__fs.size('未命名.md'))))
  check('没有「已保存 a.md」toast', !(await page.evaluate(() => document.querySelector('.toast-text')?.textContent ?? '')).includes('已保存 a.md'))
  await context.close()
}

// ---------- 3 首次保存后自动保存恢复 ----------
{
  const { context, page } = await openPage({ 'a.md': 'OLD-A\n' })
  await row(page, 'a.md').click()
  await page.waitForTimeout(500)
  const oldSha = await sha(page, 'a.md')
  await newFile(page)
  await typeMarker(page, 'FIRST-SAVE')
  await page.keyboard.press('Control+s')
  await page.waitForTimeout(800)
  await typeMarker(page, ' THEN-AUTOSAVE')
  await page.waitForTimeout(2600)
  check('首次保存后自动保存写新文件', (await read(page, '未命名.md'))?.includes('THEN-AUTOSAVE'))
  check('自动保存后 a.md 不变', (await sha(page, 'a.md')) === oldSha)
  await context.close()
}

// ---------- 4 另存为后写 c.md ----------
{
  const { context, page } = await openPage({ 'a.md': 'OLD-A\n' })
  await row(page, 'a.md').click()
  await page.waitForTimeout(500)
  const oldSha = await sha(page, 'a.md')
  await page.evaluate(() => {
    window.showSaveFilePicker = async () => window.__fs.handle('c.md')
  })
  await page.locator('.file-menu-trigger').click()
  await page.getByRole('menuitem', { name: /另存为/ }).click()
  await page.waitForTimeout(900)
  await typeMarker(page, 'SAVE-AS-C')
  await page.keyboard.press('Control+s')
  await page.waitForTimeout(900)
  check('另存为后 Ctrl+S 写 c.md', (await read(page, 'c.md'))?.includes('SAVE-AS-C'), JSON.stringify(await read(page, 'c.md')))
  check('另存为后 a.md 不变', (await sha(page, 'a.md')) === oldSha)
  await context.close()
}

// ---------- 5 重命名回归（复用 round-13 路径） ----------
{
  const { context, page } = await openPage({ 'a.md': 'A\n' })
  await row(page, 'a.md').click()
  await page.waitForTimeout(500)
  await row(page, 'a.md').click({ button: 'right' })
  await page.getByRole('menuitem', { name: '重命名' }).click()
  await page.locator('input[aria-label^="重命名"]').fill('b.md')
  await page.locator('input[aria-label^="重命名"]').press('Enter')
  await page.waitForTimeout(900)
  await typeMarker(page, 'RENAMED')
  await page.keyboard.press('Control+s')
  await page.waitForTimeout(900)
  check('重命名后 Ctrl+S 写 b.md', (await read(page, 'b.md'))?.includes('RENAMED'))
  check('重命名后 a.md 不存在', (await page.evaluate(() => window.__fs.exists('a.md'))) === false)
  await context.close()
}

// ---------- 6 外部删除 → 刷新 → Ctrl+S 不写旧路径 ----------
{
  const { context, page } = await openPage({ 'a.md': 'A\n', 'b.md': 'B\n' })
  await row(page, 'a.md').click()
  await page.waitForTimeout(500)
  await page.evaluate(() => window.__fs.remove('a.md'))
  await page.locator('.tree-icon[aria-label="刷新文件树"]').click()
  await page.waitForTimeout(900)
  const toast = await page.evaluate(() => document.querySelector('.toast-text')?.textContent ?? '')
  check('外部删除刷新提示只能另存为', toast.includes('只能另存为'), toast)
  const writesBefore = await page.evaluate(() => window.__fs.writes.length)
  await typeMarker(page, 'AFTER-DELETE')
  await page.keyboard.press('Control+s')
  await page.waitForTimeout(800)
  check('外部删除后不写旧路径', !(await page.evaluate((before) => window.__fs.writes.slice(before), writesBefore)).includes('a.md') && !(await page.evaluate(() => window.__fs.exists('a.md'))))
  await context.close()
}

// ---------- 7 外部改名 → 刷新 → 不静默写旧名 ----------
{
  const { context, page } = await openPage({ 'a.md': 'A\n' })
  await row(page, 'a.md').click()
  await page.waitForTimeout(500)
  await page.evaluate(() => {
    window.__fs.setFile('b.md', window.__fs.read('a.md'))
    window.__fs.remove('a.md')
  })
  await page.locator('.tree-icon[aria-label="刷新文件树"]').click()
  await page.waitForTimeout(900)
  const toast = await page.evaluate(() => document.querySelector('.toast-text')?.textContent ?? '')
  check('外部改名刷新提示改名/移走', toast.includes('改名') && toast.includes('移走'), toast)
  const writesBefore = await page.evaluate(() => window.__fs.writes.length)
  await typeMarker(page, 'AFTER-RENAME')
  await page.keyboard.press('Control+s')
  await page.waitForTimeout(800)
  check('外部改名后不静默写旧/新名', !(await page.evaluate((before) => window.__fs.writes.slice(before), writesBefore)).includes('a.md') && !(await page.evaluate((before) => window.__fs.writes.slice(before), writesBefore)).includes('b.md'))
  await context.close()
}

// ---------- 8 删除后刷新再 Ctrl+S ----------
{
  const { context, page } = await openPage({ 'a.md': 'A\n', 'b.md': 'B\n' })
  await row(page, 'a.md').click()
  await page.waitForTimeout(500)
  await row(page, 'a.md').click({ button: 'right' })
  await page.getByRole('menuitem', { name: /删除/ }).click()
  await page.locator('[aria-label="删除文件"]').getByRole('button', { name: '移到回收站' }).click()
  await page.waitForTimeout(1000)
  const writesBefore = await page.evaluate(() => window.__fs.writes.length)
  await page.locator('.tree-icon[aria-label="刷新文件树"]').click()
  await page.waitForTimeout(700)
  await typeMarker(page, 'AFTER-DELETE-REFRESH')
  await page.keyboard.press('Control+s')
  await page.waitForTimeout(800)
  check('删除后刷新再保存不写已删路径', !(await page.evaluate((before) => window.__fs.writes.slice(before), writesBefore)).includes('a.md') && !(await page.evaluate(() => window.__fs.exists('a.md'))))
  await context.close()
}

// ---------- T2 首次使用 ----------
{
  const { context, page } = await openPage({ 'a.md': '# A\n' })
  await page.waitForTimeout(600)
  const focus = await page.evaluate(() => ({
    tag: document.activeElement?.tagName,
    pm: document.activeElement?.classList.contains('ProseMirror'),
    demo: [...document.querySelectorAll('.file-tree-empty-title')].map((node) => node.textContent),
  }))
  check('首屏焦点在正文', focus.pm === true, JSON.stringify(focus))
  await page.keyboard.type('首屏直接输入')
  await page.waitForTimeout(300)
  check('不点正文直接输入会产生改动', (await page.evaluate(() => window.__slState?.dirty)) === true)
  check('无工作区空态不再写示例', !focus.demo.join('').includes('示例'), JSON.stringify(focus.demo))

  await page.locator('.tree-new-main').click()
  await page.waitForTimeout(400)
  if (await page.locator('.dialog[aria-label="切换文档"]').count()) {
    await page.locator('.dialog[aria-label="切换文档"] button', { hasText: '不保存' }).click()
    await page.waitForTimeout(500)
  }
  check('新建空文档显示「从这一句开始写」', (await page.locator('.editor-placeholder').innerText()) === '从这一句开始写')
  await page.keyboard.type('开始写')
  await page.waitForTimeout(300)
  check('输入后占位消失', (await page.locator('.editor-placeholder').count()) === 0)

  await page.getByRole('button', { name: '设置', exact: true }).click()
  await page.waitForTimeout(400)
  const inDialog = await page.evaluate(() => Boolean(document.activeElement?.closest('.dialog')))
  check('设置打开后焦点在对话框内', inDialog === true)
  await page.keyboard.press('Escape')
  await page.waitForTimeout(400)
  await page.screenshot({ path: `${OUT}/t2-first-use.png` })
  await context.close()
}

console.log(`\n${results.filter((item) => item.ok).length}/${results.length} PASS`)
await browser.close()
if (results.some((item) => !item.ok)) process.exit(1)
