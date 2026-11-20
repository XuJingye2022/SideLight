# 第 124 轮独立验收（tester）

**结论：PASS**。A1（B-257 保存成功后递增 `revisionEpoch`、在审面板开着时重读快照清单）从零复验成立；A2 体积净增与回归全在阈值内。未读 `impl.md`。

## 环境
- dev `http://localhost:5175`（HTTP 200，未重启）；真机 ego 浏览器 CDP **57270**（9222–9226 无监听），1440×900，`node .tmp/reset.mjs 57270`。
- 轮前 `startSha=ff22b67`；`git status` 改前只有本轮 4 个文件。

## 门禁（各跑一次）
- `npm test`（`.tmp/r124-tester-npmtest.log`）：**65 文件 917 条 0 fail**（逐文件 `ℹ tests` 求和 917、`ℹ pass` 块 65、`fail 0`）；基线由 HEAD package.json test 链 **64 文件** + 本轮新门 4 条 = 913，重合计划。
- `npm run verify`（`.tmp/r124-tester-verify.log`）：**exit 0 / PASS**，`total raw=1024494 gzip=315726 headroom=4274`。阈值 ≤315,845 ✓（本口径 +52）。
- 改前基线：在 `ff22b67` 的独立 worktree（`.tmp/r124-base`，node_modules 用 junction，测完已删）重建 **gzip 315,674**、`MarginRail-*` raw 21,053 / **gzip9 7,414**（`.tmp/r124-tester-base-verify.log`）。注：第 123 轮 tester 同 commit 记 315,685 / 7,416，差 11 B / 2 B 属构建非确定性；两种口径净增都是 +41~52 B、+79~81 B。
- 常驻 chunk 现名 `MarginRail-CsQwh5S0.js`：raw **21,269** / gzip9 **7,495** → ≤7,816 ✓（+81 B）。
- 硬线 320,000 不破（315,726，余 4,274）；B-229 口径合计 **323,221**（超硬线 3,221，仍只记、不修）。
- `roundtrip` 不跑（未动编辑器/序列化）。

## A1 静态与接线
- `git grep -n --untracked revisionEpoch -- src`：HEAD **0（exit 1）** → 现 App.tsx **2 行**（`:495` 状态、`:6048` 传参）+ MarginRail **8 行**（`:70` Props、`:141` 解构、`:325` `loadedEpochRef` 初值、`:394` 注释、`:399-400` effect 判据与同步、`:402` deps、`:414` openReview 同步）+ `revisionRefresh.test.ts` 命中。
- `reviewRunRef.current += 1` 仍 3 处（`:335` 切页签、`:344` 换文档、`:365` 关面板），**epoch 路径 0 处**。
- `git diff --stat`：`src/App.tsx` +11/−1、`src/components/MarginRail.tsx` +26/−2、`package.json` 1 行（test 链尾加 `revisionRefresh.test.ts`）；`src/styles.css` **0 行**；新测试文件未跟踪（`git add -A` 前）。test 链 64→**65**。
- 语义复核（读源码 `MarginRail.tsx:314-423`）：effect 早退条件 = 代际没变或面板未开；`openReview` 现读后同步 `loadedEpochRef`，故开面板不重复读（E2E ④ reopen scanDelta 1 佐证）；epoch 只 `loadSnapshots(reviewRunRef.current)`，不推进 `reviewRunRef`、不触 `reviewBusy`。

## A1 负向（改后代码上做，SHA256 备份后还原）
`.tmp/r124-tester-negative.log`；三条各 **exit 1、恰 1 个测试红**：① 去掉 `!reviewActive` 早退 →「面板没开着就不许读目录」；② 去掉写回前的 `snapSeqRef.current === seq` →「写回前的判据也要含 snapSeqRef」；③ `if (id)` 改无条件 →「递增要受 if (id) 守卫」。还原后两文件 SHA256 与备份相同（App `6B8FC124…`、rail `9A695598…`），`revisionRefresh.test.ts` **4/4 exit 0**（`.tmp/r124-tester-gate-green.log`）。

## A2 真机 E2E（自写脚本，未复用交付脚本）
`.tmp/r124-tester-e2e.mjs`（ego CDP 57270、1440×900、假 FSA 计 `.sidelight/revisions` 的 `entries()`、假 fetch、autoSave 开、自造 a.md）→ `.tmp/r124-tester-e2e.json`：**11/11 PASS、0 pageerror**。
- 闸门：dev 交付模块含 `const [revisionEpoch, setRevisionEpoch] = useState(0)`、`const id = await writeRevision(`、`snapSeqRef`/`loadedEpochRef`、`[revisionEpoch, reviewActive]`。
- 打 1 字立刻开「在审」：`reviewImmediate` = snaps **0**、空态「保存一次后才会记录。」、disk 0、panelOpen true ✓①。
- 等磁盘快照 >0（≤8 s，实测随 2 s 自动保存落地）后等面板行数追上：`reviewLater` = snaps **1 === diskRevisions 1**、`snapEmpty null`、panelOpen true、toast「已保存 a.md」、`busy false`（无「正在读…」卡死）✓②。
- `.sidelight/revisions` 的 `entries()` 计数：immediate **0** → later **2**，恰 **+2**（写侧 1 + epoch 重读 1）✓③。
- 关面板后改 1 字 `Ctrl+S`：写侧 scan **+1**、快照 **+1**（无后台重读）✓④前半；重开面板 scan **+1**、行 **2 = 磁盘 2** ✓④后半。
- 0 pageerror ✓⑤。
- 截图 0 张：本轮无界面改动，不占配额。

## 回归
- `.tmp/r114-tester-e2e.mjs`（快照清单 14 例）：**27/27**，0 pageerror（`.tmp/r124-tester-reg-r114.log`）。
- `.tmp/e2e-r101-review.mjs`（在审文件列表）：**57/57**（`.tmp/r124-tester-reg-r101.log`）。
- 前置：`reset.mjs` 关页后需先开一张 5175 页（用 `.tmp/r124-open-page.mjs`），否则旧脚本 `ctx.pages()[0]` 为 undefined（既有脚本前提，非产品问题）。

## 偏差（不判 FAIL）
- 任务书「MarginRail 4 行」是估算：实际 8 行，多的是注释行、effect deps 行与两处 `loadedEpochRef.current = revisionEpoch`；计划 §3 本身就要求这些改动。
- 门/块基线 11 B / 2 B 与第 123 轮记录不同（同 commit 重建），净增仍远低于 +160/+400。

## UNVERIFIED
真 WebView2 宿主、真实 FSA（本轮全假 FSA）、真实中文 IME；CDP 9222–9226 无监听，真机走 ego 57270。B-257 的“首次保存不记快照”属 B-226 既有边界，本轮未扩范围。
