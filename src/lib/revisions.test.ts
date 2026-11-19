import assert from 'node:assert/strict'
import test from 'node:test'

import type { Annotation, DocNote, TextIndex } from './annotations.ts'
import {
  MAX_REVISIONS,
  REVISIONS_DIR,
  buildRevision,
  migrateAnnotations,
  migrationOf,
  parseRevision,
  pruneRevisions,
  revisionDigest,
  serializeRevision,
  writeRevision,
} from './revisions.ts'

// ---------- 内存里的假目录（带 entries()，抄 cache.test.ts 并补异步迭代） ----------

type FakeFile = { text: string }
type FakeDir = {
  name: string
  dirs: Map<string, FakeDir>
  files: Map<string, FakeFile>
  handle: FileSystemDirectoryHandle
}

function notFound(name: string): DOMException {
  return new DOMException(`找不到 ${name}`, 'NotFoundError')
}

function fakeFileHandle(name: string, file: FakeFile): FileSystemFileHandle {
  let buffer = file.text
  return {
    name,
    kind: 'file',
    async getFile(): Promise<File> {
      return { name, text: async () => file.text, size: file.text.length } as unknown as File
    },
    async createWritable(): Promise<FileSystemWritableFileStream> {
      buffer = file.text
      return {
        async write(chunk: string) {
          buffer = String(chunk)
        },
        async close() {
          file.text = buffer
        },
        async abort() {
          file.text = buffer
        },
      } as unknown as FileSystemWritableFileStream
    },
  } as unknown as FileSystemFileHandle
}

function fakeDir(name = ''): FakeDir {
  const dirs = new Map<string, FakeDir>()
  const files = new Map<string, FakeFile>()

  const handle = {
    name,
    kind: 'directory',
    async getDirectoryHandle(child: string, options?: { create?: boolean }): Promise<FileSystemDirectoryHandle> {
      const existing = dirs.get(child)
      if (existing) return existing.handle
      if (!options?.create) throw notFound(child)
      const created = fakeDir(child)
      dirs.set(child, created)
      return created.handle
    },
    async getFileHandle(child: string, options?: { create?: boolean }): Promise<FileSystemFileHandle> {
      let existing = files.get(child)
      if (!existing) {
        if (!options?.create) throw notFound(child)
        existing = { text: '' }
        files.set(child, existing)
      }
      return fakeFileHandle(child, existing)
    },
    async removeEntry(child: string): Promise<void> {
      if (files.delete(child)) return
      if (dirs.delete(child)) return
      throw notFound(child)
    },
    async *entries(): AsyncGenerator<[string, FileSystemHandle]> {
      for (const [child, dir] of dirs) yield [child, dir.handle]
      for (const [child, file] of files) yield [child, fakeFileHandle(child, file)]
    },
  }

  return { name, dirs, files, handle: handle as unknown as FileSystemDirectoryHandle }
}

function revisionsOf(root: FakeDir): FakeDir | undefined {
  return root.dirs.get('.sidelight')?.dirs.get(REVISIONS_DIR)
}

function indexOf(text: string, start = 1): TextIndex {
  return { text, positions: Array.from({ length: text.length }, (_, at) => start + at) }
}

const note: DocNote = { id: 'n1', kind: 'overall', note: '总评', createdAt: 1 }
const item: Annotation = {
  id: 'a1',
  kind: 'evaluation',
  status: 'pending',
  reviewStatus: 'open',
  from: 1,
  to: 4,
  quote: '第一段',
  note: '看看这句',
  priority: 'high',
}

// ---------- revisionDigest ----------

test('digest 是 8 位十六进制，同键同文本稳定', () => {
  const first = revisionDigest('a', '正文')
  assert.match(first, /^[0-9a-f]{8}$/)
  assert.equal(revisionDigest('a', '正文'), first)
})

test('同文本不同键不撞 id（键进哈希）', () => {
  assert.notEqual(revisionDigest('a', '正文'), revisionDigest('b', '正文'))
})

test('字面量换行与 CRLF 不是同一份正文', () => {
  assert.notEqual(revisionDigest('a', '甲\n乙'), revisionDigest('a', '甲\r\n乙'))
})

// ---------- buildRevision / 解析 ----------

test('快照字段就这七个，正文不落盘', () => {
  const revision = buildRevision('a', '甲乙\n丙', [item], [note], 1_700_000_000_000)
  assert.equal(revision.v, 1)
  assert.equal(revision.id, revisionDigest('a', '甲乙\n丙'))
  assert.equal(revision.key, 'a')
  assert.equal(revision.savedAt, 1_700_000_000_000)
  assert.deepEqual(Object.keys(revision).sort(), ['annotations', 'bytes', 'id', 'key', 'notes', 'savedAt', 'v'])
  assert.equal(serializeRevision(revision).includes('甲乙'), false)
})

test('bytes 按写盘文本算 UTF-8 字节，不按 digest 文本', () => {
  const lf = buildRevision('a', '甲\n乙', [], [], 1)
  assert.equal(lf.bytes, 7) // 3 + 1 + 3
  const crlf = buildRevision('a', '甲\n乙', [], [], 1, '甲\r\n乙')
  assert.equal(crlf.bytes, 8)
  assert.equal(crlf.id, lf.id) // digest 仍看 LF 规范形
})

test('往返保留批注与 notes，旧条目补齐 priority / reviewStatus', () => {
  const legacy = { ...item } as Record<string, unknown>
  delete legacy.priority
  delete legacy.reviewStatus
  const raw = serializeRevision(
    buildRevision('a', '正文', [legacy as unknown as Annotation], [note], 7),
  )
  const parsed = parseRevision(raw)
  assert.ok(parsed)
  assert.equal(parsed.savedAt, 7)
  assert.equal(parsed.annotations.length, 1)
  assert.equal(parsed.annotations[0].priority, 'none')
  assert.equal(parsed.annotations[0].reviewStatus, 'open')
  assert.equal(parsed.annotations[0].note, '看看这句')
  assert.equal(parsed.notes[0].note, '总评')
})

test('坏 JSON / v 不是 1 / 缺 id 都当没有', () => {
  assert.equal(parseRevision(null), null)
  assert.equal(parseRevision(''), null)
  assert.equal(parseRevision('{'), null)
  assert.equal(parseRevision(JSON.stringify({ v: 2, id: 'x', key: 'a' })), null)
  assert.equal(parseRevision(JSON.stringify({ v: 1, key: 'a', annotations: [], notes: [] })), null)
  assert.equal(parseRevision(JSON.stringify({ v: 1, id: '', key: 'a' })), null)
})

// ---------- pruneRevisions ----------

test('同键超过份额时删最旧，别的键不动', () => {
  const entries = [
    ...Array.from({ length: 9 }, (_, at) => ({ name: `r${at}.json`, key: 'a', savedAt: at })),
    { name: 'b0.json', key: 'b', savedAt: 0 },
  ]
  const removed = pruneRevisions(entries, 'a', MAX_REVISIONS)
  assert.deepEqual(removed, ['r0.json'])
  assert.deepEqual(pruneRevisions(entries, 'b', MAX_REVISIONS), [])
  assert.deepEqual(pruneRevisions(entries.slice(0, 8), 'a'), [])
})

test('刚到份额不删；keep 必留（哪怕它是最旧的）', () => {
  const entries = Array.from({ length: 9 }, (_, at) => ({ name: `r${at}.json`, key: 'a', savedAt: at }))
  assert.deepEqual(pruneRevisions(entries, 'a', 9), [])
  const removed = pruneRevisions(entries, 'a', 2, 'r0.json')
  assert.equal(removed.includes('r0.json'), false)
  assert.equal(removed.length, 7)
})

// ---------- migrationOf ----------

test('引文中间插 1 字：编辑点与 +1 长度差', () => {
  const oldIndex = indexOf('甲乙丙丁')
  const newIndex = indexOf('甲乙X丙丁')
  assert.deepEqual(migrationOf(oldIndex, newIndex, 10, 11), { changeStart: 3, delta: 1 })
})

test('删 1 字：delta 为负', () => {
  const oldIndex = indexOf('甲乙丙丁')
  const newIndex = indexOf('甲乙丁')
  const move = migrationOf(oldIndex, newIndex, 10, 9)
  assert.deepEqual(move, { changeStart: 3, delta: -1 })
})

test('跨块（含换行）不认，回 null', () => {
  const oldIndex = indexOf('甲乙\n丙')
  const newIndex = indexOf('甲丙\n乙')
  assert.equal(migrationOf(oldIndex, newIndex, 10, 10), null)
})

test('变化段超过 512 字不认', () => {
  const oldIndex = indexOf('a'.repeat(1024))
  const newIndex = indexOf('b'.repeat(1024))
  assert.equal(migrationOf(oldIndex, newIndex, 2000, 2000), null)
})

test('纯追加到末尾时 positions 缺，回 null', () => {
  assert.equal(migrationOf(indexOf('abc'), indexOf('abcd'), 5, 6), null)
})

test('内容尺寸差与文本长度差不一致（包裹节点 +2）回 null', () => {
  assert.equal(migrationOf(indexOf('甲乙丙'), indexOf('甲乙X丙'), 10, 12), null)
})

test('变化点在新索引里的位置不同（+2 位移）回 null', () => {
  const oldIndex = indexOf('甲乙丙丁')
  const newIndex: TextIndex = { text: '甲乙X丙丁', positions: [1, 2, 5, 6, 7] }
  assert.equal(migrationOf(oldIndex, newIndex, 10, 11), null)
})

// ---------- migrateAnnotations ----------

test('编辑点在引文之前：from/to 一起平移', () => {
  const moved = migrateAnnotations([{ from: 5, to: 8 }], { changeStart: 3, delta: 1 }, 20)
  assert.deepEqual(moved, [{ from: 6, to: 9 }])
})

test('编辑点在引文中间：from 不动、to 加 1', () => {
  const moved = migrateAnnotations([{ from: 5, to: 8 }], { changeStart: 6, delta: 1 }, 20)
  assert.deepEqual(moved, [{ from: 5, to: 9 }])
})

test('起点被删掉的那条丢弃，后面的照常平移', () => {
  const moved = migrateAnnotations(
    [
      { from: 5, to: 9 },
      { from: 12, to: 14 },
    ],
    { changeStart: 4, delta: -3 },
    20,
  )
  assert.deepEqual(moved, [{ from: 9, to: 11 }])
})

test('平移到正文外 / 非法区间都丢', () => {
  assert.deepEqual(migrateAnnotations([{ from: 1, to: 5 }], { changeStart: 1, delta: -2 }, 20), [])
  assert.deepEqual(migrateAnnotations([{ from: 5, to: 5 }], { changeStart: 1, delta: 1 }, 20), [])
  assert.deepEqual(migrateAnnotations([{ from: 1, to: 30 }], { changeStart: 1, delta: 0 }, 20), [])
})

test('move 为 null 时全部丢', () => {
  assert.deepEqual(migrateAnnotations([{ from: 2, to: 4 }], null, 20), [])
})

// ---------- writeRevision ----------

test('同正文只写一份，目录落在 .sidelight/revisions', async () => {
  const root = fakeDir('工作区')
  const first = await writeRevision(root.handle, 'a', '正文', [item], [note])
  const second = await writeRevision(root.handle, 'a', '正文', [item], [note])
  assert.equal(first, second)
  const dir = revisionsOf(root)
  assert.ok(dir)
  assert.equal(dir.files.size, 1)
  assert.equal(dir.files.has(`${revisionDigest('a', '正文')}.json`), true)
})

test('写第 9 份删最旧，同键只留 8 份、他键不动', async () => {
  const root = fakeDir('工作区')
  for (let at = 0; at < 9; at += 1) {
    await writeRevision(root.handle, 'a', `正文${at}`, [], [])
    await new Promise((resolve) => setTimeout(resolve, 2))
  }
  await writeRevision(root.handle, 'b', '正文0', [], [])
  const dir = revisionsOf(root)
  assert.ok(dir)
  const names = [...dir.files.keys()]
  assert.equal(names.filter((name) => name !== `${revisionDigest('b', '正文0')}.json`).length, MAX_REVISIONS)
  assert.equal(names.length, MAX_REVISIONS + 1)
  assert.equal(dir.files.has(`${revisionDigest('a', '正文0')}.json`), false)
  assert.equal(names.includes(`${revisionDigest('b', '正文0')}.json`), true)
})

test('父句柄取目录失败时返回 null，不抛', async () => {
  const denied = {
    name: '不许',
    kind: 'directory',
    async getDirectoryHandle(): Promise<never> {
      throw new DOMException('已拒绝', 'NotAllowedError')
    },
  } as unknown as FileSystemDirectoryHandle
  assert.equal(await writeRevision(denied, 'a', '正文', [], []), null)
})
