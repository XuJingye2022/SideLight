# 发布路径先走 C#/.NET Framework + WebView2 宿主，Tauri 2 留作目标

本机没有管理员权限、没有 Rust、没有 MSVC。Tauri 2 的官方 Windows 前提是 MSVC Build Tools，官方也只支持 MSVC target。这条路不是工作量大，是环境不允许。因此第 01 轮用一个 spike 验证另一条路：系统自带 `csc.exe`（.NET Framework 4.8，C# 5）编一个 WinForms 窗口，装 WebView2 控件，加载现有前端 `dist`。

关键前提是 WebView2 支持 File System Access API。如果它不支持，前端 `showDirectoryPicker` / `createWritable` / 缓存写入那套代码要重写成宿主 IPC，工作量翻倍。spike 的第 5 条验收专门证明这件事。

## 决定

- 发布路径先走 **C#/.NET Framework + WebView2 宿主**（`host/`），零下载、零管理员。
- **Tauri 2 仍是目标**，不是放弃。换过去的触发条件见文末。
- 宿主 spike 不进 npm 门禁，不改 `src/`。产品代码零风险。
- 便携 zip（路径 c）降为兜底：没有 `.md` 关联与单实例，只能当临时试用包。

## 测量结果（2026-11-15，本机）

环境：Windows 11 22631、WebView2 运行时 157.0.4341.46、`csc.exe` 4.8.9232.0（C# 5）、WebView2 SDK 1.0.4314.35（NuGet 包只含 `lib/net462`，没有 `net45`）。

| # | 验收项 | 结果 | 证据 |
| :--- | :--- | :--- | :--- |
| 1 | `host/build.ps1` exit 0，`host/bin/Sidelight.exe` 与 `host/bin/www/index.html` 存在 | PASS | 干净重建通过；载荷见下 |
| 2 | 窗口标题 `Sidelight`；`document.title` 为 `Sidelight`；`.ProseMirror` 存在；控制台 0 错误 | PASS | `(Get-Process Sidelight).MainWindowTitle` = `Sidelight`；`shots/round-01/t3-window.png` |
| 3 | 单实例：第二个进程 exit 0，进程数仍为 1 | PASS | `secondExit=0`，`(Get-Process Sidelight).Count` = 1 |
| 4 | argv：标记行进正文，脚本只注入一次（不无限重载） | PASS | `sl:argv-runs=1`、`sl:argv-done=1`、`navigation.type=reload`、`framenavigated=2` |
| 5 | 真实读写：选 `.tmp\host-fs`、打开 `sample.md`、改字、`Ctrl+S`、哈希变化并读回改动 | PASS | SHA256 `e732cc9c…` → `99993079…`，读回含 `EDITED-BY-HOST`；`shots/round-01/t3-fsa.png` |

判定表五条全 PASS，Kill criteria 一条未触发：

- 用户手势后选择器没有 reject；`showDirectoryPicker` 是 `function`，`window.isSecureContext` 为 `true`。
- 点「打开文件夹」出现系统对话框（`#32770`，属 `msedgewebview2.exe`）。
- 授权后 `getFileHandle` / `createWritable` 成功，写完磁盘字节变化。

## 实现要点（写进 `host/README.md`）

- 虚拟主机 `https://sidelight.local/` 映射到 `host/bin/www`。`file://` 不是安全上下文，File System Access 不可用。
- `PermissionRequested` 对 `FileReadWrite` 授予 `Allow`。
- 单实例用 `Global\Sidelight` Mutex（被拒时退回 `Local\Sidelight`），第二实例经命名管道把文件路径转给第一实例后 exit 0。
- argv 文件不拼 JS 字符串：读字节转 base64，注入脚本解码后写 `localStorage['sidelight.doc.v1']`，再重载一次。重载靠 `sessionStorage` 守卫只生效一次。

## 载荷体积（第 02 轮实测，取数命令原样可复跑）

```powershell
(Get-ChildItem host\bin -File | Where-Object Name -in 'Sidelight.exe','Microsoft.Web.WebView2.Core.dll','Microsoft.Web.WebView2.WinForms.dll','WebView2Loader.dll','Sidelight.exe.config' | Measure-Object Length -Sum).Sum + (Get-ChildItem host\bin\www -Recurse -File | Measure-Object Length -Sum).Sum
```

2026-11-15 第 02 轮收尾实测 **2,379,631 B**（可执行文件与 SDK 程序集 984,100 B + `www/` 1,395,531 B）。

工作目录 `host\bin` 里还有 `webview2-data`（同一时刻 14,284,436 B，随运行增长）与 `host.log`。**这两样不进发布包**：便携 zip 由 `packaging/portable.ps1` 打，staging 会断言它们不存在（zip 实测 900,752 B，SHA256 `63DA8F372D4EFC156E16AF21E42B390680C387BE2B55BF4EF62B620B2C58DFCC`）。

## 偏离与缺口

- SDK 1.0.4314.35 的 .NET 投影没有 `RemoveScriptToExecuteOnDocumentCreated` 的 Async 包装（查过 dll 字符串表，只有 `AddScriptToExecuteOnDocumentCreatedAsync`）。一次性注入改由注入脚本的 `sessionStorage` 守卫保证，验收用 `sl:argv-runs=1` 与 `framenavigated=2` 证明。
- `%LOCALAPPDATA%\Sidelight\WebView2` 在本机代理沙箱里写入被拒，宿主自动退回 `host\bin\webview2-data`。正式安装包要换成安装器给的可写目录。
- 无 `.md` 关联、无卸载、无签名、无自动更新。中文输入法、中文路径、大文件、冷启动对比未测；长路径已测（309/313 字符，带与不带 `\\?\` 前缀都能打开，见 `host/test-failure.mjs`）。
- 未签名 exe 会触发 SmartScreen。三条发布路径都有这个代价。

## 换 Tauri 2 的触发条件

满足任意一条就重新评估：

1. 拿到管理员权限，能装 MSVC Build Tools（或 Visual Studio Build Tools）。
2. GitHub Actions `windows-latest` 可用（自带 MSVC + WiX），正式发布走 CI 出安装包。

换过去只换宿主层，前端不动。这份 spike 的结论（WebView2 的 File System Access 可用）对 Tauri 同样成立，因为它用同一个 WebView2。
