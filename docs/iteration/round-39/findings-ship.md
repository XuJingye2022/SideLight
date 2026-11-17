# 第 39 轮 · finder-ship（安装、体积、启动与开源发布体验，只读）

- 轮前 startSha `59a4f933dfd411039c939b1e70d7bbdcd7ed82f8` = 当前 HEAD；开工时 `git status --porcelain` 空。
- 只读产品代码：未改 `src/`、`packaging/`、`host/`、`.github/`、`README.md`。**`release/` 已还原**：打包脚本会覆盖同名 0.32.1 资产，先备份再跑，收尾按 SHA256 逐字节还原（见第五节）。
- 本轮唯一跑 `npm run build` 的角色（无并发）。
- E2E：打包产物真起了宿主进程（3 次），窗口渲染被沙箱挡住（WebView2 初始化失败，见第三节）；改用「打包产物自己的回环 HTTP 服务」做逐字节验收（8/8 PASS），另在 CDP 9224 上跑 3 条用户路径补界面证据。

## 一、实测数据

### 1. 构建与首屏

```
npm run build        EXIT=0   vite v8.3.8  3245 modules transformed  ✓ built in 470ms
node scripts/measure-first-screen.mjs EXIT=0
   901482   281803  /assets/index-Vy1SBkVu.js
      783      450  /assets/rolldown-runtime-vfrPO-fZ.js
    34404     7177  /assets/index-CMnePKFr.css
total raw=936669 gzip=289430 headroom=30570 files=3 max=320000
target=310000 gap=20570
PASS
```

289,430 B 与 `README.md:100`、`STATE.md` 记的第 38 轮数字逐字节相同（本轮改动为 0）；距内部预算 310,000 余 **20,570 B**，距硬线 320,000 余 **30,570 B**。

`dist`：**97 个文件 / 3,837,057 B**（第 38 轮 97 / 3,834,049，+3,008 B）。最大三块：`index-Vy1SBkVu.js` 901,482 / `cytoscape.esm-nTrd5EVq.js` 441,717 / `chunk-FPAJGGOC-BWH8yLyk.js` 361,226。

宿主：`host\build.ps1` EXIT=0，`bin 合计 4,878,820 B`，csc 3 条告警（CS4014 一处、CS0168 两处，均为既有代码，本轮未增）。

### 2. 真实打包（本轮核心，第 38 轮 5 节 UNVERIFIED 的补测）

```
powershell -File packaging\portable.ps1
staging=4,889,085 B   zip=1,622,355 B   sha256=8C360A561A2BD5ED41DC87D16FDF374CB7913A0796638B8ACA10EF0E413CCD13
threshold=50,000,000 B                                                       EXIT=0

powershell -File packaging\installer.ps1
fileVersion=0.32.1.0
version=0.32.1  setup=1,300,711 B  sha256=52B970DD6EC1A95B0156CF9FD544851CCED2DA6FA970629B119AB6F463422C0F
target=45000000 gap=-43,699,289   hard=50000000 B  estimatedSize=4748 KB        EXIT=0
```

| 资产 | 已发布 0.32.1（`release/` 原值） | 本轮实测（HEAD 构建） | 变化 | 占硬线 |
| :--- | ---: | ---: | ---: | ---: |
| `-win-x64-setup.exe` | 824,595 B（README 记发布值 824,209） | **1,300,711 B** | +476,116 B（+57.7%） | 2.6% |
| `-win-x64-portable.zip` | 910,360 B | **1,622,355 B** | +711,995 B（+78.2%） | 3.2% |

两个资产对 50,000,000 B 硬线都只用到 3% 量级，**体积不是本轮约束**；第 38 轮 S1「便携 zip 吃掉硬线 81%、该补内部预算线」在新线下**失效**（当时硬线是 2,000,000 B），planner 不必再做那一条。

staging 字节可逐项对账：宿主五件 1,024,862 + ico 23,724 + README.txt 2,377 + LICENSE 1,065 + `dist` 3,837,057 = **4,889,085**，与脚本打印一致；zip 105 条目 = 8 个固定文件 + 97 个 `www` 文件。

### 3. 打包后应用的启动实测（3 次，窗口渲染被沙箱挡住）

`Sidelight.exe 笔记.md` 起进程后，`host.log` 逐次相同：

```
doc open file=笔记.md encoding=utf-8 eol=lf size=228
loopback listening port=47821
data dir candidate failed name=WebView2
data dir kind=temp
pipe server started
INIT-FAIL System.Runtime.InteropServices.COMException (0x8000FFFF): 灾难性故障 (E_UNEXPECTED)
   at Microsoft.Web.WebView2.Core.CoreWebView2Environment.<CreateCoreWebView2ControllerAsync>…
   at Microsoft.Web.WebView2.WinForms.WebView2.<InitCoreWebView2Async>…
   at Program.<InitWebView>…
```

- 变量已排除：默认环境、`TEMP`/`TMP` 指到工作区、`LOCALAPPDATA` 也指到工作区，三次都在同一个 COM 调用失败。同机的 WebView2 运行时存在（`verify-installer.ps1` 实测 `pv=157.0.4341.46 loader=True`），DSH 自己的 GUI 也是 WebView2 —— 失败来自本沙箱不许子进程起 WebView2 浏览进程（`AGENTS.md` §3「沙箱禁止启动 Chromium（命名管道被拒）」），不是产品缺陷。
- 失败后进程以 **4294967295（-1）** 退出，日志尾部 `close requested / close-request skipped webview null`。

**因此「解压 → 双击 → 首启 → 写 → 保存 → 重开」的窗口层 E2E 记 UNVERIFIED**（第四节给了补测步骤）。但窗口创建之前的三段管线全部实测通过：argv 解析（`doc open file=… size=228`）、单实例互斥（`primary mutex=Global\Sidelight`）、回环 HTTP 服务（`port=47821`）。

### 4. 用打包产物自己的 HTTP 服务做的逐字节验收（8/8 PASS）

`node .tmp/probe-r39-http.mjs`：

| 断言 | 结果 | 细节 |
| :--- | :--- | :--- |
| 打包目录里回环服务能起来 | PASS | `/index.html` 200 |
| `/index.html` 与 `dist/index.html` 逐字节一致 | PASS | 1,582 B，sha `aaa6d802d4b8ffab` |
| 主 chunk 逐字节一致 | PASS | 901,482 B，`text/javascript; charset=utf-8` |
| `www/` 与 `dist/` 全量逐字节一致 | PASS | 97 / 97 文件，0 不一致，3,837,057 B |
| `dist` 没有漏进便携包的文件 | PASS | dist=97 www=97 |
| `/__doc` 回文件名、不含绝对路径 | PASS | `{"v":1,"ok":true,"fileName":"笔记.md","encoding":"utf-8","bom":false,"eol":"lf","endsWithNewline":true,"lineCount":11,"size":228,…}` |
| favicon 不缺 | PASS | 404（`index.html` 内联 `data:` SVG，符合预期） |
| 目录穿越读不到 `www` 之外 | PASS | `/../Sidelight.exe` → 404，日志 `loopback refused path=/Sidelight.exe reason=extension` |

### 5. 安装验收（`packaging\verify-installer.ps1`）

```
PASS 体积在硬线 50,000,000 B 内（setup=1300711 B）
PASS 运行时存在（pv=157.0.4341.46 loader=True）
Set-Content : Access to the path 'C:\Users\WINDOWS\AppData\Local\Sidelight\impl-b-userdata-marker.txt' is denied.
  packaging\verify-installer.ps1:77  →  脚本整体中止，后面的静默安装/卸载断言一条没跑
```

即：**安装 → 开始菜单 → 卸载项 → SmartScreen** 本轮仍未验收，且不是脚本断言失败，是在第 77 行写 marker 就被沙箱拒绝（见 S2）。

### 6. CDP 9224 上的 3 条用户路径（界面证据）

`.tmp/e2e-r39-ship-ui.mjs`，`node .tmp/reset.mjs 9224` 之后：

| 路径 | 结果 | 截图 |
| :--- | :--- | :--- |
| A 首启 | 空白文档（正文 `""`，状态栏 `0 字 / 0 字`），1,921 ms 出 `.ProseMirror`（dev server 未打包，**不是**产品首屏指标） | `shots/round-39/ship-a-first-launch.png` |
| B 写正文 | `打包验收文本 39` 上屏，状态栏 `7 字 · 阅读约 1 分钟 自动保存排队中` | `shots/round-39/ship-b-typing.png` |
| C 设置弹窗 | 默认无 API Key（`未配置：分析会用本地模拟批注`）、主题浅/深/跟随、自动保存 2 秒、联网核对默认「不启用」；**无自动更新、无遥测项** | `shots/round-39/ship-c-settings.png` |

控制台错误 **0**、失败请求 **0**。

## 二、发现（4 条）

### S1 · P2 · 下次发布的体积数字全部过期：setup +57.7%、portable zip +78.2%，三处文档还是旧值

**证据**（第一节 2）：实测 `setup=1,300,711 B`、`zip=1,622,355 B`。文档现状：

- `README.md:100`：「最新发布资产 824,209 B（本机重建 824,595 B）；第 36 轮接入 Mermaid 后本机 `installer.ps1 -AssocDryRun` 实测 **1,299,777 B**（正式包预估 **1,297,630 B**，未发布）」。真实正式包是 **1,300,711 B**，预估偏差 +3,081 B；便携 zip **一个数字都没有**。
- `packaging/README.md:57`：同样只有「0.32.1 实测 824,209 B（本机重建 824,595 B）」。
- `release/SHA256SUMS.txt` 仍是 0.26.0 两行（第 38 轮已记）。

**影响**：下一次发版时，Release 页的资产会比下载页描述的数字大一半以上（zip 910,360 → 1,622,355 B），用户看不出这是什么造成的；同时 `-AssocDryRun` 预估法在 Mermaid 之后偏差 +3,081 B，继续拿它当正式包字节就是在传播过期数。

**改法**（只改文档，零风险）：`README.md:100` 与 `packaging/README.md:57` 各补一句「第 39 轮实测：setup 1,300,711 B、portable zip 1,622,355 B（含 Mermaid 惰性 chunk，首屏不受影响）」，并把「正式包预估 1,297,630 B」改成实测值或删掉预估。

### S2 · P2 · `verify-installer.ps1:77` 在受限环境里直接抛 `PermissionDenied`，整份安装验收跑不到第一条安装断言

**证据**（第一节 5）：`packaging/verify-installer.ps1:76-77`

```powershell
New-Item -ItemType Directory -Force -Path $userData | Out-Null
Set-Content -Path $marker -Value 'keep-me' -Encoding UTF8
```

`$userData` = `%LOCALAPPDATA%\Sidelight`。脚本头 `$ErrorActionPreference = 'Stop'`，所以一行 `Set-Content` 被拒就整体退出，后面 6 组断言（静默安装、运行中安装被拒、`--version`、HKCU 7 值、开始菜单、卸载保留用户数据）一条都不执行。而 `packaging/README.md:46-50`「本沙箱的三个限制」写的是「HKCU 与开始菜单的写入会被环境吞掉，`verify-installer.ps1` 对这两项输出 `UNVERIFIED`，不判 `FAIL`」——**读者会以为脚本能跑完并给出 UNVERIFIED，实际连第 1 条都到不了**。第 38 轮 S2 记过同类问题（`verify-portable.mjs` 无人调用），这条是同一条链上的第二处。

**改法**（约 6 行）：把 76-77 两行包进 `try { … } catch { UNVERIFIED '用户数据目录不可写，卸载保留断言跳过：…' }`，`$marker` 相关断言按「跳过」处理；`packaging/README.md:46-50` 补第 4 条限制「`%LOCALAPPDATA%\Sidelight` 不可写时脚本在写 marker 处停下」。

### S3 · P2 · 体积护栏第二次放宽（45,000,000 / 50,000,000 B）没进 CHANGELOG，Unreleased 里仍把旧线写成现行线

**证据**：

- `docs/CHANGELOG.md` 全文 **0 命中** `45,000,000` / `50,000,000`（命令：`git grep -n "45000000\|50000000" -- docs/CHANGELOG.md`），而这个文件是下一次发版的说明底稿。
- `docs/CHANGELOG.md:63`（同一个 `## Unreleased` 段里）：「安装包内部 **1,800,000 B** / 硬线 **2,000,000 B**……便携 zip 门槛与安装包共用 2,000,000 B 硬线」；`:76`「内部预算 1,800,000 / 硬线 2,000,000 内」。
- `.tmp/iteration/common.md:36` 也还是「安装包 ≤1,800,000 B（内部）/ 2,000,000 B（硬线）」，**与同文件 `:5`「硬线放宽到 50,000,000 B」直接冲突**。五个 finder 每轮都读这个文件。
- 已同步的：`AGENTS.md` §4/§6、`README.md:100/112/187`、`packaging/README.md:42/57`、`installer.ps1`/`portable.ps1`/`verify-installer.ps1` 全部 45M/50M。

**改法**：CHANGELOG 的 Unreleased 段加一条「体积护栏第二次放宽：安装包内部 45,000,000 / 硬线 50,000,000 B（产品负责人 2026-11-17）；Mermaid 之后实测 setup 1,300,711 B、zip 1,622,355 B」；round-35/36 那两条历史条目保留原文但加「（第 39 轮前口径）」。`common.md:36` 由根代理改成现行线。

### S4 · P2 · WebView2 初始化失败时，错误框不给「去装 WebView2」的出路，只给 COM 原文

**证据**：

- `host/Program.cs:1526`：`fatalInitError = "Sidelight 启动失败：无法创建 WebView2 环境。" + ex.Message + " 日志：" + logPath;`，`ex.Message` 在本轮实测是「灾难性故障 (异常来自 HRESULT:0x8000FFFF (E_UNEXPECTED))」（`host.log` INIT-FAIL 行）。文案里**没有**「需要 Microsoft WebView2 运行时」，也没有下载链接；便携用户唯一能看到这句的地方是错误框本身。
- 对比两条已有正确文案：`installer.nsi` 安装前检测 WebView2，没有就弹提示并**中止安装**（`packaging/README.md:18`）；zip 里的 `README.txt:19-20` 写了运行时与下载地址。即：**只有运行时错误框这一处没给路**，而它恰好是「装了没运行时」的用户第一眼看到的东西。
- 便携包没有安装前检测（`portable.ps1` 只打包），所以这条文案是便携路径的唯一兜底。

**改法**（约 8 行）：catch 里按 HRESULT 分辨——`0x8000FFFF`/`0x80070002` 等「环境创建失败」统一追加一句「本机可能没装 Microsoft WebView2 运行时。装 https://developer.microsoft.com/microsoft-edge/webview2/ 的 Evergreen Bootstrapper 后重开。」；其余仍打原始消息。零依赖、不影响首屏与包体。

## 三、核查通过、无改进的部分

- **体积线与脚本一致**：`installer.ps1:88-92/115/117`、`verify-installer.ps1:47-54`、`portable.ps1:16` 与 `packaging/README.md:42/57` 都是内部 45,000,000 / 硬线 50,000,000，本轮 4 个判定点（portable 门槛、installer target、installer hard、verify-installer target/hard）全部实跑通过，无一处仍是旧线。
- **打包清单干净**：便携 zip 105 条目里 `webview2-data` / `host.log` / `*.ps1` 各 0 个（`portable.ps1:50-53` 的三条卫生断言本轮实跑通过）；8 个固定文件齐全（exe / exe.config / ico / README.txt / LICENSE / 3 个 DLL）。
- **`dist` → `www` 无损耗**：97 个文件逐字节相同（第一节 4），说明「下载的包 = 本机构建」这条链路没有路径问题；`dist` 也没有漏文件。
- **启动不联网、无常驻**（复核第 38 轮结论仍成立）：本轮实测 `host.log` 只有 `loopback listening port=47821` 这一处监听；`/__doc`、`/index.html` 都是回环；设置弹窗里没有自动更新/遥测项（第一节 6 的 C）。
- **`--version` 可用**：`cmd /c "Sidelight.exe --version > out.txt"` → `0.32.1`（8 B）。注意 PowerShell 7 的 `>` 对 GUI 子系统程序拿到 **0 字节**（本轮实测），别据此判「`--version` 坏了」；`verify-installer.ps1:154` 用 `Start-Process -RedirectStandardOutput` 是真文件句柄，可正常工作。
- **`README.txt`（zip 内）覆盖了 Windows 两道坎**：SmartScreen（`:13-14`）与 WebView2（`:19-20`）、数据目录三级回退与窗口标题提示（`:31-35`）、日志位置（`:37-40`）。第 38 轮 S3 说的是**仓库 `README.md` 下载节**缺这两条（`README.md:13` 仍只有包名），那条仍开着，本条不重复计。
- **依赖无可删项**：本轮未新增依赖；`dist` 里最大增量仍来自 Mermaid 家族（第 36 轮已由产品负责人批准，ADR-0017）。

## 四、UNVERIFIED

1. **打包后应用的窗口层 E2E（首启 → 写 → 保存 → 重开）**。原因：沙箱不许子进程起 WebView2，`CreateCoreWebView2ControllerAsync` 抛 `0x8000FFFF`（三次尝试、两种数据目录策略，见第一节 3）。不因此判产品缺陷——启动管线前段（argv 文档读取、单实例、回环服务、`www` 字节）本轮已单独验过。补测：真实桌面双击 `release\Sidelight-0.32.1-win-x64-portable.zip` 解压后的 exe，按 `packaging\verify-portable.mjs` 的步骤（它写 `shots/round-02`，跑完要 `git checkout -- shots/round-02`）。
2. **安装 / 开始菜单 / HKCU 卸载项 / SmartScreen**：`verify-installer.ps1` 在 `:77` 被拒（第一节 5，S2），未进入安装步骤。补测步骤写在 S2。
3. **未签名 SmartScreen 的真人一次点击**、**卸载后 `%LOCALAPPDATA%\Sidelight` 残留**、**`.md`「打开方式」候选**：同属真人桌面项，本轮未验（与第 38 轮一致）。
4. **macOS 资产**：本机 Windows，`release/` 无 macOS zip，只在 `release.yml:127` 产出；本轮未调 GitHub API 复验（第 37 轮验过 4 资产齐全）。
5. **首屏 gzip 是脚本按磁盘产物算的**（`scripts/measure-first-screen.mjs`），不是线上传输实测；宿主经回环 HTTP 不发 gzip，这条口径第 36 轮起就有记录，本轮沿用。

## 五、产物与清理

- `.tmp/round39-build.log`（build 全量输出）、`.tmp/round39-hostbuild.log`、`.tmp/round39-portable.log`、`.tmp/round39-installer.log`、`.tmp/round39-verify-installer.log`、`.tmp/round39-http.log`、`.tmp/round39-ui.log`、`.tmp/round39-probe.log`、`.tmp/round39-probe2.log`。
- 脚本：`.tmp/e2e-r39-portable.mjs`（窗口 E2E，沙箱挡住）、`.tmp/probe-r39-http.mjs`（8/8 PASS）、`.tmp/probe-r39-wv2.mjs`、`.tmp/probe-r39-default-e2e.mjs`、`.tmp/e2e-r39-ship-ui.mjs`。
- 截图：`shots/round-39/ship-a-first-launch.png`、`ship-b-typing.png`、`ship-c-settings.png`。
- **`release/` 已还原**：跑打包前把 0.32.1 两个资产备份到 `.tmp/round39-release-backup/`，收尾复制回去，SHA256 与轮前逐一相同（zip `F4210C620D2DD2D6F0A5EF064234823863383C4518DBAECE5BCA21AAE4CBD5DD`、setup `6C93F58FDAF470D1DA36D35D73E3CFE921324CEB133E757301395020004826B2`）。本轮没有新增/删除 `release/` 文件。
- `git status --porcelain` 收尾：只有 `?? docs/iteration/round-39/`、`?? shots/round-39/`（后者的其它文件来自并行 finder）。未 push、未提交。
