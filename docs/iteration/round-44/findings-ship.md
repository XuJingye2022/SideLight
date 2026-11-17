# 第 44 轮 · finder-ship（安装、体积、启动与开源发布体验，只读）

- 轮前 `startSha` `d22807f4361a32d06a49f6645d610511f3ce7bb7` = 当前 HEAD，开工时 `git status --porcelain` 为空。
- 本轮我是唯一跑 `npm run build` 的角色（无并发）。
- 真 `release/` **一个字节没动**：打包走隔离根 `.tmp\r44-pack\`（`package.json` / `LICENSE` / `packaging\` / `dist\` / `host\bin\` 的副本 + `.tmp\nsis`），脚本里 `$root = Split-Path -Parent $PSScriptRoot` 自然指到隔离根，产物落在 `.tmp\r44-pack\release\`。收工 `release/` 仍是 23 个文件。
- 产品代码零改动（未改 `src/`、`packaging/`、`host/`、`.github/`、`README.md`）；新增只有 `.tmp/e2e-r44-ship.mjs`、`.tmp/r44-*`、`shots/round-44/ship-*.png` 与本报告。

## 一、实测数据

### 1. 构建与首屏

```
npm run build                                EXIT=0（✓ built in 489ms，无 tsc 报错）
node scripts/measure-first-screen.mjs        EXIT=0
   908066   284274  /assets/index-SCuY3lCD.js
      783      450  /assets/rolldown-runtime-vfrPO-fZ.js
    35367     7322  /assets/index-QDpGwYXc.css
total raw=944216 gzip=292046 headroom=27954 files=3 max=320000
target=310000 gap=17954
gzip 省下 652170 B（69.1%）
PASS
```

- 首屏 gzip **292,046 B**：距内部预算 310,000 B 余 **17,954 B**，距硬线 320,000 B 余 **27,954 B**。与 `README.md:114` 记的 292,046 B 一致。
- `dist` **97 个文件 / 3,845,393 B**，`.map` **0 个**；`dist/index.html` 只用 3 个本地产物（`index-SCuY3lCD.js` / `rolldown-runtime-vfrPO-fZ.js` / `index-QDpGwYXc.css`），favicon 是内联 `data:` URL（首屏不额外发请求）。
- 与第 43 轮比：`dist` +1,253 B，首屏 gzip +280 B（`index-BCQht6zu.js` → `index-SCuY3lCD.js`），与 `README.md:114` 记的「第 43 轮 +280 B」对得上。

### 2. 宿主与两套包（隔离根，真 `release/` 未动）

```
powershell -File host\build.ps1                       EXIT=0
  warning CS4014(Program.cs:1337)、CS0168(:1381)、CS0168(:1478) —— 三条既有告警
  OK host\bin\Sidelight.exe；bin 合计 4,887,156 B；www/index.html=True

powershell -File .tmp\r44-pack\packaging\portable.ps1 EXIT=0
  staging=4,897,421 B  zip=1,625,269 B  sha256=370D4EB4…  threshold=50,000,000 B

powershell -File .tmp\r44-pack\packaging\installer.ps1 EXIT=0
  fileVersion=0.32.1.0  setup=1,303,297 B  sha256=06CF3694…
  target=45000000 gap=-43,696,703  hard=50,000,000 B  estimatedSize=4757 KB
```

| 资产 | 本轮实测 | 第 43 轮 | 已发布 0.32.1（`release/` 实存） |
| :--- | ---: | ---: | ---: |
| `-win-x64-setup.exe` | **1,303,297 B** | 1,302,800 B | 824,595 B |
| `-win-x64-portable.zip` | **1,625,269 B** | 1,624,878 B | 910,360 B |

- 两条预算只用到 **2.9% / 3.3%**（1,303,297 / 45,000,000；1,625,269 / 50,000,000）。
- 便携 zip **105 个条目** = 8 个根条目 + `www` 97 个文件；`www` 与 `dist` **逐条比较 0 差异**（`Compare-Object` 空），解压后 4,897,421 B 与脚本打印的 staging 一致。
- 根条目精确为 `Sidelight/{LICENSE, README.txt, sidelight.ico, Sidelight.exe, Sidelight.exe.config, Microsoft.Web.WebView2.Core.dll, Microsoft.Web.WebView2.WinForms.dll, WebView2Loader.dll}`——无 `host.log*`、无 `*.ps1`、无 `webview2-data`（`portable.ps1:50-53` 三条卫生断言在 staging 上为真）。
- Authenticode：本轮 `setup.exe` **NotSigned**，与 `packaging/README.txt:13-14`「没有代码签名，不是病毒」一致。
- **口径澄清（不是缺陷）**：`release/` 里的 0.32.1 资产比本机重建小一半。列 zip 内容可见它只有 **36 个条目 / www 29 个文件**，**没有任何 Mermaid chunk**（无 `mermaidLoader-*`、无 66 个图类型 chunk）。Mermaid 是第 36 轮才实现的，而 0.32.1 是第 28 轮左右发的（`docs/CHANGELOG.md` 的 `## Unreleased（第 29–43 轮）`），所以差异是「未发版功能累积」，不是丢包。

### 3. 发布产物本身跑起来（解压 zip → 真浏览器，CDP 9224）

`Expand-Archive` 解压本轮 zip 到 `.tmp\r44-unzip\`，静态服务器 `.tmp/ship-r40-static.mjs`（`127.0.0.1:5198`）伺服解压出的 `www`，E2E 脚本 `.tmp/e2e-r44-ship.mjs`（JSON：`.tmp/r44-ship-prod.json`；请求明细：`.tmp/r44-static.log`）：

| 路径 | 结果 | 证据 |
| :--- | :--- | :--- |
| A 首次启动（`reset.mjs 9224` 清过存储） | 标题 `未命名.md — Sidelight`、状态栏 `0 字`、空正文，首屏 518 ms；请求 5 条全本地：`/`(1,582)、`index-SCuY3lCD.js`(908,066)、`rolldown-runtime`(783)、`index-QDpGwYXc.css`(35,367)、`MarginRail-BCXqw2ds.js`(6,088)；**KaTeX / Mermaid 惰性 chunk 0 条，外链 0 条** | `shots/round-44/ship-a-prod-first-launch.png`、`.tmp/r44-static.log` 前 7 行 |
| B 写正文 | `发布包验收文本 44` 上屏；2.6 s 后 `localStorage['sidelight.doc.v1']` **61 B** 且含该文本 | `ship-b-prod-typing.png` |
| C 刷新重开 | 正文回来（`C.text == B.text`），标题仍是 `未命名.md — Sidelight` | `ship-c-prod-reopen.png` |
| D 惰性 KaTeX 从发布包加载 | `$x^2$` + 空格 → `.katex` **1 个**；`katexLoader-CNO5m-uY.js` / `katexLoader-lxMheimU.css` / 2 个 woff2 **全 200** | `ship-d-prod-katex.png` |
| E 查找条 | `Ctrl+F` 打开查找条，占位符「查找」，往返一次 `Esc` 后正常 | `ship-e-prod-find.png` |

- 全程 `requestfailed` **0 条**，`external: []`，非 200 只有浏览器模式必现的 `404 /__doc`（每次载入一条，本轮 2 次载入 → 2 条）。
- 控制台错误里另有 2 条**别人装的扩展**（`chrome-extension://nmhdhpibnnopknkmonacoephklnflpho`）的报错，与发布包无关。
- 首载真实 gzip 口径：292,046（`index.html` 静态引用）+ **2,326 B**（`MarginRail-BCXqw2ds.js`，raw 6,088）≈ **294,372 B**，仍低于内部预算 310,000 B。该口径差第 43 轮已在 `README.md` 写明。

## 二、发现（4 条新）

### S1 · P2 · 安装包升级时不清理旧 `www`：每升一版多留 64 个旧 hash 文件、+2.69 MB（新）

**证据**

- `packaging/installer.nsi:120-131`：`SetOutPath "$INSTDIR"` → 复制 5 个二进制；`SetOutPath "$INSTDIR\www"` → `File /r "..\dist\*"`。**全程没有 `RMDir /r "$INSTDIR\www"` 或 `Delete "$INSTDIR\www\*.*"`**，所以新版 `File /r` 只是「加文件」。
- Vite 产物是内容 hash 文件名，每次重新构建都会改名。实测：把第 43 轮发布包的 `www`（97 文件 / 3,844,140 B）当作已装目录，再把本轮 `dist\*` 覆盖上去（这就是 `File /r` 的语义）：

```
BEFORE files=97  bytes=3,844,140
AFTER  files=161 bytes=6,531,791
DELTA  files=+64 bytes=+2,687,651
CLEAN  files=97  bytes=3,845,393
Overhead vs clean install: +2,686,398 B (+69.9%)
```

- 逐条比较：第 43 轮 `www` 与本轮 `dist` 有 **64 个文件名不同**（如 `index-BCQht6zu.js` → `index-SCuY3lCD.js`、`MarginRail-Cg8xK19i.js` → `MarginRail-BCXqw2ds.js`，以及 62 个 mermaid/图表 chunk）。也就是说**每次升级都会留下约 70% 的旧载荷**。
- 卸载项 `EstimatedSize` 只按本次载荷算（`installer.ps1:44-50`；本轮 4757 KB），升级后磁盘占用比「设置 → 应用」显示的更大。
- 卸载（`installer.nsi:187` 的 `RMDir /r "$INSTDIR"`）会清干净，所以问题只出现在「装过旧版且不卸载直接装新版」这条最常见的升级路径上。

**影响**：装 5 个版本后 `%LOCALAPPDATA%\Programs\Sidelight\www` 会到 3,845,393 + 5 × 2.69 MB ≈ 17 MB；旧 chunk 永远不会被读到，却一直占空间，且 App 显示的大小对不上。

**改法**：`installer.nsi` 在 `SetOutPath "$INSTDIR\www"` 之前加一行 `RMDir /r "$INSTDIR\www"`（`File /r` 会重建目录）。约 1 行，重打包即可验证。

### S2 · P2 · 组件页可以取消勾选主组件：勾了「打开方式」就会装出「有注册表、没有程序、没有卸载器」的状态（新）

**证据**

- `packaging/installer.nsi:43` 用了 `!insertmacro MUI_PAGE_COMPONENTS`（组件选择页），`:94` 的 `Section "Sidelight" SEC_MAIN` **没有 `SectionIn RO`**，所以它在组件页是可取消的。
- 真正写文件、写 HKCU 卸载项、生成 `uninstall.exe` 的语句全在 SEC_MAIN 里：`:122-129`（5 个二进制 + ico + README + LICENSE）、`:130-131`（www）、`:133`（`WriteUninstaller`）、`:137-146`（HKCU 卸载项）。
- 而 `.md` 关联节 `Section /o "在「打开方式」中加入 Sidelight" SEC_ASSOC`（`:151`）是独立可勾选的，`:167-176` 写 10 条 HKCU `Software\Classes` 键，**指向 `$INSTDIR\Sidelight.exe`**。
- 因此「取消 Sidelight、勾上关联」这条组合会：不复制任何 exe、不生成 `uninstall.exe`、不写卸载项，却写入 `Software\Classes\Sidelight.md\shell\open\command = "$INSTDIR\Sidelight.exe" "%1"` 与 `.md\OpenWithProgids`——一个指向不存在程序的「打开方式」项，并且**没有卸载器可以清掉它**（只能手改注册表）。
- 附带：`MUI_FUNCTION_DESCRIPTION_BEGIN` 段只有 `${SEC_ASSOC}` 一条（`:181`），主组件在组件页没有描述文字；全文件也没有 `SetupIconFile` / `MUI_ICON`（第 42 轮 S2 仍未修）。

**影响**：默认勾选下不会触发，但组件页恰好在第一步之后，用户很容易为「只想要打开方式」去取消主组件。结果是不可逆的注册表残留 + 一个点了会报错的「打开方式」项。发布给公开用户前应封掉。

**改法**：SEC_MAIN 加 `SectionIn RO`（1 行）；或把 SEC_ASSOC 的 `WriteRegStr` 改成仅在 `$INSTDIR\Sidelight.exe` 存在时写。同时给 SEC_MAIN 补一条 `MUI_DESCRIPTION_TEXT`。

### S3 · P2 · Release 流水线自带 `NSIS_SHA256` / `WV2_SHA256` 却从不取件校验：冷缓存时退回 `installer.ps1` 的 SourceForge 裸链（新）

**证据**

- `.github/workflows/release.yml:26-28` 定义 `WV2_VERSION` / `WV2_SHA256` / `NSIS_SHA256`，但 `windows-build` job 里只有 `:84-90` 的 `actions/cache`（`.tmp/wv2`、`.tmp/nsis`），**没有任何 fetch + 哈希校验步骤**；随后直接 `:100` 跑 `packaging/installer.ps1`、`:93` 跑 `host/build.ps1`。
- 同一仓库的 `ci.yml` 是另一套：`:68-77` 取 WebView2 SDK 并用 `WV2_SHA256` 校验，`:79-88` 从本仓库 Release 固定资产取 NSIS 并用 `NSIS_SHA256` 校验，`:83` 的注释写着「**SourceForge 直链会返回反爬 HTML**，改用本仓库 Release 固定资产」。
- 缓存未命中时（首次 tag、缓存被逐出、key 变更）`release.yml` 没有任何兜底：`installer.ps1:28-42` 自己从 `https://prdownloads.sourceforge.net/nsis/nsis-3.11.zip` 下载且**不校验哈希**；`host/build.ps1:8,18` 只打印「取法：Invoke-WebRequest …nuget.org…」并停止，不会自动下载。
- 第 43 轮实测过这条 SourceForge 路径：`Invoke-WebRequest : 基础连接已经关闭: 接收时发生错误。`（隔离根、没有 `.tmp\nsis` 时），补上 `.tmp\nsis` 后 3 s 成功。

**影响**：① 真发版（tag `v*`）在冷缓存 runner 上会整条流水线变红，或退回一条仓库自己判定不可靠的下载源；② `release.yml` 里那两个 `*_SHA256` 是死配置，读过的人会以为有校验；③ 发布产物构建工具的来源与 CI 不一致，供应链上等于信任一次重定向。

**改法**：把 `ci.yml:68-88` 那两段（含 `NSIS_SHA256` / `WV2_SHA256` 校验）原样加到 `release.yml` 的 `windows-build`，或把取件逻辑移进 `installer.ps1` / `host/build.ps1` 并在失败时打印「把 zip 放到 .tmp\nsis 再重跑」。约 15 行，无体积影响。

### S4 · P3 · 便携包自带的 `README.txt` 在「不做的事」里写「没有安装器」，而正文两处都在讲 `setup.exe`（新）

**证据**

- `packaging/README.txt:4`：「装到系统的版本（setup.exe）可以在安装时选择把 Sidelight 加入「打开方式」」；`:6`：「装到系统里的版本（setup.exe，同样不需要管理员）见项目主页 README 的「下载」一节」。
- 同文件 `:45`：「- 没有自动更新、**没有安装器**、没有代码签名。」
- 该文件被打进便携 zip 根目录（`portable.ps1:45`），本轮 zip 里是 `Sidelight\README.txt`（2,377 B），解压后用户第一眼看到的就是它。已发布 0.32.1 的 zip 里同一文件是 2,231 B（老版本文案），说明这段文字随版本在改，矛盾是后来引入的。

**影响**：用户读到「没有安装器」会以为 `setup.exe` 不存在或已废弃，与同一页的另外两行直接冲突；对首发平台的第一印象是文档不可靠。

**改法**：`:45` 改成「便携版没有安装器，也**没有自动更新与代码签名**」，或把三项拆成「本便携包不做：写注册表 / 建开机项 / 自动更新」。

## 三、上一轮已报、本轮复核仍未修（不重复计数，供 planner 合并）

| 编号 | 内容 | 本轮复核 |
| :--- | :--- | :--- |
| 第 42 轮 S2 | `setup.exe` / 卸载器仍是 NSIS 默认图标 | `installer.nsi` 里 `SetupIconFile` / `MUI_ICON` **仍 0 处** |
| 第 42 轮 S3 | `release/SHA256SUMS.txt` 只有 0.26.0 两条，与 `release/` 23 个资产不符 | 仍 207 B、两条；本轮重建的 sha256 `06CF3694…` / `370D4EB4…` 只出现在本报告 |
| 第 42 轮 S1 | `README` / `packaging/README.md` 并列 824,209 / 824,595 / 1,300,711 / 1,622,355 四个口径 | `packaging/README.md:57` 未变；本轮实测 1,303,297 / 1,625,269 |
| 第 42 轮 S5 | `packaging/README.md` 沙箱限制写「三个限制」，缺「宿主 exe / setup.exe 无法由代理启动」 | 标题仍是「三个限制」（`packaging/README.md:46`）；本轮 §一.3 仍在浏览器里跑发布包，没跑宿主窗口 |
| 第 43 轮 S1 | `installer.ps1` 自己下载 NSIS 用 SourceForge 裸链、无哈希 | 未修；本轮升级为 **S3**（Release 流水线也依赖这条路径） |
| 第 43 轮 S3 | 首屏口径漏算启动即加载的 `MarginRail-*.js` | `measure-first-screen.mjs` 仍是 `files=3`；但 `README.md:114` 已补「实际首轮 ≥ total + 2,327 B」，**视为已用文档补齐** |

**已修（撤下）**：第 43 轮 S2「README 下载节没有 Windows 安装步骤」——`README.md:17-21` 现在有 WebView2 运行时、SmartScreen「更多信息 → 仍要运行」、默认安装路径、`Get-FileHash -Algorithm SHA256` 与便携包五条，且 `packaging/README.txt` 已更新到 2,377 B。

## 四、核查通过、判断没有问题的部分

1. **首屏预算**：292,046 B PASS；`files=3` 的三件之外，冷启动实际只多 `MarginRail-*.js` 6,088 B（gzip 2,326 B），真实首载 ≈ 294,372 B，仍有 15.6 KB 余量；KaTeX / Mermaid 本轮确认不在首屏请求里。
2. **两条打包链可重复跑通**：`host/build.ps1` → `portable.ps1` → `installer.ps1` 全 `EXIT=0`；`FileVersion=0.32.1.0` 与 `package.json` 一致；版本断言（`installer.ps1:70-87`）在隔离根生效。
3. **载荷完整性**：zip 的 `www` 与 `dist` **97 条逐条相同**，8 个根条目精确，staging 4,897,421 B 与脚本打印一致；staging 卫生断言（无 `webview2-data` / `host.log` / `*.ps1`）为真。
4. **发布产物不自带外网依赖**：干净首启 5 条请求全指向本机静态服务，`external: []`；KaTeX 的 CSS 与 woff2 都在包内（D 路径 200）；`package.json` 无自动更新/遥测类依赖（`dependencies` 只有 Tiptap 系列、KaTeX、Mermaid、React）。
5. **体积构成健康**：`dist` 3,845,393 B 里首屏口径 944,216 B（24.6%），大件全是惰性（`cytoscape` 441,708、`chunk-FPAJGGOC` 361,226、`katexLoader` 258,788）；setup LZMA 后压到 1,303,297 B（约 3.7:1）。
6. **真 `release/` 与产品代码零改动**：`release/` 仍 23 个文件，0.32.1 两件与第 43 轮记录逐字节一致（setup `824,595 B` SHA256 `6C93F58F…B2`、portable zip `910,360 B` SHA256 `F4210C62…DD`）；`git status --porcelain` 收工时只有 `?? docs/iteration/round-44/`、`?? shots/round-44/`（`.tmp/` 已 gitignore）（`shots/round-44/` 里已有的 `r44-ui-*`、`bug-*`、`code-*`、`typora-*` 是别人本轮/历史产物，我只加了 `ship-a…e` 五张）。
7. **试过但判断没有问题的路径**（避免敷衍的 0 条）：① 端口 5198 的静态服务只伺服解压出的 `www`，没有回退到 dev server，首启请求数与字节全对；② 发布包的 favicon 是 `data:` SVG，不会 404；③ `dist` 无 `.map`，不泄露源码；④ 便携 zip 里没有 `host.log*` / `webview2-data`（`portable.ps1:50-53` 三条断言为真）；⑤ `installer.ps1` 的 `EstimatedSize` 与载荷字节一致（4,887,156 + 3,845,393 ≈ 4757 KB）；⑥ `SEC_MAIN`/`SEC_ASSOC` 的 HKCU 写入都在 `Software\Sidelight`、`Software\Classes` 下，没有 HKLM 机器级写入，`SetRegView 32` 残留对 HKCU 无影响（WOW64 只重定向 HKLM）。

## 五、UNVERIFIED（为什么没测、怎么补）

| 项 | 原因 | 补测方法 |
| :--- | :--- | :--- |
| 真装一次（默认路径、HKCU 卸载项 7 值、开始菜单、卸载清理） | 角色硬约束「不要改注册表」；`verify-installer.ps1` 会真装真卸并写 HKCU | 交互式桌面跑 `packaging\verify-installer.ps1`，或手动双击 setup.exe 后看「设置 → 应用」 |
| 组件页取消主组件的 GUI 表现（S2） | 需要真人点安装向导，代理只能用 `/S` 静默装（会写 HKCU） | 真机双击 setup.exe → 组件页取消 Sidelight、勾关联 → 看是否写出无程序的「打开方式」项 |
| 宿主 GUI 窗口（首启 → 写 → 保存 → 重开，真 WebView2） | 沙箱里 `Sidelight.exe` 无法起窗口（第 42/43 轮同一限制）；本轮仍只在静态服务里跑发布包 | 真机运行 `%LOCALAPPDATA%\Programs\Sidelight\Sidelight.exe`，走「空白首启 → 写 → Ctrl+S → 关窗重开」 |
| 升级路径的真实文件系统表现（S1） | 由「旧 www + 新 dist 覆盖」模拟 `File /r` 语义，没在真安装目录里做 | 真机装 0.32.1 → 直接装新版 → 数 `%LOCALAPPDATA%\Programs\Sidelight\www` 文件数 |
| SmartScreen / 签名提示的真实文案 | 只有真人双击才看得到（setup 与便携 exe 均 NotSigned） | 真机双击，记录是否「更多信息 → 仍要运行」 |
| macOS 包 | 本机 Windows，`host-mac` 不能编译 | 交 CI `macos` job 或 macOS 真机 |

## 六、产物与清理

- 隔离根 `.tmp\r44-pack\`：`release\Sidelight-0.32.1-win-x64-setup.exe`（1,303,297 B）、`release\Sidelight-0.32.1-win-x64-portable.zip`（1,625,269 B）、`.tmp\portable\Sidelight\`（staging）。
- 解压产物 `.tmp\r44-unzip\`（105 文件 / 4,897,421 B）；升级模拟 `.tmp\r44-upgrade-sim\`（161 文件 / 6,531,791 B）。
- 脚本与日志：`.tmp\e2e-r44-ship.mjs`、`.tmp\r44-ship-prod.json`、`.tmp\r44-static.log`、`.tmp\ship-r40-static.mjs`（复用）。
- 截图 5 张在 `shots/round-44/`：`ship-a-prod-first-launch.png`、`ship-b-prod-typing.png`、`ship-c-prod-reopen.png`、`ship-d-prod-katex.png`、`ship-e-prod-find.png`。
- 未 push、未建 Release、未改 `release/`、未改注册表。
