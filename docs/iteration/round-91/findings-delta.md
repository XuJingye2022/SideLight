# 第 91 轮轮间回归检查（finder-delta）

- 轮前 sha `e9383d6`（= HEAD，工作树干净）；dev `http://localhost:5175` HTTP 200（未重启）；CDP 9222–9226 无监听，真机走 ego 浏览器。
- 范围只取上一轮提交的 diff：`src/App.tsx`（公式点击/插入链）、新 `src/lib/mathNodeView.ts`、删 `MathDraftPreview.tsx`、`src/styles.css`（+40 行）、`scripts/keyboard-acceptance.mjs`。
- 证据：读 diff + ego 脚本 `.tmp/e2e-r91-finder-delta.mjs`，日志 `.tmp/r91-finder-delta.log`。

## 结论：无新回归（P0 0 / P1 0）

13 条断言全 PASS、`window` error 0：

1. 块级（鼠标面）：Ctrl+Shift+M 出浮层 `is-block`+textarea 聚焦；Enter 提交 atom+1/浮层 0/reveal 0/无 selectednode；点公式仍出浮层；Esc 后浮层 0、reveal 0、selectednode 无、成品可见、latex 不变、焦点未跑到 `.stats-trigger`。
2. 行内（撤销面）：点公式进就地编辑（输入框聚焦、无浮层、无 reveal）；Enter 提交 `\beta^2`；Ctrl+Z 回 `\beta`、KaTeX inline、输入框 0、reveal 0。
3. 行内（焦点/保存面）：失焦提交 `\beta+1`、焦点留点击处正文、Ctrl+Z 可撤销；光标在 atom 上按 Ctrl+M 进就地编辑，Esc 还原不改 latex、reveal 0。

## 观察（非本轮新增，不计条数）

- 块级浮层打开期间 `selectedNode=block-math`+`reveal=1`（背后露 `$$…$$`），Esc 后归 0；第 73 轮已有的选区装饰（`handleClick` 只挡 click 默认动作，mousedown 选区照旧），非第 90 轮引入。
- 静态：`src` 内 `mathDraft|MathDraftPreview` 0 命中；`.math-inline-input` 只剩块级浮层（`MathInlineEditor.tsx:66`），删死代码无残留。

## 未做

未复跑 `npm test` / `verify`（tester 职责）；未验真实 IME 与 WebView2 宿主。
