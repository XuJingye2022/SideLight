# 第 18 轮 · 实施报告 B（builder2）

执行人：builder2。T1 对外三份文档 → T2 模板/发布说明/README 入口 → T3 安全与 CI 小修 → T4 一致性修正。未 commit、未重打产物；`npm test` 16 文件 205 条 exit 0。

---

## T1 对外三份文档 —— PASS（PRIVACY 仍是草案）

- **CONTRIBUTING.md（重写，13 节）**：先读 → 项目与两套宿主 → 环境（Node 24 / npm 11 / Windows 11 / macOS 13+ + Xcode CLT / WebView2，无需管理员或 MSVC）→ 10 分钟上手（`git clone` → `npm ci` → `npm run dev` → `npm test`，注明只监听 `localhost:5173`）→ 目录表 → 两档门禁（外部 PR：`npx tsc --noEmit` / `npm test` / `npm run build`；改序列化才加 `npm run roundtrip`；已删「实施期间不要跑 build」）→ 测试（新文件要手动挂进 `package.json`，16 文件 205 条）→ 风格（2 空格、单引号、无分号、strict、只改相关行）→ 提交（外部 `type(scope): summary`、内部 `round-NN:`）→ PR 检查单 → ADR → 发布（tag `v*` / 手动 `tag`+`publish`、`install-verify` 只手动）→ MIT。
- **SECURITY.md（新，10 节）**：支持 `0.30.x`、`<0.30` 只建议升级；渠道两态——状态 A（已开启）用 `security/advisories/new`，状态 B（当前 `enabled=false`）先开 Issue 只写「需要私下报告渠道」，**不编邮箱**（`@` 地址断言 0）；报告内容/范围/范围外；信任边界（只绑 `127.0.0.1:47821`、校验 `Host`、无 CORS、页面不拿完整路径、最坏只覆盖当前文档）；密钥边界（明文 localStorage、只发用户端点、永不索要 Key、Apple secrets 只在 GitHub Secrets、仓库不存证书）；日志脱敏（basename；例外 `navigate`/`permission` 记完整 URI；Windows 安装目录、macOS 不落盘）；响应时限/披露窗口/赏金三句标「待产品负责人确认」。
- **PRIVACY.md（新，草案）**：首行「**草案。待产品负责人确认；确认前不得作为对外承诺。**」；数据表按「存哪 / 是否出网 / 怎么删」覆盖正文、Key、草稿、批注、trash、最近记录、日志、WebView 配置、保存临时文件、导出；事实已按代码修正：最近记录**磁盘含完整路径**、页面只拿 `id` + **文件名** + **目录段**；日志在**安装目录**且 `navigate` 记**导航的完整 URL**；macOS WebView 存储**未核实**；`%LOCALAPPDATA%\Sidelight\WebView2`；8 条承诺逐条「待产品负责人确认」（全文 10 处）。

静态断言：`待产品负责人确认` 10；`不拿路径` 0；`git clone`/`npm ci`/`localhost:5173` 齐；`不要跑 build` 0；SECURITY 邮箱 0。

---

## T2 模板、发布说明、README 入口 —— PASS（真实渲染待推送）

- `.github/ISSUE_TEMPLATE/bug.yml`：必填版本/系统/安装方式/复现，可选日志（先脱敏），三个必勾 checkbox；顶部提示先读 README 已知限制、先搜 Issue、不贴 Key/正文/完整路径；`labels: [bug]`。
- `feature.yml`：问题/提案/替代/影响面/是否提 PR；`labels: [enhancement]`。
- `config.yml`：`blank_issues_enabled: false`；只启用「已知限制」一条；私有漏洞报告入口**保留为注释**并说明开启步骤（当前 `enabled=false`）。
- `PULL_REQUEST_TEMPLATE.md`：关联 Issue、改了什么/为什么、影响面勾选、门禁输出（tsc/test/build，改序列化加 roundtrip）、截图、数据安全、无新运行时依赖、MIT、回滚。
- `scripts/release-notes.mjs`（新）：读版本 + CHANGELOG 当节 + 资产字节/SHA，生成六节正文（本次更新、下载表、安装/Windows、安装/macOS、校验、数据与卸载、已知限制）；签名状态放首行 **HTML 注释**，可见正文写「未签名、未公证」或「已签名并公证」。
  - 本地验证：`--dry-run` exit 0；三节标题 `## 下载`/`## 安装`/`## 校验`/`## 已知限制` 与 `### Windows`/`### macOS` 齐；用 3 个假资产跑表，字节与 SHA256 正确；可见 `signing=` 0。
- `release.yml`：checksum 步骤后生成 `out/RELEASE_NOTES.md`，断言含三个资产名；`body_path: out/RELEASE_NOTES.md` + `append_body: false`；签名状态改由 `macos-build` 的 job output `signing` 传给 `env.SIGNING`，**`signing.txt` 引用 0**。
- README：标题下加 CI badge（官方 actions URL，无 shields）；新增「参与贡献」段（CONTRIBUTING / SECURITY / PRIVACY 草案 / AGENTS / GLOSSARY / ADR / LICENSE）。
- **CODEOWNERS 本轮不加**（单维护者、无分支保护，价值低），记录在此。

---

## T3 安全与 CI 小修 —— PASS

- `.gitignore` 追加 `*.p12`、`*.pfx`、`*.pem`、`*.key`、`*.cer`、`*.mobileprovision`、`.env`、`.env.*`、`!.env.example`、`.sidelight/`、`*.dmg`；`git check-ignore -v` 对 9 个测试路径全部命中。
- `ci.yml` gate 在 `npm run build` 后加 `node scripts/measure-first-screen.mjs --max 285000`（无 `continue-on-error`）。
- `workflow_dispatch` 加 `run_install_verify`（boolean，默认 false）；`install-verify` 条件改 `... && inputs.run_install_verify && success()`。
- action pin 到 SHA **本轮不做**（R4-K5 延后）。

---

## T4 一致性修正 —— PASS

- README:64 矛盾句改为「不能移动、复制文件，也不能删目录；重命名只支持同目录 `.md`/`.markdown`」。
- README 安装段不再指本地 `release/`，改「从 Releases 页下载」；签名拆平台（Windows 无签名；macOS 默认 ad-hoc，有 Apple secrets 才签名+公证）。
- README macOS 命令：`-macos-universal.zip`、`.tmp/mac/stage/...--self-test --require-bundle`；无 `-macos-<arch>`、无 `Sidelight-0.30.0-win`。
- README 隐私段：最近记录含完整路径、页面拿文件名与目录段、日志在安装目录且 `navigate` 记完整 URL、macOS WebView 存储未核实、补 `%LOCALAPPDATA%\Sidelight\WebView2`；`不拿路径` 0。
- README 测试文件说明：16 个挂进 `npm test`，目录里 `katexLazy.test.ts` 未挂。
- CHANGELOG 0.30.0：48 组 → **43 组适用、5 组排除、适用组全过**；`theme-acceptance` **27/27**；回填 0.30.0 三资产 **817,983 / 902,274 / 890,004 B**，SHA 引 `SHA256SUMS-0.30.0.txt`；删「出包后回填」；末尾加「数字为发布后回填」。
- `docs/iteration/STATE.md:24` → 16 个文件 205 条；`packaging/README.md` 编号 1–5、日志位置改「安装目录 `host.log*`，随程序目录卸载删除」。
- `release.yml` 示例 tag → `v0.30.0`。
- 围栏：README/CONTRIBUTING/SECURITY/PRIVACY/CHANGELOG/packaging 全偶数；无 BOM。

---

## 待产品负责人确认（PRIVACY 草案 + SECURITY 时限）

1. 8 条隐私承诺（无遥测、无自建服务器、Key 明文、搜索查询词、删除范围、trash 不自动清理、不卖数据、生效日期/联系方式/司法辖区）逐条确认。
2. 安全响应时限（目标 3 个工作日）、披露窗口（参考 90 天）、是否有赏金。
3. macOS WebView 存储位置（本机未核实，文案已写「未核实」）。
4. 是否开启 GitHub 私有漏洞报告（开启后启用 config.yml 第二条 contact link 并改 SECURITY 状态）。

## 遗留

- 真实 GitHub 渲染（Issue 表单、PR 模板、badge）与 `release.yml` 首跑未经 CI 证明；YAML 只做了结构走查。
- `release.yml` 里保留 `-macos-arm64.zip` 字符串用于删除旧资产，是唯一一处旧名（不是文档承诺）。
- action pin / Dependabot / CODEOWNERS / 行为准则 / 截图 WebP 与 `filter-repo` 仍延后。
