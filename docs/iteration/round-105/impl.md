# 第 105 轮执行报告（executor）

- round=105，startSha `47c86b7`（=HEAD），单轮 A / 2 任务，回滚 **0** 条。范围 B-234（`round-102/findings-bug.md` F4，P2）。
- 口径（计划 §3）：在审 = 至少一条批注是 open 或 in-progress；全部结项的文档不入列；行文案仍是 `open N · 共 M 条`，N 只数 open。

## A1 修：全结项不入列 — DONE

文件 3 个（`git diff --stat` 只这 3 个源文件）：`src/lib/reviewFiles.ts`、`src/components/MarginRail.tsx`、`src/lib/reviewFiles.test.ts`。

1. `reviewFiles.ts`：import 加 `isClosedReview`；新导出 `hasUnclosedReview(a)`（`:78`）= `a.some((x) => !isClosedReview(x))`；`:163` 的 `store.annotations.length === 0` 改为 `!hasUnclosedReview(store.annotations)`。
2. `applyLiveReviewRow(result, live, liveClosed = false)`：`live` 空或 `total===0` 原样返回；`liveClosed` 真时 filter 掉同 path 行后直接返回（不 push / 不重排 / 不回填第 51 行 / `truncated` 不动）；JSDoc 与 collect 注释同步新口径。
3. `MarginRail.tsx:355-357` 第三参 = `annotations.length > 0 && !hasUnclosedReview(annotations)`；`:859` 空态改「还没有在审的文件：有未结项的批注才会出现在这里。」
4. 单测改 3 条（旧档全结项不入列、排序去掉 d.md、合并注释改「只剩 in-progress」）、新增 3 条（全 wont-fix 不入列、仅 in-progress 入列且 open 0 并覆盖 open 降序、liveClosed 删行含不回填第 51 行）→ **20/20**。

静态门（改前→改后）：`git grep -c 'annotations.length === 0' -- src/lib/reviewFiles.ts` **1 → 0（exit 1）**；`git grep -n 'hasUnclosedReview' -- src` **0 → 4 行 / 2 文件（-c 各 2）**；`git grep -n 'liveClosed' -- src/lib/reviewFiles.ts` **0 → 3 行**。

## A2 证：真机 + 体积 + 回归 — DONE

脚本 `.tmp/e2e-r105-review-closed.mjs` → `.tmp/r105-review-closed.json`：**43/43 pass**、0 pageerror；ego CDP 57270、1440×900、假 FSA；截图 `shots/round-105/review-closed.png`（新空态）。

- T1：a=1 open+1 resolved 改 resolved → 150 ms 时磁盘 a.json 仍是 `["open","resolved"]`（**316 ms** 画出行，< 600 ms 防抖）→ a 行不在、剩 c/f/b；停 1,800 ms 仍不在；冲刷后重开仍不在。
- T2 仅 in-progress 的 b 行 `open 0 · 共 1 条`；T3 f=in-progress+open 改 open→resolved 后 `open 0 · 共 2 条`（1,800 ms 后同）；T4 c：`open 1 · 共 3 条` → 改 resolved 不在 → 改回 open 又在。
- T5 Esc / 关闭钮 / 背板三路关闭、焦点回入口、1024×700 sheet 无横溢；T6 第二工作区（closed.md=resolved+wont-fix）0 行且空态文案逐字。
- 排序 open 降序 + path 升序、aria-current 只在当前篇行；全程 0 横向溢出。

体积：`measure-first-screen --max 315250` **PASS**，门 gzip **315,153 B**（计划 ±100 内，+4；距该门 97、距硬线 4,847）；`npm run verify` 同值 PASS。`MarginRail-tZSn7MSg.js` raw 19,086 / gzip9 **6,762**。真实首载 = 315,153 + 6,762 = **321,915**（计划 ≤322,029；超硬线 1,915，**B-229 仍 open**）。

门禁：`npx tsc --noEmit` exit 0；`npm run build` exit 0（镜像 www 98 文件）；`npm test` **61 文件 868 条 0 fail**（865→868）；`roundtrip` 未跑（不动编辑器/序列化）。

回归：r101 原样 **57/57**、r103 原样 **19/19**；跑完 `git checkout -- shots/round-101/` 已还原。

## CHANGELOG 建议

- 在审文件列表只列还有未结项批注的文档：全部结项的文档不再入列，空态文案写明口径。

## 交给 lead/scribe

plan-review P2-6：`docs/CHANGELOG.md:24`、`docs/iteration/STATE.md:292` 的旧口径句与 BACKLOG 的 B-234 行（现最高 B-233）未改；`reviewFiles.ts:5` 注释已改。

## 新踩坑（2 条）

1. 列表顺序按 `compareRows` 真算：open 全 0 时 path 升序是 b→f；前面步骤还会改 open 数（T3 后「c/f/b」变「c/b/f」）。
2. 脚本的 `check(...)` 省略 detail 时 `JSON.stringify(undefined).slice` 抛 TypeError 中断整轮；helper 要 `detail ?? null`。
