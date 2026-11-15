// T3 最近记录探针：9→8、去重、契约、错误码、clear/restore/remove、日志脱敏与轮转。
// 用法：node host/recent-probe.mjs
// 前置：host/build.ps1 已产出 host/bin；CDP 9343；www 优先 .tmp/build-a，否则 dist。
import { spawn, spawnSync } from 'node:child_process'
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync, appendFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import http from 'node:http'
import { chromium } from 'playwright-core'

const CDP = 9343
const ROOT = resolve('.tmp/host-r9')
const HOSTDIR = join(ROOT, 'host')
const DOCS = join(ROOT, 'docs')
const STATE = join(ROOT, 'state')
const EXE = join(HOSTDIR, 'Sidelight.exe')
const LOG = join(HOSTDIR, 'host.log')

const results = []
let failed = 0
function check(name, ok, detail) {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`)
  if (!ok) failed += 1
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

function prepare() {
  rmSync(ROOT, { recursive: true, force: true })
  mkdirSync(DOCS, { recursive: true })
  mkdirSync(STATE, { recursive: true })
  cpSync('host/bin', HOSTDIR, {
    recursive: true,
    filter: (src) => !src.includes('webview2-data') && !src.includes('host.log') && !src.includes('state'),
  })
  rmSync(join(HOSTDIR, 'www'), { recursive: true, force: true })
  const www = existsSync('.tmp/build-a/index.html') ? '.tmp/build-a' : 'dist'
  cpSync(www, join(HOSTDIR, 'www'), { recursive: true })
  console.log(`www source: ${www}`)
  // 旧日志：含完整路径，用于验证迁移与脱敏
  writeFileSync(LOG, '00:00:00.000 start args=D:\\secret\\old.md\r\n00:00:00.001 pipe sent D:\\secret\\old.md\r\n', 'utf8')
  for (let i = 1; i <= 9; i++) writeFileSync(join(DOCS, `doc${i}.md`), `# doc ${i}\n`, 'utf8')
}

function killHosts() {
  spawnSync('powershell', ['-NoProfile', '-Command', 'Get-Process Sidelight -ErrorAction SilentlyContinue | Stop-Process -Force'], { windowsHide: true })
}

async function waitCdp(timeoutMs = 30000) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    try { if ((await fetch(`http://127.0.0.1:${CDP}/json/version`)).ok) return true } catch { }
    await sleep(100)
  }
  return false
}

function startHost(doc, kind = 'localappdata') {
  return spawn(EXE, doc ? [doc] : [], {
    env: {
      ...process.env,
      WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS: `--remote-debugging-port=${CDP}`,
      SIDELIGHT_STATE_DIR: STATE,
      SIDELIGHT_STATE_KIND: kind,
    },
    stdio: 'ignore',
  })
}

async function openPage() {
  if (!(await waitCdp())) throw new Error('CDP 9343 不可用')
  const browser = await chromium.connectOverCDP(`http://127.0.0.1:${CDP}`)
  const page = browser.contexts()[0].pages()[0]
  await page.waitForSelector('.ProseMirror', { timeout: 30000 }).catch(() => { })
  await sleep(1200)
  return { browser, page }
}

// open-recent 成功会触发页面 reload；evaluate 可能撞上执行上下文销毁，重试等待新文档。
async function post(page, message) {
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      return await page.evaluate((msg) => new Promise((resolve) => {
        const handler = (event) => {
          window.chrome.webview.removeEventListener('message', handler)
          resolve(event.data)
        }
        window.chrome.webview.addEventListener('message', handler)
        window.chrome.webview.postMessage(msg)
        setTimeout(() => resolve({ timeout: true }), 12000)
      }), message)
    } catch (err) {
      await sleep(1500)
    }
  }
  return { timeout: true }
}

const recent = (page) => page.evaluate(async () => {
  const res = await fetch('/__recent')
  return { status: res.status, cache: res.headers.get('cache-control'), body: await res.json() }
})

function recentByHostEvil() {
  return new Promise((res) => {
    const req = http.request({ host: '127.0.0.1', port: 47821, path: '/__recent', headers: { Host: 'evil' } }, (r) => {
      let data = ''
      r.on('data', (c) => { data += c })
      r.on('end', () => res({ status: r.statusCode, data }))
    })
    req.on('error', () => res({ status: 0 }))
    req.end()
  })
}

async function waitExit(host, timeoutMs = 15000) {
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
  killHosts(); await sleep(400)

  // ---- 1. 9 个 argv 依次打开 → 8 条、去重、顺序 ----
  let host = startHost(join(DOCS, 'doc1.md'))
  let { browser, page } = await openPage()
  for (let i = 2; i <= 9; i++) {
    const second = spawn(EXE, [join(DOCS, `doc${i}.md`)], {
      env: { ...process.env, SIDELIGHT_STATE_DIR: STATE, SIDELIGHT_STATE_KIND: 'localappdata' },
      stdio: 'ignore',
    })
    await waitExit(second, 15000)
    await sleep(500)
  }
  await sleep(1200)
  let view = await recent(page)
  const items = view.body.items || []
  check('9 次打开后列表 8 条', view.status === 200 && items.length === 8, `count=${items.length}`)
  check('顺序：最近打开在最前（doc9）', items[0] && items[0].name === 'doc9.md', `first=${items[0] && items[0].name}`)
  // 再打开 doc5：去重并置顶
  const again = spawn(EXE, [join(DOCS, 'doc5.md')], { env: { ...process.env, SIDELIGHT_STATE_DIR: STATE }, stdio: 'ignore' })
  await waitExit(again, 15000)
  await sleep(1000)
  view = await recent(page)
  const items2 = view.body.items || []
  check('重复打开去重并置顶（doc5 第一、仍 8 条）', items2.length === 8 && items2[0].name === 'doc5.md', `count=${items2.length} first=${items2[0] && items2[0].name}`)

  // ---- 2. 契约：无 openedAt/path、dir 合规、no-store、Host 校验 ----
  const shapeOk = items2.every((item) => item.id && typeof item.seq === 'number' && item.name && typeof item.dir === 'string' && item.openedAt === undefined && item.path === undefined)
  const dirOk = items2.every((item) => !/[\\/]/.test(item.dir) || item.dir.includes('/')) && items2.every((item) => !/[A-Za-z]:/.test(item.dir) && !item.dir.includes('\\') && !item.dir.includes('..'))
  check('/__recent：无 openedAt/path，dir 无盘符/反斜杠/..', shapeOk && dirOk, JSON.stringify(items2.slice(0, 2)))
  check('/__recent：Cache-Control no-store', view.cache === 'no-store', `cache=${view.cache}`)
  const evil = await recentByHostEvil()
  check('/__recent：Host evil → 403', evil.status === 403, `status=${evil.status}`)

  // ---- 3. open-recent：成功 / 旧 seq→STALE / 删除文件→FILE_GONE / 伪造 path→BAD_REQUEST ----
  const before = (await recent(page)).body.items
  const target = before[1]
  const okOpen = await post(page, { v: 1, type: 'open-recent', id: target.id, seq: target.seq })
  check('open-recent：成功打开', okOpen && okOpen.ok === true, JSON.stringify(okOpen))
  const stale = await post(page, { v: 1, type: 'open-recent', id: target.id, seq: target.seq })
  check('open-recent：旧 seq → STALE', stale && stale.error === 'STALE', JSON.stringify(stale))
  const forged = await post(page, { v: 1, type: 'open-recent', id: target.id, seq: target.seq, path: 'C:\\Windows\\win.ini' })
  check('open-recent：伪造 path → BAD_REQUEST', forged && forged.error === 'BAD_REQUEST', JSON.stringify(forged))
  const gone = before[2]
  rmSync(join(DOCS, gone.name))
  const missing = await post(page, { v: 1, type: 'open-recent', id: gone.id, seq: gone.seq })
  check('open-recent：文件已删 → FILE_GONE', missing && missing.error === 'FILE_GONE', JSON.stringify(missing))

  // ---- 4. clear / restore / remove ----
  const clear = await post(page, { v: 1, type: 'recent-clear', id: 'c1' })
  const afterClear = (await recent(page)).body.items
  check('recent-clear：清空', clear && clear.ok === true && afterClear.length === 0, `count=${afterClear.length}`)
  const restore = await post(page, { v: 1, type: 'recent-restore', id: 'r1' })
  const afterRestore = (await recent(page)).body.items
  check('recent-restore：恢复快照', restore && restore.ok === true && afterRestore.length > 0, `count=${afterRestore.length}`)
  const victim = afterRestore[0]
  const removed = await post(page, { v: 1, type: 'recent-remove', id: victim.id, seq: victim.seq })
  const afterRemove = (await recent(page)).body.items
  check('recent-remove：移除一条', removed && removed.ok === true && afterRemove.length === afterRestore.length - 1, `count=${afterRemove.length}`)
  const removeAgain = await post(page, { v: 1, type: 'recent-remove', id: victim.id, seq: victim.seq })
  check('recent-remove：再删 → STALE', removeAgain && removeAgain.error === 'STALE', JSON.stringify(removeAgain))

  // ---- 5. 损坏 JSON → 备份 + 空表 ----
  await browser.close().catch(() => { })
  await waitExit(host, 5000)
  killHosts(); await sleep(400)
  writeFileSync(join(STATE, 'recent.json'), '{not json', 'utf8')
  host = startHost(join(DOCS, 'doc1.md'))
  ;({ browser, page } = await openPage())
  const corrupt = await recent(page)
  const backups = readdirSync(STATE).filter((name) => name.startsWith('recent.json.bad-'))
  const corruptItems = corrupt.body.items || []
  check('损坏 recent.json：备份 + 旧表已丢（只剩 argv 这一条）', backups.length === 1 && corruptItems.length <= 1 && corruptItems.every((item) => item.name === 'doc1.md'), `backups=${backups.length} count=${corruptItems.length}`)

  // ---- 6. 日志：迁移、无完整路径、轮转；TEMP 回退 → volatile ----
  const logText = readFileSync(LOG, 'utf8')
  check('日志：首跑迁移旧日志（host.log.bad 存在 + log migrated）', existsSync(`${LOG}.bad`) && logText.includes('log migrated'), `bad=${existsSync(`${LOG}.bad`)}`)
  const leakLines = logText.split(/\r?\n/).filter((line) => /[A-Za-z]:\\|\/Users\//.test(line)).slice(0, 3)
  const leaked = leakLines.length > 0
  check('日志：无完整路径（无盘符、无用户目录）', !leaked, leaked ? leakLines.join(' || ') : 'clean')
  appendFileSync(LOG, 'x'.repeat(1100000), 'utf8')
  await post(page, { v: 1, type: 'open-recent', id: 'forged', seq: 1, path: 'C:\\secret\\x.md' })
  await sleep(600)
  check('日志：超过 1 MB 轮转为 host.log.1', existsSync(`${LOG}.1`), `rotated=${existsSync(`${LOG}.1`)}`)

  await browser.close().catch(() => { })
  killHosts(); await sleep(400)
  host = startHost(join(DOCS, 'doc1.md'), 'temp')
  ;({ browser, page } = await openPage())
  const volatile = await recent(page)
  check('TEMP 回退：state=volatile', volatile.body.state === 'volatile', `state=${volatile.body.state}`)
  check('TEMP 回退：仍有 items 或空表（不 disabled）', volatile.body.state !== 'disabled', `state=${volatile.body.state}`)

  // ---- 7. argv 打开也写入最近，且能重开 ----
  await browser.close().catch(() => { })
  killHosts(); await sleep(400)
  rmSync(join(STATE, 'recent.json'), { force: true })
  host = startHost(join(DOCS, 'doc1.md'))
  ;({ browser, page } = await openPage())
  await sleep(1800)
  const argvView = await recent(page)
  const argvItems = argvView.body.items || []
  const argvHit = argvItems.find((item) => item.name === 'doc1.md')
  check('argv 打开也写入最近（1 条）', argvItems.length === 1 && !!argvHit, `count=${argvItems.length} names=${argvItems.map((i) => i.name).join(',')}`)
  const argvReopen = await post(page, { v: 1, type: 'open-recent', id: argvHit ? argvHit.id : '', seq: argvHit ? argvHit.seq : -1 })
  check('argv 条目可重开', argvReopen && argvReopen.ok === true, JSON.stringify(argvReopen))

  await browser.close().catch(() => { })
  killHosts()
  console.log(failed === 0 ? 'summary: 21/21 PASS' : `summary: ${failed} FAIL`)
  process.exitCode = failed === 0 ? 0 : 1
}

main().catch((err) => {
  console.error('PROBE-CRASH', err)
  killHosts()
  process.exitCode = 1
})
