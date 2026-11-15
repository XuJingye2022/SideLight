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

- v0.16.3。`dist` 1,392,880 B（1.33 MB）；JS 1.09 MB（gzip 336 KB）、CSS 51 KB、KaTeX 字体 256,168 B / 19 个 woff2（ttf/woff 已不发）。
- 已知：单个 JS chunk 超过 500 KB 报警；KaTeX 可改按需加载。

## 轮次记录

| 轮 | 主题 | 计划 | 结果 | commit |
| --- | --- | --- | --- | --- |
| 1 | 基线体检 + 发布路径决策 | round-01/plan.md | PASS：货币吞字修复、字体 1,072,948→256,168 B、开源文件、宿主 5/5 | cb36110 |

## 待办池（finder 优先从这里挑，也可自己发现）

- README「已知的重要问题」段还说 frontmatter / 行内 HTML / 脚注「被改坏」，实测已保真；只改该段，别动 7 个样本与 3/7 的数字。
- 安装包仍不存在：下一步做便携 zip + 图标 + `.md` 关联 + 卸载脚本；NSIS/WiX 要管理员，先不做。
- 宿主缺口：中文输入法、中文/长路径、大文件、冷启动、WebView2 缺失时的提示、`%LOCALAPPDATA%` 可写目录。
- `package.json` 的 `repository` 缺真实地址；署名、隐私声明、发布页待产品负责人。
- qa9 / qa10 / qa13 / qa16 脚本已腐化（基线即坏），修或删。
- ADR-0004 的 bin 体积读数含 WebView2 用户数据，已过期。
- `shots/` 每次验收会改写 7 张已跟踪截图，提交噪声大；考虑只跟踪文档引用图。
- `src/App.tsx` 约 2074 行；三处重复序列化 / 草稿写入。
- KaTeX 仍全量进首屏（gzip 336 KB，目标 ≤250 KB）。
- 行内 HTML 只保真不渲染；引用式链接、表格对齐往返会改格式（3/7）。
- 无主题切换、无 Mermaid、字体不可换、无自定义快捷键。
- 密钥明文存 localStorage。

## 决策记录

- 2026-11-15 根代理：`git init` 并导入基线 `342481b`；删除 3.1 GB 陈旧 Edge profile；`.gitignore` 增加 `.edge-profile*`、`.tmp/`、`*.log`。
- 2026-11-15 根代理：构建纪律。实施期间任何人不得直接跑 `npm run build`（并发写 `dist/` 会互相清空）；类型检查用 `npx tsc --noEmit`，需要产物用 `npx vite build --outDir .tmp/build-a|build-b`；每轮最终 `npm run build` 由根代理串行跑一次。
- 2026-11-15 根代理（代产品负责人）：许可证选 MIT；版权人写 `Sidelight contributors`，不写个人姓名。真实仓库地址与署名等对外信息，首发前由产品负责人最终确认。
- 2026-11-15 根代理：dev server 用 `http://localhost:5173`，不要写 `127.0.0.1`（Vite 只绑 `::1`）。
- 2026-11-15 第 1 轮：接受 ADR-0004，发布路径先走 C# WebView2 宿主。宿主五项验收全 PASS，含真实文件夹读写。
