# 第 07 轮 · 体验与界面发现

- Finder：r7-ux（只读侦察，未改 `src/`）
- 环境：Windows 11，应用 `http://localhost:5173`，CDP `http://127.0.0.1:9223`（headless Edge 157）
- 方法：CDP + Playwright 打开真实应用；用替身 `showOpenFilePicker` 装入固定样本，用替身 `createWritable` 抓保存的**实际字节**；截图落 `shots/round-07/`。宿主未运行（`127.0.0.1:47821` 连不上），宿主写回路径只做代码核对，已标 UNVERIFIED。
- 样本：引用式链接（`[Tiptap][tiptap]` + 文末 `[tiptap]:`）、带 `:--- / ---: / :---:` 对齐的表格。

## 结论摘要

| 编号 | 问题 | 影响 | 难度 |
| :--- | :--- | :--- | :--- |
| U1 | 「改用源码模式」展示的不是原文，是已经丢失定义的序列化结果 | 致命：按横幅指引操作仍会丢数据 | M |
| U2 | 宿主写回（双击 `.md` 的主路径）完全不经过保存差异确认 | 高：桌面版首次保存静默改写 | M |
| U3 | 保存差异只有「取消 / 仍然保存」，一次之后不再提示，新文档也弹、不区分谁改的 | 中高：用户被训练成无脑确认 | S（空基线/文案）/ L（逐条） |
| U4 | `.md`「打开方式」复选框文案与卸载说明（候选文案见下） | 中：写注册表的新选项，措辞决定信任 | S（文案）/ M（安装器+验收） |
| U5 | 表格工具条不显示也不能改对齐；增删列会悄悄改分隔行 | 中：格式变化不可见 | S（提示）/ M（对齐 UI） |

---

## U1（致命）源码模式不是逃生门：它展示的是编辑器整理后的文本

**现象**

打开含引用式链接的 `.md`，横幅出现。点横幅上的「改用源码模式」后，源码框里已经是：

```
# 引用式链接

参考 [Tiptap](https://tiptap.dev) 与 [CodeMirror](https://codemirror.net)，还有 [行内链接](https://tauri.app)。
```

文末 `[tiptap]: https://tiptap.dev`、`[cm]: https://codemirror.net` 两行**不在**源码框里。此时按 `Ctrl+S`，写入文件的就是这段文本，原文件的两行定义永久消失。实测：保存出的 1 条 `createWritable` 记录与上面完全一致，`saved == ORIGINAL` 为 false。

也就是说，横幅告诉用户「保存会改写」，给出的逃生动作是「改用源码模式」，但这个动作本身已经把改写结果端上来了。用户越照做，越会确认一个已经丢数据的版本。

**证据**

- 截图：`shots/round-07/ux-01-risk-banner.png`（横幅）、`ux-03-source-mode.png`（源码框里没有定义行）
- 选择器：`.risk-banner`（1440×900 下 `x=344 y=84 w=960 h=41`）、`.source-editor`
- 代码：`src/App.tsx:2036` —— 进入源码时 `const text = viewMode === 'source' ? sourceText : currentMarkdown()`；`currentMarkdown()` 在 `1595-1600` 调用 `editor.getMarkdown()`，不是文件原文
- 载入时已经解析：宿主 `src/App.tsx:671`，普通文件 `src/App.tsx:1341`；原始文本只存进 `originalText`（`680`、`1334`），源码模式没用它
- 工具栏标题仍写着「显示原始 Markdown」：`src/App.tsx:2635`
- 横幅文案：`src/App.tsx:2773`（「这篇用到 引用式链接，编辑器读不全，保存会改写。」）

**具体改法**

1. 载入时保留原文：新增 `rawTextRef`，在 `applyHostPayload`（`680` 旁）和 `loadIntoEditor`（`1334` 旁）写入 `data.text` / `text`。
2. `switchView('source')` 优先用原文：文档没脏（`!dirty`）且 `rawTextRef.current !== null` 时，`setSourceText(rawTextRef.current)`；脏时仍用 `currentMarkdown()`，但在源码框上方显示一句「源码里是你的改动 + 编辑器整理结果，不是文件原文」。
3. 更强的方案（推荐）：载入时若 `findRiskySyntax` 命中，直接进源码视图，并让横幅在源码视图也显示（现在 `src/App.tsx:2771` 只在 `viewMode === 'edit'` 渲染）：「这篇用到引用式链接。已用源码模式打开，保存不会改写；切到编辑视图会把链接改成行内格式。」这样用户第一眼看到的就是真实文件。
4. 文案改成可验证的：「这篇有引用式链接。编辑视图保存时会把 `[文字][id]` 改成 `[文字](url)`，并删掉文末的 `[id]: url` 行。」按钮「在源码模式打开原文」；「知道了」保留。
5. 源码视图里补一个明确的「回到编辑」按钮（当前只能再点一次「源码」，标题还是「显示原始 Markdown」）。

**难度** M（第 1+2 步约半天；第 3 步要改初始视图与草稿恢复，需另测）。

**验收** 打开 `fixtures/markdown/04-reference-links.md` → 点横幅按钮 → `.source-editor` 的值逐字等于文件原文（含两行定义）→ `Ctrl+S` → 写出的字节等于原文。

---

## U2（高）宿主写回不经过保存差异确认

**现象**

浏览器路径（打开文件后首次保存）会弹「保存后文件会有这些差异」，见 `ux-02-save-diff-ref.png`。但桌面版双击 `.md` 走的是宿主 `postMessage` 写回：`saveFile` 在 `src/App.tsx:1611-1624` 命中 `hostDoc.ready` 后直接 `sendHostSave(text)` 并 `return`，下面的差异检查（`1632-1640`）永远到不了。同时宿主载入时已经 `setSaveWarned(true)`（`src/App.tsx:688`），即使顺序对也会跳过。结果：发布形态的主力路径上，引用式链接的首次保存**没有任何差异清单**，只有一条可被「知道了」永久关掉的横幅。

用户编辑一个字 → `dirty=true` → 整篇序列化 → 写回。引用式链接定义被删，表格补空行，用户看不到改了哪几行。

**证据**

- 代码：`src/App.tsx:1611-1624`（宿主分支先 return）、`1632-1640`（差异门在此之后）、`688`（宿主载入即 `setSaveWarned(true)`）、`1554`（提交保存又置 true）
- 截图对照：浏览器路径有对话框 `ux-02-save-diff-ref.png`；宿主路径未运行，**UNVERIFIED**（`http://127.0.0.1:47821` 拒绝连接）
- 旁证：缺陷 finder 用模拟 `/__doc` 响应也复现了同一条路径（`findings-bug.md` B1：改字后 `Ctrl+S` 直接发 `postMessage`，无对话框）
- 横幅只给一句结论：`src/App.tsx:2773`

**具体改法**

1. 把差异门提到宿主分支之前：算出 `text` 后，若 `originalText !== null && !saveWarned && originalText !== text` 且差异含风险类别（引用式链接定义、表格分隔行等，用 U3 的分类），弹同一个 `SaveDialog`；确认才 `sendHostSave(text)`，取消保留 dirty。
2. `pendingSave` 从 `string` 扩成 `{ text, target: 'host' | 'file' }`，`onConfirm` 分流；`SaveDialog` 增加第三个按钮「在源码模式打开原文」。
3. 宿主写回失败的重试状态机（`pendingIdsRef`、`sentTextRef`）不要和这次确认混在一起：确认发生在入队之前。

**难度** M。风险点：宿主保存是异步状态机，`commitSave` 的 `saveWarned` 语义要分路径，避免「取消后第二次保存不再提示」。

**验收** 宿主打开 `04-reference-links.md` → 改一个字 → `Ctrl+S` → 出现差异清单且列出被删的两行定义 → 取消后文件 mtime 不变 → 再保存仍提示。

---

## U3（中高）保存差异只能整体接受，且只提示一次、不区分改动来源

**现象**

- 对话框只有「取消 / 仍然保存」（`src/components/SaveDialog.tsx:54-61`），没有逐条接受/放弃，也没有「在源码模式打开」。
- 只列非空行、最多 60 行（`SaveDialog.tsx:20-22`），空行变化只给计数（`49-52`）。表格样本显示「另有 2 行空行调整未列出」，而那 2 行正是表格前后多出来的空行——用户最该看到的排版变化被折叠了。
- 文案说「这里既有你自己的改动，也有编辑器把 Markdown 规范化的结果」（`SaveDialog.tsx:36-38`），但不标哪行是谁改的。用户无法只拒绝规范化。
- 提示一次后 `saveWarned=true`（`src/App.tsx:1554`、`1729`），同一文档后续保存不再出现；导出也不经过这个对话框。
- **新建文档第一次保存也弹这个框**：`loadIntoEditor('')` 把 `originalText` 设成空串（`src/App.tsx:1334`），不是 `null`，于是 `1633` 的条件成立，整篇新文字都显示成 `+`，还配一句「这里既有你自己的改动，也有编辑器把 Markdown 规范化的结果」——实际 100% 是用户刚打的字。实测截图 `ux-12-newdoc-save-dialog.png`，两段新文字显示「共 5 行变化 / 另有 3 行空行调整未列出」。这会把用户训练成不看内容直接点「仍然保存」，等真正遇到引用式链接时就失效了。
- 表头样本的对话框把旧表与新表各列一遍（`ux-07-save-diff-table.png`），10 行变化里 8 行是补空格/补空行，真正有语义的只有对齐标记；信息密度低，容易让用户直接点「仍然保存」。

**证据**

- 截图：`shots/round-07/ux-02-save-diff-ref.png`、`ux-07-save-diff-table.png`、`ux-12-newdoc-save-dialog.png`
- 选择器：`.save-dialog`、`.diff-view`、`.diff-line.diff-added/.diff-removed`
- 代码：`src/App.tsx:1634` 已过滤成 changed；`SaveDialog.tsx:20-22` 又过滤一次并截断

**具体改法**

1. 最少改动：在「取消 / 仍然保存」之间加「在源码模式打开原文」，并把标题改成「保存会改写 N 行，其中 M 行不是你的改动」。
2. **先修空基线**：`loadIntoEditor`（`src/App.tsx:1334`）与 `hostUnavailable`（`731`）把 `originalText` 设为 `null` 而不是 `''`；只有真的打开了一个已有文件才 `setOriginalText(text)`。新建文档第一次保存不再弹框，警告才重新有信息量。
3. 给差异加分类：删除行命中 `^\[[^\]]+\]:\s*\S+` → 标「引用式链接定义会被删除」；命中 `^\|.*\|$` → 标「表格格式会被规范化」。分类用 `findRiskySyntax` 的同一张表，别在组件里另写正则。
4. 空行变化单独一条可展开项；表格样本至少让用户看到「表格前后空行 +2」，而不是只给数字。
5. 逐条接受：不建议按行做，序列化是整篇重写，接受一行无法落地。可选折中：按类别接受（「保留我的改动、拒绝格式规范化」= 取消并转源码）。
6. 重新武装条件：当文档里新出现风险语法，或 `baseline` 与当前序列化差异包含风险类别时，再提示一次；不要只靠首次。

**难度** S（第 1-2 步 + 文案），M（第 3-4 步），L（逐条）。

---

## U4（中）`.md`「打开方式」复选框文案与卸载说明

这一项是设计建议，安装器当前没有这个选项（`packaging/installer.nsi:52-104` 只有主 Section；`packaging/README.md:55` 仍写「不做 .md 文件关联：本轮不做」）。

**用户能否理解**

只写「关联 .md」或「接管 .md」不行：中文用户会把「关联」理解成「双击就改成它」。复选框必须同时说清三件事：加到哪里、不改什么、卸载怎样。建议放在 **组件页**（`MUI_PAGE_COMPONENTS`，默认不勾选），不要放在完成页——这是写注册表的动作，值得单独一屏。

**候选文案（三选一）**

1. 复选框：`把 Sidelight 加入 .md 的「打开方式」列表（不设为默认）`
   说明行：`右键 .md →「打开方式」里会多出 Sidelight。双击 .md 仍由当前默认程序打开。卸载时删除这一项。`
2. 复选框：`在 .md 的「打开方式」中显示 Sidelight（不改变默认程序）`
   说明行：`安装后你可以右键 .md 选 Sidelight。系统默认程序不变。卸载后列表里不再显示。`
3. 复选框：`将 Sidelight 列为 .md 的可选打开程序（不设为默认）`
   说明行：`只增加一个可选项，不改变双击行为。只写当前用户，不需要管理员。卸载自动移除。`

不用「关联」「接管」「写入注册表」「设为默认」；「打开方式」加引号，与 Windows 菜单字面一致；不要承诺「双击即开」。

**卸载后会发生什么**

- 安装器写入（仅勾选时、仅 HKCU）：`HKCU\Software\Classes\Sidelight.md`（ProgID，含 `DefaultIcon` 与 `shell\open\command`）、`HKCU\Software\Classes\.md\OpenWithProgids` 下名为 `Sidelight.md` 的值；如需让「选择其他应用」也列出，再加 `HKCU\Software\Classes\Applications\Sidelight.exe`（`SupportedTypes` 含 `.md`）。
- 卸载删除上述三处；只删自己写的值，**不删** `.md` 键、不删其他 `OpenWithProgids` 值、不改 `UserChoice`。
- 安装器从未改默认程序，所以卸载不需要恢复默认。若用户后来自己在 Windows 设置里把 Sidelight 设为 `.md` 默认，卸载后 `UserChoice` 指向已删除的 ProgID，下次双击 `.md` 时 Windows 会让用户重新选择——这一点要在真机复验，不要写进对外承诺。
- `/S` 静默安装不写关联（沿用 memo），除非显式加参数；`verify-installer.ps1` 增加「勾选 → 三项存在 → 卸载 → 三项消失、`.md` 其他值仍在」的断言。
- Windows 11 的「打开方式」列表有缓存，装完不一定立刻出现；文案不写「立即」，验收时以「选择其他应用」对话框为准。

**难度** S（文案），M（NSIS Section + 卸载 + 验收）。

---

## U5（中）表格工具条不显示对齐，增删列会改分隔行

**现象**

- 表格工具条只有「上插入 / 下插入 / 左插入 / 右插入 / 删行 / 删列 / 删表」（`src/App.tsx:2666-2690`），没有对齐按钮，也没有当前对齐的显示。
- 打开带对齐的表格，首次保存差异里出现 `|:-----|-----:|:----:|` → `| :--- | ----: | :----: |`：对齐标记保住了，但空格被重排、表格前后多出空行（实测保存文本：标题后 3 个换行，表后 3 个换行）。
- 点「右插入」新增一列，分隔行自动补 `---`（默认左对齐），新列表头为空；视觉上就是一个空白列，没有任何提示。
- 删掉第一列后，原来的左对齐列 `:---` 变成 `---`（语义仍是左对齐，但格式变了）。中/右对齐的列保留 `:`。
- 这些编辑之后的保存**没有差异确认**，因为首次保存已把 `saveWarned` 置 true；实测 `Ctrl+S` 直接写盘，只有一条「已保存 table.md」提示。

**证据**

- 截图：`ux-06-table-no-banner.png`（无风险横幅）、`ux-07-save-diff-table.png`（首次差异）、`ux-08-table-toolbar.png`、`ux-09-table-after-add.png`（空白新列 + 已保存提示）、`ux-10-table-source.png`
- 选择器：`.table-bar`、`.ProseMirror table`
- 代码：`src/App.tsx:2666-2690`（无 align 控件）、`src/App.tsx:1554`（首次保存后不再提示）
- `@tiptap/extension-table` 的 `TableCell`/`TableHeader` 已有 `align` 属性，`setCellAttribute('align', …)` 可用（`node_modules/@tiptap/extension-table/dist/index.js:126,169,731`），所以补 UI 不需要换内核。

**具体改法**

1. 工具条加「左 / 中 / 右」三个按钮，作用于当前列（先 `selectColumn`，再 `setCellAttribute('align', …)`），当前列的对齐显示为按下态。
2. 「左插入 / 右插入」复制相邻列的对齐值；没有相邻值才用默认左对齐。
3. 删除列后重新写分隔行时保留原列的 `:` 标记（当前是把 `:---` 归一成 `---`）。
4. 若本轮不做 UI：至少在工具条旁加一句「对齐在源码里改；新列默认左对齐」，并在首次保存差异里把表格行标成「表格格式规范化」，满足「用户需要知道」。
5. 修完 U2 后，表格编辑也会重新走差异确认；若只做 U5 的提示，则必须在表格结构变化（增删行列）后重新武装一次确认。

**难度** S（提示/文案），M（对齐按钮 + 插入复制 + 分隔行保留）。

---

## 代码优化机会（最多 3 条）

1. **风险语法只有一条正则、一个返回类型**：`findRiskySyntax`（`src/App.tsx:139-143`）只认引用式链接，返回 `string[]`。表格、行内 HTML、callout 都不经过它。建议改成 `RiskKind[]`（`{kind, label, lineHint}`）并让横幅、保存差异分类、未来的自动源码模式共用这一张表；顺便给 `.risk-banner` 加 `role="status"`/`aria-live="polite"`（现在它是唯一没有 role 的横幅，`2771-2781`）。
2. **两条保存路径各写一份归一化**：`saveFile`（`1607-1643`）与 `saveAsCopy`（`1651-1674`）都做 `currentMarkdown → replace(/\r\n/g,'\n') → EOL`，宿主分支还绕开差异门。抽 `prepareSave(): { normalized, withEol }` 与 `needsDiffConfirm(text)`，两处共用；U2 的根因就是这条重复。
3. **SaveDialog 在渲染里做数据整形**：`App.tsx:1634` 已经过滤 changed，`SaveDialog.tsx:20-22` 又 `filter` 一遍、截断 60 行、算 blank。把「分组 / 截断 / 空行计数 / 分类」移到 `src/lib/diff.ts` 的纯函数并加测试，组件只负责画；现在这部分没有任何测试覆盖，也解释不了「2 行空行调整」到底是哪两行。

## 未验证

- 宿主写回（U2）未在运行中的宿主里复现：`http://127.0.0.1:47821` 拒绝连接。结论来自 `src/App.tsx` 的分支顺序与 `setSaveWarned` 赋值，已在文中标行号。
- Windows 11 真机的「打开方式」注册表效果、列表缓存、卸载后 `UserChoice` 残留：本沙箱 HKCU 写入不可观测（`packaging/README.md:48`），只能按 Microsoft 文档与现有 memo 推断，需要真机复验。
- 中文输入法、系统保存对话框未在本轮测试范围。
