# 第 53 轮 缺陷猎人（finder-bug）

判定：**无新 P0/P1**。1 条 P2（重命名失败提示）→ deferred。startSha `86ba2d1`（未变）；dev 5175 + CDP 9222（每段前 `node .tmp/reset.mjs 9222`）；假工作区 `.tmp/r51-fsa.mjs`；全程 console / pageerror 0 条。

## P2-1 重命名校验失败：输入框被挤到 10 px，错误文案被侧栏截断

- 复现：打开文件夹 → 文件行「⋯」→ 重命名 → 填 `x.txt` 回车（重名 `b.md` 同理）。
- 实际：`.tree-rename-input` 宽 **10 px**（重名时 18 px），看不出在改哪个名字；`.tree-rename-error` 右边界 228.4 px > 侧栏 218 px，文案截成「保留 .md 结尾，否则文件会从树里!」，无省略号、无 title。截图 `shots/round-53/rename-error.png`。
- 证据：`src/components/TreeActions.tsx:112-161`（input `flex:1;min-width:0;max-width:181`；error `max-width:210;nowrap`）、`src/styles.css:470-473`；`.tmp/r53-rename-hint.log`、`.tmp/r53-rename-shot.log`。
- 建议：错误改到行下方换行显示，或给 input 保底宽度（≥80 px）。→ BACKLOG `B-210` deferred。

## 五条路径结果

1. **保存/重开**（`a.md`）：Ctrl+S → `getFile 2 / text 0 / writable 1`，磁盘 `# 甲\n\n第一段。新增\n`；立刻再按 →「没有改动，未写入。」四项计数 0；切 `b.md` 再切回，正文含「新增」。B-006 修复仍成立。
2. **文件树**：新建 → `未命名.md`；重命名 → `笔记.md`（标题、磁盘同步；改名后输入「笔记内容」保存落到新文件）；删除 → `.sidelight/trash/20261118-033414-y1g1d5-笔记.md`，当前文档切到下一行；撤销 → 文件回树；刷新（外部新增）→「已刷新：新增 1 个，消失 0 个」。负路径：重名、非 `.md` 均被拒（提示见 P2-1）；脏文件删除弹「这篇还有未保存的正文…」，撤销后未保存正文也在（`# 甲\n\n第一段。未保存的改动\n`）。
3. **键盘/焦点**：Ctrl+P 命中 `external.md`；Ctrl+F「外部」计 1 / 2，Esc 关查找且焦点回 `.ProseMirror`；Ctrl+K 预填选区「外部段落。」，Esc 关后焦点回正文；表格 Tab 单元格 0→1、Shift+Tab→0、Ctrl+Enter 行 2→3。
4. **错误路径**：坏 Mermaid 出错误卡「图表没渲染出来，代码块内容仍是原文，可以继续编辑。」，`body` 与编辑器内 svg 均 0；5.8 MB 文件 →「「too-big.md」超过 5.5 MiB，仍在「bad-mermaid.md」」，当前文档与标题不变、无弹窗；脏切换弹「取消 / 不保存 / 保存并切换」。
5. **1 MB**：1,008,014 B / 28,001 段，载入 **1,631 ms**（第 52 轮记录 2,947 ms），滚到底 709 ms（2,331,801 px），末尾追加后 Ctrl+S **100 ms**，磁盘 +2 B 且含「末尾标记ZZ追加」，0 错误。

## UNVERIFIED

- 只读 / 文件占用导致的写回失败：假工作区句柄在闭包内，注入不了 `createWritable` 抛错，错误提示路径未验。
- 真实宿主 WebView2 与中文 IME 下的同一批路径。

## 重复（补证据，不重复计数）

- 重命名成功仍借「已刷新：新增 1 个，消失 1 个」（`B-208`，第 51 轮 deferred）——本轮再次复现。

脚本：`.tmp/e2e-r53-bug2.mjs`、`.tmp/e2e-r53-bug3.mjs`、`.tmp/e2e-r53-tree-neg.mjs`、`.tmp/e2e-r53-rename-hint.mjs`、`.tmp/e2e-r53-rename-shot.mjs`、`.tmp/e2e-r53-big1m.mjs`；日志 `.tmp/r53-*.log`。
