# 第 126 轮执行报告（executor）

轮前 `8bc0d4a`；A1/A2 全部 DONE（2/2）。未 commit。

## 改动
- `MarginRail.tsx`：Props/解构加 `drawerOpen`（:42）；新 `onRailKeyDown`（:461，只拦 Tab，取栏内 `tabIndex>=0` 且有盒的站；末站与根 Tab→首站，首站与根 Shift+Tab→末站）；`<aside>` 条件 `role=dialog`/`aria-modal` + `tabIndex={-1}` + `onKeyDown`（:480-489）；`.rail-close` 标签跟页签（:500）。
- `App.tsx`：`openRail` 加 `setStatsDetail(null)`（:958）；`openStatsDetail` 加 `if (railOpen) setRailOpen(false)`、deps 补 `railOpen`（:5087/:5111）；`<MarginRail>` 加 `drawerOpen={railOpen && viewMode==='edit' && matchMedia('(max-width: 1119px)').matches}`（:6031）。
- `useDialogFocus.ts`：`FOCUSABLE` 加 export（:7）。
- 新 `src/lib/railDrawerGate.test.ts`（6 条切片静态门）；`package.json` test 链尾追加（65→66）。
- 不改 CSS/z 序：用「不同时在场」消掉面板在背板下的症状。

## 门禁（全绿）
- `npx tsc --noEmit` 0 错。
- `npm test` 66 文件 exit 0、0 fail（`.tmp/r126-npm-test.log`）。
- `npm run verify -- --max 315900` **PASS**：首屏 gzip **315,792 B**（余 108 B，基线 +54）；`MarginRail` chunk gzip9 **7,847**（计划 ≤8,060）；raw 1,024,681。
- 静态门负向：删 `aria-modal` → 1 红 exit 1；还原 6/6 绿。
- P2-4 混合版本门（dev 交付实测）：`/src/App.tsx` `drawerOpen` 1（对照 `appDialogOpen` 2）；`/src/components/MarginRail.tsx` `onRailKeyDown` 2、`tabIndex: -1` 3；无需 touch。
- 回归：`keyboard-acceptance` **52/52**（`.tmp/r126-keyboard.log`）；`.tmp/e2e-r97-a1-status.mjs` **44/44**；`.tmp/e2e-r100-diff.mjs` **43/43**。三者重写的受跟踪截图已还原。

## 行为证据（ego CDP 57270，1024×700 CDP 仿屏）
`.tmp/e2e-r126-drawer-focus.mjs --phase after|before`：
- after **20/20 PASS**、0 pageerror（`.tmp/r126-drawer-focus-after.json`）：开抽屉 43 ms 焦点 `.rail-close`、`role=dialog`/`aria-modal=true`；点 `.rail-title` 与点空白后 `activeElement=ASIDE#margin-rail`，Tab×3 全在栏内；Tab×10 站序 `close→diff→review→notes` 循环、`.stats-trigger`/`.skip-link` 0、4 站中心均命中栏内控件非背板；根 Shift+Tab 回 `#rail-tab-notes` 且 `defaultPrevented=true`；Esc 关、焦点回 `.rail-toggle`、属性消失、`[inert]` 0；1440 后 role/aria-modal 消失、`position:relative`、Tab 穿出到 `.stats-trigger`；标签「关闭批注」/「关闭对话」/「关闭批注」；抽屉开着 Enter → `#stats-detail` 1、背板 0、`rail-open` 0、中心命中面板，Esc 回 `.stats-trigger`；先开面板再点 `.rail-toggle` → 面板 0、抽屉开。
- before（`git stash push -- src`，pop 后复跑 20/20）**11 红**（≥7）：焦点落 MAIN、Tab 到 `.ProseMirror`/`.skip-link`/`.file-menu-trigger`、Shift+Tab 未拦、标签恒「关闭批注」、背板压住面板（`.tmp/r126-drawer-focus-before.json`）。

截图 `shots/round-126/drawer-focus.png`。

## UNVERIFIED
真机窄屏与真屏幕阅读器（只验 DOM 语义）、真 WebView2 宿主内抽屉。

## 新踩坑
1. JSX 开标签里不能写 `{/* … */}`（语法错），属性间注释用 `//`；`MarginRail.tsx` 从 react 导入 `KeyboardEvent` 会遮蔽 DOM 的，document 级监听全红 → 用 `type KeyboardEvent as ReactKeyboardEvent`。
2. `.rail-empty-title` 在批注/对话两面板各一个，`locator('.rail-empty-title')` strict 报错；要写 `#rail-panel-notes .rail-empty-title`。
3. `.tmp/e2e-r97-a1-status.mjs`、`.tmp/e2e-r100-diff.mjs` 会重写受跟踪截图 `shots/round-97/`、`shots/round-100/`，跑完须 `git checkout`。

## CHANGELOG 建议
- 窄窗（≤1119px）右侧抽屉：`role=dialog`/`aria-modal` + Tab 环回（点标题或空白也能进栏），字数明细与抽屉永不同时在场；关闭钮按页签念「关闭批注」/「关闭对话」。

## 给 scribe
- BACKLOG 记 **B-259**（第 123 轮 finder-ui F1 已修；静态门 `src/lib/railDrawerGate.test.ts`）。
