# 第 50 轮 · finder-ship：安装、体积、启动与开源发布体验

- 轮次：50；startSha `6ae9be39ee5007da2ebcdffd636da21675dc6694`（工作区起始 clean）
- 环境：Windows 11、Node v24.21.0、dev server `http://localhost:5175`（未重启）、浏览器 CDP 9224、本轮只有 ship 做构建
- 结论：**构建与首屏 PASS，两个安装产物都打出来了，均远在预算内；打包产物在沙箱里启动到 WebView2 就失败（环境限制），安装与窗口内功能 UNVERIFIED**。4 条 P2 可落地项，全部与文档/发布资产/host 构建卫生有关。

## 1. 门禁与首屏（PASS）

```
npm run build        # exit 0, built in 471ms（tsc --noEmit + vite build 均过）
node scripts/measure-first-screen.mjs
total raw=951197 gzip=294373 headroom=25627 files=3 max=320000
target=310000 gap=15627
PASS
```

- 首屏 **294,373 B**，内部预算 310,000（余 15,627 B）、硬线 320,000（余 25,627 B），`files=3`。
- 数字与 `docs/iteration/STATE.md:55` 记的第 49 轮值逐字节一致，无回归。
- 主 chunk `dist/assets/index-Co4S6KZw.js` 913,822 B raw / gzip 286,419 B；首屏另两个文件是 `index-*.css`、`rolldown-runtime-*.js`。

## 2. 端到端打包

### 2.1 宿主

```
powershell -File host\build.ps1
OK D:\Documents\SidelightProgram\host\bin\Sidelight.exe
bin 合计 4,894,501 B；www/index.html=True
```

- payload `host\bin\Sidelight.exe` FileVersion = **0.32.1.0**，与 `package.json` 同版本（两个打包脚本的版本门都过）。
- 编译有 3 条 warning（`Program.cs:1337` CS4014、`:1381`/`:1478` CS0168），无 error。

### 2.2 便携 zip

```
packaging\portable.ps1
payload fileVersion=0.32.1.0
staging=4,904,787 B
zip=1,627,622 B  release\Sidelight-0.32.1-win-x64-portable.zip
sha256=11BBBFD5FEBEF6270D97C3961AC60DD885C858042291EFDE5FEEA73ACCF7A2B6
threshold=50,000,000 B
```

- zip 根目录是 `Sidelight\`，105 个 entry：宿主 5 件 + `sidelight.ico` + `README.txt` + `LICENSE` + `www\`（`index.html` + assets）。
- staging 卫生断言（无 `webview2-data`、无 `host.log`、无 `*.ps1`）全部通过。

### 2.3 NSIS 安装包

```
packaging\installer.ps1
fileVersion=0.32.1.0  release\Sidelight-0.32.1-win-x64-setup.exe
target=45000000 gap=-43693854
setup=1,306,146 B   sha256=9E566C6DEFF0642DC5C6E02C24C133BB99F8BADF01C3BA15B475C880140A3017
hard=50000000 B  estimatedSize=4764 KB
```

| 产物 | 实测字节 | 内部预算 45,000,000 | 硬线 50,000,000 | 结论 |
| :--- | ---: | ---: | ---: | :--- |
| `Sidelight-0.32.1-win-x64-setup.exe` | **1,306,146** | 余 43,693,854 | 余 48,693,854 | PASS |
| `Sidelight-0.32.1-win-x64-portable.zip` | **1,627,622** | 共用硬线 50,000,000 | 余 48,372,378 | PASS |

- 与上一轮真实打包（`STATE.md:55` 第 39 轮 setup 1,300,711 / zip 1,622,355）相比：**+5,435 / +5,267 B（+0.42% / +0.32%）**，11 轮的累计增长可接受。
- 同 payload 下 zip 比 setup 大 321,476 B（+24.6%）：zip 用 Deflate，setup 用 LZMA solid。要压 zip 得换压缩器或加依赖，按「不新增运行时依赖」不划算，只记录。
- `release/` 跑完已恢复原样（备份 `.tmp/ship-r50-relbak`，23 个文件；0.32.1 setup 824,595 B / zip 910,360 B 回到原值）；未 push。

## 3. 启动打包后的应用：卡在 WebView2（BLOCKED → UNVERIFIED）

启动的是 staging 里的便携包（`.tmp\portable\Sidelight\Sidelight.exe`，pid 57412），
`LOCALAPPDATA`/`TEMP` 重定向到 `.tmp\r50-appdata`，`WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS=--remote-debugging-port=9334`。
`host.log`：

```
01:02:26.775 state dir kind=localappdata
01:02:26.783 loopback listening port=47821
01:02:26.786 data dir candidate failed name=WebView2
01:02:26.786 data dir kind=temp
01:02:29.151 INIT-FAIL System.Runtime.InteropServices.COMException (0x8000FFFF): 灾难性故障
   在 CoreWebView2Environment.<CreateCoreWebView2ControllerAsync>d__15.MoveNext()
01:02:29.152 close requested
```

- 进程起来、回环 47821 也起来了，但 WebView2 控制器创建失败，窗口按 `host/Program.cs:176-178` 走 `RunErrorForm`（用户看得到错误对话框），CDP 9334 从未监听。
- 判定：**沙箱禁止启动 Chromium/WebView2 子进程**（`common.md` 环境限制），不是产品缺陷；同一二进制在 CI 上跑 `scripts/host-smoke.mjs` 是另一条路径。
- 因此「首次启动 → 写 → 保存 → 重开」在**打包产物**上未验；三项用户路径改在 dev server 上做（见第 4 节）。

## 4. 三条用户路径 + 截图（dev 5175 / CDP 9224）

先 `node .tmp/reset.mjs 9224`，再跑 `.tmp/e2e-r50-ship.mjs`。

| # | 路径 | 结果 | 证据 |
| :--- | :--- | :--- | :--- |
| 1 | 首屏空文档 | `未命名.md — Sidelight`，1 段、`0 字`、12 个菜单按钮、无横向溢出 | `shots/round-50/ship-01-first-screen.png` |
| 2 | 写正文（`# 第 50 轮 ship 验收` + 一段） | H1=1，状态栏 `21 字 · 阅读约 1 分钟 自动保存排队中` | `shots/round-50/ship-02-typed.png` |
| 3 | 点状态栏字数入口 | 字数明细面板打开（中日韩/合计/字符…） | `shots/round-50/ship-03-stats.png` |

- 控制台 **0 error、0 pageerror、0 requestfailed**。
- 应用发起的请求 origin 只有 `http://localhost:5175`；唯一的外部 URL 是 agent 浏览器扩展的 `chrome-extension://…/eduser.css`，不是应用流量。→ 开发模式下启动无外部网络请求。

## 5. dist 体积与 chunk 构成

`dist` 合计 **3,852,738 B / 97 文件**（`0` 个 `.map`）：

| 类型 | 文件数 | 字节 |
| :--- | ---: | ---: |
| `.js` | 79 | 3,574,273 |
| `.woff2` | 15 | 213,664 |
| `.css` | 2 | 63,219 |
| `.html` | 1 | 1,582 |

最大的 5 个 chunk：`index-Co4S6KZw.js` 913,822；`cytoscape.esm` 441,717；`chunk-FPAJGGOC` 361,226；`katexLoader` 258,788；`architectureDiagram` 145,637。
Mermaid 与 KaTeX 都在按需 chunk 里，首屏 3 个文件 294,373 B gzip，与预算逻辑一致；`fonts` 也只在公式渲染时加载。

## 6. 依赖与 CI

- `package.json`：16 个运行时依赖，全是 Tiptap 3.34 / React 19 / katex 0.18 / mermaid 11.12.0；无 `postinstall`、无脚本钩子、无联网脚本。devDependencies 6 个（`playwright-core` 只在测试里用）。
- `release.yml`：preflight 断言 tag = `package.json` = CHANGELOG 节；windows-build 跑 build → test → measure → host build → host-smoke → installer → portable → setup FileVersion 断言 → 上传两个 Windows 资产；macOS job 打 universal 包、6 条 self-test、`verify.sh`，有 Apple secrets 才签名；release job 卡 3 资产 + `SHA256SUMS-<版本>.txt` + RELEASE_NOTES 的 4 文件约束。
- 缺口：Windows job 没有调用 `packaging/verify-portable.mjs`（见 S4），便携包只有「≤50,000,000 B」这一个门。

## 7. 发现（4 条）

### S1（P2）README 把校验文件名写死成 `0.32.1`，下版必过期

`README.md:126`：「安装包与便携 zip 的字节和 SHA256 见 Release 页的 `SHA256SUMS-0.32.1.txt`」。同文件 `README.md:13` 的下载段落用的是 `Sidelight-<版本>-…`，`packaging/README.md:58` 也用 `<版本>`；只有这一处写死版本。
证据：`Select-String README.md -Pattern '0\.32\.1'` 仅命中该行。
建议：改成 `SHA256SUMS-<版本>.txt`。

### S2（P2）同一版本的发布资产有三套字节，验收时容易拿错包

- `docs/iteration/STATE.md:74` 与 `:149`：`Sidelight-0.32.1-win-x64-setup.exe` **824,209 B**、zip **910,360 B**。
- 磁盘上 `release\Sidelight-0.32.1-win-x64-setup.exe` 实际 **824,595 B**（+386 B），zip 910,360 B（一致）。
- `v0.32.1` tag = `628ce71`，比 HEAD 落后 **39 commit**，tag 树里 **0** 个 mermaid 文件（HEAD 63 个）。当前源码重打是 **1,306,146 / 1,627,622 B**（Mermaid 的 63 个源文件把 dist 抬到 3.85 MB）。
证据：`git rev-parse --short v0.32.1`、`git rev-list --count v0.32.1..HEAD`、`git ls-tree -r v0.32.1 --name-only | Select-String mermaid`。
风险：维护者跑 `verify-installer.ps1` 默认拿 `release/` 里这份旧包，会得到「包与载荷不同批」的 UNVERIFIED；文档又同时写 824,209 与 1,300,711（STATE:55 第 39 轮实测），读者无法判断哪个是当前值。
建议：下一版发版前重打包，把本轮实测 bytes/SHA256 写进当轮报告并替换 STATE 的旧数字；在 STATE:74 注明「824,209 是未含 Mermaid 的 v0.32.1 旧构建」；`verify-installer.ps1` 默认取 mtime 最新的 setup（`-Setup` 已存在，只需把默认值改掉）。

### S3（P2）`host\bin\www` 陈旧没有门禁，直跑宿主会加载旧前端

本轮 `npm run build` 在 `00:59:49` 产出新 `dist`，但 `host\bin\www\index.html` 还是 `2026/11/17 23:36:34`（我跑 `host/build.ps1` 之前）。
证据：构建前后 `Get-ChildItem host\bin\www | Select Name,LastWriteTime` 对比 `dist`。
影响：`portable.ps1` / `installer.nsi` 都用 `..\dist\*`，包本身不受影响；但直接双击 `host\bin\Sidelight.exe`（或任何复用 `bin\www` 的脚本）会跑上一版前端，看起来像「修了没效果」，与 AGENTS 第 8 节「长开 CDP 会话跑中间版本」同类。
建议：`host/build.ps1` 末尾加一条新鲜度断言（`dist/index.html` 的 mtime 或主 chunk 文件名与 `bin\www` 不同就 `Write-Host` 警告并 exit 1），或让宿主直接读 `dist`；另外 `bin 合计 4,894,501 B` 含 `www`，而真正 payload 是 **1,024,862 B**，打印时分开写，避免被当成安装包载荷。

### S4（P2）`packaging/verify-portable.mjs` 停在第 2 轮，CI/文档 0 引用，且会覆盖历史截图

- `git log -- packaging/verify-portable.mjs` 只有 `6c9c2b0 round-02 …` 一条。
- 仓库内 `verify-portable` 在 `README.md`、`packaging/README.md`、`docs/*.md`、`.github/workflows/*.yml` 里 **0 命中**（`Select-String` 全仓扫）。
- 脚本写死 `const SHOTS = resolve('shots/round-02')`、`PORT = 9335`，注释还是「T4 验收：解压便携 zip…」，跑一次会覆盖 `shots/round-02/` 的历史证据（与 AGENTS 第 8 节 `keyboard-acceptance` 覆盖 `shots/round-05` 同一类坑）。
建议：要么删掉，要么改成当前目录约定（`shots/round-NN`、端口从 argv 取）、断言与 `portable.ps1` 的 staging 卫生断言同口径，再接进 `release.yml` 的 Windows job 或 `packaging/README.md` 的验收步骤。

## 8. 预算结论

- 首屏：294,373 B ≤ 310,000 B（内部）/ 320,000 B（硬线），余 15,627 / 25,627 B，PASS。
- 安装包：1,306,146 B ≤ 45,000,000 / 50,000,000 B，余 43,693,854 / 48,693,854 B，PASS。
- 便携 zip：1,627,622 B ≤ 50,000,000 B，PASS。
- 无 `.map`、无 `webview2-data`、无 `host.log`、无脚本混进包；两个产物都能通过 payload FileVersion 门。

## 9. UNVERIFIED（写清为什么、怎么补）

1. **打包产物的「首次启动 → 写 → 保存 → 重开」**：沙箱禁止 Chromium/WebView2 子进程，`host.log` 记 `INIT-FAIL … 0x8000FFFF`。补测：真机双击 `.tmp\portable\Sidelight\Sidelight.exe`，或 CI 的 `scripts/host-smoke.mjs`。
2. **安装（开始菜单、HKCU 卸载项、SmartScreen 首次运行提示、默认安装路径）**：安装器写 HKCU，本沙箱不可观测；且本轮角色要求不碰注册表，未安装。补测：真机 `verify-installer.ps1` 或人工安装（`packaging/README.md:12-24`）。
3. **安装后磁盘占用**：只有 `EstimatedSize=4764 KB`（由 payload 字节推出）；实际安装后目录大小未测。补测：真机装完 `Get-ChildItem $env:LOCALAPPDATA\Programs\Sidelight -Recurse | Measure Length -Sum`。
4. **启动联网**：只在 dev 页面观察到应用 0 条外部请求；打包产物窗口未起，未能用 CDP Network 观察宿主内流量。补测：真机启动后看 DevTools Network 或抓包。
5. **签名**：`Get-AuthenticodeSignature` 两个产物都是 `NotSigned`（符合预期，SmartScreen 会拦一次）；真人双击提示未验。
6. **macOS**：本轮未碰（本机是 Windows）。
7. **首屏 5 次截图/真实窗口尺寸下的启动时间**：未测，不属本轮门禁。
