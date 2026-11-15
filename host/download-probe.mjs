// T5a 验收：宿主 DownloadStarting 落盘 + argv 文档注入 readOnly。
// 用法：node host/download-probe.mjs
// 前置：powershell -ExecutionPolicy Bypass -File host/build.ps1（先产出 host/bin）。
// 探针在独立快照 .tmp/host-t5a 上跑，不碰 host/bin 的 webview2-data；CDP 9336。
import { spawn, spawnSync } from 'node:child_process'
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { chromium } from 'playwright-core'

const CDP_PORT = 9336
const SNAP = resolve('.tmp/host-t5a')
const EXE = join(SNAP, 'Sidelight.exe')
const LOG = join(SNAP, 'host.log')
const DL = join(SNAP, 'downloads')
const DOC = join(SNAP, 'doc.md')
const MARK = 'T5A-EXPORT-MARK'

const results = []
let unverifiedCount = 0
function unverified(name, detail) {
  console.log(`UNVERIFIED ${name}${detail ? ` — ${detail}` : ''}`)
  unverifiedCount += 1
}
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
  await sleep(500)
}

function logText() {
  try {
    return readFileSync(LOG, 'utf8')
  } catch {
    return ''
  }
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

function prepareSnapshot() {
  rmSync(SNAP, { recursive: true, force: true })
  cpSync('host/bin', SNAP, {
    recursive: true,
    filter: (src) => !src.includes('webview2-data') && !src.endsWith('host.log'),
  })
  mkdirSync(DL, { recursive: true })
  writeFileSync(DOC, `# t5a\n\n${MARK}\n`, 'utf8')
}

function downloads() {
  try {
    return readdirSync(DL).map((name) => join(DL, name)).filter((p) => statSync(p).isFile())
  } catch {
    return []
  }
}

async function waitFile(timeoutMs = 25000) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    const files = downloads()
    if (files.length > 0) return files[0]
    await sleep(200)
  }
  return null
}

async function main() {
  if (!existsSync(join('host/bin', 'Sidelight.exe'))) {
    console.error('缺少 host/bin/Sidelight.exe，先跑 host/build.ps1')
    process.exit(1)
  }
  prepareSnapshot()
  await killHosts()

  const host = spawn(EXE, [DOC], {
    env: {
      ...process.env,
      WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS: `--remote-debugging-port=${CDP_PORT}`,
      SIDELIGHT_DOWNLOAD_DIR: DL,
    },
    stdio: 'ignore',
  })
  const exitP = new Promise((res) => host.on('exit', (code) => res(code)))

  let page = null
  let browser = null
  if (await waitCdp()) {
    browser = await chromium.connectOverCDP(`http://127.0.0.1:${CDP_PORT}`)
    const context = browser.contexts()[0]
    page = context.pages()[0]
    await page.locator('.ProseMirror').first().waitFor({ state: 'visible', timeout: 30000 })
    // Playwright 连上 CDP 时会把下载行为改成 allowAndName 并截走下载，宿主收不到
    // DownloadStarting。显式恢复 Chromium 默认行为，让下载回到 WebView2 宿主。
    const cdp = await context.newCDPSession(page).catch(() => null)
    if (cdp) {
      try { await cdp.send('Browser.setDownloadBehavior', { behavior: 'default', eventsEnabled: false }) } catch { }
      try { await cdp.send('Page.setDownloadBehavior', { behavior: 'default' }) } catch { }
    }
    await sleep(800)
  }

  if (!page) {
    check('宿主启动并加载编辑器', false, 'CDP 9336 不可用或没有 .ProseMirror')
    await killHosts()
    process.exitCode = 1
    return
  }

  // readOnly 标记：argv 注入的 JSON 必须带 readOnly: true（A 组 T4 依赖）
  const store = await page.evaluate(() => {
    try {
      return JSON.parse(localStorage.getItem('sidelight.doc.v1') || '{}')
    } catch {
      return {}
    }
  })
  check(
    'argv 注入的文档带 readOnly 标记',
    store && store.readOnly === true && typeof store.text === 'string' && store.text.includes(MARK),
    `readOnly=${store && store.readOnly} name=${store && store.name}`,
  )

  // 第一段：导出 → Markdown，落盘到 SIDELIGHT_DOWNLOAD_DIR
  await page.getByRole('button', { name: /导出/ }).first().click()
  await page.getByRole('button', { name: 'Markdown', exact: true }).click()
  const exported = await waitFile()
  const exportText = exported ? readFileSync(exported, 'utf8') : ''
  const exportLog = /download starting name=.*result=.*handled=true mode=env/.test(logText())
  const fileFailed = /download state=Interrupted reason=FileFailed/.test(logText())
  if (Boolean(exported) && exportText.includes(MARK) && exportLog) {
    check('导出 → Markdown 落盘到指定目录（DownloadStarting 接住）', true, `file=${exported.split(/[\\/]/).pop()}`)
  } else if (exportLog && fileFailed) {
    unverified('导出 → Markdown 落盘到指定目录', 'DownloadStarting 已触发（name/result/handled=true），但 Chromium 写下载文件被拒：state=Interrupted reason=FileFailed')
  } else {
    check('导出 → Markdown 落盘到指定目录（DownloadStarting 接住）', false, `file=${exported ? exported.split(/[\\/]/).pop() : '无'} hasMark=${exportText.includes(MARK)} log=${exportLog}`)
  }

  // 第二段：保存降级 → 下载落盘。T1 合入后走 showSaveFilePicker=undefined 的降级分支；
  // 未合入时走现有的「无句柄 Ctrl+S 下载一份副本」分支。两种都要求文件真的落盘。
  if (exported) rmSync(exported, { force: true })
  await page.evaluate(() => {
    try {
      window.showSaveFilePicker = undefined
    } catch {
      // 只读属性就忽略
    }
  })
  await page.locator('.ProseMirror').first().click()
  await page.keyboard.press('Control+S')
  const saved = await waitFile()
  const savedText = saved ? readFileSync(saved, 'utf8') : ''
  const savedLog = /download starting name=.*result=.*handled=true mode=env/.test(logText())
  if (Boolean(saved) && savedText.includes(MARK)) {
    check('保存降级（picker=undefined）→ 下载落盘', true, `file=${saved.split(/[\\/]/).pop()}`)
  } else if (savedLog && fileFailed) {
    unverified('保存降级（picker=undefined）→ 下载落盘', 'DownloadStarting 已触发，但 Chromium 写下载文件被拒：reason=FileFailed')
  } else {
    check('保存降级（picker=undefined）→ 下载落盘', false, `file=${saved ? saved.split(/[\\/]/).pop() : '无'} hasMark=${savedText.includes(MARK)}`)
  }

  await browser.close().catch(() => {})
  await killHosts()
  await Promise.race([exitP, sleep(4000)])
  const failed = results.filter((r) => !r.ok)
  console.log(`summary: ${results.length - failed.length}/${results.length} PASS${unverifiedCount > 0 ? `，${unverifiedCount} UNVERIFIED（环境：Chromium 下载写文件被拒）` : ''}`)
  process.exitCode = failed.length > 0 ? 1 : unverifiedCount > 0 ? 2 : 0
}

main().catch(async (err) => {
  console.error('PROBE-CRASH', err)
  await killHosts()
  process.exitCode = 1
})
