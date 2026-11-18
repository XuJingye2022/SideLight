/**
 * 删除确认框的说明文案（第 83 轮 B-212）。
 *
 * 原实现两个分支各写一套：干净分支只教用户打开回收站目录手动搬回，完全不提应用内「撤销」，
 * 与删除成功提示上的「撤销」按钮互相矛盾；脏分支又单独提「撤销会一起搬回」。
 * 现在两分支只有开头一句不同（脏分支多交代未保存正文与批注），
 * 「不会当场永久删除 + 怎么恢复」逐字共用，改文案只改这一个文件。
 */

/** 回收站目录（相对工作区根）：确认框里唯一一处路径，文案只从这里取 */
export const DELETE_TRASH_DIR = '.sidelight/trash/'

/** 干净分支的开头：说明文件会移到哪里（末尾的空格给 `<code>` 路径留位置） */
const CLEAN_LEAD = '移到这个文件夹的 '

/** 脏分支的开头：多交代未保存正文与批注，并说明撤销会一起搬回 */
const DIRTY_LEAD =
  '这篇还有未保存的正文。移到回收站时，未保存的正文与这篇的批注会一起删除，撤销会一起搬回。文件会移到 '

/** 两分支共用的收尾：不永久删除 + 两条恢复入口（应用内撤销优先，回收站目录兜底） */
export const DELETE_RECOVER_TAIL =
  '，不会当场永久删除。要恢复：在删除后的提示里点「撤销」，或把回收站里的文件移回原位。'

/** 两个分支只差这一句：脏分支把未保存正文与批注一起去向讲清 */
export function deleteDialogLead(dirty: boolean): string {
  return dirty ? DIRTY_LEAD : CLEAN_LEAD
}

/** 完整的说明文案 = lead + 回收站路径 + 共用收尾（组件按同一顺序渲染，路径带 `<code>` 样式） */
export function deleteDialogText(dirty: boolean): string {
  return `${deleteDialogLead(dirty)}${DELETE_TRASH_DIR}${DELETE_RECOVER_TAIL}`
}
