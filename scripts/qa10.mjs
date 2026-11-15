import { chromium } from 'playwright-core'

const url = process.argv[2] ?? 'http://localhost:5173'
const browser = await chromium.connectOverCDP('http://127.0.0.1:9222')
const context = browser.contexts()[0] ?? (await browser.newContext())
const page = await context.newPage()
await page.setViewportSize({ width: 1440, height: 900 })

const errors = []
page.on('pageerror', (error) => errors.push(String(error)))
const check = (label, ok, extra = '') => console.log(`${ok ? 'PASS' : 'FAIL'} ${label}${extra ? ` (${extra})` : ''}`)

const reset = async () => {
  await page.goto(url, { waitUntil: 'networkidle' })
  await page.evaluate(() => localStorage.clear())
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForSelector('.doc-column .ProseMirror', { timeout: 15000 })
  await page.waitForTimeout(350)
}

/* 1. 撤销采纳后建议回来 */
await reset()
const paragraph = page.locator('.doc-column .ProseMirror p').nth(2)
const box = await paragraph.boundingBox()
await page.mouse.move(box.x + 4, box.y + 8)
await page.mouse.down()
await page.mouse.move(box.x + box.width - 12, box.y + box.height - 8, { steps: 12 })
await page.mouse.up()
await page.waitForTimeout(250)
await page.locator('.analyze-bubble').click()
await page.waitForTimeout(2800)
const before = await page.locator('.note').count()
await page.locator('.note-actions .accept').first().click()
await page.waitForTimeout(600)
const afterAccept = await page.locator('.note').count()
await page.keyboard.press('Control+z')
await page.waitForTimeout(700)
const afterUndo = await page.locator('.note').count()
check('1 撤销后建议回来', afterUndo === before && afterAccept === before - 1, `${before} -> ${afterAccept} -> ${afterUndo}`)

/* 2. 源码模式：往返保留批注、字数更新、提示可见 */
await reset()
const p2 = await page.locator('.doc-column .ProseMirror p').nth(2).boundingBox()
await page.mouse.move(p2.x + 4, p2.y + 8)
await page.mouse.down()
await page.mouse.move(p2.x + p2.width - 12, p2.y + p2.height - 8, { steps: 10 })
await page.mouse.up()
await page.waitForTimeout(200)
await page.locator('.analyze-bubble').click()
await page.waitForTimeout(2700)
const notesBefore = await page.locator('.note').count()

// 2a 不改内容，只是切进切出
await page.getByRole('button', { name: '源码', exact: true }).click()
await page.waitForTimeout(400)
await page.getByRole('button', { name: '源码', exact: true }).click()
await page.waitForTimeout(600)
const notesAfter = await page.locator('.note').count()
check('2a 源码往返保留批注', notesAfter === notesBefore, `${notesBefore} -> ${notesAfter}`)

// 2b 源码里输入，状态栏字数跟着变
await page.getByRole('button', { name: '源码', exact: true }).click()
await page.waitForTimeout(400)
const statsBefore = (await page.textContent('.status-bar'))?.replace(/\s+/g, ' ').trim() ?? ''
await page.locator('.source-editor').fill('# 源码里改过\n\n源码模式写的一行，字数应该变。\n')
await page.waitForTimeout(500)
const statsAfter = (await page.textContent('.status-bar'))?.replace(/\s+/g, ' ').trim() ?? ''
check('2b 源码模式字数跟着变', statsBefore !== statsAfter, `${statsBefore} -> ${statsAfter}`)

// 2c 源码模式下保存，提示要看得见（这篇没有磁盘句柄）
const downloadPromise = page.waitForEvent('download', { timeout: 5000 }).catch(() => null)
await page.keyboard.press('Control+s')
await page.waitForTimeout(600)
if (await page.locator('.save-dialog').count()) {
  await page.locator('.save-dialog button', { hasText: '仍然保存' }).click()
  await page.waitForTimeout(600)
}
await downloadPromise
await page.waitForTimeout(400)
check('2c 源码模式下能看到提示', (await page.locator('.toast').count()) === 1)

/* 3. CRLF 文件保存后仍是 CRLF */
await page.evaluate(async () => {
  const root = await navigator.storage.getDirectory()
  for await (const [name] of root.entries()) {
    try {
      await root.removeEntry(name, { recursive: true })
    } catch {
      /* 忽略 */
    }
  }
  const dir = await root.getDirectoryHandle('项目', { create: true })
  const handle = await dir.getFileHandle('win.md', { create: true })
  const stream = await handle.createWritable()
  await stream.write('# 标题\r\n\r\n第一段。\r\n\r\n第二段。\r\n')
  await stream.close()
  window.__dir = dir
  window.showDirectoryPicker = async () => window.__dir
})
await page.reload({ waitUntil: 'networkidle' })
await page.waitForSelector('.doc-column .ProseMirror')
await page.waitForTimeout(300)
// 刷新会丢掉页面里注入的函数，重新指一次
await page.evaluate(async () => {
  const dir = await (await navigator.storage.getDirectory()).getDirectoryHandle('项目')
  window.__dir = dir
  window.showDirectoryPicker = async () => window.__dir
})
await page.getByRole('button', { name: '打开文件夹' }).click()
await page.waitForTimeout(800)
await page.locator('.tree-file').first().click()
await page.waitForTimeout(600)
await page.locator('.editor').click()
await page.keyboard.press('Control+End')
await page.keyboard.type('第三段。')
await page.waitForTimeout(400)
const crlfDownload = page.waitForEvent('download', { timeout: 3000 }).catch(() => null)
await page.keyboard.press('Control+s')
await page.waitForTimeout(600)
if (await page.locator('.save-dialog').count()) {
  await page.locator('.save-dialog button', { hasText: '仍然保存' }).click()
  await page.waitForTimeout(800)
}
await crlfDownload
const saved = await page.evaluate(async () => {
  const dir = await (await navigator.storage.getDirectory()).getDirectoryHandle('项目')
  const handle = await dir.getFileHandle('win.md')
  return await (await handle.getFile()).text()
})
check('3 CRLF 保留', saved.includes('\r\n') && saved.includes('第三段'), `含 CRLF=${saved.includes('\r\n')}`)

check('无控制台错误', errors.length === 0, errors.slice(0, 2).join(' | '))
await page.screenshot({ path: 'shots/fixes4.png' })
await page.close()
await browser.close()
