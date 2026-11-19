# 第 105 轮计划审查（critic，revision 1 复核）

审 `docs/iteration/round-105/plan.md` revision 1，对照上一版的 P0/P1 与 P2。HEAD `47c86b7`，工作树只有本轮报告目录未跟踪。

**结论：PASS。** 上一版 P0/P1 全部修掉，余 6 条 P2，不挡验收；按 `roles/critic.md` 不再复审第二轮。

## 一、上一版漏洞：已修（逐条复核）

| 原条目 | 状态 | 复核依据 |
| :--- | :--- | :--- |
| P0-1 口径与验收互斥 | 已修 | §5 #1 夹具改「a.md = 1 open + 1 resolved」→ 全结项 → 行不在；#2 补 f.md「1 in-progress + 1 open → 改 open 后行在 `open 0 · 共 2 条`」；#7 r103 原样 19/19。独核 r103 夹具：a=`[in-progress, open]`、T2 后 `[in-progress, resolved]`（`.tmp/r103-review-live.json` 的 `storeAfterT2`）、d=`[open,open,resolved]`、e=`[open]`——按 §3 口径全留列，不再互斥 |
| P1-2 门用硬线默认值 | 已修 | §5 #8 改 `--max 315250`；`scripts/measure-first-screen.mjs:21` 默认确为 320000（复跑 gzip **315,149**、headroom 4,851），门只剩 101 B |
| P1-3 口径未钉死 | 已修 | §3 定「至少一条未结项」并写依据；`review-mode/SKILL.md:108` 原文 “Only process annotations where `status` is `"open"` or `"in-progress"`”，边界「仅 in-progress 显 `open 0`」不判 FAIL |
| P2 记账/JSDoc/单测名 | 已修 | §1 首载 ≤322,029（超线 ≤2,029）+ §5 #8 要求三个数进报告；§4 #2 点名 `applyLiveReviewRow` JSDoc `:67-77`；§4 #6 写死三条新单测名 |

## 二、基线复核（自跑）

- 门 **315,149**（raw 1,022,459、files 3）；`MarginRail-D7n1Lqij.js` raw 18,990 → gzip9 **6,717**；门+chunk **321,866**（超硬线 1,866）。
- `reviewFiles.ts:142` 的 `annotations.length === 0` 恰 1；`hasUnclosedReview`/`liveClosed` 在 `src` 各 0；`isClosedReview` 在 `annotations.ts:66`；`applyLiveReviewRow` 产品调用点只有 `MarginRail.tsx:349`。
- 单测 `node --experimental-strip-types src/lib/reviewFiles.test.ts` **17/17**，+3 → 20/20；在 `package.json:15` 链上，第 104 轮 `npm test` 61 文件 **865 条** → 868 成立；其余 17 条夹具全是 open / in-progress，新口径无附带红。
- 回归：r101 夹具 a=`[2 open,resolved]`、sub/b=`[open,in-progress]`、批量 51 篇各 1 open → 全留列；⑨ 只断含「还没有在审的文件」，新文案保留 → 57/57 可期。`shots/round-101/`、`shots/round-103/review-live.png` 受版本控制，#7 的 `git checkout --` 能还原。

## 三、余留 P2（不挡验收，建议顺手带上）

- **P2-1 §1「净增 0」写死了**：改 `reviewFiles.ts` 会改 chunk 内容与 hash，入口里动态 import 的文件名跟着变，门抖几 B（第 102 轮实测 +9 B）。改「≈0，±100 内」。
- **P2-2 体积自检尾巴不自洽**：「315,149±100、余 ≥101」——若实测 315,249 则距 `--max 315250` 只剩 1 B。写成「gate exit 0 且 |实测−315,149| ≤ 100；报告写实测/净增/距硬线余量」。
- **P2-3 A2 #1 的「磁盘仍 open 1」只有机制推断**：600 ms 防抖是代码事实（`reviewFiles.ts:70`），但脚本未指定在 150 ms 读假 FS。补 `window.__vfs.files.get('.sidelight/annotations/a.json')` → `out.rows.t2.diskAt150`，断言仍含 `reviewStatus:'open'`，第三参删行才有物证。
- **P2-4 A2 #4 的「0 行」有前提**：#3 结束时当前篇 c.md 是 open；若注入第二工作区后当前篇没切走，`liveReviewRow` 会补一行。断言前先核 `activePath` 已换，或先打开 closed.md（全结项 → 不入列）。
- **P2-5 排序覆盖缩水**：`:209-235` 的 d.md（只有 resolved）出列后，collect 侧「open 0 排最后」不再覆盖。并进新「仅 in-progress 入列」单测（open 1 在前、open 0 在后）。
- **P2-6 文档口径会过期**：`reviewFiles.ts:5`「一篇有批注的文档」、`docs/CHANGELOG.md:24`、`docs/iteration/STATE.md:292` 的「在审 = 有批注档且 annotations 非空」都要改；收尾清单点名三处，并补 B-234 行（BACKLOG 现最高 B-233）。
