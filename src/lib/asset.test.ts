import assert from 'node:assert/strict'
import test from 'node:test'

import { assetFileName } from './asset.ts'

// writeAsset 要真实文件系统，这里只测纯函数 assetFileName
test('中文名保留正文与扩展名', () => {
  assert.equal(assetFileName('会议纪要.png', 1), '1-会议纪要.png')
})

test('空格与全角括号换成 -，扩展名大小写不变', () => {
  assert.equal(assetFileName('屏幕 截图（2）.PNG', 2), '2-屏幕-截图-2.PNG')
})

test('连续特殊字符合并成一个 -，首尾的 - 去掉', () => {
  assert.equal(assetFileName('--封面@@@照片--.jpg', 3), '3-封面-照片.jpg')
})

test('主体超过 40 字符时截断', () => {
  const name = assetFileName(`${'中'.repeat(50)}.png`, 4)
  assert.equal(name, `4-${'中'.repeat(40)}.png`)
  assert.equal(name.length, 46)
})

test('截断后末尾的 - 也去掉', () => {
  const longBody = `${'a'.repeat(39)} @b`
  assert.equal(assetFileName(`${longBody}.png`, 6), `6-${'a'.repeat(39)}.png`)
})

test('没有扩展名时补 .png', () => {
  assert.equal(assetFileName('旅行照片', 7), '7-旅行照片.png')
})

test('原名为空时主体用 image', () => {
  assert.equal(assetFileName('', 8), '8-image.png')
  assert.equal(assetFileName('   ', 8), '8-image.png')
  assert.equal(assetFileName('@@@.png', 8), '8-image.png')
})

test('扩展名带不安全字符时改用 .png', () => {
  assert.equal(assetFileName('a.b/c', 9), '9-a.png')
})

test('安全字符 _ 与单个 - 原样保留', () => {
  assert.equal(assetFileName('my_note-01.png', 1), '1-my_note-01.png')
})

test('前缀是时间戳的 base36', () => {
  assert.equal(assetFileName('a.png', 35), 'z-a.png')
  assert.equal(assetFileName('a.png', 36), '10-a.png')
})

test('同名不同时间戳得到不同的名字', () => {
  const first = assetFileName('截图.png', 1000)
  const second = assetFileName('截图.png', 2000)
  assert.notEqual(first, second)
  assert.ok(first.endsWith('-截图.png'))
  assert.ok(second.endsWith('-截图.png'))
})
