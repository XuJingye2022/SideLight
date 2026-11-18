# 第 60 轮两轮计划（planner，revision 1）

- 按 `plan-review.md` R1–R6 修；两轮结构/任务范围不变；A=60、B=61，起点 `5384410`，报告 `docs/iteration/round-60/`。
- P2、B-115 不排（源码 `<textarea>` 排版限）；5 条新 P1 无 BACKLOG id，请 lead 入池。

## A 轮（≤25 分钟）｜门禁 `npm test`

### A1 搜索 0 命中报跳过 + Enter 守卫（B-128；F2）
`src/components/GlobalSearch.tsx`：`run()` 先算 `collected`/`report`/`parts` 再分支；0 命中 note=「没有匹配的文本」+跳过/截断句；`busyRef` 同步置位挡双 Enter，busy 时 `preventDefault` 不重入。
验收 `.tmp/e2e-r60-impl-a1-search.mjs`：2 个 >1 MiB 文件 → note 含「跳过 2 个」+「没有结果。」；同 tick 双 Enter `getFile` ≤ 文件数+1（改前 64→130）。

### A2 点当前文档命中不重载（B-127；R6-2）
`src/App.tsx`（`openGlobalSearchHit` 2520–2533）：同路径跳过 `openWorkspaceFile`，只 `setQuery`+`setFindOpen`；查找条已开着时 `FindBar.tsx:58` 的 `autoFocus` 不触发，显式聚焦 `.find-input`；dirty 同篇分支（`:2434-2440`）不动。
验收 `.tmp/e2e-r60-impl-a2-samedoc.mjs`：1 MB 滚到中段、查找条先关，点本文命中 → 查找条值=词；`getFile`/`sl-parse-done` 不变、`scrollTop` ≤2 px、dirty 真。`Ctrl+Z` 在点回正文后断言；源码/预览查找条锁定（`:5352-5357`），只验编辑模式。

### A3 发布预检判 Fail + 差距表 39/4（B-125；findings-typora F1；R5）
`packaging/verify-installer.ps1`、`docs/typora-gap.md`、`README.md`/`AGENTS.md`、`packaging/README.md`：setup FileVersion 前三段 ≠ `package.json` version → `Fail`（`:53-65`），payload 对比留；`-PreflightOnly` 收尾 `exit ([int]($script:failed -gt 0))`、summary 补 FAIL（`:69-72`）。差距表：文件列表/全局搜索移入「有」；`TOC、emoji` 拆行（TOC 进「有」写「编辑视图目录；预览目录见 B2」，emoji 留「缺」）；删空子节；表头/子节 39/4；`README.md:97`（35/7）、`AGENTS.md:74`（36/6）改 39/4；`packaging/README.md:43`（R5 的 README:43 即此文件）「不 FAIL」改「版本不符记 FAIL、非零退出」。
验收：`verify-installer.ps1 -PreflightOnly` 报 `FAIL …0.31.1.0` 且 exit 1（改前 UNVERIFIED/exit 0）；`-Setup host\bin\Sidelight.exe -PreflightOnly` PASS exit 0；表头 39/4 且 `（k）`=行数；`Select-String '35 项|缺 7 项|36 项有|6 项缺'` = 0（改前各 1）；`'UNVERIFIED（不 FAIL）'` = 0（改前 1）。

## B 轮（≤25 分钟）｜门禁 `npm test`、`npm run verify`（首屏 gzip）

### B1 TOC 逐键按事务判定重建（findings-code F1；R1/R2）
`src/lib/tocRender.ts`、`src/lib/tocRender.test.ts`：state 缓存 `entries`、顶层标题区间、`[TOC]` 段位置。`apply`：(1) `tocResync` meta（先于 `docChanged`）→ `build(tr.doc)`（R2，impl 记）；(2) 未 `docChanged` → `previous`（选区 B2 加）；(3) active 的 docChanged：任一步 StepMap 命中缓存标题区间/`[TOC]` 段 → `build()`，否则 `previous.set.map(tr.mapping, tr.doc)` 并映射缓存（**不全篇扫描**，R1 路径）。停笔 300 ms 在插件顶层 `view`（非 `props.view`）debounce 派 meta（`addToHistory:false`）。
验收 `.tmp/e2e-r61-b1-toc-perf.mjs`：100 KB/1 MB × 有/无 TOC、20 键 p50，基线 `.tmp/r61-b1-before.json`；「TOC−无 TOC」p50 差 ≤ 改前该差值的 60%（相对口径，残值只记、不设 ms 门槛）；标题改即更新；`[TOC]` 前插 3 行停 400 ms 点第 2 条差 ≤2；`.tmp/e2e-r58-a2-toc.mjs` 全真；单测 2 条（resync meta 无 `docChanged` 也重建；正文只映射、标题才重建）。

### B2 TOC 进预览 + 编辑视图隐藏标记（findings-typora F2；R3/R6-1）
`src/components/PreviewPane.tsx`、`src/App.tsx`、`src/lib/tocRender.ts`、`src/styles.css`、`docs/typora-gap.md`（B1→B2，同文件）：(a) 每个 `[TOC]` 段加 `Decoration.node(段落区间, {class:'toc-source'})`；`selectionSet` 时用缓存重算类，选区在内加 `is-revealed`，CSS 只隐 `.toc-source:not(.is-revealed)`（光标在内露出、Backspace 可删，R3）。(b) 预览：`PreviewPane` 收 `tocActive`（`hasTocMarker(rawTextRef.current ?? '')`，`:822`/`:5566`）；`renderMath` 同一遍 DOM 按**顶层标题**（`parentElement === doc.body`）建 `<nav class="sl-toc preview-toc">` 替换文字合 `hasTocMarker` 的顶层 `<p>`，点条目滚到标题。(c) 保存仍 `[TOC]` 单行；导出/打印无目录记 UNVERIFIED；差距表 TOC 行改「编辑视图与只读预览」。
验收 `.tmp/e2e-r61-b2-toc-preview.mjs`：nav 按钮=顶层标题数、无字面 `[TOC]`、点第 2 条第 2 个顶层 h2 进视口；含 `> # 引用内标题` 的文档 nav 不含它（R6-1）；`original` 门：原文含标记才挂，编辑视图无 `[TOC]` 段而敲 `[TOC]` 后光标段可见、Backspace 能删；`Ctrl+S` 后磁盘该行合 `^[TOC]$`；原文 `\[TOC\]` 预览留字面且无 nav。

### B3 文件列表态可访问性（findings-ui F1/F2；R4）
`src/components/FileTree.tsx`、`src/styles.css`、`src/lib/themes.ts`、`src/lib/themes.test.ts`：列表态单算 `listTabbable = focusPath∈flatFiles ?? activePath∈flatFiles ?? flatFiles[0]?.path`（**不复用** `tabbablePath`：`:141` 用树 rows，折叠目录内当前文件回退成目录 → 0 站）；行 `tabIndex = path===listTabbable?0:-1`、`onFocus` 记 `focusPath`；外层 `div`（`:460-461`）补 `ref`+`onKeyDown`（`:491-495` 只设树分支），`role="list"`+`aria-label` 放装行的 `<ul>`；方向键只移焦点，Enter/Space 走原生 button。暖纸 `--ink-faint` 调深至 hover 合成底（`accent-wash` 70% over `--panel`）≥4.5，`themes.ts` 同步 + 单测；树分支不动。
验收 `.tmp/e2e-r61-b3-a11y.mjs`：sepia+列表 hover 首行路径色/合成底 ≥4.5；Tab 进列表仅 1 个 `[tabindex="0"]` 行；当前文件在折叠目录里仍 1 站；根首行是目录仍 1 站；ArrowDown×2 焦点第 3 行、正文未切，Enter 打开；树态键盘回归。

未排：B-115、P2、B-126。
