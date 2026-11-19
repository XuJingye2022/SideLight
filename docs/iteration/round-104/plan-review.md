# 第 104 轮计划审查（critic，修订 r1）

**结论：PASS**。上一版 CR-1～CR-4 四条全部修掉；剩 5 条 P2 属验收措辞，不动方案与范围。

## 上一版复核（逐条实测）
- **CR-1 修掉**：计数门改 **2→3**，与实测一致（`git grep -c pushTurn -- src/components/MarginRail.tsx` = 2：`:18` import + `:177` send）。正向对照 `pushTurn\([^)]*'user',` 在该文件 HEAD **1**（`:177`）→ 改后 2，成立。
- **CR-2 修掉**：贴底 effect（`MarginRail.tsx:168-172`）deps 改 `[turns, railTab]` 且非 chat 早退；S2 补末条矩形断言（`.rail-chat-log` 见 `src/styles.css:1502-1506`）。
- **CR-3 修掉**：§5 落 **B-233**，并要求 tester 写进 `test.md`。
- **CR-4 修掉**：§4.7 采信 `.tmp/r102-finder-a.log`，明确不跑 stash。
- 未回退：单源文件、不加 assistant 占位/不发请求、体积记账、回归与基线（`npm test` 61 文件 865 条、门 315,151、chunk 6,700）仍成立。

## 剩余 P2（不阻塞；执行时按此写脚本）
1. **CR-5（P2）A2 两种运行模式互斥，且牵连 3→4**：S1「等模拟回复」与末句「无 Key 走模拟」是无 Key 路径（`src/lib/ai.ts:120-126`/`:206-210` → mock，**0** 次 fetch），S1 的「3→4」正是 r102 无 Key 日志的形态；但「`/chat/completions` 只 +1」与 S3 的「401」要假 Key + stub——若全面改假 Key，stub 只回 1 条批注（`.tmp/r96-tester-a1a2.mjs:355-372` 的 `ANNO_LINE`），`replaceInWindow` 后不保证 3→4。修法（推荐 a）：S1/S2 保持无 Key，「+1」改「`/chat/completions` 调用 **0** 次」（更强：证明没发请求）；S3 单独重载 + 假 Key + 401 stub（只验失败后留痕）。选 b（全程假 Key）则须让 stub 批注与夹具同形，并删「模拟回复」。
2. **CR-6（P2）「新卡 open」缺识别法**：卡片顺序会重排——`.tmp/r102-finder-a.log` 的 `S3.chatTab` 是 `[resolved,open,resolved]`，`S3.afterGenerate` 是 `[open,resolved,open,resolved]`（末卡是 resolved）。修法：按改前/改后 `.note` 的 `aria-label` 集合差找新卡，再判 `.note-status`。
3. **CR-7（P2）S2 溢出前置不是断言**：若 `scrollHeight <= clientHeight`，末条完整可见恒真（假绿）。修法：同一步加 `check('前置：日志溢出', scrollHeight > clientHeight + 40)`。
4. **CR-8（P2）形态门仍绑变量名**：`...'user', *instruction\)` 绑 `instruction`，属 CR-1 同类。修法：改不绑名的值对 `git grep -nE "pushTurn\([^)]*'user', *[^)]+\)" -- src/components/MarginRail.tsx`（HEAD **1** → 改后 **2**；已实测 `:177` 与三种候选写法都命中），保留计数门。
5. **CR-9（P2）A1 第 2 条与第 5 条冲突**：effect 挂 `railTab` 后每次切回对话都强制贴底，「页签切换不动」不再成立；长对话上翻位置会丢。修法：接受就改第 5 条措辞并记已知边界，否则只在「隐藏期间新增过 turn」时贴底（多一个 ref）。
