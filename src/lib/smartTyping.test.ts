import assert from 'node:assert/strict'
import test from 'node:test'

import { hasUnclosedBacktick, needsLineContext, smartInput } from './smartTyping.ts'

test('引号方向：句首 / 空格 / 左括号后是开引号，CJK 后是闭引号', () => {
  assert.deepEqual(smartInput('', '"', ''), { kind: 'insert', text: '“”', caret: 1 })
  assert.deepEqual(smartInput('a ', '"', ''), { kind: 'insert', text: '“”', caret: 1 })
  assert.deepEqual(smartInput('(', '"', ''), { kind: 'insert', text: '“”', caret: 1 })
  assert.deepEqual(smartInput('引', '"', ''), { kind: 'insert', text: '”', caret: 1 })
  assert.deepEqual(smartInput('', "'", ''), { kind: 'insert', text: '‘’', caret: 1 })
  assert.deepEqual(smartInput('引', "'", ''), { kind: 'insert', text: '’', caret: 1 })
})

test("don't / 1990's 的撇号原样返回 null", () => {
  assert.equal(smartInput('n', "'", ''), null)
  assert.equal(smartInput('0', "'", ''), null)
  assert.equal(smartInput('DON', "'", ''), null)
})

test('越过刚补上的关闭符只移动光标（含 } 与弯引号）', () => {
  assert.deepEqual(smartInput('', ')', ')'), { kind: 'skip' })
  assert.deepEqual(smartInput('', ']', ']'), { kind: 'skip' })
  assert.deepEqual(smartInput('', '}', '}'), { kind: 'skip' })
  assert.deepEqual(smartInput('(', ')', ')'), { kind: 'skip' })
  // 判的是产出物：ASCII " 在闭引号位、后面紧跟 ” 时越过
  assert.deepEqual(smartInput('引', '"', '”'), { kind: 'skip' })
  assert.deepEqual(smartInput('引', "'", '’'), { kind: 'skip' })
  // 后面不是关闭符时不越过
  assert.equal(smartInput('(', ')', ''), null)
})

test('破折号与省略号', () => {
  assert.deepEqual(smartInput('-', '-', ''), { kind: 'replace', from: -1, to: 0, text: '—' })
  assert.deepEqual(smartInput('..', '.', ''), { kind: 'replace', from: -2, to: 0, text: '…' })
  // ---- 不连续吞：第三根 - 的 before 末尾已是 —
  assert.equal(smartInput('—', '-', ''), null)
  assert.equal(smartInput('a.', '.', ''), null)
  assert.equal(smartInput('a', '-', ''), null)
})

test('中文后半角标点变全角；含 ! 的图片语法保护', () => {
  assert.deepEqual(smartInput('中', ',', ''), { kind: 'insert', text: '，', caret: 1 })
  assert.deepEqual(smartInput('中', ';', ''), { kind: 'insert', text: '；', caret: 1 })
  assert.deepEqual(smartInput('中', ':', ''), { kind: 'insert', text: '：', caret: 1 })
  assert.deepEqual(smartInput('中', '?', ''), { kind: 'insert', text: '？', caret: 1 })
  assert.deepEqual(smartInput('中', '!', ''), { kind: 'insert', text: '！', caret: 1 })
  // . 与 ... 抢同一个键，本轮不转
  assert.equal(smartInput('中', '.', ''), null)
  // 文字![图](a.png) 不能被打断
  assert.equal(smartInput('文字', '!', '['), null)
})

test('数字里的逗号点号不动', () => {
  assert.equal(smartInput('1', ',', '000'), null)
  assert.equal(smartInput('a', ',', 'b'), null)
  assert.equal(smartInput('v1', '.', '2'), null)
})

test('自动配对：左半边补右半边，反引号不配对', () => {
  assert.deepEqual(smartInput('', '(', ''), { kind: 'insert', text: '()', caret: 1 })
  assert.deepEqual(smartInput('', '[', ''), { kind: 'insert', text: '[]', caret: 1 })
  assert.deepEqual(smartInput('', '{', ''), { kind: 'insert', text: '{}', caret: 1 })
  // 反引号不配对：Code 的输入规则要能收到这次输入（`a` → 行内代码）
  assert.equal(smartInput('', '`', ''), null)
  assert.equal(smartInput('a', '`', '`'), null)
})

test('不命中返回 null（不是 false、不是 undefined）', () => {
  const result = smartInput('a', 'b', 'c')
  assert.equal(result, null)
  assert.notEqual(result, false)
  assert.notEqual(result, undefined)
})

test('含 | 的行不把 -- 换成 —：手打的表格分隔行原样保留', () => {
  // 第 4 个参数是光标前整行；GFM 表格允许省略首尾竖线，所以只判「行里有 |」
  assert.equal(smartInput('| --', '-', ' ', '| --'), null)
  assert.equal(smartInput('--- | --', '-', '', '--- | --'), null)
})

test('普通行的 -- 仍换成 —（修表格行不能连累破折号）', () => {
  assert.deepEqual(smartInput('-', '-', '', ''), { kind: 'replace', from: -1, to: 0, text: '—' })
  assert.deepEqual(smartInput('a-', '-', '', 'a-'), { kind: 'replace', from: -1, to: 0, text: '—' })
})

test('第三根 dash 不连吞（不因为新规则误命中）', () => {
  assert.equal(smartInput('—', '-', '', '---'), null)
  assert.equal(smartInput('—', '-', '', ''), null)
})

/* ---------- 第 47 轮 T2：反引号行内代码里的字符一个都不改 ---------- */

test('hasUnclosedBacktick 数落单反引号，跳过转义', () => {
  assert.equal(hasUnclosedBacktick(''), false)
  assert.equal(hasUnclosedBacktick('参数 `'), true)
  assert.equal(hasUnclosedBacktick('`a` 后'), false)
  assert.equal(hasUnclosedBacktick('`a` 与 `'), true)
  // \` 是转义，不算开代码
  assert.equal(hasUnclosedBacktick('\\`a'), false)
})

test('反引号代码里破折号与省略号不替换', () => {
  assert.equal(smartInput('参数 `--', '-', '', '参数 `--'), null)
  assert.equal(smartInput('`a..', '.', '', '`a..'), null)
})

test('反引号代码里的引号、括号、半角标点也不替换', () => {
  assert.equal(smartInput('`grep ', '"', '', '`grep "'), null)
  assert.equal(smartInput('`x', '(', '', '`x'), null)
  assert.equal(smartInput('中文`', '?', '', '中文`'), null)
  // 闭合之后恢复替换
  assert.deepEqual(smartInput('`a` b-', '-', '', '`a` b-'), { kind: 'replace', from: -1, to: 0, text: '—' })
})

test('会触发规则的键才取整行（性能守卫）', () => {
  assert.equal(needsLineContext('-'), true)
  assert.equal(needsLineContext('.'), true)
  assert.equal(needsLineContext('"'), true)
  assert.equal(needsLineContext('a'), false)
  assert.equal(needsLineContext('中'), false)
})

/* ---------- 第 49 轮 T3：紧邻汉字时 `--` 出 `——`（中文破折号占两个汉字位） ---------- */

test('紧邻汉字时 -- 出 ——', () => {
  assert.deepEqual(smartInput('中文-', '-', ''), { kind: 'replace', from: -1, to: 0, text: '——' })
  // 后一个字是汉字也算中文上下文（光标在句中打 --）
  assert.deepEqual(smartInput('甲-', '-', '乙'), { kind: 'replace', from: -1, to: 0, text: '——' })
  // 第三根不连吞：before 末尾已是 ——
  assert.equal(smartInput('——', '-', ''), null)
})

test('空段落与空格隔开时 -- 仍是一个 —（第 47 轮口径 + 分隔线回归）', () => {
  assert.deepEqual(smartInput('-', '-', ''), { kind: 'replace', from: -1, to: 0, text: '—' })
  assert.deepEqual(smartInput('甲 -', '-', ''), { kind: 'replace', from: -1, to: 0, text: '—' })
  assert.deepEqual(smartInput('word-', '-', ''), { kind: 'replace', from: -1, to: 0, text: '—' })
  // 表格行守卫仍在前
  assert.equal(smartInput('| 中文-', '-', '', '| 中文-'), null)
})

