# 第 35 轮计划（planner，只读）

- revision：**3**（第 2 次修订，对象是 rev 2。planner 只读：`git log -8`、三份 findings、STATE、README、AGENTS、ADR-0012/0017、相关源码与 `plan-review.md`。未改任何产品代码，未跑产品命令）。
- **rev 2 改了什么**（逐条对应 `plan-review.md`，任务结构不变，仍 T1→T2→T3 严格串行，预算 33 → 34 分钟）：① **P1-1** T1 改动清单补 `scripts/measure-first-screen.mjs:13`（`positional` 改为跳过所有 `--` flag 及其后一个值），验收 c 保留并贴退出码 + 新增 c2 正向自检（rev 1 实测该命令 exit 1，`280000` 被当目录）；② **P1-2** T1 验收 e/f/g/h/i 全换成**不用 `\|`** 的多模式命令，每条 0 命中之前必须先有「同模式在改前/HEAD 上 >0」的正向对照（rev 1 的写法是字面竖线，恒为 0）；③ **P2-1** T3 的 4b 增加 `previewMode` 显式分支，e2e 加 d2 组（预览 + 查找 + Esc），并在「不在本轮范围」写清预览 pane 不可聚焦；④ **P2-2** `scripts/qa15.mjs` 进「不在本轮范围」（4 行因提示词拆分失效，不在任何门禁里）；⑤ **P2-3** ADR-0017 补记 AGENTS §4 的运行时依赖例外与第 36 轮 README 待办；⑥ **P2-4** T1 第 9 项只改 STATE 两条体积线，**测试条数不写**（由根代理轮末一次改）。
- **rev 3 改了什么**（逐条对应 `plan-review.md` 第三节 5 条；任务结构不变，仍 T1→T2→T3 严格串行，预算 34 分钟不变）：① **P1-1** T1 验收 j 的语法解析改成**当前会话直跑**的 `.Path` 写法（本轮实测输出 `0`），并给出外层单引号的子进程替代（实测输出 `0`、exit 0），同时写明旧的双引号写法实测 **exit 1** 与三条报错；② **P2-1** T1 第 8/9 项（AGENTS:74、STATE:52）只写两条预算线、不写 285,937/34,063，第 7 项（README:99）只写 T1 时点值，轮末字节一律交根代理按收尾 #2 回填；收尾 #2 清单补 `AGENTS.md:74` 首屏数与余量、`README.md:101` 主 chunk 实测（本轮实测 raw=**896,224 B**，文中 896,149 B 已过期 75 B）；③ **P2-2** T1 第 11 项补 ADR-0017 `:1` 标题、`:3` 首段、`:13` 决定首句三处改写；④ **P2-3** 全轮硬约束 1 与收尾 #3 的 CHANGELOG 第三条改成「T3 交付才写，被砍写顺延第 36 轮」；⑤ **P2-4** T2 第 6 项写明只删 `:3718-3721` 的 JSON 警告块、`:3714` 的 `clampFontSize` 钳制原样保留，并新增验收 g2 证明它还在。
- 基线：`main` @ `e64c2fce`（= 轮前 startSha；`git status --porcelain` 只有本轮 `?? docs/iteration/round-35/` 与 `?? shots/round-35/`）。版本 **0.32.1**，本轮**不发版**。
- 门禁现状（本轮 finder 实跑，不是估计）：`npm run build` PASS；`npm test` **22 文件 287 条**；首屏 gzip **285,937 B / 上限 286,000 B，余 63 B**（`round-35/findings-ship.md:22-28`、`findings-typora.md:40`）；安装包本地重建 824,595 B、发布件 824,209 B（硬线 850,000 B，余 25,405 / 25,791 B）；便携 zip 910,360 B（门槛 940,000 B）。
- 输入：`round-35/findings-bug.md`（2 条 actionable）、`findings-typora.md`（9 条建议）、`findings-ship.md`（5 条）、`docs/iteration/STATE.md:52,55,132,158-160`、`README.md:99,110,185`、`AGENTS.md` §3/§4/§6/§8、`docs/adr/0012`、`docs/adr/0017`、`packaging/*.ps1`、`.github/workflows/{ci,release}.yml`、`src/lib/{prompt,ai,settings,search}.ts`、`src/components/{SettingsDialog,FindBar}.tsx`、`src/App.tsx`。
- **本轮的硬前提**：产品负责人点名的 ① 体积护栏换挡必须**第一个做**。现在首屏只剩 **63 B**，任何用户可见功能都装不进去（第 33 轮一次改动吃掉 839 B）。不先把线换成内部 310,000 / 硬线 320,000，本轮 ② 的代码都上不了 `npm run verify`。

## 本轮取舍（先给结论）

**3 个任务：一个体积护栏换挡（P0，必须第一）、一个 AI 提示词拆分（P0，产品负责人点名）、一个 Esc 焦点/一次按键两个动作修复（P1，稳定性，可砍）。全部不发版、不改 `release/`、不新增依赖、不动 `host/` 与 `host-mac/`、不动 Markdown 序列化。**

| # | 主题 | 类型 | 优先级 | 预算 |
| :--- | :--- | :--- | :--- | ---: |
| T1 | 体积护栏换挡：首屏内部 310,000 / 硬线 320,000，安装包内部 1,800,000 / 硬线 2,000,000，全文档/全脚本同步 | 安装/体积 | **P0** | 10 min |
| T2 | AI 提示词拆分：格式与安全规则进内置 system prompt，设置只暴露可编辑 user prompt，旧值迁移不丢 | 用户可见 + 内部质量 | **P0** | 17 min |
| T3 | Esc 后焦点回正文（预览 / 源码 / 快速打开）＋ 查找框开着时一个 Esc 只关查找 | 稳定性 | P1 | 7 min |

- **合计约 34 分钟**（10 + 17 + 7），一个执行代理、**严格串行 T1 → T2 → T3**，35 分钟上限内留约 1 分钟余量。rev 2 比 rev 1 多 1 分钟：T1 多「改前正向对照 + `:13` 修复」（+1），T2 压 17（-1），T3 多 d2 组与预览分支（+1）。砍单顺序写在「本轮取舍」末与每个任务的「可砍项」里。
- **为什么 T1 第一**：产品负责人 ①「先更新体积护栏……不先放宽会卡住本轮功能」；且 T1 只碰脚本/文档/`packaging/*.ps1`、**0 产品代码字节**，先做不会被后续任务返工。
- **为什么 Mermaid 不做**：产品负责人 ③ 明写「Mermaid 留到第 36 轮」。ADR-0017 本轮只改**结论与预算**（改成「接受」），不写一行渲染代码。
- **为什么 P0「工作区图片破图」也不做**（`findings-typora.md` A2，第 32/33/34 轮连续提出）：① 它要新增宿主路由 `host/Program.cs`（`/__asset`）+ 重建宿主 + `host-smoke` + 页面侧 `resolveAssetSrc` + 预览/导出两条路径，单代理 45–60 分钟，**超本轮 35 分钟上限**；② 本轮产品负责人只点名 ①②，③ 又要求「稳定性 > 核心功能」——先换护栏与拆分提示词，图片在下一轮排第一；③ 护栏放宽后，图片修复不再需要和「省字节」任务捆绑（上一轮被 63 B 余量卡住的正是这一类）。理由与上一轮写法一致，不是拖。
- **为什么保留 T3**：③ 排序把稳定性放第一，而 `findings-bug.md` 第 1 条是 **P1 静默吞键**（Esc 退出预览/源码/快速打开后，下一次击键全部丢失，用户会以为键盘坏了），修复只需在既有 `focusEditor()`（`src/App.tsx:327`）上接 3 处 + 查找组 4a/4b（2 行 `stopPropagation` + 按模式分派焦点），代价最小、收益直接；`npm test` 之外用 1 次 6 组 e2e 就能证明。
- **T3 是本轮唯一的可砍项**：执行到 27 分钟时若 T1/T2 未收口，直接放弃 T3 并在 `impl.md` 记「未做」；**T1 与 T2 不许砍**。

## 全轮硬约束（每条验收都要过）

1. **不发版**：`package.json` 的 `version` 保持 `0.32.1`。`docs/CHANGELOG.md` 由**根代理**在轮末写（现成标题 `## Unreleased（第 29–34 轮，未发版）` → `## Unreleased（第 29–35 轮，未发版）`，加「**第 35 轮**」子段：① 体积护栏换挡；② AI 提示词拆分（格式内置 system、设置只改 user prompt、旧值迁移不丢）；③ **只按 T3 实际交付情况写**——T3 交付才写「Esc 后焦点回正文、查找 Esc 只关查找」；**T3 被砍时只写 ①② 两条，并在同一子段加一行「Esc 焦点修复（预览/源码/快速打开）顺延第 36 轮」**，不许把没做的写进 CHANGELOG（rev 3，P2-3，与硬约束 7 一致）。执行代理**不碰 CHANGELOG**。
2. **不改 `release/`、不 push、不新增运行时依赖、不动 `host/` 与 `host-mac/`、不改 Markdown 序列化（`src/lib/serializeDocument.ts`、`tableReuse.ts`、`roundtrip` 相关）**。T2 只改提示词与设置形状，正文与批注数据格式不动。
3. **执行代理全程串行、只有一个构建产物口径**：T1 的验收**只读现有 `dist/`**（首屏基线 285,937 B），**不跑 `npm run build` / `npm run verify`**（Vite 默认 `emptyOutDir`，与根代理的构建互相清空；`measure-first-screen.mjs:39-44` 逐文件 `statSync`，读到半成品就得到错数）。改过 `src/` 的构建与首屏数字由**根代理**在轮末串行跑一次（`npm run verify`）。
4. **首屏与新预算**：内部 310,000 B（只 WARN）/ 硬线 320,000 B（exit 1）。T2 与 T3 的产品增量预计 < 400 B gzip，远在 24,063 B 余量内，**不许为省字节做任何取舍**（产品负责人 ③）。
5. **E2E 环境**：dev server `http://localhost:5175` 已跑（不要重启、不要另起）；浏览器只用 CDP **9222**，不要启动 Edge、不要 kill `msedge`；**每个脚本前跑** `node .tmp/reset.mjs 9222`（它会关掉该端口所有 localhost 页面并清 localStorage/IndexedDB，所以两个 e2e **绝不能同时跑**）。自写脚本放 `.tmp/e2e-r35-*.mjs`，连接方式抄 `scripts/annotation-flow.mjs:71-83`（`chromium.connectOverCDP` + `page.route` + `addInitScript`）；结尾 `page.close()` 后 `process.exit(...)`，否则进程不退（AGENTS §8）。
6. **测试文件必须在 `package.json` 的 `test` 脚本里登记**（`prompt.test.ts`、`settings.test.ts` 已在，`annotations.test.ts` 也在）。**不新建测试文件**，`npm test` 仍是 22 个文件，条数由 287 变成实跑值（预计 293–295，以实跑为准，写进 `impl.md`）。
7. **禁止把 `round-35/findings-*.md` 里的「建议」直接当已完成事项写进 README/CHANGELOG**；只写本轮实测通过的行为，测不了写 UNVERIFIED 并给补测方法。
8. **PowerShell 脚本保持 UTF-8 BOM**（`packaging/installer.ps1`、`packaging/verify-installer.ps1`、`packaging/portable.ps1` 都含中文，AGENTS §8）。改完先做语法解析（见 T1 验收），**不许真的跑 `packaging/*.ps1`**（会写 `release/`，本轮禁止）。
9. **`dist/` 不重建**；截图只落 `shots/round-35/`，**不要覆盖** `shots/round-05/`、`shots/round-08/` 里已跟踪的历史截图（本轮不跑 `keyboard-acceptance`，它会写 `shots/round-05/`）。

---

## T1（P0）体积护栏换挡：首屏 310,000 / 320,000，安装包 1,800,000 / 2,000,000

**为什么**：产品负责人 2026-11-17 决定（`docs/iteration/STATE.md:159`）：安装包内部预算 1,800,000 B / 硬线 2,000,000 B；首屏内部 310,000 B / 硬线 320,000 B；首次真实打包后按实测 +5% 复核。现在首屏 285,937 B / 286,000 B **只剩 63 B**，`npm run verify` 会在本轮第一次 `src/` 改动后变红；安装包 824,209 B 超旧内部预算 4,209 B。本轮不换线，②③ 都过不了门禁。

**改动文件/位置**（每处都写全，执行时逐条勾）

| # | 文件 | 改什么 |
| :--- | :--- | :--- |
| 1 | `scripts/measure-first-screen.mjs:1-3,13,15,56,64-67` | `--max` 默认 **320000**（硬线，`>max` 仍 exit 1）；新增 `--target`，默认 **310000**（内部预算，超了只打 WARN，不 exit）；在现汇总行（`headroom=…` 保留原字段）之后另起一行打 `target=… gap=…`；头注释写清口径（只算 JS/CSS，不含 `dist/index.html`；宿主不发 gzip，见 `round-35/findings-ship.md` F1）与两条线。**`:13` 必改**（rev 1 漏了，rev 1 的验收 c 按字面执行必失败）：`positional` 现在只排除 `--max`/`--dir`，加 `--target 280000` 后 `280000` 会被当目录 → `readFileSync` ENOENT。一行替换成「跳过所有 `--` flag 及其后一个值」：`const positional = args.find((arg, i) => !arg.startsWith('--') && !(args[i - 1] ?? '').startsWith('--'))`（单独位置参数 `dist` 仍生效：`i=0` 时 `args[-1]` 视为空串） |
| 2 | `package.json:13` | `verify` 不动（`npm run build && node scripts/measure-first-screen.mjs`）——预算只在脚本默认值一处；**验收证明**它继承新默认 |
| 3 | `packaging/installer.ps1:4,88-89,112-115` | `820000` → **1800000**（`target=1800000 gap=` 语义不变：gap = 实测 − 内部预算，正数=超预算）；`850000` → **2000000**（`hard=2000000 B`、超线打印载荷占比后 `exit 1` 不变）；在打印 gap 后加一行：超 1,800,000 时 `Write-Warning`（**不 exit**，与 `measure` 的内部线同语义） |
| 4 | `packaging/portable.ps1:15` | `$threshold = 940000` → **2000000**（与安装包共用硬线）。**不留 940,000**：便携 zip 910,360 B，Mermaid 落地后必然超旧门槛，而产品负责人只给了安装包内部线；zip 不另设内部预算，理由写进 `packaging/README.md` |
| 5 | `packaging/verify-installer.ps1`（在 `:40-43` 的 setup 存在性检查块之后插入一段） | 新增体积护栏：`setup=<字节>`、`target=1800000 gap=`、超内部预算打 WARN（不 `Fail`）、**超 2,000,000 记 `Fail`**（用既有 `Fail`/`Pass`/`Unverified`，`:31-33`），未超记 `Pass`。「同步 verify-installer」= 让本地验收脚本也带同一条线 |
| 6 | `packaging/README.md:42,57` | `:42` 的「`target=820000 gap=`…硬报警线 850,000 B」→ 1,800,000 / 2,000,000；`:57` 体积预算段改成新两条线 + 「便携 zip 门槛 2,000,000 B，与安装包共用硬线，不另设内部预算」+ 0.32.1 实测 824,209 B |
| 7 | `README.md:99,101,110,185` | `:99` 首屏「临时上限 286,000 B（数据安全例外…余 63 B）」→「预算内部 **310,000 B** / 硬线 **320,000 B**（产品负责人 2026-11-17 放宽，原 286,000 B 例外作废），当前 285,937 B（距硬线余 **34,063 B**）」；同段安装包「内部 820,000 / 硬线 850,000」→「内部 **1,800,000** / 硬线 **2,000,000**，最新发布资产 824,209 B（本机重建 824,595 B），距硬线余 1,175,791 B」。**`:101` 现在就已过期**（本轮实测 `dist/assets/index-O0GdPjrm.js` raw=**896,224 B**，文中写 896,149 B）：改成 **896,224 B** 并保留「2026-11-17 实测」。`:110` 括号里的「内部预算 820,000 B，硬线 850,000 B 不动」→ 新两条线。`:185` Mermaid「本轮不实现（真实增量破 850,000 B 硬线）」→「**第 36 轮实现**（产品负责人 2026-11-17 批准，预算已放宽到内部 1,800,000 / 硬线 2,000,000），惰性方案与体积实测见 ADR 0017」。**285,937 B、34,063 B、896,224 B 都是 T1 时点的实测：T2/T3 落地后一定变大，由根代理按收尾 #2 用轮末 `npm run verify` 输出一次性回填（P2-1），执行代理不追第二次数** |
| 8 | `AGENTS.md:74`（§6） | 片段「KaTeX 惰性加载（首屏 gzip 285,937 B ≤286,000（数据安全例外，STATE 记理由），余 63 B）」→「（首屏 gzip 预算内部 **310,000 B** / 硬线 **320,000 B**）」。**只写两条预算线，不写 285,937 B 与 34,063 B**（P2-1：T2/T3 改主 chunk 后一定过期，且 T1 只读现有 `dist/` 拿不到轮末数）；实测 gzip 与余量由根代理按收尾 #2 回填。**§4 的「轻量是产品底线」句不改**，§6 末尾的「21 项有、18 项缺」**不动**（gap 表过期另列下一轮） |
| 9 | `docs/iteration/STATE.md:52` | **只改两条体积线**：首屏「临时上限 286,000，余 63 B」→「内部 310,000 / 硬线 320,000」，安装包补「内部 1,800,000 / 硬线 2,000,000」。**首屏实测字节（285,937 B）与余量（34,063 B）这一项不写**，由根代理按收尾 #2 用轮末 `npm run verify` 输出回填（P2-1）。**测试条数不写**（`22 文件 287 条` 原样保留，此时 T2 还没跑；由根代理按「轮次收尾 #2」一次性改，避免同一行两次编辑撞车）。`:55`/`:132` 的「下一轮优先」**不改**（根代理轮末重写）；`:158-160` 的决策记录已是最新，不改 |
| 10 | `docs/adr/0012-katex-lazy-loading.md:43` | Kill 判据 `measure --max 286000` → **320000**（并注明内部 310,000）；`:44-45` 的 `282,809 ≤ 285,000` 等**历史数字一律不改**（上一轮先例：不篡改记录） |
| 11 | `docs/adr/0017-mermaid-lazy-loading.md` | 结论从「本轮不实现」改为「**接受，第 36 轮实现**」。**标题与首段必须一起改**（rev 3，P2-2：只改正文会让 `:1` 还在说破线、`:3` 还在说本轮不实现）：**`:1` 标题**「…真实增量约 +650 KB raw 压缩后**仍破线**」→「Mermaid 惰性加载：首屏 0 B，真实最小增量 **1,474,881 B** 落在新线 **1,800,000 / 2,000,000** 内」；**`:3` 首段**末尾「所以这份 ADR 把…量清楚，本轮**不实现**」→「…量清楚，本轮**只量、第 36 轮实现**」；**`:13` 决定首句**是「**本轮不实现。** 理由不是首屏…破 850,000 B 硬线 624,881 B。需要产品负责人三选一：」→「**2026-11-17 接受，第 36 轮实现。** 产品负责人选了方案 1（放宽线，`docs/iteration/STATE.md:159`）；按新线档 1b **1,474,881 B 在内部预算内（余 325,119 B）**、档 2 **2,355,122 B 才破硬线**，因此接受、先按 Vite 真实 chunk 图实现、装完后重打包实测替换预估（+5% 复核）」。背景节预算换新（`310,000/320,000`、`1,800,000/2,000,000`）；**决定节还要补一句 AGENTS §4 的例外依据**（rev 2，P2-3）：「新增运行时依赖 `mermaid` 属 `AGENTS.md` §4『不新增运行时依赖，除非省下的代码比依赖大』的**例外**：依据产品负责人 2026-11-17 批准（`docs/iteration/STATE.md:159`），体积取舍与实测已在本 ADR 记录」；`:52` 改成「按旧线（850,000）都破线；按 2026-11-17 新线档 1b 在内部预算内、档 2 破硬线」；`:57` 「直接破 286,000 B」→「直接破 310,000 B 内部预算」；`:71-73` 状态改成「2026-11-17 接受（第 36 轮实施）」；**「若将来做」段（`:19`）末尾加一行第 36 轮待办**：「落地那轮在 `README.md` 的依赖与体积处补一行理由与实测字节（AGENTS §4）」。`:15-17` 的三个选项**保留**（历史记录，方案 1 已被选中，不删不改写）。**实测表（`:25-46`）与「否决的方案」的历史数字不改** |
| 12 | `.tmp/iteration/common.md:30` | 硬约束行「首屏 gzip ≤286,000 B」→「首屏 gzip ≤310,000 B（内部）/ 320,000 B（硬线）；安装包 ≤1,800,000 B（内部）/ 2,000,000 B（硬线）」 |

**CI 不用改，但必须留证据**：`.github/workflows/ci.yml:39`、`release.yml:82,155` 调 `measure` 时**不传 `--max`**，`ci.yml:97,100` 与 `release.yml:100,101` 调 `installer.ps1`/`portable.ps1`，预算只在脚本常量里 → 换线后 CI 自动跟随。验收要求跑一次 grep 证明 workflows 里 0 个预算字面量。

**实施步骤**

**0.（rev 2 新增，先做）改文件之前先跑「改前正向对照」并把数字贴进 `impl.md`** —— P1-2 要求每条「0 命中」都必须能被证伪，所以先证明这些模式**会**命中。命令原样照抄（下面全部是真 `|`，不是 `\|`）：

```powershell
# 改前期望 6
(Select-String packaging\installer.ps1 -Pattern '820,?000','850,?000').Count
# 改前期望 1（portable.ps1:15）
(Select-String packaging\portable.ps1 -Pattern '940,?000').Count
# 改前期望 >0：模式自证（-E 的「或」真的会命中；HEAD 版里旧线还在）
git grep -nE '286,?000|820,?000|850,?000|940,?000' HEAD -- README.md packaging/installer.ps1
# 改前期望 8 行：文档清单的改前状态
git grep -nE '286,?000|820,?000|850,?000|940,?000' -- README.md AGENTS.md docs/iteration/STATE.md packaging/README.md docs/adr/0012-katex-lazy-loading.md
# 改前期望 1：.tmp/iteration/common.md 被 gitignore，git grep 看不到，必须单独查
(Select-String .tmp\iteration\common.md -Pattern '286,?000').Count
```

改完再用同一批命令：旧值必须 0、新值必须 ≥1。**没有改前数字的那条不算验收**（rev 1 的 `'820000\|850000'` 就是字面竖线，恒 0）。

1. 改 `scripts/measure-first-screen.mjs`（**只加，不删** `:59-63` 的 katex/lazy 排除断言与 `:64-67` 的 exit 1 分支）。
   - **`:13` 先改**（P1-1）：`const positional = args.find((arg, i) => !arg.startsWith('--') && !(args[i - 1] ?? '').startsWith('--'))`。改完立刻用 `node scripts/measure-first-screen.mjs --target 280000; "EXIT=$LASTEXITCODE"` 自检，改 `:13` 之前这条必是 exit 1 + ENOENT。
   - 新增 `const target = Number(readArg('--target', '310000'))`；`max` 默认 `'320000'`。
   - 汇总行改成：`total raw=… gzip=… headroom=… files=… max=…`（保持原字段顺序，`headroom = max - totalGzip`，供第 34 轮验收规则继续可用），**下一行**打 `target=${target} gap=${target - totalGzip}`。
   - 在硬线 FAIL 之前加内部线分支：`if (totalGzip > target) console.log(\`WARN 首屏 gzip ${totalGzip} 超过内部预算 ${target}（越过 ${totalGzip - target} B），仍在硬线 ${max} 内\`)`；**不 exit**。
   - 头注释 3 行：口径（不含入口 HTML）、两条线、用法。
2. 改 `packaging/installer.ps1`（用 `edit` 工具，**不要用 PowerShell 字符串替换**；改完核对 BOM 与语法，见验收 k/j）。`target` 那行注释也改成「内部预算 1,800,000 B（2026-11-17 放宽）：超了 Write-Warning，不拦发布」。语法解析**按验收 j 的命令在当前会话直跑**（`Parser::ParseFile(... .Path, [ref]$null, [ref]$e)`），**不要**套 `powershell -NoProfile -Command "…"`（rev 3，P1-1：外层双引号会先展开 `$e`/`$null`，实测 exit 1 三条报错）。
3. 改 `packaging/portable.ps1:15` + 顶部注释一句（如原注释有 940,000 的说明一并改）。
4. 改 `packaging/verify-installer.ps1`：在 `:40-43` 的 setup 存在性检查块**之后**插入体积护栏段，用既有 `Pass`/`Fail` 计数（函数定义在 `:31-33`，插入点在其后）。
5. 逐条改文档（表 6–12）。数字口径统一写「内部 310,000 / 硬线 320,000」「内部 1,800,000 / 硬线 2,000,000」。**余量（距硬线余 34,063 B）只在 `README.md:99` 写一次**；`AGENTS.md:74` 与 `STATE.md:52` **不写实测字节与余量**（P2-1，由根代理轮末按收尾 #2 回填）。**不要**顺手改 `docs/iteration/round-*` 历史文件。
6. 跑验收命令（e/f/g/h/i/i2/j/k 全部照本表写法），把每条输出原样贴进 `impl.md`，**每条都带改前数字做对照**。

**验收标准（可执行；期望值已按 285,937 B 算好；退出码用 `...; "EXIT=$LASTEXITCODE"` 显式记录）**

| # | 命令 | 期望 |
| :--- | :--- | :--- |
| a | `node scripts/measure-first-screen.mjs` | **exit 0**；含 `gzip=285937`、`max=320000`、`headroom=34063`；下一行 `target=310000 gap=24063`；末行 `PASS`（若 `dist/` 已被别的东西动过，gzip 可能不同，**如实记录**再用实测数重算余量） |
| b | `node scripts/measure-first-screen.mjs --max 280000` | **exit 1**；`headroom=-5937`；末行 `FAIL 首屏 gzip 285937 超过上限 280000` |
| c | `node scripts/measure-first-screen.mjs --target 280000` | **exit 0**；含 `target=280000 gap=-5937` 与 `WARN 首屏 gzip 285937 超过内部预算 280000`；末行 `PASS`。这条 rev 1 按字面执行就是 **exit 1**（`280000` 被当目录，`measure-first-screen.mjs:13`，实测 `path='D:\Documents\SidelightProgram\280000\index.html'`），所以**必须贴退出码**，不改 `:13` 就不许勾这条 |
| c2 | 同一对命令连跑：`node scripts/measure-first-screen.mjs --max 280000; "EXIT=$LASTEXITCODE"` 与 `node scripts/measure-first-screen.mjs --target 280000; "EXIT=$LASTEXITCODE"` | 正向自检：第一条 `EXIT=1`、第二条 `EXIT=0`。这一对是「硬线拦、内部线只报警」的最小证明，也是 `:13` 修对的证据（`--max` 的值仍不会被当目录） |
| d | `node scripts/measure-first-screen.mjs --dir .tmp/nope` | 非 0 退出（证明目录错不静默 PASS，同时证明 `:13` 改动没把 `--dir` 弄坏）——**不做也行**，仅作为脚本没被改坏的旁证 |
| e | `packaging\installer.ps1`：改前 `(Select-String packaging\installer.ps1 -Pattern '820,?000','850,?000').Count` → **6**；改后同命令 → **0**；`(Select-String packaging\installer.ps1 -Pattern '1,?800,?000','2,?000,?000').Count` → **≥2** | 通过。**不用 `\|`**：`Select-String -Pattern` 是 .NET 正则，`'820000\|850000'` 匹配字面竖线，rev 1 那样写恒 0；`'820,?000'` 才能同时抓 `820000` 与 `820,000`（`installer.ps1:4/:115` 是带千分位的句子，无逗号写法抓不到） |
| f | `packaging\portable.ps1`：改前 `(Select-String packaging\portable.ps1 -Pattern '940,?000').Count` → **1**（`:15`）；改后 → **0**；`(Select-String packaging\portable.ps1 -Pattern '2,?000,?000').Count` → **≥1** | 通过 |
| g | `packaging\verify-installer.ps1`：`(Select-String packaging\verify-installer.ps1 -Pattern '1,?800,?000','2,?000,?000').Count` → **≥2**（改前实测 0，属新增内容，不需要 0 命中对照）；另 `(Select-String packaging\verify-installer.ps1 -Pattern '820,?000','850,?000','940,?000').Count` → **0**（改前 0、改后仍 0，只作「没混进旧线」的旁证） | 通过 |
| h | workflows 的 grep：照抄下面 **命令块 H**（`git grep -nE`，模式里是**真 `|`**，不要照表格里的写法抄） | **0 行**（预算不写死在 CI）。正向对照用步骤 0：同一 `-E` 模式在 `README.md` 与 `installer.ps1` 上 >0 |
| i | 文档清单的 grep：照抄下面 **命令块 I**（真 `|`） | **0 行**（改前 8 行，见步骤 0）。ADR-0017 允许保留历史数字：`824,595`、`838,981`、`1,474,881`、`2,355,122` 与「旧线 850,000」的对照句。**注意 `git grep` 只看已跟踪文件** |
| i2 | `(Select-String .tmp\iteration\common.md -Pattern '286,?000').Count` | 改后 **0**（改前 1，见步骤 0）。`.tmp/iteration/common.md` 被 gitignore，`git grep` 看不到它，必须单独用 `Select-String` 或 `read` 工具核对 |
| j | 语法解析三个 `.ps1`（**不执行脚本**，只用 Parser 解析）：在**当前 PowerShell 会话**逐条跑 `$e=$null; [void][System.Management.Automation.Language.Parser]::ParseFile((Resolve-Path 'packaging/installer.ps1').Path, [ref]$null, [ref]$e); $e.Count`，再各跑一次 `portable.ps1`、`verify-installer.ps1` | 三条都输出 `0`。**禁止**写成 `powershell -NoProfile -Command "…"`：外层双引号先展开 `$e`/`$null`，内层变成 `=; …ParseFile((Resolve-Path 'packaging/installer.ps1'), [ref], [ref]); .Count`，实测 **exit 1** 加三条报错（`= : The term '=' is not recognized`、`Argument: '2' should be a System.Management.Automation.PSReference`、`.Count : The term '.Count' is not recognized`）。必须套子进程时外层用**单引号**：`powershell -NoProfile -Command '$e=$null; [void][System.Management.Automation.Language.Parser]::ParseFile((Resolve-Path "packaging/installer.ps1"), [ref]$null, [ref]$e); $e.Count'`（实测输出 `0`、exit 0）。rev 3，P1-1 |
| k | BOM 检查：`[IO.File]::ReadAllBytes((Resolve-Path 'packaging/installer.ps1'))[0..2]` | `239 187 191`；三个脚本都一样 |
| l | `git diff --stat` 与 `git status --porcelain` | 只出现在本任务的文件清单里；`release/` 无改动、无新文件 |

**命令块 H / I（原样照抄；模式里的竖线是真 `|`，写成 `\|` 会变成字面竖线、恒 0 —— 这就是 rev 1 的 P1-2）**

```powershell
# H：CI workflows 不许出现任何预算字面量（旧线 + 新线都查）
git grep -nE '286,?000|820,?000|850,?000|940,?000|310,?000|320,?000|1,?800,?000|2,?000,?000' -- .github/workflows
# I：文档里旧线必须清零
git grep -nE '286,?000|820,?000|850,?000|940,?000' -- README.md AGENTS.md docs/iteration/STATE.md packaging/README.md docs/adr/0012-katex-lazy-loading.md
```

两条都是 `0 行` + `exit 1`（`git grep` 无命中返回 1，不是错误）。想确认模式本身有效，先跑步骤 0 的同类命令，必须 >0。

**门禁**：本任务不跑 `npm run build`/`npm run verify`（硬约束 3）；只跑步骤 0 与上表 a–l。`npm run verify` 由根代理轮末跑一次，要求末行 `PASS` 且 `max=320000`。

**风险**
1. `dist/` 是**上一轮产物**，若已被删则 a/b/c 无法跑：`Test-Path dist\index.html`，缺就让根代理先 `npm run build`，**不许自己 build**。
2. PowerShell 5.1 按 ANSI 读无 BOM 文件会报假语法错（AGENTS §8）——`edit` 工具写 UTF-8 时可能不写 BOM，**改完必须验 k**，缺 BOM 就用 `[IO.File]::WriteAllText($p, [IO.File]::ReadAllText($p), (New-Object Text.UTF8Encoding($true)))` 补回（这一步只重写字节，不改文本）。
3. `--target` 是新增 flag：`round-29` 之后 CI 不传参数，旧调用不受影响；`docs/iteration/round-*` 里历史命令里的 `--max 286000` 不改（历史记录）。
4. 便携 zip 门槛抬到 2,000,000 是**planner 的判断**（产品负责人只给了安装包内部线，zip 无独立数字）：写进 `packaging/README.md` 与 `impl.md`，若根代理/产品负责人另给 zip 口径，下一轮改一个常量（`portable.ps1:15`）。
5. ADR-0017 改写属「改决策记录」：只改结论/预算/状态与受新线影响的结论句，**实测表与历史对照数字一律不动**，防止篡改记录。新增的 AGENTS §4 例外句只加文字，不动任何字节数。
6. **验收命令本身会假阴**（P1-2）：`Select-String -Pattern` 是 .NET 正则，`git grep` 默认 POSIX BRE。所以 e/f/g/i2 用 `Select-String` + 多模式（`,` 分隔 = 或），h/i 用 `git grep -nE`，且**每条 0 命中都要有步骤 0 的改前 >0 对照**。看到某条「0 命中」但改前没数字，先补对照再判通过。
7. **`:13` 改动的回归面**：`positional` 只用于 `--dir` 的兜底（`:14`），改后单独位置参数（`node scripts/measure-first-screen.mjs dist`）仍应生效；验收 d 与 a 覆盖这两条路径。

**需要的截图**：无（不改界面）。`measure` 与 grep 的原始输出进 `impl.md`。

**可砍项**：`README.md:110` 与 `packaging/README.md:57` 的长句可以压短，但**不许**只改数字不留口径；`vite.config.ts:32,35,38` 的重复过期注释（finder 记 894,163 B / 53,776 B）**本任务可选、时间紧就不做**，超出 a–l 验收范围，做了要在 `impl.md` 单列。

---

## T2（P0）AI 提示词拆分：格式规则内置 system，设置只改 user prompt

**为什么**：产品负责人 2026-11-17（`STATE.md:158`）：格式/JSON 协议/安全规则内置为 system prompt；设置只暴露可编辑 user prompt；旧 `analysisPrompt` 自定义值迁移不丢；追问等其他 AI 调用一并审计；补单测、迁移测试与端到端。现状是一个 795 字的整段提示词当 system 用（`src/lib/ai.ts:21,25,122`、`src/lib/settings.ts:40,47,63-96`、`src/components/SettingsDialog.tsx:167-183`），用户改格式规则会让解析整条失败（`src/App.tsx:3719` 只能事后提醒）。

**目标形状**（一个请求两份消息，各自职责单一）

```
messages[0] = { role: 'system', content: ANALYSIS_SYSTEM_PROMPT }   // 内置，不进设置，不可编辑
messages[1] = { role: 'user',   content: buildUserMessage(context, settings.userPrompt, mode) }
                                        ↑ 作者偏好与检查重点（默认值可被用户在设置里改）
```

**改动文件/函数**

| # | 文件 | 改什么 |
| :--- | :--- | :--- |
| 1 | `src/lib/prompt.ts`（整段重写，仍只导出常量与一个纯函数） | 新增 `ANALYSIS_SYSTEM_PROMPT`（把现 `DEFAULT_ANALYSIS_PROMPT:6-27` 里的**全部格式与安全规则**搬进去：JSON Lines 协议与三行示例、`quote` 8–25 字/不跨段/不重叠、最多 1 条 revision、`overall` 全文总评、`evaluation` 不带 replacement、不编事实不换语体不加结论、「至少一条指出论证/结构/证据/读者动作」、`<前文>/<选区>/<后文>` 输入标记的说明）；新增 `DEFAULT_USER_PROMPT`（**只**放作者偏好与检查重点，约 90–120 字）；新增 `DISCUSS_SYSTEM_PROMPT`（把 `src/App.tsx:1563` 的字符串原样搬来）；`buildUserMessage(context, userPrompt = DEFAULT_USER_PROMPT, mode = 'local')`：作者偏好块放在最前（空白则整块省略），此后才是模式说明、`<前文>/<选区>/<后文>` 标记、`source/truncated` 说明；**删掉两处「按 JSON Lines 输出」**（`:44-45`），格式规则只留在 system |
| 2 | `src/lib/ai.ts:19-28,122` | `buildMessages(context, prompt = DEFAULT_USER_PROMPT, mode = 'local')`：system 固定 `ANALYSIS_SYSTEM_PROMPT`，user 用 `buildUserMessage(context, prompt.trim() ? prompt : DEFAULT_USER_PROMPT, mode)`；`remoteStream` 传 `settings.userPrompt`；删 `DEFAULT_ANALYSIS_PROMPT` import |
| 3 | `src/lib/settings.ts:17-20,40-47,63-96` | `analysisPrompt` → **`userPrompt`**（字段注释：作者偏好与检查重点，设置里可改）；`DEFAULT_SETTINGS.userPrompt = DEFAULT_USER_PROMPT`、`promptVersion: 3`；新增 `LEGACY_PROMPT_FINGERPRINT_V2 = '795:ebaf07b2'`（第 26–34 轮默认提示词指纹，planner 已实测：当前 `DEFAULT_ANALYSIS_PROMPT` 795 字 → FNV-1a `ebaf07b2`）；迁移逻辑：`raw = parsed.userPrompt ?? parsed.analysisPrompt ?? ''`；空白 → 默认；`savedVersion < 3 && (指纹===v1 || 指纹===v2)` → 默认（旧默认升级）；否则**原样保留**（自定义不丢）；`promptVersion = userPrompt === DEFAULT_USER_PROMPT ? 3 : savedVersion || 0` |
| 4 | `src/components/SettingsDialog.tsx:3,167-183` | label「批注提示词」→「**批注提示词（作者偏好）**」；`value={draft.userPrompt}`、`onChange` 改 `userPrompt`；「恢复默认提示词」→「恢复默认」并写 `DEFAULT_USER_PROMPT`；字段下加一行 `field-hint`：「格式与安全规则内置、不可改；这里只写你自己的偏好与检查重点。」**保留 `.dialog-textarea` 类名**（e2e 选择器） |
| 5 | `src/App.tsx:1562-1563` | discuss 的 system 直接 `content: DISCUSS_SYSTEM_PROMPT`（从 `./lib/prompt.ts` import）；消息结构（原文/批注/上下文/历史/问题）**不变** |
| 6 | `src/App.tsx:3713-3722` | **只删 `:3718-3721` 的 `if (!/json/i.test(safe.analysisPrompt)) { show(…) }` 块**（格式规则已内置，这条警告的语义已失效）。**`:3714` 的 `const safe = { ...next, fontSize: clampFontSize(next.fontSize) }` 原样保留**（rev 3，P2-4：这是设置对话框的字号钳制；`SettingsDialog` 的 `<input type=number>` 没有 onChange 钳制，`loadSettings` 只在重开时钳，删了手填 99 会一直生效到重载，且没有测试会红），`:3715-3717` 的 `setSettings(safe)`/`saveSettings(safe)`/`setSettingsOpen(false)` 也不动；删后 `npx tsc --noEmit` 与 `npm test` 不得有未用变量，并用验收 g2 证明 `clampFontSize` 仍在 |
| 7 | `src/lib/prompt.test.ts`（重写，现 38 行 3 条） | 见下「单测」 |
| 8 | `src/lib/settings.test.ts`（补迁移，现 54 行 3 条） | 见下「单测」 |
| 9 | `src/lib/annotations.test.ts:7,386-404` | 现两条用例改用新 API：`:7` 的 import 与 `:387-389` 的断言（`DEFAULT_ANALYSIS_PROMPT` → `ANALYSIS_SYSTEM_PROMPT` + `DEFAULT_USER_PROMPT`）；`:400-403` 的 `analysisPrompt` 用例改成 `userPrompt`（断言不变：自定义保留、空值回落默认）。**不删用例** |

**本轮不改、但要记账的旧脚本（rev 2，P2-2）**：`scripts/qa15.mjs` 会因提示词拆分失效——`:44` 断言默认提示词含 `'JSON Lines'` 且 `length > 100`、`:48` 读 `localStorage[…]` 的 `analysisPrompt` 键、`:53` 按文案 `'恢复默认提示词'` 找按钮、`:55` 再断言 `'JSON Lines'`。它**不在任何门禁里**（`npm test` 不跑 `scripts/`），README `:123` 把它写成手工探测脚本。本轮**不改**（改它要连带跑一次 5175 + CDP 的真实探测，吃 T2 的 17 分钟且它不是回归门），记进「不在本轮范围」第 10 条，`impl.md` 写一句「qa15 已知失效，未验」。另：`scripts/annotation-flow.mjs:74` 与 `host/fcp-probe.mjs:206` 仍写 `analysisPrompt`，**不用改也改不动**（迁移读 `userPrompt ?? analysisPrompt`；后者写的是 `'FCP-PROBE'`，迁移后原样成为作者偏好，对 FCP 探测无影响）。

**单测（写死期望，不需要真模型）**

`prompt.test.ts` 新增/保留 7 条：
1. `ANALYSIS_SYSTEM_PROMPT` 含全部格式与安全规则：`/只输出 JSON Lines/`、`/"kind":"overall"/`、`/最多 1 条 revision/`、`/至少一条指出/`、`/判断 \+ 依据/`、`/8–25 字/`、`/不编事实/`、`/<选区>/`，且 `length <= 1500`。
2. `DEFAULT_USER_PROMPT` **不含**格式/安全规则：`assert.doesNotMatch(DEFAULT_USER_PROMPT, /JSON|"kind"|overall|revision|不编事实|quote/)`；长度 `<= 300`。
3. `buildMessages`：`messages.length === 2`、`roles === ['system','user']`、`messages[0].content === ANALYSIS_SYSTEM_PROMPT`、`messages[1].content` 含 `作者偏好-35` 与 `<选区>`；`messages[0].content` **不含** `作者偏好-35`；`messages[1].content` **不含** `JSON` 与 `"kind"`（system/user 分离）。
4. 空白 `userPrompt` → 回落 `DEFAULT_USER_PROMPT`，且 user 消息里没有空标题（断言 user 以 `作者偏好与检查重点：` 开头且该行后面有内容；或断言相同上下文下 `buildMessages(ctx,'   ')` 与 `buildMessages(ctx)` 输出相等）。
5. 全文模式：`messages[1].content` 含 `模式：全文` 与 `结构性意见`，且仍**不含** `JSON Lines`；`messages[0].content` 仍含 `"kind":"overall"`。
6. `DISCUSS_SYSTEM_PROMPT` 含 `/不要编造/` 与 `/短/`，且不含 `JSON`。
7. 保留「提示词示例 JSON 可被 `parseStream` 解析」。

`settings.test.ts` 新增/改写 6 条：
1. 旧默认（**v1 指纹** `LEGACY_PROMPT_FINGERPRINT` 对应的文本形状）：`{analysisPrompt:'x'.repeat(5967)}` 这类指纹不匹配的**不会**被误升级 → 原样保留（沿用现用例）。
2. **v2 旧默认升级**：在测试文件里放 `const V2_DEFAULT_PROMPT = \`…\``（**改 prompt.ts 之前**从 `git show HEAD:src/lib/prompt.ts` 原样拷出 795 字旧默认；测试文件不进 bundle，不占首屏），先断言 `promptFingerprint(V2_DEFAULT_PROMPT) === LEGACY_PROMPT_FINGERPRINT_V2`，再断言 `{analysisPrompt: V2_DEFAULT_PROMPT, promptVersion: 2}` 读出来 `userPrompt === DEFAULT_USER_PROMPT`、`promptVersion === 3`。
3. **自定义不丢**：`{analysisPrompt:'我的自定义', promptVersion:2}` → `userPrompt === '我的自定义'`、`promptVersion === 2`（不是 3，也不被覆盖）。
4. **新键优先**：`{userPrompt:'新自定义', analysisPrompt:'旧自定义'}` → `'新自定义'`。
5. 空值/缺键 → 默认 + `promptVersion === 3`。
6. 落盘形状：`saveSettings(loadSettings())` 后 `JSON.parse(localStorage.getItem('sidelight.settings.v1'))` 有 `userPrompt`、**没有** `analysisPrompt`（迁移后不再写旧键）。

**端到端**（`.tmp/e2e-r35-t2-prompt.mjs`，先 `node .tmp/reset.mjs 9222`）

1. `chromium.connectOverCDP('http://127.0.0.1:9222')` → `browser.contexts()[0].newPage()`；`page.addInitScript` 写 `localStorage['sidelight.settings.v1'] = {apiKey:'e2e-key', analysisPrompt:'旧自定义-35'}`（**迁移入口**：模拟老用户）。
2. `page.route('**/chat/completions', …)`：把 `route.request().postData()` 解析后 push 到 `bodies`，然后 `fulfill` 一段固定 SSE（照 `scripts/annotation-flow.mjs:63-70` 的形状，至少一条 `meta` + 一条 `evaluation`，供截图与解析）。
3. `goto http://localhost:5175` → `.ProseMirror` 可见 → 点正文 → 打 `第一段说明安排。`
4. 点顶栏「设置」→ `[role=dialog]` 出现 → **读 `.dialog-textarea` 的 value，必须等于 `旧自定义-35`**（旧值迁移到 UI，不丢）→ 截图 `shots/round-35/t2-prompt-settings.png`（要能看见新 label 与 hint）。
5. `fill('.dialog-textarea', '自定义偏好-35：多查证据与结构')` → 点 `.dialog-actions .primary`（保存）。
6. 读 `localStorage['sidelight.settings.v1']`：`userPrompt === '自定义偏好-35：多查证据与结构'`、`analysisPrompt === undefined`（旧键不再写）、`promptVersion === 0`（自定义值保留原版本标记，**不是 3**——3 只给默认值，这样下次默认升级不会盖掉它）。
7. 点正文 → `Control+A` → 点 `.analyze-button` → 等 1500 ms。
8. 断言请求体：`messages.length === 2`；`[0].role === 'system'` 且 content 含 `只输出 JSON Lines`、`"kind":"overall"`、`不编事实`，**不含** `自定义偏好-35`；`[1].role === 'user'` 且 content 含 `自定义偏好-35`、`<选区>`，**不含** `JSON`、`"kind"`。
9. 截图 `shots/round-35/t2-prompt-rails.png`（批注出现在页边）。输出 `## t2-prompt {…}` 一行 JSON，`page.close()` 后 `process.exit(failed ? 1 : 0)`。

**验收标准**

| # | 命令 | 期望 |
| :--- | :--- | :--- |
| a | `npx tsc --noEmit` | exit 0 |
| b | `node --experimental-strip-types src/lib/prompt.test.ts` | 7 条全 PASS |
| c | `node --experimental-strip-types src/lib/settings.test.ts` | 6 条全 PASS（含 v2 指纹断言） |
| d | `node --experimental-strip-types src/lib/annotations.test.ts` | 全 PASS（条数不变） |
| e | `npm test` | 22 个文件、0 fail；**记下总条数**（预计 293–295）写进 `impl.md`，供根代理改 `README.md:117`、`AGENTS.md:39` |
| f | `git grep -n "DEFAULT_ANALYSIS_PROMPT" -- src` | **0 命中** |
| g | `git grep -n "analysisPrompt" -- src` | 只允许出现在 `settings.ts` 的迁移分支与 `settings.test.ts` 的迁移用例；**不得**出现在 `ai.ts`、`App.tsx`、`SettingsDialog.tsx` |
| g2 | `git grep -n "clampFontSize" -- src/App.tsx` | **3 行**：`:77` import、`:1730` 字号命令、`:3714` `commitSettings`（rev 3，P2-4：证明删 JSON 警告块时没连带删字号钳制。少于 3 行就是删多了） |
| h | `node .tmp/e2e-r35-t2-prompt.mjs` | 打印 `## t2-prompt` 且 4 条断言全 `ok:true`；两张截图存在 |
| i | `git diff --stat` | 只碰 T2 文件清单 + 两张新截图；不改 `src/styles.css`（不需要） |

**门禁**：a–i（含新增 g2）。**不跑** `npm run build`/`npm run verify`（硬约束 3）。

**风险**
1. **用户自定义文本含旧格式规则**：老用户把整段提示词改过（自定义），迁移后它会作为「作者偏好」拼在 user 消息最前，里面可能残留格式句。**不解析、不改写、不丢**（产品负责人要求「迁移不丢」）；在 `impl.md` 记一句「自定义文本原样作为作者偏好，用户可点『恢复默认』」。不得用删除/截断来「清洗」。
2. **指纹算错**：`LEGACY_PROMPT_FINGERPRINT_V2` 写错会让老默认用户看到 795 字整段文本、且格式规则被拼进 user 消息。靠单测 2 的自证断言（`promptFingerprint(V2_DEFAULT_PROMPT) === 常量`）拦住；**必须在改 `prompt.ts` 之前**取旧文本。
3. **`buildUserMessage` 参数换序**：调用点只有 `ai.ts` 与被重写的 `prompt.test.ts`；`git grep -n "buildUserMessage" -- src` 必须只剩这两处 + 定义。
4. **e2e 的 route 必须命中**：`apiKey` 非空才会走 `remoteStream`（`ai.ts:103`）；`addInitScript` 写的 key 是假 key，若 route 没命中会打真网并失败——失败先看 `bodies.length`，不要先怀疑产品。
5. **旧脚本不跟着改**：`scripts/annotation-flow.mjs:74` 仍写 `analysisPrompt: ''`（指向 5173、不在 `npm test` 里）。迁移逻辑读 `parsed.userPrompt ?? parsed.analysisPrompt` 且空值回落默认，所以它照样能跑；**本轮不改它**，也不把它当回归门禁。
6. **dev server 交付旧模块**：改完 `src/` 后 e2e 若看不到新 label，先按 AGENTS §8 用 ASCII 标记确认 dev server 已交付（如 `grep userPrompt http://localhost:5175/src/lib/settings.ts`），**不要改产品代码**；必要时请根代理重启 dev server（本轮不重启，记 UNVERIFIED）。
7. 真模型质量未验（无 Key）：格式与偏好分离后模型是否更听话，记 UNVERIFIED，补测方法：配真 Key 跑 3 篇不同文体。

**需要的截图**：`shots/round-35/t2-prompt-settings.png`（新 label + hint + 自定义值）、`shots/round-35/t2-prompt-rails.png`（批注正常出现）。

**可砍项**：单测里「user 消息以偏好块开头」这类格式细节、e2e 的第 9 步截图可砍；**不许砍** v2 指纹自证用例、自定义不丢用例、system/user 分离断言。

---

## T3（P1）Esc 之后焦点回正文；查找框开着时一个 Esc 只关查找

**为什么**：`findings-bug.md` 第 1 条是 **P1 静默吞键**：Esc 退出预览（4/4）、退出源码（3/3）、关快速打开（3/3）后焦点都在 `body`，下一次击键全部丢失，无提示、无错误；第 34 轮只修了查找那一条（`src/App.tsx:3502-3506` 的 `focusEditor()`），同族另三条没修。第 2 条是 P2：焦点在查找框时按一次 Esc，源码/预览会**连带退出**（源码 5/5、预览 3/3），一次按键两个动作。按产品负责人 ③「稳定性 > 核心功能」，这条排在本轮的第三位。

**根因**：`focusEditor()` 已存在（`src/App.tsx:327`）；源码/预览的 Esc 分支只切视图（`:3533-3541`），`switchView` 也不碰焦点（`:3762-3785`）；快速打开的 Esc 关闭只 `setQuickOpen(false)`（`:5089`，选中文件那条 `:5083-5088` 有 `focusEditor()`）。查找那条：`FindBar` 的 Esc 先关自己（`src/components/FindBar.tsx:46-53`、`:75-82`），事件继续冒泡到 window 的 Escape 分支（`src/App.tsx:3490`），新闭包里 `findOpen` 已是 `false`，于是同一个 Esc 又落到源码/预览分支。

**改动（5 行：3 处简单接线 + 查找那一组的 4a/4b。全部在既有结构上接线，不新增 hook）**

| # | 位置 | 改法 |
| :--- | :--- | :--- |
| 1 | `src/App.tsx:3538-3541` | `if (previewMode) { togglePreviewRef.current(); focusEditor(); return }` |
| 2 | `src/App.tsx:3534-3537` | `if (sourceMode) { toggleSourceRef.current(); focusEditor(); return }` |
| 3 | `src/App.tsx:5089` | `onClose={() => { setQuickOpen(false); focusEditor() }}`（与 `:5083-5088` 选中分支一致） |
| 4a | `src/components/FindBar.tsx:52,80` | 两个 Esc 分支改成 `event.preventDefault(); event.stopPropagation(); onClose()`（**只处理一次**：不再冒泡到 window 的 Esc 分支） |
| 4b | `src/App.tsx:4588-4591` | FindBar 的 `onClose` 按模式分派：先 `setFindOpen(false)`，然后 ① **源码** → `requestAnimationFrame(() => document.querySelector<HTMLTextAreaElement>('textarea.source-editor')?.focus())`；② **预览** → **明确不调用 `focusEditor()`**（写成 `else if (!previewMode) focusEditor()` 并加注释，不给「看起来修了」的空间）；③ 其余 → `focusEditor()`。**源码为什么要单独处理**：源码模式里 `.ProseMirror` 不在 DOM（`:4751-4772`），`focusEditor()` 是空操作，输入框被卸载后焦点掉到 body——不加 4b 就把第 1 条的 P1 复制到查找路径。**预览为什么要显式跳过**（rev 2，P2-1）：预览下唯一的 `.ProseMirror` 是 `src/components/PreviewPane.tsx:51-56` 的 `<article className="ProseMirror preview-pane" contentEditable={false}>`，**没有 tabindex**，`focusEditor()` 的 `.focus()` 对它不生效，`activeElement` 仍是 `body`。本轮**不给它加 `tabIndex`**（会让全局 `:focus-visible` 外框 `src/styles.css:147-150` 罩住整个预览 pane，要另配 CSS 与视觉复查，超出 T3 的 7 分钟），改用 e2e **d2** 证明：一次 Esc 只关查找、预览不退出；再按一次才退出且焦点回到可编辑正文 |

**为什么这么改而不是「记住 activeElement」**：`focusEditor()` 已经是本仓库的统一写法（`:323-327` 的注释、第 34 轮先例），三个 Esc 收尾动作的目标都明确是正文；4a 用一次 `stopPropagation` 让一个按键只处理一次，比给 window 监听加守卫 ref 少一层状态。

**实施步骤**

1. 改 4a（`FindBar.tsx`，两处）→ 改 4b（`App.tsx:4588-4591`）→ 改 1/2（`:3534-3541`）→ 改 3（`:5089`）。
2. `npx tsc --noEmit`。
3. 写 `.tmp/e2e-r35-t3-esc.mjs`（先 `node .tmp/reset.mjs 9222`），覆盖 **6 组（a/b/c/d/e/d2）**，**按 a→b→c→d→e→d2 顺序跑**（每组结束时的模式就是下一组的起点），每组断言写成一行 `## 名字 {…}`：
   - **a 预览**：点正文 → 打 `甲第一段。` → `Control+Shift+P` → 断言 `.ProseMirror` 的 `contentEditable === 'false'` → `Escape` → 等 250 ms → **`active` 以 `DIV.tiptap ProseMirror` 开头** → 打 `乙` → `innerText.length` +1（`landed:true`）。结束时在富文本态。
   - **b 源码**：`Control+/` → `textarea.source-editor` 存在 → `Escape` → 等 250 ms → `active` 是 `.ProseMirror` 且 `textarea` 消失 → 打 `丙` → 长度 +1。
   - **c 快速打开**：`Control+P` → 浮层出现 → `Escape` → 等 250 ms → `active` 是 `.ProseMirror` → 打 `丁` → 长度 +1。
   - **d 查找＋源码**：`Control+/` → `Control+F` → 焦点在 `.find-input` → `Escape` → 等 250 ms → **`find` 关闭且 `textarea.source-editor` 仍在**（P2，源码不退出）→ **`active` 是 `TEXTAREA.source-editor`**（4b）。结束时在源码态。
   - **e 查找＋富文本（回归，第 34 轮行为）**：`Escape` 退出源码 → `Control+F` → `Escape` → 打 `戊` → 长度 +1。结束时在富文本态。
   - **d2 查找＋预览（rev 2 新增，P2-1）**：`Control+Shift+P` 进预览 → 断言 `contentEditable === 'false'` → `Control+F` → `Escape` → 等 250 ms → **`find:false` 且 `editable:'false'`（预览没退出，`oneAction:true`）**，同时把 `active` 原样记下来（预期 `BODY.`，本轮显式不聚焦，**不作失败判据**）→ 再 `Escape` → 等 250 ms → `editable:'true'`（已回富文本）且 `active` 以 `DIV.tiptap ProseMirror` 开头 → 打 `辛` → 长度 +1（`landed:true`）。
   - 截图：a 组打字落地后 `shots/round-35/t3-esc-focus.png`；结尾 `page.close(); process.exit(failed ? 1 : 0)`。
4. **修复前先跑一次 a、d、d2**（先写好脚本的这三组，不改代码），把 `## a-before`/`## d-before`/`## d2-before` 的原样输出贴进 `impl.md`，作为「改前坏、改后好」的对照：a → `landed:false` 且 `active:"BODY."`；d → `sourceKept:false`（源码被同一个 Esc 一起退掉）；d2 → 第一次 Esc 后 `editable:'true'`（预览被一起退掉，`oneAction:false`）。若时间不够，可直接引用 `findings-bug.md` 的日志路径，**不许编造**。

**验收标准**

| # | 命令 | 期望 |
| :--- | :--- | :--- |
| a | `npx tsc --noEmit` | exit 0 |
| b | `node .tmp/e2e-r35-t3-esc.mjs` | **6 组**（a/b/c/d/e/d2）全 `ok:true`：`landed:true` 共 5 组（a/b/c/e/d2 的第二段）、`sourceKept:true`（d）、`oneAction:true`（d2 的第一次 Esc）；`## a…e` 与 `## d2` 共六行走原始 JSON |
| c | 同上日志里 `active` 字段 | 预览/源码/快速打开三组都是 `DIV.tiptap ProseMirror editor …`（不是 `BODY`）；d 组是 `TEXTAREA.source-editor`；**d2 第一次 Esc 后允许 `BODY.`（预览 pane 不可聚焦，本轮已知且显式选择，不作失败判据），第二次 Esc 后必须是 `DIV.tiptap ProseMirror editor …` 且打字落地** |
| d | `git diff --stat` | 只碰 `src/App.tsx`、`src/components/FindBar.tsx` + 一张新截图 |
| e | `npm test` | 与 T2 之后同条数（T3 不加单测） |

**门禁**：a–e。**不跑** `npm run build`（硬约束 3）；`keyboard-acceptance` 本轮不跑（它会覆盖 `shots/round-05/` 已跟踪截图，且焦点这三条已由 b 覆盖）。

**风险**
1. `focusEditor()` 用 `requestAnimationFrame`：视图切回后 `.ProseMirror` 在下一帧才有；e2e 每步等 **250 ms** 再读 `active`（第 34 轮脚本用的是同一量级）。
2. 源码模式下 `focusEditor()` 是空操作 → 必须靠 4b 的源码分支，否则 d 组会从「一次按键两个动作」变成「按键后焦点掉 body」，**属于把 P1 搬家**，验收 d 必须同时断言 textarea 还在且 `active` 是它。预览模式同理也是空操作，但那不可修（见 4b 理由），所以 4b 显式跳过 + d2 证明「再按一次就回正文」。
3. 预览态的 `.ProseMirror` 是 `contenteditable=false`，只有**退出预览那一帧之后**才可聚焦：`focusEditor()` 的 `requestAnimationFrame` 恰好落在新帧，所以 a 组断言的是退出之后的状态。若偶发 `active:"BODY."`，先看日志里 `editable` 是否已是 `true` 再判产品；不要为了这一步改用 `setTimeout` 时长凑结果。
4. `QuickOpen` 内部可能自有 Esc 处理（`src/components/QuickOpen.tsx:74-77`）：本次只改 App 的 `onClose`，若它自己也 `stopPropagation` 不会冲突（Esc 已经关浮层）。e2e 的 c 组证明落地。
5. T3 与 T2 都改 `src/App.tsx`：**T2 先做、T3 后做**，两处行号不重叠（T2 在 `:1562-1563`、`:3713-3722`；T3 在 `:3534-3541`、`:4588-4591`、`:5089`）。改完都跑 `npx tsc --noEmit`。
6. **d2 的两段式断言别写混**：第一段判 `find:false` + `editable:'false'`（预览没退出），`active` 只记录不判；第二段才判 `editable:'true'` + `active` 是 `DIV.tiptap ProseMirror` + 打字落地。把 `active` 当第一段的失败判据会在本轮设计下必然红（预览 pane 不可聚焦），那不是产品缺陷。
7. **不改 `PreviewPane.tsx`**：4b 走「显式跳过」而不是给预览 pane 加 `tabIndex`。若执行代理顺手加了 `tabIndex={-1}`，全局 `:focus-visible`（`src/styles.css:147-150`）会给整个预览 pane 画外框，必须同时改 CSS 并出新截图——超出 T3 预算，属于扩大范围。

**需要的截图**：`shots/round-35/t3-esc-focus.png`（Esc 后打字落进正文的一屏）。

**可砍项**：若 27 分钟时 T1/T2 未收口，**整个 T3 回滚不做**（`git checkout -- src/App.tsx src/components/FindBar.tsx` 只回滚 T3 自己那几行，不要连带 T2），在 `impl.md` 写「T3 未做，原因：时间预算」，并在下一轮排第一。T3 内部砍单顺序：**先砍 b（源码）→ 再砍 c（快速打开）**，**保留 a（预览退出）、d（查找＋源码，验 4b 源码分支）、d2（查找＋预览，验 4a 与预览分支）**——被砍的组在 `impl.md` 写「未验」并给补测命令，不许写成通过。

---

## 文件归属与执行顺序

**一个执行代理，严格串行 T1 → T2 → T3**（不存在并发构建、不存在第二个 CDP 页面）。三段文件不重叠：

| 段 | 文件 |
| :--- | :--- |
| T1 | `scripts/measure-first-screen.mjs`、`packaging/{installer,portable,verify-installer}.ps1`、`packaging/README.md`、`README.md`、`AGENTS.md`、`docs/iteration/STATE.md`、`docs/adr/0012-*.md`、`docs/adr/0017-*.md`、`.tmp/iteration/common.md` |
| T2 | `src/lib/{prompt,ai,settings}.ts`、`src/components/SettingsDialog.tsx`、`src/App.tsx`（`:1562-1563`、`:3713-3722`）、`src/lib/{prompt,settings,annotations}.test.ts`、`.tmp/e2e-r35-t2-prompt.mjs` |
| T3 | `src/App.tsx`（`:3534-3541`、`:4588-4591`、`:5089`）、`src/components/FindBar.tsx`、`.tmp/e2e-r35-t3-esc.mjs` |

- 若根代理临时要拆两个代理：**T1 与 T2 可并行**（文件不重叠），但 **T3 必须等 T2 提交完 `src/App.tsx` 再动**（同一文件），且两个代理不能同时跑 e2e（`reset.mjs 9222` 会互相关页面）。本轮按单代理排。
- `dist/` 只有根代理在轮末构建一次。

## 不在本轮范围（写清理由，避免下一轮重新论证）

1. **Mermaid 惰性渲染**（`findings-typora.md` A1，P0 但产品负责人已批）：产品负责人 ③ 明写「留到第 36 轮」。本轮只把 ADR-0017 改成「接受」并换预算（T1）。第 36 轮第一件事，且必须按真实安装包字节替换 ADR 的预估。
2. **工作区相对路径图片破图**（A2，P0）：要新增宿主路由 + 重建宿主 + `host-smoke`，45–60 分钟，超本轮上限（见「本轮取舍」第三条）。下一轮优先。
3. **图片落盘规则（A3）、行内 HTML（A4）、全屏（A5）、拖入 `.md`（A6）、表格列宽（A7）、排版偏好（A8）、大纲折叠增强（A9）**：都不是产品负责人本轮点名的 ①②，且 A4/A7 各自带「序列化/导出」风险，单独一轮做。
4. **`findings-ship.md` F1–F5**：F1 的「把 `index.html` 计入首屏集合」是**口径变更**（finder 自己写「需根代理定」），本轮只做零风险的一半：在 `measure` 头注释与 README 写清「首屏 = JS+CSS，不含入口 HTML；宿主不发 gzip」。F2（CI 死 upload / 未比对哈希）、F3（`install-verify` 用 ShellExecute）、F4（五件载荷写四遍）、F5（本地校验和）全列下一轮。
5. **`docs/typora-gap.md` 全表过期（应改「31 有 / 12 缺」）与 `README.md:81`、`AGENTS.md:74` 末尾的「21 项有、18 项缺」**：不属 ①②，且与 T1 的文档数字迁移混在一起容易漏改；单独一轮做全表核对。
6. **`vite.config.ts:32,35,38` 的重复过期注释**（894,163 B / 56 kB vs 实测 896,224 / 53,776）：T1 的可选小项，时间紧就不做。
7. **快速打开在源码/预览里的「一次按键两个动作」**（planner 本轮新读到的同族疑问，**未实测**）：`QuickOpen.tsx:74-77` 的 Esc 只 `preventDefault()` 不 `stopPropagation()`，而 App 的 Escape 分支清单里**没有** `quickOpen` 项——所以在源码/预览模式下按 Esc 关快速打开，可能同时退掉视图。findings 没测这个组合，本轮**不改**（无证据、无验收项）；下一轮先补一条 e2e 再决定是否给 QuickOpen 加 `stopPropagation`。写在这里是为了不让「同族问题」被当成已修完。
8. **`npm test` 条数进 README/AGENTS**：执行代理只写进 `impl.md`，根代理轮末改（避免执行代理与根代理各写一遍）。
9. **任何发版动作**：不 bump 版本、不写 CHANGELOG、不动 `release/`。
10. **`scripts/qa15.mjs` 因提示词拆分失效**（rev 2，P2-2）：`:44` 断言默认提示词含 `'JSON Lines'` 且 `length > 100`、`:48` 读 `analysisPrompt` 键、`:53` 按文案 `'恢复默认提示词'` 找按钮、`:55` 再断言 `'JSON Lines'`。它不在任何门禁里（`npm test` 只跑 `src/**/*.test.ts`），改它要连带跑一次 5175 + CDP 的真实探测（吃 T2 的时间），本轮**不改也不跑**；下一轮随提示词回归一起修这 4 行，或直接标成「历史探测脚本，已过期」。`scripts/annotation-flow.mjs:74`、`host/fcp-probe.mjs:206` 写旧键是**有意保留**（迁移分支读 `userPrompt ?? analysisPrompt`），不改。
11. **预览模式下关查找后焦点落在 `body`**（rev 2，P2-1 的取舍）：预览 pane 是 `PreviewPane.tsx:51-56` 的 `<article className="ProseMirror preview-pane" contentEditable={false}>`，无 `tabindex`，`focusEditor()` 对它无效；本轮**显式不聚焦**（4b 的预览分支），用 d2 证明「一次 Esc 只关查找，再一次才退出预览并回到可编辑正文」。**没有丢键风险**：预览是只读视图，没有输入目标，且窗口级快捷键（Ctrl+F / Ctrl+/ / Ctrl+Shift+P / Esc）由 window 的 keydown 统一处理，不依赖焦点。下一轮若要补：给预览 pane 加 `tabIndex={-1}` + 一条 `.preview-pane:focus { outline: none }`（否则全局 `:focus-visible` 会给整个 pane 画外框，`src/styles.css:147-150`），并补一张预览态截图。

## 轮次收尾（根代理，不在执行代理范围内）

1. 串行跑一次：`npm run verify`（= build + 首屏门，必须 `max=320000` + `PASS`）→ `npm test`（记 22 文件与条数）→ `npm run roundtrip`（只在改过编辑器/序列化时；本轮 T2/T3 都不改序列化，**可以不跑**，跑了记结果）。
2. **按轮末 `npm run verify` 输出一次性回填字节**（rev 3，P2-1）：`README.md:99` 的首屏实测 gzip 与「距硬线余 N B」、**`README.md:101` 的主 chunk 实测 raw**（T1 时点 896,224 B，T2 改主 chunk 后会再漂）、**`AGENTS.md:74` 的首屏 gzip 实测与余量**（T1 只写两条预算线，见 T1 第 8 项）、`docs/iteration/STATE.md:52` 的首屏/安装包两条线 + 实测字节与余量 + 测试条数；同时更新 `README.md:117` 与 `AGENTS.md:39` 的测试条数、轮次表第 35 行、`## 决策记录` 追加一行（体积护栏换挡 + 提示词拆分，2026-11-17）。**回填口径**：同一个实测数字只由根代理写一次（T1 阶段不写或只写 T1 时点值），避免同一轮同一个数两次编辑撞车。**`STATE.md:52` 的测试条数只由根代理这一次改**：执行代理按 T1 第 9 项只写两条体积线，条数留 287 不动（rev 2，P2-4）。
3. 写 `docs/CHANGELOG.md` 的 `## Unreleased（第 29–35 轮，未发版）` + 「第 35 轮」子段，**第三条按 T3 是否交付二选一**（见全轮硬约束 1）：T3 交付写「Esc 后焦点回正文、查找 Esc 只关查找」；T3 被砍只写 ①② 两条 + 一行「Esc 焦点修复（预览/源码/快速打开）顺延第 36 轮」。**不许**把被砍的 T3 写成已交付。
4. `git status --porcelain` 检查 `shots/round-05/`、`shots/round-08/` 有没有被覆盖；有就 `git checkout -- shots/round-05/`（本轮正常不该有，因为不跑 `keyboard-acceptance`）。`git status` 只应有本轮报告、截图与产品改动。
5. 提交：`round-35: 体积护栏换挡（310k/320k、1.8M/2M）、AI 提示词拆分（格式内置 system / 设置只改 user prompt）`，**T3 交付时**再加 `、Esc 后焦点回正文`；T3 被砍则提交正文记「T3（Esc 焦点）顺延第 36 轮」。**不 push**。

## 本轮 UNVERIFIED（计划阶段已知，执行/验收时要补）

1. **真模型质量**：格式与作者偏好分离后模型是否更听话——无 Key，只能验请求体形状；补测：配真 Key 跑说明书/散文/技术文各一篇。
2. **安装包真实字节**：本轮不改 `dist` 大小口径，也不打包；1,800,000 B 是真包装前的预算，首次真实打包（Mermaid 落地那轮）必须用实测替换 ADR-0017 的 1,474,881 B 预估并 +5% 复核。
3. **CI 的实际绿**：不 push，workflows 的换线只在本地静态验证（grep 0 命中 + 脚本默认值）。
4. **`packaging/verify-installer.ps1` 的新增体积段**：本机不跑安装器（会写 `release/`，且要 NSIS），只做语法解析与静态检查；下次手动验收时才会真跑到。
5. **macOS 侧**：本轮不改 `host-mac/`，WKWebView 下的焦点行为未验（本机 Windows）。
