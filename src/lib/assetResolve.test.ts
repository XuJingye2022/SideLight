import assert from 'node:assert/strict'
import test from 'node:test'

import {
  clearAssetCache,
  getAssetDocPath,
  getAssetVersion,
  getResolvedAsset,
  hostAssetUrl,
  isHostAssetMode,
  isRelativeAsset,
  resolveAsset,
  resolveAssetSegments,
  setAssetDocPath,
  setAssetResolver,
  setHostAssetMode,
  shouldWaitAssetPaint,
  subscribeResolved,
} from './assetResolve.ts'

test('isRelativeAsset：只有相对路径要解析', () => {
  assert.equal(isRelativeAsset('assets/a.png'), true)
  assert.equal(isRelativeAsset('./assets/a.png'), true)
  assert.equal(isRelativeAsset('sub/assets/b.png'), true)
  assert.equal(isRelativeAsset('data:image/png;base64,AAA'), false)
  assert.equal(isRelativeAsset('blob:http://localhost/abc'), false)
  assert.equal(isRelativeAsset('https://example.com/a.png'), false)
  assert.equal(isRelativeAsset('http://example.com/a.png'), false)
  assert.equal(isRelativeAsset('file:///D:/a.png'), false)
  assert.equal(isRelativeAsset(''), false)
  assert.equal(isRelativeAsset('   '), false)
  assert.equal(isRelativeAsset(null), false)
  assert.equal(isRelativeAsset(undefined), false)
})

test('没有 resolver 时返回 null，不抛错', async () => {
  setAssetResolver(null)
  setAssetDocPath('示例文集/无解析器.md')
  const result = await resolveAsset('assets/none.png')
  assert.equal(result, null)
  assert.equal(getResolvedAsset('assets/none.png'), null)
})

test('失败不缓存：文件补上后同一会话还能重试', async () => {
  let calls = 0
  setAssetResolver(async () => {
    calls += 1
    return null
  })
  setAssetDocPath('示例文集/失败重试.md')
  assert.equal(await resolveAsset('assets/missing-a.png'), null)
  assert.equal(await resolveAsset('assets/missing-a.png'), null)
  assert.equal(calls, 2)
  assert.equal(getResolvedAsset('assets/missing-a.png'), null)
})

test('同 src 并发只解析一次；换文档后在飞结果不写进新缓存', async () => {
  let calls = 0
  let release: (url: string | null) => void = () => undefined
  setAssetResolver(async () => {
    calls += 1
    return await new Promise<string | null>((resolve) => {
      release = resolve
    })
  })
  setAssetDocPath('示例文集/并发.md')

  const first = resolveAsset('assets/c.png')
  const second = resolveAsset('assets/c.png')
  await new Promise((resolve) => setTimeout(resolve, 0))
  assert.equal(calls, 1)
  assert.equal(getAssetDocPath(), '示例文集/并发.md')

  // 换文档：代际 +1，旧结果回来必须丢弃
  setAssetDocPath('示例文集/sub/子图.md')
  release('blob:stale-c')
  assert.deepEqual(await Promise.all([first, second]), [null, null])
  assert.equal(getResolvedAsset('assets/c.png'), null)
})

test('resolveAssetSegments：../、%20 与越界（第 39 轮）', () => {
  // 子目录文档里的 ../assets：从文档目录弹一层，回到工作区根
  assert.deepEqual(resolveAssetSegments(['章节'], '../assets/a.png'), ['assets', 'a.png'])
  // 根级文档：同目录写法不变
  assert.deepEqual(resolveAssetSegments([], 'assets/a.png'), ['assets', 'a.png'])
  // ./ 前缀
  assert.deepEqual(resolveAssetSegments([], './assets/a.png'), ['assets', 'a.png'])
  // 文件名里的 %20 解成空格
  assert.deepEqual(resolveAssetSegments(['章节'], '../assets/my%20pic.png'), ['assets', 'my pic.png'])
  // 同目录图（不带目录）仍带文档目录
  assert.deepEqual(resolveAssetSegments(['章节'], '同.png'), ['章节', '同.png'])
  // 多层弹层
  assert.deepEqual(resolveAssetSegments(['a', 'b', 'c'], '../../../x.png'), ['x.png'])
  // 弹到工作区根之外：null，绝不能显示根之外的图
  assert.equal(resolveAssetSegments(['章节'], '../../a.png'), null)
  assert.equal(resolveAssetSegments([], '../a.png'), null)
  // 非法编码不抛错，保留原段
  assert.deepEqual(resolveAssetSegments([], 'a%ZZ.png'), ['a%ZZ.png'])
  // 解码后才变成 .. 的写法也拒绝
  assert.equal(resolveAssetSegments(['章节'], '%2e%2e/a.png'), null)
  // 只有目录、没有文件名：段不为空就返回，交给目录句柄判成「打不开」
  assert.deepEqual(resolveAssetSegments([], 'assets/'), ['assets'])
  assert.equal(resolveAssetSegments([], ''), null)
})

test('hostAssetUrl：宿主 /__asset 只编码相对图（第 57 轮 B-004）', () => {
  // 中文文件名与空格整段走 encodeURIComponent：`/` 也一起编掉，宿主自己解
  assert.equal(hostAssetUrl('assets/图 1.jpg'), '/__asset?path=' + encodeURIComponent('assets/图 1.jpg'))
  assert.equal(hostAssetUrl('./assets/a.png'), '/__asset?path=' + encodeURIComponent('assets/a.png'))
  // 非相对地址与空值交给浏览器原样显示
  assert.equal(hostAssetUrl('data:image/png;base64,AAA'), null)
  assert.equal(hostAssetUrl('https://example.com/a.png'), null)
  assert.equal(hostAssetUrl(''), null)
  assert.equal(hostAssetUrl('   '), null)
  assert.equal(hostAssetUrl(null), null)
})

test('hostAssetUrl：绝对路径与越界一律拒绝', () => {
  assert.equal(hostAssetUrl('/abs.png'), null)
  assert.equal(hostAssetUrl('../secret.txt'), null)
  assert.equal(hostAssetUrl('%2e%2e%2fsecret.txt'), null)
  assert.equal(hostAssetUrl('a/../../secret.txt'), null)
  assert.equal(hostAssetUrl('assets\\a.png'), null)
  assert.equal(hostAssetUrl('C:/a.png'), null)
})

test('hostAssetUrl：解码后才多出来的目录分隔也当越界', () => {
  assert.equal(hostAssetUrl('assets%2F..%2Fsecret.txt'), null)
  assert.equal(hostAssetUrl('a%2Fb.png'), null)
  // 正常的 %20 仍解成空格再编码回去
  assert.equal(hostAssetUrl('assets/图%201.jpg'), '/__asset?path=' + encodeURIComponent('assets/图 1.jpg'))
})

test('版本号只在解析成功/清缓存时 +1，缓存命中不加也不通知', async () => {
  let calls = 0
  let notified = 0
  const off = subscribeResolved(() => {
    notified += 1
  })
  setAssetResolver(async (src) => {
    calls += 1
    return `blob:${src}-${calls}`
  })
  setAssetDocPath('示例文集/版本号.md')

  const before = getAssetVersion()
  const url = await resolveAsset('assets/v.png')
  assert.equal(url, 'blob:assets/v.png-1')
  assert.equal(getAssetVersion(), before + 1)
  assert.equal(notified, 1)

  // 缓存命中：不通知、不涨版本、不再调 resolver
  assert.equal(await resolveAsset('assets/v.png'), 'blob:assets/v.png-1')
  assert.equal(getAssetVersion(), before + 1)
  assert.equal(notified, 1)
  assert.equal(calls, 1)
  assert.equal(getResolvedAsset('assets/v.png'), 'blob:assets/v.png-1')

  off()

  // 清缓存：撤销并涨版本，订阅者收到一次
  const listener = () => {
    notified += 1
  }
  const offAgain = subscribeResolved(listener)
  clearAssetCache()
  assert.equal(getAssetVersion(), before + 2)
  assert.equal(notified, 2)
  assert.equal(getResolvedAsset('assets/v.png'), null)
  offAgain()
})

test('shouldWaitAssetPaint：工作区文档的相对图要等解析（第 82 轮 B-121）', () => {
  assert.equal(shouldWaitAssetPaint('assets/a.png', '示例文集/笔记.md', false), true)
  assert.equal(shouldWaitAssetPaint('./assets/a.png', '笔记.md', false), true)
  assert.equal(shouldWaitAssetPaint('sub/图 1.png', '示例文集/a/b.md', false), true)
})

test('shouldWaitAssetPaint：宿主单文件文档（docPath 恒空）也要等 /__asset', () => {
  assert.equal(shouldWaitAssetPaint('assets/a.png', '', true), true)
  assert.equal(shouldWaitAssetPaint('../a.png', '', true), true)
})

test('shouldWaitAssetPaint：既没有文档路径也不在宿主模式 → 不等（交给浏览器）', () => {
  assert.equal(shouldWaitAssetPaint('assets/a.png', '', false), false)
})

test('shouldWaitAssetPaint：data:/blob:/http(s) 一律不等', () => {
  assert.equal(shouldWaitAssetPaint('data:image/png;base64,AAA', '示例文集/笔记.md', false), false)
  assert.equal(shouldWaitAssetPaint('data:image/png;base64,AAA', '', true), false)
  assert.equal(shouldWaitAssetPaint('blob:http://localhost/abc', '', true), false)
  assert.equal(shouldWaitAssetPaint('https://example.com/a.png', '示例文集/笔记.md', true), false)
  assert.equal(shouldWaitAssetPaint('http://example.com/a.png', '', true), false)
})

test('shouldWaitAssetPaint：空值与空白一律不等', () => {
  assert.equal(shouldWaitAssetPaint('', '示例文集/笔记.md', true), false)
  assert.equal(shouldWaitAssetPaint('   ', '', true), false)
  assert.equal(shouldWaitAssetPaint(null, '示例文集/笔记.md', true), false)
  assert.equal(shouldWaitAssetPaint(undefined, '', true), false)
})

test('宿主单文件模式开关：默认关，置真后 isHostAssetMode 为真，关掉后回到假', () => {
  setHostAssetMode(false)
  assert.equal(isHostAssetMode(), false)
  setHostAssetMode(true)
  assert.equal(isHostAssetMode(), true)
  // 开关本身不改文档路径：宿主模式仍靠 setAssetDocPath('') 表达「没有目录句柄」
  setAssetDocPath('示例文集/开关.md')
  assert.equal(getAssetDocPath(), '示例文集/开关.md')
  // 关掉后同一张相对图不再等解析：这就是「宿主 → 普通文档」切换后该有的行为
  assert.equal(shouldWaitAssetPaint('assets/a.png', '', isHostAssetMode()), true)
  setHostAssetMode(false)
  assert.equal(isHostAssetMode(), false)
  assert.equal(shouldWaitAssetPaint('assets/a.png', '', isHostAssetMode()), false)
})
