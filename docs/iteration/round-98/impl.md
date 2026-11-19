# 第 98 轮实现（executor）· [AGENT] 线程回复（队列第 5 条 / B-225）

轮前 `8733899`。A1/A2/A3 完成，回滚 0 条；未 commit、未 push、未动 `release/`。

## 任务状态

| 任务 | 状态 | 落点 |
| :--- | :--- | :--- |
| A1 数据层 + 3 条单测 | 完成 | `annotations.ts`、`annotations.test.ts` |
| A2 接线 | 完成 | `MarginRail.tsx`、`App.tsx` |
| A3 E2E + 门禁 + 收口 | 完成 | `.tmp/e2e-r98-a1-agent.mjs`、本文件、`CHANGELOG.md` |

## 改动

- `annotations.ts`：`AGENT_PREFIX`、`agentReply`（`trim()` 后空白回 `''`、已带前缀原样、其余补一次）、`threadText`（assistant 走 `agentReply`，user 原样）、`REPLY_REVIEW_STATUS`（四键全 `in-progress`）、`reviewStatusOnReply`（先归一四态再查表）。
- `annotations.test.ts`：34→**37** 条（前缀幂等/空白；四态与非法值；带 thread 与 `in-progress` 的 store 往返）。
- `MarginRail.tsx`：`threadText` 恰 1 处调用（**第 361 行**，import 多一行使计划里的 360 顺移），空文本仍走 `.thread-typing` 的 `…`。
- `App.tsx`：import 两函数；`discuss` 在 `await streamChat(...)` 成功后、`catch` 前补一次 `setAnnotations`（`item.id === id`、末条必须非空 assistant、`agentReply` 后空串直接 return）。依赖数组仍 `[editor, settings, discussingId]`。

## 命令与结果

- `node --experimental-strip-types src/lib/annotations.test.ts` → tests **37** / fail 0。
- 静态门：四名 grep 改前 0（exit 1）→ **27 行**；`-nF '[AGENT]'` 0 → **13 行**。
- `npx tsc --noEmit` exit 0；`npm run build` exit 0。
- `npm test` → **58 文件 810 条 0 fail**（807+3；`.tmp/r98-impl-npm-test.log`）。
- `npm run verify` → PASS，raw **1,017,238** / gzip **313,888 B**（基线 313,688，净 **+200 B**；硬线余 6,112、超内部预算 3,888 只 WARN；`.tmp/r98-impl-verify.log`）。
- `measure-first-screen --max 315000` → headroom 1,112 / **exit 0**。
- `changelog.test.ts` → 3/3 过（标题 29–98 + 新小节）。
- 不跑 roundtrip（未改编辑器/序列化；`git diff --stat -- src/styles.css` 空）。

## E2E（A3）

`.tmp/e2e-r98-a1-agent.mjs`，ego CDP 57270、1440×900、假工作区照 r97：**36/36 PASS、0 pageerror**（`.tmp/r98-a1-agent.json`）。3 卡全 open 无线程；第 1 卡追问 → `.thread-user` 1 条无前缀、`.thread-assistant` 1 条以 `[AGENT] ` 开头含「模拟回复」、`[AGENT]` 恰 1 次、状态 `in-progress`、无残留 `…`；1,700 ms 后 store `reviewStatus=in-progress`、`thread[1]` 带前缀、`thread[0]` 仍是 user；再追问 4 条线程、2 条 assistant 各 1 前缀、双前缀 0；切 `other.md` 往返全保留；第 2/3 卡无线程仍 open；对话页签回复不含 `[AGENT]`；横溢 0、3 卡不重叠、带线程卡更高。截图 `shots/round-98/agent-thread.png`。

## CHANGELOG 建议（已写入）

三行：三函数 + 接线 + 门禁与 E2E。

## 偏差与已知行为

- critic CR-2 已做（空白回复不改文本/状态）；CR-3 按计划「一律 in-progress」未加守卫——流式中途用户改四态会被收尾写覆盖，要改回需再点一次。
- UNVERIFIED：真模型回复（无 Key）、真 WebView2 宿主、真实中文 IME、CDP 9222–9226。

## 新踩坑（3 条）

1. **dev server 会交付 App.tsx / MarginRail.tsx 的「混合版本」**（第 62 轮同坑）：两次编辑同一文件后，`GET /src/App.tsx?t=<mtime>` 只含新 import、不含新函数体，E2E 全按旧行为红；`(Get-Item src/App.tsx).LastWriteTime = Get-Date` 后恢复。判据要数「调用点」，别只 `includes`——import 绑定里也有这个名字。
2. **线程让卡片显著变高，几何断言不能沿用「末卡在视口内」**：带 4 条线程的卡 371.9 px、末卡底 973.5 > 900（栏内滚动，正常）；只断「top 升序不重叠 + 无横溢」。
3. **只数显示层 `[AGENT]` 证不了落库**（CR-1 反向）：`threadText` 会给旧档补前缀，「卡上有前缀」在 store 没写时也成立；两层都要数。
