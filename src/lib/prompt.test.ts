import assert from 'node:assert/strict'
import test from 'node:test'

import { parseStream } from './annotations.ts'
import { DEFAULT_ANALYSIS_PROMPT, buildUserMessage } from './prompt.ts'

const countChars = (text: string) => text.length

test('默认提示词不超过 1500 字，且含 overall/硬规则', () => {
  assert.ok(countChars(DEFAULT_ANALYSIS_PROMPT) <= 1500, String(countChars(DEFAULT_ANALYSIS_PROMPT)))
  assert.match(DEFAULT_ANALYSIS_PROMPT, /"kind":"overall"/)
  assert.match(DEFAULT_ANALYSIS_PROMPT, /最多 1 条 revision/)
  assert.match(DEFAULT_ANALYSIS_PROMPT, /至少一条指出/)
  assert.match(DEFAULT_ANALYSIS_PROMPT, /判断 \+ 依据/)
})

test('提示词示例 JSON 可被 parseStream 解析', () => {
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

test('全文模式用户消息写明模式和结构意见', () => {
  const message = buildUserMessage(
    { before: '', selection: '正文', after: '', source: 'selection', truncated: false, charCount: 2 },
    'full',
  )
  assert.match(message, /模式：全文/)
  assert.match(message, /结构性意见/)
})
