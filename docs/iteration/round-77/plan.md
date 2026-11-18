# 第 77 轮计划（单轮，3 任务）

轮参数：round=77 / nn=77 / 报告 `docs/iteration/round-77` / startSha `1662bee`（=HEAD 已核）。dev 只用 `localhost:5175`（实测 200）。**每任务只探一次 9222–9226**：本轮 5 端口全无监听 → 浏览器项记 UNVERIFIED，主证据 = 单测 / `build` / `verify` / 静态检查（改前值先量）。门禁 `npm run build`、`npm test`（第 76 轮 43 文件 559 条，先记基线）、`npm run verify` 首屏 ≤310,000 B（现 303,664 B）。不动内核/序列化，免 roundtrip。

批次：公式/高亮 3 条回归第 73–75 轮已做（B-157 待 CDP）；按用户要求 P2 每 3 条一批。本批 **B-109**（open）+ **B-136**（open）+ **B-151**（deferred），均单测/静态闭环（「P2 不排计划」按直令豁免）。

## A1（B-109）主题 radiogroup：roving tabindex + 方向键

问题（已核）：`SettingsDialog.tsx:44-88` 4 个 `role="radio"` 零 `tabIndex`/`onKeyDown`（改前 `tabIndex|onKeyDown` **0 命中**），各占一个 Tab 站。

修法：
1. 新建 `src/lib/radioGroup.ts`：`nextRadioIndex(key,cur,count)`（`count<=0`→null；`base=0<=cur<count?cur:0`；Right/Down→`(base+1)%count`；Left/Up→`(base-1+count)%count`；Home→0；End→`count-1`；其余→null）；`rovingTabIndex(i,selected)`（相等 0，否则 −1；`selected<0` 时首项 0）。
2. `SettingsDialog.tsx`：两段 map 合成模块级 `THEME_CHOICES`（`THEME_MODES` 三项 + `BUILTIN_THEMES`，数组序=DOM 序=索引）一次渲染，按钮 `tabIndex={rovingTabIndex(i, selectedIndex)}`。
3. `.theme-options` 挂 `ref`+`onKeyDown`：命中则 `preventDefault()` → `update({theme})` + `documentElement.setAttribute('data-theme', value)`（同现 onClick 预览路径）→ `querySelectorAll('[role="radio"]')[next].focus()`；onClick 与 `aria-label` 不动。

验收：新 `radioGroup.test.ts` ≥8 条（右/下 +1、末项右回首、左/上 −1、首项左到末、Home/End、单项组、未知键与 count 0 → null、roving 三态）；`npm test` **43→44 文件**、条数=基线+≥8、0 fail，`package.json` 追加；静态 `git grep -n 'tabIndex' src/components/SettingsDialog.tsx` ≥1、`onKeyDown` ≥1（改前 0）；`build` 绿、`verify` ≤310,000 B。E2E `.tmp/e2e-r77-a1-theme-kb.mjs`：点 `getByRole('button',{name:'设置',exact:true})` → 4 个 radio、tabIndex 恰 1 个 0/3 个 −1；选中项 ArrowRight → 焦点下一项、`aria-checked="true"`、`documentElement.dataset.theme` 已变；End→sepia、Home→首项、Tab 后 activeElement 不在组内；0 控制台错误。连不上记 UNVERIFIED。

风险：不改 `system` 媒体查询；App 主题 effect 只在开关/保存跑。

## A2（B-136）只读视图查找条：锁死输入与开关

问题（已核）：`FindBar.tsx:48-49` 的 `locked` 只喂 4 个动作钮 `disabled`（文件内 4 处）；`:54-96` 输入无 `readOnly`、Aa/ab 无 `disabled`（`src/components` 内 `readOnly` **0 命中**）。

修法：
1. 新建 `src/lib/findBarState.ts`：`findBarControls(reason, matchCount)` → `{locked, actionsDisabled, inputsReadOnly, togglesDisabled}`（locked=Boolean(reason)；动作钮=locked||0 命中；只读/禁用=locked），另导出 `FIND_NOTE_ID='find-locked-note'`。
2. `FindBar.tsx` 用它替本地 `locked/disabled`；两 input 加 `readOnly={controls.inputsReadOnly}`（只读仍能收 Esc、可复制），锁住时加 `aria-describedby`、placeholder 改「（此视图不可用）」；Aa/ab 加 `disabled={controls.togglesDisabled}`；`.find-note` 加 `id`。Enter 里既有 `if (locked) return` 留作二道闸，Esc 与关闭钮不动。

验收：新 `findBarState.test.ts` ≥6 条（源码/预览两种 reason 全锁；`undefined`、`''` 不锁；未锁 0 命中只锁动作钮；未锁有命中全放行）；`npm test` 44→**45 文件**、条数=基线+≥14，`package.json` 追加；静态 `git grep -n 'readOnly' src/components/FindBar.tsx` 0→2、`disabled={controls.togglesDisabled}` 2 处、`disabled=` 4→6；`build`/`verify` 绿。E2E `.tmp/e2e-r77-a2-find-locked.mjs`：预览态 `Ctrl+F` → 两 input `readOnly===true`、`.find-note` 含「只读」、`keyboard.type('丁节')` 后 value 不变、Aa `disabled===true` 且 `aria-pressed` 不变、Esc 关条且 `__slState.viewMode==='preview'`；切回编辑 `Ctrl+F`：`readOnly===false`、Aa 可点。CDP 不可用 → UNVERIFIED。

风险：只读态 `autoFocus` 仍落输入框；不改焦点落点（动既有脚本）。

## A3（B-151）字数明细面板：Tab 关闭并回触发钮

问题（已核）：`StatsDetail.tsx:58-101` 只有 `tabIndex={-1}`+打开 `focus()`，`onKeyDown` **0 命中**；面板无可聚焦子节点，按一次 Tab 后 activeElement 是 `BODY`、面板不关（第 70 轮 `.tmp/e2e-r70-stats-focus.mjs`）。

修法（fix_hint 方案 A）：面板 `onKeyDown` 只认 Tab（含 Shift+Tab）：`preventDefault()` → `onClose()` → `document.querySelector('.stats-trigger')?.focus()`。`role="dialog"`、`tabIndex`、打开聚焦、点外关、App 的 Esc 分支（`App.tsx:4151-4155`）不动，**不改 App**。

验收：静态 `git grep -n 'onKeyDown' src/components/StatsDetail.tsx` 0→1、`'Tab'` 1 处；E2E `.tmp/e2e-r77-a3-stats-tab.mjs`（照 r70 脚本）：点 `.stats-trigger` → 150 ms 内 activeElement 是 `.stats-detail` → Tab → 200 ms 后 `.stats-detail` 不在 DOM、activeElement 是 `.stats-trigger`、`aria-expanded==='false'`、`[inert]` 0；重开 Shift+Tab、Esc 各同一结果（不回归）；0 控制台错误。CDP 不可用 → UNVERIFIED。`npm test` 条数=基线、`build`/`verify` 绿。

风险：Tab 关闭后焦点停触发钮，往后多一次 Tab；不改成只关不夺焦（会落 BODY）。

## 收尾与不做

- 每任务后把 BACKLOG（B-109/B-136/B-151）改 `fixed`，证据写 文件:行号+命令+`.tmp/` 日志；tester 复验后 `verified`。
- 不做其余 P2（B-103/106/107/110/121/126）与 Deferred 表；B-157 仍等 CDP；不改序列化/内核、不跑 roundtrip、不加依赖；不发版、不 push、不改 `release/`。
