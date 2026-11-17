# 第 46 轮 finder-ship（安装、体积、启动与开源发布体验）

- 轮次：46，轮前 `startSha=39e4f0211f43b7edaca82d468d0997f029151e3c`（本报告与 `shots/round-46/dist-*.png` 之外未改仓库文件；`release/` 逐字节未动，见 §5）
- 环境：Windows 11 / Node 24.21 / dev server 5175（未重启）/ 浏览器 CDP 9224 / `%LOCALAPPDATA%` 在本沙箱**不可写**（实测 `Access denied`），`%TEMP%` 与工作区可写
- 结论：**打包链完整可跑，两个包都过了体积硬线，且连打两次字节与 SHA256 相同**；找到 **5 条可落地问题**（2 条 P1 数据/验收风险、3 条 P2 文档与门禁），**启动链路 1 条 UNVERIFIED**（沙箱挡 WebView2，非产品缺陷）

## 1. 结论摘要

| # | 级别 | 问题 | 一句话修法 |
| :-- | :-- | :-- | :-- |
| S1 | P1 | 卸载段 `RMDir /r "$INSTDIR"` 递归删整个安装目录；目录页允许把 `$INSTDIR` 改成任意已有目录，卸载会连带删掉该目录里**不属于 Sidelight 的文件** | 卸载只删自己写入的文件与 `www\`，末尾用非递归 `RMDir "$INSTDIR"`；或在目录页拒绝非空目录 |
| S2 | P1 | 本地 `release/` 里的 `Sidelight-0.32.1-win-x64-setup.exe` 是 **824,595 B**，同源码今天重建是 **1,304,598 B**（差 480,003 B，+58%）；`verify-installer.ps1` 默认就验 `release/` 那个旧包，`SHA256SUMS.txt` 还只列 0.26.0 | 每次验收前重建 `release/`，或让 `verify-installer.ps1` 打印 setup 的 mtime + FileVersion，超过 N 天/与 `host/bin` 不同批就报 UNVERIFIED |
| S3 | P2 | 版本门是**自证**的：CI 只断言 setup 的 `FileVersion`，而它由 `installer.nsi` 从 `package.json` 带入；没有任何脚本断言 **payload `host\bin\Sidelight.exe`** 的版本 | `installer.ps1` / `portable.ps1` 开头断言 `(Get-Item host\bin\Sidelight.exe).VersionInfo.FileVersion -eq "$version.0"`，不符 `exit 1` |
| S4 | P2 | 文档里的安装包字节三处互相矛盾，且与今天实测都对不上（`packaging/README.md:57` 1,304,634；`AGENTS.md` §8 1,304,596 / 1,304,634；第 45 轮报告 1,303,397 / 1,304,062；本轮实测 1,304,598） | 三处统一写今天实测的 `setup 1,304,598 B / zip 1,625,931 B / dist 97 文件 3,848,092 B`，或改成「≈1.30 MB，以 Release 页 SHA256SUMS 为准」 |
| S5 | P2 | `verify-installer.ps1:76-77` 往 `%LOCALAPPDATA%\Sidelight` 写 marker，任一受限环境在**第 77 行 PermissionDenied 直接退出**，静默安装/升级/卸载一条都不跑 | 该处包 try/catch → `Unverified`，或 marker 改落 `.tmp\`（与脚本头注释的沙箱策略一致） |
| U1 | UNVERIFIED | 打包后的 WebView2 宿主在本沙箱起不来：`INIT-FAIL COMException (0x8000FFFF E_UNEXPECTED)`，随后 `close requested` 自动退出；改用「打包 www + CDP 9224」替代验证 | 在有交互桌面、`%LOCALAPPDATA%` 可写的会话复测；本轮已实测的部分见 §3 |

体积现状（本轮实测，全部远在预算内）：首屏 **292,707 B**（内部 310,000 / 硬线 320,000，距硬线余 27,293 B）；安装包 **1,304,598 B**（内部 45,000,000 / 硬线 50,000,000）；便携 zip **1,625,931 B**（硬线 50,000,000）；`dist` 97 文件 3,848,092 B。

## 2. 实测记录

### 2.1 构建与首屏门（`npm run build` + `measure-first-screen`）

```
npm run build                      → exit 0（1.3 s，含 tsc --noEmit）
node scripts/measure-first-screen.mjs
   910048   284889  /assets/index-BOGRUlpG.js
      783      450  /assets/rolldown-runtime-vfrPO-fZ.js
    35842     7368  /assets/index-8SdzhVFM.css
total raw=946673 gzip=292707 headroom=27293 files=3 max=320000
target=310000 gap=17293
gzip 省下 653966 B（69.1%）
PASS
```

`dist` 构成：`.js` 79 个 3,570,377 B、`.woff2` 15 个 213,664 B、`.css` 2 个 62,469 B、`.html` 1 个 1,582 B；**无 `.map`**（打包 `www` 里也无，E2E 断言通过）。

### 2.2 打包（宿主 + 两个包）

`release/` 未改动：为了守住「不改 `release/`」，本轮把 `packaging/portable.ps1`、`installer.ps1`、`installer.nsi`、`package.json`、`LICENSE`、`dist/`、`host/bin/`、`.tmp/nsis` 镜像到 `.tmp/ship46/`（脚本**一个字节没改**，只是 `$PSScriptRoot` 的父目录换成镜像根，于是 `$release` 自然落到 `.tmp/ship46/release`）。

```
powershell -File host\build.ps1
  OK host\bin\Sidelight.exe   bin 合计 4,889,855 B   www/index.html=True
  （3 条 csc 警告：CS4014 / CS0168×2，非致命；与第 45 轮同）

powershell -File packaging\portable.ps1
  staging=4,900,141 B   zip=1,625,931 B   threshold=50,000,000 B   exit 0
powershell -File packaging\installer.ps1
  fileVersion=0.32.1.0   setup=1,304,598 B   estimatedSize=4759 KB
  target=45000000 gap=-43695402   hard=50000000 B   exit 0
powershell -File packaging\installer.ps1 -AssocDryRun
  assoc-dryrun=1,304,582 B（比正式包小 16 B）
```

**可复现性**（同一 `host/bin` + 同一 `dist` 连打）：

```
setup  run1=1304598 sha=773D36CEA422 / run2=1304598 同 sha / run3=1304598 同 sha
zip    run1=1625931 sha=91A0C8B00621 / run2=1625931 同 sha
```

→ 打包本身确定性成立，S4 的差异不是「每次都不一样」，而是文档抄的批次不对。

### 2.3 打包后的宿主（U1，为什么 UNVERIFIED）

```
tmp/ship46/unzip/Sidelight/host.log
19:51:21.158 loopback port override 47861
19:51:21.165 loopback listening port=47861
19:51:21.167 data dir candidate failed name=WebView2
19:51:21.168 data dir kind=temp
19:51:22.222 pipe server started
19:51:23.730 INIT-FAIL System.Runtime.InteropServices.COMException (0x8000FFFF): 灾难性故障
   …Microsoft.Web.WebView2.Core.CoreWebView2Environment.<CreateCoreWebView2ControllerAsync>
   …Microsoft.Web.WebView2.WinForms.WebView2.<InitCoreWebView2Async>
   …Program.<InitWebView>
19:51:23.731 close requested → 进程自行退出（CDP 9336 从未监听）
```

判读：本沙箱禁止子进程用命名管道跑 Chromium 系进程，WebView2 控制器建不出来——与第 45 轮 U1 同因同象，**不是产品缺陷**。附带两个正向证据：端口可被 `SIDELIGHT_PORT` 覆盖；`%LOCALAPPDATA%\Sidelight\WebView2` 不可写时按设计退到 `kind=temp`，日志如实记录（`Program.cs:1906-1922`）。

### 2.4 打包产物本体能跑（`www == dist` + 真浏览器）

```
www 97 文件 3,848,092 B ；dist 97 文件 3,848,092 B ；name+size diff = 0   （逐字节同一份）
node .tmp/e2e-r46-ship-dist.mjs（静态服务 .tmp/ship46/unzip/Sidelight/www:5210 + CDP 9224）
```

| 断言 | 结果 |
| :-- | :-- |
| 打包产物在真浏览器载入编辑视图 | PASS 616 ms |
| 首启标题 `未命名.md`、正文为空（不加载示例） | PASS |
| 首屏不请求 Mermaid / KaTeX chunk | PASS（首载资源 transferSize 954,263 B，DCL 485 ms） |
| 打字进正文（`# 打包产物验收 46`） | PASS |
| 打进 ```mermaid 围栏**之后**才下载 chunk | PASS `/assets/mermaidLoader-BusNpdmC.js` |
| 打进 `$…$` 公式**之后**才下载 chunk | PASS（探针更正，见下） |
| 重载后草稿仍在 | PASS |
| 控制台 0 错误 | 1 条 404：`GET /__doc`——这是静态服务器没有宿主端点，真宿主下返回 200，**不算产品缺陷** |

**假阴更正**（诚实记录）：首跑 `.tmp/e2e-r46-ship-dist.mjs` 里 KaTeX 一条 FAIL、console 一条 FAIL。探针 `.tmp/e2e-r46-probe.mjs` 证明两件都是测试脚本问题：(1) 我的 `$$E=mc^2$$` 打在了 mermaid 代码块里，换成正文段落打 `$E=mc^2$` 后 `katexNodes=1` 并下载 `katexLoader-*.js/.css` 与 2 个 woff2；(2) 404 就是上面这条 `/__doc`，另有一个外部 host `aepdhbcjfkpncgbmlllcaloniioihlma` 来自 9224 profile 里的浏览器扩展，不是应用请求。**应用侧首载只请求 `localhost:5210`。**

证据截图（`shots/round-46/`）：`dist-01-first-launch.png`、`dist-02-typed.png`、`dist-03-mermaid.png`、`dist-04-katex.png`、`dist-05-reload.png`、`dist-06-katex-probe.png`；宿主起不来那次的尝试脚本 `.tmp/e2e-r46-ship.mjs`（保留，CDP 9336 连不上为预期）。

### 2.5 S2 / S3 的复现

S2（本地 `release/` 与同源码重建差 480,003 B）：

```
release/Sidelight-0.32.1-win-x64-setup.exe      824,595 B  sha=6C93F58FDAF4…
release/Sidelight-0.32.1-win-x64-portable.zip   910,360 B
本轮同源码（.tmp/ship46/release/）              1,304,598 B / 1,625,931 B
release/SHA256SUMS.txt                          只列 0.26.0 的两个文件（目录里已无 0.26.0）
verify-installer.ps1 实跑第一条就是 setup=824,595 B → 验的是旧包
```

S3（stale `host/bin` 能骗过版本门）：

```
镜像里 package.json 改成 0.32.2，host/bin 不重编（payload exe FileVersion=0.32.1.0）
packaging\portable.ps1 → exit 0，产出 Sidelight-0.32.2-win-x64-portable.zip（1,625,931 B）
                         包里 exe 仍是 0.32.1.0，脚本不打印也不校验版本
grep FileVersion：installer.ps1:81-87 查的是 **setup**，release.yml:103-111 查的也是 **setup**
                  verify-installer.ps1:149 会查已安装 exe，但该脚本不在 CI（`install-verify` 只手动触发）
```

S1（卸载递归删目录）：`installer.nsi:32` 默认 `$LOCALAPPDATA\Programs\Sidelight`，`:48` 插入 `MUI_PAGE_DIRECTORY`（可改成任意可写路径），`:196` 卸载段 `RMDir /r "$INSTDIR"`。用户若把安装目录指到已有目录（例如 `D:\Apps`、`D:\笔记`），卸载会把该目录整个删掉。本轮**未做真实安装**（不碰 HKCU、不改本机），所以这是代码级结论 + 路径证据，不是安装实测；触发条件写清了。

## 3. 试过但判断没问题的路径（不敷衍的 0 条）

1. **体积**：首屏 292,707 B（余 27,293 B）、setup 1,304,598 B（余 43,695,402 B）、zip 1,625,931 B —— 三条线都远未触线，没有可砍的硬需求。`cytoscape 441 KB` / `katexLoader 258 KB` 等大块全在惰性 chunk 里，首载 0 B（§2.4 已实测）。
2. **启动是否联网**：`dist/index.html` 无外部资源；浏览器里首载请求只有 `localhost:5210`；宿主只监听回环（`Program.cs:212-238`）。判断不联网成立。
3. **端口占用**：`Program.cs:228-233` 已 catch 并弹「端口被占用，请关闭占用它的程序后重开」——有明确文案，不换端口是对的（origin 恒定才能保 localStorage），无发现。
4. **打包卫生**：`staging` 无 `webview2-data` / `host.log` / `*.ps1`（断言已过）；`host\bin` 里的 `host.log*` 不会被 `installer.nsi` 带走（只 `File` 五个固定文件 + `dist`）；`Sidelight.exe.config`、`LICENSE`、`README.txt`、`sidelight.ico` 都在。
5. **`package.json` 依赖**：运行时只有 tiptap/react/katex/mermaid，宿主用系统 `csc` + WebView2 SDK（不进依赖）；`playwright-core` 在 devDependencies。无可疑运行时依赖，没有为省 KB 而砍体验的必要。
6. **CI**：`ci.yml` + `release.yml` 的 Windows job 跑 `npm run build` → `npm test` → 首屏门 → 宿主编译 → `host-smoke` → 两个包 → setup 版本断言；macOS job 跑 self-test + verify；Linux gate 见 `ci.yml`。链路完整，问题只在 §1 的 S3（版本断言指向 self 而非 payload）。
7. **`/__doc` 404**：只在「没有宿主」的静态服务器里出现（本轮复现方式决定），真宿主下 `Program.cs:297` 返回 200 文件名。不算缺陷。

## 4. 建议的落地顺序

1. S5（10 行 try/catch，立刻让安装验收在受限环境跑到卸载段）
2. S3（两个 ps1 各 3 行断言，直接堵住 stale host 的版本漂移）
3. S1（卸载改成只删自己写的文件；影响面小、风险最大）
4. S2 + S4（发布前重建 `release/`、三处文档统一成本轮实测数字）

## 5. 未改动声明

- `git status --porcelain` 本轮结束时只有 `?? shots/round-46/`
- `release/` 目录近 2 小时无任何文件被写（`LastWriteTime` 过滤为空）；所有包体产物落在 `.tmp/ship46/release/`
- 未安装到本机、未写 HKCU、未改注册表、未 push、未动 `release/`
