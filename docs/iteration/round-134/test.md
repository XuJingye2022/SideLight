# 第 134 轮测试报告（tester 独立验收）

参数：round 134、startSha `bd8004010b8c03e09b451bf5d707cc85e2708401`、报告 `docs/iteration/round-134/`。tester 未读 `impl.md`，只按 `plan.md` 验收标准、`git diff` 与 BACKLOG 复验。判定：**PASS**。

## 1 门禁（本机实跑）

| 项 | 结果 | 证据 |
| :--- | :--- | :--- |
| `npm run build` | exit 0；tsc + vite build + host-www 镜像 99 文件 3,958,068 B | 终端；stderr 仅既有 chunk 体积 warning |
| `node --experimental-strip-types src/lib/chat.test.ts` | **32/32 pass、0 fail** exit 0 | 终端 |
| `npm test` | **68 文件 952 条 0 fail**（逐个 `tests N` 汇总 952、`fail` 汇总 0） | `.tmp/r134-tester-npm-test.log` |
| `measure-first-screen --max 316400` | **exit 0 PASS**，gzip **316,137 B**（raw 1,025,609、files 3、target gap −6,137 只 WARN） | 同上输出 |
| `MarginRail-*.js` gzip9 | **7,992 B**（`MarginRail-Dc6iBNG5.js` raw 22,712，门槛 ≤8,060，余 68） | `node zlib.gzipSync(level 9)` |
| B-229 口径 | 316,137 + 7,992 = **324,129** > 320,000，仍 `open`（本批只记 Δ） | 计算 |
| `roundtrip` | 未跑（未动编辑器/序列化） | plan |

A1 条件成立：`src` 侧仅 `MarginRail.tsx`（产品）与 `chat.test.ts`；`chat.ts`/`App.tsx`/`styles.css` 0 行。

## 2 A1 修两处焦点（代码复验）

- `send()` 的 `inputRef.current?.focus()` 位于 `setTurns(...)`/`setBusy(true)` 之前（`MarginRail.tsx:240` 对其 `:246`）。
- finally 判据 `focusInPanel = !!panel?.contains(document.activeElement) || document.activeElement === document.body`（`:277`），谓词仍 `chatRefocusAfterStream(controller.signal.aborted, focusInPanel)`。
- 追问：点击先 `threadInputRef.current?.focus()` + `threadRefocusRef.current = annotation.id` 再 `onDiscuss`（`:802-803`）；`<input ref={threadInputRef}>`（`:784`）；新增 `useEffect([discussingId])`（`:222-234`）在 `want === openThread` 且焦点为 body 或 `#rail-panel-notes` 内时回焦并清意图。

## 3 A2 静态门与负向（独立复跑）

- 静态门 32 条含：两处 focus 恰 2、`indexOf` 早于 `setBusy(true)`、第二处含 `chatRefocusAfterStream(`+`controller.signal.aborted`、`focusInPanel` 含 body 豁免；追问门（声明/`ref=` 各 1、`threadInputRef.current?.focus()` 恰 2、意图赋值 1、effect 依赖 `[discussingId]` 且含 `openThread`）。
- 负向 A（删前置 focus 行 240）：**恰 1 红 exit 1**（`focusLines.length` actual 1 / expected 2）。
- 负向 B（把前置 focus 挪到 `setBusy(true)` 之后）：**恰 1 红 exit 1**（顺序断言 `false`）。
- 两次还原后 SHA256 恒 `B2199250495997EAA393E23A344DE27DA85262D963475C1B7F08251F255C2A10`；负向脚本 `.tmp/r134-tester-neg-mutate.mjs`。

## 4 A3 真机 before/after（ego CDP 57270、1440×900、dev 5175 未重启）

自写 `.tmp/r134-tester-focus.mjs`（假工作区 2 篇、无 Key mock、mock 分析 3 卡），每相先 `node .tmp/reset.mjs 57270`。

- **before**（`git stash push -- src/components/MarginRail.tsx`；身份门 `threadInputRef` **0**、`chatFocus` 1、body 豁免 0）：**9/9 PASS、0 pageerror**（`.tmp/r134-tester-before.json`）：点 `.rail-chat-send` 后 180 ms 与 `aria-busy=false` 后 `activeElement=BODY`；点 `.thread-input button` 后 180 ms 与 `[AGENT]` 到齐、`in-progress` 后均 `BODY`。stash pop 后文件 SHA256 与轮前相等、`git stash list` 0。
- **after**（身份门 `threadInputRef` **4**、body 豁免 2、`chatFocus` 2）：**12/12 PASS、0 pageerror**（`.tmp/r134-tester-after.json`）：S1 两处均 `TEXTAREA.rail-chat-input`；S2 两处均 `.thread-input input`；S3 发送后 60 ms 焦点在输入框、流式中点 `.ProseMirror p` 收流后焦点仍在正文（body 豁免没有越过「读者走开」）；线程真跑过（2 条、`[AGENT]` 1、`in-progress`）。截图 `shots/round-134/chat-focus-after.png`（本轮仅此 1 张）。

## 5 回归

- `OUT=.tmp/r134-tester-r111-focus.json node .tmp/e2e-r111-a1-focus.mjs`：**`allPass:true`**（B2 仍 UNVERIFIED，与 HEAD 同值），0 pageerror。
- `node .tmp/e2e-r98-a1-agent.mjs`：**36/36 PASS exit 0**、0 pageerror。跑后 `git checkout -- shots/round-98/`。
- r111 跑后覆盖的 `shots/round-111/focus-after-switch.png` 已还原，工作树无残留截图。

## 6 偏差与 UNVERIFIED

- 偏差（不判 FAIL）：任务书写 r98 **38/38**，该脚本自身只有 **36** 条断言（exit 0、0 fail，总条数以脚本为准）；after 身份门 body 豁免实测 **2**（`focusInPanel` 与追问 effect 各 1），首版探针按 `===1` 误判、改为 ≥1 后 12/12——产品行为无问题。
- UNVERIFIED：真 WebView2 宿主、真实中文输入法与真实前端主机下的同一焦点行为（本轮只测 Edge 157 + dev server）；追问 effect 里「焦点在 `#rail-panel-notes` 内」分支与 body 分支在 S2 中同时成立，未单独隔离。

BACKLOG：B-264 状态 `fixed`（证据指本轮 JSON/截图与轮 134）。见 `docs/iteration/round-134/test.md`。
