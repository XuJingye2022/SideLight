# 第 126 轮计划（单轮 · P2：窄窗抽屉困焦点 + 字数明细在背板下）· rev 1 · 轮前 `8bc0d4a`

## 0 范围
只做第 123 轮 finder-ui **F1**（rev 1 修 plan-review；P2-6 见 §5-3）：1024×700 抽屉（z 44/45）不困焦点，Tab 4 次落到被 32% 背板压暗的 `.stats-trigger`；其 Enter 开的字数明细（`StatsDetail.tsx:22`，z 40）在背板下。
- 主区不做 inert（抽屉在 `<main>` 内，`App.tsx:6024`）→ `aria-modal` + Tab 环回；不改 z 序，用「不同时在场」（A2）消症状。不做 B-253、F2、F3；不改 BACKLOG/STATE。

## 1 体积（实测，非任务书 312,423）
- 门 gzip **315,738**（余硬线 4,262）、`MarginRail-*.js` gzip9 **7,681**、B-229 **323,419**、测试 65 文件（实测 dist=HEAD）。App 计门、MarginRail 计 chunk；测试不入包。
- **判据只有门** `npm run verify -- --max 315900` exit 0：App **+70~100 B**（含 matchMedia）、chunk **+200~360 B**（含 tabIndex）；chunk ≤8,060、B-229 ≤323,960 只记数。
- 超限：门超砍 A2.1 再 A2.2；chunk 超砍 A1.3 的 `getClientRects`，再退 `===first/last` 并记 UNVERIFIED。

## 2 A1 抽屉困焦点 + 模态语义
files：`MarginRail.tsx`、`App.tsx:6024`、`useDialogFocus.ts`

1. `App.tsx:6024` 加 `drawerOpen={railOpen && viewMode === 'edit' && window.matchMedia('(max-width: 1119px)').matches}`（同背板 `:6229`；P2-3；resize→setTick 已有 `:2431`），放在 `appDialogOpen` 后。
2. Props 加 `drawerOpen: boolean`；`<aside>`（`:451`）按 `drawerOpen` 加 `role`/`aria-modal`、**`tabIndex={-1}`**（P1-1）、`onKeyDown={onRailKeyDown}`。
3. 新 `onRailKeyDown`（`KeyboardEvent` 从 react 引入）：只认 `Tab`，`!drawerOpen` 返回（不查 position）。取 `railRef` 内 `FOCUSABLE` 中 `tabIndex>=0` 且 `getClientRects().length>0` 的站；`at=items.indexOf(activeElement)`，`at===-1`（焦点在 aside 根）同「不在站上」；末站/根 Tab、首站/根 Shift+Tab → `preventDefault()` 收另一端。
4. `useDialogFocus.ts` 的 `FOCUSABLE` 加 `export`。首/末站（空文档）`rail-close`/`rail-tab-notes`；`openRail`/`closeRail` 焦点不动。

验收（1024×700、CDP 57270、`node .tmp/reset.mjs 57270`；改前态 `.tmp/r126-critic-probe.json`）：
- 点 `.rail-toggle` → 300 ms 内 `activeElement=.rail-close`；`#margin-rail` 有 `role=dialog`、`aria-modal=true`。
- P1-1：点 `.rail-title` → `activeElement=ASIDE#margin-rail`；Tab×3 全在内（第 1 站 `.rail-close`）；点空白同。
- Tab×10 全程在内；`.stats-trigger`/`.skip-link` 0；每站中心 `elementFromPoint` 命中背板 0；前 4 站同改前，第 5 站 `.rail-close`。
- 根上 Shift+Tab 回末站且在内、`defaultPrevented` 真；Esc → 关、焦点回 `.rail-toggle`、`role`/`aria-modal` 消失、`[inert]` 0；P2-3 拉宽 1440 → 两者消失、`position:relative`、Tab 可穿出；0 pageerror。

## 3 A2 字数明细不落在背板下 + 关闭钮标签
files：`App.tsx`、`MarginRail.tsx:458`、新 `src/lib/railDrawerGate.test.ts` + `package.json` test 链尾

1. `openRail`（`:955`）加 `setStatsDetail(null)`；2. `openStatsDetail`（`:5083`）加 `if (railOpen) setRailOpen(false)`（只关不抢焦点）、deps 补 `railOpen` → 永不同时在场；3. `.rail-close`（`:458`）`aria-label` 跟页签：`railTab === 'chat' ? '关闭对话' : '关闭批注'`。
4. 新静态门（照 `railModalGate.test.ts` 的 `sliceFrom` 按切片断，先摘注释；P1-2 不按全文计数）：
   - `<aside` 切片含 `aria-modal`/`tabIndex={-1}`/`onKeyDown={onRailKeyDown}`；`drawerOpen: boolean` 与解构各 1；`const onRailKeyDown` 与 `onKeyDown=` 各 1，其切片含 `'Tab'`/`drawerOpen`/`getClientRects`/`preventDefault`。
   - `.rail-close` 切片含 `railTab === 'chat'`、两串各 1 且「关闭对话」在前；`openRail` 切片含 `setStatsDetail(null)`（全篇今天 2 处：`:4484`/`:6224`）；`openStatsDetail` 切片含 `if (railOpen) setRailOpen(false)`；`<MarginRail` 切片含 `drawerOpen={` 与 `matchMedia`，`count(appSource,'drawerOpen=')===1`。
   - 负向：删 `aria-modal` → ≥1 红 exit 1，还原全绿。

验收（同一 E2E）：抽屉开着 `.stats-trigger.focus()` + Enter → `#stats-detail` 1、`.rail-backdrop` 0、`.app.rail-open` 0、面板中心命中其子节点；Esc → 面板关、焦点回 `.stats-trigger`。反向：先开面板再点 `.rail-toggle` → `#stats-detail` 0、抽屉开。批注页签念「关闭批注」，切 `#rail-tab-chat` 后念「关闭对话」。

## 4 门禁与证据
- `npm test` 0 fail（65→66）；`verify -- --max 315900` exit 0；不跑 `roundtrip`；`git diff --stat` 4 个 src + `package.json` 1 行。
- P2-4 混合版本门（每相查两模块）：`fetch('/src/App.tsx')` 断 `drawerOpen=` 0（before）/1 且含 `matchMedia`（after）；`fetch('/src/components/MarginRail.tsx')` 断 `onRailKeyDown` 0/2 且含 `tabIndex={-1}`；不符就 touch。
- E2E `.tmp/e2e-r126-drawer-focus.mjs --phase before|after`：before（`git stash push -- src`，之后 pop）≥7 红（第 5 站到 `.stats-trigger`、`.rail-title` 后 activeElement=MAIN、Tab 逃出、`role`/`aria-modal` null、标签旧、面板在背板下）；after 全绿；pop 后复跑。
- 回归：`keyboard-acceptance` 52/52（跑后 `git checkout -- shots/round-05/`）、`.tmp/e2e-r97-a1-status.mjs` 44/44、`.tmp/e2e-r100-diff.mjs` 43/43。截图 1 张 `shots/round-126/drawer-focus.png`。

## 5 风险
1. 混合版本（AGENTS §8）：查两模块标记，不符就 touch；焦点进对比/在审面板后陷阱不触发（面板自带 `useDialogFocus`）。
2. 宽窗：`.rail-toggle` 隐藏（`styles.css:3648-3652`），`railOpen` 只来自窄窗；P2-3 让属性随宽度自愈。
3. P2-6 复核：critic 称 `:1134-1135` 有误（那是 `.annot-evaluation`）；`.margin-rail{position:relative}` 在 `styles.css:1147-1148`；A1.3 已不查 position，此条不阻塞实现。
4. BACKLOG 不改；scribe 补 **B-259**（B-258 后未占用）。不 push、不碰 `release/`；与 B-253 不同因。
