import { existsSync } from 'node:fs'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { spawn } from 'node:child_process'
import { chromium } from 'playwright-core'

const URL = process.env.SIDELIGHT_URL ?? 'http://localhost:5173'
const CDP = process.env.SIDELIGHT_CDP ?? 'http://127.0.0.1:9222'
const OUT = 'shots/round-09'

const results = []
const check = (label, ok, extra = '') => {
  results.push({ label, ok })
  console.log(`${ok ? 'PASS' : 'FAIL'} ${label}${extra ? ` (${extra})` : ''}`)
}

const items8 = Array.from({ length: 8 }, (_, index) => ({
  id: `id-${index + 1}`,
  seq: index + 1,
  name: index % 2 === 0 ? '笔记.md' : `长文件名-${index + 1}-${'很长的名字'.repeat(3)}.md`,
  dir: `文档/${index + 1} 号目录`,
}))

const harness = ({ host = true, recent }) => {
  const io = { messages: [], posts: [], gate: null, gateCalls: 0 }
  window.__io = io
  if (host) {
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
  window.__recentPayload = recent
  window.__setRecent = (payload) => {
    window.__recentPayload = payload
  }
}

const browser = await chromium.connectOverCDP(CDP)

const openPage = async ({ host = true, recent, viewport = { width: 1440, height: 900 }, doc = null, gate = null } = {}) => {
  const context = await browser.newContext({ acceptDownloads: true, viewport })
  const page = await context.newPage()
  await page.addInitScript(harness, { host, recent })
  await page.route('**/__recent', async (route) => {
    if (gate) {
      gate.calls += 1
      await gate.wait
    }
    const payload = await page.evaluate(() => window.__recentPayload)
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(payload) })
  })
  await page.route('**/__doc', (route) => {
    if (!doc) return route.fulfill({ status: 404, contentType: 'application/json', body: '{"v":1,"ok":false,"error":"NO_DOC"}' })
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(doc) })
  })
  await page.route('**/__draft', (route) =>
    route.fulfill({ status: 404, contentType: 'application/json', body: '{"v":1,"exists":false}' }),
  )
  await page.goto(URL, { waitUntil: 'networkidle' })
  await page.evaluate(() => localStorage.clear())
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForSelector('.editor', { timeout: 15000 })
  await page.waitForTimeout(500)
  return { context, page }
}

const docPayload = (text, fileName = 'host.md') => ({
  v: 1,
  ok: true,
  fileName,
  encoding: 'utf-8',
  bom: false,
  eol: 'lf',
  endsWithNewline: true,
  lineCount: text.split('\n').length,
  size: text.length,
  mtime: 1000,
  readOnly: false,
  text,
})

const menuState = (page) =>
  page.evaluate(() => {
    const menu = document.querySelector('.file-menu')
    const items = [...document.querySelectorAll('.file-menu [role="menuitem"]')]
    const recent = [...document.querySelectorAll('.file-menu .recent-item')]
    const clear = [...items].find((node) => node.textContent?.includes('清除最近记录'))
    return {
      hasMenu: Boolean(menu),
      menuText: menu?.textContent ?? '',
      itemCount: items.length,
      recentCount: recent.length,
      recentTitles: recent.map((node) => node.getAttribute('title')),
      recentNames: recent.map((node) => node.querySelector('.recent-name')?.textContent),
      recentDirs: recent.map((node) => node.querySelector('.recent-dir')?.textContent),
      disabledRecent: recent.filter((node) => node.disabled).map((node) => node.getAttribute('title')),
      clearVisible: clear ? clear.getBoundingClientRect().top >= (menu?.getBoundingClientRect().top ?? 0) && clear.getBoundingClientRect().bottom <= (menu?.getBoundingClientRect().bottom ?? 0) + 1 : false,
      scrollTop: menu?.scrollTop ?? 0,
      menuHeight: menu?.getBoundingClientRect().height ?? 0,
      menuScrollHeight: menu?.scrollHeight ?? 0,
      appTop: document.querySelector('.app')?.getBoundingClientRect().top ?? -1,
      active: document.activeElement?.textContent?.trim() ?? '',
      toast: document.querySelector('.toast-text')?.textContent ?? '',
      toastClass: document.querySelector('.toast')?.className ?? '',
      toastActions: [...document.querySelectorAll('.toast-action')].map((node) => node.textContent),
    }
  })

const messages = (page) => page.evaluate(() => window.__io.messages)
const reply = (page, data) => page.evaluate((payload) => window.__replyHost(payload), data)
const openMenu = async (page) => {
  await page.locator('.file-menu-trigger').click()
  await page.waitForTimeout(350)
}
const clickRecent = async (page, index) => {
  await page.locator('.recent-item').nth(index).click()
  await page.waitForTimeout(300)
}

// ---------- 1) 无宿主 ----------
{
  const { context, page } = await openPage({ host: false, recent: { v: 1, state: 'ok', items: items8 } })
  await openMenu(page)
  const info = await menuState(page)
  check('无宿主：菜单只有 4 项', info.itemCount === 4, String(info.itemCount))
  check('无宿主：没有「最近」字样', !info.menuText.includes('最近'), info.menuText.slice(0, 40))
  check('无宿主：菜单高度 ≤ 140', info.menuHeight <= 140, String(info.menuHeight))
  await page.keyboard.press('Escape')
  await context.close()
}

// ---------- 2) disabled / volatile ----------
{
  const { context, page } = await openPage({
    recent: { v: 1, state: 'disabled', reason: '状态目录不可写', items: [] },
  })
  await openMenu(page)
  const info = await menuState(page)
  check('disabled：显示原因行', info.menuText.includes('状态目录不可写'), info.menuText)
  check('disabled：4 个动作仍可用', info.itemCount >= 4, String(info.itemCount))
  await page.screenshot({ path: `${OUT}/t1-recent-disabled.png` })
  await page.keyboard.press('Escape')
  await context.close()

  const volatile = await openPage({ recent: { v: 1, state: 'volatile', items: items8.slice(0, 2) } })
  await openMenu(volatile.page)
  const volatileInfo = await menuState(volatile.page)
  check('volatile：显示「临时目录，重启可能丢失」', volatileInfo.menuText.includes('临时目录，重启可能丢失'))
  check('volatile：条目正常渲染', volatileInfo.recentCount === 2, String(volatileInfo.recentCount))
  await volatile.context.close()
}

// ---------- 3) 8 条、两行、键盘 ----------
{
  const { context, page } = await openPage({ recent: { v: 1, state: 'ok', items: items8 } })
  await openMenu(page)
  let info = await menuState(page)
  check('8 条全部渲染', info.recentCount === 8, String(info.recentCount))
  check('同名文件靠父目录区分', info.recentDirs[0] !== info.recentDirs[2], `${info.recentDirs[0]} / ${info.recentDirs[2]}`)
  check('长名 title 含全名', info.recentTitles[1]?.includes('长文件名-2-'), info.recentTitles[1]?.slice(0, 40))
  const structure = await page.evaluate(() => ({
    separators: document.querySelectorAll('.file-menu .menu-separator').length,
    title: document.querySelector('.file-menu .menu-section-title')?.textContent ?? '',
    clear: [...document.querySelectorAll('.file-menu [role="menuitem"]')].some((node) => node.textContent?.includes('清除最近记录')),
  }))
  check('菜单结构：两条分隔线 + 标题 + 清除项', structure.separators === 2 && structure.title.includes('最近打开') && structure.clear, JSON.stringify(structure))
  for (let step = 0; step < 12; step += 1) await page.keyboard.press('ArrowDown')
  info = await menuState(page)
  check('ArrowDown 12 次到「清除最近记录」', info.active.includes('清除最近记录'), info.active)
  await page.keyboard.press('Home')
  check('Home 回第一项', (await menuState(page)).active.includes('新建'), (await menuState(page)).active)
  await page.keyboard.press('End')
  check('End 到「清除最近记录」', (await menuState(page)).active.includes('清除最近记录'))
  await page.keyboard.press('Escape')
  check('Esc 关闭菜单并回触发器', !(await menuState(page)).hasMenu)
  await page.screenshot({ path: `${OUT}/t1-recent-menu.png` })
  await context.close()
}

// ---------- 4) 短窗口滚动 ----------
{
  for (const viewport of [
    { width: 960, height: 500 },
    { width: 1024, height: 600 },
  ]) {
    const { context, page } = await openPage({ recent: { v: 1, state: 'ok', items: items8 }, viewport })
    await openMenu(page)
    await page.locator('.file-menu').hover()
    await page.mouse.wheel(0, 500)
    await page.waitForTimeout(300)
    const wheelInfo = await menuState(page)
    check(`${viewport.width}×${viewport.height}：滚轮能滚动菜单`, wheelInfo.scrollTop > 0, String(wheelInfo.scrollTop))
    await page.keyboard.press('End')
    const info = await menuState(page)
    check(`${viewport.width}×${viewport.height}：End 后清除项在菜单视口内`, info.clearVisible, `${info.clearVisible}`)
    check(`${viewport.width}×${viewport.height}：菜单出现滚动`, info.menuScrollHeight > info.menuHeight, `${info.menuScrollHeight}/${info.menuHeight}`)
    check(`${viewport.width}×${viewport.height}：.app 不上移`, info.appTop === 0, String(info.appTop))
    await page.keyboard.press('Escape')
    await context.close()
  }

  const wide = await openPage({ recent: { v: 1, state: 'ok', items: items8 }, viewport: { width: 1440, height: 900 } })
  await openMenu(wide.page)
  const wideInfo = await menuState(wide.page)
  check('1440×900：菜单无滚动条', wideInfo.menuScrollHeight <= wideInfo.menuHeight, `${wideInfo.menuScrollHeight}/${wideInfo.menuHeight}`)
  await wide.context.close()

  for (const viewport of [
    { width: 1280, height: 800 },
    { width: 1024, height: 768 },
  ]) {
    const pageInfo = await openPage({ recent: { v: 1, state: 'ok', items: items8 }, viewport })
    await openMenu(pageInfo.page)
    const measured = await menuState(pageInfo.page)
    check(`${viewport.width}×${viewport.height}：菜单无滚动条`, measured.menuScrollHeight <= measured.menuHeight, `${measured.menuScrollHeight}/${measured.menuHeight}`)
    await pageInfo.context.close()
  }

  const empty = await openPage({ recent: { v: 1, state: 'ok', items: [] } })
  await openMenu(empty.page)
  const emptyInfo = await menuState(empty.page)
  check('空态：一行灰字提示', emptyInfo.menuText.includes('还没有最近打开的文件'), emptyInfo.menuText.slice(0, 40))
  await empty.context.close()
}

// ---------- 5) 清除 / 撤销 / 失败 ----------
{
  const { context, page } = await openPage({ recent: { v: 1, state: 'ok', items: items8 } })
  await openMenu(page)
  await page.locator('.file-menu [role="menuitem"]', { hasText: '清除最近记录' }).click()
  await page.waitForTimeout(300)
  let sent = await messages(page)
  check('清除发 recent-clear', sent.some((message) => message.type === 'recent-clear'), JSON.stringify(sent.map((m) => m.type)))
  const clear = sent.find((message) => message.type === 'recent-clear')
  await reply(page, { v: 1, type: 'recent-clear-result', id: clear.id, ok: true })
  await page.waitForTimeout(500)
  let info = await menuState(page)
  check('清除成功：菜单关闭', !info.hasMenu)
  check('清除成功：toast「已清除最近记录」', info.toast.includes('已清除最近记录'), info.toast)
  check('清除成功：带「撤销」', info.toastActions.includes('撤销'), JSON.stringify(info.toastActions))
  await page.locator('.toast-action', { hasText: '撤销' }).click()
  await page.waitForTimeout(300)
  sent = await messages(page)
  check('撤销发 recent-restore', sent.some((message) => message.type === 'recent-restore'), JSON.stringify(sent.map((m) => m.type)))
  await context.close()

  const failing = await openPage({ recent: { v: 1, state: 'ok', items: items8 } })
  await openMenu(failing.page)
  await failing.page.locator('.file-menu [role="menuitem"]', { hasText: '清除最近记录' }).click()
  await failing.page.waitForTimeout(300)
  const clearFail = (await messages(failing.page)).find((message) => message.type === 'recent-clear')
  await reply(failing.page, { v: 1, type: 'recent-clear-result', id: clearFail.id, ok: false, error: 'IO' })
  await failing.page.waitForTimeout(400)
  info = await menuState(failing.page)
  check('清除失败：menu 还在', info.hasMenu)
  check('清除失败：error toast 含「清除失败」并说列表还在', info.toast.includes('清除失败') && info.toast.includes('最近记录还在'), info.toast)
  check('清除失败：列表未清空', info.recentCount === 8, String(info.recentCount))
  await failing.context.close()
}

// ---------- 6) 脏文档点最近项：保存并切换后打开的是刚点的 ----------
{
  const text = '# 宿主文档\n\n正文。\n'
  const { context, page } = await openPage({
    recent: { v: 1, state: 'ok', items: items8.slice(0, 3) },
    doc: docPayload(text),
  })
  await page.locator('.editor').click()
  await page.keyboard.press('Control+End')
  await page.keyboard.type('脏')
  await page.waitForTimeout(300)
  await openMenu(page)
  await clickRecent(page, 1)
  await page.waitForTimeout(300)
  check('脏文档点最近项：弹切换确认', (await page.locator('.dialog[aria-label="切换文档"]').count()) === 1)
  await page.locator('.dialog[aria-label="切换文档"] button', { hasText: '保存并切换' }).click()
  await page.waitForTimeout(400)
  let sent = await messages(page)
  const save = sent.find((message) => message.type === 'save')
  check('脏文档：先发 save', Boolean(save), JSON.stringify(sent.map((m) => m.type)))
  await reply(page, { v: 1, type: 'save-result', id: save.id, ok: true, mtime: 2000 })
  await page.waitForTimeout(500)
  sent = await messages(page)
  const openRecent = sent.find((message) => message.type === 'open-recent')
  check('保存成功后发 open-recent', Boolean(openRecent), JSON.stringify(sent.map((m) => m.type)))
  check('open-recent 是刚点的 id/seq', openRecent?.id === 'id-2' && openRecent?.seq === 2, JSON.stringify({ id: openRecent?.id, seq: openRecent?.seq }))
  await context.close()

  const cancel = await openPage({
    recent: { v: 1, state: 'ok', items: items8.slice(0, 3) },
    doc: docPayload(text),
  })
  await cancel.page.locator('.editor').click()
  await cancel.page.keyboard.press('Control+End')
  await cancel.page.keyboard.type('脏')
  await cancel.page.waitForTimeout(300)
  await openMenu(cancel.page)
  await clickRecent(cancel.page, 2)
  await cancel.page.locator('.dialog[aria-label="切换文档"] button', { hasText: '取消' }).click()
  await cancel.page.waitForTimeout(400)
  const cancelSent = await messages(cancel.page)
  check('取消保存：不发 open-recent', !cancelSent.some((message) => message.type === 'open-recent'), JSON.stringify(cancelSent.map((m) => m.type)))
  await cancel.context.close()
}

// ---------- 7) 失效条目：保留、原因、移除、重试 ----------
{
  const { context, page } = await openPage({ recent: { v: 1, state: 'ok', items: items8.slice(0, 2) } })
  await openMenu(page)
  await clickRecent(page, 0)
  let sent = await messages(page)
  const open1 = sent.find((message) => message.type === 'open-recent')
  await reply(page, { v: 1, type: 'open-recent-result', id: open1.id, ok: false, error: 'FILE_GONE' })
  await page.waitForTimeout(400)
  let info = await menuState(page)
  check('FILE_GONE：toast 含「文件不存在」', info.toast.includes('文件不存在'), info.toast)
  check('FILE_GONE：带「从列表移除」「重试」', info.toastActions.includes('从列表移除') && info.toastActions.includes('重试'), JSON.stringify(info.toastActions))
  await openMenu(page)
  info = await menuState(page)
  check('FILE_GONE：列表行仍在', info.recentCount === 2, String(info.recentCount))
  await page.locator('.file-menu [role="menuitem"]', { hasText: '清除最近记录' }).count()

  // 移除
  await page.locator('.toast-action', { hasText: '从列表移除' }).click()
  await page.waitForTimeout(300)
  sent = await messages(page)
  const remove = sent.find((message) => message.type === 'recent-remove')
  check('移除发 recent-remove', Boolean(remove), JSON.stringify(sent.map((m) => m.type)))
  await page.evaluate(() => window.__setRecent({ v: 1, state: 'ok', items: window.__recentPayload.items.slice(1) }))
  await reply(page, { v: 1, type: 'recent-remove-result', id: remove.id, ok: true })
  await page.waitForTimeout(700)
  await openMenu(page)
  info = await menuState(page)
  check('移除成功后该行消失', info.recentCount === 1, String(info.recentCount))

  // 重试
  await page.locator('.recent-item').first().click()
  await page.waitForTimeout(300)
  sent = await messages(page)
  const retryOpen = sent.filter((message) => message.type === 'open-recent').at(-1)
  await reply(page, { v: 1, type: 'open-recent-result', id: retryOpen.id, ok: false, error: 'FILE_GONE' })
  await page.waitForTimeout(300)
  await page.locator('.toast-action', { hasText: '重试' }).click()
  await page.waitForTimeout(300)
  sent = await messages(page)
  check('重试重发 open-recent', sent.filter((message) => message.type === 'open-recent').length >= 3, String(sent.filter((message) => message.type === 'open-recent').length))
  await context.close()
}

// ---------- 8) 错误码映射各不相同 ----------
{
  const { context, page } = await openPage({ recent: { v: 1, state: 'ok', items: items8.slice(0, 4) } })
  const expected = [
    ['READONLY', '只能只读打开'],
    ['ENCODING', '编码无法识别'],
    ['TOO_LARGE', '超过 6 MB'],
  ]
  for (let index = 0; index < expected.length; index += 1) {
    const [code, text] = expected[index]
    await openMenu(page)
    await clickRecent(page, index)
    const sent = await messages(page)
    const request = sent.filter((message) => message.type === 'open-recent').at(-1)
    await reply(page, { v: 1, type: 'open-recent-result', id: request.id, ok: false, error: code })
    await page.waitForTimeout(400)
    const info = await menuState(page)
    check(`${code}：文案「${text}」`, info.toast.includes(text), info.toast)
  }
  await page.screenshot({ path: `${OUT}/t2-error-toast.png` })
  await context.close()
}

// ---------- 9) STALE：刷新一次、刷新期间禁用、防重复点击 ----------
{
  const gate = { calls: 0, wait: Promise.resolve() }
  let release
  gate.wait = new Promise((resolve) => {
    release = resolve
  })
  let gated = false
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await context.newPage()
  await page.addInitScript(harness, { host: true, recent: { v: 1, state: 'ok', items: items8.slice(0, 2) } })
  await page.route('**/__recent', async (route) => {
    if (gated) {
      gate.calls += 1
      await gate.wait
    }
    const payload = await page.evaluate(() => window.__recentPayload)
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(payload) })
  })
  await page.goto(URL, { waitUntil: 'networkidle' })
  await page.waitForSelector('.editor')
  await page.waitForTimeout(400)
  await openMenu(page)
  gated = true
  await clickRecent(page, 0)
  const sent = await messages(page)
  const request = sent.find((message) => message.type === 'open-recent')
  await page.evaluate(() => window.__setRecent({ v: 1, state: 'ok', items: [{ id: 'id-1', seq: 9, name: '笔记.md', dir: '新目录' }, { id: 'id-2', seq: 2, name: '第二条.md', dir: '文档/2' }] }))
  await reply(page, { v: 1, type: 'open-recent-result', id: request.id, ok: false, error: 'STALE' })
  await page.waitForTimeout(300)
  await openMenu(page)
  let info = await menuState(page)
  check('STALE：刷新期间该行 disabled', info.disabledRecent.some((title) => title?.includes('笔记.md')), JSON.stringify(info.disabledRecent))
  // 连续点击禁用行不应再发 open-recent
  const before = (await messages(page)).filter((message) => message.type === 'open-recent').length
  await page.locator('.recent-item').first().click({ force: true }).catch(() => {})
  await page.waitForTimeout(200)
  const after = (await messages(page)).filter((message) => message.type === 'open-recent').length
  check('STALE：重复点击不再发请求', before === after, `${before}/${after}`)
  release()
  gated = false
  await page.waitForTimeout(800)
  // 菜单在 STALE 刷新期间一直开着，不要再次 toggle 把它关掉
  info = await menuState(page)
  check(
    'STALE：刷新后按新 seq 可点',
    !info.disabledRecent.length && info.recentDirs[0] === '新目录',
    `${JSON.stringify(info.disabledRecent)} / ${JSON.stringify(info.recentDirs)}`,
  )
  await context.close()
}

// ---------- 10) 移除失败共用 recentError ----------
{
  const { context, page } = await openPage({ recent: { v: 1, state: 'ok', items: items8.slice(0, 2) } })
  await openMenu(page)
  await clickRecent(page, 0)
  let sent = await messages(page)
  let request = sent.find((message) => message.type === 'open-recent')
  await reply(page, { v: 1, type: 'open-recent-result', id: request.id, ok: false, error: 'FILE_GONE' })
  await page.waitForTimeout(300)
  await page.locator('.toast-action', { hasText: '从列表移除' }).click()
  await page.waitForTimeout(300)
  sent = await messages(page)
  const remove = sent.find((message) => message.type === 'recent-remove')
  await reply(page, { v: 1, type: 'recent-remove-result', id: remove.id, ok: false, error: 'READONLY' })
  await page.waitForTimeout(400)
  await openMenu(page)
  const info = await menuState(page)
  check('移除失败：同一映射文案「只能只读打开」', info.toast.includes('只能只读打开'), info.toast)
  check('移除失败：行保留', info.recentCount === 2, String(info.recentCount))
  await context.close()
}

// ---------- 宿主真实段：菜单列出宿主记录，点最近项真的重开 ----------
const hostExe = resolve('.tmp/host-a/Sidelight.exe')
if (!process.argv.includes('--browser-only') && existsSync(hostExe)) {
  const sampleDir = resolve('.tmp/host-a-samples/recent')
  await mkdir(sampleDir, { recursive: true })
  const sample = join(sampleDir, 'recent-a.md')
  const forwarded = join(sampleDir, 'recent-b.md')
  await writeFile(sample, '# 最近甲\n\n第一篇。\n', 'utf8')
  await writeFile(forwarded, '# 最近乙\n\n第二篇。\n', 'utf8')
  const stateDir = resolve('.tmp/host-a/state-r9')
  await rm(stateDir, { recursive: true, force: true })

  const env = {
    ...process.env,
    SIDELIGHT_PORT: '47861',
    SIDELIGHT_STATE_DIR: stateDir,
    SIDELIGHT_STATE_KIND: 'portable',
    WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS: '--remote-debugging-port=9340',
  }
  const host = spawn(hostExe, [sample], { cwd: resolve('.tmp/host-a'), env, stdio: 'ignore' })
  let ready = false
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetch('http://127.0.0.1:9340/json/version')
      if (response.ok) {
        ready = true
        break
      }
    } catch {}
    await new Promise((done) => setTimeout(done, 500))
  }
  if (ready) {
    const hostBrowser = await chromium.connectOverCDP('http://127.0.0.1:9340')
    const page = hostBrowser.contexts()[0].pages()[0]
    await page.waitForSelector('.editor', { timeout: 20000 })
    await page.waitForTimeout(800)
    // 第二个实例转发第二篇：宿主在 forward 成功时记录最近项
    const forward = spawn(hostExe, [forwarded], { cwd: resolve('.tmp/host-a'), env, stdio: 'ignore' })
    await page.waitForFunction(() => document.title.startsWith('recent-b.md'), null, { timeout: 20000 }).catch(() => {})
    await page.waitForTimeout(1500)
    await page.locator('.file-menu-trigger').click()
    await page.waitForTimeout(800)
    const items = await page.evaluate(() =>
      [...document.querySelectorAll('.file-menu .recent-item')].map((node) => ({
        title: node.getAttribute('title'),
        name: node.querySelector('.recent-name')?.textContent,
        dir: node.querySelector('.recent-dir')?.textContent,
        height: node.getBoundingClientRect().height,
      })),
    )
    check('宿主：菜单出现转发打开的文件', items.some((item) => item.name === 'recent-b.md'), JSON.stringify(items.map((item) => item.name)))
    check('宿主：条目是两行', items[0]?.height >= 34 && items[0]?.dir !== undefined, JSON.stringify(items[0]))
    await page.screenshot({ path: `${OUT}/t1-recent-host.png` })
    const index = items.findIndex((item) => item.name === 'recent-b.md')
    if (index >= 0) {
      await page.locator('.recent-item').nth(index).click()
      await page.waitForTimeout(1500)
      const reopened = await page.evaluate(() => document.title)
      check('宿主：点最近项后成功重开', reopened.startsWith('recent-b.md'), reopened)
    }
    forward.kill()
    await hostBrowser.close()
  } else {
    console.log('SKIP 宿主段：CDP 没起来')
  }
  host.kill()
  await new Promise((done) => setTimeout(done, 800))
} else {
  console.log('SKIP 宿主段：缺少 .tmp/host-a/Sidelight.exe 或 --browser-only')
}

console.log(`\n${results.filter((item) => item.ok).length}/${results.length} PASS`)
await browser.close()
if (results.some((item) => !item.ok)) process.exit(1)
