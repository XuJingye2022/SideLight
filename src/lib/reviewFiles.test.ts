import assert from 'node:assert/strict'
import test from 'node:test'

import { applyLiveReviewRow, reviewTruncatedNote, REVIEW_MAX_ROWS, type ReviewFilesResult } from './reviewFiles.ts'
import { collectReviewFiles } from './reviewScan.ts'
import type { Workspace, WorkspaceFileNode } from './workspace.ts'

/* ---------- 假 FSA：按 files 键前缀判目录，create / write 都记进 ops ---------- */
/* 键是不带工作区名的根相对路径（真 FSA 的根句柄就是这样），树的 path 才带 ws/ 首段 */

type FakeFs = { root: FileSystemDirectoryHandle; ops: string[] }

function makeFs(entries: Record<string, string>): FakeFs {
  const files = new Map<string, string>(Object.entries(entries))
  const ops: string[] = []
  const prefixOf = (dirPath: string) => (dirPath ? `${dirPath}/` : '')

  const fileHandle = (path: string): FileSystemFileHandle => {
    const name = path.split('/').pop() ?? path
    return {
      kind: 'file',
      name,
      async getFile() {
        return {
          name,
          size: (files.get(path) ?? '').length,
          lastModified: 0,
          async text() {
            return files.get(path) ?? ''
          },
        }
      },
      async createWritable() {
        let buffer = ''
        return {
          async write(data: unknown) {
            ops.push(`write:${path}`)
            buffer += typeof data === 'string' ? data : String(data)
            files.set(path, buffer)
          },
          async close() {},
          async abort() {},
        }
      },
    } as unknown as FileSystemFileHandle
  }

  const dirHandle = (dirPath: string): FileSystemDirectoryHandle =>
    ({
      kind: 'directory',
      name: dirPath ? (dirPath.split('/').pop() ?? dirPath) : 'ws',
      async getFileHandle(name: string, options: { create?: boolean } = {}) {
        const path = prefixOf(dirPath) + name
        if (!files.has(path)) {
          if (!options.create) throw new DOMException('not found', 'NotFoundError')
          ops.push(`create:${path}`)
          files.set(path, '')
        }
        return fileHandle(path)
      },
      async getDirectoryHandle(name: string, options: { create?: boolean } = {}) {
        const path = prefixOf(dirPath) + name
        const exists = [...files.keys()].some((key) => key.startsWith(`${path}/`))
        if (!exists) {
          if (!options.create) throw new DOMException('not found', 'NotFoundError')
          ops.push(`create:${path}`)
        }
        return dirHandle(path)
      },
    }) as unknown as FileSystemDirectoryHandle

  return { root: dirHandle(''), ops }
}

/* ---------- 批注档与工作区夹具 ---------- */

type StoredAnn = {
  id: string
  kind: 'evaluation'
  status: 'pending' | 'accepted' | 'dismissed'
  from: number
  to: number
  quote: string
  note: string
  priority: 'none'
  reviewStatus?: string
}

/** 一条批注：给了 reviewStatus 就是新档，不给就是旧档（按内部 status 迁移） */
function ann(status: StoredAnn['status'], reviewStatus?: string, id = `${status}-${reviewStatus ?? 'legacy'}`): StoredAnn {
  return {
    id,
    kind: 'evaluation',
    status,
    from: 1,
    to: 2,
    quote: '引文',
    note: '说明',
    priority: 'none',
    ...(reviewStatus === undefined ? {} : { reviewStatus }),
  }
}

/** 批注档正文；默认 v2 结构，notes 可选 */
function store(annotations: StoredAnn[], notes: unknown[] = []): string {
  return JSON.stringify({ v: 2, annotations, notes })
}

const node = (path: string): WorkspaceFileNode => ({ kind: 'file', name: path.split('/').pop() ?? path, path, handle: null })
const workspaceOf = (rootHandle: FileSystemDirectoryHandle | null): Workspace => ({ name: 'ws', root: null, rootHandle })

/** 一个文件一份批注档，供上限类用例批量造夹具 */
function manyEntries(count: number): { entries: Record<string, string>; files: WorkspaceFileNode[] } {
  const entries: Record<string, string> = {}
  const files: WorkspaceFileNode[] = []
  for (let index = 0; index < count; index += 1) {
    const stem = `f${String(index).padStart(3, '0')}`
    entries[`.sidelight/annotations/${stem}.json`] = store([ann('pending', 'open', stem)])
    files.push(node(`ws/${stem}.md`))
  }
  return { entries, files }
}

/* ---------- 用例 ---------- */

test('open / in-progress / resolved 三档：只把 open 算进 open，total 是 3', async () => {
  const fs = makeFs({
    '.sidelight/annotations/a.json': store([
      ann('pending', 'open', '1'),
      ann('pending', 'in-progress', '2'),
      ann('pending', 'resolved', '3'),
    ]),
  })
  const result = await collectReviewFiles(workspaceOf(fs.root), [node('ws/a.md')])
  assert.deepEqual(result.rows, [{ path: 'ws/a.md', name: 'a.md', open: 1, total: 3 }])
  assert.equal(result.scanned, 1)
  assert.equal(result.capped, false)
  assert.equal(result.truncated, false)
})

test('旧档全结项（accepted / dismissed）不入列；旧 pending 按迁移表算 open', async () => {
  const fs = makeFs({
    '.sidelight/annotations/a.json': store([ann('accepted'), ann('dismissed')]),
    '.sidelight/annotations/b.json': store([ann('pending')]),
  })
  const result = await collectReviewFiles(workspaceOf(fs.root), [node('ws/a.md'), node('ws/b.md')])
  assert.deepEqual(
    result.rows.map((row) => [row.name, row.open, row.total]),
    [['b.md', 1, 1]],
  )
  assert.equal(result.scanned, 2)
})

test('全部 wont-fix 不入列（已结项的档不造行）', async () => {
  const fs = makeFs({
    '.sidelight/annotations/a.json': store([ann('dismissed', 'wont-fix', 'a1'), ann('dismissed', 'wont-fix', 'a2')]),
    '.sidelight/annotations/b.json': store([ann('pending', 'open', 'b1')]),
  })
  const result = await collectReviewFiles(workspaceOf(fs.root), [node('ws/a.md'), node('ws/b.md')])
  assert.deepEqual(
    result.rows.map((row) => [row.name, row.open, row.total]),
    [['b.md', 1, 1]],
  )
})

test('只有 in-progress：入列且 open 0；排序里排在 open 1 之后（open 降序）', async () => {
  const fs = makeFs({
    '.sidelight/annotations/a.json': store([ann('pending', 'in-progress', 'a1'), ann('pending', 'in-progress', 'a2')]),
    '.sidelight/annotations/b.json': store([ann('pending', 'open', 'b1')]),
  })
  const result = await collectReviewFiles(workspaceOf(fs.root), [node('ws/a.md'), node('ws/b.md')])
  assert.deepEqual(
    result.rows.map((row) => [row.name, row.open, row.total]),
    [
      ['b.md', 1, 1],
      ['a.md', 0, 2],
    ],
  )
  assert.equal(result.scanned, 2)
})

test('只有 notes 的档、坏 JSON、没有批注档的文件都不入列', async () => {
  const fs = makeFs({
    '.sidelight/annotations/notes.json': store([], [{ id: 'n1', kind: 'overall', note: '总评', createdAt: 0 }]),
    '.sidelight/annotations/broken.json': '{ 不是 JSON',
    'b.md': '正文',
    'c.md': '正文',
  })
  const result = await collectReviewFiles(workspaceOf(fs.root), [
    node('ws/notes.md'),
    node('ws/broken.md'),
    node('ws/b.md'),
    node('ws/c.md'),
  ])
  assert.deepEqual(result.rows, [])
  assert.equal(result.scanned, 4)
})

test('工作区根句柄为空：parentDirectory 拿不到目录，全部跳过', async () => {
  const fs = makeFs({ '.sidelight/annotations/a.json': store([ann('pending', 'open')]) })
  const result = await collectReviewFiles(workspaceOf(null), [node('ws/a.md')])
  assert.deepEqual(result.rows, [])
  assert.equal(result.scanned, 1)
})

test('parentDirectory 抛错：跳过该目录的文件，不抛异常', async () => {
  const workspace: Workspace = {
    name: 'ws',
    root: null,
    get rootHandle(): FileSystemDirectoryHandle {
      throw new Error('句柄没了')
    },
  }
  const result = await collectReviewFiles(workspace, [node('ws/a.md'), node('ws/sub/b.md')])
  assert.deepEqual(result.rows, [])
  assert.equal(result.scanned, 2)
})

test('子目录不存在：只跳过那篇，根目录的文件照常入列', async () => {
  const fs = makeFs({ '.sidelight/annotations/a.json': store([ann('pending', 'open')]) })
  const result = await collectReviewFiles(workspaceOf(fs.root), [node('ws/a.md'), node('ws/sub/b.md')])
  assert.deepEqual(
    result.rows.map((row) => row.path),
    ['ws/a.md'],
  )
})

test('嵌套目录：子目录里的批注档按 sub 目录读，path 原样保留', async () => {
  const fs = makeFs({
    'sub/.sidelight/annotations/b.json': store([ann('pending', 'open', '1'), ann('pending', 'wont-fix', '2')]),
  })
  const result = await collectReviewFiles(workspaceOf(fs.root), [node('ws/sub/b.md')])
  assert.deepEqual(result.rows, [{ path: 'ws/sub/b.md', name: 'b.md', open: 1, total: 2 }])
})

test('排序：open 降序、同数按 path 升序；全结项的 d.md 不出现', async () => {
  const fs = makeFs({
    '.sidelight/annotations/b.json': store([ann('pending', 'open', 'b1')]),
    '.sidelight/annotations/a.json': store([ann('pending', 'open', 'a1')]),
    '.sidelight/annotations/c.json': store([
      ann('pending', 'open', 'c1'),
      ann('pending', 'open', 'c2'),
      ann('pending', 'in-progress', 'c3'),
    ]),
    '.sidelight/annotations/d.json': store([ann('pending', 'resolved', 'd1')]),
  })
  const result = await collectReviewFiles(workspaceOf(fs.root), [
    node('ws/b.md'),
    node('ws/a.md'),
    node('ws/d.md'),
    node('ws/c.md'),
  ])
  assert.deepEqual(
    result.rows.map((row) => [row.name, row.open]),
    [
      ['c.md', 2],
      ['a.md', 1],
      ['b.md', 1],
    ],
  )
})

test('201 个文件：只扫前 200 个（capped），扫到的行再按 maxRows 截 50（truncated）', async () => {
  const { entries, files } = manyEntries(201)
  const fs = makeFs(entries)
  const result = await collectReviewFiles(workspaceOf(fs.root), files)
  assert.equal(result.capped, true)
  assert.equal(result.truncated, true)
  assert.equal(result.scanned, 200)
  assert.equal(result.rows.length, 50)
  // 前 200 个文件都有一份 open 批注：排序后首行是 f000.md
  assert.equal(result.rows[0].path, 'ws/f000.md')
})

test('60 个文件：返回 50 行 + truncated，扫过 60 个', async () => {
  const { entries, files } = manyEntries(60)
  const fs = makeFs(entries)
  const result = await collectReviewFiles(workspaceOf(fs.root), files)
  assert.equal(result.scanned, 60)
  assert.equal(result.capped, false)
  assert.equal(result.truncated, true)
  assert.equal(result.rows.length, 50)
})

test('只读：扫描包含已有批注档的工作区，create / write 都是 0 次', async () => {
  const fs = makeFs({
    '.sidelight/annotations/a.json': store([ann('pending', 'open')]),
  })
  const result = await collectReviewFiles(workspaceOf(fs.root), [node('ws/a.md')])
  assert.equal(result.rows.length, 1)
  assert.deepEqual(fs.ops, [])
})

test('空文件列表：rows 0、scanned 0、两个上限都不触发', async () => {
  const fs = makeFs({})
  const result = await collectReviewFiles(workspaceOf(fs.root), [])
  assert.deepEqual(result, { rows: [], scanned: 0, capped: false, truncated: false })
})

test('两个上限可调：maxFiles 1 / maxRows 1 各自生效', async () => {
  const fs = makeFs({
    '.sidelight/annotations/a.json': store([ann('pending', 'open', 'a1')]),
    '.sidelight/annotations/b.json': store([ann('pending', 'open', 'b1')]),
  })
  const files = [node('ws/a.md'), node('ws/b.md')]
  const byFiles = await collectReviewFiles(workspaceOf(fs.root), files, { maxFiles: 1 })
  assert.equal(byFiles.scanned, 1)
  assert.equal(byFiles.capped, true)

  const byRows = await collectReviewFiles(workspaceOf(fs.root), files, { maxRows: 1 })
  assert.equal(byRows.rows.length, 1)
  assert.equal(byRows.truncated, true)
  assert.equal(byRows.capped, false)
})

/* ---------- 第 103 轮：当前篇那一行以内存为准（渲染时合并） ---------- */

/** 直接造一份扫描结果，不经过假 FSA：合并只认 rows 与 truncated */
const resultOf = (rows: ReviewFilesResult['rows'], truncated = false): ReviewFilesResult => ({
  rows,
  scanned: rows.length,
  capped: false,
  truncated,
})

test('合并：同 path 的行换成内存值并按 open 重排，其他行与 truncated 不动', () => {
  const result = resultOf([
    { path: 'ws/a.md', name: 'a.md', open: 1, total: 2 },
    { path: 'ws/b.md', name: 'b.md', open: 1, total: 1 },
  ])
  // 内存里那张只剩 in-progress（open 0）：磁盘还是 open 1，合并后 a.md 必须掉到 b.md 后面
  const merged = applyLiveReviewRow(result, { path: 'ws/a.md', name: 'a.md', open: 0, total: 2 })
  assert.deepEqual(merged.rows, [
    { path: 'ws/b.md', name: 'b.md', open: 1, total: 1 },
    { path: 'ws/a.md', name: 'a.md', open: 0, total: 2 },
  ])
  assert.equal(merged.scanned, 2)
  assert.equal(merged.truncated, false)
  // 纯函数：不改入参
  assert.equal(result.rows[0].open, 1)
})

test('合并：磁盘还没有这篇时补一行（新批注不到 600 ms 未落盘）', () => {
  const result = resultOf([{ path: 'ws/b.md', name: 'b.md', open: 1, total: 2 }])
  const merged = applyLiveReviewRow(result, { path: 'ws/a.md', name: 'a.md', open: 2, total: 3 })
  assert.deepEqual(
    merged.rows.map((row) => [row.path, row.open, row.total]),
    [
      ['ws/a.md', 2, 3],
      ['ws/b.md', 1, 2],
    ],
  )
})

test('合并：当前篇全结项（liveClosed）只删行，不补行、不重排、不回填第 51 行', () => {
  const result = resultOf([
    { path: 'ws/a.md', name: 'a.md', open: 1, total: 2 },
    { path: 'ws/b.md', name: 'b.md', open: 1, total: 1 },
  ])
  // 磁盘档还写着 open（600 ms 防抖未落盘）：只删这一行，其余行与顺序不动
  const merged = applyLiveReviewRow(result, { path: 'ws/a.md', name: 'a.md', open: 0, total: 2 }, true)
  assert.deepEqual(merged.rows, [{ path: 'ws/b.md', name: 'b.md', open: 1, total: 1 }])
  assert.equal(merged.truncated, false)
  // 磁盘没有这一行时也不补
  const absent = applyLiveReviewRow(result, { path: 'ws/zzz.md', name: 'zzz.md', open: 0, total: 2 }, true)
  assert.equal(absent.rows.length, 2)

  // 50 行已截断：删掉其中一行后不把第 51 行顶回来，truncated 保持
  const rows = Array.from({ length: 50 }, (_, index) => {
    const stem = `f${String(index).padStart(3, '0')}`
    return { path: `ws/${stem}.md`, name: `${stem}.md`, open: 1, total: 1 }
  })
  const full = applyLiveReviewRow(resultOf(rows, true), { path: 'ws/f010.md', name: 'f010.md', open: 0, total: 1 }, true)
  assert.equal(full.rows.length, 49)
  assert.equal(full.truncated, true)
  assert.equal(full.rows.at(-1)?.path, 'ws/f049.md')
  // 纯函数：不改入参
  assert.equal(result.rows.length, 2)
})

test('合并：内存 total 为 0 或没有当前篇时原样返回，磁盘行不动', () => {
  const result = resultOf([{ path: 'ws/a.md', name: 'a.md', open: 1, total: 2 }])
  assert.equal(applyLiveReviewRow(result, { path: 'ws/a.md', name: 'a.md', open: 0, total: 0 }), result)
  assert.equal(applyLiveReviewRow(result, null), result)
})

test('合并：50 行上限仍然生效，截掉的行数与 truncated 同 collect 口径', () => {
  const rows = Array.from({ length: 50 }, (_, index) => {
    const stem = `f${String(index).padStart(3, '0')}`
    return { path: `ws/${stem}.md`, name: `${stem}.md`, open: 0, total: 1 }
  })
  const result = resultOf(rows, true)
  // 已满 50 行、换掉其中一行：长度仍 50、truncated 保持
  const replaced = applyLiveReviewRow(result, { path: 'ws/f000.md', name: 'f000.md', open: 3, total: 3 })
  assert.equal(replaced.rows.length, 50)
  assert.equal(replaced.truncated, true)
  assert.deepEqual(replaced.rows[0], { path: 'ws/f000.md', name: 'f000.md', open: 3, total: 3 })
  // 磁盘没有的新行：51 行截回 50，open 最大的那条留下
  const added = applyLiveReviewRow(result, { path: 'ws/zzz.md', name: 'zzz.md', open: 9, total: 9 })
  assert.equal(added.rows.length, 50)
  assert.equal(added.truncated, true)
  assert.equal(added.rows[0].path, 'ws/zzz.md')
  // 截断的永远是尾部：第 50 行原样留着
  assert.equal(added.rows.at(-1)?.path, 'ws/f048.md')
})

/* ---------- 第 133 轮：截断提示写固定上限，与 LIVE 行删除解耦 ---------- */

/** 提示的逐字文案：只在这里写一次，避免几条用例各写一份字面量 */
const TRUNCATED_NOTE = '在审文件太多，最多显示 50 篇。'

/** 50 行整（上限满行、截断成立）的扫描结果夹具 */
const fiftyRows = (): ReviewFilesResult['rows'] =>
  Array.from({ length: 50 }, (_, index) => {
    const stem = `f${String(index).padStart(3, '0')}`
    return { path: `ws/${stem}.md`, name: `${stem}.md`, open: 1, total: 1 }
  })

test('截断提示：50 行截断时逐字写「最多显示 50 篇」，REVIEW_MAX_ROWS 是 50', () => {
  const note = reviewTruncatedNote(resultOf(fiftyRows(), true))
  assert.equal(note, TRUNCATED_NOTE)
  assert.equal(REVIEW_MAX_ROWS, 50)
})

test('截断提示：当前篇结项删行（50→49）后文案与 50 行截断逐字相等', () => {
  assert.equal(reviewTruncatedNote(resultOf(fiftyRows(), true)), TRUNCATED_NOTE)
  const closed = applyLiveReviewRow(resultOf(fiftyRows(), true), { path: 'ws/f010.md', name: 'f010.md', open: 0, total: 1 }, true)
  assert.equal(closed.rows.length, 49)
  assert.equal(closed.truncated, true)
  // 不写第二个字面量：与同一函数在同一夹具上的 50 行结果比
  assert.equal(reviewTruncatedNote(closed), reviewTruncatedNote(resultOf(fiftyRows(), true)))
  assert.equal(reviewTruncatedNote(closed), TRUNCATED_NOTE)
})

test('截断提示：60 篇假 FSA 截成 50 行时含「50 篇」；未截断返回 null', async () => {
  const { entries, files } = manyEntries(60)
  const result = await collectReviewFiles(workspaceOf(makeFs(entries).root), files)
  assert.equal(result.rows.length, 50)
  assert.equal(result.truncated, true)
  const note = reviewTruncatedNote(result)
  assert.ok(note?.includes('50 篇'), `期望文案含「50 篇」，实际 ${note}`)
  assert.equal(reviewTruncatedNote(resultOf(result.rows, false)), null)
})
