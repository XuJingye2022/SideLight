# 第 122 轮实现报告（executor）

状态：**A1 PASS、A2 PASS**，回滚 0 条。HEAD `5572395`，未 commit / push、未改版本、未动 `release/`。

## A1 徽标字色改 `--ink`（B-252）— PASS

- 改：`src/styles.css` 的 `.rail-overall-count`（现 1182-1191）`color: var(--ink-soft)` → `color: var(--ink)`，上方加 1 行中文注释（不进 dist）；`background: var(--line)`、`font-size: 10px`、`padding`、`border-radius` 不动。
- 正向对照：`git show 5572395:src/styles.css` 该块改前是 `color: var(--ink-soft)`。改后 read `src/styles.css:1182-1190`：1187 `background: var(--line);`、1188 `color: var(--ink);`、1189 `font-size: 10px;`，十行内无 `--mark-wash`。
- 三主题比值（`.tmp/r122-ratios.ts` → `.tmp/r122-ratios.log`）：浅 **12.3173** / 暖 **8.2048** / 深 **10.9689**；徽标底 vs 纸底 1.2081 / 1.3124 / 1.3144（同改前 1.21/1.31/1.31）。
- 体积：`npm run verify`（`.tmp/r122-verify.log`）exit 0 **PASS**，首屏 gzip **315,559 B ≤315,560**（改前 315,553，实测 +6）；内部预算超 5,559 B（WARN），距硬线余 **4,441 B**。verify 内含 `tsc --noEmit`，另跑 `npx tsc --noEmit` exit 0（`.tmp/r122-tsc.log`）。

## A2 三主题对比度门 + 真机证据 — PASS

- 新 test：`src/lib/themes.test.ts:210` 起 1 条。`ruleDeclarations('.rail-overall-count')` + `resolveColor`，`:root` / sepia / dark 各算一次。先逐档断 ≥4.5 并 `table.push` → `assert.equal(table.length, 3)` → 最后 `assert.equal(declarations.color, 'var(--ink)')` 防回退。
- 负向（CSS 临时改回 `--ink-soft`，`.tmp/r122-test-red.log`）：`node --experimental-strip-types src/lib/themes.test.ts` **exit 1、fail 1**，报文 `暖纸的徽标只有 4.02:1`；还原后 `.tmp/r122-test-green.log` **12/12 pass、exit 0**。
- 真机探针 `.tmp/e2e-r122-contrast.mjs`（ego CDP 57270、1440×900；点段落输句 → `Ctrl+A` → `.analyze-button` 无 Key 走 mock → 逐档设 `dataset.theme`）：**11/11 PASS**、0 pageerror（`.tmp/r122-contrast.{log,json}`）。
  - 三档比值 12.3173 / 8.2048 / 10.9689（≥4.5）；暖纸 bg = **`rgb(221, 203, 170)`**、font-size 10px；改前 `--ink-soft` 记录 4.0181（浅 5.0996 / 深 6.0255）。
  - 徽标底 vs `.rail-overall` 底（`color(srgb …/0.94)` 按 alpha 合成到纸底）1.2081 / 1.3124 / 1.3144，同改前 ±0.02。
  - 截图 `shots/round-122/rail-overall-count-sepia.png`。
- 回归：`$env:SIDELIGHT_CDP='http://127.0.0.1:57270'; node scripts/theme-acceptance.mjs http://localhost:5175` → **27/27 PASS**（`.tmp/r122-theme-acceptance.log`）；跑完 `git checkout -- shots/round-05/`，`git status --short shots/round-05/` **0 行**、`git status --short --untracked-files=no shots/` **0 行**；`git status --short shots/` 只余 `?? shots/round-122/`（本轮新证据）。
- `npm test`（`.tmp/r122-npm-test.log`）：**64 文件 910 条 0 fail**（基线 909 → +1）。未跑 `roundtrip`（未动编辑器/序列化）。

## 改动文件

- 产品：`src/styles.css`（1 注释 + 1 行换色）、`src/lib/themes.test.ts`（+25 行、1 test）。
- 证据：`.tmp/e2e-r122-contrast.mjs`、`.tmp/r122-ratios.ts`、`.tmp/r122-*.{json,log}`、`shots/round-122/rail-overall-count-sepia.png`、本报告。
- CHANGELOG 建议：`- 右侧「整体评价」计数徽标改用 --ink 字色：暖纸对比度 4.02:1 → 8.20:1，浅/深 12.32 / 10.97（B-252）`

## 新踩坑（3 条）

1. 负向真实比值是 **4.018**，报文用 `toFixed(3)` 得「4.018」**不含**验收要的「4.02」；报文改 `toFixed(2)`（plan 预估 4.020 偏高）。
2. 真机 `getComputedStyle(document.documentElement).getPropertyValue('--line')` 返回 **hex**（`#ddcbaa`）不是 `rgb()`；颜色解析要同时认 `#rrggbb`，否则比值 null 假红。
3. executor 阶段 `git status --short shots/` 不可能为空（新截图目录是未跟踪证据）；应断 `--untracked-files=no shots/` 为空，`shots/` 全空要等 tester commit——这也是计划 A2-3 截图路径与 A2-4「shots/ 空」的互斥点。
