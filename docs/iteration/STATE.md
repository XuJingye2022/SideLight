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
- `npm test`（以 `package.json` 为准，当前 21 个文件 272 条）
- 改编辑器或 Markdown 序列化时加跑 `npm run roundtrip`
- 界面变化必须截图，图落 `shots/`，实施报告里引用
- 每轮结束根代理跑 `npm run build` + `npm test`，通过才 commit：`round-NN: <一句话>`

## 环境事实（2026-11-15 核实）

- 仓库：`D:\Documents\SidelightProgram`，branch `main`，基线 commit `342481b`。
- Node 24.21 / npm 11.19。没有 pnpm、没有 Rust、没有 VS Build Tools、没有管理员权限。WebView2 运行时已安装（`C:\Program Files (x86)\Microsoft\EdgeWebView\Application`）。
- dev server：由根代理起在 `http://localhost:5175`。Vite 只绑 IPv6 的 `::1`，统一写 `localhost`。`5173` 是旧会话遗留、无法回收的僵尸 server，禁用。HMR 自动跟代码。
- CDP 浏览器：9222–9226（上一会话遗留的 headless Edge，profile 在系统临时目录；每端口独立）。DSH 沙箱禁止启动 Chromium（mojo 命名管道 EPERM），不要尝试另起浏览器。`.tmp/reset.mjs <端口>` 只关 localhost 旧页面并清 localStorage/IndexedDB，不杀浏览器。
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

- v0.32.1（第 30–35 轮改动都在同一个未发版区间）。首屏 JS+CSS gzip **286,056 B**（预算内部上限 310,000 / 硬线 320,000，距硬线余 33,944 B；第 30 轮 284,529 → 31 轮 +232 → 32 轮 +291 → 33 轮 +839 → 34 轮 +46 → 35 轮 +119）；安装包预算内部 1,800,000 / 硬线 2,000,000；测试 **22 文件 295 条**（30 轮 18/260 → 31 轮 21/272 → 32 轮 21/276 → 33 轮 22/285 → 34 轮 22/287 → 35 轮 22/295）。首屏/测试数字为第 35 轮轮末 `npm run verify` 与 `npm test` 实测（主 chunk `index-CYKrmZl7.js` 895,227 B raw / 279,028 B gzip）。
- 第 33 轮：智能标点与自动配对（设置可关，`src/lib/smartTyping.ts`）；`packaging/verify-installer.ps1` 与 release 流水线版本号变量化；首屏 285,891 B。
- 第 34 轮：**脚注定义丢失拦截（P0，自动保存也拦）**、查找/快速打开焦点回正文、同一篇不弹切换框、新增 `npm run verify` 首屏门；首屏 285,937 B（余 63 B）。
- 第 35 轮：**体积护栏换挡**（首屏内部 310,000 / 硬线 320,000，安装包内部 1,800,000 / 硬线 2,000,000，measure/installer/portable/verify-installer/CI 静态跟随）、**AI 提示词拆分**（格式与安全规则内置 `ANALYSIS_SYSTEM_PROMPT`，设置只改 `userPrompt`，旧 `analysisPrompt` 指纹迁移）、**Esc 后焦点回正文**（预览/源码/快速打开）＋查找框开着时一个 Esc 只关查找；首屏 286,056 B、测试 22/295。
- 下一轮优先：① Mermaid 惰性渲染（产品负责人已批，第 36 轮第一件事，按真实安装包字节替换 ADR-0017 预估）；② 工作区相对路径图片破图（需新增宿主路由 `/__asset` + 重建宿主 + `host-smoke`，第 32/33/34 轮连续提出）；③ `scripts/qa15.mjs` 因提示词拆分失效的 4 行（`:44`/`:48`/`:53`/`:55`）随提示词回归一起修；④ 快速打开在源码/预览里的「一次按键两个动作」先补一条 e2e 再定；⑤ `docs/typora-gap.md` 全表核对与 README/AGENTS 的「21 项有、18 项缺」。排序仍是 稳定性 > 核心功能 > 体积优化 > 节省 Token > 速度。
- 首启：空白 `未命名.md`，不再加载示例；文件菜单「关闭文档」；工作区无句柄文档 Ctrl+S 直接落 `未命名.md`。
- 发布资产：Windows setup 824,209 B、Windows zip 910,360 B、macOS Universal 905,892 B；校验和见 `SHA256SUMS-0.32.1.txt`。
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
| 28 | 首启空白 + 关闭文档 + 工作区保存 | round-28/plan.md | PASS-WITH-UNVERIFIED：session 18/18、newfile 23/23、picker 0、0.32.1 | 1ac1298 |
| 29 | 数据安全 + 大纲折叠 | round-29/plan.md | PASS-WITH-UNVERIFIED：T1 草稿守卫 4/4、T3 大纲 12/12、首屏 285,838、测试 251、draft 57/57、keyboard 49/49；T2 未做、T1-B 被陈旧模块挡住 | cdcf83e |
| 30 | 状态栏字数明细 + 删除撤销丢正文 + 安装器版本 | round-30/plan.md | PASS-WITH-UNVERIFIED：T1 删除后撤销不再丢正文、T2 字数明细面板、首屏 284,529、测试 18/260、keyboard 49/49；0.32.1 未发版 | 5b36b71 |
| 31 | 撤销/改名保存目标 P0 + 字数明细口径 + 链接点击与列表 Tab | round-31/plan.md | PASS-WITH-UNVERIFIED：T1 21/21、T2 14/14、T3 18/18、keyboard 49/49、roundtrip 0、首屏 284,761、测试 21/272；未发版 | 64002a8 |
| 32 | 预览快捷键 + 选区计数 + 段落口径 + 体积护栏与 Mermaid ADR | round-32/plan.md | PASS-WITH-UNVERIFIED：keyboard 52/52、T2 9/9、T3 7/7、qa17 7/7、首屏 285,052（余 948）、测试 21/276、tsc/build PASS；Mermaid 本轮不实现待产品负责人三选一；qa16/qa10 脚本过期（非本轮回归）；未发版 | e399805 |
| 33 | 智能标点与自动配对 + 验收/发版门禁版本号 | round-33/plan.md | PASS-WITH-UNVERIFIED：智能标点 8 条单测、e2e 13 组、keyboard 52/52、首屏 285,891、测试 22/285、verify-installer 版本号正反例 | 186dfeb |
| 34 | 脚注定义丢失拦截 P0 + 焦点回正文 + verify 门禁 | round-34/plan.md | PASS-WITH-UNVERIFIED：T1 6/6（自动保存也拦）、T2 6/6、verify 正反例、keyboard 52/52、树 54/56（2 条旧脚本过期）、首屏 285,937、测试 22/287；验收后未提交，根代理补交 | 08775f2 |
| 35 | 体积护栏换挡 + AI 提示词拆分 + Esc 后焦点回正文 | round-35/plan.md | PASS-WITH-UNVERIFIED：T1 a–l（首屏 320,000 硬线 / 310,000 内部、安装包 1,800,000 / 2,000,000、三脚本 BOM+语法解析 0 错、workflows 与文档旧线 0 命中且有改前对照）、T2 17/17 项断言 + 单测（system/user 分离、旧键迁移、落盘只写 `userPrompt`）、T3 6 组全过（a/b/c/d/e/d2）、tsc/build/verify PASS、roundtrip 0、首屏 286,056、测试 22/295；未发版 | 7ae5be4 |

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
- 最新发布：https://github.com/XuJingye2022/SideLight/releases/tag/v0.32.1
  - Windows：`Sidelight-0.32.1-win-x64-setup.exe` 824,209 B、`Sidelight-0.32.1-win-x64-portable.zip` 910,360 B。
  - macOS：`Sidelight-0.32.1-macos-universal.zip` 905,892 B（arm64 + x86_64），ad-hoc，未公证；macOS 13+。
  - `SHA256SUMS-0.32.1.txt`。
- 版本：0.32.1 首启空白 + 关闭文档 + 工作区原地保存；0.32.0 修 7 项用户问题并吸收 Typora 快键。
- 签名/公证：`release.yml` 已接可选分支；配齐 6 个 Apple secrets 后自动签名 + 公证 + staple；否则 ad-hoc 并在 Release body 标「未签名、未公证」。
- 发布自动化：`.github/workflows/release.yml`（tag `v*` 或手动 `tag` + `publish`）已多次实测；CI `gate`/`windows-host`/`macos-host` 全绿；`install-verify` 仅手动。
- 推送方式：`origin` 用 SSH over 443（`ssh://git@ssh.github.com:443/XuJingye2022/SideLight.git`），仓库里加了一把 write deploy key `sidelight-agent`（2026-11-16）；不用时可在 GitHub Settings → Deploy keys 删除。
- CI Windows smoke 已忽略预期 404：`/__doc`、`/__draft`、`/favicon.ico`；`/__annotations` 无缓存返回 200 空 store。

## 下一轮怎么开始（给接手的调度器）

1. 读本文件、`AGENTS.md`、最近一次 `docs/iteration/round-32/test.md` 与 `plan.md`（30–32 轮报告也要过一眼）。
2. dev server 由根代理起在 **`http://localhost:5175`**；`5173` 是旧会话遗留、无法回收的僵尸 server，禁用。确认 `http://localhost:5175/src/main.tsx` 返回 200。
3. CDP 用 9222–9226（每个端口独立 profile；9227 不可用）。每轮 E2E 前跑 `node .tmp/reset.mjs <端口>`：它会关旧页面、清 localStorage/IndexedDB。旧页面会执行 HMR 没应用的 App.tsx 中间版本，见 AGENTS §8。
4. 用 DSH `workflow` 调度五角色：3–5 个只读 finder 并行 → planner → critic（REVISE 回 planner，最多 2 次）→ executor → tester；FAIL 返修最多 2 次，仍 FAIL 回滚。不再复用持久代理或 send_message。
5. 根代理只在批次之间做事：读报告与 `git log`、串行跑 `npm run build`/`npm test`/`measure`、更新本文件、决定下一批。产品代码由子代理写。
6. 第 34 轮完成（PASS-WITH-UNVERIFIED，未发版）。后续优先：① AI 提示词拆分（格式内置 system / 用户只改 user prompt，旧值迁移不丢）；② 体积预算更新（安装包内部 1,800,000 B / 硬线 2,000,000 B；首屏内部 310,000 B / 硬线 320,000 B）并同步 measure/verify/CI/README/AGENTS/ADR-0012/0017；③ Mermaid 懒加载实现（功能优先、同功能最小体积）；④ 工作区图片破图、qa16/qa10 过期脚本、表格列宽拖拽排队；⑤ 真实 macOS/Intel/签名公证、1 MB 性能包线。排序：稳定性 > 核心功能 > 体积优化 > 节省 Token > 速度。

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

- 2026-11-17 根代理：第 29 轮起用 `http://localhost:5175` 与 CDP 9222–9226；DSH 沙箱禁止启动 Chromium，复用上一会话遗留的 5 个 headless Edge；`.tmp/reset.mjs` 只关 localhost 页面，不杀浏览器。沙箱挡住浏览器时记 UNVERIFIED，不反复重试。
- 2026-11-17 根代理：五角色提示词外置到 `.tmp/iteration/common.md` 与 `.tmp/iteration/roles/*.md`；workflow 只传轮次、报告目录、端口与上一轮摘要。每轮报告仍在 `docs/iteration/round-NN/`。
- 2026-11-17 根代理：第 30–32 轮完成（3 轮 PASS-WITH-UNVERIFIED，未发版）。累计：字数明细、选区计数、列表缩进、删除撤销恢复、链接就地编辑、预览快捷键、段落口径、体积护栏、ADR-0017。测试 21 文件 276 条；首屏 285,052 B；HEAD e9d90a8。
- 2026-11-17 根代理：第 33 轮完成（智能标点与自动配对；22/285；首屏 285,891）。第 34 轮验收 PASS 但没有 commit，批次中止后由根代理补提交（脚注 P0 + 焦点 + verify；22/287；首屏 285,937）。workflow 修法：PASS 后 `head` 必须不同于轮前 SHA，否则按失败回滚。
- 2026-11-17 产品负责人：AI 提示词拆分——格式/JSON 协议/安全规则内置为 system prompt；设置只暴露可编辑 user prompt。列入第 35 轮。
- 2026-11-17 产品负责人：Mermaid 采用完整实现，允许放宽安装包线；但同功能必须取最小体积，首屏 0 B。安装包内部预算 1,800,000 B / 硬线 2,000,000 B；首屏内部 310,000 B / 硬线 320,000 B。首次真实打包后按实测 + 5% 复核。
- 2026-11-17 第 35 轮：体积护栏换挡（首屏内部 310,000 / 硬线 320,000；安装包内部 1,800,000 / 硬线 2,000,000；ADR-0012/0017 同步，ADR-0017 结论改「接受，第 36 轮实现」）；AI 提示词拆分（格式与安全规则进内置 `ANALYSIS_SYSTEM_PROMPT`、设置只编辑 `userPrompt`、`promptVersion` 3 与 v2 指纹迁移、追问用 `DISCUSS_SYSTEM_PROMPT`）；Esc 后焦点回正文（预览/源码/快速打开）＋ `FindBar` Esc `stopPropagation` 使一个按键只关查找。测试 22/295；首屏 286,056 B；未发版。
- 2026-11-17 产品负责人：优先级固定为 **稳定性 > 核心功能 > 体积优化 > 节省 Token > 工作速度**；不要为省几 KB 砍能提升体验的功能。