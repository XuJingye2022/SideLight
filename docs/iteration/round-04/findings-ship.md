# 第 04 轮 · 发布与文档（ship）发现

日期：2026-11-15。基线：`db4f617`（0.17.0），工作区 HEAD `bff19f9`。环境：Windows 11、Node 24.21、无管理员；应用 `http://localhost:5173`、宿主 `http://127.0.0.1:47821`、CDP 9224。
范围：只读 `src/`、`host/`、`packaging/`、`.github/`；本次写了 `.tmp/ship-probe.mjs`、`shots/round-04/ship-toolbar.png` 与本文件。
方法：逐条对照文件与实测（`npm test`、`git ls-files`、`Get-FileHash`、CDP 探针、注册表/目录只读探测）。没跑 `npm run build`，没写注册表。

## 结论摘要

| # | 结论 | 严重度 | 难度 | 建议交给 |
| :--- | :--- | :--- | :--- | :--- |
| S1 | AGENTS §5/§6 仍写「浏览器原型 / 未接 Tauri 壳 / 安装包等 Tauri」，与 0.17.0 实际相反；§7 交接清单漏 CHANGELOG 与 STATE | 阻断发布文档 | S | 文档任务（1 人，30 分钟） |
| S2 | README 的「跑起来 / 目录 / 已定决策 / 下一步 / 不能做什么」停在 0.17.0 之前：缺宿主与安装器命令、缺新建缺失、FCP 数字与 tester 实测不一致、下一步列的两项已做完 | 阻断发布文档 | M | 文档任务 |
| S3 | CHANGELOG 0.17.0 引用了不存在的 0.16.4–0.16.9；漏记货币吞字与应用图标；无链接、无测试数、无未验项 | 中 | S | releaser |
| S4 | CI 只有 ubuntu 门禁；宿主与安装包从未在干净机器上构建过（本机靠 `.tmp/wv2`、`.tmp/nsis` 缓存） | 中（发布可复现性） | M | releaser + CI |
| S5 | `shots/` 占跟踪字节 90.1%；37 个图无任何引用（2.75 MB）；`npm run shot` 把新图写进 `shots/round-01/` | 低（仓库重量） | S | 根代理 |

---

## S1 · AGENTS.md §5/§6/§7 与 0.17.0 实际不符

**证据**

- `AGENTS.md:70`：「**浏览器原型**：……**未接 Tauri 壳**，未验中文输入法……」。实际 0.17.0 已有桌面宿主与 per-user 安装包，且产品路线**不是** Tauri（ADR-0004：C# WebView2 宿主；Tauri 只在拿到管理员或改由 CI 出包时重评估）。
- `AGENTS.md:64`：「打安装包（**Tauri 接上之后**）」。实际安装包已存在：`release/Sidelight-0.17.0-win-x64-setup.exe` 827,198 B（`Get-ChildItem release` 实测），由 `packaging/installer.ps1` 出包。
- `AGENTS.md:76` §7：「收工改两处：README 的「现在能做什么 / 不能做什么」，以及被推翻的 ADR」。轮次实际还要改 `docs/CHANGELOG.md`（§5 自己要求）与 `docs/iteration/STATE.md`；§7 与 §5 不一致。
- 反证：`docs/iteration/STATE.md:63` 记第 3 轮 PASS-WITH-UNVERIFIED；`git log --oneline -1 db4f617` 的 commit message 写「loopback host cuts startup 2.2s to 0.3s, per-user installer」。文档落后于代码与看板。
- `AGENTS.md:38` 的「16 个文件、171 个」是对的：`npm test` 实测 16 个 `ℹ tests` 块、合计 171、fail 0（复跑命令见文末）。
- `AGENTS.md:42` 说「图落 `shots/`」，但 `scripts/shot.mjs:41` 固定写 `shots/round-01/t1-currency.png`；新图会覆盖第 1 轮证据。建议顺手改这句（见替换文本 A5）。

**影响**：新加入的代理会按 §6 认为「还没有桌面壳」，重复做宿主 spike；按 §5 会等 Tauri，永远不打包。§7 会让交接漏掉 CHANGELOG，历史版本记录继续断档（S3 就是这么来的）。

**建议**：按「AGENTS/README 替换文本」一节的 A1–A5 替换。改动只有 5 句，不碰其他章节。

**难度**：S（20–30 分钟，纯文本）。

---

## S2 · README 的现状段落后于 0.17.0，并漏了「新建缺失」

**证据**

1. `README.md:108-116`「下一步」列 3 项：① 行内 HTML 渲染（仍未做，对）；② 数学公式与导出（**0.9.0 / 0.8.0 已完成**，README 自己在 `:15`、`:28` 写了能用）；③ 表格行列界面（**0.8.0 已完成**，`:29` 写了工具条）。末尾「再套 Tauri 壳」与 ADR-0004 相反。
2. `README.md:39`「现在不能做什么」只写「没有自动更新、没有代码签名」，**没有写没有新建/另存为**。实测：`node .tmp/ship-probe.mjs` → `hasNew=false`；22 个按钮里无「新建」「另存为」；文档名 `示例 · 未命名.md`（截图 `shots/round-04/ship-toolbar.png`）。`docs/iteration/round-03/test.md:121` 也断言「全页无「新建」」。
3. `README.md:39/45` 漏未验项：中文输入法（`AGENTS.md:70` 自己承认未验）、安装后的 HKCU/开始菜单/真人双击/SmartScreen、`.md` 关联（只在 `packaging/README.md:55` 写）。
4. `README.md:60` 写「首屏 FCP **296 ms**；转发 reload 52 ms」。tester 第 3 轮复测为 **304 ms / 64 ms**（`docs/iteration/round-03/test.md:44`），ADR-0005 写 296/52。两个数都对，但 README 只给一个且与最新独立测量不符。
5. `README.md:71`「11 项验收：草稿、货币、查找、公式、字体、表格、导出、三处保真」只列 10 项；`scripts/acceptance.mjs` 的第 11 项是「无控制台错误」（`:132`）。
6. `README.md:77-90`「目录」缺 `host/`、`packaging/`、`scripts/`、`docs/iteration/`；`src/lib/` 只列 6 个文件，实际 21 个实现 `.ts` + 16 个 `.test.ts`；`src/components/` 只列 2 个，实际 13 个。
7. `README.md:92-98`「已定的技术决策」5 条里没有 ADR-0004（宿主）与 ADR-0005（回环固定 origin），而这是 0.17.0 最重要的两个发布决定。
8. 全文 0 处链接到 `docs/CHANGELOG.md`（`Select-String README.md -Pattern 'CHANGELOG'` 无结果）。
9. `README.md:16` 与 `:13` 重复讲视图互斥。

**影响**：README 是公开仓库的门面。「下一步」说要做已经做完的事，读者会以为功能不存在；不写「没有新建」，用户第一次用就撞上「Ctrl+S 下载到下载目录」；FCP 数字与验收报告不一致，发布说明会被质疑。

**建议**：按替换文本 B1–B10 改；改完跑一次 `README` 里的命令清单确认每条都能跑。T1/T2 落地后再换 B-note 里的两句。

**难度**：M（改 11 处，其中 3 处是整块重写；30–60 分钟）。

---

## S3 · CHANGELOG 0.17.0 覆盖不全、无链接、引用不存在的版本

**证据**

- `docs/CHANGELOG.md:7`：「首次给用户可见的……同时补上 **0.16.4–0.16.9** 没记的改动」。但 `git show cb36110:package.json`、`git show 6c9c2b0:package.json` 的版本都是 **0.16.3**；第 3 轮 `db4f617` 才跳到 0.17.0。仓库里从未有 0.16.4–0.16.9。这句话会让人去查六个不存在的版本。
- 漏记两处用户可见改动：
  - **货币吞字修复**：`git log -1 cb36110` 明写「fix currency swallowing」；`README.md:30` 仍在讲这条行为；0.17.0 条目一字未提。
  - **应用图标**：`packaging/sidelight.ico` 23,724 B、`packaging/icon-256.png` 进了 exe 与开始菜单；第 02 轮 `test.md:167` 有图标验收；0.17.0 未提。
- 格式对比：旧条目多数写「新增 N 个测试，测试总数 X」（如 `:28`、`:38`、`:79`）。0.17.0 没写测试数。当前 171（0.16.3 记的是 162，+9：`errorCopy` 6 条 + 第 3 轮新增文件），这是发布说明里能量化的质量证据，缺了。
- 链接：`Select-String docs/CHANGELOG.md -Pattern '\]\('` 在第 5–20 行 **0 命中**。0.17.0 提到 ADR-0005、安装器路径却不给链接；旧条目（如 `:98`、`:100`）都有 markdown 链接，前后不一致。
- 0.17.0 没写「未验 / 已知限制」：HKCU 卸载项、开始菜单、真人双击/SmartScreen、中文输入法、`.md` 未关联。首个用户可见版本，这些正是用户第一次装会遇到的。
- 日期与标题格式一致：`## 0.17.0 — 2026-11-15` 与旧条目同格式；commit 时间 `2026-11-15 19:27:17 +0800`，日期对。

**影响**：CHANGELOG 是发布说明草稿的唯一来源（AGENTS §5 第 4 步）。现在它既不完整，也指向不存在的版本；发布时会被用户与 reviewer 抓住。

**建议**：替换 `docs/CHANGELOG.md:7` 首段，并在 0.17.0 条目补 4 行（见下），同时把 ADR/打包文档做成链接。

```markdown
首次给用户可见的「能装、能读、能看清错误」一轮，同时补记第 1、2 轮（那两轮版本号仍是 0.16.3，没有单独发版）。
...
- 货币不再吞字：`$5 到 $10` 这种两边带空白的成对 `$` 按文字处理，打字与载入两条路径都保真（第 01 轮修复）。
- 应用图标：exe、窗口标题栏、开始菜单快捷方式都用同一枚青绿图标（`packaging/sidelight.ico`，第 02 轮）。
- 测试：16 个文件 171 条，0 失败（新增「错误文案」6 条）。
- 未验（首个安装包）：HKCU 卸载项、开始菜单快捷方式、默认安装路径、真人双击与 SmartScreen、中文输入法、`.md` 关联。卸载保留 `%LOCALAPPDATA%\Sidelight` 用户数据。
```

并在 0.17.0 条目内补链接：`（见 [ADR-0005](adr/0005-loopback-fixed-origin.md)）`、`（[打包说明](../packaging/README.md)）`。

**难度**：S（15 分钟）。

---

## S4 · CI 只有 Linux 门禁，宿主与安装包无法在干净机器复现

**证据**

- `.github/workflows/ci.yml:13-24`：唯一 job `gate` 在 `ubuntu-latest` 跑 `npm run build` + `npm test`。没有 Windows job，没有宿主、安装包、截图、roundtrip。
- `host/build.ps1:16-20`：缺 `dist/index.html` 或 `.tmp/wv2/lib/net462/Microsoft.Web.WebView2.Core.dll` 就直接 `exit 1`，脚本**自己不下 SDK**。本机 `.tmp/wv2` 是历史手下载的（9,818,548 B）。
- `packaging/installer.ps1:25-35`：缺 NSIS 才从 SourceForge 下 3.11；本机 `.tmp/nsis` 已有缓存（2,361,546 B）。
- 结论：本机能出 `release/*.exe`，靠的是两份没进 git 的 `.tmp` 缓存。换一台机器或 CI，`host/build.ps1` 第一步就退。ADR-0004:61 把「CI 有 windows-latest」列为换 Tauri 的触发条件之一——实际上**不换 Tauri 也能用 windows runner 出包**，这条触发条件应改成「CI 出包成熟后再评估 Tauri」。
- 可行性证据：runner 镜像自带 .NET Framework 4.8.1（`windows-latest`/`windows-2022`，见 [runner-images / StackOverflow](https://stackoverflow.com/revisions/42327029-4b17-4621-b9d5-a74b406ee7e7/view-source)）；WebView2 Runtime 随镜像提供（[actions/runner-images#9538](https://github.com/actions/runner-images/issues/9538)）；Windows runner 可跑 headed/UI（Playwright 只在 Linux 要求 Xvfb，见 [Playwright CI 文档](https://raw.githubusercontent.com/sand4rt/playwright/b003052fed67efb64823e3c4cdd6b133eec113e2/dotnet/versioned_docs/version-1.23/ci.mdx)）。
- `npm ci` 与锁文件同步：`npm ci --dry-run` → `up to date in 418ms`。16 个测试文件无 Windows 路径依赖（`grep 'C:\\\\|path.win32' src/lib/*.test.ts` 0 命中），ubuntu 门禁应能过。

**影响**：发布包目前只有这一台机器能造；没人能证明「干净 Windows 上能构建」。这也是安装四项 UNVERIFIED 的根因（见后节）。

**建议**：采用下一节完整 YAML。核心：`gate`（ubuntu）+ `windows-host`（windows-2022，构建 → 冒烟 → 安装包 → 上传产物）+ `install-verify`（仅手动触发，验 HKCU/开始菜单/默认路径）。

**难度**：M（YAML 60 行 + 1 次试跑；失败点见 YAML 后的风险表）。

---

## S5 · `shots/` 占仓库 90%，37 图无引用，截图脚本还写错目录

**证据**（`git ls-files` + `Get-Item` 实测）

- 跟踪 286 个文件、11,624,466 B；`shots/` 132 个文件、**10,478,102 B（90.1%）**。
- 37 个文件在全部 142 个跟踪文本文件（`.md/.mjs/.ps1/.ts/.tsx/.nsi/.txt/.yml/.json/.html`）里 0 引用，合计 **2,752,935 B（26.3%）**。例如 `shots/long-doc-annotations.png` 154,291 B、`probe-math-edit.png` 125,958 B、`prototype*.png` 3 张。
- 88 个文件只被 `docs/iteration/round-01|02|03` 的报告引用，合计 7,236,316 B（69.1%）。
- 7 个文件被「长文档」引用：只有 2 个被 ADR-0004 引用（`t3-window.png`、`t3-fsa.png`），另 5 个被第 3 轮验收报告引用（`acceptance.png`、`round-01/t1-currency.png`、`round-02/t4-portable.png`、`round-03/t4-first.png`、`round-03/t4-demo.png`）。
- 7 组重复内容、可去重 741,017 B（如 `round-01/ux-1440-settings.png` = `round-02/ux-1440-settings.png` 123,065 B；`round-03/ux-1440-{first,narrow,export-fail}.png` 三张同为 87,803 B）。其中多数仍有引用，**不能直接删**。
- 17 个跟踪图是脚本产物（`scripts/{acceptance,qa7,qa9–qa18,shot}.mjs`、`scripts/host-smoke.mjs`），合计 1,173,606 B，随时可重生成；`scripts/shot.mjs:41` 还硬编码了 `shots/round-01/`。

**影响**：每次 clone 多下 10 MB；`git status` 常出现「脚本重写已跟踪截图」的噪声（`docs/iteration/round-02/test.md:239`、`round-03/test.md:167` 都记了）；源码归档 10 MB 全是图。发布前应处理。

**建议**：两步清理 + `export-ignore`，步骤见「shots 清理步骤」。第一步 37 个文件不破任何链接，先做；第二步（88 个）在发布前做，用 tag 留档。

**难度**：S（脚本 15 行）。

---

## AGENTS / README 替换文本

### A. `AGENTS.md`（5 处）

| # | 位置 | 现文 | 替换为 |
| :--- | :--- | :--- | :--- |
| A1 | `:64` | 「3. 打安装包（Tauri 接上之后）。」 | 「3. 打安装包（Windows）：先 powershell -ExecutionPolicy Bypass -File host\build.ps1 编 C# 宿主（需 dist/ 与 .tmp\wv2 的 WebView2 SDK），再 packaging\installer.ps1 出 NSIS 安装包；便携包用 packaging\portable.ps1。产物在 release/，不进版本控制。」 |
| A2 | `:65` | 「4. 产出校验和与发布说明草稿。」 | 「4. 跑 packaging\verify-installer.ps1，记下 UNVERIFIED 项（HKCU、开始菜单、默认路径、双击/SmartScreen）；产出校验和与发布说明草稿。」 |
| A3 | `:70` | 整段：「浏览器原型：……21 项有、18 项缺。」 | 见下方 A3 代码块（两段） |
| A4 | `:76` | 「收工改两处：README 的「现在能做什么 / 不能做什么」，以及被推翻的 ADR。做不到的事写清楚原因，别留给下一个人猜。」 | 「收工改三处：README 的「现在能做什么」与「现在不能做什么」、CHANGELOG 当次条目、被推翻的 ADR；轮次结束由根代理更新 docs/iteration/STATE.md。做不到的事写清楚原因，别留给下一个人猜。」 |
| A5 | `:42` | 「……图落 shots/。」 | 「……图落 shots/round-NN/。npm run shot 目前固定写 shots/round-01/t1-currency.png，新图先手存，别覆盖旧证据。」 |

A3 替换全文：

```text
当前 0.17.0，Windows 桌面应用：C# WebView2 宿主（`host/`）加载 `dist`，per-user NSIS 安装包与便携 zip 在 `release/`（不进版本控制，打包脚本在 `packaging/`）。文件树、大纲、源码/预览/专注/打字机、页边批注与采纳、逐条追问、联网核对、长文批注定位、链接与公式就地编辑、frontmatter/脚注/行内 HTML/callout/公式保真、保存前对比、`.sidelight` 缓存、图片插入、查找替换、字号缩放、导出、表格工具条都能跑。测试 16 个文件 171 条。CI 只在 Linux 跑 build + test；Windows 宿主与安装包尚未进 CI。

没有新建与另存为：`Ctrl+S` 在没打开文件夹时把副本下载到系统下载目录，不给落点选择。未验：中文输入法（浏览器与宿主）、真模型与真实搜索接口（无 key）、安装后的 HKCU 卸载项/开始菜单/真人双击/SmartScreen、WebView2 缺失分支（仅静态检查）。质量报告里的 22 条问题已全部修完（见 [质量报告](docs/qa-report.md) 顶部）；对 Typora 的差距见 [差距表](docs/typora-gap.md)，当前 21 项有、18 项缺。

下一步写在 README 末节。改完状态就更新那一节，别另开地方。
```

### B. `README.md`（10 处）

| # | 位置 | 现文 | 替换为 |
| :--- | :--- | :--- | :--- |
| B1 | `:5` 句末 | 「……现有 **C# WebView2 宿主**（host/）、per-user 安装包与便携 zip（release/，打包脚本在 packaging/）。」 | 在原句后追加：「逐版本变更见 [docs/CHANGELOG.md](docs/CHANGELOG.md)。」 |
| B2 | `:13` 末 + `:16` | `:13` 末「四种视图互斥，进源码或预览会自动关掉专注与打字机。」；`:16` 整句「三种视图（编辑 / 源码 / 预览）互斥切换；离开源码时先把源码写回正文，不会丢字。」 | `:13` 末改为「四种视图互斥，进源码或预览会自动关掉专注与打字机；离开源码时先把源码写回正文，不会丢字。」；**删除 `:16` 整行** |
| B3 | `:39` | 「还没有自动更新、没有代码签名。安装用 release/Sidelight-0.17.0-win-x64-setup.exe（per-user……）；也提供便携 zip。」 | 首句扩成：「还没有自动更新、没有代码签名，也没有新建与另存为（Ctrl+S 在没打开文件夹时下载副本，不弹保存位置）；装完的 HKCU 卸载项、开始菜单快捷方式、默认安装路径、真人双击与 SmartScreen 尚未人工验。」后面安装说明保持原样。 |
| B4 | `:39` 之后 | — | 新增一条：「- 没有 .md 文件关联：双击 .md 不会用 Sidelight 打开，要在「打开方式」里手动选一次。」 |
| B5 | `:45` | 「真模型没测过：没有 key。」 | 「真模型没测过：没有 key。中文输入法（组合输入、候选窗、组合期间开对话框）在浏览器与宿主里都没验。」 |
| B6 | `:60` | 「……首屏 FCP 296 ms；……」 | 「……首屏 FCP 296–304 ms（两次独立测量：ADR-0005 的 296 ms、tester 的 304 ms），转发 reload 52–64 ms；……」 |
| B7 | `:62-73` | 「跑起来」整块 | 见 B7 代码块 |
| B8 | `:75-90` | 「目录」整块 | 见 B8 代码块 |
| B9 | `:92-98` | 「已定的技术决策」5 条 | 保留 5 条，追加 2 条（见 B9 代码块） |
| B10 | `:108-116` | 「下一步」整块（含「再套 Tauri 壳」） | 见 B10 代码块 |

B7 替换全文：

````text
```bash
npm install
npm run dev       # http://localhost:5173
npm test          # 16 个文件、171 条
npm run roundtrip # Markdown 往返损失测量，写 docs/roundtrip-report.md
npm run build     # 类型检查 + 打包
npm run shot      # 无头浏览器跑流程并截图（需先起 dev；当前固定写 shots/round-01/）
npm run acceptance # 11 项：草稿、货币、查找、公式、字体、表格、导出、三处保真、无控制台错误（需先起 dev + 无头浏览器）
node scripts/qa.mjs  # 缺陷探测：切换文档、设置、字号、批注漂移、空文档、专注模式（qa7、qa9–qa18 是单项探测）
```

桌面宿主与安装包（Windows，需要先有 `dist/`）：

```powershell
powershell -ExecutionPolicy Bypass -File host\build.ps1           # 编宿主到 host\bin；缺 WebView2 SDK 时按脚本提示取 .tmp\wv2
node scripts/host-smoke.mjs --fsa                                  # 宿主 7 项冒烟：窗口、渲染、argv、单实例、真实写盘
powershell -ExecutionPolicy Bypass -File packaging\portable.ps1    # 便携 zip -> release\
powershell -ExecutionPolicy Bypass -File packaging\installer.ps1   # NSIS 安装包 -> release\
powershell -ExecutionPolicy Bypass -File packaging\verify-installer.ps1  # 静默装/卸 + 断言
```
````

B8 替换全文：

````text
```text
src/
  App.tsx                 双栏骨架、分析流程、文件读写、页边定位
  main.tsx                挂载
  styles.css              全站样式（12px 小字、窄窗断点、暗色媒体查询）
  components/             文件树、大纲、页边批注、查找条、预览、设置、保存对比、状态栏、公式编辑器、浮层
  lib/                    上下文、批注、大纲、字数、frontmatter、脚注、HTML/callout、公式、导出、差分、图片命名、查找、缓存、搜索、错误文案
  lib/*.test.ts           16 个测试文件，与实现同目录
host/                     C# WebView2 宿主（Program.cs、build.ps1、冒烟与转发探针）
packaging/                NSIS 安装器、便携包、图标生成、安装/便携验收脚本
scripts/                  截图、验收、缺陷探测、往返测量、字体裁剪
fixtures/markdown/        7 个真实 .md 样本
docs/adr/                 架构决策记录（0001–0005）
docs/iteration/           每轮简报、发现、计划、实施、验收
release/                  安装包与便携 zip，不进版本控制
```
````

B9 追加两条：

```markdown
- 桌面壳：C#/.NET Framework + WebView2 宿主，零管理员；Tauri 2 只在拿到管理员/MSVC 或改由 CI 出包时重评估。见 [ADR 0004](docs/adr/0004-webview2-host-before-admin.md)。
- 宿主 origin：固定回环 `http://127.0.0.1:47821`，端口被占就报错退出，不换端口。见 [ADR 0005](docs/adr/0005-loopback-fixed-origin.md)。
```

B10 替换全文：

```markdown
按 [差距表](docs/typora-gap.md) 的排序：

1. 行内 HTML 渲染（现在是保真不渲染）。
2. 新建与另存为：补入口；没打开文件夹时保存先问落点，不再静默下载。
3. 中文输入法：浏览器与宿主各验一遍组合输入、候选窗、组合期间开对话框。

之后是主题与自定义快捷键，以及 `.md` 关联（只多「打开方式」候选，待产品负责人定）。桌面壳仍是 C# WebView2 宿主；Tauri 只在拿到管理员/MSVC 或改由 CI 出包时重新评估（见 [ADR-0004](docs/adr/0004-webview2-host-before-admin.md) 文末）。
```

### C. 本轮实现后（T1/T2 落地）再换的两句

若 T1（新建 + 保存落点）与 T2（输入法）通过验收，再改这两处，不要提前写：

- `README.md:33` → 「保存：Ctrl + S，有文件句柄时写回磁盘；没有句柄时先问存到哪个文件夹，不再直接下载。新建的文档第一次保存也走这一步。」
- `AGENTS.md` §6（A3 第 2 段首句）→ 「新建与另存为已能走完「新建 → 写 → 保存 → 再打开」，没有文件夹时保存先问落点。」
- `README.md:39` 首句删掉「也没有新建与另存为（Ctrl+S 在没打开文件夹时下载副本，不弹保存位置）」这半句。

---

## CI YAML（两段：主文件 + 可选 install-verify job）

```yaml
name: CI

on:
  push:
  pull_request:
  workflow_dispatch:

concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true

permissions:
  contents: read

env:
  # 本机实测的固定版本与哈希，取法见 host/build.ps1:18 与 packaging/installer.ps1:32
  WV2_VERSION: 1.0.4314.35
  WV2_SHA256: 90778DEB1B77E36292828B4B5833C9255C27533F40E0DDD55891AE718944EDC4
  NSIS_SHA256: C7D27F780DDB6CFFB4730138CD1591E841F4B7EDB155856901CDF5F214394FA1

jobs:
  gate:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version-file: .nvmrc
          cache: npm
      - run: npm ci
      - run: npm run build
      - run: npm test
      # 改动编辑器或 Markdown 序列化时再开这一行（AGENTS §3）
      # - run: npm run roundtrip

  windows-host:
    # 固定 2022：2026 年 windows-latest 迁到 VS 2026 / Server 2025，csc 路径与镜像都在变
    runs-on: windows-2022
    timeout-minutes: 25
    defaults:
      run:
        shell: pwsh
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version-file: .nvmrc
          cache: npm
      - run: npm ci
      - run: npm run build

      - name: Cache WebView2 SDK / NSIS
        uses: actions/cache@v4
        with:
          path: |
            .tmp/wv2
            .tmp/nsis
          key: tools-wv2-${{ env.WV2_VERSION }}-nsis-3.11

      - name: Fetch WebView2 SDK (pinned)
        run: |
          if (-not (Test-Path .tmp/wv2/lib/net462/Microsoft.Web.WebView2.Core.dll)) {
            Invoke-WebRequest -Uri "https://www.nuget.org/api/v2/package/Microsoft.Web.WebView2/$env:WV2_VERSION" -OutFile .tmp/wv2.zip -UseBasicParsing
            $h = (Get-FileHash .tmp/wv2.zip -Algorithm SHA256).Hash
            if ($h -ne $env:WV2_SHA256) { throw "WebView2 SDK hash mismatch: $h" }
            Expand-Archive .tmp/wv2.zip .tmp/wv2 -Force
          }

      - name: Fetch NSIS 3.11 (pinned)
        run: |
          if (-not (Test-Path .tmp/nsis/nsis-3.11.zip)) {
            New-Item -ItemType Directory -Force .tmp/nsis | Out-Null
            Invoke-WebRequest -Uri 'https://prdownloads.sourceforge.net/nsis/nsis-3.11.zip' -OutFile .tmp/nsis/nsis-3.11.zip -UseBasicParsing
          }
          $h = (Get-FileHash .tmp/nsis/nsis-3.11.zip -Algorithm SHA256).Hash
          if ($h -ne $env:NSIS_SHA256) { throw "NSIS hash mismatch: $h" }

      - name: Build host
        run: powershell -ExecutionPolicy Bypass -File host/build.ps1

      # 首次接入如果这条红了，先加 continue-on-error: true 跑 3 次确认是环境问题还是产品问题，再改回阻断
      - name: Host smoke (window / argv / single instance)
        run: node scripts/host-smoke.mjs

      - name: Build NSIS installer
        run: powershell -ExecutionPolicy Bypass -File packaging/installer.ps1

      - name: Checksums
        run: |
          $setup = Get-ChildItem release/Sidelight-*-win-x64-setup.exe
          $setup | Select-Object Name, Length | Format-Table
          Get-FileHash $setup.FullName -Algorithm SHA256 | Format-List

      - uses: actions/upload-artifact@v4
        with:
          name: Sidelight-win-x64-setup
          path: release/Sidelight-*-win-x64-setup.exe
          if-no-files-found: error
```

下面是可选的第三个 job，单独贴进同一个 `jobs:` 下（缩进两格）。它只手动触发，用产物装一次，替掉本轮三项 UNVERIFIED。

```yaml
  install-verify:
    # 会写 HKCU 与开始菜单；只在 workflow_dispatch 跑
    if: github.event_name == 'workflow_dispatch'
    needs: windows-host
    runs-on: windows-2022
    timeout-minutes: 20
    defaults:
      run:
        shell: pwsh
    steps:
      - uses: actions/download-artifact@v4
        with:
          name: Sidelight-win-x64-setup
          path: release

      - name: Install to default path (no /D)
        run: |
          New-Item -ItemType Directory -Force "$env:LOCALAPPDATA\Sidelight" | Out-Null
          Set-Content "$env:LOCALAPPDATA\Sidelight\keep.txt" 'keep'
          $setup = (Get-ChildItem release/Sidelight-*-win-x64-setup.exe | Select-Object -First 1).FullName
          $p = Start-Process $setup -ArgumentList '/S' -PassThru -Wait
          if ($p.ExitCode -ne 0) { throw "installer exit $($p.ExitCode)" }
          $dir = Join-Path $env:LOCALAPPDATA 'Programs\Sidelight'
          if (-not (Test-Path (Join-Path $dir 'Sidelight.exe'))) { throw "default path missing: $dir" }
          if (-not (Test-Path 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\Sidelight')) { throw 'HKCU uninstall key missing' }
          $lnk = Join-Path $env:APPDATA 'Microsoft\Windows\Start Menu\Programs\Sidelight.lnk'
          if (-not (Test-Path $lnk)) { throw 'Start Menu shortcut missing' }
          $apps = @(Get-StartApps | Where-Object Name -match 'Sidelight')
          if ($apps.Count -lt 1) { throw 'Get-StartApps did not list Sidelight' }
          'PASS default path + HKCU + Start Menu + Get-StartApps'

      - name: Uninstall and assert cleanup
        run: |
          & "$env:LOCALAPPDATA\Programs\Sidelight\uninstall.exe" /S
          $deadline = (Get-Date).AddSeconds(30)
          while ((Test-Path "$env:LOCALAPPDATA\Programs\Sidelight") -and (Get-Date) -lt $deadline) { Start-Sleep -Milliseconds 500 }
          if (Test-Path "$env:LOCALAPPDATA\Programs\Sidelight") { throw 'install dir left behind' }
          if (Test-Path 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\Sidelight') { throw 'uninstall key left' }
          if (-not (Test-Path "$env:LOCALAPPDATA\Sidelight\keep.txt")) { throw 'user data was deleted' }
          Remove-Item "$env:LOCALAPPDATA\Sidelight" -Recurse -Force
          'PASS uninstall cleanup + user data kept'
```

### 时长预估（冷 / 有 cache）

| job | 冷启动 | 有缓存 | 主要耗时 |
| :--- | ---: | ---: | :--- |
| `gate` | 1.5–2.5 min | 1–1.5 min | `npm ci` 40 s、build 25 s、test 4 s（roundtrip 另算，默认不开） |
| `windows-host` | 4–6 min | 2.5–4 min | `npm ci` 50 s、build 30 s、SDK 10 MB 下载 10–20 s、NSIS 2 s、冒烟 20–40 s、打包 15 s |
| `install-verify`（手动） | 3–5 min | 2–3 min | 安装 10 s、启动探测 0–30 s、卸载 10 s |

### 失败风险（按可能性排序）

| 风险 | 可能性 | 依据 | 缓解 |
| :--- | :--- | :--- | :--- |
| WebView2 在 runner 会话里起不来（无交互桌面） | 中 | runner 镜像自带 WebView2（[#9538](https://github.com/actions/runner-images/issues/9538)），Windows runner 支持 headed UI；但本仓库没在 CI 跑过 | 冒烟步骤先 `continue-on-error: true` 观察 3 次；只要窗口能出，就改回阻断 |
| SourceForge 下载 NSIS 失败或限速 | 中 | 社区反馈 choco feed 也会 flake（[open-design#6452](https://github.com/nexu-io/open-design/pull/6452/files)）；我们直连 `prdownloads` | 已固定 SHA256 + cache；再加 3 次重试 |
| 安装包硬线 840,000 B 被本轮 UI 改动顶破 | **高** | 现在 827,198 B，只剩 12,802 B（1.5%）余量；`packaging/installer.ps1:76` 超线直接 `exit 1` | 先确认本轮 `dist` 增量，或把线提到 850,000 并在 README 写预算 |
| `windows-latest` 漂移（Server 2025 / VS 2026） | 中 | 2026 年镜像迁移报告 | 固定 `windows-2022`，不跟 `-latest` |
| `csc.exe` 找不到 | 低 | Server 2022 含 .NET Framework 4.8.1；`host/build.ps1:21-24` 已有中文早退 | 镜像换版本时加 `Test-Path` 断言 |
| ubuntu 上 `npm test` 失败 | 低 | 16/171 本机通过；测试无 Windows 路径（grep 0 命中）；`npm ci --dry-run` 通过 | 保持 `gate` 不变 |
| `Get-StartApps` 看不到新快捷方式（shell 缓存） | 中 | 本机 `Get-StartApps` 可用（139 项）；新建快捷方式刷新时机不确定 | 先 `Test-Path` 断言，再 `Get-StartApps`，中间 `Start-Sleep 2`，失败只警告不 fail |

---

## shots 清理步骤

### 盘点

| 集合 | 文件 | 字节 | 占 `shots` |
| :--- | ---: | ---: | ---: |
| 全部跟踪截图 | 132 | 10,478,102 | 100% |
| 被「长文档」引用（ADR-0004） | 2 | 86,537 | 0.8% |
| 被第 3 轮验收报告引用 | +5 | +402,314 | 3.8% |
| 只被 round-01/02/03 报告引用 | 88 | 7,236,316 | 69.1% |
| 无任何引用 | 37 | 2,752,935 | 26.3% |
| 脚本会重新生成（其中 17 个已跟踪） | 17 | 1,173,606 | 11.2% |

**必须保留（7 个，488,851 B）**：

```text
shots/round-01/t3-window.png      47,510   ADR-0004:21
shots/round-01/t3-fsa.png         39,027   ADR-0004:24
shots/round-01/t1-currency.png    94,892   round-03/test.md:167
shots/acceptance.png              57,551   round-03/test.md:167
shots/round-02/t4-portable.png    99,085   round-03/test.md:167
shots/round-03/t4-first.png       89,521   round-03/test.md:127
shots/round-03/t4-demo.png        61,265   round-03/test.md:127
```

**第一步可移出（37 个，2,752,935 B，不破坏任何链接）**：
`shots/fixes2.png`、`guard.png`、`inline-math.png`、`long-doc-annotations.png`、`outline.png`、`probe-block.png`、`probe-long-annot.png`、`probe-math-edit.png`、`prototype.png`、`prototype-accepted.png`、`prototype-streaming.png`、`qa-annotations.png`、`risk-banner.png`、`save-dialog.png`、`selection.png`、`table-tools.png`、`typing-math.png`、`round-01/ux-1280-find.png`、`ux-1280-focus.png`、`ux-1280-opened.png`、`ux-1280-preview.png`、`ux-1280-sample.png`、`ux-1440-focus.png`、`ux-1440-longdoc-bottom.png`、`ux-1440-opened.png`、`ux-1440-preview.png`、`round-02/host-race.png`、`regress-math.png`、`regress-undo.png`、`regress-undo-paste.png`、`ux-1440-bubble-overlap.png`、`ux-1440-focus-first.png`、`ux-1440-save-dialog.png`、`round-03/ux-1119-narrow.png`、`ux-1120-narrow.png`、`ux-1440-narrow.png`、`ux-1440-typed.png`。

**第二步（88 个，7,236,316 B，会断报告里的图链接）**：其余全部，只留上面 7 个。做完后 `shots/` 从 10.5 MB 降到 0.49 MB（-95.3% 字节 / -94.7% 文件），仓库跟踪字节从 11.6 MB 降到 1.64 MB。

### 可执行步骤（现在不执行）

```powershell
# 0. 留档：删掉的图仍能从 tag 取回
git tag shots-archive-2026-11-15

# 1. 生成「保存清单」，余下全部移出（git rm --cached 保留工作区文件，再搬到 .tmp）
$keep = @(
  'shots/round-01/t3-window.png','shots/round-01/t3-fsa.png','shots/round-01/t1-currency.png',
  'shots/acceptance.png','shots/round-02/t4-portable.png',
  'shots/round-03/t4-first.png','shots/round-03/t4-demo.png'
)
$drop = git ls-files shots | Where-Object { $keep -notcontains $_ }
$drop | Set-Content .tmp/shots-drop.txt
foreach ($f in $drop) {
  $dest = Join-Path '.tmp/shots-out' ($f -replace '/', '\')
  New-Item -ItemType Directory -Force (Split-Path $dest) | Out-Null
  git rm --cached --quiet $f
  Move-Item ($f -replace '/', '\') $dest -Force
}
git commit -m "chore(shots): keep only the 7 screenshots linked from docs"

# 2. 校验：剩余 7 个、所有 md 引用都能命中
git ls-files shots | Measure-Object
(Get-ChildItem shots -Recurse -File | Measure-Object Length -Sum).Sum   # 488,851
git grep -n -o 'shots/[A-Za-z0-9_./-]*\.png' -- '*.md' | ForEach-Object {
  $p = ($_ -split ':')[-1]; if (-not (Test-Path $p)) { "MISSING $p" }
}
```

只做第一步（37 个）也可以，链接零风险，字节 -26.3%；第二步放到发布前。

### webp 与 `.gitattributes`

- 本机没有编码器：`Get-Command cwebp/magick/ffmpeg/pngquant/oxipng` 全部 `missing`，所以**本轮不转换**。
- 只有在第二步不删、要保留 88 张历史图时才值得转：`npx --yes @squoosh/cli --webp '{"lossless":1}' "shots/round-01/*.png" --output-dir shots/round-01`（本机未跑，需网络）。lossless 对文字截图不糊；按同类截图经验预计省 25–40%（**估算，未实测**），88 张 7.24 MB → 约 4.3–5.4 MB。转完要同步改 88 个引用里的 `.png` → `.webp`，再用上面的 `Test-Path` 校验。
- 只留 7 张时不做 webp：省不到 0.3 MB，却要改 ADR 与验收报告的链接，不划算。
- `.gitattributes` 现状已覆盖二进制：`*.png binary`、`*.webp binary`（`:6-7`），无需再加。建议只加一行，让源码归档不带截图：

```diff
+shots/** export-ignore
```

（`git archive` 生成的源码包会排除 `shots/`，10 MB；`docs/iteration/**` 是否也 export-ignore 由发布策略定，别默认加，审计记录通常要随源码走。）

---

## `.md` 关联决策备忘（一页，供产品负责人）

**结论：本轮不做；如果要做，只做安装器里的可选复选框，并且先解决卸载残留。**

**技术事实**

1. per-user 注册可行：`HKCU\Software\Classes\Applications\Sidelight.exe\shell\open\command`（含 `%1`）+ `SupportedTypes`（`.md`），或 `HKCU\Software\Classes\.md\OpenWithProgids` + 自定义 ProgID；再写 `HKCU\Software\RegisteredApplications` + `...\Capabilities\FileAssociations`，它才会出现在「设置 → 默认应用」。全部 HKCU，不需要管理员。
2. **抢不到默认程序**：Windows 8 起 `UserChoice` 有用户 SID 哈希保护，程序不能静默把自己设为默认；只有用户在「打开方式」里勾「始终使用此应用」才生效。所以收益最多是「多一个打开方式候选」，不是「双击即用」。
3. 现状下用户已经能做到同样的事：右键 `.md` → 打开方式 → 选择其他应用 → 在这台电脑上查找 → 选 `Sidelight.exe` → 勾「始终」。代价是首次要点 5 步，不需要我们写注册表。
4. 卸载风险是确定的：用户若已把它设为默认，卸载器删得掉我们写的键，删不掉 `UserChoice`；之后双击 `.md` 会指向不存在的程序（Windows 弹「找不到应用」），且我们无法在卸载器里静默修复，只能弹提示 + 打开「默认应用」页。
5. 关联启动是一条没测过的代码路径：双击 `.md` 走宿主 argv（已验 T3），但「从关联启动」的工作目录、单实例转发、中文路径引号、`.md` 关联右键菜单都要重测。
6. 安装器改动量：加 `MUI_PAGE_COMPONENTS` + 一个可选 Section（约 15 行 NSIS），卸载段删键 + `SHChangeNotify(ASSOCCHANGED)`。约 2–4 小时实现 + 1 小时测试。**未实测**：NSIS 静默安装（`/S`）是否会安装可选 Section——若会，`verify-installer.ps1` 的断言与 CI 行为都要跟着改。

**利**

- 首次设置少点 2–3 次（不同 Windows 版本的「打开方式」菜单步数不同）；安装包里出现「关联 Markdown 文件」，符合编辑器预期。
- 可选、默认不勾，不改变用户现有默认程序，可回滚。

**弊**

- 收益只是「候选多一个」，用户仍要手动确认；宣传成「关联 `.md`」会误导。
- 卸载残留默认程序是用户可见故障，修复路径在用户手里。
- 多一条启动路径要测；多一段注册表要在 CI 的安装验收里断言；多一处支持成本。
- 未签名 exe + 文件关联，双击时的安全提示更多，首启体验更差。

**建议**：不做。把「右键 → 打开方式 → 选择其他应用」写进 README 的安装后说明即可，零风险。若产品负责人仍要，作为 0.18 任务，前置条件三条：① 卸载提示与 `UserChoice` 残留方案定稿；② `/S` 下可选 Section 行为实测；③ 关联启动的 argv/单实例/中文路径测试通过。**最终由产品负责人定。**

---

## 安装 UNVERIFIED：四项能否换一种测法

本机实测（只读/只写文件系统，未写注册表）：

| 项 | 现状证据 | 可替代测法 | 结论 |
| :--- | :--- | :--- | :--- |
| HKCU 卸载项 | `HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall` 可读（5 个键），无 `Sidelight` 键；`HKCU:\Software\Sidelight` 不存在。第 3 轮静默安装跑过但键没留下（`round-03/test.md:56`） | 只能靠「安装器写 → 立刻读」。写 HKCU 违反本轮「不写注册表」，本机没有旁路：注册表虚拟化只对老 32 位程序的 HKLM 生效，HKCU 无虚拟化 | **本机不能测**；CI `install-verify` 或真人双击可测 |
| 开始菜单快捷方式 | `%APPDATA%\...\Start Menu\Programs` **可写**（探针写入 `.txt` 成功并删除）；`Sidelight.lnk` 不存在；`Get-StartApps` 可用（139 项） | 快捷方式是文件，但只有安装器会创建；单独造一个假 `.lnk` 不能证明安装器行为 | **本机不能测**；CI 用 `Test-Path` + `Get-StartApps` |
| 默认路径 `%LOCALAPPDATA%\Programs\Sidelight` | `%LOCALAPPDATA%\Programs` **可写**（探针建目录写文件成功），`Programs\Sidelight` 不存在。`packaging/README.md:49` 说「该路径在沙箱里可能被拒写」——**这句已过期** | 不带 `/D` 跑 `/S` 安装到默认路径，再查文件 | **本机差最后一步**：安装器同时写 HKCU，仍被「不写注册表」挡住；CI 可完整测 |
| 真人双击 / SmartScreen | 未签名 exe；`Get-FileHash` 已知；没有 MOTW 样本 | MOTW 可用 `Get-Item -Stream Zone.Identifier` 查，但只证明「下载标记」，不证明 SmartScreen 判定；SmartScreen 取决于下载来源、签名与信誉，无法脚本化 | **只能人工**；下载一次、双击一次、记下提示文案 |
| （附）WebView2 缺失分支 | `installer.nsi:73-75` 有 `MessageBox` + `Abort`；真正卸载运行时需管理员 | 无（需管理员） | 静态验收，保留 UNVERIFIED |

**可直接引用的本机探针输出**：`WRITE-OK C:\Users\WINDOWS\AppData\Local\Programs\.sl-probe`、`WRITE-OK ...\Start Menu\Programs`、`Get-StartApps total=139`、`Test-Path HKCU:\...\Sidelight = False`。
**建议改写 `packaging/README.md:45-49` 的沙箱三条限制**：第 2 条「HKCU 写入被吞」无法在本机复现/否证，改成「未复测」；第 3 条「`%LOCALAPPDATA%\Programs` 可能被拒写」与本机实测相反，删掉或注明「2026-11-15 复测可写」。

---

## 优化机会（3 条）

1. **截图路径参数化**（`scripts/shot.mjs:41`、`qa7/qa9–qa18` 共 14 个硬编码路径）：加 `SHOTS_DIR` 环境变量（默认 `shots/latest/`），并把 `shots/latest/` 加进 `.gitignore`。收益：新证据不再覆盖第 1 轮图（当前 `git status` 噪声的来源之一），也让 AGENTS §3 的「图落 shots/」成立。约 30 分钟。
2. **测试发现改成脚本**（`package.json:14` 一条 16 段的命令链）：写 `scripts/test.mjs` 用 `readdirSync('src/lib').filter(f => f.endsWith('.test.ts'))` 逐个 `spawn`，汇总退出码。收益：加测试文件不用改 `package.json`，也不再出现「STATE 写 15 个、AGENTS 写 16 个」这种漂移（`docs/iteration/STATE.md:24` 现在就写着 15）。约 20 分钟。
3. **安装包门槛有死代码**（`packaging/installer.ps1:67-74`）：`$threshold = $p + 10000` 只被打印，从未参与判断；真正生效的只有 `if ($p -gt 840000)`。要么删掉门槛说法，要么改成「相对上版 +10,000 B」的可执行判断（需要读上一版大小或写进文件）。同时 840,000 硬线只剩 12,802 B 余量，建议改成 850,000 或按 `dist` 增量预算。约 30 分钟。

---

## 附：复跑命令（全部只读）

```powershell
npm test 2>&1 | Select-String '^ℹ (tests|fail) '     # 16 块 / 171 / fail 0
git ls-files | Measure-Object                        # 286 文件
git ls-files shots | Measure-Object                  # 132 文件
(Get-ChildItem shots -Recurse -File | Measure-Object Length -Sum).Sum   # 10,478,102
Get-ChildItem release -File | Select-Object Name,Length                  # 827,198 / 904,736
git show cb36110:package.json | Select-String '"version"'               # 0.16.3（第 1 轮）
git show 6c9c2b0:package.json | Select-String '"version"'               # 0.16.3（第 2 轮）
node .tmp/ship-probe.mjs                              # hasNew=false，22 个按钮，截图 shots/round-04/
Test-Path 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\Sidelight'  # False
(Get-StartApps | Measure-Object).Count                # 139
```

外部依据（2026-11-15 查）：runner 自带 .NET Framework 4.8.1（[StackOverflow 引用 runner-images](https://stackoverflow.com/revisions/42327029-4b17-4621-b9d5-a74b406ee7e7/view-source)）、runner 含 WebView2（[actions/runner-images#9538](https://github.com/actions/runner-images/issues/9538)）、Windows runner 支持 headed（[Playwright CI 文档](https://raw.githubusercontent.com/sand4rt/playwright/b003052fed67efb64823e3c4cdd6b133eec113e2/dotnet/versioned_docs/version-1.23/ci.mdx)）、windows 镜像 2026 迁移与 NSIS 不保证预装（[迁移说明](https://blog.path-finder.jp/troubleshooting/github-actions-windows-latest%ea%b0%80-visual-studio-2026%ec%9c%bc%eb%a1%9c-%ec%a0%84%ed%99%98%eb%90%98%ec%96%b4-ci%ea%b0%80-%ea%b9%a8%ec%a7%80%eb%8a%94-%eb%ac%b8%ec%a0%9c-runner-images-issue-14016/)、[open-design#6452](https://github.com/nexu-io/open-design/pull/6452/files)）。外部信息只用于 CI 风险评估，仓库内结论均有本地证据。
