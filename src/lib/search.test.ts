import assert from 'node:assert/strict'
import test from 'node:test'

import { buildSearchRequest, parseSearchResponse, searchWeb } from './search.ts'

test('关闭或没有 key 时不发请求', () => {
  assert.equal(buildSearchRequest('off', '查询', 'key'), null)
  assert.equal(buildSearchRequest('tavily', '查询', '  '), null)
  assert.equal(buildSearchRequest('tavily', '   ', 'key'), null)
})

test('Tavily 请求体带查询与条数', () => {
  const request = buildSearchRequest('tavily', '三成的人会放弃', 'sk-x')
  assert.ok(request)
  assert.equal(request.url, 'https://api.tavily.com/search')
  assert.equal(request.headers.Authorization, 'Bearer sk-x')
  const body = JSON.parse(request.body)
  assert.equal(body.query, '三成的人会放弃')
  assert.equal(body.max_results, 5)
})

test('博查 请求体走自家域名', () => {
  const request = buildSearchRequest('bocha', '查询', 'key')
  assert.ok(request)
  assert.equal(request.url, 'https://api.bochaai.com/v1/web-search')
  assert.equal(JSON.parse(request.body).query, '查询')
})

test('解析 Tavily 结果', () => {
  const sources = parseSearchResponse('tavily', {
    results: [
      { title: '甲', url: 'https://a.example', content: '摘要甲' },
      { title: '乙', url: 'https://b.example', content: '摘要乙' },
      { title: '没有网址', content: '应被丢掉' },
    ],
  })
  assert.equal(sources.length, 2)
  assert.equal(sources[0].title, '甲')
  assert.equal(sources[1].url, 'https://b.example')
})

test('解析博查结果', () => {
  const sources = parseSearchResponse('bocha', {
    code: 200,
    data: { webPages: { value: [{ name: '丙', url: 'https://c.example', snippet: '摘要丙' }] } },
  })
  assert.equal(sources.length, 1)
  assert.equal(sources[0].title, '丙')
  assert.equal(sources[0].snippet, '摘要丙')
})

test('结构不对时给空数组不抛', () => {
  assert.deepEqual(parseSearchResponse('tavily', null), [])
  assert.deepEqual(parseSearchResponse('tavily', {}), [])
  assert.deepEqual(parseSearchResponse('bocha', { data: {} }), [])
  assert.deepEqual(parseSearchResponse('bocha', '不是对象'), [])
})

test('摘要过长会被截断', () => {
  const long = '字'.repeat(500)
  const sources = parseSearchResponse('tavily', { results: [{ title: 't', url: 'https://x.example', content: long }] })
  assert.ok(sources[0].snippet.length <= 300)
})

test('DeepSeek 请求走官方 Search 接口', () => {
  const request = buildSearchRequest('deepseek', '三成的人会放弃', 'sk-deep')
  assert.ok(request)
  assert.equal(request.url, 'https://api.deepseek.com/v1/tools/search')
  assert.equal(request.headers.Authorization, 'Bearer sk-deep')
  const body = JSON.parse(request.body)
  assert.equal(body.query, '三成的人会放弃')
  assert.equal(body.count, 5)
  assert.equal(body.need_content, false)
})

test('解析 DeepSeek 结果：summary 优先，snippet 兜底，空 url 丢掉', () => {
  const sources = parseSearchResponse('deepseek', {
    results: [
      { title: '甲', url: 'https://a.example', summary: '总结甲', snippet: '摘要甲' },
      { title: '', url: 'https://b.example', snippet: '摘要乙' },
      { title: '没网址', summary: '应被丢掉' },
    ],
  })
  assert.equal(sources.length, 2)
  assert.equal(sources[0].title, '甲')
  assert.equal(sources[0].snippet, '总结甲')
  assert.equal(sources[1].title, 'https://b.example')
  assert.equal(sources[1].snippet, '摘要乙')
})

test('DeepSeek 空结果给空数组', () => {
  assert.deepEqual(parseSearchResponse('deepseek', { results: [] }), [])
  assert.deepEqual(parseSearchResponse('deepseek', {}), [])
})

test('DeepSeek 错误码翻成可读文案', async () => {
  const originalFetch = globalThis.fetch
  const reply = (status: number) => {
    globalThis.fetch = (async () => new Response('err', { status })) as typeof fetch
  }
  try {
    reply(401)
    await assert.rejects(() => searchWeb({ provider: 'deepseek', apiKey: 'k' }, 'q'), /Key 无效/)
    reply(402)
    await assert.rejects(() => searchWeb({ provider: 'deepseek', apiKey: 'k' }, 'q'), /余额不足/)
    reply(429)
    await assert.rejects(() => searchWeb({ provider: 'deepseek', apiKey: 'k' }, 'q'), /太频繁/)
    reply(503)
    await assert.rejects(() => searchWeb({ provider: 'deepseek', apiKey: 'k' }, 'q'), /暂时不可用/)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('DeepSeek 摘要过长截断到 300', () => {
  const long = '字'.repeat(500)
  const sources = parseSearchResponse('deepseek', { results: [{ title: 't', url: 'https://x.example', summary: long }] })
  assert.ok(sources[0].snippet.length <= 300)
})