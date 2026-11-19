# 第 105 轮计划（单轮 A，2 任务，1 条 P2）· revision 1

- 修订 1（按 `plan-review.md`）：A2 #1 夹具改「1 open + 1 resolved」、#2 补 in-progress 边界、#7 r103 原样 19/19；门改 `--max 315250`；口径钉死 unclosed；P2 三条（首载数、JSDoc/标题、新单测名）。任务与范围不变。
- round=105 / nn=105，`docs/iteration/round-105`，轮前 `startSha 47c86b7`。范围：队列第 8 条残留「全结项文档仍入列」（`round-102/findings-bug.md` F4，P2），backlog_id **B-234**。312,423 B 是第 93 轮旧数。

## 1. 体积

| 口径 | HEAD | 净增 | 结论 |
| :--- | ---: | ---: | :--- |
| 首屏门 gzip | **315,149**（104 轮） | 0（不动 `App.tsx`/`styles.css`） | 315,149±100 ≤ `--max 315250` |
| `MarginRail-*.js` gzip9 | 6,717 | +≤163 | ≤6,880 |
| 首载 = 门 + chunk | 321,866（B-229 open，超 1,866） | +≤163 | ≤**322,029**（超线 ≤2,029），记账 |

## 2. 成因

`reviewFiles.ts:142` 只判 `annotations.length === 0`、`:144-145` 直接 push；`MarginRail.tsx:345-349` 只要有批注就造行；`applyLiveReviewRow` 不删全结项行。证据：`.tmp/r102-finder-b.log` 的 `T2.afterFlush`=`open 0 · 共 2 条`；`.tmp/r103-review-live.json` 的 `storeAfterT2`=`[in-progress, resolved]`。

## 3. 口径（钉死一条）

**入列 = 至少一条未结项（open 或 in-progress）；全部 resolved / wont-fix 不入列。**

- 裁定句原样写进 `impl.md`/`test.md` 首段：「在审 = 至少一条批注是 open 或 in-progress；全部结项的文档不入列；行文案仍是 `open N · 共 M 条`，N 只数 open。」
- 依据：Review Mode 可处理集 = open + in-progress（`review-mode/SKILL.md:108`）。
- 边界（不判 FAIL）：只有 in-progress 的行显示 `open 0 · 共 M 条`；两段列表不做。
- 严格 open 需先改 A2 #2、第三参与 r103 T2 才能开工，执行中不得换。

## 4. A1（修）：全结项不入列

文件：`src/lib/reviewFiles.ts`、`src/components/MarginRail.tsx`、`src/lib/reviewFiles.test.ts`

1. import 加 `isClosedReview`（`annotations.ts:66`）；导出 `hasUnclosedReview(a)`=`a.some((x) => !isClosedReview(x))`。
2. `:142` 改 `if (!hasUnclosedReview(store.annotations)) continue`；`:94-99` 注释与 `applyLiveReviewRow` JSDoc（`:67-77`）改新口径，写清第三参：真时只删同 path 行、不 push/重排、不回填第 51 行。
3. `applyLiveReviewRow(result, live, liveClosed = false)`：空或 `total===0` 原样返回；真时 filter 掉同 path 行（`truncated` 不动）；假时现行为。
4. `MarginRail.tsx:345-349` 第三参 = `annotations.length > 0 && !hasUnclosedReview(annotations)`。
5. `:851` 空态改「还没有在审的文件：有未结项的批注才会出现在这里。」
6. 单测改 3 条：`:140-153` a（旧档全结项）不入列；`:209-235` d（resolved）不出现、排序剩 c/a/b（两条标题同步）；`:300-315` 只改注释为「剩 in-progress（open 0）」、断言不动（保住重排覆盖）。新增 3 条：全 wont-fix 不入列；仅 in-progress 入列且 open 0；`liveClosed` 删行（含不回填第 51 行）。

验收：`git grep -c 'annotations.length === 0' -- src/lib/reviewFiles.ts` 1→**0**；`git grep -n 'hasUnclosedReview' -- src` 0→**≥4 行**（`-c` 每文件 2）、`git grep -n 'liveClosed' -- src/lib/reviewFiles.ts` 0→**≥2 行**；`node --experimental-strip-types src/lib/reviewFiles.test.ts` **20/20**；`git diff --stat` 只 3 个源文件；`npm run build`；`npm test` 865→**868 条** 0 fail。

## 5. A2（证）：真机 + 体积 + 回归

文件：`.tmp/e2e-r105-review-closed.mjs`（抄 `.tmp/e2e-r103-review-live.mjs`）、`.tmp/r105-review-closed.json`、`shots/round-105/review-closed.png`（≤1）、`impl.md`、`test.md`；5175 + ego CDP 57270 + 1440×900；夹具自建（a/b/c/f + 第二工作区）。

1. 全结项删行：**a.md = 1 open + 1 resolved**。把 open 改 resolved，**150 ms** 开「在审」→ 行不在（磁盘仍 `open 1 · 共 2 条`，证第三参）；等 **1,800 ms** 再开仍不在。
2. 边界：b.md 仅 in-progress → 行在 `open 0 · 共 1 条`；f.md = 1 in-progress + 1 open，打开后把 open 改 resolved → 行仍 `open 0 · 共 2 条`（与 r103 T2 同形）。
3. 往返：c.md 1 open + 2 resolved → `open 1 · 共 3 条`；关面板改 open 为 resolved → 重开不在；改回 open → 重开在。
4. 空态：注入第二工作区（只 `closed.md`：1 resolved + 1 wont-fix）→ 0 行、`.rail-diff-empty` 逐字=新文案。
5. 不波及：排序 / `aria-current` / 50 行截断（r101 夹具）/ Esc / 关闭钮 / 背板 / 焦点还原 / 1024×700 无横溢 / 0 pageerror。
6. 对照取 `.tmp/r102-finder-b.log` 与 `.tmp/r103-review-live.json`；不跑 `git stash`。
7. 回归：r101 **原样 57/57**（⑨ 只断前缀，新文案保留）；r103 **原样 19/19**（T2 行留 `open 0 · 共 2 条`），`test.md` 注明「只有全结项才删行」；跑完 `git checkout -- shots/round-101/ shots/round-103/`。
8. 体积：`node scripts/measure-first-screen.mjs --max 315250`（期望 315,149±100、余 ≥101；默认 320000 是硬线，不能用）；`gzipSync(9)` chunk ≤6,880；门/chunk/首载（≤322,029）三个数写进 `impl.md`/`test.md` 与「B-229 仍 open」。

## 6. 不做与风险

- 不做两段列表；不改排序/上限/行字段/只读语义/`App.tsx`/revisions/`chat.ts`；不加依赖、不发版、不 push、不改 `release/`；README/CHANGELOG/BACKLOG 归 scribe/lead。
- 风险：① 面板开着时 render-time 合并（单测覆盖）；② 截断删行不回填（50→49、`truncated` 仍真）；③ 仅 in-progress 显示 `open 0`；④ r103 是口径对照；⑤ 测前 `fetch /src/lib/reviewFiles.ts` 查 HMR，不符就 touch；⑥ 门 ±100 B、`--max 315250` 留 101 B。
- 收尾：tester 独立验收（不读 `impl.md`）后 commit `round-105: 全部结项的文档不再算在审（P2）`。
