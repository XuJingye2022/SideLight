# 第 102 轮 finder-code（复查，不改代码）

- HEAD `bdd0c17` = 本轮 startSha，本轮无 diff；复查对象是第 99–101 轮（修订快照 / diff 面板 / 在审文件）与第 96–98 轮（对话页签）周围。
- 环境：dev `http://localhost:5175` 200（不重启）；真机 ego 浏览器 CDP 57270（1432×882）。
- 基线：`npx tsc --noEmit` exit 0；`npm test` 61 个测试文件全链 exit 0（链尾 `reviewFiles.test.ts` 13/13）。
- 已修/已回滚/队列：不重复（B-157/B-221~B-228 已 fixed，B-229 已在池；本轮 0 条与之重复）。

## F1（P1，性能/保存路径）修订快照清理每保存一次就读全部快照文件，随文档数线性放大

- 机制：`writeRevision` 写完 1 份后无条件 `dir.entries()` 遍历**整个扁平的** `.sidelight/revisions/`，再对每个 `.json` 做 `getFile().text()` + `parseRevision`，只按「同 key 8 份」清理；别的文档的快照也照读。`parseRevision` 还先 `JSON.parse`，再对 annotations `JSON.stringify` + `parseAnnotationStore`（每个文件 3 趟 JSON）。
- 触发面：`recordRevision` 挂在每次成功写盘后（`src/App.tsx:3502`），手动 `Ctrl+S`（`requestSave` → `runSave`，`src/App.tsx:3622`）与自动保存（`runAutoSave`，`src/App.tsx:3987`）走同一个 `performCommit`；`autoSave` 默认开 → 每次停笔 2 s 都会跑一遍。
- 实测（探针 `.tmp/r102-probe-revisions.mjs`，假句柄计数）：80 份快照时再保存 1 次读 **81** 个文件（写 1、列目录 1）；第 4 篇首次保存读 25 个、第 10 篇首次保存读 73 个——每次保存的读数是「已有全部快照数」。按 8/篇上限，200 篇工作区最多 1,600 个快照 → 每次保存读 1,600 个文件、≈4,800 次 JSON 解析。
- UNVERIFIED：真实 FSA/网络盘上的墙钟耗时（本机只有假句柄）。
- 修法：文件名带 key 前缀或按 key 分子目录，只读同键；或写时顺带维护「key → savedAt/name」索引（不读内容），清理只按索引。

## F2（P2，可访问性/一致性）新增「对比 / 在审」入口 35×16，低于仓库既定 24×24 目标

- 实测（真机当前页）：`.rail-diff-open` rect `[1210,140,35,16]`、`.rail-review-open` `[1252,140,35,16]`，`min-height/min-width` 都是 `auto`；CSS 写死 `height:16px`（`src/styles.css:1332-1339`）。
- B-110/B-82 已把 `.note-actions button`、`.toolbar-group > button`、`.stats-trigger` 抬到 24（`src/styles.css:1391`、`:1616`、`:1949`），同族新增项回落到 16。
- 间距豁免可能成立（两钮间隙 7 px、中心距 42 px），故不判 WCAG 失败，只作同族回归记录。
- 修法：命中区撑到 24×24（padding 或 `::before`），视觉标签仍 16 px；不动 `.rail-head` 高度。

## F3（P2，焦点）流式回答中断时无条件把焦点抢回对话输入框

- `docName` 变化 → `resetChat()` 中止流（`src/components/MarginRail.tsx:163-165`）；被中止的 `send()` 在 `finally` 里只要组件还活着就 `inputRef.current?.focus()`（`:196-205`）。用户在对话页签发问后切文档，焦点会从文件树/快速打开跳到 `.rail-chat-input`。
- 未实测（模拟流式即时返回，窗口难稳定捕获）；证据是代码路径。
- 修法：只在中止由用户点「新对话」触发、或最后焦点仍在对话面板时回焦；切文档路径改为 `busy=false` 且不聚焦（或聚焦新文档编辑区）。
