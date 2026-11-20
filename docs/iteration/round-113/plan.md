# 第 113 轮计划（单轮，只做 1 条 P2）

> revision 2（第 1 次修订，2026-11-20）：CR-1→A3.1/6、CR-2→A2（18→20）、CR-3→A3.1/4、CR-4→A3.2、CR-5→A3.7、CR-6→§1+A3.7+§3；任务仍 A1/A2/A3，未增范围。轮前 `9e4990c`。

## 0. 问题

假 Key + 假 fetch 对 `/chat/completions` 返 401，2.2 s 后 `.rail-chat-turn` 2 条：`is-assistant` 的 `textContent` 空、高 **16 px**，错误文案另在 `.rail-chat-error`。

成因（HEAD）：`send()` 先塞空占位（`MarginRail.tsx:196`），`catch` 只写 `chatError`（`:213-215`），渲染 `:724` 的 `turn.text ||` 不判空 → 失败后占位留到「新对话」。

证据：`.tmp/r112-finder-bug.json` 的 `error401`（2 条、assistant 1、气泡高 16）；`shots/round-112/chat-401-empty-bubble.png`；`.tmp/r112-finder-bug.mjs:245-297`。

## 1. 体积预算（口径分开）

- 基线：HEAD `9e4990c` 的 `verify` 首屏 gzip **315,213 B**（`.tmp/r112-verify.log` 末行 `headroom=4787`）→ 距硬线 320,000 余 **4,787 B**（312,423 B 是旧读数）。
- 落点：`chat.ts` 只被 `MarginRail.tsx:18`（`lazy()`，`App.tsx:20-21`）与 `chat.test.ts:18` 引用 → 全进懒 chunk，**不进入口图**。
- **首屏门**：只多定长 8 位 chunk 哈希 → **±0～10 B**（315,213～315,223）；`--max 316000` 应 PASS。
- **懒 chunk**（现 gzip9 **6,884**）：≈ raw +300 B → **+90～180 B** → **6,974～7,064**。
- **门 + 常驻 chunk**：改前 **322,097**，本轮 **≈322,187～322,287**（超线 2,187～2,287）→ **B-229 open**。

## 2. 任务

### A1 修：失败收尾撤掉空 assistant 占位

- 文件：`src/lib/chat.ts`、`src/components/MarginRail.tsx`
- 步骤：1) `chat.ts` 在 `appendDelta`（`:67-71`）后加导出纯函数 `dropEmptyAssistantTail(turns)`：末条不存在 / 非 assistant / `text` 非空 → **返回同一引用**；否则 `slice(0,-1)`。2) `MarginRail.tsx:18` import 加该名；`catch`（`:213`）在非 abort 且 `aliveRef.current` 时除 `setChatError(...)` 再加 `setTurns((previous) => dropEmptyAssistantTail(previous))`（必须函数式）。3) 不动：`finally` 焦点（B-240）、`resetChat`、busy 的「…」占位、`ai.ts`、样式。
- 验收：`git diff --stat` 仅这两文件 + `chat.test.ts`；`dropEmptyAssistantTail(` 在 `MarginRail.tsx` 恰 1 处且与 `catch (error)`（`:213`）同行或其后 ≤400 字符；`setTurns(dropEmptyAssistantTail(turns))` 闭包写法 0 处。门禁 `verify` + `npm test`。
- 风险：用闭包 `turns` 而非 `previous`，第二次发送吞掉上一条提问 → A3 场景 b 必红。

### A2 单测 + 静态门（已在链尾，不改 package.json）

- 文件：`src/lib/chat.test.ts`（现 **18** 条，`Select-String '^test\('` 实测）
- 加 **2** 条：① `dropEmptyAssistantTail`——`[user]+[assistant,'']` 撤成 `[user]`；`[user]+[assistant,'答']`、`[]`、末条 user 都 `assert.equal` 同一引用；结果与原前缀 `deepEqual`。② 静态门——读 `MarginRail.tsx`，断 `catch (error)` 后 ±400 字符含 `dropEmptyAssistantTail(` 且全文恰 1 处，另断渲染区仍有 `turn.text ||` 与 busy 的「…」。
- 验收：`node --experimental-strip-types src/lib/chat.test.ts` **18 → 20 条 0 fail**；`npm test` 0 fail。不加第 3 条。

### A3 真机证据 + 收口（新建脚本，不复制）

- 文件：`.tmp/e2e-r113-chat-401.mjs`（**新建**）、`shots/round-113/`、`docs/iteration/BACKLOG.md`
- 步骤：
  1. **新建脚本**，只借 `.tmp/r112-finder-bug.mjs` 的装配段：header `:1-28`、假 FSA `openFolder` `:30-106`、开局清库+reload+开 `a.md`+开对话页签 `:152-168`、`chatState` `:108-125`。**不复制 A/B 两段**（`:161-243`，写 `shots/round-112/chat-scroll-yank.png:217`、`chat-longword.png:243`）；C 段的 `chat-401-empty-bubble.png` 也不写（新证据写 `round-113/`）。
  2. 开头加 `mkdirSync('shots/round-113', { recursive: true })`（照 `.tmp/r96-tester-a1a2.mjs:15`）：目录现不存在，无 mkdir 时 `page.screenshot` 抛 ENOENT 会假红。
  3. 新写判据（估 60–80 行）：a) 401 后 turn **1**、assistant **0**、`role=log` 无 `trim()===''` 子元素、`.rail-chat-error` 含「API Key 无效」、`aria-busy="false"`；b) 再发一句（仍 401）→ 2 条全 user、assistant 0、错误仍在；c) 假 SSE（照 `.tmp/r96-tester-a1a2.mjs:304-318`）再发 → assistant 1 且非空；d) 「新对话」→ 0 条、错误消失；e) 0 pageerror。
  4. **顺序**：先 a+b（核心判据，25 分钟内必达），再补 c、d；只到 b 时 c/d 记 UNVERIFIED 并写原因。
  5. 门禁：`verify`（记 gzip 与 `--max 316000`）、`npm test`；回归 `.tmp/r96-tester-a1a2.mjs` 与 `.tmp/r112-tester-a1-scroll.mjs`。
  6. **回归前后各 `git checkout -- shots/round-112 shots/round-96`**：两脚本写已跟踪的 `chat-scroll-follow.png`（r112:231）与 `round-96/rail-chat.png`（r96:238），不还原即改坏历史证据。
  7. BACKLOG **不加新条**：**B-243（open，轮 112）** 即本缺陷 → 改 `fixed` + 补证据（截图/JSON、门口径与门+chunk 两数），旧行号 `:191`/`:214-216` 更正为 `:196`/`:213-215`；`## Deferred` 加 **1 行**：「200 但流里 0 字」无错误文案时撤占位 = 静默失败，属另一种 UX 决定。
- 验收：a–e 全 true；JSON 落盘；截图存在且 **>0 B**；`git status --porcelain shots/round-96 shots/round-112` 为空（`shots` 全局只多 `?? shots/round-113/`）；两条门禁 PASS；BACKLOG 只 B-243 改动 + Deferred 一行。

## 3. 不做（残余）

- 「200 但 0 字」：落 `deferred` 1 行（A3.7）。
- B-229、B-241、B-242 另开轮；不加依赖、不动 `ai.ts`、不加样式（16 px 是 `.rail-chat-turn` 的 padding）。

## 4. 风险与应急

- 体积超估：先删注释；仍 >300 B 才改渲染侧 `turns.filter`（会藏掉 200 空流），只在破门时用并记偏差。
- 假红：必须在 `#rail-tab-chat` 激活时发（`hidden` 时条目仍在 DOM）。
- 视口：保留 finder 的 1440×560（`:26`），别改 1440×900 再说几何对不上。
