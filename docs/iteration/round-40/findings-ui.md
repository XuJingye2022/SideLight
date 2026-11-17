# 第 40 轮 界面美观与可访问性 侦察报告（finder-ui）

- 轮次：40；轮前 `startSha=504dedd22b1133c7629bc1a437ca24b8a8889322`（`git rev-parse HEAD` 一致）
- 环境：dev server `http://localhost:5175`（未重启）、CDP **9226**、视口 1440×900 / 1024×700 / 1152×720、浅色 / 深色（真实路径：设置对话框点「深色」并保存）
- 只读产品代码，未改 `src/`；未 push、未动 `release/`
- 脚本：`.tmp/e2e-r40-ui-main.mjs`（矩阵）、`.tmp/e2e-r40-ui2.mjs`（inert / 批注时序 / toast / Mermaid / 真实 125%）、`.tmp/e2e-r40-ui3.mjs`（单句段落 / 主题切换 / 命中区）、`.tmp/e2e-r40-ui4.mjs`（插入菜单 / 工具栏按下态 / 大纲）
- 原始输出：`.tmp/r40-ui-log.txt`、`.tmp/r40-ui-log2.txt`、`.tmp/r40-ui-log3.txt`、`.tmp/r40-ui-log4.txt`
- 截图：`shots/round-40/r40-ui-01 … r40-ui-40`（本角色 31 张，目录里其他角色的截图未改动）
- 控制台：4 个脚本 `CONSOLE_ERRORS` 全为 `[]`，`REQ_FAILED` 全为 `[]`

## 截图矩阵

| 项 | 截图 |
| --- | --- |
| 空状态 浅色 1440 | `r40-ui-01-empty-light.png` |
| 富文本 浅色 1440 | `r40-ui-02-rich-light-1440.png` |
| 表格工具条 | `r40-ui-03-table-toolbar.png` |
| 查找条 | `r40-ui-04-findbar.png` |
| 大纲 | `r40-ui-05-outline.png`、`r40-ui-40-outline-detail.png` |
| 字数面板 1440 / 1024 | `r40-ui-06-stats-panel.png`、`r40-ui-30-narrow-stats.png` |
| 设置 浅色 / 深色 | `r40-ui-07-settings-light.png`、`r40-ui-12-settings-dark.png` |
| 批注卡（模拟流） | `r40-ui-08-annotations-light.png`、`r40-ui-32-analyze-timeline.png` |
| 源码 / 预览 浅色 | `r40-ui-09-source-light.png`、`r40-ui-10-preview-light.png` |
| 深色 1440 / 预览深色 | `r40-ui-11-rich-dark-1440.png`、`r40-ui-27-preview-dark.png` |
| 窄窗 1024×700 / 设置窄窗 | `r40-ui-13-narrow-1024.png`、`r40-ui-31-narrow-settings.png` |
| 真实 125%（DPR 1.25） | `r40-ui-35-zoom125-real.png`（`r40-ui-14` 是旧口径，不用） |
| 焦点环 / 空状态焦点框 | `r40-ui-15-focus-ring.png`、`r40-ui-01-empty-light.png` |
| 文件菜单 / 插入菜单 | `r40-ui-25-file-menu.png`、`r40-ui-39-insert-menu.png` |
| Mermaid 浅色 / 切深色后 | `r40-ui-32-analyze-timeline.png`、`r40-ui-37-mermaid-after-theme-save.png` |
| 提示条（导出成功） | `r40-ui-33-toast.png` |
| 单句段落误报错误 | `r40-ui-36-single-sentence-false-error.png` |
| 工具栏无按下态 | `r40-ui-38-toolbar-no-active-state.png` |

---

## 发现

### F1（P1，第 39 轮 F1 仍未修）只读预览没有排版容器：字体、行高、限宽、表格、引用全部丢失

`PreviewPane` 只渲染 `.doc-column.preview-column > article.ProseMirror.preview-pane`，**没有 `.doc-layout`**；全部正文排版规则挂在 `.editor` 作用域（`src/styles.css:559` 起），预览的 `<article>` 类名没有 `editor`。`src/styles.css:2315-2321` 只给 `.preview-column` 加了 `padding-bottom: 80px`、`.preview-pane` 加了 `min-height: 60vh`。

实测（`.tmp/r40-ui-log.txt` `PREVIEW` / `PREVIEW_DARK`）：

| 元素 | 编辑态 | 预览态 |
| --- | --- | --- |
| 容器 | 576px（`styles.css:253` 的 `minmax(0,36rem)`） | **1212px**，从 x=218 贴住侧栏，无 52/32px 内边距 |
| h1 | Source Han Serif SC 31.45px / 1.35 | **Segoe UI 32px / normal** |
| 正文 | 17px / 33.15px | **16px / normal** |
| table | 576px 宽，`th` 有 1px 边框 + 表头底色 | **189px，`th` 边框 0px** |
| blockquote | 左边线 + 缩进 | **border 0px、padding 0px** |

截图 `r40-ui-10-preview-light.png`（标题贴侧栏、表格散架）、`r40-ui-27-preview-dark.png`（深色同样）。
复现：任意文档 → 点「预览」→ 观察标题变成无衬线、正文贴左侧、表格无框。与 Typora 的预览（`shots/typora/01-live-preview.png` 有统一排版）差距明显。
建议：预览复用 `.doc-layout`（或把正文排版提取成 `.doc-body` 共用类），给 36rem 限宽与 `52px 32px 220px` 内边距；表格/引用/标题样式对预览生效。

### F2（P2，新）切换主题不重画 Mermaid：深色正文里留着一张浅紫色图

真实用户路径：文档里有 ```mermaid 图 → 设置 → 深色（对话框内即时预览）→ 保存。页面变深色（`data-theme=dark`、`localStorage theme=dark`、正文底色 `rgb(21,23,26)`），但图仍保持浅色渲染：节点 `fill rgb(236,236,255)`、描边 `rgb(147,112,219)`、文字 #333（`.tmp/r40-ui-log3.txt` `MER_BEFORE` / `MER_AFTER_PREVIEW_DARK` / `MER_AFTER_SAVE_DARK`）。截图 `r40-ui-37-mermaid-after-theme-save.png` 是一张亮白节点图挂在深色纸面上。

根因（读码）：
- `src/lib/mermaidPreview.ts:16` `svgCache` 只用代码 hash 作键；`:58-62` 命中缓存就不再渲染，主题变化不触发重画。
- `src/lib/mermaidLazy.ts:51-61` 主题只在模块 `initialize` 时读一次 `data-theme`。

复现：载入含 mermaid 的文档 → 等图出 → 设置切「深色」并保存 → 图仍是浅紫。
建议：缓存键加主题（`hash + theme`），监听主题变化清缓存并重画；同时把 `themeVariables` 接到现有 CSS 变量（`--paper-raised`/`--accent`/`--line`），不要吃 mermaid 默认色板（第 39 轮 F8 的配色不一致也一并解决）。

### F3（P2，新）单句段落点「分析本段（模拟）」会误报「模型没按约定格式回」，但批注其实已经生成

复现（`.tmp/r40-ui-log3.txt`）：文档只有一句正文「这是一句完整的话。」→ 光标放句中 → 点「分析本段（模拟）」→ 页边出现 1 条评价 + 1 条整体评价，同时底部弹出错误提示「模型没按约定格式回，重试一次看看。」（截图 `r40-ui-36-single-sentence-false-error.png`）。

代码依据：
- `src/lib/ai.ts:263-272`：单句段落走 `pool.length === 1` 分支，只返回 `evaluation` + `overall`，**没有 `meta` 条目**。
- `src/App.tsx:1536-1538`：分析结束 `if (!goalSeen && !aborted) show('模型没按约定格式回…')`，`goalSeen` 只有收到 `meta` 才置真。

第二种表现：段落里每句都短于 6 字时，`src/lib/ai.ts:256-258` 的 `length >= 6` 会过滤掉全部句子 → 模拟流返回空 → 不生成批注，却同样弹这句真模型错误文案（本轮矩阵首跑就在这种段落上出现 0 张卡 + 该错误提示）。
建议：模拟流不要再要求 `meta`（或单句分支补一条 meta），并给「本地模拟」单独的错误/空结果文案；`goalSeen` 只用于真模型路径。

### F4（P2，第 39 轮 F3 仍未修）字数明细面板固定 941px 宽，1024 窗盖住 92% 宽度

`.stats-detail` 实测 `941×285`（1440 视口 `[16,575,941,285]`；1024 视口 `[16,375,941,285]`，占窗口 92%），标签左对齐、数值右对齐相隔 900px（`.tmp/r40-ui-log.txt` `STATS`/`STATS2`、`r40-ui-log3` `NARROW_STATS`；截图 `r40-ui-06-stats-panel.png`、`r40-ui-30-narrow-stats.png`）。

根因：`src/components/StatsDetail.tsx:18-32` 的 `panelStyle` 只有 `minWidth: 240px`、没有 `maxWidth`；`:119` 底部帮助文字是一条长句、中文无空格且 `overflow-wrap: normal`，把面板撑到 911px（`helpTextWidth`）。
建议：`max-width: 320–360px` + `overflow-wrap: anywhere`，标签与数值做两列网格；窄窗改底部抽屉并限制高度。

### F5（P2，第 39 轮 F5 仍未修）设置对话框末段被 sticky 页脚压住

1440×900：对话框 `430×860`（y 20–880），滚动内容 `scrollHeight 936 / clientHeight 858`；最后一段「协议按 OpenAI 兼容走…」`[848,887]`，底边越过对话框 7px，正落在 sticky 页脚（`快捷键/取消/保存`，y 823–859）下面（`.tmp/r40-ui-log.txt` `SETTINGS`、`NARROW_SETTINGS`；截图 `r40-ui-07-settings-light.png`）。
1024×700：对话框 `430×660`（底 680），末段 `[848,887]`，被压得更深（截图 `r40-ui-31-narrow-settings.png`）。

根因：`src/styles.css:1128-1131` `.dialog` 自身是滚动容器，`src/styles.css:1180-1188` `.dialog-actions` 是 `position: sticky; bottom: 0`；`src/components/SettingsDialog.tsx:186-188` 末段帮助文字紧跟页脚，滚动区没有给页脚留 `padding-bottom`。
建议：滚动容器加 `padding-bottom: calc(页脚高 + 8px)`，或让对话框 `display:flex;min-height:0`、正文与页脚分区（页脚不进滚动区）。

### F6（P2，第 39 轮 F2 仍未修）正文整列画 2px 青绿焦点框，空状态看起来像一个输入框

全局 `:focus-visible { outline: var(--focus-ring) }`（`src/styles.css:147-150`）会命中 `div.tiptap.ProseMirror.editor`；实测 `outline-style: solid`（`r40-ui-log.txt` `TYPO.proseMirrorOutline`），画在 576×整篇高度的正文列上。最刺眼的是首启空文档：`r40-ui-01-empty-light.png` 里「从这一句开始写」四周是一个完整的青绿矩形，像校验失败/输入框；正常打字时截图 `r40-ui-02`、`r40-ui-03`、`r40-ui-32` 都能看到整圈边框。
建议：`.editor:focus-visible { outline: none }`，键盘进入的可见提示改成 caret 或顶部细线；不要给整篇正文画框。

### F7（P2，第 39 轮 F4 仍未修）表格工具条：全宽、离表格 601px、删除与插入同色、按钮无标签

- 位置/尺寸：`rect [0,84,1440,36]`，表格 `y=685`，工具条在表格上方 **601px**；出现时把正文整体下推 36px（`TABLEBAR` 的 `gap:-601`，截图 `r40-ui-03-table-toolbar.png`，侧栏页签从 y=95 落到 131）。
- 7 个按钮 `aria-label`/`title` 全为空，字号 11.5px、高 23px，`上插入`/`下插入`/`左插入`/`右插入`/`删行`/`删列`/`删表` 完全同色（`src/App.tsx:4709-4729`；`src/styles.css:1877-1898` 只有 `--accent-ink`，没有危险色）。
- 没有分组/分隔线，右侧约 1000px 空白。
建议:工具条贴住表格（或浮动在表格上方）不要全宽；插入与删除分组、删除三项用 `--danger`；补 `title`/`aria-label`。

### F8（P2，新）「插入 ▾」菜单没有 menu 语义，Esc 后焦点掉到 BODY；与「文件 ▾」完整实现不一致

实测（`.tmp/r40-ui-log4.txt` `INSERT_MENU*`）：
- 触发按钮 `aria-expanded`/`aria-haspopup` 均为 `null`；弹出层是 `div.menu`，`role`/`aria-label` 均 `null`，9 个按钮没有 `role=menuitem`（`src/App.tsx:4536-4598`）。
- 打开后焦点留在触发按钮，`Tab` 才进第一个菜单项「表格」。
- 在菜单项上按 `Esc`：菜单关了，`document.activeElement` 变成 **BODY**（`src/App.tsx:3568-3572` 只对 `exportOpen` 还原 `exportTriggerRef`，`menuOpen` 没有还原）。

对照「文件 ▾」菜单（`.tmp/r40-ui-log.txt` `FILE_MENU*`）：`role=menu`、打开即聚焦第一项、`ArrowDown` 移动到「关闭文档」、`Esc` 关闭并回焦触发按钮，全部正常；侧栏 tab 也有 roving tabindex 与方向键（`src/App.tsx:4745-4759`）。截图 `r40-ui-39-insert-menu.png`、`r40-ui-25-file-menu.png`。
建议：插入菜单复用 `FileMenu` 的 roving-focus 逻辑，补 `aria-haspopup/expanded`、`role=menu/menuitem`，Esc 后 `focus()` 回「插入」按钮；顺带加分隔线（插入类 / 公式类 / 链接）。

### F9（P3）工具栏格式按钮没有按下态，也没有 `aria-pressed`：看不出当前在 H2 / 加粗里

- 代码：`src/App.tsx:4602-4619` 的 H1/H2/B/I/S/`</>` 全部没有 `className` 或 `aria-pressed`；对比「专注/打字机」是有 `is-on` 的（`:4625-4643`）。
- 实测：光标放进 `**加粗的文字**` 内部后，`B` 按钮 `class=""`、`aria-pressed=null`、背景/文字色与静止态相同（`.tmp/r40-ui-log4.txt` `TOOLBAR_STATE_IN_BOLD`；`TOOLBAR_STATE_IN_H2` 里 H2 同样 `class=""`）。
- 全页 `[aria-pressed]` 数量 **0**（`r40-ui-log.txt` `A11Y.ariaPressedCount`）。截图 `r40-ui-38-toolbar-no-active-state.png`（光标在加粗文字里，B 仍是灰字）。
建议：按 `editor.isActive('bold'/'italic'/'heading', {level})` 给 `is-on` 类与 `aria-pressed`，视觉上用 accent 底/字（与侧栏选中一致）。

### F10（P3）可点目标偏小；大纲层级只有 10px 步进

- 命中区（`r40-ui-log.txt` `TARGETS`、`r40-ui-log3` `SMALL_HITS`、`r40-ui-log4` `OUTLINE_DETAIL`）：斜体 `I` **21.2×24**、行内代码 `</>` **37.3×21**、状态栏字数 **110.5×16**、大纲折叠按钮 **14×24**。WCAG 2.2 AA 2.5.8 最小 24×24。
- 大纲缩进：H1 `padding-left 0`、H2 `10px`、H3 `20px`，12.5px 字号下层级几乎看不出（截图 `r40-ui-40-outline-detail.png`）；当前项只靠 accent 文字 + 底色，进一步掩盖缩进。
建议：小按钮统一 `min-width:24px; min-height:24px`（图标按钮可保 24 高、加宽点击区），状态栏字数按钮至少 24 高；大纲每级 16–20px 或加层级竖线。

---

## 试过、判断没有问题的项（都有本轮实测）

- **对比度**：深色正文 14.42:1、h1 14.42:1、引用 7.92:1、状态栏 6.54:1、侧栏 tab 6.58:1、工具栏 7.65:1（`CONTRAST_DARK`）；浅色沿用第 39 轮 14.88/6.16/5.03/5.94/14.12，全部过 AA。`::selection` 深色 `rgba(121,179,170,.22)`、浅色 `rgba(43,109,100,.22)`，正文颜色不变。
- **设置对话框焦点**：`role=dialog` + `aria-modal=true`；打开时焦点进框内，**Tab 26 次没有一次逃出对话框**；打开期间 6 个兄弟节点被加 `inert`，Esc 后 `[inert]` 清零、焦点回到「设置」按钮（`SETTINGS_TRAP_OPEN/26TABS/AFTER_ESC`，另做 3 轮开/关复测均干净，`r40-ui-log2` `INERT_ROUNDS`）。
- **字数面板键盘**：触发按钮 `aria-haspopup=dialog`、`aria-expanded=true`、`aria-controls=stats-detail`；打开即聚焦面板，Esc 关闭且焦点回触发按钮（`STATS2`/`STATS_AFTER_ESC`）。
- **文件菜单**：`role=menu` + `aria-haspopup/expanded`，打开即聚焦第一项，`ArrowDown` 能移动，`Esc` 关闭并回焦（`FILE_MENU*`）。
- **侧栏页签**：`role=tablist`，`aria-selected` 正确，roving tabindex（选中 0、另一个 -1），ArrowLeft/Right/Home/End 已实现（源码 `src/App.tsx:4745-4759`），面板有 `role=tabpanel`（`FileTree.tsx:226`）。
- **窄窗 1024×700**：`documentElement.scrollWidth = clientWidth = 1024`，无横向溢出；`.margin-rail` 自动 `display:none` 并出现「批注」开关（47×28，x=965）；工具栏不换行、状态栏不截断（`NARROW`、`r40-ui-13-narrow-1024.png`）。
- **真实 125% 缩放**：CDP `deviceScaleFactor 1.25` 这次生效（`devicePixelRatio=1.25`、`innerWidth=1152`），`scrollWidth=clientWidth=1152`，无溢出；正文列 572px、工具栏/状态栏整数宽（`ZOOM_125_REAL`、`r40-ui-35-zoom125-real.png`）。
- **提示条（toast）**：导出后出现 `role=status` + `aria-atomic=true`，`140×38` 居中底部 `[650,816]`，不与 28px 状态栏重叠（`TOAST_AFTER_EXPORT`、`r40-ui-33-toast.png`）。第 39 轮 F6 说「toast 不会被播报」不成立：`role=status` 本身构成 live region。
- **hover / disabled**：文件菜单、分析按钮、状态栏字数、非选中 tab、工具栏按钮 hover 统一 `--accent-wash` 底 + `--accent-ink` 字；空文档「分析本段（模拟）」`disabled` + `opacity .4` + `cursor:default`（`HOVER`、`EMPTY`）。
- **reduced-motion**：`prefers-reduced-motion: reduce` 下按钮 `transition/animation: 1e-05s`（`REDUCED_MOTION`，`src/styles.css:2482-2489`）。
- **字体**：编辑区与 h1 实际使用 `Source Han Serif SC`（web font 已加载，`document.fonts.check` 为 true，18 个 face，KaTeX 字体按需），UI 用 Segoe UI；没有掉回系统衬线。
- **源码框**：13px 等宽 / 24.05px 行高、进入即聚焦、`tabIndex=0`、内阴影样式（`SOURCE`、`r40-ui-09-source-light.png`）。
- **预览里的公式与脚注**：KaTeX 与「注释」区正常（`r40-ui-10-preview-light.png`），只有 F1 的排版容器缺失。
- **深色设置/菜单/工具栏/状态栏/行内代码/代码块**全部跟随主题变量（`DARK_STYLES`）。
- **滚动条**：10px 宽、thumb `content-box` + 透明 3px 边框的圆角样式存在（`styles.css:2356-2370`），文档区可滚动（`scrollH 1274 / clientH 696`）。

## 其他观察（有证据，暂不单列）

- **H2 行高节奏仍不一致**：h1 31.45px/42.46px（1.35），h2 22.44px/**43.76px**（1.95），h3 同样继承 1.95（`TYPO`）；H2 的单行行框比 H1 还高。第 39 轮 F9 仍未修，建议 h2 1.45–1.5、h3 1.5–1.6。
- **1024 宽时正文列反而变宽**：1440 下 576px（约 33 个汉字/行），1024 下 756px（约 44 个/行，`NARROW`）；窄窗隐藏页边栏后没有给正文加限宽，行长随窗口反向变化。
- **预览不渲染 Mermaid**（fence 以代码块显示，`r40-ui-10`）；README 已写「预览面板不含图」，属已知功能缺口。
- **插入菜单 9 项无分组**（表格/代码块/引用/任务列表/分割线/图片/公式/公式块/链接同列），与文件菜单的分组 + 分隔线不一致（`r40-ui-39-insert-menu.png`）。

## UNVERIFIED

- **屏幕阅读器实录**：只做 DOM 层审计（角色、可访问名、aria-*、焦点），没有 NVDA/讲述人实际播报。
- **真实 Windows 125%/150%/200% 与 WebView2 宿主**：本轮 125% 用 Chromium CDP 的 `deviceScaleFactor=1.25` 验证了布局与 DPR，宿主里的系统缩放未测。
- **真实文件树有文件的状态、真实右键/确认框**：headless 下无法点 FSA 系统 picker，只截到空文件夹状态。
- **真实中文输入法组合输入、打印样式、macOS 快捷键**：本轮未测。
- **「跟随系统」主题下的 Mermaid**：只验证了显式切「深色」；`prefers-color-scheme` 分支未在深色系统上跑。
- **链接颜色对比度**：本轮文档没有链接节点（`TYPE_DETAIL.a = null`），未测；补测在一个含 `[链接](url)` 的文档上取 `::selection`/`color`。
