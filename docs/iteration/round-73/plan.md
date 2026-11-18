# 第 73 轮计划（revision 1；A/B 各 ≤3 任务）

rev1：R1–R6 已逐条修，结构/范围不变。
轮前 `a0b66b5`；dev 5175；CDP 9222（`node .tmp/reset.mjs 9222`）；不 push、不改 `release/`、0.32.1。
BACKLOG：P1 = B-154/155/156（A 轮全做）；P2 deferred。映射 ①→A1 ②→B1+B2 ③→A2/A3。
时间盒 R5：A1 9min、A2 6、A3 7、门禁 3；第 0 步量基线（B3 复用）。

## A 轮（单执行代理；A1→A2→A3；门禁：A1 一次 `npm run verify`，轮末 `npm test`(41 文件)+`npm run verify`(≤320,000 B)+`npm run roundtrip`）

### A1 B-154 待办行高与复选框对齐（问题 1）
`src/styles.css:777` 加 `.doc-body ul[data-type="taskList"] li > div > p{margin:0}`；`:1040-1043` 的 `label` 去 `margin-top:7px` 改 `display:flex;align-items:center;height:1.95em`。e2e `.tmp/e2e-r73-a1-tasklist.mjs`，改前读数存 `.tmp/r73-a1.json`。
收：li 高 ≤34（前 50.14）、行距 36.2±1、`p` 下边距 0、|复选框中心−首行文字中心| ≤1（前 7.5）、勾选写回 `- [x] `；截图 `shots/round-73/tasklist-fixed.png`。

### A2 B-155 TOC 标记段相邻即露（问题 3 前半）
`src/lib/tocRender.ts`：`revealedIndex(doc,sources,from)`（`:82-87`），3 处调用点 `:151`/`:231`/`:268` 同步；判据 `$f=doc.resolve(from)`，`$f.depth>=1 && ($f.after(1)===src.from || $f.before(1)===src.to)`，块内任意偏移算（R2：x 列落点）；`depth===0` 用 `selection.from/to` 贴边；落段内仍算。e2e `.tmp/e2e-r73-a2-reveal.mjs`。
收：文档 `# 标题一/## 标题二/[TOC]/正文甲(长行)/尾段`；正文甲行中（x=0.6，`anchorOffset>0`）按 ↑ 一次 →`.toc-source.is-revealed` 1、段高 ≈33（前 0/0）；再 ↓ → anchor 在 `.toc-source` 内；`Shift+Home`+`Backspace`（R6①）→ 假 FSA 写盘（`scripts/data-safety-acceptance.mjs:76`）读回无 `[TOC]`；点尾段 →0/高 0。
单测 +3 并改 `tocRender.test.ts:81-83`：`withToc('一')` 默认选区（紧邻前块）→ 0；`withToc('一','二')` → −1（R2②）。载入即露＝设计，impl.md 记。

### A3 B-156 公式 atom 选中即露源码（问题 3 后半）
新 `src/lib/mathReveal.ts`（≤120 行）、新 `src/lib/mathReveal.test.ts`、**`package.json` 的 `scripts.test` 追加 `node --experimental-strip-types src/lib/mathReveal.test.ts`（R1）**、`src/App.tsx:963-971`、`src/styles.css:850`/`:2078`、`.tmp/e2e-r73-a3-math.mjs`。
实现：`collectMathRanges(doc)`→`{from,to,type}`（`atom:true`，dist:27/208）、`revealIndexes`、工厂 `createRangeRevealPlugin({key,scan,decorate})`，判据照 `tocRender.ts:166-245`；**state 缓存 `{ranges,set,builds}`（R3）**：选区变化只算 reveal，不变就 `return previous`（同一 DecorationSet）；`docChanged` 仅「slice 含公式／步 map 命中区间／`setNodeMarkup` 落区间或新类型是公式」才重扫，否则只 `mapping.map`。装饰落 NodeView 外层（`prosemirror-view:1498`）；伪元素出 `data-latex`（dist:135/308），行内 `$`、块级 `$$`。
收：单测 ≥3（区间收集、命中 1、远离 0、**换选区 10 次同一引用（R4）**、非公式编辑只映射）；e2e：`$\alpha$` 按 → 选中 →`.sl-math-reveal` 1、`::after` 含 `\alpha`；`$$\beta$$` 同；移开 0；`Ctrl+S` 字节同（假 FSA，否则 UNVERIFIED）。超时：砍末两条。

## B 轮（先 10 min delta：A 三脚本复跑）

### B1 问题 2 调研：Typora `==`/`$$` 机制与保真（文档，不改 src）
新 `docs/iteration/round-73/typora-mechanism.md`（≤2 KB）、`docs/typora-gap.md` 的 `==` 与公式行备注。
证据：`frame.js` @40568 `math-jax-postprocess`（MathJax）/`preprocess`（`$$<br/>latex<br/>$$` 兜底）、@106916 `.md-inline-math.md-expand` 用 `<script>` 存原 TeX、@49801 定界符是独立 `span.md-pair-s`、@555669 导出从原文重建；`page-dist` 无编辑器代码。摘录 `.tmp/r73-typora-extract.txt`。
三段：解析留定界符与原文／渲染是源码+成品两份 DOM 只切可见性／导出从原文重建。对照：`==` 是 `inlineSyntax.ts:44-51` 的 mark（定界符不进 DOM）、数学是 atom+KaTeX（只留 `data-latex`）→ 缺「源码那份」。
收：≤2 KB、每条带偏移或 `文件:行号`；三方案（伪元素＝B2、块级源码行＝A3、预览/导出＝P2）；差距表补「定界符不随光标露出」。

### B2 问题 2 落地：`==` 定界符随选区露出
`src/lib/mathReveal.ts`（**复用 A3 模块与工厂，不新开 `sourceReveal.ts`，R6③**）、`src/lib/mathReveal.test.ts`、`src/App.tsx`、`src/styles.css:850-854`。
同工厂再建插件：`scan` 收 `eqHighlight` mark 连续区间（相邻合并），挂 `sl-eq-revealed` + `::before/::after{content:'=='}`；设置关时 mark 0 → `DecorationSet.empty`。开设置：`localStorage['sidelight.settings.v1']`。
收：`.tmp/e2e-r73-b2-eq.mjs`：载入 `前 ==高亮== 后`；光标进高亮（`→`×2）→1、`::before` 含 `==`；贴末端 →1；`→`×2 后 →0；关设置 `.sl-eq` 0、无伪元素；假 FSA `Ctrl+S` 读回 `==高亮==` 逐字节同（R6②）；单测 ≥3。截图 `shots/round-73/eq-delimiter-reveal.png`；门禁 `npm test`、`npm run roundtrip`。

### B3 露出收口（基线口径）
`.tmp/e2e-r73-b3-reveal.mjs`、`.tmp/r73-perf-baseline.mjs`、`docs/iteration/round-73/impl.md`（≤4 KB）。
**基线改动前量**（A 轮第 0 步）：100 KB/1 MB 各测「移选区 20 次」「逐键 30 字」墙钟与最长 long task → `.tmp/r73-perf-baseline.json`；B3 同脚本同夹具复测；回路：A2/A3/B2 的露出→移开→字节核对（R6②）。
收：`allPass:true`、0 错误；两项 ≤ 改前基线 + 50 ms（超了记数值不判红，第 53 轮口径）；`sl-parse-done` 增量 0 只证没重解析，**不当零重建证据**（R4），零重建由 A3 单测同一引用证。门禁 `npm test`、`npm run verify`。

截图 2 张（A1、B2），A2/A3 用 DOM 读数留证；日志 `.tmp/`；报告中文。tester 每轮验收并 commit；scribe 批末同步 README/AGENTS（41 文件）、CHANGELOG、STATE。
