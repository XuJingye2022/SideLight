# 第 38 轮 · finder-ship（安装、体积、启动与开源发布体验，只读）

- 轮前 startSha `bb52c6a23045042c18a08748547ef796f2e4890f` = 当前 HEAD，开工时 `git status --porcelain` 空。
- 只读产品代码：未改 `src/`、`packaging/`、`.github/`、`README.md`，未碰 `release/`，未 push。
- 本轮只跑一次 `npm run build`（独占，无并发）。另跑了一次 `npm test` 核 README 的断言条数（纯 node，不写产物）。
- 未跑 E2E：本角色只做构建/产物/文档核对，不需要浏览器，因此未占用 CDP 9224，也未执行 `reset.mjs 9224`。

## 一、实测数据

### 1. `npm run build`（`tsc --noEmit && vite build`）

EXIT=0，`✓ built in 485ms`，3243 modules transformed，新增告警 0 条。

### 2. 首屏 gzip（`node scripts/measure-first-screen.mjs`，EXIT=0）

```
   898853   280784  /assets/index-mqWiQKfF.js
      783      450  /assets/rolldown-runtime-vfrPO-fZ.js
    34404     7177  /assets/index-CMnePKFr.css
total raw=934040 gzip=288411 headroom=31589 files=3 max=320000
target=310000 gap=21589
PASS
```

288,411 B 与 `README.md:100` 写的数字逐字节一致；距内部预算 310,000 余 **21,589 B**，距硬线 320,000 余 **31,589 B**。

### 3. `dist` 构成（97 个文件，3,834,049 B = 3.66 MiB）

| 分组 | 文件数 | 字节 | 占 dist |
| :--- | ---: | ---: | ---: |
| 首屏集合（entry js + runtime + css） | 3 | 934,040 | 24.4% |
| KaTeX 惰性 loader（js + css） | 2 | 285,415 | 7.4% |
| KaTeX 字体（只发 woff2） | 15 | 213,664 | 5.6% |
| 其它 UI 小 chunk（12 个） | 12 | 43,746 | 1.1% |
| **Mermaid 家族（差值法）** | 65 | **2,357,184** | **61.5%** |
| 合计 | 97 | 3,834,049 | 100% |

主 chunk `index-mqWiQKfF.js` = **898,853 B raw / 280,784 B gzip**。Mermaid 里最大的三块：`cytoscape.esm-nTrd5EVq.js` 441,717 + `chunk-FPAJGGOC-jvnCsXAx.js` 361,226 + `architectureDiagram-VXUJARFQ-CGovr51a.js` 145,637 = 948,580 B。

### 4. `release/` 现状（只读，未改）

| 资产 | 本地 `release/` |
| :--- | ---: |
| `Sidelight-0.32.1-win-x64-setup.exe` | 824,595 B |
| `Sidelight-0.32.1-win-x64-portable.zip` | 910,360 B |
| `Sidelight-0.32.1-macos-universal.zip` | **无**（本机是 Windows，只在 CI `release.yml:127` 产出） |
| `SHA256SUMS-0.32.1.txt` | **无**（只有 `SHA256SUMS.txt`，内容是 0.26.0 两行，207 B） |

`release/` 里还有 0.27.0–0.32.0 共 21 个历史资产，`release/` 不被版本控制跟踪（`git ls-files release` 空）。

**已发布 zip 的内容对账**：0.32.1 portable zip 只有 **36 个条目 / 解压 2,513,216 B**，`www/assets/` 里**没有 `mermaidLoader` / `cytoscape` / 任何 diagram chunk**，入口是单个 `index-B3_OF1Ta.js`。当前 `dist` 是 97 个文件 / 3,834,049 B。即：**下载页的 0.32.1 早于第 36–37 轮**。

### 5. 下一个便携 zip 的字节（预测，本轮最关键的实测）

本角色不能跑 `packaging/portable.ps1`（它写 `release/`）。改用**逐项复刻**：staging 清单照 `portable.ps1:18-47`（host\bin 五件 + `sidelight.ico` + `README.txt` + `LICENSE` + `dist/*` → `www/`），压缩调用照 `portable.ps1:60-61`（`ZipFile::CreateFromDirectory($stage, $zip, Optimal, $true)`），产物写 `.tmp/r38-portable-probe.zip`。

```
stage=4,886,077 B   zip=1,621,142 B   entries=105
published 0.32.1 zip = 910,360 B   delta = +710,782 B (+78.1%)
threshold=2,000,000 B   margin=378,858 B (18.9%)
```

## 二、可用改进（5 条）

### S1 · P1 · 便携 zip 已吃掉硬线 81%，而它是唯一没有内部预算线的资产

**证据**：复刻实测 **1,621,142 B**（上节），已发布 910,360 B，**+710,782 B（+78.1%）**；`portable.ps1:16` 只有 `$threshold = 2000000`，超了才 `exit 1`，中间没有任何 WARN。同轮安装包口径文档给的是 1,299,777 B（`README.md:100`），占硬线 65.0%——**现在最紧的资产从安装包换成了便携 zip**（81.1% vs 65.0%）。`packaging/README.md:57` 自己写过触发条件：「Mermaid 落地后若 zip 逼近硬线再补实测口径」，这个条件本轮已成立。

**预期收益**：
- 补一条内部线 1,800,000 B（只 `Write-Warning`，与 `installer.ps1:88-92` 同形），让 zip 在 900 KB 到 2,000,000 B 之间不再静默。
- 给 `portable.ps1` 打印 `target=1800000 gap=`，与安装包输出同格式，人一眼比对。
- `README.md:100` 与 `packaging/README.md:57` 各补一句 zip 的实测字节（含 Mermaid 后 1,621,142 B），现在两处都只有安装包数字。

**最小改动**：`portable.ps1` 加 8 行（常量 + 打印 + WARN），文档改两句。零依赖、零字节成本。

**与第 37 轮 S1 的关系**：不重复。第 37 轮 S1 算的是**安装包**（1,297,630 预估）并建议砍 Mermaid 图类；本轮给出的是**便携 zip 的首个实测值**与「zip 已成约束」这个结论，以及 `portable.ps1` 缺 WARN 这处代码缺口。按第 37 轮 S1 只砍 `architecture-beta`（dist −668,546 B）后，zip 估落到约 1.46 MB，仍在硬线内但余量只剩 540 KB 量级，所以护栏仍值得补。

### S2 · P2 · 便携包有 172 行验收脚本，但没有任何门禁或文档调用它

**证据**：
- `packaging/verify-portable.mjs`（172 行，解压 → 条目断言 → spawn → CDP 断言 `.ProseMirror` / 控制台 0 错误 → 关窗进程 0）。`git grep verify-portable` 在 `package.json`、`.github/**`、`packaging/*.md` 里 **0 命中**，唯一引用在 `docs/iteration/round-02/` 的历史文档里。
- `ci.yml:99-100` 打了便携 zip，`ci.yml:108-112` 只上传 `Sidelight-*-win-x64-setup.exe`——zip 构建完就丢。
- `packaging/README.md:35-44` 的「构建与验收」只列 `installer.ps1` 与 `verify-installer.ps1`，没提这个脚本。
- 另一个坑：`verify-portable.mjs:13` 把截图写到 `shots/round-02`，该目录**已被 git 跟踪**（`git ls-files shots/round-02` 有 `doc-100k.png` 等）。谁跑它都会脏工作树，与 `scripts/keyboard-acceptance.mjs` 覆盖 `shots/round-05` 是同一类事故。

**预期收益**：便携包「解压后能不能起、控制台有没有错」目前没有任何自动检查，只能靠人。补 `npm run verify:portable` + 在 `ci.yml` 的 `windows-host` 里 `portable.ps1` 之后加一步（或至少写进 `packaging/README.md:35-44`），下一次缺 `Sidelight.exe.config`、缺 `www/index.html` 的回归会在 CI 拦住。顺手把 `SHOTS` 改成 `.tmp/shots`，去掉覆盖历史证据的风险。

### S3 · P2 · README 的「下载」节没写 Windows 的第一道坎：需要 WebView2，且未签名

**证据**：`README.md:9-24` 的下载节写了 macOS 的七条首次打开步骤（第 16–24 行，含 Gatekeeper、`xattr`、SHA256 对照），Windows 只有两行（第 13 行：包名与安装位置）。而 Windows 真正的两道坎写在别处：
- 需要 Microsoft WebView2 运行时，**没有则安装器直接中止**（`packaging/README.md:18`、`packaging/README.txt:19-20`）；
- exe 未签名，首次运行会被 SmartScreen 拦一次（`packaging/README.md:13`、`README.md:71`）。

读者按 `README.md:13` 下载完，遇到「安装器弹提示就退出」或「Windows 已保护你的电脑」时，得先翻到第 71 行再点进 `packaging/README.md`。

**预期收益**：下载节补两条（每条约一行）：Windows 11 自带 WebView2、没有时安装器会给链接并中止；exe 未签名，SmartScreen 点「更多信息 → 仍要运行」。这与 macOS 的待遇对齐，减少「装完打不开」的反馈。安装步骤本身没有可删的一步（未签名 → SmartScreen 必经），差距在「提前说」。

### S4 · P2 · README 描述的是 HEAD，下载页给的是 0.32.1；两处没说清差了几轮

**证据**：
- 下载页最新是 0.32.1（`release/` 与第 37 轮 GitHub API 实测的 4 资产），其 zip 内容已对账：**无 Mermaid、无表格列宽拖拽**（第 5 节）。
- `README.md:52`「Mermaid 图表：正文里的 ```mermaid 围栏会…（第 36 轮）」、`:77`、`:108` 都把它写成现有能力，`:100` 写「第 37 轮加表格列宽拖拽」，但下载节（`:9-24`）没有一句「这些在 0.32.1 之后的构建里」。
- `docs/CHANGELOG.md:5` 是 `## Unreleased（第 29–37 轮，未发版）`：**9 轮未发版**。按 `common.md`「多数轮不发版」这是计划内的，但计划内不等于下载页不误导。
- 同段还有一处数字过期：`README.md:102`「主 chunk 898,601 B，2026-11-17 第 36 轮实测」，本轮实测 **898,853 B**（`index-mqWiQKfF.js`）；`:100` 的 288,411 B 是对的。

**预期收益**：下载节加一句「页面描述包含尚未发版的能力（第 36–37 轮），对应版本见 CHANGELOG 的 Unreleased」，并把 `:102` 的 898,601 改成 898,853（或改成「随构建变化，实测见 `npm run verify` 输出」少一个手抄数字）。避免用户下载后按 README 找 Mermaid 找不到，误判成解压/安装出错。

### S5 · P2 · 三条旧账本轮仍在（不展开，只记账）

1. **`installer.ps1:35` 的 NSIS 源与 CI 不同源、不验哈希**（第 14/18/31/32/34 轮已报，**第 5 次**）：本地走 `prdownloads.sourceforge.net`，正是 `ci.yml:83-87` 注释写「会返回反爬 HTML」的那条直链；CI 走仓库 Release 的 `build-tools-nsis-3.11.zip` 并校验 `NSIS_SHA256`（`ci.yml:25`）。本机 `.tmp/nsis` 有缓存所以没暴露；干净 checkout 上 `installer.ps1` 会拿 HTML 去 `Expand-Archive` 而失败。
2. **`release/SHA256SUMS.txt` 停在 0.26.0**（连续第 7 轮）：207 B 两行，`release/` 里最老的包已是 0.27.0，两份被它记录的资产都不存在了。
3. **CI 三处各自 `npm ci` + `npm run build`**（第 37 轮 S4 已报）：`ci.yml:37-38`、`:57-58`、`:127-128`。

三条都只需要一次小改，但都要改 CI 或 release 流程，不属于本角色的只读范围，留给决定的人。

## 三、核查通过、无改进的部分

- **`packaging/*.ps1` 的体积线与 `packaging/README.md` 一致**：`installer.ps1:88-92` 内部预算 1,800,000 B 只 `Write-Warning`；`:117-129` 硬线 2,000,000 B 超了打印前 12 个载荷并 `exit 1`；`verify-installer.ps1:47-52` 同两条线（超内部线 WARN、超硬线 Fail）；`portable.ps1:16` `$threshold = 2000000`，与 `packaging/README.md:57`「与安装包共用硬线、不另设内部预算」一致（本轮 S1 是建议改这一条）。
- **安装步骤与 `installer.nsi` 一致**：`installer.nsi:26-29` per-user 安装目录、`RequestExecutionLevel user`、`/SOLID lzma`；`:137-146` 写 HKCU 卸载项 7 值（DisplayName / DisplayVersion / Publisher / DisplayIcon / InstallLocation / UninstallString / EstimatedSize / NoModify / NoRepair），与 `packaging/README.md:8`、`verify-installer.ps1:162` 的 7 值断言吻合；`:151` 关联是 `Section /o`（默认不选），与 `README.md:15`、`packaging/README.md:15` 一致。安装/卸载流程没有可少的一步。
- **启动不联网、无常驻**：
  - `dist/index.html` 全文 36 行，无外部 URL、无 `preconnect`/`dns-prefetch`，favicon 是内联 `data:` SVG；只有一个内联脚本读 `localStorage` 写 `data-theme`。
  - `host/Program.cs` 里 `HttpClient` / `WebRequest` / `WebClient` **0 命中**，`http://` 只有两处且都是 `http://127.0.0.1:<port>/index.html`（`:603`、`:1519`）。
  - `installer.nsi` 里 `Run` / `RunOnce` / `Startup` 键 **0 命中**；所有注册表写入都在 `HKCU\Software\Sidelight`、`HKCU\Software\Classes*`、`UNINST_KEY` 内。
  - `src/` 里唯一的外部 URL 是 `search.ts:23,31,38` 与 `settings.ts:33` 的三个搜索/接口地址，只在用户点「联网核对」并配好 key 时用（BYO key 与 ADR-0002 一致）。
- **依赖无可删项**：`@types/node` 被 `tsconfig.json:14` 的 `types: ["vite/client", "node"]` 引用，删了 `tsc` 会变红；`playwright-core` 只在 `scripts/` 与 `packaging/verify-portable.mjs` 用，已是 devDependency，不进包。`.nvmrc` = 24 与 `package.json` 的 `engines: >=24` 一致，CI 用 `node-version-file: .nvmrc`。
- **测试条数**：`npm test` EXIT=0，**23 个文件 / 301 条 pass / 0 fail**，与 `README.md:119` 的「23 个文件、301 条断言」和 `AGENTS.md` §3 一致。
- **首屏预算口径**：角色文件里的「286,000 B 预算」已作废（与第 37 轮 S2 同结论）；现行口径是 `scripts/measure-first-screen.mjs:19-20` 的 `max=320000` / `target=310000`，与 `README.md:100`、`common.md:30` 一致。本轮按现行口径 PASS。

## 四、UNVERIFIED

1. **便携 zip 的 1,621,142 B 是预测值，不是 `portable.ps1` 实跑值**。原因：该脚本写 `release/`，本轮角色禁止。方法：staging 清单照 `portable.ps1:18-47` 逐项复刻（105 个条目 = 8 个固定文件 + 97 个 dist 文件），压缩调用照 `:60-61` 的同一个 .NET API 与参数，产物在 `.tmp/r38-portable-probe.zip`。补测：下轮非只读角色跑 `powershell -ExecutionPolicy Bypass -File packaging\portable.ps1`，比 `zip=` 行的字节。
2. **安装包在 Mermaid 之后的字节未实测**，沿用 `README.md:100` 记的 `installer.ps1 -AssocDryRun` 1,299,777 B（同样因为写 `release/` 被禁止）。
3. **macOS 资产未复核**：本机 Windows，`release/` 无 macOS zip，只在 CI 编译；本轮未调用 GitHub API 复验 Release 资产（第 37 轮已验过 4 资产齐全）。
4. **未跑 E2E / 未占 CDP 9224**：本轮不需要浏览器；「新 dist 在宿主里能起」由 `tsc` + `vite build` 与 `host/bin` 的既有产物覆盖，未做窗口验证。

## 五、本轮产物与清理

- `.tmp/build-r38-ship.log`：`npm run build` 完整输出。
- `.tmp/r38-portable-probe.zip`：S1 的预测证据（1,621,142 B）。staging 目录 `.tmp/r38-portable-probe/` 已删除，zip 保留以便复核字节。
- `git status --porcelain` 收尾应为空（`dist/`、`.tmp/` 均被忽略）；本报告是唯一新增的跟踪文件。
