/**
 * 对话框 Tab 环的边界计算（第 82 轮 B-109）。
 * roving tabindex 的组里只有 1 项 `tabIndex = 0`，其余是 `-1`：`-1` 的项既不是初始落点，
 * 也不算 Tab 环的首/末边界——否则打开设置会落在未选中的主题上，回绕也会回到 `-1` 项。
 * 只做数组下标运算，不 import React/DOM，单测能在 Node 里直接跑。
 */

/** 第一个可 Tab 的项（`tabIndex >= 0`）的下标；一项都没有返回 −1 */
export function firstTabbableIndex(tabs: readonly number[]): number {
  for (let index = 0; index < tabs.length; index += 1) {
    if ((tabs[index] ?? -1) >= 0) return index
  }
  return -1
}

/** 最后一个可 Tab 的项（`tabIndex >= 0`）的下标；一项都没有返回 −1 */
export function lastTabbableIndex(tabs: readonly number[]): number {
  for (let index = tabs.length - 1; index >= 0; index -= 1) {
    if ((tabs[index] ?? -1) >= 0) return index
  }
  return -1
}
