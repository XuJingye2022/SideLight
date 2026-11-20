# 第 123 轮独立验收（tester）

未读 `impl.md`。轮前 startSha `dcc31f1`；dev `localhost:5175`；真机 ego CDP 57270。任务来自 `plan.md` A1–A3。
判定：**PASS**（1 条偏差不判 FAIL，见 §5）。

## 1. A1 迁移纯函数 + 单测（B-254）

- `node --experimental-strip-types src/lib/revisions.test.ts` → **tests 39 / pass 39 / fail 0**（`.tmp/r123-tester-*`，计划基线 36/0 出自 plan，改前值未独立重测）。
- 负向（主路靶点改回旧哈希）：把 `revisions.ts:264` 的 `newHash + name.slice(...)` 改成 `oldHash + …` → **tests 39 / pass 37 / fail 2，exit 1**；红的是「旧键的三段名逐份搬到新键」与「单份写失败/单份删失败都不抛」两条。拷回备份后 SHA256 `DC61861D…` 与改前逐字节相同、**39/39 exit 0**。
- `findSnapshotsDir` 只在 `src/lib/revisions.ts:206` 定义 1 处，`revisionList.ts:4` import、`:46` 调用（副本已删，0 重复）。
- 迁移语义抽查：只换文件名（`newHash + 旧名截掉 8 位前缀`），JSON 不重写；同哈希提前返回 0；`entries()` 失败回 0；逐份 try/catch，写删都成才 +1。E2E 的后缀逐字取证见 §3。

## 2. A2 接线 + BACKLOG 登记

- `git grep -n migrateRevisions -- src/App.tsx` → **2 行**（`:81` import、`:3049` 调用）；`-- src` → **3 文件 / 9 行**（App.tsx、revisions.ts、revisions.test.ts）。
- 调用点在 `handleRenamedFile` 的缓存迁移 `try` 内、draft/annotations 循环之后，`dir` 同源（`parentDirectory(space, oldFile.path)`），`useCallback` deps 未加。
- `git diff --stat -- src` → **4 文件**（App.tsx / revisionList.ts / revisions.ts / revisions.test.ts），`styles.css`、`README.md`、`AGENTS.md` 0 改动。
- BACKLOG：**B-254 open → B-255 open → B-256 deferred** 三条 ID 连续、无重号；B-229 已追加第 123 轮复测值，与我复测逐字同（§4）。
- `npm test` → **64 文件 / 913 条 / 0 fail**（逐文件 64 个 `ℹ tests` 求和 913，非零 fail 文件 0）。

## 3. A3 E2E（改名后快照跟着换键）

脚本闸门：`.tmp/e2e-r123-finder-rename-snap.mjs`、`.tmp/e2e-r78-a2-rename.mjs`、`.tmp/r114-tester-e2e.mjs`、`.tmp/r114-tester-e2e.json` 全部 `Test-Path` True。
`node .tmp/reset.mjs 57270` → `node .tmp/e2e-r123-a1-rename-snap.mjs` → **12/12 PASS，exit 0，pageErrors 0**（`.tmp/r123-a1-rename-snap.json`、`.tmp/r123-tester-e2e-a1.log`）：

- 改名前三份？不：磁盘恰 **2** 份（`2b24d044-mwoo1vj4-8b139b9d`、`2b24d044-mwoo1x0u-0f524d3d`），面板 2 行、`snapEmpty:null`。
- a.md→c.md 后：当前文档 c.md、toast「已重命名：a.md → c.md」、树 `["b.md","c.md"]`。
- 磁盘 2 份前缀换成新哈希 `7729c516`（= `revisionKeyHash(cacheKey('c.md'))`），旧前缀 `2b24d044` **0 份**；后缀 `-mwoo1vj4-8b139b9d.json` / `-mwoo1x0u-0f524d3d.json` 前后**逐字同**。
- 改名后**重开**面板：`snaps.length===2`、`snapEmpty===null`（两行 `11-20 15:37:13 · 82 B`、`15:37:11 · 79 B`）。
- 再存一次：面板 **3** 行、磁盘 **3** 份且全为新前缀。
- 截图 `shots/round-123/revision-snap-after-rename.png`（1440×900，12/12 那次运行重写，63,310 B）：面板「修订快照」两行 + toast 同屏。

## 4. 体积与 B-229 口径

- `npm run build`（verify 内）exit 0；`node scripts/measure-first-screen.mjs` → **PASS**，gzip **315,685 B**（raw 1,024,416、files 3、headroom **4,315**；内部预算 310,000 超 5,685 只 WARN）。对第 122 轮 315,559 **净 +126 B**，≤ 本轮阈值 315,900 ✓。
- `MarginRail-BOWUh__F.js` gzip9 = **7,416**（raw 21,053）。B-229 口径 **315,685 + 7,416 = 323,101**（超硬线 **3,101**，仍 `open`，只记）。BACKLOG 里已写的 315,685 / 7,416 / 323,101 与我实测逐字相同。

## 5. 偏差 / 回归 / 未验

- **偏差（不判 FAIL）**：A1 负向按计划应「只主路 1 红」，实测 **2 红**。因「单份写失败」用例把 `failWrite` 键在新哈希名上，靶点改回旧哈希后该注入点永不命中、f1 被写回自身再删掉，此条一并转红。tests 仍能锁住回归，恢复后 39/39。
- 环境偏差（已处理）：`e2e-r78-a2-rename.mjs` 结尾 `browser.close()` 把 57270 唯一标签页关掉，随后 `r114-tester-e2e.mjs` 第 38 行 `page.on` 报 `undefined`；用 CDP `Target.createTarget` 重开 5175 后再跑，**27/27**。
- 回归：`.tmp/e2e-r78-a2-rename.mjs` **11/11**（toast 含「已重命名／b.md／c.md」且不含「已刷新」、保存写 c.md、b.md 键不存在、0 页面错误）；`.tmp/r114-tester-e2e.mjs` **27/27**（快照清单 8 行降序、空目录不建、关面板不留过期行、两档无横溢）。
- `roundtrip` 未跑（未动编辑器/序列化）。
- UNVERIFIED：真 WebView2 宿主与真实 FSA 下的改名迁移（验收按假 FSA）；B-256 的「保存→立刻改名」竞态只有代码阅读，本轮 E2E 按计划在保存后停 1.6 s。
