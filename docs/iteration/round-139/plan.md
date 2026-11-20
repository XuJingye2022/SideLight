# 第 139 轮计划（planner-revision，revision 2）· B-229 真实首载 ≤320,000

轮前 `0a99076`。只做 B-229，报告目录 `docs/iteration/round-139/`。按 `plan-review.md` 的 CR-1…CR-5 修订，结构与范围不变。

## §0 基线（本轮复跑 + 新量）

- 门 `total=315611`；常驻 `MarginRail-DANUDNjd.js` gzip9 **7,838**；**real=323449**（超线 3,449）；测试基线 70 文件 968 条。
- 新量（`.tmp/measure-modules5.mjs`/`:6`，gzip9）：`autoVerify.ts` **453**（兜底②上界）；四库 `chat/diffView/reviewFiles/noteA11y` 共值 **2,383**，可搬 ≈2,000（`noteA11y` 留）。面板 JSX 与库混压，**不写降幅**；A1/A2 各量一次填 `impl.md`。
- 接线：`App.tsx:20-21` lazy、`:6172` 外层 Suspense；`MarginRail.tsx` 的 `diffOpen`:301、`reviewActive`:365（含 `!appDialogOpen`）、`useDialogFocus`:302/:366、diff portal:954、review portal:1013、对话:169-296/:860-949；批注卡:606-860 留。

## §A1 拆「对比」与「在审列表/修订快照」

文件：`MarginRail.tsx`、新 `RailDiffPanel.tsx`、新 `RailReviewPanel.tsx`、四个静态门。

1. **只允许动态 import**（CR-1①）：`const RailDiffPanel = lazy(() => import('./RailDiffPanel.tsx'))`，`RailReviewPanel` 同式；`MarginRail.tsx` 不得出现两面板的静态说明符。
2. **按开合挂载 + 就地 Suspense**（CR-1①/CR-2）：`<Suspense fallback={null}>{diffOpen && <RailDiffPanel …/>}</Suspense>`，`reviewActive` 同式；不新造谓词，不依赖 App `:6172` 的边界。
3. **`useDialogFocus` 随面板走**：`:302`/`:366` 移进组件，第一参改「overlay 已渲染」的 `ready`；留下时首帧 ref 为 null、effect 不再重跑，焦点与 `inert` 全丢。
4. 搬 diff portal 与 `diffView`；review 数据 `:353-491` 与 portal `:1011-1100`；类名/`role`/`aria-*`/`tabIndex`/文案逐字不动。
5. 同步 `railDiffA11y`/`railModalGate`/`reviewLabelWording`/`revisionRefresh` 四门；加两条硬门：`lazy(() =>` = 2、两面板静态说明符 = 0。

验收 A1：① build 后 `dist/assets` 出现 `RailDiffPanel-*.js`、`RailReviewPanel-*.js`（记哈希与 gzip9）。② `git diff --stat scripts/measure-first-screen.mjs` 为空（**不动 `RESIDENT`**）。③ `resident=` 比 7,838，**不降即回滚**。④ `npm test` 0 fail ≥968；两条新门各留负向证据 1 红。⑤ 复用 `.tmp/e2e-r100-diff.mjs`(43/43) 与 `e2e-r101-review.mjs`(57/57)，首开改 `waitForSelector`，断言首点后 `.margin-rail` 在、焦点在 sheet。⑥ `total` 净增 ≤ +300。

## §A2 拆「对话」页签（chat.ts 随面板走）+ 兜底②

文件：`MarginRail.tsx`、新 `RailChat.tsx`、`chat.test.ts`、`railChatReset.test.ts`、`railDrawerGate.test.ts`。

1. `RailChat.tsx` 搬 `:169-296` 逻辑与 `:860-949` 面板（`turns`/`chatDraft`/`busy`/`send`/`generateNotes`/贴底与回焦/`threadRefocusRef`）；`chat.ts` 随组件走，`ai.ts` 的 `streamChat` 留原处（它在门里）。
2. `lazy(() => import('./RailChat.tsx'))` + **就地 Suspense**；`#rail-panel-chat`（`:871-872`）与 B-230 交接 `:314-350` 留原处；首开 `railTab==='chat'` 才挂、之后保持挂载（hidden）保 `turns`，`key={docKey}` 换篇清空。
3. 同步 `chat.test.ts` 8 处（改读 `RailChat.tsx`，三组断言逐字保留：focus 顺序与 body 豁免、delta 贴底跟随、`aria-live` 按 busy 切）与 `railChatReset`/`railDrawerGate`。
4. **兜底只剩一条**（CR-4：删旧兜底①，会打红 `railDiffA11y`/`touchTargets`/`themes`）：`App.tsx:49-55` 四个 `autoVerify.ts` 静态导入改 `await import('./lib/autoVerify.ts')`（`:1837-1841` 回调内），上界 **453**；改后 `autoVerify.test.ts:129-133` 须仍绿（`runVerifyPool(targets, VERIFY_CONCURRENCY` 与 `void runVerifyPool(` 逐字保留），`:2048` 仍不 await。

验收 A2：一次 build + `measure-first-screen.mjs` 记三数。按 CR-3：**real ≤320,000 → 进 A3**；**>320,300 → 停**（B-229 留 `open`、不翻口径）；320,001–320,300 才加兜底②再量，仍 >320,000 同样停。另：`MarginRail.tsx` 的 `lib/chat.ts` 0、`RailChat.tsx` 1；`resident=` 再降；`npm test` ≥968；r96 42/42；新 `.tmp/e2e-r139-suspense.mjs`（≤60 行：首点后 600 ms `.margin-rail` 恒在、`activeElement` 不落 `body`、末态 `.rail-chat-input` 有焦点）。

## §A3 把 `verify` 默认口径翻成真实首载

文件：`scripts/measure-first-screen.mjs`、新 `src/lib/firstScreenBudget.test.ts`、`package.json`（test 链尾 +1）。

1. 默认 `realMax = --real-max ?? max`，`real > realMax` → exit 1；`--target` WARN 与 `headroom` 改判 real（另留 `total=` 行）。
2. `--no-resident` 复旧口径：不扫常驻、无 real 行，`headroom` 与 `--target` 判 total。
3. 头注释 `:10-18` 改「默认 = 真实首载（门 + 常驻）」，写明 **`--max` 就是硬线**（`--max 316200` 会红）+ 实测三数。
4. `firstScreenBudget.test.ts` 4 条：默认 realMax 取 max；`--no-resident` 分支在；`RESIDENT` 匹配 `MarginRail-*.js`；`realGzip > realMax` → exit 1（负向删分支 1 红）。

验收：`verify` exit 0 且 `real=` ≤320,000（`target gap` WARN 属预期）；`--no-resident` exit 0 无 real 行；`--max 300000` exit 1；`--max 400000 --real-max 400000` exit 0；`npm test` ≥71 文件 ≥972 条 0 fail。

## §3 顺序、构建预算与不做

- 顺序：A1 → A2 →（real ≤320,000 才）A3。构建 ≤4 次：A1/A2 各一次、兜底②再一次、A3 的 `verify` 一次；**确定性用 `dist/assets` 名 + 字节表对照**，不重复构建（CR-5）。E2E 复用 r100/r101/r96，只加一条 ≤60 行探针。
- 时间：A1 8 / A2 9 / A3 6 分钟；超时就停、按 CR-3 决定是否留 `open`。
- 不做：改 `RESIDENT`、拆样式（旧兜底①）、push、`release/`、新依赖、tiptap/序列化、砍功能或文案。文档由 scribe 同步（含 ADR-0012）。B-229 置 `fixed` 只有一个条件：real ≤320,000 且已翻口径。
