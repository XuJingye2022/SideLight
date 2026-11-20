# 第 137 轮 独立验收（tester）：B-253 窄窗抽屉打开时确认框被遮罩盖住

- 轮前 startSha：`d62c2e29a4d7d1f11fefa5f1b20b35bc45d89852`。只验 B-253（快车道小修，无 `plan.md`，按 BACKLOG 条目验收）；未复用执行方脚本，自写 `.tmp/r137-tester-b253.mjs`。
- 判定：**PASS**（12/12 自写断言 + 目标测试全绿 + tsc 0；head 已不同于 startSha，见第 6 节）。

## 1. 改动复核（`git diff -- src/styles.css`）
+3 −1 且只有一处：`.overlay` 的 `z-index: 40 → 46` + 2 行注释（`src/styles.css:1890-1893`）。`App.tsx` / `MarginRail.tsx` / 其它 CSS 0 行改动。改前 HEAD 版确认是 40（`git show HEAD:src/styles.css` 的 `.overlay` 块）。

## 2. 层叠 + 像素 + 交互（自写脚本，ego CDP 57270、1024×700、脏稿 + 抽屉 + `Ctrl+Alt+N`）
12/12、0 pageerror / 0 console error（`.tmp/r137-tester-b253.json`）：
- 抽屉开：`.app.rail-open`、背板 `display:block` z **44**、`.margin-rail` `position:fixed` z **45**、左缘 **684**。
- 确认框（「这篇还有没保存的改动」，钮 取消/不保存/保存并切换）：`.overlay` z **46**；仍 < 60（快速打开 60、右侧只读面板 60，后者在 `appDialogOpen` 时不挂载）。
- 几何：主钮「保存并切换」622..706，与抽屉 684.. 重叠 **22 px**（缺陷的可见位置）。
- 反事实（页面内注入 `.overlay{z-index:40 !important}` 复现改前层叠，不改源码）：z 回 40。像素比（`.tmp/r137-tester-pixels.py` → `.tmp/r137-tester-pixels.json`）：
  - 重叠条 37×109（x 687..724、y 296..405）：改后 `meanL 233.98 / stddev 51.76 / minL 88`（按钮文字可见）；改前 **恒 253.0 / stddev 0**（纯抽屉纸色 → 对话框整块被抽屉盖住）。
  - 对话框左内边距 12×117：改后 **253.0**、改前 **178.0**（被 32% 黑背板压暗）→ 背板也不再压暗对话框本体。
- 交互：点「取消」**188 ms** 关框、抽屉仍开、`#root` 内 `[inert]` 7→**0**；再 Esc 关抽屉（既有 Esc 次序未改）。1440×900：`.overlay` 仍 46，无抽屉态（背板不渲染、侧栏回普通列）。

## 3. 门禁（本条只跑目标测试 + tsc；批末全量门禁归队列第 3 条）
- `npx tsc --noEmit` exit 0（`.tmp/r137-tester-tsc.log`）。
- 目标测试（读 `styles.css` 或与层叠接线相关的静态门，7 个文件）：railModalGate **11/11**、railDrawerGate **6/6**、mathStyle **4/4**、touchTargets **6/6**、themes **12/12**、export **30/30**、railDiffA11y **4/4**，全 exit 0（`.tmp/r137-tester-target-tests.log`）。
- 回归：`.tmp/e2e-r126-drawer-focus.mjs --phase after` **20/20**（窄窗抽屉困焦点 / 模态语义 / 字数明细不落背板）。跑后 `git status` 无截图残留。
- 未跑：`npm run verify`、`npm test` 全量、`roundtrip`（批末 / 未动编辑器与序列化）。

## 4. 侧效应（不判 FAIL）
`.toast` 与 `.link-editor` 同为 z **45**（`src/styles.css` 全局 z 表），对话框 46 之后二者低于对话框：若对话框开着还冒 toast，它会被 30% 背板压暗（仍可见、不可点）。本轮未找到「对话框开着又要点 toast」的用户路径（dialogOpen 时产品键被吞、`#root` inert），只记 z 序，不改代码。

## 5. UNVERIFIED
真 WebView2 宿主、真实中文 IME、1024×700 以外窄窗档位（`≤1119px` 同一规则，只测一档）、原生打印。

## 6. 收尾
- `docs/CHANGELOG.md` 的 `## Unreleased` 加「第 137 轮」一行；`docs/iteration/STATE.md` 轮次表加一行；`BACKLOG.md` 的 B-253 → `fixed`。
- commit 已做（消息 `round-137: 窄窗抽屉打开时确认框不再被抽屉与遮罩盖住（B-253）`），`git rev-parse HEAD` 已不同于 startSha；具体 hash 见本轮回报。
