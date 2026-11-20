# 第 117 轮执行报告（B-243 复测 + 登记去重）

结论：A1 **9/9 全绿**、A2 完成、A3 **未触发**（A1 无红）。产品代码 0 改动，首屏净增 **0 B**。

## A1 复测 HEAD 上 401 不再留空泡（PASS）

- 脚本 `.tmp/e2e-r117-chat-401.mjs`（复制 r113 装配段，只改输出 + 加 d1/c2/f 三格），ego CDP 57270、1440×560。
- 产物 `.tmp/r117-chat-401.json`、截图 `shots/round-117/chat-401-no-bubble.png`（45,047 B）。
- **9/9**：d1 dev 交付模块含整串 `setTurns((previous) => dropEmptyAssistantTail(previous))`（`dropEmptyAssistantTail(` 恰 1 处、122,397 字符，first=true 未 touch）；S0 空态 + mock 1；a 401 → turn **1** / assistant **0** / `role=log` 空文本子元素 **0**（先 strip 署名）/ `.rail-chat-error` 含「API Key 无效」且 `.rail-chat-turn .rail-chat-error` **0** / `aria-busy=false` / 有草稿时发送钮可点；b 连发两次 401 → 2 条全 user；c 假 SSE → assistant 1 =「看到啦」；c2（plan-review C1）成功回答后再 401 → 5 条（4 user + 1 成功）、末条 user；d「新对话」→ 0 条且错误消失；f（C3）同一判空谓词对 r112 的 4 条判**红**（`r112HasEmpty:true`、末条 `text:""`/h 16）、对 A1 现场判绿；e 0 pageerror。
- `node --check` exit 0；`git status --porcelain shots/round-112 shots/round-113` 为空（未覆盖历史证据）。
- 偏差：「发送钮可用」按「busy 已落 + 有草稿时可点」验。401 收尾会清空输入，而 `disabled={busy || !chatDraft.trim()}`（第 96 轮设计），直接读 `disabled` 必然假红。

## A2 登记去重 + 回归夹具（PASS）

- `src/lib/chat.test.ts` 23→**24**：历史形状夹具（plan-review C2）`[user「把结论提前」, assistant「第 1 行：回答内容」, user「这一问会 401」, assistant ""]` → 回 3 条、末条 user、前三条 `deepEqual`。
- `docs/iteration/BACKLOG.md` B-243 `fixed`→**`verified`**，行尾写第 117 轮 HEAD 证据 + 「**第 117 轮条目为本条重复**：证据 09:22 早于 `531b650` 10:25，题述行号是 r112 布局」，轮次列 `112/113/117`；不新增条目、B-246 未动。
- 观察（未改）：该行 HEAD 起就有 9 个 `|`（`:728` 的 `turn.text ||` 没转义），非本轮引入，按计划不动。
- 门禁：`npm test` **62 文件 896 条 0 fail**；`npm run verify -- --max 315800` exit 0 **PASS** 门 gzip **315,509 B**（raw 1,023,714、files 3、余 291、**Δ0**）；`MarginRail-*.js` gzip9 **7,392 B**（不变）、B-229 口径合计 **322,901**（超硬线 2,901，B-229 仍 open）；`roundtrip` 未跑（未动编辑器/序列化）；CHANGELOG/README/STATE 未动（`changelog.test.ts` 仍 29–116 通过）。

## A3 条件任务

未触发（A1 全绿）。`src/components/MarginRail.tsx` **0 改动**，静态门仍 24/24 通过。

## 改动文件

- `src/lib/chat.test.ts`（+20 行，1 条 test）
- `docs/iteration/BACKLOG.md`（B-243 一行）
- 新增：`.tmp/e2e-r117-chat-401.mjs`、`.tmp/r117-chat-401.json`、`shots/round-117/chat-401-no-bubble.png`、本文件
- `git diff --stat`：2 文件 21+/1−；`src/` 下只有测试文件，产品代码 0 改动

## CHANGELOG 一行建议

无（本轮无产品改动；B-243 归 0.32.1 `## Unreleased` 的第 113 轮条目，不另写）。

## 新踩坑

1. 验「401 后发送钮可用」不能直接读 `.rail-chat-send.disabled`：`disabled={busy \|\| !chatDraft.trim()}`，401 收尾清空输入，空输入按设计就是 disabled → 假红。要 `fill` 一句再读，读完清回去。
2. 沙箱里 `node --test <file>` 会 exit 1 `EPERM spawn`（子进程 piped stdio）；单文件验证走 `npm test` 链里的 `node --experimental-strip-types <file>`。
