import { chromium } from 'playwright-core'

const URL = process.argv[2] ?? 'http://localhost:5173'
const CDP = process.env.SIDELIGHT_CDP ?? 'http://127.0.0.1:9222'
const HOST_CDP = process.env.SIDELIGHT_HOST_CDP ?? 'http://127.0.0.1:9334'
const only = process.argv[3] ?? 'browser'

const results = []
const check = (label, ok, extra = '') => {
  results.push({ label, ok })
  console.log(`${ok ? 'PASS' : 'FAIL'} ${label}${extra ? ` (${extra})` : ''}`)
}

const pickerStub = () => {
  const state = { calls: 0, names: [] }
  Object.defineProperty(window, '__picker', { value: state, configurable: true })
  Object.defineProperty(window, 'showSaveFilePicker', {
    configurable: true,
    writable: true,
    value: async (options = {}) => {
      state.calls += 1
      const suggested = String(options.suggestedName || 'untitled.md').replace(/[\\/:*?"<>|]/g, '-')
      state.names.push(suggested)
      const root = await navigator.storage.getDirectory()
      const handle = await root.getFileHandle(suggested, { create: true })
      Object.defineProperty(window, '__lastHandle', { value: handle, configurable: true })
      Object.defineProperty(window, '__lastName', { value: suggested, configurable: true })
      return handle
    },
  })
}

async function newPage(context, { stub = true } = {}) {
  const page = await context.newPage()
  const client = await context.newCDPSession(page)
  await client.send('Network.enable')
  await client.send('Network.setCacheDisabled', { cacheDisabled: true })
  if (stub) await page.addInitScript(pickerStub)
  await page.goto(URL, { waitUntil: 'networkidle' })
  await page.evaluate(() => localStorage.clear())
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForSelector('.doc-column .ProseMirror')
  await page.waitForTimeout(400)
  return page
}

const toast = (page) =>
  page.evaluate(() => {
    const node = document.querySelector('.toast')
    return {
      text: node?.querySelector('.toast-text')?.textContent ?? null,
      action: node?.querySelector('.toast-action')?.textContent ?? null,
    }
  })

const dirty = (page) => page.evaluate(() => window.__slState?.dirty)
const savedText = (page) =>
  page.evaluate(async () => {
    if (!window.__lastHandle) return null
    const file = await window.__lastHandle.getFile()
    return file.text()
  })

const typeAtEnd = async (page, text) => {
  await page.locator('.editor').click()
  await page.keyboard.press('Control+End')
  await page.keyboard.type(text)
  await page.waitForTimeout(400)
}

if (only === 'browser' || only === 'all') {
  const browser = await chromium.connectOverCDP(CDP)
  const context = browser.contexts()[0] ?? (await browser.newContext())

  // 1) 打桩 picker → Ctrl+S 真正落盘、提示持久、dirty 归零
  const page = await newPage(context)
  await typeAtEnd(page, ' 保存落点测试。')
  check('打字后 dirty=true', (await dirty(page)) === true)
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 1500 }).catch(() => null),
    page.keyboard.press('Control+s'),
  ])
  await page.waitForTimeout(700)
  const firstToast = await toast(page)
  const firstText = await savedText(page)
  check('首次保存调用了 picker', (await page.evaluate(() => window.__picker.calls)) === 1)
  check('打桩 picker 下有文件、正文写入', Boolean(firstText) && firstText.includes('保存落点测试。'))
  check('首次保存没有走下载', download === null)
  check('提示含「已保存」与文件名', Boolean(firstToast.text?.includes('已保存') && firstToast.text?.includes('示例 · 未命名.md')), firstToast.text ?? 'none')
  check('保存后 dirty=false', (await dirty(page)) === false)
  await page.screenshot({ path: 'shots/round-04/t1-saved.png' })
  await page.waitForTimeout(10000)
  const laterToast = await toast(page)
  check('10 秒后「已保存」仍在', (laterToast.text ?? '').includes('已保存'))

  // 2) 第二次 Ctrl+S 不再调 picker，写同一个文件
  await typeAtEnd(page, '再改一句。')
  check('保存后再打字 dirty=true', (await dirty(page)) === true)
  const callsBefore = await page.evaluate(() => window.__picker.calls)
  await page.keyboard.press('Control+s')
  await page.waitForTimeout(700)
  const callsAfter = await page.evaluate(() => window.__picker.calls)
  const secondText = await savedText(page)
  check('第二次保存不再弹 picker', callsAfter === callsBefore, `${callsBefore} -> ${callsAfter}`)
  check('第二次写入同一文件且内容更新', Boolean(secondText) && secondText.includes('再改一句。'))
  check('第二次保存后 dirty=false', (await dirty(page)) === false)

  // 3) 不支持 picker → 降级下载，不谎报成功
  const unsupported = await newPage(context, { stub: false })
  await unsupported.evaluate(() => {
    delete window.showSaveFilePicker
  })
  await typeAtEnd(unsupported, '不支持 picker。')
  const downloadEvent = unsupported
    .waitForEvent('download', { timeout: 2000 })
    .then((item) => item.suggestedFilename())
    .catch(() => null)
  await unsupported.keyboard.press('Control+s')
  const downloaded = await downloadEvent
  await unsupported.waitForTimeout(600)
  const unsupportedToast = await toast(unsupported)
  check('不支持 picker 时有下载', Boolean(downloaded), downloaded ?? 'no-download')
  check('提示含「无法确认落点」', (unsupportedToast.text ?? '').includes('无法确认落点'), unsupportedToast.text ?? 'none')
  check('提示不含「已保存」', !(unsupportedToast.text ?? '').includes('已保存'))
  check('降级后 dirty 仍为 true', (await dirty(unsupported)) === true)

  // 4) 取消 picker → 已取消保存、无残留成功提示、正文不变
  const cancelled = await newPage(context)
  await typeAtEnd(cancelled, '取消前的内容。')
  const bodyBefore = await cancelled.locator('.editor').innerText()
  await cancelled.evaluate(() => {
    window.showSaveFilePicker = async () => {
      throw new DOMException('用户取消', 'AbortError')
    }
  })
  await cancelled.keyboard.press('Control+s')
  await cancelled.waitForTimeout(700)
  const cancelToast = await toast(cancelled)
  const bodyAfter = await cancelled.locator('.editor').innerText()
  check('取消后提示「已取消保存」', (cancelToast.text ?? '').includes('已取消保存'), cancelToast.text ?? 'none')
  check('取消后没有「已保存」', !(cancelToast.text ?? '').includes('已保存'))
  check('取消后 dirty 仍为 true', (await dirty(cancelled)) === true)
  check('取消后正文不变', bodyAfter === bodyBefore)

  // 5) dirty 六态：打字 / 撤销回基线 / 保存 / 再打字 / 撤销回保存基线 / 载入后初始
  check('六态 1 打字 true', (await dirty(cancelled)) === true)
  await cancelled.locator('.editor').click()
  await cancelled.keyboard.press('Control+z')
  await cancelled.waitForTimeout(400)
  check('六态 2 撤销回基线 false', (await dirty(cancelled)) === false)
  await cancelled.evaluate(() => {
    window.showSaveFilePicker = async () => {
      const root = await navigator.storage.getDirectory()
      return root.getFileHandle('dirty-six.md', { create: true })
    }
  })
  await cancelled.keyboard.press('Control+s')
  await cancelled.waitForTimeout(800)
  check('六态 3 保存成功 false', (await dirty(cancelled)) === false)
  await typeAtEnd(cancelled, 'X')
  check('六态 4 保存后再打字 true', (await dirty(cancelled)) === true)
  await cancelled.locator('.editor').click()
  await cancelled.keyboard.press('Control+z')
  await cancelled.waitForTimeout(400)
  check('六态 5 再撤销回保存基线 false', (await dirty(cancelled)) === false)
  await cancelled.reload({ waitUntil: 'networkidle' })
  await cancelled.waitForSelector('.doc-column .ProseMirror')
  await cancelled.waitForTimeout(500)
  check('六态 6 载入/草稿恢复后初始 false', (await dirty(cancelled)) === false)

  await page.close()
  await unsupported.close()
  await cancelled.close()
  await browser.close()
}

if (only === 'host' || only === 'all') {
  const browser = await chromium.connectOverCDP(HOST_CDP)
  const context = browser.contexts()[0] ?? (await browser.newContext())
  const page = await context.newPage()
  const client = await context.newCDPSession(page)
  await client.send('Network.enable')
  await client.send('Network.setCacheDisabled', { cacheDisabled: true })
  await page.addInitScript(pickerStub)
  await page.goto(URL, { waitUntil: 'networkidle' })
  await page.waitForSelector('.doc-column .ProseMirror')
  await page.waitForTimeout(400)
  await typeAtEnd(page, ' 宿主保存测试。')
  await page.keyboard.press('Control+s')
  await page.waitForTimeout(900)
  const hostToast = await toast(page)
  const hostText = await savedText(page)
  check('宿主：picker 落盘内容含正文', Boolean(hostText) && hostText.includes('宿主保存测试。'))
  check('宿主：提示含「已保存」', (hostToast.text ?? '').includes('已保存'), hostToast.text ?? 'none')
  check('宿主：dirty=false', (await dirty(page)) === false)
  await page.close()
  await browser.close()
}

const failed = results.filter((item) => !item.ok)
console.log(`\n${results.length - failed.length}/${results.length} PASS`)
if (failed.length > 0) process.exit(1)
