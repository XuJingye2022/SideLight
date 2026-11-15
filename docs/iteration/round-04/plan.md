# 第 04 轮 · 计划（rev2）

基线 `db4f617`（v0.17.0）。5 个任务：A 组（builder，UI）T1→T2→T3→T4 串行；B 组（builder2，宿主/文档）T5（5a 宿主 → 5b 文档）并行。
**构建纪律**：任何实施者不跑 `npm run build`。builder 用 `npx tsc --noEmit` 与 `npx vite build --outDir .tmp/build-a`；builder2 用 `host/build.ps1`。**宿主产物各自快照、不共享 `host/bin`**：根代理在 A 组开工前先跑一次 `host/build.ps1` 冻结基线，T1 立即拷 `.tmp/host-base`；T4 在 T5a 落地后重跑 `host/build.ps1` 并拷 `.tmp/host-t4`；T5a 的构建与探针全部在 `.tmp/host-t5a`。三份副本都把 `.tmp/build-a/*` 覆盖进自己的 `www`，跑各自目录里的 exe（CDP：T1 9334、T4 9335、T5a 9336）。`package.json` 本轮无人改。

## T1 保存必须有落点，dirty 与基线比较（B1/B5）｜A 组（builder，先做）

- **目标**：无磁盘句柄时 `Ctrl+S` 先选保存位置（`showSaveFilePicker`），选定后真正写盘并 `dirty=false`；之后 `Ctrl+S` 直接写同一文件、不再弹选择器；不可用或取消才降级且**不谎报成功**；`dirty` = 当前内容与保存基线不等，撤销回基线自动 false。
- **为什么现在**：B1 实测无句柄保存直接 `anchor.download`，提示说「已下载」6 秒消失、`dirty` 永不清零；宿主里下载被 cancel（`receivedBytes=0`）仍报成功，`some.md` 哈希前后不变。B5 撤销回原状后 `dirty` 仍 true，切换/退出必弹确认。
- **文件**：`src/App.tsx`、`src/lib/workspace.ts`、`src/lib/cache.ts`、`src/styles.css`、`scripts/save-acceptance.mjs`（新）
- **步骤**
  1. `workspace.ts` 定义并导出 `type FileWriteTarget = { handle: FileSystemFileHandle; name: string }` 与 `type SaveAsResult = FileWriteTarget | 'unsupported' | null`；`saveAsFile(name, text): Promise<SaveAsResult>`：`showSaveFilePicker({ suggestedName: name, types: [{ description: 'Markdown', accept: { 'text/markdown': ['.md'] } }] })` → `createWritable()` 写回 → 返回 target；用户取消（`AbortError`）返回 `null`；picker 不存在返回 `'unsupported'`（**联合类型写全，`tsc` 必须过**）。
  2. `App.tsx` 的 `notice` 类型加 `persist?: boolean`（第 3 轮已有 `{text,kind,action}`）；`notice` 定时器遇到 `persist === true` 直接跳过（不是只加 CSS）。
  3. `writeOut(name, content, type)`：有句柄 → 现有 `writeNode`；无句柄 → `saveAsFile`。成功：把返回的 target 存进 `saveTargetRef`，**同时构造带 `handle` 的 file 节点交给当前文档身份**（`activeFile` 或 `commitSave` 读 `saveTargetRef`，两条路径必须统一），更新 `docName`、基线、`dirty=false`，给 `persist:true` 的提示「已保存 <文件名>」+ 动作「另存为」。`'unsupported'` → 下载降级，提示「无法确认落点：已交给浏览器下载。要写回文件，请用「另存为」选择位置」+ 动作「另存为」，`dirty` 保持 true，不说「已保存」。用户取消 → 清掉上一条成功提示并给一次「已取消保存」，`dirty` 与正文不动。
  4. `dirty` 改基线比较：`baselineRef` 在载入/新建/保存成功/草稿恢复时更新；`onUpdate` 里 `setDirty(currentMarkdown() !== baselineRef.current)`；源码模式比 `sourceText !== sourceBaselineRef.current`；删掉两处无条件 `setDirty(true)`。
  5. `cache.ts`：保存成功后按旧名字多清一次草稿（`removeCache(dir,'draft',cacheKey(oldName))`），避免「另存为」后旧名字残留；`cacheKey` 与目录规则不动。
  6. `scripts/save-acceptance.mjs`：浏览器段用 `addInitScript` 打桩 picker（OPFS 句柄）+ 成功/取消/不支持三分支；宿主段用 `.tmp/host-base`（CDP 9334）跑成功分支。
- **验收（`node scripts/save-acceptance.mjs` 全 PASS）**
  1. 打桩 picker → `Ctrl+S`：OPFS 字节 = 正文、提示含「已保存」与文件名且 **10 s 后仍在**（靠 `persist`）、`__slState.dirty === false`。
  2. **第二次 `Ctrl+S` 不再调用 picker**（桩计数不增），写入同一文件，内容更新、`dirty=false`。
  3. `delete window.showSaveFilePicker` → `Ctrl+S`：有下载、提示含「无法确认落点」且**不含**「已保存」、`dirty===true`。
  4. picker 抛 `AbortError`：无下载、**没有残留的「已保存」提示**、出现「已取消保存」、`dirty===true`、正文不变。
  5. dirty 六态：打字→true；撤销回基线→false；保存成功→false；保存后再打字→true；再撤销回**保存基线**→false；载入/草稿恢复/宿主 argv 注入后的初始 `dirty===false`。
  6. 宿主（`.tmp/host-base`）：注入同款 picker 桩 → 打字 → `Ctrl+S` → OPFS 文件等于正文、`dirty=false`、提示含「已保存」；宿主里不测不支持分支（归 T5a 的集成断言）。
  - 真实系统保存对话框**标 UNVERIFIED**（critic 实测 `showSaveFilePicker` 在宿主里是 `function`、`isSecureContext=true`，但对话框未真弹），补法是安装版人手点一次。
- **门禁**：`npx tsc --noEmit; npm test; npx vite build --outDir .tmp/build-a; node scripts/save-acceptance.mjs`
- **风险与回退**：写回后文档身份从「内存文档」变成「文件文档」，切换/批注恢复要复测；`activeFile` 与 `saveTargetRef` 两处身份若不一致，第二次保存会再弹 picker（验收第 2 条专门抓）。回退：`git checkout -- src/` 并删 `scripts/save-acceptance.mjs`。
- **难度** M ｜ **量级** 240–320 行

## T2 文件菜单、新建/另存为、换文件入口（B2/B4）｜A 组（builder，T1 后）

- **目标**：三种状态（空/文件夹/示例）都能新建、另存为、打开文件、打开文件夹；示例与真实文件夹一眼可分；新建得到 `未命名.md`，首存走另存为。
- **为什么现在**：B2 实测打开文件夹或点「试用示例」后入口全部消失（22 个按钮 0 命中），只能刷新；B4 全页没有「新建/另存为」，用户只能清空示例冒充新文档，保存名被示例名污染。
- **文件**：`src/App.tsx`、`src/components/FileMenu.tsx`（新）、`src/components/FileTree.tsx`、`src/styles.css`、`scripts/filemenu-acceptance.mjs`（新）
- **步骤**
  1. 新增 `FileMenu.tsx`：顶栏「文件 ▾」+ 四项（新建 / 另存为… / 打开文件… / 打开文件夹…）；复用 `.menu` 样式；`Esc` 关闭并**把焦点还给「文件」按钮**，`aria-haspopup`/`aria-expanded`。
  2. 新建**先走现有 `requestLoad` 的 dirty 确认**（有未保存改动时先弹「这篇还有没保存的改动」，取消则什么都不做）：无文件夹 → 空正文 + `未命名.md` + 基线为空 + `dirty=false`；有文件夹 → `rootHandle.getFileHandle('未命名.md',{create:true})` 建空文件，载入后**刷新树快照**（重读 `rootHandle` 或把新节点插进 `workspace.root.children`），重名时 `未命名 2.md`。
  3. 另存为 → 直接调 T1 的 `saveAsFile`，成功后更新名字/句柄/基线（T1 的身份路径）；打开文件/打开文件夹复用 `pickFile`/`pickWorkspace`。
  4. `FileTree.tsx`：真实文件夹树头加「＋ 新建文件」与「打开其他文件夹」；示例态用已有 `workspace.demo` 渲染「示例」徽标 + 一句「改动不写盘，保存会另存为」，示例态不显示「＋ 新建文件」；空状态三按钮保留，文案改成「先打开一个文件夹，保存才会写回」。
  5. `scripts/filemenu-acceptance.mjs`：`addInitScript` 伪造 `showDirectoryPicker`（OPFS）与 `showSaveFilePicker`。
- **验收（`node scripts/filemenu-acceptance.mjs` 全 PASS）**
  1. 三态都有「文件」按钮与四项菜单；示例态与真实文件夹态下「打开文件夹」仍可点。
  2. 菜单打开后按 `Esc` → 关闭且 `activeElement` 是「文件」按钮。
  3. 真实文件夹：树头「＋ 新建文件」→ **树里出现 `未命名.md` 且 `.is-active`/`aria-current` 命中**、正文空、`dirty=false`；`Ctrl+S` 直接写盘不弹 picker。
  4. 无文件夹：「新建」→ 空正文 + `未命名.md` + `dirty=false`；`Ctrl+S` 走 picker 后 `dirty=false`。
  5. 脏改动时点「新建」→ 出现未保存确认；选取消 → 正文与 `dirty` 原样。
  6. 另存为（打桩 picker）→ 新文件写入、名字更新、`dirty=false`；示例态：有「示例」徽标、无「＋ 新建文件」、保存走 picker 不写示例目录。
- **门禁**：`npx tsc --noEmit; npm test; npx vite build --outDir .tmp/build-a; node scripts/filemenu-acceptance.mjs`
- **风险与回退**：树快照不刷新会让新文件不可见（验收第 3 条专抓）；示例与文件夹两态需各一张截图。回退：`git checkout -- src/` 并删 `FileMenu.tsx` 与脚本。
- **难度** M ｜ **量级** 220–300 行

## T3 导出用当前模式内容 + 组合输入回归（B3）｜A 组（builder，T2 后）

- **目标**：源码模式下导出 HTML / 纯文本与 Markdown 一样含最新内容；文件名跟随当前文档名；补一条组合输入回归测试（不改输入逻辑）。
- **为什么现在**：B3 实测源码里写的标记在导出的 HTML / TXT 里没有——正是「去源码模式修保真」这条官方引导路径会静默丢最新改动。
- **文件**：`src/App.tsx`、`src/lib/export.ts`、`scripts/export-acceptance.mjs`（新）、`scripts/ime-composition.mjs`（新）
- **步骤**
  1. `exportAs`：导出前若 `viewMode === 'source'` 先调已有 `applySource()` 把源码写回编辑器（不切视图），再取 `editor.getHTML()` / `editor.getText()`；Markdown 继续走 `currentMarkdown()`；三个分支共用一次 `docName`，文件名仍由 `exportName(docName, ext)` 生成。
  2. 导出失败沿用第 3 轮 `try/catch` 与中文提示；成功提示带实际文件名。
  3. `scripts/export-acceptance.mjs`：打字 → 切源码 → 追加 `SRC-ONLY-MARK` → 连续导出 HTML/TXT/MD，断言三份都含标记、文件名跟文档名一致。
  4. `scripts/ime-composition.mjs`：CDP `Input.imeSetComposition` + `Input.insertText` 在正文/标题/代码块/表格/源码五处各跑一次，断言上屏无重复、无丢字、一次 `Ctrl+Z` 撤回整词、组合中 `Ctrl+S` 不写重复内容。
- **验收**：两个脚本全 PASS；`npm test` 仍 16 文件 171 条 0 失败。
- **门禁**：`npx tsc --noEmit; npm test; npx vite build --outDir .tmp/build-a; node scripts/export-acceptance.mjs; node scripts/ime-composition.mjs`
- **风险与回退**：`applySource()` 会产生一次撤销记录、导出后 `dirty` 按基线比较自然为 true（内容确实变了）；真实中文输入法/候选窗/宿主内 IME **标 UNVERIFIED**。回退：`git checkout -- src/` 并删两个脚本。
- **难度** S ｜ **量级** 80–120 行

## T4 宿主 argv 打开的文档显示只读提示（B1 后半）｜A 组（builder，T3 后）

- **目标**：命令行打开的文件不再假装能写回：顶部**持久**横幅「只读打开：Ctrl+S 不会写回原文件，请用「另存为」选择位置」+「另存为」按钮；`Ctrl+S` 直接走另存为。
- **为什么现在**：B1 实测 `Sidelight.exe some.md` 后保存，`some.md` 哈希前后相同、宿主下载被 cancel、页面却提示成功。完整 IPC 写回不在本轮（见「本轮不做」），但静默丢失必须消掉。
- **文件**：`src/App.tsx`、`src/styles.css`、`scripts/readonly-acceptance.mjs`（新）
- **依赖**：T5a 已把 `readOnly: true` 写进注入的 `sidelight.doc.v1`；**T4 开工前重跑 `host/build.ps1`**，把当时的 `host/bin` 拷进 `.tmp/host-t4`（独立目录，不复用 `.tmp/host-base`），`.tmp/build-a` 覆盖进它的 `www`。
- **步骤**
  1. 载入时读 `sidelight.doc.v1.readOnly`（缺省 false）记进状态；只读文档在正文上方渲染 `.readonly-banner`（`role="status"`、不自动消失、无关闭键）+「另存为」按钮。
  2. 只读文档的 `Ctrl+S` 与顶栏「保存」直接调 T1 的 `saveAsFile`；成功提示「已保存 <新文件名>」，解除只读标记与横幅。
  3. `scripts/readonly-acceptance.mjs`：起 `.tmp/host-t4`（CDP 9335），带一个 `.md` 参数，断言横幅出现且 8 s 后仍在、`__slState.readOnly === true`、打桩 picker 后 `Ctrl+S` 落新文件；再走「打开文件」路径载入同一文件（有句柄）**断言不出现横幅**。
- **验收**：脚本全 PASS；截图 `shots/round-04/t4-readonly.png`；原文件 SHA256 前后一致。
- **门禁**：`npx tsc --noEmit; npm test; npx vite build --outDir .tmp/build-a; node scripts/readonly-acceptance.mjs`
- **风险与回退**：`.tmp/host-t4` 必须晚于 T5a 构建（早于它的副本没有 `readOnly`，横幅不会出现）；普通文件不得误报（验收已加负向断言）。回退：`git checkout -- src/` 并删脚本。
- **难度** S ｜ **量级** 70–100 行

## T5 宿主下载落点 + 文档/CI/仓库卫生（S1–S5）｜B 组（builder2，与 A 组并行；5a 先）

- **目标**：宿主接住 `DownloadStarting`（导出与降级下载在安装版可用）；AGENTS/README/CHANGELOG/CI/packaging/ADR 与 0.17.0 实际对齐；给根代理 37 个零引用截图的移出清单。
- **为什么现在**：S1–S4 说文档仍写「浏览器原型 / 未接 Tauri 壳」、CHANGELOG 引用不存在的 0.16.4–0.16.9、CI 没有 Windows 宿主 job；findings-bug 说宿主无 `DownloadStarting`，导出在安装版里可能静默无文件。
- **文件**：`host/Program.cs`、`host/download-probe.mjs`（新）、`AGENTS.md`、`README.md`、`docs/CHANGELOG.md`、`docs/adr/0004-webview2-host-before-admin.md`、`.github/workflows/ci.yml`、`packaging/README.md`、`packaging/installer.ps1`
- **步骤**
  1. **5a 下载**：`Program.cs` 注册 `CoreWebView2.DownloadStarting`（在 UI/STA 线程同步处理，不 `await` 后台线程）：`var name = Path.GetFileName(e.SuggestedFileName)`；有 `SIDELIGHT_DOWNLOAD_DIR` → `e.ResultFilePath = Path.Combine(dir, name)`；否则弹 `SaveFileDialog`，`FileName = name`、`InitialDirectory = <上次目录或 Downloads>`，取消则 `e.Cancel = true`。**两条分支都 `e.Handled = true`**；日志记最终路径 `download starting name=... result=... handled=true`。
  2. **5a 只读标记**：argv 与转发的注入 JSON 增加 `readOnly: true`；构建产物拷到 `.tmp/host-t5a`，探针 `host/download-probe.mjs` 在该副本上跑（CDP 9336）。
  3. **5a 探针两段**：① 点「导出 → Markdown」→ 文件落到 `SIDELIGHT_DOWNLOAD_DIR`、字节含正文、日志有 `download starting`；② **T1 完成后**补集成断言：打桩把 `showSaveFilePicker` 设为 `undefined` → `Ctrl+S` 走降级下载 → 文件落在同一目录且内容 = 正文（这条证明「保存降级 → DownloadStarting 落盘」闭环，由根代理在 T1 结束后放行）。
  4. **5b 文档**：按 findings-ship 的替换文本 A1–A5 改 `AGENTS.md`；按 B1–B10 改 `README.md`；**T1/T2 PASS 后再补三处**（README B10「下一步」删掉「新建与另存为」、AGENTS §6 首段改「新建与另存为已能走完」、CHANGELOG 加「新建/另存为」条目），由根代理放行，未 PASS 则保留旧句并标注。
  5. **5b CHANGELOG**：替换 0.17.0 首段（删「0.16.4–0.16.9」），补货币吞字、图标、测试 16/171、未验项四行，并给 ADR-0005 与 `../packaging/README.md` 加链接。
  6. **5b CI**：按 S4 的 YAML 加 `windows-host` job（`windows-2022`、WebView2 SDK 与 NSIS 版本+SHA256 固定、`host/build.ps1`、`host-smoke`、`installer.ps1`、上传产物）；`install-verify` 只在 `workflow_dispatch`；首次冒烟若红，按 YAML 注释先 `continue-on-error` 观察 3 次，不静默删除。
  7. **5b 卫生**：`packaging/README.md` 删掉过期的「%LOCALAPPDATA% 可能被拒写」「HKCU 被吞」两条；`docs/adr/0004` 的「CI 有 windows-latest 才换 Tauri」改成「CI 出包成熟后再评估」；`packaging/installer.ps1` 的硬线从 840,000 改 **850,000**（推导：当前 827,198 + T1/T2 的 dist 增量预算约 12 KB + 余量 ≈ 11 KB；同时删掉未生效的 `$threshold = $p + 10000` 死代码），并在 `impl-b.md` 记 T1/T2 后实测值；生成 `.tmp/shots-drop.txt`（37 个零引用文件），**builder2 不执行 git 命令**。
- **验收**
  1. `powershell -File host/build.ps1; node host/download-probe.mjs` exit 0：两段 PASS（导出落盘 + 保存降级落盘；第二段在 T1 完成后跑）。
  2. `Select-String AGENTS.md -SimpleMatch '浏览器原型','未接 Tauri 壳','Tauri 接上之后'` 0 命中；含「per-user」「安装器」「CHANGELOG」。
  3. `Select-String README.md -SimpleMatch '0.16.4','再套 Tauri 壳'` 0 命中；含「CHANGELOG.md」「ADR-0005」「没有新建与另存为」（T1/T2 PASS 后改为「新建与另存为已可用」）。
  4. `Select-String docs/CHANGELOG.md -SimpleMatch '0.16.4–0.16.9'` 0 命中；含「货币不再吞字」「171 条」「ADR-0005」。
  5. `Select-String .github/workflows/ci.yml -SimpleMatch 'windows-2022','WV2_SHA256','NSIS_SHA256','installer.ps1','upload-artifact'` 各 ≥1。
  6. `Test-Path .tmp/shots-drop.txt` 且行数 = 37；`git ls-files shots` 仍 132（不动 git）；`packaging/installer.ps1` 含 `850000`。
- **门禁**：`powershell -ExecutionPolicy Bypass -File host/build.ps1; node host/download-probe.mjs; <上述 Select-String>`
- **风险与回退**：真实系统保存对话框**标 UNVERIFIED**（探针只覆盖测试目录与降级链路）；`SaveFileDialog` 放错线程会卡死（已写明同步）；CI 首次跑可能受 runner 环境影响（降级办法已写）；README/CHANGELOG 的收尾三处依赖 T1/T2 结果，用条件句 + 根代理放行。回退：`git checkout -- host/ AGENTS.md README.md docs/CHANGELOG.md docs/adr/0004-*.md .github/workflows/ci.yml packaging/README.md packaging/installer.ps1`，删 `download-probe.mjs`。
- **难度** M ｜ **量级** 320–440 行

## 文件归属与并行（零重叠）

| 任务 | 组与顺序 | 独占文件 |
| :--- | :--- | :--- |
| T1 | A（builder，先做） | `src/App.tsx`、`src/lib/workspace.ts`、`src/lib/cache.ts`、`src/styles.css`、`scripts/save-acceptance.mjs` |
| T2 | A（builder，T1 后） | `src/App.tsx`、`src/components/FileMenu.tsx`、`src/components/FileTree.tsx`、`src/styles.css`、`scripts/filemenu-acceptance.mjs` |
| T3 | A（builder，T2 后） | `src/App.tsx`、`src/lib/export.ts`、`scripts/export-acceptance.mjs`、`scripts/ime-composition.mjs` |
| T4 | A（builder，T3 后） | `src/App.tsx`、`src/styles.css`、`scripts/readonly-acceptance.mjs` |
| T5 | B（builder2，并行；5a→5b） | `host/Program.cs`、`host/download-probe.mjs`、`AGENTS.md`、`README.md`、`docs/CHANGELOG.md`、`docs/adr/0004-*.md`、`.github/workflows/ci.yml`、`packaging/README.md`、`packaging/installer.ps1` |

- 两组零重叠：A 只碰 `src/` 与新建的 `scripts/*-acceptance.mjs`、`scripts/ime-composition.mjs`；B 只碰 `host/`、文档/CI、`packaging/`。`package.json` 无人改（`npm test` 仍 16 文件 171 条）。
- 宿主快照三份互不共享：`.tmp/host-base`（T1）、`.tmp/host-t4`（T4，晚于 T5a 构建）、`.tmp/host-t5a`（T5a）；每份都用各自的 `.tmp/build-a` 覆盖 `www`。
- 跨组依赖：T4 读 T5a 的 `readOnly`（T5a 先落地）；T5a 的集成断言②与 T5b 的三处收尾都等 T1/T2 结果，由根代理放行。
- 报告：A 组 `docs/iteration/round-04/impl-a.md`，B 组 `impl-b.md`，根代理合并 `impl.md`；截图 `shots/round-04/t*-*.png`。

## 本轮不做（写进下轮建议）

**宿主 IPC 写回**（argv 打开的文件直接写回磁盘）：它要新增「前端请求写某路径 → 宿主执行」的桥、绑定句柄生命周期、处理外部修改与并发，还要先证明 T1 的落点选择在安装版稳定，属独立能力，本轮只做只读提示；`.md` 关联、主题切换、KaTeX 拆包、`App.tsx` 重构、`shot.mjs` 参数化、`filter-repo` 瘦身、签名证书同样不做。

## 本轮 Demo（≤3 条用户可见变化）

1. 没打开文件夹时按 `Ctrl+S` 会先问存到哪；存好提示「已保存 未命名.md」并留着，绿点消失；之后 `Ctrl+S` 直接写同一文件。撤销回原样绿点也消失。
2. 顶栏有「文件」菜单：新建、另存为、打开文件、打开文件夹随时可用；示例工作区带「示例」徽标，新建就是干净的 `未命名.md`。
3. 源码模式导出的 HTML/纯文本包含最新内容；命令行打开的 `.md` 明确标「只读打开」，不再假装保存成功。

## 风险最高的任务

**T1**。它把保存从一次 `anchor.download` 改成「选句柄 → 写盘 → 更新文档身份」，还要让第二次保存复用同一句柄，同时把 `dirty` 换成基线比较——三件事都在保存路径上，错一处就是「假保存」或「一直显示未保存」。验收用第 2 条（第二次不弹 picker）与六种 dirty 状态卡住；真实系统保存对话框无法自动化，只能打桩验流程、安装版人手补验（UNVERIFIED）。次高是 T5a：`DownloadStarting` 的线程与两段落盘都依赖环境，探针分两段跑，第二段等 T1 完成。

## 下一轮建议主题

**写回与可验证的发布**：做宿主 IPC 写回（argv 文件直接存回、带冲突提示），补真实 IME 测试（浏览器 + 宿主），清掉安装四项 UNVERIFIED（CI `install-verify` 实跑或真人一次），再做 `.md` 关联最终决策；仓库侧继续 `shots/` 第二步清理与 `shot.mjs` 参数化。
