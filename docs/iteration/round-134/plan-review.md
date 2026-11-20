# 第 134 轮计划审查（critic）

**PASS**（0 个 P0/P1；5 个 P2 补齐项，不改计划骨架）

范围不超：只动 `src/components/MarginRail.tsx` + `src/lib/chat.test.ts`，明确不碰 `chat.ts`/`App.tsx`/`styles.css`/编辑器/序列化，不改 Tab 顺序，`roundtrip` 不跑——与「本轮只做两处发送的焦点」一致。

## 核对（本轮实查）
- HEAD `bd80040` = startSha；工作区只有 `?? docs/iteration/round-134/`，`git stash push -- src/components/MarginRail.tsx` 的 before 相安全。
- 行号全对：`MarginRail.tsx:174` refs、`:225` 清稿、`:227` `setBusy(true)`、`:257` `focusInPanel`、`:258` 谓词、`:763` 追问 `<input>`、`:778` 追问钮 disabled、`:887` 对话钮 disabled；`chat.test.ts:231-237` 的「`inputRef.current?.focus()` 恰 1」门在，`chat.test.ts` 31 条。
- 追问 effect 有触发点：`App.tsx:2086` 的 `finally` 恒 `setDiscussingId(null)`（早退分支也走 finally）。
- 体积账对：`measure-first-screen` = **316,135 B**（raw 1,025,609）；`MarginRail-CA2BPyQ0.js` raw 22,309 / gzip9 **7,907**（本机自算同值）；B-229 合计 324,042。任务书 312,423 B 确为第 93 轮旧值。
- 回归脚本可复用：`.tmp/e2e-r111-a1-focus.mjs` 吃 `OUT`，A/B/B2/C 四相都由输入框 Enter 起流，前置 `focus()` 对已聚焦 textarea 是 no-op（不产生 focusin），不会把 B-240 的 `hitTotal 0` 打红；`.tmp/e2e-r98-a1-agent.mjs` 的追问走 Enter（`ask()`），鼠标点追问发送钮正好由本轮 S2 补。

## P2（均可当轮照做）
1. **收尾清单缺 CHANGELOG + STATE**。第 132/133 轮 commit 都带 `docs/CHANGELOG.md` 与 `docs/iteration/STATE.md`；`src/lib/changelog.test.ts:58` 钉「标题上界 = 正文最大轮次」，写「**第 134 轮（同一未发版区间）**」却不把标题「第 29–133 轮」改 134 会 **1 红**。修：A3 收尾加一条 CHANGELOG 小节 + 标题上界改 134 + STATE 一行，收尾 `npm test` 复核。
2. **追问回焦守卫 `#rail-panel-notes` 过宽**。notes 面板里有采纳/改档/追问钮：流式中用户点另一张卡的钮（焦点仍在 notes 面板内），收尾会把焦点抢回本条线程输入框——正是 B-240 那类抢焦点。修：判据收紧为 `document.activeElement === threadInputRef.current || document.activeElement === document.body`（修法 1 已让输入框持焦，够用）；A3 加 S2b：流式中点 `.ProseMirror p`，`[AGENT]` 到齐后焦点不动。
3. **chat 的 body 豁免把 B-240 判据放宽了**。「点了任何不可聚焦处」（栏内空白、正文空白）也会被当「焦点还在面板」而在收流时拉回输入框；r111 只覆盖文件树/快速打开/正文三种具体元素，抓不到这条新语义。修：A3 加一段采样（流式中点 `.rail-head .rail-title` → 收流后 activeElement）并把结果写成「有意：点空白=没把焦点落到别处」；更稳是**先只落修法 1**，after 仍见丢焦再加豁免（零测量收益的放宽不值得）。
4. **chunk ≤8,060 不该写成硬验收**。余量仅 153 B，且风险条的「删注释」对压缩后 chunk 无效（注释已被剥掉）。修：验收只留「门 ≤316,200 且 `--max 316400` exit 0」，chunk 记实测 Δ；超 8,060 但门未破时记偏差、不判 FAIL（B-229 本就 open）。
5. **用户口述的「下一次 Tab 落状态栏」没进验收**，且「两相差 0」预计不准：before 焦点在 body，Tab 从文档首个可聚焦站起；after 焦点在 textarea，Tab 从它往后一位起。修：before/after 各记「焦点站 + 一次 Tab 后 activeElement」，报告里说明 after 的 Tab 去向是「输入框之后无可用站」的正常顺序（Tab 序不在本轮改），免得报告答不上用户原句。
