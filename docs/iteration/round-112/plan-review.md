# 第 112 轮计划审查（r2，复审修订版）

**结论：PASS**。上一版 CR-1…CR-4 全部修掉，无 P0/P1；5 条 P2 按 PASS-WITH-NOTES 收。上一版原文存档 `plan-review-r1.md`。

## 独立复核（都为真）

HEAD `e27e3d5`＝startSha、工作树 0 产品改动；`node scripts/measure-first-screen.mjs` → gzip **315,221**（headroom 4,779、PASS）；chunk `MarginRail-DrtJF6yW.js` 19,248 / gzip9 **6,803** → 合并 **322,024**，与 plan.md:11-12 逐数同。`chat.ts` 84 行、末导出 `:82`；`chat.test.ts` 15 条、静态门 `:153-159`；`MarginRail.tsx` effect `:176-181`、注释 `:173-175`、log `:707`、turn `:715`、401 占位 `:188`/`:205-207`；`App.tsx` handler `:5886-5893`、`<MarginRail` `:6000`、`</main>` `:6089`；`styles.css:1503-1511`、`:1523`。CR 落点（A2/2、A1/2、A2/1、A1/4）都能对上；`slowMock` 已在 `.tmp/r112-finder-bug.mjs:142-147`（把 `setTimeout` 的 20 ms 改大），2.9 s 够 A1/A3 取样。

**上一版逐条**：CR-1 已修（B-241…B-244，ID 未占用，B-240 是末条）+ test.md 记；CR-2 已修（`prevTabRef` 写回在守卫前，注释与行为一致）；CR-3 已修（A1 等 `deltasAfterBaseline ≥3`、A3 以 `scrollHeight > h0` 为先决）；CR-4 主体已修（删 `stickRef`/`onScroll`、现场读），余两条见 H-1/H-2。

## 新漏洞（P2，均 1–3 分钟）

**H-1 体积上限自相矛盾**：`门 ≤315,321` + `chunk ≤7,003` = **322,324** > `合并 ≤322,224`（plan.md:12）。两个上限同时吃到时按合并判会假红。修：`chat.ts` 只进懒 chunk → 门写 ≤315,221（不变），或合并改 ≤322,324，二选一。

**H-2 `slack=32` 撑不住一个多行 delta**：13 px×1.6=20.8 px/行，32 px 只容 1.5 行。真实模型一条 ≥2 行分片后距离永久 >slack，跟读中途停住且不自愈（mock 3 字/条 = 0–24 px，测不到）。修：`CHAT_STICK_SLACK` 取 96–120（边界单测改 0/95/96），已知边界改写「单条 delta ≤slack 才继续跟」。

**H-3 B-241 证据不硬**：plan.md:59 的 `App.tsx:5884` 是 `<main>` 的 className 行，handler 在 `:5886-5893`（B-230 行已按 `:5886` 记）；`railInsideMain` 只有脚本 `.tmp/r112-finder-ui5.mjs`（stdout 未落盘，其 `mainCapture` 读 `main.onkeydowncapture` 恒 false——React 委托，不能当证据）。修：改引 `App.tsx:6000`/`:6089`，或把 ui5 输出存 `.tmp/r112-finder-ui5.json`。

**H-4 A2/A3 前提未写成断言**：A2「`scrollHeight` 再增 ≥1」在记录区未溢出（`scrollHeight==clientHeight`）时恒不成立；A3 的 `scrollHeight > h0` 要等一次换行（140 ms/3 字 ≈7–8 条 ≈1.0–1.1 s），2 s 上限偏紧。修：A2/A3 开头先断 `scrollHeight > clientHeight`（不够补 2 轮），A3 上限 3 s 或 `slowMock(90)`。

**H-5 改前红与新仪器不同源**：`afterDeltas 344 / settledTop 386` 出自 finder 脚本（无 slowMock、无 delta 计数），新脚本自己的 `deltasAfterBaseline ≥3` 无改前读数。修：动手前用新脚本先跑一次记 `.tmp/r112-a1-before.json`，或 test.md 写明「改前红沿用 finder 读数＋机制证据」。

## 备注

B-229 合并 **322,024** 仍超硬线 2,024（open P1），本轮只回写实测、不修。B-241（P1 键盘）比本轮 scroll 更硬，建议下一轮先排；B-243/B-244 按 `common.md:45` 应为 `deferred`，写成 `open` 需在 test.md 记例外。
