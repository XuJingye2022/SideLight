import assert from 'node:assert/strict'
import test from 'node:test'

import { errorCopy, ModelRequestError } from './ai.ts'

const NEXT_STEP = '下一步'

test('401 与 403 是 Key / 权限问题，给「打开设置」', () => {
  for (const status of [401, 403]) {
    const copy = errorCopy(new ModelRequestError('auth', `模型接口返回 ${status}`, status, '{"error":"bad key"}'))
    assert.match(copy.text, /API Key 无效/)
    assert.equal(copy.action, 'settings')
    assert.ok(copy.text.includes(NEXT_STEP))
  }
})

test('429 是限流，建议稍后重试', () => {
  const copy = errorCopy(new ModelRequestError('rate', '模型接口返回 429', 429))
  assert.match(copy.text, /限流/)
  assert.equal(copy.action, 'retry')
  assert.ok(copy.text.includes(NEXT_STEP))
})

test('TypeError / Failed to fetch 是连不上接口', () => {
  for (const error of [new TypeError('Failed to fetch'), new Error('NetworkError when attempting to fetch resource')]) {
    const copy = errorCopy(error)
    assert.match(copy.text, /连不上接口地址/)
    assert.equal(copy.action, 'settings')
    assert.ok(copy.text.includes(NEXT_STEP))
  }
})

test('500 是服务端错误，带状态码与重试', () => {
  const copy = errorCopy(new ModelRequestError('server', '模型接口返回 500', 500, '<html>500</html>'))
  assert.match(copy.text, /模型接口返回 500/)
  assert.equal(copy.action, 'retry')
  assert.ok(copy.text.includes(NEXT_STEP))
})

test('未知错误给统一话术，不铺原始响应', () => {
  const copy = errorCopy(new Error('{"secret":"raw response"}'))
  assert.match(copy.text, /操作没成功/)
  assert.ok(copy.text.includes(NEXT_STEP))
  assert.ok(!copy.text.includes('secret'))
  assert.equal(copy.action, 'retry')
})

test('原始响应只进 detail，不进文案', () => {
  const copy = errorCopy(new ModelRequestError('server', '模型接口返回 502', 502, 'upstream said no'))
  assert.ok(!copy.text.includes('upstream said no'))
})
