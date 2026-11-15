# 第 02 轮 · 计划

基线 `7f6058e`，v0.16.3。5 个任务：B 组（builder2，宿主与发布）T1→T2→T4→T5，A 组（builder，UI）T3 与 B 组并行。T1 第一优先，T5 可延后。
**构建纪律**：任何实施者不跑 `npm run build`；builder 用 `npx tsc --noEmit` 与 `npx vite build --outDir .tmp/build-a`；builder2 不建前端，直接复制现有 `dist`（1,392,880 B，`.tmp/wv2` SDK 与 `host/bin` 已就位）；最终 `npm run build` 由根代理在两人完成后串行跑一次。任务编号用 T，发现编号用 B/S/U/O。
**跨组契约**：T3 步骤 0 在 `App.tsx` 暴露 `window.__slState = { dirty, name }`，T1 的脏判断查它；根代理在步骤 0 落地后放行 T1 的 dirty 验收（T1 的队列与注入重构可先做）。

## T1 双击第二个文件不再丢字（B1）｜B 组（builder2，先做）

- **目标**：第二实例转发时，当前文档有未保存改动就先确认，默认「否」= 保留当前文档；WebView2 初始化完成前与 reload 中的转发进队列、导航完成后重放，不丢。
- **为什么现在**：发现 B1（数据丢失）。`host/Program.cs:207` 的 `OpenFileIntoDoc` 无条件写 `localStorage` 后 reload；`:241-249` 的管道处理既不判 `CoreWebView2` 是否就绪、也不问脏；`:222` 的 `try/catch` 吞异常。**脏判断不能用 localStorage 文本启发式**（H1）：存盘不删 localStorage（`App.tsx:1040`）、文件树打开的文档宿主不知道、写失败时读到旧文本会误判「不脏」。
- **文件**：`host/Program.cs`、`host/send-keys.ps1`、`host/test-forward.mjs`（新）、`host/README.md`
- **步骤**
  1. 队列：`Queue<string> forwardQueue`、`bool navReady`；`NavigationStarting` 置 `navReady=false`，`OnNavigationCompleted` 置 true 后 drain；日志 `forward queued` / `forward drained`；同一路径不重复入队。
  2. 脏信号：`OpenFileIntoDoc` 改 `async void ApplyForwardAsync(path)`，先 `ExecuteScriptAsync("(window.__slState&&window.__slState.dirty)?1:0")`；返回 `1` 才问，`0` 直接换；`undefined` 或异常时按脏处理并 log `forward dirty=unknown`（保守，不静默替换）。
  3. 确认框：`MessageBox.Show("当前文档有未保存的改动。打开 <名>.md 会替换它。", "Sidelight", YesNo, Warning, Button2)`；否 → log `forward cancelled`，正文不动；是 → 注入 + `location.reload()` + log `forward confirmed`。
  4. `lastAppliedText/lastAppliedName` 只在宿主自己应用文档时更新（初始 argv 注入、转发应用后），**不再作为脏判据**；存盘成功与文件树打开由前端 `setDirty(false)`（`App.tsx:962`、`:1038`）反映到 `__slState`，宿主读到的就是干净。
  5. `send-keys.ps1` 加 `-Dialog YesNo -Choice Yes|No`；PID 发现改成「Sidelight 进程的所有可见 `#32770`」，找不到再退 `msedgewebview2`；点 `GetDlgItem(hDlg,6|7)` + `BM_CLICK`（现状 `:60-71` 只找 msedgewebview2，点不到 Sidelight 的 MessageBox）。
  6. 注入与执行包 try/catch，失败 log `forward failed <原因>`；未就绪不丢队列。
  7. `host/README.md` 记日志关键字与 `dirty=unknown` 的保守行为。
- **验收（4 例，一条命令 `node host/test-forward.mjs`；先 `powershell -File host/build.ps1`，CDP 9335）**
  1. **dirty-cancel**：起 `host/bin/Sidelight.exe .tmp\fw\first.md` → CDP 在 `.editor` 末尾输入 `DIRTY-MARK`（不保存）→ 起第二个带 `second.md` → 等 `host.log` 出现 `forward dirty=1` → `powershell -File host/send-keys.ps1 -Dialog YesNo -Choice No` → 断言 `localStorage['sidelight.doc.v1']` 的 `text` 仍含 `DIRTY-MARK`、`name` 仍 first、日志 `forward cancelled`（不只断 DOM）。
  2. **dirty-confirm**：同例 `-Choice Yes` → `localStorage.text` = second 内容、`name` = second、日志 `forward confirmed`。
  3. **race 无改动**：起第一个后 120 ms 内起第二个，**不输入任何字符** → 断言日志没有 `forward dirty=1`、没弹框（`send-keys` 不入场）、最终 `localStorage.name` = second、第二进程 exit 0。
  4. **reload 中再转发**：先让第一个实例应用一次转发（触发 reload），在 `nav completed` 之前再发第二个路径 → 断言出现 `forward queued`、最终内容是**最后一个**路径的内容、无 `forward failed`。
- **门禁**：`powershell -ExecutionPolicy Bypass -File host/build.ps1; node host/test-forward.mjs`（4 例全 PASS）
- **风险与回退**：`__slState` 未落地时 T1 只能先跑队列例；`dirty=unknown` 会多弹一次框（安全侧）；`#32770` 按钮 ID 6/7 依赖 WinForms 版本。回退：`git checkout -- host/` 并删 `test-forward.mjs`。
- **难度** M ｜ **量级** 140–200 行

## T2 长路径与启动失败要说人话（B2 + B3）｜B 组（builder2，T1 后）

- **目标**：300 字符路径能打开（带 `\\?\` 与不带前缀各一条）；打不开时标题栏与日志明说原因；缺 `www` 或数据目录不可写时给可读窗口、关闭即 exit 1，不再挂死。
- **为什么现在**：B2 实测 `\\?\` 也失败，根因是 .NET 4 legacy 路径处理；B3 的模态框是开发者口气且进程不退（`host/Program.cs:159` 的 MessageBox 阻塞）。本机 `%LOCALAPPDATA%` 分支从未成功（发现的环境事实），所以数据目录失败必须有独立文案。
- **文件**：`host/Program.cs`、`host/build.ps1`、`host/Sidelight.exe.config`（新）、`host/app.manifest`（新）、`host/README.md`、`host/test-failure.mjs`（新）
- **步骤**
  1. `Resolve`：已是 `\\?\` 前缀原样返回；否则先 `Path.GetFullPath`（抛异常就保留原串），长度 ≥240 时加 `\\?\` 前缀；`File.Exists` 用前缀版。
  2. `Sidelight.exe.config`：`supportedRuntime v4.0` + `AppContextSwitchOverrides="Switch.System.IO.UseLegacyPathHandling=false;Switch.System.IO.BlockLongPaths=false"`；`app.manifest` 写 `longPathAware=true`；`build.ps1` 拷 config 到 `host/bin`，csc 用**绝对路径** `/win32manifest:"$PSScriptRoot\app.manifest"`（从 `host/` 运行时相对路径会找不到）。
  3. 打不开可见：`form.Text = "Sidelight — 打不开：<文件名>"`，log `open failed path=... reason=too-long|missing`；正文仍是草稿，但标题与日志说清楚。
  4. 启动失败：删 `MessageBox`；`ErrorForm` 成为主窗（主 `Form` 不显示，`Application.Run(errorForm)`），标题 `Sidelight 启动失败`，正文按原因二选一：缺 `www` →「缺少运行文件 www/index.html。请重新解压完整的 zip。日志：<exe目录>host.log」；数据目录三级全失败 →「无法创建 WebView2 数据目录：<路径>。便携模式请把程序放到可写目录。日志：<exe目录>host.log」。关闭 → `Environment.Exit(1)`；看门狗 **8 s** 兜底。
  5. 数据目录：探针名用 `Guid` + `try/finally` 删除；顺序 `%LOCALAPPDATA%` → `%TEMP%\Sidelight\WebView2` → exe 同级；log `data dir=<路径>` / `data dir FAILED`，回退时标题加「（便携数据目录）」。
- **验收**：`node host/test-failure.mjs` 四例，每例结束 `Stop-Process` 并还原被改名的文件：
  - `longpath`：造 309 字符路径，带 `\\?\` 与不带各一次 → 两例都 PASS（CDP 9335 读正文含标记），日志无 `argv file missing`。
  - `nowww`：整份复制 `host/bin` 到 `.tmp` 并删 `www` → 3 s 内 `MainWindowTitle` = `Sidelight 启动失败`；测试**主动关窗**（`CloseMainWindow()`）→ 10 s 内进程 exit 1、日志含 `重新解压`（看门狗 8 s 只是兜底，测试不靠它）。
  - `datadir-readonly`：子进程环境把 `LOCALAPPDATA` 与 `TEMP` 都指向同一个 `icacls` 拒写目录，并把 exe 复制到一个同样拒写的目录 → 三级全失败，断言标题 `Sidelight 启动失败`、正文含「无法创建 WebView2 数据目录」、exit 1；非管理员下 `icacls` 设不上就记 UNVERIFIED 并写原因。
  - `datadir`：日志有 `data dir=` 且目录存在（本机实测走 `%TEMP%` 分支，`%LOCALAPPDATA%` 标 UNVERIFIED）。
- **门禁**：`powershell -ExecutionPolicy Bypass -File host/build.ps1; node host/test-failure.mjs`
- **风险与回退**：manifest 与 config 可能不被采纳；先验前缀路径再验无前缀，两者分开判；`Application.Run(errorForm)` 与主窗生命周期要理清（主窗不显示就不存在两个 Run）。回退：`git checkout -- host/`。
- **难度** M ｜ **量级** 170–240 行

## T3 首次使用可信：模拟标注 + 对比度 + 对话框焦点（U1→U3→U2）｜A 组（builder，与 B 组并行）

- **目标**：没配 Key 时界面明写「模拟」；次要文字对比度 ≥4.5:1、关键小字全部 ≥12px；三个对话框接管焦点、带 `aria-modal`、背景 `inert`、关闭后焦点还给打开者。
- **为什么现在**：U1 是首次使用信任第一条（3 条成稿式假批注、`.rail-notice`=null）；U3 实测 `--ink-faint` 2.93–3.31:1、卡头 10.5px；U2 打开设置后 12 次 Tab 全在框外、`aria-modal`=null。三条都动 `App.tsx` 与 `styles.css`，归一人串行避免互踩。
- **文件**：`src/App.tsx`、`src/components/MarginRail.tsx`、`src/components/SettingsDialog.tsx`、`src/components/SaveDialog.tsx`、`src/styles.css`；新增 `src/components/useDialogFocus.ts`（唯一新文件，三处对话框共用一份焦点逻辑）。
- **步骤**
  0. **契约先行**：`useEffect(() => { window.__slState = { dirty, name: docName } }, [dirty, docName])`，并在 `App.tsx` 里 `declare global { interface Window { __slState?: { dirty: boolean; name: string } } }`；这是 T1 的输入，先落地再改 U1。
  1. U1：`const simulated = !hasKey(settings)`（`src/lib/settings.ts:64`）；传给 `MarginRail`；在 `.rail-empty` 之前加 `.rail-notice-mock`：「未配置 API Key，下面是本地模拟批注，不调用模型」；卡头 `note-kind` 后加 `<span className="note-kind note-kind-mock">模拟</span>`；顶栏按钮写 `分析本段（模拟）`/`分析选中（模拟）` 并加 title；设置里 Key 空时显示「未配置」。
  2. U3：`--ink-faint: #666c72`（暗色 `#9aa0a6`）、`--mark: #9a5b1c`；字号全部抬到 12px：`.note-head`、`.status-bar`、`.note-actions button`、`.dialog-note`、`.rail-goal-label`、`.rail-goal-retry`（不设 11px 例外，与目标一致）；加 `:focus-visible{outline:2px solid var(--accent);outline-offset:2px}`；风险条正文改用 `--ink`；**补齐新类的样式**：`.rail-notice-mock`（左边框 2px `--line-strong`、`--ink` 字、12px）与 `.note-kind-mock`（`--line-strong` 底、`--ink` 字）。
  3. U2：`useDialogFocus` 做五件事——记 opener、聚焦框内首个可聚焦元素、Tab/Shift+Tab 循环、关闭还原焦点、打开时给背景容器（工具栏/正文/页边栏的父容器）设 `inert`，关闭时移除（`aria-modal` 只是声明，`inert` 才挡住读屏与脚本）；三个对话框加 `aria-modal="true"` 与 `aria-labelledby`（各自 `h2` 加 id）；`SettingsDialog`、`SaveDialog`、`App.tsx:1996` 的切换框都接。
  4. 顺带 C1：`styles.css` 补 `.primary`（`--accent` 底、`--paper-raised` 字）与 `.analyze-button`（`--accent-wash` 底、`--accent-ink` 字、600）。
- **验收（tester 复现：dev 5173 + CDP 9222；对比度按 WCAG 2.x 相对亮度公式算）**
  - 对比度算法：每通道 `c<=0.03928 ? c/12.92 : ((c+0.055)/1.055)^2.4`，`L=0.2126R+0.7152G+0.0722B`，`(L1+0.05)/(L2+0.05) ≥ 4.5`。亮色目标：`#666c72` on `#f6f4ee` ≥4.8、on `#fffdf8` ≥5.2；`#9a5b1c` 上白字 ≥5.4；暗色目标：`#9aa0a6` on `#15171a` ≥6.8、on `#1c1f23` ≥6.2（用 `emulateMedia` 切暗色复算一遍）。
  - U1：清 localStorage、不填 Key、选中一段点分析 → `.rail-notice-mock` 文本含「本地模拟批注」、`.note-kind-mock` 数 = 3、按钮文本含「（模拟）」、设置里显示「未配置」；`.note-kind-mock` 的 `backgroundColor` 非透明、`color` = `#1d2023`；截图 `shots/round-02/t3-u1.png`。
  - U3：上表全部达标（亮色 + 暗色）；`.note-head`/`.status-bar`/`.note-actions button`/`.dialog-note`/`.rail-goal-label`/`.rail-goal-retry` 计算字号 ≥12；键盘聚焦按钮时 `outlineWidth` ≥2；截图 `t3-u3.png`。
  - U2：打开设置 → `activeElement` 在 `[role="dialog"]` 内、`aria-modal="true"`、`aria-labelledby` 指向存在的 `h2`；背景容器 `inert` = true；连按 12 次 Tab 全在框内；Esc 后 `activeElement` = 打开它的按钮、背景 `inert` 已移除；`SaveDialog` 与切换框的 `aria-modal` 同样为 true；截图 `t3-u2.png`。
- **门禁**：`npx tsc --noEmit; npm test; npx vite build --outDir .tmp/build-a`（不跑 `npm run build`；`scripts/acceptance.mjs` 的「无控制台错误」受本机扩展噪声影响，见发现的门禁基线，本轮不判）
- **风险与回退**：焦点陷阱、`inert` 与新 `:focus-visible` 会改现有截图与 Tab 顺序，属预期；`.primary` 改色影响三个对话框按钮对比；`.rail-goal-label` 抬到 12px 后长中文可能多折一行，属可接受布局变化。回退：`git checkout -- src/` 并删 `useDialogFocus.ts`。
- **难度** M ｜ **量级** 170–220 行

## T4 便携 zip + 图标（S1 + S2）｜B 组（builder2，T2 后）

- **目标**：`release/Sidelight-0.16.3-win-x64-portable.zip` 不超过门槛，解压后 spawn 可用，窗口与任务栏有图标；zip 内有 `Sidelight.exe.config`（T2 的长路径开关依赖它），没有 `webview2-data`。
- **为什么现在**：S1 实测 zip 880,260 B / 57 ms（含旧 exe、无 ico）；S2 实测混合 ico 23,724 B，纯 PNG ico 在 .NET 宿主里会花屏。没有安装器之前，这是唯一能交付的东西。
- **文件**：`packaging/portable.ps1`（新）、`packaging/mkico.cs`（新）、`packaging/sidelight.ico`（生成并跟踪）、`packaging/README.txt`（新）、`packaging/verify-portable.mjs`（新）、`host/build.ps1`、`host/Program.cs`
- **步骤**
  1. `packaging/mkico.cs` 用 `csc` 生成混合 ico：16/24/32/48 为 32bpp DIB、256 为 PNG，产物 `packaging/sidelight.ico`。
  2. `host/build.ps1` 加 `/win32icon:packaging\sidelight.ico`；`Program.cs` 设 `form.Icon`（文件缺失就跳过，不抛）。
  3. `portable.ps1`：staging `.tmp\portable\Sidelight` 放 `Sidelight.exe` + 3 dll + **`Sidelight.exe.config`** + `sidelight.ico` + `README.txt` + `LICENSE` + `dist`（当 `www/`）；断言无 `webview2-data`、无 `host.log`、无 `.ps1`；`[IO.Compression.ZipFile]::CreateFromDirectory(...,Optimal,$true)`；**打印 staging 与 zip 实测字节、SHA256**；zip 超门槛就 exit 1 并打印各文件占比。
  4. `README.txt` 一页：解压、双击、SmartScreen「更多信息 → 仍要运行」、需要 WebView2 运行时、移动文件夹后看 `host.log`、不写注册表不做 `.md` 关联（待产品确认）。
  5. `verify-portable.mjs`：解压到 `.tmp\portable-check`，断言解压目录里有 `Sidelight.exe.config`、`sidelight.ico`、`www/index.html`；起 exe，等 `MainWindowTitle`，用 CDP 9335 断言 `.ProseMirror`=1 且控制台错误 0；关窗后断言进程 0。
- **验收**
  1. `powershell -File packaging/portable.ps1` exit 0；脚本打印 staging 与 zip 实测字节。**staging 期望 ≈2,375,017 B**（2,351,293 + ico 23,724，T1/T2 的 exe 增量另算，以打印为准）；**zip 门槛 940,000 B**（推导：880,260 实测无 ico + ico 压缩约 12 KB + exe 增量约 15 KB + config 约 1 KB + 余量约 15 KB ≈ 923 KB，取 940 KB；实测高于门槛就先打印分布，不硬改门槛）。
  2. `node packaging/verify-portable.mjs` exit 0（config/ico/www 存在 + `.ProseMirror` + 0 错误 + 退出干净）。
  3. zip 条目：含 `Sidelight.exe`、**`Sidelight.exe.config`**、`sidelight.ico`、`README.txt`、`LICENSE`、`www/index.html`；无 `webview2-data`、无 `host.log`、无 `*.ps1`。
  4. 图标：`[BitConverter]::ToUInt16([IO.File]::ReadAllBytes('packaging\sidelight.ico'),4) -eq 5`（ICO idCount 在偏移 4–5，不是「第 4 字节」）；第 5 条目首 4 字节 `89 50 4E 47`；`[System.Drawing.Icon]::new('packaging\sidelight.ico',32,32).ToBitmap().GetPixel(16,16)` 为 `#2b6d64`；截图 `shots/round-02/t4-portable.png` 能看到窗口图标。
  5. 无注册表写入：跑前跑后各查一次 `Test-Path 'HKCU:\Software\Classes\Sidelight.md'` = False。
  6. **真人双击 / 资源管理器解压 / SmartScreen 路径标 UNVERIFIED**，写进 `impl-b.md`，不算本任务证据。
- **门禁**：`powershell -File packaging/portable.ps1; node packaging/verify-portable.mjs`
- **风险与回退**：zip 条目用反斜杠（Windows 正常，跨平台解压会平铺，已接受）；exe 未签名、SmartScreen 必拦一次；ico 坏了不会崩，只会静默退回默认图标，靠第 4 条抓。回退：删 `packaging/`，还原 `host/build.ps1` 与 `Program.cs`。
- **难度** M ｜ **量级** 270–350 行

## T5 文档与仓库卫生（README / ADR-0004 / CI）｜B 组（builder2，最后，做不完留给第 3 轮）

- **目标**：README 不再说「frontmatter / 行内 HTML / 脚注被改坏」；ADR-0004 的体积读数改成「取数命令 + 实测值」；CI 加超时、并发与最小权限。
- **为什么现在**：发现 S5 逐条对过 `docs/roundtrip-report.md`，这三类已逐字节保真；「已知的重要问题」段在误导验收与发布说明。ADR-0004 现在是旧值 3,165,041，写法本身不可复现。
- **文件**：`README.md`、`docs/adr/0004-webview2-host-before-admin.md`、`.github/workflows/ci.yml`
- **步骤**
  1. README「已知的重要问题」段：删「frontmatter 被当成标题分隔线 / 行内 HTML 被转义 / 脚注定义被删」与「三条还没做」，改成：这三类已保真，剩余损失是引用式链接被改写、表格对齐重排、空行差异（`3 / 7`，7 个样本不动）。
  2. README 开头「当前仓库是第二版原型，跑在浏览器里，还没套 Tauri 壳」→ 有 C# WebView2 宿主（`host/`）、没有安装器；「现在不能做什么」第一条「没有 Tauri 壳，没有安装包」→「没有安装器；便携 zip 见 `packaging/`」。
  3. ADR-0004 体积：**先跑取数命令**，把实测值连同命令写进 ADR：
     `(Get-ChildItem host\bin -File | Where-Object Name -in 'Sidelight.exe','Microsoft.Web.WebView2.Core.dll','Microsoft.Web.WebView2.WinForms.dll','WebView2Loader.dll','Sidelight.exe.config' | Measure-Object Length -Sum).Sum + (Get-ChildItem host\bin\www -Recurse -File | Measure-Object Length -Sum).Sum`
     写明「载荷 = 上式为实测；工作目录含 `webview2-data`（约 12.5 MB，随运行增长），不进发布包」。
  4. `ci.yml`：加 `timeout-minutes: 15`、`concurrency: {group: ci-${{ github.ref }}, cancel-in-progress: true}`、`permissions: contents: read`；不动 job 结构，不加 windows job。
- **验收**：`Select-String README.md -SimpleMatch '被当成标题分隔线','被转义成','脚注定义被删','还没做','第二版原型','跑在浏览器里','没有 Tauri 壳'` **0 命中**；`'3 / 7'`、`'C# WebView2 宿主'`、`'没有安装器'` 各 ≥1；ADR-0004 含取数命令原文与 `不进发布包`，且命令输出与 ADR 里的数字一致（tester 复算）；`ci.yml` 含 `timeout-minutes`/`concurrency`/`permissions` 各 ≥1；`npm test` 0 失败。
- **门禁**：`npm test` + 上述 `Select-String` + 复算 ADR 取数命令
- **风险与回退**：数字必须在 T4 之后现场跑，不抄任何旧值；本任务整条可延后。
- **难度** S ｜ **量级** 40–60 行

## 文件归属与并行（零重叠）

| 任务 | 组与顺序 | 独占文件 |
| :--- | :--- | :--- |
| T1 | B（builder2，先做） | `host/Program.cs`、`host/send-keys.ps1`、`host/test-forward.mjs`、`host/README.md` |
| T2 | B（builder2，T1 后） | `host/Program.cs`、`host/build.ps1`、`host/Sidelight.exe.config`、`host/app.manifest`、`host/test-failure.mjs`、`host/README.md` |
| T4 | B（builder2，T2 后） | `packaging/**`、`host/build.ps1`、`host/Program.cs` |
| T5 | B（builder2，最后，可延后） | `README.md`、`docs/adr/0004-*.md`、`.github/workflows/ci.yml` |
| T3 | A（builder，与 B 组并行） | `src/App.tsx`、`src/components/{MarginRail,SettingsDialog,SaveDialog}.tsx`、`src/components/useDialogFocus.ts`（新）、`src/styles.css` |

- 两组零重叠：A 只碰 `src/`，B 只碰 `host/`、`packaging/`、`README.md`、ADR-0004、`ci.yml`。`host/Program.cs` 与 `host/build.ps1` 由 T1/T2/T4 串行改（同一实施者）；README.md 与 ADR-0004 只有 T5 改。`package.json`、`scripts/`、`.gitignore` 本轮无人改（`*.zip` 已忽略）。
- 跨组依赖只有一条：T3 步骤 0 的 `window.__slState`（T1 读）。
- 报告：A 组 `docs/iteration/round-02/impl-a.md`，B 组 `impl-b.md`，根代理合并 `impl.md`；截图 `shots/round-02/t*-*.png`。

## 本轮不做（写进下轮建议）

U4 窄屏断点、U5 错误文案与 toast 动作、首次使用状态矛盾、冷启动 2 s 根因、`.md` 关联（用户可见能力，待产品负责人确认）、`shots/` 瘦身与跟踪策略、B4 切源码清空撤销栈、B5 粘贴公式、KaTeX 按需加载与字体白名单、验收脚本的 `chrome-extension://` 噪声过滤。

## 本轮 Demo（≤3 条用户可见变化）

1. 双击第二个 `.md` 会先问一句；选「否」当前文档与未保存内容原样保留，早期双击与 reload 中的双击也不再丢。
2. 没配 Key 时页边与按钮明写「模拟」；对话框能用 Tab 走、Esc 关、焦点回到打开它的按钮；小字更清楚。
3. 便携 zip 解压后 **spawn 可用**、窗口与任务栏有图标（资源管理器双击与 SmartScreen 路径未验证）。

## 风险最高的任务

**T1**。它同时修脏判断、初始化前排队与 reload 中的转发，还依赖 T3 步骤 0 的 `__slState`；`#32770` 与按钮 ID 6/7 依赖 WinForms 版本。真正的风险是「测试绿了但真实双击仍丢」：缓解是四例都自动断言内容（`localStorage.text`，不只 DOM），并保留 `host.log` 顺序证据。次高是 T4：图标坏掉不崩溃，只会静默退回默认图标，只能靠 ico 中心色断言抓。

## 下一轮建议主题

**能安装、能信任**：先查 S3 的宿主 2 s 下限（宿主里 A/B 最小页 → 定位节流或虚拟主机 IPC），再补 U4 窄屏与 U5 错误反馈（含 toast 动作与导出反馈），同时把首次使用状态改自洽；编辑器侧一起收 B4 撤销历史与 B5 粘贴公式；发布侧做 `.md` 关联方案评审（需产品负责人点头）与 `shots/` 瘦身、门禁噪声过滤。
