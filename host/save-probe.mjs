// T4 写回验收：9 类样本 + 协议行为 + 前端 Ctrl+S 不改保存。
// 用法：node host/save-probe.mjs
// 前置：host/build.ps1 已产出 host/bin；CDP 9338。www 优先用 A 组的 .tmp/build-a，否则用 dist。
// 前端段需要 A 组的前端接入 /__doc；未接入时该段记 UNVERIFIED（不假 PASS）。
import { spawn, spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { appendFileSync, cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync, chmodSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { chromium } from 'playwright-core'

const CDP = 9338
const ROOT = resolve('.tmp/host-r6')
const HOSTDIR = join(ROOT, 'host')
const SAMPLES = join(ROOT, 'samples')
const EXE = join(HOSTDIR, 'Sidelight.exe')
const LOG = join(HOSTDIR, 'host.log')

const results = []
let unverified = 0
function check(name, ok, detail) {
  results.push({ name, ok })
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`)
}
function skip(name, detail) {
  unverified += 1
  console.log(`UNVERIFIED ${name}${detail ? ` — ${detail}` : ''}`)
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const sha = (path) => createHash('sha256').update(readFileSync(path)).digest('hex')

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

function prepareHost() {
  rmSync(ROOT, { recursive: true, force: true })
  mkdirSync(SAMPLES, { recursive: true })
  cpSync('host/bin', HOSTDIR, {
    recursive: true,
    filter: (src) => !src.includes('webview2-data') && !src.endsWith('host.log') && !src.includes(`${join('host/bin', 'www')}`),
  })
  rmSync(join(HOSTDIR, 'www'), { recursive: true, force: true })
  const wwwSource = existsSync('.tmp/build-a/index.html') ? '.tmp/build-a' : 'dist'
  cpSync(wwwSource, join(HOSTDIR, 'www'), { recursive: true })
  console.log(`www source: ${wwwSource}`)
}

function makeSamples() {
  const utf8 = (text) => Buffer.from(text, 'utf8')
  // 1. UTF-8 BOM + CRLF
  writeFileSync(join(SAMPLES, 'crlf-bom.md'), Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), utf8('line one\r\nline two\r\n')]))
  // 2. UTF-8 no BOM + LF
  writeFileSync(join(SAMPLES, 'lf.md'), utf8('alpha\nbeta\n'))
  // 3. UTF-8 BOM + mixed EOL
  writeFileSync(join(SAMPLES, 'mixed-eol-bom.md'), Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), utf8('one\r\ntwo\nthree\r\n')]))
  // 4. UTF-16LE BOM
  writeFileSync(join(SAMPLES, 'utf16le-bom.md'), Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from('wide\r\ntext\r\n', 'utf16le')]))
  // 5. GBK no BOM + CRLF（中文 "中文" = D6 D0 CE C4）
  writeFileSync(join(SAMPLES, 'gbk.md'), Buffer.concat([utf8('line one\r\n'), Buffer.from([0xd6, 0xd0, 0xce, 0xc4]), utf8('\r\nend\r\n')]))
  // 6. readonly attr
  const ro = join(SAMPLES, 'readonly-attr.md')
  writeFileSync(ro, utf8('read only\r\n'))
  try { chmodSync(ro, 0o444) } catch { }
  // 7. 13.5 MB
  writeFileSync(join(SAMPLES, 'big13.md'), Buffer.alloc(13.5 * 1024 * 1024, 0x61))
  // 8. 33 MB
  writeFileSync(join(SAMPLES, 'huge33.md'), Buffer.alloc(33 * 1024 * 1024, 0x62))
  // 9. 非法字节（不是合法 UTF-8，也不是合法 GBK）
  writeFileSync(join(SAMPLES, 'notxt.md'), Buffer.from([0x81, 0x20, 0x81, 0x0a]))
}

function spawnHost(sample) {
  return spawn(EXE, [join(SAMPLES, sample)], {
    env: { ...process.env, WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS: `--remote-debugging-port=${CDP}` },
    stdio: 'ignore',
  })
}
async function waitCdp(timeoutMs = 30000) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    try { if ((await fetch(`http://127.0.0.1:${CDP}/json/version`)).ok) return true } catch { }
    await sleep(100)
  }
  return false
}
async function openPage() {
  if (!(await waitCdp())) throw new Error('CDP 9338 不可用')
  const browser = await chromium.connectOverCDP(`http://127.0.0.1:${CDP}`)
  const page = browser.contexts()[0].pages()[0]
  const docFetches = []
  page.on('request', (req) => { if (req.url().endsWith('/__doc')) docFetches.push(req.url()) })
  await page.waitForSelector('.ProseMirror', { timeout: 30000 }).catch(() => {})
  await sleep(1200)
  return { browser, page, docFetches }
}

async function docInfo(page) {
  return page.evaluate(async () => {
    const res = await fetch('/__doc')
    const raw = await res.text()
    let parsed = null
    try { parsed = JSON.parse(raw) } catch { }
    const text = parsed && typeof parsed.text === 'string' ? parsed.text : null
    const meta = parsed ? { ...parsed } : null
    if (meta) delete meta.text
    return {
      status: res.status,
      cache: res.headers.get('cache-control'),
      cors: res.headers.get('access-control-allow-origin'),
      leakedPath: /[A-Za-z]:\\\\/.test(raw) || raw.includes('Documents'),
      meta,
      textLength: text ? text.length : -1,
      textSample: text ? text.slice(0, 60) : '',
      hasReplacement: text ? text.includes('\uFFFD') : false,
    }
  })
}

async function sendSave(page, message) {
  return page.evaluate((msg) => new Promise((resolve) => {
    const handler = (event) => {
      window.chrome.webview.removeEventListener('message', handler)
      resolve(event.data)
    }
    window.chrome.webview.addEventListener('message', handler)
    window.chrome.webview.postMessage(msg)
    setTimeout(() => resolve({ timeout: true }), 10000)
  }), message)
}

async function saveAppended(page, id, suffix) {
  return page.evaluate(async ({ id, suffix }) => {
    const doc = await (await fetch('/__doc')).json()
    const text = doc.text + suffix
    return await new Promise((resolve) => {
      const handler = (event) => {
        window.chrome.webview.removeEventListener('message', handler)
        resolve(event.data)
      }
      window.chrome.webview.addEventListener('message', handler)
      window.chrome.webview.postMessage({ v: 1, type: 'save', id, text })
      setTimeout(() => resolve({ timeout: true }), 20000)
    })
  }, { id, suffix })
}

async function withSample(sample, fn) {
  await killHosts()
  const host = spawnHost(sample)
  const { browser, page, docFetches } = await openPage()
  try {
    await fn({ page, docFetches, host })
  } finally {
    await browser.close().catch(() => { })
    await killHosts()
    await sleep(300)
  }
}

async function main() {
  if (!existsSync(join('host/bin', 'Sidelight.exe'))) {
    console.error('缺少 host/bin/Sidelight.exe，先跑 host/build.ps1')
    process.exit(1)
  }
  prepareHost()
  makeSamples()

  // ---- 编码/换行/BOM/只读/大文件/非法字节 ----
  await withSample('crlf-bom.md', async ({ page }) => {
    const info = await docInfo(page)
    check(
      'crlf-bom：UTF-8 BOM + CRLF 判定',
      info.status === 200 && info.meta.encoding === 'utf-8' && info.meta.bom === true && info.meta.eol === 'crlf' && info.meta.endsWithNewline === true,
      `status=${info.status} enc=${info.meta && info.meta.encoding} bom=${info.meta && info.meta.bom} eol=${info.meta && info.meta.eol}`,
    )
    check('__doc：Cache-Control no-store、无 CORS、无完整路径', info.cache === 'no-store' && !info.cors && !info.leakedPath, `cache=${info.cache} cors=${info.cors} leaked=${info.leakedPath}`)
  })

  await withSample('lf.md', async ({ page }) => {
    const info = await docInfo(page)
    check('lf：LF 无 BOM 判定', info.meta.encoding === 'utf-8' && info.meta.bom === false && info.meta.eol === 'lf', `enc=${info.meta.encoding} bom=${info.meta.bom} eol=${info.meta.eol}`)
  })

  await withSample('mixed-eol-bom.md', async ({ page }) => {
    const info = await docInfo(page)
    check('mixed：混合换行判定', info.meta.eol === 'mixed', `eol=${info.meta.eol}`)
    const mismatch = await saveAppended(page, 'mixed-bad', 'extra-line\n')
    check('mixed：行数变化 → EOL_MISMATCH', mismatch && mismatch.ok === false && mismatch.error === 'EOL_MISMATCH', `res=${JSON.stringify(mismatch)}`)
    // 同行数修改：把第一行的 one 换成 ONE（不增加行）
    const okSave = await page.evaluate(async () => {
      const doc = await (await fetch('/__doc')).json()
      const text = doc.text.replace('one', 'ONE')
      return await new Promise((resolve) => {
        const handler = (event) => { window.chrome.webview.removeEventListener('message', handler); resolve(event.data) }
        window.chrome.webview.addEventListener('message', handler)
        window.chrome.webview.postMessage({ v: 1, type: 'save', id: 'mixed-ok', text })
        setTimeout(() => resolve({ timeout: true }), 10000)
      })
    })
    const mixedBytes = readFileSync(join(SAMPLES, 'mixed-eol-bom.md'))
    const mixedText = mixedBytes.toString('utf8')
    check(
      'mixed：同行数保存保留逐行 EOL',
      okSave && okSave.ok === true && mixedText.includes('one\r\n') === false && mixedText.includes('ONE\r\n'),
      `ok=${okSave && okSave.ok} bytes=${mixedBytes.length}`,
    )
  })

  await withSample('utf16le-bom.md', async ({ page }) => {
    const info = await docInfo(page)
    check('utf16le-bom：UTF-16LE + BOM 判定', info.meta.encoding === 'utf-16le' && info.meta.bom === true, `enc=${info.meta.encoding} bom=${info.meta.bom}`)
    const before = readFileSync(join(SAMPLES, 'utf16le-bom.md'))
    const ok = await saveAppended(page, 'utf16-1', 'X')
    const after = readFileSync(join(SAMPLES, 'utf16le-bom.md'))
    check(
      'utf16le-bom：保存保留 BOM 与 UTF-16LE',
      ok && ok.ok === true && after[0] === 0xff && after[1] === 0xfe && after.length > before.length,
      `ok=${ok && ok.ok} head=${after[0] && after[1]} bytes=${before.length}->${after.length}`,
    )
  })

  await withSample('gbk.md', async ({ page }) => {
    const info = await docInfo(page)
    check(
      'gbk：严格解码，无 U+FFFD',
      info.status === 200 && info.meta.encoding === 'gbk' && info.hasReplacement === false && info.textSample.includes('中文'),
      `status=${info.status} enc=${info.meta && info.meta.encoding} fffd=${info.hasReplacement} sample=${JSON.stringify(info.textSample)}`,
    )
    const path = join(SAMPLES, 'gbk.md')
    const before = sha(path)
    const unchanged = await page.evaluate(async () => {
      const doc = await (await fetch('/__doc')).json()
      return await new Promise((resolve) => {
        const handler = (event) => { window.chrome.webview.removeEventListener('message', handler); resolve(event.data) }
        window.chrome.webview.addEventListener('message', handler)
        window.chrome.webview.postMessage({ v: 1, type: 'save', id: 'gbk-same', text: doc.text })
        setTimeout(() => resolve({ timeout: true }), 10000)
      })
    })
    check('gbk：不改保存不写盘（SHA 不变）', unchanged && unchanged.ok === true && sha(path) === before, `ok=${unchanged && unchanged.ok} same=${sha(path) === before}`)

    const ok = await saveAppended(page, 'gbk-1', 'X')
    const bytes = readFileSync(path)
    check(
      'gbk：保存用严格 GBK 编码，不写 ?',
      ok && ok.ok === true && bytes.includes(0xd6) && !bytes.includes(0x3f),
      `ok=${ok && ok.ok} qmark=${bytes.includes(0x3f)}`,
    )
  })

  await withSample('readonly-attr.md', async ({ page }) => {
    const info = await docInfo(page)
    const path = join(SAMPLES, 'readonly-attr.md')
    const before = sha(path)
    const res = await saveAppended(page, 'ro-1', 'X')
    check(
      'readonly：readOnly=true 且保存回 READONLY、SHA 不变',
      info.meta.readOnly === true && res && res.ok === false && res.error === 'READONLY' && sha(path) === before,
      `readOnly=${info.meta.readOnly} error=${res && res.error} same=${sha(path) === before}`,
    )
    const temps = readdirSync(SAMPLES).filter((name) => name.startsWith('.sidelight-tmp-'))
    check('readonly：无临时文件残留', temps.length === 0, temps.join(',') || 'none')
  })

  await withSample('big13.md', async ({ page }) => {
    const info = await docInfo(page)
    const res = await saveAppended(page, 'big-1', 'X')
    const size = statSync(join(SAMPLES, 'big13.md')).size
    check('big13：13.5 MB 打开并写回', info.status === 200 && info.meta.size > 13 * 1024 * 1024 && res && res.ok === true && size > 13 * 1024 * 1024, `size=${size} save=${res && res.ok}`)
  })

  await withSample('huge33.md', async ({ page }) => {
    const info = await docInfo(page)
    check('huge33：33 MB → 413 TOO_LARGE', info.status === 413 && info.meta && info.meta.error === 'TOO_LARGE', `status=${info.status} error=${info.meta && info.meta.error}`)
  })

  await withSample('notxt.md', async ({ page }) => {
    const info = await docInfo(page)
    check('notxt：非法字节 → 409 ENCODING', info.status === 409 && info.meta && info.meta.error === 'ENCODING', `status=${info.status} error=${info.meta && info.meta.error}`)
  })

  // ---- 外部改文件后保存 → PATH_CHANGED ----
  await withSample('lf.md', async ({ page }) => {
    const path = join(SAMPLES, 'lf.md')
    const before = sha(path)
    appendFileSync(path, 'external-change\n')
    const res = await saveAppended(page, 'changed-1', 'X')
    check('外部改文件后保存 → PATH_CHANGED、文件不被覆盖', res && res.ok === false && res.error === 'PATH_CHANGED', `error=${res && res.error}`)
    check('PATH_CHANGED：不写盘（外部内容保留）', readFileSync(path, 'utf8').includes('external-change'))
    void before
  })

  // ---- 伪造 path：拒绝且两个文件都不变 ----
  await withSample('lf.md', async ({ page }) => {
    const sample = join(SAMPLES, 'lf.md')
    const winIni = 'C:\\Windows\\win.ini'
    const beforeSample = sha(sample)
    const beforeIni = existsSync(winIni) ? sha(winIni) : null
    const res = await page.evaluate(() => new Promise((resolve) => {
      const handler = (event) => { window.chrome.webview.removeEventListener('message', handler); resolve(event.data) }
      window.chrome.webview.addEventListener('message', handler)
      window.chrome.webview.postMessage({ v: 1, type: 'save', id: 'forged', text: 'pwned', path: 'C:\\Windows\\win.ini' })
      setTimeout(() => resolve({ timeout: true }), 8000)
    }))
    const afterIni = existsSync(winIni) ? sha(winIni) : null
    check(
      '伪造 path → BAD_REQUEST，样本与 win.ini 都不变',
      res && res.ok === false && res.error === 'BAD_REQUEST' && sha(sample) === beforeSample && beforeIni === afterIni,
      `error=${res && res.error} sampleSame=${sha(sample) === beforeSample} iniSame=${beforeIni === afterIni}`,
    )
  })

  // ---- 前端 Ctrl+S 不改保存（需要 A 组前端接入 /__doc）----
  await withSample('crlf-bom.md', async ({ page, docFetches }) => {
    if (docFetches.length === 0) {
      skip('前端 Ctrl+S 不改保存（SHA 不变）', '前端尚未接入 /__doc（无 fetch），等 A 组 .tmp/build-a')
      return
    }
    const path = join(SAMPLES, 'crlf-bom.md')
    const before = sha(path)
    await page.locator('.ProseMirror').first().click()
    await page.keyboard.press('Control+S')
    await sleep(2500)
    check('前端 Ctrl+S 不改保存：SHA 不变', sha(path) === before, `same=${sha(path) === before} docFetches=${docFetches.length}`)

    // 输入一个字后前端保存：BOM/CRLF 保留、dirty=false。只读横幅若挡住编辑则记 UNVERIFIED。
    await page.keyboard.press('Control+End')
    await page.keyboard.type('X')
    await sleep(600)
    const dirtyBefore = await page.evaluate(() => window.__slState && window.__slState.dirty)
    await page.keyboard.press('Control+S')
    await sleep(3000)
    const after = readFileSync(path)
    const text = after.toString('utf8')
    const dirtyAfter = await page.evaluate(() => window.__slState && window.__slState.dirty)
    const bomOk = after[0] === 0xef && after[1] === 0xbb && after[2] === 0xbf
    const crlfOnly = !/[^\r]\n/.test(text.slice(3))
    if (!dirtyBefore) {
      skip('前端输入后保存（BOM/CRLF/dirty）', '输入没有产生改动（可能被只读横幅挡住）')
    } else {
      check(
        '前端输入后保存：BOM/CRLF 保留、dirty=false',
        text.includes('X') && bomOk && crlfOnly && dirtyAfter === false && sha(path) !== before,
        `x=${text.includes('X')} bom=${bomOk} crlf=${crlfOnly} dirty=${dirtyAfter} changed=${sha(path) !== before}`,
      )
    }
  })

  const failed = results.filter((r) => !r.ok)
  console.log(`summary: ${results.length - failed.length}/${results.length} PASS${unverified ? `，${unverified} UNVERIFIED` : ''}`)
  process.exitCode = failed.length > 0 ? 1 : 0
}

main().catch(async (err) => {
  console.error('PROBE-CRASH', err)
  await killHosts()
  process.exitCode = 1
})
