# 第 70 轮 A 轮实现（executor）

结论：A1、A2 均 DONE，门禁全绿。产品改动 3 个文件：`src/lib/workspace.ts`（新纯函数）、`src/App.tsx`（`removeFile`）、`src/lib/workspace.test.ts`；未改版本/依赖/`release/`。

## A1 · B-152 删除后切换不被读不出的文件中断 — DONE

改动：
- `src/lib/workspace.ts`：新增 `fallbackTargets(files, deletedPath, max = 3)`，顺序 `files[index+1..]` → `files[0..index-1].reverse()`；排除被删 path 并去重，取前 `max`；`max <= 0`、path 不在树里返回 `[]`。
- `src/App.tsx:2845-2939`：候选取删除前的 `flattenFiles` 快照（`:2867`）；`refreshTree()` 后建 `freshByPath`，命中用新节点、否则用快照节点；`readNode` 抛错记首个失败名并 `continue`；全失败 → `loadIntoEditor('', '未命名.md', null)`。notice 仍在 `loadIntoEditor` 之后，变体「已移到回收站：X（Y 读不出，已打开空白文档）」，`persist` 与撤销 `action` 不变；非活动分支未动。
- `src/lib/workspace.test.ts`：新增 4 条（删中间→首候选 c、删末尾→b、无其它文件/路径不在树里 → `[]`、path 去重 + 5 项取 3 + 不回绕）。

证据：`grep -n fallbackTargets src/App.tsx` 2 处（`101`、`2867`）；workspace 单测 11 pass（+4 新）；改后复跑 `.tmp/e2e-r70-impl-a1-after.mjs`（= `e2e-r70-bug-c.mjs` 只改第 121 行输出名）→ `.tmp/r70-impl-a1-after.json`：首个 `undo:true` 采样 index 1（≈120–240 ms ≪1.5 s），toast「已移到回收站：b.md」，title/active 均 `a.md`；原 `r70-bug-c.json` 未覆盖（仍是 24 采样 `undoAny:false` 的反向对照）。

## A2 · B-152 E2E 证据（四场景 + 撤销）— DONE

脚本 `.tmp/e2e-r70-impl-a1-delete.mjs`，结果 `.tmp/r70-impl-a2.json`，截图 `shots/round-70/delete-fallback.png`。跑前 `node .tmp/reset.mjs 9222`。四格 `pass:true`、`errors: []`。未改产品代码。

| 格 | 场景 | 关键结果 |
| :--- | :--- | :--- |
| ① | `[a,b,big 6 MiB]` 删脏 b | 67 ms 出「已移到回收站：b.md」+撤销；切 `a.md`（title/active 一致）；trash 有键 `…-b.md.current.md`；0 超大提示；撤销后 b.md 回树、「已恢复 b.md」、仍 `a.md`、`get('b.md')`=`# 乙\n\n第二篇脏Q\n` |
| ② | `[a,b]` 删 a | 59 ms；切 `b.md`；打字后 `Ctrl+S` →「已保存 b.md」、`get('b.md')` 含「写B」、未建 `未命名.md` |
| ③ | `[a,big1,big2]` 删 a | 82 ms；toast「…（big1.md 读不出，已打开空白文档）」；空白 `未命名.md`（title 一致、无 `.is-active`）；有撤销 |
| ④ | `[a,b,c]` 删 c | 56 ms；切 `b.md`（title/active 一致）；有撤销 |

③ 空白文档 `Ctrl+S` 实测 `addOps=2`、toast「已保存到 未命名.md」、vfs 出现 `未命名.md`：沿用「落点未知的新文档不拦」，按计划只记实际文案、不判红。

## 门禁

`npx tsc --noEmit` 0；`npm run verify` PASS（首屏 gzip **302,014 B**，内部 310,000 / 硬线 320,000）；`npm test` 40 文件 **524** 条 0 fail（原 520 + 新 4）；未跑 `roundtrip`（不碰编辑器/序列化）。

## CHANGELOG 建议（`## Unreleased`）

- 删除正在编辑的文件时，「下一个文件」读不出（超大/无权限）不再中断删除：跳过它继续找，全都读不出才退回空白文档，并始终给出「已移到回收站」与「撤销」（B-152）。

## 新踩坑

1. **`about:blank` 上 `page.evaluate` 访问 `localStorage`/`indexedDB` 会留一条 `Uncaught (in promise) undefined` 的 pageerror**（CDP `url=null`、`line=6`、无栈）。复位脚本必须先 `goto` 应用源再清存储，否则第一格判成「非 0 pageerror」假红。
2. **候选必须取「删前快照」**：删除后 `flattenFiles` 已无被删项，现算 `index-1` 会落错；`refreshTree()` 返回 `null` 只表示刷新排队/失败，不能当成「候选不存在」而丢快照节点。
3. **假 FSA 下 `.current.md` 只在 `wasActive && dirtyRef` 时写**：先点文件、打字、等 ≥700 ms 再删，否则撤销格假红。
