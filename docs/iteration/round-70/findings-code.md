# 第 70 轮 finder-code 发现（代码与性能）

**结论：本轮 0 条新 P0/P1。** 第 67–69 轮改动的源码/组合/保存路径实测无回归；BACKLOG 无 open 的 P0/P1。
`npx tsc --noEmit` exit 0（0 错）。`npm test` exit 0（尾部 suites 9 全绿，与 BRIEF 记的 40 文件 520 条一致）。

## 1. 100 KB / 1 MB 矩阵（重跑第 68 轮同脚本，同端口 9225，与既往基线可比）

原始日志：`.tmp/r70-finder-matrix.json`（脚本 `.tmp/e2e-r68-finder-code.mjs`）

| 指标 | 100 KB | 1 MB | 基线对比 |
| :--- | :--- | :--- | :--- |
| 打开就绪 | 2,223 ms | 3,600 ms | 1 MB 载入 2.9 s 记于 README（含夹具等待，无回归） |
| 滚两跳 | 294 / 298 ms，0 long task | 293 / 297 ms，0 long task | 无 |
| 编辑态逐键 10 字 | 702 ms，0 long task | 1,647 ms，long task 53–125 ms×10 | B-116 1 MB p50 148 ms/键，一致（本轮与另一浏览器进程并发，偏高约 10%） |
| `Ctrl+S` | 33 ms，写 1 次 100,020 B | 172 ms，写 1 次 1,000,022 B | B-006/B-120 口径：1 次写、无整篇读 |
| 进源码 | 126 ms | 1,147 ms | B-115 门槛 ≤1,500 ms，过 |
| 源码态逐键 10 字 | 770 ms | 2,683 ms | B-143 基线 2,810/2,818 ms，过；仍见 B-139（P2） |
| 源码改字退出 | 701 ms，parse 5→6，退出窗口内 0 写 | 5,252 ms，遮罩出现过（seen=2），parse 3→4，1 次写 1,000,033 B | 第 67 轮总 4,470 ms；本轮并发下 +17%，同量级。遮罩上屏毫秒本轮脚本记的是 `performance.now` 时间戳，未独立换算 |

源码态停笔自动保存（100 KB 打 1 字等 3.4 s）：`small.md` 写 **1 次** 100,033 B、草稿 0 次 —— B-120/B-148 的「停笔只写一份」仍成立。
0 控制台错误、0 pageerror。

## 2. 第 69 轮新代码（`settleSourceComposition` / `pendingSourceLiveRef`）实测

脚本 `.tmp/e2e-r70-finder-compose.mjs`、`.tmp/e2e-r70-exit-ms.mjs`，原始日志同名前缀 `.json`（端口 9224）。

- **无双重 `applySource`**：组合中退出源码 parse **+1**（3→4），连点两次退出 parse 也只 +1（4→5）；退出后遮罩残留 0，`[data-source-applying]` 消失。
- **无额外延迟**：组合中退出 164 ms、组合后重载文档退出 160 ms、普通改字退出 162 ms（100 KB，单击）—— 第 69 轮的 300 ms 收尾门不落在快路径上。
- **组合串仍会落盘**（第 69 轮已记录，非新发现）：`Input.imeSetComposition('zhong')` 后单击退出 → 正文首部出现 `zhong`，2 s 后自动保存写 100,015 B。CDP 的 blur 会提交原始串，真输入法提交候选字，故属 BACKLOG B-149 的「真 IME 未验」范围。

## 3. P2 观察（不阻塞停止，建议入池）

- **连点两次「源码」退出时，源码框约 1.97 s 才收起**：单击 164 ms，间隔约 40 ms 连点两次 1,969 ms（`B_double.leftMs`），之后状态正常（视图回编辑、无遮罩残留、parse 只 +1、无重复写盘）。可疑根因：两次点击都进入 `switchView` 的 `settleSourceComposition` 分支，第二次的 `compositionend` 监听注册晚于事件，落到 300 ms 超时分支后再调一次 `switchViewRef`（重入）；1.8 s 的差额来源 **UNVERIFIED**。
  证据：`.tmp/r70-finder-compose.json` 的 `B_double`；对照 `.tmp/r70-exit-ms.json` 的 `s1/s2/s3`（160–164 ms）。

## 4. UNVERIFIED

- 真输入法「blur 丢候选字」的拦退分支：CDP blur 会提交原始串，脚本里模拟 value 变短的钩子未触发（`C_lost.truncated=0`），无法断言拦退后是否留字。需真 IME / WebView2。
- 1 MB 上述数字在另一浏览器进程并发下测得，与第 67 轮绝对值仅同量级可比。
