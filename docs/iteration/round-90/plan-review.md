# 第 90 轮计划复审（critic，revision 1）

结论：**REVISE**。上轮 P1-1～P1-5、P2-6 已落实（P1-1 改回 KaTeX 直接子节点 + (0,4,1) 压制且插在 2246 后；P1-2/3 有 `view.focus()`、注册表与 `isNew`；P1-4 用 `pos+1`/`posAtDOM(pre,0)`；P1-5 写明 ego 端口；P2-6 的脚本行号 402/415 正确）。未发现旧问题回退；新发现 4 个 P1、2 个 P2。

## N1（P1）B1 的 CSS 删除范围会打掉链接编辑器与快速打开

`styles.css:2979-3060` 不是纯 `math-inline` 块：2979-2980 是 `.quick-open-list button` 的尾声明与 `}`，2982 是 `.quick-open-list button.is-active`，2986-2987 是 `.link-editor, .math-inline` 合组，3001-3008 是 `.link-editor-label`，3010/3022/3033/3041 是四组合并选择器。整段删会破坏链接编辑器与快速打开高亮，并留下未闭合规则。
**修**：只删公式专属选择器；共享组里摘掉 `.math-inline*` 那一行、保留 `.link-editor*`；随 `MathDraftPreview` 一并删 3111 的 `.math-draft-preview`。

## N2（P1）Esc 从输入框冒泡到 App 的 window 链，焦点被挪走

`App.tsx:4313` 的 Escape 分支在 activeElement 位于 `.ProseMirror` 时把焦点移到 `.status-bar .stats-trigger`（`:4384-4393`）。NodeView 的 `stopEvent` 只挡 ProseMirror，不挡 window；旧 `MathInlineEditor.tsx:56-62` 正为此 `stopPropagation`。
**修**：input/textarea 的 keydown 对 Esc（块级含 Ctrl+Enter）`preventDefault + stopPropagation`；E2E 断言 Esc 后 activeElement 不是 `.stats-trigger`。

## N3（P1）B1 的 ↑/↓ 进块缺实现钩子

PM 的方向键把 block atom 选成 NodeSelection 时，keydown 到不了 NodeView；计划没写 `selectNode()`，故「↑/↓ 进块即 textarea」不可达，验收要的「非 ProseMirror-selectednode」也只有用 spec.selectNode（覆盖默认加类）才成立。
**修**：`selectNode()` 里进编辑并 focus textarea；提交/取消加幂等 guard（Enter 触发提交后 blur 会再触发一次，第二次用旧 pos 会改错节点）。

## N4（P1）B2 的 chip 同 key 复用旧 DOM，语言标签不刷新

prosemirror-view 的 `WidgetType.eq` 只比 `spec.key`（dist:4041-4045），`placeWidget` 对同 key 复用旧 DOM（:1994-1999；AGENTS 第 8 节 mermaid key 同类坑）。计划 key 未写语言，`js→ts` 后 chip 仍是 `js`，验收必红。
**修**：key 写 `sl-code-lang@${pos}:${language ?? 'plain'}`，语言变即新 widget。

## N5（P2）失焦提交不应 setSelection + view.focus()

计划让 Enter 与失焦都走 `setSelection(mathInputSelection(doc,pos))` + `view.focus()`。点别处结束编辑时，blur 里的 setSelection 会盖掉点击处的选区（光标跳回公式后）。
**修**：键盘提交/取消才移选区 + focus；失焦只 `setNodeMarkup`；加「编辑中点击下一段，光标落在点击处」的 E2E。

## N6（P2）新测试没进 package.json 的 test 列表

`npm test` 是显式列表（`scripts.test` 末条 `keybindings.test.ts`），不追加 `mathNodeView.test.ts` 就永不运行、724 条不变；B2 还没有单测。
**修**：两轮各把新测试追加到 `scripts.test`；B2 给语言表/标签/infostring 判定补一条纯函数测试。

体量：首屏 309,074 B，余 926 B；A 轮新增 NodeView 后先量再写 A2，超 310,000 时需给出裁剪清单（计划暂缺）。
