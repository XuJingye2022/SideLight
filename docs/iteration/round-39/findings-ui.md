# 第 39 轮 界面美观与可访问性 侦察报告（finder-ui）

- 轮次：39；轮前 `startSha=59a4f933dfd411039c939b1e70d7bbdcd7ed82f8`（`git rev-parse HEAD` 一致，工作区干净）
- 环境：dev server `http://localhost:5175`（未重启）、CDP **9226**、视口 1440×900 / 1024×700 / 1152×720、浅色 / 深色（真实路径：`localStorage['sidelight.settings.v1'].theme='dark'` + reload）
- 只读产品代码，未改 `src/`；未 push、未动 `release/`
- 脚本：`.tmp/e2e-r39-ui1.mjs`、`.tmp/e2e-r39-ui-main.mjs`、`.tmp/e2e-r39-ui2.mjs`、`.tmp/e2e-r39-ui3.mjs`、`.tmp/e2e-r39-ui4.mjs`；原始输出 `.tmp/r39-ui-log.txt`、`.tmp/r39-ui-log2.txt`、`.tmp/r39-ui-run3.log`、`.tmp/r39-ui-log4.txt`
- 截图：`shots/round-39/r39-ui-*.png`（本角色 28 张；该目录另有其他角色截图，未改动）

## 环境处置（给后续 agent）

CDP 9226 一开始不可用：`node .tmp/reset.mjs 9226` 连不上（`browserType.connectOverCDP: Timeout`），但 `/json/version`、`/json/list` 与 WS 101 握手都正常。原因是一个卡死的 `http://localhost:5173/` 页面（僵尸 server）占着 target 列表。用 `GET http://127.0.0.1:9226/json/close/72B6BDAEA5243098E6CAC0D8BF506741` 关掉它之后 `reset.mjs 9226` 立即返回 `{"reset":true,...,"doc":"\n"}`。没有 kill msedge、没有起浏览器。

## 截图矩阵

| 项 | 截图 |
| --- | --- |
| 空状态 浅色 1440 | `shots/round-39/r39-ui-01-empty-light.png` |
| 富文本 浅色 1440 | `r39-ui-02-rich-light-1440.png` |
| 表格工具条 | `r39-ui-03-table-toolbar.png`、`r39-ui-24-table-bar.png` |
| 查找条 | `r39-ui-04-findbar.png` |
| 大纲 | `r39-ui-05-outline.png`、`r39-ui-23-outline-1440.png` |
| 字数面板 | `r39-ui-06-stats-panel.png`、`r39-ui-22-stats-1024.png` |
| 设置 浅色 / 深色 | `r39-ui-07-settings-light.png`、`r39-ui-30-settings-dark-real.png` |
| 页边批注（模拟流） | `r39-ui-08-annotations-light.png`、`r39-ui-20-rail-after-analyze.png` |
| 源码 / 预览 | `r39-ui-09-source-light.png`、`r39-ui-17-preview-clean.png` |
| 深色 1440 | `r39-ui-11-rich-dark-1440.png`、`r39-ui-31-mermaid-dark-real.png` |
| 窄窗 1024×700 | `r39-ui-13-narrow-1024.png` |
| 125% 缩放（1152×720） | `r39-ui-14-zoom125.png` |
| 焦点环 / 按下态 | `r39-ui-15-focus-ring.png`、`r39-ui-16-editor-focus-box.png`、`r39-ui-32-bold-active-dark.png` |
| Mermaid | `r39-ui-19-mermaid-typed.png`、`r39-ui-31-mermaid-dark-real.png` |
| 设置被页脚压住 | `r39-ui-07-settings-light.png`、`r39-ui-30-settings-dark-real.png` |

---

## 发现

### F1（P1）只读预览没有排版容器：字体、行高、表格、引用、限宽全部丢失

预览内容的结构是 `.doc-scroll > .doc-column.preview-column > article.ProseMirror.preview-pane`，**没有 `.doc-layout`**，而全部正文排版规则都挂在 `.editor` 作用域下（`src/styles.css:559` 起），预览的 `<article>` 类名里没有 `editor`。

实测（`.tmp/r39-ui-log2.txt` `PREVIEW_LAYOUT`）：

| 元素 | 编辑态 | 预览态 |
| --- | --- | --- |
| 容器宽 | 576px（`.doc-layout` 的 `minmax(0,36rem)`，`src/styles.css:253-259`） | **1222px**，从 x=218 贴住侧栏，无 52/32px 内边距 |
| h1 | `Source Han Serif SC` 31.45px / 1.35 | **`Segoe UI` 32px / normal** |
| p | 17px / 1.95 | **16px / normal** |
| table | 576px，`th` 有 1px 边框、`--accent-wash` 底 | **table 宽 110px，`th` 边框 `0px none`**，视觉上塌成三段文本 |
| blockquote | 左边线 + 缩进 | **`border: 0px none`**，只有 `margin 16px 40px` |

截图：`shots/round-39/r39-ui-17-preview-clean.png`（标题贴侧栏、表格散架）、`r39-ui-18-preview-dark.png`（深色同样问题）。
CSS 依据：`src/styles.css:2295-2301` 只给 `.preview-column` 加了 `padding-bottom: 80px`、`.preview-pane` 只加 `min-height: 60vh`。

复现：任意文档 → 点「预览」→ 观察标题字体变成无衬线、正文贴左侧、表格无框。

建议：预览复用 `.doc-layout`（或把正文排版提取成 `.doc-body` 共用类），给 36rem 限宽与 52px 32px 220px 内边距；表格/引用/标题样式对预览生效。

### F2（P2）编辑区焦点环画在整个正文列上，正常打字时正文四周一直有青绿边框

`document.activeElement` 是 `div.tiptap.ProseMirror.editor.ProseMirror-focused`，`matches(':focus-visible') = true`，套用全局 `:focus-visible`（`src/styles.css:147-150`），算得 `outline: 2px solid rgb(43,109,100); outline-offset: 2px`，画在 576×整篇高度的编辑区上（`.tmp/r39-ui-log2.txt` `EDITOR_FOCUS_BOX`）。

对比证据：`r39-ui-16-editor-focus-box.png`（局部放大，有框）；`r39-ui-02-rich-light-1440.png`、`r39-ui-03-table-toolbar.png`（打字/点表格时有整圈青绿框）；`r39-ui-04-findbar.png`（焦点移到查找框后框消失）。

复现：点正文 → 输入任意字符 → 正文列出现 2px 青绿矩形边框。

建议：`.ProseMirror:focus-visible { outline: none }`，把可键盘进入的提示改成 caret + 顶部一条细线，或仅在 `Tab` 进入（`:focus-visible` 由键盘触发时）显示；不要给整篇正文画框。

### F3（P2）字数明细面板固定 941px 宽，标签与数值相隔 900px

`.stats-detail` 在 1440 与 1024 两个视口都是 `941×285`：标签左对齐 x=31，数值右对齐 right=942（`.tmp/r39-ui-log2.txt` `STATS_1440`/`STATS_1024`，`shots/round-39/r39-ui-06-stats-panel.png`、`r39-ui-22-stats-1024.png`）。1024 宽时窗口内容区 1014px，面板占 941px（93%），跨过侧栏与正文，行内大片空白；面板高度 285px 盖住正文底部。

建议：`max-width: 320-360px`（或按内容定宽），数值列与标签列做成两列网格；窄窗下改为底部抽屉并限制高度。

### F4（P2）表格工具条与主工具栏风格不一致，删除动作与插入动作同色

`shots/round-39/r39-ui-03-table-toolbar.png`、`r39-ui-24-table-bar.png` 与 `.tmp/r39-ui-log2.txt` `TABLE_BAR_STYLE`：
- 36px 高、宽 1440 的全宽条（`bg: color(srgb 0.926 0.946 0.931)`、底部 1px 绿灰线），位置在顶栏下方，离表格 600px 远，出现时把正文整体下推 36px；
- 7 个按钮全为 `11.5px` 文本、`padding: 3px 8px`、高 23px、同色（`rgb(35,84,77)`）、透明底，挤在左侧约 400px 内，右侧约 1000px 空白；
- **`删行`/`删列`/`删表` 与 `上插入`/`下插入` 完全同色同底**，无危险色、无分隔线；7 个按钮都没有 `aria-label`/`title`。

建议：插入与删除分两组（分隔线或右侧分组），删除三项用 `--danger`；工具条贴住表格或做浮动条；补 `title`/`aria-label`。

### F5（P2）设置对话框最后一块内容被固定页脚压住并截断

1440×900 实测（`.tmp/r39-ui-log4.txt` `SETTINGS_DARK_REAL`）：对话框 `y=20, h=860, bottom=880`；最后一段文字 `[848, 887]` 已越过对话框底 880；页脚「快捷键 取消 保存」`y=823..859` 直接压在这段文字上。截图 `shots/round-39/r39-ui-07-settings-light.png`（底部可见被切断的「协议按 OpenAI 兼容走，DeepSeek、」）与 `r39-ui-30-settings-dark-real.png`（深色同样截断，`.dialog-textarea` 只有 86px 可视高、内容 101px，内部再滚一次）。

复现：设置 → 滚到底 → 末段帮助文字被页脚遮住；1024×700 下更严重（对话框 660px 高、内容 936px）。

建议：滚动容器 `padding-bottom` = 页脚高度 + 8px，或把页脚移出滚动区并让滚动区自身收敛（`display:flex; min-height:0`）。

### F6（P2）切换按钮没有 `aria-pressed`，提示与查找计数没有 `aria-live`

`.tmp/r39-ui-log4.txt` `A11Y3`：
- 页面上 `[aria-pressed]` 数量 **0**；`B/I/S/H1/H2/专注/打字机/源码/预览` 9 个切换按钮全部只有文字与 `title`（`toolbar` 数组里 `aria: null`）。点「粗体」后类名仍是空（`BOLD_STATE cls:""`），没有按下态语义。
- 页面 `[aria-live]` 数量 **0**；`src/` 里没有 `role="status"`（`git grep 'role="status"' -- src` 0 命中）。因此保存/错误 toast、查找条「1/1」计数、批注生成结果都不会被屏幕阅读器播报。
- 唯一没有可访问名的控件是隐藏的 `<input type="file">`（0×0，无 `aria-label`，父节点 `.app`）。

建议：切换按钮加 `aria-pressed={active}`；给 `.toast` 容器加 `role="status"`+`aria-live="polite"`（错误用 `alert`），`.find-count` 加 `aria-live="polite"`；文件 input 加 `aria-hidden="true"` 或标签。

### F7（P3）大纲层级缩进只有 10px

`.outline-item`：H1 项 `padding-left: 0`、H2 项 `padding-left: 10px`，两项盒子 x 都是 20，12.5px 字号下层级几乎看不出（`.tmp/r39-ui-log2.txt` `OUTLINE_ITEMS`，`shots/round-39/r39-ui-23-outline-1440.png`）。当前项用 `--accent` 文字 + 底色，进一步掩盖缩进。

建议：每级 16–20px，或加层级竖线/圆点；当前项只改色不改内边距。

### F8（P3）Mermaid 配色是第三方默认色板，与产品配色不一致

浅色：图节点是淡紫底 + 紫边框（`shots/round-39/r39-ui-19-mermaid-typed.png`，是本应用里唯一的紫色元素）；深色：节点 `fill rgb(31,32,32)`、描边与文字 `#ccc`（`.tmp/r39-ui-log4.txt` `MERMAID_DARK_REAL`），与 `--paper-raised #1c1f23` / `--accent #79b3aa` 都不是一套。

建议：`mermaid.initialize({ themeVariables: { primaryColor: …, primaryBorderColor: …, lineColor: …, fontFamily: … } })` 接现有 CSS 变量；体积不变。

### F9（P3）标题行高节奏不一致：h1 1.35、h2/h3 1.95

`src/styles.css:571-589` 只给 h1 写了 `line-height: 1.35`，h2/h3 继承 `.editor` 的 `1.95`；实测 h1 31.45px/42.46px、h2 22.44px/**43.76px**（`.tmp/r39-ui-log.txt` `TYPO`），H2 的单行行框比 H1 还高，多行 H2 会明显发松。

建议：h2 1.45–1.5、h3 1.5–1.6，与 h1 同一节奏。

### F10（P3）模拟分析同时给出互相矛盾的驳回与错误提示（未稳定复现）

第一次跑（`.tmp/r39-ui-log.txt`，截图 `shots/round-39/r39-ui-08-annotations-light.png`、`r39-ui-09-source-light.png`、`r39-ui-10-preview-light.png`）：点「分析本段（模拟）」后，页边同时出现「这段太短，选中一段正文再试。」、模拟说明、虚线提示框和 1 张 `未定位` 卡片，底部 toast 写「模型没按约定格式回，重试一次看看。」，而卡片其实已经生成；该 toast 在后续 5 张截图里一直可见。
第二次同样点击（`.tmp/r39-ui-log2.txt` `RAIL_STATE`/`TOAST_TIMELINE`）：3 张卡片、无 toast、只有模拟说明。两次现象不同，**未稳定复现**，需 planner 决定是否值得查（模拟流不应该产出「模型没按约定格式回」这种真模型错误文案）。

---

## 试过、判断没有问题的项

- **对比度**：浅色正文 14.88:1、引用 6.16:1、状态栏 5.03:1、侧栏提示 5.94:1、表头 14.12:1，全部过 AA；深色正文 14.42:1、引用 7.92:1、状态栏 6.54:1、工具栏 7.65:1。禁用按钮 0.4 透明度（WCAG 对禁用控件无对比度要求）。
- **窄窗 1024×700**：`documentElement.scrollWidth = clientWidth = 1024`，无横向溢出；`.margin-rail` 自动 `display:none` 并出现「批注」开关（47×28 at x=965）；工具栏不换行、状态栏不截断（`shots/round-39/r39-ui-13-narrow-1024.png`）。
- **焦点顺序与焦点环**：`skip-link` → 文件 → 分析本段 → 导出 → 快捷键 → 保存 → 设置 → 插入 → H1 …；12 个控件焦点环统一 `2px solid rgb(43,109,100)`、`offset 2px`（`.tmp/r39-ui-log.txt` `FOCUS_RINGS`、`shots/round-39/r39-ui-15-focus-ring.png`）。
- **hover / disabled**：hover 统一 `--accent-wash` 底 + `--accent-ink` 字（文件菜单、统计按钮、侧栏 tab、工具栏按钮一致）；disabled 为 0.4 透明度 + `cursor: default`（空文档时「分析本段（模拟）」）。
- **reduced-motion**：`src/styles.css:2462` 起 `* { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important }`，实测按钮 `transition-duration: 1e-05s`。
- **查找条**：`Ctrl+F` 焦点进输入框，`↑/↓/✕` 有 `aria-label`（上一处/下一处/关闭查找），无匹配时置灰，`Esc` 只关查找不回正文（`r39-ui-04-findbar.png`）。
- **源码模式**：13px 等宽 / 行高 1.85、进入即聚焦、内阴影焦点框（`r39-ui-09-source-light.png`），与编辑态焦点框风格不同但不误导。
- **预览的脚注与公式**：`r39-ui-17-preview-clean.png` 里 KaTeX 公式与「注释」脚注区正常，只有排版容器缺失（F1）。
- **Mermaid 渲染时延**：载入文档后 3.5s 内出 svg（`MERMAID_AFTER_LOAD svg:1`），编辑区输入围栏也渲染；首轮 400ms 内未见是时序，不是缺陷。深色下渲染即用深色主题（`boxFill rgb(31,32,32)`）。
- **设置深色**：真实路径（`localStorage theme=dark` + reload）下对话框 `rgb(28,31,35)`、输入框 `rgb(21,23,26)`、文字 `rgb(233,230,224)`，全部跟随主题；只有 F5 的截断问题。
- **控制台**：两轮 `console errors: []`、`requestfailed: []`。

## UNVERIFIED

- **真实 125% 缩放**：`Emulation.setDeviceMetricsOverride({deviceScaleFactor:1.25})` 在 `page.evaluate` 里读回 `devicePixelRatio = 1`，没生效；`shots/round-39/r39-ui-14-zoom125.png` 只是 1152×720 CSS 视口（布局等价，栅格未验证）。补测：宿主里把显示缩放设 125% 后截图。
- **文件树有文件的状态**：需要 FSA 文件夹句柄，headless 下无法点系统 picker；只截到空状态（`r39-ui-01-empty-light.png` 左侧）。
- **屏幕阅读器实录**：只做了 DOM 层面的 `aria-pressed`/`aria-live` 统计，没有 NVDA/讲述人实际播报。
- **中文输入法组合输入、打印样式、150%/200% 缩放屏**：本轮未测。
- **F10 的稳定复现**：两次运行结果不同，未定位触发条件。
