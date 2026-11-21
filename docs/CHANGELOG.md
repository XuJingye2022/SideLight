# CHANGELOG

版本号在 `package.json`。每发一版加一节，最近的在上面。

## 0.32.2 — 2026-11-21

- 保存失败的提示改成中文、带文件名并给出路（用户 2026-11-21 报：保存时报 `保存失败：An attempt was made to write to a file or directory which could not be modified due to the state of the underlying filesystem。`）——现场实测：便携版 0.32.1 以**低完整性**（`S-1-16-4096`）运行，写普通文件夹被 Windows 拒绝（同一文件夹用中完整性写入立即成功），Chromium 把这次拒绝包成 DOMException `NoModificationAllowedError`，原文经 `reasonOf` 直接进了 toast。新 `src/lib/saveError.ts` 的 `describeSaveFailure(error, docName)` 按 DOMException 的 `name` 翻成中文（`NoModificationAllowedError` / `NotAllowedError` / `NotFoundError` / `QuotaExceededError` / `InvalidStateError`·`SecurityError` / 普通 Error / 未知），`performCommit` 与 `performSaveAs` 两处 catch 改用它（`App.tsx:3756`、`:3824`）：前者挂「另存为」并补 `writeDraftFallbackRef` 草稿兜底（手动保存失败不再只剩内存一份）、后者不挂（自己就是另存为）。打开文件夹 / 拖入文件夹时 `ensureWorkspaceWritable` 先试建 `.sidelight/trash`，失败即常驻错误提示「这个文件夹写不进去（原因）：文件能打开，但保存会失败。请用「另存为」换一个位置。」+「另存为」（`App.tsx:2940`，两条打开路径共用）；`FileTree` 头部补一行可见的 `.tree-write-warning`（`role=status`、`aria-describedby`），「＋ 新建」仍禁用但原因不再只藏在 `title` 里（`FileTree.tsx:500`、`styles.css:413`）。新 `src/lib/saveError.test.ts` **20 条**（含 6 条接线静态门）挂 `npm test` 链尾（71→**72 文件**、979→**999 条**）；E2E `.tmp/e2e-r141-save.mjs`（ego CDP 57270、1440×900、假 FSA、`autoSave:false`）**25/25、0 pageerror**：合成 `NoModificationAllowedError` → toast 逐字中文、无英文原文、只有一个可点的「另存为」、草稿 1→2 且含失败前正文、磁盘原文件字节未变；另存为失败文案、拖入只读文件夹的常驻提示与 `.tree-write-warning`/禁用态/`aria-describedby`、深色与暖纸 `--danger` 计算值逐字相等全过，截图在 `shots/round-141/`。门禁：`npm test` **72 文件 999 条 0 fail**、`npm run verify` exit 0 **PASS**（门 **317,479 B** / 常驻 `MarginRail` **4,471 B** / 真实首载 **321,950 B**，硬线 325,000 余 3,050）、`roundtrip` 不跑（未动编辑器/序列化）。UNVERIFIED：真 WebView2 宿主、真实只读盘/文件占用、真实中文 IME；会话恢复路径（`applySession`、宿主重开）不跑写入探测，恢复进只读目录时这轮的新提示不出现。
- 打开写不进去的文件夹不再被错误提示挡住、「＋ 新建」不再走进死路、写盘失败原因全中文（第 142 轮 A1，接第 141 轮交接 P0-2/P1-1；`BACKLOG` 无旧行，本轮补 **B-269**）——`ensureWorkspaceWritable` 不再 `setNotice` 弹常驻错误 toast（用户打开后的第一眼不再像「打开失败」），探测结果只交给文件树那行 `.tree-write-warning`；`FileTree`/`TreeActions` 的「＋ 新建」与「新建文件夹」**不再禁用**（只留 `title` 与 `aria-describedby`），警示行补「能打开也能编辑，保存会失败：请用「文件 → 另存为」换一个位置。」；`src/lib/saveError.ts` 新增 `writeReasonOf(error)`（按 `DOMException.name` 回中文短原因，**不拼 `error.message`**，原文只留调试；`describeSaveFailure` 未改）；`src/lib/trash.ts` 的 **11 处**失败原因全换它（回收站、删除、缓存搬移、恢复）；`createWorkspaceFile` 失败改 `writeReasonOf` + 先 `startNewDocument()` 再出中文提示（不写 `saveTargetRef`，用户在死路里仍能「另存为」），`createFolder` 同改。tester 独立验收（未读 `impl.md`）：`git grep -nE 'error\.message|second\.message' -- src/lib/trash.ts` **改前 11 → 改后 0（exit 1）**、`writeReasonOf(` **11** 处、`describeSaveFailure` 逐行未动；`npm test` **72 文件 1003 条 0 fail**；`npm run verify` exit 0 **PASS**（门 **317,638 B** / 常驻 **4,478 B** / 真实首载 **322,116 B**，硬线 325,000 余 2,884；对 141 轮 321,950 净 **+166**）。E2E `.tmp/e2e-r142-a.mjs`（ego CDP 57270、1440×900、假 FSA 拒写、`autoSave:false`）**30/30、0 pageerror**：打开后 `.toast` 0、`.tree-file` ≥1、`.tree-new-main` `disabled=false`、警示行中文、＋新建 → 空白 `未命名.md` + 「另存为」、`Ctrl+S` → 中文「保存失败」+「另存为」+ 文件名且无 W3C 英文、真句柄 Ctrl+S 同上且磁盘零写入、另存为 reject 仍中文；tester 另写独立探针 `.tmp/r142-tester-indep.mjs`（自建夹具）**17/17、0 pageerror**，回归 `.tmp/e2e-r141-save.mjs` **13/13**，截图 `shots/round-142/folder-unwritable.png`。UNVERIFIED：真 WebView2 宿主、真实中文 IME、真实 Low IL 桌面双击。

- 界面按「内容优先、无常驻格式栏」做减法并产出设计语言（第 143 轮 B1/B2/B3，用户 2026-11-21 反馈「无用 UI 多、要精简，参考 Typora」；`BACKLOG` 补 **B-270** 并标 `fixed`）——删整行格式工具栏（11 控件 → 0）：H1/H2/B/I/S/`</>` 只留键位（`Ctrl+1`/`Ctrl+2`/`Ctrl+B`/`Ctrl+I`/`Ctrl+Shift+X`/`Ctrl+E`），专注/打字机/源码/预览进「文件 → 视图」（`role="menuitemradio"` + `aria-checked` 跟真实状态），`F8` 补进快捷键一览；顶栏只剩 文件 ▾ / 分析 / 保存 / 插入 ▾ / 批注（导出去掉、`?` 与设置进「文件 → 帮助」、对比进「文件 → 视图」），`Ctrl+Alt+E` 改成「开文件菜单并聚焦导出组首项」，「插入」菜单补 `role=menuitem`；文件菜单四组：文件 / 导出 / 视图 / 帮助，并删与「新建」重复的「关闭文档」（`FileMenu.tsx` 内 `action:'closeDocument'` 一并删）；状态栏只报写作事实：字数（有选区时同一入口写「N 字 · 选区 M 字」）、自动保存、草稿恢复、删除撤销、缩放，4 个视图模式 chip 与「元数据」「保存到 X」「草稿 HH:MM」全删（元数据改到字数明细面板一行）；右栏栏头并进页签行（`.rail-head` 删除，「正在读 / N 条 / 在审 / 折叠（宽窗）/ 关闭（窄窗）」同一行，首卡上移）；文件树「⋯ → 刷新」删（树头 ⟳ 仍在）。新 `docs/design-language.md`：8 条原则、44→25 常驻控件计数表、19 行等价入口表（= 实际删除的常驻控件数）。体积：真实首载 322,116 → **321,273 B**（净 **−843**）；门 **316,793** / 常驻 **4,480**。`npm test` **72 文件 1003 条 0 fail**、`verify` PASS、`roundtrip` 不跑（未动编辑器/序列化）；`keyboard-acceptance` 52/52、`export-acceptance` 7/7、`export-math-acceptance` 10/10、`.tmp/e2e-r140-b.mjs` 38/38。UNVERIFIED：真 WebView2 宿主（F8 是否被吞）、真实中文 IME、macOS、真实 FSA。见 `docs/iteration/round-143/test.md`。

## Unreleased（第 29–140 轮，未发版）

**第 140 轮（同一未发版区间）**

- 右侧「批注」栏改成贴窗口右缘的网格轨，可拖宽 280–520、可折叠；窄窗仍是抽屉（**A1**，慢车道，用户 2026-11-21 队列第 1 条）——`.doc-layout` 改 `grid-template-columns:minmax(0,1fr) var(--rail-width,320px)`、`padding:52px 0 220px 32px`，`.doc-column` 在剩下的轨里居中（`width:100%;max-width:36rem;margin:0 auto`），所以栏右缘 = `main` 右缘；`.margin-rail` 加 `padding-right:12px`、`.note` 加 `right:12px`（绝对定位参照 padding 盒）。新 `App` 状态 `railWidth`(320)/`railCollapsed`、`.doc-layout` 内联 `--rail-width`；`MarginRail` 加 `.rail-resize`（`role=separator`、tabIndex 0、`aria-valuemin/max/now`、←/→ 各 16px、拖拽期间只写 CSS 变量、抬手才 `onResize`）与栏头 `.rail-collapse`；折叠后 App 右缘 `.rail-reopen` 接焦点、展开回 `.rail-collapse`（`pendingRailFocusRef` 在 effect 里消费）。窄窗（≤1119px）单列 + 顶栏「批注」抽屉、Tab 环回、Esc 回钮不变；宽窗折叠只在 `@media(min-width:1120px)` 生效。批注卡改按 `from` 升序渲染与排布；点卡先 `focus()` 再选句（ProseMirror 只在有焦点时同步 DOM 选区）。E2E `.tmp/e2e-r140-a.mjs`（ego CDP 57270，1440×900 + 1024×700，假 FSA 3 卡）**36/36、0 pageerror**：栏右缘 1430 = main 1430、卡右缘 1418 ≤ 1428、列宽 576、`padding-right:0px`、横溢 0；拖左 120 → **440**、到底 520、右到底 280，两档 3 卡 top 递增不重叠；折叠后栏不可见、`.rail-reopen` 是 activeElement（`aria-expanded=false`）、列宽 576、左移 **+174**（378 → 552）、展开回 378 且焦点 `.rail-collapse`；1024 栏隐藏、顶栏「批注」开抽屉（`role=dialog`、宽 **340**、背板、Tab 末→首 / 首→末、Esc 关且焦点回钮）；点卡选区逐字等于引文并在视口内；「在审」面板仍走 `.rail-diff-overlay/.rail-diff-sheet` 未坏。
- 顶栏「对比」切换全宽「与打开时相比」模式，点行回正文（**A2**，慢车道，用户队列第 2 条）——删 `MarginRail` 的对比链（`RailDiffPanel` lazy、`getDiff`、`diffOn`/`diffOpen`、`.rail-diff-open` 钮与两条 CSS），`diffOpen` 搬进 `App` + 顶栏按钮（`diffToggleRef`、`aria-pressed`、`aria-controls="diff-view"`）；`RailDiffPanel.tsx` 改为 `#diff-view` 全宽 section（去 `createPortal`/`useDialogFocus`/document Esc，改 `diffView(before, after, {maxRows:2000})`，截断提示「只显示前 2,000 行」），编辑块 `hidden={sourceMode||diffActive}` 让位；点行先剥 Markdown 标记（`annotations.ts` 新 `stripLineMarkup` / `locateMarkdownLine`，长行回退前 24 字）再定位、关面板、按帧等编辑块可见后 `focus`+`setTextSelection`+`scrollIntoView`。`appDialogOpen`/`railModal` 谓词加 `#diff-view`（`document.querySelector('.rail-diff-overlay, #diff-view')`），面板开着时 `Ctrl+Z`/`Ctrl+S`/`Ctrl+K`/`Ctrl+F` 只吞默认动作、`.toolbar`/`.table-bar` 加 `inert`、气泡不渲染；Esc 退出并回焦「对比」，`switchView` 与 `docInstance` 变化都收掉面板（换篇不留在上一篇）；进出记/还原 `main` 的 `scrollTop`。静态门按新接线改读不放宽：`railDiffA11y` 的 `lazy` 3→2、`tabIndex={0}` 3→**4**（拖宽把手）、`createPortal` 断言反转并挪到 App；`railModalGate` 删 `diffOpen` 断言、`!appDialogOpen` 2→1、谓词改 `.rail-diff-overlay, #diff-view`；`touchTargets` 共享块改 `.rail-review-open,.rail-collapse`；`chat.test.ts` 段尾锚点改 `getReviewWorkspace=`；`diffView.test.ts` **+2**（maxRows 2000 截断、两处改动各 2 行上下文）、`annotations.test.ts` **+2**（strip/locate）。E2E `.tmp/e2e-r140-b.mjs`（ego CDP 57270、1440×900、假 FSA、`autoSave:false`）**39/39、0 pageerror**：`#diff-view` 左缘 218 = main 左缘、右缘 1440 = main 右缘、宽 1222、无 overlay/sheet；`Ctrl+Z` 后正文与「+6 −2 行」不变、`Ctrl+S` **0 写**（0→0）、`Ctrl+K/F` 无浮层、`.toolbar[inert]` 且坐标点「插入」不出菜单；点 `## 测试标题`/`- 测试列表项`/`**加粗的句子**` → 面板关、焦点 `.ProseMirror`、选区逐字「测试标题」「测试列表项」「加粗的句子」、进视口；空行与 removed 行 → 面板仍开、无新 toast；Esc 退出焦点回「对比」；1024 同右缘公式、无横溢；2,400 行夹具 → 提示含「2,000」、`li` 恰 **2,000**、`ul.scrollHeight-clientHeight` **39,320**。
- 体积门按授权 320,000 → **325,000**（**A3**）——先删旧浮层/网格 CSS 与 `MarginRail` 对比链抵消后净增仍 **+1,315 B**（真实首载 319,806 → **321,121**），超 320,000 1,121 B；按任务授权把 `scripts/measure-first-screen.mjs` 默认 `--max` 改 325,000（注释/用法同步写清理由），`--target 310,000` 不动，同步 `AGENTS.md` §3/§4/§6、`README.md`、`BRIEF.md` 红线 7 的数字；超 325,000 的拆批条件已写在脚本注释与轮报。门禁：`npm run verify` exit 0 **PASS**（门 **316,648 B** / 常驻 **4,473 B** / 真实首载 **321,121 B**，余 3,879）、`npm test` **71 文件 979 条 0 fail**、`roundtrip` 不跑（未动编辑器/序列化）。UNVERIFIED：真 WebView2 宿主、真实中文 IME、真实 FSA、窄窗抽屉下真人拖拽。见 `docs/iteration/round-140/test.md`。

**第 139 轮（同一未发版区间）**

- 真实首载压到硬线下、`npm run verify` 默认改按真实首载判（**B-229**，慢车道；第 101 轮起连续 14 轮超线）——把常驻 `MarginRail-*.js` 里的三块面板按开合拆成 lazy chunk：新 `src/components/RailDiffPanel.tsx`（对比面板 + `diffView` + focus/Esc/portal）、`RailReviewPanel.tsx`（在审列表 + 修订快照 + `reviewFiles` 行合并 + focus/Esc/portal）、`RailChat.tsx`（对话页签 + `chat.ts` 随组件走），`MarginRail.tsx` 只留入口按钮、开关状态与就地 `<Suspense>`（`diffOpen` / `reviewActive` / 首开「对话」才挂载，之后 `hidden` 保 `turns`、`key={docKey}` 换篇清空），不砍功能与文案。产物体积：常驻 `MarginRail-*.js` gzip9 **7,838 → 4,190**、门 **315,611 → 315,616**（+5 B）、**真实首载 323,449 → 319,806**（≤320,000，余 194）；三个新 chunk gzip9 `RailDiffPanel` 1,344 / `RailReviewPanel` 2,089 / `RailChat` 2,482，只在使用时下载。`scripts/measure-first-screen.mjs` 默认口径翻成真实首载：`realMax = --real-max ?? max`（`--max` 即真实首载硬线，超线 exit 1）、`budgetGzip = noResident ? totalGzip : realGzip`，`--target 310000` 与 headroom 仍只 WARN，`--no-resident` 复旧口径（不扫常驻、无 `real` 行）；头注释写明 `--max 316200` 一类旧调用会红。新 `src/lib/firstScreenBudget.test.ts` **4 条**静态门挂 `npm test` 链尾（**70 → 71 文件**、968 → **975 条**），负向删预算 exit 分支 2 红。tester 独立（未读 `impl.md`）：门 315,616 + 独立 `zlib.gzipSync(level:9)` 复算常驻 4,190 = **319,806**；`--max 319805` exit 1 而 `--no-resident --max 319805` exit 0（证明默认判 real）、`--max 400000 --real-max 400000` exit 0、两次 build 同名同字节；自写 `.tmp/r139-tester-lazy.mjs`（ego CDP 57270、1440×900）**13/13、0 pageerror / 0 console error**——首载 900 ms 内三面板 chunk 请求 0、三个入口首点时各下 1、面板焦点/Esc/右栏节点/对话往返全过；回归 r100 **43/43**、r101 **57/57**、r96 **33/33**（跑后还原 `shots/round-{96,100,101}`）。`npm test` **71 文件 975 条 0 fail**、`npm run verify` exit 0。UNVERIFIED：真 WebView2 宿主、真实中文 IME、CI 三处调用的语义变化（不 push，未跑）、生产 gzip 传输（以脚本口径为准）。见 `docs/iteration/round-139/test.md`。

**第 138 轮（同一未发版区间）**

- 联网核对默认自动：配了搜索服务时，分析结束就自动核对出处，不用再手点卡片按钮（**B-266**，新条，ID 待 lead 确认；快车道）——新 `src/lib/autoVerify.ts`（`VERIFY_CONCURRENCY = 2`、`verifyQuery` 抽成手动/自动共用一条查询「原文 + 批注」压空白截 200 字、`autoVerifyTargets` 按 id 去重、`runVerifyPool` 限并发且单条抛错不打断）+ `autoVerify.test.ts` **13 条**挂 `npm test` 链尾（69→**70 文件**、955→**968 条**）；`src/App.tsx` 的 `verifyingId` 单值改 `verifyStates: Record<id, 'verifying' \| 'failed'>`，`verifyOne` 收口手动/自动两条路径（成功删记录、没搜到/抛错记 `failed`），`runAnalysis` 收集 `freshTargets`，结束时 `if (!controller.signal.aborted)` 调 `autoVerify`（`void runVerifyPool(…, VERIFY_CONCURRENCY)`，不 await、不阻塞正文），搜索仍走 `await import('./lib/search.ts')` 惰性 chunk；`MarginRail.tsx` 卡底按钮有出处就不渲染，核对中「核对中…」、失败「重新核对」。tester 独立（未读 `impl.md`、未复用执行方脚本）：自写 `.tmp/r138-tester-auto-verify.mjs`（ego CDP 57270、1440×900、无 AI Key 走 mock 分析流、页面内假 fetch 只拦 tavily 并记 query/并发）**21/21、0 pageerror / 0 console error**（`.tmp/r138-tester-auto-verify.json`）——A：3 卡 → **3 次请求、0 次手点**、`peak=2`、「核对中…」出现后消失、每卡 1 条出处且按钮消失、query 与卡片逐字相等、搜索未回来时分析按钮已可用、search chunk 分析前 0 → 核对后 1；B：500/空结果 3/3 卡「重新核对」+ toast「搜索服务暂时不可用（500）」；C：无 Key 时分析完 + 1.6 s 仍 **0 请求**、3/3 卡「联网核对」`disabled`；静态 `autoVerify(freshTargets)` 1 / `await runVerifyPool(` 0 / 静态 `search.ts` import 0、动态 1、`verifyingId` 全 src 0；`dist` 主包无 tavily/bocha 端点而 `search-*.js` 有；负向 `VERIFY_CONCURRENCY 2→3` **1 红 exit 1**、SHA256 `34F37A29…` 还原后 13/13。回归 r97 **44/44**（跑后还 `shots/round-97/`）、r79 卡底三钮 **7/7**（`SIDELIGHT_CDP=57270`）。门禁：`npm run verify` exit 0 **PASS**、门 gzip **315,611 B**（headroom 4,389）、常驻 `MarginRail-DANUDNjd.js` gzip9 **7,838**、真实首载 **323,449**（超硬线 3,449，归 B-229 仍 `open` 只记）；`npm test` **70 文件 968 条 0 fail**；`roundtrip` 不跑（未动编辑器/序列化）。观察（不判 FAIL）：同一批内容重跑分析时 `replaceInWindow` 保留旧 `sources`，自动核对仍重搜，失败态被旧出处挡住只弹 toast。UNVERIFIED：真实搜索服务与真实模型、中止分析不自动核对分支（只静态核对）、真 WebView2 宿主、真实中文 IME。见 `docs/iteration/round-138/test.md`。

**第 137 轮（同一未发版区间）**

- 窄窗（≤1119px）抽屉打开时，App 级确认框不再被抽屉与背板盖住（**B-253**，快车道；第 119 轮只记不修）——`src/styles.css:1890-1893` 的 `.overlay` z 序 **40 → 46**（高于 `.rail-backdrop` 44 与抽屉 `.margin-rail` 45，仍低于 60 的快速打开与右侧只读面板——后者在 `appDialogOpen` 时不挂载）+ 2 行注释，`App.tsx`/`MarginRail.tsx` 未动。tester 独立（未读 `impl.md`，未复用执行方脚本）：`npx tsc --noEmit` exit 0；目标测试 railModalGate **11/11**、railDrawerGate **6/6**、mathStyle **4/4**、touchTargets **6/6**、themes **12/12**、export **30/30**、railDiffA11y **4/4**；自写 `.tmp/r137-tester-b253.mjs`（ego CDP 57270、1024×700、脏稿 + 抽屉 + `Ctrl+Alt+N`）**12/12、0 pageerror / 0 console error**——computed `{overlay:"46", rail:"45", backdrop:"44"}`、确认框三钮齐全、主钮「保存并切换」622..706 与抽屉左缘 684 重叠 **22 px**，反事实（注入 `.overlay{z-index:40}`）下重叠条 37×109 **恒 253.0 / stddev 0**（纯抽屉纸色＝对话框被盖住），改后同区 **meanL 233.98 / stddev 51.76 / minL 88**（按钮文字可见），对话框左内边距 12×117 由 **178.0 → 253.0**（背板不再压暗本体）；点「取消」**188 ms** 关框且抽屉仍开、`#root` 内 `[inert]` 清 0、再 Esc 关抽屉、1440 宽窗同 z 且无抽屉态；回归 `.tmp/e2e-r126-drawer-focus.mjs` **20/20**。侧效应（不判 FAIL）：`.toast`/`.link-editor` 同为 45，现在低于对话框，对话框开着时 toast 会被背板压暗（未找到该用户路径，只记 z 序）。见 `docs/iteration/round-137/test.md`。

**第 136 轮（同一未发版区间）**

- 测量脚本报告真实首载、R1/R2 按需拆（**B-229**，慢车道；真实首载 324,130 仍超硬线 4,130）——`scripts/measure-first-screen.mjs` 新增常驻口径：`RESIDENT = [/^MarginRail-.*\.js$/]` 扫 `assets`，按「seed + 静态 import 传递闭包（门里已计的文件排除）」算常驻，打印 `resident raw/gzip/files`、`real raw/gzip/headroom` 与 `total=… resident=… real=…`；**`total`/`--max`/`--target`/headroom 与默认门禁全不动**（CI `ci.yml:39`、`release.yml:82/155` 照旧），real 超硬线只 WARN，显式 `--real-max N` 才 FAIL exit 1，`--no-resident` 复旧口径；计数守卫：0 命中 → FAIL「常驻 chunk 未找到」、入口与常驻重复 → FAIL「重复计数」（先于总门判）。`src/App.tsx:2000` `searchWeb` 改 `await import('./lib/search.ts')`、`:5269` `assetFileName/writeAsset` 改 `await import('./lib/asset.ts')`；`collectReviewFiles` 及只服务它的 `atLeast`/`directoryKey`/`DEFAULT_MAX_FILES` 搬进新 `src/lib/reviewScan.ts`，`compareRows` 留 `reviewFiles.ts:34` 导出并两处共用（`reviewFiles.ts:85`、`reviewScan.ts:89`，单向依赖无环），`MarginRail.tsx:465` 点开面板才 `await import('../lib/reviewScan.ts')`、动态 import 或读目录失败按空态收场；`reviewFiles.test.ts` 导入随之改；不做 `diffView` 异步化。tester 独立（未读 `impl.md`）：脚本五个口径逐项实跑（默认 exit 0 且三数 + WARN 行、`--no-resident` exit 0 无 real 行、`--real-max 320000` exit 1、只拷入口产物 → exit 1「常驻 chunk 未找到」、自造重复夹具 → exit 1「重复计数」），静态门 `App.tsx` 两个静态 import **0（exit 1）** 而两处 `await import(` 各 **1**、`MarginRail.tsx` 静态块已无 `collectReviewFiles` 且惰性 import **1**；`dist/assets` 真产物 `search-*`（2,090 / 939）、`reviewScan-*`（839 / 524）、`asset-*`（557 / 364）与常驻 `MarginRail-*`（22,217 / 7,801）；自写 E2E `.tmp/r136-tester-a3.mjs`（ego CDP 57270、1440×900、假 FSA + stub fetch）**11/11、0 pageerror**：① 出处 2 条且 `search.ts` 点按钮前 0 → 后 1、② 在审 2 行与快照 1 行且 `reviewScan.ts` 点开前 0 → 后 1、③ 对话 2 条切页签往返仍 2 条且 `#rail-panel-chat` 仍是 `#rail-tab-chat` 的 `aria-controls` 目标；交付脚本 `.tmp/e2e-r136-a2.mjs` 复跑 **21/21**（截图 `shots/round-136/{review-panel,verify-sources}.png`）、回归 r135 **23/23**。门禁：`npm run verify` **exit 0 PASS**、门 gzip **315,279 B**（raw 1,023,265、headroom 4,721）、常驻 gzip9 **7,801**、真实首载 **323,080**（对轮初 324,130 **−1,050**，仍超硬线 **3,080** → `open` 只记）；`npm test` **69 文件 955 条 0 fail**。UNVERIFIED：真 WebView2 宿主、真实中文 IME、真实 FSA。见 `docs/iteration/round-136/test.md`。

**第 135 轮（同一未发版区间）**

- 在审文件与修订快照的三处英文 `open` 显示改取 `REVIEW_STATUS_LABELS.open`（单源「待处理」；用户 2026-11-20 队列第 9 条术语一致性，BACKLOG 无此行）——`src/components/MarginRail.tsx:1016` 表头改「按待处理数排序」、`:1054` 行文改「待处理 N · 共 M 条」；`src/lib/revisionList.ts:1` 增 `REVIEW_STATUS_LABELS` import、`:30` 注释改「待处理数」、`:32` 快照行改「…（待处理 N）」；枚举 / 存盘 / 排序键不动（改回英文会推翻第 128 轮）。新 `src/lib/reviewLabelWording.test.ts` **3 条**静态门挂 `npm test` 链尾（68→**69 文件**、952→**955 条**），负向把 `:1054` 换回 `open ${row.open}` → **1 红 exit 1**、SHA256 `0A0F8048…` 还原后 3/3。tester 独立（未读 `impl.md`）：`git grep -cF` 改前 MarginRail `open ${row.open}` **1** / `按 open 数排序` **1**、revisionList `（open ` **2** / 单源 **0**，改后 **0 / 0 / 0 / 1**、两文件合数 `REVIEW_STATUS_LABELS.open` **0→2**；真机自写 `.tmp/r135-tester-labels.mjs`（ego CDP 57270、1440×900 + 1024×700、假 FSA）**23/23、0 pageerror**（`.tmp/r135-tester-labels.json`、截图 `shots/round-135/review-labels.png`）：表头「按待处理数排序」、行「待处理 2 · 共 3 条」「待处理 1 · 共 2 条」、`sheet.innerText` 的 `/\bopen\b/` **0**、快照行「11-20 21:40:41 · 6 B · 批注 2 条（待处理 1）」逐字命中正则，两档 `.rail-diff-sheet`/`.rail-snap-row` 横溢 **0**、三钮高 **24**，改一卡到 in-progress 后 1,600 ms 盘上 `"reviewStatus":"in-progress"`、不含「处理中」、`status` 仍 `pending`；回归 r101 **57/57**、r114 **27/27**；门禁 `npm run verify` PASS（门 gzip **316,131 B**、raw 1,025,609、余硬线 3,869）、`node scripts/measure-first-screen.mjs --max 316200` exit 0（余 69）、两懒 chunk gzip9 **7,999 / 585 B**、B-229 口径合计 **324,130**（超硬线 4,130，仍 `open` 只记）、`npm test` **69 文件 955 条 0 fail**。UNVERIFIED：真 WebView2 宿主、真实中文 IME。见 `docs/iteration/round-135/test.md`。

**第 134 轮（同一未发版区间）**

- 两处「发送」鼠标点后焦点不再掉 `BODY`（**B-264**，第 131 轮 findings-ui F1：点对话「发送」/追问「发送」后钮置灰，Chromium 把焦点送回 body；收尾用「焦点在面板里」判回焦，读到 body 即不接管，mock 回复到齐也不回焦，下一次 Tab 落状态栏）——`src/components/MarginRail.tsx` 的 `send()` 在 `setTurns` 前 `inputRef.current?.focus()`（`:240`）、finally 的 `focusInPanel` 加 `|| document.activeElement === document.body`（`:277`，谓词仍 `chatRefocusAfterStream(controller.signal.aborted, …)`）；追问加 `threadInputRef`/`threadRefocusRef`（`:176-177`），点击先移焦并记 `annotation.id` 再 `onDiscuss`（`:802-803`）、`<input ref={threadInputRef}>`（`:784`）、新 `useEffect([discussingId])`（`:222-234`）在回 null 且意图 id === `openThread`、焦点在 `#rail-panel-notes` 或 body 时回焦并清意图；`chat.ts`/`App.tsx`/`styles.css` 不动。`src/lib/chat.test.ts:231-289` 静态门改「两处 focus + 顺序 + body 豁免」并新增追问门（31→**32 条**），负向删前置 focus / 挪到 `setBusy(true)` 之后各 **1 红 exit 1**，SHA256 `B2199250…` 还原。tester 独立（未读 `impl.md`）：真机 before/after（ego CDP 57270、1440×900、假 FSA 2 篇 + mock 分析 3 卡；身份门 fetch `/src/components/MarginRail.tsx`：before `threadInputRef` **0** / body 豁免 0 / chat focus 1，after **4** / 2 / 2，`.tmp/r134-tester-{before,after}.json`；before 相 `git stash push/pop -- src/components/MarginRail.tsx`、SHA256 等值、stash list 0）before **9/9**（S1 点 `.rail-chat-send` 后 180 ms 与 `aria-busy=false` 后均 `BODY`；S2 点 `.thread-input button` 后 180 ms 与 `[AGENT]` 到齐、`in-progress` 后均 `BODY`）→ after **12/12、0 pageerror**（S1 两处均 `TEXTAREA.rail-chat-input`、S2 两处均 `.thread-input input`、S3 流式中点 `.ProseMirror p` 收流后焦点仍在正文），截图 `shots/round-134/chat-focus-after.png`；回归 `OUT=.tmp/r134-tester-r111-focus.json node .tmp/e2e-r111-a1-focus.mjs` **`allPass:true`**、`node .tmp/e2e-r98-a1-agent.mjs` **36/36**（脚本自身 36 条，任务书写 38；exit 0、0 fail），跑后还原 `shots/round-98/` 与 `shots/round-111/`。门禁：`npm run build` exit 0（tsc + vite + host-www 99 文件）、`node scripts/measure-first-screen.mjs --max 316400` **exit 0 PASS**、门 gzip **316,137 B**（raw 1,025,609、余硬线 263、对 133 轮 316,135 净 **+2 B**）、常驻 `MarginRail-Dc6iBNG5.js` raw 22,712 / gzip9 **7,992**（≤8,060），B-229 口径合计 **324,129**（超硬线 4,129，仍 `open` 只记）；`npm test` **68 文件 952 条 0 fail**、`roundtrip` 不跑（未动编辑器/序列化）。偏差（不判 FAIL）：任务书 r98「38/38」实为脚本 36 条断言；after 身份门 body 豁免实测 2（`focusInPanel` 与追问 effect 各 1），首版探针按 ===1 误判、改 ≥1 后 12/12，产品无问题。BACKLOG B-264 → `fixed`。UNVERIFIED：真 WebView2 宿主、真实中文 IME；追问 effect 的「焦点在 `#rail-panel-notes` 内」与 body 两分支在 S2 同时成立，未单独隔离。见 `docs/iteration/round-134/test.md`。

**第 133 轮（同一未发版区间）**

- 在审文件截断提示改固定上限、与 LIVE 行删除解耦（**B-265**，新条：上限 50 篇而当前篇结项后 LIVE 行被删（50→49），提示写成「只显示前 49 篇」，与上限自相矛盾且随行数漂移）——`src/lib/reviewFiles.ts:40` 私有常量改 `export const REVIEW_MAX_ROWS = 50`（含 JSDoc 共 5 处换名），新增 `reviewTruncatedNote(result: Pick<ReviewFilesResult,'truncated'>)`：只读 `truncated`（结构上拿不到 `rows`），真时恒写「在审文件太多，最多显示 50 篇。」；`src/components/MarginRail.tsx:464` 改算 `reviewNote`、`:1013-1015` 用它渲染（不再用 `reviewRows.rows.length` 拼串）；`src/lib/reviewFiles.test.ts` 20→**23 条**（逐字文案 + 结项 50→49 同字 + 60 篇夹具含「50 篇」/未截断 `null`）。tester 独立（未读 `impl.md`）：`node --experimental-strip-types src/lib/reviewFiles.test.ts` **23/23**（HEAD 基线 20/20），负向 `REVIEW_MAX_ROWS` 改 49 → 测试 ① 红 **exit 1**、恢复后 23/23（SHA256 `2380DC43…` 复原）；静态门 `DEFAULT_MAX_ROWS` 于 `reviewFiles.ts` 改前 **5 行（40/90/107/110/134）→ 0 行 exit 1**（`src` 全域 7→2，剩 `diffView.ts:30,58` 同名常量不动，按 plan-review P1-2 scoped 口径判；对照改前后都 2 行）、`REVIEW_MAX_ROWS` **7 行**、`在审文件太多` 落 `reviewFiles.ts`+`reviewFiles.test.ts` 各 1 行而 `MarginRail.tsx` **0**、`git diff --stat` 只 3 个 `src/` 文件；真机 before/after（ego CDP 57270、1440×900、52 篇夹具、假 FSA、`autoSave:false`；换码只走 `git stash push --` 三个 src 文件 + `pop`，三文件 SHA256 逐项等值、`git stash list` 0）：before（身份门两模块 `reviewTruncatedNote` **0** 且组件旧串 1）首开 rows **50** +「只显示前 50 篇。」，关面板→改档 resolved→**187.9 ms**（<600 ms 防抖窗）内点开 → rows **49**、`.is-current` **0** +「只显示前 49 篇。」（缺陷复现，9/9）；after（身份门 reviewFiles **1** / MarginRail **2**、旧串 **0**）rows **50→49→50**，两态文案恒逐字「在审文件太多，最多显示 50 篇。」（改档→点击 **188.9 ms**）、**13/13**、0 pageerror。回归 `node .tmp/e2e-r101-review.mjs` **57/57** exit 0、0 pageerror，跑后 `git checkout -- shots/round-101/` 无残留；`.tmp/e2e-r100-diff.mjs` **43/43**；门禁 `npm test` **68 文件 951 条 0 fail**、`npm run verify` PASS、`measure-first-screen --max 316400` exit 0 gzip **316,135 B**（raw 1,025,609、余 265；对 132 轮 316,134 净 **+1 B**）、常驻 `MarginRail-CA2BPyQ0.js` raw 22,309 / gzip9 **7,907**（≤8,050；改前 22,282 / 7,878）、B-229 口径合计 **324,042**（超硬线 4,042，仍 `open` 只记）；`roundtrip` 不跑（未动编辑器/序列化）。偏差（不判 FAIL）：任务书「`DEFAULT_MAX_ROWS -- src` 改后 0 行」照字面不可满足（diffView 同名 2 行），按 plan-review P1-2 改 scoped 并另记全域 7→2；首屏净增实测 +1 B（计划 0±10）。截图 `shots/round-133/review-note.png`（49 行态）。UNVERIFIED：真 WebView2 宿主、真实中文 IME、macOS。见 `docs/iteration/round-133/test.md`。

**第 132 轮（同一未发版区间）**

- App 级产品键只在编辑器正文 / 源码框里动作（**B-263**，第 131 轮 findings-bug F2：焦点在右侧「对话」的输入框里时 Ctrl+K / Ctrl+F 把链接编辑框 / 查找条开在遮罩外、输入框丢光标，Esc 后焦点落正文；链接编辑框里回车会改正文）——`src/App.tsx:4651-4658` 在 `?` 块之后、`customId` 分派之前插守卫：`typing && !(target instanceof HTMLElement && target.closest('.ProseMirror, textarea.source-editor'))` 时只对产品键吞浏览器默认动作并 `return`，保存（含改键 `save`）例外放行；选择器串与 `FileTree.tsx:120` 逐字同；不改 `typing`/Esc/F11 次序、不碰 `MarginRail.tsx`/`styles.css`；新 `src/lib/appKeyScope.test.ts` **5 条**静态门挂 `npm test` 链尾（67→**68 文件**、943→**948 条**），负向删 `customId !== 'save'` / 把选择器串砍成 `.ProseMirror` 各 **1 红 exit 1**。tester 独立（未读 `impl.md`）：真机 before/after（ego CDP 57270、1440×900、假 FSA `a.md`、`autoSave:false`，身份门 `foreignTyping` before **0** / after **2**，换码只走 `git stash push/pop -- src/App.tsx`、SHA256 等值、stash 0）：before **2/2** 对照全为「被穿透」（① `.link-editor-input` 2 且焦点「链接地址」、② `.find-input` 1）→ after **18/18、0 pageerror**（①–⑥ 六键浮层 0 且焦点仍输入框、⑦ Esc 不弹浮层、⑧ 回车 2 条 turn、⑨⑩ 正文 Ctrl+K/F 与 ⑪ 源码框 Ctrl+F 照旧、⑫ 关自动保存下 Ctrl+S 前 `write:a.md` 0 且脏、按后 1 写 28 B 含「改」、dirty=false）。门禁 `npm run build` exit 0、`measure-first-screen --max 316800` exit 0 gzip **316,134 B**（raw 1,025,609、余 666；对 131 轮 316,096 净 **+38 B**）、常驻 `MarginRail-R13BmBTx.js` gzip9 **7,878**、B-229 口径合计 **324,012**（超硬线 **4,012**，仍 `open`）；`npm test` **68 文件 948 条 0 fail**、`keyboard-acceptance` **52/52**（跑后 `git checkout -- shots/round-05/`）；`roundtrip` 不跑（未动编辑器/序列化）。UNVERIFIED：真 WebView2 宿主、真实中文 IME、macOS。见 `docs/iteration/round-132/test.md`。

**第 130 轮（同一未发版区间）**

- 对话记录按文档身份（实例计数）清空，不再只按 basename（**B-261**，第 123 轮 finder 真机：新建文档恒 `未命名.md`、异目录同名文档 basename 相同，切换后上一轮 2 条对话留在新文档上；用户 2026-11-20 队列「对话区」）——`src/App.tsx:501` 加 `docInstance` 计数，`:2656` 在 `loadIntoEditor` 的换篇点（`activeDocIdRef.current += 1` 之后）`+1`（保存 / 自动保存 / 改名 / 另存为都不经过），`:6106` 以 `docKey` 传给 `<MarginRail>`；`src/components/MarginRail.tsx:65` Props 加 `docKey: number`、`:149` 解构、`:201` 对话清空 effect `[docName] → [docKey]`（`:367` 面板 effect 仍按 `docName`，`railModalGate.test.ts:92-98` 钉着）；新 `src/lib/railChatReset.test.ts` 5 条静态门挂 `npm test` 链尾（66→**67 文件**、933→**938 条**），负向把 `[docKey]` 改回 `[docName]` 恰 2 红（T3=0、T4=2）、T1/T2/T5 绿，还原 5/5。tester 独立（未读 `impl.md`）：自写 `.tmp/r130-tester-chat-reset.mjs` before/after（ego CDP 57270、1440×900、清 storage、无 Key mock、假 FSA 记 ops）——after **4/4、0 pageerror**：S1 新建后 turn 2→0 + 空态 1 + 无确认框；S2 `a/note.md`→`b/note.md`（两处 `__slState.name` 均 `note.md`）后 turn 2→0、正文乙篇；S3 2 条对话时打 1 字 + `Ctrl+S` → turn 仍 2 且 `write:b/note.md` 1 次；before（`git stash push -- src/App.tsx src/components/MarginRail.tsx`，跑完 pop 并复核 SHA256 与模块门）S1/S2 FAIL、S3 PASS。回归 `.tmp/r116-tester-speaker.mjs` **10/10**、交付 `e2e-r116-speaker.mjs` 8 条署名断言全 OK。门禁：`npm test` **67 文件 938 条 0 fail**、`npm run verify -- --max 316300` **exit 0 PASS**、门 gzip **316,056 B**（raw 1,025,373、headroom 244）、常驻 `MarginRail-DUOL7uLQ.js` gzip9 **7,880**、B-229 口径合计 **323,936**（超硬线 3,936，仍 `open` 只记）；`roundtrip` 不跑（未动编辑器/序列化）。截图 `shots/round-130/chat-reset-tester.png`。见 `docs/iteration/round-130/test.md`。

**第 129 轮（同一未发版区间）**

- 批注改档 600 ms 内切文档不再丢档（**B-255**，第 123 轮 finder 真机：改档后立刻换篇，旧篇改动被 effect cleanup 静默取消）——`src/App.tsx:770-826` 加 `annotationsTimerRef` / `pendingAnnotationsRef`（只存 `{host,space,path,name,store}`，身份在调度那一刻捕获）/ `annotationsWriteRef` 与新 `flushAnnotationWrite`：同步取走 pending、清计时器、`const promise=(async()=>{…})()` 后**同步登记**进 ref（无 pending 直接 `Promise.resolve()` 且不覆盖在飞 promise），体内宿主走 `annotations-save`、工作区按 `parentDirectory(space,path)` + `writeAnnotationStore(dir,key,store,false)`、空档 `removeCache`、有旧键再清 legacy，失败吞掉；`:2187-2209` 的 600 ms effect 改为捕获 pending（deps `[annotations,docNotes,flushAnnotationWrite]`，删 `return () => clearTimeout(timer)`）；`loadIntoEditor:2625` 与 `applyHostPayload:1445` 首行 `void flushAnnotationWrite()`（早于 `setMarkdown`/`setAnnotations([])`/`!editor` 守卫）且 deps 各加，`restoreAnnotationsFor:2570` 读档前 `await annotationsWriteRef.current?.catch(…)`；卸载兜底 effect 尽力写掉最后一份；`src/lib/annotations.test.ts` 尾部 +2 条静态门（`loadIntoEditor` 切片含 flush 且早于清空；三枚新名各 ≥2 且在 `applyHostPayload` 之前），`npm test` 66 文件 931→**933 条**。tester 独立（未读 `impl.md`）：自写静态门 `.tmp/r129-tester-static.mjs` **10/10**；`npm test` **66 文件 933 条 0 fail**、`npm run verify -- --max 316500` **exit 0**、门 gzip **316,033 B**（raw 1,025,343、headroom 467）、常驻 `MarginRail-Cej3jE1X.js` gzip9 **7,869**、B-229 口径合计 **323,902**（超硬线 3,902，仍 `open` 只记）；自写 E2E `.tmp/r129-tester-flush.mjs`（ego CDP 57270、1440×900、假 FSA 记 `write:`/`read:` ops、种子 a.json 1 条 open；先过 dev 模块身份门：after 三标记全 true / before 全 false）——after **6/6、0 pageerror**：①④ 改档后立刻切 b.md，`editToLoadMs` **149 / 150 ms**、窗口内 `write:.sidelight/annotations/a.json` **恰 1**、b.json **0 写**、写盘时刻距点击 **+40 ms**（600 ms 计时器路径应 ~+450 ms）、1,600 ms 后磁盘 `resolved` / `urgent`；② 重开 a.md 仍 resolved；③ 在 b.md `.note` 0 且全量 b.json 0 写；⑤ 对照等 1,000 ms 再切 `wont-fix` 保留；before（`git stash push -- src/App.tsx`、跑完 pop 并复核模块回 true）**①②④ FAIL**（a.json 0 写、仍 `open`/`none`，各窗口 150 ms）而 ③⑤⑥ PASS。回归 `.tmp/e2e-r97-a1-status.mjs` **44/44**（跑后 `git checkout -- shots/round-97/`）；`roundtrip` 不跑（未动编辑器/序列化）。截图 `shots/round-129/ann-flush.png`。UNVERIFIED：真 WebView2 宿主换篇、真实 FSA、关窗卸载兜底、真实中文 IME。见 `docs/iteration/round-129/test.md`。

**第 128 轮（同一未发版区间）**

- 批注卡头两枚下拉补常驻可见字段名「紧急度 / 状态」，9 条下拉文案中文化（用户 2026-11-20 队列里五档紧急度与四态复核的可用性残留）——`src/lib/annotations.ts` 两张 LABELS 表 `-`/`Low`/`Medium`/`High`/`Urgent` → **无/低/中/高/急**、`Open`/`In progress`/`Resolved`/`Won't fix` → **待处理/处理中/已解决/不修复**（内部 value、`.note-priority-*`/`.note-status-*` 类名、存盘字段一律不动）；`src/components/MarginRail.tsx:626/:643` 两处 `select` 前各插一枚 `<span className="note-field-label" aria-hidden="true">`（字面量，读屏字段名仍走 select 的 `aria-label`）；`src/styles.css` 的 `.note-head` `gap: 6px → 3px` + 新 `.note-field-label{font-size:10px;letter-spacing:0;white-space:nowrap}`（继承 `--ink-faint`，三主题对卡底 5.23/6.26/5.53 过 AA）；`src/lib/annotations.test.ts` 期望改中文 + 新静态门 1 条（先摘注释再数，读 `MarginRail.tsx` 恰 `['紧急度','状态']`、`styles.css` 恰 1 条规则），`npm test` 66 文件 930→**931 条**。tester 独立（未读 `impl.md`）：静态 `note-field-label` 在 MarginRail **2** / styles.css **1** 规则、`git diff --stat` 恰 4 个 src 文件 + BACKLOG 1 行、0 新增文件、value/类名/存盘字段零 diff 行；自写 `.tmp/r128-tester-note-fields.mjs`（ego CDP 57270、1440×900 + 1024×700、假 FSA、无 Key 造 3 张模拟卡）**41/41、0 pageerror**：先量 M=`.note-head` clientWidth **294**（±1）并全程用实测值，每卡 2 标签、文本 `['紧急度','状态']`、DOM 紧邻对应 select、可见性 8 项全过（**30×14 / 20×14**、`font-size:10px`、单 rect、右缘在 head 内、中心命中）、两表文案逐项对、模拟合计 **276.84** / 正式 **280.8**（≤M−3=291）、head 高 **24**、head 横溢 0、栏宽 **320**、3 卡 [128,279.5]/[292,462.25]/[474,625.5] 不重叠、末卡底 625.5 ≤ 整体评价 638.19；1024×700 抽屉无横溢（卡头折两行只记录）。回归 `.tmp/e2e-r95-a2-priority.mjs` **29/29**、`.tmp/e2e-r97-a1-status.mjs` **44/44**（单行门未删/未放宽）。门禁：`npm test` **66 文件 931 条 0 fail**、`npm run verify -- --max 316500` **exit 0**、门 gzip **315,824 B**（净 **+28**、余硬线 676）、常驻 `MarginRail-CamDycNv.js` gzip9 **7,866**（净 **+19**）、B-229 口径合计 **323,690**（超硬线 3,690，仍 `open` 只记）；`roundtrip` 不跑（未动编辑器/序列化）。截图 `shots/round-128/note-field-labels-tester.png`。见 `docs/iteration/round-128/test.md`。

**第 127 轮（同一未发版区间）**

- 设置面板两条文字链钮补到 24 px 可点高度（**B-260**，第 123 轮 UI 侦察全应用扫描里仅剩的 2 条 <24×24）：「全部恢复默认」**69×19 → 69×24**、「恢复默认」**46×19 → 46×24**——`src/styles.css:3400-3402` 的 `.dialog-inline button` 加 1 行注释 + `min-height: 24px`（`padding: 2px 0` / `font-size: 11.5px` / 颜色与下划线逐字不动，全局 `box-sizing: border-box` 下 24 即总高）；新 `src/lib/touchTargets.test.ts` 常量 `DIALOG_INLINE` + 1 条 `assertTapTarget` 机械门（按块切 CSS，块内 `min-height|height` ≥24、禁写 `width`/`min-width`），负向改 `20px` **恰 1 红 exit 1**。tester 独立（未读 `impl.md`）：`touchTargets.test.ts` **6/6 exit 0**；自写 `.tmp/e2e-r127-tester.mjs` 同脚本 before/after（ego CDP 57270、1440×900、先 `reset.mjs 57270`）：before（`git stash -- src/styles.css`）**69×19 / 46×19** 且设置面板态扫描**恰 2 条** <24×24，after **69×24 / 46×24**、computed `min-height: 24px`、扫描 **0**；`.dialog` 横溢 0、收起态竖溢 **0 ≤ 改前 0+2**；展开「快捷键」点「全部恢复默认」→ `.keybinding-status`「已全部恢复默认」；Esc 关、0 写盘、0 pageerror。门禁：`npm test` **66 文件 930 条 0 fail**、`npm run verify -- --max 316000` **exit 0**、门 gzip **315,796 B**（净 +4、余硬线 204）、`MarginRail-*.js` gzip9 **7,847** 不变；回归 `keyboard-acceptance` **52/52**（跑后还原 `shots/round-05/`）。截图 `shots/round-127/dialog-inline-buttons.png`。见 `docs/iteration/round-127/test.md`。

**第 126 轮（同一未发版区间）**

- 窄窗（≤1119px）抽屉把 Tab 收在栏内并补模态语义：1024×700 点 `.rail-toggle` 41 ms 内焦点落 `.rail-close`，`#margin-rail` 在抽屉态带 `role="dialog"` / `aria-modal="true"` / `tabIndex={-1}`；`MarginRail.tsx` 新 `onRailKeyDown` 只拦 `Tab`，按栏内 `FOCUSABLE` 中 `tabIndex>=0` 且 `getClientRects()` 可见的站收口（末站/根 Tab → 首站、首站/根 Shift+Tab → 末站，`preventDefault`），`useDialogFocus.ts` 导出 `FOCUSABLE`；`App.tsx:6031` 传 `drawerOpen={railOpen && viewMode === 'edit' && window.matchMedia('(max-width: 1119px)').matches}`，拉宽 1440 后属性自愈、computed `position=relative`、Tab 可穿出（P1-1/P2-3）。字数明细（z 40）与抽屉（背板 z 44）永不同时在场：`openRail` 加 `setStatsDetail(null)`、`openStatsDetail` 加 `if (railOpen) setRailOpen(false)` 并把 `railOpen` 补进 deps；`.rail-close` 的 `aria-label` 跟页签念「关闭批注」/「关闭对话」（P1-2/P2-4）。新 `src/lib/railDrawerGate.test.ts` 6 条静态接线门挂 `npm test` 链尾（65→**66 文件**、923→**929 条**），负向删 `aria-modal` **1 红 exit 1**、还原全绿。tester 独立（未读 `impl.md`）：自写 `.tmp/e2e-r126-tester-drawer.mjs`（ego CDP 57270、1024×700、先 `reset.mjs 57270`）**20/20、0 pageerror**；回归 `keyboard-acceptance` **52/52**、`.tmp/e2e-r97-a1-status.mjs` **44/44**、`.tmp/e2e-r100-diff.mjs` **43/43**；门禁 `npm test` **66 文件 929 条 0 fail**、`npm run verify -- --max 315900` **exit 0**（gzip **315,792 B**、headroom 108）。见 `docs/iteration/round-126/test.md`。

**第 125 轮（同一未发版区间）**

- 对话页签的文档节选跟选区/光标走，不再永远是正文开头 2000 字（**B-258**，第 123 轮 finder F2）——`src/lib/chat.ts` 新纯函数 `chatContextFor(blocks, from, to, limit = CHAT_CONTEXT_LIMIT)`：有选区走 `buildContext` 取选区覆盖块 + 前后各一段；无选区且落在第一块内（打开即问的默认路径）取全文开头 `limit` 字；其余取光标块 ±1；最后 `[before, selection, after]` 连后过 `chatContextOf`。**`buildContext` 必须显式传 `limit`**（它默认 `CONTEXT_LIMIT = 1500`，漏传会静默砍 25%）。`src/App.tsx:6034` 的 `getChatContext` 改 `getChatSource`：现读 `readBlocks(editor)` + `editor.state.selection`，`viewMode !== 'edit'` 时把 from/to 压成 1（预览/源码态编辑器常驻、选区停在上次编辑处）；`src/components/MarginRail.tsx` 的 prop 与 `send()` 改用 `chatContextFor`，空态补一句「上下文最多 2000 字：有选区用选区，没选区取光标所在段；刚打开时取开头。」（本轮唯一新增文案）。`src/lib/chat.test.ts` 25→**31 条**（选区优先/中间段/末段/截断/默认路径+空文档/接线静态门）。tester 独立（未读 `impl.md`）：`npm test` **65 文件 923 条 0 fail**；负向去掉 `buildContext` 的 `limit` → ①②③④ **4 红 exit 1**，还原 SHA256 `EED14FD3…` 同后 **31/31**；静态门 HEAD `indexOf('getChatSource')` 两文件 **−1** → 各 1 处、App 内 `chatContextFor(` **0**；自写 E2E `.tmp/e2e-r125-tester-context.mjs`（ego CDP 57270、1440×900、假 FSA + 假 SSE）**27/27、0 pageerror**（`.tmp/r125-tester-context.json`）：S1 打开即问 `hasHead:true`/`hasTail:false`/`systemLength 2147`；S2 末段选 17 字 `hasTail:true`、system 含这 17 字、`hasHead:false`、2099 ≤2150、lastUser 逐字同；S3 光标末段 2099；S5 预览 `#rail-panel-chat` 0、源码态程序化发送 2147/hasHead（守卫生效）；S4 空白文档「（当前文档还没有正文）」；回归 `.tmp/r96-tester-a1a2.mjs` **42/42**、`.tmp/e2e-r96-a1-chat.mjs` **33/33**。门禁：`npm run build` 过、门 gzip **315,738 B**（≤315,876、净 +12、硬线余 4,262）、常驻 `MarginRail-DrxNXyli.js` gzip9 **7,681**（≤7,795、+186）、B-229 口径合计 **323,419**（超硬线 3,419，仍 `open` 只记）；`roundtrip` 不跑（未动编辑器/序列化）。偏差（不判 FAIL）：`src/lib/chat.ts` 首行新增 UTF-8 BOM（全 `src` 唯一，3 B；构建/单测/E2E 全过）。UNVERIFIED：真 WebView2 宿主、真实中文 IME、真实模型（按任务走假 SSE）。见 `docs/iteration/round-125/test.md`。

**第 124 轮（同一未发版区间）**

- 「在审」面板开着时自动保存写下的修订快照立刻出现在清单里（**B-257**，第 123 轮 finder F2：`reviewLater` 的 `snaps:[]` 与磁盘 1 份、toast「已保存 a.md」矛盾，空态还写「保存一次后才会记录。」）——`src/App.tsx:495` 加 `revisionEpoch` 代际（初值 0，只有保存真的写成才 +1）：`recordRevision` 改 `const id = await writeRevision(...)` + `if (id) setRevisionEpoch((value) => value + 1)`（`:3410-3413`），`:6048` 作 prop 传给 `<MarginRail>`；`src/components/MarginRail.tsx:70/141` 加 Props 与解构、`:323` 加 `snapSeqRef`（epoch 重读与面板重开可能同时在途，只认后发起者）、`:325` 加 `loadedEpochRef`、`:377-391` 的 `loadSnapshots` 两处判据改 `reviewRunRef`+`snapSeqRef` 双 ref、`:398-402` 新 effect（代际变了且 `reviewActive` 为真才重读，面板关着不读目录）、`:414` `openReview` 现读后同步 `loadedEpochRef`（开面板不重复读）；**epoch 路径不推进 `reviewRunRef`**（`:335/:344/:365` 仍只在切页签/换文档/关面板推进，否则 `reviewBusy` 永真、列表停在「正在读…」）。新 `src/lib/revisionRefresh.test.ts` **4 条**静态门挂 `npm test` 链尾（64→**65 文件**、913→**917 条**）。tester 独立（未读 `impl.md`）：负向三处（去掉 `!reviewActive` 早退、去掉写回前的 `snapSeqRef` 判据、`if (id)` 改无条件）**各 1 红 exit 1**，还原后 SHA256 `6B8FC124…`/`9A695598…` 同、`revisionRefresh.test.ts` **4/4 绿**；`git grep --untracked revisionEpoch -- src` HEAD **0（exit 1）→ App 2 行 + MarginRail 8 行 + 测试**，`src/styles.css` 0 行、`git diff --stat` 只 4 文件；自写 E2E `.tmp/r124-tester-e2e.mjs`（ego CDP 57270、1440×900、假 FSA 计 `.sidelight/revisions` 的 `entries()`、autoSave 开）**11/11、0 pageerror**（`.tmp/r124-tester-e2e.json`）：打 1 字立刻开面板 snaps **0** + 空态且 disk 0、等自动保存落盘后面板 **1 行 = 磁盘 1 份**、`snapEmpty:null`、toast「已保存 a.md」、`entries()` 恰 **+2**（写侧 1 + epoch 重读 1）、`busy:false`（无「正在读…」）、关面板后改 1 字 `Ctrl+S` 只 **+1** 遍历、重开 **2 行 = 磁盘 2 份**。回归 `.tmp/r114-tester-e2e.mjs` **27/27**、`.tmp/e2e-r101-review.mjs` **57/57**。门禁：`npm test` **65 文件 917 条 0 fail**、`npm run verify` PASS、门 gzip **315,726 B**（在 `ff22b67` 独立 worktree 重建基线 **315,674**，净 **+52**、硬线余 4,274）、常驻 `MarginRail-CsQwh5S0.js` gzip9 **7,495**（基线 7,414，+81）、B-229 口径合计 **323,221**（超硬线 3,221，仍 `open` 只记）；`roundtrip` 不跑（未动编辑器/序列化）。UNVERIFIED：真 WebView2 宿主、真实 FSA、真实中文 IME。见 `docs/iteration/round-124/test.md`。

**第 123 轮（同一未发版区间）**

- 重命名后该篇的修订快照不再一条也看不到（**B-254**，第 123 轮 finder 真机：a.md→c.md 后 `.rail-snap-row` 0、面板「保存一次后才会记录。」、磁盘仍是旧键的 2 份）——`src/lib/revisions.ts` 新增 `migrateRevisions(parent, oldKey, newKey)`：按 `parseRevisionName(name, oldHash)` 只挑旧键的 `<键哈希>-<base36 时刻>-<正文 id>.json`，**只换文件名**（`newHash + 旧名截掉 8 位前缀`，后缀逐字不动），读文本 → 写新名 → `removeEntry` 旧名，写删都成才 +1；同哈希、取不到目录、`entries()` 抛错都回 0，逐份 try/catch 永不抛（快照是附加物，不拖住改名）；JSON 不重写（不存正文、`id` 不可重算，`key` 字段无消费者）。`findSnapshotsDir` 从 `revisionList.ts` 搬进 `revisions.ts:206` 并导出（不带 create、取不到回 null），`revisionList.ts` 删副本改 import，行为不变。`src/App.tsx:81` import、`:3049` 在 `handleRenamedFile` 的缓存迁移 `try` 内、draft/annotations 循环之后 `await migrateRevisions(dir, cacheKey(oldFile.name), cacheKey(newName))`，deps 不加、notice 不动。`revisions.test.ts` 36→**39 条**（主路换前缀兼读回、空根返 0 且 `dirs.size===0`、单份写失败/删失败都不抛且旧文件仍在；fake 加 `failWrite`/`failRemove` 注入点）。tester 独立（未读 `impl.md`）：`revisions.test.ts` **39/39 0 fail**；负向把靶点改回旧哈希 → **2 红 exit 1**（计划预期「只主路 1 红」，因 `failWrite` 键在新哈希名上、该注入点永不命中而一并转红，不判 FAIL），备份 SHA256 `DC61861D…` 拷回后 39/39；`git diff --stat -- src` **4 文件**、`migrateRevisions` App.tsx 2 行 / src 3 文件、`findSnapshotsDir` 定义仅 1 处；自跑 E2E `.tmp/e2e-r123-a1-rename-snap.mjs`（ego CDP 57270、1440×900、假 FSA）**12/12、0 pageerror**（`.tmp/r123-a1-rename-snap.json`）：改名前三份？不——磁盘恰 2 份、面板 2 行；改 a.md→c.md 后磁盘 2 份前缀 `2b24d044`→`7729c516`、旧前缀 0、后缀 `-mwoo1vj4-…`/`-mwoo1x0u-…` **逐字同**；**重开**面板 `snaps.length===2` 且 `snapEmpty:null`；再存一次面板 3 行、磁盘 3 份全新前缀；截图 `shots/round-123/revision-snap-after-rename.png`。回归 `.tmp/e2e-r78-a2-rename.mjs` **11/11**、`.tmp/r114-tester-e2e.mjs` **27/27**。门禁：`npm test` **64 文件 913 条 0 fail**（基线 64/910）、`npm run verify` **PASS**、门 gzip **315,685 B**（净 **+126 B**、headroom 4,315；内部预算 310,000 超 5,685 只 WARN）、常驻 `MarginRail-BOWUh__F.js` gzip9 **7,416**、B-229 口径 **323,101**（超硬线 3,101，仍 `open` 只记）；`roundtrip` 不跑（未动编辑器/序列化）。UNVERIFIED：真 WebView2 宿主与真实 FSA 下的改名迁移；B-256（`recordRevision` fire-and-forget 与改名的竞态窗口）只有代码阅读，本轮 E2E 在保存后停 1.6 s 避开。见 `docs/iteration/round-123/test.md`。

**第 122 轮（同一未发版区间）**

- 暖纸主题「整体评价」条数徽标对比度补到 AA（**B-252**，第 119 轮三主题扫描唯一失败项）：`.rail-overall-count` 的 `color: var(--ink-soft)` 改 **`color: var(--ink)`**（`src/styles.css:1182` 加第 122 轮注释、`:1188` 改动，`git diff` **+2/−1**；`background: var(--line)`、`font-size: 10px`、`padding`、`border-radius` 一律不动）——三主题比值 5.10 / **4.02** / 6.03 → **12.32 / 8.20 / 10.97**，药丸底 vs 整体评价底仍是 1.21 / 1.31 / 1.31（外观不变）；`src/lib/themes.test.ts` 追加 1 条（`ruleDeclarations('.rail-overall-count')` 取字色/底色，三档先算比值各断 ≥4.5 并 `table.push`、再断 `table.length===3`、最后断 `color==='var(--ink)'`），`npm test` 64 文件 909→**910 条**。tester 独立（未读 `impl.md`）：自读 CSS 变量复算 **12.3173 / 8.2048 / 10.9689**、旧 `--ink-soft` 4.0181；负向改回 `--ink-soft` → **11 pass / 1 fail exit 1**、报文「暖纸的徽标只有 4.02:1」，还原 **12/12 exit 0**；自写真机探针（ego CDP 57270、1440×900）**20/20、0 pageerror**：sepia 徽标底逐字 `rgb(221, 203, 170)`、三档比值与静态同值、徽标 16×16 / 10 px；门禁 `npm run verify` PASS、gzip **315,559 B**（净 **+6 B**、余硬线 4,441、距本轮验收线 1 B；内部预算 310,000 仍超 5,559 B 只 WARN）、chunk `MarginRail-CQzq6gd5.js` gzip9 **7,417**、B-229 口径合计 **322,976**（仍 `open`，只记）；回归 `theme-acceptance` **27/27** 后已 `git checkout -- shots/round-05/`；`roundtrip` 不跑（未动编辑器/序列化）。证据 `.tmp/r122-tester-*.{mjs,json,log}`、截图 `shots/round-122/rail-overall-count-sepia-tester.png`。UNVERIFIED：真实屏幕阅读器、真 WebView2 宿主、真实中文 IME、原生打印。见 `docs/iteration/round-122/test.md`。

**第 121 轮（同一未发版区间）**

- 侧栏「对比 / 在审」关闭钮与「判错了，重来」补到 24×24 可点高度（**B-251**，第 119 轮 finder 真机：两面板 × 钮 24×19、`.rail-goal-retry` 72×18.6，B-236 漏了这两处）：`src/styles.css` 的 `.rail-diff-close`（现 :1443，HEAD :1442）与 `.rail-goal-retry`（现 :3434，HEAD :3431）各加 1 行注释 + `min-height: 24px`，宽 / padding / 字号一律不动（`git diff -U0` **+4/−0**、全文件 `min-height: 24px` **10→12**、HEAD 两块内 0 处）；`src/lib/touchTargets.test.ts` 追加 2 条（`singleRule` 恰 1 块 + `assertTapTarget`：`min-height|height` ≥24、块内禁 `width`/`min-width`），挂 `npm test` 链尾（64 文件 907→**909 条**），HEAD 树 **3 pass / 2 fail**、改后 **5/5**。tester 独立（未读 `impl.md`）：头树复现用 `.tmp/r121-tester-headtree` 拷 HEAD 版 CSS，不碰工作树；自写 `.tmp/r121-tester-e2e.mjs`（ego CDP 57270、1440×900、先 `reset.mjs 57270`）**24/24、0 pageerror / 0 console error**（`.tmp/r121-tester-e2e.json`）：① diff 关闭钮 **23.58×24**（宽是取整差、高度才是 19→24）+ sheet **109 ≤ 721** + Esc 关、`[inert]` 0、焦点回 `.rail-diff-open`；② 在审关闭钮同值；③ retry **72×24**、`.rail-goal` **320×34**（改前 28.6）、retry.top **214 ≤** label.bottom **235.30**、1 张卡 [296,447.5] 不重叠、末卡底 **447.5 ≤** 整体评价 **460.19**、goal/rail `scrollWidth−clientWidth` **0/0**；④ 注入 `min-height:0` 回 **18.8 / 18.6 / 28.6**、撤掉回 **24 / 24 / 34**；⑤ 第 120 轮 B-250 夹具 **119 行**（scrollH/clientH 2380/540）关闭钮 Tab→`ul.rail-diff-rows`、ArrowDown `scrollTop 40`。门禁：`npm test` **64 文件 909 条 0 fail**、`npm run verify` PASS、门 gzip **315,553 B**（+7、headroom 4,447）、`measure --max 315600` PASS（余 47）；常驻 `MarginRail-C8Yy3L3b.js` gzip9 **7,414**（B-229 口径合计 **322,967**，仍 `open` 只记）；回归 `.tmp/e2e-r100-diff.mjs` **43/43**；`roundtrip` 不跑（未动编辑器/序列化）。偏移：关闭钮宽 23.58 px ≈ 24（改前同值，fix_hint 要求宽度不动）。UNVERIFIED：真实屏幕阅读器、真 WebView2 宿主、真实中文 IME、原生打印。见 `docs/iteration/round-121/test.md`。

**第 120 轮（同一未发版区间）**

- 「对比」面板的长 diff 现在可键盘滚动（**B-250**，第 119 轮 finder 真机：119 行 diff 时 `.rail-diff-rows` 是 `max-height:60vh; overflow:auto` 的纯 `<li>` 列表、无 tabindex，面板唯一 Tab 站是关闭钮，PageDown/ArrowDown/End 后 scrollTop 全 0、同一容器滚轮 400；WCAG 2.1.1）：`src/components/MarginRail.tsx:874` 的对比 ul 加 `role="list"`/`tabIndex={0}`/`aria-label="改动对比行"`（上一行第 120 轮注释），在审文件 ul（`:934`）不动；新静态门 `src/lib/railDiffA11y.test.ts` **4 条**挂 `npm test` 链尾（63→**64 文件**、903→**907 条**：两处 ul 按子节点分派、对比那条断三属性、在审那条禁 `tabIndex`、全文件 `tabIndex={0}` 恰 3 处且 `.rail-diff-rows` 的 `max-height`/`overflow` 仍在），负向只删对比 ul 的 `tabIndex={0}` → **2 红 exit 1**（②④）。tester 独立（未读 `impl.md`）：静态 diffstat **1 file changed, 2 insertions(+), 1 deletion(-)**、`-U0` 1/2、diff 内 `rail-review` 0 命中、`git diff -- src/styles.css` 空；before **7/7**（119 行 / scrollH 2380 / 溢出 1840 / 键盘 4 键全 0 / 滚轮 400）→ after **12/12、0 pageerror**（`tabindex="0"`/`role="list"`/`aria-label`、关闭钮 Tab 一次落 ul 且 `:focus-visible`、三主题四块 outline 2px 且色 = 页内 `--focus-ring`、溢出 1840、PageDown 472→944 / ArrowDown 984 / End 1840=max / Home 0、End 后末行底 = ul 底、Esc 关面板 + `[inert]` 0 + 焦点回 `.rail-diff-open`），截图 `shots/round-120/diff-kb-scroll.png`。门禁：`npm test` **64 文件 907 条 0 fail**、`npm run verify` PASS，门 gzip **315,546 B**（净 **+4 B**、headroom 4,454；偏差已查因——chunk 哈希全局换名使入口 gzip +4，把 `MarginRail.tsx` 换回 HEAD 版重建可复现 315,542，非主包体积增长）、常驻 `MarginRail-D1qNoJ-u.js` gzip9 **7,419**（B-229 口径合计 322,965，仍 `open`）；回归 `.tmp/e2e-r100-diff.mjs` **43/43**、`.tmp/e2e-r101-review.mjs` **57/57**；`roundtrip` 不跑（未动编辑器/序列化）。UNVERIFIED：真实屏幕阅读器、⑧⑪ 两条可裁组、真 WebView2 宿主/真实中文 IME/原生打印。见 `docs/iteration/round-120/test.md`。

**第 119 轮（同一未发版区间）**

- App 级对话框开着时右侧「对比 / 在审」两个只读面板让位（**B-249**，第 119 轮 finder 真机：`Ctrl+Alt+N` 的「这篇还有没保存的改动」确认框被 z 60 的 `.rail-diff-overlay` 与 `#root` inert 压在下面，焦点锁在面板、三钮键盘不可达）：`src/App.tsx` 加渲染期谓词 `appDialogOpen`（设置 / 快捷键 / 全局搜索 / 快速打开 / 三种确认框 / 草稿与宿主草稿提示共 **10 态**，含 `hostDraftPrompt !== null`）并传给 `<MarginRail>`；`src/components/MarginRail.tsx` 的 Props/解构各 1、`diffOpen` 与 `reviewActive` 各加 `&& !appDialogOpen`、对比面板 portal 条件改 `{diffData !== null && diffOpen &&`（前段只供 TS 收窄）、`docName` effect 加 `setDiffData(null)`（让位期间换文档回来不挂上一份 diff）；不改 `dialogOpen`、effect deps、`styles.css` 与 Esc 次序。新静态接线门 `src/lib/railModalGate.test.ts` 6 条挂 `npm test` 链尾（App 谓词 10 态与两处只读面板谓词、portal 条件、docName 清理；注释先摘，照 `touchTargets.test.ts` 做法），负向删 `diffOpen` 的 ` && !appDialogOpen` → **5 pass / 1 fail exit 1**。tester 独立（未读 `impl.md`）：静态 `appDialogOpen` 在 HEAD 两文件 **0** → App 定义 1 / prop 1 / `!appDialogOpen` 2；`before`（`git stash` 回旧码、dev 模块计数 0）**7/7**（overlay 1、`#root` inert、Tab 4 次同一关闭钮、Esc 后确认框才现身且焦点 BODY）→ `after`（ego CDP 57270、1440×900 + 1024×700、假 FSA 记 ops）**34/34、0 pageerror**（`.tmp/r119-a1-{before,after}.json`）：B 段 Ctrl+P 时 overlay 0 / backdrop 1 / 焦点输入框，Esc 在审面板回、空态与焦点正确；A 段 Ctrl+Alt+N 时 overlay 0、K（框可见 + 焦点在框内 + `#root` 无 inert）成立、中心命中 `DIV.dialog`、Tab 5 次全在框内且三钮都到过，Esc 回 sheet、再 Esc 面板 0 且焦点不落 BODY；C 段 `Ctrl+S` 3 s 内 `write:c.md` 恰 +1 且假盘含新字、toast「已保存」、无 picker；1024×700 抽屉态 K 成立、z 序 40 < 44 < 45 只记 B-253；截图 `shots/round-119/confirm-over-diff.png`、`shots/round-119/diff-back-after-cancel.png`。门禁：`npm test` **63 文件 903 条 0 fail**（基线 62/897）、`npm run verify` **exit 0 PASS**、门 gzip **315,542 B**（净 **+33**、headroom 258）、常驻 `MarginRail-DSGFlalk.js` gzip9 **7,398**（+7）、B-229 口径合计 **322,940**（+40，仍 `open` 只记）；回归 `.tmp/e2e-r100-diff.mjs` **43/43**；`roundtrip` 不跑（未动编辑器/序列化）。UNVERIFIED：真 WebView2 宿主、真实中文 IME、原生打印、真实 FSA（验收用假 FSA）。见 `docs/iteration/round-119/test.md`。

**第 118 轮（同一未发版区间）**

- 对话记录区（`.rail-chat-log`）现在可键盘聚焦（**B-244**，用户 2026-11-20 队列「对话区」，WCAG 2.1.1）：`src/components/MarginRail.tsx:764` 开标签加 `tabIndex={0}`（单行 1+/1−、+12 字符；`role` / `aria-live` / `aria-busy` / `aria-label` / `ref` 与渲染结构一字未动，`styles.css` 不改），Tab / Shift+Tab 在输入框与记录区之间往返，聚焦后 PageUp / PageDown / Home / End / ↑ / ↓ 能回看历史（长回答实测 PageUp −525、ArrowUp −40、Home 0、End 1027=max）；`src/lib/chat.test.ts` 24 → **25 条**读源码机械门（同一开标签断 `tabIndex={0}`、禁 `{-1}`、禁按 `turns.length` 条件化、`className` 恰 1 处；负向删属性恰 1 红、拷回 SHA256 同）。tester 独立（未读 `impl.md`）：先 `git checkout --` 回 HEAD 版自跑 `--phase before` **7/8**（`.tmp/r118-b244-before.json`：`attr:null`、`tabIndex:-1`、空记录 Shift+Tab 落 `#rail-tab-chat`、`focus()` 后 PageUp 减 525；1 红为 plan R1 已记录的本机 Edge 157 原生可滚容器可聚焦）→ 写回后 `--phase after` **13/13、0 pageerror**（`.tmp/r118-b244-after.json`：真实 Shift+Tab 落 log、真实 Tab 回输入框、outline **2px solid rgb(43,109,100)**、置底后 PageUp **−525** / ArrowUp **−40** / Home→**0** / PageDown **+525** / End→**1027=max**、载入与收流后焦点都不是 log、`role`/`aria-label`/`aria-live` 逐字不变、栏宽 **320**、横溢 **0**）；截图 `shots/round-118/chat-log-focus.png`。回归 r96 **42/42**、r112 **10/10**、r111 **14/14**、r108 **17/17**（tester 版 **22/22**）、`keyboard-acceptance` **52/52**，跑完还原 `shots/round-05|96|108|111|112`。门禁：`npm test` **62 文件 897 条 0 fail**、`npm run verify -- --max 315800` **exit 0 PASS**、门 gzip **315,509 B**（Δ **0**、headroom 291）、常驻 `MarginRail-eN3hT9po.js` gzip9 **7,391**（raw +11 / gzip −1 vs 7,392）、B-229 口径合计 **322,900**（−1，B-229 仍 `open` 只记）；`roundtrip` 不跑（未动编辑器/序列化）。见 `docs/iteration/round-118/test.md`。

**第 116 轮（同一未发版区间）**

- 对话记录的用户与侧灯两条消息有可读的发言者标识（**B-242**，用户 2026-11-20 队列「对话区」；WCAG 1.3.1 / 1.4.1）：`src/lib/chat.ts:136` 新纯函数 `chatSpeaker`（`我：` / `侧灯：`，只给显示层，不进 `turn.text`——模型历史、流式拼接与 401 收尾看到的都是原文）；`src/components/MarginRail.tsx:773` 在 `.rail-chat-turn` 内插 `{(turn.text || busy) && <span className="rail-chat-speaker">{chatSpeaker(turn.role)}</span>}`，原正文表达式 `{turn.text || (busy && turn.role === 'assistant' ? '…' : '')}` 一字未改（200 零 delta 的空 assistant 不标署，B-246 范围不变）；`src/styles.css:1555` 六条 sr-only 声明（`position:absolute` / `width|height:1px` / `overflow:hidden` / `clip-path:inset(50%)` / `white-space:nowrap`），禁 `display:none` / `visibility:hidden` / `user-select:none`（前两者会把文本从 `innerText` 与 AX 树摘掉，后者让复制丢前缀）。`chat.test.ts` 20 → **23/23**（纯函数一条 + 两条读源码机械门，其中样式那条按块切 `styles.css`）；负向 `git stash` 掉 `MarginRail.tsx`+`styles.css` → ②③ **2 红**。tester 独立（未读 `impl.md`）：静态 `rail-chat-speaker` 在 `MarginRail.tsx`+`styles.css` **0→2**、`chatSpeaker` 在 `chat.ts`+`MarginRail.tsx` **0→3**（`-- src` 口径 17 行，只记录）、样式恰 1 块且 6 条声明逐项相等、块内三禁写 0（全文件各 1 条作正向对照）、正文表达式与 HEAD 逐字相同；自写 `.tmp/r116-tester-speaker.mjs`（ego CDP 57270、1440×900、无 Key mock）**10/10 断言、0 pageerror**（`.tmp/r116-tester-speaker.json`）：2 turn 各恰 1 枚署名、剥前缀后 user 逐字等于发出那句、assistant 与交付 before JSON 逐字相等（48 字）、`innerText` 与 Range 都含两枚、CDP `Accessibility.getFullAXTree` 两枚 `ignored:false`、sr-only 计算值 absolute / inset(50%) / hidden + rect **1×1** + 三禁值 0、同会话反事实删 span 后 turn 高 `[35,58]` 与 `log.scrollHeight` 108 差 **0**（与交付 before 基线也差 0）、栏宽 320。旧脚本 10 文件 12 点加 `stripSpeaker`（`node --check` 10/10），复跑 `r96-tester` 与 `e2e-r113` 绿。门禁：`npm run verify -- --max 315800` **exit 0 PASS**、门 gzip **315,509 B**（净 **+17**、headroom 291、`target=310000 gap=-5,509` 只 WARN）、常驻 `MarginRail-*.js` gzip9 **7,392**（+55）、B-229 口径合计 **322,901**（超首屏硬线 **2,901**，B-229 仍 `open`、只记）；`npm test` **62 文件 895 条 0 fail**；`roundtrip` 不跑（未动编辑器/序列化）。见 `docs/iteration/round-116/test.md`。

**第 115 轮（同一未发版区间）**

- 侧栏页签的 Tab 不再被文首 1/1 劫持（**B-241**，用户 2026-11-20 队列「对话区」的键盘路径）：`src/App.tsx:5886-5895` 的 `main#editor` `onKeyDownCapture` 只加两个守卫——`:5888` 原有条件后补 `editor.isDestroyed`、新 `:5890` `if (!editor.view.dom.contains(event.target as Node)) return`（+1 行注释，diff 3+/1−，`MarginRail.tsx`/`styles.css` 0 改动）。右侧侧栏在 `main` 内（`MarginRail.tsx:420` 由 `App.tsx:6000` 渲染、`</main>` 在 `:6089`），所以此前在对话/批注面板里按 Tab 会直接跳到 `.skip-link`；改后焦点在侧栏或 `main` 自身时不劫持，正文 `1/1` 的首个 Tab 仍到 skip-link（`defaultPrevented===true`）。tester 独立（未读 `impl.md`）：自写 `.tmp/r115-tester-b241.mjs`（ego CDP 57270、1440×900，先 `node .tmp/reset.mjs 57270`）**26/26 断言、0 pageerror/console error**（`.tmp/r115-tester-b241.json`）——批注路 Tab×3 = `[.rail-review-open, #rail-tab-notes, .stats-trigger]`、对话路填「草稿」后 Tab×3 = `[.rail-chat-send, .rail-chat-generate, .stats-trigger]`，逐项相等且无 `.skip-link`；打 1 字（`from=2`）+ `Ctrl+End` 后两路不变；`Ctrl+Home` 回 `{1,1}` 后 Tab 仍 `A.skip-link` 且 `defaultPrevented`；`Shift+Tab` 从发送钮回输入框；预览态 `main#editor.focus()` 后 Tab 0 新 pageerror；`.margin-rail` 宽 320、横溢 0。改前三条互证：`.tmp/r115-b241-before.json`（`head=ad2cd11`、两路首站 `.skip-link`）、`git grep -nF 'view.dom.contains' ad2cd11 -- src` 与 `'editor.isDestroyed'` 均 **0（exit 1）**、正控在改后代码仍复现劫持。门禁：`verify -- --max 315600` **exit 0**、门 gzip **315,492 B**（净 **+28**、headroom 108）、常驻 `MarginRail-*.js` gzip9 **7,337**、B-229 口径合计 **322,829**（超硬线 **2,829**，B-229 仍 `open`、只记）；`npm test` **62 文件 892 条 0 fail**；回归 `keyboard-acceptance` **52/52**（`SIDELIGHT_CDP=57270`、`http://localhost:5175`，跑完 `git checkout -- shots/round-05/`）；未加测试文件（2 行守卫由 E2E + 静态门覆盖）、`roundtrip` 不跑（未动编辑器/序列化）。见 `docs/iteration/round-115/test.md`。

**第 114 轮（同一未发版区间）**

- 修订快照只读清单（A1/A2，**B-247**，用户 2026-11-20 队列「修订快照与批注迁移」的读侧）：新 `src/lib/revisionList.ts`（`RevisionSummary`/`formatSavedAt` 本地时区 `MM-DD HH:MM:SS` 补零/`listRevisions(parent,key,max)`），目录照 `cache.ts` 的 findCacheDir **不带 create**、缺目录或抛错都回 `[]`，`entries()` 只收 `kind==='file'` + `parseRevisionName` 命中的本键名（他键/坏名/旧格式不读），savedAt 降序取前 `MAX_REVISIONS`，逐份 `getFile().text()` + `parseRevision`、坏档跳过不补位，**savedAt 取文件名**（JSON 的 0 或旧值不采纳）、bytes 取 JSON、total=批注数、open=`reviewStatusOf==='open'` 数，永不抛；`revisions.ts` 把 `revisionKeyHash`/`parseRevisionName` 改导出（实现不动）给清单复用同一份文件名规则；`MarginRail.tsx` 在「在审」sheet 列表后加 `section.rail-snap`（`h3.rail-snap-title` + `ul.rail-snap-rows > li.rail-snap-row.rail-diff-row` + 空态「保存一次后才会记录。」+「快照只记批注与字节数，不存正文，不能回到旧版正文。」），点开面板时与在审列表并行、用 `await import()` 惰性加载（不进首屏），`snapData` 为空/读取中/无工作区都不渲染；`snapRunRef` 复用 `reviewRunRef` 在关闭、切页签、换文档三处推进，读取中关面板或换文档不留过期行；`App.tsx` 加 `getRevisionSource`（`cacheDirFor()` + `cacheKey(docName)`）；`styles.css` 6 条纯文本样式；`README.md`「现在不能做什么」加同句边界（不存正文、不能回滚）；`revisions.test.ts` 28→**36 条**（清单 a–h 八例，含「无 `.sidelight` → `[]` 且不建目录」「JSON savedAt:0 → 按文件名」）。tester 独立（未读 `impl.md`）：`^test(` HEAD **28** → **36**、单测 **36/36**、`npm test` **62 文件 892 条 0 fail**；静态 `listRevisions` HEAD **0（exit 1）→ 11 行**、新文件 `getDirectoryHandle\([^)]*create` **0**、`revisionsDir(` **0**（对照 `getDirectoryHandle` 2 行）；自写探针 `.tmp/r114-tester-snap.mjs` **9/9**，自写 E2E `.tmp/r114-tester-e2e.mjs`（ego CDP 57270、1440×900、假 FSA 记 `read:/dir:/miss:/create:/write:/remove:`）**27/27 断言、0 pageerror**：无 `.sidelight` 时 `.sidelight/` 下写 0 且不建目录、`Ctrl+S` 后 `R` 1 份、种 7 份+坏名+他键共 10 文件 → 面板 8 行 / 读恰 8 / 写 0、行挂在 `ul.rail-snap-rows > li` 且同挂两 class、8 行降序且逐行 = Node 自算 label、首行 `^\d\d-\d\d \d\d:\d\d:\d\d$`、`savedAt:0` 显文件名时刻、note 与 README 同句、无工作区 `.rail-snap` 0、读取中关面板 0 过期行、换文档 `.rail-snap` 0、1440/1024 两档横溢 0、在审列表仍 1 行不变；截图 `shots/round-114/revision-snapshots.png`。门禁与体积：`verify -- --max 315900` **exit 0**、首屏 gzip **315,464 B**（净 +253）、常驻 `MarginRail-*.js` gzip9 **7,337**（基线 6,916，同法重建 HEAD 逐字节复现 → **超计划上限 6,980 共 357 B**，偏差不判 FAIL：计划只给 `App.tsx`≈+100/CSS≈+200 留量、漏算组件本体）、新惰性 `revisionList-*.js` gzip9 **616**、合计 **322,801**（超硬线 **2,801 B**，**B-229 仍 open**、只报数）；回归 `e2e-r100-diff` **43/43**、`e2e-r101-review` **57/57**、`r105-tester-e2e` **33/33**，跑完 `git checkout -- shots/round-100 shots/round-101 shots/round-105`。计划要求 B-247/B-248 先入池，实施后 BACKLOG 无这两行，本轮由 tester 补入（B-247 → `fixed`、B-248 → `deferred`）。见 `docs/iteration/round-114/test.md`。

**第 113 轮（同一未发版区间）**

- 401（Key 错）失败收尾撤掉空 assistant 占位（A1/A2/A3，B-243，用户 2026-11-20 队列「对话区」残留）：`src/lib/chat.ts` 在 `appendDelta` 后加导出纯函数 `dropEmptyAssistantTail(turns)`（末条不存在 / 非 assistant / 有字 → 返回同一引用；否则 `slice(0,-1)`）；`src/components/MarginRail.tsx:216-219` 的 `catch (error)` 里 `setChatError(...)` 之后用函数式 `setTurns((previous) => dropEmptyAssistantTail(previous))`（闭包写法 0 处），渲染 `:728` 的 `turn.text ||` 与 busy 的「…」不动；`chat.test.ts` 18→**20 条**（纯函数 4 例 + 读源码静态门）。
- 实测：tester 独立探针 **10/10**（纯函数 5 例 + 静态 4 门 + 改前证据），交付 E2E `.tmp/e2e-r113-chat-401.mjs` 现场重跑 **a–e 全 OK**、0 pageerror：401 后 turn 1 / assistant 0 / 空文本子元素 0、连续两次 401 不吞上一轮、假 SSE 成功回答保留、「新对话」清空；回归 r96 **42/42**、r112 **10/10**（跑前跑后还原 `shots/round-96|112`，两目录 `git status --porcelain` 为空）。门禁 `npm test` **62 文件 884 条 0 fail**、`npm run verify -- --max 316000` PASS、门 gzip **315,218 B**（改前 315,213、净 +5；距硬线 320,000 余 4,782 B）。截图 `shots/round-113/chat-401-no-bubble.png`。已知边界：200 成功但流里 0 字仍留空占位，另立 Deferred **B-246**。见 `docs/iteration/round-113/test.md`。

**第 112 轮（同一未发版区间）**

- 对话记录上翻不再被流式 delta 拽回（A1/A2，B-245，用户 2026-11-20 队列「对话区」）：`src/components/MarginRail.tsx` 的贴底 effect 由「`turns` 每变一次就 `log.scrollTop = log.scrollHeight`」改为「整轮 +1 或切回页签才无条件贴底，delta 只在读者贴着底（距底 < 32 px、现场读三个数）时才跟」，`prevTabRef` 写回先于页签守卫（B-232 前提保持）、不加 `onScroll`；`src/lib/chat.ts` 加纯函数 `CHAT_STICK_SLACK`/`chatNearBottom`/`chatScrollOnUpdate`；`chat.test.ts` 15→**18 条**（边界/真值表/读源码静态门）。
- 真机与反事实（ego CDP 57270、1440×560、无 Key mock 流放慢 140 ms、MutationObserver 计 delta）：翻顶 baseline **0**、之后 **3** 批 delta 仍 0、收流 0；正向 `scrollHeight` 646→775、距底 0；回到底部后 863→884、收流距底 0；旧无条件贴底同脚本 **6/10** 红（`afterDeltas` **344**、`settledTop` **386**）、还原后 **10/10**，0 pageerror。
- 门禁与体积：`npm test` **62 文件 882 条 0 fail**、`npm run verify` exit 0、首屏门 gzip **315,213 B**、`MarginRail` chunk gzip9 **6,884**、B-229 口径合计 **322,097**（超硬线 2,097，**B-229 仍 open**、只记）；回归 r104 **25/25**、r111 焦点 **全过**。见 `docs/iteration/round-112/test.md`。

**第 110 轮（同一未发版区间；验证轮，0 产品改动）**

- 复测 B-236 的 24×24 可点击口径：真机（ego CDP 57270、`Network.setCacheDisabled` 冷加载、1440×900 回读）两入口 **35×24**（rect [1214,140]/[1256,140]）、计算 `min-height: 24px`、CSSOM 命中整块 `min-height: 24px` 且无 `height`、`.rail-head` 块无 `height` 且 rect 24、两钮间距 **7**、在审右缘差 **0**；反事实注入 `height:16px!important` → **35×16**、撤掉回 **35×24**。判定 **(a) 35×24 为陈旧读数**（16px 是第 107 轮 `:1336` 之前的值），A2（改 CSS）不触发，`src/` 0 改动。
- 门禁与回归：`npm run verify` PASS、首屏门 gzip **315,220 B**（raw 1,022,532、余硬线 4,780）、`npm test` **62 文件 877 条 0 fail**；三路 CSS 字节（`?direct` 78,141 / 无 query 82,356 / `dist` 52,096 B）均含 `min-height: 24px`；回归 r107 几何 **23/23**、r100 **43/43**、r101 **57/57**，0 pageerror。见 `docs/iteration/round-110/test.md`。

**第 109 轮（同一未发版区间）**

- 修订快照清理不再读正文（A1/A2，B-239，用户 2026-11-20 队列「修订快照」的每保存一次读全部快照）：`src/lib/revisions.ts` 快照文件名改 `<键哈希>-<保存时刻 base36>-<正文 id>.json`（新增私有 `revisionKeyHash`/`revisionFileName`/`parseRevisionName`），`writeRevision` 的「同正文已在 + 清理」由逐份 `getFile().text()` + `parseRevision` 改为只按文件名筛同键；列目录失败只跳过这两步、本次快照照常写（宁多一份不丢）；`parseRevision` 保留导出。`src/lib/revisions.test.ts` 24→**28 条**（他键零内容读、旧格式在场、`entries()` 抛错仍写、坏名不参与清理）。
- 门禁与实测：`node --experimental-strip-types src/lib/revisions.test.ts` **28/28**；静态 `.getFile()` 1（HEAD `:232`）→0、`= parseRevision\(` 1（`:233`）→0、`export function parseRevision\(` `:71` 仍 1；探针 80 份后保存 `{getFile:0,text:0,wrote:1,listed:1}`、第 10 篇首存 `{getFile:0,text:0}`、同键 8 份、旧格式保留；`npm run verify -- --max 315421` PASS、首屏 gzip **315,220 B**（余硬线 4,780）、`npm test` **62 文件 877 条 0 fail**；回归 r99 快照 E2E **32/32**。B-229 合计 **321,999** 仍超硬线 1,999（open，只记）。见 `docs/iteration/round-109/test.md`。

**第 108 轮（同一未发版区间）**

- 对话流式期间关 live、收流再开（A1，B-237，用户 2026-11-20 队列「对话区」残留）：`src/components/MarginRail.tsx:704` 的 `.rail-chat-log` 由静态 `aria-live="polite"` 改 `aria-live={busy ? 'off' : 'polite'}` + `aria-busy={busy}`；`role="log"` / `aria-label="对话记录"` / ref / 渲染结构、`styles.css`、`ai.ts`、`App.tsx` 均不动。
- 机械门：`src/lib/chat.test.ts` 12→**13 条**（读源码切 `.rail-chat-log` 开标签，断动态 live、`aria-busy`、无静态 polite、role/aria-label），挂 `npm test` 链尾。负向对照：HEAD 版 `MarginRail.tsx` 副本 + 同一测试 → **1 红 exit 1**。
- 门禁与验收：`npm run verify` PASS；首屏门 gzip **315,171 B**（`--max 315183` exit 0、余硬线 4,829）、`MarginRail-*.js` gzip9 **6,778**（改前 6,762、+16、≤6,825）、合计 **321,949**（改前 321,935、+14、≤322,010；超硬线 1,949，**B-229 仍 open**，只记）；`npm test` **62 文件 873 条 0 fail**。真机（ego CDP 57270、1440×900、无 Key mock）自写脚本 **22/22**、0 pageerror：characterData 16、≥10 条时 off/true、末批 1 条与属性切换同批（允许并记录）、收流 polite/false、恰 2 turn / 1 assistant、「看看这一段」在 assistant 内恰 1 次、焦点回输入框、发送 disabled、role/label 不变；交付脚本 **17/17**；回归 r96 **42/42**；截图 `shots/round-108/chat-live-off.png`。已知后果（CR-2 ②，另立 B-238）：off 期间累积文本多数读屏不缓存、切回 polite 不重播，最坏整条听不到；本轮不声称修复播报完整性。见 `docs/iteration/round-108/test.md`。

**第 107 轮（同一未发版区间）**

- 右侧三个新入口补 24×24 可点口径（A1，B-236）：`src/styles.css` 的 `.rail-diff-open,.rail-review-open` 由 `height: 16px` 改 `min-height: 24px`（宽仍 35），`.rail-chat-reset` 加 `min-height: 24px`（52.5×21 → 52.5×24），`:1329-1331` 注释整段重写。已知偏差：24px 控件把 `.rail-head` 从 16 撑到 24，`.rail-tabs` 及以下整体下移 8px（tabs 底 − head 底 仍 39、tabs 底相对栏顶 59→67）。
- 机械门（A2）：新 `src/lib/touchTargets.test.ts` 3 条挂 `npm test` 链尾（61→**62 文件**、869→**872 条**）：两入口同一规则块且 `min-height` ≥24、`.rail-chat-reset` 同口径且 `margin-left: auto` 在、`.rail-head` 不许写 `height`。负向对照：HEAD 版 CSS 下 **2 红 exit 1**。
- 门禁与验收：`npm run build` exit 0，首屏门 gzip **315,173 B**（plan 预计 315,163，+10 B 来自 CSS 名哈希进入口 JS；`--max 315300` PASS、余 127），`MarginRail-*.js` gzip9 **6,762** 不变，真实首载 **321,935**（超硬线 1,935，**B-229 仍 open**，只记）；`npm test` **62 文件 872 条 0 fail**；静态门 `min-height: 24px` 8→10 行、`height: 16px` 3→2 行。tester 独立（未读 `impl.md`）：自写 `.tmp/r107-tester-geom.mjs`（ego CDP 57270、1440×900）**23/23**、0 pageerror：改后用 CSS 反事实覆盖取改前值作差——三钮 35×16→35×24、head +8、tabs top +8、底差恒 39、底相对栏顶 59→67、间距 7、在审右缘差 0、chatHead 21→24、reset 52.5×24、发送钮 +3，1440/1256/1024 三档横溢 0，对比 Esc 关回焦点、在审关闭钮、新对话 disabled→enabled→清空全过；回归 r100 **43/43**、r101 **57/57**（跑完还原 `shots/round-100`、`shots/round-101`）；截图 `shots/round-107/targets-notes.png`、`shots/round-107/targets-chat.png`。见 `docs/iteration/round-107/test.md`。

**第 106 轮（同一未发版区间）**

- 对话输入框补主题配色（A1，B-235，用户 2026-11-20 队列「对话区」的残留）：`src/styles.css:1561-1564` 给 `.rail-chat-compose textarea` 插 4 条声明 `color: var(--ink)` / `background: var(--panel)` / `border: 1px solid var(--line-input)` / `border-radius: 8px`（原 5 条声明不动）；三主题 computed light rgb(241,238,230)/rgb(29,32,35)/rgb(133,137,140)、dark rgb(25,28,32)/rgb(233,230,224)/rgb(107,113,120)、sepia rgb(239,226,201)/rgb(58,47,33)/rgb(138,122,98)，ink/panel 14.12/13.73/10.19、line-input/panel 3.04/3.25/3.47（浅色 3.04 余量薄，按计划保留 `--line-input`）。
- 机械漂移门（A2）：`themes.test.ts` 追加 1 个 test（4 条声明 + 三主题 6 对对比度 + pair 数=6，复用现成 `ruleDeclarations`/`cssVars`/`resolveColor`/`contrastRatio`，无新依赖）。正向对照：border 临时改 `var(--line)` → 红；整文件还原后 SHA256 相同、11/11 绿。
- 门禁与验收：首屏门 gzip **315,158 B**（改前 315,153，+5；`--max 315300` exit 0、余硬线 4,842）；`MarginRail-*.js` gzip9 **6,762** 不变，真实首载 **321,920**（超硬线 1,920，**B-229 仍 open**，只记）；`npm test` **61 文件 869 条 0 fail**（+1）。tester 独立（未读 `impl.md`）：`git diff` styles.css 4+/0−；自写 E2E `.tmp/r106-tester-e2e.mjs` **47/47**、0 pageerror（ego CDP 57270、1440×900）：三主题逐值、半径 8px、CSSOM 改前/改后尺寸差 **0 px**、发送钮仍在第二行、rail 横溢 0、聚焦仍 2px outline 且 border 仍是 `--line-input`、fill/Shift+Enter/Enter 真交互、1024×700 抽屉横溢 0；回归 `.tmp/e2e-r96-a1-chat.mjs` **33/33**（跑完还原 `shots/round-96/rail-chat.png`）；截图 `shots/round-106/chat-input-dark.png`。见 `docs/iteration/round-106/test.md`。

**第 105 轮（同一未发版区间）**

- 全部结项的文档不再算「在审」（P2，B-234，用户 2026-11-20 队列第 8 条残留）：`src/lib/reviewFiles.ts` 加 `hasUnclosedReview`（open 或 in-progress 才算未结项，复用 `annotations.ts` 的 `isClosedReview`），`collectReviewFiles` 的入列判定由「有批注档且 `annotations` 非空」改成「至少一条未结项」——全 resolved / wont-fix 的档不再入列；`applyLiveReviewRow(result, live, liveClosed=false)` 加第三参：为真时只删同 path 的那一行，不 push、不重排、不回填被截断的第 51 行（`truncated` 不动），于是批注写盘 600 ms 防抖期间当前篇刚全结项也能立即消失；`MarginRail.tsx` 传 `annotations.length > 0 && !hasUnclosedReview(annotations)`，空态文案改「还没有在审的文件：有未结项的批注才会出现在这里。」；`reviewFiles.test.ts` 17→**20 条**。行文案仍是 `open N · 共 M 条`（N 只数 open）。
- 门禁与验收：首屏门 gzip **315,153 B**（plan 315,149±100 内、+4；`--max 315250` PASS、余 97、距硬线 4,847）；常驻 `MarginRail` chunk gzip **6,717 → 6,762**（+45，≤6,880）；真实首载 **321,915 B**（超硬线 1,915，**B-229 仍 open**、本批只记）。`npm test` **61 文件 868 条 0 fail**（865→868）。tester 独立（未读 `impl.md`）静态：`annotations.length === 0` 1→**0**、`hasUnclosedReview` 0→**4 行**（2 文件×2）、`liveClosed` 0→**3 行**、diffstat 只 3 个源文件；单测 **20/20**；自写 E2E `.tmp/r105-tester-e2e.mjs` **33/33**、0 pageerror（ego CDP 57270、1440×900、假 FSA）：a.md 改 open→resolved 后 **110 ms** 开面板行不在而磁盘仍 `open 1 · 共 2`（证第三参），停 1,800 ms 仍不在、冲刷后磁盘 0 open；b.md 仅 in-progress → `open 0 · 共 1 条`；f.md 改 open 后行仍在 `open 0 · 共 2 条`；c.md `1 · 共 3` → 不在 → 改回在；第二工作区（1 resolved + 1 wont-fix）0 行且新空态文案逐字；排序/`aria-current`/Esc/关闭钮/背板/1024 无横溢不波及。回归 r101 **原样 57/57**（含 50 行截断门）、r103 **原样 19/19**（跑完还原 `shots/round-101/`、`shots/round-103/`）。截图 `shots/round-105/review-closed-tester.png`。见 `docs/iteration/round-105/test.md`。

**第 104 轮（同一未发版区间）**

- 「生成批注」把输入的那句留在对话记录里（A1，P2，B-232，用户 2026-11-20 队列「对话区」缺陷）：`src/components/MarginRail.tsx` 的 `generateNotes()` 在清空输入前 `setTurns((previous) => pushTurn(previous, 'user', instruction))`——这句只作分析偏好、不进对话请求，但 Key 错/正文太短等早退后读者还能照着它重来；贴底 effect deps 改 `[turns, railTab]` 且非对话页签直接 return（生成时面板 hidden，scrollHeight 恒 0），切回对话仍贴底。`git diff --stat` 只此一个源文件（8+/2−）。
- 门禁与验收：首屏门 gzip **315,149 B**（plan 315,151 ±100 内；`--max 320000` PASS、余硬线 4,851）；常驻 `MarginRail` chunk gzip **6,700 → 6,717**（+17，≤6,850）；真实首载 **321,866 B**（超硬线 1,866，B-229 仍 open、本批只记）。`npm test` **61 文件 865 条 0 fail**；tester 独立（未读 `impl.md`）静态：形态门 `pushTurn(..., 'user', instruction)` HEAD **0 → 1**、单文件 `pushTurn` **2 → 3**；自写 E2E `.tmp/r104-tester-indep.mjs` **25/25**、0 pageerror（ego CDP 57270、1440×900、假 FSA + 假 SSE）：生成后切回对话 3 条、末条逐字等于指令、助理仍 1 条、输入空、两钮 disabled、生成这一步 `/chat/completions` 只 +1（没多发对话请求）、焦点仍落 `#rail-tab-notes`；401 后指令仍可找回；页签往返/新对话/换文档清空正确；3 卡间隔仍 12±2。交付 A2 脚本现场复跑 40/40。回归 `r96` **42/42**、`r103` **19/19**（跑完还原 `shots/round-103/`）。已知边界：留下的 user turn 无回复标记，交 B-233。见 `docs/iteration/round-104/test.md`。

**第 103 轮（同一未发版区间）**

- 在审列表当前篇那行的 open/total 改以内存为准（A1，P2，第 102 轮 findings-bug F2）：`src/lib/reviewFiles.ts` 加 `countOpenAnnotations`（`collectReviewFiles` 共用同一口径）与 `applyLiveReviewRow(result, live)`（`live` 为 null 或 `total===0` 原样返回；否则按 path 替换或补行、`compareRows` 重排、超 50 行截断并保持 `truncated`）；`MarginRail.tsx` 在渲染时用 `activePath` + 内存 `annotations` 造当前篇行合并进磁盘扫描结果，批注写盘 600 ms 防抖期间、面板开着不重扫时也显示这一刻真值；空态分支改判合并后的行（plan-review CR-2）。`reviewFiles.test.ts` 13→**17 条**。
- 门禁与验收：首屏门 gzip **315,151 B**（plan 315,155 ±100 内；`--max 320000` PASS、余硬线 4,849）；常驻 `MarginRail` chunk gzip **6,573 → 6,700**（+127，≤6,980）；真实首载 **321,851 B**（超硬线 1,851，B-229 仍 open、本批只记）。`npm test` **61 文件 865 条 0 fail**；tester 独立（未读 `impl.md`）交付 A2 脚本 19/19、自写 E2E `.tmp/r103-tester-e2e.mjs` **26/26**、0 pageerror（ego CDP 57270、1440×900、假 FSA）：改档后 150 ms 面板 `open 0 · 共 2 条` 停 1.8 s 同值、S2 `open 1 · 共 3 条`、磁盘无档时新篇行已出现（内存补行）、当前篇只一行且按 open 重排、当前行 `aria-current`、邻篇不动；真 HEAD 版代码对照同场景仍 `open 1 · 共 2 条`（269 ms）。回归 `.tmp/e2e-r101-review.mjs` **57/57**（跑完还原 `shots/round-101/`）；未跑 roundtrip（未碰编辑器/序列化）。见 `docs/iteration/round-103/test.md`。

**第 102 轮（同一未发版区间）**

- 对话→批注切页签的焦点交接（A1，B-230，用户 2026-11-20 队列第 3 条的副产物）：`src/components/MarginRail.tsx` 加 `lastTabRef`（上一渲染页签）与 `useEffect([railTab])`——只认「对话 → 批注」这一路，且焦点已丢（`body`/null）或在被收起的 `#rail-panel-chat` 内才接管，rAF 把焦点交给 `#rail-tab-notes`；正文、页签自身与其他控件的焦点一律不动（合成点击生成批注时焦点留在 `.ProseMirror`），不给首张卡。不可达的 `panel.contains` 旧分支已删（`panel.contains` 0 命中），守卫按计划审查 CR-5 反向写成 `chatEl?.contains`。无新 import、无新依赖。
- 门禁与验收：首屏门 gzip **315,155 B**（净 **+9 B**，只来自入口 chunk 里懒 chunk 哈希变化；`--max 315200` exit 0、余 45）；常驻 `MarginRail` 懒 chunk gzip **6,489 → 6,573**（+84，≤6,760）；真实首载 **321,728 B**（超硬线 1,728，B-229 仍 open、按本轮新门重算）。`npm test` **61 文件 861 条 0 fail**；tester 独立（未读 `impl.md`）自写 E2E `.tmp/r102-tester-focus.mjs` **25/25**、0 pageerror（ego CDP 57270、1440×900、假 FSA）：键盘/鼠标两路 200/1,800 ms 焦点都在 `#rail-tab-notes` 且对话面板 hidden、批注面板可见；CR-1 合成点击两次采样焦点仍在 `.ProseMirror`；4 条反向回归全过；Tab 不落 `.stats-trigger`（文档开头选区 1/1 时落 skip-link 是既有 `App.tsx:5886` 守卫，与本次改动无关；光标在中段时落 `.rail-goal-retry`）。回归 `keyboard-acceptance` **52/52**；未跑 roundtrip（未碰编辑器/序列化）。截图 `shots/round-102/focus-after-generate.png`。见 `docs/iteration/round-102/test.md`。

**第 101 轮（同一未发版区间）**

- 在审文件列表数据层（A1，B-228，用户 2026-11-20 队列第 8 条）：新 `src/lib/reviewFiles.ts`——`collectReviewFiles(workspace, files, {maxFiles=200,maxRows=50})` 只读扫描每篇的 `.sidelight/annotations/<cacheKey>.json`，返回 `{rows:[{path,name,open,total}], scanned, capped, truncated}`；在审 = 有批注档且 `annotations` 非空（只有 notes 不入列），open 只算 `reviewStatusOf === 'open'`（旧档走 `legacyReviewStatus` 迁移），其余三档只进 total；`parentDirectory` 拿不到或抛错、坏档都跳过该文件，绝不 create / write；同目录只解析一次；open 降序、同数 path 升序（码点序）；超 maxFiles 置 `capped`、超 maxRows 置 `truncated`。`reviewFiles.test.ts` **13 条**挂 `npm test` 链尾（60→**61 文件**、848→**861 条**）。
- 接线（A2）：`MarginRail.tsx` 的 `.rail-head` 末尾加 16px「在审」入口（仅批注页签、`aria-haspopup="dialog"`；位置靠 `.rail-diff-open ~ .rail-review-open{margin-left:0}`，不用 `.rail-count ~`），`createPortal` 只读面板复用 diff 外壳（`rail-diff-overlay rail-review-overlay` + `rail-diff-sheet[role=dialog][aria-modal]`、`aria-labelledby="rail-review-title"`），行复用 `ul.rail-diff-rows` 内的 `li > button.rail-review-row`（relativePath + `open N · 共 M 条` + `aria-current`），提示四支（无工作区 / 无批注 / capped / truncated）与 busy「正在读…」；Esc 在 document 层 `stopPropagation`，关闭钮 + 背板 + `useDialogFocus`；`App.tsx` 只加 `getReviewWorkspace` / `activePath` / `onOpenReviewFile`（同篇短路，不重载）；`styles.css` 只加 4 组新规则（`.rail-review-row` 3 组 + 兄弟 margin 1 组），`.rail-review-open` 并入 `.rail-diff-open` 块；`scripts/measure-first-screen.mjs:8-9` 的 chunk 注释 2,327 → **6,489**（第 100 轮 5,593）。
- 门禁与验收：首屏门 gzip **315,146 B**（基线 315,022，净 **+124 B**、距硬线 320,000 余 4,854；`--max 316000` exit 0）；常驻 `MarginRail` 懒 chunk gzip **5,593 → 6,489**（+896，门槛 5,593+1,500 内），真实首载 **321,635 B**（超硬线 1,635 B、比改前 320,615 +1,020）——口径问题记 **B-229** 交 lead。executor 自验（本轮 A3 并入执行批）：自写 `.tmp/e2e-r101-review.mjs`（ego CDP 57270、1440×900、假 FSA）**57/57**、0 pageerror（`.tmp/r101-e2e-review.json`）：入口/面板语义、2 行（a open 2 / 共 3、sub/b open 1 / 共 2）、当前行 `aria-current`、点行切文档 parse +1、点当前行 parse 不变、三路关闭 + 焦点还原 + `[inert]`、⑭ 有/无 `.rail-count` 在审右缘 = head 右缘（1286/1286、1291/1291）且两钮间距 7、注入错误规则后「对比」被挤左 99.6 px、⑮ 51 篇 → 50 行 + truncated + 滚到底末行完整 + sheet 655.8 ≤ 720、1024 抽屉无横溢、两种空态；回归 `.tmp/e2e-r97-a1-status.mjs` **44/44**、`.tmp/e2e-r100-diff.mjs` **43/43**；`npm test` **61 文件 861 条 0 fail**。未跑 roundtrip（只改 `MarginRail` / `App` 接线 / CSS，未碰编辑器与序列化）。tester 第 101 轮独立验收（未读 `impl.md`）：自写数据层探针 **6/6**（旧档迁移 / notes-only / `parentDirectory` 抛错 / 201 篇 capped / 同目录一次 / open 降序）、自写 E2E **44/44**、0 pageerror（ego CDP 57270，1440×900 与 1024×700；⑭ 无 / 有 `.rail-count` 在审右缘 delta **0**、两钮间距 **7**、强制 `margin-left:auto` 对照「对比」左移 **84.3 px**；⑮ 51 篇 → 50 行 + truncated + 滚到底末行完整 + sheet 655.8 ≤ 720），回归 `.tmp/e2e-r97-a1-status.mjs` **44/44** + `.tmp/e2e-r100-diff.mjs` **43/43**；`npm test` **61 文件 861 条 0 fail**、`verify` gzip **315,146 B**、`--max 316000` PASS；判 **PASS**。见 `docs/iteration/round-101/test.md`。

**第 100 轮（同一未发版区间）**

- 行差对比纯函数（A1，B-227，用户 2026-11-20 队列第 7 条）：新 `src/lib/diffView.ts`——`diffView(before, after, {context=2,maxRows=400,maxLine=500})` 只调 `diff.ts` 的 `diffLines`，返回 `{rows, added, removed, truncated}`；每处改动前后各留 context 行、重叠窗口合并、同一行只出一次；`added`/`removed` 始终按全文算；单行超 maxLine 截到 500 字 +「…」；超 maxRows 只留前段并置 `truncated`；>4,000 行走 `diff.ts` 粗粒度分支。`diffView.test.ts` **14 条**挂 `npm test` 链尾（59→**60 文件**、834→**848 条**）。未改 `diff.ts`、不加依赖。
- 接线（A2）：`MarginRail.tsx` 的 `.rail-head` 末尾加 16px 高「对比」入口（仅批注页签、`aria-haspopup="dialog"`），`createPortal` 只读面板 `.rail-diff-overlay` + `.rail-diff-sheet[role=dialog][aria-modal]`（`+added −removed 行`、`li.rail-diff-row.is-same|.is-added|.is-removed`、三支空态、Esc/关闭钮/背板关闭、`useDialogFocus` 还原焦点）；`App.tsx` 只加 `openedBaselineRef`（载入/新建时写、保存与自动保存不动）与 `getDiff` prop；`styles.css` 只追加 `.rail-diff-*`（**13 组**），不动 `.rail-head`/`.rail-tabs` 规则块。
- 门禁与验收：首屏 gzip **315,022 B**（planner 314,726 → 净 **+296 B**，距硬线 320,000 余 4,978；`--max 315500` exit 0）。tester 独立（未读 `impl.md`）自写 `.tmp/e2e-r100-diff.mjs`（ego CDP 57270、1440×900、假 FSA、默认 `autoSave:true`）**43/43**、0 pageerror：改动后面板 **+3 −1**（removed 1 / added 3 / same 4）、0 可编辑控件、三封闭合路径 + 焦点回入口 + `[inert]` 0、自动保存后不清零、重开文件空态、开/关 0 解析/0 写盘、1440/1024 无横溢、三主题对比度 5.11–7.67、1 MB 面板 rows **400** + 截断提示（耗时 93 ms 只记录）；回归 `.tmp/e2e-r97-a1-status.mjs` **44/44**、`.tmp/r98-tester-agent.mjs` **38/38**；`npm test` 60 文件 848 条 0 fail。见 `docs/iteration/round-100/test.md`。

**第 99 轮（同一未发版区间）**

- 修订快照（A1，B-226，用户 2026-11-20 队列第 6 条）：新 `src/lib/revisions.ts`——`revisionDigest` 对 `key\0` + LF 正文算 FNV-1a 得 8 位 id；`buildRevision` 只存 `{v:1,id,key,savedAt,bytes,annotations,notes}`、**不存正文**，`bytes` 按写盘文本的 UTF-8 字节算；`parseRevision` 坏 JSON / `v!==1` / 缺 id 回 null 且批注走 `parseAnnotationStore` 归一；`migrationOf` 用公共前后缀夹出单点编辑（含换行、>512 字、尺寸差≠delta、前缀位置不等一律 null）；`migrateAnnotations` 平移后丢出界与「起点被删」；`pruneRevisions` 同键留最近 8 份、`keep` 必留；`writeRevision` 同 id 幂等、写完清旧、错误全吞。`revisions.test.ts` **24 条**挂 `npm test` 链尾（58→**59 文件**、810→**834 条**）。
- 接线（A2）：`App.tsx` 加 `docNotesRef` 与 `recordRevision`（先同步拍批注快照，再挂 `performCommit` 的成功分支；digest 用 LF 规范形、bytes 用真正写盘的文本），`applySource` 在 `setMarkdown` 前后拍文本索引与 `content.size`，引文重定位失配时按单点编辑迁移批注、平不动才丢（`annotations.ts` 未改）。
- 门禁与验收：首屏 gzip **314,726 B**（净 **+838 B**，距硬线 320,000 余 5,274；`--max 315500` exit 0）；tester 独立（未读 `impl.md`）自写 `.tmp/r99-tester-a.mjs`（ego CDP 57270、1440×900、独立假 FSA）**32/32**、0 pageerror：S1 保存前 0 write → 1 个 7 字段无正文 json（`v 1`/`key a`/`bytes 73`=磁盘/quote 同卡片）、无改动再存「没有改动，未写入。」仍 1 个；S2 `from/to` 1/23→**2/24** 且 `.annot` 盖引文、同长替换不变、删整段（含换行）`.note`/`.annot` 归 0；S3 连存 10 次该 key **8 份**；回归 `.tmp/r98-tester-agent.mjs` **38/38**、`.tmp/e2e-r97-a1-status.mjs` **44/44**；`npm test` 59 文件 834 条 0 fail。见 `docs/iteration/round-99/test.md`。

**第 98 轮（同一未发版区间）**

- 批注线程里的助手回复统一带 `[AGENT]` 前缀（A1，B-225，用户 2026-11-20 队列第 5 条）：`src/lib/annotations.ts` 加 `AGENT_PREFIX = '[AGENT]'`、`agentReply`（`trim()` 后空白回 `''`、已带前缀原样返回——幂等、其余补一次前缀）、`threadText`（显示层再规范一次：assistant 走 `agentReply`、user 原样）、`REPLY_REVIEW_STATUS` 与 `reviewStatusOnReply`（四态逐档都回 `in-progress`，缺失/非法值先归一成 open 再查表）。规则与 Review Mode 的 `[AGENT]` 约定一致；`annotations.test.ts` 34→**37 条**（前缀幂等/空白回空/显示层 user 原样、四态与非法值、带 thread 与 in-progress 的 store 往返 `deepEqual`）。
- 接线（A2）：`MarginRail.tsx:361` 的线程块改 `<InlineText text={threadText(turn)} />`（空文本仍走 `.thread-typing` 的「…」，不加前缀）；`App.tsx` 的 `discuss` 在 `await streamChat(...)` 成功后、`catch` 前补一次 `setAnnotations`——只处理 `item.id === id`、末条必须是非空的 assistant，写 `agentReply(last.text)` 并把四态转 `reviewStatusOnReply(item.reviewStatus)`；失败/中断不进这一支，纯空白回复不改文本也不改状态（critic CR-2）。**不改 `ai.ts`**：`streamChat` 同时服务「对话」页签，普通聊天不该出现 `[AGENT]`（A3 场景 5 已验）。`discuss` 依赖数组未动，`refine` 仍走 `discuss`，`styles.css` 与 `select.note-status` 逐字未动。
- 门禁：首屏 gzip **313,888 B**（基线 313,688，净 **+200 B**；超内部预算 310,000 3,888 B 只 WARN、硬线 320,000 内余 6,112 B、`--max 315000` exit 0，raw 1,017,238）；`npm test` **58 文件 810 条 0 fail**（807→810）；未改编辑器与序列化，不跑 roundtrip。见 `docs/iteration/round-98/impl.md`。
- E2E（A3，executor 自写 `.tmp/e2e-r98-a1-agent.mjs`，ego 浏览器 CDP 57270、1440×900，**36/36**、0 pageerror，`.tmp/r98-a1-agent.json`）：3 卡全 open 且无线程；第 1 卡追问后 `.thread-user` 1 条无前缀、`.thread-assistant` 1 条以 `[AGENT] ` 开头且含「模拟回复」、`.thread` 内 `[AGENT]` 恰 1 次、状态 `in-progress`、无残留「…」；1,700 ms 后 store 该条 `reviewStatus=in-progress`、`thread[1]` 带前缀、`thread[0]` 仍是 user；再追问 4 条线程、2 条 assistant 各恰 1 个前缀、「[AGENT] [AGENT]」0 次、store 无空回复；切 `other.md` 再回线程 4 条/前缀 2 次/状态 `in-progress` 都在；第 2/3 卡无线程仍 open、对话页签模拟回复不含 `[AGENT]`、`.margin-rail` 与 `.doc-scroll` 横溢 0、3 卡不重叠且带线程的卡更高；截图 `shots/round-98/agent-thread.png`。
- tester 独立验收（第 98 轮，未读 `impl.md`）：静态 `AGENT_PREFIX|agentReply|threadText|reviewStatusOnReply` 在轮前 `8733899` **0 行** → **33 行**、`[AGENT]` 0 → **13 行**；`annotations.test.ts` **37/37**；自写探针 `.tmp/r98-tester-probe.ts` **6/6**、自写 E2E `.tmp/r98-tester-agent.mjs`（ego CDP 57270）**38/38**、0 pageerror——除交付的 36 项外另验 `resolved → in-progress`（`is-closed` 消失、正文高亮回来）与「空文本占位仍走 `.thread-typing`」；门禁复跑 `npm test` **58 文件 810 条 0 fail**、`verify` gzip **313,888 B（PASS）**、`--max 315000` exit 0、`changelog.test.ts` 3/3；回归 `.tmp/e2e-r97-a1-status.mjs` **44/44**。见 `docs/iteration/round-98/test.md`。

**第 97 轮（同一未发版区间）**

- 批注四态复核状态（A1+A2，B-224，用户 2026-11-20 队列第 4 条）：`src/lib/annotations.ts` 加 `REVIEW_STATUSES`（open / in-progress / resolved / wont-fix）、`REVIEW_STATUS_LABELS`（Open / In progress / Resolved / Won't fix）、`normalizeReviewStatus`（非法与缺字段回 open）、迁移表 `legacyReviewStatus`（pending→open、accepted→resolved、dismissed→wont-fix）、`reviewStatusOf`（旧档按内部 status 迁移、合法字段优先）、`isClosedReview`、`marksBody`（内部仍 pending 且四态没结项）。`Annotation.reviewStatus` 必填；`resolveAnnotations` 恒写 open；`parseAnnotationStore` 两条分支（旧数组与 `{v:2}`）逐条归一，`status` 原值不变、版本仍 2、不删旧字段；`replaceInWindow` 让结项条目整条保留（重跑不冲掉用户的结项判断）、同键重跑连同 `reviewStatus` 一起复用旧 id，并按 merged 认领的 id 去重——不加这一步时结项条目会同时落进 `kept` 与 `merged`，同 id 两份叠在同一个 top 上（页边卡片与正文高亮都以 id 为键）。`annotations.test.ts` 28→**34 条**。
- 四态接线：`MarginRail.tsx` 卡头在紧急度之后加 `select.note-status`（`note-status-<四态>`、`value={reviewStatusOf(annotation)}`、`aria-label="第 N 处状态"`、click `stopPropagation`），结项卡加 `is-closed` 画虚线；`App.tsx` 加 `setReviewStatus`（只换标记，条目留在栏里）并接线；`decorations.ts` 的正文高亮改按 `marksBody` 判（resolved / wont-fix 不再画 `.annot`，卡片留在页边可改回）；`styles.css` 加 `.note-status` 与 in-progress / resolved 两档配色（沿用已上线的 `--mark`/`--mark-wash`、`--accent-ink`/`--accent-wash` 两对，不新增配色对）、`.note.is-closed` 虚线、`.note-head` gap 8→6 与换行兜底；`themes.test.ts` 加四态 × 三主题 **12 对**对比度门。
- 卡头宽度（A3-6b 实测）：两枚下拉按最长选项撑开（紧急度 70、状态 86 px），加「模拟」徽标后整行 305.7 > 内容宽 294 px 会换行成两排（头高 44 px、卡片长高把末卡压到整体评价面板下面）。改成 gap 8→6，并在没配 Key 的模拟态用 `.note.is-simulated .note-index{display:none}` 收起序号（序号本来就在卡片 `aria-label` 与卡片顺序里），正式态序号照常显示；两种情形卡头都单行 24 px。
- 两套关闭语义定案（P2-2）：四态只是标记，「采纳 / 忽略 / 知道了」行为不变——「采纳」仍替换落正文并让条目出栏（四态随条目消失，属预期），「忽略 / 知道了」只出栏、不落正文。旧档 accepted / dismissed 迁移后不出卡：`MarginRail.tsx:99` 与 `App.tsx:2430/2445` 的 `status === 'pending'` 过滤本轮不动（本轮新造的两态内部仍是 pending，照常出卡）。
- 门禁：首屏 gzip **313,688 B**（批头 313,360，净 **+328 B**；超内部预算 310,000 3,688 B 只 WARN、硬线 320,000 内余 6,312 B、`--max 315000` exit 0）；`npm test` **58 文件 807 条 0 fail**（800→807：annotations +6、themes +1）；未改编辑器与序列化，不跑 roundtrip。见 `docs/iteration/round-97/impl.md`。
- E2E（A3，executor 自写 `.tmp/e2e-r97-a1-status.mjs`，ego 浏览器 CDP 57270、1440×900，**44/44**、0 pageerror）：旧档迁移后 `.note` 恰 1 张、其 select 是 open，1,600 ms 后 store 三条 open/resolved/wont-fix 且 status 仍是 pending/accepted/dismissed、id 不变；四态 select 每卡 1 个、默认 open、文案与 `aria-label` 对齐、卡名不含状态；逐档切换值/class/底色跟着变，resolved 与 wont-fix 时正文引文字符数 56→34（不再含该条引文）、open 与 in-progress 复原到基线，结项卡 `border-style` 含 dashed 且仍有 3 卡；三条各一态落盘、切走切回保留、正文只剩第 2 条引文；再分析不翻倍、三条 id 与重跑前一致；几何栏宽 320、`.margin-rail`/`.doc-scroll` 无横溢、3 卡不重叠、末卡底 611.5 ≤ 整体评价顶 623.8、`.note-head` 单行 24 px；结项卡点「采纳」后正文含 replacement、卡 3→2、store 2 条、`.note.is-closed` 0。
- tester 独立验收（未读 `impl.md`）：自写数据层探针 8/8（迁移表 / 两条 parse 分支 / 四态往返 / 真值表 6 行 / `replaceInWindow` 去重后 ids 唯一）、本机前台重跑 A3 E2E **44/44**、0 pageerror（ego CDP 57270、1440×900）；静态门 `40b651f` 0 行 → 39 行（对照 `normalizePriority` 8）、`note-status` 0→3 文件、`onSetReviewStatus` 0→4；`MarginRail.tsx` 与 `App.tsx` 的 pending 过滤逐字未动。偏差（不判 FAIL）：`themes.test.ts` 另加 12 对对比度门（807 而非 806）；`.note.is-simulated .note-index{display:none}` 取代计划的「无条件藏序号」；交付 E2E 场景 4 的正向断言取到空引文（实质由负向与截图复核）。详见 `docs/iteration/round-97/test.md`。

**第 96 轮（同一未发版区间）**

- 对话页签（A1，B-223，用户 2026-11-20 队列第 3 条）：新 `src/lib/chat.ts` 放纯逻辑——`chatContextOf`（去首尾空白、超 2000 字截断留省略号、空文档回 `''`）、`buildChatMessages`（system + 最近 12 轮，切片首条是 assistant 就整段丢到第一个 user）、`pushTurn`（同角色也各占一条）、`appendDelta`（只补末条 assistant，无可补时原样返回）、`CHAT_SYSTEM_PROMPT`（短、不编造、指向「生成批注」，正文只采纳才变）；`chat.test.ts` **12 条**挂 `npm test` 链尾（57→58 文件）。`MarginRail.tsx` 的对话面板换成真界面：`.rail-chat-head` + 「新对话」、`.rail-chat-log[role="log"][aria-live="polite"]`、`.rail-chat-turn.is-user` / `.is-assistant`（空助手 + busy 显「…」）、`.rail-chat-empty`、`.rail-chat-mock`、`.rail-chat-error`、`textarea.rail-chat-input`（`rows=2`、Enter 发送 / Shift+Enter 换行、组合输入中的回车不发送）+「发送」+「生成批注」；`streamChat` 直连、`AbortController` 换文档 / 新对话 / 卸载都中断，换文档（`docName`）清空对话；`styles.css` 补样式并把 `.rail-chat-compose input` 改 `textarea`（输入占一行、两钮在下一行）。
- 「生成批注」把对话里的那句话接进批注请求（A2，B-223）：`src/lib/ai.ts` 新 `annotationMessages(context, settings, mode, instruction?)`——指令去空白后顶替 `settings.userPrompt` 槽（槽位标签仍是「作者偏好与检查重点：」，`prompt.ts` 不动），空白 / 缺省 / 非字符串回落作者偏好；`StreamOptions.instruction` 经 `streamAnnotations` 传到 `remoteStream`，全文总评那次不传；`App.tsx` 的 `runAnalysis(instruction?)` 与 `runOne` 透传指令，`.analyze-button` 与 `.analyze-bubble` 两处 `onClick` 改成 `() => void runAnalysis()`（裸引用会把事件对象当指令）；`MarginRail` 的「生成批注」先切回「批注」页签再跑，`canGenerate` 只在编辑视图为真、`analyzing` 时禁用；`prompt.test.ts` 8→**10** 条。
- 门禁：首屏 gzip **313,360 B**（基线 313,086，净 **+274 B**；超内部预算 310,000 3,360 B 只 WARN、硬线 320,000 内余 6,640 B；`node scripts/measure-first-screen.mjs --max 314500` exit 0）；`npm test` **58 文件 800 条 0 fail**；未改编辑器/序列化不跑 roundtrip。见 `docs/iteration/round-96/impl.md`。
- tester 第 96 轮独立验收（未读 `impl.md`；ego 浏览器 CDP 57270，自写 `.tmp/r96-tester-a1a2.mjs` **42/42**、0 pageerror）：对话 a–h 全过（空态/可聚焦/空输入 disabled、Enter 626 ms 出「（模拟回复）」且焦点回输入框、切页签保留 2 条、Shift+Enter 换行、自写 SSE 两段拼接与 401「API Key 无效」、mock 提示 1/0、「新对话」清空、换文档 turn 0）；几何 3 卡 [146,318]/[330,482]/[494,664] 不重叠、栏宽 320、`.doc-scroll` 横溢 0、1024×700 抽屉可用；「生成批注」指令逐字进 `messages[1]` 且不含 `userPrompt`、自动切批注且 `.note` 1、`.analyze-button` 反之、空输入两钮 disabled、源码态 disabled。门禁 `npm test` 58/800、`verify` 与 `--max 314500` gzip 313,360（raw 1,015,562、距 314,500 余 1,140）；回归 `keyboard-acceptance` 52/52。见 `docs/iteration/round-96/test.md`。

**第 95 轮（同一未发版区间）**

- 批注五档紧急度（B-222，用户 2026-11-20 队列第 2 条）：`src/lib/annotations.ts` 加 `ANNOTATION_PRIORITIES`（none/low/medium/high/urgent）、`ANNOTATION_PRIORITY_LABELS`（`-`/Low/Medium/High/Urgent）与 `normalizePriority`；`Annotation.priority` 必填 + `priorityManual?: true`，`ParsedAnnotation.priority?`（缺省 / `p0` / 数字 / 大写一律不写字段），`resolveAnnotations` 与 `parseAnnotationStore`（旧数组与 `{v:2}` 两分支）逐条归一成 none、条数与既有字段不变；`replaceInWindow` 加 `reuse` 可复用池，`priorityManual` 条目的档位与标记跟着旧 id 一起保留；`App.tsx` 用窗口开始前的 `annotationsRef` 快照当池（同窗口第 2/3 条重跑 id 不再变）+ `setPriority`（卡头改档打 `priorityManual`）；`MarginRail.tsx` 的 `.note-head` 加五档原生 `<select class="note-priority">`（`aria-label="第 N 处紧急度"`、click `stopPropagation`）；`styles.css` 5 块配色（none 走基础规则）+ `themes.test.ts` 三主题 15 对对比度门（min 4.58）；`prompt.ts` 加 priority 规则行与两条不同档位的 JSONL 示例。
- 门禁：首屏 gzip **313,086 B**（基线 312,566，净 +520 B；超内部预算 310,000 3,086 B 只 WARN、硬线 320,000 内余 6,914 B）；`npm test` **57 文件 786 条 0 fail**；未改编辑器/序列化不跑 roundtrip。见 `docs/iteration/round-95/impl.md`。
- tester 第 95 轮独立验收（未读 `impl.md`；ego 浏览器 CDP 57270，自写探针 `.tmp/r95-tester-a1.ts` **8/8**、E2E `.tmp/r95-tester-a2.mjs` **37/37**、0 pageerror）：五档逐档一致、缺字段/`p0`/数字 → none 且条目在、旧档两分支逐项相等、序列化往返、`replaceInWindow` 手改 urgent 保留（连跑两次）而模型 high 生效、prompt 981 字；每卡 1 select、五档底色互异、urgent 无横溢且卡不重叠、Tab 落 select 且焦点环 2px solid、三击段落后改档/Enter 不改选区、落盘含 `"priority":"urgent"`、切走切回与重跑仍保留且 3 条 id 未变；自算三主题 15 对对比度 **4.58–7.67**；回归 `theme-acceptance` **27/27**。见 `docs/iteration/round-95/test.md`。

**第 94 轮（同一未发版区间）**

- 右侧双页签「对话 / 批注」（A1，B-221，用户 2026-11-20 队列第 1 条）：`src/components/MarginRail.tsx` 的 `.rail-head` 后加 `div.rail-tabs[role="tablist"][aria-label="侧灯页签"]` 与 2 个 `role="tab"`（`aria-selected`、`aria-controls`、roving `tabIndex`、`is-active`；←/→/Home/End 换选并 rAF 聚焦），现有批注内容（我的理解/提示/卡/spacer/整体评价）包进 `div#rail-panel-notes[role="tabpanel"]`（`hidden` 切换、不加 position/overflow，卡片仍参照 `.margin-rail`），新增 `div#rail-panel-chat`：空态 + 1 个禁用 `input` + 1 个禁用「发送」按钮（对话/消息/生成批注下一批接入）；`src/App.tsx` 加 `railTab` 状态（默认「批注」），布局 effect 在 `railTab === 'chat'` 时跳过排布，chrome 底（`.rail-head`/`.rail-tabs`）先进 `flowBottom`、去掉硬底 40；`src/styles.css` 把 `.doc-layout` 右列 260→**320px** 并加页签与对话占位样式。
- 门禁：首屏 gzip **312,566 B**（基线 312,423，净 +143 B；超内部预算 310,000 2,566 B 只 WARN、硬线 320,000 内余 7,434 B）；`npm test` **57 文件 778 条 0 fail**；未改编辑器/序列化不跑 roundtrip。见 `docs/iteration/round-94/impl.md`。
- tester 第 94 轮独立验收（未读 `impl.md`；ego 浏览器 CDP 57270，自写 `.tmp/r94-tester-a1a2.mjs` **38/38**、0 pageerror）：静态 `role="tablist"` 1（HEAD 0）、`railTab|rail-panel-*` 16（HEAD 0）；页签 2 个、默认「批注」、chat `hidden`、←/→/Home/End 选中+焦点同步、对话面板 input/button 各 1 且 disabled、Tab 不落；3 卡 `top = max(natural, 上卡底+12)` ±1（146/304/480，首卡 ≥ 页签底 58+2）、3 卡递增不重叠、中心 `elementFromPoint` 命中、切页签往返差 0 px、滚到底末卡底 626 ≤ 整体评价 638、自然位分支 254 = natural 且余 120、场景 B（假 Key + 拦 SSE 无 meta）`.rail-goal`/`.rail-notice`/`.rail-notice-mock` 0/0/0 且首卡 70 = flowBottom+12；CSS 探针 13/13（改前对照副本 = HEAD 逐字符）、1440/1120 栏宽 320 无横溢 + `.doc-column` 480、1024 抽屉 `display:none`；回归 `keyboard-acceptance` **52/52**。见 `docs/iteration/round-94/test.md`。

**第 93 轮（同一未发版区间）**

- 已存定界符对后填（B1，用户缺陷 2）：新 `src/lib/delimiterPair.ts`（照 `linkInput.ts` 同形的 `appendTransaction` 插件 + 纯判定 `collectPairs`/`commitPair`/`buildPairTransaction`）。先打一对定界符再回头填内容的写法（`$$` → ← → `E=mc^2` → →）原本永远等不到输入规则的尾锚定；现在插件记下「这次打字碰过」的区间（armed），光标离开 / Enter / 失焦三个出口把它收成 `inlineMath` / `blockMath` / `==`·`^`·`~` 三类 mark。打字中不提交；载入、粘贴/拖入、撤销重做不 arm；代码围栏与行内代码里不转；公式就地编辑中不抢事务（`mathNodeView.ts` 新导出 `isMathEditing()` 模块计数）。收尾事务 `closeHistory`，一次 `Ctrl+Z` 只回退到字面定界符。`delimiterPair.test.ts` **27 条**挂 `npm test` 链尾（56→57 文件）。
- 门禁：首屏 gzip **312,423 B**（基线 309,804，净 **+2,619 B**；超内部预算 310,000 2,423 B 只 WARN、硬线 320,000 内余 7,577 B）；`npm test` **57 文件 778 条 0 fail**；`roundtrip` rich 7/9 + source 9/9。见 `docs/iteration/round-93/impl.md`。
- tester 第 93 轮独立复验（未读 `impl.md`；CDP 9222 不可用 → ego CDP 57270，自写 `.tmp/e2e-r93-t2-b1.mjs` **27/27**、0 pageerror/console error）：① 打字中不提交、离开后 inline 1 且不选中 atom；② `a + b` 离开出口 + **一次 `Ctrl+Z` 回字面 `$a + b$`**（上一版此出口会把刚打的字一起撤光）；③ 整段 `$$x$$` → blockMath 1、原段消失；④ `==`/`^`/`~` mark 各 1；⑤ `$5 到 $` 不转；⑥ 空内容/围栏/行内代码不转、Enter/blur 出口各一步撤销；⑧ 载入不 arm、序列化字节同；⑨ 转义对不转、字节同。回归：第 92 轮 A1 粘贴脚本 **19/19**、`keyboard-acceptance` **52/52**。见 `docs/iteration/round-93/test.md`。

**第 92 轮（同一未发版区间）**

- 纯文本 Markdown 粘贴解析（A1，用户缺陷 1）：新 `src/lib/markdownPaste.ts`（`looksLikeMarkdown` 块级 7 类 / 行内 4 类信号，`$…$` 过 `isMathBody` 所以「价格 $5 到 $」不算；`pasteCandidate` 挡图片、超 200,000 字符、带 `data-pm-slice` 或真富文本；`pastePlan` 分 `inline | blocks | literal`，表格只装行内）；`App.tsx:1103` 的 `handlePaste` 图片分支之后走与打开文档同一条解析链（`escapeHtmlForParse` → `protectMathPairs` → `manager.parse` → `splitTableCellBreaks`），一次事务（`uiEvent:'paste'` + `closeHistory`，一步撤销）把节点/标记插进光标处；代码块/行内代码里与表格里的块级内容保持字面、交回 PM 默认链。`markdownPaste.test.ts` **24 条**挂 `npm test` 链尾（56 文件）。
- 门禁：首屏 gzip **310,767 B**（基线 309,804，净 **+963 B**；超内部预算 310,000 767 B 只 WARN，硬线 320,000 内余 9,233 B）；`npm test` **56 文件 0 fail**；`roundtrip` rich 7/9 + source 9/9。见 `docs/iteration/round-92/impl.md`。
- tester 第 92 轮独立验收（未读 `impl.md`；CDP 9222 不可用 → ego CDP 57270，自写 `.tmp/e2e-r92-tester-a1.mjs` **19/19**、0 pageerror/console error）：① `# 标题\n- a\n**粗体** [链接](https://e.com) \`code\`` → h1/li/strong/a/code 各 1 且无字面 `# `/`**`；② 围栏内 strong 0；③ 纯文本一句段数不变；④ `$x^2$` inline 1；⑤ `<p>**粗体**</p>` strong 1；⑥ 段中粘两段拆三段不丢原文；⑥b 列表项内粘多块 pageerror 0（列表被拆平，已记录）；⑦ `Ctrl+Z` 一次回全文。回归第 86 轮粘贴脚本副本 **30/30**。见 `docs/iteration/round-92/test.md`。

**第 91 轮（同一未发版区间）**

- 行间公式块内编辑（B1，用户反馈 #2，B-219）：`src/lib/mathNodeView.ts` 把第 90 轮的行内编辑器抽成行内/块级共用的 `createMathEditor`，新增 `SidelightBlockMath`（`BlockMath.extend({addNodeView})`）：点公式或方向键把 atom 选成 `NodeSelection` 就进编辑，`.sl-math-block-edit` = `<textarea class="sl-math-block-input">` + `.sl-math-block-preview` 实时 KaTeX（打字即重画）；块内 Enter 换行、Ctrl+S / 失焦提交、Esc 还原（新建空块删除）、首行 ↑ / 末行 ↓ 提交后把光标送出块；非编辑态仍是 `.block-math-inner` 的 KaTeX 成品，Markdown 仍写 `$$\nlatex\n$$`。`App.tsx` 删 `mathEdit` 状态与浮层渲染、`mathEditRef`/`mathAnchorRef`/`mathIsNewRef`/`finishMathEdit`，插入与 `$$`+Enter 两个入口都走 `enterMathAtRef` 进就地编辑；删 `src/components/MathInlineEditor.tsx`；`styles.css` 加块级编辑/预览样式并删 `.math-inline*` 浮层样式。
- 代码块语言标签与切换（B2，用户反馈 #3，B-220）：新 `src/lib/codeBlockLang.ts` 的 `SidelightCodeBlock`（`CodeBlock.extend({addNodeView})`，`StarterKit.configure({codeBlock:false})` + 显式注册，schema 名与 Markdown 序列化不变）：`pre.sl-code-block` 右上角 chip 显示语言（无语言写「纯文本」），上面盖一个透明原生 `<select>` 可点开切换，`setNodeMarkup` 只改该围栏的 `language`，保存首行跟着变 ```ts / ```python；`styles.css` 加 `pre{position:relative}` 与 chip 样式。
- 门禁：首屏 gzip **309,804 B**（余 196 / 10,196）；`npm test` **55 文件 727 条 0 fail**；`roundtrip` rich 7/9 + source 9/9。见 `docs/iteration/round-91/impl.md`。
- tester 第 91 轮独立验收（未读 `impl.md`；CDP 9222–9226 不可用 → ego 浏览器 CDP 57270，自写 `.tmp/e2e-r91-tester.mjs` **27/27**，前台连跑两次）：B1 块内 `.sl-math-block-input` 聚焦且值 `E=mc^2`、实时预览 tex=`E=mc^3`、全程 `.math-inline` 0；Ctrl+S 落盘只换公式且 `sl-parse-done` 4→4；Esc 还原；↓ 进块、首行 ↑/末行 ↓ 选区落到块外 `lead`/`tail` 段；`$$`+Enter→Esc 空块回基线。B2 chip 3 个（js/mermaid/纯文本）、`pre` 内上右且 chip.bottom = 首行 top、上方文字改动后 js→ts 只改该围栏且 `sl-parse-done` 不变、保存首行 ```ts、无语言→python、```js 往返逐字节。回归行内公式（第 90 轮 A1）3 条与 `keyboard-acceptance` **52/52**。见 `docs/iteration/round-91/test.md`。

**第 90 轮（同一未发版区间）**

- 行内公式就地编辑（A1，用户反馈 #1）：新 `src/lib/mathNodeView.ts` 用 `InlineMath.extend({addNodeView})` 把行内 atom 换成「成品 ↔ 输入框」两态 NodeView（非编辑态 KaTeX 直接子节点、仍写 `$latex$` 不变序列化；编辑态外层 `.is-editing`、`.sl-math-inline-edit` = `$` + `<input class="sl-math-inline-input">` + `$`；`WeakMap` 注册 `enterMathEdit(view,pos)` 供插入入口进入；Enter/失焦 `setNodeMarkup` 提交、Esc 取消（新建空 atom 删除并回写选区）、←/→ 两端提交后移出、Ctrl+S 先提交再冒泡保存；新建提交沿用进入时刻 time 与插入并为一步撤销；KaTeX 惰性加载完成时编辑框补回）。`App.tsx` 去掉旧 `Mathematics.inlineOptions.onClick` 与 editorProps 的公式拦截分支；`styles.css` 加编辑态收起 KaTeX/压掉露出 `::after` 的规则与输入框样式。
- 插入入口改走新编辑、删死代码（A2）：`openMathAtCursorRef` 对行内公式一律 `enterMathEdit`（已有公式 `{isNew:false}`、新插 atom `{isNew:true}`，进不去才退回浮层），行内插入不再 `chain().focus()`（避免下一帧 `view.focus()` 把刚打开的输入框 blur 掉）；删除 `mathDraft` 状态/监听/预览链、`MathDraftPreview.tsx` 与 `inlineOptions.onClick`；`scripts/keyboard-acceptance.mjs` 改按 `.sl-math-inline-input` 断言；新 `mathNodeView.test.ts` **3 条**挂 `npm test` 链尾（55 文件 727 条）。
- 门禁：首屏 gzip **309,470 B**（净 +396 B，余 530 / 10,530）；`npm test` **55 文件 727 条 0 fail**（基线 54/724）；`roundtrip` rich 7/9 + source 9/9。见 `docs/iteration/round-90/impl.md`。
- tester 第 90 轮独立验收（未读 `impl.md`；CDP 9222–9226 不可用 → ego 浏览器 CDP 57270，自写 `.tmp/e2e-r90-tester-a1a2.mjs`）：真机 **14/14**（A1 点开 `.sl-math-inline-input` 1 聚焦 / KaTeX none / `::after` none / `$…$` 首尾、`^2`+Enter 回渲染且焦点回正文、Esc 还原且 `sl-parse-done` 2→2、`Ctrl+S` 只改公式文本、重开无 `sl-math-reveal`；A2 工具栏/Ctrl+M/Ctrl+Shift+M 三入口、`x`+Enter 后 `Ctrl+Z` 一次回基线、Esc 删空 atom、块级浮层未坏）；回归 `keyboard-acceptance` **52/52**。见 `docs/iteration/round-90/test.md`。

**第 89 轮（同一未发版区间）**

- 自定义快捷键（A1+A2+A3，B-107）：新 `src/lib/keybindings.ts`（8 条可改命令 + `DEFAULT_KEYBINDINGS`、29 条固定键 `RESERVED_KEYBINDINGS`、`normalizeBinding` 规范成 `Ctrl+Alt+Shift+键`、`bindingFromEvent`、严格修饰全等的 `matchBinding`、冲突单路 `bindKey`（保留键 → 另一命令当前键）、`resolveKeybindings` 缺键/非法值/未知 id/撞车逐条回默认）与 `keybindings.test.ts` **26 条**挂 `npm test` 链尾；`settings.keybindings` 读时经 `resolveKeybindings`、`commitSettings` 再归一，设置结构版本仍 2。设置面板字号之后加首条 `details.settings-group`「快捷键」：8 行、点键位进入录制（Esc 取消、Backspace 回该条默认、冲突结束录制并说明理由进 `role="status"`、「全部恢复默认」），录制只由点击/Enter 进入、Tab 聚焦不进入；`:226` 的协议说明移进「接口地址」hint 腾出高度。`App.tsx` 的 window keydown 先按当前键位 `matchKeybinding` 分派 8 条命令（对话框只吞默认动作），删掉 8 条硬分支、保留 `Ctrl+H` 固定别名；`FileMenu` 的「新建/查找」提示、查找条只读提示与链接/公式提示跟着当前键位走。`settings.test.ts` 14→**19 条**。
- 真机（A3，ego CDP 54280）`.tmp/e2e-r89-a3-keybindings.mjs` **19/19**、0 pageerror / 0 console error：默认键回归 8 条全过（无工作区 `Ctrl+Shift+F` 出「先打开文件夹」toast、有工作区出全局搜索；`Ctrl+F`/`Ctrl+P`/`Ctrl+/`/`Ctrl+Shift+P` 各出目标并按回；`Ctrl+Alt+N` 换空白新文档；`Ctrl+Alt+E` 焦点进首个 button；脏文档 `Ctrl+S` 写 1 次）。设置里把「保存」改成 `Ctrl+Alt+W` 并落盘后：新键写 1 次、旧 `Ctrl+S` 页内派发 0 写、reload 后重开文件仍新键写 1 / 旧键 0；设置开着按 `Ctrl+Alt+W` 0 写且面板不关；「保存」行 Backspace 回 `Ctrl+S` → 保存关面板 → 脏文档 `Ctrl+S` 写 1 次 → `Ctrl+Alt+W` 0 写。截图 `shots/round-89/keybindings.png`、`shots/round-89/keybindings-settings.png`。
- 设置面板溢出（A2，DOM 实测，`scrollHeight-clientHeight`）：三档改前 0 / 0 / 62 px → 改后 0 / 0 / **49 px**（1000×620 ≤64 达标；未缩 `.settings-group` 间距、未动 B-150 目标）。
- 差距表与计数（A3）：已有表加「自定义快捷键」行、缺表删该行并 `外观（2）→（1）`，表头 41/4 → **42/3**（子节 1/1/1、missRowSum 3），`建议的下一批` 改「1. 自定义主题。」，README/AGENTS 同步，BACKLOG `B-107 → fixed`（P2 open 1→0，证据行号 `:72` 校正）；`node .tmp/r58-docs-check.mjs` 42/42、3/3。
- 门禁：首屏 gzip **309,074 B**（余 10,926 / 926）；`npm test` **54 文件 724 条 0 fail**（基线 53/693）。见 `docs/iteration/round-89/impl.md`。
- tester 第 89 轮独立验收（未读 `impl.md`）：自写 `.tmp/r89-tester-e2e.mjs` **33/33**（默认 8 键、设置 UI 冲突/Esc/录制、改键后新键写 1 / 旧 `Ctrl+S` 0 写、reload 后同、设置开着 0 写、Backspace 复位）、`.tmp/r89-tester-overflow.mjs` 5/5（1000×620 改前 DOM 重建 **62** → 改后 **49** px）、`.tmp/r89-tester-structure.mjs` 5/5（3 组 details 初始闭合、8 枚键位钮 24 px、Tab 不进入录制）；`keybindings.test.ts` 26/26、`settings.test.ts` 19/19、`npm test` **54 文件 724 条 0 fail**、`npm run verify` gzip **309,074 B**、回归 `keyboard-acceptance` **52/52**；0 pageerror / console error。见 `docs/iteration/round-89/test.md`。

**第 88 轮（同一未发版区间）**

- emoji 快捷输入（A1，B-106）：新 `src/lib/emoji.ts`（`EMOJI` 恰 20 枚小表、`emojiAt` 尾锚定 `[:：]name:` 查表、`EmojiInput` 用 tiptap `InputRule` 手打即换、`closeHistory` 一步可撤销；代码围栏 / 行内代码走输入规则插件的既有守卫，未知短码 `find` 回 null 不产事务；不碰 TOC、不加依赖）。`emoji.test.ts` **10 条**挂 `npm test` 链尾（53 文件 693 条）。
- 真机（A2，ego CDP 54280）`.tmp/e2e-r88-a2-emoji.mjs` **22/22**、0 pageerror：旧文档 `你好:smile:` 追 x 后盘上只多 x、仍字面、重开仍字面；逐键 `:smile:`→😄、`:tada:`→🎉、`:nope:` 字面；`你好` 后全角 `：smile:`→😄 且无 `：smile:` 字面；保存/重开含 😄 与 🎉、无 `:smile:`，再追 y 得上次所存去尾换行 + y；`Ctrl+Z` 一次回 `:smile:` 字面；`Ctrl+E` code mark 内与围栏内 `:smile:` 字面。截图 `shots/round-88/emoji-typed.png`。
- 差距表与计数（A3）：已有表加「emoji 快捷输入」行、缺表删该行，表头 40/5 → 41/4（子节 1/1/2、missRowSum 4），README/AGENTS 同步，BACKLOG B-106 → fixed；`node .tmp/r58-docs-check.mjs` 41/41、4/4。
- 门禁：首屏 gzip **307,630 B**（余 12,370 / 2,370）；`npm test` **53 文件 693 条 0 fail**（基线 52/683）；`roundtrip` rich 7/9 + source 9/9（同第 87 轮）。见 `docs/iteration/round-88/impl.md`。
- tester 第 88 轮独立验收（未读 `impl.md`，自写 `.tmp/r88-tester-e2e.mjs`）：真机 **19/19**、0 pageerror/console error（①②③④⑤⑥⑦ 七项全过）；自跑 `emoji.test.ts` 10/10、`npm test` 53/693、`verify` 307,630 B、`roundtrip` rich 7/9 + source 9/9、回归 `keyboard-acceptance` 52/52；`node .tmp/r58-docs-check.mjs` 41/41、4/4、子节 1/1/2、missRowSum 4。见 `docs/iteration/round-88/test.md`。

**第 87 轮（同一未发版区间）**

- 图片缩放（A1+A2，B-103）：新 `src/lib/imageWidth.ts`（`imageHtmlOf` 规范形整行 `<img src alt [title] width>`、`parseImageHtml` 严格全行、`isImageHtmlLine` 剥引用/列表前缀、`clampImageWidth` 先 `Number()` 再判整数 40–2000、`imageWidthFromDrag` 夹取、`imageMarkdownOf` 无宽度退回 `![alt](src "title")`）；`assetImage.ts` 的 `ResolvingImage` 加 `renderMarkdown` 与 `.sl-image` 包裹 + 右下角手柄（pointerdown 记起点、pointermove 只改 style、pointerup 才 `setNodeMarkup`、双击手柄清宽度），`styles.css` 5 条规则；`inlineHtmlTags.ts`/`html.ts` 只在整行放行（`escapeHtmlForParse` 判行首行尾）。`imageWidth.test.ts` **24 条**挂 `npm test` 链尾；真机（ego CDP 54280，tester 自写 `.tmp/r87-tester-e2e.mjs` **21/21**、0 pageerror）：拖 +80 → 442 且规范形行、另一张仍 `![](…)`、重开 442/差 0 且再存逐字节同、双击回原文、嵌套列表 2 空格与引用 `> ` 两行规范形且重开宽 320/200、`.sl-image` 高 = img 高、老文档四形字面且字节不变、`<kbd>` 回归在。
- 差距表与计数（A3）：缺表删「内容能力（1）」与图片缩放行、已有表加「图片缩放」、表头 39/6 → 40/5，README/AGENTS 同步，BACKLOG B-103 → fixed；`node .tmp/r58-docs-check.mjs` 40/40、5/5、子节 2/1/2、missRowSum 5。
- 门禁：首屏 gzip **307,292 B**（余 12,708 / 2,708）；`npm test` **52 文件 683 条 0 fail**（基线 51/659）；`roundtrip` rich 7/9 + source 9/9（同第 86 轮）。见 `docs/iteration/round-87/test.md`。

**第 86 轮（同一未发版区间）**

- 粘贴 `==红==` / `^上^` / `~下~` 也出 mark（A1，B-215）：`src/lib/inlineSyntax.ts` 的 `SyntaxSpec` 加全局 `pasted`（守卫同 `typed`、去尾锚定、`~` 留 `(?!~)`/`(?<!~)`），新增纯函数 `pasteMatches(kind, text)`（逐对返回、每次新建 `g` 正则不留 `lastIndex`），三枚 mark 的 `addPasteRules()` 用 tiptap `markPasteRule`；围栏内（`spec.code` 提前 return）与行内代码内（excluded 守卫）不转，写回仍由 `renderMarkdown` 补定界符。`inlineSyntax.test.ts` 30→**37** 条。真机（ego CDP 54280）粘贴 `==红== 与 ^上^ 与 ~下~` → 1/1/1、`==a== 与 ==b==` → 2、四条负向 0、`~~删除线~~` → strike 1 且 `.sl-sub` 0；硬门：围栏内粘 `==红==`、行内代码内粘 `^上^` → mark 0 且 `Ctrl+S` 落盘 = 基线 + 字面（去掉这段逐字节 = 基线）。
- HTML 导出补三条行内语法样式（A2，B-216）：`src/lib/export.ts` 的 `STYLES` 加 `.sl-eq`（`#f0e0bd` / `padding:0 1px` / `border-radius:2px`，深色 `#453618`、打印回 `#f0e0bd`）与 `.sl-sup` / `.sl-sub` 五项；`export.test.ts` 27→**30** 条（三块声明 + 读 `src/styles.css` 的漂移门）。真机（拦 `createObjectURL`）：导出串三个 class 各 1、三条规则在；导出页 `.sl-eq` 背景 `rgb(240, 224, 189)`、`.sl-sup` 12.75px < body 17px、`top −6.375px`。
- 批注卡可键盘聚焦并按 Enter 跳句（A3，B-141）：新 `src/lib/noteA11y.ts`（`noteAriaLabel` = 「第 N 处 修订/评价：「引文」」，换行压空格、>20 字加省略号、空引文退回批注首句；`noteJumpKey` 只认卡片自身 Enter）＋ `MarginRail.tsx` 的 `article.note` 加 `tabIndex=0` / `role="group"` / `aria-label` / `onKeyDown`，`App.tsx` 的 `onJumpToNote` 只在编辑视图 `focus()` + `setTextSelection`；`noteA11y.test.ts` 8 条挂 test 链尾（50→51 文件）。真机：`card.focus()` 落卡、真实 Tab 落卡且焦点环 2px solid、Enter 后 activeElement=`.ProseMirror:not(.preview-pane)` 且选区 = 引文、「追问」上 Enter 不改选区、源码态 Enter 不夺 `textarea.source-editor` 焦点。
- 门禁：首屏 gzip **306,276 B**（余 3,724 / 13,724）；`npm test` **51 文件 659 条 0 fail**（基线 50/641）；`roundtrip` rich 7/9 + source 9/9（同第 84 轮）。tester 独立验收（未读 `impl.md`；CDP 9222–9226 无监听 → ego-browser CDP 54280，自写 `.tmp/r86-tester-e2e.mjs` 30/30、0 pageerror），见 `docs/iteration/round-86/test.md`。

**第 85 轮（同一未发版区间）**

- 替换后的反馈不再静默（A1，B-211）：`src/lib/findBarState.ts` 新增 `replaceNoticeText(replaced)`（>0「替换了 N 处」，否则「没有可替换的匹配」）；`src/App.tsx` 的 `replaceCurrent` 在 0 命中时提示并早退、成功后提示 1 处，`replaceEvery` 两条成功出口按命中数提示（0 命中仍由按钮 disabled 拦住）。`findBarState.test.ts` 7→**8** 条。真机（ego CDP 54280）三场景：「全部替换」3 处 →「替换了 3 处」、「替换」→「替换了 1 处」、0 命中在「替换为」框按 Enter →「没有可替换的匹配」且正文不动。
- `npm run build` 同步宿主 www（A2，B-126）：新 `scripts/host-www.mjs`（零依赖）无参镜像 dist → `host/bin/www`，先拷全部（`index.html` 最后）、全成功后才删多余，失败停在并存且警告后 exit 0；`--check` 只比 dist 侧路径与内容字节，缺/差定退出码、多余只报告，任一边缺失「跳过」exit 0。build 链尾接上该脚本；真机 `--check` exit 0（98 文件逐字节同、多余 0）。
- CHANGELOG 标题区间机械门（A3，B-140）：标题上界改到同节正文最高轮次，新增 `src/lib/changelog.test.ts` 3 条（格式 / 上界 = 正文最大轮次 / 下界 ≤ 最早轮次）挂在 `npm test` 链尾；负向把上界改回 74 → 1 红且报文给出 74 与 84。
- 门禁：首屏 gzip **306,144 B**（余 3,856 / 13,856）；`npm test` **50 文件 641 条 0 fail**；`roundtrip` 未跑（未动编辑器/序列化）。tester 自写脚本独立复验，见 `docs/iteration/round-85/test.md`。

**第 84 轮（同一未发版区间）**

- `==高亮==` / `^上标^` / `~下标~` 手打即渲染（A3，B-214）：`src/lib/inlineSyntax.ts` 的 `SyntaxSpec` 加尾锚定 `typed`（左邻负向后顾 + `~` 的 `(?!~)`/`(?<!~)` 把 `~~删除线~~` 留给 Strike），新增纯函数 `typedMatch(kind, text)`，三枚 mark 的 `addInputRules()` 用 `markInputRule`；输入规则与解析共用 `() => inlineSyntaxRef.current` 闸门，设置关着仍按字面。`inlineSyntax.test.ts` 20→**30**。真机（ego CDP 54280）空文档手打 `==红== 与 ^上^ 与 ~下~` 后 `.sl-eq/.sl-sup/.sl-sub` = 1/1/1，`Ctrl+S` 落盘逐字节 = 该行 + 换行、定界符补回。
- 手打的行内链接保存成真链接（A1，B-124）：新 `src/lib/linkInput.ts`（`typedLink` 纯判据 + `linkInputPlugin` + `LinkInput`）；收尾 `)` 被智能配对「越过」（`docChanged=false`），输入规则收不到，改用 `appendTransaction` 判「光标刚跨过收尾 `)`」，命中删定界符并加 link mark（href + title），写回由 Link 序列化补出与手打相同的字节；拒 `javascript:`/`data:`/`vbscript:`、图片、需再转义文字。`linkInput.test.ts` 16 条（含 3 负向）；新夹具 `fixtures/markdown/09-link-title.md` → roundtrip rich **7/9**、source 9/9、首存拦 1/9。真机：手打后 1 个 `<a>`（href/title 正确），`Ctrl+S` 落盘 `[乙](https://example.com "标题")\n` 无 `\[`；旧字面链接点段尾不提升、不改字节。
- 删除后的撤销入口常驻状态栏（A2，B-142）：恢复入口与单槽 toast 分开保存（`restoreEntry` + `restoreEntryRef`），纯函数 `src/lib/restoreEntry.ts` 的 `nextRestoreEntry` 管迁移（deleted 记凭据；restored/dismissed/tree-changed/workspace-changed 清掉），抽 `restoreDeleted()` 给 toast 与状态栏 `.status-restore` chip 共用（「撤销」36×24、× 24×24）；新建/重命名/开文件夹三处清入口，保存提示、打字、刷新树不清。`restoreEntry.test.ts` 10 条。真机四步：删 q.md → toast+chip 同在；打字 + `Ctrl+S` 后 toast 变「已保存」而 chip 可点；点 chip 撤销 → 树回 q.md、chip 消失、读回文件字节 = 删除前脏正文；再删 → 新建 → chip 消失。1000×620 页面横向溢出 0、chip 两钮 ≥24×24。
- 门禁：首屏 gzip **306,003 B**（余 3,997 / 13,997）；`npm test` **49 文件 637 条 0 fail**；`roundtrip` rich 7/9 + source 9/9 + 首存拦 1/9。tester 独立验收（未读 `impl.md`；CDP 9222–9226 无监听 → ego-browser CDP 54280，自写 `.tmp/r84-tester-e2e.mjs` 21/21、0 pageerror），见 `docs/iteration/round-84/test.md`。

**第 83 轮（同一未发版区间）**

- `\=` 保存后不再变成真高亮（A2，B-213）：`src/lib/inlineSyntax.ts` 加常驻 mark `eqEscaped`（`slot` 属性只防相邻 `\=\=` 并节点、不落盘；`renderHTML` → `span.sl-eq-escaped`）与只认 `\=` 的 marked 行内 tokenizer（不随开关关，序列化每枚补回 `\`）；`inlineSyntax.test.ts` 14→**20**。tester 自写探针 9/9 行字节同（`\===a===` 第二次解析 eq 仍 1、`\=\=` 不合并、`a == b` 与 `==a====b==` 不动），公式里 `\=` 不被抢。
- 删除确认框两分支共用恢复说明（A3，B-212）：新 `src/lib/deleteDialogText.ts`（`DELETE_TRASH_DIR` / `deleteDialogLead(dirty)` / `DELETE_RECOVER_TAIL`），`TreeActions.tsx` 的 `.dialog-note` 只渲染常量，干净/脏只差开头一句、恢复句逐字相同且都含「撤销」；`deleteDialogText.test.ts` 4 条；静态 `文件管理器` 1→0。
- 复核用户点名 3 条回归（A1，只读）：`mathInput` 5/5、`mathReveal` 10/10、`settings` 14/14、`mathStyle` 4/4，`src/styles.css:2137-2141` 的 `.katex-display { margin:0 auto; width:fit-content; min-width:100% }` 在位。
- 门禁：首屏 gzip **304,492 B**（余 5,508 / 15,508）；`npm test` **47 文件 601 条 0 fail**；`roundtrip` rich 6/8 + source 8/8。tester 独立验收（未读 `impl.md`；CDP 9222–9226 与 54280 无监听，单次尝试即停）：A1 单测与 CSS 静态全对、A2 探针 9/9 + 公式三例、A3 单测与静态计数全对。UNVERIFIED：用户点名 3 项、A2、A3 的浏览器读数（缺口归 tester），见 `docs/iteration/round-83/test.md`。

**第 82 轮（同一未发版区间）**

- 宿主单文件文档的相对图不再先发一次裸路径请求（A1，B-121）：`assetResolve.ts` 加 `setHostAssetMode`/`isHostAssetMode` 与纯函数 `shouldWaitAssetPaint(src, docPath, hostMode)`（宿主 `docPath` 恒空但仍要等 `/__asset`），`assetImage.ts:51` 改用它；App 抽 `markHostMode`/`hostResolver`/`workspaceResolver`，在宿主正文载入（`setMarkdown` 之前）、`hostUnavailable`、`keepDraft`、`performCommit`、`loadIntoEditor` 各出口成对置位（`src/App.tsx:1232,1301,1385,2424,3073,3174`）。真机（ego CDP 54280，stub `/__doc`+`/__asset`）：宿主流派裸 `/assets/a.png` 请求 **0**（改前 1）、`/__asset` 1、`img[src]`=`/__asset?path=…`、`naturalWidth` 1；反向工作区 `blob:` 1、裸 0；`assetResolve.test.ts` 9→**15**。
- 设置主题单选组的初始焦点与 Tab 环收口（A2，B-109）：新 `src/lib/dialogFocus.ts`（`firstTabbableIndex`/`lastTabbableIndex`），`useDialogFocus` 的初始落点与 Tab 环只算 `tabIndex >= 0` 的项、全 −1 时退回原行为（`src/components/useDialogFocus.ts:42-52,68-69`），`dialogFocus.test.ts` 5 条。真机：重开设置 **32 ms** 落 `aria-checked` radio（改前「浅色」`tabIndex=−1`）、Shift+Tab 落「保存」（改前落 BODY）、「保存」Tab 环回选中项；tester 独立换选第 4 项「暖纸」复跑同组断言 + `?`/Esc 焦点还原回归 6/6。
- 工具栏窄钮与状态栏字数钮补齐 24×24（A3，B-110）：`.toolbar-group > button` 与 `.stats-trigger` 各加 `min-width: 24px`（`src/styles.css:1616`、`:1949`）。真机两档：1440×900 空文档 11 枚按钮最小 **24×24**（改前斜体 **21.2×24**）、`.stats-trigger` **24×24**（改前 **21.77×24**）、1000×620 同且 `scrollWidth-clientWidth` 0；r79 批注卡脚本 7/7（54/42/66×24）；截图 `shots/round-82/toolbar-1000x620.png`。
- 门禁：首屏 gzip **304,307 B**（余 5,693 / 15,693）；`npm test` **46 文件 591 条 0 fail**；未动编辑器/序列化不跑 roundtrip。tester 独立验收（未读 `impl.md`；CDP 9222–9226 无监听 → ego-browser CDP 54280 真机页，自写 `.tmp/e2e-r82-tester-{indep,reg}.mjs`）：A1 13/13、A2 9/9 + 独立 16/17（唯一 FAIL 为 tester 断言写错：`Ctrl+/` 是源码模式键位）、A3 8/8 + 7/7、回归 6/6，0 pageerror。UNVERIFIED：真宿主 WebView2 内 `/__asset` 渲染（本机 INIT-FAIL，用 stub 端点验）、真实 FSA/IME/原生打印，见 `docs/iteration/round-82/test.md`。

**第 81 轮（同一未发版区间）**

- 1 MB 源码态逐键不再算全篇字数（A1，B-139）：`sourceStats` state + 300 ms 防抖 effect（`src/App.tsx:598,686-688,3806-3831`），进源码态先算 1 次、≤20 KB 立即算、退出复位；状态栏取值改 `sourceMode ? (sourceStats ?? stats) : stats`（`:6094`）。真机 1 MB（ego CDP 54280，before/after 各跑一遍）：`sl-source-stats` 标记 10 键期间 **0**、+600 ms **+1**、+800 ms 不再增；每键 longTask p50 **85 → 56 ms**、600 ms 状态栏读值与改前逐字符同（`333,337 字 · 阅读约 1260 分钟`）、`value.length` +10、`sl-parse-done` 3→3、0 错误。
- 保存成功与「回到基线」都清草稿（A2，B-153）：抽出 `discardDraftFor(name, oldName?)`（先停表再推代际，删主键与 legacy 键，`:3055`），`finishSaved` 改调它；`onUpdate` 派生物里脏标记翻成干净时经 `discardDraftRef` 触发（`:1142`），`performCommit` 的「正文没变」分支补一道（`:3195`）。真机：撤销回基线后 **331 ms** 草稿归 0（改前一直留着）、撤销后 150 ms `Ctrl+S` 也归 0、legacy 40 位键保存后一并清掉；autoSave:false 与保存失败仍留草稿、保存成功后重开不弹草稿提示，0 错误。
- HTML 导出目录复核（A3，B-134，0 改动）：`export.test.ts` **27/27**，静态 `export.ts:33/:110` + `App.tsx:4852/:4885` 调用链在，模块探针目录/锚点替换成立；B-134 维持 `fixed`。
- 门禁：首屏 gzip **304,124 B**（余 5,876）；`npm test` **45 文件 580 条 0 fail**；未动编辑器/序列化不跑 roundtrip。tester 独立验收（未读 `impl.md`；CDP 9222–9226 无监听 → ego-browser CDP 54280 真机页自写脚本，before 用 `git stash` 切 HEAD）：A1/A2/A3 全过，回归 `stale-save` 4/4；UNVERIFIED：假 FSA、A3 完整导出 UI 链本轮未重跑、真实 IME/WebView2/原生打印，见 `docs/iteration/round-81/test.md`。

**第 80 轮（同一未发版区间）**

- 暖纸 Mermaid 主题竞态（A1，B-122）：`ensureMermaid` 的 `loading` 分支改成落地后补 `configure(mermaid, theme)`（幂等，`src/lib/mermaidLazy.ts:144-152`）——首次加载期间切主题不再被吞掉；`mermaidLazy.test.ts` 19→20（挂起 loader，release 前 inits 0、后 inits 2 且末次为后设主题，正序/反序两场景）。真机（ego-browser）五档 light→dark→sepia→dark→light：sepia fill `rgb(251,243,227)` ≠ light `rgb(236,236,255)` ≠ dark，标签对 fill 11.83:1，第二次 dark/light 三字段逐值同第一次，0 pageerror；截图 `shots/round-80/mermaid-sepia.png`。
- 只读查找条补证（A2，B-136，产品代码无改动）：夹具 `find.md` 真机 21/21（预览/源码两态 readOnly×2、Aa/ab disabled、note 与 id/aria-describedby 对齐、真实键入无效、`.find-hit`/mark 0、Esc 落点正确；回编辑键入「字数」1/1），见 `.tmp/r80-a2-find-locked.json`。
- 设置面板分节折叠（A3，B-150）：`SettingsDialog.tsx` 两个原生非受控 `<details className="settings-group">`（接口与模型 / 批注提示词，默认闭合）＋字号上移常显，`styles.css` 加 summary 样式；真机三档 `scrollHeight-clientHeight` **0 / 62 / 0**（1024×700 / 1000×620 / 1440×900，改前 352/432/152），footer 三档在框内与视口内、radio 4 且 tabIndex=0 恰 1、改字号保存生效；截图 `shots/round-80/settings-1024x700.png`。
- 门禁：首屏 gzip **303,975 B**（余 6,025）；`npm test` **45 文件 580 条 0 fail**（基线 579）。tester 独立复验（未读 `impl.md`；CDP 9222–9226/54280 无监听 → ego-browser 真机页自写脚本）：A1/A2/A3 全过；UNVERIFIED：交付 `.tmp` 脚本未按 CDP 执行、A2 夹具原文未由 tester 重跑、真实 FSA/IME/WebView2，见 `docs/iteration/round-80/test.md`。

**第 79 轮（同一未发版区间）**

- `==` 露出定界符改用 widget（A1，B-161）：`decorateEqReveal` 每区间发 2 条 `Decoration.widget`（`from` side −1 / `to` side +1、`marks:[]`、key 带位置；`src/lib/mathReveal.ts:164,179-192`），CSS 四条伪元素规则换一条 `.doc-body .sl-eq-delim`（`src/styles.css:860-865`），print 块删两条 `sl-eq-revealed` 恢复、加 `.sl-eq-delim{display:none}`；`mathReveal.test.ts` 改断 2 条 widget + 新增「三文本节点仍 2 枚」（10 条）、`mathStyle.test.ts` 屏幕 7/7、print 公式定界符 2 条 + delim `display:none`（4 条）。真机 17/17：`.sl-eq` 三个独立 mark、露出时 delim 恰 2 且夹住 `abc`、保存逐字节、print 藏掉；截图 `shots/round-79/eq-delim.png`。
- HTML 导出目录真机复核（A2，B-134）：HEAD 已修（`src/App.tsx:4822-4826`、`src/lib/export.ts:33,110`），真机导出 3,788 B 含 `<nav class="sl-toc"` 1、2 个 `<h1 id="sl-toc-k">`、`href` 2、点第 2 条落 `#sl-toc-1`；BACKLOG 行号 `:4521` → `:4826` 已核正。同页 B-157 两条浏览器门槛项通过（`$\alpha$` 点开→Esc 不露源码、手打 `$x^2$` 建 atom 不露源码）。
- 批注卡动作钮高度（A3，B-110 部分修）：`.note-actions button` 加 `min-height: 24px`（`src/styles.css:1388-1395`），真机 3 钮 54×24 / 42×24 / 66×24、卡片无横向溢出；剩斜体 `I` 与 `.stats-trigger` 两项仍 `open`。
- 门禁：首屏 gzip **303,914 B**（余 6,086）；`npm test` **45 文件 579 条 0 fail**（基线 578）；roundtrip rich 6/8 + source 8/8。tester 独立复验（ego-browser CDP 54280，自写 `.tmp/r79-tester-e2e.mjs` + `.tmp/r79-tester-a1-cont.mjs`）：A1/A2/A3 全过（44 条里唯一红是 tester 自己的 DOM 假设，修正后 A1 补测 6/6）。回归 `scripts/annotation-flow.mjs` 纯函数 5/5；route 段 0/3 因脚本假设首启有示例文档（现首启空白），同路径诊断 cards 1→1 不翻倍、overall 1、unresolved 1（脚本过期，非回归）。UNVERIFIED：原生打印预览/另存 PDF（只切 print 媒体）、真实 FSA/IME/WebView2，见 `docs/iteration/round-79/test.md`。

**第 78 轮（同一未发版区间）**

- 两条回归脚本断言过期（A1，B-209）：`scripts/bigfile-acceptance.mjs:127` 改断「超过 5.5 MiB」+ 文件名（删「文件太大」）；`scripts/keyboard-acceptance.mjs:179` 在 Ctrl+Shift+S 段前等旧 toast（`ttl:1500`）过期再取基线，`waitForFunction` 带 `.catch(() => {})`。真机（ego-browser CDP 54280）bigfile **3/3**、keyboard **52/52**，均 exit 0。
- 改名专用提示（A2，B-208）：`refreshTree` 加 `announce?: boolean`（缺省 true），`handleRenamedFile` 传 `announce:false` 并自报「已重命名：b.md → c.md」，不再被「已刷新：新增 1 个，消失 1 个」顶掉；`src/App.tsx:679/682/2694/2736/2824`。真机 11/11。
- 打印纸面不出现露出定界符（A3，B-160）：`@media print` 补 8 条恢复规则（4 个定界符 `content:none`、`.katex` inline、`.block-math-inner` block、根块 4 个恢复值、块根 `center`），选择器与屏幕露出规则逐字同一组；`src/lib/mathStyle.test.ts` +2 条机械断言。真机 print 媒体 17/17，截图 `shots/round-78/print-math.png`。
- 门禁：首屏 gzip **303,764 B**（余 6,236）；`npm test` **45 文件 578 条 0 fail**（基线 576）。UNVERIFIED：原生打印预览/另存 PDF 未跑（只 `emulateMedia({ media:'print' })`），见 `docs/iteration/round-78/test.md`。

**第 77 轮（同一未发版区间）**

- 主题单选组键盘模型（A1，B-109）：`src/lib/radioGroup.ts`（`nextRadioIndex` 右/下 +1、左/上 −1、Home/End、未知键 null；`rovingTabIndex` 三态）+ 单测 10 条；`SettingsDialog.tsx` 两段 map 合成 `THEME_CHOICES` 一段渲染，按钮 roving tabindex，`.theme-options` 的 `onKeyDown` 命中键后改主题并组内移焦。
- 只读视图查找条锁死（A2，B-136）：`src/lib/findBarState.ts`（`findBarControls`）+ 单测 7 条；`FindBar.tsx` 预览/源码态两输入 `readOnly` + `aria-describedby`、Aa/ab `disabled`、占位「（此视图不可用）」，Enter 二道闸保留。
- 字数明细面板 Tab 关闭（A3，B-151）：`StatsDetail.tsx` 的 `onKeyDown` 认 Tab/Shift+Tab → `preventDefault` + 关面板 + 焦点回 `.stats-trigger`，与 App 的 Esc 分支同落点。
- 门禁：首屏 gzip **303,667 B**（余 6,333）；`npm test` **45 文件 576 条 0 fail**（基线 43/559）。tester 用 ego-browser 真机页复跑浏览器断言（CDP 9222–9226 无监听）：方向键/End/Home 与主题切换、预览态查找锁、Tab/Shift+Tab/Esc 落点全过；UNVERIFIED：0 console 错误未采、交付脚本未按 CDP 执行（见 `docs/iteration/round-77/test.md`）。

**第 76 轮（同一未发版区间）**

- HTML 导出带目录与锚点（A1，B-134）：`buildExportToc` / `applyExportTocHtml` 纯函数（`src/lib/export.ts`，不新建模块、不碰 DOM），第 k 个顶层标题插 `id="sl-toc-k"`、`[TOC]` 段换 `<nav class="sl-toc">`，`STYLES` 加 `nav.sl-toc`；无标记/无标题/原文全转义时保字面；`export.test.ts` +6。
- 暖纸 Mermaid 暖色（A2，B-122）：`MermaidTheme` 加 `'sepia'`，`mermaidConfig` 用 `theme:'base'` + 11 项暖色 `themeVariables`（全取 `themes.ts` 的暖纸变量），`renderDiagram` 收可选主题；切回浅/深仍整表切主题；`mermaidLazy.test.ts` +5。
- 差距表补导出格式差距（A3，B-111）：`docs/typora-gap.md:30` 记 Word/Epub/LaTeX/图片 4 种差距、新增 `### 导出（1）`、表头 `缺的（5）→（6）`；`README.md:102`、`AGENTS.md:74` 同口径。
- 门禁：首屏 gzip **303,664 B**（余 6,336）；`npm test` **43 文件 559 条**（静态 `^test(` 536 → 547）。UNVERIFIED：CDP 9222–9226 无监听，真实导出的锚点跳转与外观、暖纸 Mermaid 真机颜色均未验（见 `docs/iteration/round-76/test.md`）。

**第 75 轮（同一未发版区间）**

- 点公式编辑后取消不再露 `$…$` 源码（A1，B-157）：新增 `mathInputSelection` / `closeMathEditTransaction`（`src/lib/mathInput.ts`），`src/App.tsx` 的三条关闭出口并为 `finishMathEdit`（提交换内容、空内容保留、取消删新建），单测 5 条 + `src/lib/mathInput.test.ts`。
- `==高亮==` 默认开 + 旧存档一次性迁移（A2，B-158）：`SETTINGS_VERSION=2`，无版本号的旧 `inlineSyntax:false`（第 55–74 轮的默认值）迁成开，版本 ≥2 的 false 是显式关、原样保留，`saveSettings` 恒写版本；`settings.test.ts` +5。
- 块级公式排版（A3，B-159）：`.katex-display` 改 `margin:0 auto; width:fit-content; min-width:100%`，短公式仍居中、长公式可横向滚回；`src/lib/mathStyle.test.ts` 2 条（4 个规则块按块断言）。
- 门禁：首屏 gzip **303,381 B**（余 6,619）；`npm test` **43 文件 548 条**；roundtrip 富文本 6/8 + 源码 8/8。UNVERIFIED：CDP 9222–9226 不可用，A1 点取消/手打公式的浏览器项与 A3 长公式几何、真机 `.sl-eq` 渲染与保存字节均未验（见 `docs/iteration/round-75/test.md`）。

**第 74 轮（同一未发版区间）**

- `==高亮==` 定界符随选区露出（B 轮 B2，复用第 73 轮 `src/lib/mathReveal.ts` 工厂）：光标进高亮或贴两端时 `::before/::after` 画回 `==`（`src/styles.css:856-871`），移开收回；设置关时文档里没有 mark、装饰为空集；保存仍逐字节写回 `==高亮==`。截图 `shots/round-74/eq-delimiter-reveal.png`。
- Typora `==`/`$$` 机制与源码保真调研（`docs/iteration/round-73/typora-mechanism.md`）＋`docs/typora-gap.md` 两行补「选中/贴边露源码」。
- 门禁：首屏 gzip **303,043 B**（余 16,957）；`npm test` **41 文件 536 条**；roundtrip 富文本 6/8 + 源码 8/8。

**第 73 轮（同一未发版区间）**

- 待办列表行高与复选框对齐（B-154）：`li` 50.14 → **33.14 px**，复选框中心与首行文字差 7.5 → **0.06 px**，`li > div > p` 下边距归零，勾选仍写回 `- [x] `。
- `[TOC]` 标记段相邻即露（B-155）：光标进入标记段或紧邻块即 `is-revealed`（`src/lib/tocRender.ts` 的 `revealedIndex` 收 `doc`/`to`），方向键可进入并删除；保存仍写回 `[TOC]`。
- 行内/块级公式选中即露源码（B-156）：新增 `src/lib/mathReveal.ts` 通用露出工厂（选区不变时同一 `DecorationSet`），`::after` 还原 `$…$` / `$$…$$`，保存字节不变；首屏 gzip **302,787 B**、测试 **41 文件 532 条**。

数据安全 + 大纲折叠；计划里的 T2（状态栏字数点击明细）**未做**，留待下一轮。第 30 轮补上字数明细、修删除撤销丢正文，并给安装器版本与发版流水线加门。

**第 30 轮（同一未发版区间）**

- 状态栏字数可点：弹出「字数明细」面板（字 / 字符 / 词 / 句 / 段 / 阅读时间 + 选区内字、字符、句），`Esc` 或点面板外面关闭，焦点回触发按钮；面板是 footer 的兄弟节点，不吃状态栏的整栏文本。新增 `countSentences`（`src/lib/wordcount.ts`，3 条单测）。
- 源码模式字数先剥 frontmatter（`src/App.tsx` 状态栏取值），同一篇在编辑/源码间因元数据跳变的问题修掉；`[文字](url)` 这类链接目标造成的残留跳变另记，见第 30 轮报告。
- **修数据丢失**：删除干净文件后「撤销」恢复成 0 字节，还把 `.sidelight/trash/` 里的两份副本一起删掉。现在干净文件（`text === null`）不写 `.current.md`；撤销改为收集 trash 条目（只收 `kind === 'file'`）后按「`.current.md` 非空才优先、否则整份备份」选源；新增纯函数 `shouldWriteCurrent` / `pickTrashSource` 与 `src/lib/trash.test.ts`（6 条）。
- 首屏回收：`PreviewPane` 与 `export.ts` 改按需加载（导出时才取模板），首屏 gzip 285,838 → **284,529 B**（上限 286,000，余 1,471 B）。
- 安装器版本不再写死：`packaging/installer.nsi` 的 `VIProductVersion` / `FileVersion` 改用 `${APPVERSION}.0`（0.31.1.0 曾随 0.32.1 发出去）；`packaging/installer.ps1` 出包后断言 `FileVersion` 并打印 820,000 B 目标线差值。`release.yml` 两个构建 job 补 `npm test` / 首屏体积门，`ci.yml` 补便携 zip。
- 测试：`npm test` 18 个文件 **260** 条（251 + 删除撤销 6 + 句数 3）。
- UNVERIFIED：真实盘句柄上的删除 + 撤销（假 FSA 无权限模型，`move()` 分支总被走到，copy 分支本轮跑不到）。超大文件新提示本轮已按文件树入口实测通过（dev server 已交付新模块，`tooLargeNote` 3 处）。

- 保存成功后不再写陈旧草稿：`finishSaved` 先停草稿计时器再推进代际；草稿回调在 `parentDirectory` 前后、`writeCache` 之后各判一次 `stale()`，在飞的一轮写下了也补删（`src/App.tsx:845-874`、`:2521-2529`）。
- 超过 5.5 MiB 的文件被拒时，提示写清正文「仍在『哪一篇』」，不再让人以为窗口里是新文件、`Ctrl+S` 写错篇；文件选择器与文件树两条入口共用 `tooLargeNote`（`src/App.tsx:2105,2112,2133`）。文件树入口的实测被陈旧模块挡住，见 `docs/iteration/round-29/test.md` 的 UNVERIFIED。
- 大纲可折叠：新增 `src/lib/outlineTree.ts`（`buildOutlineTree`/`expandAncestors`/`visibleActiveId`）；`Outline.tsx` 两列 grid + 折叠按钮（行内 style，不进首屏 CSS）；当前节被折叠时高亮最外层折叠祖先（`aria-current="location"`），光标回到子节自动展开；折叠状态只在内存。
- 查找：查询为空时不再显示「无结果」（`src/components/FindBar.tsx:56`）。
- 删掉 5 段 0 引用 CSS（`.sr-only`、`.popover-title/note/actions`、`.dialog-input,`）。
- `scripts/measure-first-screen.mjs` 默认上限改 286,000，CI 不再单独传 `--max`；ADR-0012 判据行同步。
- 首屏 gzip **285,838 B**（≤286,000，余 162 B）；测试 `npm test` 17 个文件 **251** 条（248 + T3 的 3 条）；`draft-acceptance` 57/57、`keyboard-acceptance` 49/49。

**第 31 轮（同一未发版区间）**

- **修数据丢失**：删除当前文档后「撤销」、改名「非当前文档」两条路径都会把保存目标切到别的文件，下一次保存把当前正文写进它（实测覆盖掉被改名/被删文件的原文）。`refreshTree` 的 adopt 分支加不变量守卫（只有编辑器里载入的就是这个文件，才接 `activeFile` 与保存目标），撤销按钮改用最新的 `refreshTreeRef` 而不是删除那一刻的闭包（`src/App.tsx`）。回归锁 13/13：撤销后 `甲.md` 字节不变、改名非当前文档后 `丙二.md` 字节不变、改名当前文档仍写新路径、新建文件仍能保存。
- 字数明细按口径分行：中日韩字 / 拉丁词 / 合计 / 字符 / 句 / 段 / 阅读，每行 `title` 写清算法（中日韩字含汉字、日文假名、韩文谚文；合计 = 中日韩字 + 拉丁词）。打开后焦点进面板，`Esc` 关闭并回焦点到状态栏字数按钮（`src/components/StatsDetail.tsx`）。
- 点正文里的链接恢复就地编辑：`openLinkRef` 补上赋值，点击后贴着链接弹出文字 / 地址浮层（Esc 取消，不新开标签页）；列表项内 `Tab` / `Shift+Tab` 缩进 / 反缩进（`sinkListItem` / `liftListItem`），不再往行尾插两个空格。快捷键一览补一行。回归 15/15（链接、Ctrl+K、列表 3a–3d、表格 Tab、文档开头 Tab）。
- 门禁与文档：`@tiptap/extension-strike` 显式声明为直接依赖（此前只是 `@tiptap/starter-kit` 的传递依赖，换安装布局就会构建失败，字节不变）；`settings` / `prompt` / `katexLazy` 三个测试文件挂进 `npm test`（**21 文件 272 条**）；README 删掉不存在的「示例工作区」入口、说明链接的直接依赖；便携包说明不再指向包里没有的 `README.md`，`.md` 关联改按已定的 opt-in 描述。
- 首屏 gzip **284,761 B**（≤286,000，余 1,239 B；比第 30 轮 +232 B）。本轮不发版，实测命令与原始输出见 `docs/iteration/round-31/test.md`。
- UNVERIFIED：真实目录句柄上的「删除 → 撤销 → 保存」与「改名非当前文档 → 保存」（假 FSA 无权限模型）；列表嵌套的存盘字节（e2e 只验源码文本与 DOM 重解析）；真实中文输入法下的 Tab 与链接点击。

**第 32 轮（同一未发版区间）**

- 修 Windows 上 `Ctrl+Shift+P` 预览快捷键无声失效：`App.tsx` 的按键条件里多了 `!event.ctrlKey`，只有 macOS 的 `Cmd+Shift+P` 能命中；快捷键一览与预览按钮 tooltip 一直在宣传这个键。`keyboard-acceptance` 补 3 条断言（进预览 / 不被 `Ctrl+P` 抢走 / `Esc` 回编辑），52/52。
- 状态栏随选区显示「选区 N 字」：`SelectionState` 加 `words`（中日韩字 + 拉丁词，与字数明细的选区行同口径），选区折叠即不渲染；源码/预览态按 `viewMode === 'edit'` 归零，不显示旧选区。
- 字数明细「段」改按正文文本块计（新增 `countParagraphs`）：段落与列表项各算 1，标题与表格不计，代码块整块算 1；编辑与源码两模式同口径（改前编辑模式恒为 1、源码模式数非空行），面板提示与脚注写明口径。`wordcount.test.ts` +4 条。
- 构建期体积护栏 + Mermaid 决策：`vite.config.ts` 的 `chunkSizeWarningLimit` 从 1200 降到 950（主 chunk 894,163 B，留约 56 kB 缓冲），注释与 README 换成实测字节；新增 [ADR 0017](adr/0017-mermaid-lazy-loading.md)——Mermaid 首屏 0 B 的惰性方案可行，但安装包真实增量（主入口 + 48 个静态依赖 1,976,553 B raw）把包推过 850,000 B 硬线，**本轮不实现**，需产品负责人三选一。
- 测试：`npm test` 21 个文件 **276** 条（272 + 句段 4）；首屏 gzip **285,052 B**（≤286,000，余 948 B）；`keyboard-acceptance` 52/52、`qa17` 7/7。
- UNVERIFIED：Windows 宿主里实按 `Ctrl+Shift+P`（本机只浏览器实测）；macOS `Cmd+Shift+P`；全选 1 MB 时的选区计数耗时；源码模式解析失败后的回退路径（面板新旧口径一致性）；mermaid 真装进 `dist` 后重打的安装包字节；`qa16` / `qa10` 两条脚本已过期（见下条），本轮未修。
- 已知测试脚本过期（非本轮引入，基线同样失败）：`scripts/qa16.mjs:81` 等 `.editor a`——链接插入早已改成行内浮层，脚本还在等 `window.prompt` 的返回；`scripts/qa10.mjs:24` 等第 3 个 `p`——首启已是空文档，脚本还按演示文档写。

**第 33 轮（同一未发版区间）**

- 智能标点与自动配对（只作用于键盘输入）：直引号按上下文变弯引号、`--` → `—`、`...` → `…`、中文后的 `, ; : ? !` 变全角，左括号与开引号补右半边、光标落在里侧，有选区时把选区套起来；`---` 仍出分隔线、`` `a` `` 仍出内联代码、`don't` 与 `1990's` 的撇号原样。代码块、行内代码、组合输入不转换；设置里可关（`智能标点与自动配对括号`，旧存档读出为开）。收益面是**西文态 / 半角态与中英混排输入**；真实中文输入法中文态是否本来就上屏全角，本机无真人输入法，**未验证**。新增 `src/lib/smartTyping.ts` 与 8 条单测；e2e 13 组全过；首屏 gzip **285,891 B**（≤286,000，余 109 B）。
- 验收与发版门禁的版本号不再写死：`packaging/verify-installer.ps1` 三处判据改用脚本已有的 `$version`（此前写死 `0.31.1`——正确的 0.32.1 包会被判 2 个 FAIL，而 `FileVersion=0.31.1.0` 的坏包反而通过）；`release.yml` 的 `windows-build` 在上传前新增 `setup FileVersion` 断言（本地正反例已复验）；`packaging/README.md` 的门槛文案改成脚本真实输出。
- 测试：`npm test` 22 个文件 **285** 条（276 + 智能标点 8 + 设置旧存档 1）；`roundtrip` source 7/7。
- 已知限制（本轮不做）：中文后的 `.` 不转 `。`；反引号不配对（保 `` `a` `` → 内联代码）；没有成对退格（一次退格删一个字符）；中文后的 `!` 紧跟 `[` 时不转，保住 `![图](a.png)`；`——` 不能在空段落开头连打（三根 `-` 就出分隔线，要 `——` 先打一个别的字）。

**第 34 轮（同一未发版区间）**

- **修数据丢失（P0）**：保存会把脚注定义改写成 `[^1](定义文字。)`，而自动保存路径此前不弹框——用户只打一个字，2 秒后定义被静默丢掉。`src/lib/risk.ts` 新增 `footnote-loss` 分类：基线为空但原文有脚注定义时仍比对，且只放过这一种损失；手动保存与自动保存共用 `activeLosses`，自动保存命中后状态栏显示「需手动保存」，保存对话框文案同步（`src/components/SaveDialog.tsx`）。`src/lib/diff.test.ts` +2 条；回归锁 6/6（含自动保存路径，取消后字节不变）。
- 焦点回正文：`Esc` 关查找、查找条「关闭」、快速打开选中之后都回到 `.ProseMirror`；同一篇文档被再次打开时直接聚焦、不再弹「切换文档」（`isSameEntry` 身份比较）。
- 门禁：新增 `npm run verify`（build + 首屏 gzip 字节门），`measure-first-screen.mjs` 汇总行加 `headroom`；失败反例 exit 1 已实测。
- 测试 `npm test` 22 文件 **287** 条；首屏 gzip **285,937 B**（≤286,000，余 63 B）；`keyboard-acceptance` 52/52；`tree-acceptance` 54/56（两条为既有脚本过期）。
- UNVERIFIED：真实磁盘句柄上的脚注拦截；1 MB 带脚注文档的自动保存周期开销；真实中文输入法下的 Esc 后打字；宿主/WebView2 里的焦点修复；`npm run verify` 在 CI 两个 runner 上的字节一致性。

**第 35 轮（同一未发版区间）**

- 体积护栏换挡（产品负责人 2026-11-17 决定）：首屏 gzip 内部预算 **310,000 B** / 硬线 **320,000 B**，安装包内部 **1,800,000 B** / 硬线 **2,000,000 B**。`scripts/measure-first-screen.mjs` 新增 `--target`（超内部预算只 WARN、不 exit，硬线仍 exit 1），汇总行保留 `headroom` 并另起一行打印 `target=… gap=…`；`packaging/{installer,portable,verify-installer}.ps1`、`packaging/README.md`、README、AGENTS、STATE、ADR-0012/0017 同步。CI 不写死预算字面量（改前 6 处、改后 0 处，有改前正向对照）。便携 zip 门槛与安装包共用 2,000,000 B 硬线，不另设内部预算。`--target 280000` 曾把 `280000` 当目录（`readFileSync` ENOENT），`positional` 改为跳过所有 `--` flag 及其后一个值，正反例 exit 1 / exit 0 各一次。
- **AI 提示词拆分**：格式与安全规则（JSON Lines 协议与示例、`quote` 约束、最多 1 条 revision、`overall` 总评、不编事实不换语体、`<前文>/<选区>/<后文>` 标记）内置为 `ANALYSIS_SYSTEM_PROMPT`，不进设置、不可编辑；设置里只剩「批注提示词（作者偏好）」，字段改名 `analysisPrompt` → `userPrompt`。旧存档按指纹迁移：第 26–34 轮默认提示词（795 字，FNV-1a `ebaf07b2`）自动换成新的 `DEFAULT_USER_PROMPT`，自定义值原样保留、不删不改写；`promptVersion` 升 3，自定义值保留原版本标记。落盘不再写 `analysisPrompt`。逐条追问的 system 提到 `DISCUSS_SYSTEM_PROMPT`。删掉「提示词里没提 JSON 格式」这条已失效的事后警告（格式规则已内置）；设置对话框的字号钳制原样保留。
- **Esc 后焦点回正文**：退出预览、退出源码、关快速打开之后，焦点回到 `.ProseMirror`，下一次击键不再静默丢失（退出后 `activeElement` 曾是 `body`，4/4、3/3、3/3 复现）。`FindBar` 的两个 Esc 分支改成 `preventDefault()` + `stopPropagation()`，一个 Esc 只关查找，不再连带退出源码/预览；关闭查找后按模式分派焦点——源码模式回 `textarea.source-editor`（`.ProseMirror` 不在 DOM，`focusEditor()` 是空操作），预览模式显式不聚焦（预览 pane `contentEditable=false` 且无 `tabindex`，只读、快捷键由 window 处理），再按一次 Esc 才退出预览并聚焦正文。
- 测试：`npm test` 22 个文件 **295** 条（287 + 提示词拆分 8，全部走既有测试文件，未新建文件）；`npx tsc --noEmit`、`npm run build`、`npm run verify`、`npm run roundtrip` 均 exit 0；首屏 gzip **286,056 B**（预算内部 310,000 / 硬线 320,000，距硬线余 33,944 B）；主 chunk `index-CYKrmZl7.js` 895,227 B raw / 279,028 B gzip。本轮不发版，原始命令输出与截图见 `docs/iteration/round-35/` 与 `shots/round-35/`。
- UNVERIFIED：真模型在格式/偏好分离后是否更听话（无 Key，只验了请求体形状）；安装包新预算线的真实字节（本轮不打包，只做静态与语法检查）；CI 换线后的实际绿（不 push）；`packaging/verify-installer.ps1` 新增体积段的真机运行（会写 `release/`）；`scripts/qa15.mjs` 因提示词拆分失效的 4 行（不在任何门禁里，下一轮修）；WKWebView 下的 Esc 焦点行为（本机 Windows）；预览模式下关查找后焦点暂时在 `body`（只读视图无输入目标，下一轮可加 `tabIndex={-1}` + `.preview-pane:focus { outline: none }`）。

**第 36 轮（同一未发版区间）**

- **Mermaid 图表（产品负责人第 32 轮批准，ADR-0017 落地）**：```` ```mermaid ```` 代码块下面挂一个预览 widget，`graph TD; A-->B` 这类流程图直接出图。实现是「ProseMirror 插件 + 装饰」，不改 codeBlock 节点、不改 Markdown 序列化：`src/lib/mermaidLazy.ts`（惰性 loader / 按 code 缓存 / 失败不抛错 / 测试钩子）+ `src/lib/mermaidLoader.ts`（只被动态 `import()`，同 `katexLoader.ts`）+ `src/lib/mermaidPreview.ts`（插件，400 ms 防抖、同 hash 复用 widget DOM）+ `src/mermaid-dist.d.ts`。首屏 **0 B**：`dist/index.html` 0 处 `mermaid`、首屏集合 `files=3` 不含 mermaid chunk；打开含图文档才下载 `mermaidLoader` chunk（27.51 kB gzip）与对应图类型 chunk。渲染失败把 widget 换成 `is-error` + 一句「图表没渲染出来，代码块内容仍是原文，可以继续编辑。」，代码块文本逐字不动（E2E 已验证）。依赖 `mermaid` 精确锁 11.12.0（`AGENTS.md` §4 的例外，理由与实测见 ADR-0017）。
- **修数据丢失**：「全部替换」不再清空页边批注。`replaceEvery` 里那句 `setAnnotations([])` 删掉后，整篇替换与普通编辑走**同一条**事务映射路径（`src/App.tsx` 的既有 `transaction` 监听器：`addToHistory === false` 才跳过），批注自动跟随，不需要第二套位置算法。E2E：种子批注「很蓝」、「天空」→「天」三处不等长全部替换后，正文变「天很蓝。天很蓝。另一段也有天。」、批注仍是 1 条且高亮仍是「很蓝」（单次映射 from 3→2、to 5→4；双映射会缩成「很」）、`.sidelight/annotations/批注.json` 里 `to - from === 2`；`Ctrl+Z` 后位置回到 3–5，条数不变。
- **修丢键**：进源码框后焦点不再掉在 `body`。三个入口（`enterSourceFor`、`switchView`、工具栏「源码」）与 `Ctrl+/` 现在都用模块级 `focusSourceEditor()`（rAF + `textarea.source-editor`，与关查找条同一选择器）；`Ctrl+/` 退出源码回正文（`focusEditor()`），打字真的落进正文。载入即源码（含引用式链接定义的文档）**不抢焦点**，E2E 专门拦这条回归。
- 发版：`.github/workflows/release.yml:262` 的 `while read` 管道后补 `|| true`——`grep -- '-macos-arm64.zip'` 在 0.29.0 起资产改名后必然 0 命中，`pipefail` + `set -e` 让同一 tag 的重发必红。
- 文档：`README.md` 依赖从「两组」改「三组」并补 Mermaid 一行（`AGENTS.md` §4 要求）+ 首屏/安装包实测数字；`docs/typora-gap.md` 的 Mermaid 从「无」改「有（第 36 轮，惰性渲染）」；ADR-0017 补「第 36 轮实测」节，用真字节替换预估并明写四处偏离原方案。
- 门禁：`npx tsc --noEmit`、`npm test`（**23 个文件 301 条**，新增 `src/lib/mermaidLazy.test.ts` 6 条）、`npm run roundtrip`（`docs/roundtrip-report.md` 无 diff，source 7/7 等值）、`npm run verify`、`npm run build` 全 exit 0；首屏 gzip **288,256 B**（+2,200 B，预算内部 310,000 / 硬线 320,000，距硬线余 31,744 B）；安装包 `-AssocDryRun` 实测 **1,299,777 B**（正式包预估 1,297,630 B，内部预算 1,800,000 / 硬线 2,000,000 内）。
- UNVERIFIED：正式安装包字节（只跑 dry-run，跳过 2,000,000 硬判）；WebView2 宿主里的真实 mermaid 渲染（只用 CDP 浏览器）；HTML 导出与预览面板的图形（本轮不做，见 ADR-0017 已知限制）；中文输入法下的源码框聚焦（`keyboard.type` 只发 ASCII）；>1 MB 文档含 5+ 张图的滚动性能（只测 1 张图）；mermaid 各类图的真实报错文案（只测一个坏语法样本）。

**第 37 轮（同一未发版区间）**

本轮按计划 §3 的**单执行代理降级方案**执行：只做 T1 + T3 最小集，**T2（Mermaid 嵌套围栏 + SVG id 按实例唯一）整体顺延第 38 轮**（第 36 轮功能尚未发版，晚一轮没有对外影响；不压缩 E2E）。T4 零字节、四条正反例全过，提前收工后顺手做了。

- **表格列宽可拖拽**：`ReusableTable` 改 `configure({ resizable: true })`，`columnResizing` 插件本就在静态依赖里（JS 增量 0 B，只加 CSS）。`styles.css` 新增 `.column-resize-handle` 竖线与 `.editor.resize-cursor` 光标，并给 `.editor th, .editor td` 补 `position: relative`（handle 是插在单元格里的 widget，没有定位祖先会跑位）。E2E 拖第一列表头右边界 +90 px：`handleSeen:true`、首列 192 → 278 px（+86）、`<col style="width: 278px">` 出现；拖前 `dirty=false`，拖后仍 `false`、`Ctrl+S` 后字节与拖前逐字节相同（列宽不进 Markdown）。
- **修「进源码后首次击键插到文首」**：`focusSourceEditor(ratio?)` 按富文本光标的相对位置落 caret（`selectionStart = round(len × ratio)`），`Ctrl+/` 与横幅/确认框两条入口都传比例；关查找条那条路径**不传** ratio（一次 Esc 不能丢写作位置）。顺序改成「先 setSelectionRange 再 focus」——反序实测视野停在文首（本次实测 `scrollTop` 0 → 2640 / 5209）。E2E 用 120 段长文：`Ctrl+/` 后 `active=TEXTAREA.source-editor`、`selectionStart 1936 / 3857`（ratio 0.502）、`scrollTop 2640 < max 5209`、打 `ZZZ` 落在光标处（`selectionStart === before + 3`）；`Ctrl+F` → `Esc` 后 `selectionStart` 不变（1939 → 1939）。
- **文档**：`docs/typora-gap.md` 全表复核——7 条已实现却仍写「无」的移进「已经有的」（自动配对括号与引号、智能标点、缩进与反缩进、大纲折叠、新建/重命名/删除文件、快速打开、最近文件），删掉重复的「行内 HTML 有保真」行（「缺的」里已有「保真但不渲染」），「字号与缩放」拆成「字号缩放（有，`Ctrl+Alt+0` 复位）」与「视图缩放（无）」，主题改「明 / 暗 / 跟随系统三档」，表格行列补「表头边界可拖拽改列宽」，新增「工作区相对路径图片显示」一条（`assets/a.png` 显示破图，P1）。计数按行重算：**已有 28 项、缺 12 项**（改前标题写 22/17，实际缺表本来就有 18 行）；`README.md:82` 与 `AGENTS.md` 的同一句同步；`README.md:50` 能力句补「表头边界可拖拽改列宽」，`:74` 补限制句「列宽不写进 Markdown，重开按内容重新均分」。
- 门禁：`npx tsc --noEmit` exit 0；`npm test` **23 个文件 301 条**全过（T1 不加单测，与第 36 轮同）；`npm run roundtrip` rich 5/7、source 7/7（与第 36 轮同，`04-reference-links.md` 与 `06-task-list.md` 的既有差异不变）；`npm run build` exit 0；首屏 gzip **288,411 B**（+155 B，只多 T1 的 CSS；`files=3`，首屏集合无 `mermaid`/`lazy`/`katex`；内部预算 310,000 / 硬线 320,000，距硬线余 31,589 B）。
- **T4（零字节，`scripts/measure-first-screen.mjs`）**：距硬线不足 5% 时打一行 `WARN 首屏距硬线 …`——预算余量从 21,744 B 掉到 0 之前不再静默（第 36 轮刚单轮 +2,200 B）。只提醒，不改参数、不改 exit 码。四条正反例按计划全过：默认 `headroom=31744` 无 WARN、`PASS`、exit 0；`--max 300000` 出 WARN（余 11,744 B）仍 `PASS`；`--max 288000` 仍 `FAIL` exit 1（WARN 不吞 FAIL）；`--target 280000` 不报 ENOENT、打「超过内部预算」、exit 0。
- UNVERIFIED：WebView2 宿主里的表格拖拽与源码框 caret（本轮只用 CDP 浏览器）；拖过的表在 HTML 导出里会带出 `colwidth="278"`（DOM 已实测；没有 `<colgroup>`，宽度不生效）——本轮按计划不改，第 38 轮给 `TableCell`/`TableHeader` 的 `colwidth` 加 `renderHTML: () => null` 并用 E2E 断言导出片段；暗色主题与 150%/200% 缩放屏下的 handle/caret；真实中文 IME 下的源码框 caret。

**第 38 轮（同一未发版区间）**

- **工作区相对路径图片能显示**（`assets/xxx.png` 原名破图，P1，第 32/33/34 轮连续记录）：新增 `src/lib/assetResolve.ts`（模块级缓存 + 在飞去重 + 代际 + 订阅，纯函数可在 Node 单测）与 `src/lib/assetImage.ts`（`ResolvingImage` NodeView，只把 DOM 的 `src` 换成本地 blob URL）。正文节点与 `.md` 字节不变，仍是 `assets/…`（保存后逐字节等于种子，0 处 `blob:`）。编辑视图、预览面板都能显示；换目录（根 → `sub/` → 回根）两个方向都对，图片不因切文档串到别篇。单文件打开（无目录句柄）与宿主文档**不**按工作区根解析，避免显示别人的图。E2E 十段全绿；`npm test` 24 个文件 **311** 条（新增 `assetResolve.test.ts` 5 条）。
- **修预览面板在源码态载入后永久破图**：源码模式下编辑器不挂载、没有 NodeView，缓存没人填；`PreviewPane` 改为自订阅 + 自发起解析（`useSyncExternalStore` 快照 = 资产版本号）。红/绿对照实测：去掉该 effect 时 `naturalWidth:0`、`src` 仍是 `assets/d.png`；恢复后 `naturalWidth:1`、`src` 是 `blob:`。
- **智能标点不再改写含 `|` 的行**（数据保真）：手打的 GFM 表格分隔行 `| --- | --- |` 原样保留，不再变成 `| —- | —- |`。`smartInput` 加第 4 个可选参数 `lineBefore`（只在按 `-` 时由插件传入整行文本），命中返回 `null` 让后面的横向分隔线输入规则照常收到输入（空段落打 `---` 仍出 HR，E2E 实测 `hrCount:1`）。
- **Mermaid：列表项与引用块里的围栏也渲染**（第 37 轮顺延的 a 半）：`listMermaidBlocks` 由 `doc.forEach` 改 `doc.descendants`，嵌套节点用绝对 `pos` 挂 widget。E2E 三篇（列表项 / 引用块 / 顶层）各 `previewCount:1`、`isReady:true`、`svgCount:1`，代码块原文逐字不变。b 半（两段相同代码的 SVG id 按实例唯一）仍不在本轮。
- 文档：`docs/typora-gap.md` 把「工作区相对路径图片显示」从「缺的」移进「已经有的」（**29 项有 / 11 项缺**），「文件与工作区」子计数 2 → 1，下一批重排 3 条；`README.md` 能力句与限制句同步（单文件打开仍显示不了），智能标点限制补一句；`AGENTS.md` 测试计数与差距计数同步；ADR-0017 已知限制补一行。
- 门禁：`npx tsc --noEmit` exit 0；`npm test` **24 个文件 311 条**全过；`npm run roundtrip` rich 5/7、source 7/7（不碰序列化）。
- UNVERIFIED：真实文件夹句柄与权限三态（CDP 是假 FSA）；宿主（WebView2）单文件打开时的相对路径图片（宿主只有 `/__doc`，无目录句柄，按其路由要宿主轮）；插入图片后「立刻显示」（假盘 `createWritable().write()` 把 Blob 当文本写，PNG 会坏）；宿主内 NodeView 的图片选中/拖拽；真实中文 IME 下表格分隔行的输入；大量图片（>50 张）的 blob 内存与切文档撤销；暗色主题与 150%/200% 缩放屏下的图片与预览。

**第 39 轮（同一未发版区间）**

- **表格单元格里的 `<br>` 能读回来了**（P1，自产自读不一致）：单元格里 `Shift+Enter` 当场是真换行、`.md` 里也是 `<br>`，但载入时 `escapeHtmlForParse` 把 `<br>` 转成文字，重开就显示成字面 `3A<br>B`。新增纯函数 `src/lib/tableCellBreaks.ts`（只在 `tableCell`/`tableHeader` 内部把文本节点切成 text / hardBreak，无表文档返回同一对象不复制；带格式的文本不拆，避免 `**A<br>B**` 第一次保存变成 `**A**<br>**B**` 让这张表退出整块复用）与 `src/lib/tableCellBreaks.test.ts`（8 条），接进 `setMarkdown`。E2E：载入 `| A<br>B | c |` 后 `th/td br` 1 个、单元格文本不含字面 `<br>`、`Ctrl+S` 字节逐字节等于种子；另做真实路径（`Shift+Enter` → 源码含 `<br>` → 切回富文本仍读成换行）。
- **相对路径图片支持 `../` 与 `%20`，解析失败给可见占位**（P1，静默失败）：原来把 `..` 当目录名、`%20` 不解码，两条都静默破图。`assetResolve.ts` 新增纯函数 `resolveAssetSegments`（逐段处理，空段与 `.` 跳过，`..` 从文档目录弹一层、弹出工作区根返回 `null`，非法编码保留原段），`App.tsx` 的解析器改为从工作区根走（保留「工作区名前缀」来源校验，单文件打开/宿主仍不解析）。`assetImage.ts` 改为**解析成功前不写 `src`**：真实目录下改前会先请求相对 URL（dev server 对破图回 SPA 回退 `200 text/html`），改后 `nope.png` 请求数 **1 → 0**（红绿两次输出见 `round-39/impl.md`）；解析不到时加 `data-asset-missing`、`alt`/`title` 写「图片未找到」，`styles.css` 给虚线占位。宿主/单文件（无文档路径）按原样直接显示，不标缺失。`assetResolve.test.ts` 新增 12 条断言。
- **源码模式下查找替换不再假装成功**（P2，静默丢失）：源码态匹配来自隐藏的富文本实例，点「全部替换」计数清零、按钮变灰，但源码框、正文、保存字节都不变。`FindBar` 新增 `unavailableReason`，有值时四个按钮 `disabled`、`.find-count` 留空、渲染 `.find-note` 说明「源码模式下不支持查找定位与替换」；**查找框 `Enter`/`Shift+Enter` 与替换框 `Enter` 都 `preventDefault()` 后直接 return**（只把按钮 `disabled` 拦不住替换框 Enter）。E2E 有牙判据：替换框按 Enter 后 `localStorage['sidelight.doc.v1']` 与按前逐字节相同（改前实测 73 → 69），源码框与 `dirty` 不变；富文本路径不回归（`1 / 2`、全部替换落 2 处、`dirty:true`），`Esc` 一次只关查找。
- **1 MB 载入去掉一次重复的全文序列化**（稳定性/测量诚信）：`loadIntoEditor` 原先对同一条正文调两次入参逐字相同的 `serializeDocument`，提出成一条 `serialized` 给 `baselineLosses` 与 `baselineRef` 共用（语义不变：同一字符串、`\r\n` 归一位置不变）。另加 **8 处行内 DEV 埋点**（`sl-load-start` / `sl-parse-done` / `sl-dispatch-done` / `sl-serialize-done` / `sl-sync-done`，写成 `if (import.meta.env.DEV) performance.mark(...)`，生产由压缩器整句删除）：源码 `performance.mark(` 8 行正向对照、`.tmp/build-r39` 产物 5 个标签 0 命中。本轮实测四段数字与口径见 `docs/iteration/round-39/impl.md`；**不要**把「去掉重复序列化」当成载入变快（1 MB/37,450 段里它只值 ≈64 ms）。
- 体积护栏第二次放宽补记：安装包内部 **45,000,000 B** / 硬线 **50,000,000 B**（产品负责人 2026-11-17）；Mermaid 之后第 39 轮真实打包实测 setup **1,300,711 B**、portable zip **1,622,355 B**。第 35/36 轮条目里写的 1,800,000 / 2,000,000 是历史口径（第 39 轮前口径），保留原文。
- 文档：`docs/typora-gap.md` 计数 **29/11 → 30/11**（新增「表格单元格内换行往返」，图片行补 `../`/`%20` 与占位）；`README.md` 图片句、查找替换句、体积数字与 `packaging/README.md` 体积段同步；测试计数按 `npm test` 实测更新。
- 门禁：`npx tsc --noEmit` exit 0；`npm test` **25 个文件 320 条**全过（新增 `tableCellBreaks.test.ts` 8 条 + `assetResolve.test.ts` +12 条）；`npm run roundtrip` rich 5/7、source 7/7；`.tmp/build-r39` 里 5 个埋点标签 **0 命中**（源码正向对照 `performance.mark(` **8 行**）；首屏 gzip **290,021 B**（比第 38 轮 +591 B，`files=3`，预算内部 310,000 / 硬线 320,000，PASS）。

**第 40 轮（同一未发版区间）**

- **打开→保存不再改写 `H~2~O`（单波浪号）与 `<!-- -->`**（P1，两处保存字节损坏）：GFM 默认把单个 `~` 当删除线，`H~2~O` 解析成 strike 后写回 `H~~2~~O`；`repairHtml` 的字符类不认 `!`，注释被存成 `&lt;!-- --&gt;`。`src/lib/tilde.ts` 注册 marked 行内扩展，只把「不成对的单个 `~`」当文本（`return false` 是空操作——marked 的 `use()` 会落回基础 GFM 规则，实测无效）；`src/lib/html.ts` 的字符类加 `!`，且**只在原文真有同一条未转义片段时**还原注释（避免把讲转义的段落、代码样例改成真标签）。两条 repair 共用新模块 `src/lib/codeScan.ts` 的 `mapOutsideCode`：围栏（含 `> ```` 引用块围栏）、行内代码不参与改写；`repairTildes` 另跳过行内 `$…$` 与 `$$` 块公式。`~~删除线~~` 仍是删除线；E2E 保存字节逐字节等于种子（`H~2~O`、`<!-- 给编辑看的备注 -->` 原样，0 处 `&lt;!--`、0 处 `~~2~~`）。
- **正文里手写的 `\~` 会还原成 `~`**（语义等价，`\~` 在 Markdown 里本就渲染为 `~`）：代码、行内代码、引用块围栏、公式里的 `\~` 一个字节都不动。
- **只读预览恢复正文排版**（P1，连续 3 轮顺延）：预览原来没有排版容器——标题无衬线 32px、正文 16px 无行高、表格无边框、引用无边线。正文排版选择器由 `.editor` 改 `.doc-body`（编辑态同时带两个类），`PreviewPane` 包上 `.doc-layout.preview-layout > .doc-column.preview-column`，预览与编辑同一套排版：Source Han Serif 17px/1.95、36rem 限宽（实测 `576 px`）、表格边框与表头底色、引用左边线 2px（1024 视口也不横向溢出）。顺带修字数明细面板 941px：`maxWidth 360px` + `overflow-wrap: anywhere`（实测 360×285）。
- **连续空段落不再往 `.md` 写 `&nbsp;`**（P2，字节污染）：在标题前或正文中间连按两次 Enter 再保存会多一行字面 `&nbsp;`。新增纯函数 `src/lib/blankParagraphs.ts`，只对正文调用（`joinFootnotes(collapseBlankParagraphs(reused), footnotes)`），规则只收「含整行 `&nbsp;` 的空行段」：围栏内、脚注块、用户手写的 `&nbsp;` 段落、只按一次 Enter 的字节都不动。E2E：文首双击 Enter → 保存 `"\n\n# 标题\n\n正文。\n"`（0 处 `&nbsp;`）、二次保存字节不变；围栏 4 个空行与脚注块 `\n\n\n` 逐字节原样。
- **窗口/标签标题始终跟随当前文档**（P2，身份错）：改过一次文件名后，浏览器标签一直停在改名前那篇的新名字。`document.title` 收成单一来源（`useEffect` 跟 `docName`），删掉 5 处手写标题；`scripts/host-save-acceptance.mjs` 三条断言同步改成与同一次读取的 `docName` 比对。E2E：打开 `键.md` → 改名 `键改.md` → 打开 `乙.md`，标题依次是 `键.md — Sidelight` / `键改.md — Sidelight` / `乙.md — Sidelight`。
- 同时删掉 `Ctrl+N` 新建路径里两行完全重复的「已新建 …」提示。
- 门禁：`npx tsc --noEmit` exit 0；`npm test` **27 个文件 345 条**全过（新增 `tilde.test.ts` 13 条 + `blankParagraphs.test.ts` 9 条 + `html.test.ts` +3 条）；`npm run roundtrip` rich 5/7、source 7/7；`.tmp/build-r40` + measure 首屏 gzip **290,723 B**（比第 39 轮 +702 B，`files=3`，内部 310,000 / 硬线 320,000，余 29,277 B，PASS）。
- UNVERIFIED（本轮）：多行 HTML 注释（`<!--\n…\n-->`）仍还原不了；注释内含 `&` 的仍不还原；同一段文字既写成真注释又用同一段文字讲转义时，讲转义那段仍会被改成真注释；列表项里的围栏与代码内容含仿围栏行；公式里的 `~` 仍会被序列化器转义成 `\~`；宿主窗口标题（`host/Program.cs` 没有 `document.title → Form.Text`）；`scripts/host-save-acceptance.mjs` 改动后未跑（需连 CDP 9222 且会写 `shots/round-06/`）；深色主题下的预览排版与真机缩放；1 MB 文档的 `mapOutsideCode` 耗时。

**第 41 轮（同一未发版区间）**

- **打开→保存不再把正文与代码里的 `<` `>` `&` 写成实体**（P1，静默改字节且保存风险门看不见）。序列化器对非代码文本调 `encodeHtmlEntities`（`& → &amp;`、`< → &lt;`、`> → &gt;`），而 `repairHtml` 只认得「完整标签形状」，于是 `a < b`、`x<3`、`A & B`、`a > b`、围栏里的 `if (a<b)`、行内代码里的 `<kbd>` 全部被改写；反过来讲转义的段落 `写成 &lt;div&gt; 才是字面。` 被还原成真标签。修法：`escapeHtmlForParse` 改走 `mapOutsideCode`（围栏与行内代码不转义，围栏内容才能原样写回）；`repairHtml` 在围栏/行内代码之外做**单遍**实体解码，带三条守卫——① 原文里真的写过这条实体就整类保持（讲转义的段落一个字节不动）；② `&amp;` 只在解出来的 `&` 不会自成实体时才解（`&amp;lt;` 保持，否则作者写的字面 4 字符会变成 1 个 `<`）；③ `&gt;` 落在块首（含引用/列表标记之后）时保持，否则会变成引用块标记。标签还原加名字守卫：原文里没写过该标签名就保持实体（`&lt;div&gt;`、`&lt;/div&gt;` 不再变成真标签）。`mapOutsideCode` 的回调加第二参数 `start`（绝对偏移），`lineStart` 在每行最开头累加，三支共用（`src/lib/codeScan.ts`、`src/lib/html.ts`）。
- **「还有没保存的改动」对话框开着时自动保存不写盘**（P1，用户点「不保存」内容仍留在盘上）。缺陷根因是 2 s 计时器捕获调度那一刻的 `runAutoSave` 闭包；只读 state 的守卫在对话框打开后仍看到旧值。改成五个条件全读 ref（`pendingSwitch` / `pendingConfirm` / `closeRequested` / `closeGuardOpen` / `settingsOpen`，一条 effect 统一同步），并加一条并集 effect：任一对开着就撤掉已排队的自动保存，全关掉且还脏就重新排队（`src/App.tsx`）。
- **查找加「区分大小写 / 整词」两个开关**（P1，用户可见收益）：`FindOptions` 加 `wholeWord`，`findAll` 按命中两端的 ASCII 词字符过滤（`state` 不命中 `states`；中文没有词边界，整词对中文等于不生效，按钮 `title` 写明）；`FindBar` 第一行加 `Aa` / `ab` 两个按钮，带 `aria-pressed` 与按下态样式（复用 `.find-bar button`）。开关只在会话内有效，不落盘。
- 风险门文案更正：`HTML 注释会被丢掉` → `HTML 注释的写法会被改动`（实际是写成实体，不是丢掉）。
- 门禁：`npx tsc --noEmit` exit 0；`npm test` **28 个文件 362 条**全过（新增 `risk.test.ts` 3 条、`html.test.ts` 改写 1 条 + 新增 16 条口径、`find.test.ts` +3 条、`package.json` 的 `scripts.test` 追加一条）；`npm run roundtrip` rich 5/7、source 7/7；`.tmp/build-r41` + measure 首屏 gzip **291,317 B**（比第 40 轮 +594 B，`files=3`，内部 310,000 / 硬线 320,000，余 28,683 B，PASS）。
- UNVERIFIED（本轮）：宿主 `close-request` 下的自动保存拦截（浏览器态没有 host，补测口径写进 `docs/iteration/round-41/impl.md`）；4 空格缩进代码块里的 `<` 仍会被转义（`mapOutsideCode` 只认围栏与行内代码，改前改后字节相同，不算回归）；「缩进 ≥4 的 ``` + 后面跟裸 HTML 行」这种混写文档会丢标签（改前保留实体文本，改后 `<div>` 被当 HTML 块，见 impl.md 已知限制）；多行/含 `&` 的注释与同一篇里既写实体又写裸 `&` 的混写文档；`scripts/data-safety-acceptance.mjs` 因 `.editor` 过期选择器在 148 行崩溃（AGENTS §8 已知的脚本问题，不是本轮回归，该套件记 UNVERIFIED）。独立验收证据见 `docs/iteration/round-41/test.md`（tester 自跑三个 E2E 脚本与全部门禁）。

**第 42 轮（同一未发版区间）**

- **修数据安全缺口：预览（只读）里能改正文并落盘**（P1）。预览下 `Ctrl+F` 后「替换 / 全部替换」可用，点下去正文立刻改、`dirty` 变 true，退出预览按 `Ctrl+S` 就写盘，旁边没有任何说明。现在 `FindBar` 的 `unavailableReason` 增第三态（预览），四个动作按钮置灰并显示说明；`replaceCurrent` / `replaceEvery` 各自第一行加 `if (previewMode) return` 兜底（`src/App.tsx`）。**可见代价**：预览里查找条整体锁住，命中计数不再显示、上一处/下一处不可用，与源码模式同一语义（只锁替换需要给 `FindBar` 加第三态并重写第 39 轮断言，排在下一轮）。
- **键盘正向离开正文**（P1，WCAG 2.1.2 键盘陷阱）：正文里按 `Esc` 把焦点移到正文之后的状态栏字数入口（`.status-bar .stats-trigger`，只打开只读面板、无副作用），Tab 不再被正文吞掉；不选页边批注卡片，因为卡片按钮是「采纳 / 忽略 / 联网核对」，误按 Enter 会改正文或发请求。新分支加 `event.isComposing || keyCode === 229` 守卫（组合输入期间不夺焦），并只加在这个分支，不改查找/设置/源码/预览既有的 Esc 行为。正文里 `Tab` 仍是插入两个空格（第 24 轮）。
- 工具栏 6 个格式按钮（H1/H2/B/I/S/行内代码）加 `aria-pressed` 与按下态 `.is-on`，复用既有 `.toolbar button.is-on` 样式（零新增 CSS）；I/S/`</>` 用组合类名保住原有的斜体 / 删除线 / 等宽打字样式。
- 表格工具条：7 个按钮补 `title`，删除三项加 `.is-danger` 用危险色，插入组与删除组之间加分隔线（`src/App.tsx`、`src/styles.css`）。
- 正文按键盘进入时不再套整列 2px 焦点框：`.doc-body:focus-visible { outline: none }` + `.doc-scroll:has(.doc-body:focus-visible) { box-shadow: inset 0 2px 0 0 var(--accent) }`，指示器钉在滚动容器上，长文滚到中段仍可见。
- **退出源码不再无条件整篇重解析**（P1 性能）：`applySource` 先判「源码框没动过 且 正文现在序列化出来就是这段」再决定是否 `setMarkdown`。判据必须用新抽出的 `serializeBodyNow()`——`currentMarkdown()` 在源码模式里返回 `sourceText`，拿它比会恒真、源码编辑被静默丢掉。`sl-parse-done` 物证：不改源码进出一次计数不变，改一个字再退出 +1。实测 `sourceToggle.outMs`：100 KB/1,024 段 **242 → 88 ms**、1 MB/1,024 段 **1,323 → 333 ms**、1 MB/4,096 段 **5,537 → 477 ms**（`sl-parse-done` 不再增加；剩余时间主要是 4k 段 DOM 重建）。
- 三个全文扫描型 repair 加精确守卫（都是必要条件，不是启发式）：`repairTildes` 查 `\~`、`repairCalloutMarkers` 查 `\[!`、`repairHtml` 查 `&lt;`/`&amp;`/`&gt;`。1 MB 实测每键：`repairTildes` 2.8 → 0 ms、`repairCalloutMarkers` 0.9 → 0 ms、`repairHtml` 1.6 → **0.6 ms**（独立验收实测两次都是 0.6；计划门槛 ≤0.6，三次 `includes` 各 0.2 ms 是必跑成本）、`serializeDocument` 合计 8.5 → **3.2–4.8 ms**（实施与验收两次实测）。
- 保存唯一出口补单测：新增 `src/lib/serializeDocument.test.ts`（10 条，假源 `{ getMarkdown }`，不引入 tiptap），覆盖尾部换行/CRLF 结尾、frontmatter 与注释脚注拼接、三条 repair 与原文实体守卫、表格块复用、连续空段落收口。
- 门禁：`npx tsc --noEmit` exit 0；`npm test` **29 个文件 372 条**全过（新增 `serializeDocument.test.ts` 10 条，`package.json` 的 `scripts.test` 末尾追加）；`npm run roundtrip` rich 5/7、source 7/7；`fidelity-acceptance` 19/19、`keyboard-acceptance` 52/52；`npm run verify` 首屏 gzip **291,766 B**（比第 41 轮 +449 B，内部 310,000 / 硬线 320,000，余 28,234 B，PASS）。
- UNVERIFIED（本轮）：真实中文输入法组合输入期间按 `Esc` 不夺焦、不丢拼音候选（CDP 造不出真 IME）；预览/源码锁定的组合在真机上的观感；`docs/iteration/round-42/impl.md` 记了 3 处与计划的偏差（`keyboard-acceptance` 改到全部改动后跑一次、T3 验收 2(c) 挪到 (b) 之前、`repairHtml` 实测优于 0.6 ms 门槛）。

**第 43 轮（同一未发版区间）**

- **预览（只读）真正只读：编辑命令一律无效**（P1，数据安全，续第 42 轮同一契约）。第 42 轮只锁了查找替换，同一契约下 `Ctrl+K`/`Ctrl+M`、工具条格式按钮、插入菜单与表格条仍会改正文并触发自动保存（改前实测：预览里点 H1 后 `h1` 1→2、`dirty:true`，2.6 s 后字节被写脏）。统一改成「`viewMode !== 'edit'` 就挡」：`run()` 加守卫（工具条格式 / 插入命令 / 表格条的唯一出口）、window `keydown` 的 `Ctrl+K` 与 `Ctrl+M`/`Ctrl+Shift+M` 先 `preventDefault()` 再给一条「先按 Ctrl+/ 或 Ctrl+Shift+P 回编辑」提示、`Ctrl+1–6`/`Ctrl+0` 静默早退、6 个格式按钮与「插入 ▾」加 `disabled`、表格条只在编辑视图渲染、`openMathAtCursorRef` / `openLinkAtCursorRef` 各自第一行加守卫、`switchView` 离开编辑时收起插入菜单（图片 / 公式 / 链接三项不走 `run()`）。`FindBar` 的替换、专注 / 打字机、表格条现在同一套只读口径。**可见变化**：预览与源码里 `Ctrl+K`、`Ctrl+M`、工具条格式 / 插入命令、表格条一律不可用（源码里点格式按钮不再改隐藏文档）。
- **预览按 `katexLazy` 的契约自行 `ensureKatex`**（防御性修复，不是「修好了公式卡死」）。`renderToString` 的契约是「未就绪返回空串、调用方先 await `ensureKatex()`」，预览是唯一没履约的调用方；`PreviewPane` 新增一条 `useEffect`（`hasMath && !ready` 时发起加载）。**口径**：正常路径由 `setMarkdown` 的预取覆盖，验收断言 9 **改前也是绿的**（`.tmp/e2e-r43-impl-t1.before.log`：`katex:2`、`pendingNote:0`）；真正卡死的是「在预览里按 `Ctrl+M` 插空公式」，该入口已被上一条守卫堵住。本条只锁契约，不得当作修复证据。
- **拖入 `.md` 不再静默失败、也不再导航**（P1）。改前 `dragover.defaultPrevented=true`（ProseMirror 挡了）但 `drop.defaultPrevented=false`，文档无变化、无提示。新增 window 级 drag 守卫：`dragover` 只在 `types` 含 `Files` 时 `preventDefault()`；`drop` 判 `event.defaultPrevented` 后让开（图片拖入由 ProseMirror 的 `handleDrop` 先接住），否则挡下并提示「拖入的文件不会直接打开：请用「文件 → 打开文件」（Ctrl+Alt+O）」。E2E：编辑区内与编辑区外都 `dropPrevented:true` + 提示、正文与 `location.href` 不变、`dirty:false`；下层已 `preventDefault` 的 drop 不弹提示。宿主 `OnNavigationStarting` 的导航取消本轮不做。
- **公式 / 链接弹层 `Esc` 只取消弹层**（P2，与第 35 轮 `FindBar` 同族）：`MathInlineEditor` 与 `LinkEditor`（两个输入框）的 `Escape` 分支补 `event.stopPropagation()`，一次按键不再既关弹层又退出源码 / 预览。E2E：弹层开着 → `Ctrl+Shift+P` 进预览 → 一次 `Esc`，`.link-editor` 0 且 `viewMode` 仍是 `preview`（改前是 `edit`）；编辑态 `Esc` 仍取消弹层（正对照）。
- **两个精确快路径 + 死符号清理**（P2，性能 / 内部质量）：
  - `classify` 归一化 CRLF 后加**精确等价短路**（`if (beforeText === afterText) return []`）：六个损失族与空行判定全部要求前后不同，相等时不可能有损失；省掉 `diffLines` 数空行（1 MB / 2,050 行实测 76.8 ms）。`risk.test.ts` 新增 5 条（表格+标题 / 脚注 / 公式+注释 / CRLF 归一 / 正对照，`npm test` 372 → 377 条）。**这 5 条改前也是绿的**（`risk.test.ts:14-17` 已有同型断言），只锁语义；快路径落地的正向证据是 `git grep -n "if (beforeText === afterText) return" -- src/lib/risk.ts` = 1。
  - `applySource` 把 `syncDocInfo(editor)` 移进 `if (!skipReparse)` 块：源码往返且正文一字未变时不再重算大纲 / 字数 / 当前章节（1 MB 约 24 ms）；`setDirty` 留在块外。E2E 正对照（改源码 → 回编辑）：大纲含新标题、`.stats-trigger` 11 字 → 12 字、`dirty:true`；跳过支（100 KB）：`sl-parse-done` 5 → 5、正文不变、`dirty:false`。**这一条改前也绿**（改前无条件跑），锁的是「条件写反」。
  - 删死符号：`App.tsx` 的 `serializeBody`（0 调用）与悬空注释、`session.ts` 的 `clearSession`（0 引用）、`App.tsx` 的 `serializeDocumentBody` import；`src/lib/serializeDocument.ts` 的 `serializeDocumentBody` **保留**（`scripts/fidelity-acceptance.mjs` 三条活引用，改后 `git grep` 仍 4 命中）。
  - 首屏口径注记：`scripts/measure-first-screen.mjs` 头注释与 `README.md` 写清尺子只数 `dist/index.html` 的静态引用，不含启动后立刻动态 import 的 `MarginRail-*.js`（gzip 2,327 B），实际首载 ≈ total + 2,327 B；不动 `--max/--target` 阈值。
- **发布文档与发现性**（P2）：
  - `README.md` 下载节新增 Windows 首次安装块：**先看 Microsoft WebView2 运行时**（Windows 11 自带；没有时安装器中止安装，给下载链接）、SmartScreen「更多信息 → 仍要运行」、默认安装路径与「开始菜单 / 卸载见 `packaging/README.md`（尚未人工验）」、Windows 可用的校验命令 `Get-FileHash` / `certutil`、便携包；macOS 校验行改成「校验（macOS）」。
  - `README.md` 查找替换句后加粘贴说明（`Ctrl+V` 保留格式、`Ctrl+Shift+V` 纯文本，浏览器原生键、桌面宿主未验证）；「现在不能做什么」的键盘边界补第四条（预览 / 源码里工具条格式、插入命令与表格条都不可用）。
  - 计数一次改齐：`README.md` 差距 **29/11 → 31/10**、`docs/typora-gap.md` 三处标题 `已经有的（30）→（31）`、`缺的（11）→（10）`、`编辑与格式（3）→（2）`、`AGENTS.md` 末句 `30 项有、11 项缺 → 31 项有、10 项缺`；`typora-gap.md` 搬一行「粘贴为纯文本」（标「浏览器原生键」）、列宽补「只在本次会话内」、视图缩放区分整页 / 正文字号、拖入行补第 43 轮现状。
  - `ShortcutsDialog` 加 `Ctrl+Shift+V` 行（标签写明「浏览器原生键」），文件头注释从「不写浏览器保留的组合」改成「浏览器原生键必须标注来源」。
- 门禁：`npx tsc --noEmit` exit 0；`npm test` **29 个文件 377 条**全过（`risk.test.ts` +5）；`npm run roundtrip` rich 5/7、source 7/7；`npm run verify` 首屏 gzip **292,046 B**（比第 42 轮 +280 B，内部 310,000 / 硬线 320,000，余 27,954 B，PASS）。
- UNVERIFIED（本轮）：真实拖入图片（合成的 `DataTransfer` 走不进 ProseMirror 的 `handleDrop`，只能验证「下层已 `preventDefault` 就不弹提示」）、宿主 WebView2 里的拖入与导航、`Ctrl+Shift+V` 在桌面宿主里的行为、真实中文输入法下弹层 `Esc`、首屏刻度外的 `MarginRail` 增量（按静态读数 ≈2,327 B 计）。

**第 44 轮（同一未发版区间）**

- **手打 `- [ ] ` / `- [x] ` 直接建任务项，保存写回 `- [ ] `**（P1，数据安全）。改前在无序列表里打 `- [ ] 甲` 只得到普通列表项，字面 `[ ]` 留在正文，`Ctrl+S` 后盘上是 `- \[ \] 甲`——反斜杠写进了用户的 `.md`。新增 `src/lib/taskListInput.ts`：输入规则只在 `bulletList > listItem` 里生效，把当前 `listItem` 换成 `taskList > taskItem`（列表前后各留一段，兄弟项一个字节不动），规则末尾必须字面空格（`\s` 会被 Enter 复用而误触发）。同时去掉 `TaskItem` 自带的输入规则（它在 `listItem` 里恒失败，却会在普通段落里把字面 `[ ] ` 变成任务项；现在单打 `[ ] ` 保持字面，与 Typora 一致）。E2E U1–U8 全过：任务项计数 / `data-checked` / 续写 / 回车续项 / `[x]` 勾选 / 保存字节 `- [ ] 甲乙`、`- [x] 已办`（无 `\[`）/ 三个负例（链接行、单打 `[ ] `、有序列表 `1. [ ] 甲`）/ 普通项不被吃掉。
- **深色主题下打印 / 另存 PDF 用浅底深字**（P1，用户可见）。`@media print` 原来只隐藏界面、没覆盖配色，深色用户打印得到 `rgb(233, 230, 224)` 的浅字落在白纸上。`src/styles.css` 的打印块加一组打印专用变量（三个选择器覆盖默认浅色 / 手动深色 / 跟随系统深色，`--paper`/`--paper-raised`/`--panel` 用纯白省墨），`src/lib/export.ts` 的导出模板加 `@media print` 块。E2E V1–V4：屏幕媒体下深色不变（`rgb(233, 230, 224)`）、打印媒体下 `rgb(29, 32, 35)` + `color-scheme: light` + `--paper: #fff`、还原屏幕不变、去掉 `data-theme` 后系统深色 + 打印仍是浅底深字。
- **只读视图里 7 个工具栏按钮与「分析本段」说清为什么不能点**（P2，用户可见）。预览 / 源码里这些按钮灰着，悬停只说功能名。现在编辑态是功能名（`插入：表格 / 代码块 / 引用 / 任务列表 / 分割线 / 图片 / 公式 / 公式块 / 链接`、`一级标题（Ctrl+1）` 等），非编辑态统一「只有编辑视图支持」；「分析本段」在非编辑态禁用并同样说明，空文档时提示「先写一句，或选中一段要分析的文字」（与 `Ctrl+Enter` 的 toast 同口径）。
- **模拟分析不再误报「模型没按约定格式回」**（P2，正确性）。`mockItems` 的单句分支缺 `meta`，而收尾只在收到 `meta` 时认为格式正常，于是任何短段落的模拟分析都会报一次格式错。单句分支补齐同一条意图说明（`src/lib/ai.ts`），`errorCopy.test.ts` +2 条。
- 门禁：`npx tsc --noEmit` exit 0；`npm test` **29 个文件 380 条**全过（377 + 导出 1 + 模拟分析 2）；`npm run roundtrip` rich 5/7、source 7/7；`npm run verify` 首屏 gzip **292,681 B**（比第 43 轮 +635 B，内部 310,000 / 硬线 320,000，余 27,319 B，PASS）；`keyboard-acceptance` **52/52**（tester 独立复跑，跑完已还原 `shots/round-05/`）。
- UNVERIFIED（本轮）：真实中文输入法下的 `[` / `]`（E2E 是 ASCII 注入）；真机「打印到 PDF」的产物（本机无打印机、宿主窗口起不来，只到 `emulateMedia({media:'print'})` 的计算样式层）；导出 HTML 在浏览器里打印的实测（只有按位置切片的单测）；`packaging/README.txt` 的那行改动本轮没有包可验。

**第 45 轮（同一未发版区间）**

- **刷新 / 重开恢复出来的文档，只切视图不再被误判成「有未保存改动」**（P1，数据安全）。改前用户一个字都没改，按一次 `Ctrl+/` 看源码，状态就变成脏：点另一篇弹「切换文档」三选一，按 `Ctrl+S` 会把恢复出来的正文另存成 `未命名.md`，用户以为改动已写回原文件。根因是恢复路径没留下「原文」——保存基线由整串原文生成（带尾换行），而源码模式兜底的 `serializeBodyNow()` 拿不到 `original`，两者只差一个 `\n`。现在 `useState` 恢复器多带一个 `raw`（整串，含 frontmatter 与脚注定义），首次载入 effect 与 `loadIntoEditor` 同口径写 `setOriginalText` / `rawTextRef` / 基线。E2E I1–I6 全过（14 条断言）：恢复后 `Ctrl+/` 恒 `dirty:false`、源码框与 `localStorage` 逐字节相同、切另一篇不弹框、真改一个字仍变脏（正对照）；**I5 走恢复分支**并断言源码框前 3 行是 `---` / `title: 丙` / `---`、末尾是 `丙的正文。\n`，用来守「误把 body 当 raw」（误用时 frontmatter 会整体消失）。**修的是「误判脏」，不是保存落点**：恢复态没有文件句柄时 `Ctrl+S` 仍走「在工作区根建 `未命名.md`」，这是第 28 轮的既定行为，本轮不动。
- **页边批注三处可见性**（P1 + P2×2，用户可见）。
  - 窄窗（≤1119px）抽屉遮罩从 `button` 改成 `div` + `role="presentation"`：原来它是 `<button>`，`button:hover:not(:disabled)`（特异度 0,2,1）压过 `.rail-backdrop` 的 `rgba(18,20,22,0.32)`，指针必然停在满屏遮罩上 → 整页正文被染成 `--accent-wash` 实色（预览态更直接是整屏空白，截图 3,835 B 纯色 → 修后 42,744 B）。改后计算背景 `rgba(18, 20, 22, 0.32)`、`elementFromPoint` 命中 `DIV.rail-backdrop`、`.doc-column` 字数前后相等、深色主题同值；键盘出口不变（抽屉「关闭批注」+ `Esc`）。
  - 预览 / 源码视图不再渲染「批注」开关（那两个视图本来就不渲染页边栏，开关带 `aria-controls="margin-rail"` 却指向不存在的节点）；切到非编辑视图时把抽屉状态收掉，避免只剩遮罩没有面板。
  - 修订卡的「→」回到行内流：`.note-diff` 由 `display:flex; flex-wrap:wrap` 改回 `display:block`，`.diff-arrow` 补 `margin: 0 4px`（JSX 三个 span 之间没有空白，这 4 px 是必需的）。箭头落在旧文末行或与新文同行都合格，断言用「主判据 + 反箭头独行守卫」两条同时成立；1440 与 1024 抽屉两处都过。
- **安装器三处**（P1 + P2×2，安装 / 体积）。`packaging/installer.nsi`：① `SetOutPath "$INSTDIR\www"` 之前加 `RMDir /r "$INSTDIR\www"`——原来每次升级都把上一版的整份 `www` 留在原地，每升一次 +3.85 MB；实测放一个旧 hashed chunk 后重装，改前 `staleChunkStillThere=True`、`www` 98 文件 / 3,853,094 B，改后 `False`、97 文件 / 3,848,092 B（等于 `dist`）。② 主节加 `SectionIn RO`，组件页里这一项灰选、不可取消（原来取消唯一必装节后安装器照常报成功、磁盘上什么都没有）。③ 加 `MUI_ICON` / `MUI_UNICON` / `Icon` 指向 `packaging\sidelight.ico`（与宿主 exe 同一份）：提取 32×32 图标算哈希，改后 `new == host`、`new != old`。
- 门禁：`npx tsc --noEmit` exit 0；`npm test` **29 个文件 380 条**全过（本轮不加单测，条数不变）；`npm run roundtrip` rich 5/7、source 7/7；`npm run verify` 首屏 gzip **292,707 B**（比第 44 轮 +26 B，内部 310,000 / 硬线 320,000，余 27,293 B，PASS；主 chunk 910,048 B raw / 284,889 B gzip）；`installer.ps1 -AssocDryRun` 实测 setup **1,304,634 B**（固定 `dist` 下连编两次同值；只写 `.tmp`，`release/` 三份文件 SHA256 开工前后逐字节相同）。
- UNVERIFIED（本轮）：`setOriginalText(raw)` 的**保存字节**效果无断言覆盖（恢复态无句柄，保存落点是 `.tmp` 的固有路径；源码框、`dirty`、`localStorage` 三样读数都不经过这个 state）——只与 `loadIntoEditor` 对齐口径，不承诺字节变化；组件页「取消勾选主节 → 装出空目录」的 UI 复现（向导点击不可脚本化，只有 NSIS 语义 + `SectionIn RO` 静态计数）；setup.exe 图标的真机观感（只到 32×32 提取哈希）；`typora-gap.md` / `typora-features.md` 3 处过期（按计划排下轮，本轮未改）。

**第 46 轮（同一未发版区间）**

- **卸载只删自己写的文件**（P1，数据安全）。`packaging/installer.nsi` 的卸载段原来是 `RMDir /r "$INSTDIR"`——目录页（`:48`）允许把安装目录指到任意已有目录，用户选成 `D:\Apps` 时卸载会把整个目录连同别人的文件一起删掉。现在按名单逐个 `Delete`（8 个载荷 + `assoc-plan.txt` + `host.log*` + `state\recent.json*` + `uninstall.exe`），`www\` 与 `webview2-data\` 仍递归删（整目录都是我们的 / WebView2 的），宿主状态目录只删自己的 `recent.json*` 再非递归删空目录，最后才非递归 `RMDir "$INSTDIR"`。实测（静默装到 `.tmp`，A/B 两段）：A 段放两个用户文件 + `host.log`/`host.log.1` + `state\{recent.json,mine.txt}`，卸载后 `keepMe=True herDoc=True userStateKept=True recentGone=True logGone=True`，目录只剩用户那三样；B 段干净目录（只放 `state\recent.json`）卸载后 `dirExists=False`。改前用旧包跑 A 段是 `keepMe=False herDoc=False userStateKept=False dirExists=False`。
- **发布链两道「别装错包」的门**（P1 + P2×2，安装）。① `installer.ps1` / `portable.ps1` 断言 `host\bin\Sidelight.exe` 的 FileVersion 等于 `package.json`（原来只验 setup 自己，而 setup 的版本本来就由 `package.json` 带入，stale `host\bin` 测不出来）：把 `package.json` 临时改 0.32.2 时两条都 exit 1 并打印「FileVersion 是 0.32.1.0，package.json 是 0.32.2」，改回 0.32.1 后 `git diff -- package.json` 为空。② `verify-installer.ps1` 开头打印 setup 的大小 / mtime / FileVersion 并与 `host\bin` 比批次，不同批记 UNVERIFIED（不再默默验旧包）；加 `-Setup <路径>`（相对路径按仓库根解析）与 `-PreflightOnly` 两个参数。实测默认的 `release/` 旧包报 `setup=824,595 B … FileVersion=0.31.1.0` + `UNVERIFIED … 装的是别的批次的包`、`preflight（1 UNVERIFIED）`；当轮新包 `0 UNVERIFIED`。③ `%LOCALAPPDATA%` 不可写时 marker 写不进只记 UNVERIFIED、不再抛错退出（受限环境原来一条断言都不跑）。`README.md` / `packaging/README.md` 不再写死安装包字节（每版都不同，只留「以 Release 页 `SHA256SUMS-<版本>.txt` 为准」）。
- **页边「整体评价」不再压住批注卡与模拟提示**（P1，用户可见）。卡片是绝对定位、纵向位置只按正文坐标算，页边栏自己的「未配置 API Key」提示与「我的理解」完全不参与，而面板 `position: sticky; bottom: 0` 停在栏中间当挡板：1440×900 下卡 0 与面板重叠 93 px（3 个按钮全被挡）、模拟提示与卡 0 完全重叠（50 px，一个字看不到）；窄窗抽屉里末卡按钮下半被切 28 px。现在 `App.tsx` 的 layout effect 先量出栏内流内内容底边（`flowBottom`）作为 `floor` 起点，再把「最后一张卡底 − flowBottom」作为 `railSpace` 传给 `MarginRail`，后者插一个 `aria-hidden` 的 `.rail-cards-space` 给面板让位；`.rail-overall` 加 `pointer-events: none`（head/body 仍 `auto`），抽屉里改用 `position: static`。实测 1440×900：卡 0 `top=262`、按钮命中 0 被挡（改前 3）、提示完整（`noticeBottom=249.97 < card0Top=262`）、门 A1/A2 全绿（滚到底 `lastCardBottom=298.5 < panelTop=310.97`）；抽屉 `panel.top=631.03 > lastCardBottom=619.03`（改前重叠 28）。已知残差：静止时末卡底部约 16 px 落在钉住的面板头后面（`795.5 − 779.4`），滚约 20 px 即可点——本轮只承诺「第 1 张卡静止可点 + 每张卡都能滚到不被覆盖」，消掉残差要走「面板改 static」（会改变长文档里的常驻行为），留给产品负责人拍板。
- **Mermaid 图跟着主题重绘**（P1，用户可见）。原来 `configure()` 只在首次加载后跑一次（`ensureMermaid()` 在 `mermaid` 非空时直接返回），缓存又只按代码 hash 分键：浅色下画好的图切深色后连线仍是 `rgb(51,51,51)`，落在 `rgb(28,31,35)` 的容器上对比度 **1.31:1**（WCAG 对图形对象要求 3:1）。现在：`ensureMermaid()` 早退分支也过 `configure()`、`configure()` 用 `appliedTheme` 守卫同主题不重复 `initialize`；新增纯函数 `resolveMermaidTheme(attr, prefersDark)` 与 `mermaidTheme()`，`system` 跟随系统深色；`renderDiagram()` 入口取一次主题供读、`await` 之后再取一次算写键（避免把浅色 SVG 写进深色键）；预览层缓存键改 `theme|hash`、widget `key` 带上 renderKey，插件装 `MutationObserver`（`data-theme`）与 `matchMedia` 的 change 监听，主题真变时才清缓存重建。实测浅色 `rgb(51,51,51)` → 深色 `rgb(211,211,211)`，对比度 **11.05**（文字 10.3），`previewCount` 仍 1、每个预览一个 svg，切回浅色回到原值；单测 +4 条 `resolveMermaidTheme`。
- 门禁：`npx tsc --noEmit` exit 0；`npm test` **29 个文件 384 条**全过（380 + 4）；`npm run roundtrip` rich 5/7、source 7/7；`npm run verify` 首屏 gzip **293,205 B**（比第 45 轮 +498 B，内部 310,000 / 硬线 320,000，余 26,795 B，PASS；主 chunk 285,359 B gzip）；`installer.ps1 -AssocDryRun` 实测 setup **1,305,407 B**（payload 0.32.1.0，只写 `.tmp`；`release/` 三份文件 SHA256 开工前后逐字节相同）。
- UNVERIFIED（本轮）：`system` + 系统主题变化的**真机**切换（沙箱不能改系统主题；只有纯函数单测 + `matchMedia` 代码路径）；`verify-installer.ps1` 的完整整跑（被第 21/22/25 轮就有的「运行中卸载 exit 0 但文件未删」挡住——定向跑里先 `FAIL 运行中卸载未按预期失败`，随后 `--version` 的 `Start-Process` 因 exe 处于 delete-pending 报 `Access is denied` 提前退出；「卸载残留」与「用户数据保留」两条改由 A/B 探针证明）；安装包字节每版都不同，不回填文档。

**第 47 轮（同一未发版区间）**

- **行内 HTML 白名单渲染**（P1，用户可见 / 核心功能）。改前 `<kbd>Ctrl</kbd>` 在正文里是字面文本（`kbd:0`），Typora 会渲染成键帽。现在 `kbd` / `mark` / `sub` / `sup` 四种**不带属性、成对、同一行、内容里没有 `<` 或 `&`** 的标签在编辑视图与预览里是真样式（`src/lib/inlineHtmlTags.ts` 的四个 mark + `src/styles.css` 的键帽 / 底色 / 上下标），保存写回原标签。解析路径的还原**前移到转义之前**（`escapeInlineHtml` 先把真成对标签换成占位符，再跑原来的 `<` 转义，最后换回）：转义后再还原会把作者本来写的 `&lt;kbd>` 实体改成真标签。E2E 四篇文档全绿：渲染篇 `kbd:3`（正文 1 + 表格单元格 1 + 列表项 1）/`mark`·`sub`·`sup` 各 1、围栏里 0 个、字面负例段（`<kbd class="x">`、单开、空对 `<kbd></kbd>`、`<kbd> </kbd>`）`kbd:0`、预览面板同样计数、**盘上字节与播种逐字节相同**（`diskSame:true`，`dirty:false`）；实体篇 `diskSame:true` 且 `kbd:0`；嵌套篇（`<kbd><mark>x</mark></kbd>`）`kbd:0`/`mark:1`/`diskSame:true`；行首篇 `mark:1`。Node 单测只能判「转义结果」与「手搓 doc → `manager.serialize` 写回原标签」（`按 <kbd>Ctrl</kbd> 加 Enter，看 <mark>重点</mark>、H<sub>2</sub>O、x<sup>2</sup>。` vs 不注册 mark 的 `按 Ctrl 加 Enter，看 重点、H2O、x2。`），**判不了浏览器里 mark 是否生效**（`@tiptap/markdown` 在 Node 里把 HTML 当字面文本）——真判据是 E2E。
- **反引号行内代码里的字符不再被智能标点改写**（P1，数据安全）。改前在编辑视图里打 `` `--flag` `` 得到 `` `—flag` ``、`` `a...b` `` 得到 `` `a…b` ``，`Ctrl+S` 把破折号写进用户字节。根因是反引号写法下 code mark 要等收尾反引号才建立，输入过程中的「已在代码里」守卫看不到它。新增纯函数 `hasUnclosedBacktick`（数未转义反引号，奇数即在代码里），守卫放在 `smartInput` 顶部，`lineBefore` 的取数从「只按 `-` / `.`」扩到一组会触发规则的键（引号、括号、`- . , ; : ? !` 与反引号）。E2E：源码与盘上都是 `` `--dry-run` `` / `` `a...b` `` / `` `grep "foo"` `` / `` `中文?` ``，普通段落 `甲 -- 乙` 仍变 `甲 — 乙`（回归）。
- **Mermaid 语法错误的图不再留在 `body` 下**（P1，用户可见）。改前语法写错后 mermaid 11.12 会把错误图塞进它自己创建、挂在 `body` 的 `#dmermaid-preview-N`：切到完全没有图的文档后还在，页高从 900 px 撑到 1013 px。现在 `initialize` 加 `suppressErrorRendering: true`，`renderDiagram` 用 `try/finally` 调新的 `removeMermaidContainer(id)`（依赖注入，Node 里不碰 `document`）。E2E 四步（坏图运行中 / 切到无图 / 好图 / 切回坏图）`[id^="dmermaid-preview-"]` 全为 **0**、`body` 里没有 `Syntax error in text`、`scrollHeight` 回到 **900**、好图 `.is-ready` 的 svg 仍 1 个。
- **补第 38 轮的 UNVERIFIED：工作区插图后立刻显示**（P1，验证）。产品侧本来就写了「先 `resolveAsset` 再插节点」，但假盘把 Blob 当 UTF-8 文本解码，写进去的 PNG 字节已坏，所以一直没有真证据。假盘 `createWritable()` 改成二进制安全：**只对「`Blob` 且 MIME 非 `text/*`」**存 `data:<type>;base64,`，`ArrayBuffer` / 视图仍按文本存（trash 的删除与撤销走 `ArrayBuffer`，改了会让既有 E2E 假红）。E2E：`.ProseMirror img` 1 个、`src` 是 `blob:`、`naturalWidth/naturalHeight` 各 **1**、`complete:true`；假盘 `assets/<时间戳>-shot.png` 是 `data:image/png;base64,…` 且解码前 8 字节为 PNG 魔数 `89 50 4e 47 0d 0a 1a 0a`；`Ctrl+S` 后 `.md` 写 `![shot.png](assets/…)` 且不含 `data:image`；切走再切回图仍 `naturalWidth:1`；`consoleErrors:[]`、失败请求 0。
- 门禁：`npx tsc --noEmit` exit 0；`npm test` **30 个文件 400 条**全过（384 + 行内 HTML 10 + 智能标点 4 + Mermaid 2）；`npm run roundtrip` rich 5/7、source 7/7（`docs/roundtrip-report.md` 无改动）；`npm run verify` 首屏 gzip **293,751 B**（比第 46 轮 +546 B，内部 310,000 / 硬线 320,000，余 26,249 B，PASS；主 chunk 912,306 B raw / 285,826 B gzip）。
- 文档：`docs/typora-gap.md` 把「行内 HTML 渲染」从「缺的」移进「已经有的」（**32 项有 / 9 项缺**，编辑与格式 2 → 1），「高亮、上下标、TOC、emoji」改成只差 `==高亮==` / `^上标^` / `~下标~` 语法与 TOC / emoji；`README.md` 的能力句、测试计数与差距计数同步；`AGENTS.md` 的能力句、测试计数与差距计数同步。
- UNVERIFIED（本轮）：真实宿主（WebView2）里的行内 HTML 渲染与插图（本会话是非交互沙箱，宿主窗口起不来，只到浏览器 + CDP）；真实中文输入法下的反引号行内代码直击键（E2E 是 `keyboard.type` 的 ASCII 注入）；`<kbd>` 出现在 HTML 导出里的观感（导出走 `editor.getHTML()`，与预览同源，本轮只断言了预览面板）；同一文档里「真标签 + 字面实体」混排时的字节变化（既有 `repairHtml` 的 `source.includes` 守卫导致，改前改后同值，非本轮引入）。安装包字节不回填文档（以 Release 页 `SHA256SUMS-<版本>.txt` 为准）。

**第 48 轮（同一未发版区间）**

- **表格单元格里的块级命令一律拦下**（P1，数据安全）：改前在单元格里按 `Ctrl+2` 造出 `<h2>`，`Ctrl+S` 把 `## 一` 写进单元格、重开变成字面文本；`Ctrl+Shift+L` 还会顺手删掉一整行（同时开关侧栏）。工具条 H1/H2 与「插入」菜单的表格 / 代码块 / 引用 / 任务列表 / 分割线走同一条命令；公式块（`$$…$$`，`group:"block"`）经「插入 → 公式块」与 `Ctrl+Shift+M` 能无声塞进单元格，单元格里打 `$$` 再回车经 `mathInput` 的 Enter 快捷键也能造 blockMath。新增纯函数 `inTableAncestry`（`src/lib/tableScope.ts`，无 PM 依赖、可 Node 单测）；`handleKeyDown` 复用同一判据，`Ctrl+L` 删行补 `!shiftKey && !altKey`；新增 `selectionInTable` / `guardBlockInTable`，标题分支、工具条 H1/H2、插入菜单 5 条块级命令、`openMathAtCursorRef` 的块级公式守卫（插在「光标落在已有公式上」的早返回**之后**）全部走它；`mathInput.ts` 的 Enter 命中表格时 `return true`（吞掉回车、不插入）并回调提示。E2E（CDP 9222 + 假工作区）：`Ctrl+Shift+L` 行数 3→3、侧栏 false→true→false、盘上逐字节不变；`Ctrl+L` 2（正对照）、撤销回 3；单元格 `Ctrl+2` / 工具条 H1 / 插入→代码块 / 插入→公式块 / `Ctrl+Shift+M` 五种入口全部 `headingInCell:0`、`preInCell:0`、`blockMathInCell:0`、`blockMathAll:0`、`mathPopups:0`、提示含「表格」、`diskSame:true`、重开单元格仍是 `甲/乙/一/二`；单元格里打 `$$` + 回车 `blockMathInCell:0`、盘上该行 `| $$  | 二   |`（无 `<br>`）；正对照：表格外 `Ctrl+2` 出 `h2`、单元格 `Ctrl+B` 出 `<strong>x</strong>`、`Ctrl+M` 出 `inlineMathInCell:1`（行内 mark 与行内公式不误伤）。
- **源码改字保存后回编辑不再假脏**（P1，数据安全）：改前源码里改一个字 → `Ctrl+S`（`dirty:false`）→ `Ctrl+/` 回编辑 `dirty:true`（正文与盘上一致），再按一次 `Ctrl+S` 是一次空写盘。根因是三处判据不同源：`prepareSave` 会把「原文以换行结尾而正文没有」补一个 `\n` 写进基线，`applySource` 与源码模式的脏判断却拿未补的串去比。新增纯函数 `normalizeForBaseline`（`src/lib/baseline.ts`），三处都换成它（`prepareSave`、`applySource` 的 `setDirty`、源码模式 `setDirty`）；`skipReparse` 判据一字未动（补换行会让它恒 false，1 MB 文档会退回整篇 reparse）。E2E：`甲.md`（原文以换行结尾）源码加「加一句。」保存 → 回编辑 `dirty:false`、再保存 `changedOnSecondSave:false`；`乙.md`（原文不以换行结尾）同路径 `dirty:false` 且盘上无末尾换行；一个字都不改进出源码 `dirty:false` 且 `sl-parse-done` 计数 3→3（不整篇重解析）；编辑视图打字 `dirty:true`、撤销回基线 `dirty:false`。
- 门禁：`npx tsc --noEmit` exit 0；`npm test` **32 个文件 414 条**全过（400 + `tableScope` 8 + `baseline` 6）；`npm run roundtrip` rich 5/7、source 7/7（`docs/roundtrip-report.md` 无改动）；`npm run verify` 首屏 gzip **294,123 B**（比第 47 轮 +372 B，内部 310,000 / 硬线 320,000，余 25,877 B，PASS；主 chunk `index-Bx-dU1eB.js` 913,110 B raw / 286,198 B gzip）。
- 文档：`README.md`、`docs/iteration/STATE.md`、`AGENTS.md` 九处数字订正（测试 30 文件 400 条 → 32 文件 414 条、首屏 293,751 → 294,123、余量 26,249 → 25,877、主 chunk `第 45 轮 910,048 B raw` → `第 48 轮 913,110 B raw（index-Bx-dU1eB.js）`、`第 30–47 轮` → `第 30–48 轮`、`第 47 轮 npm run verify` → `第 48 轮`、首屏历史链补 `→ 48 轮 +372`）；`.tmp/iteration/common.md` 的安装包预算行同步成 45,000,000 / 50,000,000（本地文件，不进提交）。
- UNVERIFIED（本轮）：表格单元格里**手打** `# ` / `> ` / `- ` 仍会经输入规则造块级节点（本轮只封命令入口，下轮做）；粘贴带标题 / 代码块的 Markdown 进单元格未实测；宿主 WebView2、真实 IME、`Ctrl+Alt+L`（AltGr）、125%/150% 缩放。

**第 49 轮（同一未发版区间）**

- **命名 HTML 实体保存时不再被二次转义**（P1，数据安全）：改前打开一篇写着 `甲&nbsp;乙` 的 `.md`，按一次 `Ctrl+S` 盘上就变成 `甲&amp;nbsp;乙`（多 4 字节、无任何提示）——`&nbsp;` 是不换行空格，`&amp;nbsp;` 是 6 个字面字符，GitHub / Typora / Obsidian 打开会显示字面 `&nbsp;`；表格单元格 `| a&nbsp;b |` 与手写的整行 `&nbsp;` 空段落同样中招。现在 `repairHtml` 在 `source !== null` 时用 `mapOutsideCode` 扫一遍原文，按**出现次数**记下代码外的真实体（`&nbsp;` / `&copy;` / `&hellip;` 这类命名实体），本稿同名 `&amp;<名>;` 的条数与原文一样多才逐一解回；原文里用 `&amp;<名>;` 讲转义时该名字保守地整条保持；解析层自己会解码的 `amp` / `lt` / `gt` / `quot` / 数字实体不参与计数（否则手打的字面 `&lt;` 会被解成真 `<`）。单测 +9 条；E2E e1–e7 全绿（e1 `disk === seed` 且 `stable2:true`、e5 表格重开仍是 1 张表、e7 正文里另有字面 `&amp;` 也 SAME；e2 的数字实体按既有口径解码、`same:false` 已在报告写清原因）；1 MB 文档 908 处 `&nbsp;` 一次往返逐字节相同，`repairHtml` 13.8–16.0 ms（无 source 4.2–6.3 ms）。
- **`<mark>` 高亮可见 + 代码块字号 + Mermaid 错误色 + 按钮 24 px**（P2，用户可见）：`<mark>` 的底原来与纸底 1.04:1、与行内代码底 1.01:1（第 47 轮刚能渲染，实际等于看不见），现在改用新 token `--mark-bg`（浅 `#f0e0bd` / 深 `#453618`，四处主题块都有，打印块给浅色），对纸底的 RGB 距离浅 53.3 / 深 57.2、对行内代码底 51.2 / 41.8，字对比度 12.55:1 / 9.4:1；代码块字号 12.72 → 15.3 px（`pre` 0.86em → 0.9em、`pre code` 继承），不低于行内代码的 14.79 px 且仍小于正文 17 px；Mermaid 错误提示改用 `var(--danger)` + `color-mix` 边线（浅 5.36:1 / 深 6.92:1，改前深色 3.03:1）；查找条与表格工具条的 7 个按钮都加 `min-height: 24px`（23 → 24，宽度 25.4–66 px 按实测记录，两条条子都不换行、不横向溢出）。侧栏页签 hover 复测：非当前页签 hover 后背景变 `--accent-wash`、文字变 `--accent-ink`，**本来就没有缺陷**（finder 那次 hover 的是当前页签，`is-active` 与全局 hover 同特异性且在后），本轮不改 CSS。
- **中文上下文里 `--` 出 `——`**（P2，用户可见）：改前打 `--` 只得到一个 `—`（半个中文破折号），要 `----` 才凑出 `——`。现在光标**紧邻**汉字（前一个字符或后一个字符是汉字）时产出 `——`，空段落 / 纯 ASCII / 空格隔开仍是一个 `—`（`甲 -- 乙` → `甲 — 乙`，第 47 轮口径不变）；这也是为保住空段落 `---` + 空格出分隔线（HorizontalRule 的输入规则靠 `—-`）。单测 +2 条（6 个断言）；E2E：编辑视图 / 源码 / `Ctrl+S` 盘上都是 `中文——中文`，`word--word` → `word—word`，`甲 -- 乙` → `甲 — 乙`，空段落 `---` / `***` + 空格仍出分隔线，手打 `| --- | --- |` 与围栏里打的 `a--b--` 原样。
- 门禁：`npx tsc --noEmit` exit 0；`npm test` **32 个文件 425 条**全过（414 + 实体 9 + 破折号 2）；`npm run roundtrip` rich 5/7、source 7/7（`docs/roundtrip-report.md` 无改动）；`npm run verify` 首屏 gzip **294,373 B**（比第 48 轮 +250 B，内部 310,000 / 硬线 320,000，余 25,627 B，PASS；主 chunk 913,822 B raw / 286,419 B gzip）；`keyboard-acceptance` **52/52**（跑完已还原 `shots/round-05/`）。
- 已知限制（本轮不修）：`&#8212;` 这类**数字实体**在打开时被解析层解码成字符，重新保存字节会变（渲染不变，`README.md` 已写）；`source` 是整个文件（含 frontmatter 与脚注定义）而 `markdown` 只有正文，计数口径在极罕见情形下不齐；同一名字既有原文真实体又有手打的字面实体时，条数不齐就整类保持（该文件里的 F1 不修，但不改用户字节）；`，--` 这类全角标点紧邻的 `--` 仍是一个 `—`（`CJK` 只认汉字 / 假名 / 谚文）。
- UNVERIFIED（本轮）：真实宿主 WebView2 里的实体往返；真实磁盘 / 网络盘 / OneDrive 写回的字节；系统级深色（`prefers-color-scheme: dark`）下 `--mark-bg` 的观感；真实彩色打印 / 另存 PDF 里 `<mark>` 的新底色；真实中文输入法下 `--` 的产出（无 IME 自动化）；1 MB 文档在**应用内**一次 `Ctrl+S` 的耗时（只有 `repairHtml` 的 Node 读数）。

**第 50 轮（同一未发版区间）**

- **预览与 HTML 导出保留脚注续行**（P1，数据安全）：`renderFootnotes` 原来逐行 `filter(line => line.startsWith('[^'))`，缩进续行 `    续行接着写` 被丢掉——只读预览的「注释」与 HTML 导出的 `<li>` 都只剩第一行（原文件不变，用户看到的与交出去的成品比原文少一行）。现在先切条目再拼行：定义行开新条、缩进续行（4 空格或 tab，与 `footnotes.ts:3` 同一套判据）接当前条、块内空行不结束当前条、`[label]:` 引用定义与正文行结束当前条，续行用 `<br>` 连接（逐行转义后再拼）。`export.test.ts` +4 条（单条续行、多条续行、引用定义隔离、定义+空行+续行）。
- **导出 Markdown 走保存同一差异门**（P1，数据安全）：脚注定义不在文末的文档 `Ctrl+S` 会弹「保存前确认」，同一篇「导出 → Markdown」却静默写出改写后的正文。现在 `exportAs` 的 markdown 分支用 `activeLosses` 判一次，有损失时给**持久**提示（不弹模态框，导出照旧写出）：标签走新参数 `lossLabels(losses, true)`，把「在保存后」换成「在导出后」、「保存时」换成「导出时」；提示带「知道了」按钮，是唯一关闭入口（`Esc` 不清提示）。E2E：`fn-mid.md` 导出后无对话框、提示含「脚注 [^1] … 在导出后会消失」、6.5 s 后仍在、点「知道了」消失；`fn-end.md` 对照无提示无按钮。
- **「全部替换」按文本节点批量提交**（P1，性能）：1 MB / 39,936 命中点一次「全部替换」原来卡 51.8 s 的 `view.dispatch`（第 48 轮基线；本轮改前实测 **46,637 ms / 39,936 步**）。现在按文本节点分组，一个文本节点一个 `replaceWith` 步骤（1,024 段 → 1,024 步），文本算术抽成纯函数 `src/lib/replaceRanges.ts` 的 `applyReplacements`（+3 条单测、已进 `npm test`）。改后 **519.7 ms / 1,024 步**（−98.9%）；100 KB 档 **614.7 → 89.6 ms**（4,096 → 1,024 步）；`Ctrl+Z` 一次全回、正文长度不变量（`docChars === docChars0 − matchCount`）成立、替换词继承原 `marks`（粗体不丢）、跨文本节点命中整单退回旧路径（`甲**乙**丙` 查 `甲乙` → `Q丙`）。**两条语义守卫**：相邻命中重叠（`aaa` 里查 `aa`）整单退回旧路径，结果与今天一致；被批注盖住的文本节点也退回逐条替换——整节点替换会把节点内的批注区间一起映射塌（实测 `.annot` 1 → 0、store 被清空），批注 E2E 现已 PASS（替换后批注存活、位置 3–5 → 2–4、`Ctrl+Z` 回 3–5）。
- **排版与点击区一批**（P2，用户可见）：`h4` 之前落 UA 默认、与 `strong` 完全同形（17 px / 700），现在 1.08em（18.36 px）/ 600 / 行高 1.45；`h2`/`h3` 补显式行高 1.35 / 1.4（继承 `.doc-body` 的 1.95 时两行 H2 行盒间隔 44 px，现在 30.29）；空稿占位符与正文同一条排版链（`padding: 0`、`font-family: var(--font-read)`、17 px、行高 1.95；改前是 16 px `Segoe UI` / 行盒 21 px，键入第一个字时换字族、基线跳约 6 px）；工具栏 11 个按钮统一 24 px、`</>` 字号 11 → 12 px（规则收紧到 `.toolbar-group > button`，`插入 ▾` 下拉 9 项仍是 30 px / 左对齐，不被压扁）；状态栏字数按钮点击区 16 → 24 px 并加 `aria-label="字数明细"`。
- 门禁：`npx tsc --noEmit` exit 0；`npm test` **33 个文件 432 条**全过（425 + 导出 4 + 替换区间 3）；`npm run verify` 首屏 gzip **294,913 B**（比第 49 轮 +540 B，内部 310,000 / 硬线 320,000，余 25,087 B，PASS；主 chunk `index-xYcRGlyW.js` 915.27 kB raw / 290.31 kB gzip）；本轮没动 Markdown 序列化，`roundtrip` 未跑。
- UNVERIFIED（本轮）：真实宿主 WebView2 里的预览/HTML 导出脚注与导出提示；真实磁盘 / 网络盘上的「全部替换」响应（dev server + 假工作区）；生产构建下的「全部替换」读数（dev + StrictMode 口径）；真实中文输入法下的占位符切换；系统 150% / 200% 缩放下的工具栏 24 px 与状态栏点击区；打印 / PDF 输出下的 h4 与标题行高。

**第 51 轮（同一未发版区间）**

- **保存不再每次整篇读回旧文件、无改动不再写盘**（P1，性能 + 数据安全）：1 MB `big.md` 打一个字 `Ctrl+S`，`File.text` 读全文 **0 次**、`createWritable` **1 次**，磁盘含新字（1,648 ms）；紧接着再按一次 `Ctrl+S` 四个计数全 0 并提示「没有改动，未写入。」。`rememberDisk` 在 6 个入口记下磁盘快照（正文 + UTF-8 字节数 + mtime），保存前只有三样全中才复用，否则读全文；空文件的 `''` 是有效正文（打「甲」保存 `text=0`），外部改过盘（字节数 / mtime 对不上）时读全文再写；`requestSave` 的新门只在 `goal==='file'` 且读同步 `dirtyRef`，「另存为」永不过门（不动字点另存为仍写盘）。`performCommit` 在 target 存在且 `normalized===baselineRef` 时直接返回，不进 `finishSaved`。新增 `src/lib/saveDisk.ts` + 8 条单测。
- **整页缩放（`Ctrl+Shift+=` / `-` / `0`、`Ctrl+滚轮`）**（P1，用户可见）：`--page-zoom` 是无单位倍数，`#root` 的 `zoom` 与 `height: calc(100vh / 倍数)` 一起缩；`--editor-size` 完全不动（三次放大后仍 17 px，`Ctrl+=` 才是 17→18 px）。键位用 `event.code`（`Ctrl+Shift+=` 的 key 是 `+`、`Ctrl+Shift+-` 是 `_`，旧分支接不住），排在字号两条之前；`Ctrl+滚轮` 100 ms 节流并 `preventDefault`。实测 1.1 / 1.2 / 1.3 → 1.2 → 1，100/110/120% 无横纵滚动条，刷新后仍 120%，设置持久化 `pageZoom`（clamp 50–200，旧存档读出 100）；快捷键对话框补三行。
- **视图四钮有 `aria-pressed`**（P2，可访问性）：专注 / 打字机 / 源码 / 预览加 `aria-pressed` 与容器 `role="group" aria-label="视图"`，源码 / 预览互斥；全文 `aria-pressed` 6 → 10。`scripts/data-safety-acceptance.mjs` 三处过期选择器 `.editor` → `.ProseMirror, .source-editor` 修好（含「回到富文本编辑」），脚本从卡住恢复到 20 PASS（其余 5 条过期期望见 `docs/iteration/round-51/test.md`）。
- 门禁：`npm run verify` PASS，首屏 gzip **295,476 B**（比第 50 轮 +563，内部 310,000 / 硬线 320,000，余 24,524）；`npm test` **34 个文件 442 条**全过（432 + `saveDisk` 8 + `settings` 2）；本轮未动 Markdown 序列化，`roundtrip` 未跑。
- UNVERIFIED（本轮）：写盘期间切换 / 删除的回滚分支（假 FSA 造不出写盘期身份变化）；真实磁盘 `lastModified` 粒度（NTFS 1–2 s）下的同秒外部改动；宿主 WebView2 内的 `Ctrl+滚轮` 缩放；真实 IME 组合输入下的 `Ctrl+Shift+=`。

**第 52 轮（同一未发版区间）**

- **1 MB 多节点载入 110.9 s → ≤3 s**（P1，性能）：根因是 marked 在每个块位置都调 table / taskList tokenizer，而它们的 `start` / `tokenize` 一进来就 split 整篇（O(n²)）；新增 `src/lib/markdownFastPath.ts`，只加「表格看前两行、任务列表看头 2048 字符的第一个非空行」的等价守卫，命中才调原实现，不换依赖、不改解析语义。同脚本同 seed（`.tmp/e2e-r51-b1.mjs`）实测 1,000,012 字符 / 44,446 块：`ready` 112,560 ms → **2,947 ms**，100 KB **1,130 ms**（门槛 3,000）；顶层节点 44,446 / 4,648、首末段与正文长度逐字不变；`roundtrip` rich 5/7、source 7/7。
- **F11 全屏**（P1，用户可见）：页面走 `requestFullscreen` / `exitFullscreen` 并用 `document.documentElement.dataset.fullscreen` 回写状态；桌面宿主接 `ContainsFullScreenElementChanged` 跟切窗口边框与最大化并还原，同时关掉 WebView2 原生 Ctrl+滚轮缩放（`IsZoomControlEnabled = false`），避免与应用内整页缩放成双轨。浏览器态实测 `false → true → false` 往返、`fullscreenElement` 同步，快捷键表补 F11 一行；宿主内未实测。
- **表格单元格手打块级标记不造块**（P2，数据安全）：`editorProps.handleTextInput` 只在「块首标记 + 空格」这一下自己插字，单元格里 `# ` / `> ` / `- ` 保持字面文本（每格仍 1 个 `p`，`Ctrl+S` 后源码含字面标记、重开表格 3 行不变），正文里照常造 heading / blockquote / list；工具栏「表格单元格里不能用命令插入…」提示仍在。
- 门禁：`npm run verify` PASS，首屏 gzip **296,055 B**（比第 51 轮 +579，内部 310,000 / 硬线 320,000，余 23,945）；`npm test` **34 个文件 442 条**全过；`roundtrip` PASS；`keyboard-acceptance` 51/52、`bigfile-acceptance` 2/3，两条 FAIL 均为旧脚本断言过期（第 51 轮 ttl 1.5 s 提示、5.5 MiB 文案早已改），非本轮回归，见 `docs/iteration/round-52/test.md`。
- UNVERIFIED（本轮）：真实宿主窗口里的 F11 进出全屏与宿主 Ctrl+滚轮；真实 IME 下的表格块级标记与 F11；改后热点 profile 未另取样（top 3 沿用改前 `.tmp/r51-b1-prof.json`）。

**第 54 轮（同一未发版区间）**

- **拖入 `.md` / 文件夹直接打开**（B-003）：`drop` 的同步段取 `getAsFileSystemHandle()`；有文件句柄走 `fileFromHandle`（5.5 MiB 与 `.md` 门槛同「打开文件」），没有句柄走 `fileFromDrop`（正文可读，保存只能另存为），目录句柄走 `workspaceFromHandle` 并切到文件页签；图片等非 Markdown 仍只给旧提示。顺手修掉窗口 `drop` effect 依赖 `[show]` 造成的脏文本静默替换——脏文档拖入现在弹「切换文档」三选一，取消仍留在原篇。新增 `src/lib/workspace.test.ts`（7 条）。
- **整页缩放不再横向溢出 + 比例可见**（B-014、B-113）：`.app` 的 `min-width` 改为 `calc(1120px / var(--page-zoom, 1))`，1440×900 下 100 / 130 / 150 / 180 / 200% 的 `documentElement.scrollWidth-clientWidth` 全为 **0**（改前 0/26/250/586/810）；状态栏在 ≠100% 时显示「缩放 N%」，点一下回 100%；`Ctrl+Shift+=` / `Ctrl+Shift+-` / `Ctrl+Shift+0` 也给「页面缩放 N%」提示（`Ctrl+=` 仍是正文字号）。
- 门禁：`npm run verify` PASS，首屏 gzip **296,610 B**（比第 52 轮 +555，内部 310,000 / 硬线 320,000，余 23,390）；`npm test` **35 个文件 449 条**全过。
- UNVERIFIED（本轮）：真实拖放带出的 FSA 句柄（拖真文件后 `Ctrl+S` 写回原文件、拖真文件夹开工作区树）与多文件只开首个；宿主 WebView2 窗口内的 130%–200% 整页缩放与 `Ctrl+滚轮`。

**第 55 轮（同一未发版区间）**

- **`==高亮==` / `^上标^` / `~下标~` 快捷语法**（B-101）：新增 `src/lib/inlineSyntax.ts`（`eqHighlight` / `caretSup` / `tildeSub` 三个专用 mark + 三个 marked 行内 tokenizer），`src/lib/tilde.ts` 在原有的单 `~` 守卫同一次 `use()` 里注册；设置面板加「快捷行内语法」开关，**默认关**（旧存档读成关）。关着这些符号按字面保存；开只改解析，不重建编辑器，已打开的正文不重排，下一次打开/拖入才生效。行内 HTML 白名单的 `<mark>` / `<sub>` / `<sup>` 路径不变。新增 `src/lib/inlineSyntax.test.ts`（9 条）；`scripts/roundtrip.mjs` 补 `inlineMarks` 与新样本 `fixtures/markdown/08-inline-html.md`。
- **主题体系 MVP：一套内置「暖纸」主题**（B-105）：新增 `src/lib/themes.ts` 清单（id + 显示名 + 变量表），`src/styles.css` 加 `html[data-theme='sepia']` 完整变量块，跟随系统媒体查询排除 `sepia`（系统深色不吃掉暖纸纸底）；设置面板在三档模式之后追加内置主题按钮，选中即时预览、取消还原。新增 `src/lib/themes.test.ts`（4 条，含「清单值 = CSS 值」与对比度）。
- **差距表计数与拆行修正**（B-112、B-117）：`docs/typora-gap.md` 表头改为「已经有的（35）」/「缺的（7）」，行数与子节计数逐项对上；`==高亮==` 三行从「缺的」移入「已有」，原并在一行的 TOC / emoji 单独成行；`README.md` 与 `AGENTS.md` 的 32/9 口径改 35/7；整页缩放口径改 50–200%；全屏只写「`F11` 有入口，宿主内未验」。
- 门禁：`npm run verify` PASS，首屏 gzip **297,656 B**（比第 54 轮 +1,046，内部 310,000 / 硬线 320,000，余 12,344）；`npm test` **37 个文件 462 条**全过；`npm run roundtrip` PASS（rich 6/8、source 8/8，新样本 08 完全保真）。
- UNVERIFIED（本轮）：开时的写回字节用应用内「导出 Markdown」取 Blob 验（与保存共用序列化链），未经真实磁盘/FSA 保存；宿主 WebView2 里的暖纸主题与 `F11`；真实中文 IME 下的 `==` / `^` / `~` 逐键表现。

**第 56 轮（同一未发版区间）**

- **行内定界符守卫**（B-119）：`==` / `^` / `~` 的 `whole` 加 flanking（开定界符后、收定界符前不贴空白），连续符号段（`===` 起、`^^`）整段按字面吃，`~` 仍留给删除线；修掉开态把 `==== 与 ==不闭合`、`a ^ b 与 c^d` 解析成 mark、`Ctrl+S` 吃掉字面 `==` 的问题。设置面板提示改「成对且不贴空白才解析」。`src/lib/inlineSyntax.test.ts` +5 条（修前 5 红，修后 14/14）。
- **逐键脏判定去全文序列化**（B-116）：`onUpdate` 同步路径只置 dirty，与保存基线的全文比较挪进 300 ms 回调（撤销回原样仍自动变干净，保存链仍读 `dirtyRef`）。同一窗口 A/B：100 KB p95 50→39 ms、1 MB 234→154 ms（对计划基线 66 / 252 为 −41% / −39%）；1 MB 载入 5 条 mark 1.15 s；`.dirty` 1 ms 出现、撤销 334 ms 消失、`Ctrl+S` 判据与「没有改动，未写入。」不变。残值 100 KB p95 40 / 1 MB p50 148 均 ≥ 原绝对门槛，按计划只记新基线。
- 门禁：`npm run verify` PASS，首屏 gzip **297,719 B**（比第 55 轮 +63，内部 310,000 / 硬线 320,000，余 12,281）；`npm test` **37 个文件 467 条**全过；`npm run roundtrip` PASS（rich 6/8、source 8/8）。
- UNVERIFIED（本轮）：真实 FSA/磁盘保存字节（e2e 用打桩 picker）、真实中文 IME 逐键、逐键 p95 的跨窗口可比性（不同窗口基线 66/252 与 50/234）、宿主 WebView2。

**第 57 轮（同一未发版区间）**

- **宿主 `/__asset` 图片端点**（B-004）：新增 `GET /__asset?path=…`，只回当前文档所在目录下的位图；`MimeMap` 补 `.jpg/.jpeg/.webp/.gif/.bmp`，另用白名单只发这六种（SVG 能在宿主 origin 跑脚本，不给）。`../`、`%2e%2e%2f`、绝对路径、反斜杠、盘符一律 403，非位图 404，无 CORS，响应统一 `no-store`。前端 `assetResolve.ts` 新增 `hostAssetUrl()`（越界口径与 FSA 路径一致），`App.tsx` 的图片解析器在宿主单文件文档（`hostDoc.ready`）下改走 `/__asset`，与工作区 FSA 解析器写在同一个 effect 互斥。新增 `assetResolve.test.ts` 5 条。
- **暖纸弱文字对比度**（B-118）：`--ink-faint` `#7a6b54` → `#736349`（`src/styles.css:77` 与 `src/lib/themes.ts:24` 同改），对纸底 `#f4e8d2` **4.798:1**、侧栏 `#efe2c9` **4.541:1**（改前 4.267 / 4.039），且仍比 `--ink-soft` 浅。`themes.test.ts` +3 条（浅/深色档同口径回归、两个入口都吃 token）。
- **设置面板页脚分隔线**（B-108）：`.dialog-actions` 加 `border-top: 1px solid var(--line)`，内容从 sticky 页脚下方划过时有可见边界；高度上限不动（`calc(100vh - 40px)`）。1440×900 页脚 822–859 / 框底 880，1000×620 页脚 542–579 / 框底 600，两档都完整在框内（距框底 21 px），滚到底最后一块内容不被页脚永久压住。
- 门禁：`npm run verify` PASS，首屏 gzip **297,823 B**（比第 56 轮 +104，内部 310,000 / 硬线 320,000，余 12,177）；`npm test` **37 个文件 473 条**全过；`host/build.ps1` PASS，`--version` **0.32.1**；`theme-acceptance` 27/27（对比度矩阵 43/48 适用项全过）。
- UNVERIFIED（本轮）：宿主 WebView2 窗口内的成品显示（本机会话 `CreateCoreWebView2ControllerAsync` 报 `0x8000FFFF`，见 `host/bin/host.log`），所以「单文件文档里相对图真的画出来」只有端点与纯函数证据；`/__asset` 的 HEAD 分支与 `Host` 头不匹配的 403 分支未单独测。

**第 58 轮（同一未发版区间）**

- **智能标点不再改写链接目标与行内 HTML 标签里的引号**（B-123）：`src/lib/smartTyping.ts` 新增 `inLinkDestOrHtmlTag()`（锚定 `\]\([^)\n]*$` 与 `<\/?[A-Za-z][^>\n]*$`），在反引号守卫之后整键放行；关闭括号的「越过」留在守卫之前，`[乙](https://example.com "标题")` 收尾的 `)` 不会多打。改前同一串逐字符输入得 `src=”assets/a.png” width=”300”`。`smartTyping.test.ts` +6 条，含反向「甲 < 乙，我说"」仍配弯引号、`don't`、行内代码、表格行不连累。手打的 `[乙](…)` 方括号仍会被序列化器转义（只丢语义不丢字符），另记 B-124。
- **`[TOC]` 目录 MVP**（B-106 部分）：新增 `src/lib/toc.ts`（标记判据、条目复用大纲口径）与 `src/lib/tocRender.ts`（文档装饰 `Decoration.widget(side:-1)` 挂 `<nav class="sl-toc">`，条目按钮点击走侧栏大纲同一个 `jumpTo`；key 带标题签名，两处 `[TOC]` 不撞键；无目录时逐键不全篇扫描）。`escapes.ts` 加 `repairTocMarkers()`：`\[TOC\]` 按行还原成 `[TOC]`，原文含转义写法时整篇不还原，围栏 / 行内代码 / 引用行 / 公式段不动，CRLF 行尾保留。`serializeDocument.ts` 抽出 `applyRepairs()`，保存链与 300 ms 草稿链共用（草稿不再漏修某一族）。`npm test` 37 → 39 个文件。emoji 未做，B-106 留在开放项。
- 门禁：`npm run verify` PASS，首屏 gzip **298,647 B**（比第 57 轮 +824，内部 310,000 / 硬线 320,000，余 21,353）；`npm test` **39 个文件 495 条**全过；`npm run roundtrip` 富文本 6/8、源码 8/8（报告与 HEAD 逐字节相同）；`keyboard-acceptance` 51/52，唯一 FAIL 是 B-209 已记的过期断言。
- UNVERIFIED（本轮）：真实中文 IME 逐键下的引号守卫；真实磁盘 / 宿主写回（E2E 用打桩 VFS 与 localStorage 草稿）；WebView2 窗体里的目录 widget。已知限制：`[TOC]` 源段落不隐藏，目录只在编辑视图渲染。

**第 59 轮（同一未发版区间）**

- **全局搜索（B-104）**：`Ctrl+Shift+F` 搜整个工作区的 Markdown（结果行是「相对路径:行号」，懒加载 `src/components/GlobalSearch.tsx`，焦点进出用 `useDialogFocus`）。拆两层：`searchWorkspace(docs, query, limits)` 纯函数（行列号从 1 起、列按 UTF-16、200 条截断、1 MiB 按 UTF-8 字节跳过、默认不区分大小写、正则特殊字符按字面）与 `collectDocs(files)` 逐个 `readNode` + try/catch 跳过读不到的文件。点结果 → `openWorkspaceFile(node)` + 回填 `setQuery` + `setFindOpen(true)`；一个 `Esc` 只关对话框并把焦点送回正文；没有工作区时提示「先打开文件夹」。新增 `src/lib/globalSearch.test.ts` 9 条，`npm test` 40 个文件 504 条。
- **文件列表形态的侧栏（B-102）**：文件侧栏头加「树 / 列表」两态（`aria-pressed`，会话内有效、不落盘）；列表态按 `flattenFiles` 平铺全部 Markdown、行内显示文件名与相对路径（新增 `relativePath()`），1000×620 无横向滚动，切回树态保留展开结构。已知限制：列表态无右键删除 / 重命名。
- 门禁：`npm run verify` PASS，首屏 gzip **299,727 B**（比第 58 轮 +1,080，内部 310,000 / 硬线 320,000，余 20,273；全局搜索是惰性 chunk，不进首屏）；`npm test` **40 个文件 504 条**全过；`npm run roundtrip` 未跑（未动编辑器与序列化）；`tree-acceptance` 54/56，两条 FAIL 是既有过期断言（与第 58 轮同两条）。
- UNVERIFIED（本轮）：真实 FSA 句柄与真实磁盘写回（E2E 用合成目录句柄）；中文 IME；宿主 WebView2。200 文件上限与 1 MiB 跳过的 UI 文案只有单测与代码核对。

**第 60 轮（同一未发版区间）**

- **全局搜索 0 命中报跳过文件**（B-128）：`GlobalSearch.tsx` 的 `run()` 先拼装 `parts` 再分支，0 命中提示同样带「跳过 N 个读不到或超过 1 MiB 的文件」/「只显示前 200 处」/「文件太多」；新增 `busyRef` 同步闸门挡同一 tick 的第二次回车（按钮 `disabled` 只挡鼠标）。E2E：2 个 >1 MiB 文件搜只在其中的词 → note「没有匹配的文本；跳过 2 个…」+「没有结果。」；同 tick 双 Enter 只读盘一轮（`getFile` 3 = 文件数 3，上限 4）。
- **点当前文档的搜索命中不再整篇重载**（B-127）：`App.tsx` 的 `openGlobalSearchHit` 在 `activeFile?.path === node.path` 时只回填查找条并显式聚焦 `.find-input`，不再 `openWorkspaceFile`；跨文件命中路径不变。E2E（约 1 MB 文档滚到中段、查找条先关）：点命中后查找条值=「锚点词」、`sl-parse-done` 与 `getFile` 均不增、`scrollTop` 差 0；脏文档 dirty 仍真、手打内容仍在、点回正文 `Ctrl+Z` 仍能撤销（撤销历史未被重载清掉）。
- **发布预检判 Fail + 差距表 39/4**（B-125）：`packaging/verify-installer.ps1` 的批次门改成 setup FileVersion 前三段必须等于 `package.json` 版本，不等记 `Fail`；`-PreflightOnly` 按 FAIL 数非零退出并打印 `summary: preflight FAIL`。实测 `release/Sidelight-0.32.1-win-x64-setup.exe`（FileVersion 0.31.1.0）→ FAIL + exit 1（改前 UNVERIFIED + exit 0）；`-Setup host\bin\Sidelight.exe -PreflightOnly` → PASS + exit 0。差距表改 39 有 / 4 缺（表头=行数，子节 1/1/2 合计 4），`README.md` / `AGENTS.md` / `packaging/README.md` 同步。
- 门禁：`npm run verify` PASS，首屏 gzip **299,759 B**（比第 59 轮 +32，内部 310,000 / 硬线 320,000，余 20,241）；`npm test` **40 个文件 504 条**全过；`npm run roundtrip` 未跑（未动编辑器与序列化）；回归 `.tmp/e2e-r59-tester.mjs`（B-104 全局搜索 + B-102 列表）0 error。
- UNVERIFIED（本轮）：`release/` 缺包/坏包的预检分支与真实静默安装（只跑 `-PreflightOnly`）；源码/预览模式下点命中（查找条锁定，本轮只验编辑模式）；真实 FSA 句柄与真实磁盘写回（E2E 用合成目录句柄）。

**第 61 轮（同一未发版区间）**

- **TOC 逐键不再全篇重建**（B-129，findings-code F1）：`src/lib/tocRender.ts:218-320` 的插件 state 缓存条目、顶层标题区间与 `[TOC]` 段区间；正文事务只 `mapState` 映射位置，改动命中标题 / `[TOC]` 区间或正敲标记才重建；停笔 300 ms 由插件顶层 `view` 派 resync 兜底（导出 `createTocPlugin` 供单测）。单测 +3 条：resync 无 `docChanged` 也重建、正文只映射而标题才重建（`builds` 不变；改标题 `builds+1`）、标记段 `toc-source` 装饰。E2E 100 KB/1 MB × 有/无 TOC：目录 3 条、改标题不等停笔即更新、`[TOC]` 前插 3 行停 400 ms 点第 2 条仍落 H2（差 1 px）。
- **TOC 进只读预览 + 编辑视图收起标记**（B-130，findings-typora F2）：`[TOC]` 段落挂 `Decoration.node` 的 `toc-source` 类，`src/styles.css:941-950` 只隐未揭示的段，光标进入加 `is-revealed`（看得见、能 Backspace 删）；`PreviewPane` 按顶层标题建同一套 `<nav class="sl-toc">`（引用块里的标题不算），点条目滚到标题；原文 `\[TOC\]` 两边都保留字面；保存仍写 `[TOC]` 单行。`docs/typora-gap.md` 的 TOC 行同步，导出/打印是否带目录未验。
- **文件列表态可访问性**（B-131，findings-ui F1/F2）：列表态单独算 roving tabindex（不复用树的 rows，当前文件在折叠目录里仍只 1 个 Tab 站）、`ArrowUp/Down/Home/End` 只移焦点（Enter 走原生 button）、装行的 `ul` 补 `role="list"` + `aria-label`；暖纸 `--ink-faint` 调深到 `#6f6047`，hover 合成底与当前行实色底 4.673:1 ≥4.5。
- 门禁：`npm run verify` PASS，首屏 gzip **300,727 B**（比第 60 轮 +968，内部 310,000 / 硬线 320,000，余 9,273）；`npm test` **40 个文件 508 条**全过；`npm run roundtrip` 富文本 6/8、源码 8/8（与第 58 轮基线相同，报告未变）；`theme-acceptance` 27/27；`tree-acceptance` 54/56（2 条既有过期断言，与第 58/59 轮相同）。
- UNVERIFIED（本轮）：B1 的 1 MB 相对 p50 门槛（改前差 0，60% 不可达）与 100 KB median-of-3 差未达（残值 +3/+4 ms 只记，机制由单测坐实）；HTML 导出 / 打印是否带目录；真宿主 WebView2、真实 FSA 句柄与磁盘写回、中文 IME。

**第 62 轮（同一未发版区间）**

- **软换行段落不再整段当目录标记**（B-132，findings-bug F1）：`toc.ts` 新增 `isTocMarkerText`（`/^[ \t]*\[toc\][ \t]*$/i`，无 `m`），`isTocParagraph`、`tocRender.ts` 的逐键判定与 `PreviewPane.tsx` 的段落判定改用它，`hasTocMarker`（带 `im`）只留给原文与粘贴片段。`第一行文字\n[TOC]\n第三行文字` 这类软换行段落的其余文字不再被编辑视图 `display:none` 收起、也不再被预览整段换成 `<nav>`；保存字节只差新增字。单测 +2（软换行不算标记、无标记段位置）。
- **手打 `[TOC]` 立即生效**（B-133，findings-typora F1）：`toc.ts` 加 `escapedTocLineCount`（围栏代码块与 `$$` 段跳过）与 `tocShouldRender` / `hasTocSource`，转义守卫改为「原文里这些标记行全被转义才不挂」；`tocRender.ts:131` 与 `App.tsx:5586` 改用文档口径（`editor.state.doc`）。已打开的文档末尾手打 `[TOC]` 当场出目录、标记段高 0、`Ctrl+S` 仍写单行 `[TOC]`、重开与只读预览各 1 份；`\[TOC\]` 文档两边留字面、保存字节不变；混合文档当场两份目录、保存整篇转义、重开 0（既有规则）。单测 +3。
- **差距表补代码块高亮行**（B-135 文档面）：`docs/typora-gap.md` 缺表 4→**5**、「编辑与格式」1→2、TOC 行改「导出/打印不带（B-134 实测，打印同实现）」；README / AGENTS 同步 39/4→**39/5**；BACKLOG 清残留并补 B-134 / B-136。
- 门禁：`npm run verify` PASS，首屏 gzip **300,834 B**（比第 61 轮 +107，内部 310,000 / 硬线 320,000，余 19,166）；`npm test` **40 个文件 513 条**全过；`npm run roundtrip` 富文本 6/8、源码 8/8、firstSaveBlocked 1/8（与第 58 轮基线同）。
- UNVERIFIED（本轮）：打印 / 另存 PDF 是否带目录（按同一 `getHTML()` 实现推断，B-134 只实测 HTML 导出）；真实 FSA 磁盘写回与中文 IME 沿用假 workspace。

**第 63 轮（同一未发版区间）**

- **停笔不再先写整篇草稿**（B-120，findings-code F2）：`src/App.tsx:1069-1071` 与 `:3462` 两个草稿兜底计时器 800→2,500 ms，2 s 自动保存回包先停表（`finishSaved` 清计时器并推代际 `src/App.tsx:3000-3005`）；kb100 停笔 3.6 s 只写 1 次 `kb100.md`（36,029 B，改前草稿 + 文档共 72,057 B）；`autoSave:false` 时草稿仍写 1 次（落盘由 ~1.1 s 变 ~2.8 s）。
- **1 MB 切源码基线定案**（B-115）：夹具 A 7 轮进 p50 9,883 ms / 退 2,050 ms、maxRafGap 10,033 ms；加 `wrap="off"` 后 p50 9,867 ms（−0.16%）→ 排版不是瓶颈，主成本是脱离 44,446 块富文本态的 8.6–9.1 s long task。不改代码，B-115 记为「只能换 `<pre>` / 虚拟化」。
- 门禁：`npm run verify` PASS，首屏 gzip **300,841 B**（内部 310,000 / 硬线 320,000，余 19,159）；`npm test` **40 个文件 513 条**全过；roundtrip 未跑（未动编辑器/序列化）；回归 `stale-save-acceptance` 4/4。
- UNVERIFIED（本轮）：wrap=off 的 7 轮 p50 与「可编辑 / `Ctrl+S` 同源 / 横向滚动」取自执行方脚本（tester 3 轮复测趋势一致）；真实 FSA 与宿主 WebView2 下的 2500 ms 兜底；B-115 的最终实现未做。

**第 64 轮（同一未发版区间）**

- **1 MB 进出源码不再重建 44,446 块**（B-115）：源码态下编辑块 `hidden` 常驻，用 `.source-hidden`（`display:grid !important` + 高度/padding 归零 + visibility/scale）收成 0 尺寸，预览仍整块卸载；进源码前记 `scrollTop`，退出到编辑后双 rAF 还原（`src/App.tsx:575,580,4376,4399,5625`、`src/styles.css:326`）。夹具 A 7 轮：进 p50 **1,210** / 退 **298** ms（改前 9,826 / 2,121）；每轮 1 条 >500 ms long task，max 1,177 / 218（改前 8.6–9.0 s）；`scrollDiff` 全 0、`sl-parse-done` 3→3、0 控制台错误；门槛按实测重定为进 ≤1,500 / 退 ≤600；100 KB 20 轮进 120 / 退 54 ms；`Ctrl+Z` 仍按既有设计不撤销源码写入。
- **大纲跟随当前章节**（B-137）：`Outline.tsx` 行加 `data-outline-id`，`visibleId` 变化时用 `nearestScrollTop`（`outlineTree.ts:79`）按容器/条目矩形差只补最小距离（越界才滚），容器取 `.outline` 的 `parentElement`、单 rAF；手滚不抢、面板不可见跳过。单测 +4；E2E 26/26（点正文 h2 后 `scrollTop=466`、当前条全在容器内；点 h1 回顶）。
- 门禁：`npm run verify` PASS，首屏 gzip **300,971 B**（内部 310,000 / 硬线 320,000，余 19,029）；`npm test` **40 个文件 517 条**全过；roundtrip 未跑（未动编辑器/序列化）。
- UNVERIFIED（本轮）：真宿主 WebView2 内 1 MB 进出源码与滚动还原；真实中文 IME 下的源码态切换；150% / 200% 缩放下的 `.source-hidden`；真实 FSA / 更长文档下的大纲跟随。

**第 65 轮（同一未发版区间）**

- **大纲可用键盘整篇跳章节 + 树语义**（B-138）：`.outline-list` 由 `nav` 改 `div role="tree" aria-label="大纲"`，行加 `role="treeitem"` / `aria-level` / `aria-expanded`；`outlineTree.ts` 新增 `visibleRows` / `resolveRovingId` / `stepRowId`，roving tabindex 落在最后聚焦的行（被折叠隐藏时回退当前章节）；`↑/↓` 换行、`Home/End` 首尾、`←` 收起或跳父级、`→` 展开或进首个子行，`Enter` / `Space` 走原生 click 跳章节并把焦点送回正文；折叠钮 `tabIndex=-1` + `aria-hidden`（保留 `aria-label`，鼠标仍可点），焦点环画在行内（`src/styles.css`）。单测 14→**17**；E2E 34/34 + 补测 8/8（Space 跳章节、鼠标折叠、折叠钮不在 Tab 序）。
- **B-115 复核定案**：1 MB 进源码 p50 **1,173** / 退 **299** ms（第 64 轮 A1 为 1,210 / 298，−3.1% / +0.3%），门槛进 ≤1,500 / 退 ≤600 全过；源码态打 10 字 `value` +10、`sl-parse-done` 不增、`Ctrl+F` 后焦点回源码框；每键约 120 ms 的全篇 `countText` 记为 P2（B-139）。
- 门禁：`npm run verify` PASS，首屏 gzip **300,980 B**（比第 64 轮 +9，内部 310,000 / 硬线 320,000，余 19,020）；`npm test` **40 个文件 520 条**全过；roundtrip 未跑（未动编辑器/序列化）；回归大纲跟随 26/26。
- UNVERIFIED（本轮）：真实屏幕阅读器对 tree/treeitem 的播报；真宿主 WebView2、真实中文 IME、真实 FSA 句柄。

**第 66 轮（同一未发版区间）**

- **源码态停笔也排自动保存与停笔草稿**（B-143）：源码打字只走 `setSourceText`，编辑器没有事务，`onUpdate` 里的排程不触发；>256 KiB 文档在源码里改字期间磁盘、`.sidelight/drafts`、localStorage 三处都无副本，状态栏还停在旧「已自动保存」。改法：`onUpdate` 的草稿三支抽成 `scheduleDraft(text)` 供两种视图共用；新增一条 effect，声明在 `src/App.tsx:3662-3667` 的 ref 赋值**之后**（同 commit 按声明序跑，2 s 后 `currentMarkdown()` 才读到最新 `sourceText`），按 `sourceMode && sourceText !== sourceBaselineRef.current && sourceDirtyNowRef.current` 排 `scheduleAutoSaveRef` + `scheduleDraftRef(sourceText)`；脏值用新 ref `sourceDirtyNowRef` 复用 `normalizeForBaseline` 口径（读 state 会晚一拍）；`scheduleAutoSave` 改由 `autoSaveScheduledRef` 去重，源码态逐键不再多一次 App 渲染。E2E 四档：100 KB 开 chip 先「自动保存排队中」→ 3.2 s 后 +1 字节写盘（文档 1 写 / 草稿 0）、1 MB 开 +1 字节且 `sidelight.doc.v1` 不存整篇、1 MB 关草稿含新字且 `big.md` 不变、新文件停笔 3.2 s 不建文件。
- **一次停笔只写一份**（B-120 回归）：编辑器 100 KB 停笔 3.6 s 窗口 **36,029 B / 文档 1 写 / 草稿 0 写**（与第 63 轮同值），`autoSave:false` 文档 0 写 / 草稿 1 写；源码 1 MB 打 10 字（关）p50 **2,810 / 2,818 ms**（门槛 ≤2,900，改前 2,618），无 >1,000 ms 单条 long task、文档不变；1 MB（开）每轮 +10 且整篇与 textarea 逐字符相等。
- 门禁：`npm run verify` PASS，首屏 gzip **301,073 B**（内部 310,000 / 硬线 320,000，余 18,927）；`npm test` **40 个文件 520 条**全过；roundtrip 未跑（未动编辑器内核/序列化）。
- UNVERIFIED（本轮）：真实 FSA 磁盘与真实 1 MB 文件（用合成工作区）、WebView2 宿主内同一路径、中文 IME 下的源码态排程；B-144（退出源码前先绘遮罩）留 B 轮。

**第 67 轮（同一未发版区间）**

- **源码改字后退出先绘「正在应用」遮罩再整篇重解析**（B-144）：`applySource` 在源码改过字时必然整篇 parse（1 MB 实测 4,140 ms 长任务），点击后界面像死住。`switchView` 现在先 `setSourceApplying(true)`，双 rAF + `setTimeout(0)` 之后才调 `applySource(textarea 现值)`（两帧里击键不丢），完成同批收遮罩并切视图；未改动的进出仍走 `skipReparse`（1.2 s / 0.3 s 级，不出遮罩）。遮罩 `position:fixed` 盖视口、带 `data-source-applying` + `role="status"`；退出到编辑时按帧重试到 `hidden` 摘掉再 `focus()` + 还原阅读位置（`src/App.tsx`、`src/styles.css`）。
- **验收实测**：1 MB 改 10 字点「源码」退出，点击→第二个 rAF **101 ms**（≤250）、遮罩 rect 全视口且 `elementFromPoint` 命中遮罩子节点（不是 textarea）、4,119 ms 长任务 start 晚于遮罩帧（仍含 ≥4,000 ms 一条）、总 **4,470 ms**（≤5,330）；遮罩消失后 `[data-source-applying]` 0、正文尾含所打字符、`sl-parse-done` 3→4、焦点回 `.ProseMirror`。100 KB **145 ms**（≤700）。1 MB 未改动 5 轮进 p50 **1,219** / 退 **294**、parse 3→3、全程无遮罩。预览 / `Esc` / 「回到富文本编辑」确认框三条出口同路径（3/3、0 控制台错误）。
- **B1 delta 回归**：A1/A2/B-115/finder-code 四脚本重跑全 true、0 控制台错误；1 MB 进 p50 **1,191** / 退 **297** ms、100 KB 进 **122** ms、`scrollDiff` 全 0、parse 3→3；A2 1 MB 源码打字 p50 2,887（关）/ 2,894（开，≤2,900）；改动 >10% 无一项（最大 +2.7%）。
- 门禁：`npm run verify` PASS，首屏 gzip **301,383 B**（内部 310,000 / 硬线 320,000，余 18,617）；`npm test` **40 个文件 520 条**全过；`npm run roundtrip` rich 6/8、source 8/8。
- UNVERIFIED（本轮）：真实 FSA 磁盘与真实 1 MB 文件（合成工作区）、真实中文 IME 在两个 rAF 窗口内击键、WebView2 宿主内的遮罩帧与重解析、真实读屏对 `role="status"` 的播报；B-145（源码态自动保存无 IME 组合守卫）本轮登记、未修。

**第 68 轮（同一未发版区间）**

- **源码改字后 2 s 内退出不再连写两次盘**（B-148）：`runAutoSave` 在 `await performCommit` 之前清草稿计时器并推 `draftGenerationRef`（`src/App.tsx:3672-3675`），失败仍走 `writeDraftFallback`。1 MB 源码打 1 字后 350 ms 退出：`big.md` 写 1 次（1,000,013）、drafts(len>0) 0、退出后 0 写；等 3.4 s 再退仍 1 次；`autoSave:false` 草稿 1、`big.md` 不变。
- **源码态组合输入不写盘**（B-145）：`textarea.source-editor` 接 compositionstart（`sourceComposingRef` + 有界 60 s）、compositionend（+400 ms 并补排自动保存与草稿）、blur（只清标记），`scheduleDraft` 加源码态草稿门，退出源码态的 effect 清两个 ref。100 KB 组合 `zhong` 停 2.6 s：盘不变、`sidelight.doc.v1` 无拼音、drafts 0；提交 **2,034 ms** 后写 100,011 含「中」无 `zhong`；1 MB 关自动保存组合期 drafts 0、提交后草稿含「中」；组合未提交时 Esc 退源码仍会在 1.6 s 内恢复写盘。
- **快速打开焦点困锁与 Esc**（B-146/B-147）：`useDialogFocus` 加 `overlaySelector`/`restoreFocus` 两参，`QuickOpen` 改用 hook（`restoreFocus=false`，焦点由 App 按视图分派）、`.quick-open` 补 `aria-modal`/`tabIndex=-1`、删输入框私有的 Esc；App 的 Esc 链与 `dialogOpen` 认 `quickOpen`，新增 `closeQuickOpen`；选中文件后 `focusCurrentView` + 按帧重试的 `focusCurrentViewWhenReady`，`FileTree` 在抢焦点那一帧再判一次。Tab 60 次 0 逃出、Esc 关且焦点回正文/源码框；`.quick-open-input:focus` 补焦点环。
- 门禁：`npm run verify` PASS，首屏 gzip **301,694 B**（内部 310,000，余 18,306）；`npm test` **40 个文件 520 条**全过；`roundtrip` 未跑（未动序列化）。
- UNVERIFIED（本轮）：真实中文 IME 与 WebView2 宿主内的组合输入/快速打开、真实 FSA 与真实 1 MB 文件、真实屏幕阅读器。

**第 69 轮（同一未发版区间）**

- **组合输入时 `Ctrl+S` 不写盘**（B-149 第二出口）：`requestSave` 顶部加组合门（`src/App.tsx:3330-3335`，`sourceMode && sourceComposingRef.current` → 提示「先完成候选字，再保存。」并返回），不再把 textarea 里未提交的 `zhong` 当正文写进文件。
- **组合输入中退出源码先收尾再读值**（B-149 第三出口）：新增 `settleSourceComposition`（`src/App.tsx:4531-4566`）——离开源码且正在组合时先 `blur()` 并等一次 `compositionend`（≤300 ms），之后才读 textarea 现值；等不到且 value 变短才提示「先完成候选字，再退出。」并留在源码（不卸载、盘不变），文本仍在则放行，收尾值经 `pendingSourceLiveRef` 交给延迟的 `applySource`（`:4582-4600`）。
- **验收实测**：100 KB 组合 `zhong` 按 `Ctrl+S` **0 写**、盘 100,010 不变、提示正确；提交「中」后按 `Ctrl+S` 恰 1 写 100,011（`count('中')` 2,323→2,324、无拼音、无草稿）；组合→提交→`Esc` 退出后正文含「中」无 `zhong`、**1,597 ms** 写盘（≤3,400）。B1 delta 回归全绿：1 MB 进 p50 1,170 / 退 294 ms、100 KB 125 / 57 ms、scrollDiff 全 0、parse 3→3、exitSourceEdited 5,108 ms（≤5,330）、A1/A2/A3 脚本全 true、编辑停笔 1 写 / 0 草稿，无一项偏差 >10%。
- 门禁：`npm run verify` PASS，首屏 gzip **301,886 B**（内部 310,000，余 18,114）；`npm test` **40 个文件 520 条**全过；`roundtrip` 未跑（未动序列化）。
- UNVERIFIED（本轮）：真实中文 IME 与 WebView2 宿主内的组合输入（CDP `imeSetComposition` 合成组合）、真实 FSA 与真实磁盘文件；CDP 合成组合未提交时按 Esc 会退出并把原始串写入正文（真输入法由 blur 提交候选字，拦退分支需真 IME 才能触发）。

**第 70 轮（同一未发版区间）**

- **删除正在编辑的文件不再被读不出的候选中断**（B-152）：新增纯函数 `fallbackTargets`（`src/lib/workspace.ts:367`）——候选按删除前的树快照取「先 index+1 到末尾、再 index-1 到开头」，path 去重、最多 3 个、不回绕；`removeFile`（`src/App.tsx:2866-2912`）逐个试 `readNode`，读不出（>5.5 MiB 或抛错）就跳过看下一个，刷新后按 path 命中新节点、否则用删除前的旧节点，全失败才退回空白 `未命名.md` 且提示里带第一个失败名。修前 `big.md` 在树里时 `readNode` 抛错会吞掉「已移到回收站 + 撤销」，标题停在已删文档。
- **验收实测**：改前 24 采样 `undoAny:false`（`.tmp/r70-bug-c.json`，未覆盖）；改后 `.tmp/r70-impl-a1-after.json` 120 ms 出撤销并切 `a.md`。四场景 `.tmp/r70-impl-a2.json` 全 `pass:true`、0 pageerror：删脏 b（下一个 6 MiB 读不出）64 ms 出撤销 + 切 a、撤销后 b 回树且保留「脏Q」；删 a → 切 b 且 `Ctrl+S` 写 b；两个 6 MiB 候选全读不出 → 空白 `未命名.md` + 撤销 + 提示失败名；删 c → 切 b。`workspace.test.ts` +4 条。
- 门禁：`npm run verify` PASS，首屏 gzip **302,014 B**（内部 310,000，余 17,986）；`npm test` **40 个文件 524 条**全过；`roundtrip` 未跑（未动序列化）。
- UNVERIFIED（本轮）：真实 FSA 磁盘与真实 6 MiB 文件、WebView2 宿主内删除 + 撤销；③ 空白文档 `Ctrl+S` 实测 `addOps:2`（预存在设计：落点未知的新文档不拦，`src/App.tsx:3365-3371`，基线对照 `.tmp/r70-tester-blank-save.json`）。

**第 71 轮（同一未发版区间）**

- **B-152 delta 回归（无产品代码改动，仅独立复验）**：复跑第 70 轮 A2 四场景 + 四格矩阵 8/8 `pass:true`，写盘 ops 9 项与改前基线同值、草稿写盘 0 次、0 pageerror / 控制台错误。
- 四格：非活动删除（当前 a.md 脏字不丢、`Ctrl+S` 只写 a.md、撤销后 b.md 回树）、删唯一文件（空白 + 撤销重开完整 + 保存写回 only.md）、列表态（无删除入口，B-102 记 UNVERIFIED；删后切列表选中与当前文档一致）、跨目录（跳过读不出的 6 MiB 落 `sub/c.md`，撤销后树与当前文档不受影响）。
- 嵌套工作区补测：根 `a.md`/`big.md` + 第二层 `sub/c.md`，删当前 a 落 `sub/c.md`（title、`.is-active`、`data-path` 与树自动展开一致），撤销后树恢复、当前仍 c.md；列表态 3 行选中 `sub/c.md`、删后 2 行选中 `a.md`、列表内撤销恢复 3 行。
- 尾部抽查 B-148 / B-149 全 `allPass:true`：1 MB 源码 2 s 内退出只写 1 次盘、草稿 0；组合输入 Ctrl+S 0 写 + 提示、提交后写 100,011、Esc 退出 1,606 / 1,609 ms 写盘。
- 门禁：`npm run verify` PASS，首屏 gzip **302,014 B**（余 17,986）；`npm test` **40 个文件 524 条**全过；`roundtrip` 未跑（无 `src/` 改动）。
- UNVERIFIED（本轮）：列表态删除入口（B-102 已知限制）、真实 FSA 磁盘与 WebView2 宿主内删除/撤销、B-149 的真实中文 IME。

## 0.32.1 — 2026-11-16

用户报的三个问题：首次启动空白、关闭文档、工作区里的原地保存。

- 首次启动打开一篇空的 `未命名.md`，不再加载旧 localStorage 里的示例名；新建立刻可用。
- 文件菜单新增「关闭文档」；脏文档走现有三选一（取消 / 存草稿 / 丢弃）。
- 有工作区且当前文档还没有句柄时，`Ctrl+S` 直接在根目录建 `未命名.md`（重名则 `未命名 2.md`），不弹系统另存为；显式「另存为」仍走系统 picker。
- 测试：`npm test` 17 文件 **248** 条；`session` 18/18、`newfile` 23/23、`keyboard` 49/49。
- 首屏 gzip **285,783 B**（临时预算 286,000 B，余 217 B）。
- UNVERIFIED：真实重开权限、150%/200% 缩放屏、真模型提示词质量、真实 DeepSeek 搜索（无 Key）、macOS 快捷键、旧会话已丢弃批注不可恢复。
- 体积与 SHA256 见 Release 页的 `SHA256SUMS-0.32.1.txt`。

## 0.32.0 — 2026-11-16

七项修复 + Typora 快速键；核心是会话恢复与宿主批注协议。

- 会话恢复：重新打开恢复上次的文件夹、当前文件与批注；IndexedDB 只存文件句柄，权限三态（已授权 / 需重新授权 / 不可用），失败退化为「最近打开」；重新授权后 `Ctrl+S` 原地保存。
- 宿主批注：`GET /__annotations` 只读当前文档同目录 `.sidelight/annotations/<CacheKey>.json`（没有回 404，上限 512 KiB）；新增 `annotations-save` 原子写回，只读 / 不可写回 `READONLY` / `IO`，拒绝伪造路径。
- 批注协议 v2：新增「整体评价」与「未定位」条目（`{v:2,annotations,notes}`，兼容旧数组，迁移前备份）；重跑分析按窗口替换，未定位批注不再丢。
- 提示词压缩到 796 字，并要求一条全文总评。
- 高分屏：manifest 声明 `PerMonitorV2, PerMonitor`，`GetProcessDpiAwareness` 实测 2；WinForms 配置节经实测会让宿主启动失败，未启用。
- 搜索：新增 DeepSeek 官方 Search 接口（Key 可与模型 Key 相同），401/402/429 有可读错误文案。
- 快捷键：Ctrl+K 链接、Ctrl+M 公式、Ctrl+P 快速打开、Ctrl+1–6 标题、Ctrl+0 正文、Ctrl+/ 源码、表格 Tab 走格与 Ctrl+Enter、侧栏 Ctrl+Shift+1/3/L。
- 测试：17 文件 **248** 条；`session` 15/15、`annotation` 8/8、`host-smoke` 8/8、`host-annotation` 6/6、`keyboard` 49/49。
- 首屏 gzip **285,997 B**（临时预算 286,000 B，余 3 B）。
- UNVERIFIED：真实重开权限、150%/200% 缩放屏、真模型提示词质量、真实 DeepSeek 搜索（无 Key）、macOS 快捷键、旧会话里已丢弃的批注不可恢复。
- 体积与 SHA256 见 Release 页的 `SHA256SUMS-0.32.0.txt`。

## 0.31.1 — 2026-11-16

最终版：窄窗与键盘细节、Windows 单实例与安装检测、macOS 平台补齐。

- 窄窗：分析时自动打开批注抽屉，并显示批注条数。
- 文件菜单加「查找」入口。
- 正文里按 Tab 插入两个空格（不再跳焦点）。
- Windows：`--version` 打印版本；exe 文件版本与 NSIS `VIProductVersion` 对齐 setup `VersionInfo`。
- Windows 单实例：再次启动恢复并置前已有窗口。
- Windows 安装/卸载运行检测：程序在跑时安装会被拦截（实测 exit=1、exe 不变）；卸载场景 exit 0、文件未删，记 **UNVERIFIED**。
- macOS：Finder 双击 `.md`（Apple Event）、Dock 点击重开、关于菜单显示版本、端口占用时激活已有实例；CI 编译与 self-test/verify 待首次跑。
- 测试：`npm test` 16 文件 **234** 条；`keyboard` 37/37。
- 首屏 gzip **285,781 B**（临时预算 286,000 B，数据安全例外，余 219 B）。
- 体积与 SHA256 见 Release 页的 `SHA256SUMS-0.31.1.txt`。

## 0.31.0 — 2026-11-16

数据安全例外版本：修草稿、写入门、删除兜底、公式与脚注保真。

- 浏览器草稿恢复：只对文件夹里的文档生效；重新打开时恢复草稿内容。
- 三条写路统一 256 KiB 门：超过上限不再整篇写 `localStorage`，避免同步写阻塞。
- 打开文件 5.5 MiB 门：与写回上限一致，超限直接拒绝并提示。
- 删除脏文件：trash 保留原始字节 + SHA256 + `.current.md`，缓存文件复制校验；撤销时按校验结果全部搬回。
- 公式：`\$` 不再参与配对；`价格 \$100 与 $x^2$` 只识别 `$x^2$`，保存不二次转义。
- 脚注：续行只认 4 空格/tab，2 空格段首正文不再被吞；块内空行保留。
- CRLF 尾部空行：按换行对数保留 0–5 个尾部空行，不再写 `&nbsp;` 增长；三次往返字节稳定。
- 测试：`npm test` 16 文件 **234** 条；`draft` 61/61、`tree` 56/56、`bigfile` 3/3；`roundtrip` source 7/7。
- 首屏 gzip **285,471 B**；本轮**临时预算 286,000 B**（数据安全例外，STATE 记理由），余 529 B。
- 延后：宿主/本地草稿合并单弹窗、状态栏草稿来源标注、BOM 断言、公式/脚注全部数据安全验收脚本（需 dev）。
- 体积与 SHA256 见 Release 页的 `SHA256SUMS-0.31.0.txt`。

## 0.30.4 — 2026-11-16

两项 P0：脚注保真与删除脏文件的兜底。

- 脚注续行与混合尾块：`extractFootnotes` 支持 2+ 空格或 tab 续行，以及「脚注块 + `[ref]:` 引用定义」混合尾部；`joinFootnotes` 按块间空行拼回，两次往返逐字节稳定。富文本不再把 `[^a]` 解析成链接、把续行当代码块。
- 脚注定义消失拦截：只在「原文有定义、正文仍有引用、保存后定义消失」时 blocking；用户把引用与定义一起删掉不拦。
- 删除脏文件：把最新正文、草稿与批注一起移入工作区 `.sidelight/trash/`，撤销时全部搬回；`保存后删除` 分支按预算砍掉、延后。
- 测试：`npm test` 16 文件 **213** 条（新增 8 条脚注/风险用例）；`tree` 56/56、`stale` 4/4、`newfile` 23/23；`roundtrip` source 7/7。
- 首屏 gzip **284,903 B**（≤285,000，余 97 B）。
- 延后到第 22–25 轮：C2/C3、D2/D3、F4、性能、UX、安装相关项。
- 体积与 SHA256 见 Release 页的 `SHA256SUMS-0.30.4.txt`。

## 0.30.3 — 2026-11-16

性能修复：把正文派生移出按键同步路径。

- `onUpdate` 同步只做 dirty、统计与自动保存；正文派生（4 个正则、草稿、`localStorage` 写入）移进 300 ms 防抖。
- 1 MB 文档载入从 **5.8–9.3 s 降到 1284 ms**。
- 10 KB 冒烟 p95 5.0–7.2 ms（多次测量波动，未达稳定）；**100 KB 与 1 MB 的逐键 p95 未测**（只测了载入），不作为验收数字。
- 草稿验收 `draft` **61/61**；`npm test` 16 文件 205 条。
- 首屏 gzip **284,766 B**（≤285,000，余 234 B）。
- 延后（不计入本轮）：P2 可访问性项、memo 化。
- 体积与 SHA256 见 Release 页的 `SHA256SUMS-0.30.3.txt`。

## 0.30.2 — 2026-11-16

收尾修复与数字更正；仍是 0.30.x，不升 1.0。

- 草稿清理：保存成功后重新发出 `draft-clear`，清掉对应文档的草稿（此前 `draft-acceptance` 57/58 的漏清）。升级说明：0.30.1 可能残留含正文的草稿，升级后打开该文档再保存一次，或手动删 `.sidelight/drafts/`。
- 性能数字更正：0.30.1 的单次冒烟数字**不可复现**；统一改为「仅 10 KB 冒烟，未达稳定；100 KB/1 MB 未测，不作为验收数字」。
- 不升 1.0 的理由：macOS 真机、签名/公证、Intel 运行、100 KB–1 MB 性能仍未验；隐私声明待产品负责人确认。0.30.2 作为第 20 轮收尾版本。
- 测试 16 个文件 205 条；首屏 gzip 仍 **284,730 B**（≤285,000，余 270 B）。
- 体积与 SHA256 见 Release 页的 `SHA256SUMS-0.30.2.txt`。

## 0.30.1 — 2026-11-16

数据安全修复优先；性能只记录实测，未测的写明未测。

- 保存回包跨文档覆盖（B1）：保存请求带文档标识，晚到的回包不会写进另一篇文档。
- 保存中丢字（B3）：保存期间继续输入不再被回包覆盖，以最新正文为准。
- 文件上限下沉到 `readNode`（5.5 MiB）：6.1 MiB 拒绝并提示，5.2 MiB 允许；不再先读进内存再判断。
- 每个按键少一次序列化：统计与大纲共用一次序列化结果。
- 统计与大纲 180 ms 防抖，长文输入不每键重算。
- 超过 256 KB 的正文不再整篇写进 `localStorage`，避免同步写阻塞。
- dirty 状态改由版本号推导，避免多处手写布尔值不一致。
- 性能：**仅 10 KB 冒烟，未达稳定**；100 KB 与 1 MB **未测**（perf 脚本在 1 MB 挂起），不作为验收数字。
- 延后（不计入本轮）：memo 化、B4/B5、2 MB 读取进度条。
- 测试：`stale` 4/4、`host-save` 64/64、`bigfile` 3/3、`tree` 49/49、`theme` 27/27、`keyboard` 35/35；`npm test` 16 文件 205 条。
- 首屏 gzip **284,730 B**（≤285,000，余 270 B）。
- 体积与 SHA256 见 Release 页的 `SHA256SUMS-0.30.1.txt`。

## 0.30.0 — 2026-11-16

可访问性收尾：大纲页签真正隐藏文件树、深色对比度与焦点环、错误提示可被读屏播报。

- 大纲页签：文件树真正隐藏（`display:none`、rect 高 0，节点仍在 DOM），切回时恢复滚动位置（`tree-acceptance` 49/49）。
- 深色主题：颜色 token 化，浅/深 × 8 组 × 3 状态共 48 组对比度检查——**43 组适用、5 组排除**（大字号/禁用态等不适用），适用组全部通过（`theme-acceptance` 27/27）。
- 焦点：统一焦点环（含源码模式）；`prefers-reduced-motion` 下不播动画。
- 表单：输入边界 3:1 对比；正文编辑器加 `aria-label="正文编辑器"`。
- 错误反馈：保存失败 toast 用 `role="alert"`；一次 notice 只更新一个 live region，toast 内按钮不被 `aria-hidden` 包住。
- 测试：`tree-acceptance` 49/49、`theme-acceptance` 27/27（48 组中 43 组适用、全部通过）、`keyboard-acceptance` 35/35；`npm test` 16 文件 205 条。
- **P2 延后**（不计入本轮达标）：骨架 `role="dialog"`/`aria-busy`、批注卡 `tabIndex`/Enter 跳句、正文开头 Tab 回环删除。
- 首屏 gzip 283,826 → **284,210 B**（≤285,000，余 790 B）。
- 体积：Windows 安装包 **817,983 B**、Windows 便携 zip **902,274 B**、macOS Universal zip **890,004 B**；SHA256 见 Release 页的 `SHA256SUMS-0.30.0.txt`。
- （本条与更早条目的数字均为发布后回填。）
## 0.29.0 — 2026-11-16

macOS 改为 Universal 包，签名/公证可选，self-test 与发布流程加固。

- macOS Universal：arm64 与 x86_64 各用一次 `swift build --triple <arch>-apple-macosx13.0 --scratch-path`，每片先 `lipo -archs` 断言单一架构，再 `lipo -create`；两片 `minos` 都是 13.0。产物固定 `Sidelight-<版本>-macos-universal.zip`（不再按 `uname -m` 命名）。x86_64 片失败先试 `--arch`，仍失败直接 `::error::` 禁止发布，不拿 arm64 冒充。
- self-test 加固：`--self-test --require-bundle` 必须在 `.app` 内运行、禁止回退 `cwd/dist`；6 项断言（首页 200 + `id="root"`、静态 JS、`/__doc`、`/__recent`、未知路径 404、`Host: evil` 403 用原始 socket）。
- 签名/公证可选：`host-mac/sign.sh` 完整 keychain 链 + `codesign --keychain`（不加 `--deep`）+ `notarytool submit --wait` + `stapler staple`；公证 zip 只装 `.app`，staple 后用 `STAGE_DIR` 重打发布 zip（保住 `README.txt`）。无 Apple secrets 时走 ad-hoc，Release 首行标注「**未签名、未公证**」；有 secrets 但签名/公证失败则 job 失败，不静默降级。
- 发布流程：`release.yml` 的 `workflow_dispatch` 增加必填 `tag`；preflight 校验 `v<version>`；release job 先断言 3 个资产、用显式文件名生成 `SHA256SUMS-<版本>.txt`、再断言 4 个文件并 `sha256sum -c`；同 tag 重跑删除旧的 arm64 资产（`overwrite_files`）。
- Edit 菜单：撤销/重做/剪切/拷贝/粘贴/全选，全部 `target = nil` 走 first responder（`undo:`/`redo:` 由 WKWebView 的 `undoManager` 处理）。
- zip 内多一份 `README.txt`（Gatekeeper 三档、签名三态、Intel、数据位置、校验方式）。
- 测试 16 个文件 205 条；首屏 gzip 仍 283,826 B（≤285,000，余 1,174 B）。体积：Windows 安装包 **817,994 B**、Windows 便携 zip **901,920 B**、macOS Universal zip **889,644 B**（fat 头两片：x86_64 0x1000007 / arm64 0x100000c，zip 内含 `README.txt`）；SHA256 校验和见 Release 页的 `SHA256SUMS-0.29.0.txt`。
- 未验：真实 Intel Mac 与 Rosetta、真实签名/公证（本机无证书）、图标真机显示、WKWebView 的 ⌘C/⌘V/⌘Z、`--triple` 交叉编译 x86_64（CI 首次实跑）。
## 0.28.1 — 2026-11-16

修复版：只改可访问性与测试，不改功能。

- 可访问性：自动聚焦后首个 Tab 仍落到 skip link（自动聚焦不再破坏键盘导航）。
- 测试：导出菜单用例改用 `menuitem` 角色断言。
- 测试 16 个文件 205 条；首屏 gzip 仍 283,826 B（≤285,000）。体积：Windows 安装包 **817,821 B**、Windows 便携 zip **901,922 B**、macOS arm64 zip **773,067 B**；SHA256 校验和见 Release 页的 `SHA256SUMS-0.28.1.txt`。
## 0.28.0 — 2026-11-16

【体积与 SHA256 见 Release 页的 `SHA256SUMS-0.28.0.txt`；本机构建约 setup 817,886 B / zip 901,866 B。】

新建文件保存修复、首次使用与延后项收尾、发布自动化；首屏 gzip **283,775 B**（≤285,000，余 1,225 B）。

- 新建文件保存：修「打开 a.md → ＋新建 → 保存」把 a.md 覆盖的问题；新文件首次手动保存前保持 0 字节；外部删除/改名后 `Ctrl+S` 不再写旧路径；`refreshWorkspace` 分 `adopt` / `check` 两种语义。
- 首次使用：焦点与占位、文档身份一致、模拟批注去重、demo 死代码清理。
- 延后项收尾：侧栏 `tablist`、文件树展开态、空文件夹提示、超长文件名、导出菜单。
- 发布自动化：新增 `release.yml`（tag `v*` 或手动 `publish`）；preflight 校验 tag = `package.json` = CHANGELOG；Windows / macOS 构建只上传 artifact；单个 release job 生成 `SHA256SUMS` 并 `sha256sum -c` 后发布，同 tag 重跑幂等（`overwrite_files`）。
- CI：`windows-host` 与 `macos-host` 转为必过；`install-verify` 仍只手动触发。
- 测试 16 个文件 205 条；体积与 SHA256 见 Release 页的 `SHA256SUMS-0.28.0.txt`（本机构建约 setup 817,886 B / zip 901,866 B）。
## 0.27.0 — 2026-11-16

跨平台：Windows 与 macOS 各一套原生宿主。

- macOS 原生宿主（Swift + AppKit + WKWebView + Network.framework，arm64）：`host-mac/` 提供 `/__doc`、`/__draft`、`/__recent` 与同一套 `save`/`draft-*`/`recent-*`/`close-answer` 协议，编码（BOM/UTF-8/GB18030）、EOL、原子写、草稿与最近记录、关窗三选一与 Windows 宿主对等。
- 宿主桥抽成 WebView2 / WKWebView 双通道：页面只依赖 `postMessage` 语义，Windows 走 `window.chrome.webview`，macOS 走 `window.webkit.messageHandlers.sidelight` 与 `sidelight-host` 事件。
- Windows 仍是 per-user NSIS 安装包 + 便携 zip，行为不变。
- Intel Mac 暂未构建（只在 arm64 runner 上出包）。
- 首屏 gzip **284,973 B**（≤285,000，余 27 B）。
- 测试 16 个文件 205 条；版本 0.27.0。
- 产物：Windows 安装包 **817,242 B**（SHA256 `974A035701AFEE5D75048D6ACB2C5D3B592809C2B5331BBE31C5CE9BAE2D4704`）、Windows 便携 zip **899,986 B**（SHA256 `0CEC9036C0C586E71D2DD7DBA9EF46A4B236F90376CF5E4A015EFE59DBF44C95`）、macOS arm64 zip **770,783 B**（SHA256 `259ADDF217695D77805B724F5C03170EF9BC7D7A4EBF1348E8B6870610D8557B`）。
- macOS 包**未签名、未公证**，仅 arm64，要求 macOS 13+；首次打开需右键「打开」或 `xattr -dr com.apple.quarantine`。

## 0.26.0 — 2026-11-16



文件树同目录重命名；首屏 gzip 守住 **284,973 B**（≤285,000，余 27 B），安装包内部预算调到 820,000 B。

- 文件树：右键文件可重命名；同目录、只接受 `.md` / `.markdown`，目标已存在拒绝（二次探测只收窄 TOCTOU），`move()` 唯一路径、无「复制 + 删除」回退。
- 大小写重命名分两段（临时名 → 目标名）；第二段失败保留临时名并报错，不回滚。
- 缓存：草稿/批注写到新 key 成功后才删旧 key；失败保留旧文件。
- 当前文档：改名后 `currentPath` 指新路径，`Ctrl+S` 写新路径；不触发保存门。
- 最近记录不迁移：旧条目下次打开回 `FILE_GONE`，用户可移除。
- 不做：目录重命名、跨目录移动、自动补 `.md`。
- 可访问性：大纲 `aria-current` 本次修好（当前章节高亮能被读屏识别）。侧栏 `tablist` 与文件树展开态/空文件夹提示 **延后**，不计入本轮达标（首屏余量只剩 27 B）。
- 测试 16 个文件 205 条；体积：构建产物 1,434,502 B（首屏 gzip 284,973 B ≤285,000，余 27 B）；安装包 **817,347 B**（SHA256 `FE2EF144D06AAA4F9667ADB1934929082C77D78FE2A1BD690BD6B16F3F08A268`）、便携 zip 899,829 B（SHA256 `9C18FC9CA29F7311010E3D2570F2C6AE6C6A8358EDD0C6951D24FAD232CB98BC`）（内部预算 820,000 B，硬线 850,000 B 不动）。
## 0.25.0 — 2026-11-16

文件树删除（trash 语义）与首屏守卫修复；首屏 gzip 守住 **284,134 B**（≤285,000，余 866 B）。

- 文件树：右键文件可删除；文件移到工作区 `.sidelight/trash/<时间戳>-<原名>`（重名加随机后缀，跨盘失败回退「复制 + SHA-256 校验 + 删源」）。只删文件，不能移动/复制/重命名，不能删目录。
- 没有应用内恢复：trash 只增不减、不自动清理、卸载不删；恢复要在资源管理器里手动挪回。
- 刷新重绑：外部改动不监听，点刷新重新扫描工作区、重建文件树并保持当前文档高亮。
- 未验：真人右键菜单与确认框、从 trash 恢复、网络盘/OneDrive 占位文件、超长路径与中文文件名、并发删除同一文件。
- 可访问性：文件树删除的菜单与确认框走键盘与焦点管理（Esc 取消、确认按钮默认焦点）。侧栏 tablist 与大纲 `aria-current` 两项**因首屏预算延后**，不计入本轮达标（见 ADR-0013）。
- 测试数与产物体积、校验和见 0.26.0。

## 0.24.0 — 2026-11-16

KaTeX 惰性加载：公式不再拖首屏，首屏 gzip 364,960 → 282,809 B（−22.5%）。

- 首屏：KaTeX 的 JS 与 CSS 拆成独立 chunk（gzip 77,660 B），第一次渲染公式时才下载；首屏集合只剩 index 的 JS 与 CSS。
- 未达成：265 KiB（271,360 B）不可达，实测 282,809 B，差 11,449 B；全量 stub 上限也只有 279,087 B。原因与 Kill 结果见 [ADR-0012](adr/0012-katex-lazy-loading.md)。
- 公式：含公式的首屏非阻塞预取 KaTeX chunk；预取失败显示可重试的失败态，正文不受影响。
- 块级公式按 `$$…$$` 推断 displayMode；导出在 KaTeX 未加载时走保底路径。
- 测试数与产物体积、校验和见 0.25.0。
- 未验：真实 WebView2 冷启动、离线时 chunk 失败与重试、CLI 下 `npm test` 看不到 alias、`katexLazy.test.ts` 尚未挂入 `npm test`

## 0.23.0 — 2026-11-16

表格按原块写回；含引用式链接定义的文档默认用源码模式打开。

- 表格：载入时记下每个表格的原文块（分隔行、对齐标记、单元格内空格、表格前后空行）。保存时若表格签名（表头单元格、每行单元格、列数）与原文一致，整块写回原文，不再重排分隔行与列宽。
- 边界：改过单元格值、增删行列或改对齐的表格，保存时按编辑器规范重新排版，并且**不会**弹保存确认。只承诺「没动过的表格不会被改」，不承诺「表格永远保真」。表格前后 ≥2 空行会规范化成一个。
- 引用式链接：含 `[id]: url` 定义块的文档打开时直接进源码模式，顶部提示说明原因；切回富文本后首次保存仍拦一次。
- 往返报告改三栏口径：富文本 **5 / 7** 完全保真、源码路径 **7 / 7** 等值（未编辑）、富文本首次保存仍拦截 **1 / 7**（04 引用式链接），不再只给一个「3 / 7」。逐样本表见 `docs/roundtrip-report.md`。
- 测试数与产物体积、校验和见 0.24.0。
- 未验：真实宿主源码模式保存的字节、表格复用只保证行内字节、缩进/跨行 title 的定义行识别

## 0.22.0 — 2026-11-16

最近打开、日志脱敏与 CI 首跑修复。

- 最近打开：宿主记住最近 8 篇（同路径去重并置顶）；`/__recent` 只回哈希 `id`、`name` 与 `/` 分隔的目录，不含路径与 `openedAt`；支持清除、撤销一次、逐条移除；失效文件回 `STALE` / `FILE_GONE`。浏览器里不显示。
- 日志：所有路径点只记 basename（含 `forward applied`、`pipe sent` 不再记载荷）；首次启动把旧 `host.log` 归档为 `host.log.bad` 并写 `log migrated`，之后超过 1 MB 轮转 `host.log.1`。
- CI：`windows-host` 下载前建 `.tmp`；`installer.ps1` 自动建 `release/`；首跑只手动 dispatch `windows-host`，`install-verify` 等其绿并 `if: success()`；仍不设必过。
- 数据与隐私：README 新增「数据与隐私」节，只写事实，**待产品负责人确认后**再作为对外承诺。
- 测试数与产物体积、校验和见 0.23.0。
- 未验：真人重启后最近列表、`recent.json` 写失败、网络盘失效、卸载保留该目录、日志迁移的真机场景

## 0.21.0 — 2026-11-15

宿主文档的草稿兜底与关窗三选一。

- 草稿：宿主把正文写到文档同目录 `.sidelight/drafts/<cacheKey>.md`（UTF-8 无 BOM、LF、原子替换），键与浏览器 `cacheKey()` 一致；`/__draft` 只读、6 MB 上限、`no-store`、Host 校验。
- 关窗三选一：有未保存改动时点 × 只发一次 `close-request`，页面回「取消 / 存草稿 / 丢弃」；取消留窗、存草稿写成功才关、丢弃先清草稿再关；5 s 无答案保持窗口。
- 自动保存只覆盖安全子集：有差异门风险时不自动写盘。
- 设置与菜单的临界问题修复（详见本轮 A 组报告）。
- 草稿只存本机、不发网络；卸载不删文档目录里的 `.sidelight`。
- 测试数与产物体积、校验和见 0.23.0。
- 未验：真实 Alt+F4、注销/关机、真实 IME 组合输入下的关窗，`save-draft` 写失败（只读目录）的可见错误路径

## 0.20.0 — 2026-11-15

数据保真拦截、`.md` 打开方式候选（opt-in）。

- 数据保真：引用式链接、表格对齐、多行脚注等写法在富文本模式下会被改写时，保存前显示差异类别并要求确认；选「改用源码模式保存」写原文，正常编辑（改值、删行）不弹。四条保存路径（含双击打开的宿主文档）统一走这道门，不静默改写。roundtrip 的 02/04 样本被拦下，03/05/07 逐字节保真。
- `.md` 关联改成 opt-in：安装器多一个组件页，默认不勾「在「打开方式」中加入 Sidelight」；勾选只写 HKCU `Software\Classes`（ProgID `Sidelight.md` + `.md\OpenWithProgids` + `Applications\Sidelight.exe`），不碰 `UserChoice`、`FileExts` 与 `.md` 默认程序；`/S` 静默安装不写。
- 卸载对称删除关联登记：`OpenWithProgids` 用 `/ifempty`，保留其他候选（如 `VSCode.md`）。
- 关联方案与边界见 [ADR-0007](adr/0007-markdown-association.md)。
- 测试数与产物体积、校验和见 0.23.0。
- 未验：勾选关联后「打开方式」是否出现、卸载后是否残留、真人交互安装、宿主写回真实场景；`.md` 双击直接打开本轮不做

## 0.19.0 — 2026-11-15

宿主写回通道：双击 `.md` 打开后可以写回原文件，编码、BOM 与换行不变。

- 写回：`GET /__doc` 给页面正文与元数据（编码 / BOM / EOL / mtime / readOnly），页面不拿路径；保存走 `postMessage`，宿主用同目录临时文件 + `File.Replace`（失败回退 `MoveFileEx(REPLACE_EXISTING|WRITE_THROUGH)`）原子替换，失败时原文件不变、临时文件清理。
- 编码：BOM → 严格 UTF-8 → 严格 GBK（`ExceptionFallback`）；解码/编码失败回 `ENCODING`，不写 `?`、不写 U+FFFD；无 BOM 但含 NUL 判 UTF-16 或拒绝。
- 换行：`crlf` / `lf` / `mixed` 按打开时还原；`mixed` 行数不符回 `EOL_MISMATCH`；结尾换行与原文件一致。
- 授权：只写 argv / 单实例转发记录的当前文件；保存消息带 `path` / `fileName` / `file` 一律 `BAD_REQUEST`；`/__doc` 只 GET、只认 `Host: 127.0.0.1:47821`、`Cache-Control: no-store`、不加 CORS、不含完整路径。
- 前端：保存请求 10 s 超时；转发打开的文件可写（先更新 `currentPath` 再 reload）；只读横幅改成可写提示。
- 大文件：正文不再走 `localStorage`，改由 `/__doc` 与 `postMessage` 承载；解析上限 6 MB，超过时显示「文件过大，暂不支持（上限 6 MB）」并清空正文。
- 保存状态机：保存中 / 已保存 / 失败可重试；失败不丢改动，状态栏同步显示当前文件名。
- 冷启动：有未保存草稿时先确认再恢复，不静默覆盖。
- 测试 16 个文件 177 条。
- 体积与测试：测试 16 个文件 177 条；产物体积与校验和见 0.21.0。
- 未验：文件被占用、网络盘、中文路径、真人双击下的写回；`.md` 关联本轮不做。

## 0.18.0 — 2026-11-15

主题与键盘可达、导出公式保真、字体裁剪。

- 主题：浅色 / 深色 / 跟随系统三档。
- 快捷键：`Ctrl+S` 保存、`Ctrl+F` 查找、`Ctrl+Enter` 分析等常用操作键盘可达。
- 导出：HTML 导出里的公式用 MathML 并保留 TeX 源码；纯文本导出保留公式源码。
- 构建口径：显式设 `chunkSizeWarningLimit: 1200`；不拆 KaTeX（`@tiptap/extension-mathematics` 顶层静态 import，原因见 README「为什么不拆 KaTeX」）。
- 字体裁剪：只发 woff2，并删掉 4 个装饰 face（Fraktur / Caligraphic / SansSerif 的粗/斜体）；KaTeX 字体 256,168 B / 19 文件 → **213,664 B / 15 文件**（另 1 个 face 内联），只影响 dist 与安装包，不影响首屏。
- 体积与测试：测试 16 个文件 177 条；产物体积与校验和见 0.21.0

## 0.17.0 — 2026-11-15

首次给用户可见的「能装、能读、能看清错误」一轮，同时补记第 1、2 轮（那两轮版本号仍是 0.16.3，没有单独发版）。

- 宿主改用**回环固定端口** `http://127.0.0.1:47821` 提供 `www`：同一份字节实测首屏 FCP 2,040 ms → 296 ms，转发文件触发的 reload 52 ms；origin 固定，API Key 与草稿不再随重启丢失（见 [ADR-0005](adr/0005-loopback-fixed-origin.md)）。旧 origin `https://sidelight.local` 的 localStorage 会一次性丢失，首次公开前不做迁移。
- 宿主在转发文件前先问前端脏不脏（转发前确认，`window.__slState.dirty`）：有未保存改动先确认，`dirty` 未知时按脏处理，不静默覆盖。
- 长路径（309 字符、带与不带 `\\?\`）、启动失败（缺 `www`、端口被占、WebView2 数据目录不可写）都会给中文错误窗，不再只是静默退出。
- 窄窗：≤1119px 断点内单栏、不横向滚动，页边栏收进「批注」抽屉（Esc 关闭、焦点回按钮）；1024 宽下保存 / 设置 / 源码 / 预览都在视口内。
- 错误反馈改成「原因 + 下一步」：401/403 给「打开设置」，断网与 500 说清下一步，错误 `role="alert"` 且不自动消失；保存与导出失败也有中文提示，失败不改脏标记。
- 首次使用三处说法一致：文档名 `示例 · 未命名.md`、文件树「现在打开的是示例」；「试用示例」真的打开第一篇并显示选中态（`aria-current`）。
- 小字统一到 12px（设置字段名、页签、查找计数、风险条按钮等），对比度按 WCAG AA 复核。
- 体积：构建只发 woff2 字体（KaTeX 字体 1,072,948 B / 59 文件 → 256,168 B / 19 文件）；构建产物体积见 0.18.0。
- 新增 per-user NSIS 安装器与便携 zip（`packaging/installer.ps1`、`packaging/portable.ps1`）：无需管理员，装进 `%LOCALAPPDATA%\Programs\Sidelight`；缺 WebView2 运行时时直接给下载指引并中止；卸载不删 `%LOCALAPPDATA%\Sidelight` 里的用户数据（[打包说明](../packaging/README.md)）。字节与校验和见 0.18.0。
- 新建与另存为：顶栏「文件」菜单（新建 / 另存为 / 打开文件 / 打开文件夹）与文件树头「＋ 新建文件」；没有文件句柄时保存走系统保存对话框，保存成功给持久提示（不自动消失）；示例文档加「示例」徽标。
- 宿主 argv 打开的文档显示只读横幅：保存只能另存为，不再假装写回原文件。
- 源码模式下导出取当前源码内容，不再用编辑器内核里的旧正文。
- 保存的干净/脏判定改成与保存基线比较，保存成功后不再误报「有未保存改动」。
- 货币不再吞字：`$5 到 $10` 这种两边带空白的成对 `$` 按文字处理，打字与载入两条路径都保真（第 01 轮修复）。
- 应用图标：exe、窗口标题栏、开始菜单快捷方式都用同一枚青绿图标（`packaging/sidelight.ico`，第 02 轮）。
- 测试：16 个文件 171 条，0 失败（新增「错误文案」6 条）。
- 未验（首个安装包）：HKCU 卸载项、开始菜单快捷方式、默认安装路径、真人双击与 SmartScreen、中文输入法、`.md` 关联。卸载保留 `%LOCALAPPDATA%\Sidelight` 用户数据。
- 补记第 1、2 轮：MIT LICENSE、CONTRIBUTING、CI、`.gitattributes`/`.nvmrc`；批注焦点与 `aria-modal`；模拟批注标注；次要文字对比度与 12px 小字；WebView2 宿主 spike 与便携 zip。

## 0.16.3 — 2026-11-15

修：整篇一个大段落时，批注还是只有开头。

- 上一版按段落切段，段落本身超过 1500 字就整段被截断——粘贴来的文档常常就是一大段。
- 现在超长段落内部再按句号切，每片不超过 1500 字，逐片分析。
- 实测 3.2 万字的单段文档：批注从 3 条（全在开头）变成 72 条，最远一处到 96%。
- 每段单独组装上下文（本片 + 前后各一小段），不再依赖整块文字。
- 新增 1 个测试（长段落按句子切开、拼接还原原文），测试总数 162。
- 新增 `scripts/diag-longdoc-single.mjs`：单段长文的覆盖断言。

## 0.16.2 — 2026-11-15

修：一万字文档后面没有批注。

- 原因：选区超长时只取前 1500 字送模型，后面的字根本没进分析，所以只有开头有批注。
- 现在超长选区按整块切成若干段（每段 ≤1500 字），逐段分析，批注覆盖整个选区。
- 实测一万字全选：批注从 1 条变成 17 条，最远一处落在文档 90% 的位置。
- 新增 `splitSelection` 与 4 个测试（切段、短选区、超长单块、无选区），测试总数 162。
- 新增 `scripts/diag-longdoc-annot.mjs`：断言批注覆盖到文档后段。

## 0.16.1 — 2026-11-15

修：键盘打不出公式。之前的公式只能从「插入」菜单创建。

- 打 `$x^2$` 直接得到行内公式，句子中间也可以。
- 空行里打 `$$` 再回车，得到块级公式，并立刻弹出就地编辑；内容为空时保留这个公式块，不再被失焦删掉。
- 一整行只有 `$$latex$$` 时转成块级公式。
- 原因：Tiptap 数学扩展只带 `$$…$$`（行内）与 `$$$…$$$`（块级）的输入规则，单 `$` 与「`$$` + 回车」都没实现。
- 新增 `scripts/diag-math-typing.mjs`：7 项断言，连跑三次均通过。

## 0.16.0 — 2026-11-15

公式按 Typora 的方式改：就地展开源码、就地预览，不再有输入框弹窗。

- 行内公式：点一下就展开成 `$…$` 源码并全选，光标在原位编辑；公式下方浮出实时预览；点别处立刻收回成渲染结果。
- 块级公式：点一下在原位置出现输入框，下面紧跟渲染预览，Enter 完成、Esc 取消、点别处也算完成。
- 块级为什么不用「展开成源码」：扩展的输入规则会把 `$$…$$` 当场收成行内公式，源码态保不住；所以块级保留贴住公式的输入框。
- 新增 `scripts/qa18.mjs`：12 项断言覆盖展开、预览、收回、源码写回与块级提交。

## 0.15.0 — 2026-11-15

公式改成就地编辑，修视图切换丢字。

- 点行内或块级公式，输入框直接盖在公式的位置上，下面紧跟 KaTeX 实时预览；Enter 完成，Esc 取消，点别处也算完成。没有弹窗、没有按钮条。
- 公式编辑改用 Mathematics 扩展自带的 `onClick`，位置由节点自己给，不再从 DOM 反推。
- 修视图切换丢字：源码里改过的内容，切到预览、再切回源码时会丢。现在三种视图统一走一个切换函数，离开源码前先把内容写回正文。
- 长文锚定、字数同步保持 0.14.0 的状态。
- 新增 `scripts/qa17.mjs`，10 项断言全过（4 项视图切换 + 6 项公式就地编辑）。

## 0.14.0 — 2026-11-15

修长文批注错位，链接与公式改成原地编辑，加只读预览。

- 批注锚定只在这次送出的选区（没有选区时光标所在整块）里找引文；重复句不再绑到别的段落。全文唯一的引文才允许回退全篇。
- 载入文档、源码切回后，字数、大纲、当前章节立刻刷新（之前停在旧值）。
- 链接与公式改成贴着元素的浮层：Enter 保存，Esc 关闭，点外面关闭；窄屏自动夹在视口内。
- 新增「预览」视图（Ctrl+Shift+P）：只读渲染全文、frontmatter、脚注与公式；Esc 回到编辑。
- 源码、预览、专注、打字机四者互斥，状态栏只显示当前生效的视图。
- 新增 4 个测试（窗口内定位、重复句按序、唯一引文回退、窗口外不回退），总数 158。

## 0.13.0 — 2026-11-15

批注员先想清楚「作者要干什么」，再决定查什么。

- 默认提示词重写：先问谁在读、读完要做什么、手上有什么，把意图压成一句话；再由「读者还缺什么」推出检查标准，不背文体对照表。产品需求、历史考据、自我总结只作例子。
- 意图由模型放在 JSONL 第一行（`kind: meta`），页边栏顶部显示为「我的理解」，不写进正文、不进导出、不参与采纳；判错可点「判错了，重来」重跑。
- 只认第一条 meta，后面的忽略，也不会因此卡住批注；模型没按格式回（缺 meta）会提示重试。
- 提示词可在设置里改写，带「恢复默认」；改到不含 JSON 字样时会提醒模型可能不按约定回。
- 新增 1 个测试（meta 解析与不参与定位），测试总数 154。

## 0.12.0 — 2026-11-15

批注能追问了，也能联网找出处。

- 追问：每条批注底部有「追问」，就地展开对话；模型拿到原文、批注与上下文回答，线程跟着批注存进 `.sidelight`。
- 联网核对：每条批注有「联网核对」，用配置好的搜索服务查一次，把带链接的出处列在卡片里；没配就禁用并说明原因。
- 出处下方有「让侧灯按这些出处重写核实」：把出处编号带进追问，让模型只依据给定出处重写「核实」段，出处不足要说缺什么。
- 搜索服务可选 Tavily 或博查，用户自带 Key，默认关闭；请求与响应解析有 7 个测试。
- 新增 7 个测试（搜索请求与解析），测试总数 153；新增 `scripts/qa12.mjs`（追问）与 `scripts/qa13.mjs`（联网核对）。
- 调研结论存进 [docs/research/web-verification.md](research/web-verification.md)：大陆可直连的服务、模型自带联网工具、抓取路线的条款风险、以及引用幻觉的量化证据。

## 0.11.0 — 2026-11-15

修三条交互缺陷，界面不再撒谎。

- 视图模式自洽：进入源码模式会关掉专注与打字机，并禁用这两个开关；状态栏只显示真正生效的模式。
- 点页边批注会选中正文里对应的句子并滚到眼前；专注模式下也随之切换到那一段。
- 链接可点开编辑：点正文里的链接弹地址框，改地址或清空退回普通文字。
- 公式可点开编辑：点行内或块级公式弹 LaTeX 编辑框，带实时 KaTeX 预览；清空后保存即删除。
- 新增端到端脚本 `scripts/qa11.mjs`，12 项断言全过。

## 0.10.3 — 2026-11-15

按质量报告收尾，22 条全部处理完。

- 撤销采纳后，那条建议会回到页边，不再是「撤销了但建议永远消失」。
- 源码模式往返不再清空批注：切回时按引文重新定位，正文里还有的留下。
- 源码模式的状态栏字数跟着源码走；提示改到全局 toast，源码模式下也看得见。
- CRLF 文件保存后保持 CRLF，Windows 上不再整篇变 LF。
- 超过 4000 行的文档改用「公共前后缀」差分，只改一行也只会显示那一处，不再显示整篇变化。
- 修复：整篇替换（载入文档、源码切回）不再把所有批注位置映射到文档开头。
- 新增 1 个差分测试，测试总数 146。

## 0.10.2 — 2026-11-15

按质量报告修第三批。

- 导出 HTML 带上 YAML frontmatter（小字块）与脚注（文末「注释」列表），不再丢内容。
- 没有磁盘句柄时保存会明确提示「已下载一份副本」，并保持未保存标记；要写回原文件得用「打开文件夹」。
- 模拟批注的 quote 与 replacement 用同一段原文，采纳不再出现半句重复。
- 对话框开着时全局快捷键让路；`Esc` 依次关查找、设置、保存对比、切换确认与菜单；点菜单外面自动关闭。
- 保存对比点「取消」不再被当成「已经看过」，下次保存会重新提示。
- 分析起点改用文档位置换算出的文本下标，靠后选区不会从错误位置找引文。
- 新增 5 个导出测试，测试总数 145。

## 0.10.1 — 2026-11-15

按质量报告修第二批。

- 设置对话框每次打开同步当前设置：用快捷键调过的字号不会再被「保存」盖回去。
- 字号在保存路径上统一夹取，填 999 会被夹到 26，填 0 不会让正文消失。
- 空文档不再显示「阅读约 1 分钟」。
- 查找跳转与替换不再抢焦点，可以连按 Enter 一直跳。
- 「分析选中」按上下文改文案：有选区是「分析选中」，没有是「分析本段」。
- 分析请求加了并发守卫；切换文档时掐断进行中的请求，结果不再落到新文档上。

## 0.10.0 — 2026-11-15

修掉四条会丢数据的缺陷，缓存改存到文档旁边的 `.sidelight`。

- 切换文档前先拦：有未保存改动时给「保存并切换 / 放弃改动 / 取消」。
- 源码模式下保存写出的是源码内容，不再是编辑前的旧正文；源码下的改动也会置脏、写草稿。
- 载入文档不进撤销栈，`Ctrl+Z` 不再把上一篇的正文拉进当前文件。
- 批注位置跟着事务映射走，手动编辑、查找替换之后不再漂移；采纳前用引文复核位置，对不上就提示重新分析。
- 草稿补上脚注与公式修复；localStorage 写失败不再中断字数与大纲更新。
- 新增 `.sidelight` 缓存目录：文档同级（打开文件夹时在工作区根目录）下存 `drafts/<名字>.md` 与 `annotations/<名字>.json`；保存成功后删草稿，重开文档恢复批注。
- 新增 23 个缓存测试，测试总数 140；新增端到端脚本 `scripts/qa7.mjs` 用浏览器文件系统验缓存读写。

## 0.9.1 — 2026-11-15

加了一条验收脚本，把这一阶段的目标逐条在真浏览器里验一遍。

- `npm run acceptance`：草稿恢复、查找命中、公式渲染、表格工具条、导出 HTML、frontmatter / 脚注 / 行内 HTML 保真、控制台零错误，九项全过。
- 差距表把「自动保存与草稿恢复」从缺移到有。

## 0.9.0 — 2026-11-15

数学公式能用，钱不会变成公式。

- 行内 `$E=mc^2$` 与块级 `$$…$$` 由 KaTeX 渲染，工具栏「插入 → 公式 / 公式块」可直接插。
- 货币写法不误判：开头的 `$` 后带空白、结尾的 `$` 前带空白的成对符号按普通文字处理，`价格 $5 到 $10` 保持原样。
- 公式里的反斜杠在往返时被写成两个，保存时还原。
- 往返报告加入公式样本，当前应用 3/7 完全保真。
- 新增 10 个测试（公式保护与还原），测试总数 114。

## 0.8.0 — 2026-11-15

有了出口，表格能改。

- 导出：HTML（样式内联，单文件可直接发）、Markdown、纯文本，以及打印 / 存 PDF。
- 表格工具条：光标进入表格时出现，可上插行、下插行、左插列、右插列、删行、删列、删表。
- 打印样式：只留正文，隐藏工具栏、侧栏、页边批注与状态栏。
- 新增 5 个测试（导出模板与文件名），测试总数 104。

## 0.7.0 — 2026-11-15

行内 HTML 不再被吃掉，Obsidian 的 callout 也保住了。

- 行内 HTML：解析前把标签的尖括号转成实体，标签就以文字形式留在正文里；保存时再还原。`<kbd>Ctrl</kbd>` 现在打开再保存一字不差。
- callout：`> [!note] 想法` 被编辑器转义成 `> \[!note\] 想法`，保存时还原。
- 风险提示收窄到只剩引用式链接一项。
- 往返报告新增第三列「当前应用」，走真实保存流程：0/6 提升到 2/6 完全保真（脚注、HTML 块）。
- 新增 13 个测试（HTML 7、callout 6），测试总数 99。

## 0.6.0 — 2026-11-15

脚注不再被改坏。

- 脚注定义块从正文里摘出来单独保存，拼回时逐字节一致；行内 `[^1]` 引用会从编辑器转义过的 `\[^1\]` 还原。
- 风险提示不再把脚注算进去：脚注已经能保住，只剩行内 HTML 与引用式链接。
- 源码模式里能看到并编辑脚注定义。
- 新增 9 个测试（脚注提取、拼回、引用还原），测试总数 86。

## 0.5.0 — 2026-11-15

查找替换与字号。

- 查找：`Ctrl + F` 打开，命中全部高亮，当前一处加重；`Enter` 下一处，`Shift + Enter` 上一处。
- 替换：单条替换与全部替换；替换后其余批注按差值平移。
- 字号：设置里可调（12–26），`Ctrl + =` 放大、`Ctrl + -` 缩小、`Ctrl + 0` 复位；存在本地设置里。
- 新增 11 个测试（查找命中与循环），测试总数 77。

## 0.4.0 — 2026-11-15

图片能进来了，读不全的语法不再闷着。

- 图片：工具栏「插入 → 图片」，也支持把图片拖进正文或从剪贴板粘贴。有文件夹句柄时写进 `assets/` 并写成相对路径；没有句柄时先内联，并提示原因。
- 语法风险提示：打开用到行内 HTML、脚注或引用式链接的文档时，顶部出现一条提示，可一键切到源码模式编辑。
- 浮动「分析」按钮只在真有选区时出现，不再跟着光标乱跑。
- 修复：页边提示按内容区分普通提示与错误，错误才用红色。
- 新增 11 个测试（图片文件命名），测试总数 66。

## 0.3.0 — 2026-11-15

堵数据损失：frontmatter 不再被毁，保存前先给你看改了什么。

- YAML frontmatter 单独保存，不进编辑器，拼回时逐字节一致；源码模式里也能看到与编辑。
- 保存前格式对比：第一次保存一篇从磁盘打开（或示例文件）的文档时，把被规范化的行列出来，确认后才写。
- 草稿与文件名一起恢复：刷新后文档名、元数据、正文都回来，状态栏标出恢复时间。
- 状态栏新增「元数据」标记。
- 示例工作区加了一篇带 frontmatter、行内 HTML、脚注的笔记，用来演示对比窗口。
- 新增 21 个测试（frontmatter 12、行差分 9），测试总数 55。

## 0.2.0 — 2026-11-15

补 Typora 的常用视图能力，并把差距写成表。

- 大纲面板：侧栏切「文件 / 大纲」，按标题层级列出，当前章节高亮，点击跳转。
- 源码模式：可编辑原始 Markdown，与所见即所得互切。
- 专注模式：光标所在块之外压暗。
- 打字机模式：光标保持在视口中部。
- 底部状态栏：字数、阅读时间，以及源码、专注、打字机三个状态标记。
- 工具栏：插入（表格、代码块、引用、任务列表、分割线、链接）与格式（H1、H2、粗体、斜体、删除线、行内代码）。
- 快捷键 Ctrl+S 保存。
- 新增 15 个测试（大纲 7、字数 8），测试总数 34。
- 新增 [docs/typora-gap.md](typora-gap.md)：对照官方文档逐项列出已有 10 项、缺 28 项。

## 0.1.0 — 2026-11-15

把右侧结果列表换成页边批注，加上工作区文件树。

- 左侧文件树：可打开文件夹、单个 `.md` 文件，或试用内存示例工作区；当前文件高亮。
- 批注锚定到正文范围：正文里高亮，页边对着那一句放卡片，两处共用同一对位置。
- 批注分两型：修订带改写文字，可逐条「采纳」，采纳后正文被替换、其余批注重算位置；评价只给判断，只有「知道了」。
- 选区旁浮出「分析」按钮，`Ctrl + Enter` 同样触发。
- AI 返回格式从三段文本改为 JSON Lines，边流边定位边渲染。
- 新增 13 个批注解析与锚定测试，测试总数 19。

## 0.0.1 — 2026-11-15

第一版浏览器原型。

- 双栏编辑：Tiptap 3.34，覆盖标题、粗斜体、列表、引用、代码块、链接、表格、任务列表。
- 拖选文字按 `Ctrl + Enter` 触发分析，右侧卡片流式显示概述、建议、核实。
- 卡片支持取消、重试、复制、删除。
- 文档自动存本地，可打开与保存 `.md`。
- 设置里填接口地址、API Key、模型名，走 OpenAI 兼容协议；没填时走模拟流。
- 上下文组装有 6 个单元测试；Markdown 往返损失有测量脚本与报告。
