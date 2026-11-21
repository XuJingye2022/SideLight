import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import { describeSaveFailure, isWriteDenied, writeReasonOf } from './saveError.ts'

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

test('四个「换位置」分支不带 W3C 英文原文（InvalidStateError / SecurityError 也不再拼原文）', () => {
  for (const name of [
    'NoModificationAllowedError',
    'NotAllowedError',
    'NotFoundError',
    'QuotaExceededError',
    'InvalidStateError',
    'SecurityError',
  ]) {
    const failure = report(name)
    assert.ok(!failure.text.includes(W3C), `${name} 把英文原文漏给了用户：${failure.text}`)
    assert.ok(!/An attempt|DOMException|Error|insecure/.test(failure.text), `${name} 还带错误名/英文：${failure.text}`)
  }
})

test('说清是哪一篇：六个「有出路」的分支都带文件名', () => {
  for (const name of [
    'NoModificationAllowedError',
    'NotAllowedError',
    'NotFoundError',
    'QuotaExceededError',
    'InvalidStateError',
    'SecurityError',
  ]) {
    const failure = report(name)
    assert.ok(failure.text.includes(`「${DOC}」`), `${name} 没带文件名：${failure.text}`)
  }
})

test('NoModificationAllowedError：说清常见原因与下一步', () => {
  const { text } = report('NoModificationAllowedError')
  assert.equal(
    text,
    '保存失败：系统不允许改写「第三章.md」。常见原因是文件被别的程序占用、文件夹只读，或应用没有这个位置的写入权限。请用「另存为」换一个位置。如果一直失败，请从正常桌面双击启动 Sidelight 再保存：受限账户或沙箱里，应用不能写普通文件夹。',
  )
})

test('「写不进去」的四个分支都提「正常桌面」这条兜底（第 145 轮 A2）', () => {
  for (const name of ['NoModificationAllowedError', 'NotAllowedError', 'InvalidStateError', 'SecurityError']) {
    const { text } = report(name)
    assert.ok(text.includes('正常桌面'), `${name} 没说换一种启动方式：${text}`)
    assert.ok(text.includes('另存为'), `${name} 没给下一步：${text}`)
    assert.ok(text.includes(`「${DOC}」`), `${name} 没带文件名：${text}`)
  }
  // 磁盘满、文件被移走这两类换位置就够，不该劝用户换启动方式
  for (const name of ['NotFoundError', 'QuotaExceededError']) {
    assert.ok(!report(name).text.includes('正常桌面'), `${name} 不该提「正常桌面」`)
  }
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

test('InvalidStateError / SecurityError：中文短原因，不带 name 与原始 message', () => {
  for (const name of ['InvalidStateError', 'SecurityError']) {
    const { text } = report(name, 'The operation is insecure.')
    assert.ok(!text.includes(name), `${name} 还带错误名：${text}`)
    assert.ok(!text.includes('The operation is insecure.'), `${name} 还带原始原因：${text}`)
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
  assert.match(text, /「第三章\.md」没有写进去（系统拒绝了这次写入）/)
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

test('isWriteDenied：写类错误为真，其它为假（performCommit 据此转「另存为」）', () => {
  for (const name of [
    'NoModificationAllowedError',
    'NotAllowedError',
    'InvalidStateError',
    'SecurityError',
    'NotFoundError',
  ]) {
    assert.equal(isWriteDenied(new DOMException(W3C, name)), true, `${name} 应算写不进去`)
  }
  for (const name of ['QuotaExceededError', 'TypeMismatchError', 'NotReadableError', 'AbortError']) {
    assert.equal(isWriteDenied(new DOMException(W3C, name)), false, `${name} 不该直接转另存为`)
  }
  for (const value of [null, undefined, 42, 'boom', {}, new Error(W3C)]) {
    assert.equal(isWriteDenied(value), false, '不可识别对象不该算写不进去')
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
  assert.ok(
    appSource.includes('describeSaveFailure(error, docNameRef.current)'),
    'performSaveAs 没接 describeSaveFailure（第 144 轮起读 ref：改名后立刻另存为要落到新名字）',
  )
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
  // 第 144 轮：performSaveAs 上移到 performCommit 之前（只读保存要直接走它），切片终点跟着改
  const end = appSource.indexOf('const performCommit = useCallback(')
  assert.ok(start >= 0 && end > start, '找不到 performSaveAs 的范围')
  assert.ok(start < end, 'performSaveAs 必须在 performCommit 之前声明（否则 TDZ）')
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

test('新建不再预探测写入，也没有「只读」徽标 / 状态（第 145 轮 A1 删干净）', () => {
  // 字面量拼出来：这三个模式本身要能从 src 里 0 命中，别在本文件里又留一份
  const PROBE = ['ensureWorkspace', 'Writable'].join('')
  const BADGE_CLASS = ['tree-readonly', 'badge'].join('-')
  const BADGE_ID = ['READONLY', 'BADGE_ID'].join('_')
  for (const [label, source] of [
    ['App.tsx', appSource],
    ['FileTree.tsx', fileTreeSource],
    ['styles.css', cssSource],
  ] as const) {
    assert.ok(!source.includes(PROBE), `${label} 还有写入预探测（第 145 轮改成直接试建）`)
    assert.ok(!source.includes(BADGE_CLASS), `${label} 还有「只读」徽标`)
    assert.ok(!source.includes(BADGE_ID), `${label} 还有徽标 id`)
  }
  assert.ok(!appSource.includes('folderReadOnly'), '「只读」状态已删：写不进去按错误类型当场处理')
})

test('「文件 → 新建」与 Ctrl+Alt+N 走同一条：有文件夹就建在文件夹里（第 145 轮 A1）', () => {
  assert.ok(appSource.includes('onNew={newFileInWorkspace}'), '菜单「新建」还在走空白文档')
  assert.match(
    appSource,
    /customId === 'newDocument'\) \{\s*newFileInWorkspace\(\)/,
    'Ctrl+Alt+N 还在走空白文档',
  )
  assert.ok(!appSource.includes('const newDocument = useCallback('), '旧的空白新建入口已删')
})

test('新建恒先试建文件，失败才转「命名 + 另存为」', () => {
  const start = appSource.indexOf('const createWorkspaceFile = useCallback(')
  const end = appSource.indexOf('const newFileInWorkspace = useCallback(')
  assert.ok(start >= 0 && end > start, '找不到 createWorkspaceFile 的范围')
  const block = appSource.slice(start, end)
  const createAt = block.indexOf('getFileHandle(')
  const namingAt = block.indexOf('newDocumentForNaming()')
  assert.ok(createAt >= 0, '新建不试写：已开文件夹时新建不会落在文件夹里')
  assert.ok(namingAt > createAt, '试建必须排在命名流程之前')
  assert.ok(block.includes('writeReasonOf(error)'), '试建失败要说中文原因')
  assert.ok(block.includes('另存为'), '试建失败要给「另存为」这条出路')
  assert.ok(block.includes('新建失败：'), '试建失败要说清楚发生了什么')
  assert.ok(!block.includes('console.debug('), '失败原因该上屏，不该只留日志')
  // 命名流程本身仍是 info，且要把标题输入框打开
  const namingStart = appSource.indexOf('const newDocumentForNaming = useCallback(')
  assert.ok(namingStart >= 0 && namingStart < start, '找不到「命名 + 空白文档」那段')
  const naming = appSource.slice(namingStart, start)
  assert.ok(naming.includes("kind: 'info'"), '命名流程要用 info 提示')
  assert.ok(naming.includes('startRename()'), '命名流程要把标题输入框打开并聚焦')
  assert.ok(naming.includes('另存为'), '提示要说清之后保存走「另存为」')
})

test('performCommit 无落点先试写当前文件夹，写类错误直接转「另存为」（第 145 轮 A1）', () => {
  const start = appSource.indexOf('const performCommit = useCallback(')
  const end = appSource.indexOf('const serializeBodyNow = useCallback(')
  assert.ok(start >= 0 && end > start, '找不到 performCommit 的范围')
  const block = appSource.slice(start, end)
  const writeAt = block.indexOf('saveIntoWorkspace(normalized, withEol)')
  const deniedAt = block.indexOf('isWriteDenied(error)')
  assert.ok(writeAt >= 0, '无落点保存不再先试写当前文件夹')
  assert.ok(deniedAt > writeAt, '写类错误要在试写之后判')
  assert.ok(block.includes('if (!isWriteDenied(error)) throw error'), '非写类错误要照旧走 catch（含草稿兜底）')
  assert.ok(block.includes('return await performSaveAs(normalized, withEol)'), '写不进去要直接给「另存为」')
})

test('改名不再被「只读」状态拦住：直接试一次，失败走 renameFile 的中文错误', () => {
  const start = appSource.indexOf('const commitDocName = useCallback(')
  const end = appSource.indexOf('const createFolder = useCallback(')
  assert.ok(start >= 0 && end > start, '找不到 commitDocName 的范围')
  const block = appSource.slice(start, end)
  assert.ok(!block.includes('folderReadOnly'), '改名仍读「只读」状态')
  assert.ok(block.includes('renameFile(dir, file.handle, file.name, parsed.name)'), '改名没走 renameFile')
  assert.ok(block.includes("setNotice({ text: result.error, kind: 'error' })"), '改名失败要把中文原因上屏')
})

test('trash.ts 的 11 处失败原因全部改中文，不再拼 error.message', () => {
  assert.ok(!/error\.message|second\.message/.test(trashSource), 'trash.ts 还在把 DOMException 英文原文给用户')
  const calls = trashSource.split('writeReasonOf(').length - 1
  assert.equal(calls, 11, `writeReasonOf 只接了 ${calls} 处，应有 11 处`)
})

test('「＋ 新建」不禁用、树头不再有徽标文案', () => {
  assert.ok(!fileTreeSource.includes('disabled={Boolean(trashReason)}'), '写不进去就禁用「＋ 新建」会把用户留在死路')
  assert.ok(!/tree-write-warn\w*/.test(fileTreeSource), '旧的那行警示已删')
  assert.ok(fileTreeSource.includes('title="新建文件"'), '「＋ 新建」的 title 不该变成错误原因')
  assert.ok(!fileTreeSource.includes('无法创建回收站'), '文件树不许提回收站')
  assert.ok(!fileTreeSource.includes('保存会失败'), '文件树不该先说不好的事')
  assert.ok(!treeActionsSource.includes('trashReason'), 'TreeActions 里已无禁用逻辑，别留死 prop')
})

test('styles.css 仍有 .doc-name-input，且不写死色值', () => {
  const start = cssSource.indexOf('.doc-name-input {')
  assert.ok(start >= 0, '缺 .doc-name-input 规则')
  const block = cssSource.slice(start, cssSource.indexOf('}', start))
  assert.ok(!/#[0-9a-fA-F]{3,8}/.test(block), '.doc-name-input 里不许写死色值（深色/暖纸主题要自动跟随）')
  assert.ok(!/tree-write-warn\w*/.test(cssSource), '旧的警示行样式已删')
})

