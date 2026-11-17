# 第 46 轮 界面美观与可访问性 侦察报告（finder-ui）

- 轮次：46；轮前 `startSha=39e4f0211f43b7edaca82d468d0997f029151e3c`，本轮 `git rev-parse HEAD` 与之一致（只读产品代码，未改任何文件；新增只有 `docs/iteration/round-46/` 与 `shots/round-46/`）
- 环境：dev server `http://localhost:5175`（未另起、未重启）；CDP **9226**；每个脚本前跑 `node .tmp/reset.mjs 9226`
- 视口 / 主题矩阵：1440×900（浅色 + 深色）、1024×700、深色预览、深色首载（新页面）
- 脚本与原始输出：
  - `.tmp/e2e-r46-ui-main.mjs` → `.tmp/r46-ui-main-log.txt`（富文本文档、排版测量、文件树、大纲、工具栏、设置、查找、表格条、遮罩/提示）
  - `.tmp/e2e-r46-ui-2.mjs` → `.tmp/r46-ui-2-log.txt`（字数面板、快速打开、快捷键一览、链接浮层、保存提示条、源码视图、Tab 顺序、1024、reduced-motion、深色全量对比度、深色首载 Mermaid 对照）
  - `.tmp/e2e-r46-ui-3.mjs` → `.tmp/r46-ui-3-log.txt`（Mermaid 切主题取证、对话框底部重叠、字号阶梯、大纲几何）
  - `.tmp/e2e-r46-ui-4.mjs` → `.tmp/r46-ui-4-log.txt`（模拟批注页边栏复核、链接浮层真实点击外部）
  - `.tmp/e2e-r46-ui-5.mjs` → `.tmp/r46-ui-5-log.txt`（设置对话框底部干净截图）
- 控制台：脚本 2、3、4 全程 `CONSOLE_ERRORS []`、无 pageerror。（脚本 1 在我自己写错的选择器 `.statusbar .stat-button` 上超时中断，产品无报错；该段在脚本 2 重跑，正确选择器是 `.stats-trigger`）
- 未 push、未动 `release/`

## 截图矩阵（全部在本轮 `shots/round-46/`）

| 项 | 截图 |
| --- | --- |
| 富文本浅色 1440（H1–H4、列表、表格、引用） | `r46-ui-01-rich-light-1440.png` |
| 文件树 5 个文件 | `r46-ui-02-file-tree.png` |
| 大纲（4 级标题） | `r46-ui-03-outline.png`、`r46-ui-31-outline-light.png` |
| 设置面板浅色 / 深色 / 700 高 | `r46-ui-04-settings-light.png`、`r46-ui-23-settings-dark.png`、`r46-ui-30-settings-700.png` |
| 设置底部被裁（干净取证） | `r46-ui-35-settings-bottom-clean.png`、`r46-ui-36-settings-bottom-scrolled.png` |
| 查找条 | `r46-ui-05-find.png` |
| 表格工具条 | `r46-ui-06-table-bar.png` |
| 字数明细 | `r46-ui-14-stats.png` |
| 快速打开（有 5 个文件） | `r46-ui-15-quick-open-light.png` |
| 快捷键一览 | `r46-ui-16-shortcuts.png`、`r46-ui-29-shortcuts-bottom.png` |
| 链接就地编辑浮层 / 点外部后仍滞留 | `r46-ui-17-link-editor.png`、`r46-ui-32-link-after-outside-click.png` |
| 保存失败提示条 | `r46-ui-18-toast.png` |
| 源码视图 | `r46-ui-19-source.png` |
| 窄窗 1024×700 | `r46-ui-20-narrow-1024.png` |
| 深色富文本 / 深色预览 | `r46-ui-22-dark-rich.png`、`r46-ui-24-dark-preview.png` |
| Mermaid 切主题后未重绘 | `r46-ui-26-mermaid-theme-stale.png` |
| Mermaid 深色首载（对照，正常） | `r46-ui-25-mermaid-dark-first.png` |
| 批注卡被「整体评价」压住 | `r46-ui-33-rail-notes.png` |
| 窄窗抽屉里第 3 张卡按钮被面板切掉 | `r46-ui-34-rail-drawer-1024.png` |

---

## 发现

### F1（P1，第 45 轮 F1/F2 未修）页边「整体评价」面板仍压住批注卡：第 1 张卡的 3 个按钮仍然点不到，模拟批注提示仍完全看不见

复现：1440×900 打开多段文档 → 光标在第一段 → 点顶栏「分析本段（模拟）」→ 等 3 张卡出现。

实测（`.tmp/r46-ui-4-log.txt` 的 `RAIL`、`RAIL_NOTICE_HIT`、`RAIL_A11Y`，截图 `r46-ui-33`、`r46-ui-34`）：

- 三张卡 `评价 [996,200,260,164]`、`修订 [996,376,260,202]`、`评价 [996,590,260,144]`；`.rail-overall` `[996,262,260,93]`，与卡 0 **纵向重叠 93 px**。
- 卡 0 的 3 个按钮（知道了 / 追问 / 联网核对）逐个 `elementFromPoint`：**`blockedButtonsInCard0: 3`**，全部被面板挡住。截图 `r46-ui-33` 里卡 1 只剩「评价 模拟 第 1 处 + 引文」，正文被「整体评价…收起」整块盖住。
- 提示 `.rail-notice-mock` `[996,200,260,50]` 与卡 0 完全重叠（`noticeCoveredByCard0: 50`），提示中心命中卡里的 `SPAN.note-kind-evaluation`（`insideNotice: false`）。宽窗下这一行「未配置 API Key，下面是本地模拟批注，不调用模型」一个字都看不到。
- 窄窗抽屉同一问题：卡 3 `[701,476,297,144]`、面板 `[701,591,297,93]`，**重叠 28 px**；三个按钮在 `y 589..611`，面板从 591 起，按钮下半被切掉（截图 `r46-ui-34`）。
- 卡片仍不可聚焦：`tabIndex -1`、`role null`、`cursor auto`（第 45 轮 F6 也未修）。
- 根因未变：卡片 `position: absolute`（`src/styles.css:953`）只按正文坐标定位（`src/App.tsx:1951-1973`：`coordsAtPos` + 上一张卡底部 floor，页边栏自身流入内容不参与计算）；`.rail-overall` 用 `position: sticky; bottom: 0`（`src/styles.css:802`），面板自然位置高于视口底部时 sticky 不生效，就停在栏中间当挡板。

建议：给卡片容器加 `padding-bottom` = 面板高（或把「整体评价」移出滚动区，卡片区单独滚动）；面板 `pointer-events: none`，交互只留在内部按钮上。抽屉里同法处理。

### F2（P1，新）深色主题切换后 Mermaid 图不重绘：连线和箭头 `#333` 落在 `#1c1f23` 上，对比度 **1.31:1**，结构信息看不见

复现：浅色打开含 ```` ```mermaid ```` 的文档（图已渲染）→ 设置 → 深色 → 保存 → 滚到图处。

实测（`.tmp/r46-ui-3-log.txt` 的 `MERMAID_STALE_RAW`、`MERMAID_STALE_CONTRAST`，截图 `r46-ui-26`）：

- 切到深色后：容器背景 `rgb(28,31,35)`，SVG 内 4 个节点文字与 5 条连线全部 `rgb(51,51,51)`；**连线对容器 1.31:1、标签对容器 1.31:1**（WCAG 1.4.11 图形对象要求 3:1）。
- 截图 `r46-ui-26`：浅紫节点块还看得见，**箭头、连线和「是」的深色文字几乎完全消失**，只剩几块亮色方框。
- 对照：新开页面在深色下首载同一文档，Mermaid 用 `dark` 主题渲染，连线 `rgb(211,211,211)`、节点 `fill #1f2020`/`stroke #ccc`（`MERMAID_DARK_FIRST`，截图 `r46-ui-25`），完全正常。
- 根因：`src/lib/mermaidLazy.ts:29` 的 `initialized` 只初始化一次，`configure()`（`:57-65`）读一次 `themeName()`；SVG 按代码 hash 缓存（`:31`、`:92-100`），切主题既没重置 `initialized` 也没清缓存。`src/App.tsx` 切主题只改 `data-theme`。
- 影响：习惯浅色写作的用户一旦切深色，所有图表变瞎；反向（深色首载后切浅色）同样会出现深色图落在浅底上。

建议：监听 `data-theme` 变化或有主题版本号参与 `svgCache` 的 key；主题变了就 `__resetForTest()` 式的重初始化（`initialized = false` + `svgCache.clear()` + 重新渲染可见块）。若嫌重，至少给 `.mermaid-preview.is-light-rendered` 在深色下加一块 `background: #f6f4ee` 底板，让浅色图完整可见。

### F3（P2，新）设置里的「主题」单选组：3 个按钮 3 个 Tab 站，方向键完全无效（不符合 `role="radiogroup"` 的键盘约定）

复现：设置 → Tab 到主题组 → 按 `ArrowRight`。

实测（`.tmp/r46-ui-main-log.txt` 的 `THEME_KEYS`、`SETTINGS_BOX`）：

- 三个 `role="radio"` 按钮 `tabIndex` 全是 `0`（`radioRect` 三条），键盘要走 3 站才过这一组。
- 焦点在「跟随系统」（`aria-checked=true`）时按真实 `ArrowRight`：`focus` 仍是「跟随系统」、`checked` 仍是 `["false","false","true"]`、`data-theme` 仍是 `system` —— **没有移动焦点，也没有改变选中**。
- 代码：`src/components/SettingsDialog.tsx:43-70` 三个 `<button role="radio">`，没有 roving tabindex，也没有 `onKeyDown`。

建议：按 WAI-ARIA radio group 模式改：只有选中项 `tabIndex=0`，左右/上下键切换并移动焦点，或者干脆换回原生 `<input type="radio">`（原生就带这行为，还能省 CSS）。

### F4（P2，新）大纲里每个有子标题的标题占两个 Tab 站，折叠三角在焦点序列里排在下一条标题之前

复现：大纲页签 → 焦点放在第一个标题 → 连按 Tab。

实测（`.tmp/r46-ui-main-log.txt` 的 `OUTLINE`、`OUTLINE_TAB`）：

- 4 个标题共 **7 个 Tab 站**（`tabStops: 7`）：`outline-item`、`outline-toggle(二级标题)`、`outline-item(二级标题)`、`outline-toggle(三级标题)`…（`OUTLINE_TAB` 四步序列已录）。
- 三角是独立 `<button>`，`aria-label="折叠/展开「二级标题」"`，宽只有 **14 px**（`OUTLINE_GEOMETRY`：`[6,122,14,24]`，三处一致）。
- 视觉上三角与标题文字之间无间隔（截图 `r46-ui-31`），「▾侧灯界面审查」粘在一起；活动行的底色只铺在标题按钮上（`x 20..211`），三角那 14 px 是空档。

建议：把「跳转」和「折叠」合成一行一个 Tab 站：标题按钮 `tabIndex=0`，三角 `tabIndex=-1` 由按钮内的左右键或单独的快捷键处理；三角点击区扩到 24×24（`padding` 或伪元素），并给三角与文字之间 4–6 px 间距。

### F5（P2，新）标题层级在 H3/H4 塌陷：H4 与正文同为 17 px，H3 只大 10%；正文行高 1.95（Typora 1.43）

实测（`.tmp/r46-ui-3-log.txt` 的 `HEADING_LADDER`，`.tmp/r46-ui-main-log.txt` 的 `TYPO_*`，截图 `r46-ui-01`）：

| | 字号 | 相对正文 | 行高 |
| --- | --- | --- | --- |
| H1 | 31.45 px | 1.85× | 1.35 |
| H2 | 22.44 px | 1.32× | 1.95 |
| H3 | 18.7 px | 1.10× | 1.95 |
| H4 | **17 px** | **1.00×** | 1.95 |
| 正文 | 17 px | 1× | **1.95** |

- `src/styles.css:568-600`：`.doc-body` 行高 1.95；`h1` 1.85em/1.35；`h2` 1.32em、`h3` 1.1em 且都没写 `line-height`（继承 1.95）；**没有 `h4` 规则**，落到浏览器默认 1em。
- 截图 `r46-ui-01` 里「四级标题」与正文一样大，只能靠加粗和上下间距区分；H2（22.44）比 H1（31.45）矮但行框更高（44 vs 42 px），标题节奏是倒的（第 43/44 轮记过 H2/H3，本轮连同 H4 一起给全量数据）。
- Typora 对照（`.tmp/typora-ref/app/resources/style/base.css`）：`h1 2rem / h2 1.8rem / h3 1.6rem / h4 1.4rem / h5 1.2rem / h6 1rem`（body 14 px，行高 1.428）——四级台阶均匀，H4 是正文的 1.4 倍。

建议：`h3: 1.22em`、`h4: 1.12em`（或 1.2），标题统一 `line-height: 1.35–1.45`；中文正文行高从 1.95 收到 1.8 左右。这是纯 CSS 改动，零字节增量。

### F6（P2，新）链接浮层没有可见按钮，点正文空白处也不关：焦点回正文后连 Esc 都关不掉，浮层一直盖在页边栏上

复现 A：选中一段 → `Ctrl+K` → 看浮层（没有「确定/取消」）。
复现 B：浮层开着时用鼠标点正文别处 → 浮层不关；再按 Esc → 仍不关。

实测（`.tmp/r46-ui-3-log.txt` 的 `LINK_FONTS`、`LINK_MOUSE_DISMISS`；`.tmp/r46-ui-4-log.txt` 的 `LINK_AFTER_REAL_CLICK`，截图 `r46-ui-32`、`r46-ui-33`）：

- `buttons: 0`：浮层里一个按钮都没有，只有提示「普通链接用 Enter 保存，Esc 取消」。
- 真实鼠标点正文（`page.mouse.click(700,430)`）后：`stillOpen: true`、焦点已在 `ProseMirror`、`links: 0`。再按 Esc 也不关（Esc 的 `stopPropagation` 只挂在两个输入框上，`src/components/LinkEditor.tsx:69-74`、`:102-107`）。
- 截图 `r46-ui-32` 与 `r46-ui-33`（后一张是之后分析批注时拍的）里浮层都还在：最后它压在页边批注卡和「整体评价」面板上，用户只能再按一次 `Ctrl+K`（或刷新）摆脱它。
- 字号：标签 11 px、输入框 11 px、提示 10.5 px、`kbd` 10 px（`src/styles.css:2302-2345`）；同一应用里设置输入框 13 px、顶栏按钮 12 px、提示 12.5 px——浮层是全场最小的一处，且比周围小一档以上（截图 `r46-ui-17`）。
- 位置也贴边：`rect [392,264,340,152]`，正好盖住正文第二段（浮层遮挡本身合理，但滞留就成了遮挡）。

建议：加「保存 / 取消」两个按钮（≥24 px 高），`document` 级 `mousedown` 点到浮层外就按「取消」关闭并把选区还给正文；字号提到 12/12.5 px；Esc 同时挂到 window（`findOpen` 那种一份关一个动作的写法）。

### F7（P2，新）设置面板 1440×900 就要滚动：最后一段说明被底部 sticky 操作行和对话框下边缘切断；快捷键一览同一根因（第 44 轮 F1 未修）

实测（`.tmp/r46-ui-3-log.txt` 的 `SETTINGS_FOOTER`、`SETTINGS_AT_BOTTOM`、`SHORTCUTS_FOOTER`；`.tmp/r46-ui-5-log.txt` 的 `BOX`，截图 `r46-ui-35`、`r46-ui-36`、`r46-ui-29`）：

- 设置：对话框 `[505,20,430,860]`，`clientHeight 858` / `scrollHeight 936`，**要滚 78 px**；`.dialog-actions` 是 `position: sticky; bottom: 0`（`src/styles.css:1187-1196`）位于 `[526,823,378,36]`，最后一段 `.dialog-note` 在 `[526,848,378,40]`，两者**重叠 11 px**；说明文字第二行落到对话框下边缘以外（截图 `r46-ui-35`：按钮行正下方露出半行「协议按 OpenAI 兼容走…」，末字「能填」贴在圆角外，`r46-ui-36` 滚到底后才完整）。
- 快捷键一览：`.dialog-actions` 同样 sticky `[461,762,508,36]`，最后一行 `[461,819,508,25]` 底边 844 越过对话框底边 819，**被裁 24 px**（`SHORTCUTS.lastKbd.clippedBy = 24`；截图 `r46-ui-29`）。第 44 轮 F1 记的就是这一条，本轮实测仍在。
- 结构原因相同：`.dialog` 把整块内容（含操作行）一起滚（`src/styles.css:1135-1144`），sticky 操作行把可视高度又吃了一段，最后一行正好夹在两者中间。

建议：`.dialog` 改两段式 —— 外框 `display: flex; flex-direction: column`，内容区 `overflow-y: auto`，操作行放在滚动区外（`flex: none`），永远不被裁；这同时把 F7 两条和快捷键对话框一起修掉，且天然给内容区留出底部 `padding-bottom`。

### F8（P2，第 44 轮 F2 未修 + 新证据）提示条压在模态对话框之上，正好盖住设置面板的「快捷键 / 取消 / 保存」

实测（截图 `r46-ui-23-settings-dark.png`，`.tmp/r46-ui-2-log.txt` 的 `TOAST`、`DARK_SETTINGS`）：

- 先触发一条保存失败提示（提示条常驻不自动消失），再打开设置：`.toast` `[559,814,321,40]`，设置对话框 `[505,20,430,860]`、操作行 `[526,823,378,36]` —— **提示条横跨在按钮行上**（截图 `r46-ui-23` 里「快捷键/取消/保存」被提示条和它的 × 盖住）。这条提示是上一步留下的，打开模态既不收也不下沉，说明层叠顺序（`z-index`）不认得模态。
- 提示条本体 `role=null / aria-live=null` 的是内层 `.toast`；可访问性在外层 `.toast-live`（`src/App.tsx:5117-5146` 有 `role=status|alert` 与 `aria-atomic`）——这点没问题，问题只在层级。
- 文案也弱：「保存失败：不存在。改动还在，可以再试一次。」（`TOAST.text`）——「不存在」是底层 `DOMException` 的原因词，没说是哪个文件、哪一步失败了。

建议：模态打开期间把提示条移到遮罩下层（或改放状态栏上方一条），并按既有错误文案规则写清「哪篇、哪个文件、下一步」（仓库已有错误文案单测，加一条即可）。

### F9（P2，新 + 已知未修）点击目标仍低于 24×24：提示条关闭 × 15×22、大纲三角 14×24；已知的大号：工具栏 `I` 21×24、`</>` 37×21、字数入口 117×16、查找条 7 个按钮高 23

实测（`.tmp/r46-ui-main-log.txt` 的 `TOOLBAR_BTNS`、`FIND`、`OUTLINE`、`STATS`；`.tmp/r46-ui-2-log.txt` 的 `TOAST`）：

- 新的两处：提示条「关闭提示」**15×22**（错误提示才出现，是唯一的手动关闭入口）；大纲折叠三角 **14×24**（三处都是 `14×24`）。
- 已知未修：`I` **21×24**、`</>` **37×21**（第 44 轮 F9 复核项）、字数入口 `117×16`（同前）、查找条 7 个按钮 **23 px 高**（第 44 轮 F7）、表格条 7 个按钮 **23 px 高**（第 44 轮 F5）。
- 对照：`:focus-visible` 的焦点环在全站统一（24 个 Tab 站点全是 `solid 2px rgb(43,109,100)`，见 `TAB_SWEEP`），所以问题只在**点击区尺寸**，不在键盘可见性。

建议：统一给图标按钮 `min-width: 24px; min-height: 24px`（不够的用 `padding` 撑，不要改字号），提示条 × 与大纲三角优先。

---

## 与 Typora 对照

- 排版阶梯见 F5（Typora 2.0/1.8/1.6/1.4/1.2/1.0 对 Sidelight 1.85/1.32/1.1/1.0）——这是本轮最强的一处差距。
- 深色下 Mermaid：Typora 图表跟随主题重绘；Sidelight 切主题不重绘（F2）。
- 顶栏/工具栏：1440 与 1024 宽下都没溢出（`toolbar.scrollWidth == clientWidth`，1024 时 `[1024,1024]`），这一点不比 Typora 差。
- 空态：Sidelight 侧栏信息量比 Typora 多（题注 + 一句解释 + 按钮），代价是窄栏寡行（第 45 轮 F9，本轮未复测）。

## 试过、判断没有问题的项（都有本轮实测）

- **深色对比度全量过 AA**：正文 14.42:1、引用 7.92:1、行内代码/表头 11.02:1、文件树 7.92:1、顶栏/工具栏按钮 7.92:1、状态栏 6.8:1（`DARK_CONTRAST`）；设置对话框深色下 6.26–14.42:1（`DARK_SETTINGS`）；深色预览 14.42:1（`DARK_PREVIEW`）；浅色正文 14.88:1、引用 6.16:1、提示 5.23:1。**深色没有对比度发现。**
- **reduced-motion 生效**：模拟 `prefers-reduced-motion: reduce` 后 7 个样本的 `transition/animation` 全是 `1e-05s`（`REDUCED_MOTION`）。
- **焦点可见性**：从 skip-link 起 24 个 Tab 站点，每个都有统一 2 px 强调色焦点环（`TAB_SWEEP`），顺序是 skip → 顶栏 → 工具栏 → 侧栏页签 → 文件树 → 正文，没有跳过、没有落 `body`。
- **字数明细**：`role=dialog aria-label=字数明细`、360×325、无横向溢出、打开后焦点进面板（`STATS_FOCUS.inside: true`）、对比度 16.1:1。
- **快速打开（有文件时）**：`role=dialog`、输入框 `aria-label=快速打开文件名`、5 条 `role=option` 行高 35 px、对比度 14.88:1（第 45 轮 F8 的空态本轮没复现，因为已打开文件夹）。
- **源码视图**：13 px 等宽、行高 24.05、`scrollWidth 884 == clientWidth`、说明条对比度 6.67:1，无横向溢出。
- **1024×700**：顶栏/工具栏/状态栏 `scrollWidth == clientWidth`，正文列 756 px（约 47 字/行，第 44 轮 F6 的已知项，未计新发现），侧栏 218×588。
- **Mermaid 深色首载**：主题正确（见 F2 的对照组），说明问题只在「切换后不重绘」，不在初始化。

## 遗留未修（本轮复核了这几条，未重复计为发现）

- 全站仍无 `:active` 按下态：样式表统计 `:hover 12 条 / :active 0 条 / :focus-visible 4 条`（`RULE_COUNT`，第 45 轮 F7）。
- 批注卡仍不可聚焦（`tabIndex -1`、无 role、`cursor auto`，`RAIL_A11Y`，第 45 轮 F6）。
- 查找条仍 `role=null / aria-label=null`，两个输入框只有 placeholder（`FIND`，第 44 轮 F7）。
- 表格工具条仍离表格很远（`gapPx 597`、`barPosition: static`）且 7 个按钮无 `aria-label`、高 23（`TABLE_BAR`，第 44 轮 F5）。
- 1024 正文列 756 px / 47 字每行（`NARROW_1024`，第 44 轮 F6）。
- 提示条关闭 × 15×22、`I`/`</>`/字数入口小于 24×24（并入 F9）。

## UNVERIFIED

- **125% 缩放**：本轮 `context.newCDPSession` + `Emulation.setDeviceMetricsOverride({deviceScaleFactor:1.25})` 没生效（读回 `dpr: 1`、`inner 1440×900`，截图 `r46-ui-21` 与 1440 一致），所以本轮没有 125% 的结论；第 44 轮记过 DPR 1.25 不破版。补测方式：真 125% 系统缩放的 Windows 显示 + 宿主，或用 `--force-device-scale-factor=1.25` 另起浏览器（本沙箱不允许另起 Chromium，故记为未验证）。
- **屏幕阅读器实录**：只做了 DOM/AX 属性审计（role、可访问名、`aria-expanded`、`aria-current`、`tabIndex`），没有 NVDA / 讲述人实际播报；F3/F4 的播报体验未验证。
- **真实中文输入法与 IME**：全部用 `keyboard.type()` / `fill()`，未走 IME。
- **宿主（`host/`、`host-mac/`）与 macOS 真机**：只跑了浏览器 CDP；宿主里的对话框、深色 Mermaid、缩放未测。
- **鼠标点链接浮层外部后是否写坏正文**：只验证了「不关、不产生链接、焦点回正文」，没验证之后再按 Enter 是否会误存半截链接（浮层滞留时的后续按键行为）。
- **`prefers-color-scheme` 跟随系统切换**（浅色系统 → 深色系统）后的 Mermaid 重绘：本轮只在设置里手动切主题，未模拟系统主题变化。

## 复现清单（最短路径）

1. F1：`reset.mjs 9226` → 写 3 段文档 → 点「分析本段（模拟）」→ 等 3 张卡 → 看第 1 张卡（面板盖住正文，点「追问」无反应）。
2. F2：浅色写含 mermaid 的文档 → 设置 → 深色 → 保存 → 滚到图（连线消失）。
3. F3：设置 → Tab 聚焦「跟随系统」→ `ArrowRight`（无变化）。
4. F4：大纲页签 → 焦点第一个标题 → Tab ×5（7 个站，三角夹在中间）。
5. F5：写 H1–H4 + 正文 → 设置里读字号（H4 = 17 px = 正文）。
6. F6：选中文字 → `Ctrl+K` → 点正文别处 → 按 Esc（浮层不关）。
7. F7：1440×900 打开设置 → 看底部（最后一行被按钮行切半）。
8. F8：设置开着时触发一条错误提示 → 提示条盖住按钮行。
