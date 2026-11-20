# 第 122 轮计划审查（critic）· revision 1 复核

结论：**PASS**。上一版 H1–H3 全部修掉；只剩 2 条 P2 执行提示，不阻塞、不用再改计划。

## 上一版漏洞复核

- **H1（P1，theme-acceptance 回归）已修**：A2-4 改成 `$env:SIDELIGHT_CDP='http://127.0.0.1:57270'; node scripts/theme-acceptance.mjs http://localhost:5175`。实测 `scripts/theme-acceptance.mjs:5` 读 `SIDELIGHT_CDP`、`:4` 读位置参数，照写可跑。`git ls-files shots/round-05/` 含 4 张 `t2-*.png`；`:92/:99/:271/:282` 是全部写盘点（无第 5 处）。计划有 `git checkout -- shots/round-05/` + `git status --short shots/` 空 + 57270 不可用记 UNVERIFIED，三点齐。
- **H2（P2，负向报文顺序）已修**：A2-1 写明先比值循环（逐主题 `assert` + `table.push`）→ `assert.equal(table.length, 3)` → 最后 `assert.equal(declarations.color, 'var(--ink)')`；改回 `--ink-soft` 时首个红即「暖纸…4.020:1」，报文含 4.02。A1-1 的块内检查改 read / `Get-Content -Skip 1181 -First 10`，不再只回选择器行。
- **H3（P2，chunk 基数）已修**：§0 与交付都写 7,414、322,967→322,970。本轮实测 `dist/assets/MarginRail-C8Yy3L3b.js` raw 21,053 / gzip9 **7,414**，门 **315,553**（余 4,447）；322,967 与 BACKLOG 第 121 轮一致。

## 复核过的数（与上一版一致）

- `src/styles.css:1182-1190` 恰 1 块 `.rail-overall-count`：`background: var(--line)`、`color: var(--ink-soft)`、`font-size: 10px`；它不是 `.rail-overall-head span:last-child`（那个是「展开/收起」span，`MarginRail.tsx:723/724`），不抢颜色。
- 三主题对比度：现状 5.10/**4.02**/6.03 → A（`--ink`）**12.32/8.20/10.97**；药丸底 vs 纸底 1.21/1.31/1.31。复跑 `.tmp/r122-critic-contrast.mjs` 逐位相同。
- 体积：`.tmp/r122-totaldelta.mjs` 复跑 A **+3 B**（加注释同 +3，注释不进 dist）；门重建后 315,556 ≤315,560。
- 测试基线 `.tmp/r122-npm-test-baseline.log` 逐文件合计 **64 文件 909 条 0 fail**，+1 即 910。计划 5,999 B ≤6 KB。
- 红线与真机路径：只动 1 条 CSS 声明 + 1 条 test + `.tmp` 探针；无新依赖、不动 release/、不改版本、不 push。无 Key 走 mock（必出 1 条 overall）、有选区时 `.analyze-button` 可用、`railTab` 默认 notes，路径成立。
- 工作树：HEAD `5572395` 与 startSha 一致，`git status` 仅 `?? docs/iteration/round-122/`。

## 剩余 P2（执行时顺手，不改计划）

- **P2-1**：A1-1 的 1182-1190 检查窗口会被新注释推一行。注释只写 1 行，或窗口改读 `1178-1196`，或直接断块内 `color: var(--ink);`。
- **P2-2**：A2-3 的「徽标底 vs `.rail-overall` 底」——`.rail-overall` 是 `color-mix(in srgb, var(--paper) 94%, transparent)`（`src/styles.css:1161`），computed 可能出 `color(srgb …)`；按 token 算 `--line` vs `--paper`（1.21/1.31/1.31）并只作记录断言，或先按 alpha 合成。
