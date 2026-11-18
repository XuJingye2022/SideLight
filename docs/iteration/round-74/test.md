# 第 74 轮验收（tester；未读 `impl.md` 结论）

判定 **PASS-WITH-UNVERIFIED**。B1/B2/B3 与用户焦点 3 条逐条复验通过；证据 `.tmp/r74-tester-*`。

## 门禁（工作树 = `dec7c02` + 未提交改动）
- `npm run verify` PASS：首屏 gzip **303,043 B**（内部 310,000 / 硬线 320,000）。
- `npm test`：**41 文件 536 条，0 fail**（第 73 轮 41/532；`mathReveal.test.ts` 5→9）。
- `npm run roundtrip`：rich 6/8、source 8/8；`04`/`06` 既有差，报告与 HEAD 逐字节相同。

## B2 `==` 定界符随选区露出 — PASS
`.tmp/e2e-r74-tester.mjs`（假 FSA，先 `reset.mjs 9222`）→ `.tmp/r74-tester-e2e.json`：`allPass:true`、0 pageerror / 0 console error。
- 开设置载入 `前 ==高亮== 后`：`.sl-eq` **1**、`.sl-eq-revealed` **0**；Home 后 `→`×2 revealed **1**，`::before`/`::after` 均 `"=="`；再 `→`×2（贴末端）仍 **1**；再 `→`×1 **0**。
- 保存时装饰在场 → `Ctrl+S` 假 FSA 读回 `# 高亮\n\n前 ==高亮== 后\n\n尾段。改\n`，**逐字节相等**、含 `==高亮==`、无 `sl-`。
- 关设置：`.sl-eq` **0**、`.sl-eq-revealed` **0**、正文为字面 `==高亮==`。
- 单测 `mathReveal.test.ts` 9 条（本轮 +4 eq）✓。截图 `shots/round-74/eq-delimiter-reveal.png`（定界符灰等宽、不进正文；验收写 round-73，实际 round-74，未另建副本）。

## 用户焦点 1：待办行距 / 复选框同线 — PASS（B-154 回归）
同上 JSON 的 `task`：3 项；`li` 高 **33.14**（改前 50.14）、行距 **36.18/36.19**、`label` 33.14、`p` margin **0/0**；复选框中心−首行文字中心 **0.06 / 0.07 / 0.06 px**（改前 7.5）。截图 `shots/round-74/tasklist-row.png`。
CSS 口径 `src/styles.css:1046-1078`（`li` flex/align-start、`li>div>p` margin 0、`label` flex/center/1.95em、`input` 14×14）。用户给的 `1029-1055` 是改动前行号。

## 用户焦点 2：Typora 机制 — PASS（文档）
- `docs/iteration/round-73/typora-mechanism.md` 1,966 B（≤2 KB）；三段（解析/渲染/保真）+ 方案（伪元素 A3/B2 已落地、真源文进 doc 不做、预览/导出不改）。
- 抽查 `frame.js` 偏移：779864 高亮 `md-pair-s` 夹 `<mark>`、785623/785945 行内公式 `.md-before/.md-after` + `<script type="math/tex">`、106916 `closest('.md-inline-math.md-expand')`、555669 导出前 `.mathjax-block` 回 `$$…$$`。`page-dist` 33 文件编辑器标记 **0 命中**。
- 引用偏差（建议下轮改）：`@554192` 实为导出重建 `$$\n…\n$$`；「先删 `.md-meta, .md-content`」在 **@54496**。差距表 `:32`/`:43` 已写「…露源码 / 定界符露出」。

## 用户焦点 3：TOC 与公式键盘移入即露 — PASS（B-155/B-156 回归）
- `src/lib/tocRender.ts:286-299`：`!docChanged` 时只算 `revealedIndex`（`:88-107`，含相邻块判据），变了才 `composeSet`；公式 `Decoration.node` 挂 NodeView 外层（`mathReveal.ts:97-101`）。
- TOC：载入 1 / revealed 0 / 高 **0**；点尾段（隔一块）仍 0；**↑×1** 进正文甲 → **1 / 33.14**；**↑×2** anchor 落进 `.toc-source`（offset 5，可编辑）；↓×3 → 0/0。
- 行内 `$\alpha$`：Home 后第 **4** 次 `→` → `.sl-math-reveal` 1、`::after`=`"$\\alpha$"`、`.katex` `none`；再 `→` 0。块级 `$$\beta$$`：下一段 ↑ → 1、`::after`=`"$$\\beta$$"`、`.block-math-inner` `none`；再 ↑ 0。
- 保存回路：露出过 / 未露出两次会话同一改动，假 FSA 读回**逐字节相同**、无 `sl-`，`[TOC]`/`$\alpha$`/`\beta` 都在；块级公式写回三行属既有序列化。

## B3 收口 — PASS（门槛「超了只记」）
- `.tmp/e2e-r74-b3-reveal.mjs` → `.tmp/r74-b3-reveal.json` `allPass:true`、`errors:[]`（验收名写 `e2e-r73-…`，实际 r74）。
- 性能：`.tmp/r73-perf-baseline.mjs`；基线 `.tmp/r74-tester-perf-before-keep.json`；我跑两次 `.tmp/r74-tester-perf-run{1,2}.json`（ms，门槛=基线+50）：small 移选区 297→**295/309**（通过）、small 逐键 1353→**1431/1419**（超 +78/+66，只记）、big 移选区 525→**809/780**（超 +284/+255，只记）、big 逐键 4932→**4689/4634**（通过）。
- 最长 long task 0/0/0/131、0/0/0/135（基线 133）无变差。`sl-parse-done` 增量 0 只证没重解析；零重建由 `mathReveal.test.ts:71`（换选区 10 次同一 `DecorationSet`）与 eq 用例 `builds` 不变坐实。夹具无 `==`/公式，扫描走空区间快路径，读数不度量 B2 成本；`big 移选区` 超基线无机制证据，留档。
- `docs/iteration/round-74/impl.md` 4,086 B（≤4 KB），含两组数值、脚本路径、超门槛项、`sl-parse-done` 口径。

## 回归与发现池
`scripts/keyboard-acceptance.mjs`（CDP 9222，跑后 `git checkout -- shots/round-05/`）：**51/52**，唯一 FAIL「Ctrl+Shift+S 不出现新的已保存/已取消提示」= BACKLOG **B-209** 既有过期断言（第 52/56/58/64 轮同一条），复跑两次同结果。BACKLOG 无本轮需改行：B-154/155/156 第 73 轮已 `fixed`；B1–B3 是计划任务；B-209 仍 open。
