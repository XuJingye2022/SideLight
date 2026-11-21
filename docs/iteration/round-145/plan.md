# 第 145–146 轮计划（A=145，B=146）

`startSha=f8543dc`；0.32.2 不动；dev 5175；真机 ego CDP **57270**；不 push、不改 `release/`；体积只记录（`verify` 只报门/常驻/真实首载）。A 轮收 ①②⑤，B 轮收 ③④；A1→A2 同改 `App.tsx`/`saveError*` 须顺序，A3/B3 是 E2E。

## A（145）

### A1 新建/保存闭环：先试当前文件夹，失败才另存为
文件：`App.tsx`、`FileTree.tsx`、`styles.css`、`lib/saveError.ts`（加 `isWriteDenied`）、`saveError.test.ts`。
根因：「文件→新建」与 `Ctrl+Alt+N` 走 `newDocument`（`:3609`，始终空白、不建文件）→ 已开文件夹时新建不在文件夹；`createWorkspaceFile` 遇 `folderReadOnly` 不试写（`:3577`）；`performCommit` 无落点且有标记直接跳另存为（`:3918`）。
1. 入口统一：`:5837` `onNew`、`:5010` `customId==='newDocument'` 改 `newFileInWorkspace()`，删 `newDocument`（`:3609`/`:5145`）。有文件夹→根目录建 `未命名.md`；无→空白；脏→「切换文档」确认。
2. 删预探测与状态：`ensureWorkspaceWritable`（`:2993-3015`，调用 `:3029`/`:3141`）、`folderProbeEpochRef`（`:471`）、`folderReadOnly`/`Ref`/`applyFolderReadOnly`（`:468-476`，调用 `:1699`/`:1818`/`:3025`/`:3140`）、`commitDocName` 守卫（`:3368-3376`）、`performCommit` 早分支（`:3918-3920`）。
3. `createWorkspaceFile`（`:3565`）恒先 `getFileHandle(nextNewName(space),{create:true})`；失败→`newDocumentForNaming()`+「新建失败：{writeReasonOf}。已打开空白文档；按「另存为」选一个能写的位置。」（`persist`、不写 `saveTargetRef`、不提「只读」）。`performCommit` 无落点先 `saveIntoWorkspace`；写类错误（`NoModificationAllowed`/`NotAllowed`/`InvalidState`/`Security`/`NotFound`，`isWriteDenied`）→自动 `performSaveAs`（取消=「已取消保存」）。
4. `FileTree` 删 `readOnly`/`READONLY_BADGE_ID`/`.tree-readonly-badge`/`aria-describedby`（`:432-440`/`:473`），`styles.css` 删该块（`:422-433`）；`saveError.test.ts` 静态门改：`ensureWorkspaceWritable|tree-readonly-badge|READONLY_BADGE_ID` 在 `src` 改前 >0→0、`getFileHandle` 早于 `newDocumentForNaming`。
验收：`npm run build` exit 0；`npm test` 0 fail；静态 grep 对照；E2E 见 A3。

### A2 保存失败提示：中文 + 文件名 + 另存为 +「正常桌面」
文件：`saveError.ts`、`saveError.test.ts`（A1 后）。
1. 新 `SANDBOX_HINT`「如果一直失败，请从正常桌面双击启动 Sidelight 再保存：受限账户或沙箱里，应用不能写普通文件夹。」；`NoModificationAllowed`/`NotAllowed`/`InvalidState`/`Security` 四条各补一句（留文件名、`canSaveAs:true`）；`InvalidState`/`Security` 不再拼 `error.message` 英文（`:90-99`），改 `writeReasonOf`。
2. 测试改中文口径；四条断言含「正常桌面」「另存为」「文件名」且无 W3C 英文。
验收：`npm test` 0 fail；E2E R4。

### A3 E2E（假 FSA）
`.tmp/e2e-r145-a.mjs`、`shots/round-145/` ≤2 张；沿用 `.tmp/e2e-r144-e2e.mjs`（假 FSA + picker stub；先 `node .tmp/reset.mjs 57270`；1440×900；`autoSave:false`）。
- R1 可写文件夹：菜单「新建」建出 `${folder}/未命名.md`（`create` 1）、树行出现并选中、picker 0；`Ctrl+Alt+N` 同（`create` +1）。
- R2/R3 只读（`getFileHandle` 抛 `NoModificationAllowed`）：菜单「新建」先试 `create` **1** → 中文 toast（含原因、无英文）+ 标题输入框聚焦 + 假 FS 无新文件；页面无「只读」字样、`.tree-readonly-badge` 0；再 `Ctrl+S`→picker 1（`suggestedName`=标题）写 1，再按 picker 0、写 +1。
- R4 打开 `main_bak.md`（写抛同错）+改字+`Ctrl+S`：toast 含文件名/「系统不允许改写」/「另存为」/「正常桌面」、无英文；盘不变；点「另存为」→picker `suggestedName=main_bak.md`。R5 无文件夹：新建=空白，打字后 `Ctrl+S`→picker 1、内容=正文、假 FS 无文件。R6 可写文件夹开 `a.md` 改字 `Ctrl+S`：picker 0、写回 1。
验收：全 pass、0 pageerror；`verify` exit 0（记录三数）；`npm test` 0 fail。

## B（146）

### B1 左栏拖宽 200–480 并记住；右栏把手常显
文件：`lib/settings.ts`、`settings.test.ts`、`App.tsx`、`styles.css`。
1. settings：`MIN/MAX_SIDEBAR_WIDTH=200/480`、`clampSidebarWidth`、`Settings.sidebarWidth` 默认 218、`loadSettings` 缺键 218 越界夹取（不升 `SETTINGS_VERSION`）；测试补缺键与 200/480/500/100。
2. App：`.sidebar`（`:6124`）写 `--sidebar-width`；把手 `.sidebar-resize`（`role=separator`、`aria-*`、`tabIndex=0`）在右缘；pointerdown 记起点、move 按 `+dx/(pageZoom/100)` 夹取且只改 style、pointerup `setSettings`+`saveSettings`；←/→ ±16 即落盘；`treeCollapsed` 宽 44、不渲染把手。
3. CSS：`.sidebar{position:relative;width:var(--sidebar-width,218px)}`、`.is-collapsed{width:44px}`；把手 10px 命中区跨右界、常显 2px 竖条（`--line`→hover/active `--accent`）；`.rail-resize::before` 常显 2px×28px 圆角竖条、保留 10px 命中区与 `left:-19px`；`@media (max-width:1119px)` 仍隐藏两者（`:3683-3687`）。
验收：`npm test` 0 fail；E2E S1/S2。

### B2 目录变化自动刷新（FileSystemObserver → 可见轮询 + focus）
文件：新 `lib/autoRefresh.ts`、新 `autoRefresh.test.ts`、`App.tsx`、`package.json`（test 链尾 73→74）。
1. `autoRefresh.ts`：`POLL_INTERVAL_MS=2500`、`MIN_GAP_MS=800`、`treeSignature(root)`、`shouldAutoRefresh({hasRoot,visible,refreshing,lastAt,now})`、`observerCtor(win)`（最小本地类型，不新增依赖）。
2. `refreshTree`（`:3177`）加 `mode:'background'`：不 `cancelAutoSave`、不 `setTreeRefreshing`、不 announce、不 adopt/不清 `activeFile`/`saveTarget`；失败静默留旧树；`treeSignature` 未变跳过 `setWorkspace`。
3. App effect（依赖 `workspace.rootHandle`）：有 `FileSystemObserver`→`observe(root,{recursive:true})`，回调 300 ms 合并后后台刷新；否则 2.5 s 轮询（仅 `visibilityState==='visible'`）；`window.focus` 与 `visibilitychange`→visible 立即补一次（受 `MIN_GAP_MS` 合并）；cleanup 断开/清定时/移监听。
4. 不打断当前文档：不调 `loadIntoEditor`、不 `setActiveFile`、不清 dirty、不动选区/焦点；`FileTree` 无 `key`，展开态本地 `Set` 按 path 保留（`FileTree.tsx:91`）。测试 6–8 条（签名同/增删不同、min-gap、visible/refreshing 门、observer 探测与回退）。
验收：`npm test` 0 fail；E2E S3–S5。

### B3 E2E（假 FSA）
`.tmp/e2e-r146-b.mjs`、`shots/round-146/` ≤2 张。
- S1 左栏：初始 218；拖 +102→320±2；`localStorage['sidelight.settings.v1'].sidebarWidth`≈320；reload 仍 320±2；拖到 1000→480、拖到 0→200；← 键 −16 且 `aria-valuenow` 同步；收起 44、把手 0。
- S2 右栏：`.rail-resize::before` 的 `content!=='none'`、`backgroundColor` 非透明、宽 ≥2px（常显）；焦点后有 outline；1024×700 把手 0。
- S3 打开文件夹并展开 `sub/`，假 FS 加 `sub/new.md`，删 `window.FileSystemObserver`→派发 `window.focus`→≤3.5 s 树出现 `new.md` 且 `sub/` 仍展开、无「已刷新」toast；`sl-parse-done`/`getFile` 不增、正文与 activeElement 不变、dirty 不变。S4 删 `b.md`（非当前）→行消失、当前文档不变、无 toast；S5 全程 0 写盘、0 pageerror。
验收：全 pass；`verify` exit 0（只记录）；`npm test` 74 文件 0 fail；未动编辑器/序列化→`roundtrip` 不跑。

## 风险
- A1 删 `folderReadOnly` 波及创建/保存/改名/树头；只读里改名改为「试一次→`renameFile` 中文错误」，不动 `rename.ts`。入口统一后 `Ctrl+Alt+N` 有工作区时会建文件（用户要求）；`keyboard-acceptance` 无工作区夹具，回归仍须 52/52。
- 自动刷新不处理当前文件被外部删除的落点（B-273 deferred）；右栏宽度不落盘（B-268 deferred）。超时先交 A1/A2、B1/B2。
