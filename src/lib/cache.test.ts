import assert from 'node:assert/strict'
import test from 'node:test'

import {
  CACHE_DIR,
  cacheKey,
  cachePath,
  ensureCacheDir,
  legacyCacheKey,
  readCache,
  removeCache,
  writeCache,
} from './cache.ts'

// ---------- cacheKey ----------

test('中文名去掉扩展名', () => {
  assert.equal(cacheKey('周记.md'), '周记')
  assert.equal(cacheKey('关于侧灯.markdown'), '关于侧灯')
})

test('空格与全角括号换成 -', () => {
  assert.equal(cacheKey('屏幕 截图（2）.png'), '屏幕-截图-2')
})

test('连续特殊字符合并成一个 -，首尾的 - 去掉', () => {
  assert.equal(cacheKey('--封面@@@照片--.jpg'), '封面-照片')
})

test('键超过 40 字符时取前 36 位并加 4 位哈希（与宿主一致）', () => {
  const key = cacheKey(`${'中'.repeat(50)}.md`)
  assert.equal(key, `${'中'.repeat(36)}-c15f`)
  assert.equal(key.length, 41)
})

test('长名键与宿主 CacheKey 逐字节一致', () => {
  // 期望值来自 host/Program.cs 的 FNV-1a（UTF-8 字节，hash & 0xFFFF，x4）
  assert.equal(cacheKey(`${'a'.repeat(45)}-甲.md`), `${'a'.repeat(36)}-fa3a`)
  assert.equal(cacheKey(`${'a'.repeat(45)}-乙.md`), `${'a'.repeat(36)}-e3cb`)
})

test('长名同前缀不撞键', () => {
  const first = cacheKey(`${'a'.repeat(45)}-甲.md`)
  const second = cacheKey(`${'a'.repeat(45)}-乙.md`)
  assert.notEqual(first, second)
})

test('40 字符以内与旧算法逐字节相同', () => {
  for (const name of ['周记.md', '屏幕 截图（2）.png', 'a'.repeat(40) + '.md', '关于侧灯.markdown']) {
    assert.equal(cacheKey(name), legacyCacheKey(name))
  }
})

test('截断后末尾的 - 也去掉', () => {
  const name = `${'a'.repeat(39)} @b.md`
  assert.equal(cacheKey(name), `${'a'.repeat(36)}-8011`)
  assert.equal(legacyCacheKey(name), 'a'.repeat(39))
})

test('没有扩展名时整名当键', () => {
  assert.equal(cacheKey('旅行照片'), '旅行照片')
})

test('空名与全是特殊字符的名字用 untitled', () => {
  assert.equal(cacheKey(''), 'untitled')
  assert.equal(cacheKey('   '), 'untitled')
  assert.equal(cacheKey('@@@.md'), 'untitled')
})

test('扩展名大小写都去掉', () => {
  assert.equal(cacheKey('周记.MD'), '周记')
  assert.equal(cacheKey('README.Markdown'), 'README')
})

// ---------- cachePath ----------

test('草稿路径是 .sidelight/drafts/<key>.md', () => {
  assert.equal(cachePath('draft', '周记'), '.sidelight/drafts/周记.md')
})

test('批注路径是 .sidelight/annotations/<key>.json', () => {
  assert.equal(cachePath('annotations', '周记'), '.sidelight/annotations/周记.json')
})

// ---------- 内存里的假目录句柄 ----------

type FakeFile = {
  text: string
}

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
  const handle = {
    name,
    kind: 'file',
    async getFile(): Promise<File> {
      return { name, text: async () => file.text } as unknown as File
    },
    async createWritable(): Promise<FileSystemWritableFileStream> {
      // 真实句柄也是 close 之后才落盘，这里先放缓冲区
      let buffer = file.text
      return {
        async write(chunk: string) {
          buffer = chunk
        },
        async close() {
          file.text = buffer
        },
        async abort() {
          // 放弃这次写入，原内容不变
        },
      } as unknown as FileSystemWritableFileStream
    },
  }

  return handle as unknown as FileSystemFileHandle
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
  }

  return { name, dirs, files, handle: handle as unknown as FileSystemDirectoryHandle }
}

// 每次取目录都失败，模拟没有权限
function deniedDir(): FileSystemDirectoryHandle {
  const denied = async (): Promise<never> => {
    throw new DOMException('已拒绝', 'NotAllowedError')
  }

  const handle = {
    getDirectoryHandle: denied,
    getFileHandle: denied,
    removeEntry: denied,
  }

  return handle as unknown as FileSystemDirectoryHandle
}

// 目录能建出来，但写文件时抛配额错误
function quotaDir(): FileSystemDirectoryHandle {
  const kindDir = {
    async getFileHandle(): Promise<FileSystemFileHandle> {
      throw new DOMException('超出配额', 'QuotaExceededError')
    },
  } as unknown as FileSystemDirectoryHandle

  const parent = {
    async getDirectoryHandle(): Promise<FileSystemDirectoryHandle> {
      return kindDir
    },
  }

  return parent as unknown as FileSystemDirectoryHandle
}

// ---------- ensureCacheDir ----------

test('缓存目录建两层并复用', async () => {
  const root = fakeDir('工作区')

  const first = await ensureCacheDir(root.handle, 'draft')
  assert.ok(first)
  assert.equal(first.name, 'drafts')
  assert.equal(root.dirs.get(CACHE_DIR)?.dirs.get('drafts')?.name, 'drafts')

  const second = await ensureCacheDir(root.handle, 'annotations')
  assert.ok(second)
  assert.equal(root.dirs.get(CACHE_DIR)?.dirs.get('annotations')?.name, 'annotations')

  const again = await ensureCacheDir(root.handle, 'draft')
  assert.ok(again)
  assert.equal(again.name, 'drafts')
  // 复用已有的两层目录，不重复创建
  assert.equal(root.dirs.size, 1)
  assert.equal(root.dirs.get(CACHE_DIR)?.dirs.size, 2)
})

test('目录建不出来时 ensureCacheDir 返回 null，不抛', async () => {
  assert.equal(await ensureCacheDir(deniedDir(), 'draft'), null)
})

// ---------- 往返 ----------

test('草稿写入后能读出，文件落在 drafts 子目录', async () => {
  const root = fakeDir('工作区')
  const key = cacheKey('周记.md')

  assert.equal(await writeCache(root.handle, 'draft', key, '# 周记\n\n这周读完了。'), true)

  const file = root.dirs.get(CACHE_DIR)?.dirs.get('drafts')?.files.get('周记.md')
  assert.ok(file)
  assert.equal(file.text, '# 周记\n\n这周读完了。')
  assert.equal(await readCache(root.handle, 'draft', key), '# 周记\n\n这周读完了。')
})

test('批注写入后能读出，文件落在 annotations 子目录且是 .json', async () => {
  const root = fakeDir('工作区')
  const key = cacheKey('周记.md')
  const json = JSON.stringify({ quote: '这周读完了。', note: '删掉量词' })

  assert.equal(await writeCache(root.handle, 'annotations', key, json), true)

  const file = root.dirs.get(CACHE_DIR)?.dirs.get('annotations')?.files.get('周记.json')
  assert.ok(file)
  assert.equal(file.text, json)
  assert.equal(await readCache(root.handle, 'annotations', key), json)
})

test('重复写同一键会覆盖旧内容', async () => {
  const root = fakeDir('工作区')

  assert.equal(await writeCache(root.handle, 'draft', '周记', '第一版'), true)
  assert.equal(await writeCache(root.handle, 'draft', '周记', '第二版'), true)
  assert.equal(await readCache(root.handle, 'draft', '周记'), '第二版')
})

test('目录还不存在时 readCache 返回 null，也不创建目录', async () => {
  const root = fakeDir('工作区')

  assert.equal(await readCache(root.handle, 'draft', '周记'), null)
  assert.equal(root.dirs.size, 0)
})

test('文件不存在时 readCache 返回 null', async () => {
  const root = fakeDir('工作区')
  assert.equal(await writeCache(root.handle, 'draft', '周记', '正文'), true)

  assert.equal(await readCache(root.handle, 'draft', '不存在的键'), null)
})

test('旧键存在时 readCache 回读、搬到新键并删旧键', async () => {
  const root = fakeDir('工作区')
  const name = `${'a'.repeat(45)}.md`
  const newKey = cacheKey(name)
  const oldKey = legacyCacheKey(name)
  assert.notEqual(newKey, oldKey)

  assert.equal(await writeCache(root.handle, 'draft', oldKey, '旧草稿'), true)
  assert.equal(await readCache(root.handle, 'draft', newKey, oldKey), '旧草稿')

  // 迁移之后旧键消失、新键可直接读
  assert.equal(root.dirs.get(CACHE_DIR)?.dirs.get('drafts')?.files.has(`${oldKey}.md`), false)
  assert.equal(await readCache(root.handle, 'draft', newKey), '旧草稿')
})

// ---------- 失败路径 ----------

test('父句柄取目录失败时 writeCache 返回 false', async () => {
  assert.equal(await writeCache(deniedDir(), 'draft', '周记', '正文'), false)
})

test('文件句柄抛配额错误时 writeCache 返回 false', async () => {
  assert.equal(await writeCache(quotaDir(), 'draft', '周记', '正文'), false)
})

test('句柄抛错时 readCache 返回 null', async () => {
  assert.equal(await readCache(deniedDir(), 'draft', '周记'), null)
})

// ---------- removeCache ----------

test('删除后读不到，文件从目录里消失', async () => {
  const root = fakeDir('工作区')
  assert.equal(await writeCache(root.handle, 'annotations', '周记', '{}'), true)

  await removeCache(root.handle, 'annotations', '周记')

  assert.equal(root.dirs.get(CACHE_DIR)?.dirs.get('annotations')?.files.size, 0)
  assert.equal(await readCache(root.handle, 'annotations', '周记'), null)
})

test('删不存在的文件不抛，也不创建目录', async () => {
  const empty = fakeDir('工作区')
  await removeCache(empty.handle, 'draft', '周记')
  assert.equal(empty.dirs.size, 0)

  const root = fakeDir('工作区')
  assert.equal(await writeCache(root.handle, 'draft', '周记', '正文'), true)
  await removeCache(root.handle, 'draft', '别的键')
  await removeCache(root.handle, 'draft', '周记')
  await removeCache(root.handle, 'draft', '周记')
})

test('句柄抛错时 removeCache 不抛', async () => {
  await removeCache(deniedDir(), 'draft', '周记')
})
