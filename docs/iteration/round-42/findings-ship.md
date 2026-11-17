# 第 42 轮 · finder-ship（安装、体积、启动与开源发布体验，只读）

- 轮前 startSha `5b7a1f5733c04b2c8bbf80987bf1119634541bbd` = 当前 HEAD；开工时 `git status --porcelain` 空，收工时只有 `?? shots/round-42/`（本轮截图）。产品代码零改动：未改 `src/`、`packaging/`、`host/`、`.github/`、`README.md`。
- 打包走「隔离根」，**真 `release/` 一个字节没动**：`.tmp\ship-r42\` 放 `packaging\`、`package.json`、`LICENSE` 的副本，`host` / `dist` / `.tmp` 用 junction 指回仓库；脚本里 `$root = Split-Path -Parent $PSScriptRoot` 自然指到隔离根，产物落在 `.tmp\ship-r42\release\`。收工复核真 `release/` 仍是 23 个文件、0.32.1 setup `824,595 B` SHA256 `6C93F58F…`、portable zip `910,360 B` SHA256 `F4210C62…`，与开工前的备份一致。
- 本轮我是唯一跑 `npm run build` 的角色（无并发）。

## 一、实测数据

### 1. 构建与首屏（与第 41 轮逐字节相同）

```
npm run build                          EXIT=0（vite build ✓ built in 499ms）
node scripts/measure-first-screen.mjs  EXIT=0
   905637   283613  /assets/index-BEnc5Cau.js
      783      450  /assets/rolldown-runtime-vfrPO-fZ.js
    34992     7254  /assets/index-X7Vk0IO7.css
total raw=941412 gzip=291317 headroom=28683 files=3 max=320000
target=310000 gap=18683
PASS
```

- 首屏 gzip **291,317 B**，与 `README.md:103`、`docs/iteration/STATE.md:55` 的第 41 轮数字一致；距内部预算 310,000 B 余 **18,683 B**，距硬线 320,000 B 余 **28,683 B**，未触发余量 WARN。
- `dist` **97 个文件 / 3,842,462 B**（第 41 轮 3,840,666 B，+1,796 B），`.map` **0 个**。最大文件 `assets/index-BEnc5Cau.js` 905,637 B；Mermaid 的 66 个图类型 chunk 与 `katexLoader-CNO5m-uY.js`（258,788 B）都在首屏之外。
- `dist/index.html` 外链 **0 条**（只有 `data:image/svg+xml` 内联 favicon 与内联主题脚本），入口只有 3 个本地产物：`index-BEnc5Cau.js`、`rolldown-runtime-vfrPO-fZ.js`、`index-X7Vk0IO7.css`。

### 2. 宿主与两套包（隔离根，真 `release/` 未动）

```
powershell -File host\build.ps1                     EXIT=0
  warning CS4014(Program.cs:1337)、CS0168(:1381)、CS0168(:1478) —— 三条既有告警
  OK host\bin\Sidelight.exe ；bin 合计 4,884,225 B；www/index.html=True
  Sidelight.exe FileVersion=0.32.1.0  ProductVersion=0.32.1

powershell -File .tmp\ship-r42\packaging\portable.ps1  EXIT=0
  staging=4,894,490 B  zip=1,624,465 B  sha256=9750D6F5…  threshold=50,000,000 B

powershell -File .tmp\ship-r42\packaging\installer.ps1 EXIT=0
  fileVersion=0.32.1.0  setup=1,302,508 B  target=45000000 gap=-43,697,492
  hard=50,000,000 B  estimatedSize=4754 KB  sha256=40D2DE9C…
```

| 资产 | 已发布 0.32.1（`release/` 实存） | 第 39 轮实测 | 第 41 轮实测 | **本轮实测** | 比第 41 轮 |
| :--- | ---: | ---: | ---: | ---: | ---: |
| `-win-x64-setup.exe` | 824,595 B（发布页 824,209 B） | 1,300,711 B | 1,301,657 B | **1,302,508 B** | +851 B |
| `-win-x64-portable.zip` | 910,360 B | 1,622,355 B | 1,623,726 B | **1,624,465 B** | +739 B |

- 两条硬线（内部 45,000,000 / 硬线 50,000,000 B）只用到 **2.6% / 3.2%**，远在预算内；增量与 `dist` 的 +1,796 B 同源。
- 便携 zip **105 个条目**（9 个根条目 + `www` 97 个文件）；staging 对账到字节：宿主五件 1,024,862 + `sidelight.ico` 23,724 + `README.txt` 2,377 + `LICENSE` 1,065 + `dist` 3,842,462 = **4,894,490 B**，与脚本打印一致。
- NSIS 3.11 走 `.tmp\nsis` 已缓存，未联网下载；`EstimatedSize=4754 KB` 由宿主五件 + `dist` 换算（不含 ico/README/LICENSE，差 27 KB，可忽略）。

### 3. 本轮打包产物在产品浏览器里真跑起来（6 条路径）

静态服务器 `.tmp\ship-r40-static.mjs`（复用，`127.0.0.1:5199`，不发 gzip，MIME 与宿主回环一致）伺服的**就是本轮打包产物里的 `www`**（`.tmp\portable\Sidelight\www`）；`node .tmp/reset.mjs 9224` 后跑 `.tmp\e2e-r42-ship-prod.mjs`，JSON 在 `.tmp/r42-ship-prod.json`：

| 路径 | 结果 | 截图 |
| :--- | :--- | :--- |
| A 首启 | 正文真空（`""`）、`lang=zh-CN`、标题 `未命名.md — Sidelight`，1,410 ms 出 `.ProseMirror`（浏览器 + 本机静态服务，**不是首屏指标**）；首屏请求 8 条全部本地，**KaTeX/Mermaid 惰性 chunk 0 条**（`A_lazyLeak: []`） | `shots/round-42/ship-a-prod-first-launch.png` |
| B 写正文 | `发布包验收文本 42` 上屏，状态栏 `8 字 · 阅读约 1 分钟 自动保存排队中` | `ship-b-prod-typing.png` |
| C 自动保存 | `sidelight.doc.v1` 草稿 61 B、`hasText=true`（另有一条他人扩展写入的 `trancy-mode`） | `ship-c-prod-autosaved.png` |
| D 刷新重开 | 正文回来（`D_restored=true`），标题仍是 `未命名.md — Sidelight` | `ship-d-prod-reopen.png` |
| E 设置弹窗 | `role=dialog` 1 个、6 个 `input`；文案含「密钥只存在这台机器的本地存储里，不会上传」「自动保存（停笔 2 秒）」；**无「自动更新」、无遥测** | `ship-e-prod-settings.png` |
| F 打公式 | `$x^2$` + 空格 → `.katex` 出现，`katexLoader.js/.css` + 2 个 woff2 **全 200** | `ship-f-prod-katex.png` |

- 非 200 只有一条 `404 /__doc`（该端点由宿主提供，浏览器模式下每次载入必现，属预期）；`requestfailed` 只有 `__doc net::ERR_ABORTED`（刷新时取消）。
- 外网请求：`external` 只有 `null`（那是该 CDP profile 里别人装的扩展 `chrome-extension://aepdhbcjfkp…/eduser.css`），**http(s) 外链 0 条**。启动不联网、无常驻、无自动更新依赖，与 `README.md:74`、`package.json`（依赖只有 tiptap/react/katex/mermaid）一致。
- 全局静态检查：`host/`、`packaging/`、`src/` 里 **0 处** `CurrentVersion\Run` / `StartupApproved` / `schtasks`（无开机自启）。

## 二、发现（5 条）

### S1 · P2 · 安装包字节有三个口径并列，读者分不清哪个是「你下载到的包」（新）

**证据**

- `README.md:103`：「安装包内部预算 **45,000,000 B** / 硬线 **50,000,000 B**…**最新发布资产 824,209 B（本机重建 824,595 B）**；第 36 轮接入 Mermaid 后本机 `installer.ps1 -AssocDryRun` 实测 **1,299,777 B**；第 39 轮真实打包实测 setup **1,300,711 B**、便携 zip **1,622,355 B**」。
- `packaging/README.md:57` 同一段也并列 824,209 / 824,595 / 1,300,711 / 1,622,355 四个数。
- 本轮实测：HEAD 重建 setup **1,302,508 B**、zip **1,624,465 B**；`release/` 里 0.32.1 已发布资产是 824,595 B（zip 910,360 B）。

**影响**：同一句里既有 824 KB 又有 1,302 KB。读者会以为「当前源码打出来约 824 KB」，实际差 **58%**；差的那 478 KB 是 Mermaid 的 66 个惰性 chunk，而这一点只有翻到第 36 轮的 ADR 才看得到。

**改法**：把这段拆成两行口径——「已发布 tag 包」与「当前 HEAD 重建」，并给本轮数字（setup 1,302,508 / zip 1,624,465）。零风险，改 2 个文件的 2 行。

### S2 · P2 · `setup.exe` 仍是 NSIS 默认图标（第 40 轮 S1、第 41 轮 S6，未修，本轮重打包复核）

**证据**

- `packaging/installer.nsi` 全文件 **0 处** `SetupIconFile`（`Select-String -Pattern 'SetupIconFile|Icon '` 0 命中；正向对照：同文件 `:127` 有 `File "..\packaging\sidelight.ico"`，`:141` 用 `sidelight.ico` 做 `DisplayIcon`）。
- 对比：`packaging/portable.ps1:44` 会把 `sidelight.ico` 复制进便携目录。

**影响**：下载页上安装包是 NSIS 默认图标，与开始菜单、卸载项里显示的 `sidelight.ico` 不一致；SmartScreen 提示框里也没有品牌标识。这是用户对「这是不是那个应用」的第一眼判断。

**改法**：`installer.nsi` 头加 `Icon "..\packaging\sidelight.ico"` 与 `SetupIconFile "..\packaging\sidelight.ico"`（1–2 行，重打包即生效）。注意 `sidelight.ico` 是 23,724 B 多尺寸 ico，先确认 NSIS `Icon` 取 16/32 尺寸不报错。

### S3 · P2 · `release/SHA256SUMS.txt` 只有 0.26.0 两条，与 `release/` 里 23 个资产不符，且没有任何脚本生成本地这一份（新）

**证据**

- `release/SHA256SUMS.txt` 全文只有两行：`FE2EF144…  Sidelight-0.26.0-win-x64-setup.exe`、`9C18FC9C…  Sidelight-0.26.0-win-x64-portable.zip`。
- `release/` 现存 **23 个文件**：0.27.0 起每一版的 setup 与 portable zip（到 0.32.1）都在，唯独校验和停在 0.26.0。
- `git grep -n "SHA256SUMS"` 的引用全是 `SHA256SUMS-<版本>.txt`（`release.yml:210-239`、README、CONTRIBUTING、SECURITY）；**没有任何脚本写 `release/SHA256SUMS.txt`**（`release.yml` 只在 CI 的 `out/` 里生成带版本号的文件）。

**影响**：本地按 `release/` 目录核对下载文件的人，会撞上「哈希表里根本没有这个版本」；如果谁顺手 `sha256sum -c release/SHA256SUMS.txt` 还会报两条缺失。发布流程本身不受影响（CI 用的是 `out/SHA256SUMS-<版本>.txt`），所以这是一份纯粹的误导文件。

**改法**：删掉 `release/SHA256SUMS.txt`（不进版本控制，删了无副作用），或在打包脚本末尾生成 `release/SHA256SUMS-<版本>.txt` 覆盖当前版本。

### S4 · P2 · 打包体积没有逐轮台账，回归只能靠翻 CHANGELOG 的零散数字（新）

**证据**

- 本轮 setup **1,302,508 B**、zip **1,624,465 B**，比第 41 轮 +851 / +739，比第 39 轮 +1,797 / +2,110；增量全部来自 `dist`（3,842,462 vs 第 40 轮 3,838,750）。
- 现在能查到的包体积只有三处：`docs/CHANGELOG.md` 里 0.32.0 发布时的 **824,209 B**（第 36/39 轮条目）、`packaging/README.md:57`、`README.md:103`——都是散落在轮次叙述里的数字，没有一条按轮次累计的表。
- `packaging/installer.ps1:112-115`、`portable.ps1:65-68` 只打印当次字节，不写文件。

**影响**：下一个改动体积的人（比如再引一个惰性库）没有基线可对，只能重打包再猜「这算不算大」。第 41 轮 S1 的 README 测试数过期，是同一类问题的另一个表现。

**改法**：`installer.ps1` / `portable.ps1` 结尾各 append 一行到 `docs/iteration/volume-log.md`（版本、轮次、setup/zip 字节、`dist` 字节、SHA256 前 8 位）。只在打包时写，不影响门禁。

### S5 · P2 · 沙箱限制清单里缺一条「宿主 exe 无法程序化启动」，本轮实测被挡在安装验证外面（环境/文档，新）

**证据**

- `Start-Process -FilePath .tmp\…\portable\Sidelight\Sidelight.exe -ArgumentList '--version'` → `Start-Process : Access is denied`（`Win32Exception`）。同一文件的 `VersionInfo` 读得到：`FileVersion 0.32.1.0 / ProductVersion 0.32.1`。
- `Sidelight-0.32.1-win-x64-setup.exe /S /D=<工作区内目录>`（TEMP 已重定向到 `.tmp\nsis-temp`）**挂起 >3 分钟无输出、无 exit**，被 job_kill 终止；未落安装目录。
- `packaging/README.md:46-50` 已写三条沙箱限制（TEMP 不可写、HKCU 不可观测、WebView2 下载写盘受限），**没有这一条**。

**影响**：安装与首次启动这条最关键的发布路径，每轮代理都要重试一遍再放弃；不知道的人会把「Access is denied」当成产物坏了（第 41 轮报告里写着 `--version` 能跑，本轮同一操作直接被拒，环境变了也没记录）。

**改法**：`packaging/README.md` 的「本沙箱」节补第 4 条：宿主 exe 与 setup.exe 都无法由代理进程启动（Win32 `Access is denied` / 静默安装挂起），只能真机验；同时在 `README.md:74` 的「未验」里保留「真人双击安装 + 首次启动」。

## 三、核查通过、判断没有问题的部分

1. **首屏预算**：291,317 B，PASS，与文档数字一致；`files=3`，首屏集合无 `mermaid`/`katex`/`lazy` chunk；`dist/index.html` 外链 0 条；`.map` 0 个。
2. **两套打包脚本可重复跑通**：`host/build.ps1` → `portable.ps1` → `installer.ps1` 全 exit 0；版本断言 `FileVersion=0.32.1.0` 与 `package.json` 一致；NSIS 走本地缓存未联网。
3. **打包卫生**：`portable.ps1:50-53` 的三条断言（无 `webview2-data`、无 `host.log`、无 `*.ps1`）在 staging 上全部为真；`host\bin` 里虽有 `host.log`（15,316 B）、`host.log.bad`、`host.log.migrated`，但两个脚本都按**显式文件名**取件（`portable.ps1:18-24`、`installer.nsi:122-131`），不会带进包；staging 条目数 105 与预期一致。
4. **启动不联网、无常驻**：产品包首屏 8 条请求全本地，外链 0 条；设置弹窗无自动更新/遥测；`host/`+`packaging/`+`src/` 无开机自启项；`package.json` 无更新类依赖。
5. **体积构成健康**：`dist` 3,842,462 B 里首屏只占 941,412 B（24.5%）；大件全是惰性（`cytoscape` 441,717、`katexLoader` 258,788、`chunk-FPAJGGOC` 361,226 等），打包后 setup 就压到 1,302,508 B（压缩比约 3.7:1，LZMA 对重复的 mermaid chunk 压缩率高）。
6. **CI 结构**：`ci.yml:96-100` 同时跑 installer 与 portable，`:39` 跑 `measure-first-screen.mjs`；预算字面量不写死在 CI 里（第 35 轮换挡时清的），脚本自身带硬线。本轮未跑 CI（本机流程已覆盖）。

## 四、UNVERIFIED（为什么没测、怎么补）

| 项 | 原因 | 补测方法 |
| :--- | :--- | :--- |
| 安装（开始菜单、HKCU 卸载项 7 值、默认路径、卸载清理） | setup.exe 静默安装挂起 >3 min，被终止；`verify-installer.ps1` 在 `%LOCALAPPDATA%\Sidelight` 不可写时会整体中止（第 41 轮 S5 未修，本轮未重跑以省时间） | 交互式桌面真机双击安装一次，按 `packaging/README.md` 的 5 步走并看「设置 → 应用」 |
| 宿主首启、写、保存、重开（WebView2 真实二进制） | `Start-Process Sidelight.exe --version` → `Access is denied`，沙箱禁止启动宿主进程 | 真机启动 `%LOCALAPPDATA%\Programs\Sidelight\Sidelight.exe`，走「空白首启 → 写 → Ctrl+S → 关窗重开」 |
| SmartScreen / 签名提示 | 未签名包需要真人双击才看得到提示 | 真机双击，记录是否「更多信息 → 仍要运行」 |
| WKWebView/macOS 包 | 本机 Windows，`host-mac` 无法编译 | 交 CI `macos` job 或 macOS 真机 |
| RDP/下载改名前解压、卸载残留 `FileExts` MRU | 需真人操作 | 真机复验 |

## 五、产物与清理

- 本轮产物全在 `.tmp\ship-r42\`：`release\Sidelight-0.32.1-win-x64-setup.exe`（1,302,508 B）、`release\Sidelight-0.32.1-win-x64-portable.zip`（1,624,465 B）；静态服务日志 `.tmp\ship-r42-static.log`；E2E JSON `.tmp\r42-ship-prod.json`；脚本 `.tmp\e2e-r42-ship-prod.mjs`。
- 真 `release/` **未改**：仍是 23 个文件，0.32.1 两件 SHA256 与开工前备份（`.tmp\r42-release-backup\`）逐字节一致。
- 未 push、未建 Release；`release.yml` 未触发。
- 截图 6 张在 `shots/round-42/ship-*.png`（与同轮其他角色的截图同目录，文件名不冲突）。
