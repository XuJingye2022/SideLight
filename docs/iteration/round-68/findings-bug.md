# 第 68 轮 缺陷猎人报告（finder-bug）

- 环境：dev `http://localhost:5175`、CDP 9222（轮前 `node .tmp/reset.mjs 9222`）；HEAD `ffaae68` = 轮前 startSha；工作区干净；三个脚本 `consoleErrors` 全空。
- 口径：第 66/67 轮刚改动的「源码态自动保存 / 离开源码」路径做 delta 回归，4 条用户路径。
- 结论：**0 个新 P0/P1**。BACKLOG 仍只有 B-145 一个 open P1（第 67 轮既存，非本轮新发现，不重复计数）。未改产品代码、未动 BACKLOG。

## 执行的路径与结果

| # | 路径 | 结果 | 证据 |
| :--- | :--- | :--- | :--- |
| 1 | 100 KB 文档：源码末尾打 `Z` → `Ctrl+S` → 停笔 3.2 s → 点「回到富文本编辑」 | 保存 1 次 write 100,006 B、读盘 2 次、草稿 0 写、停笔窗口无第二写；磁盘尾 `正文。\nZ`；退出 205 ms、parse 3→4、正文尾含 `Z`、无重复写 | `.tmp/r68-bug-source.json` |
| 2 | 1 MB 文档：源码打 `Y` → `Ctrl+S` → 停笔 2.6 s → 回到富文本 | 保存 245 ms / 1 次 write 1,000,008 B、草稿 0；退出全程 **4,473 ms**：遮罩 on **59 ms**、off 4,473 ms、同帧编辑器可见、parse 3→4、焦点回 `.ProseMirror` | `.tmp/r68-bug-mask-timeline.json` |
| 3 | 源码脏（打 `K` 后 600 ms，早于草稿 2.5 s / 自动保存 2 s）点另一个文件 | 弹「切换文档」三键（取消 / 不保存 / 保存并切换）；点「取消」后仍是 `small.md`、源码框仍在且保留 `K`，`draftKeys: []`（无静默丢弃） | `.tmp/r68-bug-source.json` |
| 4 | 源码脏 → 点另一个文件 → 「保存并切换」 | 只写 `small.md`（100,025→100,026、尾 `K`），`big.md` 长度不变且不含 `K`，一次 write；标题 `big.md`；切回 `small.md` 编辑器尾含 `K` | `.tmp/r68-bug-save-switch.json` |

第 2 条与第 67 轮 tester 的编辑态退出（4,470 ms、遮罩 101 ms）同价，属已接受路径；第 3/4 条既无数据丢失也无串文档。

## 判为「不是缺陷」的假设（下一轮别重复）

1. **保存后离开源码仍整篇重解析 + 4.47 s 遮罩**：编辑器里始终是改前的正文，源码里改的字只有重解析才能进正文，与是否已存盘无关；`skipReparse` 的判据（`src/App.tsx:4400-4402`）本就只认「源码框没动过」。不是保存没推进基线的缺陷，`sourceBaselineRef` 只在进入源码时写（`:587`、`:4506`）符合设计。
2. **源码态 `Ctrl+S` 写两份 / 写错文档**：1 次 write、目标文档正确，B-143 / B-120 无回归（两条路径都验了停笔窗口）。

## 未入池观察（证据不足，不计数）

- 手工保存 1 MB 时保存链读盘 2 次整篇 `getFile`（`src/App.tsx:3093` 的保存前外部改动检查 + 1 处未定位）：`saveMs` 仍 245 ms，不影响正确性，未定性为缺陷。
- 100 KB 档离开源码 205 ms 内也整篇重解析一次（parse 3→4）；遮罩是否只闪一帧未用 MutationObserver 采到（第 2 条 1 MB 档采到 59 ms），不写结论。

## 复跑

```powershell
node .tmp/reset.mjs 9222
node .tmp/e2e-r68-bug-source.mjs .tmp/r68-bug-source.json
node .tmp/e2e-r68-bug-mask-timeline.mjs .tmp/r68-bug-mask-timeline.json
node .tmp/e2e-r68-bug-save-switch.mjs .tmp/r68-bug-save-switch.json
```
