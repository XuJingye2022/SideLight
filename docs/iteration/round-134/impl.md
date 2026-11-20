# 第 134 轮实现（executor）— B-264 两处「发送」丢焦点

参数：round 134；startSha `bd80040` = HEAD；报告 `docs/iteration/round-134/`。只做 BACKLOG B-264，回滚 0 条。收尾前 `git stash list` 0。

## 状态
| 任务 | 状态 | 改动 |
| :--- | :--- | :--- |
| A1 先移焦再置灰 + 丢焦点豁免 + 追问回焦 | DONE | `src/components/MarginRail.tsx` +26/−1 |
| A2 静态门改「两处 focus + 顺序 + 豁免」+ 追问门 + 负向 | DONE | `src/lib/chat.test.ts` 231–289（31→32 条） |
| A3 真机 before/after + 回归 + 门禁 | DONE | `.tmp/e2e-r134-focus.mjs`、`shots/round-134/chat-focus-after.png` |

## A1（产品码只 1 个文件）
- `send()`：`inputRef.current?.focus()` 在 `setTurns` 之前（`:240`，`setBusy(true)` 在 `:246`）。
- finally：`focusInPanel = !!panel?.contains(document.activeElement) || document.activeElement === document.body`（`:277`）；谓词 `chatRefocusAfterStream(controller.signal.aborted, …)` 不动。
- 追问：新 `threadInputRef` / `threadRefocusRef`（`:176-177`），点击先 `focus()` + 记 `annotation.id` 再 `onDiscuss`（`:802-803`），`<input ref={threadInputRef}>`（`:784`）。
- 新 `useEffect([discussingId])`（`:222-234`）：回 null、意图 id === `openThread`、焦点在 `#rail-panel-notes` 或 body 时回焦并清意图。
- `npm run build` exit 0；`git diff --stat` 产品文件只 `MarginRail.tsx`（A2 的测试文件另计）。

## A2
- 原 `:231-237` 门改为：`inputRef.current?.focus()` 恰 2、`indexOf` 第一处早于 `setBusy(true)`、第二处含 `chatRefocusAfterStream(` 与 `controller.signal.aborted`、`focusInPanel` 那行含 `document.activeElement === document.body`；两参真值表原样。
- 新追问门 `:256-289`：声明 1 / `ref=` 1 / `threadInputRef.current?.focus()` 恰 2 / `threadRefocusRef.current = annotation.id` 1 / effect 依赖 `[discussingId]` 且含 `openThread` 与回焦落点。
- `node --experimental-strip-types src/lib/chat.test.ts` 32/32 绿。负向（SHA256 备份 `.tmp/r134-marginrail.bak`，`B2199250…`）：删前置 focus → 1 红 exit 1；挪到 `setBusy(true)` 之后 → 1 红 exit 1；还原后哈希相等、32/32 绿。

## 体积（改前 → 改后，第 133 轮 dist）
- 首屏 gzip：316,135 → **316,137 B**（+2；`verify` exit 0，硬线 320,000 余 3,863，计划 cap 316,400 余 263）。
- `MarginRail-Dc6iBNG5.js`：raw 22,309 → **22,712**（+403）、gzip9 7,907 → **7,992**（+85，≤8,060）。
- 首屏静态代码 0 B：新增全在懒 chunk（B-229 合计 324,127，仍超硬线）。

## CHANGELOG 建议一行
`- 第 134 轮：右侧「对话」与批注追问的「发送」用鼠标点后不再把焦点丢给 body（先移焦再置灰、收尾按「丢焦点」回焦、追问收尾还回本线程输入框，B-264）。`

## 偏差与遗留
1. 追问回焦守卫按任务书 A1 原文用「`#rail-panel-notes` 或 body」；plan-review P2-2 建议收紧为「仅输入框 / body」未采纳。残余风险：流式中点另一张卡的钮（<400 ms 窗口）收尾会被拉回本线程输入框，未测。
2. Tab 落点 before/after 都是 `BUTTON.stats-trigger`（输入框之后栏内无可用站）——与计划「两相差 0」一致；本轮给用户的是「光标留在输入框、可直接打下一句」。
3. CHANGELOG / STATE 未改（executor 不做，等 tester / scribe）；A3 只要求 impl/test + BACKLOG 标 fixed。

## 新踩坑（3 条）
1. 追问输入按 Enter 走 `onKeyDown`，不经过 `disabled` 置灰路径（r98 脚本就是这样）；复现本缺陷必须**鼠标点** `.thread-input button`。
2. `.tmp/e2e-r111-a1-focus.mjs` 的 B2（流式中 `Ctrl+P` 开快速打开）在第 132 轮 `foreignTyping` 守卫后恒 UNVERIFIED：焦点在 `.rail-chat-input` 时 `Ctrl+P` 被有意吞掉。HEAD 相复跑同值可证，别当回归。
3. mock 流 3 字 / 20 ms ≈ 350 ms，点发送后 180 ms 采样已接近收尾；另记 60 ms 采样才能把「先移焦」（点击瞬间）与「收尾回焦」（约 350 ms）分开。
