# 迭代简报（BRIEF）

> 每个代理先读这份（≤2 KB）。细节读 `AGENTS.md` 第 4/8 节与相关 ADR；不要整篇读 AGENTS/README/STATE。

## 当前
- 状态：**进行中**。第 140 轮（1 轮，3 条）：右栏贴右缘（280–520、可折叠、窄窗仍抽屉）＋「与打开时相比」改顶栏「对比」全宽模式；P0/P1 为 0，`BACKLOG.md` 无 `open`（只剩 `deferred` 与 P2 B-267/B-268）。
- 版本：0.32.1（未发版）；HEAD `719ff8a`（第 140 轮）
- 测试：71 文件 979 条；门 gzip **316,648 B** + 常驻 **4,473 B** = 真实首载 **321,121 B**（硬线 **325,000**，余 3,879；内部 310,000 超 11,121 只 WARN）；差距 42 有 / 3 缺。
- 端口：9222–9226（第 140 轮无监听）；真机走 ego CDP 57270。

## Top 5 优先
1. 真实首载 **321,121 B**：距硬线 325,000（第 140 轮按授权从 320,000 放宽）只余 **3,879 B**。加静态代码前先算体积或先裁剪 / 惰性化；**超 325,000 必须拆批**。
2. 剩余 P2 见 `BACKLOG.md`：B-267（对比行只有鼠标路径）、B-268（栏宽 / 折叠态不落盘）、`deferred` 的 B-135 与 B-201–B-207。
3. 发版前跑 `npm run verify`、`npm test`、`packaging/verify-installer.ps1`。
4. 真 WebView2/macOS 宿主、真实中文 IME、真实 FSA、连续拖拽与 `pageZoom≠100%` 未验。
5. v4 流程与度量在 STATE/METRICS。

## 环境
- dev `http://localhost:5175`（不另起/重启；5173 禁用）；CDP 9222–9226 + `node .tmp/reset.mjs <端口>`；截图 `node scripts/shot.mjs ...`；门禁 `npm run verify`、`npm test`（改编辑器/序列化加 `roundtrip`）。

## 红线（10 条）
1. Tiptap 内核不换
2. AI 不直接写正文；只采纳落正文
3. 意见用页边批注
4. 只做自带密钥
5. 缓存只写 `.sidelight/`
6. 新运行时依赖需产品负责人批准，README 记理由与体积
7. 安装包硬线 50 MB（内部 45 MB）；首屏内部 310 KB / 硬线 325 KB（第 140 轮按授权从 320 KB 放宽，超 325 KB 必须拆批）
8. 不 push、不建 Release、不改 `release/`
9. 版本 0.32.1，CHANGELOG 写 `## Unreleased`
10. 稳定性 > 核心功能 > 体积优化 > 节省 Token > 速度

## 链接
`AGENTS.md`、`README.md`、`docs/iteration/STATE.md`、`docs/iteration/BACKLOG.md`、`GLOSSARY.md`、`docs/typora-gap.md`、`docs/adr/`
