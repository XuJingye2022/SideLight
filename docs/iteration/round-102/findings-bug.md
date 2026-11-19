# 第 102 轮 缺陷侦察（finder-bug）

前置：dev 5175 HTTP 200（未另起/未重启）；ego CDP 57270 实测；假 FSA 工作区（`a.md` 3 条批注 open/open/resolved、`sub/b.md` 1 条 open、`c.md` 无批注、预置 `.sidelight/annotations/*.json`）；1440×900；两轮 0 pageerror。本轮只报 **4 条新 P2**，无新 P0/P1；已修清单、队列条目、B-229 不重复。日志 `.tmp/r102-finder-a.log`、`.tmp/r102-finder-b.log`；脚本 `.tmp/e2e-r102-finder{,2}.mjs`。

## F1（P2，可访问性）「生成批注」把键盘焦点丢到 `<body>`

复现：工作区 → 切「对话」→ 输入「把这段压短」→ 焦点放「生成批注」按 Enter → 1.8 s 后 `activeElement` 是 `BODY`；再按 1 次 Tab 落状态栏 `.stats-trigger`（工具栏与正文全跳过）。鼠标点击同结果（`active:""`）。
期望：切到「批注」页签后焦点落在新卡片或页签上。
成因：`App.tsx:6026-6030` 先同步 `setRailTab('notes')`，`MarginRail.tsx:636-642` 对话面板随即 `hidden`，被隐藏面板里的按钮失焦后浏览器送回 body。
建议：切换前记 `activeElement`，切后 rAF 把焦点放到「批注」页签或首卡；或先 `blur` 再切、切后显式 `focus()`。

## F2（P2，在审列表）改档后 1.2 s 内「在审」报旧 open 数，面板开着不刷新

复现：`a.md` 两条 open → 卡片②改 resolved → 150 ms 后开「在审」得 `open 1 · 共 2 条`（真实 open 0）；等 1.8 s 仍 `open 1`；关掉重开才 `open 0`。另一例：改一档后立刻开得 `open 2`，真实 open 1。
证据：`.tmp/r102-finder-b.log` 的 `T2.fast`/`T2.fastStillOpenAfter1_8s`/`T2.afterFlush`；`.tmp/r102-finder-a.log` 的 `S2.reviewFastOpen` 对 `S2.reviewAfterFlush`。
成因：`MarginRail.tsx:288-307` 只读磁盘档，`App.tsx:2141` 的写盘约 1.2 s 防抖；扫完不重扫。
建议：当前篇用内存 `annotationsRef` 覆盖该行，或打开前 flush 批注档；面板停留超过写盘间隔时重扫一次。

## F3（P2，对话）「生成批注」吞掉指令：输入框清空，对话记录里没有这句

复现：对话页签已有一轮问答 → 输入「把这段压短，只留结论」→ 点「生成批注」→ 切到批注、新增卡片、`open 2 · 共 4 条`；但对话记录仍是原来 2 条、`chatDraft` 空，界面没留「这批批注按哪句话生成」；生成失败时找不回。
证据：`.tmp/r102-finder-a.log` 的 `S3.afterGenerate`（`chatTurns` 仍是发送前 2 条、`chatDraft:""`）。
建议：把指令作为一条 user turn 写进对话（不必送模型），或新卡说明带指令摘要。

## F4（P2，口径待定）全部结项的文档仍算「在审」

复现：`a.md` 两条全改 resolved → 关掉再开「在审」，行仍 `open 0 · 共 2 条`。列表把「有批注档」当在审，不看 open。
证据：`.tmp/r102-finder-b.log` 的 `T2.afterFlush`；`src/lib/reviewFiles.ts:103`（`annotations.length===0` 才跳过）、`:109`（`rows.push` 不看 `open`）。
建议：二选一——`open===0` 不入列；或分「有待处理 / 已全部结项」两段。口径由 lead 定。

## 走过但未发现新问题

diff：基线「没有改动」→ 打字 `+1 −1 行` → `Ctrl+Z` 回「没有改动」，基线未被自动保存/改档清零。修订快照：改 1 字 + 改 in-progress 后 `Ctrl+S`，`.sidelight/revisions/90af3629.json` 落盘（`v:1`、`bytes:109`、`annotations` 含 `reviewStatus`、无正文）。对话：Enter 出模拟回复、空输入与流式中 disabled、切页签保留、换文档清空。状态：open/in-progress 画 `.annot`，改 resolved 后 `.annot` 2→1、卡片 `is-closed`。在审：`aria-current` 跟当前文档，落盘后计数与档一致。两轮各 0 pageerror。

UNVERIFIED：真实中文 IME、真 WebView2 宿主、原生打印/另存 PDF；B-229 已是 open 条，不重复。
