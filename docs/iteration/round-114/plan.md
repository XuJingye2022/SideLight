# 第 114 轮计划（单轮，只做队列第 6 条的读侧）

> revision 1（依 `plan-review.md` 2 P1/4 P2）：CR-1→A1.2/a/b/门/A2①；CR-2→§1；CR-3→A1.2/g/⑦；CR-4→A2.3/4/⑪⑫；CR-5→§3；CR-6→A2.5。任务仍 A1/A2，轮前 `531b650`。

## 0. 基线（旧数作废）

- 门 gzip **315,218**（`round-113/test.md`）余 **4,782 B**；`MarginRail-*.js` gzip9 **6,916** → 真实首载 **322,134，超线 2,134**（B-229 open；旧 6,884/322,097 作废）。
- 写侧 `App.tsx:3395-3407`→`revisions.ts:236`；读侧 src 0；快照无正文（`:18-27`）；`revisions.test.ts` 28/28。

## 1. 体积预算

- 门：A1 进惰性 chunk；A2 `App.tsx`≈+100 B、CSS≈+200 B → **315,3xx**，`--max 315900`。常驻 chunk **6,916→≤6,980**；新惰性 chunk ≤1.2 KB gzip9，不计首屏/合计。
- 合计 **≈322,1xx–322,2xx**（已超线，只报数；不再写「距硬线 ≥4,100」）。

## 2. 任务

### A1 读接口 + 单测（B-247 新）

- 文件：`revisions.ts`、`revisionList.ts`（新）、`revisions.test.ts`。
- 步骤：1) `:203`/`:219` 两 helper 加 `export`，实现不动。2) `revisionList.ts`：`RevisionSummary{name,savedAt,bytes,total,open}`、`formatSavedAt`（MM-DD HH:MM:SS 补零）、`listRevisions(parent,key,max=MAX_REVISIONS)`：目录走 `findRevisionsDir` 照 `cache.ts:104-114` **无 create**、throw→`[]`（不复用 `revisionsDir` `:197-200`）；`entries()` 抛错→`[]`；只收 `kind==='file'`+`parseRevisionName` 非 null（他键/坏名/旧格式不读）；savedAt 降序（同 `pruneRevisions`）取前 max；逐个 `getFile().text()`→`parseRevision`，坏档/读错跳过；savedAt 取**文件名**、bytes 取 JSON（缺 0）、total＝批注数、open＝`reviewStatusOf==='open'` 数；不抛。
- 加 8 条（28→36）：a) 无 `.sidelight`→`[]` 且 `root.dirs` 不新增；b) 有 `.sidelight` 无 `revisions`→`[]` 且不建；c) 他键/坏名/旧 `<id>.json` 不入列 0 读；d) 降序；e) 10→8 读 8；f) 坏档跳过；g) JSON savedAt≠文件名→按文件名（含 open）；h) 格式。
- 验收：`node --experimental-strip-types src/lib/revisions.test.ts` **28→36 条 0 fail**、`npm test` **≥892**；静态（贴改前）`listRevisions` HEAD **0（exit 1）→≥1**、`getDirectoryHandle\([^)]*create` 在新文件 **0**、`revisionsDir(` **0**；写侧：两次 1 份、第 9 份留 8。

### A2 只读入口 + 文档 + 门禁

- 文件：`MarginRail.tsx`、`App.tsx`、`styles.css`、`README.md`、`.tmp/e2e-r114-a1-snapshots.mjs`（新）。
- 步骤：1) `App.tsx:6016` 旁加 `getRevisionSource`：`cacheDirFor()`+`cacheKey(docNameRef.current)`，回 `{dir,key}` 或 null。2) `MarginRail` `Props`（`:33`）加该 prop。3) `openReview`（`:338-356`）先清 `snapData`，与 `collectReviewFiles` 并行跑 `loadSnapshots`：`await import('../lib/revisionList.ts')`（`App.tsx:5093` 先例），源 null/抛→null，结果过 `reviewRunRef` 闸。4) 过期守卫（CR-4③）：新 `snapRunRef`；`closeReview`（`:329`）、页签切走（`:313-315`）、`docName` 变（新 effect）推进并清 `snapData`。5) 渲染（在审 sheet 内、列表后，`:903` `)}` 与 `:904` `</div>` 间）：`section.rail-snap` 仅 `!reviewBusy && !reviewNoWorkspace && snapData!==null`；`h3.rail-snap-title`、`ul.rail-snap-rows`+`li.rail-snap-row.rail-diff-row`（`MM-DD HH:MM:SS · N B · 批注 N 条（open M）`）、`p.rail-snap-empty` 空态「保存一次后才会记录」、`p.rail-snap-note`「快照只记批注与字节数，不存正文，不能回到旧版正文。」；不改「在审」「在审文件」文案，标题/空态不用 `.rail-diff-title`/`.rail-diff-empty`、不加控件（r101 计数照旧）。6) `styles.css:1477` 后 +6 条纯文本类。7) `README.md`「现在不能做什么」+1 行（同句）。
- 验收：E2E（ego CDP 57270、1440×900、假 FSA 记 `read:/create:/write:/remove:`）**14 条见本轮 `plan-acceptance.md`**（计量口径 `S`=`.sidelight/`、`R`=`.sidelight/revisions/`；含 CR-1/CR-3/CR-4③ 的对照例）。清单要点：开前 `S` 读 0 写 0、开后 `read:R`=8 且写 0、`.rail-snap-row`=8、文件名时刻优先、过期行 0、0 pageerror。截图 `shots/round-114/revision-snapshots.png`（1 张）。
  - 体积：`npm run build`→`measure-first-screen.mjs --dir dist --max 315900` exit 0；chunk gzip9 ≤6,980；惰性 chunk 报数；**门/chunk/合计三数并报**。
  - 回归：`e2e-r100-diff.mjs` 43/43、`e2e-r101-review.mjs` 57/57、`r105-tester-e2e.mjs` 33/33；跑完 `git checkout -- shots/round-100 shots/round-101 shots/round-105`；变红先核作用域。
- gate：`npm test`（≥892）、`npm run verify -- --max 315900`；`roundtrip` 不跑。

## 3. 不做与入池

- 不改快照 JSON、不存正文、不做回滚与批注明细、不加依赖、不 push、不动 `release/`、不新增测试文件。
- 只做清单不做回滚属用户可见能力：**开工前 lead 确认**（回滚＝每次停笔多写全文，B-120）；不确认则收 A2 界面、只交 A1+README 边界，B-247 记 `deferred`。入池 **B-247**（P2 planned）、**B-248**（P2 deferred，正文快照/回滚，需产品负责人点头）；tester 验收后 B-247 置 `fixed`。

## 4. 风险与应急

- R1 改名/另存为挂旧键→列表少或空（不迁移）。R2 不存正文→不回滚。R3 动态 import 首开多一次请求。R4 旧格式不入列、旧键不读。R5 本地时区。R6 r101 取首个 `ul.rail-diff-rows`、按 `.rail-diff-empty` 数文案（已避让，仍回归）。R7 真 FSA/网络盘/WebView2 **UNVERIFIED**。超支：①删字节数列、行压纯文本；②收界面只交 README/BACKLOG。

## 5. tester 独立验收

1. 不读 `impl.md`：自写 `.tmp/r114-tester-snap.mjs` 直跑 A1 八例（含 a、g）；E2E 复跑 A2 十四例（`read:R` 0→8，`S` 写恒 0）。
2. 静态贴 HEAD 0 命中；`npm test` ≥892；`verify --max 315900`；chunk ≤6,980；三数并报。
3. 回归 r100/r101/r105 后还原 shots；`git diff --stat` 只含 A1/A2 文件 + README + 本轮文档。
