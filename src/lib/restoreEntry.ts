/**
 * 删除文件的恢复入口（第 84 轮 B-142）。
 *
 * 病根：撤销只挂在**单槽** toast 上（`App.tsx` 的 `notice`）。删除后切到下一篇随手打字保存，
 * 保存提示就把 toast 换成「已保存到 …」，`撤销` 按钮随之消失——trash 里的正文还在，但应用内
 * 没有恢复入口了（数据没丢，只是用户找不到路）。
 *
 * 做法：恢复入口与 toast 分开保存（本模块的 `RestoreEntry`），toast 可以随保存提示换掉，
 * 状态栏常驻一枚 chip 一直带着「撤销」，直到下一次文件树/工作区操作或用户自己关掉。
 *
 * 这里只放纯函数：状态迁移与文案。句柄、trash 读写都在 App 与 `trash.ts` 里，测试不需要 DOM。
 */

/** 一次删除留下的恢复凭据：名字给文案、路径给还原位置、trashName 给回收站里的副本名 */
export type RestoreEntry = {
  name: string
  path: string
  trashName: string
}

/** 会影响恢复入口的事件；其余事件（保存、打字、刷新树、普通提示）一律不动它 */
export type RestoreEvent =
  | { type: 'deleted'; entry: RestoreEntry }
  | { type: 'restored' }
  | { type: 'dismissed' }
  | { type: 'tree-changed' }
  | { type: 'workspace-changed' }

/**
 * 状态迁移：
 * - `deleted`：记下新凭据（一次只留最近一次删除）
 * - `restored` / `dismissed`：撤销成功或用户关掉 chip，入口消失
 * - `tree-changed`（新建、重命名）/ `workspace-changed`（开合文件夹）：树换了，凭据不再可信，清掉
 * - 其它事件：原样返回（保存提示、普通 toast、`refreshTree` 都不清，这正是本条要修的）
 */
export function nextRestoreEntry(current: RestoreEntry | null, event: RestoreEvent): RestoreEntry | null {
  switch (event.type) {
    case 'deleted':
      return { name: event.entry.name, path: event.entry.path, trashName: event.entry.trashName }
    case 'restored':
    case 'dismissed':
    case 'tree-changed':
    case 'workspace-changed':
      return null
    default:
      return current
  }
}

/** 状态栏 chip 的文案；没有入口时返回空串（调用方据此不渲染） */
export function restoreLabel(entry: RestoreEntry | null): string {
  if (!entry) return ''
  return `已删除 ${entry.name}`
}
