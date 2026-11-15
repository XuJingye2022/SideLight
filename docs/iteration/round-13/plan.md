# 第 13 轮 · 计划（rev2）

基线 `0842c3b`（v0.25.0，产品代码 `971e1ca`）。5 个任务：A 组（builder，重命名/树细节/可访问性）T1→T2→T3 串行；B 组（builder2，发布）T5→T4。**执行**：A 三任务 → 根代理 `npm run build` → T5 体积门与版本决定 → T4 文档定稿（ADR-0014 可先写）。
**预算口径**：首屏线 **285,000**，当前 284,134（余 **866 B**）；内部目标 ≤284,800。重命名 UI 必须进懒加载 `TreeActions` chunk。**优先级**：P0 重命名（T1）、P1 大纲 `aria-current`（T3，首屏 0 B）、P2 树缩进（T2）**必过**；P3 侧栏 tablist（T3）、P4 展开态保持+空文件夹（T2）**可延后**。超线只按 **P4→P3** 砍并写「延后」，P0/P1/P2 不动，**不抬 285,000**。安装包内部预算改 **820,000**（硬线 850,000 不动），文档同步改掉「815,000」。
**构建纪律**：任何实施者不跑 `npm run build`。A 用 `npx tsc --noEmit`、`npm test`、`scripts/rename-acceptance.mjs`；B 用 `.tmp/build-b` 与 `scripts/measure-first-screen.mjs`（只读）。`package.json` 只归 T5；`package-lock` 由根代理同步。

## T1 重命名：二次探测、行内输入、身份与缓存迁移（B1–B4/U1/H1–H3/H6/P0）｜A 组（builder，先做）

- **目标**：`⋯` 首项、右键首项、`F2` 三入口进同名行内输入框；提交前两道探测拒绝重名（大小写不敏感），非法名/保留名/非 `.md` 原地拒绝；`move()` 失败保留原名、不加 copy 回退；成功后一次 `adoptRenamedFile` 同步全部身份状态并按「写新成功才删旧」迁移草稿/批注。
- **为什么现在**：B1 实测 `move()` 对已存在目标**静默覆盖**（`opfsTargetExists {ok:true, yContent:"z"}`）；B2 实测改名后刷新清空 `activeFile`、`Ctrl+S` 弹 picker 且磁盘 0 写入；B3 实测改 `.txt` 后树里消失；B4 实测缓存键只按文件名、改名不迁移留孤儿；U1 实测三入口都不存在。
- **文件**：`src/lib/rename.ts`（新）、`src/components/FileTree.tsx`、`src/components/TreeActions.tsx`（懒加载）、`src/App.tsx`、`src/lib/cache.ts`、`src/lib/workspace.ts`、`src/styles.css`、`scripts/rename-acceptance.mjs`（新）
- **步骤**
  1. `rename.ts`（纯逻辑）：`validateRename(raw, oldName)` → `{ ok, name, error }`：trim；空名；`[<>:"/\\|?*]` 与控制字符（**`\` 单独给「文件名不能含反斜杠」**）；结尾点/空格；Windows 保留名（CON/PRN/AUX/NUL/COM1–9/LPT1–9）；`.` 开头；扩展名省略补 `.md`，只允许 `.md`/`.markdown`（其它：「保留 .md 结尾，否则文件会从树里消失」）。
  2. **第一道探测**：`await parent.getFileHandle(newName, { create: false })`（`isSameEntry` 包 try/catch：抛 `NotAllowedError`/`NotFoundError` 按「无法确认，已拒绝」处理）；命中后用 `isSameEntry(probe, fileHandle)` 区分真重名（拒绝，**目标不动**）与仅大小写改名（允许）。
  3. **提交流程（TOCTOU 防线）**：`await waitForCommit()` → `clearTimeout(draftTimerRef)` + `draftGeneration++` → 取消排队自动保存并 `autoSaveGeneration++` → **二次探测** `getFileHandle(newName,{create:false})`，命中且非自身 → 拒绝「刚才出现了同名文件，请重试」→ `fileHandle.move(newName)`。`move` catch 按错误码给文案：`InvalidModificationError`→「目标已存在」、`NotAllowedError`→「没有改名权限」、`TypeError`→「文件名不合法（可能含反斜杠）」、其它→「改名失败：<可读原因>」；**任何失败都不 copy、不删源**，输入框保留并就地报错。
  4. **大小写两段改名**：`a.md`→`A.md` 走「`a.md`→临时名 → 临时名→`A.md`」；第二段失败时**保留临时名**并提示「已改为临时名 `<tmp>`，请手动改回」，**不声称回滚成功**；若尝试回滚也失败，如实提示当前实际文件名。
  5. `adoptRenamedFile(oldNode, newName, newHandle)`：一次更新 `activeFile`（`name`/`path`）、`fileRef`、`docNameRef`、`docName`+`setDocName`、`document.title`、`__slState.name`、`saveTargetRef`、`localStorage` 的 `name`；随后 `refreshWorkspace({ skipPath: newPath })`——refresh **跳过刚改名节点**，不得把新 `activeFile` 清空；树选中/滚动在 T2 上提后再补（T1 只保证 `activePath` 正确）。
  6. **缓存迁移**：`cacheKey(oldName) === cacheKey(newName)`（如 `a.md`→`a.markdown`）→ 跳过；否则对 `draft`/`annotations` 各做「`readCache` 旧 → `writeCache` 新 → **成功后** `removeCache` 旧」；**`writeCache` 失败时保留旧键**并提示「旧草稿/批注仍在，未自动迁移（可在 `.sidelight` 手动处理）」，**绝不删旧键**；`writeDraftFallback` 与 onUpdate 草稿写入校验 `draftGeneration`，改名瞬间的 800 ms 计时器不得写旧键。
  7. 交互（U1）：行内 `<input>` 替换文件名文本，放 `TreeActions` 懒加载模块；自动聚焦并 `setSelectionRange(0, 主文件名长度)`；宽度撑满 181px；`Enter` 提交、`Esc`/`blur` 取消、`event.isComposing` 忽略 Enter、提交中禁用重复 Enter；失败还原旧名+就地报错；成功后焦点回该行。
  8. 入口与禁用：`⋯` 菜单首项「重命名」、右键同项、文件行 `F2`（`preventDefault`）；目录行、无目录句柄（单文件/示例）、`deleting`/`refreshing`/`saving` 期间不显示或禁用。
  9. 最近记录：改名不发宿主消息，`recent.json` 旧条目原样保留；打开旧条目回 `FILE_GONE`，页面给可读原因（「文件不存在或已被移动」），README/ADR 写「不迁移最近记录，旧条目会失效」。
  10. `scripts/rename-acceptance.mjs`：复用 `tree-acceptance.mjs` 的假 FS 注入（`window.__fs`）驱动真实 UI。
- **验收（P0 全 PASS）**
  1. 正常改名：`a.md`→`b.md`，内容不变、`a.md` 不存在、树显示 `b.md` 且选中；`move` 1 次、无 copy/remove 调用。
  2. 重名拒绝：先建 `b.md`（`keep`）→ 改 `a.md`→`b.md` → 拒绝、`b.md` 内容仍 `keep`、`a.md` 仍在；`B.md` 存在时同样拒绝。
  3. **探测后目标被建出**：假 FS 在第一次探测与 `move` 之间插入 `b.md` → 二次探测拒绝，`b.md` 内容不变。
  4. 非法名逐条拒绝且文件不变：`a<b.md`、`con.md`、`a.md.`、`.hidden.md`、`a.txt`、`a\b.md`（文案含反斜杠）。
  5. **当前文档改名四条断言**：`document.title` = 新名、顶栏 `docName` = 新名、`__slState.name` = 新名、`Ctrl+S` 写入新路径且 picker 0 次。
  6. 缓存迁移：预置旧键 → 改名后新键存在、旧键已删、批注可见；**新写失败**（假 FS 让 `writeCache` 抛错）→ 旧键仍在、提示可见；改名瞬间草稿计时器未触发写旧键（等待 900 ms 断言旧键无新内容）。
  7. 大小写两段：`a.md`→`A.md` 成功；第二段失败（假 FS 抛错）→ 文件停在临时名且提示「已改为临时名」，不谎称回滚。
  8. 取消与 IME：Esc/失焦不提交、`move` 0 次；`isComposing` 的 Enter 不提交。
  9. `move` 抛 `TypeError`（含 `\` 名兜底）→ 原名保留、无新文件、无删除、就地报错；目录行与单文件/示例无入口；`F2` 在文件行可用、目录行无效。
  10. 最近记录：改名后触发旧条目 `open-recent` → 回 `FILE_GONE`，页面 toast 文案可读（非英文 DOMException）。
- **门禁**：`npx tsc --noEmit; npm test; node scripts/rename-acceptance.mjs`
- **风险与回退**：`move()` 只在 OPFS 验过（真实目录/宿主/OneDrive 全 UNVERIFIED）；探测与 `move` 之间仍有窗口，二次探测只是收窄；两段改名失败只能如实报告临时名。回退：`git checkout -- src/ scripts/rename-acceptance.mjs`。
- **难度** L ｜ **量级** 280–360 行

## T2 树细节：缩进、当前文件可见、tab 停点、展开态与空文件夹（B5/U2–U4/H4/H5/P2/P4）｜A 组（builder，T1 后）

- **目标**：目录与文件同一套缩进（`6+(level−1)×14`）；`tabbablePath` 优先级固定为「可见的 `focusPath` → `activePath` → `rows[0]`」，切页签/折叠祖先/刷新/改名四种情况下树始终有 1 个 `tabindex=0` 且当前文件可见；展开态跨页签保持、空文件夹有提示（**P4，可延后**）。
- **为什么现在**：B5/U2/U3/U4 实测目录每层 `+10px`、文件行无缩进（四级文件与三级目录同 x=26）；切页签 `expanded` 2→0、`scrollTop` 25→0、树内 `[tabindex="0"]` 1→0；折叠祖先后选中项 0 个；空目录展开只有空 `role=group`；长目录名换 3 行、无 `title`。
- **文件**：`src/App.tsx`、`src/components/FileTree.tsx`、`src/styles.css`、`scripts/tree-acceptance.mjs`（扩用例）
- **步骤**
  1. 缩进（**P2**）：删 `.tree-dir` 的 `padding-left` 链，改 `.tree-group { padding-left: 14px }`；行内 `paddingLeft = 6 + (level−1)×14`（CSS 变量 `--level`），与 `aria-level` 同源；`visibleRows` 为唯一层级来源，`renderRow` 不再递归算 level。
  2. `tabbablePath` 固定优先级：**可见的 `focusPath` → `activePath` → `rows[0]`**；四种情形逐条：① 切页签——状态不卸载，`focusPath` 保留；② 折叠祖先——`activePath` 不可见时 `focusPath` 回退到**最近可见祖先**，仍保证 1 个 `tabindex=0`；③ 刷新——`focusPath` 仍可见则保留，否则回退 `activePath`；④ 改名——`focusPath` 更新为新 path。
  3. 状态上提：`expanded`、`scrollTop`、`focusPath` 移到 `App`（`sidebarTab` 旁），随 `workspace` 变化重置；切回「文件」时 `rAF` 恢复焦点与滚动（**P4**：跨页签保留展开态与滚动）。
  4. 自动展开祖先：`activePath` 变化时按 `/` 切段逐级 `expanded.add`（**P2 必过**：折叠祖先/刷新/改名后当前文件可见）。
  5. 空文件夹（**P4**）：`node.children.length === 0` 时在 `role="group"` 内渲染 `<p className="tree-empty-dir">这个文件夹里没有 Markdown 文件</p>`。
  6. 长名（**P2**）：目录名与文件名都 `nowrap + ellipsis`，`title={node.name}`；重命名输入框占满文本列。
- **验收（P2 必过 / P4 可延后）**
  - **P2 必过**：① 四级文件与三级目录 `paddingLeft` 满足 `6+(level−1)*14`，无双重缩进；② 打开深文件 `项目/章节/深章.md` → 祖先自动展开、`aria-selected="true"` 可见；③ 折叠父目录再 `Tab` 进树，仍有 1 个 `tabindex=0` 的行可聚焦；④ 改名后 `focusPath` = 新 path、树选中新行；⑤ 长名 `scrollWidth <= clientWidth` 且 `title === node.name`。
  - **P4 可延后（超线时可砍，砍则记录「延后」）**：⑥ 展开两目录 → 切「大纲」再回「文件」→ 展开数、`scrollTop`、选中行不变；⑦ 空目录展开后有「这个文件夹里没有 Markdown 文件」。被砍时本任务验收改为「延后项已在 `impl-a.md` 记录」，**不判失败**。
- **门禁**：`npx tsc --noEmit; npm test; node scripts/tree-acceptance.mjs; node scripts/rename-acceptance.mjs`
- **风险与回退**：状态上提同时改键盘与焦点恢复，四种情形的优先级必须按第 2 条实现；P4 被砍时不得连带删掉 P2 的自动展开。回退：`git checkout -- src/`。
- **难度** M ｜ **量级** 140–200 行

## T3 侧栏 tablist 与大纲 aria-current（U5/H4/H5/P1/P3）｜A 组（builder，T2 后）

- **目标**：大纲当前项有 `aria-current`（**P1，懒 chunk，首屏 0 B，必过**）；侧栏「文件/大纲」是 `tablist`（**P3，可延后**）且与树各占一个 tab 站。
- **为什么现在**：U5 实测 `.sidebar-tabs` 无 `role`/`aria-selected`/`aria-controls`、无方向键；`Outline.tsx:26-35` 只有 class；上轮误判 `aria-current` 进首屏，findings-ship 实测它在懒加载 chunk、首屏 0 B。
- **文件**：`src/App.tsx`、`src/components/Outline.tsx`、`src/styles.css`、`scripts/tree-acceptance.mjs`（扩用例）
- **步骤**
  1. **P1**：`Outline.tsx` 活动项加 `aria-current="location"`，其余不写；活动项变化不动焦点；**`Outline` 保持 `lazy`（`React.lazy`）**，不得改为静态 import。
  2. **P3**：侧栏外层 `role="tablist" aria-label="侧栏"`；按钮 `role="tab"` + `aria-selected` + `id="sidebar-tab-files|outline"` + `aria-controls="sidebar-files|sidebar-outline"`；面板固定 `id="sidebar-files"` / `id="sidebar-outline"` + `role="tabpanel"` + `aria-labelledby`；roving tabindex（活动 tab `0`、另一个 `-1`）+ `ArrowLeft/Right`、`Home/End`；树与 tablist 各自一个 tab 站，互不拦截。
  3. 不改文件树既有 aria、不改焦点环与对比度。
- **验收（P1 必过 / P3 可延后）**
  - **P1 必过**：① 大纲活动项 `aria-current="location"`，切换小节后跟随；② **首屏 chunk 不含 `Outline`**（`.tmp/build-b` 的 index 引用集合与 `measure` 输出里无 `Outline*`）；③ `npm test` 绿。
  - **P3 可延后**：④ 两个 tab 的 `aria-selected`/`aria-controls`（指向 `sidebar-files`/`sidebar-outline`）随点击与左右键变化，tablist 内 `[tabindex="0"]` = 1；⑤ 树内 tab 站仍为 1。被砍时改为「延后项已记录」，**不判失败**。
- **门禁**：`npx tsc --noEmit; npm test; node scripts/tree-acceptance.mjs`
- **风险与回退**：tablist roving 与树 roving 抢焦点；`aria-controls` 若 id 不固定会断链；Outline 若被静态 import 会破首屏预算。回退：`git checkout -- src/`。
- **难度** S ｜ **量级** 50–90 行

## T4 0.26.0 文档、ADR-0014、预算口径（S2/S5/H6）｜B 组（builder2，T5 结论后定稿）

- **目标**：ADR-0014 记录重命名语义与边界；修 ADR-0013「不做重命名」句；README/AGENTS/CHANGELOG 写实际能力、限制与 **820,000** 内部预算；**最近记录不迁移、旧条目会失效**写清；版本段等 T5 返回码。
- **为什么现在**：S5 指出 ADR-0013 与 README 会与实现互相打脸；S2 指出内部 815,000 已被超 683 B；H6 要求 README 明写旧最近记录失效。
- **文件**：`README.md`、`AGENTS.md`、`docs/CHANGELOG.md`、`docs/adr/0014-file-rename.md`（新）、`docs/adr/0013-file-tree-operations.md`、`docs/adr/0004-webview2-host-before-admin.md`、`packaging/README.md`
- **步骤**
  1. `docs/adr/0014-file-rename.md`：决定（同目录、仅文件、`move()`、只允许 `.md/.markdown`、目标已存在不覆盖含大小写不敏感、**两次探测 + `move` catch 兜底**、失败保留原名且**无 copy 回退**、缓存「写新成功才删旧」、**最近记录不迁移**）；边界（改草稿/批注 key、保存目标、标题；不改正文与未保存状态；大小写两段失败保留临时名）；否决（复制+删源、目录递归改名、应用内撤销）；UNVERIFIED（真实目录/宿主/OneDrive、只读占用、超长中文名、IME 回车、大小写）。
  2. `docs/adr/0013`：第 10 行加「文件重命名自 0.26.0 起支持，见 ADR-0014；目录仍不支持」；状态段与预算数字同步。
  3. CHANGELOG 按 T5 结果分支：过线 `## 0.26.0 — 2026-11-16`（重命名、校验、身份与缓存同步、树细节、`aria-current`、tablist 状态、**延后项**、未验、体积实测）；未过写「0.26.0 未发布：首屏 <实测> B 超线，砍掉的项见报告」。
  4. README：能做什么加重命名（右键/`F2`、同目录、校验、身份同步）；不能做什么删「不能重命名文件」、保留「不能移动/复制文件、不能重命名或删除目录」，补「**改名后旧的最近记录会失效**（打开会提示文件不存在）」「真实盘/宿主/OneDrive 未验」；体积段改首屏 ≤285,000、内部预算 820,000、硬线 850,000；包名与 ADR 索引改 0.26.0 / 0001–0014。
  5. `AGENTS.md §6`：0.26.0、重命名与树细节、`aria-current` 已完成、tablist 按实际、测试数、UNVERIFIED 增补；`packaging/README.md` 换 0.26.0 实测；`docs/adr/0004` 载荷按新 dist 复算。
- **验收**
  1. `Test-Path docs/adr/0014-file-rename.md` = True，含「不覆盖」「两次探测」「无 copy 回退」「最近记录不迁移」「UNVERIFIED」。
  2. ADR-0013 含「文件重命名自 0.26.0 起支持，见 ADR-0014」；README 不再含「不能重命名文件」，且含「旧的最近记录会失效」。
  3. 版本段与 T5 一致（0.26.0 或「0.26.0 未发布」）；`package.json` 与之一致。
  4. `Select-String README.md -SimpleMatch '820,000','285,000','0001–0014'` 各 ≥1；无「815,000」「一键恢复」「无障碍达标」。
- **门禁**：上述 `Select-String`/`Test-Path` + `npm test`
- **风险与回退**：预算口径三处一致（README/ADR-0013/CHANGELOG）；「未验」不能写成已验；P3/P4 延后时写「延后」不写「已做」。回退：`git checkout -- README.md AGENTS.md docs/CHANGELOG.md docs/adr/0013-*.md docs/adr/0004-*.md packaging/README.md` 并删 ADR-0014。
- **难度** M ｜ **量级** 150–210 行

## T5 首屏体积门与条件发版（S1/H5）｜B 组（builder2，根代理 build 后）

- **目标**：量本轮首屏 gzip；≤285,000（内部目标 ≤284,800）且安装包 ≤820,000 才升 0.26.0；超线只砍 **P4→P3** 并写「延后」，P0/P1/P2 不动，不抬线。
- **为什么现在**：S1 实测余 866 B、本轮估算 +485–720 B；S2 安装包预计 816.5–817.0 KB，需新内部预算。
- **文件**：`package.json`、`package-lock.json`（根代理同步）、`scripts/measure-first-screen.mjs`（只读调用）、`README.md`/`docs/CHANGELOG.md` 数字行
- **步骤**
  1. 跑 `node scripts/measure-first-screen.mjs --dir .tmp/build-b --max 285000`，记录 JS/CSS/合计与每个 URL。
  2. 284,801–285,000：先压缩实现（rename 逻辑集中 `rename.ts`、菜单项复用、不新增组件）；>285,000：按顺序砍 **P4（展开态保持 + 空文件夹提示）→ P3（tablist）**；**P0 rename、P1 `aria-current`、P2 缩进不砍**；砍掉的项写进 `impl-a.md`、`impl-b.md`、CHANGELOG 的「延后项」，**不许改脚本默认 285,000**。
  3. 两道门（首屏 ≤285,000；安装包 ≤820,000 内部预算、硬线 850,000）都过才升 `package.json` = `0.26.0`；否则保持 `0.25.0` 并把结论交给 T4。
  4. 根代理出包后回填安装包/zip 字节与 SHA256；`package-lock` 根版本与 `package.json` 一致；README 引 CHANGELOG，不重复数字。
- **验收**
  1. `measure --max 285000` exit 0 且合计 ≤285,000（期望 284.5–285.0 KB）；未过时改为「`package.json` 仍 0.25.0 + P4/P3 延后已记录 + P0/P1/P2 未砍 + 未抬线」。
  2. `package.json` 与 `package-lock.json` 版本一致（0.26.0 或 0.25.0）。
  3. `Select-String scripts/measure-first-screen.mjs -SimpleMatch '285000'` ≥1；`Select-String packaging/installer.ps1 -SimpleMatch '850000'` ≥1；CHANGELOG `[TBD]` 仅剩字节与 SHA。
- **门禁**：`node scripts/measure-first-screen.mjs --dir .tmp/build-b --max 285000; npm test` + `npm install --package-lock-only`（根代理）
- **风险与回退**：`.tmp/build-b` 与最终 `dist` 有哈希差异，以根代理最终 build 为准；砍项必须留记录，否则 tester 按 brief 判缺；P4/P3 被砍时 README/CHANGELOG 写「延后」。回退：`git checkout -- package.json package-lock.json README.md docs/CHANGELOG.md`。
- **难度** S–M ｜ **量级** 60–120 行

## 文件归属与执行顺序（零重叠）

| 任务 | 优先级 | 组与执行点 | 独占文件 |
| :--- | :--- | :--- | :--- |
| T1 | P0 必过 | A（builder，先做） | `src/lib/rename.ts`、`src/components/FileTree.tsx`、`src/components/TreeActions.tsx`、`src/App.tsx`、`src/lib/cache.ts`、`src/lib/workspace.ts`、`src/styles.css`、`scripts/rename-acceptance.mjs` |
| T2 | P2 必过 / P4 可延后 | A（builder，T1 后） | `src/App.tsx`、`src/components/FileTree.tsx`、`src/styles.css`、`scripts/tree-acceptance.mjs` |
| T3 | P1 必过 / P3 可延后 | A（builder，T2 后） | `src/App.tsx`、`src/components/Outline.tsx`、`src/styles.css`、`scripts/tree-acceptance.mjs`（扩） |
| T5 | 体积门 | B（builder2，根代理 build 后） | `package.json`、`package-lock.json`（根代理同步）、`README.md`/`docs/CHANGELOG.md` 数字行、`scripts/measure-first-screen.mjs`（只读） |
| T4 | 文档定稿 | B（builder2，T5 后） | `README.md`、`AGENTS.md`、`docs/CHANGELOG.md`、`docs/adr/0014-file-rename.md`、`docs/adr/0013-file-tree-operations.md`、`docs/adr/0004-webview2-host-before-admin.md`、`packaging/README.md` |

- 零重叠：A 只碰 `src/` 与两个验收脚本；B 只碰文档、`package.json`、只读调用 measure。`package.json`/`package-lock` 只归 T5；`npm test` 文件数不变（`rename.ts` 单测写进现有测试文件）。
- 顺序：T1→T2→T3 → 根代理 `npm run build` → T5（体积门/发版）→ T4（文档定稿与回填）；ADR-0014 可在 T5 前先写。
- 报告：A 组 `docs/iteration/round-13/impl-a.md`，B 组 `impl-b.md`，根代理合并 `impl.md`；截图 `shots/round-13/t1-*.png`、`t2-*.png`、`t3-*.png`。

## 本轮不做（写进下轮建议）

**目录重命名与跨目录移动**：`FileSystemDirectoryHandle.move` 不存在（实测 `undefined`），只能递归复制再造树。**copy+delete 回退**不做（非原子、换 inode、改 mtime/ACL、丢 OneDrive 身份）。**应用内撤销重命名**、**最近记录迁移**、OneDrive/网络盘与真实宿主验证同样不做（UNVERIFIED，写进 ADR）。

## 本轮 Demo（≤3 条用户可见变化）

1. 右键、行 `⋯` 或 `F2` 就能改名：重名（含仅大小写不同）、非法字符、保留名、非 `.md` 当场拒绝，目标文件不会被覆盖；失败保留原名并说明原因。
2. 改当前文档的名字后，标题、顶栏、树选中与保存目标一起更新，`Ctrl+S` 直接写新文件名；草稿与批注跟着文件走。
3. 树层级缩进对齐、当前文件始终可见、树始终能 Tab 进入；侧栏与大纲有正确的读屏语义（`aria-current` 无条件做，tablist 按预算）。

## 风险最高的任务

**T1**。它把「覆盖目标文件」压在一条只在 OPFS 验过的 `move()` 上：探测与 `move` 之间仍有窗口，二次探测只能收窄；大小写两段改名第二段失败时只能如实报临时名；成功后还要同步 `activeFile`/`fileRef`/`docNameRef`/`docName`/`title`/`__slState`/`saveTargetRef` 七处状态，并保证 refresh 跳过新 path，漏一处就是「标题新名、保存旧名」或身份被刷新清空。缓解是脚本里的「探测后目标被建出仍拒绝」「当前文档改名后标题/顶栏/`__slState`/`Ctrl+S` 四条断言」「新写失败旧键仍在」「第二段失败保留临时名」四条硬断言。次高是 T2：四种情形（切页签/折叠/刷新/改名）的 `tabbablePath` 优先级若实现不一致，键盘会失去唯一 tab 站。

## 下一轮建议主题

**重命名的真机收口**：在真实目录（本地 Chrome `--auto-open-devtools` 或真人）跑 `move()` 的普通/大小写/目标已存在/只读/占用/中文长名，把 ADR-0014 的 UNVERIFIED 逐条转实测；再决定目录重命名与最近记录迁移是否值得做；`npm test` 改 glob 纳入 `rename`/`trash`/`katexLazy` 测试；CI 加首屏体积闸与安装包预算检查。
