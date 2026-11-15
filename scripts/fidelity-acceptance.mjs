import { readFileSync } from 'node:fs'

import { MarkdownManager } from '@tiptap/markdown'
import { StarterKit } from '@tiptap/starter-kit'
import { Table, TableCell, TableHeader, TableRow } from '@tiptap/extension-table'
import { TaskItem } from '@tiptap/extension-task-item'
import { TaskList } from '@tiptap/extension-task-list'
import { chromium } from 'playwright-core'

import { splitFrontmatter } from '../src/lib/frontmatter.ts'
import { extractFootnotes } from '../src/lib/footnotes.ts'
import { escapeHtmlForParse } from '../src/lib/html.ts'
import { protectMathPairs } from '../src/lib/math.ts'
import { serializeDocument, serializeDocumentBody } from '../src/lib/serializeDocument.ts'

const URL = process.env.SIDELIGHT_URL ?? 'http://localhost:5173'
const CDP = process.env.SIDELIGHT_CDP ?? 'http://127.0.0.1:9222'
const OUT = 'shots/round-10'

const results = []
const check = (label, ok, extra = '') => {
  results.push({ label, ok })
  console.log(`${ok ? 'PASS' : 'FAIL'} ${label}${extra ? ` (${extra})` : ''}`)
}

const fixture = (name) => readFileSync(`fixtures/markdown/${name}`, 'utf8').replace(/\r\n/g, '\n')

const ReusableTable = Table.extend({
  renderMarkdown(node, helpers) {
    const parent = this.parent
    return parent.call(this, node, helpers).replace(/^\n+/, '').replace(/\n+$/, '')
  },
})
const EXTENSIONS = [StarterKit, ReusableTable, TableRow, TableHeader, TableCell, TaskList, TaskItem]

/** 与 App 同一份共享序列化：三处输出都从 serializeDocument* 来 */
function outputsFor(source) {
  const manager = new MarkdownManager({ extensions: EXTENSIONS })
  const frontmatter = splitFrontmatter(source)
  const footnotes = extractFootnotes(frontmatter.body)
  const parsed = manager.parse(escapeHtmlForParse(protectMathPairs(footnotes.body)))
  const editor = { getMarkdown: () => manager.serialize(parsed) }
  const body = serializeDocumentBody(editor, source)
  const rich = serializeDocument(editor, {
    frontmatter: frontmatter.frontmatter,
    footnotes: footnotes.footnotes,
    original: source,
  })
  return { body, rich }
}

const harness = () => {
  const io = { files: {}, writes: [] }
  window.__io = io
  const handle = (name) => ({
    kind: 'file',
    name,
    async getFile() {
      return new File([io.files[name]?.text ?? ''], name, { type: 'text/markdown' })
    },
    async createWritable() {
      return {
        async write(data) {
          const text = typeof data === 'string' ? data : await data.text()
          io.writes.push({ name, text })
          io.files[name] = { text }
        },
        async close() {},
      }
    },
  })
  window.__setFile = (name, text) => {
    io.files[name] = { text }
  }
  window.__nextOpen = null
  window.showOpenFilePicker = async () => [window.__nextOpen]
  window.showSaveFilePicker = async (options) => handle(options?.suggestedName ?? '另存.md')
}

const browser = await chromium.connectOverCDP(CDP)

const openPage = async () => {
  const context = await browser.newContext({ acceptDownloads: true, viewport: { width: 1440, height: 900 } })
  const page = await context.newPage()
  await page.addInitScript(harness)
  await page.route('**/__doc', (route) => route.fulfill({ status: 404, contentType: 'application/json', body: '{"v":1,"ok":false}' }))
  await page.route('**/__draft', (route) => route.fulfill({ status: 404, body: '{}' }))
  await page.goto(URL, { waitUntil: 'networkidle' })
  await page.evaluate(() => localStorage.clear())
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForSelector('.editor', { timeout: 15000 })
  await page.waitForTimeout(400)
  return { context, page }
}

const openFile = async (page, name, text) => {
  await page.evaluate(
    ({ name, text }) => {
      window.__setFile(name, text)
      window.__nextOpen = {
        kind: 'file',
        name,
        async getFile() {
          return new File([window.__io.files[name].text], name, { type: 'text/markdown' })
        },
        async createWritable() {
          return {
            async write(data) {
              const value = typeof data === 'string' ? data : await data.text()
              window.__io.writes.push({ name, text: value })
              window.__io.files[name] = { text: value }
            },
            async close() {},
          }
        },
      }
    },
    { name, text },
  )
  await page.keyboard.press('Control+Alt+O')
  await page.waitForTimeout(800)
}

const state = (page) =>
  page.evaluate(() => ({
    mode: window.__slState?.viewMode,
    dirty: window.__slState?.dirty,
    source: document.querySelector('.source-editor')?.value ?? null,
    sourceNote: document.querySelector('.source-note')?.textContent ?? '',
    dialog: Boolean(document.querySelector('.save-dialog')),
    switchLike: document.querySelector('[aria-label="源码与原文确认"]')?.textContent ?? null,
    writes: window.__io.writes,
    editor: document.querySelector('.editor')?.textContent ?? '',
  }))
const save = async (page) => {
  await page.keyboard.press('Control+s')
  await page.waitForTimeout(700)
}

// ---------- 1) 02：三处输出逐字节相同 ----------
{
  const source = fixture('02-table.md')
  const node = outputsFor(source)
  check('02：serializeDocumentBody 逐字节等于原文', node.body === source, `${node.body.length}/${source.length}`)
  check('02：serializeDocument 逐字节等于原文', node.rich === source, `${node.rich.length}/${source.length}`)

  const { context, page } = await openPage()
  await openFile(page, '02-table.md', source)
  await save(page)
  const info = await state(page)
  check('02：App 保存不弹确认', !info.dialog)
  check('02：App 写出的字节等于原文', info.writes[0]?.text === source, `${info.writes[0]?.text.length}/${source.length}`)
  check('02：三处输出（body/rich/App）逐字节相同', node.body === source && node.rich === source && info.writes[0]?.text === source)
  await context.close()
}

// ---------- 2) 01：frontmatter 后空行保住 ----------
{
  const source = fixture('01-obsidian-note.md')
  const { context, page } = await openPage()
  await openFile(page, '01-obsidian-note.md', source)
  await save(page)
  const info = await state(page)
  check('01：保存不弹确认', !info.dialog)
  check('01：保存字节逐字节等于原文', info.writes[0]?.text === source, `${info.writes[0]?.text.length}/${source.length} ${JSON.stringify(info.writes[0]?.text.slice(-10))} vs ${JSON.stringify(source.slice(-10))}`)
  await context.close()
}

// ---------- 3) 表格改值：退让为规范格式、内容不丢、不弹确认 ----------
{
  const source = fixture('02-table.md')
  const { context, page } = await openPage()
  await openFile(page, '02-table.md', source)
  await page.locator('.editor td').first().click()
  await page.keyboard.press('End')
  await page.keyboard.type('改')
  await page.waitForTimeout(300)
  await save(page)
  const info = await state(page)
  const written = info.writes[0]?.text ?? ''
  check('02 改单元格：不弹确认', !info.dialog)
  check('02 改单元格：写出的文本保留改后的字', written.includes('房租改'), written.slice(0, 80))
  check('02 改单元格：退让为规范分隔行', written.includes('| :--- |'), written.split('\n').slice(2, 4).join(' / '))
  await page.screenshot({ path: `${OUT}/t1-table-edited.png` })
  await context.close()
}

// ---------- 4) 04：默认源码模式 + 源码 Ctrl+S 逐字节等于原文 ----------
{
  const source = fixture('04-reference-links.md')
  const { context, page } = await openPage()
  await openFile(page, '04-reference-links.md', source)
  let info = await state(page)
  check('04：载入即源码模式', info.mode === 'source', String(info.mode))
  check('04：源码框逐字节等于原文（含定义）', info.source === source, `${info.source?.length}/${source.length}`)
  check('04：源码说明条提示引用式链接', info.sourceNote.includes('引用式链接定义'), info.sourceNote.slice(0, 60))
  await save(page)
  info = await state(page)
  check('04：源码未编辑 Ctrl+S 写出字节等于原文', info.writes[0]?.text === source && (info.writes[0]?.text.length ?? 0) > 0, `${info.writes[0]?.text.length}/${source.length}`)
  await page.screenshot({ path: `${OUT}/t3-source-default.png` })

  // 源码里改字 → 点「回到富文本编辑」→ 确认框；取消不改
  await page.locator('.source-editor').fill(`${source}\n源码里新增一行。\n`)
  await page.locator('.source-note button', { hasText: '回到富文本编辑' }).click()
  await page.waitForTimeout(300)
  info = await state(page)
  check('04：源码已编辑点回富文本：弹确认框', Boolean(info.switchLike), info.switchLike?.slice(0, 40) ?? 'none')
  await page.locator('[aria-label="源码与原文确认"] button', { hasText: '取消' }).click()
  await page.waitForTimeout(300)
  info = await state(page)
  check('04：取消后仍在源码、内容不变', info.mode === 'source' && info.source?.endsWith('源码里新增一行。\n'), info.mode ?? 'none')
  check('04：取消后 dirty 仍为 true', info.dirty === true)

  await page.locator('.source-note button', { hasText: '回到富文本编辑' }).click()
  await page.waitForTimeout(300)
  await page.locator('[aria-label="源码与原文确认"] button', { hasText: '继续' }).click()
  await page.waitForTimeout(500)
  info = await state(page)
  check('04：确认后回到富文本编辑', info.mode === 'edit', String(info.mode))
  await page.keyboard.press('Control+s')
  await page.waitForTimeout(500)
  info = await state(page)
  check('04：切回富文本后首次保存仍被拦', info.dialog)
  await page.screenshot({ path: `${OUT}/t3-rich-save-blocked.png` })
  await context.close()
}

console.log(`\n${results.filter((item) => item.ok).length}/${results.length} PASS`)
await browser.close()
if (results.some((item) => !item.ok)) process.exit(1)
