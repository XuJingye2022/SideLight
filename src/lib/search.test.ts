import assert from 'node:assert/strict'
import test from 'node:test'

import { buildSearchRequest, parseSearchResponse } from './search.ts'

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
