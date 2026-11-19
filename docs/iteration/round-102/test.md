# 第 102 轮验收（tester）· PASS

- 轮前 `startSha`：`bdd0c17`；判定 **PASS**（独立复验，未读 `impl.md`）。
- 范围：B-230（P2，界面/可访问性）——对话页签点「生成批注」后焦点交接到「批注」页签。

## 1. 静态对照（HEAD `bdd0c17` vs 工作树）

| 判据 | HEAD | 工作树 |
| :--- | :--- | :--- |
| `lastTabRef`（`src`） | 0 | **3**（`MarginRail.tsx:232/242/243`） |
| `document.activeElement`（MarginRail） | 0 | **1**（`:245`） |
| `requestAnimationFrame`（MarginRail） | 1 | **2**（`:248` 新增、`:397` 既有） |
| `rail-tab-notes`（`src`） | 1 | **2**（`:411` 既有、`:248` 新增） |
| `panel.contains` 旧分支（`src`） | 0 | **0**（已删） |

守卫按计划审查 CR-5 反向写成 `chatEl?.contains(active)`（`MarginRail.tsx:247`，`#rail-panel-chat`），不是只判 `body`；A1 验收里的「无 `panel.contains` 分支」= 不可达旧分支确实不在（0/0），接管条件性由 CR-1 用例证明（§3）。`git diff --stat` 只有 `src/components/MarginRail.tsx`（+22 行）。

## 2. 门禁与体积（真跑）

- `npm run build` 通过（`tsc --noEmit` + vite build + host-www 镜像）；`npm run verify` **PASS**；`node scripts/measure-first-screen.mjs --max 315200` exit **0**，gzip **315,155**（余 45；计划基线 315,146 → +9 B，来源是入口 chunk 里懒 chunk 哈希变化，impl.md 已记）。
- 常驻懒 chunk `dist/assets/MarginRail-C0INMF2y.js`：raw 18,645 / gzip(9) **6,573**（≤6,760，第 101 轮 6,489，+84）。
- 真实首载口径（方法不变）：315,155 + 6,573 = **321,728**，B-229 超线 **1,728**（第 101 轮 321,635 / 1,635）。
- `npm test`：**61 文件 861 条 0 fail**（`.tmp/r102-tester-npmtest.log`，逐文件 `ℹ tests` 求和 = 861、`ℹ fail` 求和 = 0，exit 0）。
- 未跑 `roundtrip`：只改右栏组件，未碰编辑器与序列化。
- 回归：`SIDELIGHT_CDP=…57270 node scripts/keyboard-acceptance.mjs http://localhost:5175` **52/52 PASS**、0 FAIL（`.tmp/r102-tester-keyboard.log`；跑完 `git checkout -- shots/round-05/` 已还原 3 张被覆盖截图）。

## 3. 真机验收（ego 浏览器 CDP 57270、5175、1440×900、假 FSA + 3 条批注）

自写并执行 `.tmp/r102-tester-focus.mjs`（`.tmp/r102-tester-focus.json`、日志 `.tmp/r102-tester-focus.log`）：**25/25 PASS**、0 pageerror。

- 键盘路径：对话页签填句 → `.rail-chat-generate.focus()` → Enter；**200 ms 与 1,800 ms** `activeElement` 都是 `#rail-tab-notes`（`aria-selected=true`），`#rail-panel-chat` hidden、`#rail-panel-notes` 可见；鼠标路径 `.rail-chat-generate.click()` 同两项全过。
- 交接后 1 次 Tab：**不落 `.stats-trigger`**（落 `body` 外的 `A.skip-link`）。探针（`.tmp/r102-tester-tab-probe.mjs`）确认这是既有「文档开头 Tab 回 skip link」守卫（`src/App.tsx:5886-5893`，本轮 `git diff` 未动 `App.tsx`；当时编辑器选区 1/1）；把光标放到文档中段再生成 → Tab 落 `BUTTON.rail-goal-retry`，在 `#rail-panel-notes` 内、不是状态栏。两条都记入 JSON（`observedDocStartTabTarget` / `observedMidDocTabTarget`）。
- **CR-1（条件性用例）**：对话页签填句、停 200 ms（生成钮 enabled）→ 点正文（停 200 ms）→ `page.evaluate(() => .rail-chat-generate.click())`（合成点击不移焦点）→ **200 ms 与 1,800 ms** 焦点仍是 `.ProseMirror`，且批注面板可见、对话面板 hidden —— 无条件 `focus()` 在此必红，守卫条件性成立。
- 4 条反向回归全 true：① 正文焦点下点 `#rail-tab-notes` → 焦点在页签；② `#rail-tab-chat` 上 ArrowRight → 焦点落 `#rail-tab-notes` 且选中；③ 连做两次生成 → 第二次仍落页签；④ 生成后点正文、再合成点击切对话/批注（不经生成）→ 焦点仍 `.ProseMirror`。观察（不计判定）：真实鼠标点页签把焦点给页签本身，属浏览器正常行为（plan-review CR-6）。
- 交付物抽检：`.tmp/e2e-r102-focus.mjs` 在；`.tmp/r102-focus.json` `allPass:true`（`afterGenerate`/`afterCards`/`mouseAfterGenerate`/`mouseAfterCards` 均 `rail-tab-notes`、`tabAfter=rail-goal-retry`、0 pageerror）；`shots/round-102/focus-after-generate.png` 已逐像素看过：批注页签带焦点环、批注面板 3 卡可见、对话面板收起。

## 4. 判定与偏差

- **PASS**。偏差（不判 FAIL）：① 守卫形态是 CR-5 的反向式（`chatEl?.contains`），A1 原文的「无 `panel.contains` 分支」按「旧不可达分支已删」核；② 门实际 315,155（+9 B），impl.md 以实测记 315,155 + 6,573 = 321,728，未出现「B-229 未变」，与我的独立测量一致。
- UNVERIFIED：真 WebView2 宿主、真实中文 IME、真实 FSA 写回（假句柄）；1024 宽度本轮未采样（A2 只要求 1440×900）。B-230 → `fixed`；B-229 保持 `open`（超线 1,728，口径由 lead 定）。
