# 第 16 轮 · 视觉与界面发现（体验视角）

只读侦察。应用 `http://localhost:5173`，CDP `127.0.0.1:9223`，Edge 157 headless，Windows 11。
截图在 `shots/round-16/`；原始数据在 `.tmp/r16-ux/metrics.json`、`phaseB.json`、`phaseC.json`，脚本同目录。

覆盖：三档主题 × 1440×900 / 1280×800 / 1024×768 共 9 张全景；空态（文件树 / 大纲 / 页边 / 编辑器）；
文件菜单、设置、快捷键、加载骨架；Tab 34 站焦点；1024 长文件名与长标题；深色下模拟批注与悬浮按钮。

**先给结论**：三档主题都正常上色，1024 与 1280 无横向溢出（`documentElement.scrollWidth === innerWidth`）；
最刺眼的是 U1（大纲页签下两个面板叠在一列）和 U2（深色下白字压浅色强调底，2.2–2.4:1）。
U1 一行 CSS 可修，U2 需要加两三个 token。

**三处最刺眼的不一致**（按顺序）：① 大纲页签里文件树没消失，两套面板各占一半（U1）；
② 深色下「分析」浮层与「采纳」按钮白字压浅底，2.2–2.4:1（U2）；③ 字号/圆角/空态三套语言并存，
同一屏 5 档小字、空态一处带虚线框一处光秃秃（U4、U5）。

---

## U1 · 大纲页签下文件树没有真隐藏，两个面板挤在一列（影响最大）

**现象**：点侧栏「大纲」后，文件树（工作区名、新建/刷新/更多、文件行）仍然完整显示在上半屏，
大纲从它的下方开始。1024×768 下实测：文件树高 310 px（y=120），大纲面板高 310 px（y=430），
大纲空态文案被推到 y=444。用户看到「文件」和「大纲」两套内容同时出现在一个页签里。

**证据**

- `shots/round-16/outline-overlap-sidebar.png`：文件行在上、大纲项在下，同屏。
- `shots/round-16/outline-overlap-1024.png`、`shots/round-16/dark-rail-notes-1024.png`（深色同样复现）。
- 实测 `phaseB.json → outlineOverlap`：`treeHiddenAttr: true` 同时 `treeDisplay: "flex"`；
  `treeRect {y:120,h:310}`、`paneRect {y:430,h:310}`、`treeInert: true`。
- `shots/round-16/empty-outline-1024.png`：空态「这篇还没有标题」出现在 y=444，上半屏是文件树。

**根因**：`hidden` 属性靠 UA 样式 `[hidden]{display:none}`，被作者样式 `.file-tree{display:flex}`
（`src/styles.css:271-279`）压过；UA 声明优先级永远低于作者样式，所以属性无效。
`inert` 只挡住键盘，挡不住绘制。

**具体改法**：在 `src/styles.css` 基础段加一条（放 `*{box-sizing}` 之后即可）：
`[hidden] { display: none !important; }`。不要再给 `.file-tree[hidden]` 单独写——
这个仓里同时用 `hidden` 的地方不止一处。改完回归：文件/大纲切换、文件树折叠（40px 竖条）、
窄窗抽屉（`.app.rail-open`）各截一张。

**文件:行**：`src/styles.css:271`（`.file-tree`）、`:1275-1281`（`.sidebar .file-tree{flex:1}`）；
`src/App.tsx:3867-3870`（`hidden={sidebarTab !== 'files' && !treeCollapsed}`）；
`src/components/FileTree.tsx:356`（`hidden={hidden}`）。
**难度**：低（一行 CSS + 4 张回归截图）。

---

## U2 · 深色模式：白字压「会变浅」的强调色，主操作读不清

**现象**：浅色下 `#fff` 字压深青 `--accent`/`--mark` 是 5.4–6.0:1，成立；深色下同一批 token 变成浅青
`#79b3aa`、浅金 `#d8a465`，字仍是写死的 `#fff`。浮层「分析」和批注卡「采纳」都掉到 2.2–2.4:1。

**证据**（按 `src/styles.css` 计算，WCAG 2.1 相对亮度）

| 元素 | 前景 / 背景 | 对比度 | 要求 |
| :--- | :--- | ---: | ---: |
| 深色 `.analyze-bubble`「分析」 | `#fff` / `#79b3aa` | **2.38** | 4.5 |
| 深色 `.note-actions button.accept`「采纳」 | `#fff` / `#d8a465` | **2.23** | 4.5 |
| 浅色同一按钮（对照） | `#fff` / `#2b6d64` | 6.04 | 4.5 |
| 深色 `.auto-save-error`（`--danger` 未定义，走 fallback `#b4453a`） | `#b4453a` / `#15171a` | **3.29** | 4.5 |

- `shots/round-16/dark-bubble-1024.png`：「分析」浮层实测 `color: rgb(255,255,255)`、
  `background: rgb(121,179,170)`（`phaseB.json → bubbleDark`）。
- `shots/round-16/dark-rail-notes-1024.png`：深色批注卡；「采纳」按钮同文件同款写死白字。
- `:root`（`styles.css:1-25`）与深色块（`:28-47`、`:50-71`）都没有 `--danger`。

**具体改法**

1. 加 token：`:root { --on-accent: #fff; --on-mark: #fff; }`，深色块里
   `--on-accent: #15171a; --on-mark: #15171a;`（浅底配深字，而不是继续用白）。
2. `.analyze-bubble`（`:958-968`）、`.analyze-bubble:hover`（`:971-974`）、
   `.note-actions button.accept` + `:hover`（`:945-954`）把 `#fff` 换成新 token；
   `accept:hover` 现在用 `color-mix(mark 80%, #000)`，深色下会更暗，也要一起看。
3. `--danger` 补进两套主题（浅色 `#b4453a`，深色 `#e08a7c` 一类），
   `.auto-save-error`（`:1419-1422`）不再依赖 fallback。
4. 回归：深色下截图「分析」浮层、含修订批注的页边（「采纳」可见）、状态栏失败态。

**文件:行**：`src/styles.css:958-974`、`:945-954`、`:1419-1422`、`:1-47`。
**难度**：低（token + 4 处替换）。

---

## U3 · 焦点：正文/源码框/跳转落点看不见，Tab 在正文开头回跳

**现象**（三档主题一致）

1. 源码模式的 textarea `outline:none`，只剩边框换色。实测常态边框 `#e4dfd4`、聚焦边框约 `#8aa89c`，
   两者 **1.94:1**，低于 WCAG 1.4.11 的 3:1。截图中几乎看不出聚焦。
2. 正文 `.editor` 也是 `outline:none`，没有替代。正文靠光标算有指示，但整个编辑区拿不到焦点提示。
3. `main.doc-scroll:focus { outline: none }`：点「跳到正文」后焦点落在 `main` 上，屏幕上没有任何变化。
4. Tab 顺序：光标在正文 1:1 时按 Tab，被 `onKeyDownCapture` 改写成「聚焦 skip-link」，于是
   顶栏 → 工具栏 → 侧栏 → 正文 → skip-link → 顶栏 成环；从正文开头出发，页边的
   「采纳 / 忽略 / 追问 / 联网核对」永远 Tab 不到（光标不在开头时 Tab 正常向下走）。

**证据**

- `shots/round-16/focus-source-editor.png`（聚焦态几乎没有视觉差）；
  `phaseB.json → sourceFocus`：`outline: "none 3px"`、`border: color(srgb 0.531 0.651 0.612)`、
  `shadow: "none"`、`focusVisible: true`。
- `phaseB.json → tabFromDocStart`：
  `A.skip-link[跳到正文] → 文件 ▾ → 分析本段 → 导出 ▾ → ? → 保存`（第 6 站后继续顶栏，没有侧栏/正文）。
- `shots/round-16/focus-01.png`…`focus-20.png`：顶栏与工具栏（第 21 站起是侧栏页签）的
  `:focus-visible` 都是 2px `--accent`、offset 2px，表现一致（这部分没问题，可作为基准）。
- 代码：`src/styles.css:1354-1372`、`:551`、`:158-160`；`src/App.tsx:3908-3915`。

**具体改法**

1. 源码框：去掉 `outline:none`，改 `:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }`；
   边框色变化保留作辅助。textarea 的 `outline-offset` 在圆角上会切角，可用
   `box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 45%, transparent)` 代替。
2. 正文：给 `.editor:focus-visible` 一条不打扰的环（例如
   `box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent) 35%, transparent); border-radius: 6px;`），
   或至少把 caret 之外加一条 1px 左缘标记；不要只留 `outline:none`。
3. `main.doc-scroll:focus` 改为 `:focus-visible { outline: 2px solid var(--accent); outline-offset: -2px; }`
   （只在键盘路径出现，鼠标点击不会闪）。
4. Tab 回跳：`App.tsx:3908-3915` 的劫持只该在「焦点刚从 skip-link 回到正文」时生效一次，
   或干脆删掉这段 capture 让浏览器默认顺序工作；不要每次在 1:1 按 Tab 都送回页首。
   验收：从正文开头连按 25 次 Tab，能依次走到页边批注按钮。

**难度**：中（焦点环 3 处是低；Tab 顺序要改键盘逻辑并重跑 `scripts/keyboard-acceptance.mjs`）。

---

## U4 · 字号与控件 token 散：同一屏 5 档小字、7 种圆角、3 种空态写法

**现象**

1. `--text-xs: 12px` 的注释写着「用户可见的小字统一用这一档，别再散写 10 / 11 / 11.5」，
   但文件里仍有 10、10.5、11、11.5 各若干处。实屏统计（1440×900 首屏、示例文档）可见字号：
   **12px ×19、12.5px ×8、11px ×1、11.5px ×2、13px ×2**，另有 15px（对话框标题）、16px（加载骨架、占位符）。
2. 圆角 6/7/8/9/10/12/14 共 7 档：树行 6、按钮 7、输入框 8、菜单 9、批注卡 9、页边空态框 10、
   toast 12、对话框 14。相邻两档（7/8、9/10）肉眼分不出，属于无意义分叉。
3. 阴影四套写死值：对话框 `0 24px 64px rgba(18,20,22,.22)`、菜单 `0 12px 32px rgba(20,22,24,.16)`、
   toast `0 8px 24px rgba(20,22,24,.14)`、批注卡 `var(--shadow)`；前三个不随主题变。
4. 空态三套写法（见 U5）。
5. 编辑器占位符继承 body 的 16px 无衬线，正文是 17px 衬线（`--font-read`），开始输入时字体会跳。
6. 三条横栏三种混色：顶栏 `color-mix(paper-raised 65%, paper)`、工具栏 `55% paper + raised`、
   状态栏 `50% raised + paper`（`styles.css:172`、`:1112`、`:1391`）。浅色下差 1–2 个色阶，
   深色下几乎看不出，但属于「同一种面」写了三遍。

**证据**

- `shots/round-16/empty-tree-light.png`（12/12 + 按钮 12.5）、`empty-rail-light.png`（13 衬线标题 + 11.5 副文）、
  `empty-outline-1024.png`（11.5 单行）、`empty-editor-1024.png`（16px 无衬线占位符）。
- `phaseC.json → emptyEditor/outlineEmpty/railDrawer`：16px / 11.5px / 13px+11.5px。
- `metrics.json → fontSizes` 计数。

**具体改法**

1. 在 `:root` 补 `--text-sm: 12.5px; --text-base: 13px;`，与既有 `--text-xs: 12px` 组成三档；
   把 10/10.5/11/11.5 全部收进去。优先收 `:451`（`.tree-empty-dir`）、`:1187`（`.menu kbd`）、
   `:742`（`.rail-head`）、`:807`（`.rail-empty-sub`）、`:1317`（`.outline-empty`）、
   `:1919/:1930`（`thread-*::before`）、`:2081/:2088`（`.popover-*`）。
2. 圆角收敛成 3 档：`--radius-s: 6px`（行、小按钮）、`--radius-m: 9px`（菜单、卡片、输入框）、
   `--radius-l: 14px`（对话框）。toast 与页边空态框并入 m。
3. 阴影收敛成 `--shadow-pop` 与 `--shadow-modal` 两档，深色块里各自给更重的一档（现有 `--shadow` 已按主题分）。
4. 占位符：`.editor-placeholder` 加 `font-family: var(--font-read); font-size: var(--editor-size, 17px); line-height: 1.95;`
   与正文对齐（`src/styles.css:258-267`）。

**难度**：中（纯 CSS，但改动点多，要逐屏截图比对；不影响首屏字节，CSS 体积基本持平）。

---

## U5 · 空态与加载态：三种留白语言，一秒的骨架和真面板差 633 px

**现象**

1. 空态的骨架不一致：

   | 位置 | 结构 | 字号 | 留白 | 边框 |
   | :--- | :--- | :--- | :--- | :--- |
   | 文件树 | 标题 + 副文 + 实心按钮 | 12 / 12 | `padding:14px` | 无 |
   | 大纲 | 单行 | 11.5 | `12px 10px`，`margin:11.5px 0` | 无 |
   | 页边 | 衬线标题 + 副文，居中 | 13 / 11.5 | `margin-top:18px`、`padding:14px` | 1px 虚线，圆角 10 |
   | 编辑器 | 一句灰色占位 | 16（继承） | 无 | 无 |

   页边的虚线框在浅色下边框对比 **1.44:1**、深色 **1.69:1**，等于没有框；空态因此比树/大纲「重」，却更模糊。
2. 加载骨架：设置的 `Suspense` fallback 实测 430×95 px，里面只有一行 16px 黑字
   「正在打开设置…」；真面板同宽、高 728 px，弹出时整体跳 633 px。快捷键 fallback 同结构，
   宽度随 `.shortcuts-dialog` 的 560 px。fallback 没有 `role="dialog"`、没有 `aria-label`、
   没有标题层级，读屏和视觉都当它是正文。
3. 窄窗（1024×768）结论：**没有横向溢出**。长文件名、长标题、顶栏按钮组都正常：
   `docScrollX === innerWidth === 1024`，顶栏保持 46 px 单行，`doc-name` 占 379 px 后 spacer 剩 46 px。
   长文件名按 `scrollWidth 265 / clientWidth 181` 截断，`title` 有全文；但截断点落在字符中间，
   同一列表两行的结尾表现还不一致（`outline-overlap-sidebar.png` 第 1/2 行、`dark-rail-notes-1024.png` 同一处）。
   `.tree-file` 是 `display:flex`（`src/styles.css:486-500`），`text-overflow:ellipsis` 在 flex 容器上
   对文本节点不可靠，建议给文本套一层 `<span>` 再省略，或把行改成 `display:block` + 内部 flex。
4. 页边抽屉（≤1119 px）：宽 340 px、空态框 307 px，与宽窗 260 px 栏内的空态同一套样式，正常；
   但抽屉的关闭按钮与背景遮罩都叫「关闭批注」，读屏会念两个同名控件。

**证据**：`shots/round-16/empty-tree-light.png`、`empty-rail-light.png`、`empty-outline-1024.png`、
`empty-editor-1024.png`、`loading-settings-1024.png`、`settings-loaded-1024.png`、
`narrow-rail-drawer-1024.png`、`longname-1024.png`、`outline-overlap-sidebar.png`；
`phaseC.json → settingsFallback {dialogH:95, pFont:"16px", role:null}` 与 `settingsLoaded {dialogH:728}`。

**具体改法**

1. 抽一个空态组件/类（`.empty-state` + `.empty-title` + `.empty-sub` + `.empty-action`），
   三处共用 12/12、`padding:16px`、可选 1px `--line` 圆角 9 框（页边）；把页边虚线框的对比度提到 3:1
   （`--line-strong` 加深，或改成实线 `color-mix(line-strong 70%, ink-faint 30%)`）。
2. 加载骨架换成与真面板同宽（设置 430、快捷键 560）、同内边距的 `role="dialog" aria-busy aria-label="设置"`，
   高度给 `min-height: 360px`，里面放标题占位 + 两条灰条，避免 633 px 跳动；
   或更省事：点「设置」时在按钮上显示忙碌态，面板加载完成才弹。
3. 长文件名：见上，`<span>` 包文本，或 `.tree-row .tree-file{display:block}` 让 ellipsis 生效。
4. 抽屉：遮罩 `aria-label` 改「关闭批注面板（点击遮罩）」，或给遮罩 `aria-hidden="true"` 只留 ×。

**难度**：中（空态组件化 + 骨架重做；窄窗截断是低）。

---

## 附：优化机会（最多 3 条）

1. **`src/App.tsx` 的 2 个加载 fallback 重复**（`4303-4310`、`4326-4333`）：抽一个
   `<DialogSkeleton width label>`，同轮把 aria 补齐，少 20 行重复 JSX。
2. **主题色写死点多**：`#fff` 4 处、`#000` 1 处、`rgba(18/20,20/22,22/24,…)` 5 处；除 U2 列出的 4 处，
   还有 `.note.is-active` 的 `color-mix(--ink 14%)` 阴影——浅色下是墨色投影，深色下变成浅色光晕，
   语义反了。建议一次把「文字压强调底」与「浮层阴影」两类各自收敛成 2 个 token。
3. **`main.doc-scroll:focus` 与 `.editor` 的两条 `outline:none`** 可删；顺带把 `.editor` 的
   `:focus-visible` 与源码框共用一条规则，减少两处特例。

## 未验证

- 「最近打开」空态文案（`还没有最近打开的文件。`）只在宿主 `/__recent` 下渲染，浏览器里整段不出现，未截图。
- 真实批注的「采纳」按钮：浏览器模拟分析只回了一条评价批注，没有修订卡；U2 里采纳按钮的对比度按 CSS 计算，
  截图只覆盖了同页边栏的评价卡与悬浮按钮。
- Safari/WebKit、真实 WebView2 渲染未测；本轮只用 Edge headless。
- `prefers-reduced-motion`：全仓 0 处媒体查询，`phaseB` 实测 reduce 下按钮 `transition` 仍为
  `background .12s, color .12s`；pop 动画（`styles.css:976`）仍会播。是否本轮修由 planner 定。
