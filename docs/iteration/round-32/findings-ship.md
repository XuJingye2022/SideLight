# 第 32 轮侦察 · 安装、体积、启动与开源发布（finder-ship）

只读。未改产品代码、未改 `release/`、未装系统级软件、未改注册表。
实测时间 2026-11-17 02:05–02:35，仓库 `D:\Documents\SidelightProgram`，HEAD `d47d482`，`package.json` 0.32.1。

## 0. 本轮实跑的门与数字

| 项 | 命令 | 结果 |
| :--- | :--- | :--- |
| 构建 | `npm run build` | PASS，`tsc --noEmit` 无输出；132 modules；主 chunk `index-BARs10TG.js` 893.34 kB（gzip 281.09 kB） |
| 首屏预算 | `node scripts/measure-first-screen.mjs` | **PASS，gzip 284,761 B / 上限 286,000 B，余 1,239 B**（raw 927,127 B，2 个文件） |
| dist | `Get-ChildItem -Recurse dist` | 31 个文件 **1,468,390 B** |
| 宿主产物 | `host/bin` 五件 | **1,041,763 B**（含 703,328 B Core.dll；另有 15,316 B `host.log`、1,567 B `host.log.bad`、18 B `host.log.migrated` 残留） |
| 已发布资产 | GitHub Release v0.32.1 | setup **824,209 B**（sha256 `5f0418ff…`）、portable zip **910,360 B**（`3c4a3a58…`）、macOS zip **905,892 B**（`2f838b77…`）、`SHA256SUMS-0.32.1.txt` 308 B |

dist 构成：JS 13 个 1,192,820 B · CSS 2 个 60,411 B · **woff2 字体 15 个 213,664 B** · index.html 1,495 B。
可压缩性实测（`Compress-Archive`）：JS 1,192,820 → **372,705 B**（压掉 68.8%）；woff2 213,664 → **215,971 B**（压不动，反而变大）。安装包 824,595 B / 载荷 2,510,153 B ≈ 32.9%，与 JS 压缩率吻合 → 字体近似原样进了安装包。

启动路径（只读核查，结论「启动不联网、无常驻」）：`src/` 只有 2 处 `https://` 字面量，都是输入框 placeholder（`src/components/LinkEditor.tsx:83`、`src/components/SettingsDialog.tsx:87`）；`src/` 里没有 `setInterval` / `requestIdleCallback` / `new Worker`；`index.html` 无外部 preconnect/CDN，图标是内联 data URI；字体与 KaTeX 全部本地产物。宿主起 `127.0.0.1` 回环（`host/Program.cs:1466`），`AreBrowserAcceleratorKeysEnabled = false` 仍在（`host/Program.cs:1491`）。

## 1. 首屏只剩 1,239 B，且构建不预警 · P1 · 体积回归风险

**证据**
- `node scripts/measure-first-screen.mjs`：`total raw=927127 gzip=284761 files=2 max=286000` → 余量 **1,239 B（0.43%）**。
- `vite.config.ts:39` `chunkSizeWarningLimit: 1200`，实测最大 chunk 893,343 B → 阈值比实测高 **307 KB**，涨到 1.2 MB 之前 `npm run build` 一个字都不说。
- `vite.config.ts:32-38` 注释里的数字过期：写「主 chunk 约 840 KB」「主 chunk 约 1.10 MB（第 05 轮实测 1,100–1,104 kB）」，实测 893,343 B；`README.md:99` 又写「主 chunk 892,443 B」（第 31 轮数字，本轮 893,343 B）。

**预期收益**：把 `chunkSizeWarningLimit` 改成 950（保住 57 KB 缓冲），任何一次加依赖/加静态 import 都在 `npm run build` 那一步现形，不用等 measure 脚本兜。注释三处统一成实测数字，避免下一个人拿 1.10 MB 当基线。

## 2. 本地打包脚本的 NSIS 下载源与 CI 不一致，且不验哈希 · P1 · 安装步骤更少

**证据**
- `packaging/installer.ps1:35` 仍从 `https://prdownloads.sourceforge.net/nsis/nsis-3.11.zip` 下载；全文（127 行）没有 `Get-FileHash`，唯一的哈希是产物哈希（`:107`）。
- `ci.yml:83-87` 已经踩过并绕开：「SourceForge 直链会返回反爬 HTML；改用本仓库 Release 固定资产」，从 `releases/download/v0.26.0/build-tools-nsis-3.11.zip` 取并校验 `NSIS_SHA256`（`ci.yml:25`）。
- 后果：新贡献者第一次 `powershell -File packaging\installer.ps1` 可能拿到一个 HTML 页，`Expand-Archive` 报的是解压错误，不是「下载源被反爬」。CI 与本地走两条路，也让人误以为本地已验证。

**预期收益**：本地脚本改成与 CI 同源、同哈希（`C7D27F78…`），失败给一句人话（「下到的是 HTML，换 Release 固定资产」）。新贡献者少一次卡壳，供应链字节固定。

## 3. `packaging/README.md` 的门槛描述与脚本实际行为不符 · P2 · 文档不一致

**证据**
- `packaging/README.md:42` 说 `installer.ps1`「打印实测字节、`P + 10,000` 门槛、硬报警线 850,000 B」；`packaging/installer.ps1:88-89` 实际只有「内部预算 820,000 B，只打印 gap」，`:114-126` 才是 >850,000 打印载荷占比并 `exit 1`。**代码里已没有 `P + 10,000` 这条门**。
- `packaging/README.md:57` 体积数字停在「0.22.0 实测 808,897 B（余量 41,103 B）」，而 0.32.1 已发 824,209 B（超内部预算 4,209 B，距硬线余 25,791 B，见 `README.md:97`）。
- `README.md:97` 与 `README.md:108` 各写一次预算，数字一致；但 `packaging/README.md` 只提 850,000，没提 820,000 → 三份文档两套口径。

**预期收益**：`packaging/README.md` 换成当前实测（824,209 B / 内部 820,000 / 硬线 850,000 / 余 25,791 B），删掉 P+10,000 的描述。发版人不用猜哪个数字才是门。

## 4. `release/` 里的 0.32.1 不是发布出去的字节，本地无记录可分辨 · P2 · 发布可追溯性

**证据**
- 发布页：setup sha256 `5f0418ff7965a45f4eec5a0e233699c638b4a8606bd7346a08af56729798d734`、805 KB；zip `3c4a3a58…`、889 KB。
- 本地：`release/Sidelight-0.32.1-win-x64-setup.exe` sha256 `6c93f58f…`、**824,595 B**；`release/Sidelight-0.32.1-win-x64-portable.zip` sha256 `f4210c62…`、910,360 B。**同名、zip 同大小，但两份哈希都与发布页不同** → `release/` 里是重建件，不是发布件。
- `release/SHA256SUMS.txt` 还是 **0.26.0** 的两条（`release/SHA256SUMS.txt:1-2`），没有 0.32.1 的本地校验和。
- 本地没有 macOS zip（只有 CI 产出），即本地无法核对三件资产。
- `packaging/installer.ps1:107-111` 只把 SHA256 打到屏幕，不落文件；`release.yml:220-224` 的 `SHA256SUMS-<version>.txt` 只在 CI 侧生成。

**预期收益**：`installer.ps1` / `portable.ps1` 收尾把 `<sha256>  <文件名>` 写进 `release/SHA256SUMS-<version>.txt`（格式与 CI 相同），并删掉根目录过期的 `SHA256SUMS.txt`；`README.md` 的「依赖与体积」加一句「本机重建件与 Release 页字节不同属正常，核对以 Release 页 `SHA256SUMS-<版本>.txt` 为准」。这样「发出去的是哪一版字节」可核，同名同大小错版上传（0.32.1 zip 已经出现）能被发现。

## 5. KaTeX 字体 213,664 B 是安装包里压不掉的 26% · P2 · 包更小

**证据**
- dist 里 15 个 woff2 共 213,664 B（与 `README.md:97` 记的 213,664 B 一致）；zip 后 215,971 B → **woff2 不可再压**。
- 安装包 824,595 B，载荷压缩率 32.9%（JS 1,192,820 → 372,705）→ 字体近似原样贡献约 213 KB，占安装包 **约 26%**。
- 现状文档只写了字体字节数，没写它是安装包死重，也没写「下一个体积目标只能从这里出」。

**预期收益**：给下一轮一个明确取舍：若要再压包，唯一大杠杆是字体子集化（15 个 face 裁到实际用到的字形，粗估省 80–120 KB），风险是生僻符号回退字体；不动就把这条写进 ADR / README 当已知上限。别再去动 JS —— 首屏 284,761 B 只剩 1,239 B，动 JS 是负收益。

## 6. CI 从未跑过 `npm run roundtrip`，而它是 AGENTS §3 的必过门 · P2 · 回归风险

**证据**
- `ci.yml:41-42` 把 `# - run: npm run roundtrip` 注释掉，理由写的是「改动编辑器或 Markdown 序列化时再开这一行」——靠人记得。
- `release.yml` 三个构建 job 都没有 roundtrip（`windows-build` 只跑 `npm test` + measure，`:81-82`）。
- `package.json:15` 有 `roundtrip` 脚本，`scripts/roundtrip.mjs` 引 `@tiptap/markdown` + fixtures，产物写 `docs/roundtrip-report.md`。

**预期收益**：gate job 打开这一行（或按 path filter 只在 `src/lib/**` 与编辑器文件变动时跑）。序列化回归由 CI 兜底，不靠发版人记性。
**未测**：roundtrip 的实际耗时没量（本轮只读，跑它会写 `docs/roundtrip-report.md`）。开 CI 前先计时一次，超过 gate 的 15 分钟预算就改成 path filter。

## 7. 核对过但没有问题的项（避免下一轮重复劳动）

- `package.json` 依赖：14 个运行时 + 6 个开发期，逐个在 `src/` 找到直接引用（`@tiptap/pm` 走深路径 `@tiptap/pm/state|view|model`，6 处），**没有可删的依赖**。`playwright-core` 只用于 `scripts/*.mjs`，留在 devDependencies 正确。
- 便携 zip 卫生：`packaging/portable.ps1:48-52` 的三条断言（`webview2-data`/`host.log`/`*.ps1`）有效；0.32.1 已发布的 zip 解开 36 个条目，**没有日志、没有脚本**，`README.txt` 与 `LICENSE` 在内。
- `.gitignore` 覆盖 `dist`、`release/`、`host/bin/`、`*.log`、`.tmp/`；`git ls-files dist` 为 0，产物没进版本控制。`package-lock.json` 已跟踪、`lockfileVersion: 3`，符合 `npm ci` 要求；`.nvmrc` = 24 与 `engines.node >=24` 一致。
- 安装包 payload 白名单（`installer.ps1:10-16`）不含 `host.log`，`host/bin` 里的 15 KB 日志残留不会进包。
- CI 不是明显冗余：三个 job 各自需要自己 OS 上的 `dist`；`install-verify` 仍只手动触发并有 `if:` 守住；`release.yml` 与 `ci.yml` 有重复步骤但可接受（发版路径要能独立跑）。

## 8. UNVERIFIED（本轮测不到的）

1. **安装包真实体积与内容**：没有重打 0.32.1 安装包（会写 `release/`，本轮只读），也未在真机装。安装包构成按载荷压缩率推算，不是从 NSIS 解包读的。
2. **`host/bin` 缺 `Sidelight.exe` 重新编译验证**：`host/build.ps1` 需要 WebView2 SDK 与 csc；本轮只读现有 `host/bin`（含 `host.log` 残留，时间戳未核）。
3. **macOS zip**：本机是 Windows，无本地产物；发布页字节来自 GitHub Release 页面，未下载校验。
4. **roundtrip 耗时**：见第 6 条。
5. **冷启动／FCP**：本轮不启动浏览器与宿主，未复测 304 ms 这个单点数字。
