# 第 29 轮 · 发布 / 体积 / 安装体验侦察

角色：安装、体积、启动与开源发布体验（只读产品代码，未改任何产品文件）
时间：2026-11-16 23:14–23:40（Asia/Shanghai）
基线：branch `main`，`package.json` 0.32.1，HEAD `853966d`
环境：dev server `http://localhost:5175`（本轮未起、未重启任何 server）；未安装任何系统级软件；未改注册表；未动 `release/`。

## 一句话

0 条 P0，4 条 P1，2 条 P2。全部能落地，且都是「脚本/文档里的旧数字」这一类，不需要改产品逻辑。

| 编号 | 级别 | 问题 | 一行收益 |
| :--- | :--- | :--- | :--- |
| F1 | P1 | `measure-first-screen.mjs` 默认 `--max 285000`，与已生效预算 286,000 不一致 | 今天按文档跑这道门必 FAIL（285,783 > 285,000），下一个代理会误判产品缺陷 |
| F2 | P1 | `packaging/installer.nsi:34,37` 写死 `0.31.1.0` | 0.32.1 安装包的「文件版本」显示 0.31.1.0（已实测） |
| F3 | P1 | `packaging/verify-installer.ps1:138,140,144` 写死 `0.31.1` | 对正确的 0.32.1 构建，安装验收必报「exe 文件版本不对」 |
| F4 | P1 | `release.yml` 不跑 `npm test`、不跑首屏预算 | tag 可以从 CI 没过的 commit 打出包 |
| F5 | P2 | 安装包「内部预算 820,000 B」已失守且无机器门 | 已发布 setup 824,209 B，比内部预算高 4,209 B |
| F6 | P2 | `release/` 校验和与资产陈旧；纯文档提交仍跑 Windows + macOS 宿主 job | 手动核对方便，CI 省机器时间 |

## 本轮实测（全部可复跑）

### 构建与首屏

```
npm run build            → EXIT=0（tsc --noEmit + vite build，vite 226 ms）
node scripts/measure-first-screen.mjs
  895541  278712  /assets/index-B3_OF1Ta.js
   33995    7071  /assets/index-LEt1G9qz.css
  total raw=929536 gzip=285783 files=2 max=285000
  FAIL 首屏 gzip 285783 超过上限 285000     ← 默认值口径
node scripts/measure-first-screen.mjs --max 286000  → PASS（285,783 ≤ 286,000，余 217 B）
```

- 首屏与 `STATE.md:52`、`README.md:96` 的 285,783 B 一致；重建后不漂移。
- 首屏只有 2 个文件：主 JS gzip 278,712 + 主 CSS 7,071 = 285,783。

### dist 体积与 chunk 构成

`dist` 28 个文件共 **1,461,334 B**（与 `STATE.md:52` 一致）。

| 文件 | raw B | gzip B | 首屏？ |
| :--- | ---: | ---: | :--- |
| `assets/index-B3_OF1Ta.js` | 895,541 | 278,712 | 是 |
| `assets/index-LEt1G9qz.css` | 33,995 | 7,071 | 是 |
| `assets/katexLoader-CNO5m-uY.js` | 258,788 | 77,660（Vite 报 77.66 kB） | 否 |
| `assets/katexLoader-lxMheimU.css` | 26,627 | 7,460（Vite 报 7.46 kB） | 否 |
| 15 个 `KaTeX_*.woff2` | 213,664 合计 | — | 否 |
| 8 个懒加载组件 chunk（Outline/FindBar/QuickOpen/ShortcutsDialog/SettingsDialog/MarginRail/trash/TreeActions） | 31,224 合计 | — | 否 |

结论：首屏之外的可延迟字节约 530 KB（KaTeX JS+CSS+字体 + 懒加载组件），`dist` 1.46 MB 里 36% 是公式资源，只有首次出现公式才下载。与 `README.md:96` 的「KaTeX gzip 约 84 KB」口径一致（按脚本口径为 85,120 B；Vite 窗口口径 84.4 KB，差 1.4%）。

### 测试

`npm test` → **17 个文件、248 条、fail 0**（与 `README.md:114`、`README.md:151` 一致）。日志 `.tmp/test-r29.log`。

### 发布资产（0.32.1）

本地 `release/`：

| 资产 | 字节 | 与 STATE 一致性 |
| :--- | ---: | :--- |
| `Sidelight-0.32.1-win-x64-setup.exe` | 824,595 | STATE 写 824,209 → **本地文件与已发布文件不同** |
| `Sidelight-0.32.1-win-x64-portable.zip` | 910,360 | 一致 |
| macOS zip | 本地无 | 只能查 GitHub |

GitHub Release `v0.32.1`（API 实测，2026-11-16T14:28Z 发布）：

| 资产 | 字节 | SHA256 前 8 |
| :--- | ---: | :--- |
| `Sidelight-0.32.1-win-x64-setup.exe` | **824,209** | `5f0418ff` |
| `Sidelight-0.32.1-win-x64-portable.zip` | 910,360 | `3c4a3a58` |
| `Sidelight-0.32.1-macos-universal.zip` | **905,892** | `2f838b77` |
| `SHA256SUMS-0.32.1.txt` | 308 | — |

- `STATE.md:54,107` 的三个数字与 GitHub 一致。
- 本地 setup 比已发布 setup 大 **386 B**：本地 `release/` 是发版后又重建的产物。校验和只能以 Release 页为准；本地 `release/SHA256SUMS.txt` 仍是 0.26.0 的两行（见 F6）。

### 安装包元数据（只读）

```
(Get-Item 'release\Sidelight-0.32.1-win-x64-setup.exe').VersionInfo
ProductVersion = 0.32.1
FileVersion    = 0.31.1.0      ← 写死值
host\bin\Sidelight.exe  FileVersion = 0.32.1.0（由 host/build.ps1:31-39 从 package.json 生成）
```

### 启动联网与常驻（静态）

- `host/Program.cs` 里出现的 URL 只有 `http://127.0.0.1:<port>/index.html`（`:603`、`:1519`）；没有 `HttpClient`/`WebClient`/`WebRequest`。宿主自起回环 HTTP 服务，页面与宿主都不访问外网。
- `src/` 与 `src/styles.css` 里没有 `https://` 外链（字体、CDN 都本地打包）。
- 常驻只有：单实例 `Mutex`（`Program.cs:31,102,105`）、关窗计时器（`:845`）、启动 watchdog（`:1447`）。没有托盘图标、没有后台服务、没有自动更新检查。
- 结论：**启动路径不联网、无后台常驻**（静态成立）。运行时抓包未做 → UNVERIFIED。

### 依赖可减性

`dependencies` 13 个，逐一查引用后**没有可删的运行时依赖**：

- `@tiptap/*`（10 个）：`App.tsx:3,11,12,13` 与各组件直接 import；`@tiptap/pm` 走深路径（`App.tsx:7-9`、`src/lib/annotations.ts:1`、`src/lib/decorations.ts:2`），不是间接残留。
- `katex`：只由 `src/lib/katexLazy.ts` 动态加载，首屏 0 B。
- `react`/`react-dom`：必需。
- `devDependencies` 7 个都有用：`playwright-core`（scripts/*.mjs）、`@types/node`（测试）、`vite`/`@vitejs/plugin-react`/`typescript`（构建）、`@types/react*`（类型）。

可选优化（不推荐本轮做）：`typescript@^7` 是原生编译器，`npm ci` 的安装体积不小，但它在开发期，不进包，删不掉。

## 发现

### F1（P1）首屏体积门的默认值与生效预算不一致，今天跑必 FAIL

**证据**

- `scripts/measure-first-screen.mjs:15`：`const max = Number(readArg('--max', '285000'))`；`:64-67` 超线 `exit 1`。
- `.github/workflows/ci.yml:39`：`node scripts/measure-first-screen.mjs --max 286000`。
- `README.md:96`、`docs/CHANGELOG.md:13`、`docs/iteration/STATE.md:52`：预算 **286,000 B**（数据安全例外），余 217 B。
- `git log -1 -- scripts/measure-first-screen.mjs` → 最后一次改动是 `6bd6831`（第 11 轮）；把预算抬到 286,000 的提交 `bc8dbfb` **只改了 ci.yml 一个文件**。
- 本轮实测：不带参数的 `node scripts/measure-first-screen.mjs` 输出 `FAIL 首屏 gzip 285783 超过上限 285000`、`EXIT=1`。
- 参考：`docs/adr/0012-katex-lazy-loading.md:43` 仍写「判据：`measure --max 285000` 超线」。

**影响**：下一个人按 ADR-0012 判据或随手跑脚本复核，会得到一条红门；而 CI 是绿的。这正是「测试旧了不等于产品坏了」的坑，浪费一轮判断。

**建议**（三选一，成本都在 5 分钟内）

1. 默认值改成 `286000`，并让 `ci.yml` 不传 `--max`（单一来源）；
2. 更好：把预算写进 `package.json`（如 `"budget": { "firstScreenGzip": 286000 }`），脚本读它，CI 与 README 都指向同一处；
3. 同时改 `docs/adr/0012-katex-lazy-loading.md:43` 的判据行。

**预期收益**：消掉一条必然的假红；预算只剩一处数字，改预算时不会再只改 CI。风险：0（脚本默认值不改变任何产物）。

### F2（P1）安装包的「文件版本」写死 0.31.1.0

**证据**

- `packaging/installer.nsi:34`：`VIProductVersion "0.31.1.0"`；`:37`：`VIAddVersionKey /LANG=2052 "FileVersion" "0.31.1.0"`。这两处没有用 `${APPVERSION}`。
- 实测 0.32.1 已发布包：`ProductVersion=0.32.1`、**`FileVersion=0.31.1.0`**。
- `AGENTS.md` §8 第一条踩坑就是「版本号不要写死」，`installer.ps1:9` 已从 `package.json` 读版本，只是没传进这两行。
- 对照：`packaging/verify-installer.ps1:140` 恰好只断言 `StartsWith('0.31.1')`，所以这个错**被验收脚本放过了**。

**影响**：用户在 exe 属性 →「详细信息」看到文件版本 0.31.1.0；企业软件清单、SmartScreen 信誉、问题反馈里的版本号都会错。发布说明写 0.32.1，安装包自称 0.31.1.0，属于对外不一致。

**建议**：`installer.ps1` 加一个四段版本 define（如 `/DFILEVERSION=$version.0`），`installer.nsi` 两行改用 `${FILEVERSION}`；顺带把 `verify-installer.ps1:140` 改成断言 `${version}`（见 F3）。**预期收益**：属性页版本与 CHANGELOG/Release 一致；发布前机器可查。风险：低（只改版本资源，不动载荷）。

### F3（P1）安装验收脚本写死 0.31.1，对正确的 0.32.1 构建必报 FAIL

**证据**

- `packaging/verify-installer.ps1:138`：`if ($exeVersion -and $exeVersion.StartsWith('0.31.1')) { Pass ... } else { Fail "exe 文件版本不对：$exeVersion" }`。
- `:140`：`if ($setupVersion -and $setupVersion.StartsWith('0.31.1')) ...`。
- `:144`：`Pass 'Sidelight.exe --version = 0.31.1'`（这行只影响文案；比较用的是 `$version`，逻辑正确）。
- 实测 `host\bin\Sidelight.exe` 的 `FileVersion = 0.32.1.0`（`host/build.ps1:31-39` 从 `package.json` 生成）。因此 `:138` 一定会走 `Fail` 分支。
- `packaging/README.md:39` 与 `README.md:129` 都把这条脚本列为验收命令；`packaging/verify-installer.ps1:229-232` 只要 `failed > 0` 就 `exit 1`。
- `git log -1 -- packaging/verify-installer.ps1` → `c035a1d`「dynamic version for host/packages」，这次改动了 `host/build.ps1` 与 `installer.ps1`，漏了本文件。

**影响**：任何人在 0.32.1 上跑安装验收，都会得到 `1 FAIL`，而实际安装包可能是好的。判 FAIL 会触发回滚或返工。

**建议**：三处都改为 `$version` / `$version + '.0'`（`:144` 的文案用变量插值）。**预期收益**：验收命令恢复可用，且发出 0.32.1 时就能抓到 F2。风险：0。

### F4（P1）发布流水线不跑测试、不跑首屏预算

**证据**

- `.github/workflows/release.yml:31-62` 的 `preflight` 只校验 tag = `package.json` 版本、`docs/CHANGELOG.md` 有对应小节；没有任何 `npm test` 或 `measure-first-screen`。
- `:79-80`（windows-build）、`:141-142`（macos-build）只 `npm ci` + `npm run build`；`:94` 跑 `host-smoke`。
- 对照 `ci.yml:38-40`：`gate` 才有 `npm run build` → `measure --max 286000` → `npm test`。
- 第 19 轮 `findings-ship.md:45` 已报过同一问题（R2），至今未修。

**影响**：tag 可以从一个 CI 红的 commit 打出来，发布出去的是没过测试/超预算的包。当前首屏余量只有 217 B，这个风险不是理论值。

**建议**：`preflight`（ubuntu-latest，现成 setup-node）加三步：`npm ci`、`node scripts/measure-first-screen.mjs --max 286000`、`npm test`。**预期收益**：发布门与 CI 门同源，超预算/测试红直接拦住 tag；成本约 1–2 分钟。风险：低（ubuntu 上 measure 只读 `dist`，测试是纯 node）。

### F5（P2）安装包「内部预算 820,000 B」已失守，且没有机器门

**证据**

- `README.md:96`、`README.md:107`：安装包内部预算 **820,000 B**，硬线 **850,000 B**。
- 已发布 0.32.1 setup：**824,209 B**（GitHub API）；本地重建 824,595 B。**超内部预算 4,209 B**。
- `packaging/installer.ps1:91,93` 只打印 `hard=850000` 并在 `> 850000` 时 `exit 1`；**没有 820,000 的判断或警告**（`:91` 只打印 estimatedSize）。
- `packaging/README.md:57` 的「已知限制」还写着「0.22.0 实测 808,897 B（余量 41,103 B）」，与 0.32.1 的 824,209 B 差 15 KB，已经不是「余量」而是超支。
- 第 13 轮定过规则（`docs/iteration/round-13/findings-ship.md:36`）：超内部预算 ≤2,000 B 可发布、须在 CHANGELOG 记原因；本次超 4,209 B。`docs/CHANGELOG.md:13-15` 的 0.32.1 条目只写首屏 285,783 B，安装包体积交给 Release 页，**没有写超内部预算的原因**。

**影响**：对外文档承诺的数字与实际资产不符；下次有人拿 820,000 当门，会得出错误结论。

**建议**（二选一，选一条并落到脚本）

1. 在 `installer.ps1` 加内部预算：`820000` 超线时打印载荷占比 + `exit 1`（硬线 850,000 保留），并把 `README.md`、`packaging/README.md` 的示例数字换成当前实测与余量；
2. 或者把内部预算调到 830,000 B，在 `STATE.md`/CHANGELOG 写理由（与 286,000 首屏例外同样处理）。

同时更新 `packaging/README.md:57` 的 0.22.0 旧数字。**预期收益**：超支当场可见，不再靠人肉回忆。风险：若选 1，下次出包可能直接红，需要先确认 824,209 是否可接受。

### F6（P2）`release/` 陈旧校验和 + 纯文档提交仍跑 Windows/macOS 宿主 CI

**证据**

- `release/SHA256SUMS.txt` 只有 0.26.0 两行（2026-11-16 4:24），而 `release/` 里最新是 0.32.1。手动 `sha256sum -c` 会核错版本。仓库里共 23 个 `release/` 文件，其中 22 个是 0.27–0.32.1 的 exe/zip。
- 本地 `Sidelight-0.32.1-win-x64-setup.exe` 824,595 B ≠ 已发布 824,209 B（F2 修好后这个差异会更值得解释）。`release/` 不进版本控制，属本地产物；但它是 `verify-installer.ps1:21` 的唯一输入。
- `ci.yml` 没有 `paths-ignore`：最近 30 个 commit 里 **12 个是纯文档**（`git log` 统计，改动路径只含 `docs/`）；每个这样的提交都会跑 `gate`（超时上限 15 min）+ `windows-host`（25 min）+ `macos-host`（30 min）三组 job，其中后两组只验证宿主编译，与文档改动无关。
- 冗余还有一条：`ci.yml:96-109` 与 `release.yml:96-113` 的「编宿主 → 打 NSIS → 上传 artifact」几乎逐行重复，两处都要跟着 `installer.ps1` 改。

**建议**

1. `packaging/` 加一个小脚本（或在 `installer.ps1` 末尾）写 `release/SHA256SUMS-<version>.txt`，并删掉/移走其他版本的本地产物；至少让 `SHA256SUMS.txt` 不再指 0.26.0。
2. `ci.yml` 的 `push` 触发器加 `paths-ignore: ['docs/**', 'shots/**', '**/*.md']`（保留 `pull_request` 全量）；纯文档提交省掉两组宿主编译 job。
3. 把「编宿主 + 打安装包 + 上传」抽成 `workflow_call` 复用（可选，第 3 条收益最小）。

**预期收益**：本地核对不再串版本；文档提交只跑 `gate`（超时上限 15 min），不再跑宿主两组（上限 25 + 30 min）；PR 门不变。风险：低（`paths-ignore` 只影响 push）。

## 任务清单逐项核对

| 任务 | 结果 | 证据 |
| :--- | :--- | :--- |
| `npm run build` | ✅ exit 0，vite 226 ms | 本轮命令输出 |
| 首屏 gzip vs 286,000 | ✅ 285,783 ≤ 286,000（余 217 B）；但默认参数 FAIL | measure 输出 |
| dist 体积与 chunk 构成 | ✅ 28 文件 1,461,334 B；主 JS 895,541 / 懒 KaTeX 258,788 / woff2 213,664 | 上表 |
| release/ 0.32.1 资产大小 | ✅ setup 824,595（本地）/ 824,209（已发布）；portable 910,360；macOS 905,892（GitHub） | 文件属性 + GitHub API |
| `packaging/*.ps1` 与 README 安装步骤 | ⚠️ 安装步骤（双击 → SmartScreen → 默认路径 → 可选关联 → 开始菜单）与 `installer.nsi:42-47,94-147,151-178` 一致；WebView2 缺失「提示并中止」属实（`:116-118`）；但两个脚本版本号写死（F2/F3） | 见 F2/F3 |
| 运行时/开发依赖可减 | ✅ 无可删项（逐包查引用） | 「依赖可减性」 |
| CI 冗余 | ⚠️ 有（F6：文档提交跑全量、两处 install 步骤重复）；另有 F4 发布门缺失 | 见 F4/F6 |
| README 下载/安装/体积数字 | ⚠️ 首屏 285,783、17 文件 248 条、字体 213,664、KaTeX 84 KB 全部一致；**安装包内部预算 820,000 与已发布 824,209 不一致**（F5） | 见 F5 |
| 启动路径联网/常驻 | ✅ 静态不联网、无常驻；运行时抓包 UNVERIFIED | 见「启动联网与常驻」 |

## 安装步骤还能不能更少

现在 Windows 是「下载 → 双击 → 过 SmartScreen → 下一步×2 → 装完」。最短路径可减 1 步：NSIS 去掉 `MUI_PAGE_DIRECTORY`（per-user 固定装到 `%LOCALAPPDATA%\Programs\Sidelight`，用户改路径的价值低），安装从 2 页变 1 页（组件页仍在，因为 `.md` 关联是 opt-in）。代价：想装到别的盘的人失去选择；`/D=` 静默安装仍可用（`verify-installer.ps1:70` 依赖它）。**收益：少一次点击、少一个能装错的路径**。风险：低，但属产品决定，建议交产品负责人。

## UNVERIFIED

- 真人交互安装、SmartScreen 实际拦截、HKCU 卸载项/开始菜单在真实桌面的出现与清除：本轮没有安装任何系统级软件（`verify-installer.ps1` 会写 HKCU/开始菜单），只做静态核对与元数据读取。
- 运行时网络抓包：没有对宿主启动做断网/抓包实验；「不联网」结论只来自 `host/Program.cs`、`src/` 里无外网 URL 的静态证据。
- macOS 资产：本机 `release/` 无 0.32.1 macOS zip，大小与 SHA256 取自 GitHub API；未下载解包，未验签名。
- 0.32.1 已发布 setup 与本地重建差 386 B 的原因：未查（可能是发版后某次 `installer.ps1` 重跑；未改动任何文件，无法复现发布当时的字节）。
