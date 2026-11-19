import assert from 'node:assert/strict'
import test from 'node:test'

import { EMOJI, EmojiInput, emojiAt } from './emoji.ts'

/**
 * 第 88 轮 B-106（emoji 半边）：`src/lib/emoji.ts` 的映射与手打判据。
 * 输入规则本身（tiptap 的 InputRule）不在单测里跑编辑器 —— 真机脚本负责逐键与保存字节。
 */

test('映射恰 20 枚', () => {
  assert.equal(EMOJI.length, 20)
})

test('名字唯一且都是 [a-z0-9_+-]+', () => {
  const names = EMOJI.map((entry) => entry.name)
  assert.equal(new Set(names).size, names.length, '名字不能重复')
  for (const name of names) {
    assert.match(name, /^[a-z0-9_+-]+$/, `短码名字形状: ${name}`)
  }
})

test('每个值都含 Extended_Pictographic', () => {
  for (const { name, emoji } of EMOJI) {
    assert.match(emoji, /\p{Extended_Pictographic}/u, `不是 emoji: ${name}`)
  }
})

test('20 个名字都能查回自己的 emoji', () => {
  for (const { name, emoji } of EMOJI) {
    assert.deepEqual(emojiAt(`:${name}:`), { name, emoji }, name)
  }
})

test('半角短码命中：:smile: → 😄', () => {
  assert.deepEqual(emojiAt(':smile:'), { name: 'smile', emoji: '😄' })
})

test('全角冒号与中文前缀都命中', () => {
  assert.deepEqual(emojiAt('：smile:'), { name: 'smile', emoji: '😄' })
  assert.deepEqual(emojiAt('时间：smile:'), { name: 'smile', emoji: '😄' })
  assert.deepEqual(emojiAt('你好:tada:'), { name: 'tada', emoji: '🎉' })
})

test('未知名字、未收尾、后面还有字都回 null', () => {
  assert.equal(emojiAt(':nope:'), null, '查不到名字')
  assert.equal(emojiAt(':smile'), null, '没收尾冒号')
  assert.equal(emojiAt('x:smile:y'), null, '后面还有字')
  assert.equal(emojiAt(''), null, '空串')
})

test('大小写与空白不放宽', () => {
  assert.equal(emojiAt(':Smile:'), null, '只认小写')
  assert.equal(emojiAt(' :smile: '), null, '短码后不能有空格')
  assert.equal(emojiAt(':smile :'), null, '名字里不能有空格')
})

test('前缀文本里的短码照认，连续短码只认最后一个', () => {
  assert.deepEqual(emojiAt('甲:smile:'), { name: 'smile', emoji: '😄' })
  assert.deepEqual(emojiAt('x:smile::tada:'), { name: 'tada', emoji: '🎉' })
})

test('扩展名与输入规则已挂上', () => {
  assert.equal(typeof EmojiInput.name, 'string')
  assert.ok(EmojiInput.name.length > 0, '扩展必须有名字')
  assert.equal(typeof EmojiInput.config?.addInputRules, 'function')
})
