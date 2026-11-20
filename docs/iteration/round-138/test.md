# 第 138 轮 tester 独立验收：联网核对默认自动（B-266，新条，ID 待 lead 确认）

- 轮前 `b5b9486`；只验本 issue（队列第 3 条，快车道）。未读 `impl.md`、未复用执行方脚本，自写 E2E 从零复验。
- 判定：**PASS**（自写真机 21/21，0 pageerror / 0 console error；两条门禁、2 条回归全过）。
- 要求：配了搜索 Key 时分析结束**自动**核对出处，不再手点卡片按钮。

## 验收标准与结果

| # | 标准（从 issue 与代码事实推出） | 结果 | 证据 |
| :--- | :--- | :--- | :--- |
| 1 | 有搜索 Key：分析结束自动发搜索请求，0 次手点 | PASS | A3：3 卡 → 3 次请求、`clicks:0` |
| 2 | 卡片过程态「核对中…」→ 成功后出处列在卡上 | PASS | A2/A6：3/3 卡各 1 条出处（链接 + 标题） |
| 3 | 成功后不再留「联网核对」按钮（不用手点） | PASS | A7：按钮只剩 知道了/采纳/忽略/追问 |
| 4 | 并发上限 2，不把搜索服务打满 | PASS | A4：`peak=2`，18 个采样全程 ≤2 |
| 5 | 搜索词 = 原文 + 批注（截 200 字），自动/手动同口径 | PASS | A5：3 条 query 与卡片逐字相等 |
| 6 | 不阻塞正文：搜索没回来时分析按钮已可用 | PASS | A9：采样里 `analyzing=false` 且请求未回 |
| 7 | 失败 / 没搜到留「重新核对」，且有错误提示 | PASS | B1–B4（500：3/3 卡「重新核对」+ toast「搜索服务暂时不可用（500）」）、B5（空结果同） |
| 8 | 没配搜索服务：跳过自动核对、0 请求、按钮仍 disabled | PASS | C1/C2：等分析完 + 1.6 s 仍 0 请求 |
| 9 | 搜索仍是惰性 chunk（不进首屏） | PASS | A10：分析前 0 次 `/search` 加载，自动核对后 1；`dist` 主包无 `api.tavily.com` |
| 10 | 全量门禁 | PASS | 见下节 |

## 门禁（全量）

- `npm run verify` exit 0 **PASS**：`gzip=315,611`（硬线 320,000，余 4,389；内部 310,000 超 5,611 只 WARN）；常驻 `MarginRail-DANUDNjd.js` gzip9 **7,838**；`real=323,449`（超硬线 3,449，归 **B-229**，仍 `open` 只记）。重建后 `node scripts/measure-first-screen.mjs` 复测同三数。日志 `.tmp/r138-tester-verify.log`。
- `npm test` exit 0：**70 文件 968 条 0 fail**（基线 69/955；+`autoVerify.test.ts` 13 条）。日志 `.tmp/r138-tester-npm-test.log`。
- `roundtrip` 未跑：未动编辑器/序列化。

## 独立复验（自写脚本，从零）

`.tmp/r138-tester-auto-verify.mjs`（ego CDP 57270、1440×900、先 `node .tmp/reset.mjs 57270`；无 AI Key 走本地 mock 分析流，页面内装假 `fetch` 只拦 `api.tavily.com`，记录 query/时间/并发；从不点核对按钮）→ **21/21、0 pageerror / 0 console error**，`.tmp/r138-tester-auto-verify.json`、采样 `.tmp/r138-tester-samples-A.json`、截图 `shots/round-138/tester-auto-verify-sources.png`、`tester-auto-verify-retry.png`。

- A（有 Key）：分析 3 卡 → 3 次 tavily 请求（`peak=2`，第三条等前两条之一回来才发）→ 每卡 1 条出处；「核对中…」出现后消失；query 与 `原文 + 批注` 逐字相等。
- B（500 / 空结果）：3/3 卡留「重新核对」、0 出处、toast 500；请求仍自动发 3 次。
- C（`searchProvider:'off'`）：分析完成 + 1.6 s 采样内 0 请求，3/3 卡仍「联网核对」且 `disabled=true`。

## 静态与负向

- `src/App.tsx`：`autoVerify(freshTargets)` 恰 1、`void runVerifyPool(targets, VERIFY_CONCURRENCY` 1、`await runVerifyPool(` 0；静态 import `./lib/search.ts` **0**（exit 1）、动态 import **1**；`verifyingId` 全 src **0**（exit 1）；`verifyStates` App 3 / MarginRail 5。
- `dist/assets/index-BJauMajl.js` 不含 tavily/bocha 端点与搜索错误文案；`search-8fcoEbWG.js` raw 2,090 含 tavily 端点 → 首屏不带搜索。
- 负向：`VERIFY_CONCURRENCY 2→3` → 并发测试 **1 红 exit 1**；SHA256 `34F37A29…` 还原后 **13/13 exit 0**。日志 `.tmp/r138-tester-negative.log`。
- `autoVerify.test.ts` 13 条：query 截断/去重/池子限并发/单条抛错不打断/接线静态门。

## 回归

- `.tmp/e2e-r97-a1-status.mjs`：**44/44**（批注四态、卡头、存盘；跑后 `git checkout -- shots/round-97/` 已还原）。
- `.tmp/e2e-r79-a3-note-actions.mjs`（`SIDELIGHT_CDP=57270`）：**7/7**，卡底三钮 54/42/66×24 不变。

## 观察（不判 FAIL，交 lead 定 P2）

同一批内容**重跑分析**时，`replaceInWindow`（`src/lib/annotations.ts`）按既有设计复用旧条目的 `sources`；自动核对仍重搜一遍，若这次失败，失败态被旧出处挡住（不显示「重新核对」，只弹 toast）。记录 `rerunCalls=3`、`cardsWithSources=[1,1,1]`。手点时代同样保留出处，不属本轮验收项，只记行为。

## UNVERIFIED

- 真实搜索服务与真实模型（无 Key；E2E 用页面内假 fetch 与本地 mock 分析流）。
- 中止分析不自动核对分支（代码 `if (!controller.signal.aborted)`；E2E 未构造中止，只静态核对）。
- 真 WebView2 宿主、真实中文 IME。
