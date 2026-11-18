# 第 73 轮执行报告（A 轮 · executor）

轮前 `a0b66b5`；dev 5175；CDP 9222（每脚本前 `node .tmp/reset.mjs 9222`）；未 commit、未改 `release/`。

## A1 B-154 待办行高与复选框对齐 —— DONE
- `src/styles.css`：`ul[data-type="taskList"] li > div > p{margin:0}`；`li > label` 去 `margin-top:7px`，改 `display:flex;align-items:center;height:1.95em`。
- 改前 `.tmp/r73-a1.json`：li 高 50.14、行距 53.19、`p` 下边距 17、中心差 7.5。
- 改后 `.tmp/r73-a1-after.json`：li 高 33.14、行距 36.19、`p` 边距 0、中心差 0.06；勾选后 `Ctrl+S` 假 FSA 读回 `- [x] 第一项`；`allPass:true`。
- 截图 `shots/round-73/tasklist-fixed.png`。

## A2 B-155 TOC 标记段相邻即露 —— DONE
- `src/lib/tocRender.ts`：`revealedIndex(doc,sources,from,to)` 加相邻判据——光标顶层块末尾 = 标记段 from（前一块）或开头 = 标记段 to（后一块）；depth 0 只认贴边；落段内仍算。三处调用点同步传 `selection.from/to`。
- 改前证据：HEAD 的 `tocRender.test.ts` 同场景断言 `revealed=-1`（`git show HEAD:src/lib/tocRender.test.ts`）。
- e2e `.tmp/e2e-r73-a2-reveal.mjs` → `.tmp/r73-a2.json`，从非相邻块起手：载入 0/0 → 点尾段 0/0 → ↑ 落正文甲（相邻前块）1/33.14 → 再 ↑ anchor 在 `.toc-source` 内 → 标题二 1 → 标题一 0 → 段内 `End`+`Shift+Home`+`Backspace` 后 `Ctrl+S` 假 FSA 读回无 `[TOC]`；`allPass:true`。
- 单测 `tocRender.test.ts`：`withToc('一')`→0、`withToc('一','二')`→−1、下一块首/末→0、段内→0；11 条全过。

## A3 B-156 公式 atom 选中即露源码 —— DONE
- 新 `src/lib/mathReveal.ts`：`collectMathRanges`、`revealIndexes`、工厂 `createRangeRevealPlugin({key,scan,decorate,touches})`、`mathReveal()`；装饰 `Decoration.node` 落 NodeView 外层（`data-latex` 宿主）。
- 缓存：无 docChanged 且露出集合不变→返回上一 state（同一 `DecorationSet`）；docChanged 只在片段含公式 / 步命中区间（含 setNodeMarkup）时重扫，其余只 map。
- `src/App.tsx` 加 `mathReveal()`；`src/styles.css` 加 `sl-math-reveal` 伪元素（行内 `$…$`、块级 `$$…$$`），同时隐藏 `.katex`/`.block-math-inner`；`package.json` test 追加 `mathReveal.test.ts`。
- e2e `.tmp/e2e-r73-a3-math.mjs` → `.tmp/r73-a3.json`：行内 `Shift+→`×4 选中 → `.sl-math-reveal` 1、`::after`=`"$\\alpha$"`、KaTeX `none`；移开 0；块级从尾段 ↑ 一次 → 1、`::after`=`"$$\\beta$$"`、内层 `none`；↓ 移开 0；`Ctrl+S` 与「全新载入、从未露出」对照组逐字节同（假 FSA），TeX 保留、无类名泄漏；`allPass:true`。
- 单测 5 条：区间收集、命中/远离、同 doc 换选区 10 次同一引用、非公式编辑只映射、插入公式才重扫。

## 门禁（全绿）
- `npx tsc --noEmit` exit 0。
- `npm test` exit 0：41 文件 532 条全过（原 40/524 + tocRender 3 + mathReveal 5）。
- `npm run verify` PASS：首屏 gzip 302,787 B（硬线 320,000）。
- `npm run roundtrip`：rich 6/8、source 8/8，报告与 HEAD 无 diff。
- B3 基线 `.tmp/r73-perf-baseline.mjs` → `.tmp/r73-perf-baseline.json`：100 KB 移选区 20 次 297 ms、逐键 30 字 1353 ms；1 MB 525 ms / 4932 ms、最长 long task 133 ms。夹具无公式，插件走零重建快路径，可当改前参考。

## CHANGELOG 建议
任务项行高回到一行、复选框与首行文字垂直居中；`[TOC]` 标记段与公式源码在光标相邻/选中时露出。

## 新踩坑
1. Vite 曾交付 App.tsx 混合版本（有新 import、无 `mathReveal()` 调用）：插件不生效、`.sl-math-reveal` 恒 0。先 `GET /src/App.tsx` 查调用点，touch 源文件即恢复。
2. 公式 atom 的 NodeView 带 `contenteditable=false`：纯 `→` 会跳过 atom，须 `Shift+→` 拉选区（或块级 `↑` 成 NodeSelection）才触发露出。
3. 隐藏的 `.toc-source` 要 `waitForSelector(...,{state:'attached'})`；「切换文档」对话框会让正文 `inert`，点段落前先处理。
