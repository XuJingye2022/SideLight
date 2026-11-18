# 第 64 轮 finder-ui 发现（界面与可访问性）

结论：**2 条 P1（都在侧栏大纲面板）、1 条 P2**，无 P0。
原始数据：`.tmp/r64-ui-a.json`、`.tmp/r64-ui-b.json`、`.tmp/r64-ui-c.json`；脚本 `.tmp/e2e-r64-ui-a.mjs`、`-b.mjs`、`-c.mjs`；截图 `shots/round-64/ui-light-outline.png`（浅色，大纲顶部、光标第 40 节）、`shots/round-64/ui-dark-outline.png`（深色同构图）。全程 `pageerror`/console error 为空。

## P1-1（新）大纲面板不跟随当前章节：长文里当前条落在滚动区外，`scrollTop` 恒 0

- 夹具：`long.md` = h1 + 40×h2 + 11×h3（41 条目、51 行）；1440×900；大纲页签；光标点进「第40节」。
- 读数（真点）：容器 `.outline-pane .file-tree-list` `overflow-y:auto`、`scrollHeight 1242 / clientHeight 752`、`scrollTop 0`；当前条 `.outline-item.is-active` 文本「第40节」`top=1298`、`bottom=1322`，容器可见区 `120–872` → `visible:false`。手动置 `scrollTop=100000` → 490，同条目 `top=808` → `visible:true`：**容器能滚，代码不跟随**。
- 根因：`src/components/Outline.tsx:20-22` 只在 `activeId` 变化时 `expandAncestors`（折叠祖先展开），没有把当前条滚进视野。
- 后果：文章超过一屏标题后，侧栏大纲停在文首（截图里始终显示 甲章/第1–24节），看不到当前节；点条目跳转仍正常。
- 建议：`activeId` 变化后对当前条 `scrollIntoView({ block: 'nearest' })`，不可见才滚。
- typora 对照：`shots/typora/` 的 3 张 outline 截图只有静态列表，无「长文 + 当前节」同构图，无法据此判不一致。

## P1-2（新）大纲面板键盘：51 条目 = 62 个 Tab 站，方向键无效，无列表语义

- 读数：`.outline` 内可聚焦 `button` **62** 个（51 条目 + 11 折叠钮），全部 `tabIndex=0`（`itemTabIndexes:[0]`）；从 `#sidebar-tab-outline` 连按 Tab **60 次仍在大纲内**（末条仍是 `.outline-toggle`）→ 要走到正文需 62 次。条目上按 `ArrowDown` 焦点不动（before/after 都是「甲章」，`stillOnItem:true`）。`.outline-list` 是 `<nav>`，`role=null`；条目只有 `aria-current="location"`，折叠钮有 `aria-expanded`（这两处正确）。
- 同类先例：**B-131**（文件列表态 30 Tab 站 → 第 61 轮改 roving tabindex + `role=list`，判 P1）。
- 建议：沿 B-131 的做法给大纲加 roving tabindex（当前/首条 `tabIndex=0`，其余 `-1`）+ Arrow/Home/End，折叠钮随条目走一套焦点；语义用 `role="tree"`+`treeitem`（`aria-level`/`aria-expanded`）或 `role="list"`。

## P2-1（新）大纲折叠钮 14×24、hover 零反馈

- `src/components/Outline.tsx:53-69` 内联样式 `background: none; color: inherit` 压掉全局 `button:hover`（`src/styles.css:182-185`）：实测 hover 命中（`isHover:true`）前后 `background` 都是 `rgba(0,0,0,0)`、`color` 都是 `rgb(29,32,35)`。命中区 14×24（同类 24×24 门槛见 B-110）。
- 建议：去掉内联 `background`/`color`，改类名；宽高至少 24×24。

## 已量（无问题，不计数）

- 焦点环审计：主界面连按 Tab 70 步，`outline-style:none` 且无 `box-shadow` 的可聚焦元素 **0** 个；正文 `outline:none` 由 `.doc-scroll` 的 inset 2 px 顶线替代（`docScrollShadow:true`）。
- 中文排版：正文 17 px / 行高 33.15 px（1.95）/ 栏宽 576 px / `Source Han Serif SC` 优先，无溢出。
- 两档视口：1440×900、1024×700（`scrollWidth=clientWidth=1024`，侧栏 218，正文列 x=238 w=756）无横向溢出。
- 真点设置切深色：`data-theme=dark`、radio `aria-checked` 正确、保存后 dialog 关闭。浅色对比度（实算）：大纲条目 6.16、当前条 7.40、文档名/状态栏 4.83、正文/h2 14.88，全过 AA。
- 大纲条目可点跳转、`aria-current` 正确；条目 hover 有底色（`rgb(232,240,237)`）。

## 未覆盖

深色仅截图目视（未逐 token 复算）；暖纸（B-122 仍 open）、Mermaid、批注卡、真实中文 IME 本轮未重测。
