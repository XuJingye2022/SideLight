import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import {
  CHAT_CONTEXT_LIMIT,
  CHAT_HISTORY_LIMIT,
  CHAT_SYSTEM_PROMPT,
  appendDelta,
  buildChatMessages,
  chatContextOf,
  pushTurn,
  type ChatTurn,
} from './chat.ts'

const turns = (...pairs: ChatTurn[]): ChatTurn[] => pairs

test('文档节选去掉首尾空白，空文档回空串', () => {
  assert.equal(chatContextOf('  正文一句  \n\n'), '正文一句')
  assert.equal(chatContextOf('   '), '')
  assert.equal(chatContextOf(''), '')
})

test('文档节选超长按上限截断并留省略号，长度正好等于上限', () => {
  const long = '甲'.repeat(CHAT_CONTEXT_LIMIT + 500)
  const clipped = chatContextOf(long)
  assert.equal(clipped.length, CHAT_CONTEXT_LIMIT)
  assert.ok(clipped.endsWith('…'))
  assert.equal(chatContextOf(long, 10), '甲'.repeat(9) + '…')
})

test('system 带角色提示词与「当前文档节选：」', () => {
  const [system] = buildChatMessages('正文甲乙', [])
  assert.equal(system.role, 'system')
  assert.match(system.content, /Sidelight 的侧灯/)
  assert.match(system.content, /当前文档节选：\n正文甲乙/)
  assert.doesNotMatch(system.content, /还没有正文/)
})

test('空文档的 system 写「（当前文档还没有正文）」，不出现空节选标题', () => {
  const [system] = buildChatMessages('   \n', [])
  assert.match(system.content, /（当前文档还没有正文）/)
  assert.doesNotMatch(system.content, /当前文档节选/)
})

test('只留最近 12 轮，更早的丢掉', () => {
  const many = Array.from({ length: 20 }, (_, index): ChatTurn => ({
    role: index % 2 === 0 ? 'user' : 'assistant',
    text: `第${index}句`,
  }))
  const messages = buildChatMessages('正文', many)
  assert.equal(messages.length, 1 + CHAT_HISTORY_LIMIT)
  assert.equal(messages[1].content, '第8句')
  assert.equal(messages[messages.length - 1].content, '第19句')
})

test('切片第一条是 assistant 就丢掉，直到第一个 user', () => {
  const messages = buildChatMessages(
    '正文',
    turns({ role: 'assistant', text: '旧回答' }, { role: 'user', text: '新问题' }, { role: 'assistant', text: '新回答' }),
  )
  assert.deepEqual(
    messages.map((message) => message.role),
    ['system', 'user', 'assistant'],
  )
  assert.equal(messages[1].content, '新问题')
})

test('空 turns 只有 system 一条', () => {
  const messages = buildChatMessages('正文', [])
  assert.equal(messages.length, 1)
  assert.deepEqual(messages.map((message) => message.role), ['system'])
})

test('末条 user 原样进消息（角色与文本逐条对上）', () => {
  const messages = buildChatMessages('正文', turns({ role: 'user', text: '帮我看这段' }))
  assert.deepEqual(messages[1], { role: 'user', content: '帮我看这段' })
})

test('pushTurn 不合并同角色：连着两次提问是两条', () => {
  const first = pushTurn([], 'user', '甲')
  const second = pushTurn(first, 'user', '乙')
  assert.equal(second.length, 2)
  assert.deepEqual(second[1], { role: 'user', text: '乙' })
  // 原数组不动（React 状态要拿新引用）
  assert.equal(first.length, 1)
})

test('appendDelta 只补末条 assistant，前面的条目不变', () => {
  const before = turns({ role: 'user', text: '问' }, { role: 'assistant', text: '答' })
  const once = appendDelta(before, '复')
  const twice = appendDelta(once, '：补')
  assert.deepEqual(twice, [
    { role: 'user', text: '问' },
    { role: 'assistant', text: '答复：补' },
  ])
  assert.notEqual(once, before, '要返回新数组，否则 React 不重渲染')
  assert.deepEqual(before[1], { role: 'assistant', text: '答' }, '原数组不能被改')
})

test('appendDelta 末条不是 assistant 或没有条目时原样返回', () => {
  const onlyUser = turns({ role: 'user', text: '问' })
  assert.equal(appendDelta(onlyUser, '字'), onlyUser)
  const empty: ChatTurn[] = []
  assert.equal(appendDelta(empty, '字'), empty)
})

test('对话提示词短，并指向「生成批注」而要求不编造', () => {
  assert.ok(CHAT_SYSTEM_PROMPT.length <= 400, String(CHAT_SYSTEM_PROMPT.length))
  assert.match(CHAT_SYSTEM_PROMPT, /生成批注/)
  assert.match(CHAT_SYSTEM_PROMPT, /不编造/)
  assert.match(CHAT_SYSTEM_PROMPT, /采纳/)
  assert.doesNotMatch(CHAT_SYSTEM_PROMPT, /JSON/)
})

/**
 * 第 108 轮 A1：流式期间关 live、收流再开，加一条行作用域机械门。
 *
 * `npm test` 里没有 DOM，只能读源码断那一行开标签（照 `touchTargets.test.ts` 的静态做法）。
 * 切片从 `className="rail-chat-log"` 的那个 `<div>` 取：`role="log"` 在它**后面**，
 * 从 `role="log"` 起切会漏掉 className（第 108 轮计划审查 H-1）。`role="log"` 全文件恰 1，
 * 否则切片可能选错标签、断言假绿。浏览器侧（characterData 条数与属性按时间线切换）见
 * `.tmp/e2e-r108-a1-live.mjs` 与 `docs/iteration/round-108/`。
 */
test('对话记录开标签：流式 aria-live=off，收流回 polite，另带 aria-busy={busy}', () => {
  const source = readFileSync('src/components/MarginRail.tsx', 'utf8')
  assert.equal(source.match(/role="log"/g)?.length, 1, 'role="log" 全文件必须恰 1 处')
  assert.equal(source.match(/className="rail-chat-log"/g)?.length, 1, 'className="rail-chat-log" 全文件必须恰 1 处')
  const tag = /<div\b[^>]*className="rail-chat-log"[^>]*>/.exec(source)?.[0]
  assert.ok(tag, 'MarginRail.tsx 里找不到 .rail-chat-log 的开标签')
  assert.match(tag, /aria-live=\{busy\s*\?\s*'off'\s*:\s*'polite'\}/, '流式期间必须 off、收流回 polite')
  assert.match(tag, /aria-busy=\{busy\}/, '流式期间要给读屏一个 busy 标记')
  assert.doesNotMatch(tag, /aria-live="polite"/, '静态 polite 会让流式逐字播报（本缺陷原形）')
  assert.match(tag, /role="log"/)
  assert.match(tag, /aria-label="对话记录"/, '可访问名不能顺手丢掉')
})
