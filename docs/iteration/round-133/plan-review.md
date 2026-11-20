# 第 133 轮计划审查（critic，revision 1 复审）

判定：**REVISE**。上版 CR-1…CR-5 基本落地（4 修 + 1 半修），但 A1 静态门与 A2 体积门各有一处照字面不成立，另 2 条 P2。修法机械，改完不必复审。

## 上版 CR 复核（本机实核）

- CR-1 ✅ `r101:454` 正是 `includes('只显示前 50')` 那条；脚本 57 个 `check(`，写 `shots/round-101/`。
- CR-2 ✅ 已写 close→400→`selectOption`→150→点开；`App.tsx:2210-2213` 确是 600 ms 防抖。残留见 4。
- CR-3 ⚠ 5 行（40/90/107/110/134）已收，但静态门写错：见 2。
- CR-4 ✅ HEAD 全仓该串只在 `MarginRail.tsx:1011`，无测试引用；改后应落 `reviewFiles.ts` + `.test.ts` 各 1 行。
- CR-5 ✅ 先跑 before + stash 兜底。

## 已核实（实跑）

- `node --experimental-strip-types src/lib/reviewFiles.test.ts` → **20/20 exit 0**，加 3 条 = 23。
- 缺陷真：`r131-finder.json` 的 `reviewGeom.truncatedNote`=「只显示前 50 篇」、`statusLive.afterClose` rows 49 +「只显示前 49 篇」；`reviewFiles.ts:104` 只换 rows、`truncated` 原样；`MarginRail.tsx:1011` 用 `rows.length`。
- 体积口径真：`reviewFiles.ts` 只被 `MarginRail.tsx:29` 与测试引用，MarginRail 在 `App.tsx:20` 的 `lazy()` 里 → 首屏 ±0 可信；dist 现为 `MarginRail-R13BmBTx.js` raw 22,282。
- 数字对：132 轮 `npm test` 948（计划 951）；r101 共 57 条。

## 漏洞

1. **P1｜A2 体积门在旧 dist 上跑，假绿**：第 5 步只写 `measure-first-screen.mjs --max 316400`，没有 `npm run build` / `npm run verify`（`verify` = build + measure，build 含 `tsc --noEmit && vite build && host-www`）。A1 改过 src 后 dist 未重建 → 首屏仍是旧 316,134、`dist/assets/MarginRail-*.js` 仍是旧 chunk（gzip9 7,878），计划要记的懒 chunk 增量量不到；新导出与 `Pick<…>` 的类型错也逃过 tsc。修：第 5 步先 `npm run verify`，build 后跑 `node scripts/measure-first-screen.mjs --max 316400`，再量**新** `dist/assets/MarginRail-*.js` 的 raw 与 gzip9，三数一起记。
2. **P1｜`DEFAULT_MAX_ROWS` 静态门字面不可满足**：`git grep -n DEFAULT_MAX_ROWS -- src` 改前 **7 行**（reviewFiles 5 + `src/lib/diffView.ts:30,58` 同名常量），改后 **2 行、exit 0**，不是计划的「改前 5 / 改后 0」。照字面判只能改名 diffView（越范围）或判失败。修：门改 `-- src/lib/reviewFiles.ts`（改前 5 / 改后 0、exit 1）；加对照 `-- src/lib/diffView.ts` 改前后都 2 行；再断 `git grep -n REVIEW_MAX_ROWS -- src/lib/reviewFiles.ts` = 5 行。
3. **P2｜测试 ② 说「比 ① 的返回值」，但 3 条是 3 个独立 `test()`，取不到**（拼模块级变量时 ① 断言失败会让 ② 拿到 undefined，连锁红）。修：② 里用同一函数重算 `reviewTruncatedNote(resultOf(rows50, true))` 当对照（仍只一个字面量），或把期望串提为模块级 `const`，① ② 都引用它。
4. **P2｜`.tmp/r101-tester-review.mjs:540-541` 也断「只显示前 50 篇」**：不在回归集，但谁跑谁红。修：同 r101 改一行（认「在审文件太多」+「最多显示 50 篇」），或在 test.md 明记「第 101 轮 tester 一次性脚本、不纳入回归」。

## 不判

- 懒 chunk 门 8,050（余 172）偏紧；真超了按实测记，红线是首屏 320,000。
- 49 行时「最多显示 50 篇」仍真，不必加「已隐藏 N 篇」（计划已列不做）。
