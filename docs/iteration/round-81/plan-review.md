# 第 81 轮计划审查（critic）

结论：**REVISE**（1 次；只改门槛与验收触发点，方案骨架不动）。
范围：本批 3 条都是 P2（默认不审），但 A1 带性能门槛、A2 动保存链，按「高风险」审；A3 只审是否值得占名额。

轮前核对：planner 的 4 条我逐条核过（read 工具口径），全部成立，别重写：① `src/App.tsx:4793`+`:4826`、`src/lib/export.ts:33,110` 在，`export.test.ts` 27 条；② 第 72 轮夹具 `.tmp/e2e-r72-bug-d.mjs:71` 只有 `.sidelight`/`trash` → `src/lib/cache.ts:96-106` 返回 null、`removeCache` 静默；③ `:3164-3168` 确实不走 `finishSaved`，`:3109-3114` 不删 legacy；④ `:6035` 确在渲染里算 `countText`。

## P1-1 A1 的 ms 门槛没有实现路径

`.tmp/r65-tester-b2-typing.json` 的 10 键 `longTasks`=[223,60,125,102,122,120,121,121,120,123,121]；本轮现测 `countText` 在 1,000,001 字符上 **p50 15.8 / max 20 ms**（7 次，node 24.21.0，`.tmp/r81-critic-count.mjs`；页内可能略高）。本项只能压掉 ~16–20 ms；残差 ~100 ms 不在 `countText`（归因 textarea 原生排版/React 渲染，未逐项拆）。故 `max ≤ 50 ms`（−170）与兜底 `≤ 改前 223 × 50% = 111 ms`（−112）都不可达。
修法：主门槛换机制断言（10 键期间渲染路径 `countText` 0 次、停笔 300 ms 后 1 次；保留「`:6035` 0 处」静态门）；次门槛用同一脚本实测比（before 跑完按实测 share 写数，如每键 p50 降 ≥5 ms）；加一条：share <25 ms 且降幅不足时**保留改动**、ms 门槛记 UNVERIFIED（照 B-115/B-129 教训，禁硬凑、禁回滚）。

## P1-2 A2 的 D1' 打不到要修的分支

`Ctrl+Z` 回基线后，`onUpdate` 的 300 ms 派生物（`src/App.tsx:1127-1132`）把 `dirtyRef` 置 false；此后 `requestSave`（`:3376-3378`）与 `runAutoSave`（`:3668`）都在脏标记门提前返回 → `:3164-3168` 只有「撤销后 ≤300 ms 按 Ctrl+S」这条竞态能进。D1' 只写「Ctrl+Z 回基线→等 4 s」，没有补存触发点 → 改前改后同一份残留草稿，脚本零判别力。
修法：清理挂到 `dirtyNow === false` 翻转处（`:1127-1132`），D1' 改「打字→开设置→等草稿落地→取消→Ctrl+Z→600 ms 内 drafts=0」，改前同脚本必须 =1；`requestSave` 空转分支作二选一最小改。抽出的 `discardDraftFor` 若写 `useCallback`，要声明在 `finishSaved`（`:3040`）前并进 `:3117` 依赖。

## P1-3 legacy 键这条新代码验不到

`legacyKeyFor` 只在清洗后键长 >40 时非 null（`src/lib/cache.ts:22,61-68`）。清理含 `legacyKeyFor(name)`，但计划脚本与验收都用 `a.md` → 该行永不执行。
修法：E2E 加 ≥41 字符文件名，先往 `.sidelight/drafts/<legacyCacheKey>.md` 塞文件，保存后断言两键都不在；否则拆成独立 P2 并标 UNVERIFIED。

## P2-4 A3 第三遍复核占批次名额

B-134 已 `fixed`（`BACKLOG.md:83`；第 76 轮修、第 79 轮真机 `.tmp/r79-a2-export-toc.json`），A3 预期 0 行改动却占 1/3。
修法：单测 27/27 + 静态两证，真机压成 tester 收口 5 行探针；名额换一条真 open 的 P2（如 B-211，`src/components/FindBar.tsx:131-133`）。批次不可换则 A3 ≤3 分钟。

## P2-5 预算超 executor 上限

A1 12 + A2 10 + A3 5 = **27 分钟** > common.md:30 的 25 分钟；A2 还要 before/after + 注释注入/恢复三轮，余量为 0。修法：A1 12→10、A3 ≤3，或按 P2-4 移出 A3。

## P2-6 改动前的成对证据只覆盖 D1

「注释 `:3108-3114` 让 D1 残留」只证明 D1 观测有效；D1' 与 legacy 没有改前基线。修法：HEAD 版跑同一脚本存 `.tmp/r81-a2-before.json`（预期 D1=0、D1'=1、legacy=1），after 对齐同字段。

## 不需要改

红线、门禁、`roundtrip` 免跑（A3 0 改动）都对；`sourceStats ?? stats` 首帧不闪 0、unmount 清 timer 对；A2「先推 generation 再删」顺序对。改完三条 P1 即可开工，不再复审。
