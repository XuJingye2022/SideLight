import assert from 'node:assert/strict'
import test from 'node:test'

import { noteAriaLabel, noteJumpKey } from './noteA11y.ts'

/**
 * 第 86 轮 B-141：批注卡可聚焦 + Enter 跳句。
 * 卡片此前是裸 `article`：读屏只念「文章」，Tab 也不停。文案与键盘判定抽在这里测，
 * DOM 侧（tabIndex / role / aria-label / onKeyDown）由真机脚本核对。
 */

const REVISION = { kind: 'revision' as const, quote: '这句话太长了', note: '简化一下。' }
const EVALUATION = { kind: 'evaluation' as const, quote: '引文八', note: '这里逻辑跳跃。' }

test('无障碍名字：第 1 处 + 类型 + 引文，0 起下标显示时 +1', () => {
  assert.equal(noteAriaLabel(0, REVISION), '第 1 处 修订：「这句话太长了」')
  assert.equal(noteAriaLabel(4, REVISION), '第 5 处 修订：「这句话太长了」')
})

test('无障碍名字：评价类写「评价」，引文短时原样', () => {
  assert.equal(noteAriaLabel(0, EVALUATION), '第 1 处 评价：「引文八」')
})

test('无障碍名字：引文里的换行与连续空白压成一个空格', () => {
  const label = noteAriaLabel(0, { ...REVISION, quote: '第一行\n\n第二行\t第三行' })
  assert.ok(!label.includes('\n'), '读屏会把换行念成「换行」')
  assert.equal(label, '第 1 处 修订：「第一行 第二行 第三行」')
})

test('无障碍名字：引文超过 20 字截断加省略号，前 8 字仍在', () => {
  const quote = '这是一段很长的引文用来测试截断行为是否生效'
  const label = noteAriaLabel(0, { ...REVISION, quote })
  assert.ok(label.includes(quote.slice(0, 8)), '前 8 字必须出现在名字里')
  assert.ok(label.includes(`${quote.slice(0, 20)}…`), '20 字之后应是省略号')
  assert.ok(!label.includes(quote.slice(20)), '超出的部分不该出现')
  // 21 字才截：20 字整不加省略号
  const exact = '一二三四五六七八九十一二三四五六七八九十'
  assert.ok(noteAriaLabel(0, { ...REVISION, quote: exact }).includes(`「${exact}」`))
})

test('无障碍名字：引文为空时退回批注第一句', () => {
  assert.equal(
    noteAriaLabel(0, { ...REVISION, quote: '', note: '这里需要补一个数据。后面还有话。' }),
    '第 1 处 修订：「这里需要补一个数据。」',
  )
  // 连句末标点都没有时整条批注当前引文
  assert.equal(noteAriaLabel(1, { ...REVISION, quote: '  ', note: '没有标点' }), '第 2 处 修订：「没有标点」')
})

test('Enter 跳句：只有卡片自己拿到焦点才算命中', () => {
  const card = { key: 'Enter', target: 'article', currentTarget: 'article' }
  assert.equal(noteJumpKey(card), true)
})

test('Enter 跳句：焦点在卡片里的按钮上不命中（冒泡到 article 也放行）', () => {
  assert.equal(noteJumpKey({ key: 'Enter', target: 'button', currentTarget: 'article' }), false)
})

test('Enter 跳句：非 Enter 与已被处理的按键都不命中', () => {
  assert.equal(noteJumpKey({ key: ' ', target: 'article', currentTarget: 'article' }), false)
  assert.equal(noteJumpKey({ key: 'Tab', target: 'article', currentTarget: 'article' }), false)
  assert.equal(
    noteJumpKey({ key: 'Enter', target: 'article', currentTarget: 'article', defaultPrevented: true }),
    false,
    '别的处理器已经处理过就不再跳',
  )
})
