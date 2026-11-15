# 第 01 轮 · 计划（rev2，回应 plan-review H1–H6）

基线 `342481b`，v0.16.3；门禁基线：类型检查通过、test 15 文件 162 断言全过、roundtrip 3/7、acceptance 9/9。5 个任务：A 组（builder）T1→T2→T5 串行，B 组（builder2）T4→T3 串行；T5 依赖 T1、T2、T4。T3 是 spike，任何任务不得依赖它。任务编号用 T，发现编号用 S/U/B/O。

## 构建与产物纪律（全员，H5）

- **禁止任何实施者跑 `npm run build`**：它会 `tsc` 全树检查并清空 `dist`，与他人的产物互踩；最终 `npm run build` 由根代理在 5 个任务全部完成后跑一次。类型检查用 `npx tsc --noEmit`；需要产物时 A 组用 `npx vite build --outDir .tmp/build-a`，B 组用 `.tmp/build-b`（`.tmp/` 已 gitignore，`vite build` 只清空自己的 outDir）。
- T3 不构建，直接复制当前 `dist`（已核实：`dist/index.html` 存在，合计 2,212,137 B）。`npm test` 可并发（只读）；`npm run roundtrip` 只由 T4 跑一次（它会重写 `docs/roundtrip-report.md`）。CDP：T1、T2 都用 9222，同一实施者串行；T3 用 9333。

## T1 货币写法打字不再被吞成公式（含回归测试）｜组 A（builder，先做）

- **目标**：打字输入 `价格 $5 到 $10 之间。` 后源码原样保留，KaTeX 节点增量为 0。
- **为什么现在**：发现 B1（数据损失，最高优先级）。`src/lib/mathInput.ts:31` 的行内规则只判 `latex` 非空，缺 `src/lib/math.ts:12` 的「内侧空白」判断；载入路径 `src/App.tsx:398` 有防护，打字路径没有，`Ctrl + S` 会把 `$5 到$10` 写进磁盘。
- **文件**：`src/lib/math.ts`、`src/lib/mathInput.ts`、`src/lib/math.test.ts`、`scripts/acceptance.mjs`、`scripts/shot.mjs`
- **步骤**
  1. `src/lib/math.ts` 抽出并导出 `isMathBody(body)`（`!/^\s/.test(body) && !/\s$/.test(body)`），`protectMathPairs` 改调用它；现有 7 条断言行为不变。不要另写第二套判断。
  2. `src/lib/mathInput.ts` 行内规则 handler 开头加 `const body = match[1]; if (!body.trim() || !isMathBody(body)) return`；块级 `$$…$$` 与「空行打 `$$` 回车」不动。
  3. `src/lib/math.test.ts` 加 3 条：`isMathBody('5 到 ') === false`、`isMathBody('E=mc^2') === true`、`isMathBody(' x ') === false`；handler 是否真的调用谓词由 acceptance 守（`npm test` 碰不到 Tiptap）。
  4. `scripts/acceptance.mjs` 在「草稿恢复」后加一步：**先 `await page.locator('.editor').click()`**（照抄 `:26`，刷新后焦点在 body），再 `Control+End`，输入 ` 价格 $5 到 $10 之间。`；记 `before`/`after` 的 `.editor .katex` 数，断言 `after === before`（不写死绝对值）；切源码断言 `.source-editor` 含 `$5 到 $10`，切回；打印 `PASS 货币不吞字`。
  5. `scripts/shot.mjs`：插入公式后记 `before`（此刻 katex=1）；打完货币打印 `katex delta: ${after - before}`（期望 `0`，绝对值 1，不是 0）；截图路径改成 `shots/round-01/t1-currency.png`。
- **验收（可命令化）**
  - `npm test` exit 0，162 → 165 断言，0 失败。
  - `node scripts/acceptance.mjs http://localhost:5173` 输出 `PASS 货币不吞字`，共 10 条全 PASS。
  - `node scripts/shot.mjs` 输出 `katex delta: 0`、`source has currency: true`、`console errors: none`；`shots/round-01/t1-currency.png` 存在。
- **门禁**：`npx tsc --noEmit; npm test; node scripts/acceptance.mjs http://localhost:5173; node scripts/shot.mjs`（dev 在 5173、CDP 9222）
- **风险与回退**：`$5-$10`（无空格）在两条路径上仍会被当公式，属既有行为，不是本轮新增；`$ x $` 从可变公式变为文字，与载入路径一致。回退：`git checkout -- src/lib/math.ts src/lib/mathInput.ts src/lib/math.test.ts scripts/acceptance.mjs scripts/shot.mjs`。
- **难度** S ｜ **量级** 45–60 行

## T2 构建只发 woff2 字体（字体 1,072,948 B / 59 文件 → 256,168 B / 19 文件）｜组 A（builder，T1 后）

- **目标**：构建产物（`.tmp/build-a`）里只留 19 个 woff2 文件，CSS 里只剩 woff2 来源，公式与字体仍正常加载。
- **为什么现在**：发现 S3 与 O2（20 个 face 发了 ttf/woff/woff2 三份），本轮性价比最高、直接对应「体积小巧」，且不改 `src/`。
- **关键事实（critic 已在 `.tmp` 复现）**：20 个 face 全有 woff2；`KaTeX_Size3` 的 woff2 是 3,624 B，小于 Vite 4,096 B 内联阈值，写成 CSS 里的 base64 data URI 且带 `format("woff2")`；删 20 ttf + 20 woff 后无 face 失源。目标产物：字体 256,168 B / 19 文件，build 合计 1,392,823 B。
- **文件**：`scripts/vite-woff2-only.mjs`（新建）、`vite.config.ts`、`scripts/acceptance.mjs`（在 T1 之后追加，同一实施者串行）
- **步骤**
  1. 新建 `scripts/vite-woff2-only.mjs` 导出 `woff2Only()`：在 `generateBundle` 里只保留每个 `@font-face` 的 `format("woff2")` 项（data URI 原样保留），`delete bundle[name]` 删除全部 `.ttf`、`.woff` 资产；硬自检缺一即 `throw`（让 build 红）：恰好 1 个 `.css` 资产、`@font-face` 数 = 20、每个 face 的 `src` 恰好 1 项且含 `format("woff2")`、CSS 中 `format("truetype")` 与 `format("woff")` 计数为 0、CSS 里每个 `/assets/*.woff2` 都在 bundle 中存在。
  2. `vite.config.ts` 加 `import { woff2Only } from './scripts/vite-woff2-only.mjs'` 与 `plugins: [react(), woff2Only()]`；不改 `src/`、不改 `package.json`。
  3. `scripts/acceptance.mjs` 在「公式渲染」后追加一条：`await document.fonts.ready` 后断言 `document.fonts.check('16px KaTeX_Main') === true`、`[...document.fonts].filter(f => /KaTeX/.test(f.family)).length === 20`、至少 1 个 `status === 'loaded'`；打印 `PASS 字体已加载`。
- **验收（可命令化，产物在 `.tmp/build-a`）**
  ```powershell
  npx tsc --noEmit; npm test; npx vite build --outDir .tmp/build-a
  $f = Get-ChildItem .tmp/build-a/assets -File   # 期望 woff2=19 woff=0 ttf=0 font=256168（基线 1072948）
  "woff2={0} woff={1} ttf={2} font={3}" -f ($f|? Extension -eq '.woff2').Count,($f|? Extension -eq '.woff').Count,($f|? Extension -eq '.ttf').Count,(($f|? {$_.Extension -in '.woff','.woff2','.ttf'}|Measure Length -Sum).Sum)
  $c = Get-Content (Get-ChildItem .tmp/build-a/assets -Filter *.css).FullName -Raw   # 期望 0 / 0 / 20（19 文件 URL + 1 data URI）
  "truetype={0} woff={1} woff2={2}" -f ([regex]::Matches($c,'format\("truetype"\)')).Count,([regex]::Matches($c,'format\("woff"\)')).Count,([regex]::Matches($c,'format\("woff2"\)')).Count
  (Get-ChildItem .tmp/build-a -Recurse -File | Measure Length -Sum).Sum   # ≤ 1,400,000（基线 2,212,137）
  ```
  - 生产构建：后台 `npx vite preview --outDir .tmp/build-a --port 4173 --strictPort`，再 `node scripts/acceptance.mjs http://localhost:4173` → 11 条全 PASS（含「公式渲染」「字体已加载」「无控制台错误」）；截图 `shots/round-01/t2-prod-formula.png`。
- **门禁**：上一组命令 + 生产 acceptance（11/11）
- **风险与回退**：CSS 重写失误由插件的 5 条硬断言与「字体已加载」双保险拦住（`.katex` 节点数不能证明字体加载，这也是 H4 的修法）。回退：删 `scripts/vite-woff2-only.mjs`、从 `vite.config.ts` 去掉插件一行、删 acceptance 的字体断言，重跑 build 到 `.tmp/build-a`。
- **难度** S–M ｜ **量级** 90–110 行

## T4 开源就绪文件 + package.json 元数据 + README 四处事实｜组 B（builder2，先做）

- **目标**：仓库有 LICENSE / CONTRIBUTING / `.gitattributes` / `.nvmrc` / CI，package.json 具备开源元数据，README 里不依赖本轮代码改动的假话改掉。
- **为什么现在**：发现 S2（法律上默认保留所有权利、无 CI、无换行策略）与 B3 的前三条；纯文档与元数据，`src/` 零改动。
- **文件**：`LICENSE`、`CONTRIBUTING.md`、`.gitattributes`、`.nvmrc`、`.github/workflows/ci.yml`（新建）、`package.json`、`README.md`、`docs/roundtrip-report.md`（`npm run roundtrip` 的生成物，归本任务）
- **步骤**
  1. `LICENSE`：MIT，`Copyright (c) 2026 Sidelight contributors`（调度方代产品负责人已定并记入 STATE.md，本轮不再征询；不写个人姓名）。
  2. `CONTRIBUTING.md`：门禁命令（含「实施者不跑 `npm run build`，只在收尾由根代理跑」）、测试数「以 `npm test` 输出为准」、提交格式 `round-NN: <一句话>`、加运行时依赖要写理由、ADR 与 GLOSSARY 位置。
  3. `.gitattributes`：`* text=auto eol=lf`、`*.md text eol=lf`、`fixtures/** -text`、`*.png binary`、`*.ico binary`；`.nvmrc` 写 `24`；`.github/workflows/ci.yml`：`on: [push, pull_request]`、`runs-on: ubuntu-latest`、`actions/checkout@v4` + `actions/setup-node@v4`（`node-version-file: .nvmrc`）、`npm ci`、`npm run build`、`npm test`。
  4. `package.json`：删 `"private": true`，加 `"license": "MIT"` 与 `"engines": { "node": ">=24" }`；`repository` 需真实地址，本仓库 `git remote -v` 为空，**不填占位 URL**，在 `impl-b.md` 记「待产品负责人给远程地址」；依赖段一律不动（`package.json` 只有本任务改）。
  5. `README.md` 按**内容锚点**改（绝对行号会漂，禁用行号）：先跑一次 `npm run roundtrip`，输出贴进 `impl-b.md`。(a)「现在能做什么」的「重开文档恢复批注」补「（有磁盘句柄时，未验证）」，同时删「现在不能做什么」的「批注不持久化：刷新或切换文件就没了。」（两句冲突）；(b) 目录树的 `6 个真实 .md 样本` → `7 个真实 .md 样本`；(c)「已知的重要问题」段里 `把 6 个真实样本读进编辑器内核再写回` 与同句 `当前结果：0 / 6 完全保真` **必须一起改**成 `7 个真实样本` 与 `3 / 7`（只改后半句会残留「6 个真实」，验收必挂）。不动的五处：「共 19 个」「九项验收」「qa2/qa3/qa4」「546 KB」「不会被误判成公式」（归 T5）。
- **验收（可命令化，全部按内容匹配，不依赖行号）**
  ```powershell
  Test-Path LICENSE,CONTRIBUTING.md,.gitattributes,.nvmrc,.github/workflows/ci.yml; Select-String -Path LICENSE -SimpleMatch 'MIT License','Copyright (c) 2026 Sidelight contributors'   # True×5；各 ≥1
  Select-String -Path .gitattributes -SimpleMatch '* text=auto eol=lf','fixtures/** -text'; Select-String -Path .nvmrc -SimpleMatch '24'
  Select-String -Path .github/workflows/ci.yml -SimpleMatch 'node-version-file: .nvmrc','npm ci','npm run build','npm test'   # 各 1
  Select-String -Path package.json -SimpleMatch '"license": "MIT"','"engines"'; Select-String -Path package.json -SimpleMatch '"private"'   # 前段各 1，后段 0 命中
  Select-String -Path README.md -SimpleMatch '批注不持久化','6 个真实','0 / 6'   # 0 命中（(b)(c) 两处都改才成立）
  Select-String -Path README.md -SimpleMatch '有磁盘句柄时，未验证','7 个真实','3 / 7'   # 各 ≥1
  ```
- **门禁**：上述命令 + `npm test`（不跑 `npm run build`）
- **风险与回退**：CI 无 remote，本轮不会运行，只校文件内容，不得当发布证据；`repository` 缺真实地址时留空并记录，不编造。回退：`git checkout -- README.md package.json`（只在 T5 开工前有效），删掉新增文件与 `.github/`。
- **难度** S ｜ **量级** 220–300 行

## T3 WebView2 宿主 spike（5 条验收，第 5 条不过只能记 UNVERIFIED）｜组 B（builder2，T4 后，时间盒 1 个工作日）

- **目标**：用系统 `csc.exe` 编出 `host/bin/Sidelight.exe`，把现有 `dist` 装进窗口，跑通 5 条验收，把结论写进 ADR-0004。
- **为什么现在**：发现 S1 与 findings-ship「第一步」。它前置时间最长；只占 builder2，与 A 组不同时段、不同文件，不会挤掉数据损失修复。整条 (b) 路径的前提是「WebView2 里文件读写真的可用」，本轮必须用第 5 条验收证明，不能用 `typeof` 糊过去（H2）。
- **文件**：`host/Program.cs`、`host/build.ps1`、`host/README.md`、`scripts/host-smoke.mjs`、`.gitignore`（只加 `host/bin/` 与 `*.zip`）、`docs/adr/0004-webview2-host-before-admin.md`
- **步骤**
  1. 取 SDK：`Invoke-WebRequest -Uri 'https://www.nuget.org/api/v2/package/Microsoft.Web.WebView2/1.0.4314.35' -OutFile .tmp\wv2.zip` → `Expand-Archive` 到 `.tmp\wv2`；**只有 `lib/net462`，没有 `net45`**（critic 实测，写进 `impl-b.md`）。`csc.exe` 为 4.8.9232.0（C# 5）。
  2. `host/Program.cs`（C# 5：不用 `?.`、不用插值）——`[STAThread]` 窗口 + WebView2；所有路径以 `AppDomain.CurrentDomain.BaseDirectory` 的 exe 目录为基准（不依赖 cwd）；`SetVirtualHostNameToFolderMapping("sidelight.local", <exe目录>\www, Allow)` 后导航 `https://sidelight.local/index.html`（`file://` 不是 File System Access 的安全上下文）；Mutex `Global\Sidelight` 单实例 + 命名管道转发 argv；`PermissionRequested` 对 `FileReadWrite` 一律 `Grant`；窗口标题 `Sidelight`；argv 文件**不拼 JS 字符串**：读字节转 base64，注入脚本解 base64 写入 `localStorage['sidelight.doc.v1']`（前端启动即从该键恢复，`src/App.tsx:189-212`）。注入脚本随每次顶层导航重跑，**必须一次性守卫**，否则 `location.reload()` 会无限重载：脚本先看 `sessionStorage['sl:argv-done']`，是 `'1'` 就直接 return；否则 `sl:argv-runs` 自增、写 `localStorage`、置 `sl:argv-done='1'`，再 `location.reload()`。宿主在首个 `NavigationCompleted` 后调 `RemoveScriptToExecuteOnDocumentCreated(id)` 兜底。
  3. `host/build.ps1`：先 `Test-Path dist/index.html`，缺失就报「先跑 npm run build」并退出（**自己绝不构建**）；`csc.exe /target:winexe /platform:x64 /r:lib/net462/*.dll` 编译，拷 `lib/net462` 程序集与 `runtimes/win-x64/native/WebView2Loader.dll`，再 `Copy-Item dist\* host\bin\www -Recurse`。
  4. `scripts/host-smoke.mjs`（playwright-core）：spawn exe（`WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS=--remote-debugging-port=9333`），连 CDP，打印 4 条 PASS/FAIL 与截图 `shots/round-01/t3-window.png`。
  5. `host/README.md` + `docs/adr/0004`：结论、Kill 结果、换 Tauri 2 的触发条件（拿到管理员权限或 GitHub Actions `windows-latest` 可用）、第 5 条是否执行。
- **验收（5 条，第 5 条必须真跑；先建 `.tmp\host-argv.md`（标记行含引号、反斜杠、换行）与 `.tmp\host-fs\sample.md`）**
  1. `powershell -ExecutionPolicy Bypass -File host/build.ps1` exit 0，`host/bin/Sidelight.exe` 与 `host/bin/www/index.html` 存在。
  2. 窗口标题：单独起一个实例，`(Get-Process Sidelight).MainWindowTitle` = `Sidelight`（PowerShell，验宿主代码，先测标题再跑 smoke）；smoke 另证 `document.title`、`.ProseMirror` 存在、控制台错误 0（页面级附加检查）。
  3. 单实例：`Start-Process` 起第一个，`Start-Process -Wait` 起第二个，第二进程 exit 0，`(Get-Process Sidelight).Count` = 1。
  4. argv：`Sidelight.exe .tmp\host-argv.md`（标记行含引号、反斜杠、换行）启动后 CDP 读到正文含该标记行；同时断言 `sessionStorage['sl:argv-runs'] === '1'`、`sessionStorage['sl:argv-done'] === '1'`、主框架 `framenavigated` 事件数 = 2（初次加载 + 1 次重载），证明脚本只注入生效一次、没有无限重载。
  5. 真实读写：起 exe → 点「打开文件夹」选 `.tmp\host-fs`（人工点选，或 `[System.Windows.Forms.SendKeys]::SendWait` 输入路径 + Enter）→ 打开其中真实 `.md` → 改一个字符 → `Ctrl + S` → `Get-FileHash` 前后对比 + 用 `Get-Content` 读回改动字符；截图 `shots/round-01/t3-fsa.png`。**此条不过，T3 只记 UNVERIFIED，ADR-0004 不得写「(b) 可用」，发布路径不得据此推进。**
- **判定表（五项分别判；UNVERIFIED 不判整轮 FAIL、不回滚，记作下一轮任务，STATE.md 已记此规则）**

  | 项 | PASS | FAIL（按 Kill criteria 停手） | UNVERIFIED（记下一轮） |
  | :--- | :--- | :--- | :--- |
  | 窗口 | build exit 0 且 `MainWindowTitle=Sidelight` 且 0 控制台错误 | 打不开 / 标题不符 / 白屏 | 缺 SDK 或无桌面会话 |
  | 单实例 | 第二进程 exit 0 且进程数 1 | 出现两个窗口 | 未测 |
  | argv | 标记行进正文且只重载 1 次 | 无标记 / 反复重载 | 未测 |
  | 渲染 | `.ProseMirror` 存在、无控制台错误 | 白屏或报错 | 未测 |
  | FSA | 第 5 条哈希变化且读回改动字符 | 手势后 reject / 无对话框 / 写入未落盘 | 第 5 条没跑 |
- **门禁**：`powershell -ExecutionPolicy Bypass -File host/build.ps1; node scripts/host-smoke.mjs` + 第 2、3、5 条的命令。判定按上表：出现 FAIL 行即按 Kill criteria 停手并写结论；出现 UNVERIFIED 行不判整轮 FAIL、不回滚，记下一轮任务（host 不进任何 npm 门禁）。
- **Kill criteria（任一触发即停手，当天写结论，不追加重试）**
  - 用户手势后选择器 reject（`NotAllowedError`/`SecurityError`/`AbortError`）；
  - 点「打开文件夹」不出现系统对话框；
  - 授权后 `getFileHandle` / `createWritable` 失败，或写完磁盘字节未变；
  - `showDirectoryPicker` 是 `undefined`；或从 build.ps1 起算 4 小时内出不了窗口。
- **失败回退**：删 `host/`、还原 `.gitignore` 两行、ADR-0004 标 blocked 并附证据，发布路径退回便携 zip（路径 c）；`src/` 未改，产品代码零风险。
- **难度** L（环境不确定性）｜ **量级** 550–750 行

## T5 文档数字收尾（只改文档，≤20 行）｜组 A（builder，T1+T2+T4 全部完成后）

- **目标**：README / AGENTS / ADR-0001 里的数字与安全声明跟本轮实测对齐，全任务改动 ≤20 行。
- **为什么现在**：H6 与发现 B3。这些数字依赖 T1（165 条、11 项验收）、T2（体积）、T4（README 已完成结构纠错），所以必须最后做；否则会像上一版计划那样写出「先声明、后实现」的假话。
- **文件**：`README.md`、`AGENTS.md`、`docs/adr/0001-document-tree-is-the-truth.md`（都按内容锚点定位，禁用行号）
- **步骤**
  1. README「现在能做什么」的「数学公式」条：把「货币写法（`$5 到 $10`）不会被误判成公式」改成实测行为：「内侧不能是空白的成对 `$` 才当公式；`$5 到 $10` 在打字与载入两条路径上都保留为文字（无空格写法 `$5-$10` 仍会被当公式）」。不要写「不再被误判」。
  2. README「依赖与体积」段：`打包产物约 2.1 MB…KaTeX 字体 546 KB（39 个文件）` 改成 T2 实测：字体 256,168 B / 19 文件、产物合计取 `.tmp/build-a` 实测值。
  3. README「跑起来」代码块：`npm test          # 上下文组装 + 批注解析，共 19 个` → `# 15 个文件、165 条断言`（取 `npm test` 实测）；`npm run acceptance # 九项验收` → `11 项验收`；`node scripts/qa.mjs  # …（另有 qa2/qa3/qa4）` 删掉不存在的 `qa2/qa3/qa4`，写实际存在的 `qa7.mjs`、`qa9.mjs`–`qa18.mjs`。
  4. `AGENTS.md`「## 3. 门禁」代码块的 `共 162 个` → `165 个`；ADR-0001「三条约束压住损失」第三条与「## 测量结果（2026-11-15）」段的 `6 个真实样本`/`0 / 6` → `7 个真实样本`/`3 / 7`，两阶段历史数字保留并标为历史。
  5. 宿主那一句写成条件句（T3 结果未定，不许当事实）：T3 PASS → README「依赖与体积」加一行「宿主 spike（`host/`）用 WebView2 SDK，只在宿主层，不进运行时依赖，已跑通」；T3 KILLED 或 UNVERIFIED → 写「宿主 spike 结论见 ADR-0004，发布路径退回便携 zip」；T3 完全没开工 → 本步不做，在 `impl-a.md` 标未完成。
- **验收（可命令化，按内容匹配）**
  - `npm test` 输出 165 条、0 失败；与 README 里的测试数一致。
  - `Select-String -Path README.md -SimpleMatch '不会被误判成公式','九项','qa2','546 KB','共 19 个'` 0 命中；`Select-String -Path README.md -SimpleMatch '11 项','165','256,168'` 各 ≥1。
  - `Select-String -Path AGENTS.md -SimpleMatch '共 165 个'` ≥1；`Select-String -Path docs/adr/0001-document-tree-is-the-truth.md -SimpleMatch '7 个真实样本','3 / 7'` 各 ≥1。
  - 行数：开工前 `git diff --numstat > .tmp/t5-before.txt`，收工后对比，三者新增+删除合计 ≤20 行。
- **门禁**：`npm test` + 上述 `Select-String` + `git diff --numstat`（与 `.tmp/t5-before.txt` 相减）
- **风险与回退**：数字与实测不一致时以实测为准、不改判定；ADR-0001 是决策记录，只动数字与一句当前结果，不动决策内容。回退逐行改回那 7 行，**不要 `git checkout README.md`**（会连带撤掉 T4 的改动）。
- **难度** S ｜ **量级** ≤20 行

## 文件归属与并行（零重叠，串行交接写清）

| 任务 | 组与顺序 | 独占文件 |
| :--- | :--- | :--- |
| T1 | A（builder，先做） | `src/lib/math.ts`、`src/lib/mathInput.ts`、`src/lib/math.test.ts`、`scripts/acceptance.mjs`、`scripts/shot.mjs` |
| T2 | A（builder，T1 后） | `scripts/vite-woff2-only.mjs`、`vite.config.ts`、`scripts/acceptance.mjs`（T1 后追加字体断言） |
| T4 | B（builder2，先做） | `LICENSE`、`CONTRIBUTING.md`、`.gitattributes`、`.nvmrc`、`.github/**`、`package.json`、`README.md`（结构行）、`docs/roundtrip-report.md`（生成物） |
| T3 | B（builder2，T4 后） | `host/**`、`scripts/host-smoke.mjs`、`.gitignore`、`docs/adr/0004-*.md` |
| T5 | A（builder，T1+T2+T4 后） | `README.md`（「数学公式」条 /「依赖与体积」段 /「跑起来」代码块）、`AGENTS.md`（门禁代码块）、`docs/adr/0001-*.md`（三条约束 + 测量结果段） |

- 源文件只在两处相接，且都是串行：`scripts/acceptance.mjs`（T1 改完 → T2 追加字体断言，同一实施者）与 `README.md`（T4 改结构行 → T5 改数字行，行号切开、T5 等 T4 结束才放行）；其余两两不相交。
- `package.json` 只有 T4 改。构建产物互不共享：A 组 `.tmp/build-a`，B 组 `.tmp/build-b`，T3 只读现有 `dist`。
- 报告：A 组写 `docs/iteration/round-01/impl-a.md`（T5 追加在同一文件末尾），B 组写 `impl-b.md`，根代理合并为 `impl.md`；T5 只指向 `impl.md`，不指向合并前的文件。
- 工作量：A ≈ 0.7 天（T1/T2/T5），B ≈ 1.25 天（T4/T3）；T3 时间盒到点即收，宁可写 KILLED/UNVERIFIED 也不交付半成品。

## 本轮取舍与不做

- 未选 U1（模拟批注标注）、U2（对话框焦点）、U3（对比度）、U4（窄窗口）：都要改 `src/App.tsx` 或 `styles.css`，会与 A 组抢同一批文件并翻倍界面回归；四条价值相近，适合整轮做，全部进第 2 轮主题。
- 未选 KaTeX 按需加载（难度 M，公式输入规则依赖扩展同步注册，有回归风险）与引用式链接/表格保真（属编辑器序列化，ADR-0001 已记为主动让出的代价）。
- 本轮不做：大重构、`App.tsx`/`styles.css` 拆分、依赖升级、需管理员权限的安装、真模型与真实搜索联网测试、换编辑器内核、任何实施者自行跑 `npm run build`。

## 本轮 Demo（≤3 条用户可见变化）

1. 写价格不再丢字：`价格 $5 到 $10 之间。` 打字后源码原样、KaTeX 节点增量 0（`shots/round-01/t1-currency.png`）。
2. 产物与将来安装包体积 −797.6 KB：字体 1,072,948 B / 59 文件 → 256,168 B / 19 文件，产物合计 2,212,137 B → ≈1,392,823 B。
3. 若 T3 五条全 PASS：双击 `host/bin/Sidelight.exe` 出 `Sidelight` 窗口，能打开真实目录并写回磁盘（`shots/round-01/t3-window.png`、`t3-fsa.png`）；第 5 条未跑则只报 UNVERIFIED，不计入 Demo。

## 风险最高的任务

**T3**。风险已从「能不能编出来」变成「WebView2 里文件读写到底能不能用」：critic 的探针只证明了 `showDirectoryPicker` 存在与虚拟主机可取信，用户手势后的读写仍未验证。缓解是 5 条验收把第 5 条设成硬门槛 + 4 条 Kill criteria + `src/` 零改动；最坏结果是一份写清证据的 ADR-0004（blocked），发布路径退回便携 zip，不影响其余四个任务与门禁。次高风险是 T2 的字体：`.katex` 节点不能证明字体加载，已用插件硬断言 + `document.fonts` 断言补上。

## 下一轮建议主题

**首次使用的诚实与可操作性**：U1（模拟批注必须有「模拟」标注）、U2（模态对话框焦点管理与 `aria-modal`）、U3（`--ink-faint`/`--mark` 达 4.5:1、字号上 12px）、U4（≤1119px 断点，顶栏动作不许被裁）。四条都在 `src/App.tsx` 与 `src/styles.css` 同一片区域，一轮可收，每条都带截图验收。T3 若五条 PASS，同轮加「宿主转正」小任务（图标 + `.md` 关联 + 冷启动基线）；若 KILL/UNVERIFIED，则做便携 zip + `scripts/size.mjs` 固化体积门禁。
