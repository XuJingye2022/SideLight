# 第 42 轮 界面美观与可访问性 侦察报告（finder-ui）

- 轮次：42；轮前 `startSha=5b7a1f5733c04b2c8bbf80987bf1119634541bbd`（本轮 `git rev-parse HEAD` 一致；产品代码 `src/`、`docs/` 未改，`git status` 只有 `docs/iteration/round-42/`、`shots/round-42/` 两个未跟踪目录）
- 环境：dev server `http://localhost:5175`（未重启、未另起）、CDP **9226**（每个脚本前跑 `node .tmp/reset.mjs 9226`）、视口 1440×900 / 1024×700 / 720×450（≈200% 缩放）、DPR 1.25、浅色 / 深色（真实路径：设置 → 深色｜浅色 → 保存）/ `prefers-reduced-motion: reduce` / `forced-colors: active`
- 只读产品代码；未 push、未动 `release/`
- 脚本：`.tmp/e2e-r42-ui-main.mjs`（截图矩阵 + 排版/对比度）、`.tmp/e2e-r42-ui-new.mjs`（行内代码行框 / Tab / `:active`）、`.tmp/e2e-r42-ui-new2.mjs`（暗色组件 / 真键盘 Tab / 大纲截断）、`.tmp/e2e-r42-ui-new3.mjs`（键盘陷阱复核 / 720 高设置面板）、`.tmp/e2e-r42-ui-new4.mjs`（强制色 / hover / 复选框点击区）
- 原始输出：`.tmp/r42-ui-log.txt`、`.tmp/r42-ui-new-log.txt`、`.tmp/r42-ui-new2-log.txt`、`.tmp/r42-ui-new3-log.txt`、`.tmp/r42-ui-new4-log.txt`
- 截图：`shots/round-42/r42-ui-01 … r42-ui-62`（本角色文件；同目录 `bug-*`、`ship-*`、`t1-*` 是其他角色的，未动）
- 控制台：5 个脚本 `CONSOLE_ERRORS` 全为 `[]`，请求失败全为 `[]`

## 截图矩阵

| 项 | 截图 |
| --- | --- |
| 空状态 浅色 1440 / 清空后 1440 / 深色 1440 / 深色 1024 | `r42-ui-01-empty-light-1440.png`、`r42-ui-50-empty-light.png`、`r42-ui-53-dark-1440.png`、`r42-ui-46-1024-dark.png` |
| 富文本 浅色 1440 / 焦点框 / 深色 1440 | `r42-ui-02-rich-light-1440.png`、`r42-ui-03-editor-focus.png`、`r42-ui-15-rich-dark-1440.png` |
| 表格工具条 浅色 / 暗色 | `r42-ui-04-table-toolbar.png`、`r42-ui-54-tablebar-dark.png` |
| 查找条 有结果 / 无结果 / 暗色 | `r42-ui-05-findbar.png`、`r42-ui-06-findbar-noresult.png`、`r42-ui-55-findbar-dark.png` |
| 大纲 三级 / 长标题 | `r42-ui-07-outline.png`、`r42-ui-41-outline-long.png`、`r42-ui-57-outline-long.png` |
| 字数面板 1440 / 1024 / 暗色 | `r42-ui-08-stats-panel.png`、`r42-ui-18-narrow-stats.png`、`r42-ui-56-stats-dark.png` |
| 设置 浅色 顶部 / 底部 / 暗色 / 暗色焦点 / 720×450 | `r42-ui-09-settings-light.png`、`r42-ui-10-settings-bottom.png`、`r42-ui-14-settings-dark.png`、`r42-ui-52-settings-dark-focus.png`、`r42-ui-60-settings-720x450.png` |
| 批注页边（浅色） | `r42-ui-11-annotations-light.png` |
| 源码 / 预览 浅色 / 预览深色 | `r42-ui-12-source-light.png`、`r42-ui-13-preview-light.png`、`r42-ui-16-preview-dark.png` |
| 窄窗 1024 深色 / 720×450 深色 | `r42-ui-17-narrow-1024-dark.png`、`r42-ui-46-1024-dark.png`、`r42-ui-45-720x450-dark.png` |
| 真实 125%（DPR 1.25） | `r42-ui-19-zoom125.png` |
| Mermaid 暗色 / 切浅色后 | `r42-ui-20-mermaid-dark.png`、`r42-ui-21-mermaid-after-light.png` |
| 工具栏（光标在加粗里）/ 插入菜单 | `r42-ui-22-toolbar-in-bold.png`、`r42-ui-23-insert-menu.png` |
| 键盘：Tab 陷阱 / 干净加载的 Tab 顺序 / 非选中页签 hover | `r42-ui-40-tab-trap.png`、`r42-ui-59-trap.png`、`r42-ui-58-fresh-tab.png`、`r42-ui-61-sidebar-hover.png` |
| 强制色（Windows 高对比度） | `r42-ui-62-forced-colors.png` |

---

## 发现

### F1（P1，新）正文里 Tab 被吃掉、Esc 不放焦点：键盘只能倒着离开正文

复现（`.tmp/r42-ui-new3-log.txt` 的 `TRAP_MID_DOC`，截图 `r42-ui-59-trap.png`）：
1. 文档有内容（`# 第一章` + 两段正文），光标放进第二段第 3 个字符。
2. 连按 3 次 `Tab`：正文 `innerText` 长度 **37 → 43**（插进 6 个空格），`document.activeElement` 仍是 `DIV.tiptap.ProseMirror.editor`。
3. 按 `Esc`：仍在同一个 `div`，长度还是 43。
4. 只有 `Shift+Tab` 能离开（落到「打开文件夹…」按钮，即倒序）。

另一次实测（`.tmp/r42-ui-new-log.txt` 的 `TRAP_AFTER_5_TAB`）：5 次 Tab 让 87 字的正文变 97 字，焦点没动，Esc 后焦点也没动。

代码：`src/App.tsx:851-859` —— 正文里的 Tab 一律 `preventDefault()` 并 `insertText('  ')`，只有 `from === 1 && to === 1`（整篇第一个位置）才 `return false` 放行；`src/App.tsx:3562-3616` 的 Esc 分支处理了字数面板/批注栏/查找/设置/源码/预览，**没有「离开正文」这一支**，最后 `return`。

影响：键盘用户顺序 Tab 进正文后就出不去（WCAG 2.1.2 键盘陷阱，靠 Shift+Tab 逆向可缓解，所以记 P1 不记 P0）；对读屏用户，正文后面的大纲、状态栏字数、页签都不可达。与第 41 轮 F1（Tab 缩进被解析成代码块）同一处代码，建议一起改。

建议：正文里 Tab 不插字面空格；至少给 Esc 加一支「焦点移到工具栏第一个按钮」，或把 `Tab` 只在列表项/表格里拦、普通段落放行。

### F2（P2，第 41 轮 F3 / 第 40 轮 F7 未修）表格工具条离表格 742 px、7 个按钮无名称、删除与插入同色（暗色同样）

实测（`TABLEBAR`、`TABLEBAR_DARK`，截图 `r42-ui-04-table-toolbar.png`、`r42-ui-54-tablebar-dark.png`）：
- 浅色：工具条矩形 `[0,84,1440,36]`（贴 left 0，右侧约 1000 px 空白），表格 y=826，**间距 742 px**；出现时正文列从 y=136 被推到 172。
- 7 个按钮（上/下/左/右插入、删行、删列、删表）`aria-label` 全 null、`title` 全空；字号 11.5px、高 23px；插入与删除文字色**完全相同**（浅色 `rgb(35,84,77)`）。
- 暗色：删除三项仍 `rgb(156,203,194)`（与插入同色，对比度 11.72:1），7 个按钮 `aria-label` 仍全 null。

代码：`src/App.tsx:4745` 一带（表格条按钮组），样式 `src/styles.css:1885-1902`（`.table-bar` / `.table-bar button` 只有 accent 色）。

建议：工具条用 sticky/floating 贴住当前表格；插入组与删除组之间加分隔线；删除三项用 `--danger`；补 `title` + `aria-label`。同一文件里 `删除行` 一类破坏性操作更需要危险色，这是本轮唯一「破坏性操作与安全操作同色」的位置。

### F3（P2，第 41 轮 F5 未修）工具栏 H1/H2/B/I/S/`</>` 没有按下态，也没有 `aria-pressed`

实测（`TOOLBAR_STATE`、`A11Y`，截图 `r42-ui-22-toolbar-in-bold.png`）：光标放进 `**加粗的文字**` 内部后，`B` 的 `class=""`、`aria-pressed=null`、背景 `rgba(0,0,0,0)`、文字色与静止态相同；整页 `[aria-pressed]` 数量 **0**（`A11Y.ariaPressed: 0`）。

代码：`src/App.tsx:4633-4650` 六个格式按钮既无 `className={...}`，也无 `aria-pressed`；对照同文件 `:4656-4672` 的「专注 / 打字机」用的是 `className={focusMode ? 'is-on' : ''}`。全仓 `aria-pressed` 只有 `src/components/FindBar.tsx:82,91` 两个查找开关（第 41 轮新增）。

建议：按 `editor.isActive('bold'|'italic'|'strike'|'code'|'heading',{level})` 给 `is-on` + `aria-pressed`，样式用 accent 底/字，与侧栏选中一致。

### F4（P2，第 41 轮 F6 未修）「插入 ▾」菜单没有 menu 语义，Esc 后焦点掉到 BODY

实测（`INSERT_MENU`、`INSERT_AFTER_ESC`，截图 `r42-ui-23-insert-menu.png`）：触发按钮 `aria-expanded` / `aria-haspopup` 均 null；弹出层 `div.menu` 的 `role` / `aria-label` 均 null；9 个菜单项 `role` 全 null、`tabIndex` 全 0；打开后 `focusedAfterOpen = BUTTON:插入 ▾`（焦点没进菜单）；在菜单项上按 Esc，`document.activeElement` 变成 **BODY**（`INSERT_AFTER_ESC.active = "BODY.:跳到正文\nSid"`）。
对照「文件 ▾」是合格的（`aria-expanded=true`、`aria-haspopup=menu`、`role=menu`、打开即聚焦「新建」）。

代码：`src/App.tsx:3599-3603`（Esc 只还原 `exportTriggerRef`，插入菜单的 `menuOpen` 没有回焦分支）。

建议：复用「文件 ▾」同一套 role/roving tabindex/Esc 回焦；顺带按插入类 / 公式类 / 链接分组。

### F5（P2，第 41 轮 F4 未修）空文档和正文整列被画上 2px 青绿焦点框

实测（`EMPTY`、`FOCUS_RING_EDITOR`，截图 `r42-ui-01-empty-light-1440.png`、`r42-ui-03-editor-focus.png`）：首启空文档里 `.editor` 自带焦点，`outline: solid 2px rgb(43,109,100)`，框住整列 `576×884`，里面只有一行占位文字；深色下是 `rgb(156,203,194)`。
根因：`src/styles.css:147-150` 的全局 `:focus-visible { outline: var(--focus-ring) }` 命中 `div.tiptap.ProseMirror.editor`，没有排除。

建议：`.editor:focus-visible { outline: none }`；键盘进入的提示改用光标颜色或正文顶部 1px 细线。

### F6（P2，第 41 轮 F10 未修）1024 窄窗正文列反而变宽到 756 px（33 → 44 汉字/行）

实测（`NARROW`、`ZOOM_125`）：1440 下 `.doc-column` **576 px**（约 33 个汉字/行）；1024 下 **756 px**（约 44 个/行）；真实 125%（视口 1152）572 px。窗口越窄，行长越长。
根因：`src/styles.css:2397` 的 `@media (max-width: 1119px)` 把 `.doc-layout` 改成单列并去掉了 36rem 上限，`.doc-column` 没有自己的 `max-width`。

建议：窄窗也保留 `max-width: 36rem; margin-inline: auto`。

### F7（P3，第 41 轮 F9 未修）H2/H3 行高 1.95 大于 H1 的 1.35，标题节奏倒挂

实测（`TYPO`、`PREVIEW`）：h1 `31.45px / 42.46px（1.35）`，h2 `22.44px / 43.76px（**1.95**）`，h3 `18.7px / 36.47px（**1.95**）`，正文 p `17px / 33.15px（1.95）`。H2 单行行框比 H1 还高。
代码：`src/styles.css:579-585` 的 `.doc-body h2/h3` 没写 `line-height`，继承 `.doc-body` 的 1.95（`.editor` 与 `.preview-column` 两处共用 `.doc-body`，所以预览也一样）。
对照 Typora（`shots/typora/01-live-preview.png`）：H1–H3 行高紧（约 1.25）、字重 700，层级靠字号；Sidelight 靠行高 + margin，H2/H3 反而更松。建议 h2 `1.45–1.5`、h3 `1.5–1.6`。

### F8（P3，第 41 轮 F7 未修）查找计数没有 live region；查找条本身没有 role/名称

实测（`FINDBAR_EMPTY_RESULT`、`FIND_FOCUS`）：`.find-count` 从 `1 / 2` 变 `无结果` 时 `role=null`、`aria-live=null`；`.find-bar` 的 `role` / `aria-label` 均 null；输入框 `aria-label=null`，只有 `placeholder="查找"`。
代码：`src/components/FindBar.tsx:76` 的 `<span className="find-count">` 没有 `role="status"` / `aria-live`。

建议：`.find-count` 加 `role="status" aria-live="polite" aria-atomic="true"`（与 toast 一致），给 `.find-bar` 加 `role="search" aria-label="查找与替换"`。

### F9（P3，新）全应用没有任何 `:active` 按下态：鼠标按下与 hover 完全一样

实测（`ACTIVE_STATES`、`STATS_ACTIVE_PRESSED`、`HOVER`）：
- `.toolbar button` 静止 `bg rgba(0,0,0,0)`，hover `rgb(232,240,237)`，**mousedown 时仍是 `rgb(232,240,237)`**（`sameHoverDown: true`）。
- `.stats-trigger` hover `rgb(232,240,237)`，按下 `rgb(232,240,237)`（`STATS_ACTIVE_PRESSED`）。
- `src/styles.css` 全文 `:active` 规则 **0 条**（`git grep -nE ':active' -- src` → 0）。

影响：按下没有反馈，点 `.analyze-button` 这类有副作用的按钮时用户只能靠结果判断是否点到了。建议加一条最小规则：`:active:not(:disabled) { transform: translateY(1px) }` 或背景加深一档（零依赖、零字节级别的 CSS）。

### F10（P3，新）设置面板复选框的点击行只有 17 px 高（WCAG 2.2 AA 2.5.8 要 24×24）

实测（`CHECKBOX_TARGET`、`SETTINGS_CONTROLS`）：`input[type=checkbox]` 是 `13×13`，外面套的 `<label>` 矩形 **378×17**——整行的可点高度只有 17 px（「自动保存（停笔 2 秒）」「智能标点与自动配对括号」两条都是）。同一面板里主题按钮高 30、输入框高 35、底部按钮高 28，只有复选框行偏矮。
代码：`src/components/SettingsDialog.tsx:72-79` 与 `:82-89` 两条 `<label className="field field-check">`，样式没有 `min-height`。

建议：`.field label { min-height: 24px; align-items: center; padding-block: 3px }`，或把 checkbox 加大到 16×16 并给行加内边距。

---

## 与 Typora 对照（本轮实际打开 `shots/typora/01-live-preview.png`）

- **标题层级**：Typora H1–H3 行高紧、字重 700，逐级靠字号压缩；Sidelight 用 600 + 衬线，H2/H3 行高 1.95 比 H1 松（F7）。这是本轮唯一在排版上明显落后 Typora 的一项。
- **正文行高**：Typora 约 1.7；Sidelight 1.95，属产品选择（中文衬线），未记为缺陷。
- **表格**：两边都是表头底色 + 单元格分隔线，样式接近；Sidelight 暗色下工具条的删除色不区分（F2）。
- **源码/预览**：Typora 是单视图；Sidelight 是「源码 / 预览」双入口，属已有设计差异，未记为缺陷。
- **空状态**：Typora 首屏就是正文；Sidelight 有占位文字与右侧批注栏提示，信息量更大，但占位符在强制色下会与正文混淆（见「其他观察」）。

---

## 试过、判断没有问题的项（都有本轮实测）

- **行内代码不撑高行框**（新测）：含 `const a = 1` 的段落行矩形高 25 px、行内代码矩形高 20.53 px、行高 28.84 px；不含代码的段落行矩形同样是 25 px（`INLINE_CODE_LINEBOX`）。没有「代码把行距顶开」的问题。
- **暗色组件对比度全部过 AA**（`CONTRAST_DARK`、`DARK_SETTINGS`、`DARK_COMPONENTS`、`TABLEBAR_DARK`、`FINDBAR_DARK`）：正文 14.42:1、设置标题/标签 13.28、设置输入 14.42、保存按钮 6.96、选中主题 7.67、未选中主题 7.92、状态栏 7.95、工具栏 9.26、侧栏页签 13.28、表格条 11.72、查找框 14.42 / 查找条 16.85。**未发现暗色对比度不足的组件**（这是本轮否掉的方向）。
- **设置面板的键盘焦点环**：Tab 依次到主题 3 个按钮、2 个勾选框、接口地址、API Key、模型、字号、联网核对、提示词、恢复默认、快捷键、取消，每个都有 `solid 2px rgb(156,203,194)` 焦点环（`SETTINGS_TAB_RING`，截图 `r42-ui-52-settings-dark-focus.png`）；只有程序化 `.focus()` 的第 1 个没有环，键盘路径正常。
- **设置面板在 720×450（≈200% 缩放）不溢出**：对话框 `[145,20,430,410]`、`max-height: 410px`、`overflow-y: auto`、内容 `scrollHeight 936 > clientHeight 408`，保存按钮在视口内（`saveInsideViewport: true`，`SETTINGS_720`，截图 `r42-ui-60-settings-720x450.png`）。高度自适应正常。
- **720×450 主界面不横向溢出**：`scrollWidth = clientWidth = 720`，正文列 452 px、工具栏折成 38 高、页边批注栏隐藏（`WINDOW_720`，截图 `r42-ui-45-720x450-dark.png`）。
- **干净加载的 Tab 顺序正确**：跳过链接 → 文件 ▾ → 导出 ▾ → 快捷键 → 保存 → 设置 → 插入 ▾ → H1 → H2 → B …，每个停靠点都有 2px 焦点环（`TAB_10_FRESH`、`DOM_TABBABLE_ORDER`，截图 `r42-ui-58-fresh-tab.png`）。状态栏「0 字」是 DOM 里最后一个可聚焦元素，位置正常。
- **非选中侧栏页签 hover 有反馈**：`rgba(0,0,0,0)` → `rgb(232,240,237)` 底 + `rgb(35,84,77)` 字（`SIDEBAR_INACTIVE_HOVER`，截图 `r42-ui-61-sidebar-hover.png`）。第 41 轮「非选中 tab hover 统一 accent-wash」的结论本轮复核成立。
- **大纲长标题截断正常**：长标题 `scrollWidth 566 / clientWidth 191`，`white-space: nowrap; overflow: hidden; text-overflow: ellipsis`，且 `src/components/Outline.tsx:78` 有 `title={node.text}`，悬停能看到全文（`OUTLINE_LONG`、`OUTLINE_TITLE`，截图 `r42-ui-57-outline-long.png`）。不是问题。
- **查找框焦点环与无结果态颜色**：`solid 2px rgb(43,109,100)`；无结果 `rgb(102,108,114)` 与正常态同色（不加语气色，但与第 41 轮相同）。
- **空文档占位符对比度**：`rgb(102,108,114)` on `rgb(246,244,238)` = **4.83:1**，过 AA（16px 正文）（`EMPTY_PLACEHOLDER_LIGHT`）。第 41 轮没有测过这一项，本轮否掉。
- **字数面板数值右对齐**：`中日韩字 221` 右边缘 361、`拉丁词 39` 右边缘 361、`段 7` 右边缘 361，同一列对齐（`STATS`）。
- **`reduced-motion`**：按钮 `transition/animation: 1e-05s`（`REDUCED_MOTION`）。
- **强制色模式布局不破**：`forced-colors: active` 下工具栏、页签、正文、状态栏全部改用系统色，布局无溢出（`FORCED_COLORS`，截图 `r42-ui-62-forced-colors.png`）。
- **滚动条**：未自定义 `scrollbar-width/-color`（全为 `auto`），沿用系统滚动条，暗色下不出现「亮色滚动条块」（`SCROLLBAR`）。

## 其他观察（有证据，未单列为发现）

- **强制色下空文档占位文字与正文同为白色**：`editor fg rgb(255,255,255)`、占位符占同一位置同字号（`App.tsx:4924` 的 `.editor-placeholder` 是 `aria-hidden=true` 的普通 div），截图 `r42-ui-62-forced-colors.png` 里「从这一句开始写」看起来像已经写好的正文。建议 `@media (forced-colors: active) { .editor-placeholder { color: GrayText } }`。
- **「插入 ▾」静止态已经是 accent 底色，hover 无变化**：base 与 hover 的 `bg` 都是 `rgb(232,240,237)`（`HOVER`）。第 41 轮已记，本轮复测相同。
- **字数触发器 `.stats-trigger` 仍只有 16 px 高**（110.5×16，`TARGETS`），斜体按钮 21.2×24；与第 41 轮 F8 同类，未单列。
- **查找条与工具栏在暗色下的边框**：`.table-bar` 的 `borderTopColor` 计算值等于文字色 `rgb(233,230,224)`（`TABLEBAR_DARK`），比相邻面板的 `rgb(58,63,69)` 亮一档，工具条上边线偏显眼。
- **`.stats-panel` 暗色未测到**：本轮 `STATS_DARK` 的 `.stats-panel` 选择器没命中（面板类名与第 41 轮不同），暗色字数面板的对比度本轮 **UNVERIFIED**（浅色面板数值见上）。

## UNVERIFIED

- **屏幕阅读器实录**：只做 DOM 层审计（role、可访问名、`aria-*`、live region、焦点顺序），没有 NVDA/讲述人实际播报。
- **真实 Windows 150% / 200% 系统缩放与 WebView2 宿主**：720×450 用 CDP 视口模拟，宿主里的系统缩放未测。
- **真实 125% DPR 只测了一档**（`dpr 1.25 / innerWidth 1152`），150%/200% 的 DPR 未逐一测。
- **暗色字数面板**：选择器未命中（见「其他观察」）。
- **真实文件树有文件的状态、真实右键/确认框**：headless 下无法点 FSA 系统 picker，本轮只截到空文件夹状态。
- **真实中文输入法组合输入、打印样式、macOS 快捷键**：未测。
- **「跟随系统」主题**：只走了显式「浅色 / 深色」两条路径；`forced-colors` 测试时 `data-theme` 变成 `system`，该分支的暗色跟随未单独验证。
- **批注卡（页边）键盘交互**：本轮只截到浅色卡片（`r42-ui-11-annotations-light.png`），没有重跑模拟流去测卡片内按钮的 hover/focus。
- **Mermaid 切主题后是否仍不重画**（第 41 轮 F2）：本轮没有重测渲染颜色，只保留第 41 轮结论，未复验。
