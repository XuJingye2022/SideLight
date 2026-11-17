# 第 50 轮 界面美观与可访问性 侦察报告（finder-ui）

- 轮次：50；轮前 `startSha=6ae9be39ee5007da2ebcdffd636da21675dc6694`，结束 `git rev-parse HEAD` 与之一致；只读产品代码，未改任何 `src/`。`git status --porcelain` 只有 `?? docs/iteration/round-50/`、`?? shots/round-50/`。
- 环境：dev server `http://localhost:5175`（`GET /` 200，未另起、未重启）；CDP **9226**；每段脚本前跑 `node .tmp/reset.mjs 9226`。
- 画面矩阵（全部本轮新跑）：空状态、富文本浅/深 1440 顶部/中部/底部、1024×700 顶部/底部、125% 缩放（CDP `Emulation.setDeviceMetricsOverride` 1152×720 @ DPR 1.25）、800/900/1024/1119/1120/1280 宽度扫描、大纲、查找条、表格工具条、设置面板 1440/1024/滚动后、字数明细面板、页边批注（模拟流 3 卡 + 整体评价）、源码模式、预览模式、Mermaid 浅/深/错误态、工具栏/表格/标题/状态栏 2× 放大取样。
- 脚本与原始输出（全部本轮新跑）：
  - `.tmp/e2e-r50-ui-a.mjs` → `.tmp/r50-ui-a-log.txt`（空状态、富文本矩阵、浅/深取样、1024、125% 第一版、查找条、表格条）
  - `.tmp/e2e-r50-ui-b.mjs` → `.tmp/r50-ui-b-log.txt`（占位符探针、三栏几何、标题层级、表格条真实点击、设置面板与单选组、字数面板、大纲与 hover、源码/预览、125% 复核、窄窗、批注卡）
  - `.tmp/e2e-r50-ui-c.mjs` → `.tmp/r50-ui-c-log.txt`（2× 放大取样、页签 hover 正测、宽度断点扫描、状态栏按钮、字数面板、设置页脚遮挡、页边栏滚动裁切、批注卡尺寸、reduced-motion、工具栏尺寸）
  - `.tmp/e2e-r50-ui-d.mjs` → `.tmp/r50-ui-d-log.txt`（Mermaid 浅/深配色与错误色、全局 hover 规则取证、占位符 vs 首行几何）
  - `.tmp/e2e-r50-ui-e.mjs` → `.tmp/r50-ui-e-log.txt`（active / disabled / focus-visible 三态补测）
- 控制台：四段脚本 `CONSOLE_ERRORS []`。无请求失败。
- 未 push、未动 `release/`。

## 截图矩阵（全部在 `shots/round-50/`）

| 项 | 截图 |
| --- | --- |
| 空状态 1440 浅色 | `r50-ui-a-01-empty-light-1440.png` |
| 富文本浅色 1440 顶部/中部/底部（标题、列表、任务、表格、分隔线、代码块、长 URL、Mermaid、引用、kbd/mark/sub/sup、脚注） | `r50-ui-a-02-rich-light-1440.png`、`r50-ui-a-03-rich-light-1440-mid.png`、`r50-ui-a-04-rich-light-1440-low.png` |
| 富文本深色 1440 顶部/底部 | `r50-ui-a-05-rich-dark-1440.png`、`r50-ui-a-06-rich-dark-1440-low.png` |
| 1024×700 浅色 顶部/底部 | `r50-ui-a-07-rich-light-1024.png`、`r50-ui-a-08-rich-light-1024-low.png` |
| 125% 缩放（DPR 1.25）顶部/中部 | `r50-ui-a-09-zoom125-1440.png`、`r50-ui-b-11-zoom125.png`、`r50-ui-b-12-zoom125-mid.png` |
| 查找条（输入「标」） | `r50-ui-a-11-find-light.png` |
| 标题层级（h1–h4 与粗体对照） | `r50-ui-b-01-hierarchy-light.png`、`r50-ui-b-02-hierarchy-zoom.png`、`r50-ui-c-01-hierarchy.png` |
| 表格工具条 | `r50-ui-b-03-table-bar.png` |
| 设置面板 1440 / 单选后 / 1024 / 滚到底 | `r50-ui-b-04-settings-1440.png`、`r50-ui-b-05-settings-radio.png`、`r50-ui-b-06-settings-1024.png`、`r50-ui-c-09-settings-scrolled.png` |
| 字数明细面板 1024 / 1440 | `r50-ui-b-07-stats-1024.png`、`r50-ui-c-06-stats.png`、`r50-ui-c-07-stats-zoom.png` |
| 大纲 1440 | `r50-ui-b-08-outline-1440.png` |
| 源码模式 1440 | `r50-ui-b-09-source-1440.png` |
| 预览模式 1440 | `r50-ui-b-10-preview-1440.png` |
| 窄窗 900 / 800 | `r50-ui-b-13-narrow-900.png`、`r50-ui-b-13-narrow-800.png` |
| 页边批注 3 卡 + 整体评价 | `r50-ui-b-14-annotations.png` |
| 页边批注滚动（卡片被上边缘切） | `r50-ui-c-10-rail-scrolled.png`、`r50-ui-c-11-rail-top-zoom.png` |
| 2× 放大：工具栏 / 表格 / 两行 H2 / 状态栏 / 设置底部 | `r50-ui-c-02-toolbar-zoom.png`、`r50-ui-c-03-table-zoom.png`、`r50-ui-c-04-h2-zoom.png`、`r50-ui-c-05-status-zoom.png`、`r50-ui-c-08-settings-bottom.png` |
| Mermaid 浅色 / 深色 | `r50-ui-d-01-mermaid-light-zoom.png`、`r50-ui-d-02-mermaid-dark-zoom.png`、`r50-ui-d-03-mermaid-dark.png` |

---

## 本轮新发现

### U1（P2）四级标题与正文粗体完全同形：h4 = strong = 17 px / 700

实测 `HIERARCHY`（`.tmp/r50-ui-c-log.txt`）：

| 元素 | 字号 | 行高 | 字重 |
| --- | --- | --- | --- |
| h1 | 31.45 px | 42.46 px（1.35） | 600 |
| h2 | 22.44 px | 43.76 px（1.95） | 600 |
| h3 | 18.7 px | 36.47 px（1.95） | 600 |
| **h4** | **17 px** | **33.15 px** | **700** |
| **strong** | **17 px** | 33.15 px | **700** |
| p | 17 px | 33.15 px | 400 |

- 算式：`h4VsStrongSame: true`（字号、字重逐项相等）。全文件 `Select-String src/styles.css -Pattern 'h4'` **0 命中** —— 没有 `.doc-body h4` 规则，h4 落到 UA 默认（1em bold）。
- 截图 `r50-ui-b-01-hierarchy-light.png`：`#### 四级标题` 与上一段的 `**粗体文字**` 视觉上是同一种东西，只靠上下留白区分；大纲面板里也只能靠缩进猜层级。
- Typora 对照 `shots/typora/01-live-preview.png`：H4「四级标题 Heading 4」明显大于正文（约 1.1–1.15em），标题层级不靠留白。
- 建议：`src/styles.css` 的标题块（584–602）后补一条 `.doc-body h4 { font-size: 1.08em; line-height: 1.4; margin: 1.2em 0 0.45em; }`。纯 CSS，零字节依赖。

### U2（P2）H2–H4 行高继承正文的 1.95（H1 是 1.35）：两行标题内部行距大于标题到正文的间距

- 根因：`src/styles.css:572-576` 给 `.doc-body` 设 `line-height: 1.95`；h1 在 `:586` 显式 `line-height: 1.35`，h2（`:592-596`）与 h3（`:598-602`）没有设，h4 没有规则 → 三者都是 1.95。
- 实测 `HIERARCHY.h2LineBoxes: [[216,32],[260,32]]`：两行 H2 行盒间隔 **44 px**（字号只有 22.44 px）；下一段正文从 y=310 开始，H2 第二行到正文只隔 **18 px**。截图 `r50-ui-c-04-h2-zoom.png` 能看到标题两行比标题与正文还疏。
- 建议：h2/h3/h4 分别显式 `line-height: 1.35 / 1.4 / 1.45`，与 h1 的 1.35 成一套；标题外边距可同步从 1.45em/1.3em 略降到 1.2em，避免整页变矮过多。改完看 `r50-ui-c-04` 同类样本。

### U3（P2）表格用 Segoe UI 14.62 px，正文用宋体 17 px：同页两套字族，且出现第四种字号

- 实测 `HIERARCHY.table`：`tableFamily / tdFamily = "Segoe UI"`，`bodyFamily = "Source Han Serif SC"`，`tdFs 14.62 px`，`bodyFs 17 px`。
- 根因：`src/styles.css:756-761` 的 `.doc-body table { font-family: var(--font-ui); font-size: 0.86em }`。同一页现在有：正文 17 px、代码块 15.3 px、行内代码 14.79 px、表格 14.62 px（前三个是第 49 轮刚调过的）。
- 截图 `r50-ui-c-03-table-zoom.png`：表头/单元格是黑体（Segoe UI 回退），与上下宋体正文明显不同族；`r50-ui-a-03-rich-light-1440-mid.png` 里整张表像「贴进来的另一套 UI」。
- Typora 对照 `shots/typora/01-live-preview.png`：表格与正文同字族同字号，表头只加粗与浅底。
- 建议：`.doc-body table { font-family: var(--font-read); font-size: 0.94em }`（数字列如需要等宽再单独 `font-variant-numeric: tabular-nums`）。改完要跑表格相关测试（单元格 `<br>`、表格范围、整块写回）。

### U4（P2）编辑 / 预览 / 源码三态正文的水平位置和宽度都不一致：切一次模式正文横移 139 px 或变宽 320 px

实测：

| 模式 | 正文左缘 x | 正文宽 | 依据 |
| --- | --- | --- | --- |
| 编辑 | **397** | **576** | `LAYOUT_1440.col/body` |
| 预览 | **536** | 576 | `PREVIEW.rect [536,136,576,540]` |
| 源码 | **376** | **896** | `SOURCE.rect [376,184,896,648]` |

- 编辑态 `.doc-layout` 是 `grid-template-columns: minmax(0,36rem) 260px` + `justify-content:center`（`src/styles.css:266-273`），页边栏占掉 260+28 px，所以正文被挤在偏左的列里；预览切到 `.preview-layout`（`:2432-2440`，单列 36rem）后整块重新居中，正文右移 139 px；源码用 `textarea.source-editor`（`:1538-1547`）撑满 896 px。
- 截图 `r50-ui-b-09-source-1440.png` 与 `r50-ui-b-10-preview-1440.png` 对比 `r50-ui-a-02-rich-light-1440.png`：同一篇稿子切模式时整块文字横向跳。
- 建议：预览沿用编辑态的两列网格（页边栏列在预览里留空），让 `.preview-column` 与 `.doc-column` 同列；源码 `max-width: 36rem`（或至少 760 px）居中。三态对齐后跨模式切换视线不动。

### U5（P2）设置面板的 sticky 页脚把最后一段帮助文字切成两半：第一行上半被按钮行盖住，第二行被对话框底边截断

实测 `SETTINGS_FOOTER`（`.tmp/r50-ui-c-log.txt`）：

| 元素 | rect（x, y, w, h） |
| --- | --- |
| 对话框 | `[505, 20, 430, 860]`（底 880） |
| `.dialog-actions`（sticky, bottom:0, z-index auto） | `[526, 823, 378, 36]`（823–859） |
| 最后一段帮助文字 | `[526, 848, 378, 40]`（848–887） |

- 结果：该段第一行的 **848–859 这 11 px 被按钮行盖住**，只剩 859–880 的下半行露在按钮行下面；紧接着的第二行「能填」又被对话框底边 880 截断（截图 `r50-ui-c-08-settings-bottom.png` 底部能看到半行「协议按 OpenAI 兼容走…」和孤零零的「能填」）。滚动 78 px 后该段才完整（`SETTINGS_SCROLLED`，1024 下要滚 278 px）。
- 根因：`src/styles.css:1181-1190` 的 `.dialog` 只有 `padding: 20px`，`:1233-1241` 的 `.dialog-actions` 是 `position: sticky; bottom: 0`，滚动区没有给 sticky 页脚留底部安全区，页脚也没有盖住整幅底边。
- 建议：把 `.dialog-actions` 移出滚动区做真 footer（`.dialog` 改成 flex 列，内容区单独 `overflow:auto`）；或给 `.dialog` 加 `padding-bottom: 56px` 并给 pages 底部留白。两种都能让最后一行完整可见，且不盖住内容。

### U6（P2）空状态占位符和正文首行不同字体、不同行高：键入第一个字时文字换字族并下移约 6 px

实测：

| 项 | 值 |
| --- | --- |
| `.editor-placeholder` | `[397,136,576,21]`、16 px、`font-family: "Segoe UI"`、`line-height: normal`、`padding: 0 2px` |
| 正文首行 `p` | `[397,136,576,33]`、17 px、`Source Han Serif SC`、`line-height: 33.15 px` |

- `EMPTY2` 与 `TYPED`：占位符是独立绝对定位 div（`src/styles.css:280-289`），显示「从这一句开始写」；键入一个字后占位符消失，同一位置换成 17 px 宋体、行盒高 33 px 的正文。两者同顶对齐，行盒中心差 (33.15−21)/2 ≈ 6 px（基线跟着差），且左侧还差 2 px（占位符内边距）。
- 截图 `r50-ui-a-01-empty-light-1440.png`（占位符）对照 `r50-ui-b-01-hierarchy-light.png`（正文）：字号/字族/基线都不同，空稿敲第一个字会「跳一下」。
- 第 48 轮 48-F4 只记了「字体字号不一致」，本轮补上几何后果与左缩进 2 px。
- 建议：占位符继承正文样式（`font: inherit; line-height: inherit; padding: 0`），或改用 ProseMirror 的 `data-placeholder` 伪元素，天然同一条排版链。

### U7（P2）状态栏字数入口点击区只有 16 px 高，且没有 aria-label

- 实测 `STATUS_BUTTON`：`button.stats-trigger` 矩形 `[12,879,117,16]`，`aria-label: null`，只有 `title`；`src/styles.css:1589-1597` 只重置了 background/border/padding，没有最小高度（`StatusBar.tsx:43` 是普通 `<button>`）。
- 对比：同一轮第 49 轮刚把查找条与表格条的 7+7 个按钮抬到 `min-height: 24px`（实测全 24），状态栏这个入口仍是 16 px —— 低于 WCAG 2.2 目标尺寸 24×24。
- 截图 `r50-ui-c-05-status-zoom.png`（2× 放大）：文字本身 12 px，可点区域就是那 16 px 文字行。
- 建议：`.stats-trigger { display: inline-flex; align-items: center; min-height: 24px; }`，加 `aria-label="字数明细"` 与 `aria-haspopup="dialog"`、`aria-expanded`。改完重跑「Esc 后焦点回正文→状态栏字数入口」那条第 42 轮断言。

### U8（P2）页边批注卡的操作按钮 22 px 高：第 49 轮把查找条与表格条 14 个按钮抬到 24 px 后，这批仍是 22 px

- 实测 `NOTE_CARD.first.buttons`：知道了 `54×22`、追问 `42×22`、联网核对 `66×22`；`src/styles.css:1123-1127` 的 `.note-actions button` 是 `padding: 2px 8px; font-size: 12px`，没有最小高度。
- 「采纳」是批注落地正文的唯一入口（ADR 0003），按钮却比条按钮更小；截图 `r50-ui-b-14-annotations.png`、`r50-ui-c-11-rail-top-zoom.png`（2×）。
- 建议：`.note-actions button { min-height: 24px; }`；卡片总高会 +2 px，需重跑批注定位/`replaceInWindow` 的 E2E。

### U9（P2）工具栏同一排按钮三种高度：插入 25 / H1–S 与视图 24 / `</>` 21，且 `</>` 字号 11 px、基线低 1 px

实测 `TOOLBAR_SIZES`（`.tmp/r50-ui-c-log.txt`）：

| 按钮 | 宽 × 高 | y | font-size |
| --- | --- | --- | --- |
| 插入 ▾ | 55 × **25** | 52 | 12 |
| H1 / H2 / B / I / S / 专注 / 打字机 / 源码 / 预览 | 33/33/25/21/24/42/54/42/42 × **24** | 53 | 12 |
| **`</>`（行内代码）** | 37 × **21** | **54** | **11** |

- 截图 `r50-ui-c-02-toolbar-zoom.png`（2× 放大）：`</>` 比左右按钮小一号且低一像素，字符基线不齐；`插入 ▾` 又高 1 px。
- 根因：`App.tsx:4862` 的 `</>` 按钮里字形是小写字符组合，`src/styles.css` 没给 `.toolbar button` 统一高度/对齐。
- 建议：`.toolbar button { height: 24px; line-height: 1; display: inline-flex; align-items: center; }`，`</>` 的字体与其它按钮统一 12 px（或改用与 H3 同类的图标）。纯 CSS，零字节。

### U10（P2）页边批注卡随文档滚动时被滚动容器上边缘硬切：只剩半张卡，头部「评价/模拟/第 1 处」被裁掉

- 实测 `RAIL_AT_SCROLL600`（滚到最底）与 `NOTE_CARD`：`.doc-scroll` 是 `overflow-y: auto`（`src/styles.css:251-255`），`.note` 是绝对定位（`:999-1011`）；滚动后第一张卡 rect `[996,61,260,144]`，而滚动容器上沿 y=84 → 卡片顶部 23 px 被切。
- 截图 `r50-ui-c-10-rail-scrolled.png` 与 2× `r50-ui-c-11-rail-top-zoom.png`：卡 1 只剩正文两行和按钮行，`评价 模拟 第 1 处` 那行被切掉一半，看起来像渲染坏了，而不是「滚上去了」。
- 建议：给页边栏加顶部渐隐（`.margin-rail { mask-image: linear-gradient(to bottom, transparent 0, #000 12px) }` 之类），或滚动时把完全越界的卡片整卡隐藏（IntersectionObserver），保证任何时候卡都是完整一块。

## 改进建议（不计入本轮 actionable）

### U11（P2，改进）≥1120 px 时页边栏无法收起，空栏常驻 288 px

- `.rail-toggle` 与 `.rail-close` 默认 `display: none`（`src/styles.css:2495-2499`），只在 `@media (max-width: 1119px)` 内出现（`:2529-2551`、`:2597-2600`）。1440 实测「批注」按钮 `display: none`（`LAYOUT_1440.headerButtons`），页边栏 `[1001,136,260,…]` + 28 px 列距，即使 0 条批注也占 288 px；1440 下正文只剩 576 px。
- 对照 Typora：无边栏时正文区可以更宽，侧栏可折叠（`shots/typora/45-sidebar.png` 的页签区）。
- 建议：宽窗也允许收起页边栏（复用 `.rail-toggle`，展开/收起都可见，记住选择）。不属于缺陷，交给产品决定。

---

## 遗留项：本轮复核结果（都有新读数）

| 编号 | 本轮实测 | 结论 |
| --- | --- | --- |
| 48-F2 ≤1119 px 正文反而变宽 | `WIDTH_AT_1120` 正文 540 px → `WIDTH_AT_1119` **851 px**（1 px 变宽 311 px）；1024=756、900=632、800=532 | 仍在（`r50-ui-a-07`、`r50-ui-b-13-800`） |
| 48-F3 查找条占文档流 | `.find-bar` `[0,84,1440,79]`、`position: static`；打开后 `.sidebar`/正文整体下移 79 px | 仍在（`r50-ui-a-11-find-light.png`） |
| 48-F5 表格条全宽文档流 | `.table-bar` `[0,84,1440,37]`、`position: static`、父节点 `.app`；目标单元格 `[393,651,…]`，相距 **530 px**；`.sidebar` y 从 84 → 121 | 仍在（`r50-ui-b-03-table-bar.png`） |
| 47-F2 设置面板要滚 | 1440：`scrollH 936 / clientH 858`（78 px）；1024：`936 / 658`（278 px） | 仍在（`r50-ui-b-04`、`r50-ui-b-06`、`r50-ui-c-09`） |
| 47-F3 主题单选组无方向键 | 3 个 `role=radio` 全 `tabIndex 0`；聚焦第一个后按 `ArrowDown`，`aria-checked` 仍是 `[false,false,true]`、焦点仍 index 0 | 仍在（`r50-ui-b-05-settings-radio.png`） |
| 47-F10 查找条无标签 | `role: null`、`aria-label: null`；两个输入框 `aria-label: null`（只有 placeholder「查找」「替换为」） | 仍在 |
| 49-N2 Mermaid 默认配色 | 浅色节点填充 `rgb(236,236,255)` vs 纸底 `rgb(255,253,248)` = **1.15:1**；深色 `rgb(31,32,32)` vs 容器 `rgb(28,31,35)` = **1.01:1**；图内文字 `"trebuchet ms"` 16 px | 仍在（`r50-ui-d-01/02/03`） |

## 需要纠正的历史结论

- **第 49 轮 N5（「侧栏页签 hover 没有视觉反馈」）不复现，判定为误报。** 全局规则 `src/styles.css:141` `button:hover:not(:disabled) { background: var(--accent-wash); color: var(--accent-ink) }` 在 `57e2a81` 的同一份文件里就已存在（当时是第 137 行，`git show 57e2a81:src/styles.css`）。本轮实测 `TAB_HOVER`：把鼠标移到非当前页签「文件」上，`background: rgb(232,240,237)`、`color: rgb(35,84,77)`、`hovered: true`、`transition: background, color 0.12s`。**这轮不要再修它。**
- **第 49 轮 N1（Mermaid 错误色深色 3.03:1）已修复且复核通过**：本轮实测浅色 `rgb(180,69,58)` / 纸底 = **5.36:1**，深色 `rgb(232,145,127)` / `rgb(28,31,35)` = **6.92:1**（`MERMAID_LIGHT/DARK`）。

## 试过、判断没有问题的项（本轮都有实测）

- **125% 缩放无溢出**：CDP `Emulation.setDeviceMetricsOverride(1152×720, deviceScaleFactor 1.25)` 下 `devicePixelRatio=1.25`、`innerWidth/Height=1152/720`；`.doc-scroll` `924/924`、工具栏 38 px 不换行、状态栏与顶栏都不溢出、`html` `1152/1152`。截图 `r50-ui-b-11-zoom125.png`、`r50-ui-b-12-zoom125-mid.png`。（只模拟 1.25，见 UNVERIFIED。）
- **窄窗 900 / 800 无横向滚动、不换行**：工具栏 38 px、顶栏 46 px、状态栏 28 px；正文 632 / 532 px（`NARROW_900/800`、`r50-ui-b-13-narrow-800.png`）。
- **焦点环在深色下可见**：顶栏按钮 `outline: rgb(156,203,194) solid 2px` + `outline-offset: 2px`（`FOCUS_DARK`）。
- **reduced-motion 生效**：`emulateMedia({reducedMotion:'reduce'})` 后顶栏/工具栏/页签/大纲行的 `transition-duration` 与 `animation-duration` 都是 `1e-05s`（`REDUCED_MOTION`）。
- **页签 hover 与大纲行 hover 都有反馈**：页签 `transparent → rgb(232,240,237)`、文字 `rgb(102,108,114) → rgb(35,84,77)`；大纲行同样（`TAB_HOVER`、`OUTLINE_HOVER`）。
- **大纲语义完整**：`aside aria-label="大纲"`；行是 `<button>`、当前项 `aria-current="location"`；折叠按钮 `aria-expanded` + `aria-label="折叠/展开「…」"`，无子标题的叶子行不渲染折叠按钮（`Outline.tsx:52-72`、`OUTLINE_ROW`）。
- **字数明细面板可用**：`role=dialog` + `aria-label="字数明细"`、13 px 行、标签对比 5.23:1、打开后 `focusInside: true`、Esc 关闭、距状态栏 19 px（`STATS_PANEL`、`r50-ui-c-07-stats-zoom.png`）。
- **设置面板语义完整**：`role=dialog`、`aria-label="设置"`、`aria-modal="true"`、打开后焦点在面板内、Tab 顺序从主题单选开始（`SETTINGS_1440`、`SETTINGS_TAB_ORDER`）。
- **表格条删除三项用危险色**：删行/删列/删表 `rgb(180,69,58)`，插入三项 `rgb(35,84,77)`（`TABLE_BAR`），第 42 轮的语义保持。
- **页边栏不遮挡工具栏**：滚动到 200 px 与最底（实际 `scrollTop=253`）时，工具栏「源码」按钮中心 `document.elementFromPoint` 仍返回该按钮，页边栏只是被 `.doc-scroll` 裁切，没有盖住顶栏/工具栏（`RAIL_AT_SCROLL200/600`）。上一条 U10 是「卡片被裁」的视觉问题，不是层级/遮挡问题。
- **长 URL / 代码块不撑破版面**：`.doc-scroll` `sw == cw`，`pre` `754/754`（1024）、`pre-wrap` 折行（`GEOM_1024`）。
- **Mermaid 错误图不残留 body**（第 47 轮修复维持）：`bodyHasStray` 未再出现；错误块样式独立。
- **active / disabled / focus-visible 三态可辨**（`.tmp/r50-ui-e-log.txt`）：光标在 H1 时 `aria-pressed="true"` + `background rgb(232,240,237)` + `color rgb(35,84,77)`；源码模式下格式按钮 `disabled: true`、`opacity 0.4`、`cursor: default`，视图按钮 `opacity 1`、`cursor: pointer`，可点与不可点分得开；`.stats-trigger` 键盘聚焦时 `outline: rgb(102,108,114) solid 2px`（对纸底 4.83:1，过 3:1 的 UI 组件对比要求）。
- **控制台 0 错误**：A/B/C/D/E 五段全空。

## UNVERIFIED

- **真实系统 125% / 150% 缩放**：本轮只用 CDP 覆盖模拟 1.25（1152×720 @1.25），没在真实系统缩放的机器上看；150% 与 175% 未测。补测：1200×750 @1.5 再跑一遍 `e2e-r50-ui-c.mjs` 的 `ZOOM_MEASURE`。
- **屏幕阅读器实录**：只做 DOM/AX 属性审计，没有 NVDA/讲述人播报（U7 的 aria 影响未在真机上听）。
- **真实中文输入法与 IME**：全部 `fill` / `keyboard.type`，未走组合输入；U6 的「键入跳一下」是在无 IME 下测的。
- **文件树有内容态**：需要真实文件夹句柄；本轮只有「还没有打开文件夹」空态（`r50-ui-a-01`、`r50-ui-b-01`）。
- **U11 的收起方案**：没做实验，不知道宽窗隐藏页边栏后正文是否要跟着重排、是否影响批注锚点定位。
- **打印 / 导出版面**：本轮未覆盖（第 49 轮也没覆盖）。
- **WebView2 宿主内同一批界面**：本轮只在浏览器 `http://localhost:5175` 上测，宿主窗口的字体渲染/DPI 可能不同。

## 最短复现清单

1. U1：正文写 `#### 四级标题` 和一行 `**粗体文字**` → 读两者 `font-size/font-weight`（都是 17 px / 700）；`Select-String src/styles.css -Pattern 'h4'` 0 命中。
2. U2：写一个会折成两行的 `##` 标题 → 读 `getComputedStyle(h2).lineHeight` = 43.758 px；量两行行盒 y（216 / 260）与下一段 y（310）。
3. U3：写一张表 → 读 `.doc-body td` 的 `fontFamily`（`Segoe UI`）、`fontSize`（14.62 px），对照正文 `Source Han Serif SC` / 17 px。
4. U4：打开一篇长文 → 记下正文左缘 x=397 → 点「预览」→ x=536 → 点「源码」→ 文本域 x=376、宽 896。
5. U5：打开设置 → 滚到底前读 `.dialog-actions` 与最后一段的 rect（`[526,823,378,36]` vs `[526,848,378,40]`）→ 看 `r50-ui-c-08-settings-bottom.png` 底部被切断的「能填」。
6. U6：新建空稿 → 读 `.editor-placeholder`（16 px / Segoe UI / 21 px 行盒）→ 键入一个字 → 读正文首行（17 px / 宋体 / 33.15 px 行盒），同一 y 起。
7. U7：读 `document.querySelector('.stats-trigger').getBoundingClientRect().height` = 16，`getAttribute('aria-label')` = null。
8. U8：选中一段按 `Ctrl+Enter` 生成模拟批注 → 读 `.note-actions button` 高度 = 22。
9. U9：读工具栏各按钮 rect 高度（25 / 24 / 21）与 `</>` 的 `font-size` = 11 px。
10. U10：生成批注后把 `.doc-scroll` 滚到底 → 第一张卡 rect.y = 61，小于滚动容器上沿 84 → 卡片头部被切。

## 只读声明

本轮只读 `src/`，未改任何产品文件；新增文件仅 `docs/iteration/round-50/findings-ui.md`、`shots/round-50/r50-ui-*`、`.tmp/e2e-r50-ui-{a,b,c,d}.mjs` 与 `.tmp/r50-ui-*-log.txt`。未 push、未动 `release/`。
