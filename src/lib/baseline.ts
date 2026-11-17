/**
 * 保存基线的归一化：LF + 末尾换行跟随原文（与 prepareSave 完全同源）。
 *
 * 保存时 `prepareSave` 会在原文以换行结尾、正文序列化没有换行时补一个 `\n`，
 * 并把补过的串写进 `baselineRef`。退出源码、源码模式判断脏时若拿未补的串去比，
 * 就会恒不相等 → 假脏 + 一次空写盘（第 48 轮）。三处判定都改用这一个函数。
 */
export function normalizeForBaseline(text: string, original: string | null): string {
  const lf = text.replace(/\r\n/g, '\n')
  if (original !== null && original.endsWith('\n') && !lf.endsWith('\n')) return `${lf}\n`
  return lf
}
