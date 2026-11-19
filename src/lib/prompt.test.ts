import assert from 'node:assert/strict'
import test from 'node:test'

import { buildMessages } from './ai.ts'
import { parseStream } from './annotations.ts'
import type { ContextPayload } from './context.ts'
import { ANALYSIS_SYSTEM_PROMPT, DEFAULT_USER_PROMPT, DISCUSS_SYSTEM_PROMPT } from './prompt.ts'

const context = (selection = '正文'): ContextPayload => ({
  before: '',
  selection,
  after: '',
  source: 'selection',
  truncated: false,
  charCount: selection.length,
})

test('system 提示词含全部格式与安全规则，且不超过 1500 字', () => {
  assert.ok(ANALYSIS_SYSTEM_PROMPT.length <= 1500, String(ANALYSIS_SYSTEM_PROMPT.length))
  assert.match(ANALYSIS_SYSTEM_PROMPT, /只输出 JSON Lines/)
  assert.match(ANALYSIS_SYSTEM_PROMPT, /"kind":"overall"/)
  assert.match(ANALYSIS_SYSTEM_PROMPT, /最多 1 条 revision/)
  assert.match(ANALYSIS_SYSTEM_PROMPT, /至少一条指出/)
  assert.match(ANALYSIS_SYSTEM_PROMPT, /判断 \+ 依据/)
  assert.match(ANALYSIS_SYSTEM_PROMPT, /8–25 字/)
  assert.match(ANALYSIS_SYSTEM_PROMPT, /不编事实/)
  assert.match(ANALYSIS_SYSTEM_PROMPT, /<选区>/)
  // 角色句与判断门槛留在 system：用户改偏好时不能把它们连同格式规则一起覆盖掉
  assert.match(ANALYSIS_SYSTEM_PROMPT, /批注员/)
  assert.match(ANALYSIS_SYSTEM_PROMPT, /三处以上/)
})

test('system 提示词带五档紧急度，两条示例档位不同', () => {
  assert.ok(ANALYSIS_SYSTEM_PROMPT.length <= 1500, String(ANALYSIS_SYSTEM_PROMPT.length))
  for (const name of ['none', 'low', 'medium', 'high', 'urgent']) {
    assert.match(ANALYSIS_SYSTEM_PROMPT, new RegExp(`\\b${name}\\b`), `${name} 没写进 system`)
  }
  const levels = [...ANALYSIS_SYSTEM_PROMPT.matchAll(/"priority":"(\w+)"/g)].map((match) => match[1])
  assert.ok(levels.length >= 2, '两条 JSONL 示例都要带 priority')
  assert.notEqual(levels[0], levels[1], '两条示例不能给同一档')
})

test('user 提示词只放偏好与检查重点，不含格式与安全规则', () => {
  assert.ok(DEFAULT_USER_PROMPT.length <= 300, String(DEFAULT_USER_PROMPT.length))
  assert.match(DEFAULT_USER_PROMPT, /作者偏好与检查重点|论证|证据/)
  assert.doesNotMatch(
    DEFAULT_USER_PROMPT,
    /JSON|"kind"|overall|revision|不编事实|quote|批注员|三处以上/,
  )
})

test('一次请求两条消息：system 内置规则，user 只带作者偏好与正文', () => {
  const messages = buildMessages(context(), '作者偏好-35')
  assert.equal(messages.length, 2)
  assert.deepEqual(
    messages.map((message) => message.role),
    ['system', 'user'],
  )
  assert.equal(messages[0].content, ANALYSIS_SYSTEM_PROMPT)
  assert.match(messages[1].content, /作者偏好-35/)
  assert.match(messages[1].content, /<选区>/)
  assert.doesNotMatch(messages[0].content, /作者偏好-35/)
  assert.doesNotMatch(messages[1].content, /JSON|"kind"/)
})

test('空白 user 提示词回落默认，不留空标题', () => {
  const blank = buildMessages(context(), '   ')
  const fallback = buildMessages(context())
  assert.deepEqual(blank, fallback)
  assert.equal(blank[1].content, fallback[1].content)
  assert.match(blank[1].content, /^作者偏好与检查重点：\n\S/)
  assert.match(blank[1].content, new RegExp(DEFAULT_USER_PROMPT.slice(0, 6)))
})

test('全文模式写在 user 消息，格式规则仍只在 system', () => {
  const messages = buildMessages(context(), '作者偏好-35', 'full')
  assert.match(messages[1].content, /模式：全文/)
  assert.match(messages[1].content, /结构性意见/)
  assert.doesNotMatch(messages[1].content, /JSON Lines/)
  assert.match(messages[0].content, /"kind":"overall"/)
})

test('追问提示词仍要求短、具体、不编造', () => {
  assert.match(DISCUSS_SYSTEM_PROMPT, /不要编造/)
  assert.match(DISCUSS_SYSTEM_PROMPT, /短/)
  assert.doesNotMatch(DISCUSS_SYSTEM_PROMPT, /JSON/)
})

test('user 消息示例 JSON 可被 parseStream 解析', () => {
  const sample = [
    '{"kind":"meta","note":"我判断这段的意图是：说明延期原因。"}',
    '{"kind":"evaluation","quote":"原文逐字片段","note":"判断 + 依据"}',
    '{"kind":"overall","note":"全文最值得改的一处"}',
    '',
  ].join('\n')
  const parsed = parseStream(sample)
  assert.deepEqual(
    parsed.items.map((item) => item.kind),
    ['meta', 'evaluation', 'overall'],
  )
})
