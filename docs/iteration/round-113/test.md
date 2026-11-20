# 第 113 轮 tester 独立验收（B-243）

判定：**PASS**（未读 `impl.md`；轮前 startSha `9e4990c`）。

## 1. 门禁与体积
- `npm run verify -- --max 316000` **PASS**：`total raw=1022532 gzip=315218 headroom=782 files=3 max=316000`、`target=310000 gap=-5218`；距硬线 320,000 余 **4,782 B**，净增 **+5**（改前 315,213，取第 112 轮 B-245 记录）。日志 `.tmp/r113-verify.log`。
- `npm test` **62 文件 884 条 0 fail**（逐文件 `ℹ tests` 求和；日志 `.tmp/r113-npm-test.log`）。改 CHANGELOG 标题后再跑一次同值（changelog 机械门）。
- `npm run roundtrip` 未跑：未动编辑器 / Markdown 序列化。

## 2. A1 代码改动（从零复验）
- `git diff --stat` 只 4 文件：`src/lib/chat.ts` +13、`src/components/MarginRail.tsx` 8+/3−、`src/lib/chat.test.ts` +52、`docs/iteration/BACKLOG.md` 3+/1−（A3 要求）；无其他源文件改动。
- `chat.ts:80-84`（doc 注释 :73-79）在 `appendDelta`（:67-71）后新增导出纯函数 `dropEmptyAssistantTail`：末条不存在 / 非 assistant / `text` 非空 → `return turns`（同一引用）；否则 `turns.slice(0, -1)`。
- `MarginRail.tsx`：`:18` import；`catch (error)`（`:213`）里 `if (!aborted && aliveRef.current) { setChatError(...); setTurns((previous) => dropEmptyAssistantTail(previous)) }`（`:216-219`）。静态计数：`dropEmptyAssistantTail(` 全文件 **恰 1 处**（`:218`，catch 后 5 行、<400 字符）；`setTurns(dropEmptyAssistantTail(turns))` **0 处**；渲染 `:728` 仍 `turn.text || (busy && turn.role === 'assistant' ? '…' : '')`。
- 改前对照：`.tmp/r112-finder-ui2.json` 的 `data.error401.turns` 末条 `{role:"assistant",text:"",h:16}`（h 16 px 即本轮要撤的空框）；HEAD 行号 `:196`（占位）/`:213-215`（catch 只 `setChatError`）与 BACKLOG 更正一致。

## 3. A2 单测
- `node --experimental-strip-types src/lib/chat.test.ts`：`tests 20 / pass 20 / fail 0`；HEAD 副本（`git show` 写 UTF-8）计 `^test(` = **18** → 新增 2 条即纯函数与静态门。
- 静态门内容核对（逐字读文件）：读 `src/components/MarginRail.tsx`，断 `dropEmptyAssistantTail(` 恰 1、`catch (error)` 后 ≤400 字符含之、函数式正则、闭包写法 0、渲染区 `turn.text ||` 与 busy 的「…」仍在。

## 4. A3 真机证据
- 交付脚本 `.tmp/e2e-r113-chat-401.mjs`（ego CDP **57270**、dev 5175、1440×560、假 FSA、假 fetch 401 / 假 SSE）tester 现场重跑：**a–e 全 OK、0 pageerror**（`.tmp/r113-chat-401.json`、`.tmp/r113-e2e-run.log`）：
  - a 401 后 `count 1`、`assistants 0`、`role=log` 空文本子元素 **0**、`.rail-chat-error` 含「API Key 无效」、`aria-busy=false`；
  - b 连续两次 401 后 **2 条全 user**（函数式 `setTurns` 不吞上一轮）；
  - c 假 SSE 成功 → `assistant 1` = 「看到啦」、错误清空（撤占位不误删正常回答）；
  - d「新对话」→ 0 条、错误消失；e 0 pageerror。
- 截图 `shots/round-113/chat-401-no-bubble.png` **45,089 B**（仅此 1 张；脚本不写 `chat-401-empty-bubble.png`、不写 `shots/round-112`）；脚本开头 `mkdirSync('shots/round-113', { recursive: true })`（:9）。
- tester 独立探针 `.tmp/r113-tester-pure.ts` **10/10**（`.tmp/r113-tester-pure.log`）：纯函数 5 例（撤成原前缀且新引用 / 单条空 → `[]` / 有字 / 空数组 / 末条 user 均同一引用）+ 静态 4 门 + 改前证据 1。

## 5. 回归
- 跑前 `git checkout -- shots/round-96 shots/round-112`，两目录 `git status --porcelain` 为空。
- `.tmp/r96-tester-a1a2.mjs` **42/42**、`.tmp/r112-tester-a1-scroll.mjs` **10/10**，0 pageerror（两脚本会重写 `shots/round-96/rail-chat.png`、`shots/round-112/chat-scroll-follow.png`）。
- 跑后再次 checkout，两目录 `git status --porcelain` 仍为空。

## 6. BACKLOG / 记账
- B-243 → `fixed`：旧行号更正为 `:196` / `:213-215`；补本轮证据（`chat.ts:73-84`、E2E a–e、回归、门禁）；Deferred 仅新增 **B-246** 1 行（200 成功但流里 0 字仍留空 assistant，P2），无其他新条目。
- CHANGELOG 加第 113 轮小节、标题区间 29–112 → **29–113**；STATE 轮次表加一行。

## 7. UNVERIFIED / 已知边界
- 真模型 / 真 SSE（页面内假 fetch）、真实中文 IME、真 WebView2 宿主、原生打印：未跑（与本轮判据无关）。
- 200 成功但 0 字的空流仍留空占位，属 B-246（Deferred），本轮未处理、不判回归。
- 真机走 ego CDP 57270；未使用 9222–9226。
