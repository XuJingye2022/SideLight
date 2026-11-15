# 第 01 轮 · 实施报告 B（builder2）

执行人：builder2。顺序 T4 → T3，串行。基线 `342481b`，v0.16.3。
环境：Windows 11 22631、Node 24.21、无管理员、无 Rust/MSVC、WebView2 运行时 157.0.4341.46、系统 `csc.exe` 4.8.9232.0（C# 5）。
纪律：未跑 `npm run build`；类型检查用 `npx tsc --noEmit`；未 commit；未装系统级依赖。

---

## T4 开源就绪文件 + package.json 元数据 + README 三处事实

### 改动

| 文件 | 动作 | 内容 |
| :--- | :--- | :--- |
| `LICENSE` | 新建 | MIT，`Copyright (c) 2026 Sidelight contributors` |
| `CONTRIBUTING.md` | 新建 | 环境（Node 24）、门禁三条、实施者不跑 `npm run build`（收尾由维护者串行跑一次）、测试数以 `npm test` 输出为准、提交格式 `round-NN: <一句话>`、加依赖要写理由（README 记一行 + 提交信息）、ADR 与 GLOSSARY 位置、MIT 贡献授权 |
| `.gitattributes` | 新建 | `* text=auto eol=lf`、`*.md text eol=lf`、`fixtures/** -text`、`*.png binary`、`*.ico binary` |
| `.nvmrc` | 新建 | `24` |
| `.github/workflows/ci.yml` | 新建 | `on: [push, pull_request]`、`ubuntu-latest`、checkout@v4 + setup-node@v4（`node-version-file: .nvmrc`，cache npm）、`npm ci`、`npm run build`、`npm test` |
| `package.json` | 改 | 删 `"private": true`；加 `"license": "MIT"` 与 `"engines": { "node": ">=24" }`；依赖段一行未动 |
| `README.md` | 改 3 处（内容锚点） | (a) 「重开文档恢复批注」→「重开文档恢复批注（有磁盘句柄时，未验证）」；删「现在不能做什么」里的「批注不持久化：刷新或切换文件就没了。」(b) 目录树 `6 个真实 .md 样本` → `7 个真实 .md 样本`；(c) 「已知的重要问题」`6 个真实样本…0 / 6` → `7 个真实样本…3 / 7`（前后半句一起改） |
| `docs/roundtrip-report.md` | 重新生成 | `npm run roundtrip` 产物，归本任务 |

未动的五处（归 T5）：`共 19 个`、`九项验收`、`qa2/qa3/qa4`、`546 KB`、`不会被误判成公式`。

### 门禁输出（全部按内容匹配，无行号）

```text
files=True,True,True,True,True                      # LICENSE / CONTRIBUTING.md / .gitattributes / .nvmrc / ci.yml
license_lines=2                                      # 'MIT License' + 'Copyright (c) 2026 Sidelight contributors'
gattr=2                                              # '* text=auto eol=lf' + 'fixtures/** -text'
nvmrc=24
ci_hits=4                                            # node-version-file: .nvmrc / npm ci / npm run build / npm test
pkg_license=1 pkg_engines=1 pkg_private=0
json-ok license=MIT engines={"node":">=24"} private=false
readme_neg=0                                         # '批注不持久化' / '6 个真实' / '0 / 6' 全 0 命中
readme_pos=3                                         # '有磁盘句柄时，未验证' / '7 个真实' / '3 / 7' 各 1
npm test  -> exit 0
npx tsc --noEmit -> exit 0
```

`npm run roundtrip` 输出（报告已重写为这一版）：

```text
仅 StarterKit: 0/7 完全保真
StarterKit + 表格 + 任务列表: 0/7 完全保真
当前应用（扩展 + 保真修复）: 3/7 完全保真
ok 03-footnotes.md / 05-html-block.md / 07-math.md
```

### 偏离

- `package.json` 的 `repository` 没填：`git remote -v` 为空，计划禁止占位 URL。**待产品负责人给真实远程地址**，拿到后补 `repository`（顺便可补 `bugs`/`homepage`）。
- CI 只校内容，本轮不会运行：无 remote、未 push。不能当发布证据。
- 测试数没有写进文档（写在文档里的数字归 T5；`CONTRIBUTING.md` 明确「以 `npm test` 输出为准」）。
- 中文脚本编码：本机 `pwsh` 实为 Windows PowerShell 5.1，UTF-8 无 BOM 的含中文 `.ps1` 会被按 ANSI 解码（一个汉字尾字节可能吃掉后面的引号导致解析失败）。`host/build.ps1` 与 `host/send-keys.ps1` 因此写成 **UTF-8 with BOM**，`Program.cs` 由 `csc /codepage:65001` 保证。

---

## T3 WebView2 宿主 spike

### 交付文件

| 文件 | 说明 |
| :--- | :--- |
| `host/Program.cs` | WinForms 窗口 + WebView2（C# 5）。虚拟主机映射、`PermissionRequested` 授权、单实例 Mutex + 命名管道转发、argv base64 注入（一次性守卫）、日志 |
| `host/build.ps1` | 先 `Test-Path dist\index.html`（缺失即退出，绝不构建），`csc /target:winexe /platform:x64 /codepage:65001` 编译，拷 SDK 程序集与 `WebView2Loader.dll`，`Copy-Item dist\* host\bin\www -Recurse` |
| `host/send-keys.ps1` | 冒烟用：Win32 `EnumWindows` 找 `#32770`（`msedgewebview2` 的文件夹对话框）→ `GetDlgItem(1152)` 编辑框与 `GetDlgItem(1)` 按钮 → `SendKeys` 打绝对路径 + 回车两次 → `BM_CLICK` 兜底 |
| `host/README.md` | 前置、SDK 取法、构建、运行、冒烟、不进 npm 门禁、已知缺口 |
| `scripts/host-smoke.mjs` | spawn exe（`WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS=--remote-debugging-port=9333`）+ `playwright-core` 连 CDP，输出 PASS/FAIL 与截图 |
| `.gitignore` | 只加两行：`host/bin/`、`*.zip` |
| `docs/adr/0004-webview2-host-before-admin.md` | 决定、五项测量结果、偏离、换 Tauri 2 的触发条件 |

前置确认（critic 已下好）：`.tmp\wv2` 是 WebView2 SDK **1.0.4314.35**，只有 `lib\net462`（**没有 `net45`**，与 findings 里「未验证」项一致），`runtimes\win-x64\native\WebView2Loader.dll` 存在。SDK 不进仓库。

### 门禁输出

```text
powershell -ExecutionPolicy Bypass -File host\build.ps1
  OK D:\Documents\SidelightProgram\host\bin\Sidelight.exe
  bin 合计 3,165,041 B；www/index.html=True     （先删掉 host\bin 再编，干净重建）
  exit=0

node scripts\host-smoke.mjs --fsa
  cleanup: 开跑前 Sidelight 进程数 = 0
  PASS 窗口：document.title 为 Sidelight — document.title=Sidelight
  PASS 渲染：.ProseMirror 存在、控制台 0 错误 — errors=0
  PASS argv：标记行进正文、脚本只注入一次（framenavigated=2） — marker=true runs=1 done=1 navType=reload framenavigated=2
  PASS 单实例：第二进程 exit 0、窗口仍为 1 — secondExit=0 pages=1
  PASS FSA：系统文件夹对话框出现（#32770，msedgewebview2） — senderExit=0
  PASS FSA：文件夹对话框返回、文件树读到 sample.md — elapsed=6758ms
  PASS FSA：真实写盘（哈希变化 + 读回改动字符） — loaded=true 保存确认框=true hash=77ed4771→7321358d changed=true reread=true
  summary: 7/7 PASS
  exit=0
```

`Get-FileHash .tmp\host-fs\sample.md -Algorithm SHA256` = `7321358DD05C904069DF63824E080AEAE78C721B4C725CF411517B3AAF83FAA7`，与脚本打印的 after 哈希一致。

窗口标题与进程数（PowerShell 侧独立复核）：

```text
instance1 pid=29668 title=[Sidelight]
secondPid=58000 secondAlive=False
count=1
afterKill=0
```

### 五项判定

| # | 项 | 判定 | 证据 |
| :--- | :--- | :--- | :--- |
| 1 | 构建 | **PASS** | 干净重建 exit 0，`host/bin/Sidelight.exe` 与 `host/bin/www/index.html` 都存在 |
| 2 | 窗口 | **PASS** | `(Get-Process Sidelight).MainWindowTitle` = `Sidelight`；smoke：`document.title=Sidelight`、`.ProseMirror` 存在、控制台 0 错误 |
| 3 | 单实例 | **PASS** | 第二进程 `exit 0`（smoke 等 exit 事件）；进程数 1、CDP 页面数 1 |
| 4 | argv | **PASS** | 标记行进正文（`T3-MARKER … 单引号 … 第二行`）；`sl:argv-runs=1`、`sl:argv-done=1`、`navigation.type=reload`、`framenavigated=2` |
| 5 | FSA 真实读写 | **PASS** | 文件夹对话框出现 → 选中 `.tmp\host-fs`（`elapsed=6758ms`）→ 打开 `sample.md` → 改字 → `Ctrl+S` → 保存确认框「仍然保存」→ 磁盘哈希 `77ed4771…` → `7321358d…`，读回含 `EDITED-BY-HOST` |

判定表中无 FAIL、无 UNVERIFIED。Kill criteria 一条未触发：用户手势后选择器没有 reject（`window.isSecureContext=true`、`showDirectoryPicker` 是 `function`，critic 探针 + 本次五次授权成功）、对话框出现、`getFileHandle`/`createWritable` 成功、磁盘字节变化。

### 截图

- `shots/round-01/t3-window.png`：宿主窗口里的编辑器（1264×781，页面截图，不含原生标题栏）。
- `shots/round-01/t3-fsa.png`：「保存后文件会有这些差异」确认框，正文可见 `SAVE-MARKER-ORIGINAL EDITED-BY-HOST`。
- 窗口标题由 PowerShell 取 `MainWindowTitle` 验证（页面截图看不到任务栏标题）。

### 偏离与缺口

1. **`RemoveScriptToExecuteOnDocumentCreated` 不可用**：SDK 1.0.4314.35 的 .NET 投影只有 `AddScriptToExecuteOnDocumentCreatedAsync`（查过 `Microsoft.Web.WebView2.Core.dll` 字符串表与 `WebView2.idl`：COM 接口有 `RemoveScriptToExecuteOnDocumentCreated`，托管包装没有对应 Async 方法）。因此「只注入一次」靠注入脚本自己的 `sessionStorage['sl:argv-done']` 守卫，验收用 `sl:argv-runs=1` 与 `framenavigated=2` 证明没有重复注入。计划里「宿主在首个 NavigationCompleted 后调 Remove…兜底」这一步没有实现，原因写进 `host/README.md` 与 ADR-0004。
2. **`%LOCALAPPDATA%\Sidelight\WebView2` 写入被拒**：本机代理沙箱下 `Directory.CreateDirectory` 抛 `UnauthorizedAccessException`（同样路径用 PowerShell 手动建是成功的，判断是进程身份/沙箱限制）。宿主先试 LocalAppData，失败自动退回 `host\bin\webview2-data` 并在日志留一行。正式安装包要换成安装器给的可写目录。
3. **文件夹对话框自动化是新增文件**：`host/send-keys.ps1` 不在计划的文件清单里，但落在 T3 独占的 `host/**` 内。做法是 Win32 找对话框 + `SendKeys` 打路径（`SetWindowText` 不触发目录导航，实测只有真实按键会）+ `BM_CLICK` 兜底。全新 WebView2 配置（删掉 `webview2-data`）也能自动选中，`elapsed=6758ms`。
4. **页面截图不是整窗截图**：`page.screenshot` 只含 WebView2 内容区。窗口标题另用 PowerShell 验证。
5. **未测**（如实记，不写成 PASS）：中文输入法、中文路径、长路径（>260）、大文件、多文件并发、冷启动耗时、图标与 `.md` 关联、签名与 SmartScreen、卸载。
6. **未做**：`.md` 文件关联、`appId`、图标、安装包（属发布任务，不在 T3 五项内）。

### 收尾

- 所有自己启动的 `Sidelight.exe` 已停止：收尾 `Get-Process Sidelight` 计数 0。未留临时服务（未起静态服务器，宿主用虚拟主机映射）。
- `host/bin/`（exe、SDK 程序集、`www` 副本、`webview2-data`、`host.log`）被 `.gitignore` 忽略；`host/` 只提交源码与脚本。
- 调试用的临时截图已删，只留 `t3-window.png` 与 `t3-fsa.png`。

---

## 阻塞与下一轮

- 无阻塞项。T3 五条全 PASS，ADR-0004 可写「(b) 可用」。
- 待产品负责人：GitHub 远程地址（填 `package.json` 的 `repository`）；首发前确认署名。
- 下一轮建议（发布侧）：把 `host/` 转正做图标 + `.md` 关联 + 冷启动基线；把 `scripts/size.mjs` / `scripts/coldstart.mjs` 固化；CI 在 GitHub Actions 上真跑一次（需要 remote）。
