import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import { describeSaveFailure, writeReasonOf } from './saveError.ts'

const DOC = '第三章.md'
/** Chromium 实际抛出的英文原文：不能原样出现在给用户看的文案里 */
const W3C = 'An attempt was made to write to a file or directory which could not be modified due to the state of the underlying filesystem.'

const report = (name: string, message = W3C) => describeSaveFailure(new DOMException(message, name), DOC)

test('每个 DOMException 名称都翻成中文、留「另存为」出路', () => {
  for (const name of [
    'NoModificationAllowedError',
    'NotAllowedError',
    'NotFoundError',
    'QuotaExceededError',
    'InvalidStateError',
    'SecurityError',
  ]) {
    const failure = report(name)
    assert.ok(failure.text.startsWith('保存失败：'), `${name} 缺中文前缀：${failure.text}`)
    assert.equal(failure.canSaveAs, true, `${name} 应允许另存为`)
    assert.ok(failure.text.includes('另存为'), `${name} 没给下一步：${failure.text}`)
    assert.ok(!failure.text.includes('可能') && !failure.text.includes('大概'), `${name} 含糊：${failure.text}`)
  }
})

test('四个「换位置」分支不带 W3C 英文原文', () => {
  // InvalidStateError / SecurityError 按产品口径要带原始 message（见下一条），不能一起断言
  for (const name of ['NoModificationAllowedError', 'NotAllowedError', 'NotFoundError', 'QuotaExceededError']) {
    const failure = report(name)
    assert.ok(!failure.text.includes(W3C), `${name} 把英文原文漏给了用户：${failure.text}`)
  }
})

test('说清是哪一篇：四个「有出路」的分支都带文件名', () => {
  // InvalidStateError / SecurityError 按产品口径只带 name 与原始 message，见下一条
  for (const name of ['NoModificationAllowedError', 'NotAllowedError', 'NotFoundError', 'QuotaExceededError']) {
    const failure = report(name)
    assert.ok(failure.text.includes(`「${DOC}」`), `${name} 没带文件名：${failure.text}`)
  }
})

test('NoModificationAllowedError：说清常见原因与下一步', () => {
  const { text } = report('NoModificationAllowedError')
  assert.equal(
    text,
    '保存失败：系统不允许改写「第三章.md」。常见原因是文件被别的程序占用、文件夹只读，或应用没有这个位置的写入权限。请用「另存为」换一个位置。',
  )
})

test('NotAllowedError：提示重新打开文件夹并允许写入', () => {
  const { text } = report('NotAllowedError')
  assert.match(text, /没有写入「第三章\.md」的权限/)
  assert.match(text, /重新打开这个文件夹/)
})

test('NotFoundError：说清文件已被移走或删除', () => {
  const { text } = report('NotFoundError')
  assert.match(text, /「第三章\.md」已经不在原位置/)
})

test('QuotaExceededError：说清磁盘空间不足', () => {
  const { text } = report('QuotaExceededError')
  assert.match(text, /磁盘空间不足/)
  assert.match(text, /清理空间/)
})

test('InvalidStateError / SecurityError：带 name 与原始 message', () => {
  for (const name of ['InvalidStateError', 'SecurityError']) {
    const { text } = report(name, 'The operation is insecure.')
    assert.ok(text.includes(name), `${name} 没带错误名：${text}`)
    assert.ok(text.includes('The operation is insecure.'), `${name} 没带原始原因：${text}`)
    assert.match(text, /系统拒绝了这次写入/)
  }
})

test('普通 Error 保留原文口径', () => {
  const failure = describeSaveFailure(new Error('磁盘上的文件已被外部改写'), DOC)
  assert.equal(failure.text, '保存失败：磁盘上的文件已被外部改写。改动还在，可以再试一次。')
  assert.equal(failure.canSaveAs, true)
})

test('不可识别对象有兜底，不抛错', () => {
  for (const value of [null, undefined, 42, 'boom', {}, { name: 'UnknownThing' }]) {
    const failure = describeSaveFailure(value, DOC)
    assert.equal(failure.text, '保存失败：原因未知。改动还在，可以再试一次。')
    assert.equal(failure.canSaveAs, true)
  }
})

test('没有 message 的 DOMException 也有一句完整的话', () => {
  const { text } = describeSaveFailure(new DOMException('', 'SecurityError'), DOC)
  assert.match(text, /系统拒绝了这次写入（SecurityError）/)
})

test('文件名缺失时用「当前文档」', () => {
  for (const docName of ['', '   ']) {
    const { text } = describeSaveFailure(new DOMException(W3C, 'NoModificationAllowedError'), docName)
    assert.ok(text.includes('「当前文档」'), `docName=${JSON.stringify(docName)} 用了空名字：${text}`)
  }
})

test('普通对象带 name 也能识别（测试与宿主回包可能不是真 DOMException）', () => {
  const failure = describeSaveFailure({ name: 'NotFoundError', message: W3C }, DOC)
  assert.match(failure.text, /「第三章\.md」已经不在原位置/)
})

test('每个分支都说清「改动还在」', () => {
  const samples: unknown[] = [
    report('NoModificationAllowedError'),
    report('NotAllowedError'),
    report('NotFoundError'),
    report('QuotaExceededError'),
    report('InvalidStateError'),
    new Error('x'),
    null,
  ]
  for (const value of samples) {
    const { text } = describeSaveFailure(value, DOC)
    assert.ok(/改动还在/.test(text), `没有说明改动还在：${text}`)
  }
})

/* ---------- writeReasonOf：写盘失败的中文短原因（第 142 轮） ---------- */

test('writeReasonOf：按错误名给中文短原因，不带英文原文', () => {
  const cases: Array<[string, string]> = [
    ['NoModificationAllowedError', '这个位置不允许写入'],
    ['NotAllowedError', '没有写入这个位置的权限'],
    ['NotFoundError', '这个位置已经不存在'],
    ['QuotaExceededError', '磁盘空间不足'],
  ]
  for (const [name, expected] of cases) {
    const reason = writeReasonOf(new DOMException(W3C, name))
    assert.equal(reason, expected, `${name} 的短原因不对：${reason}`)
  }
})

test('writeReasonOf：其它错误名与不可识别对象都有中文兜底、都不带英文原文', () => {
  for (const name of ['SecurityError', 'InvalidStateError', 'TypeMismatchError', 'NotReadableError', 'Weird']) {
    const reason = writeReasonOf(new DOMException(W3C, name))
    assert.ok(!reason.includes('An attempt') && /[\u4e00-\u9fa5]/.test(reason), `${name}：${reason}`)
  }
  // 普通 Error 的 message 可能是 W3C 原文，也不能上屏
  for (const value of [null, undefined, 42, 'boom', {}, new Error(W3C)]) {
    const reason = writeReasonOf(value)
    assert.ok(!reason.includes('An attempt') && /[\u4e00-\u9fa5]/.test(reason), `兜底漏了：${reason}`)
  }
})

/* ---------- 接线静态门：上面的文案必须真被两处保存 catch 用上 ---------- */
// 行为证据是 `.tmp/e2e-r142-a.mjs`（假 FSA 拒写 + 真 toast / 真文件树）；这里只防「函数写好了却没人调」。

const appSource = readFileSync('src/App.tsx', 'utf8')
const fileTreeSource = readFileSync('src/components/FileTree.tsx', 'utf8')
const treeActionsSource = readFileSync('src/components/TreeActions.tsx', 'utf8')
const trashSource = readFileSync('src/lib/trash.ts', 'utf8')
const cssSource = readFileSync('src/styles.css', 'utf8')

test('performCommit / performSaveAs 两处 catch 都用 describeSaveFailure，旧英文口径已清', () => {
  assert.ok(
    appSource.includes('describeSaveFailure(error, target?.name ?? docNameRef.current)'),
    'performCommit 没带文件名（应为 target?.name ?? docNameRef.current）',
  )
  assert.ok(appSource.includes('describeSaveFailure(error, docName)'), 'performSaveAs 没接 describeSaveFailure')
  assert.ok(!appSource.includes('保存失败：${reasonOf(error)}。改动还在'), '旧口径还在：会继续把英文原文给用户')
  assert.ok(
    appSource.includes(
      "action: failure.canSaveAs ? { label: '另存为', onClick: () => saveAsCopyRef.current() } : undefined",
    ),
    'canSaveAs 没接到提示条的「另存为」按钮上',
  )
})

test('performSaveAs 自己不挂「另存为」（点它只会再开一次选择器）', () => {
  const start = appSource.indexOf('const performSaveAs = useCallback(')
  const end = appSource.indexOf('const performSwitch = useCallback(')
  assert.ok(start >= 0 && end > start, '找不到 performSaveAs 的范围')
  assert.ok(!appSource.slice(start, end).includes("label: '另存为'"), 'performSaveAs 里不该再有「另存为」动作')
})

test('performCommit 失败写草稿兜底（ref 绕开声明顺序）', () => {
  assert.ok(
    appSource.includes('void writeDraftFallbackRef.current(normalized)'),
    '手动保存失败没写草稿：正文只剩内存一份',
  )
  assert.ok(
    appSource.includes('writeDraftFallbackRef.current = (text) => void writeDraftFallback(text)'),
    'ref 没在 ref 赋值块里接上 writeDraftFallback',
  )
})

test('打开文件夹不再用错误 toast 挡第一眼：写入探测只留文件树那行常驻警示', () => {
  const start = appSource.indexOf('const ensureWorkspaceWritable = useCallback(')
  const end = appSource.indexOf('const openFolder = useCallback(')
  assert.ok(start >= 0 && end > start, '找不到 ensureWorkspaceWritable 的位置')
  const helper = appSource.slice(start, end)
  assert.ok(!helper.includes('setNotice('), '写入探测仍会弹提示条：用户打开后第一眼就被挡住')
  assert.ok(!helper.includes("kind: 'error'"), '写入探测仍是错误态提示')
  assert.ok(helper.includes('setTrashReason('), '探测结果必须交给文件树那行警示')
  assert.ok(helper.includes('ensureTrashDir(root)'), '缺回收站前置探测')
  const calls = appSource.split('ensureWorkspaceWritable(next.rootHandle)').length - 1
  assert.equal(calls, 2, '两条打开路径必须一致，别一边有一边没有')
})

test('trash.ts 的 11 处失败原因全部改中文，不再拼 error.message', () => {
  assert.ok(!/error\.message|second\.message/.test(trashSource), 'trash.ts 还在把 DOMException 英文原文给用户')
  const calls = trashSource.split('writeReasonOf(').length - 1
  assert.equal(calls, 11, `writeReasonOf 只接了 ${calls} 处，应有 11 处`)
})

test('新建文件/文件夹失败也走中文原因，并把用户从死路里带出来', () => {
  const start = appSource.indexOf('const createWorkspaceFile = useCallback(')
  const end = appSource.indexOf('const newFileInWorkspace = useCallback(')
  assert.ok(start >= 0 && end > start, '找不到 createWorkspaceFile 的范围')
  const block = appSource.slice(start, end)
  assert.ok(block.includes('writeReasonOf(error)'), '新建失败还在拼英文原文')
  assert.ok(!block.includes('reasonOf(error)'), '旧口径还在')
  assert.ok(block.includes('await startNewDocument()'), '新建失败没退回空白文档，用户没有保存出路')
  assert.ok(block.includes('另存为'), '新建失败没说「另存为」')
  const folderStart = appSource.indexOf('const createFolder = useCallback(')
  const folderEnd = appSource.indexOf('const removeFile = useCallback(')
  assert.ok(folderStart >= 0 && folderEnd > folderStart, '找不到 createFolder 的范围')
  assert.ok(appSource.slice(folderStart, folderEnd).includes('writeReasonOf(error)'), 'createFolder 没接 writeReasonOf')
})

test('「＋ 新建」不再因为写不进去而禁用，警示行给中文出路', () => {
  assert.ok(!fileTreeSource.includes('disabled={Boolean(trashReason)}'), '写不进去就禁用「＋ 新建」会把用户留在死路')
  assert.ok(fileTreeSource.includes("title={trashReason ?? '新建文件'}"), 'title 要保留')
  assert.ok(fileTreeSource.includes('aria-describedby={trashReason ? WRITE_WARNING_ID : undefined}'), '缺 aria-describedby')
  assert.ok(fileTreeSource.includes('id={WRITE_WARNING_ID}'), '警示行缺稳定 id')
  assert.ok(fileTreeSource.includes('className="tree-write-warning"'), '缺可见警示行的类名')
  assert.ok(fileTreeSource.includes('role="status"'), '警示行要用 role="status" 让读屏播报')
  assert.ok(fileTreeSource.includes('保存会失败') && fileTreeSource.includes('另存为'), '警示行没说保存会失败、没给「另存为」')
  assert.ok(!treeActionsSource.includes('trashReason'), 'TreeActions 里已无禁用逻辑，别留死 prop')
})

test('styles.css 有 .tree-write-warning，且复用既有 token、不写死颜色', () => {
  const start = cssSource.indexOf('.tree-write-warning {')
  assert.ok(start >= 0, '缺 .tree-write-warning 规则')
  const block = cssSource.slice(start, cssSource.indexOf('}', start))
  assert.ok(block.includes('var(--danger)'), '警示色要用 --danger，不要写死')
  assert.ok(block.includes('var(--text-xs)'), '字号要跟随 --text-xs')
  assert.ok(!/#[0-9a-fA-F]{3,8}/.test(block), '规则里不许写死色值（深色/暖纸主题要自动跟随）')
})

