# 第 102 轮实现（executor · A1/A2）

round=102，startSha `bdd0c17`（=HEAD）。回滚 0 条。

## A1 焦点交接（B-230，P2）—— DONE

- 改动：`src/components/MarginRail.tsx` 唯一产品文件（`git diff --stat`：1 file changed, 22 insertions）。
- 做法：`lastTabRef` 记上一次页签；`useEffect([railTab])` 只在 `chat → notes` 且焦点已丢（`body`/null）或仍在被收起的 `#rail-panel-chat` 里时，rAF 把焦点交给 `#rail-tab-notes`；不回填首张卡（卡片异步，抢焦点打断读者）。
- 与 plan 的偏差（按 `plan-review.md` CR-5）：守卫不是「activeElement !== body 才接管」单判据，而是「焦点不在对话面板里就早退」。`hidden` 落地并不同步 blur，`useEffect` 里同步读到的 activeElement 通常仍是那颗按钮；只用 body 判据会让修复在键盘、鼠标两路都空转（A/B 实测见 A2）。
- 静态对照（`MarginRail.tsx`）：`lastTabRef` 0→3 行、`document.activeElement` 0→1、`requestAnimationFrame` 1→2、`src` 内 `rail-tab-notes` 1→2；`panel.contains` 0 命中（只有 `chatEl.contains`，变量名不含 `panel`）。`useRef`/`useEffect` 未加 import，`App.tsx` 零改动。

## A2 真机验收 —— DONE

- 脚本 `.tmp/e2e-r102-focus.mjs`（ego CDP 57270、5175、1440×900、假 FSA `a.md` + 3 条批注）；`.tmp/r102-focus.json` 的 `allPass:true`，13 项全 true、`pageErrors:[]`；日志 `.tmp/r102-focus.log`；截图 `shots/round-102/focus-after-generate.png`（批注页签带焦点环、批注面板与卡片可见）。
- 键盘（`.focus()` + `Enter`）：200 / 1,800 ms 两采都是 `rail-tab-notes`；`#rail-panel-notes` 可见、`#rail-panel-chat` hidden。鼠标真点击同（改前 finder 记 `active:""`；`afterGenerate`/`afterCards`/`mouseAfter*` = `rail-tab-notes`）。
- Tab 落 `.rail-goal-retry`（`#rail-panel-notes` 内），不是 `.stats-trigger`。
- 4 条反向全 true：rev1 正文有焦点→真点「批注」页签=页签；rev2 页签 `ArrowRight`=页签；rev3 连做两次生成都落页签；rev4 生成后回正文、合成点击切对话/批注，焦点仍在 `.ProseMirror`（真点页签会把焦点给页签，按 CR-6 用合成点击）。
- CR-1：正文有焦点时合成点击「生成批注」→ 200 / 1,800 ms 焦点仍 `.ProseMirror`、批注面板可见；无条件 `focus()` 会在这条红。
- A/B（证明用例不空转）：临时把接管置空（条件加 `|| true`，未 build）重跑同一脚本 → `afterGenerate`/`afterCards`/`mouseAfter*` = `""`（焦点停在已隐藏按钮）、`rev3` RED、`allPass:false`；恢复后 `allPass:true`。日志 `.tmp/r102-focus-ab.log`。
- 体积（CR-2，方法不变）：门 **315,155**（`measure-first-screen.mjs --max 315200` → **PASS / exit 0**，余 45）+ 新懒 chunk `MarginRail-C0INMF2y.js` gzip(9) **6,573**（≤6,760，原 6,489）= **321,728**；B-229 超线 **1,728**（321,728 − 320,000），按本轮新门重算。
- 门禁：`npx tsc --noEmit` exit 0；`npm run build` 通过；`npm run verify` PASS（gzip 315,155）；`npm test` **61 文件 861 条 0 fail**（`.tmp/r102-impl-test.log`）。未改编辑器/序列化，未跑 roundtrip。

## CHANGELOG 建议（一行）

- 右侧「生成批注」切到批注页签后，焦点交给「批注」页签，再按 Tab 不再掉到状态栏。

## 新踩坑（3 条）

1. `hidden` 收起面板不同步 blur：`useEffect` 里读到的 `document.activeElement` 往往还是面板里的按钮（CR-5 实测），守卫不能只判 `body`，要判「是否仍在那块面板里」。
2. 正文选区在 1/1 时，`<main>` 既有 `onKeyDownCapture`（`src/App.tsx:5886-5893`，P2 延后项「正文开头 Tab 回环」）把 Tab 送去 `.skip-link`；A2 先点段落再测 Tab。属既有行为，非本轮回归（JSON 记在 `docStartTabWhileAtDocStart`）。
3. `measure-first-screen` 的门含入口 chunk：lazy chunk 哈希变化会让门 ±几字节（本轮 315,146 → 315,155，+9 B，仍 PASS），实跑数以最后一次 build 为准。
