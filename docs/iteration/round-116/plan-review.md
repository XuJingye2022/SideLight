# 第 116 轮计划审查（rev 2 复审，B-242 对话发言者标识）

结论：**PASS**。rev1 的 H-1…H-6 已逐条修掉（我实核代码与基线）；余 4 条 P2 各一行/一句，执行时顺手落，不必再修订。

## rev1 漏洞复核

- **H-1 修**：A1 验收把 `chatSpeaker` 门收到 `-- src/lib/chat.ts src/components/MarginRail.tsx`；实测基线 exit 1，改后导出/import/span 恰 3。前提（计划已写）是 chat.ts 注释不出现该字串。
- **H-2 未全修（见 P2-1）**：A2-6 已列 10 文件 12 点，`e2e-r113` 的 `emptyChildren` 先 strip。我另扫 24 个含 `.rail-chat-turn` 的旧脚本，仍剩 1 处会红：`r108-tester-live.mjs:216` 的 `startsWith('（模拟回复）…')` 取值在 **:202**，计划只写到 `:196+199`。
- **H-3 修**：`rail-chat-turn is-` 全文件恰 1（`MarginRail.tsx:772`），从它切 400 字可行；`:605` 的 `turn.text ?`（批注线程）在切片外。插 span 后 `{turn.text ||` 约第 160 字，400 内，也在既有 `chat.test.ts:157-161` 的 240 切片内（R6 口径成立）。
- **H-4 修**：A2 ④ 加 `Accessibility.getFullAXTree` + `ignored:false`；`e2e-r113` 头已用 `connectOverCDP(57270)`/`ctx.newCDPSession`，57270 现有 Edge 157 在听。
- **H-5 修**：span 条件 `(turn.text || busy)`，200 零 delta 的空 assistant 不渲染署名，B-246 范围不变；原 `turn.text || (busy && …'…')` 行不动。
- **H-6 修**：A3-3 已把门/chunk/合计写进 B-242，并给 B-229 补一行复测、不改状态。

## 我实测的基线

- `node scripts/measure-first-screen.mjs` = **315,492**（余 4,508），`--max` 可用；`MarginRail-e5V9wo-A.js` gzip9 **7,337** → 合计 **322,829**（缺口 2,829 归 B-229）。
- `npm test` 汇总 **892 条 0 fail**；`chat.test.ts` 单跑 **20/20**（+3=23）。
- `git grep -nF chatSpeaker -- src/lib/chat.ts src/components/MarginRail.tsx` 基线 exit 1；`rail-chat-speaker` 在 `src` 0；`rail-chat-turn is-` 1 处。

## 余下 P2（各一行/一句）

- **P2-1 旧脚本仍有一处假红**：`r108-tester-live.mjs:202` 的 `const text = assistant?.textContent ?? ''` 也喂 :216 的 `startsWith`；只在 :199 strip 不够。修：同一回调两处取值都套 `stripSpeaker`。
- **P2-2 A2-6 行号偏移**：实测取 turn 文本的行是 `e2e-r96-a1-chat:125`、`r104-tester-indep:186`、`e2e-r104-chat-instruction:218`、`e2e-r106-a1-chat-input:145`、`e2e-r108-a1-live:79`（计划写 124/184/215/142/77）。修：按 `text: el.textContent` 模式定位，别照行号改。
- **P2-3 before 阶段顺序**：A2 的 before 必须在 A1 落码前跑（任务序是 A1→A2）；若先改了码，用 A1-5 的 `git stash push -- src` 回 HEAD 跑、跑完 pop。计划补一句。
- **P2-4 测试 ③ 的「三禁写 0」要按块**：全文件 `visibility:hidden` 在 `styles.css:332`、`user-select:none` 在 `:348`/`:909`，按整文件断会假红。修：只在该块声明文本里断 0。

## 不构成漏洞

- 体积：CSS +33 未复测（同一 `index-BuXo632Q.css`，rev1 已实测），门 315,525 ≤ 315,800 余 275；合计超线归 B-229（口径同 115 轮）。
- 只加 sr-only、不加可见署名：满足 B-242 的读屏与复制两条，R1/R2 已覆盖 residual 风险。
- 不设假 Key/假 FSA 可行：无 Key 走 `ai.ts` 确定性 mock（r96/r98 已用），`<MarginRail>` 无工作区也渲染。
