import assert from 'node:assert/strict'
import test from 'node:test'

import { applyReplacements, type ReplaceRange } from './replaceRanges.ts'

test('多区间替换：换入的词比命中短，后面的下标仍按原文算', () => {
  const text = '侧灯只补光，侧灯不写'
  const ranges: ReplaceRange[] = [
    { from: 0, to: 2 },
    { from: 6, to: 8 },
  ]
  assert.equal(applyReplacements(text, ranges, '灯'), '灯只补光，灯不写')
})

test('删除：换入空串', () => {
  const text = '侧灯只补光'
  assert.equal(applyReplacements(text, [{ from: 0, to: 2 }], ''), '只补光')
})

test('换入的词比命中长，下标不漂移；相邻区间各自替换', () => {
  const text = '甲乙丙丁'
  const ranges: ReplaceRange[] = [
    { from: 0, to: 1 },
    { from: 1, to: 2 },
  ]
  assert.equal(applyReplacements(text, ranges, 'WW'), 'WWWW丙丁')
  assert.equal(applyReplacements('nothing', [], 'X'), 'nothing')
})
