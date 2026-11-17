# 第 41 轮 界面美观与可访问性 侦察报告（finder-ui）

- 轮次：41；轮前 `startSha=25297acee40d40fec4bcbe770c416f43faaf2d7a`（本轮 `git rev-parse HEAD` 一致，工作区干净）
- 环境：dev server `http://localhost:5175`（未重启、未另起）、CDP **9226**（`node .tmp/reset.mjs 9226` 起跑）、视口 1440×900 / 1024×700 / 1152×720 + DPR 1.25、浅色 / 深色（真实路径：设置 → 深色｜浅色 → 保存）
- 只读产品代码，未改 `src/`；未 push、未动 `release/`
- 脚本：`.tmp/e2e-r41-ui-main.mjs`（矩阵）、`.tmp/e2e-r41-ui2.mjs`（批注卡 / Tab / 选区 / 文件树 / 空状态）、`.tmp/e2e-r41-ui3.mjs`（Tab 缩进后果 / 文件菜单 / 导出 toast / 窄窗宽表）、`.tmp/e2e-r41-ui4.mjs`（Tab → 代码块探针）
- 原始输出：`.tmp/r41-ui-log.txt`、`.tmp/r41-ui-log2.txt`、`.tmp/r41-ui-log3.txt`、`.tmp/r41-ui-log4.txt`
- 截图：`shots/round-41/r41-ui-01 … r41-ui-39`（本角色文件；目录里 `bug-*`、`ship-*`、`t*` 是其他角色的，未动）
- 控制台：4 个脚本 `CONSOLE_ERRORS` 全为 `[]`，请求失败全为 `[]`

## 截图矩阵

| 项 | 截图 |
| --- | --- |
| 空状态 浅色 1440 / 深色 1440 / 浅色 1024 | `r41-ui-01-empty-light-1440.png`、`r41-ui-37-empty-dark-1440.png`、`r41-ui-38-empty-light-1024.png` |
| 富文本 浅色 1440（含焦点框） | `r41-ui-02-rich-light-1440.png`、`r41-ui-03-editor-focus.png` |
| 表格工具条 | `r41-ui-04-table-toolbar.png` |
| 查找条（有结果 / 无结果） | `r41-ui-05-findbar.png`、`r41-ui-06-findbar-noresult.png` |
| 大纲（三级） | `r41-ui-07-outline.png` |
| 字数面板 1440 / 1024 | `r41-ui-08-stats-panel.png`、`r41-ui-18-narrow-stats.png` |
| 设置 浅色 顶部 / 滚到底部 / 深色 | `r41-ui-09-settings-light.png`、`r41-ui-10-settings-bottom.png`、`r41-ui-14-settings-dark.png` |
| 源码 / 预览 浅色 / 预览深色 | `r41-ui-12-source-light.png`、`r41-ui-13-preview-light.png`、`r41-ui-16-preview-dark.png` |
| 深色正文 1440 | `r41-ui-15-rich-dark-1440.png` |
| 窄窗 1024 深色 / 8 列宽表 | `r41-ui-17-narrow-1024-dark.png`、`r41-ui-35-narrow-wide-table.png` |
| 真实 125%（DPR 1.25） | `r41-ui-19-zoom125.png` |
| Mermaid 深色渲染 / 切浅色后 | `r41-ui-20-mermaid-dark.png`、`r41-ui-21-mermaid-after-light.png` |
| 批注卡（模拟流） | `r41-ui-24-annotations-card.png` |
| 工具栏（光标在加粗里）/ 插入菜单 | `r41-ui-22-toolbar-in-bold.png`、`r41-ui-23-insert-menu.png` |
| 正文 Tab 缩进 / 源码里的缩进 / 重解析成代码块 | `r41-ui-25-tab-indent.png`、`r41-ui-32-source-tab-indent.png`、`r41-ui-39-tab-becomes-code.png` |
| 选区字数 | `r41-ui-26-selection.png` |
| 文件菜单 / 导出 toast / 文件树空状态 | `r41-ui-33-file-menu.png`、`r41-ui-34-toast.png`、`r41-ui-36-file-tree.png` |

---

## 发现

### F1（P1，新）正文段首按 Tab 缩进，保存/重开后被解析成代码块（正文类型被静默改写）

复现（`.tmp/r41-ui-log3.txt`、`.tmp/r41-ui-log4.txt`）：
1. 打开任意文档，光标放到一个普通段落开头。
2. 按 `Tab` 两次（每次插 2 个空格，`src/App.tsx:842-850`）。
3. 点「源码」：markdown 变成 `\n\n    桌上有一盏台灯…`（4 个前导空格，`SOURCE_AFTER_TABS`）。
4. 点回编辑模式（与打开文件同一条 `manager.parse` 路径）：该段落变成 `<pre><code>桌上有一盏台灯…</code></pre>`，`p` 数 2 → 1、`pre` 数 0 → 1（`AFTER_ROUNDTRIP`；截图 `r41-ui-39-tab-becomes-code.png`）。
5. 按 4 次 Tab 是 8 个空格，同样越线。

影响：中文写作的常见习惯就是段首 Tab 缩进两字；这个动作会改写文档语义（正文 → 代码块），下次打开时用户会看到整段变成代码。整个过程中界面没有任何提示，源文里只是多了几个看不见的空格。

建议：正文（非列表、非表格）里的 Tab 不要插入字面空格——改成「首行缩进」的 block 属性、插入全角空格「　」两个（markdown 里不会触发代码块），或干脆把 Tab 让给焦点（`App.tsx:842-850` 直接 `return false`）；同时保证 4 空格缩进的行在反序列化时仍按普通段落处理。

### F2（P2，第 40 轮 F2 未修）切换主题不重画 Mermaid：浅色页面上留一张深色节点图

过程：文档内含 ```mermaid 图 → 在深色主题下渲染（节点 `fill rgb(31,32,32)`、描边 `rgb(204,204,204)`）→ 设置切「浅色」并保存 → 图不变（`MERMAID_DARK_RENDER` / `MERMAID_AFTER_LIGHT_SWITCH` 两次取到的 fill/stroke 完全相同）。截图 `r41-ui-21-mermaid-after-light.png`：白纸黑字正文里挂着一张深色方框图。

根因（读码）：`src/lib/mermaidPreview.ts:16` 的 `svgCache` 只用代码 hash 作键；`:58-62` 命中缓存就不再重画。`src/lib/mermaidLazy.ts` 只在模块 `initialize` 时读一次 `data-theme`。
建议：缓存键加主题（`hash + theme`），主题变化清缓存重画；`themeVariables` 接现有 CSS 变量。

### F3（P2，第 40 轮 F7 未修）表格工具条仍全宽、离表格 742 px、7 个按钮无标签、删除与插入同色

实测（`TABLEBAR`、截图 `r41-ui-04-table-toolbar.png`）：
- 工具条 `[0,84,1440,36]`（整行贴 left 0，右侧约 1000 px 空白），表格矩形 `y=826`，**间距 742 px**；出现时正文列从 y=136 被推到 172。
- 7 个按钮 `aria-label` 全 null、`title` 全空；字号 11.5px、高 23px；`上插入/下插入/左插入/右插入/删行/删列/删表` 文字色**全部** `rgb(35,84,77)`，删除类没有危险色（`src/App.tsx:4711-4729`、`src/styles.css:1877-1902` 只有 accent 色）。
- 没有分组/分隔线。
建议：工具条贴住表格（sticky 或用 floating 定位），插入组与删除组之间加分隔线，删除三项用 `--danger`，补 `title`/`aria-label`。

### F4（P2，第 40 轮 F6 未修）空文档与正文整列画 2px 青绿焦点框

实测（`EMPTY`、`EMPTY_DARK`、`FOCUS_RING_EDITOR`）：首启空文档里 `.editor` 自动拿到焦点，`outline: solid 2px rgb(43,109,100)`，框把整列正文圈成矩形，里面只有占位文字「从这一句开始写」（截图 `r41-ui-01-empty-light-1440.png`）；深色下是 `rgb(156,203,194)`（截图 `r41-ui-37-empty-dark-1440.png`）；富文本文档里整列 `576×884` 都带框（截图 `r41-ui-02-rich-light-1440.png`、`r41-ui-03-editor-focus.png`）。
根因：`src/styles.css:147-150` 全局 `:focus-visible` 命中 `div.tiptap.ProseMirror.editor`。
建议：`.editor:focus-visible { outline: none }`，键盘进入提示改成 caret 或顶部一条细线。

### F5（P2，第 40 轮 F9 未修）工具栏格式按钮没有按下态，也没有 `aria-pressed`

实测（`TOOLBAR_STATE`、截图 `r41-ui-22-toolbar-in-bold.png`）：光标放进 `**加粗的文字**` 内部后，`B` 仍然是 `class=""`、`aria-pressed=null`、`background rgba(0,0,0,0)`、文字色 `rgb(86,92,97)` 与静止态相同；全页 `[aria-pressed]` 数量 **0**。H1/H2 连 `title` 都没有。
建议：按 `editor.isActive('bold'/'italic'/'strike'/'code'/'heading', {level})` 给 `is-on` + `aria-pressed`，样式用 accent 底/字（与侧栏选中一致）。

### F6（P2，第 40 轮 F8 未修）「插入 ▾」菜单没有 menu 语义，Esc 后焦点掉到 BODY

实测（`INSERT_MENU`、`INSERT_AFTER_ESC`、截图 `r41-ui-23-insert-menu.png`）：
- 触发按钮 `aria-expanded` / `aria-haspopup` 均 null；弹出层 `div.menu` 的 `role` / `aria-label` 均 null；9 个菜单项 `role` 全 null、`tabIndex` 全 0；打开后焦点留在触发按钮。
- 在菜单项上按 `Esc`：菜单关闭，`document.activeElement` 变成 **BODY**（`src/App.tsx:3568-3572` 只还原 `exportTriggerRef`，`menuOpen` 没有还原）。
- 对照「文件 ▾」（`FILE_MENU`）：`aria-expanded=true`、`aria-haspopup=menu`、`role=menu`、打开即聚焦「新建」，Esc 能回焦；插入菜单应复用同一套。
建议：补 `aria-haspopup/expanded`、`role=menu/menuitem`、roving tabindex，Esc 后 `focus()` 回「插入」；顺带按插入类 / 公式类 / 链接分组。

### F7（P2，新）查找结果计数没有 live region：屏幕阅读器听不到「1 / 1」和「无结果」

实测（`FINDBAR_HIT`、`FINDBAR_EMPTY_RESULT`）：`.find-count` 文本 `1 / 1` → `无结果` 时 `role=null`、`aria-live=null`，颜色从 `rgb(86,92,97)` 变 `rgb(102,108,114)`（视觉上更淡，但无结果和「0 个」之外没有语气差别）。输入框靠 `placeholder="查找"` 取名，`aria-label` 为 null（Chromium 可用）；上一处/下一处有 `aria-label`，替换/全部替换只有文字。
代码：`src/components/FindBar.tsx:67-68` 的 `<span className="find-count">` 无 `role`/`aria-live`。
建议：`.find-count` 加 `role="status" aria-live="polite" aria-atomic="true"`（与 toast 的做法一致），无结果时文本加「无结果」并保留计数。

### F8（P3，第 40 轮 F10 部分未修）可点目标仍小于 24×24

实测（`TARGETS`、`RAIL_CARD`）：
- 斜体 `I` **21.2×24**、行内代码 `</>` **37.3×21**、状态栏字数 **116.9×16**、批注卡按钮高 **22**（知道了 54×22 / 追问 42×22 / 联网核对 66×22，`src/styles.css:1070-1074` 的 `padding:2px 8px;font-size:12px`）。
- 大纲折叠按钮 24×24 已达标。
- WCAG 2.2 AA 2.5.8 最小 24×24；建议统一 `min-height:24px`（图标按钮保 24 高、加宽点击区），批注卡按钮加 padding。

### F9（P3，第 40 轮「其他观察」坐实）H2/H3 行高 1.95 大于 H1 的 1.35，标题节奏倒挂

实测（`TYPO`、截图 `r41-ui-13-preview-light.png`）：h1 `31.45px / 42.46px（1.35）`，h2 `22.44px / **43.76px**（1.95）`，h3 `18.7px / **36.47px**（1.95）`。H2 单行行框比 H1 还高，`1.1 节奏` 与上一段、下一段之间的空白明显大于 H1 周围。
代码：`src/styles.css` 的 `.doc-body h2/h3` 没写 `line-height`，继承 `.doc-body` 的 `1.95`。
与 Typora 对照（`shots/typora/01-live-preview.png`）：Typora 的 H1–H3 行高紧（约 1.2–1.3），层级靠字号；Sidelight 层级靠行高和 margin 一起，H2/H3 反而更松。建议 h2 `1.45–1.5`、h3 `1.5–1.6`，同时把 `margin` 收一点。

### F10（P3，新）1024 窄窗正文列反而变宽到 756 px（33 → 44 汉字/行）

实测：1440 下 `.doc-column` 576 px（36rem，约 33 个汉字/行）；1024 下 **756 px**（约 44 个/行）；125%（1152 视口）572 px。窗口越窄行长越长，与「窄窗更好读」的直觉相反。
根因：`src/styles.css:2389` 的 `@media (max-width: 1119px)` 里 `.doc-layout { grid-template-columns: minmax(0, 1fr) }`（`:2408-2410`）把 36rem 上限去掉，且没给 `.doc-column` 单独的 `max-width`。
建议：窄窗也保留 `max-width: 36rem; margin-inline: auto`（或 32–36rem 之间自适应），列宽不随窗口变大。

---

## 与 Typora 对照（本轮实际打开 `shots/typora/01-live-preview.png`）

- **预览排版已追平编辑态**（第 40 轮 F1 修复）：Sidelight 预览 576 px 列 / 衬线正文 17px / 1.95、表格 1px 边框 + 表头底色、引用 2px 左边线，与编辑态逐个数值相同（`PREVIEW` 与 `TYPO` 对照）。Typora 的行高约 1.7、标题更重（700），Sidelight 用 600 + 衬线，属产品选择，不算缺陷。
- **标题节奏**：Typora H1→H3 逐步收紧；Sidelight H2/H3 行高 1.95 比 H1 松（F9）。
- **表格**：两边都是表头底色 + 单元格分隔线，样式接近。
- **源码/预览切换**：Typora 是单一视图（源码模式即源码），Sidelight 是顶栏「源码 / 预览」双入口，属已有设计差异，未记为缺陷。

---

## 试过、判断没有问题的项（都有本轮实测）

- **预览排版（第 40 轮 F1 已修）**：`.preview-pane` 576 px、x=536，h1 `31.45/42.46`、p `17/33.15`、h2 `22.44/43.76`、blockquote `border-left 2px + padding 16`、`th` 边框 1px + 底色 `rgb(232,240,237)`、KaTeX 1 处；深色预览正文 `rgb(233,230,224)` 与编辑态同色（`PREVIEW` / `PREVIEW_DARK`，截图 13/16）。
- **字数面板（第 40 轮 F4 已修）**：`360×325`（原 941），标签 x=31 / 数值 x=340–354，`role=dialog`、打开即聚焦、Esc 回焦；1024 下占 35% 宽，不再盖住窗口（`STATS` / `NARROW_STATS`，截图 08/18）。
- **设置对话框底部（第 40 轮 F5 本轮未复现）**：滚到底后最后一段 `[770,809]`、sticky 页脚 `[823,859]`，重叠 **0 px**（`SETTINGS_BOTTOM`，截图 10）。
- **文件菜单**：`aria-haspopup=menu`、`aria-expanded=true`、`role=menu`、打开即聚焦「新建」、6 项（`FILE_MENU`，截图 33）。
- **导出菜单与 toast**：`role=menu`，4 项（HTML / Markdown / 纯文本 / 打印PDF）；导出后 `role=status aria-atomic=true`，toast `[667,825,106,20]`，状态栏顶 872，不重叠（`TOAST`，截图 34）。
- **深色对比度**：正文 14.42:1、h1/h2 14.42、工具栏 9.26、状态栏 7.95、侧栏 tab 7.95、引用 7.92、行内代码 11.02、表头 11.02，全部过 AA（`CONTRAST_DARK`）。
- **窄窗 1024×700**：`documentElement.scrollWidth = clientWidth = 1024`，无横向溢出；`.margin-rail` 隐藏 + 「批注」开关 47×28（x=965）；工具栏 `flex-wrap: wrap`、高 38 不溢出；8 列表格 766 px 不溢出；超长 URL 自动折行不溢出（`NARROW` / `NARROW_WIDE`，截图 17/35）。
- **真实 125%**：`devicePixelRatio=1.25`、`innerWidth=1152`、`scrollWidth=1152`，正文列 572 px（`ZOOM_125`，截图 19）。
- **reduced-motion**：`prefers-reduced-motion: reduce` 下按钮 `transition/animation: 1e-05s`（`REDUCED_MOTION`）。
- **hover / disabled**：`.stats-trigger`、工具栏按钮、非选中 tab hover 统一 `--accent-wash` 底 + `--accent-ink` 字；「分析本段（模拟）」空文档时 `disabled` + `opacity .4`（`HOVER`、`EMPTY`）。
- **可访问名**：37 个 `button` 全部有可访问名（无「图标按钮无名字」）；`lang=zh-CN`；正文 `aria-label="正文编辑器"`；`h1` 计数 1（`A11Y`）。
- **源码框**：13px / 24.05px 行高、进入即聚焦、`tabIndex=0`（`SOURCE`，截图 12）。
- **文件树空状态**：标题 + 一行说明 + 「打开文件夹…」按钮 189×35，`aria-label="文件树"`（`FILE_TREE`，截图 36）。
- **选区字数**：状态栏出现「选区 30 字」`[139,877,72,20]`，与「105 字 · 阅读约 1 分钟」并排不重叠（`SELECTION_STATUS`，截图 26）。
- **大纲**：三级缩进 0 / 10 / 20 px、行高 24、当前项 `aria-current="location"`（`OUTLINE`，截图 07）——缩进仍是 10 px 步进，偏小，见 F8 同类问题，不再单列。

## 其他观察（有证据，未单列为发现）

- **改稿后旧批注仍按原条数显示，不标「未定位」**：用源码模式整体替换正文后，页边 2 张卡的引文（「引号挤压」…）已不在正文里，卡片照常显示「第 1 处 / 第 2 处」，没有失效提示（截图 `r41-ui-21-mermaid-after-light.png` 右侧）。
- **「插入 ▾」静止态已经是 accent 底色，hover 无变化**：base bg `rgb(232,240,237)` = hover bg，hover 没有反馈（`HOVER`）。
- **Mermaid 代码块与预览图同时显示**（`mermaidPreview.ts:9-13` 明写「在代码块下面挂一个预览 widget」），与 Typora 替换式预览不同，属设计选择。
- **预览不渲染 Mermaid**：预览里 mermaid fence 仍是代码块（`PREVIEW.svg = 0`），README 已写明「预览面板不含图」。

## UNVERIFIED

- **屏幕阅读器实录**：只做 DOM 层审计（角色、可访问名、aria-*、焦点），没有 NVDA/讲述人实际播报。
- **真实 Windows 125%/150%/200% 与 WebView2 宿主**：125% 用 Chromium CDP `deviceScaleFactor=1.25` 验证；宿主里的系统缩放未测。
- **Tab 缩进经过真实写盘再打开**：本轮用「源码 → 编辑」同一条 `manager.parse` 路径证明会变代码块（`AFTER_ROUNDTRIP`），没有走 FSA / 宿主写回的真实文件路径；补测方法：有工作区时按 Tab 后 Ctrl+S，关闭再打开同名文件看是否 `<pre>`。
- **真实文件树有文件的状态、真实右键/确认框**：headless 下无法点 FSA 系统 picker，只截到空文件夹状态。
- **真实中文输入法组合输入、打印样式、macOS 快捷键**：本轮未测。
- **「跟随系统」主题**：只验证显式「浅色 / 深色」两条路径，`prefers-color-scheme` 分支没在深色系统上跑。
- **长文批注定位/滚动跟随、页边批注在窄窗抽屉里的布局**：本轮只截宽窗卡片（`r41-ui-24`），窄窗抽屉未展开测。
