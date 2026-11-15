import { chromium } from 'playwright-core'

const URL = process.env.SIDELIGHT_URL ?? 'http://localhost:5173'
const CDP = process.env.SIDELIGHT_CDP ?? 'http://127.0.0.1:9222'
const OUT = 'shots/round-13'

const results = []
const check = (label, ok, extra = '') => {
  results.push({ label, ok })
  console.log(`${ok ? 'PASS' : 'FAIL'} ${label}${extra ? ` (${extra})` : ''}`)
}

const harness = () => {
  const nodes = new Map()
  const root = { type: 'dir', children: new Set() }
  nodes.set('', root)
  const state = {
    nodes,
    moves: 0,
    writes: [],
    failFinalMove: false,
    throwTypeError: false,
    createOnProbe: null,
  }
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
            nodes.get(current).text = typeof chunk === 'string' ? chunk : new TextDecoder().decode(chunk)
          },
          async close() {
            state.writes.push(current)
          },
          async abort() {},
        }
      },
    }
    Object.defineProperty(handle, '__path', {
      get: () => current,
    })
    Object.defineProperty(handle, 'move', {
      configurable: true,
      value: async (name) => {
        state.moves += 1
        if (state.throwTypeError) throw new TypeError('invalid filename')
        if (state.failFinalMove && !name.startsWith('.rename-')) throw new DOMException('失败', 'InvalidModificationError')
        const node = nodes.get(current)
        if (!node) throw new DOMException('不存在', 'NotFoundError')
        const destination = `${parentPath(current) ? `${parentPath(current)}/` : ''}${name}`
        if (nodes.has(destination)) {
          throw new DOMException('已存在', 'InvalidModificationError')
        }
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
    return {
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
          if (state.createOnProbe && state.createOnProbe === child && !options.create) {
            const text = 'hook'
            state.createOnProbe = null
            setFile(child, text)
          } else if (!options.create) {
            throw new DOMException('不存在', 'NotFoundError')
          } else {
            setFile(child, '')
          }
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
  }
  for (const directory of ['', '.sidelight', '.sidelight/trash']) ensureDir(directory)
  window.showDirectoryPicker = async () => dirHandle('')
  state.setFile = setFile
  state.read = (path) => nodes.get(normalize(path))?.text ?? null
  state.exists = (path) => nodes.has(normalize(path))
  state.install = (files) => {
    for (const [path, text] of Object.entries(files)) setFile(path, text)
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

const openRename = async (page, name) => {
  await row(page, name).click({ button: 'right' })
  await page.getByRole('menuitem', { name: '重命名' }).click()
  await page.locator('.tree-rename-input').waitFor()
  return page.locator('.tree-rename-input')
}

const commit = async (page) => {
  await page.locator('.tree-rename-input').press('Enter')
  await page.waitForTimeout(900)
}

// ---------- 正常改名 + 身份同步 ----------
{
  const { context, page } = await openPage({ 'a.md': 'hello\n' })
  await row(page, 'a.md').click()
  await page.waitForTimeout(500)
  const input = await openRename(page, 'a.md')
  await input.fill('b.md')
  await commit(page)
  check('正常改名：旧路径消失、新路径内容不变', !(await page.evaluate(() => window.__fs.exists('a.md'))) && (await page.evaluate(() => window.__fs.read('b.md'))) === 'hello\n')
  check('move 1 次、无额外写入', (await page.evaluate(() => [window.__fs.moves, window.__fs.writes.length])) .join(',') === '1,0')
  const selected = page.locator('[role="treeitem"][aria-selected="true"]')
  const selectedCount = await selected.count()
  check(
    '树显示 b.md 且选中',
    selectedCount === 1 && (await selected.first().innerText()).includes('b.md'),
    JSON.stringify(await page.evaluate(() => [...document.querySelectorAll('[role="treeitem"]')].map((node) => [node.getAttribute('data-path'), node.getAttribute('aria-selected'), node.textContent?.trim()]))),
  )
  const identity = await page.evaluate(() => ({
    title: document.title,
    bar: document.querySelector('.doc-name')?.textContent?.trim() ?? '',
    state: window.__slState?.name ?? null,
    active: document.querySelector('[role="treeitem"][aria-selected="true"]')?.getAttribute('data-path') ?? '',
  }))
  check('document.title / 顶栏 / __slState 同步新名', identity.title.includes('b.md') && identity.bar.includes('b.md') && identity.state === 'b.md', JSON.stringify(identity))
  await page.locator('.editor').click()
  await page.keyboard.press('Control+s')
  await page.waitForTimeout(800)
  check('Ctrl+S 直接写新路径、picker 0 次', (await page.evaluate(() => window.__fs.writes)).includes('b.md'))
  await page.screenshot({ path: `${OUT}/t1-renamed.png` })
  await context.close()
}

// ---------- 重名拒绝 / 探测后目标被建出 ----------
{
  const { context, page } = await openPage({ 'a.md': 'A', 'b.md': 'keep' })
  const input = await openRename(page, 'a.md')
  await input.fill('b.md')
  await commit(page)
  check('重名拒绝：目标内容 keep、a.md 仍在', (await page.evaluate(() => window.__fs.read('b.md'))) === 'keep' && (await page.evaluate(() => window.__fs.exists('a.md'))))
  check('重名错误就地显示', (await page.locator('.tree-rename-error').innerText()).includes('同名'))
  await page.locator('.tree-rename-input').press('Escape')
  await page.waitForTimeout(300)
  await context.close()

  const race = await openPage({ 'a.md': 'A' })
  await race.page.evaluate(() => {
    window.__fs.createOnProbe = 'b.md'
  })
  const raceInput = await openRename(race.page, 'a.md')
  await raceInput.fill('b.md')
  await commit(race.page)
  check('二次探测：探测后建出的 b.md 不被覆盖', (await race.page.evaluate(() => window.__fs.read('b.md'))) === 'hook' && (await race.page.evaluate(() => window.__fs.exists('a.md'))))
  await race.context.close()
}

// ---------- 非法名逐条拒绝 ----------
{
  const { context, page } = await openPage({ 'a.md': 'A' })
  const cases = [
    ['a<b.md', '含 <'],
    ['con.md', '保留名'],
    ['a.md.', '结尾点'],
    ['.hidden.md', '开头点'],
    ['a.txt', '保留 .md'],
    ['a\\b.md', '反斜杠'],
  ]
  for (const [name, label] of cases) {
    const input = await openRename(page, 'a.md')
    await input.fill(name)
    await commit(page)
    const error = await page.locator('.tree-rename-error').innerText().catch(() => '')
    check(`非法名拒绝：${label}`, error.length > 0 && (await page.evaluate(() => window.__fs.exists('a.md'))) && (await page.evaluate(() => window.__fs.moves)) === 0, `${name} → ${error}`)
    await page.locator('.tree-rename-input').press('Escape')
    await page.waitForTimeout(200)
  }
  await context.close()
}

// ---------- 大小写两段 / 第二段失败 / TypeError ----------
{
  const { context, page } = await openPage({ 'a.md': 'A' })
  const input = await openRename(page, 'a.md')
  await input.fill('A.md')
  await commit(page)
  check('大小写改名成功', (await page.evaluate(() => window.__fs.exists('A.md'))) && (await page.evaluate(() => window.__fs.moves)) === 2)
  await context.close()

  const failed = await openPage({ 'a.md': 'A' })
  await failed.page.evaluate(() => {
    window.__fs.failFinalMove = true
  })
  const second = await openRename(failed.page, 'a.md')
  await second.fill('A.md')
  await commit(failed.page)
  const error = await failed.page.locator('.tree-rename-error').innerText()
  const tempFile = await failed.page.evaluate(() => [...window.__fs.nodes.keys()].find((path) => path.includes('.rename-')) ?? '')
  check('第二段失败：保留临时名并如实提示', error.includes('临时名') && Boolean(tempFile), `${error} ${tempFile}`)
  await failed.context.close()

  const type = await openPage({ 'a.md': 'A' })
  await type.page.evaluate(() => {
    window.__fs.throwTypeError = true
  })
  const typed = await openRename(type.page, 'a.md')
  await typed.fill('b.md')
  await commit(type.page)
  check('move TypeError：原名保留、就地报错', (await type.page.evaluate(() => window.__fs.exists('a.md'))) && (await type.page.locator('.tree-rename-error').innerText()).includes('文件名不合法'))
  await type.context.close()
}

// ---------- 取消 / IME ----------
{
  const { context, page } = await openPage({ 'a.md': 'A' })
  const input = await openRename(page, 'a.md')
  await input.fill('b.md')
  await page.keyboard.press('Escape')
  await page.waitForTimeout(400)
  check('Esc 取消：不提交', (await page.evaluate(() => window.__fs.moves)) === 0 && (await page.evaluate(() => window.__fs.exists('a.md'))))

  const blurInput = await openRename(page, 'a.md')
  await blurInput.fill('c.md')
  await page.locator('.editor').click()
  await page.waitForTimeout(400)
  check('失焦取消：不提交', (await page.evaluate(() => window.__fs.moves)) === 0)
  await input.count()

  const ime = await openRename(page, 'a.md')
  await ime.fill('d.md')
  await ime.dispatchEvent('keydown', { key: 'Enter', isComposing: true })
  await page.waitForTimeout(300)
  check('IME Enter 不提交', (await page.evaluate(() => window.__fs.moves)) === 0)
  await page.keyboard.press('Escape')
  await context.close()
}

// ---------- 无入口 ----------
{
  const { context, page } = await openPage({ 'a.md': 'A', 'dir/b.md': 'B' })
  await row(page, 'dir').click({ button: 'right' })
  await page.waitForTimeout(300)
  check('目录行右键无重命名入口', (await page.getByRole('menuitem', { name: '重命名' }).count()) === 0)
  await context.close()
}

// ---------- 缓存迁移 ----------
{
  const { context, page } = await openPage({ 'a.md': 'A', '.sidelight/drafts/a.md': '旧草稿内容' })
  const input = await openRename(page, 'a.md')
  await input.fill('b.md')
  await commit(page)
  const cache = await page.evaluate(() => ({
    next: window.__fs.read('.sidelight/drafts/b.md'),
    old: window.__fs.exists('.sidelight/drafts/a.md'),
  }))
  check('缓存迁移：新键有内容、旧键已删', cache.next === '旧草稿内容' && cache.old === false, JSON.stringify(cache))
  await context.close()
}

console.log(`\n${results.filter((item) => item.ok).length}/${results.length} PASS`)
await browser.close()
if (results.some((item) => !item.ok)) process.exit(1)
