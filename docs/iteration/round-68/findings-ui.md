# 第 68 轮 UI 与可访问性侦察（finder-ui）

结论：**1 条新 P1**（actionable_count 1 / p0p1_count 1）。1 条 P2 入池 deferred（B-147）。
原始数据：`.tmp/r68-ui-finder.json`、`.tmp/r68-ui-finder3.json`；脚本 `.tmp/e2e-r68-ui-finder2.mjs`、`.tmp/e2e-r68-ui-finder3.mjs`；
截图 `shots/round-68/quickopen-focus-behind.png`。0 控制台错误。

## F1（P1，open → B-146）快速打开（Ctrl+P）：焦点逃到遮罩之后，Esc 关不掉

1440×900 真按键复现：

1. `Ctrl+P` 打开，焦点在 `.quick-open-input`；此时按 Esc 能关（`escInInputCloses: true`）。
2. 按 1 次 Tab：焦点到列表第一条 `button.is-active`。再按 Esc：面板仍在（`stillOpenAfterTabEsc: true`），焦点不动。
3. 连按 Tab：第 2 次到 `BODY`，第 3 次到 `A.skip-link`，之后是 `文件 ▾`、`分析本段（模拟）`、`导出 ▾`，全部在
   `.quick-open-backdrop`（z-index 60，rect 0,0,1440×900）之后；焦点控件中心 `elementFromPoint` 返回
   `DIV.quick-open-backdrop`（`r68-ui-finder3.json` 的 `topElAtFocusedCenter`）。再按 3 次 Esc 仍不关
   （`stillOpenAfterEsc: true`），只有鼠标点遮罩才关。

根因：

- Esc 只挂在输入框：`src/components/QuickOpen.tsx:64-78`；列表按钮与提示行没有入口。
- 窗口级 Esc 链没有 quickOpen 分支：`src/App.tsx:4034-4108`；`dialogOpen` 也不含它（`src/App.tsx:4020-4021`），
  焦点在背后时 Esc 落到「无匹配 → return」。
- 没有焦点困锁 / inert / `aria-modal`：`QuickOpen.tsx:49-56` 只有 `role="dialog"`；探针 `.app` 的 `inert` 为 `false`、
  `.quick-open` 的 `aria-modal` 为 `null`。同仓的 `useDialogFocus` 已有 8 处调用（6 个对话框组件 + App 内 2 个，
  `src/components/useDialogFocus.ts` 提供 Tab 循环 + 兄弟节点 inert），本组件没用。

影响：键盘用户开 Ctrl+P 后按一次 Tab 就没有 Esc 出口（面板自己的提示写着「Esc 关闭」，`QuickOpen.tsx:99`）。
焦点继续进入遮罩下的工具条，Enter 会盲触发「分析本段」「导出」等动作。属 WCAG 2.1.2（键盘可退出）失败。

修法：`QuickOpen` 改用 `useDialogFocus(true, dialogRef)`；`App.tsx` 的 Esc 链与 `dialogOpen` 加 `quickOpen`。

## F2（P2，deferred → B-147）快速打开输入框没有焦点指示

`.quick-open-input` 只写 `outline: none`（`src/styles.css:2706-2715`），没有 `:focus` 替代样式。实测聚焦时
`outlineStyle: 'none'`、`boxShadow: 'none'`、`borderColor` 仍 `rgb(228, 223, 212)`，而 `matches(':focus-visible')` 为 `true`
（不是「非键盘聚焦」误判）。对照 `.link-editor-input:focus` 有边框色 + 光晕（`:2779-2783`）。WCAG 2.4.7。

## 本轮已验无问题（不计数）

- 1024×700：`scrollWidth-clientWidth = 0`；状态栏 0–1024、侧栏 0–218、编辑区 238–1004；查找条 y 84–163 与工具条 46–84 不重叠。
- 设置对话框：连按 22 次 Tab，22/22 留在 `.overlay` 内；关闭后焦点回「设置」按钮。
- 整页缩放 200%（`--page-zoom: 2`）：`.quick-open-backdrop` 仍 0,0,1440×900，左上/右下/中心都命中遮罩或对话框；
  `Ctrl+Shift+0` 回 1。第 67 轮新遮罩 `.source-applying` 用同一 `position: fixed; inset: 0` 写法（`src/styles.css:1834-1843`），
  几何不会漏盖；其文字对比度（同源 CSS 注入量）strong 16.1 / 13.28 / 11.83、说明 6.67 / 7.29 / 5.79（light/dark/sepia），均过 AA。
- 空状态、设置、查找、表格条、字数面板、批注卡、大纲、Mermaid 本轮未重测；第 66 轮同批 0 P0/P1（`.tmp/r66-ui-audit*.json`）。
