# 第 51 轮 界面与可访问性侦察（finder-ui）

窗口 1440x900 / 1024x700 / 900x700，CDP 9226，`node .tmp/reset.mjs 9226` 之后执行。
原始脚本：`.tmp/e2e-r51-ui-probe.mjs`、`-settings.mjs`、`-dialog.mjs`、`-narrow.mjs`、`-contrast.mjs`、`-focus.mjs`、`-modes.mjs`、`-foot.mjs`、`-dark.mjs`。

## 先说结论（本轮实测通过，不是发现）

- 对比度：抽顶栏、工具栏、侧栏页签、正文、状态栏、禁用按钮，浅色 12 处最低 4.83（状态栏字数），深色 10 处最低 6.80（状态栏字数），全部 ≥ 4.5:1。不是问题。
- 窄窗：1440/1280/1024/900 四档宽度下 `document.scrollWidth == clientWidth`，无横向溢出、无按钮文字竖向裁切。
- 焦点：连按 34 次 Tab，除正文编辑器（有自身边框）外每个可聚焦元素都有 outline 或 box-shadow。不是问题。
- 设置对话框：`role=dialog` + `aria-modal=true` + `aria-labelledby=settings-title`；连按 20 次 Tab 未逃出；Esc 关闭并把焦点还给「设置」。不是问题。
- 查找条 7 个按钮实测 `h=24`（第 49 轮修复保持住了）；工具栏按钮 hover 有背景变化（透明 → `rgb(34,48,46)`）。
- 截图：`shots/round-51/ui-dark-1440.png`（深色 1440x900 空状态）、`shots/round-51/ui-settings-clip-1440.png`（浅色设置面板）。

## F1 [P1] 视图模式四个按钮没有 `aria-pressed`，开关状态对读屏不可见

- 位置：`src/App.tsx:4956-4999`（专注 / 打字机 / 源码 / 预览）。
- 现状：只有 `className={focusMode ? 'is-on' : ''}`，没有 `aria-pressed`；同一块工具栏的格式按钮 `src/App.tsx:4911-4949` 都有 `aria-pressed`，侧栏页签有 `aria-selected`。
- 实测（`.tmp/e2e-r51-ui-modes.mjs`）：点「源码」后读四个属性，`ariaPressed=null`、`ariaCurrent=null`、`ariaSelected=null`，只有 class 变 `is-on`、背景变 `rgb(34,48,46)`、文字变 `rgb(156,203,194)`。读屏只得到「源码，按钮」，无法知道已经在源码视图。
- 建议：4 个按钮各补一个 `aria-pressed={...}`（`focusMode` / `typewriterMode` / `sourceMode` / `previewMode`），保留 `is-on` 只管样式。改动 4 行，与第 42 轮格式按钮同一口径。

## F2 [P2] 设置里的主题三选一：声明成 radiogroup，但方向键不生效、三项都进 Tab 序

- 位置：设置面板「主题」（截图 `shots/round-51/ui-settings-clip-1440.png` 顶部三格）。
- 实测：`[role="radiogroup"]` 内 3 个 `role="radio"`，`tabindex` 全为 `null`（都落进 Tab 序）；聚焦「浅色」后按 `ArrowRight`，焦点仍停在「浅色」，`aria-checked` 与 `document[data-theme]` 都没变。
- 影响：能用 Tab + 空格完成选择，不阻塞；但不符合 WAI-ARIA 单选组（roving tabindex + 方向键）惯例。
- 建议：选中项 `tabIndex=0`、其余 `-1`，`onKeyDown` 处理左右方向键；或退回普通按钮 + `aria-pressed`。

## F3 [P2] 两个点击区小于 24×24

- 实测（`.tmp/e2e-r51-ui-probe.mjs`）：斜体按钮 `I` 21×24、状态栏字数入口 `.stats-trigger` 22×24（「0 字」）。同排 `B` 25×24、`S` 24×24、`</>` 39×24 都达标。
- 说明：`B` 与 `I` 圆心距约 25px，24px 间距豁免可能成立，所以只算 P2。要修就把 `I` 与 `.stats-trigger` 的 `min-width` 提到 24px。

## F4 [P2，已有 B-108 的量化补充] 设置面板整框溢出 78px，sticky 页脚压住最后一行

- 实测（`.tmp/e2e-r51-ui-foot.mjs`）：`dialog.scrollHeight - dialog.clientHeight = 78`；`.dialog-actions` 落在 y=823–859，对话框底边 880；页脚下方仍能看见被切掉的正文（截图 `shots/round-51/ui-settings-clip-1440.png` 底部“…”与“能稍”）。
- 结论：不是页脚高度不够，是滚动内容没有留出页脚高度的底部内边距。建议给滚动容器加 `padding-bottom: 36px + 12px`（页脚高 + 间距）。
- 这条对应 BACKLOG `B-108`，不新开条目，只补证据。
