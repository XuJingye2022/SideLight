# 第 119 轮计划（单轮，revision 2）：B-249 只读面板让位 App 级对话框

修订 rev2：修 plan-review P1-1 与 P2-2…P2-6（= 用户 H1–H5）；单轮 A1/A2 结构与范围不变。

范围：只做 B-249；不动 `styles.css`、z-index、Esc、`release/`；版本 0.32.1。BACKLOG 只加 A2 的 4 行。

## 体积

- 基线 HEAD `83a70f2`（`.tmp/r118-tester-verify.log`）：门 `--max 315800` → gzip **315,509 B**（余 291）；`MarginRail-*.js` gzip9 **7,391**；合计 **322,900**（超 2,900，B-229 只记）。
- 预算：门、chunk 各 **≤ +150 B**；预估 +85~160 B（含 `hostDraftPrompt` ≈+12）。
- 兜底（H4）：改后连测两次取高；净增 ≤291 B 且两次 ≤315,800 才算过。净增 >291 B：不放宽 `--max`、不删逻辑（压缩器已剥注释，删注释对 gzip ≈0），报「门 / chunk / 合计 / 净增」四数交 lead；先例第 101、113 轮用 `--max 316000`，上限由 lead 定。impl.md 三数都要报。

## 定案（rev2 只删 rev1 步骤 2/3）

③让位：App 对话框一开两个只读面板不挂载，关掉回来，换文档不回（`docName` 清空）；①并入 `dialogOpen` 会吞 `Ctrl+Alt+N`、②z 30 压不过窄窗 44/45，故不选。步骤 2/3 与修法无关、只多吞 3 个模态态的键（H5），删掉少 ~90 B，`dialogOpen`/deps 不动。

## A1 实现（25 分钟）

1. keydown effect（4419）前加渲染期谓词：`appDialogOpen = settingsOpen || shortcutsOpen || globalSearch || quickOpen || pendingConfirm !== null || pendingSwitch !== null || sourceConfirm !== null || draftPrompt !== null || closeGuardOpen || hostDraftPrompt !== null`（H3 补末项，≈+12 B）。
2. `<MarginRail appDialogOpen={appDialogOpen} …/>`。
3. MarginRail：Props 加 `appDialogOpen: boolean` 并解构；256 的 `diffOpen = diffData !== null && railTab === 'notes' && !appDialogOpen`；316 的 `reviewActive = reviewOpen && railTab === 'notes' && !appDialogOpen`。
4. 826 portal 条件改 `diffData !== null && diffOpen`（前段供 TS 收窄）；885 不动。
5. `docName` effect（331-338）加 `setDiffData(null)`。

## A1 验收（ego CDP 57270、1440×900 + 1024×700；`.tmp/e2e-r119-a1-stack.mjs --phase before|after`）

等待纪律：焦点/inert 一律 `waitForFunction`（≤3 s）；**K** = 确认框态三件套（`.dialog` 可见 + `activeElement` 在其内 + `#root` 无 `inert`），面板焦点另用 `waitForFunction(activeElement 在 sheet 内)`；`before` 必须先于改码跑。

- B（无工作区）：`.rail-review-open` → `Control+P`：`.rail-diff-overlay` 0、`.quick-open-backdrop` 1、焦点 `.quick-open-input`；Esc → 在审面板回来、空态 = `MarginRail.tsx:918` 原文、焦点在 sheet；再 Esc 收起。
- 假工作区（H1）：照 `.tmp/e2e-r100-diff.mjs` 注入（假 FSA 记 ops），点树 `c.md`（干净，不弹「切换文档」）；B 在注入前跑，空态断言不改。
- A（脏文档）：打「甲」。→ `.rail-diff-open` → `Control+Alt+N`：`.rail-diff-overlay` 0、K 成立、`.dialog` 含「这篇还有没保存的改动」、中心 `elementFromPoint().closest('.dialog')` 非 null、Tab 5 次都在框内且三钮都到过；Esc → `.dialog` 0、`.rail-diff-sheet` 1、焦点在 sheet；再 Esc → 面板 0、`#root` 无 `inert`、`activeElement.tagName !== 'BODY'`。
- C（H1）：再点 `.rail-diff-open`，等 `write:c.md` 600 ms 不变（自动保存先落）记数 → `Control+s` → 3 s 内 `write:c.md` 恰 **+1**、假盘 `c.md` 含刚打的字、`.toast-text` 含「已保存」；无原生 picker（`App.tsx:3506-3507` 只在无工作区走）。
- 1024×700（H2/P2-2）：`.rail-toggle` 开抽屉（`.app.rail-open` 1、`.rail-backdrop` 1）→ `.rail-diff-open` → `Control+Alt+N`：K 成立、`.rail-diff-overlay` 0；既有 z 序（computed `.overlay` 40 < `.rail-backdrop` 44 < `.margin-rail` 45，`styles.css:1880/3705/3717`）仍压住确认框，只记不修（B-253）；关闭走「等焦点在「取消」→ Enter」（Esc 先关抽屉，`App.tsx:4466` 既有次序），随后 sheet 回、焦点在 sheet、0 pageerror。
- 负向对照（before，旧态，固定 400 ms）：`.rail-diff-overlay` 1、Tab 4 次同一 `.rail-diff-close`、`#root` 有 `inert`、Esc 后确认框才现身、焦点 `BODY`（复现 `.tmp/r119-finder4.json`）。
- 0 pageerror / console error；截图 2 张：`shots/round-119/confirm-over-diff.png`、`shots/round-119/diff-back-after-cancel.png`。

## 门禁

`npm run verify`；`measure-first-screen --max 315800` ×2 取高；`node -e` 量 chunk gzip9 与合计；`npm test` 0 fail（基线 62 文件 897 条）；`keyboard-acceptance` 52/52 后 `git checkout -- shots/round-05/`；不跑 `roundtrip`。

## 风险

R1 焦点竞争：rail hook 清理会把焦点还给 `.rail-diff-open`，App 对话框 hook 是父级 effect、其后落「取消」；若落 BODY 只补一帧 `focus()`。R2 顺序须 `diffData !== null && diffOpen`。R3 已消除。R4 窄窗 Esc 次序不改（1024 断言 + B-253）。

## A2 回归门与证据（同轮）

1. 静态接线门（贴 HEAD 0 命中对照）：`App.tsx` 的 `appDialogOpen` 定义 1 处且含 `hostDraftPrompt !== null`；`appDialogOpen={appDialogOpen}` 1；`MarginRail.tsx` 的 Props/解构各 1、`!appDialogOpen` ≥2。新文件 `src/lib/railModalGate.test.ts` 挂 `npm test` 链尾。
2. E2E 一次写全（B → 注入 → A → C → 1024 + 两相位），JSON 落 `.tmp/r119-a1-{before,after}.json`。
3. `impl.md` ≤4 KB：行号、before/after 关键字段、三数（门/chunk/合计）+ 净增、0 错误、UNVERIFIED、未入谓词两处理由（`TreeActions.tsx:278-282` 删除确认面板开着时不可达；`exportOpen/menuOpen` 被 z 60 压住只记）。
4. BACKLOG +4 行（只加不修）：B-250 P1 长 diff 键盘只读第一屏；B-251 P2 关闭钮 24×19；B-252 P2 暖纸徽标 4.02:1；B-253 P2 窄窗 `overlay` 40 < `rail-backdrop` 44 < `margin-rail` 45（改法：`.overlay` 提 46 或 `appDialogOpen` 时不渲染 `.rail-backdrop`）。

验收：静态门正反对照成立；E2E 五段全 true；两截图落盘。
