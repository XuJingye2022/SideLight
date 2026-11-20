# 第 123 轮单轮计划（planner，revision 1）

> **revision 1**：按 `plan-review.md` 的 CR-1…CR-6 修完。轮次结构不变（队列每条单独一轮），任务仍 A1–A3，未新增。

HEAD `dcc31f1`；dev `localhost:5175`；真机 ego CDP 57270。只做 `findings-bug.md` F1（改名丢快照清单）。BACKLOG 最大 B-253，本批登记 **B-254**（本轮 F1）、**B-255**（findings-code F1，P1，open）、**B-256**（`recordRevision` 竞态，deferred）。

## 体积（红线段）
- 门实测 gzip **315,559 B**（硬线余 **4,441**；312,423 是第 93 轮旧值）；B-229 口径 = 门 + chunk `MarginRail-*.js` gzip9 **7,417** = **322,976**（仍 open，不修）。
- 净增估 +150~300 B。阈值只留一处：门 **≤315,900**（净 ≤+341；距 320,000 仍余 **≥4,100**）。**>315,900 即压缩，压完仍超判本步 FAIL**，报告写数值。
- 真减码（产物已去注释）：① 目录获取复用同一实现、chunk 少约 8 行；② 省 `handle.kind`；③ 内联名字切片。
- **先量再接线**：A1 完先 `npm run build` + `node scripts/measure-first-screen.mjs` 记净增再进 A2；不加依赖，新测试只进 `npm test`。

## A1 迁移纯函数 + 单测
- 文件：`src/lib/revisions.ts`、`src/lib/revisionList.ts`、`src/lib/revisions.test.ts`
- 步骤：
  1. `findSnapshotsDir` 从 `revisionList.ts:36-49` 搬进 `revisions.ts` 并 `export`（不带 create，取不到回 null）；`revisionList.ts` 删副本改 import（行为不变）。
  2. `export async function migrateRevisions(parent, oldKey, newKey)`：同哈希或目录取不到 → 0；`entries()` 只收 `kind==='file'` 且 `parseRevisionName(name, oldHash) !== null` 的项；逐份 `to = newHash + name.slice(oldHash.length)`（原样留 `-<base36>-<id>.json`）、读文本 → `getFileHandle(to,{create:true})` 写并 close → `removeEntry(name)`，写删都成才 +1；每份 try/catch，永不抛。
  3. 不重写 JSON（不存正文、`id` 不可重算；读侧只认前缀 `revisionList.ts:64-69`；`key` 无消费者）；格式 `v:1` 不变。
  4. `revisions.test.ts` 加 **3 条**（36 → **39**）：
     - 主路：a 两份（1_000/2_000）+ b 一份 + 坏名 → 返 **2**；`('c')` 2 行 [2000,1000]、`('a')` 0、b 仍 1、坏名仍在、`('c','c')` 0。
     - **不建目录（CR-5①）**：空根 → 返 0 且 `root.dirs.size === 0`。
     - **单份失败不抛（CR-5②）**：f1 写入失败、f2 删除失败 → `assert.doesNotReject`、返 **0**、f1 只留旧名、f2 新旧都在、`('a')` 1 行、`('c')` 1 行；fake 加 `failWrite`/`failRemove` 两注入点。
- 验收：`node --experimental-strip-types src/lib/revisions.test.ts` → **39/0**（36/0）；`npm run build` exit 0 + measure 记净增；负向把 `to` 改回 `oldHash + …` → 只主路 1 红，恢复 39/39。

## A2 接线 + BACKLOG 登记
- 文件：`src/App.tsx`（import `:81`；`handleRenamedFile` `:3000-3059`，迁移块 `:3028-3052`）、`docs/iteration/BACKLOG.md`
- 步骤：
  1. `:81` 的 revisions import 补 `migrateRevisions`。
  2. `handleRenamedFile` 缓存迁移 `try` 内、`for (draft/annotations)` 之后（`dir` 见 `:3031`）加 `await migrateRevisions(dir, cacheKey(oldFile.name), cacheKey(newName))`；deps 不加；不动 notice。
  3. BACKLOG 追加 3 行（回退也留）：
     - `B-254 | open | 保存 | 重命名后该篇修订快照不可见（键未迁移） | .tmp/e2e-r123-finder-rename-snap.mjs、src/App.tsx:3028-3052 | 123`
     - `B-255 | open | 保存 | 批注改档 600 ms 内切文档丢档 | .tmp/r123-finder-code2.{mjs,json}、src/App.tsx:2120-2147 | 123`
     - `B-256 | deferred | 保存 | recordRevision fire-and-forget：保存后立刻改名，旧键快照可能迁移后落地 | src/App.tsx:3395-3502 | 123`
- 验收：`git grep -n "migrateRevisions" -- src/App.tsx` **2** 处、`-- src` **3** 处；`git diff --stat` 的 **`src/` 仅 4 文件**（App.tsx 等），`docs/`、`.tmp/`、`shots/` 不受限；BACKLOG 三条 ID 连续；`npm test` **64 文件 913 条 0 fail**（改前 64/910）。

## A3 E2E + 首屏复测
- 文件：`.tmp/e2e-r123-a1-rename-snap.mjs`、`shots/round-123/revision-snap-after-rename.png`、`docs/iteration/round-123/impl.md`
- 步骤：
  0. **脚本闸门（缺一个就停，不静默跳过）**：`Test-Path` `.tmp/e2e-r123-finder-rename-snap.mjs`、`.tmp/e2e-r78-a2-rename.mjs`、`.tmp/r114-tester-e2e.mjs`、`.tmp/r114-tester-e2e.json`。**不是 `.tmp/e2e-r114-tester-e2e.mjs`（不存在，CR-1）**；真实脚本 23,909 B、27/27。
  1. 复制 finder 脚本，保留假工作区 / 两次保存 / 改名 / 再存，**只反断言**（「改名后为空」→「仍在」）与输出名 `.tmp/r123-a1-rename-snap.json`。
  2. 断言（改名后**重开**面板读）：`snaps.length===2`、`snapEmpty===null`、磁盘 2 份前 8 位 = 新哈希、后缀改名前后逐字同、旧前缀 0；再存后 3 行 / 磁盘 3；`pageErrors` 0；面板开 2 行时截图。
  3. `node .tmp/reset.mjs 57270` → `SIDELIGHT_CDP=http://127.0.0.1:57270 node .tmp/e2e-r123-a1-rename-snap.mjs` → 0 FAIL（保存后停 1.6 s 再改名避开 B-256）。
  4. `npm run verify` gzip **≤315,900**；`gzipSync(dist/assets/MarginRail-*.js,{level:9})` = Y（对 7,417 差 ±50 只记）；**B-229 追加「第 123 轮：门 = X、chunk = Y、合计 = X+Y」**；>315,900 走体积段（压完仍超 → FAIL）。
  5. 回归：`.tmp/e2e-r78-a2-rename.mjs` **11/11**、`.tmp/r114-tester-e2e.mjs` **27/27**；不跑 `roundtrip`。
- 验收：全 exit 0；报告写路径与数值；B-254 交 tester 改 `fixed`。

## 不做 / 边界
- **B-255 是下一轮首项，本轮不动代码**：600 ms 防抖被切文档的 cleanup 清掉（`App.tsx:2120-2147`），改档后立刻换篇静默丢。
- 不做 findings-code F2（对话只按 docName 清空）、findings-bug F2（面板开着不刷新）、快照回滚（B-248）；不改写盘格式与 `listRevisions` 行为、不动 CSS/UI。
- 边界：JSON 内 `key` 留旧键；同键改名（大小写、`a.md`→`a.markdown`）哈希不变跳过；竞态见 B-256。
