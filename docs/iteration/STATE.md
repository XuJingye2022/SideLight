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
- `npm test`（以 `package.json` 为准，当前 15 个文件）
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

- v0.22.0。`dist` 1,404,769 B（1.34 MiB）；JS 1.13 MB（gzip 353 KB）、CSS 51 KB、KaTeX 字体 213,664 B / 15 个 woff2。
- 便携 zip：887,922 B；NSIS per-user 安装包：809,542 B（硬线 850,000）。
- 宿主冷启动 FCP 304 ms；最近文件 8 篇；草稿/关窗/自动保存已具备。
- 已知：KaTeX 仍全量进首屏；引用式链接/表格不保真但保存前拦截；空行/列表分隔仍有差异。

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

## 待办池（finder 优先从这里挑，也可自己发现）

- **编辑器保真**：表格分隔行/列宽被规范化（02）、引用式链接定义被删（04）、frontmatter 后空行（01）、列表间空行（06）；当前 3/7，靠保存门拦截。
- **KaTeX 全量首屏**：tiptap 静态 import；惰性 alias spike 未做，目标 gzip 265 KiB，风险高。
- **文件树操作**：只有新建文件；没有删除、刷新、新建文件夹；FSA 无 rename API。
- **可访问性**：仍无屏幕阅读器实录；13 处 11–11.5px 小字；部分图标按钮缺 `aria-label`。
- **真实环境 UNVERIFIED**：HKCU 关联/打开方式/卸载、真人双击、系统对话框、真实 IME、文件占用/网络盘/中文长路径、AltGr、Alt+F4/注销关窗、只读目录草稿失败、localStorage 配额、真实最近列表。
- `src/App.tsx` 约 2600 行；三处重复序列化 / 草稿写入；22 处字号无变量。
- 无 Mermaid、字体不可换、无自定义快捷键。
- 密钥明文存 localStorage；CI `windows-host` 未在 GitHub 首跑。
- 6 MB 上限（marked 8 MB 爆栈）；更大文件需换解析器。
- 500 toast 原始响应未进 `title`；ADR-0004 载荷数每次宿主改动后要复算。

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
