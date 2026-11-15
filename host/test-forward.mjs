// T1 验收：第二实例转发不丢字（脏确认 + 初始化前排队 + reload 中转发）。
// 用法：node host/test-forward.mjs
// 前置：powershell -ExecutionPolicy Bypass -File host/build.ps1；CDP 9335；本机需有 Playwright。
import { spawn } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { chromium } from 'playwright-core'

const PORT = 9335
const EXE = 'host/bin/Sidelight.exe'
const LOG = 'host/bin/host.log'
const KEYS_LOG = '.tmp/fw-sendkeys.log'
const TMP = '.tmp/fw'
const FILES = {
  first: `${TMP}/first.md`,
  second: `${TMP}/second.md`,
  third: `${TMP}/third.md`,
}

const results = []
function check(name, ok, detail) {
  results.push({ name, ok, detail })
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`)
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

function run(cmd, args) {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { stdio: 'ignore', windowsHide: true })
    child.on('exit', (code) => resolve(code))
    child.on('error', () => resolve(-1))
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

async function waitLog(pattern, from = 0, timeoutMs = 20000) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    const text = logText().slice(from)
    const m = pattern.exec(text)
    if (m) return m[0]
    await sleep(100)
  }
  return null
}

function startHost(args) {
  return spawn(EXE, args, {
    env: { ...process.env, WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS: `--remote-debugging-port=${PORT}` },
    stdio: 'ignore',
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

async function connectReady() {
  if (!(await waitCdp())) throw new Error('CDP 9335 不可用')
  const browser = await chromium.connectOverCDP(`http://127.0.0.1:${PORT}`)
  const page = browser.contexts()[0].pages()[0]
  await page.locator('.ProseMirror').first().waitFor({ state: 'visible', timeout: 30000 })
  for (let i = 0; i < 60; i++) {
    try {
      if (await page.evaluate(() => typeof window.__slState === 'object')) break
    } catch {
      // argv 注入会触发一次 reload，导航中 evaluate 会抛
    }
    await sleep(100)
  }
  return { browser, page }
}

async function readStore(page) {
  try {
    return await page.evaluate(() => {
    try {
      const raw = localStorage.getItem('sidelight.doc.v1')
      if (!raw) return null
      const parsed = JSON.parse(raw)
      return { text: typeof parsed.text === 'string' ? parsed.text : '', name: parsed.name || '', savedAt: parsed.savedAt || 0 }
      } catch {
        return null
      }
    })
  } catch {
    // 导航中执行上下文会被销毁，下一次轮询再读
    return null
  }
}

async function waitStore(page, predicate, timeoutMs = 25000) {
  const deadline = Date.now() + timeoutMs
  let last = null
  while (Date.now() < deadline) {
    last = await readStore(page)
    if (last && predicate(last)) return last
    await sleep(150)
  }
  return null
}

async function sendKeys(choice) {
  const code = await run('powershell', [
    '-NoProfile',
    '-ExecutionPolicy',
    'Bypass',
    '-File',
    'host/send-keys.ps1',
    '-Dialog',
    'YesNo',
    '-Choice',
    choice,
    '-Log',
    KEYS_LOG,
  ])
  return code
}

function ensureFixtures() {
  mkdirSync(TMP, { recursive: true })
  writeFileSync(FILES.first, '# first\n\nFIRST-ONLY\n', 'utf8')
  writeFileSync(FILES.second, '# second\n\nSECOND-ONLY\n', 'utf8')
  writeFileSync(FILES.third, '# third\n\nTHIRD-ONLY\n', 'utf8')
  if (existsSync(KEYS_LOG)) writeFileSync(KEYS_LOG, '')
}

async function typeDirtyMark(page) {
  await page.locator('.ProseMirror').first().click()
  await page.keyboard.press('Control+End')
  await page.keyboard.type(' DIRTY-MARK')
  for (let i = 0; i < 40; i++) {
    const store = await readStore(page)
    if (store && store.text.includes('DIRTY-MARK')) return true
    await sleep(100)
  }
  return false
}

async function caseDirty(choice) {
  const tag = `dirty-${choice.toLowerCase()}`
  await killHosts()
  writeFileSync(LOG, '')
  const host = startHost([FILES.first])
  const { browser, page } = await connectReady()
  const flushOk = await typeDirtyMark(page)
  if (!flushOk) {
    check(`${tag}：本地草稿已写入 DIRTY-MARK`, false, '等不到 localStorage 更新')
    await browser.close().catch(() => {})
    await killHosts()
    return
  }
  const mark = logText().length

  const second = startHost([FILES.second])
  const secondCode = await new Promise((resolve) => second.on('exit', (code) => resolve(code)))

  const dirtyLine = await waitLog(/forward dirty=1/, mark, 20000)
  check(`${tag}：日志出现 forward dirty=1`, Boolean(dirtyLine), dirtyLine || '等不到（页面脏标记没读到？）')
  if (!dirtyLine) {
    await browser.close().catch(() => {})
    await killHosts()
    return
  }

  const keyCode = await sendKeys(choice)
  check(`${tag}：确认框点${choice === 'Yes' ? '「是」' : '「否」'} exit 0`, keyCode === 0, `send-keys exit=${keyCode}`)

  if (choice === 'No') {
    const cancelled = await waitLog(/forward cancelled/, mark, 15000)
    const store = await readStore(page)
    check(
      `${tag}：正文没被替换（localStorage 仍是 first + DIRTY-MARK）`,
      Boolean(cancelled) && store && store.text.includes('DIRTY-MARK') && store.name === 'first.md',
      `cancelled=${Boolean(cancelled)} name=${store && store.name} dirty=${store && store.text.includes('DIRTY-MARK')}`,
    )
  } else {
    const confirmed = await waitLog(/forward confirmed/, mark, 15000)
    const store = await waitStore(page, (s) => s.name === 'second.md' && s.text.includes('SECOND-ONLY'))
    check(
      `${tag}：确认后换成 second（内容 + 名字）`,
      Boolean(confirmed) && Boolean(store),
      `confirmed=${Boolean(confirmed)} storeName=${store && store.name} text=${store && store.text.slice(0, 20)}`,
    )
  }
  check(`${tag}：第二进程 exit 0`, secondCode === 0, `exit=${secondCode}`)

  await browser.close().catch(() => {})
  await killHosts()
  void host
}

async function caseRace() {
  await killHosts()
  writeFileSync(LOG, '')
  const host = startHost([FILES.first])
  await sleep(120)
  const second = startHost([FILES.second])
  const secondCode = await new Promise((resolve) => second.on('exit', (code) => resolve(code)))
  const { browser, page } = await connectReady()
  const store = await waitStore(page, (s) => s.name === 'second.md' && s.text.includes('SECOND-ONLY'), 30000)
  const text = logText()
  check(
    'race：初始化前转发不丢（最终 second，且没问脏）',
    Boolean(store) && !/forward dirty=1/.test(text) && !/forward dirty=unknown/.test(text),
    `storeName=${store && store.name} dirty1=${/forward dirty=1/.test(text)} unknown=${/forward dirty=unknown/.test(text)}`,
  )
  check('race：第二进程 exit 0', secondCode === 0, `exit=${secondCode}`)
  await browser.close().catch(() => {})
  await killHosts()
  void host
}

async function caseReloadRace() {
  await killHosts()
  writeFileSync(LOG, '')
  startHost([FILES.first])
  const { browser, page } = await connectReady()
  const mark = logText().length

  const second = startHost([FILES.second])
  await new Promise((resolve) => second.on('exit', resolve))
  const clean = await waitLog(/forward dirty=0/, mark, 20000)
  const navStart = await waitLog(/navigation starting/, mark, 20000)
  if (!clean || !navStart) {
    check('reload-race：第一次转发触发 reload', false, `dirty0=${Boolean(clean)} navStart=${Boolean(navStart)}`)
    await browser.close().catch(() => {})
    await killHosts()
    return
  }

  // reload 正在飞：这时再发第三个路径，应进队列并在导航完成后重放。
  const third = startHost([FILES.third])
  const thirdCode = await new Promise((resolve) => third.on('exit', (code) => resolve(code)))
  const queued = await waitLog(/forward queued/, mark, 15000)
  const drained = await waitLog(/forward drained/, mark, 20000)
  const store = await waitStore(page, (s) => s.name === 'third.md' && s.text.includes('THIRD-ONLY'), 30000)
  const text = logText().slice(mark)
  check(
    'reload-race：reload 期间转发进队列并最终生效',
    Boolean(queued) && Boolean(drained) && Boolean(store) && !/forward failed/.test(text),
    `queued=${Boolean(queued)} drained=${Boolean(drained)} final=${store && store.name} failed=${/forward failed/.test(text)}`,
  )
  check('reload-race：第三进程 exit 0', thirdCode === 0, `exit=${thirdCode}`)
  await browser.close().catch(() => {})
  await killHosts()
}

async function main() {
  ensureFixtures()
  if (!existsSync(EXE)) {
    console.error(`缺少 ${EXE}，先跑 powershell -ExecutionPolicy Bypass -File host/build.ps1`)
    process.exit(1)
  }
  await caseDirty('No')
  await caseDirty('Yes')
  await caseRace()
  await caseReloadRace()

  const failed = results.filter((r) => !r.ok)
  console.log(`summary: ${results.length - failed.length}/${results.length} PASS`)
  process.exitCode = failed.length === 0 ? 0 : 1
}

main().catch(async (err) => {
  console.error('TEST-CRASH', err)
  await killHosts()
  process.exitCode = 1
})
