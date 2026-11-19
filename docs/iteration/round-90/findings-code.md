# 第 90 轮 finder-code 发现

只读。真机走 ego 浏览器现场页 `http://localhost:5175`。基线：`tsc --noEmit` 退出 0；`npm test` 退出 0。
**环境**：`connectOverCDP('http://127.0.0.1:54280')` 实测 ECONNREFUSED（`.tmp/e2e-r90-finder-math.mjs` L37），`Get-NetTCPConnection` 对 5173/5175/9222–9226/54280 全无监听（HTTP 5175 仍返 200）；浏览器断言只能在 ego_* 工具里做，Playwright 连不上。

## F1（P1）行内公式不能就地编辑，`$…$` 是伪元素，一打字整条公式被替换

- 点公式必弹浮层：`.math-inline` + `INPUT.math-inline-input`（值 `x^2`），见 `src/components/MathInlineEditor.tsx:76-98`（`createPortal`+`fixed`）。atom `contenteditable="false"`；源码只在 `atom::after` 的 content（`"$x^2$"`，`src/lib/mathReveal.ts:92-103` 只给节点挂类，样式 `src/styles.css:2230-2255`）；文档里无可编辑 `$…$` 文本（`docHasDollarText:false`）。
- 键盘也不行：`→`×3+`Shift+→` 后 `.sl-math-reveal`=1、`.katex` display=`none`，但 `getSelection()` 为空、atom 仍 `contenteditable=false`；**再打 `Z`，`inlineMath` 1→0**，段落变「行内 Z 结束。」——像可改，实际整条替换（只能撤销）。唯一编辑入口是 `src/App.tsx:5147-5184` 的 `mathEditRef`→`setMathEdit`。

## F2（P1）行间公式只能浮层 textarea，块内零可编辑节点，浮层盖住公式

- block atom `contenteditable="false"`；块内 `contenteditable=true`/`INPUT`/`TEXTAREA`/`BUTTON` 计数 **0**、可聚焦 **0**（依赖 `@tiptap/extension-mathematics/dist/index.js:126-162`）。
- 点块 → `.math-inline.is-block` + `TEXTAREA`（值 `\sum_{i=1}^{n} i`）；`popupRect{top:249,bottom:444,h:195}` vs `blockRect{top:253,bottom:312}` → 浮层盖住公式（`popupCoversBlock:true`）。
- 块内无围栏头、无「TeX 原文+公式预览」两段，与验收的 Typora「代码块+公式显示」不符（`docs/iteration/round-73/typora-mechanism.md:7-11`：块级 `md-rawblock`，`cursorChange` 加 `.md-expand`、失焦清除）。往返正常：源码视图（保存同走 `getMarkdown()`，`src/lib/serializeDocument.ts`）输出 `$$\n\sum_{i=1}^{n} i\n$$` 与载入一致。

## F3（P1）代码块不显示语言、无切换入口（语言数据往返正常）

- DOM 仅 `<pre><code class="language-js">`：可见 `js` 字面量 0、控件 0、`pre` 无 `data-language`/`lang`；语义树只有 `const a = 1`。
- 数据没丢：源码视图保留 ` ```js ` 与裸围栏；手打 ` ```py `+Enter 造 `language-py` 并写回 ` ```py `。缺的是「顶部显示+可切」。与 `docs/typora-gap.md:60` 的语言高亮（B-135 deferred）不是一条。
- 实现只需读现有 `language` attr（`@tiptap/extension-code-block/dist/index.js:37-45,67-79`）：零依赖、零首屏增量。

## F4（P2，不计 P0/P1）`mathDraft`/`MathDraftPreview` 死代码

`setMathDraft` 只写 `null` 或保留 current（`src/App.tsx:5231`、`:5327`），`mathDraft` 恒 null，`:6438-6440` 的 `<MathDraftPreview>` 从不渲染。

## 建议

1. 行内：光标进入即换同位置可编辑 `$` 文本，Enter/失焦提交回 `inlineMath`，存储形态不变。
2. 行间：块内两段式（`math` 围栏头 + TeX 编辑区 + 下方 `.katex-display`），Esc/失焦回渲染，序列化仍 `$$…$$`。
3. 代码块：NodeView 顶部语言标签可切（空=纯文本），写回 `language`；不做高亮。
4. 回归：`mathReveal`（同选区零重建）、`mathInput`（输入规则落点）、`mathStyle`（print 恢复）、`roundtrip`（```js/裸围栏）。

## 证据

- 探测脚本（54280 不可连、未跑成）：`.tmp/e2e-r90-finder-math.mjs`；实测值见正文，本轮无截图。
- 代码：`src/components/MathInlineEditor.tsx:76-98`、`src/App.tsx:5147-5184`/`:5387-5412`、`src/lib/mathReveal.ts:92-103`、`src/styles.css:2230-2255`。
