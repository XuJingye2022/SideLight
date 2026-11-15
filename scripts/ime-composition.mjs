import { chromium } from 'playwright-core'

const URL = process.argv[2] ?? 'http://localhost:5173'
const CDP = process.env.SIDELIGHT_CDP ?? 'http://127.0.0.1:9222'

const results = []
const check = (label, ok, extra = '') => {
  results.push({ label, ok })
  console.log(`${ok ? 'PASS' : 'FAIL'} ${label}${extra ? ` (${extra})` : ''}`)
}

const browser = await chromium.connectOverCDP(CDP)
const context = browser.contexts()[0] ?? (await browser.newContext())
const page = await context.newPage()
const client = await context.newCDPSession(page)
await client.send('Network.enable')
await client.send('Network.setCacheDisabled', { cacheDisabled: true })
await page.setViewportSize({ width: 1440, height: 900 })
const errors = []
page.on('pageerror', (error) => errors.push(String(error)))

await page.goto(URL, { waitUntil: 'networkidle' })
await page.evaluate(() => localStorage.clear())
await page.reload({ waitUntil: 'networkidle' })
await page.waitForSelector('.doc-column .ProseMirror')
await page.waitForTimeout(400)

const count = (token) =>
  page.evaluate((value) => {
    const editor = document.querySelector('.editor')
    const textarea = document.querySelector('.source-editor')
    const text = textarea ? textarea.value : (editor?.textContent ?? '')
    return text.split(value).length - 1
  }, token)

/** 只发组合事件再提交，不改应用的输入逻辑 */
const commitIme = async (text, { commit = true } = {}) => {
  await client.send('Input.imeSetComposition', { text, selectionStart: text.length, selectionEnd: text.length })
  await page.waitForTimeout(120)
  if (commit) {
    await client.send('Input.insertText', { text })
    await page.waitForTimeout(250)
  }
}

const undo = async () => {
  await page.keyboard.press('Control+z')
  await page.waitForTimeout(300)
}

// 1) 正文
await page.locator('.editor').click()
await page.keyboard.press('Control+End')
await commitIme('组合甲')
check('正文：组合输入上屏一次', (await count('组合甲')) === 1, `count=${await count('组合甲')}`)
await undo()
check('正文：一次 Ctrl+Z 撤回整词', (await count('组合甲')) === 0, `count=${await count('组合甲')}`)

// 2) 标题
const heading = page.locator('.editor h1').first()
await heading.click()
await page.keyboard.press('End')
await commitIme('组合乙')
check('标题：组合输入上屏一次', (await count('组合乙')) === 1, `count=${await count('组合乙')}`)
await undo()
check('标题：一次 Ctrl+Z 撤回整词', (await count('组合乙')) === 0, `count=${await count('组合乙')}`)

// 3) 代码块
await page.getByRole('button', { name: '插入 ▾' }).click()
await page.waitForTimeout(200)
await page.getByRole('button', { name: '代码块', exact: true }).click()
await page.waitForTimeout(400)
await page.locator('.editor pre').first().click()
await commitIme('组合丙')
check('代码块：组合输入上屏一次', (await count('组合丙')) === 1, `count=${await count('组合丙')}`)
await undo()
check('代码块：一次 Ctrl+Z 撤回整词', (await count('组合丙')) === 0, `count=${await count('组合丙')}`)

// 4) 表格
await page.getByRole('button', { name: '插入 ▾' }).click()
await page.waitForTimeout(200)
await page.getByRole('button', { name: '表格', exact: true }).click()
await page.waitForTimeout(500)
await page.locator('.editor table td, .editor table th').first().click()
await commitIme('组合丁')
check('表格：组合输入上屏一次', (await count('组合丁')) === 1, `count=${await count('组合丁')}`)
await undo()
check('表格：一次 Ctrl+Z 撤回整词', (await count('组合丁')) === 0, `count=${await count('组合丁')}`)
await page.keyboard.press('Escape')

// 5) 源码模式
await page.getByRole('button', { name: '源码', exact: true }).click()
await page.waitForTimeout(400)
await page.locator('.source-editor').click()
await page.keyboard.press('Control+End')
await commitIme('组合戊')
check('源码：组合输入上屏一次', (await count('组合戊')) === 1, `count=${await count('组合戊')}`)
await page.locator('.source-editor').press('Control+z')
await page.waitForTimeout(300)
check('源码：一次 Ctrl+Z 撤回整词', (await count('组合戊')) === 0, `count=${await count('组合戊')}`)
await page.getByRole('button', { name: '源码', exact: true }).click()
await page.waitForTimeout(400)

// 6) 组合中按 Ctrl+S：不应写重复内容
await page.locator('.editor').click()
await page.keyboard.press('Control+End')
await commitIme('保存中', { commit: false })
await page.keyboard.press('Control+s')
await page.waitForTimeout(500)
await client.send('Input.insertText', { text: '保存中' })
await page.waitForTimeout(400)
check('组合中输入 Ctrl+S 后提交，只上屏一次', (await count('保存中')) === 1, `count=${await count('保存中')}`)

check('页面没有脚本错误', errors.length === 0, errors.slice(0, 2).join(' | '))

console.log(`\n${results.filter((item) => item.ok).length}/${results.length} PASS`)
await page.close()
await browser.close()
if (results.some((item) => !item.ok)) process.exit(1)
