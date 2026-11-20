# 第 119 轮独立验收（tester）

判定 **PASS-WITH-UNVERIFIED**（真宿主 / 中文 IME / 原生打印未跑，计划未要求）。轮前 startSha `83a70f2`。只做 BACKLOG **B-249**（App 级对话框开着时右侧「对比 / 在审」只读面板让位），未读 `impl.md`，按任务书从零复验。

## A1 改法 + 静态门

`git diff --stat` 4 文件 30+/6−：`App.tsx` +14（渲染期谓词 `appDialogOpen` **10 态**含 `hostDraftPrompt !== null` + `<MarginRail appDialogOpen={…}>` 1 处）、`MarginRail.tsx` +10/−5（Props/解构各 1、`diffOpen`/`reviewActive` 各加 `&& !appDialogOpen`、portal 条件改 `{diffData !== null && diffOpen &&`、`docName` effect 加 `setDiffData(null)`）、`package.json` test 链尾 +`railModalGate`、`BACKLOG.md` +5 行；`styles.css` 0 改动，`dialogOpen`/deps/z-index/Esc 次序未动。

静态（tester 自写 node 断言，注释先摘）：`const appDialogOpen` / `appDialogOpen =` / `appDialogOpen={appDialogOpen}` 各 **1**、谓词 10 态全在；MarginRail Props 1 / 解构 1 / `!appDialogOpen` **2**、portal 与 docName 正则命中；**HEAD 两文件 `appDialogOpen` 0**（正对照）。新门 `railModalGate.test.ts` 在 `npm test` 里 **6/6**；负向删 `diffOpen` 的 ` && !appDialogOpen` → **5 pass / 1 fail exit 1**，备份写回后 **6/6** 且 stat 仍 +10/−5。

## A1 before / after（ego CDP 57270、dev 5175、1440×900 + 1024×700）

**before**（`git stash` 切回旧码、dev 模块 `appDialogOpen` 计数 0 后跑，`pop` 复原）**7/7、0 pageerror / 0 console error**：确认框出现时 `.rail-diff-overlay` **1**、`#root` **inert**、焦点 `BUTTON.rail-diff-close`、Tab 4 次都停同一钮且都不在框内、Esc 只关面板→确认框才现身且焦点 `BODY`。

**after** **34/34、0 pageerror**（`.tmp/r119-a1-after.json`）：B 段无工作区 `.rail-review-open` → `Control+P` → `.rail-diff-overlay` **0**、`.quick-open-backdrop` **1**、焦点 `.quick-open-input`；Esc 在审面板回、空态 = `MarginRail.tsx:918` 原文、焦点在 sheet；再 Esc 收起。注入假工作区点 `c.md`（干净）打「甲」→ `.rail-diff-open` → `Control+Alt+N`：overlay **0**、**K** 成立（`.dialog` 可见 + 焦点在框内 + `#root` 无 inert）、文案含「这篇还有没保存的改动」、中心 `elementFromPoint` 命中 `DIV.dialog`、Tab 5 次全在框内且三钮都到过；Esc → `.dialog` 0 + `.rail-diff-sheet` 1 + 焦点在 sheet；再 Esc → 面板 0 + inert 0 + 焦点 `.rail-diff-open`（非 BODY）。C 段自动保存先落、600 ms 计数稳定 → `Control+s` → 3 s 内 `write:c.md` **1→2 恰 +1**、假盘含「甲乙」、`.toast-text` 含「已保存」、picker 0。1024×700 抽屉（`.app.rail-open` 1 / `.rail-backdrop` 1）→ `Control+Alt+N`：K 成立、overlay 0；既有 z 序 `{overlay:"40", railBackdrop:"44", marginRail:"45"}` 只记（B-253）；等焦点在「取消」→ Enter → sheet 回、焦点在 sheet、0 pageerror。截图 `shots/round-119/confirm-over-diff.png`（73,485 B）、`shots/round-119/diff-back-after-cancel.png`（41,192 B）。

## A2 门禁、体积三数、回归、impl/BACKLOG

- `npm test` **63 文件 903 条 0 fail**（基线 62/897，含新门 6 条）。
- `npm run verify` **exit 0 PASS**；`measure-first-screen --max 315800` 连测两次均 **315,542 B**（raw 1,023,808、files 3、headroom 258）。常驻 `MarginRail-DSGFlalk.js` raw 20,999 / gzip9 **7,398**；B-229 合计 **322,940**（超硬线 2,940，仍 `open`，只记）。对轮前（`.tmp/r118-tester-verify.log` 315,509 + 第 118 轮 chunk 7,391）：净 **+33 / +7 / +40**，≤291 过兜底（impl.md 写「净增 40」是合计口径，不判偏差）。
- 回归（同一面板）：`.tmp/e2e-r100-diff.mjs` **43/43 PASS、0 pageerror**，跑后 `shots/round-100/` 已还原。
- `impl.md` 3,573 B ≤4 KB：含 before 7/7、after 34/34、三数 315,542 / 7,398 / 322,940 + 净增 40、`UNVERIFIED`、未入谓词两处理由（`TreeActions.tsx` 删除确认不可达；`exportOpen`/`menuOpen` 被 z 60 压住只记）。
- BACKLOG 新增 **4 行** B-250（P1）/ B-251 / B-252 / B-253（全 `open`，只加不修；B-249 为本轮 bug 行），该处 diff 5 插入 0 删除；B-249 → `fixed`。

## 偏差与 UNVERIFIED

- 偏差（不判 FAIL）：`before` 的「必须先于改码跑」由执行方 13:27:31 记录满足，tester 以 `git stash` 复跑同相位（旧码先由 dev 模块 HTTP 计数确认），语义等价；dev 转译把 `appDialogOpen={appDialogOpen}` 压成简写，故交付模块文本计数 2（非 3），不是混合版本。
- UNVERIFIED：真 WebView2 宿主、真实中文 IME、原生打印（本轮为浏览器 UI，计划未要求）；真实 FSA（验收按假 FSA 记 ops）；macOS 与 1119 px 以下除 1024×700 外未扫。

证据：`.tmp/r119-tester-{npm-test,verify,size1,size2,gate-negative,gate-positive,e2e-before,e2e-after,regress-r100}.log`、`.tmp/r119-a1-{before,after}.json`、`.tmp/r119-impl-a1-*.json`（执行方原跑备份）、`.tmp/r119-tester-head-{app,rail}.txt`。
