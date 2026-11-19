# 第 97 轮 impl（executor）

结论：A1/A2/A3 全部完成，门禁全绿，回滚 0；只做队列第 4 条（B-224）。

## 任务
- **A1 数据层**（`src/lib/annotations.ts`、`annotations.test.ts`）：四态常量与文案、`normalizeReviewStatus`、迁移表 `legacyReviewStatus`（pending→open、accepted→resolved、dismissed→wont-fix）、`reviewStatusOf`、`isClosedReview`、`marksBody`；`Annotation.reviewStatus` 必填、`resolveAnnotations` 恒写 open、`parseAnnotationStore` 两分支逐条归一（status 原值不变、v 仍 2）；`replaceInWindow` 结项整条保留 + 复用 `reviewStatus` + 按 merged 认领的 id 去重。`node --experimental-strip-types src/lib/annotations.test.ts` → **34 条 0 fail**（+6）。
- **A2 UI 接线**（`MarginRail.tsx`、`App.tsx`、`decorations.ts`、`styles.css`）：`select.note-status`（四态、`aria-label="第 N 处状态"`、click `stopPropagation`）、`is-closed` 虚线、`setReviewStatus`、正文改按 `marksBody` 判、`.note-status` 与两档配色。`npm run build` PASS、`tsc --noEmit` 0 错。
- **A3 收口**（`.tmp/e2e-r97-a1-status.mjs`、`impl.md`、`CHANGELOG.md`）：E2E **44/44**、0 pageerror。

## 静态口径（改前 0 行）
`REVIEW_STATUSES|reviewStatusOf|marksBody|isClosedReview|claimed` **39 行**（≥8）；`note-status` **3 文件**；`onSetReviewStatus` **4 处**；`decorations.ts` 的 `marksBody` 2 行（import + 调用）、`annotations.ts` 的 `claimed` 2 行（定义 + 使用）——计划写「1」按一处口径。

## 门禁
- `npx tsc --noEmit` 0 错；`npm run build` PASS（www 98 文件 3,937,429 B）。
- `npm test` **58 文件 807 条 0 fail**（800→807：annotations +6、themes +1）。
- `npm run verify` PASS：首屏 gzip **313,688 B**（raw 1,016,702；硬线 320,000 余 6,312）。
- `--max 315000` exit 0、headroom 1,312；对批头 313,360 净增 **+328 B**（≤1,600）。
- 未改编辑器/序列化：不跑 roundtrip。
- E2E（ego CDP 57270、1440×900）**44/44**、0 pageerror；结果 `.tmp/r97-a1-status.json`，截图 `shots/round-97/note-status.png`。

## 偏差（不判 FAIL，附实测理由）
1. 卡头改法与 fallback 不同：计划「两 select min-width 64/72→56」不省宽度——`<select>` 由最长 option 撑开（紧急度 70、状态 86 px），`min-width` 只是下限。实际 gap 8→6 + 模拟态 `.note.is-simulated .note-index{display:none}`（实测 305.7 > 内容宽 294 px）；正式态序号照常显示。两种情形都实测单行 24 px。
2. 6b 判据改中线：子项高度不同（24/18/16），`rect.top` 极差恒 3，改按中线极差 ≤1；`display:none` 子项 rect 全 0 要先过滤。
3. 6a 前置：先滚 `.doc-scroll` 240 px 让被分析段落靠近栏顶，走 floor 分支（`top = max(natural, floor+12)`），再重点段落触发重排；末卡底 611.5 ≤ 整体评价顶 623.8。
4. `npm test` +7 而非 +6：多一条 `themes.test.ts` 四态 × 三主题 **12 对**对比度门（新上下文用到的那两对色也要过 AA，第 56 轮 B-118 教训）。

## 边界（已写进 CHANGELOG）
- **P2-1**：旧档 accepted / dismissed 迁移后不出卡——`MarginRail.tsx:99`、`App.tsx:2430/2445` 的 pending 过滤不动；「旧档 3 条只看到 1 张卡」是既定口径。本轮新造的两态内部仍是 pending，照常出卡。
- **P2-2**：「采纳 / 忽略 / 知道了」行为不变，四态只是标记。A3-7 已验：结项卡采纳后正文含 replacement、卡 3→2、store 2 条、`.note.is-closed` 0。

## 新踩坑
1. `<select>` 宽度由最长 option 撑开，`min-width` 只是下限：卡头宽度预算要按实测，改 min-width 不省空间。
2. `display:none` 子项 `getBoundingClientRect()` 全 0，算「同一行」会把极差算成整张卡高。
3. `page.evaluate(fn, arg)` 只收一个参数：多传的第二个参数是 `undefined`（`includes(undefined)` 恒 false → 假红）。
