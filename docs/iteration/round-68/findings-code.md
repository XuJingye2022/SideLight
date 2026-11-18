# 第 68 轮 finder-code（代码与性能）

只读审查；基线：`ffaae68`（工作树干净）。CDP 9225，1440×900，每次先 `node .tmp/reset.mjs 9225`。
脚本：`.tmp/e2e-r68-finder-code.mjs` → `.tmp/r68-finder-code.json`；`.tmp/e2e-r68-finder-code2.mjs` → `.tmp/r68-finder-code2.json`。
门禁：`npx tsc --noEmit` exit 0；`npm test` exit 0（无 fail 行）；两轮 E2E 均 0 控制台错误。

## 结论
- 新 P0：**0 条**。新 P1：**1 条**（F1 写放大，见下）。
- 最近 3 轮 diff（第 66 轮源码态排程、第 67 轮遮罩）周围未发现回退：载入、滚动、逐键、保存、进/退源码全部落在已记基线内。

## 矩阵实测
| 项 | 1 MB（1,000,012 B） | 100 KB（100,010 B） |
| :--- | :--- | :--- |
| 载入净耗时（readyMs 含脚本固定 2,000 ms） | 2,921 → 净 ≈0.9 s | 2,255 → 净 ≈0.3 s |
| 滚动两跳 | 296 / 298 ms，long task 0 条 | 280 / 284 ms，0 条 |
| 编辑态 10 键 | 1,581 ms（158 ms/键），long task 56–85 | 675 ms，0 条 |
| `Ctrl+S` | 180 ms，**1 次写** 1,000,022 B，无整篇读回 | 37 ms，1 次写 100,020 B |
| 进源码 | 1,250 ms（单条 1,045 ms 长任务） | 123 ms |
| 源码态 10 键 | 2,630 ms（263 ms/键），long task 99–253 | 748 ms，0 条 |
| 改字后退出源码 | 正文 4,626 ms / 全程 5,194，单条 4,156 ms；遮罩出现 2 次、退出后 `[data-source-applying]` 0 | 正文 163 / 全程 694 ms；同上 maskLeft=false |
| `sl-parse-done` | 3→4（仅改字退出那次） | 5→6 |
| 源码态停笔 3.4 s | — | 文件写 1 次 100,033 B、尾字 `W`、草稿 0 次 |

基线对照：1 MB 逐键 158 ms/键对 B-116 的 147–148、进源码 1,250 对 B-115 的 1,198–1,234、改字退出 4,626 对第 67 轮 4,470（+3.5%，轮间噪声内）——均无回退。源码态逐键 263 ms/键属 B-139 已记 P2，本轮不新增。

## F1（P1）源码改字后 2 s 内退出：草稿与自动保存同批触发，同一份全文写两次盘
- 现象（2/2 复现）：1 MB 文档在源码里打 1 个字后点「编辑」，`.sidelight/drafts/big.md` 先写 **1,000,034 B**，58–68 ms 后 `big.md` 再写 **1,000,035 B**；两轮分别见 `.tmp/r68-finder-code.json` 的 `big.exitSourceEdited.ops` 与 `.tmp/r68-finder-code2.json` 的 `scenarioA.ops`（该轮干净复现，`draftsLeft: []`，草稿写完即被删——纯白写）。
- 对照：同一 5 s 级长任务的另一条路径（编辑态打字后进源码，`scenarioB`）只写 1 次 → 触发条件是「源码态改字 + 2 s 内离开」，即第 66 轮新增的源码态排程碰上第 67 轮遮罩的 4.1 s 长任务：两个计时器（2,000 / 2,500 ms）一起过期，在长任务结束后同批落地。
- 根因链：`runAutoSave` 在 `performCommit` 前没有草稿闸门（`src/App.tsx:3621-3622`），草稿计时器只在保存成功后才清（`finishSaved`，`src/App.tsx:3024-3029` 清表 + 推代际）。`runAutoSave` 第一个 `await` 让出后，已过期的草稿回调先跑，此刻 `stale()`（`dirty` 仍 true、代际未推）成立 → 写全文。B-120「停笔只写一份」的验收只覆盖编辑器停笔路径，源码路径不成立。
- 影响：1 MB 档每次该操作多写 ≈1 MB（合计 ≈2 MB + 一次 0 字节截断写）。无数据丢失、无残留草稿触发误恢复。
- 建议修法（最小）：`runAutoSave` 守卫全过、真正 `await performCommit(...)` 之前清 `draftTimerRef.current` 并 `draftGenerationRef.current += 1`；失败路径仍由 `writeDraftFallback` 兜底（`:3630`）。

## UNVERIFIED
- 真机磁盘 / 网络盘 / OneDrive 占位文件下的双写耗时与可见影响未测（本机为假 FSA，只测调用次数与字节）。
- 真实中文输入法下源码态组合输入仍属 B-145（open），本轮未复测、不重复计数。
