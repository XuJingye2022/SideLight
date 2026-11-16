import { chromium } from 'playwright-core'
import { mkdtemp, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const URL = process.argv[2] ?? 'http://localhost:5173'
const CDP = process.env.SIDELIGHT_CDP ?? 'http://127.0.0.1:9222'

const results = []
const check = (label, ok, extra = '') => {
  results.push({ label, ok })
  console.log(`${ok ? 'PASS' : 'FAIL'} ${label}${extra ? ` (${extra})` : ''}`)
}

const stubScript = () => {
  const state = { saveCalls: 0, openCalls: 0, dirCalls: 0 }
  Object.defineProperty(window, '__stub', { value: state, configurable: true })
  const newName = () => `另存-${state.saveCalls}.md`
  Object.defineProperty(window, 'showSaveFilePicker', {
    configurable: true,
    writable: true,
    value: async () => {
      state.saveCalls += 1
      const root = await navigator.storage.getDirectory()
      return root.getFileHandle(newName(), { create: true })
    },
  })
  Object.defineProperty(window, 'showOpenFilePicker', {
    configurable: true,
    writable: true,
    value: async () => {
      state.openCalls += 1
      const root = await navigator.storage.getDirectory()
      const handle = await root.getFileHandle('打开的文件.md', { create: true })
      const writable = await handle.createWritable()
      await writable.write('# 打开的文件\n\n用快捷分键打开。\n')
      await writable.close()
      return [handle]
    },
  })
  Object.defineProperty(window, 'showDirectoryPicker', {
    configurable: true,
    writable: true,
    value: async () => {
      state.dirCalls += 1
      const root = await navigator.storage.getDirectory()
      await root.removeEntry('快捷键文件夹', { recursive: true }).catch(() => {})
      const dir = await root.getDirectoryHandle('快捷键文件夹', { create: true })
      const handle = await dir.getFileHandle('已有.md', { create: true })
      return dir
    },
  })
}

const browser = await chromium.connectOverCDP(CDP)
const context = await browser.newContext()
const page = await context.newPage()
const client = await context.newCDPSession(page)
await client.send('Network.enable')
await client.send('Network.setCacheDisabled', { cacheDisabled: true })
await page.addInitScript(stubScript)
await page.setViewportSize({ width: 1440, height: 900 })
const downloads = []
page.on('download', (download) => downloads.push(download))
const errors = []
page.on('pageerror', (error) => errors.push(String(error)))

await page.goto(URL, { waitUntil: 'networkidle' })
await page.evaluate(() => localStorage.clear())
await page.reload({ waitUntil: 'networkidle' })
await page.waitForSelector('.doc-column .ProseMirror')
await page.waitForTimeout(400)

const active = () =>
  page.evaluate(() => {
    const el = document.activeElement
    return {
      tag: el?.tagName ?? null,
      cls: el?.className ?? null,
      text: (el?.textContent ?? '').trim().slice(0, 16),
      id: el?.id ?? null,
    }
  })
const pickerCalls = () => page.evaluate(() => window.__stub.saveCalls)
const dialogCount = () => page.locator('[role="dialog"]').count()

/** 把保存差异框 / 切换确认框处理掉，脚本里的快捷键才不会被 dialogOpen 吞掉 */
const settle = async () => {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    if (await page.locator('.save-dialog').count()) {
      await page.locator('.save-dialog button', { hasText: '仍然保存' }).click()
      await page.waitForTimeout(800)
      continue
    }
    if (await page.locator('.dialog[aria-label="切换文档"]').count()) {
      await page.locator('.dialog[aria-label="切换文档"] button', { hasText: '不保存' }).click()
      await page.waitForTimeout(500)
      continue
    }
    if (await page.locator('.shortcuts-dialog').count()) {
      await page.keyboard.press('Escape')
      await page.waitForTimeout(300)
      continue
    }
    break
  }
}

// 1) skip link：自动聚焦正文后第一下 Tab 仍到 skip link；正文中间 Tab 不劫持
const autoFocus = await page.evaluate(() => document.activeElement?.classList?.contains('ProseMirror'))
check('首屏自动聚焦正文', autoFocus === true)
await page.keyboard.press('Tab')
const autoTab = await active()
check('自动聚焦后第一次 Tab = skip link', (autoTab.cls ?? '').includes('skip-link'), autoTab.cls ?? 'none')
const editorBox = await page.locator('.ProseMirror').boundingBox()
if (editorBox) {
  await page.mouse.click(editorBox.x + 40, editorBox.y + 28)
  await page.keyboard.press('End')
  await page.waitForTimeout(300)
}
await page.evaluate(() => {
  window.__middleTabPrevented = null
  document.addEventListener(
    'keydown',
    (event) => {
      if (event.key === 'Tab') window.__middleTabPrevented = event.defaultPrevented
    },
    { once: true },
  )
})
const middleState = await page.evaluate(() => ({
  focused: document.activeElement?.classList?.contains('ProseMirror'),
  anchor: window.getSelection()?.anchorOffset,
  text: window.getSelection()?.anchorNode?.textContent?.slice(0, 8),
}))
check('正文中间 Tab 前焦点在正文', middleState.focused === true, JSON.stringify(middleState))
await page.keyboard.press('Tab')
const middleTab = await page.evaluate(() => window.__middleTabPrevented)
const middleCtx = await page.evaluate(() => window.__tabCtx)
check('正文中间 Tab 由编辑器接管（插入空格）', middleTab === true, String(middleTab))

// 1b) skip link：Enter 进正文
await page.locator('.skip-link').focus()
await page.screenshot({ path: 'shots/round-05/t1-skip.png' })
await page.keyboard.press('Enter')
await page.waitForTimeout(200)
const afterEnter = await page.evaluate(() => ({
  id: document.activeElement?.id ?? null,
  insideEditor: Boolean(document.querySelector('#editor')?.contains(document.activeElement)),
  tag: document.activeElement?.tagName ?? null,
}))
check('skip link 后焦点在 #editor 内', afterEnter.id === 'editor' || afterEnter.insideEditor, JSON.stringify(afterEnter))

// 2) Ctrl+Alt+S 另存为；Ctrl+S 再写同一文件
const beforeSave = await pickerCalls()
await page.keyboard.press('Control+Alt+S')
await page.waitForTimeout(900)
const afterSaveAs = await pickerCalls()
const saveState = await page.evaluate(() => ({
  name: document.querySelector('.doc-name')?.textContent?.trim(),
  strike: document.querySelectorAll('.editor s').length,
  toast: document.querySelector('.toast-text')?.textContent ?? null,
  dirty: window.__slState?.dirty,
}))
check('Ctrl+Alt+S 调 picker', afterSaveAs === beforeSave + 1, `${beforeSave} -> ${afterSaveAs}`)
check('Ctrl+Alt+S 后正文无 <s>', saveState.strike === 0)
check('Ctrl+Alt+S 后文档名变化', (saveState.name ?? '').startsWith('另存-'), saveState.name ?? 'none')
check('Ctrl+Alt+S 后 dirty=false', saveState.dirty === false)
const afterSaveAsCalls = await pickerCalls()
await page.keyboard.press('Control+s')
await page.waitForTimeout(700)
check('Ctrl+S 写回当前文件、不再弹 picker', (await pickerCalls()) === afterSaveAsCalls, `${afterSaveAsCalls} -> ${await pickerCalls()}`)

// 3) Ctrl+Shift+S：不划线、不保存、不提示
const beforeShiftS = await pickerCalls()
const toastBefore = await page.evaluate(() => document.querySelector('.toast-text')?.textContent ?? null)
await page.locator('.editor').click()
await page.locator('.editor').press('Control+End')
await page.keyboard.type('划掉的句子')
await page.waitForTimeout(300)
await page.keyboard.press('Control+Shift+S')
await page.waitForTimeout(600)
const shiftS = await page.evaluate(() => ({
  strike: document.querySelectorAll('.editor s').length,
  toast: document.querySelector('.toast-text')?.textContent ?? null,
}))
check('Ctrl+Shift+S 不划删除线', shiftS.strike === 0, String(shiftS.strike))
check('Ctrl+Shift+S 不调 picker', (await pickerCalls()) === beforeShiftS)
check(
  'Ctrl+Shift+S 不出现新的已保存/已取消提示',
  shiftS.toast === toastBefore,
  shiftS.toast ?? 'none',
)

// 4) Ctrl+Alt+N 新建；脏文档先确认
// 先把上一段打字保存掉，回到干净状态
await page.keyboard.press('Control+s')
await page.waitForTimeout(700)
await page.keyboard.press('Control+Alt+N')
await page.waitForTimeout(600)
const newDoc = await page.evaluate(() => ({
  name: document.querySelector('.doc-name')?.textContent?.trim(),
  body: document.querySelector('.editor')?.textContent?.trim(),
  dirty: window.__slState?.dirty,
  focused: document.activeElement?.classList?.contains('ProseMirror'),
}))
check('Ctrl+Alt+N 得到空 未命名.md', newDoc.name === '未命名.md' && newDoc.body === '', JSON.stringify(newDoc))
check('Ctrl+Alt+N 后 dirty=false', newDoc.dirty === false)
check('Ctrl+Alt+N 后焦点在正文', newDoc.focused === true)
await page.keyboard.type('先写脏它')
await page.waitForTimeout(400)
await page.keyboard.press('Control+Alt+N')
await page.waitForTimeout(400)
check('脏文档 Ctrl+Alt+N 弹未保存确认', (await dialogCount()) === 1)
if ((await dialogCount()) === 1) {
  await page.locator('.dialog[aria-label="切换文档"] button', { hasText: '取消' }).click()
  await page.waitForTimeout(300)
}
// 保存一次（差异框会弹出，确认它），回到干净状态
await page.keyboard.press('Control+s')
await page.waitForTimeout(500)
await settle()

// 5) 打开文件 / 打开文件夹
const openBefore = await page.evaluate(() => window.__stub.openCalls)
await page.keyboard.press('Control+Alt+O')
await page.waitForTimeout(800)
check('Ctrl+Alt+O 调用打开文件 picker', (await page.evaluate(() => window.__stub.openCalls)) === openBefore + 1)
const dirBefore = await page.evaluate(() => window.__stub.dirCalls)
await page.keyboard.press('Control+Alt+Shift+O')
await page.waitForTimeout(900)
check('Ctrl+Alt+Shift+O 调用打开文件夹 picker', (await page.evaluate(() => window.__stub.dirCalls)) === dirBefore + 1)

// 6) Ctrl+Alt+E 打开导出菜单，焦点在第一项；ArrowDown+Enter 下载
await settle()
await page.keyboard.press('Escape')
await page.waitForTimeout(200)
await page.keyboard.press('Control+Alt+E')
await page.waitForTimeout(400)
const exportFocus = await page.evaluate(() => ({
  menu: document.querySelectorAll('.export-menu').length,
  text: (document.activeElement?.textContent ?? '').trim(),
}))
check('Ctrl+Alt+E 打开导出菜单且焦点在第一项', exportFocus.menu === 1 && exportFocus.text === 'HTML', JSON.stringify(exportFocus))
const downloadsBefore = downloads.length
await page.keyboard.press('ArrowDown')
await page.keyboard.press('Enter')
await page.waitForTimeout(900)
check('导出菜单 ArrowDown+Enter 触发下载', downloads.length === downloadsBefore + 1, `${downloadsBefore} -> ${downloads.length}`)

// 7) 文件菜单键盘：焦点、方向键、Esc 归还、动作后回触发器
await page.locator('.file-menu-trigger').focus()
await page.keyboard.press('Enter')
await page.waitForTimeout(300)
const menuOpen = await page.evaluate(() => ({
  count: document.querySelectorAll('.file-menu').length,
  first: (document.activeElement?.textContent ?? '').trim(),
}))
check('文件菜单打开后焦点进第一项', menuOpen.count === 1 && (menuOpen.first ?? '').startsWith('新建'), JSON.stringify(menuOpen))
await page.screenshot({ path: 'shots/round-05/t1-filemenu.png' })
await page.keyboard.press('ArrowDown')
await page.waitForTimeout(150)
const second = await page.evaluate(() => (document.activeElement?.textContent ?? '').trim())
check('方向键在菜单项之间移动', (second ?? '').startsWith('另存为'), second)
await page.keyboard.press('Escape')
await page.waitForTimeout(250)
const escFocus = await page.evaluate(() => ({
  menu: document.querySelectorAll('.file-menu').length,
  focused: document.activeElement?.classList?.contains('file-menu-trigger'),
}))
check('Esc 关闭菜单且焦点回「文件」按钮', escFocus.menu === 0 && escFocus.focused === true)
await page.keyboard.press('Enter')
await page.waitForTimeout(250)
await page.keyboard.press('ArrowDown')
await page.keyboard.press('Enter')
await page.waitForTimeout(800)
const afterAction = await page.evaluate(() => ({
  menu: document.querySelectorAll('.file-menu').length,
  focused: document.activeElement?.classList?.contains('file-menu-trigger'),
}))
check('选「另存为」后回触发器', afterAction.menu === 0 && afterAction.focused === true, JSON.stringify(afterAction))

// 8) opener 随对话框卸载时，Esc 后焦点不落 body
await page.getByRole('button', { name: '设置', exact: true }).click()
await page.waitForTimeout(400)
await page.locator('[role="dialog"]').getByRole('button', { name: '快捷键', exact: true }).click()
await page.waitForTimeout(400)
await page.keyboard.press('Escape')
await page.waitForTimeout(300)
const fallbackFocus = await page.evaluate(() => ({
  body: document.activeElement === document.body,
  cls: document.activeElement?.className ?? null,
}))
check('opener 已卸载时 Esc 后焦点不落 body', fallbackFocus.body === false, JSON.stringify(fallbackFocus))

// 9) ? 打开一览、Esc 归还；正文输入 ? 不弹
await page.evaluate(() => document.body.focus())
await page.keyboard.press('?')
await page.waitForTimeout(400)
check('? 打开快捷键一览', (await page.locator('.shortcuts-dialog').count()) === 1)
await page.screenshot({ path: 'shots/round-05/t1-shortcuts.png' })
await page.keyboard.press('Escape')
await page.waitForTimeout(300)
check('快捷键一览 Esc 关闭', (await page.locator('.shortcuts-dialog').count()) === 0)
await page.locator('.editor').click()
await page.locator('.editor').press('Control+End')
await page.keyboard.type('正文里的问号?')
await page.waitForTimeout(300)
const typingState = await page.evaluate(() => ({
  dialog: document.querySelectorAll('.shortcuts-dialog').length,
  text: document.querySelector('.editor')?.textContent?.includes('正文里的问号?'),
}))
check('正文输入 ? 不弹一览', typingState.dialog === 0 && typingState.text === true, JSON.stringify(typingState))

// 10) 纯键盘 E2E：新建 → 写 → 保存 → 导出 HTML
await settle()
await page.keyboard.press('Control+Alt+N')
await page.waitForTimeout(600)
// 脏文档会先确认；选「不保存」继续新建
if (await page.locator('.dialog[aria-label="切换文档"]').count()) {
  await page.locator('.dialog[aria-label="切换文档"] button', { hasText: '不保存' }).click()
  await page.waitForTimeout(600)
}
await page.keyboard.type('键盘链路-KB')
await page.waitForTimeout(400)
await page.keyboard.press('Control+s')
await page.waitForTimeout(600)
await settle()
await page.keyboard.press('Control+Alt+E')
await page.waitForTimeout(400)
// 第一项就是 HTML
await page.keyboard.press('Enter')
await page.waitForTimeout(900)
const last = downloads[downloads.length - 1]
let e2eText = ''
if (last) {
  const dir = await mkdtemp(join(tmpdir(), 'sl-kb-'))
  const file = join(dir, last.suggestedFilename())
  await last.saveAs(file)
  e2eText = await readFile(file, 'utf8')
}
check('纯键盘 E2E 导出 HTML 含正文', e2eText.includes('键盘链路-KB'), e2eText ? last?.suggestedFilename() : 'no-download')
check('页面没有脚本错误', errors.length === 0, errors.slice(0, 2).join(' | '))

// F4：Tab 插入两个空格并保持焦点；表格里保留默认 Tab
await page.locator('.ProseMirror').click()
await page.keyboard.press('Control+End')
await page.keyboard.press('Tab')
await page.keyboard.type('XYZ')
const tabText = await page.locator('.ProseMirror').innerText()
check('Tab 后输入 XYZ 正文含 XYZ', tabText.includes('XYZ'), tabText.slice(-20))
await page.getByRole('button', { name: /插入/ }).click()
await page.getByRole('button', { name: '表格', exact: true }).click()
await page.waitForTimeout(300)
const firstCell = page.locator('.ProseMirror td, .ProseMirror th').first()
await firstCell.click()
const beforeCell = await firstCell.innerText()
await page.keyboard.press('Tab')
await page.keyboard.type('Q')
const afterCell = await firstCell.innerText()
check('表格 Tab 不插空格', afterCell === beforeCell && !afterCell.startsWith('  '), JSON.stringify({ beforeCell, afterCell }))

// T3：正文名称、错误 toast 单一 live region、aria-hidden 内无焦点
const editorName = await page.evaluate(() => document.querySelector('.tiptap')?.getAttribute('aria-label') ?? '')
check('正文编辑器有 aria-label', editorName.length > 0, editorName)
await page.evaluate(() => {
  window.showSaveFilePicker = async () => {
    throw new DOMException('模拟保存失败', 'NotAllowedError')
  }
})
await page.locator('.file-menu-trigger').click()
await page.getByRole('menuitem', { name: /另存为/ }).click()
await page.waitForTimeout(800)
const toastA11y = await page.evaluate(() => ({
  alert: document.querySelector('.toast [role="alert"]')?.textContent?.trim() ?? '',
  liveCount: document.querySelectorAll('.toast [role="alert"], .toast [role="status"]').length,
  hiddenFocusable: document.querySelectorAll('[aria-hidden="true"] button, [aria-hidden="true"] input, [aria-hidden="true"] a[href]').length,
  group: Boolean(document.querySelector('.toast [role="group"]')),
}))
check('保存失败进入 role=alert 且含原因', toastA11y.alert.includes('保存失败'), JSON.stringify(toastA11y))
check('一次 notice 只有一个 live region', toastA11y.liveCount === 1, String(toastA11y.liveCount))
check('toast 按钮在 role=group 且 aria-hidden 内无焦点元素', toastA11y.group && toastA11y.hiddenFocusable === 0, JSON.stringify(toastA11y))

console.log(`\n${results.filter((item) => item.ok).length}/${results.length} PASS`)
await page.close()
await context.close()
await browser.close()
if (results.some((item) => !item.ok)) process.exit(1)
