# 第 35 轮 · 安装、体积、启动与开源发布体验（finder-ship，只读）

时间：2026-11-17。HEAD `e64c2fce`（= 轮前 startSha，`git log --oneline -1`），构建时 `git status --short` 只有 `?? shots/round-35/`，**产品代码零改动** → 本报告数字是「本轮任何改动之前」的基线。只读 `release/`，未安装任何系统级软件、未碰注册表、未 push。

## 一、本轮实测

### 1. 门禁

```
npm run build  → tsc --noEmit OK + vite build OK（vite 8.3.8，133 modules，243ms，exit 0）
                 dist/index.html 1.49 kB │ gzip 0.93 kB
                 dist/assets/index-O0GdPjrm.js 896.22 kB │ gzip 282.28 kB
                 dist/assets/katexLoader-CNO5m-uY.js 258.78 kB │ gzip 77.66 kB（惰性）
```

### 2. 首屏 gzip 预算

```
$ node scripts/measure-first-screen.mjs
   896224   278909  /assets/index-O0GdPjrm.js
    33784     7028  /assets/index-BLxN31Mr.css
total raw=930008 gzip=285937 headroom=63 files=2 max=286000
PASS
```

285,937 B ≤ 286,000 B，**余 63 B**；与 `README.md:99`、`docs/iteration/STATE.md:52` 一致。首屏集合仍是 2 个文件，`katex`/`lazy` 排除断言仍生效（`scripts/measure-first-screen.mjs:59-67`）。但集合**不含入口 HTML**，见发现 F1。

### 3. dist 体积与构成（31 个文件，1,471,881 B）

| 类别 | 文件数 | 字节 |
| :--- | ---: | ---: |
| `.js` | 13 | 1,196,311 |
| `.woff2`（KaTeX） | 15 | 213,664 |
| `.css` | 2 | 60,411 |
| `.html` | 1 | 1,495 |

- 主 chunk `index-O0GdPjrm.js` 896,224 B（raw），gzip 278,909；`katexLoader` 258,788 B 惰性。
- 15 个字体里最大 4 个：AMS-Regular 28,076、Main-Regular 26,272、Main-Bold 25,324、Main-Italic 16,988。
- 安装器载荷 = `host/bin` 五件 1,024,862 B（Core.dll 703,328 / WebView2Loader.dll 194,912 / Sidelight.exe 87,040 / WinForms.dll 38,792 / config 790）+ dist 1,471,881 = **2,496,743 B**，`EstimatedSize` ≈ 2,438 KB（`packaging/installer.ps1:44-50`）。

### 4. `release/` 里的 0.32.1 资产（只读，未改）

| 资产 | 本地 `release/` | GitHub Release（API 实测） | 一致 |
| :--- | ---: | ---: | :--- |
| `...-win-x64-setup.exe` | 824,595 | 824,209（sha `5f0418ff…`） | 本地 +386 B（NSIS 不可复现，上轮已登记） |
| `...-win-x64-portable.zip` | 910,360 | 910,360（sha `3c4a3a58…`） | 一致 |
| `...-macos-universal.zip` | **无**（本机 Windows） | 905,892（sha `2f838b77…`） | 无法本地比对 |
| `SHA256SUMS-0.32.1.txt` | 无 | 308 B | — |

发布页数据：`https://api.github.com/repos/XuJingye2022/SideLight/releases/latest`（tag `v0.32.1`，published 2026-11-16T14:28:48Z）。

预算对照：安装包硬线 850,000 B → 本地余 **25,405 B**、发布件余 25,791 B；内部预算 820,000 B **已超**（本地 +4,595 / 发布 +4,209）。便携 zip 门槛 940,000 B（`packaging/portable.ps1:15`）→ 余 **29,640 B**。

### 5. `packaging/*.ps1` 与 `packaging/README.md`

- 安装步骤（`packaging/README.md:10-18`）与脚本行为一致：per-user、装到 `%LOCALAPPDATA%\Programs\Sidelight`、组件页 opt-in 默认不勾、缺 WebView2 时 `Abort` 并给下载链接。
- 载荷卫生成立：`installer.nsi:122-131` 只 `File` 五件 + `dist\*`；`portable.ps1:48-52` 拒绝 `webview2-data`/`host.log`/`*.ps1`。
- `verify-installer.ps1` 的断言确实存在（7 值 HKCU `:150-153`、文件版本 `:137-140`、`--version` `:141-144`、运行中卸载拒绝 `:120-130`、关联静态断言 `:188-199`）。
- 仍不准的三处见「五、上轮复核」S4。

### 6. 依赖是否可减

13 个运行时依赖逐个核对 import 命中（`src/App.tsx:2-15`、`src/lib/*.ts`）：`@tiptap/core`、`starter-kit`、`markdown`、`react`、`extension-image/mathematics/strike/table/task-item/task-list`、`@tiptap/pm`、`react-dom`、`katex`（只经 `src/lib/katexLazy.ts` 动态加载）全部在用；`@tiptap/extension-strike` 不冗余（`src/App.tsx:115,734` 用它 extend 快捷键并关掉 StarterKit 自带的）。devDependencies 里 `playwright-core`（脚本）、`@types/*`、`vite`/`typescript`/`@vitejs/plugin-react` 均被构建或脚本使用。**结论：运行时依赖无可减项**。

### 7. 启动路径：不联网、无常驻

- `dist/index.html` 只有两处本地 `assets/` 引用 + 内联底色样式 + 同步读 localStorage 的主题脚本，**无外链资源**（favicon 是 data URI）。
- 外网请求只有两处，都由用户动作触发：`src/lib/ai.ts:91`、`src/lib/search.ts:114`。`setInterval`/`EventSource`/`WebSocket` 在 `src` 0 命中。
- 启动时的 `fetch` 全是宿主回环（非外网）：`App.tsx:1167 /__doc`、`:1252 /__annotations`、`:1269 /__draft`、`:2875 /__recent`。
- 宿主 `host/Program.cs` 无 `HttpClient`、无 `gzip`/`Content-Encoding`（`Select-String` 0 命中）→ 没有更新检查，也没有后台压缩服务。
- **结论：启动不联网、无后台常驻；桌面首屏走回环读盘、不加压**（这条也让 F1 的口径问题更清楚）。

### 8. CI 覆盖面

`ci.yml` 四 job（gate / windows-host / macos-host / install-verify 手动），`release.yml` 四 job。真实断言都在：gate 的 build+measure+test、windows-host 的宿主编译+冒烟+两个包、macos-host 的 Universal+6 项 self-test、release 的 tag/CHANGELOG/FileVersion 断言与 3 资产校验。问题只有「只产不用」两处与 install-verify 的实现，见 F2、F3。

## 二、发现

### F1（P2）首屏预算只量 JS+CSS，漏掉入口 HTML；宿主又不发 gzip，所以「285,937 B / 余 63 B」不是首屏真实字节

**证据**
- `scripts/measure-first-screen.mjs:26-37` 只收集 `<script src>` 与 `<link rel=stylesheet|modulepreload|preload>`，`dist/index.html` 本身不在集合里。
- 实测 `dist/index.html` raw **1,495 B**、gzip level 9 **927 B**（`node -e "z.gzipSync(fs.readFileSync('dist/index.html'),{level:9}).length"`）。
- 宿主 `host/Program.cs` 没有 `Content-Encoding`/gzip → WebView2 从 `127.0.0.1:47821` 取到的是未压缩字节，实际首屏传输 = 930,008 + 1,495 = **931,503 B**。
- 若按同一 gzip 口径把入口文档补进集合：285,937 + 927 = **286,864 B**，**超 286,000 B 上限 864 B**（脚本仍报 PASS）。
- `AGENTS.md` §4 与 `README.md:99` 都把这 286,000 B 写成「首屏 gzip」，读的人会以为还余 63 B。

**建议**（二选一，改动量都是几行）
- A（不改预算，零风险）：把 `measure-first-screen.mjs` 头注释、`README.md:99`、`AGENTS.md` §4 的措辞统一成「首屏 JS+CSS gzip」，并在 README 该行补一句「另有入口 `index.html` 927 B（宿主不加压，实际首屏传输 931,503 B）」。
- B（口径统一）：把 `index.html` 加进集合，`--max` 默认值调到 **287,000**（余 136 B）。这动的是对外记录的预算数字，需根代理定。

**预期收益**：下一轮加功能时不会把「余 63 B」当可支配余量（第 33 轮一次改动就吃掉 839 B）；体积判断从「代码重量」和「真实传输」两种数字里各取所需，不再互相误读。

### F2（P2）CI 里有两处「只产不用」：macOS artifact 没有任何消费者，Checksums 步骤打印的哈希没人比对

**证据**
- `.github/workflows/ci.yml:139-143` 每次 push/PR 都上传 artifact `Sidelight-macos`（约 905,892 B，retention 90 天）。全仓库搜 `Sidelight-macos` **只命中 `ci.yml:142`**；`release.yml:185-190` 的 macos-build 自己产出并上传 `macos-zip` 供 release job 用 → CI 这份没有任何下载方。
- `.github/workflows/ci.yml:102-106` 的 `Checksums` 只打印 setup 的 SHA256：`install-verify` 不比对，发布也没用它，同时**便携 zip 的哈希根本不打印**。

**建议**：删掉 macOS 上传 step（或加 `if: github.event_name == 'workflow_dispatch'`）；`Checksums` 要么删，要么对 setup + portable 都算哈希并 `upload-artifact` 成一份清单。

**预期收益**：每次 push/PR 少一次 ~0.9 MB 上传与一份无用产物；CI 日志里不再有「打印了但没人用」的哈希。

### F3（P2）`install-verify` 用 ShellExecute 启动安装器，和项目自己踩过的坑相反；断言只有 4 条，远少于 `verify-installer.ps1`

**证据**
- `ci.yml:166`：`$p = Start-Process $setup -ArgumentList '/S' -PassThru -Wait` —— 没带 `-NoNewWindow`/`-RedirectStandard*`，默认 `UseShellExecute = true`。
- `packaging/verify-installer.ps1:8-17` 的注释正好写的是反例：「某些环境会给未签名 exe 弹『打开文件 - 安全警告』，静默安装会被这个模态框卡住。CreateProcess 路径不触发 Attachment Manager」，函数用 `ProcessStartInfo{UseShellExecute=false}`。
- 覆盖面对比：CI 只断言默认路径 exe、HKCU 键**存在**、开始菜单 lnk、用户数据保留（`ci.yml:169-185`）；本地脚本还断言 HKCU **7 值 + DisplayVersion**、`exe` 文件版本、`--version`、运行中卸载被拒绝、关联静态断言（`verify-installer.ps1:120-155,188-199`）。

**建议**：CI 的安装步骤改成 `& $setup /S`（不经 ShellExecute）或复用 `Start-NoShell`；断言补 FileVersion 与 7 值。更彻底的做法是给 `verify-installer.ps1` 加 `-DefaultPath` 开关，让 CI 直接调它，只保留一份验收实现。

**预期收益**：手动触发的验收不会因为一个模态框挂到 20 分钟超时；两处口径一致后，`packaging/README.md:49` 那三个 UNVERIFIED 才真的被 CI 替掉。

### F4（P2）五件宿主载荷在四处各写一遍，加或改名一个宿主文件要改四处

**证据**：`packaging/installer.ps1:10-16`（`$payloadNames`）、`packaging/portable.ps1:17-23`（`$required`）、`packaging/installer.nsi:122-126`（五条 `File`）、`packaging/verify-installer.ps1:72`（安装目录文件断言）。

**建议**：抽一份 `packaging/payload.json`（或 `packaging/payload.ps1` 里的单一数组），`installer.ps1` 读它生成 `/D` 定义传给 nsi（或用它做前置校验），`portable.ps1`/`verify-installer.ps1` 读同一份。

**预期收益**：漏改的失败模式消失——现在漏改 portable 只会「便携包少一个 dll，安装包正常」，漏改 verify 会误报 PASS；改成单一来源后这类偏斜不可能发生。

### F5（P2）`release/` 的本地资产无法自证「哪个是发布件」：23 个资产里校验和文件只写 0.26.0，macOS 资产本地没有

**证据**
- `release/SHA256SUMS.txt` 只有 2 行，都是 `Sidelight-0.26.0-*`（207 B）；同目录实际有 0.27.0–0.32.1 共 **23 个文件**。
- 同名 setup：本地 824,595 B / 发布 824,209 B（差 386 B）；portable 两边都是 910,360 B 但哈希不同。README 让用户拿 `SHA256SUMS-<版本>.txt` 校验，本地重打包后必然对不上（上轮 S4 已登记「没有提醒」）。
- 本地没有 `Sidelight-0.32.1-macos-universal.zip`，macOS 资产只能看 API（905,892 B / `2f838b77…`）。

**建议**：`installer.ps1`/`portable.ps1` 出包后刷新 `release/SHA256SUMS-local.txt`（时间戳 + 当前全部资产的字节与哈希），`packaging/README.md` 加一句「发布校验和只对 CI 产物有效；本地重建字节不同，不要覆盖 Release 资产」。

**预期收益**：本地人能一眼分清「重建件」和「发布件」；校验和核对不会再被本地产物带偏。

## 三、文档数字抽查（一致，不单列发现）

- 首屏 `README.md:99` 285,937 / 余 63 → 与本次实测一致。
- 测试 `README.md:117`、`AGENTS.md:39`、`STATE.md:52` 都是「22 文件 287 条」→ 互相一致。
- 安装包 `README.md:99` 824,209 B → 与 GitHub API 一致（本地重建 824,595 是对照，不写进对外数字这一点是对的）。
- 小项（一行可改）：`vite.config.ts:32` 与 `:35` 把同一句「主 chunk 894,163 B（第 32 轮实测）」重复写了两遍，实测已是 **896,224 B**；`:38` 的 `chunkSizeWarningLimit: 950` 余量注释「约 56 kB」实为 **53,776 B**。

## 四、UNVERIFIED

1. **macOS zip 的本地字节与内容**：本机 Windows、`release/` 无该资产；只有 API 的 905,892 B / sha256 `2f838b77…`。架构断言只在 CI 跑过，未解包核对。
2. **真实安装**（HKCU 7 值、开始菜单、SmartScreen、真人双击）：按角色约束不做系统级安装、不碰注册表，沿用既有 UNVERIFIED。
3. **本轮没有新的 setup / portable 产物**：不重打包（会写 `release/`），安装包与便携包数字来自已存在资产与 API。
4. **F2/F3 的 CI 收益是静态推断**：不 push，未跑流水线。
5. 未跑 `npm test`、`npm run roundtrip`、`scripts/acceptance.mjs`（角色只要求 build + measure）。

## 五、上轮（round-34）6 条复核

| 上轮 | 现状 | 证据 |
| :--- | :--- | :--- |
| S1 STATE 数字落后 | **已修** | `STATE.md:52` 已写 285,937 / 余 63 / 22 文件 287；`measure-first-screen.mjs:56` 已打印 `headroom=` |
| S2 体积门不在本地门禁 | **已修** | `package.json:13` 已有 `verify`（build + measure）；`AGENTS.md` §3 已区分 build 与 verify |
| S3 `typora-gap.md` 6 项错列 | **未修** | 仍是 21 有 / 18 缺（`README.md:81`、`AGENTS.md` §6） |
| S4 packaging 文档/NSIS 来源 | **未修** | `packaging/README.md:57` 仍写 0.22.0 808,897 B；`installer.ps1:35` 仍走 SourceForge 直链且不校验哈希；CI 用的是 pinned `build-tools-nsis-3.11.zip` + `NSIS_SHA256` |
| S5 CI 没跑 `host-smoke --fsa` | **未修** | `ci.yml:94`、`release.yml:96` 仍无 `--fsa` |
| S6 preflight 不查 Unreleased 收口 | **未修** | `release.yml:58` 仍只 `grep "^## ${PKG_VERSION} — "`；`CHANGELOG` 里 `## Unreleased` 仍在 |

## 六、结论

`npm run build` 通过（133 modules / 243 ms / exit 0）。首屏 **285,937 B ≤ 286,000 B（余 63 B）**，但这个数只含 JS+CSS：补上入口 `index.html` 是 286,864 B，宿主不加压时真实首屏传输 931,503 B。`dist` 1,471,881 B / 31 文件；安装器载荷 2,496,743 B。0.32.1 发布资产与 GitHub API 一致（setup 824,209 / portable 910,360 / macOS 905,892），本地重建 setup 多 386 B。运行时依赖无可减项；启动不联网、无常驻。

5 条建议：F1 修体积口径（下一轮加功能前必须先说清余量到底是多少），F2/F3 修 CI 与验收正确性（dead upload、ShellExecute 挂起风险、断言偏弱），F4 修打包清单的可维护性，F5 修「本地发布件无法自证」。文档数字本轮抽查一致，唯一小项是 `vite.config.ts` 重复且过期的 894,163 B。
