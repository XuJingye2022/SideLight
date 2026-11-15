import { chromium } from 'playwright-core'

const url = process.argv[2] ?? 'http://localhost:5173'
const browser = await chromium.connectOverCDP('http://127.0.0.1:9222')
const context = browser.contexts()[0] ?? (await browser.newContext())
const page = await context.newPage()
await page.setViewportSize({ width: 1440, height: 900 })

const errors = []
page.on('pageerror', (error) => errors.push(String(error)))
const check = (label, ok, extra = '') => console.log(`${ok ? 'PASS' : 'FAIL'} ${label}${extra ? ` (${extra})` : ''}`)

await page.goto(url, { waitUntil: 'networkidle' })
await page.evaluate(() => localStorage.clear())
await page.reload({ waitUntil: 'networkidle' })
await page.waitForSelector('.doc-column .ProseMirror', { timeout: 15000 })
await page.waitForTimeout(400)

// 用 OPFS 造一个真目录，并把 showDirectoryPicker 指过去
const seeded = await page.evaluate(async () => {
  const root = await navigator.storage.getDirectory()
  for await (const [name] of root.entries()) {
    try {
      await root.removeEntry(name, { recursive: true })
    } catch {
      /* 忽略 */
    }
  }
  const dir = await root.getDirectoryHandle('笔记', { create: true })
  const write = async (name, text) => {
    const handle = await dir.getFileHandle(name, { create: true })
    const stream = await handle.createWritable()
    await stream.write(text)
    await stream.close()
  }
  await write('第一篇.md', '# 第一篇\n\n这是第一篇的正文。有三成的人会在这里停下。\n')
  await write('第二篇.md', '# 第二篇\n\n另一篇的正文。\n')
  window.__dir = dir
  window.showDirectoryPicker = async () => window.__dir
  return 'ok'
})
check('0 测试目录就绪', seeded === 'ok')

// 打开文件夹
await page.getByRole('button', { name: '打开文件夹' }).click()
await page.waitForTimeout(900)
check('1 文件树读到两篇', (await page.locator('.tree-file').count()) === 2, String(await page.locator('.tree-file').count()))

// 打开第一篇并改一行
await page.locator('.tree-file').nth(0).click()
await page.waitForTimeout(600)
await page.locator('.editor').click()
await page.keyboard.press('Control+End')
await page.keyboard.type(' 新加的一句。')
await page.waitForTimeout(1400)

const draft = await page.evaluate(async () => {
  const dir = await (await navigator.storage.getDirectory()).getDirectoryHandle('笔记')
  try {
    const cache = await dir.getDirectoryHandle('.sidelight')
    const drafts = await cache.getDirectoryHandle('drafts')
    const names = []
    for await (const [name] of drafts.entries()) names.push(name)
    if (names.length === 0) return { ok: false, names }
    const handle = await drafts.getFileHandle(names[0])
    const text = await (await handle.getFile()).text()
    return { ok: true, names, hasEdit: text.includes('新加的一句') }
  } catch (error) {
    return { ok: false, names: [], error: String(error).slice(0, 80) }
  }
})
check('2 草稿写进 .sidelight/drafts', draft.ok && draft.hasEdit, JSON.stringify(draft.names ?? draft.error))

// 分析一段，批注应写进 .sidelight/annotations
const paragraph = page.locator('.doc-column .ProseMirror p').nth(0)
const box = await paragraph.boundingBox()
await page.mouse.move(box.x + 4, box.y + 8)
await page.mouse.down()
await page.mouse.move(box.x + box.width - 12, box.y + box.height - 8, { steps: 10 })
await page.mouse.up()
await page.waitForTimeout(250)
await page.locator('.analyze-bubble').click()
await page.waitForTimeout(2800)

const annot = await page.evaluate(async () => {
  const dir = await (await navigator.storage.getDirectory()).getDirectoryHandle('笔记')
  try {
    const cache = await dir.getDirectoryHandle('.sidelight')
    const store = await cache.getDirectoryHandle('annotations')
    const names = []
    for await (const [name] of store.entries()) names.push(name)
    if (names.length === 0) return { ok: false, names }
    const handle = await store.getFileHandle(names[0])
    const text = await (await handle.getFile()).text()
    return { ok: true, names, count: JSON.parse(text).length }
  } catch (error) {
    return { ok: false, names: [], error: String(error).slice(0, 80) }
  }
})
check('3 批注写进 .sidelight/annotations', annot.ok && annot.count > 0, JSON.stringify(annot.names ?? annot.error))

// 保存后草稿应被清掉（首次保存可能弹格式对比，先确认）
await page.keyboard.press('Control+s')
await page.waitForTimeout(700)
if (await page.locator('.save-dialog').count()) {
  await page.locator('.save-dialog button', { hasText: '仍然保存' }).click()
  await page.waitForTimeout(900)
}
await page.waitForTimeout(600)
const docName = ((await page.textContent('.doc-name')) ?? '').trim()
const afterSave = await page.evaluate(async (name) => {
  const dir = await (await navigator.storage.getDirectory()).getDirectoryHandle('笔记')
  const cache = await dir.getDirectoryHandle('.sidelight')
  const drafts = await cache.getDirectoryHandle('drafts')
  const names = []
  for await (const [entry] of drafts.entries()) names.push(entry)
  const handle = await dir.getFileHandle(name)
  const text = await (await handle.getFile()).text()
  return { names, saved: text.includes('新加的一句') }
}, docName)
check('4 保存写入磁盘并清草稿', afterSave.saved && afterSave.names.length === 0, JSON.stringify(afterSave))

// 重新打开同一篇，批注应恢复
await page.locator('.tree-file').nth(1).click()
await page.waitForTimeout(700)
if (await page.locator('.dialog[aria-label="切换文档"]').count()) {
  await page.locator('.dialog[aria-label="切换文档"] button', { hasText: '放弃改动' }).click()
  await page.waitForTimeout(700)
}
await page.locator('.tree-file').nth(0).click()
await page.waitForTimeout(1200)
const restored = await page.locator('.note').count()
check('5 重开文档恢复批注', restored > 0, `卡片数=${restored}`)

check('无控制台错误', errors.length === 0, errors.slice(0, 2).join(' | '))
await page.screenshot({ path: 'shots/sidelight-cache.png' })

await page.close()
await browser.close()
