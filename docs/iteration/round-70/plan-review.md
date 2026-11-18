# 第 70 轮 plan 审查（critic，revision 1）

结论 **PASS**（0 P0 / 0 P1；5 条 P2，不阻断）。上一版 1 P1 + 4 P2 全修。复核 `plan.md`、`findings-bug.md`、`App.tsx:2400-2418/2685-2748/2844-2918`、`workspace.ts:246/292-302/356-360`、`trash.ts:45-48/151-166`、BACKLOG、`tsconfig.json`、`.tmp/r70-bug-c.json` 与 `-control.json`；未跑 E2E。`git log -1`=`605b5ff`（=startSha），产品代码未改（只有 BACKLOG 与 round-70 文档/截图未跟踪）。

## 上一版复核（5/5 已修）

- **H1**：plan:9/13/20 改回旧偏好（先 `files[index+1..]` 向后，再 `files[0..index-1]` 倒序）；plan:23 单测「末尾→上一个」；plan:37 A2 ④ 删 c 断言 b。按 `App.tsx:2867` 现口径核三例：删 a→b、删 b→c、删 c→b，与改前一致。
- **H2**：plan:45 B1 只留 A2 复跑 + 非活动/唯一/列表/跨目录四格；B-148/149 挪到 B2 尾部（plan:52），并写明超时先砍哪格。
- **H3**：plan:34 A2 ① 加 `__vfs.files.get('b.md')` 含「脏Q」。执行前置缺一步，见 P2-2。
- **H4**：plan:21 候选从删前快照取，`freshByPath.get(path) ?? 快照节点`，只 readNode 失败才跳过；与 `refreshTree` 早退 null（`:2690-2693`）口径一致。
- **H5**：plan:26 改后写 `.tmp/r70-impl-a1-after.json`，不重跑 `e2e-r70-bug-c.mjs`，`bug-c:121` 的改前证据保得住。

## 新 P2（不阻断）

- **P2-1 A2 ④ 留着旧括注**：plan:37 断言「切到 b.md」，同句又写「（回绕口径落 a.md）」，与 H1 相反，易被读成 a.md。删括注。
- **P2-2 A2 ① 缺「打开 b.md 打脏Q」**：验收要 `.current.md` 键与 b.md 含「脏Q」；`current.md` 只在 `wasActive && dirtyRef` 时写（`App.tsx:2868`、`trash.ts:194-195`）。① 补「点 b.md → 打「脏Q」→ 等 ≥700 ms」（照 `bug-c:91-96`）。
- **P2-3 A2 ③ 漏验失败名**：plan:11 要求通知附第一个失败名，plan:36 未断言。补 `.toast-text` 含「读不出」+ 首个失败名（big1.md）；实现换词就记实际文案，不判红。
- **P2-4 B1「写盘 ops/草稿数与改前同」无基线**：A2 不产 ops 数，`r70-bug-c.json` 也没有。A2 JSON 加 `ops`/`drafts`，B1 对着 A2 比；或改成「与 A2 同 + 0 新增文件」。
- **P2-5 plan:21 的 `flattenFiles(fresh?.root)` 过不了 strict**：`tsconfig.json` 是 `strict:true`，`fresh?.root` 为 `undefined`，函数参数只收 `WorkspaceNode | null`（`workspace.ts:356`）。写成 `fresh ? flattenFiles(fresh.root) : []`。

## 已复核通过

- 根因链对：`App.tsx:2867`、`:2877-2879` 清身份、`:2882` readNode、`:2889` notice；`workspace.ts:246` 5.5 MiB、`:295-297` throw。证据：24 采样 `undoAny:false`、pageerror「文件太大」；对照 120 ms 出撤销并切 a.md。
- notice 顺序：`loadIntoEditor` `:2416` 调 `setNotice(null)`，plan:22 放在其后，正确。
- `flattenFiles` 接受 null；`fallbackTargets` 放 workspace.ts、单测造纯节点可行；4 条覆盖中间/末尾/唯一/去重上限。
- 撤销源：`pickTrashSource` 优先 `.current.md`；`trashName` 出 `-<名>`，`-b.md.current.md` 后缀断言成立。
- 红线：无新依赖、不动 `release/`、不 push、版本 0.32.1；A1 纯 JS 不影响首屏。BACKLOG 只 B-152 为 open P1，停止条件不成立。plan.md 6111 B ≤6 KB。

按角色规则不再复审第二轮；余下 5 条 P2 交实现/验收时一并处理。
