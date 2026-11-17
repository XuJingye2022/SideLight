import { readNode, type WorkspaceFileNode } from './workspace.ts'

/** 单个文件的搜索上限：1 MiB（按 UTF-8 字节算，不是字符数） */
export const MAX_SEARCH_BYTES = 1024 * 1024
/** 一次最多读多少个文件：几千个文件的工作区不该为一次搜索全部读盘 */
export const MAX_SEARCH_FILES = 200
/** 一次最多返回多少条命中；超出的不列，标记 truncated */
export const MAX_SEARCH_HITS = 200
/** 结果行片段最多显示多少个字符 */
const SNIPPET_CHARS = 96

/** 待搜文档：path 与 WorkspaceFileNode.path 同一口径（首段是工作区名） */
export type SearchDoc = { path: string; text: string }

export type SearchHit = {
  path: string
  /** 1 起算的行号 */
  line: number
  /** 1 起算的列号（UTF-16 码元，与浏览器选区同一口径） */
  column: number
  /** 命中所在行的片段：去首尾空白，过长截断 */
  snippet: string
}

export type SearchLimits = {
  maxResults?: number
  maxFiles?: number
  maxBytes?: number
  /** 默认不区分大小写，与查找条的默认档一致 */
  caseSensitive?: boolean
}

export type SearchReport = {
  hits: SearchHit[]
  /** 命中数或文件数撞到上限：结果不全 */
  truncated: boolean
  /** 实际搜过的文档数 */
  scanned: number
  /** 因为超过 maxBytes 没搜的文档数 */
  oversized: number
}

export type CollectedDocs = {
  docs: SearchDoc[]
  /** 读不到（没句柄、被删、没权限）或超过 1 MiB 而跳过的文件数 */
  skipped: number
  /** 文件数超过上限，只读了前面这些 */
  capped: boolean
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * 按 UTF-8 字节判上限。先走字符数快路径：1 个字符最多 3 字节，
 * 只有接近上限时才真的编码，避免为几百 KB 的 ASCII 建一份完整副本。
 */
function overBytes(text: string, maxBytes: number): boolean {
  if (text.length > maxBytes) return true
  if (text.length * 3 <= maxBytes) return false
  return new TextEncoder().encode(text).byteLength > maxBytes
}

function snippetOf(line: string): string {
  const text = line.trim()
  return text.length <= SNIPPET_CHARS ? text : `${text.slice(0, SNIPPET_CHARS)}…`
}

/**
 * 纯函数：在一批文档里逐行找同一个词，返回行列号与行片段。
 * 行号从 1 开始；同一行出现多次就有多条命中；每行最多不设限，只受 maxResults 约束。
 */
export function searchWorkspace(
  docs: SearchDoc[],
  query: string,
  limits: SearchLimits = {},
): SearchReport {
  const report: SearchReport = { hits: [], truncated: false, scanned: 0, oversized: 0 }
  const needle = query.trim()
  if (needle === '') return report

  const maxResults = limits.maxResults ?? MAX_SEARCH_HITS
  const maxFiles = limits.maxFiles ?? MAX_SEARCH_FILES
  const maxBytes = limits.maxBytes ?? MAX_SEARCH_BYTES
  // 正则只用来定位：转义后就是字面量，i 开关处理大小写（比先转小写更安全，长度不会变）
  const pattern = new RegExp(escapeRegExp(needle), limits.caseSensitive ? 'g' : 'gi')

  for (const doc of docs) {
    if (report.scanned >= maxFiles) {
      report.truncated = true
      break
    }
    if (overBytes(doc.text, maxBytes)) {
      report.oversized += 1
      continue
    }
    report.scanned += 1

    const lines = doc.text.split(/\r\n|\n|\r/)
    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index]
      // matchAll 会克隆正则，不会污染 lastIndex；行内所有出现都记一条
      for (const match of line.matchAll(pattern)) {
        report.hits.push({
          path: doc.path,
          line: index + 1,
          column: (match.index ?? 0) + 1,
          snippet: snippetOf(line),
        })
        if (report.hits.length >= maxResults) {
          report.truncated = true
          return report
        }
      }
    }
  }

  return report
}

/**
 * 按工作区顺序读文件正文。逐个 try/catch：一个文件读不到（没句柄、被删、没权限、
 * 超过 1 MiB）只跳过它，整次搜索照常进行。
 */
export async function collectDocs(
  files: WorkspaceFileNode[],
  limits: SearchLimits = {},
): Promise<CollectedDocs> {
  const maxFiles = limits.maxFiles ?? MAX_SEARCH_FILES
  const maxBytes = limits.maxBytes ?? MAX_SEARCH_BYTES
  const docs: SearchDoc[] = []
  let skipped = 0

  for (const file of files.slice(0, maxFiles)) {
    try {
      const text = await readNode(file)
      if (overBytes(text, maxBytes)) {
        skipped += 1
        continue
      }
      docs.push({ path: file.path, text })
    } catch {
      skipped += 1
    }
  }

  return { docs, skipped, capped: files.length > maxFiles }
}
