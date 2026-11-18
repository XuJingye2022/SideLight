# 第 66 轮 finder-code（性能与代码）

环境：dev `http://localhost:5175`、CDP 9225、1440×900。
基线：`npx tsc --noEmit` exit 0；`npm test` 40 文件 **520 条全过**（`.tmp/r66-finder-npm-test.log`）。
本轮 diff：`83140727` = HEAD，无代码提交，只查最近 3 轮（63–65）改动周围。
脚本：`.tmp/e2e-r66-finder-code.mjs`、`.tmp/e2e-r66-finder-autosave.mjs`；原始数据 `.tmp/r66-finder-code.json`、`.tmp/r66-finder-autosave-source.json`。

## 实测（1 MB = 1,000,012 字符 / 44,446 块；100 KB 对照）

| 项 | 1 MB | 100 KB |
| :--- | :--- | :--- |
| 载入就绪 | 2,912 ms | 3,924 ms（含切换文档对话框） |
| 滚动跳转（两跳） | 292 / 283 ms，0 条 long task | 296 / 299 ms，0 条 |
| 编辑态逐键 10 字 | 1,586 ms（10 条 69–85 ms） | 657 ms，0 条 |
| `Ctrl+S` 到 toast | 187 ms（82 ms） | 36 ms |
| 进源码 | 1,172 ms（977 ms） | 116 ms（84 ms） |
| 源码态逐键 10 字 | 2,618 ms（11 条 ~120 ms） | 710 ms |
| **改字后退出源码** | **4,844 ms（单条 4,262 ms）** | 576 ms（123 ms） |

编辑态逐键、进源码、保存与 BACKLOG 既有基线（B-116 p50 148 ms、B-115 进 1.2 s）一致，无回归；源码态逐键与 B-139 同源（本条已 deferred，不重复计数）。

## F1（P1）源码模式下的改动不触发自动保存，也不写草稿

复现：打开 100 KB 文档 → `Ctrl+S` 建立基线 → 编辑模式打 `A`，等 3.2 s：文件 100,005 → 100,006 B、chip「已自动保存 11:26」；再进源码态打 `B`，等 3.2 s：`textarea` 值 +1（尾部 `。\n\nB`）、`__fsState` 文件仍 100,006 B、`diskTail = "rds。\n\n"`（无 `B`）、chip 仍是上一时刻的「已自动保存 11:26」。对照结论 `editorModeWrote: true / sourceModeWrote: false`。

根因：自动保存与停笔草稿的排程只挂在编辑器 `onUpdate` 里——`src/App.tsx:1080`（`scheduleAutoSaveRef.current()`）与 `:1050-1075`（2,500 ms 草稿计时器）。源码态打字只走 `setSourceText`（`:5604`），编辑器不产生事务，`onUpdate` 不触发；源码态那条 effect（`:2122-2137`）只 `setDirty` + `persistDocKey`，而后者 `>256 KiB` 直接 return（`:682`）。`saveBlockedByDialog` 的补排程 effect（`:3648-3654`）只在对话框开关变化时重排，离开对话框后不会补。

影响：>256 KiB 文档源码态编辑期间，磁盘、`.sidelight/drafts`、localStorage 三处都无副本，只有内存；状态栏仍显示旧「已自动保存」。正常关窗有 dirty 兜底会问，崩溃/强杀则丢改动。建议：源码态停笔 2 s 也排一次自动保存，把排程从 `onUpdate` 提取成源码态可调用的路径（`currentMarkdown()` 已返回 `sourceText`，`:3179`，`prepareSave` 无需改）。

## F2（P1）1 MB 文档在源码里改字后退出源码：单条 4,262 ms 长任务

复现：1 MB 文档 → 进源码 → 末尾打 10 字 → 点「源码」退回。`textarea` 收起用时 **4,405 ms**，编辑器内容出现新字 4,410 ms，全程 **4,844 ms**；`longTasks = [4262, 79]`；`sl-parse-done` 3 → 4；`.ProseMirror` 文本 844,464 → 844,474。100 KB 同路径 151 / 576 ms（123 ms）。4.2 s 期间无进度提示、界面完全不动。

根因：`applySource`（`:4338-4369`）只有在 `sourceText === sourceBaselineRef.current` 时才 `skipReparse`；源码里改过字必然走 `setMarkdown(footnoteSplit.body)`（`:4353`）做整篇 parse + 44,446 块重建。B-115（第 64 轮）只把「未改动的进/退」压到 1.2 s / 0.3 s，改字后退出这条路径没有条目也没有门槛。建议：改字后的退出复用 `markdownFastPath` 的守卫并把重建挪到可分段/带遮罩的路径，或先出提示再解析；至少补一条「1 MB 源码改字→退出 ≤ X ms」的基线（先取 4,844 ms 为改前值再定门槛，规则见 common.md）。

## 未验证

- 源码态 `Ctrl+S` 写盘内容（代码路径已核，未单独跑）。
- 宿主模式未跑：本机 WebView2 `INIT-FAIL`（B-121 既有）。
