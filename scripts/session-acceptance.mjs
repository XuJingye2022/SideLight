import { chromium } from 'playwright-core'

const URL = process.env.SIDELIGHT_URL ?? 'http://localhost:5173'
const CDP = process.env.SIDELIGHT_CDP ?? 'http://127.0.0.1:9222'
const results = []
const check = (label, ok, extra = '') => {
  results.push({ label, ok })
  console.log(`${ok ? 'PASS' : 'FAIL'} ${label}${extra ? ` (${extra})` : ''}`)
}

const browser = await chromium.connectOverCDP(CDP)
const context = await browser.newContext()
const page = await context.newPage()

await page.addInitScript(() => {
  window.__savePickerCalls = 0
  window.__openPickerCalls = 0
  window.showSaveFilePicker = async () => {
    window.__savePickerCalls += 1
    throw new DOMException('不应弹保存选择器', 'AbortError')
  }
  window.showDirectoryPicker = async () => {
    const root = await navigator.storage.getDirectory()
    return root.getDirectoryHandle('proj', { create: true })
  }
  window.showOpenFilePicker = async () => {
    window.__openPickerCalls += 1
    const root = await navigator.storage.getDirectory()
    return [await root.getFileHandle('single.md')]
  }
})

await page.goto(URL, { waitUntil: 'networkidle' })
await page.evaluate(async () => {
  const root = await navigator.storage.getDirectory()
  const dir = await root.getDirectoryHandle('proj', { create: true })
  const write = async (name, text) => {
    const handle = await dir.getFileHandle(name, { create: true })
    const writer = await handle.createWritable()
    await writer.write(text)
    await writer.close()
  }
  await write('doc.md', '# 会话\n\nhello world\n')
  const side = await dir.getDirectoryHandle('.sidelight', { create: true })
  const annotations = await side.getDirectoryHandle('annotations', { create: true })
  const annotationFile = await annotations.getFileHandle('doc.json', { create: true })
  const annotationWriter = await annotationFile.createWritable()
  await annotationWriter.write(JSON.stringify([
    { id: 'a1', kind: 'evaluation', status: 'pending', from: 1, to: 6, quote: 'hello', note: '一条批注' },
  ]))
  await annotationWriter.close()
  await root.getFileHandle('single.md', { create: true }).then(async (handle) => {
    const writer = await handle.createWritable()
    await writer.write('# 单文件\n\nsingle body\n')
    await writer.close()
  })
})

await page.locator('.file-menu-trigger').click()
await page.getByRole('button', { name: '打开文件夹…' }).click()
await page.locator('[role="treeitem"]', { hasText: 'doc.md' }).first().waitFor({ timeout: 10000 })
await page.locator('[role="treeitem"]', { hasText: 'doc.md' }).first().dblclick()
await page.waitForTimeout(1200)
await page.locator('.ProseMirror').click()
await page.keyboard.press('Control+End')
await page.keyboard.type(' SESSION-MARK')
await page.keyboard.press('Control+S')
await page.waitForTimeout(1200)

const before = await page.evaluate(async () => {
  const root = await navigator.storage.getDirectory()
  const dir = await root.getDirectoryHandle('proj')
  const text = await (await (await dir.getFileHandle('doc.md')).getFile()).text()
  return {
    text,
    cards: document.querySelectorAll('.margin-rail article').length,
    name: document.querySelector('.doc-name')?.textContent?.trim(),
  }
})
check('首次打开后正文已写入 OPFS', before.text.includes('SESSION-MARK'), before.text)
check('首次打开恢复批注', before.cards >= 1, String(before.cards))

await page.reload({ waitUntil: 'networkidle' })
await page.waitForTimeout(1800)
const after = await page.evaluate(async () => {
  const root = await navigator.storage.getDirectory()
  const dir = await root.getDirectoryHandle('proj')
  const text = await (await (await dir.getFileHandle('doc.md')).getFile()).text()
  return {
    text,
    tree: document.querySelectorAll('[role="treeitem"]').length,
    name: document.querySelector('.doc-name')?.textContent?.trim(),
    cards: document.querySelectorAll('.margin-rail article').length,
    saveCalls: window.__savePickerCalls,
  }
})
check('重载后文件树有 doc.md', after.tree >= 1)
check('重载后当前文档名正确', after.name === 'doc.md', String(after.name))
check('重载后批注数等于重载前', after.cards === before.cards, `${before.cards}/${after.cards}`)
await page.locator('.ProseMirror').click()
await page.keyboard.press('Control+End')
await page.keyboard.type(' AFTER-RELOAD')
await page.keyboard.press('Control+S')
await page.waitForTimeout(1200)
const saved = await page.evaluate(async () => {
  const root = await navigator.storage.getDirectory()
  const dir = await root.getDirectoryHandle('proj')
  return {
    text: await (await (await dir.getFileHandle('doc.md')).getFile()).text(),
    saveCalls: window.__savePickerCalls,
  }
})
check('重载后 Ctrl+S 不弹选择器', saved.saveCalls === 0, String(saved.saveCalls))
check('重载后 OPFS 内容更新', saved.text.includes('AFTER-RELOAD'), saved.text.slice(-40))

// 单文件会话：打开 → 重载 → Ctrl+S 不弹 picker
const page2 = await context.newPage()
await page2.addInitScript(() => {
  window.__openPickerCalls = 0
  window.__savePickerCalls = 0
  window.showDirectoryPicker = async () => {
    const root = await navigator.storage.getDirectory()
    return root.getDirectoryHandle('proj', { create: true })
  }
  window.showOpenFilePicker = async () => {
    window.__openPickerCalls += 1
    const root = await navigator.storage.getDirectory()
    return [await root.getFileHandle('single.md')]
  }
  window.showSaveFilePicker = async () => {
    window.__savePickerCalls += 1
    throw new DOMException('不应弹保存选择器', 'AbortError')
  }
})
await page2.goto(URL, { waitUntil: 'networkidle' })
await page2.evaluate(() => indexedDB.deleteDatabase('sidelight.session'))
await page2.reload({ waitUntil: 'networkidle' })
await page2.keyboard.press('Control+Alt+O')
await page2.waitForTimeout(1200)
const singleName = await page2.locator('.doc-name').textContent()
check('单文件打开成功', singleName?.trim() === 'single.md', String(singleName))
await page2.reload({ waitUntil: 'networkidle' })
await page2.waitForTimeout(1800)
await page2.locator('.ProseMirror').click()
await page2.keyboard.press('Control+End')
await page2.keyboard.type(' SAVED')
await page2.keyboard.press('Control+S')
await page2.waitForTimeout(1200)
const single = await page2.evaluate(async () => {
  const root = await navigator.storage.getDirectory()
  const text = await (await (await root.getFileHandle('single.md')).getFile()).text()
  return { text, saveCalls: window.__savePickerCalls, name: document.querySelector('.doc-name')?.textContent?.trim() }
})
check('单文件会话重载后名称正确', single.name === 'single.md', String(single.name))
check('单文件 Ctrl+S 不弹 picker', single.saveCalls === 0, String(single.saveCalls))
check('单文件 Ctrl+S 写回 OPFS', single.text.includes('SAVED'), single.text.slice(-30))

const failed = results.filter((item) => !item.ok)
console.log(`summary: ${results.length - failed.length}/${results.length} PASS`)
process.exit(failed.length > 0 ? 1 : 0)
