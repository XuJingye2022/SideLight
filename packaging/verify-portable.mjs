// T4 验收：解压便携 zip，断言文件齐全，起窗口，CDP 断言编辑器可用、控制台 0 错误，关窗后进程 0。
// 用法：node packaging/verify-portable.mjs
// 前置：powershell -ExecutionPolicy Bypass -File packaging/portable.ps1
import { spawn } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { chromium } from 'playwright-core'

const PORT = 9335
const CHECK = resolve('.tmp/portable-check')
const PACKAGE = join(CHECK, 'Sidelight')
const EXE = join(PACKAGE, 'Sidelight.exe')
const SHOTS = resolve('shots/round-02')

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

async function psValue(script, outName) {
  const out = resolve(`.tmp/${outName}`)
  await run('powershell', ['-NoProfile', '-Command', `${script} | Set-Content -Encoding UTF8 '${out}'`])
  try {
    return readFileSync(out, 'utf8').replace(/^\uFEFF/, '').trim()
  } catch {
    return ''
  }
}

async function waitCdp(timeoutMs = 40000) {
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

const SHOT_PS = `.tmp/t4-shot.ps1`
function ensureShotScript() {
  writeFileSync(
    SHOT_PS,
    `param([string]$Out)
Add-Type -AssemblyName System.Windows.Forms,System.Drawing
Add-Type @"
using System;
using System.Runtime.InteropServices;
public static class RectWin {
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int Left, Top, Right, Bottom; }
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h, out RECT r);
}
"@
$p = Get-Process Sidelight -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowHandle -ne 0 } | Select-Object -First 1
if (-not $p) { exit 2 }
$r = New-Object RectWin+RECT
[void][RectWin]::GetWindowRect($p.MainWindowHandle, [ref]$r)
$w = $r.Right - $r.Left; $h = $r.Bottom - $r.Top
if ($w -le 0 -or $h -le 0) { exit 3 }
$b = New-Object Drawing.Bitmap($w, $h)
$g = [Drawing.Graphics]::FromImage($b)
$g.CopyFromScreen($r.Left, $r.Top, 0, 0, $b.Size)
$b.Save($Out, [Drawing.Imaging.ImageFormat]::Png)
$g.Dispose(); $b.Dispose()
Write-Output "$w x $h"
`,
    'utf8',
  )
}

async function main() {
  const zip = (await psValue('(Get-ChildItem release -Filter *.zip | Sort-Object LastWriteTime -Descending | Select-Object -First 1).FullName', 't4-zip.txt')) || ''
  if (!zip || !existsSync(zip)) {
    console.error('release/ 里没有 zip，先跑 packaging/portable.ps1')
    process.exit(1)
  }
  rmSync(CHECK, { recursive: true, force: true })
  mkdirSync(CHECK, { recursive: true })
  const unzipCode = await run('powershell', ['-NoProfile', '-Command', `Expand-Archive -LiteralPath '${zip}' -DestinationPath '${CHECK}' -Force`])
  check('zip 能解压', unzipCode === 0 && existsSync(EXE), `exit=${unzipCode} zip=${zip}`)

  const entries = await psValue(
    `Add-Type -AssemblyName System.IO.Compression.FileSystem; $z=[IO.Compression.ZipFile]::OpenRead('${zip}'); $names = $z.Entries | ForEach-Object { $_.FullName }; $z.Dispose(); $names`,
    't4-entries.txt',
  )
  const needed = ['Sidelight\\Sidelight.exe', 'Sidelight\\Sidelight.exe.config', 'Sidelight\\sidelight.ico', 'Sidelight\\README.txt', 'Sidelight\\LICENSE', 'Sidelight\\www\\index.html']
  const missing = needed.filter((n) => !entries.includes(n))
  check(
    'zip 条目齐全（exe/config/ico/README/LICENSE/www）',
    missing.length === 0,
    missing.length ? `缺 ${missing.join(', ')}` : `entries=${entries.split(/\r?\n/).filter(Boolean).length}`,
  )
  check(
    'zip 不含 webview2-data / host.log / *.ps1',
    !/webview2-data/.test(entries) && !/host\.log/.test(entries) && !/\.ps1/i.test(entries),
    `data=${/webview2-data/.test(entries)} log=${/host\.log/.test(entries)} ps1=${/\.ps1/i.test(entries)}`,
  )

  if (!existsSync(EXE)) {
    console.log(`summary: fail（解压失败）`)
    process.exitCode = 1
    return
  }

  await run('powershell', ['-NoProfile', '-Command', 'Get-Process Sidelight -ErrorAction SilentlyContinue | Stop-Process -Force'])
  await sleep(500)
  const host = spawn(EXE, [], {
    env: { ...process.env, WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS: `--remote-debugging-port=${PORT}` },
    stdio: 'ignore',
  })
  const exitP = new Promise((res) => host.on('exit', (code) => res(code)))

  let renderOk = false
  const consoleErrors = []
  let browser = null
  if (await waitCdp()) {
    browser = await chromium.connectOverCDP(`http://127.0.0.1:${PORT}`)
    try {
      const page = browser.contexts()[0].pages()[0]
      page.on('console', (msg) => {
        if (msg.type() === 'error' && /sidelight\.local/.test(msg.location()?.url || '')) consoleErrors.push(msg.text())
      })
      page.on('pageerror', (err) => consoleErrors.push(`pageerror: ${err.message}`))
      await page.locator('.ProseMirror').first().waitFor({ state: 'visible', timeout: 40000 })
      await sleep(1200)
      renderOk = (await page.locator('.ProseMirror').count()) === 1
    } finally {
      // 截图要趁窗口还在：先截，再断开 CDP（断开可能带走 WebView2）。
      ensureShotScript()
      mkdirSync(SHOTS, { recursive: true })
      const shot = join(SHOTS, 't4-portable.png')
      let shotCode = await run('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', SHOT_PS, '-Out', shot])
      if (!existsSync(shot)) {
        await sleep(800)
        shotCode = await run('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', SHOT_PS, '-Out', shot])
      }
      check('截图能拍到窗口（含标题栏图标）', existsSync(shot), `shot=${shot} psExit=${shotCode} exists=${existsSync(shot)}`)
      await browser.close().catch(() => {})
    }
  }
  check('解压后 spawn 可用：.ProseMirror=1、控制台 0 错误（只看 sidelight.local）', renderOk && consoleErrors.length === 0, `mirror=${renderOk} errors=${consoleErrors.length}`)

  const aliveBefore = await psValue('(Get-Process Sidelight -ErrorAction SilentlyContinue | Measure-Object).Count', 't4-alive.txt')
  const closed = await psValue(`(Get-Process Sidelight -ErrorAction SilentlyContinue | Select-Object -First 1).CloseMainWindow()`, 't4-close.txt')
  const code = await Promise.race([exitP, sleep(15000).then(() => null)])
  await sleep(1500)
  const left = await psValue('(Get-Process Sidelight -ErrorAction SilentlyContinue | Measure-Object).Count', 't4-left.txt')
  check('关窗后进程 0', aliveBefore === '1' && closed === 'True' && code !== null && left === '0', `aliveBefore=${aliveBefore} close=${closed} exit=${code} left=${left}`)

  const failed = results.filter((r) => !r.ok)
  console.log(`summary: ${results.length - failed.length}/${results.length} PASS`)
  process.exitCode = failed.length === 0 ? 0 : 1
}

main().catch(async (err) => {
  console.error('VERIFY-CRASH', err)
  await run('powershell', ['-NoProfile', '-Command', 'Get-Process Sidelight -ErrorAction SilentlyContinue | Stop-Process -Force'])
  process.exitCode = 1
})
