# 第 21 轮 finder：安装与平台（Windows 11 / v0.30.3）

侦察时间 2026-11-16。只读侦察：没有改 `src/`、`host/`、`host-mac/`、`packaging/`、`release/`、`dist/`。所有实验产物在 `.tmp/r21-install/`，日志与脚本留在那里可复跑。

## 方法与两个环境事实（先说清，后面的结论都受它影响）

跑过的实验：

| # | 实验 | 位置 |
| :--- | :--- | :--- |
| E1 | 官方验收脚本全跑一遍 | `.tmp/r21-install/verify-installer.log` |
| E2 | 静默安装到工作区目录，查注册表/快捷方式/字节 | `.tmp/r21-install/install-plain.log` |
| E3 | 覆盖安装：运行中改 exe 字节 + 删哨兵文件，再 `/S` 覆盖 | `.tmp/r21-install/sentinel.log` |
| E4 | 运行中点卸载 | 同 E3（D 段） |
| E5 | 便携版解压 → 起窗口 → 再启一次（单实例） | `.tmp/r21-install/scenarios.log` + `便携 测试\Sidelight\host.log` |
| E6 | 中文 + 空格路径：安装目录 `.tmp\r21-install\安装 目录（测试）`、便携目录 `.tmp\r21-install\便携 测试` | 同上 |
| E7 | 自编译诊断安装器（复制 `installer.nsi` 到 `.tmp`，加错误标志日志；**没有改仓库里的脚本**） | `.tmp/r21-install/diag.nsi`、`.tmp/r21-install/i-diag2/diag.log` |
| E8 | 最小 NSIS 探针（只写 HKCU + 快捷方式 + `whoami /groups`） | `.tmp/r21-install/min-probe.nsi`、`.tmp/r21-install/i-min/probe.log` |

两个环境事实（本轮新查明，之前只写「环境吞掉」）：

1. **本会话启动的 `setup.exe` 与 `Sidelight.exe` 跑在 Low 完整性级别。** E8 里由安装器自己 `nsExec` 出来的 `whoami /groups` 打出 `Mandatory Label\Low Mandatory Level`（S-1-16-4096）。Low IL 写不进 Medium 的 `HKCU\Software\*` 与 `%APPDATA%`，但能写工作区目录。同一会话里由 `pwsh` 起的普通 PowerShell 子进程是 Medium，能写 HKCU 与开始菜单（都实测过）。所以「HKCU/快捷方式不可观测」成立，**原因是安装器进程的完整性级别**，不是注册表读取问题。
2. 因为同一个原因，本会话里宿主的 `%LOCALAPPDATA%\Sidelight` 也不可写，宿主退到 `baseDir\state` 与 `baseDir\webview2-data`（见 E5 日志 `data dir candidate failed name=WebView2` 两次后 `data dir kind=portable`）。**真机（Medium IL）上不会这样退**，I3 的判断依据是代码顺序，不是这次沙箱的现象。

## 只能 UNVERIFIED 的项（本轮无法给证据，原因写清）

| 项 | 为什么测不了 | 下一轮怎么补 |
| :--- | :--- | :--- |
| HKCU 卸载项 7 个值、开始菜单快捷方式 | 安装器是 Low IL（E8），写不进 HKCU/`%APPDATA%`；`verify-installer.ps1:105-120` 因此只报 UNVERIFIED | 在 Medium IL 的交互桌面上跑一次 `installer.ps1` 产出的 setup，截图「设置 → 应用」与开始菜单 |
| SmartScreen 拦一次 | 需要交互桌面 + 从浏览器下载（本地文件没有 Zone.Identifier，`Get-Item -Stream *` 只有 `:$Data`） | 真人从 Releases 下载后双击，截图 |
| 勾选关联后「打开方式」里是否出现 | 需要交互安装（组件页勾选）+ Medium IL；`/S` 永远不勾（已验：dry-run 包 `/S` 不生成 `assoc-plan.txt`） | 真人勾选安装后右键 `.md` 截图 |
| 真人交互安装（目录页、组件页文案） | 无交互桌面 | 同上一行 |
| WebView2 缺失分支 | 本机 `pv=157.0.4341.46`，运行时存在 | 找一台干净的 Win10 或临时改注册表+目录名后跑 |
| macOS 全部（包结构/ Gatekeeper / 签名 / 升级） | 本机是 Windows，不能编译也不能运行 Swift 宿主 | macOS 真机或让 CI 跑一次带截图的 job |
| 真机升级（装到 `%LOCALAPPDATA%\Programs\Sidelight` 再覆盖） | 沙箱里改用 `/D=` 装到工作区（E2/E3），路径语义相同但目录不同 | 真机装 0.30.2 → 装 0.30.3 → 看目录与数据 |

## I1（M）运行中覆盖安装会「成功」地留下旧宿主；运行中卸载留下残目录

**证据（E3，`sentinel.log`）**

1. 干净装到 `.tmp\r21-install\i-lock`，把 `Sidelight.exe` 追加 1 字节（82,944 → 82,945，PE 仍可跑）。
2. 启动它（`http://127.0.0.1:47821/index.html` 返回 200，进程在跑）。
3. 再跑同一个安装包 `/S /D=同目录`：**`exit=0`，85 ms**。
4. 结果：`Sidelight.exe` 仍是 82,945 B（存档里是 82,944 B）→ **exe 没被替换**；同一次运行里被删掉的 `www\index.html` **回来了** → 前端被替换了。也就是「新前端 + 旧宿主」以退出码 0 报成功。
5. 对照组：应用退出后重装，`README.txt` 哨兵回来（`A reinstall(stopped): README back=True`），说明覆盖安装本身是好的，问题只在文件被占用时。
6. 卸载对照组（E4）：应用运行中点 `uninstall.exe /S`，`exit=0`，目录仍在，剩 `Sidelight.exe` + `Microsoft.Web.WebView2.Core.dll` + `Microsoft.Web.WebView2.WinForms.dll` + `WebView2Loader.dll`（正是进程已加载的 4 个文件），`uninstall.exe`、`www`、README 已删。

**代码**：`packaging/installer.nsi:82-108` 复制文件前没有进程检测（全文无 `FindWindow`、`nsProcess`、`taskkill`）；`Section "Uninstall"`（`:146-157`）也不杀进程；`File` 写失败只置错误标志，脚本没有 `IfErrors` 后 `Abort`。`verify-installer.ps1:68` 在安装前会 `Stop-Process Sidelight`，所以自动化永远看不到这个问题。

**影响**：用户升级时基本不会先退出应用（点完安装包才想起来）。宿主↔前端协议一旦在两个版本间改动（`/__doc` 字段、`save` 消息形状都改过），用户会拿到一个能开窗但保存失败/正文载入不了的应用，而且**重跑安装包也不会修**（exe 一直被占用），界面不提示要先退出。卸载场景留下约 1 MB 残目录，用户以为卸载完了。

**建议**：`Section SEC_MAIN` 与 `Uninstall` 开头各加一段「找到 `Sidelight.exe` 进程 → 提示并 `taskkill` 等待，或 `Abort` 并给出可见原因」；`File` 之后 `IfErrors` 走 `Abort`，silent 模式下让退出码非 0，这样 `verify-installer.ps1` 能抓到。成本 **S**。

## I2（M）第二次启动没有任何反馈：Windows 静默退出，macOS 开第二个窗口抢同一个回环端口

**证据**

- Windows（E5，`便携 测试\Sidelight\host.log`）：便携版运行中再启动一次，新进程 `exited=True code=0`（12 s 内），日志：

  ```
  state dir kind=portable
  secondary mutex=Global\Sidelight
  pipe sent bytes=0
  forwarded, exit
  ```

  第一个实例收到的是空载荷：`Program.cs:1611` 只有 `line.Trim().Length > 0` 才处理，空载荷被丢掉 → **不恢复窗口、不置前、不提示**。代码路径 `Program.cs:118-123`：拿不到互斥体就 `Forward(...)` 后 `return`，全程没有 UI。
- macOS：`host-mac/Sources/SidelightMac/App.swift` 全文没有单实例检查（无 mutex、无 `NSRunningApplication` 判断）。第二次启动时 `try server.start()` 抛错 → `showError(...)`（`App.swift:54-59`）弹一次警告后**继续** `buildMenu(); buildWindow()`，窗口加载固定的 `http://127.0.0.1:47821/index.html`（`App.swift:96-98`）——那台服务属于第一个实例。于是第二个窗口显示第一个实例的正文，而 `save` 走本进程的 `HostStore`（里面没有文档）→ `FILE_GONE`。

**影响**：Windows 上「点了没反应」最容易被判成坏包或崩溃（尤其从开始菜单点、窗口在别的虚拟桌面/最小化时）。macOS 上更糟：两个窗口共享一个文档源却各自保存，用户看到的是「保存失败」但不知道为什么。

**建议**：空载荷时第一个实例 `ShowWindow(SW_RESTORE)` + `SetForegroundWindow`（Win32 两行）；macOS 加单实例锁（`NSRunningApplication.runningApplications(withBundleIdentifier:)` 或 `flock`），端口被占且不是自己时 `exit(1)` 并给一条可操作的错误文案。成本 **S**。

## I3（M）便携版不便携：数据默认仍写 `%LOCALAPPDATA%\Sidelight`，与安装版共用

**证据（代码顺序，不是这次沙箱的现象）**

- `host/Program.cs:1260-1283` `ResolveUserDataDir()` 顺序：`%LOCALAPPDATA%\Sidelight\WebView2` → `%TEMP%\Sidelight\WebView2` → `baseDir\webview2-data`。便携目录是**第三顺位**。
- `host/Program.cs:1734-1748` `ResolveStateDir()` 顺序：`%LOCALAPPDATA%\Sidelight`（`recent.json`）→ `baseDir\state` → `%TEMP%\Sidelight`。同样第三顺位。
- `packaging/README.txt:33-34` 自己写了「优先 `%LOCALAPPDATA%\Sidelight\WebView2`；不可写时依次退到…」。
- 本轮 E5/E6 里日志出现 `data dir kind=portable`、`state dir kind=portable`，是因为沙箱里宿主是 Low IL（见开头事实 2）。**Medium IL 的真机上两条都会落到 `%LOCALAPPDATA%`。**
- 与安装版共存：两边 origin 都是 `http://127.0.0.1:47821`，WebView2 数据目录也默认同一个 → localStorage（含明文 API key、主题、字号）与 `recent.json` 是**同一份**；单实例互斥体又是 `Global\Sidelight`，所以同时只会有一份在跑（I2）。

**影响**：把便携包放进 U 盘或另一台机器，第一次运行就在那台机器的 `%LOCALAPPDATA%` 留下几十 MB 的 WebView2 profile 与最近列表；删掉便携目录不等于清理。用户以为「免安装 = 不留痕」，README 也没否认。反之，若用户先装了安装版再试便携版，两边的 key/设置/最近列表互相串。

**建议**：便携包里放一个标记文件（如 `portable.txt`）或检测 `baseDir\webview2-data` 存在时优先用它；命中便携目录时窗口标题保留「（便携数据目录）」，README 明写「便携版与安装版共用 `%LOCALAPPDATA%\Sidelight`，除非该目录不可写」。成本 **S**。

## I4（M）macOS：双击 `.md` 或「打开方式 → Sidelight」打不开文件（Finder 走 Apple Event，宿主只读 argv）

**证据（静态）**

- `host-mac/Info.plist:34-49` 声明了 `CFBundleDocumentTypes`：`md`、`markdown`，`CFBundleTypeRole=Editor`，`LSHandlerRank=Alternate`。所以 Finder 的「打开方式」里会出现 Sidelight，双击 `.md`/拖到 Dock 图标也会启动本 App。
- 但 `host-mac/Sources/SidelightMac/*.swift` 里没有 `application(_:openFiles:)`、`application(_:openFile:)`、`application(_:open:)`，也没有 `kAEOpenDocuments` 处理（`Select-String -Pattern 'openFiles|openFile|application\(|kAEOpen|NSAppleEvent'` 零命中）。
- 打开文件只有两个入口：`CommandLine.arguments`（`App.swift:64-67`，只对 `open -a … file` / 命令行启动有效）与 WKWebView 内部拖放（`App.swift:21-28`，只对拖进正文区域有效）。
- Finder 双击/「打开方式」是 LaunchServices 发 Apple Event，argv 里只有可执行文件路径 → `args.first(where:)` 取不到文件 → App 起来显示空文档（或上次内容），**用户点一次什么也没发生**。

**影响**：这是 macOS 用户装完后最自然的第一个动作。现在的结果是「应用出现在打开方式里，但点了不打开」。README 与 Release 说明都没提这个限制。

**建议**：实现 `func application(_ sender: NSApplication, openFiles filenames: [String])` 与 `application(_:open urls:)`，`NSApp.reply(toOpenOrPrint:)` 后复用 `openPath`；`applicationDidFinishLaunching` 里补一次「启动时已带 openFiles」的处理顺序（首启事件可能早于 finishLaunching）。成本 **S**。

## I5（M/S）用户无法确认自己装的是哪个版本，安装包本身也没有版本信息

**证据**

- `(Get-Item release\Sidelight-0.30.3-win-x64-setup.exe).VersionInfo`：`FileVersion`、`ProductVersion`、`ProductName`、`CompanyName`、`FileDescription` **七项全空**（NSIS 脚本没有 `VIProductVersion`/`VIAddVersionKey`）。
- `host\bin\Sidelight.exe`（也就是装完的程序）`FileVersion=0.0.0.0`、`ProductVersion=0.0.0.0`、`ProductName` 空 —— `host/build.ps1:34-49` 用 `csc` 编译，不带 `/win32res` 也没有 `[assembly: AssemblyVersion]`，所以是 .NET 默认 0.0.0.0。
- 前端不显示版本：`src/**/*.tsx` 里的 `version` 都是内部保存版本计数，没有 About/设置页版本行。
- macOS：菜单项「关于 Sidelight」是 `action: nil`（`App.swift:106`），点了没反应（没有 `orderFrontStandardAboutPanel:`）。
- 文档侧：`README.md:66` 与 Release 正文（`scripts/release-notes.mjs:124`）只写「还没有自动更新；升级要手动下载（覆盖安装，数据保留）」。**没有一处说明用户怎么知道有新版本**（Watch → Releases、releases.atom 都没写）；`packaging/README.md` 也没有「升级」章节（macOS 的 `macos-README.txt:11` 反而写了升级步骤）。

**影响**：三个 setup 并排放在 Downloads 里时无法区分（文件名带版本，但改名/截图/转发后就看不出）；装完无法自查，报缺陷时写不出可信版本号。就「自动更新缺失」这个议题，缺的一半不是更新器，而是**版本可见性**：有了它，用户至少能靠 Release 页自查；没有它，连「手动更新」都无从判断。

**建议**：① 给宿主加 `AssemblyVersion`/`FileVersion`（csc `/win32res` 一份 `AssemblyInfo`），给 NSIS 加 `VIProductVersion` + `VIAddVersionKey`（Name/FileDescription/ProductName/CompanyName/FileVersion）；② 构建时注入 `__APP_VERSION__`，在底部状态栏或设置页显示 `vX.Y.Z`；③ macOS「关于」接 `orderFrontStandardAboutPanel:`；④ README 的 Windows 段加「升级：退出应用 → 下载新 setup → 覆盖安装，数据保留」与「怎么知道有新版本：Watch → Releases」。成本 **S**。

## 附带小项（发现但没占编号，都有证据）

1. **组件页能把主 section 取消勾选**：`installer.nsi:35` 引入了 `MUI_PAGE_COMPONENTS`，但主 section `Section "Sidelight"`（`:57`）没有 `SF_RO`，用户可以取消勾选它、只勾「在「打开方式」中加入 Sidelight」→ 安装成功、什么都没装、且只写注册表。成本 S：给主 section 加 `SectionIn RO`。
2. **关联只登记 `.md`，漏了 `.markdown`**：`installer.nsi:133/138` 只写 `.md`；应用本身支持 `.markdown`（`src/lib/workspace.ts:61`、`src/lib/rename.ts:4`、打开对话框 `workspace.ts:177/195`），macOS 清单两个都登记（`Info.plist:34-49` 里的 `CFBundleTypeExtensions`）。勾选关联后 `.markdown` 文件不会出现「打开方式 → Sidelight」。成本 S。
3. **升级不清理旧哈希资源**：实测往 `www\assets\` 放 `index-OLDHASH00.js`，重装后仍在（`sentinel.log` 的 `B stale asset survives=True`）。每版累积几十 KB 到几百 KB，只影响磁盘。成本 S：安装前 `RMDir /r "$INSTDIR\www"`（注意别删到用户目录）。
4. **`EstimatedSize` 偏低 3.3%**：`installer.ps1:44-50` 只算 5 个宿主文件 + `dist`，没算 `uninstall.exe`（55,018 B）、`README.txt`、`LICENSE`、`sidelight.ico`；实测装机 2,542,306 B（2,483 KB），注册值 2,400 KB。无功能影响，只在「应用和功能」里显示偏小。

## 最值得做的 3 件事

1. **I1：覆盖安装/卸载前先处理运行中的实例。** 现在 `/S` 覆盖一个正在运行的应用会返回 0 却把新前端配旧宿主，卸载会留下 4 个文件；加进程检测 + `IfErrors` 后 `Abort` 即可，成本 S，挡的是「升级后应用半坏」这类最难排查的现场。
2. **I4：macOS 接 `openFiles`。** 一行协议方法就能让「双击 `.md`」「打开方式 → Sidelight」真正打开文件；现在是 macOS 用户的第一动作直接失效，而 README 还写着 `.md` 可用。成本 S。
3. **I2：第二次启动给反馈。** Windows 空载荷时恢复并置前窗口，macOS 加单实例并在端口被占时退出。成本 S，消掉「点了没反应 = 坏包」的最常见误判，也顺手修掉 macOS 双窗口抢同一文档源。
