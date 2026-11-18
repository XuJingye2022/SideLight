# 第 81 轮计划（3 条 P2）· revision 1

> 依 `plan-review.md`（3×P1+3×P2）修门槛与触发点；任务数、范围、顺序不动。

- startSha `287e35f`；0.32.1；不 push/不改 `release/`/不加依赖；报告 `docs/iteration/round-81/`。
- dev `http://localhost:5175`；CDP 9222–9226 不通就让 ego 只试 1 次，再不通只交单测/构建/静态并记 UNVERIFIED。
- 预算 A1 10 + A2 10 + A3 3 = 23 分钟（common.md:30 上限 25）。

## 轮前已核（`plan-review.md:6`）

- B-153 真口子：`performCommit:3164-3168` 不走 `finishSaved`；`finishSaved:3109-3114` 不删 legacy 键；撤销后 300 ms 派生物（`:1129-1132`）置 `dirtyRef=false` 后 `:3376-3379`/`:3668` 全早退 → 残草稿只有该翻转点能清。

## A1（B-139）1 MB 源码态逐键不再算全篇字数

- 文件：`src/App.tsx:596`（state）、`:3780` 附近（effect）、`:6035`（换取值）。
- 1. `.tmp/e2e-r81-a1-src-stats.mjs`：用 `.tmp/e2e-r64-impl-b2-typing.mjs` 的骨架（1 MB 夹具、进源码态、`delay:0` 打 10 字、收 longtask），加四采样读 `sl-source-stats` 标记数（c0 打前 / c1 打完 / c2 +100 ms / c4 +600 ms，写法照其 `parseCount()`），另记 `.stats-trigger` 文本与 `typing.totalMs`。先对 HEAD 跑 → `.tmp/r81-a1-before.json`。
- 2. 改法：`sourceStats` state + effect（依赖 `sourceMode`/`sourceText`；进源码态立即算 1 次、之后 300 ms 防抖；≤20 KB 立即；离开源码态 `setSourceStats(null)` 并清 timer），算前 `if (import.meta.env.DEV) performance.mark('sl-source-stats')`；渲染改 `sourceMode ? (sourceStats ?? stats) : stats`。
- 3. 复跑同脚本 → `.tmp/r81-a1-after.json`。
- 验收：
  - 机制门（主）：`c1−c0=0`、`c2−c0=0`、`c4−c0=1`；`typing.totalMs>1,200` 则记 UNVERIFIED 并补跑。
  - 静态门：`:6035` 处 `countText(` **0 处**；全文件仍 5 处（596/1119/1155/1205 + 新 effect）。
  - 值门：after 的 `.stats-trigger` ≡ before 600 ms 读值。
  - 次门槛（before 跑完按实测写数）：after 每键 longTask **p50 ≤ before p50 − 5 ms**；`max` 只记录不设门。
  - 兜底：份额 <25 ms 且 p50 降幅 <5 ms → **保留改动**、ms 门槛记 UNVERIFIED，报告写地板值与每键列表（B-115/B-129：禁硬凑、禁回滚）。
  - `value.length` +10、`sl-parse-done` 不增、0 页面错误、`npm test` 0 fail（45/579 上下）、`verify` gzip ≤310,000（基线 303,9xx）。
- 风险：每键 textarea 排版有地板；只压 `countText`。

## A2（B-153）保存成功与「回到基线」都清草稿（含 legacy 键）

- 文件：`src/App.tsx:3102-3114`（抽清理）、`:1127-1132`（主触发）、`:3164-3168` 或 `:3376-3379`（二选一）、`:3117`（依赖）。
- 1. `.tmp/e2e-r81-a2-drafts.mjs`（`.tmp/r30-fsa.mjs` 的 `installFakeWorkspace`+`openFolder`，dirs 含 `.sidelight/drafts`）四场景：
  - **D1 回归**：打字 → 150 ms 开设置 → 等 3.0 s（前置 drafts=1）→ 点「取消」→ 等 3.5 s：drafts 0、`a.md` 增长（改前也 0）。
  - **D1' 主**：同 D1 到「取消」→ 点 `.ProseMirror p`、停 250 ms → `Ctrl+Z`（取消后 ≤1 s）→ 自 Ctrl+Z 每 100 ms 轮询至 1,500 ms，记首个 0 时刻，门槛 **≤600 ms**；再等 2,500 ms 仍 0。
  - **D2 竞态**：`Ctrl+Z` 后 ≤300 ms `Ctrl+S` → drafts 0（覆盖次触发 (a)；选 (b) 则本场景改「400 ms 后再 Ctrl+S」）。
  - **L1 legacy**：主名 ≥41 字符（去 `.md` 后仍 >40）的文档打 1 字 → 往 `window.__fsState.files` 塞 `.sidelight/drafts/<cacheKey>.md` 与 `<legacyKeyFor>.md`（页内 import `cache.ts` 取两键）→ 2.5 s 草稿到点前 `Ctrl+S` → **两键都不在**；再等 3.2 s 仍不在。
- 2. 基线：对 HEAD 跑同一脚本 → `.tmp/r81-a2-before.json`（预期 D1=0、D1'=1、D2=1、L1 legacy=1）；改前 D1' 或 L1 legacy ≠1 → 先修脚本再判产品。
- 3. 改法：`discardDraftFor(name, oldName?)`（`useCallback`，**声明在 `finishSaved`（`:3040`）之前**）= 停 `draftTimerRef` + `draftGenerationRef += 1`（先推代际再删，同 `:780-783`）+ 异步删 `cacheKey(oldName)`/`cacheKey(name)`/`legacyKeyFor(oldName)`/`legacyKeyFor(name)`。
- 4. 触发点：`finishSaved:3102-3114` 改调它；主 `:1129-1132` 的 `dirtyNow === false` 翻转处调（名字取 `docNameRef.current`；`onUpdate` 在 `:1106`、早于声明处，按 `scheduleDraftRef`（`:1144`）的模式经 ref 转手）；次触发**二选一**：(a) `performCommit:3164-3168`（撤销后 ≤300 ms 的 Ctrl+S）或 (b) `requestSave:3376-3379` 空转分支（已干净 + 残留草稿）；impl.md 写选了哪个与理由。
- 5. `finishSaved` 依赖 `:3117` 补 `discardDraftFor`；选 (b) 时 `requestSave` 依赖 `:3398` 同补。
- 验收：D1=0；D1' ≤600 ms=0（改前=1）；D2=0；L1 两键都不在（改前 legacy=1）。反例不回归：`autoSave:false` 与保存失败仍留草稿、重开同篇不弹「发现比磁盘新的草稿」（`:2457-2463`）；`npm test`/`verify` 0 fail。
- 风险：先推代际再删；新排的 2.5 s 计时器由 `stale()`（`:769-774`）挡掉。

## A3（B-134）HTML 导出目录：静态 + 单测复核（≤3 分钟，0 改动）

- 只读：`src/App.tsx:4793`/`:4826`、`src/lib/export.ts:33,110`、`src/lib/export.test.ts`；验收 `node --experimental-strip-types src/lib/export.test.ts` **27/27**（已复跑）+ 静态两证。
- 真机段压成 tester 收口的 5 行探针（复用 `.tmp/e2e-r79-a2-export-toc.mjs`），executor 不跑浏览器。
- 收口：B-134 留 `fixed` 交 scribe（`:4817` 系旧行号）。名额：成本压到 3 分钟；P2-4 建议换 B-211（`FindBar.tsx:131-133`），planner-revision 无权加任务 → 记给 lead，不扩范围。

## 全轮

- 门禁 `npm run verify`、`npm test`；不动序列化 → `roundtrip` 免跑（A3 0 改动）。
- 证据落 `docs/iteration/round-81/`，JSON 写 `.tmp/r81-*`；截图 ≤2；报告中文。
- 收口：B-139/B-153 事后从 Deferred 表移进 P2 表并补状态列。
