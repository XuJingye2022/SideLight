# 第 143 轮执行报告（B1/B2/B3）

2026-11-21。executor。startSha `51c4ff2`；0.32.2 不动，未 commit/push、未改 `release/`。

## 1. 任务状态（3/3 DONE）

| 任务 | 结果 | 文件 |
| :--- | :--- | :--- |
| B1 顶栏/菜单/键位、删格式栏 | DONE | `App.tsx`、`FileMenu.tsx`、`ShortcutsDialog.tsx`、`styles.css`、3 个 scripts、`.tmp/e2e-r140-b.mjs` |
| B2 状态栏 + 左右栏重复入口 + 右栏压头 | DONE | `StatusBar.tsx`、`StatsDetail.tsx`、`MarginRail.tsx`、`TreeActions.tsx`、`FileTree.tsx`、`App.tsx`、`styles.css`、`touchTargets.test.ts`、`railDrawerGate.test.ts`（文案） |
| B3 设计语言 + 计数表 + 等价入口表 + 截图 | DONE | 新 `docs/design-language.md`、`README.md`、`shots/round-143/` |

## 2. 实现

- 顶栏 5 钮：文件▾ / 分析 / 保存 / 插入▾ / 批注。删导出▾、?、设置、对比；插入▾ 从格式栏迁入 `.menu-wrap`；批注所有视图渲染，非编辑视图 disabled。
- `FileMenu` 四组：主项 5、导出 4（`data-group="export"`）、视图 5（`menuitemradio`+`aria-checked`）、帮助 2；删「关闭文档」。`Ctrl+Alt+E` 改为开菜单并聚焦导出首项；F8 翻转专注（仅 edit），快捷键一览补 F8。
- 删格式栏 JSX、`.toolbar*`/`.diff-toggle`/`.export-menu`/`.export-wrap` CSS、`heading1On…codeOn`、`exportOpen`；`closeDiff` 焦点回 `.file-menu-trigger`。
- B2：状态栏删 4 模式 chip/元数据/保存到/草稿时间与 `draftShown`，选区并入 `.stats-trigger`；`StatsDetail` 加 `frontmatter?` 行；左栏 ⋯ 删「刷新」；右栏删 `.rail-head`，状态 + 在审 + 折叠/关闭并进 `.rail-tabs`（内层 `.rail-tablist` 保持 tablist/roving/aria-controls）。
- 偏差：对比模式不整体 `inert` 顶栏（CDP 点触发器会 element is inert），改禁用「插入」；菜单 Esc/Tab 加 `stopPropagation()` 防连带关对比面板；`export-math-acceptance.mjs` 去掉 `browser.close()`（CDP 共享）。

## 3. 门禁（真跑）

- `npx tsc --noEmit` exit 0；`npm test` **72 文件 1003 条 0 fail**（`.tmp/r143-npm-test.log`）。
- `npm run verify` exit 0 PASS：门 **316,793** + 常驻 **4,480** = 真实首载 **321,273 B**（硬线 325,000 余 3,727；比改前 321,950 **−677**）。日志 `.tmp/r143-verify.log`。
- `keyboard-acceptance.mjs` **52/52**（`.tmp/r143-kbd.log`，跑完已还原 `shots/round-05/`）。
- `.tmp/e2e-r143-ui.mjs` 新：**23/23**、pageErrors 0（`.tmp/r143-impl-ui.json`）：菜单 radio 5 + aria-checked、文件→帮助→设置、Ctrl+Alt+E 聚焦 HTML、F8 后 `.is-dimmed` 3、状态栏无 6 个禁词且 chip 1、frontmatter→「元数据」、右栏 1440/1024 两态、首卡 top 161→130（−31）、夹具可见可点常驻控件 20。
- `.tmp/e2e-r140-b.mjs` **38/38**；export 7/7、export-math 10/10（均走文件菜单；历史图已还原）。
- 静态门：`\.toolbar` 0、`导出 ▾` 0（改前 1）、`'关闭文档'` 0（改前 `FileMenu.tsx:26`）、`rail-head` 0、`export-menu|export-wrap|diff-toggle` 0。两个触发器 DOM 各 1（另有注释含「文件 ▾」，未改注释凑门）。

## 4. 截图

`shots/round-143/b1-file-menu-1440.png`、`shots/round-143/b2-drawer-1024.png`。

## 5. CHANGELOG 一行

`第 143 轮：UI 精简——删常驻格式栏与顶栏导出/?/设置/对比，文件菜单分文件/导出/视图/帮助四组（Ctrl+Alt+E 直达导出、F8 专注、视图项 aria-checked）；状态栏只报写作事实、右栏栏头并入页签行；新增 docs/design-language.md。`

## 6. 新踩坑

1. 删格式栏后脚本按 `getByRole('button', {name:'表格'})` 取插入项会超时：菜单项是 `role="menuitem"`，改 `.menu-wrap .menu [role="menuitem"]`。
2. 对比模式不要给顶栏 `inert`：CDP 点 `.file-menu-trigger` 报 element is inert；只禁用插入钮，菜单自己的 Esc/Tab 要 `stopPropagation()`。
3. 「批注」钮宽窗本来 `display:none`：常驻控件「可见可点」与第 142 轮「控件类型」两口径差 5 个，计数表要标口径。
