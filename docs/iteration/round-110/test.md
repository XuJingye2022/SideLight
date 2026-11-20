# 第 110 轮验收（tester 独立；未读 `impl.md`）

结论：**PASS**。A1 判定 **(a) 35×24 → 陈旧读数、0 产品改动**；A2 不触发；A3 回归全绿。轮前 startSha `09d72f6`。

## 0 门禁（未改 `src/`）

- `npm run verify`：**PASS**，首屏门 gzip **315,220 B**（raw 1,022,532、余硬线 4,780；对比 315,260 / 320,000 两条上限都过）。日志 `.tmp/r110-tester-verify.log`。
- `npm test`：**62 文件 877 条 0 fail**（逐文件 `ℹ tests` 求和：62/877/877 pass/0 fail/0 红行）。日志 `.tmp/r110-tester-npmtest.log`。
- `git status --porcelain`（验收前）：` M docs/iteration/BACKLOG.md`、`?? docs/iteration/round-110/` —— `src/` 0 改动。

## 1 A1 真机复现与分级（B-236）

自写 `.tmp/r110-tester-a1.mjs`（ego CDP 57270；`ctx.newPage()` + `Network.setCacheDisabled` 冷加载；`Emulation.setDeviceMetricsOverride(1440,900)` 后回读 `innerWidth/innerHeight` = **1440×900**、dpr 1；加载 **982 ms**）**11/11**、0 pageerror / 0 console error（`.tmp/r110-tester-a1.json`）：

- 两钮 rect **35×24**：`.rail-diff-open` [1214,140]、`.rail-review-open` [1256,140]（宽 35、高 24、底 164）；计算 `min-height` **24px**、`height` 24px、`padding` `0px 6px`、`font-size` 10.5px、`line-height` 10.5px、`box-sizing` border-box。
- CSSOM 命中整块（`sheet: inline`）：`.rail-diff-open, .rail-review-open { flex: none; margin-left: auto; min-height: 24px; padding: 0 6px; border…; font-size: 10.5px; line-height: 1; color… }` —— **有** `min-height: 24px`、**无** `height` 声明。`.rail-head` 的规则块 7 条声明（display/align-items/row-gap/column-gap/font-size/letter-spacing/color）**无** `height`，rect **320×24**、横溢 0。
- 间距 **7**（`review.left − diff.right`）、在审右缘 − head 右缘 **0**；两钮 `scrollWidth−clientWidth` 0。
- 反事实注入 `height:16px!important;min-height:0!important` → **35×16**（`.rail-head` 也回 16）；撤掉 → **35×24**、间距仍 7、右缘差仍 0。三档量测同一次会话同一页，非跨会话读数。
- 三路 CSS 字节（node 读，不用 grep）：`?direct` **78,141 B**、无 query **82,356 B**（Vite HMR JS 模块）、`dist/assets/index-DO7Px368.css` **52,096 B**；磁盘 `src/styles.css` 78,141 B。四路目标块均含 `min-height: 24px`，块内无 `height: 16px`；`?direct` 字节与块逐字等于磁盘（未被 Vite transform cache 钉旧版）。
- **判定 (a)**：35×16 是第 107 轮之前（`:1336` 的 `height: 16px`）的读数；现网 35×24 成立 → 不改代码，A2 不触发。

## 2 A3 回归与台账

- 先备份 4 份证据：`.tmp/r110-backup-r107-targets-before.json`、`-r107-tester-geom.json`、`-r100-tester-diff.json`、`-r101-e2e-review.json` 全部存在（已核）。**未**跑 `node .tmp/e2e-r107-targets.mjs`（无参会覆盖 r107 的 16px 基线）。
- `node --check` 三个脚本 exit 0；`node .tmp/r107-tester-geom.mjs` **23/23**、0 pageerror（含 1440×900 / 1256×808 / 1024×700 三档 `.margin-rail`+`.rail-head` 横溢 0）；`node .tmp/e2e-r100-diff.mjs` **43/43**、`node .tmp/e2e-r101-review.mjs` **57/57**，三脚本均 0 pageerror。日志 `.tmp/r110-a3-{geom,r100,r101}.log`。
- 跑完 `git checkout -- shots/round-100 shots/round-101 shots/round-107`；`git status --porcelain` 只剩 ` M docs/iteration/BACKLOG.md`、`?? docs/iteration/round-110/`（round-107 两图字节未变，r100/r101 3 张已还原）。
- BACKLOG B-236 已有第 110 轮复测记录（数值与本人独立读数逐项相同：35×24 / head 24 / 间距 7 / 右缘差 0 / 78,141·82,356·52,096 B），补 tester 独立复测句，状态保持 `fixed`。

## 3 判定与遗留

- **PASS**，无 FAIL 项；A2（改 CSS）未触发，故无负向对照要求。
- 已知边界（沿用第 107 轮，不属本轮）：24px 控件把 `.rail-head` 撑到 24、`.rail-tabs` 及以下下移 8px；`MarginRail.tsx:371` 注释仍写「16px 高」。
- UNVERIFIED：真 WebView2 宿主、真实中文 IME、150%/200% 缩放屏（与本轮判据无关，未跑）。
