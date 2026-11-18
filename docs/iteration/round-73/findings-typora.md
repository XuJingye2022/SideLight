# 第 73 轮 · Typora 对照（finder-typora）

HEAD `a0b66b5`；dev `http://localhost:5175`；CDP 9223。用户报的 3 条全部复现：**4 条 P1**。
取证：`.tmp/e2e-r73-typora{, -b, -c}.mjs`、`.tmp/r73-typora-probe{,2,3}.json`、`.tmp/r73-typora-extract*.txt`；截图 `shots/round-73/typora-f1-tasklist.png`、`typora-f3-toc-arrow.png`。

## F1（P1，外观）任务项行高 50.14 px、复选框比首行低 7.43 px

实测（行高 33.15）：`li` 高 **50.14**、行距 **53.19**；普通段 33.14；`li>div>p` 的 `margin-bottom` **17px**；复选框 14×14 + `label margin-top:7px` → 中心差 **+7.43 px**。
根因：`src/styles.css:777` 的 `.doc-body li > p{margin:0}` 只配 `li>p`，任务项是 `li>label+div>p`，`p` 落回 `:763` 的 `margin:0 0 1em`；`:1040-1043` 的 `7px` 对不上 33.15 行盒。
已验证修法（注入等价 CSS，未改源码）：`li>div>p{margin:0}` + `li>label{display:flex;align-items:center;height:calc(1lh);margin-top:0}` + `li>label>span{display:none}` → 行高 **33.14**、行距 **36.19**、中心差 **−0.01 px**。
回归：换行、嵌套任务项、勾选态、打印/预览。

## F2（P1，机制 + 方案）Typora 靠「源码与成品同时在 DOM，只切可见性」

- 高亮：`frame.js` @779945 出 `md-meta md-before`=`==` + `<mark>` + `md-meta md-after`=`==`；导出 @336912 只出 `<mark>`；`base-control.css` `.md-expand .md-meta{display:inline}`（光标进入才露）。
- 公式：`frame.js` @40568 `math_block` 出 `md-math-block md-rawblock`，内含 `math-jax-postprocess`（渲染）或 `math-jax-preprocess`（字面源码）两份；`base-control.css` 用 `.md-rawblock:hover>.md-rawblock-container{display:block}` 与 `.md-rawblock-on-edit` 切换。序列化只从模型取。
- 本仓库差异：`src/lib/inlineSyntax.ts:43-130` 把定界符吃进 mark，DOM 无 `==`，存盘才写回。`==` 方案（0 依赖）：加插件，`selection.$from.marks()` 命中 `eqHighlight/caretSup/tildeSub` 时在 `from`/`to` 两侧加 `Decoration.widget` 出 `==`/`^`/`~`（sl-meta）；关时返回空集。

## F3（P1，编辑）`[TOC]` 标记段方向键到不了，`is-revealed` 永不触发

实测：`# 甲章` / `甲章正文一段。` / `[TOC]` / `目录之后的一段。` → `nav.sl-toc` 1、`.toc-source` 高 **0**。末段连按 ↑↑↑↓↓↓：落点 `甲章正文一段。`→`甲章`→…，**从未进 `[TOC]`**，`.toc-source` 始终无 `is-revealed`。
根因：`src/styles.css:956-958` 对未露出段 `display:none`，光标落不进不渲染的盒；`src/lib/tocRender.ts:266-275` 的选区分支正确，但那个选区永远到不了。
修法（①必做，②按 Typora 补）：① `handleKeyDown` 拦 `ArrowUp/ArrowDown`，相邻 TOC 段（跳过连续隐藏源段）时 `setSelection(TextSelection.create(doc, from+1))` 并 `return true`；② `makeToc`（`tocRender.ts:56-79`）加「删除目录」钮，点按 `deleteRange`。
回归：B-130 进入露出且可 Backspace、B-132 软换行、B-133 手打即出、`\[TOC\]` 字节不变、预览 nav、1 MB `builds` 不增。

## F4（P1，编辑）公式被键盘选中时不露源码

实测：行内 `$x^2$` 段尾连按 ←，第 4 下 wrapper 带 `ProseMirror-selectednode`，但 `.math-inline` **0 个**；↓/↑ 到块级公式同样选中、`.math-inline` 仍 0。只有点击才开（`src/App.tsx:963-971` 的 `onClick`）。
根因：`@tiptap/extension-mathematics` 的 NodeView 只监听 `click`（`dist/index.js:151`、`:323`），无 `selectNode`；本仓库没有「选区→露源码」的驱动。
方案（同 Typora 两份并存）：包一层 NodeView 加 `selectNode()/deselectNode()`，选中态把 KaTeX 换成字面 `$$latex$$` / `$latex$`。**不要**直接调 `mathEditRef`：`MathInlineEditor.tsx:22-27` 挂载即 `focus()+select()`，连按会反复弹层夺焦。
回归：点公式仍开浮层、Enter/Esc、`Ctrl+Shift+M`、存盘字节不变、表格拦块级公式、方向键不卡死。

## 未验

未启动 `Typora.exe`（只读其安装目录）；深色/暖纸配色未测。
