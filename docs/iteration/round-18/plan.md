# 第 18 轮 · 计划

基线 v0.30.0（HEAD `2ff19bd`）。4 个任务，全部归 B 组（builder2，文档/治理）：T1 对外文档 → T2 模板与发布说明 → T3 安全与 CI → T4 一致性。**不碰 `src/**`、`package.json`、`host*/`、`packaging/*.ps1`**；**不改版本号**（0.30.1 由第 17 轮统一升）。
**构建纪律**：本轮无产品代码改动，A 组不参与。验收以「Markdown 链接全通、围栏配平、隐私句全标待确认、`.gitignore` 逐项 check-ignore、YAML 结构断言」为准；真实 GitHub 解析由推送后 CI 证明。`npm test` 只作回归（不应变化）。

## T1 对外三份文档：CONTRIBUTING / SECURITY / PRIVACY（D1–D3/R1-2/R2-5/R2-6）

- **目标**：第一次贡献者按 CONTRIBUTING 能 clone→`npm ci`→dev→test→截图→PR；安全报告有真实渠道与边界；PRIVACY 草案按代码事实写、**所有承诺句标「待产品负责人确认」**。
- **为什么现在**：D2 实测 CONTRIBUTING 是内部代理说明（`CONTRIBUTING.md:20` 写「实施期间不要跑 build」，对外是错的；无 clone/PR/发布）；D1 实测无 `SECURITY.md` 且私有漏洞报告 `enabled=false`；D3 实测 README 隐私段 4 处与代码不符（`/__recent` 实际回 `{id,seq,name,dir}`；`host.log` 在安装目录；日志含导航完整 URL；WebView 存储位置未核实）。
- **文件**：`CONTRIBUTING.md`、`SECURITY.md`（新）、`PRIVACY.md`（新）
- **步骤**
  1. **重写 `CONTRIBUTING.md`**（约 130–180 行，13 节）：① 先读（README → AGENTS → ADR → GLOSSARY）；② 项目一句话与两套宿主；③ 环境（Node 24 `.nvmrc`、npm 11、Windows 11、macOS 13+ + Xcode CLT、WebView2 运行时、无需管理员/VS Build Tools）；④ 10 分钟上手（`git clone` → `npm ci` → `npm run dev` → `npm test`，注明 dev 用 `localhost:5173`、`127.0.0.1` 连不上）；⑤ 目录地图（8–10 行表）；⑥ 门禁分两档（外部 PR 必跑 `npx tsc --noEmit`、`npm test`、`npm run build`；`npm run roundtrip` 仅在改编辑器/序列化时跑；**删掉「实施期间不要跑 build」**，内部纪律留在 AGENTS）；⑦ 测试（新增测试文件要手动加进 `package.json` 的 test 链，现有 16 文件 205 条）；⑧ 代码风格（无 linter/formatter：2 空格、单引号、无分号、TS strict、只改相关行）；⑨ 提交格式（外部 `type(scope): summary`、内部 `round-NN:`）；⑩ PR 检查单；⑪ ADR（一决策一文件、编号、模板见 ADR-0013）；⑫ 发布（tag `v*` 自动、手动 `tag`+`publish`、`install-verify` 只手动）；⑬ 许可证与贡献授权。
  2. **新增 `SECURITY.md`**（10 节）：支持版本 `0.30.x`（`<0.30` 只建议升级）；报告渠道**两态写清**——已开启用 `https://github.com/XuJingye2022/SideLight/security/advisories/new`，未开启（当前 `enabled=false`）写「不要在公开 Issue 写细节；先开 Issue 只写『需要私下报告渠道』，维护者再开私有通道」；**不编造邮箱**；报告内容（版本/平台/安装方式/复现/影响，不附 Key、正文、完整路径，日志先脱敏）；范围（前端/`host/`/`host-mac/`/`packaging/`/workflows）与范围外（Tiptap/KaTeX 上游、本机配置、社交工程）；**信任边界**（回环 HTTP 只绑 `127.0.0.1:47821`、校验 `Host`、无 CORS、页面不拿完整路径）；**密钥边界**（Key 明文存 `localStorage`、只发用户配置端点、永远不索要 Key；Apple secrets 只在 GitHub Secrets、仓库不存证书）；**日志脱敏**（路径只记 basename；例外 `navigation starting`/`permission` 记完整 URI）；响应时限、披露窗口、赏金三句均标「待产品负责人确认」。
  3. **新增 `PRIVACY.md` 草案**：首行固定「**草案。待产品负责人确认；确认前不得作为对外承诺。**」；数据表按「存哪 / 是否出网 / 怎么删」三列覆盖：正文与上下文（内存）、Key（`localStorage` → Windows `%LOCALAPPDATA%\Sidelight\WebView2`；macOS 由 WebKit 决定、未核实）、草稿（`.sidelight/drafts`，无句柄退回 localStorage）、批注（`.sidelight/annotations`）、trash（`.sidelight/trash`，**不自动清理、卸载不删**）、最近记录（`recent.json` 磁盘含完整路径，页面只拿 id+文件名+目录段）、日志（Windows 安装目录 `host.log*`；macOS 不落盘）、WebView 配置、保存临时文件（`.sidelight-tmp-*`）、导出文件；出网时机（仅用户点分析/追问/联网核对且配置了服务；搜索服务收到查询词）；8 条承诺句逐条标「待产品负责人确认」（不做遥测/无自建服务器/Key 明文无钥匙串/搜索查询词/删除范围/trash 不自动清理/不卖数据/生效日期与联系方式与司法辖区）。
- **验收**
  1. 三份文件存在；`SECURITY.md` 含两种渠道文案且没有邮箱；`PRIVACY.md` 每条承诺句后都有「待产品负责人确认」，`Select-String PRIVACY.md -SimpleMatch '待产品负责人确认'` 计数 ≥ 8。
  2. `CONTRIBUTING.md` 每条命令都能在 `package.json`/`scripts/` 找到；`Select-String CONTRIBUTING.md -SimpleMatch '不要跑 build'` 0 命中；含 `git clone`、`npm ci`、`localhost:5173`。
  3. 事实核对：`PRIVACY.md` 中 `recent.json` 句含「文件名」「目录段」；`host.log` 句写「安装目录」；日志句写「导航的完整 URL」；`Select-String PRIVACY.md -SimpleMatch '不拿路径'` 0 命中。
- **门禁**：`Select-String` 断言 + `npm test`（回归，不应变化）
- **风险与回退**：对外承诺写过头会被逐字引用；隐私事实写错比不写更糟，必须逐条对代码出处（`host/Program.cs`、`Documents.swift`、`settings.ts`、`ai.ts`、`search.ts`）。回退：`git checkout -- CONTRIBUTING.md` 并删 SECURITY/PRIVACY。
- **难度** M ｜ **量级** 280–380 行

## T2 模板、发布说明与 README 入口（D5-14/R2-1..R2-4/R3）

- **目标**：Issue/PR 有结构化模板；Release 正文从「两行签名」变成可执行下载页；README 有文档索引与 CI badge。
- **为什么现在**：R1-2 实测社区健康度 57%、`issue_template`/`pr_template` 为 null；R3 实测 v0.30.0 Release 正文只有两行（`signing=adhoc` 暴露给用户），缺下载表、SmartScreen、Gatekeeper、已知限制、CHANGELOG 链接；D5-14 实测 README 没有 badge 与「参与贡献」入口。
- **文件**：`.github/ISSUE_TEMPLATE/bug.yml`（新）、`feature.yml`（新）、`config.yml`（新）、`.github/PULL_REQUEST_TEMPLATE.md`（新）、`scripts/release-notes.mjs`（新）、`.github/workflows/release.yml`、`README.md`
- **步骤**
  1. `bug.yml`：name/description/`labels: [bug]`；顶部 markdown 写「先读 README 已知限制、先搜 Issue、不要贴 Key/正文/完整路径」；必填版本、系统（Windows 11/10、macOS 15+/13–14、其他）、安装方式（setup/portable/macOS zip/dev）、复现步骤、期望、实际；可选日志（先脱敏）；三个必勾 checkbox。
  2. `feature.yml`：问题、提案、替代方案、影响面、是否愿意提 PR；`labels: [enhancement]`，只用已存在标签。
  3. `config.yml`：`blank_issues_enabled: false`；contact links 指向「已知限制」与「报告安全问题」；后者仅当私有漏洞报告开启后启用，**未开启先只留第一条**并在文件注释说明。
  4. `PULL_REQUEST_TEMPLATE.md`：关联 Issue、改了什么/为什么、影响面勾选、门禁输出（tsc/test/build，改序列化加 roundtrip）、截图、数据安全（是否动保存/缓存/最近记录）、无新运行时依赖、MIT 授权、回滚说明。
  5. **`scripts/release-notes.mjs`（新）**：读 `package.json` 版本、`docs/CHANGELOG.md` 当节、`out/`（或 `release/`）三个资产的字节与 SHA256 生成 `RELEASE_NOTES.md`；模板固定六节：本次更新（CHANGELOG 压缩 3–6 条）、下载表（平台/文件/字节/SHA256）、Windows 首次打开（SmartScreen「更多信息 → 仍要运行」、WebView2、安装路径、卸载）、macOS 首次打开（15+ 系统设置「仍要打开」/13–14 右键/`xattr`、Universal、每次更新重做）、数据与卸载（`%LOCALAPPDATA%\Sidelight`、`.sidelight/`）、已知限制（未签名、无自动更新、`.md` 默认不关联）；签名状态放正文首行，`signing=` 改为 HTML 注释。
  6. `release.yml`：release job 在 checksums 之后调用脚本，`body_path: out/RELEASE_NOTES.md`，`append_body: false`（重跑整份替换）；preflight 可加「正文含三个资产名」断言（可选）。
  7. README：标题下加 CI badge（`https://github.com/XuJingye2022/SideLight/actions/workflows/ci.yml/badge.svg?branch=main`，**不引 shields**）；加「参与贡献」段链接 `CONTRIBUTING.md`、`SECURITY.md`、`PRIVACY.md`（标草案）、`AGENTS.md`、`LICENSE`、`GLOSSARY.md`、`docs/adr/`——**索引 5 个以上链接**。
  8. `CODEOWNERS` **本轮不加**（单维护者 + 无分支保护价值低），写进 `impl-b.md` 记录。
- **验收**
  1. 四个模板文件存在；`bug.yml`/`feature.yml`/`config.yml` 的 `labels` 只用 `bug`/`enhancement`；`config.yml` 第二条 contact link 未启用时不出现在生效内容里（或文件保留并注释）。
  2. `release-notes.mjs` 本地可跑：用现有 `release/`（无产物则以假资产）输出含「## 下载」「## 安装」「### Windows」「### macOS」「## 校验」「## 已知限制」六节，且正文不含可见 `signing=`。
  3. `release.yml` 的 `body_path` 指向 `out/RELEASE_NOTES.md` 且 `append_body: false`；`Select-String release.yml -SimpleMatch 'signing.txt'` 0 命中。
  4. README 含 badge URL 与「参与贡献」，索引链接数 ≥5；不出现 `shields.io`。
- **门禁**：上述 `Select-String`/`Test-Path` + `node scripts/release-notes.mjs --dry-run` + `npm test`
- **风险与回退**：改 `release.yml` 影响真实发布，若脚本路径/文件名不符会让预检失败；`body_path` 与 `append_body` 必须成对改。回退：`git checkout -- .github/ README.md` 并删模板与脚本。
- **难度** M ｜ **量级** 220–300 行

## T3 安全与 CI 小修：`.gitignore`、体积门、`install-verify` 开关（R4-K1/K7/R5-1/R5-2）

- **目标**：证书/私钥/`.env`/`.sidelight/`/`.dmg` 不再可能被误提交；首屏 285,000 从文档承诺变成 CI 事实；`install-verify` 只在明确勾选时跑。
- **为什么现在**：R4-K1 实测 `cert.p12`、`apple.pfx`、`id_rsa`、`.env`、`signing.key`、`debug.pem`、`installer.dmg` 全部 **NOT-IGN**；R5-1 实测 `gate` 只跑 build+test、`measure` 从不被调用；R5-2 实测任何手动 dispatch 都会安装/卸载一遍。
- **文件**：`.gitignore`、`.github/workflows/ci.yml`
- **步骤**
  1. `.gitignore` 追加：`*.p12`、`*.pfx`、`*.pem`、`*.key`、`*.cer`、`*.mobileprovision`、`.env`、`.env.*`、`!.env.example`、`.sidelight/`、`*.dmg`（保留已有 `release/`、`dist/`、`host/bin/`、`.tmp/`、`*.zip`）。
  2. `ci.yml`：`gate` 的 `npm run build` 后加 `node scripts/measure-first-screen.mjs --max 285000`（必过，不加 `continue-on-error`）。
  3. `ci.yml`：`workflow_dispatch` 加 `inputs.run_install_verify`（boolean，默认 false）；`install-verify` 的 job 条件改为 `github.event_name == 'workflow_dispatch' && inputs.run_install_verify && success()`；在 README/CONTRIBUTING 注明它只手动、会写 HKCU 与开始菜单。
  4. 不 pin action SHA（R4-K5 记录延后，写进 `impl-b.md`）。
- **验收**
  1. `git check-ignore -v` 对 `x.p12`、`x.pfx`、`x.pem`、`x.key`、`x.cer`、`x.mobileprovision`、`.env`、`.sidelight/drafts/a.md`、`x.dmg` 全部命中；`.env.example` 若存在不被忽略。
  2. `Select-String .github/workflows/ci.yml -SimpleMatch 'measure-first-screen'` ≥1 且在 `gate` 内；无 `continue-on-error` 落在该步。
  3. `Select-String ci.yml -SimpleMatch 'run_install_verify'` ≥2（输入定义 + job 条件）；默认值为 `false`。
  4. YAML 结构：无 tab 缩进、`jobs:` 下缩进一致；若本机有 Python3+PyYAML，用 `python -c "import yaml;yaml.safe_load(open('.github/workflows/ci.yml',encoding='utf-8'))"` 全量解析通过；否则记录「由 GitHub 解析验证」。
- **门禁**：上述 `check-ignore`/`Select-String` + `npm test`
- **风险与回退**：`.gitignore` 全局模式可能挡住未来需要的测试样本（保留 `!.env.example` 与必要时 `!fixtures/**`）；`install-verify` 条件写错会让它永不运行——验收第 3 条兜。回退：`git checkout -- .gitignore .github/workflows/ci.yml`。
- **难度** S ｜ **量级** 30–60 行

## T4 一致性修正：README/CHANGELOG/STATE/packaging（D4/D5/R4-K8）

- **目标**：用户文档与代码、验收报告、实际包名一致；无 0.29/旧包名残留；坏编号与坏围栏修掉；隐私段与 PRIVACY 对齐。
- **为什么现在**：D5 实测 README:62 说「不能重命名文件」与 :51 相反；CHANGELOG 0.30.0 写「48/48」但验收是 27/27、43/48 适用；README:132-133 macOS 命令过时（`-macos-<arch>`、`.tmp/mac/Sidelight.app`、缺 `--require-bundle`）；STATE:24 仍写 15 个测试文件；`packaging/README.md` 两个「4.」。
- **文件**：`README.md`、`docs/CHANGELOG.md`、`docs/iteration/STATE.md`、`packaging/README.md`、`.github/workflows/release.yml`（description）
- **步骤**
  1. `README.md:62`：改「不能移动、复制文件，也不能删目录；重命名只支持同目录 `.md`/`.markdown`」。
  2. `README.md:132-133`：`bash host-mac/build.sh` → `-macos-universal.zip`；自测路径 `.tmp/mac/stage/Sidelight.app/Contents/MacOS/SidelightMac --self-test --require-bundle`。
  3. `README.md:64`：不再指本地 `release/`，改成「从 Releases 页下载」；`README.md:80/82/86` 按 T1 的 PRIVACY 事实改（recent 含文件名与目录段；日志在安装目录且含导航 URL；macOS `recent.json` 在 Application Support、WebView 存储未核实；补 `%LOCALAPPDATA%\Sidelight\WebView2`）。
  4. `README.md:110/147`：测试数改「以 `npm test` 输出为准」或实测 16/205；`:147` 的 16 个测试文件与磁盘 17 的区别写清（`katexLazy.test.ts` 未挂）。
  5. `README.md:64` 的「没有代码签名」拆平台：Windows 未签名；macOS 默认 ad-hoc、配 Apple secrets 后可签名+公证。
  6. `docs/CHANGELOG.md`：0.30.0 条目改「48 组中 43 组适用、5 组排除、全部通过；`theme-acceptance` 27/27」；回填 0.30.0 三资产字节与 SHA（817,983 / 902,274 / 890,004），删「出包后回填」；历史条目加一句「（数字为后续版本回填）」。
  7. `docs/iteration/STATE.md:24`：15 → 16 个文件 205 条；`:105/107` 的轮次引用改为当轮。
  8. `packaging/README.md`：两个「4.」改 4./5.；`:24` 的日志位置改「安装目录 `host.log*`，随程序目录卸载删除」；示例字节换 0.30.0。
  9. `.github/workflows/release.yml:10` 的示例 tag 改 `v0.30.0`；旧包名（`-macos-<arch>`、`Sidelight-0.30.0-win` 硬编码路径）全仓扫描清零（历史 CHANGELOG 条目除外）。
- **验收**
  1. `Select-String README.md -SimpleMatch '不能移动、复制、重命名文件'` 0 命中；`-macos-universal.zip`、`--require-bundle`、`.tmp/mac/stage` 各 ≥1；无 `Sidelight-0.30.0-win`、无 `-macos-<arch>`。
  2. README 隐私段不含「不拿路径」；含「文件名」「目录段」「安装目录」「导航的完整 URL」。
  3. CHANGELOG 含「43 组」「27/27」「817,983」；`Select-String CHANGELOG -SimpleMatch '出包后回填'` 0 命中（0.30.0 节）。
  4. STATE:24 含 16 个文件；`packaging/README.md` 的编号序列为 1./2./3./4./5.；`.md` 围栏配平（`^```` 计数偶数）、无 BOM（`docs/CHANGELOG.md` 特别检查）。
- **门禁**：上述 `Select-String` + `npm test`
- **风险与回退**：CHANGELOG 历史回填容易改错旧条目，只动 0.30.0 节与一句总注；README 改动多，逐条对 D5 表。回退：`git checkout -- README.md docs/CHANGELOG.md docs/iteration/STATE.md packaging/README.md .github/workflows/release.yml`。
- **难度** M ｜ **量级** 120–180 行

## 文件归属与执行顺序（零重叠）

| 任务 | 组与执行点 | 独占文件 |
| :--- | :--- | :--- |
| T1 | B（builder2，先做） | `CONTRIBUTING.md`、`SECURITY.md`（新）、`PRIVACY.md`（新） |
| T2 | B（builder2，T1 后） | `.github/ISSUE_TEMPLATE/bug.yml`（新）、`feature.yml`（新）、`config.yml`（新）、`.github/PULL_REQUEST_TEMPLATE.md`（新）、`scripts/release-notes.mjs`（新）、`.github/workflows/release.yml`、`README.md`（索引与 badge） |
| T3 | B（builder2，T2 后） | `.gitignore`、`.github/workflows/ci.yml` |
| T4 | B（builder2，T3 后） | `README.md`、`docs/CHANGELOG.md`、`docs/iteration/STATE.md`、`packaging/README.md`、`.github/workflows/release.yml`（description） |

- 零重叠：本轮只碰 `.md`、`.github/**`、`.gitignore`、`release.yml`、`scripts/release-notes.mjs`；**不碰 `src/**`、`package.json`、`host*/`、`packaging/*.ps1`**。`README.md` 由 T2/T4 串行改（同一人），不并行。
- 顺序：T1 → T2 → T3 → T4 → 根代理复核（链接/围栏/编码检查脚本）+ 推分支观察 CI。
- 报告：B 组 `docs/iteration/round-18/impl-b.md`，根代理合并 `impl.md`；无 UI 变化，不截图。

## 必须人工确认的清单（不经确认不得写成承诺）

1. **私有漏洞报告入口**：是否在 GitHub Settings 打开（决定 SECURITY 的渠道文案与 `config.yml` 第二条链接）。
2. **响应时限、披露窗口（如 90 天）、是否赏金**：SECURITY 三句。
3. **PRIVACY 的 8 条承诺句**：不做遥测、无自建服务器、Key 明文无钥匙串、搜索把查询词发给服务商、删除范围、trash 不自动清理、不卖数据、生效日期/联系方式/司法辖区/儿童条款。
4. **LICENSE 版权人**：`XuJingye` 还是 `Sidelight contributors`（与 STATE 决定冲突，二选一）。
5. **仓库名 `SideLight` 与产品名 `Sidelight`**：是否 1.0 前改名（旧 URL 会重定向）。
6. **GitHub 设置项**：topics 补 AI/local-first、labels（`windows`/`macos`/`needs-info`/`security`）、分支保护、`v*` tag 保护、deploy key 轮换——本轮只写建议，不改设置。
7. **截图瘦身/历史重写**（`git filter-repo`，破坏性）与 Release 发布动作：由人决定/执行。

## 本轮不做（写进下轮建议）

**GitHub 仓库设置变更**（私有漏洞报告、topics、labels、分支保护、tag 保护）、**隐私承诺定稿**、**截图转 WebP 与 `filter-repo` 瘦身**、**action pin 到 SHA/Dependabot**、**CODEOWNERS/行为准则**、**安装包脚本的 NSIS 下载源修正**（文档先写前置）。真实 GitHub 渲染、YAML 解析、`release.yml` 首跑仍由推送后 CI 证明。

## 本轮 Demo（≤3 条用户可见变化）

1. Release 页从两行签名说明变成可执行下载页：下载表、Windows SmartScreen、macOS Gatekeeper 两档、数据位置、已知限制、CHANGELOG 链接。
2. README 有「参与贡献」入口与 CI badge；贡献者按 CONTRIBUTING 能走完 clone → `npm ci` → dev → test → PR。
3. 安全报告有渠道与边界说明（不再只有公开 Issue）；`PRIVACY.md` 用「存哪/是否出网/怎么删」三列说清每类数据（承诺句待确认）。

## 风险最高的任务

**T1**。三份对外文档里，PRIVACY 与 SECURITY 的每一句都会被逐字引用：事实写错（把 `/__recent` 说成「不拿路径」、把日志说成只在 `%LOCALAPPDATA%`）比不写更糟；承诺句若漏标「待产品负责人确认」，等于替产品负责人做了对外承诺。缓解是每条事实都对代码出处（`host/Program.cs`、`Documents.swift`、`settings.ts`、`ai.ts`、`search.ts`），并用脚本断言「待确认 ≥8 处」「不拿路径 0 命中」。次高是 T2：改 `release.yml` 的 `body_path`/`append_body` 会直接影响下一次真实发布，写错会让正文回退或重复。

## 下一轮建议主题

**发布与供应链收口**：按 R3 首跑一次新的 release-notes 流程并回填 0.30.x；决定 action pin/Dependabot 与分支保护；截图转 WebP 并评估 `filter-repo`（需人批准）；把「链接/围栏/编码」检查与 `measure` 一起进 CI；隐私承诺经产品负责人确认后去掉「草案」标记。
