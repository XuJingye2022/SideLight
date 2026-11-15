# 第 14 轮 · 计划（rev2）

基线 `d941874`（v0.27.0 已发布）。5 个任务：A 组（builder，P0/首次使用/延后项）T1→T2→T3 串行；B 组（builder2，发布）T4（release.yml/CI 可先写）与 T5（体积门与版本，根代理 build 后）。
**预算**：首屏 284,973 / 285,000（余 **27 B**）。**先实测再动手**：单独 build 量 **O2**（删 `demoWorkspace` 死代码）真实 diff；若 <100 B，把 **O1** 目标提高到 **≥2 KB** 并准备第二杠杆（`ShortcutsDialog` 静态快捷键表随 chunk、`SettingsDialog` 常量拆出）。随后落 P3/P4。每步 `node scripts/measure-first-screen.mjs`；超线只记录 **P3→P4 延后**，**不许抬 285,000**；≤285,000 才升 0.28.0。
**构建纪律**：任何实施者不跑 `npm run build`。A 用 `npx tsc --noEmit`、`npm test`、`node scripts/newfile-acceptance.mjs`；B 用根代理 `npm run build` 与 `.tmp/build-b` + measure。`package.json`/`package-lock` 只归 T5；`package-lock` 由根代理同步。

## T1 P0：新建文件后保存写错目标 + refresh 两种语义（B1/U1/H1/H2）｜A 组（builder，先做）

- **目标**：真实文件夹里「打开 a.md → ＋新建 → 输入 → 保存/自动保存」只写新文件；新文件首次手动保存前保持 0 字节；外部删除/改名后 `Ctrl+S` 不再写旧路径；新建/另存为/打开/重命名/删除/刷新六处的 `activeFile`、`saveTargetRef`、`allowAutoSave` 有唯一定义。
- **为什么现在**：B1/U1 实测 0.27.0 已发布行为：`Ctrl+S` 把 `a.md` 覆盖成新输入、`未命名.md` 仍 0 字节、标题变回 `a.md`；不按保存停 4 秒也会被自动保存写进 `a.md`。根因是 `startNewDocument` 先 `loadIntoEditor` 再 `refreshTree`，refresh 用**旧闭包** `activeFile` 回绑并写 `saveTargetRef`；新文件 `path` 还缺工作区前缀。H1 补充：若 refresh 一律「找不到就保留」，外部删除/改名后反而保留可写旧句柄。
- **文件**：`src/App.tsx`、`src/lib/workspace.ts`、`scripts/newfile-acceptance.mjs`（新）
- **步骤**
  1. **refresh 两种语义（H1）**：`refreshWorkspace({ mode: 'adopt' | 'check', activePath })`。`adopt`（新建/另存为/重命名）：按传入的 `activePath` 与新句柄精确重绑，找不到时**保留传入的新值**；`check`（打开/手动刷新）：按 path 找不到 → `setActiveFile(null)`、`saveTargetRef.current = null`、标「已不在磁盘上，只能另存为」，**不得写旧句柄**。新文件 `path` = `${space.name}/${name}`。
  2. **六处状态表（H2，唯一事实）**：
     | 路径 | activeFile | saveTargetRef | allowAutoSave |
     | :--- | :--- | :--- | :--- |
     | 新建 | 新文件（`space/name`、新句柄） | 新句柄 | **false**（无基线），首次 `finishSaved` 后 true |
     | 另存为 | 新文件（返回句柄） | 新句柄 | true（保存后已有基线） |
     | 打开 | 打开的文件 | **null**（走 `activeFile.handle`） | true（已有原文基线） |
     | 重命名 | 新 path + 新句柄（adopt） | 新句柄 | 不变 |
     | 删除 | 清空，切同级下一篇或空态 | null | false |
     | 刷新 adopt | 传入 path 重绑 | 同步为新句柄 | 保持 |
     | 刷新 check | 找到→重绑；找不到→null | 同步（找不到→null） | 找不到→false |
  3. **无基线定义**：`originalText === null && !hasSavedBaseline` → `allowAutoSave = false`；首次手动保存的 `finishSaved` 置 `hasSavedBaseline = true` 后恢复自动保存；切文档/新建时复位为 `false`。新建后 **3 秒内（含停笔 2 s 窗口）绝不写任何文件**。
  4. 保存顺序统一：先确定 `activeFile`/`saveTargetRef`（含正确 path），再 `refreshWorkspace({ mode, activePath })`；`performCommit` 每次写前重读当前 `activeFile`/`saveTargetRef`，不再用入队时捕获的旧句柄。
  5. 删除沿用 round-12 的清理，并断言删除后刷新不会把旧 target 带回来（`mode:'check'`）。
  6. `scripts/newfile-acceptance.mjs`：复用 `tree-acceptance.mjs` 的假 FS 注入，驱动真实 UI。
- **验收（脚本全 PASS）**
  1. 打开 `a.md` → ＋新建 → 输入 `NEW-DOC-MARKER` → `Ctrl+S`：写 `未命名.md`（含标记）、`a.md` SHA 不变、标题/树选中/`__slState.name` 都是 `未命名.md`。
  2. 同一流程不按保存等 4 s：`a.md` SHA 不变、`未命名.md` 仍 0 字节、无「已保存 a.md」toast。
  3. 首次手动保存后再输入等 2.5 s：自动保存写 `未命名.md`，`a.md` 不变（`hasSavedBaseline` 恢复生效）。
  4. 另存为：从 `a.md` 另存为 `c.md` 后输入并保存 → 写 `c.md`、`a.md` 不变、树选中 `c.md`。
  5. **重命名回归**：打开 `a.md` → 改名 `b.md` → 输入 → `Ctrl+S`：写 `b.md`（1 次）、`a.md` 不存在、picker 0 次。
  6. **外部删除（check）**：打开 `a.md` → 假 FS 从磁盘删掉它 → 点刷新 → `activeFile` 为空、`saveTargetRef` 为空；`Ctrl+S` 走另存为、**不写旧路径**。
  7. **外部改名（check）**：`a.md` 在磁盘改为 `b.md` → 刷新 → 提示「已不在磁盘上/已改名」；`Ctrl+S` 不写旧名、不静默写新名。
  8. 删除后刷新再 `Ctrl+S`：不写已删路径。
- **门禁**：`npx tsc --noEmit; npm test; node scripts/newfile-acceptance.mjs`
- **风险与回退**：六处状态散在 `App.tsx`，建议集中成 `saveTargetState` 辅助函数（`rename.ts` 或 `src/lib/saveTarget.ts`）；`adopt`/`check` 混用会一边修好一边复活。回退：`git checkout -- src/ scripts/newfile-acceptance.mjs`。
- **难度** L ｜ **量级** 160–240 行

## T2 首次使用：焦点、占位、身份一致、模拟批注去重、demo 死代码清理（U2/U3/B2/B3/H3/H6）｜A 组（builder，T1 后）

- **目标**：首屏光标在正文可立即打字（对话框打开时不抢焦点）；空文档有「从这一句开始写」占位；示例/新建/空态三处文案一致；「分析本段（模拟）」不再报「1 条没定位」；`demoWorkspace` 全链路删除（O2）。
- **为什么现在**：U2 实测首屏焦点在 BODY、键盘 22 次 Tab，空文档全白；U3 实测顶栏「示例 · 未命名.md」、树「现在打开的是示例」、README「示例工作区」三处不一致且 `demoWorkspace` 从未调用；B2 首屏主按钮一次就报「1 条没能在正文里定位」；B3 新建后树仍写「现在打开的是示例」。
- **文件**：`src/App.tsx`、`src/components/FileTree.tsx`、`src/lib/ai.ts`、`src/lib/workspace.ts`、`src/styles.css`、`scripts/newfile-acceptance.mjs`（扩用例）
- **步骤**
  1. 焦点：首挂载与每次新建后 `rAF` 聚焦 `.ProseMirror`，但**先检查** `settingsOpen/shortcutsOpen/findOpen/pendingConfirm/pendingSwitch` 任一为真则跳过（H3）；「跳到正文」`onClick` 焦点落 `.ProseMirror` 而非 `main`。
  2. 占位：`stats.chars === 0 && viewMode === 'edit'` 时叠 `pointer-events:none` 的「从这一句开始写」；预览/源码不显示。
  3. **身份统一（H6）**：定义 `documentKind: 'sample' | 'blank' | 'file' | 'none'`，顶栏、树空态、正文三处都从它取文案；示例名「示例 · 侧灯.md」、首句改发布口径（不写「原型」）；无工作区空态写「还没有打开文件夹」+ 当前文档名，不再写死「现在打开的是示例」。
  4. **O2 全链路删除**：`grep -rn 'demoWorkspace\|DEMO_FILES\|demoTexts\|\.demo\|file-badge\|file-tree-demo-note' src/` 列出全部引用；删 `workspace.ts` 的 `DEMO_FILES`/`demoWorkspace`/`demoTexts`、`Workspace.demo` 字段、`App.tsx:63` 的 import 与所有 `.demo` 分支、`FileTree` 的 demo 徽章/说明、`styles.css` 的 `.file-badge`/`.file-tree-demo-note`；README 删「示例工作区」。改完再跑一次 `grep` 断言 0 命中。
  5. `openFolder`（H6）：按 `documentKind` 决定——当前 `dirty` 则清空正文并置 `blank`（不自动打开，避免覆盖）；否则自动打开树里第一个 `.md` 并置 `file`；两种情况三处文案一致，不保留旧示例。
  6. 模拟批注去重（B2）：`mockItems` 单句/短段落只产生 1 条、不重复 quote；`unresolved > 0 && simulated` 文案改「这段太短，选中一段正文再试」。
  7. 扩 `newfile-acceptance`：首屏可立即输入；空文档占位；三处文案一致；模拟分析无「已丢弃」；设置/快捷键打开时焦点不被正文抢走。
- **验收**
  1. 首屏不点正文直接输入 → 字数增加、`dirty === true`；新建后同样可立即输入。
  2. 空文档显示「从这一句开始写」，输入后消失，切预览不显示。
  3. 顶栏、树空态、正文三处一致（`documentKind` 驱动）；`grep -rc '现在打开的是示例' src/` = 0；`grep -rn 'demoWorkspace\|DEMO_FILES\|demoTexts\|\.demo' src/` = 0；measure 输出较 284,973 下降（记录数值）。
  4. 首屏点「分析本段（模拟）」→ ≥1 条批注、**无**「没能在正文里定位」；单句输入只产生唯一 quote。
  5. 打开文件夹后三处文案一致；自动打开第一个 `.md` 或显示 `blank` 空态，不出现旧示例。
  6. **对话框不被抢焦点**：打开设置后 300 ms，`activeElement` 仍在设置对话框内；快捷键面板同理。
- **门禁**：`npx tsc --noEmit; npm test; node scripts/newfile-acceptance.mjs`
- **风险与回退**：焦点自动进入正文与对话框/查找面板竞争，必须按第 1 条排除；删 demo 涉及类型字段，漏改会编译错，用 `grep` 与 `tsc` 双验。回退：`git checkout -- src/`。
- **难度** M–L ｜ **量级** 180–260 行

## T3 延后项收尾 + 预算腾挪：tablist、展开态、空文件夹、长名、导出菜单（U4/U5/B4/B5/H3/H4）｜A 组（builder，T2 后）

- **目标**：侧栏成为 `tablist`；切页签后展开态与滚动保持；空文件夹有提示；长文件名省略、顶栏 `.doc-name` 不挤行；导出菜单补 `menuitem`；用 O1 懒加载腾出首屏字节（可见骨架，不是空白）。
- **为什么现在**：B4/U4 实测 `.sidebar-tabs` 无 `role`/`aria-selected`、右箭头不切换；切页签后 `expanded` 2→0、`scrollTop` 148→0；空目录无文本；树行 `181/586` 硬切；1024 下顶栏换行；B5 导出菜单四项 `role=null`；O1 估算省 1.5–2 KB。
- **文件**：`src/App.tsx`、`src/components/FileTree.tsx`、`src/styles.css`、`scripts/tree-acceptance.mjs`（扩用例）
- **步骤**
  1. **O1 腾预算（H3）**：`SettingsDialog`/`ShortcutsDialog` 改 `React.lazy()`，`Suspense` 用**可见骨架**（`.dialog` 空壳 +「正在打开设置…」+ `aria-busy="true"`），**不许 `fallback={null}`**；焦点留在触发按钮直到 chunk 就绪。
  2. **P3 tablist**：`.sidebar-tabs` → `role="tablist" aria-label="侧栏"`；按钮 `role="tab"` + `aria-selected` + `id="sidebar-tab-files|outline"` + `aria-controls="sidebar-files|sidebar-outline"`；面板固定 id + `role="tabpanel"` + `aria-labelledby`；roving tabindex + `ArrowLeft/Right`/`Home/End`。
  3. **P4 展开态与滚动**：两面板保持挂载、用 `hidden` 切换；隐藏面板加 **`inert`**（H3），确保树内 `keydown`/全局 `Delete` 不响应；切走前记 `scrollTop`，切回恢复；`tabbablePath = 可见 focusPath → activePath → rows[0]`。
  4. **P4 空文件夹**：`open && node.children.length === 0` 时渲染「这个文件夹里没有 Markdown 文件」（`role="none"`，不进 treeitem 序列）。
  5. **长名**：树行名字包 `<span class="tree-name">`（省略号三件套 + `min-width:0`）；`.doc-name` 加 `max-width:min(42vw,460px)` + 省略号。
  6. **B5**：导出菜单四项 `role="menuitem"`，打开时聚焦第一项。
  7. 每步跑 `node scripts/measure-first-screen.mjs`；超线按 P3→P4 记录延后，P0/P1/P2（上轮重命名/aria-current/缩进）不动，不抬线。
- **验收（T1/T2 修复必过；P3/P4 可延后）**
  1. **必过**：T1/T2 的 `newfile-acceptance` 全绿；`[role="tablist"]` 存在时 `aria-selected` 与方向键正确（P3 若被砍则记录「延后」）。
  2. **必过**：`hidden` 面板内按 `Delete`/方向键不触发树动作（`inert` 生效）；设置首点有反馈：1 s 内出现可见骨架或对话框（无空白）；对话框打开期间焦点不被正文抢走。
  3. **P3 可延后**：tablist 的 `aria-controls` 指向 `sidebar-files`/`sidebar-outline`，tablist 内 `[tabindex="0"]`=1。
  4. **P4 可延后**：展开 5 目录并滚到底 → 切「大纲」→ 切回：`aria-expanded` 与 `scrollTop` 不变；空目录有提示；长名 `scrollWidth<=clientWidth`；1024 下顶栏不换行。
  5. 导出菜单四项 `role="menuitem"`，打开后焦点第一项。
  6. `measure` ≤285,000；记录 O1/O2 前后差值。
- **门禁**：`npx tsc --noEmit; npm test; node scripts/tree-acceptance.mjs; node scripts/newfile-acceptance.mjs`
- **风险与回退**：`inert` 需现代浏览器（Edge 157 支持）；`hidden` 方案让 `Outline` 提前挂载（懒 chunk 仍在）；O1 的骨架要视觉可辨但字节少。回退：`git checkout -- src/`。
- **难度** M ｜ **量级** 160–230 行

## T4 发布自动化 + CI 转必过 + 0.28.0 文档（S1–S4/H5）｜B 组（builder2，可先写 release.yml/CI）

- **目标**：tag 触发的 `release.yml`（dry-run 不写 Release）；CI 两处 `continue-on-error` 删除；README 修 0.27 残留、macOS 15 说明、坏围栏；CHANGELOG 0.28.0 与 820,000 预算。
- **为什么现在**：S1 实测 v0.27.0 四个资产均人手上传；S2 两次宿主 job 已连续绿；S3 macOS 15 起右键「打开」失效；S4 README 的字节/SHA 是 0.26.0 残留、第 123 行孤立围栏。
- **文件**：`.github/workflows/release.yml`（新）、`.github/workflows/ci.yml`、`README.md`、`AGENTS.md`、`docs/CHANGELOG.md`、`packaging/README.md`
- **步骤**
  1. `release.yml`：`push: tags: ['v*']` + `workflow_dispatch`（`tag`、`publish` 默认 **false**）；`preflight` 校验 `v<version> === tag` 且 CHANGELOG 有 `## <version> `；`windows`/`macos` 只 `upload-artifact`（`contents: read`）；单一 `release` job `needs: [preflight, windows, macos]`、**`if: github.event_name == 'push' || inputs.publish`**、`contents: write`、`softprops/action-gh-release@v3` + `overwrite_files: true` + `fail_on_unmatched_files: true`；`concurrency.cancel-in-progress: false`。
  2. **SHA 时序与幂等（H5）**：release job 内先 `download-artifact`（`pattern: Sidelight-*`、`merge-multiple`），再生成 `SHA256SUMS-<版本>.txt`，**紧接 `sha256sum -c` 自检**，最后才 `action-gh-release` 上传；资产列表与 build job 的 artifact 名逐字一致。**同一 tag 重跑幂等**：`softprops` 对已存在 Release 走 update，`overwrite_files: true` 覆盖同名资产，条数不增；`fail_on_unmatched_files: true` 保证任一包缺失就失败。
  3. `ci.yml`：删 `windows-host`/`macos-host` 的 `continue-on-error: true`；`install-verify` 仍只在 `workflow_dispatch`。
  4. README：删具体字节/哈希（改链 `SHA256SUMS-<版本>.txt` 与 CHANGELOG）；包名去版本；修第 123 行孤立围栏；加 macOS 15+「系统设置 → 隐私与安全性 → 仍要打开」与 13–14 右键「打开」、`xattr` 命令、ad-hoc 未公证；Windows SmartScreen「更多信息 → 仍要运行」；体积段写首屏 ≤285,000、安装包内部 820,000、硬线 850,000；ADR 索引 0001–0014。
  5. CHANGELOG 0.28.0（按 T5 结果定版本段）：发布自动化、CI 转必过、T1/T2 修复、P3/P4 实际完成或延后、测试数、体积 `[TBD]`；未达标写「0.28.0 未发布」。
  6. `AGENTS.md §6` 与 `packaging/README.md` 同步；未验加「release.yml 首跑、macOS 15 真机、Intel/Universal 未实施」。
- **验收**
  1. `release.yml` 含 `if: github.event_name == 'push' || inputs.publish`、`contents: write`（仅 release job）、`sha256sum -c`、`softprops/action-gh-release@v3`、`overwrite_files`；`publish` 默认 `false`；注释写明「同一 tag 重跑幂等：update + overwrite_files，资产条数不增」。
  2. `Select-String .github/workflows/ci.yml -SimpleMatch 'continue-on-error'` = 0；`install-verify` 仍带 `workflow_dispatch`。
  3. README 不含 `817,347`、`FE2EF`、`9C18FC9C`、`Sidelight-0.27.0-win`；含「仍要打开」「SHA256SUMS-<版本>」「820,000」「285,000」「0001–0014」；围栏成对（`^```` 计数为偶数）。
  4. CHANGELOG 含 `## 0.28.0 — 2026-11-16` 或「0.28.0 未发布」记录；`AGENTS.md` 含 `0.28.0`。
- **门禁**：上述 `Select-String`/`Test-Path` + `npm test`
- **风险与回退**：首跑未验，用 `workflow_dispatch` + `publish=false` 做 dry-run（必须确认不创建 Release）；CI 转必过后环境红需当轮修，不默认加回；签名措辞不能写「已签名」。回退：`git checkout -- .github/workflows/ README.md AGENTS.md docs/CHANGELOG.md packaging/README.md` 并删 release.yml。
- **难度** M ｜ **量级** 220–300 行

## T5 首屏体积门与条件发版（S1 预算/H4）｜B 组（builder2，根代理 build 后）

- **目标**：量 O1/O2 真实收益与本轮首屏 gzip；≤285,000 才升 0.28.0；超线只砍 P3/P4 并写「延后」，**不抬线**；同步 lock 与回填字节。
- **为什么现在**：当前 284,973、余 27 B；O2 可能被 tree-shake（findings B3 说 `demoWorkspace` 从未调用），必须实测后再定 O1 目标。
- **文件**：`package.json`、`package-lock.json`（根代理同步）、`README.md`/`docs/CHANGELOG.md` 数字行、`scripts/measure-first-screen.mjs`（只读）
- **步骤**
  1. **先单独 build 测 O2**（T2 完成后、T3 之前由根代理跑一次）：记录删 demo 前后首屏 gzip 差值。
  2. 若 O2 <100 B：把 O1 目标提到 **≥2 KB**，并准备第二杠杆（`ShortcutsDialog` 静态快捷键表进 chunk、`SettingsDialog` 常量拆出）；T3 的 P3/P4 按裁剪顺序做。
  3. 最终 build 后跑 `node scripts/measure-first-screen.mjs --dir .tmp/build-b --max 285000`，记录 JS/CSS/合计与每个 URL。
  4. 超线：按 **P3→P4** 砍（只砍可延后项），写进 `impl-a.md`/`impl-b.md`/CHANGELOG「延后项」；**不许改脚本默认 285,000**。
  5. 通过：`package.json` = `0.28.0`，`package-lock` 两处同步；出包后回填安装包/zip 字节与 SHA（内部 820,000、硬线 850,000）。未通过：保持 0.27.0，结论交 T4。
- **验收**
  1. O2 差值已记录（若 <100 B 则 O1 目标 ≥2 KB 且第二杠杆已用/已准备）。
  2. `measure --max 285000` exit 0 且合计 ≤285,000；记录余量。
  3. `package.json` 与 `package-lock` 版本一致；未通过时仍 0.27.0、延后项已记录、`measure` 默认值未改。
  4. `Select-String packaging/installer.ps1 -SimpleMatch '850000'` ≥1。
- **门禁**：`node scripts/measure-first-screen.mjs --dir .tmp/build-b --max 285000; npm test`
- **风险与回退**：`.tmp/build-b` 与最终 `dist` 有哈希差异，以根代理最终 build 为准；O1 懒加载新增 chunk 必须确认不在首屏集合；砍 P3/P4 后 README 写「延后」不写「已做」。回退：`git checkout -- package.json package-lock.json README.md docs/CHANGELOG.md`。
- **难度** S–M ｜ **量级** 70–130 行

## 文件归属与执行顺序（零重叠）

| 任务 | 组与执行点 | 独占文件 |
| :--- | :--- | :--- |
| T1 | A（builder，先做） | `src/App.tsx`、`src/lib/workspace.ts`、`src/lib/saveTarget.ts`（若新建）、`scripts/newfile-acceptance.mjs` |
| T2 | A（builder，T1 后） | `src/App.tsx`、`src/components/FileTree.tsx`、`src/lib/ai.ts`、`src/lib/workspace.ts`、`src/styles.css`、`scripts/newfile-acceptance.mjs`（扩） |
| T3 | A（builder，T2 后） | `src/App.tsx`、`src/components/FileTree.tsx`、`src/styles.css`、`scripts/tree-acceptance.mjs` |
| T4 | B（builder2，可先写） | `.github/workflows/release.yml`（新）、`.github/workflows/ci.yml`、`README.md`、`AGENTS.md`、`docs/CHANGELOG.md`、`packaging/README.md` |
| T5 | B（builder2，根代理 build 后） | `package.json`、`package-lock.json`（根代理同步）、`README.md`/`docs/CHANGELOG.md` 数字行、`scripts/measure-first-screen.mjs`（只读） |

- 零重叠：A 只碰 `src/` 与两个验收脚本；B 只碰 `.github/workflows/`、文档、`package.json` 与只读 measure 调用。`package.json`/`package-lock` 只归 T5；`npm test` 文件数不变。
- 顺序：T1→T2（A）→ 根代理 build 测 O2 差值 → T3（A）→ 根代理 build → T5（体积门/版本）→ T4 定稿数字；release.yml/CI/README 骨架可先在 T4 内完成。
- 报告：A 组 `docs/iteration/round-14/impl-a.md`，B 组 `impl-b.md`，根代理合并 `impl.md`；截图 `shots/round-14/t1-*.png`、`t2-*.png`、`t3-*.png`。

## 本轮不做（写进下轮建议）

**macOS Intel/Universal**：只给方案（`--triple` 两次构建 + `lipo`），不改 `host-mac/build.sh`。**签名/公证**：无 Apple Developer 账号，ad-hoc 是上限。`.md` 关联扩展、跨目录移动、应用内撤销重命名、`FileSystemObserver` 自动监听不做。

## 本轮 Demo（≤3 条用户可见变化）

1. 文件夹里新建文件后，保存只写新文件、`a.md` 不再被覆盖；新文件首次保存前保持空白；外部删除/改名后保存不会再写旧路径。
2. 首屏打开即可打字，空文档有「从这一句开始写」；示例/新建/空态文案一致；「分析本段（模拟）」不再报丢批注。
3. 侧栏「文件/大纲」有正确读屏语义与方向键；切页签后展开态与滚动不丢；空文件夹有提示；长文件名与顶栏不再挤行；推送 tag 后 CI 自动出包并创建 Release。

## 风险最高的任务

**T1**。它把「保存写错文件」收成一套 refresh 语义（`adopt`/`check`）与六处状态表：`check` 若被写成 `adopt`，外部删除/改名后旧句柄会继续可写（复活/写错名）；`adopt` 若被写成 `check`，新建后刚设好的新句柄会被清空。再叠上「无基线不自动保存」的行为变化，任何一处漏改都会在 3 秒内悄悄写盘。缓解是脚本的「旧文件 SHA 不变 / 新文件 0 字节 / 重命名后写新名 / 外部删除后不写旧路径 / 外部改名后不写旧名 / 删除后不写已删路径」六组硬断言。次高是 T3：O2 可能被 tree-shake 到接近 0 B，若 O1 拿不到 ≥2 KB，P3/P4 只能延后，本轮「延后项收尾」目标落空。

## 下一轮建议主题

**发布流水线首跑与首次使用打磨**：`workflow_dispatch` + `publish=false` 真跑 release.yml 并确认不创建 Release；把 `install-verify` 接成 release 的可选 job；macOS 15 真机走一遍「仍要打开」；评估 Intel/Universal 与签名账号；补 `newfile-acceptance` 进 CI 或测试 glob。
