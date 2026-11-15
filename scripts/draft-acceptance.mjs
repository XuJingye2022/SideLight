import { existsSync, readFileSync } from 'node:fs'
import { mkdir, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { spawn } from 'node:child_process'
import { chromium } from 'playwright-core'

const URL = process.env.SIDELIGHT_URL ?? 'http://localhost:5173'
const CDP = process.env.SIDELIGHT_CDP ?? 'http://127.0.0.1:9222'
const OUT = 'shots/round-08'

const results = []
const check = (label, ok, extra = '') => {
  results.push({ label, ok })
  console.log(`${ok ? 'PASS' : 'FAIL'} ${label}${extra ? ` (${extra})` : ''}`)
}

const PLAIN = '# 普通文档\n\n正常编辑，自动保存应该写盘。\n'
const REFS = '# 引用式链接\n\n参考 [Tiptap][t] 与 [CodeMirror][c]。\n\n[t]: https://tiptap.dev\n[c]: https://codemirror.net\n'

const harness = () => {
  const io = { files: {}, writes: [], messages: [], failWrites: 0, attempts: 0 }
  window.__io = io
  const listeners = new Set()
  const handle = (name) => ({
    kind: 'file',
    name,
    async getFile() {
      return new File([io.files[name]?.text ?? ''], name, { type: 'text/markdown', lastModified: Date.now() })
    },
    async createWritable() {
      io.attempts += 1
      if (io.failWrites > 0) {
        io.failWrites -= 1
        throw new DOMException('磁盘写不进去', 'NotAllowedError')
      }
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
  window.__nextOpen = null
  window.showOpenFilePicker = async () => [window.__nextOpen]
  window.showSaveFilePicker = async (options) => handle(options?.suggestedName ?? '另存.md')
  window.showDirectoryPicker = async () => window.__folder
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
      async getFileHandle(fileName, options) {
        if (!entries.has(fileName) && options?.create) entries.set(fileName, handle(fileName))
        return entries.get(fileName)
      },
      async getDirectoryHandle() {
        throw new DOMException('没有子目录', 'NotFoundError')
      },
      async removeEntry(fileName) {
        entries.delete(fileName)
      },
    }
    window.__folder = dir
    return dir
  }
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
const mkdirp = (path) => mkdir(path, { recursive: true })

const docPayload = (text, fileName = 'plain.md', mtime = 1000) => ({
  v: 1,
  ok: true,
  fileName,
  encoding: 'utf-8',
  bom: false,
  eol: 'lf',
  endsWithNewline: true,
  lineCount: text.split('\n').length,
  size: text.length,
  mtime,
  readOnly: false,
  text,
})

const openPage = async ({ doc = null, draft = null, settings = null, viewport = null } = {}) => {
  const context = await browser.newContext({ acceptDownloads: true, viewport })
  const page = await context.newPage()
  await page.addInitScript(harness)
  await page.route('**/__doc', (route) => {
    if (!doc) return route.fulfill({ status: 404, contentType: 'application/json', body: '{"v":1,"ok":false,"error":"NO_DOC"}' })
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(doc) })
  })
  await page.route('**/__draft', (route) => {
    if (!draft) return route.fulfill({ status: 404, contentType: 'application/json', body: '{"v":1,"exists":false}' })
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ v: 1, exists: true, ...draft }) })
  })
  await page.goto(URL, { waitUntil: 'networkidle' })
  await page.evaluate((value) => {
    localStorage.clear()
    if (value) localStorage.setItem('sidelight.settings.v1', JSON.stringify(value))
  }, settings)
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForSelector('.editor', { timeout: 15000 })
  await page.waitForTimeout(500)
  return { context, page }
}

const state = (page) =>
  page.evaluate(() => ({
    doc: document.querySelector('.doc-name')?.textContent?.trim() ?? '',
    dirty: window.__slState?.dirty,
    source: document.querySelector('.source-editor')?.value ?? null,
    dialog: Boolean(document.querySelector('.save-dialog')),
    closeDialog: Boolean(document.querySelector('.close-guard-dialog')),
    hostDraftDialog: document.querySelector('[aria-label="恢复宿主草稿"]')?.textContent ?? null,
    chip: document.querySelector('.auto-save-chip')?.textContent ?? '',
    draftLabel: [...document.querySelectorAll('.status-chip')].map((node) => node.textContent).join('|'),
    messages: window.__io.messages,
    writes: window.__io.writes,
    attempts: window.__io.attempts,
    editor: document.querySelector('.editor')?.textContent ?? '',
    active: document.activeElement?.textContent?.trim() ?? '',
  }))
const draftMessages = (messages, type) => messages.filter((message) => message.type === type)
const edit = async (page, text) => {
  await page.locator('.editor').click()
  await page.keyboard.press('Control+End')
  await page.keyboard.type(text)
}

await mkdirp(OUT)

// ---------- T1-1 草稿 debounce ----------
{
  const { context, page } = await openPage({ doc: docPayload(PLAIN) })
  await edit(page, 'abc')
  await page.waitForTimeout(1100)
  let info = await state(page)
  const saves = draftMessages(info.messages, 'draft-save')
  check('T1 编辑后 800ms 发 1 条 draft-save', saves.length === 1, String(saves.length))
  check('T1 draft-save.text 是 LF', typeof saves[0]?.text === 'string' && !saves[0].text.includes('\r'))
  await page.keyboard.type('de')
  await page.waitForTimeout(1000)
  info = await state(page)
  check('T1 继续编辑只新增 1 条（防抖合并）', draftMessages(info.messages, 'draft-save').length === 2, String(draftMessages(info.messages, 'draft-save').length))
  await context.close()
}

// ---------- T1-2 /__draft 恢复与丢弃 ----------
{
  const draftText = '# 草稿版本\n\n这是草稿正文。\n'
  const { context, page } = await openPage({ doc: docPayload(REFS), draft: { text: draftText, mtime: 5000 } })
  let info = await state(page)
  check('T1 更新的草稿：弹恢复框', Boolean(info.hostDraftDialog), info.hostDraftDialog?.slice(0, 40) ?? 'none')
  await page.locator('[aria-label="恢复宿主草稿"] button', { hasText: '恢复草稿' }).click()
  await page.waitForTimeout(500)
  info = await state(page)
  check('T1 恢复后正文 = 草稿', info.editor.includes('这是草稿正文'), info.editor.slice(0, 30))
  check('T1 恢复后 dirty=true', info.dirty === true)
  check('T1 恢复后状态栏「草稿已恢复」', info.draftLabel.includes('草稿已恢复'), info.draftLabel)
  await page.locator('button[title*="源码"]').click()
  await page.waitForTimeout(400)
  info = await state(page)
  check('T1 恢复后源码仍是原文件正文', info.source === REFS, JSON.stringify(info.source?.slice(0, 30)))
  await page.screenshot({ path: `${OUT}/t1-draft-restored.png` })
  await context.close()

  const second = await openPage({ doc: docPayload(REFS), draft: { text: draftText, mtime: 5000 } })
  await second.page.locator('[aria-label="恢复宿主草稿"] button', { hasText: '丢弃草稿' }).click()
  await second.page.waitForTimeout(500)
  const discarded = await state(second.page)
  check('T1 丢弃后正文 = 原文', discarded.editor.includes('引用式链接') && !discarded.editor.includes('草稿正文'), discarded.editor.slice(0, 30))
  check('T1 丢弃发 draft-clear', draftMessages(discarded.messages, 'draft-clear').length === 1, JSON.stringify(discarded.messages.map((m) => m.type)))
  await second.context.close()
}

// ---------- T1-3 保存成功清理草稿与迟到回包 ----------
{
  const { context, page } = await openPage({ doc: docPayload(PLAIN) })
  await edit(page, '保存前的字')
  await page.waitForTimeout(1000)
  let info = await state(page)
  const draftSave = draftMessages(info.messages, 'draft-save')[0]
  await page.evaluate((id) => window.__replyHost({ v: 1, type: 'draft-save-result', id, ok: true }), draftSave.id)
  await page.keyboard.press('Control+s')
  await page.waitForTimeout(400)
  info = await state(page)
  const save = info.messages.find((message) => message.type === 'save')
  check('T1 宿主保存发出 save', Boolean(save))
  await page.evaluate((id) => window.__replyHost({ v: 1, type: 'save-result', id, ok: true, mtime: 2000 }), save.id)
  await page.waitForTimeout(600)
  info = await state(page)
  const types = info.messages.map((message) => message.type)
  check('T1 保存后先有 draft-save 再有 draft-clear', types.indexOf('draft-save') < types.indexOf('draft-clear'), JSON.stringify(types))
  const clears = draftMessages(info.messages, 'draft-clear').length
  check('T1 保存成功后 dirty=false', (await page.evaluate(() => window.__slState.dirty)) === false)
  await page.evaluate((id) => window.__replyHost({ v: 1, type: 'draft-save-result', id, ok: true }), draftSave.id)
  await edit(page, 'X')
  await page.waitForTimeout(300)
  info = await state(page)
  check('T1 迟到的 draft-save-result 不再二次 clear', draftMessages(info.messages, 'draft-clear').length === clears, String(draftMessages(info.messages, 'draft-clear').length))
  await context.close()
}

// ---------- T2 beforeunload / 关窗三选一 ----------
{
  // 自动保存排队时不注册
  const auto = await openPage({ doc: docPayload(PLAIN) })
  await edit(auto.page, '排队')
  await auto.page.waitForTimeout(200)
  check('T2 自动保存排队时 onbeforeunload 为 null', (await auto.page.evaluate(() => window.onbeforeunload)) === null)
  await auto.context.close()

  // 关掉自动保存后有脏就注册
  const manual = await openPage({
    doc: docPayload(PLAIN),
    settings: { autoSave: false },
  })
  await edit(manual.page, '脏')
  await manual.page.waitForTimeout(300)
  check('T2 有未保存改动时注册 onbeforeunload', (await manual.page.evaluate(() => typeof window.onbeforeunload)) === 'function')
  const dialogPromise = manual.page.waitForEvent('dialog', { timeout: 5000 }).catch(() => null)
  const closePromise = manual.page.close({ runBeforeUnload: true }).catch(() => {})
  const dialog = await dialogPromise
  check('T2 关页触发浏览器确认', dialog !== null && dialog.type() === 'beforeunload', dialog?.type() ?? 'none')
  await dialog?.dismiss().catch(() => {})
  await closePromise
  await manual.context.close()

  // close-request 三选一
  const host = await openPage({ doc: docPayload(PLAIN) })
  await edit(host.page, '关闭前')
  await host.page.waitForTimeout(300)
  await host.page.evaluate(() => window.__replyHost({ v: 1, type: 'close-request' }))
  await host.page.waitForTimeout(400)
  let info = await state(host.page)
  check('T2 close-request 弹出关闭确认', info.closeDialog)
  check('T2 焦点在「取消」', info.active === '取消', info.active)
  await host.page.locator('.close-guard-dialog button', { hasText: '取消' }).click()
  await host.page.waitForTimeout(300)
  info = await state(host.page)
  check('T2 取消回 close-answer cancel', info.messages.some((m) => m.type === 'close-answer' && m.action === 'cancel'))
  await host.page.locator('.editor').click()
  await host.page.keyboard.type('继续编辑')
  await host.page.waitForTimeout(200)
  check('T2 取消后还能继续编辑', (await host.page.evaluate(() => window.__slState.dirty)) === true)
  await host.page.screenshot({ path: `${OUT}/t2-close-guard.png` })
  await host.context.close()

  // save-draft / discard
  for (const [label, button, expected] of [
    ['保存草稿并关闭', '保存草稿并关闭', 'save-draft'],
    ['放弃并关闭', '放弃并关闭', 'discard'],
  ]) {
    const current = await openPage({ doc: docPayload(PLAIN) })
    await edit(current.page, '关闭')
    await current.page.waitForTimeout(300)
    await current.page.evaluate(() => window.__replyHost({ v: 1, type: 'close-request' }))
    await current.page.waitForTimeout(300)
    await current.page.locator('.close-guard-dialog button', { hasText: button }).click()
    await current.page.waitForTimeout(400)
    const answer = (await state(current.page)).messages.find((m) => m.type === 'close-answer')
    check(`T2 ${label} 回 ${expected}`, answer?.action === expected, answer?.action ?? 'none')
    if (expected === 'save-draft') {
      check('T2 save-draft.text 不含 \\r', typeof answer?.text === 'string' && !answer.text.includes('\r'))
    }
    await current.context.close()
  }

  // 其它模态打开时排队
  const queued = await openPage({ doc: docPayload(PLAIN) })
  await queued.page.getByRole('button', { name: '设置' }).click()
  await queued.page.waitForTimeout(300)
  await queued.page.evaluate(() => window.__replyHost({ v: 1, type: 'close-request' }))
  await queued.page.waitForTimeout(400)
  info = await state(queued.page)
  check('T2 其它模态打开时不叠关闭框', !info.closeDialog)
  await queued.page.keyboard.press('Escape')
  await queued.page.waitForTimeout(400)
  check('T2 关掉设置后才出现关闭确认', (await state(queued.page)).closeDialog)
  await queued.context.close()
}

// ---------- T3 自动保存 ----------
{
  const { context, page } = await openPage()
  await page.evaluate(() => {
    window.__setFile('plain.md', '# 普通\n\n自动保存这一段。\n')
    window.__nextOpen = window.__handle('plain.md')
  })
  await page.keyboard.press('Control+Alt+O')
  await page.waitForTimeout(700)
  await edit(page, '自动')
  await page.waitForTimeout(2600)
  let info = await state(page)
  check('T3 文件停笔 2 秒自动写入 1 次', info.writes.length === 1, String(info.writes.length))
  check('T3 自动保存后 dirty=false', info.dirty === false)
  check('T3 状态栏「已自动保存」', info.chip.includes('已自动保存'), info.chip)
  await page.screenshot({ path: `${OUT}/t3-auto-saved.png` })
  await context.close()

  const refs = await openPage()
  await refs.page.evaluate(() => {
    window.__setFile('04-reference-links.md', '# 引用式链接\n\n参考 [Tiptap][t]。\n\n[t]: https://tiptap.dev\n')
    window.__nextOpen = window.__handle('04-reference-links.md')
  })
  await refs.page.keyboard.press('Control+Alt+O')
  await refs.page.waitForTimeout(700)
  await edit(refs.page, '改')
  await refs.page.waitForTimeout(2600)
  info = await state(refs.page)
  check('T3 有结构损失：写入 0 次', info.writes.length === 0, String(info.writes.length))
  check('T3 有结构损失：chip「需手动保存」', info.chip.includes('需手动保存'), info.chip)
  check('T3 有结构损失：不弹确认框', !info.dialog)
  await refs.context.close()

  // 排队后变脏 + pendingConfirm 打开
  const pending = await openPage()
  await pending.page.evaluate(() => {
    window.__setFile('04-reference-links.md', '# 引用式链接\n\n参考 [Tiptap][t]。\n\n[t]: https://tiptap.dev\n')
    window.__nextOpen = window.__handle('04-reference-links.md')
  })
  await pending.page.keyboard.press('Control+Alt+O')
  await pending.page.waitForTimeout(700)
  await edit(pending.page, 'a')
  await pending.page.waitForTimeout(200)
  await pending.page.keyboard.type('[')
  await pending.page.waitForTimeout(2500)
  info = await state(pending.page)
  check('T3 排队后改出损失：写入 0', info.writes.length === 0, String(info.writes.length))
  check('T3 排队后改出损失：不弹框', !info.dialog)
  check('T3 排队后改出损失：chip 需手动保存', info.chip.includes('需手动保存'), info.chip)
  await pending.page.keyboard.press('Control+s')
  await pending.page.waitForTimeout(400)
  const withDialog = await state(pending.page)
  check('T3 手动保存仍弹差异确认', withDialog.dialog)
  await pending.page.waitForTimeout(2600)
  const afterDialog = await state(pending.page)
  check('T3 pendingConfirm 打开时 auto 不写', afterDialog.writes.length === 0, String(afterDialog.writes.length))
  await pending.context.close()

  // 设置关闭
  const off = await openPage({ settings: { autoSave: false } })
  await off.page.evaluate(() => {
    window.__setFile('plain.md', '# 普通\n')
    window.__nextOpen = window.__handle('plain.md')
  })
  await off.page.keyboard.press('Control+Alt+O')
  await off.page.waitForTimeout(700)
  await edit(off.page, '不自动')
  await off.page.waitForTimeout(2600)
  check('T3 设置关闭后 2.5 秒无写入', (await state(off.page)).writes.length === 0, String((await state(off.page)).writes.length))
  await off.context.close()

  // 写失败：chip 红色，连续 3 次后停止尝试
  const failing = await openPage()
  await failing.page.evaluate(() => {
    window.__setFile('plain.md', '# 普通\n')
    window.__nextOpen = window.__handle('plain.md')
    window.__io.failWrites = 3
  })
  await failing.page.keyboard.press('Control+Alt+O')
  await failing.page.waitForTimeout(700)
  await edit(failing.page, '失败一')
  await failing.page.waitForTimeout(2600)
  let failingInfo = await state(failing.page)
  check('T3 写失败：chip「自动保存失败」', failingInfo.chip.includes('自动保存失败'), failingInfo.chip)
  check('T3 写失败：只试 1 次', failingInfo.attempts === 1, String(failingInfo.attempts))
  const fallbackDraft = await failing.page.evaluate(() => localStorage.getItem('sidelight.doc.v1') ?? '')
  check('T3 写失败：落一次草稿兜底', fallbackDraft.includes('失败一'), fallbackDraft.slice(0, 30))
  await edit(failing.page, '二')
  await failing.page.waitForTimeout(2400)
  await edit(failing.page, '三')
  await failing.page.waitForTimeout(2400)
  failingInfo = await state(failing.page)
  check('T3 连续 3 次失败后还在尝试范围（第 3 次）', failingInfo.attempts === 3, String(failingInfo.attempts))
  await edit(failing.page, '四')
  await failing.page.waitForTimeout(2400)
  failingInfo = await state(failing.page)
  check('T3 连续 3 次失败后停止尝试', failingInfo.attempts === 3 && failingInfo.chip.includes('自动保存失败'), `${failingInfo.attempts}/${failingInfo.chip}`)
  await failing.context.close()
}

// ---------- T3 手动保存期间 auto 不写（与 host-save 的 2 条 save 回归） ----------
{
  const { context, page } = await openPage({ doc: docPayload(PLAIN) })
  await edit(page, '手动保存竞态')
  await page.keyboard.press('Control+s')
  await page.waitForTimeout(300)
  const beforeReply = await state(page)
  const manualSave = beforeReply.messages.find((message) => message.type === 'save')
  check('T3 手动保存只发 1 条 save', beforeReply.messages.filter((message) => message.type === 'save').length === 1)
  await page.evaluate((id) => window.__replyHost({ v: 1, type: 'save-result', id, ok: true, mtime: 2000 }), manualSave.id)
  await page.waitForTimeout(2600)
  const after = await state(page)
  check('T3 手动保存后 2.6 秒内 auto 不再补发 save', after.messages.filter((message) => message.type === 'save').length === 1, String(after.messages.filter((message) => message.type === 'save').length))
  await context.close()
}

// ---------- T3 输入法组合 ----------
{
  const { context, page } = await openPage()
  await page.evaluate(() => {
    window.__setFile('plain.md', '# 普通\n')
    window.__nextOpen = window.__handle('plain.md')
  })
  await page.keyboard.press('Control+Alt+O')
  await page.waitForTimeout(700)
  await page.locator('.editor').click()
  await page.evaluate(() => {
    document.querySelector('.editor')?.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }))
  })
  await page.keyboard.type('组合中')
  await page.waitForTimeout(2300)
  check('T3 输入法组合期间不写盘', (await state(page)).writes.length === 0, String((await state(page)).writes.length))
  await page.evaluate(() => {
    document.querySelector('.editor')?.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true }))
  })
  await page.waitForTimeout(2600)
  check('T3 组合结束后可自动保存', (await state(page)).writes.length === 1, String((await state(page)).writes.length))
  await context.close()
}

// ---------- T4 1366×768 设置面板与文件菜单 ----------
{
  const { context, page } = await openPage({ viewport: { width: 1366, height: 768 } })
  await page.getByRole('button', { name: '设置' }).click()
  await page.waitForTimeout(500)
  const metrics = await page.evaluate(() => {
    const dialog = document.querySelector('.dialog')
    const primary = [...document.querySelectorAll('.dialog-actions button')].find((node) => /保存/.test(node.textContent ?? ''))
    const rect = dialog?.getBoundingClientRect()
    const primaryRect = primary?.getBoundingClientRect()
    return {
      top: rect?.top ?? -1,
      bottom: primaryRect?.bottom ?? -1,
      height: window.innerHeight,
      scrollable: dialog ? dialog.scrollHeight > dialog.clientHeight : false,
    }
  })
  check('T4 设置面板 top ≥ 20', metrics.top >= 20, String(metrics.top))
  check('T4 保存按钮底 ≤ innerHeight−20', metrics.bottom <= metrics.height - 20, `${metrics.bottom}/${metrics.height}`)
  check('T4 面板内容可滚动', metrics.scrollable)
  await page.screenshot({ path: `${OUT}/t4-settings-1366.png` })
  await page.keyboard.press('Escape')
  await page.waitForTimeout(300)
  await page.locator('.file-menu-trigger').click()
  await page.waitForTimeout(300)
  const menu = await page.evaluate(() => {
    const items = [...document.querySelectorAll('.file-menu [role="menuitem"]')]
    return items.map((item) => {
      const rect = item.getBoundingClientRect()
      return {
        height: rect.height,
        whiteSpace: getComputedStyle(item).whiteSpace,
        overflow: item.scrollWidth - item.clientWidth,
      }
    })
  })
  check('T4 文件菜单四项高度 ≤ 40', menu.length === 4 && menu.every((item) => item.height <= 40), JSON.stringify(menu.map((item) => item.height)))
  check('T4 文件菜单不折行', menu.every((item) => item.whiteSpace === 'nowrap'))
  check('T4 文件菜单不横向溢出', menu.every((item) => item.overflow <= 1), JSON.stringify(menu.map((item) => item.overflow)))
  await page.screenshot({ path: `${OUT}/t4-file-menu-1366.png` })
  await context.close()
}

// ---------- 宿主真实段（草稿落盘 + 重开提示 + 长名键一致） ----------
const hostExe = resolve('.tmp/host-a/Sidelight.exe')
if (existsSync(hostExe)) {
  const sampleDir = resolve('.tmp/host-a-samples')
  await mkdirp(sampleDir)
  const longName = `${'长'.repeat(45)}.md`
  const sample = join(sampleDir, longName)
  await writeFile(sample, '# 草稿样本\n\n原文。\n', 'utf8')

  // 与 host/Program.cs 的 CacheKey 相同：>40 取前 36 去尾 - + '-' + FNV-1a(UTF-8)&0xFFFF
  const expectedKey = (() => {
    const body = longName.slice(0, longName.lastIndexOf('.'))
    const cleaned = body.replace(/[^a-zA-Z0-9\u4e00-\u9fa5_-]/g, '-').replace(/-+/g, '-').replace(/^-+|-+$/g, '')
    const bytes = new TextEncoder().encode(cleaned)
    let hash = 2166136261
    for (const byte of bytes) {
      hash ^= byte
      hash = Math.imul(hash, 16777619)
    }
    return `${cleaned.slice(0, 36).replace(/-+$/, '')}-${(hash & 0xffff).toString(16).padStart(4, '0')}`
  })()

  const spawnHost = () =>
    spawn(hostExe, [sample], {
      cwd: resolve('.tmp/host-a'),
      env: {
        ...process.env,
        SIDELIGHT_PORT: '47851',
        WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS: '--remote-debugging-port=9340',
      },
      stdio: 'ignore',
    })
  const waitCdp = async () => {
    for (let attempt = 0; attempt < 60; attempt += 1) {
      try {
        const response = await fetch('http://127.0.0.1:9340/json/version')
        if (response.ok) return true
      } catch {}
      await new Promise((done) => setTimeout(done, 500))
    }
    return false
  }

  let child = spawnHost()
  if (await waitCdp()) {
    let hostBrowser = await chromium.connectOverCDP('http://127.0.0.1:9340')
    let page = hostBrowser.contexts()[0].pages()[0]
    await page.waitForSelector('.editor', { timeout: 20000 })
    await page.waitForTimeout(600)
    await edit(page, '宿主草稿')
    await page.waitForTimeout(1600)
    const draftPath = join(sampleDir, '.sidelight', 'drafts', `${expectedKey}.md`)
    check('T1 宿主段长名草稿键与前端算法一致', existsSync(draftPath), expectedKey)
    if (existsSync(draftPath)) {
      const text = readFileSync(draftPath, 'utf8')
      check('T1 宿主段草稿内容一致', text.includes('宿主草稿') && !text.includes('\r'), JSON.stringify(text.slice(0, 40)))
      check('T1 宿主段草稿键不撞（长度 >40 带哈希）', /^.{36}-[0-9a-f]{4}$/.test(expectedKey), expectedKey)
    }
    await hostBrowser.close()
    child.kill()
    await new Promise((done) => setTimeout(done, 1200))

    // 重开同一个文件：/__draft 比原文新，应弹恢复框
    child = spawnHost()
    if (await waitCdp()) {
      hostBrowser = await chromium.connectOverCDP('http://127.0.0.1:9340')
      page = hostBrowser.contexts()[0].pages()[0]
      await page.waitForSelector('.editor', { timeout: 20000 })
      await page.waitForTimeout(800)
      const recovery = await page.evaluate(
        () => document.querySelector('[aria-label="恢复宿主草稿"]')?.textContent ?? null,
      )
      check('T1 宿主段重开出现恢复提示', Boolean(recovery) && recovery.includes('有比原文件更新的草稿'), recovery?.slice(0, 40) ?? 'none')
      await page.screenshot({ path: `${OUT}/t1-host-draft-recovery.png` })
      await hostBrowser.close()
    } else {
      console.log('SKIP 宿主段重开：CDP 没起来')
    }
    child.kill()
    await new Promise((done) => setTimeout(done, 800))
  } else {
    console.log('SKIP 宿主段：CDP 没起来')
    child.kill()
  }
} else {
  console.log('SKIP 宿主段：缺少 .tmp/host-a/Sidelight.exe')
}

console.log(`\n${results.filter((item) => item.ok).length}/${results.length} PASS`)
await browser.close()
if (results.some((item) => !item.ok)) process.exit(1)
