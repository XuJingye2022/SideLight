import assert from 'node:assert/strict'
import test from 'node:test'

import { smartInput } from './smartTyping.ts'

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
