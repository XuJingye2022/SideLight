# 第 117 轮独立验收（tester）

判定 **PASS**。HEAD `4d8326ce` 上 B-243（401 空助手气泡）复测全绿；本轮条目确认为 r112 侦察的重复，`verified` 成立；A3 条件任务未触发（产品代码 0 改动）。

## A1 复测：401 不留空泡

自写 `.tmp/r117-tester-401.mjs`（未读 `impl.md`；ego CDP 57270、1440×900、自造假 FSA/假 Key/假 401 路由），`.tmp/r117-tester-401.json` **8/8**、0 pageerror：

- d1 交付模块：`fetch('/src/components/MarginRail.tsx')` 实取 122,397 字符，含整串 `setTurns((previous) => dropEmptyAssistantTail(previous))`（`dropEmptyAssistantTail(` 恰 1 处），`chat.ts` 导出该函数；首测即 true，无需 touch。
- a 单次 401：`.rail-chat-turn` **1**、`is-user` 1、`is-assistant` **0**、`role=log` 空文本子元素 **0**（先 strip `我：/侧灯：`）、错误文案「API Key 无效或没有权限。……」不在任何 turn 内、也不在 log 内、`aria-busy=false`、有草稿时发送钮 `disabled=false`；turn 高 35 px。
- b 连发两次 401：**2 条全 user**、assistant 0、空子元素 0、错误仍在。
- d「新对话」：0 条、错误消失、busy=false。
- e：0 pageerror / 0 console error。
- 截图 `shots/round-117/tester-401-no-bubble.png`。executor 交付脚本 `.tmp/e2e-r117-chat-401.mjs` 的 `.tmp/r117-chat-401.json` 亦为 9 检查、`red: []`、0 pageerror、交付校验 true。

判别力负向对照（不碰 src）：`f1` 同一谓词 `hasEmptyAssistant` 对 `.tmp/r112-finder-ui2.json` 的 `error401.turns`（4 条，末条 `{role:'assistant',text:'',h:16}`）判**红**、对 A1 现场判绿；`f2` 从 dev server 动态 import 交付的 `dropEmptyAssistantTail`，对 r112 形状回 3 条、前三条逐项相等、末条 user（若误吞会红），无空尾巴时返回同一引用。

## A2 登记去重与回归夹具

- `src/lib/chat.test.ts` **23→24 条**（`ℹ tests 24`），新增 1 条：4 条历史形状撤成 3 条、末条 user、`deepEqual` 前三条；全量 `npm test` **62 文件 896 条 896 pass 0 fail**（`.tmp/r117-tester-npm-test.log`）。
- `docs/iteration/BACKLOG.md` 的 B-243 改 `verified`，行尾写第 117 轮 HEAD 复测证据与去重说明（「第 117 轮条目为本条重复」，r112 快照 09:22:41 早于修复 `531b650` 10:25，题述行号是 r112 布局）。`git diff --stat` 仅这 2 个文件（+21/−1），**未新增条目、B-246 未动**。
- 门：`npm run verify -- --max 315800` exit 0 **PASS**，`total raw=1023714 gzip=315509 headroom=291 files=3 max=315800`，对轮前基线 315,509 **Δ0**（内部预算 gap −5,509 只 WARN）。A1/A2 不动产品代码，净增 0。
- `roundtrip` 未跑；`CHANGELOG`/`README`/`STATE` 未动，`docs/CHANGELOG.md` 标题仍「第 29–116 轮」，`changelog.test.ts` 全过。

## A3 条件任务

未触发：A1 全绿，`MarginRail.tsx`/`chat.ts` 与 HEAD 逐字节相同（`git diff --name-only` 只有 BACKLOG 与测试）。

## 其它门与回归

- `node --check`：`.tmp/r117-tester-401.mjs`、`.tmp/e2e-r117-chat-401.mjs` 均 exit 0。
- `git status --porcelain shots/round-112 shots/round-113` 为空（跑前后都对）；本轮截图 2 张（≤2）。
- 回归：`r96-tester` 对话页签 **42/42**（`.tmp/r117-tester-r96.log`）、`r112-tester` 滚动 **10/10** 0 pageerror（`.tmp/r117-tester-r112.log`、`.tmp/r117-tester-r112-scroll.json`）；两条脚本会写历史截图，跑完已 `git checkout -- shots/round-96 shots/round-112` 还原。

## 偏差（不判 FAIL）

A2 夹具用 `[user'问', assistant'答', user'再问', assistant'']`，不是计划字面的 `user×3`——这是 `plan-review.md` C2 明确要求的「按 r112 证据形状」，覆盖「已有成功回答不被连带撤掉」更强；任务书字面的 `user,user,user,assistant ''` 形状已由 `f2` 直接喂交付函数独立覆盖（回 3 条、末条 user、前三条相等）。

## 交付物

`.tmp/e2e-r117-chat-401.mjs`、`.tmp/r117-chat-401.json`、`.tmp/r117-tester-401.mjs`、`.tmp/r117-tester-401.json`、`shots/round-117/chat-401-no-bubble.png`、`shots/round-117/tester-401-no-bubble.png`、`docs/iteration/round-117/{plan.md,plan-review.md,impl.md,test.md}`。
