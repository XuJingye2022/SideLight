// T2 验收：长路径、启动失败可见、数据目录回退。四例。
// 用法：node host/test-failure.mjs
// 前置：powershell -ExecutionPolicy Bypass -File host/build.ps1；CDP 9335；www 已就位。
import { spawn } from 'node:child_process'
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { chromium } from 'playwright-core'

const PORT = 9335
const BIN = resolve('host/bin')
const EXE = join(BIN, 'Sidelight.exe')
const COPY_FILES = [
  'Sidelight.exe',
  'Microsoft.Web.WebView2.Core.dll',
  'Microsoft.Web.WebView2.WinForms.dll',
  'WebView2Loader.dll',
  'Sidelight.exe.config',
]

const results = []
function check(name, ok, detail) {
  results.push({ name, ok, detail })
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`)
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

function run(cmd, args, opts = {}) {
  return new Promise((res) => {
    const child = spawn(cmd, args, { stdio: 'ignore', windowsHide: true, ...opts })
    child.on('exit', (code) => res(code))
    child.on('error', () => res(-1))
  })
}

async function killHosts() {
  await run('powershell', ['-NoProfile', '-Command', 'Get-Process Sidelight -ErrorAction SilentlyContinue | Stop-Process -Force'])
  await sleep(500)
}

function logText(dir = BIN) {
  try {
    return readFileSync(join(dir, 'host.log'), 'utf8')
  } catch {
    return ''
  }
}

async function waitLog(re, dir = BIN, from = 0, timeoutMs = 20000) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    const m = re.exec(logText(dir).slice(from))
    if (m) return m[0]
    await sleep(100)
  }
  return null
}

async function psValue(script, outName) {
  const out = resolve(`.tmp/${outName}`)
  await run('powershell', ['-NoProfile', '-Command', `${script} | Set-Content -Encoding UTF8 '${out}'`])
  try {
    return readFileSync(out, 'utf8').replace(/^\uFEFF/, '').trim()
  } catch {
    return ''
  }
}

function windowTitle(pid) {
  return psValue(`(Get-Process -Id ${pid} -ErrorAction SilentlyContinue).MainWindowTitle`, 't2-title.txt')
}

function closeWindow(pid) {
  return psValue(`(Get-Process -Id ${pid} -ErrorAction SilentlyContinue).CloseMainWindow()`, 't2-close.txt')
}

function waitExit(child, timeoutMs) {
  return new Promise((res) => {
    const timer = setTimeout(() => res(null), timeoutMs)
    child.on('exit', (code) => {
      clearTimeout(timer)
      res(code)
    })
  })
}

async function waitCdp(timeoutMs = 30000) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    try {
      if ((await fetch(`http://127.0.0.1:${PORT}/json/version`)).ok) return true
    } catch {
      // 还没起来
    }
    await sleep(100)
  }
  return false
}

const PROBE_PS = '.tmp/t2-probe.ps1'

function ensureProbeScript() {
  writeFileSync(
    PROBE_PS,
    `param([int]$TargetPid, [string]$Out)
Add-Type @"
using System;
using System.Collections.Generic;
using System.Runtime.InteropServices;
using System.Text;
public static class ErrWin {
  public delegate bool EnumProc(IntPtr h, IntPtr l);
  [DllImport("user32.dll")] public static extern bool EnumChildWindows(IntPtr p, EnumProc cb, IntPtr l);
  [DllImport("user32.dll", CharSet = CharSet.Unicode)] public static extern int GetWindowText(IntPtr h, StringBuilder s, int n);
  public static List<string> Texts(IntPtr parent) {
    List<string> list = new List<string>();
    EnumChildWindows(parent, delegate(IntPtr h, IntPtr l) {
      StringBuilder t = new StringBuilder(512);
      GetWindowText(h, t, 512);
      if (t.Length > 0) list.Add(t.ToString());
      return true;
    }, IntPtr.Zero);
    return list;
  }
}
"@
$deadline = (Get-Date).AddSeconds(10)
$proc = $null
while ((Get-Date) -lt $deadline) {
  $proc = Get-Process -Id $TargetPid -ErrorAction SilentlyContinue
  if ($proc -and $proc.MainWindowHandle -ne 0) { break }
  Start-Sleep -Milliseconds 100
}
$lines = New-Object System.Collections.Generic.List[string]
if (-not $proc -or $proc.MainWindowHandle -eq 0) { $lines.Add('NO-WINDOW') }
else {
  $lines.Add('title=' + $proc.MainWindowTitle)
  foreach ($t in [ErrWin]::Texts($proc.MainWindowHandle)) { $lines.Add('child=' + $t) }
  [void]$proc.CloseMainWindow()
}
[IO.File]::WriteAllLines($Out, $lines, (New-Object Text.UTF8Encoding($false)))
`,
    'utf8',
  )
}

async function probeErrorForm(pid) {
  ensureProbeScript()
  const out = resolve(`.tmp/t2-form-${pid}.txt`)
  await run('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', PROBE_PS, '-TargetPid', String(pid), '-Out', out])
  let lines = []
  try {
    lines = readFileSync(out, 'utf8').split(/\r?\n/)
  } catch {
    lines = []
  }
  const title = (lines.find((l) => l.startsWith('title=')) || 'title=').slice(6)
  const body = lines
    .filter((l) => l.startsWith('child='))
    .map((l) => l.slice(6))
    .join('\n')
  return { title, body }
}

function startHost(args = [], env = {}) {
  return spawn(EXE, args, {
    env: {
      ...process.env,
      WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS: `--remote-debugging-port=${PORT}`,
      ...env,
    },
    stdio: 'ignore',
  })
}

async function bodyText() {
  if (!(await waitCdp())) return ''
  const browser = await chromium.connectOverCDP(`http://127.0.0.1:${PORT}`)
  try {
    const page = browser.contexts()[0].pages()[0]
    await page.locator('.ProseMirror').first().waitFor({ state: 'visible', timeout: 30000 })
    await sleep(600)
    return await page.evaluate(() => document.body.innerText)
  } finally {
    await browser.close().catch(() => {})
  }
}

// 造一条 >=309 字符的绝对路径，写一行唯一标记。
function makeLongFixture() {
  const base = resolve('.tmp/t2long')
  const segments = []
  let full = base
  let i = 0
  while ((join(full, ...segments, 'long.md')).length < 309) {
    segments.push(`dir-${String(i).padStart(2, '0')}-xxxxx`)
    i += 1
  }
  const plain = join(full, ...segments, 'long.md')
  mkdirSync(dirname('\\\\?\\' + plain), { recursive: true })
  writeFileSync('\\\\?\\' + plain, '# long\n\nLONG-PATH-MARKER\n', 'utf8')
  return plain
}

async function caseLongPath(plainPath) {
  for (const [tag, argvPath] of [
    ['longpath-plain', plainPath],
    ['longpath-prefixed', '\\\\?\\' + plainPath],
  ]) {
    await killHosts()
    const from = logText().length
    const host = startHost([argvPath])
    const body = await bodyText()
    await sleep(300)
    const text = logText().slice(from)
    check(
      `${tag}：300+ 字符路径能打开`,
      body.includes('LONG-PATH-MARKER') && !/argv file missing/.test(text) && !/open failed/.test(text),
      `len=${argvPath.length} marker=${body.includes('LONG-PATH-MARKER')} missing=${/argv file missing/.test(text)} failed=${/open failed/.test(text)}`,
    )
    try { host.kill() } catch {}
    await killHosts()
  }
}

function copyHostTo(dir, withWww) {
  rmSync(dir, { recursive: true, force: true })
  mkdirSync(dir, { recursive: true })
  for (const f of COPY_FILES) copyFileSync(join(BIN, f), join(dir, f))
  if (withWww) {
    mkdirSync(join(dir, 'www'), { recursive: true })
    copyDir(join(BIN, 'www'), join(dir, 'www'))
  }
}

function copyDir(src, dst) {
  mkdirSync(dst, { recursive: true })
  for (const entry of readdirSync(src, { withFileTypes: true })) {
    const s = join(src, entry.name)
    const d = join(dst, entry.name)
    if (entry.isDirectory()) copyDir(s, d)
    else copyFileSync(s, d)
  }
}

import { readdirSync } from 'node:fs'

async function caseNoWww() {
  await killHosts()
  const dir = resolve('.tmp/t2-nowww')
  copyHostTo(dir, false)
  const host = spawn(join(dir, 'Sidelight.exe'), [], {
    env: { ...process.env, WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS: `--remote-debugging-port=${PORT}` },
    stdio: 'ignore',
  })
  const exitP = waitExit(host, 20000)
  const probe = await probeErrorForm(host.pid)
  check('nowww：标题是「Sidelight 启动失败」', probe.title === 'Sidelight 启动失败', `title=[${probe.title}]`)
  const code = await exitP
  const text = logText(dir)
  check(
    'nowww：主动关窗后 exit 1、日志说重新解压',
    code === 1 && /重新解压/.test(text),
    `exit=${code} cue=${/重新解压/.test(text)}`,
  )
}

async function caseAllDataDirsFail() {
  await killHosts()
  const dir = resolve('.tmp/t2-nodata')
  rmSync(dir, { recursive: true, force: true })
  const appDir = join(dir, 'app')
  copyHostTo(appDir, true)
  // 三级全失败：环境目录指向一个文件之下（CreateDirectory 必失败），
  // exe 同级 webview2-data 位置先放一个同名文件（同样必失败）。
  writeFileSync(join(dir, 'block'), 'x')
  writeFileSync(join(appDir, 'webview2-data'), 'block')
  const host = spawn(join(appDir, 'Sidelight.exe'), [], {
    env: {
      ...process.env,
      LOCALAPPDATA: join(dir, 'block', 'localappdata'),
      TEMP: join(dir, 'block', 'temp'),
      TMP: join(dir, 'block', 'temp'),
    },
    stdio: 'ignore',
  })
  const exitP = waitExit(host, 20000)
  const probe = await probeErrorForm(host.pid)
  const code = await exitP
  const text = logText(appDir)
  check(
    'datadir-fail：三级全失败时标题「Sidelight 启动失败」、正文说无法创建数据目录、exit 1',
    probe.title === 'Sidelight 启动失败' && probe.body.includes('无法创建 WebView2 数据目录') && code === 1,
    `title=[${probe.title}] body=${probe.body.includes('无法创建 WebView2 数据目录')} exit=${code} failed=${/data dir FAILED/.test(text)}`,
  )
}

async function caseDataDir() {
  await killHosts()
  const from = logText().length
  const host = startHost([])
  const line = await waitLog(/data dir=.*/, BIN, from, 20000)
  const body = await bodyText()
  check('datadir：日志有 data dir= 且编辑器可用', Boolean(line) && body.includes('Sidelight'), line || '缺 data dir=')
  try { host.kill() } catch {}
  await killHosts()
}

async function main() {
  for (const f of COPY_FILES) {
    if (!existsSync(join(BIN, f))) {
      console.error(`缺少 host/bin/${f}，先跑 host/build.ps1`)
      process.exit(1)
    }
  }
  const longPath = makeLongFixture()
  console.log(`long fixture len=${longPath.length}`)
  await caseLongPath(longPath)
  await caseNoWww()
  await caseAllDataDirsFail()
  await caseDataDir()
  const failed = results.filter((r) => !r.ok)
  console.log(`summary: ${results.length - failed.length}/${results.length} PASS`)
  process.exitCode = failed.length === 0 ? 0 : 1
}

main().catch(async (err) => {
  console.error('TEST-CRASH', err)
  await killHosts()
  process.exitCode = 1
})
