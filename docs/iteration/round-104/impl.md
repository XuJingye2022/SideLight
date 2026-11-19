# 第 104 轮执行报告（executor）

- round=104，startSha `708f524`（=HEAD），单轮 A / 2 任务，回滚 **0** 条。

## A1 修：指令留在对话记录（B-232）— DONE

文件：`src/components/MarginRail.tsx`（唯一源文件，+8 −2）

1. `generateNotes()` 清输入前 `setTurns((previous) => pushTurn(previous, 'user', instruction))`；不加 assistant 占位、不置 busy、不 focus、不发请求。
2. 贴底 effect deps 改 `[turns, railTab]`，`railTab !== 'chat'` 早退：生成时面板 hidden，`scrollHeight` 恒 0，当场滚等于白滚。

静态门（改前 → 改后）：

- 正向对照 `git grep -nE "pushTurn\([^)]*'user'," -- src/components/MarginRail.tsx`：**1**（`:177`）→ **2**（`:180` send、`:216` generate）。
- 形态门（CR-8 不绑变量名）`pushTurn\([^)]*'user', *[^)]+\)` 同文件：**1 → 2**。
- 计数门 `git grep -c 'pushTurn'`：**2**（`:18` import + `:180`）→ **3**。
- `git diff --stat` 只有该源文件；`npm run build` exit 0。

已知边界（CR-9 接受）：effect 挂 `railTab` 后每次切回对话都强制贴底，手动上翻位置在切页签后丢；原计划「页签切换不动」一条作废。

## A2 证：真机对照 + 体积 + 回归 — DONE

脚本 `.tmp/e2e-r104-chat-instruction.mjs` → `.tmp/r104-after.json`：**allPass:true 40/40**、0 pageerror、截图 1 张 `shots/round-104/instruction-kept.png`。ego CDP 57270、1440×900、假 FSA/fetch。

- S1：3 卡（1 resolved + 2 open）→ send 1 句（模拟回复）→ 指令「把这段压短，只留结论」→ 生成（analyzing **591 ms**）：卡 **3→4**、新卡 `.note-status=open`、自动切「批注」（notes 可见 / chat hidden）、无错误 toast；切回对话 `.rail-chat-turn` **3** 条、末条 `is-user` 逐字相等、`is-assistant` 仍 **1**、输入 `""`、两钮 disabled。
- S1b（CR-2/CR-7）：日志先撑到溢出（766 > 600+40）→ 生成后切回：`scrollTop+clientHeight ≥ scrollHeight−2`、末条矩形完整在 `.rail-chat-log` 内。
- S2：假 Key + 401 stub → toast「API Key 无效或没有权限…」、analyzing 1,562 ms 收尾；切回对话末条仍逐字等于指令、输入空。
- S3：页签往返仍 3 → 换 `b.md` 清 0 → 切回 `a.md` 仍 0 → 再送 1 句 2 条 →「新对话」清 0 且输入空。
- S4：栏宽 320；每卡 `top = max(natural, 上卡底+12)` ±2（147/311/453/595）、卡不重叠；生成后焦点落 `#rail-tab-notes`。

计数（CR-5 方案 a）：无 Key 走模拟，整场 `/chat/completions` **0 次**、生成这一步增量 **0**——比「只 +1」更强。S2 用假 Key 给正向对照：`send` 使计数 **1**，生成只 `+1`（那次是分析请求，不是对话）。

改前对照：采信 `.tmp/r102-finder-a.log` 的 `S3.afterGenerate`（`chatTurns` 仍 2），改后同流程 3 条；按 CR-4 不跑 `git stash`（第 62 轮 Vite 混合版本坑）。

体积：`npm run verify` gate **315,149**（计划 315,151±100，−2 B）；`dist/assets/MarginRail-D7n1Lqij.js` raw 18,990 / gzip9 **6,717**（≤6,850，+17 B）→ 真实首载 = 315,149 + 6,717 = **321,866**，B-229 超硬线 **1,866 B**（只记账）。

回归：`npm test` **61 文件 865 条 0 fail**；`.tmp/r96-tester-a1a2.mjs` **42/42**；`.tmp/e2e-r103-review-live.mjs` **19/19**（被覆盖的两张历史截图已 `git checkout` 还原）。未跑 roundtrip：不动编辑器与序列化。

## CHANGELOG

- 生成批注后那句指令留在对话记录里（不送模型），失败时能照着重来。

## 新踩坑（3 条）

1. 点完「生成批注」立刻轮询 `.rail-busy` 读到的是尚未提交的那一帧，像 analyzing 0 ms 就结束；先等 busy 起（或挂 MutationObserver）再等落。
2. 同一刻读 `#rail-panel-notes`.hidden 也是旧帧：等 analyzing 落 + 600 ms 再读，否则「自动切页签」假红。
3. 无 Key 时 `/chat/completions` 恒 0 次，「+1」不能当门槛；计数口要先用假 Key 做一次正向对照，否则「0 次」也可能只是计数器坏了。
