# round-48 · finder-ship：安装、体积、启动与开源发布体验

- 角色：finder-ship（只读产品代码，不改产品文件）
- 轮前 startSha：`5673b1dee5623cc72fe87b37d563c1d7444224ff`；本轮 HEAD 未变（`git status` 只有 `?? docs/iteration/round-48/`、`?? shots/round-48/`）
- 环境：Windows 11 / Node 24 / dev server `http://localhost:5175` 未动；CDP 9224（Playwright `connectOverCDP`）
- 结论：**6 条**（全部 P2/P3，无 P0/P1）。打包链、安装包、便携 zip、打包产物前端都能跑通；体积远在预算内。问题集中在**对外文档数字过期**与**exe 元数据缺失**。

## 一、本轮实测数字（全会话唯一一次构建）

| 项 | 实测 | 门槛 | 结论 |
| --- | --- | --- | --- |
| `npm run build` | tsc 0 错；vite 515 ms，3251 modules | — | PASS |
| 主 chunk | `dist/assets/index-DVSSfE44.js` **912,306 B raw / 285,826 B gzip** | — | — |
| 首屏（`measure-first-screen`） | `total raw=949553 gzip=293751 headroom=26249 files=3 max=320000` | 内部 310,000 / 硬线 320,000 | **PASS**，距硬线余 26,249 B、距内部预算余 16,249 B |
| `dist/` 全量 | 97 文件 3,851,094 B | — | 含 `mermaidLoader-Di-OE9Q2.js`、`katexLoader-CNO5m-uY.js`、`katexLoader-lxMheimU.css`（惰性 chunk 确实随包发出） |
| `host/build.ps1` | `bin 合计 4,892,857 B`、`www/index.html=True`；**3 条 C# 警告** | — | PASS（警告见 F5） |
| `packaging/portable.ps1` | staging 4,903,143 B → zip **1,626,999 B**，sha256 `68C52C8B…`，`payload fileVersion=0.32.1.0` | 硬线 50,000,000 | PASS（余量 48.4 MB） |
| `packaging/installer.ps1 -AssocDryRun` | **1,305,523 B**，`fileVersion=0.32.1.0` | 内部 45,000,000 | PASS |
| 正式 setup（`makensis` 真关联节，见 §三.2） | **1,305,747 B**，`FileVersion=0.32.1.0`、`FileDescription=Sidelight 安装器`、`CompanyName=Sidelight contributors` | 内部 45,000,000 / 硬线 50,000,000 | PASS |
| 安装落盘（装到工作区临时目录） | 106 文件 **4,968,666 B**：9 个顶层文件 + `www/`（3,851,094 B，与 `dist` 同字节）+ `uninstall.exe` 65,523 B | — | PASS |
| 打包后前端产物 | 首屏 0 控制台错误、0 页面异常、0 外部网络请求 | — | PASS（细节见 §三.1） |

`npm run build` 与 `measure` 都是本轮唯一一次，未与其他人并发。`release/` 开工前有 23 个本地产物；跑脚本后已按备份还原，三个 0.32.1 文件 SHA256 与开工前逐字节相同（`2F32C26A…` / `F4210C62…` / `6C93F58F…`）。

## 二、发现（6 条）

### F1（P2）README 首屏体积头条过期，且同一句自相矛盾

- 证据：`README.md:114` 开头写「首屏 gzip 从 364,960 B 降到 **288,411 B（−21.0%）**」，同一行末尾写「当前 **293,751 B**（第 47 轮 `npm run verify` 实测）」。
- 本轮实测：`gzip=293751`（`node scripts/measure-first-screen.mjs`）。288,411 B 是第 37 轮的值，相差 5,340 B。
- 同一处 `README.md:116` 写「主 chunk 以最近一次 `npm run build` 输出为准：第 45 轮 910,048 B raw」，本轮实测 **912,306 B raw**（`index-DVSSfE44.js`），差 2,258 B。
- 影响：开源 README 的「依赖与体积」是唯一对外体积承诺；头条数字低 5,340 B，且与同一句后半段冲突，读者无法判断该信哪个。`−21.0%` 也应改为 `−19.5%`（(364,960−293,751)/364,960）。
- 建议：`README.md:114` 的粗体改为 `293,751 B（−19.5%）`；`README.md:116` 的主 chunk 改为第 48 轮 `912,306 B raw`。顺带把 `CHANGELOG.md:197`/`STATE.md:55` 的 285,826 B 与 293,751 B 口径保持在「主 chunk gzip / 首屏合计」两栏，别再混写。

### F2（P2）出厂的 `Sidelight.exe` 没有文件描述、产品名、公司、版权

- 证据（`[System.Diagnostics.FileVersionInfo]::GetVersionInfo(host/bin/Sidelight.exe)`）：
  `FileDescription=[ ]`（一个空格）、`ProductName=[]`、`CompanyName=[]`、`LegalCopyright=[ ]`、`Comments=[]`；只有 `FileVersion=0.32.1.0`、`ProductVersion=0.32.1`、`OriginalFilename=Sidelight.exe`。
- 对照：同一个安装包里的 setup.exe 有全套 —— `Product=Sidelight Desc=Sidelight 安装器 Company=Sidelight contributors`（`packaging/installer.nsi:41-46` 的 `VIAddVersionKey`）。
- 原因：`host/build.ps1:35-40` 生成的 `AssemblyInfo.cs` 只有 `AssemblyVersion` / `AssemblyFileVersion` / `AssemblyInformationalVersion` 三条，没有 `AssemblyTitle` / `AssemblyProduct` / `AssemblyDescription` / `AssemblyCompany` / `AssemblyCopyright`。
- 影响：Windows「属性 → 详细信息」四栏空白；任务管理器与「打开方式」列表只显示文件名；公开分发的 exe 看起来不像正规软件（安装包反而有）。体积代价 <1 KB 版本资源。
- 建议：在 `host/build.ps1` 的 `$verLines` 加 5 行：
  `[assembly: AssemblyTitle("Sidelight")]`、`AssemblyProduct("Sidelight")`、`AssemblyDescription("Sidelight 桌面 Markdown 编辑器")`、`AssemblyCompany("Sidelight contributors")`、`AssemblyCopyright("MIT License, Sidelight contributors")`；重编后断言 `FileDescription -ne ''`（可加在 `packaging/installer.ps1` 的版本门旁边）。

### F3（P2）所有角色先读的 `common.md` 里还留着旧安装包体积线

- 证据：`.tmp/iteration/common.md:36` 写「安装包 ≤1,800,000 B（内部）/ 2,000,000 B（硬线）」；同一文件 `:5` 写「安装包硬线放宽到 50,000,000 B（内部预算 45,000,000 B）」。
- 影响：`common.md` 的「硬约束」节是每个角色的第一手判据，两处矛盾会让人按旧线判超预算（真实 setup 1,305,747 B 离旧线只差 494 KB，任何一次依赖增长都可能被判「超线」）。脚本与 CI 已全部跟随新线（`measure-first-screen.mjs:21-22`、`installer.ps1:97-100`、`portable.ps1:15-16`、`verify-installer.ps1:74-83`、`packaging/README.md:42,58` 都写 45,000,000 / 50,000,000），只有这个文件没改。
- 建议：把 `common.md:36` 改为 `45,000,000 B（内部）/ 50,000,000 B（硬线）`，并注明 zip 与 setup 共用硬线、不另设内部预算。

### F4（P2）`STATE.md` 的测试计数自相矛盾（29/380 vs 30/400）

- 证据：`docs/iteration/STATE.md:27` 写「`npm test`（以 `package.json` 为准，当前 **29 个文件 380 条**）」；同一文件 `:55` 写「测试 **30 文件 400 条**」。`package.json` 的 `test` 脚本实测列 **30** 个 `.test.ts`（`([regex]::Matches(pj,'\.test\.ts')).Count = 30`）。
- 影响：看板是根代理与 planner 的共享记忆；门禁计数在「循环」节写错，本轮之后仍会有人按 29/380 验收。
- 建议：`STATE.md:27` 改 `30 个文件 400 条`（与 `:55` 同源）。

### F5（P3）每次打包都打印 3 条宿主编译警告

- 证据：`powershell -File host/build.ps1` 输出
  `host\Program.cs(1337,13): warning CS4014`（未等待的异步调用）、
  `host\Program.cs(1381,26): warning CS0168`（`ex` 声明未使用）、
  `host\Program.cs(1478,30): warning CS0168`（同上）。
- 影响：打包日志噪声；CS4014 的那处是「未 await 的异步调用」，一旦异常会变成未观测的 `async void` 崩溃，属值得确认的点（当前有 `INIT-FAIL` 日志兜底，本轮沙箱里也真触发到了它，见 §四）。
- 建议：CS4014 处补 `_ = ` 或注释说明；两个 `ex` 改成 `catch (Exception)` 之外的具名参数或 `catch { }`。改动只在 `host/Program.cs`，不影响前端体积。

### F6（P2）本地 `release/` 里的 0.32.1 setup 不是发布出去的那一个

- 证据：`release/Sidelight-0.32.1-win-x64-setup.exe` = **824,595 B**，`release/Sidelight-0.32.1-win-x64-portable.zip` = 910,360 B；`STATE.md:144` 记的已发布 v0.32.1 是 setup **824,209 B**、zip **910,360 B**（zip 一致，setup 差 386 B）。
- 影响：`release/` 不进版本控制，但 `packaging/verify-installer.ps1`、人工发版与 `SHA256SUMS.txt` 都从这里读。从一个与 Release 页字节不同的 setup 重新上传，会与 `SHA256SUMS-0.32.1.txt` 对不上，校验步骤直接失败。
- 建议：发版前先删当版旧产物再打（或者让 `verify-installer.ps1` 在存在 `SHA256SUMS-<版本>.txt` 时校验当版 setup 的 SHA256，不符记 `Fail`）。这条不改产品代码，只改打包/发版流程。

## 三、端到端走过的路径

### 1. 打包后的前端产物真的能跑（CDP 9224，非 dev server）

做法：`host/build.ps1` 把 `dist` 复制到 `host/bin/www`；`portable.ps1` 再复制到 `.tmp/portable/Sidelight/www`；用 `.tmp/ship-r48-server.mjs` 在 5288 端口原样送出这份 `www`，Playwright 连 CDP 9224 打开 `http://127.0.0.1:5288/index.html`。脚本 `.tmp/e2e-r48-ship-packaged.mjs`。

| 用户路径 | 断言（实测） | 截图 |
| --- | --- | --- |
| ① 首次启动 | `title="未命名.md — Sidelight"`、正文空、`data-theme=system`、`.ProseMirror` 挂载 | `shots/round-48/ship-packaged-1-firstlaunch.png` |
| ② 写一句话 | 正文 = `打包产物验证：这一行应该留在正文里。`；字数 `16 字 · 阅读约 1 分钟` | `ship-packaged-2-typing.png` |
| ③ 进源码再回编辑 | `.source-editor` 存在、`.ProseMirror` 卸载，源码值同正文；回编辑后正文不变 | `ship-packaged-3-source.png` |
| ④ 字数明细面板 | `aria-label="字数明细"`、中日韩字 16 / 合计 16 / 字符 18 / 句 1 / 段 1；`Esc` 关闭后焦点回 `.stats-trigger` | `ship-packaged-4-stats.png` |
| ⑤ 控制台与网络 | `pageErrors=[]`；`consoleErrors` 只有 1 条 `Failed to load resource 404`，来自 `GET /__doc`（浏览器态没有宿主，`STATE.md:151` 记过 CI 也忽略它）；**0 条外部网络请求**（唯一非本机请求是浏览器自身扩展的 `eduser.css`），与「无遥测、启动不联网」一致 | — |

第 5 步的 mermaid 围栏没能形成代码块（`preCode=0`、`svg=0`），**这一步没有验证结论**；静态侧已确认 zip 里带 `mermaidLoader-Di-OE9Q2.js`。

### 2. 安装包真装真卸（受沙箱限制，注册表与开始菜单未验）

- 正式 setup 不能走 `installer.ps1`（它写 `release/`，本轮不改 `release/`）。改用脚本同一条 `makensis` 命令把产物指到 `.tmp`：`makensis /V2 /DAPPVERSION=0.32.1 /DESTSIZE=4762 /DOUTFILE=..\.tmp\ship-r48-setup.exe packaging\installer.nsi`（`installer.nsi:20-22` 的 `OUTFILE` 可覆盖；**含真关联节的 10 条注册表写入**，不是 dry-run）。产物 **1,305,747 B**。
- 静默安装：`ship-r48-setup.exe /S /D=D:\Documents\SidelightProgram\.tmp\installed-r48`，15 s 内退出。落盘 106 文件 4,968,666 B —— 顶层 9 个文件（`Sidelight.exe` 87,040 / 两个 WebView2 托管 DLL / `WebView2Loader.dll` / `Sidelight.exe.config` / `sidelight.ico` / `README.txt` / `LICENSE` / `uninstall.exe` 65,523）+ `www/`（3,851,094 B，与 `dist` 同字节）。`LoadLibrary` 级的判断：「缺 www\index.html」「缺运行时」两条前置检查都没触发，说明载荷完整。
- **阻塞项（沙箱，不是产品问题）**：本次会话的工作区外写入被拒（`%LOCALAPPDATA%\Programs\sidelight-write-probe.txt` → 拒绝访问），注册表写入也被拒（`New-Item HKCU:\Software\ship-r48-probe` → `UnauthorizedAccessException`）。因此安装器写完文件后**没有** `HKCU\Software\Sidelight`、`HKCU\…\Uninstall\Sidelight`，也没有 `%APPDATA%\…\Sidelight.lnk` —— 这三项是沙箱挡下的，**UNVERIFIED**，与 `STATE.md` 待办池里那条「HKCU 关联/打开方式/卸载、真人双击」同源。
- 卸载：`installed-r48\uninstall.exe /S` 12 s 内退出，安装目录**整个消失**（`dirAfter=False`），说明第 46 轮的「只删自己写的文件 + 非递归 `RMDir`」改动没有把别的文件留在原地，也没炸。

### 3. 真实宿主窗口：本会话跑不起来（环境限制，已坐实）

- 启动 `.tmp/portable/Sidelight/Sidelight.exe`（`SIDELIGHT_PORT=47899`、`SIDELIGHT_STATE_DIR` 指到工作区），进程起来了、回环服务 `127.0.0.1:47899` LISTENING，`host.log` 记：
  `22:27:00.712 INIT-FAIL System.Runtime.InteropServices.COMException (0x8000FFFF): 灾难性故障 … CoreWebView2Environment.<CreateCoreWebView2ControllerAsync>` → `close requested` → `close-request skipped webview null`。
- 即 WebView2 控制器创建失败（沙箱禁止命名管道/Chromium 子进程，与 `AGENTS.md` §8 同一条限制），宿主走 `Program.cs:1523-1528` 的 `fatalInitError` 分支，关窗后 `Program.cs:176-179` 弹错误窗。**「启动打包后的应用 → 写 → 保存 → 重开」在真实宿主里 UNVERIFIED**，补测方式：在非沙箱会话跑 `host-smoke`（CDP 9333）或真人双击安装后的 exe。

## 四、我试过但判断没问题的项（避免下一个人重查）

- 依赖：`package.json` 运行时依赖只有 Tiptap 3.34 一组 + `katex` + `mermaid 11.12.0`（精确锁），devDeps 只有 `playwright-core` 与类型/构建工具；与 `README.md:118-124` 的「三组」一致，没有新增运行时依赖。
- 体积门槛脚本没有残留旧线：`measure-first-screen.mjs`（310,000/320,000）、`installer.ps1`（45M/50M）、`portable.ps1`（50M）、`verify-installer.ps1`（45M/50M）、`packaging/README.md:42,58`、`ci.yml`/`release.yml` 都是新线；旧线只活在 `.tmp/iteration/common.md:36`（F3）。
- `packaging/README.txt`（随包发出、46 行）：便携数据目录的三级回退与 `Program.cs:1396-1419` 一致；「启动失败时窗口会写明原因」与 §三.3 实测一致；「不写注册表 / 不建开始菜单 / 没代码签名」都属实。它指向的「README 的『下载』一节」确实存在（`README.md:9`），不是坏链。
- `README.md:9-32` 下载与安装段：安装目录 `%LOCALAPPDATA%\Programs\Sidelight` 与 `installer.nsi:32` 一致；WebView2 缺失即中止（`installer.nsi:123-125`）属实；SmartScreen 只能拦一次的说法与无签名状态一致。
- Typora 差距计数：`docs/typora-gap.md` 的标题是「已经有的（32）」「缺的（9）」，与 `README.md:96`、`AGENTS.md` 的「32 项有、9 项缺」一致，**没有**第 47 轮待办里说的「整表过期」问题。
- `scripts/measure-first-screen.mjs` 带「距硬线 <5% 打 WARN」，本轮 26,249 B 余量 8.2%，不触发；行为符合预期。
- CI：`.github/workflows/ci.yml`、`release.yml` 都在，`install-verify` 仍只手动触发；本轮无法运行 CI（本机不能 push），静态看门槛与上面第 2 条一致。

## 五、UNVERIFIED 清单

1. 真实宿主渲染的「首次启动 → 写 → 保存 → 重开」：沙箱禁 WebView2 控制器（`0x8000FFFF`，§三.3）。
2. 安装后的 `HKCU\Software\Sidelight`、`HKCU\…\Uninstall\Sidelight`、开始菜单 `Sidelight.lnk`、SmartScreen 首次提示、真人双击：注册表与 `%APPDATA%` 写入被沙箱拒绝（§三.2）。
3. 正式 `packaging/installer.ps1`（写 `release/` 那条路径）：本轮按约束不改 `release/`，用同一条 `makensis` 命令把产物指到 `.tmp`；脚本自身的版本门、内部预算与 SHA256 打印由 `-AssocDryRun` 走通。
4. macOS 包、签名/公证、真实 Intel Mac：本机是 Windows，未跑。
5. 打包产物里 Mermaid 首次渲染的懒 chunk 下载时序：本次 E2E 的围栏没形成代码块，未测（渲染本身由第 47 轮 tester 在 dev server 覆盖）。
