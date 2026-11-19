# 第 95 轮计划审查（critic）— rev.2 复审：**REVISE**

实测（HEAD `91fdcf2`）：`measure-first-screen` gzip **312,566**、headroom 7,434、PASS（≤314,066 成立，距硬线余 5,934）。计数：annotations 22、prompt 7、themes **8**（rev.2 写「第 8 条」实为第 9，无碍）。行号全核：`annotations.ts:87-115/229-269/274-297/332-364`、`App.tsx:2008/2063-2090/2443/2487/5914`、`MarginRail.tsx:161-185`、`styles.css:192-195/1396/1427`、`cache.ts:51`；`.tmp/e2e-r70-impl-a1-delete.mjs:111-188` 的 `__vfs` 可用，其 `getDirectoryHandle`(`:159`) 正是要补前缀判定处。15 对对比度复算全部 ≥4.5（最小 4.58，与计划表同量级、个别末位舍入差 0.01；兜底 high 用 mark-wash 5.25/5.11/5.54）；`:focus-visible`+`--focus-ring:2px solid` 在。

## 上版 6 条
P1 prompt 语义已修（按严重度、`prompt.ts:50` 原样、两示例 medium/high、断言五档名；system ~981≤1500）；P2 验收③已拆两条；P2 落盘/重开已补假工作区+store JSON+切回+重跑；P2 体积兜底改为删装饰并断焦点环；P2 对比度已加 themes 断言；P2 卡片名改为 select 自带 aria-label。

## 漏洞（1 P1 + 2 P2）
1. **P1 重跑保留手改档位只覆盖首条、且只保一次**。① `annotations.ts:353-361` 的合并只回 `{...item,id,thread,sources,status,priority}`，`priorityManual` 丢——第一次重跑后 urgent 在、标记没了，第二次重跑取模型值回退。② `App.tsx:1765-1772` 只在窗口首条调 `replaceInWindow`，第 2/3 条走 `[...previous,annotation]` 追加；旧 2/3 条已被首条那次整窗替换删掉，重跑后是新 id，手改档位**第一次**重跑就丢。计划 ⑤ 只喂一条 fresh、E2E 只设第 1 卡，两条都测不出。修法：合并加 `...(old.priorityManual ? {priority: old.priority, priorityManual: true as const} : {priority: item.priority})`；App 侧收齐本窗口 fresh，窗口结束调一次 `replaceInWindow(beforeWindow, windowFresh, window)`（`annotationsRef` 记窗口前快照；时间紧可只把 priority 移植到新 id）；单测补「合并后 `priorityManual===true`、再调一次仍 urgent」+三条 fresh 的匹配；E2E 改在**第 2 卡**设 urgent、重跑**两次**、从 store JSON 断 `"priority":"urgent"`+`"priorityManual":true`+3 卡不翻倍（DOM 无 `data-id`，id 只能读 store）。
2. **P2 兜底与验收互斥**：兜底①让 high 与 medium 共用 `--mark-wash`（plan 第 6 行），底色 5 种变 4 种，E2E「底色 5 个互不相同」必红。修法：改断「class/文字色 5 档不同 + 对比度由 themes.test 兜」，或给 high 另留 distinct 底（先复算），test.md 记测的是哪一态。
3. **P2 口径字面矛盾**：同句写「每卡 value 依次五档」与「默认 none」。改为「option 值依次五档、当前 value 全 none」；并写清「聚焦按 Enter」聚焦的是卡还是 select（`noteJumpKey` 只认 `target===currentTarget`）。

## 通过项
0 新依赖、内核/schema 不动、不 push/不改 `release/`；数据只进 `.sidelight/annotations`（`App.tsx:2067-2084`）与宿主原样 JSON，`serializeAnnotationStore` 原样写、`parseAnnotationStore` 的 v2 spread 保 `priorityManual`。`Annotation` 加必填字段的构造点只有 `annotations.ts:255`，其余（`App.tsx:1998/2487`、acceptedRef、thread/sources）全 spread，测试只有 `as Annotation[]`（`:374/:377`），`build` 应过。E2E 前提：`mockItems` 不产 priority → 默认 none 可达；`cacheKey('note.md')='note'`；根文件 `cacheDirFor` 取根句柄；`noteJumpKey` 防 select Enter 跳句。体积：主 chunk +600~800、CSS ~200，`MarginRail` lazy 不计，+1,500 有余量。修掉 P1 后可直接执行，不必再开一轮审查。
