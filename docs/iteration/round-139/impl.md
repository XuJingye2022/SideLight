# 第 139 轮执行报告（executor）· B-229 真实首载 ≤320,000

轮前 `0a99076`，只做 B-229，A1→A2→A3 全做。`tsc`/`npm test`/`npm run verify` 全绿。

## A1 拆「对比 / 在审+快照」→ 两个 lazy chunk

- 新建 `RailDiffPanel.tsx`（diffView+portal+焦点+Esc）、`RailReviewPanel.tsx`（在审/快照数据层+portal+焦点+Esc）；`MarginRail.tsx` 只留入口按钮、开关态、就地 Suspense：`diffOpen = diffOn && railTab==='notes' && !appDialogOpen`、`reviewActive` 同式；两个 `lazy(() => import('./…tsx'))` 在模块顶层，无静态说明符。
- A1 build：`RailDiffPanel-fjTWROGH.js` raw 2,712/gzip9 1,345、`RailReviewPanel-CoQOsht7.js` 4,531/2,013；`MarginRail-*.js` gzip9 **7,838→5,930**（−1,908）；`total` 315,611→**315,615**（+4≤+300）；`real` 323,449→**321,545**。此阶段脚本未改。
- 门禁：`npm test` 70 文件 **971 条 0 fail**；r100 **43/43**（`.tmp/r139-a1-r100.log`）、r101 **57/57**（`.tmp/r139-a1-r101.log`）。新门（`railDiffA11y`）lazy 计数=2→A2 后 3、静态说明符=0，负向各 1 红：`.tmp/r139-a1-neg-static.log`、`.tmp/r139-a1-neg-lazy.log`。
- 四门（`railDiffA11y`/`railModalGate`/`reviewLabelWording`/`revisionRefresh`）同步改读新文件，断言逐条保留。

## A2 拆「对话」→ `RailChat.tsx`（chat.ts 随组件走）

- 对话 state/effect/send/generateNotes/JSX（原 :169-296、:860-949）搬进 `RailChat.tsx`；`#rail-panel-chat` 与 B-230 交接留原处；首开 `railTab==='chat'` 才挂（`chatMounted`），之后 hidden 保 turns，`key={docKey}` 清空。
- A2 build：`RailChat-CFiE9VZE.js` 4,914/2,482、`RailReviewPanel` 终版 4,718/2,089；`MarginRail-*.js` 11,604/**4,190**。`total` 315,616、`resident` 4,190、**`real` 319,806**（≤320,000）。未用兜底②。
- 静态门：MarginRail 的 `lib/chat.ts` 0、RailChat 1；`chat.test.ts` 8 处改读 RailChat；`railChatReset` 改盯 `key={docKey}`。r96 **33/33**（`.tmp/r139-a2-r96.log`）；新 `.tmp/e2e-r139-suspense.mjs` **6/6**（三面板首开 600 ms 右栏同节点、turns 不丢、焦点进 sheet/回入口）。

## A3 翻 `npm run verify` 默认口径

- `measure-first-screen.mjs`：`realMax = --real-max ?? max`；`budgetGzip = noResident ? totalGzip : realGzip`，默认 real>320,000 **exit 1**；`--target`/`gap`/headroom WARN 改判 real；`--no-resident` 复旧口径（不扫常驻、无 real 行、判 total）；头注释写「`--max` 就是真实首载硬线」+ 三数 315,616/4,190/319,806。
- 新 `firstScreenBudget.test.ts` **4 条**（test 链 70→**71 文件**）；负向删预算 exit 分支 → **2 红**（`.tmp/r139-a3-neg-budget.log`）。
- 实跑：默认 exit 0 `real=319806`；`--no-resident` exit 0 无 real 行；`--max 300000` exit 1；`--max 400000 --real-max 400000` exit 0；`--real-max 319000` exit 1；`--no-resident --max 316000` exit 0。`npm run verify` exit 0（`.tmp/r139-a3-verify.log`）。
- N-2：`ci.yml:39`、`release.yml:82/155` 裸调用无文件改动、语义随默认变 real≤320,000；不 push，**CI 未验**；ADR-0012/README 由 scribe 补。

## 收尾

- 终版 `npm test` **71 文件 975 条 0 fail**（`.tmp/r139-final-test.log`）；verify exit 0；r100 43/43、r101 57/57（`.tmp/r139-final-r101.log`）、r96 33/33。截图 `shots/round-139/rail-chat-lazy.png`、`rail-diff-lazy.png`。E2E 覆写的 `shots/round-{96,100,101}` 已还原。
- B-229 置 `fixed` 条件（real≤320,000 且已翻口径）已满足。
- CHANGELOG 建议：`- 首屏预算改按「真实首载 = 首屏门 + 常驻 MarginRail chunk」判定，硬线 320,000（B-229：对话/对比/在审面板改按开合懒加载，323,449 → 319,806）。`
- 新踩坑：① 拆面板时 Esc 监听留在旧文件，r101 ⑧ 才红——document 监听要随面板挂载走；② r96「源码态生成批注 disabled」第 132 轮起已过期（对话 textarea 属 foreignTyping，Ctrl+/ 被吞），脚本先点回正文再按，已改脚本、非产品回归；③ 翻口径后 `--max 316200` 旧调用会红。
