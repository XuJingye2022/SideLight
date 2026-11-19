# 第 103 轮计划（单轮 A，P2）

- 轮前 `startSha`：`08f6581`。范围只有这条 P2。不发版、不 push、不改 `release/`、不加依赖。
- 改动只落 `reviewFiles.ts`、`MarginRail.tsx`、`reviewFiles.test.ts` 约 30 行；**`App.tsx` 0 行**，首屏门净增 **0 B**。
- 提示里的 312,423 B / 余 7,577 B 是第 93 轮旧数；本轮按第 2 节实测记账。

## 1. 成因（已核到行）

- `MarginRail.tsx:311-329` 的 `openReview()` 点入口才 `collectReviewFiles(...)` 读**磁盘**，拿到的是快照、不重扫。
- `App.tsx:2120-2147` 批注写盘走 **600 ms 防抖**（`:2145`；finding 记的「约 1.2 s」含写盘）。改档后 150 ms 开面板必读旧档，停 1.8 s 不重扫所以仍旧，关掉重开才新。
- **内存与磁盘是同一份数据**：`App.tsx:2129`/`:2141` 写盘用的就是 `{annotations, docNotes}` 状态本身，`MarginRail` 的 `annotations` prop 就是该数组 → 当前篇计数可从内存算，不必等写盘。
- 对照：`.tmp/r102-finder-b.log:2-4`（`open 1 · 共 2 条`→冲刷后 `open 0`）、`.tmp/r102-finder-a.log:5-6`（`open 2`→`open 1`）。

## 2. 体积（先算，按 HEAD 实测）

| 口径 | HEAD 实测 | 本批预算 | 结论 |
| :--- | ---: | ---: | :--- |
| gate（`measure-first-screen.mjs`） | 315,155（余硬线 4,845） | **0**（不动 `App.tsx`） | 期望仍 315,155，容差 ≤ +100 |
| 常驻 chunk `MarginRail-*.js` gzip | 6,573 | +250～400（≤ 6,980） | 只涨 chunk |
| 真实首载 = gate + chunk | 321,728（B-229 超线 1,728，open） | +≤ 400 | 仍超，本批不改该事实，只记账 |

净增依据：`reviewFiles.ts` +≈20 行（2 个纯函数），`MarginRail.tsx` +≈8 行（1 import、1 live 行、1 合并）；测试不进包。硬线 320,000 由 gate 口径守；若实测破预算，不砍功能，回报 lead 定。

## 3. 任务 A1（修）：当前篇那行 open/total 以内存为准

文件：`src/lib/reviewFiles.ts`、`src/components/MarginRail.tsx`、`src/lib/reviewFiles.test.ts`

1. `reviewFiles.ts` import 加 `type Annotation`；加 `countOpenAnnotations(annotations: Annotation[]): number`，口径同 `:105-108`，`collectReviewFiles` 那 4 行改用它（防口径漂移）。
2. 同文件加 `applyLiveReviewRow(result: ReviewFilesResult, live: ReviewFileRow | null): ReviewFilesResult`：`live` 为 null 或 `live.total === 0` → 原样返回；否则按 path 替换该行（没有就插入），用既有 `compareRows` 重排，`truncated` 保持或行数超 `DEFAULT_MAX_ROWS` 时截到 50。
3. `MarginRail.tsx` 在 `:331` 一带算 `liveReviewRow`：`activePath` 非空且 `annotations.length > 0` 时取 `{path: activePath, name: docName, open: countOpenAnnotations(annotations), total: annotations.length}`，否则 null；再 `const reviewRows = reviewData ? applyLiveReviewRow(reviewData, liveReviewRow) : null`。
4. `:829-863` 渲染改用 `reviewRows`（四字段都从它取）；文案、类名、点击语义、`aria-current` 不动。
5. 测试 +4 条：替换已有行；补磁盘缺失行；`total=0` 不动磁盘行；其他行与 50 行截断不受影响。

在**渲染时**合并：面板开着时 `annotations` 变了也立刻对新值（流式到货也不假），无需 effect/定时器。

验收：
- `node --experimental-strip-types src/lib/reviewFiles.test.ts` → 原 13 条 + 新 4 条全过、exit 0。
- 静态对照：`git grep -cE 'applyLiveReviewRow|countOpenAnnotations' -- src` 在 HEAD exit 1（0 命中）、改后 ≥6；正向对照 `git grep -cE 'collectReviewFiles' -- src`。

门禁：`npm run build`、`npm test`、`node scripts/measure-first-screen.mjs --max 320000`。

风险：(1) 载入期 `annotations` 还空时不覆盖（`length > 0` 守卫），不误删磁盘行；(2) 全结项但 total > 0 → 覆盖成 `open 0`，正确；(3) 内存一条不剩（total = 0）→ 保留磁盘行（写盘可能还在飞），记已知边界，关掉重开即真值。

## 4. 任务 A2（证）：真机复现两条旧日志 + 体积记账

文件：`.tmp/e2e-r103-review-live.mjs`（新，不进产品代码；骨架抄 `.tmp/e2e-r102-finder.mjs` 与 `.tmp/e2e-r101-review.mjs`：假 FSA + 真 app）。

命令：`node .tmp/e2e-r103-review-live.mjs`（`SIDELIGHT_CDP` 默认 `http://127.0.0.1:57270`、dev 5175、1440×900），JSON 落 `.tmp/r103-review-live.json`。

1. T2 复刻：a.md 2 条（1 in-progress + 1 open），open 那张改 resolved → **150 ms** 内点「在审」→ 行 `open 0 · 共 2 条`；停 **1,800 ms** 再读仍同值。改前基线 `open 1`。
2. S2 复刻：a.md 3 条，改两张为 resolved → 600 ms 内打开 → `open 1 · 共 3 条`（改前 `open 2`）。
3. 未落盘新条目：新造 1 条 open 后 <600 ms 打开 → 该行 `total` 已含、`open` 计入。
4. 不波及：`sub/b.md` 行文本与改前同；关掉再开同值；当前篇仍带 `aria-current`；`pageerror` 0。

回归：`SIDELIGHT_CDP=http://127.0.0.1:57270 node .tmp/e2e-r101-review.mjs` → 57/57（磁盘一致时的 50 行截断 / 三支提示 / 空态）。**跑完 `git checkout -- shots/round-101/`**（会覆盖两张已跟踪截图）。

体积记账（写进 `impl.md`）：`npm run verify` 的 gate（期望 315,155 ±100）、`dist/assets/MarginRail-*.js` 的 gzip(9)（≤ 6,980）、真实首载 = gate + chunk。

门禁：`npm test`（基线 61 文件 861 条 → ≥865 条 0 fail）；不动编辑器/序列化，`roundtrip` 不必跑。

## 5. 不做（范围外）

- 不加「面板停留后定时重扫」：渲染时合并已让当前篇永远新，定时器只多闪烁与字节。
- 不动 `App.tsx`（不改防抖、不加 flush）：flush 在只读面板上多一次写盘且动 gate。
- 不改 `collectReviewFiles` 口径/排序、面板文案/类名/提示；不更新 README/CHANGELOG/BACKLOG（scribe/lead 做）。

## 6. 收尾

tester 独立验收（不读 `impl.md`）后 commit：`round-103: 在审列表当前篇 open 数改用内存（P2）`。拿不到改前基线时用 HEAD 版代码复跑同脚本作对照，写进 `test.md`。
