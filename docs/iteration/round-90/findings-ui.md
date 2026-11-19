# 第 90 轮 UI 侦察：公式就地编辑与代码块语言（finder-ui）

真机：ego 浏览器 CDP 54280（9222–9226 无监听），dev `http://localhost:5175`，1256×808 深色。复现文档用源码视图写入，结束后已还原。
环境注：本会话 CDP 键盘对 `$` 等 Shift 符号不稳定（多次敲入不进正文），公式改用 Ctrl+M / Ctrl+Shift+M 与源码视图造，不靠手打 `$`。

## F1（P1，编辑）行内公式不能就地编辑：源码是伪元素，键入会整条删公式
- 链路：`src/App.tsx:996-1004`（Mathematics 的 onClick 交 `mathEditRef`）→ `:5151-5183`（`setMathEdit`）→ `:6442-6451`（渲染 `MathInlineEditor`）→ `src/components/MathInlineEditor.tsx:76-99`（`createPortal` + `position:fixed` 浮层，`onBlur` 即提交）。节点本体：`node_modules/@tiptap/extension-mathematics/dist/index.js:204-208`（`inlineMath` `atom:true`）、`:301-335`（NodeView 只输出 `span`，atom 由 ProseMirror 加 `contenteditable=false`；click 里 `preventDefault/stopPropagation`）。
- 真机：点 `$x^2$` → `.math-inline` fixed 面板 + `INPUT`（`shots/round-90/inlinemath-popup.png`）；atom `contenteditable=false`；`←` 进 atom 后 `.sl-math-reveal`（`src/lib/mathReveal.ts:101`、`src/styles.css:2237-2252`）把 KaTeX 收起、`::after` 出 `"$x^2$"`，再敲 `Q`：atom 1→0、段落只剩 `Q`——不是编辑，是整条删除。
- 对照 Typora：`.md-inline-math` 容器里 `<script type="math/tex">` 存原文，`.md-expand` 时源码进文本层可改（`docs/iteration/round-73/typora-mechanism.md:7,11`）。
- 另：菜单「插入 → 公式」插空 atom 后浮层未留，且 0 宽点不开（复现 1 次，细节 UNVERIFIED）。

## F2（P1，编辑）行间公式是弹窗 TEXTAREA，不是块内「代码 + 公式」
- 块级复用同一浮层：`MathInlineEditor.tsx:82-86`（`display` 时用 `textarea rows=3`）。真机点块级公式得 `.math-inline.is-block`、`position:fixed`、360×169、TEXTAREA 值 `a^2 + b^2 = c^2`、提示「Enter 提交 / Shift+Enter 换行 / Esc 取消」（`shots/round-90/blockmath-popup.png`）。节点是 `div[data-type=block-math] contenteditable=false`（mathematics `index.js:126-162`），DOM 不是可编辑 `pre`。
- 对照 Typora：`mathjax-block.md-rawblock` 在 `.md-expand` 时块内露出 `$$<br/>原文<br/>$$`（`round-73/typora-mechanism.md:8,11`）。
- 验收：块内直接改 TeX + 公式预览，无浮层；保存/往返不变。

## F3（P1，外观）代码块不显示语言、也不能切换（language 本身保真）
- 真机：`pre > code.language-js`，`pre` 只有 1 个子节点 CODE、无 `::before/::after`、无语言标签；`src` 无 codeBlock NodeView，`git grep -n "语言" -- src` 只有 1 条注释（`src/lib/annotations.ts:70`）。Typora 有 `.md-lang` 标签（`.tmp/typora-ref/resources/style/themes/github.css:386`）与 `pre.md-fences[lang=…]`。
- 语言保真：真机源码视图里 `editor.getMarkdown()` 仍是 ` ```js `（value 含 "```js"）；解析/序列化用 `token.lang` / `attrs.language`（`node_modules/@tiptap/extension-code-block/dist/index.js:67-84`）。缺的只是顶部显示与切换 UI。但往返门没覆盖：`fixtures/markdown` 里 ` ``` ` 围栏 0 个（`git grep -c` 无命中），`npm run roundtrip` 不会发现语言丢失。
- 与 B-135（语法高亮，`deferred`）不是同一条：本条只要语言标签/切换，不引依赖。

## F4（P2，代码卫生）`MathDraftPreview` 是死代码
`mathDraft` 只被置 `null` 或原地更新（`src/App.tsx:5231`、`:5327`、`:6438`），`mathDraftRef.current` 在 `:5333` 先 `if (!draft) return`——Typora 式「边打源码边预览」浮层永远不可达。
