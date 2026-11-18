# 第 73 轮 · 安装与启动侦察（finder-ship）

基准 HEAD `a0b66b5`、dev 5175、CDP 9224、只读。日志 `.tmp/r73-ship-{verify.log,finder.json,tocfix.json}`；截图 `shots/round-73/ship-tasklist.png`。

## F1（P1）任务列表：行高多 17 px、复选框低 7.5 px

实测：`li` 高 50.1、文字行高 33.15、相邻行只隔 3 px（`li` margin 3.06）；复选框中心 367.42 vs 文字首行中心 359.92 → 偏下 7.5。

- `src/styles.css:1040-1043` `label{margin-top:7px}`：label 行盒与段落行盒同为 33.15，去掉这 7 px 即对齐。
- `src/styles.css:1045-1047` 没收段落下边距：50.1 = 33.15 + `p` 的 margin-bottom 17。

修复（只 CSS）：`.doc-body ul[data-type="taskList"] li > label{margin-top:0}`、`… li > div > p{margin-bottom:0}`。回归：嵌套任务项、单元格内任务列表、三主题、`- [ ] ` 输入规则。

## F2（P1）TOC 标记行方向键进不去，源码永不露出

`src/styles.css:956-958` 用 `display:none`；`src/lib/tocRender.ts:82-87` 只认「选区在段内」，`:266-274` 选区事务会重算——两条都对，缺的是**能把选区移进去**。

- 实测 A（现状）：`h1` 文首按 ↑，选区不动（anchor 仍「一级标题」offset 0），`.toc-source` 恒 `display:none`、高 0。`display:none` 无几何 → ProseMirror 上下移动落不进去 → 条件永不成立。只有刚打出 `[TOC]` 才露出，与用户报的现象一致。
- 实测 B（同页注入覆盖 CSS，不改源码）：改成零高块 `display:block;height:0;overflow:hidden;opacity:0;line-height:0` 后按 ↑ → `is-revealed`、高 33.14、anchor `[TOC]`，可编辑。

修复：`:956-958` 换零高块（再加 `min-height:0;margin:0;padding:0;border:0`），`.is-revealed` 分支保持可见，插件不改。回归：`tocRender.test.ts:75`、`\[TOC\]` 不挂、保存写回、只读预览。

## F3（P1）公式无源码露出；Typora 的做法

现状：公式是 atom（`node_modules/@tiptap/extension-mathematics/dist/index.js:27,126,208,301`：`atom:true` + `addNodeView`），DOM 只有 `data-latex`；实测方向键跨过后 `.ProseMirror-selectednode` 为 0、innerText 无 `$`，点击开本仓库对话框。`==` 同因：`src/lib/inlineSyntax.ts:43-51,95-100` 的 tokenizer 吃掉定界符，`renderHTML` 只输出 `span.sl-eq`。

Typora（`…/app/resources/appsrc/window/frame.js`，单行 bundle，按字符偏移）：

- @785968 行内：`<span class='md-inline-math …' md-inline='inline_math'>` 内含 `<script type="math/tex">TeX</script>`，两侧 `md-meta` 的 `$`；MathJax 就绪后同 span 换 `math-jax-postprocess`，`md-meta` 保留。
- @107068 露出：点 `mjx-container` → `addClass('md-expand')` + `selectAllElem(script)`；`cursorChange` 盯 `.md-expand`。即类切换 + 选中源码。
- @40568 行间：`<div contenteditable='false' class='mathjax-block md-math-block md-rawblock'>` 先放字面 `$$<br/>TeX<br/>$$`，就绪后换 MathJax；模型存 text，写回走模型。
- @779945 高亮：`<span md-inline='highlight'><span class='md-meta md-before'>==</span><mark>…</mark><span class='md-meta md-after'>==</span></span>`，导出简化成 `<mark>`（@336912）。

方案：①公式自定义 NodeView，atom 内加 `<span class="math-src">$latex$</span>`，选区落在 `[from-1, to+1]` 或 NodeSelection 时加 `is-revealed`（CSS 藏 KaTeX 显示源码），KaTeX 仍 lazy；②`==` 两端补 `md-meta` 定界符 widget，按选区显隐；③回归：`export.ts:166`、`math.ts:35,61`、`App.tsx:5003-5064`、`mathInput.ts:43,53`、首屏 gzip 门、`inlineSyntax.test.ts`。

## 4 发布门（0 个新 P0/P1）

`npm run verify` PASS：首屏 gzip 302,014 B（raw 978,096），内部线 gap 7,986、硬线余 17,986。`git diff --stat 4cccb03..HEAD` 只有 `docs/`+`shots/` → 第 72 轮已核的安装包硬线/版本门不重测；未打 setup、未动 `release/`、未 push。

## 5 未做

未跑 `npm test`；未打安装包/真实安装；F2-B 是注入 CSS 验的（未落源码）；F1/F3 修复未验；Typora.exe 未启动。
