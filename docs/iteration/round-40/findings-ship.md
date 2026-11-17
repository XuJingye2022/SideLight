# 第 40 轮 · finder-ship（安装、体积、启动与开源发布体验，只读）

- 轮前 startSha `504dedd22b1133c7629bc1a437ca24b8a8889322` = 当前 HEAD；开工时 `git status --porcelain` 空。
- 只读产品代码：未改 `src/`、`packaging/`、`host/`、`.github/`、`README.md`。**`release/` 一个字节没动**——本轮不在真仓库根打包装，改成「隔离根打包」：`.tmp\ship-r40\` 下放 `packaging\` 的副本 + `package.json`/`LICENSE` 副本 + `host`/`dist` 的目录联接（junction）+ `.tmp\nsis\nsis-3.11` 联接，脚本里 `$root = Split-Path -Parent $PSScriptRoot` 自然指到隔离根，`release\` 落在 `.tmp` 里。因此不需要像第 39 轮那样备份/还原（`release\Sidelight-0.32.1-*` 的字节与时间戳与本轮开工时相同）。
- 本轮唯一跑 `npm run build` 的角色（无并发）。
- E2E：**把打包产物里的 `www` 用静态服务器原样伺服，在 CDP 9224 上加载生产包**（不是 dev server），走了「首启 → 写正文 → 设置弹窗 → 打公式触发 KaTeX 惰性 chunk」四条路径并留 4 张截图。这是本轮新增的验证面：第 39 轮只用打包产物的回环服务做了逐字节比对，没有让**生产包本身**在浏览器里跑起来。

## 一、实测数据

### 1. 构建与首屏（与第 39 轮逐字节相同）

```
npm run build        EXIT=0   vite v8.3.8  3246 modules transformed  ✓ built in 512ms
node scripts/measure-first-screen.mjs EXIT=0
   902784   282347  /assets/index-CzVTmguW.js
      783      450  /assets/rolldown-runtime-vfrPO-fZ.js
    34692     7224  /assets/index-C9jGUfcb.css
total raw=938259 gzip=290021 headroom=29979 files=3 max=320000
target=310000 gap=19979
PASS
```

290,021 B 与 `README.md:100`、`docs/iteration/STATE.md:55` 记的第 39 轮数字相同（本轮无改动，`files=3`）。距内部预算 310,000 B 余 **19,979 B**，距硬线 320,000 B 余 **29,979 B**，未触发 `<5%` 余量 WARN（29,979 > 16,000）。

`dist`：**97 个文件 / 3,838,750 B**（第 39 轮 97 / 3,837,057，+1,693 B，来自第 39 轮修复提交 37e75ae）。前三大：`index-CzVTmguW.js` 902,784 / `cytoscape.esm-nTrd5EVq.js` 441,717 / `chunk-FPAJGGOC-VJWe5Qp9.js` 361,226。`dist` 里 `.map` 文件 **0 个**，79 个 JS 里含 `5175`/开发端口的 **0 个**。

### 2. 宿主与两套打包（隔离根，`release/` 未动）

```
powershell -File host\build.ps1                EXIT=0
  csc 3 条既有告警：CS4014(Program.cs:1337)、CS0168(:1381)、CS0168(:1478)
  OK host\bin\Sidelight.exe     bin 合计 4,880,513 B（第 39 轮 4,878,820，+1,693）

powershell -File packaging\portable.ps1        EXIT=0
  staging=4,890,778 B   zip=1,622,982 B   sha256=0637AB6FBDE659461912F03FA943E3501C1657384EF291B44734294E244EC012
  threshold=50,000,000 B（占 3.2%）

powershell -File packaging\installer.ps1       EXIT=0
  fileVersion=0.32.1.0   setup=1,301,181 B   estimatedSize=4750 KB
  sha256=D5DBC32F8ED7AC73981BFE21018EB050CE27F4C47F5BE6ACCFDF6D304C2E0428
  target=45000000 gap=-43,698,819   hard=50000000 B（占 2.6%）

powershell -File packaging\installer.ps1 -AssocDryRun  EXIT=0
  assoc-dryrun=1,301,051 B（正式包 1,301,181 B，dry-run 小 130 B，与第 36/39 轮口径一致）
```

| 资产 | 已发布 0.32.1（`release/`） | 第 39 轮实测 | 本轮实测（HEAD 构建） | 本轮增量 |
| :--- | ---: | ---: | ---: | ---: |
| `-win-x64-setup.exe` | 824,595 B | 1,300,711 B | **1,301,181 B** | +470 B |
| `-win-x64-portable.zip` | 910,360 B | 1,622,355 B | **1,622,982 B** | +627 B |

两条硬线（内部 45,000,000 / 硬线 50,000,000 B）都只用到 3% 量级。**已发布 0.32.1 的 824,595 B 与 HEAD 构建的 1,301,181 B 之间是 +57.7%（Mermaid 惰性 chunk 进包），下一次发版资产会跳变**——第 39 轮 S1 已在 `README.md:100`、`packaging/README.md:57` 记下实测值，本轮复核仍准确（只是轮次 +1 后每个数字 +几百 B，属正常）。

staging 对账：宿主五件 1,024,862 + ico 23,724 + README.txt 2,377 + LICENSE 1,065 + `dist` 3,838,750 = **4,890,778 B**，与脚本打印一致；打包 `www` 与 `dist` **97/97 文件全部同名同字节**（`Compare-Object` 0 差异）。

### 3. 生产包在浏览器里真跑起来（本轮新增，4 条路径）

静态服务器 `.tmp/ship-r40-static.mjs`（127.0.0.1:5199，不发 gzip，MIME 与宿主回环一致）伺服的目录就是**便携包里那份 `www`**；CDP 9224 上 `node .tmp/reset.mjs 9224` 之后跑 `.tmp/e2e-r40-ship-prod.mjs`：

| 路径 | 结果 | 截图 |
| :--- | :--- | :--- |
| A 首启 | 空白正文、`<html lang="zh-CN">`、标题 `Sidelight`；1,735 ms 出 `.ProseMirror`（浏览器 + 本机静态服务，**不是**首屏指标）；工具栏 14 个按钮齐全（文件/分析本段/导出/?/保存/设置/批注/插入/H1/H2/B/I/S/`</>`） | `shots/round-40/ship-a-prod-first-launch.png` |
| B 写正文 | `发布包验收文本 40` 上屏，状态栏 `8 字 · 阅读约 1 分钟自动保存排队中` | `shots/round-40/ship-b-prod-typing.png` |
| C 设置弹窗 | 26 条可见文案、6 个输入框；`API Key 未配置：分析会用本地模拟批注`、主题浅/深/跟随、自动保存 2 秒、联网核对默认「不启用」；**无自动更新、无遥测项** | `shots/round-40/ship-c-prod-settings.png` |
| D 打公式 | `$x^2$` + 空格 → `.katex` 出现、`.math-fallback` **0 个**；KaTeX 惰性 chunk 全部 **200**：`katexLoader-CNO5m-uY.js`、`katexLoader-lxMheimU.css`、`KaTeX_Math-Italic-*.woff2`、`KaTeX_Main-Regular-*.woff2` | `shots/round-40/ship-d-prod-katex.png` |

首屏请求记账（生产包）：`/`、`index-CzVTmguW.js`、`rolldown-runtime-*.js`、`index-C9jGUfcb.css`、`MarginRail-*.js`（侧栏按需 chunk）、`/__doc`。**首屏没有 katex / mermaid / cytoscape 任何一条**（`A_lazyLeak=[]`），与「首屏不含 Mermaid、KaTeX 惰性」的公开承诺一致。

- 非 200 只有一条：`404 /__doc` —— 浏览器里没有宿主，这个端点是宿主提供的（`page.route` 在既有脚本里也是这么模拟的），不是缺陷。
- 控制台错误只有这一条 404；`requestfailed` **0**。
- 外部请求：**0 条 http(s)**。列表里唯一的非本站点是 `chrome-extension://aepdhbcjfkpncgbmlllcaloniioihlma/assets/eduser.css`，来自该 CDP profile 里别人的扩展，不是 Sidelight 自己发的。即「启动不联网」在**渲染层**也得到复核（第 39 轮只有 `host.log` 的间接证据）。

### 4. 版本资源与图标

```
setup.exe  VersionInfo: FileVersion=0.32.1.0  ProductVersion=0.32.1
           CompanyName=Sidelight contributors  FileDescription=Sidelight 安装器
Sidelight.exe VersionInfo: FileVersion=0.32.1.0  ProductVersion=0.32.1
```

图标提取（`ExtractAssociatedIcon` → `shots/round-40/ship-icon-*.png`）：宿主 exe 是应用的青色圆点，**setup.exe 是 NSIS 默认安装器图标**（见 S1）。

### 5. `packaging\verify-installer.ps1` 实跑（对隔离根）

```
setup=1,301,181 B  target=45000000 gap=-43698819
PASS 体积在硬线 50,000,000 B 内（setup=1301181 B）
PASS 运行时存在（pv=157.0.4341.46 loader=True）
Set-Content : Access to the path 'C:\Users\WINDOWS\AppData\Local\Sidelight\impl-b-userdata-marker.txt' is denied.
packaging\verify-installer.ps1:77  →  EXIT=1，后面的安装/卸载断言一条没跑
```

即第 39 轮 S2 **在 HEAD 上仍原样存在**（本轮复现）。

## 二、发现（4 条）

### S1 · P2 · `setup.exe` 显示 NSIS 默认图标，和已发布的应用图标不一致（新）

**证据**

- `packaging/installer.nsi` 全文没有 `Icon` / `UninstallIcon` / `MUI_ICON` / `MUI_UNICON`：
  `git grep -nE "Icon|MUI_ICON|UNINSTALLICON|HEADERIMAGE" -- packaging/installer.nsi` 只命中 5 处**注册值**（`:141` `DisplayIcon`、`:157/:162/:169/:174` `DefaultIcon`/`ApplicationIcon`），没有一行设置安装器自身的图标。
- 实测提取对照（本轮新做的证据）：
  - `shots/round-40/ship-icon-Sidelight-0.32.1-win-x64-setup.png` → 蓝色「NSIS」安装器图标（32×32，sha256 前 16 位 `4CCC4E8A51CBAEE5`）
  - `shots/round-40/ship-icon-host-exe.png` → 应用青色圆点（sha256 前 16 位 `49F27FD0DB0691C6`，与 `ship-icon-app-ico.png` **同字节**：`host\build.ps1:44/51` 的 `/win32icon` 确实把 `packaging\sidelight.ico` 嵌进了 exe）
- 生成器本身有图标：`packaging\sidelight.ico` 23,724 B，且已 `File` 进安装包（`installer.nsi:127`）。

**影响**：这是**从网页下载时第一眼看到的那张图**。安装包未签名（`README.md:71`、`README.txt:13-14`），SmartScreen 会先拦一次；拦下来之后用户面对的是「蓝色 NSIS 图标 + 未知发布者」，和侧栏/任务栏里的青色 Sidelight 完全不像，等于主动削弱「这是同一个应用」的判断。安装完成后的开始菜单快捷方式用的是 exe 图标（`$INSTDIR\Sidelight.exe`），所以只有「下载到安装完」这一段断掉。

**改法**（零风险，1 个文件 4 行，`:6` `!include "MUI2.nsh"` 之后、`:42` 页面宏之前）：

```nsis
Icon "..\packaging\sidelight.ico"
UninstallIcon "..\packaging\sidelight.ico"
!define MUI_ICON "..\packaging\sidelight.ico"
!define MUI_UNICON "..\packaging\sidelight.ico"
```

ico 已在包内，新增字节只有资源目录里的图标本体（< 1 KB）；`verify-installer.ps1` 的「FileVersion / 体积」断言不受影响。验收：重打后 `ExtractAssociatedIcon` 出来的 32×32 应与 `ship-icon-host-exe.png` 同字节（而不是现在的 NSIS 蓝图标）。

### S2 · P2 · `verify-installer.ps1:76-77` 在 `%LOCALAPPDATA%\Sidelight` 不可写时整体中止（第 39 轮 S2，未修，本轮复现）

**证据**：第一节 5 的实跑输出——`$ErrorActionPreference = 'Stop'` + `Set-Content` 被拒 → EXIT=1，**只跑到第 2 条 PASS**；静默安装、运行中安装被拒、`--version`、HKCU 7 值、开始菜单、卸载保留用户数据 6 组断言全部没执行。而 `packaging/README.md:46-50` 仍写「HKCU 与开始菜单的写入会被环境吞掉，脚本对这两项输出 UNVERIFIED」，读者会以为能跑完。第 39 轮也已给出改法，**本轮只需要落地**：

- `:76-77` 包进 `try { … } catch { Unverified '用户数据目录不可写，卸载保留断言跳过：…' }`，`$marker` 相关断言（`:196-197`）按跳过处理；
- `packaging/README.md` 的「本沙箱的限制」补第 4 条。

**预期收益**：受限环境里这份安装验收能一路跑到 6 组断言，把「安装 → 卸载 → 保留用户数据」两段的真实验收恢复可用（第 39 轮起这两段一直是 UNVERIFIED）。

### S3 · P2 · 「Windows 需要 WebView2 运行时」在下载面仍然缺失，且宿主错误框还是只给 COM 原文（第 39 轮 S4 未修，本轮补到下载面）

**证据**

- `README.md:9-24`（下载节）Windows 两条只写包名、安装路径、卸载保留数据；`git grep -n "WebView2 运行时" -- README.md` **0 命中**（`WebView2` 只出现在 `:7` 发布目标、`:104/:112` 开发者段、`:131` 构建命令里，都是给维护者看的）。
- 同样的信息**已经写对了三处**：`packaging/README.txt:19-20`（zip 内）、`installer.nsi:117`（安装器 Abort 前弹框）、`README.md:16-24` 里 macOS 的同类说明（xattr、签名状态都写了）。唯一缺的是 Windows 下载面。
- `host/Program.cs:1526`（第 39 轮 S4 原文，本轮复核未变）：
  `fatalInitError = "Sidelight 启动失败：无法创建 WebView2 环境。" + ex.Message + " 日志：" + logPath;`
  没有「需要 Microsoft WebView2 运行时」也没有下载地址。本轮生产包 E2E 也确认：应用自己在浏览器里没有任何启动期环境检查文案（不存在第四处兜底）。

**影响**：Windows 10 没装运行时的用户，按下载页选便携包 → 解压 → 双击 → 只看到「灾难性故障 (0x8000FFFF)」。他手上唯一的线索是那句 COM 原文，而下载页一个字都没提运行时。安装包这条路会 Abort 并给出链接，便携包这条路是死路。

**改法**：`README.md` 下载节 Windows 两条各加半句（「需要 Microsoft WebView2 运行时；Windows 11 自带，没有就从 …/webview2/ 装 Evergreen Bootstrapper」）；`Program.cs:1526` 按第 39 轮 S4 的改法补一句按 HRESULT 分支的提示。两处都是纯文案，零依赖、不影响首屏与包体。

### S4 · P2 · `README.md` 把校验和文件名写死成 `SHA256SUMS-0.32.1.txt`，下次发版会指错文件

**证据**

- `README.md:22` 用的是版本通配：``与 Release 页的 `SHA256SUMS-<版本>.txt` 对照``。
- 但同一份 README 的当前状态段两处写死：`README.md:100`「安装包、便携 zip 与 macOS zip 的字节和 SHA256 **见 Release 页的 `SHA256SUMS-0.32.1.txt`**」、`README.md:112`「安装包与便携 zip 的字节和 SHA256 见 Release 页的 `SHA256SUMS-0.32.1.txt`」。
- 流水线按版本生成文件名：`.github/workflows/release.yml:232` `> "SHA256SUMS-${VERSION}.txt"`（`:239` 再用同名文件 `-c` 校验）。
- 现在恰好对（版本就是 0.32.1），所以不是当下的破链；**下一次 `+0.1.0` 发版后**，最新 Release 页上是 `SHA256SUMS-0.33.0.txt`，README 这两处会指向 0.32.1 那个历史文件——用户照 README 校验就核错了资产。

**改法**：两处改成 `SHA256SUMS-<版本>.txt`（与 `:22` 同口径），或在发版清单里加一条「改 README 两处版本号」（后者仍靠人不漏，前者从根上消除）。

## 三、核查通过、无改进的部分（本轮试过、判断没问题）

- **生产包本身可跑**（第一节 3）：这是第 39 轮没验过的面。首启/写/设置/公式 4 条路径全过，KaTeX 惰性 chunk 与 4 个字体文件都是 200，`.math-fallback` 0，说明「下载的包 = 能用的应用」这条链路在**产物层**成立（窗口层受沙箱限制，见 UNVERIFIED 1）。
- **`dist` → `www` 无损耗**：97/97 同名同字节；`dist` 也没有漏进包的文件（`portable.ps1:41-47` 的复制清单本轮实跑）。
- **打包卫生断言仍生效**：`portable.ps1:50-53` 三条（无 `webview2-data` / 无 `host.log` / 无 `*.ps1`）本轮通过；staging 对账到字节。
- **字体 MIME 两端都覆盖**：宿主 `host/Program.cs:202-205` 有 `.css`/`.js`/`.woff2`/`.svg`；macOS 宿主 `host-mac/Sources/SidelightMac/HTTP.swift:146-150` 有 `js/mjs/css/woff2/woff`。KaTeX 字体与 KaTeX CSS 在两套宿主下都不会因为 MIME 被拒（本轮在静态服务器上用同样的 MIME 实测字体 200）。
- **首屏体积门在 CI 里**：`.github/workflows/ci.yml:39` 跑 `node scripts/measure-first-screen.mjs`，所以预算不是只靠本地自觉。
- **`dist` 没有开发残留**：`.map` 0 个、79 个 JS 里 `5175`/`localhost:5` 0 命中。
- **版本资源一致**：`setup.exe` 与 `Sidelight.exe` 的 FileVersion 都是 `0.32.1.0`，与 `package.json:3` 一致；`installer.ps1:70-86` 的版本门本轮通过（这道门就是防 0.31.1 事故重演的）。
- **便携包确实不写注册表**：`git grep -nE "Registry|HKCU" -- host/Program.cs` 0 命中，`README.txt:4/:44` 的「不写注册表」成立。
- **`README.txt` 三条说明与实现一致**：长路径靠 `host/Sidelight.exe.config:12` 的 `AppContextSwitchOverrides`（删了确实会坏 >260 字符路径，`:25` 的说法准确）；数据目录三级回退与 `README.txt:33-34` 一致；日志位置 `:39` 与 `host.log` 一致。
- **release.yml 与 README 的口径一致**：`:232` 生成 `SHA256SUMS-${VERSION}.txt`、`:275` 上传 `out/SHA256SUMS-*.txt`；macOS zip 根目录 `README.txt` 由 `host-mac/build.sh:142` 从 `packaging/macos-README.txt` 复制，与 `README.md:14` 的说法一致。
- **`release/` 未动**：本轮全部打包产物落在 `.tmp\ship-r40\`；`release\Sidelight-0.32.1-*` 的字节与时间戳（2026/11/16 22:21）与开工时相同。

## 四、UNVERIFIED

1. **打包后应用的窗口层 E2E（解压 → 双击 → 首启 → 写 → 保存 → 重开）**：沙箱不许子进程起 WebView2（第 39 轮三次实测均 `CreateCoreWebView2ControllerAsync` 抛 `0x8000FFFF`），本轮**未重复尝试**以免占用预算；补测：真实桌面双击本轮的 `.tmp\ship-r40\release\` 产物或 `release\Sidelight-0.32.1-win-x64-portable.zip`，按 `packaging\verify-portable.mjs` 的步骤（该脚本写 `shots/round-02`，跑完 `git checkout -- shots/round-02`）。
2. **真实安装 / 开始菜单 / HKCU 卸载项 / SmartScreen 一次点击**：`verify-installer.ps1` 在 `:77` 中止（S2），且角色要求不改注册表，本轮不越界。补测：修完 S2 后在允许写 `%LOCALAPPDATA%\Sidelight` 的环境跑同一脚本。
3. **真实 gzip 传输**：首屏 290,021 B 是 `scripts/measure-first-screen.mjs` 对磁盘产物按 level 9 算的，宿主经回环不发 gzip；口径与第 36 轮起相同。
4. **macOS 资产**：本机 Windows，`release/` 无 macOS zip，只在 `release.yml:189` 的上传路径产出（`:168`/`:183` 是签名与验包）；本轮未调 GitHub API 复验。
5. **安装后「打开方式」是否出现 / 卸载是否残留**：需真人桌面，本轮未验（与第 38/39 轮一致）。

## 五、产物与清理

- 隔离打包根：`.tmp\ship-r40\`（`packaging\` 副本、`package.json`/`LICENSE` 副本、`host`/`dist` junction、`.tmp\nsis\nsis-3.11` junction）；产物 `.tmp\ship-r40\release\Sidelight-0.32.1-win-x64-{setup.exe,portable.zip}`、`.tmp\ship-r40\.tmp\assoc-dryrun-setup.exe`、`.tmp\ship-r40\.tmp\portable\Sidelight\`。
- 日志：`.tmp\ship-r40-build.log`、`.tmp\ship-r40-hostbuild.log`、`.tmp\ship-r40-portable.log`、`.tmp\ship-r40-installer-real.log`、`.tmp\ship-r40-installer-dry.log`、`.tmp\ship-r40-verify.log`、`.tmp\ship-r40-static.log`、`.tmp\ship-r40-prod-e2e.log`、`.tmp\r40-ship-prod.json`。
- 脚本：`.tmp\ship-r40-static.mjs`（静态服务器，绝对根路径传参——相对路径在后台 job 里解析到别处，本轮踩过一次）、`.tmp\e2e-r40-ship-prod.mjs`。
- 截图：`shots/round-40/ship-a-prod-first-launch.png`、`ship-b-prod-typing.png`、`ship-c-prod-settings.png`、`ship-d-prod-katex.png`、`ship-icon-Sidelight-0.32.1-win-x64-setup.png`、`ship-icon-host-exe.png`、`ship-icon-app-ico.png`。
- 收尾 `git status --porcelain`：只有 `?? shots/round-40/`（`docs/iteration/round-40/` 因本文件尚未落盘时为空目录，不显示；`.tmp/` 在 `.gitignore` 里）。未 push、未提交、未改 `release/`。
