# 第 41 轮 · finder-ship（安装、体积、启动与开源发布体验，只读）

- 轮前 startSha `25297acee40d40fec4bcbe770c416f43faaf2d7a` = 当前 HEAD；开工时 `git status --porcelain` 只有 `?? shots/round-41/`（本轮截图），产品代码无改动。
- 只读产品代码：未改 `src/`、`packaging/`、`host/`、`.github/`、`README.md`。**`release/` 一个字节没动**：打包走「隔离根」——`.tmp\ship-r41\` 放 `packaging\`、`package.json`、`LICENSE` 的副本 + `host`/`dist` 的目录联接（junction）+ `.tmp\nsis` 联接，脚本里 `$root = Split-Path -Parent $PSScriptRoot` 自然指到隔离根，`release\` 落在 `.tmp` 里。
- 本轮唯一跑 `npm run build` 的角色（无并发）。
- E2E：把**本轮便携包里的 `www`** 用静态服务器（127.0.0.1:5199）原样伺服，在 CDP 9224 上加载**生产包**，走了首启 → 写 → 自动保存 → 刷新重开 → 设置 → 公式六条路径，留 6 张截图；另把打包后的宿主 `Sidelight.exe --version` 直接跑通。

## 一、实测数据

### 1. 构建与首屏（与第 40 轮逐字节相同）

```
npm run build        EXIT=0  vite v8.3.8  ✓ built in 509ms
node scripts/measure-first-screen.mjs EXIT=0
   904338   283028  /assets/index-BtnKKR-W.js
      783      450  /assets/rolldown-runtime-vfrPO-fZ.js
    34872     7245  /assets/index-CYS8KuHQ.css
total raw=939993 gzip=290723 headroom=29277 files=3 max=320000
target=310000 gap=19277
PASS
```

`dist`：**97 个文件 / 3,840,666 B**（第 40 轮 97 / 3,838,750，+1,916 B，全部来自第 40 轮实现提交 693d9e6；`.map` 0 个）。首屏 290,723 B 与 `README.md:101`、`docs/iteration/STATE.md:55` 的第 40 轮实测值一致，距内部预算 310,000 B 余 **19,277 B**、距硬线 320,000 B 余 **29,277 B**，未触发 `<5%` 余量 WARN。

### 2. 宿主与两套打包（隔离根，`release/` 未动）

```
powershell -File host\build.ps1                EXIT=0
  csc 3 条既有告警：CS4014(Program.cs:1337)、CS0168(:1381)、CS0168(:1478)
  OK host\bin\Sidelight.exe   FileVersion=0.32.1.0  ProductVersion=0.32.1
  bin 合计 4,882,429 B（含 build.ps1 复制的 www；五件载荷 1,041,763 B）

powershell -File .tmp\ship-r41\packaging\portable.ps1   EXIT=0
  staging=4,892,694 B   zip=1,623,726 B   sha256=47615DB2…
  threshold=50,000,000 B

powershell -File .tmp\ship-r41\packaging\installer.ps1  EXIT=0
  fileVersion=0.32.1.0   setup=1,301,657 B
  target=45000000 gap=-43,698,343    hard=50000000 B   estimatedSize=4752 KB
  sha256=DA8B1D79…
```

| 资产 | 已发布 0.32.1（`release/`） | 第 40 轮实测 | 本轮实测（HEAD 构建） | 本轮增量 |
| :--- | ---: | ---: | ---: | ---: |
| `-win-x64-setup.exe` | 824,595 B（发布页 824,209 B） | 1,301,181 B | **1,301,657 B** | +476 B |
| `-win-x64-portable.zip` | 910,360 B | 1,622,982 B | **1,623,726 B** | +744 B |

两条硬线（内部 45,000,000 / 硬线 50,000,000 B）都只用到 **2.6% / 3.2%**。便携 zip **105 个条目**（8 个根条目：`Sidelight.exe`、五件载荷里的四个 DLL/config、`sidelight.ico`、`README.txt`、`LICENSE`；加 `www` 97 个文件）。staging 对账到字节：宿主五件 **1,024,862** + ico 23,724 + README.txt 2,377 + LICENSE 1,065 + `dist` 3,840,666 = **4,892,694 B**，与脚本打印一致。

### 3. 生产包在浏览器里真跑起来（6 条路径）

静态服务器 `.tmp/ship-r40-static.mjs`（复用，127.0.0.1:5199，不发 gzip，MIME 与宿主回环一致）伺服的就是本轮便携包里的 `www`；`node .tmp/reset.mjs 9224` 之后跑 `.tmp/e2e-r41-ship-prod.mjs`（脚本开头自己清一次 5199 源的 localStorage，因为 `reset.mjs` 只清 localhost 的 5173/5175/5176）：

| 路径 | 结果 | 截图 |
| :--- | :--- | :--- |
| A 首启 | 正文**真空**、`<html lang="zh-CN">`、标题 `未命名.md — Sidelight`；1,428 ms 出 `.ProseMirror`（浏览器 + 本机静态服务，**不是**首屏指标）；工具栏 20 个可见按钮；首屏 6 条本站请求，**KaTeX/Mermaid 0 条** | `shots/round-41/ship-a-prod-first-launch.png` |
| B 写正文 | `发布包验收文本 41` 上屏，状态栏 `8 字 · 阅读约 1 分钟 自动保存排队中` | `ship-b-prod-typing.png` |
| C 自动保存 | `sidelight.doc.v1` 草稿 61 B，`hasText=true`；状态栏转 `草稿 11:57` | `ship-c-prod-autosaved.png` |
| D 刷新重开 | 正文回来（`D_restored=true`），标题仍 `未命名.md — Sidelight`，无多余对话框 | `ship-d-prod-reopen.png` |
| E 设置弹窗 | 6 个输入框、26 条可见文案；`hasAutoUpdate=false`、`hasTelemetry=false`；`API Key 未配置：分析会用本地模拟批注`、自动保存 2 秒、联网核对默认不启用 | `ship-e-prod-settings.png` |
| F 打公式 | `$x^2$` + 空格 → `.katex` 出现、`.math-fallback` **0 个**；`katexLoader-CNO5m-uY.js`、`katexLoader-lxMheimU.css`、2 个 woff2 全 **200** | `ship-f-prod-katex.png` |

- 非 200 只有一条：`404 /__doc`（浏览器里没有宿主，该端点由宿主提供；每次载入一条，控制台 3 条同源 404）。`requestfailed` 1 条：`/__doc net::ERR_ABORTED`（刷新时取消），属预期。
- 外部请求：**0 条 http(s)**（请求列表里唯一非本站点是该 CDP profile 里别人的扩展 `chrome-extension://…eduser.css`）。
- **打包后的宿主本体能跑**：`& ".tmp\ship-r41\.tmp\portable\Sidelight\Sidelight.exe" --version` → `0.32.1`，EXIT=0（真二进制、真版本资源）。

## 二、发现（6 条）

### S1 · P2 · `README.md` 目录树里测试文件数停在 23，实际 27，和同一文件另一处自相矛盾（新）

**证据**

- `README.md:158`：「`lib/*.test.ts` **23 个测试文件**挂进 npm test（含 session / prompt / settings / katexLazy / mermaidLazy），与实现同目录」。
- `README.md:120`：「`npm test` # **27 个文件、345 条断言**」——同一文件里两个数字。
- 本轮实测 `npm test`：`EXIT=0`，按 `ℹ tests N` 汇总 **files=27 assertions=345**（`.tmp/ship-r41-npm-test.log`），与 `:120` 和 `STATE.md:55` 一致。

**影响**：这是新贡献者读到的「测试在哪儿、有多少」入口。23 与 27 差 4 个文件（第 39–40 轮新增 `tableCellBreaks`、`tilde`、`blankParagraphs` 等），按 23 去核对会以为漏跑。

**改法**：`:158` 的 `23` → `27`；顺带把括号里的模块举例补到与实际同代（可不逐条列，改成「27 个测试文件与实现同目录」）。零风险、1 行。

### S2 · P2 · `README.md:83` 的 Typora 计数 29/11 过期，`typora-gap.md` 与 `AGENTS.md` 都是 30/11（新）

**证据**

- `README.md:83`：「当前已有 **29 项**，缺 **11 项**」。
- `docs/typora-gap.md:7`：`## 已经有的（30）`；`:42`：`## 缺的（11）`。
- `AGENTS.md` §6：「对 Typora 的差距见差距表，当前 **30 项有、11 项缺**」。
- 第 39 轮 `test.md:70` 已记录该计数为 **30**；第 40 轮没有把 README 那一句同步。

**影响**：公开 README 是差距表的唯一入口。29 会让读者以为有一条已实现的能力没算进去（实际差 1 条），也让「缺 11」这个分母对不上 41 项总数。

**改法**：`:83` 的 `29` → `30`。零风险、1 行。

### S3 · P2 · `README.md:101` 首屏段落的标题数字停在 288,411 B / −21.0%，同一句后文却写 290,723 B（新）

**证据**

- `README.md:101` 开头：「首屏 gzip 从 364,960 B 降到 **288,411 B（−21.0%）**」，随后追加第 30–40 轮增量；同一段句尾：「当前 **290,723 B**（第 40 轮实测）」。
- 本轮实测 290,723 B（第一节 1）。288,411 是**第 37 轮**的值（`STATE.md:60`）。
- 增量链的隐含起点是 284,529 B（第 30 轮）：284,529 + 232 + 291 + 839 + 46 + 119 + 2,200 + 155 + 1,019 + 591 + 702 = **290,723**；若从 288,411 起算则是 294,605，与句尾不符。
- `−21.0%` 只在基数 288,411 时成立（76,549 / 364,960 = 20.97%）；按 290,723 应为 **−20.3%**（74,237 / 364,960 = 20.34%）。

**影响**：同一段里两个「当前值」，下载页/体积讨论的引用会出现 288,411 与 290,723 两种口径；百分比也高报 0.7 个百分点。

**改法**：把句首改成「首屏 gzip 从 364,960 B 降到 **284,529 B（第 30 轮，−22.0%）**」，增量链保持原样、句尾仍写 290,723 B；或直接写「降到 **290,723 B（−20.3%）**」并把增量链的起点标成第 30 轮。二选一，1 行。

### S4 · P2 · 「Windows 需要 WebView2 运行时」仍不在下载页；便携包遇到缺运行时是死路（第 40 轮 S3 未修，本轮复核）

**证据**

- `README.md:9-24`（下载节）Windows 两条只写包名、安装路径、卸载保留数据；`Select-String README.md -Pattern WebView2` 命中的行号是 `7`、`94`、`113`、`132`、`159`、`175`、`216`，**没有一行在 `:9-24`**。
- 同样的信息已写在三处：`packaging/README.txt:19-20`（zip 内「Windows 11 自带；没有的话从 …/webview2/ 装 Evergreen Bootstrapper」）、`packaging/README.md:18`（安装器会弹提示并中止）、`installer.nsi` 的 Abort 前弹框。
- 宿主错误文案仍是 COM 原文：`host/Program.cs:1526`
  `fatalInitError = "Sidelight 启动失败：无法创建 WebView2 环境。" + ex.Message + " 日志：" + logPath;` —— 没有「需要 Microsoft WebView2 运行时」，也没有下载地址。
- 本轮 `installer.nsi` 的运行时检测与 `verify-installer.ps1` 的运行时断言都通过（`运行时存在（pv=157.0.4341.46 loader=True）`），说明**安装包这条路**会拦；**便携 zip 这条路**没有任何前端或宿主提示。

**影响**：Windows 10 上没装运行时的用户按下载页选便携包 → 解压 → 双击 → 只看到「灾难性故障 (0x8000FFFF)」。他手上唯一的线索是那句 COM 原文，而下载页一个字都没提运行时。

**改法**：`README.md` 下载节 Windows 两条各加半句（「需要 Microsoft WebView2 运行时；Windows 11 自带，没有就从 https://developer.microsoft.com/microsoft-edge/webview2/ 装 Evergreen Bootstrapper」）；`Program.cs:1526` 补一句「缺少 Microsoft WebView2 运行时，请从 … 安装」。两处纯文案，不影响首屏与包体。

### S5 · P2 · `verify-installer.ps1:77` 在 `%LOCALAPPDATA%\Sidelight` 不可写时整体中止（第 40 轮 S2，未修，本轮原样复现）

**证据**：本轮实跑（隔离根，EXIT=1）：

```
setup=1,301,657 B  target=45000000 gap=-43698343
PASS 体积在硬线 50,000,000 B 内（setup=1301657 B）
PASS 运行时存在（pv=157.0.4341.46 loader=True）
Set-Content : Access to the path 'C:\Users\WINDOWS\AppData\Local\Sidelight\impl-b-userdata-marker.txt' is denied.
packaging\verify-installer.ps1:77  →  EXIT=1
```

`$ErrorActionPreference = 'Stop'` + `Set-Content` 被拒，**只跑到第 2 条 PASS**；静默安装、运行中安装被拒、`--version`、HKCU 7 值、开始菜单、卸载保留用户数据 6 组断言全部没执行。而 `packaging/README.md:46-50` 只列了三条沙箱限制（TEMP、HKCU、WebView2 下载），没有这一条，读者会以为能跑完；`README.md:136` 仍把它列为构建/验收命令。

**改法**：`verify-installer.ps1:76-77` 包进 `try { … } catch { Unverified '用户数据目录不可写，卸载保留断言跳过：…' }`，`$marker` 相关断言（`:196-197`）按跳过处理；`packaging/README.md` 的「本沙箱的三个限制」改名「四个限制」并补第 4 条。改完这份安装验收能一路跑到 6 组断言，把「安装 → 卸载 → 保留用户数据」两段从 UNVERIFIED 恢复为可用。

### S6 · P2 · `setup.exe` 仍是 NSIS 默认图标，与应用图标不一致（第 40 轮 S1，未修，本轮重打包复核）

**证据**

- 本轮新打的 setup：`ExtractAssociatedIcon` → 32×32，sha256 前 16 位 **`4CCC4E8A51CBAEE5`**（`shots/round-41/ship-icon-setup.png`）。
- 打包后的宿主 exe：32×32，sha256 前 16 位 **`49F27FD0DB0691C6`**（`shots/round-41/ship-icon-host.png`）——两者不同字节。
- `git grep -nE 'MUI_ICON|UninstallIcon|^\s*Icon ' -- packaging/installer.nsi` **0 命中**（exit 1）。
- 图标文件已在包内：`packaging/sidelight.ico` 23,724 B，`installer.nsi` 用 `File` 收进包；便携 zip 根目录也有。

**影响**：下载后第一眼看到的是蓝色 NSIS 图标 + 未签名（`README.md:72` 自己承认 SmartScreen 会拦一次），与侧栏/任务栏的青色 Sidelight 不像同一个应用；开始菜单快捷方式用的却是 exe 图标。

**改法**：`packaging/installer.nsi` 在 `!include "MUI2.nsh"` 之后加 4 行：

```nsis
Icon "..\packaging\sidelight.ico"
UninstallIcon "..\packaging\sidelight.ico"
!define MUI_ICON "..\packaging\sidelight.ico"
!define MUI_UNICON "..\packaging\sidelight.ico"
```

验收：重打后 `ExtractAssociatedIcon` 的 32×32 应与 `ship-icon-host.png` 同字节（而不是现在的 NSIS 蓝图标）；`verify-installer.ps1` 的 FileVersion / 体积断言不受影响。

附（第 7 条，未进上表）：`README.md:101` 与 `:113` 仍写死 `SHA256SUMS-0.32.1.txt`（版本通配写法在 `:22`），下次 `+0.1.0` 发版后这两处会指向历史文件——第 40 轮 S4 未修。

## 三、核查通过、无改进的部分（本轮试过、判断没问题）

- **生产包可跑**：首启真空（`A_blank` 空串）、写、自动保存、刷新重开、设置、公式六条路径全过；草稿 `sidelight.doc.v1` 61 B 且 `D_restored=true`；设置里无自动更新、无遥测项；`.math-fallback` 0。
- **首屏无惰性 chunk 泄漏**：静态服务器记的首屏请求只有 `/`、`index-BtnKKR-W.js`、`rolldown-runtime-*.js`、`index-CYS8KuHQ.css`、`MarginRail-CPibuuqf.js`、`/__doc`；KaTeX 只在打公式后出现（4 条全 200），与「Mermaid 首屏 0 B、KaTeX 惰性」的公开承诺一致。
- **打包卫生与体积断言**：`portable.ps1` 三条（无 `webview2-data` / 无 `host.log` / 无 `*.ps1`）与 50,000,000 B 门槛通过；`installer.ps1` 的 FileVersion 门（期望 `0.32.1.0`，实际一致）与 `target=45000000 gap=-43,698,343` 通过。
- **zip 内容与 `packaging/README.txt` 一致**：根目录 `Sidelight.exe`、五件 DLL/config、`sidelight.ico`、`README.txt`、`LICENSE`，`www` 97 个文件与 `dist` 同名同数。
- **CI 与发版流水线有体积/测试门**：`ci.yml:38-40` 跑 `npm run build` + `measure-first-screen.mjs` + `npm test`；`release.yml:81-82` 也跑 `npm test` 与 measure；`release.yml:110` 对 setup 的 FileVersion 与 `package.json` 不一致直接 `::error::`。
- **版本资源一致**：`host/build.ps1` 产物 `Sidelight.exe` 与 setup 的 FileVersion 都是 `0.32.1.0`，ProductVersion `0.32.1`，与 `package.json:3` 一致；打包宿主 `--version` 实测输出 `0.32.1`。
- **依赖无可减项**：运行时依赖 `package.json:20-36` 三组（Tiptap 3.34、`katex`、`mermaid` 11.12.0 锁死），与 `README.md:105-109` 的说明一致；`playwright-core`/`@types/*` 只在 devDependencies。
- **`release/` 未动**：本轮全部打包产物落在 `.tmp\ship-r41\release\`；`release/Sidelight-0.32.1-*` 的字节与时间戳（2026/11/16 22:21）与开工时相同。
- **`fixtures/markdown/` 7 个样本** 与 `README.md:162` 一致；`docs/adr/0001–0017` 与 `README.md:163` 一致。

## 四、UNVERIFIED

1. **真实窗口层启动（解压 → 双击 → 首启 → 写 → 保存 → 重开）**：沙箱不允许起 GUI 子进程，本轮 `Start-Process` 打包后的 `Sidelight.exe` 直接 `Access is denied`；第 39 轮三次实测 WebView2 初始化抛 `0x8000FFFF`。本轮能做的替代证据是「打包产物 `www` 在真实浏览器里跑通 6 条路径」+「打包宿主 `--version` exit 0」。补测：真实桌面双击 `.tmp\ship-r41\release\Sidelight-0.32.1-win-x64-portable.zip` 解压件，或跑 `packaging\verify-portable.mjs`（会写 `shots/round-02`，跑完 `git checkout -- shots/round-02`）。
2. **真实安装 / 开始菜单 / HKCU 卸载项 / SmartScreen 一次点击**：角色要求不改注册表，且 `verify-installer.ps1:77` 在写 `%LOCALAPPDATA%\Sidelight` 处中止（S5）。补测：修完 S5 后在可写该目录的环境跑同一脚本；交互式桌面点一次安装包看 SmartScreen 与图标（S6 的验收也在这里）。
3. **真实 gzip 传输**：首屏 290,723 B 是 `scripts/measure-first-screen.mjs` 对磁盘产物按 level 9 算的；宿主经回环不发 gzip。口径与第 36 轮起相同。
4. **macOS 资产**：本机 Windows，未构建、未验签；以 CI `macos-host` job 为准。
5. **安装后「打开方式」是否出现 / 卸载是否残留**：需真人桌面，本轮未验。

## 五、产物与清理

- 隔离打包根：`.tmp\ship-r41\`（`packaging\` 副本、`package.json`/`LICENSE` 副本、`host`/`dist` junction、`.tmp\nsis` junction）；产物 `.tmp\ship-r41\release\Sidelight-0.32.1-win-x64-{setup.exe,portable.zip}`。
- 日志：`.tmp\ship-r41-hostbuild.log`、`-portable.log`、`-installer.log`、`-verify.log`、`-prod-e2e.log`、`-npm-test.log`、`-static.log`、`-ver.out/.err`、`.tmp\r41-ship-prod.json`。
- 脚本：复用 `.tmp\ship-r40-static.mjs`；新增 `.tmp\e2e-r41-ship-prod.mjs`（开头先清 5199 源 localStorage）。
- 截图：`shots/round-41/ship-{a-prod-first-launch,b-prod-typing,c-prod-autosaved,d-prod-reopen,e-prod-settings,f-prod-katex,icon-setup,icon-host}.png`。
- 收尾 `git status --porcelain`：只有 `?? shots/round-41/`（`docs/iteration/round-41/` 在本文件落盘前为空目录不显示；`.tmp/` 在 `.gitignore` 里）。未 push、未提交、未改 `release/`。
