# 迭代简报（BRIEF）

> 每个代理先读这份（≤2 KB）。需要细节再读 `AGENTS.md` 第 4/8 节与相关 ADR；不要整篇读 AGENTS/README/STATE。

## 当前
- 状态：**已停止**（2026-11-18）。第 72 轮 5 路 0 个新 P0/P1，BACKLOG 无 open P0/P1。
- 版本：0.32.1（未发版）；最后一个代码提交在第 71 轮；HEAD `ece6eac`
- 测试：40 个文件 524 条；首屏 gzip 302,014 B；差距 39 有 / 5 缺。
- 本轮端口：9222–9226

## Top 5 优先（已停止）
1. 不再开新轮次；发布由产品负责人决定。
2. 剩余 P2 从 `docs/iteration/BACKLOG.md` 取，之后一点点完善。
3. 发版前跑 `npm run verify`、`npm test`、`packaging/verify-installer.ps1`。
4. 真实中文 IME、真实 FSA、WebView2 宿主仍是未验项。
5. v3 流程与度量在 STATE/METRICS。

## 环境- dev：`http://localhost:5175`（不要另起/重启；5173 禁用）
- CDP 9222–9226；`node .tmp/reset.mjs <端口>`；截图 `node scripts/shot.mjs ...`
- 门禁：`npm run verify`、`npm test`；改编辑器/序列化加 `npm run roundtrip`

## 红线（10 条）
1. Tiptap 内核不换
2. AI 不直接写正文；只采纳落正文
3. 意见用页边批注
4. 只做自带密钥
5. 缓存只写 `.sidelight/`
6. 新运行时依赖需产品负责人批准，README 记理由与体积
7. 安装包硬线 50 MB（内部 45 MB）；首屏内部 310 KB / 硬线 320 KB
8. 不 push、不建 Release、不改 `release/`
9. 版本 0.32.1，CHANGELOG 写 `## Unreleased`
10. 稳定性 > 核心功能 > 体积优化 > 节省 Token > 速度

## 链接
- `AGENTS.md`、`README.md`、`docs/iteration/STATE.md`、`docs/iteration/BACKLOG.md`
- `GLOSSARY.md`、`docs/typora-gap.md`、`docs/adr/`
