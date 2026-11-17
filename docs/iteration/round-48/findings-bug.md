# 第 48 轮 · 缺陷猎人报告（finder-bug）

- 轮次：round 48　　轮前 startSha：`5673b1dee5623cc72fe87b37d563c1d7444224ff`（实测 `git rev-parse HEAD` 同值，`git status --porcelain` 只有本轮新增的 `docs/iteration/round-48/` 与 `shots/round-48/`）
- 环境：dev server `http://localhost:5175` 已在跑（未起、未重启）；CDP 9222（未启动 Edge、未 kill msedge）；每个脚本前 `node .tmp/reset.mjs 9222`；假 FSA 工作区用 `.tmp/r30-fsa.mjs`。只读产品代码，未改一行；未 push，未动 `release/`。
- 结论：**2 条本轮新发现可执行（P1 × 1、P2 × 1）**；8 条路径全部真跑；本角色 10 套脚本 `CONSOLE_ERRORS` 全空（`errors: []`）。另复核第 47 轮 F1 仍在（不计入本轮 actionable）。
- 截图：`shots/round-48/` 里本角色 26 张（关键 3 张在文末引用）。

---

## F1（P1）表格单元格里按 `Ctrl+Shift+L`：剪掉当前行，**同时**折叠侧栏 —— 一键两个动作，行内容被误删

**复现步骤**（脚本 `.tmp/e2e-r48-bug-a.mjs` 的 `## a1-table-ctrl-shift-l`，日志 `.tmp/r48-a.log`）

1. 打开假工作区，点 `表.md`（种子是 3 行 3 列表格：表头 `甲/乙/丙`、`一/二/三`、`四/五/六`）。
2. 把光标点进第 2 行第 2 格（`二`）。此时读状态：`{"dirty":false,"table":{"rowCount":3},"sidebar":{"collapsed":false}}`。
3. 按一次 `Ctrl+Shift+L`。**快捷键一览里这一条是「侧栏开关」**（`src/components/ShortcutsDialog.tsx:29` 另一行才写「表格内 Ctrl+Enter / Ctrl+L」= 加行 / 删行）。
4. 读状态：表格只剩 `[["甲","乙","丙"],["四","五","六"]]`（`rowCount:2`，整行 `一 二 三` 没了）、`sidebar.collapsed:true`、`dirty:true`。截图 `shots/round-48/bug-a-ctrl-shift-l.png`。
5. `Ctrl+Z` 能把行撤回（`rowCount:3`、`dirty:false`），但侧栏不会自动展开；`Ctrl+S` 后盘上字节与种子相同（说明只在这一步没丢字节，误删是瞬时的）。

**期望 vs 实际**
- 期望：`Ctrl+Shift+L` 只折叠/展开侧栏，正文一个字节都不变；表格里删行只由 `Ctrl+L` 或工具条「删行」触发。
- 实际：光标在表格里时一次按键同时删行 + 折叠侧栏。删掉的行只有立刻 `Ctrl+Z` 才能找回；如果用户接着打了字，撤销链会把这次删除压到更深处。

**根因**（`src/App.tsx`）
- 编辑器层的表格快捷键没有检查 `Shift`：`src/App.tsx:836-839` 是 `if (inTable && mod && event.key.toLowerCase() === 'l') { preventDefault(); deleteRow(); }`。按 `Ctrl+Shift+L` 时 `event.key` 是 `'L'`，`toLowerCase()` 仍是 `'l'`，于是命中。
- 同一个按键还会冒泡到 window：`src/App.tsx:3785-3788` 的 `if (mod && event.shiftKey && !event.altKey && key === 'l') setTreeCollapsed(...)` 也执行。`preventDefault()` 只挡浏览器默认动作，不阻止传播；window 监听器（`src/App.tsx:3592-3812`）也没有 `event.defaultPrevented` 守卫。
- 对照：`Ctrl+L` 单独按时只删行（`.tmp/r48-a.log` 的 `## a2-table-ctrl-l`：`rowCount` 3→2、`sidebar.collapsed` 不变），说明缺陷只在带 `Shift` 的变体上。

**修复建议**
1. 最小改动：`src/App.tsx:836` 的表格删行分支补 `&& !event.shiftKey && !event.altKey`（与 `Ctrl+L` 文档一致）。
2. 加固（防同类双动作）：window 监听器开头加 `if (event.defaultPrevented) return`（`Escape` 分支之前），或让编辑器层对表格快捷键 `event.stopPropagation()`。
3. 加一条 E2E 断言：表格单元格里按 `Ctrl+Shift+L` 后 `rowCount` 不变、`dirty:false`、侧栏 `collapsed` 翻转一次；再补 `Ctrl+L` 仍删行。

**影响面**：真实路径 3（键盘）与 4（表格编辑）都会经过。`Ctrl+Shift+L` 是产品文档里宣传的侧栏快捷键，用户在表格里按它想收侧栏，结果丢一行。可撤销，判 P1 而不是 P0。

---

## F2（P2）表格单元格里按 `Ctrl+1–6` 会造出标题：保存把 `## 一` 写进单元格，重开后标题消失、显示字面 `## 一`

**复现步骤**（脚本 `.tmp/e2e-r48-bug-h.mjs` 的 `## h1-cell-heading`，日志 `.tmp/r48-h.log`；首测见 `.tmp/r48-c.log` 的 `## c5-table-heading`）

1. 打开假工作区，点 `嵌套.md`（`# 嵌套` + 2×2 表格，第 2 行是 `一 / 二`）。
2. 光标点进 `一` 这一格，按 `Ctrl+2`。
3. 编辑视图里这一格变成真标题：`cellHtml:"<h2>一</h2>"`、`headingInCell:1`。截图 `shots/round-48/bug-h-cell-heading-editor.png`。
4. `Ctrl+S`。盘上字节：

   ```
   # 嵌套

   | 甲    | 乙   |
   | ---- | --- |
   | ## 一 | 二   |
   ```

   `afterSave` 是 `{"dirty":false,"toast":"已保存 嵌套.md"}`，**没有**「保存前确认」拦截（`risk.classify` 没把这条算成损失）。
5. 用保存字节重新播种并重开 `嵌套.md`：表格里标题没了，第 3 格是字面 `## 一`（`headingsInCell:0`、`cells:["甲","乙","## 一","二"]`）。截图 `shots/round-48/bug-h-cell-heading-reopened.png`。

**期望 vs 实际**
- 期望：要么表格单元格不接受块级标题（`Ctrl+1–6` 在单元格里不生效，给一句提示），要么存盘能表达它（单元格里保留标题语义，重开一致）。
- 实际：编辑视图造出 `<h2>` → 存盘写成 `## 一` → 重开变成普通文本。同一篇文档保存前后结构不一致；用户会以为标题丢了。若再对那格按一次 `Ctrl+2`，会叠成 `## ## 一` 之类更难读的字节（未实测叠加，只记录当前三态不一致）。

**根因**（`src/App.tsx`）
- 标题快捷键是全局的：`src/App.tsx:3756-3759` 只判 `mod && !altKey && !shiftKey && /^[1-6]$/`，没有排除「选区在表格单元格里」；同理 `Ctrl+0`（`:3762-3766`）与 `Ctrl+I` 等 mark 类不受限（mark 在单元格里可表达，标题不行）。
- Markdown 表格单元格只能装行内内容，序列化把单元格里的标题拍平成 `## ` 前缀；读回时单元格按纯文本处理，于是 `##` 变字面。
- 第 34 轮加的「保存前确认」只拦丢字节/丢结构的已知类别（脚注定义等），不拦这种「结构在编辑态有、markdown 表达不了」的类别。

**修复建议**
1. 在 `src/App.tsx:3756` 的标题分支与 `:3762` 的段落分支加「选区在表格内就不执行」判断（可以复用 `handleKeyDown` 里的 `inTable` 探测，抽成 `isSelectionInTable(state)`），并 `show('表格单元格里不能放标题')` 之类的提示。
2. 若产品负责人想保留「单元格里也能加粗/斜体」这条（mark 在单元格里能往返），只拦块级命令（heading / 段落 / 引用 / 列表）。
3. 单测 + E2E：单元格里 `Ctrl+2` 后 `headingInCell:0`、存盘字节不含 `## 一`；正对照 `Ctrl+B` 在单元格里仍出 `<strong>`。
4. 已实测的负结果：只有表头的表格往返逐字节相同（`## h2-header-only`：`same:true`），单元格里打 `- ` 不会建列表（`.tmp/r48-c.log` 的 `cell2.lists:0`），所以问题只出在块级快捷键上。

---

## 复核与去重（不计入本轮 actionable）

1. **第 47 轮 F1「源码改字保存后回编辑假脏」仍在**（`.tmp/r48-i.log` 的 `## i1-r47f1-recheck`）：源码里 `Ctrl+End` 打「加一句。」→ `Ctrl+S`（`dirty:false`，盘上 `"# 甲\n\n甲的第一段。\n加一句。\n"`）→ `Ctrl+/` 回编辑，`{"mode":"edit","dirty":true}`；再按一次 `Ctrl+S` 字节不变（`changedOnSecondSave:false`）。这是本轮 planner 的已知首选任务，不重复计数。
2. **重命名成功后弹「已刷新：新增 1 个，消失 1 个」**（`.tmp/r48-g.log` 的 `## g1-tree`：`renamed.toast`）。第 29–34 轮已列，不重复。
3. **编辑视图看不到 frontmatter**（`.tmp/r48-d.log` 的 `## d1-frontmatter-open`：`bodyText:"设置页\n\n正文。"`，frontmatter 只在源码框里 `len:44`）。第 47 轮 typora F4 与本轮 typora F4 已列。
4. **表格里 `Tab` 会选中目标格的全部内容，随后打字即覆盖**——实测 `.tmp/r48-f.log` 的 `## f1-tab-header`（`selAfterTab.text:"一"`、`offsets 0→1`、打字后 `一` → `X`）。查第三方源码：`prosemirror-tables@1.8.5` 的 `goToNextCell` 就是 `TextSelection.between($cell, moveCellForward($cell))`（`node_modules/prosemirror-tables/dist/index.js`），与 Excel/Typora 同语义，**不是本产品缺陷**，下一轮不要重复报。
5. **`Ctrl+Shift+L` 误删行的另一面**：删行后 `Ctrl+Z` 只恢复表格，侧栏保持折叠（`.tmp/r48-a.log` 的 `undone.sidebar.collapsed:true`）。这是 F1 的后果，不另计。
6. `docs/iteration/round-47/findings-bug.md` 里的旧脚本坑仍有效：文件树批量操作前要确认侧栏在「文件」页签、没有「切换文档」弹层，否则 `page.click` 会以“元素不可见”超时（本轮 b3–b7 与 f3/f4 的首跑都是这个原因，不是产品缺陷）。

---

## 8 条路径的覆盖与判定

| # | 路径 | 结论 | 证据 |
| --- | --- | --- | --- |
| 1 | 空文档输入 → 标题/正文 → 保存（picker stub）→ 刷新恢复 | 通过 | `.tmp/r48-g.log` `## g0-save-reopen`：编辑态 `h1:1`、文本 `第一章\|正文一句。`；`Ctrl+S` 后 `{"name":"另存为.md","dirty":false,"toast":"已保存 另存为.md"}`，盘上 `"# 第一章\n\n正文一句。\n\n"`；用该字节重新播种并重开：`h1:1`、`text:"第一章\|正文一句。\|"`、`dirty:false`、`title:"另存为.md — Sidelight"`。截图 `bug-g-saved.png`、`bug-g-reopened.png` |
| 2 | 文件树右键重命名 / 删除确认 / 撤销 | 重命名通过；删除只到确认框（脚本没点到「移到回收站」按钮） | `.tmp/r48-g.log` `## g1-tree`：右键菜单 `["重命名","删除（移到回收站）"]`；重命名输入框 `tree-rename-input` 预填 `甲.md`，回车后 `{"name":"甲改.md","tree":["…/甲改.md","…/另存为.md"]}`、旧键 `oldDisk:null`、新文件字节仍是 `"# 甲\n\n甲的第一段。\n"`；删除确认 `{"label":"删除文件","text":"删除「甲改.md」？这篇还有未保存的正文……撤销会一起搬回","buttons":["取消","移到回收站"]}`。截图 `bug-g-tree-menu.png`、`bug-g-renamed.png`、`bug-g-delete-confirm.png` |
| 3 | 键盘：`Ctrl+K`/`M`/`P`/`1–6`/`0`/`/`/`Shift+L`/`Ctrl+L`/`Ctrl+Enter`/`Ctrl+H`+`Esc`/`Ctrl+=`/`Ctrl+Z` | 发现 F1、F2；其余通过 | F1 见上（`## a1-table-ctrl-shift-l`）；`## a2-table-ctrl-l` 删行正确；`.tmp/r48-i.log` `## i2-table-ctrl-enter` 加行后 `rows:[["甲","乙"],["一","二"],["",""]]` 且 `Shift+Tab` 回到第 2 行；`.tmp/r48-b.log` `## b1-replace-undo` `Ctrl+H` 打开查找条（7 个按钮、`1 / 4`）且 `Esc` 后回正文；`.tmp/r48-d.log` `## d1-frontmatter-open` `Ctrl+/` 进出源码（`textarea len:44`）；`.tmp/r48-e.log` `## e2-views` `Ctrl+=` 17→18 px；`Ctrl+Z` 在 a1/a3 生效，替换撤销见 `## b1-replace-undo` |
| 4 | 表格 / 脚注 / frontmatter / 链接：编辑 → 源码 → 保存往返 | **F2 一条往返不一致**；脚注与链接正常 | F2 见上；脚注：`.tmp/r48-d.log` `## d3-footnote-gate` 删掉定义行后 `Ctrl+S` 弹「保存前确认」+「脚注 [^note] 的定义在保存后会消失（正文还在引用它）」+「取消 / 仍然保存」，`diskSameAsSeed:true`；链接：`.tmp/r48-c.log` `## c1-link-href` 地址框改成 `https://example.org/b` 后 `anchors:[{t:"示例站点",h:"https://example.org/b"}]`，清空地址再回车后 `anchors:0`，盘上 `"# 链接\n\n去看 示例站点 的说明。\n"`；frontmatter 只在源码可编辑（见去重 3）。截图 `bug-d-footnote-gate.png`、`bug-c-link-href.png` |
| 5 | 字号 / 主题 / 专注 / 打字机 / 1024×700 无溢出 | 通过 | `.tmp/r48-e.log` `## e2-views`：字号 `17px → 18px`；选深色后 `data-theme:"dark"`、`body bg rgb(21, 23, 26)`；点「专注」后 `.app` 类含 `focus-mode`；1024×700 `docScroll cw=sw=806`、`pageOverflow:0`、`overflowButtons:0`。截图 `bug-e-narrow.png` |
| 6 | 控制台 0 error；错误路径（脚注门 / 源码脏切文档） | 通过 | 本角色 10 套脚本（`r48-a/b/b2/c/d/e/f/g/h/i.log`）的 `## z-errors` 全 `{"errors":[]}`；`.tmp/r48-b2.log` `## b7-src-switch` 源码里改了字直接点另一篇 → 弹「切换文档」三选一 `["取消","不保存","保存并切换"]`，`Esc` 后 `seedIntact:true`（盘上仍是种子）；脚注门见路径 4。截图 `bug-b-src-switch.png` |
| 7 | 大文档 110 KB（1,001 段）载入 / 滚动 / 逐键 / 保存 | 通过 | `.tmp/r48-e.log` `## e3-big`：`size:110023 B`；`sl-parse-done - sl-load-start = 83 ms`（`sl-*-n:5`，取每个 name 最后一条）；滚到底 `1 ms`（`scrollHeight 83,663`、`top 82,875`）；12 次逐键 p50 **19 ms** / max **30 ms**；`Ctrl+S` 后 `diskLen:38023`、尾 `字字字字字字字字字字字\n`、`dirty:false`。截图 `bug-e-big.png` |
| 8 | 自动保存 / 重开恢复 / 切换文档 | 通过 | `.tmp/r48-d.log` `## d2-autosave`：有句柄时打字后 **2,116 ms** 落盘 `"# 自动\n\n原始一行。新增一句。\n"`、`toast:"已保存 自动.md"`、`dirty:false`；重开见路径 1；源码脏切换见路径 6。最近文件 / 宿主草稿需要真宿主，本轮 UNVERIFIED |

**表格操作专项（路径 3/4 的补充）**：`.tmp/r48-a.log` `## a3-table-bar` 用工具条依次点「删行 / 删行 / 删列 / 删表」，行 3→2→1、列 3→2、`table:false`，四次 `Ctrl+Z` 后回到 3×3 原表；`.tmp/r48-f.log` `## f2-tab-last` 在最后一格按 `Tab` 自动加一行（`["",""]`）并落光标；`.tmp/r48-h.log` `## h2-header-only` 只有表头的表格保存后与种子逐字节相同。

---

## 特意验证、没有问题的点（防下轮重复）

- `Ctrl+L` 在表格里只删当前行，不动侧栏（`## a2-table-ctrl-l`）。
- 表格工具条七个按钮功能都对：上插入 / 下插入 / 左插入 / 右插入 / 删行 / 删列 / 删表，删表后 `table:false` 且能整串撤销（`## a3-table-bar`）。
- 全部替换后 `Ctrl+Z` 精确还原（`## b1-replace-undo`：`replaced.text:"替换\|梨 梨 梨\|第二段 梨。"` → `undone.text` 与 `beforeText` 相同，`restored:true`、`dirty:false`）。
- 大纲点击跳转有效：`scrollTop 0 → 4207`（`## b2-outline-jump`），列表项是 `button.outline-item`、激活项 `is-active`。
- 链接地址就地编辑与移除链接都写对了字节（`## c1-link-href`）。
- 脚注定义丢失拦截仍有效且不写盘（`## d3-footnote-gate`）。
- 源码模式有脏改动时切文档会拦（`## b7-src-switch`）。
- 只有表头的表格往返逐字节相同（`## h2-header-only`）；单元格里打 `- ` 不会建列表（`.tmp/r48-c.log` `cell2.lists:0`）。
- 重命名后旧文件名读回 `null`、新文件字节不变（`## g1-tree`）。
- 110 KB 文档逐键 p50 19 ms，没有卡顿。
- 10 套脚本控制台 0 error、0 pageerror。

---

## UNVERIFIED（写清哪条、为什么、怎么补）

1. **1 MB 文档**：本轮只跑 110 KB（时间预算）。补法：`.tmp/make-bigfile.mjs` 生成后按第 47 轮 `## f1-big100k` 的 `performance.mark` 口径（每个 name 取最后一条），dev 下单遍 parse 约 110 s，需要单独留时间。
2. **真实宿主 / WebView2 / 真机 IME / 最近文件 / 草稿恢复**：浏览器态只有假 FSA，没测。
3. **删除 → 回收站 → 撤销**：本轮只到确认框（按钮文案是「移到回收站」，我的脚本点的是「删除」，没点中）。补法：`.tmp/e2e-r48-bug-g.mjs` 把 `confirmDel` 选择器改成 `[role="dialog"] button:has-text("移到回收站")`。上轮（round 47 路径 2）有完整实测。
4. **F1 的按键组合边界**：`Ctrl+Alt+L`、`Ctrl+Shift+L` 在源码/预视图里是否也会双动作，本轮只在编辑视图测过 `Ctrl+Shift+L`。补法：预览里按同一组合，确认 `rowCount` 与 `sidebar.collapsed` 都不变。
5. **F2 的叠加路径**：对已经是 `## 一` 的单元格再按一次 `Ctrl+2`，以及把单元格标题连同表格一起复制到别处，未实测。
6. **真实键盘布局 / 输入法**：`Ctrl+Shift+L` 与中文输入法候选键是否冲突未测。
7. 界面视觉（对比度、字号阶梯、表格工具条位置）由本轮 ui 角色覆盖，本报告不重复。

---

## 本轮脚本（可重跑，均带 `node .tmp/reset.mjs 9222` 前置）

| 脚本 | 覆盖 | 日志 |
| --- | --- | --- |
| `.tmp/e2e-r48-bug-a.mjs` | **F1 证据** + 表格 `Ctrl+L` 对照 + 工具条删行/列/表 | `.tmp/r48-a.log` |
| `.tmp/e2e-r48-bug-b.mjs` | 全部替换 + 撤销、大纲跳转（首跑，部分被侧栏页签挡住） | `.tmp/r48-b.log` |
| `.tmp/e2e-r48-bug-b2.mjs` | 链接 / 脚注 / frontmatter / 自动保存 / 源码脏切换（脚注选区写错、frontmatter 被污染，作废） | `.tmp/r48-b2.log` |
| `.tmp/e2e-r48-bug-c.mjs` | 链接地址编辑与移除、表格里套标题（F2 首测） | `.tmp/r48-c.log` |
| `.tmp/e2e-r48-bug-d.mjs` | 隔离探针：frontmatter 打开视图、自动保存、脚注门 | `.tmp/r48-d.log` |
| `.tmp/e2e-r48-bug-e.mjs` | 8 条路径覆盖（路径 5/6/7 有效，1/2 因假 FS 刷新重置作废） | `.tmp/r48-e.log` |
| `.tmp/e2e-r48-bug-f.mjs` | 表格 `Tab` 选择语义、最后一格 `Tab` 加行 | `.tmp/r48-f.log` |
| `.tmp/e2e-r48-bug-g.mjs` | 路径 1 保存重开、路径 2 重命名/删除确认 | `.tmp/r48-g.log` |
| `.tmp/e2e-r48-bug-h.mjs` | **F2 证据**：单元格标题保存 + 重开；只有表头表格往返 | `.tmp/r48-h.log` |
| `.tmp/e2e-r48-bug-i.mjs` | 第 47 轮 F1 复核（仍在）、表格 `Ctrl+Enter` + `Shift+Tab` | `.tmp/r48-i.log` |

关键截图：`shots/round-48/bug-a-ctrl-shift-l.png`（F1：行被删 + 侧栏折叠）、`shots/round-48/bug-h-cell-heading-editor.png`（F2：单元格里出现 `<h2>`）、`shots/round-48/bug-h-cell-heading-reopened.png`（F2：重开后变字面 `## 一`）、`shots/round-48/bug-e-big.png`（110 KB）、`shots/round-48/bug-g-renamed.png`（重命名）、`shots/round-48/bug-b-outline.png`（大纲跳转）。
