// 用法：node scripts/shot.mjs [url] [--out 输出路径]
// 默认写 .tmp/shots/shot.png（.tmp/ 已忽略），不再覆盖 shots/round-01/ 里的历史证据。
import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'

import { chromium } from 'playwright-core'

const args = process.argv.slice(2)
const outAt = args.findIndex((arg) => arg === '--out')
const out = outAt >= 0 && args[outAt + 1] ? args[outAt + 1] : '.tmp/shots/shot.png'
const url = args.find((arg, index) => !arg.startsWith('--') && index !== outAt + 1) ?? 'http://localhost:5173'
mkdirSync(dirname(out), { recursive: true })

const browser = await chromium.connectOverCDP('http://127.0.0.1:9222')
const context = browser.contexts()[0] ?? (await browser.newContext())
const page = await context.newPage()
await page.setViewportSize({ width: 1440, height: 900 })

const errors = []
page.on('console', (message) => {
  if (message.type() === 'error' && !message.text().includes('favicon')) errors.push(message.text())
})
page.on('pageerror', (error) => errors.push(String(error)))
page.on('dialog', (dialog) => void dialog.accept('E=mc^2'))

await page.goto(url, { waitUntil: 'networkidle' })
await page.evaluate(() => localStorage.clear())
await page.reload({ waitUntil: 'networkidle' })
await page.waitForSelector('.doc-column .ProseMirror', { timeout: 15000 })
await page.waitForTimeout(400)

// 1. 工具栏插入行内公式
await page.getByRole('button', { name: '插入 ▾' }).click()
await page.waitForTimeout(200)
await page.getByRole('button', { name: '公式', exact: true }).click()
// 惰性 KaTeX 可能在插入后才加载；等排版态出现，不用固定 600ms
await page.waitForSelector('.editor .katex', { timeout: 10000 })
await page.waitForFunction(() => !document.querySelector('.math-pending'), null, { timeout: 10000 })
const before = await page.locator('.editor .katex').count()
console.log('katex nodes:', before)
console.log('cursor in math:', await page.locator('.Tiptap-mathematics-render, .tiptap-mathematics-render').count())

// 2. 直接把光标放到末尾，敲一段货币文字，确认没有多出公式
await page.locator('.editor').click()
await page.keyboard.press('Control+End')
await page.keyboard.type(' 价格 $5 到 $10 之间。')
await page.waitForTimeout(500)
const after = await page.locator('.editor .katex').count()
console.log('katex after currency:', after)
console.log('katex delta:', after - before)
console.log('editor text tail:', (await page.locator('.editor').innerText()).slice(-40).replace(/\n/g, ' '))
await page.screenshot({ path: out })
console.log(`shot: ${out}`)

// 3. 源码模式里公式语法原样
await page.getByRole('button', { name: '源码', exact: true }).click()
await page.waitForTimeout(400)
const source = await page.locator('.source-editor').inputValue()
console.log('source has inline math:', source.includes('$E=mc^2$'))
console.log('source has currency:', source.includes('$5 到 $10'))
await page.getByRole('button', { name: '源码', exact: true }).click()
await page.waitForTimeout(300)

console.log('console errors:', errors.length ? errors : 'none')

await page.close()
await browser.close()
