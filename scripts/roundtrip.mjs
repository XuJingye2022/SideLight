import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import { MarkdownManager } from '@tiptap/markdown'
import { StarterKit } from '@tiptap/starter-kit'
import { Table, TableCell, TableHeader, TableRow } from '@tiptap/extension-table'
import { TaskItem } from '@tiptap/extension-task-item'
import { TaskList } from '@tiptap/extension-task-list'

import { extractFootnotes } from '../src/lib/footnotes.ts'
import { leadingNewlines, splitFrontmatter } from '../src/lib/frontmatter.ts'
import { escapeHtmlForParse } from '../src/lib/html.ts'
import { inlineMarks } from '../src/lib/inlineHtmlTags.ts'
import { protectMathPairs } from '../src/lib/math.ts'
import { baselineLosses } from '../src/lib/risk.ts'
import { serializeDocument } from '../src/lib/serializeDocument.ts'

const FIXTURE_DIR = 'fixtures/markdown'
const REPORT = 'docs/roundtrip-report.md'

/** 与 App 相同的表格扩展：序列化时去掉表格自带的首尾换行 */
const ReusableTable = Table.extend({
  renderMarkdown(node, helpers) {
    const parent = this.parent
    return parent.call(this, node, helpers).replace(/^\n+/, '').replace(/\n+$/, '')
  },
})

/** 与 App 相同的扩展集：表格、任务列表、行内 HTML 白名单（第 55 轮补，原本漏了 inlineMarks） */
const EXTENSIONS = [StarterKit, ...inlineMarks, ReusableTable, TableRow, TableHeader, TableCell, TaskList, TaskItem]

/** 与 App 的保存流程一致：摘 frontmatter/脚注 → 解析 → 共享 serializeDocument（含表格复用）→ 拼回 */
function throughApp(manager, source) {
  const frontmatter = splitFrontmatter(source)
  const footnotes = extractFootnotes(frontmatter.body)
  const parsed = manager.parse(escapeHtmlForParse(protectMathPairs(footnotes.body)))
  const pseudoEditor = { getMarkdown: () => manager.serialize(parsed) }
  return serializeDocument(pseudoEditor, {
    frontmatter: frontmatter.frontmatter,
    footnotes: footnotes.footnotes,
    original: source,
    leading: leadingNewlines(frontmatter.body),
  })
}

function diffLines(before, after) {
  const a = before.split('\n')
  const b = after.split('\n')
  const rows = Array.from({ length: a.length + 1 }, () => new Uint32Array(b.length + 1))
  for (let i = a.length - 1; i >= 0; i -= 1) {
    for (let j = b.length - 1; j >= 0; j -= 1) {
      rows[i][j] = a[i] === b[j] ? rows[i + 1][j + 1] + 1 : Math.max(rows[i + 1][j], rows[i][j + 1])
    }
  }
  const out = []
  let i = 0
  let j = 0
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      out.push({ kind: 'same', text: a[i] })
      i += 1
      j += 1
    } else if (rows[i + 1][j] >= rows[i][j + 1]) {
      out.push({ kind: 'removed', text: a[i] })
      i += 1
    } else {
      out.push({ kind: 'added', text: b[j] })
      j += 1
    }
  }
  while (i < a.length) {
    out.push({ kind: 'removed', text: a[i] })
    i += 1
  }
  while (j < b.length) {
    out.push({ kind: 'added', text: b[j] })
    j += 1
  }
  return out
}

const files = readdirSync(FIXTURE_DIR)
  .filter((name) => name.endsWith('.md'))
  .sort()

const results = []
for (const file of files) {
  const source = readFileSync(join(FIXTURE_DIR, file), 'utf8').replace(/\r\n/g, '\n')
  let rich = ''
  let error = ''
  try {
    const manager = new MarkdownManager({ extensions: EXTENSIONS })
    rich = throughApp(manager, source)
  } catch (failure) {
    error = String(failure && failure.message ? failure.message : failure)
  }
  const lines = error ? [] : diffLines(source, rich)
  const removed = lines.filter((line) => line.kind === 'removed').length
  const added = lines.filter((line) => line.kind === 'added').length
  const blocking = error ? [] : baselineLosses(source, rich).filter((loss) => loss.blocking)
  results.push({
    file,
    source,
    rich,
    error,
    identical: !error && source === rich && lines.every((line) => line.kind === 'same'),
    removed,
    added,
    blocking,
    lines,
  })
}

const richIntact = results.filter((row) => row.identical).length
const blocked = results.filter((row) => row.blocking.length > 0)
const report = []
report.push('# Markdown 往返损失报告')
report.push('')
report.push('这份报告由 `npm run roundtrip` 生成。三个数字分开算，不再合并成一个「保真数」：')
report.push('')
report.push('- **rich**：富文本路径，走 App 真正的保存流程（摘 frontmatter/脚注 → 解析 → 共享 `serializeDocument`，含表格整块复用）。')
report.push('- **source**：源码路径。源码模式不经过解析，`Ctrl+S` 写出的就是输入原文，按定义等值；前提是源码没有被编辑。')
report.push('- **firstSaveBlocked**：切回富文本后第一次保存是否仍被差异门拦下（基线里有 blocking 结构损失）。')
report.push('')
report.push('表格复用只保证表格行内字节；表格前后的空行仍由文档级 `\\n\\n` 决定（0/1 个空行与原文一致，≥2 个会被规范化）。')
report.push('')
report.push('## 汇总')
report.push('')
report.push(`- rich：${richIntact} 个样本完全保真（共 ${results.length} 个），共 ${results.reduce((sum, row) => sum + row.removed + row.added, 0)} 行发生变化。`)
report.push(`- source：${results.length} 个样本等值（共 ${results.length} 个；按定义，未编辑）。`)
report.push(`- firstSaveBlocked：${blocked.length} 个样本首次保存仍会被拦（共 ${results.length} 个；${blocked.map((row) => row.file).join('、') || '无'}）。`)
report.push('')
report.push('## 逐样本三栏')
report.push('')
report.push('| 样本 | rich | source | firstSaveBlocked |')
report.push('| :--- | :--- | :--- | :--- |')
for (const row of results) {
  const richCell = row.error ? `读取失败：${row.error}` : row.identical ? '完全保真' : `有变化（-${row.removed} +${row.added}）`
  const blockedCell = row.blocking.length > 0 ? `是（${row.blocking.map((loss) => loss.label).join('；')}）` : '否'
  report.push(`| ${row.file} | ${richCell} | 等值（未编辑源码） | ${blockedCell} |`)
}
report.push('')
report.push('## 富文本路径的逐行差异')
report.push('')
for (const row of results.filter((item) => !item.identical)) {
  report.push(`### ${row.file}`)
  report.push('')
  report.push('```diff')
  for (const line of row.lines) {
    if (line.kind === 'same') continue
    report.push(`${line.kind === 'removed' ? '-' : '+'} ${line.text}`)
  }
  report.push('```')
  report.push('')
}
report.push('## 已知边界')
report.push('')
report.push('- 06-task-list.md：列表项之间多 1 个空行。taskList 与 bulletList 的 schema 互斥，不修；二次往返已经收敛。')
report.push('- 01-obsidian-note.md / 02-table.md 的 rich 结果以本表为准；`npm run roundtrip` 每次重算，不写死样本数。')
report.push('')

mkdirSync('docs', { recursive: true })
writeFileSync(REPORT, `${report.join('\n')}\n`, 'utf8')

console.log('报告已写入', REPORT)
console.log(`rich: ${richIntact}/${results.length} 完全保真`)
for (const row of results) {
  console.log(`  ${row.identical ? 'ok  ' : 'diff'} ${row.file}  -${row.removed} +${row.added}${row.blocking.length ? `  首次保存拦截：${row.blocking.length}` : ''}`)
}
console.log(`source: ${results.length}/${results.length} 等值；firstSaveBlocked: ${blocked.length}/${results.length}`)
