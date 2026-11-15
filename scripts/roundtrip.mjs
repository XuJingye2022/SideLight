import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import { MarkdownManager } from '@tiptap/markdown'
import { StarterKit } from '@tiptap/starter-kit'
import { Table, TableCell, TableHeader, TableRow } from '@tiptap/extension-table'
import { TaskItem } from '@tiptap/extension-task-item'
import { TaskList } from '@tiptap/extension-task-list'

import { repairCalloutMarkers } from '../src/lib/escapes.ts'
import { extractFootnotes, joinFootnotes, repairFootnoteRefs } from '../src/lib/footnotes.ts'
import { joinFrontmatter, splitFrontmatter } from '../src/lib/frontmatter.ts'
import { repairHtml, escapeHtmlForParse } from '../src/lib/html.ts'
import { protectMathPairs, repairMath } from '../src/lib/math.ts'

const FIXTURE_DIR = 'fixtures/markdown'
const REPORT = 'docs/roundtrip-report.md'

const EXTENSIONS = [StarterKit, Table, TableRow, TableHeader, TableCell, TaskList, TaskItem]

const CONFIGS = [
  { id: 'base', label: '仅 StarterKit', extensions: [StarterKit], pipeline: false },
  { id: 'extended', label: 'StarterKit + 表格 + 任务列表', extensions: EXTENSIONS, pipeline: false },
  { id: 'app', label: '当前应用（扩展 + 保真修复）', extensions: EXTENSIONS, pipeline: true },
]

/** 与 App 里保存流程一致：先摘 frontmatter 与脚注，再解析，序列化后修复，最后拼回 */
function throughApp(manager, source) {
  const fm = splitFrontmatter(source)
  const fn = extractFootnotes(fm.body)
  const serialized = manager.serialize(manager.parse(escapeHtmlForParse(protectMathPairs(fn.body))))
  const repaired = repairCalloutMarkers(repairHtml(repairMath(repairFootnoteRefs(serialized))))
  return joinFrontmatter(fm.frontmatter, joinFootnotes(repaired, fn.footnotes))
}

function normalize(text) {
  return text.replace(/\r\n/g, '\n').replace(/\s+$/, '')
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

for (const config of CONFIGS) {
  const manager = new MarkdownManager({ extensions: config.extensions })
  for (const file of files) {
    const source = normalize(readFileSync(join(FIXTURE_DIR, file), 'utf8'))
    let roundtripped = ''
    let error = ''
    try {
      roundtripped = normalize(config.pipeline ? throughApp(manager, source) : manager.serialize(manager.parse(source)))
    } catch (failure) {
      error = String(failure && failure.message ? failure.message : failure)
    }
    const lines = error ? [] : diffLines(source, roundtripped)
    results.push({
      config: config.id,
      file,
      identical: !error && lines.every((line) => line.kind === 'same'),
      error,
      removed: lines.filter((line) => line.kind === 'removed').length,
      added: lines.filter((line) => line.kind === 'added').length,
      lines,
    })
  }
}

const report = []
report.push('# Markdown 往返损失报告')
report.push('')
report.push('这份报告由 `npm run roundtrip` 生成。它把 `fixtures/markdown/` 里的真实样本读进编辑器内核，再写回 Markdown，逐行对比差异。')
report.push('')
report.push('「当前应用」这一列走的是 App 真正的保存流程：摘掉 frontmatter 与脚注定义、把行内标签的尖括号转成实体、解析、序列化、还原被转义的脚注引用、行内 HTML 与 callout 标记，最后把摘掉的块拼回。')
report.push('')
report.push('只差空行的样本仍算「有变化」，因为空行影响排版；判断内容有没有丢，看 diff 里有没有正文行。')
report.push('')
report.push('## 结论')
report.push('')
for (const config of CONFIGS) {
  const rows = results.filter((row) => row.config === config.id)
  const intact = rows.filter((row) => row.identical).length
  const changedLines = rows.reduce((sum, row) => sum + row.removed + row.added, 0)
  report.push(`- ${config.label}：${intact} / ${rows.length} 个样本完全保真，共 ${changedLines} 行发生变化。`)
}
report.push('')

for (const config of CONFIGS) {
  report.push(`## ${config.label}`)
  report.push('')
  report.push('| 样本 | 结果 | 删除行 | 新增行 |')
  report.push('| :--- | :--- | ---: | ---: |')
  for (const row of results.filter((item) => item.config === config.id)) {
    const status = row.error ? `读取失败：${row.error}` : row.identical ? '完全保真' : '有变化'
    report.push(`| ${row.file} | ${status} | ${row.removed} | ${row.added} |`)
  }
  report.push('')

  for (const row of results.filter((item) => item.config === config.id && !item.identical)) {
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
}

mkdirSync('docs', { recursive: true })
writeFileSync(REPORT, `${report.join('\n')}\n`, 'utf8')

console.log('报告已写入', REPORT)
for (const config of CONFIGS) {
  const rows = results.filter((row) => row.config === config.id)
  const intact = rows.filter((row) => row.identical).length
  console.log(`${config.label}: ${intact}/${rows.length} 完全保真`)
  for (const row of rows) {
    console.log(`  ${row.identical ? 'ok  ' : 'diff'} ${row.file}  -${row.removed} +${row.added}`)
  }
}
