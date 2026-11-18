# 第 73 轮 finder-bug

HEAD `a0b66b5`；dev 5175、CDP 9222；1440×900；正文 17 px、行高 1.95=33.15 px；0 错误。脚本 `.tmp/e2e-r73-finder-bug{,2}.mjs`；数据 `.tmp/r73-finder-bug{,2}.json`。

## F1（P1）任务列表行高 1.51×，复选框比文字低 7.5 px
`shots/round-73/tasklist-row.png`。敲 `- [ ] 任务一`⏎`任务二`⏎`任务三`：任务 `li` 高 50.14、行距 53.18；对照普通列表 `li` 高 33.14、行距 36.18。任务行 `p` 多出 17 px 下外边距。复选框 136.05–150.05，中心 143.05；文字行盒中心 135.55 → 低 7.5 px。
根因：`src/styles.css:777` 的 `.doc-body li > p{margin:0}` 不匹配 TaskItem 的 `li > div > p`，`p` 留着 `:763` 的 1em 下边距；`:1034` 的 `li{display:flex}` 挡住外边距折叠，17 px 全留行内；`:1040` 的 `label{margin-top:7px}` 再把复选框下推 7 px。
修法：加 `.doc-body ul[data-type="taskList"] li > div > p{margin:0}`；`label` 去 `margin-top`，改 `display:flex;align-items:center;height:1.95em`。
回归：多行/嵌套任务、勾选写回 `- [x] `、打印。

## F2（P1）`[TOC]` 标记行方向键到不了，永远不露出
`shots/round-73/toc-math-reveal.png`。`.toc-source` 的 `display`=`none`（`styles.css:956-958`），盒 0×0。光标在 `## 标题二` 连按 ↑ 3 次，anchor 从 `标题二`→`正文甲`→`标题一`，整段跳过 `[TOC]`，`is-revealed` 0/3。
判据：逻辑有效、几何坏。`src/lib/tocRender.ts:266-275` 的「只换选区也重算」有效（`props.decorations` 每帧重取，`prosemirror-view/dist/index.js:5647`）；坏在 `display:none` 无盒，Chrome 光标导航直接越过。
修法：①隐藏改 `display:block;height:0;margin:0;padding:0;border:0;overflow:hidden`，留落点；②`revealedIndex()`（`tocRender.ts:82-87`）判定扩到 `from>=range.from-1 && from<=range.to+1`（相邻即露）；③仍只随选区变化，避免 1 MB 逐键回到 B-129。
回归：`tocRender.test.ts:75`；B-130/B-133；`\[TOC\]` 字节；预览 nav；1 MB `builds` 不增。

## F3（P1）公式源码只在鼠标点开时露，方向键移入不露
行内节点 `data-type="inline-math"`、`data-latex="E=mc^2"`、`contenteditable=false`；行尾连按 ← 第 4 次得 `ProseMirror-selectednode`，`mathEditorVisible` 6/6 为 0，DOM 无 `$E=mc^2$` 文本。块级 `block-math` 同一路径。
根因：露出只有 `onClick` 一条入口（`src/App.tsx:966`/`:969` → `mathEditRef`，实现 `:5003`），键盘只产生 NodeSelection，不触发回调。
修法：加插件装饰，`selectionSet` 后拿 `selection.from/to` 与节点 `pos..pos+nodeSize` 比（相邻也算），命中 `Decoration.node(...,{class:'is-revealed'})`；NodeView 在 `.is-revealed` 下渲染 `<span class="sl-math-source">$latex$</span>` 并隐藏 `.katex`；就地编辑仍复用 `mathEditRef`；不改 atom 属性与内容。
回归：点公式编辑、`Ctrl+Shift+M`、输入规则、`katexLazy`、导出字节、`npm run roundtrip`。

## 研究：Typora 的 `==` 与 `$$`
证据 `appsrc/window/frame.js`（1,563,305 B）：`md-math-*` 55、`md-inline|md-focus|md-expand` 278、`$$` 33、`mathjax` 47；高亮是 AST 节点渲染 `<mark>`（`case a.highlight:return"<mark>"+e.inner+"</mark>"`）；`Docs/Markdown Reference.md:372` 写明默认关。
1. 源码保真：分隔符是 DOM 文本节点（`.md-before`/`.md-after`），进入时给祖先加 `.md-expand` 露出，不重建节点。
2. 露出靠选区：`cursorChange` 里 `addClass("md-expand")` + `closest("[cid]").addClass("md-focus")`，与文档变化无关——就是 F2/F3 缺的一环。
3. 数学：行内 `.md-inline-math` 内放 MathJax `<script>`；块级是 `.md-math-block.md-rawblock`（`contenteditable=false`），内部即字面 `$$…latex…$$`，点击才展开。
对照：`==` 现有 `inlineSyntax.ts:44-51`（默认关、字节保真）已等价，只缺「选中露 `==`」；公式是 atom + `data-latex`，DOM 无源码文本，必须由 NodeView 补 span；两者共用插件。

未验：真 IME、宿主同路径（`INIT-FAIL`）。
