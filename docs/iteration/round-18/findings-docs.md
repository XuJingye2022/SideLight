# 第 18 轮 开源文档与仓库治理发现（finder: r18-docs）

- 日期：2026-11-16（Asia/Shanghai）
- 仓库：`D:\Documents\SidelightProgram`，v0.30.0，HEAD `2ff19bd`
- 边界：只读侦察。没有改 `src/`、`host/`、`host-mac/`、`packaging/`、`.github/`。新增只有本文件与 `.tmp/r18-docs/`（两个只读检查脚本、无产物）。
- 工作区事实：round-17 正在实施，`src/App.tsx`、`src/lib/workspace.ts` 有未提交改动（`git status` 7 项，均属 round-17）。本报告数字以 HEAD + 当前 `dist/` 为准。
- 跨轮提醒：round-17 计划发 **0.30.1**，并把文档上限从 6 MB 改为 **5.5 MiB**（`docs/iteration/round-17/plan.md` T3）。D5 的一致性修改应在 0.30.1 定稿后按其口径做一次，不要现在改两遍。
- 与 `findings-repo.md` 的分工：仓库报告覆盖 GitHub 设置、Issue/PR 模板、Release 正文、`.gitignore`、截图体积；本报告只做**三份对外文档的内容结构**、**第一次贡献者实测**，并补它没展开的文档事实错误。重叠处标「同 R*」。

## 0. 本轮实测（可复现）

| 检查 | 命令 | 结果 |
| :--- | :--- | :--- |
| 单元测试 | `npm test` | exit 0，**16 个文件、205 条**，1.5 s |
| 类型检查 | `npx tsc --noEmit` | exit 0，1.3 s |
| 首屏预算 | `node scripts/measure-first-screen.mjs dist --max 285000` | **284,210 B / 285,000**，PASS，余 790 B |
| 产物字节 | `Get-ChildItem dist -Recurse` | **1,438,132 B**，26 个文件（与 `STATE.md:52` 一致） |
| dev server | `Invoke-WebRequest http://localhost:5173` | 200；`127.0.0.1:5173` 不监听（只绑 `::1`，进程 pid 75496） |
| CDP 9222 | `chromium.connectOverCDP('http://127.0.0.1:9222')` | **30 s 超时**（这个浏览器实例无响应）；9223、9224 正常 |
| NSIS 源 | `HEAD https://prdownloads.sourceforge.net/nsis/nsis-3.11.zip` | 200，`Content-Type: text/html`，145,519 B（不是 zip） |
| 坏链接 | `.tmp/r18-docs/check-links.mjs` | 扫描全部 .md（运行时 185 个，round-17 仍在新增）；**用户可见文档 0 坏链**；14 个坏链全在 `docs/iteration/round-0*/`，是 `…`、`url` 之类占位符；**0 个未闭合代码围栏** |
| 编码 | `.tmp/r18-docs/check-encoding.mjs` | 扫描全部 .md（运行时 185 个）；8 个带 UTF-8 BOM（见 D5-15） |
| GitHub 私有漏洞报告 | `GET /repos/.../private-vulnerability-reporting` | **enabled=false** |
| 社区健康度 | `GET /repos/.../community/profile` | **57%**；security / issue_template / pr_template / code_of_conduct 全为 null |
| v0.30.0 Release | `GET /repos/.../releases/tags/v0.30.0` | 正文只有 2 行（签名状态 + `signing=adhoc`）；资产 817,983 / 902,274 / 890,004 B + `SHA256SUMS-0.30.0.txt` 308 B |

没有跑：`npm ci`（会重建 `node_modules`）、`npm run build`（AGENTS §3 规定实施期由根代理串行跑）、`node scripts/shot.mjs`（会清共享 CDP 的 localStorage）、打包脚本（会写 `release/`）、macOS 命令（本机 Windows）。原因在附录 A 逐条写。

---

## D1（P1）`SECURITY.md` 缺失，私有漏洞报告入口还是关的

**证据**

- 根目录没有 `SECURITY.md`；`.github/` 只有 `workflows/`（`ci.yml`、`release.yml`）。
- GitHub `private-vulnerability-reporting` 匿名 API 返回 `{"enabled": false}`；社区 profile 的 `security` 为 `null`，健康度 57%（同 R1-5）。
- 仓库里没有任何邮箱。`LICENSE`、`package.json`、README 都没有联系方式；`package.json` 也没有 `repository` / `bugs` / `author` 字段（`package.json:1-43`）。
- README 与 CONTRIBUTING 都没有一句「漏洞往哪报」。`CONTRIBUTING.md:1-47` 全文无 security。

**影响**

- 发现漏洞的人只有公开 Issue 一条路，细节一贴就公开。
- 没有支持版本、范围、密钥边界与日志脱敏的公开说明；报告者可能把 Key、正文、完整路径一起贴出来。

**改法**

1. 先请产品负责人在 GitHub `Settings → Code security → Private vulnerability reporting` 打开（一次点击；本轮不改设置）。
2. 新增根目录 `SECURITY.md`，按附录 C 的 10 节写。
3. 渠道分两态，不能写不存在的入口：
   - 已开启：`https://github.com/XuJingye2022/SideLight/security/advisories/new`。
   - 未开启：写「不要在公开 Issue 写细节；先开一个 Issue，只写『需要私下报告渠道』，维护者会开私有通道」。
4. SECURITY 里所有承诺句（响应时限、披露窗口、是否赏金）标「**待产品负责人确认**」。
5. README 加「参与贡献」段，链接 `CONTRIBUTING.md`、`SECURITY.md`、`PRIVACY.md`（标「草案，待确认」）、`LICENSE`；CONTRIBUTING 顶部也链接 SECURITY。

**难度** S（写 1 个文件；设置需人点一次）。**验收**：根目录存在 SECURITY.md；渠道文字与设置状态一致；无编造邮箱。

---

## D2（P1）`CONTRIBUTING.md` 是内部代理说明，外部贡献者按它走不通

**证据**

- 现有结构只有 6 节：环境、门禁、提交、依赖、术语与决策、许可证（`CONTRIBUTING.md:5-47`）。
- 没有 clone/fork、没有 PR 流程、没有 Issue 指引、没有发布流程、没有代码风格、没有截图与打包前置。
- `CONTRIBUTING.md:20`：「`npm run build` 由维护者在收尾时串行跑一次。实施期间不要跑它。」这是并行代理纪律。外部 PR 必须能过 `npm run build`，这句话对他们是反的。
- `CONTRIBUTING.md:26-28`：提交格式 `round-NN: <一句话>`。外部贡献者没有轮次号。
- `CONTRIBUTING.md:22`：「测试数量……不要在文档里写死数字。」但 README:110、AGENTS:38、CHANGELOG:14 都写死 16/205；规则与现状冲突。
- README 全篇没有链接 CONTRIBUTING（CHANGELOG:191 只在 0.18.0 的历史补记里提过一句）；新读者从 README 找不到贡献入口。
- 快速开始缺三件事：Node 版本（`.nvmrc`=24、`package.json:7-9` engines `>=24`）只写在 CONTRIBUTING:7，没进 README 的「跑起来」；没有 `git clone`；README:108 用 `npm install`，CONTRIBUTING:8 用 `npm ci`，两处不一致。
- 实测：`npm test` 1.5 s、`npx tsc --noEmit` 1.3 s，走通不难；难的是不知道从哪开始、以及 `build` 该不该跑。

**影响**

- 第一个贡献者卡在「从哪拿代码、跑什么、能不能跑 build、PR 要交什么」。
- 维护者要反复解释同四件事；PR 可能不带门禁输出、不带截图。

**改法**：按附录 B 重写为 13 节，要点：

1. 开头「先读」：README → AGENTS.md（给代理与维护者的门禁）→ 相关 ADR → GLOSSARY。
2. 环境：Node 24（`.nvmrc`）、npm 11、Windows 11 首发、macOS 13+ 需 Xcode CLT、Windows 宿主需 WebView2 运行时；不需要管理员，不需要 VS Build Tools（`host/build.ps1:10` 用系统 `csc.exe`）。
3. 10 分钟上手（真命令）：
   ```bash
   git clone https://github.com/XuJingye2022/SideLight.git
   cd SideLight
   npm ci
   npm run dev      # http://localhost:5173（不要用 127.0.0.1，Vite 只绑 ::1）
   npm test
   ```
4. 门禁分两档：外部 PR 必跑 `npx tsc --noEmit`、`npm test`、`npm run build`；`npm run roundtrip` 只在改编辑器/Markdown 序列化时跑（会重写 `docs/roundtrip-report.md`）。把「并行代理期间根代理串行跑 build」整段移回 AGENTS.md。
5. 提交信息分两类：外部 `fix:` / `feat:` / `docs:` / `test:` / `chore:`，可带范围；内部迭代保留 `round-NN:`。
6. PR 检查单：一个 PR 一件事；CI `gate` / `windows-host` / `macos-host` 绿（`.github/workflows/ci.yml:23-134`）；界面变化附截图；不加运行时依赖（AGENTS:52）；改了行为就更新 README/CHANGELOG；改了产品硬约束要新 ADR。
7. Issue：先搜、先读 README「现在不能做什么」；安全走 SECURITY。
8. 截图与验收脚本前置（现在完全没写，见 D4-4）：CDP 9222 必须已开；`npm run shot -- --out shots/round-NN/x.png`；`npm run acceptance` 11 项。
9. 打包：Windows 需要 `dist/` + `.tmp/wv2`（WebView2 SDK）+ NSIS；macOS 需要 macOS + Xcode CLT，Windows 本机不能编。
10. 发布：链接 AGENTS §5 与 `.github/workflows/release.yml`；版本语义（AGENTS:58）；tag `v*` 自动发布，手动 dispatch 需 `tag` + `publish`；`install-verify` 只手动。
11. ADR：一决策一文件，编号递增；格式抄 `docs/adr/0013-file-tree-operations.md`（背景 → 决定 → 边界 → 否决的方案 → 验收与未验 → 状态）；并在 README「已定的技术决策」加一行。
12. 代码风格：仓库没有 linter/formatter（`package.json:34-42` 无 ESLint/Prettier），写清现状约定：2 空格、单引号、无分号、TS strict（`tsconfig.json:8`）、文件名风格跟同目录；不要重排无关行。
13. 许可证与贡献授权（保留 `CONTRIBUTING.md:45-47`）。

**难度** M（重写 120–180 行）。**验收**：把新 CONTRIBUTING 交给没看过仓库的人，他能只按它完成 clone → dev → test → 截图 → PR 检查单；文中每条命令都能在 `package.json` / `scripts/` 找到。

---

## D3（P1）`PRIVACY.md` 缺失，README 的隐私事实有 4 处说得不准

**证据**

- 没有 `PRIVACY.md`；README 只有「数据与隐私」段，段首标「待产品负责人确认」（`README.md:76-89`）。
- README:80：「页面只拿哈希 id，不拿路径」。实际 `/__recent` 返回 `{id, seq, name, dir}`（`host/Program.cs:1959-1962`；macOS 同：`host-mac/Sources/SidelightMac/Documents.swift:421-422`）。页面拿到**文件名**与**用于区分的目录段**，只是没有盘符与完整路径。
- README:86：「macOS 的最近文件与 WebView 存储：`~/Library/Application Support/Sidelight`」。代码只能证明 `recent.json` 在那里（`Documents.swift:253-257`）。WebView 用的是默认 `WKWebViewConfiguration()`（`App.swift:71`），localStorage（含 API Key）的落盘位置由 WebKit 决定，通常在 `~/Library/WebKit/<bundle id>/`，**未在 macOS 真机核实**。
- README:82 与 `packaging/README.md:24` 的日志说法：日志实际写在 exe 同级 `baseDir`（`host/Program.cs:27`），即 `%LOCALAPPDATA%\Programs\Sidelight\host.log`，卸载会随程序目录删除；`packaging/README.md:24` 却把「日志」列进「不会删」的 `%LOCALAPPDATA%\Sidelight`。
- 「只记 basename」不完整：路径类日志确实只记 basename（`Program.cs:1680-1686`），但 `navigation starting <完整 URI>`（`Program.cs:1472`）与 `permission <kind> <完整 Uri>`（`Program.cs:1386`）会写完整 URL。正常情况是回环地址；用户点外链时可能写入外部 URL（外链是否导致导航未实测）。
- 事实基础（可写进草案）：Key 明文在 `localStorage` 的 `sidelight.settings.v1`（`src/lib/settings.ts:23,74`），模型请求带 `Authorization: Bearer` 直连 `settings.baseUrl + /chat/completions`（`src/lib/ai.ts:106-111`）；搜索直连 Tavily / 博查（`src/lib/search.ts:21-30,79`）；页面与宿主之间没有遥测请求，启动不联网（`src/` 内只有这两处 `fetch`）。

**影响**

- 隐私声明是对外承诺。README 的 4 处不准会被逐字引用，也会让用户找不到、删不掉自己的数据。
- 没有独立 `PRIVACY.md` 时，README 的「待确认」段既不是承诺，也不是可引用的政策。

**改法**

1. 新增 `PRIVACY.md`，按附录 D 的表与句子写；标题下第一行固定：
   > **草案。待产品负责人确认；确认前不得作为对外承诺。**
2. 修 README 4 处：
   - :80 改「页面拿哈希 id、文件名与用于区分的目录段；完整路径只留在 `recent.json`，页面拿不到」。
   - :82 改「日志在安装目录 `host.log*`：路径只记 basename，但会记页面导航的完整 URL；Windows 有日志文件，macOS 不落盘」。
   - :86 改「macOS：`recent.json` 在 `~/Library/Application Support/Sidelight`；WebView 存储位置由 WebKit 决定，本轮未在真机核实」。
   - 同段补 `%LOCALAPPDATA%\Sidelight\WebView2`（WebView2 数据目录，存 localStorage 里的 Key；`Program.cs:1266`）。
3. 修 `packaging/README.md:24`：日志不在 `%LOCALAPPDATA%\Sidelight`，随程序目录卸载删除。
4. 附录 D 里每条承诺句后标「待确认」；没有产品负责人签字前，README 与 Release 正文都不要把它写成「我们承诺」。

**难度** M（草案约 120 行 + 4 处事实修正）。**验收**：PRIVACY 的每条路径都能在代码里找到出处；「待确认」句可被逐条勾选；README 不再出现「不拿路径」。

---

## D4（P1/P2）首次贡献者的命令与前置：build + test 能走，截图与打包会断

**证据**

1. **macOS 命令是旧的**（同 R4-K8 的一半）：README:132 写产物 `release/Sidelight-<ver>-macos-<arch>.zip`，实际是 `-macos-universal.zip`（`host-mac/build.sh:15`）；README:133 写 `.tmp/mac/Sidelight.app`，实际 stage 在 `.tmp/mac/stage/Sidelight.app`（`build.sh:13-14`；CI 也这么用：`.github/workflows/ci.yml:125`）。README:133 还缺 `--require-bundle`（AGENTS:65 要求）。
2. **NSIS 源在干净机器上会拿到 HTML**：`packaging/installer.ps1:35` 用 `https://prdownloads.sourceforge.net/nsis/nsis-3.11.zip`；实测 HEAD 返回 200 + `Content-Type: text/html` + 145,519 B。CI 已经因此改用仓库 Release 固定资产，并留了注释「SourceForge 直链会返回反爬 HTML」（`ci.yml:77-78`）。README:124 与 `packaging/README.md:38` 都没写这个前置。
3. **WebView2 下载提示缺 `.tmp`**：`host/build.ps1:16-19` 打印 `Invoke-WebRequest ... -OutFile .tmp\wv2.zip; Expand-Archive ...`，但脚本不建 `.tmp`，干净 clone 没有这个目录（`.gitignore:8`），第一条命令就失败。CI 专门建了 `.tmp` 并注明「不建父目录：先建 .tmp，否则首次必红」（`ci.yml:63-66`）。
4. **截图与验收脚本的前置没写**：`README.md:113-114` 说「需先起 dev + 无头浏览器」，但没说浏览器怎么起、要开 CDP、端口 9222。`scripts/shot.mjs:14` 把 `http://127.0.0.1:9222` 写死，没有参数。实测 9222 在 08:2x 无响应（`connectOverCDP` 30 s 超时），9223/9224 正常；新贡献者只会看到超时。
5. **安装命令两种写法**：README:108 `npm install`，CONTRIBUTING:8 `npm ci`。贡献流程应统一 `npm ci`（可复现、CI 同款）。
6. **`release/` 是本地路径**：README:64 让用户装 `release/Sidelight-0.30.0-win-x64-setup.exe`，但 `release/` 被 `.gitignore:10` 忽略，克隆后不存在；下载段（README:9-12）才是对的（同 R4-K8）。

**影响**

- build + test 这条路实测通（1.5 s + 1.3 s），但「界面变了要截图」「打个安装包看看」这两条按文档做会失败。
- macOS 维护者照 README 找不到 `.app`，也拿不到 universal 包名。

**改法**

- README:132-133 改成：
  ```bash
  bash host-mac/build.sh    # -> release/Sidelight-<版本>-macos-universal.zip
  .tmp/mac/stage/Sidelight.app/Contents/MacOS/SidelightMac --self-test --require-bundle
  ```
- README:64 改成「从 Releases 页下载并安装」；不在用户文档里指本地 `release/`。
- `installer.ps1` 的下载源改 CI 用的固定资产（`build-tools-nsis-3.11.zip` + SHA256，`ci.yml:78,81`），或至少在 README/CONTRIBUTING 写清「NSIS 需预先放到 `.tmp\nsis`，SourceForge 直链会返回 HTML」。本轮若只改文档，就在 CONTRIBUTING 的打包节写这条。
- `host/build.ps1:18` 的提示前加 `New-Item -ItemType Directory -Force .tmp | Out-Null`。
- CONTRIBUTING 新增「截图与验收前置」小节：给出启动 headless Edge 的命令（例如 `msedge.exe --headless=new --remote-debugging-port=9222 --user-data-dir=%TEMP%\sidelight-cdp`），并说明脚本固定 9222；或给 `shot.mjs`/`acceptance.mjs` 加 `--cdp <port>`（代码改动，非本轮必须）。启动命令需在目标机验一次再写死。
- README:108 改 `npm ci`。

**难度** S–M（文档改动 S；`--cdp` 参数 M）。**验收**：干净 clone 上按 CONTRIBUTING 能走到截图与便携包；README 的 macOS 两条命令与 `build.sh` 实际路径一致。

---

## D5（P1/P2）事实一致性：README 有一句与功能相反，CHANGELOG 0.30.0 数字与验收报告不一致

**先给结论**：用户可见文档的相对链接 **0 坏**，代码围栏 **0 坏**；当前版本号在 `package.json`、`package-lock.json`（两处）、AGENTS、CHANGELOG、STATE、README 的安装文件名里都是 0.30.0（README:22 的 0.28.1 是升级说明，属历史）；0.29/0.30 旧包名只剩 README:132 一处（`-macos-<arch>`）。体积与测试数与实测一致（除下表）。问题集中在几句陈述与几个回填数字。

| # | 位置 | 现状 | 应改为 | 难度 |
| :--- | :--- | :--- | :--- | :--- |
| D5-1 | `README.md:62` | 「文件树只能删文件：不能移动、复制、**重命名**文件」 | 同一文件 :51 已写「右键也可重命名」。改为「不能移动、复制文件，也不能删目录；重命名只支持同目录 `.md`/`.markdown`」 | S |
| D5-2 | `docs/CHANGELOG.md:10`、`:14` | 「48/48 组对比度通过」「`theme-acceptance` 26/26（48/48 矩阵）」 | 验收报告实测是 **27/27**、**43/48 适用、5 组排除、0 失败**（`docs/iteration/round-16/test.md:22,26`；brief:5 同）。改为「48 组中 43 组适用、全部通过（5 组因隐藏/禁用排除）；`theme-acceptance` 27/27」 | S |
| D5-3 | `docs/CHANGELOG.md:17` | 「体积与 SHA256 见 Release 页的 `SHA256SUMS-0.30.0.txt`（**出包后回填**）」 | 包已发。回填实测：setup **817,983 B**、portable **902,274 B**、macOS universal **890,004 B**（Release API 实测；Windows 两个与本机 `release/` 一致），删「出包后回填」 | S |
| D5-4 | `README.md:132-133` | 旧包名 `-macos-<arch>.zip`、旧路径 `.tmp/mac/Sidelight.app`、缺 `--require-bundle` | 见 D4；`-macos-universal.zip` + `.tmp/mac/stage/...` + `--require-bundle` | S |
| D5-5 | `docs/iteration/STATE.md:24` | 「`npm test`（以 `package.json` 为准，当前 **15 个文件**）」 | 16 个文件、205 条（实测） | S |
| D5-6 | `docs/iteration/STATE.md:105,107` | 「最近一次 `round-13/test.md`」「报告写 `round-14/findings-*.md`」 | 已是第 18 轮；改成当轮：「最近一次 `round-17/test.md`（轮次结束后）」与「`round-18/findings-*.md`」，并随每轮更新 | S |
| D5-7 | `README.md:147` | 「`lib/*.test.ts` 16 个测试文件」 | 磁盘上有 **17** 个（`katexLazy.test.ts` 未挂进 `npm test`，AGENTS:73 已记）。要么挂上，要么改成「`npm test` 跑 16 个」 | S |
| D5-8 | `CONTRIBUTING.md:22` | 「不要在文档里写死数字」 | 与 README/AGENTS/CHANGELOG 现状冲突。改成「用户文档里的数字必须与 `npm test` 实测一致；改测试数时同步三处」 | S |
| D5-9 | `docs/CHANGELOG.md:95,106,117,129,140,156,168` | 旧版本条目写「测试数与产物体积、校验和见 **后一版**（0.21.0 / 0.23.0 / 0.24.0 / 0.25.0 / 0.26.0）」 | 历史回填可保留，但加一句「（数字为后续版本回填）」或把数字写回各自条目；不要让读者以为 0.18 要去看 0.21 | S |
| D5-10 | `.github/workflows/release.yml:10` | `description: '要构建/发布的 tag（例如 v0.29.0）'` | 例改成 `v0.30.0` 或 `v<版本>` | S |
| D5-11 | `README.md:80,82,86`；`packaging/README.md:24` | 4 处隐私事实不准 | 见 D3 | S |
| D5-12 | `README.md:64` | 「还没有自动更新、没有代码签名」 | 平台要分开：Windows 未签名；macOS 默认 ad-hoc，配 Apple secrets 后可签名+公证。不要让人读成 macOS 永远不签 | S |
| D5-13 | `packaging/README.md:15-16` | 两个列表项都编号 `4.` | 第二项改 `5.` | S |
| D5-14 | `README.md:1-5` | 没有 CI badge，也没有「参与贡献」段 | 加 badge（GitHub 自家 URL，不引第三方）与「参与贡献」链接段；badge 建议同 R5-4 | S |
| D5-15 | 8 个 .md 带 UTF-8 BOM：`docs/adr/0008`–`0012`、`0014`、`packaging/README.md`、`docs/iteration/round-04/findings-ux.md` | 渲染无害，但风格不统一；若 BOM 落到 `docs/CHANGELOG.md`，`release.yml:58` 的 `grep -q "^## <版本> — "` 会失配，tag 直接红 | 统一去 BOM；CHANGELOG 绝对不要 BOM | S |
| D5-16 | `LICENSE:3` vs `docs/iteration/STATE.md:116` | 版权人 `XuJingye` 与内部决定「Sidelight contributors」不一致（同 R1-1） | 产品负责人二选一，只改一处并同步 STATE | S |

补充，不改也不算错：

- `packaging/README.md:57` 用 0.22.0 的 808,897 B 作例子；可换成 0.30.0 的 817,983 B，但不是错误。
- 历史轮次报告里 14 个坏链（`docs/iteration/round-01/impl-a.md`、`round-04/findings-ship.md`、`round-07/*`）是占位文字，历史文件不追改。
- `README.md:74` 的「21 项有、18 项缺」与 `docs/typora-gap.md:7,33` 一致。

---

## 附录 A · 第一次贡献者走查记录

| 步骤 | 做了什么 | 结果 | 文档够不够 |
| :--- | :--- | :--- | :--- |
| clone | 未跑（会写 `.tmp` 之外的新目录；CI 三平台用 `actions/checkout` 已证明仓库可克隆） | 仓库 public，`clone_url` 正常 | **不够**：README/CONTRIBUTING 都没有 `git clone` 与仓库地址（README:9 只有 Releases） |
| `npm ci` | 未跑（会重建 `node_modules`，影响并行代理） | CI 的 `gate`/`windows-host`/`macos-host` 每次都跑并绿（最近 CI #21 success，见 findings-repo R1） | 够（CONTRIBUTING:8），但 README:108 写成 `npm install` |
| 类型检查 | `npx tsc --noEmit` | exit 0，1.3 s | 够（CONTRIBUTING:15） |
| 单元测试 | `npm test` | exit 0，16 文件 205 条，1.5 s | 够（README:110、CONTRIBUTING:16） |
| 构建 | 未跑（AGENTS §3 纪律；`dist/` 是既有产物） | CI 每次都跑 `npm run build` 并绿 | **对外不够**：CONTRIBUTING:20 告诉外部贡献者「不要跑 build」 |
| 首屏预算 | `measure-first-screen.mjs --max 285000` | 284,210 B PASS，余 790 B，约 1 s | 没写进 README 的「跑起来」；CI 也没跑（同 R5-1） |
| dev | 已有 dev server；`localhost:5173` 200；`127.0.0.1:5173` 不监听（`::1`） | 可用 | 半够：README:109 写 localhost；没写「127.0.0.1 连不上」的坑 |
| 截图 | 未跑（`shot.mjs` 会 `localStorage.clear()`，共享 CDP 上会干扰别人） | CDP 9222 超时；9223/9224 可用；脚本硬编码 9222 | **不够**：没有起浏览器/换端口的说明 |
| Windows 宿主 | 未跑（会重建 `host/bin`）；本机 `.tmp/wv2` 与 `.tmp/nsis` 已有缓存 | 脚本前置齐全；干净机器上 WebView2 提示缺 `.tmp`、NSIS 源返回 HTML | **不够**：见 D4-2/3 |
| 打包 | 未跑（写 `release/`） | 本机 `release/` 只有 0.27/0.28/0.30 的 Windows 包 + 旧 `SHA256SUMS.txt` | 半够：`packaging/README.md` 有步骤与沙箱限制 |
| macOS | 未跑（Windows） | 只能静态核对 | **不够**：README:132-133 两条命令都过时 |
| 真机验收 | 未跑（HKCU、SmartScreen、IME 等） | README/AGENTS 已列 UNVERIFIED | 够（但很长，需要索引） |

时间结论：类型检查 + 单元测试 **< 5 s**；`npm ci` + `npm run build` 未测。10 分钟目标主要取决于 npm 下载与第一次 build，不取决于测试。

## 附录 B · `CONTRIBUTING.md` 建议目录与可复用段落

| 节 | 写什么 | 可从哪抄/改 |
| :--- | :--- | :--- |
| 1. 先读 | 项目一句话、读的顺序 | `README.md:3-5`、`AGENTS.md:5` |
| 2. 这是什么 | 本地优先、BYO Key、两套宿主 | `README.md:3-5`、`GLOSSARY.md:3` |
| 3. 环境 | Node 24、npm 11、Windows 11、macOS 13+、Xcode CLT、WebView2 运行时、无需管理员 | `CONTRIBUTING.md:5-8`、`.nvmrc`、`package.json:7-9`、`host/build.ps1:10` |
| 4. 10 分钟上手 | clone → `npm ci` → `npm run dev` → `npm test` | 新写；命令见 D2 改法第 3 条 |
| 5. 目录地图 | src / host / host-mac / packaging / scripts / docs | `README.md:138-155`，改成 8–10 行表 |
| 6. 门禁 | 外部 PR 必跑三条；roundtrip 条件跑；measure 可选 | `AGENTS.md:36-40`、`ci.yml:23-36`；删掉「不要跑 build」 |
| 7. 测试 | 测试文件与实现同目录；**新增测试文件要手动加进 `package.json:14`**；当前 16 文件 205 条 | `src/lib/*.test.ts`、`package.json:14`、AGENTS:73（`katexLazy` 未挂） |
| 8. 代码风格 | 无 linter/formatter；2 空格、单引号、无分号、strict TS；只改相关行 | `tsconfig.json:8`、`src/lib/*.ts` 现状 |
| 9. 提交与分支 | 外部 `type(scope): summary`；内部 `round-NN: …`；一 PR 一事；不 force-push main | `CONTRIBUTING.md:26-30`（拆开） |
| 10. PR 检查单 | CI 三组绿、截图、无新运行时依赖、文档更新、ADR | `ci.yml:23-134`、`AGENTS.md:52`、`AGENTS.md:79` |
| 11. ADR | 何时写、编号、模板、README 索引 | `CONTRIBUTING.md:41-43`、`docs/adr/0013-file-tree-operations.md`、`README.md:157-175` |
| 12. 发布 | 版本语义、tag `v*`、手动 `publish`、`install-verify` 只手动 | `AGENTS.md:56-67`、`release.yml:31-62,190-260`、`ci.yml:135-139` |
| 13. 许可证 | MIT，提交即授权 | `CONTRIBUTING.md:45-47`、`LICENSE:1-21` |

可选第 14 节：行为准则（等有外部贡献者再加，同 R2-9 的判断）。

注意：别把内部调度（根代理、planner/builder、`send_message`、并行文件划分）写进对外 CONTRIBUTING；这些留在 AGENTS.md。

## 附录 C · `SECURITY.md` 建议目录

1. **支持的版本**：`0.30.x` 接收修复；`< 0.30` 只建议升级；pre-1.0 不承诺长期支持。具体措辞待确认。
2. **报告漏洞**：GitHub `Security → Report a vulnerability`（需先开 Private vulnerability reporting；现在 `enabled=false`）。未开启时的替代写法见 D1。
3. **报告里放什么**：版本、平台（Windows 11 / macOS 13+）、安装方式（setup / portable / zip / dev）、复现步骤、影响、最小 PoC。不要附 API Key、文档正文、完整本地路径；日志先脱敏。
4. **响应与披露**：目标时限、是否赏金、是否 90 天协调披露——全部「待产品负责人确认」，不写死。
5. **信任边界**：回环 HTTP 只绑 `127.0.0.1:47821`，校验 `Host`，无 CORS，页面不拿完整路径（`host/Program.cs:1975`、ADR-0005/0006/0009）；同一用户的本机进程本来就能读文件，不在威胁模型内；DNS rebinding 由 Host 校验挡住。
6. **密钥与证书**：用户 Key 明文存 localStorage（`src/lib/settings.ts:23,74`），只发给用户自己配置的端点（`src/lib/ai.ts:106-111`）；CI 的 6 个 Apple secrets 只存 GitHub Secrets；仓库不存证书/私钥；`.gitignore` 缺证书模式（同 R4-K1，本轮建议补）。
7. **数据边界**：`.sidelight/`（草稿/批注/trash）、`recent.json`（磁盘上含完整路径）、`host.log`（安装目录）、`%LOCALAPPDATA%\Sidelight\WebView2`、macOS `~/Library/Application Support/Sidelight`；同步盘会把 `.sidelight/` 一起同步。
8. **日志脱敏**：路径只记 basename（`Program.cs:1680-1686`）；例外是 `navigation starting` 与 `permission` 的完整 URI（`Program.cs:1472,1386`）；1 MB 轮转，保留 `host.log` + `host.log.1`，另有 `.bad` 与 `.migrated`。
9. **范围外**：Tiptap/KaTeX 等上游依赖（报上游，仓库跟进升级）、用户机器配置、社交工程、物理访问。
10. **安全更新怎么发**：正常 Release + CHANGELOG；没有自动更新；修复版在 Release 首行标签名状态。

## 附录 D · `PRIVACY.md` 草案要点

标题下第一行（必须原样保留）：

> **草案。待产品负责人确认；确认前不得作为对外承诺。**

### D-1 数据表（建议直接放进 PRIVACY.md）

| 数据 | 存在哪 | 会不会出网 | 怎么删 |
| :--- | :--- | :--- | :--- |
| 正文、选区、上下文 | 只在内存 | 只有用户点「分析 / 追问 / 联网核对」且配置了服务时，发到用户填的端点；搜索服务收到查询词 | 关文档/关应用即消失 |
| 模型 / 搜索 API Key | `localStorage` 的 `sidelight.settings.v1`；Windows 落盘在 `%LOCALAPPDATA%\Sidelight\WebView2`；macOS 由 WebKit 决定（未核实） | 只随请求发到用户配置的端点（`Authorization: Bearer`） | 设置里清空；或删 WebView2/WebKit 数据目录（会丢设置） |
| 草稿 | `<文档目录>/.sidelight/drafts/<key>.md`；无磁盘句柄时退回 browser localStorage | 不出网 | 保存成功后自动删；也可手动删 `.sidelight/` |
| 批注 / 追问 | `<文档目录>/.sidelight/annotations/<key>.json` | 不出网（追问的请求内容除外） | 手动删 `.sidelight/annotations/` |
| trash | `<工作区>/.sidelight/trash/` | 不出网；不自动清理；卸载不删 | 手动删目录 |
| 最近打开 | Windows `%LOCALAPPDATA%\Sidelight\recent.json`；macOS `~/Library/Application Support/Sidelight/recent.json`，磁盘上含完整路径 | 不出网；页面只拿到 id + 文件名 + 目录段 | 「清除」按钮，或删 `recent.json` |
| 日志 | Windows `<安装目录>\host.log*`；macOS 不写文件 | 不出网 | 删 `host.log*`；卸载随程序目录删除 |
| WebView 配置 | Windows `%LOCALAPPDATA%\Sidelight\WebView2`；macOS WebKit 数据目录（未核实） | 不出网 | 删目录（会丢设置与 Key） |
| 保存临时文件 | 文档同目录 `.sidelight-tmp-*`（成功即替换，失败删除；崩溃可能残留） | 不出网 | 手动删 |
| 导出文件 | 用户选择的位置 | 用户自己决定 | 用户自己删 |

### D-2 必须标「待产品负责人确认」的句子

事实层可以直接写；**承诺层**必须逐句确认，确认前保留标记：

1. 「Sidelight 不做遥测，不上传文档、草稿、批注、最近记录或 API Key。」（「不做」是未来约束）
2. 「Sidelight 没有自己的服务器；模型请求从你的电脑直连你配置的接口地址。」（ADR-0002 说以后可能加托管通道，一旦加就推翻这句）
3. 「API Key 以明文保存在本机，不加密，也没有系统钥匙串。」
4. 「联网核对会把查询词发给 Tavily 或博查；它们各自适用自己的隐私政策。」
5. 「删除 `.sidelight/`、`recent.json`、`host.log*` 与 WebView 数据目录即可清除本机数据；卸载不会删除文档目录里的 `.sidelight/`。」
6. 「trash 不自动清理，删掉的稿件会一直保留到手动清理。」
7. 「我们不卖数据、不投广告、不做用户画像。」（若不写，删掉，不要含糊）
8. 生效日期、联系方式、适用法律/司法辖区、儿童条款、变更通知方式——若写，全部待确认。

### D-3 写法约束

- 不写「我们承诺」直到签字；草案里用「本版实现的事实是……」。
- 每条数据都写「存哪 + 是否出网 + 怎么删」三列，不要只写「只在本机」。
- macOS WebKit 存储路径不许写死；写「由 WebKit 决定，待真机核实」。
- 第三方服务只描述「用户与其直接建立关系」，不要替它们做承诺。

## 附录 E · 未核实

- macOS 真机上的 WebKit 数据目录、Gatekeeper 流程、`⌘C/⌘V/⌘Z`（本机 Windows）。
- macOS 命令修正后的实际输出（只能静态对照 `build.sh` 与 CI）。
- `npm ci` 与 `npm run build` 的干净机器耗时（未跑，见附录 A）。
- NSIS SourceForge 的 GET 行为（只做了 HEAD，返回 text/html；GET 会下载，未跑）。
- 9222 超时是暂时还是长期（只测了一次；9223/9224 正常）。
- 外链点击是否真的触发 WebView 导航（若触发，`host.log` 会记录外部 URL；代码只看到 `navigation starting` 日志，没有拦截或放行逻辑的证据）。
- GitHub 分支保护、required checks、Actions token 权限（匿名 API 读不到，同 R0）。
- 0.30.1（round-17）最终的上限口径与数字；本报告按 0.30.0 + 当前工作区写。

## 附录 F · 优化机会（最多 3 条）

1. **文档数字由脚本生成**：加 `scripts/docs-facts.mjs`，从 `package.json`、`dist/`、`measure-first-screen.mjs`、Release 资产读出版本/体积/测试数，输出一段 Markdown，粘进 README/CHANGELOG。现在 284,210、790 B、16/205、817,983 这些数字靠手抄，每轮都要人工对齐（0.28.1 就漏过一次 51 B）。
2. **文档链接与围栏检查进 CI**：本轮写的两个只读脚本（链接、编码/围栏）合计 < 100 行、< 2 s、零依赖，可放进 `gate` 或单独 job。用户可见文档从此不会再出现坏链或未闭合围栏（当前是 0，正好锁住）。
3. **SECURITY 与 PRIVACY 共用一张数据边界表**：路径、出网、删除三列写成一份 `docs/data-map.md`，两份文档都引用它。否则同一事实（如 `recent.json` 字段、`host.log` 位置）会在三处漂移——本轮已经发现 4 处漂移。
