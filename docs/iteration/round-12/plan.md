# 第 12 轮 · 计划（rev2）

基线 `6bd6831`（v0.24.0）。5 个任务：A 组（builder，树操作/可访问性）T1→T2→T3 串行；B 组（builder2，发布）T5→T4（T5 出体积结论后 T4 定稿；ADR-0013 可先写）。**执行**：A 三任务 → 根代理 `npm run build` → T5 量体积与版本门 → T4 文档定稿（数字回填）。
**构建纪律**：任何实施者不跑 `npm run build`。A 用 `npx tsc --noEmit`、`npm test`、`scripts/tree-acceptance.mjs`（dev 5173 + CDP 9222）；B 用 `.tmp/build-b` 与 `scripts/measure-first-screen.mjs`。`package.json` 只归 T5；`package-lock` 由根代理同步。

## T1 文件树操作：新建文件夹、删文件进 trash、树头布局（B2/B4/U1/U2/H2/H6）｜A 组（builder，先做）

- **目标**：树头 `[＋ 新建 ▾] [⟳] [⋯]`；可新建文件夹（重名不静默成功）；可把**文件**移到 `<工作区>/.sidelight/trash/`（可手动恢复）；行级 `⋯`/右键/Delete 可触发；确认框默认焦点「取消」；`.sidelight` 不可用时按钮禁用并给原因。
- **为什么现在**：U1 实测全应用「删除/刷新/新建文件夹」命中 0，树头唯一按钮三档都折行；B4 实测 `create:true` 对已存在文件返回同一句柄并**静默截断**；B2 实测 FSA 无目录 copy/move，`removeEntry(recursive)` 会带走树里看不见的图片附件。
- **文件**：`src/lib/trash.ts`（新）、`src/lib/workspace.ts`、`src/components/FileTree.tsx`、`src/App.tsx`、`src/styles.css`、`scripts/tree-acceptance.mjs`（新）
- **步骤**
  1. `trash.ts`：`trashName(name)` = `YYYYMMDD-HHmmss-<4–6 位随机 base36>-<清洗名>`；清洗 `<>:"/\|?*` 与控制字符为 `-`，Windows 保留名（CON/PRN/AUX/NUL/COM1–9/LPT1–9）前加 `_`，去掉结尾点与空格，整名 ≤120 字符；**不靠探测保证不冲突**（随机位消除并发）。`ensureTrashDir(root)` → `{ dir, error? }`：`getDirectoryHandle('.sidelight')` 抛 `TypeMismatchError`/`NotAllowedError` 时返回 `error`（照 `cache.ts:91-101` 不抛），供 UI 禁用删除/新建。
  2. `deleteFileToTrash(rootHandle, node)`：`node` 是 `WorkspaceFileNode`（含完整 `path`），用 path 逐级 `getDirectoryHandle` 找**父目录**，trash 固定在**工作区根** `.sidelight/trash`（不按子目录建）；优先 `fileHandle.move(trashDir, finalName)`（原子）；无 `move` 或抛错 → 回退：`getFile()` → 写 trash → **SHA-256 内容比对**（`crypto.subtle.digest`，或逐块比较）→ `parent.removeEntry(name)`；**比对不符或写入失败** → 删掉半成品、保留原件、返回错误；`removeEntry` 失败 → 保留 trash 副本并提示手动清理。返回 `{ ok, trashName, mode, error? }`。
  3. 新建文件夹：先 `getDirectoryHandle(name, { create: false })` 探测——存在 → toast「已存在同名文件夹」并中止；`NotFoundError` → `getDirectoryHandle(name, { create: true })`。不静默成功。
  4. 树头布局 `[＋ 新建 ▾] [⟳] [⋯]`：`＋` 主按钮 = 新建文件，`▾` = 新建文件 / 新建文件夹；`⟳` 调 T2 刷新；`⋯` = 打开其他文件夹… / 刷新。`.sidelight` 不可用时「＋」与删除项 `disabled` + `title` 写明原因。示例态（`rootHandle === null`）动作区整宽「打开文件夹…」，保留内存分支的新建文件入口。
  5. 行级：hover/`focus-within` 显示 `⋯`；`onContextMenu` 开同一菜单（先 `preventDefault`）；Delete 键触发确认；菜单「删除（移到回收站）」「展开全部/收起全部」；**目录行无删除项**。
  6. 删除确认（复用 `.dialog` + `useDialogFocus`）：标题「删除「<名字>」？」；正文写明「移到这个文件夹的 `.sidelight\trash\`，不会当场永久删除；要恢复用文件管理器把 trash 里的文件移回原位」；按钮 `[取消] [移到回收站]`，默认焦点「取消」，「移到回收站」用 `--warn` 描边；确认后调 `deleteFileToTrash`。
  7. `scripts/tree-acceptance.mjs`：OPFS + `showDirectoryPicker` 替身驱动真实 UI。
- **验收**
  1. 删文件后 trash 里出现该文件、原路径 `getFileHandle` 抛 `NotFoundError`、**SHA-256 与源一致**；toast 含「已移到回收站」「撤销」。
  2. 同一秒删两个同名文件 → 两份都在（随机后缀不同，**不覆盖**）；名字含 `:` 的文件成功删除（非法字符被清洗）；子目录深处的同名文件删的是**它自己**，父目录同名文件不动。
  3. 回退路径：删掉 `move` 原型方法 → copy→SHA-256 校验→remove 成功；模拟写入后内容不同（同 size）→ 原文件保留、trash 无残留、提示可重试。
  4. 新建文件夹：已存在 → 提示「已存在同名文件夹」且不新增；不存在 → 创建成功并排序。
  5. `.sidelight` 是文件的环境 → 删除与「＋」禁用、`title` 给原因；示例态整宽「打开文件夹…」且无删除入口。
- **门禁**：`npx tsc --noEmit; npm test; node scripts/tree-acceptance.mjs`
- **风险与回退**：`move()` 只在 Edge 157 验过、宿主同版未验，回退必须同样可靠；SHA-256 比对要覆盖大文件（用 `arrayBuffer` 一次性读，6 MB 上限内可接受）。回退：`git checkout -- src/ scripts/tree-acceptance.mjs`。
- **难度** M–L ｜ **量级** 240–320 行

## T2 删除竞态防护、刷新与句柄重绑（B1/B3/O2/H1/H3）｜A 组（builder，T1 后）

- **目标**：删除后不再有任何写回（包括已在飞的自动保存与手动保存）；刷新安全且能重绑句柄；外部删除/改名后旧句柄不能再写。
- **为什么现在**：B1 实测对已删文件的旧句柄 `createWritable()` 照样成功、文件回到目录，而自动保存 2 s 防抖正走这个句柄（`App.tsx:1804-1810`、`:2257`、`:2288`）；B3 实测刷新时任一子项消失会让整次 `readDirectory` 抛错、且刷新不重绑 `activeFile`；H1/H3 指出只清计时器管不了已经在飞的 `performCommit`，外部删除后只提示不清句柄仍会复活。
- **文件**：`src/App.tsx`、`src/lib/workspace.ts`、`src/lib/cache.ts`、`src/components/FileTree.tsx`、`scripts/tree-acceptance.mjs`（扩用例）
- **步骤**
  1. **删除前（顺序写死）**：`deletingRef.current = true; autoSaveGenerationRef.current += 1` → `cancelAutoSave()` 且 `setAutoSaveScheduled(false)` → `clearTimeout(draftTimer)` → 关闭/清空 `pendingConfirm` 与 `pendingSwitch` → `await` 在飞的保存（`savingRef.current`、宿主 `pendingHostSave`）→ 才执行 `deleteFileToTrash`。
  2. **写前校验**：`runAutoSave`/`performCommit` 在 `await writeNode` 前重算 target 并检查 `!deletingRef.current && gen === autoSaveGenerationRef.current && target.handle === activeFile?.handle`，不满足直接返回 `false`，**不写**；手动保存同一套检查。
  3. **写后校验**：`writeNode` 成功后若 `deletingRef.current` 为真，再 `parent.removeEntry(name)` 一次（只删文件、不递归），确保「写回与删除交错」不留复活文件。
  4. **删除后状态**：`setDirty(false)`；删的是 `activeFile` → 清 `saveTargetRef`、`setActiveFile(null)`、标「已从磁盘删除（保存只能另存为）」；切同级下一篇，没有则空「未命名」并清标题；焦点到被删项下一行、列表空则到 `＋ 新建`；`removeCache` 清该键 draft/annotations；toast「撤销」= `move` 回原名（无 move 时 copy 回 + SHA 校验 + 删 trash 副本），**不自动重开**。
  5. **刷新**：`refreshWorkspace()` 开始置 `refreshingRef`（同时 `deletingRef` 语义禁止写）并 `cancelAutoSave()`；导出 `readDirectory`，每项 `try/catch`（消失/无权限/坏链接的节点保留旧内容并标「读取失败」）；重读 → `collator` 排序 → 按 path 重绑 `activeFile.handle`；path 找不到 → `setActiveFile(null)`、`saveTargetRef=null`、标「只能另存为」，**不保留可写旧句柄**；改名场景提示「已改名/移走，请重新打开」；刷新结束清 `refreshingRef`。
  6. 刷新反馈：有差异才 toast「已刷新：新增 N 个，消失 M 个」；无差异静默；失败 toast「读不到文件夹了。请点「打开其他文件夹」重新授权。」且树保持不变；`⟳` 期间 `aria-busy`、不闪动画。
  7. 新建文件/新建文件夹/删除后都走 `refreshWorkspace()`，删除 `App.tsx:1688-1692` 的手工 append。
- **验收（扩脚本）**
  1. **不复活（基础）**：删除当前文档 → 立刻输入 → 等 3 s → 原路径 `NotFoundError`、autosave 写入次数 = 0、trash 一份。
  2. **删除时正在写**：注入慢速 writable（500 ms）让 autosave 进入 `performCommit`，再触发删除 → 删除完成后等 3 s，原路径仍 `NotFoundError`（写后校验再删生效）、trash 一份、内容为删除前最后一次成功写入的内容。
  3. **删除时手动保存在飞**：`saving` 为真时点删除 → 删除等待保存结束才执行，执行后原路径不存在。
  4. 删除后切换：5 篇删第 2 篇 → 编辑器打开第 3 篇、焦点在第 3 行；删最后一篇 → 空「未命名」、标题清空。
  5. 撤销：文件回原位、内容一致、trash 无残留。
  6. **外部删除**：OPFS 侧删掉当前文件 → 点 `⟳` → 树更新、提示「已不在磁盘上」、`activeFile` 句柄已清；此时 `Ctrl+S` 不产生原路径文件（只能另存为）。
  7. **外部改名**：改名后刷新 → 提示「已改名/移走」；`Ctrl+S` 不写旧路径、不静默写新名。
  8. 刷新期间：刷新中点自动保存不写旧目标（写入次数 0）；刷新后按新句柄恢复自动保存。
- **门禁**：`npx tsc --noEmit; npm test; node scripts/tree-acceptance.mjs`
- **风险与回退**：`deletingRef`/`refreshingRef` 与既有 `savingRef`、`pendingConfirm` 的互斥要一次理清，漏一处仍会复活；`await` 在飞保存可能卡住删除（加 2 s 超时后仍执行删除，并在 toast 说明）。回退：`git checkout -- src/`。
- **难度** L ｜ **量级** 180–240 行

## T3 可访问性：树语义与键盘、单一 live region、侧栏标签、大纲当前项（B5/U4/U5/H4/H5）｜A 组（builder，T2 后）

- **目标**：文件树是真正的 `tree`（roving tabindex、方向键、树内 1 个 tab 站）；**只保留一个 polite live region**；侧栏「文件/大纲」为 `tab`；大纲当前项 `aria-current`；FindBar 图标补 `aria-label`。验收拆核心与可延后两组。
- **为什么现在**：B5/U4 实测树 AX 角色是 `complementary`、行无 `role`/`aria-selected`、5 个文件 = 6 个 tab 站、方向键无效；侧栏两个 button 无 `role=tab`；大纲只有 `.is-active`；闲置时 `[aria-live]` 节点数 0；H5 指出新增常驻播报区会与现有 toast 重复播报。
- **文件**：`src/components/FileTree.tsx`、`src/components/Outline.tsx`、`src/components/FindBar.tsx`、`src/App.tsx`、`src/styles.css`、`scripts/tree-acceptance.mjs`（扩用例）
- **步骤**
  1. 树语义：`.file-tree-list` → `role="tree"` + `aria-label="文件树"`；行 → `role="treeitem"` + `aria-level` + 目录 `aria-expanded` + 文件 `aria-selected`（活动项 `true`）；去掉 `aria-current`；目录子层容器 `role="group"`。
  2. roving tabindex：仅活动项（无活动项时第一项）`tabindex=0`，其余 `-1`；键位 ↑↓/→/←/Home/End/Enter/Delete/Shift+F10；`Tab` **不拦截**（焦点自然离开树）；`Delete` 与 `Shift+F10` 在树内 `preventDefault() + stopPropagation()`，避免触发编辑器/全局快捷键。
  3. 单一播报区（H5）：App 根常驻 `<div className="sr-only" role="status" aria-live="polite" aria-atomic="true">{notice?.text ?? ''}</div>`；视觉 toast 加 `aria-hidden="true"`（不再作为 live region）；错误仍用既有 `role="alert"` 横幅，且**不把同一文本同时写进 polite 区**。`styles.css` 补 `.sr-only`。
  4. 侧栏 tab：`role="tablist"` + `role="tab"`（`aria-selected`、`aria-controls`、`id`）+ 面板 `role="tabpanel"` + `aria-labelledby`；←→ 切换。
  5. 大纲：活动项 `aria-current="true"`；`<nav>` 的 `aria-label` 改「文章大纲」（或换 `div`）。
  6. `FindBar` ↑↓✕ 补 `aria-label`（上一处/下一处/关闭查找）；焦点环与对比度**不动**。
  7. 加第二个 skip link「跳到文件树」（`href="#file-tree"`）与 `Ctrl+Alt+E`（App 层只处理一次）。
- **验收（核心必过 / 可延后）**
  - **核心（必过）**：① `role=tree` 且活动项 `aria-selected="true"`；树内 `[tabindex="0"]` = **1**；② ArrowDown/Up、Home/End、→ 展开并进第一子项、← 收起/回父项、Enter 打开、Delete 弹确认；③ 树内 Delete 不删除正文文字（事件被拦）；④ 树内按 Tab 焦点离开树（不困住）；⑤ 页面静止时 `[aria-live]` 常驻节点 = **1**，一次 notice 只更新该节点一处（脚本断言另一个无文本变化）；⑥ FindBar 三个按钮 `aria-label` 非空。
  - **可延后（首屏超线时才砍，砍了要记录）**：⑦ 侧栏 `role=tablist/tabpanel` 与 `aria-controls`；⑧ 大纲 `aria-current`。延后时 T5 在 `impl-b.md` 与 CHANGELOG 写明「延后项」。
- **门禁**：`npx tsc --noEmit; npm test; node scripts/tree-acceptance.mjs`
- **风险与回退**：roving tabindex 与菜单/对话框两套焦点管理要统一用 `activeIndex`；`role=tree` 要求 `treeitem` 直接子级，目录需 `role=group` 包裹；live region 若保留两个就回到重复播报。回退：`git checkout -- src/`。
- **难度** M ｜ **量级** 150–210 行

## T4 0.25.0 文档与 ADR-0013（S3/S5/任务 7/H4）｜B 组（builder2，T5 结论后定稿）

- **目标**：ADR-0013 记录删除语义与边界；README/AGENTS/CHANGELOG 写实际能力与限制；**版本段等 T5 的 `measure` 返回码**：过线写 0.25.0，未过写「0.25.0 未发布」，不许先写达标。
- **为什么现在**：S3 指出「可恢复」若不写「无应用内恢复」会误导；S5 指出不能写「无障碍达标」；H4 指出 0.25 文案不能先于体积门存在。
- **文件**：`README.md`、`AGENTS.md`、`docs/CHANGELOG.md`、`docs/adr/0013-file-tree-delete-and-trash.md`（新）、`docs/adr/0004-webview2-host-before-admin.md`（载荷行）
- **步骤**
  1. `docs/adr/0013-file-tree-delete-and-trash.md`：背景（`removeEntry` 永久删、无目录 copy/move、`create:true` 不报重名、`create` 同名截断）；决定（只删文件、trash 在 `.sidelight/trash/<时间戳>-<随机>-<清洗名>`、`move()` 优先、回退 SHA-256 校验后删、删除与写入的 generation 防护、刷新重绑句柄）；明确不做（目录删除、应用内恢复、自动清理、`removeEntry(recursive)`、目录监听）；隐私（只本机、不自动清理、卸载不删）；UNVERIFIED（真实宿主删除、只读目录、网络盘、Windows 保留名）。
  2. CHANGELOG 按 **T5 结果**分支写：过线 → `## 0.25.0 — 2026-11-16`（能力、边界、隐私、可访问性只写属性、测试数、体积实测）；未过 → 只写「0.25.0 未发布：首屏 <实测> B 超线，延后项见 ADR/报告」，不写「已达标」。
  3. README「能/不能」按 S3 文案改；「数据与隐私」加「删除只把文件移到本机 `.sidelight/trash/…`，不上传、不自动清理、没有应用内恢复，卸载不删 `.sidelight`」；「依赖与体积」补首屏软线 285,000；修 `Sidelight-0.23.0` 与「ADR 0001–0011」→ `0001–0013`。
  4. `AGENTS.md §6`：版本按实际、树操作与可访问性清单（只写属性）、未验项（真实宿主删除、`.sidelight` 不可写、只读目录、网络盘、屏幕阅读器实录）。
  5. `docs/adr/0004` 载荷行改「1,020,452 + dist（见 CHANGELOG 0.25.0）」。
- **验收**
  1. `Test-Path docs/adr/0013-file-tree-delete-and-trash.md` = True，含「只删文件」「move」「SHA-256」「不自动清理」「UNVERIFIED」。
  2. 版本段与 T5 一致：过线时 CHANGELOG 含 `## 0.25.0` 且 `package.json` = 0.25.0；未过时 CHANGELOG 含「0.25.0 未发布」且无 `## 0.25.0` 正式条目。
  3. `Select-String README.md -SimpleMatch 'trash','不自动清理','没有应用内恢复','285,000','0001–0013'` 各 ≥1；不含「一键恢复」「安全删除」「无障碍达标」。
- **门禁**：上述 `Select-String`/`Test-Path` + `npm test`
- **风险与回退**：隐私句是对外承诺，写成「已备份/可恢复」会被 tester 判造假；「无障碍」只能写属性。回退：`git checkout -- README.md AGENTS.md docs/CHANGELOG.md docs/adr/0004-*.md` 并删 ADR-0013。
- **难度** M ｜ **量级** 140–200 行

## T5 首屏体积门与发版决定（S1/S2/S4/H4）｜B 组（builder2，根代理 build 后）

- **目标**：量 0.25.0 首屏 gzip；只有 ≤285,000（内部目标 ≤284,000）且安装包预算不超才升版本；超线优先删实现、**不许抬线**；延后只砍 T3 的「可延后」两项；`package-lock` 同步。
- **为什么现在**：S1 实测 282,809、余量 2,191 B，本轮估算 +1.2–2.1 KB，是本轮最紧的门；S4 要求 `package-lock` 同步。
- **文件**：`scripts/measure-first-screen.mjs`（只读调用）、`package.json`、`package-lock.json`（根代理同步）、`README.md`/`docs/CHANGELOG.md` 的数字行
- **步骤**
  1. 跑 `node scripts/measure-first-screen.mjs --dir .tmp/build-b --max 285000`，记录 JS/CSS/合计与每个 URL。
  2. 若 284,001–285,000：先压缩实现（确认框复用 `.dialog`、trash 逻辑集中、不新增组件）；若 >285,000：按 T3 的可延后顺序砍——先侧栏 `role=tablist/tabpanel`+`aria-controls`，再大纲 `aria-current`；**核心项必须过**；延后项写进 `impl-a.md`、`impl-b.md` 与 CHANGELOG；**不许改脚本默认 285,000**。
  3. 两道门（首屏 ≤285,000；安装包 ≤850,000、预算 ≤815,000）都过才升 `package.json` = `0.25.0`；否则保持 `0.24.0` 并把结论交给 T4 写「未发布」。
  4. 根代理出包后回填安装包/zip 字节与 SHA256 到 CHANGELOG；README 引 CHANGELOG，不重复数字；`package-lock` 根版本与 `package.json` 一致。
- **验收**
  1. `measure --max 285000` exit 0 且合计 ≤285,000（期望 283.6–285.0 KB）；若未过，改为断言「`package.json` 仍 0.24.0 + 延后项已记录 + 未抬线」。
  2. `node -e "console.log(require('./package.json').version)"` 与实际一致（0.25.0 或 0.24.0）；`package-lock.json` 根版本同步。
  3. `Select-String scripts/measure-first-screen.mjs -SimpleMatch '285000'` 仍 ≥1（未抬线）；CHANGELOG 的 `[TBD]` 仅剩字节与 SHA。
- **门禁**：`node scripts/measure-first-screen.mjs --dir .tmp/build-b --max 285000; npm test` + `npm install --package-lock-only`（根代理）
- **风险与回退**：`.tmp/build-b` 与最终 `dist` 可能有哈希差异，以根代理最终 build 为准；砍延后项必须留记录，否则 tester 按 brief 判缺项。回退：`git checkout -- package.json package-lock.json README.md docs/CHANGELOG.md`。
- **难度** S–M ｜ **量级** 60–120 行

## 文件归属与执行顺序（零重叠）

| 任务 | 组与执行点 | 独占文件 |
| :--- | :--- | :--- |
| T1 | A（builder，先做） | `src/lib/trash.ts`、`src/lib/workspace.ts`、`src/components/FileTree.tsx`、`src/App.tsx`、`src/styles.css`、`scripts/tree-acceptance.mjs` |
| T2 | A（builder，T1 后） | `src/App.tsx`、`src/lib/workspace.ts`、`src/lib/cache.ts`、`src/components/FileTree.tsx`、`scripts/tree-acceptance.mjs`（扩） |
| T3 | A（builder，T2 后） | `src/components/FileTree.tsx`、`src/components/Outline.tsx`、`src/components/FindBar.tsx`、`src/App.tsx`、`src/styles.css`、`scripts/tree-acceptance.mjs`（扩） |
| T5 | B（builder2，根代理 build 后） | `package.json`、`package-lock.json`（根代理同步）、`README.md`/`docs/CHANGELOG.md` 数字行、`scripts/measure-first-screen.mjs`（只读） |
| T4 | B（builder2，T5 后定稿） | `README.md`、`AGENTS.md`、`docs/CHANGELOG.md`、`docs/adr/0013-file-tree-delete-and-trash.md`、`docs/adr/0004-webview2-host-before-admin.md` |

- 零重叠：A 只碰 `src/` 与 `scripts/tree-acceptance.mjs`；B 只碰文档、`package.json`、只读调用 measure。`package.json`/`package-lock` 只归 T5；`npm test` 文件数不变（trash 纯函数测试写进现有 `cache.test.ts`）。
- 顺序：T1→T2→T3 → 根代理 `npm run build` → T5（体积门/发版）→ T4（文档定稿与回填）；ADR-0013 可在 T5 前先写。最终出包与 SHA 由根代理做。
- 报告：A 组 `docs/iteration/round-12/impl-a.md`，B 组 `impl-b.md`，根代理合并 `impl.md`；截图 `shots/round-12/t1-*.png`、`t2-*.png`、`t3-*.png`。

## 本轮不做（写进下轮建议）

**文件夹删除**：FSA 无目录 `move`/`copy`，`removeEntry(recursive)` 是永久删且会带走树里看不见的图片附件；要做得先递归复制进 trash 并保证任一项失败即中止，成本与风险都不属于本轮，写进 README 与 ADR-0013。**重命名/移动**：`FileSystemFileHandle.move()` 在本运行时存在，但旧结论需要重测后再决定是否提供；应用内恢复、trash 自动清理、`FileSystemObserver` 自动监听、行内重命名同样不做。

## 本轮 Demo（≤3 条用户可见变化）

1. 文件树能新建文件夹、删文件到 `.sidelight\trash\`（可手动找回）、一键刷新；删掉当前文档后即使自动保存已在飞，也不会把文件写回来。
2. 删除有确认框（默认焦点「取消」，写明去向与恢复方式），删完有「撤销」；外部改动点刷新会给新增/消失数量。
3. 文件树支持方向键、只有一个 tab 站，屏幕阅读器能读出「文件树/当前项」；侧栏与大纲有正确的选中语义。

## 风险最高的任务

**T2**。删除要与三类在飞动作抢同一个句柄：2 s 防抖计时、已进入 `performCommit` 的自动保存、手动/宿主持有的 `saving`。只清计时器等于没防——B1 已实测旧句柄能把文件写回来。缓解是 `deletingRef + generation`（写前校验、写后再删一次）与「删除后 3 s 内写入 0」「删除时正在写」「删除时手动保存在飞」三条硬断言。次高是 T1：回退路径若只看 size 就删原件，会把「同尺寸不同内容」变成永久丢数据；改用 SHA-256 逐字节校验并把半成品清干净。

## 下一轮建议主题

**树操作收尾与真机**：真实 WebView2 与网络盘上验 trash 的 `move`/回退与只读目录；决定是否提供重命名与目录删除（各写一份 ADR）；README 隐私承诺交产品负责人确认；`npm test` 改 glob 纳入 `trash.test.ts` 与 `katexLazy.test.ts`；CI 加首屏体积闸（`measure --max 285000`）。
