# 迭代简报（BRIEF）

> 每个代理先读这份（≤2 KB）。细节读 `AGENTS.md` 第 4/8 节与相关 ADR；不要整篇读 AGENTS/README/STATE。

## 当前
- 状态：**进行中**。第 145–146 轮（v4，4 个代理、两轮一批、回滚 0 条）：第 145 轮撤掉第 144 轮的只读预探测与「只读」徽标，新建入口统一到 `newFileInWorkspace()`（有文件夹先真建 `未命名.md`、失败才命名），保存无落点先试写、写类错误自动转「另存为」，失败文案补「正常桌面」兜底；第 146 轮左栏可拖宽 200–480 并落盘（`settings.sidebarWidth`，不升 `SETTINGS_VERSION`）、左右把手常显、打开文件夹后外部增删文件自动进树且不打断当前文档（新 `src/lib/autoRefresh.ts`，无新依赖）。P0/P1 为 0；`BACKLOG.md` 只剩 P2：B-273（外部删除/改名后刷新，`Ctrl+S` 仍按文档名建文件，`open`）、B-267、B-268 与 `deferred`。
- 版本：0.32.2（未发版；0.32.1 已发）；HEAD `901e904`（第 146 轮）
- 测试：74 文件 1028 条；体积第 146 轮实测 门 gzip **319,489 B** + 常驻 **4,486 B** = 真实首载 **323,975 B**——**只记录、不阻塞**（`--max`/`--real-max` 默认 null）；差距 42 有 / 3 缺。
- 端口：9222–9226（本批无监听）；真机走 ego CDP **57270**（本批实际 60843）。

## Top 5 优先
1. **体积只记录、不阻塞**（第 144 轮按用户 2026-11-21 取消首屏硬线）：`npm run verify` 照旧报门 / 常驻 / 真实首载与 `headroom=none`，不再判失败、CI 不因体积红；不要为省几 KB 砍体验。安装包硬线 50,000,000 B（内部 45,000,000 B）不动。设计语言 §5 仍要求新增常驻控件时同时删一个或进菜单 / 键位。
2. 剩余 P2 见 `BACKLOG.md`：B-273（外部删除/改名 + 刷新后 `Ctrl+S` 仍静默建文件；第 146 轮自动刷新只更新树、不跟随当前篇）、B-267（对比行只有鼠标路径）、B-268（右栏宽度 / 折叠态不落盘，左栏第 146 轮已落盘）、`deferred` 的 B-135 与 B-201–B-207。
3. 发版前跑 `npm run verify`、`npm test`、`packaging/verify-installer.ps1`；回归脚本过期项：`theme-acceptance`（第 143 轮「设置」进文件菜单）、`scripts/keyboard-acceptance.mjs` 默认仍指僵尸 5173 / CDP 9222、`scripts/draft-acceptance.mjs` 仍按 800 ms 防抖。
4. 真 WebView2/macOS 宿主、真实中文 IME、真实 FSA、真实 Low IL 桌面双击、`FileSystemObserver` 真回调与 `visibilitychange` 分支、`pageZoom≠100%` 拖拽换算未验。
5. v4 流程与度量在 STATE/METRICS。

## 环境
- dev `http://localhost:5175`（不另起/重启；5173 禁用；本批开工时无监听，可自行 `npx vite --port 5175 --strictPort`）；CDP 9222–9226 + `node .tmp/reset.mjs <端口>`；真机 ego 端口从 `%LOCALAPPDATA%\ego-lite-linux\profile\DevToolsActivePort`（或 `browser.json`）取，本批 **60843**；截图 `node scripts/shot.mjs ...`；门禁 `npm run verify`、`npm test`（改编辑器/序列化加 `roundtrip`）。

## 红线（10 条）
1. Tiptap 内核不换
2. AI 不直接写正文；只采纳落正文
3. 意见用页边批注
4. 只做自带密钥
5. 缓存只写 `.sidelight/`
6. 新运行时依赖需产品负责人批准，README 记理由与体积
7. 安装包硬线 50 MB（内部 45 MB）；首屏体积**只记录、不阻塞**（第 144 轮取消首屏硬线，`--max` 显式才判）
8. 不 push、不建 Release、不改 `release/`
9. 版本 0.32.2 未发版；CHANGELOG 当次条目写进 `## 0.32.2 — 2026-11-21` 段
10. 稳定性 > 核心功能 > 体积优化 > 节省 Token > 速度

## 链接
`AGENTS.md`、`README.md`、`docs/iteration/STATE.md`、`docs/iteration/BACKLOG.md`、`GLOSSARY.md`、`docs/typora-gap.md`、`docs/adr/`
