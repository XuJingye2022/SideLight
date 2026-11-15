import { chromium } from 'playwright-core'

const URL = process.argv[2] ?? 'http://localhost:5173'
const CDP = process.env.SIDELIGHT_CDP ?? 'http://127.0.0.1:9222'

const results = []
const check = (label, ok, extra = '') => {
  results.push({ label, ok })
  console.log(`${ok ? 'PASS' : 'FAIL'} ${label}${extra ? ` (${extra})` : ''}`)
}

const stubScript = () => {
  const state = { pickerCalls: 0, dirCalls: 0, lastPickerName: null }
  Object.defineProperty(window, '__stub', { value: state, configurable: true })
  Object.defineProperty(window, 'showDirectoryPicker', {
    configurable: true,
    writable: true,
    value: async () => {
      state.dirCalls += 1
      const root = await navigator.storage.getDirectory()
      // 每次开新文件夹都从干净的目录开始，脚本可重复跑
      await root.removeEntry('测试文集', { recursive: true }).catch(() => {})
      const dir = await root.getDirectoryHandle('测试文集', { create: true })
      const handle = await dir.getFileHandle('已有.md', { create: true })
      const writable = await handle.createWritable()
      await writable.write('# 已有\n')
      await writable.close()
      return dir
    },
  })
  Object.defineProperty(window, 'showSaveFilePicker', {
    configurable: true,
    writable: true,
    value: async (options = {}) => {
      state.pickerCalls += 1
      state.lastPickerName = options.suggestedName ?? null
      const root = await navigator.storage.getDirectory()
      const handle = await root.getFileHandle('另存为的.md', { create: true })
      return handle
    },
  })
}

const browser = await chromium.connectOverCDP(CDP)
const context = browser.contexts()[0] ?? (await browser.newContext())
const page = await context.newPage()
const client = await context.newCDPSession(page)
await client.send('Network.enable')
await client.send('Network.setCacheDisabled', { cacheDisabled: true })
await page.addInitScript(stubScript)

const load = async () => {
  await page.goto(URL, { waitUntil: 'networkidle' })
  await page.evaluate(() => localStorage.clear())
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForSelector('.doc-column .ProseMirror')
  await page.waitForTimeout(400)
}

const openMenu = async () => {
  await page.getByRole('button', { name: '文件 ▾', exact: true }).click()
  await page.waitForTimeout(200)
  return page.evaluate(() => [...document.querySelectorAll('.file-menu [role="menuitem"]')].map((node) => node.textContent?.trim()))
}

const dirty = () => page.evaluate(() => window.__slState?.dirty)
const strip = (text) => (text ?? '').replace(/\s+/g, ' ').trim()

await load()

// 1) 三种状态都有「文件」菜单四项
const emptyMenu = await openMenu()
check('空状态：文件菜单四项', emptyMenu?.length === 4, JSON.stringify(emptyMenu))
check('空状态：有「打开文件夹」项', (emptyMenu ?? []).some((item) => item?.startsWith('打开文件夹')))
await page.keyboard.press('Escape')
await page.waitForTimeout(250)
const escState = await page.evaluate(() => ({
  open: document.querySelectorAll('.file-menu').length,
  focused: document.activeElement?.textContent?.trim(),
}))
check('菜单 Esc 关闭', escState.open === 0)
check('Esc 后焦点回「文件」按钮', escState.focused === '文件 ▾', escState.focused ?? 'none')

// 2) 示例态：徽标、说明、无「＋ 新建文件」；菜单仍可用
await page.getByRole('button', { name: '试用示例' }).first().click()
await page.waitForTimeout(700)
const demoState = await page.evaluate(() => ({
  badge: document.querySelector('.file-badge')?.textContent?.trim() ?? null,
  note: document.querySelector('.file-tree-demo-note')?.textContent?.trim() ?? null,
  newFileButtons: [...document.querySelectorAll('button')].filter((node) => node.textContent?.includes('新建文件')).length,
}))
check('示例态有「示例」徽标', demoState.badge === '示例', demoState.badge ?? 'none')
check('示例态写明「改动不写盘，保存会另存为」', (demoState.note ?? '').includes('保存会另存为'), demoState.note ?? 'none')
check('示例态没有「＋ 新建文件」', demoState.newFileButtons === 0)
await page.screenshot({ path: 'shots/round-04/t2-demo.png' })
const demoMenu = await openMenu()
check('示例态菜单四项仍在', demoMenu?.length === 4)
await page.keyboard.press('Escape')

// 3) 真实文件夹：树头两个入口；新建得到 未命名.md 且选中；Ctrl+S 直接写盘不弹 picker
await load()
await page.getByRole('button', { name: '文件 ▾', exact: true }).click()
await page.getByRole('menuitem', { name: '打开文件夹…' }).click()
await page.waitForTimeout(900)
const folderState = await page.evaluate(() => ({
  treeText: document.querySelector('.file-tree')?.textContent?.replace(/\s+/g, ' ') ?? '',
  newFile: [...document.querySelectorAll('.file-tree-head-actions button')].map((node) => node.textContent?.trim()),
}))
check('真实文件夹树里有已有.md', folderState.treeText.includes('已有.md'), folderState.treeText.slice(0, 60))
check('树头有「＋ 新建文件」与「打开其他文件夹」', folderState.newFile.join('|') === '＋ 新建文件|打开其他文件夹', JSON.stringify(folderState.newFile))

await page.getByRole('button', { name: '＋ 新建文件', exact: true }).click()
await page.waitForTimeout(700)
const newState = await page.evaluate(() => {
  const active = document.querySelector('.tree-file.is-active')
  return {
    docName: document.querySelector('.doc-name')?.textContent?.trim(),
    treeText: document.querySelector('.file-tree')?.textContent?.replace(/\s+/g, ' ') ?? '',
    activeText: active?.textContent?.trim() ?? null,
    aria: active?.getAttribute('aria-current') ?? null,
    editor: document.querySelector('.editor')?.textContent?.trim(),
  }
})
check('文件夹新建：树里出现 未命名.md', newState.treeText.includes('未命名.md'), newState.treeText.slice(0, 80))
check('文件夹新建：未命名.md 是选中项', newState.activeText === '未命名.md' && newState.aria === 'true', `${newState.activeText}/${newState.aria}`)
check('文件夹新建：正文为空', newState.editor === '')
check('文件夹新建：dirty=false', (await dirty()) === false)
await page.screenshot({ path: 'shots/round-04/t2-folder.png' })
const pickerBefore = await page.evaluate(() => window.__stub.pickerCalls)
await page.keyboard.press('Control+s')
await page.waitForTimeout(800)
const pickerAfter = await page.evaluate(() => window.__stub.pickerCalls)
const savedEmpty = await page.evaluate(async () => {
  const root = await navigator.storage.getDirectory()
  const dir = await root.getDirectoryHandle('测试文集')
  try {
    const handle = await dir.getFileHandle('未命名.md')
    const file = await handle.getFile()
    return await file.text()
  } catch {
    return null
  }
})
check('文件夹保存：不弹 picker', pickerAfter === pickerBefore, `${pickerBefore} -> ${pickerAfter}`)
check('文件夹保存：磁盘上有 未命名.md', savedEmpty !== null, savedEmpty === null ? 'missing' : 'present')
check('文件夹保存：dirty=false', (await dirty()) === false)

// 4) 无文件夹：新建空文档，Ctrl+S 走 picker
await load()
await page.getByRole('button', { name: '文件 ▾', exact: true }).click()
await page.getByRole('menuitem', { name: '新建' }).click()
await page.waitForTimeout(500)
const noFolderNew = await page.evaluate(() => ({
  docName: document.querySelector('.doc-name')?.textContent?.trim(),
  editor: document.querySelector('.editor')?.textContent?.trim(),
}))
check('无文件夹新建：未命名.md 且正文空', noFolderNew.docName === '未命名.md' && noFolderNew.editor === '', JSON.stringify(noFolderNew))
check('无文件夹新建：dirty=false', (await dirty()) === false)
await page.keyboard.press('Control+s')
await page.waitForTimeout(800)
const pickerCallsAfterNew = await page.evaluate(() => window.__stub.pickerCalls)
check('无文件夹保存走 picker', pickerCallsAfterNew === 1, String(pickerCallsAfterNew))
check('无文件夹保存后 dirty=false', (await dirty()) === false)

// 5) 脏改动时新建：弹未保存确认；取消后正文与 dirty 原样
await load()
await page.locator('.editor').click()
await page.keyboard.press('Control+End')
await page.keyboard.type('别丢这句。')
await page.waitForTimeout(500)
const textBefore = await page.locator('.editor').innerText()
const dirtyBefore = await dirty()
await page.getByRole('button', { name: '文件 ▾', exact: true }).click()
await page.getByRole('menuitem', { name: '新建' }).click()
await page.waitForTimeout(500)
const dialogOpen = await page.locator('.dialog[aria-label="切换文档"]').count()
check('脏改动新建：弹出未保存确认', dialogOpen === 1)
if (dialogOpen === 1) {
  await page.locator('.dialog[aria-label="切换文档"] button', { hasText: '取消' }).click()
  await page.waitForTimeout(400)
}
const afterCancel = await page.locator('.editor').innerText()
check('取消新建：正文不变', afterCancel === textBefore)
check('取消新建：dirty 不变', (await dirty()) === dirtyBefore)

// 6) 另存为：新文件、名字更新、dirty=false
await load()
await page.locator('.editor').click()
await page.keyboard.press('Control+End')
await page.keyboard.type('另存为测试。')
await page.waitForTimeout(400)
await page.getByRole('button', { name: '文件 ▾', exact: true }).click()
await page.getByRole('menuitem', { name: '另存为…' }).click()
await page.waitForTimeout(900)
const saveAsState = await page.evaluate(async () => {
  const root = await navigator.storage.getDirectory()
  const handle = await root.getFileHandle('另存为的.md', { create: true })
  const file = await handle.getFile()
  return {
    docName: document.querySelector('.doc-name')?.textContent?.trim(),
    text: await file.text(),
    toast: document.querySelector('.toast-text')?.textContent ?? null,
  }
})
check('另存为：文件名更新', saveAsState.docName === '另存为的.md', saveAsState.docName ?? 'none')
check('另存为：新文件含正文', saveAsState.text.includes('另存为测试。'))
check('另存为：dirty=false', (await dirty()) === false)
check('另存为：提示「已保存」', (saveAsState.toast ?? '').includes('已保存'), saveAsState.toast ?? 'none')

// 7) 示例态：保存走 picker，不写示例目录
await load()
await page.getByRole('button', { name: '试用示例' }).first().click()
await page.waitForTimeout(600)
const treeBefore = await page.evaluate(() => document.querySelector('.file-tree-list')?.textContent?.trim())
await page.locator('.editor').click()
await page.keyboard.press('Control+End')
await page.keyboard.type('示例里改的字。')
await page.waitForTimeout(400)
const pickerBeforeDemo = await page.evaluate(() => window.__stub.pickerCalls)
await page.keyboard.press('Control+s')
await page.waitForTimeout(600)
// 第一次保存示例文档会先弹「保存后文件会有这些差异」，确认后再走 picker
if (await page.locator('.save-dialog').count()) {
  await page.locator('.save-dialog button', { hasText: '仍然保存' }).click()
  await page.waitForTimeout(900)
}
const pickerAfterDemo = await page.evaluate(() => window.__stub.pickerCalls)
const treeAfter = await page.evaluate(() => document.querySelector('.file-tree-list')?.textContent?.trim())
check('示例态保存走 picker', pickerAfterDemo === pickerBeforeDemo + 1, `${pickerBeforeDemo} -> ${pickerAfterDemo}`)
check('示例态保存后 dirty=false', (await dirty()) === false)
check('示例态保存不改文件树', treeAfter === treeBefore)

console.log(`\n${results.filter((item) => item.ok).length}/${results.length} PASS`)
await page.close()
await browser.close()
if (results.some((item) => !item.ok)) process.exit(1)
