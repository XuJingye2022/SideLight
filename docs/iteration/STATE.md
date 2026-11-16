# Sidelight 迭代看板

这份文件是所有参与迭代的代理的共享记忆。每轮结束由根代理更新。

## 目标

把 Sidelight 做成可发布的开源桌面 Markdown 编辑器，Windows 首发。验收维度：功能好用、安装简单、体积小巧、界面简洁美观、易于操作。

## 循环（共 20 轮）

每轮五个阶段，顺序固定：

1. **侦察**：3 个 finder 并行（缺陷 / 体验 / 发布），只读。产出 `round-NN/findings-*.md`，每条问题带证据与文件:行号。同时指出代码优化机会：重复、死代码、性能热点、体积浪费。
2. **计划**：planner 读三份发现 + 本文件 + `git log`，写 `round-NN/plan.md`，最多 5 个任务，每个任务写清文件、验收标准、门禁命令、风险。
3. **审计划**：critic 对照代码验证计划，写 `round-NN/plan-review.md`，结论 PASS 或 REVISE + 编号漏洞。REVISE 时 planner 修改，最多 2 次。
4. **实施**：builder 与 builder2 按互不重叠的文件范围执行。每完成一个任务跑该任务的门禁。产出 `round-NN/impl.md`。
5. **验收**：tester 独立复验（不看实施报告、自己跑），写 `round-NN/test.md`。结论三选一：**PASS** / **PASS-WITH-UNVERIFIED** / **FAIL**。UNVERIFIED 必须写清哪一条、为什么测不了、下一轮怎么补，不因此回滚整轮。门禁破、验收项造假、引入回归才判 FAIL；FAIL 时 builder 修复后复验，最多 2 次，仍 FAIL 则整轮回滚（`git reset --hard` 到轮前 commit）。

根代理只在阶段之间做事：分派、读报告、跑最终门禁、commit、更新本文件。根代理不写产品代码。

## 门禁

- `npm run build`（类型检查 + 打包）
- `npm test`（以 `package.json` 为准，当前 16 个文件 205 条）
- 改编辑器或 Markdown 序列化时加跑 `npm run roundtrip`
- 界面变化必须截图，图落 `shots/`，实施报告里引用
- 每轮结束根代理跑 `npm run build` + `npm test`，通过才 commit：`round-NN: <一句话>`

## 环境事实（2026-11-15 核实）

- 仓库：`D:\Documents\SidelightProgram`，branch `main`，基线 commit `342481b`。
- Node 24.21 / npm 11.19。没有 pnpm、没有 Rust、没有 VS Build Tools、没有管理员权限。WebView2 运行时已安装（`C:\Program Files (x86)\Microsoft\EdgeWebView\Application`）。
- dev server：`http://localhost:5173`。Vite 只绑 IPv6 的 `::1`，`127.0.0.1:5173` 连不上，统一写 `localhost`。HMR 自动跟代码。
- CDP 浏览器：`http://127.0.0.1:9222`、`:9223`、`:9224`（headless Edge，profile 在系统临时目录）。`scripts/*.mjs` 用 `chromium.connectOverCDP('http://127.0.0.1:9222')`；需要独立端口时改脚本里的端口，别和别人共用。
- 网络可用：npm registry 与 crates.io 都是 443 可达。
- 发布路径：ADR-0004。C#/.NET Framework + WebView2 宿主 `host/` 已跑通窗口、单实例、argv、真实文件夹读写；安装包尚未制作。Tauri 2 留作目标，需管理员或 CI。
- 中文输入法未验证；真模型与搜索接口无 key，用模拟流测试。

## 产品硬约束（动手前读 AGENTS.md 与 docs/adr/）

- 编辑器内核 Tiptap，不换。
- AI 不直接写正文：修订建议只有人点「采纳」才落入正文。
- 意见用页边批注，不退回右侧列表。
- 只做自带密钥，不代管请求。
- 缓存只写 `.sidelight/`，文档同级优先，打开文件夹时写工作区根目录。
- 不新增运行时依赖，除非省下的代码比依赖大；加了要在 README 记一行理由。
- 轻量是产品底线：不加后台常驻、启动不联网、安装包体积与冷启动时间是验收项。
- 术语以 `GLOSSARY.md` 为准，术语变了当场改。

## 当前版本与体积

- v0.32.0。`dist` 1,461,127 B；首屏 JS+CSS gzip **285,997 B**（临时上限 286,000，数据安全例外，余 3 B）；测试 17 文件 248 条。
- 发布资产：Windows setup 824,473 B、Windows zip 910,519 B、macOS Universal zip 906,060 B；校验和见 Release `SHA256SUMS-0.32.0.txt`。内部预算 820,000，硬线 850,000 未动。
- 重开恢复：IndexedDB 只存 FSA 句柄；宿主 `/__annotations` 读回；Ctrl+S 原地。批注 v2（overall/unresolved）；重跑整窗替换。
- 键盘：Ctrl+K 链接、Ctrl+M/Shift+M 公式、Ctrl+P 快速打开、Ctrl+1–6/0、Ctrl+/ 源码、表格 Tab/Ctrl+Enter、侧栏 Ctrl+Shift+1/3/L；宿主已关浏览器加速键。
- 高风险未验：真实重开权限、150%/200% 屏、真模型提示词质量、真实 DeepSeek 搜索、macOS 快捷键、旧会话已丢弃批注不可恢复。

## 轮次记录

| 轮 | 主题 | 计划 | 结果 | commit |
| --- | --- | --- | --- | --- |
| 1 | 基线体检 + 发布路径决策 | round-01/plan.md | PASS：货币吞字修复、字体 1,072,948→256,168 B、开源文件、宿主 5/5 | cb36110 |
| 2 | 首次使用可信 + 静默丢字 | round-02/plan.md | PASS：转发确认与队列、长路径、启动失败、便携 zip 900,752 B、模拟标注/对比度/焦点 | 6c9c2b0 |
| 3 | 冷启动 + 安装器 + 窄窗/错误 | round-03/plan.md | PASS-WITH-UNVERIFIED：FCP 2.2 s→304 ms、NSIS 827,198 B、窄窗无溢出、错误可操作 | db4f617 |
| 4 | 保存落点 + 文件菜单 + 导出/只读 | round-04/plan.md | PASS-WITH-UNVERIFIED：保存选落点、新建/另存为、源码导出、argv 只读横幅 | 11c3348 |
| 5 | 键盘/主题/公式导出/字体 | round-05/plan.md | PASS-WITH-UNVERIFIED：快捷键与焦点、三档主题、MathML 导出、15 woff2、0.18.0 | 2b031e8 |
| 6 | 写回原文件 + 编码/大文件 | round-06/plan.md | PASS-WITH-UNVERIFIED：/__doc + postMessage、BOM/CRLF/GBK 保留、6 MB 上限、0.19.0 | d5e7b8d |
| 7 | 保存门 + 源码原文 + 关联 opt-in | round-07/plan.md | PASS-WITH-UNVERIFIED：四条保存路径统一差异门、源码显示原文、.md 打开方式 opt-in、0.20.0 | d65164a |
| 8 | 草稿兜底 + 关窗保护 + 自动保存 | round-08/plan.md | PASS-WITH-UNVERIFIED：宿主草稿/恢复、关窗三选一、自动保存安全子集、0.21.0 | 47e5602 |
| 9 | 最近文件 + 日志脱敏 + CI | round-09/plan.md | PASS-WITH-UNVERIFIED：宿主最近 8 篇、`/__recent` 无路径、日志只记 basename、CI 目录修复、0.22.0 | fa06aa1 |
| 10 | 表格/空行/引用式链接 | round-10/plan.md | PASS-WITH-UNVERIFIED：表格整块复用、01 空行、04 默认源码、rich 5/7 source 7/7、0.23.0 | 4878030 |
| 11 | KaTeX 惰性 + 首屏预算 | round-11/plan.md | PASS-WITH-UNVERIFIED：首屏 364,960→282,809 B、alias/shim/导出/占位全过、0.24.0 | 6bd6831 |
| 12 | 文件树删除/刷新/可访问性 | round-12/plan.md | PASS-WITH-UNVERIFIED：删文件进 trash、删除不复活、树键盘与 live region、0.25.0 | 971e1ca |
| 13 | 重命名 + 树细节 + 大纲可访问性 | round-13/plan.md | PASS-WITH-UNVERIFIED：安全重命名 22/22、树 43/43、aria-current、0.26.0 | ad1777d |
| 14 | 首次使用 + P3/P4 + 发布自动化 | round-14/plan.md | PASS-WITH-UNVERIFIED：新建不再覆盖旧文件、首屏 283,826、tablist/展开态、release.yml 自动发 0.28.1 | 6c32aec |
| 15 | macOS Universal + 签名/公证流水线 | round-15/plan.md | PASS-WITH-UNVERIFIED：fat 双片、self-test 6 项、0.29.0 自动发、签名分支静态过 | c4119d8 |
| 16 | 界面一致性与可访问性 | round-16/plan.md | PASS-WITH-UNVERIFIED：树隐藏 P0、深色/焦点/输入边界/reduced-motion、theme 27/27（43/48 适用）、0.30.0 | d10daa5 |
| 17 | 保存竞态 + 大文件 + 性能 | round-17/plan.md | PASS-WITH-UNVERIFIED：B1/B3 修复、5.5 MiB 上限、1MB 载入 1284ms、逐键 p95 未测；0.30.1/0.30.3 | b799cf2 |
| 18 | 开源文档与仓库治理 | round-18/plan.md | PASS-WITH-UNVERIFIED：CONTRIBUTING/SECURITY/PRIVACY 草案、模板、release notes、CI 门 | 83b037b |
| 19 | 收尾硬化 + 0.30.2 | round-19/plan.md | PASS-WITH-UNVERIFIED：草稿清理 61/61、性能数字更正、Release 说明；0.30.2 | ab7aaea |
| 20 | 最终硬化 + 0.30.3 | round-20/plan.md | PASS-WITH-UNVERIFIED：onUpdate 拆分、1MB 载入 1284ms、draft 61/61、首屏 284,766、0.30.3 | b43b5c8 |
| 21 | 深水区侦察 + C1/D1 P0 | round-21/plan.md | PASS-WITH-UNVERIFIED：脚注续行/混合尾、删除脏文件正文+草稿+批注可撤销、0.30.4 | 584d5e7 |
| 22 | 六路第二批侦察 | round-22/plan.md | RECON：核心修复闭合；新发现 D2/D3、M1、F2/F4、I1/I4、1MB 54s | 39b8427 |
| 23 | 数据与 Markdown 修复 | round-23/plan.md | PASS-WITH-UNVERIFIED：草稿恢复、大小门、垃圾字节、`\$`、脚注 4 空格、CRLF、0.31.0 | dbfc6f9 |
| 24 | 体验三项 | round-24/plan.md | PASS-WITH-UNVERIFIED：窄窗自动开批注、查找入口、Tab 插空格、0.31.1 | e92d1a4 |
| 25 | 平台与最终版 | round-25/plan.md | PASS-WITH-UNVERIFIED：host --version/置前、NSIS 版本/运行检测、macOS openFiles、0.31.1；卸载 exit 0 UNVERIFIED | e92d1a4 |
| 26 | 重开恢复 + 批注 v2 + 提示词 + DPI + DeepSeek | round-26/plan.md | PASS-WITH-UNVERIFIED：session 15/15、annotation 8/8、host 11/11、提示词 796 字、PerMonitorV2、DeepSeek 搜索；0.32.0 | c035a1d |
| 27 | 键盘链接/公式 + Typora 快键 | round-27/plan.md | PASS-WITH-UNVERIFIED：keyboard 49/49、Ctrl+P/标题/源码/表格/侧栏、首屏 285,997；0.32.0 | c035a1d |

## 待办池（finder 优先从这里挑，也可自己发现）

- **真实环境 UNVERIFIED**：HKCU 关联/打开方式/卸载、真人双击、系统对话框、真实 IME、文件占用/网络盘/中文长路径、AltGr、Alt+F4/注销关窗、只读目录草稿失败、localStorage 配额、真实最近列表、真实宿主源码保存字节、真实 WebView2 冷启动、离线 KaTeX chunk、打印路径、trash 手动恢复、并发删除、真实盘 `move()`/大小写/OneDrive、屏幕阅读器实录、旧最近记录 `FILE_GONE`、缓存迁移写失败、真实 Intel Mac 运行、Rosetta、真实 Developer ID 签名/公证、图标真机显示、⌘C/⌘V/⌘Z。
- **发布**：隐私声明仍标「待产品负责人确认」；`.md` 关联 opt-in 未做（待产品负责人）；Apple Developer Program 需付费，签名 secrets 尚未配置（`APPLE_CERT_P12_BASE64`、`APPLE_CERT_PASSWORD`、`APPLE_SIGN_IDENTITY`、`APPLE_TEAM_ID`、`APPLE_ID`、`APPLE_APP_SPECIFIC_PASSWORD`）；README 最终一致性复核。
- **第 17 轮待修 P0**：保存回包跨文档覆盖（B1）、保存中丢字（B3）、文件树 5.9 MB 无上限卡死（B2）；每键两次全文序列化 + 全量 localStorage；`App.tsx` 4,348 行。
- **可访问性 P2**：骨架 `role=dialog`/`aria-busy`、批注卡 Enter、正文开头 Tab 回环（延后）。
- **体验**：主题细化、首次引导可再打磨、Mermaid/自定义字体（可选）、自定义快捷键。
- **工程**：`src/App.tsx` 4,348 行；三处重复序列化/草稿写入；22 处字号无变量；性能与内存未系统测。
- 密钥明文存 localStorage；6 MB 上限；500 toast 原始响应未进 title。
- ADR-0004 载荷数每次宿主改动后要复算。

## 发布状态（2026-11-16）

- 仓库：https://github.com/XuJingye2022/SideLight（public，MIT，版权人 XuJingye）。
- 最新发布：https://github.com/XuJingye2022/SideLight/releases/tag/v0.32.0
  - Windows：`Sidelight-0.32.0-win-x64-setup.exe` 824,473 B、`Sidelight-0.32.0-win-x64-portable.zip` 910,519 B。
  - macOS：`Sidelight-0.32.0-macos-universal.zip` 906,060 B（arm64 + x86_64），ad-hoc，未公证；macOS 13+。
  - `SHA256SUMS-0.32.0.txt`。
- 签名/公证：`release.yml` 已接可选分支；配齐 6 个 Apple secrets 后自动签名 + 公证 + staple；否则 ad-hoc 并在 Release body 标「未签名、未公证」。
- 版本：0.32.0 修复 7 项用户问题（重开恢复、提示词、整体评价、键盘链接/公式、重跑覆盖、DPI、DeepSeek 搜索）并吸收 Typora 快键；0.31.x 为平台/数据修复。
- 发布自动化：`.github/workflows/release.yml`（tag `v*` 或手动 `tag` + `publish`）已多次实测；CI `gate`/`windows-host`/`macos-host` 全绿；`install-verify` 仅手动。
- 推送方式：`origin` 用 SSH over 443（`ssh://git@ssh.github.com:443/XuJingye2022/SideLight.git`），仓库里加了一把 write deploy key `sidelight-agent`（2026-11-16）；不用时可在 GitHub Settings → Deploy keys 删除。
- CI Windows smoke 已忽略预期 404：`/__doc`、`/__draft`、`/favicon.ico`；`/__annotations` 无缓存返回 200 空 store。

## 下一轮怎么开始（给接手的调度器）

1. 读本文件、`AGENTS.md`、最近一次 `docs/iteration/round-13/test.md`。
2. 起 dev server（`node node_modules/vite/bin/vite.js`，写 `localhost:5173`），确认 200。
3. 派 3 个新 finder（缺陷/体验/发布）只读侦察，报告写 `round-14/findings-*.md`；重点从上面待办池挑。
4. 复用已有持久代理：`planner`、`critic`、`builder`、`builder2`、`tester`（用 send_message，别新建同名）。
5. 按「侦察 → 计划 → 审计划 → 实施 → 验收」循环；根代理只在阶段之间分派、跑最终门禁、commit、更新本文件。
6. 第 21–25 轮已完成。后续若继续：优先真实 macOS/Intel/签名公证、100 KB–1 MB 性能包线、UX L1/F3、安装器运行中卸载、P2 可访问性；没有新的必过门禁项。

## 决策记录

- 2026-11-15 根代理：`git init` 并导入基线 `342481b`；删除 3.1 GB 陈旧 Edge profile；`.gitignore` 增加 `.edge-profile*`、`.tmp/`、`*.log`。
- 2026-11-15 根代理：构建纪律。实施期间任何人不得直接跑 `npm run build`（并发写 `dist/` 会互相清空）；类型检查用 `npx tsc --noEmit`，需要产物用 `npx vite build --outDir .tmp/build-a|build-b`；每轮最终 `npm run build` 由根代理串行跑一次。
- 2026-11-15 根代理（代产品负责人）：许可证选 MIT；版权人写 `Sidelight contributors`，不写个人姓名。真实仓库地址与署名等对外信息，首发前由产品负责人最终确认。
- 2026-11-15 根代理：dev server 用 `http://localhost:5173`，不要写 `127.0.0.1`（Vite 只绑 `::1`）。
- 2026-11-15 第 1 轮：接受 ADR-0004，发布路径先走 C# WebView2 宿主。宿主五项验收全 PASS，含真实文件夹读写。
- 2026-11-15 第 2 轮：便携 zip 成为第一个可分发的构建产物（900,752 B，`release/`）；安装器、`.md` 关联、卸载留给后续轮。宿主转发新文件前必须确认未保存改动。
- 2026-11-15 第 3 轮：宿主 origin 固定为 `http://127.0.0.1:47821`，旧 `https://sidelight.local` 的 localStorage 一次性丢失（预发布代价，ADR-0005）。NSIS per-user 安装包装到 `%LOCALAPPDATA%\Programs\Sidelight`，卸载保留用户数据。
- 2026-11-15 第 4 轮：无句柄保存用 `showSaveFilePicker`，取消不清 dirty；argv 打开的文件按只读处理，显示横幅，`Ctrl+S` 走另存为；原文件写回留待宿主 IPC。
- 2026-11-15 第 5 轮：主题三档（浅/深/跟随系统）；快捷键改用 `Ctrl+Alt+*`，删除线改 `Ctrl+Shift+X`；HTML 导出用 KaTeX MathML 自包含；字体裁到 15 个 woff2；`chunkSizeWarningLimit` 1200，不拆 KaTeX；版本 0.18.0。
- 2026-11-15 第 6 轮：宿主正文改走 `GET /__doc` + `postMessage` 写回，不再经 localStorage；保留 BOM/CRLF/GBK；原子替换；6 MB 解析上限（超过给可见错误）；30 个零引用截图移出跟踪；版本 0.19.0。
- 2026-11-15 第 7 轮：四条保存路径统一差异门，引用式链接/表格不再静默改写；源码模式未编辑时显示原文；`.md` 打开方式 opt-in（默认不勾、不改默认程序）；版本 0.20.0。
- 2026-11-15 第 8 轮：宿主草稿写 `.sidelight/drafts/`、关窗三选一、自动保存 2 s 防抖且不绕过差异门；浏览器草稿键兼容旧键；版本 0.21.0。
- 2026-11-16 第 9 轮：宿主最近 8 篇（`%LOCALAPPDATA%\Sidelight\recent.json`），`/__recent` 不暴露完整路径；日志只记 basename 并轮转；CI 补 `.tmp`/`release` 目录；版本 0.22.0。
- 2026-11-16 第 10 轮：未改动的表格整块复用原文（rich 5/7）；frontmatter 后空行保真；含引用式链接的文档载入即源码（source 7/7）；版本 0.23.0。
- 2026-11-16 第 11 轮：KaTeX 惰性（alias + shim + 动态 CSS + 就绪订阅），首屏 364,960→282,809 B；265 KiB 不可达写进 ADR-0012；版本 0.24.0。
- 2026-11-16 第 12 轮：文件树删除文件到 `.sidelight/trash/`（move 优先、SHA 回退）、删除后不复活、刷新重绑、树可访问性；首屏 284,134 B；版本 0.25.0。
- 2026-11-16 第 13 轮：同目录安全重命名（目标存在拒绝、二次探测、无 copy 回退、缓存迁移、身份同步）、树缩进/选中可见、大纲 `aria-current`；首屏 284,973 B；版本 0.26.0。
