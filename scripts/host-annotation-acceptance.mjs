// 宿主批注端点验收：GET /__annotations 与 annotations-save。
// 用法：node scripts/host-annotation-acceptance.mjs
// 前置：powershell -ExecutionPolicy Bypass -File host/build.ps1 已产出 host/bin/Sidelight.exe，dist/ 存在。
// 退出码：全部 PASS 为 0，任一 FAIL 为 1。
import { spawn } from 'node:child_process'
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { chromium } from 'playwright-core'

const CDP = 9340
const BASE = 'http://127.0.0.1:47821'
const ROOT = resolve('.tmp/host-annot')
const HOSTDIR = join(ROOT, 'host')
const SAMPLES = join(ROOT, 'samples')
const EXE = join(HOSTDIR, 'Sidelight.exe')
const DOC = join(SAMPLES, 'notes.md')
const ANNOT_DIR = join(SAMPLES, '.sidelight', 'annotations')
const ANNOT_FILE = join(ANNOT_DIR, 'notes.json')

const results = []
const unverified = []
function check(name, ok, detail) {
  results.push({ name, ok })
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`)
}
function skip(name, detail) {
  unverified.push(name)
  console.log(`UNVERIFIED ${name}${detail ? ` — ${detail}` : ''}`)
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

function prepare() {
  rmSync(ROOT, { recursive: true, force: true })
  mkdirSync(SAMPLES, { recursive: true })
  cpSync('host/bin', HOSTDIR, {
    recursive: true,
    filter: (src) =>
      !src.includes('webview2-data') && !src.endsWith('host.log') && !src.includes(join('host/bin', 'www')),
  })
  rmSync(join(HOSTDIR, 'www'), { recursive: true, force: true })
  cpSync('dist', join(HOSTDIR, 'www'), { recursive: true })
  writeFileSync(DOC, '# 批注样本\n\n正文里有一个引用[^1]。\n\n[^1]: 脚注。\n', 'utf8')
  mkdirSync(ANNOT_DIR, { recursive: true })
  const payload = JSON.stringify({
    v: 2,
    annotations: [{ id: 'a1', quote: '正文', note: '测试批注' }],
    notes: [],
  })
  writeFileSync(ANNOT_FILE, payload, 'utf8')
  return payload
}

function spawnHost(args) {
  return spawn(EXE, args, {
    env: { ...process.env, WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS: `--remote-debugging-port=${CDP}` },
    stdio: 'ignore',
    windowsHide: false,
  })
}

async function waitForCdp(timeoutMs) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`http://127.0.0.1:${CDP}/json/version`)
      if (res.ok) return true
    } catch {
      // 还没起来
    }
    await sleep(100)
  }
  return false
}

async function getAnnotations() {
  try {
    const res = await fetch(`${BASE}/__annotations`)
    const text = await res.text()
    return { status: res.status, text }
  } catch (err) {
    return { status: 0, text: String(err) }
  }
}

// 页面里 post 一条消息并等 reply（宿主 → 页面用 chrome.webview 的 message 事件）
function postAndWait(page, message) {
  return page.evaluate(
    ({ message, type }) =>
      new Promise((resolve) => {
        const webview = window.chrome?.webview
        if (!webview) {
          resolve({ noBridge: true })
          return
        }
        const handler = (event) => {
          const data = event.data
          if (data && data.type === type) {
            webview.removeEventListener('message', handler)
            resolve(data)
          }
        }
        webview.addEventListener('message', handler)
        webview.postMessage(message)
        setTimeout(() => {
          webview.removeEventListener('message', handler)
          resolve({ timeout: true })
        }, 8000)
      }),
    { message, type: message.type === 'annotations-save' ? 'annotations-save-result' : 'unknown' },
  )
}

async function main() {
  const initialPayload = prepare()
  await killHosts()

  const host = spawnHost([DOC])
  const hostExit = new Promise((r) => host.on('exit', (code) => r(code)))
  await sleep(1500)
  if (host.exitCode !== null) {
    check('宿主启动', false, `启动即退出（exit ${host.exitCode}）`)
    await killHosts()
    return
  }

  if (!(await waitForCdp(30000))) {
    check('宿主 CDP 可用', false, '没起来或没开调试端口')
    process.exitCode = 1
    await killHosts()
    return
  }

  const browser = await chromium.connectOverCDP(`http://127.0.0.1:${CDP}`)
  const context = browser.contexts()[0]
  let page = context?.pages()[0]
  const deadline = Date.now() + 30000
  while (!page && Date.now() < deadline) {
    await sleep(200)
    page = context?.pages()[0]
  }
  if (!page) {
    check('宿主页面已创建', false, '没有拿到 page')
    process.exitCode = 1
    await killHosts()
    return
  }
  await page.locator('.ProseMirror').first().waitFor({ state: 'visible', timeout: 30000 }).catch(() => {})

  // 1) 有缓存：200，text 与文件一致
  let got = await getAnnotations()
  let parsed = null
  try {
    parsed = JSON.parse(got.text)
  } catch {
    parsed = null
  }
  // 页面加载后可能已经用 annotations-save 迁移过格式，所以和当前磁盘内容比，而不是和初始 fixture 比
  const diskNow = existsSync(ANNOT_FILE) ? readFileSync(ANNOT_FILE, 'utf8') : null
  check(
    'GET /__annotations 200 且 text 与磁盘文件一致',
    got.status === 200 && parsed?.exists === true && parsed?.text === diskNow,
    `status=${got.status} bytes=${Buffer.byteLength(got.text ?? '')} disk=${diskNow === null ? 'missing' : Buffer.byteLength(diskNow)}`,
  )

  // 2) 无缓存：200 + 空 v2 store（页面加载会请求它，不用 404）
  rmSync(ANNOT_FILE, { force: true })
  got = await getAnnotations()
  let emptyStore = null
  try {
    emptyStore = JSON.parse(got.text)
  } catch {
    emptyStore = null
  }
  check(
    '无缓存文件时 GET /__annotations 200 + 空 v2 store',
    got.status === 200 && emptyStore?.v === 2 && Array.isArray(emptyStore?.annotations) && emptyStore.annotations.length === 0 && Array.isArray(emptyStore?.notes),
    `status=${got.status} body=${got.text.slice(0, 80)}`,
  )

  // 3) annotations-save 落盘且内容一致
  const payload = JSON.stringify({ v: 2, annotations: [{ id: 'b1', quote: '正文', note: '新批注' }], notes: [] })
  const saved = await postAndWait(page, { v: 1, type: 'annotations-save', id: 't-save-1', text: payload })
  const onDisk = existsSync(ANNOT_FILE) ? readFileSync(ANNOT_FILE, 'utf8') : null
  check(
    'annotations-save 回 ok、落盘内容一致',
    saved?.ok === true && saved?.id === 't-save-1' && onDisk === payload,
    `reply=${JSON.stringify(saved)} onDisk=${onDisk === payload}`,
  )

  // 4) 伪造路径被拒，且不落盘
  const beforeForge = readFileSync(ANNOT_FILE, 'utf8')
  const forged = await postAndWait(page, {
    v: 1,
    type: 'annotations-save',
    id: 't-forge',
    text: 'forged',
    path: 'C:\\evil\\x.json',
  })
  const afterForge = readFileSync(ANNOT_FILE, 'utf8')
  check(
    '伪造 path 被拒（BAD_REQUEST）且不写盘',
    forged?.ok === false && forged?.error === 'BAD_REQUEST' && afterForge === beforeForge,
    `reply=${JSON.stringify(forged)}`,
  )

  // 5) 只读文件 → READONLY，内容不变
  try {
    const { chmodSync } = await import('node:fs')
    chmodSync(ANNOT_FILE, 0o444)
    const readonly = await postAndWait(page, { v: 1, type: 'annotations-save', id: 't-ro', text: '{"v":2,"annotations":[],"notes":[]}' })
    const afterRo = readFileSync(ANNOT_FILE, 'utf8')
    check('只读文件 → READONLY，内容不变', readonly?.ok === false && readonly?.error === 'READONLY' && afterRo === beforeForge, `reply=${JSON.stringify(readonly)}`)
    chmodSync(ANNOT_FILE, 0o666)
  } catch (err) {
    skip('只读文件 → READONLY', `chmod 失败：${String(err)}`)
  }

  // 6) 超过 512 KiB → TOO_LARGE
  const huge = 'x'.repeat(513 * 1024)
  const tooLarge = await postAndWait(page, { v: 1, type: 'annotations-save', id: 't-large', text: huge })
  check('超过 512 KiB → TOO_LARGE', tooLarge?.ok === false && tooLarge?.error === 'TOO_LARGE', `reply=${JSON.stringify(tooLarge)}`)

  await browser.close().catch(() => {})
  await killHosts()
  await Promise.race([hostExit, sleep(4000)])

  const failed = results.filter((r) => !r.ok)
  console.log(`summary: ${results.length - failed.length}/${results.length} PASS${unverified.length ? `, ${unverified.length} UNVERIFIED` : ''}`)
  process.exitCode = failed.length === 0 ? 0 : 1
}

main().catch(async (err) => {
  console.error('ANNOT-CRASH', err)
  await killHosts()
  process.exitCode = 1
})
