# 第 97 轮计划（planner，**revision 1**）· 批注四态（队列第 4 条 / 轮前 `40b651f`）

> revision 1：按 `plan-review.md` 修 1 条 P1 + 4 条 P2；任务数与范围不变（A1→A2→A3），仅 A1 单测 +1 条。只做队列第 4 条（P1，入池 **B-224**）：`open/in-progress/resolved/wont-fix` 的切换、落盘、旧档兼容、`resolved`/`wont-fix` 不挡正文。

## 取舍
- `Annotation.status`（内部态 `pending/accepted/dismissed`）**不改**：`decorations.ts:51`、`MarginRail.tsx:99`、`App.tsx:2430,2445`、`annotations.ts:396,398` 都依赖它；**新增** `reviewStatus`。
- 旧档读时归一（不升 `v`、不删旧字段）：`pending→open`、`accepted→resolved`、`dismissed→wont-fix`；有合法 `reviewStatus` 以它为准。写盘 `status` 原样、`reviewStatus` 恒写。
- `resolved`/`wont-fix` 不画正文 `.annot`，卡片留栏可改回。
- **旧档结项只迁移字段、不出卡（P2-1）**：`MarginRail.tsx:99` 与 `App.tsx:2430/2445` 仍只收内部 `pending`，旧 accepted/dismissed 迁移后不可见、也改不回来，本轮不扩可见性；本轮新造的两态内部仍是 `pending`，照常出卡。边界写进 `impl.md`/CHANGELOG，防 tester 把「旧档 3 条只看到 1 条」重报成缺陷。

## 首屏体积（硬线 320,000）
`node scripts/measure-first-screen.mjs --max 315000` 实测 gzip **313,360** / headroom **1,640** / PASS（批头 312,423 是第 93 轮值）。`MarginRail.tsx` 在 `lazy()`（`App.tsx:20`）不计首屏；计首屏 `annotations.ts`+`App.tsx`+`decorations.ts`+`styles.css` 预估 **+650～850 B**。判据：`--max 315000` exit 0、净增 ≤**1,600 B**、`npm run verify` PASS。超了按序削：`.note.is-closed` 虚线 → `.note-head` 只留 `flex-wrap` → `resolved` 配色删一块 → `marksBody` 内联。

## A1 数据层（`src/lib/annotations.ts`、`annotations.test.ts`）
1. 加 `REVIEW_STATUSES`/`ReviewStatus`/`REVIEW_STATUS_LABELS`（英文档名）、`normalizeReviewStatus`（非法→`open`）、`legacyReviewStatus`、`reviewStatusOf`（合法字段优先，否则按 `status`）、`isClosedReview`、`marksBody`（`status==='pending' && !isClosedReview`）。
2. `Annotation` 加必填 `reviewStatus`；`resolveAnnotations`（`:295`）恒写 `open`；`normalizeStoredAnnotation`（`:342`）加 `reviewStatus: reviewStatusOf(item)`（两条 parse 分支共用）；`annotations.test.ts:470` 是唯一直接赋值字面量，补字段（其余测试用 `as Annotation[]`，断言允许缺字段）。
3. `replaceInWindow`（`:387`）：`kept` 加 `isClosedReview(item) ||`；`reusable` 不动；merge 加 `reviewStatus: reviewStatusOf(old)`、`priorityManual` 不动；**返回前按 merged 认领的 id 去重**（P1-1）：`const claimed = new Set(merged.map((item) => item.id))` → `return [...kept.filter((item) => !claimed.has(item.id)), ...merged].sort((a, b) => a.from - b.from)`。不写就会：closed 被 `kept` 整条留下（`:395-397`）、又被 merged 以 `id: old.id` 复制（`:411-419`），`:421` 不按 id 去重 → 4 条、两条同 id 叠同一 top（`MarginRail.tsx:274`、`App.tsx:2440` 都以 id 为键）。
4. 测试 +6 条（800 → 806）：迁移表（三旧 status/缺字段/非法/合法优先）；两条 parse 分支带 `reviewStatus` 且 `status` 不变；四态往返；`marksBody`/`isClosedReview` 真值表 6 行；`replaceInWindow` resolved 保留 + id 不变 + in-progress 复用 + 同引文不新增；**去重**：closed（内部 `status:'pending'` + `reviewStatus:'resolved'`，即本轮 UI 造得出来的那种）在窗口内 + 同键 fresh → 条数不变、`new Set(ids).size === length`、`reviewStatus`/`priorityManual` 不变；另断言旧档 `status:'accepted'` 的 closed 不在 `reusable` 池、池外保留是既有行为。
验收：`node --experimental-strip-types src/lib/annotations.test.ts` 0 fail；`git grep --untracked -nE 'REVIEW_STATUSES|reviewStatusOf|marksBody|isClosedReview|claimed' -- src` 改前 0 行（对照 `normalizePriority` 8）→ ≥8。

## A2 UI 接线（`MarginRail.tsx`、`App.tsx`、`decorations.ts`、`styles.css`）
1. `MarginRail`：Props 加 `onSetReviewStatus(annotation, status)`；卡 class 加 `is-closed`；紧急度 select 后加 `select.note-status note-status-<四态>`（`value={reviewStatusOf(annotation)}`、`aria-label="第 N 处状态"`、`onClick` `stopPropagation()`、`onChange` 回调）。`:99` 的 `pending` 过滤**不动**。
2. `App.tsx`：`setReviewStatus`（map 换 `reviewStatus`）+ 传 `onSetReviewStatus`。
3. `decorations.ts:49-55` 的 `status === 'pending'` 换 `marksBody(annotation)`。
4. `styles.css`：`.note-status` 与 `.note-priority` 同盒（24/72 min、11px、`--ink-faint`/`--panel`）；`.note-status-in-progress`=`--mark`/`--mark-wash`、`.note-status-resolved`=`--accent-ink`/`--accent-wash`（两对已随 `.note-kind-revision`/`.note-priority-low` 上线，沿用，不加新配色对）；`.note.is-closed{border-style:dashed}`；`.note-head{flex-wrap:wrap;row-gap:4px}` **只作溢出兜底**，目标是单行（A3-6 量）。
5. **两套关闭语义定案（P2-2）**：「采纳/忽略/知道了」保持可用、语义不变——「采纳」= 替换落正文 + 条目出栏（四态随条目消失，属预期）；「忽略/知道了」= 只出栏、不落正文；四态只是标记，不移除、不影响出卡。不改代码，边界写进 `impl.md` 与 CHANGELOG 一行，A3-7 验一条。
验收：`npm run build`；静态 `note-status` 0→≥3 文件、`onSetReviewStatus` 0→≥4、`decorations.ts` 的 `marksBody` 1、`annotations.ts` 的 `claimed` 1。

## A3 自测与收口（`.tmp/e2e-r97-a1-status.mjs`、`impl.md`、`CHANGELOG.md`）
E2E（CDP 57270、1440×900；假 FSA 与 3 段夹具照 `.tmp/e2e-r95-a2-priority.mjs:44-140`；7 场一个脚本，场景 1 先跑，reload + 清 localStorage/IDB 后 2–7 连跑；每次改档后等 ≥1,600 ms 再读 store，落盘防抖 600 ms）：
1. **迁移先跑**：seed `.sidelight/annotations/note.json`（三条 status=pending/accepted/dismissed、无 `reviewStatus`、quote 用第 2 段原句；accepted 那条带 `replacement`，否则解析丢弃）→ 开 `note.md`：`.note` **恰 1**（另两条按 P2-1 刻意不出卡）、其 select=`open`；1,600 ms 后 store 三条 `reviewStatus`=`open/resolved/wont-fix` 且 `status` 原值不变。
2. reload 后主场景：点第 2 段 → `.analyze-button` → 3 卡；每卡 1 个 `select.note-status`，值/文案 `open,in-progress,resolved,wont-fix` / `Open,In progress,Resolved,Won't fix`，默认 `open`，`aria-label`=`第 N 处状态`，卡 `aria-label` 不含状态，`.note-head` 无横向溢出。
3. 第 1 卡逐档：值/`note-status-*` 跟着变；`resolved`/`wont-fix` 时 `.annot` 里不再有该条引文、计数严格减少，`open`/`in-progress` 复原到基线（按引文文本比对，不写死 −1，避免跨文本节点 span 抖动）；`resolved` 后仍 3 卡、`.note.is-closed` 1、`border-style` 含 `dashed`；底色 `open==wont-fix` 且 ≠ `in-progress` ≠ `resolved`。
4. 第 1 卡 `resolved`、第 2 卡 `in-progress`、**第 3 卡 `wont-fix`**（P2-4）→ store 含三条对应 `"reviewStatus"`、三条 `status` 仍 `"pending"`；切 `other.md` 再回：3 卡、三态保留、`.annot` 只剩第 2 卡引文。
5. 再分析：3 卡（不翻倍）、三张卡状态不变、store 3 条且 `new Set(ids).size === 3`、id 与重跑前一致（P1-1 落地）。
6. 几何（P2-3）：栏宽 320±1；`.margin-rail`/`.doc-scroll` `scrollWidth−clientWidth ≤ 0`；3 卡按 top 升序不重叠（±1）；**(a) 末卡 `bottom` ≤ `.rail-overall` `top`（±1，第 94 轮口径，整体评价展开态）**；**(b) 每张卡 `.note-head` 单行**（子项 `rect.top` 极差 ≤1、`head.offsetHeight ≤26`、`scrollWidth ≤ clientWidth`）；截图 `shots/round-97/note-status.png`；0 pageerror。(b) 红就先 `gap` 8→6 + 两 select min-width 64/72→56，仍红则 `.note-index{display:none}`，`impl.md` 记偏差。
7. closed 卡「采纳」预期（P2-2）：`.note.note-revision` 那张设 `wont-fix` 后点「采纳」→ 正文含 replacement、卡 3→2、改后 store 2 条、`.note.is-closed` 0（属预期，不判缺陷）。
门禁：`npm test` 58 文件 ≥806 条 0 fail；`npm run verify` PASS 并抄 raw/gzip；`--max 315000` exit 0 且净增 ≤1,600。报告 `impl.md`（≤4 KB，含 P2-1/P2-2 边界）；`CHANGELOG.md` 第 97 轮小节 + 标题上界 96→97。BACKLOG **B-224** 由 tester 入池。

## 范围外与风险
范围外：`[AGENT]` 线程、快照迁移、diff、Under Review、对话落盘、旧档结项可见性；不 push、不改 `release/`、0.32.1。
风险：① 两 select 挤 320 px 栏头（A3-6 量，真换行按 fallback 收）；② select 漏 `stopPropagation` 改正文选区（第 95 轮踩过）；③ 去重漏写造同 id 两份（单测 + A3-5 双保险）；④ 旧档结项不出卡被误判成缺陷（已定案并写文档）。
UNVERIFIED：真 IME 下的 select 键盘操作、WebView2 宿主内。
