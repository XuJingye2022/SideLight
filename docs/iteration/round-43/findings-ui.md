# 第 43 轮 界面美观与可访问性 侦察报告（finder-ui）

- 轮次：43；轮前 `startSha=0f83e1f80f57d93e0860282a0d3b0bc2b7953750`（本轮 `git rev-parse HEAD` 一致；产品代码未改，`git status` 只有未跟踪的 `shots/round-43/`）
- 环境：dev server `http://localhost:5175`（未另起、未重启）、CDP **9226**（每个脚本前跑 `node .tmp/reset.mjs 9226`）
- 视口 / 主题矩阵：1440×900、1024×700、真实 125%（DPR 1.25 / `innerWidth 1152`）、浅色 / 深色（真实路径：设置 → 深色｜浅色 → 保存）、`prefers-reduced-motion: reduce`、`forced-colors: active`
- 只读产品代码；未 push、未动 `release/`
- 脚本：`.tmp/e2e-r43-ui-main.mjs`（截图矩阵 + 排版/组件测量）、`.tmp/e2e-r43-ui-a11y.mjs`（键盘/焦点/名称/状态/125%/强制色）、`.tmp/e2e-r43-ui-preview.mjs`（预览态工具条/列位移）、`.tmp/e2e-r43-ui-find.mjs`（查找命中态/预览态按钮）、`.tmp/e2e-r43-ui-dialog.mjs`（设置遮罩与焦点陷阱）、`.tmp/e2e-r43-ui-previewfmt.mjs`（预览态点 H1）
- 原始输出：`.tmp/r43-ui-main-log.txt`、`.tmp/r43-ui-a11y-log.txt`、`.tmp/r43-ui-preview-log.txt`、`.tmp/r43-ui-find-log.txt`、`.tmp/r43-ui-dialog-log.txt`、`.tmp/r43-ui-previewfmt-log.txt`
- 截图：`shots/round-43/r43-ui-01 … r43-ui-32`（本角色文件；同目录 `bug-*`、`ship-*`、`typora-*` 是其他角色的，未动）
- 控制台：`main` / `a11y` / `preview` / `find` 四个脚本都挂了 `console` + `pageerror` 监听，输出 `CONSOLE_ERRORS []`、`REQ_FAILED []`；`dialog` 与 `previewfmt` 两个脚本没挂监听（前者那行 `CONSOLE_ERRORS []` 是脚本里的常量，不算证据）

## 截图矩阵

| 项 | 截图 |
| --- | --- |
| 空状态 浅色 1440 | `r43-ui-01-empty-light-1440.png` |
| 富文本 浅色 1440（H1–H3/列表/引用/表格/脚注） | `r43-ui-02-rich-light-1440.png` |
| 表格工具条 浅色 / 深色 | `r43-ui-03-table-toolbar.png`、`r43-ui-13-dark-tablebar.png` |
| 查找条 有结果 / 无结果 / 命中态 / 深色 | `r43-ui-04-findbar.png`、`r43-ui-05-findbar-noresult.png`、`r43-ui-28-find-hits-current.png`、`r43-ui-29-find-hits-next.png`、`r43-ui-14-dark-findbar.png` |
| 大纲 / 字数面板 | `r43-ui-06-outline.png`、`r43-ui-07-stats.png` |
| 设置 顶部 / 底部 / 遮罩 / 深色 | `r43-ui-08-settings-light.png`、`r43-ui-09-settings-bottom.png`、`r43-ui-31-settings-scrim.png`、`r43-ui-15-dark-settings.png` |
| 源码 / 预览 | `r43-ui-10-source.png`、`r43-ui-11-preview.png`、`r43-ui-30-preview-toolbar.png` |
| 深色富文本 1440 | `r43-ui-12-dark-rich-1440.png` |
| 窄窗 1024×700 深色 | `r43-ui-16-narrow-1024-dark.png` |
| 真实 125%（DPR 1.25） | `r43-ui-19-zoom125.png` |
| Mermaid 深色 | `r43-ui-18-mermaid-dark.png` |
| 批注抽屉 1024 | `r43-ui-21-rail-drawer-1024.png` |
| 强制色（Windows 高对比度） | `r43-ui-22-forced-colors.png` |
| 预览态表格条 / 删表后 / 退出后 | `r43-ui-24-preview-tablebar.png`、`r43-ui-25-preview-after-delete.png`、`r43-ui-26-after-exit-table.png`、`r43-ui-23-edit-table.png` |
| 设置点外关闭后 | `r43-ui-32-after-outside-click.png` |

---

## 发现

### F1（P1，新）「只读预览」里编辑命令仍生效：工具条 H1 与表格条「删表」改正文并触发自动保存

复现 A（工具条 H1，`.tmp/r43-ui-previewfmt-log.txt` + `shots/round-43/r43-ui-30-preview-toolbar.png`）：
1. 源码框载入 `# 标题一` + 两段普通文字，退出源码，光标点进第一段。
2. 点「预览」。读到 `BEFORE`：`.preview-pane` 里 `h1=1`、`strong=0`。
3. 在预览态点工具条 `H1`。`AFTER_H1_CLICK`：`.preview-pane` 里 `h1=1→2`，状态栏立刻出现「自动保存排队中」。
4. Esc 退出预览。`AFTER_EXIT`：`.editor h1=2`，改动留在正文里。

复现 B（表格条删表，`.tmp/r43-ui-preview-log.txt` + `r43-ui-24-preview-tablebar.png` / `r43-ui-25-preview-after-delete.png`）：
1. 同上，文档里带 2 行表格，先点单元格让表格条出现，再点「预览」。
2. `PREVIEW_STATE.tablebar = {display:"flex", visible:true, buttons:7}` —— 预览态仍然渲染整条「上插入 / 下插入 / 左插入 / 右插入 / 删行 / 删列 / 删表」。
3. 点「删表」（`clickErr:null`，说明按钮可点）。`before.rows=3 → after.rows=0`，预览里表格消失。
4. Esc 退出：`AFTER_EXIT = {tables:0, status:"…自动保存排队中"}`，改动进入保存队列。

代码：`src/App.tsx:3822-3829` 的 `run()` 没有视图守卫（直接 `command(editor.chain().focus()).run()`）；`src/App.tsx:4801` 的表格条只看 `editor?.isActive('table')`，不看 `viewMode`；`src/App.tsx:4675-4708` 的 H1/H2/B/I/S/`</>` 也没有 `disabled={viewMode !== 'edit'}`。同一排里只有 `src/App.tsx:4714-4733` 的「专注 / 打字机」写了 `disabled={viewMode !== 'edit'}`（实测预览态 `disabled:true`、`opacity 0.4`），第 39/42 轮又把查找替换在预览里整体锁死——同一份「只读」承诺现在三套行为。

影响：预览被文案和 `title`（`只读预览（Ctrl+Shift+P）`）承诺为只读，但点一下就会改正文并写盘（自动保存）。这与第 42 轮刚建立的数据安全口径相反，属于会静默改文件的界面缺陷。

建议：预览态把工具条编辑组、插入菜单、表格条一起 `disabled`（沿用「专注 / 打字机」的现成写法），或在 `run()` 里统一加 `if (viewMode !== 'edit') return`；表格条在预览态直接不渲染。

### F2（P2，新）进预览时正文列横向跳 139 px（同一篇字换一个位置）

实测（`.tmp/r43-ui-preview-log.txt` 的 `ALIGN_EDIT` / `ALIGN_PREVIEW`，截图 `r43-ui-02-rich-light-1440.png` 与 `r43-ui-11-preview.png`）：
- 编辑态 `.doc-column` 矩形 `[397,136,576,516]`；预览态 `.preview-column` 矩形 `[536,136,576,540]`。
- 宽度一致（576 px），**左边距从 397 变 536，向右跳 139 px**，标题和正文整体跳一下；两侧留白也从「左大右小」变成对称。

根因：`.doc-layout` 是 `grid-template-columns: minmax(0, 36rem) 260px`（`src/styles.css:264`，实测 `pad 52px 32px`、`gap 28px`、内容成组居中），预览把栏数改成一列（`src/styles.css:2353-2355` 的 `.doc-layout.preview-layout { grid-template-columns: minmax(0, 36rem) }`），于是「正文 + 页边栏」这一组居中的结果换成「正文单独居中」。

建议：给编辑态与预览态同一个左起点（例如两态都把 `.doc-column/.preview-column` 固定到同一 `padding-left`，或用 `margin-inline-start` 对齐），切换视图时正文不动。

### F3（P2，第 42 轮 F2 未修）表格工具条钉在窗口顶端，离表格 639 px；7 个按钮仍无 `aria-label`

实测（`.tmp/r43-ui-main-log.txt` 的 `TABLEBAR`，截图 `r43-ui-03-table-toolbar.png`、`r43-ui-13-dark-tablebar.png`）：
- 工具条 `[0,84,1440,36]`：贴左边 0、横跨整窗，紧跟工具栏；表格 `[392,759,576,110]`，**间距 639 px**（第 42 轮 742 px，数字变了，问题没变）。
- 7 个按钮 `aria-label` 全 `null`（`title` 本轮已有：`删除当前行` 等），字号 11.5 px、高 23 px。
- 本轮部分已修：删除三项用危险色——浅色 `rgb(180,69,58)`、深色 `rgb(232,145,127)`，与插入组 `rgb(35,84,77)` / `rgb(156,203,194)` 区分开；插入组与删除组之间也有分隔线（`r43-ui-03` 可见）。

影响：光标在文档底部的表格里时，改行/列要先把视线拉到窗口顶端，再回到表格；14 英寸屏上这段距离超出一次凝视范围。

建议：工具条贴住当前表格（sticky 到表格顶部或浮动在表格上方 8 px），或干脆并进工具栏右端并标「表格操作」；再补 `aria-label`（与 `title` 同文即可）。

### F4（P2，第 42 轮 F6 未修）1024 窄窗正文列反而宽到 756 px（44 汉字/行），比 1440 的 576 px 更宽

实测（`.tmp/r43-ui-a11y-log.txt` 的 `LAYOUT`、`.tmp/r43-ui-main-log.txt` 的 `NARROW_1024` / `ZOOM125`，截图 `r43-ui-16-narrow-1024-dark.png`）：
- 1440：`.doc-column` 576 px（33 汉字/行）；1024：**756 px（44 汉字/行）**；真实 125%（1152）回到 576 px。
- 1024 下没有横向溢出（`scrollWidth = clientWidth = 1024`），所以不是破版，是行长失控。

根因：`src/styles.css:2442` 在 `@media (max-width: 1119px)` 里写 `grid-template-columns: minmax(0, 1fr)`，把 `36rem` 上限去掉了；`.doc-column` 自己没有 `max-width`。

建议：窄窗也保留 `max-width: 36rem; margin-inline: auto`（零字节级改动），让行长不随窗口变窄而变长。

### F5（P2，第 42 轮 F8 未修）查找条没有 `role`/名称，命中计数没有 live region，输入框只有 placeholder

实测（`.tmp/r43-ui-main-log.txt` 的 `FINDBAR`，截图 `r43-ui-04-findbar.png`）：
- `.find-bar`：`role=null`、`aria-label=null`；`.find-count` 从 `1 / 3` 变 `无结果` 时 `role=null`、`aria-live=null`（`FINDBAR_NO_RESULT`）。
- 查找输入框 `aria-label=null`，只有 `placeholder="查找"`；替换框同理。
- 修好的一半：`Aa` / `ab` 有 `aria-pressed="false"`、↑ ↓ ✕ 有 `aria-label`（第 41 轮加的）。

代码：`src/components/FindBar.tsx:52`（`<div className="find-bar">` 无 role）、`:76`（`<span className="find-count">` 无 `role="status"`）。

建议：`.find-bar` 加 `role="search" aria-label="查找与替换"`；`.find-count` 加 `role="status" aria-live="polite" aria-atomic="true"`；两个输入框补 `aria-label`。读屏用户现在按 `Ctrl+F` 听不到「打开的是查找框」，也听不到命中数变化。

### F6（P2，第 42 轮 F10 未修 + 扩展）点击目标小于 24×24：设置复选框行 17 px、`I` 21×24、`</>` 37×21、状态栏字数 22×16

实测（`.tmp/r43-ui-main-log.txt` 的 `SETTINGS.rows`、`.tmp/r43-ui-a11y-log.txt` 的 `SMALL_TARGETS`）：
- 设置里两条 `label.field-check` 矩形高 **17 px**，`input[type=checkbox]` 只有 **13×13**（「自动保存（停笔 2 秒）」「智能标点与自动配对括号」）。同一面板里主题按钮高 30、输入框高 35。
- 工具条：斜体 `I` **21×24**、行内代码 `</>` **37×21**（`H1/H2/B/S` 都 ≥24 高）。
- 状态栏「0 字」触发入口 **22×16**（`.stats-trigger`，`src/components/StatusBar.tsx:43`、样式 `src/styles.css:1545`）。

标准：WCAG 2.2 AA 2.5.8 要求指针目标至少 24×24 CSS px（允许间距豁免）。设置页两项连排、行高 17 px，属于可点区域不足。

建议：`.field-check { min-height: 24px; align-items: center; padding-block: 3px }`，checkbox 放大到 16×16；工具条按钮统一 `min-width: 26px; min-height: 26px`；`.stats-trigger` 加 `padding-block: 4px`。

### F7（P2，第 42 轮 F9 未修）全应用没有 `:active` 按下态：鼠标按下与悬停完全一样

实测（`.tmp/r43-ui-a11y-log.txt` 的 `BTN_STATES`）：
- `.toolbar button` 静止 `bg rgba(0,0,0,0)` → hover `rgb(232,240,237)` → **mousedown 仍是 `rgb(232,240,237)`**，`transform` 两次都是 `none`。
- 全仓 `git grep -nE ":active" -- src` 命中 **0**（`src/styles.css:147` 只有 `:focus-visible`）。

影响：点「分析本段」「保存」「删表」这类有副作用的按钮时，没有按下反馈，只能靠结果确认点到了。

建议：加一条最小规则，例如 `button:active:not(:disabled), .toolbar button:active { transform: translateY(1px); background: var(--accent-wash-strong) }`，并在 `prefers-reduced-motion` 下只保留背景加深。

### F8（P2，新）「专注 / 打字机」两个开关没有 `aria-pressed`，与同排 6 个格式按钮不一致

实测（`.tmp/r43-ui-find-log.txt` 的 `ICON_BUTTONS`）：
- `H1`、`H2`、`B`、`I`、`S`、`</>` 六个按钮 `aria-pressed="false"`（第 42 轮加的），`class` 里有 `is-on`。
- `专注`、`打字机` 两个按钮 `aria-pressed=null`，只有 `className={focusMode ? 'is-on' : ''}`（`src/App.tsx:4714-4733`）。

影响：读屏用户听不到这两个模式是开还是关；同一排按钮里两套语义。

建议：补 `aria-pressed={focusMode}` / `aria-pressed={typewriterMode}`（与格式按钮同写法）。

### F9（P2，第 42 轮 F7 未修）H2/H3 行高 1.95 比 H1 的 1.35 松，标题节奏倒挂

实测（`.tmp/r43-ui-main-log.txt` 的 `TYPO`，截图 `r43-ui-02-rich-light-1440.png`）：
- `h1` 31.45 px / 42.46 px（**1.35**）；`h2` 22.44 px / 43.76 px（**1.95**）；`h3` 18.7 px / 36.47 px（**1.95**）；正文 17 px / 33.15 px（1.95）。
- H2 的行框（43.76）比 H1（42.46）还高，H3 的 36.47 也接近正文两倍。

代码：`src/styles.css:588-598` 的 `.doc-body h2/h3` 没写 `line-height`，继承 `.doc-body` 的 1.95；`.editor` 与 `.preview-column` 共用 `.doc-body`，预览同样（`PREVIEW.h1` 42.46 / `p` 33.15）。

对照 Typora（本轮实际打开 `shots/typora/01-live-preview.png`）：H1–H3 行高紧（约 1.25–1.3）、靠字号拉开层级；Sidelight 的 H3 反而比正文更松。

建议：`h2 { line-height: 1.45 }`、`h3 { line-height: 1.55 }`，其余不动。

---

## 与 Typora 对照（本轮实际打开 `shots/typora/01-live-preview.png`、`02-window-maximized.png`）

- **窗口顶部**：Typora 只有一行菜单，正文从 y≈90 开始；Sidelight 有 topbar（46）+ toolbar（38）两行，光标进表格再多一行表格条，正文从 y=136 开始。这是产品设计（工具栏常驻），未记为缺陷，但 F3 的「表格条多占一整行且离表格 639 px」让代价翻倍。
- **标题层级**：Typora 行高紧、字重 700，逐级靠字号压缩；Sidelight 用 600 + 衬线，H2/H3 行高 1.95（F9）。这是本轮唯一在排版节奏上明显落后 Typora 的一项。
- **正文行高**：Typora 约 1.7，Sidelight 1.95——中文衬线下的产品选择，未记为缺陷。
- **表格**：两边都是表头底色 + 单元格分隔线，Sidelight 额外有列宽拖拽（第 37 轮）；暗色下删除色已区分（F3 附属项已修）。
- **只读**：Typora 只有一个编辑视图，没有「只读预览」这一态，所以没有 F1 这类对照；Sidelight 的预览承诺只读，至少要像 Typora 的源码模式那样锁住编辑命令。
- **空状态**：Typora 首屏直接是正文；Sidelight 有占位文字和右侧「侧灯」栏提示，信息量更大，未记为缺陷。

---

## 试过、判断没有问题的项（都有本轮实测）

- **正文里 Esc 能离开正文**（第 42 轮 T2 复核，`.tmp/r43-ui-a11y-log.txt`）：`TAB_SEQ` 显示干净加载后 16 个停靠点依次是 跳到正文 → 文件 ▾ → 导出 ▾ → ? → 保存 → 设置 → 插入 ▾ → H1 H2 B I S `</>` → 专注 → 打字机 → 源码，每个都有 `solid 2px rgb(43,109,100)` 焦点环。第 42 轮把 Esc 做成正文出口，本轮 Tab 仍会被正文吃掉（插空格），但已有出口，按 WCAG 2.1.2 记「已缓解」，不再当缺陷。
- **可访问名零缺失**：`NAME_AUDIT_TOTAL 24`，可见交互元素 24 个，`NAME_NONE = []`、`NAME_TITLE_ONLY = []`。顶栏 `?` 按钮 `aria-label="快捷键"`（不是只靠字形），`批注` 按钮 `aria-label="批注（0 条）"`，表格条 7 个按钮靠可见文字得名。
- **深色对比度全部过 AA**（`DARK_CONTRAST`）：正文 / 标题 / 列表 / 表格单元 14.42:1、引用 7.92:1；表格条文字 11.72:1（浅色 `rgb(156,203,194)`）。未发现暗色对比度不足的组件。
- **设置对话框的语义与焦点陷阱**（`.tmp/r43-ui-dialog-log.txt`）：`role=dialog aria-modal="true" aria-label="设置"`、`aria-labelledby=settings-title`；打开后焦点在「浅色」；连按 24 次 Tab 全在对话框内（`FOCUS_TRAP` 每站 `inside:true`）；点遮罩外关闭（`CLICK_OUTSIDE_CLOSED true`，截图 `r43-ui-32-after-outside-click.png`）；遮罩是 `rgba(18,20,22,0.3)` + `backdrop-filter: blur(2px)`。
- **查找命中态可区分**（`.tmp/r43-ui-find-log.txt` 的 `HITS_1`/`HITS_2`）：当前命中 `.find-hit.is-current` 背景 `…0.48`，其余 `.find-hit` `…0.22`；点「下一处」后高亮跟着换位、计数 `1 / 4 → 2 / 4`（截图 `r43-ui-28`、`r43-ui-29`）。
- **1024 窄窗的批注抽屉可用**（`RAIL_TOGGLE_VISIBLE true`、`RAIL_DRAWER`）：`.rail-toggle` 显示（47×28，`aria-label="批注（0 条）"`），点开抽屉 `[684,0,340,700]`、有关闭按钮 `aria-label="关闭批注"`、有遮罩；Esc 关闭后焦点回到 `.rail-toggle`（`RAIL_AFTER_ESC`）。
- **真实 125% 缩放**（`ZOOM125`）：`dpr 1.25 / innerWidth 1152`，正文列 576 px，`scrollWidth = 1152` 无横向溢出（截图 `r43-ui-19-zoom125.png`）。
- **`prefers-reduced-motion`**（`REDUCED_MOTION`）：按钮 `transition/animation 1e-05s`。
- **强制色模式布局不破**（`FORCED`、`r43-ui-22-forced-colors.png`）：工具栏、页签、正文、状态栏全部改用系统色，无溢出。
- **字数面板语义**（`STATS`）：`role=dialog aria-label="字数明细"`，360×325，数值列右对齐。
- **大纲、Mermaid**：大纲三级标题正常缩进（`r43-ui-06-outline.png`）；Mermaid 深色下渲染成 svg（`MERMAID.svg true`，108×358，无错误节点，`r43-ui-18-mermaid-dark.png`）。
- **控制台与网络**：`main`/`a11y`/`preview`/`find` 四个脚本 `CONSOLE_ERRORS []`、`REQ_FAILED []`。

## 其他观察（有证据，未单列为发现）

- **状态栏与工具栏的深色对比度计算值不可信**：`DARK_CONTRAST` 里 `.status-bar` / `.toolbar button` 的背景是 `color(srgb …)` 形式，旧公式算不出比值（输出 `604983183.13`）。这不是产品问题，是我的取样函数没解析新颜色格式；这两处颜色取自第 42 轮同组件实测（7.95 / 9.26），本轮没有新的失效证据。
- **设置面板底部内容贴边**：`.settings-body` 滚动到底时最后一行「协议按 OpenAI 兼容走…」紧贴底部按钮条（`r43-ui-09-settings-bottom.png`），间距约 12 px，可用但偏挤；可按需给 `.settings-body` 加 `padding-bottom`。
- **`.settings-overlay` 的 `backdrop-filter: blur(2px)` 在 headless 截图里看不出模糊**（`r43-ui-08-settings-light.png` 背后正文清晰、亮度未明显降）。计算样式确证有遮罩与模糊，判断为 headless 渲染差异，不记为产品缺陷，见 UNVERIFIED。
- **`src/styles.css:2454-2467` 与 `2469-2472` 是媒体查询内重复声明**：`.rail-count` / `.rail-toggle` 两段与顶层 `:903`、`:2416` 的同名规则重复，缩进也与其他规则不一致（`2450-2452` 一个块只有 1 条声明）。功能无影响，属代码卫生，提醒下一轮顺手删。

## UNVERIFIED

- **屏幕阅读器实录**：只做 DOM 层审计（role、可访问名、`aria-*`、live region、焦点顺序），没有 NVDA / 讲述人实际播报。F5/F8 的实际播报体验未验证。
- **设置遮罩的真实模糊**：`backdrop-filter: blur(2px)` 只有计算样式，headless 截图不体现模糊；真机 WebView2 里的效果未验证。
- **真实 Windows 150% / 200% 系统缩放与宿主内表现**：本轮 125% 用 CDP DPR 模拟，宿主里的系统缩放未测。
- **批注卡（页边）的完整交互**：本轮只测了 1024 抽屉的开合与 Esc 回焦；批注卡内部的采纳/追问按钮 hover/focus 未重跑（没有 AI key，需模拟流）。
- **真实文件树有文件的状态、右键菜单/确认框**：headless 下无法点 FSA 系统 picker，本轮未覆盖。
- **真实中文输入法组合输入、打印样式、macOS 快捷键**：未测。
- **`forced-colors` 下空状态占位文字**：本轮文档有内容，`.editor-placeholder` 不存在（`placeholderColor null`），第 42 轮记录的同色问题未复验。
