# 第 116 轮独立验收（tester，未读 `impl.md`）

轮前 startSha `c3bf749`；轮后 head 见 `git rev-parse HEAD`（本轮提交必须 ≠ startSha）。判定 **PASS**。任务面：A1 署名 + 条件渲染 + 机械门（B-242）、A2 真机前后对照 + 旧脚本剥前缀、A3 门禁与发现池。

## 1. 门禁

- `npm run verify -- --max 315800` → **exit 0 PASS**；门 gzip **315,509 B**（raw 1,023,714、files 3、headroom **291**），`target=310000 gap=-5,509` 只 WARN。
- 常驻 `dist/assets/MarginRail-DLBLEtnF.js` raw 20,960 / gzip9 **7,392**（第 115 轮 7,337，**+55**）。B-229 口径合计 315,509 + 7,392 = **322,901**（超首屏硬线 **2,901 B**，B-229 仍 `open`，只记）。
- Δ 对第 115 轮 315,492 + 7,337 = 322,829：门 **+17**、chunk **+55**、合计 **+72**。
- `npm test`（`.tmp/r116-tester-npmtest.log`）**62 文件 895 条 0 fail**（逐文件 `ℹ pass` 求和 895、`ℹ fail` 全 0；基线 892，+3）。`roundtrip` 不跑（未动编辑器/序列化）。

## 2. A1 复验

- `chat.test.ts` **23/23**；`^test(` HEAD **20** → **23**。
- `git grep -nF rail-chat-speaker -- src/components/MarginRail.tsx src/styles.css`：HEAD **0（exit 1）→ 2**（`MarginRail.tsx:773`、`styles.css:1555`）。
- `git grep -nF chatSpeaker -- src/lib/chat.ts src/components/MarginRail.tsx`：HEAD **0（exit 1）→ 3**（`chat.ts:136` 导出、`MarginRail.tsx:18` import、`:773` 调用）。`-- src` 全口径 **17 行**（多出的是 `chat.test.ts` 自身 12 行），按 plan 只记录、不设门。
- 负向 `git stash push -- src/components/MarginRail.tsx src/styles.css` → **恰 2 红**（署名渲染门、sr-only 样式门，`pass 21 / fail 2`）；pop 后工作树复原。
- 自写探针 `.tmp/r116-tester-static.mjs`（`.tmp/r116-tester-static.json`）：`.rail-chat-speaker` **恰 1 块**、6 条声明逐项 `position:absolute,width:1px,height:1px,overflow:hidden,clip-path:inset(50%),white-space:nowrap`；块内三禁写 **0**（全文件三值各 1 条，证明必须按块断）；400 字切片里署名恰 1、条件 `(turn.text || busy)` 在 span 前、span 在 `{turn.text ||` 前、`chatSpeaker(turn.role)`、busy `'…'` 仍在；正文表达式与 HEAD **逐字相同** → `turn.text` 未被污染。

## 3. A2 复验

before 三条互证：`git grep rail-chat-speaker c3bf749 -- src/...` **0（exit 1）**；交付 `.tmp/r116-speaker-before.json` 署名 0、`innerText` 无「我：/侧灯：」（`red:[]`）；after JSON 9/9。

自写 `.tmp/r116-tester-speaker.mjs`（ego CDP 57270、1440×900、无 Key 走确定性 mock、清 storage 后 reload 开 `#rail-tab-chat`）**10/10、0 pageerror**（`.tmp/r116-tester-speaker.json`）：

- T1 busy=false、2 turn；T2 每 turn **恰 1 枚**署名，值 `我：` / `侧灯：`。
- T3 剥前缀后 user = 发出那句；T4 assistant 剥前缀 48 字 = 交付 before 基线**逐字相等**。
- T5 `innerText` 与 `Range.toString()` 都含两枚；T6 CDP `Accessibility.getFullAXTree` 两枚 `ignored:false`。
- T7 计算值 absolute / `inset(50%)` / hidden、rect **1×1**、三禁值 0。
- T8 同会话反事实删 span 后 turn 高 `[35,58]`、`log.scrollHeight` 108，差 **0**；T9 带 span 与交付 before 基线差 **0**、栏宽 **320**。
- 截图沿用执行方 2 张（`shots/round-116/chat-speaker{,-revealed}.png`，39,676 / 40,430 B），配额已满未再拍。

旧脚本：10 文件 12 点各注入 `stripSpeaker`（逐文件点数 2/2/2/2/3/2/3/2/1/3；`e2e-r113` 的 `emptyChildren` 判空前 strip）；`node --check` **10/10 exit 0**；复跑 `r96-tester-a1a2.mjs` **42/42 PASS**、`e2e-r113-chat-401.mjs` **a–e 全 OK**（`RED []`），跑后 `git checkout -- shots/round-96/`。余 8 个只静态改 + 语法检查（UNVERIFIED）。

## 4. A3（发现池 / 报告）

- BACKLOG：B-242 → `fixed` + 三数（门 315,509 + chunk 7,392 = 322,901）；B-229 补第 116 轮复测一行、状态未改；未碰 B-233/B-238/B-244/B-246/B-248。
- 实施侧 diffstat：`chat.ts` +11、`MarginRail.tsx` +2/−1、`styles.css` +12、`chat.test.ts` +84、`BACKLOG.md` 2 行；`App.tsx` **0 改动**。
- 收尾：`CHANGELOG.md` 第 116 轮小节 + 标题 29–115 → **29–116**（`changelog.test.ts` **3/3**）、本文件、`STATE.md` 一行。README/AGENTS 未动（批末 scribe）。

## 5. 偏差与 UNVERIFIED

- 偏差（不判 FAIL）：① plan 估 `-- src` 口径「约 7 行」，实测 **17 行**，该项只记录；② 12 点里有 8 个只做静态 + 语法检查、未逐个复跑（plan §4 已列 UNVERIFIED）。
- UNVERIFIED：真实 WebView2 宿主、真实中文 IME、真实读屏播报（只取 CDP AX 树）、真实 FSA（本轮不涉及保存）。
