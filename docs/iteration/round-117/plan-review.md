# 第 117 轮计划审查（B-243 重复：401 空助手气泡）

结论 **PASS**：前提、体积、验收均可复现，范围只这一条＋去重登记，无越界；5 条 P2 执行时顺手落，不必再修订。

## 我实核的

- HEAD 修复在：`src/lib/chat.ts:80` 的 `dropEmptyAssistantTail`（末条空 assistant 才 `slice(0,-1)`）；`src/components/MarginRail.tsx:18` import、`:223-226` 在 `!aborted && aliveRef.current` 内函数式调用；`:774` 渲染仍是 `turn.text || (busy && … '…')`。`git diff 531b650..HEAD` 的 send 路径没动，只多了 `chatSpeaker` import 与面板/快照段。
- 时序对：`.tmp/r112-finder-ui2.json` 09:22:41，`531b650` 10:25:00。node 实读 r112 的 `error401.turns` 是 4 条 `[user, assistant(298 字), user, assistant('')]`，`hasEmpty=true`——题述形状成立。
- 更强的 HEAD 证据：`.tmp/r113-chat-401.json` 写于 **12:13:59**（第 116 轮执行期复跑），S0/a/b/c/d 全 true、0 pageerror。HEAD 上 a–d 已绿过一次，本轮 A1 是复核而非首测。
- 体积：`node scripts/measure-first-screen.mjs --max 320000` = gzip **315,509** / raw 1,023,714 / files 3 / 余 4,491 / PASS，与计划 §0 逐字一致。任务书的 312,423／余 7,577 是第 93–94 轮旧数，计划改用实测是对的。895 条（116 轮 tester 日志）+1=896 自洽。
- 401 走 `ModelRequestError`（`src/lib/ai.ts:150-152`），不是 `AbortError`，所以 `!aborted` 分支必进——「已修」前提成立。

## P2（执行时顺手改）

- **C1 漏了历史形状的回归**：复制来的 `e2e-r113-chat-401.mjs` 已含 b（连发两次 401 → 2 条全 user）与 d（新对话清空），A1-4 的「补两格」正是这两条的重跑；真正没测的是 r112 证据的形状「先有成功回答，再发一句 401」。修：c 假 SSE 成功后 `install401()` 再发一句，断 count 5 / users 4 / assistants 1（仍是「看到啦」）/ 末条 user / `emptyChildren===0` / 错误文案在。
- **C2 A2 夹具形状写错**：计划写 `turns(user,user,user,assistant '')`（3 个 user）并称「固化 `error401.turns[3]` 的形状」，但证据前三条是 user／assistant(298 字)／user。修：夹具按证据形状 `[user'问', assistant'答', user'再问', assistant'']`，断回前三条且 `deepEqual`。
- **C3 负向对照的判据要写成一句可执行谓词**：若把 `dropEmptyAssistantTail` 当「判空函数」喂 r112 数据，会得 3 条（看着绿），与「必须判红」相反。修：明写 `turns.some(t => t.role==='assistant' && String(t.text).trim()==='')`——r112 数据必须 `true`、A1 结果必须 `false`。
- **C4 A3 预设改法不是根因修法**：把 `setTurns(...)` 移出 `!aborted` 会连「中止也撤占位」一起改，扩到 B-246／abort 路径；且 401 不是 `AbortError`，改守卫不命中真因。修：A1 红时先在 catch 内加一次性探针（`error.name`、`aborted`、`aliveRef.current`、turns 快照），拿到现场再取最小改法；无证据不动 `!aborted`。
- **C5 A1-2 交付校验偏弱**：只查标识符 `dropEmptyAssistantTail`，import 行即可满足，查不出「模块新、catch 旧」的组合。修：改查整串 `setTurns((previous) => dropEmptyAssistantTail(previous))`，`false` 才 touch＋reload。

## 不判漏洞

- 不新增 BACKLOG 条目、不改 B-246：符合 common.md 的查重规则；A3 条件触发、B-229 口径不动，也都在本轮范围外。
- A2 先把 B-243 置 `verified` 略早于 tester 独立复核：R5 已给回退路径，不判漏洞；建议 tester 绿后再落 `verified`。
- 体积：A1/A2 不动产品代码，净增 0；A3 若触发只动 MarginRail chunk（gzip9 7,392），`--max 315800` 余 291 够。
- 25 分钟可行：A1 复制跑一次真机（116 轮那次可参照）＋ A2 一处测试一处 BACKLOG ＋ `npm test` ＋ `verify`。
