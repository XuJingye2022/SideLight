# 第 22 轮 finder：安装与平台第二批（Windows 11 / v0.30.4 源码 + 0.30.3 产物）

侦察时间 2026-11-16 11:41–11:50。只读侦察：没有改 `src/`、`host/`、`host-mac/`、`packaging/`、`release/`、`dist/`、注册表或设置。实验产物都在 `.tmp/r22-install/`（`probe.ps1`、`probe2.ps1`、`probe.log`、`probe2.log`、`host-primary.log`、`sample.md`、`i-run/`、`i-run2/`）。

**先说两个范围事实**

1. 第 21 轮 I1/I2/I4/I5 没有修：`git diff 584d5e7 -- packaging host host-mac` 为空，`installer.nsi` 与 `App.swift` 一个字节没变。本轮任务是复核它们，并把「第二次启动」「Finder 打开」「版本可见性」挖到可实施粒度。
2. `release/` 里没有 0.30.4 产物（最新是 0.30.3，`818,642 B`）。覆盖安装/卸载实验只能用 0.30.3 setup；宿主源码与 `host/bin/Sidelight.exe` 是 0.30.4 树里的当前版本。本会话里 setup 与宿主仍是 Low IL（日志 `state dir kind=portable`、`log migrated`），所以**文件级结论有效，HKCU 级结论一律标为代码证据、未观测**。

## 四问直答

| 问 | 结论 | 证据 |
| :--- | :--- | :--- |
| 1. 运行中覆盖安装/卸载 | **未修**。覆盖安装 `exit=0`、旧宿主保留、前端被替换（`exe=82945` 未变，`README_back=True`）；运行中卸载 `exit=0`，`uninstall.exe` 与 `www` 被删，留 4 个被进程加载的文件，应用仍能跑。安装器与卸载器仍无任何进程检测。 | `probe2.log` A–J；`installer.nsi:82-108`、`:146-157` |
| 2. 第二次启动 | **未修，且更细**：空载荷仍被丢弃（secondary `pipe sent bytes=0`，primary 无日志）；**带路径时 primary 会打开文档（`open applied source=forward`）但从不恢复/置前**——窗口最小化时第二次启动后 `iconic=True` 不变。macOS 仍无单实例锁，端口被占弹错后照旧建窗并连第一个实例的服务。 | `host-primary.log`；`probe.ps1` 第 7 步；`Program.cs:113-118`、`:1611`；`App.swift:54-62`、`:96-98` |
| 3. macOS Finder 双击 `.md` | **未修**。零处 `openFiles`/`openFile`/`kAEOpen`。新事实：`CommandLine.arguments` 分支对 Finder 与 `open -a` **都不触发**（`open` 发 Apple Event，不是 argv），只对从 shell 直接执行二进制有效；`openPath` 也不 `makeKeyAndOrderFront`，窗口关掉后 Cmd+O 打开的文件不会显示。 | `App.swift:64-67`、`:186-198`、`:93`（唯一一次 `makeKeyAndOrderFront` 在 `buildWindow`）；三文件 grep 计数 |
| 4. 版本可见性 | 文档有 0.30.4（`README.md:94/105`、CHANGELOG），**二进制没有**：0.30.3 setup 的 `FileVersion`/`ProductVersion`/`ProductName`/`CompanyName`/`FileDescription` 全空；`host/bin/Sidelight.exe` 与卸载残留 exe `FileVersion=0.0.0.0`、`ProductName=''`；NSIS 仍无 `VIProductVersion`/`VIAddVersionKey`；macOS 关于菜单 `action: nil`（`App.swift:106`），只是 `CFBundleShortVersionString` 由 `build.sh:115` 注入 `0.30.4`。另：`Sidelight.exe --version` 不支持，`args[0]` 被当文档路径（`Program.cs:84`）。 | `probe2.log` K；`Get-Item` 版本字段；`installer.nsi` grep；`App.swift:106` |

## P1（M）运行中覆盖安装/卸载：旧宿主保留，卸载后残目录不可再卸

**证据（`probe2.log`）**

```
H uninstall(running) code=0 ms=156 dir=True uninstaller=False
I left: Microsoft.Web.WebView2.Core.dll 703328 | Microsoft.Web.WebView2.WinForms.dll 38792 |
        Sidelight.exe 82945 | WebView2Loader.dll 194912
J ghost app alive=True
```

卸载器在应用运行时先被复制到临时目录再执行，于是它把自己和 `www`、README 删掉，`RMDir /r "$INSTDIR"` 对 4 个已加载文件失败，但 `Section "Uninstall"` 后面没有 `IfErrors`，仍继续 `DeleteRegKey HKCU ...Uninstall\Sidelight`（`installer.nsi:148-149`、`:155-157`）。结果：目录里剩下能双击启动的 exe，而「设置 → 应用」里的卸载项已消失、`uninstall.exe` 也没了——用户再也无法用官方途径清掉它。第 21 轮只记了「留约 1 MB 残目录」，这条是残目录的**不可恢复性**与卸载器的自删顺序。

覆盖安装侧同轮复验：`G overwrite(running) code=0 ms=87 exe=82945`（追加的 1 字节还在=旧宿主保留）、`README_back=True`（前端被替换）、`app_alive=True http=200`（旧宿主继续服务新前端）。这不是 Low IL 写不进工作区：同一次安装里 README（`File` 条目）写成功了，只有被进程锁住的 exe 没换。

**为什么自动化看不见**：`packaging/verify-installer.ps1:68` 在安装前 `Get-Process Sidelight | Stop-Process -Force`，永远在「干净」状态下测；`.github/workflows/ci.yml:141-145` 的 `install-verify` 只允许 `workflow_dispatch` 且默认不跑。

**建议**（成本 **S**）：

1. `SEC_MAIN` 与 `Section "Uninstall"` 开头各加一段：`FindWindow`/`nsProcess` 找 `Sidelight.exe` → 交互模式提示「Sidelight 正在运行，先退出」，silent 模式 `taskkill /IM Sidelight.exe` 后等 2 s；仍失败则 `Abort` 并让退出码非 0。
2. `File`/`WriteUninstaller` 后加 `IfErrors` → `Abort`（silent 下非 0），这样 `verify-installer.ps1` 能把它变成 FAIL。
3. 卸载顺序改成「先删注册表、后 `RMDir`」不够；应先确认 `RMDir` 成功（或至少 `uninstall.exe` 不删），残目录才有第二次机会。

## P2（M）第二次启动：窗口永不恢复/置前；空载荷仍被丢弃

**证据**

- `probe2.log`：`D second(with md) code=0 ms=35`，primary 日志 `pipe received file=sample.md` → `open applied source=forward` → 文档确实换了；但 `probe.ps1` 第 7 步把 primary 用 `SW_MINIMIZE` 最小化后，再带同一个 `.md` 启动一次，`iconic=True` 不变——**用户视角仍是「点了没反应」**，而文档已经在后台换掉了。
- 空载荷：`F second(no args) code=0 ms=62`，secondary 日志 `pipe sent bytes=0`，primary 一行日志都没有（`Program.cs:1611` 的 `line.Trim().Length > 0` 把空串丢掉）。代码里 `Forward(null)` → `payload=""` → base64 空串 → `WriteLine("")`（`:1633`、`:1644`）。
- `host/Program.cs` 全文：`ShowWindow` 0 次、`SetForegroundWindow` 0 次、`Activate(` 0 次。拿到互斥体就走到 `Application.Run`（`:113-118` 之后），secondary 无任何提示、`exit 0`。
- macOS：`App.swift:54-62` `try server.start()` 失败只 `showError`，不退出；`:96-98` 照旧加载 `127.0.0.1:47821`（第一个实例的服务），第二个窗口用本进程 `HostStore` 保存 → 第 21 轮 I2 的 `FILE_GONE` 路径仍在。全文件无 mutex/`NSRunningApplication` 检查。

**建议**（成本 **S**）：

1. Windows：pipe 收到空载荷时 `ShowWindow(mainForm.Handle, SW_RESTORE)` + `SetForegroundWindow`；收到路径时先置前再 `OpenByPath`（顺序反过来会让「取消保存」把窗口留在后台）。
2. macOS：`applicationDidFinishLaunching` 开头用 `NSRunningApplication.runningApplications(withBundleIdentifier: "app.sidelight.mac")` 排掉自己；`server.start()` 失败时给出「已有一个 Sidelight 在运行」并 `exit(1)`，不要建窗。

## P3（M/S）macOS 打开链路：Finder 不开文件，关窗后也无法再显示

**证据（静态，Windows 上不能跑 Swift）**

- `Info.plist:34-49` 声明 `.md`/`.markdown`、`LSHandlerRank=Alternate` → 「打开方式」里会出现 Sidelight；但 `host-mac/Sources/SidelightMac/` 里 `openFiles`、`openFile`、`kAEOpen`、`NSAppleEvent`、`applicationShouldHandleReopen` 全部 0 命中。
- `App.swift:64-67` 是唯一「按路径打开」的自动入口，取 `CommandLine.arguments`。Finder 双击与 `open -a Sidelight file.md` 走 LaunchServices → Apple Event，argv 只有可执行文件路径，所以**这条分支在真实用户路径上永远拿不到文件**（第 21 轮 I4 把 `open -a … file` 也算作 argv 入口，这句要更正）。
- `openPath`（`:186-198`）只改标题 + `webView.reload()`，不 `makeKeyAndOrderFront`；唯一的 `makeKeyAndOrderFront` 在 `buildWindow`（`:93`）。所以窗口用红色按钮/Cmd+W 关掉后（`applicationShouldTerminateAfterLastWindowClosed` 未设，进程还在），Cmd+O 或最近列表「打开」会在一个已关闭的窗口里换文档，用户看不到任何窗口；点 Dock 图标也没有 `applicationShouldHandleReopen` 把它叫回来。
- 双击 `.md` 的当前实际行为：LaunchServices 激活已有实例（或启动新实例）→ 无 `openFiles` → 显示空文档/上次内容，**不打开用户点的文件**。

**建议**（成本 **S**）：

1. 实现 `func application(_ sender: NSApplication, openFiles filenames: [String])` 与 `application(_:open urls:)`，逐个 `openPath`，最后 `NSApp.reply(toOpenOrPrint: .success)`；`applicationDidFinishLaunching` 里先处理「事件早于 finishLaunching」的暂存队列。
2. `openPath` 末尾 `window.makeKeyAndOrderFront(nil)` + `NSApp.activate(ignoringOtherApps: true)`。
3. 补 `applicationShouldHandleReopen(_:hasVisibleWindows:)` → `window.makeKeyAndOrderFront(nil)`。
4. `Info.plist` 的 `CFBundleDocumentTypes` 已有声明，不用改；改完再跑 `host-mac/verify.sh` 与 `--self-test`。

## 本轮最值得做的 3 件事

1. **P1**：安装/卸载前处理运行中的实例，并让 `File` 失败真的 `Abort`（silent 非 0）。这是唯一会留下「半坏升级 + 不可卸载残目录」的路径，成本 S。
2. **P2**：第二次启动恢复并置前窗口，空载荷也要有反馈；macOS 加单实例锁并在端口冲突时退出。成本 S，直接消掉「点了没反应 = 坏包」。
3. **P3**：macOS 接 `openFiles`/`open urls`，`openPath` 补 `makeKeyAndOrderFront`，补 Dock 重开。成本 S，修的是 macOS 用户装完后的第一个动作。

## 未验与下一轮补法

| 项 | 为什么没验 | 怎么补 |
| :--- | :--- | :--- |
| HKCU 卸载项残留（P1 的「卸载项已删」） | 本会话安装器 Low IL，HKCU 写不进、读不到 | Medium IL 交互桌面跑一次「运行中卸载」，截图「设置 → 应用」 |
| 0.30.4 产物级覆盖安装 | `release/` 没有 0.30.4 包 | 出包后重跑 `probe2.ps1`（只改 `$setup` 路径） |
| 交互式安装器在文件被占用时是否弹 Abort/Retry/Ignore | 无交互桌面，只能 `/S` | 真人双击、保持应用运行，截图对话框 |
| macOS P3 全部行为 | 本机 Windows，不能编译 Swift | macOS 真机：双击 `.md`、关窗后 Cmd+O、点 Dock 图标，各截一张 |
| `--version` 的当前行为 | 会再起一个实例并打开错误文档，本轮没跑 | 干净目录 `Sidelight.exe --version`，看是否变成 primary 并报 `FILE_GONE` |
