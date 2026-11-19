# 第 90 轮两轮计划（revision 1）
按 plan-review 修入 P1-1～P1-5、P2-6；结构与任务范围不变。

## 共同约束
- 首屏 309,074 B：A1 记增量、A2/B1 记删除量，每轮末 ≤310,000。门禁均 verify/test/roundtrip。
- `katex` 用 alias `src/lib/katexLazy.ts`（`vite.config.ts:11`）的 `render`；首屏 0 B；不加依赖、不改序列化。
- 契约：外层 `.tiptap-mathematics-render`+`data-type`/`data-latex`、块级 `.block-math-inner`；非编辑态 KaTeX 是直接子节点；新选择器避开 `sl-math-reveal`/`sl-eq-delim` 与单引号 `[data-type='block-math']`（`styles.css:2249-2251`、`mathStyle.test.ts:45-53,114-134`）。
- E2E：9222–9226 不可用；ego 工具（`ego_tabs` 取端口、`ego_script`/`ego_screenshot`）；不用 `reset.mjs`；磁盘用假 FSA 或 `getMarkdown()`；端口/UNVERIFIED 记报告。

## A 轮（行内公式｜用户 #1）

### A1 行内公式就地编辑（P1）
文件：新 `src/lib/mathNodeView.ts`、`App.tsx:991-1004,1126-1140`、`styles.css:2252` 后；`Mathematics` 只是包装（`…/dist/index.js:384-401`），拆 `InlineMath.extend({addNodeView})`+`BlockMath.configure({onClick})`。
- NodeView/桥：`span[data-type="inline-math"][data-latex]`，KaTeX 直接子节点；`.sl-math-inline-edit`＝`$`+`<input class="sl-math-inline-input">`+`$`；`stopEvent` 含 input；`WeakMap<HTMLElement,{enter,isNew}>` 登记，`enterMathEdit(view,pos,{isNew})` 用 `view.nodeDOM(pos)` 查表。
- 进出：mousedown 非 input 才 `preventDefault+stopPropagation`；`focus()` 落尾、外层 `.is-editing`；Enter/失焦 `setNodeMarkup`+`setSelection(mathInputSelection(doc,pos))`（`mathInput.ts:42`）→ `view.focus()`；Esc `closeMathEditTransaction`（`:66`）按 `isNew` 还原/删并 `focus()`；←首/→尾先提交再 `TextSelection.near` 移出 atom。
- CSS（P1-1，插 `:2252` 后，前缀 `.doc-body .tiptap-mathematics-render`）：`.is-editing > .katex, … > .block-math-inner{display:none}`；`.is-editing[data-type="inline-math"]::after, …[data-type="block-math"]::after{content:none}`（(0,4,1) 在 `:2237`/`:2245` 后）；删 `App.tsx:1126-1140` math 分支。
- 验收 `.tmp/e2e-r90-a1-inline-edit.mjs`：点 `$\alpha$` → input 1 且 `activeElement`=input、`.math-inline` 0、`.katex` none、`::after` content==='none'、文本首尾 `$`；`^2`+Enter → `.katex` 1、`activeElement` 在 `.ProseMirror`；Esc 还原且 `sl-parse-done` 不增；`Ctrl+S` 只改公式文本、重开无露出。

### A2 插入入口改走新编辑 + 删死代码
文件：`App.tsx:5186-5222,533-549,5224-5379,6438-6440,998`；删 `components/MathDraftPreview.tsx`；改 `scripts/keyboard-acceptance.mjs:402,415`。
- `openMathAtCursorRef`（`:5188`）：已有公式 `{isNew:false}`；否则插空 atom 找回 pos → `{isNew:true}`；入口工具栏「公式」`:5676`、`Ctrl+M`（`Ctrl+Shift+M` 块级，B1 前仍浮层）。
- 删 `mathDraft` 状态/effect/渲染（只赋 null）与 `inlineOptions.onClick`（`:998`）；脚本改 `.sl-math-inline-input`+URL/CDP 传参。
- 验收 `.tmp/e2e-r90-a2-insert.mjs`：点「公式」→ input 1 聚焦；`x`+Enter → atom 1、`Ctrl+Z` 回 0；Esc 删空 atom（B-157）；三条入口各一遍；verify 增量 ≤A1；`mathNodeView.test.ts` 3 条单测。

## B 轮（行间公式 + 代码块语言）
delta：A 轮 E2E + 单测 + `keyboard-acceptance.mjs`（ego 端口；连不上记 UNVERIFIED）；红先修。

### B1 行间公式块内编辑（P1｜用户 #2）
文件：`src/lib/mathNodeView.ts`（+块级）、`App.tsx:996-1034,5151-5184,5387-5412,6442-6451`；删 `components/MathInlineEditor.tsx`、`styles.css:2979-3060`；`lib/mathInput.ts:143-203`。
- 块级：`div[data-type="block-math"][data-latex]`；非编辑 `.block-math-inner`（KaTeX 直接层）；编辑 `.sl-math-block-edit`＝`$$`+`<textarea class="sl-math-block-input">`+`$$`+`.sl-math-block-preview`（实时 KaTeX），无浮层；`stopEvent` 含 textarea。
- 进出：点击/`↑`/`↓` 即进，`focus()` 落尾、`scrollHeight` 定高；点击非 textarea 才 preventDefault；`Ctrl/Cmd+Enter`/失焦提交，Esc 取消；首行 ↑/末行 ↓ 先提交再 `focus()` 移出块（同 A1）。
- 提交：`setNodeMarkup`+`mathInputSelection`（落块外）+`view.focus()`；`$$`+Enter 经 `onBlockCreated`→`{isNew:true}`，Esc 读注册表删空块；删 `mathEdit`/`mathEditRef`/`finishMathEdit`/`applyMath`/`MathInlineEditor`/`.math-inline*`。
- 验收 `.tmp/e2e-r90-b1-block-edit.mjs`：点行间公式 → `.math-inline*` 0、`.sl-math-block-input` 1 且聚焦、值 `E=mc^2`、预览 `.katex` 1；改 `E=mc^3`+`Ctrl+S` 磁盘 `$$\nE=mc^3\n$$` 只换公式；Esc 还原且 `sl-parse-done` 不增；`↑`/`↓` 进块即 textarea（非 `ProseMirror-selectednode`）；首行 ↑/末行 ↓ 后选区在块外；`$$`+Enter→Esc 空块 0；多行往返同构。

### B2 代码块语言标签与切换（P1｜用户 #3）
文件：新 `src/lib/codeBlockLang.ts`；`styles.css:804` 后；`App.tsx` 扩展表。
- 装饰：语言表 12 项+「纯文本」(`null`)，表外值补一项；`Decoration.node(…{class:'sl-code-fence'})`；`Decoration.widget(pos+1, chip, {side:-1,ignoreSelection:true,key})`（`pos+1` 进 `pre>code`）；重建照 `mathReveal.ts:116-137`。
- CSS：`.doc-body pre.sl-code-fence{position:relative;padding-top:34px}`；chip `.sl-code-lang` 绝对上右、`contenteditable=false`；mousedown 只 `stopPropagation`、keydown 挡；`change` 用 `view.posAtDOM(pre,0)`，不用闭包 pos。
- 验收 `.tmp/e2e-r90-b2-code-lang.mjs`：`getMarkdown()` 先验 ` ```js ` 往返（renderMarkdown 写 infostring）；三围栏（js/mermaid/无）→ `.sl-code-lang` 3、文本 `js`/`mermaid`/`纯文本`；chip 在 pre 内上右且 `chip.bottom<=首行文字top+1`；先改上方文字再 `js`→`ts`：chip 即 `ts`、`sl-parse-done` 不增、`Ctrl+S` 只该围栏首行 ` ```ts `；无语言→`python`；` ```js ` 开→存逐字节不变。
