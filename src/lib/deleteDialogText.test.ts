import assert from 'node:assert/strict'
import test from 'node:test'

import {
  DELETE_RECOVER_TAIL,
  DELETE_TRASH_DIR,
  deleteDialogLead,
  deleteDialogText,
} from './deleteDialogText.ts'

/**
 * 第 83 轮 B-212：删除确认框两分支共用恢复说明。
 * 干净/脏只差开头一句；「不会当场永久删除 + 撤销 + 回收站兜底」逐字相同。
 */

/** 干净的恢复句：从回收站路径开始到结尾（两分支必须逐字相同） */
function recoverSentence(dirty: boolean): string {
  const text = deleteDialogText(dirty)
  return text.slice(text.indexOf(DELETE_TRASH_DIR))
}

test('两分支都含「撤销」，且恢复句逐字相同', () => {
  for (const dirty of [false, true]) {
    const text = deleteDialogText(dirty)
    assert.ok(text.includes('撤销'), `分支 dirty=${dirty} 应提应用内撤销`)
    assert.ok(recoverSentence(dirty).includes('恢复'), '两分支都要给恢复说明')
    assert.ok(recoverSentence(dirty).includes('撤销'), '恢复说明里的第一个入口是撤销')
  }
  assert.equal(recoverSentence(false), recoverSentence(true), '恢复句逐字相同')
  assert.equal(recoverSentence(true), `${DELETE_TRASH_DIR}${DELETE_RECOVER_TAIL}`)
})

test('回收站路径只来自常量，文案里没有第二处硬编码', () => {
  assert.equal(DELETE_TRASH_DIR, '.sidelight/trash/')
  for (const dirty of [false, true]) {
    const text = deleteDialogText(dirty)
    assert.equal(text.split(DELETE_TRASH_DIR).length - 1, 1, '路径恰好出现一次')
    // 去掉常量那一次以后，文案里不应再有权宜写死的 .sidelight（换常量只改一个地方）
    assert.ok(!text.replace(DELETE_TRASH_DIR, '').includes('.sidelight'))
  }
})

test('dirty 与 clean 只差开头一句 lead', () => {
  for (const dirty of [false, true]) {
    assert.equal(deleteDialogText(dirty), `${deleteDialogLead(dirty)}${DELETE_TRASH_DIR}${DELETE_RECOVER_TAIL}`)
  }
  assert.notEqual(deleteDialogLead(true), deleteDialogLead(false))
  // 去掉 lead 后两分支逐字相同
  assert.equal(deleteDialogText(true).slice(deleteDialogLead(true).length), deleteDialogText(false).slice(deleteDialogLead(false).length))
})

test('clean lead 含「移到这个文件夹的」；两分支都不断句成「。，」且都保留手动恢复提示', () => {
  assert.ok(deleteDialogLead(false).includes('移到这个文件夹的'))
  assert.ok(deleteDialogLead(true).includes('撤销会一起搬回'), '脏分支交代撤销会一起搬回未保存正文')
  for (const dirty of [false, true]) {
    const text = deleteDialogText(dirty)
    assert.ok(!text.includes('。，'), 'lead 与收尾拼接不能出「。，」')
    // 计划审查 P2-4：本轮按验收删掉外部工具那一句，可执行提示仍在：把回收站里的文件移回原位
    assert.ok(text.includes('把回收站里的文件移回原位'))
  }
})
