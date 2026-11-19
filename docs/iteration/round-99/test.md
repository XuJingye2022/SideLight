# 第 99 轮测试报告（tester 独立验收，未读 `impl.md`）

结论：**PASS**。B-226 修订快照与批注迁移（用户 2026-11-20 队列第 6 条）。

环境：dev `http://localhost:5175`（未重启）；ego 浏览器 CDP 57270、1440×900；CDP 9222–9226 无监听。E2E 为 tester 自写 `.tmp/r99-tester-a.mjs`（本文件内建假工作区/假 FSA，未复用交付脚本与交付 JSON）。

## 门禁（各跑一次）

- `node --experimental-strip-types src/lib/revisions.test.ts`：`tests 24 / pass 24 / fail 0`（≥16 达标）。
- `npm test`：**59 文件 834 条 0 fail**（轮前 58/810，+24 全来自 `revisions.test.ts`；`.tmp/r99-tester-npmtest.log` 为 UTF-16LE，逐 suite 求和）。
- `npm run build` exit 0；`npm run verify` exit 0，首屏 gzip **314,726 B**（raw 1,020,054，距硬线 320,000 余 5,274，超内部 310,000 4,726 只 WARN）；`node scripts/measure-first-screen.mjs --max 315500` **PASS exit 0**（headroom 774）。日志 `.tmp/r99-tester-{build,verify}.log`。
- 静态门 `git grep -n --untracked -E 'migrationOf|pruneRevisions' -- src`：HEAD `4182ed2` 树 **0 行 exit 1** → 工作树 **21 行 / 3 文件**（`App.tsx`、`revisions.ts`、`revisions.test.ts`）。任务文本的全门（含 `digest`）改前实为 **2 行**——`src/lib/trash.ts:77-78` 的 `crypto.subtle.digest`——改后 30 行；「改前 0」只对窄门成立，不判 FAIL。
- `git diff --stat` 只有 `docs/iteration/BACKLOG.md` / `package.json` / `src/App.tsx`，**不含 `src/styles.css`**。
- `impl.md` 4,086 B ≤4 KB；实现未改 README/CHANGELOG（CHANGELOG 由 tester 收尾补第 99 轮小节）。

## 验收（`.tmp/r99-tester-a.mjs` **32/32 PASS**、0 pageerror，`.tmp/r99-tester-a.json`）

- S1 快照：分析出恰 1 张卡；打 1 字后 `Ctrl+S` 前 `a.md` **0 write**、revisions **0 个**；保存后 1 次 write，1.6 s 后 `.sidelight/revisions/` **恰 1 个 json**——`v==1`、`key=='a'`、id `bb3fc423` 8 位十六进制、`bytes 73 == a.md 磁盘 73 B`、7 字段且**无 body**、`annotations[0].quote` 与卡片逐字相等。无改动再存：提示「没有改动，未写入。」、仍 1 个 json / 1 次 write。
- S2 迁移：基线 `from/to = 1/23`。① 源码框引文前插 1 字退出 → 仍 1 卡、`from/to` **各 +1（2/24）**、`.annot` 仍盖住引文、正文段首确有 `X`；② 引文内同长替换（delta=0）→ 引文失配（正文有 `甲` 无旧引文，卡片引文仍旧）但 `from/to` **不变（2/24）**、`.annot` 仍在；③ 删整段（含 `\n`）→ `.note` **0 张**、`.annot` 0、store `annotations` 0 条（迁移守卫生效，不掉位置）。
- S3 保留：连存 10 次（每次改 1 字、逐次等写盘与快照落地）→ 该 key 快照数 `[2,3,4,5,6,7,8,8,8,8]`，**末态 8 份且全为 key `a`**；10 次保存 10 次 write。
- 截图 `shots/round-99/annotations-migrated-tester.png`（S2① 迁移后 `.note` 与正文 `.annot`）。

## 回归

- `.tmp/r98-tester-agent.mjs`（批注线程 `[AGENT]`/四态）：**38/38**、0 pageerror。
- `.tmp/e2e-r97-a1-status.mjs`（四态复核状态）：**44/44**、0 pageerror。

## 偏差与边界

- 全门静态「改前 0」与实测 2 不符（见上），只是口径问题，产品改动确实落地（窄门 0→21）。
- 真实 FSA 写回 / WebView2 宿主 / 原生打印未跑（环境类，沿用既有口径）；假 FSA 的 revision 目录 `entries()` 由脚本内建实现，行为与 `cache.test.ts` 同形。
- 未独立复验：首次保存（`saveIntoWorkspace`）与「另存为」两条路不记快照（BACKLOG B-226 行记为实现已知语义）；快照写盘异常被吞的可见性。
