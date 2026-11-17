# 第 43 轮 · finder-ship（安装、体积、启动与开源发布体验，只读）

- 轮前 `startSha` `0f83e1f80f57d93e0860282a0d3b0bc2b7953750` = 当前 HEAD（`git log --oneline -1` 输出 `0f83e1f docs: round-42 看板记录提交哈希`）。开工时工作区干净；收工时 `git status --porcelain` 只有 `?? docs/iteration/round-43/` 与 `?? shots/round-43/`，**产品代码零改动**（未改 `src/`、`packaging/`、`host/`、`.github/`、`README.md`）。
- 本轮我是唯一跑 `npm run build` 的角色（无并发）。
- 真 `release/` **一个字节没动**：打包走隔离根 `.tmp\r43-pack\`（`package.json` / `LICENSE` / `packaging\` / `dist\` / `host\bin\` 五件的副本），脚本里 `$root = Split-Path -Parent $PSScriptRoot` 自然指到隔离根，产物落在 `.tmp\r43-pack\release\`。收工复核真 `release/` 仍是 **23 个文件**，0.32.1 两件与第 42 轮记录逐字节一致：setup `824,595 B` SHA256 `6C93F58F…`、portable zip `910,360 B` SHA256 `F4210C62…`。

## 一、实测数据

### 1. 构建与首屏（与第 42 轮完全一致）

```
npm run build                                  EXIT=0（✓ built in 496ms）
node scripts/measure-first-screen.mjs          EXIT=0
   906940   283994  /assets/index-BCQht6zu.js
      783      450  /assets/rolldown-runtime-vfrPO-fZ.js
    35367     7322  /assets/index-QDpGwYXc.css
total raw=943090 gzip=291766 headroom=28234 files=3 max=320000
target=310000 gap=18234
PASS
```

- 首屏 gzip **291,766 B**：与 `docs/iteration/STATE.md:55` 一致，距内部预算 310,000 B 余 **18,234 B**，距硬线 320,000 B 余 **28,234 B**，未触发余量 WARN。
- `dist` **97 个文件 / 3,844,140 B**，`.map` **0 个**；`dist/index.html` 只引用 3 个本地产物（`index-BCQht6zu.js`、`rolldown-runtime-vfrPO-fZ.js`、`index-QDpGwYXc.css`）。

### 2. 宿主与两套包（隔离根，真 `release/` 未动）

```
powershell -File host\build.ps1                            EXIT=0
  warning CS4014(Program.cs:1337)、CS0168(:1381)、CS0168(:1478) —— 三条既有告警
  OK host\bin\Sidelight.exe；bin 合计 4,885,903 B；www/index.html=True

powershell -File .tmp\r43-pack\packaging\portable.ps1      EXIT=0（2 s）
  staging=4,896,168 B  zip=1,624,878 B  sha256=0FE0F4DB…  threshold=50,000,000 B

powershell -File .tmp\r43-pack\packaging\installer.ps1     EXIT=0（3 s，先补了 .tmp\nsis）
  fileVersion=0.32.1.0  setup=1,302,800 B  sha256=E96A429A…
  target=45000000 gap=-43,697,200  hard=50,000,000 B  estimatedSize=4755 KB
```

| 资产 | 已发布 0.32.1（`release/` 实存） | 第 39 轮 | 第 42 轮 | **本轮实测** | 比第 42 轮 |
| :--- | ---: | ---: | ---: | ---: | ---: |
| `-win-x64-setup.exe` | 824,595 B | 1,300,711 B | 1,302,508 B | **1,302,800 B** | +292 B |
| `-win-x64-portable.zip` | 910,360 B | 1,622,355 B | 1,624,465 B | **1,624,878 B** | +413 B |

- 两条预算只用到 **2.9% / 3.2%**（1,302,800 / 45,000,000；1,624,878 / 50,000,000），增量与 `dist`（3,844,140 B）同源。
- 便携 zip **105 个条目** = 8 个根条目 + `www` 97 个文件；**`www` 与 `dist` 逐条比较 0 差异**（`Compare-Object` 空），不存在漏打的惰性 chunk。
- 根条目精确为 `Sidelight/{LICENSE, README.txt, sidelight.ico, Sidelight.exe, Sidelight.exe.config, Microsoft.Web.WebView2.Core.dll, Microsoft.Web.WebView2.WinForms.dll, WebView2Loader.dll}`——**无 `host.log*`、无 `*.ps1`、无 `webview2-data`**（`portable.ps1:50-53` 三条卫生断言在 staging 上为真）。
- Authenticode：`setup.exe` 与便携 `Sidelight.exe` 都是 **NotSigned**（`Get-AuthenticodeSignature`），与 `packaging/README.txt:13-14`、`packaging/README.md:54` 的「未签名，首次运行会被 SmartScreen 拦一次」一致。

### 3. 发布产物本身跑起来（解压 zip → 真浏览器）

`Expand-Archive` 解压本轮 zip 到 `.tmp\r43-unzip\`（105 个文件 / 4,896,168 B），静态服务器复用 `.tmp\ship-r40-static.mjs`（`127.0.0.1:5199`，伺服的就是解压出的 `www`），CDP **9224** 上跑 `.tmp\e2e-r43-ship.mjs`（JSON：`.tmp\r43-ship-prod.json`；请求明细：`.tmp\r43-static.log`）：

| 路径 | 结果 | 证据 |
| :--- | :--- | :--- |
| 宿主二进制可执行 | `& .tmp\r43-unzip\Sidelight\Sidelight.exe --version` → 打印 `0.32.1`，`exit=0` | 命令输出 |
| A 首次启动（干净存储） | 6 条请求全本地：`/`(1,582)、`index-BCQht6zu.js`(906,940)、`rolldown-runtime`(783)、`index-QDpGwYXc.css`(35,367)、**`MarginRail-Cg8xK19i.js`(6,088)**、`404 /__doc`（浏览器模式预期）；**KaTeX / Mermaid 惰性 chunk 0 条，外链 0 条** | `shots/round-43/ship-a2-clean-first-launch.png`、静态日志末 6 行 |
| B 写正文 | `发布包验收文本 43` 上屏；2.6 s 后 `localStorage['sidelight.doc.v1']` **81 B**、含该文本 | `ship-b-prod-typing.png` |
| C 刷新重开 | 正文回来（`C.text == B.text`），标题仍是 `未命名.md — Sidelight` | `ship-c-prod-reopen.png` |
| D 惰性 KaTeX 从发布包加载 | `$x^2$` + 空格 → `.katex` **2 个**；`katexLoader-CNO5m-uY.js` / `katexLoader-lxMheimU.css` / 2 个 woff2 **全 200** | `ship-d-prod-katex.png` |

- 控制台错误只有两条真信号，都不是产品问题：`404 /__doc`（浏览器模式每次载入必现）与一条**别人装的扩展**`chrome-extension://nmhdhpibnnopknkmonacoephklnflpho` 的报错；`requestfailed` **0 条**。
- 注意（口径纠正）：第一次跑 A 时正文里带着第 42 轮 E2E 留下的草稿（含公式），于是启动就拉了 `katexLoader`。清掉 `127.0.0.1:5199` 的 localStorage 后重测，才得到上表 6 条请求的干净首启。**不要**把那次 `katexLoader` 当成「首屏泄漏」。
- 宿主 **GUI 窗口未启动**：设了 `LOCALAPPDATA` 重定向与 `WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS=--remote-debugging-port=9334` 后运行 `Sidelight.exe`，进程立即退出，`.tmp\r43-appdata` 下只有空 `temp\`、没有 WebView2 数据目录、exe 同级没有 `host.log`，9334 不监听。见 UNVERIFIED 第 1 条。

## 二、发现（3 条新；另 4 条上一轮已报仍未修，见 §3）

### S1 · P2 · `packaging\installer.ps1` 自己下载 NSIS 的路径与本仓库 CI 不一致：裸链、无哈希校验、失败信息不可行动（新）

**证据**

- `packaging\installer.ps1:30-42`：缺 `makensis.exe` 时从 `https://prdownloads.sourceforge.net/nsis/nsis-3.11.zip` 下载（`:35`），**没有任何 SHA256 校验**。
- 同一仓库的 CI 走另一条路：`.github/workflows/ci.yml:79-88` 从本仓库 Release 固定资产 `…/releases/download/v0.26.0/build-tools-nsis-3.11.zip` 取，并用 `NSIS_SHA256`（`ci.yml:25`、`release.yml:28`）校验；`ci.yml:83` 的原注释写着「**SourceForge 直链会返回反爬 HTML**，改用本仓库 Release 固定资产」。
- 本轮实测（隔离根，没把 `.tmp\nsis` 复制进去）：
  ```
  下载 NSIS 3.11 ...
  Invoke-WebRequest : 基础连接已经关闭: 接收时发生错误。
  [exit code: 1]
  ```
  失败后只抛原始 .NET 异常，**没有一句**「怎么离线拿到 NSIS」「要放到哪个路径」。补上 `.tmp\nsis` 后同一脚本 3 s 成功（setup 1,302,800 B）。

**影响**：① CI 与本地用的是两个来源，本地那条来源已被仓库自己判定不可靠；② 本地这条还不校验哈希，供应链上等于信任一次重定向；③ 新机器/新容器上失败的用户只会看到一句 TLS 错误，不知道 `.tmp\nsis\nsis-3.11.zip` 就是他要的东西。

**改法**：`installer.ps1` 改成与 CI 同一 URL + `NSIS_SHA256` 校验；失败时打印 `NSIS_ZIP=<路径>` 用法与「把 nsis-3.11.zip 放到 .tmp\nsis 再重跑」。约 8 行，重打包即验证。

### S2 · P2 · README「下载」节只写了 macOS 的首次打开与校验，Windows 一条安装步骤都没有（新）

**证据**

- `README.md:13` 是 Windows 的全部内容：只写了两个资产文件名与「per-user 安装包 / 免安装」，**没有**安装步骤、没有 SmartScreen 步骤、没有哈希校验命令。
- `README.md:16-24` 九行全给 macOS：首次打开两种点法、`xattr -dr com.apple.quarantine`、`shasum -a 256`（`:22`）。
- Windows 的步骤只存在于两处非 README 的地方：`packaging\README.md:10-18`（开发者向文档）与 zip 里的 `packaging\README.txt:13-14`（只有下了便携包才看得到）。**安装包用户按 README 走完拿不到任何一步操作指引。**

**影响**：Windows 是首发平台，却是唯一没在 README 写「下完点哪里」的平台。未签名包第一次双击必弹 SmartScreen，README 不提，用户第一反应是「这包有问题」。`:22` 的 `shasum` 对 Windows 用户也不可用（要用 `Get-FileHash -Algorithm SHA256` 或 `certutil -hashfile`）。

**改法**：在 `README.md:13` 后加三条 Windows 步骤（① 双击 setup.exe → SmartScreen「更多信息 → 仍要运行」；② 装到 `%LOCALAPPDATA%\Programs\Sidelight`，从开始菜单启动；③ 校验用 `Get-FileHash -Algorithm SHA256 <文件>`），并把 `:22` 的校验拆成 macOS / Windows 两行。纯文档，零体积。

### S3 · P3 · 首屏 gzip 预算漏算「启动即加载」的 `MarginRail-*.js`（新）

**证据**

- `scripts/measure-first-screen.mjs` 只统计 `dist/index.html` 的 3 个静态引用（`files=3`，`total gzip=291766`）。
- 但发布包每次冷启动都会再请求第 4 个 chunk：`.tmp\r43-static.log` 的干净首启 6 条里含 `200 /assets/MarginRail-Cg8xK19i.js bytes=6088`（该 chunk 与 `index.html` 无关，是运行时动态 import 后立刻发起）。
- 实测该 chunk **raw 6,088 B / gzip 2,327 B**（`node -e` + `zlib.gzipSync`）。真实首载 gzip ≈ **294,093 B**（不是 291,766 B）。

**影响**：预算是防回归的尺子，尺子少算 2,327 B（占余量 8%）。现在还没越线（294,093 < 310,000），但一旦别的改动把余量吃掉，尺子仍显示还没到线。第 36–42 轮每轮都按这个口径累加，误差是持续存在的。

**改法**（零字节）：在 `measure-first-screen.mjs` 的说明与 `README.md:105` 的预算段注明「口径 = `index.html` 静态引用」；或把常驻 chunk 一并计入（脚本多扫一次 `dist/assets/MarginRail-*.js`）。两种都只需改脚本或文档。

## 三、上一轮已报、本轮复核仍未修（不重复计数，供 planner 合并）

| 编号 | 内容 | 本轮复核 |
| :--- | :--- | :--- |
| 第 42 轮 S2 | `setup.exe` 仍是 NSIS 默认图标（`installer.nsi` 无 `SetupIconFile`） | 重打包复核：仍是 0 处 `SetupIconFile` |
| 第 42 轮 S3 | `release/SHA256SUMS.txt` 只有 0.26.0 两条，与 `release/` 里 23 个资产不符，无脚本生成本地这份 | `release/` 仍 23 个文件，`SHA256SUMS.txt` 仍 207 B |
| 第 42 轮 S5 | `packaging/README.md` 沙箱限制写了「三个限制」，缺「宿主 exe / setup.exe 无法由代理启动」 | 标题仍是「三个限制」（`packaging/README.md:46`）；本轮 §一.3 又撞到同一堵墙 |
| 第 42 轮 S1 | README / packaging README 并列 824,209 / 1,300,711 / 1,622,355 三个口径 | `README.md:105`、`packaging/README.md:57` 未变；本轮实测 1,302,800 / 1,624,878 |

## 四、核查通过、判断没有问题的部分

1. **首屏预算**：291,766 B PASS，与 STATE/README 一致；`files=3`，首屏集合无 mermaid/katex chunk；`dist/index.html` 外链 0 条；`.map` 0 个。
2. **两条打包链可重复跑通**：`host/build.ps1` → `portable.ps1` → `installer.ps1` 全 `EXIT=0`；`FileVersion=0.32.1.0` 与 `package.json` 一致；版本断言在 `installer.ps1:70-87` 生效。
3. **载荷完整性**：zip 的 `www` 与 `dist` **97 条逐条相同**，8 个根条目精确；staging 4,896,168 B 与脚本打印一致（宿主五件 1,024,862 + ico 23,724 + README.txt 2,377 + LICENSE 1,065 + dist 3,844,140）。
4. **发布产物不自带外网依赖**：干净首启 6 条请求全指向本机静态服务，`external: []`；KaTeX 的 CSS 与 woff2 都在包内（D 路径 200）；`package.json` 无自动更新/遥测类依赖。
5. **体积构成健康**：`dist` 3,844,140 B 里首屏口径 943,090 B（24.5%），大件全是惰性（`cytoscape` 441,708、`chunk-FPAJGGOC` 361,226、`katexLoader` 258,788）；setup LZMA 后压到 1,302,800 B（约 3.7:1）。
6. **本次未变的产品代码**：`git status` 只有报告与截图两类未跟踪目录；真 `release/` SHA256 与第 42 轮记录相同。

## 五、UNVERIFIED（为什么没测、怎么补）

| 项 | 原因 | 补测方法 |
| :--- | :--- | :--- |
| 宿主 GUI 窗口（首启 → 写 → 保存 → 重开，真 WebView2） | `Sidelight.exe` 启动后进程立即退出：没建 `.tmp\r43-appdata` 的 WebView2 数据目录、exe 同级无 `host.log`、CDP 9334 不监听。沙箱内宿主窗口起不来（与第 42 轮 S5 同一限制） | 真机运行 `%LOCALAPPDATA%\Programs\Sidelight\Sidelight.exe`，走「空白首启 → 写 → Ctrl+S → 关窗重开」 |
| 安装一次（开始菜单、HKCU 卸载项 7 值、默认路径、卸载清理） | 角色硬约束「不要改注册表」；`verify-installer.ps1` 会真装真卸并写 HKCU，未跑 | 交互式桌面跑 `packaging\verify-installer.ps1`，或手动双击 setup.exe 后看「设置 → 应用」 |
| SmartScreen / 签名提示的真实文案 | 只有真人双击才看得到（setup 与便携 exe 均 NotSigned） | 真机双击，记录是否「更多信息 → 仍要运行」 |
| Mermaid 在发布包里的运行时加载 | 只做了静态确认（zip 内 97 条 = `dist`，66 个图类型 chunk 都在）；浏览器内没点这条路径（时间预算） | 在发布包页面里输入 ```` ```mermaid ```` 围栏，看 `mermaidLoader` 200 与 `svg` 出图 |
| macOS 包 | 本机 Windows，`host-mac` 不能编译 | 交 CI `macos` job 或 macOS 真机 |

## 六、产物与清理

- 隔离根 `.tmp\r43-pack\`：`release\Sidelight-0.32.1-win-x64-setup.exe`（1,302,800 B）、`release\Sidelight-0.32.1-win-x64-portable.zip`（1,624,878 B）、`.tmp\portable\Sidelight\`（staging）。
- 解压产物 `.tmp\r43-unzip\`（105 文件 / 4,896,168 B）；宿主数据目录尝试 `.tmp\r43-appdata\`（空）。
- 脚本与日志：`.tmp\e2e-r43-ship.mjs`、`.tmp\e2e-r43-ship-clean.mjs`、`.tmp\r43-ship-prod.json`、`.tmp\r43-static.log`、`.tmp\r43-ship-build.log`。
- 截图 5 张在 `shots/round-43/`：`ship-a-prod-first-launch.png`（**被第 42 轮遗留草稿污染，只作对照**）、`ship-a2-clean-first-launch.png`（干净首启）、`ship-b-prod-typing.png`、`ship-c-prod-reopen.png`、`ship-d-prod-katex.png`。
- 未 push、未建 Release、未改 `release/`、未改注册表。
