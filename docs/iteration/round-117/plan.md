# 第 117 轮计划 — 「对话 401 后残留空助手气泡」= B-243 重复（复测 + 去重）

> 单轮，只做这一条，3 任务。结论先行：HEAD `4d8326c` 已由第 113 轮 B-243（`531b650`）修掉；题述证据是修复前的
> r112 快照，行号也是 r112 布局。本轮只拿 HEAD 证据 + 登记去重；只有复测红才转 A3 修。

## 0. 基线（HEAD `4d8326ce`，本轮实测）

- `npm run verify -- --max 320000` PASS：门 gzip **315,509 B**（raw 1,023,714、files 3），距硬线 320,000 余
  **4,491**，超内部 310,000 共 5,509（WARN）。
- B-229 口径：315,509 + `MarginRail-*.js` gzip9 **7,392** = **322,901**（超硬线 2,901，B-229 仍 open，本轮不动）。
- 任务书的「312,423 / 余 7,577」是第 93–94 轮旧数，本轮按实测。
- 现状：`chat.ts:80` 导出 `dropEmptyAssistantTail`；`MarginRail.tsx:18` import、`:220-226` 的 catch 内
  `setTurns((previous) => dropEmptyAssistantTail(previous))`；`chat.test.ts:121/143` 共 **23 条**。
- 时序：`.tmp/r112-finder-ui2.json` 写于 **09:22**，修复提交 `531b650` **10:25**；题述 `:188/:205-207/:716`
  现为 `:203/:220-226/:774`。`shots/round-112/chat-401-empty-bubble.png` 是同一条。

## 1. 体积

- A1/A2 不改产品代码（只 `chat.test.ts`，测试不进包）→ 首屏净增 **0 B**。
- A3（仅红时）：移 catch 内 1 行；该组件在常驻懒 chunk → 门 **±0**、chunk ≤ **+28**（7,392 → ≤7,420）。
- 门上限 `--max 315800`（净增 ≤ +291）；合计上限 322,931（缺口归 B-229）。

## 2. 任务

### A1 复测：HEAD 上 401 不再留空泡

文件：`.tmp/e2e-r117-chat-401.mjs`、`.tmp/r117-chat-401.json`、`shots/round-117/`（≤1 张）。

1. 复制 `.tmp/e2e-r113-chat-401.mjs`，只改输出（`shots/round-117`、`.tmp/r117-chat-401.json`、文件头注释）；
   装配段（假 FSA、假 Key、假 401 路由、1440×900）原样借，不要自造。
2. **先验交付模块**：`fetch('/src/components/MarginRail.tsx')` 文本含 `dropEmptyAssistantTail` 必须 `true`；
   否则 `touch` 该文件后 reload 再测（AGENTS 第 8 节坑）。
3. 发「这一句会 401」→ `.rail-chat-turn` 恰 **1** 且全 `is-user`、`.is-assistant` **0**、`role=log` 空文本子元素
   **0**（先 strip `我：/侧灯：`）、`.rail-chat-error` 含「API Key 无效」且不在任何 turn 内、`aria-busy=false`、发送钮可用。
4. 补两格：连发两次 401 → 2 条全 user；「新对话」→ 0 条、错误消失。
5. **判别力负向对照（不碰 src）**：同一判空函数喂 `.tmp/r112-finder-ui2.json` 的 `data.error401.turns`
   （4 条、末条 `text:''`、`h:16`）→ 必须判**红**，证明断言不是恒绿。

验收：a–e + 负向对照全 OK、0 pageerror；`node --check` exit 0；
`git status --porcelain shots/round-112 shots/round-113` 为空（不覆盖历史证据）。

### A2 登记去重 + 回归夹具

文件：`docs/iteration/BACKLOG.md`、`src/lib/chat.test.ts`、`docs/iteration/round-117/impl.md`。

1. `chat.test.ts` +**1**（23→24）：夹具 `turns(user,user,user,assistant '')` → 回 3 条、末条 `user`、
   与前三条逐项相等（固化 `error401.turns[3]` 的形状）。
2. B-243 `fixed` → **`verified`**，行尾补第 117 轮 HEAD 复测（脚本/JSON/截图路径）+ 一句「第 117 轮条目为本条
   重复：证据 09:22 早于 `531b650` 10:25，题述行号是 r112 布局」。**不新增条目、不动 B-246**。
3. 门禁：`npm test` **62 文件 896 条** 0 fail；`verify --max 315800` exit 0、门 ≤315,800（预期 315,509、Δ 0）；
   `roundtrip` 不跑；`CHANGELOG`/`README`/`STATE` 不动（无产品改动，`changelog.test.ts` 仍 29–116）。

### A3 条件任务（只在 A1 红时做，预计不触发）

文件：`src/components/MarginRail.tsx`（只 `:220-226`）、`src/lib/chat.test.ts`。

1. 取最小改法：把 `setTurns((previous) => dropEmptyAssistantTail(previous))` 提到
   `if (!aborted && aliveRef.current)` 外（`if (aliveRef.current) setTurns(…)`），或按现场根因改成错误行（取小）。
2. 静态门同步：`dropEmptyAssistantTail(` 恰 1 处、在 `catch (error)` 后 ≤400 字符、函数式、闭包写法 0；
   `git stash` 该行必红。
3. 验收：A1 全绿 + 896 条 + `verify --max 315800`；报告记门/chunk/合计三数。

## 3. 不做

- 不修 B-246（200 但 0 字留空泡，P2 另轮，先定文案）、B-244/B-233/B-238/B-248。
- 不改 B-229 口径（门是否计常驻 chunk 由 lead 定）；不加依赖、不 push、不改 `release/`、不重启 server。
- 不把错误文案改成气泡内容（第 113 轮已定「撤占位 + `.rail-chat-error`」形态），不改 turn 底色/边框/字号。

## 4. 风险

- R1 「重复」判错（长开 CDP 跑旧模块）：以 A1 第 2 步交付校验为准，`false` 不算数。
- R2 假 401 路由与真实请求路径不符：沿用 r113 已验证的装配，别新造 URL/SSE 格式。
- R3 覆盖历史证据：输出必须落 `.tmp/r117-*` 与 `shots/round-117/`，跑后按 A1 查 `git status`。
- R4 抄旧数：门写 315,509、测试写 896 条，与命令输出逐字对。
- R5 A1 绿但 tester 复跑红：B-243 回 `open`，按 A3 修，不留 `verified`。

## 5. tester 独立验收

自写 `.tmp/r117-tester-401.mjs`（不读 `impl.md` 的断言），重跑 401 与负向对照；复核 24/24、静态门 3 项、
896 条、门与 chunk 三数、`git diff --stat` 只 `chat.test.ts`+`BACKLOG.md`（A3 触发才多 `MarginRail.tsx`）；
确认 B-243 的 `verified` 与去重说明逐字。
