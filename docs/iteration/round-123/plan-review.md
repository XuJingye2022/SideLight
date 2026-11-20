# 第 123 轮计划审查（critic，revision 1 复核）

结论：**PASS**。上轮 CR-1…CR-6 全部落地；本轮 6 条均为 P2，不阻塞执行，按文字改计划即可。

## 实测复核（HEAD `dcc31f1`）
- 体积：`node scripts/measure-first-screen.mjs` → gzip **315,559** / 余硬线 **4,441**（PASS）；`dist/assets/MarginRail-CQzq6gd5.js` raw 21,053、gzip9 **7,417**；合计 **322,976**。≤315,900 = 净 ≤+341、距 320,000 ≥4,100，算术对。
- A3 闸门四个脚本都在：`.tmp/e2e-r123-finder-rename-snap.mjs` 8,839 B、`.tmp/e2e-r78-a2-rename.mjs` 7,312 B、`.tmp/r114-tester-e2e.mjs` 23,909 B、`.tmp/r114-tester-e2e.json` 3,385 B（27/27）；`.tmp/e2e-r114-tester-e2e.mjs` 确不存在。
- 计数：`revisions.test.ts` 现有 **36** 条；`npm test` 基线 64 文件 910 条 → 39/913 自洽。BACKLOG 无 B-254/255/256，ID 未撞。
- 方案关键点：`handleRenamedFile` 的 `dir`（`src/App.tsx:3031`）= `parentDirectory(space, oldFile.path)`，与 `recordRevision` 的 `cacheDirFor()`（`:892-896`、`:3401` 传给 `writeRevision`）同源 → 迁移目录取对；`findSnapshotsDir`（`src/lib/revisionList.ts:40-49`，不带 create）、`parseRevisionName`（`src/lib/revisions.ts:223`）、`revisionKeyHash`（`:206`）都在，`to = newHash + name.slice(oldHash.length)` 成立；`Revision.key` 无消费者、`listRevisions` 只认文件名前缀，不重写 JSON 可行。
- 证据行号：`src/App.tsx:2120-2147` 正是 600 ms 批注写盘防抖（B-255）；`recordRevision` 定义 `:3395-3407`、调用点 `:3502`（B-256 成立）。
- 红线：不换内核、不加依赖、不改写盘格式、不动 CSS/UI/只读清单；25 分钟可做完。

## 上轮漏洞复核
| CR | 结论 | 落点 |
| :--- | :--- | :--- |
| CR-1 P1 | 已修 | A3 步骤 0 四条 `Test-Path`、缺一即停；回归路径改真实 `.tmp/r114-tester-e2e.mjs` |
| CR-2 P1 | 已修 | A2 步骤 3 登记 B-255（open，证据 `.tmp/r123-finder-code2.{mjs,json}`、`:2120-2147`）；「不做/边界」首条写明它下一轮首项、本轮不动代码 |
| CR-3 P2 | 已修 | 单阈值 ≤315,900、>315,900 压缩后仍超即 FAIL；A1 完先 build+measure 再进 A2；回退换真减码三条 |
| CR-4 P2 | 已修 | 阈值只留一处；A3 步骤 4 要 B-229 追加本轮门/chunk/合计 |
| CR-5 P2 | 基本修 | 3 条单测（主路 / 不建目录 / 单份失败），36→39、910→913；负向对照红数见 P2-2 |
| CR-6 P2 | 已修 | `src/` 仅 4 文件、`docs/`/`.tmp/`/`shots/` 不受限；B-256 登记 deferred |

## P2（执行时按此写，不影响 PASS）
- **P2-1 三行放哪张表没写**：BACKLOG 分 P0/P1/P2（路线图）/Deferred 四节，B-253 在 P1 表末（`:132`）。写明 B-254、B-255 追加到 P1 表末、B-256 追加到 Deferred 表末，否则 P1 可能落进 P2 节。
- **P2-2 负向对照预期红数错**：`to` 改回 `oldHash` 时失败路径的「f2 新旧都在」变同一名、`('c') 1 行` 也红，共 **2 红**。改「预期 2 红，恢复 39/39」，或负向只锚主路一条断言。
- **P2-3 A3「磁盘 2 份前 8 位 = 新哈希」没有算法**：页面取不到 `revisionKeyHash`。改为断言两份同前缀且 ≠ 改名前后缀、第 3 份前缀与之一致；或页面 `await import('/src/lib/revisions.ts')` 现算。
- **P2-4 A3 的 gzip 通配不展开**：`gzipSync(dist/assets/MarginRail-*.js,…)` 直接给 node 会 ENOENT。写明 `Get-ChildItem …` 取 `.FullName` 再传；现 chunk 名 `MarginRail-CQzq6gd5.js`，rebuild 后会变。
- **P2-5 边迭代边写删**：A1 在 `for await (dir.entries())` 里 `create` 新名又 `removeEntry` 旧名，真 FSA 迭代期改目录行为未定义，可能漏迁。改为先收名单、循环外逐份迁移。
- **P2-6 死 import**：`revisionList.ts` 删 `findSnapshotsDir` 后 `CACHE_DIR`、`REVISIONS_DIR` 不再使用；tsconfig 无 `noUnusedLocals` 不会红，写明一并删。

方案无红线问题。B-229（门 + 常驻 chunk = 322,976，已超硬线）仍 open，口径待 lead 定，与本轮无关。
