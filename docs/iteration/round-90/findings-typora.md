# 第 90 轮 Typora 对照（finder-typora）

被测：dev `http://localhost:5175`，真机 ego 浏览器（CDP 54280；另开隔离源 `http://[::1]:5175`，避免与并行代理抢同一 localStorage）。夹具：`# 公式与代码` + `$x^2$` + `$$…$$` + ` ```js ` 围栏 + 空语言围栏。

## F1（P1）行内公式无就地编辑：`$…$` 只是伪元素，改公式必须开浮层

- 点行内 atom → `MathInlineEditor` 浮层：`.math-inline` `position:fixed; left:343.359px; top:200.75px; width:360px`（`src/components/MathInlineEditor.tsx:76-98` 的 `createPortal`），内含 `<input>` 值 `x^2`、预览、「Enter 提交 Esc 取消」，盖住 atom（atom rect y=205）。atom `contenteditable="false"`，光标进不去。
- 方向键选中时露出的 `$…$` 不可编辑：`src/styles.css:2237-2239` 用 `::after{content:'$' attr(data-latex) '$'}` 画，`> .katex{display:none}`（`:2249`）。即「进入即显示 `$…$` 可改」现在**只能看不能改**。
- 就地通道已存在但是死代码：`setMathDraft(` 全仓 2 命中，均不置非空（`src/App.tsx:5231` 置 null、`:5327` `current ? {...} : current`），`MathDraftPreview` 的条件渲染（`:6438-6439`）永不命中。
- Typora：`.tmp/typora-ref/resources/Docs/Markdown Reference.md:358`「input `$`, press `ESC`, then input a TeX command」。
- 验收：方向键/点击进入即把 `$…$` 变成真文本可改，Enter/失焦回渲染，保存字节不变。

## F2（P1）行间公式只有浮层 textarea，块内不能编辑

- 点块级 atom → `.math-inline.is-block` `left:305px; top:246.781px; width:360px`（h=195），`<textarea>` 值 `\sum_{i=1}^{n} i`，hint「Enter 提交 Shift+Enter 换行 Esc 取消」。
- atom `contenteditable="false"`，内部可编辑元素 0 个（`atom.querySelectorAll('[contenteditable],textarea,input').length===0`），innerHTML 只有 `.block-math-inner > span.katex-display`；上游 BlockMath `addNodeView` 只渲染 KaTeX（`node_modules/@tiptap/extension-mathematics/dist/index.js`）。
- 弹层来源链：`src/lib/mathInput.ts:143-203` 建块 → `onBlockCreated` → `src/App.tsx:1032` → `mathEditRef.current(position)` → `setMathEdit`。
- Typora：同上 `Markdown Reference.md:106`「input `$$` and press Return. This will trigger an input field which accepts Tex/LaTeX source」。
- 验收：块内直编 TeX + 块内预览，无浮层；`$$` 往返字节不变（现往返已成立）。

## F3（P1）代码块不显示语言、不能切换；但 ` ```js ` 往返正常

- 光标在块内时 DOM：`<pre class=""><code class="language-js">const a = 1</code></pre>`；`getComputedStyle(pre,'::before'/'::after').content` 均 `none`；`[role=toolbar]` 0 个、`.ProseMirror button` 0 个 → 无语言标签、无切换入口。
- 往返（用户点名的疑问）：改 1 字后读 `localStorage['sidelight.doc.v1']`，` ```js`, 空语言围栏, `$$…$$`, `$x^2$` 四段原样；该草稿与保存链同源（`src/App.tsx:1175-1185` 的 `applyRepairs(current.getMarkdown())` + `joinFrontmatter`）→ **language 没丢**，缺的只是显示与切换。
- Typora：块右上角显示语言并可点选（`.tmp/typora-ref/resources/Docs/Code Fences Language Support.md`）。
- 拆分：B-135（高亮）deferred 因需新依赖；「显示 + 改语言」只需 CodeBlock NodeView 标签/下拉 + `updateAttributes({language})`，不新增依赖，可先单独排期。

## F4（P2）差距表：计数自洽，数学行已不描述真实交互

- `docs/typora-gap.md:7`「已经有的（42）」= 表体 11–52 行 42 行；「缺的（3）」= 编辑/导出/外观各 1 行 → 42/3 自洽，未过期。
- `docs/typora-gap.md:32` 数学行只写「第 73 轮起选中 atom 露出源码」，没写「改公式要开浮层」，与 F1/F2 对不上。建议补现状，并把「块内/就地编辑」加进缺表（P1）。

## 证据

`shots/round-90/typora-math-popover.png`（行间浮层，读数为 ego_js）；本轮未落脚本。
