// WebView2 宿主冒烟：窗口/渲染、argv 注入、单实例，可选真实文件读写（--fsa）。
// 用法：node scripts/host-smoke.mjs [--fsa]
// 前置：powershell -ExecutionPolicy Bypass -File host/build.ps1 已产出 host/bin/Sidelight.exe。
// 退出码：全部 PASS 为 0，任一 FAIL 为 1。
import { spawn } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { chromium } from 'playwright-core'

const PORT = 9333
const EXE = 'host/bin/Sidelight.exe'
const HOST_LOG = 'host/bin/host.log'
const SHOTS = 'shots/round-01'
const ARGV_FILE = '.tmp/host-argv.md'
const FSA_DIR = '.tmp/host-fs'
const FSA_DIR_ABS = resolve(FSA_DIR)
const FSA_FILE = `${FSA_DIR}/sample.md`
const FSA_MARKER = 'SAVE-MARKER-ORIGINAL'

const wantFsa = process.argv.includes('--fsa')
const results = []
const consoleErrors = []
let navCount = 0

function check(name, ok, detail) {
  results.push({ name, ok, detail })
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`)
}

// 子进程一律 stdio:ignore，避免把宿主/浏览器的句柄挂到调用者的管道上。
function run(cmd, args) {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { stdio: 'ignore', windowsHide: true })
    child.on('exit', (code) => resolve(code))
    child.on('error', () => resolve(-1))
  })
}

function killHosts() {
  return run('powershell', [
    '-NoProfile',
    '-Command',
    'Get-Process Sidelight -ErrorAction SilentlyContinue | Stop-Process -Force',
  ])
}

async function hostCount() {
  const out = '.tmp/host-count.txt'
  await run('powershell', [
    '-NoProfile',
    '-Command',
    `(Get-Process Sidelight -ErrorAction SilentlyContinue | Measure-Object).Count | Set-Content '${out}'`,
  ])
  try {
    return readFileSync(out, 'utf8').trim()
  } catch {
    return 'n/a'
  }
}

function ensureFixtures() {
  mkdirSync(SHOTS, { recursive: true })
  mkdirSync(FSA_DIR, { recursive: true })
  if (!existsSync(ARGV_FILE)) {
    writeFileSync(
      ARGV_FILE,
      '# 宿主 argv 探针\n\nT3-MARKER 引号"单引号\' 反斜杠C:\\Users\\WINDOWS\\AppData\\ 换行: 第二行\n\n- 列表一\n- 列表二\n',
      'utf8',
    )
  }
  if (!existsSync(FSA_FILE)) {
    writeFileSync(FSA_FILE, `# 样本\n\n${FSA_MARKER}\n`, 'utf8')
  }
}

function spawnHost(args) {
  return spawn(EXE, args, {
    env: { ...process.env, WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS: `--remote-debugging-port=${PORT}` },
    stdio: 'ignore',
    windowsHide: false,
  })
}

async function waitForCdp(timeoutMs) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/version`)
      if (res.ok) return true
    } catch {
      // 还没起来
    }
    await new Promise((r) => setTimeout(r, 80))
  }
  return false
}

// 高分屏：P/Invoke GetProcessDpiAwareness 查宿主进程；结果写文件再读，避免管道。
async function probeDpi(pid) {
  const script = `.tmp/dpi-probe.ps1`
  const out = `.tmp/dpi-result.txt`
  writeFileSync(
    script,
    [
      'param([int]$TargetPid, [string]$Out)',
      'Add-Type -TypeDefinition @"',
      'using System;',
      'using System.Runtime.InteropServices;',
      'public static class DpiProbe {',
      '  [DllImport("kernel32.dll", SetLastError=true)] public static extern IntPtr OpenProcess(int access, bool inherit, int pid);',
      '  [DllImport("shcore.dll")] public static extern int GetProcessDpiAwareness(IntPtr h, out int value);',
      '  [DllImport("kernel32.dll")] public static extern bool CloseHandle(IntPtr h);',
      '}',
      '"@',
      '$h = [DpiProbe]::OpenProcess(0x1000, $false, $TargetPid)',
      'if ($h -eq [IntPtr]::Zero) { "OPEN_FAIL" | Set-Content $Out; exit 2 }',
      '$value = 0',
      '$hr = [DpiProbe]::GetProcessDpiAwareness($h, [ref]$value)',
      '[DpiProbe]::CloseHandle($h) | Out-Null',
      'if ($hr -ne 0) { "HR_$hr" | Set-Content $Out; exit 3 }',
      '("" + $value) | Set-Content $Out',
      'exit 0',
    ].join('\r\n'),
    'utf8',
  )
  try { rmSync(out, { force: true }) } catch {}
  await run('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', script, '-TargetPid', String(pid), '-Out', out])
  try { return readFileSync(out, 'utf8').trim() } catch { return 'n/a' }
}
function sha256(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex')
}

async function main() {
  ensureFixtures()
  await killHosts()
  await new Promise((r) => setTimeout(r, 600))
  console.log('cleanup: 开跑前 Sidelight 进程数 =', await hostCount())

  const host = spawnHost([ARGV_FILE])
  const hostExit = new Promise((resolve) => host.on('exit', (code) => resolve(code)))
  let logMark = 0
  try {
    logMark = readFileSync(HOST_LOG, 'utf8').length
  } catch {
    logMark = 0
  }
  await new Promise((r) => setTimeout(r, 1200))
  if (host.exitCode !== null) {
    check('窗口：宿主以主实例启动', false, `启动即退出（exit ${host.exitCode}），说明还有别的实例在跑`)
    await killHosts()
    return
  }
  console.log('host pid =', host.pid)

  // 高分屏（T4）：清单 + WinForms 配置 + 进程感知级别；150%/200% 真机 UNVERIFIED。
  const manifest = readFileSync('host/app.manifest', 'utf8')
  const exeConfig = readFileSync('host/Sidelight.exe.config', 'utf8')
  check(
    'DPI：清单声明 true/pm 与 PerMonitorV2, PerMonitor',
    /ws2005:dpiAware>true\/pm</.test(manifest) && /ws2016:dpiAwareness>PerMonitorV2, PerMonitor</.test(manifest),
  )
  // exe.config 里不声明 WinForms 节（声明后宿主启动会抛「配置系统未能初始化」，方案 B）。
  check(
    'DPI：exe.config 不声明 WinForms 节（避免启动失败）',
    !/<System\.Windows\.Forms\.ApplicationConfigurationSection>/.test(exeConfig),
  )
  const dpi = await probeDpi(host.pid)
  check(
    'DPI：进程感知级别 = 2（Per-Monitor）',
    dpi === '2',
    `GetProcessDpiAwareness=${dpi}；本机 100% 只证明清单生效，150%/200% 真机 UNVERIFIED`,
  )

  if (!(await waitForCdp(30000))) {
    check('窗口：CDP 9333 可用', false, '宿主没起来或没开调试端口')
    await killHosts()
    return
  }

  const browser = await chromium.connectOverCDP(`http://127.0.0.1:${PORT}`)
  let context = browser.contexts()[0]
  let page = context?.pages()[0]
  if (!page) {
    // 慢 runner 上 CDP 先连上、页面后建：等 page 事件，再用 200 ms 轮询兜底
    if (context) {
      page = await context.waitForEvent('page', { timeout: 30000 }).catch(() => undefined)
    }
    const deadline = Date.now() + 30000
    while (!page && Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 200))
      context = browser.contexts()[0] ?? context
      page = context?.pages()[0]
    }
  }
  if (!page) {
    check('窗口：宿主页面已创建', false, 'connectOverCDP 后 30 秒内没有拿到 page')
    await killHosts()
    return
  }
  page.on('framenavigated', (frame) => {
    if (frame === page.mainFrame()) navCount += 1
  })
  const ignoredConsole = []
  page.on('console', (msg) => {
    if (msg.type() !== 'error') return
    const text = msg.text()
    const url = msg.location()?.url ?? ''
    // 宿主 smoke 只忽略这三个预期 404：无 argv 的 /__doc、无草稿的 /__draft、favicon.ico
    let pathname = ''
    try {
      pathname = new URL(url).pathname
    } catch {
      pathname = ''
    }
    const isExpected = pathname === '/__doc' || pathname === '/__draft' || pathname === '/favicon.ico'
    const is404 = text.includes('404')
    if (is404 && isExpected) {
      ignoredConsole.push(url || text)
      return
    }
    consoleErrors.push(url ? `${text} @ ${url}` : text)
  })
  page.on('pageerror', (err) => consoleErrors.push(`pageerror: ${err.message}`))

  let renderOk = true
  try {
    await page.locator('.ProseMirror').first().waitFor({ state: 'visible', timeout: 30000 })
  } catch {
    renderOk = false
  }
  await page.waitForTimeout(1500)
  if (ignoredConsole.length > 0) {
    console.log(`ignored console 404: ${[...new Set(ignoredConsole)].join(', ')}`)
  }

  const title = await page.title()
  check('窗口：document.title 以 Sidelight 结尾（「文件名 — Sidelight」）', title.endsWith('Sidelight'), `document.title=${title}`)
  check(
    '渲染：.ProseMirror 存在、控制台 0 错误',
    renderOk && consoleErrors.length === 0,
    `errors=${consoleErrors.length}${consoleErrors.length ? ' ' + consoleErrors.slice(0, 3).join(' | ') : ''}`,
  )

  // 加速键：AreBrowserAcceleratorKeysEnabled=false 后，Ctrl+K/P/F 应到达页面 keydown
  await page.evaluate(() => {
    window.__slKeys = []
    window.addEventListener(
      'keydown',
      (event) => {
        if ((event.ctrlKey || event.metaKey) && event.key) window.__slKeys.push(event.key.toLowerCase())
      },
      true,
    )
  })
  // 每按一个加速键就立刻关掉它打开的浮层，免得遮罩挡住后面的 FSA 点击
  for (const combo of ['Control+k', 'Control+p', 'Control+f']) {
    await page.keyboard.press(combo)
    await page.waitForTimeout(250)
    await page.keyboard.press('Escape')
    await page.waitForTimeout(250)
    if ((await page.locator('.quick-open-backdrop').count()) > 0) {
      await page.locator('.quick-open-backdrop').click({ position: { x: 2, y: 2 }, force: true })
      await page.waitForTimeout(250)
    }
  }
  const keys = await page.evaluate(() => window.__slKeys ?? [])
  check(
    '加速键：页面 keydown 收到 Ctrl+K/P/F',
    ['k', 'p', 'f'].every((key) => keys.includes(key)),
    `keys=${keys.join(',')}`,
  )

  const argv = await page.evaluate(() => ({
    runs: sessionStorage.getItem('sl:argv-runs'),
    done: sessionStorage.getItem('sl:argv-done'),
    navType: performance.getEntriesByType('navigation')[0]?.type ?? 'n/a',
    body: document.body.innerText,
  }))
  const markerOk = argv.body.includes('T3-MARKER') && argv.body.includes('单引号') && argv.body.includes('第二行')
  // 「恰好重载一次」的强断言放在宿主侧：host.log 里本次启动的 `navigation starting` 必须恰好 2 条
  //（初始导航 + argv 注入触发的 1 次 reload）。它不依赖 Playwright 的接入时机——回环 origin 下
  // 页面约 30–300 ms 就加载完，framenavigated 常常数不到，只作参考。页面侧再补三条不变量：
  // 守卫只跑一次（sl:argv-runs=1）、当前文档是 reload、1.2 s 内 timeOrigin 不变（没有无限重载）。
  let navStarts = -1
  try {
    navStarts = (readFileSync(HOST_LOG, 'utf8').slice(logMark).match(/navigation starting/g) || []).length
  } catch {
    navStarts = -1
  }
  const timeOriginBefore = await page.evaluate(() => performance.timeOrigin)
  await page.waitForTimeout(1200)
  const stable = await page.evaluate((t) => performance.timeOrigin === t, timeOriginBefore)
  check(
    'argv：标记行进正文、恰好重载一次、页面稳定',
    markerOk &&
      argv.runs === '1' &&
      argv.done === '1' &&
      argv.navType === 'reload' &&
      stable &&
      navStarts === 2,
    `marker=${markerOk} runs=${argv.runs} done=${argv.done} navType=${argv.navType} navStarts=${navStarts} stable=${stable} framenavigated=${navCount}`,
  )

  await page.screenshot({ path: `${SHOTS}/t3-window.png` })
  console.log(`shot ${SHOTS}/t3-window.png`)

  // 单实例：第二个进程自己退出（exit 0），窗口仍只有一个
  const second = spawnHost([])
  const secondCode = await new Promise((resolve) => second.on('exit', (code) => resolve(code)))
  await page.waitForTimeout(800)
  const pages = context.pages().filter((p) => !p.isClosed())
  check('单实例：第二进程 exit 0、窗口仍为 1', secondCode === 0 && pages.length === 1, `secondExit=${secondCode} pages=${pages.length}`)

  if (wantFsa) {
    const beforeHash = sha256(FSA_FILE)
    const clickStarted = Date.now()

    await page.getByRole('button', { name: '打开文件夹' }).first().click()
    // 原生文件夹对话框不在页面里：host/send-keys.ps1 等 #32770 对话框出现、置前、粘贴路径、回车两次。
    const sender = spawn(
      'powershell',
      ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', 'host/send-keys.ps1', '-Path', FSA_DIR_ABS],
      { stdio: 'ignore', windowsHide: true },
    )
    const senderCode = await new Promise((resolve) => sender.on('exit', (code) => resolve(code)))
    check('FSA：系统文件夹对话框出现（#32770，msedgewebview2）', senderCode === 0, `senderExit=${senderCode}${senderCode === 2 ? ' 对话框未出现' : ''}`)

    let treeOk = true
    try {
      await page.getByText('sample.md').first().waitFor({ state: 'visible', timeout: 30000 })
    } catch {
      treeOk = false
    }
    if (!treeOk) {
      const state = await page.evaluate(() => ({
        body: document.body.innerText.slice(0, 300),
        errors: window.__slErrors || null,
      }))
      console.log('FSA-DEBUG body=', JSON.stringify(state.body))
      console.log('FSA-DEBUG consoleErrors=', JSON.stringify(consoleErrors.slice(0, 5)))
      await page.screenshot({ path: `${SHOTS}/t3-fsa-fail.png` })
    }
    check('FSA：文件夹对话框返回、文件树读到 sample.md', treeOk, `elapsed=${Date.now() - clickStarted}ms`)

    if (treeOk) {
      await page.getByText('sample.md').first().click()
      await page.waitForTimeout(1500)
      const loaded = await page.evaluate(
        () => (document.querySelector('.ProseMirror')?.innerText ?? '').includes('SAVE-MARKER-ORIGINAL'),
      )

      await page.locator('.ProseMirror').first().click()
      await page.keyboard.press('Control+End')
      await page.keyboard.type(' EDITED-BY-HOST')
      await page.waitForTimeout(500)
      await page.keyboard.press('Control+S')
      // 第一次保存会先弹「保存后文件会有这些差异」，要再点一次「仍然保存」。
      await page.waitForTimeout(1200)
      const saveAnyway = page.getByRole('button', { name: '仍然保存' })
      const prompted = (await saveAnyway.count()) > 0
      if (prompted) await saveAnyway.click()
      await page.waitForTimeout(3000)

      const afterHash = sha256(FSA_FILE)
      const afterText = readFileSync(FSA_FILE, 'utf8')
      const changed = beforeHash !== afterHash
      check(
        'FSA：真实写盘（哈希变化 + 读回改动字符）',
        loaded && changed && afterText.includes('EDITED-BY-HOST'),
        `loaded=${loaded} 保存确认框=${prompted} hash=${beforeHash.slice(0, 8)}→${afterHash.slice(0, 8)} changed=${changed} reread=${afterText.includes('EDITED-BY-HOST')}`,
      )
      await page.screenshot({ path: `${SHOTS}/t3-fsa.png` })
      console.log(`shot ${SHOTS}/t3-fsa.png`)
    }
  } else {
    console.log('note FSA 未测（加 --fsa 跑第 5 条）')
  }

  await browser.close().catch(() => {})
  await killHosts()
  await Promise.race([hostExit, new Promise((r) => setTimeout(r, 4000))])
  const failed = results.filter((r) => !r.ok)
  console.log(`summary: ${results.length - failed.length}/${results.length} PASS`)
  process.exitCode = failed.length === 0 ? 0 : 1
}

main().catch(async (err) => {
  console.error('SMOKE-CRASH', err)
  await killHosts()
  process.exitCode = 1
})
