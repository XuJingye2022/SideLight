import assert from 'node:assert/strict'
import test from 'node:test'

import { permissionOf, restorePlan, type LastSession } from './session.ts'

const fakeHandle = (name: string) => ({ name }) as unknown as FileSystemDirectoryHandle
const session = {
  kind: 'workspace',
  handle: fakeHandle('项目'),
  name: '项目',
  path: '项目/doc.md',
} as LastSession

test('宿主文档优先，跳过 FSA 会话', () => {
  assert.deepEqual(restorePlan(true, session, 'granted'), { action: 'host' })
})

test('granted 静默恢复', () => {
  assert.deepEqual(restorePlan(false, session, 'granted'), { action: 'restore', session })
})

test('prompt 只提示，不自动请求权限', () => {
  assert.deepEqual(restorePlan(false, session, 'prompt'), { action: 'confirm', session })
})

test('denied/无会话不恢复', () => {
  assert.deepEqual(restorePlan(false, session, 'denied'), { action: 'none' })
  assert.deepEqual(restorePlan(false, null, 'granted'), { action: 'none' })
})

test('permissionOf 没有 queryPermission 时按 granted', async () => {
  assert.equal(await permissionOf(fakeHandle('x') as unknown as FileSystemHandle), 'granted')
  const prompted = {
    name: 'x',
    queryPermission: async () => 'prompt',
  } as unknown as FileSystemHandle
  assert.equal(await permissionOf(prompted), 'prompt')
})
