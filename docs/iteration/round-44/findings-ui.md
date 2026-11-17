# 第 44 轮 界面美观与可访问性 侦察报告（finder-ui）

- 轮次：44；轮前 `startSha=d22807f4361a32d06a49f6645d610511f3ce7bb7`（本轮 `git rev-parse HEAD` 一致；产品代码只读，`git status` 只有未跟踪的 `shots/round-44/` 与 `.tmp/`）
- 环境：dev server `http://localhost:5175`（未另起、未重启）、CDP **9226**（每个脚本前跑 `node .tmp/reset.mjs 9226`）
- 视口 / 主题矩阵：1440×900、1024×700、真实 125%（DPR 1.25 / `innerWidth 1152`）、浅色 / 深色（真实路径：设置 → 深色｜浅色 → 保存）、`prefers-reduced-motion: reduce`
- 脚本：`.tmp/e2e-r44-ui-main.mjs`（截图矩阵 + 排版/组件/焦点测量）、`.tmp/e2e-r44-ui-2.mjs`（125% 缩放、表格条、预览态点「分析本段」、Mermaid、1024 设置）、`.tmp/e2e-r44-ui-3.mjs`（大纲、页签 hover、「插入 ▾」菜单语义）
- 原始输出：`.tmp/r44-ui-main-log.txt`、`.tmp/r44-ui-second-log.txt`、`.tmp/r44-ui-third-log.txt`
- 截图（本角色文件，`shots/round-44/r44-ui-*`；同目录 `bug-*`、`code-*`、`ship-*`、`typora-*` 是其他角色的，未动）
- 控制台：`main` 与 `2` 两个脚本都挂了 `console` + `pageerror` + `requestfailed` 监听，结果 `CONSOLE_ERRORS []`、`REQ_FAILED []`；`3` 只挂了 console 前两项无输出
- 未 push、未动 `release/`

## 截图矩阵

| 项 | 截图 |
| --- | --- |
| 空状态 浅色 1440 | `r44-ui-01-empty-light-1440.png` |
| 富文本 浅色 1440（H1–H4/列表/引用/表格/脚注） | `r44-ui-02-rich-light-1440.png` |
| 「文件 ▾」菜单 | `r44-ui-03-file-menu.png` |
| 拖入提示（toast）叠在表格条文档上 | `r44-ui-04-toast-over-tablebar.png` |
| 快捷键一览 1440 / 滚到底 / 1024×700 | `r44-ui-05-shortcuts-1440.png`、`r44-ui-06-shortcuts-bottom.png`、`r44-ui-13-narrow-shortcuts.png` |
| 查找条（含替换行）1440 / 1024 | `r44-ui-07-findbar-1440.png`、`r44-ui-12-narrow-findbar.png` |
| 只读预览（工具条全锁） | `r44-ui-08-preview-readonly.png` |
| 窄窗 1024×700 | `r44-ui-10-narrow-1024.png` |
| 表格工具条 1440 / 1024 | `r44-ui-24-tablebar-1440.png`、`r44-ui-11-narrow-tablebar.png` |
| 真实 125%（DPR 1.25） | `r44-ui-22-zoom125.png` |
| 深色富文本 / 深色工具栏 / 深色预览 | `r44-ui-15-dark-rich-1440.png`、`r44-ui-18-dark-shortcuts.png`、`r44-ui-17-dark-preview.png` |
| 深色 toast / 深色侧栏 / 深色字数面板 | `r44-ui-16-dark-toast.png`、`r44-ui-19-outline-dark.png`、`r44-ui-20-stats-dark.png` |
| 大纲（浅色，四级缩进 + 截断） | `r44-ui-23-outline-light.png` |
| 「插入 ▾」菜单 | `r44-ui-28-insert-menu.png` |
| Mermaid 浅色 | `r44-ui-26-mermaid-light.png`（`r44-ui-21` 同图，前一张脚本探针报错但截图有效） |
| 设置 1024×700 | `r44-ui-27-settings-1024.png` |
| 预览态点「分析本段（模拟）」后 | `r44-ui-25-preview-analyze-click.png` |

---

## 发现

### F1（P2，新）快捷键一览在 1440×900 就要滚动：底部一截 kbd 行被裁半行，第三组「视图与字号」首屏看不到

实测（`.tmp/r44-ui-main-log.txt` 的 `SHORTCUTS` / `NARROW_SHORTCUTS`，截图 `r44-ui-05-shortcuts-1440.png`、`r44-ui-06-shortcuts-bottom.png`、`r44-ui-13-narrow-shortcuts.png`、`r44-ui-18-dark-shortcuts.png`）：

- 1440×900：`.shortcuts-dialog` 矩形 `[440,81,560,738]`，`max-height: 82vh`，`scrollHeight 885` / `clientHeight 736` → **首屏隐藏 149 px**。24 行分三组（文件 6、编辑与批注 15、视图与字号 3）。
- 视觉后果：滚动裁切边界正好切在一行 kbd 中间（浅色与深色截图都可见「Ctrl+= / Ctrl+- / Ctrl+Alt+0 字号放大/缩小/复位」只剩半行），`.dialog-actions`（`position: sticky; bottom: 0`，`src/styles.css:1189-1198`）的「知道了」按钮压在这条被裁的正文上。
- 1024×700：对话框 `[232,63,560,574]`，`scrollHeight 885` / `clientHeight 572` → **隐藏 313 px**。首屏只能看到「文件」组与「编辑与批注」组的前半，连滚动条都不显眼（截图 `r44-ui-13`）。
- 底部说明（「Ctrl+N / Ctrl+O / Ctrl+Shift+S 被浏览器保留…AltGr 冲突」）与「视图与字号」组三行都在首屏之外——而这条说明恰好是「哪些键没绑定」的关键信息（`src/components/ShortcutsDialog.tsx:92-101`）。

建议：`@media (min-width: 900px)` 里把 `.shortcuts-dialog` 宽度提到 720–780 px 并让 `.shortcuts-group dl` 用两列（`grid-template-columns: repeat(2, minmax(0,1fr))`），或在组标题上加折叠；`.dialog-actions` 加 `padding-bottom: 4px` 与一条 `box-shadow: 0 -8px 12px -8px` 分隔，避免正文半行露在按钮行下。

### F2（P2，新）全局提示（toast）盖在模态遮罩之上：设置/快捷键对话框开着时，提示仍浮在对话框上并保留按钮

实测（`.tmp/r44-ui-main-log.txt` 的 `TOAST`，截图 `r44-ui-05-shortcuts-1440.png`、`r44-ui-18-dark-shortcuts.png`）：

- `.toast` 的 `z-index: 45`（`src/styles.css:1979`），`.overlay`（模态遮罩）的 `z-index: 40`（`src/styles.css:1128`）。所以提示恒在遮罩与对话框之上。
- 1440 截图里提示条 `[514,816,413,38]`，快捷键对话框底边 y=819：两者重叠，提示整条落在遮罩外面、亮度不降，横跨对话框下沿。
- 提示条内含可点元素：错误提示有「关闭提示」按钮与动作按钮（`src/App.tsx:5090-5108`）。模态期间这些按钮仍可点，`aria-modal="true"` 承诺的「背景不可交互」在这一层被打破。

建议：提示层降到 `z-index: 30`（遮罩之下），或模态打开时把 `notice` 收进对话框内部；至少要保证模态期间 `.toast` 不接收指针事件。

### F3（P2，新）工具栏「插入 ▾」菜单没有 menu 语义、也没有方向键导航，与「文件 ▾」「导出 ▾」两个菜单两套行为

实测（`.tmp/r44-ui-third-log.txt` 的 `INSERT_MENU` / `INSERT_MENU_ARROWDOWN`，截图 `r44-ui-28-insert-menu.png`）：

- `.toolbar .menu`：`role=null`、`aria-label=null`，9 个按钮 `role` 全 `null`；点开后焦点留在触发按钮上（`firstFocus: outside`），按 `ArrowDown` 焦点不动（`document.activeElement` 仍是 `BUTTON.menu-trigger.is-open`）。
- 对照：「文件 ▾」菜单 `role="menu"` + 每项 `role="menuitem"` + ArrowUp/Down/Home/End/Esc（`src/components/FileMenu.tsx:115-155`）；「导出 ▾」同样（`src/App.tsx:4546-4564`）。
- 代码：`src/App.tsx:4652-4706` 的插入菜单是裸 `<div className="menu">`，没有 role 也没有 `onKeyDown`。

影响：读屏用户听不到「这是一个菜单、有 9 项」；键盘用户从触发按钮只能靠 Tab 一项一项走，方向键无效。

建议：与 `FileMenu` 对齐——加 `role="menu" aria-label="插入"`、子项加 `role="menuitem"`、复用同一段 ArrowUp/Down/Home/End/Esc 处理（打开后把焦点放到第一项）。

### F4（P2，新）只读预览里工具栏 9 个编辑按钮全锁了，同一屏的「分析本段（模拟）」仍可点，点后弹出「模型没按约定格式回」

实测（`.tmp/r44-ui-main-log.txt` 的 `PREVIEW_RO`、`.tmp/r44-ui-second-log.txt` 的 `PREVIEW_ANALYZE`，截图 `r44-ui-08-preview-readonly.png`、`r44-ui-25-preview-analyze-click.png`）：

- 预览态：工具条 11 个按钮里 9 个 `disabled`（插入 ▾ / H1 / H2 / B / I / S / `</>` / 专注 / 打字机，`opacity 0.4`），只剩「源码 / 预览」可点；`.table-bar` 不再渲染（`tableBar: false`）。第 43 轮 F1 的两条复现路径本轮**已修好**。
- 但顶栏「分析本段（模拟）」在预览态仍是启用态（浅绿底 pill）。点它：正文不变（`preview-pane` 文本长度 155 → 155，批注卡 0 张），状态栏仍显示「预览」，却弹出提示 **「模型没按约定格式回，重试一次看看。」**
- 这句话在没有 Key 的模拟模式下把失败归给「模型」；按钮自己写着「（模拟）」。

影响：(a) 同一可读视图里「编辑」全锁、「分析」可点，两种口径；(b) 模拟模式给的是模型故障文案，用户会去查 Key / 重试。

建议：预览态把「分析本段」也 `disabled`（与工具条同口径，或改成 `aria-describedby` 提示「切回编辑再分析」）；模拟路径的失败文案改成「模拟结果格式异常，已丢弃」之类，不指向模型。

### F5（P2，第 43 轮 F3 未修）表格工具条钉在窗口顶端，离表格 427–515 px；7 个按钮仍无 `aria-label`、高 23 px

实测（`.tmp/r44-ui-second-log.txt` 的 `TABLEBAR_1440`、`.tmp/r44-ui-main-log.txt` 的 `NARROW_TABLEBAR`，截图 `r44-ui-24-tablebar-1440.png`、`r44-ui-11-narrow-tablebar.png`）：

- 1440×900（4 行短文档）：工具条 `[0,84,1440,36]`，表格在 y=547 → **间距 427 px**。
- 1024×700：工具条 `[0,84,1024,36]`，表格 `[238,635,756,110]` → **间距 515 px**（第 43 轮 1440 下图间距 639 px）。
- 7 个按钮 `aria-label` 全 `null`（`title` 有：`在当前行上方插入行` 等），高度一律 **23 px**（上/下/左/右插入 53×23，删行/删列/删表 41×23）。

影响：光标在长文档底部的表格里时，改行列要先把视线拉到窗口顶端；23 px 高也低于 WCAG 2.2 AA 2.5.8 的 24×24。

建议：工具条 sticky 到当前表格（`position: sticky; top: 0` 且随表格容器）或浮动在表格上方 8 px；补 `aria-label`（与 `title` 同文即可）；按钮 `min-height: 26px`。

### F6（P2，第 43 轮 F4 未修）1024 窄窗正文列宽到 756 px（44 汉字/行），比 1440 的 576 px 更宽

实测（`.tmp/r44-ui-main-log.txt` 的 `NARROW`，截图 `r44-ui-10-narrow-1024.png`）：

- 1440：`.doc-column` **576 px**（33 汉字/行）；1024：**756 px（44 汉字/行）**；真实 125%（1152）：572 px。
- 1024 下无横向溢出（`documentElement.scrollWidth = clientWidth = 1024`），所以是行长失控，不是破版。
- 根因同第 43 轮记录：`@media (max-width: 1119px)` 里 `.doc-layout` 的 `36rem` 上限被去掉（`src/styles.css:2442` 附近），`.doc-column` 自己无 `max-width`。

建议：窄窗口也保留 `max-width: 36rem; margin-inline: auto`（零字节级）。

### F7（P2，第 43 轮 F5/F6 未修 + 扩展）查找条没有 role/名称、两个输入框只有 placeholder、7 个按钮高 23 px

实测（`.tmp/r44-ui-main-log.txt` 的 `FINDBAR`，截图 `r44-ui-07-findbar-1440.png`）：

- `.find-bar` 高 79 px、两行；`输入框`：`placeholder="查找"` / `"替换为"`，`aria-label` 都是 `null`。
- 7 个按钮高度全为 **23 px**：`Aa` 33×23、`ab` 33×23、↑ 25×23、↓ 25×23、✕ 29×23、`替换` 43×23、`全部替换` 66×23。
- 第 43 轮已修的：`Aa`/`ab` 有 `aria-pressed`、↑/↓/✕ 有 `aria-label`。

建议：`.find-bar` 加 `role="search" aria-label="查找与替换"`；两个输入框补 `aria-label`；按钮 `min-height: 24px`（横向再补 1 px 内边距即可）。

### F8（P2，第 43 轮 F9 未修）H2/H3 行高 1.95，H2 的行框（44 px）比 H1（42 px）还高

实测（`.tmp/r44-ui-main-log.txt` 的 `TYPO`，截图 `r44-ui-02-rich-light-1440.png`、`r44-ui-23-outline-light.png`）：

- `h1` 31.45 px / 行高 1.35（行框 42）；`h2` 22.44 px / **1.95**（行框 44）；`h3` 18.7 px / **1.95**（行框 36）；正文 17 px / 1.95。
- 代码：`src/styles.css:588-598` 的 `.doc-body h2/h3` 没写 `line-height`，继承 `.doc-body` 的 1.95。

建议：`h2 { line-height: 1.45 }`、`h3 { line-height: 1.55 }`。

### F9（P2，第 43 轮 F6 未修 + 扩展）工具栏 `I` 21×24、`</>` 37×21，状态栏字数入口 117×16

实测（`.tmp/r44-ui-main-log.txt` 的 `TOOLBAR_1440` / `NARROW`）：

- `.toolbar` 里两项低于 24×24：斜体 `I` **21×24**、行内代码 `</>` **37×21**；其余 H1/H2/B/S 均 ≥24 高。
- 状态栏字数入口 `.stats-trigger` 在 1024 下 **117×16**（高 16 px），是打开字数明细的唯一入口。
- 工具栏本身在 1440 与 1024 都无溢出（`scrollWidth = clientWidth`，最右「预览」右边 1012 < 1024）。

建议：`.toolbar button { min-width: 26px; min-height: 26px }`；`.stats-trigger { padding-block: 4px }`。

### F10（P2，第 43 轮 F2 未修）进预览时正文列右跳 139 px

实测（`.tmp/r44-ui-main-log.txt` 的 `PREVIEW_RO` 与 `TYPO`，截图 `r44-ui-02-rich-light-1440.png` 对 `r44-ui-08-preview-readonly.png`）：

- 编辑态 `.doc-column` 左边 x=**397**（`EMPTY` 与 `TYPO` 两次一致，宽 576）；预览态 `.preview-column` 左边 x=**536**、宽 576。
- 同一篇字在两种视图里横向错开 139 px，切换时整篇文字跳一下。

建议：同第 43 轮——两态用同一个 `padding-left` 或 `margin-inline-start`，切换视图时正文不动。

---

## 与 Typora 对照（本轮实际打开 `shots/typora/01-live-preview.png`、`02-window-maximized.png`）

- **窗口顶部**：Typora 只有一行菜单、正文从 y≈90 起；Sidelight 是 topbar（46）+ toolbar（38）两行，光标进表格再多一条表格条；预览态还把正文右移 139 px（F10）。这是产品设计，代价是同一屏竖向比 Typora 少约 90 px 正文。
- **标题节奏**：Typora 的 H1–H3 行高约 1.25–1.3，靠字号拉层级；Sidelight 的 H2/H3 行高 1.95，H2 行框反而比 H1 高（F8）。本轮唯一明显落后的排版项。
- **快捷键一览**：Typora 里没有同等「一览」面板（快捷键在菜单里），所以没有可对照的成品；Sidelight 这块内容是新的，问题在滚动裁切（F1），不在内容。
- **表格**：两边都是表头底色 + 分隔线；Sidelight 的表格工具条离表格 427–515 px（F5），Typora 无此工具条。
- **暗色**：本轮实测正文、标题、列表、表格 14.42:1，引用 9.26:1，工具栏按钮 9.26:1，状态栏 7.95:1，全部过 AA；未发现暗色对比度不足的组件。
- **空状态**：Sidelight 正文区有「从这一句开始写」占位（16 px、`rgb(102,108,114)`、对比度约 5.2:1），右侧栏给「未配置 API Key，下面是本地模拟批注」+「选中一段，按 Ctrl + Enter」两段说明；信息量比 Typora 空文档大，未记为缺陷。

---

## 试过、判断没有问题的项（都有本轮实测）

- **预览只读守卫（第 43 轮 F1）已修**：预览态工具条 9/11 禁用、`opacity 0.4`、`cursor: default`；表格条不再渲染（`tableBar: false`）；Tab 序列跳过全部禁用按钮（`PREVIEW_TABSEQ` 停在 文件 / 打开文件夹… / 字数 / 跳到正文 / 文件 ▾ / 分析本段 / 导出 ▾ / ? / 保存 / 设置 / 源码 / 预览）。
- **真实 125% 缩放**（`.tmp/r44-ui-second-log.txt` 的 `ZOOM_A` / `ZOOM_B`）：DPR **1.25**、`innerWidth 1152`、正文列 572 px、工具栏无溢出、`scrollWidth = clientWidth = 1152`（截图 `r44-ui-22-zoom125.png`）。第一次尝试（沿用第 43 轮写法）`deviceScaleFactor` 没生效，改为先 `setViewportSize(1152×720)` 再发 `Emulation.setDeviceMetricsOverride` 才成功——排查记录在此，免得下一轮重复踩。
- **键盘焦点与 Esc 回焦**：快捷键对话框 `role=dialog aria-modal="true" aria-label="快捷键" aria-labelledby="shortcuts-title"`，打开后焦点在「知道了」；Esc 关闭后焦点回到顶栏 `?`（`aria-label=快捷键`）。
- **「文件 ▾」菜单是完整实现**：`role="menu" aria-label="文件"`、6 项 `role="menuitem"`、`aria-keyshortcuts`，打开即聚焦第一项（`FILE_MENU_FOCUS`），Esc → 触发器。
- **大纲**：4 条标题按级缩进 0/10/20/30 px，`nowrap + ellipsis`，超长项 `scrollWidth 727` / `clientWidth 191` 由 `title` 补全（`src/components/Outline.tsx:78`），当前章节 `.is-active` 用 600 字重 + `rgb(35,84,77)`（截图 `r44-ui-23-outline-light.png`）。
- **侧栏页签**：`#sidebar-tab-outline` 100×28，hover 变底 `rgb(232,240,237)` + 字 `rgb(35,84,77)`，激活有下划线（`SIDEBAR_TAB`）。
- **toast 对比度**：浅色文字 `rgb(86,92,97)` / 底 `rgb(255,253,248)` ≈ **6.6:1**（手算）；深色 `rgb(168,173,175)` / `rgb(28,31,35)` ≈ **7.3:1**；有 `role="status"`（错误态 `role="alert"`）；6 s 自动消失（`src/App.tsx:1871`），1024 下换 2 行、不溢出。
- **减少动效**：`prefers-reduced-motion: reduce` 下按钮 `transition/animation` 都是 1e-05s。
- **Mermaid**：浅色渲染出 svg 108×358，容器 576×391、背景 `rgb(255,253,248)`、`scrollWidth = clientWidth`、无 `.mermaid-error`（截图 `r44-ui-26-mermaid-light.png`）。
- **深色字数面板**：360×325、`role=dialog`，数值右对齐（截图 `r44-ui-20-stats-dark.png`）。
- **控制台与网络**：`main`、`2` 两个脚本 `CONSOLE_ERRORS []`、`REQ_FAILED []`。

## 其他观察（有证据，未单列为发现）

- **设置面板在 1024×700 需要滚 278 px**（`SETTINGS_1024`：`scrollHeight 936` / `clientHeight 658`，对话框 `430×660` 贴顶 y=20）；内容完整、可滚，未记为缺陷，但与第 43 轮「底部贴边」同族，若改 padding 可一并调。
- **状态栏字数入口的焦点环是灰色**：`.stats-trigger:focus-visible { outline: 2px solid var(--ink-faint) }`（`src/styles.css:1555-1558`，实测 `rgb(102,108,114)`），其余按钮是青绿 `rgb(43,109,100)`（`PREVIEW_TABSEQ`）。对比度够（约 5.2:1），只是焦点指示器颜色不统一。
- **`.outline` 有 `aria-label="大纲"` 但元素没有 role**（`src/components/Outline.tsx:26/45`），该名字不会被读屏采用；外层 tabpanel 已有 `aria-labelledby`，影响小。
- **插入菜单的菜单宽度 136 px、首项与触发按钮左边差 0**（截图 `r44-ui-28`），视觉正常。

## UNVERIFIED

- **屏幕阅读器实录**：只做 DOM 层审计（role、可访问名、状态、live region、焦点顺序），没有 NVDA / 讲述人实际播报。F3、F7 的播报体验未验证。
- **页边批注卡**：本轮仍无法生成真实批注（无 Key，模拟路径点击后只弹提示、0 张卡，见 `PREVIEW_ANALYZE`）。批注卡的 hover/focus/采纳按钮样式未测。
- **真实文件树有文件的状态、右键菜单/确认框**：headless 下点不了 FSA 系统 picker，本轮只测了空工作区与页签。
- **真实 Windows 150% / 200% 系统缩放与宿主内表现**：125% 用 CDP `Emulation` 模拟成功，宿主 WebView2 里的系统缩放未测。
- **`forced-colors` 强制色**：本轮未重跑（第 43 轮记录布局不破）。
- **设置遮罩的真实模糊**：`backdrop-filter: blur(2px)` 只有计算样式，headless 截图看不出模糊。
- **真实中文输入法组合输入、打印样式、macOS 快捷键**：未测。
- **F2 的模态交互复验**：只证明了 z-index 与几何重叠、提示内有可点按钮；模态期间真的点到提示按钮的路径未实测（没造出「模态开着 + 错误提示」的同时态）。
