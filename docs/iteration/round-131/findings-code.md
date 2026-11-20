# 第 131 轮 · 代码/性能侦察（finder-code，复查不修码）

**结论：本轮没有新的 P0/P1**（actionable_count = 0，p0p1_count = 0）。2 条新 P2，都在第 129 轮「批注写盘改 flush」改动周边。
基线：`npx tsc --noEmit` exit 0；`npm test` exit 0。体积复核（`node scripts/measure-first-screen.mjs`）：门 gzip **316,056 B**（raw 1,025,373）、`MarginRail-*.js` gzip9 **7,880 B**、真实首载 **323,936 B**（硬线超 **3,936 B**）——已在池 **B-229**，不重复计。

## F1（P2，批注）`restoreAnnotationsFor` 无文档身份守卫，快速连点两篇时旧篇的恢复结果落到新篇并写进新篇批注档

证据：`src/App.tsx:2572-2625` 全程没有 `loadEpochRef`/`activeDocIdRef`/`file.path` 判据；`buildTextIndex(editor.state.doc)`（`:2597`）与 `setDocNotes`（`:2615`）都在 `await` 之后才执行，读的是**当前**这一篇；目标篇磁盘上没有批注档时 `:2594` 提前 `return`，**不覆盖**上一篇留下的 `docNotes`；`:2710-2713` 只有 `annotationsHydratedRef` 一个布尔，恢复完成即置 true；`:2195-2214` 的 600 ms 写盘读的是当前 `fileRef.current`。

触发序列：树里点 B（有一批批注）→ 很快再点 C（没有批注档）。B 的 restore 在 C 已载入后解析 B 的引文 → 全部 miss → 生成 N 条 `unresolved` docNotes 挂到 C（`kind:'unresolved'`）；C 的 restore 在 `:2594` 提前返回；600 ms 后这批 docNotes 连同空批注写进 **C** 的 `.sidelight/annotations/<cacheKey>.json`，并弹「从 .sidelight 恢复了 N 条批注」（`show`，`:2618`）。第 129 轮新加的 `await annotationsWriteRef.current`（`:2575`）在恢复入口前多一次 IO，把这个窗口又拉长。

修法提示：restore 入口记 `loadEpochRef.current` + `file.path` 快照，落地前两者任一变化即丢；或按 `fileRef.current?.path === file.path` 判。
状态：**UNVERIFIED**（本机 CDP 57270 被并行 finder 占用，未跑真机；机制按源码逐行核出）。

## F2（P2，保存/缓存）改名与删除两条路径没有先 flush：600 ms 窗口内改名，最新一次改档会被写进旧键，新键停在迁移时的旧快照

证据：第 129 轮把「写哪一篇」固定在调度那一刻（`src/App.tsx:792-830` 的 `pendingAnnotationsRef`，含 `name`/`path`），600 ms 后写（`:2210-2213`）；`flushAnnotationWrite` 只挂在 `:1450`（`applyHostPayload`）、`:2630`（`loadIntoEditor`）、`:831`（卸载），`handleRenamedFile`（`:3073-3131`）与 `removeFile`（`:3160-3168`）都没有。
- 改名：`:3102-3123` 读旧键 → 写新键 → 删旧键；迁移读的是**磁盘**快照，待写的最后一次改档还只在 `pendingAnnotationsRef` 里 → 新键缺最后一次改档，随后 600 ms 的写落到旧键 → 旧键在迁移后被重新创建成孤儿文件。
- 删除：`src/lib/trash.ts:327-331` 删除成功后删掉 `annotations` 缓存；`removeFile` 随后走 `loadIntoEditor` → `:2630` flush → 把刚删掉的批注档写回原目录。
复现（脚本化）：改一条批注状态 → ≤600 ms 内改名或删除。
修法提示：两处入口首行 `await flushAnnotationWrite()`（改名在迁移之前、删除在清缓存之前）；或 pending 只存 store，写盘时现读 `fileRef.current`。
状态：**UNVERIFIED**（窗口 ≤600 ms，人手操作基本回不到窗口内；未跑真机，按源码定序推断）。

## 其余复核（不计数、不当 P）
- `getChatSource` 每次发送都 `readBlocks(editor)` 全篇建块（`src/App.tsx:6108-6114`、`:205-211`），1 MB 文档每发送一次 O(n) 文本拷贝；没有量到可见卡顿前不报。
- 本轮未跑 `npm run verify` / `roundtrip`（只读复查）；未跑真机 E2E（并行 finder 正在同一 CDP 57270 上跑，避免互相污染状态与截图）。
