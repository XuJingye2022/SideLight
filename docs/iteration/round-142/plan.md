# 第 142→143 轮计划（A 保存/新建闭环 → B UI 精简）

**revision 1**（2026-11-21，按 plan-review 六条修订；任务/结构/范围不变）

## 基线
A=142（round-142/）、B=143（round-143/）、startSha e7a2753；0.32.2 不动，不 push/不改 release/、不加依赖。
321,950 B（门 317,479+常驻 4,471）/硬线 325,000：A 结束 ≤323,500，B 结束 **<321,950**；A1/B1/B2 跑 `npm test`+verify 抄三数，A2/B3 只跑 E2E，不跑 roundtrip。
E2E 走 ego CDP **57270**（9222–9226 无监听）、先 `node .tmp/reset.mjs 57270`；截图 ≤2/轮；共享文件一时归一任务，串行 A1→A2→B1→B2→B3。

## A 轮（第 142 轮）

### A1 新建可用、打开不被 error toast 挡、原因全中文
文件 `App.tsx`/`FileTree.tsx`/`TreeActions.tsx`/`lib/trash.ts`/`lib/saveError{.ts,.test.ts}`。
`saveError.ts` 加 `writeReasonOf(error)`：按 DOMException.name 回中文，**不拼 error.message**（原文只进 console.debug），`describeSaveFailure` 不动；`trash.ts` **11 处**全换它（68/71 的 `ensureTrashDir` + 删除/缓存搬移/恢复 9 处）——只读盘上删除与恢复失败同样弹 W3C 英文，同一缺陷；`App.tsx:2943-2960` 删 `setNotice` 只留 `setTrashReason`（`:3085` 同源）；`FileTree.tsx:458-467` 只删 `disabled`、留 `title` 与 `aria-describedby`，`TreeActions.tsx:210-222` 删 `disabled`+`title`+无用的 `trashReason` prop，警示行 `:503-507` 补「能打开也能编辑，保存会失败：请用「文件 → 另存为」」；`createWorkspaceFile` catch(`:3450`) 改 `writeReasonOf`+`startNewDocument()`+中文提示、**不写 saveTargetRef**，`createFolder` catch(`:3308`) 改 `writeReasonOf`；`saveError.test.ts:180-187` 只反转禁用门、`:167-178` 改断无 `kind:'error'`、加两条静态门。
验收：`git grep -nE 'error\.message|second\.message' -- src/lib/trash.ts` **0 命中**（改前 11，先贴对照）；`npm test` 0 fail；verify ≤323,500。`openFolder` 的 picker catch 仍 `messageOf`，留下一轮。

### A2 端到端：假 FSA 拒写全链路
新 `.tmp/e2e-r142-a.mjs`（夹具照 `.tmp/e2e-r141-save.mjs:52-157`）；`.tmp/e2e-r141-save.mjs` 删 ③④ 并注释指向 A2。
夹具 `noWrites`（Low IL 形状）：`.sidelight` 无 create→`NotFoundError`、带 create 与 `createWritable`→`NoModificationAllowedError`+W3C，读/枚举/`removeEntry` 正常；覆写 `window.showDirectoryPicker`（`workspace.ts:70-72`）返回假根＝「文件→打开文件夹」，不可覆写才退回合成 drop。
断言：打开后 `.file-tree` 可见、`.tree-file` ≥1、**`.toast` 0**（picker 无成功 toast）、`.tree-write-warning` 中文无英文、`.tree-new-main` `disabled=false`；点 `Main.md` 正文=fixture；＋新建→`.doc-name`=`未命名.md`+提示含另存为+无句柄，键入后 `Ctrl+S`→`.toast.is-error` 含「保存失败」「另存为」、无英文、动作可点；**真实链路**：重开 `Main.md`→编辑→`Ctrl+S`（该文件抛 `NoModificationAllowedError`）→中文+另存为+`pageErrors:0`，`__vfs.ops` 有 `.sidelight/drafts/` 尝试而 `files` 无草稿；`showSaveFilePicker` reject→仍中文、无另存为、`pageErrors:0`。
预期零产品改动（`ensureCacheDir`/`writeCache`/`parentDirectory`/`persistDocKey` 全自吞错）；只有真出现未处理拒绝才在 `writeDraftFallback`(`App.tsx:4152-4168`) 外包 try/catch（≤4 行），`:3760` 注释同批改准。
验收：`node .tmp/reset.mjs 57270 && node .tmp/e2e-r142-a.mjs`→`allPass`、断言 ≥20、`pageErrors:0`；`e2e-r141-save.mjs` 0 FAIL；截图 `shots/round-142/folder-unwritable.png`。

## B 轮（第 143 轮）

### B1 顶栏/菜单/键位，删格式栏
文件 `App.tsx`/`FileMenu.tsx`/`ShortcutsDialog.tsx`/`styles.css`/`scripts/{keyboard-acceptance,export-acceptance,export-math-acceptance}.mjs`/`.tmp/e2e-r140-b.mjs`。
顶栏留 文件▾/分析本段/保存/插入▾（迁上，复用 `.export-wrap` 的 position:relative）/批注，删 导出▾、?、设置、对比（`?` 键仍开一览，帮助组里也有入口）；**批注改所有视图都渲染、非编辑视图 `disabled`**。**脚本同批改（显式第二步）**：`keyboard-acceptance:238-253`（改走 `.file-menu`、首项 `HTML`、直接 Enter 下载）与 `:289`（设置→文件→帮助→设置）、`e2e-r140-b` 的 `.toolbar[inert]` 与「Esc 后焦点回对比」两段改按 `#diff-view`/`.file-menu-trigger`、`export-acceptance:34`、`export-math:53` 各 1–2 行，`data-safety:361` 记过期。`FileMenu` 加三组：导出 4 项（HTML/Markdown/纯文本/打印·PDF，menuitem）、视图 5 项（对比、专注 **F8**、打字机、源码 Ctrl+/、预览 Ctrl+Shift+P，menuitemradio+aria-checked）、帮助 2 项（快捷键一览、**设置…**→`setSettingsOpen(true)`）；删「关闭文档」（与新建同接 newDocument，`FileMenu.tsx:25-26`）与 `onCloseDocument`，键位文案走 `settings.keybindings`。`Ctrl+Alt+E` 的 `exportMenu` 与默认键**保留**（8 条可改键不变，`keybindings.test.ts:23-27` 不动），语义改「开文件菜单并聚焦导出组首项」：`FileMenu` 加 `openGroup?:{token;group:'export'}`，`App.tsx:4850-4854` 改推 token。`closeDiff` 的焦点回退从 `diffToggleRef` 改聚焦 `.file-menu-trigger`。keydown 加 F8（F11 后、`dialogOpen` 门之前，仅 edit 视图）→翻转 focusMode，`ShortcutsDialog` 视图组加 F8。删格式栏 `App.tsx:5863-6057`（H1/H2 的等价入口只有 Ctrl+1/2，与 H3–H6 一致）＋只为它服务的 `heading1On…codeOn` 六行(`:5060-5065`)、`exportOpen`/`exportTriggerRef`，与 `.toolbar*` CSS 三处：`styles.css:2140-2205`、`:3210`、`:3758-3763`；另删死规则 `.diff-toggle`(`:285`) 与 `.export-menu`(`:3153-3157`)（`.export-wrap` 的 position:relative 保留给插入菜单）。`npm run verify` 记三数，**>321,950** 按序裁剪：删菜单 kbd 文案→删 `.export-menu` 专用规则→B2 状态栏减法先做完再测。
验收：`.toolbar` 0；`git grep -n '导出 ▾' -- src` 0 命中（改前 1）；H1/H2/B/I/S 钮文本 0；文件菜单 `[role=menuitemradio]` 恰 5（对比/专注/打字机/源码/预览）且开源码后该项 `aria-checked="true"`；「文件→帮助→设置」开 `[role=dialog]`；F8 后 `.is-dimmed` ≥1；`npm test` 0 fail。F8 在 WebView2 被吞未验（菜单是等价入口）；25 分钟不够时先交「脚本+菜单+删工具栏」+`npm run build`，verify 与回归顺延到 B2 首步，死 CSS 不留到 B3。

### B2 状态栏 + 左右栏重复入口 + 右栏压头
文件 `StatusBar.tsx`/`StatsDetail.tsx`/`MarginRail.tsx`/`TreeActions.tsx`/`App.tsx`/`styles.css`/`lib/touchTargets.test.ts`/`scripts/keyboard-acceptance.mjs`。
状态栏删 4 模式 chip(`StatusBar.tsx:109-112`)、元数据(`:73`)、保存到(`:74-78`)、`draftLabel`(`:108`，同删 `App.tsx:651` draftShown 与 `:3642` setDraftShown) 及对应 props/传参；「选区 N 字」并入 `.stats-trigger`（保留 `selectionWords`，写「N 字 · 选区 M 字」）；frontmatter 改传 `StatsDetail`（新 `frontmatter?:boolean`，一行「元数据 frontmatter」）。左栏 `TreeActions:239-249` 删「刷新」项（留 ⟳ 与「打开其他文件夹…」）与无用 `onRefresh`。右栏删 `.rail-head`(`MarginRail:336-374`) 与 `.rail-light`/`.rail-title` CSS，「正在读/N 条」「在审」「▸宽窗/×窄窗」并进 `.rail-tabs` 行（动作钮 `flex:none;margin-left:auto` 不动），`styles.css:1355` 上边距 10→4，tablist/roving/aria-controls/8px 把手不动。`touchTargets.test.ts` 的 `.rail-head` 那条改钉 `.rail-tabs`；`keyboard-acceptance:449-471` 预览段改按 `.preview-pane`+contenteditable 断言（`.status-right` 会变空，qa17/draft-acceptance 这类读 chip 的旧脚本记过期）。
验收（限定作用域，防与 B1 菜单项撞词）：`.status-bar` 文本**不含** 源码/预览/专注/打字机/元数据/保存到；`.status-bar .status-chip` ≤5（夹具：有选区+开自动保存+缩放≠100%）；有选区时 `.stats-trigger` 含「选区」；有 frontmatter 时点字数→面板含「元数据」。右栏：`.rail-head` 0；1440 宽窗 `.rail-collapse` **可见** 1、`.rail-close` 可见 0（本就 display:none，按可见性判）；1024×700 抽屉 `.rail-close` 可见 1、`.rail-collapse` 0；`#rail-panel-notes` 首卡 top 比改前小 ≥20 px。文件菜单无「关闭文档」。

### B3 设计语言文档 + 截图 + 收口
文件 `docs/design-language.md`（新）/`README.md`/`docs/iteration/round-143/`/`shots/round-143/`。
8 条原则照 `findings-ui.md` F2，但**原则 6**=「顶栏控件不随视图变（批注钮常驻、非编辑视图禁用）」，**原则 7**=「菜单只用顶栏四组：文件/插入/视图/帮助（不引入原生 7 菜单栏，`typora-features.md:123`）；不设段落/格式组——H1–H6 只有键位」；附 44→实测计数表、删除项等价入口表（B/I/S/`</>`、H1/H2→Ctrl+1/2、导出▾→文件→导出+Ctrl+Alt+E、设置→文件→帮助→设置、?→?键+帮助、对比/专注/打字机/源码/预览→文件→视图、状态栏 4 chip→文件→视图 aria-checked、关闭文档→文件→新建、刷新菜单项→⟳）、「新增常驻控件必须同时删一个或进菜单」判据。README 更新入口，截图 2 张。
验收：8 条齐全且 6/7 与实现一致；等价入口表行数=B1+B2 删除的常驻控件数；`git grep -n '导出 ▾' -- src` 0（改前 1）＋`git grep -nF "'关闭文档'" -- src` 0（改前 1，`FileMenu.tsx:26`；不要连带改 `App.tsx:3422` 的注释去凑门）；verify 真实首载 **<321,950** 且抄三数；`npm test` 0 fail；`keyboard-acceptance` 全绿后 `git checkout -- shots/round-05/`。
