# 第 45 轮 · 计划审查（critic，只读）

- 轮次：`round=45`、`nn=45`；`startSha=021cbd35d0a0422e519b5c008a3d47fca1bdccbb`（实测 `git rev-parse HEAD` 同值）。
- 工作树：只有未跟踪的 `docs/iteration/round-45/`、`shots/round-45/`（`git status --porcelain` 实测）。本轮只读产品代码，只写本文件。
- 环境实测：dev server `http://localhost:5175/src/main.tsx` → **200**；CDP `http://127.0.0.1:9222/json/version` → `Edg/157.0.4341.46`。计划要用的产物齐备：`host\bin` 五件（87,040 / 703,328 / 38,792 / 194,912 / 790 B）、`dist` 97 文件 3,848,009 B、`.tmp\nsis\nsis-3.11\makensis.exe`、`.tmp/e2e-r45-{bug-d,ui-5,ui-6,ui-7,install}.*`、`packaging\sidelight.ico`（23,724 B）全部存在。
- 本文件是**第 45 轮第一次**计划审查（报告目录内此前没有 `plan-review.md`），所以「上一版漏洞是否修掉」一节不适用。
- **本文件现含两次审查**：§一–§六 是针对 `plan.md` 初版的第 1 次审查（保留原文，因为 `plan.md` 第 7 行要求 H4/H5/H6「按 review 原文处理」）；**第 2 次审查（针对 revision 2）从文件末尾的「# 第 2 次审查（plan revision 2）」开始**。第 2 次结论：**H1/H2/H3 已真修掉，H4/H5/H6 未修，另 3 条新 P2 → REVISE**。

## 一、结论：**REVISE**（P1 ×2、P2 ×4）

任务选择本身站得住：T1 是唯一「动作会把用户数据写到错地方」的条目（bug F1，P1），T2 收一条 P1＋两条 P2，T3 收一条 P1＋三条 P2 且同一个 `.nsi` 一次编译全验；三条都符合 `planner.md:16-25` 的排序（数据安全 → 用户可见 → 安装/体积）。方案在代码层**全部可行**（逐条核过，见 §三）。判 REVISE 的原因是**验收标准有两处会让执行代理拿到错误信号**（一条必假红、一条恒真红不了），外加四处证据/覆盖缺口。

| id | 级别 | 一句话 |
| :--- | :--- | :--- |
| H1 | **P1** | T1 的 I5 走「文件树正常打开」路径，**触不到被改的恢复分支**——计划自己点的最高风险（frontmatter 丢）没有任何断言能红 |
| H2 | **P1** | T2 的 E1 断言 `document.body.innerText.length` 与「开抽屉前相同」**必然假红**；而且它数的不是正文字数 |
| H3 | P2 | T2 验收基线「`role="presentation"` 改前 1 → 改后 2」与事实不符：**改前实测 4**（改后应为 5） |
| H4 | P2 | §六「本轮不做」漏了 **typora F6**（两份 Typora 文档 3 处过期）：27 条 actionable 里只有它既不在任务也不在 §六 |
| H5 | P2 | T3「没动 `release/`」的证据是空的：`release/` 被 `.gitignore:10` 整个忽略，`git status --porcelain release/` 改前改后都为空 |
| H6 | P2 | T2 的 E7 硬断言 `abs(arrow.top - new.top) <= 1` 与计划自己的判定口径（「不同时出现箭头独行」）不一致，会随 mock 文案换行位置假红 |

## 二、漏洞详情

### H1（P1）T1 的 I5 测不到被改的那条路径，计划自认的最大风险无断言

**证据**

- 计划 §二 改动 1–2 只改**恢复分支**：`src/App.tsx:458-487`（`initial.raw`）与 `:1029-1035`（首次载入 effect 写 `setOriginalText(raw)` / `rawTextRef.current = raw` / `baselineRef` 换 `original: raw`）。
- I5 写的操作是「**打开 `丙.md`** → `Ctrl+/` → 源码框以 `---\ntitle: 丙` 开头且 `dirty === false`」。从文件树打开走的是 `loadIntoEditor`（`src/App.tsx:2033-2131`），那条路径**改前就已经**写 `setOriginalText(text)`（`:2048`）、`rawTextRef.current = text`（`:2049`）、`baselineRef = serialized`（`:2073`）。所以 I5 在**未改代码**时也全绿（本轮 finder 的 `.tmp/r45-b.log` `## b1-view-toggle-dirty` 已经证明正常打开的文档不进源码也 `dirty:false`）。
- 于是计划 §二「风险与坑」里排第一的那条——「不要用 `rawTextRef = initial.text`（body）：源码视图会丢 frontmatter，退出源码时 `applySource` 把 `frontmatter` 置空，再保存就把 YAML 元数据写没——这是比原缺陷更大的数据损失」——**没有任何一条验收会红**。`switchView` 的 `:3915-3920` 确实是这样分派的（`rawTextRef.current !== null` 时直接显示它、不再拼 frontmatter），所以这不是理论风险：谁把 `raw` 写成 body，I1–I4、I6 照样全绿，frontmatter 已经没了。

**修法**（I5 改成走恢复分支，成本 +2 min）

1. 顺序改成：打开 `丙.md` → `Ctrl+S` → `page.reload()` 等 1.8 s → `Ctrl+/`，断言：源码框**以 `---\ntitle: 丙` 开头**、`dirty === false`、`localStorage['sidelight.doc.v1'].text` 以 `---\ntitle: 丙` 开头 → 再 `Ctrl+/` 回编辑，`h1` 仍在且盘上字节（`readFakeFile(page,'丙.md')`，reload 会复位假盘，改在 reload 前读）等于种子。
2. 原来那条「树里正常打开 丙.md → 源码带 frontmatter」降为**对照组**，写清它是负对照（改前改后都绿），不要当验收。
3. I5 里再补一条能抓「body 当 raw」的断言：源码框**末尾**是 `丙的正文。` 后接换行，且 `frontmatter` 行数 1 —— 只要误传 body，`---` 三行会整体消失。

### H2（P1）T2 的 E1 那条 `document.body.innerText.length` 断言必假红

**证据**

- `src/styles.css:2446-2450`：`.rail-toggle, .rail-close, .rail-backdrop { display: none }`；`:2476-2478` 在 `@media (max-width: 1119px)` 里 `.margin-rail { display: none }`。
- `src/styles.css:2514-2527`：`.app.rail-open .margin-rail { display: block; position: fixed; … }`。
- 结论：1024 下「开抽屉前」页边栏整棵子树是 `display:none`，`innerText` 不含它；点开抽屉后页边栏变成可见的 `display:block`，卡片与「整体评价」的文字全部进入 `body.innerText`。所以 `document.body.innerText.length` **一定变大**（三张卡 + 整体评价至少几百字），E1 会在「修好之后」判红。
- 顺带：`body.innerText` 数的是整页（顶栏 5 个按钮、工具栏、状态栏、侧栏空态），不是正文；就算数值稳定也不能证明「正文还在」。

**修法**（二选一，都不改产品代码）

1. 把两条读数都换成 `.doc-column` 口径：`document.querySelector('.doc-column').innerText.length`，断言 `after === before`（抽屉开着时正文仍在 DOM 里、只是被半透明遮罩盖住，长度不变）。
2. 或者删掉计数，改成两条：`elementFromPoint(300,350)` 命中 `DIV.rail-backdrop`；`getComputedStyle(document.querySelector('.doc-column .ProseMirror')).visibility !== 'hidden'` 且截图 `impl-t2-drawer-hover-1024.png` 里左侧正文肉眼可辨（计划已有这张截图）。

### H3（P2）T2 的 `role="presentation"` 基线数字是错的（1 → 2，实际 4 → 5）

- 计划 §三 验收写：`git grep -c 'role="presentation"' -- src/App.tsx # 改前 1（源码确认框的遮罩）→ 改后 2`。
- 实测（`git grep -c presentation -- src/App.tsx` → `src/App.tsx:4`）：改前 **4** 行，分别是 `:5209`（源码确认遮罩）、`:5236`（丢弃宿主草稿）、`:5275`（保留草稿）、`:5304`（切换文档）。改后应是 **5**。
- 后果：执行代理贴出的「改前基线」与计划不符时，要么以为自己改坏了，要么把这条基线改成 4→5 后失去「确实新增了一处」的正向信号；AGENTS §8 要求的正向对照（改前 >0、改后变化）也没了。
- **修法**：换一个真能反映这次改动的标记，例如
  - `git grep -c rail-backdrop -- src/App.tsx`（实测改前 **1**，就是 `:5195`；改后仍 1，配 E1/E2 的 `elementFromPoint` 命中 `DIV.rail-backdrop` 一起用），或
  - `git grep -c 'aria-label="关闭批注"' -- src/App.tsx`（实测改前 **1**（`:5195`）→ 改后 **0**，因为遮罩不再带可访问名），这条是真正的「改前 >0 → 改后 0」。

### H4（P2）§六 漏了 typora F6，27 条 actionable 有 1 条无处安放

- 计划 §一 自述「本轮 5 份报告合计 **27 条 actionable**（bug 2、typora 7、ship 5、code 4、ui 9）」。
- 逐条对：任务里收 8 条（bug F1、ui F3/F4/F5、ship S1/S2/S3/S5），§六「本轮不做」收 17 条（ui F1/F2/F6–F9、typora F1–F5、bug F2、ship S4、code F1–F4、bug F1 副作用）＝ 25 条。**typora F6（`typora-gap.md` / `typora-features.md` 3 处过期，finder 说「两份 Markdown、几分钟」、0 代码）既不在任务、也不在 §六**；typora F7 是 finder 自己声明「不作为新发现重复计数」的提醒，可不算。
- 后果：下一轮 planner 照 `plan.md` 排任务时会再次漏掉这条（它正是「planner 照旧文档排任务会重复排已做的事」的根因条目），而 `STATE.md:154` 已经把「两份 Typora 文档过期横幅」列进后续批次。
- **修法**（二选一）
  1. 塞进 §五 收尾（+2 min）：`docs/typora-gap.md` 补两行（正文栏宽随视口三档、预览/导出无标题 id）并把「预览与 HTML 导出不含图」搬进「缺的」；`docs/iteration/typora-features.md` 顶部加一行「现状以 `typora-gap.md` 为准（2026-11-17 复核）」。
  2. 至少在 §六 加一行，写明为什么不塞进 T3 的文档批、下轮怎么排。

### H5（P2）T3 的「没动 `release/`」验收是空证据

- 计划 §四 验收写：`git status --porcelain release/  # 空`；§五 收尾自查写：`git diff --stat -- package.json release/  # 空`。
- 实测：`git check-ignore -v release/SHA256SUMS.txt` → `.gitignore:10:release/`；`git ls-files release/` → **无输出**（release/ 整个目录不进版本控制）。被忽略的路径在 `git status` / `git diff` 里永远不出现，**改前改后都为空**，所以这两条命令既不能证明「没写 release/」，也不能发现误跑了非 dry-run 的 `installer.ps1` / `portable.ps1`（那两个脚本会覆盖 `release\Sidelight-0.32.1-win-x64-setup.exe` 与 `…-portable.zip`）。
- **修法**：开工前记一次哈希，收尾再记一次并断言相同：
  ```powershell
  Get-FileHash release\Sidelight-0.32.1-win-x64-setup.exe, release\Sidelight-0.32.1-win-x64-portable.zip, release\SHA256SUMS.txt -Algorithm SHA256
  ```
  期望值直接抄本轮 finder 的 `findings-ship.md` §2.6：`6C93F58F…B2` / `F4210C62…5DD` / `2F32C26A…651`。把这两组哈希写进 `impl.md`；`git status` 那两条留着无害，但不要再当「没碰 release/」的证据。

### H6（P2）E7 的硬断言与计划自己的判定口径不一致

- 计划 §三 E7：断言 `Math.abs(arrow.top - new.top) <= 1`（「改前 `arrow.top 434` / `new.top 458`」）。
- 但同节「风险与坑」写的是：「若箭头换行到新行开头，它后面紧跟新文——**只要不同时出现「箭头独行」就合格**」。两条口径不等价：`.note-diff` 改 `display:block` 后箭头是行内元素，落在**旧文最后一行的末尾**；只要那一行剩余宽度不够（卡片内容宽 234 px、12.5px 字号，旧文 21 字＝两行的量），箭头就会掉到下一行、与新文同一行——这条会过；但只要 mock 文案长度变一点，箭头就可能停在旧文末行、新文另起一行，`arrow.top` 与 `new.top` 差 20 px，**按计划口径合格、按硬断言假红**。E7 还要求抽屉里重复一次，两处都不稳。
- **修法**：把断言换成计划自己写的那条判据，写成可执行形式：
  ```js
  const sameLineWithOld = arrow.bottom > old.bottom - 21 && arrow.bottom <= old.bottom + 1  // 箭头在旧文末行
  const sameLineWithNew = Math.abs(arrow.top - new.top) <= 1                              // 或在新文首行
  assert(sameLineWithOld || sameLineWithNew)   // 只排除「箭头独行」
  ```
  最省事的等效写法：`Math.abs(arrow.top - old.bottom) <= 21 || Math.abs(arrow.top - new.top) <= 1`。同时把「改前是 434 / 458」保留为对照读数，但不要把它写成固定期望值。

## 三、逐条核对：文件/函数存在性与方案可行性（全部实测）

| 计划引用 | 核对结果 |
| :--- | :--- |
| `src/App.tsx:458-487` `useState` 恢复器、`:459-466` fallback、`:475-483` 返回对象 | 一致；`initial` 里确实**没有** raw，`fallback` 也无 raw |
| `src/App.tsx:1029-1035` 首次载入 effect（`setMarkdown(initial.text)` / `original: initial.text`）、`:1044` 依赖数组 | 一致 |
| `src/App.tsx:628` `rawTextRef`、`:636-644` `persistDocKey` | 一致 |
| 四处写 `rawTextRef`/`originalText`：`loadIntoEditor :2048-2049`、`applyHostPayload :1073-1074`、保存成功 `:2608-2609`、宿主保存回包 `:3442-3444` | 全部一致（`git grep originalText` 的 19 处命中逐处看过） |
| 源码兜底 `:3913-3922`（`switchView` 里 `rawTextRef.current !== null` 走原文） | 一致（`:3915-3920`） |
| 脏判定 `:1885-1892`、`:1901-1910`（放新 effect 的位置） | 一致 |
| `serializeDocument.ts:32-38` `applyTrailingNewlines`（`!original` 早退） | 一致 |
| `serializeBodyNow` `:2796-2804`、`prepareSave` `:2817-2822` | 一致 |
| `:3179` / `:3180-3181` 自动保存门 | 一致（`originalText === null` 门 +「文件句柄或可写宿主」门） |
| `switchView` `:3908-3939`、`applySource` `:3872-3902` | 一致 |
| T1 方案（`raw` = 整串 + `original: raw` + `rawTextRef = raw`）是否与正常载入同口径 | **可行且是正解**：与 `loadIntoEditor` 的 `original: text`（整串）口径一致；`serializeDocument` 的 `leading`/尾换行/EOL/表格复用都只看 `splitFrontmatter(original).body` 与尾串，传整串与传 body 结果相同，且源码视图能拿到 frontmatter。空首启（`raw=''`→`null`）与今日逐字节等价（`applyTrailingNewlines` 对 `''` 和 `null` 都早退） |
| `src/App.tsx:5194-5195` 遮罩 `button`、`:4639-4651` 开关无条件、`:5039-5095` 编辑分支才渲染 `MarginRail` | 一致 |
| `closeRail :740-743`（focus 回开关）、`openRail :745-749`、Esc `:3579-3581` | 一致；`setRailOpen` 全仓只有 741/746/3580 三处 → 「切视图不关抽屉」属实，新增 effect 不冲突（第 24 轮的窄窗自动开批注是纯 CSS，不调 `openRail`） |
| `styles.css:137-140` `button:hover:not(:disabled)` vs `:2504-2512` `.rail-backdrop` | 一致，特异度 0,2,1 压过 0,1,0 → 诊断正确 |
| `styles.css:953-963` `.note` 绝对定位、`:802-811` `.rail-overall` sticky、`:2529-2533` 抽屉卡 static、`:920-928` `.rail-notice-mock` | 一致 |
| `styles.css:1032-1041` `.note-diff` flex+wrap、`:1049-1051` `.diff-arrow` | 一致；JSX 是三个 `span`（`MarginRail.tsx:124-129`），改 block 后删除线/底色仍生效 |
| `packaging/installer.nsi`：`:94` `Section "Sidelight" SEC_MAIN` 无 `SectionIn`、`:130-131` `SetOutPath`+`File /r` 无 `RMDir`、`:22` `!endif`、`:42-46` 页面宏、`:127` `..\packaging\sidelight.ico`、`:120` `do_copy:` | 全部一致 |
| S3 图标位置可行性 | **可编译**：`Contrib\Modern UI 2\Interface.nsh:46-50` 的 `MUI_DEFAULT` 与 `:118-119` 的 `Icon "${MUI_ICON}"` 都在 `!macro MUI_INTERFACE` 内，而该宏由 `MUI2.nsh:91-114` 的 `MUI_INSERT` 触发（`!insertmacro MUI_LANGUAGE` 时，`:47`），即**页面宏之后**。所以「`!include` 之后、`:42` 之前」`!define MUI_ICON` / `MUI_UNICON` 不会撞 `!define` 重定义，`MUI_DEFAULT` 的 `!ifndef` 会跳过默认值 |
| 相对路径解析 | 一致：NSIS 按脚本目录（`packaging\`）解析，`..\packaging\sidelight.ico` → 根目录下的 `packaging\sidelight.ico`（与 `:127` 同款） |
| `SectionIn RO` 不破 `verify-installer.ps1` 静态断言 | 一致：`:203-213` 只断言 `WriteRegStr HKCU "Software\Classes`＝10、`DeleteReg*`＝4、无 HKLM 写、`ReadRegStr $0 HKLM`≥1、无 `UserChoice`、`MUI_PAGE_COMPONENTS`＝1、`Section /o `＝1；新增 `SectionIn RO`/`MUI_ICON`/`Icon`/`RMDir` 都不命中这些正则 |
| `installer.ps1 -AssocDryRun` 只写 `.tmp` | 一致：`:52-57` 用 `/DASSOC_DRYRUN /DOUTFILE=..\.tmp\assoc-dryrun-setup.exe`，`:72-102` 只校验并打印，`:8` 只 `New-Item release`（已存在，无改动） |
| T3 安装探针可复用 | 一致：`.tmp/e2e-r45-install.ps1` 只硬编码 `$setup`（`:4`）与 `$dir`（`:5`），改这两处即可；脚本自带 `$env:TEMP` 重定向（`:6-8`，NSIS 解包必需） |
| README/文档锚点 | `README.md:114`（1,300,711 / 1,622,355 + 292,681）、`:116`（898,601 B）、`packaging/README.md:57`（同两个字节）全部一致；`README.md:37` 是「重开恢复」行；`AGENTS.md:74` 是首屏 292,681 / 余 27,319；`CHANGELOG.md:162` 是 `**第 44 轮（同一未发版区间）**` |
| 计划里的改前基线 grep（除 H3 那条） | 实测：`SectionIn`＝0、`MUI_ICON`＝0、`MUI_UNICON`＝0、`Icon "`＝0、`^Icon "`＝0、`RMDir /r "$INSTDIR\www"`＝0、`raw: text`＝0、`original: initial.text`＝1（`:1034`）、`viewMode === 'edit' && (`＝0、`1,300,711|1,622,355`＝2 行 → **全部与计划一致** |

## 四、硬约束与回归检查（无违规）

- **Tiptap schema / 往返保真**：T1 不碰 schema，只换 `original` 的入参；`npm run roundtrip` 已列进 T1 门禁。T2 只改 DOM 类型与 CSS。T3 只改安装脚本。
- **保存差异门**：T1 让恢复态 `originalText` 从 `null` 变成整串，会打开 `:2909` / `:3184` 的 `activeLosses`。复核 `src/lib/risk.ts:376-383`：基线为空且原文无脚注定义时**提前返回 `[]`**，其余只放行 `footnote-loss`；恢复后 `footnotesRef.current` 有定义、序列化会把定义拼回（`joinFootnotes`），不会凭空多出确认框。计划没写这一条，但结论是「无回归」，不另立漏洞。
- **批注协议**：T2 不碰批注数据结构与采纳链（`onAccept`/`onDismiss` 未动）。
- **首屏预算**：本轮改 `App.tsx` 三处 + `styles.css` 两处，增量在 ±200 B 量级（内部 310,000 / 硬线 320,000，当前 292,681 B，余 27,319 B），`npm run verify` 已列进门禁。**不破线**。
- **无新运行时依赖**：三条任务都不加依赖。✓
- **与最近改动冲突**：T2 的页边栏/`.note-diff` 与第 43 轮（预览只读守卫）、第 44 轮（只读视图按钮说明）无重叠；`git log -8` 的 8 条提交里没有 `packaging/` 或 `src/App.tsx` 载入链的改动（第 44 轮改的是 `taskListInput.ts`/`styles.css` 打印块/`ai.ts`/工具栏 title），T3 改的 `installer.nsi` 与它们不交叉。**无冲突**。
- **不许动的东西**：计划明确不 push、不改 `release/`、不 bump `package.json`、不动 `docs/iteration/STATE.md`。✓（`release/` 的验证方式见 H5）

## 五、35 分钟能做完了吗：**按计划原样不能**

- 计划自估 **44 min**（T1 12 + T2 11 + T3 12 + 收尾 4 + 门禁 5），`roles/planner.md:25` 的口径是「按一个执行代理 35 分钟内能完成来排；超出就砍到 3 个或更少」。计划已砍到 3 个（下限），所以形式上没违规，但实际超 9 min（≈26%）。
- 我的估时与计划接近，几处只会更慢：T1 的 e2e 要改 seed（甲/乙/丙/丁）＋补 I1–I6 六组断言（≈8–10 min，计划给 8）；T2 要改**三份** finder 脚本的端口/路径并改掉 H2 那条断言（≈6–8 min）；T3 要编译一次＋装/升/卸三次＋图标哈希＋两条 grep 基线＋三份文档（≈12–14 min）。
- 建议（不改判定标准，只把「砍什么」提前定死，免得执行时代理在压力下临时砍掉主断言）：
  1. 把计划 §八 砍单顺序的**前两项**（T2 的 E4 深色复核、T3 的 S3 图标哈希）在 `impl.md` 里预标「默认不做、有余量再补」，估时回到 ≈40 min；
  2. T3 的 S5（README 数字）如果不做，本轮剩下的 S1/S2/S3 仍是完整的一组「发布专项」子集，不影响下轮接手；
  3. **H1、H2 的修法必须进本轮**（它们修的是验收能否给对信号），不能进砍单表。

## 六、复核方式（可重跑）

- 计划点到的文件逐个用 `read` 打开核对（`src/App.tsx` 的 12 段、`src/styles.css` 的 8 段、`MarginRail.tsx` 3 段、`serializeDocument.ts`、`risk.ts` 全文、`installer.nsi` 全文、`installer.ps1` 全文、`verify-installer.ps1:190-246`、`README.md:33-42/108-121`、`packaging/README.md:47-57`、`AGENTS.md:70-74`、`CHANGELOG.md:150-170`、`STATE.md` 全文、`roles/planner.md`）。
- 基线 grep 与产物盘点用 `git grep` / `Test-Path` / `git check-ignore` 实测（结果见 §二、§三）。
- 环境探测只读（HTTP 200 / CDP version）；**没有跑任何 E2E、没有点浏览器、没有改产品代码、没有 commit**。

---

# 第 2 次审查（plan revision 2）

- 对象：`docs/iteration/round-45/plan.md` 的 **revision 2**（planner 按第 1 次审查的 H1/H2/H3 改了 §二 I5、§三 E1/E5/E6 读数口径、§三 `role="presentation"` 基线；H4/H5/H6 自述「保持原样」）。
- 轮次/环境：`round=45`、`nn=45`、`startSha=021cbd35d0a0422e519b5c008a3d47fca1bdccbb`（`git rev-parse HEAD` 实测同值；`git status --porcelain` 只有未跟踪的 `docs/iteration/round-45/`、`shots/round-45/`）。dev server 5175 未动、CDP 9222 未用。
- 本次同样只读：读了 `plan.md`、`plan-review.md`（第 1 次）、5 份 `findings-*.md`、`src/App.tsx`（458-487 / 600-644 / 830-1012 / 1026-1044 / 1538-1566 / 1878-1922 / 2025-2139 / 2560-2680 / 2780-2926 / 3140-3220 / 3280-3350 / 3490-3770 / 3855-3954 / 4626-4652 / 5030-5200）、`src/styles.css`（134-151 / 1020-1059 / 2440-2549）、`src/components/MarginRail.tsx`、`src/components/PreviewPane.tsx`、`src/lib/{serializeDocument,frontmatter,risk}.ts`、`packaging/installer.nsi`、`packaging/verify-installer.ps1:195-214`、`packaging/README.md:57`、`README.md:106-116`、`AGENTS.md:39/72/74`、`docs/CHANGELOG.md:155-170`、`.tmp/e2e-r45-bug-d.mjs`、`.tmp/r45-d.utf8.log`、`.tmp/e2e-r45-ui-5.mjs` / `-6.mjs` / `-7.mjs`。
- **没有跑 E2E、没有点浏览器、没有改产品代码、没有 commit、没有碰 `release/`。**

## 一、结论：**REVISE**（P0×0、P1×0、P2×6）

第 1 次的 **H1/H2/H3 全部真修掉了**（逐条复核见 §二，不是只看计划文字）。T1/T2/T3 的方案在代码层仍然可行（§四 重新核过）。判 REVISE 只因为还剩 6 条 P2：3 条是第 1 次未修的（H4/H5/H6），1 条是 **AGENTS §8 的引号教训没贯彻到 T3 的基线命令**（R2-4，实测 PowerShell 直接解析失败），2 条是本次修订后仍缺的覆盖/一致性（R2-5/R2-6）。它们不影响「任务做不做得到」，只影响「执行代理拿到的红绿信号对不对」。

| id | 级别 | 一句话 |
| :--- | :--- | :--- |
| R2-1 | P2 | §六 仍漏 **typora F6**（第 1 次 H4 未修） |
| R2-2 | P2 | T3「没动 `release/`」仍是空证据（第 1 次 H5 未修） |
| R2-3 | P2 | E7 的 `abs(arrow.top - new.top) <= 1` 仍会假红（第 1 次 H6 未修） |
| R2-4 | P2 | T3 改前基线 `git grep -c "Icon \""` 在 PowerShell 下**整条命令不执行**（实测 ParserError） |
| R2-5 | P2 | T1 第 3 处改动 `setOriginalText(raw)` **没有任何断言覆盖**，删掉仍全绿 |
| R2-6 | P2 | §〇 时间表 T1 仍写 **12 min**，与 §八 的 14 min、文首「44 → 46」矛盾 |

## 二、上一版漏洞核对：H1/H2/H3 已修，H4/H5/H6 未修

| id | 第 1 次要求 | revision 2 现状（复核证据） | 判定 |
| :--- | :--- | :--- | :--- |
| **H1** | I5 改走恢复分支；原「树里打开」降为负对照；加一条只对误用 body 会红的断言 | `plan.md:105-117`：I5 = 打开 `丙.md` → **N1 负对照**（第 1 次要求的那条，明写「改前改后都应绿，不计入 PASS/FAIL」）→ `Ctrl+S` → `page.reload()` 等 1.8 s → `Ctrl+/` → 四条断言（`dirty===false`；源码框 `=== localStorage.text`；`startsWith('---\ntitle: 丙') && endsWith('丙的正文。\n')`；**前 3 行恰为 `---`/`title: 丙`/`---`**）→ 回编辑查 `h1` 与「reload 前读的盘上字节」。第 1 次的 3 个修法点全部落位 | **已修** |
| **H2** | E1 的 `body.innerText.length` 换成 `.doc-column`；同口径改 E5/E6 | `plan.md:218` 明确 `docColumn` + 「取不到就是 FAIL，不要退化成 body」；`:226` 写明为什么不能用 `body`（≤1119px 抽屉文字会进 body）；`:232` 的 E5 用 `.doc-column`（预览也有该节点）；`:234` 的 E6 用 `textarea.source-editor`；§七 `:413` 写进口径。无一处再依赖 `body.innerText` 做断言 | **已修** |
| **H3** | `role="presentation"` 基线改成实测值与不吃引号的写法 | `plan.md:210` 改成 `git grep -cE 'role=.presentation.' -- src/App.tsx # 改前 4 → 改后 5`；`:215` 的 H3 注写明为什么不能写双引号版本。我实测该命令 → `src/App.tsx:4`（`:5209`/`:5236`/`:5275`/`:5304`），与计划一致 | **已修** |
| **H4** | typora F6 进 §六 或进收尾 | `plan.md:7` 自述「保持原样」；§六 14 行里 typora 只有 F1–F5。→ 见 R2-1 | **未修** |
| **H5** | `release/` 用开工前后 SHA256 对比 | `plan.md:335`、`:382-383` 仍是 `git status --porcelain release/` / `git diff --stat -- package.json release/`。→ 见 R2-2 | **未修** |
| **H6** | E7 断言换成计划自己的「不出现箭头独行」判据 | `plan.md:235` 仍是 `Math.abs(arrow.top - new.top) <= 1`，风险段 `:243` 却写「只要不同时出现『箭头独行』就合格」。→ 见 R2-3 | **未修** |

### H1 的修法是**真能红**的（我按代码推了一遍字节）

- 恢复态 body 从哪来：`App.tsx:472-476` 的 `initial` 里 `text: footnoteSplit.body`，即「拆掉 frontmatter 与脚注定义后的 body」——所以计划的 `raw` 必须取 `:472` 那个整串，不是 `:476` 的 body。
- localStorage 里存的是**整串**：`persistDocKey`（`:637-640`）由 `loadIntoEditor`（`:2106` 传 `text`）、保存成功（`:2639` 传 `withEol`）写入；`Ctrl+S` 对新打开的干净文档走 `requestSave('file')`（`:2887-2914`，只有 `goal === 'host'` 才有「没有改动，未写入」的早退），所以 `Ctrl+S` 后 `localStorage.text === SEED_丙`。
- 改前源码框为什么必红：`rawTextRef.current === null` → `switchView` 走 `currentMarkdown()`→`serializeBodyNow()`（`:2796-2804`），`original = null` → `serializeDocument` 的 `leading` 取不到（`serializeDocument.ts:59-61`）、`applyTrailingNewlines` 早退（`:32-33`）→ 源码框 = `---\ntitle: 丙\n---\n# 丙\n\n丙的正文。`（**同时少 frontmatter 后那个空行与尾换行**），与 `localStorage.text`（`---\ntitle: 丙\n---\n\n# 丙\n\n丙的正文。\n`）逐字节不等，`dirty` 也必为 `true`（`.tmp/r45-d.utf8.log` 的 `## d2`/`## d3` 已在无 frontmatter 的 `甲.md` 上实测同形）。
- 改后为什么全绿：`rawTextRef = raw`（整串）→ 源码框直接显示它，与 `baselineRef`（`original: raw`）逐字节相同。
- 误用守卫为什么有效：`applySource`（`:3872-3879`）**无条件**用源码框内容重设 `frontmatter`。谁把 body 当 raw，源码框第一行就是空行、第二行 `# 丙`，第 4 条断言红；回编辑后 YAML 已被清空（再存就写没），这正是计划 §二 说的「比原缺陷更大的数据损失」。
- 空首启不受影响：fallback 的 `raw: ''` → `raw = null`，`original: ''` 与 `null` 在 `applyTrailingNewlines`/`leading` 上等价（`serializeDocument.ts:32-33`、`:59-61`），与今天逐字节一致。

### H2 的替代口径可行（不是换了个同样会假红的读数）

`.doc-column` 在编辑态是 `App.tsx:5041`，在预览态是 `PreviewPane.tsx:68`/`:77`（`className="doc-column preview-column"`）——计划 §三 风险那句「编辑态与预览态都有这个节点」属实。窄窗抽屉开合只动 `.margin-rail`（`styles.css:2476-2478` 的 `display:none` 与 `:2514-2527` 的 `display:block; position:fixed`），`.doc-layout` 的正文列不被重排；`innerText` 只看渲染与否、不受半透明遮罩覆盖影响，所以「开抽屉前后 `.doc-column` 长度相等」会是稳定绿，而 E5/E6 的 `.doc-column`/`textarea.source-editor` 读数也不会因为抽屉里的卡片文字而变。

## 三、本次漏洞详情

### R2-1（P2）§六 仍漏 typora F6：27 条 actionable 里有 1 条既不在任务也不在「本轮不做」

**证据**

- `findings-typora.md:20` 把 F6 列为一条独立发现：**两份 Markdown、3 处过期、0 代码、几分钟**（`findings-typora.md:122-131` 给了逐条改法：`typora-features.md` 顶部加一行现状快照说明；`typora-gap.md` 补「正文栏宽/视口三档」「预览与导出的标题 id」两行，并把「预览/导出不含图」搬进「缺的」）。
- `plan.md:17-21` 的任务表收 8 条（bug F1、ui F3/F4/F5、ship S1/S2/S3/S5）；§六 `:387-403` 的 14 行收 17 条（typora F1–F5、ui F1/F2/F6–F9、bug F2、ship S4、code F1–F4、bug F1 副作用）。**typora F6 一处都没有**，而 `plan.md:25` 自己说「5 份报告合计 27 条 actionable」。
- 后果和第 1 次一样：下一轮 planner 照 `plan.md` 排任务时会再次漏掉「两份文档过期」——它恰好是「planner 照旧文档排任务重复排已做项」的根因条目（`STATE.md:154` 已列进后续批次）。

**修法**（0 代码，二选一）

1. 直接在 §六 加一行：`typora F6 | 2 份 Markdown 3 处过期 | P2（文档）| 0 代码、本轮 3 个任务已满 | 下轮与「界面细化」同批，或本轮收尾顺手（+2 min）`。
2. 或塞进 §五 收尾清单（执行代理做，+2 min），但要把 `finding-typora.md:131` 的 3 处改法原样抄进步骤，别只写「更新两份文档」。

### R2-2（P2）T3 的「没动 `release/`」是空证据，而且真实风险（跑错脚本覆盖 release/）仍然测不出来

**证据**

- `git check-ignore -v release/SHA256SUMS.txt` → `.gitignore:10:release/`；`git ls-files release/` 无输出。所以 `plan.md:335` 的 `git status --porcelain release/` 与 `:382` 的 `git diff --stat -- package.json release/` **改前改后都为空**（我实测 `git status --porcelain release/` → 无输出、exit 0）。
- 同一时刻 `release/` 里有 `Sidelight-0.32.1-win-x64-setup.exe`（824,595 B）、`…-portable.zip`（910,360 B）、`SHA256SUMS.txt`（207 B）。而 T3 要跑 `packaging\installer.ps1 -AssocDryRun`——同一脚本**不带 `-AssocDryRun`** 时会直接覆盖 `release\Sidelight-0.32.1-win-x64-setup.exe`（`installer.nsi:20-22` 的 `OUTFILE` 默认值就是它）。真跑错一次，三条 `git` 命令全绿，没人会发现。
- 这不是理论风险：本轮 finder 就被迫 `portable.ps1` / `installer.ps1` 各跑一次，然后按 SHA256 逐字节还原（`findings-ship.md:102-112`），还原值是 `6C93F58F…B2`（setup）、`F4210C62…5DD`（portable）、`2F32C26A…651`（SHA256SUMS）。

**修法**：开工前记一次哈希、收尾再记一次并断言相同：

```powershell
Get-FileHash release\Sidelight-0.32.1-win-x64-setup.exe, release\Sidelight-0.32.1-win-x64-portable.zip, release\SHA256SUMS.txt -Algorithm SHA256
```

期望值抄 `findings-ship.md:107-109` 的三条；`git status` 两条留着无害，但**不要**再当「没碰 release/」的证据。

### R2-3（P2）E7 的硬断言仍与计划自己的判定口径不一致，会随 mock 文案换行位置假红

**证据**

- `plan.md:235`：`Math.abs(arrow.top - new.top) <= 1`（「箭头与新文同一行」），改前读数 `arrow.top 434` / `new.top 458`。
- 但 `.note-diff` 改 `display:block` 后（`plan.md:181-189`），三个 span 变成行内流：旧文两行占满 234 px 时，箭头落在**旧文末行末尾**（`arrow.top` 介于 `old.top` 与 `new.top` 之间），与新文不同行——这完全符合计划 `:243` 自己写的判据（「只要不同时出现『箭头独行』就合格」），却会让硬断言红。箭头落点取决于 mock 文案长度（`findings-ui.md:109` 实测旧文 40 px 两行），实现时任何一处微调都会翻车；E7 还要求抽屉里再重复一次，两处都不稳。
- 另外 E7 用「第 2 张卡是修订卡」定位 `.note-diff`，不如 finder 脚本的 `.note-revision .note-diff`（`.tmp/e2e-r45-ui-7.mjs:21`）稳；`Ctrl+Enter` 本身可用（`App.tsx:764` 的 `Mod-Enter`，`ui-7` 用的是 `.analyze-button`，两条都行，但写清用哪条）。

**修法**：把断言换成计划自己写的判据，例如

```js
const sameLineWithOld = Math.abs(arrow.top - old.bottom) <= 21   // 在旧文末行（12.5px 字号的行高 20）
const sameLineWithNew = Math.abs(arrow.top - new.top) <= 1       // 或在新文首行
assert(sameLineWithOld || sameLineWithNew, JSON.stringify({ arrow, old, neu }))
```

选择器用 `.note-revision .note-diff`；`434`/`458` 只作对照读数，不写成期望值。

### R2-4（P2）T3 改前基线里的 `git grep -c "Icon \""` 在本会话的 shell 下直接解析失败，整条命令不执行

**证据**（实测，不是推测）

```
PS> git grep -c "Icon \"" -- packaging/installer.nsi
[stderr] 字符串缺少终止符: '。
    + FullyQualifiedErrorId : TerminatorExpectedAtEndOfString
[exit code: 1]
```

PowerShell 里 `\` 不是转义符，`"Icon \""` 被拆成两个 token，整条命令连 git 都没调用到——`plan.md:323` 的「改前 0」永远拿不到，`AGENTS.md` §8 要求的「先贴改前 >0 / 改后 0 的正向对照」也就贴不出来。这正是第 1 次 H3 修掉的那类坑（双引号被 shell 吃掉），只是 T3 段落没跟着改。

**修法**：

- 改前/改后统一用单引号：`git grep -c 'Icon "' -- packaging/installer.nsi`、`git grep -cE '^Icon "' -- packaging/installer.nsi`（我实测两条都执行成功，改前 0 命中 → 无输出 + exit 1）。
- 顺手在 §四 基线块加一句：「`git grep -c` 零命中时**不打印数字**（exit 1），`# 0` 指的是没有输出」，免得执行代理把空输出当命令坏了。

### R2-5（P2）T1 的 3 处改动里，`setOriginalText(raw)` 没有任何断言覆盖：删掉它 I1–I6 仍然全绿

**证据**

- I5 的四条断言只读三样东西：`window.__slState.dirty`、`textarea.source-editor` 的 `value`、`localStorage['sidelight.doc.v1'].text`。其中源码框走 `rawTextRef`（`App.tsx:3915-3920`），`baselineRef` 由计划显式传 `original: raw`（`plan.md:65-73`），localStorage 由 `loadIntoEditor`/`finishSaved` 写（`:2106`/`:2639`）——**都不经过 `originalText` 这个 state**。`contentRef`/`serializeBodyNow` 也是 `rawTextRef.current ?? originalText`（`:2798`），`rawTextRef` 已经不空。
- 而 `originalText` 真正影响的是保存链：`prepareSave` 按它补尾换行（`:2817-2822`），`requestSave` 的 `activeLosses` 门（`:2909`）和自动保存门（`:3179`）。这些只在「恢复后再次保存」时才有读数。
- 计划自己把这条改进写进了 CHANGELOG（`plan.md:126`「保存字节会多出原文的尾换行：这是有意的字节保真改进」、`plan.md:372` 的收尾第 1 条），却没有一条断言能证明它成立或防止它被删。执行代理在时间压力下砍掉这一行，I1–I6 照样全绿，下一轮就会当「已验证」继承。

**修法**（二选一，都不改产品代码）

1. 在 I5 第 6 步之后加一拍：恢复态正文末尾打 1 个字符 → `Ctrl+S` → 读刚落盘的那份新文件字节（`.tmp/r45-d.utf8.log` 的 `## d4` 已证明恢复态 `Ctrl+S` 会落成 `未命名.md`，路径可从 toast 或假盘拿）→ 断言以 `\n` 结尾。有 `setOriginalText` 时带尾换行，删掉则不带——这是真正的红/绿分界。**注意**：这条落点是无句柄的固有路径（`plan.md:125` 已声明不在本轮范围），所以只断言「字节尾换行」，不要顺手断言文件名/位置。
2. 若嫌上面那拍有噪音：在 impl.md 明确写「`setOriginalText(raw)` 只与 `loadIntoEditor` 的口径对齐，恢复态无句柄所以本轮的保存字节路径未测（UNVERIFIED）」，并把 CHANGELOG 里「保存字节多出尾换行」改成不作承诺的描述。**不要**既写进 CHANGELOG 又不测。

### R2-6（P2）§〇 的时间表没跟着 revision 2 更新

**证据**：`plan.md:3` 说「唯一的时间变化是 T1 验证 +2 min…合计 44 → 46 min」；§八 `:423` 的 T1 是 **14 min**；但 §〇 的汇总表 `:19` 仍写 T1 **12 min**，`:23` 又写「合计约 46 min」。三个数字里两个自洽、表格那个没改。

**修法**：把 `:19` 的 12 min 改成 14 min（或写「见 §八」），免得执行代理按表算账时以为有 2 min 余量。

## 四、revision 2 没改的部分再核一遍（全部指向真代码；无新问题）

| 计划引用 | 复核结果 |
| :--- | :--- |
| 恢复初始化 `App.tsx:458-487`（fallback `:459-466`、返回 `:475-483`） | 一致；`initial` 里确实没有 raw，`text` 是 body（`:476`）——计划的 `raw: text` 必须取 `:472` 的整串 |
| 载入 effect `:1026-1044`、`:1034` `original: initial.text`、依赖数组 `:1044` | 一致；`git grep "original: initial.text"` = **1 行**（`:1034`） |
| `rawTextRef` `:628`；四处写入 `:2048-2049` / `:1073-1074` / `:2608-2609` / `:3442-3444` | 一致 |
| 源码兜底 `:3913-3922`、脏判定 `:1885-1892`、`applySource` `:3872-3902` | 一致（`:3915-3920` 的 `!dirty && rawTextRef !== null` 分派） |
| 遮罩 `:5194-5195`（button + `aria-label="关闭批注"`）、开关 `:4639-4651`（无条件 + `aria-controls="margin-rail"`）、编辑分支 `:5039-5095` | 一致；`MarginRail.tsx:68` 确实有 `id="margin-rail"`（所以编辑态该 aria 有效、预览态才断） |
| `styles.css:137-140`（`button:hover` 0,2,1）vs `:2504-2512`（`.rail-backdrop` 0,1,0）、`:2476-2478`、`:2514-2527` | 一致 |
| `styles.css:1032-1041`（flex+wrap）/ `:1049-1051`；`MarginRail.tsx:124-129` 三个 span | 一致；JSX 换行会被去掉，改 block 后箭头与新文之间没有空白，计划补的 `margin: 0 4px` 是**必需**的（不是美化） |
| `plan.md` 的 T1 基线 grep：`raw: text` 0、`original: initial.text` 1 | 实测一致 |
| T2 基线：`role=.presentation.` 4、`rail-backdrop` 1、`viewMode === 'edit' && (` 0 | 实测一致（前两条 `:5209/:5236/:5275/:5304` + `:5195`） |
| `installer.nsi`：`:22` `!endif`、`:42-46` 页面宏、`:94` `Section "Sidelight" SEC_MAIN`、`:120` `do_copy:`、`:127` ico、`:130-131` `SetOutPath`+`File /r`、`:151` `Section /o` | 一致；`SectionIn`/`MUI_ICON`/`MUI_UNICON`/`Icon "`/`^Icon "`/`RMDir /r "$INSTDIR\www"` 实测全 **0**；`Section /o ` = 1、`MUI_PAGE_COMPONENTS` = 1 |
| `verify-installer.ps1:203-214` 的静态断言 | 只匹配 7 个计数（10/4/0/≥1/0/1/1）；`SectionIn RO`、`MUI_ICON`、`Icon`、`RMDir` 都不命中 → 不会改坏 |
| README `:114`（1,300,711 + 1,622,355）、`packaging/README.md:57`（同两个）、`README.md:116`（898,601）、`AGENTS.md:74`（292,681 / 27,319）、`CHANGELOG.md:162`（第 44 轮块） | 一致；`git grep -nE "1,300,711|1,622,355"` = **2 行**（README 一行、packaging 一行），与计划的「2 处 → 0」口径一致 |
| T3 预检产物 | `packaging\sidelight.ico` 23,724 B、`dist` 97 文件 3,848,009 B、`host\bin` 五件 87,040 / 703,328 / 38,792 / 194,912 / 790、`.tmp\nsis\nsis-3.11\makensis.exe` 与 `.tmp\e2e-r45-{bug-d,ui-5,ui-6,ui-7,install}.*` 都在 |
| 窄窗自动开抽屉 | `App.tsx:1556`：`if (addedCount > 0 && matchMedia('(max-width: 1119px)').matches) openRail()`（计划写 `:1550-1556`，命中） |
| `Ctrl+Shift+P` / `Ctrl+/` 在遮罩开着时可用 | `App.tsx:3755-3759` / `:3733-3737` 是 window 级 keydown，且 `railOpen` 只在 Esc 分支被读（`:3579-3583`）→ E5/E6 的做法成立 |

**硬约束**：三条任务都不新增运行时依赖、不碰 schema/往返序列化（T1 只换 `original` 入参，`roundtrip` 已列门禁）、不动批注协议、不动 `release/`、不 bump 版本。首屏增量可忽略（当前 292,681 B，余 27,319 B），`npm run verify` 已列门禁。**无 P0/P1。**

## 五、时间与可行域

- 仍超 `roles/planner.md:25` 的 35 min：计划自估 46 min（3 个任务已是下限），§八 砍单顺序合理且已把「不砍主断言」写死。R2-1 若走「塞进收尾」会 +2 min，建议走 §六 加一行（0 代码、0 min）。
- 一个执行代理做得完：三条任务的改动面分别是 1 文件 3 处、2 文件 4 处、1 `.nsi` 3 处 + 3 份文档；E2E 脚本都有现成骨架（`.tmp/e2e-r45-{bug-d,ui-5,ui-6,ui-7}.mjs`），只需改端口/路径/断言。
- 唯一可能卡住的是 T3 的安装探针（会 `Get-Process Sidelight | Stop-Process` + 静默安装到 `.tmp\impl-install`），计划已写明只装 `.tmp`、不碰默认路径。

## 六、复核方式（可重跑）

- 计划点到的文件逐个用 `read` 打开核对（清单见本文首），不只看计划文字；`.tmp/r45-d.utf8.log` 的 `## d2`/`## d3`/`## d4` 用作 F1 改前读数，`.tmp/e2e-r45-ui-7.mjs` 的 `DIFF` 段用作 E7 的对照。
- 实测命令：`git rev-parse HEAD`、`git status --porcelain`、`git check-ignore -v release/SHA256SUMS.txt`、`git grep -c/-n` 全套基线（含 R2-4 的两条引号变体）、`Test-Path`/`Get-ChildItem` 盘点产物、`git grep -n 1,300,711|1,622,355`。
- **没有跑任何 E2E、没有点浏览器、没有改产品代码、没有 commit、没有碰 `release/`。**

---

# 第 3 次审查（plan revision 3）

- 对象：`docs/iteration/round-45/plan.md` 的 **revision 3**（planner 按第 2 次审查的 R2-1～R2-6 改了 §六 typora F6、T3 的 `release/` 哈希证据、E7 的判据与反独行守卫、`Icon "` 的单引号基线、`setOriginalText` 的 UNVERIFIED 口径、§〇 的 T1 14 min）。
- 轮次/环境：`round=45`、`nn=45`、`startSha=021cbd35d0a0422e519b5c008a3d47fca1bdccbb`（`git rev-parse HEAD` 实测同值；`git status --porcelain` 只有未跟踪的 `docs/iteration/round-45/`、`shots/round-45/`）。dev server 5175 未动、CDP 9222 未用（本次不跑 E2E）。
- 本次只读输入：`plan.md` 全文（468 行）、本文件第 1/2 次审查、5 份 `findings-*.md`、`src/App.tsx`（458-487 / 612-651 / 1026-1044 / 1545-1566 / 1878-1925 / 2790-2825 / 2878-2917 / 3167-3190 / 3566-3779 / 3904-3943 / 4630-4652 / 5036-5100 / 5185-5209）、`src/styles.css`（128-152 / 1020-1059 / 2444-2543）、`src/components/MarginRail.tsx`（55-134）、`src/components/PreviewPane.tsx`（55-87）、`src/lib/{serializeDocument,footnotes,frontmatter,risk}.ts`、`packaging/installer.nsi` 全文、`packaging/installer.ps1` 全文、`packaging/verify-installer.ps1:190-234`、`README.md:108-121`、`packaging/README.md:52-57`、`AGENTS.md:70-74`、`docs/CHANGELOG.md:150-171`、`docs/typora-gap.md:25-49`、`.tmp/e2e-r45-{ui-5,ui-6,ui-7,bug-d}.mjs`、`.tmp/e2e-r45-install.ps1`。
- **没有跑 E2E、没有点浏览器、没有改产品代码、没有 commit、没有写 `release/`**（只用 `Get-FileHash` / `Get-Item` 只读核对 `release/`）。

## 一、结论：**REVISE**（P0×0、P1×0、P2×2）

**R2-1～R2-6 全部真修掉了**（逐条见 §二，均以本轮实测或读码复核，不是只看计划文字）。rev 3 新增的 E7 判据/守卫、T3 的 `release/` 双点 SHA256、§六 的 typora F6 行都能给对红绿；T1/T2/T3 的方案与行号仍与 HEAD 一致（§四）。判 REVISE 只因为 **2 条会给出错误信号的写法**：§二 风险与坑里的「可选补测」其实测不出 `setOriginalText(raw)`（照做会假绿），§四/§五 的 README:114 改写会在同一段里把安装包预算和「以 Release 页为准」各说两次，并留下旧的「当前」数字。

| id | 级别 | 一句话 |
| :--- | :--- | :--- |
| R3-1 | P2 | §二 风险与坑第 2 条（可选补测）**测不出** `setOriginalText(raw)`：去掉这一行，落盘字节仍带尾换行，照做会记一条假绿 |
| R3-2 | P2 | §四 改动 2 / §五 收尾 2 的 README:114 改写：同段重复安装包预算与「以 Release 页为准」；首屏「当前 292,681 B（第 44 轮…）」只「补一句」而不换掉旧值 |

## 二、上一版漏洞核对（R2-1～R2-6）

| id | 第 2 次要求 | revision 3 现状（本轮复核证据） | 判定 |
| :--- | :--- | :--- | :--- |
| **R2-1** | §六 加 typora F6，抄 `findings-typora.md:131` 的 3 处改法；不要只写「更新两份文档」 | `plan.md:430` 新增一行，`findings-typora.md:127`（大纲行）+ `:131`（3 处改法）全部落位：`typora-features.md` 顶部快照说明、`typora-gap.md` 补两行、把「预览/导出不含图」搬进「缺的」，另加大纲折叠句。`docs/typora-gap.md:34` 确为 mermaid 的「已经有」备注、`:35` 确为大纲行，行号对得上。另：§一 `:31` 的计数现在自洽（§六 14 行 18 条 findings + bug F1 副作用 1 行；8 任务 + 18 = 26 = 27 − typora F7） | **已修** |
| **R2-2** | `release/` 用开工前/收尾两组 SHA256，期望值抄 `findings-ship.md:107-109` | `plan.md:302-310` 开工前、`:360-362` 收尾、`:384-385` 证据、`:412-416` 收尾自查四处都改成 `Get-FileHash`，并写明「`git status` 恒空、只作附加证据」。本轮实测三条哈希与字节：`6C93F58F…B2` 824,595 B / `F4210C62…5DD` 910,360 B / `2F32C26A…651` 207 B，与 `findings-ship.md:107-109` 逐字节相同；`git check-ignore -v release/SHA256SUMS.txt` → `.gitignore:10:release/`、`git ls-files release/` 空、`git status --porcelain release/` 空（均复现） | **已修** |
| **R2-3** | 换成计划自己的「不出现箭头独行」判据；选择器用 `.note-revision .note-diff`；434/458 只作对照 | `plan.md:244-248`：选择器 `.note-revision .note-diff`；主判据 `|arrow.top−old.bottom|≤21 \|\| |arrow.top−new.top|≤1` + 反独行守卫 `arrow.top<old.bottom−1 \|\| |arrow.top−new.top|≤1`，两条同时成立。按 `findings-ui.md:109` 的改前读数推一遍（old.bottom=430、arrow.top=434、new.top=458）：主判据 4≤21 过，守卫 434<429 与 |434−458|=24 都不成立 → 改前必红；改后箭头落旧文末行或新文首行两种合格形态都能过 | **已修** |
| **R2-4** | 含 `"` 的 grep 模式改单引号，并写明零命中的读法 | `plan.md:301`、`:311`、`:347-353` 全部单引号；`:311` 写明「`git grep -c` 零命中不打印数字、exit 1」。本轮实测 `git grep -c 'Icon "'` 正常执行（无输出 + exit 1），`git grep -c "Icon \""` 复现 ParserError「字符串缺少终止符」+ exit 1 | **已修** |
| **R2-5** | `setOriginalText(raw)` 的字节效果要么测、要么显式 UNVERIFIED，CHANGELOG 不许承诺 | `plan.md:132-135` 明确「按第一条做（0 min）：impl.md 写 UNVERIFIED、CHANGELOG 不写『保存字节多出尾换行』」，`:402` 也禁止了该承诺。R2-5 本身已修；但同一 bullet 的可选补测写错了 → 见 **R3-1** | **已修（另有 R3-1）** |
| **R2-6** | §〇 的 T1 12 min 改 14 min | `plan.md:25` 14 min，与 `:456` 一致；`:29` 合计 46 min 与 §八 自洽 | **已修** |

## 三、本次漏洞详情

### R3-1（P2）§二 风险与坑第 2 条的可选补测测不出 `setOriginalText(raw)`，照做会得到假绿

**证据**

- 原文（`plan.md:134`）：「若执行时有余量再补一拍：恢复态正文末尾打 1 个字符 → `Ctrl+S` → 读刚落盘的新文件字节，断言 `endsWith('\n')`（有 `setOriginalText` 时带尾换行、删掉则不带，这是真正的红/绿分界）」。
- 但落盘字节的尾换行不由 `originalText` 决定：同一处修复还会写 `rawTextRef.current = raw`（`plan.md:73`），而 `serializeBodyNow()` 取的是 `rawTextRef.current ?? originalText`（`src/App.tsx:2798`），`prepareSave()` 的 `normalized` 来自 `currentMarkdown()`（`:2817-2822`）。`raw` 以换行结尾 → `serializeDocument` 的 `applyTrailingNewlines(output, raw)` 已经把尾换行补回（`src/lib/serializeDocument.ts:32-37`、`:64`），所以 `normalized` **本来就以 `\n` 结尾**，`:2819` 那条 `originalText !== null && originalText.endsWith('\n')` 分支根本用不上。
- 结论：保留 `rawTextRef = raw`、删掉 `setOriginalText(raw)`，这段补测照样绿。`originalText` 真正影响的只有保存差异门（`src/App.tsx:2909`）、自动保存门（`:3179`）与那一行尾换行兜底；前两者在无句柄的恢复态都拿不到读数。
- 后果与 R2-5 想避免的正好相反：执行代理有余量时照做，会得到一条「已证明 `setOriginalText` 生效」的假绿并写进 impl.md，下一轮当已验证继承。

**修法**（二选一，都不改产品代码）

1. **删掉 `plan.md:134` 这条可选补测**（推荐）：只保留第 1 条（impl.md 写 UNVERIFIED、CHANGELOG 不承诺）。R2-5 要的就是「不测就不许写成测过」。
2. 若确实想留覆盖，断言要落在 `originalText` 真正控制的门上，例如：恢复一篇**带脚注定义**的文档（`seed: '正文。\n\n[^1]: 注。\n'`）→ `Ctrl+/` 在源码里删掉 `[^1]: 注。` → `Ctrl+S` → 断言出现 `[role="dialog"]`（`activeLosses` 的 footnote-loss 拦截，`src/lib/risk.ts:376-383` 的 `FOOTNOTE_DEFINITION` 分支）。保留 `setOriginalText` 时弹框，删掉时 `originalText===null` → 不弹。**注意**：这测的是「恢复态的脚注损失拦截」，不是「保存字节尾换行」，措辞要跟着改。

### R3-2（P2）README:114 的改写会把安装包预算与「以 Release 页为准」在同一段各说两次，并留下旧的「当前」数字

**证据**

- 现状 `README.md:114` 同一段已有：「安装包内部预算 **45,000,000 B** / 硬线 **50,000,000 B**（2026-11-17 第二次放宽，见 ADR-0017），最新发布资产 824,209 B（本机重建 824,595 B）；……」，并以「安装包、便携 zip 与 macOS zip 的字节和 SHA256 **见 Release 页的 `SHA256SUMS-0.32.1.txt`**。」收尾。
- 计划（`plan.md:293`）要写进去的新句子是：「安装包与便携 zip 的具体字节每版都变，**以 Release 页的 `SHA256SUMS-<版本>.txt` 为准**（本机预算内部 45,000,000 B / 硬线 50,000,000 B；第 45 轮 finder 用同样脚本实测 setup **1,303,397 B**、便携 zip **1,625,899 B**……）」。落下去之后：① 预算数字在同一段出现两次；② 「以 Release 页为准」与段尾那句重复；③ 「最新发布资产 824,209 B（本机重建 824,595 B）」和「第 45 轮实测 1,303,397 B」两个安装包大小的并排没有任何区分（一个 824 KB、一个 1.3 MB）；④ 计划把这段叫「不写死字节的说法」，却仍硬编码了两个字节数。这正是 S5 要治的「旧数字继续冒充现状」的同型问题。
- 另外 `plan.md:403`（§五 收尾 2）只写「把首屏『当前 292,681 B（第 44 轮…）』**补一句**第 45 轮增量」，没说要换掉「当前」这个旧总数——照做会出现「当前 292,681 B（第 44 轮）」+「第 45 轮 +X B」两个口径并存。

**修法**

1. 把 `plan.md:293` 的替换文本收成一句，去掉重复的线与来源：「安装包与便携 zip 的具体字节每版都不同，**以 Release 页的 `SHA256SUMS-<版本>.txt` 为准**；第 45 轮本机重建（未发布）setup **1,303,397 B**、便携 zip **1,625,899 B**，`release/` 已按 SHA256 还原」——不再写第二遍 45,000,000 / 50,000,000，也把「第 45 轮实测」明确标成「本机重建、未发布」，并删掉或合并段尾那句重复的「见 Release 页 …」。
2. `plan.md:403` 改成：把「当前 292,681 B（第 44 轮 `npm run verify` 实测，距硬线余 **27,319 B**、距内部预算余 17,319 B）」**整句替换**为本轮 `npm run verify` 的三个数字（实测值 / 距硬线余 / 距内部余），第 45 轮增量作为「第 44 轮 +X B」接在增量链末尾；若本轮 verify 交给根代理跑（`plan.md:398`），这三个数字写 UNVERIFIED 或等根代理回填，**不要在 README / AGENTS 里编数**。
3. `packaging/README.md:57` 同形状（它本来就带「0.32.1 实测 824,209 B（本机重建 824,595 B），第 39 轮……**1,300,711 B**……」），改写后同样只留一处「以 Release 页为准」，不要重复线。

## 四、revision 3 新增内容与关键事实复核（本轮实测 / 读码）

**基线与环境（全部本轮实测）**

- `git rev-parse HEAD` = `021cbd35…ccbb`；`git status --porcelain` 只有 `?? docs/iteration/round-45/`、`?? shots/round-45/`。
- 基线 grep 与计划一致：`raw: text` = 0、`original: initial.text` = 1（`:1034`）、`role=.presentation.` = **4**、`rail-backdrop`（App.tsx）= 1、`viewMode === 'edit' && (` = 0、`SectionIn` / `MUI_ICON` / `MUI_UNICON` / `Icon "` / `RMDir /r "$INSTDIR\www"` 全 0、`MUI_PAGE_COMPONENTS` = 1、`Section /o ` = 1、`1,300,711|1,622,355` = 2 行。
- 引号教训复现：`git grep -c 'role="presentation"'` → exit 1（PowerShell 把内层双引号吃掉，git 收到 `role=presentation`）；`-E 'role=.presentation.'` → 4。`git grep -c "Icon \""` → ParserError「字符串缺少终止符」、exit 1。计划 §三 H3 注与 §四 R2-4 注都属实。
- `release/`：`git check-ignore -v` → `.gitignore:10:release/`；`git ls-files release/` 空；三条 SHA256 与字节见 §二 R2-2。
- 产物：`dist` 97 文件 3,848,009 B、`host\bin` 载荷五件齐、`packaging\sidelight.ico` 23,724 B、`.tmp\nsis\nsis-3.11\makensis.exe`、`.tmp/e2e-r45-{bug-d,ui-5,ui-6,ui-7,install}` 全在（E2E 脚本可在原端口/原路径基础上改）。

**T1（恢复态不再误判脏）**

- 计划 §二 的四处代码引用逐条对上：`initial` 在 `App.tsx:458-487`，其中 `text: footnoteSplit.body`（`:472-476`）、无 `raw`；载入 effect `:1026-1044`（`original: initial.text`，`:1034`）；`rawTextRef` `:628`；源码分派 `:3915-3920`；脏判定 `:1885-1892`。
- `serializeDocument` 的 `leading` 取 `splitFrontmatter(original).body` 的开头换行（`serializeDocument.ts:59-61`）、尾换行取 `trailingNewlines(original)`（`:23-37`、`:64`）。把 `original` 从 `initial.text`（body）换成 `raw`（整串）后 leading 不变；尾换行在无脚注文档上不变，在**有脚注定义**的文档上更好：`extractFootnotes` 的 `body = lines.slice(0, bodyEnd)` 不带文末换行（`footnotes.ts:62-73`），旧基线按它补 0 个换行，源码框（`joinFootnotes` 拼回的定义块带换行，`:76-79`）与基线差一个尾换行——换 `raw` 后基线补 1 个，恢复态脚注文档也不再差这一字节。空首启 `raw='' → null` 与今天逐字节等价（`serializeDocument.ts:32-33`）。
- 计划 §二 风险与坑「不要用 body 当 raw」属实：`switchView` 在 `rawTextRef !== null` 时直接显示它（`:3915-3920`），而 `applySource` 会把 `frontmatter` 置空（`:3872-3879`）；I5 第 5 步「源码框 === localStorage.text」与「前 3 行」两条正是唯一能抓这个误用的断言。
- 恢复后「保存差异门」不会凭空弹框：无脚注定义时 `activeLosses` 早退（`risk.ts:376-378`）；有脚注定义的文档序列化会把定义拼回（`serializeDocument.ts:58` + `footnotes.ts:76-79`），`classify` 不会报 footnote-loss。

**T2（批注三处可见性）**

- 遮罩 `App.tsx:5194-5195`（`button` + `aria-label`）、开关 `:4639-4651`（无条件 + `aria-controls="margin-rail"`）、编辑分支才渲染 `MarginRail` `:5037-5095`、`closeRail` `:740-743`、Esc `:3579-3582`、`openRail` `:745-749`、窄窗自动开抽屉 `:1556` 全部一致。
- `button:hover:not(:disabled)`（`styles.css:137-140`，0,2,1）压过 `.rail-backdrop`（`:2504-2512`，0,1,0）属实；`.rail-backdrop` 的 `background: rgba(18,20,22,0.32)` 在 `@media (max-width:1119px)` 里、无深色覆盖 → E1/E4 的计算背景断言成立。`.app.rail-open` 的规则只动抽屉（`:2514-2544`），不动 `.doc-column` → E1 的 `.doc-column` innerText 等长断言成立。
- `.note-diff` flex+wrap（`:1032-1041`）、`.diff-arrow` 无 margin（`:1049-1051`）、JSX 三个 span 之间无文本节点（`MarginRail.tsx:124-129`）→ 改 `display:block` 后补 `margin: 0 4px` 是**必需**（不是美化）。
- `Ctrl+Shift+P` / `Ctrl+/` 都在 window keydown，`key = event.key.toLowerCase()`（`:3559`、`:3733-3737`、`:3755-3759`）→ E5/E6 在遮罩盖住工具栏时用键盘切视图成立。预览态 `.doc-column.preview-column` 与 `.preview-pane` 都在（`PreviewPane.tsx:77-83`）→ E5 的正文口径成立。
- `Ctrl+K`（bug F2）、ui F1/F2 等本轮不做项的代码依据（`src/App.tsx:1946-1958`、`src/styles.css:802-811`/`:953-963`）与第 1 次审查一致，未变化。

**T3（安装器）**

- `installer.nsi:22` 是 `!endif`、`:42-46` 页面宏、`:94` 主节、`:120` `do_copy:`、`:127` `..\packaging\sidelight.ico`、`:130-131` `SetOutPath`+`File /r` 无清理、`:151` `Section /o`、`:187` `RMDir /r "$INSTDIR"`（不命中 `\www` 模式）——全部与计划一致。
- `installer.ps1:52-57` 的 `-AssocDryRun` 只传 `/DASSOC_DRYRUN /DOUTFILE=..\.tmp\assoc-dryrun-setup.exe`；`:8` 的 `New-Item release` 只建目录；`:60` 用 `Push-Location $root` + `packaging\installer.nsi` 调 makensis，相对路径按脚本目录解析（现状 `..\host\bin\...` 能构建就是证明）→ 图标写 `..\packaging\sidelight.ico` 正确。
- `verify-installer.ps1:203-214` 只数 7 个正则（10/4/0/≥1/0/1/1）；`SectionIn RO` / `MUI_ICON` / `MUI_UNICON` / `Icon "..."` / `RMDir /r "$INSTDIR\www"` 都不命中 → 静态断言不会被改坏。
- 安装探针只硬编码 `$setup`（`:4`）与 `$dir`（`:5`），其余按运行时算 `dist` 文件数/字节（`:19-20`）、自带 `$env:TEMP` 重定向（`:6-8`）→ 改两处即可验证 S1，且改前对照（`staleChunkStillThere=True`）有 finder 输出。

**§〇/§八 时间与计数**

- T1 14 + T2 11 + T3 12 + 收尾 4 + 门禁 5 = 46 min，§〇 与 §八 一致；§六 14 行（含新增 F6 行），与 §一 的「26 条全部有归属」自洽。

## 五、硬约束、可行性与时间

- **无 P0/P1 级方案问题**。三条都不违硬约束：Tiptap 不换、T1 的 `roundtrip` 已列门禁（`plan.md:395`）、批注协议不动、首屏增量 ±200 B 量级（当前 292,681 B，余 27,319 B，`verify` 已列门禁）、无新运行时依赖、不动 `release/`、不 bump `package.json`。
- 与最近改动不冲突：`git log -8` 里第 44 轮改的是 `taskListInput.ts` / 打印块 / `ai.ts` / 工具栏 title，与本轮 `App.tsx` 载入链、`.note-diff`、`installer.nsi` 不交叉。
- 时间仍 ≈46 min，超 `roles/planner.md:25` 的 35 min；本轮 rev 3 没有新增工作量（R2-1 进 §六＝0 min、R2-5 走 UNVERIFIED＝0 min）。3 个任务已是下限，§八 的砍单顺序只砍验证广度、主断言（I5、E1/E2、S1/S2）不砍，与第 1/2 次审查结论一致，不单列漏洞。
- 唯一与时间相关的提醒（不单列漏洞）：若 `npm run verify` 因并发构建改由根代理跑（`plan.md:398`），收尾文档的首屏数字按 R3-2 第 2 条写 UNVERIFIED，别编数。

## 六、复核方式（可重跑）

- 计划点到的文件逐个用 `read` 打开核对（清单见本文首），不只看计划文字；`.tmp/e2e-r45-ui-7.mjs:21` 的选择器、`.tmp/e2e-r45-ui-6.mjs` 的 23/24 行、`.tmp/e2e-r45-install.ps1:4-5` 的硬编码都现场核对。
- 实测命令：`git rev-parse HEAD`、`git status --porcelain`、`git check-ignore -v release/SHA256SUMS.txt`、`git ls-files release/`、`Get-FileHash` / `Get-Item`（三条 `release/` 文件）、`git grep -c/-nE` 全套基线（含 R2-4 的两条引号变体）、`Get-ChildItem dist/host\bin`、`Test-Path .tmp` 产物。
- **没有跑任何 E2E、没有点浏览器、没有改产品代码、没有 commit、没有写 `release/`。**
