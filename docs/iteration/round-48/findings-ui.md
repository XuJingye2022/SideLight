# 第 48 轮 界面美观与可访问性 侦察报告（finder-ui）

- 轮次：48；轮前 `startSha=5673b1dee5623cc72fe87b37d563c1d7444224ff`，本轮 `git rev-parse HEAD` 与之一致；只读产品代码，未改任何 `src/` 文件，新增只有 `docs/iteration/round-48/`、`shots/round-48/r48-ui-*` 与 `.tmp/e2e-r48-ui-*.mjs`
- 环境：dev server `http://localhost:5175`（未另起、未重启）；CDP **9226**；每个脚本前跑 `node .tmp/reset.mjs 9226`
- 矩阵：1440×900 浅/深、1024×700 浅/深、1152×720（125% 等价布局）、空态浅/深、设置面板浅/深、查找条、表格工具条、批注卡 3 张、大纲、字数面板、Mermaid、源码/预览、焦点环、选区
- 脚本与原始输出（全部本轮新跑）：
  - `.tmp/e2e-r48-ui-a.mjs` → `.tmp/r48-ui-a-log.txt`（小字清单、浅色对比度、滚动条、选区样式、Tab 顺序、设置面板几何、主题单选组键盘、reduced-motion）
  - `.tmp/e2e-r48-ui-b.mjs` → `.tmp/r48-ui-b-log.txt`（深色对比度全量、边框、批注卡 a11y/几何/hover、查找条、表格条、字数面板、源码/预览、1024 窄窗、空态）
  - `.tmp/e2e-r48-ui-c.mjs` → `.tmp/r48-ui-c-log.txt`（空态、字号盘点、表格条复现、查找条位移、1152/1024 布局、深色空态）
  - `.tmp/e2e-r48-ui-d.mjs` → `.tmp/r48-ui-d-log.txt`（占位符字体、断点扫描、批注卡 Tab 顺序、滚动条伪元素）
  - `.tmp/e2e-r48-ui-e.mjs` → `.tmp/r48-ui-e-log.txt`（标题阶梯、表格条 Escape 后、设置面板 1440/1024）
  - `.tmp/e2e-r48-ui-f.mjs` → `.tmp/r48-ui-f-log.txt`（页边栏溢出探针、整体评价面板 hit-test）
  - `.tmp/r48-derive.mjs` → `.tmp/r48-derive-log.txt`（由 CSS 变量派生的滚动条/选区/分隔线对比度）
- 控制台：B/C/D/E/F 五段 `CONSOLE_ERRORS []`。A 段有 2 条 `REQFAIL http://localhost:5175/__doc`（浏览器里没有宿主进程，探测请求失败，无用户可见影响；dev StrictMode 导致跑两遍）
- 未 push、未动 `release/`

## 截图矩阵（全部在 `shots/round-48/`）

| 项 | 截图 |
| --- | --- |
| 富文本浅色 1440（H1–H4、分隔线、列表、任务项、表格、引用、代码、行内混排） | `r48-ui-c-02-rich-light-1440.png`、`r48-ui-a-01-rich-light-1440.png` |
| 富文本深色 1440 | `r48-ui-b-01-rich-dark-1440.png`、`r48-ui-a-05-rich-dark-1440.png` |
| 表格工具条（浅色，窗口顶部的全宽横条） | `r48-ui-c-03-table-bar-light.png`、`r48-ui-b-06-table-dark.png` |
| 表格条按 Esc 后仍在、把工作台压下 36 px | `r48-ui-e-02-table-bar-after-esc.png` |
| 查找条浅色 / 深色（正文下移 79 px） | `r48-ui-c-04-find-light.png`、`r48-ui-b-05-find-dark.png` |
| 设置面板浅色 / 深色 / 1024×700 | `r48-ui-a-03-settings-light.png`、`r48-ui-a-04-settings-dark.png`、`r48-ui-e-03-settings-1024.png` |
| 批注卡 3 张（深色，含「整体评价」面板压卡） | `r48-ui-b-03-rail-dark.png`、`r48-ui-f-01-rail-overflow.png` |
| 页边栏滚到底 | `r48-ui-b-04-rail-bottom-dark.png`、`r48-ui-f-02-rail-bottom.png` |
| 字数明细面板（深色） | `r48-ui-b-07-stats-dark.png` |
| 源码模式 / 预览（深色） | `r48-ui-b-08-source-dark.png`、`r48-ui-b-09-preview-dark.png` |
| 空态浅色 / 深色（占位符字体） | `r48-ui-c-01-empty-light.png`、`r48-ui-c-08-empty-dark.png`、`r48-ui-b-11-empty-light.png` |
| 1024×700 编辑态浅 / 深（正文列 766 px） | `r48-ui-c-06-narrow-1024-light.png`、`r48-ui-c-07-narrow-1024-dark.png`、`r48-ui-b-10-narrow-1024-dark.png` |
| 1152×720（125% 等价布局） | `r48-ui-c-05-zoom125-light.png`、`r48-ui-a-02-zoom125-light.png` |
| 焦点环（深色，22 个 Tab 站点） | `r48-ui-b-02-focus-ring-dark.png`、`r48-ui-d-01-rail-focus.png` |
| 标题阶梯 | `r48-ui-e-01-typo-light.png` |

---

## 本轮新发现

### F1（P2）表格网格线、表头分隔线与水平分隔线对比度 1.00–1.31:1；深色下表头单元格边框与表头底色**完全同色**

实测（`.tmp/r48-ui-b-log.txt` 的 `LIGHT_BORDERS`、`BORDERS_DARK`，`.tmp/r48-derive-log.txt`）：

| 项 | 浅色 | 深色 |
| --- | --- | --- |
| 单元格边框 vs 单元格底 | `#e4dfd4` vs `#f6f4ee` = **1.21:1** | `#2a2e33` vs `#15171a` = **1.31:1** |
| 表头单元格边框 vs 表头底色 | **1.15:1** | `#2a2e33` vs `#222e2e` = **1.00:1** |
| `---` 分隔线 vs 纸底 | **1.21:1** | **1.31:1** |

- 深色下 `.doc-body th` 的边框色 `rgb(42,46,51)` 与表头底色 `rgb(34,48,46)` 是近同色（1.00:1），截图 `r48-ui-b-01-rich-dark-1440.png` 里「列一/列二/列三」之间看不出分隔线；水平分隔线在 `r48-ui-c-07-narrow-1024-dark.png` 里几乎消失。
- 成因：`.doc-body th, .doc-body td { border: 1px solid var(--line) }`（`src/styles.css:757-764`），`--line` 浅色 `#e4dfd4`（`src/styles.css:8`）、深色 `#2a2e33`（`src/styles.css:44`）。
- 与 WCAG 1.4.11（非文本 3:1）不符。表格网格线在中文写作场景是读表的主要依据。
- 建议：表格边框改用 `--line-strong` 再压暗一档（浅色约 `#b9b1a2`、深色约 `#4b525a`，两者对各自底色 ≥3:1），`hr` 同步；纯 CSS 改动，零字节。

### F2（P2）≤1119 px 断点把正文列宽从 550 px 放宽到 861 px（+57%，一行约 51 字）：窗口变窄，正文反而更宽

实测 `BREAKPOINT_SWEEP`（`.tmp/r48-ui-d-log.txt`）：

| 视口宽 | 正文列宽 | 每行约字数 | grid-template-columns |
| --- | --- | --- | --- |
| 1440 | 576 px | 34 | `576px 260px` |
| 1280 | 576 px | 34 | `576px 260px` |
| 1120 | 550 px | 32 | `550px 260px` |
| **1119** | **861 px** | **51** | `861px`（单栏） |
| 1024 | 766 px | 45 | `766px`（单栏） |
| 900 | 642 px | 38 | `642px`（单栏） |

- 跨过 1119/1120 边界时正文列从 550 px 突增到 861 px；截图对比 `r48-ui-b-01-rich-dark-1440.png`（576 px 列）与 `r48-ui-c-07-narrow-1024-dark.png`（766 px 列，H1/H2 与正文明显拉长）。
- 成因：宽窗分支是 `grid-template-columns: minmax(0, 36rem) 260px`（`src/styles.css:262-269`），窄窗分支 `grid-template-columns: minmax(0, 1fr)` 没有配 `max-width`（`src/styles.css:2489-2511`）。
- 建议：窄窗分支给 `.doc-column` 加 `max-width: 36rem; margin-inline: auto`（或 40rem 折中），保持可读行长。

### F3（P2）打开查找条把正文整体下移 79 px；关掉后不回原位（残留 `scrollTop` 21 px，正文上移 21 px）

实测 `FIND_SHIFT` / `FIND_CLOSE_RESTORE`（`.tmp/r48-ui-c-log.txt`）：

- 打开前：`.doc-body` 顶 `172 px`、`scrollTop 0`、`clientH 752`；打开并输入「段落」后：`.doc-body` 顶 **`251 px`**（+79）、`clientH 673`；`scrollH` 不变（1311）。
- 关闭后：`.doc-body` 顶 **`151 px`**、`scrollTop 21`（原为 0/172）——净位移 −21 px，视线位置不还原。
- 成因：`.find-bar { flex: none; padding: 8px 12px }`（`src/styles.css:1847-1855`）在 `.app` 的纵向 flex 里占位，高 79 px，不是浮层。
- 建议：改浮层（`position: absolute; top: 84px; left: 0; right: 0; z-index`）不占文档流；若保留占位，关闭时恢复 `scrollTop`。

### F4（P2）空文档占位符与正文不同字体、不同字号、不同行高：占位符 Segoe UI 16 px / `line-height: normal`，正文 Source Han Serif SC 17 px / 33.15 px

实测 `PLACEHOLDER_FONT`、`EMPTY`（`.tmp/r48-ui-d-log.txt`、`.tmp/r48-ui-c-log.txt`）：

- 占位符：`font-size 16px`、`font-family "Segoe UI", "PingFang SC", "Microsoft YaHei", system-ui, sans-serif`、`line-height normal`（约 21 px 行高）、`color #666c72`（对比度 **4.83:1**，过 AA）。
- 正文：`17px`、`Source Han Serif SC`、`line-height 33.15px`。
- 截图 `r48-ui-c-01-empty-light.png`：占位符「从这一句开始写」是无衬线体；输入第一个汉字后立刻变成衬线体、字号 +1 px、行高由约 21 px 跳到 33.15 px（同一行文字高度变化 12 px，正文在垂直方向跳一下）。
- 成因：`.editor-placeholder`（`src/styles.css:276-285`）只写了 `color`，没写 `font-size`/`font-family`，继承 `.doc-column` 的 UI 字体字号。
- 建议：`.editor-placeholder { font: inherit }`（或显式 `font-family: var(--font-read); font-size: 1.0625rem; line-height: 1.95`），与 `.doc-body` 对齐。

### F5（P2）表格工具条仍是文档流里的全宽横条：与目标单元格相距 552–777 px；光标在表格里就一直占 36 px，把侧栏与正文整体下压

实测 `TABLE_BAR_TH`（`.tmp/r48-ui-c-log.txt`）与 `TABLE_BAR_ESC` / `TABLE_BAR_AFTER_OUTSIDE`（`.tmp/r48-ui-e-log.txt`）：

- 工具条 `rect [0,84,1440,36]`、`position: static`、父节点是 `.app`，目标表头单元格 `[393,861,278,36]` → 纵向相距 **777 px**；1024 下同样在顶部（截图 `r48-ui-c-07-narrow-1024-dark.png` 里像第二条工具栏）。
- 光标在表格内时：按 `Esc` 后工具条**仍在**（`barExists: true`），`.sidebar` 与 `.doc-scroll` 的 y 由 `84` 变成 **`120`** —— 整个工作台被顶掉 36 px；点到表格外才消失（`barExists: false`，y 回到 84）。截图 `r48-ui-e-02-table-bar-after-esc.png`。
- 第 47 轮 F6 的「三个按钮全叫删除」已修：现在可见文字是「删行 / 删列 / 删表」，7 个按钮 23 px 高、无 `aria-label`（可访问名来自可见文字，可用）。
- 成因：`.table-bar` 文档流定位（`src/styles.css:1931-1948`）。
- 建议：改浮条（`position: sticky/absolute` 贴近表格，宽随表格），进出表格不要改变工作台纵向结构。

### F6（P2）全站 14 档字号；小字四档混用（11 / 11.5 / 12 / 12.5），与样式表里「统一 `--text-xs` = 12px」的注释自相矛盾

实测 `FONT_SCALE_RICH`（`.tmp/r48-ui-c-log.txt`），去重后 14 档：`11 / 11.5 / 12 / 12.5 / 12.72 / 13 / 14.62 / 14.79 / 16 / 17 / 18.7 / 22.44 / 31.45`（另有一个 13.33 px Arial 是隐藏 `<input>`，非可见界面）。

- 小字四档的实际落点：`11px` = 工具栏 `</>`（1 处）；`11.5px` = `.rail-head` / `.rail-title` / `.rail-light` / `.rail-empty-sub`（4 处）；`12px` = 顶栏按钮、状态栏、侧栏页签等（25 处）；`12.5px` = 查找输入框（`.find-input`，`src/styles.css:1863-1868`）与批注卡正文（6 处）。
- 与 `src/styles.css:30-31` 的注释「用户可见的小字统一用这一档，别再散写 10 / 11 / 11.5」直接冲突：`11px` 与 `11.5px` 各还在用。
- 建议：`</>` 提到 12 px（它本来就是图标按钮，用 `font-size: 12px` 或图标尺寸控制）；`.rail-*` 的 11.5 px 全部换 `var(--text-xs)`；`.find-input` 与批注卡正文各选一档（12 或 12.5）。

### F7（P2）页边栏滚动区里，「整体评价」sticky 面板会压住最后一张批注卡的操作行（内容高度不同则偶发）

实测 `RAIL`（`.tmp/r48-ui-b-log.txt`）与 `RAIL_PANEL` / `RAIL_PANEL_BOTTOM`（`.tmp/r48-ui-f-log.txt`）：

- B 段文档（4 段正文、3 张卡）：第 3 张卡 `[996,656,260,144]`，底边 **800**；`.rail-overall` `[996,779,260,93]`、`position: sticky`、`bottom: 0`、`z-index: 3` → 面板顶边压在卡片上 **21 px**，正好盖住卡片最后一行按钮（截图 `r48-ui-b-03-rail-dark.png` 里「知道了 / 追问 / 联网核对」被面板下半截遮住）。
- F 段文档（3 段正文）：最后一张卡底 764 < 面板顶 776，不重叠；滚到底后也不重叠（`RAIL_PANEL_BOTTOM` `blocked: []`）。所以这是**依赖内容高度**的重叠，同一界面在不同文档上时好时坏。
- 结构：`MarginRail.tsx:247` 的 `.rail-cards-space` 预留高度没有覆盖到「最后一张卡 + 面板顶」的边界；`.rail-overall` 是 `src/styles.css:837-838` 的 sticky。
- 建议：滚动容器底部给足 `padding-bottom`（面板高 + 12 px），或 `.rail-cards-space` 高度取 `max(现有, 面板高 + 16)`，让 sticky 面板永不压在卡上。

---

## 第 47 轮遗留项：本轮复核，仍然存在（不重复计入本轮新发现）

| 编号 | 结论 | 本轮实测 |
| --- | --- | --- |
| 47-F1 标题阶梯 | 仍塌陷 | `TYPO`：H1 31.45/42.46/1.35；H2 22.44/**43.76 (1.95)**/行框 44 > H1 的 42；H3 18.7；**H4 17 px = 正文 17 px**（`h4SameSizeAsBody: true`），H2–H4 行高比全 1.95 |
| 47-F2 设置面板要滚 | 仍要滚 | `SETTINGS_1440`：`clientH 858 / scrollH 936` → 滚 **78 px**；sticky 操作行 `[526,823,378,36]` 与末段说明重叠 **11 px**，说明底边越出对话框 **7 px**。`SETTINGS_1024`：滚 **278 px** |
| 47-F3 主题单选组 | 仍无方向键 | `THEME_KEYS`：三个 `role=radio` 的 `tabIndex` 全 **0**；焦点在「跟随系统」时按 `ArrowRight`，焦点与 `aria-checked` 都不变（`["浅色","深色","跟随系统"]` = `false / true / false`，`data-theme` 不变） |
| 47-F9 点击区 <24 px | 仍是 | 查找条 7 个按钮全高 **23 px**（`FIND`）；表格条 7 个按钮全高 **23 px**；状态栏字数入口 **117×16**（`[12,679,117,16]`）；图标按钮 `I` 21×24、`</>` 37×21 |
| 47-F10 查找条无标签 | 仍是 | `FIND`：`.find-bar` `role: null`、`aria-label: null`、`position: static`、整条 **79 px 高**；两个输入框 `aria-label: null`，只有 placeholder |

已修（本轮确认，不再计）：表格条三个「删除」已改成「删行 / 删列 / 删表」。

---

## 试过、判断没有问题的项（本轮都有实测）

- **深色主题文本对比度全量过 AA**（`CONTRAST_DARK`）：正文/各级标题 14.42、引用 7.92、链接 7.56、表头 11.02、行内代码与代码块 13.28、文件名 6.80、顶栏按钮 7.92、状态栏 6.80、侧栏页签 13.28、批注卡正文 7.29、批注卡按钮 6.26–8.05、提示条 14.42。深色值不是浅色的复读：`data-theme=dark` 生效后重新取值。
- **焦点环可见且不被裁**（`TAB_DARK`，22 个 Tab 站点）：浅色 `2px solid #2b6d64`、深色 `2px solid #9ccbc2`，`outline-offset 2px`；22 站全部 `onTop: true`（没有被浮层压住）。正文进焦点时 `outline-style: none` + `.doc-scroll` 顶部 `2px` accent 内阴影（`rgb(121,179,170) 0 2px 0 0 inset`），第 42 轮的正向出口成立。
- **Tab 顺序合理**：跳转链接 → 顶栏（文件/分析/导出/快捷键/保存/设置）→ 工具栏 11 个 → 侧栏「文件」页签（tablist 只留 1 个 Tab 站）→「打开文件夹…」→ 正文编辑器 → 回到跳转链接；进入正文不会先把焦点丢到滚动区。
- **reduced-motion 生效**：`emulateMedia({reducedMotion:'reduce'})` 后 6 个样本的 `transition-duration` 从 `0.12s` 变成 `1e-05s`，与 `src/styles.css:2600-2607` 一致。
- **1024×700 与 1152×720 无横向溢出**：顶栏/工具栏 `scrollWidth == clientWidth`（1024/1024、1152/1152），正文滚动区 796/796、924/924；工具栏不换行（高 38 px）。
- **预览与编辑排版一致**（`PREVIEW`）：H1 31.45 px、正文 17 px、列宽 576 px、表格 `border-collapse: collapse`，与编辑态同值，第 40 轮的修复成立。
- **源码模式**：13 px / 行高 24.05 px、`pre-wrap`、`tab-size 2`、说明条对比度 7.29，`r48-ui-b-08-source-dark.png` 无裁切。
- **字数明细面板**：`role=dialog`、`aria-label=字数明细`、焦点进面板、无横向溢出（358/358）；标签 6.26、数值 13.28。
- **批注卡按钮有反馈**：hover 底色 `rgb(232,240,237)` + 文字 `rgb(35,84,77)`；focus 环 2 px/offset 2 px 可见；卡内 13 个按钮可点（hit-test 全通过）。
- **空态文案完整**：侧栏「还没有打开文件夹 / 打开一个文件夹后，保存会写回原文件 / 打开文件夹…」；页边栏「选中一段，按 Ctrl + Enter / 批注会停在对应的句子旁边。」；占位符对比度 4.83（浅）/ 6.80（深）。
- **文本对比度浅色全量过 AA**：正文/标题 14.88、引用 6.16、表头 14.12、行内代码 16.10、文件名 4.83、顶栏按钮 6.16。
- **滚动条有统一的自定义样式**：`::-webkit-scrollbar 10px`、thumb 圆角 6 px、轨道透明（`src/styles.css:2465-2479`）；但 thumb 对比度只有 1.52:1（浅）/ 1.81:1（深）（派生值，见 F1 同类问题，未单列）。

---

## UNVERIFIED

- **真实 125% / 150% 缩放**：`Emulation.setDeviceMetricsOverride` 在这个 CDP 会话没有生效（读回 `dpr: 1`、`innerW: 1440`），改用**等价布局视口** 1152×720（= 1440/1.25）测几何与溢出，没有验证真实 DPR 放大下的文字渲染与模糊。补测需要在系统缩放 125% 的机器上重开浏览器。
- **页边栏「我的理解」目标行是否溢出**：`r48-ui-b-03-rail-dark.png` 里该行文字延伸到窗口右缘（x≈1440）而页边栏右界是 1256，看起来被截断；但 F 段专门复现时该行没有渲染（`RAIL_DOM.els` 为空），没有取到 DOM 度量。计 UNVERIFIED，补测：反复触发模拟分析直到 goal 非空，量 `.rail-goal-text` 的 `scrollWidth/clientWidth` 与右边界。
- **屏幕阅读器实录**：只做了 DOM/AX 属性审计（role / aria-label / tabIndex），没有 NVDA 或讲述人播报。
- **真实中文输入法与 IME**：全部 `keyboard.type` / `fill`，未走 IME 组合输入，F4 的“打第一个字跳一下”是用计算样式推的，未录屏。
- **宿主（`host/`、`host-mac/`）与 macOS 真机**：只跑浏览器 CDP。
- **滚动条与选区的像素级实测**：滚动条 thumb 1.52/1.81:1、选区底 1.36/1.50:1 是按 `src/styles.css` 变量换算的派生值，未做截图取样。
- **真实 hover 截图**：hover 状态用 `getComputedStyle` 前后对比取值，没有为每个 hover 单拍截图。

## 最短复现清单

1. F1：粘贴一张表格 + 一行 `---` → 深色主题下看表头三个单元格之间（无分隔线）；读 `.doc-body td` 的 `border-top-color` 与底色。
2. F2：把窗口从 1120 px 拖到 1119 px（或 `setViewportSize` 1120/1119）→ 量 `.doc-body` 宽度：550 → 861 px。
3. F3：`Ctrl+F` → 量 `.doc-body` 顶边（+79 px）；输入词后 `Esc` → 读 `.doc-scroll.scrollTop`（21，原 0）。
4. F4：空文档读 `.editor-placeholder` 的 `font-size/font-family/line-height`（16px / Segoe UI / normal），与 `.doc-body`（17px / Source Han Serif / 33.15px）对比。
5. F5：点表格单元格 → 看窗口顶部 36 px 全宽横条与目标的距离（777 px）；按 `Esc` 后 `.sidebar` 的 y 仍是 120（本应 84）。
6. F6：`getComputedStyle` 遍历 `.app *`，按 `font-size` 去重 → 14 档，其中 11 / 11.5 / 12 / 12.5 并存。
7. F7：用 B 段的 4 段正文文档触发 3 张批注卡 → 第 3 张卡底 800 > `.rail-overall` 顶 776，按钮被 sticky 面板压 21 px；换 3 段正文则不重叠。
