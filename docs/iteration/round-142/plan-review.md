# 第 142→143 轮计划审查（critic 第 2 版，取代 v1）

基线 `e7a2753`。**REVISE**：前版 6 条已全核销；新发现 5 条「照做会红或丢入口」。

## 前版核销（实测）
- H1 ✔ `trash.ts` 现 11 处（68/71/115/128/135/207/217/221/255/414/417）；`trash.test.ts` 只测 `pickTrashSource`/`shouldWriteCurrent`，无错误串断言 → 全换 `writeReasonOf` 后「0 命中」可达。
- H2 ✔ `SettingsDialog.tsx:116/118` 有 `role=dialog` 与 `aria-label=设置`。
- H3 ✔ `FileMenu` 加 `openGroup` 可行，键位与 `aria-keyshortcuts` 保留。
- H4 ✔ `pickerWindow()` 即 `window`（`workspace.ts:70-72`、`:123`），覆写 `showDirectoryPicker` 成立；`writeDraftFallback`（`App.tsx:4152-4168`）经 `parentDirectory`→`writeCache`，`noWrites` 下可能成未处理拒绝，计划已留 ≤4 行兜底。
- H5/H6 ✔ `.status-bar` 口径拆分、视图 5 项正向断言、B1 中途 verify 与 CSS 三处齐全。

## 新漏洞（P1）
**N1 键盘门会红**：`keyboard-acceptance.mjs:265-268` 断言 ↓ 从「新建」到「关闭文档」，`:278-280` 的 Enter+↓↓+Enter 也指「另存为」；删 `FileMenu.tsx:26` 的「关闭文档」后必红，计划只列 `:238-253` 与 `:289`。修：同批改 `:268` 为「另存为…」、`:278-280` 改 ↓×1；B3 门加「keyboard-acceptance 0 FAIL」。

**N2 视图 5 项键盘不可达**：`FileMenu.tsx:116` 与 `:62` 只取 `[role="menuitem"]`；新 `menuitemradio` 不进 ↓/↑ 循环，Tab 又直接关菜单 → 删格式栏后「打字机」既无键位也无键盘入口（撞「不砍功能」）。修：两处选择器并为 `[role="menuitem"],[role="menuitemradio"]`（含 `:not([disabled])`），`openGroup` 聚焦同一列表；E2E 加「导出组末项 ↓ 到视图首项、Enter 切打字机、`aria-checked=true`」。

**N3 右栏动作钮被页签样式拉满**：`styles.css:1359` 的 `.rail-tabs button{flex:1;…}` 未限定 `[role="tab"]`；在审/折叠有 `:1375` 的 `flex:none` 兜底，`.rail-close` 没有，`:3848` 只补 `margin-left:auto` → 抽屉里「×」按 flex:1 拉满整行；且 `role="tablist"` 内混入 3 个非 tab 按钮。修：选择器改 `.rail-tabs [role="tab"]`，或给 `.rail-close` 补 `flex:none`；验收加「× 宽 ≤32px」。

**N4 删「设置」只改 1 个脚本**：`theme-acceptance.mjs:65`（r95/r97 的回归证据）用 `getByRole('button',{name:'设置'})`，删顶栏钮后 0 命中；`newfile-acceptance.mjs:350`、`draft-acceptance.mjs:324/479`、`qa9/qa15/qa` 同类。theme-acceptance 还写 `shots/round-05`（跑完要 `git checkout -- shots/round-05/`）。修：B1 脚本清单补 theme-acceptance（走 文件→帮助→设置），其余逐条写「过期」并进 B3 表。

**N5 删 `draftLabel` 落点不全**：`draftShown`/`setDraftShown` 共 6 处（`App.tsx:651/1576/2795/3568/3642/6543`），计划只点 651 与 3642 → 按字面删会 tsc 未知符号；且「草稿 HH:MM」是本地草稿恢复的唯一提示（`draftRestored` 只覆盖宿主草稿），B3 等价入口表未列。修：列全 6 处，或在 B3 表写明并入自动保存 chip 的 title。

## 不阻塞
- B1 新增 11 项菜单 + `openGroup`/焦点管理，删 ~195 行工具栏 + ~80 行导出菜单 + ~90 行 CSS，粗估 gzip 净减 2–3 KB，应落 321,950 内；「先删 kbd 文案」退路会丢键位提示，先量再裁。
- `ShortcutsDialog.tsx:19`「导出菜单」与 `keybindings.ts:33` 标签未随新语义改，顺手改。
