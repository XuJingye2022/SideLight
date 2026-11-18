# 第 61 轮验收（tester）

轮前 `db25ce7`；B1/B2/B3 全做。判定 **PASS-WITH-UNVERIFIED**（未坐实：B1 的相对 p50 门槛，见下）。功能全绿、门禁一次过、无回归。

## 门禁
- `npm run verify` PASS：首屏 gzip **300,727 B**（内部 310,000 / 硬线 320,000，余 9,273）。`.tmp/r61-tester-verify.log`
- `npm test` PASS：**40 文件 508 条**，0 fail（轮前 504；新增 tocRender +3、themes +1）。`.tmp/r61-tester-test.log`
- `npm run roundtrip`：富文本 6/8、源码 8/8、firstSaveBlocked 1/8，与第 58 轮基线逐项同，报告未变。`.tmp/r61-tester-roundtrip.log`

## B1 TOC 逐键按事务判定重建（F1；R1/R2）
代码 `src/lib/tocRender.ts:218-320`：state 存条目/标题区间/`[TOC]` 区间与 `builds`；正文事务只 `mapState`（映射位置），命中标题或 `[TOC]` 区间才 `rebuild`；插件顶层 `view` 停笔 300 ms 派 resync meta。单测 2 条 = 验收两条（resync 无 docChanged 也重建；正文只映射、标题才重建：`builds` 不变、位置随映射、改标题 `builds+1`、条目文字更新）。
- 我独立跑 `.tmp/e2e-r61-b1-toc-perf.mjs`（100 KB/1 MB × 有/无 TOC，20 键×3 轮，预热 2 轮）→ exit 0、0 pageerror、功能 7/7 真：3 条目录、改标题不等停笔即更新、`[TOC]` 前插 3 行停 400 ms 点第 2 条仍落 H2（headingIndex=1，光标与标题顶差 **1 px**）。`.tmp/r61-b1-tester-after.json`
- 读数（median-of-3 p50 / 60 键合计 p50，ms）：100 KB 改前 23→27（+4/+5），本轮 25→32（+7/+3）；1 MB 改前 61→61（0/0），本轮 60→63（+3/+4）。基线 `.tmp/r61-b1-before.json`。
- 判定：100 KB 按合计 p50 差 +3 ≤ 改前 +5 的 60%（3.0）刚好达标；按脚本自带 median-of-3 差 +7 未达（逐轮 p50 抖 21–40 ms）。1 MB 改前差 0，「≤ 0 的 60%」字面不可达，属门槛退化；残值 +3/+4 ms 只记。机制由单测坐实（正文逐键不再重建），故不按 FAIL（角色规则：FAIL 只给门禁破/造假/回归），数值门槛记 UNVERIFIED。
- `.tmp/e2e-r58-a2-toc.mjs` 复跑 **9/9 真**（3 条目、点第 2 条落 H2、草稿 `^[TOC]$`、转义字节不变）。`.tmp/r61-tester-a2.log`

## B2 TOC 进预览 + 编辑视图隐藏标记（F2；R3/R6-1）
代码：`tocRender.ts` 加 `Decoration.node`+`is-revealed`（选区变只重组类）；`styles.css:941-950` 只隐 `.toc-source:not(.is-revealed)`；`PreviewPane.tsx:25-56,99-127` 按顶层标题建 nav、点条目 `scrollIntoView`；`App.tsx:5575-5592` 传 `tocActive=hasTocMarker(rawTextRef.current ?? bodyHtml)`。
- 我独立跑 `.tmp/e2e-r61-b2-toc-preview.mjs` → **14/14 真**、0 pageerror。`.tmp/r61-tester-b2.log`
- 编辑视图 1 个 `.sl-toc` 4 条；`.toc-source` computed `display:none`、height 0（字面 `[TOC]` 不可见）。
- 预览：1 个 nav、按钮 4 = 顶层标题 4（h1+h2+h3+h2）、无字面 `[TOC]`；点第 2 个顶层 h2「丁节」→ rect 84–115 在滚动盒 84–460 内。含 `> # 引用内标题` 的文档 nav 不含它。
- 敲新标记：标题后回车敲 `[TOC]` → 该段 `is-revealed`、`display:block`、光标在内；5 次 Backspace 删掉新段，只余原隐藏标记（1 个 `[TOC]`）。改正文后 `Ctrl+S`：toast「已保存」，磁盘 `^\[TOC\]$` 行在、无 `\[TOC\]` 双转义。
- 原文 `\[TOC\]`：预览 nav 0、保留字面。

## B3 文件列表态可访问性（F1/F2；R4）
代码：`FileTree.tsx:146-205,510-525`（列表态单独 `listTabbable`、roving tabIndex、Arrow/Home/End、`role=list`+`aria-label`）；`themes.ts:24` 暖纸 `--ink-faint` `#6b5d48`→`#6f6047`；`themes.test.ts:90-112` 合成底单测。
- 我独立跑 `.tmp/e2e-r61-b3-a11y.mjs` → **13/13 真**、0 pageerror。`.tmp/r61-tester-b3.log`
- 暖纸+列表 hover 首行：路径 `rgb(111,96,71)`、底 `rgb(238,224,194)` → **4.673:1** ≥4.5（当前行实色底同值）。
- 5 行只有 1 个 `[tabindex="0"]`（余 -1）、`ul role=list aria-label=文件列表`；真实 ArrowDown×2 焦点第 3 行（index 2）、正文仍 `未命名.md` 未切；Enter 开 `a.md`。
- 树态 5 项仅 1 个 tabindex=0，ArrowDown 焦点 assets→sub。当前文件在折叠目录（`sub/d.md` 折叠 `sub` 后切列表）仍 1 站；根只有目录时列表 2 行也 1 站。

## 回归
- `theme-acceptance` **27/27 PASS**（暖纸 token + 对比度矩阵 43/48 适用项全过；已还原 `shots/round-05` 4 张）。`.tmp/r61-tester-theme.log`
- `tree-acceptance` **54/56**，2 FAIL 与第 58/59 轮逐字相同（`外部删除后 Ctrl+S 不写原路径`、`大纲顶与页签底对齐`，既有过期断言），非本轮；已还原 `shots/round-16` 8 张。`.tmp/r61-tester-tree.log`

## UNVERIFIED
- B1 的 1 MB 相对门槛（改前差 0）与 100 KB median-of-3 差未达；残值 +3/+4 ms 只记，机制靠单测。
- 导出/打印是否带目录（差距表记「未验证」）。
- 真宿主 WebView2、真实 FSA 句柄/磁盘写回、中文 IME。
