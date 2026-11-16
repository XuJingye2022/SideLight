# 第 18 轮 · 独立验收（tester）

日期：2026-11-16。原提交 `2fa7afc`（docs），复验修复提交 `83b037b`（docs: clarify external contribution and security boundaries），基线 v0.30.0。本机 Windows；只验文档/模板/CI/仓库文件，不改 `src/**`、不 commit。

## 1. CONTRIBUTING：**PASS**

- 13 个 `##` 节齐全（0 先读、1 项目、2 环境、3 上手、4 目录、5 门禁、6 测试、7 风格、8 提交、9 PR、10 ADR、11 发布、12 许可证）；`npm run dev/build/test/roundtrip` 均存在于 `package.json`；`git clone`、`npm ci`、`localhost:5173` 均有；无「实施期间不要跑 build」。
- 复验：全文无「内部」「代理」「round-NN」；对外贡献流程不再引用内部纪律或轮次提交格式。13 节与命令仍齐。

## 2. SECURITY：**PASS**

- 支持 **0.30.x**；`<0.30` 只建议升级；两种报告渠道（已开启 `security/advisories/new`，当前 `enabled=false` 时先开 Issue）；**0 个邮箱**；Key 明文 `localStorage`、Apple 证书只在 Secrets；日志 basename 例外列出 `navigation`/`permission` 完整 URI；响应/披露/赏金均标「待产品负责人确认」。
- 复验：`:19` 已写「加上 `security` 标签」；`:53` 已写 `.sidelight/` 缓存（草稿、批注、trash）只在本机、不上传；Key/证书/`.sidelight` 三边界齐。

## 3. PRIVACY：**PASS**

- 首行「**草案。待产品负责人确认；确认前不得作为对外承诺。**」逐字存在；`待产品负责人确认` 计数 **10**，8 条承诺逐条标注。
- 事实与代码一致：`recent.json` 磁盘含完整路径、页面 `{id,name,dir}`；`host.log*` 在安装目录；`navigate`/`permission` 记完整 URI；Key 明文 `localStorage`；搜索把 `query` 发 Tavily/博查；trash 不自动清理、卸载不删 `.sidelight`；Windows WebView2/`%LOCALAPPDATA%` 与 macOS 未核实位置均写明。

## 4. 模板 / 发布说明 / README：**PASS**

- `bug.yml`、`feature.yml`、`config.yml`、`PULL_REQUEST_TEMPLATE.md` 均存在；`bug`/`enhancement` 是唯一 template labels；`config.yml` 第二条私有入口按未开启注释掉。
- `scripts/release-notes.mjs --dry-run`：输出六节（本次更新/下载/安装/校验/数据与卸载/已知限制），**不创建** `out/RELEASE_NOTES.md`；正文不含可见 `signing=`，签名状态在 HTML 注释。
- `.github/workflows/release.yml`：`body_path: out/RELEASE_NOTES.md`、`append_body: false`、签名状态注释均命中。
- README 有 CI badge（不引 shields）与「参与贡献」**7 个链接**（CONTRIBUTING/SECURITY/PRIVACY/AGENTS/GLOSSARY/ADR/LICENSE）。
- 复验：issue 模板已改 `../../README.md`、`../../AGENTS.md`；Node 链接检查 **TEMPLATE LINKS OK**，三个目标均在仓库根。

## 5. 安全 / CI：**PASS**

- `.gitignore` 9 类全部 `check-ignore` 命中：`x.p12`、`x.pfx`、`x.pem`、`x.key`、`x.cer`、`x.mobileprovision`、`.env`、`.sidelight/drafts/a.md`、`x.dmg`；`.env.example` 走 `!.env.example` 不被忽略。
- `ci.yml`：`gate` 内含 `node scripts/measure-first-screen.mjs --max 285000`，该步无 `continue-on-error`；`workflow_dispatch.inputs.run_install_verify` 为 boolean、默认 **false**，`install-verify` 条件含 `inputs.run_install_verify`。

## 6. 一致性：**PASS**

- README 重命名句已改「不能移动、复制文件，也不能删目录；重命名只支持同目录 `.md`/`.markdown`」；macOS 命令为 `-macos-universal.zip`、`.tmp/mac/stage`、`--require-bundle`。
- CHANGELOG 0.30.0：**43 组适用/5 排除**、`theme-acceptance 27/27`、三资产 **817,983 / 902,274 / 890,004**；无「出包后回填」。
- STATE:24 **16 个测试文件 205 条**；packaging/README 编号 1–5；代码围栏全部偶数、无 BOM；README/CHANGELOG/STATE 无 0.29 包名/旧 `-macos-<arch>`。
- 本地链接检查：README/CONTRIBUTING/SECURITY/PRIVACY/packaging/CHANGELOG/STATE 全通；issue 模板复验后全通。

## 7. 回归 / CI 状态

- `npm test`：**16 文件、205 条、0 失败**（`.tmp/r18-test.log`）。
- GitHub Actions：`2fa7afc` 的 **#22 success**；修复提交 `83b037b` 的 **#23** 复验时为 `in_progress`，尚不能记完成。
- 前端 `src/**` 未出现在 `2fa7afc`；工作区另有第 17 轮未提交 `src/App.tsx`、`src/lib/workspace.ts` 与脚本（6 项未跟踪），不属本轮提交。

## 8. 范围 / 待人工确认

- `git show --stat 83b037b`：4 文件（CONTRIBUTING/SECURITY/bug.yml/feature.yml），均为文档/模板；`2fa7afc` 26 文件也全部 `.md`/`.yml`/`.gitignore`/`scripts/release-notes.mjs`/截图；无 `src/**`、无 `package.json`、无 host/packaging 脚本。
- 无 `.p12/.pfx/.pem/.key/.cer/.mobileprovision/.env` 入库（`git ls-files` 0）；`release/`、`dist/`、`.tmp/`、`host/bin/` 未入库；未改 GitHub 设置（本机无 gh，未做 API 写）。
- **待人工确认**：私有漏洞报告是否开启；响应时限/披露窗口/赏金；PRIVACY 8 条承诺；LICENSE 版权人；仓库名 `SideLight` vs 产品名；GitHub topics/labels/分支保护/tag 保护；截图瘦身/Release 发布动作；`83b037b` 的 CI 最终结论。

## 判定

**PASS-WITH-UNVERIFIED**

- 三处修复复验通过：CONTRIBUTING 无内部/代理/round-NN；SECURITY 有 `.sidelight` 边界与 `security` 标签；issue 模板链接 `../../` 全通。
- 其余原结论保留：PRIVACY、release-notes、`.gitignore`/CI、README/CHANGELOG/STATE 一致；`npm test` 205；`2fa7afc` CI #22 success。
- **UNVERIFIED**：`83b037b` CI 仍在进行；私有漏洞报告/时限/赏金、PRIVACY 承诺、LICENSE/仓库名/GitHub 设置等仍需人工确认；工作区第 17 轮源码改动不属本轮。
