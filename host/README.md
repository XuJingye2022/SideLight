# WebView2 宿主 spike

用系统自带的 .NET Framework 4.8 `csc.exe` 编一个原生窗口，把前端 `dist` 装进去。目的是回答一个问题：**在 WebView2 里，现有前端的 File System Access 代码能不能真实读写磁盘。** 答案在第 01 轮已验证：能（见 `docs/adr/0004-webview2-host-before-admin.md`）。

这不是最终安装包。它没有图标、没有 `.md` 文件关联、没有自动更新、没有签名。它只在 Windows 11 + WebView2 运行时已装的机器上跑。

## 前置

- Windows 11，WebView2 运行时已装（本机 157.0.4341.46）。
- 系统 `csc.exe`：`C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe`（4.8.9232.0，C# 5）。
- WebView2 SDK 1.0.4314.35，解到 `.tmp\wv2`：

```powershell
Invoke-WebRequest -Uri 'https://www.nuget.org/api/v2/package/Microsoft.Web.WebView2/1.0.4314.35' -OutFile .tmp\wv2.zip
Expand-Archive .tmp\wv2.zip .tmp\wv2
```

SDK 包里只有 `lib/net462`（没有 `net45`），`build.ps1` 按 `net462` 引用。SDK 不进仓库，`.tmp/` 与 `host/bin/` 都在 `.gitignore` 里。

## 构建

```powershell
npm run build                                   # 先产出 dist（宿主自己不构建）
powershell -ExecutionPolicy Bypass -File host\build.ps1
```

`build.ps1` 做的四件事：检查 `dist\index.html`（缺失就退出）、`csc` 编译 `Program.cs`、拷 SDK 程序集与 `WebView2Loader.dll`、把 `dist\*` 拷进 `host\bin\www`。产物：

```text
host/bin/Sidelight.exe
host/bin/Microsoft.Web.WebView2.Core.dll
host/bin/Microsoft.Web.WebView2.WinForms.dll
host/bin/WebView2Loader.dll
host/bin/www/index.html
```

## 运行

```powershell
host\bin\Sidelight.exe                  # 空白编辑器
host\bin\Sidelight.exe .tmp\some.md     # 把该文件内容装进编辑器
```

宿主把 `host\bin\www` 映射到虚拟主机 `https://sidelight.local/`，再导航 `index.html`。必须用虚拟主机而不是 `file://`：File System Access API 只在安全上下文可用。

其他行为：

- 单实例：命名 Mutex `Global\Sidelight`，被拒绝时退回 `Local\Sidelight`。第二个实例把 argv 里的路径经命名管道 `Sidelight.argv` 转给第一个实例，然后退出（exit 0）。
- 权限：`PermissionRequested` 对 `FileReadWrite` 一律 `Grant`。
- argv 注入：文件内容读成字节，base64 后写进 `localStorage['sidelight.doc.v1']`，再 `location.reload()`。注入脚本靠 `sessionStorage['sl:argv-done']` 守卫，重载后直接返回，不会无限重载。日志写在 `host\bin\host.log`。
- WebView2 用户数据目录：先试 `%LOCALAPPDATA%\Sidelight\WebView2`；本机在代理沙箱里对被拒（`UnauthorizedAccessException`），自动退回 `host\bin\webview2-data`。这是能跑通的那条路径。

## 冒烟

```powershell
node scripts\host-smoke.mjs          # 窗口/渲染/argv/单实例
node scripts\host-smoke.mjs --fsa    # 追加真实读写：选文件夹、开真实 .md、改字、保存、比对哈希
```

冒烟用 `WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS=--remote-debugging-port=9333` 开 CDP，再用 `playwright-core` 连。`--fsa` 时 `host\send-keys.ps1` 驱动原生文件夹对话框：Win32 `EnumWindows` 找到 `#32770`，`GetDlgItem` 拿「文件夹:」编辑框（id 1152）与「选择文件夹」按钮（id 1），把绝对路径用 `SendKeys` 打进编辑框、回车两次导航并接受，必要时 `BM_CLICK` 兜底。全新 WebView2 配置也能自动选中 `.tmp\host-fs`（2026-11-15 实测，`elapsed=6718ms`）。

前置数据：`.tmp\host-argv.md`（argv 用例，含引号、反斜杠、换行）与 `.tmp\host-fs\sample.md`（读写用例）。两个文件缺失时脚本自己创建。

## 不进 npm 门禁

`host/` 不参与 `npm run build`、`npm test`、`npm run roundtrip`。CI 只跑前端三条。宿主坏了不影响产品代码。

## 已知缺口

- 没有图标、`.md` 关联、卸载、签名、自动更新。
- 未测：中文输入法、中文路径、长路径、大文件、并发打开多个文件。
- 未测：`RemoveScriptToExecuteOnDocumentCreated`。SDK 1.0.4314.35 的 .NET 投影只有 `AddScriptToExecuteOnDocumentCreatedAsync`，没有对应的 Remove 包装（查过 dll 字符串表）。一次性注入由注入脚本自己的 `sessionStorage` 守卫保证，验收用 `sl:argv-runs === '1'` 与 `framenavigated === 2` 证明。
- 冷启动没有跟浏览器基线对比。
