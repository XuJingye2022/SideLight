# 第 19 轮 · 发布与仓库健康（finder 报告）

日期：2026-11-16 09:41–10:20（Asia/Shanghai）。仓库 `D:\Documents\SidelightProgram`，branch `main`。
只侦察，未改 `src/`、未改设置、未 commit、未推 tag。

**快照声明**：侦察开始时 `package.json` 是 **0.30.1**（09:41 读数），09:55 变为 **0.30.2**（根代理正在写发布）。本报告以 **09:55 之后的状态**为准，并标出变更前后的差异。凡是"当前"都指 2026-11-16 10:15 的读数。

**读过的文件**：`docs/iteration/STATE.md`、`docs/iteration/round-19/brief.md`、`docs/iteration/round-17/test.md`、`docs/iteration/round-18/test.md`、`.github/workflows/release.yml`、`.github/workflows/ci.yml`、`.gitignore`、`README.md`、`SECURITY.md`、`PRIVACY.md`、`AGENTS.md`、`docs/CHANGELOG.md`、`docs/adr/0004-webview2-host-before-admin.md`、`scripts/release-notes.mjs`、`package.json`、`package-lock.json`、`.gitattributes`。

**跑过的命令**（全部只读）：`git status`、`git ls-files`、`git check-ignore`、`git count-objects -vH`、`git ls-remote`、`npm test`、`node scripts/release-notes.mjs --dry-run`、GitHub REST API（`/repos`、`/releases`、`/rulesets`）。

---

## S1 · 0.30.2 发布清单与 `release.yml` 风险

### S1.1 版本链条：已对齐（09:55 后）

| 项 | 值 | 证据 |
| :--- | :--- | :--- |
| `package.json` version | **0.30.2** | 实测 `node -p "require('./package.json').version"` → `0.30.2` |
| `package-lock.json` | **0.30.2**（两处） | `package-lock.json:3`、`:9` |
| CHANGELOG 条目 | **有**，`## 0.30.2 — 2026-11-16` | `docs/CHANGELOG.md:5`，5 条 bullet，L9–13 |
| README 资产引用 | **0.30.2** | `README.md:94`、`README.md:105` 均指 `SHA256SUMS-0.30.2.txt` |
| AGENTS 当前状态 | **0.30.2** | `AGENTS.md` §6 首行 |
| 应用内版本号 | 不需要改 | `src/**` 无版本常量（`src/App.tsx` 只有保存代际 `version` 字段，L545/2806/2843，与产品版本无关）；`index.html` 无版本；`vite.config.ts` 无 `define` |
| macOS 包版本 | 由 `package.json` 注入 | `host-mac/build.sh:11` 读版本，`:115` `sed __VERSION__` → `Info.plist:15-18` |
| Windows 安装包版本 | 由 `package.json` 注入 | `packaging/installer.ps1:9` 读版本，`:60` 传 `/DAPPVERSION=`；`installer.nsi:101` 写 `DisplayVersion` |

结论：preflight 的两条断言（tag = `v<version>`、CHANGELOG 有该节）**当前能过**。09:41 时不能过（当时 `package.json` 0.30.1、CHANGELOG 顶节 0.30.1，但 README 已写 0.30.2）—— 这个短暂不一致已被根代理修掉，但说明"先改 README 再改版本"的顺序会制造窗口。

### S1.2 发布说明脚本：可跑，内容有两处噪音

命令：`node scripts/release-notes.mjs --dry-run` → exit 0，六节齐全，首行 `# Sidelight 0.30.2`，签名状态行是 HTML 注释 `<!-- signing=adhoc … -->`，未创建 `out/`。

两处问题：

- **N1（小）**：「本次更新」取 CHANGELOG 该节前 6 条 `- ` 开头的行（`scripts/release-notes.mjs:20-32`，`.slice(0, 6)`）。0.30.2 的取到 5 条，其中最后一条是「体积与 SHA256 见 Release 页的 `SHA256SUMS-0.30.2.txt`」—— 与下面「下载」表重复。第 3 条「不升 1.0 的理由」也进更新列表，读起来不像更新项。证据：`--dry-run` 实际输出。
- **N2（小）**：签名状态取自 `process.env.SIGNING` 或 `out/signing.txt`，都没有就默认 `adhoc`（`:47-55`）。**默认值是"未签名"**，方向安全（不会把未签名说成已签名）。`release.yml:190` 确实传了 `SIGNING`。

### S1.3 `release.yml` 的坑（按严重度）

| # | 坑 | 证据 | 影响 |
| :--- | :--- | :--- | :--- |
| **R1** | `release` job 的 `checkout` **没有 `ref`** | `release.yml:192` 只有 `uses: actions/checkout@v4`；对比 `:39`、`:74`、`:136` 都有 `ref: ${{ inputs.tag \|\| github.ref }}` | `workflow_dispatch` 时检出的是**默认分支**，`release-notes.mjs` 读默认分支的 `package.json`/CHANGELOG。补发旧 tag（如 0.30.1）会拿到 0.30.2 的正文，与 preflight 的 `VERSION` 不符，`release.yml:232-234` 的 `grep` 断言会失败。**方向安全（会红），但"补发"能力等于没有** |
| **R2** | 发布流水线**不跑测试、不跑首屏预算** | `release.yml:79-95`：`npm ci` → `npm run build` → host build → `host-smoke.mjs` → 打安装包。`ci.yml:38-40` 才有 `measure-first-screen.mjs --max 285000` 与 `npm test` | tag 可以从一个 CI 没过的 commit 打出来，装出的包可能超首屏预算或带测试失败。0.30.x 的硬线 285,000 B 只剩 **270 B** 余量（`CHANGELOG.md:12`），这个风险不是理论的 |
| **R3** | `concurrency` 组按 **ref** 而不是版本 | `release.yml:21-23` `group: release-${{ github.ref }}`、`cancel-in-progress: false` | tag push 的组是 `release-refs/tags/v0.30.2`，手动 dispatch 的组是 `release-refs/heads/main` —— **两者不互斥**，同一版本可并发双跑。两个 job 都会走到 `overwrite_files: true`，结果取决于谁后结束 |
| **R4** | 旧资产清理**只匹配 `-macos-arm64.zip`**，且只在 push 触发时跑 | `release.yml:238-250`（`if: github.event_name == 'push'`；`grep -- '-macos-arm64.zip'`） | 同 tag 重跑时，其他命名的残留（例如手工上传的旧包、将来的 `-x64.zip`）不会被清。`overwrite_files: true` 只覆盖同名文件 |
| **R5** | **tag 不存在时会被 action 创建**，且可能建错 commit | `release.yml:252-264` 传 `tag_name: v<version>`，未断言 tag 已存在；preflight 只校验**名字**（`:54-57`）。`softprops/action-gh-release` 在 tag 缺失时按 `target_commitish`（默认当前 checkout 的 commit）建 tag | `workflow_dispatch` + `publish: true` + 写错 tag 时，会把一个新 tag 钉在默认分支 HEAD 上并**立刻发布**（`:183` 的 `if` 为真），事后要删 release + 删 tag + 重发 |
| **R6** | 签名状态是**步骤自报**，不是对产物的实测 | `release.yml:157-164` 只看 `HAS_APPLE_SIGNING` 就写 `signing=developer-id-notarized`；`host-mac/verify.sh` 只验 `LSMinimumSystemVersion`（`verify.sh:38-39`）和包内文件，没有 `codesign --verify --strict` | 若 `sign.sh` 静默降级（脚本内 `|| true` 一类），Release 页会写「已签名并公证」而实际是 ad-hoc。当前 `sign.sh` 失败会让 job 红（`release.yml:154` 无容错），所以是**潜在**问题，不是当前故障 |

### S1.4 已经稳的部分（不要再改）

- 最小权限：两 workflow 顶层 `permissions: contents: read`（`release.yml:18-19`、`ci.yml:18-19`），只有 `release` job 提权 `contents: write`（`release.yml:187-188`）。无 `pull_request_target`。
- 三资产 + 校验和四文件断言，且 `sha256sum -c` 复验（`release.yml:210-226`）。`fail_on_unmatched_files: true`（`:264`）。
- `body_path` + `append_body: false`（`:257-258`）方向正确；0.30.1 的 Release body 六节完整（GitHub API 实测）。
- 工具链固定：`WV2_VERSION`/`WV2_SHA256`/`NSIS_SHA256`（`:25-28`），`windows-2022` 固定（`:66`）。
- `npm test` 实测 **16 文件 / 205 条 / 0 失败**（本轮跑过）。

---

## S2 · 仓库健康

### S2.1 体积：截图占 91%，且在长

| 指标 | 实测值 | 命令 |
| :--- | :--- | :--- |
| 跟踪文件数 | **909** | `git ls-files \| wc` → 909 |
| 跟踪总字节（工作树） | **42,119,099 B（40.17 MB）** | 逐文件 `Length` 求和 |
| `shots/` | **556 文件 / 38,387,095 B（36.61 MB）** | `Get-ChildItem shots -Recurse` |
| `shots/` 占比 | **91.1%** | 38,387,095 / 42,119,099 |
| 最大单文件 | **335,283 B**（`shots/round-02/t4-portable.png`） | 同上排序 |
| `src/` 最大单文件 | 171,672 B（`src/App.tsx`） | 同上 |
| 非 `shots/` 中 >1 MB 的跟踪文件 | **0 个** | 已扫 |
| `.git` 目录 | **45.72 MB** | `Get-ChildItem .git -Recurse` |
| `git count-objects -vH` | 松散 149 个 / 3.61 MiB；**pack 41.91 MiB** | `git count-objects -vH` |
| GitHub `size` | **43,261 KB（≈42.25 MiB）** | `GET /repos/XuJingye2022/SideLight` |

**增长**：round-18 记录 550 文件 / 35.45 MB（`round-18/findings-repo.md:14,320`），本轮 **556 文件 / 36.61 MB**，即 +6 文件 / **+2.94 MB**。来源是 round-17 的 9 张（647,133 B）与 round-18 的 5 张（872,460 B）证据图。按此速度，再 10 轮会到 ~65 MB。

结论：这不是"要不要瘦身"的问题，是"每次迭代都在加 1–3 MB 不可变历史"的问题。删 HEAD 里的旧图**不会**缩小 clone（历史 blob 仍在 `.git`）。真要瘦身必须重写历史（`git filter-repo`），属破坏性操作，需产品负责人同意，本轮不做。**可行的非破坏动作**：新截图默认不进 `shots/`（见 S5-1）。

### S2.2 `.gitignore` 逐项复核

`git check-ignore -v --no-index` 逐条实测，25 条规则全部命中预期：

| 类别 | 路径样例 | 命中规则 |
| :--- | :--- | :--- |
| release 产物 | `release/`、`release/x.exe` | `.gitignore:10:release/` |
| 构建产物 | `dist/`、`dist/index.html` | `:2:dist` |
| 临时目录 | `.tmp/`、`.tmp/wv2/`、`.tmp/r19-ship/probe.txt` | `:8:.tmp/` |
| 缓存 | `.sidelight/`、`.sidelight/drafts/a.md` | `:24:.sidelight/` |
| 依赖 | `node_modules/`、`.npm-cache/` | `:1`、`:7` |
| 宿主产物 | `host/bin/`、`host/bin/SidelightHost.exe`、`host-mac/.build/`、`.build/` | `:9`、`:13`、`:12` |
| 压缩/镜像 | `x.zip`、`x.dmg`、`x.app/` | `:11`、`:25`、`:14` |
| 证书/密钥 | `a.p12`、`a.pfx`、`a.pem`、`a.key`、`a.cer`、`a.mobileprovision` | `:15`–`:20` |
| 环境变量 | `.env`、`.env.local` | `:21`、`:22` |
| 浏览器 profile / 日志 / 本地文件 | `.edge-profile-1`、`a.log`、`host.log`、`x.local`、`.DS_Store` | `:6`、`:4`、`:4`、`:3`、`:5` |

`.env.example`：`git check-ignore -q` **exit 1**（不被忽略），白名单 `!.env.example`（`:23`）生效；仓库当前没有这个文件（`git ls-files --error-unmatch` exit 1）。

**未忽略的一处（P2）**：`out/` 不在 `.gitignore`。`release-notes.mjs` 的默认 `--dir` 是 `out`（`:17-18`），本地不带 `--dry-run` 跑一次就会生成 `out/RELEASE_NOTES.md`，可被误 `git add`。当前 `git ls-files out` 为空，尚未发生。建议加 `out/`。

### S2.3 密钥 / 证书 / 产物入库：0 命中

- `git ls-files` 用 `(?i)(\.p12|\.pfx|\.pem|\.key$|\.cer$|\.mobileprovision|\.env|secret|credential|token|\.tmp/|^release/|^dist/|\.sidelight/|host\.log|/out/)` 过滤 → **0 行**。
- `src`/`scripts`/`host`/`host-mac`/`packaging` 按 `sk-…`、`ghp_…`、`tvly-…`、`AKIA…`、`BEGIN … PRIVATE KEY`、`api_key=…` 扫描 → **0 命中**。
- `release/` 在磁盘上有 9 个文件（0.27.0–0.30.1 的历史包），全部被忽略，未入库。0.30.2 尚未构建（正常）。
- `docs/iteration` 跟踪 **157** 个 `.md`；55 个 findings（18 轮 × 3 + 本轮 1）、32 个 `impl*.md`、18 份 `plan.md`、18 份 `test.md`、17 份 `plan-review.md`。

### S2.4 GitHub 设置：无保护，凭据缺失

- **无 tag 保护、无 branch ruleset**：`GET /repos/XuJingye2022/SideLight/rulesets` → `[]`（2026-11-16 实测）。`GET /branches/main/protection` 匿名请求 404 —— **无法区分"未保护"与"需鉴权"，标 UNVERIFIED**。
- **本机无可用 SSH 凭据（P0，见 S1.5）**：`git ls-remote --heads origin` → `git@ssh.github.com: Permission denied (publickey).`。`%USERPROFILE%\.ssh` 只有 `known_hosts`（858 B）与 `known_hosts.old`，**无任何私钥**，无 `config`，`core.sshCommand` 为空。STATE `:100` 记的 write deploy key `sidelight-agent` 不在这台机器的默认位置。
- **deploy key 形态建议**：STATE 记的是 **write** deploy key。GitHub 的 write deploy key **默认绕过 branch protection**。若 1.0 前加保护，应改成「只读 deploy key + fine-grained PAT（`contents: write`、仅本仓库、短期）」。
- **建议的 tag 保护**（用 ruleset，不用旧版 protected tags）：target = `v*`，规则 = Restrict creations + Restrict updates + Restrict deletions，bypass = 仓库管理员。理由：**tag 直接触发发布**（`release.yml:4-6`），tag 是唯一能把包发到公网的入口。
- **建议的 main 保护**：require status checks = `gate`、`windows-host`、`macos-host`（`ci.yml:28,44,111` 三个 job 名）。注意 `install-verify` 是手动 job（`ci.yml:145`），**不要**列为必过。
- 供应链（P2）：第三方 action 用 major tag（`actions/checkout@v4`、`softprops/action-gh-release@v3`），未固定 SHA。仓库对 WebView2 SDK 与 NSIS 都做了 SHA256 校验，action 反而更松。

---

## S3 · 20 轮收尾检查表

图例：✅ 齐 / ⚠️ 有但不一致 / ❌ 缺

| 检查项 | 状态 | 证据与缺口 |
| :--- | :---: | :--- |
| 20 份 `plan.md` | ❌ **18/20** | round-01…18 各 1 份；round-19 只有 `brief.md`；round-20 目录不存在 |
| 20 份 `test.md` | ❌ **18/20** | round-01…18 各 1 份；round-19/20 无 |
| `plan-review.md` | ⚠️ **17/18** | round-18 缺（其余齐） |
| `findings-*.md` | ⚠️ **54+1** | round-01…18 各 3 份；round-19 本轮 3 份（本文件是其一） |
| `impl` 报告 | ⚠️ 命名不一 | 32 个 `impl*.md`，0 个 `impl.md`；**round-17 `impl-b.md` 不存在**（`round-17/test.md:62` 已记） |
| STATE 轮次记录 **行 1–20** | ❌ **1–16** | `STATE.md:60-77` 只有 16 行。缺 17（0.30.1）、18（文档轮）、19（本轮）、20 |
| STATE「当前版本与体积」 | ❌ 过期 | `STATE.md:52` 仍是 **v0.30.0** / 首屏 284,210 B；实际 0.30.2 / 284,730 B |
| STATE「发布状态」 | ❌ 过期 | `STATE.md:93` 「最新发布」仍指 **v0.30.0**；0.30.1 已发（setup 818,553 / zip 902,786 / mac 890,510，GitHub API 实测） |
| STATE 待办池 | ❌ 误导 | `STATE.md:83` 仍写「**第 17 轮待修 P0**：B1 跨文档覆盖、B3 丢字、B2 5.9 MB 卡死」；三项已由 0.30.1 修完（`CHANGELOG.md:9-11`，`round-17/test.md:13-31` PASS） |
| ADR | ⚠️ 15 份，无新缺口但有一处未落 | 0001–0015 齐。**文档上限 6 MiB → 5.5 MiB 是用户可见口径变更，没有 ADR 或 ADR 附注**，只散在 `CHANGELOG.md:21` 与 `round-17/plan.md:60`。建议新增 ADR-0016 或给 ADR-0006/0008 加「上限」小节 |
| README / AGENTS / CHANGELOG 版本一致 | ✅ | 三处均 0.30.2；README 无裸版本号，指 `SHA256SUMS-0.30.2.txt` |
| 测试数一致 | ✅ | 三处均 16 文件 205 条；本轮 `npm test` 实测 **205 pass / 0 fail** |
| 首屏数字一致 | ✅ | `README.md:94,96`、`CHANGELOG.md:12`、`AGENTS.md` 均 **284,730 B**（≤285,000，余 270 B） |
| **文件上限文案一致** | ❌ **硬矛盾（P0，见 S4）** | `README.md:74` 写「超过 **6 MB** 显示「文件过大，暂不支持（上限 **6 MB**）」」；代码 `src/lib/workspace.ts:243` 是「上限 **5.5 MiB**」；`CHANGELOG.md:21` 也是 5.5 MiB。`round-18/findings-docs.md:7` 已把它列为「0.30.1 定稿后统一改」，**至今未改** |
| README「下一步」 | ❌ 断点 | `README.md:197-205` 停在「数据保真（结果见 CHANGELOG 0.22.0）」，不含 1.0 条件、不含 20 轮收尾。交接靠这一节（`AGENTS.md` §6 末段） |
| 未验清单完整性 | ⚠️ README 缺一条关键项 | `AGENTS.md` §6 最全；**README 从未写「macOS 包从未在真机上启动过」**（`README.md` 全文无「真机」「未运行」命中；`AGENTS.md` 有）。公开发布页读者看不到这条 |
| 质量报告 / 差距表 | ✅ | `docs/qa-report.md:5` 22 条已处理；`docs/typora-gap.md:7,33` 21 有 / 18 缺，与 `README.md:76` 一致 |

**收尾结论**：文档与版本链条（S1.1）已就绪；**STATE 是最大的单点缺口** —— 三处过期（版本、发布、待办池）+ 缺 4 行记录。20 轮检查表要到 round-20 结束才能打满 20/20，当前 **18/20 plan、18/20 test**。

---

## S4 · 0.30.2 之后是否还有必须修的 P0；1.0 的 Go/No-go

### S4.1 0.30.2 **发布前**必须处理（三条，都能在 10 分钟内修）

| # | P0 | 证据 | 修法 |
| :--- | :--- | :--- | :--- |
| **P0-1** | **本机发不出去**：无 SSH 私钥，`git push` 与 tag 推送都会 `Permission denied (publickey)` | `git ls-remote --heads origin` 实测报错；`~/.ssh` 只有 `known_hosts` | 恢复 deploy key 到 `~/.ssh/` 并 `ssh -T git@ssh.github.com -p 443` 验通；或用带 `contents: write` 的 PAT 走 HTTPS 推 tag。**这是唯一会让发布彻底卡住的一条** |
| **P0-2** | **草稿修复还没提交**：`src/App.tsx` 工作区有 2 行改动（`finishSaved` 改为无条件 `void clearHostDraft()`，`src/App.tsx:2873`） | `git status --porcelain` → ` M src/App.tsx`；`git diff` 显示 `-if (dirtyRef.current === false) void clearHostDraft()` → `+void clearHostDraft()` | 提交进 0.30.2。**若先打 tag 再提交，发布包含不到这条修复** |
| **P0-2b** | **工作区仍全未提交**（10:20 读数：**17 个已跟踪文件改动 + 2 个未跟踪**，HEAD 仍是 `08aaf88`） | `git status`：`AGENTS.md`、`README.md`、`docs/CHANGELOG.md`、`package.json`、`package-lock.json`、`scripts/draft-acceptance.mjs`、`src/App.tsx` + **11 张截图**；未跟踪 `round-17/test.md`、`round-19/` | 版本号、CHANGELOG、修复、脚本全在同一个未提交批次里。**tag 前必须一次提交完整**，否则 tag 指向旧树 |
| **P0-3** | **README 的 6 MB / 5.5 MiB 矛盾** | 见 S3「文件上限文案一致」行 | 把 `README.md:74` 改成「5.5 MiB（5,767,168 B）」，并写明超限时正文清空 |

同批建议一起提交（不是 P0，但属 0.30.2 收尾）：`round-17/test.md`、`round-19/brief.md`（均未跟踪）、10 张被测试脚本改写的截图（`git status` 已列为 ` M`）。**注意**：截图是回归脚本原地覆盖的历史证据，提交它们是"记录新状态"，不是修复。

### S4.2 0.30.2 之后**不再有必须修的 P0**

0.30.1 修掉的三项数据安全问题（B1 跨文档覆盖、B3 丢字、B2 大文件卡死）已由独立验收复验（`round-17/test.md`）；0.30.2 补齐草稿清理与性能口径。**剩下的都是 P1/P2 或需要外部条件的项**：截图体积、`release.yml` R1–R6、ADR 载荷、STATE 补行、P2 可访问性三项、memo/B4/B5/2 MB 进度条。

唯一例外：**`round-17/test.md:71` 判的是 FAIL**（性能 p95 不可复现 + draft 57/58）。0.30.2 修了后者，前者改成了"如实写未测"。要让 0.30.2 的验收结论成立，**需要 tester 对 draft-clear 复跑 `draft-acceptance`（目标 58/58）**，否则 0.30.2 的 CHANGELOG 第 1 条仍是未验陈述。

### S4.3 1.0 Go/No-go

**结论：No-go。8 条门槛里 7 条未满足，现在升 1.0 会把"从未在真机启动过"的 macOS 包和"未签名"的 Windows 包打上 1.0 标签。**

| # | 1.0 门槛 | 当前状态 | 证据 |
| :--- | :--- | :---: | :--- |
| G1 | macOS 包在真机启动、编辑、保存各一次 | ❌ | `AGENTS.md` §6「macOS 真机（本机是 Windows，未运行过）」；CI 只跑 `--self-test` 与 `verify.sh` |
| G2 | Developer ID 签名 + 公证 + staple 实测通过 | ❌ | 6 个 Apple secrets 未配（`STATE.md:82`）；0.30.1 Release body 首行是「**未签名、未公证**（ad-hoc）」 |
| G3 | Intel Mac 实跑（含 Rosetta 分支） | ❌ | `AGENTS.md` §6「真实 Intel Mac 运行、Rosetta」；Universal 包已出，但只在 arm64 runner 上产 |
| G4 | 100 KB / 1 MB 的可信性能数字 | ❌ | `CHANGELOG.md:10`「100 KB/1 MB 未测，不作为验收数字」；`round-17/test.md:35` 记 1 MB 脚本挂起 |
| G5 | 隐私声明定稿 | ❌ | `PRIVACY.md:1`「**草案。待产品负责人确认；确认前不得作为对外承诺。**」；8 条承诺全部标「待确认」 |
| G6 | Windows 安装真机验证（HKCU / 开始菜单 / 双击 / SmartScreen） | ❌ | `README.md:66` 自述「尚未人工验」；`install-verify` 仍只手动（`ci.yml:145`） |
| G7 | 安全报告渠道与响应时限 | ❌ | `SECURITY.md:17` 私有漏洞报告 `enabled=false`；`:71-73` 响应时限/披露窗口/赏金三处「待产品负责人确认」 |
| G8 | 往返损失不阻断，且在 Release 页写明 | ⚠️ | rich 5/7、source 7/7、04 首次保存仍拦截 1/7（`STATE.md:54`）。已文档化，可作 1.0 已知限制，但 **Release 页没写**（`scripts/release-notes.mjs:117-123` 的「已知限制」只有 5 条，无往返） |

**最小 1.0 路径**（按依赖排序，给下一步用）：
1. 拿到 macOS 真机（G1）→ 同时验 G3 的 Intel/Rosetta 分支。
2. 买 Apple Developer Program（要花钱，必须产品负责人决定）→ 配 6 个 secrets → 复跑 release.yml 签名分支（G2）。
3. 隐私声明定稿 + 安全响应时限（两条都是"对外承诺"，必须产品负责人签字，G5/G7）。
4. 补 100 KB/1 MB 性能脚本（G4）与安装真机走查（G6）。
5. 在 `release-notes.mjs` 的「已知限制」补一条往返损失（G8）。

在此之前，0.30.x 的定位应是「可下载的预览版」，而不是 RC。`CHANGELOG.md:11` 已写「0.30.2 作为第 20 轮收尾版本」——**这句与 `round-19/brief.md:14`「本轮发布 0.30.2」冲突**（0.30.2 是 round-19 发的），措辞建议改成「0.30.x 收尾版本」。

---

## S5 · 优化机会（3 条，按收益排序）

| # | 机会 | 证据 | 收益 | 难度 |
| :--- | :--- | :--- | :--- | :--- |
| **O1** | **截图默认不写 `shots/`**：25+ 个脚本把输出路径写死成 `shots/round-XX/*.png` | `scripts/acceptance.mjs:161`、`data-safety-acceptance.mjs:5`、`draft-acceptance.mjs:9`、`fidelity-acceptance.mjs:18`、`host-save-acceptance.mjs:14`、`host-smoke.mjs:14`、`newfile-acceptance.mjs:5`、`qa*.mjs` 等；`AGENTS.md` §3 已规定 `shot.mjs` 无 `--out` 写 `.tmp/shots/`，但回归脚本没遵守 | 工作区不再被回归弄脏（本轮 10 个 ` M` 截图即此）；历史证据变不可变；`git status` 恢复可用作"是否有人改代码"的信号 | 小（每个脚本一行默认值 + 显式 `--out` 才写 `shots/`） |
| **O2** | **`release.yml` 一次改三处**：job 级 `ref`、`concurrency` 按版本、发布前断言 tag 已存在 | S1.3 的 R1/R3/R5（`release.yml:192`、`:21-23`、`:252-264`） | 补发可用、同版本不会双跑、不会误建 tag。三类事故都是"发错版本"，代价远超改动量 | 小（3 行 + 1 步 `git rev-parse -q --verify`） |
| **O3** | **发布说明过滤元信息行** | `scripts/release-notes.mjs:29-31` 只过滤 `- ` 前缀取前 6 条；0.30.2 实跑把「体积与 SHA256 见 Release 页…」「不升 1.0 的理由…」当更新项 | Release 页正文更像更新说明，少两条无信息量的行 | 小（加一条 `/^- (体积与 SHA256\|测试 \|不升 1\.0\|延后)/` 过滤） |

---

## 0.30.2 发布清单（按执行顺序，可直接照做）

| # | 步骤 | 命令 / 动作 | 现状 |
| :---: | :--- | :--- | :--- |
| 1 | 修 README 上限文案（P0-3） | `README.md:74`：6 MB → 5.5 MiB（5,767,168 B） | ❌ 未做 |
| 2 | 确认版本链 | `package.json` / `package-lock.json` / `CHANGELOG.md:5` / README 资产名 = 0.30.2 | ✅ 已就绪 |
| 3 | 提交草稿修复（P0-2） | `src/App.tsx` 的 `finishSaved` 无条件 `clearHostDraft()` | ❌ 未提交（工作区） |
| 4 | 补提交证据与 brief | `docs/iteration/round-17/test.md`、`docs/iteration/round-19/brief.md`、本轮 3 份 findings | ❌ 未跟踪 |
| 5 | 决定 11 张改动截图 | 提交（记录新状态）或 `git checkout -- shots/`（保留旧证据）。**二选一，别混** | ❌ 未决定 |
| 6 | 跑门禁（串行，根代理） | `npm run build` → `node scripts/measure-first-screen.mjs --max 285000` → `npm test` | ⚠️ `npm test` 本轮实测 205/0；`build` 与 `measure` 本轮未跑（finders 只读） |
| 7 | 复验草稿修复 | `node scripts/draft-acceptance.mjs` → 目标 **58/58**（round-17 是 57/58） | ❌ 未跑 |
| 8 | 推送 main 并等 CI 绿 | `gate` / `windows-host` / `macos-host` 三 job | ❌ **先修 P0-1 的凭据**，否则这一步直接失败 |
| 9 | 打并推 tag | `git tag -a v0.30.2 -m "Sidelight 0.30.2" && git push origin v0.30.2` | ❌ 未做 |
| 10 | 观察 release workflow | preflight → windows-build → macos-build → release；确认 3 资产 + `SHA256SUMS-0.30.2.txt`（4 文件）与 `sha256sum -c` 通过 | ❌ 未触发 |
| 11 | 核对 Release 页 | 六节正文齐全；首行为「**未签名、未公证**」；三个资产字节与 SHA256 与页面一致 | ❌ 未触发 |
| 12 | 回填数字 | CHANGELOG 0.30.2 的「体积与 SHA256」行；README 若有字节就近处；STATE 发布节 | ❌ 待回填 |
| 13 | 更新 STATE | 补 17/18/19 三行；改 `:52` 版本与首屏；改 `:93` 最新发布；清 `:83` 已修 P0 | ❌ 未做（见 S3） |
| 14 | 更新 ADR-0004 载荷 | 当前 `host/bin` 实测 **2,457,247 B**（exe+dll 1,020,452 + www 1,436,795），ADR 写 2,454,954 B（第 13 轮） | ❌ 差 +2,293 B，未复算 |

**不要做的事**：不要为 0.30.2 加新功能；不要动 `permissions`；不要改资产命名（`Sidelight-<版本>-win-x64-setup.exe` / `-win-x64-portable.zip` / `-macos-universal.zip` 已被 `release.yml:105,112,176,207-209` 和 `renderer` 两端写死）；不要在同一 tag 上反复重跑而不清理资产（R4）。

---

## 1.0 Go/No-go

**No-go**。理由：7/8 条门槛未满足，其中 3 条（G1 macOS 真机、G2 签名公证、G5 隐私定稿）**不是工程任务，是外部依赖与对外承诺**，必须由产品负责人决定。

- 可以现在做的：G4（性能脚本）、G6（安装真机走查）、G8（Release 页补往返）。
- 需要产品负责人的：G2（花钱买 Apple Developer）、G5/G7（写承诺、定响应时限）。
- 需要硬件的：G1/G3（一台 Intel Mac 或至少一台真 Mac）。

**0.30.2 的定位**：可下载的预览版收尾，不是 RC。对外文案不要出现「RC」「1.0 预览」「稳定版」。

---

## 附：本轮无法验证的项

- `branches/main/protection` 真实状态：匿名 API 404，**未能区分"未保护"与"需鉴权"**。用管理员账号访问 `Settings → Branches` 或带 token 打 API 可确认。
- Deploy key `sidelight-agent` 在 GitHub 侧的实际权限：`/keys` 需鉴权。
- `npm run build` 与 `measure-first-screen` 的当前读数：finders 只读，且 `AGENTS.md` §3 规定实施期间不得并发跑 `build`；以 root 的最终门禁为准。
- `draft-acceptance` 是否已回到 58/58：需要 dev server + CDP，本轮未起。
- macOS 签名/公证分支、Intel 运行、Rosetta：本机是 Windows，无法验证。
