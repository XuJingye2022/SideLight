# 第 98 轮计划审查（critic）· PASS

审的对象：`docs/iteration/round-98/plan.md`（[AGENT] 线程回复，P1/B-225）。范围只含队列第 5 条，无 P0/P1 漏洞；4 条 P2 建议，均不阻塞。

## 已核事实（本轮实跑）

- HEAD `8733899`、工作区只有 `docs/iteration/round-98/plan.md`（5,981 B ≤6 KB）。
- `node --experimental-strip-types src/lib/annotations.test.ts` → tests **34**，+3 = 37 ✓；R97 记录 `npm test` 807 条，+3 = 810 ✓。
- `git grep -nE 'AGENT_PREFIX|agentReply|threadText|reviewStatusOnReply' -- src` 与 `-nF '[AGENT]' -- src` 均 **0 命中 / exit 1**（计划写的改前基线对）。
- `node scripts/measure-first-screen.mjs --max 315000` → raw 1,016,702 / gzip **313,688** / headroom **1,312** / PASS，与 R97 `verify` 同值；315,000−313,688=1,312，320,000−315,000=5,000，计划两条体积判据自洽。
- 文件/行号：`ChatTurn` 在 `annotations.ts:126` ✓；线程显示在 `MarginRail.tsx:356-364`（`:360` 是要改的那行）✓；`MarginRail` 是 `App.tsx:20` 的 `lazy()`，不计首屏 ✓；`discuss` 在 `App.tsx:1928-1989` ✓；`refine` 走 `discuss` 在 `:5975-5983` ✓；import 块 `:50-65` ✓；排布依赖 `annotations` 在 `:2472` ✓。
- 覆盖面：`git grep "role: 'assistant'" -- src` 里写批注线程的只有 `App.tsx:1942`；`MarginRail.tsx:158` 是「对话」页签自己的 turns，不经过 `discuss`。故「存储一处 + 显示一处」能覆盖全部线程写入路径，不会漏第三条。
- 规格依据：`review-mode/SKILL.md:217`「The `message` is automatically prefixed with `[AGENT]` and added to the annotation's thread」——存盘即带前缀与参考一致；显示层幂等再规范一次不冲突。
- 可复现：`.tmp/e2e-r97-a1-status.mjs` 存在（26,551 B，假工作区在 `:56-152`）；dev `5175` 返 200、ego CDP **57270** 在线（Edge 157）；`reset.mjs` 端口是参数，57270 可用。mockChat 每 3 字 20 ms（`ai.ts:231-240`）≈600 ms，1,600 ms 等待足够。
- 红线：无新依赖、不动 `ai.ts`/CSS/Tiptap schema/`release/`，版本与 CHANGELOG 口径对。25 分钟内可完成（R96/R97 同量级）。

## 漏洞（P2，建议顺手补，不要求重新计划）

- **CR-1（P2）显示层没有独立验收**：A1 测试①只测 `agentReply`，A3-2/3/5 断言的前缀来自「存储已带前缀」，所以即使 `MarginRail` 没接 `threadText`（旧档显示不统一）全部 E2E 仍绿。修法：A1 加 1 条 `threadText` 断言（assistant 旧文本补前缀、user 原样），或在 A3 预置一份无前缀 `note.json` 断言卡上显示 `[AGENT]`。
- **CR-2（P2）纯空白回复会清空末条并改状态**：若模型成功但只回空白，`agentReply('  ')` 回 `''`；按计划「末条非空即写」会写空文本（卡片回 `…`）且状态照转 `in-progress`。修法：先算 `const marked = agentReply(last.text)`，`marked !== ''` 才写前缀与状态。
- **CR-3（P2）流式中途状态竞态**：回复期间卡头四态下拉仍可点；收尾那次写死 `in-progress` 会盖掉用户刚改的档。修法（二选一）：发送时记下当时档位，收尾只在 `item.reviewStatus === 发送时档位` 时才转；或 `discussingId === id` 时禁用 `select.note-status`，并在 `impl.md` 写清。
- **CR-4（P2）A3-3 措辞会误导实现**：假工作区里 `.sidelight/annotations/note.json` 是页面内 `files` Map，不是真磁盘文件；照字面 `readFile` 会拿不到。修法：验收写成「读假工作区文件表（`page.evaluate` 的 `files`）」并沿用 R97 读法。

## 边界

范围外项（快照迁移、diff、Under Review、对话落盘、`ai.ts`、CSS）本轮不动，符合「队列每条单独一轮」。无 Key / 真 WebView2 / 真 IME 仍 UNVERIFIED，属既有口径。
