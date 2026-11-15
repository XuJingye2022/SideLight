import { spawn } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { chromium } from 'playwright-core'

const HOST_DIR = resolve('.tmp/host-t4')
const EXE = resolve(HOST_DIR, 'Sidelight.exe')
const DOC = resolve('.tmp/readonly-doc.md')
const PORT = Number(process.env.SIDELIGHT_TEST_PORT ?? 47831)
const CDP_PORT = Number(process.env.SIDELIGHT_TEST_CDP ?? 9335)
const OUT = resolve('shots/round-04')

const results = []
const check = (label, ok, extra = '') => {
  results.push({ label, ok })
  console.log(`${ok ? 'PASS' : 'FAIL'} ${label}${extra ? ` (${extra})` : ''}`)
}

if (!existsSync(EXE)) {
  console.error(`缺少宿主副本：${EXE}（先跑 host/build.ps1 并拷到 .tmp/host-t4）`)
  process.exit(2)
}
await mkdir(OUT, { recursive: true })
await writeFile(DOC, '# 只读测试\n\n命令行打开这段，保存不该写回。\n', 'utf8')
const sha = (path) => createHash('sha256').update(readFileSync(path)).digest('hex').toUpperCase()

const shaBefore = sha(DOC)

const child = spawn(EXE, [DOC], {
  cwd: HOST_DIR,
  env: {
    ...process.env,
    SIDELIGHT_PORT: String(PORT),
    WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS: `--remote-debugging-port=${CDP_PORT}`,
  },
  stdio: 'ignore',
})

const waitForCdp = async () => {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${CDP_PORT}/json/version`)
      if (response.ok) return true
    } catch {
      // 还没起来
    }
    await new Promise((done) => setTimeout(done, 500))
  }
  return false
}

let browser
try {
  const ready = await waitForCdp()
  check('宿主启动并暴露 CDP', ready, String(CDP_PORT))
  if (!ready) throw new Error('host did not start')

  browser = await chromium.connectOverCDP(`http://127.0.0.1:${CDP_PORT}`)
  const context = browser.contexts()[0]
  const page = context.pages()[0] ?? (await context.newPage())
  await page.waitForSelector('.editor', { timeout: 20000 })
  await page.waitForTimeout(800)

  const banner = await page.evaluate(() => {
    const node = document.querySelector('.readonly-banner')
    return {
      text: node?.textContent?.replace(/\s+/g, ' ').trim() ?? null,
      role: node?.getAttribute('role') ?? null,
      button: [...(node?.querySelectorAll('button') ?? [])].map((item) => item.textContent?.trim()),
      readOnly: window.__slState?.readOnly,
      body: document.querySelector('.editor')?.textContent?.slice(0, 30),
    }
  })
  check('argv 文档出现只读横幅', Boolean(banner.text), banner.text ?? 'none')
  check('横幅 role=status 且有「另存为」', banner.role === 'status' && (banner.button ?? []).includes('另存为'), JSON.stringify(banner.button))
  check('__slState.readOnly === true', banner.readOnly === true, String(banner.readOnly))
  check('正文是 argv 传入的内容', (banner.body ?? '').includes('只读测试'), banner.body ?? 'none')
  await page.screenshot({ path: resolve(OUT, 't4-readonly.png') })

  await page.waitForTimeout(8000)
  check('8 秒后横幅仍在', (await page.locator('.readonly-banner').count()) === 1)

  // 打桩 picker 后 Ctrl+S：另存为新文件，原文件不动
  await page.evaluate(() => {
    Object.defineProperty(window, 'showSaveFilePicker', {
      configurable: true,
      writable: true,
      value: async () => {
        const root = await navigator.storage.getDirectory()
        return root.getFileHandle('只读另存.md', { create: true })
      },
    })
  })
  await page.locator('.editor').click()
  await page.keyboard.press('Control+End')
  await page.keyboard.type('改一个字，另存为。')
  await page.waitForTimeout(400)
  await page.keyboard.press('Control+s')
  await page.waitForTimeout(1000)
  const afterSave = await page.evaluate(async () => {
    const root = await navigator.storage.getDirectory()
    const handle = await root.getFileHandle('只读另存.md', { create: true })
    const file = await handle.getFile()
    return {
      saved: await file.text(),
      banner: document.querySelectorAll('.readonly-banner').length,
      toast: document.querySelector('.toast-text')?.textContent ?? null,
      readOnly: window.__slState?.readOnly,
      dirty: window.__slState?.dirty,
      name: window.__slState?.name,
    }
  })
  check('只读文档 Ctrl+S 走另存为', afterSave.saved.includes('改一个字，另存为。'), afterSave.saved.slice(-30))
  check('另存为别处后横幅撤掉、readOnly=false', afterSave.banner === 0 && afterSave.readOnly === false, JSON.stringify({ banner: afterSave.banner, readOnly: afterSave.readOnly }))
  check('另存为后 dirty=false', afterSave.dirty === false, String(afterSave.dirty))
  check('提示「已保存」且名字更新', (afterSave.toast ?? '').includes('已保存') && (afterSave.name ?? '').includes('只读另存'), `${afterSave.toast} / ${afterSave.name}`)
  const shaAfter = sha(DOC)
  check('原文件 SHA256 前后一致', shaBefore === shaAfter, `${shaBefore.slice(0, 12)}…`)

  // 负向：走「打开文件」（有句柄）载入普通文件，不应出现只读横幅
  await page.evaluate(async () => {
    const root = await navigator.storage.getDirectory()
    const handle = await root.getFileHandle('普通文件.md', { create: true })
    const writable = await handle.createWritable()
    await writable.write('# 普通文件\n\n这是从文件打开的内容。\n')
    await writable.close()
    Object.defineProperty(window, 'showOpenFilePicker', {
      configurable: true,
      writable: true,
      value: async () => {
        const dir = await navigator.storage.getDirectory()
        return [await dir.getFileHandle('普通文件.md')]
      },
    })
  })
  await page.getByRole('button', { name: '文件 ▾', exact: true }).click()
  await page.getByRole('menuitem', { name: '打开文件…' }).click()
  await page.waitForTimeout(900)
  const normal = await page.evaluate(() => ({
    banner: document.querySelectorAll('.readonly-banner').length,
    readOnly: window.__slState?.readOnly,
    name: window.__slState?.name,
    body: document.querySelector('.editor')?.textContent?.slice(0, 20),
  }))
  check('打开文件（有句柄）：没有只读横幅', normal.banner === 0, String(normal.banner))
  check('打开文件：readOnly=false', normal.readOnly === false, String(normal.readOnly))
  check('打开文件：载入了普通文件内容', (normal.body ?? '').includes('普通文件'), normal.body ?? 'none')
  await page.screenshot({ path: resolve(OUT, 't4-normal.png') })
} finally {
  try {
    if (browser) await browser.close()
  } catch {
    // CDP 已断开也没关系
  }
  child.kill()
  await new Promise((done) => setTimeout(done, 800))
}

console.log(`\n${results.filter((item) => item.ok).length}/${results.length} PASS`)
if (results.some((item) => !item.ok)) process.exit(1)
