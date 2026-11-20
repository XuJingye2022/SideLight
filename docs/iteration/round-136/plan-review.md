# 第 136 轮计划审查（critic，revision 1）

结论：**PASS-WITH-NOTES**（按规则不再复审；下列 3 条 P1 必须在执行时落地，不改任务拆分）。

## 一、上一版漏洞：已修
- CR-1：R4 砍到下一轮；§4 写明外壳与状态留 MarginRail。核对 `#rail-panel-chat` 在 `MarginRail.tsx:854`、`:276/:324` 的 `getElementById` 在，约束成立。
- CR-2：A1 只报告 + WARN，`--real-max` 不进默认链；我实测默认 `npm run verify` exit 0。`ci.yml:39`、`release.yml:82/155` 直接跑 measure，默认 `--max 320000`，本轮不会红。
- CR-3：`chat.test.ts` 实为 **8** 处读 `MarginRail.tsx`（`:166/:205/:232/:257/:305/:353/:423/:527`），`:325` 是 `assert.ok`；计划清单正确。R3/R4 砍掉后另 4 个静态测试本轮不受影响。

## 二、数字全对（复跑）
- 门 316,131（305,534+10,147+450）、raw 1,025,609、headroom 3,869、exit 0。
- `MarginRail-mKbKnT4r.js` raw 22,721 / gzip9 **7,999**；真实首载 **324,130**，超线 **4,130**。
- lead 简报的 320,615 是第 101 轮旧数；本轮按 4,130 缺口。
- `npm test` 69 文件 955 条；`App.tsx:109/:131/:1988/:2001/:5268-5269/:6108`、`MarginRail.tsx:20/:443/:461`、`reviewFiles.ts:39/:50/:55/:139-188` 均存在。

## 三、新漏洞（3 条 P1）
**CR-6（P1）A1 常驻口径在 A2 后会漏算新共享 chunk。** `reviewScan.ts` 静态 import `reviewFiles.ts`，后者仍被 MarginRail 静态 import → rollup 提成共享 chunk（dist 现有 30 个，如 `mermaid-parser.core` 被 14 个 import）。MarginRail chunk 会静态 import 它、首载即下载，而 `RESIDENT` 只认 `MarginRail-*` → 真实首载低估，A3「real ≤320,000 才翻」会被假数蒙过。
修法：`RESIDENT` 改成「MarginRail chunk + 其静态 import 传递闭包（排除入口三文件）」，逐文件 gzip9 并打印清单；验收对拍现 dist 仍须 `resident=7999 / real=324130`；A2 后一律按新口径报三数。

**CR-7（P1）`openReview` 没有 catch，计划写的「沿用 catch」不成立。** `MarginRail.tsx:453-465` 是 try/finally；动态 import 失败＝unhandled rejection，会打红 A3 的 0 pageerror。
修法：补 `catch {}`（面板空态，finally 仍清 busy）；验收加 `page.route('**/reviewScan-*.js', abort)` → 点「在审」后 busy 消失、空态、0 pageerror。

**CR-8（P1）同轮快车道与 A2 改同一函数。** 「联网核对默认自动」改 `verifySources`（`App.tsx:1988-2013`，A2 动 `:2001`），B-253 动 `App.tsx`/`styles.css` 的 `appDialogOpen` 区；§4 只写「串行」，没定序、没留证据，A3 的 E2E ① 会测到未提交改动。
修法：A2 先 commit、快车道后跑并开工前重读；`impl.md` 记 `git log --oneline -1` 与 `git status --porcelain`；E2E ① 固定走手动「联网核对」路径。

## 四、备注（不阻塞）
- §2 漏了 A2 也要搬的 `asset.ts`：−900 / −700 / 约 −500，实测或 −1,700~−2,200，仍 >320,000。
- `measure-first-screen.mjs:19` 的 positional 已跳过 flag 值，`--real-max` 不必再改那句。
- 25 分钟偏紧：A3 的 E2E ③ 属 R4 验收（本轮没动 chat），建议砍掉、只留 ①②。
- 翻转时 `--no-resident` 必须仍能复旧口径。
