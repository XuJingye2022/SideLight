# 第 14 轮 · 计划审查（critic）

审查对象：`docs/iteration/round-14/plan.md`（基线 `d941874`，v0.27.0）。
审查方式：读计划、三份 findings、`src/App.tsx` 的 new/refresh/saveTarget/autosave 段、`.github/workflows/ci.yml`；未改产品文件、未 commit。
审查日期：2026-11-16。

## 结论：**REVISE**

H1（refresh「找不到一律保留」会把外部已删除/改名的文件继续当活动文件）、H2（`saveTargetRef` 六处未覆盖 + 「无基线」未定义 + 回归缺 rename）是 blocker；H3–H6 为 major。

## 漏洞表（H1–H6）

| 编号 | 级别 | 问题 | 证据（文件:行 / 实测） | 最小修法 | 影响 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| H1 | blocker | T1 `:13` 要求 refresh「只按传入 activePath 精确重绑，找不到时保留传入值、**绝不清空**」。这对「新建后 refresh」是对的，但对「打开 a.md → 外部删除/改名 → 刷新」会把 `activeFile`/`saveTargetRef` 继续指向旧句柄；下一次 `Ctrl+S` 或自动保存就写回旧路径，正是 round-12 修过的「复活」反向复发。 | `plan.md:13`；`findings-bug.md:51-66`（refresh 闭包/旧 activeFile）；`App.tsx:1710-1719`（按 path 找不到清空）、`:1723-1727`（已不在磁盘提示） | refresh 增加 `mode: 'adopt' \| 'check'`：new/rename/saveAs 用 `adopt`，找不到保留传入值；普通「打开/刷新」用 `check`，找不到清 `activeFile`/`saveTargetRef` 并标「已不在磁盘上，只能另存为」；补「外部删除后 Ctrl+S 不复活」「外部改名后不写旧名」两例 | T1 |
| H2 | blocker | T1 `:13-16` 说 `saveTargetRef` 在「新建/另存为/打开/重命名」四条路径更新，但用户问的六处还包括**删除**与**刷新**；T2/T3 的 refresh 重绑若漏写，旧 `saveTarget` 仍在。`startNewDocument` 的「无基线」判定只写「没有已保存基线」，没定义用 `originalText === null` 还是 `dirty`；首次手动保存后如何恢复自动保存也没写。T1 验收 1–5 只测新建/另存为/打开，**没有 rename 回归**，而 rename 与 refresh 共用同一 adopt/rebind。 | `plan.md:13-21,25`；`findings-bug.md:51-71`；`App.tsx:1930-1936`、`:1690-1718`、`:2043-2051` | 把六处列成表：new/saveAs/open/rename/delete/refresh 各自写 `activeFile`、`saveTargetRef`、`allowAutoSave`；「无基线」明确定义为 `originalText === null && saveTargetRef`，首次手动 `finishSaved` 后置 `hasSavedBaseline=true`；补「rename 后 Ctrl+S 写新名」「删除后 refresh 不写旧名」 | T1 |
| H3 | major | T3 `:57` 把 `SettingsDialog`/`ShortcutsDialog` 改 `React.lazy` + `Suspense fallback={null}`；首次点「设置」/按快捷键时 chunk 未到，界面**没有任何反馈**，用户会以为按钮坏了；这与 T2「首屏焦点进正文」的 `rAF` 也可能抢走刚打开的设置/查找面板焦点。`hidden` 方案让 `FileTree` 保持挂载，树内快捷键/全局 `Delete` 是否仍响应没有写。 | `plan.md:57,59,48`；`findings-ux.md` 的设置首点/焦点；`App.tsx` 的 settings/shortcuts 渲染 | `Suspense` 用可见的轻量 fallback（按钮 loading 或空 dialog 骨架），并给 `aria-busy`；`rAF` 聚焦前检查 `settingsOpen/shortcutsOpen/findOpen/pendingConfirm`；`hidden` 面板加 `inert`（或 `aria-hidden` + `tabindex=-1`），确保树内快捷键不响应；补「设置首点有反馈」「对话框打开时焦点不被正文抢」 | T2/T3 |
| H4 | major | T5 当前 284,973、余 27 B；O2 的 `demoWorkspace` 是否真的省 200–300 B 未验证（findings B3 `:145` 说它从未调用，**很可能已被 tree-shake**），O1 省 1.5–2 KB，P3/P4 加 350–650 B，T1/T2 新代码另算；`27 B + O2(可能 0) + O1(1.5–2K) - P3/P4(0.35–0.65K) - T1/T2` 可能仍超。T3 又要求 P3/P4 全做，T5 超线只能「记录延后」，与 T3 验收冲突。 | `plan.md:4,57-63,97-102`；`findings-bug.md:145`（demoWorkspace 未调用）；`findings-ship.md` 的 27 B 口径 | 先实测 O2 单独 diff；若 O2≈0，把 O1 的目标从 1.5 KB 提到 2 KB 并准备第二杠杆（如把 `ShortcutsDialog` 的静态数据移到 chunk）；T3 验收拆「P0/P1/P2 必过、P3/P4 可延后」；T5 超线只砍 P3/P4 并写「延后」；0.28.0 条件化 | T3/T5 |
| H5 | major | T4 `:81` 的 `release.yml` 有 `workflow_dispatch` 的 `publish` 默认 false，但 `release` job 只写 `needs` 三者，没有 `if: inputs.publish`；dry-run 仍会创建 Release。`overwrite_files: true` 与 `SHA256SUMS` 的生成时机也没写死：checksum 必须在所有 artifact 下载后、`action-gh-release` 之前生成，否则上传的 checksum 缺文件。 | `plan.md:81,87`；`.github/workflows/ci.yml` 当前无 release；`findings-ship.md` 的 S1/S4 | `release` job 加 `if: github.event_name == 'push' || inputs.publish`；`preflight` 也校验 `publish=false` 时只 build 不 publish；`SHA256SUMS` 在 `download-artifact` 后、`action-gh-release` 前生成并 `sha256sum -c` 自检；`overwrite_files: true` 只对已存在资产，补「重跑同一 tag」测试 | T4 |
| H6 | major | T2 `:37` 删除 `demoWorkspace`/`DEMO_FILES`/`demo` 字段，但 `FileTree` 的 `workspace.demo`、`App` 的 demo 判断、`ReadNode` 的 `demoTexts` 可能仍有引用；若只删函数不删 `demo` 字段，`Workspace` 类型与调用点会编译错或留下死分支。T2 `:38` 的「打开文件夹后自动打开第一个 .md」只在「没有未保存改动」时做，`dirty` 判定与示例空态/新建空文档的 `documentKind` 要一致，否则会出现「旧示例冒充新工作区」的 B3 复发。 | `plan.md:37-38,46`；`findings-bug.md:116-154`（B3/demoWorkspace） | `grep -rn 'demoWorkspace\|DEMO_FILES\|demoTexts\|\.demo' src/` 全量列出；删函数同时删 `Workspace.demo` 字段、`FileTree` demo 分支、`App` 分支、`styles` 的 `.file-badge/.file-tree-demo-note`；`openFolder` 用统一的 `documentKind`（sample/blank/none）决定自动打开或清空；补「打开文件夹后三处文案一致」 | T2 |

---

## H1（blocker）refresh「找不到保留」与外部删除

findings B2 的实测：

```
afterRenameRefresh { activeRows:0, stateName:"a.md", title:"Sidelight" }
afterRenameCtrlS { pickerCalled:1, writes:[] }
```

T1 的 P0 修法是 `startNewDocument` 先 `loadIntoEditor('', name, file)`，再 `refreshTree()`；但 `refreshTree` 的 `activeFile` 是创建时闭包值（旧 `a.md`），按 path 找回后 `setActiveFile(rebound)` + `saveTargetRef=rebound`，于是新文档的目标变成 `a.md`。

计划 `:13` 改成「refresh 只按传入 `activePath` 精确重绑，找不到保留传入值、绝不清空」。这能修新建，但会引入反向问题：

- 打开 `a.md` → 外部删除/改名 → 刷新：`activePath` 仍是旧 path，refresh 找不到；按计划「保留」→ `activeFile` 仍是旧 `a.md` 句柄，`saveTargetRef` 仍是旧句柄；`Ctrl+S` 或自动保存把内容写回旧路径，**复活/写错名**。
- 打开 `a.md` → 外部改名 `b.md`：旧 path 找不到，保留旧句柄；FSA 句柄可能仍指向 `b.md`，保存会写到 `b.md`，用户以为还是 `a.md`。

**修**：refresh 增加语义参数：

- `adopt`（new/saveAs/rename）：传入新 path 和新 handler，找不到保留新值；
- `check`（打开/手动刷新）：按 path 找不到就 `setActiveFile(null)`、`saveTargetRef=null`、标「已不在磁盘上，只能另存为」，不得写旧句柄。

补「外部删除后 Ctrl+S 不复活」「外部改名后不写旧名」两例。

## H2（blocker）`saveTargetRef` 六处与「无基线」

T1 `:13` 说「新建/另存为/打开/重命名」四条路径；用户问的六处还包括**删除**和**刷新**。现有：

- 删除：round-12 已清 `saveTargetRef`；
- 刷新：T2/T3 的 `refreshWorkspace` 会重绑 `activeFile`，若不同步清/写 `saveTargetRef`，旧 target 仍在；
- `loadIntoEditor` 当前 `saveTargetRef=null`，打开文件靠 `activeFile.handle` 回退；
- 另存为 `finishSaved` 设置 `saveTargetRef`；
- 重命名 `adopt` 设置。

计划应把六处列成表，每处明确 `activeFile`/`saveTargetRef`/`allowAutoSave` 三个值，否则 T1 修完 P0，T2/T3 的 refresh 又把旧 target 带回来。

「无基线」：

- 计划 `:15` 写「文档没有已保存基线（新建/空基线、非宿主文档）时 `runAutoSave` 直接跳过」；
- 没定义用哪个字段判定。`originalText` 在 `loadIntoEditor('')` 时是 `null`，新建/空文件都是 `null`；`dirty` 在输入后是 `true`；`saveTargetRef` 在新文件上已有句柄。建议明确：`originalText === null && !hasSavedBaseline` 时跳过，首次 `finishSaved` 置 `hasSavedBaseline=true`。
- 首次手动保存后自动保存恢复，要断言「Ctrl+S 后再输入 2.5 s 写入新文件」；T1 验收 `:21` 有，但没写 `hasSavedBaseline` 的复位（切文档/新建要复位）。

回归：T1 验收 1–5 只测新建/另存为/打开，**没有 rename**；rename 与 refresh 共用 adopt/rebind，必须补「rename 后 Ctrl+S 写新名」。

## H3（major）O1 懒加载首点与 `hidden`

T3 `:57`：

```
SettingsDialog/ShortcutsDialog 改 React.lazy() + Suspense fallback={null}
```

首次点「设置」时 chunk 未到，`fallback=null` 让点击看起来没反应；如果 `ShortcutsDialog` 由键盘打开，用户更容易以为快捷键失效。`Suspense` 应给可见的轻量 fallback（按钮 loading/空 dialog 骨架 + `aria-busy`），并保持焦点在触发按钮上。

T2 `:34` 的 `rAF` 聚焦 `.ProseMirror` 也要排除 `settingsOpen/shortcutsOpen/findOpen/pendingConfirm/pendingSwitch`；否则首屏设置刚打开就被正文抢焦点。

`hidden` 方案（`plan.md:59`）让 `FileTree` 保持挂载，树内 `keydown`/全局 `Delete` 是否仍响应没有写。给隐藏面板加 `inert`（或 `aria-hidden` + `tabindex=-1`），确保树内快捷键不响应，同时保留 `expanded/scrollTop`。

## H4（major）27 B 与 O2 的真实收益

当前 284,973，余 27 B。T5 的预算依赖：

- O2 删 `demoWorkspace` 死代码：200–300 B；
- O1 懒加载设置/快捷键：1.5–2 KB；
- P3/P4：350–650 B；
- T1/T2 新代码：另算。

findings B3 `:145` 说 `demoWorkspace()` **从未被调用**；它很可能已被 tree-shake，O2 的真实收益可能接近 0。若 O2≈0，O1 1.5–2K 减去 P3/P4 0.35–0.65K、再减 T1/T2 新代码，27 B 余量不够。T3 又要求 P3/P4 全做，T5 超线只能记录延后，两者冲突。

**修**：

1. 先单独 build 测 O2 的 diff；若 <100 B，把 O1 目标提到 2 KB，并准备第二杠杆（把 `ShortcutsDialog` 的静态快捷键表也移进 chunk、或把 `SettingsDialog` 的常量拆出）。
2. T3 验收拆「P0/P1/P2 必过、P3/P4 可延后」；T5 超线只砍 P3/P4 并写「延后」；0.28.0 条件化。
3. 不许改 `measure-first-screen.mjs` 的 285,000。

## H5（major）release.yml 的 dry-run 与 SHA 时序

- `workflow_dispatch` 的 `publish` 默认 false，但 `release` job 只写 `needs` 三者，没有 `if: inputs.publish`；dry-run 仍会创建 Release。必须加 `if: github.event_name == 'push' || inputs.publish`，并让 `preflight` 在 `publish=false` 时只 build 不 publish。
- `SHA256SUMS-<版本>.txt` 必须在所有 artifact 下载后、`softprops/action-gh-release@v3` 之前生成，并 `sha256sum -c` 自检；否则 checksum 可能缺文件。
- `overwrite_files: true` 对重跑同一 tag 是幂等的，但要有「重跑」「资产已存在」「无匹配文件」三条验证；`fail_on_unmatched_files: true` 要确保 build job 的 artifact 名称与 release 的 `files` 完全一致。
- `contents: write` 只在 release job 出现；build jobs 保持 `contents: read`，权限拆分方向对。

## H6（major）T2 删 demo 的引用面

T2 `:37` 要删 `demoWorkspace`/`DEMO_FILES`/`demo` 字段，但当前：

- `FileTree` 有 `workspace.demo` 徽章/说明；
- `App` 有 `demo` 判断；
- `workspace.ts` 有 `demoTexts`/`demoWorkspace`；
- `styles.css` 有 `.file-badge`/`.file-tree-demo-note`；
- `Workspace` 类型有 `demo`。

只删函数不删字段/分支会编译错或留死代码。T2 `:38` 的「打开文件夹后自动打开第一个 .md」也要和 `documentKind`（sample/blank/none）统一，否则会出现 B3 的「旧示例冒充新工作区」。

**修**：`grep -rn 'demoWorkspace\|DEMO_FILES\|demoTexts\|\.demo' src/` 全量列；删函数时同删字段/分支/样式；`openFolder` 用 `documentKind` 决定自动打开/清空；补「打开文件夹后三处文案一致」。

## 逐项核对记录

### T1
- P0 根因确认：`startNewDocument` 先 `loadIntoEditor` 再 `refreshTree`，refresh 闭包旧 `activeFile` 回绑并写 `saveTargetRef`，`performCommit` 优先用 `saveTargetRef`。
- 统一顺序「先 activeFile/saveTarget 再 refresh」方向对；refresh「找不到保留」对新建对、对外部删除错（H1）。
- `saveTargetRef` 六处与「无基线」定义、rename 回归是 H2。
- 「新建 0 字节、首次手动保存前不写」的验收方向对；草稿兜底仍走既有 localStorage/宿主 draft，需断言不回归。

### T2
- 首次焦点/空占位/三处文案一致，方向对；`rAF` 聚焦要排除对话框（H3）。
- O2 删 demo 的引用面是 H6；O2 的真实收益可能接近 0（H4）。
- `openFolder` 自动打开第一个 .md 或空态，方向对；需和 `documentKind` 统一。

### T3
- tablist/P4 hidden/空文件夹/长名/导出菜单，方向对；`Suspense fallback=null` 首点空白是 H3。
- `hidden` 不卸载 FileTree 保留 `expanded/scrollTop`，方向对；需 `inert` 防快捷键响应。
- 每步 measure 的顺序对；P3/P4 与 T5 的冲突是 H4。

### T4
- preflight、build/release 权限拆分、`overwrite_files`、checksum、`install-verify` 手动，方向对；`publish=false` 的 release job 条件与 SHA 时序是 H5。
- 删除 `continue-on-error` 的依据 findings S2（两次宿主 job 连续绿）成立；真绿仍需首跑观察。

### T5
- 27 B 余量、O1/O2/P3/P4 的预算、0.28.0 条件化，方向对；O2 可能为 0、P3/P4 与 T3 冲突是 H4。

### 通用
- 文件归属：A T1/T2/T3 串行改 `src/` 与两个验收脚本；B T4/T5 串行改 `.github/`、文档、`package.json`；零并发重叠成立。
- 构建纪律：A `npx tsc --noEmit`/dev；B `.tmp/build-b`；根代理 build；成立。
- 可独立复现：T1/T2/T3 的 fake FS/CDP 脚本可跑；release.yml 首跑、macOS 真机、真实盘仍是 UNVERIFIED。

## 做对的地方（别改过头）

1. T1 把 P0 根因定位到「refresh 读旧闭包 + `saveTargetRef` 回绑」，并加四组 SHA/0 字节断言，方向正确；补 `adopt/check` 两种 refresh 语义即可。
2. O1/O2 先腾预算再落 P3/P4 的顺序正确；`measure` 每步跑、不抬 285,000 的纪律要保留。
3. T4 的 build/release 权限拆分、单一 release job、preflight 版本/CHANGELOG 校验方向正确；补 `if publish` 与 checksum 时序。

---

### 附：本次审查证据

- `findings-bug.md:51-71`（refresh 闭包/旧 activeFile、startNewDocument 顺序）、`:145`（demoWorkspace 未调用）、`:19`（move 覆盖）。
- `App.tsx:1930-1936`（startNewDocument）、`:1690-1718`（refreshTree）、`:2043-2051`（performCommit 用 saveTargetRef）。
- `plan.md:13-21,57-63,81-89,97-102`；`.github/workflows/ci.yml` 当前无 release.yml。
- 未改产品文件、未 commit；未生成新截图。
