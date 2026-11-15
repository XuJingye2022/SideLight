# 第 16 轮 · 计划（rev2）

基线 v0.29.0（HEAD `4d53ea1`）。4 个任务：A 组（builder，前端）T1 P0 → T2 焦点/深色/表单/reduced-motion → T3 aria（含 P2 可选）；B 组（builder2，发布）T4 版本/文档/预算。**构建**：A 只跑 `npx tsc --noEmit`、`npm test`、`npx vite build --outDir .tmp/build-a` + `node scripts/measure-first-screen.mjs --dir .tmp/build-a --max 285000`；B 最后跑一次 `npm run build` 与 `measure --max 285000`（唯一构建者）。
**预算**：首屏 283,826 / 285,000（余 **1,174 B**）；估算 +250–400 B。每步 measure；超线砍序 **P2 → 多余硬编码色 → 8 条死 CSS（−186 B）**，仍超写「未发布」，**不抬 285,000**。
**版本门（写死）**：`theme-acceptance` **16/16** 且 **48 组深色矩阵全过**（含 hover/错误/禁用）才 **0.30.0**；否则 **0.29.1**。与 diff 观感无关。

## T1 P0：大纲页签下文件树没有真隐藏，且切回保持滚动（U1/H1）｜A 组（builder，先做）

- **目标**：切到「大纲」页签时 `.file-tree` 真正 `display:none`（1024 下不再与大纲各占一半），切回「文件」时**行数与 `scrollTop` 都与切走前相同**；树折叠竖条与窄窗抽屉不回归。
- **为什么现在**：U1 实测 `treeHiddenAttr: true` 但 `treeDisplay: "flex"`、`treeRect {y:120,h:310}`、`paneRect {y:430,h:310}`；根因是 `hidden` 只靠 UA `[hidden]{display:none}`，被 `.file-tree{display:flex}`（`styles.css:271-279`）压过；`inert` 只挡键盘。而 `display:none` 会丢 `scrollTop`（Chromium 重新显示时归零），所以必须显式保存/恢复。
- **文件**：`src/styles.css`、`src/components/FileTree.tsx`、`scripts/tree-acceptance.mjs`（扩断言）
- **步骤**
  1. 基础段加 `[hidden] { display: none !important; }`（`*{box-sizing}` 之后），不写 `.file-tree[hidden]` 特例；保留 `inert`。
  2. **全仓核对 `hidden` 用法**：`grep -n 'hidden' src/` 只允许两类——`FileTree` 面板（`App.tsx:3869-3870`、`FileTree.tsx:356`）与图片 `<input type="file" hidden>`（`App.tsx:4254`）；若还有其它自定义 display 的面板，在 `impl-a.md` 列出并逐项说明为何不受影响。
  3. `FileTree` 内保存/恢复滚动：`listRef` 指向 `.file-tree-list`；`hidden` 由 false→true 时 `scrollTopRef.current = listRef.current.scrollTop`；true→false 时 `requestAnimationFrame(() => { listRef.current.scrollTop = scrollTopRef.current })`（`useLayoutEffect` 监听 `hidden` 变化，卸载前也存一次）。
  4. `tree-acceptance` 加断言：切到大纲后 `.file-tree` computed `display === 'none'`、rect 高度 0、`scrollHeight > 0`（内容仍在但不可见）、`.outline` 顶部 y 与侧栏顶差 <8px；切回后 `display !== 'none'`、行数不变、**`scrollTop` 与切走前相等**（用例先滚到 148）。
- **验收**
  1. 1440/1024 × 浅/深四态：大纲页签下树高度 0、大纲占满；切回树行数与 `scrollTop`（148）一致。
  2. `tree-acceptance` **45/45**（新断言计入）；`npm test` 绿；`grep` 结果与第 2 条一致并写进 `impl-a.md`。
  3. 截图 `shots/round-16/t1-outline-1024.png`、`t1-outline-dark.png`、`t1-scroll-back.png`。
- **门禁**：`npx tsc --noEmit; npm test; node scripts/tree-acceptance.mjs`
- **风险与回退**：`!important` 只作用于 display；`scrollTop` 恢复用 rAF 避免布局未就绪；若其它面板也被 `hidden` 隐藏，需逐项确认。回退：`git checkout -- src/styles.css src/components/FileTree.tsx scripts/tree-acceptance.mjs`。
- **难度** S ｜ **量级** 30–60 行

## T2 焦点环、深色 token、表单边界、reduced-motion（U2/U3/B1/B2/B5/H2）｜A 组（builder，T1 后）

- **目标**：正文/源码框/`main:focus`/输入类控件都有可见 2px 焦点环；深色「采纳」「分析」与 `--danger` ≥4.5:1；`.field input`/`.dialog-input` 边框 ≥3:1；`prefers-reduced-motion: reduce` 生效。
- **为什么现在**：B2 实测 `.editor`/`main.doc-scroll:focus`/`.source-editor` 均 `outline:none`，输入类环 1.54:1（深 1.79）；B1 实测深色采纳 2.23、分析 2.38、错误徽标 3.29/2.44，`--danger` 三处主题都未定义；B5 实测全仓 `prefers-reduced-motion` 0 命中；A1 实测输入框边框 1.44:1。
- **文件**：`src/styles.css`、`scripts/theme-acceptance.mjs`（扩断言）
- **步骤**
  1. **六个 token，三处逐项列值**（`:root` / `html[data-theme='dark']` / `@media (prefers-color-scheme: dark)`，后两处各写一遍同样的值）：
     | token | 浅色 | 深色 |
     | :--- | :--- | :--- |
     | `--focus-color` | `#2b6d64` | `#9ccbc2` |
     | `--focus-ring` | `2px solid #2b6d64` | `2px solid #9ccbc2` |
     | `--danger` | `#b4453a` | `#e8917f` |
     | `--on-accent` | `#ffffff` | `#15171a` |
     | `--on-mark` | `#fffdf8` | `#15171a` |
     | `--line-input` | `#85898c` | `#6b7178` |
     | `--mark-strong`（hover 底） | `#9c6f38` | `#e6b979` |
     `--focus-offset: 2px` 只定义一次。深色 `--focus-ring` 与 `--panel` 的对比在 `theme-acceptance` 里单独断言 ≥3:1。
  2. **5 处硬编码色**：`.note-actions button.accept`（`#fff`→`var(--on-mark)`）、`.accept:hover`（`#fff`→`var(--on-mark)`，`#000` mix→`var(--mark-strong)`）、`.analyze-bubble` 与 `:hover`（`#fff`→`var(--on-accent)`）；`.auto-save-error` 用 `var(--danger)`，底改 `color-mix(in srgb, var(--danger) 18%, var(--paper))`。
  3. **焦点环（单一来源）**：删 `.editor`、`main.doc-scroll:focus`、`.source-editor` 的 `outline:none`；统一 `:focus-visible { outline: var(--focus-ring); outline-offset: var(--focus-offset) }`；`.source-editor` **只用 inset 内阴影一种环**：`outline: none; box-shadow: inset 0 0 0 2px var(--focus-color)`（父级 `overflow:auto` 不裁内阴影，**不再叠 outline**）；边框同时换 `var(--line-input)`；`.find-input`/`.field input`/`.dialog-input`/`.dialog-textarea`/`.thread-input input` 的 30% 混色环全部换 `var(--focus-ring)`。
  4. **表单边界**：`.field input`、`.dialog-input`、`.dialog-textarea` 的 `border-color` 改 `var(--line-input)`。
  5. **reduced-motion**：`@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: .01ms !important; animation-iteration-count: 1 !important; transition-duration: .01ms !important; } }`；只覆盖动画/过渡时长，`outline`、`opacity`、颜色静态值不动；在验收里注明现有代码不依赖 `transitionend`。
  6. `theme-acceptance.mjs` 扩：48 组矩阵（浅/深 × 默认/hover/错误/禁用）；**深色 accent/focus-ring vs 背景 ≥3:1**；源码框 `outline-style === 'none'` 且 `box-shadow` 含 inset（无双环）；`emulateMedia({reducedMotion:'reduce'})` 下 `.toast`/`.note`/`button` 的 `transition-duration`/`animation-duration` ≤0.01s。
- **验收**
  1. `theme-acceptance` **16/16**；48 组矩阵全过（深色采纳/分析/`--danger` ≥4.5，浅色错误态 ≥4.5）。
  2. 键盘：正文、源码框、查找框、设置字段各有可见环（截图 `t2-focus-*.png` 浅/深各一）；源码框只有一种环。
  3. reduced-motion 模拟下时长 ≤0.01s，焦点环与选中态不变。
  4. `measure --dir .tmp/build-a` 记录增量（预期 +250–400 B），≤285,000。
- **门禁**：`npx tsc --noEmit; npm test; node scripts/theme-acceptance.mjs; node scripts/keyboard-acceptance.mjs`
- **风险与回退**：深色两处主题块必须逐项同步，漏一处仍是 2.2:1；`--mark-strong` 的具体值需矩阵验证（不达标就调暗/调亮一次）；`!important` 只压时长。回退：`git checkout -- src/styles.css scripts/theme-acceptance.mjs`。
- **难度** M ｜ **量级** 130–190 行

## T3 aria：正文名称、错误 toast、单一 live region（B3/B4/H3/H5）｜A 组（builder，T2 后）

- **目标**：`.tiptap` 有可读名称；错误提示被读屏播报且**一次 notice 只更新一个 live region**；toast 内按钮不被 `aria-hidden` 包住；P2 项先记录、预算允许再做。
- **为什么现在**：B3 实测 live region 明确排除 `kind==='error'`，错误 toast 本体 `aria-hidden="true"`，20 余处错误读屏全静默；toast 按钮在该子树内（`aria-hidden-focus`）；axe 报 `.tiptap` 缺名称（4.1.2）。
- **文件**：`src/App.tsx`、`scripts/keyboard-acceptance.mjs`（扩断言）
- **步骤**
  1. 正文名称：编辑器 `editorProps.attributes` 或 `<EditorContent aria-label="正文编辑器">`（与既有属性合并），axe `aria-input-field-name` 消失。
  2. **toast 是唯一 live region**：容器去 `aria-hidden`；结构改为 `.toast` 外壳 → `<div role="status">`（普通）或 `<div role="alert">`（错误）只放文本 → 兄弟 `<div role="group" aria-label="提示操作">` 放 `.toast-action`/`.toast-close`；按钮不被 `aria-hidden` 包住，也不在 live region 子树内。
  3. **常驻 sr-only 区不再放 `notice.text`**（避免与 toast 双播）：只留其它一次性播报（当前无调用）或直接删除该文本绑定；错误只走 `role="alert"`，普通只走 toast 的 `role="status"`。
  4. 三个常驻横幅（只读/风险/源码说明）改 `role="region"` + `aria-label`，不再随加载连播。
  5. **P2（记录项）**：`DialogSkeleton` 的 `role="dialog"`/`aria-busy`/`aria-label`；正文开头 Tab 劫持（`App.tsx:3908-3915`）删除；批注卡 `tabIndex=0`/Enter 跳句。写进 `impl-a.md` 的「P2 记录」；**仅当 measure ≤284,600** 才删 Tab 劫持（5 行），其余延后。
  6. `keyboard-acceptance` 扩：触发保存失败 → `[role="alert"]` 文本含原因；全文 live region 中**只有一个**文本发生变化；`[aria-hidden="true"]` 内可聚焦元素 = 0；正文 `aria-label` 非空。
- **验收（必过 / P2 可选）**
  - **必过**：① `.tiptap` 有 `aria-label`，axe 该项 0 违规；② 错误 toast 出现时 `role="alert"` 文本非空且含原因，普通 notice 只进 `role="status"`；③ 一次 notice 只更新一个 live region（脚本断言计数 = 1）；④ `[aria-hidden="true"]` 内可聚焦元素 = 0；⑤ 树仍隐藏、`scrollTop` 恢复（T1 不回归）。
  - **P2 可选（砍了不判失败，写「P2 延后」）**：⑥ 骨架 `role="dialog"`/`aria-busy`；⑦ 删 Tab 劫持后从正文开头的正向 Tab 能到页边批注按钮；⑧ 批注卡可聚焦并 Enter 跳句。P2 被砍时 `keyboard-acceptance` 仍以 31/31 通过（必过项不含 P2）。
- **门禁**：`npx tsc --noEmit; npm test; node scripts/keyboard-acceptance.mjs`
- **风险与回退**：`role=alert` 会打断朗读，仅错误使用；toast 结构改动要保住视觉（外壳 + 内部两段）；P2 是否做取决于 measure。回退：`git checkout -- src/App.tsx scripts/keyboard-acceptance.mjs`。
- **难度** S–M ｜ **量级** 70–120 行

## T4 版本门、文档与首屏预算（S2/S3/S4/H4/H5）｜B 组（builder2，A 完成后）

- **目标**：按**写死的门**定版本（`theme-acceptance` 16/16 且 48 组深色全过 → 0.30.0，否则 0.29.1）；`npm run build` + `measure` 过线；README/AGENTS/CHANGELOG 与 `package.json`/`package-lock` 同步；P2 延后项写进文档。
- **为什么现在**：S2 实测首屏 283,826、增量 250–400 B；S3 列出 0.30.0 文档 14 处（含 `README.md:91/93/102/63` 旧数字与 `SHA256SUMS-0.29.0`）；S4 要求发布前三件称重；H4 要求版本前置可执行、H5 要求 P2 砍项传到文档。
- **文件**：`package.json`、`package-lock.json`、`README.md`、`AGENTS.md`、`docs/CHANGELOG.md`
- **步骤**
  1. **版本门**：读 A 的 `impl-a.md` 与 `theme-acceptance` 输出；`16/16` 且 48 组全过 → `0.30.0`；任一不过 → `0.29.1`。在 `impl-b.md` 写判定依据（含 48 组结果与截取）。
  2. `npm run build`（唯一构建者）；`node scripts/measure-first-screen.mjs --max 285000`。超线按 **P2 → 多余硬编码色 → 8 条死 CSS（−186 B）** 砍，仍超则写「未发布」并停发。
  3. `package.json` 版本；`package-lock.json` 两处同步（根代理 `npm install --package-lock-only`）。
  4. CHANGELOG 顶部 `## <版本> — 2026-11-16`（破折号 `—` 加空格，preflight 按此匹配）：reduced-motion、焦点环、深色对比度、输入边界 3:1、正文名称、错误提示进 `role=alert`、树隐藏与滚动恢复；P2 按 `impl-a.md` 写「已做 / 延后」；未验：读屏实录、高对比度模式、macOS 真机；体积 `[TBD]`。
  5. README：首屏数字与百分比、`SHA256SUMS-<版本>.txt`、安装包名、测试数；AGENTS §6 状态与「WCAG 3 修 2 弱」（不写「达标」）；若 P2 延后，README「现在不能做什么」加一句。
  6. 出包后回填安装包/zip 字节与 SHA 到 CHANGELOG。
- **验收**
  1. `measure --max 285000` exit 0，合计 ≤285,000（预期 284,1xx），余量写 `impl-b.md`；未过时写「未发布」且 `package.json` 不升。
  2. `package.json`、CHANGELOG 标题、`package-lock` 两处版本一致；CHANGELOG 含 `— 2026-11-16`、`reduced-motion`、`WCAG`；README 无 `283,826`、`SHA256SUMS-0.29.0`、`Sidelight-0.29.0-win`。
  3. **T4 验收含「T2 验收输出存在」**：`impl-a.md` 有 `theme-acceptance` 16/16 与 48 组矩阵结果；砍项（P2 或死 CSS）逐条列出。
  4. `npm test` 16 文件全绿；tree 45/45、keyboard 31/31、theme 16/16 记录在 `impl.md`。
- **门禁**：`npm run build; node scripts/measure-first-screen.mjs --max 285000; npm test`
- **风险与回退**：版本门写死避免「改一半仍发 0.30.0」；CSS 增量可能超估算，砍序固定；CHANGELOG 破折号写错会被 preflight 拦。回退：`git checkout -- package.json package-lock.json README.md AGENTS.md docs/CHANGELOG.md`。
- **难度** M ｜ **量级** 110–170 行

## 文件归属与执行顺序（零重叠）

| 任务 | 组与执行点 | 独占文件 |
| :--- | :--- | :--- |
| T1 | A（builder，先做） | `src/styles.css`、`src/components/FileTree.tsx`、`scripts/tree-acceptance.mjs` |
| T2 | A（builder，T1 后） | `src/styles.css`、`scripts/theme-acceptance.mjs` |
| T3 | A（builder，T2 后） | `src/App.tsx`、`scripts/keyboard-acceptance.mjs` |
| T4 | B（builder2，A 完成后） | `package.json`、`package-lock.json`（根代理同步）、`README.md`、`AGENTS.md`、`docs/CHANGELOG.md` |

- 零重叠：A 只碰 `src/styles.css`、`src/components/FileTree.tsx`、`src/App.tsx` 与三个验收脚本；B 只碰文档与 `package.json`。`package.json`/`package-lock` 只归 T4；`npm test` 文件数不变。
- 顺序：T1 → T2 → T3（A 串行，每步 `.tmp/build-a` + measure）→ T4（唯一 `npm run build` + measure + 文档）→ 根代理出包回填。
- 报告：A 组 `docs/iteration/round-16/impl-a.md`（含 P2 记录与砍项），B 组 `impl-b.md`；截图 `shots/round-16/t1-*.png`、`t2-*.png`、`t3-*.png`。

## 本轮不做（写进下轮建议）

**P2 全量**：骨架 `role=dialog`/`aria-busy`、正文开头 Tab 回环、批注卡键盘化——只记录，预算允许才做；字号/圆角/空态三套语言的完全收敛、深色 token 双份合并（`light-dark()` 需真机验）、`@media print` 与 1119px 断点不动。真实读屏（NVDA/讲述人）、Windows 高对比度模式、macOS 真机验证仍 UNVERIFIED。

## 本轮 Demo（≤3 条用户可见变化）

1. 切到「大纲」页签时文件树真正消失，切回后展开态与滚动位置都还在；1024 窄窗正常。
2. 深色下「采纳」「分析」与错误状态看得清（≥4.5:1）；输入框边界与焦点环处处一致，正文与源码框有明确焦点提示。
3. 系统开启「减少动态」时动画几乎立即结束；读屏能听到「正文编辑器」和保存失败等错误提示，且同一条提示只播一次。

## 风险最高的任务

**T2**。它同时改六个 token（三处主题逐项同步）、5 处写死色、6 类焦点环、3 处表单边界与全局 reduced-motion：深色两处块漏一处就仍是 2.2:1；`--mark-strong` 的具体值要靠 48 组矩阵验证；源码框若叠 outline+shadow 会出现双环、外阴影还会被 `overflow:auto` 裁掉。缓解是矩阵全过 + 逐控件环断言 + 「源码框只有 inset 环」断言。次高是 T1：`display:none` 会丢 `scrollTop`，必须显式保存/恢复，只查 display 的断言抓不到。

## 下一轮建议主题

**可访问性收尾与视觉收敛**：做 P2 全量（骨架 dialog 语义、批注卡键盘化、Tab 顺序）、字号/圆角/空态统一、深色 token 双份合并；补真实读屏与 Windows 高对比度实测；评估把 axe 关键项与 `theme-acceptance` 接进 CI 门禁。
