/**
 * 查找条在只读视图（预览 / 源码）里的控件状态（第 77 轮 B-136）。
 *
 * 第 42 轮只把「上一处/下一处/替换/全部替换」四个动作钮设成 disabled：
 * 两个输入框还能聚焦打字、Aa/ab 还能点，但命中数不显示、Enter 被吞，
 * 唯一说明在底部的 `.find-note` 小字里。用户以为查找坏了。
 *
 * 这里把「哪些控件该锁」一次算清，组件只按结果渲染；锁用 readOnly 而不是 disabled，
 * 这样输入框仍能收到 Esc（关查找条）、也能复制里面的字。
 */

/** `.find-note` 的 id：只读时两个输入框用 aria-describedby 指向它 */
export const FIND_NOTE_ID = 'find-locked-note'

export type FindBarControls = {
  /** 当前视图不支持查找（源码 / 预览） */
  locked: boolean
  /** 上一处 / 下一处 / 替换 / 全部替换 */
  actionsDisabled: boolean
  /** 两个输入框 readOnly */
  inputsReadOnly: boolean
  /** 区分大小写 / 整词两个开关 */
  togglesDisabled: boolean
}

/**
 * @param reason 视图不可用时的说明；undefined / 空串表示可查找
 * @param matchCount 当前命中数：未锁但 0 命中时只有动作钮禁用（输入框要能继续打字）
 */
export function findBarControls(reason: string | undefined, matchCount: number): FindBarControls {
  const locked = Boolean(reason)
  return {
    locked,
    actionsDisabled: locked || matchCount === 0,
    inputsReadOnly: locked,
    togglesDisabled: locked,
  }
}
