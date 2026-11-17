# 第 46 轮 · 计划审查（critic，只读）

> 本文件含**两轮**审查：第 1 轮针对 `plan.md` revision 1（R1–R6，见下）；第 2 轮复审针对 revision 2（见文末「复审（revision 2）」）。**当前结论以文末那条为准：REVISE（2 P1 + 1 P2）。**

- 轮次：`round=46`、`nn=46`；轮前 `startSha=39e4f0211f43b7edaca82d468d0997f029151e3c`（本轮实测 `git rev-parse HEAD` 同值；工作树只有未跟踪的 `docs/iteration/round-46/`、`shots/round-46/`）。
- 输入：`plan.md`（544 行全读）、`findings-{ship,ui,bug,code,typora}.md`、`AGENTS.md`、`docs/CHANGELOG.md`、`docs/iteration/round-45/plan.md`，以及计划点到的全部源码/脚本。
- **实际打开核对的文件**（不是只看计划文字）：`packaging/installer.nsi`、`packaging/installer.ps1`、`packaging/portable.ps1`、`packaging/verify-installer.ps1`、`host/Program.cs`（`:27-28`、`:90-91`、`:1371-1419`、`:1903-1942`）、`src/lib/mermaidLazy.ts`（全文 146 行）、`src/lib/mermaidPreview.ts`（全文 126 行）、`src/lib/mermaidLazy.test.ts`（全文 168 行）、`src/App.tsx`（`:372-401`、`:700-744`、`:1920-1990`、`:5050-5089`）、`src/components/MarginRail.tsx`（全文 276 行）、`src/components/SettingsDialog.tsx:30-74`、`src/styles.css`（`:258-274`、`:762-881`、`:930-963`、`:2440-2549`）、`README.md:114/:133/:171`、`packaging/README.md:57`、`AGENTS.md:39/:72`、`docs/CHANGELOG.md:5/:171/:179`。
- 只读：未改产品代码、未跑 E2E（`npm test` / `npm run verify` / 安装包探针全部留给 implementer）、未 commit / push、未碰 `release/`。
- 环境：dev server 5175 与 CDP 9222 **未使用**（纯静态审查 + 一次只读 PowerShell 读版本/哈希/行号）。

## 〇、结论：**REVISE**

计划的骨架扎实：三个任务都命中了本轮最该做的条目，绝大多数 `文件:行号` 与实测值经我复核**准确**（见 §一）。但有 **2 条 P1** 会让执行代理按计划改完仍不达标或把真回归误判成环境噪声，必须先补进计划：

| # | 级别 | 任务 | 一句话 |
| :-- | :-- | :-- | :-- |
| R1 | **P1** | T3 | `configure()` 永远只被调用一次（`ensureMermaid()` 在 `mermaid` 已加载时提前返回），按计划改完**切主题仍用旧主题**，还会把浅色 SVG 缓存进 `dark|hash` 键 |
| R2 | **P1** | T1 | 卸载清单漏了 `$INSTDIR\state`（宿主 state 目录第三顺位，`Main` 在 WebView 初始化**之前**就建），S5 定向跑必然造出它 → `verify-installer.ps1:184-189` 变 `FAIL 卸载残留`，而计划把同类 FAIL 预先归为「环境 FAIL」 |
| R3 | P2 | T3 | 缓存键写的是「存的时候再取一次 `mermaidTheme()`」，await 期间切主题会把浅色 SVG 存进深色键（要进函数时取一次 const） |
| R4 | P2 | T3 | 验收里 `git grep -c "resolveMermaidTheme" -- src/lib/mermaidLazy.ts` 期望「1 处」写错（定义 + `mermaidTheme()` 里调用 ≥2 行），正确实现会被判红 |
| R5 | P2 | T1 | `verify-installer.ps1` 的 `-Setup` 用 `[IO.Path]::GetFullPath($Setup)`，相对路径按进程 CWD 解析，不从 `$root` 解析 |
| R6 | P2 | T2 | 卡片 `floor` 从 `-Infinity` 改成 `flowBottom` 后，**「模拟提示是否被盖住」的断言必须用几何（`notice.bottom <= card0.top`）**；`elementFromPoint` 会被本任务自己加的 `pointer-events:none` 弄成假绿 |

修法都很小（R1/R2 各一行代码 + 一条断言），不推翻方案。改完可以 PASS。

## 一、逐条核对通过的部分（我实际验过的）

| 计划主张 | 核对结果 |
| :--- | :--- |
| 5 份 findings 合计 27 条 actionable，5 进 T1、F1 进 T2、F2 进 T3、其余 20 条进 §六 | ✅ 对得上（bug 1 / typora 9 / ship 5 / code 3 / ui 9） |
| `installer.nsi:48` 目录页、`:196` `RMDir /r "$INSTDIR"`、`:129-141` 9 文件 + `www`、`:193-205` 卸载段 | ✅ 与源码逐行一致；`RMDir /r "$INSTDIR"` 全文件只 1 处 |
| 计划给的卸载替代块「`Delete "$INSTDIR` 11 条」 | ✅ 数得出 11 条（exe、Core、WinForms、Loader、config、ico、README.txt、LICENSE、assoc-plan.txt、host.log*、uninstall.exe）；`RMDir "$INSTDIR"` 非递归 1 条也与静态断言对得上 |
| `installer.ps1:81-87` 只断言 setup 的 FileVersion，payload 无断言 | ✅ 源码如此；`:26` 之后插入 payload 门的落点正确（`$version` 在 `:9` 已定义） |
| `portable.ps1:13/:18-30`、版本只用于文件名 | ✅ 一致；插入点 `:30` 之后可用 `$bin`（`:9`） |
| `verify-installer.ps1:21` 默认验 `release/`、`:75-77` 无 try/catch、`:196-197` 依赖 marker、`:239` 才删 marker、`Unverified()` 定义在 `:33` | ✅ 全部准确；`param()` 放在 `:6`（注释块之后）合法；三个 workflow 里**没有**调用 `verify-installer.ps1`（`grep` 0 命中），加参数不会动 CI |
| `release/` 基线三份 SHA256 与「旧包 824,595 B / FileVersion 0.31.1.0」 | ✅ 实测逐条相同：`6C93F58D…`、`F4210C62…`、`2F32C26A…`，824,595 B，`0.31.1.0` |
| `host\bin\Sidelight.exe` 的 FileVersion 与 `package.json` 都是 0.32.1 | ✅ 实测 `0.32.1` / `0.32.1.0`，所以 S3 的绿例子成立 |
| `README.md:114` 与 `packaging/README.md:57` 各写死 1,304,634 | ✅ 两处都命中（`README.md:114` 的 `has634=True`、`has596=False`），`git grep -n "1,304,634"` 改前 2 是正确基线 |
| T2 的四处落点：`App.tsx:384`（`tops` 状态旁）、`:1951-1990` useLayoutEffect、`:5064-5111` 传参、`MarginRail.tsx:242` 之前、`styles.css:802-811` sticky + `:813/:843` 内部块、`:953-963` 卡片 absolute、`:2450-2549` 媒体查询 + `:2527-2531` 抽屉卡片静态 | ✅ 全部命中；`MarginRail` 里 `pending`（`:60`）、`aria-expanded`（`:247`）、`.rail-overall-head/body` 都存在，加 `railSpace` prop 与 spacer 不冲突 |
| T2 的 `.margin-rail` = `position: relative; min-height: 100%`（`styles.css:795-800`），spacer 走文档流可行；`.rail-overall` 有 `margin-top: 12px`，所以「面板在卡下方」天然有 12 px 余量 | ✅ 可行；`bottom: 0` 的 sticky 只在自然位置落到视口底以下才上顶，正好覆盖「卡把面板推下去」的场景，计划对「滚动中仍可能盖一瞬」的坦白是准确的 |
| T3 的根因：`:29` 一次性 `initialized`、`:51-55` 只认 `data-theme === 'dark'`、`:31`/`:92-100` 只按 hash 缓存、`App.tsx:721-724` 只改属性、`SettingsDialog.tsx:62` 预览也直接改属性 | ✅ 全部准确 |
| T3 的 `resolveMermaidTheme` 与 CSS 真值一致：`styles.css:36`（`[data-theme='dark']`）+ `:65-66`（`@media (prefers-color-scheme: dark)` 且 `:not([data-theme='light']):not([data-theme='dark'])`） | ✅ 「`system` 跟随系统」不是新增语义，mermaid 只是跟上 CSS 已有的行为，方案方向对 |
| T3 不新增运行时依赖、mermaid 仍不进首屏（`mermaidLazy.ts` 只有 shim，真包在 `mermaidLoader` 动态 chunk） | ✅ 硬约束无冲突；首屏只多插件里的十几行，余量 27,293 B 足够 |
| `mermaidLazy.test.ts` 现有 8 条用例，加 4 条 `resolveMermaidTheme` 不动文件数（`npm test` 仍 29 个文件） | ✅ 用例可直接沿用现有 `node:test` 风格 |
| 第 45 轮 §六 的两条承诺确实写着「下轮第一项 / 独立一轮」（`round-45/plan.md:423`、`:428`） | ✅ 基本属实（`:428` 的原文是「独立一轮」，不是「下轮第一项」——计划 §一 的措辞略有出入，不影响排序） |
| CHANGELOG 落点 `:5` 未发版区间、`:171` 第 45 轮小节；AGENTS `:39`/`:72`、README `:133`/`:171` | ✅ 行号都对得上（AGENTS.md 只有 118 行，计划 §五 写的「`:171` 的 29 个测试文件」指的是 **README.md:171**，建议写成 `README.md:171` 免得执行代理去 AGENTS 找） |
| dev server / CDP / reset / 不碰 `release/` / BOM 复查 / 含 `"` 用 `Select-String -SimpleMatch` 等环境约束 | ✅ 与 AGENTS §8、`common.md` 一致 |

## 二、漏洞与修法（按严重度）

### R1（P1，T3）：计划改完，Mermaid 仍然不会换主题

**证据**：`src/lib/mermaidLazy.ts:68-70`

```ts
export function ensureMermaid(): Promise<void> {
  if (mermaid) return Promise.resolve()          // ← 已加载就直接返回
  ...
  mermaid = module.mermaid
  configure(mermaid)                             // 只在首次加载后调用一次
```

`configure()` 的**唯一**调用点是 `ensureMermaid()` 的首次加载分支。计划 §四.1 第 3 条只改 `configure()` 内部的守卫（`appliedTheme`），**没有给 `configure()` 增加任何新的调用路径**；而 `renderDiagram()` 在缓存未命中时走的是 `await ensureMermaid()`（`:94`），`mermaid` 早已非空 → 直接返回 → `configure()` 不再执行 → `module.initialize({ theme })` 不会用新主题重跑。

后果有两层：
1. 切深色后 `renderDiagram()` 用旧（浅色）主题渲染，返回的 SVG 依旧是 `rgb(51,51,51)`，计划的验收第 2 条（`edgeStroke !== 浅色值`）直接红。
2. 更糟：这个浅色 SVG 会被存进 **`dark|hash`** 键（因为计划把缓存键改成按主题分），于是**切回浅色再切深色都不会再重渲染**——把一次性 BUG 变成持久化 BUG。

**修法**（两处，共 2 行）：

```ts
// mermaidLazy.ts:68 起
export function ensureMermaid(): Promise<void> {
  if (mermaid) { configure(mermaid); return Promise.resolve() }   // ← 加这半句
  ...
```

并把这条写进 §四「改动文件与函数」和验收：例如 `mermaidLazy.test.ts` 加一条「同一 module 连续 `renderDiagram` 两次后 `fake.inits.length === 1`」（现状语义不变），主题切换的证明交给 E2E 第 2 条。同时在 §四 风险里加一句：「`ensureMermaid()` 的早退是这条任务的隐藏前提，不改它整条任务无效」。

### R2（P1，T1）：卸载清单漏 `$INSTDIR\state`，S5 定向跑会把它变成假「环境 FAIL」

**证据**：宿主在 `Main`（`host/Program.cs:91`）就调 `InitState()` → `ResolveStateDir()`（`:1903-1928`），三顺位是：

```
%LOCALAPPDATA%\Sidelight   →   baseDir\state   →   %TEMP%\Sidelight
   （:1917）                    （:1920）            （:1925）
```

**`baseDir\state` 是第二顺位、不是最后兜底**。`TryWritable()` 会 `Directory.CreateDirectory` + 写探针文件（`:1931-1942`），所以只要 `%LOCALAPPDATA%\Sidelight` 不可写，宿主**必定**把 `$INSTDIR\state` 建出来。`InitState()` 又在 WebView 初始化**之前**跑，所以「WebView2 起不来、进程随即退出」不影响它落在盘上。

这会直接打在计划自己的验收上：

- 本机真实 `%LOCALAPPDATA%` 不可写（`findings-ship.md:4` 实测 `Access denied`）→ 一旦 S5 的 try/catch 让 `verify-installer.ps1:77` 不再硬退出，脚本 `:119` 启动 `Sidelight.exe` 时就会在 `$instdir\state` 建目录（空目录，探针文件已被删）；
- 计划 §二 第 6 步的 S5 定向跑把 `$env:LOCALAPPDATA` 指到「同名文件」的假目录（第一顺位必失败）→ 第二顺位 `$INSTDIR\state` 必然命中（`TEMP` 顺位排在它后面，不会是落点）。

新的卸载块删完 11 个文件 + `www` + `webview2-data` 后，`$INSTDIR\state` 还在 → `RMDir "$INSTDIR"`（非递归）**静默失败**，目录留着 → `verify-installer.ps1:184-189` 打印 `FAIL 卸载残留`。而计划 §二 已预先说「后续 WebView2 起不来的 FAIL 记环境 FAIL，不算本轮回归」——**一个真回归会被这句话吞掉**，还恰好落在本轮最想证明「卸载只删自己写的」的那次运行里。

**修法**（3 处，成本一次重编）：

1. 卸载块加一行（放在 `RMDir /r "$INSTDIR\webview2-data"` 后面）：
   ```nsis
   RMDir /r "$INSTDIR\state"
   ```
   静态断言同步改：`Delete "$INSTDIR` 仍是 11，另加一条 `Select-String -Path packaging\installer.nsi -Pattern 'RMDir /r "$INSTDIR\state"' -SimpleMatch` → 改后 1。
2. A 段探针多放两个「宿主写的」文件：`state\recent.json`、`host.log.1`，并断言 `stateGone=True`、`logGone=True`（后者覆盖 `host.log*` 通配）。
3. §二 风险里补一句：`verify-installer.ps1` 的「卸载残留」FAIL **不能**归为环境——只有 `0x8000FFFF` 那条才算。

### R3（P2，T3）：缓存键要在函数入口取一次主题

计划 §四.1 第 4 条字面写「缓存键改 `${mermaidTheme()}|${hash}`（`:90-100`）」。`renderDiagram()` 是 `async`，`svgCache.get(...)` 在 `await ensureMermaid()` 之前、`svgCache.set(...)` 在 `mermaid.render()` 之后（`:90`、`:100`）。两处各自调用 `mermaidTheme()`，若在 `await` 期间用户切了主题，**浅色 SVG 会存进深色键**（同一个键再也不失效）。

修法：`const theme = mermaidTheme()` 放在 `:90` 之前并全程复用；`mermaidPreview.build()` 里的 `renderKey` 同理，一次算好往下传。另建议计划把「`applyContent()`、`refreshLivePreviews()`、`runRender()`、`scheduleRender()` 的签名一起改成收 `renderKey`」写出来——现在只写了「全用 renderKey」，这四个函数目前都收 `hash`（`mermaidPreview.ts:23`、`:42`、`:48`、`:58`），漏改一个就会「缓存清了但 widget 不刷新」。

### R4（P2，T3）：验收的 `git grep -c` 期望值写错，会把正确实现判成红

计划 §四 验收：`git grep -c "resolveMermaidTheme" -- src  # 改后 mermaidLazy.ts 1 处 + mermaidLazy.test.ts ≥5 行`。

按计划自己的设计，`mermaidLazy.ts` 至少 2 行命中（`export function resolveMermaidTheme` 定义 1 行 + `mermaidTheme()` 里 `return resolveMermaidTheme(...)` 1 行），`git grep -c` 数的是**行**不是出现次数。写成「1 处」会让执行代理在 2 面前二选一：要么怀疑改动错了，要么把纯函数硬编码进 `mermaidTheme()`（丢掉可测性）。

修法：改成 `# 改后 mermaidLazy.ts >=2 行 + mermaidLazy.test.ts >=5 行`，或直接写「以 `npm test` 新增 4 条用例全过为准，`git grep` 只作附证」。

### R5（P2，T1）：`-Setup` 相对路径按 CWD 解析

计划 §二.4 的 `$setup = if ($Setup) { [IO.Path]::GetFullPath($Setup) } else { ... }`：`GetFullPath` 对相对路径用的是**进程当前目录**，不是 `$root`。计划第 7 步的示例命令恰好从仓库根跑所以能过，但 `packaging/*.ps1` 其余脚本都是以 `$root` 为基准的（`installer.ps1:7`），一旦在别的 CWD 跑就会得到「缺少安装包」的假红。

修法：`if ([IO.Path]::IsPathRooted($Setup)) { $setup = $Setup } else { $setup = Join-Path $root $Setup }`。

### R6（P2，T2）：「提示不被盖住」必须用几何，不能用命中测试

计划的验收第 3 条是 `noticeCoveredByCard0 <= 0` 且「`notice` 中心 `elementFromPoint` 落在 `.rail-notice-mock` 内」。第一条没问题；第二条会被本任务自己加的 `.rail-overall { pointer-events: none }`（§三.3）弄成**假绿**：面板即使仍压在提示上，`elementFromPoint` 也会穿过它命中提示。

计划第 2 条已要求「几何优先：`max(card.bottom) <= panel.top`」，但没有把同一口径写进提示这一条。修法：第 3 条改成「`notice.bottom <= panel.top` 且 `notice.bottom <= card0.top`（几何为主）」，`elementFromPoint` 只作诊断打印；卡 0 的按钮也照此办理（`blockedButtonsTotal` 打印、`maxCardBottom <= panelTop` 才是门）。

## 三、时间预算（35 min）

计划的 13 + 9 + 10 + 2 + 3 = 35 是**上限贴着上限**，第 45 轮实际 46 min 已被上一轮 plan-review 点过。T1 的 13 min 里塞了：写一个 ASCII-only PowerShell 探针（两段安装→卸载，每段至少 2 次 `WaitForExit` + 最多 20 s 等待）、改 4 个文件 + 2 份文档、重编一次 NSIS、S3 红/绿各一次、S2 两个干跑、S5 一次定向跑（内含 30 s 应用探活 + 30 s 卸载等待）。**任何一次探针写错就是 3–4 min 往返。**

建议在 §八 砍单表里把顺序改成：**① S5 定向跑（最贵、最可能被 R2 打断）→ ② T2 深色截图 → ③ T1 B 段 → ④ T3 切回浅色**，并把「A 段探针脚本先写完、先用未改动包跑出红基线」写死为第 0 步（计划已有此意，但排在「改文件」之前才有效）。做完 R1/R2 的修法后时间不变（都是一两行）。

## 四、UNVERIFIED（我只读，没跑）

1. 探针在**本机**能否静默装/卸（`%LOCALAPPDATA%` 不可写、HKCU 写入被吞）：未跑，按第 45 轮 `.tmp/e2e-r45-install.ps1` 的先例判可行，但 R2 的 `state` 行为是**读源码推出来的**，没在盘上复现。
2. T2 改后的真实几何（卡片下移多少、面板落点、抽屉里是否还有 28 px 裁切）：未跑 E2E，计划自己给的读数来自 finder，我只核了 CSS/DOM 结构。
3. T3 的深色对比度读数（1.31:1）与 `previewCount`、`svg` 数量：未跑 E2E，按 `findings-ui.md` 的截图与读数为准。
4. 首屏 gzip 加 T2/T3 代码后的实际增量：未跑 `npm run verify`（会重写 `dist/`，按计划交给 implementer 串行跑）。

---

# 复审（revision 2）

- 输入：`plan.md` **revision 2 全文 633 行**（上一版 544 行，重读全文，不以 revision 1 的结论代替）、`findings-{ship,ui,bug,code,typora}.md`、`AGENTS.md`、`docs/CHANGELOG.md`、`README.md`、`packaging/README.md`、`docs/iteration/round-45/plan.md`，以及计划点到的全部源码与脚本。
- **本轮实际打开核对的源码/脚本**：`src/lib/mermaidLazy.ts`（全文 146 行）、`src/lib/mermaidPreview.ts`（全文 126 行）、`src/lib/mermaidLazy.test.ts`（全文 168 行）、`src/App.tsx`（`:360-420`、`:706-760`、`:1900-2000`、`:4970-5000`、`:5040-5130`、`:5140-5220`）、`src/components/MarginRail.tsx`（全文 276 行）、`src/styles.css`（`:117-123`、`:241-274`、`:795-811`、`:813-847`、`:905-974`、`:1520-1533`、`:2442-2549`）、`src/components/SettingsDialog.tsx`（`:62` 引用核对）、`host/Program.cs`（`:27-28`、`:90-91`、`:131/156`、`:1404`、`:1519-1530`、`:1428-1460`、`:1890-1947`、`:2009-2046`）、`packaging/installer.nsi`（全文 205 行）、`packaging/installer.ps1`（全文 130 行）、`packaging/portable.ps1`（全文 78 行）、`packaging/verify-installer.ps1`（全文 246 行）、`packaging/README.md`、`.github/workflows/ci.yml`（`:14-187`）、`.github/workflows/release.yml`（`:90-124`）、`.tmp/reset.mjs`（全文 62 行）、`.tmp/e2e-r46-ui-4.mjs`（全文 146 行）、`.tmp/e2e-r46-ui-main.mjs`（`:1-40`、`:183-235`）、`.tmp/e2e-r46-ui-3.mjs`（`:1-30`、`:105-125`）、`.tmp/r46-ui-4-log.txt`、`scripts/demo-folder.mjs`。
- 只读：未改产品代码、未跑 E2E / `npm test` / `npm run verify` / 安装包探针，未 commit / push，未碰 `release/`。只做了只读命令核对基线（`git rev-parse` / `git grep` / `Test-Path` / 读 exe 版本与 `release/` 旧包元数据）。
- 环境：dev server 5175 与 CDP 9222 **未使用**（本轮是静态审查 + 只读命令）。

## 〇、复审结论：**REVISE**（2 P1 + 1 P2）

revision 2 把上一版 R1–R6 **逐条真修了**（逐条对上源码行，见下一节「一、上一版漏洞是否真修掉」），任务集合、级别、范围都没变，时间也没膨胀。但复审在 **T2 的验收几何** 与 **T2 的验收脚本** 上各找到一条 P1，T1 找到一条 P2：

| id | 级别 | 任务 | 一句话 |
| :-- | :-- | :-- | :-- |
| **V2-R1** | **P1** | T2 | 验收第 1 条门 `maxCardBottom <= panel.top - 0.5` **在 1440×900 上数学不可满足**：面板 `sticky; bottom: 0` 会钉在 `.doc-scroll` 底边 872 上方（`872 − 93 = 779`），而修复后最后一张卡底 ≈ **796**。间距只有 76 px、面板高 93 px，**没有任何 spacer 取值能同时让面板「低于末卡」又「不越出滚动口」**。执行代理会撞一条永远红的门，并且末卡底部 17 px（正是三个按钮，22 px 高）仍被面板头盖住 |
| **V2-R2** | **P1** | T2 | 「直接复制 `.tmp/e2e-r46-ui-4.mjs`，**只改三处**」不成立：`ui-4` 没有 `page.goto`、也没有播种文档（它只 attach 在 finder 前一段脚本留下的页面）。`node .tmp/reset.mjs 9222` 之后 `context.pages()` 里没有 localhost 页面（`reset.mjs:58` 关掉自己开的页），`ui-4:22` 的第一次 `click` 直接 30 s 超时；就算补上 goto，没有 RICH 文本 → `cardCount 0`，全部几何门空转 |
| **V2-R3** | P2 | T1 | 卸载块里的 `RMDir /r "$INSTDIR\state"` 会**递归删掉用户自己的 `state\` 目录**：正常机器（`%LOCALAPPDATA%` 可写）宿主根本不在 `$INSTDIR` 建 state，只有「用户从目录页指到已有目录 + 该目录里本来有 `state\`」才命中。与 T1 自己「只删自己写的文件」的承诺不一致，改成 `Delete "$INSTDIR\state\recent.json*"` + 非递归 `RMDir` 即可 |

## 一、上一版漏洞是否真修掉（逐条对源码）

| 上一版 | 计划里的落点（revision 2） | 源码核对 | 判定 |
| :-- | :-- | :-- | :-- |
| **R1（P1，T3）** `configure()` 无重初始化路径 | `plan.md:398-406`（早退分支改成 `if (mermaid) { configure(mermaid); return Promise.resolve() }`）、`:481`（现有「只加载一次」用例末尾加 `fake.inits.length === 1`）、`:501`（`git grep -c "configure(mermaid)"` 改前 **1** → 改后 **2**）、`:520`（写进「隐藏前提」风险） | `mermaidLazy.ts:68-69` 早退现状、`:76` 唯一调用点、`:57-58` `if (initialized) return`；`mermaidLazy.test.ts:21-40` 的 `fake` **确实有 `inits`**（`:23`/`:29-31`），`:67-78` 的用例末尾可加断言；`__resetForTest`（`:130-138`）需补 `appliedTheme`，计划 `:450` 已写 | ✅ **真修**（一行代码 + 一行断言 + 一条静态断言；Node 下 `mermaidTheme()` 恒 `default`，`inits` 仍为 1，不误伤「连续渲染只初始化一次」） |
| **R2（P1，T1）** 卸载漏 `$INSTDIR\state` | `plan.md:90-91`（卸载块 `RMDir /r "$INSTDIR\state"`）、`:106`（写明第二顺位）、`:178`（静态基线 0→1）、`:188`（A 段探针加 `state\recent.json` + `host.log.1`，断言 `stateGone`/`logGone`）、`:199`/`:253`（只有 `装后程序没起来` 能归环境） | `host/Program.cs:91` `InitState()` 在 WebView 之前、`:1917`（LOCALAPPDATA）→ `:1920`（`baseDir\state`，**第二顺位**）→ `:1925`（TEMP）、`:1931-1942` 建目录+写探针；`installer.nsi:129-140` 载荷 8 文件 + `www`、`:142` `uninstall.exe`、`:196` 递归删 | ✅ **真修**（新增 1 行 + 2 个探针文件 + 1 条静态断言；A 段忘掉该行时 `stateGone=False` 的红也能显形，计划 `:244` 已把「改前 `stateGone=True` 是递归删的副产品」写清） |
| **R3（P2，T3）** 缓存键时点 | `plan.md:434-449`（入口取 `themeAtEntry` 供读、`await ensureMermaid()` 之后再取一次供写）、`:451-472`（`build` 一次算 `renderKey`，`applyContent/refreshLivePreviews/runRender/scheduleRender/makePreview` 逐个写清 + widget `key` 改 `mermaid-${renderKey}`） | `mermaidPreview.ts:23/42/48/58/72` 五个函数确实都收 `hash`；`:90-94` 装饰 key 是 `mermaid-${pos}:${hash}`；`:113-116` `apply` 现状 | ✅ **真修** |
| **R4（P2，T3）** `resolveMermaidTheme` 计数 | `plan.md:500`（`>=2` 行 + `>=5` 行，注明「数的是行」） | 定义 1 行 + `mermaidTheme()` 里 1 行调用 = 2 行 | ✅ **真修** |
| **R5（P2，T1）** `-Setup` 按 CWD 解析 | `plan.md:128`（`[IO.Path]::IsPathRooted($Setup)` → `Join-Path $root $Setup`） | `verify-installer.ps1:19-21` 现状是 `Join-Path $root 'release\...'`；`param()` 放 `:6`（注释块之后）合法 | ✅ **真修** |
| **R6（P2，T2）** 提示被盖用几何判 | `plan.md:324`（写清 `pointer-events` 会让命中测试失真，只作诊断）、`:352-357`（门 = `maxCardBottom <= panelTop - 0.5`、`notice.bottom <= panel.top/card0.top`，命中与 overlap 只打印） | `styles.css:802-811` sticky 现状、`:953-963` 卡片 absolute；`MarginRail.tsx:242` 面板位置、`:60` `pending`、`:247` `aria-expanded` | ✅ **真修**（口径写清了；见 V2-R1——门 1 的**取值**不对，不是口径问题） |

## 二、复审确认无误的部分（我逐条验过）

| 计划主张 | 核对结果 |
| :-- | :-- |
| 5 份 findings 仍 27 条（bug 1 / typora 9 / ship 5 / code 3 / ui 9），7 条进任务、20 条进 §六 | ✅ `findings-ship.md:9-16` 的 S1–S5 + U1、`findings-ui.md` F1–F9、`findings-typora.md` §2–§10 九条、`findings-bug.md` F1、`findings-code.md` F1–F3 逐份对得上；§六 表 20 行不多不少 |
| 卸载替代块「`Delete "$INSTDIR` 11 条 + 非递归 `RMDir` 1 条」 | ✅ 数得出 11 条（8 载荷 + `assoc-plan.txt` + `host.log*` + `uninstall.exe`）；基线实测 `RMDir /r "$INSTDIR"`=**1**、`Delete "$INSTDIR`=**0**、`RMDir /r "$INSTDIR\state"`=**0**、`param([string]$Setup`=**0**、`payloadVersion`=**0**、`markerWritten`=**0**，与 `plan.md:176-179` 完全一致 |
| 卸载清单覆盖宿主全部落盘物 | ✅ `host/Program.cs:28`（`host.log`，另有 `recent.json.bad-*`/`.sidelight-tmp-*` 在 state 内）、`:1404`（`webview2-data`）、`:1920`（`state`）；`www` 由 `installer.nsi:139-140` 写入 |
| `release/` 旧包与 payload 版本（S2/S3 的依据） | ✅ 实测 setup `824,595 B`、`FileVersion=0.31.1.0`、mtime `2026-11-16 22:21:32`；`host\bin\Sidelight.exe` = `0.32.1.0`，`package.json` = `0.32.1` |
| 新加的两道版本门不会打爆 CI | ✅ `ci.yml:91`（`host/build.ps1`）→ `:97`（`installer.ps1`）→ `:100`（`portable.ps1`）；`release.yml:93`→`:100-101` 同序；三个 workflow 都没有调用 `verify-installer.ps1`，也没有写死 setup 体积/哈希（`grep` 45000000/50000000 在 workflows = 0） |
| 选择性卸载不会打爆 `install-verify` 手动 job | ✅ `ci.yml:180-185` 装到默认路径后只装不启动，`%LOCALAPPDATA%\Sidelight` 可写时宿主不会建 `$INSTDIR\state`/`webview2-data`，`www` 与 11 文件都被新块删掉 → `install dir left behind` 仍过 |
| `verify-installer.ps1` 的四处落点与 S2/S5 写法 | ✅ `:33` `Unverified()` 定义、`:30` `$script:unverified`、`:40-43` 缺包早退、`:46` 体积门、`:76-77` marker、`:148` 装后没起来、`:184-189` 卸载残留、`:196-197` 用户数据、`:239` 删 marker，全部与计划引用一致；`-PreflightOnly` 插在 `:43` 之后不碰体积门（可以，只是干跑不再验 50 MB 硬线） |
| 宿主起不来时 §4a「运行中安装被拒」仍会 PASS（所以它**不用**进环境 FAIL 清单） | ✅ `host/Program.cs:1523-1528` 先 `form.Close()`，`:176-179` 再进 `RunErrorForm`，`:1447-1455` 有 **8 s 看门狗**才退出——`verify-installer.ps1:97-99` 的 2 s 后重装时 exe 仍被占用 → `CheckRunning` abort → 4a PASS。**计划只把 `装后程序没起来` 归环境是对的**，我原以为是两条，实测源码后收回 |
| T2 的四处落点与 CSS 真值 | ✅ `App.tsx:384`（`tops` 旁）、`:1951-1990`（`useLayoutEffect`，`rail = railRef.current`、`floor` 链 `+12`、`setTops` 的 `JSON.stringify` 比较都在）、`:5064-5111`（`MarginRail` 传参块）、`MarginRail.tsx:242` 之前插 spacer、`styles.css:795-800`（rail `position: relative`）、`:802-811`（sticky + `margin-top: 12px`）、`:813/:843`（head/body）、`:2450-2549`/`:2527-2531`（抽屉）——全部命中 |
| 抽屉段用 `position: static` 解（门 6） | ✅ 抽屉里 `.margin-rail` 是 `fixed; overflow-y:auto`（`styles.css:2512-2525`），卡片已 `static`（`:2527-2531`），把面板也改 static 后 `panel.top = lastCard.bottom + 12`，门 6 成立 |
| T3 的落点与函数签名 | ✅ `mermaidLazy.ts:29/31/51-55/57-65/68-76/89-106/130-138`、`mermaidPreview.ts:16-21/23/42/48/58/72/82-103/113-116/118-122`、`theme: themeName()` 全仓 1 处、`themeName` 全仓 2 处（`:51`/`:61`）、`data-theme` 只在 `App.tsx:723` 与 `SettingsDialog.tsx:62` 写到 `documentElement`（MutationObserver 的观察目标正确） |
| T3 不新增依赖 / 不破首屏 | ✅ mermaid 仍走 `mermaidLoader` 动态 chunk；插件里加的十几行在主 chunk，余量 27,293 B 足够；`npm test` 从 380 → 384（只加用例不建文件） |
| 文档/收尾落点 | ✅ `README.md:114` 与 `packaging/README.md:57` 各含 `1,304,634`（`git grep` 改前 2）；README 那两句**已有**「以 Release 页 `SHA256SUMS-<版本>.txt` 为准」，删数即可；`AGENTS.md:39`/`:72`、`README.md:133`/`:171`、`docs/CHANGELOG.md:5`/`:171` 行号都对 |
| 四个打包文件 BOM 现状 | ✅ `installer.nsi`、`installer.ps1`、`portable.ps1`、`verify-installer.ps1` 前三字节都是 `239,187,191` |
| `HEAD` 与工作树 | ✅ `git rev-parse HEAD` = `39e4f0211f43b7edaca82d468d0997f029151e3c`；`git status --porcelain` 只有未跟踪的 `docs/iteration/round-46/`、`shots/round-46/` |
| 计划引用的脚本都在 | ✅ `.tmp/reset.mjs`、`.tmp/e2e-r45-install.ps1`、`.tmp/e2e-r46-ui-4.mjs`（146 行）、`ui-main.mjs`、`ui-3.mjs` 全部存在；`ui-3.mjs:113-118` 的「设置 → 深色 → 保存」与 `:65` `pair()` 对比度助手可直接抄 |

## 三、漏洞与修法

### V2-R1（P1，T2）：验收门 1 在 1440×900 上不可满足，末卡按钮仍被盖 17 px

**几何推导（全部用实测值 + CSS 真值，不给「大概」）**

1. 滚动口底边：`900 − 46`（`.topbar`，`styles.css:178`）`− 38`（`.toolbar`，`:1247`）`− 28`（`.status-bar`，`:1527`）= **872**；与 finder 实测 `railRect.top=136`（`= 84 + 52`，`:262-269` 的 `padding: 52px 32px 220px`）自洽。
2. 面板高 **93**（finder 实测 `[996,262,260,93]`）。
3. 修复后卡片纵向位置（floor 链不变，只是起点从 `-Infinity` 变成 `flowBottom=114`，整体 **+62 px**）：卡 0 `200→262`、卡 1 `376→438`、卡 2 `590→652`，**末卡底 = 652 + 144 = 796**（finder 原读数 590+144=734 也对得上「+62」）。
4. 计划让 railSpace = `floor − flowBottom` = 660−114 = **546**，于是面板自然位置 `= 796 + 12 = 808`，自然底 `= 901`。
5. `901 > 872` → `position: sticky; bottom: 0` **必然把面板上推 29 px**，实际 `panel.top = 872 − 93 = 779`。
6. 门 1 要求 `maxCardBottom ≤ panel.top − 0.5` → `796 ≤ 778.5` **假**。间距只有 `872 − 796 = 76 < 93`（面板高），所以 **不存在任何 spacer 取值能让门 1 成立**（面板要么在 808 的自然位，要么被钉在 779，二者同时约束）。
7. 副作用比门更值得写进计划：末卡底 17 px 落在面板头（`779..~814`）覆盖范围里，而 `.rail-overall-head` 按 §三.3 是 `pointer-events: auto` —— 末卡的三个按钮（抽屉实测 `[715,589,54,22]`，即卡片最底部 22 px）**在静止状态只有 5 px 露出来可点**，点下去落在面板头上会折叠面板。这是「第 1 张卡能点」之外**换到末卡的同一类问题**，不写清就会被 tester 当成没修好。

**修法（二选一，改计划文字即可，不需要改产品设计）**

- **A（推荐，保留 sticky）：** 门 1 拆成两条 —— (1) 静止态只锁第 1 张卡：`card0.bottom <= panel.top - 0.5`（P1 原文就是「第 1 张卡的 3 个按钮」）；(2) 新增「滚到底」门：`document.querySelector('.doc-scroll').scrollTop = scrollHeight` 后再断言 `lastCard.bottom <= panel.top - 0.5`（这一步证明 spacer 真的让面板在文档末尾落到卡片下方）。`maxCardBottom`、`lastCardOverlap` 只作诊断打印，并把你算到的数值写进计划（`scrollportBottom=872 / panelTop≈779 / lastCardBottom≈796 / overlap≈17`）。同时在 §三 风险补一句：「1440×900 静止时，末卡底部约 17 px 在钉住的面板后面，滚动约 20 px 即可点；本轮只承诺第 1 张卡静止可点 + 每张卡都能滚到不被覆盖」。
- **B（更强，改变现有常显行为）：** 给 `.margin-rail:has(.note) .rail-overall { position: static; }`（与抽屉同一条规则统一），面板落到末卡下方 12 px（`808 < 900`，门 5 仍过），门 1 自动成立、17 px 残留消失；代价是长文档里面板不再常驻视口底。要不要选 B 得 planner 拍板并写进 §三 风险。

**10 秒自证**（改前改后各跑一次，贴进 `impl.md`）：

```js
const d = document.querySelector('.doc-scroll').getBoundingClientRect()
const p = document.querySelector('.rail-overall').getBoundingClientRect()
const c = [...document.querySelectorAll('.note')].at(-1).getBoundingClientRect()
({ scrollportBottom: d.bottom, panelTop: p.top, panelBottom: p.bottom, lastCardBottom: c.bottom, overlap: c.bottom - p.top })
```

### V2-R2（P1，T2）：`ui-4` 一行都跑不起来（缺 goto + 缺文档播种），要把「只改三处」改成「抄四段」

**证据**

- `.tmp/e2e-r46-ui-4.mjs:8-10`：`connectOverCDP('http://127.0.0.1:9226')` → `context.pages().find(p => p.url().includes('localhost:5175')) ?? context.newPage()`，**全文没有 `page.goto`**，`page.on('dialog'…)` 之后直接 `:22 page.click('#sidebar-tab-files')`。
- `.tmp/reset.mjs:26-58`：先关掉所有 localhost 页面（`:28-32`），再 `context.newPage()` → `goto` → 清 localStorage/IndexedDB/caches → reload → **`:58` 把自己那页关掉**。所以 reset 之后 `context.pages()` 里没有 5175 页面（多半是 empty 或 about:blank）。
- `.tmp/r46-ui-4-log.txt` 的读数（`railRect`、三张卡、"正文第一段，用来检查行高与中…"）来自 **finder 前一段脚本留下的页面**：`.tmp/e2e-r46-ui-main.mjs:24-26`（`installDemoFolder` → `goto` → `waitForSelector('.doc-column .ProseMirror')`）、`:183-229`（`RICH` 字面量）、`:231-235`（`Ctrl+/` → `fill('textarea.source-editor', RICH)` → `Ctrl+/`）。`ui-4` 自己一句话都没播种。
- 结果：按计划「只改端口/截图路径/扩断言」跑，`page.click('#sidebar-tab-files')` 在 about:blank 上 **30 s 超时**；补上 goto 但没播种，`.note` 数为 0 → 门 1 变成 `−Infinity ≤ …`（空转通过）、门 2/7 是 `null` 或直接红，和计划的「改前期望 `blockedButtonsInCard0:3`」对不上，`impl.md` 的「改前红基线」取证作废。

**修法**：T2 第 1 步改成「复制 `ui-4` 的**测量段**，脚本头抄 `ui-main.mjs:1-30`（含 `installDemoFolder`、`goto(URL)`、`waitForSelector('.doc-column .ProseMirror')`），种子抄 `ui-main.mjs:183-229`（`RICH`）+ `:231-235`（`Ctrl+/` → `fill` → `Ctrl+/`）」，再改端口 `9226→9222` 与截图前缀 `r46-ui-*→impl-t2-*`；并写明「finder 的绝对坐标只作对照，期望以自己这一次的改前读数为准」。顺带把 T3 的脚本也写全：`RICH` 定义在 `ui-main.mjs:183-229`（`:231-236` 只是用法），T3 若自带最小种子（正文 + ```` ```mermaid ```` 围栏）就不必抄 RICH，但 **`goto` + `waitForSelector` 必须有**（reset 之后没有页面）。

### V2-R3（P2，T1）：`RMDir /r "$INSTDIR\state"` 会删掉用户自己的 `state\`

**证据**：`host/Program.cs:1917-1921` —— `%LOCALAPPDATA%\Sidelight` 可写时（正常机器）第一顺位成功，宿主**不会**在 `$INSTDIR` 建 state；`installer.nsi:48` 又允许目录页把 `$INSTDIR` 指到任意已有目录。于是「用户把 Sidelight 装进一个本来就有 `state\` 的目录」时，卸载会递归删掉那个目录里的用户文件——和 T1 要证明的「只删自己写的」相反。宿主在 state 里实际只写三样：`recent.json`（`:1899`）、`recent.json.bad-<ticks>`（`:2009`）与原子写的临时文件 `.sidelight-tmp-*`（`:764`）。

**修法**（两行，静态断言从「`RMDir /r "$INSTDIR\state"` 1 条」改成两条）：

```nsis
Delete "$INSTDIR\state\recent.json*"
RMDir "$INSTDIR\state"
```

`recent.json*` 同时覆盖 `.bad-*`；非递归 `RMDir` 在目录为空（宿主起来了但没开文档）时也能删掉，A 段探针（只放 `recent.json`）与 B 段（不放）都仍然绿；若残留 `.sidelight-tmp-*`（崩溃才会出现），目录留下、`verify-installer.ps1:184` 会报 `卸载残留`——那是真实情况，不该被静默吞掉。`www`/`webview2-data` 继续用递归删（前者安装时就会整目录重写，后者整目录都是 WebView2 自己的），并在 §二 风险里写清这个区别。

## 四、时间预算（复审不推翻 35 min，但要提前砍）

revision 2 的修法本身不加工时（R1 一行 + 一条断言、R2 一行 + 两个探针文件），但 V2-R1/V2-R2 的修法会占 T2 的时间：门 1 要改成两条并补「滚到底」读数（+1 min），脚本要补导航与播种（+2 min）。T2 原 9 min 会变 12 min 左右。建议在 §八 砍单表里把「**T1 的 S5 定向整跑**」从第 1 位提前到**开工前就决定砍不砍**（它是唯一含 30 s 应用探活 + 30 s 卸载等待的项），把省下的 2–3 min 让给 T2；A 段探针先写完、先用未改包跑红基线这条顺序（`:633`）保持不变。

## 五、UNVERIFIED（我只读，未跑）

1. V2-R1 的 779 / 796 是**从 finder 实测读数 + CSS 真值推出来的**，没在浏览器里跑过；`impl.md` 要用 §三 那段 10 秒自证脚本贴真实读数。
2. T2 改后卡片下移后，正文列与 rail 的实际高度、页面多出的空白：未跑。
3. T3 深色切换后的 `edgeStroke` / 对比度 / `previewCount`：未跑（按 `findings-ui.md` F2 的读数与截图）。
4. 首屏 gzip 加 T2/T3 代码后的增量：未跑 `npm run verify`（会写 `dist/`，留给 implementer 串行跑）。
5. `npm test` 384 条、`npm run roundtrip` rich 5/7 + source 7/7：未跑。

---

# 复审（revision 3）

- 输入：`plan.md` **revision 3 全文 684 行**（上一版 633 行，重读全文，不以前两版结论代替）、5 份 `findings-*.md`、`AGENTS.md`、`.tmp/iteration/common.md`、`.tmp/iteration/roles/planner.md`（`:25` 的 35 min 规则）、`docs/iteration/round-45/plan.md`，以及计划点到的全部源码与脚本。
- **本轮实际打开核对的源码/脚本**：`src/styles.css`（`:173-182`、`:245-259`、`:262-269`、`:795-816`、`:950-965`、`:1242-1252`、`:1522-1533`、`:2442-2536`）、`src/App.tsx`（`:380-390`、`:533`、`:1935-1992`、`:5060-5115`、`:4541`）、`src/components/MarginRail.tsx`（`:55-110`、`:200-276`）、`src/lib/mermaidLazy.ts`（全文 146 行）、`src/lib/mermaidPreview.ts`（`:13-121` 结构行）、`src/lib/mermaidLazy.test.ts`（`:21-80`）、`src/components/SettingsDialog.tsx`（`:43-62`）、`host/Program.cs`（`:26-28`、`:58-71`、`:89-91`、`:764`、`:1395-1411`、`:1885-1954`、`:2005-2016`）、`packaging/installer.nsi`（`:1-5`、`:46-50`、`:125-145`、`:188-205`）、`packaging/installer.ps1`（`:1-30`、`:52`、`:70-87`）、`packaging/portable.ps1`（`:1-45`）、`packaging/verify-installer.ps1`（`:1-50`、`:74-78`、`:144-150`、`:182-199`、`:233-241`）、`.tmp/e2e-r46-ui-4.mjs`（`:6-35`、`:55-137`）、`.tmp/e2e-r46-ui-3.mjs`（`:108-123`、`:9-11`）、`.tmp/e2e-r46-ui-main.mjs`（`:1-30`、`:183-236`）、`.tmp/reset.mjs`（`:50-62`）。
- 只读：未改产品代码、未跑 E2E / `npm test` / `npm run verify` / 安装包探针，未 commit / push，未碰 `release/`。只做了只读命令核对（`git rev-parse` / `git grep` / `Select-String -SimpleMatch` / `Get-FileHash` / 端口探测）。
- **行号口径**：本文件行号一律按 `read` 工具。**本仓库 `Get-Content` 的 `.Count` 会比 `read` 少若干行**（`ui-4` 142 vs 146、`reset.mjs` 61 vs 62），用它数行号会自己造出「行号漂移」的假漏洞——我自己先差点踩到，已用 `read` 复核。
- 环境（实测）：dev server 5175 **在**（`Invoke-WebRequest http://localhost:5175` → **200**；`127.0.0.1:5175` 直连被拒 = 只监听 IPv6，所以脚本必须继续用 `localhost`）；CDP **9222 可连**；`.tmp\assoc-dryrun-setup.exe` 与 `.tmp\nsis\nsis-3.11\makensis.exe` 都在；`host\bin\Sidelight.exe` = **0.32.1.0 / 87,040 B**；`dist` = 97 文件。

## 〇、复审结论：**REVISE**（1 P1 + 2 P2）

revision 3 把上一版 V2-R1/V2-R2/V2-R3 **三条逐条真修了**（V2-R1 的新门我按 CSS 真值重算了可行性，见 §一），任务集合、级别、范围不变。仍留一条 **P1**：§八 的砍单算术**必然砍掉 T1 的主断言 B 段**，而砍单表自己写着「不砍主断言」。

| id | 级别 | 任务 | 一句话 |
| :-- | :-- | :-- | :-- |
| **N1** | **P1** | T1 / §八 | 39 min 要压到 35（`roles/planner.md:25`）**只能**砍砍单第 3 项 = T1 的 B 段，但 B 段是 §二 断言汇总第 2 条（主断言，`dirExists=False`）；A 段里 `dirExists=True` 是期望值，**区分不了新删除清单完整与 `RMDir` 静默失败**，S5 定向整跑替代不了它（宿主没起来时 `$instdir\state` 可能根本不存在）。砍单第 3 项与「不砍主断言」自相矛盾 |
| **N2** | P2 | T2 / §三 | §三 几何表一行里混用两套坐标：`flowBottom=114`/`floor=660` 是**相对 `.margin-rail` 顶**，`卡 0 200→262`/`末卡底 796` 是**视口值**，差 `railRect.top=136`；同一张表里「末卡底 796」与「floor 660」是同一条边的两个数，照抄易写成 `railSpace = 796 − 114 = 682` |
| **N3** | P2 | T3 / 实施步骤 1 | 「主题切换抄 `.tmp/e2e-r46-ui-3.mjs:113-118`」+ 选择器写 `深色`，但**被抄的那一段点的是「浅色」**（`ui-3:115`，finder 当时是深色→浅色）；照抄会把本轮要的「浅→深」做成「深→浅」，两条读数全反 |

## 一、上一版漏洞是否真修掉（逐条对源码 + 重算）

| 上一版 | 计划里的落点（revision 3） | 我的核对 | 判定 |
| :-- | :-- | :-- | :-- |
| **V2-R1（P1，T2）** 门 1 `maxCardBottom <= panel.top - 0.5` 数学不可满足 | `plan.md:308-325`（几何前提表 + **修法 A**：门 A1 静止锁卡 0、门 A2 滚到底锁末卡、`maxCardBottom`/`lastCardOverlap` 降为诊断）、`:320`（写明不做修法 B，只记 §六）、`:322-323`（两条门定义）、`:394-395`（脚本内断言）、`:408`（17 px 残差写进风险 + 「tester 不要判成没修好」）、`:644`（修法 B 留给产品负责人） | 我按源码真值逐项重算：滚动口底 = `900 − 46`（`styles.css:178`）`− 38`（`:1247`）`− 28`（`:1527`）= **872**；`App.tsx:1958` `floor = NEGATIVE_INFINITY` → 改成 `flowBottom`、`:1970` `top = max(natural, floor+12, 40)` 都在；`.doc-layout` `padding: 52px 32px 220px`（`:267`）、`.margin-rail` `position:relative`（`:796`）、`.rail-overall` `sticky; bottom:0; margin-top:12px`（`:802-806`）都成立。重算结果与计划**逐项相等**：flowBottom=114（栏内）→ tops = 126/302/516（视口 262/438/652，**+62**）→ 末卡底 660（栏内）= **796** 视口；railSpace=546 → 面板自然顶 = 136+114+546+12 = **808**、底 **901** > 872 → sticky 钉 **779**。**门 A1**：`426 ≤ 778.5` ✔；**门 A2**：scroll 到底后内容高 ≈ 52+4+765+12+220 ≈ 1053、clientHeight 788 → `scrollMax ≈ 265`，远大于所需的 17.5（钉住态解 `s ≥ 17.5`，释放态恒成立）✔。**两条门可满足，且能区分错误实现**：漏加 spacer 时 A1 会红（卡 0 底 426 对面板 262）；spacer 偏小同样红 | ✅ **真修**（修法 A 落地，数学自洽；17 px 残差与「滚动约 20 px」已写进风险） |
| **V2-R2（P1，T2）** 「只改三处」不成立 | `plan.md:373-377`（T2 脚本：头抄 `ui-main:1-27`、播种抄 `:183-229`+`:231-235`、测量只搬 `ui-4:48-143`、改端口与截图前缀）、`:379`（先取静止读数再滚到底）、`:530-533`（T3 脚本同样必须自带 `goto` + `waitForSelector`，且**不需要** `installDemoFolder`）、`:652-654`（§七 第 5/7 条） | 逐条对得上：`ui-4:8-10` 是 attach 型（`connectOverCDP('…9226')` → `pages().find(...) ?? newPage()`），**全文无 `page.goto`**、`:22` 第一条 click 就是 `#sidebar-tab-files`；`reset.mjs:28-32` 关 localhost 页、`:58` `page.close()`；`ui-main:11` find 页面、**`:12` `setViewportSize({1440,900})`（在被抄的 1-27 里，T2 几何读数因此成立）**、`:24` `installDemoFolder`、`:25` `goto(URL)`、`:26` `waitForSelector('.doc-column .ProseMirror')`、`:183` `const RICH`、`:231-234` `Ctrl+/` → `fill('textarea.source-editor')` → `Ctrl+/`；`ui-3:9-11` 同样 attach 型 | ✅ **真修**（抄点全部指对，且补上了 T3 的 `goto`） |
| **V2-R3（P2，T1）** `RMDir /r "$INSTDIR\state"` 删用户目录 | `plan.md:98-99`（`Delete "$INSTDIR\state\recent.json*"` + 非递归 `RMDir "$INSTDIR\state"`）、`:114-117`（说明三顺位与三种文件名）、`:190-192`（改前基线：递归版 0、非递归版 0、Delete 行 0；改后 0/1/1）、`:202`（A 段加 `state\mine.txt`，断言 `userStateKept=True`）、`:203`（B 段断 `dirExists=False`）、`:269`（风险：`RMDir /r "$INSTDIR\state"` 一旦出现就是 P2 回归） | `installer.nsi:196` 现状确为 `RMDir /r "$INSTDIR"`；`:48` 目录页、`:129-136` 载荷 **8 个 `File`**（`installer.ps1:10-16` 的 `$payloadNames` 只 5 个，其余 3 个 ico/README/LICENSE 在 nsi 里）+ `:138-140` `www`、`:142` `uninstall.exe`、卸载段 `:193-205`；`host/Program.cs:1890-1901`（`InitState`）、`:1917` LOCALAPPDATA → **`:1920` `baseDir\state`（第二顺位）** → `:1925` TEMP、`:1931-1942` `TryWritable` 建目录、`:1899` `recent.json`、`:2011/:2016` `recent.json` 备份/删除、`:764` `.sidelight-tmp-*`——**state 里确实只有这三类文件**，`recent.json*` 通配覆盖前两类 | ✅ **真修**（删法正确，A/B 两段把「别人的文件不动」「空目录仍被清掉」都锁住了；见 N1——问题不在删法，在砍单把 B 段砍掉） |

## 二、复审确认无误的部分（我逐条实测过）

| 计划主张 | 核对结果 |
| :-- | :-- |
| 静态基线六条：`RMDir /r "$INSTDIR"`=1、`Delete "$INSTDIR`=0、`RMDir /r "$INSTDIR\state"`=0、`RMDir "$INSTDIR\state"`=0、`Delete "$INSTDIR\state\recent.json*"`=0、`RMDir "$INSTDIR"`=0 | ✅ 六条**逐条相等**（`Select-String -SimpleMatch`，含 `"` 的模式按 AGENTS §8 不用 `git grep`） |
| `payloadVersion`=0、`markerWritten`=0、`param([string]$Setup`=0、`1,304,634` 两处 | ✅ 实测全对（`git grep -c` 前两条 exit 1 无输出；`git grep -n "1,304,634"` 命中 `README.md:114` 与 `packaging/README.md:57` 两条）；`railSpace`=0、`configure(mermaid)`=**1**、`themeName`=2 行（只有 `mermaidLazy.ts:51/:61`，改名不牵动别的文件）也全对 |
| `release/` 基线三份 SHA256 与「旧包 824,595 B / FileVersion 0.31.1.0」 | ✅ 实测 `6C93F58D…`（824,595 B）、`F4210C62…`（910,360 B）、`2F32C26A…`（207 B），setup `FileVersion=0.31.1.0`；`host\bin\Sidelight.exe`=0.32.1.0、`package.json`=0.32.1 —— S2/S3 的绿/红两侧都成立 |
| 卸载替代块 12 条 `Delete "$INSTDIR` + 递归 `www`/`webview2-data` + 非递归 `state` 与目录 | ✅ 12 = 8 载荷 + `assoc-plan.txt` + `host.log*` + `state\recent.json*` + `uninstall.exe`，与 `installer.nsi:129-142` 一一对应（`assoc-plan.txt` 的 `Delete` 在非 dry-run 包里是 no-op）；`installer.nsi:2-3` 明写「注释必须 ASCII」，计划的 3 行新注释也是 ASCII ✔；`:204` 的「保留用户数据」注释原样保留 ✔ |
| `verify-installer.ps1` 的落点：`param()` 放 `:6`（注释块后）、`:21` 默认包路径、`:33 Unverified`、`:76-77` marker（无 try/catch）、`:148` 装后没起来、`:184-189` 卸载残留、`:196-197` 用户数据、`:239` 删 marker | ✅ 全部命中；`:29-30` 有 `$script:failed/$script:unverified`，计划里打印 `$script:unverified` 可行；`:40-43` 已做「缺包 exit 1」，S2 门插在 `:43` 之后时 `Get-Item $setup` 安全 |
| T3 落点：`mermaidLazy.ts:29/:31/:51-55/:57-65/:68-70/:76/:89-106/:130-138`、`mermaidPreview.ts:16-21/:23/:42/:48/:58/:72/:82/:113-116`、`test.ts:67-78` | ✅ 逐条命中（`ensureMermaid` 早退在 `:69`、`configure(mermaid)` 唯一调用点 `:76`、`renderDiagram` 缓存读 `:91` 写 `:100`；预览层五个函数确实都收 `hash`，`inFlight` 是 `Set<string>`、`pendingTimers` 是 `Map`、widget 装饰在 `:90`） |
| `mermaidLazy.test.ts` 加 4 条「不动文件数」，另一条断言加在现有用例 | ✅ 成立，但**计划没写清已有断言**：`:50` 已经有一条 `assert.equal(fake.inits.length, 1)`（「渲染成功」用例）。计划要加在 `:67-78`（连续渲染 2–3 次）末尾**是对的方向**（才验到 R1 的 `appliedTheme` 守卫），`impl.md` 要写一句「`inits` 断言现在有两条，不是新增用例」 |
| 首屏/依赖/硬约束 | ✅ T3 不新增运行时依赖、mermaid 仍不进首屏；T2 只加状态与 CSS；无 Tiptap schema、批注协议、保存差异门改动；CHANGELOG 写 `## Unreleased`（`docs/CHANGELOG.md:5`），不发版、不动 `release/`、不 push |
| dev server / CDP / reset / 中文脚本用 `write` / 含 `"` 用 `Select-String` / BOM 复查 | ✅ 与 `common.md`、`AGENTS §8`、§七 一致；实测算术：`39 − 3 = 36`、`36 − 1 = 35` 本身没算错（问题在砍的是哪一项，见 N1） |

## 三、漏洞与修法（按严重度）

### N1（P1，T1 / §八）：砍单算术必然砍掉 T1 的主断言 B 段，且与「不砍主断言」自相矛盾

**证据**

- `plan.md:675`：「若实际超时，按下面顺序砍（**先砍验证广度，不砍主断言**）」；`plan.md:679` 砍单第 3 项 =「T1 的 B 段（干净目录卸载）→ 只保留 A 段 … 记 UNVERIFIED」。
- `plan.md:261`（§二 断言汇总第 2 条）把 B 段写成验收断言：`dirExists=False`（「连只有宿主自己写的 `state\recent.json` 的目录也整个清掉」）→ B 段就是**主断言**。
- `plan.md:673` 的算术：`39 −（第 1 项 2 min + 第 2 项 1 min）= 36`，而 `roles/planner.md:25` 要求「按一个执行代理 35 分钟内能完成来排」→ **必须**再砍第 3 项 = B 段。也就是说：按计划走完砍单，B 段一定被砍。
- 覆盖率后果（我按探针设计逐条比过）：A 段的 `$dir` 里有 `keep-me.txt`、`her-doc.md`、`state\mine.txt`，`dirExists=True`/`userStateKept=True` 都是**期望值**，所以 A 段**区分不了**「新删除清单完整」与「`RMDir "$INSTDIR\state"` / `RMDir "$INSTDIR"` 静默失败」；而 `verify-installer.ps1:184-189` 的真实回归门（`FAIL 卸载残留`）恰恰就吃这两行。§二 风险 `:270` 自己写着「`FAIL 卸载残留` 都是真回归，不许归环境」——计划却在砍单里把唯一能提前发现它的实测砍掉。
- S5 定向整跑（砍单第 1 项）**替代不了** B 段：它清理的是 `$instdir\state`，该目录只有宿主跑过 `Main` → `InitState()`（`host/Program.cs:91` → `:1920`）才存在；本沙箱已知「装后程序没起来（0x8000FFFF）」（`verify-installer.ps1:148`），宿主是否留下 `state\` 不确定，`RMDir "$INSTDIR\state"` 很可能只是在**不存在的目录**上 no-op → 对 B 段那条路径 **0 覆盖**。

**修法**（任选一种，成本 0–3 min，都不加实现量）

1. **最省**：砍单第 3 项换成第 4 项（T3 的「切回浅色」，1 min，只丢一条反向断言与一张图），B 段移出砍单并写明「B 段不计入砍单」。39 − 2 − 1 − 1 = **35** ✔。
2. 保留 39 min 的说法，把 39→35 的 4 min 从「改前红基线整跑」出：把 `release\Sidelight-0.32.1-win-x64-setup.exe`（**本来就是递归 `RMDir` 的旧包**，实测 824,595 B / 0.31.1.0）复制成 `.tmp\r46-old-setup.exe` 跑 A 段拿改前红，不必先 `-AssocDryRun` 重建一次（§二 第 1 步的「改前红基线」照样成立，省 ≈1.5–3 min；`release/` 一个字节都不写）。
3. 若确实要砍 B 段：把 §二 断言汇总第 2 条**降为诊断**并在 §三 风险写明「`RMDir "$INSTDIR\state"` 非递归删空目录与 `RMDir "$INSTDIR"` 整目录清除本轮**没有实测证据**，只有静态推理」——现在这句话只躲在砍单第 3 项里，`impl.md` 很可能仍按「验收断言」写绿。

### N2（P2，T2 / §三）：几何表一行两套坐标，`floor 660` 与「末卡底 796」是同一条边

**证据**

- `plan.md:313`：「floor 起点从 −Infinity 变成 `flowBottom=114`：卡 0 `200→262`、卡 1 `376→438`、卡 2 `590→652`」——`200/262` 是**视口值**，`114` 是**相对 `.margin-rail` 顶**的值（`App.tsx:1966` `coordsAtPos(...).top - railRect.top`；计划 §三.1 的 `child.getBoundingClientRect().bottom - railRect.top` 同口径），两者差 `railRect.top = 136`（262 = 136 + 126）。
- `plan.md:314` 与 `:315`：`末卡底 ≈796 = 652 + 144`（视口）与 `floor − flowBottom = 660 − 114`（栏内）**是同一条边**（660 + 136 = 796），表里却像两个不同量；照抄「末卡底 796 − flowBottom 114」就得到 `railSpace = 682`（虽然也能过门，但和计划的 546 对不上，`impl.md` 会记一条「计划数不对」）。
- 影响面有限（§三.1 的代码片段 `Math.max(0, Math.round(floor - flowBottom))` 在两套口径下都得同一个差值，不会写错代码），但门 A2 的诊断打印与「实测预期 `panelTop≈779 / lastCardBottom≈796`」要靠这张表核对。

**修法**：§三 表头加一句「下表 `flowBottom` / `floor` / `railSpace` 一律是**相对 `.margin-rail` 顶边**（`railRect.top`）的值；卡片与面板 rect 写的是**视口值**，换算 = 136 + 栏内值（`railSpace` 是差值，两帧同值）」，并把 `:313` 改成「卡 0 栏内 64→126（视口 200→262）」这类写法。

### N3（P2，T3 / 实施步骤 1）：「抄 `ui-3:113-118`」抄到的是**反方向**

**证据**

- `plan.md:533`：主题切换抄 `.tmp/e2e-r46-ui-3.mjs:113-118`，选择器写 `.theme-options button:has-text("深色")`。
- 被抄的那段实际是 `ui-3:111-118`：「B. **切回浅色**」→ `:113` 点「设置」、`:115` `page.click('.theme-options button:has-text("浅色")')`、`:117` 点「保存」。finder 当时页面已是深色，这一段是**深→浅**；T3 要的是**浅→深**。逐字照抄会把方向做反，改前红/改后绿两条读数一起反，还能「通过」自己写的反向断言。

**修法**：把「抄 `:113-118`」改成「按下述三段**重写**（`ui-3` 那段点的是『浅色』，是本轮的反方向）：`.topbar button:has-text("设置")` → `.theme-options button:has-text("深色")` → `button.primary:has-text("保存")`」，并补一句「点完等 300 ms 读 `document.documentElement.dataset.theme` 确认已是 `dark`，再取 `edgeStroke`」（`SettingsDialog.tsx:62` 点选时就会写属性，`App.tsx:721-724` 保存时再写一次——两步都可用作确认点）。

## 四、UNVERIFIED（我只读，未跑）

1. 门 A1/A2 的真实读数（`panelTop≈779`、`lastCardBottom≈796`、`scrollMax`）：由 CSS 真值 + finder 读数推算，未在浏览器里跑；`impl.md` 要贴脚本自己那一次的实测（计划 `:377` 已要求照做）。
2. `scrollMax ≈ 265` 是估算（`52 + 4 + 765 + 12 + 220 − 788`）：正文列比 rail 高时会更大，门 A2 只会更容易满足；真值待 E2E。
3. T2 改后 rail 变高 546 px 后页面多出的空白、深色截图：未跑。
4. T3 切深色后的 `edgeStroke`/对比度/`previewCount`、以及 `MutationObserver` + `matchMedia` 双路径是否只重渲一次：未跑。
5. `system` + 系统深色的真机切换：沙箱不能改系统主题，只有单测路径（计划 `:563` 已记 UNVERIFIED）。
6. S5 定向跑、S2 两个干跑、S3 红/绿、A/B 段探针、`npm test` / `npm run verify` / `npm run roundtrip`：全部留给 implementer，我一条都没跑。
