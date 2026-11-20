# 第 134 轮计划（P1：两处「发送」鼠标点后焦点掉 BODY）— 单轮

参数：round 134；startSha `bd8004010b8c03e09b451bf5d707cc85e2708401`（HEAD 同值、工作区干净）；报告 `docs/iteration/round-134/`。只做 BACKLOG 的 B-264（用户队列第 3 条对话区的焦点段）。

## 现状（行号本轮核对）
- 对话：`:887` 的 `disabled={busy || !chatDraft.trim()}`；`send()` 在 `:225` 清稿、`:227` 置 busy → 钮置灰，Chromium 把焦点还给 `body`；`:256-258` 用 `panel.contains(activeElement)` 判 → 读到 body → 不回焦。
- 追问：`:778` 的 `disabled={discussingId === annotation.id || …}`，点击 `:779-782` 调 `onDiscuss` + 清稿 → 同样置灰；该路径无回焦代码。
- 回车路径焦点留在 `textarea`（对照）→ 根因是「焦点落在会被置灰的钮上」。

## 修法（不采纳 fix_hint 的「开始快照替代收尾判据」）
1. 先移焦再置灰：`send()` 里 `inputRef.current?.focus()` 放 `setTurns`(`:224`) 之前；追问点击里 `threadInputRef.current?.focus()` 放 `onDiscuss` 之前（新增 ref，同时只开一条线程）。
2. 收尾补「丢焦点」：`focusInPanel = !!panel?.contains(document.activeElement) || document.activeElement === document.body`。只有 body 豁免；点正文/文件树/快速打开得到具体元素 → B-240 不回归。
3. 追问补回焦：`threadRefocusRef` 存 `annotation.id`，`useEffect([discussingId])` 回 `null` 且意图 id 等于 `openThread`、焦点在 `#rail-panel-notes` 或 body 时 `threadInputRef.current?.focus()`，再清意图。
4. `src/lib/chat.ts` 不改：谓词语义不变，两参真值表（`:224-229`）仍成立。

## 0 体积（实测）
- 今日 dist（第 133 轮构建）：门 gzip **316,135 B**（距硬线余 3,865）；懒 chunk `MarginRail-CA2BPyQ0.js` raw 22,309 / gzip9 **7,907**；B-229 合计 **324,042**（超线 4,042，仍 open，本批只记 Δ）。任务书的 312,423 B 是第 93 轮值。
- 产品码只动 `MarginRail.tsx`：首屏预计 **+0–2 B**（chunk 改名进 hash），chunk gzip9 预计 **+50–110 B**。验收：`verify` gzip ≤ **316,200**（`--max 316400` exit 0）、chunk ≤ **8,060**；硬线不破。

## A1 修两处焦点（产品码）
文件：`src/components/MarginRail.tsx`（唯一产品文件）
1. `:174` 后加 `threadInputRef`、`threadRefocusRef`。
2. `send()`：`inputRef.current?.focus()` 在 `setTurns` 前；finally 加 `active` 变量，`focusInPanel` 按修法 2，谓词保留 `controller.signal.aborted`。
3. 追问点击：先 `threadInputRef.current?.focus()`、`threadRefocusRef.current = annotation.id`，再 `onDiscuss`/`setDraft('')`/`onRequestLayout()`；Enter 分支不动。
4. `<input>`(`:763`) 加 `ref={threadInputRef}`。
5. 新 `useEffect([discussingId])` 按修法 3 回焦；注释写「先移焦再置灰」「body = 丢焦点」。
验收：`npm run build` exit 0；`git diff --stat` 只 1 个 `src/` 文件；静态门由 A2 落地。

## A2 单测与静态门
文件：`src/lib/chat.test.ts`（现 31 条；全仓 68 文件 951 条）
1. 改 `:231-237` 门：`inputRef.current?.focus()` 由「恰 1」改「恰 2」；第一处（`indexOf`）早于 `setBusy(true)`，第二处含 `chatRefocusAfterStream(` + `controller.signal.aborted`。
2. 同条加 `focusInPanel` 含 `document.activeElement === document.body`；真值表原样。
3. 新增 1 条追问门：`threadInputRef` 声明/`ref=` 各 1；`threadInputRef.current?.focus()` 恰 2；`threadRefocusRef.current = annotation.id` 1；effect 依赖 `[discussingId]` 且含 `openThread` 守卫。
4. 负向两条：删前置 focus → 1 红；挪到 `setBusy(true)` 后 → 1 红；SHA256 备份还原。
验收：`node --experimental-strip-types src/lib/chat.test.ts` 31→32 全绿；`npm test` **952 条 0 fail**（实跑为准）。

## A3 真机 before / after + 门禁
文件：`.tmp/e2e-r134-focus.mjs`（底：`.tmp/e2e-r111-a1-focus.mjs` 的 slowMock/身份门 + `.tmp/e2e-r98-a1-agent.mjs` 的假 FSA/3 批注）、`shots/round-134/chat-focus-after.png`。
1. 每相 `node .tmp/reset.mjs 57270`；CDP 57270、1440×900、dev 5175 不重启。
2. **before**：`git stash push -- src/components/MarginRail.tsx`；身份门 `threadInputRef`=0；S1 点 `.rail-chat-send` → 180 ms 后 `activeElement=BODY`，mock 到齐、`aria-busy=false` 后仍 BODY；S2 开第 1 卡 `.thread-input`、填、点其 `button` → 180 ms 与 `[AGENT]` 到齐、in-progress 后均 BODY。`git stash pop` 后 SHA256 相等、`git stash list` 0。
3. **after**（身份门 ≥3）：S1 180 ms 与收流后都是 `TEXTAREA.rail-chat-input`；S2 180 ms 与 `[AGENT]` 到齐后都是 `.thread-input input`；S3 不抢：发送后 60 ms 点 `.ProseMirror p`，收流后焦点仍在正文；0 pageerror；截图 1 张。Tab 落点不作断言（置灰后输入框之后无可用站，两相差 0）。
4. 回归：`OUT=.tmp/r134-r111-focus.json node .tmp/e2e-r111-a1-focus.mjs` 全 PASS；`node .tmp/e2e-r98-a1-agent.mjs` **38/38**，跑后 `git checkout -- shots/round-98/`。
5. 门禁：`npm test` 952 条 0 fail；`measure-first-screen --max 316400` exit 0、gzip ≤316,200；chunk gzip9 ≤8,060；`roundtrip` 不跑。
6. 收尾：`docs/iteration/round-134/{plan,impl,test}.md`；BACKLOG 的 B-264 改 `fixed`（证据指本轮 JSON/截图、轮 134）。

## 风险
- WebView2 若仍 blur：after 红。先看真机数据，必要时才加「开始快照」且用 AND，不做无条件回焦。
- Vite 交付旧模块：身份门 0/≥3 判；不符先 touch 再 fetch，不改代码。
- 体积越线先删注释，不砍行为。

## 不做
- 不动 `chat.ts`/`App.tsx`/`styles.css`/编辑器/序列化；不碰「新对话」「生成批注」的同类置灰。
- 不改 Tab 顺序；不 push、不建 Release、不改 `release/`、不重启 5175。
