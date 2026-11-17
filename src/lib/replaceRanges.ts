export type ReplaceRange = { from: number; to: number }

/**
 * 在一段纯文本上按命中区间做替换；`ranges` 必须按 `from` 升序、互不重叠。
 * 换入的词比命中长或短都按原文字符下标推进，不依赖替换后的坐标。
 * 重叠区间（调用方没过滤时）按先到先得跳过：`from < cursor` 的那一条不再替换。
 * 产品路径（`App.tsx` 的 `replaceEvery`）先检测相邻命中是否重叠，重叠就整单退回旧路径，
 * 所以正常调用不会走到这条防御分支。
 */
export function applyReplacements(text: string, ranges: ReplaceRange[], replacement: string): string {
  let out = ''
  let cursor = 0
  for (const range of ranges) {
    if (range.from < cursor) continue // 防御：重叠区间跳过，不重复替换
    out += text.slice(cursor, range.from) + replacement
    cursor = range.to
  }
  return out + text.slice(cursor)
}
