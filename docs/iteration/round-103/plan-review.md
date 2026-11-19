# 第 103 轮计划审查（critic）· PASS

审 `docs/iteration/round-103/plan.md`（6,104 B，超 plan ≤6 KB 上限 104 B；无 BACKLOG ID，见 CR-4）。HEAD `08f6581`，范围/体积/验收逐项核过，方案可行。下列 4 条全 P2，按 CR-1/CR-2 改验收文字即可执行。

## 复核实测

- `node scripts/measure-first-screen.mjs --max 320000` → gzip **315,155** PASS（余 4,845）；`dist/assets/MarginRail-C0INMF2y.js` raw 18,645 / gzip **6,573**；门+chunk **321,728**，与计划 §2 一致。
- `node --experimental-strip-types src/lib/reviewFiles.test.ts` → **13/13 exit 0**；`git grep -cE 'applyLiveReviewRow|countOpenAnnotations' -- src` exit 1（正向 `collectReviewFiles` 3 文件 18 行）；dev 5175 HTTP 200、ego CDP 57270（Edg 157）可用。
- 落点全对：`MarginRail.tsx:311-329` 只读磁盘、`:833` 空态、`App.tsx:6001` 传 `annotations`；`App.tsx:2120-2147` 600 ms 防抖（`:2145`）；`reviewFiles.ts:34/49/105-108`。r101 回归确有 **57** 个 `check(`，会覆盖两张已跟踪截图（`shots/round-101/review-{list,truncated}.png`），计划已写还原。

## 漏洞（全 P2）

- **CR-1（验收精度）A2-2 动作与期望值矛盾**：写「a.md 3 条，改两张为 resolved → open 1」。照字面把两张 open 都改 resolved 得 **open 0**；`.tmp/r102-finder-a.log` 的真实流程是 2 open + 1 resolved，只把卡片① in-progress→resolved，磁盘旧值 open 2、内存 open 1。**修**：写明只动卡片①（那张已 resolved 的是 no-op），或把期望改成 open 0。
- **CR-2（渲染分支）空态必须判合并后的行**：`:833` 现为 `reviewData === null || reviewData.rows.length === 0`，§3-4 只写「四字段都从它取」，这一行不是字段。**修**：写成 `reviewRows === null || reviewRows.rows.length === 0` 并保留 null 守卫；A2 补一子例——当前篇磁盘无档（新批注 <600 ms 未落盘）+ 内存 total>0 → 列表 1 行且无空态提示（否则单测只覆盖纯函数，接线错了看不出）。
- **CR-3（体积口径）§2 自相矛盾**：同一表已写真实首载 321,728 超线 1,728（B-229 open），末句却写「硬线 320,000 由 gate 口径守」；本批 chunk +≤400 → **≈322,1xx**，仍超且比 HEAD 多。**修**：只写「gate 315,155 PASS（官方口径）；B-229 口径仍超、本批 +≤400 记入 B-229，口径由 lead 定」，不得写「硬线守住」；不改实现。
- **CR-4（范围外新发现，交 lead 入池，不塞本轮）**：改档后 600 ms 内切文档，待写批注会被清掉——写盘 effect `App.tsx:2120-2147` 的 cleanup 在 `annotations` 变化时 `clearTimeout`，`loadIntoEditor:2622` 切档同步 `setAnnotations([])`，`restoreAnnotationsFor` 只恢复新篇；该档位内存已丢、磁盘仍旧值。静态推断，未实跑。本轮 A2 只测同篇，不阻塞；建议单开一轮（切档前 flush）。流程上：plan 无 BACKLOG ID，CHANGELOG/BACKLOG 推给 scribe/lead——第 101/102 轮 commit 都带这两份，本轮收口同办。

## 结论

**PASS**。渲染时按 path 合并当前篇内存行是正确最小修法：不动 `App.tsx` / 写盘 / gate；150 ms 与 1.8 s 断言能区分旧值（改前基线 open 1 有 `.tmp/r102-finder-b.log:2-4` 为证），回归 `r101-review 57/57` 与截图还原都已写。按 CR-1/CR-2 改验收文字后直接执行，不必复审。
