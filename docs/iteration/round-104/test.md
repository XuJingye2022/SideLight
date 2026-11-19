# 第 104 轮验收（tester 独立，未读 impl.md）

- round=104，报告 `docs/iteration/round-104`，轮前 `startSha 708f524`。
- 任务：A1 `src/components/MarginRail.tsx`——「生成批注」把输入的指令作为 user turn 写进对话记录（不送模型）；A2 真机对照 + 体积记账 + 回归。
- 判定：**PASS**。静态门、门禁、自写 E2E、回归全过；1 条已知边界交 B-233。

## 1. 静态门（HEAD=708f524 对工作树，`git grep`）

| 门 | HEAD | 工作树 | 结论 |
| :--- | :--- | :--- | :--- |
| 正向对照 `pushTurn\([^)]*'user',`（单文件） | 1（`:177` send） | 2（`:180` send、`:216` generateNotes） | 通过 |
| 形态门 `pushTurn\([^)]*'user', *instruction\)`（全 `src`） | **0**（exit 1） | 1（`MarginRail.tsx:216`） | 通过 |
| 计数门 `pushTurn`（单文件） | 2（`:18` import、`:177`） | 3 | 通过 |

- `git diff --stat`：`src/components/MarginRail.tsx | 10 ++++++++--`，1 文件 8+/2−；无其它源文件（`docs/`、`shots/` 为未跟踪报告/证据）。
- 任务原文的「1→2」是误口径：HEAD 已含 `:18` 的 import，正确基线为 **2→3**（plan-revision CR-1 已改）。
- diff 实质：`generateNotes()` 在 `setChatDraft('')` 前 `setTurns((previous) => pushTurn(previous, 'user', instruction))`；贴底 effect deps `[turns]`→`[turns, railTab]` 且 `railTab !== 'chat'` 直接 return（hidden 面板 scrollHeight 恒 0）。

## 2. 门禁

- `npm run verify` → **PASS**，exit 0：首屏 gzip **315,149 B**（plan 315,151 ±100 内、余硬线 4,851）、raw 1,022,459；`npm run build` 含在内 exit 0（`.tmp/r104-tester-verify.log`）。
- `npm test` → **61 文件 865 条 0 fail**，exit 0（逐文件求和；`.tmp/r104-tester-npmtest.log`）。
- 体积记账：`gzipSync(level 9)` of `dist/assets/MarginRail-D7n1Lqij.js` = **6,717 B**（raw 18,990；HEAD 6,700 → +17，≤6,850）。**真实首载 = 315,149 + 6,717 = 321,866**，超硬线 **1,866**（B-229 仍 open，本批只记账）。
- roundtrip 未跑：未动编辑器/序列化。

## 3. 真机（ego CDP 57270、5175、1440×900，自写脚本）

`.tmp/r104-tester-indep.mjs` → `.tmp/r104-tester-indep.json`，**25/25 pass、0 pageerror、截图 1 张**（`shots/round-104/instruction-kept.png`；假 FSA + 假 fetch/SSE，假 Key `sk-fake-tester-104`）：

- **T1 计数口是活的**：假 Key 下 send 1 次 → 2 条记录、`/chat/completions` **1**。
- **T2 核心**：填指令点「生成批注」→ notes 可见/chat hidden；切回对话 `.rail-chat-turn` **3 条**、末条 `is-user` 且**逐字等于**「把这段压短，只留结论」、`is-assistant` 仍 **1**、输入 `""`、两钮 disabled；生成这一步 `/chat/completions` **只 +1**（= 分析那一次，没多发对话请求）。
- **T2 焦点**：生成后 `document.activeElement.id === 'rail-tab-notes'`（102 轮交接未被新 `setTurns` 打断）。
- **T3 失败可找回**：批注流改 401 → `.toast` 含「API Key 无效或没有权限」；切回对话末条仍是第 2 句指令、逐字相等、输入空、助理仍 1、无错误气泡。
- **T4 生命周期**：页签往返仍 4 条；「新对话」清 0；换 `b.md` 清 0、切回 `a.md` 仍 0。
- **G0 几何未波及**：3 卡间隔 11.75/11.75（12±2）、不重叠、栏宽 320。
- 交付脚本复跑（非独立证据）：`node .tmp/e2e-r104-chat-instruction.mjs` 现场 **40/40**、exit 0（`.tmp/r104-after.json`）。

## 4. 改前/改后对照

- 改前：`.tmp/r102-finder-a.log` 的 `S3.afterGenerate` —— `chatTurns` 只有 send 的 2 条、`chatDraft:""`，指令消失；同一 startSha 的形态门 0 命中（§1）。
- 改后：§3 T2/T3 —— 3 条（末条逐字等于指令）、401 后仍可找回。
- **偏差（不判 FAIL）**：未按任务原文用 `git stash` 前后各跑一次；plan-revision CR-4 明写不跑（第 62 轮 Vite 混合版本风险），改前证据取同一 startSha 的 finder 日志 + 静态 0 命中。

## 5. 回归

- `SIDELIGHT_CDP=http://127.0.0.1:57270 node .tmp/r96-tester-a1a2.mjs` → **42/42**（exit 0）。
- `node .tmp/e2e-r103-review-live.mjs` → **19/19**（exit 0）；跑完 `git checkout -- shots/round-103/` 已还原（同时还原被 r96 覆盖的 `shots/round-96/rail-chat.png`）。

## 6. 已知边界 / UNVERIFIED

- **B-233（deferred）**：`生成批注` 留下的 user turn 没有回复气泡/标记（零样式改动），可能被读成「没送达」；修法要改流内元素，会动 `flowBottom` 与卡片几何门槛，另开一轮。
- 空正文点「生成批注」：`runAnalysis` 早退（toast），记录仍留（本轮未单测该支）。
- 新 turn 进入后续对话上下文（`chat.ts` 近 12 轮）——按 plan 属预期，未改 `chat.ts`。
- UNVERIFIED：真模型/真 SSE（fetch 全为页面内假实现）、真 WebView2 宿主、真实中文 IME、1024 宽度（A2 只要 1440×900）。
- 证据：`.tmp/r104-tester-{indep.mjs,indep.json,verify.log,npmtest.log}`、`.tmp/e2e-r104-chat-instruction.mjs`、`.tmp/r104-after.json`。
