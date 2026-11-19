# 第 98 轮 tester 验收（[AGENT] 线程回复，B-225）

未读 `impl.md`；只读 `plan.md`、`git diff`、`BACKLOG.md`，按验收标准从零复验。轮前 `8733899`。

## 结论：PASS

## 门禁（各跑一次）
- `npm test`：**58 文件 810 条 0 fail**（逐文件求和；`annotations.test.ts` 37/37，34→37）。`.tmp/r98-tester-npmtest.log`
- `npm run verify` **PASS**：raw 1,017,238 / gzip **313,888** / headroom 6,112（`.tmp/r98-tester-verify.log`）；build 链 0 错。
- `node scripts/measure-first-screen.mjs --max 315000` → **PASS exit 0**，同 gzip 313,888。净增 **+200 B**（轮前 313,688 → 313,888），硬线余 6,112 B。
- `changelog.test.ts` **3/3**：标题 `## Unreleased（第 29–98 轮，未发版）` = 正文最大轮次 98。
- 不跑 roundtrip（未动编辑器 / 序列化）。

## A1 数据层
- `node --experimental-strip-types src/lib/annotations.test.ts` → `tests 37 / fail 0`。
- 静态：`AGENT_PREFIX|agentReply|threadText|reviewStatusOnReply` 改前（`8733899`）**0 行 exit 1** → 现在 **33 行**；`[AGENT]` 改前 **0 行** → **13 行**。
- 自写探针 `.tmp/r98-tester-probe.ts` **6/6**（不复用交付单测）：只有前缀的串不双加（`[AGENT]`、`[AGENT]紧贴`）、空白/换行回 `''`、`threadText` 的 user 原样（含首尾空白与换行）、`reviewStatusOnReply` 四态 + 旧三态 + 大写 + 非字符串共 17 值全 `in-progress`、带 4 条 `[AGENT]` 线程的 store 往返 `deepEqual` 且序列化里前缀恰 2 次、非法 `reviewStatus` 归一 `open`（第 97 轮口径）。

## A2 接线
- `npm run build` exit 0（含在 verify 内）。
- `MarginRail.tsx:361` 使用 `threadText(turn)` **恰 1 处**（另 import 1 行）；空文本仍走 `.thread-typing`（E2E MutationObserver 抓到 1 次）。
- `App.tsx` 的 `discuss`：`await streamChat` 成功（`:1964-1981`）后、`catch`（`:1995`）前一次 `setAnnotations`（`:1983-1994`）；只处理 `item.id === id`、末条须非空 assistant、`reply === ''` 早退；写 `agentReply` 与 `reviewStatusOnReply`。抛错跳过该块（失败/Abort 不进）。
- `App.tsx` 两函数各 2 处：import `:51`/`:60` + 调用 `:1989`/`:1992`。
- `git diff --stat -- src/styles.css` 空；`select.note-status` 块（`MarginRail.tsx:320-341`）与 HEAD 逐字相同（仅因 import 行号 +1）；`discuss` 依赖数组 HEAD `:1988` → 现在 `:2003`，内容仍是 `[editor, settings, discussingId]`。

## A3 E2E（自写 `.tmp/r98-tester-agent.mjs`，ego CDP 57270、1440×900）
**38/38 PASS、0 pageerror**，`.tmp/r98-tester-agent.json`；夹具与第 97 轮同源（3 段、假 FSA）。
1. ① 分析第 2 段出 3 卡，全 `open`、全无 `.thread`。
2. ② 第 1 卡追问「这句为什么要改？」→ 1 条 `.thread-user`（无前缀）+ 1 条 `.thread-assistant`（`[AGENT] ` 开头、含「模拟回复」），`.thread` 内 `[AGENT]` 恰 1 次，状态 `in-progress`。
3. ③ 1,600 ms 后 store 3 条；该条 `reviewStatus=in-progress`、`thread[0]` 是 user、`thread[1]` 带前缀，引文与第 1 卡一致。
4. ④ 再追问 → 4 条、2 条 assistant 各恰 1 前缀、`[AGENT] [AGENT]` 0 次、状态仍 `in-progress`；落盘 4 条、无空回复。
5. ⑤ 切 `other.md` 再回 → 线程 4 条、前缀 2 次、状态 `in-progress`、user 发言仍无前缀。
6. ⑦（本人追加）置 `resolved` → 卡 `is-closed`、正文不再高亮该引文；追问后状态回 `in-progress`、`is-closed` 消失、`.annot` 高亮回来、线程 6 条 3 前缀、落盘一致——「四态都收」在真实接线成立。
7. ⑥ 第 2/3 卡无线程仍 `open`；对话页签发一句得 1 user + 1 assistant，模拟回复**不含** `[AGENT]`；`.margin-rail` / `.doc-scroll` 横溢 0；3 卡 `worstOverlap=0`（不重叠），带线程第 1 卡高 461 vs 170/152。
- 截图 `shots/round-98/agent-thread.png`（本人检视：3 卡、第 1 卡 In progress、6 条线程里 3 条 `[AGENT]`）。

## 回归
- `.tmp/e2e-r97-a1-status.mjs`（同一 rail 的四态 / 采纳 / 几何）**44/44 PASS、0 pageerror**；跑完 `shots/round-97/` 无改动。

## 偏差（不判 FAIL）
1. `threadText` 落在 `MarginRail.tsx:361` 而非 plan 的 `:360`（新增 import 使行号整体下移 1）；使用处仍恰 1。
2. plan 的 A3 只要求 `open → in-progress`；我另加 `resolved → in-progress` 场景作为四态接线的独立证据。

## UNVERIFIED
- 真实模型回复（无 Key，只有 mock 流）；失败/中断路径只按代码读（在 `try` 内 `await` 之后，抛错跳过），未造真机失败；真 WebView2 宿主、真实中文 IME；CDP 9222–9226 不可用（真机走 57270）。
