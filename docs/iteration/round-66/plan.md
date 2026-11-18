# 第 66 轮 plan（A/B 两轮）· revision 1

revision 1（2026-11-18）：按 `plan-review.md` 修 P1-1～P1-4、P2-1/P2-2；结构、范围不变。
startSha `83140727`；HEAD `8314072`（BRIEF 的 `c1052aa` 是父提交）。CDP 9222，E2E 前 `reset.mjs 9222`；dev 5175 不重启；不启 Edge、不 push、不改 `release/`。B-143/B-144 待入 BACKLOG（A1 步 1）。

## A 轮（源码态写入链；1 个执行代理 25 分钟）

### A1｜B-143 源码态停笔也排自动保存与停笔草稿（`src/App.tsx`）
1. `BACKLOG.md` P1 表补 B-143、B-144（证据引 `findings-code.md`）；`onUpdate` 草稿三支原样抽成 `scheduleDraft(text)`（`persistDocKey`≤256 KiB / `scheduleHostDraftRef` / `.sidelight/drafts` 2,500 ms），`scheduleDraftRef` 与 `scheduleAutoSaveRef` 同在 `:3631-3635` 赋值，`onUpdate` 改调它。
2. 排程**不能**挂 `:2122-2137`（声明在 `:3631-3635` 之前 → 同 commit 用的是上一渲染闭包，`:3178` 读到旧 `sourceText`，少写一字还报「已自动保存」）。改成：
   - `:2122` 把已算出的脏值存进新 ref `sourceDirtyNowRef`（复用 `:2129` 的 `normalizeForBaseline`；`baselineRef` 为 null 时取 `sourceText !== sourceBaselineRef.current`），删 `:2132-2136` 的 `persistDocKey`（`scheduleDraft` 第一支接管）。
   - **新 effect 声明在 `:3631-3635` 之后**，deps `[sourceMode, sourceText, originalText]`：`sourceMode && sourceText !== sourceBaselineRef.current && sourceDirtyNowRef.current` 时调 `scheduleAutoSaveRef.current()` 与 `scheduleDraftRef.current(sourceText)`；进源码与保存成功后不排。别用 `dirtyRef.current` 当闸门（`:798-800` 下一渲染才同步）。
3. 不改 `runAutoSave`/`performCommit`：源码态 `currentMarkdown()` 已返回 `sourceText`（`:3179`），`keepLosses`（`:3042`）不动。
验收（`.tmp/e2e-r66-impl-a1.mjs`，改自 finder 的 `e2e-r66-finder-autosave.mjs`，**端口 9225→9222**，import 换 `r51-fsa.mjs`）：
- 100 KB+开：打 1 字 → 300 ms 内 chip=「自动保存排队中」（改前恒为旧「已自动保存」，判别式）；3.2 s 后 `small.md` +1、尾串以该字结、chip 回 `auto-save-ok`、文档写 1/草稿 0（改前 `sourceModeWrote:false`）。
- 1 MB+开：`big.md` +1 且尾串有字，`sidelight.doc.v1` 无整篇；1 MB+关：`.sidelight/drafts/big.md` 出现且含新字、`big.md` 字节不变；负向：新文件停笔 3.2 s 不建文件。
门禁：`npm run verify`、`npm test`；`roundtrip` 不跑。

### A2｜B-143 一次停笔只写一份，1 MB 源码打字不加重卡顿（`.tmp/e2e-r66-impl-a2.mjs`、`impl.md`）
写计数照 `r51-fsa` 的 `ops`/`__fsCounts`（同 `e2e-r62-b2.mjs`）。四档：编辑器 × 开/关（B-120 回归，A1 改了草稿三支）、源码 × 开/关；1 MB 源码打字另测两档。
- 编辑器 100 KB+开：文档写 1、草稿 0（对照 `.tmp/r63-tester-b2.log`：`autoWriteBytes:36029`/`autoDraftWrites:0`；`.json` 不存在）；+关：文档 0、草稿 1。两条用 `node .tmp/e2e-r62-b2.mjs 9222` 复跑（输出 `.tmp/r62-b2.json`）。
- 源码 100 KB+开：同 A1 已验；+关：文档 0、草稿 1。
- 1 MB 源码打 10 字（关）≤2,900 ms（改前 2,618）、无新增 >1,000 ms 单条 long task、磁盘不变。
- 1 MB 源码打 10 字（开）后等 3.4 s：`big.md` +10（1,000,022→1,000,032）、尾串=textarea 尾串（**同时验 P1-1 旧快照**）。
门禁同 A1。风险：写入并发靠既有 `savingRef`；发现重复写盘先停草稿计时器，不改自动保存语义。

## B 轮

### B1｜delta 回归（先做，10 分钟；`.tmp/r66-delta.json`）
复跑 A1/A2 脚本 + finder-code 基线（含 `exitSourceEdited` 探针：`pmLen` +N、`sl-parse-done` +1）+ B-115（1 MB 进 ≤1,500/退 ≤600 ms、100 KB 进 ≤200、`scrollDiff` 全 0、`sl-parse-done` 3→3、0 错）；任一红先停 B2。验收：全 true，偏差 >10% 单列。

### B2｜B-144 源码改字后退出先绘遮罩，再整篇重解析（`src/App.tsx`、`src/styles.css`、`.tmp/e2e-r66-impl-b1.mjs`）
1. 加 `applyingSource` 状态 + `applyingSourceRef` 闸门。`switchView` 离开源码且 `sourceText !== sourceBaselineRef.current`：置状态 → 双 rAF + `setTimeout(0)` → `applySource()` → 原收尾（`setViewMode`/`focusEditor`/`restoreSourceScroll`）→ 清状态；未改动的进出走原同步路径。
2. DOM：`.source-layout`（`App.tsx:5586`）textarea 后加 `div.source-applying[data-source-applying][role=status][aria-busy=true]`，文案「正在应用源码改动…」，配色用现成 token。CSS 认类，测试查 data 属性。
3. CSS：`.source-layout`（`styles.css:1778`）补 `position:relative`；`.source-applying` 用 `position:absolute; inset:0; z-index:3` 盖住文本框、吃掉点击。必须绝对定位：textarea `min-height:72vh`（`:1809`），普通流会落到折叠线下。
4. 应用期间再点「源码/预览/回到富文本」不重入；`backToRich`、Esc、`togglePreview` 都走 `switchView`（`:4392-4428`）。
验收（`e2e-r66-impl-b1.mjs`，先 reset 9222）：
- 记时都在页面内：`click` 捕获打 `__clickAt`，`maskRafAt` 在第二个 rAF 取 `performance.now()`，longtask 记 `{duration,startTime}`。1 MB 改 10 字后退：**≥1,000 ms 那条**的 `startTime` > `maskRafAt`；仍含 ≥4,000 ms 一条。源码态重渲染 ~120 ms/键（`:5731`）→ 遮罩 rAF 前必有 100–250 ms 任务，不计门槛。
- 遮罩可见硬证据：第二个 rAF 记 `getBoundingClientRect()` 与 `elementFromPoint(视口内 rect 中心)`，须命中遮罩（`hit===mask || mask.contains(hit)`，`closest('textarea')===null`），写进 JSON。
- 时序：点击→第二个 rAF ≤250 ms（含 120 ms 渲染）；总 ≤5,330 ms（改前 4,844 +10%）；遮罩消失后 `[data-source-applying]` 为 0、正文尾含所打字符、`sl-parse-done` +1、焦点回 `.ProseMirror`。
- 100 KB 同路径 ≤700 ms（改前 576）；1 MB 未改动进出仍 1,200/300 ms 级、无遮罩。
- 截图 `shots/round-66/b1-applying-source.png`（拿不到记 UNVERIFIED）。
门禁：`npm run verify`、`npm test`。风险：B-115 双 rAF 还原必须留在 apply 之后；遮罩收在 `.source-layout` 内，不盖顶栏/状态栏；`exportAs` 等仍无遮罩，写进未验。

收尾：tester 独立验收、commit、改 BACKLOG；`impl.md` 与日志放 `.tmp/`。
