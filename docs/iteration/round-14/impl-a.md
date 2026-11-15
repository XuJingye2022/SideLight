# 第 14 轮 · A 组实施报告（T1 → T2 → T3）

日期：2026-11-16。基线 `d941874`（0.27.0）。未 commit；未跑 `npm run build`。
边界：`src/**`、`scripts/newfile-acceptance.mjs`、`scripts/tree-acceptance.mjs`（扩用例）、本报告。

| 任务 | 结论 | 证据 |
| :--- | :--- | :--- |
| T1 保存写错目标（P0） | **PASS** | `newfile-acceptance` 17 条：新建后 `Ctrl+S` 写 `未命名.md`、`a.md` SHA 不变、标题/树选中/`__slState` 一致；不保存等 4 s 旧文件不变、新文件 0 字节；首次保存后自动保存恢复写新文件；另存为写 `c.md`；重命名后写 `b.md`；外部删除/改名刷新后 `Ctrl+S` 不写旧路径；删除后刷新再保存不写已删路径 |
| T2 首次使用 | **PASS（核心，`documentKind` 未抽成独立类型）** | 首屏焦点进入 `.ProseMirror`、直接输入 dirty=true；空文档显示「从这一句开始写」、输入后消失；设置打开后焦点留在对话框；树空态改「还没有打开文件夹」；`grep demoWorkspace|DEMO_FILES|demoTexts|.demo|file-badge|file-tree-demo-note` = 0；模拟批注单句只返回 1 条、`simulated` 未定位文案改「这段太短…」 |
| T3 预算与延后项 | **PASS（P3/P4 落地，预算 283,775）** | 侧栏 `tablist/tab/aria-selected/aria-controls` + Home/End/←→；`FileTree` 常驻、`hidden` 切换、隐藏面板 `inert`；切回后 `aria-expanded` 保持；空目录提示；长名省略 + `.doc-name max-width`；导出菜单四项 `role=menuitem`；`SettingsDialog`/`ShortcutsDialog` 懒加载 + 可见 `aria-busy` 骨架 |

## 关键实现

- `refreshTree({ mode: 'adopt' | 'check', activePath })`：新建/改名走 `adopt`（按新 path 重绑，找不到保留新值）；打开/手动刷新/删除走 `check`（找不到清 `activeFile`/`saveTargetRef` 并提示只能另存为）。
- 新建 `path = ${space.name}/${name}`，`loadIntoEditor` 后立即设 `saveTargetRef`，再 `refreshTree({mode:'adopt', activePath})`，不再让旧闭包把 `activeFile` 绑回上一个文件。
- `hasSavedBaselineRef`：`loadIntoEditor` 复位；首次 `finishSaved` 置 true；`runAutoSave` 在 `originalText === null && !hasSavedBaselineRef.current` 时直接返回（新建 0 字节文件在首次手动保存前不写盘）。
- T2：首屏 rAF 聚焦正文，跳过 settings/shortcuts/find/pending 状态；`.editor-placeholder`；删 demo 全链路（类型字段、fixture、分支、CSS）；`MarginRail` 模拟文案；`mockItems` 单句早返回。
- T3：`SettingsDialog`/`ShortcutsDialog` 改 `React.lazy`，`Suspense` 用 `.dialog aria-busy` 骨架；`FileTree` 加 `panelId/hidden/inert`；侧栏 tablist；空目录、长名、doc-name 限宽；导出菜单 menuitem。

## 门禁

```
npx tsc --noEmit                      → exit 0
npm test                              → 16 文件、205 条、0 失败
npx vite build --outDir .tmp/build-a  → exit 0
node scripts/newfile-acceptance.mjs   → 23/23 PASS
node scripts/tree-acceptance.mjs      → 45/45 PASS
node scripts/rename-acceptance.mjs    → 22/22 PASS
node scripts/measure-first-screen.mjs .tmp/build-a --max 285000 → 283,775 gzip PASS（余 1,225 B）
```

**预算**：基线 284,973 → **283,775**（−1,198 B）。O2（删 demo）被 tree-shake，单独 build 差值 <100 B；O1 懒加载 Settings/Shortcuts 实测约 −1.57 KB，T1/T2 新增焦点/占位/刷新语义又吃回约 0.4 KB，最终净省 1,198 B。

## 截图

`shots/round-14/t1-newfile-save.png`、`t2-first-use.png`、`t3-tablist.png`。

## 遗留 / 注意

1. `scripts/acceptance.mjs` 的导出用例仍用 `getByRole('button', {name:'HTML'})`，本轮导出项按 T3 改为 `role=menuitem`，dev 跑为 10/11；属测试选择器漂移，A 边界不含该脚本，需 tester 更新为 `menuitem`。
2. `documentKind: sample|blank|file|none` 未抽成独立类型/统一 helper，三处文案已按实际状态改；T4 文档不要写成「已实现 documentKind」。
3. P4 的跨页签展开态已保持（树常驻）；大纲自身的滚动位置未单独保存；`inert` 只做结构断言，未在真机验证读屏。
4. `newfile-acceptance` 用假 FS；真实 WebView2/盘符/网络盘未验。
