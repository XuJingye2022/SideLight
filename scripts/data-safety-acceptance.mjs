import { chromium } from 'playwright-core'

const URL = process.env.SIDELIGHT_URL ?? 'http://localhost:5173'
const CDP = process.env.SIDELIGHT_CDP ?? 'http://127.0.0.1:9222'
const OUT = 'shots/round-07'

const results = []
const check = (label, ok, extra = '') => {
  results.push({ label, ok })
  console.log(`${ok ? 'PASS' : 'FAIL'} ${label}${extra ? ` (${extra})` : ''}`)
}

const REF_TEXT = `# 引用式链接

正文里的 [Tiptap][tiptap] 与 [Markdown][md] 都靠定义。

[tiptap]: https://tiptap.dev
[md]: https://commonmark.org
`
const PLAIN_TEXT = `# 普通文档

这一段没有结构损失，正常编辑不应该弹框。
`
const TABLE_CANONICAL = `# 表格

| 名字 | 数量 |
| --- | --- |
| 甲 | 1 |
`
const TABLE_LOSSY = `# 表格

| 名字 | 数量 |
| :----- | -----: |
| 甲 | 1 |
`

const harness = () => {
  const io = {
    files: {},
    writes: [],
    pickerCalls: { open: 0, save: 0, dir: 0 },
    abortSave: false,
    messages: [],
  }
  window.__io = io
  const handle = (name) => ({
    kind: 'file',
    name,
    async getFile() {
      return new File([io.files[name]?.text ?? ''], name, { type: 'text/markdown' })
    },
    async createWritable() {
      return {
        async write(data) {
          const text = typeof data === 'string' ? data : await data.text()
          io.writes.push({ name, text })
          io.files[name] = { text }
        },
        async close() {},
      }
    },
  })
  window.__handle = handle
  window.__setFile = (name, text) => {
    io.files[name] = { text }
  }
  window.showOpenFilePicker = async () => {
    io.pickerCalls.open += 1
    return [window.__nextOpen]
  }
  window.showSaveFilePicker = async (options) => {
    io.pickerCalls.save += 1
    if (io.abortSave) throw new DOMException('用户取消', 'AbortError')
    return handle(options?.suggestedName ?? '另存为.md')
  }
  window.showDirectoryPicker = async () => {
    io.pickerCalls.dir += 1
    return window.__folder
  }
  window.__makeFolder = (name, files) => {
    const entries = new Map()
    for (const [fileName, text] of Object.entries(files)) {
      io.files[fileName] = { text }
      entries.set(fileName, handle(fileName))
    }
    const dir = {
      kind: 'directory',
      name,
      async *entries() {
        yield* entries.entries()
      },
      async getFileHandle(fileName) {
        return entries.get(fileName)
      },
      async getDirectoryHandle() {
        throw new DOMException('没有子目录', 'NotFoundError')
      },
    }
    window.__folder = dir
    return dir
  }
  // 宿主模拟：/__doc 拦截 + 记录 postMessage
  const listeners = new Set()
  const webview = {
    postMessage: (message) => io.messages.push(JSON.parse(JSON.stringify(message))),
    addEventListener: (type, fn) => {
      if (type === 'message') listeners.add(fn)
    },
    removeEventListener: (type, fn) => listeners.delete(fn),
  }
  window.__replyHost = (data) => {
    for (const fn of [...listeners]) fn({ data })
  }
  if (!window.chrome) window.chrome = {}
  window.chrome.webview = webview
}

const browser = await chromium.connectOverCDP(CDP)

const openPage = async (routeHandler) => {
  const context = await browser.newContext({ acceptDownloads: true })
  const page = await context.newPage()
  await page.addInitScript(harness)
  await page.route('**/__doc', routeHandler)
  await page.goto(URL, { waitUntil: 'networkidle' })
  await page.evaluate(() => localStorage.clear())
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForSelector('.editor', { timeout: 15000 })
  await page.waitForTimeout(500)
  return { context, page }
}

const browserPage = () => openPage((route) => route.fulfill({ status: 404, contentType: 'application/json', body: '{"v":1,"ok":false,"error":"NO_DOC"}' }))

const openFile = async (page, name, text) => {
  await page.evaluate(
    ({ name, text }) => {
      window.__setFile(name, text)
      window.__nextOpen = window.__handle(name)
    },
    { name, text },
  )
  await page.keyboard.press('Control+Alt+O')
  await page.waitForTimeout(700)
}

const edit = async (page, text) => {
  await page.locator('.editor').click()
  await page.keyboard.press('Control+End')
  await page.keyboard.type(text)
  await page.waitForTimeout(300)
}

const info = (page) =>
  page.evaluate(() => ({
    dialog: Boolean(document.querySelector('.save-dialog')),
    dialogText: document.querySelector('.save-dialog')?.textContent ?? '',
    switchDialog: Boolean(document.querySelector('.dialog[aria-label="切换文档"]')),
    source: document.querySelector('.source-editor')?.value ?? null,
    dirty: window.__slState?.dirty,
    writes: window.__io.writes,
    messages: window.__io.messages,
    picker: window.__io.pickerCalls,
    doc: document.querySelector('.doc-name')?.textContent?.trim() ?? '',
    toast: document.querySelector('.toast-text')?.textContent ?? '',
    riskBanner: document.querySelector('.risk-banner')?.textContent ?? '',
  }))

const confirm = async (page) => {
  await page.locator('.save-dialog button', { hasText: '仍然保存' }).click()
  await page.waitForTimeout(700)
}
const cancel = async (page) => {
  await page.locator('.save-dialog button', { hasText: '取消' }).click()
  await page.waitForTimeout(400)
}

// ---------- 1) 引用式链接：取消不写、再按仍弹 ----------
{
  const { context, page } = await browserPage()
  await openFile(page, '04-reference-links.md', REF_TEXT)
  check('打开引用式链接样本：横幅出现', (await info(page)).riskBanner.includes('引用式链接'), (await info(page)).riskBanner.slice(0, 40))
  await edit(page, '改')
  await page.keyboard.press('Control+s')
  await page.waitForTimeout(500)
  let state = await info(page)
  check('改字后 Ctrl+S：弹出确认框', state.dialog)
  check('确认框列出两行定义', (state.dialogText.match(/\[tiptap\]:|\[md\]:/g) ?? []).length >= 2, state.dialogText.replace(/\s+/g, ' ').slice(0, 120))
  await cancel(page)
  state = await info(page)
  check('取消后写入次数 = 0', state.writes.length === 0, String(state.writes.length))
  check('取消后 dirty 仍 true', state.dirty === true)
  await page.keyboard.press('Control+s')
  await page.waitForTimeout(500)
  check('再按 Ctrl+S 仍出现确认框', (await info(page)).dialog)
  await page.screenshot({ path: `${OUT}/t1-confirm-refs.png` })
  await context.close()
}

// ---------- 2) 确认后才写；文本是 LF ----------
{
  const { context, page } = await browserPage()
  await openFile(page, '04-reference-links.md', REF_TEXT)
  await edit(page, '改')
  await page.keyboard.press('Control+s')
  await page.waitForTimeout(400)
  await confirm(page)
  const state = await info(page)
  check('确认后写 1 次', state.writes.length === 1, String(state.writes.length))
  check('写出的文本是 LF（无 \\r）', state.writes[0]?.text.includes('\r') === false)
  check('确认后 dirty=false', state.dirty === false)
  await context.close()
}

// ---------- 3) 宿主模式：确认前消息 0，确认后 1 ----------
{
  const doc = JSON.stringify({
    v: 1,
    ok: true,
    fileName: '04-reference-links.md',
    encoding: 'utf-8',
    bom: false,
    eol: 'lf',
    endsWithNewline: true,
    lineCount: REF_TEXT.split('\n').length,
    size: REF_TEXT.length,
    mtime: 1,
    readOnly: false,
    text: REF_TEXT,
  })
  const { context, page } = await openPage((route) => route.fulfill({ status: 200, contentType: 'application/json', body: doc }))
  await edit(page, '改')
  await page.keyboard.press('Control+s')
  await page.waitForTimeout(500)
  let state = await info(page)
  check('宿主：弹出确认框', state.dialog)
  check('宿主：确认前 postMessage 数 = 0', state.messages.length === 0, String(state.messages.length))
  await confirm(page)
  state = await info(page)
  check('宿主：确认后 1 条 save', state.messages.length === 1 && state.messages[0].type === 'save', JSON.stringify(state.messages.map((m) => m.type)))
  check('宿主：save.text 不含 \\r', typeof state.messages[0]?.text === 'string' && !state.messages[0].text.includes('\r'))
  await page.evaluate(() => {
    const message = window.__io.messages[0]
    window.__replyHost({ v: 1, type: 'save-result', id: message.id, ok: true, mtime: 2 })
  })
  await page.waitForTimeout(500)
  check('宿主：成功后 dirty=false', (await info(page)).dirty === false)
  await context.close()
}

// ---------- 4) 另存为：取消不调 picker；确认后才写 ----------
{
  const { context, page } = await browserPage()
  await openFile(page, '04-reference-links.md', REF_TEXT)
  await edit(page, '改')
  await page.keyboard.press('Control+Alt+S')
  await page.waitForTimeout(500)
  check('另存为：先弹差异确认', (await info(page)).dialog)
  await cancel(page)
  let state = await info(page)
  check('另存为取消：save picker 未调用', state.picker.save === 0, String(state.picker.save))
  check('另存为取消：写入次数 0', state.writes.length === 0, String(state.writes.length))
  await page.keyboard.press('Control+Alt+S')
  await page.waitForTimeout(400)
  await confirm(page)
  state = await info(page)
  check('另存为确认：调用 1 次 picker 并写入', state.picker.save === 1 && state.writes.length === 1, `${state.picker.save}/${state.writes.length}`)
  await context.close()
}

// ---------- 5) 新建 / 普通文档不弹；表格损失与反例 ----------
{
  const { context, page } = await browserPage()
  await page.keyboard.press('Control+Alt+N')
  await page.waitForTimeout(400)
  await edit(page, '新建的一段')
  await page.keyboard.press('Control+s')
  await page.waitForTimeout(800)
  let state = await info(page)
  check('新建文档保存不弹确认框', !state.dialog, state.dialogText.slice(0, 40))
  check('新建文档直接走保存', state.writes.length === 1, String(state.writes.length))
  await context.close()

  const plain = await browserPage()
  await openFile(plain.page, 'plain.md', PLAIN_TEXT)
  await edit(plain.page, '改')
  await plain.page.keyboard.press('Control+s')
  await plain.page.waitForTimeout(600)
  state = await info(plain.page)
  check('普通文档保存不弹', !state.dialog, state.dialogText.slice(0, 60))
  check('普通文档直接写盘', state.writes.length === 1, String(state.writes.length))
  check('末尾换行保留：写出的文本以 \\n 结尾', state.writes[0]?.text.endsWith('\n') === true, JSON.stringify(state.writes[0]?.text.slice(-4)))
  await plain.context.close()

  const table = await browserPage()
  await openFile(table.page, '02-table.md', TABLE_LOSSY)
  await edit(table.page, '表格外改一段')
  await table.page.keyboard.press('Control+s')
  await table.page.waitForTimeout(500)
  state = await info(table.page)
  check('表格分隔行损失：弹确认框', state.dialog)
  check('表格确认框含「表格分隔行」', state.dialogText.includes('表格分隔行'), state.dialogText.replace(/\s+/g, ' ').slice(0, 80))
  await cancel(table.page)
  await table.page.screenshot({ path: `${OUT}/t1-confirm-table.png` })
  await table.context.close()

  const canonical = await browserPage()
  await openFile(canonical.page, 'table-canonical.md', TABLE_CANONICAL)
  await canonical.page.locator('.editor td').first().click()
  await canonical.page.keyboard.press('Control+A')
  await canonical.page.keyboard.type('乙')
  await canonical.page.keyboard.press('Control+s')
  await canonical.page.waitForTimeout(600)
  state = await info(canonical.page)
  check('只改单元格值：不弹', !state.dialog, state.dialogText.slice(0, 60))
  check('只改单元格值：直接写盘', state.writes.length === 1, String(state.writes.length))
  await canonical.context.close()
}

// ---------- 6) 保存并切换：先确认，取消不切、不写 ----------
{
  const { context, page } = await openPage((route) => route.fulfill({ status: 404, contentType: 'application/json', body: '{"v":1,"ok":false,"error":"NO_DOC"}' }))
  await page.evaluate(() => window.__makeFolder('work', { 'a.md': '# 甲\n\n引用式链接 [Tiptap][t].\n\n[t]: https://tiptap.dev\n', 'b.md': '# 乙\n' }))
  await page.keyboard.press('Control+Alt+Shift+O')
  await page.waitForTimeout(900)
  const tree = page.locator('.file-tree, .file-list, .workspace-tree')
  check('打开文件夹后有文件树', (await tree.count()) > 0)
  await page.getByText('a.md', { exact: true }).first().click()
  await page.waitForTimeout(600)
  await edit(page, '改')
  await page.getByText('b.md', { exact: true }).first().click()
  await page.waitForTimeout(400)
  check('脏文档点另一文件：弹切换确认', (await info(page)).switchDialog)
  await page.locator('.dialog[aria-label="切换文档"] button', { hasText: '保存并切换' }).click()
  await page.waitForTimeout(500)
  let state = await info(page)
  check('保存并切换：先弹差异确认', state.dialog)
  await cancel(page)
  state = await info(page)
  check('差异确认取消：不切换', state.doc === 'a.md', state.doc)
  check('差异确认取消：不写盘', state.writes.length === 0, String(state.writes.length))
  await context.close()
}

// ---------- 7) 源码模式显示原文 / 保存后显示新内容 ----------
{
  const { context, page } = await browserPage()
  await openFile(page, '04-reference-links.md', REF_TEXT)
  await page.locator('.risk-banner button', { hasText: '在源码模式打开原文' }).click()
  await page.waitForTimeout(400)
  let state = await info(page)
  check('源码：未编辑时逐字节等于原文（含定义）', state.source === REF_TEXT, JSON.stringify(state.source?.slice(0, 40)))
  await page.locator('.source-editor').fill(REF_TEXT.replace('正文里', '正文里改过'))
  await page.locator('.risk-banner button, .toolbar button', { hasText: '编辑' }).first().click().catch(() => {})
  await page.keyboard.press('Escape')
  await page.waitForTimeout(400)
  await page.keyboard.press('Control+s')
  await page.waitForTimeout(500)
  if ((await info(page)).dialog) await confirm(page)
  await page.waitForTimeout(700)
  await page.locator('button[title*="源码"]').click()
  await page.waitForTimeout(400)
  state = await info(page)
  check('保存后切源码：等于刚写入的内容', state.writes.length > 0 && state.source === state.writes[0].text, JSON.stringify(state.source?.slice(0, 40)))
  await page.screenshot({ path: `${OUT}/t2-source-after-save.png` })
  await context.close()
}

// ---------- 8) 脚注：多行续行与混合尾块（C1） ----------
{
  const FOOTNOTE_MULTILINE = `# 脚注

正文[^a] 与[^b]。

[^a]: 第一行
    续行内容
[^b]: 第二行
`
  const FOOTNOTE_MIXED = `# 混合

正文[^a]。

[^a]: 脚注首行
    续行
[ref]: https://example.com
`

  const multiline = await browserPage()
  await openFile(multiline.page, 'footnote-multiline.md', FOOTNOTE_MULTILINE)
  let state = await info(multiline.page)
  check('多行脚注：载入后无风险横幅', state.riskBanner === '', state.riskBanner.slice(0, 60))
  await edit(multiline.page, '改')
  await multiline.page.keyboard.press('Control+s')
  await multiline.page.waitForTimeout(600)
  state = await info(multiline.page)
  check('多行脚注：保存不弹确认框', !state.dialog, state.dialogText.slice(0, 60))
  const expectedMultiline = FOOTNOTE_MULTILINE.replace('正文[^a] 与[^b]。', '正文[^a] 与[^b]。改')
  check('多行脚注：写回逐字节相同', state.writes.length === 1 && state.writes[0].text === expectedMultiline, JSON.stringify(state.writes[0]?.text?.slice(-60)))
  check('多行脚注：保留 4 空格续行', state.writes[0]?.text.includes('\n    续行内容\n') === true)

  await edit(multiline.page, 'x')
  await multiline.page.keyboard.press('Control+z')
  await multiline.page.waitForTimeout(300)
  await multiline.page.keyboard.press('Control+s')
  await multiline.page.waitForTimeout(600)
  state = await info(multiline.page)
  check('多行脚注：两次保存逐字节相同', state.writes.length === 2 && state.writes[1].text === state.writes[0].text, String(state.writes.length))
  await multiline.context.close()

  const mixed = await browserPage()
  await openFile(mixed.page, 'footnote-mixed.md', FOOTNOTE_MIXED)
  state = await info(mixed.page)
  check('混合尾块：载入后无风险横幅', state.riskBanner === '', state.riskBanner.slice(0, 60))
  await edit(mixed.page, '改')
  await mixed.page.keyboard.press('Control+s')
  await mixed.page.waitForTimeout(600)
  state = await info(mixed.page)
  check('混合尾块：保存不弹确认框', !state.dialog, state.dialogText.slice(0, 60))
  const expectedMixed = FOOTNOTE_MIXED.replace('正文[^a]。', '正文[^a]。改')
  check('混合尾块：写回逐字节相同（脚注 + [ref]: 原序）', state.writes.length === 1 && state.writes[0].text === expectedMixed, JSON.stringify(state.writes[0]?.text?.slice(-80)))
  await mixed.context.close()
}

console.log(`\n${results.filter((item) => item.ok).length}/${results.length} PASS`)
await browser.close()
if (results.some((item) => !item.ok)) process.exit(1)
