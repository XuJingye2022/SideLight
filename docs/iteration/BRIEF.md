# 迭代简报（BRIEF）

> 每个代理先读这份（≤2 KB）。需要细节再读 `AGENTS.md` 第 4/8 节与相关 ADR；不要整篇读 AGENTS/README/STATE。

## 当前
- 状态：**进行中**。第 90–91 轮按用户 2026-11-19 反馈做公式就地编辑与代码块语言标签（B-217–B-220，回滚 0 条）；BACKLOG 无 `open`，P0/P1 为 0。
- 版本：0.32.1（未发版）；HEAD `c85b9a1`（第 91 轮）
- 测试：55 个文件 727 条；首屏 gzip **309,804 B**（余 10,196 / **196**）；差距 42 有 / 3 缺。
- 本轮端口：9222–9226（第 90–91 轮全程无监听）；真机走 ego 浏览器 CDP 57270。

## Top 5 优先
1. 首屏只剩 **196 B**：加静态代码前先算体积，不够就先裁剪或惰性化。
2. 剩余 P2 从 `docs/iteration/BACKLOG.md` 取（只剩 `deferred`：B-135 代码块高亮、B-201–B-207 环境类）。
3. 发版前跑 `npm run verify`、`npm test`、`packaging/verify-installer.ps1`。
4. 真实中文 IME、真实 FSA、WebView2 宿主仍是未验项。
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
