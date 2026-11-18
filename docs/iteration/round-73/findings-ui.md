# 第 73 轮 · 界面 / 可访问性（finder-ui）

环境：dev 5175、CDP 9226（先 `node .tmp/reset.mjs 9226`），脚本 `.tmp/e2e-r73-ui-finder{,2,3}.mjs`，1440x900；原始量 `.tmp/r73-ui-finder{,2}.json`。

## F1 P1 待办列表行距 53.18 px，复选框中心比文字低 7.5 px

证据（三项 todo 文档，DOM 实量）：li 高 50.14 = p 行盒 33.15（行高 1.95）＋ p 下边距 17；连行距 53.18。复选框中心 163.05、文字视觉中心 155.55（li 顶 139.05）→ 低 7.5 px。
根因：`src/styles.css:1040-1043` 的 `label{margin-top:7px}` 叠在行内 input 的基线上（label 33.15 行盒内再下沉 ~10 px）；`:777` 的 `.doc-body li > p{margin:0}` 打不中 TaskItem 的 `li > div > p`（实测 liP=DIV）。
修法：① `ul[data-type="taskList"] li > div > p{margin:0}` → 行距 ~36.2 px；② label 改 `display:flex;align-items:center;height:1.95em;margin-top:0` → 中心差 0。
截图：`shots/round-73/tasklist-spacing.png`、`tasklist-row-zoom.png`。回归：保存字节、Tab 缩进、`- [ ] ` 输入规则、深色/暖纸。

## F2 P1 TOC 标记行收起后键盘进不去，相邻也不露

证据：`src/styles.css:956` `.toc-source:not(.is-revealed){display:none}`。载入时选区在标记段内 → `toc-source is-revealed`、高 33.14（机制正常）。移到「正文段落。」后连按 ArrowDown：光标直接 乙节(H2) → 第二节正文，标记段 class 恒 `toc-source`、高 0；ArrowUp 反向同样跳过；Ctrl+Home 不生效（src 未映射 Home/End）。
纠正前提：`src/lib/tocRender.ts:266-275` 已有「只换选区」分支，revealed 会重算；真因是 `display:none` 让该段 coordsAtPos 为 0，方向键跨过。
修法：`revealedIndex`（`:82-87`）把边界算进露出：`from===range.from || from===range.to` 也返回该下标；露出后下一次 ArrowDown 才落得进去。O(#sources)，不扫全篇。回归：`tocRender.test.ts` 加边界用例、Backspace 删标记、两个 [TOC]、`\[TOC\]` 字面、预览 nav、保存字节。

## F3 P1 公式 atom 被方向键选中只加 class，不露 `$…$`

证据（math 文档）：ArrowRight 选中行内公式 → class 加 `ProseMirror-selectednode`，DOM 仍是纯 KaTeX，input/textarea 0 个、无 `$E=mc^2$`；ArrowDown 选中块公式同。只有点击才开编辑（`.math-inline`）。原因：`@tiptap/extension-mathematics` 的 NodeView 只渲 KaTeX、不读选区（`extension-mathematics/dist/index.js:126-162`、`:301+`）。
Typora 机制（`frame.js` 压缩为 2 行；`page-dist` 只有偏好/欢迎/许可，无编辑器代码）：块公式是 `div.md-rawblock.md-math-block[contenteditable=false]`，内含 MathJax 渲染容器（`File.editor.mathBlock.renderTex`）或 `$$<br/>源码<br/>$$` 兜底，`data-math-tag-before/after` 存原标记；进编辑时隐藏渲染容器、显示 `.md-rawblock-input` 的 CodeMirror（mode `stex`，value=节点 text）并加 `md-rawblock-on-edit`。`$$` 回车先开输入框（`Markdown Reference.md:102-127`）。
修法：`Node.extend` 两个公式节点自建 NodeView：「KaTeX 容器 ＋ `<span class="math-source">$latex$</span>`」，`editor.on('selectionUpdate')` 或插件 view.update 判 NodeSelection 命中 / 光标在 pos-1 或 pos+nodeSize → 切 `data-source`；不改 renderHTML，导出与 roundtrip 字节不动。回归：roundtrip、`export.test.ts` 三条公式 HTML、KaTeX 惰性（切显隐不重渲）、点开编辑、只读预览与源码模式、1 MB。

## F4 P2 `==高亮==` 的定界符显隐可照抄 Typora

Typora 渲成 `<span md-inline='highlight' class='md-pair-s'><span class='md-meta md-before'>==</span><mark>x</mark><span class='md-meta md-after'>==</span></span>`：定界符是真实 DOM 文本，光标相邻才显示，复制与保存天然逐字节。本仓库 `src/lib/inlineSyntax.ts:45-51` 已保字节但不显定界符；补一个「选区贴 mark 边界时两端挂 `==` widget」的装饰插件即可（与 F3 共用相邻判定）。Typora 也默认关（`Markdown Reference.md:370-372`），故 P2。
