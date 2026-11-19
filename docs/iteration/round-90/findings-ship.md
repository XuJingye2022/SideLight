# 第 90 轮 findings-ship（安装与启动）

- 轮前 startSha：`5c3b832d3af085809fb909ec88a072b7819e26a9`（工作树干净）
- 门禁：`npm run verify` PASS；首屏 gzip **309,074 B**（内部预算 310,000，余 **926 B**；硬线 320,000，余 10,926 B）
- 发布链：payload / 安装包 / dist→www 镜像自洽（见 F4）

## F1（P1｜发布阻断风险）首屏余 926 B，本轮两次 UI 改造必须先算体积

- 证据：`npm run verify` 输出 `total raw=1000071 gzip=309074 headroom=10926 files=3 max=320000`、`target=310000 gap=926`、`WARN 首屏距硬线 320000 只余 10926 B`。
- 门槛语义：`scripts/measure-first-screen.mjs:4-6,22` 内部预算只 WARN、硬线 `exit 1`（`:72-82`）。所以新增静态代码 >10,926 B gzip 会让本轮 verify 直接 FAIL。
- 用户焦点要加的两处都是静态 UI：行内公式改成就地编辑、代码块顶部语言标签+切换。入口 chunk 已 953.58 kB（gzip 303.14 kB），首屏集合只 3 个文件（入口 JS / rolldown-runtime / CSS），没有可再压缩的余量。
- 建议：planner 把「改前 309,074 B」写进验收，落地后重量；实现优先复用现有组件与 CSS，不引新运行时依赖。若要语法高亮：红线 6 需产品负责人批准，且必须惰性 chunk（同 KaTeX/Mermaid，`measure-first-screen.mjs:69` 会拦首屏集合里的 lazy chunk）。

## F2（P2｜查重）用户 #3「语言标签/切换」与 B-135 的关系

- `docs/iteration/BACKLOG.md:44` 已有 B-135（`deferred`）：代码围栏无语法高亮；`docs/typora-gap.md:60` 同一条「代码块语言高亮 无 P1 需惰性 chunk、按红线 6 加依赖待批准」。
- 复核：`git grep -nEi '\b(highlight|prism|shiki|lowlight)\b' -- src package.json` **0 命中**（exit 1），高亮依赖确实不存在。
- 结论：不要为「高亮」重复建条目；用户新要的「顶部语言标签 + 可切换」是另一半，建议并入 B-135 或单开一条（P1 体验）。语言标签本身是轻量 DOM/CSS，可与高亮解耦；「```js 保存为 ```js」属序列化门，归 `npm run roundtrip`，不是 ship 口径。

## F3（P2｜环境/文档）BRIEF.md 已过期，会误导后续代理

- `docs/iteration/BRIEF.md:6-9` 写「已停止、测试 40 文件 524 条、首屏 302,014 B、HEAD ece6eac、本轮端口 9222–9226」。
- 实测：HEAD `5c3b832`；首屏 309,074 B；`AGENTS.md` 第 6 节记 54 文件 724 条；本轮实际 CDP 9224（用户告知 9222–9226 不可用，ego 浏览器 54280 可用）。
- 建议：本批 scribe 同步 BRIEF 的「当前」段（含停止态与端口），否则下一位 finder 会按 302,014 B 估余量，多算 7,060 B。

## F4（非问题｜证据）发布链自洽，B-125 的版本门仍成立

- `dist` 98 文件 3,915,646 B = `host\bin\www` 98 文件 3,915,646 B（`npm run build` 链尾镜像，入口 `assets/index-BMMRT4gx.js`）。
- `host\bin\Sidelight.exe` 90,624 B、FileVersion **0.32.1.0** = `package.json` 0.32.1（`installer.ps1:30-35`、`portable.ps1:36-42` 的 payload 版本门不会误拦）。
- `release/Sidelight-0.32.1-win-x64-setup.exe` 1,322,451 B、FileVersion **0.32.1.0**、`SHA256SUMS-0.32.1.txt` 两条哈希齐（B-125 已 fixed，旧 0.31.1.0 包已被覆盖）。
- 硬线：`installer.ps1:98-124` / `portable.ps1:16` / `verify-installer.ps1:88-92` 的 45,000,000 / 50,000,000 B 与 BRIEF 红线 7 一致；安装包距 45 MB 预算约 43.68 MB。
- README 的体积数字不过期：`README.md:120` 的 309,074 B 与本次 verify 一致。

## 未做 / UNVERIFIED

- 未跑 `packaging/installer.ps1 -AssocDryRun`、`portable.ps1`：两者都会写 `release/`，红线 8 禁止本轮改动；也未走真人安装。
- 未启动 Chromium/CDP 9222–9226（沙箱禁用、用户告知不可用）；真机检查留给有 ego 54280 的复现角色。
- 代码围栏 info string 的保存往返未由本角色实测（归复现/序列化角色与 `npm run roundtrip`）。
