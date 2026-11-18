# 第 70 轮两轮计划（planner）· revision 1

> revision 1（按 plan-review H1–H5）：H1 候选改回旧偏好（index+1 向末尾，再 index-1 向开头），单测「末尾→上一个」，A2 加 ④ 删 c 格；H2 B1 砍到 A2 复跑+四格矩阵，B-148/149 挪 B2 尾部；H3 A2 ① 补撤销后脏正文断言；H4 候选取删前快照，fresh 有则新节点、无则旧节点，只 readNode 失败跳过；H5 改后证据换新 JSON 名，不覆盖 `r70-bug-c.json`。

## 结论
侦察新增 1 条 P1：B-152（删编辑中的文件时，下一个文件读不出 → 流程中断、无撤销入口、Ctrl+S 写新 `未命名.md`）。BACKLOG 有 1 条 open P1，停止条件不成立；本轮只做 B-152，P2 留 deferred。

## 目标行为
1. 候选 = `flattenFiles` 里被删项之后向末尾、再之前向开头，最多 3 个，**不回绕**；path 去重；超 5.5 MiB 或抛错跳过。
2. 第一个能读 → 切过去；title、`.is-active`、`activeFile`、保存落点一致。
3. 全失败/无候选 → 空白 `未命名.md`（非脏）；通知附第一个失败名。
4. 无论成败，`已移到回收站：<名>`（persist）+「撤销」必须出现；撤销恢复删除那刻的脏正文（`.current.md`，`src/lib/trash.ts:160-167`）。
5. 非活动文件路径不变；`[a,b,c]` 删 c 落 b、删 a 落 b、删 b 落 c（同改前偏好）。

## A 轮

### A1 · B-152 删除后切换不被读不出的文件中断
files: `src/lib/workspace.ts`、`src/lib/workspace.test.ts`、`src/App.tsx`（`removeFile` 2844–2918）
steps:
1. `workspace.ts` 加纯函数 `fallbackTargets(files, deletedPath, max = 3)`：先 `files[index+1..]` 顺序，再 `files[0..index-1]` 倒序；排除自己、path 去重、取前 max。
2. `removeFile`：候选取删前 `flattenFiles(workspaceRef.current?.root)` 快照，`fresh = await refreshTree()`，`freshByPath = flattenFiles(fresh?.root)` 建表。`wasActive` 时置 null/saveTarget/dirty，逐个取 `target = freshByPath.get(path) ?? 快照节点`；`readNode` 抛错记首个失败名并 continue，成功即 `loadIntoEditor(text, target.name, target)` 跳出；全失败/无候选 → `loadIntoEditor('', '未命名.md', null)`。
3. `setNotice` 留在 `loadIntoEditor` 之后（内部清 notice）；文案 `已移到回收站：<名>`，全失败附「（<失败名> 读不出，已打开空白文档）」，`persist` 与撤销 `action` 保留；不动非活动分支。
4. 单测 4 条：中间（删 b → 首候选 c）、末尾→上一个（删 c → 首候选 b）、无其它文件（[]）、去重/上限（重复 path 去重、5 项取 3）。
验收:
- `npm test` 全绿；`workspace.test.ts` 新增 4 条；`grep -n fallbackTargets src/App.tsx` ≥1。
- 反向对照：改前 `.tmp/r70-bug-c.json`（24 采样 `undoAny:false`、pageerror「文件太大」）；改后复制 bug-c 为 `.tmp/e2e-r70-impl-a1-after.mjs`（只改第 121 行输出路径）复跑，写 `.tmp/r70-impl-a1-after.json`，1.5 s 内出撤销；不重跑原脚本。
gate: `npm run verify`、`npm test`
risk: notice 顺序不可颠倒；「已刷新」toast 被覆盖；上限 3；`refreshingRef` 早退 null 不算无候选；落点同改前。

### A2 · B-152 E2E 证据（四场景 + 撤销）
files: `.tmp/e2e-r70-impl-a1-delete.mjs`（复用 bug-c 假 FSA 与 `.toast`/`.toast-text`）、`.tmp/r70-impl-a2.json`、`shots/round-70/delete-fallback.png`
steps: 先 `node .tmp/reset.mjs 9222`。每场景 `goto` 后重注入假 FSA；① `[a.md, b.md, big.md(真 6 MiB)]` 删 b.md；② `[a.md, b.md]` 删 a.md；③ `[a.md, big1, big2]` 删 a.md；④ `[a.md, b.md, c.md]` 删 c.md。
验收（写进 JSON）:
- ① ≤1.5 s 出 `.toast-text` 含「已移到回收站」、`.toast button` 有「撤销」；切到 `a.md`（title/activeFile/`.is-active` 一致）；0 pageerror/0 超大提示；trash 有键以 `-b.md.current.md` 结尾；撤销后 `b.md` 回树、「已恢复 b.md」、当前仍 `a.md`、`__vfs.files.get('b.md')` 含「脏Q」。
- ② 切到 `b.md` 且有撤销；打字后 Ctrl+S 写 `b.md`（不是 `未命名.md`）。
- ③ 空白 `未命名.md`（title/`.is-active` 一致）、有撤销；Ctrl+S 无改动 `addOps` 0；若仍新建文件记实际 toast，不判红。
- ④ 切到 `b.md`（title/activeFile/`.is-active` 一致）、有撤销、0 pageerror（回绕口径落 a.md）。
gate: 脚本 0 pageerror；不改产品代码。
risk: fake `File` 大小取字符串长度，big 必须真 6 MiB；`goto` 后等 `.ProseMirror:not(.preview-pane)`；「继续上次」浮层先关掉；截图 1 张。

## B 轮（先 10 分钟 delta 回归）

### B1 · delta 回归（10 分钟）
files: `.tmp/e2e-r70-delta-b1.mjs`、`.tmp/r70-delta-b1.json`
steps: 复跑 A2 四场景 + 四格矩阵（非活动删除、删唯一文件、列表态、跨目录）。超时先砍：跨目录 → 列表态（入口不可用记 UNVERIFIED）→ 非活动；A2 四场景不许砍。
验收: 每格 `pass:true`；写盘 ops/草稿数与改前同；0 控制台错误；有回归同轮修（≤1 处）。
gate: `npm run verify`、`npm test`
risk: 旧脚本 fixture 失效记 UNVERIFIED；B-148/149 抽查不在 B1。

### B2 · 跨目录 + 列表态补测 + 尾部抽查
files: `.tmp/e2e-r70-b2-nested.mjs`、必要时 `src/App.tsx`
steps: 嵌套工作区 `a.md`、`big.md`、`c.md` 分属两层，删当前文件；切列表态重复。断言候选可跨目录、title/`.is-active` 一致、撤销后树与当前文档不受影响。尾部（有余时）跑 B-148 `.tmp/e2e-r68-impl-a1.mjs`（约 3 分钟），还剩 ≥3 分钟再跑 B-149 `.tmp/e2e-r68-impl-b2.mjs`。
验收: 每格 pass；失败文案与 A1 一致；0 控制台错误；抽查没跑记 UNVERIFIED，不判红（两条已 fixed）。
gate: `npm run verify`、`npm test`
risk: 列表态无右键删除（B-102），需树态删后再核列表；flatten 顺序由 `entries()` 决定，假 FSA 按显示顺序；1 MB 脚本数分钟，超时先砍 B-149。

## 不做
P2 不排；不发版、不 push、不改 `release/`、不加依赖；版本 0.32.1。
