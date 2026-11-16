# 第 18 轮仓库治理发现（finder: r18-repo）

- 日期：2026-11-16（Asia/Shanghai）
- 仓库：`D:\Documents\SidelightProgram`，v0.30.0，HEAD `2ff19bd`
- 范围：只读。未改文件、未改 GitHub 设置。GitHub 数据取自匿名 REST API（只读）。
- 未核实：分支保护、deploy key 明细、Actions token 默认权限、required checks、仓库 Secrets（这些端点要管理员权限，匿名 API 读不到）。
- 本机验证：`node scripts/measure-first-screen.mjs` → `PASS`，gzip `284,210 / 285,000`，余 790 B，exit 0。

## 0. 结论（先看）

1. 仓库可公开访问，但社区健康度只有 **57%**：有 README、LICENSE、CONTRIBUTING；缺 SECURITY、Issue 表单、PR 模板、CODEOWNERS、行为准则。
2. 最大用户可见缺陷：**v0.30.0 Release 正文只有 2 行**，没有下载表、校验值、安装步骤、已知限制，还把机器标记 `signing=adhoc` 直接显示给用户。根因在 `release.yml` 把 `signing.txt` 当正文。
3. `.gitignore` 已覆盖 `release/`、`dist/`、`host/bin/`、`.tmp/`、`.npm-cache`；**不覆盖证书、私钥、`.env`、`.sidelight/`、`.dmg`**。当前没有敏感文件被跟踪。
4. 仓库体积主因是截图：550 个跟踪文件 **35.45 MB**，占 41.91 MiB pack 的 **84.6%**。没有单个文件超过 0.3 MiB。
5. CI 缺首屏预算门：`measure-first-screen.mjs` 能在 1 秒内跑完，但 CI 从不调用；README 自称的 285,000 B 预算目前靠人跑。
6. 推送用一把 **write deploy key**（`STATE.md:100`）。它能推 tag，而推 `v*` tag 会直接触发发布；这是当前最需要收窄的供应链面。

---

## R1 GitHub 现状

数据源：[仓库 API](https://api.github.com/repos/XuJingye2022/SideLight)、[community profile](https://api.github.com/repos/XuJingye2022/SideLight/community/profile)、[releases](https://api.github.com/repos/XuJingye2022/SideLight/releases?per_page=10)、[workflows](https://api.github.com/repos/XuJingye2022/SideLight/actions/workflows)、[runs](https://api.github.com/repos/XuJingye2022/SideLight/actions/runs?per_page=6)、[labels](https://api.github.com/repos/XuJingye2022/SideLight/labels)、[private vulnerability reporting](https://api.github.com/repos/XuJingye2022/SideLight/private-vulnerability-reporting)。

| 项 | 现状 | 判断 |
| :--- | :--- | :--- |
| description | `面向中文写作者的桌面 Markdown 编辑器：左边写作，右边按需补光。Windows + macOS。` | 可用，含平台与定位；不用改 |
| topics | 9 个：`chinese`、`desktop-app`、`editor`、`macos`、`markdown`、`webview2`、`windows`、`wkwebview`、`writing` | 缺 AI 与 local-first 词；见 R1-3 |
| license | GitHub 识别为 MIT；`LICENSE:3` 写 `Copyright (c) 2026 XuJingye` | 与内部决策冲突；见 R1-1 |
| homepage | `https://github.com/XuJingye2022/SideLight/releases` | 与 README 下载链接重复；可留 |
| Issues | 开；0 个 open；labels 只有 GitHub 默认 10 个 | 开但无模板；见 R1-4 |
| Projects / Wiki / Discussions | Projects 开；Wiki、Discussions 关 | Projects 未用；可关，非必须 |
| 默认分支 | `main` | 正常 |
| Releases | 6 个：v0.26.0、v0.27.0、v0.28.0、v0.28.1、v0.29.0、v0.30.0；最新 v0.30.0 于 2026-11-15T23:45Z 发布，4 个资产 | 资产齐全；正文不合格，见 R3 |
| Actions workflows | 2 个 active：`CI`、`Release` | 没有独立安全/依赖扫描 |
| Actions 运行 | 共 26 次；最近 CI #21 success（2026-11-16T00:01Z）；Release #5 success | 主链路绿 |
| Actions 权限 | workflow 内已显式声明 `contents: read`（`ci.yml:13-14`、`release.yml:18-19`），`release` job 单独提 `contents: write`（`release.yml:196-197`）；仓库级默认 token 权限匿名 API 读不到 | 最小权限方向正确；默认值未核实 |
| 社区文件 | CONTRIBUTING 有；SECURITY 无；Issue 模板无；PR 模板无；CoC 无；CODEOWNERS 无 | 健康度 57% |
| 私有漏洞报告 | `enabled: false` | 开了才能给 SECURITY.md 一个可用入口；见 R1-5 |
| deploy key | `STATE.md:100` 记录一把 write key `sidelight-agent`（2026-11-16 加入） | 写权限 + tag 推送 = 可发布；见 R4-K4 |

### R1-1（P2）LICENSE 版权人与决策记录不一致

- 证据：`LICENSE:3` 是 `Copyright (c) 2026 XuJingye`；`docs/iteration/STATE.md:116` 记录 2026-11-15 的决定是「版权人写 `Sidelight contributors`，不写个人姓名」。
- 影响：对外授权文本与内部记录矛盾。若有人按决策复核许可证，会认为文件被改过。
- 建议：由产品负责人二选一，只改一处并同步 STATE：要么 LICENSE 改为 `Sidelight contributors`，要么把 STATE 的决定改成「版权人 XuJingye」。不要两边都留。
- 难度：S。

### R1-2（P1）社区健康度 57%，缺安全与协作入口

- 证据：community profile 返回 `health_percentage: 57`；`issue_template: null`、`pull_request_template: null`、`code_of_conduct: null`；`contents/.github` 只有 `workflows/`；`contents/SECURITY.md` 返回 404。
- 影响：第一次来的人没有「怎么报 bug / 怎么提 PR / 漏洞往哪报」的入口；Issue 会变成自由格式。
- 建议：本轮补 `SECURITY.md`、`bug.yml`、`feature.yml`、`PULL_REQUEST_TEMPLATE.md`；CONTRIBUTING 补 PR 流程。见 R2。
- 难度：S。

### R1-3（P3）topics 缺 AI 与写作助手语义

- 证据：9 个 topics 里没有 `ai`、`llm`、`writing-assistant`、`markdown-editor`、`local-first`、`tiptap`。
- 影响：按「AI 写作」「本地优先」搜索时搜不到。topics 上限 20，现只用 9。
- 建议：加 `ai`、`writing-assistant`、`markdown-editor`、`local-first`、`tiptap`。不要加与实现不符的 `electron`、`tauri`。
- 难度：S（设置项，本轮只给建议）。

### R1-4（P2）labels 只有默认 10 个，模板无法自动分流

- 证据：labels API 只有 `bug`、`documentation`、`duplicate`、`enhancement`、`good first issue`、`help wanted`、`invalid`、`question`、`wontfix`、`accessibility`。
- 影响：模板里写平台/待补信息标签会落空；Issue 无法按 `windows`/`macos`/`security` 分流。
- 建议：模板先只用已存在的 `bug`、`enhancement`；另建 `windows`、`macos`、`needs-info`、`security` 四个标签（设置项，不在本轮改）。
- 难度：S。

### R1-5（P1）私有漏洞报告关闭，且没有 SECURITY.md

- 证据：`private-vulnerability-reporting` 返回 `{"enabled": false}`；`SECURITY.md` 404；社区 profile 无 security policy。
- 影响：发现漏洞的人只有公开 Issue 一条路；公开细节会扩大影响。
- 建议：先在 Settings → Code security 打开 Private vulnerability reporting，再写 SECURITY.md 指向 `https://github.com/XuJingye2022/SideLight/security/advisories/new`。在打开前，SECURITY.md 不得写一个不存在的入口。见 R2-SECURITY。
- 难度：S（设置需产品负责人点一次）。

### R1-6（P3）homepage 与 README 下载链接重复，无独立站点

- 证据：仓库 API `homepage` = releases 页；README:9 也指向同一页。
- 影响：没有实际损失；只是浪费一个可放产品页/文档页的字段。
- 建议：有站点前保持现状。不要填未上线的域名。
- 难度：S。

---

## R2 缺失文件清单与最小草案

| 文件 | 现状 | 优先级 | 难度 | 最小要点 |
| :--- | :--- | :--- | :--- | :--- |
| `.github/ISSUE_TEMPLATE/bug.yml` | 无 | P1 | S | 版本、系统、安装方式、复现、期望、实际、日志脱敏、已读已知限制 |
| `.github/ISSUE_TEMPLATE/feature.yml` | 无 | P2 | S | 问题、提案、替代方案、影响平台、是否愿意提 PR |
| `.github/ISSUE_TEMPLATE/config.yml` | 无 | P2 | S | 关空 Issue；contact links 指向 README 已知限制与 SECURITY |
| `.github/PULL_REQUEST_TEMPLATE.md` | 无 | P1 | S | 关联 Issue、改动/原因、门禁输出、截图、数据安全、无新运行时依赖 |
| `SECURITY.md` | 无；私有报告关闭 | P1 | S | 支持版本、私密渠道、范围、密钥边界、响应目标（待确认） |
| `PRIVACY.md` | 无；README 只有「待确认」段 | P1 | S | 本地优先、数据位置、出网时机、Key 存储、删除方法；全文标「待产品负责人确认」 |
| `CONTRIBUTING.md` | 有，但面向内部代理 | P1 | S | 补 fork/PR/Issue/发布；修「不要跑 build」的对外歧义 |
| `CODEOWNERS` | 无 | P3 | S | 单维护者阶段价值低；等分支保护再加 |
| `.github/dependabot.yml` | 无 | P2 | S | npm + github-actions 每周；分组 minor/patch |
| `CODE_OF_CONDUCT.md` | 无 | P3 | S | 有外部贡献者再加；需一个可联系的负责人 |

### R2-1（P1）`bug.yml`

最小字段：

- `name: Bug 报告`；`description: 报告可复现的问题`；`labels: [bug]`（只写已存在的标签）。
- 顶部 `markdown`：先读 README「现在不能做什么」；先搜已有 Issue；不要贴 API Key、文档正文、完整本地路径。
- `input` 版本：必填，placeholder `0.30.0`。
- `dropdown` 系统：Windows 11 / Windows 10 / macOS 15+ / macOS 13–14 / 其他。
- `dropdown` 安装方式：安装版 setup.exe / 便携 zip / macOS universal zip / 源码 dev。
- `textarea` 复现步骤、期望结果、实际结果：前两个必填。
- `textarea` 日志：可选；说明 `host.log` 只贴相关行，先删路径与文件名。
- `checkboxes`：已读已知限制；已搜 Issue；日志已脱敏。全部必勾。

### R2-2（P2）`feature.yml`

- 问题：现在卡在哪，不要先写方案。
- 提案：最小可用行为；是否愿意先做小版本。
- 替代方案：现有功能/外部工具能否解决。
- 影响面：Windows / macOS / 编辑器 / AI / 导出 / 打包。
- 可选：是否愿意提 PR。
- `labels: [enhancement]`。

### R2-3（P2）`config.yml`

```yaml
blank_issues_enabled: false
contact_links:
  - name: 已知限制与不能做的事
    url: https://github.com/XuJingye2022/SideLight/blob/main/README.md#现在不能做什么
    about: 先看这里，很多问题已有说明
  - name: 报告安全问题
    url: https://github.com/XuJingye2022/SideLight/security/advisories/new
    about: 漏洞不要发公开 Issue（需先打开 Private vulnerability reporting）
```

注意：第二条链接在 R1-5 的设置打开前是 404。SECURITY.md 落地时一并处理；未打开就先只留第一条。

### R2-4（P1）`PULL_REQUEST_TEMPLATE.md`

- 关联 Issue：`Closes #`。
- 改了什么 / 为什么：各 1–3 行。
- 影响面：勾 Windows、macOS、编辑器、AI、导出、打包、CI。
- 门禁：贴 `npx tsc --noEmit`、`npm test`、`npm run build` 的结果；改编辑器或序列化时贴 `npm run roundtrip`。
- 界面变化：截图路径 `shots/round-XX/...`；无界面变化写「无」。
- 数据安全：是否改保存/写盘/缓存/最近记录；是否会让 `.sidelight` 或 `recent.json` 变化。
- 依赖：确认没有新增运行时依赖；若新增，README「依赖与体积」已写理由。
- 许可证：勾「同意以 MIT 授权」。
- 回滚：一行说明怎么撤。

### R2-5（P1）`SECURITY.md`

最小结构（所有承诺句都标「待产品负责人确认」）：

- 支持版本：`0.30.x` 修；`< 0.30` 只建议升级。不要写具体支持月数。
- 报告渠道：GitHub Security → Report a vulnerability（`/security/advisories/new`）。前置条件：打开 Private vulnerability reporting（当前 `enabled: false`）。在打开前写「不要在公开 Issue 写细节；先通过 GitHub 联系仓库所有者」，不要编造邮箱。
- 报告内容：版本、平台、安装方式、复现、影响；不要附真实 Key、文档正文、完整路径；日志先脱敏。
- 范围：前端、`host/`、`host-mac/`、`packaging/`、`.github/workflows/`。范围外：Tiptap/KaTeX 等上游依赖（报上游，仓库跟进升级）、用户本机配置、社交工程。
- 密钥边界：API Key 只存本机 `localStorage`；应用不代管、不上传；搜索 Key 同理。永远不要向报告者索要 Key。
- 响应：目标 7 天内首次回复（待确认）；不设赏金。
- 披露：修复发布后协调披露，默认 90 天（待确认）。

### R2-6（P1）`PRIVACY.md`

- 顶部固定一行：`草案，待产品负责人确认；确认前不得作为对外承诺。`
- 一句话：本地优先；无账号、无遥测、启动不联网。
- 数据表：文档正文、草稿、批注、trash、`recent.json`、`host.log`、`localStorage` 里的 Key、macOS `~/Library/Application Support/Sidelight`。逐项写「存哪、是否出网、怎么删」。
- 出网时机：只在用户点「分析」「追问」「联网核对」且配置了服务时。说明发什么：选区、前后各一段上下文、批注、追问；搜索服务商收到查询词。第三方服务由用户自选，仓库不代管请求。
- Key：明文存 `localStorage`，无系统钥匙串、无加密；建议用低权限、可撤销的 Key。
- 删除：`.sidelight/`、`recent.json`、`host.log*` 的位置与手动删除步骤；卸载保留哪些目录。
- 不收集：无遥测、无崩溃上报、无广告、无账号画像。
- 变更：随版本更新；重大变化在 CHANGELOG 标注。

### R2-7（P1）修订现有 `CONTRIBUTING.md`

现状问题（行号按当前文件）：

- `CONTRIBUTING.md:10-24` 只写门禁，没有 clone/fork/PR 流程；外部贡献者不知道从哪开始。
- `:20` 写「`npm run build` 由维护者在收尾时串行跑一次。实施期间不要跑它」。这是内部并行代理的纪律，对外部贡献者是错误指令：PR 必须能构建。
- `:26-28` 提交格式 `round-NN: <一句话>` 是内部轮次格式，外部贡献者没有轮次号。
- 没有 Issue 指引、没有发布流程、没有 PR 检查单。

建议补充/改写：

1. 开头加「10 分钟上手」：`git clone` → `npm ci` → `npm run dev`（`http://localhost:5173`）→ `npm test`。
2. 门禁分两档：外部 PR 必跑 `npx tsc --noEmit`、`npm test`、`npm run build`；`npm run roundtrip` 只在改编辑器/序列化时跑。把「并行代理期间由根代理串行跑 build」移到 AGENTS.md 或删掉，不要留对外。
3. 提交信息：内部保留 `round-NN:`；外部用 `fix:`、`feat:`、`docs:`、`test:`、`chore:`，可带范围。两种都写清，避免维护者改历史。
4. PR 流程：fork → 分支 → 一个 PR 只做一件事 → CI 绿 → 审查；界面变化附截图；不新增运行时依赖。
5. Issue：先搜、先读 README「现在不能做什么」；安全走 SECURITY.md。
6. 发布：链接 `AGENTS.md` 第 5 节与 `.github/workflows/release.yml`；说明 tag `v*` 和手动 `publish` 两条路。
7. 许可证段保留（`:45-47`）。

### R2-8（P3）`CODEOWNERS`

- 单维护者 + 无分支保护时价值低：只会自动请求一个已经在线的人的审查。
- 若本轮要加，最小内容：`* @XuJingye2022`。
- 建议等分支保护/第二维护者出现再加。

### R2-9（P2，可选）`.github/dependabot.yml`

- `npm` 与 `github-actions` 每周各一次；`groups` 合并 minor/patch；不自动合并。
- 理由：现在 6 个 action 都用浮动 tag（见 R4-K5），Dependabot 至少能让升级可见。
- 若产品负责人反对新增自动 PR，可先不做；不阻塞本轮。

---

## R3 Release 说明：v0.30.0 缺口与模板

### 现状（证据）

v0.30.0 的 Release body 全文只有两行（API `releases` 返回）：

```text
**未签名、未公证**（ad-hoc 签名；首次打开步骤见 zip 内 README.txt）
signing=adhoc
```

对比 v0.28.0 的正文：有下载表、三个资产的字节数、Windows SmartScreen 说明、macOS 版本与 Gatekeeper 说明、本版修复、CHANGELOG 链接。0.29.0 与 0.30.0 都退化成了两行。

根因在 `.github/workflows/release.yml`：

- `:155-168` 只生成 `signing.txt`，内容就是签名状态两行。
- `:253` `body_path: out/signing.txt`，把这两行当 Release 正文。
- `:254` `append_body: true`，同 tag 重跑会在旧正文后继续追加。
- `preflight`（`:31-62`）只校验 tag/`package.json`/CHANGELOG，不校验发布说明内容。

### 缺口清单

| # | 缺什么 | 影响 | 优先级 |
| :--- | :--- | :--- | :--- |
| 1 | 下载表：平台、文件名、字节数 | 用户在 Release 页看不到该下哪个；只能翻资产列表 | P1 |
| 2 | 逐资产 SHA256（现在只有 `SHA256SUMS-<版本>.txt` 文件名） | 校验要多点一次；新手不知道文件里是什么 | P2 |
| 3 | Windows SmartScreen「更多信息 → 仍要运行」步骤 | 未签名安装包会被拦；用户以为文件坏了 | P1 |
| 4 | macOS Gatekeeper 三档步骤（15+ / 13–14 / `xattr`） | 首次打开失败；README 有，但 Release 页没有 | P1 |
| 5 | macOS Universal 说明、最低 macOS 13+ | Intel 用户不知道能不能用 | P1 |
| 6 | 已知限制（未验项、无签名、无自动更新） | 支持成本；用户重复报已知问题 | P2 |
| 7 | CHANGELOG 链接 | 用户看不到完整变更 | P2 |
| 8 | 升级说明（尤其 0.28.1 arm64 → Universal） | macOS 用户不知道要不要重做首次打开 | P2 |
| 9 | 机器标记 `signing=adhoc` 可见 | 像内部调试输出，损害可信度 | P1 |
| 10 | `append_body: true` 的重跑幂等 | 同 tag 重跑会出现重复段落 | P2 |
| 11 | 发布说明生成步骤 | 每次靠手写或靠签名文件；这是根因 | P1 |
| 12 | 数据与隐私入口 | 本地优先是卖点；Release 页没有一句 | P3 |

### Release 模板 v1（可直接改成 `release-notes.mjs` 的输出格式）

````markdown
**未签名、未公证**（ad-hoc 签名；首次打开步骤见下方 macOS 段）
<!-- signing=adhoc -->

Sidelight <version> · Windows + macOS

面向中文写作者的桌面 Markdown 编辑器：左边写作，右边按需补光。
本版完整变更见 [CHANGELOG](https://github.com/XuJingye2022/SideLight/blob/main/docs/CHANGELOG.md)。

## 下载

| 平台 | 文件 | 字节 | SHA256 |
| :--- | :--- | ---: | :--- |
| Windows 安装版 | `Sidelight-<version>-win-x64-setup.exe` | `<bytes>` | `<sha256>` |
| Windows 便携版 | `Sidelight-<version>-win-x64-portable.zip` | `<bytes>` | `<sha256>` |
| macOS Universal | `Sidelight-<version>-macos-universal.zip` | `<bytes>` | `<sha256>` |

校验和文件：`SHA256SUMS-<version>.txt`。

## 安装

### Windows

- 安装版是 per-user，装到 `%LOCALAPPDATA%\Programs\Sidelight`，不需要管理员。
- 便携版解压即用。
- 需要 Microsoft WebView2 运行时（Windows 11 自带；缺失时安装器会提示并中止）。
- 未签名，SmartScreen 可能提示「Windows 已保护你的电脑」：点「更多信息」→「仍要运行」。
- 卸载保留 `%LOCALAPPDATA%\Sidelight`；要彻底清掉，卸载后手动删。

### macOS

- 本包是 Universal（arm64 + x86_64），要求 macOS 13 或更新。
- 未签名/未公证。首次打开按系统版本二选一，**每次更新后重做**：
  - macOS 15 及更新：双击一次 → 提示里点「完成」→ 系统设置 → 隐私与安全性 → 「仍要打开」→ 再双击 → 「打开」。
  - macOS 13–14：Finder 右键 App → 「打开」→ 再点「打开」。
  - 命令行：`xattr -dr com.apple.quarantine "<App 路径>"`。
- 提示「已损坏」时先核对 SHA256，再执行 `xattr`，仍失败再反馈。
- 数据位置：`~/Library/Application Support/Sidelight`；文档同目录 `.sidelight/`。

## 校验

- macOS/Linux：`shasum -a 256 <文件>`
- Windows PowerShell：`Get-FileHash <文件> -Algorithm SHA256`
- 与上表或 `SHA256SUMS-<version>.txt` 对照。

## 本版变更

- <3–6 条用户可感知的变化；从 CHANGELOG 当节压缩，不贴内部测试数字>

## 已知限制

- 未签名、未公证；无自动更新。
- AI 走用户自带 Key；Key 明文存本机 `localStorage`。
- 详细「现在不能做什么」见 [README](https://github.com/XuJingye2022/SideLight#现在不能做什么)。

## 升级

- 覆盖安装即可，数据保留。
- macOS 从 0.28.1 及更早升级：包名从 `-macos-arm64.zip` 改为 `-macos-universal.zip`；首次打开步骤要重做。
````

### 落地方式（最小改动）

1. 新增 `scripts/release-notes.mjs`（无新依赖）：读 `package.json` 版本、`docs/CHANGELOG.md` 当节、发布 job 里 `out/` 三个资产的实际字节与 SHA256（本地预览时读 `release/`）、`signing.txt`，输出 `out/RELEASE_NOTES.md`。
2. `release.yml` 的 `release` job 在 checksums 之后调用脚本；`body_path` 改为 `out/RELEASE_NOTES.md`；`append_body` 改 `false`。
3. `signing=` 标记改成 HTML 注释（`<!-- signing=adhoc -->`），不进可见正文。
4. 可选：`preflight` 加一条断言：正文包含三个资产名；缺一个就失败。
5. 同 tag 重跑的行为写进注释：要么整份替换（推荐），要么显式拒绝覆盖。

---

## R4 风险清单

| ID | 风险 | 等级 | 证据 | 建议 | 难度 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| K1 | 证书/私钥/`.env` 可能被误提交 | P1 | 对 `.gitignore` 逐项 `git check-ignore`：`cert.p12`、`apple.pfx`、`id_rsa`、`id_ed25519`、`.env`、`signing.key`、`profile.mobileprovision`、`debug.pem`、`installer.dmg` 全部 **NOT-IGN** | 加 `*.p12`、`*.pfx`、`*.pem`、`*.key`、`*.cer`、`*.mobileprovision`、`.env`、`.env.*`、`*.dmg`、`*.pkg`；保留 `!.env.example`（若以后加） | S |
| K2 | 截图撑大仓库 | P1 | `git ls-files shots` = 550 个、35.45 MB；pack 41.91 MiB；仓库 API `size` 43,261 KB；占比 84.6% | 先停止增长：新截图转 WebP（质量 80–90，通常省 50–70%），只保留最近 2–3 轮。注意：只从 HEAD 删旧图不会缩小 clone（历史 blob 还在）；要真正缩 pack 需重写历史（`git filter-repo`），属破坏性操作，必须先经产品负责人同意，本轮不做 | M |
| K3 | Release 正文退化 | P1 | v0.30.0 body 两行；`release.yml:253`；v0.28.0 有完整正文 | 按 R3 模板生成；`append_body: false`；标记改注释 | S |
| K4 | write deploy key 可推 tag → 可直接发布 | P1 | `STATE.md:100`；`release.yml:5-6` tag `v*` 自动发布；`release` job `contents: write`（`:196-197`） | 收窄成 read-only 不可行：本地代理要 push。保留 write，但：① 定期轮换，交接后删除；② 加 tag 保护规则（限制 `v*` 创建/更新）；③ `release` job 加 `environment: release` 并要求人工批准；④ 不把私钥复制到其他仓库/机器 | S–M |
| K5 | GitHub Actions 用浮动 tag，供应链可被改 | P2 | `ci.yml:27,28,55,99,131` 的 `@v4`；`release.yml:249` 的 `softprops/action-gh-release@v3` | 全部 pin 到 commit SHA；用 Dependabot 提升级 PR；只允许已验证的 action | M |
| K6 | 没有私密漏洞渠道 | P1 | `private-vulnerability-reporting: false`；`SECURITY.md` 404 | 先打开 Private vulnerability reporting，再写 SECURITY.md；不要编造邮箱 | S |
| K7 | 在仓库内打开示例文件夹会生成 `.sidelight/`，可能被提交 | P2 | `.sidelight/` **NOT-IGN**；README:57、:83 说明它写文档同级/工作区根 | 加 `.sidelight/` 到 `.gitignore`；确认没有需要跟踪的样例缓存 | S |
| K8 | README 指向克隆里不存在的文件/旧包名 | P2 | `README.md:64` 让用户安装 `release/Sidelight-0.30.0-...exe`，但 `release/` 被忽略；`:132` 写 `-macos-<arch>.zip`，实际 `host-mac/build.sh:15` 是 `-macos-universal.zip`；`:133` 写 `.tmp/mac/Sidelight.app`，实际 `build.sh:13-14` 是 `.tmp/mac/stage/Sidelight.app` | 下载段只链 Releases 页；macOS 路径改成 universal 与 stage；自测路径照 build.sh 改 | S |
| K9 | LICENSE 与决策不一致 | P2 | `LICENSE:3` vs `STATE.md:116` | 产品负责人二选一，同步两处 | S |
| K10 | main 无保护，误 force-push/删分支 | P2（未核实） | 匿名 API 读不到 branch protection；当前提交历史是直接推 main | 加 ruleset：禁 force-push/删除；要求 PR + CI `gate`；给 owner 留 bypass；`v*` tag 单独保护 | M |
| K11 | 每次手动 dispatch 都跑安装/卸载 | P2 | `ci.yml:139` 只判断 `workflow_dispatch`，没有输入开关 | 加布尔输入 `install_verify`，默认 false；见 R5-2 | S |
| K12 | 截图可能含真实文件名/文档内容 | P3（未核实） | 550 张截图来自真实开发流程；未做图像内容审计 | 发布前抽查最近两轮；避免用真实用户文档截图；必要时打码 | S |
| K13 | `*.zip` 全局忽略会挡住想跟踪的 zip 样例 | P3 | `.gitignore:11` | 保持现状；需要时用 `!fixtures/**/*.zip` 例外，不要全局放开 | S |
| K14 | 公开 STATE 记录 deploy key 名称与推送方式 | P3 | `STATE.md:100` | key 名不是秘密，但运维细节可移到私有交接；公开文档只写「SSH over 443」 | S |

### 已核实为「已覆盖」，不用改

- `release/`（`.gitignore:10`）、`dist`（`:2`）、`host/bin/`（`:9`）、`.tmp/`（`:8`）、`.npm-cache`（`:7`）、`*.zip`（`:11`）、`*.app`（`:14`）都被忽略；`git check-ignore` 逐项确认。
- 当前跟踪文件里没有证书/私钥/真实 Key：按 `sk-`、`tvly-`、`ghp_`、`github_pat_`、`APPLE_CERT_P12_BASE64=`、`PRIVATE KEY` 模式扫描，只命中测试假值 `tvly-test`（`scripts/qa13.mjs:24,79`、`scripts/qa14.mjs:17`）。这不是全量密钥扫描，新文件仍需人工看一眼。
- 没有单个跟踪文件超过 0.3 MiB（最大 `shots/round-17/longdoc-state.png` 294.1 KiB），离 GitHub 100 MB 单文件限制很远，不需要 LFS。
- Actions 顶层权限是 `contents: read`（`ci.yml:13-14`、`release.yml:18-19`），只有 `release` job 提到 `contents: write`（`release.yml:196-197`），符合最小权限。
- 没有 `pull_request_target`；PR 来自 fork 时拿不到 secrets。

---

## R5 CI 现状与建议

| job | runner | 超时 | 触发 | 做什么 |
| :--- | :--- | :--- | :--- | :--- |
| `gate` | ubuntu-latest | 15 min | push main / PR / 手动 | `npm ci` → `npm run build` → `npm test` |
| `windows-host` | windows-2022 | 25 min | 同上 | 构建前端、取 WebView2/NSIS、编 C# 宿主、host smoke、打包安装包、上传 artifact |
| `macos-host` | macos-latest | 30 min | 同上 | 构建前端、Universal `.app`、self-test、verify、上传 zip |
| `install-verify` | windows-2022 | 20 min | 仅手动 dispatch，且 `windows-host` 成功 | 静默安装 → 断言路径/HKCU/开始菜单 → 卸载 → 断言清理 |
| `release`（另一个 workflow） | ubuntu | 20 min | tag `v*` 或手动勾 `publish` | 收 3 个资产、生成并校验 SHA256SUMS、发布 |

### R5-1（P1）`gate` 应加首屏体积门（measure）

- 证据：`ci.yml:33-36` 只有 build 与 test；`package.json:10-18` 没有 measure 脚本；`scripts/measure-first-screen.mjs:2-3` 明说「只读产物，不构建；超线 exit 1」。
- 本机实测：`node scripts/measure-first-screen.mjs` → `total raw=917,841 gzip=284,210 files=2 max=285,000`、`PASS`、exit 0，约 1 秒。
- 影响：README/CHANGELOG 反复写「≤285,000，余 790 B」，但 CI 不跑；下一次改依赖或 import 就能悄悄超线。
- 建议：`gate` 的 `npm run build` 后加一行 `node scripts/measure-first-screen.mjs --max 285000`。不加新依赖、不需要浏览器、不需要 dev server。
- 注意：Ubuntu 与 Windows 的 zlib 对同一输入字节产出长度一致；首次上线观察一次实际值（预计 284,210）。
- 难度：S。

### R5-2（P2）`install-verify` 没有 opt-in 输入

- 证据：`ci.yml:135-140`，`if: github.event_name == 'workflow_dispatch' && success()`。
- 影响：任何一次手动 dispatch（例如只想重跑 gate）都会安装再卸载一遍软件，多花约 20 分钟；也无法在 UI 上表达「这次只构建」。
- 建议：`workflow_dispatch` 加 `inputs.install_verify`（boolean，默认 false），job 条件改为 `github.event_name == 'workflow_dispatch' && inputs.install_verify && success()`；在 README/CONTRIBUTING 写明它只手动、会写 HKCU 与开始菜单。保留它不进 required checks。
- 难度：S。

### R5-3（P2）没有 `perf` job；`continue-on-error` 当前为零

- 证据：`.github/**` 里 grep `continue-on-error|perf` 无命中；`ci.yml` 没有性能 job。
- 结论：不存在「perf 是否该 continue-on-error」的存量问题。若本轮要加性能 job：
  - 单独 `.github/workflows/perf.yml`，`schedule` + `workflow_dispatch`，不挂 PR。
  - `continue-on-error: true`，结果写 Step Summary/artifact，只作参考，不进 required checks。
  - 绝不给 `gate` 的 measure 加 `continue-on-error`：体积预算是硬门，超线必须红。
  - 不要为了「看起来有性能保障」加一个不稳定的必过 job。
- 难度：S（若不做，答案就是「不加」）。

### R5-4（P2）README 没有 badge

- 证据：`README.md:1-5` 无 badge；workflows API 已给 `badge_url`：`https://github.com/XuJingye2022/SideLight/workflows/CI/badge.svg`。
- 影响：访客看不到构建状态；贡献者也不知道该看哪个 check。
- 建议：标题下加一行 CI badge，用 GitHub 自家 URL（`.../actions/workflows/ci.yml/badge.svg?branch=main`），不要加 shields.io（第三方请求，与「本地优先/不联网」的叙事冲突）。
- `install-verify` 被 skip 不会让 badge 变红；只有真实失败才红。
- 难度：S。

### R5-5（P3）Windows 安装包在每个 PR 都构建

- 证据：`ci.yml:90-103` 在 `windows-host` 里每次都编 NSIS、上传 artifact；该 job 25 分钟。
- 影响：PR 反馈慢、Actions 分钟数高；宿主冒烟其实不需要安装包。
- 建议：把「打包安装包 + 上传 artifact」拆成 `if: github.event_name != 'pull_request'`；PR 只跑宿主构建与 smoke。若分支保护要求 `windows-host`，拆 job 后要同步 required checks。
- 难度：S–M。

### R5-6（P3）`roundtrip` 仍只靠手动

- 证据：`ci.yml:35-36` 被注释；`scripts/roundtrip.mjs` 只用 Node 与 Tiptap，不用浏览器（前 25 行无 Playwright/HTTP）。
- 影响：改序列化时可能忘记跑；它会在 `docs/roundtrip-report.md` 写报告。
- 建议：低优先级。若要加，单独 job，只在 `src/lib/**`、`src/components/**`、`fixtures/**` 变化时跑；不要写回工作区后提交。按 AGENTS §3 保持手动也可接受。
- 难度：S。

---

## 优化机会（最多 3 条）

1. **发布说明生成器**：`scripts/release-notes.mjs` + `body_path` 改指向它，把 v0.30.0 的两行正文升级成完整模板。一次投入，每版受益。
2. **首屏预算进门禁**：`gate` 加 `measure-first-screen.mjs --max 285000`，让 285,000 B 从文档承诺变成 CI 事实。
3. **截图瘦身**：新图转 WebP、只留最近 2–3 轮；先止住增长，重写历史缩减 pack 另案审批。按现体积估算，只停止增长就能把后续每轮新增从约 2 MB 降到约 0.5 MB。

## 建议实施顺序（本轮）

1. `SECURITY.md` + 打开私有漏洞报告（需产品负责人点设置）。
2. `PRIVACY.md` 草案（标「待确认」）。
3. `bug.yml`、`feature.yml`、`config.yml`、`PULL_REQUEST_TEMPLATE.md`。
4. CONTRIBUTING 修订（PR/Issue/发布/提交格式）。
5. `.gitignore` 补证书/密钥/`.sidelight`/dmg。
6. Release 模板 + `release-notes.mjs` + `append_body: false`。
7. CI：measure 进 gate；install-verify 加输入；CI badge。
8. CODEOWNERS、Dependabot、CoC 延后。
