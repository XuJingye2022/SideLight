# 第 61 轮 B 轮实现（executor）

HEAD `db25ce7`；dev 5175；CDP 9222。未 commit/push、未改版本、未动 release/。3 任务全完成，门禁全绿。

## B1 TOC 逐键按事务判定重建 ✅

`src/lib/tocRender.ts`：state 缓存 entries/标题区间/`[TOC]` 段区间/widgetSet/revealed/stale/builds。apply：resync meta 先于 docChanged 全量重建；无 docChanged 只重算标记段显隐；active 时 `maybeTocTouched` 或 StepMap 命中缓存区间才重建，否则 `set.map`+映射；inactive 保留原快路径。停笔 300 ms 由插件顶层 `view().update` 派 resync（只在 stale 时，`addToHistory:false`）。导出 `createTocPlugin`。单测 8 条全过（新增：resync 无 docChanged 也重建；正文只映射、标题才重建，用 builds 计数断言）。

`.tmp/e2e-r61-b1-toc-perf.mjs`（预热 2 轮 + 测 3 轮 ×20 键，关自动保存）：

| 档 | 改前 p50 差 | 改后 p50 差 | 判据 |
| :-- | :-- | :-- | :-- |
| 100 KB | 16→22（+6） | 26→25（−1） | ≤3.6 过 |
| 1 MB | 61→61（0） | 56→41（−15） | ≤0 过 |

读数 `r61-b1-before/-after/-compare.json`；Node 侧 `r61-b1-cost.mjs`：40 次击键 builds 恒 1、apply p50 0.01/0.061 ms。功能：改标题立即更新；`[TOC]` 前插 3 行停 400 ms 点第 2 条光标差 1 px；`e2e-r58-a2-toc.mjs` 9/9 真。

## B2 TOC 进预览 + 编辑视图隐藏标记 ✅

`tocRender.ts` 对每个 `[TOC]` 段挂 `toc-source` 节点装饰，选区变化只换 `is-revealed` 类；`styles.css` 只隐 `.toc-source:not(.is-revealed)`，光标进入露出。`PreviewPane.tsx` 收 `tocActive`，`renderMath` 同遍 DOM 按顶层标题建 `nav.sl-toc.preview-toc` 替换标记段，点击滚到标题；`App.tsx` 一处传 `hasTocMarker(rawTextRef.current ?? bodyHtml)`；`docs/typora-gap.md:49` 改「编辑视图与只读预览」。

`.tmp/e2e-r61-b2-toc-preview.mjs` 14/14 真（nav 数=顶层标题数、无字面 `[TOC]`、点丁节进视口、引用内标题不在 nav、标记段 display:none、新敲 `[TOC]` 露出且退格可删、Ctrl+S 后磁盘 `^[TOC]$`、转义原文 0 nav 留字面）。截图 `shots/round-61/b2-toc-{editor,preview}.png`。

## B3 文件列表态可访问性 ✅

`FileTree.tsx`：列表态单算 `listTabbable`（不复用树 rows 的 tabbablePath），行 roving tabIndex + onFocus，`ul` 加 `role=list`+aria-label，外层补 `ref`+onKeyDown（方向键只移焦点，Enter/Space 走原生 button）。暖纸 `--ink-faint` `#736349`→`#6f6047`（styles/themes 同步），`themes.test.ts` 加 1 条悬停合成底 + 实色底 ≥4.5。

`.tmp/e2e-r61-b3-a11y.mjs` 13/13 真：hover 首行路径 4.673:1（实色底同值）、5 行仅 1 个 tabindex=0、ArrowDown×2 第 3 行且正文未切、Enter 打开、树态 1 站回归、折叠目录当前文件 1 站、根首行是目录 1 站。

## 门禁

tsc 0；npm test exit 0；verify PASS，首屏 gzip 300,727 B（310,000/320,000）；roundtrip exit 0（8/8 等值）。改动：tocRender.ts、tocRender.test.ts、PreviewPane.tsx、App.tsx、styles.css、FileTree.tsx、themes.ts、themes.test.ts、typora-gap.md。

## CHANGELOG 一行建议

修复：有 `[TOC]` 时逐键不再全篇重建目录（正文只映射、标题才重建，停笔 300 ms 兜底）；目录进只读预览、编辑视图收起标记行；文件列表恢复单 Tab 站 + 方向键，暖纸路径对比度 4.67:1。

## 新踩坑

1. `display:none` 的标记段点不到、`innerText` 读不到：E2E 用键盘在段内敲、隐藏文本用 textContent 断言。
2. active 分支只判缓存 `[TOC]` 区间会漏「新敲一个 `[TOC]`」，要同时用 maybeTocTouched。
3. 逐键 p50 头 2–3 轮有 15–20 ms 一次性开销：性能 A/B 先预热、取各轮 p50 最小值。
