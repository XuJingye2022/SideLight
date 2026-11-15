// T1 验收：固定回环 origin 的 FCP、跨冷启动持久化、穿越防护、Content-Type。
// 用法：node host/fcp-probe.mjs          六条 PASS
//       node host/fcp-probe.mjs --busy   端口被占时错误窗 + exit 1
// 前置：powershell -ExecutionPolicy Bypass -File host/build.ps1；CDP 9341；改过 host/Program.cs。
import { spawn } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { connect } from 'node:net'
import { join, relative, sep } from 'node:path'
import { chromium } from 'playwright-core'

const PORT = 47821
const CDP_PORT = 9341
const ORIGIN = `http://127.0.0.1:${PORT}`
const EXE = 'host/bin/Sidelight.exe'
const LOG = 'host/bin/host.log'
const WWW = 'host/bin/www'
const TMP = '.tmp/fcp'

const results = []
function check(name, ok, detail) {
  results.push({ name, ok, detail })
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`)
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

function run(cmd, args) {
  return new Promise((res) => {
    const child = spawn(cmd, args, { stdio: 'ignore', windowsHide: true })
    child.on('exit', (code) => res(code))
    child.on('error', () => res(-1))
  })
}

async function killHosts() {
  await run('powershell', ['-NoProfile', '-Command', 'Get-Process Sidelight -ErrorAction SilentlyContinue | Stop-Process -Force'])
  await sleep(600)
}

function logText() {
  try {
    return readFileSync(LOG, 'utf8')
  } catch {
    return ''
  }
}

async function waitLog(pattern, from = 0, timeoutMs = 20000) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    const m = pattern.exec(logText().slice(from))
    if (m) return m[0]
    await sleep(100)
  }
  return null
}

function spawnHost(args, extraEnv = {}) {
  return spawn(EXE, args, {
    env: { ...process.env, WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS: `--remote-debugging-port=${CDP_PORT}`, ...extraEnv },
    stdio: 'ignore',
  })
}

async function waitCdp(timeoutMs = 30000) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    try {
      if ((await fetch(`http://127.0.0.1:${CDP_PORT}/json/version`)).ok) return true
    } catch {
      // 还没起来
    }
    await sleep(100)
  }
  return false
}

async function connectReady() {
  if (!(await waitCdp())) throw new Error('CDP 9341 不可用')
  const browser = await chromium.connectOverCDP(`http://127.0.0.1:${CDP_PORT}`)
  const page = browser.contexts()[0].pages()[0]
  await page.locator('.ProseMirror').first().waitFor({ state: 'visible', timeout: 30000 })
  await sleep(300)
  return { browser, page }
}

async function readFcp(page, timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    try {
      const v = await page.evaluate(() => {
        const e = performance.getEntriesByName('first-contentful-paint')[0]
        return e ? e.startTime : -1
      })
      if (v > 0) return v
    } catch {
      // 导航中
    }
    await sleep(100)
  }
  return -1
}

function rawRequest(pathLine, method = 'GET') {
  return new Promise((resolve, reject) => {
    const socket = connect({ host: '127.0.0.1', port: PORT })
    let buf = ''
    socket.setEncoding('latin1')
    socket.on('connect', () => socket.write(`${method} ${pathLine} HTTP/1.1\r\nHost: 127.0.0.1:${PORT}\r\nConnection: close\r\n\r\n`))
    socket.on('data', (d) => {
      buf += d
    })
    socket.on('end', () => {
      const idx = buf.indexOf('\r\n\r\n')
      const head = idx >= 0 ? buf.slice(0, idx) : buf
      const body = idx >= 0 ? buf.slice(idx + 4) : ''
      const status = parseInt(head.split('\r\n')[0].split(' ')[1] || '0', 10)
      const headers = {}
      for (const line of head.split('\r\n').slice(1)) {
        const i = line.indexOf(':')
        if (i > 0) headers[line.slice(0, i).trim().toLowerCase()] = line.slice(i + 1).trim()
      }
      resolve({ status, headers, body, head })
    })
    socket.on('error', reject)
    socket.setTimeout(8000, () => {
      socket.destroy()
      reject(new Error('timeout'))
    })
  })
}

function findAsset(ext) {
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name)
      if (entry.isDirectory()) {
        const hit = walk(full)
        if (hit) return hit
      } else if (entry.name.toLowerCase().endsWith(ext)) {
        return full
      }
    }
    return null
  }
  const hit = walk(WWW)
  if (!hit) return null
  return '/' + relative(WWW, hit).split(sep).join('/')
}

async function caseBusy() {
  await killHosts()
  // 先占住端口
  const holder = spawn(process.execPath, ['-e', `require('net').createServer().listen(${PORT}, '127.0.0.1', () => setTimeout(() => process.exit(0), 20000))`], {
    stdio: 'ignore',
  })
  await sleep(800)
  writeFileSync(LOG, '')
  const host = spawnHost([])
  const code = await Promise.race([
    new Promise((res) => host.on('exit', (c) => res(c))),
    sleep(15000).then(() => null),
  ])
  const text = logText()
  check(
    'busy：端口 47821 被占用时错误窗 + exit 1，不换端口',
    code === 1 && /loopback port busy 47821/.test(text),
    `exit=${code} busyLog=${/loopback port busy 47821/.test(text)}`,
  )
  holder.kill()
  await killHosts()
}

async function main() {
  if (!existsSync(EXE)) {
    console.error(`缺少 ${EXE}，先跑 host/build.ps1`)
    process.exit(1)
  }
  mkdirSync(TMP, { recursive: true })
  if (process.argv.includes('--busy')) {
    await caseBusy()
    const failed = results.filter((r) => !r.ok)
    console.log(`summary: ${results.length - failed.length}/${results.length} PASS`)
    process.exitCode = failed.length ? 1 : 0
    return
  }

  await killHosts()
  writeFileSync(LOG, '')

  // ---- 第一次冷启动 ----
  const host1 = spawnHost([])
  const { browser: b1, page: p1 } = await connectReady()
  const fcp1 = await readFcp(p1)
  check('FCP 首屏 ≤500ms', fcp1 > 0 && fcp1 <= 500, `fcp=${Math.round(fcp1)}ms`)
  const origin1 = await p1.evaluate(() => location.origin)
  check('origin 两次启动一致（127.0.0.1:47821）', origin1 === ORIGIN, `origin1=${origin1}`)

  // 写设置与一份无句柄草稿
  const settings = JSON.stringify({
    baseUrl: 'https://api.deepseek.com/v1',
    apiKey: 'sk-fcp-probe',
    model: 'deepseek-chat',
    fontSize: 18,
    searchProvider: 'off',
    searchApiKey: '',
    analysisPrompt: 'FCP-PROBE',
  })
  await p1.evaluate((s) => localStorage.setItem('sidelight.settings.v1', s), settings)
  await p1.locator('.ProseMirror').first().click()
  await p1.keyboard.press('Control+End')
  await p1.keyboard.type(' FCP-DRAFT-MARK')
  await sleep(800)
  const draft1 = await p1.evaluate(() => localStorage.getItem('sidelight.doc.v1'))
  await b1.close().catch(() => {})
  await killHosts()

  // ---- 第二次冷启动（不传 argv，前端应从 localStorage 恢复）----
  spawnHost([])
  const { browser: b2, page: p2 } = await connectReady()
  const origin2 = await p2.evaluate(() => location.origin)
  const after = await p2.evaluate(() => ({
    settings: localStorage.getItem('sidelight.settings.v1'),
    doc: localStorage.getItem('sidelight.doc.v1'),
    body: document.body.innerText,
  }))
  check(
    '设置与无句柄草稿跨两次冷启动仍在',
    origin2 === origin1 &&
      after.settings === settings &&
      after.doc === draft1 &&
      after.doc.includes('FCP-DRAFT-MARK') &&
      after.body.includes('FCP-DRAFT-MARK'),
    `originSame=${origin2 === origin1} settingsSame=${after.settings === settings} docSame=${after.doc === draft1}`,
  )

  // ---- 转发 reload 的 FCP ----
  mkdirSync(TMP, { recursive: true })
  writeFileSync(join(TMP, 'forward.md'), '# forward\n\nFORWARD-FCP-MARK\n', 'utf8')
  const mark = logText().length
  const timeOriginBefore = await p2.evaluate(() => performance.timeOrigin)
  spawnHost([join(TMP, 'forward.md')])
  const applied = await waitLog(/forward applied/, mark, 20000)
  await waitLog(/navigation starting/, mark, 20000)
  let fcp2 = -1
  for (let i = 0; i < 200; i++) {
    try {
      const snap = await p2.evaluate(() => ({
        t: performance.timeOrigin,
        f: performance.getEntriesByName('first-contentful-paint')[0]?.startTime ?? -1,
      }))
      if (snap.t !== timeOriginBefore && snap.f > 0) {
        fcp2 = snap.f
        break
      }
    } catch {
      // 导航中
    }
    await sleep(100)
  }
  const appliedName = await p2.evaluate(() => window.__slState && window.__slState.name)
  check(
    'FCP 转发 reload ≤500ms',
    Boolean(applied) && fcp2 > 0 && fcp2 <= 500,
    `fcp=${Math.round(fcp2)}ms applied=${Boolean(applied)} name=${appliedName}`,
  )
  await b2.close().catch(() => {})
  await killHosts()

  // ---- 重启宿主做 HTTP 层检查 ----
  spawnHost([])
  const { browser: b3, page: p3 } = await connectReady()

  // 穿越 4 类
  const traversals = [
    ['dotdot', '/../host.log'],
    ['encoded-dotdot', '/%2e%2e/host.log'],
    ['encoded-slash', '/..%2fhost.log'],
    ['absolute-or-unc', '/C:/Windows/win.ini'],
  ]
  const traversal = []
  for (const [name, pathLine] of traversals) {
    try {
      const res = await rawRequest(pathLine)
      traversal.push({ name, status: res.status, leaked: /\[.+\]|win\.ini|loopback/i.test(res.body) && res.body.length > 0 })
    } catch (err) {
      traversal.push({ name, status: -1, leaked: false, error: String(err) })
    }
  }
  const traversalOk = traversal.every((t) => t.status >= 400 && t.status < 500 && !t.leaked)
  check(
    '穿越防护 4 类（.. / %2e%2e / ..%2f / 绝对或 UNC）',
    traversalOk,
    traversal.map((t) => `${t.name}=${t.status}`).join(' '),
  )

  // Content-Type 与 HEAD
  const js = findAsset('.js')
  const css = findAsset('.css')
  const woff2 = findAsset('.woff2')
  const heads = []
  const expects = [
    ['js', js, 'text/javascript'],
    ['css', css, 'text/css'],
    ['woff2', woff2, 'font/woff2'],
  ]
  let ctOk = Boolean(js && css && woff2)
  for (const [name, url, want] of expects) {
    if (!url) {
      heads.push(`${name}=missing`)
      continue
    }
    const res = await rawRequest(url)
    const got = (res.headers['content-type'] || '').toLowerCase()
    heads.push(`${name}=${got.split(';')[0]}`)
    if (res.status !== 200 || !got.startsWith(want)) ctOk = false
  }
  const headRes = await rawRequest('/index.html', 'HEAD')
  const headOk =
    headRes.status === 200 &&
    parseInt(headRes.headers['content-length'] || '0', 10) > 0 &&
    headRes.body.length === 0
  check(
    'Content-Type 与 HEAD（.js/.css/.woff2；HEAD 200 无 body）',
    ctOk && headOk,
    `${heads.join(' ')} head=${headRes.status} len=${headRes.headers['content-length']} body=${headRes.body.length}`,
  )

  await b3.close().catch(() => {})
  await killHosts()
  void host1

  const failed = results.filter((r) => !r.ok)
  console.log(`summary: ${results.length - failed.length}/${results.length} PASS`)
  process.exitCode = failed.length === 0 ? 0 : 1
}

main().catch(async (err) => {
  console.error('PROBE-CRASH', err)
  await killHosts()
  process.exitCode = 1
})
