import { spawn, execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { mkdir, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { chromium } from 'playwright-core'

const URL = process.argv[2] ?? 'http://localhost:5173'
const only = process.argv[3] ?? 'all'
const CDP = process.env.SIDELIGHT_CDP ?? 'http://127.0.0.1:9222'
const HOST_DIR = resolve('.tmp/host-a')
const HOST_CDP = 9337
const HOST_PORT = Number(process.env.SIDELIGHT_HOST_PORT ?? 47841)
const OUT = 'shots/round-06'
const SAMPLES = resolve('.tmp/host-a-samples')

const results = []
const check = (label, ok, extra = '') => {
  results.push({ label, ok })
  console.log(`${ok ? 'PASS' : 'FAIL'} ${label}${extra ? ` (${extra})` : ''}`)
}

await mkdir(OUT, { recursive: true })
await mkdir(SAMPLES, { recursive: true })

const sha = (path) => createHash('sha256').update(readFileSync(path)).digest('hex').toUpperCase()
const docPayload = (overrides = {}) => ({
  v: 1,
  fileName: 'host-doc.md',
  encoding: 'utf-8',
  bom: false,
  eol: 'lf',
  endsWithNewline: true,
  lineCount: 2,
  size: 10,
  mtime: 1000,
  readOnly: false,
  text: '宿主第一行\n宿主第二行\n',
  ok: true,
  ...overrides,
})

const harness = () => {
  const listeners = new Set()
  const state = { messages: [], pickerCalls: 0 }
  Object.defineProperty(window, '__host', { value: state, configurable: true })
  const webview = {
    postMessage: (message) => {
      state.messages.push(JSON.parse(JSON.stringify(message)))
      window.dispatchEvent(new CustomEvent('__sl-posted', { detail: message }))
    },
    addEventListener: (type, handler) => {
      if (type === 'message') listeners.add(handler)
    },
    removeEventListener: (type, handler) => {
      if (type === 'message') listeners.delete(handler)
    },
  }
  Object.defineProperty(window, '__reply', {
    configurable: true,
    value: (data) => {
      for (const handler of [...listeners]) handler({ data })
    },
  })
  if (!window.chrome) window.chrome = {}
  window.chrome.webview = webview
  Object.defineProperty(window, 'showSaveFilePicker', {
    configurable: true,
    writable: true,
    value: async () => {
      state.pickerCalls += 1
      const root = await navigator.storage.getDirectory()
      return root.getFileHandle('另存-宿主.md', { create: true })
    },
  })
}

const browser = await chromium.connectOverCDP(CDP)

const openPage = async (routeHandler, draft = null) => {
  const context = await browser.newContext({ acceptDownloads: true })
  const page = await context.newPage()
  await page.addInitScript(harness)
  await page.route('**/__doc', routeHandler)
  await page.goto(URL, { waitUntil: 'networkidle' })
  if (draft) await page.evaluate((value) => localStorage.setItem('sidelight.doc.v1', value), draft)
  await page.evaluate(() => {
    if (!localStorage.getItem('sidelight.doc.v1')) localStorage.clear()
  })
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForSelector('.editor', { timeout: 15000 })
  await page.waitForTimeout(600)
  return { context, page }
}

const stateOf = (page) =>
  page.evaluate(() => ({
    title: document.title,
    docName: document.querySelector('.doc-name')?.textContent?.trim() ?? '',
    status: document.querySelector('.status-bar')?.textContent?.replace(/\s+/g, ' ').trim() ?? '',
    toast: document.querySelector('.toast-text')?.textContent ?? null,
    hostBanner: document.querySelector('.host-error-banner')?.textContent ?? null,
    saveBanner: document.querySelector('.save-error-banner')?.textContent ?? null,
    readonlyBanner: document.querySelector('.readonly-banner')?.textContent ?? null,
    editor: document.querySelector('.editor')?.textContent ?? '',
    saving: document.querySelector('.status-chip') ? null : null,
    saveButton: [...document.querySelectorAll('button')].find((node) => /保存/.test(node.textContent ?? ''))?.textContent ?? null,
    messages: window.__host?.messages ?? [],
    pickerCalls: window.__host?.pickerCalls ?? 0,
  }))
const dirty = (page) => page.evaluate(() => window.__slState?.dirty)
const typeAtEnd = async (page, text) => {
  await page.locator('.editor').click()
  await page.keyboard.press('Control+End')
  await page.keyboard.type(text)
  await page.waitForTimeout(400)
}

// ---------- 1) 宿主文档：标题/状态栏/不改不写/改后写回 ----------
if (only !== 'host') {
  {
  const { context, page } = await openPage((route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(docPayload()) }),
  )
  const first = await stateOf(page)
  check('宿主文档：标题带文件名', first.title === 'host-doc.md — Sidelight', first.title)
  check('宿主文档：状态栏显示「保存到」', (first.status ?? '').includes('保存到 host-doc.md'), first.status)
  check('宿主文档：无只读/错误横幅', !first.readonlyBanner && !first.hostBanner && !first.saveBanner)
  check('宿主文档：正文来自 /__doc', (first.editor ?? '').includes('宿主第一行'), (first.editor ?? '').slice(0, 20))
  await page.locator('.editor').click()
  await page.keyboard.press('Control+s')
  await page.waitForTimeout(500)
  const noop = await stateOf(page)
  check('不改 Ctrl+S：提示「没有改动，未写入」', (noop.toast ?? '').includes('没有改动，未写入'), noop.toast ?? 'none')
  check('不改 Ctrl+S：没有发 save 消息', noop.messages.length === 0, String(noop.messages.length))

  await typeAtEnd(page, 'X')
  check('改了字之后 dirty=true', (await dirty(page)) === true)
  await page.keyboard.press('Control+s')
  await page.waitForTimeout(400)
  const posted = await stateOf(page)
  const message = posted.messages[0]
  const keys = message ? Object.keys(message).sort() : []
  check('保存发 save 消息', Boolean(message) && message.type === 'save' && message.v === 1, JSON.stringify(keys))
  check('save 消息不含路径字段', keys.every((key) => ['id', 'text', 'type', 'v'].includes(key)), JSON.stringify(keys))
  check('save 消息 text 是 LF 且含新字', typeof message?.text === 'string' && message.text.includes('X') && !message.text.includes('\r'))
  check('保存中按钮显示「保存中…」', (posted.saveButton ?? '').includes('保存中'), posted.saveButton ?? 'none')
  await page.evaluate((id) => window.__reply({ v: 1, type: 'save-result', id, ok: true, bytes: 30, mtime: 2000 }), message.id)
  await page.waitForTimeout(500)
  const saved = await stateOf(page)
  check('成功回包：提示「已保存到」', (saved.toast ?? '').includes('已保存到 host-doc.md'), saved.toast ?? 'none')
  check('成功回包：dirty=false', (await dirty(page)) === false)
  check('成功回包：按钮恢复「保存」', (saved.saveButton ?? '') === '保存', saved.saveButton ?? 'none')
  await page.screenshot({ path: `${OUT}/t1-host-doc.png` })
  await context.close()
}

// ---------- 2) 排队与旧 id ----------
{
  const { context, page } = await openPage((route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(docPayload()) }),
  )
  await typeAtEnd(page, '排队一次')
  await page.keyboard.press('Control+s')
  await page.waitForTimeout(150)
  await page.keyboard.press('Control+s')
  await page.waitForTimeout(300)
  let info = await stateOf(page)
  check('保存中再按一次：只发一条消息', info.messages.length === 1, String(info.messages.length))
  const firstId = info.messages[0].id
  await page.evaluate((id) => window.__reply({ v: 1, type: 'save-result', id: id + 99, ok: true }), firstId)
  await page.waitForTimeout(300)
  info = await stateOf(page)
  check('旧 id 回包被忽略（dirty 仍 true）', (await dirty(page)) === true)
  await page.evaluate((id) => window.__reply({ v: 1, type: 'save-result', id, ok: true, mtime: 3000 }), firstId)
  await page.waitForTimeout(500)
  info = await stateOf(page)
  check('正确回包后补发排队的那次', info.messages.length === 2, String(info.messages.length))
  await page.evaluate((id) => window.__reply({ v: 1, type: 'save-result', id, ok: true, mtime: 3001 }), info.messages[1].id)
  await page.waitForTimeout(400)
  check('排队保存完成后 dirty=false', (await dirty(page)) === false)
  await context.close()
}

// ---------- 3) 10 秒超时 + 失败码 ----------
{
  const { context, page } = await openPage((route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(docPayload()) }),
  )
  await typeAtEnd(page, '超时')
  await page.keyboard.press('Control+s')
  await page.waitForTimeout(10600)
  const timeout = await stateOf(page)
  check('10 秒超时：出现可见错误', (timeout.saveBanner ?? '').includes('超时'), timeout.saveBanner ?? 'none')
  check('超时后 dirty 仍 true、可重试', (await dirty(page)) === true)
  await page.screenshot({ path: `${OUT}/t1-save-error.png` })
  await context.close()

  // 失败码单独一页：超时后旧 id 会被丢掉，不能在同一条消息上验错误码
  const failedPage = await openPage((route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(docPayload()) }),
  )
  await typeAtEnd(failedPage.page, '失败')
  await failedPage.page.keyboard.press('Control+s')
  await failedPage.page.waitForTimeout(300)
  const failId = (await stateOf(failedPage.page)).messages[0].id
  await failedPage.page.evaluate((id) => {
    window.__reply({ v: 1, type: 'save-result', id, ok: false, error: 'PATH_CHANGED' })
  }, failId)
  await failedPage.page.waitForTimeout(400)
  const failed = await stateOf(failedPage.page)
  check('失败码给中文原因', (failed.saveBanner ?? '').includes('外部修改'), failed.saveBanner ?? 'none')
  await failedPage.context.close()
}

// ---------- 4) fetch 失败分支：不回退旧草稿 ----------
{
  const draft = JSON.stringify({ text: '旧草稿-不要出现', name: 'old.md', savedAt: Date.now() })
  const { context, page } = await openPage(
    (route) => route.fulfill({ status: 200, contentType: 'text/plain', body: 'not json' }),
    draft,
  )
  const info = await stateOf(page)
  check('200 非 JSON：显示可见错误横幅', (info.hostBanner ?? '').includes('不是 JSON'), info.hostBanner ?? 'none')
  check('200 非 JSON：不回退旧草稿', !(info.editor ?? '').includes('旧草稿-不要出现'), (info.editor ?? '').slice(0, 20))
  const { context: context2, page: page2 } = await openPage((route) =>
    route.fulfill({ status: 500, contentType: 'application/json', body: '{"v":1,"ok":false,"error":"IO"}' }),
  )
  const info2 = await stateOf(page2)
  check('500：显示可见错误横幅', (info2.hostBanner ?? '').includes('500'), info2.hostBanner ?? 'none')
  check('500：hostDoc 为空（不发 save）', info2.messages.length === 0)
  await page.screenshot({ path: `${OUT}/t1-host-error.png` })
  await context.close()
  await context2.close()
}

// ---------- 4b) 无 argv：/__doc 404 → 当普通浏览器，恢复草稿不报错 ----------
{
  const draft = JSON.stringify({ text: '无宿主时的草稿', name: 'draft.md', savedAt: Date.now() })
  const { context, page } = await openPage(
    (route) => route.fulfill({ status: 404, contentType: 'application/json', body: '{"v":1,"ok":false,"error":"NO_DOC"}' }),
    draft,
  )
  const info = await stateOf(page)
  check('404：不显示宿主错误横幅', !info.hostBanner, info.hostBanner ?? 'none')
  check('404：恢复 localStorage 草稿', (info.editor ?? '').includes('无宿主时的草稿'), (info.editor ?? '').slice(0, 12))
  check('404：标题是 Sidelight', info.title === 'Sidelight', info.title)
  check('404：没有「保存到」状态', !(info.status ?? '').includes('保存到'), info.status)
  await page.keyboard.press('Control+s')
  await page.waitForTimeout(500)
  const saveInfo = await stateOf(page)
  check('404：Ctrl+S 走 picker', saveInfo.pickerCalls === 1, String(saveInfo.pickerCalls))
  await context.close()
}

// ---------- 4c) 超过解析上限：可见错误，不静默停示例 ----------
{
  const huge = 'a'.repeat(7 * 1024 * 1024)
  const { context, page } = await openPage((route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(docPayload({ text: huge, size: huge.length, fileName: 'huge.md' })),
    }),
  )
  await page.waitForTimeout(800)
  const info = await stateOf(page)
  check('超过 6 MB：显示「文件过大」横幅', (info.hostBanner ?? '').includes('文件过大'), info.hostBanner ?? 'none')
  check('超过 6 MB：横幅写明上限 6 MB', (info.hostBanner ?? '').includes('上限 6 MB'), info.hostBanner ?? 'none')
  check('超过 6 MB：标题回到 Sidelight', info.title === 'Sidelight', info.title)
  await page.screenshot({ path: `${OUT}/t1-too-large.png` })
  await context.close()
}

// ---------- 5) 只读文档 + forget ----------
{
  const { context, page } = await openPage((route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(docPayload({ readOnly: true })) }),
  )
  const readOnly = await stateOf(page)
  check('只读文档：显示「不能写回」横幅', (readOnly.readonlyBanner ?? '').includes('不能写回'), readOnly.readonlyBanner ?? 'none')
  await page.keyboard.press('Control+s')
  await page.waitForTimeout(500)
  const readOnlySave = await stateOf(page)
  check('只读 Ctrl+S 走另存为 picker', readOnlySave.pickerCalls === 1, String(readOnlySave.pickerCalls))
  check('只读 Ctrl+S 不发 save 消息', !readOnlySave.messages.some((message) => message.type === 'save'))
  await context.close()

  const { context: context2, page: page2 } = await openPage((route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(docPayload()) }),
  )
  await page2.locator('.editor').click()
  await page2.keyboard.press('Control+Alt+S')
  await page2.waitForTimeout(900)
  const afterSaveAs = await stateOf(page2)
  check('另存为后发 forget', afterSaveAs.messages.some((message) => message.type === 'forget'), JSON.stringify(afterSaveAs.messages.map((m) => m.type)))
  check('另存为后状态栏不再「保存到」原文件', !(afterSaveAs.status ?? '').includes('保存到 host-doc.md'), afterSaveAs.status)
  await context2.close()
}

// ---------- 6) 冷启动草稿确认 ----------
{
  const draft = JSON.stringify({ text: '草稿-OLD', name: 'draft.md', savedAt: Date.now() })
  const { context, page } = await openPage(
    (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(docPayload()) }),
    draft,
  )
  await page.waitForTimeout(400)
  check('冷启动有草稿：弹出确认框', (await page.locator('.dialog[aria-label="未保存的草稿"]').count()) === 1)
  await page.locator('.dialog[aria-label="未保存的草稿"] button', { hasText: '保留草稿' }).click()
  await page.waitForTimeout(400)
  const kept = await stateOf(page)
  check('保留草稿：正文仍是草稿', (kept.editor ?? '').includes('草稿-OLD'), (kept.editor ?? '').slice(0, 10))
  check('保留草稿：不再显示「保存到」', !(kept.status ?? '').includes('保存到'), kept.status ?? 'none')
  await page.keyboard.press('Control+s')
  await page.waitForTimeout(500)
  const keptSave = await stateOf(page)
  check('保留草稿后 Ctrl+S 走 picker', keptSave.pickerCalls === 1, String(keptSave.pickerCalls))
  check('保留草稿后不发 save 消息', !keptSave.messages.some((message) => message.type === 'save'))
  await context.close()

  const draft2 = JSON.stringify({ text: '草稿-OLD', name: 'draft.md', savedAt: Date.now() })
  const second = await openPage(
    (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(docPayload()) }),
    draft2,
  )
  await second.page.locator('.dialog[aria-label="未保存的草稿"] button', { hasText: '继续打开' }).click()
  await second.page.waitForTimeout(500)
  const opened = await stateOf(second.page)
  check('继续打开：正文是宿主文件', (opened.editor ?? '').includes('宿主第一行'), (opened.editor ?? '').slice(0, 10))
  check('继续打开：dirty=false', (await dirty(second.page)) === false)
  await second.context.close()
}

// ---------- 7) 保存中切文档：旧回包不清新文档 ----------
{
  const { context, page } = await openPage((route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(docPayload()) }),
  )
  await typeAtEnd(page, '切换前的改动')
  await page.keyboard.press('Control+s')
  await page.waitForTimeout(300)
  // 保存中按 Ctrl+Alt+N：先弹未保存确认；选放弃 → 新建会等写回结束
  await page.keyboard.press('Control+Alt+N')
  await page.waitForTimeout(300)
  const switchOpen = await page.locator('.dialog[aria-label="切换文档"]').count()
  check('保存中新建：弹未保存确认', switchOpen === 1)
  await page.locator('.dialog[aria-label="切换文档"] button', { hasText: '放弃改动' }).click()
  await page.waitForTimeout(300)
  // 让保存回包到达（新文档还没载入，因为守卫在等它）
  const pendingInfo = await stateOf(page)
  await page.evaluate((id) => window.__reply({ v: 1, type: 'save-result', id, ok: true, mtime: 5000 }), pendingInfo.messages[0].id)
  await page.waitForTimeout(1600)
  const afterSwitch = await stateOf(page)
  check('保存中切文档：新文档正文为空', (afterSwitch.editor ?? '') === '', (afterSwitch.editor ?? '').slice(0, 10))
  check('保存中切文档：新文档 dirty=false', (await dirty(page)) === false)
  check('保存中切文档：不显示旧文档的「已保存到」', !(afterSwitch.toast ?? '').includes('已保存到'), afterSwitch.toast ?? 'none')
  check('保存中切文档：标题回到 Sidelight', afterSwitch.title === 'Sidelight', `${afterSwitch.title} / ${afterSwitch.docName} / ${afterSwitch.status}`)
  await context.close()
}
}

// ---------- 宿主段 ----------
let hostRan = false
const hostExe = join(HOST_DIR, 'Sidelight.exe')
if (only === 'browser') {
  console.log('SKIP 宿主段（只跑浏览器段）')
} else if (existsSync(hostExe)) {
  const sample = join(SAMPLES, 'crlf-bom.md')
  await writeFile(sample, Buffer.from('\ufeff第一行\r\n第二行\r\n', 'utf8'))
  const before = sha(sample)
  const child = spawn(hostExe, [sample], {
    cwd: HOST_DIR,
    env: {
      ...process.env,
      SIDELIGHT_PORT: String(HOST_PORT),
      WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS: `--remote-debugging-port=${HOST_CDP}`,
    },
    stdio: 'ignore',
  })
  const waitCdp = async () => {
    for (let attempt = 0; attempt < 60; attempt += 1) {
      try {
        const response = await fetch(`http://127.0.0.1:${HOST_CDP}/json/version`)
        if (response.ok) return true
      } catch {
        // 还没起来
      }
      await new Promise((done) => setTimeout(done, 500))
    }
    return false
  }
  const ready = await waitCdp()
  if (!ready) {
    console.log('UNVERIFIED 宿主段：CDP 没起来（可能被单实例 Mutex / 端口占用挡住）')
  } else {
    hostRan = true
    const hostBrowser = await chromium.connectOverCDP(`http://127.0.0.1:${HOST_CDP}`)
    const context = hostBrowser.contexts()[0]
    const page = context.pages()[0] ?? (await context.newPage())
    await page.waitForSelector('.editor', { timeout: 20000 })
    await page.waitForTimeout(800)
    const info = await stateOf(page)
    check('宿主：标题为 crlf-bom.md — Sidelight', info.title === 'crlf-bom.md — Sidelight', info.title)
    check('宿主：状态栏「保存到 crlf-bom.md」', (info.status ?? '').includes('保存到 crlf-bom.md'), info.status)
    check('宿主：可写文档无只读横幅', !info.readonlyBanner)
    await page.locator('.editor').click()
    await page.keyboard.press('Control+s')
    await page.waitForTimeout(600)
    const noop = await stateOf(page)
    const afterNoop = sha(sample)
    check('宿主：不改 Ctrl+S 提示「没有改动，未写入」', (noop.toast ?? '').includes('没有改动，未写入'), noop.toast ?? 'none')
    check('宿主：不改 Ctrl+S 原文件 SHA 不变', before === afterNoop, `${before.slice(0, 10)}…`)

    await typeAtEnd(page, '改')
    await page.keyboard.press('Control+s')
    await page.waitForTimeout(1200)
    const saved = await stateOf(page)
    const afterSave = sha(sample)
    const bytes = readFileSync(sample)
    check('宿主：改字 Ctrl+S 提示「已保存到」', (saved.toast ?? '').includes('已保存到 crlf-bom.md'), saved.toast ?? 'none')
    check('宿主：保存后 dirty=false', (await dirty(page)) === false)
    check('宿主：磁盘哈希变化', before !== afterSave, `${before.slice(0, 10)}… -> ${afterSave.slice(0, 10)}…`)
    check('宿主：BOM 保留（EF BB BF）', bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf, bytes.subarray(0, 3).toString('hex'))
    check('宿主：CRLF 保留', bytes.toString('utf8').includes('\r\n'))
    await page.screenshot({ path: `${OUT}/t1-host-saved.png` })

    // 转发：第二个实例把 forwarded.md 交给宿主，页面刷新成新文件，旧文件不再被写
    const forwarded = join(SAMPLES, 'forwarded.md')
    await writeFile(forwarded, '# forwarded\r\n\r\n第二篇\r\n')
    const forwardedBefore = sha(forwarded)
    const keptSampleHash = sha(sample)
    const secondary = spawn(hostExe, [forwarded], {
      cwd: HOST_DIR,
      env: {
        ...process.env,
        SIDELIGHT_PORT: String(HOST_PORT),
        WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS: `--remote-debugging-port=${HOST_CDP}`,
      },
      stdio: 'ignore',
    })
    await page
      .waitForFunction(() => document.title.startsWith('forwarded.md'), null, { timeout: 20000 })
      .catch(() => {})
    await page.waitForTimeout(1200)
    const forwardedInfo = await stateOf(page)
    check(
      '转发：标题与状态栏切到 forwarded.md',
      forwardedInfo.title.startsWith('forwarded.md') && (forwardedInfo.status ?? '').includes('forwarded.md'),
      forwardedInfo.title,
    )
    await typeAtEnd(page, 'F')
    await page.keyboard.press('Control+s')
    await page.waitForTimeout(1200)
    const forwardedSaved = await stateOf(page)
    check('转发：Ctrl+S 写的是新文件', (forwardedSaved.toast ?? '').includes('已保存到 forwarded.md'), forwardedSaved.toast ?? 'none')
    check('转发：旧文件 a.md 哈希不变', sha(sample) === keptSampleHash)
    check('转发：forwarded.md 哈希变化', sha(forwarded) !== forwardedBefore)
    secondary.kill()
    await hostBrowser.close()
  }
  child.kill()
  await new Promise((done) => setTimeout(done, 800))
} else {
  console.log('UNVERIFIED 宿主段：缺少 .tmp/host-a/Sidelight.exe')
}

console.log(`\n${results.filter((item) => item.ok).length}/${results.length} PASS`)
await browser.close()
if (results.some((item) => !item.ok)) process.exit(1)
