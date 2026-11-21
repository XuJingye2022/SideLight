import assert from 'node:assert/strict'
import test from 'node:test'

import { renameFile, validateDocName, validateRename } from './rename.ts'

/**
 * 第 144 轮 A3：顶栏标题就地改名（用户 2026-11-21「未命名.md 无法改名」）。
 *
 * `validateRename` 是文件树的右键改名规则，对「名字没变」报错；
 * 顶栏标题的 `validateDocName` 复用同一套规则，但「没变」算成功——
 * 双击标题、没改字就回车应该安静退出编辑，而不是弹一句错误。
 * 行为证据是 `.tmp/e2e-r144-e2e.mjs` 的 R6/R7；这里是规则门。
 */

test('validateDocName：名字没变算成功（安静退出编辑，不报错）', () => {
  const same = validateDocName('正文.md', '正文.md')
  assert.deepEqual(same, { ok: true, name: '正文.md', unchanged: true })
  // 只有首尾空格不同也算没变
  assert.deepEqual(validateDocName('  正文.md  ', '正文.md'), { ok: true, name: '正文.md', unchanged: true })
})

test('validateDocName：只差扩展名也算没变（`读书笔记` → `读书笔记.md` 不做无意义的 move）', () => {
  assert.deepEqual(validateDocName('读书笔记', '读书笔记.md'), { ok: true, name: '读书笔记.md', unchanged: true })
})

test('validateDocName：补扩展名后是新名字', () => {
  assert.deepEqual(validateDocName('读书笔记', '未命名.md'), { ok: true, name: '读书笔记.md', unchanged: false })
})

test('validateDocName：保留 .md 结尾，`.markdown` 也认', () => {
  assert.deepEqual(validateDocName('正文.md', '未命名.md'), { ok: true, name: '正文.md', unchanged: false })
  assert.deepEqual(validateDocName('正文.markdown', '未命名.md'), { ok: true, name: '正文.markdown', unchanged: false })
})

test('validateDocName：非法名字原地拒绝（与文件树改名同一套规则）', () => {
  const bad = validateDocName('a/b.md', '未命名.md')
  assert.equal(bad.ok, false)
  assert.ok(!bad.ok && bad.error.includes('< > : " / | ? *'), '应报非法字符')
  const wrongExt = validateDocName('正文.txt', '未命名.md')
  assert.equal(wrongExt.ok, false, '换掉 .md 会让文件从树里消失')
  const reserved = validateDocName('con.md', '未命名.md')
  assert.equal(reserved.ok, false, 'Windows 保留名要拒绝')
})

test('validateDocName：空名报错（和 validateRename 同一条文案）', () => {
  const empty = validateDocName('   ', '未命名.md')
  assert.equal(empty.ok, false)
  assert.ok(!empty.ok && empty.error === '文件名不能为空。')
  // 对照：两条规则只在「没变」这一处分叉
  const unchanged = validateRename('未命名.md', '未命名.md')
  assert.equal(unchanged.ok, false, 'validateRename 仍把「没变」当错误（文件树改名入口的意思不同）')
})

test('renameFile：没有 move 的浏览器如实说「不支持」，不假装成功', async () => {
  const handle = { kind: 'file', name: 'a.md' } as unknown as FileSystemFileHandle
  const parent = {
    getFileHandle: async () => {
      throw new DOMException('missing', 'NotFoundError')
    },
  } as unknown as FileSystemDirectoryHandle
  const result = await renameFile(parent, handle, 'a.md', 'b.md')
  assert.equal(result.ok, false)
  assert.ok(!result.ok && result.error.includes('不支持文件改名'))
})
