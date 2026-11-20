import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import {
  CHAT_CONTEXT_LIMIT,
  CHAT_HISTORY_LIMIT,
  CHAT_STICK_SLACK,
  CHAT_SYSTEM_PROMPT,
  appendDelta,
  buildChatMessages,
  chatContextOf,
  chatNearBottom,
  chatRefocusAfterStream,
  chatScrollOnUpdate,
  chatSpeaker,
  dropEmptyAssistantTail,
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

/**
 * 第 113 轮 B-243：401 失败收尾不能留一条空 assistant 气泡。
 *
 * `send()` 先塞空占位等流式落字（`MarginRail.tsx:196`）；失败时它从没被填过，
 * 改前留成 16 px 空框（`.tmp/r112-finder-ui2.json` 的 `error401.turns` 末条 `text:""`）。
 * 这个函数就是那处收尾的纯逻辑：末条空 assistant 撤掉，其余返回同一引用。
 */
test('dropEmptyAssistantTail：末条空 assistant 撤成原前缀，其余情况返回同一引用', () => {
  const asked = turns({ role: 'user', text: '问' })
  const failed = turns({ role: 'user', text: '问' }, { role: 'assistant', text: '' })
  assert.equal(dropEmptyAssistantTail(failed).length, 1, '[user]+[assistant,""] 要撤成 1 条')
  assert.deepEqual(dropEmptyAssistantTail(failed), asked, '撤掉后必须与原前缀逐项相等')

  // 无需删时必须返回同一引用：React 直接 bail out，否则每次收尾都多一次渲染
  const answered = turns({ role: 'user', text: '问' }, { role: 'assistant', text: '答' })
  assert.equal(dropEmptyAssistantTail(answered), answered, '有字的末条不能删')
  const empty: ChatTurn[] = []
  assert.equal(dropEmptyAssistantTail(empty), empty, '空数组原样返回')
  const tailUser = turns({ role: 'assistant', text: '旧答' }, { role: 'user', text: '再问' })
  assert.equal(dropEmptyAssistantTail(tailUser), tailUser, '末条是 user 原样返回')
})

/**
 * 第 113 轮 B-243 静态门：撤空占位只能挂在失败收尾上，且必须函数式调用。
 *
 * 闭包写 `setTurns(dropEmptyAssistantTail(turns))` 用的是这次渲染的 `turns` 快照：
 * 连续失败两次会把上一轮提问一起吞掉（A3 场景 b 会红）。渲染侧两条也要留住——
 * 删掉 `turn.text ||` 会丢正常回答，删掉 busy 的「…」会让 200 空流的占位变成空白。
 */
test('MarginRail 的失败收尾（静态门）：撤空占位恰 1 处、在 catch (error) 后、函数式', () => {
  const source = readFileSync('src/components/MarginRail.tsx', 'utf8')
  assert.equal(source.match(/dropEmptyAssistantTail\(/g)?.length, 1, 'dropEmptyAssistantTail( 全文件必须恰 1 处')

  const at = source.indexOf('catch (error)')
  assert.ok(at >= 0, '找不到 catch (error)')
  const around = source.slice(at, at + 400)
  assert.ok(around.includes('dropEmptyAssistantTail('), 'catch (error) 后 ≤400 字符必须含撤空占位')
  assert.match(
    around,
    /setTurns\(\(previous\) => dropEmptyAssistantTail\(previous\)\)/,
    '必须函数式写，闭包快照会吞掉上一轮提问',
  )
  assert.doesNotMatch(source, /setTurns\(dropEmptyAssistantTail\(turns\)\)/, '闭包写法必须 0 处')

  const renderAt = source.indexOf('rail-chat-turn is-')
  assert.ok(renderAt >= 0, '找不到 .rail-chat-turn 的渲染')
  const render = source.slice(renderAt, renderAt + 240)
  assert.ok(render.includes('turn.text ||'), '渲染仍要 turn.text ||，否则正常回答不显示')
  assert.match(render, /busy && turn\.role === 'assistant' \? '…'/, 'busy 期间的「…」占位不能被顺手删掉')
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

/**
 * 第 111 轮 B-240：流式中止抢焦点。
 *
 * 浏览器侧四条场景（A 普通收流回焦 / B 点文件树换文档 / B2 快速打开换文档 / C 焦点进正文）
 * 见 `.tmp/e2e-r111-a1-focus.mjs` 与 `.tmp/r111-a1-{before,after}.json`。
 * 这里只覆盖二维真值表与本修法在源码里的唯一落点。
 */
test('chatRefocusAfterStream：只有「没中止且焦点还在对话面板」才回焦', () => {
  assert.equal(chatRefocusAfterStream(false, true), true, '普通收流且读者还在输入框：回焦')
  assert.equal(chatRefocusAfterStream(true, true), false, '中止（换文档 / 卸载）不回焦')
  assert.equal(chatRefocusAfterStream(false, false), false, '焦点已被读者移出面板：不回焦')
  assert.equal(chatRefocusAfterStream(true, false), false, '两样都占：不回焦')
})

test('MarginRail 的收尾回焦唯一且必须过 chatRefocusAfterStream（静态门）', () => {
  const source = readFileSync('src/components/MarginRail.tsx', 'utf8')
  const focusLines = source.split('\n').filter((line) => line.includes('inputRef.current?.focus()'))
  assert.equal(focusLines.length, 1, `inputRef.current?.focus() 全文件必须恰 1 处（本缺陷原形是无条件回焦）`)
  assert.match(focusLines[0], /chatRefocusAfterStream\(/, '回焦必须挂在谓词上，删掉条件就红')
  assert.match(focusLines[0], /controller\.signal\.aborted/, '判据要读本轮的 signal，不能读别的状态')
})

/**
 * 第 112 轮 A1：流式每来一个 delta 都把记录拽回底部，读者上翻看不了历史。
 *
 * 判据是纯函数（现场读三个数），浏览器侧三段（上翻不被拽回 / 正向下跟 / 回到底恢复跟读）
 * 见 `.tmp/r112-a1-e2e.mjs` 与 `.tmp/r112-a1-{before,after}.json`：改前 `afterDeltas 344`、
 * `settledTop 386`，改后两者 ≤3。
 */
test('chatNearBottom：距底 < slack 才算贴底（0/31 true，32 false，顶端 false）', () => {
  // 记录区 500 高、可视 200：最大 scrollTop = 300，距底 = 300 − scrollTop
  const box = (scrollTop: number) => ({ scrollTop, scrollHeight: 500, clientHeight: 200 })
  assert.equal(CHAT_STICK_SLACK, 32, '余量是公开常量，改它要同时改这条断言')
  assert.equal(chatNearBottom(box(300)), true, '正好在底部（距底 0）')
  assert.equal(chatNearBottom(box(269)), true, '距底 31 < 32：仍算贴底')
  assert.equal(chatNearBottom(box(268)), false, '距底 32：不算贴底（边界是开区间）')
  assert.equal(chatNearBottom(box(0)), false, '翻到顶端（距底 300）不贴底')
  assert.equal(chatNearBottom(box(260), 64), true, '自定义 slack 64：距底 40 在范围内')
  assert.equal(chatNearBottom(box(269), 24), false, '自定义 slack 24：距底 31 超出')
  assert.equal(chatNearBottom({ scrollTop: 0, scrollHeight: 120, clientHeight: 120 }), true, '内容没溢出（距底 0）')
})

test('chatScrollOnUpdate：整轮变化无条件贴底，delta 只在本来就贴底时跟', () => {
  assert.equal(chatScrollOnUpdate(true, true), true, '整轮 +1 且贴底')
  assert.equal(chatScrollOnUpdate(true, false), true, '整轮 +1（新提问 / 切回页签）必须贴底，否则看不见刚发的那句')
  assert.equal(chatScrollOnUpdate(false, true), true, 'delta 且读者贴着底部：继续跟')
  assert.equal(chatScrollOnUpdate(false, false), false, 'delta 且读者上翻了：不拽回（本缺陷原形）')
})

test('MarginRail 的贴底判据（静态门）：单点写入、现场读、不加 onScroll', () => {
  const source = readFileSync('src/components/MarginRail.tsx', 'utf8')
  const writeLines = source.split('\n').filter((line) => line.includes('log.scrollTop = log.scrollHeight'))
  assert.equal(writeLines.length, 1, 'log.scrollTop = log.scrollHeight 全文件必须恰 1 处')
  assert.equal(source.match(/scrollTop\s*=/g)?.length, 1, 'scrollTop = 全文件必须恰 1 处（不留第二份状态）')

  const at = source.indexOf('log.scrollTop = log.scrollHeight')
  const around = source.slice(Math.max(0, at - 400), at + 400)
  for (const token of ['chatScrollOnUpdate(', 'chatNearBottom(log)', 'prevTabRef', 'turnCountRef']) {
    assert.ok(around.includes(token), `贴底那一行的 ±400 字符必须含 ${token}（判据要现场读、只认整轮变化）`)
  }

  const compared = around.indexOf('prevTabRef.current !== railTab')
  const guarded = around.indexOf(`railTab !== 'chat'`)
  const wroteBack = around.indexOf('prevTabRef.current = railTab')
  assert.ok(compared >= 0, '必须有 prevTabRef 的页签比较')
  assert.ok(wroteBack >= 0, '必须写回 prevTabRef（否则每次重新渲染都当成切页签、B-232 变假）')
  assert.ok(guarded > compared, 'prevTabRef 比较必须先于 railTab !== chat 守卫')
  assert.ok(guarded > wroteBack, 'prevTabRef 写回也必须先于守卫')

  const tag = /<div\b[^>]*className="rail-chat-log"[^>]*>/.exec(source)?.[0]
  assert.ok(tag, 'MarginRail.tsx 里找不到 .rail-chat-log 的开标签')
  assert.doesNotMatch(tag, /onScroll=/, '滚动位置只现场读，不挂 onScroll（不许缓存第二份状态）')
})

/**
 * 第 116 轮 B-242：对话记录里用户与侧灯两条消息没有可读的发言者标识（WCAG 1.3.1 / 1.4.1）。
 *
 * 修法只在显示层加一枚 sr-only 署名，`turn.text` 不动（进模型历史、流式拼接与 401 收尾的
 * 都是原文）。浏览器侧 before/after 对照见 `.tmp/e2e-r116-speaker.mjs` 与
 * `.tmp/r116-speaker-{before,after}.json`；这里断纯函数与两条读源码的机械门
 * （按块切 `styles.css`，照 `touchTargets.test.ts` 的做法）。
 */
test('对话发言者署名：用户「我：」、助手「侧灯：」，全角冒号且互不相同', () => {
  assert.equal(chatSpeaker('user'), '我：')
  assert.equal(chatSpeaker('assistant'), '侧灯：')
  assert.notEqual(chatSpeaker('user'), chatSpeaker('assistant'), '两枚署名必须分得清，否则读屏还是听不出谁在说')
  for (const label of [chatSpeaker('user'), chatSpeaker('assistant')]) {
    assert.match(label, /：$/, `署名要以全角冒号收尾，实际「${label}」`)
  }
})

/**
 * 静态门 ②：署名只能挂在 `.rail-chat-turn` 那一行的渲染里，且条件限定「有字或流式中」。
 * 从 `rail-chat-turn is-` 切 400 字（`:605` 的批注线程 `turn.text ?` 在切片外）：
 * 恰 1 处 `rail-chat-speaker`、条件在 span 前、span 在正文表达式前，正文与 busy 的「…」不动
 * ——删掉 `turn.text ||` 会丢正常回答，把 200 零 delta 的空 assistant 也标上署名会让 B-246 扩大。
 */
test('MarginRail 的署名渲染（静态门）：每 turn 恰 1 枚、条件是「有字或流式中」、正文表达式不动', () => {
  const source = readFileSync('src/components/MarginRail.tsx', 'utf8')
  const at = source.indexOf('rail-chat-turn is-')
  assert.ok(at >= 0, '找不到 .rail-chat-turn 的渲染')
  const render = source.slice(at, at + 400)

  const spanAt = render.indexOf('rail-chat-speaker')
  assert.ok(spanAt >= 0, '400 字切片里找不到 .rail-chat-speaker：署名没落到 turn 的渲染上')
  assert.equal(render.match(/rail-chat-speaker/g)?.length, 1, '每 turn 恰 1 枚署名（400 字切片里必须恰 1 处）')

  const condAt = render.indexOf('(turn.text || busy)')
  assert.ok(condAt >= 0, '署名条件必须是「有字或流式中」：200 零 delta 的空 assistant 不该标发言者（B-246 范围不变）')
  assert.ok(condAt < spanAt, '条件必须包住 span，不能无条件渲染')

  const textAt = render.indexOf('{turn.text ||')
  assert.ok(textAt > spanAt, 'span 必须在正文表达式之前：先署名后正文，复制出来的前缀顺序才对')
  assert.match(render, /chatSpeaker\(turn\.role\)/, 'span 里要调 chatSpeaker(turn.role)，不能写死一枚')
  assert.match(render, /busy && turn\.role === 'assistant' \? '…'/, 'busy 期间的「…」占位不能被顺手删掉')
})

/** 静态门 ③：sr-only 块恰 1 块、6 条声明逐项、三禁写只在该块里断 0（全文件有同名字段，照块断） */
test('署名的 sr-only 样式（静态门）：恰 1 块、6 条声明、三禁写在块内 0', () => {
  const css = readFileSync('src/styles.css', 'utf8')
  const blocks: { selector: string; body: string }[] = []
  for (const match of css.matchAll(/([^{}]*)\{([^{}]*)\}/g)) {
    const selector = match[1]
      .replace(/\/\*[\s\S]*?\*\//g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
    if (selector.length === 0) continue
    blocks.push({ selector, body: match[2].replace(/\s+/g, ' ') })
  }
  const own = blocks.filter((block) => block.selector === '.rail-chat-speaker')
  assert.equal(own.length, 1, `styles.css 里 .rail-chat-speaker 规则块必须恰 1 条，实际 ${own.length}`)

  const declarations = new Map<string, string>()
  for (const part of own[0].body.split(';')) {
    const at = part.indexOf(':')
    if (at < 0) continue
    declarations.set(part.slice(0, at).trim(), part.slice(at + 1).trim())
  }
  assert.deepEqual(
    [...declarations.entries()],
    [
      ['position', 'absolute'],
      ['width', '1px'],
      ['height', '1px'],
      ['overflow', 'hidden'],
      ['clip-path', 'inset(50%)'],
      ['white-space', 'nowrap'],
    ],
    'sr-only 必须恰这 6 条声明：显隐/裁切/不换行，多一条少一条都算走样',
  )

  // 三禁写只查这一块：全文件在 styles.css:332/:348/:909 有同名字段（plan-review P2-4）
  for (const forbidden of [/display\s*:\s*none/, /visibility\s*:\s*hidden/, /user-select\s*:\s*none/]) {
    assert.doesNotMatch(own[0].body, forbidden, `署名块里不许写 ${forbidden}：前两者会把文本从 innerText 与 AX 树摘掉，后者让复制丢前缀`)
  }
})
