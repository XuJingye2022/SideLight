# 迭代简报（BRIEF）

> 每个代理先读这份（≤2 KB）。需要细节再读 `AGENTS.md` 第 4/8 节与相关 ADR；不要整篇读 AGENTS/README/STATE。

## 当前
- 状态：**进行中**。第 92–93 轮按用户 2026-11-19 反馈的另外两条做粘贴 Markdown 解析与已存定界符对后填（A1/B1，回滚 0 条，第 93 轮有 1 条 FAIL 当轮返修）；BACKLOG 无 `open`，P0/P1 为 0。
- 版本：0.32.1（未发版）；HEAD `774483b`（第 93 轮）
- 测试：57 个文件 778 条；首屏 gzip **312,423 B**（超内部预算 2,423 B 只 WARN；距硬线余 **7,577 B**）；差距 42 有 / 3 缺。
- 本轮端口：9222–9226（第 92–93 轮全程无监听）；真机走 ego 浏览器 CDP 57270。

## Top 5 优先
1. 首屏 312,423 B：距硬线只剩 **7,577 B**、已超内部预算 2,423 B（WARN）。加静态代码前先算体积，或先裁剪 / 惰性化。
2. 剩余 P2 从 `docs/iteration/BACKLOG.md` 取（只剩 `deferred`：B-135 代码块高亮、B-201–B-207 环境类）。
3. 发版前跑 `npm run verify`、`npm test`、`packaging/verify-installer.ps1`。
4. 真实中文 IME、真实 FSA、WebView2 宿主仍是未验项；第 92 轮发现三枚行内语法 mark 的 `parseHTML` 空表让内部复制粘贴丢样式（未入池）。
5. v3 流程与度量在 STATE/METRICS。

## 环境
- dev：`http://localhost:5175`（不要另起/重启；5173 禁用）
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
