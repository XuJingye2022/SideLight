import { diffLines } from './diff.ts'

/**
 * 保存前的结构损失分类。
 * 判定分两段：载入时先记下「原文 vs 编辑器序列化」已有的损失（基线），
 * 保存时只拦「基线里存在、当前仍命中同一结构位置」的那几条，正常编辑不弹框。
 */
export type LossKind =
  | 'reference-links'
  | 'table-separator'
  | 'footnote-continuation'
  | 'footnote-loss'
  | 'math-escape'
  | 'html-ampersand'
  | 'autolink'
  | 'html-comment'
  | 'hard-break'
  | 'trailing-newline'
  | 'blank-lines'

export type Loss = {
  kind: LossKind
  /** 同一结构位置的稳定标识，基线与此后用它对上 */
  key: string
  label: string
  /** 拦截保存的损失；等价改写（硬换行、末尾换行、空行）不拦 */
  blocking: boolean
  before: string[]
  after: string[]
  count: number
}

type FenceState = { line: string; fenced: boolean }

/** 逐行标注是否在 ``` / ~~~ 代码块内：代码块里的“引用式链接”不是链接 */
export function fenceMap(text: string): FenceState[] {
  let marker: string | null = null
  return text.replace(/\r\n?/g, '\n').split('\n').map((line) => {
    const match = /^\s*(`{3,}|~{3,})/.exec(line)
    if (match) {
      if (marker === null) marker = match[1][0]
      else if (match[1][0] === marker) marker = null
    }
    return { line, fenced: marker !== null && !match }
  })
}

const REF_DEFINITION = /^\[([^\]^][^\]]*)\]:\s*(\S.*)$/
export const TABLE_SEPARATOR = /^\s*\|?(?:\s*:?-{3,}:?\s*\|)+\s*:?-*:?\s*\|?\s*$/
const AUTOLINK = /<(https?:\/\/[^>\s]+)>/
const HTML_COMMENT = /<!--([\s\S]*?)-->/g

function splitCells(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim().replace(/\s+/g, ' '))
}

function referenceLosses(before: FenceState[], afterText: string): Loss[] {
  const afterIds = new Set<string>()
  for (const { line, fenced } of fenceMap(afterText)) {
    if (fenced) continue
    const match = REF_DEFINITION.exec(line)
    if (match) afterIds.add(match[1].trim())
  }
  const losses: Loss[] = []
  for (const { line, fenced } of before) {
    if (fenced) continue
    const match = REF_DEFINITION.exec(line)
    if (!match) continue
    const id = match[1].trim()
    const url = match[2].trim()
    if (afterIds.has(id)) continue
    // 用户把整段连同定义一起删掉时 URL 也消失，不算序列化损失；只有 URL 还在、定义没了才是被改写
    if (!afterText.includes(url)) continue
    losses.push({
      kind: 'reference-links',
      key: `ref:${id}`,
      label: `引用式链接定义 [${id}]: … 会被丢掉，正文里的链接会被改写成行内形式`,
      blocking: true,
      before: [line.trim()],
      after: [],
      count: 1,
    })
  }
  return losses
}

function tableLosses(beforeText: string, afterText: string): Loss[] {
  const collect = (text: string) => {
    const lines = text.replace(/\r\n?/g, '\n').split('\n')
    const fenced = fenceMap(text)
    const tables = new Map<string, { separator: string }>()
    for (let index = 1; index < lines.length; index += 1) {
      if (fenced[index].fenced) continue
      const separator = lines[index]
      if (!TABLE_SEPARATOR.test(separator)) continue
      const header = lines[index - 1]
      if (!header.includes('|')) continue
      const key = splitCells(header).join('|')
      if (!key) continue
      if (!tables.has(key)) tables.set(key, { separator: separator.trim() })
    }
    return tables
  }

  const after = collect(afterText)
  const losses: Loss[] = []
  for (const [key, table] of collect(beforeText)) {
    const current = after.get(key)
    if (!current) continue // 用户删了表格/改了表头，不算结构损失
    if (current.separator === table.separator) continue
    losses.push({
      kind: 'table-separator',
      key: `table:${key}`,
      label: '表格分隔行会被重排（列宽与对齐写法变化，单元格内容不动）',
      blocking: false,
      before: [table.separator],
      after: [current.separator],
      count: 1,
    })
  }
  return losses
}

function footnoteLosses(beforeText: string, afterText: string): Loss[] {
  // 一次扫描同时收集定义（含续行）与正文引用；围栏代码内跳过。
  const scan = (text: string) => {
    const fenced = fenceMap(text)
    const lines = text.replace(/\r\n?/g, '\n').split('\n')
    const definitions = new Map<string, string[]>()
    const references = new Set<string>()
    let current: string | null = null
    for (let index = 0; index < lines.length; index += 1) {
      if (fenced[index].fenced) {
        current = null
        continue
      }
      const match = /^\[\^([^\]]+)\]:/.exec(lines[index])
      if (match) {
        current = match[1].trim()
        definitions.set(current, [])
        continue
      }
      if (current !== null && /^(?: {4,}|\t)\S/.test(lines[index])) {
        definitions.get(current)?.push(lines[index].trim())
        continue
      }
      current = null
      for (const ref of lines[index].matchAll(/\[\^([^\]\s]+)\](?!:)/g)) references.add(ref[1].trim())
    }
    return { definitions, references }
  }

  const before = scan(beforeText)
  const after = scan(afterText)
  const losses: Loss[] = []
  for (const [id, continuation] of before.definitions) {
    // 只在「原文有定义、正文仍有引用、保存后定义消失」时拦截；
    // 用户把引用与定义一起删掉，不拦。
    if (!after.definitions.has(id) && before.references.has(id) && after.references.has(id)) {
      losses.push({
        kind: 'footnote-loss',
        key: `footnote-loss:${id}`,
        label: `脚注 [^${id}] 的定义在保存后会消失（正文还在引用它）`,
        blocking: true,
        before: [`[^${id}]: …`],
        after: [],
        count: 1,
      })
    }
    const current = after.definitions.get(id)
    if (!current || continuation.length === 0) continue
    const missing = continuation.filter((line) => !current.includes(line))
    if (missing.length === 0) continue
    losses.push({
      kind: 'footnote-continuation',
      key: `footnote:${id}`,
      label: `脚注 [^${id}] 的多行续行会被并成一行或丢掉`,
      blocking: true,
      before: missing,
      after: current,
      count: missing.length,
    })
  }
  return losses
}

function mathLosses(beforeText: string, afterText: string): Loss[] {
  const count = (text: string, pattern: RegExp) => (text.match(pattern) ?? []).length
  const losses: Loss[] = []
  const escapedBefore = count(beforeText, /\\\$/g)
  const escapedAfter = count(afterText, /\\\$/g)
  if (escapedBefore > escapedAfter) {
    losses.push({
      kind: 'math-escape',
      key: 'math:escaped-dollar',
      label: '公式里的 \\$ 转义在保存后会消失',
      blocking: true,
      before: ['\\$'],
      after: [],
      count: escapedBefore - escapedAfter,
    })
  }
  const envBefore = count(beforeText, /\\begin\{/g)
  const envAfter = count(afterText, /\\begin\{/g)
  if (envBefore > envAfter) {
    losses.push({
      kind: 'math-escape',
      key: 'math:begin-env',
      label: '公式环境（\\begin{…}）在保存后会消失',
      blocking: true,
      before: ['\\begin{'],
      after: [],
      count: envBefore - envAfter,
    })
  }
  return losses
}
function htmlLosses(beforeText: string, afterText: string): Loss[] {
  const afterLines = new Set(fenceMap(afterText).filter((item) => !item.fenced).map((item) => item.line.trim()))
  const losses: Loss[] = []
  const seen = new Set<string>()
  for (const { line, fenced } of fenceMap(beforeText)) {
    if (fenced) continue
    const trimmed = line.trim()
    if (!trimmed || !trimmed.includes('<') || !trimmed.includes('>')) continue

    if (/<[a-zA-Z][^>]*&[^>]*>/.test(trimmed)) {
      const key = `html-amp:${trimmed}`
      if (seen.has(key)) continue
      seen.add(key)
      const escaped = trimmed.replace(/&/g, '&amp;')
      if (!afterLines.has(trimmed)) {
        losses.push({
          kind: 'html-ampersand',
          key,
          label: '含 & 的行内 HTML 会被转义（& 变 &amp;）',
          blocking: true,
          before: [trimmed],
          after: afterLines.has(escaped) ? [escaped] : [],
          count: 1,
        })
      }
    }

    const autolink = AUTOLINK.exec(trimmed)
    if (autolink) {
      const url = autolink[1]
      const key = `auto:${url}`
      if (!seen.has(key) && !afterLines.has(trimmed)) {
        seen.add(key)
        losses.push({
          kind: 'autolink',
          key,
          label: `自动链接 <${url}> 会被改写`,
          blocking: true,
          before: [trimmed],
          after: [],
          count: 1,
        })
      }
    }
  }

  const beforeComments = [...beforeText.matchAll(HTML_COMMENT)].map((match) => match[0])
  const afterTextNoCr = afterText
  for (const comment of beforeComments) {
    if (afterTextNoCr.includes(comment)) continue
    losses.push({
      kind: 'html-comment',
      key: `comment:${comment.slice(0, 40)}`,
      label: 'HTML 注释会被丢掉',
      blocking: true,
      before: [comment.replace(/\s+/g, ' ').slice(0, 80)],
      after: [],
      count: 1,
    })
  }
  return losses
}

function hardBreakLosses(beforeText: string, afterText: string): Loss[] {
  const afterLines = new Set(fenceMap(afterText).filter((item) => !item.fenced).map((item) => item.line.trim()))
  const losses: Loss[] = []
  for (const { line, fenced } of fenceMap(beforeText)) {
    if (fenced) continue
    const trimmed = line.trim()
    if (!trimmed.endsWith('\\')) continue
    const without = trimmed.slice(0, -1).trimEnd()
    if (afterLines.has(trimmed) || without.length === 0) continue
    losses.push({
      kind: 'hard-break',
      key: `break:${without.slice(0, 60)}`,
      label: '行末的 `\\` 硬换行会被规范成普通换行（等价改写）',
      blocking: false,
      before: [trimmed],
      after: [without],
      count: 1,
    })
  }
  return losses
}

/** 含引用式链接定义（代码围栏内不算）：决定载入后是否默认进源码模式 */
export function hasReferenceDefinitions(text: string): boolean {
  return countReferenceDefinitions(text) > 0
}

/** 引用式链接定义条数（代码围栏内不算） */
export function countReferenceDefinitions(text: string): number {
  return fenceMap(text).filter(({ line, fenced }) => !fenced && REF_DEFINITION.test(line)).length
}

/** 分类一段「原文 → 当前文本」里丢了什么；纯函数，可单测 */
export function classify(before: string, after: string): Loss[] {
  const beforeText = before.replace(/\r\n?/g, '\n')
  const afterText = after.replace(/\r\n?/g, '\n')
  const fenced = fenceMap(beforeText)
  const losses: Loss[] = [
    ...referenceLosses(fenced, afterText),
    ...tableLosses(beforeText, afterText),
    ...footnoteLosses(beforeText, afterText),
    ...mathLosses(beforeText, afterText),
    ...htmlLosses(beforeText, afterText),
    ...hardBreakLosses(beforeText, afterText),
  ]

  if (beforeText.endsWith('\n') && !afterText.endsWith('\n')) {
    losses.push({
      kind: 'trailing-newline',
      key: 'eof:newline',
      label: '末尾换行会被补回（保存时会自动补）',
      blocking: false,
      before: ['\\n'],
      after: [],
      count: 1,
    })
  }

  const blank = diffLines(beforeText, afterText).filter((line) => line.kind !== 'same' && line.text.trim() === '')
  if (blank.length > 0) {
    losses.push({
      kind: 'blank-lines',
      key: 'blank-lines',
      label: `空行有 ${blank.length} 处增删（等价改写）`,
      blocking: false,
      before: [],
      after: [],
      count: blank.length,
    })
  }

  return losses
}

/** 载入时先记一次基线：原文 vs 编辑器序列化，只有这些结构以后才可能被拦 */
export function baselineLosses(original: string, serialized: string): Loss[] {
  return classify(original, serialized).filter((loss) => loss.blocking)
}

/**
 * 保存时要拦的损失：基线里存在、当前仍命中同一个结构位置。
 * 基线为空（新建/普通文档）永远返回空数组，正常编辑不弹框。
 */
export function activeLosses(original: string, current: string, baseline: Loss[]): Loss[] {
  if (baseline.length === 0) return []
  const baselineKeys = new Set(baseline.map((loss) => `${loss.kind}:${loss.key}`))
  return classify(original, current).filter(
    (loss) => loss.blocking && baselineKeys.has(`${loss.kind}:${loss.key}`),
  )
}

export function lossLabels(losses: Loss[]): string[] {
  const seen = new Set<string>()
  const labels: string[] = []
  for (const loss of losses) {
    if (seen.has(loss.label)) continue
    seen.add(loss.label)
    labels.push(loss.label)
  }
  return labels
}
