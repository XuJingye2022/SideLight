# 第 123 轮实现（executor）

HEAD `dcc31f1`（= 轮前 startSha），改动未提交。只做 `findings-bug.md` F1；B-255 未动代码。

## A1 迁移纯函数 + 单测 — PASS
- `src/lib/revisions.ts`：`findSnapshotsDir` 从 `revisionList.ts` 搬来并 `export`（不带 create，取不到回 null）；新增 `migrateRevisions(parent, oldKey, newKey)`——同哈希/取不到目录 → 0；先收全部旧前缀三段名，循环外逐份读文本 → `getFileHandle(newHash + name.slice(oldHash.length), {create:true})` 写并 close → `removeEntry(name)`，写删都成才 +1，每份 try/catch、永不抛；不重写 JSON。
- `src/lib/revisionList.ts`：删本地副本与因此不用的 `CACHE_DIR`/`REVISIONS_DIR` import，改 import 共用实现。
- `src/lib/revisions.test.ts`：假目录加 `failWrite`（`getFileHandle(...,{create:true})` 抛）/`failRemove`（`removeEntry` 抛）注入点；加 3 条（36 → **39**）。
- 门禁：test → **39/0**（改前 36/0）；`npm run build` exit 0；measure gzip **315,562**（净 **+3**）。
- 负向：`to` 改回 `oldHash + name.slice(...)` → **2 红**（主路 + 单份失败），非计划「只主路 1 红」；plan-review P2-2 已预判「共 2 红」。恢复 39/39。

## A2 接线 + BACKLOG — PASS
- `src/App.tsx:81` import 补 `migrateRevisions`；`handleRenamedFile` 迁移 `try` 内、for 之后（`:3049`）`await migrateRevisions(dir, cacheKey(oldFile.name), cacheKey(newName))`；deps/notice 不动。
- `BACKLOG.md`：B-254/B-255 到 P1 表末（`:133`/`:134`，open）、B-256 到 Deferred 表末（`:159`）；ID 连续。
- 门禁：`git grep migrateRevisions -- src/App.tsx` **2**；`-- src` **8 行 / 3 文件**（App 2、`revisions.ts` 1、test 5 行含 1 行注释）——计划「3 处」按文件数成立；`git diff --stat -- src` **4 文件**；`npm test` **64 文件 913 条 0 fail**（改前 64/910）。

## A3 E2E + 首屏复测 — PASS
- 闸门四条在；`.tmp/e2e-r114-tester-e2e.mjs` 确认不存在。
- `.tmp/e2e-r123-a1-rename-snap.mjs`（由 finder 脚本改写，只反断言）：reset 57270 后跑 → **12/12 PASS、exit 0**，`.tmp/r123-a1-rename-snap.json`。要点：磁盘改名前后各 2 份；前缀 旧 **2b24d044** → 新 **7729c516**（页面 import `/src/lib/revisions.ts` + `cacheKey` 现算）、后缀逐字同、旧前缀 0；重开面板 `snaps.length===2`、`snapEmpty===null`；再存后 3 行 / 磁盘 3 份全新前缀；`pageErrors`/`consoleErrors` 0。
- 截图 `shots/round-123/revision-snap-after-rename.png`（63,176 B）。
- 体积：`npm run verify` exit 0，gzip **315,685**（≤315,900，净 +126，距硬线余 4,315）；`MarginRail-BOWUh__F.js` raw 21,053 / gzip9 **7,416**；B-229 追加「门 = 315,685、chunk = 7,416、合计 = 323,101（超线 3,101，仍 open）」。
- 回归：`.tmp/e2e-r78-a2-rename.mjs` **11/11**、`.tmp/r114-tester-e2e.mjs` **27/27**（其 json 已复跑重写）。`roundtrip` 不跑。

## 偏离计划
1. 负向 2 红而非 1（plan-review P2-2 已预判）。
2. 单份失败测试旧键 **2 行**（f1 写失败留旧名、f2 删失败新旧都在），非计划 `('a') 1 行`；按算法必然。
3. `-- src` 命中 8 行（「3 处」按文件数解释成立）。

## CHANGELOG 建议
`- 重命名文档时修订快照跟着换键：改名后仍能看到旧快照（B-254）。`

## 新踩坑
1. `reset.mjs <端口>` 收尾会 `page.close()`，之后跑假定已有 5175 页的旧脚本（`.tmp/r114-tester-e2e.mjs` 的 `ctx.pages()[0]`）会 `page undefined`；先跑 `.tmp/r123-open-page.mjs` 开一张。
2. 「写失败」注入点要落在 `getFileHandle(to,{create:true})`：真 FSA 先建文件再 `createWritable`，在后者抛会留 0 字节新文件，「只留旧名」断言假红。
3. 负向红数按「主路 + 失败路径都依赖 `to`」算：要只锚主路 1 红，失败测试就不能断言旧文件仍在。
