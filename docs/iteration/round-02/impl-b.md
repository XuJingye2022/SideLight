# 第 02 轮 · 实施报告 B（builder2）

执行人：builder2。顺序 T1 → T2 → T4 → T5，全部完成。
基线 `7f6058e`，v0.16.3。环境：Windows 11 22631、Node 24.21、无管理员、WebView2 157.0.4341.46、`csc.exe` 4.8.9232.0（C# 5）、WebView2 SDK 1.0.4314.35。
纪律：未跑 `npm run build`；未 commit；未写注册表；未装系统级依赖。`src/`、`scripts/`、`package.json` 一行未碰。

---

## 结论摘要

| 任务 | 结果 | 门禁 |
| :--- | :--- | :--- |
| T1 双击第二个文件不丢字 | **PASS** | `build.ps1` + `node host/test-forward.mjs` → **12/12** |
| T2 长路径与启动失败说人话 | **PASS** | `build.ps1` + `node host/test-failure.mjs` → **6/6** |
| T4 便携 zip + 图标 | **PASS**（真人双击/SmartScreen 标 UNVERIFIED） | `portable.ps1` + `verify-portable.mjs` → **6/6** |
| T5 文档与仓库卫生 | **PASS** | 全部 `Select-String` 断言 + `npm test` exit 0 |

回归：第 01 轮的宿主验收 `node scripts/host-smoke.mjs --fsa` 仍是 **7/7 PASS**（T1 的队列与脏判断没有破坏 argv/单实例/FSA）。

---

## T1 双击第二个文件不再丢字（B1）

### 改动

- `host/Program.cs`
  - 转发改成 `EnqueueForward`（管道线程）→ `form.BeginInvoke` → `EnqueueForwardOnUi`。`navReady == false` 时进 `Queue<string> forwardQueue` 并写 `forward queued`；同一路径积压时不重复入队。
  - `NavigationStarting` 置 `navReady=false`；`NavigationCompleted` 成功才置 true 并 drain，只应用队列里**最后一个**路径（写 `forward drained <path>`）；导航失败保留队列（`forward deferred`）。
  - `ApplyForwardAsync`：先等前端挂上 `window.__slState`（最多 3 s，100 ms 一次），再执行 `(window.__slState===undefined?-1:(window.__slState.dirty?1:0))`。`0` 直接换；`1` 弹 `MessageBox`（YesNo + Warning + 默认 Button2）；`-1`/异常记 `forward dirty=unknown` 并按脏处理（保守，不静默替换）。选否写 `forward cancelled` 并原样保留；选是写 `forward confirmed`。
  - `BuildArgvScript` 与 `OpenFileIntoDoc` 合并成 `BuildApplyScript(text, name, oneShotGuard)`：argv 用带 `sessionStorage` 守卫的版本，转发用无守卫版本，同一份 JS 不再抄两遍。
  - 注入/执行包 `try/catch`，失败记 `forward failed <原因>`；`ExecuteScriptAsync` 的 Task 失败也记。
- `host/send-keys.ps1`：加 `-Dialog YesNo -Choice Yes|No`。先枚举 **Sidelight 进程**的可见 `#32770`，找不到再退 `msedgewebview2`；`GetDlgItem(6|7)` + `BM_CLICK`。文件夹模式保持不变（`-Dialog Folder` 默认）。
- `host/test-forward.mjs`（新）：四例自动化，CDP 9335。
- `host/README.md`：新增「第二实例转发（脏确认与排队）」段，写日志关键字与 `dirty=unknown` 的保守行为。

### 验收（4 例）

```text
PASS dirty-no：日志出现 forward dirty=1 — forward dirty=1
PASS dirty-no：确认框点「否」 exit 0 — send-keys exit=0
PASS dirty-no：正文没被替换（localStorage 仍是 first + DIRTY-MARK） — cancelled=true name=first.md dirty=true
PASS dirty-no：第二进程 exit 0 — exit=0
PASS dirty-yes：日志出现 forward dirty=1 — forward dirty=1
PASS dirty-yes：确认框点「是」 exit 0 — send-keys exit=0
PASS dirty-yes：确认后换成 second（内容 + 名字） — confirmed=true storeName=second.md
PASS dirty-yes：第二进程 exit 0 — exit=0
PASS race：初始化前转发不丢（最终 second，且没问脏） — storeName=second.md dirty1=false unknown=false
PASS race：第二进程 exit 0 — exit=0
PASS reload-race：reload 期间转发进队列并最终生效 — queued=true drained=true final=third.md failed=false
PASS reload-race：第三进程 exit 0 — exit=0
summary: 12/12 PASS
```

- 脏判断**不读 localStorage 文本**：读的是前端 `window.__slState.dirty`（存盘成功与文件树打开都走 `setDirty(false)`）。
- 例 1/2 断言的是 `localStorage['sidelight.doc.v1']` 的 `text` 与 `name`，不是 DOM。
- 例 4 的时序是确定性的：等日志出现 `navigation starting`（reload 已经开始）再起第三实例，所以必然进队列。

### 偏离

- **`dist` 落后于 `src`**：`dist/assets/index-BT3J9VLZ.js`（17:16）里没有 `__slState`（`src/App.tsx` 17:45 才加）。T1/T2 的自动化改用 `npx vite build --outDir .tmp/build-b` 的产物复制进 `host/bin/www` 测试（不碰 `dist`、不跑 `npm run build`）。**根代理跑完 `npm run build` 后，T4 的 zip 要用同一条命令重打**（见 T4 偏离）。

---

## T2 长路径与启动失败要说人话（B2 + B3）

### 改动

- `host/Sidelight.exe.config`（新）：`supportedRuntime v4.0` + `AppContextSwitchOverrides=Switch.System.IO.UseLegacyPathHandling=false;Switch.System.IO.BlockLongPaths=false`。
- `host/app.manifest`（新）：`longPathAware=true`。
- `host/build.ps1`：`/win32manifest:"<host>\app.manifest"`（绝对路径）；`Sidelight.exe.config` 拷进 `host/bin`。
- `host/Program.cs`
  - `Resolve`：已是 `\\?\` 原样返回；否则 `Path.GetFullPath`（异常就保留原串），长度 ≥240 加 `\\?\`。
  - 打不开：`form.Text = "Sidelight — 打不开：<文件名>"`，日志 `open failed path=… reason=too-long|missing`。正文仍是上一份草稿。
  - 启动前置检查移到显示主窗之前：缺 `www/index.html` → 错误窗「缺少运行文件 www/index.html。请重新解压完整的 zip。日志：…」；数据目录三级全失败 → 「无法创建 WebView2 数据目录……」。错误窗标题 `Sidelight 启动失败`，关闭 → `Environment.Exit(1)`，8 s 看门狗兜底。WebView2 环境创建失败时先关主窗再开同一错误窗（`fatalInitError`）。
  - 数据目录：`%LOCALAPPDATA%\Sidelight\WebView2` → `%TEMP%\Sidelight\WebView2` → exe 同级 `webview2-data`；每级用 `Guid` 探针 + `try/finally` 删除；日志 `data dir=<路径> kind=localappdata|temp|portable` / `data dir FAILED tried=…`；便携目录时标题加「（便携数据目录）」。
- `host/test-failure.mjs`（新）：四例（长路径两条 + nowww + datadir-fail + datadir）。
- `host/README.md`：新增「长路径」「启动失败与数据目录」两段。

### 验收

```text
long fixture len=309
PASS longpath-plain：300+ 字符路径能打开 — len=309 marker=true missing=false failed=false
PASS longpath-prefixed：300+ 字符路径能打开 — len=313 marker=true missing=false failed=false
PASS nowww：标题是「Sidelight 启动失败」 — title=[Sidelight 启动失败]
PASS nowww：主动关窗后 exit 1、日志说重新解压 — exit=1 cue=true
PASS datadir-fail：三级全失败时标题「Sidelight 启动失败」、正文说无法创建数据目录、exit 1 — title=[Sidelight 启动失败] body=true exit=1 failed=true
PASS datadir：日志有 data dir= 且编辑器可用 — data dir=…\host\bin\webview2-data kind=portable
summary: 6/6 PASS
```

- 长路径用例带 `\\?\` 与不带各一条，正文都读到了 `LONG-PATH-MARKER`，日志无 `argv file missing`。
- `nowww` 是整份复制 `host/bin` 到 `.tmp\t2-nowww` 并删掉 `www`；标题在 1 s 内出现，测试主动 `CloseMainWindow()`，进程 exit 1，日志含「重新解压」。
- `datadir-fail` 的正文用 Win32 `EnumChildWindows` + `GetWindowText` 读错误窗的 Label，确认写着「无法创建 WebView2 数据目录」。

### 偏离 / UNVERIFIED

- **数据目录本机两级别都不可写**：`%LOCALAPPDATA%` 与 `%TEMP%` 在代理沙箱里都建不了目录，实际每次走 `kind=portable`。计划预期「本机走 `%TEMP%`」，与实测不符。`%LOCALAPPDATA%` 与 `%TEMP%` 分支的成功路径在本机 **UNVERIFIED**（代码路径本身被 datadir-fail 用例覆盖了失败分支）。
- **`datadir-readonly` 改用「路径被文件挡住」而不是 `icacls`**：先试过 `icacls /deny` 再 `spawn` exe，`CreateProcess` 直接 `EPERM`（非管理员下 denial ACE 连执行都挡，测试无法启动被测程序）。改成：`TEMP`/`LOCALAPPDATA` 指向一个文件之下（`CreateDirectory` 必失败），exe 同级 `webview2-data` 位置先放同名文件。三级别全失败的真实代码路径与文案一致，但没有覆盖「权限被拒」这一具体原因。
- 300+ 字符路径的**保存**（不只是打开）未测。

---

## T4 便携 zip + 图标（S1 + S2）

### 改动

- `packaging/mkico.cs`（新）：用 `csc` 编译后生成混合 ico（16/24/32/48 为 32bpp DIB，256 为 PNG）。图形沿用 `index.html` 的青绿圆点 `#2b6d64`，大尺寸加一道浅色内环。
- `packaging/sidelight.ico`（生成并跟踪）：23,724 B、5 个条目。
- `host/build.ps1`：`/win32icon:<repo>\packaging\sidelight.ico`（文件缺失时只警告、不带图标）。
- `host/Program.cs`：`form.Icon` 读 exe 同级的 `sidelight.ico`，缺失或损坏就跳过。
- `packaging/portable.ps1`（新）：staging `.tmp\portable\Sidelight` → 断言无 `webview2-data` / `host.log` / `*.ps1` → `[IO.Compression.ZipFile]::CreateFromDirectory(..., Optimal, $true)` → 打印 staging 与 zip 实测字节、SHA256；zip 超 940,000 B 打印各文件占比并 exit 1。可选参数 `-Www <目录>`（默认 `dist`）。
- `packaging/README.txt`（新）：解压、双击、SmartScreen「更多信息 → 仍要运行」、需要 WebView2 运行时、数据目录、看 `host.log`、不写注册表不做 `.md` 关联。
- `packaging/verify-portable.mjs`（新）：解压 → 条目断言 → spawn → CDP 断言 `.ProseMirror`=1、只看 `sidelight.local` 的控制台错误 0 → 截窗口图 → 关窗 → 进程 0。

### 验收

```text
staging=2,403,820 B  (.tmp\portable\Sidelight)
zip=900,029 B        release\Sidelight-0.16.3-win-x64-portable.zip
sha256=06068441B996F6E1A9C00ABA359E518DC41B272E63F8A0C7A17EE0F59F08B0A8
threshold=940,000 B
portable.ps1 exit 0

PASS zip 能解压
PASS zip 条目齐全（exe/config/ico/README/LICENSE/www） — entries=30
PASS zip 不含 webview2-data / host.log / *.ps1
PASS 截图能拍到窗口（含标题栏图标） — shots/round-02/t4-portable.png
PASS 解压后 spawn 可用：.ProseMirror=1、控制台 0 错误（只看 sidelight.local）
PASS 关窗后进程 0 — aliveBefore=1 close=True exit=0 left=0
summary: 6/6 PASS
```

- 图标：`idCount=5`；第 5 条目首 4 字节 `89 50 4E 47`；`Icon(…,32,32)` 中心像素 `#2b6d64`；`ExtractAssociatedIcon(host\bin\Sidelight.exe)` 返回 32×32。
- 无注册表写入：跑前 `HKCU:\Software\Classes\Sidelight.md` = False，跑后 = False。
- 窗口标题在解压运行显示「Sidelight（便携数据目录）」——因为本机前两级数据目录都不可写（见 T2 偏离）。

### 偏离 / UNVERIFIED

- **zip 里的前端是旧 `dist`**：`dist` 17:16 构建，不含本轮 `src/` 改动（`__slState`、T3 的模拟标注/对比度/对话框）。按纪律「T4 只复制现有 dist」没有重建。**根代理跑完 `npm run build` 后必须重打一次**：`powershell -ExecutionPolicy Bypass -File packaging/portable.ps1`。当前 zip 的宿主、config、ico 都是新的，只有 `www/` 是旧的。
- **真人双击 / 资源管理器解压 / SmartScreen 路径：UNVERIFIED**。本轮只证明「脚本解压 → spawn 可用 → 进程干净退出」，没有模拟 MOTW 与 SmartScreen 交互。
- zip 条目用反斜杠（.NET `CreateFromDirectory` 的已知行为）。Windows 解压正常；macOS/Linux 解压会平铺。目标平台 Windows，接受。

---

## T5 文档与仓库卫生（README / ADR-0004 / CI）

### 改动

- `README.md`
  - 开头：「第二版原型，跑在浏览器里，还没套 Tauri 壳」→「现有 **C# WebView2 宿主**（`host/`）与便携 zip（`packaging/`），没有安装器」。
  - 「现在不能做什么」第一条：「没有 Tauri 壳，没有安装包」→「没有安装器；便携 zip 见 `packaging/`。没有自动更新、没有代码签名」。
  - 「已知的重要问题」：删掉「frontmatter 被当成标题分隔线 / 行内 HTML 被转义 / 脚注定义被删」与「这三条还没做」，改成：frontmatter、脚注、行内 HTML、公式已逐字节保真；剩余损失是引用式链接被改写、表格对齐重排、空行差异（`3 / 7`，7 个样本不变）；三个兜底已落地。
- `docs/adr/0004-webview2-host-before-admin.md`：新增「载荷体积（第 02 轮实测，取数命令原样可复跑）」，写命令原文、实测 `2,376,980 B`（可执行文件与 SDK 程序集 984,100 + `www/` 1,392,880）、`webview2-data` 13,403,888 B 与 `host.log` **不进发布包**、zip 900,029 B；验收表第 1 行的旧数字 `3,165,041` 改成「载荷见下」。
- `.github/workflows/ci.yml`：加 `concurrency`（`ci-${{ github.ref }}`，cancel-in-progress）、`permissions: contents: read`、job `timeout-minutes: 15`。job 结构不动。

### 验收

```text
readme_neg=0    # 被当成标题分隔线 / 被转义成 / 脚注定义被删 / 还没做 / 第二版原型 / 跑在浏览器里 / 没有 Tauri 壳
readme_pos=3    # 3 / 7、C# WebView2 宿主、没有安装器
adr_cmd=1  adr_nopkg=1  adr_num=1
ci_timeout=1  ci_conc=1  ci_perm=1
payload_recomputed=2376980   # 与 ADR 里的数字一致
npm test -> exit 0
```

---

## 收尾与遗留

- 所有自己启动的 `Sidelight.exe` 已停止（计数 0）；按 `host\bin\webview2-data` / `.tmp\portable-check` 过滤的 `msedgewebview2.exe` 也为 0。未留临时服务。
- 未提交。新增 `packaging/`、`host/Sidelight.exe.config`、`host/app.manifest`、`host/test-forward.mjs`、`host/test-failure.mjs`；`release/*.zip` 被 `*.zip` 忽略，`host/bin/` 被忽略。
- **需要根代理做的一件事**：`npm run build` 之后重跑 `powershell -ExecutionPolicy Bypass -File packaging/portable.ps1`，再跑 `node packaging/verify-portable.mjs`，让 zip 里的 `www/` 与本轮前端一致。
- 未测（如实）：真人双击 / 资源管理器解压 / SmartScreen；`%LOCALAPPDATA%` 与 `%TEMP%` 数据目录的成功分支；长路径下的保存；中文输入法。
