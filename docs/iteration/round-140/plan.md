# 第 140 轮计划（planner）· 修订 r1

> 体例：r1 把 plan 与 review 的修法合并成一份可执行稿，约 9.5 KB（超 common.md 的 plan ≤6 KB；压到 6 KB 只能删掉 P1 修法细节）。r1 按 `plan-review.md` 逐条修 P1-1…P1-4、P2-5、P2-6，任务范围不变。基线 `adb270d`：门 315,616 + 常驻 4,190 = 真实首载 319,806（硬线 320,000，余 194）。dev 5175；E2E 走 ego CDP 57270；红线同 BRIEF。

## A1 右栏贴右缘 / 拖宽 280–520 / 可折叠 / 窄窗抽屉
文件：`src/App.tsx`、`src/components/MarginRail.tsx`、`src/styles.css`

1. `.doc-layout`：`grid-template-columns:minmax(0,1fr) var(--rail-width,320px)`、`padding:52px 0 220px 32px`、`column-gap:28px` 保持；`.doc-column{width:100%;max-width:36rem;margin:0 auto}`；`styles.css:3687-3694` 窄窗单列不动。
2. 折叠只限宽窗（外包 `@media(min-width:1120px)`，P1-4）：`.doc-layout.is-rail-collapsed{grid-template-columns:minmax(0,1fr) 0;column-gap:0}` + `.is-rail-collapsed .margin-rail{display:none}`；窄窗 `.app.rail-open .margin-rail`（`:3730`）优先度更高。
3. App 新 state `railWidth`(320)/`railCollapsed`；`.doc-layout` 内联 `style={{'--rail-width':railWidth+'px'}}`。
4. MarginRail 收 `railWidth/onResize/onCollapse`：`.rail-resize`（`absolute;left:-14px;top:0;bottom:0;width:10px;cursor:col-resize;touch-action:none`、`role=separator`、`tabIndex=0`、`aria-orientation=vertical`、`aria-valuemin/max/now=280/520`、←/→ +16/−16）；`.rail-head` 尾加 `.rail-collapse`（24px、`aria-expanded="true"`、`aria-controls="rail-panel-notes"`）；两钮窄窗 `display:none`。
5. 拖拽：pointerdown 记 `x0`/起始宽 + `setPointerCapture`；move 只写 `layoutRef.current.style.setProperty('--rail-width', clamp(280,520,起始宽+(x0−x)/zoom))`，不 setState；up 才 `setRailWidth` + `onRequestLayout()`。
6. 折叠出口（P1-3）：App 右缘 `.rail-reopen`（`fixed;right:18px;top:50%;z-index:30`、24px、窄窗隐藏、`aria-expanded="false"`、`aria-controls="rail-panel-notes"`）。焦点：`pendingRailFocusRef` 记目标，effect 依赖 `[railCollapsed]` 消费——折叠后聚焦 `.rail-reopen`、展开后聚焦 `.rail-collapse`（不裸 rAF）。
7. 卡按 `from` 升序渲染与排布；`.margin-rail{padding-right:12px}` 只缩流内 chrome，卡片另写 `.note{right:12px}`（抽屉 `.note{position:static}` 不受影响）；`.note-head{flex-wrap:wrap}`。
8. 布局 effect（`App.tsx:2566`）守卫（P2-6a）：`sourceMode||diffActive||railCollapsed||railRect.width===0||!rail.offsetParent` 即 return（A2 若拆走就去掉 `diffActive` 一项）；依赖补 `railWidth,railCollapsed,diffActive`。

验收 `.tmp/e2e-r140-a.mjs`（1440×900 / 1024×700；3 卡复用 `.tmp/e2e-r97-a1-status.mjs` 假 FSA）：① `.margin-rail` 右缘 = `main` 左缘 + `main.clientWidth` ±1（窗口右缘差 ≤ 滚动条宽；`overflow-y:auto` 的滚动条会吃掉 15 px，别断言 `innerWidth`）、`.note` 右缘 ≤ 该值 −12、`.doc-column` 576±2、`.doc-layout` 右 padding 0、`.doc-scroll` 横溢 0。② 拖左 120 → 440±3；到底 520、右到底 280；3 卡 `top` 递增不重叠。③ 折叠：栏不可见、`.rail-reopen` 可见且 `activeElement`、列宽 576±2、左缘 = 折叠前 +(railWidth+28)/2 ±2（320 → +174）；展开后回原宽、`activeElement` 是 `.rail-collapse`、左缘回 ±2。④ 1024：栏隐藏、顶栏「批注」开抽屉（背板、`role=dialog`、宽 ≤340、Tab 环回、Esc 关焦点回钮）；宽窗拖 520 后缩 1024 抽屉仍 ≤340。⑤ 点卡 → 选区覆盖引文并进视口。风险：280 时栏头换行抬卡高（`offsetHeight` 已重算）。

## A2 「与打开时相比」→ 顶栏「对比」的全宽模式（面板仍懒 chunk）
文件：`src/components/RailDiffPanel.tsx`（改内容留文件名）、`src/App.tsx`、`src/components/MarginRail.tsx`、`src/lib/annotations.ts`、`src/styles.css`、`src/lib/{annotations,railDiffA11y,railModalGate,touchTargets,diffView}.test.ts`

1. 删 MarginRail 对比链（`lazy(…RailDiffPanel)`、`getDiff` prop/类型、`diffOn`/`diffOpen`、挂载 JSX、docName effect 的 `setDiffOn(false)`、`.rail-diff-open` 钮）；CSS 删 `:1333-1349` 两条，`:1353` 改写为 `.rail-review-open ~ .rail-collapse{margin-left:0}`，另加 `.rail-count ~ .rail-review-open{margin-left:0}`。
2. App：`diffOpen` + 顶栏「对比」钮（`ref=diffToggleRef`、`aria-pressed`、`aria-controls="diff-view"`、非编辑视图不渲染）；`diffActive=diffOpen&&viewMode==='edit'`；`lazy(() => import('./components/RailDiffPanel.tsx'))` 挂 App（面板与 `diffView`/`diff` 仍 0 B）。
3. 渲染：`<main>` 预览块后 `<Suspense fallback={null}>{diffActive && <RailDiffPanel getDiff onJump onClose/>}</Suspense>`；编辑块 `hidden={sourceMode||diffActive}` + `source-hidden`；`#diff-view` 为 main 直系子节点 → 全宽（1440、侧栏 218 → 左缘 ≈218）。
4. 面板（去 `createPortal`/`useDialogFocus`/document Esc）：`<section id="diff-view" className="diff-view" aria-label="改动对比">`，头行「与打开时相比 + `+N −M 行` + 关闭」；`diffView(before, after, {maxRows:2000})`（context 仍默认 2），`truncated` → 「改动太多，只显示前 2,000 行。」；`<ul className="rail-diff-rows" tabIndex={0} role="list" aria-label="改动对比行">` 保留，`.diff-view .rail-diff-rows{max-height:calc(100vh - 220px);overflow:auto}`；挂载后 rAF 聚焦 ul。
5. 点行回正文（P1-1）：`src/lib/annotations.ts`（已在入口，勿从 `diffView` 引）加 `stripLineMarkup`：去 `#{1,6} `、`>`、列表/引用/任务前缀、`**`/`__`/`~~`/`` ` ``、表格竖线、首尾空白；空串、围栏行、表格行、`removed` 行不定位（不弹提示、`cursor:default`）。加 `locateMarkdownLine`：去尾 `…` → strip → `findRange`，未中试前 24 字。`jumpToDiffRow(row)` 用 `row.text`（P2-6c：勿取 `<li>` 文本，带 `+ `/`− ` 前缀）：命中 → 关面板 + 按帧重试（P2-6b：rAF ≤10 帧）等编辑块无 `hidden` 再 `focus()`→`setTextSelection`→`scrollIntoView`；未中 → `show('这一行在正文里定位不到。')`。
6. 双守卫（P1-2）：`App.tsx:4589` 改 `document.querySelector('.rail-diff-overlay, #diff-view') !== null`（在审面板由前者覆盖，该串计数仍 1）；`diffActive` 时 `.toolbar`/`.table-bar` 加 `inert`（React 18 写 `{inert:''}`）、「批注」钮 `disabled`、`.analyze-bubble` 条件加 `!diffActive`。
7. Esc/切换：Esc 链 `previewMode` 后加 `if(diffActive){preventDefault(); closeDiff(); return}`（`closeDiff` = 关 + 聚焦 `diffToggleRef`）；`switchView` 顶部 `setDiffOpen(false)`；打开前 `setRailOpen(false)`。
8. 静态门改读（不放宽）：`railDiffA11y` 的 ul/`tabIndex` 计数不变、`lazy` 3→2、`:108` 改 `!diffSource.includes('createPortal(')`；`railModalGate:76-99` 删 `:76` 的 `diffOpen` 断言、`:83` 的 `!appDialogOpen` 计数 2→1、`{diffOpen && <RailDiffPanel` → `{reviewActive && <RailReviewPanel`、`useDialogFocus(...)` 改指在审面板、docName 断言只留 `setReviewOn(false)`，`:109-113` 按新谓词改写；`touchTargets` 共享块改 `.rail-review-open, .rail-collapse`；`diffView.test.ts` +2。

验收 `.tmp/e2e-r140-b.mjs`（1440×900；假 FSA 记写盘次数）：① 点「对比」→ `#diff-view` 在、`aria-pressed=true`、无 `.rail-diff-overlay`/`.rail-diff-sheet`、左缘 = `main` 左缘 ±1、右缘 = `main` 左缘 + `main.clientWidth` ±1、宽 ≥ `main.clientWidth−48`。② `Ctrl+Z` 后正文与「+N −M」不变、`Ctrl+S` 0 写、`Ctrl+K`/`Ctrl+F` 无查找条无浮层、`.toolbar[inert]` 在且点「插入」不出 `.menu`。③ 逐条点标题/列表/加粗行（夹具含 `## 标题`、`- 项`、`**粗**`）→ 面板关、焦点 `.ProseMirror`、选区覆盖去语法后的纯文本、进视口；空行与 `removed` 行 → 面板仍开、无 toast。④ Esc 退出、焦点回「对比」；1024 右缘 = `main` 左缘 + `main.clientWidth` ±1、无横溢。⑤ 2,400 行夹具（编辑视图 `Ctrl+A` 后合成粘贴 2,400 行，走第 92 轮粘贴链）→ 提示含「2,000」、`li` 恰 2,000、`ul.scrollHeight>clientHeight`。

## A3 体积门 + 六图 + 收尾
抵消：删 `.rail-diff-open` 两条 CSS（−~120 B）、MarginRail 对比链与 `getDiff`（−~150 B）。新增：A1 全在入口（+600~900 B）；B 的面板与 `diffView` 0 B，但 App 侧接线/按钮/跳转/守卫也在入口（+250~450 B，原计划记 0 是错的）。

结论（不是条件句）：净增 ≈ +700~1,100 B → 真实首载 **≈320,5xx–321,0xx**，必破 320,000。按授权把硬线调到 **325,000**：`measure-first-screen.mjs` 默认 `--max` 320000→325000（注释/用法行同步），同步 `AGENTS.md` §4/§6、`README.md`、`BRIEF.md` 红线 7 的数字；`--target 310000` 不动；`firstScreenBudget.test.ts` 无需改。判线：≤325,000 两条都落；>325,000 → 拆：A1 落、A2 整块退下一轮，不再调线。

1. `npm run verify` 记门/常驻/真实首载；`npm test` 全绿；免跑 `roundtrip`。
2. 六图（用户点名，超 2 张上限）落 `shots/round-140/`：`a-rail-right-1440`、`a-rail-drag-440`、`a-rail-collapsed`、`a-rail-1024-drawer`、`b-diff-1440`、`b-diff-long`.png。
3. 文档：`CHANGELOG.md` 的 `## Unreleased`、`README.md`「现在能做什么」、`BACKLOG.md` 两条（id 由 lead 给）、`round-140/test.md` 记三数/命令/截图与未验证项（真机 IME、WebView2、真 FSA）。
