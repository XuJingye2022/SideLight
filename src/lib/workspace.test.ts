import assert from 'node:assert/strict'
import test from 'node:test'

import {
  MAX_DOC_BYTES,
  dropHandle,
  fallbackTargets,
  fileFromDrop,
  fileFromHandle,
  flattenFiles,
  freeRootName,
  workspaceFromHandle,
  type WorkspaceFileNode,
} from './workspace.ts'

// 假句柄只带被测代码用到的那几个成员；不碰真磁盘，测的是判定与映射
type FakeFile = { name: string; size: number; text: () => Promise<string> }

function fakeFile(name: string, text: string, size = text.length): FakeFile {
  return { name, size, text: async () => text }
}

function fakeFileHandle(file: FakeFile): FileSystemFileHandle {
  return { kind: 'file', name: file.name, getFile: async () => file } as unknown as FileSystemFileHandle
}

function fakeDirHandle(name: string, entries: Record<string, unknown>): FileSystemDirectoryHandle {
  return {
    kind: 'directory',
    name,
    entries: async function* () {
      for (const [entryName, entry] of Object.entries(entries)) yield [entryName, entry]
    },
  } as unknown as FileSystemDirectoryHandle
}

// 候选只按 path 认，句柄留空也不影响判定
function fakeNode(name: string): WorkspaceFileNode {
  return { kind: 'file', name, path: `ws/${name}`, handle: null }
}

test('fileFromHandle：正常 .md 读出正文，句柄留着当保存落点', async () => {
  const file = fakeFile('笔记.md', '# 标题\n正文')
  const handle = fakeFileHandle(file)
  const picked = await fileFromHandle(handle)
  assert.deepEqual(picked, { name: '笔记.md', text: '# 标题\n正文', handle })
})

test('fileFromHandle：正好 5.5 MiB 仍可打开，多 1 字节就拒', async () => {
  const ok = await fileFromHandle(fakeFileHandle(fakeFile('a.md', '', MAX_DOC_BYTES)))
  assert.equal('tooLarge' in ok, false)
  assert.equal((ok as { text: string }).text, '')

  const over = await fileFromHandle(fakeFileHandle(fakeFile('b.md', '', MAX_DOC_BYTES + 1)))
  assert.deepEqual(over, { tooLarge: true, size: MAX_DOC_BYTES + 1, name: 'b.md' })
})

test('fileFromHandle：非 .md 不收（.png / 无后缀都一样），名字原样带回', async () => {
  const png = await fileFromHandle(fakeFileHandle(fakeFile('图.png', 'x')))
  assert.deepEqual(png, { notMarkdown: true, name: '图.png' })
  const bare = await fileFromHandle(fakeFileHandle(fakeFile('README', 'x')))
  assert.deepEqual(bare, { notMarkdown: true, name: 'README' })
})

test('fileFromHandle：.markdown 后缀也算 Markdown，大小写不敏感', async () => {
  const picked = await fileFromHandle(fakeFileHandle(fakeFile('长文.MARKDOWN', '甲')))
  assert.equal('text' in picked ? picked.text : null, '甲')
})

test('fileFromDrop：没句柄也能读正文，handle 为 null（保存走另存为）', async () => {
  const picked = await fileFromDrop(fakeFile('拖入.md', '乙'))
  assert.deepEqual(picked, { name: '拖入.md', text: '乙', handle: null })
})

test('workspaceFromHandle：name 取句柄名，root 是目录节点并带上句柄', async () => {
  const chapter = fakeDirHandle('章节', {
    'b.md': fakeFileHandle(fakeFile('b.md', 'b')),
  })
  const root = fakeDirHandle('docs', {
    'z.md': fakeFileHandle(fakeFile('z.md', 'z')),
    'a.md': fakeFileHandle(fakeFile('a.md', 'a')),
    '图.png': fakeFileHandle(fakeFile('图.png', 'p')),
    '章节': chapter,
    '.git': fakeDirHandle('.git', {}),
  })

  const workspace = await workspaceFromHandle(root)
  assert.equal(workspace.name, 'docs')
  assert.equal(workspace.rootHandle, root)
  assert.equal(workspace.root?.kind, 'dir')
  if (!workspace.root || workspace.root.kind !== 'dir') throw new Error('root 不是目录节点')
  assert.equal(workspace.root.path, 'docs')

  // 目录在前、文件在后，各按名字排序；隐藏项与非 Markdown 被跳过
  assert.deepEqual(
    workspace.root.children.map((child) => child.path),
    ['docs/章节', 'docs/a.md', 'docs/z.md'],
  )
  assert.deepEqual(
    flattenFiles(workspace.root).map((file) => file.name),
    ['b.md', 'a.md', 'z.md'],
  )
})

test('fallbackTargets：删中间的文件，候选先往后找（删 b → 首候选 c）', () => {
  const files = [fakeNode('a.md'), fakeNode('b.md'), fakeNode('c.md')]
  assert.deepEqual(
    fallbackTargets(files, 'ws/b.md').map((file) => file.name),
    ['c.md', 'a.md'],
  )
})

test('fallbackTargets：删最后一个文件，候选往开头倒着数（删 c → 首候选 b）', () => {
  const files = [fakeNode('a.md'), fakeNode('b.md'), fakeNode('c.md')]
  assert.deepEqual(
    fallbackTargets(files, 'ws/c.md').map((file) => file.name),
    ['b.md', 'a.md'],
  )
})

test('fallbackTargets：没有其它文件时返回空数组，路径不在树里也不猜', () => {
  const files = [fakeNode('a.md')]
  assert.deepEqual(fallbackTargets(files, 'ws/a.md'), [])
  // 并发删除或刚刷新过：删的这项已不在快照里，别拿相邻项硬凑
  assert.deepEqual(fallbackTargets(files, 'ws/gone.md'), [])
})

test('fallbackTargets：path 去重，最多 3 个，不回绕', () => {
  const dup = [fakeNode('a.md'), fakeNode('b.md'), fakeNode('b.md'), fakeNode('c.md')]
  assert.deepEqual(
    fallbackTargets(dup, 'ws/a.md').map((file) => file.path),
    ['ws/b.md', 'ws/c.md'],
  )
  const five = ['a.md', 'b.md', 'c.md', 'd.md', 'e.md'].map((name) => fakeNode(name))
  // 删 c：[d, e] 先，再从 b 往开头数取一个，共 3 个；被删项不出现
  assert.deepEqual(
    fallbackTargets(five, 'ws/c.md').map((file) => file.name),
    ['d.md', 'e.md', 'b.md'],
  )
  // 只往后看：删 b 时先取满 3 个，不绕回 a
  assert.deepEqual(
    fallbackTargets(five, 'ws/b.md').map((file) => file.name),
    ['c.md', 'd.md', 'e.md'],
  )
})

test('dropHandle：合成的 DataTransferItem 返回 undefined，按「没有句柄」处理', () => {  const item = { kind: 'file', getAsFileSystemHandle: () => undefined } as unknown as DataTransferItem
  assert.equal(dropHandle(item), null)

  const missing = { kind: 'file' } as unknown as DataTransferItem
  assert.equal(dropHandle(missing), null)

  const throws = {
    kind: 'file',
    getAsFileSystemHandle: () => {
      throw new Error('no')
    },
  } as unknown as DataTransferItem
  assert.equal(dropHandle(throws), null)

  const fake = { kind: 'directory', name: 'docs' }
  const pending = dropHandle({
    kind: 'file',
    getAsFileSystemHandle: () => Promise.resolve(fake),
  } as unknown as DataTransferItem)
  assert.ok(pending instanceof Promise)
})

/* ---------- freeRootName：无句柄保存落到根目录时取不撞名的文件名（第 144 轮 A3） ---------- */

test('freeRootName：名字没被占用就原样用（首次 Ctrl+S 仍建「未命名.md」）', () => {
  assert.equal(freeRootName('未命名.md', []), '未命名.md')
  // 与既有的「未命名 N.md」进位规则同源
  assert.equal(freeRootName('未命名.md', ['未命名.md']), '未命名 2.md')
  assert.equal(freeRootName('未命名.md', ['未命名.md', '未命名 2.md']), '未命名 3.md')
})

test('freeRootName：沿用用户起的名字（改名后立刻 Ctrl+S 落在新名字上）', () => {
  assert.equal(freeRootName('读书笔记.md', ['未命名.md']), '读书笔记.md')
  // 重名才加序号，插在扩展名之前
  assert.equal(freeRootName('读书笔记.md', ['读书笔记.md']), '读书笔记 2.md')
  assert.equal(freeRootName('读书笔记.md', ['读书笔记.md', '读书笔记 2.md']), '读书笔记 3.md')
  // 其它扩展名同一条规则
  assert.equal(freeRootName('笔记.markdown', ['笔记.markdown']), '笔记 2.markdown')
})

test('freeRootName：没写扩展名就补 .md，空白名回落到「未命名.md」', () => {
  assert.equal(freeRootName('笔记', []), '笔记.md')
  assert.equal(freeRootName('   ', []), '未命名.md')
  assert.equal(freeRootName(' 笔记 ', ['笔记.md']), '笔记 2.md')
})
