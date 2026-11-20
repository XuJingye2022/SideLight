# 第 118 轮计划 — B-244：对话记录区不可聚焦，长回答键盘滚不回去

> 单轮，只做这一条，2 任务。条目 = BACKLOG **B-244**（`open`，P2 路线图表，第 112 轮侦察）。改法 = 一个属性，
> 不加 CSS、不加依赖、不动对话逻辑。

## 0. 基线（HEAD `8acf11a`，本轮实测）

- 门 `node scripts/measure-first-screen.mjs`：gzip **315,509 B**（raw 1,023,714、files 3），距硬线 320,000 余
  **4,491**，PASS（超内部预算 5,509 只 WARN）。
- 懒 chunk `MarginRail-DLBLEtnF.js` raw **20,960**、gzip9 **7,392**；B-229 合计 **322,901**（超线 2,901，
  B-229 仍 open）。
- 题述「312,423 / 余 7,577」是第 93 轮旧数（r117 `test.md:22`）；本轮按实测算净增。
- `MarginRail.tsx:764` 的 `.rail-chat-log` 无 `tabIndex`（role/aria-live/aria-busy/aria-label/ref 都在）；
  `styles.css:1541-1546` 是 `max-height:calc(100vh-300px)` + `overflow-y:auto`；`:192-195` 全局
  `:focus-visible`（`:26-27` 的 2px/offset 2px）；`:307-314` 栏宽 320 + 32/28 留白 → 环不被裁。
  题述行号是 r112 布局。
- 既有机械门 `chat.test.ts:202-213`、`:264-287` 都用 `<div\b[^>]*className="rail-chat-log"[^>]*>` 切同一开标签，
  加属性不破；该文件现 **24 条**，`npm test` **62 文件 896 条**。

## 1. 体积（先算，硬线 320,000）

- ` tabIndex={0}` = 源码 +13 字符 → chunk raw **+≤12 B**、gzip9 **+≤20 B**（7,392 → ≤7,412）。
- 门只受 chunk 哈希影响：**Δ 0～+30 B**（≤315,539）；`--max 315800` 必须 exit 0。
- 新断言与 `.tmp/` 脚本不进包 → 首屏 0 B；不加 CSS。B-229 合计 ≤322,921（缺口归 B-229）。

## 2. 任务

### A1 加 `tabIndex={0}` + 机械门 + before/after 对照

文件：`src/components/MarginRail.tsx`（只 `:764`）、`src/lib/chat.test.ts`、`.tmp/e2e-r118-b244.mjs`、
`.tmp/r118-b244-{before,after}.json`、`shots/round-118/`（≤1 张）。

1. 改前先跑 `--phase before`（ego CDP 57270、1440×900）：点 `#rail-tab-chat` → `.rail-chat-input` 填 1,600×「甲」
   → 回车 → 等 `.rail-chat-turn.is-assistant`（无 Key 本地模拟）；先断言
   `log.scrollHeight - log.clientHeight ≥ 200`（上限 600px）。记 `log.attr`（应 `null`）、`log.tabIndex`（应 `-1`）、
   从输入框 Shift+Tab 的落点（应不是 log）、`focus()` 后 PageUp 的 `scrollTop` 变化。
2. 只改 `:764` 开标签：加 `tabIndex={0}`；`role`/`aria-*`/`ref`/渲染结构一个不动；`styles.css` 不改。
   不写 `turns.length ? 0 : -1`：流式中条数会变，Tab 站数跟着跳，读者按 Tab 会踩空。
3. `chat.test.ts` +1 条（24→25）：同一开标签断 `tabIndex={0}`、无 `tabIndex={-1}`、`className` 仍恰 1 处。
4. 改后跑 `--phase after`：`tabIndex===0`；真实 Shift+Tab（自 `.rail-chat-input`）落 log、真实 Tab 回输入框；
   聚焦后 outline 计算值 `2px solid`；置底后真实 `PageUp` 减 ≥50、`ArrowUp` 再减、`Home`→0、`End`→max、
   `PageDown` 增；载入/收流后焦点不是 log；`role`/`aria-label`/`aria-live` 逐字不变；0 pageerror；
   栏宽 320、横溢 0。截图 `shots/round-118/chat-log-focus.png`（焦点环 + 上翻中段）。
5. 负向：`Copy-Item` 到 `.tmp/r118-MarginRail.orig.tsx` → 只删该属性 → `chat.test.ts` 恰 1 红 → 拷回（hash 同）
   → 25/25；全文件 `tabIndex={0}` 1→2。
6. `fetch('/src/components/MarginRail.tsx')` 必须含 `tabIndex={0}`；交付旧模块就 touch 再 reload，不重启 server。

验收：before 红证据 + after 全 true；`node --experimental-strip-types src/lib/chat.test.ts` **25/25**；
`npm test` **62 文件 897 条 0 fail**；`npm run verify -- --max 315800` exit 0 并记门值；`roundtrip` 不跑
（未动编辑器/序列化）。

### A2 回归 + 体积登记 + BACKLOG

文件：`docs/iteration/BACKLOG.md`、`docs/iteration/round-118/impl.md`、`shots/`、`.tmp/r118-*`。

1. 回归（各记路径）：`.tmp/r96-tester-a1a2.mjs` 42/42、`.tmp/r112-tester-a1-scroll.mjs` 10/10、
   `.tmp/r111-tester-focus.mjs` 14/14、`.tmp/r108-tester-live.mjs` 17/17、`scripts/keyboard-acceptance.mjs` 52/52。
2. 跑完 `git checkout -- shots/round-05 shots/round-96 shots/round-111 shots/round-112`；最后
   `git status --porcelain shots/round-05 shots/round-96 shots/round-111 shots/round-112` 必须为空。
3. `impl.md` 记三数：门 gzip、chunk gzip9（Δ vs 7,392）、B-229 合计（Δ vs 322,901）；断言门 ≤315,800、
   chunk Δ ≤ +32；超了先查多改的样式/属性再报。
4. `BACKLOG.md` 的 B-244 `open` → **`fixed`**，行尾补第 118 轮：`:764` 改法、before/after JSON、E2E 断言、
   `chat.test.ts` 24→25、`npm test` 897 条、三数。不新增条目、不动 B-229/B-233/B-238/B-246/B-248。

验收：`git diff --name-only` 只 `MarginRail.tsx`/`chat.test.ts`/`BACKLOG.md`；`npm test` 897 条 0 fail。

## 3. 不做

- 不修 B-229（门是否计常驻 chunk 由 lead 定）与 B-233/B-238/B-246/B-248；不加依赖、不 push、不改 `release/`、
  不重启 dev server、不动 README/CHANGELOG/STATE。

## 4. 风险

- R1 before 若 Tab 已能到 log：保留 `log.attr:null` 作红证据，after 门槛不变，impl 写实测，不假绿。
- R2 焦点环被裁：先量 rect/outline，确需才加 `.rail-chat-log:focus-visible{outline-offset:-2px}`
  （styles.css 在门内，+≤40 B，复测）。
- R3 dev server 交付旧模块：以 `fetch` 校验为准（第 29 轮坑）。R4 历史截图：按 A2-2 还原。
- R5 抄旧数：门写实测，不写 312,423。

## 5. tester 独立验收

自写 `.tmp/r118-tester-b244.mjs`（不读 impl）：改前 `git stash push -- src/components/MarginRail.tsx` 复现
「Shift+Tab 跳过」，还原后验 Tab 双向 + 四键盘滚动 + 焦点环 + 0 pageerror；复核 25/25、897 条、三数、
BACKLOG 行、`git diff` 只 4 文件。
