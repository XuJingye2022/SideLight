# 迭代简报（BRIEF）

> 每个代理先读这份（≤2 KB）。需要细节再读 `AGENTS.md` 第 4/8 节与相关 ADR；不要整篇读 AGENTS/README/STATE。

## 当前
- 版本：0.32.1（未发版）；第 66 轮；HEAD `c1052aa`
- 测试：40 个文件 520 条；首屏 gzip 300,980 B（内部 310,000 / 硬线 320,000）
- 阶段：P0/P1 收敛（v3 最后确认）
- 本轮端口：9222–9226

## Top 5 优先（本轮）
1. 先查 BACKLOG：当前 **没有 open 的 P0/P1**，只剩 P2。
2. 本轮 5 路只报新 P0/P1；若 0 条，planner 排不出 P0/P1 任务即停。
3. P2（图片缩放、TOC/emoji、自定义快捷键、主题 radiogroup、24px 点击区、宿主相对图、宿主 `www`、导出 TOC 等）留 BACKLOG，之后一点点完善。
4. 不要为凑轮次把 P2 塞进本轮。
5. 停之前仍要跑 `npm run verify` 与 `npm test`。

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
