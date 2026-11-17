# 第 45 轮 · finder-ship（安装、体积、启动与开源发布体验）

- 轮次：45，轮前 `startSha=021cbd35d0a0422e519b5c008a3d47fca1bdccbb`（本轮只读，除报告与 `shots/` 外未改仓库文件；`release/` 已按 SHA256 逐字节还原，见 §2.6）
- 环境：Windows 11 / Node 24.21 / `%LOCALAPPDATA%` 与 `%APPDATA%` 在本沙箱**不可写**（实测 `Set-Content` → Access denied），`%TEMP%` 可写（实测）
- 结论：**打包链完整可跑**，4 条端到端路径实测，发现 **5 条可落地问题**（1 条 P1）+ **1 条启动路径 UNVERIFIED**（沙箱阻塞 WebView2，非产品缺陷）

## 1. 结论摘要

| # | 级别 | 问题 | 一句话修法 |
| :-- | :-- | :-- | :-- |
| S1 | P1 | NSIS 升级不清 `$INSTDIR\www`，旧 hashed chunk 永久累积，每次升级 +3.85 MB | `installer.nsi` do_copy 前加 `RMDir /r "$INSTDIR\www"` |
| S2 | P2 | `SEC_MAIN` 没有 `SectionIn RO`，组件页可取消唯一必装节 → 安装"成功"但装出空目录 | `Section "Sidelight" SEC_MAIN` 下加 `SectionIn RO` |
| S3 | P2 | `setup.exe` 没有图标（0 处 `Icon`/`MUI_ICON`），向导标题栏与任务栏是通用图标 | `!define MUI_ICON` + `Icon "..\packaging\sidelight.ico"` |
| S4 | P2 | `packaging/verify-installer.ps1:77` 在受限环境硬失败，整条安装验收一步不跑 | marker 改落 `.tmp`，或 try/catch → `Unverified` |
| S5 | P2 | README 的安装包字节停在**第 39 轮**（1,300,711 / 1,622,355），本轮实测 1,303,397 / 1,625,899；主 chunk 也停在第 36 轮（898,601 → 909,935） | 打包后刷新这两处，或改成只指 Release 页清单 |
| U1 | UNVERIFIED | **打包后的 WebView2 宿主在本沙箱起不来**：`INIT-FAIL COMException (0x8000FFFF E_UNEXPECTED)` | 不在沙箱跑，或换有交互桌面/可写 `%LOCALAPPDATA%` 的会话复测 |

体积现状（本轮实测，全部远在预算内）：首屏 **292,681 B**（内部 310,000 / 硬线 320,000，距硬线余 27,319 B）；安装包 **1,303,397 B**（内部 45,000,000 / 硬线 50,000,000）；便携 zip **1,625,899 B**；`dist` 97 文件 3,848,009 B。

## 2. 实测记录

### 2.1 构建与首屏门（路径 1）

```
npm run build            → ✓ built in 482ms；index-Dxk5eSq9.js 909.93 kB raw / 288.23 kB gzip
node scripts/measure-first-screen.mjs
  909935  284863  /assets/index-Dxk5eSq9.js
     783     450  /assets/rolldown-runtime-vfrPO-fZ.js
   35872    7368  /assets/index-CBNQtgmh.css
total raw=946590 gzip=292681 headroom=27319 files=3 max=320000
target=310000 gap=17319
PASS
```

`dist/index.html`（36 行）**没有任何外部资源**：`script`/`modulepreload`/`stylesheet` 全部是 `/assets/*`；唯一命中 `https?://` 的是内联 SVG favicon 的 `xmlns`（第 9 行），不是请求。启动不联网这条在构建产物层面成立。

### 2.2 打宿主 + 两个包（路径 2）

```
powershell -ExecutionPolicy Bypass -File host\build.ps1
  OK D:\Documents\SidelightProgram\host\bin\Sidelight.exe
  bin 合计 4,889,772 B；www/index.html=True          （3 条 csc 警告：CS4014/CS0168×2，非致命）
powershell -ExecutionPolicy Bypass -File packaging\portable.ps1
  staging=4,900,058 B  zip=1,625,899 B  sha256=2E9BF87510BF14D053CAFFD3F4282E7A118FBF7D339964DFEE464F1291B4CE58  threshold=50,000,000 B
powershell -ExecutionPolicy Bypass -File packaging\installer.ps1
  fileVersion=0.32.1.0；setup=1,303,397 B；sha256=32A36CA212CAA8FCE371B5F787B8C025AB44235674EE2159B926A75F522431CD
  target=45000000 gap=-43696603；hard=50000000 B estimatedSize=4759 KB
powershell -ExecutionPolicy Bypass -File packaging\installer.ps1 -AssocDryRun
  assoc-dryrun=1,304,062 B
```

工具链齐全、**无需联网**：NSIS 3.11 已在 `.tmp\nsis\nsis-3.11\makensis.exe`、WebView2 SDK 在 `.tmp\wv2`、宿主用系统 `csc.exe`。两个包的体积护栏都按 2026-11-17 放宽后的线（45,000,000 / 50,000,000）执行，`gap` 打印正确。

### 2.3 静默安装 / 升级 / 卸载（路径 3，自写探针 `.tmp/e2e-r45-install.ps1`）

```
dist files=97 bytes=3848009
RESULT fresh-install exit=0 missing=            ← 10 件载荷齐全（exe/config/ico/README/LICENSE/uninstall/3 DLL/www/index.html）
INFO www files=97 bytes=3848009                 ← www 与 dist 逐字节同规模，没有多余文件
RESULT cli-version … 0.32.1                      ← Sidelight.exe --version = 0.32.1（stdout 落控制台；管道捕获被沙箱拒）
RESULT install-again exit=0 staleChunkStillThere=True
INFO www before=98 files / 3853011 B ; after=98 files / 3853011 B
RESULT uninstall exit=0 dirLeft=False
INFO HKCU uninstall key left=False
INFO Start Menu shortcut=False                   ← 沙箱禁写 %APPDATA%，只算"不可观测"，不算通过
```

安装目录用 `/D` 指到工作区 `.tmp`，未碰默认安装路径、未装到本机。

### 2.4 打包载荷启动（路径 4，`vite preview` 供 `dist` + CDP 9224）

`node .tmp/reset.mjs 9224` → `{"reset":true,"port":"9224","closed":0}`；`node .tmp/e2e-r45-ship-dist.mjs`：

```json
{ "title": "未命名.md — Sidelight", "firstText": "\n",
  "scripts": ["/assets/index-Dxk5eSq9.js"], "typedOk": true, "dirty": true,
  "errors": [], "mermaid": { "fence": 0, "jsChunks": 0 } }
```

首启是空白 `未命名.md`（不加载示例），输入进正文并置脏，控制台 0 错误，Mermaid 首屏 0 次 chunk 请求。截图：`shots/round-45/ship-20-packaged-dist-first-screen.png`、`ship-21-packaged-dist-typed.png`。
附：同一份源码两次构建产物文件名 hash 相同（`index-Dxk5eSq9.js`），构建可复现。

### 2.5 打包后的宿主：起不来（U1）

`node .tmp/e2e-r45-ship-app.mjs`（解压 zip → `.tmp/e2e-r45-unzip/Sidelight/Sidelight.exe`，带 `WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS=--remote-debugging-port=9334`、`SIDELIGHT_PORT=47851`）→ CDP 连接被拒。宿主自己的日志给了原因：

```
18:37:10.945 state dir kind=temp
18:37:10.954 loopback listening port=47851
18:37:10.956 data dir candidate failed name=WebView2
18:37:10.958 data dir kind=temp
18:37:13.526 INIT-FAIL System.Runtime.InteropServices.COMException (0x8000FFFF): 灾难性故障
   在 Microsoft.Web.WebView2.Core.CoreWebView2Environment.<CreateCoreWebView2ControllerAsync>…
```

回环服务、数据目录回退（localappdata→temp→portable）、状态目录都正常；**只有 WebView2 控制器创建失败**。DSH 沙箱禁止子进程开命名管道（`stdio: 'pipe'` 一律 EPERM），WebView2 与宿主之间的 IPC 走的就是这条通道，所以这不是产品缺陷，是本会话的环境天花板。`scripts/host-smoke.mjs` 走同一条启动路径，本轮同样无法复验。

**补测方法**：在可写 `%LOCALAPPDATA%`、允许命名管道的会话里跑
`node scripts/host-smoke.mjs --fsa`（会连带验原生文件夹对话框、真实写回），
再重跑 `.tmp/e2e-r45-ship-app.mjs`（它已经写好"首次启动 → 打字 → Ctrl+S 写回 → 关掉重开 → 字节未变"四段断言，只差 WebView2 能起）。

### 2.6 `release/` 已还原

本轮 `portable.ps1` / `installer.ps1` 会写 `release/`，与「不碰 `release/`」冲突，处理办法是先备份再跑、跑完按字节还原。还原后 SHA256 与备份一致：

```
6C93F58FDAF470D1DA36D35D73E3CFE921324CEB133E757301395020004826B2  release/Sidelight-0.32.1-win-x64-setup.exe   (824,595 B)
F4210C620D2DD2D6F0A5EF064234823863383C4518DBAECE5BCA21AAE4CBD5DD  release/Sidelight-0.32.1-win-x64-portable.zip (910,360 B)
2F32C26A8F165E9A8E9B4A52D51750B901F0BD536ECD376A71103EAC86CC9651  release/SHA256SUMS.txt
```

`git status --porcelain` 只剩 `?? docs/iteration/round-45/`、`?? shots/round-45/`（本轮报告与截图）。

## 3. 问题详情

### S1（P1）NSIS 升级不清 `www`：每升级一次多一份旧前端

**证据**
- `packaging/installer.nsi:130-131`：`SetOutPath "$INSTDIR\www"` 紧接 `File /r "..\dist\*"`，**之前没有 `RMDir`**（对比 `host/build.ps1:27` 本地构建是 `if (Test-Path $www) { Remove-Item $www -Recurse -Force }`）。
- 实测：装好后 `www` = 97 文件 / 3,848,009 B（= `dist` 原样）。手工放一个旧版 hashed chunk（`www\assets\index-OLDLONGCHUNK-DEADBEEF.js`，5,000 B）后**再装一次同版本**：`exit=0`，`staleChunkStillThere=True`，`www` 变 98 文件 / 3,853,011 B。同样的前缀与后缀在真实升级里就是「上一版的整份 www」。
- 复现：`powershell -NoProfile -ExecutionPolicy Bypass -File .tmp\e2e-r45-install.ps1`（脚本第 3 段）。

**影响**：安装目录从 4.8 MB 起，每升级一次 +3.85 MB（第 39 轮记录是 +2.69 MB，随 Mermaid chunk 一起长大），且旧 chunk 永远滞留。用户侧表现为「装了几次以后占空间越来越大」，与本产品「体积小巧」的验收维度直接冲突；卸载能清掉（`RMDir /r "$INSTDIR"`），所以只在安装态累积。

**修法**：`do_copy` 里 `SetOutPath "$INSTDIR\www"` 之前加一行 `RMDir /r "$INSTDIR\www"`（清的是安装目录内的产物，不是用户数据）。收益：升级后占空间恒定 = 当前版本载荷；顺带消掉「旧 chunk 在磁盘上但 index.html 不引用」的脏状态。

### S2（P2）主节没有 `SectionIn RO`

**证据**：`packaging/installer.nsi:43` 挂了 `MUI_PAGE_COMPONENTS`（组件选择页），`:94` 是 `Section "Sidelight" SEC_MAIN`，全文 **0 条 `SectionIn`**（`grep SectionIn packaging/installer.nsi` 无命中）。另一个节 `SEC_ASSOC` 是 `/o`（默认不勾）。

**影响**：NSIS 默认允许用户取消勾选非只读节。组件页上只有一个「Sidelight」复选框，用户取消后点安装，安装器照常走完并报成功，但既不写 exe 也不写 `uninstall.exe`、不建快捷方式、不写卸载项 —— 磁盘上只会留下一个空目录（或与关联节一起什么都不留），用户会以为装好了。修法：`Section "Sidelight" SEC_MAIN` 之后加 `SectionIn RO`，让该复选框呈灰选态。这条本轮**没有**做 UI 复现（沙箱不能稳定点向导），判定依据是 `installer.nsi` 静态结构 + NSIS 语义；人工复现 5 步：双击 setup → 下一步（目录页）→ 在组件页取消勾选「Sidelight」→ 安装 → 检查安装目录只有 `www` 之外的 0 个文件。

### S3（P2）`setup.exe` 没有图标

**证据**：`packaging/installer.nsi` 全文 0 条 `Icon "…"` / `MUI_ICON`（只有注册值 `DefaultIcon`、`ApplicationIcon` 与 `MB_ICONSTOP`）。截图 `shots/round-45/ship-10-setup-wizard.png`：向导窗口标题栏左上角是**通用窗口图标**，任务栏条目显示系统默认图标。对照 `host/build.ps1:44` 是带 `/win32icon:packaging\sidelight.ico` 的，图标文件现成（`packaging/sidelight.ico`，23,724 B），条件具备。

**影响**：用户从浏览器下载后第一眼看到的是 NSIS 默认图标，与「公开发布、Windows 首发」的品牌体验不一致；SmartScreen 提示条里也显示这个图标。修法：`!define MUI_ICON "..\packaging\sidelight.ico"` + `Icon "..\packaging\sidelight.ico"`（体积增量 < 24 KB 且被 LZMA 压掉大半）。顺带：本轮截图没抓到向导内容页（启动 3 s 时客户端区还是白的），只作图标证据，不做页面断言。

### S4（P2）`verify-installer.ps1` 在受限环境硬失败在第一步

**证据**：`packaging/verify-installer.ps1:76-77`

```
New-Item -ItemType Directory -Force -Path $userData | Out-Null
Set-Content -Path $marker -Value 'keep-me' -Encoding UTF8
```

`$userData = %LOCALAPPDATA%\Sidelight`。本轮实跑：

```
PASS 体积在硬线 50,000,000 B 内（setup=1303397 B）
PASS 运行时存在（pv=157.0.4341.46 loader=True）
Set-Content : Access to the path 'C:\Users\WINDOWS\AppData\Local\Sidelight\impl-b-userdata-marker.txt' is denied.
  at packaging\verify-installer.ps1:77  → exit 1
```

后面 12 组断言（静默安装、运行中拒绝、装后启动、`--version`、卸载清理、用户数据保留、dry-run 关联）**一条都没执行**，脚本以 exit 1 收场 —— 看退出码会误判成「产品坏了」。脚本开头已经知道沙箱两处限制（注释第 2–4 行），但这条 marker 没有对应分支。

**修法**：marker 落 `.tmp\install-verify-data`（或先试 `%LOCALAPPDATA%`，写不进就 `Unverified`），与顶部「HKCU/快捷方式不可观测」同一处理。收益：任何人（含未来的 finder）在受限会话里都能拿到 8 条真实安装断言。

### S5（P2）README 的体积数字落后两轮以上

**证据**
- `README.md:114` 写「第 39 轮真实打包实测 setup **1,300,711 B**、便携 zip **1,622,355 B**」，本轮同脚本实测 **1,303,397 B / 1,625,899 B**（差 +2,686 / +3,544）。
- 同段写「主 chunk 898,601 B（2026-11-17 第 36 轮实测）」，本轮 `vite build` 输出 `index-Dxk5eSq9.js 909.93 kB`。
- `release/SHA256SUMS.txt` 只有 0.26.0 两条（0.27.0–0.32.1 的 22 个产物都不在里面）；所有文档都指 Release 页的 `SHA256SUMS-<版本>.txt`，所以这只是本机卫生问题，不误导下载方。

**影响**：下一轮做发布专项时，判断「包多大、还差多少到预算」会拿到旧数；本轮第 39→45 轮的增量（+2 张表 / 千字节级）不明显但会持续漂。修法：把这两处数字改成「再打包后刷新」，或直接删掉具体字节、只留线（45,000,000 / 50,000,000）与 Release 页链接。

## 4. 试过、判为没问题的路径

1. **构建 + 首屏门**：`npm run build`（tsc 0 错）、`measure-first-screen.mjs` PASS，`files=3` 且不含 mermaid/katex/lazy；主 chunk 与 gzip 均与 STATE 第 55 行一致。
2. **两包的工具链**：NSIS 3.11 / WebView2 SDK 1.0.4314.35 / 系统 `csc.exe` 都在位，`installer.ps1` 的下载分支本轮未触发（`.tmp\nsis` 已有缓存）——即离线打包可行。
3. **产物版本门**：`installer.ps1` 断言 `FileVersion=0.32.1.0`，本轮通过（挡住过 0.31.1 事故的那道门仍然有牙）。
4. **安装到工作区**：10 件载荷齐全、`www` 与 `dist` 同规模、`uninstall.exe` 可静默卸载且清空安装目录、HKCU 卸载项卸载后读到 False、不写 HKLM。
5. **便携包完整性**：解压 105 文件、4,900,058 B，文件清单 = staging 原样（无 `webview2-data` / `host.log` / `*.ps1`），`Sidelight.exe.config` 与 `sidelight.ico` 都在（`host/Program.cs:156-157` 真的会读 `sidelight.ico`，所以它**不是**死载荷）。
6. **CI 静态核对**：`ci.yml` 的 `windows-host` job 串起 `host/build.ps1` → `host-smoke` → `installer.ps1` → `portable.ps1` → 校验和与 artifact；`install-verify` job 的 `if` 用到的 `run_install_verify` 输入在 `on.workflow_dispatch.inputs`（第 8-12 行）里有定义，不是永远为假的死条件；`release.yml` 会为三个资产生成 `SHA256SUMS-<版本>.txt` 并 `sha256sum -c` 自检。三条都按现状成立。
7. **启动不联网**：`dist/index.html` 只引用 `/assets/*`（唯一 `http://` 是 SVG 命名空间）；打包载荷在浏览器里跑起来后 Mermaid chunk 0 次请求。
8. **`packaging/portable.ps1` 的 staging 卫生断言**（`webview2-data` / `host.log` / `*.ps1` 混入即失败）本轮未触发，且 staging 实测干净。

## 5. UNVERIFIED

| 条目 | 为什么测不了 | 怎么补 |
| :-- | :-- | :-- |
| 打包宿主的「首次启动 → 写 → 保存 → 重开」 | WebView2 控制器创建 `0x8000FFFF`（沙箱禁命名管道） | 换可写 `%LOCALAPPDATA%` 的会话跑 `.tmp/e2e-r45-ship-app.mjs`；或用 `scripts/host-smoke.mjs --fsa` |
| 开始菜单快捷方式、HKCU 卸载项、SmartScreen/签名提示、真人双击 | 沙箱禁写 `%APPDATA%`；无交互登录桌面 | CI `install-verify`（手动 dispatch）或真机 |
| 组件页取消勾选 → 空安装（S2 的 UI 复现） | 向导点击不可脚本化 | 真机双击 setup，取消「Sidelight」后安装 |
| `Sidelight.exe --version` 的 stdout 捕获 | 沙箱禁管道捕获（`Start-Process … -RedirectStandardOutput` → Access denied）；值本身已从控制台读到 `0.32.1` | 真实终端直接跑 |
| macOS 包与签名/公证 | 本机是 Windows | `macos-host` job / 真机 |

## 6. 本轮产物

- 报告：`docs/iteration/round-45/findings-ship.md`
- 截图：`shots/round-45/ship-10-setup-wizard.png`（向导 + 通用图标）、`ship-20-packaged-dist-first-screen.png`、`ship-21-packaged-dist-typed.png`
- 复现脚本（`.tmp/`，不进版本控制）：`e2e-r45-install.ps1`、`e2e-r45-ship-app.mjs`、`e2e-r45-ship-dist.mjs`、`ship-dist-e2e.json`
