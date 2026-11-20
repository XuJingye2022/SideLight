# 第 123 轮缺陷侦察（finder-bug）

只读复查，未改产品代码。HEAD `dcc31f1`；dev `localhost:5175`；ego CDP 57270；1440×900。已查重：BACKLOG 与已修列表（99–114/231/239/247 轮）无下述三条。

走过：分析、改档、快照、对话、生成批注、对比、1024 抽屉，均无新问题。

## F1（P2）重命名后该篇已有修订快照在应用内全部不可见（快照键未迁移）

- 复现：a.md 改两处、各存一次 → 在审「修订快照」2 行；文件树 a.md→c.md 重命名 → 再开在审变成「保存一次后才会记录。」；c.md 再存一次才出现第 1 行。
- 实际：磁盘上 2 份旧快照仍在，但 c.md 清单不列；改回原名才再出现，之后新保存另起新键，旧快照成永久孤儿。
- 证据：`.tmp/e2e-r123-finder-rename-snap.mjs`：`beforeRename.snaps` 2 行 → `afterRenameReview` `snaps:[]`、`snapEmpty:"保存一次后才会记录。"`、磁盘 2 份 → `afterNewSave.snaps` 1、磁盘 3 份；数据 `.tmp/r123-finder-bug-c.json`。
- 根因：`src/App.tsx:3029-3040` 重命名只迁 `['draft','annotations']`；快照名按 `revisionKeyHash(key)`，读侧 `src/lib/revisionList.ts:64` 只认当前键哈希。
- 期望：改名后 2 份快照仍列在 c.md 下（可标旧名）。建议：在 `handleRenamedFile` 补 revisions 目录迁移（`<旧哈希>-*` 改名 `<新哈希>-*`，单份失败跳过），`revisions.test.ts` 加 1 条。

## F2（P2）在审面板开着时自动保存写入的快照不刷新，空态与磁盘矛盾

- 复现：a.md 打字后（自动保存未到）立刻开「在审」→ 显示「保存一次后才会记录。」；约 2 s 后自动保存落盘（toast「已保存 a.md」、磁盘出现 1 份快照），面板仍是同一句空态；关掉重开才出现 1 行。
- 证据：`.tmp/e2e-r123-finder-bug-def.mjs`：`reviewImmediate` 磁盘 0 → `reviewLater` `panelOpen:true`、`snaps:[]`、`snapEmpty` 同上、`diskRevisions:1`、`toast:"已保存 a.md"` → `reviewReopened.snaps` 1 行；数据 `.tmp/r123-finder-bug-def.json`。
- 根因：`src/components/MarginRail.tsx:370-382` 的 `loadSnapshots` 只在 `openReview()` 调一次；批注行有内存合并 `applyLiveReviewRow`（`:416-422`），快照段没有。
- 期望：面板开着时新快照立即出现，或空态只说明打开那一刻。建议：App 在 `recordRevision` 成功后递增 `revisionEpoch` prop，面板开着且变化时重跑 `loadSnapshots`（共用 `reviewRunRef`）；否则空态改「打开后保存的不在此列」。

## F3（P2）对话页签只带正文开头 2000 字：选中末段提问，模型看到的仍是开头

- 复现：2,638 字文档（首段「开头标记甲」、末段「结尾标记乙」）。对话发「看看我现在正在写的这一段」→ 抓 `/chat/completions`：system 2,147 字，含开头标记、不含结尾标记。再选中末段（选区 17 字，以「结尾标记乙」开头）发「就我刚才选中的这一段」→ system 仍 2,147 字、仍无结尾标记，只最后一条 user 变。
- 证据：`docStats.chars:2638`、`chatRequest1.hasTail:false`、`selection.head:"结尾标记乙…"`、`chatRequest2` `systemLength:2147`/`hasTail:false`；脚本 `.tmp/e2e-r123-finder-bug-def.mjs`，数据 `.tmp/r123-finder-bug-def.json`。
- 根因：`src/lib/chat.ts:31-36` 的 `chatContextOf` 从第 0 字切 2000 字；`src/App.tsx:6025` 的 `getChatContext` 传整篇、无选区/光标参数，界面也无「只带开头」说明。
- 期望：讨论「这一段」时上下文至少含当前选区或光标所在块。建议：`getChatContext` 加选区（有选区给选区、无选区给光标块±1 块，仍截 2000 字）；`chat.test.ts` 补纯函数断言。

## 未覆盖 / UNVERIFIED

真实中文 IME、真模型（本轮假 fetch/假 Key）、原生打印、WebView2 未跑。脚本与数据：`.tmp/e2e-r123-finder-bug{,b}.mjs`、`.tmp/e2e-r123-finder-rename-snap.mjs`、`.tmp/e2e-r123-finder-bug-def.mjs`、`.tmp/r123-finder-bug*.json`。
