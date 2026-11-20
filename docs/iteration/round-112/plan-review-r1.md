# 第 112 轮计划审查（critic，REVISE）

审 `plan.md`（startSha `e27e3d5`）。核心方案可行，不需重写：1×P1 + 3×P2，均 3–5 分钟可改完。

## 复核（都为真）

- 缺陷落点对：`src/components/MarginRail.tsx:176-181` deps `[turns,railTab]`、`:180` 无条件 `scrollTop = scrollHeight`、`:173-175` 注释与行为相反。
- `src/lib/chat.ts` 84 行、末导出 `chatRefocusAfterStream`（`:66`）；`chat.test.ts` 现 15 条，`:153-159` 已有读 `MarginRail.tsx` 的静态门，计划的新门同形式可行。
- 体积独立复量：门 **315,221 B**、`MarginRail-DrtJF6yW.js` raw 19,248 / gzip9 **6,803**、合并 **322,024 B**，与计划逐字一致。
- 条数 879（第 111 轮）+3 = 882 自洽；范围只碰 `chat.ts` / `MarginRail.tsx` / `chat.test.ts` / `.tmp` 脚本 / measure 注释，不越界。

## CR-1（P1）本轮新 P1 未入池

`findings-ui.md` F1（P1）：`src/App.tsx:5884` 的 `onKeyDownCapture` 在选区 1/1 时把 `main` 里的 Tab 全送 `.skip-link`，而 `.margin-rail` 在 `main` 内（探针 `railInsideMain:true`）→ 侧栏输入框/发送/生成批注/在审行正向 Tab 全废。F2（P1）：`.rail-chat-turn` 只有 class、无发言者标识（WCAG 1.3.1/1.4.1），对照 `MarginRail.tsx:361` 已有 `[AGENT]`。BACKLOG 最新是 B-240（第 111 轮），本轮 0 新行；计划只说「另立条目」却没有任务做。

修：A2 加一步（3 分钟）写 B-241（Tab 逃逸，P1）、B-242（气泡无发言者，P1）、B-243（401 空泡，P2）、B-244（记录区不可聚焦，P2），证据带 `文件:行号` + `.tmp/r112-finder-ui*.json`；`test.md` 记「已入池」。

## CR-2（P2）「切回页签无条件贴底」在给的实现里不成立

`grew` 只看 `turns.length`，换页签不改长度。后果两条：a) 计划要写的新注释（「轮数 +1 或切回页签才无条件贴底」）又是一句与行为相反的话——正是本轮要修的同类问题；b) `hidden` 会把 scrollTop 归零（AGENTS 第 8 节，第 53 轮记过），读者上翻后切批注再回来会停在记录顶部，不是末条。

修（≤5 行）：加 `prevTabRef`，`grew = turns.length !== turnCountRef.current || prevTabRef.current !== railTab`，写回 `prevTabRef.current = railTab` 放在 `railTab !== 'chat'` 守卫之前，B-232 的「切回贴底」才真成立。

## CR-3（P2）A3 可能假绿

无 Key mock 流固定 3 字 / 20 ms，整篇回复约 21–23 个 delta ≈ 420–460 ms（`src/lib/ai.ts:229-234`）。A3 若在流尾把 scrollTop 设到最大值，后面没有 delta，「±3」由初始赋值自己满足，证不了「重新跟随」。

修：滚动前记 `scrollHeight`，滚动后要求「再增 ≥1 次 且 末次差 ≤3」；或假 fetch 发 SSE（3 s、60 ms 一个 delta）自控节奏。A1 的读数也标「收流后取」，别写成「等 520 ms 的 delta」。

## CR-4（P2）体积方向对，但仍把既存超线再扩大

合并口径 322,024 已超硬线 2,024（B-229 open），计划上限 ≤323,000 等于再放 300 B，与用户本轮前提「硬线不能破」相抵。

修：净增压到最小——effect 里现场读 `chatNearBottom(log)`，就删掉 `stickRef` 与 `onScroll`（语义相同：读者当前不在底部就不跟；少 2 个 ref / 1 个 handler，也去掉程序化 scroll 事件回置状态这条二次状态）；`test.md` 三数都记，并要求 scribe 把第 112 轮的 chunk 数补进 B-229（该行现在只到第 109 轮）。
