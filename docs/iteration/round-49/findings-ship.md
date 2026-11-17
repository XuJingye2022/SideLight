# round-49 · finder-ship：安装、体积、启动与开源发布体验

- 角色：finder-ship（只读产品代码，未改任何产品文件）
- 轮前 startSha：`57e2a81748090e63b88b1ad4f998ca3b689e347f`；本轮 HEAD 未变（`git status --porcelain` 收尾只有 `?? shots/round-49/`）
- 环境：Windows 11 / Node 24.21 / dev server `http://localhost:5175` 未动 / CDP 9224（Playwright `connectOverCDP`）
- 结论：**5 条**（2 条 P2、3 条 P3，无 P0/P1）。打包链、安装包、便携 zip、打包后前端都能跑通，体积远在预算内。问题集中在**上轮两条 P2 未修**（exe 元数据、release 目录校验和）、**发布文档范围过期**与**安装包体积自报少算**。

## 一、本轮实测数字（全会话唯一一次构建）

| 项 | 实测 | 门槛 | 结论 |
| --- | --- | --- | --- |
| `npm run build` | tsc 0 错；vite 520 ms，`index-Bx-dU1eB.js` | — | PASS |
| 主 chunk | 913,110 B raw / 286,198 B gzip（`measure-first-screen` 口径） | — | — |
| 首屏 | `total raw=950357 gzip=294123 headroom=25877 files=3 max=320000` | 内部 310,000 / 硬线 320,000 | **PASS**，距硬线余 25,877 B、距内部预算余 15,877 B |
| `dist/` 全量 | **97 文件 3,851,898 B**（第 48 轮 3,851,094 B，+804 B） | — | 惰性 chunk 齐全：`mermaidLoader-AjQJKMhO.js` 77.79 kB（gzip 27.51 kB）、`katexLoader-CNO5m-uY.js` 258.78 kB（gzip 77.66 kB） |
| `host/build.ps1` | bin 合计 **4,893,661 B**，`www/index.html=True`；**3 条 C# 警告** | — | PASS（警告见 F5） |
| `packaging/portable.ps1` | staging 4,903,947 B → zip **1,627,385 B**，sha256 `EFF0FEBE…`，`payload fileVersion=0.32.1.0` | 硬线 50,000,000 | PASS（余 48.4 MB） |
| `packaging/installer.ps1 -AssocDryRun` | **1,306,377 B**，`fileVersion=0.32.1.0`，输出到 `.tmp` | 内部 45,000,000 | PASS |
| `packaging/installer.ps1`（正式，含真关联节） | **1,306,376 B**，sha256 `EE0D26E1…`，`estimatedSize=4763 KB` | 内部 45,000,000 / 硬线 50,000,000 | PASS（余 43.7 MB） |
| 便携 zip 里的 `www` vs `dist` | **97/97 文件 SHA256 逐个相等** | — | PASS（zip 装的是当次构建，不是陈旧 dist） |

`release/` 的处理：`portable.ps1` 与 `installer.ps1` 会写 `release/`，开工前把 `Sidelight-0.32.1-*.zip|exe` 备份到 `.tmp/ship-r49-relbak/`，跑完立刻还原并复核。收尾三个文件 SHA256 与开工前**逐字节相同**：

```
SHA256SUMS.txt                        207     2F32C26A8F165E9A8E9B4A52D51750B901F0BD536ECD376A71103EAC86CC9651
Sidelight-0.32.1-win-x64-portable.zip 910360  F4210C620D2DD2D6F0A5EF064234823863383C4518DBAECE5BCA21AAE4CBD5DD
Sidelight-0.32.1-win-x64-setup.exe    824595  6C93F58FDAF470D1DA36D35D73E3CFE921324CEB133E757301395020004826B2
```

## 二、发现（5 条）

### F1（P2）出厂的 `Sidelight.exe` 仍然没有文件描述、产品名、公司、版权（上轮 F2 未修）

- 证据：`[System.Diagnostics.FileVersionInfo]::GetVersionInfo('host/bin/Sidelight.exe')` 本轮实测
  `FileDescription=[ ]`（一个空格）、`ProductName=[]`、`CompanyName=[]`、`LegalCopyright=[ ]`、`Comments=[]`、`Trademark=[]`；只有 `FileVersion=0.32.1.0`、`ProductVersion=0.32.1`、`OriginalFilename=Sidelight.exe`。
- 原因：`host/build.ps1:34-41` 的 `$verLines` 只生成 `AssemblyVersion` / `AssemblyFileVersion` / `AssemblyInformationalVersion` 三条，没有 `AssemblyTitle` / `AssemblyProduct` / `AssemblyDescription` / `AssemblyCompany` / `AssemblyCopyright`。
- 对照：同一个安装包里的 setup 有全套 —— `packaging/installer.nsi:40-46` 六条 `VIAddVersionKey`（ProductName / ProductVersion / FileVersion / CompanyName / FileDescription / LegalCopyright）。
- 影响：Windows「属性 → 详细信息」四栏空白；任务管理器与「打开方式」列表只显示文件名；公开分发的 exe 看起来不如自己的安装器正规。代价 <1 KB 版本资源。
- 建议：`$verLines` 补 5 行（Title/Product/Description/Company/Copyright），重编后在 `packaging/installer.ps1` 版本门旁加一条断言 `FileVersionInfo.FileDescription -ne ''`。

### F2（P2）`release/` 里的当版 setup 不是已发布的那一个，且同目录的 `SHA256SUMS.txt` 是 0.26.0 的旧文件（上轮 F6 未修，本轮补一条新证据）

- 证据：`release/Sidelight-0.32.1-win-x64-setup.exe` = **824,595 B**，sha256 `6C93F58F…`；`docs/iteration/STATE.md:72` 记已发布 v0.32.1 的 setup 是 **824,209 B**（差 386 B）。zip 一致（910,360 B）。
- 本轮新证据：`release/SHA256SUMS.txt`（207 B）**只有 0.26.0 两行**（`FE2EF144… Sidelight-0.26.0-win-x64-setup.exe`、`9C18FC9C… Sidelight-0.26.0-win-x64-portable.zip`），不是当版校验和。
- 影响：`packaging/README.md:58` 要求「以 Release 页的 `SHA256SUMS-<版本>.txt` 为准」，`release/` 里留着一个同名前缀、内容是 0.26.0 的 `SHA256SUMS.txt`，发版时很容易被当作当版校验和上传或对照，校验必然对不上。
- 建议：打当版包前先删旧产物（或按 `-Version` 清 `release/Sidelight-<版本>-*`）；把 `SHA256SUMS.txt` 改成 `SHA256SUMS-<版本>.txt` 并在 `packaging/README.md` 写清它归发版流程管；`verify-installer.ps1` 在存在 `SHA256SUMS-<版本>.txt` 时校验当版 setup 的 SHA256。

### F3（P3）`docs/CHANGELOG.md` 的 Unreleased 标题范围过期（写 29–44，实含 45–48）

- 证据：`docs/CHANGELOG.md:5`「`## Unreleased（第 29–44 轮，未发版）`」；同一节正文里 `:171`「**第 45 轮（同一未发版区间）**」、`:182`「第 46 轮」、`:191`「第 47 轮」、`:201`「第 48 轮」。`docs/iteration/STATE.md:55` 写的是「第 30–48 轮改动都在同一个未发版区间」——两处范围不一致。
- 影响：`scripts/release-notes.mjs:20-21` 直接读 `docs/CHANGELOG.md` 生成 Release notes；下一版把这一节改成 `## 0.33.0 — …` 时，标题里的「第 29–44 轮」会作为公开文字留下，与正文不符。开源读者按标题判断这一节覆盖哪些轮次也会被误导。
- 建议：标题改成与实际一致的区间（与 STATE.md 统一成 `第 30–48 轮`，或按发版切分写 `第 29–48 轮`）。

### F4（P3）安装包的 `EstimatedSize` 少算约 90 KB

- 证据：`packaging/installer.ps1:54-59` 只累加 `host/bin` 五件 + `dist`：本轮 = 1,024,862 + 3,851,898 = **4,876,760 B** → `estKb=4763`，写入 `HKCU\…\Uninstall\Sidelight\EstimatedSize`（`packaging/installer.nsi:153`）。安装器实际还落盘 `sidelight.ico` 23,724 + `README.txt` 2,398 + `LICENSE` 1,065 = **27,187 B**（`portable.ps1` 的 staging 4,903,947 B 与 payload 之差正好是这三个文件），再加 `uninstall.exe`（第 48 轮实测 **65,523 B**）。
- 影响：未压缩落盘 ≈ **4,969,470 B = 4853 KB**，「设置 → 应用」显示 4.76 MB，磁盘实际 ≈4.86 MB。1.8% 的低报不影响可用性，但这是对外可见的体积数字。
- 建议：把 ico / README.txt / LICENSE 加进 `$bytes`，再预留 `uninstall.exe` 的实测字节（或装一次后写实际值）；代价 0 字节。本轮没重新装一次核对 `uninstall.exe` 字节（见 §五.2），所以 65,523 B 沿用第 48 轮实测。

### F5（P3）每次打包仍打印 3 条宿主编译警告（上轮 F5 未修）

- 证据（本轮 `host/build.ps1` 输出）：
  `host\Program.cs(1337,13): warning CS4014`（未等待的异步调用）、
  `host\Program.cs(1381,26): warning CS0168`（`ex` 声明未使用）、
  `host\Program.cs(1478,30): warning CS0168`（同上）。
- 影响：打包日志噪声；CS4014 那处是未 await 的异步调用，异常会变成未观测的异步异常（当前有 `INIT-FAIL` 日志兜底）。与 `AGENTS.md` §8 记的「隐藏诊断信息」相反。
- 建议：CS4014 补 `_ = ` 或注释说明；两个 `ex` 改成具名 `catch (Exception ignored)`。只动 `host/Program.cs`，不影响前端字节。

## 三、端到端走过的路径

### 1. 打包后的前端产物真能跑，且**惰性 chunk 在打包产物里首次验证通过**（补第 48 轮 UNVERIFIED#5）

做法：`.tmp/portable/Sidelight/www`（97 文件，与 `dist` 逐字节相同）由 `.tmp/ship-r48-server.mjs` 在 5289 端口原样送出，Playwright 连 CDP 9224 打开 `http://127.0.0.1:5289/index.html`。脚本 `.tmp/e2e-r49-ship.mjs`，原始结果 `.tmp/ship-r49-e2e.json`。

| 用户路径 | 断言（实测） | 截图 |
| --- | --- | --- |
| ① 首次启动 | `title="未命名.md — Sidelight"`、`docName=未命名.md`、正文空、`data-theme=system`、状态栏 `0 字` | `shots/round-49/ship-packaged-1-firstlaunch.png` |
| ② 源码模式写入整篇 → 回编辑 | 源码框 97 字符（`# 打包产物验证 …
` + mermaid 围栏 + 公式 + 行内代码）；回编辑后 `h1=1`、`codeBlocks=1`、**`mermaidSvg=1`**、**`katexNodes=1`**、`inlineCode=2` | `ship-packaged-2-source.png`、`ship-packaged-3-mermaid.png` |
| ③ 字数明细面板 | 中日韩字 27 / 拉丁词 5 / 合计 32 / 字符 54 / 句 3 / 段 3 / 阅读 1 分钟；`Esc` 关面板后焦点回 `.stats-trigger` | `ship-packaged-4-stats.png` |
| ④ 深色主题 | `data-theme=dark` 下 Mermaid 图仍在（`mermaidSvg=1`），0 错误 | `ship-packaged-5-dark.png` |
| ⑤ 请求审计 | 惰性请求 26 个，含 `mermaidLoader-AjQJKMhO.js`、`katexLoader-CNO5m-uY.js`（+CSS）、`flowDiagram-…`、`dagre-…`；**0 个 404**（唯一 404 是 `GET /__doc`，浏览器态无宿主，`STATE.md:151` 记过 CI 也忽略它）；`pageErrors=[]`；**0 条外部网络请求**（唯一非本机请求是残留浏览器扩展的 `eduser.css`） | — |

首屏 asset 头三个是 `index-Bx-dU1eB.js` / `rolldown-runtime-…js` / `index-etNTpf6I.css`，**不含 mermaid/katex**，与「首屏不含、首次见图才下载」的对外承诺一致。截图 3 里代码块原文仍在、图在下面，公式渲染成 $E=mc^2$、行内代码 `--dry-run` 不被智能标点改写——与第 47 轮结论一致。

### 2. 打包/安装链走通的部分

- `host/build.ps1` → `portable.ps1` → `installer.ps1 -AssocDryRun` → `installer.ps1` 四条全部 exit 0，两条版本门都打印 `payload fileVersion=0.32.1.0`。
- 正式 setup 不能走 `release/` 覆盖路径判定（脚本会覆盖 `release/`，已备份还原，见 §一）。
- 安装/卸载的「装一次、看开始菜单与 HKCU」本轮**没跑通**，见 §五.2。

## 四、我试过但判断没问题的项（避免下一个人重查）

- **上轮 F1 已修**：`README.md:114` 现在是 `294,123 B（−19.4%）` 与余量 25,877 / 15,877，与本轮 `measure-first-screen` 完全一致；`:116` 的主 chunk 已改为「第 48 轮 913,110 B raw（`index-Bx-dU1eB.js`）」。`−19.4%` 按 (364,960−294,123)/364,960 = 19.41% 计算正确。
- **上轮 F3/F4 已修**：`.tmp/iteration/common.md:36` 已是 `45,000,000 B（内部）/ 50,000,000 B（硬线）`；`STATE.md:27` 与 `:55` 都是 **32 文件 414 条**（`package.json` 的 `test` 脚本实测 32 个 `.test.ts`）。
- **依赖没有新增**：`package.json` 运行时依赖 15 个（Tiptap 3.34 一组 + `katex ^0.18.10` + `mermaid 11.12.0` 精确锁 + React 19.3.1），与 `README.md:118-124` 的「三组」一致。
- **CI / 发版静态口径正确**：`.nvmrc`=24 与 `node-version-file` 一致；`ci.yml:39` 有首屏门；`release.yml:58` 的 `^## ${PKG_VERSION} — ` 能在 `docs/CHANGELOG.md:209`（`## 0.32.1 — 2026-11-16`）命中；`install-verify` 仍只手动触发；`release.yml:227-237` 的「3 个资产 + 1 个 checksum」计数断言都在。
- **文档与脚本口径一致**：`packaging/README.md:44` 说「HKCU 卸载项 7 值」，`verify-installer.ps1:199` 的 `$need` 正好 7 项（DisplayName / DisplayVersion / Publisher / DisplayIcon / InstallLocation / UninstallString / EstimatedSize）。
- **随包 `README.txt`（46 行）口径正确**：便携版数据目录三级回退（`%LOCALAPPDATA%\Sidelight\WebView2` → `%TEMP%` → 程序同级 `webview2-data`）与宿主实际行为一致；「不写注册表 / 不建开始菜单 / 没代码签名 / 双击第二个 .md 会问一句」都属实。
- **`Sidelight.exe.config` 的长路径开关真的在**：`<AppContextSwitchOverrides value="Switch.System.IO.UseLegacyPathHandling=false;Switch.System.IO.BlockLongPaths=false" />`，与 `README.txt:25` 的说法一致（>260 字符路径的真实行为仍未验，见 §五）。
- **体积余量**：首屏距硬线 25,877 B（8.1%）、距内部预算 15,877 B；setup 1,306,376 B 距内部预算 43.7 MB。`measure-first-screen.mjs` 的「距硬线 <5% 打 WARN」不触发。

## 五、UNVERIFIED 清单

1. **真实宿主渲染的「首次启动 → 写 → 保存 → 重开」**：本会话沙箱禁止 WebView2 控制器（进程级 Chromium 子进程/命名管道被拒，第 48 轮记为 `0x8000FFFF`），宿主走 `fatalInitError` 分支。补测：非沙箱会话跑 `node scripts/host-smoke.mjs`（CDP 9333，先确认 9333 无监听）或真人双击装好的 exe。
2. **本轮静默安装挂住**：`.tmp/assoc-dryrun-setup.exe /S /D=…\.tmp\installed-r49` 在把 `TEMP`/`TMP` 重定向到 `.tmp\nsis-temp` 后 **>3 分钟无退出、未落盘任何文件**，已 kill（`.tmp/installed-r49` 不存在）。第 48 轮同一命令（不重定向 TEMP）15 s 成功，因此暂判为本轮调用方式问题、不是产品回归，但没有证据，记 UNVERIFIED。补测：照第 48 轮直接 `Start-Process setup -ArgumentList '/S','/D=…' -Wait`，或跑 `packaging/verify-installer.ps1`。
3. **安装后的 `HKCU\Software\Sidelight`、`HKCU\…\Uninstall\Sidelight`、开始菜单 `Sidelight.lnk`、SmartScreen 首次提示、真人双击**：本沙箱写 HKCU 被拒（第 48 轮实测 `UnauthorizedAccessException`），本轮没有安装成功也就没复验。
4. **`uninstall.exe` 的版本资源**（是否同样缺描述/公司）：依赖第 2 条安装成功，本轮取不到。
5. **正式 `packaging/verify-installer.ps1`**：会写 HKCU 与开始菜单，本轮未跑（与第 48 轮同）。
6. **macOS 包、签名/公证、真实 Intel Mac**：本机是 Windows，未跑。
7. **长路径 >260 字符的真实打开行为、便携 zip 在 `%TEMP%` 回退目录下的标题提示**：未验（与既有待办池同源）。
