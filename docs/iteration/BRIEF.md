# 迭代简报（BRIEF）

> 每个代理先读这份（≤2 KB）。需要细节再读 `AGENTS.md` 第 4/8 节与相关 ADR；不要整篇读 AGENTS/README/STATE。

## 当前
- 版本：0.32.1（未发版）；第 51 轮；HEAD `fb6fe9a91bf251c7c9c8c5626e767e2977269daf`
- 测试：33 个文件 432 条；首屏 gzip 294,913 B（内部 310,000 / 硬线 320,000）
- 阶段：Phase 1 路线图（v2：两轮一侦察）
- 本轮端口：9222–9226

## Top 5 优先（本轮）
1. B-001 整页视图缩放（Ctrl+滚轮 + 重置）
2. B-002 全屏
3. B-003 拖入 `.md` / 文件夹直接打开
4. 保存链稳定性：F1「保存先整篇读回旧文件 / 无改动也写」+ F4「一次停笔 4 份全文」
5. 设置面板 sticky 页脚切字（ui U5）

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
