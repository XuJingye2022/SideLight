/**
 * 单选组（radiogroup）的键盘模型：roving tabindex + 方向键换项。
 *
 * 为什么抽成纯函数：设置面板的主题单选组历史问题是「三项全进 Tab 序、方向键无效」
 * （第 51/54/56 轮复现，B-109）。判定逻辑放这里才能单测，组件只做一次映射。
 *
 * 键位按 WAI-ARIA 单选组惯例：右/下 +1、左/上 −1（环形）、Home 首项、End 末项。
 * 不认识的键返回 null，调用方不要 preventDefault——把 Tab、Enter、Esc 留给浏览器与对话框。
 */

/** 方向键 → 组内下一个索引；count<=0 或未知键返回 null */
export function nextRadioIndex(key: string, current: number, count: number): number | null {
  if (count <= 0) return null
  // current 越界时按首项算：焦点被外部脚本移走、或选项清单刚变短
  const base = current >= 0 && current < count ? current : 0
  switch (key) {
    case 'ArrowRight':
    case 'ArrowDown':
      return (base + 1) % count
    case 'ArrowLeft':
    case 'ArrowUp':
      return (base - 1 + count) % count
    case 'Home':
      return 0
    case 'End':
      return count - 1
    default:
      return null
  }
}

/**
 * roving tabindex：组里只有一个 Tab 站（选中项），其余 −1。
 * 没有选中项（selected<0）时退到首项——否则整组从 Tab 序里消失。
 */
export function rovingTabIndex(index: number, selected: number): number {
  if (selected < 0) return index === 0 ? 0 : -1
  return index === selected ? 0 : -1
}
