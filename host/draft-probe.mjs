// T5 宿主草稿与关窗探针：草稿键、写读、mtime、四路关窗、落点。
// 用法：node host/draft-probe.mjs
// 前置：host/build.ps1 已产出 host/bin；CDP 9341。www 优先 .tmp/build-a，否则 dist。
import { spawn, spawnSync } from 'node:child_process'
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, utimesSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { chromium } from 'playwright-core'

const CDP = 9341
const ROOT = resolve('.tmp/host-b')
const HOSTDIR = join(ROOT, 'host')
const DOCS = join(ROOT, 'docs')
const DOC = join(DOCS, 'note.md')
const EXE = join(HOSTDIR, 'Sidelight.exe')
const DRAFT = join(DOCS, '.sidelight', 'drafts', 'note.md')

let failed = 0
function check(name, ok, detail) {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`)
  if (!ok) failed += 1
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

function prepare() {
  rmSync(ROOT, { recursive: true, force: true })
  mkdirSync(DOCS, { recursive: true })
  cpSync('host/bin', HOSTDIR, {
    recursive: true,
    filter: (src) => !src.includes('webview2-data') && !src.endsWith('host.log') && !src.includes(join('host', 'bin', 'www')),
  })
  rmSync(join(HOSTDIR, 'www'), { recursive: true, force: true })
  const www = existsSync('.tmp/build-a/index.html') ? '.tmp/build-a' : 'dist'
  cpSync(www, join(HOSTDIR, 'www'), { recursive: true })
  console.log(`www source: ${www}`)
  writeFileSync(DOC, '# note\n\noriginal line\n', 'utf8')
  const old = new Date(Date.now() - 120000)
  utimesSync(DOC, old, old)
}

function killHosts() {
  spawnSync('powershell', ['-NoProfile', '-Command', 'Get-Process Sidelight -ErrorAction SilentlyContinue | Stop-Process -Force'], { windowsHide: true })
}
function closeWindow() {
  const r = spawnSync('powershell', ['-NoProfile', '-Command', '(Get-Process Sidelight -ErrorAction SilentlyContinue | Select-Object -First 1).CloseMainWindow()'], { windowsHide: true, encoding: 'utf8' })
  return (r.stdout || '').trim()
}
function hostAlive() {
  const r = spawnSync('powershell', ['-NoProfile', '-Command', '@(Get-Process Sidelight -ErrorAction SilentlyContinue).Count'], { windowsHide: true, encoding: 'utf8' })
  return Number((r.stdout || '0').trim()) > 0
}

async function waitCdp(timeoutMs = 30000) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    try { if ((await fetch(`http://127.0.0.1:${CDP}/json/version`)).ok) return true } catch { }
    await sleep(100)
  }
  return false
}

function startHost() {
  return spawn(EXE, [DOC], {
    env: { ...process.env, WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS: `--remote-debugging-port=${CDP}` },
    stdio: 'ignore',
  })
}

async function openPage() {
  if (!(await waitCdp())) throw new Error('CDP 9341 不可用')
  const browser = await chromium.connectOverCDP(`http://127.0.0.1:${CDP}`)
  const page = browser.contexts()[0].pages()[0]
  await page.waitForSelector('.ProseMirror', { timeout: 30000 }).catch(() => { })
  await sleep(1000)
  return { browser, page }
}

const post = (page, message) => page.evaluate((msg) => new Promise((resolve) => {
  const handler = (event) => {
    window.chrome.webview.removeEventListener('message', handler)
    resolve(event.data)
  }
  window.chrome.webview.addEventListener('message', handler)
  window.chrome.webview.postMessage(msg)
  setTimeout(() => resolve({ timeout: true }), 12000)
}), message)

async function installCloseSpy(page) {
  await page.evaluate(() => {
    window.__closeReqs = 0
    window.__closeMode = 'silent'
    if (!window.__closeSpy) {
      window.__closeSpy = true
      window.chrome.webview.addEventListener('message', (event) => {
        const data = event.data
        if (!data || data.type !== 'close-request') return
        window.__closeReqs += 1
        if (window.__closeMode === 'cancel') {
          window.chrome.webview.postMessage({ v: 1, type: 'close-answer', action: 'cancel' })
        } else if (window.__closeMode === 'discard') {
          window.chrome.webview.postMessage({ v: 1, type: 'close-answer', action: 'discard' })
        } else if (window.__closeMode === 'save-draft') {
          window.chrome.webview.postMessage({ v: 1, type: 'close-answer', action: 'save-draft', text: window.__closeDraftText })
        }
      })
    }
  })
}
const setDirty = (page, value) => page.evaluate((dirty) => { window.__slState = { ...(window.__slState || {}), dirty } }, value)
const closeReqs = (page) => page.evaluate(() => window.__closeReqs || 0)

async function waitExit(host, timeoutMs = 20000) {
  if (host.exitCode !== null) return true
  return await new Promise((res) => {
    const timer = setTimeout(() => res(false), timeoutMs)
    host.once('exit', () => { clearTimeout(timer); res(true) })
  })
}

async function main() {
  if (!existsSync(join('host/bin', 'Sidelight.exe'))) {
    console.error('缺少 host/bin/Sidelight.exe')
    process.exit(1)
  }
  prepare()

  // ---- 1. 草稿写读 + 键 + mtime ----
  killHosts(); await sleep(400)
  let host = startHost()
  let { browser, page } = await openPage()
  await installCloseSpy(page)
  const save = await post(page, { v: 1, type: 'draft-save', id: 'd1', text: '# note\n\ndraft line\n' })
  const draftExists = existsSync(DRAFT)
  const draftText = draftExists ? readFileSync(DRAFT, 'utf8') : ''
  check('draft-save：键 .sidelight/drafts/note.md、内容 LF', save && save.ok === true && draftExists && draftText === '# note\n\ndraft line\n', `ok=${save && save.ok} exists=${draftExists} bytes=${save && save.bytes}`)
  const draftMtime = draftExists ? statSync(DRAFT).mtimeMs : 0
  const docMtime = statSync(DOC).mtimeMs
  check('草稿 mtime 新于原文件', draftMtime > docMtime, `draft=${Math.round(draftMtime)} doc=${Math.round(docMtime)}`)
  const read = await page.evaluate(async () => {
    const res = await fetch('/__draft')
    const body = await res.json()
    return { status: res.status, cache: res.headers.get('cache-control'), exists: body.exists, text: body.text, mtime: body.mtime }
  })
  check('/__draft 读回草稿、no-store', read.status === 200 && read.exists === true && read.text === '# note\n\ndraft line\n' && read.cache === 'no-store', `status=${read.status} cache=${read.cache}`)
  const clear = await post(page, { v: 1, type: 'draft-clear', id: 'd2' })
  check('draft-clear 删除草稿', clear && clear.ok === true && !existsSync(DRAFT), `ok=${clear && clear.ok}`)

  // ---- 2. 重开：草稿仍在（再写一条） ----
  await post(page, { v: 1, type: 'draft-save', id: 'd3', text: 'reopen draft\n' })
  await browser.close().catch(() => { })
  await waitExit(host, 8000)
  killHosts(); await sleep(400)
  host = startHost()
  ;({ browser, page } = await openPage())
  const afterReopen = await page.evaluate(async () => {
    const res = await fetch('/__draft')
    return { status: res.status, body: await res.json() }
  })
  check('重开后 /__draft 仍返回该草稿', afterReopen.status === 200 && afterReopen.body.text === 'reopen draft\n', `status=${afterReopen.status}`)

  // ---- 3. 关窗：dirty=0 直接关 ----
  await setDirty(page, 0)
  closeWindow()
  const closedClean = await waitExit(host, 20000)
  check('关窗 dirty=0：直接关闭', closedClean, `alive=${hostAlive()}`)
  await browser.close().catch(() => { })
  killHosts(); await sleep(400)

  // ---- 4. 关窗：dirty=1 无答案，第二次 × 不重复请求；cancel 后可再问 ----
  host = startHost()
  ;({ browser, page } = await openPage())
  await installCloseSpy(page)
  await setDirty(page, 1)
  closeWindow()
  await sleep(1500)
  closeWindow()
  await sleep(1500)
  const reqs = await closeReqs(page)
  check('dirty=1：只发一次 close-request（再次点 × 不重复）', reqs === 1 && hostAlive(), `reqs=${reqs} alive=${hostAlive()}`)
  // 5 s 无答案：窗口保持，closePending 不清，再点 × 仍不重复请求
  await sleep(5200)
  closeWindow()
  await sleep(1200)
  const reqsAfterTimeout = await closeReqs(page)
  check('5 s 无答案：窗口保持、仍未重复请求', reqsAfterTimeout === 1 && hostAlive(), `reqs=${reqsAfterTimeout} alive=${hostAlive()}`)
  await page.evaluate(() => { window.__closeMode = 'cancel' })
  await page.evaluate(() => window.chrome.webview.postMessage({ v: 1, type: 'close-answer', action: 'cancel' }))
  await sleep(800)
  check('close-answer cancel：窗口保持、可再次询问', hostAlive(), `alive=${hostAlive()}`)
  await setDirty(page, 1)
  closeWindow()
  await sleep(1500)
  const reqs2 = await closeReqs(page)
  check('cancel 后再次点 ×：发出第二条 close-request', reqs2 === 2, `reqs=${reqs2}`)
  await page.evaluate(() => window.chrome.webview.postMessage({ v: 1, type: 'close-answer', action: 'cancel' }))
  await sleep(500)

  // ---- 5. 关窗：discard 先清草稿再关 ----
  await post(page, { v: 1, type: 'draft-save', id: 'd4', text: 'discard me\n' })
  await page.evaluate(() => { window.__closeMode = 'discard' })
  await setDirty(page, 1)
  closeWindow()
  const closedDiscard = await waitExit(host, 20000)
  check('discard：草稿已清并关闭', closedDiscard && !existsSync(DRAFT), `closed=${closedDiscard} draft=${existsSync(DRAFT)}`)
  await browser.close().catch(() => { })
  killHosts(); await sleep(400)

  // ---- 6. 关窗：save-draft 写草稿后关 ----
  host = startHost()
  ;({ browser, page } = await openPage())
  await installCloseSpy(page)
  await page.evaluate(() => { window.__closeMode = 'save-draft'; window.__closeDraftText = 'saved on close\n' })
  await setDirty(page, 1)
  closeWindow()
  const closedSave = await waitExit(host, 20000)
  const savedText = existsSync(DRAFT) ? readFileSync(DRAFT, 'utf8') : ''
  check('save-draft：写草稿后关闭', closedSave && savedText === 'saved on close\n', `closed=${closedSave} text=${JSON.stringify(savedText)}`)
  await browser.close().catch(() => { })
  killHosts(); await sleep(400)

  // ---- 7. 落点：草稿只在文档目录的 .sidelight/drafts ----
  const sidelightDirs = []
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name)
      if (entry.isDirectory()) {
        if (entry.name === '.sidelight') sidelightDirs.push(full)
        else walk(full)
      }
    }
  }
  walk(ROOT)
  const onlyDocDir = sidelightDirs.length === 1 && join(DOCS, '.sidelight') === sidelightDirs[0]
  check('落点：.sidelight 只在文档目录', onlyDocDir, sidelightDirs.join(' | ') || 'none')

  console.log(failed === 0 ? 'summary: 13/13 PASS' : `summary: ${failed} FAIL`)
  process.exitCode = failed === 0 ? 0 : 1
}

main().catch((err) => {
  console.error('PROBE-CRASH', err)
  killHosts()
  process.exitCode = 1
})
