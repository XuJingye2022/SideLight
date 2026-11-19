# 第 91 轮执行报告（executor · B 轮）

B1 行间公式块内编辑、B2 代码块语言标签：两条 **DONE**。
环境：CDP 54280/9222–9226 无监听，真机走 ego 浏览器（`ego_doctor` port **57270**，tester 可用 `SIDELIGHT_TARGET=8051FAFC5414765DCFE3D1DB8827D217`）。
**计划缺口**：执行时 `round-91/` 只有 `findings-delta.md`，无 plan/plan-review；按主代理提示的 B1/B2 验收实现，无计划外重构。

## 交付

- **B1**：`src/lib/mathNodeView.ts` 改为行内/块级共用编辑器，新增 `SidelightBlockMath`（`wrapper > .block-math-inner` 结构不变）；编辑态 = `.sl-math-block-edit`（`textarea.sl-math-block-input` + `.sl-math-block-preview` 实时 KaTeX）。点公式、`↑/↓` 成 NodeSelection、`$$`+Enter、工具栏 / `Ctrl+Shift+M` 都进块内；`Ctrl+S` 先落库再保存；失焦提交并把选区移出 atom；Esc 还原（新建空块删除）；首行 ↑ / 末行 ↓ 移出块。`App.tsx` 删浮层状态与渲染（`mathEdit`/`finishMathEdit` 等），插入入口走 `enterMathAtRef`；删 `components/MathInlineEditor.tsx`；`styles.css` 删 `.math-inline*`、加块内规则。
- **B2**：新 `src/lib/codeBlockLang.ts` 的 `SidelightCodeBlock`（`CodeBlock.extend`）：`pre` 内右上 `.sl-code-lang-wrap`（`.sl-code-lang` 标签 + 透明原生 `.sl-code-lang-select`）。`StarterKit.configure({codeBlock:false})`；`setNodeMarkup` 只改该围栏 `language`，不重解析；无语言标签「纯文本」。`styles.css` 的 `pre{position:relative}` + 4 条 chip 规则；`package.json` 补 `@tiptap/extension-code-block`（无新增字节）。

## 门禁

- `npx tsc --noEmit` 0 错；`npm test` exit 0（**55 文件 727 条**，与上轮同）；`npm run roundtrip` exit 0（rich 7/9、source 9/9、`07-math.md` ok）；`npm run verify` PASS，首屏 gzip **309,804 B**（改前 309,470，+334；内部预算 310,000，余 196）。日志：`.tmp/r91-exec-{tsc,test,roundtrip,verify}.log`。

## 真机 E2E（ego 浏览器 CDP 57270）

- `.tmp/e2e-r91-exec.mjs` **18/18 PASS**（`.tmp/r91-exec-e2e.log`）：块内输入框聚焦/值 `E=mc^2`/实时预览/无浮层；改 `a^2+b^2` 预览更新；Esc 还原且 `sl-parse-done` 4→4；`↑` 进块、首行 ↑/末行 ↓ 选区出块（reveal 0）；`Ctrl+S` 磁盘 `$$\nE=mc^3\n$$` 且 diff 只 `E=mc^2→E=mc^3` 一行；`$$`+Enter 进块、Esc 空块 0；重开 latex 仍 `E=mc^3`、KaTeX 成品。chip 3 个（js/mermaid/纯文本）、在 pre 内上右且底边不高于首行文字；改上方文字后 js→ts 只改 `` ```js→```ts `` 一行、`sl-parse-done` 5→5；无语言→python 写 `` ```python ``；`` ```js `` 打开→另存为逐字节不变。
- `.tmp/e2e-r91-inline-regress.mjs` **7/7 PASS**（`.tmp/r91-exec-inline.log`）：第 90 轮行内就地编辑、`Ctrl+M`、`Ctrl+Shift+M`、空块 Esc 未回归。
- 截图：`shots/round-91/b1-block-math-edit.png`（块内 textarea + 实时预览）、`shots/round-91/b2-code-lang-chip.png`（ts/mermaid/python 三 chip）。

## 新踩坑

1. 块级 `enter(isNew)` 可能先被 `selectionUpdate` 的 NodeSelection 调成 `enter(false)`，`onBlockCreated` 再调时已在编辑态：必须把 `isNew` 提升，否则 Esc 删不掉空块。
2. chip 用透明原生 `<select>` 盖标签最省代码：PM 的 mousedown/keydown 由 NodeView `stopEvent` 挡掉，不要 `preventDefault`（下拉打不开）；`<select>.textContent` 是全部选项，断言要用 `.sl-code-lang` 文本。
3. 打开文件后 `Ctrl+S` 写回**打开时句柄**（不调 `showSaveFilePicker`），只有「另存为」走 picker；行内 atom 的 `locator.click()` 被 `<p>` 拦截，按坐标 `mouse.click`。

## 已知未修

`scripts/diag-math-typing.mjs`、`scripts/qa18.mjs` 仍用已删除的 `.math-inline*`（旧浮层脚本，不在门禁）。

## CHANGELOG 建议

`- 公式改为就地编辑：行间公式块内改 TeX + 实时预览（删浮层），行内 `$…$` 光标进入即改；代码块右上角显示语言并可切换（`` ```js `` 往返逐字节不变）。`
