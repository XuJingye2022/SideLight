import assert from 'node:assert/strict'
import test from 'node:test'

import {
  clearAssetCache,
  getAssetDocPath,
  getAssetVersion,
  getResolvedAsset,
  isRelativeAsset,
  resolveAsset,
  setAssetDocPath,
  setAssetResolver,
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
