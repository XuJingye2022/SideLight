# 第 45 轮 界面美观与可访问性 侦察报告（finder-ui）

- 轮次：45；轮前 `startSha=021cbd35d0a0422e519b5c008a3d47fca1bdccbb`，本轮 `git rev-parse HEAD` 与之一致（只读产品代码；`git status` 只有未跟踪的 `docs/iteration/round-45/` 与 `shots/round-45/`）
- 环境：dev server `http://localhost:5175`（未另起、未重启）、CDP **9226**（每个脚本前跑 `node .tmp/reset.mjs 9226`）
- 视口 / 主题矩阵：1440×900、1024×700、760×600、深色（真实路径：设置 → 深色 → 保存）、编辑 / 预览 / 源码三种视图
- 脚本与原始输出：
  - `.tmp/e2e-r45-ui-main.mjs` → `.tmp/r45-ui-main-log.txt`（批注卡、遮挡取证、悬停/按下态、Tab 焦点序列、查找、字号缩放、采纳）
  - `.tmp/e2e-r45-ui-2.mjs` → `.tmp/r45-ui-second-log.txt`（页边栏遮挡、追问线程、字号复位、1024/760 抽屉、深色对比度）
  - `.tmp/e2e-r45-ui-3.mjs` → `.tmp/r45-ui-third-log.txt`（预览/源码里的批注入口、快速打开、1024 字数面板）
  - `.tmp/e2e-r45-ui-4.mjs` / `-5.mjs` / `-6.mjs` / `-7.mjs`（空白页复现、遮罩 hover 取证、diff 箭头几何、侧栏寡行、`:hover`/`:active` 计数）
- 控制台：`main`、`2`、`3` 三个脚本都挂了 `console` + `pageerror` + `requestfailed`，结果全部 `CONSOLE_ERRORS []`、`REQ_FAILED []`
- 本轮第一次拿到**真实批注卡**：第 44 轮模拟流缺 `meta` 条、收尾报「模型没按约定格式回」，本轮 `src/lib/ai.ts:254-308` 已补 `meta`，点「分析本段（模拟）」能稳定产出 3 张卡（评价 / 修订 / 评价）
- 未 push、未动 `release/`

## 截图矩阵

| 项 | 截图 |
| --- | --- |
| 富文本浅色 1440（长 URL 段） | `r45-ui-01-rich-light-1440.png` |
| 批注卡三张 + 整体评价（浅色 1440） | `r45-ui-02-note-cards-light-1440.png` |
| 第一张卡被「整体评价」盖住（鼠标在卡上） | `r45-ui-03-note-under-overall.png` |
| 卡片悬停（阴影 + 左移 2px） | `r45-ui-04-note-hover.png` |
| 追问输入框（旧脚本，后续被 `-2` 的 09 取代） | `r45-ui-05-note-thread-input.png` |
| 查找条（浅色，2 处命中） | `r45-ui-06-find-light.png` |
| 字号 22px | `r45-ui-07-fontsize-22.png` |
| 采纳后（3 条 → 2 条） | `r45-ui-08-note-accepted.png` |
| 追问线程展开 / 已输入 / 已发送 | `r45-ui-09-note-thread.png`、`r45-ui-10-note-thread-typed.png`、`r45-ui-11-note-thread-sent.png` |
| 窄窗 1024 编辑态 | `r45-ui-12-narrow-1024.png` |
| 窄窗抽屉（3 张卡 + 吸底整体评价） | `r45-ui-13-narrow-drawer.png` |
| 窄窗 760 编辑态 / 760 抽屉 | `r45-ui-14-narrow-760.png`、`r45-ui-15-narrow-760-drawer.png` |
| 深色批注（含线程）/ 深色悬停 / 深色焦点 | `r45-ui-16-dark-notes.png`、`r45-ui-17-dark-note-hover.png`、`r45-ui-18-dark-note-focus.png` |
| 预览态（批注整块消失） | `r45-ui-19-preview-with-annotations.png` |
| 预览 1024（批注开关还在） | `r45-ui-20-preview-1024.png` |
| 预览 1024 点「批注」后整屏空白 | `r45-ui-21-preview-1024-toggle-clicked.png`（3835 B，纯色） |
| 源码态（批注整块消失） | `r45-ui-22-source-with-annotations.png` |
| 切回编辑（3 张卡还在） | `r45-ui-23-back-to-edit.png` |
| 快速打开（空查询）/ 输入「未」后 | `r45-ui-24-quick-open-empty.png`、`r45-ui-25-quick-open-typed.png` |
| 字数面板 1024 | `r45-ui-26-stats-1024.png` |
| 预览 1024 干净态 / 点批注后空白 | `r45-ui-30-preview-1024-clean.png`、`r45-ui-31-preview-1024-blank.png`（3835 B）、`r45-ui-32-preview-1024-blank-late.png`（3835 B） |
| 抽屉打开 + 鼠标移到正文区（遮罩变实色） | `r45-ui-33-drawer-backdrop-hover.png` |

---

## 发现

### F1（P1，新）「整体评价」面板压住批注卡：第一张卡的正文和 3 个按钮被盖住，点击被面板吞掉

复现：1440×900 打开一篇三句以上的文档 → 光标放在第一段 → 点顶栏「分析本段（模拟）」→ 等 3 张卡出现。

实测（`.tmp/r45-ui-main-log.txt` 的 `CARDS` / `OCCLUSION`，截图 `r45-ui-02`、`r45-ui-03`、`r45-ui-09`、`r45-ui-16`）：

- 三张卡：`evaluation [996,200,260,144]`、`revision [996,356,260,210]`、`evaluation [996,578,260,144]`；`.rail-overall` 矩形 `[996,262,260,93]`，与卡 0 **纵向重叠 82 px**、卡 1 重叠 304 px、卡 2 重叠 460 px（`cardsUnderOverall.coveredPx`）。
- 卡 0 的正文与按钮行整个落在面板后面。`elementFromPoint` 逐点探测（`OCCLUSION`）：卡 0 中心命中 `BUTTON.rail-overall-head`；三个按钮（知道了 / 追问 / 联网核对）中心全部命中 `SPAN`，`blockedCount: 3` —— **真实鼠标点不到**。第一次尝试 `locator('.note').first().click()` 与 `locator('button', { hasText: '追问' })` 都因「`rail-overall` subtree intercepts pointer events」超时 30 s，这就是用户点击无反应的形状。
- 截图 `r45-ui-09`（整体评价已收起）里后果更直观：第一张卡只剩「评价 模拟 第 1 处 + 引文」，然后一条「整体评价 1 展开」，**卡片的正文消失、按钮行却从面板下面露出来**，看起来像一条无主按钮行悬在页边。
- 窄窗抽屉是同一问题：卡在抽屉里改成 `position: static`（`src/styles.css:2529-2533`），但 `.rail-overall` 仍 `position: sticky; bottom: 0`（`src/styles.css:802-811`）。截图 `r45-ui-13` 里第 3 张卡的「知道了 追问 联网核对」被吸底面板切掉一半；`DRAWER_OPEN` 量到卡 3 `[595,144]`、面板 `[651,33]`。
- 根因：卡片是 `position: absolute`（`src/styles.css:953-963`），纵向位置只按正文坐标算（`src/App.tsx:1946-1958`：`coordsAtPos` + 上一张卡底部的 floor），页边栏自身的流内内容（`rail-overall`）完全没有参与计算；`sticky bottom: 0` 在「面板自然位置已经高于视口底部」时不生效，于是面板停在栏中间当一块不透明挡板。

建议：让卡片布局避让流入内容——给 `.margin-rail` 的卡片容器加 `padding-top` = `.rail-overall` 高度，或把「整体评价」移出滚动区（固定到页边栏底部、卡片区单独滚动并加 `padding-bottom`）；至少给 `.margin-rail` 一个「卡片最大 top = 内容高 - 面板高」的约束，并让面板 `pointer-events: none`（交互只留在面板内部按钮上）。

### F2（P2，新）「未配置 API Key，下面是本地模拟批注」提示被第一张卡完全盖住，一个字都看不到

复现：同 F1；另一条路径是窄窗抽屉打开（那里卡片是流式，提示可见，见截图 `r45-ui-13`）。

实测（`.tmp/r45-ui-second-log.txt` 的 `RAIL_FLOW_OCCLUSION`，截图 `r45-ui-02`、`r45-ui-16`）：

- 提示 `.rail-notice-mock` 矩形 `[1001,200,260,50]`，卡 0 矩形 `[1001,200,260,144]` —— 起点相同、卡更高，`coversNotice: true`。
- 在提示文字中心做 `elementFromPoint`，命中 `HEADER.note-head`（`insideNotice: false`）。宽窗浅色、深色截图里这一行提示都不存在，只有抽屉截图 `r45-ui-13` 能看到它。
- 这条提示承担两个产品承诺：批注是本地模拟、不调用模型（`src/App.tsx:97`、`src/styles.css:920-928`）。被盖住后，用户会把模拟批注当成真模型结果。

建议：与 F1 同一个修法；另外把这条提示放进 `.rail-head` 或提到卡片容器之外（不要在卡片可覆盖的区域内）。

### F3（P1，新）窄窗「批注」遮罩是个 `button`，`button:hover` 把它染成实色：一悬停整页正文消失，预览态点开直接整屏空白

复现（A，编辑态）：1024×700 → 文档有批注 → 点顶栏「批注」打开抽屉 → 鼠标移到左侧正文区任意处（300,350）。

复现（B，预览态，更严重）：1024×700 → 点「预览」→ 点顶栏「批注」→ 不移动鼠标，屏幕立刻整片空白。

实测：

- `BACKDROP_HOVER_EDIT`：遮罩 `1024×700`，`elementFromPoint(300,350)` = `BUTTON.rail-backdrop`，计算背景 **`rgb(232,240,237)`**（= `--accent-wash`），不是设计里的半透明黑。
- 截图 `r45-ui-33-drawer-backdrop-hover.png`：抽屉在右，左侧整片淡绿纯色，编辑器正文、标题、状态栏全部不可见（只剩抽屉）。
- 预览路径：`AFTER_TOGGLE` 量到 `.rail-backdrop` 背景 `rgb(232, 240, 237)`、`elementFromPoint(512,350)` = `BUTTON.rail-backdrop`、`aria-expanded: "true"`；截图 `r45-ui-31` 与 `r45-ui-32` 都是 **3835 B 的纯色图**，与 `r45-ui-21` 字节数一致。
- 根因：`button:hover:not(:disabled) { background: var(--accent-wash) }`（`src/styles.css:137-140`，特异度 0,2,1）压过 `.rail-backdrop { background: rgba(18,20,22,0.32) }`（`src/styles.css:2504-2512`，0,1,0）。遮罩铺满全屏，指针必然停在它上面，所以这个 hover 态实际上等于常态。
- 影响：用户看到的是「整页变空白」，第一反应是文档丢了。第 43/44 轮都没测到，因为当时没有批注卡、也就没打开过抽屉。

建议：`.rail-backdrop` 用 `background: rgba(18,20,22,0.32) !important` 或提高选择器（`.rail-backdrop:is(button):hover`），或直接把遮罩换成 `<div role="presentation" onClick>`（有 `aria-label` 的关闭按钮放抽屉里）。顺手挡掉 `button:hover` 的全局继承。

### F4（P2，新）预览 / 源码视图里「批注」开关还在，但面板根本不渲染：`aria-controls` 指向不存在的节点，点开后只有遮罩没有内容

复现（A）：有批注时点「预览」（1440）。
复现（B）：1024×700 预览态点「批注」。

实测（`.tmp/r45-ui-third-log.txt` 的 `PREVIEW` / `PREVIEW_1024_TOGGLE` / `SOURCE`，截图 `r45-ui-19`、`r45-ui-20`、`r45-ui-21`、`r45-ui-22`、`r45-ui-23`）：

- 预览：`rail: false`（DOM 无 `.margin-rail`）、`railToggle: true`、`toggleAriaControls: "margin-rail"`、`controlsTargetExists: false`、`analyzeDisabled: true`（第 44 轮 F4 已修好）。
- 1024 预览点「批注」：`before { app: "app", rail:false }` → `after { app: "app rail-open", rail:false, backdrop:true, expanded:"true" }`。面板不存在、遮罩和 `aria-expanded=true` 都出现了，屏幕被 F3 染成纯色（截图 `r45-ui-21`）。
- 源码视图：`rail: false`、`railToggle: true`，同样的问题；截图 `r45-ui-22` 里正文旁边没有任何「批注在这里」的说明。
- 切回编辑：3 张卡全部回来（`BACK_TO_EDIT cards: 3`），说明数据没丢，只是消失得无声无息。
- 代码：页边栏只在编辑分支渲染（`src/App.tsx:5039-5048`），而顶栏「批注」按钮无条件渲染（`src/App.tsx:4639-4651`）、遮罩只看 `railOpen`（`src/App.tsx:5194-5195`）。

建议：`viewMode !== 'edit'` 时隐藏（或 `disabled` + `title="切回编辑查看批注"`）这个开关；若保留，就在预览/源码页脚加一句「批注在编辑视图查看（Ctrl+/ 或 Ctrl+Shift+P 切回）」。

### F5（P2，新）修订批注卡的「→」被 `flex-wrap` 挤到单独一行，旧文与新文的先后关系读不出来

复现：同 F1，看第 2 张「修订」卡。

实测（`.tmp/r45-ui-seventh-log.txt` 的 `DIFF`，截图 `r45-ui-02`、`r45-ui-09`、`r45-ui-13`、`r45-ui-16`）：

- `.note-diff` 外框 `[1015,390,234,108]`；`.diff-old` `[1015,390,234,40]`（两行）、`.diff-arrow` **`[1015,434,13,20]`**（x 回到卡片左缘、独占一行）、`.diff-new` `[1015,458,234,40]`（再下一行）。
- 结果在浅色、深色、抽屉三种截图里都一样：读者先看到一段带删除线的旧文，下一行左边缘孤零零一个「→」，再下一行才是新文。箭头既不贴旧文末尾，也不贴新文开头（`flex-wrap: wrap`，`src/styles.css:1032-1041`）。
- 同一张卡的 `.note-quote` 与 `.note-text` 没有这个问题。

建议：把箭头画成 `.diff-new::before { content: "→ " }`（随新文一起换行），或改成两段式：旧文一行 / 新文一行并各带「原文」「改为」小标签；不要用独立 flex 子项当连接符。

### F6（P2，新）批注卡本体不可聚焦，也没有 role 和手形光标：悬停/点击联动正文只对鼠标用户存在

复现：有批注后按 Tab 走一遍焦点。

实测（`.tmp/r45-ui-main-log.txt` 的 `CARD_A11Y`、`TAB_SWEEP`，截图 `r45-ui-04`）：

- 三张卡的 `tabIndex` 全 `null`、`role` 全 `null`、`cursor: auto`；卡片却挂了点击与悬停（`src/components/MarginRail.tsx:106-115`：`onClick={onFocusNote}`、`onMouseEnter/onMouseLeave`）。
- Tab 序列（从批注区起）依次是 `采纳 → 忽略 → 追问 → 知道了 → 追问 → 整体评价 → 分析气泡 → 字数入口`：卡片本体被跳过。键盘用户能操作按钮，但拿不到「这张卡对应正文哪一句」的联动高亮（那要鼠标悬停或点击卡片）。
- `r45-ui-04-note-hover.png` 里悬停卡 2 会把它对应的正文句子高亮（`annot.is-active`），这是鼠标独有的信息。

建议：卡片加 `tabIndex={0}` + `role="group"`（或 `aria-labelledby` 指向引文），`cursor: pointer`，`onFocus` 与 `onClick` 走同一个 `onFocusNote`；不要把可点区域只留在 `<article>` 上而不给键盘等价物。

### F7（P2，新）全站没有 `:active` 按下态：12 条 `:hover` 规则、0 条 `:active`，点击时外观与悬停完全相同

复现：鼠标按下（不松开）任意按钮，对比悬停态。

实测（`.tmp/r45-ui-main-log.txt` 的 `STATE_MATRIX`、`.tmp/r45-ui-seventh-log.txt` 的 `HOVER_ACTIVE`）：

- `STATE_MATRIX` 五个样本（工具栏 `H1` / `B` / `</>`、顶栏「保存」、「分析选中（模拟）」）的 `pressed` 计算样式与 `hover` **逐字段相同**：例 `H1` 悬停 `color rgb(35,84,77)` / `bg rgb(232,240,237)`，按下还是这两个值；`保存` 同样。
- 样式表统计：`:hover` 选择器 **12** 条，`:active` **0** 条（350 条规则；`HOVER_ACTIVE`）。作为正向对照，同一统计里 `:hover` 命中 12 条，说明统计口径没漏。
- 工具栏格式按钮虽有 `aria-pressed`（第 42 轮），但那是「已生效」状态，不是「正在按下」的瞬时反馈。

建议：加一条全局 `button:active:not(:disabled) { background: color-mix(in srgb, var(--accent) 18%, transparent); transform: translateY(0.5px) }`，或用 `box-shadow: inset 0 1px 2px` 当按下态；`.note-actions button.accept:active` 单独压暗。

### F8（P2，新）快速打开的「没有匹配的文件」在空查询、无任何可打开文件时也出现

复现：1440 空工作区 → `Ctrl+P`（不输入任何字）。

实测（`.tmp/r45-ui-third-log.txt` 的 `QUICK_OPEN`，截图 `r45-ui-24`）：

- 对话框 `role=dialog aria-label=快速打开`、矩形 `[440,108,560,145]`、焦点在 `INPUT.quick-open-input`（这块是好的）。
- 输入框为空、列表只有一条 `<li class="quick-open-empty">没有匹配的文件</li>`（`src/components/QuickOpen.tsx:81`）。没有查询词却说「没有匹配」，也没有告诉用户「打开一个文件夹后这里会列出文件 / 最近打开」。
- 输入「未」后仍只有这一条（预期，因为没有文件源），说明空态不区分「查询无结果」和「根本没有文件源」两种情形。

建议：`files.length === 0` 时显示「还没有可打开的文件：先打开文件夹，或用 Ctrl+Alt+O 打开一个文件」，有文件但查询无结果时才显示「没有匹配的文件」。

### F9（P2，新）侧栏空态末行只剩「文件」两个字（寡行）

复现：1440 空工作区，看左侧文件页签。

实测（`.tmp/r45-ui-seventh-log.txt` 的 `WIDOW`，截图 `r45-ui-01`、`r45-ui-02`）：文案「打开一个文件夹后，保存会写回原文件」在 217 px 宽的侧栏里排成 `[14,158,180]` + `[14,179,24]` 两行，末行只有 **24 px 宽（约 2 个字）**。同一张截图里首段「还没有打开文件夹」是单行，对比明显。

建议：文案缩短成「打开文件夹后，保存写回原文件」这类 16 字以内的句子，或给 `.file-tree` 空态加 `text-wrap: pretty`（Chrome 117+ 支持）避免末行孤字。

---

## 与 Typora 对照（本轮看了 `shots/typora/01-live-preview.png`）

- **顶栏**：Typora 只有一行菜单、正文从 y≈90 起；Sidelight 是 topbar（46）+ toolbar（38），窄窗再加一条抽屉入口。本轮 1024 与 760 下顶栏都没溢出（`toolbarOverflow: 0`、`docSw = docCw`），这点没问题。
- **排版**：Typora 的 H1–H4 靠字号拉层级、行距紧；Sidelight 正文是本轮实测 17px / 行高 33.15px（约 1.95）——行距偏松，但没有到破版（`r45-ui-01`）。第 44 轮记录的 H2/H3 行高 1.95 本轮**没有重测**，不算本轮结论。
- **页边批注**：Typora 无对应组件，F1/F2/F5 无法对照；但 Typora 在窄窗口（800×700）仍把正文放在窗口正中、不被侧栏挤压，而 Sidelight 1024 下正文列 756 px（第 44 轮记录，本轮未重测）。
- **暗色**：本轮实测批注卡 15 组前景/背景对比度，最低 `.note-head` 与 `.note-actions button` **6.26:1**，最高 16.85:1，全部过 AA；`联网核对` 禁用态 `opacity 0.4`（禁用控件豁免）。深色批注没有对比度问题，未记为发现。
- **空状态**：Sidelight 侧栏有两段说明（信息量比 Typora 大），代价是 F9 的寡行。

## 试过、判断没有问题的项（都有本轮实测）

- **批注卡悬停/激活联动**：悬停卡 2 时 `box-shadow` 变为 `0 4px 16px …/0.14`、`transform: translateX(-2px)`，对应正文 `.annot.is-active` 出现（`HOVER_CARD`、`ACTIVE_STATE`，截图 `r45-ui-04`）。
- **采纳流程**：点「采纳」后正文从「它更像反复打磨出来的东西，需要时间和耐心。」改成「需要时间和耐心，它更像反复打磨出来的东西。」，卡片 3 → 2 张（`ACCEPT`，截图 `r45-ui-08`）；没有 toast 误报。
- **追问线程**：输入框 187×26、占位「就这条批注追问一句…」，空输入时「发送」禁用，输入后可发；模拟回复渲染成两条 `thread-turn`，卡片 `scrollHeight - clientHeight = 0` 不溢出（`THREAD_REALCLICK`/`SEND`，截图 `r45-ui-09/10/11`、`r45-ui-16`）。
- **窄窗抽屉可用性**：1024 打开后焦点自动到「关闭批注」（31×28），Esc 关闭并把焦点还给顶栏「批注」按钮（`DRAWER_OPEN`、`DRAWER_ESC`）；760 下抽屉 `340×600`、内部可滚（`799/600`）。抽屉里卡片改流式，不再用绝对 top 叠卡（`cardRects` 无重叠）。
- **字号缩放与复位**：`Ctrl+=` ×4 → 17px 升到 21px，`Ctrl+Alt+0` 复位回 17px（`FONT_RESET`；快捷键一览里写的也是 `Ctrl+Alt+0`，`src/components/ShortcutsDialog.tsx:46`）。正文 22px 时列宽仍 576、工具栏无溢出、无横向滚动（`FONT_ZOOM`，截图 `r45-ui-07`）。**注**：我一开始按 `Ctrl+0` 测复位，8 次无效——那不是缺陷，绑定的是 `Ctrl+Alt+0`（`src/App.tsx:3770-3773`）。
- **长 URL**：`overflow-wrap: break-word` 生效，576 px 列宽下 URL 换行，`p.scrollWidth = clientWidth = 576`（`LONG_URL`）。
- **深色批注**：见上面 Typora 对照最后一条，15 组全部 ≥6.26:1。
- **快速打开的非空态**：`role=dialog`、输入框 `aria-label="快速打开文件名"`、↑↓/Enter/Esc 都在（`QuickOpen.tsx:64-78`），焦点进门就在输入框（`QUICK_OPEN`）。
- **字数面板 1024**：`role=dialog aria-label=字数明细`、360×325、`[16,335]` 贴底不越界、`scrollWidth 358 = clientWidth 358`、焦点进面板（`STATS_1024`，截图 `r45-ui-26`）。
- **125% 缩放**：本轮没重跑 CDP `Emulation`（第 44 轮已验，DPR 1.25 / innerWidth 1152 不破版），只测了 1024/760/1440 三个真实视口。
- **第 44 轮 F4 已修**：预览态「分析本段」`disabled=true`、`title="只有编辑视图支持"`（`PREVIEW`），工具条 9/11 禁用。

## 遗留未修（本轮只复核了这几条，其余未重测）

- 查找条仍 `role=null`、`aria-label=null`，7 个按钮仍 **23 px 高**（`FIND`；第 44 轮 F7）。
- 工具栏斜体 `I` 仍 **21×24**、行内代码 `</>` 仍 **37×21**（`TAB_SWEEP`；第 44 轮 F9）。
- 状态栏字数入口仍 **117×16**，焦点环仍是灰色 `rgb(102,108,114)`（其余按钮是 `rgb(43,109,100)`）（`TAB_SWEEP`；第 44 轮「其他观察」）。
- 第 44 轮 F1（快捷键一览要滚动）、F2（toast 在模态遮罩之上）、F3（插入菜单无 menu 语义）、F5（表格条离表格 427–515 px）、F6（1024 正文列 756 px）、F8（H2/H3 行高 1.95）、F10（预览列右移 139 px）本轮**未重测**，不作结论。

## UNVERIFIED

- **屏幕阅读器实录**：只做 DOM 审计（role / 可访问名 / `aria-expanded` / `aria-controls` / 焦点顺序），没有 NVDA / 讲述人实际播报。F4、F6 的播报体验未验证。
- **真实中文输入法与 IME 组合输入**：本轮全部用 `keyboard.type()` 与 `fill()`，未走 IME。
- **真实 150% / 200% 系统缩放、WebView2 宿主内的抽屉与批注**：只跑了浏览器 CDP，宿主（`host/`、`host-mac/`）未测；macOS 未测。
- **真实文件树有文件时的状态**：headless 点不了系统 picker，快速打开的文件源为空，F8 的「有文件但查询无结果」分支未实测。
- **真实鼠标悬停 `.rail-backdrop` 之外的路径是否也会被 `button:hover` 波及**：只量了这一个元素；插入菜单 / toast 内部按钮是否也继承（视觉上未发现）未逐个核。
- **模态期间点 toast 按钮**（第 44 轮 F2 的交互复验）：本轮没造出「模态 + 错误提示」同时态。
- **`forced-colors` 强制色、打印样式、`prefers-reduced-motion` 下的批注卡**：本轮未重跑（减少动效在 `src/styles.css:2553-2561` 是全局压时长）。
- **批注卡在 40vh 以上的整体评价内容（多段 overall）时的遮挡范围**：本轮模拟流只产生 1 条 overall。
