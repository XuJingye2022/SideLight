# WebView2 宿主 spike

用系统自带的 .NET Framework 4.8 `csc.exe` 编一个原生窗口，把前端 `dist` 装进去。目的是回答一个问题：**在 WebView2 里，现有前端的 File System Access 代码能不能真实读写磁盘。** 答案在第 01 轮已验证：能（见 `docs/adr/0004-webview2-host-before-admin.md`）。

这不是最终安装包。它没有 `.md` 文件关联、没有自动更新、没有签名。它只在 Windows 11 + WebView2 运行时已装的机器上跑。

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

宿主在固定回环端口起一个只读 HTTP 服务（`TcpListener`，`http://127.0.0.1:47821/`）服务 `host\bin\www`，再导航 `index.html`。必须用 `http://127.0.0.1`（安全上下文）而不是 `file://`：File System Access API 只在安全上下文可用。

## 回环 origin（固定端口 47821）

- 为什么不用 `SetVirtualHostNameToFolderMapping`：同一个 WebView2 里实测映射主机 DCL 2,011 ms / FCP 2,040 ms，回环 HTTP DCL 28 ms / FCP 60 ms，`WebResourceRequested` 方案 FCP 2,392 ms。三组读数与决策见 `docs/adr/0005-loopback-fixed-origin.md`。
- 端口固定为 **47821**：origin 每次启动都一样，`localStorage`（API Key、草稿）才能跨启动保留。端口被占用时写 `loopback port busy 47821`，弹「端口 47821 被占用，请关闭占用它的程序后重开」并 `exit 1`；**不换端口、不回退虚拟主机**。
- `SIDELIGHT_PORT` 环境变量只用于测试时覆盖端口，正常启动不要设。
- 服务只处理 `GET`/`HEAD`（其余 405），响应带 `Content-Type`、`Content-Length`、`Connection: close`、`Cache-Control: no-store`。MIME 白名单：`.html .css .js .woff2 .svg .png .ico .json`。
- 目录穿越：拒绝含 `..`、反斜杠、盘符冒号、`//` 开头的路径；`Uri.UnescapeDataString` 失败回 400；`Path.GetFullPath` 后必须落在 `www` 目录内，否则 403；扩展名不在白名单回 404。每次拒绝写 `loopback refused path=… reason=…`。
- **旧 origin 的一次性代价**：`https://sidelight.local` 上的 `sidelight.settings.v1` 与 `sidelight.doc.v1` 不会迁移到新 origin，升级后用户会丢一次设置与草稿。这是首次公开发布前接受的代价（ADR-0005），本轮不做跨 origin 迁移。

其他行为：

- 单实例：命名 Mutex `Global\Sidelight`，被拒绝时退回 `Local\Sidelight`。第二个实例把 argv 里的路径经命名管道 `Sidelight.argv` 转给第一个实例，然后退出（exit 0）。
- 权限：`PermissionRequested` 对 `FileReadWrite` 一律 `Grant`。
- argv 注入：文件内容读成字节，base64 后写进 `localStorage['sidelight.doc.v1']`，再 `location.reload()`。注入脚本靠 `sessionStorage['sl:argv-done']` 守卫，重载后直接返回，不会无限重载。日志写在 `host\bin\host.log`。
- WebView2 用户数据目录：先试 `%LOCALAPPDATA%\Sidelight\WebView2`；本机在代理沙箱里对被拒（`UnauthorizedAccessException`），自动退回 `host\bin\webview2-data`。这是能跑通的那条路径。

## 第二实例转发（脏确认与排队）

第二个实例把文件路径经命名管道转给第一个实例后退出。第一个实例不会直接替换正文：

- **脏判断**：先执行 `(window.__slState===undefined?-1:(window.__slState.dirty?1:0))`。`0` 直接换；`1` 弹确认框，默认按钮是「否」；`-1` 或执行失败记为 `dirty=unknown`，**按脏处理**（多问一次，绝不静默替换）。页面导航完成到 React 挂载之间会等 `__slState` 出现，最多 3 s。
- **确认框**：`当前文档有未保存的改动。打开 <名>.md 会替换它。`，`YesNo` + `Warning` + `Button2`（默认「否」）。选「否」时正文与 localStorage 都不动。
- **排队**：WebView2 没就绪或正在导航（`NavigationStarting` 之后、`NavigationCompleted` 之前）时收到的路径进队列，导航成功后重放，只应用队列里最后一个路径。导航失败则保留队列。
- **日志关键字**（`host\bin\host.log`）：`pipe received` → `forward queued` / `forward dirty=1` / `forward dirty=0` / `forward dirty=unknown` → `forward confirmed` / `forward cancelled` → `forward drained` → `forward applied`；失败为 `forward failed <原因>`。
- `dirty=unknown` 的代价是可能多弹一次确认框；收益是任何读不到脏标记的情况都不会吞掉未保存内容。

## 长路径

- `Sidelight.exe.config` 关掉 .NET 4 的 legacy 路径处理（`UseLegacyPathHandling=false`、`BlockLongPaths=false`），必须和 exe 放在一起。
- `app.manifest` 声明 `longPathAware=true`，编译时用 `/win32manifest` 嵌进 exe。
- `Resolve`：已是 `\\?\` 前缀原样返回；否则先 `Path.GetFullPath`，长度 ≥240 时加 `\\?\`。实测 309 字符路径带前缀与不带前缀都能打开。
- 打不开时窗口标题写「Sidelight — 打不开：<文件名>」，日志写 `open failed path=… reason=too-long|missing`，正文保留上一份草稿。

## 下载落点

导出的 HTML/Markdown/纯文本与「无句柄保存副本」都走 WebView2 下载。宿主注册了 `DownloadStarting`：

- 测试环境变量 `SIDELIGHT_DOWNLOAD_DIR` 存在 → 直接落到该目录，不弹框；否则同步弹 `SaveFileDialog`（`FileName` 只取建议路径的 basename，`InitialDirectory` 用上次目录或 `Downloads`）。取消 → `Cancel=true`。
- **两条分支都 `Handled = true`**，否则 WebView2 会再弹它自己的下载 UI。日志：`download starting name=… result=… handled=true mode=env|dialog`，状态变化记 `download state=… reason=… bytes=…`。
- SDK 1.0.4314.35 的 `DownloadStarting` 没有 `SuggestedFileName`，用默认 `ResultFilePath` 的 basename 代替（同样防越界）。
- 本机代理沙箱里浏览器进程无法创建下载文件（`reason=FileFailed`，试过快照目录、`.tmp` 与 `webview2-data` 三处），所以 `host/download-probe.mjs` 只验到「事件接住 + 路径正确」，落盘标 UNVERIFIED。用 Playwright 连 CDP 时它会截走下载，探针会先把 `Browser.setDownloadBehavior` 复位成 `default`。
## 启动失败与数据目录

- 前置检查在显示主窗之前做：缺 `www/index.html`、或三级数据目录全失败，直接开错误窗（标题 `Sidelight 启动失败`），正文写用户能懂的原因与日志路径。关窗 exit 1；8 s 看门狗兜底。
- 数据目录顺序：`%LOCALAPPDATA%\Sidelight\WebView2` → `%TEMP%\Sidelight\WebView2` → exe 同级 `webview2-data`。每级用 `Guid` 探针文件试写并 `try/finally` 删除。日志：`data dir=<路径> kind=localappdata|temp|portable`，全失败写 `data dir FAILED tried=…`。走便携目录时窗口标题带「（便携数据目录）」。
- 本机代理沙箱下前两级都写不进，实际走的是便携目录（日志 `kind=portable`）。

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

- 没有 `.md` 关联、卸载、签名、自动更新。
- 未测：中文输入法、中文路径、大文件、并发打开多个文件。
- 长路径已测：309/313 字符，带与不带 `\\?\` 前缀都能打开（`host/test-failure.mjs`）。
- 未测：`RemoveScriptToExecuteOnDocumentCreated`。SDK 1.0.4314.35 的 .NET 投影只有 `AddScriptToExecuteOnDocumentCreatedAsync`，没有对应的 Remove 包装（查过 dll 字符串表）。一次性注入由注入脚本自己的 `sessionStorage` 守卫保证，验收用 `sl:argv-runs === '1'` 与 `framenavigated === 2` 证明。
- 冷启动没有跟浏览器基线对比。

## 批注端点与高分屏（0.31.x）

- `GET /__annotations`：只读当前文档同目录 `.sidelight/annotations/<CacheKey>.json`；没有文件回 404，超过 512 KiB 回 413。
- `annotations-save`：页面消息 `{v:1,type:"annotations-save",id,text}`，原子写同一路径；回 `annotations-save-result`（`ok/error`）。只读回 `READONLY`、目录不可写回 `IO`；带 `path/fileName/file` 一律 `BAD_REQUEST`。
- 验收：`node scripts/host-annotation-acceptance.mjs`（6 项）。
- 高分屏：只靠 `app.manifest` 的 `PerMonitorV2, PerMonitor`。**不要在 `Sidelight.exe.config` 声明 `System.Windows.Forms.ApplicationConfigurationSection`**——.NET Framework 4.8 下声明后宿主启动会抛「配置系统未能初始化」并退出（方案 A 实测失败，已回退为方案 B）。
- 风险：未在真实 150%/200% 缩放屏上验；本机 100% 只能证明清单生效（`GetProcessDpiAwareness = 2`）。