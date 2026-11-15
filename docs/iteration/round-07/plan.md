# 第 07 轮 · 计划（rev2）

基线 `92a3ac6`（v0.19.0）。5 个任务：A 组（builder，数据保真）T1→T2→T3 串行；B 组（builder2，安装器/发布）T4→T5 串行，可并行于 A。
**构建纪律**：任何实施者不跑 `npm run build`。A 用 `npx tsc --noEmit` 与 `npx vite build --outDir .tmp/build-a`；B 用 `.tmp\nsis\nsis-3.11\makensis.exe` 编译到 `.tmp`。宿主验收用 `.tmp/host-r7` 副本（`Copy-Item host/bin .tmp/host-r7 -Recurse`，再把 `.tmp/build-a/*` 覆盖进 `www`），不碰共享 `host/bin`。CDP：A 用 9222 + 宿主 9339，B 不占 CDP。`package.json` 只归 T5；`package-lock` 由根代理同步。

## T1 保存差异门覆盖所有保存路径（U2/B1/U3/H1/H6）｜A 组（builder，先做）

- **目标**：`saveFile`、`saveAsCopy`、`saveAndSwitch`、宿主写回四条路径都先过同一道差异门；只有「载入时就存在、保存后仍被同一条结构损失命中」才弹确认；确认回调里才置 `saveWarned`；宿主只收 LF 归一化文本。
- **为什么现在**：B1/U2 实测宿主分支在差异门之前 `return`（`App.tsx:1612-1623`）且宿主载入即 `setSaveWarned(true)`（`:688`）；`saveAsCopy`（`:1651`）与 `saveAndSwitch`（`:1794`）完全不经过差异门；`saveWarned` 还在 `commitSave`（`:1554`）、`finishSaved`（`:1519`）、`sendHostSave`（`:1729`）里被置 true，取消后也会失去提示。U3 实测新建文档也弹框（基线是 `''` 不是 `null`）。
- **文件**：`src/App.tsx`、`src/styles.css`、`src/lib/diff.ts`、`src/lib/risk.ts`（最小版，T3 扩全）、`scripts/data-safety-acceptance.mjs`（新）
- **步骤**
  1. `prepareSave()` 返回 `{ normalized, withEol }`：`normalized = currentMarkdown().replace(/\r\n/g,'\n')`（**宿主只发这份**），`withEol` 只给 `commitSave`/`saveAsFile`（浏览器与文件句柄）。
  2. **两段基线**（H2）：`risk.ts` 提供 `baselineLosses(original)` = `classify(original, serialize(original))`（载入即存在的结构损失）与 `activeLosses(original, current)`：只保留「基线里存在、且 `classify(serialize(original), current)` 仍命中同一结构位置」的类别；本轮最小类别 = 引用式链接定义、表格分隔行（**仅当单元格值未变、只有空格/宽度变化**）。用户自己删的行、增删表格行列、正常空行都不进 `activeLosses`。
  3. 基线：`originalText` 只在真打开已有文件/宿主文档时设为原文；新建、空文档、宿主不可用时设 `null`（`loadIntoEditor` 的空文本分支、`hostUnavailable` 分支）；**删除 `applyHostPayload` 里的 `setSaveWarned(true)`**。
  4. 统一保存入口：四条路径都先 `prepareSave()`，再走同一函数 `requestSave(target: 'host'|'file'|'saveAs'|'switch')`——宿主不可写 → 转另存为；`!dirty` 且宿主文档 → 「没有改动，未写入」；`activeLosses.length > 0` → `setPendingConfirm({ normalized, withEol, target })`；否则直接执行。**无结构损失的普通文档保存不再弹框**。
  5. 确认回调（唯一置 `saveWarned` 的地方）：`setSaveWarned(true)` 后按 target 执行——`host` → `sendHostSave(normalized)`；`file` → `commitSave(withEol)`；`saveAs` → `saveAsFile(withEol)`；`switch` → `commitSave` 后切换。取消只清 `pendingConfirm`，不动 dirty、不置 `saveWarned`，**不写任何字节**。
  6. **改名消歧**（H6）：确认状态 `pendingSave` → `pendingConfirm`（`SaveDialog` 打开条件、`Esc`、`onConfirm` 全部改）；宿主写回队列 `pendingSaveRef` → `pendingHostSave`。`commitSave`/`finishSaved`/`sendHostSave` 里删掉 `setSaveWarned(true)`。
  7. `scripts/data-safety-acceptance.mjs`：浏览器段用 stub `showOpenFilePicker`/`createWritable` 装样本并抓写入字节；宿主段用模拟 `/__doc` + 拦截 `chrome.webview.postMessage`（同 r7-bug 的 `host-sim.mjs`），不依赖真实宿主进程。
- **验收（脚本全 PASS）**
  1. 浏览器打开 `04-reference-links.md` → 改一字 → `Ctrl+S` → 出确认框且列出两行被删定义；取消后**写入次数 = 0**、`dirty === true`；再按 `Ctrl+S` 仍出现。
  2. 宿主模式（模拟 `/__doc`）：同样先出确认；**确认前 `postMessage` 消息数 = 0**，确认后 1 条且 `text` 不含 `\r`。
  3. **另存为**：打开同一文件 → 「另存为…」→ 出确认框；「取消」后 `saveAsFile` **未被调用**、无写入；确认后才写。
  4. **保存并切换**：脏文档点另一文件 → 选「保存并切换」→ 先出差异确认；取消则不切换、不写盘。
  5. 新建文档输入一段 → `Ctrl+S` → **不弹**；打开 `02-table.md`（仅表格结构损失）→ 改表格外一段 → `Ctrl+S` → 弹出且含「表格分隔行会被重排」。
  6. 打开一篇无结构损失的普通文档 → 改一段 → `Ctrl+S` → **不弹**，直接保存。
- **门禁**：`npx tsc --noEmit; npm test; npx vite build --outDir .tmp/build-a; node scripts/data-safety-acceptance.mjs`
- **风险与回退**：四条路径合并成一个入口容易漏参数；`activeLosses` 若把用户删行误判，会退回「每次都弹」。回退：`git checkout -- src/` 并删脚本。
- **难度** M ｜ **量级** 200–280 行

## T2 源码模式显示原文，保存后同步基线（U1/B2/H3）｜A 组（builder，T1 后）

- **目标**：载入后未编辑时源码显示文件原文（含引用式链接定义）；保存成功/另存为成功/宿主写回成功后，`rawTextRef` 更新为**刚写入的文本**；横幅的「在源码模式打开原文」真能恢复原文。
- **为什么现在**：U1/B2 实测点横幅后 textarea 里已无 `[tiptap]:` 两行，按指引操作反而确认丢数据版本；且若只在载入时设置 `rawTextRef`，保存后切源码会显示**旧原文**而磁盘已是新内容，从源码再保存会把旧内容写回。
- **文件**：`src/App.tsx`、`scripts/data-safety-acceptance.mjs`（扩用例）
- **步骤**
  1. `rawTextRef`：`applyHostPayload`（宿主正文）与 `loadIntoEditor`（文件正文）写入原文；`loadIntoEditor('')`/新建清成 `null`。
  2. **保存后更新**：`finishSaved`、宿主 `save-result ok`、`saveAsCopy` 成功后，把 `rawTextRef.current = 刚写入的文本`（与 `originalText`/`baselineRef` 同步）。
  3. `switchView('source')`：`!dirty && rawTextRef.current !== null` → `setSourceText(rawTextRef.current)`；`dirty` → 用 `currentMarkdown()` 并在源码框上方显示「源码里是你的改动 + 编辑器整理结果，不是文件原文」；离开源码按现有规则写回。
  4. 实现 `openSourceOriginal()`（引出 ref 供 T3 的 SaveDialog 按钮调用）：强制用 `rawTextRef.current` 初始化源码并切视图；旧数据没有 `rawTextRef` 时退回 `originalText`。
  5. 横幅文案改成可验证的：「这篇有引用式链接。编辑视图保存时会把 `[文字][id]` 改成 `[文字](url)`，并删掉文末的 `[id]: url` 行。」按钮「在源码模式打开原文」「知道了」；横幅在源码视图也显示。
  6. 工具条「源码」的 `title` 按实际行为改（未编辑=原文，已编辑=改动 + 规范化）。
- **验收（扩脚本）**
  1. 打开 `04-reference-links.md` → 点横幅按钮 → `.source-editor` 的 `value` **逐字节等于文件原文**（含两行定义）→ 保存后写出的字节等于原文。
  2. 编辑后 `Ctrl+S` 确认保存 → **再切源码**，`textarea` 等于刚写入的字节（不是载入时的旧原文）。
  3. 另存为成功后切源码，内容等于新写入的文件内容。
  4. CRLF 源文档：宿主写回后磁盘仍是 CRLF（`\r\n` 计数不变），源码框显示原文。
- **门禁**：`npx tsc --noEmit; npm test; npx vite build --outDir .tmp/build-a; node scripts/data-safety-acceptance.mjs`
- **风险与回退**：源码模式保存要区分「原文未编辑」与「编辑后合并」；切换文档/宿主转发时 `rawTextRef` 必须重置。回退：`git checkout -- src/`。
- **难度** M ｜ **量级** 120–180 行

## T3 风险识别改差分（两段基线）+ SaveDialog 分类 + 顺手修（B3/B4/B5/H2/H5）｜A 组（builder，T2 后）

- **目标**：风险不再是白名单，而是「载入时基线损失 + 当前仍命中」的分类；覆盖表格、多行脚注、含 `&` 的 HTML、自动链接、HTML 注释、`\` 硬换行、末尾换行、空行；能修的顺带修（末尾换行），修不了的进确认；`SaveDialog` 按类别分组。
- **为什么现在**：`findRiskySyntax` 只有一条正则（`App.tsx:139-143`），表格、含 `&` 的 HTML、自动链接/注释、多行脚注都静默写坏；末尾换行在保存产物里消失；`SaveDialog` 只给「另有 N 行空行调整」，用户无法判断哪行是损失。
- **文件**：`src/lib/risk.ts`、`src/lib/diff.ts`、`src/lib/diff.test.ts`、`src/components/SaveDialog.tsx`、`src/App.tsx`、`src/lib/footnotes.ts`、`docs/roundtrip-report.md`（生成物）、`scripts/data-safety-acceptance.mjs`（扩用例）
- **步骤**
  1. `risk.ts` 扩全 `classify(before, after)`：引用式链接定义、表格分隔行（**仅空白/宽度变化**才算；单元格值变、增删行列不算）、多行脚注（`^\[\^…\]:` + 缩进续行）、含 `&` 的 HTML、自动链接、HTML 注释、`\` 硬换行（**标为「等价改写」，不归入数据丢失**）、末尾换行（原文有、产物无才算）、空行增删（单列一类，默认折叠）。
  2. `activeLosses(original, current)` 用「基线 vs 当前」两段判定（T1 的接口不变）：只保留基线存在且当前仍命中的结构损失；`findRiskySyntax` 保留为薄封装返回 label 供横幅。
  3. 载入时（宿主与文件两条路径）跑 `baselineLosses(rawText)` 存 `risks`；横幅分组显示类别与条数，补 `role="status"`。
  4. `SaveDialog` 按类别分组渲染（类别标题 + 该类别行数 + 前 N 行），空行一类可展开；加第三个按钮「在源码模式打开原文」（调 T2 的 `openSourceOriginal`）；文案把「这次只提示一次」改成「这篇后续保存仍会在有格式损失时提示」。
  5. **顺手修**：末尾换行——`originalText` 以 `\n` 结尾而产物不以 `\n` 结尾时补一个（`prepareSave` 内，用 `endsWithNewline` 记录）；frontmatter 后与任务列表空行（roundtrip 01/06 各差 1 行）尝试在 `joinFrontmatter`/`joinFootnotes` 拼接处修，**改不动就归入分类确认，不许静默**；`\` 硬换行不改进序列化。
  6. 复跑 `npm run roundtrip`：`03/05/07` 必须仍「完全保真」；`04/02` 要么修到保真，要么在报告里明确「保存时被拦截并要求源码模式」，并提交更新后的 `docs/roundtrip-report.md`。
  7. `diff.test.ts` 加 `classify`/`activeLosses` 单测：引用式链接、表格仅空白变化、含 `&` 的 HTML、多行脚注、`\` 等价改写、末尾换行各一条正例；**反例**：用户删掉表格一行不报、用户改单元格值不报、用户删整段不报、代码围栏里的定义不报。
- **验收**
  - `npm run roundtrip`：03/05/07 仍完全保真；02/04 与本轮结论一致（修好或明确拦截）。
  - 表格文档：横幅含「表格分隔行会被重排」；**只改单元格值**时保存不弹（反例），仅改表格外段落时弹。
  - 含 `&` HTML / 自动链接 / 注释 / 多行脚注样本：横幅分类出现，保存确认可见；`\` 硬换行标「等价改写」且**不**触发拦截。
  - 末尾换行：`crlf`/`lf` 样本保存后仍以换行结尾。
  - `npm test` 全绿（文件数仍 16，`diff.test.ts` 内新增断言）。
- **门禁**：`npx tsc --noEmit; npm test; npm run roundtrip; npx vite build --outDir .tmp/build-a; node scripts/data-safety-acceptance.mjs`
- **风险与回退**：两段判定若把「用户编辑后仍存在的基线损失」误杀，会漏报；用 `classify(serialize(original), current)` 只看结构行，不看内容行。回退：`git checkout -- src/ docs/roundtrip-report.md`。
- **难度** M–L ｜ **量级** 280–380 行

## T4 NSIS `.md` 关联 opt-in + `ASSOC_DRYRUN`（U4/S1/S2/S4/H4）｜B 组（builder2，先做）

- **目标**：组件页 + 默认不勾的关联节；勾选只写 HKCU `Software\Classes`；`/S` 不写（用 dry-run 包证明）；卸载对称删除；加 `ASSOC_DRYRUN` 开关把注册表写入换成清单文件供测试断言。
- **为什么现在**：S2 实测 `.md` 无默认程序、`UserChoice` 受 Hash 保护与 UCPD 保护，只能承诺「打开方式候选」；S1 实测沙箱 HKCU 不可观测，没有 dry-run 无法验收；S4 实测组件页 + 10 条写入只增 2,656 B。
- **文件**：`packaging/installer.nsi`、`packaging/installer.ps1`、`packaging/verify-installer.ps1`
- **步骤**
  1. `installer.nsi`：`MUI_PAGE_DIRECTORY` 与 `MUI_PAGE_INSTFILES` 之间插 `MUI_PAGE_COMPONENTS`；新增 `Section /o "在「打开方式」中加入 Sidelight" SEC_ASSOC`，写 10 条（ProgID 默认值/`FriendlyTypeName`/`DefaultIcon`/`shell\open\command`、`.md\OpenWithProgids` 的 `Sidelight.md` 空值、`Applications\Sidelight.exe` 的 `ApplicationName`/`ApplicationCompany`/`ApplicationIcon`/`shell\open\command`/`SupportedTypes\.md`）；`MUI_FUNCTION_DESCRIPTION` 写「不改变 .md 的默认程序」。
  2. 卸载对称：`DeleteRegValue …OpenWithProgids Sidelight.md` → `DeleteRegKey /ifempty`（保留 `VSCode.md`）→ 删 ProgID 与 `Applications\Sidelight.exe`；不碰 `UserChoice`、`FileExts`、`.md` 默认值。
  3. `ASSOC_DRYRUN`：`!ifdef ASSOC_DRYRUN` 时把 10 条 `WriteRegStr` 换成 `FileWrite "$INSTDIR\assoc-plan.txt" "<键>|<值>"`（放在 `SetOutPath "$INSTDIR"` 之后）；**不引入 FORCE 包**，测试只用这个 dry-run 包。
  4. `installer.ps1` 加 `-AssocDryRun`：用 `/DASSOC_DRYRUN` 编 `.tmp\assoc-dryrun-setup.exe`（不写 `release/`），发布包仍走原参数、节 `/o` 默认不勾。
  5. `verify-installer.ps1` 加：dry-run 包 `/S` 安装后 `assoc-plan.txt` **不存在**（证明静默默认不装）；静态断言 `.nsi` 里有 10 条 `WriteRegStr HKCU "Software\Classes`、4 条 `DeleteReg`、无 `WriteRegStr HKLM`/`WriteRegDWORD HKLM`（**允许** WebView2 检查的 `ReadRegStr HKLM`）、无 `UserChoice`。
- **验收**
  1. `makensis` 编默认包、dry-run 包 exit 0；发布包 ≤850,000（预计 ≈797,500）。
  2. `verify-installer.ps1`：dry-run `/S` 无 `assoc-plan.txt`；`.nsi` 静态断言全过。
  3. 真实 HKCU「勾选后打开方式出现 / 卸载后消失 / `VSCode.md` 仍在」**标 UNVERIFIED**（沙箱写不进 HKCU）。
- **门禁**：`powershell -ExecutionPolicy Bypass -File packaging/installer.ps1 -AssocDryRun; powershell -ExecutionPolicy Bypass -File packaging/verify-installer.ps1`
- **风险与回退**：组件页让安装流程从两页变三页；`/S` 不装只由 `Section /o` 语义 + dry-run 间接证明；`Applications\Sidelight.exe` 是全局应用注册（便携版不写注册表，暂无冲突）。回退：`git checkout -- packaging/`。
- **难度** M ｜ **量级** 90–140 行

## T5 0.20.0 文档与产物重建（S3/S5/H5）｜B 组（builder2，T4 后，结论等 T3）

- **目标**：版本升 0.20.0；CHANGELOG/README/AGENTS 按 T1–T3 的**实际结果**改写（先留 `[T3 后确认]` 标记，根代理放行后替换）；新增 ADR-0007；字节与 SHA 单一来源；产物重建与体积实测。
- **为什么现在**：S3 指出 README「保存前把差异摆出来」对宿主文档不成立，本轮改完要换成可验证的说法；S5 列出字节/SHA 散在 5 处且已漂移 176 B。
- **文件**：`package.json`、`docs/CHANGELOG.md`、`README.md`、`AGENTS.md`、`docs/adr/0007-markdown-association.md`（新）、`packaging/README.md`、`packaging/README.txt`
- **步骤**
  1. `package.json` 只改 `"version": "0.20.0"`；`package-lock` 由根代理同步。
  2. `docs/CHANGELOG.md` 顶部加 `## 0.20.0 — 2026-11-15`：数据保真段先写 `[T3 后确认]`（修到保真 / 拒绝静默保存 + 源码模式原文，二选一，由根代理按 T3 结果替换）；`.md` 关联 opt-in（组件页、默认不勾、`/S` 不装、只写 HKCU、卸载 `/ifempty` 保留 `VSCode.md`、不碰 `UserChoice`）；ADR-0007；测试 [N] 文件 [M] 条；体积 `[TBD]`（安装包/zip + SHA256 只写这里）。
  3. README 按 findings-ship 的替换句改，数据保真三处先写 `[T3 后确认]` 占位并给出候选句；`:41` 改「默认不关联，安装时可勾选加入打开方式，不改默认程序」；`:40`/`:54`/`:65`/`:104`/`:118`/`:122`/`:124`/`:134` 按 S3/S5 清单改（字节改「见 CHANGELOG 0.20.0」、ADR 0001–0007）。**不能写**「保存不会改坏原文」「支持引用式链接/表格对齐」「保存前会把所有改动给你看」「关联 .md，双击打开」。
  4. `AGENTS.md` §6：0.20.0、功能清单加「数据保真拦截 + 源码模式原文」「`.md` 打开方式候选（opt-in）」；未验清单加「勾选关联后打开方式是否出现、卸载残留、真人交互安装、宿主写回真实场景」。
  5. `docs/adr/0007-markdown-association.md`：背景（UserChoice + Hash + UCPD 实证）、决定（只做打开方式候选、opt-in、只写 HKCU `Software\Classes`）、键表、`/S` 不装、卸载 `/ifempty`、否决方案（写 UserChoice、改 `.md` 默认值、默认勾选、便携版写注册表）、验收（dry-run + 真人三条 UNVERIFIED）。
  6. `packaging/README.md` 与 `README.txt`：安装步骤加组件页一步；卸载说明加「删除关联登记，不改你自己设的默认程序」；便携版仍不写注册表；体积预算按 `installer.ps1` 实测回填。
  7. 产物重建（根代理执行）：`npm run build` → `host/build.ps1` → `packaging/installer.ps1` → `packaging/portable.ps1`；字节与 SHA 只回填 CHANGELOG；预算 850,000（当前 794,843，关联 +2,656，前端按 23% 压缩率估 ≈800,000）。
- **验收**
  - `node -e "console.log(require('./package.json').version)"` = `0.20.0`；`Select-String docs/CHANGELOG.md -SimpleMatch '## 0.20.0 — 2026-11-15'` ≥1。
  - `Select-String README.md -SimpleMatch '保存不会改坏原文','支持引用式链接','保存前会把所有改动给你看','关联 .md，双击打开','794,843'` **0 命中**；`[T3 后确认]` 只在待替换的三处出现（根代理替换后应为 0）。
  - `Test-Path docs/adr/0007-markdown-association.md` = True；含「OpenWithProgids」「UserChoice」「/ifempty」「UNVERIFIED」。
  - `Select-String AGENTS.md -SimpleMatch '0.20.0'` ≥1；`npm test` 0 失败。
- **门禁**：上述命令 + `npm test`
- **风险与回退**：README/CHANGELOG 的数据保真句必须与 T3 实际结果一致（根代理在 A 组完成后放行替换）；`[TBD]`/`[T3 后确认]` 不得留在发布版；体积以 `installer.ps1` 实测为准。回退：`git checkout -- package.json docs/CHANGELOG.md README.md AGENTS.md packaging/README.md packaging/README.txt` 并删 ADR-0007。
- **难度** S–M ｜ **量级** 130–190 行

## 文件归属与并行（零重叠）

| 任务 | 组与顺序 | 独占文件 |
| :--- | :--- | :--- |
| T1 | A（builder，先做） | `src/App.tsx`、`src/styles.css`、`src/lib/diff.ts`、`src/lib/risk.ts`（最小版）、`scripts/data-safety-acceptance.mjs` |
| T2 | A（builder，T1 后） | `src/App.tsx`、`scripts/data-safety-acceptance.mjs`（扩用例） |
| T3 | A（builder，T2 后） | `src/lib/risk.ts`、`src/lib/diff.ts`、`src/lib/diff.test.ts`、`src/components/SaveDialog.tsx`、`src/App.tsx`、`src/lib/footnotes.ts`、`docs/roundtrip-report.md`、`scripts/data-safety-acceptance.mjs`（扩用例） |
| T4 | B（builder2，先做） | `packaging/installer.nsi`、`packaging/installer.ps1`、`packaging/verify-installer.ps1` |
| T5 | B（builder2，T4 后） | `package.json`、`docs/CHANGELOG.md`、`README.md`、`AGENTS.md`、`docs/adr/0007-markdown-association.md`、`packaging/README.md`、`packaging/README.txt` |

- 两组零重叠：A 只碰 `src/`、生成物 `docs/roundtrip-report.md` 与新验收脚本；B 只碰 `packaging/`、`package.json`、文档与 ADR。`SaveDialog.tsx` 归 T3（T1 只预留 `openSourceOriginal` 接口与 `pendingConfirm` 接线）；`package.json` 只归 T5；`npm test` 文件数仍 16。
- 跨组依赖：T5 的数据保真句等 T1–T3 结果（`[T3 后确认]`），由根代理放行；T4 与 A 无交集，可先行。最终 `npm run build`、装包、`npm install --package-lock-only` 由根代理串行做。
- 报告：A 组 `docs/iteration/round-07/impl-a.md`，B 组 `impl-b.md`，根代理合并 `impl.md`；截图 `shots/round-07/t*-*.png`。

## 本轮不做（写进下轮建议）

完整引用式链接保真重写（解析/序列化层支持，或像 frontmatter 那样摘出定义块原样拼回，属独立 ADR/轮次）；表格分隔行逐字节保真；`\` 硬换行的样式保真（只标等价改写）；KaTeX 惰性化；`App.tsx` 拆分；真实宿主进程与 HKCU 关联验证（沙箱限制）。

## 本轮 Demo（≤3 条用户可见变化）

1. 双击打开的 `.md` 首次保存会先给差异清单；只有「载入时就存在、保存后仍会损失」的写法才拦，正常编辑不再弹框，取消后一个字节都不写。
2. 源码模式显示文件原文（引用式链接定义都在），保存后切源码显示的是刚写入的内容，不会把旧原文写回。
3. 安装时多一个默认不勾的选项，把 Sidelight 加进 `.md` 的「打开方式」候选，不改默认程序；卸载删掉自己加的那项。

## 风险最高的任务

**T1**。四条保存路径（`saveFile`/`saveAsCopy`/`saveAndSwitch`/宿主写回）合并到同一入口，同时要改 `saveWarned` 的置位点与两处同名状态（`pendingConfirm` / `pendingHostSave`）：顺序错一处就是「取消却写了」「确认了没写」或「另存为绕过拦截」。缓解是脚本里「取消后写入次数 = 0 / 确认前消息数 = 0 / 另存为取消不调 `saveAsFile` / 保存并切换先弹确认」四条硬断言。次高是 T3：两段基线的判定若误杀或误报，前者漏掉真损失、后者让门变成噪音。

## 下一轮建议主题

**保真收口 + 宿主真机**：把引用式链接定义块做成「载入摘出、保存拼回」，表格尝试保留原始分隔行；真实宿主里跑四类样本与关联安装/卸载；再做 KaTeX 惰性 spike 与 CI windows 首跑。
