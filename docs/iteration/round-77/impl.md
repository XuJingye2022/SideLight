# 第 77 轮执行报告（executor）

## 环境与基线
- HEAD `startSha 1662bee` 已核；dev `http://localhost:5175` = 200。CDP 9222–9226 一次探测全无监听 → 三个 E2E 记 **UNVERIFIED**。
- 基线（round-76/test.md）：`npm test` 43 文件 **559 条**；首屏 gzip **303,664 B**。
- 改前静态（0 命中 exit 1）：`SettingsDialog` `tabIndex`/`onKeyDown` 0/0；`FindBar` `readOnly` 0、`disabled=` 4；`StatsDetail` `onKeyDown`/`'Tab'` 0/0。

## A1（B-109）主题 radiogroup：roving tabindex + 方向键 —— 完成
- 新建 `src/lib/radioGroup.ts`（`nextRadioIndex`：右/下 +1、左/上 −1、Home/End、未知键与 count 0 → null；`rovingTabIndex` 三态）＋ `radioGroup.test.ts` **10 条**（10/10）。
- `SettingsDialog.tsx`：两段 map 合成模块级 `THEME_CHOICES`（3 档 + 暖纸 = **4 项**）一段渲染；按钮 `tabIndex={rovingTabIndex(index, selectedTheme)}`；`.theme-options` 挂 ref + `onKeyDown`：命中键 `preventDefault()` → `update` + `data-theme` → 组内 `[role="radio"]` 第 next 项 `.focus()`；`is-on`/`data-theme-id`/`aria-checked` 保留。
- 静态：`tabIndex` 0→1（`:85`）、`onKeyDown` 0→2（`:76` + `onThemeKeyDown`）；`role="radio"` 渲染分支 2 段→1 段（`:81`），运行时 4 项 UNVERIFIED。
- 已知：打开设置时 `useDialogFocus` 仍聚焦第一个 radio（浅色），与 roving 停点可能不同项。

## A2（B-136）只读视图查找条：锁死输入与 Aa/ab —— 完成
- 新建 `src/lib/findBarState.ts`（`findBarControls` + `FIND_NOTE_ID`）＋ `findBarState.test.ts` **7 条**（7/7）。
- `FindBar.tsx`：`:49` 用 `controls`；两 input `readOnly`（`:60`/`:118`）+ `aria-describedby` + 占位「（此视图不可用）」；Aa/ab `disabled={controls.togglesDisabled}`（2 处）；4 个动作钮用 `controls.actionsDisabled`；`.find-note` 加 `id`。Enter 二道闸保留，Esc/关闭钮不动。
- 静态：`readOnly` 0→2、`disabled={controls.togglesDisabled}` 2、`disabled=` 4→6、`findBarControls` 2 处。

## A3（B-151）字数明细面板：Tab 关闭并回触发钮 —— 完成
- `StatsDetail.tsx:83-89` 新增 `onKeyDown`：`event.key === 'Tab'`（含 Shift+Tab）→ `preventDefault()` → 先取 `.stats-trigger` → `onClose()` → `focus()`；面板 `:109` 挂 `onKeyDown`。**未改 App.tsx**。
- 静态：`onKeyDown` 0→1、`'Tab'` 1 处；`preventDefault` 与 `onClose` 同在 Tab 分支。

## 门禁
- `npx tsc --noEmit` exit 0。
- `npm test` exit 0：**45 文件 576 条 0 fail**（基线 43/559，+2 文件 +17 条：A1 +10、A2 +7、A3 0）。`.tmp/r77-impl-npm-test.log`。
- `npm run verify` exit 0：首屏 gzip **303,667 B**（≤310,000，余 6,333 B）。`.tmp/r77-impl-verify.log`。
- 未跑 `roundtrip`：未改编辑器/序列化。dev server 已交付新模块（ASCII 标记 `rovingTabIndex`/`findBarControls`/`onKeyDown` 均在）。

## E2E（UNVERIFIED）与收尾
- 交付 `.tmp/e2e-r77-a1-theme-kb.mjs`、`-a2-find-locked.mjs`、`-a3-stats-tab.mjs`，`node --check` 全 exit 0；CDP 不可用未跑。无截图（沙箱禁启动 Chromium）。
- BACKLOG：B-109、B-151 改 `fixed`；B-136 从 Deferred（5 列）搬到 P2 表（6 列）标 `fixed`，证据已写。HEAD 版 ID 对比 81→81、0 重复 0 缺失（`.tmp/r77-backlog-head.md`）。

## CHANGELOG 一行建议
`- 可访问性：设置主题单选组改 roving tabindex + 方向键/Home/End（B-109）；只读视图查找条锁住输入与 Aa/ab 并说明原因（B-136）；字数明细面板 Tab/Shift+Tab 关闭并回触发钮（B-151）。`

## 新踩坑
1. BACKLOG 是两张列数不同的表（P2 6 列 / Deferred 5 列）：用 edit 搬行时把相邻行写进 old_string 会连带删行（本轮误删 B-212、B-147，已还原）；搬完用 HEAD 版 ID 集合对比自查。
2. `Select-String -Pattern 'role="radio"'` 会把 `querySelectorAll('[role="radio"]')` 也算一条：判渲染分支数要看行上下文。
3. esbuild 剥掉类型标注：验 dev server 新代码别用类型名（`KeyboardEvent`）当 ASCII 标记。
