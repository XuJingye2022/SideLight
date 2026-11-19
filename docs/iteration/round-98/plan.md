# 第 98 轮计划（planner，单轮 A）· [AGENT] 线程回复（队列第 5 条 / 轮前 `8733899`）

> 只做这一条（P1，入池 **B-225**）：批注线程里助手回复统一 `[AGENT]` 前缀；回复落进线程后四态转 `in-progress`；卡片继续显示线程。队列其余条目不做。

## 取舍（先定，执行不改）
1. **前缀两处收口**：`annotations.ts` 出 `agentReply`（落库前补一次，存量数据带前缀）与 `threadText`（显示时再规范一次，旧档线程也统一、不双写）。**不改 `ai.ts`**：`streamChat` 同时服务「对话」页签（`MarginRail.tsx:166`），普通聊天不该出现 `[AGENT]`；理由写进 `impl.md`。
2. **状态规则**：回复成功落进线程后一律 `in-progress`（四个原状态都收，resolved / wont-fix 视为重新讨论），用户仍可在卡头下拉改回；中断、失败、空回复不动状态。规则出纯函数 `reviewStatusOnReply`。
3. **卡片线程块已存在**（`MarginRail.tsx:356-364`）：只把显示换 `threadText`，不改结构、不加 CSS。
4. 旧档线程不迁移、不改盘：显示层补前缀，下一条回复落库时才写。

## 首屏体积（硬线 320,000）
- 用户口径 **312,423 B 是第 93 轮值**；实测当前 dist **313,688 B**（第 97 轮收口同值，硬线余 **6,312 B**；超内部预算 3,688 B 只 WARN）。
- 计首屏只有 `annotations.ts` + `App.tsx`（`MarginRail.tsx` 在 `App.tsx:20` 的 `lazy()` 里不计；`styles.css` 不动）。预估净增 **+200～350 B → ≤314,100 B**。
- 判据：`node scripts/measure-first-screen.mjs --max 315000` exit 0（净增 ≤1,312 B）＋`npm run verify` PASS＋硬线余 ≥5,000 B。超了按序削：状态表换字面量 → `threadText` 内联 → 前缀判断简化；不削前缀与状态。

## A1 数据层（`src/lib/annotations.ts`、`annotations.test.ts`）
1. `ChatTurn`（`:126`）旁加 `AGENT_PREFIX = '[AGENT]'` 与 `agentReply(text)`：`trim()` 后空串回 `''`；已以前缀开头原样返回（幂等）；否则 `${AGENT_PREFIX} ${body}`。
2. `threadText(turn)`：assistant 走 `agentReply`，user 原样。
3. 四态区（`:28-76`）加 `REPLY_REVIEW_STATUS: Record<ReviewStatus, ReviewStatus>`（4 键全 `in-progress`）与 `reviewStatusOnReply(current)`（缺失回落 `in-progress`）。
4. 测试 +3 条（34→**37**）：① 前缀加一次、不双加、空白回空、用户原样；② 四态逐档 + 非法值都回 `in-progress`；③ 带 thread 与 `in-progress` 的 store 往返不变。
- 验收：`node --experimental-strip-types src/lib/annotations.test.ts` → `tests 37 / fail 0`；`git grep --untracked -nE 'AGENT_PREFIX|agentReply|threadText|reviewStatusOnReply' -- src` 改前 **0 行**（已实测 exit 1）→ ≥8；`git grep --untracked -nF '[AGENT]' -- src` 0 → ≥2。

## A2 接线（`src/components/MarginRail.tsx`、`src/App.tsx`）
1. `MarginRail.tsx:360` 改 `<InlineText text={threadText(turn)} />`，import 加 `threadText`；空文本仍是 `.thread-typing` 的 `…`，不带前缀。
2. `App.tsx` 的 `discuss`（`:1928-1989`）在 `await streamChat(...)` 成功后、`catch` 前补一次 `setAnnotations`：只处理 `item.id === id`；末条必须非空 assistant；写 `agentReply(last.text)` 与 `reviewStatusOnReply(item.reviewStatus)`；失败 / Abort 不进这一支。import（`:50-65`）加两函数。
3. 不动 `discuss` 依赖数组；`refine` 本就走 `discuss`（`App.tsx:5975-5983`）。
- 验收：`npm run build` exit 0；`MarginRail.tsx` 的 `threadText` 恰 1、`App.tsx` 两函数各 ≥1；`git diff --stat -- src/styles.css` 空；`select.note-status` 逐字未动。

## A3 自测、门禁与收口（`.tmp/e2e-r98-a1-agent.mjs`、`impl.md`、`CHANGELOG.md`）
E2E：ego CDP 57270、1440×900；假工作区与 3 段夹具照 `.tmp/e2e-r97-a1-status.mjs:56-152`；先 `node .tmp/reset.mjs 57270`，全程收 `pageerror`：
1. 干净开局 → `note.md` → 点第 2 段 → `.analyze-button` → 3 卡全 `open`。
2. 第 1 卡「追问」→ 输入「这句为什么要改？」→ Enter；等按钮回「发送」。断言：`.thread-user` 1 条 = 问题且无 `[AGENT]`；`.thread-assistant` 1 条以 `[AGENT] ` 开头、含「模拟回复」；`.thread` 内 `[AGENT]` 恰 1 次；该卡状态 = `in-progress`。
3. 1,600 ms 后读 `.sidelight/annotations/note.json`：该条 `reviewStatus = in-progress`、`thread[1].text` 以 `[AGENT] ` 开头、`thread[0]` 仍是 user。
4. 同卡再追问 → 4 条线程、assistant 各恰 1 个前缀、`[AGENT] [AGENT]` 0、状态仍 `in-progress`、store 无空回复。
5. 切 `other.md` 再切回 → 线程与前缀、状态都在。
6. 回归：第 2/3 卡无 `.thread`、状态仍 `open`；「对话」页签发一句 → 模拟回复不含 `[AGENT]`；`.margin-rail` 无横溢、3 卡不重叠（±1）。截图 `shots/round-98/agent-thread.png`；0 pageerror。
- 门禁：`npm test` **58 文件 ≥810 条 0 fail**；`npm run verify` PASS 并抄 raw/gzip；`--max 315000` exit 0；`changelog.test.ts` 过（标题 `## Unreleased（第 29–98 轮，未发版）`、正文加第 98 轮小节）；不跑 roundtrip。报告 `round-98/impl.md`（≤4 KB）；BACKLOG **B-225** 由 tester 入池。

## 范围外与风险
范围外：快照迁移、diff 对比、Under Review、对话落盘、`ai.ts`、CSS 配色、五档/四态以外改动；不 push、不建 Release、不改 `release/`、版本 0.32.1。
风险：① 双前缀——两处都幂等，单测 + A3-2/4/5 数次数；② 结项条目被回复改回 `in-progress`——队列要求，文档写清可手改回；③ 长线程撑高卡片——排布 `useLayoutEffect` 依赖 `annotations`（`App.tsx:2472`），每个 delta 重排，A3-6 量不重叠；④ 首屏超线——按序削，硬线不动；⑤ 无 Key 只验模拟流。
UNVERIFIED：真模型回复（无 Key）、真 WebView2 宿主、真实中文 IME、CDP 9222–9226（不可用）。
