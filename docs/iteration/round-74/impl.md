# 第 74 轮执行报告（B 轮 · executor）

轮前 `dec7c02`；dev 5175；CDP 9222（每个 e2e 前 `reset.mjs 9222`）；未 commit、未改 `release/`、版本 0.32.1。任务表是第 73 轮计划的 B 轮；用户问题 1、3 的 A1/A2/A3 已在 `dec7c02`，delta 无回归，不重复改（`round-74/findings-delta.md`）。

## B1 Typora 机制调研 —— DONE（收口）
- `docs/iteration/round-73/typora-mechanism.md` 重写到 1,966 B：解析（frame.js @779864/@785623/@785945/@40246-40866）、渲染（@106916/@107068/@117935/@116913）、保真（@555669/@554192）；方案为「①已做 A3、②本轮 B2、③不做真源文」。
- `docs/typora-gap.md` 的数学公式行、`==高亮==` 行各补「定界符随光标露出」。

## B2 `==` 定界符随选区露出 —— DONE
- `src/lib/mathReveal.ts` 复用工厂：`collectEqRanges`（文本节点、相邻区间合并）、`revealIndexesTouching`（相交或贴边）、`eqTouchesTransaction`（片段带 mark / 加删 mark / 命中区间才重扫）、`decorateEqReveal`（`Decoration.inline` + `sl-eq-revealed`）、`eqDelimiterReveal()`；`RevealConfig.hit` 让公式仍只认相交。
- `src/App.tsx:78`、`:976-978` 挂第二实例；`src/styles.css:848-871` 的 `::before/::after{content:'=='}` 只显示、不占正文。
- 单测 4 条（`mathReveal.test.ts` 5→9）：区间合并、贴边判定、装饰 1/0、区间内插字重扫 / 区外只映射。
- e2e `.tmp/e2e-r74-b2-eq.mjs` → `.tmp/r74-b2-eq.json`：开设置 `→`×2 进高亮 → `.sl-eq` 1、`.sl-eq-revealed` 1、`::before`=`"=="`；贴末端仍 1；再 `→` 到 6 归 0。假 FSA `Ctrl+S` 读回 `==高亮==`，与对照组逐字节同、无 `sl-eq` 类；关设置 `.sl-eq` 0、无伪元素。`allPass:true`、0 pageerror。
- 截图 `shots/round-74/eq-delimiter-reveal.png`（按本轮 nn=74 落地）。

## B3 露出收口 —— DONE
- `.tmp/e2e-r74-b3-reveal.mjs` → `.tmp/r74-b3-reveal.json`：同一文档上 TOC / 行内公式 / 块级公式 / `==高亮==` 四类「露出 → 移开」，再保存与对照组比字节。四项 pass；保存含 `[TOC]`、`$\alpha$`、`\beta`（`$$` 三行是既有序列化）、`==高亮==`，无 `sl-math-reveal|sl-eq-revealed`；`equalBytes:true`；`allPass:true`、0 pageerror。
- 性能：同脚本同夹具 `.tmp/r73-perf-baseline.mjs`。改前 `.tmp/r73-perf-baseline-before.json`（已还原回原名）；改后 `.tmp/r74-perf-after-run{1,2}.json`。墙钟 ms：

| 夹具 | 项 | 改前 | 改后 1/2 | 门槛 +50 | 判定 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 100 KB | 移选区 20 次 | 297 | 311/295 | 347 | 过 |
| 100 KB | 逐键 30 字 | 1353 | 1441/1420 | 1403 | 超 38/17 |
| 1 MB | 移选区 20 次 | 525 | 791/677 | 575 | 超 216/102 |
| 1 MB | 逐键 30 字 | 4932 | 4768/4572 | 4982 | 过（更快） |

- 超门槛只记数值不判红（第 53 轮口径）：同代码两轮 1 MB 移选区已差 114 ms；夹具无公式/无 `==`，eq 插件走「露出集合不变 → 返回上一 state」（O(1)，单测证同一引用）。`sl-parse-done` 不当零重建证据。

## 门禁（全绿）
- `npx tsc --noEmit` exit 0。
- `npm test` exit 0：41 文件 536 条（原 532 + eq 4），0 失败（`.tmp/r74-exec-test.log`）。
- `npm run verify` PASS：首屏 gzip 303,043 B（内部 310,000 / 硬线 320,000；第 73 轮 302,787，+256）。
- `npm run roundtrip` exit 0：rich 6/8、source 8/8；`04-reference-links -4 +1`、`06-task-list -0 +1` 与 HEAD 同。

## CHANGELOG 建议
`==高亮==` 光标进入或贴住两端时露出 `==` 定界符（伪元素，写回字节不变）；Typora 机制调研与差距表同步。

## 新踩坑
1. 对照组重载后先把光标点进正文再按 `Ctrl+End`：焦点不在编辑器时它不动选区，字落文首，字节比较假红。
2. 高亮是 mark 不是 atom：收文本节点并合并相邻区间（`==a**b**c==` 是三个 text 节点）；`Decoration.node` 对文本无效。
3. 定位段落别用 `innerText` 里的 `==`：解析后是「前 高亮 后」，用「高亮」定位。
