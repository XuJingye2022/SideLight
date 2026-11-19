# 第 90 轮执行报告（executor · A 轮）

A1 行内公式就地编辑、A2 插入入口 + 删死代码：两条 **DONE**。
环境：dev `http://localhost:5175`；CDP 9222–9226 无监听、Playwright `connectOverCDP` 连不上，真机断言走 ego 浏览器。

## 交付

- A1 DONE：新 `src/lib/mathNodeView.ts`；`App.tsx` 扩展表/点击链；`styles.css:2253` 后 6 条规则。
- A2 DONE：`openMathAtCursorRef` 行内走 `enterMathEdit`；删 `mathDraft` 状态/监听/渲染与 `MathDraftPreview.tsx`；`keyboard-acceptance.mjs:402,415` 选择器；`mathNodeView.test.ts` 3 条 + test 列表。

## 实现要点

- `inlineMath` 换 NodeView：非编辑态仍是 `span[data-type="inline-math"][data-latex]` + KaTeX 直接子节点（`mathReveal`/打印规则不动）；编辑态 `.is-editing` 收起 KaTeX，`.sl-math-inline-edit` = `$` + `<input class="sl-math-inline-input">` + `$`。
- 注册表 `WeakMap<DOM, {enter}>` + `enterMathEdit(view, pos, {isNew})`：入口用 `view.nodeDOM(pos)` 找 NodeView；越界/陌生 DOM 返回 false。
- 出口：Enter / Ctrl+S（先落库再保存）、失焦（只 `setNodeMarkup`，不夺点击处选区）、Esc（还原；`isNew` 空 atom 删除，B-157）、←首/→尾先提交再移出。
- 撤销：`isNew` 的提交事务 `setTime(进入编辑时间)` 与插入事务同组，Ctrl+Z 一次撤回整条公式。
- `Mathematics.configure` 拆成 `SidelightInlineMath` + `BlockMath.configure({onClick})`；`editorProps.handleClick` 删公式分支。
- 行内插入不 `chain().focus()`：Tiptap focus 在正文无焦点时会 rAF 再抢焦点，把刚打开的输入框 blur 掉。

## 门禁

- `npx tsc --noEmit`：0 错。
- `npm run verify`：PASS；首屏 gzip **309,470 B**（改前 309,074，+396 B；目标 310,000，余 530）。
- `npm test`：exit 0，**55 文件 727 条**（+3 条；`.tmp/r90-test.log`）。
- `npm run roundtrip`：rich 7/9、source 9/9；`07-math.md` ok。

## E2E（ego_script 实跑）

- `.tmp/e2e-r90-a1-inline-edit.mjs` **9/9 PASS**：点公式 → 输入框 1 且 activeElement=input、`.math-inline` 0、KaTeX `display:none`、`::after` content `none`、编辑文本 `$$`；`^2`+Enter → latex `\alpha^2`、KaTeX 1、焦点回 `.ProseMirror`；Esc 还原、`sl-parse-done` 2→2、焦点非 `.stats-trigger`；失焦提交 `\alpha^2+1` 且光标落点击处；停笔草稿含 `$\alpha^2+1$`；提交后 `sl-math-reveal` 0。
- `.tmp/e2e-r90-a2-insert.mjs` **6/6 PASS**：工具栏「公式」与 Ctrl+M 均出就地输入框并聚焦、无浮层；`x`+Enter 后 latex `x`；Ctrl+Z 后 atom 回插入前数量；Esc 删空 atom；Ctrl+Shift+M 仍出块级浮层（B1 前旧交互）。
- Ctrl+S 只改公式文本（假 FSA）：打开 `math-test.md`，`$x^2$`→`$x^2+1$` 后 Ctrl+S，读回字节只该处变；重载后 `sl-math-reveal` 0、KaTeX 显示、latex 保持。
- 截图：`shots/round-90/a1-inline-edit.png`。

## 新踩坑

1. Tiptap `focus()` 命令在正文无焦点时会 rAF 再调 `view.focus()`：工具栏入口打开的 NodeView 输入框会被 blur、空 atom 按取消删掉。行内插入不要 `focus()`，块级仍要。
2. PM 对 leaf 的 `setNodeMarkup` 是 ReplaceStep，撤销只回到「空 atom」。新公式要一次撤回，提交事务 `setTime(进入编辑时间)` 与插入事务合并历史组（组判据 = 500 ms + 相邻）。
3. ego 页面门面 `goto('http://[::1]:5175/')` 实际仍停在 localhost（origin 不变）；localStorage 注入草稿会被「恢复上次会话」盖掉 → E2E 不注入夹具，用 Ctrl+M 现场造公式；CSS 属性选择器里 `\alpha` 要写 `\\alpha`（脚本改用 `.last()`）。

## CHANGELOG 建议

`- 行内公式改为就地编辑：点公式即出 $…$ 输入框，Enter/失焦回渲染，Esc 取消；「插入 → 公式」与 Ctrl+M 同一条路径，不再弹浮层。`

## 未验

- 块级公式仍是浮层（B1）；真实中文 IME 组合输入、拖拽跨公式选字未跑。
- Playwright 版 E2E 不可运行（9222–9226 无监听）；上述脚本是 ego heredoc 版。
