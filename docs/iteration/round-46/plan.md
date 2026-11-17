# 第 46 轮 · 计划（planner，只读）— **revision 3（第 3 次修订）**

- **revision 3（本次）**：planner-revision 按 `plan-review.md` 文末「复审（revision 2）」的 **V2-R1～V2-R3** 三条逐条修掉；**任务集合、级别、任务结构、§六 范围与 §八 砍单原则不变，不新增任务**；三条都只改计划文字与断言，不改产品设计。估时：T2 **9 → 11 min**（V2-R2 要求脚本自带 `goto` + 播种），T1/T3 不变，逐项相加 **≈39 min（未砍）**；§八 已把砍单第 1、2 项（S5 定向整跑 + T2 深色截图）改成**开工前必须先砍**，砍完 **≈36 min**，再砍第 3 项（T1 B 段）到 35。
  - **V2-R1**（P1，T2）→ 1440×900 上门 1 `maxCardBottom <= panel.top - 0.5` **数学不可满足**：滚动口底 = `900 − 46 − 38 − 28 = 872`（`styles.css:178`/`:1247`/`:1527`），面板高 93，修复后末卡底 ≈ **796**；面板自然底 901 > 872 → sticky 必推成 `panelTop = 872 − 93 = 779`，压末卡 **17 px**，而可用纵向空间 `872 − 796 = 76 < 93`，**任何 spacer 取值都无解**。**采用修法 A（保留 sticky）**：门 1 拆两条——(1) 静止态只锁第 1 张卡 `card0.bottom <= panel.top - 0.5`；(2) 新增「滚到底」门（`.doc-scroll`.scrollTop = scrollHeight 后 `lastCard.bottom <= panel.top - 0.5`）。`maxCardBottom`/`lastCardOverlap` 只作诊断打印，并把实测预期写进计划（`scrollportBottom=872 / panelTop≈779 / lastCardBottom≈796 / overlap≈17`）；§三 风险补「静止时末卡底部约 17 px 在钉住的面板后面，滚动约 20 px 即可点；本轮只承诺第 1 张卡静止可点 + 每张卡都能滚到不被覆盖」。
  - **V2-R2**（P1，T2）→ 「直接复制 `.tmp/e2e-r46-ui-4.mjs`、只改三处」不成立：`ui-4` 全文 146 行**没有 `page.goto`**、也没有播种（`:8-13` 只 attach 到 finder 前一段留下的页面；`reset.mjs:58` 会把自己那页关掉），reset 后 `context.pages()` 里没有 5175 页面。改成：抄 `.tmp/e2e-r46-ui-main.mjs:1-27` 的头部（`installDemoFolder` + `goto(URL)` + `waitForSelector('.doc-column .ProseMirror')`）+ 抄 `:183-229` 的 `RICH` 与 `:231-235` 的源码模式播种（`Ctrl+/` → `fill('textarea.source-editor', RICH)` → `Ctrl+/`），测量段只搬 `ui-4:48-143`；再改端口 `9226→9222` 与截图前缀。**T3 的脚本同样必须自带 `goto` + `waitForSelector`**（`ui-3` 也是 attach 型，不能直接抄）。
  - **V2-R3**（P2，T1）→ 卸载块里 `RMDir /r "$INSTDIR\state"` 会**递归删掉用户自己的 `state\`**（正常机器上宿主第一顺位 `%LOCALAPPDATA%` 就成功、根本不在 `$INSTDIR` 建 state；`installer.nsi:48` 又允许把安装目录指到已有目录）。改成 `Delete "$INSTDIR\state\recent.json*"` + 非递归 `RMDir "$INSTDIR\state"`（宿主在 state 里只写 `recent.json`、`recent.json.bad-<ticks>` 与原子写的 `.sidelight-tmp-*`：`host/Program.cs:1899`/`:2009`/`:764`）；A 段探针补 `state\mine.txt` 证「用户文件不被删」，B 段补 `state\recent.json` 证「只剩自己的文件时目录仍被清掉」。
- **revision 2（上一次修订，保留作记录）**：planner-revision 按 `plan-review.md` 的 **R1～R6** 六条逐条修掉；**任务集合、级别、任务结构、§六 范围与 §八 砍单原则不变，不新增任务**；**估时不变（仍 ≈35 min）**：R1/R2 各是一行代码 + 一条断言，R3/R4/R5 是写法与期望值订正，R6 只改断言口径。
  - **R1**（P1，T3）→ `ensureMermaid()` 的早退分支加 `configure(mermaid)`（`src/lib/mermaidLazy.ts:69`）；`configure()` 用 `appliedTheme` 守卫保证同一主题不重复 `initialize`；现有「只加载一次」用例末尾加 `fake.inits.length === 1`；静态断言加 `git grep -c "configure(mermaid)"` 改前 **1** → 改后 **2**。
  - **R2**（P1，T1）→ 卸载块补 state 目录清理（**revision 3 按 V2-R3 改成 `Delete "$INSTDIR\state\recent.json*"` + 非递归 `RMDir`，见 §二**；`host/Program.cs:1920` 的 `baseDir\state` 是**第二顺位**，不是兜底）；A 段探针补 `state\recent.json` 与 `host.log.1`，断言 `stateGone`/`logGone`（**revision 3：A 段断言改为 `recentGone` + `userStateKept`，空 state 目录被清掉由 B 段的 `dirExists=False` 间接证明**）；§二 风险写明「只有 `装后程序没起来`（`verify-installer.ps1:148`，`0x8000FFFF`）算环境 FAIL，`卸载残留`（`:184-189`）不算」。
  - **R3**（P2，T3）→ `renderDiagram()` 在**函数入口**取一次主题供命中查询、在 `await ensureMermaid()` 之后**再取一次**算写键（`configure()` 用的是同一次读法；避免把浅色 SVG 写进深色键）；`mermaidPreview.build()` 一次算好 `renderKey`，并把 `applyContent/refreshLivePreviews/runRender/scheduleRender/makePreview` 的入参逐个写清（漏改一个就「缓存清了但 widget 不刷新」）。
  - **R4**（P2，T3）→ 验收期望值订正：`resolveMermaidTheme` 是「定义 1 行 + 调用 1 行」，`mermaidLazy.ts` 是 **≥2 行**（原文写「1 处」会把正确实现判红）；同类的 `railSpace` / `rail-cards-space` 计数改成 `≥`。
  - **R5**（P2，T1）→ `-Setup` 改用 `[IO.Path]::IsPathRooted` 判定后 `Join-Path $root`，不用 `[IO.Path]::GetFullPath`（后者按进程 CWD 解析）。
  - **R6**（P2，T2）→ 「提示/按钮不被盖住」一律用**几何**（`notice.bottom <= panel.top`、`notice.bottom <= card0.top`，原写的 `maxCardBottom <= panelTop - 0.5` **已被 revision 3 的 V2-R1 拆成门 A1/A2，见 §三**），`elementFromPoint` 只作诊断打印（本任务自己加的 `pointer-events: none` 会让它假绿）。
- 轮次：`round=46`、`nn=46`；轮前 `startSha=39e4f0211f43b7edaca82d468d0997f029151e3c`（planner 实测 `git rev-parse HEAD` 同值；工作树只有未跟踪的 `docs/iteration/round-46/` 与 `shots/round-46/`）。
- 输入：本轮 5 份 `findings-*.md` **全部读完**（bug 1 条、typora 9 条、ship 5 条、code 3 条、ui 9 条，合计 **27 条 actionable**），并逐条对照 `docs/iteration/STATE.md`、`README.md`、`AGENTS.md`、`docs/CHANGELOG.md`、`git log -8` 与相关源码（`packaging/{installer.nsi,installer.ps1,portable.ps1,verify-installer.ps1}`、`src/lib/{mermaidLazy,mermaidPreview,mermaidLazy.test}.ts`、`src/components/MarginRail.tsx`、`src/App.tsx`、`src/styles.css`、`host/Program.cs`）。
- 只读：本文件之外没有改产品代码、没有跑 E2E、没有 commit、没有 push、没有碰 `release/`。**revision 2（本次）**又实际打开核对了 `src/lib/mermaidLazy.ts`（全文 146 行）、`src/lib/mermaidPreview.ts`（全文 126 行）、`src/lib/mermaidLazy.test.ts`（全文 168 行）、`src/App.tsx:1920-1990`、`src/components/MarginRail.tsx:40-79/:215-274`、`host/Program.cs:1888-1947`、`packaging/installer.nsi:188-205`、`packaging/verify-installer.ps1:108-198`、`.tmp/e2e-r46-ui-4.mjs`（全文 146 行），并实测了 §二 的静态基线计数（见 §二 实施步骤 1）。
- **revision 3（本次）只读核对**：`git rev-parse HEAD` = `39e4f0…3c`（与轮前 `startSha` 同值，工作树只有未跟踪的 `docs/iteration/round-46/`、`shots/round-46/`）；实际打开 `.tmp/e2e-r46-ui-4.mjs`（全文 146 行，确认**没有 `page.goto`**、`:22` 直接 `click`）、`.tmp/reset.mjs`（全文 62 行，`:58` 关掉自己那页）、`.tmp/e2e-r46-ui-main.mjs:1-40`/`:178-237`（`installDemoFolder` + `goto` + `waitForSelector` + `RICH` + 源码模式播种）、`.tmp/e2e-r46-ui-3.mjs:1-30`/`:105-134`（同样是 attach 型）、`scripts/demo-folder.mjs`（全文 51 行，`addInitScript` 假目录）、`src/styles.css:117-127`/`:173-182`/`:244-269`/`:795-816`/`:1242-1252`/`:1522-1533`（46 + 38 + 28 + `pad 52/32/220` → 滚动口底 872）、`src/App.tsx:1945-1989`（`floor` 链）、`host/Program.cs:1890-1949`（state 三顺位与 `recent.json`）、`packaging/installer.nsi:188-205`（卸载段）；并实测静态基线 `RMDir /r "$INSTDIR"`=**1**、`Delete "$INSTDIR`=**0**、`RMDir /r "$INSTDIR\state"`=**0**、`RMDir "$INSTDIR\state"`=**0**、`Delete "$INSTDIR\state\recent.json*"`=**0**、`RMDir "$INSTDIR"`=**0**——与 §二 实施步骤 1 的改前值逐条相等。
- 环境：dev server 在 `http://localhost:5175`（**不另起、不重启**；`5173` 是僵尸 server，禁用）；浏览器只用 **CDP 9222**；每段 E2E 前 `node .tmp/reset.mjs 9222`；不启动 Edge、不 kill `msedge`、不 `browser.close()`。
- **不发版**：`package.json` 的 `version`（0.32.1）不动；CHANGELOG 写进现有 `## Unreleased（第 29–44 轮，未发版）` 区间（`docs/CHANGELOG.md:5`）；不 push；**不改 `release/`**。
- 交付物：`docs/iteration/round-46/plan.md`（本文件）→ `impl.md` → `test.md`；截图 `shots/round-46/impl-*.png`（**不覆盖** finder 的 `bug-*`、`typora-*`、`ship-*`、`code-*`、`r46-ui-*`）。

## 〇、结论：本轮 3 个任务

| id | 标题 | 级别 | 类别 | 回应 | 估时 |
| :--- | :--- | :--- | :--- | :--- | ---: |
| **T1** | 卸载只删自己写的文件 + 发布链加两道「别装错包」的门 | **P1×2 + P2×3** | 安装 / 数据安全 | ship S1（P1）、S2（P1）、S3（P2）、S4（P2）、S5（P2） | 13 min |
| **T2** | 页边「整体评价」不再压住批注卡与模拟提示：第 1 张卡的 3 个按钮在静止状态全部可点 | **P1** | 用户可见 | ui F1（第 45 轮 F1/F2 未修的复核） | 11 min |
| **T3** | 切主题后 Mermaid 图跟着重绘（深色下连线不再隐形） | **P1** | 用户可见 | ui F2 | 10 min |

合计 **≈39 min（未砍）**（含 §五 收尾 2 min 与门禁串跑 3 min；revision 3 把 T2 从 9 调到 11，见 §八）。超出 `roles/planner.md` 的 35 min 上限 4 min——**开工前必须先按 §八 砍掉第 1、2 项**（T1 的 S5 定向整跑、T2 的深色截图），回到 **≈36 min**；要压到 35 再砍第 3 项（T1 的 B 段）。砍单顺序与每项实测代价见 §八。

**为什么只排 3 个**：本轮 27 条里 **P1 有 6 条**（typora #1 内联 base64、typora #2 行内 HTML 不渲染、ship S1 卸载递归删目录、ship S2 旧包、ui F1 页边遮挡、ui F2 Mermaid 不重绘）。按 `planner.md`「超出就砍到 3 个或更少」，3 个是这个上限下能保住「数据安全 + 两条连续两轮未修的 P1」的最低集合：T1 是唯一「动作会删掉用户目录里别人的文件」的条目；T2/T3 是第 45 轮 §六 自己写成「**下轮第一项**」的两条（`docs/iteration/round-45/plan.md:423`、`:428`），本轮 finder-ui 复核仍在。剩下两条 typora P1 进 §六 并写明下轮怎么排——不是没看见。

## 一、为什么是这三条

排序按 `roles/planner.md`：数据安全 → 用户可见收益 → 安装/体积/性能 → 内部质量。

- **T1（P1×2，数据安全 + 安装）**：`packaging/installer.nsi:48` 插入 `MUI_PAGE_DIRECTORY`（目录页可把 `$INSTDIR` 指到任意可写目录），而卸载段 `:196` 是 `RMDir /r "$INSTDIR"`——用户把安装目录选成 `D:\Apps` 或 `D:\笔记`，卸载会**整个递归删掉**，连带删掉不属于 Sidelight 的文件。这是本轮唯一「用户数据会被删」的条目，排第一。同批收掉另外四件发布链小刀（S2–S5）：本地 `release/` 的 0.32.1 setup 是**旧批次**（planner 实测 FileVersion=`0.31.1.0`，见 §二 表），而 `verify-installer.ps1:21` 默认就验它；`installer.ps1`/`portable.ps1` 只校验 setup 自己的 FileVersion（由 `package.json` 带入），从不看 payload 的 `Sidelight.exe`；`verify-installer.ps1:76-77` 往 `%LOCALAPPDATA%` 写 marker，受限环境第一行就硬退出；两份文档写死了一个必然过期的 setup 字节。
- **T2（P1，用户可见）**：1440×900 打开模拟批注，三张卡从 y=200 排到 734，而「整体评价」面板停在 y=262（`position: sticky; bottom: 0` 在它的流内位置高于视口底时**不生效**，`src/styles.css:802-811`），把第 1 张卡的核心内容与 3 个按钮整个盖住（`blockedButtonsInCard0: 3`）；「未配置 API Key」那条提示与卡 0 完全重叠（`noticeCoveredByCard0: 50`），宽窗下**一个字都看不到**。窄窗抽屉里同一问题把最后一张卡的按钮下半切掉（`overlap: 28`）。用户点了「追问 / 联网核对」没有任何反应。
- **T3（P1，用户可见）**：浅色下渲染好的图，切深色后不重绘：SVG 内 4 个节点文字与 5 条连线全是 `rgb(51,51,51)`，落在 `rgb(28,31,35)` 的容器上，**对比度 1.31:1**（WCAG 1.4.11 对图形对象要求 3:1）。截图里箭头、连线与「是」几乎完全消失。根因小：`src/lib/mermaidLazy.ts:29` 的 `initialized` 只初始化一次、`:57-65` 的 `configure()` 只读一次 `themeName()`、`:31`/`:92-100` 的缓存只按代码 hash 分键；`src/App.tsx:721-724` 切主题只改 `data-theme`。**真正生效的前提（R1）**：`configure()` 的唯一调用点在 `ensureMermaid()` 的首次加载分支（`:76`），而早退分支（`:69`）在 `mermaid` 非空时直接返回——不给它加调用路径，只改 `configure()` 内部守卫等于没改。**另外 `system` 恒按浅色渲染**（`:51-55` 只认 `data-theme === 'dark'`），系统深色 + 跟随系统时同样看不见。

**为什么不做 typora 的两条 P1（本轮最大争议点，写清理由）**：

- **typora #1（无文件夹粘贴图片 → 642,006 字 base64 + 草稿兜底失效）**：它同时要改「没句柄时不要内联」的**产品语义**（取消路径、是否给目录选择、多一步交互）与「正文 >256 KiB 不写草稿」的**存储策略**（`App.tsx:640-648`；finder 建议拆键或写 IndexedDB），是两条数据链（图片落盘 + 崩溃兜底）一起动。本轮 T1/T2/T3 已经各动一条关键路径，再叠一条 60–100 行、没有现成测试覆盖的存储改动，风险与 35 min 预算都不允许。**下轮第一项**，拆成「没句柄不内联」+「草稿上限分片」两步，先给产品负责人一句话确认交互。
- **typora #2（行内 HTML 在预览/导出也不渲染）**：修法清楚（只读副本过白名单 `kbd mark sup sub u ins del small abbr br`），但要同时保证第 41 轮 `<` `>` `&` 逐字节保真不回归（`escapes.test.ts`、`html.test.ts`），并严格挡 `<script>/on*`。~50 行 + 测试 + 预览 E2E ≈ 12 min，**下轮第二项**（与 `docs/typora-gap.md:49` 的补行同批）。

## 二、任务 T1（P1×2 + P2×3，安装 / 数据安全）：卸载只删自己的文件 + 两道「别装错包」的门

### 为什么

1. **ship S1（P1，用户数据）**：`installer.nsi:193-205` 的卸载段用 `RMDir /r "$INSTDIR"` 递归删安装目录；目录页（`:48`）允许改成任意已有目录。用户把目录选成 `D:\Apps`，卸载会把 `D:\Apps` 里**所有**文件一起删掉。同一位置还会删掉 `host.log*` 与宿主在 `$INSTDIR\webview2-data` 建的兜底数据目录（`host/Program.cs:28`、`:1396-1419`）——所以「只删自己写的」不能只删那 9 个载荷文件。
2. **ship S2（P1，验收会装错包）**：本地 `release\Sidelight-0.32.1-win-x64-setup.exe` = 824,595 B、**FileVersion `0.31.1.0`**（planner 实测），同源码今天重建是 1,304,598 B；`verify-installer.ps1:21` 默认就验 `release/` 这个旧包，`SHA256SUMS.txt` 只列 0.26.0。（本地文件与 GitHub 资产 824,209 B 不同，**不能据此断定已发布包有问题**；本轮只加门禁，不重打包、不改 `release/`——是否重出 0.32.1 安装包交产品负责人。）
3. **ship S3（P2，版本门自证）**：`installer.ps1:70-87` 断言的是 **setup** 的 FileVersion（由 `installer.nsi:40-43` 从 `${APPVERSION}` 带入，也就是从 `package.json` 带进来），不是 payload `host\bin\Sidelight.exe` 的版本。finder 实测：`package.json` 改 0.32.2、`host/bin` 不重编时 `portable.ps1` 照常 exit 0。
4. **ship S5（P2，受限环境硬退出）**：`verify-installer.ps1:76-77` 的 `New-Item -ItemType Directory -Force -Path $userData` + `Set-Content $marker` 在 `%LOCALAPPDATA%` 不可写时抛错（脚本 `$ErrorActionPreference = 'Stop'`），静默安装/升级/卸载一条都不跑；`$userData` 的「保留」断言在 `:196-197`，写失败时还会连带 FAIL。
5. **ship S4（P2，文档字节）**：`README.md:114` 与 `packaging/README.md:57` 各写死一个 round-45 的 setup 字节（1,304,634），本轮实测同源码是 1,304,598；第 45 轮报告里又是 1,303,397/1,304,062。字节每轮都变，「写死」本身就是错的：改成只留指针。

### 现状证据（planner 已逐条对过代码与文件）

| 项 | 位置 | 现状（实测） |
| :--- | :--- | :--- |
| 卸载递归删 | `packaging/installer.nsi:196` | `RMDir /r "$INSTDIR"` 1 处（`Select-String -SimpleMatch` 命中 1） |
| 目录页 | `packaging/installer.nsi:48` | `!insertmacro MUI_PAGE_DIRECTORY`，`$INSTDIR` 可改 |
| 安装载荷清单 | `packaging/installer.nsi:129-141` | 9 个文件 + `www\`；`WriteUninstaller` → `uninstall.exe`；运行后另有 `host.log*`、`webview2-data\`、`state\`（下一行） |
| 宿主 state 目录（R2） | `host/Program.cs:91`、`:1890-1928`、`:1931-1942` | `Main` 在 WebView 初始化**之前**跑 `InitState()`；三顺位 `%LOCALAPPDATA%\Sidelight`（`:1917`）→ **`baseDir\state`（`:1920`，第二顺位）** → `%TEMP%\Sidelight`（`:1925`）；`TryWritable`（`:1931-1942`）会 `CreateDirectory` + 写探针，所以 `%LOCALAPPDATA%` 不可写时 `$INSTDIR\state` **必定被建出** |
| 本地旧包 | `release\Sidelight-0.32.1-win-x64-setup.exe` | 824,595 B、FileVersion **0.31.1.0**、mtime 2026-11-16 22:21；portable zip 里 exe 是 0.32.1.0（87,040 B，与 `host\bin` 同尺寸） |
| setup 版本断言 | `packaging/installer.ps1:81-87` | 只查 setup；payload 无断言（`git grep payloadVersion` 0） |
| portable 版本 | `packaging/portable.ps1:13`、`:18-30` | `$version` 只用于文件名；payload 无断言 |
| marker 硬退出 | `packaging/verify-installer.ps1:75-77`、`:196-197` | 无 try/catch；`:239` 才删 marker；`$userData` 保留断言依赖 marker 存在 |
| 文档字节 | `README.md:114`、`packaging/README.md:57` | 各写死 1,304,634 B（round-45 的 dry-run 值） |
| `release/` 基线（开工前/收尾都要相等） | —— | setup `6C93F58FDAF470D1DA36D35D73E3CFE921324CEB133E757301395020004826B2`、portable `F4210C620D2DD2D6F0A5EF064234823863383C4518DBAECE5BCA21AAE4CBD5DD`、SHA256SUMS `2F32C26A8F165E9A8E9B4A52D51750B901F0BD536ECD376A71103EAC86CC9651` |

### 改动文件与函数（4 个文件 + 2 份文档）

1. **`packaging/installer.nsi:193-205`（卸载段）**——把 `RMDir /r "$INSTDIR"` 换成「逐个删自己写的 + 只对 `www`/`webview2-data` 用递归 + `state` 只删 `recent.json*` 再非递归删空目录 + 末尾非递归删目录」：

   ```
   Section "Uninstall"
     Call un.CheckRunning
     Delete "$SMPROGRAMS\Sidelight.lnk"
     ; Uninstall removes only the files this installer wrote. A recursive RMDir here
     ; wiped the whole install directory, including unrelated files when the user
     ; pointed the directory page at an existing folder.
     Delete "$INSTDIR\Sidelight.exe"
     Delete "$INSTDIR\Microsoft.Web.WebView2.Core.dll"
     Delete "$INSTDIR\Microsoft.Web.WebView2.WinForms.dll"
     Delete "$INSTDIR\WebView2Loader.dll"
     Delete "$INSTDIR\Sidelight.exe.config"
     Delete "$INSTDIR\sidelight.ico"
     Delete "$INSTDIR\README.txt"
     Delete "$INSTDIR\LICENSE"
     Delete "$INSTDIR\assoc-plan.txt"
     Delete "$INSTDIR\host.log*"
     RMDir /r "$INSTDIR\www"
     RMDir /r "$INSTDIR\webview2-data"
     ; Host state dir: %LOCALAPPDATA% -> baseDir\state -> %TEMP% (host/Program.cs:1920).
     ; Only recent.json* is ours (host/Program.cs:1899, :2009). Never recurse here:
     ; the directory page (:48) can point at an existing folder that has its own state\.
     Delete "$INSTDIR\state\recent.json*"
     RMDir "$INSTDIR\state"
     Delete "$INSTDIR\uninstall.exe"
     RMDir "$INSTDIR"
     DeleteRegKey HKCU "${UNINST_KEY}"
     DeleteRegValue HKCU "Software\Classes\.md\OpenWithProgids" "Sidelight.md"
     DeleteRegKey /ifempty HKCU "Software\Classes\.md\OpenWithProgids"
     DeleteRegKey HKCU "Software\Classes\Sidelight.md"
     DeleteRegKey HKCU "Software\Classes\Applications\Sidelight.exe"
     DeleteRegKey HKCU "Software\Sidelight"
     ; User data under %LOCALAPPDATA%\Sidelight (WebView2 profile) is intentionally kept.
   SectionEnd
   ```

   - 注释**必须 ASCII**（`installer.nsi:2-3` 已写明 makensis 无 BOM 时拒收非 ASCII 注释）；文件末尾原有的 `DeleteReg*` 五行与「保留用户数据」注释**原样保留**。
   - `assoc-plan.txt` 只在 `-AssocDryRun` 构建里可能出现（`installer.nsi:161-174`），`Delete` 对不存在的文件是 no-op。
   - **`state\` 必须在这一块里，但只能删自己的文件（R2 + V2-R3）**：宿主 `ResolveStateDir()` 的三顺位是 `%LOCALAPPDATA%\Sidelight` → `baseDir\state`（`host/Program.cs:1920-1921`）→ `%TEMP%\Sidelight`（`:1925`），**`baseDir\state` 是第二顺位、不是兜底**；`InitState()`（`:91`）在 WebView 初始化之前就跑，`TryWritable`（`:1931-1942`）会建目录。所以「装过 + 启动过一次」的目录里一定有 `state\`；漏删它，`RMDir "$INSTDIR"`（非递归）会静默失败，`verify-installer.ps1:184-189` 打印真 `FAIL 卸载残留`。
   - **不能用 `RMDir /r "$INSTDIR\state"`（V2-R3）**：正常机器上第一顺位 `%LOCALAPPDATA%\Sidelight` 就成功，宿主**根本不在 `$INSTDIR` 建 state**；只有「用户用目录页（`:48`）把安装目录指到一个本来就有 `state\` 的目录」时才命中——那时递归删就会删掉用户的文件，与本任务「只删自己写的」相反。宿主在该目录里只写三样：`recent.json`（`:1899`）、`recent.json.bad-<ticks>`（`:2009`）、原子写的临时文件 `.sidelight-tmp-*`（`:764`）。所以用 `Delete "$INSTDIR\state\recent.json*"`（通配同时覆盖 `.bad-*`）+ 非递归 `RMDir "$INSTDIR\state"`（目录空了才删得掉）。
   - **`www\` / `webview2-data\` 继续用递归删**：前者每次安装整体重写（`:129-141`），后者整个目录都是 WebView2 自己的 profile（`host/Program.cs:1404`），没有用户文件。这个区别要写进 `impl.md`。
   - **残留 `.sidelight-tmp-*` 就让它留着**（只会在崩溃时出现）：目录不会被静默删掉，`verify-installer.ps1:184-189` 报 `卸载残留` 是真实情况，不该吞。
   - 新加的 3 行注释（`:94-96`）**必须 ASCII**（同上一条）。
   - `RMDir "$INSTDIR"`（非递归）在目录里还有用户文件时会静默失败——这正是我们要的行为。

2. **`packaging/installer.ps1`（在 `:26` 之后、`$nsisDir` 之前加 8 行）**：

   ```powershell
   # 版本门（第 46 轮 ship S3）：setup 的 FileVersion 是自证的（由 package.json 带入），
   # 这里断言真正的 payload 与 package.json 同版本，挡住 stale host\bin。
   $payloadVersion = [System.Diagnostics.FileVersionInfo]::GetVersionInfo((Join-Path $root 'host\bin\Sidelight.exe')).FileVersion
   if ($payloadVersion -ne "$version.0") {
       Write-Host ("host\bin\Sidelight.exe 的 FileVersion 是 {0}，package.json 是 {1}。先重跑 host\build.ps1" -f $payloadVersion, $version)
       exit 1
   }
   Write-Host ("payload fileVersion={0}" -f $payloadVersion)
   ```

3. **`packaging/portable.ps1`（同样的一段，放在 `:30` 之后、`sidelight.ico` 检查之前）**：同一段代码，`$root`/`$bin` 已在该脚本里定义（`:7`、`:9`），用 `Join-Path $bin 'Sidelight.exe'`。

4. **`packaging/verify-installer.ps1`（四处）**：
   - `:6` 之前（注释块之后、`$ErrorActionPreference` 之前；`param()` 必须是脚本的第一条语句）加 `param([string]$Setup = '', [switch]$PreflightOnly)`，`:21` 改成：
     ```powershell
     if ($Setup) {
         $setup = if ([IO.Path]::IsPathRooted($Setup)) { $Setup } else { Join-Path $root $Setup }
     } else {
         $setup = Join-Path $root "release\Sidelight-$version-win-x64-setup.exe"
     }
     ```
     （允许用 `-Setup .tmp\assoc-dryrun-setup.exe` 验当轮新包，不再只能验 `release/`。**R5**：相对路径必须按 `$root` 解析——`[IO.Path]::GetFullPath` 按**进程当前目录**解析，在 `packaging\` 里或在别的 CWD 跑就会得到「缺少安装包」的假红。）
   - `:43` 之后加 **S2 门**（打印 + 旧包报 UNVERIFIED，不 FAIL——环境里 `release/` 就是旧包），并在这一段末尾加一个干跑出口：
     ```powershell
     # release/ 里的包可能是旧批次：打印 mtime/大小/FileVersion，与 host\bin 对不上就报 UNVERIFIED（第 46 轮 S2）
     $payloadExe = Join-Path $root 'host\bin\Sidelight.exe'
     $setupInfo = Get-Item $setup
     $setupFileVersion = $setupInfo.VersionInfo.FileVersion
     Write-Host ("setup={0:N0} B  mtime={1:yyyy-MM-dd HH:mm:ss}  FileVersion={2}" -f $setupInfo.Length, $setupInfo.LastWriteTime, $setupFileVersion)
     if (Test-Path $payloadExe) {
         $payloadInfo = Get-Item $payloadExe
         Write-Host ("payload mtime={0:yyyy-MM-dd HH:mm:ss}  FileVersion={1}" -f $payloadInfo.LastWriteTime, $payloadInfo.VersionInfo.FileVersion)
         if ($setupFileVersion -ne $payloadInfo.VersionInfo.FileVersion) {
             Unverified ("setup 的 FileVersion 是 {0}，payload 是 {1}：装的是别的批次的包" -f $setupFileVersion, $payloadInfo.VersionInfo.FileVersion)
         } elseif ($payloadInfo.LastWriteTime -gt $setupInfo.LastWriteTime) {
             Unverified ("release/ 里的安装包比 host\bin 旧（setup {0:yyyy-MM-dd HH:mm} < payload {1:yyyy-MM-dd HH:mm}）" -f $setupInfo.LastWriteTime, $payloadInfo.LastWriteTime)
         }
     }
     if ($PreflightOnly) {
         Write-Host ("summary: preflight（{0} UNVERIFIED）" -f $script:unverified)
         exit 0
     }
     ```
     （`-PreflightOnly` 是本轮为验证 S2 加的干跑口：只跑到「包与载荷是否同批」，不安装、不写 HKCU。）
   - `:75-77` 换成带状态位的 try/catch（**S5**）：
     ```powershell
     $markerWritten = $false
     try {
         New-Item -ItemType Directory -Force -Path $userData | Out-Null
         Set-Content -Path $marker -Value 'keep-me' -Encoding UTF8
         $markerWritten = $true
     } catch {
         Unverified ("用户数据 marker 写不进 {0}（受限环境）：{1}" -f $userData, $_.Exception.Message)
     }
     ```
     并把 `:196-197` 改成：`$markerWritten` 为真时按今天的方式断言（保留 Pass/Fail），为假时 `Unverified '用户数据保留：marker 未写成，跳过'`。

5. **`README.md:114` 与 `packaging/README.md:57`（S4）**：删掉写死的 setup 字节（两处 `1,304,634` 以及同句的「第 45 轮本机 … 重建」），只留「安装包与便携 zip 的具体字节每版都不同，**以 Release 页的 `SHA256SUMS-<版本>.txt` 为准**（本机预算内部 45,000,000 B / 硬线 50,000,000 B）」。**不要**在文档里写本轮 dry-run 的字节——`src/` 的改动还会让 `dist` 变化，写一次就再过期一次（AGENTS §8 已记这条坑）；本轮 dry-run 的实测值只进 `impl.md`。

6. **不动**：`release/`（一个字节都不写）、`package.json` 的版本、`host/build.ps1`、CI workflow（`release.yml` 的版本断言同样只查 setup，属于「发布专项」；本轮不加，见 §六 备注）。

### 实施步骤

1. **开工前基线**（先贴，AGENTS §8）：
   - `Select-String -Path packaging\installer.nsi -Pattern 'RMDir /r "$INSTDIR"' -SimpleMatch | Measure-Object | % Count` → **1**（含 `"` 的模式**不能**用 `git grep`：PowerShell 会吃掉双引号，AGENTS §8 第 45 轮记录）。
   - `Select-String -Path packaging\installer.nsi -Pattern 'Delete "$INSTDIR' -SimpleMatch | Measure-Object | % Count` → **0**。
   - `Select-String -Path packaging\installer.nsi -Pattern 'RMDir /r "$INSTDIR\state"' -SimpleMatch | Measure-Object | % Count` → **0**（V2-R3：这一行**改后必须仍是 0**，不许递归删用户的 `state\`）。
   - `Select-String -Path packaging\installer.nsi -Pattern 'RMDir "$INSTDIR\state"' -SimpleMatch | Measure-Object | % Count` → **0**（非递归版，改后 1；它不会误命中 `RMDir /r "$INSTDIR\state"`，因为 `/r ` 夹在中间）。
   - `Select-String -Path packaging\installer.nsi -Pattern 'Delete "$INSTDIR\state\recent.json*"' -SimpleMatch | Measure-Object | % Count` → **0**（改后 1）。
   - `git grep -c "payloadVersion" -- packaging` → **0**；`git grep -c "markerWritten" -- packaging` → **0**；`Select-String -Path packaging\verify-installer.ps1 -Pattern 'param([string]$Setup' -SimpleMatch | Measure-Object | % Count` → **0**。
   - **`release/` 三份文件 SHA256**（开工前一组，收尾再一组，逐条相等才算「没碰 release/」；`release/` 被 `.gitignore:10` 忽略，`git status` 改前改后恒空，不能单独当证据）：
     ```powershell
     Get-FileHash release\Sidelight-0.32.1-win-x64-setup.exe, release\Sidelight-0.32.1-win-x64-portable.zip, release\SHA256SUMS.txt -Algorithm SHA256
     ```
     期望：`6C93F58FDAF470D1DA36D35D73E3CFE921324CEB133E757301395020004826B2`（setup，824,595 B）、`F4210C620D2DD2D6F0A5EF064234823863383C4518DBAECE5BCA21AAE4CBD5DD`（portable，910,360 B）、`2F32C26A8F165E9A8E9B4A52D51750B901F0BD536ECD376A71103EAC86CC9651`（SHA256SUMS，207 B）。
   - **改前红基线**：先写第 3 步的探针脚本，再跑一次**未改动**的 `powershell -ExecutionPolicy Bypass -File packaging\installer.ps1 -AssocDryRun`（产 `.tmp\assoc-dryrun-setup.exe`），然后跑探针 → 期望 `RESULT a keepMe=False herDoc=False userStateKept=False dirExists=False`（`release\` 那个旧包同样是递归 `RMDir`，可以交叉对照，但**不要动它**）。
2. 按上面 1–5 改 4 个文件 + 2 份文档。**`packaging/*.ps1` 与 `installer.nsi` 都必须保住 UTF-8 BOM**（见 §七 第 1 条：`edit` 工具实测会丢掉 BOM）。
3. 写 `.tmp\e2e-r46-impl-uninstall.ps1`（**ASCII only**，抄 `.tmp\e2e-r45-install.ps1` 的 `Start-NoShell` 与 `$env:TEMP` 重定向），两段：
   - **A 段（用户目录里还有别人的文件 + 宿主自己写的文件）**：`$dir = .tmp\r46-uninstall-a`；`$setup = .tmp\assoc-dryrun-setup.exe`；`/S /D=$dir` 安装；断言 8 个 `File` 载荷（exe / 两个 SDK dll / Loader / config / ico / README.txt / LICENSE）+ `www\index.html` + `uninstall.exe` 都在；再放两个「别人的文件」：`keep-me.txt`、`her-doc.md`；再放三个「宿主自己写的」：`host.log` 与 `host.log.1`（验 `host.log*` 通配）、`state\recent.json`（验 `Delete "$INSTDIR\state\recent.json*"`；先 `New-Item -ItemType Directory $dir\state`）；**另加一个放在 `state\` 里的「别人的」`state\mine.txt`（V2-R3 的靶子：递归 `RMDir /r` 会连它一起删）**；跑 `uninstall.exe /S`（等目录有变化，最多 20 s）；断言 `keepMe=True`、`herDoc=True`、`exeGone=True`、`wwwGone=True`、`logGone=True`（两个 `host.log*` 都不在）、`recentGone=True`（`$dir\state\recent.json` 不在）、`userStateKept=True`（`$dir\state\mine.txt` **还在**、`$dir\state` 目录还在——递归版这里必红）、`dirExists=True`，并打印目录里剩下的文件清单。
   - **B 段（干净目录，但里面只有宿主写的 state 文件）**：`$dir = .tmp\r46-uninstall-b`；同样的安装 → `New-Item -ItemType Directory $dir\state` + 写 `state\recent.json`（**只放 Sidelight 自己的文件，不放用户文件**）→ 卸载；断言 `dirExists=False`：干净目录仍然整个删掉（`Delete` 删掉 `recent.json`、非递归 `RMDir "$INSTDIR\state"` 删掉空目录、`RMDir "$INSTDIR"` 删掉安装目录），不回归 `verify-installer.ps1:184-189`。这一段同时证明「空 state 目录会被清掉」。
4. **重建（改了 nsi）**：`powershell -ExecutionPolicy Bypass -File packaging\installer.ps1 -AssocDryRun` → exit 0，记下 `payload fileVersion=0.32.1.0` 与 `assoc-dryrun=<N> B`；再跑探针 → A/B 两段全绿。
5. **S3 的红/绿**（不写 `release/`）：
   - 绿：`installer.ps1 -AssocDryRun` exit 0（payload 0.32.1.0 = package.json 0.32.1）。
   - 红：用 `edit` 把 `package.json` 的 `"version"` 临时改成 `"0.32.2"` → 同一命令必须 **exit 1** 且打印「host\bin\Sidelight.exe 的 FileVersion 是 0.32.1.0，package.json 是 0.32.2」→ 改回 `0.32.1` → `git diff -- package.json` **必须为空**。
6. **S5 的定向验证**（限时，能跑完就跑；跑不完按 §八 砍）：造一个「`%LOCALAPPDATA%` 不可写」的确定性场景——`New-Item -ItemType Directory .tmp\r46-fake-la`，再 `Set-Content .tmp\r46-fake-la\Sidelight 'x'`（**同名位置放一个文件**，`New-Item -ItemType Directory` 必失败）；然后
   ```powershell
   $env:LOCALAPPDATA = (Resolve-Path '.tmp\r46-fake-la').Path
   powershell -NoProfile -ExecutionPolicy Bypass -File packaging\verify-installer.ps1 -Setup .tmp\assoc-dryrun-setup.exe
   ```
   断言输出里有 `UNVERIFIED 用户数据 marker` 且继续到了 `PASS 安装写入`；后续「装后程序没起来」（`verify-installer.ps1:148`，宿主日志里是 `0x8000FFFF`）记「环境 FAIL」（与第 45 轮 U1 同因），**不算本轮回归**。**只有这一条能归环境**：`FAIL 卸载残留`（`verify-installer.ps1:184-189`）与 `FAIL 用户数据保留`（`:197`）都是**真回归**，不许归环境——R2 原本会让这个真 FAIL 被「环境 FAIL」这句话吞掉。这条定向跑里 `$env:LOCALAPPDATA` 第一顺位必失败、`%TEMP%` 排在第二顺位之后，所以宿主的 state 落点必然是 `$instdir\state`（`host/Program.cs:1920`），恰好就是 R2 要清理的那一项（revision 3 的删法是 `Delete "$INSTDIR\state\recent.json*"` + 非递归 `RMDir "$INSTDIR\state"`，见 §二 第 1 条）。
7. **S2 的两个干跑**（不安装，几秒）：
   ```powershell
   powershell -NoProfile -ExecutionPolicy Bypass -File packaging\verify-installer.ps1 -PreflightOnly                                # 默认 release/ 旧包 → 打印 UNVERIFIED（0.31.1.0 ≠ 0.32.1.0）
   powershell -NoProfile -ExecutionPolicy Bypass -File packaging\verify-installer.ps1 -PreflightOnly -Setup .tmp\assoc-dryrun-setup.exe  # 当轮新包 → 无 UNVERIFIED
   ```
8. 收尾文档（见 §五）。

### 验收标准（可执行）

```powershell
# —— 静态（先贴改前基线，见实施步骤 1）
Select-String -Path packaging\installer.nsi -Pattern 'RMDir /r "$INSTDIR"' -SimpleMatch | Measure-Object | % Count   # 改前 1 → 改后 0
Select-String -Path packaging\installer.nsi -Pattern 'Delete "$INSTDIR' -SimpleMatch | Measure-Object | % Count     # 改前 0 → 改后 12（8 载荷 + assoc-plan.txt + host.log* + state\recent.json* + uninstall.exe）
Select-String -Path packaging\installer.nsi -Pattern 'RMDir "$INSTDIR"' -SimpleMatch | Measure-Object | % Count      # 改前 0 → 改后 1（非递归）
Select-String -Path packaging\installer.nsi -Pattern 'RMDir /r "$INSTDIR\state"' -SimpleMatch | Measure-Object | % Count   # 改前 0 → 改后 0（V2-R3：禁止递归删 state）
Select-String -Path packaging\installer.nsi -Pattern 'RMDir "$INSTDIR\state"' -SimpleMatch | Measure-Object | % Count      # 改前 0 → 改后 1（非递归，只删空目录）
Select-String -Path packaging\installer.nsi -Pattern 'Delete "$INSTDIR\state\recent.json*"' -SimpleMatch | Measure-Object | % Count   # 改前 0 → 改后 1
git grep -c "payloadVersion" -- packaging        # 改前 0 → 改后两个文件各 2 处（installer.ps1 / portable.ps1）
git grep -c "markerWritten" -- packaging         # 改前 0 → 改后 3–4 处（verify-installer.ps1）
git grep -n "1,304,634" -- README.md packaging/README.md   # 改前 2 → 改后 0

# —— BOM（三个 ps1 + nsi 都必须是 239,187,191）
foreach ($f in 'packaging\installer.nsi','packaging\installer.ps1','packaging\portable.ps1','packaging\verify-installer.ps1') { "$f " + (([IO.File]::ReadAllBytes($f)[0..2]) -join ',') }

# —— 语法解析（在当前会话直跑；不要套 powershell -Command "…" 双引号，AGENTS §8）
$e = $null
foreach ($f in 'packaging\installer.ps1','packaging\portable.ps1','packaging\verify-installer.ps1') {
  [void][System.Management.Automation.Language.Parser]::ParseFile((Resolve-Path $f).Path, [ref]$null, [ref]$e)
  "$f errors=$($e.Count)"; $e = $null
}

# —— 编译 + 行为
powershell -ExecutionPolicy Bypass -File packaging\installer.ps1 -AssocDryRun     # exit 0；payload fileVersion=0.32.1.0
powershell -NoProfile -ExecutionPolicy Bypass -File .tmp\e2e-r46-impl-uninstall.ps1  # A/B 两段全 PASS
# S3 红/绿：见实施步骤 5；结束后 git diff -- package.json 必须为空
# S2 干跑（不安装）：旧包报 UNVERIFIED、当轮新包不报
powershell -NoProfile -ExecutionPolicy Bypass -File packaging\verify-installer.ps1 -PreflightOnly
powershell -NoProfile -ExecutionPolicy Bypass -File packaging\verify-installer.ps1 -PreflightOnly -Setup .tmp\assoc-dryrun-setup.exe

# —— 没碰 release/（开工前 / 收尾各一次，六条逐字节相等）
Get-FileHash release\Sidelight-0.32.1-win-x64-setup.exe, release\Sidelight-0.32.1-win-x64-portable.zip, release\SHA256SUMS.txt -Algorithm SHA256
git status --porcelain release/    # 空（附加证据）
```

断言汇总：

1. **A 段**：`keepMe=True`、`herDoc=True`、`logGone=True`、`recentGone=True`、`userStateKept=True`（`state\mine.txt` 还在——**这是 V2-R3 的靶子，递归 `RMDir /r "$INSTDIR\state"` 这里必红**），`exeGone=True`、`wwwGone=True`，`dirExists=True`（改前：`keepMe=False`、`herDoc=False`、`userStateKept=False`、`dirExists=False`，因为旧包递归删整个目录；所以 A 段的「改前红」不能区分子项，**V2-R3 的红靠改后忘掉非递归版本那一行来显形**：把 `Delete recent.json*` 换成 `RMDir /r` 时 `userStateKept=False`）。
2. **B 段**：`dirExists=False`（连「只有宿主自己写的 `state\recent.json`」的目录也整个清掉；忘掉 `Delete "$INSTDIR\state\recent.json*"` 时 `state\` 会留下、非递归 `RMDir` 失败 → `dirExists=True` 红。不回归 `verify-installer.ps1:184-189`）。
3. **S3 绿**：`assoc-dryrun=<N> B`、exit 0；**S3 红**：`package.json=0.32.2` 时 exit 1 且消息含 `payload`/`FileVersion`；恢复后 `git diff -- package.json` 空。
4. **S2**：`-PreflightOnly` 默认路径输出 `setup=824,595 B … FileVersion=0.31.1.0` + `payload … 0.32.1.0` + `UNVERIFIED setup 的 FileVersion 是 0.31.1.0，payload 是 0.32.1.0`，`summary: preflight（1 UNVERIFIED）`、exit 0；`-Setup .tmp\assoc-dryrun-setup.exe` 时 `0 UNVERIFIED` 且 exit 0。
5. **S5**：定向场景里输出 `UNVERIFIED 用户数据 marker` 后继续到 `PASS 安装写入`（若按 §八 砍掉，记 UNVERIFIED 并写清上面的复现命令）。

### 风险与坑

- **中低**。最大风险是卸载列表漏项：漏了 `host.log*`、`webview2-data` 或 `state` 会让 `verify-installer.ps1` 的「安装目录已删除」断言在**装过后启动过**的环境里变 FAIL（宿主把日志写在 `baseDir\host.log`，`host/Program.cs:28`；数据目录兜底 `baseDir\webview2-data`，`:1396-1419`；state 目录 `baseDir\state`，`:1920`，且 `:91` 在 WebView 初始化之前就跑）。A 段探针已把 `host.log`、`host.log.1`、`state\recent.json`（外加用户自己的 `state\mine.txt`）写进去，就是为了锁这三条。
- **删的粒度分三种（V2-R3）**：`www\`、`webview2-data\` 递归删（整目录都是 Sidelight / WebView2 自己的，`installer.nsi:129-141`、`host/Program.cs:1404`）；`state\` 只 `Delete "$INSTDIR\state\recent.json*"` + **非递归** `RMDir "$INSTDIR\state"`（正常机器宿主根本不在这里建 state，只有目录页指到已有目录时才出现，里面可能有用户文件）；其余 12 个 `Delete` 逐个点名。这一条要原样抄进 `impl.md`，`RMDir /r "$INSTDIR\state"` 一旦出现就是 P2 回归。
- **「环境 FAIL」只认一条（R2）**：`FAIL 装后程序没起来`（`verify-installer.ps1:148`，宿主日志 `0x8000FFFF`）是本沙箱的已知环境问题；`FAIL 卸载残留`（`:184-189`）与 `FAIL 用户数据保留`（`:197`）**都是真回归**，不许写进「环境 FAIL」清单，也不许在 `impl.md` 里用一句「同类 FAIL 不算回归」带过。
- **BOM**：`edit` 工具实测会把 UTF-8 **BOM 丢掉**（planner 本轮用 `.tmp\r46-bom-probe.ps1` 实测：改后前三字节 `35,32,228`）。四个文件改完必须按验收命令复查；丢了就
  ```powershell
  $p = (Resolve-Path 'packaging\installer.ps1').Path
  [IO.File]::WriteAllText($p, [IO.File]::ReadAllText($p), (New-Object Text.UTF8Encoding($true)))
  ```
  对 3 个 ps1 与 `installer.nsi` 各做一次（`ReadAllText` 按 UTF-8 读无 BOM 文件是正确的）。
- 注释必须 ASCII；中文只在字符串里（`installer.nsi` 现有 `MessageBox` 文案就是中文，不要去动）。
- `installer.ps1 -AssocDryRun` 只写 `.tmp\assoc-dryrun-setup.exe`（`:52-57`）；**绝对不要**跑不带 `-AssocDryRun` 的 `installer.ps1` 或 `portable.ps1`——它们会写 `release/`（`installer.nsi:20-22` 的 `OUTFILE` 默认值、`portable.ps1:14`）。
- `package.json` 的临时改动必须在同一段里改回；收尾 `git diff --stat -- package.json` 空。
- 探针会静默安装到 `.tmp`、写/删 HKCU 卸载项（与第 45 轮探针同）；不装到默认路径、不写 HKLM。
- 若 `host\bin` / `dist` 缺失（被别人清空），先停下来问根代理，不要自己跑 `host/build.ps1`（会长时间占用）。

### 需要的证据（无 UI 截图）

- 编译日志（`payload fileVersion=0.32.1.0`、`assoc-dryrun=<N> B`）。
- 探针完整输出（A 段改前红 + 改后绿、B 段绿），并把「改前」与「改后」两段原样贴进 `impl.md`；A 段必须看到 `userStateKept=True`（`state\mine.txt` 还在）与 `recentGone=True`——V2-R3 的「只删自己写的」由这一对读数证明。
- 静态基线六条（§二 实施步骤 1）：`RMDir /r "$INSTDIR"`=1、`Delete "$INSTDIR`=0、`RMDir /r "$INSTDIR\state"`=0、`RMDir "$INSTDIR\state"`=0、`Delete "$INSTDIR\state\recent.json*"`=0、`RMDir "$INSTDIR"`=0。
- S3 红/绿两条命令输出。
- `release/` 的两组 SHA256（六条逐字节相等）。

## 三、任务 T2（P1，用户可见）：「整体评价」不再压住批注卡与模拟提示

### 为什么

卡片是 `position: absolute`（`src/styles.css:953-963`），纵向位置只按正文坐标算（`src/App.tsx:1951-1990` 的 `useLayoutEffect`：`floor + 12` 与 `coordsAtPos`），**页边栏自身的流内内容（`.rail-head`、`.rail-goal`、`.rail-notice-mock`）完全不参与**；而「整体评价」是 `position: sticky; bottom: 0`（`styles.css:802-811`），它的流内位置紧跟在这些内容之后（y≈262），高于视口底，所以 sticky 不生效，面板就**停在栏中间当挡板**。于是：卡 0 与面板重叠 93 px、3 个按钮全部被挡；模拟提示与卡 0 完全重叠（50 px），一个字看不到；窄窗抽屉里面板钉在视口底、最后一张卡的按钮下半被切 28 px。

### 现状证据（finder 本轮实测，`shots/round-46/r46-ui-33-rail-notes.png`、`r46-ui-34-rail-drawer-1024.png`）

| 项 | 读数 |
| :--- | :--- |
| 三张卡 | `[996,200,260,164]`、`[996,376,260,202]`、`[996,590,260,144]` |
| 面板 | `[996,262,260,93]`，与卡 0 纵向重叠 **93 px** |
| 卡 0 的三个按钮 | `elementFromPoint` 逐个测：`blockedButtonsInCard0: 3` |
| 模拟提示 | `[996,200,260,50]`，`noticeCoveredByCard0: 50`，中心命中卡里的 `SPAN.note-kind-evaluation` |
| 窄窗抽屉 | 卡 3 `[701,476,297,144]`、面板 `[701,591,297,93]`，重叠 **28 px** |
| 第 45 轮 §六 的承诺 | 「下轮第一项」（`round-45/plan.md:423`） |

### 几何前提与门的取舍（revision 3 新增，V2-R1：按修法 A 写验收）

| 量 | 值 | 依据 |
| :--- | :--- | :--- |
| 滚动口底边 | **872** | `900 − 46`（`.topbar`，`styles.css:178`）`− 38`（`.toolbar`，`:1247`）`− 28`（`.status-bar`，`:1527`）；与 finder 实测 `railRect.top=136`（`= 84 + 52`，`.doc-layout` 的 `padding: 52px 32px 220px`，`:262-269`）自洽 |
| 修复后卡片整体位移 | **+62 px** | `floor` 起点从 `-Infinity` 变成 `flowBottom=114`：卡 0 `200→262`、卡 1 `376→438`、卡 2 `590→652` |
| 修复后末卡底 | **≈796** | `652 + 144`（finder 实测卡 2 高 144） |
| `railSpace` | **546** | `floor − flowBottom = 660 − 114` |
| 面板自然位 | 顶 **808**、底 **901** | 末卡底 796 + `margin-top: 12px`（`styles.css:806`） |
| 面板实际位（sticky） | 顶 **779**、底 **872** | 自然底 901 > 滚动口底 872 → `position: sticky; bottom: 0` 必上推 29 px；`872 − 93 = 779` |
| 可用纵向空间 | **76** | `872 − 796`，**小于面板高 93** |

**结论（V2-R1）**：`maxCardBottom <= panel.top - 0.5` 在 1440×900 上**恒假**（`796 ≤ 778.5`），而且没有任何 spacer 取值能同时满足「面板在末卡下方」与「面板不越出滚动口」——两条约束没有可行区间。修法二选一，**本轮拍板选 A（保留 sticky 常驻视口底）**；B（把面板改成 `position: static`，与抽屉规则统一）会改变长文档里的既有行为，本轮不做，只记进 §六 备选。因此验收门改成：

- **门 A1（静止态）**：只锁第 1 张卡，`card0.bottom <= panel.top - 0.5`（P1 原文要求的就是「第 1 张卡的 3 个按钮」）。
- **门 A2（滚到底）**：`document.querySelector('.doc-scroll').scrollTop = scrollHeight`（浏览器自动夹到 `scrollHeight − clientHeight`）后断言 `lastCard.bottom <= panel.top - 0.5`。这一步证明 spacer 真的让面板在文档末尾落到卡片下方。同时打印 `scrollMax = scrollHeight − clientHeight` 与 `lastCardVisible = lastCard.bottom > 0`；`scrollMax === 0`（文档短到不滚）时这条降级为 UNVERIFIED 并写清原因，**不许**当成 PASS；`lastCardVisible === false`（末卡已滚出视口上沿）时门仍成立，但含义只是「末卡能被滚到不被覆盖的位置」，`impl.md` 要把 `scrollTop`/`scrollMax`/两个 rect 原样贴出，别当成「末卡可见且不被盖」的证据。
- **只作诊断打印**：`maxCardBottom`、`lastCardOverlap = lastCard.bottom − panel.top`（静止态期望 **≈17**）、`panelTop`、`scrollportBottom`。
- **残差写进 §三 风险、不当门**：静止时末卡底部约 **17 px** 落在钉住的面板头后面（`796 − 779`），滚动约 20 px 即可点；本轮只承诺「第 1 张卡静止可点 + 每张卡都能滚到不被覆盖」，**不承诺**「静止时每张卡都不被覆盖」。


### 改动文件与函数（3 个文件）

1. **`src/App.tsx`**：
   - `:384` 旁加一个状态：`const [railSpace, setRailSpace] = useState(0)`（名字用「卡片区需要为面板让出的高度」，别叫 padding）。
   - `:1951-1990` 的 `useLayoutEffect` 里：
     - 量出**栏内流内内容底部**（相对栏顶）：
       ```ts
       let flowBottom = 0
       for (const child of Array.from(rail.children)) {
         if (child.classList.contains('note')) continue
         if (child.classList.contains('rail-overall')) continue
         if (child.classList.contains('rail-cards-space')) continue
         const bottom = child.getBoundingClientRect().bottom - railRect.top
         if (bottom > flowBottom) flowBottom = bottom
       }
       let floor = flowBottom   // 原来是 -Infinity：第一张卡会压在「模拟提示」上
       ```
     - 循环结束后 `floor` 就是最后一张卡的底：
       ```ts
       const pendingCount = annotations.filter((item) => item.status === 'pending').length
       setRailSpace(pendingCount > 0 ? Math.max(0, Math.round(floor - flowBottom)) : 0)
       ```
       （React 对相同值会 bail out，不必自己防抖；`setTops` 保留现有 `JSON.stringify` 比较。）
   - `:5064-5111` 给 `MarginRail` 传参 `railSpace={railSpace}`。
2. **`src/components/MarginRail.tsx`**：
   - Props 加 `railSpace: number`；在 `{(overall.length > 0 || unresolvedNotes.length > 0) && (`（`:242`）**之前**插入：
     ```tsx
     {pending.length > 0 && railSpace > 0 && (
       <div className="rail-cards-space" style={{ height: `${railSpace}px` }} aria-hidden="true" />
     )}
     ```
   - 不放文案、不放 `tabIndex`；`aria-hidden` 防止读屏念空白。
3. **`src/styles.css`**：
   - `.rail-overall`（`:802-811`）加两行「保险」：`pointer-events: none;`，并给 `.rail-overall-head`（`:813`）与 `.rail-overall-body`（`:843`）各加 `pointer-events: auto;`（滚动中面板仍可能盖住一瞬，别让那一下把点击吃掉；**几何断言仍是主判据**，不能靠这一条镀绿）。
   - **R6 + V2-R1 的后果写在断言里**：`pointer-events: none` 会让 `elementFromPoint` **穿过**面板命中下层卡片/提示，命中测试从此会假绿，只能当诊断打印。门是几何，共四条：门 A1 `card0.bottom <= panelTop - 0.5`（静止态）、门 A2 `lastCard.bottom <= panelTop - 0.5`（滚到底后）、提示 `notice.bottom <= panel.top - 0.5`、提示 `notice.bottom <= card0.top - 0.5`。**不要**再写 `maxCardBottom <= panelTop - 0.5` 这种全卡版本（V2-R1：1440×900 上恒假）。
   - 媒体查询（`:2450-2549`）里加：
     ```css
     .rail-cards-space { display: none; }   /* 抽屉里卡片改为文档流，不需要让位 */
     .app.rail-open .rail-overall { position: static; }  /* 抽屉里面板是真 footer，不再钉在视口底 */
     ```
     （`.app.rail-open .margin-rail .note { position: static }` 已在 `:2527-2531`，抽屉里卡片本来就占流。）
4. **不动**：`tops` 的计算公式（`Math.max(natural, floor + 12, 40)` 保留）、卡片 DOM 结构与事件、`openRail/closeRail`。

### 实施步骤

1. 写 `.tmp/e2e-r46-impl-t2-rail.mjs`。**不能直接复制 `.tmp/e2e-r46-ui-4.mjs`（V2-R2）**：`ui-4` 全文 146 行没有 `page.goto`、也没有播种（`:8-13` 只 attach 到 finder 前一段留下的页面），而 `node .tmp/reset.mjs 9222` 会把自己那页关掉（`reset.mjs:58`），reset 之后 `context.pages()` 里没有 5175 页面 → `ui-4:22` 的 `page.click('#sidebar-tab-files')` 直接 30 s 超时；就算补上 `goto`，没有 RICH 文本就 `cardCount 0`，几何门全部空转。正确拼法：
   - **头**：抄 `.tmp/e2e-r46-ui-main.mjs:1-27`——`import { installDemoFolder } from '../scripts/demo-folder.mjs'`（`:3`）、`installDemoFolder(page)`（`:24`）、`page.goto(URL, { waitUntil: 'networkidle' })`（`:25`）、`page.waitForSelector('.doc-column .ProseMirror')`（`:26`）；端口 `9226`→`9222`。
   - **播种**：抄 `ui-main.mjs:183-229` 的 `RICH`（含三张模拟批注要用的正文段）+ `:231-235` 的源码模式写入（`Control+/` → `waitForSelector('textarea.source-editor')` → `page.fill('textarea.source-editor', RICH)` → `Control+/` → `waitForTimeout(900)`）。
   - **测量段**：只搬 `ui-4:48-143`（`RAIL` / `RAIL_NOTICE_HIT` / `DRAWER` 三段），扩成断言（见验收标准），端口与截图路径 `shots/round-46/r46-ui-*`→`shots/round-46/impl-t2-*` 一并改；另加「面板头按钮点一下折叠/展开」一条。
   - **改前先跑一次**，把 `RAIL`/`DRAWER` 原样贴进 `impl.md`（finder 的绝对坐标只作对照，**期望以自己这一次的改前读数为准**；与 finder 一致时应看到 `blockedButtonsInCard0:3`、`overlapCard0:93`、`noticeCoveredByCard0:50`、抽屉 `overlap:28`）。
2. 按上面 1–3 改 3 个文件；`npx tsc --noEmit`。
3. `node .tmp/reset.mjs 9222` 后重跑脚本（脚本自带 `goto` + 播种，见第 1 步）；脚本里先取静止态读数，再把 `.doc-scroll`.scrollTop 设为 `scrollHeight`、等 300 ms 取「滚到底」读数（门 A2），最后滚回顶部截图。补深色截图（设置 → 深色 → 保存，或直接 `document.documentElement.setAttribute('data-theme','dark')` 后截图，二选一并写清）。
4. 截 1440 浅色 / 1440 深色 / 1024 抽屉三张。

### 验收标准（可执行）

```bash
node .tmp/reset.mjs 9222
node .tmp/e2e-r46-impl-t2-rail.mjs      # 断言全 PASS，末尾 CONSOLE_ERRORS []
npx tsc --noEmit
git grep -c "railSpace" -- src/App.tsx src/components/MarginRail.tsx   # 改前 0 → 改后 App.tsx ≥3 + MarginRail ≥3（R4：`git grep -c` 数的是**行**，别写死精确值；以 tsc + E2E 为准）
git grep -c "rail-cards-space" -- src   # 改前 0 → 改后 ≥3（App.tsx 跳过判断 1 + MarginRail.tsx ≥1 + styles.css ≥1）
```

脚本内必须断言的（每条给 PASS/FAIL 字符串，不靠人看）：

1. **门 A1（静止态，几何）**：`card0.getBoundingClientRect().bottom <= panel.top - 0.5`（面板在第 1 张卡下方，至少 0.5 px 余量）。**不要**写成 `maxCardBottom` 版本（V2-R1：1440×900 上恒假）。
2. **门 A2（滚到底，几何）**：先 `document.querySelector('.doc-scroll').scrollTop = document.querySelector('.doc-scroll').scrollHeight`、等 300 ms，再断言 `lastCard.getBoundingClientRect().bottom <= panel.top - 0.5`；同时打印 `scrollMax = scrollHeight − clientHeight` 与 `lastCardVisible`（`lastCard.bottom > 0`）。`scrollMax === 0` 时这条记 UNVERIFIED（写清文档短到不滚），**不许**当 PASS；`lastCardVisible === false` 时门仍成立，但 `impl.md` 要说明它只证明「末卡能被滚到不被覆盖」。
3. **门（提示，几何）**：`notice.bottom <= panel.top - 0.5` **且** `notice.bottom <= card0.top - 0.5`（提示既不被面板压、也不被卡 0 压；卡 0 的 `top` 现在从 `flowBottom` 起算，天然留 12 px）。
4. **只作诊断打印，不是门**：`maxCardBottom`、`lastCardOverlap = lastCard.bottom − panel.top`（静止态期望 **≈17**）、`panelTop`（静止态期望 **≈779**）、`scrollportBottom`（期望 **872**）、`blockedButtonsTotal`（每张卡每个按钮中心 `elementFromPoint` 是否被别的元素挡住）、`notice` 中心 `elementFromPoint` 是否落在 `.rail-notice-mock` 内、`overlapCard0`/`overlapCard1`。本任务给 `.rail-overall` 加了 `pointer-events: none`，命中测试会**穿过**面板命中下层 → 出现「几何红、命中绿」时按几何判红。
5. 面板可用：`.rail-overall-head` 中心 `head.contains(document.elementFromPoint(...))` 为真（面板本体 `pointer-events: none`、head/body 是 `auto`，所以这一条命中测试仍有效；用 `contains` 是因为中心可能命中 head 里的 `<span>`）；点一下 `aria-expanded` 由 `true`→`false`，再点回 `true`。
6. 面板在首屏可见（`panel.top < window.innerHeight`），否则「不再遮挡」只是靠把它挤出屏幕。
7. 窄窗 1024 抽屉：`panel.top >= lastCard.bottom - 0.5`（几何是门）；最后一张卡每个按钮中心的 `elementFromPoint` 只作诊断打印（改前下半被切）。
8. `CONSOLE_ERRORS` 为空；`.note` 数量仍是 3；`pageErrors` 0。

### 风险与坑

- **中**。卡片整体会**下移一点**（第一张卡从 `coordsAtPos` 变成至少「提示底部 + 12」），1440/1024 的读数都会变；旧脚本里的绝对坐标一律当**对照**，不要写成期望值。
- 短文档 + 少量卡时，栏内容会变高（卡片底 + 面板高），`doc-layout` 的行高可能超过正文列 → 页面下方多出空白。这是「卡片必须能完整看到」的代价；截图里目检，**不要**为了「看起来更短」把 spacer 改小（会重新压住卡）。
- **卡片很多很长时，sticky 面板在滚动过程中仍可能盖住一瞬**（面板始终钉在视口底）。这是 sticky 的固有行为，用户可以把那张卡滚上来；本轮**不承诺**「滚动中永不重叠」，只承诺「静止状态第 1 张卡可点 + 每张卡都能滚到不被覆盖的位置」。`impl.md` 要写这一句。
- **静止时末卡底部约 17 px 在钉住的面板后面（V2-R1 的已知残差，不是回归）**：1440×900 下滚动口底 872、面板高 93 → 面板必钉在 `top≈779`，而修复后末卡底 ≈796，`796 − 779 = 17`。末卡的按钮行就在卡片最底部（抽屉实测按钮高 **22**：`[715,589,54,22]`），所以静止时那三个按钮只露约 **5 px**（`22 − 17`）；**滚动约 20 px** 就能完整看到并点击。本轮**不承诺**「静止时末卡按钮可点」，只承诺门 A1（第 1 张卡）+ 门 A2（每张卡滚到底不被覆盖）。想彻底消掉 17 px 只能走修法 B（把 `.rail-overall` 常态化 `position: static`），会改变长文档里「面板常驻视口底」的既有行为，本轮不做、记进 §六。**tester 不要**把这条判成没修好：门 A1/A2 与提示几何全绿即算达标。
- `.rail-empty`（没有卡片时）与 `.rail-goal`（「我的理解」）都参与 `flowBottom` 计算；空栏时 `railSpace=0`，不要在这里 dispatch/改状态。
- `page.click()` 点 `disabled` 按钮会 30 s 超时（第 42/43 轮实测）：断言只读 DOM/几何，不点被禁用的「联网核对」。
- 模拟分析要等 2.5 s 且 toast 只活 6 s：读数在分析完成后的 2.5–3 s 窗口里取。
- 不要覆盖 finder 的 `r46-ui-33/34`；新图一律 `impl-t2-*`。

### 需要的截图

- `shots/round-46/impl-t2-rail-1440.png`：三张卡 + 模拟提示 + 面板；**第 1 张卡与模拟提示都不被面板压住**，末卡底部约 17 px 仍在面板后（V2-R1 的已知残差，图注写清「滚约 20 px 即完整」）。
- `shots/round-46/impl-t2-rail-1440-crop.png`：页边栏放大裁切（第 1 张卡的按钮完整、提示完整可见）。
- `shots/round-46/impl-t2-rail-drawer-1024.png`：抽屉里最后一张卡的按钮完整可点。

## 四、任务 T3（P1，用户可见）：切主题后 Mermaid 跟着重绘

### 为什么

`mermaidLazy.ts` 的 `themeName()` 只在第一次 `configure()` 时读一次（`:57-65` 的 `if (initialized) return`），渲染结果又按「代码 hash」缓存（`:31`、`:92-100`），而 `App.tsx:721-724` 切主题只改 `data-theme`——于是浅色渲染的 `#333` 连线留在深色容器上，对比度 1.31:1（WCAG 1.4.11 要求 3:1），图表结构信息不可见。`system` 分支更糟：`themeName()` 只认 `data-theme === 'dark'`，系统深色 + 跟随系统时永远按浅色渲染。

### 现状证据

| 项 | 读数 / 位置 |
| :--- | :--- |
| 切深色后（同一张图） | 容器 `rgb(28,31,35)`；4 个节点文字与 5 条连线全是 `rgb(51,51,51)`；连线/标签对容器 **1.31:1**（`r46-ui-26-mermaid-theme-stale.png`） |
| 深色首载对照（正常） | 连线 `rgb(211,211,211)`、节点 `fill #1f2020`/`stroke #ccc`（`r46-ui-25-mermaid-dark-first.png`） |
| 只初始化一次 | `src/lib/mermaidLazy.ts:29`（`let initialized = false`）、`:57-65`（`if (initialized) return`）、`:61`（`theme: themeName()`） |
| **`configure()` 只有一条调用路径（R1）** | `:68-69`（`ensureMermaid()` 在 `mermaid` 非空时直接 `return Promise.resolve()`，**不调 `configure()`**）、`:76`（唯一一次 `configure(mermaid)`，在首次加载分支里）→ 只改 `configure()` 内部守卫等于没改，切主题不会重跑 `initialize` |
| 缓存不分主题 | `:31`（`const svgCache = new Map`）、`:92-100`（按 `hash` 存/取） |
| 主题判定 | `:51-55`（只认 `data-theme === 'dark'`，`system` 恒 `default`） |
| 预览层第二套缓存 | `src/lib/mermaidPreview.ts:16-21`（`svgCache`/`errorCache`/`pendingTimers`/`domCache` 都按 hash）、`:42-46`（`refreshLivePreviews` 按 hash 找 widget）、`:82-103`（widget key 只含 `pos:hash`） |
| 切主题只改属性 | `src/App.tsx:721-724`；`SettingsDialog.tsx:62` 也是直接 `setAttribute` |

### 改动文件与函数（2 个文件 + 1 个测试文件）

1. **`src/lib/mermaidLazy.ts`**：
   - **先改早退分支（R1，整条任务的隐藏前提）**：`ensureMermaid()`（`:68-69`）现在是
     ```ts
     if (mermaid) return Promise.resolve()
     ```
     而 `configure()` 的**唯一**调用点在首次加载分支（`:76`），所以 `mermaid` 一旦非空，`configure()` 再也不会跑 —— 只改 `configure()` 内部的守卫等于没改。改成
     ```ts
     if (mermaid) { configure(mermaid); return Promise.resolve() }
     ```
     （`configure()` 内部的 `appliedTheme` 守卫保证同主题不重复 `initialize`，因此「连续渲染两次只 `initialize` 一次」仍然成立。）
   - 新增**纯函数**并导出（Node 测试用，不碰 DOM）：
     ```ts
     export function resolveMermaidTheme(attr: string | null, prefersDark: boolean): 'dark' | 'default' {
       if (attr === 'dark') return 'dark'
       if (attr === 'light') return 'default'
       return prefersDark ? 'dark' : 'default'   // system / 未设置：跟随系统
     }
     ```
   - `themeName()`（`:51-55`）改名并导出为 `mermaidTheme()`：读 `data-theme` + `matchMedia('(prefers-color-scheme: dark)')`，保留 `typeof document === 'undefined'` 早退（Node 测试没有 document），`matchMedia` 再用 `typeof matchMedia === 'function'` 守卫：
     ```ts
     export function mermaidTheme(): 'dark' | 'default' {
       if (typeof document === 'undefined') return 'default'
       const attr = document.documentElement.getAttribute('data-theme')
       const prefersDark = typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches
       return resolveMermaidTheme(attr, prefersDark)
     }
     ```
     （`themeName` 全仓只有 `:51` 定义与 `:61` 使用两处，改名不牵动别的文件；改完 `git grep -c "theme: themeName()"` → 0。）
   - `configure()`（`:57-65`）：模块级 `let appliedTheme: 'dark' | 'default' | null = null`；函数体改成
     ```ts
     const theme = mermaidTheme()
     if (initialized && appliedTheme === theme) return
     appliedTheme = theme
     initialized = true
     module.initialize({ startOnLoad: false, securityLevel: 'strict', theme })
     ```
     （原 `try/catch` 保留。**不要**去掉守卫改成每次渲染都 `initialize`。）
   - `renderDiagram()`（`:89-106`，R3）：**入口**取一次主题供命中查询，**`await ensureMermaid()` 之后**再取一次算写键（`configure()` 用的正是第二次这个读法）：
     ```ts
     const hash = mermaidHash(code)
     const themeAtEntry = mermaidTheme()
     const cached = svgCache.get(`${themeAtEntry}|${hash}`)
     if (cached !== undefined) return { svg: cached }
     try {
       await ensureMermaid()            // 里面 configure() 同步应用「此刻」的主题
       if (!mermaid) return { error: fallbackHint() }
       const theme = mermaidTheme()     // 与 configure() 同一次读法；写缓存必须用它
       const key = `${theme}|${hash}`
       const hit = svgCache.get(key)
       if (hit !== undefined) return { svg: hit }
       ...
       svgCache.set(key, svg)
     ```
   - `__resetForTest()`（`:130-138`）：把 `appliedTheme = null` 一并重置。
2. **`src/lib/mermaidPreview.ts`**：
   - 加 `import { mermaidTheme } from './mermaidLazy.ts'`；模块级 `let renderedTheme: 'dark' | 'default' | null = null`。
   - `build(doc)`（`:82-103`，R3）开头取**一次**主题（`build` 同步跑，一次读到底不会漂）：
     ```ts
     const theme = mermaidTheme()
     if (theme !== renderedTheme) {
       renderedTheme = theme
       svgCache.clear()
       errorCache.clear()
       for (const timer of pendingTimers.values()) clearTimeout(timer)   // 旧键的防抖全部作废
       pendingTimers.clear()
     }
     ```
     （不清 `pendingTimers` 的话，切主题前已排队的 400 ms 定时器会拿**旧 renderKey** 再跑一次；旧键的 widget DOM 已不在，等于白渲染一次。已经 in-flight 的旧键渲染无法取消，它写回的旧键条目不会再被任何 widget 引用（`refreshLivePreviews` 按 `dataset.renderKey` 匹配），下一次主题切换随 `svgCache.clear()` 清掉。）
   - **渲染键**：`const renderKey = theme + '|' + block.hash`，`pendingTimers`/`inFlight`/`svgCache`/`errorCache` 全用 `renderKey`；`domCache` 键改 `renderKey + '@' + block.pos`（renderKey 已含主题 + hash，pos 区分同一文档里两个相同代码块）；`element.dataset.hash = block.hash`、`element.dataset.renderKey = renderKey`。
   - **五个函数的入参逐个改（R3：漏改一个就会「缓存清了但 widget 不刷新」）**：
     - `applyContent(element, renderKey)`（`:23`）：用 `svgCache.get(renderKey)` / `errorCache.get(renderKey)`；
     - `refreshLivePreviews(renderKey)`（`:42`）：按 `element.dataset.renderKey === renderKey` 遍历 `domCache`；
     - `runRender(block, renderKey)`（`:48`）：`inFlight.add/delete(renderKey)`、写 `svgCache.set(renderKey, svg)` / `errorCache.set(renderKey, …)`、`refreshLivePreviews(renderKey)`；
     - `scheduleRender(block, renderKey)`（`:58`）：`svgCache.has(renderKey)`、`pendingTimers`/`inFlight` 都以 `renderKey` 为键；
     - `makePreview(block, renderKey)`（`:72`）：`dataset.renderKey = renderKey`、`domCache.set(renderKey + '@' + block.pos, element)`、`applyContent(element, renderKey)`。
   - widget 装饰的 `key` 改 `mermaid-${renderKey}`（`Decoration.widget` 的 spec.key 决定 PM 是否复用旧 DOM；**key 不变就不重绘**，这是本条最容易漏的一处）。
   - `apply(transaction, previous, _oldState, newState)`（`:113-116`）：`if (transaction.docChanged || transaction.getMeta('sidelightMermaidTheme') !== undefined) return build(newState.doc)`（主题真变时才清缓存，普通打字走 `previous.map(...)` 不受影响）。
   - 插件 `props.view(editorView)`（`:118` 之后新增）：装 `MutationObserver`（`document.documentElement`，`{ attributes: true, attributeFilter: ['data-theme'] }`）与 `matchMedia('(prefers-color-scheme: dark)')` 的 `change` 监听，回调里
     ```ts
     editorView.dispatch(
       editorView.state.tr.setMeta('sidelightMermaidTheme', mermaidTheme()).setMeta('addToHistory', false),
     )
     ```
     （`addToHistory: false` 与 `src/lib/decorations.ts:40` 同一写法；纯 meta 事务本来不产生 history step，写上是为了与项目惯例一致。）`destroy` 里 `observer.disconnect()` + `mediaQuery.removeEventListener('change', handler)`。
3. **`src/lib/mermaidLazy.test.ts`**：加 4 条 `resolveMermaidTheme` 用例（`'dark'`→dark、`'light'`→default、`null`+true→dark、`'system'`+false→default），**不要**在 Node 里造 `document`；并在现有「只加载一次，同一份代码只渲染一次」用例（`:67-78`）末尾加一行 `assert.equal(fake.inits.length, 1)`（R1：Node 下 `mermaidTheme()` 恒 `default`，这一行专防「每次渲染都 `initialize`」；不新建用例，文件数与新增条数只 +4）。
4. **不动**：`mermaidLoader.ts`、`App.tsx` 的主题 effect（不新增 App 侧耦合）、首屏集合（mermaid 仍 0 B 进首屏）。

### 实施步骤

1. 写 `.tmp/e2e-r46-impl-t3-mermaid.mjs`。**骨架不能直接抄 `ui-3`（V2-R2）**：`ui-3` 也是 attach 型脚本（`ui-3.mjs:9-13` 没有 `page.goto`，它读的是 finder 主脚本留下的页面），`reset.mjs` 之后没有 5175 页面。头部必须自带：
   - `const browser = await chromium.connectOverCDP('http://127.0.0.1:9222')` → `context.pages().find(...) ?? context.newPage()` → `await page.goto('http://localhost:5175', { waitUntil: 'networkidle' })` → `await page.waitForSelector('.doc-column .ProseMirror', { timeout: 15000 })`（与 `ui-main.mjs:24-27` 同序；**不需要** `installDemoFolder`，本任务不碰文件树）。
   - 种子：`Ctrl+/` → `waitForSelector('textarea.source-editor')` → `page.fill(…, 一段正文 + 一个 mermaid 围栏)` → `Ctrl+/`（写法抄 `ui-main.mjs:231-235`；**不要**抄 604 行整份 `RICH`）。
   - 主题切换抄 `.tmp/e2e-r46-ui-3.mjs:113-118` 的 `.topbar button:has-text("设置")` → `.theme-options button:has-text("深色")` → `button.primary:has-text("保存")`；对比度算法抄 `e2e-r46-ui-3.mjs:31-77` 的 `window.__h.pair`。
   - 种子文档：一段正文 + ```` ```mermaid ```` 块（`graph TD; A[开始] --> B{判断}; B -->|是| C[结束]`）。
   - **改前先跑一次**：记录浅色渲染的 `edgeStroke`（期望 `rgb(51, 51, 51)`）、容器背景、`previewCount`，切深色后再取一次 → 期望两者**相同**、对比度 1.31。
2. 按上面 1–3 改代码；**动手前先确认 `ensureMermaid()` 的早退分支（`:69`）真的加了 `configure(mermaid)`**（R1：这是整条任务的隐藏前提；漏了它切主题仍然不重绘，还会把浅色 SVG 存进 `dark|hash` 键，把一次性 BUG 变成持久化 BUG）。然后 `npx tsc --noEmit`。
3. `node .tmp/reset.mjs 9222` 后重跑：浅色记录 → 切深色 → 轮询最多 3 s 等 `edgeStroke` 变化 → 断言；再切回浅色 → 断言回到浅色值。
4. 截图：深色图（裁切）+ 切回浅色后的图。

### 验收标准（可执行）

```bash
node .tmp/reset.mjs 9222
node .tmp/e2e-r46-impl-t3-mermaid.mjs    # 断言全 PASS，末尾 CONSOLE_ERRORS []
npx tsc --noEmit
npm test                                  # 新增 4 条 resolveMermaidTheme（另在现有用例里加 1 行断言，不增条数）；条数以输出为准
git grep -c "resolveMermaidTheme" -- src/lib/mermaidLazy.ts src/lib/mermaidLazy.test.ts   # 改前 0 → 改后 lazy.ts ≥2 行（定义 1 + mermaidTheme() 里调用 1）+ test.ts ≥5 行（R4：数的是行，不是出现次数）
git grep -c "configure(mermaid)" -- src/lib/mermaidLazy.ts         # 改前 1 → 改后 2（R1：早退分支 + 首次加载分支）
git grep -c "appliedTheme" -- src/lib/mermaidLazy.ts               # 改前 0 → 改后 ≥3
git grep -c "sidelightMermaidTheme" -- src/lib/mermaidPreview.ts   # 改前 0 → 改后 ≥2
git grep -c "renderKey" -- src/lib/mermaidPreview.ts               # 改前 0 → 改后 >0（计数只作附证，门是 tsc + E2E）
git grep -c "theme: themeName()" -- src/lib/mermaidLazy.ts          # 改前 1 → 改后 0
```

脚本内断言（逐条 PASS/FAIL）：

1. 浅色首渲：`edgeStroke === 'rgb(51, 51, 51)'`（或记录到的浅色值）、`previewCount === 1`、每个预览内 `svg` 数 === 1。
2. 切深色后 3 s 内：`edgeStroke !== 浅色值`；`contrast(edge, container) >= 3`；`contrast(labelText, container) >= 3`；**`previewCount` 仍是 1、每个预览内 `svg` 仍是 1**（防「叠两个 svg / 留一个旧 widget」——这是本任务最可能引入的回归）。
3. 切回浅色后 3 s 内：`edgeStroke` 回到第 1 步记录的值（±0 精确比较即可，mermaid 主题是确定性色值）；`previewCount` 仍 1。
4. 图仍然可读：`svg.querySelectorAll('path,line').length >= 1`、`text` 内容含「是」。
5. `CONSOLE_ERRORS` 为空；首屏资源不新增 mermaid 请求（只在有围栏时才下载，`r46-ui` 已验，本轮不重复）。
6. 单元测试：`resolveMermaidTheme` 四条（`'dark'`/`'light'`/`null`+true/`'system'`+false），外加现有「只加载一次」用例末尾的 `fake.inits.length === 1`（R1 守卫：同一 module 连续渲染三次只 `initialize` 一次）。
7. **UNVERIFIED 允许项**：`system` + 系统主题变化的**真机**行为本轮只做单元测试与 `matchMedia` 代码路径，不做真机切换（沙箱不能改系统主题）；`impl.md` 写清补法（Windows 设置里切「应用模式」后看一张已渲染的图）。

### 风险与坑

- **隐藏前提（R1）**：`ensureMermaid()` 的早退分支 `if (mermaid) return Promise.resolve()`（`src/lib/mermaidLazy.ts:69`）是这条任务能不能成立的关键——`configure()` 的唯一调用点在首次加载分支（`:76`），不改早退分支，切主题后 `module.initialize({ theme })` 永不重跑，浅色 SVG 还会被存进 `dark|hash` 键（一次性 BUG 变持久化 BUG）。改完必须能用 `git grep -c "configure(mermaid)"` 看到 **2** 处。
- **中**。`Decoration.widget` 的 `spec.key` 不变时 ProseMirror **复用旧 DOM**；改了缓存但没改 key，测试会看到「没变化」，实现时最容易漏（上面已点名）。
- **R3（缓存键的时点）**：`renderDiagram()` 是 `async`——读缓存发生在 `await ensureMermaid()` **之前**，写缓存在 `mermaid.render()` **之后**；两处都现取 `mermaidTheme()` 会在 await 期间切主题时把浅色 SVG 写进深色键（同一键再也不失效）。按 §四.1 的写法：入口取一次供读，`await` 之后再取一次供写。
- 主题切换会触发**两次**属性写入（`SettingsDialog.tsx:62` 点选时一次、`App.tsx:721-724` 保存/取消时一次）→ 会有两次 meta 事务、两次 `build`；第二次命中缓存，允许；`impl.md` 记一条实测（切一次只重渲一次或不重复下载 chunk）。
- `matchMedia` 在 Node 测试环境不存在：`mermaidTheme()` 里要 `typeof matchMedia === 'function'` 守卫；纯函数 `resolveMermaidTheme` 让测试绕开环境。
- 缓存按 `theme|hash` 分键，最多两份/张图，不设上限清理也可以（同一文档图中数有限）；`__resetForTest` 必须清 `appliedTheme`。
- 别把 `mermaidTheme()`/`configure()` 的守卫去掉后改成每次渲染都 `initialize`（会拖慢、且 mermaid 的 `initialize` 有全局副作用）；只在 theme 变化时重初始化。注意早退分支（R1）每次 `ensureMermaid()` 都会调 `configure()`，守卫是防「每次渲染都 `initialize`」的唯一屏障。
- 预览面板（`PreviewPane`）不含 Mermaid，本轮不涉及；导出 HTML 不含图，也不涉及。
- 主题从「浅」切「跟随系统」时，`data-theme='system'` + 系统深色 → `resolveMermaidTheme('system', true) = 'dark'`，会重绘；这条只做代码路径与单测，标 UNVERIFIED。

### 需要的截图

- `shots/round-46/impl-t3-mermaid-dark.png`：深色下连线/箭头清晰可见（对比度 ≥3）。
- `shots/round-46/impl-t3-mermaid-light-back.png`：切回浅色后的同一张图。

## 五、统一门禁、收尾与谁改什么

**每个任务各自跑该任务列的门禁**；全部做完后**串行**跑一次：

```bash
npx tsc --noEmit
npm test                  # 基线 29 文件 380 条；本轮 +4 条 resolveMermaidTheme（另在现有用例里加 1 行 inits 断言，不增条数）→ 以输出为准
npm run verify            # build + 首屏 gzip 门（内部 310,000 / 硬线 320,000；轮前 292,707 B）
npm run roundtrip         # rich 5/7、source 7/7（T3 动了 Tiptap 扩展的装饰层）
```

`npm run verify` 会重写 `dist/`：若发现别的角色正在构建（并发写 `dist/` 会互相清空，见 STATE 决策 2026-11-15），只跑 `npx tsc --noEmit` 与 `npm test`，把 `verify` 留给根代理串行跑，并在 `impl.md` 记 UNVERIFIED。

**收尾文档（执行代理做，tester 提交前复核）**：

1. `docs/CHANGELOG.md`：在 `**第 45 轮（同一未发版区间）**`（`docs/CHANGELOG.md:171`）之后加 `**第 46 轮（同一未发版区间）**`，四条：卸载只删自己写的文件（含 `host.log*`、`webview2-data`、`state\recent.json*`，不再递归删用户目录，`state\` 也不再递归）、发布链两道门（payload 版本断言 + `verify-installer.ps1` 打印并识别旧批次包 / marker 受限环境不再硬退出）、页边「整体评价」不再压住批注卡、Mermaid 跟随主题重绘（含跟随系统）。附本轮 `npm test` 与首屏 gzip 实测数字。**不要**写「安装包字节 = …」这类会过期的承诺。
2. `README.md`：`:114` 按 T1 第 5 步改口径；「现在能做什么」里 Mermaid 那条补一句「切主题会重绘（含跟随系统）」。
3. `AGENTS.md`：§6 状态句里 Mermaid 那条补「切主题会重绘」；测试条数改成 `npm test` 实测（两处：`AGENTS.md:39`、`:72`；`README.md:133` 同步；**`README.md:171`** 的「29 个测试文件」**不变**——本轮只在 `mermaidLazy.test.ts` 里加用例，没有新文件；plan-review §一 提过这条行号原本写在 AGENTS 下，别去 AGENTS 找 `:171`）；§8 那条「文档里写死的安装包字节」补一句「第 46 轮起 `README.md`/`packaging/README.md` 不再写死字节，只留「以 Release 页 SHA256SUMS 为准」，并给两个 ps1 加了 payload 版本门」。
4. `packaging/README.md`：`:42` 的 `installer.ps1` 说明补「打包含 payload 版本断言」；`:43` 的 `verify-installer.ps1` 说明补「开头会打印 setup 的 mtime/FileVersion，与 `host\bin` 不同批时报 UNVERIFIED；可用 `-Setup <路径>` 验当轮新包、`-PreflightOnly` 只跑这段前置检查」；`:57` 按 T1 第 5 步改。
5. `docs/typora-gap.md`：Mermaid 那条（`:34`）补「切主题会重绘」（本轮唯一行为变化）；**不要**动 `:49` 行内 HTML（那是 §六 下轮的活）。
6. `docs/iteration/round-46/impl.md`：每个任务的文件:行号、命令与原始输出（含改前红）、截图路径、与计划的偏差、UNVERIFIED。
7. **不改** `docs/iteration/STATE.md`（根代理轮末统一更）、不改 `package.json` 版本、不动 `release/`、不 push。

**收尾自查（先贴改前 >0，AGENTS §8）**：

```powershell
Get-FileHash release\Sidelight-0.32.1-win-x64-setup.exe, release\Sidelight-0.32.1-win-x64-portable.zip, release\SHA256SUMS.txt -Algorithm SHA256   # 与开工前逐条相等
git diff --stat -- package.json          # 空
git status --porcelain release/          # 空（附加证据）
git grep -n "1,304,634" -- README.md packaging/README.md   # 改前 2 → 改后 0
foreach ($f in 'packaging\installer.nsi','packaging\installer.ps1','packaging\portable.ps1','packaging\verify-installer.ps1') { "$f " + (([IO.File]::ReadAllBytes($f)[0..2]) -join ',') }  # 全部 239,187,191
```

## 六、本轮不做（27 条里剩下的 20 条：有证据、有原因、写清下轮怎么排）

> 归属核对：ship 5 条全部进 T1；ui F1 进 T2；ui F2 进 T3；其余 **20 条全部在这张表里**，一条不落。

| 条目 | 来源 | 级别 | 为什么本轮不做 | 下轮怎么排 |
| :--- | :--- | :--- | :--- | :--- |
| 新建的工作区文件 `Ctrl+S` 落盘缺结尾换行（`prepareSave` 只在原文有尾换行时补） | bug F1 | P2 | 字节一致性问题，不丢数据；改它要同时定「首次保存是否强制补 `\n`」并复核 `save-acceptance` 的字节断言，本轮三条任务已满 | 小修一轮的**第 1 项**：`prepareSave`（`App.tsx:2831-2836`）对 `originalText === null` 保证恰好一个尾换行 + 3 条单测 + 复用 `.tmp/e2e-r46-bug-b.mjs` 的 b1 段断言 `endsWith('\n')` |
| 无文件夹粘贴图片 → 正文内联 base64（642,006 字）+ >256 KiB 文档不写草稿 | typora #1 | **P1** | 同时改图片落盘语义与草稿存储策略（两条数据链），60–100 行且无现成覆盖；本轮已动三条关键路径 | **下轮第一项**：先给产品负责人确认「无句柄时先提示选目录」的交互，再分两步：① `insertImageFile`（`App.tsx:4087-4116`）没有 `dir` 时不内联、走目录选择（取消不清 dirty、不插入）；② 草稿上限（`App.tsx:640-648`）拆「正文键 + 图片键」或超限写 IndexedDB；验收用假 FSA + 真 `Ctrl+S` 字节 |
| 行内 HTML（`<kbd> <mark> <sup> <u>`）在编辑视图**和预览**里都不渲染 | typora #2 | **P1** | 白名单渲染要同时保住第 41 轮 `<` `>` `&` 逐字节保真（`escapes.test.ts`）、严格挡 `<script>/on*`；~50 行 + 预览 E2E ≈ 12 min | **下轮第二项**：先只做「预览 + HTML 导出」的白名单还原（`kbd mark sup sub u ins del small abbr br`，只作用于只读副本），编辑视图另算；同批补 `docs/typora-gap.md:49` 的「预览与导出也不渲染」 |
| 手打 `\| 甲 \| 乙 \|` + Enter 不建表 | typora #3 | P2 | 表格 input rule 40–60 行 + 单测，且要处理「只有表头」补分隔行、撤销一次回退；排在 P1 之后 | 与 bug F1 同批：`src/lib/tableInput.ts` + 规则要求「整段只有一行且首尾都是 `|`」，回归 `tableReuse` 与第 39 轮单元格 `<br>` |
| 表格工具条没有列对齐按钮（对齐本身能往返） | typora #4 | P2 | 3 个按钮 + 命令约 50 行；与 typora #3 同属表格批，分开做免得两轮都改表格条 | 表格批第二轮：`table-bar` 插入组与删除组之间加左/中/右对齐 + 清除，复用 B1 已验证的 `:---:` 写回；补一条对齐往返单测 |
| 选中富文本复制只有 HTML/纯文字，没有「复制为 Markdown」 | typora #5 | P2 | 要新写 slice→Markdown 序列化路径（`markdownManager.serialize`），并验证 WebView2 剪贴板；60–90 行 | 待 `Ctrl+Shift+V` 宿主侧验证同批：先做 `text/markdown` + 保留 `text/plain`，菜单加「复制为 Markdown」，宿主标 UNVERIFIED |
| 重开文档回到文首，没有阅读位置记忆 | typora #6 | P2 | ~30 行但涉及 `session`/`cache` 存储键与「大纲/查找跳转优先」的互斥；与 T2 的滚动相关但不同层 | 小批一轮：`.doc-scroll` 节流记录 `scrollTop`（按文档路径），载入后 rAF 恢复一次，用户手动滚动即停止；验收「滚到 1600 → reload → `scrollTop` ≈ 1600」 |
| 图片落盘只有 `assets/` 一种规则 | typora #7 | P2 | 要加设置项 + `assetResolve` 前缀同步（第 38/39 轮链），80 行；会动用户可见的落盘规则，应单独一轮 | 先做设置项三选一（默认不变），再改 `asset.ts:36/47/52` 与解析前缀；验收「同篇两次粘贴同名图 → `-2`」 |
| 手打 `[^1]` 不建脚注引用、定义在编辑视图不可见 | typora #8 | P2 | 只读上标 NodeView + 定义区，60 行；与第 44 轮 F4 同族，需要「只读上标写回仍是 `[^1]`」的字节用例 | 与 typora #2 的只读渲染批一起：先让现有定义在编辑视图可见（只读），再做 `[^n]` 上标；必须补「打开→保存逐字节」用例 |
| 两份 Typora 文档 5 处 + 2 行过期 | typora #9 | P2（文档） | 0 代码，但本轮三条任务的文档批已占 `README`/`AGENTS`/`packaging/README`/`gap` 的 Mermaid 一行；混进来会让评审难分辨 | **下轮与界面批同批（0 代码）**：`docs/iteration/typora-features.md` 顶部加过期横幅并按 finder §10 的表订正 5 行（`:43` 折叠大纲、`:44` 源码键位、`:51` 快速打开、`:98`/`:109`）；`typora-gap.md:41` 粘贴纯文本去掉保留说法、`:49` 补「预览与导出也不渲染」 |
| 空基线 + 文档有脚注定义 → 每次保存整篇 `classify`（1 MB 多 78.5–83.5 ms；真实自动保存出现 2 条 100 ms longtask） | code F1 | P2 | 性能项，窄路径（只在有脚注定义/基线非空时付费）；改法低风险但需要「改后用同一页面 `import('/src/lib/risk.ts')` 复测 78.5 → <10 ms」的实测 | 与 code F2 同批（保存链一轮）：`activeLosses`（`risk.ts:376-383`）基线为空时只跑脚注一族；保留 `baseline.length > 0` 分支；回归 `diff.test.ts:248-260` |
| 一次停笔仍写 4 遍（147 KB → 591 KB）；同键删两次草稿 | code F2 | P2 | 内部质量，排用户可见之后；改法要动保存收尾与草稿清理（`App.tsx:2653-2657`、`:2665-2670`），与 T1/T2/T3 都不同层但需 `draft-acceptance` 复核 | 下一批第一项：删 `finishSaved` 里那次 `persistDocKey`（或反向保留它并去掉停笔链那次），`removeCache` 前加 `if (oldName !== name)`；用 `.tmp/e2e-r46-code-writes.mjs` 复测 `lsWrites=1`、草稿删除 1 次 |
| 死代码 5 处 + `hostDocRef` 空转 effect；未开 `noUnusedLocals` | code F3 | P2 | 内部质量 4 级；最便宜但本轮 3 个任务已满 | 与 code F2 同轮（10 min）：删 5 处（`App.tsx:9/18/142/605`、`trash.ts:242`）+ `hostDocRef`（声明 `App.tsx:604`、effect `:732-734`），`tsconfig` 打开两个选项后 `npx tsc --noEmit` 应 0 条 |
| 设置里「主题」单选组 3 个按钮 = 3 个 Tab 站、方向键无效（`role=radiogroup` 无 roving tabindex） | ui F3 | P2 | a11y 小修，但要与「主题即时切换」的既有行为一起测（3 个按钮 + 方向键 + 焦点环） | 界面批：按 WAI-ARIA radio group 做 roving tabindex（只选中项 `tabIndex=0`，左右/上下键切换并移动焦点），或换回原生 `<input type=radio>` |
| 大纲每个有子标题的标题占两个 Tab 站，折叠三角夹在中间（14×24） | ui F4 | P2 | 需要把「跳转」与「折叠」合成一行一个 Tab 站并扩大点击区，涉及大纲交互语义 | 界面批：标题按钮 `tabIndex=0`、三角 `tabIndex=-1`（由按钮内左右键/快捷键驱动），三角点击区 24×24，与文字间距 4–6 px |
| 标题层级在 H3/H4 塌陷（H4 = 正文 17 px；正文行高 1.95） | ui F5 | P2 | 纯 CSS 但会改全站排版节奏，需要 1440/1024/深色三档截图与 Typora 对照；本轮 T2 已动一次页边布局，避免同一片 CSS 两轮都改 | 界面批（纯 CSS，零字节）：`h3: 1.22em`、`h4: 1.12em`、标题统一 `line-height` 1.35–1.45、正文行高 1.80；验收读 `HEADING_LADDER` 表 |
| 链接浮层没有可见按钮、点正文外部不关、Esc 也关不掉 | ui F6 | P2 | 要加「保存/取消」按钮 + `document` 级 `mousedown` 关闭 + 焦点归还正文，涉及选区与 Esc 冒泡（第 35/43 轮坑） | 界面批：`LinkEditor.tsx` 加两个 ≥24 px 按钮，外部点击按「取消」关闭并还原选区；Esc 挂到 window 但别抢 `FindBar` 的一次只关一个语义 |
| 设置面板 1440×900 就要滚、最后一段被 sticky 操作行切掉；快捷键一览同一根因 | ui F7 | P2 | 要把 `.dialog` 改两段式（外框 flex + 内容区滚动 + 操作行 `flex:none`），会动所有对话框（设置/快捷键/字数/确认框），需逐一看截图 | 界面批一轮：`.dialog` 改 `display:flex; flex-direction:column`，`.dialog-actions` 移出滚动区；验收设置与快捷键两个对话框都 `scrollHeight === clientHeight` 或被完整包住 |
| 提示条（toast）压在模态之上，盖住设置的「快捷键/取消/保存」；文案「保存失败：不存在。」不清 | ui F8 | P2 | 层级修正 + 错误文案要用「哪篇、哪个文件、下一步」，与既有错误文案单测同批；本轮不动 toast 层 | 界面批：模态打开期间 `toast` 移到遮罩下层或状态栏上方；按错误文案规则重写并用单测锁住 |
| 点击目标 < 24×24（提示条 × 15×22、大纲三角 14×24、`I` 21×24、`</>` 37×21、字数入口 117×16、查找/表格条按钮高 23） | ui F9 | P2 | 统一给图标按钮 `min-width/min-height: 24px` 会牵动工具栏、查找条、表格条、状态栏四处布局，需逐处截图 | 与 ui F4 同批：先做提示条 × 与大纲三角，再给工具栏/查找条/表格条补 padding；验收用 `getBoundingClientRect` 逐组 ≥24 |

**上一轮 §六 仍未做的项**（`round-45/plan.md:419-437`，本轮 finder 未重复计，planner 已抽查代码确认仍未做）：标题 id/文档内锚点（P1，`git grep 'headingId|slug' -- src` 0 命中）、正文栏宽三档、Mermaid 嵌套围栏 b 半（相同代码的 SVG id 按实例唯一）、图片 alt/title 编辑、`Ctrl+K` 预填缺字（第 45 轮报、第 46 轮未复现，**下轮先复测再销**）、`taskListInput.ts` 单测、两条载入路径重复 17 条状态复位、发布专项剩下的「取件 + SHA256 校验搬进 `release.yml`」。这些不因本轮未列而消失。

**本轮留待产品决策的备选（不是新发现，不占上面 20 条的计数）**：T2 的**修法 B**——`.margin-rail:has(.note) .rail-overall { position: static }`（与抽屉规则统一），能让面板落到末卡下方 12 px、消掉静止时末卡 17 px 残差，门 A1/A2 自动成立；代价是长文档里面板不再「常驻视口底」（行为变化，且 `:has()` 的选择器成本要实测）。本轮选 A（保留 sticky），B 留给产品负责人拍板。

## 七、环境与脚本注意（本轮会踩）

1. **`edit` 工具会丢掉 UTF-8 BOM**（planner 本轮用 `.tmp\r46-bom-probe.ps1` 实测：改后前三字节 `35,32,228`）。`packaging/installer.nsi` 与三个 `packaging/*.ps1` 现在都是 `239,187,191`；改完必须复查并补 BOM（命令见 §二 验收），否则 Windows PowerShell 5.1 按 ANSI 读中文 → 假语法错误；`installer.nsi` 无 BOM 时 makensis 也拒收非 ASCII。
2. **含 `"` 的匹配用 `Select-String -SimpleMatch`**，不要用 `git grep`（PowerShell 会吃掉双引号，第 45 轮实测：改后仍 0 命中、exit 1）。`git grep -c` 零命中时**不打印数字、exit 1**（`# 0` 指「没有输出」）。
3. **`powershell -Command "…"` 的双引号会先展开变量**：语法解析与多行命令在当前会话直跑，或外层用单引号（第 35 轮）。
4. **dev server 只在 `http://localhost:5175`**：不另起、不重启；`5173` 禁用。
5. **浏览器只用 CDP 9222**：不启动 Edge、不 kill `msedge`、不 `browser.close()`；每段 E2E 前 `node .tmp/reset.mjs 9222`。reset 之后页面只剩 `about:blank`——**没有 5175 页面**，所以自写脚本必须自己 `goto` + `waitForSelector`（见第 7 条），不能靠 attach 到别人留下的页面。
6. 自写脚本放 `.tmp/e2e-r46-impl-*.mjs` / `.ps1`，`page.close()` 后 `process.exit(0)`；**带中文的 `.mjs` 用 `write`/`edit` 工具写**，不要用 PowerShell `Get-Content -Raw | -replace | Set-Content`（会把中文读成 ANSI，本轮 finder-code 已踩）。
7. **复用 finder 脚本 ≠ 只改三处（V2-R2）**：`ui-4`（批注页边）与 `ui-3`（Mermaid）都是 **attach 型**脚本——没有 `page.goto`、也没有播种，它们读的是 `ui-main.mjs` 留下的页面。而 `node .tmp/reset.mjs 9222` 会把自己那一页关掉（`reset.mjs:58`），所以本轮的 `impl-*` 脚本必须自带「`goto` + `waitForSelector('.doc-column .ProseMirror')` + 播种」。要改的是四处：CDP 端口（`9226` → `9222`）、截图路径（`r46-ui-*` → `impl-t2-*`/`impl-t3-*`）、输出目录（`OUT` 指向报告目录的脚本要改回 `shots/round-46`）、**加上导航与播种**。
8. **`release/` 的证据只有 SHA256**：`release/` 被 `.gitignore:10` 整个忽略，`git status --porcelain release/` 改前改后恒空；而且不带 `-AssocDryRun` 误跑 `installer.ps1` 会直接覆盖 `release\Sidelight-0.32.1-win-x64-setup.exe`（`installer.nsi:20-22`）。开工前/收尾各跑一次 `Get-FileHash`（值见 §二）。
9. `npm run build` 不要在实施期间并发跑（并发写 `dist/` 会互相清空）；T1 编译所需的 `dist`/`host\bin` 用现有产物即可（`dist` 97 文件、`host\bin\Sidelight.exe` FileVersion 0.32.1.0、mtime 2026-11-17 19:50）。
10. 不覆盖 finder 证据：`shots/round-46/{bug,typora,ship,code,r46-ui}-*` 只读；新图一律 `impl-*`。
11. `page.click()` 点 `disabled` 会 30 s 超时；toast 只活 6 s；窄窗（≤1119px）`.margin-rail` 仍在 DOM 里但计算样式 `display:none`（只能判 `display`，不能判「不存在」）。

## 八、时间预算与砍单顺序

| 任务 | 实现 | 自测 / E2E | 小计 |
| :--- | ---: | ---: | ---: |
| T1 | 5 min（nsi 卸载段 + 两个 ps1 版本门 + verify-installer 四处 + 2 份文档） | 8 min（改前 dry-run+红探针 3、改后重建+绿探针 3、S3 红/绿 1、S2 干跑+S5 定向 1） | **13 min** |
| T2 | 4 min（App.tsx 两处 + MarginRail 两处 + CSS 三条） | 7 min（写带 `goto`+播种的脚本 2、改前跑一次 1、改后跑一次 + 门 A2 滚到底 1、三张截图 3） | 11 min |
| T3 | 5 min（mermaidLazy + mermaidPreview + 4 条单测） | 5 min（改前记录 + 改后两次切换 + 两张截图） | 10 min |
| 收尾（CHANGELOG / README / AGENTS / packaging/README / typora-gap / impl.md） | — | — | 2 min |
| 门禁串跑（tsc / test / verify / roundtrip） | — | — | 3 min |
| **合计** | | | **≈39 min（未砍）→ 砍 §八 第 1、2 项后 ≈36 min** |

**revision 2 不加估时**：R1 是一行代码 + 一行断言（`fake.inits.length === 1`），R2 是卸载块一行 + 探针两个文件 + 一条静态断言，R3/R4/R5/R6 是写法与断言口径的订正（0 新任务）；合计仍 ≈35 min。

**revision 3 的估时变化（V2-R2/V2-R3）**：T2 **9 → 11 min**（脚本不能照抄 `ui-4`，要补 `goto` + `RICH` 播种 + 门 A2 的滚到底读数，约 +2 min）；T1 **13 min 不变**（V2-R3 只是把一行 `RMDir /r` 换成 `Delete` + 非递归 `RMDir`，探针多两个文件、不多一次安装/卸载循环）。逐项相加是 **13 + 11 + 10 + 2 + 3 = 39 min**（revision 2 的 13 + 9 + 10 + 2 + 3 = 37 也已经被写成 ≈35，差额一直是同一笔）。**开工前先按下面顺序砍第 1、2 项**（≈3 min）回到 36，再要压到 35 就加砍第 3 项：

**为什么是 3 个而不是 4 个**：35 min 上限 + 6 条 P1 的现实取舍；再加任何一条都会把本轮推到 45 min 以上（第 45 轮 46 min 已被 plan-review §五 点过）。**若实际超时，按下面顺序砍（先砍验证广度，不砍主断言）**：

1. T1 的 S5 定向整跑（最贵：30 s 应用探活 + 30 s 卸载等待，再加一次安装/卸载与失败分辨；**省 ≈2 min**；保留代码 + 静态断言，把上面的复现命令写进 `impl.md`，记 UNVERIFIED）。
2. T2 的深色截图（保留 1440 浅色 + 1024 抽屉两张；**省 ≈1 min**）。
3. T1 的 B 段（干净目录卸载）→ 只保留 A 段，B 段用静态推理（`Delete recent.json*` + 非递归 `RMDir "$INSTDIR\state"` + `RMDir "$INSTDIR"`）记 UNVERIFIED。**省 ≈1 min**；代价是「空 state 目录会被清掉」少一条实测证据，A 段的 `recentGone` 仍在。
4. T3 的第 3 条（切回浅色）与第 7 条 UNVERIFIED 说明 → 只留「浅 → 深」一条，反向记 UNVERIFIED。
5. T2 的抽屉段 → 只保留 1440。
6. 最后才考虑把 T3 整条顺延——但那样本轮就只剩一条用户可见收益，**不推荐**。

**顺序不能反的一条**：A 段探针必须在改 `installer.nsi` **之前**写完，并用未改动的包跑出「改前红」基线（§二 第 1 步）；先改文件再补探针，「改前红」就只能靠旧包交叉对照，取证要重来一次。
