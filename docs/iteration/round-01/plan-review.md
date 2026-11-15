# 第 01 轮 · 计划审查（critic）

审查对象：`docs/iteration/round-01/plan.md`（基线 `342481b`，v0.16.3）。
审查方式：读计划、三份发现、`STATE.md`、`AGENTS.md`、ADR-0001..0003；按计划点名的源码与脚本逐条核对；在 `.tmp/` 里复跑关键实验（未改产品文件、未 commit、未写 `dist`）。
审查日期：2026-11-15。

## 结论：**REVISE**（rev2 复审）

H1、H2 是 blocker（rev1）：T1 的验收按字面执行永远不可能通过；T3 的四条 PASS 条件可以在「WebView2 文件读写其实不可用」时全绿。
H3–H6 是 major（rev1）：T3 的构建命令包名写错、T2 的验收查不出字体失效、并行只做了源文件隔离没做构建隔离、T4 的新文档会引入新的过期与断链。

**rev2（2026-11-15）**：H1、H2、H4、H5 已关；H3 已关（net462 / dist 前置 / 标题 / `.gitignore` 都按最小修法改），但 argv 新写法引入 N1；H6 未全关（LICENSE 仍由计划自述「lead 指定」）。新增 N1、N2、N3 三条 blocker 与 N4、N5 两条 major，见「rev2 复审」。

## 漏洞表（摘要）

| 编号 | 级别 | 一句话 | 影响任务 | rev2 状态 |
| :--- | :--- | :--- | :--- | :--- |
| H1 | blocker | `npm run shot` 的期望值写错，且 `scripts/shot.mjs` 不在 T1 文件表里；新验收步骤还漏了 `.editor` 点击 | T1 | **已关** |
| H2 | blocker | T3 把「WebView2 支持目录选择器」当前提；真实读写被排除在 PASS 外，Kill criteria 只覆盖 `undefined` | T3、ADR-0004 | **已关**（回合判定另见 N2） |
| H3 | major | SDK 1.0.4314.35 只有 `lib/net462`，计划的 `lib/net45` 命令会失败；`dist` 未入 git、构建门禁里没有先 `npm run build`；窗口标题验收测的是页面标题 | T3 | **已关**（argv 另见 N1） |
| H4 | major | T2 验收只数 `.katex` 节点，字体全挂也能 PASS；插件的自检只查 woff2 文件存在，查不出 face 丢源或正则失配 | T2 | **已关** |
| H5 | major | 两组都跑整树 `npm run build`；T2 的 build 会清空 `dist`，T3 同时从 `dist` 复制。文件表只证明源文件不重叠 | T2、T3、T4 | **已关**（roundtrip 另见 N6） |
| H6 | major | T4 的 README 货币声明依赖 T1 却先写、指向会被合并掉的 `impl-a.md`；AGENTS/ADR 数字会过期；LICENSE 擅自定了版权人，而 `package.json` 仍是 private 且无 license | T4 | **未全关**（LICENSE） |

## rev2 复审（2026-11-15）

只核对三件事：H1–H6 是否真关（看命令、文件归属、构建纪律，不看自述）、修订引入的新 blocker、T4/T5 的 README 行号与构建纪律。结论仍为 **REVISE**。

### H1–H6 状态

| 漏洞 | 状态 | 依据（rev2 计划） |
| :--- | :--- | :--- |
| H1 | **已关** | T1 文件表加了 `scripts/shot.mjs`（`plan.md:15`）；acceptance 先 click、记 before/after（`:20`）；shot 打 `katex delta: 0`（绝对值 1）并写 `shots/round-01/t1-currency.png`（`:21`）；验收与门禁都含 shot（`:25-26`）。 |
| H2 | **已关** | T3 改成 5 条验收，第 5 条必须真跑，4 条 Kill，ADR 不得写 (b) 可用（`plan.md:90-101`）。回合判定另见 N2。 |
| H3 | **已关（argv 另计）** | 全文 `net462`（`:85,87`）；`Test-Path dist/index.html` 前置（`:87`）；`.gitignore` 只加 `host/bin/` 与 `*.zip`（`:83`）；`MainWindowTitle`（`:92`）；exe 相对路径（`:86`）。argv 新写法见 N1。 |
| H4 | **已关** | 插件 5 条硬断言（`:38`）；`document.fonts` 断言 + 20 个 KaTeX face + ≥1 loaded（`:40`）；11 条验收（`:50,52`）。 |
| H5 | **已关** | 全员禁 `npm run build`；A/B 各自 `.tmp/build-*`；T3 只读 dist；最终 build 由根代理跑（`plan.md:5-9,26,43,75,96,122`）。`npm run roundtrip` 另有 N6（轻微）。 |
| H6 | **未全关** | README 数字/链接、`package.json` 元数据已归 T4/T5（`:59,65,109-116,138`）；LICENSE 仍是 `Copyright (c) 2026 Sidelight contributors` 且注「lead 指定」（`:61`），没有产品负责人确认的证据（`AGENTS.md:15`）。若 lead 已确认，请把确认写进计划或 ADR 供核对。 |

### 新漏洞

#### N1（blocker）T3 的 argv 注入会无限 reload

- 计划：`plan.md:86` 用 `AddScriptToExecuteOnDocumentCreatedAsync` 写 `localStorage['sidelight.doc.v1']` 后 `location.reload()`。
- 证据：SDK XML（`.tmp/wv2/lib/net462/Microsoft.Web.WebView2.Core.xml`）对该 API 的原话是「The injected script will apply to all future top level document and child frame navigations until removed with RemoveScriptToExecuteOnDocumentCreated.」reload 产生新文档，脚本再次执行，再次 reload，形成循环。
- 后果：T3 验收 4（argv）会卡在无限重载，按现计划不可能 PASS。
- 最小修法：脚本加一次性守卫（`sessionStorage` 标记，或比较 `localStorage` 已是目标文本就跳过 reload）；或在 C# 侧首次 `NavigationCompleted` 后 `RemoveScriptToExecuteOnDocumentCreated`。验收 4 加「导航次数 ≤ 2、页面稳定 3 s」的证据；标记行里的反斜杠放进行内代码，避免被 Markdown 转义吃掉。

#### N2（blocker）T3 的 UNVERIFIED 没有回合级判定

- 计划：标题「第 5 条不过只能记 UNVERIFIED」（`plan.md:79`）、条目「此条不过，T3 只记 UNVERIFIED」（`:95`）、门禁「1–4 全 PASS 且第 5 条 PASS 才算过」（`:96`）。
- 缺口：`docs/iteration/STATE.md:17` 的 tester 只有 PASS / FAIL，FAIL 触发整轮回滚（`git reset --hard`）。T3 第 5 条在无人工点选时只能 UNVERIFIED；计划没写它对应 round 的 PASS 还是 FAIL。
- 后果：tester 可能把 UNVERIFIED 判成 FAIL，回滚 T1（数据损失修复）与 T2/T4/T5；也可能反过来把「4/5 + UNVERIFIED」判成 PASS。且「不过」把「没跑（UNVERIFIED）」与「跑过失败（KILLED）」混在一起。
- 最小修法：在计划末尾加判定表——T3 5/5 PASS → task PASS；1–4 PASS + 第 5 条未跑 → task UNVERIFIED，不判 round FAIL，`test.md` 记 UNVERIFIED + 证据，Demo 去第 3 条，不回滚其他任务；第 5 条跑过但失败 / 触发 Kill → task KILLED，ADR-0004 blocked，同样不回滚其他任务。

#### N3（blocker）T4 的验收命令按现计划必然失败

- 计划：T4 第 101 行只改「0 / 6」→「3 / 7」（`plan.md:66`），但 `README.md:101` 同一行还有「6 个真实样本」；T4 验收要求 `Select-String README '6 个真实'` 0 命中（`plan.md:73`）。
- 证据：在 `.tmp/readme-t4-sim.md` 按 T4 描述模拟删第 40 行、改第 87 行与第 101 行的「0 / 6」后，`Select-String '批注不持久化','6 个真实','0 / 6'` 仍命中 1 行（「`npm run roundtrip` 把 6 个真实样本…当前结果：3 / 7」）。
- 后果：第 87 行的「6 个真实 .md 样本」改掉了，第 101 行的「6 个真实样本」没改，验收命令必然 FAIL。
- 最小修法：T4 第 101 行同时把「6 个真实样本」→「7 个真实样本」；或验收只匹配第 87 行的原文「6 个真实 .md」，不要用宽匹配。

#### N4（major）T4 删行后 T5 的行号整体上移，「行号切开」不成立

- 计划：T4 删除 README 第 40 行（`plan.md:66`）；T5 按第 30/52/66/70/71 行编辑（`plan.md:109`）；归属表写「行号切开」（`plan.md:136`）。
- 事实：删第 40 行后，41 行以后全部上移 1：T5 的 52→51、66→65、70→69、71→70（第 30 行不变）；T4 自己后面的 87/101 也会变 86/100，取决于编辑顺序。
- 后果：T5 若按行号下手会改错行；T5 的 `Select-String` 验收多数能抓到，但会浪费一轮，且归属表的「不冲突证据」不成立。
- 最小修法：T4/T5 都按精确内容定位（`Select-String` 整句），T5 开工时重新数行；归属表改成「T5 在 T4 完成后按内容定位」。

#### N5（major）T5 在 T3 结果未知时写 WebView2 SDK 的 README 行

- 计划：T5 第 6 步加一行「宿主 spike 用的 WebView2 SDK 只在 `host/`，不进运行时依赖」（`plan.md:116`）；T5 只依赖 T1+T2+T4（`plan.md:3,105`），不等 T3；T3 失败回退会删 `host/`（`plan.md:102`）。
- 后果：T3 KILLED/UNVERIFIED 后 `host/` 被删，README 这行变成假话，正好重犯 B3 类错误。
- 最小修法：这行改到根代理在 T3 结论后写，或写成条件句（「若保留 `host/` …」），并在 T3 失败回退里删该行。

#### N6（minor）T4 的 roundtrip 会重写未列入归属的 `docs/roundtrip-report.md`

- 计划：`plan.md:9` 只让 T4 跑一次 roundtrip；T4 的文件表（`plan.md:59`）没有 `docs/roundtrip-report.md`；该脚本会重写这个 tracked 文件（`findings-bug.md:17`）。
- 后果：T4 的改动超出归属表；T4 的回退 `git checkout -- README.md package.json` 不覆盖它；且 T4 在 A 组改 `src/` 时读源码，理论上会读到半写文件。
- 最小修法：把 `docs/roundtrip-report.md` 写进 T4 归属（注明是生成副作用），roundtrip 放在 T1/T2 完成后跑；或在 T4 收尾用 `git diff --quiet -- docs/roundtrip-report.md` 确认内容未变。

---

> 以下 H1–H6 详细段保留 rev1 原文，文中的 `plan.md:NN` 是 rev1 行号；rev2 是否关闭见上表与「rev2 复审」。

## H1（blocker）T1 的 shot 验收不可能通过，文件范围也缺了 `scripts/shot.mjs`

**问题**
计划把「`npm run shot` 输出 `katex after currency: 0`」写成验收，但 shot 的第 1 步先插入了一条公式，第 2 步才打货币文本。修复后计数只能是 1，不是 0。截图路径也不支持。新增的 acceptance 步骤在刷新后直接 `Control+End`，没有先点编辑器。

**证据**
- `scripts/shot.mjs:24-28`：先「插入 → 公式」（`:15` 自动接受 `E=mc^2`），然后打印 `.editor .katex` 总数。
- `.tmp/r1-bug-shot.log`（finder 原样输出）：`katex nodes: 1`、`katex after currency: 2`。修复只去掉货币产生的那一个，所以是 `1`。
- `scripts/shot.mjs:36` 打印的是全文档 `.editor .katex` 计数；`:38` 截图固定写 `shots/math.png`。
- `plan.md:17` 要求 `katex after currency: 0` 与截图 `shots/round-01/t1-currency.png`；`plan.md:9` 的文件表只有 `src/lib/math*`、`math.test.ts`、`scripts/acceptance.mjs`，没有 `shot.mjs`。
- `plan.md:14` 新步骤以 `Control+End` 开头；`scripts/acceptance.mjs:26-28` 的既有写法是先 `await page.locator('.editor').click()`。`scripts/acceptance.mjs:31` 刷新后焦点回到 body，仓库没有编辑器 autofocus（`App.tsx:2032` 的 `autoFocus` 是链接弹窗输入框，不是编辑器）。

**最小修法**
1. 把 `scripts/shot.mjs` 加进 T1 文件表；改成「插入公式后记 `before`，打完货币记 `after`，断言 `after === before`（期望 1），打印 `katex delta: 0`」；截图目标改成 `shots/round-01/t1-currency.png`。
2. 或者把货币输入挪到插入公式之前，保留「期望 0」。
3. acceptance 新步骤先 `click('.editor')` 再 `Control+End`（照抄 `acceptance.mjs:26` 的写法）。

**影响**：T1 的门禁与 tester 复验；按现计划 tester 会得到 `katex after currency: 1` 并判 T1 FAIL。

---

## H2（blocker）T3 的核心前提没有验收，只有 Kill criteria 的 `undefined` 分支

**问题**
整条发布路径 (b) 的理由是「WebView2 支持 File System Access API，前端文件读写代码不用改写」。计划把这句话当前提，把真人点选目录的真实读写标成「未验证-需人手，不计 PASS」；Kill criteria 只写了 `showDirectoryPicker` 是 `undefined`。于是 T3 可以在「选择器存在、但授权后拒绝或写不进磁盘」时拿到 4 条 PASS，并在 ADR-0004 里写成已验证。

**证据**
- `plan.md:47` 用「不碰同一批文件、不挤掉 T1」为 T3 辩护；`plan.md:55` 明写「人手点选目录的真实读写标『未验证-需人手』不计 PASS」；只额外打印 `typeof window.showDirectoryPicker`。
- `plan.md:64` 的 Kill criterion 是「`showDirectoryPicker` 在 WebView2 里是 `undefined`」——只覆盖缺失，不覆盖「存在但抛错/无对话框/写入失败」。
- `findings-ship.md:12`、`:166`、`:176` 把这句话当事实写；但同一份发现的验收第 3 条（`findings-ship.md:213`）要求「能读到真实目录，保存能写回磁盘」，计划的 4 条 PASS 把它降级成「未验证-需人手」。`findings-ship.md:258` 还把 NuGet 包内 `lib/net45` 列为未验证项。
- 我在 `.tmp/` 里用系统 `csc.exe` 4.8.9232（net462）+ SDK 1.0.4314.35 编了一个探针宿主（`.tmp/wv2probe2.cs`），加载 `dist` 同款虚拟主机后实测：`"secure=true dir=function open=function save=function"`（runtime 157.0.4341.46，`SetVirtualHostNameToFolderMapping` 成功）。**存在性现在有本机证据；功能仍未验证**——探针没有用户手势，也没有真正打开选择器。
- 因此「跑一下就绿」的风险更具体了：只要 `typeof` 那行是 `function`，计划就会放过它，而用户点「打开文件夹」时可能拿到 `NotAllowedError` 或空目录。

**最小修法**
1. 在 T3 验收加第 5 条（必须执行，不接受跳过）：用真人点「打开文件夹」选一个临时目录 → 读一个真实 `.md` → 改一个字符 → `Ctrl + S` → 用 PowerShell 校验磁盘字节/哈希变化；截图存 `shots/round-01/t3-fsa.png`。PASS 必须包含第 5 条。
2. 若第 5 条没跑，T3 只能记 `UNVERIFIED`，ADR-0004 不得写「(b) 可用」，发布路径不得据此推进。
3. Kill criteria 增一条：选择器存在，但用户手势后 reject（`NotAllowedError` / `SecurityError` / `AbortError`）、没有出现系统对话框、或授权后 `createWritable`/`getFileHandle` 失败 → 当天停手，退回 (c) 便携包。

**影响**：T3、ADR-0004、发布路径决策；这是全轮最大风险，必须显式验收。

---

## H3（major）T3 的构建命令与环境事实不符，`dist` 前置也没写

**问题**
计划第 1 步说确认 `lib/net45` 或 `lib/net462`，第 3 步却硬编码 `/r:lib/net45/*.dll`。实际下载的 SDK 只有 `lib/net462`。另外 `dist` 被 gitignore，T3 门禁里没有先 `npm run build`；`.gitignore` 的路径与实际产物不一致；窗口标题验收测的是 `document.title`（页面标题），不是宿主窗口标题。

**证据**
- 下载：`Invoke-WebRequest .../Microsoft.Web.WebView2/1.0.4314.35` → `.tmp/wv2.zip` 9,818,548 B；`Expand-Archive` 后 `Get-ChildItem .tmp\wv2\lib -Directory` 只有 **`net462`**（`net45` 不存在）。`lib/net462` 内是 `Microsoft.Web.WebView2.Core.dll` 703,328 B、`.WinForms.dll` 38,792 B、`.Wpf.dll` 86,368 B；`runtimes\win-x64\native\WebView2Loader.dll` 194,912 B 存在。
- `plan.md:50` 写「确认 `lib/net45` 或 `lib/net462` 存在」；`plan.md:52` 写 `/r:lib/net45/*.dll` 并「拷 SDK 程序集」——按字面执行立刻报找不到文件。
- `csc.exe`：`C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe`，`Microsoft (R) Visual C# Compiler version 4.8.9232.0 / for C# 5`。我用它把探针（WinForms + WebView2 + `SetVirtualHostNameToFolderMapping` + `ExecuteScriptAsync` + `CreateAsync`）编译并跑起来，exit 0。所需的 `PermissionRequested`、`CoreWebView2PermissionRequestedEventArgs.State`、`CoreWebView2PermissionState.Allow` 也都在 `Core.xml` 中。**计划的 Kill criteria 第 1、2 条基本不会被触发。**
- `.gitignore:2` 忽略 `dist`；`plan.md:60` 的 T3 门禁只有 `host/build.ps1; host-smoke.mjs`，而 `plan.md:52` 的 `build.ps1` 直接 `Copy-Item dist\* host\bin\www -Recurse`。干净 checkout 上 `dist` 不存在，验收第 1 条必失败。
- `plan.md:54` 让 `.gitignore` 追加 `host/www/`，但产物在 `host/bin/www`（`plan.md:52`）；`host/*.dll`、`host/*.exe` 与 `host/bin/` 重复。
- `plan.md:57` 用 CDP 的 `document.title === 'Sidelight'` 验窗口标题；这个值来自 `index.html`，即使宿主不设标题也会是 `Sidelight`，测不到宿主代码。
- `plan.md:51` 的 `SetVirtualHostNameToFolderMapping("sidelight.local", host\bin\www, …)` 是 cwd 相对路径；双击启动与 smoke 脚本 spawn 的 cwd 不一定相同。我的探针用 `AppDomain.CurrentDomain.BaseDirectory` 才稳定。
- `plan.md:51` 用 `ExecuteScriptAsync` 把 argv 文件内容拼进 JS；正文含引号、反斜杠、换行时会破坏脚本。

**最小修法**
1. 全文改成 `lib/net462`；在实施报告里记一句「1.0.4314.35 已无 net45」。
2. `build.ps1` 先 `Test-Path dist/index.html`，缺失就报「先跑 `npm run build`」；T3 门禁写成 `npm run build; host/build.ps1; host-smoke.mjs`。
3. `.gitignore` 只加 `host/bin/`；删掉 `host/www/`、`host/*.dll`、`host/*.exe`。
4. 宿主路径全部改成 exe 相对（`Application.ExecutablePath` 的目录）。
5. 窗口标题验收改成读原生窗口标题（如 `Get-Process Sidelight | Select MainWindowTitle`），`document.title` 只当附加检查。
6. argv 传递改用 `PostWebMessageAsJson` + 页面监听，或者写入临时 `.md` 再映射读取；验收第 4 条用含引号与反斜杠的标记行测一次。

**影响**：T3 的构建与 4 条验收；按现计划第 1 条与第 3 条会以环境原因失败。

---

## H4（major）T2 的验收与自检查不出字体失效

**问题**
计划的机制本身成立，我复现出的数字与计划完全一致；但验收只看「有没有 `.katex` 节点」，而 KaTeX 在字体全部 404 或某个 face 失去来源时仍会渲染 DOM。插件自检也只检查「CSS 里引用的 woff2 文件存在」，查不出「CSS 没找到」「face 数不对」「某个 face 的 src 被清空」「CSS 里还留着 ttf/woff 引用」。

**证据（复现成功）**
用一份临时 Vite 配置（`.tmp/t2probe.config.ts`，插件逻辑与计划步骤 1 相同）构建到 `.tmp/t2dist`：
```
[probe] bundle assets: 61 css: ["assets/index-BRPzIKTO.css"]
[probe] css changed: true
[probe] faces=20 woff2items=20 deleted=40
✓ built in 212ms   (exit 0)
```
产物计数：
```
woff2=19 woff=0 ttf=0 font=256168
truetype=0 woff=0 woff2=20 datauri=1
css refs woff2 files: 19
dist 合计 1392823
```
即：计划第 24、26、33-37 行的目标全部可达；`generateBundle` 删资产没有触发 Vite 的引用检查（exit 0）；`KaTeX_Size3` 的 woff2 是 3,624 B < 4,096 B，被内联，且 base64 项后面仍有 `format("woff2")`，按 `format` 过滤会保留。
**但**：
- `scripts/acceptance.mjs:52` 只做 `(await page.locator('.editor .katex').count()) > 0`；`plan.md:41` 声称这能捕获 CSS 重写错误，这不成立。
- 字体加载失败通常不产生 `console.error`：若某个 face 的 src 被清空，浏览器根本不会发请求，既没有 404 也没有控制台错误。
- `plan.md:29(c)` 的自检只验「CSS 里每个 `/assets/*.woff2` 都在 bundle 中」，没有验 CSS 资产是否存在、`faces === 20`、每个 face 恰好一条 src、CSS 里 0 条 `truetype`/`format("woff")`。
- 导出 HTML 不受影响（`src/lib/export.ts:50-124` 是自带静态样式，没有 `@font-face` 或字体 URL；`src/main.tsx:6` 只 import KaTeX CSS）——这一点计划没写，但核对通过。

**最小修法**
1. 插件自检加硬断言：找到且只找到 1 个 CSS 资产；`@font-face` 数 = 20；每个 face 的 `src` 恰好 1 项且带 `format("woff2")`；CSS 中 `truetype`/`format("woff")` 计数为 0；任一不满足就 `throw`。
2. acceptance（或一条独立检查）在公式渲染后加字体断言：`await page.evaluate(() => document.fonts.ready.then(() => document.fonts.check('16px KaTeX_Main')))`，或从 CDP `Network.responseReceived` 里确认至少一个 `.woff2` 返回 200 且无字体 404。
3. 接受项写明「字体从 1,072,948 B / 59 文件降到 256,168 B / 19 文件」，实测数字已可复现（见上）。

**影响**：T2 的验收与「零产品风险」的说法；机制不用改，补断言即可。

---

## H5（major）并行只做了源文件隔离，没做构建隔离

**问题**
「两个实施者零文件重叠」只对源文件成立。两组都会跑 `npm run build`（T4 的门禁里就有；T2 的门禁也有），而这个命令会 type-check 整个 `src`；T2 的 `vite build` 还会清空并重写 `dist`，T3 又在同一时段从 `dist` 复制。任何一组的中间状态都能让另一组的门禁红掉，且失败原因无法归因。

**证据**
- `package.json:9`：`"build": "tsc --noEmit && vite build"`；`tsconfig.json:16`：`"include": ["src"]`。T1/T2 在改 `src` 时，T4 的 `npm run build`（`plan.md:86`）会读同一棵树。
- `plan.md:3`：A 组 T1→T2，B 组 T4→T3，两组同时开始。T4 先跑，正好落在 T1 的编辑窗口里。
- T2 的构建默认 `emptyOutDir`；T3 的 `plan.md:52` 是 `Copy-Item dist\* host\bin\www -Recurse`。两者重叠时 `www` 可能只拿到半套资源。`.gitignore:2` 说明 `dist` 是生成物，没有提交，无法当快照。
- 题设需要纠正一处：**T3 本身不跑 `npm run build`**（`plan.md:60` 只有 `host/build.ps1` + `host-smoke.mjs`）；真正与 T2 抢 `npm run build` 的是 **T4**，与 T2 抢 `dist` 的是 **T3 的复制**。
- `plan.md:92-97` 的归属表只能证明四个任务的源文件互斥；`plan.md:47` 的「不碰同一批文件」不能推出门禁安全。

**最小修法（任选其一，写明即可）**
1. 根代理串行化所有 `npm run build`：T4 的门禁改成 `npm test`（文档任务不必 build），或等 A 组 build 完成后再跑 T4 的 build。
2. T3 的 `build.ps1` 从固定快照复制：先 `Copy-Item dist .tmp\dist-snapshot -Recurse`，宿主只认快照；或者让 T3 在 T2 的 build/验收完成后再开始。
3. 若要真正并行，给两组各开一个 `git worktree`（`node_modules` 另装或只跑 test），否则接受串行。

**影响**：T2 的计数测量、T3 的窗口加载、T4 的 build 门禁；以及 tester 的复验环境。

---

## H6（major）T4 的文档依赖、断链、过期数字与许可元数据

**问题**
1. README 的货币声明写成「第 01 轮 T1 回归，见 `impl-a.md`」，但 T4 在 T1 之前/并行执行，且 `impl-a.md` 会被根代理合并成 `impl.md`（`plan.md:99`）。
2. T1 加 3 条测试后总数 165（现测 162），T1 给 acceptance 加 1 条后是 10 项（README 写「九项」）；AGENTS.md 与 ADR-0001 的数字会同时过期，T4 没列。
3. LICENSE 的版权人由计划自己定成 `Sidelight contributors`，属于「署名」这一类必须回到人的决定；同时 `package.json` 仍是 `private: true` 且没有 `license`，与「开源就绪」目标冲突。
4. CI 在没有 remote 的仓库里本轮不会运行；这不算错，但验收只能校文件内容，不能写成「CI 通过」。
5. `.gitattributes` 对 fixtures 与现有文件的往返**没有影响**——这点我实测过，不是漏洞。

**证据**
- `plan.md:78` 写「货币写法一行改为……见 impl-a.md」；`plan.md:87` 只说「若 T1 失败则该行改为已知缺陷」，没有指明谁在何时改；`plan.md:99` 写「A 组 `impl-a.md`，B 组 `impl-b.md`，根代理合并为 `impl.md`」——链接目标会消失或指向合并前文件。
- 实测 `npm test`：15 个文件、`ℹ tests` 求和 **162**；`README.md:70` 写「九项验收」，T1 后会变 10；`AGENTS.md:38` 写「共 162 个」；`docs/adr/0001-document-tree-is-the-truth.md:11,17,19-20` 仍写「6 个真实样本」「0 / 6」，而 `docs/roundtrip-report.md:13` 已是「3 / 7」，`fixtures/markdown` 实测 7 个文件（`fixtures` 共 8 个文件）。
- `plan.md:74`：`Copyright (c) 2026 Sidelight contributors` + 「正式署名由产品负责人在发布前确认」。`AGENTS.md:15` 把「对外承诺（发布、署名、隐私声明）」列为必须回到人的四件事之一。`plan.md:3` 又写「无任务改 `package.json`」；`package.json:2-3` 是 `"private": true`、无 `license`，`findings-ship.md:49` 已把这条列为开源就绪缺口。
- CI：`git remote -v` 输出为空；`package-lock.json` 存在，所以将来推上去 `npm ci` 可用，但本轮无法执行。`plan.md:87` 已标「未验证」。
- `.gitattributes` 实测：在 `HEAD` 的临时 worktree 里按计划写规则后，`git status --porcelain` 只有 `?? .gitattributes`；`git check-attr text -- fixtures/markdown/07-math.md` 为 `unset`；8 个 fixture 全是 LF；`core.autocrlf=false`。所以规则不会改写现有文件，也不会改变 roundtrip 结果。

**最小修法**
1. 把 README 的货币句子改到根代理合并阶段写，或写成「按内侧空白判断，打字与载入一致（见 `docs/iteration/round-01/impl.md`）」，链接最终文件而不是 `impl-a.md`。
2. T4 的清单补三项：`AGENTS.md:38` 的 162、「九项验收」、`docs/adr/0001` 的 6/0-6；都改成「以命令输出为准」或当前实测值（165 / 10 项 / 7 个样本 3 保真）。
3. LICENSE 的版权人先留 `<版权人>` 或等产品负责人一句确认再落文件；不要用「Sidelight contributors」直接提交。允许 T4 只改 `package.json` 的元数据（`"license": "MIT"`、去掉 `"private": true` 或改成 `false`、可选 `repository`/`engines`），仍然禁止碰依赖段。
4. T4 的验收里写明「CI 文件只校内容，未运行」；不要把它当发布证据。

**影响**：T4 的文档可信度、LICENSE 的合法署名、开源元数据；以及 tester 对 T4 的复验。

---

## 按题核对记录

### T1
- 修复假设成立：`src/lib/math.ts:12` 用「内侧空白」判断，`src/lib/mathInput.ts:31-37` 的行内规则只判 `latex` 非空，`src/App.tsx:398` 的载入路径有 `protectMathPairs`。在 handler 开头复用同一谓词，能拦住 `$5 到 $10`（`match[1] = '5 到 '`，末尾是空格）。
- 合法公式不受影响：`$x^2$`、`$E=mc^2$` 的内侧没有空白；`src/lib/math.test.ts:6-8`、`:27-29` 的现有断言仍然成立。`$ x $` 会从「可成公式」变成普通文字，与载入路径一致（`math.test.ts:14-16` 已覆盖载入路径），不是新缺陷。
- 回归覆盖：载入路径有 7 条 `protectMathPairs` 断言；输入路径只有 `scripts/acceptance.mjs` 的浏览器步骤，`npm run build` / `npm test` 都碰不到它。计划里那条「165 条」只覆盖谓词，不覆盖 handler 是否调用它。可以在实施报告里写明「谓词由单测守，handler 由 acceptance 守」，不要把 CI 说成能防回归。
- 残留：`$5-$10`（无空格）在两条路径上都仍会被当公式（`5-` 内侧无空白）。这不是本轮新增，但 README 的替换句只能写「两条路径一致」，不能写「货币写法不再被误判」。
- 粘贴不触发公式：`prosemirror-inputrules` 只注册 `handleTextInput`（`dist/index.js:75`），`@tiptap/extension-mathematics` 只有 `addInputRules`（`dist/index.js:110,287`），`@tiptap/markdown` 里没有 paste 规则；`src/App.tsx:325` 的 `handlePaste` 只处理图片。findings-bug.md:32 的「粘贴缺防护」没有证据，计划的输入路径范围是对的。
- 验收可复现性：**否**，见 H1。

### T2
- `@font-face` 是否三格式：是。`dist/assets/index-BRPzIKTO.css` 中 20 个 face，`format("truetype")` 20、`format("woff")` 20、`format("woff2")` 20；`url(data:font/woff2;base64,…)` 1 个。
- 删除后是否 404/回退失败：不会。我在 `.tmp` 复现的产物里 `woff2=19 woff=0 ttf=0`，CSS 里 `truetype=0 woff=0 woff2=20`，19 个文件 URL + 1 个 data URI，没有任何 face 失源，也没有 ttf/woff 请求。
- `KaTeX_Size3` 的 woff2 内联：属实。文件 3,624 B < Vite 默认 4,096 B 阈值；base64 长度 4,832，data URI 项后带 `format("woff2")`，按 format 过滤会保留。
- 导出 HTML 是否引用字体：不引用。`src/lib/export.ts` 的 `STYLES` 是自带静态 CSS，没有 `@font-face` 或字体 URL。
- `generateBundle` 删资产是否报错：不报错，临时构建 exit 0，产物里没有 ttf/woff。
- 验收可复现性：**命令本身可复现**（我跑出 19/0/0、256,168 B、1,392,823 B），但**失败检测不可**，见 H4。

### T3
- SDK 1.0.4314.35 存在：`Invoke-WebRequest` 下载成功，9,818,548 B；`nuspec` 版本 1.0.4314.35；微软文档的 Applies-to 也列了 1.0.4314.35。
- `lib/net45` / `lib/net462`：只有 `lib/net462`，没有 `net45`。见 H3。
- `csc.exe`：`C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe`，4.8.9232.0（C# 5）。用它编 net462 的 WebView2 公开 API 成功（探针 exit 0）；`PermissionRequested`/`State`/`Allow`/`SetVirtualHostNameToFolderMapping`/`ExecuteScriptAsync`/`CreateAsync` 均在 `Core.xml` 中。
- 宿主可行性：探针窗口 + `SetVirtualHostNameToFolderMapping("sidelight.local", <exe目录>/wv2www, Allow)` + 导航 `https://sidelight.local/index.html` 成功；runtime 157.0.4341.46；`isSecureContext=true`。
- `showDirectoryPicker`：实测 `typeof === 'function'`，`showOpenFilePicker`/`showSaveFilePicker` 也是；但无用户手势，真实读写**未验证**。见 H2。
- 单实例 `Global\Sidelight`：非管理员实测可创建（`IsAdmin=False` 时 `Global\SidelightCriticProbe` 创建成功），不是问题；不要为此改 `Local\`。
- 其它：`dist` 未入 git（`.gitignore:2`）；`host/bin/www` 与 `.gitignore` 的 `host/www` 不一致；窗口标题验收测的是 `document.title`；cwd 相对映射与 `ExecuteScriptAsync` 注入风险。见 H3。
- 时间盒：原计划「1 个工作日 + 550–700 行」偏紧；探针已证明编译器、SDK、运行时、虚拟主机、选择器存在性都成立，剩下是 C# 窗口/单实例/argv 与验收脚本，1 天可行，前提是 H3 的命令先改对。
- 验收可复现性：**否**（dist 前置、net45 路径、标题断言），见 H3。

### 并行与合并
- 源文件重叠：确实没有。T1 四个文件、T2 两个、T3 `host/**`+`host-smoke.mjs`+`.gitignore`+ADR、T4 六个新文件+README，两两不相交。
- 构建/产物重叠：有。`npm run build` 全树 type-check、`dist` 被两组同时写；见 H5。
- 报告合并：`plan.md:99` 写明根代理合并为 `impl.md`，归属清楚；但 T4 的 README 指向 `impl-a.md`，与合并动作冲突；见 H6。
- 截图：四个任务用了不同的 `shots/round-01/t*-*.png`，不冲突；但 T1 的路径目前 `shot.mjs` 不支持（H1）。

### T4
- LICENSE 版权人：计划写的是 `Sidelight contributors`，没有写产品负责人姓名；但它仍然是在没有人工确认的情况下落一个版权人，且 `AGENTS.md:15` 把署名列为必须回到人的事项。算「擅自定署名」，不算「擅自替负责人署名」。
- CI：仓库没有 remote（`git remote -v` 为空），本轮不会运行；`package-lock.json` 存在，推上去后 `npm ci` 可用。计划自己标了「未验证」，但验收只能校文件内容，意义有限，不能当发布证据。
- `.gitattributes`：`fixtures/** -text` 在 `*.md text eol=lf` 之后，优先级正确（`git check-attr` 得到 `text: unset`）；现有 fixture 全 LF；`core.autocrlf=false`；临时 worktree 里加规则后 `git status` 只多出 `?? .gitattributes`。**不改变往返结果**。
- README 的「4 条」实际是 5–6 处（货币、测试数、批注持久化、qa 脚本、字体体积、样本数 6→7 / 0/6→3/7、目录树里的「6 个真实 .md 样本」）；实施时按清单逐条勾，别漏掉目录树那一行。
- README:34「重开文档恢复批注」本身在 findings-bug.md:54 标为未验证。T4 删掉第 40 行的假话之后，第 34 行会成为唯一说法，但也没有证据。建议写成「有磁盘句柄时恢复批注（未验证）」或让 T4 记录未验证，不要用删掉一句假话来制造一句没有证据的真话。

### 通用
- 可独立复现：T2 可以（我复现了全部计数）；T4 的文件检查可以；T1、T3 不行（H1/H3/H4）。
- 时间盒：T2/T4 现实；T3「1 天」在命令修正后现实，原计划的高风险估计（COM 互操作、C# 5 编不过）已被我的探针否定，不需要因此加码。
- 范围：没有偷偷加 npm 依赖，没有碰 ADR-0001/0002/0003 的底线；但 T3 引入的 WebView2 SDK 程序集属于宿主运行时资产，`AGENTS.md:52` 要求在 README 记一行理由，计划没写；T4 的 README 改动多于 4 处，属纠错范围，不算扩权。
- 违反 ADR：没有。ADR-0001 的数字会过期（H6）；ADR-0002/0003 未受影响。

## 计划里做对的地方（最多 3 条，别改过头）

1. **T1 抽共享谓词而不是复制判断**：载入与打字走同一规则，现有 7 条 `protectMathPairs` 测试直接兜底，方向正确。不要把 `isMathBody` 改成只服务输入路径的第二套判断。
2. **T2 的 woff2-only 机制与数字是对的**：我已复现 19 woff2 / 0 ttf / 0 woff、字体 256,168 B、dist 1,392,823 B，`KaTeX_Size3` 的 data URI 保留，删资产不报错。方案不用推翻，只补「字体真的加载了」的断言。
3. **T3 先 spike、带 Kill criteria、`src/` 零改动**：顺序与边界都对；我的探针已经证明 csc 4.8.9232 + net462 + runtime 157 + 虚拟主机 + `showDirectoryPicker` 存在性都成立。把真实读写补进验收即可，不要因为 H2 把整条 (b) 路径判死。

---

### 附：本次审查用到的临时产物（均在 `.tmp/`，未改产品文件、未 commit）

- `.tmp/t2probe.config.ts`、`.tmp/t2dist/`：T2 插件复现（faces=20、woff2items=20、deleted=40；19/0/0；256,168 B；1,392,823 B）。
- `.tmp/wv2.zip`、`.tmp/wv2/`：NuGet 包（9,818,548 B；`lib` 只有 `net462`）。
- `.tmp/wv2probe2.cs`、`.tmp/wv2probe2.exe`、`.tmp/wv2probe-result.txt`：WebView2 宿主探针（runtime 157.0.4341.46；`secure=true dir=function open=function save=function`）。
- `.tmp/t3probe.cs`、`.tmp/t3probe.exe`：csc 4.8.9232 对 net462 API 的编译探针（exit 0）。
