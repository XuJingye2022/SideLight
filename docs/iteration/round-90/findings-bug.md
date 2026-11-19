# 第 90 轮 finder-bug 发现（只读侦察）

- 环境：dev `http://localhost:5175`；ego 浏览器 CDP **57270**（54280/9222–9226 无监听）；viewport 1440×900。
- 用户焦点三条都复现了。代码块 info string 往返**正常**（不是缺陷）；公式两条是「浮层代替就地编辑」的实现缺口。
- 证据：`.tmp/r90-finder-bug.json`（行内/行间点击与方向键）、`.tmp/r90-finder-bug2.json`（行间键盘 + 代码块往返）、`shots/round-90/finder-math-block-popup.png`。脚本 `.tmp/e2e-r90-finder-bug{,2}.mjs`，假工作区 `r51-fsa.mjs`；0 pageerror / 0 console error。

## F1（P1）行内公式无法就地编辑：点它只能开浮层，`$…$` 是伪元素不可编辑

- 复现：打开含 `行内公式 $x^2$ 放在句子里。` 的文档 → 点公式。
- 实际：弹出 `.math-inline` 浮层（`input` 尺寸 360×117 @496,196），atom `span[data-type=inline-math]` 为 `contenteditable="false"`、内部可编辑子节点 0。方向键从段落起点连按 14 次：第 6 次得到 `ProseMirror-selectednode`（`.sl-math-reveal` 1，屏幕显示 `$x^2$`），第 7 次就离开（`selectedNode` null）。露出的 `$…$` 来自 `styles.css:2237` 的 `::after { content: attr(data-latex) }`，`mathReveal.ts:101` 只挂 `Decoration.node` —— 是画出来的，没有文本光标，不能改字。
- 期望（Typora）：光标进入即把 `$…$` 变可编辑文本，Enter/失焦回渲染。实际只能整条替换或开浮层。
- 建议：公式改 NodeView，选中时把 atom 换成可编辑文本，提交再重建。
- 附：`mathDraft` 从未被置非 null（`App.tsx:5231`、`:5327` 只有 null 与函数式更新），`MathDraftPreview` 是死路径。

## F2（P1）行间公式无法块内编辑：点它弹出 textarea 浮层

- 复现：文档含 `$$\na+b\n$$` → 点块。
- 实际：弹出 `.math-inline.is-block`，`textarea` 面板 360×169 @397,249；块自身 `div[data-type=block-math]` 576×29 在 @397,253，`contenteditable="false"`，块内 `input,textarea` 0 个。键盘：从「前段。」按 ↓，第 1 次得 `block-math` 的 NodeSelection（`.sl-math-reveal` 1），第 2 次即离开；全过程选区从未落在公式节点内部（`selectionInsideMath` 全 false）。
- 期望（Typora）：`$$` 围栏像代码块一样就地显示 TeX + 公式预览，光标在块内直接改。
- 建议：块级公式自己提供 NodeView：外层是 `contenteditable` 的 TeX 区 + 下方 KaTeX 预览（不 portal、不 `position:fixed`），Enter/失焦重排。
- 现有出口在 `App.tsx:996-1004`（`Mathematics` 的 `inlineOptions/blockOptions.onClick` → `mathEditRef`）与 `App.tsx:5174` 的 `setMathEdit`；浮层渲染在 `App.tsx:6442`，容器是 `MathInlineEditor.tsx:76-98` 的 `position:fixed` portal。

## F3（P2）代码块不显示语言标签、无切换入口；但 info string 往返正常

- 实际：载入 ```` ```js ```` 后 DOM 是 `<pre><code class="language-js">`，只有 1 个子节点；`pre::before/::after` 的 `content` 都是 `none`，块内文字只有 `const a = 1`；`code` 里 `span` 0 个（无高亮，同 B-135）。无任何语言按钮/浮条（`App.tsx` 与 `styles.css` 无此 UI；`styles.css:796` 只有 `pre` 排版）。
- 往返正常（不是缺陷）：源码视图与 `Ctrl+S` 落盘都是 ```` ```js ````；手打 ```` ```py ```` 后新块 `language-py`，保存写回 ```` ```py ````，重开文档 `language-js`/`language-py` 都在（`@tiptap/extension-code-block` 的 `renderMarkdown` 带 language，`dist/index.js:67-79`）。
- 建议：`codeBlock` 加 NodeView，块顶显示 `language`（空则「纯文本」），点击选择改 `attrs.language`；高亮按 B-135（惰性 chunk，`docs/typora-gap.md:60` 是 P1）。

## 结论

- 新发现可执行 P1：2 条（F1、F2）。F3 归 P2（deferred）；「```js 保存/往返」检查结果 = 通过，不需要修。
- 未验：真实中文 IME 下的浮层提交、宿主 WebView2 内同样路径、原生打印。
