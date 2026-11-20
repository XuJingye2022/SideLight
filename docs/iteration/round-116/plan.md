# 第 116 轮计划（rev 2）— B-242：对话发言者标识

> 单轮，只做 B-242，3 任务；rev2 修 H-1…H-6。

## 0. 基线（HEAD c3bf749）

- 门 **315,492 B**；`MarginRail-*.js` gzip9 **7,337** → 首载 **322,829**（超 2,829，B-229 open）；`npm test` 62 文件 892 条。
- 缺陷：`MarginRail.tsx:771-775` 无发言者文本，`styles.css:1548-1551` 只靠底色（对照 `:605` threadText）。
- 聊天 JS 在懒 chunk（只被 `MarginRail.tsx:18` import）：CSS 算门、JS 算 chunk。

## 1. 体积

- CSS +33 gzip（实测）；`chatSpeaker`+条件 span ≈+220 raw → chunk **+60–120**。
- 上限：门 **≤+300**（`--max 315800`）、chunk **≤+250**；预计门 315,5xx、chunk ≤7,460、合计 **≈322,9xx**（缺口归 B-229；硬线 320,000）。

## 2. 任务

### A1 署名 + 条件渲染 + 机械门

文件：`src/lib/chat.ts`、`src/components/MarginRail.tsx`（只 `:18` 与 `:771-775`）、`src/styles.css`、`src/lib/chat.test.ts`。

1. `chat.ts` 尾加 `export function chatSpeaker(role): string`（`'侧灯：'`/`'我：'`），注释「只显示层，不进 turn.text」且不出现 `chatSpeaker` 字样。
2. `:771-775` 的 `<p>` 内插 `{(turn.text || busy) && <span className="rail-chat-speaker">{chatSpeaker(turn.role)}</span>}`，原 `{turn.text || (busy && …'…')}` 一字不改（=H-5：200 零 delta 不渲染 span）。
3. `styles.css:1548-1551` 后加一块 6 声明：`position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap`；禁 `display:none`/`visibility:hidden`/`user-select:none`。
4. `chat.test.ts` +3：① 两值/全角冒号/互异；② 读 `MarginRail.tsx`，从 `indexOf('rail-chat-turn is-')` 切 400 字（H-3：`:605` 的 `turn.text ?` 在前）再断 `rail-chat-speaker` 恰 1、条件在 span 前、span 在 `{turn.text ||` 前、含 `chatSpeaker(turn.role)`、busy `'…'` 仍在；③ 读 `styles.css`（照 `touchTargets.test.ts`）恰 1 块、6 声明逐项、三禁写 0。
5. 负向 `git stash push -- src/components/MarginRail.tsx src/styles.css` → ②③ **2 红** → pop；`.tmp/r116-tests-{red,green}.log`。

验收：`node --experimental-strip-types src/lib/chat.test.ts` **23/23**；`git grep -nF rail-chat-speaker -- src/components/MarginRail.tsx src/styles.css` 0→**2**；`git grep -nF chatSpeaker -- src/lib/chat.ts src/components/MarginRail.tsx` 0→**3**（导出/import/span）。**`-- src` 口径不设门**（含测试约 7 行，H-1）。

### A2 真机前后对照（ego CDP 57270）

文件：`.tmp/e2e-r116-speaker.mjs`（`--phase before|after`）。

1. 借 `.tmp/e2e-r113-chat-401.mjs:113-153` 四 helper；不设假 Key（`ai.ts:234`）、不需假 FSA：清 storage → reload → `#rail-tab-chat`。
2. before：`node .tmp/reset.mjs 57270` → `.tmp/r116-speaker-before.json`；A1 后 reload（CSS 不生效先 `touch src/styles.css`）→ `-after.json`。
3. 验收（两口径同）：① 发「看看这一段」+Enter → `aria-busy=false` → 2 turn。② before：署名各 0、`innerText` 无「我：/侧灯：」、存 `assistantBody`。③ after：每 turn 恰 1 署名；剥前缀后 user 逐字、assistant 与 before 相等；`innerText` 与 log 选区 `Range.toString()` 都含两枚。④ **AX（H-4）**：`newCDPSession(page)` → `Accessibility.enable` → `getFullAXTree`，过滤 `ignored:false` 且 `name.value` 以「我：」「侧灯：」开头的节点，两枚齐全。⑤ 布局：span `position:absolute`、`clip-path:inset(50%)`、`overflow:hidden`、rect ≤1.5、三禁值 0；turn 高与 `scrollHeight` 较 before 差 ≤1、栏宽 320、0 pageerror。⑥ 截图 `shots/round-116/chat-speaker.png`；注入 `position:static;clip-path:none` 拍 `chat-speaker-revealed.png` 后还原。
4. **旧脚本剥前缀（H-2，12 点）**：每个 `evaluate`/`ev` 回调内定义 `const stripSpeaker=(s)=>String(s??'').replace(/^(我：|侧灯：)/,'')`（注入函数内），套在取值处：`r96-tester-a1a2:101`、`e2e-r96-a1-chat:124`、`r104-tester-indep:184`、`e2e-r104-chat-instruction:215`、`r106-tester-e2e:284-285`、`e2e-r106-a1-chat-input:142`、`r108-tester-live:196+199`、`e2e-r108-a1-live:77`、`r108-tester2-live:85`、`e2e-r113-chat-401:121+124`。`e2e-r113` 的 `emptyChildren` **先 strip 再判空**，否则带「侧灯：」的空气泡算非空、B-243 回归失效。对比处必红，先改脚本再判产品。改后 `node --check` 10 文件，复跑 `r96-tester-a1a2`、`e2e-r113` 绿；余 8 个只静态改+语法检查（UNVERIFIED），`impl.md` 记「预期文本变化」。

### A3 门禁 + 发现池 + 报告

1. `npm run verify -- --max 315800` exit 0；报门、chunk gzip9、合计、Δ、缺口。
2. `npm test` **62 文件 895 条**（892+3）0 fail；`roundtrip` 不跑。
3. 新 `docs/iteration/round-116/impl.md`；`BACKLOG.md` 改两处：B-242 → `fixed` + 证据（门/chunk/合计、旧脚本口径）；**B-229 补一行「第 116 轮复测：门 X + chunk Y = Z」**（H-6，不改状态）。
4. 不碰 README/CHANGELOG/STATE；不动 B-233/B-238/B-244/B-246/B-248。

## 3. 不做

- 不写进 `turn.text`（会进模型历史与流式/401）；不加 `aria-label`；不改 turn 底色/边框/字号。
- 不修 B-246（条件渲染已避免加重）、B-244/B-233/B-238/B-248；不加依赖、不 push、不改 `release/`、不重启 server。

## 4. 风险

- R1 span 块化后 `innerText` 可能单独成行——复制仍分得清，只断含两枚。R2 若被排除出 `innerText`/选区/AX：报 lead。R3 CSS 不生效：`touch src/styles.css`。R4 穿 +300：先删 `white-space:nowrap`。R5 旧脚本假红：先改脚本再判产品。R6 240 字切片被挤爆：实测 50/155 仍命中，若走样则缩条件写法，不放宽旧断言。

## 5. tester 独立验收

自写 `.tmp/r116-tester-speaker.mjs`；before 三条互证（`git show c3bf749:…` 无 `rail-chat-speaker`、before JSON 无署名、`innerText` 无「我：/侧灯：」）；复跑 A1 静态门、23/23、2 红、895 条、verify 与 chunk 三数、A2 ③④⑤；`git diff --stat` 只 4 个源文件。
