# 第 104 轮计划（单轮 A，1 条 P2）

- **revision r1**：修 CR-1（口径 2→3、形态门去变量名）、CR-2（可见性断言 + 贴底 effect）、CR-3（B-233 承接）、CR-4（不走 stash）；单轮 A / 2 任务 / 单源文件不变。
- round=104 / nn=104，`docs/iteration/round-104`，轮前 `startSha 708f524`（=HEAD）。
- 范围：用户 2026-11-20 队列「对话区」缺陷（`round-102/findings-bug.md` F3，P2）——「生成批注」清空输入、记录不留这句。
- backlog_id：**B-232**。

## 1. 体积（HEAD 实测）

| 口径 | HEAD | 本批净增 | 结论 |
| :--- | ---: | ---: | :--- |
| 首屏门 gzip | **315,151**（余硬线 4,849；超内部 5,151 WARN） | **0**（不动 `App.tsx`/`styles.css`） | ±100，须 PASS |
| 常驻懒 chunk `MarginRail-*.js` gzip9 | 6,700 | **+≤150**（`setTurns` ≈+25、effect 2 行 ≈+20） | ≤6,850 |
| 真实首载 = 门 + chunk | 321,851（B-229 open，超线 1,851） | +≤45 | 仍超；只记账 |

## 2. 成因

- `MarginRail.tsx:208-214` 的 `generateNotes()` 不 `pushTurn`：`turns` 是本地态（`:135`），只有 `send()`（`:174-179`）写入。
- `App.tsx:6026-6030`：切页签 + `runAnalysis(instruction)`，指令只进偏好槽。故输入清空、记录不增。
- 改前对照：`.tmp/r102-finder-a.log` 的 `S3.afterGenerate`（`chatTurns` 2、`chatDraft:""`）。

## 3. A1（修）：指令写进对话记录（不送模型）

文件：`src/components/MarginRail.tsx`（只此一个源文件）。

1. `generateNotes()` 在 `setChatDraft('')` 前插 `setTurns((previous) => pushTurn(previous, 'user', instruction))`；不新增 import（`:18` 已导入）。
2. 贴底 effect（`:168-172`）deps 改 `[turns, railTab]`，`railTab !== 'chat'` 直接 return（CR-2）。
3. 不加 assistant 占位、不置 `busy`、不 `focus()`、不发请求（`chat.ts:59-61`）。
4. 注释：这句是「生成批注」的输入、没送模型，失败时可找回；空正文分析早退（`App.tsx:1718-1721`）但记录仍留。
5. `send()`/`resetChat()`/换文档/页签切换/102 轮焦点交接不动。

验收（顺序：正向对照 → 形态门 → 计数门 → diff → build）：

- 正向对照（单文件，改前 >0）：`git grep -nE "pushTurn\([^)]*'user'," -- src/components/MarginRail.tsx` HEAD **1**（`:177`）→ 改后 **2**；全 `src` HEAD 3 含单测，别用。
- 形态门（不绑变量名）：`git grep -nE "pushTurn\([^)]*'user', *instruction\)" -- src` **0→1**。
- 计数门：`git grep -c 'pushTurn' -- src/components/MarginRail.tsx` **2→3**（HEAD = `:18`+`:177`；原 1→2 误）。
- `git diff --stat` 只有这一个源文件；`npm run build` exit 0；A2 的 S1/S2 全过。

门禁：`npm run build`、`npm test`（基线 61 文件 865 条）、`node scripts/measure-first-screen.mjs --max 320000`。

风险：① 新 turn 进后续上下文（`chat.ts:42-56` 近 12 轮）——预期，不改 `chat.ts`；② 空正文点生成：记录留、分析早退（toast），预期，记已知边界；③ 无回复气泡可能被当「没送达」——零样式改动，**B-233**（deferred）；④ HMR：测前 `fetch` 查新形态，不符就 touch。

## 4. A2（证）：对照 + 体积 + 回归

文件：`.tmp/e2e-r104-chat-instruction.mjs`（模板 `.tmp/e2e-r103-review-live.mjs`；假 FSA + 假 fetch/SSE）、`.tmp/r104-after.json`、`shots/round-104/instruction-kept.png`（1 张）、`docs/iteration/round-104/impl.md`。环境：5175、ego CDP 57270、1440×900。

1. S1：夹具 3 条（1 resolved + 2 open）→ 对话页签发 1 句 → 等模拟回复 → 输入「压短」→ 生成 → 等 `analyzing` 落（≤3 s）：批注面板可见、`article.note` **3→4**、新卡 `.note-status`=open、对话面板 hidden、无错误 toast。
2. S1 关键：切回对话（切批注再切回）→ `.rail-chat-turn` **3 条**，末条 `is-user` 且文本**逐字等于**指令，`is-assistant` 仍 **1**（无占位），输入 `""`，两钮 disabled；假 `fetch` 的 `/chat/completions` 只 **+1**。
3. S2 界面可见（CR-2）：同页再送 4 句（每句 ≥100 字，凑到 `scrollHeight > clientHeight + 40`）→ 填指令 → 生成 → 切回对话：末条逐字相等、`scrollTop + clientHeight >= scrollHeight - 2`、末条矩形完整在 `.rail-chat-log` 可见区（`top >= logTop-1 && bottom <= logBottom+1`）。
4. S3 失败可找回：批注流改 401 再填一句点生成 → `.toast` 报错、`analyzing` 结束后切回：末条逐字相等、输入空。
5. S4 生命周期（最后跑）：`新对话` → 0 且输入空；打开 `b.md` → 0。
6. S5 不波及：卡 `top` 仍 `max(natural, 上卡底+12)`（±2；`App.tsx:2456-2482` 无新流内元素）；页签焦点仍落 `#rail-tab-notes`。
7. 改前对照：采信第 2 节 `S3.afterGenerate`；不跑 `git stash`（62 轮 Vite 混合版本，CR-4）。
8. 体积：`measure-first-screen.mjs --max 320000`（期望 315,151 ±100）、`gzipSync(9)` 量新 `dist/assets/MarginRail-*.js`（≤6,850）；`impl.md` 记「gate X + chunk Y = 首载 Z，B-229 超线 Z−320,000」。
9. 回归：`SIDELIGHT_CDP=http://127.0.0.1:57270 node .tmp/r96-tester-a1a2.mjs`（42/42，含 L203 滚到底）与 `node .tmp/e2e-r103-review-live.mjs`（19/19）；后者写 `shots/round-103/`，跑完 `git checkout --` 还原。

门禁同 A1；截图 ≤1 张；无 Key 走模拟（≈1.6 s），等 `analyzing`。

## 5. 不做与收尾

- 不在批注侧加「按这句生成」说明条：新流内元素改 `flowBottom` → 卡 `top`/`railSpace`（94/95/97 轮门槛）；deferred。
- 不改 `App.tsx`（重试不带指令，deferred）、`chat.ts`、单测、`styles.css`；不加依赖、不发版、不 push、不改 `release/`；不动 102/96/103 轮行为。
- 入池（lead/scribe 落 `BACKLOG.md`）：**B-232**（本轮修）+ **B-233**（deferred：生成批注留下的 user turn 无回复标记）；tester 在 `test.md` 已知边界写 B-233。
- tester 独立验收（不读 `impl.md`）后 commit：`round-104: 生成批注把指令留在对话记录（P2）`。
