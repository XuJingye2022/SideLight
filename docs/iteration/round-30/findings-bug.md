# 第 30 轮 · 缺陷猎人（端到端，只读）报告

- 环境：`http://localhost:5175`（dev server 未重启），headless Edge CDP **9222**；每次 E2E 前跑 `node .tmp/reset.mjs 9222`。
- 方法：Playwright 接 CDP，注入带写入能力的假 FSA 工作区 `.tmp/r30-fsa.mjs`（`.tmp/r29-fsa.mjs` 的副本，`write()` 增加 `ArrayBuffer`/TypedArray 分支，否则 SHA 校验路径在假文件系统里必然失败）。只读产品代码，未改任何产品文件。
- 脚本（本轮新建）：`.tmp/e2e-r30-p1k.mjs`（路径 1+3）、`.tmp/e2e-r30-p1b.mjs`（引用/有序列表/代码块输入规则）、`.tmp/e2e-r30-p2v.mjs`（路径 2+5）、`.tmp/e2e-r30-p4o.mjs`（路径 4+探针）、`.tmp/e2e-r30-verify.mjs`（P0 复现/加粗/大纲/大文件）、`.tmp/e2e-r30-srcsave.mjs`（源码保存）、`.tmp/e2e-r30-dirtynew.mjs` / `.tmp/e2e-r30-instantnew.mjs`（切换文档守卫）、`.tmp/e2e-r30-bigfile2.mjs`（陈旧模块定位）。
- 截图：`shots/round-30/p1-source.png`、`p1-saved.png`、`p1-reload.png`、`p1-rules.png`、`p2-tree.png`、`p2-dirty-new.png`、`p3-keyboard.png`、`p4-source.png`、`p4-saved.png`、`p4-source-save.png`、`p5-dark.png`、`p5-preview.png`、`p5-narrow.png`、`p5-wide.png`、`p6-bigfile.png`。
- 6 条路径全部真跑；9 次运行控制台 **error 0**（含 pageerror）。

---

## 1（P0，数据丢失）删除干净文件后点「撤销」：恢复出 0 字节文件，且回收站里的完整副本被一并删掉

**复现（2/2 次，两个不同文件、两种先后顺序）**

1. 打开假工作区（`干净.md` = `# 干净\n\n干净的正文。\n`），点开 `干净.md`（不输入任何字，文档是干净的）。
2. 在文件树里选中 `干净.md`，按 `Delete` → 确认框点「移到回收站」。
3. 点提示里的「撤销」。

**证据**（`.tmp/e2e-r30-verify.mjs`，原文打印）

```
## after delete clean {"trash":[".sidelight/trash/20261117-002511-6h3m4p-干净.md",
                              ".sidelight/trash/20261117-002511-6h3m4p-干净.md.current.md"],
  "trashBackup":"# 干净\n\n干净的正文。\n",   ← 真实备份内容正确
  "trashCurrent":"",                          ← .current.md 是 0 字节
  "notice":"已移到回收站：干净.md"}

## after undo clean {"restored":"", "trash":[], "notice":"已恢复 干净.md",
  "tree":"▸ | assets | ▸ | sub | 干净.md | ⋯ | 普通.md | ⋯ | 脏的.md | ⋯"}

## open restored clean {"editor":"\n", "status":"0 字"}
```

撤销成功后：根目录 `干净.md` 变成空文件；`.sidelight/trash/` 里两个条目都被删除（`trash: []`）。**真实备份与「当前正文」副本同时消失，用户没有任何恢复途径。**

对照（脏文件）：同样删除后撤销，正文正确恢复——`"restored":"# 脏的\n\n原文。未保存的补充。\n"`。所以只有「删除时文档是干净的」这一条会触发。

**根因（四处缺守卫）**

1. `src/App.tsx:2321`：`const currentText = wasActive && dirtyRef.current ? currentMarkdown() : null` —— 干净文件传 `null`，非活动文件也传 `null`。
2. `src/lib/trash.ts:305`：`deleteFileWithText(root, node, currentText ?? '')` 把 `null` 变成空字符串。
3. `src/lib/trash.ts:177-184`：无条件写 `.current.md`（`writer.write(current)`），空串写入后 `readBack === ''` 校验通过（`'' !== ''` 为假），于是产生 0 字节的 `.current.md`。
4. `src/lib/trash.ts:346-352`：恢复时**优先**取 `${trashName}.current.md`（空），而不是真实备份 `${trashName}`。
5. `src/lib/trash.ts:321-330`：恢复成功（`restored.ok`）后无条件 `removeEntry` 掉 `.current.md` 与 `trashName`，真实备份就此删除。

**期望 vs 实际**：撤销删除应恢复删除前的文件内容（README / 第 21 轮「删除可撤销」的承诺）。实际恢复成空文件并毁掉回收站副本。

**修复建议**

1. 只在 `currentText` 非空（且与磁盘内容确实不同）时写 `.current.md`；`deleteFileWithText` 里加 `if (current)`。
2. `restoreFromTrash` 改为默认用 `${trashName}`（完整备份）；仅当 `.current.md` 存在且**非空**时才用它，或先恢复备份再叠加 `.current.md`。
3. 恢复后删除备份前，先读回目标文件、SHA 与 `byteLength` 校验且**非空**；校验失败不要删备份。
4. 补 e2e：干净文件删除 → 撤销 → 断言根文件字节等于删除前字节。

---

## 2（P2，计数不一致）状态栏字数在「编辑 / 源码」间跳变：frontmatter 与 Markdown 标记被算成正文

**复现**

1. 在源码模式写入：`---\ntitle: sample\n---\n\n中文正文 abc https://example.com/x\n\n😀😀 结束\n`。
2. 源码模式下读状态栏，再按 `Ctrl+/` 回编辑模式读状态栏。

**证据**（`.tmp/e2e-r30-p4o.mjs`）

```
## wordcount-probe {"sourceMode":"13 字 · 阅读约 1 分钟 … 源码",
                    "editMode":"11 字 · 阅读约 1 分钟 … 元数据",
                    "editText":"中文正文 abc https://example.com/x\n\n😀😀 结束"}
```

同一篇正文，切一次源码视图字数 11 → 13。多出的 2 个词来自 frontmatter 的 `title:` 与 `sample`（`countText` 按纯文本切拉丁词）。另外 `😀😀` 两个字符不计入任何一项（`countCjk` 不含表情，`chars` 也不显示）。

**根因**

- `src/App.tsx:4746`：`stats={sourceMode ? countText(sourceText) : stats}` —— 源码模式直接把原始 Markdown（含 frontmatter、`#`、`[]()` 等）交给 `countText`。
- `src/lib/wordcount.ts:47-57`：`countCjk` / `countWords` 按纯文本设计，没有剥离 frontmatter 和 Markdown 标记。

**期望 vs 实际**：状态栏「字」应描述正文，切换视图不该改变同一篇的字数。实际会跳，且离开源码模式必然跳回，用户会怀疑字数坏了。

**修复建议**：源码模式复用编辑模式的 `stats`（编辑模式已经从 `doc.textContent` 统计），或先剥掉 frontmatter 再用 `countText`；表情建议并入 `chars` 或单独说明不计。

---

## 六条路径实测结果（通过项）

| 路径 | 结果 | 证据 |
| --- | --- | --- |
| 1 空文档 → 加粗/标题/列表/引用/代码块 → 保存 → 刷新恢复 | **通过**。`# 标题一`、`- 列表甲`、`> 引用一行`、`1. 第一条`、```` ``` ```` 代码块均正确序列化；无句柄 `Ctrl+S` 走 `showSaveFilePicker` stub 落 `另存为.md`，磁盘字节 = 源码框内容；`reload` 后正文恢复（`sidelight.doc.v1`），控制台 0 error | `.tmp/e2e-r30-p1k.mjs`、`p1b.mjs`；`p1-saved.png`、`p1-reload.png` |
| 2 文件树新建/重命名/删除/展开/刷新、当前文档随动 | **通过**（含撞名拒绝「已有同名文件，没有覆盖它。」、`未命名.md` 新建+保存、`sub/丙` 展开、刷新后 `active` 不变、删除确认框「取消 / 移到回收站」）。**唯一缺陷是本报告第 1 条的撤销路径** | `.tmp/e2e-r30-p2v.mjs`、`verify.mjs`；`p2-tree.png` |
| 3 键盘 | **通过**。`Ctrl+K`→`link-editor-input` 聚焦；`Ctrl+M`→`math-inline-input`；`Ctrl+P`→`quick-open-input`；`Ctrl+1–6/0`→`H1…H6/P`（干净段落上逐个实测）；`Ctrl+F` 空查询不再显示「无结果」（第 29 轮第 4 条已修），输入后 `1 / 2`；`Esc` 关闭；`Ctrl+/` 往返；`Ctrl+= / - / Alt+0` 字号 17→18→17→17；`Ctrl+Shift+1/3/L` 切页签/折叠侧栏；表格 `Tab` 跳格、`Ctrl+Enter` 加行（3→4）、`Ctrl+L` 删行（4→3）；焦点环 `solid 2px rgb(43,109,100)`（按钮与正文都可 | `.tmp/e2e-r30-p1k.mjs`；`p3-keyboard.png` |
| 4 富文本 → 源码 → 保存往返 | **通过**。frontmatter、行内 HTML `<kbd>`、callout、行内/块级公式、表格、脚注全部保真；源码框与磁盘**逐字节相同**（`equal:true`，215 B）；补一句后保存，磁盘只有补入的差异且无风险弹框；源码模式直接改再 `Ctrl+S`，磁盘字节 = 源码框（`.tmp/e2e-r30-srcsave.mjs`） | `p4-source.png`、`p4-saved.png`、`p4-source-save.png` |
| 5 源码/预览/专注/打字机/设置/字号/主题/窄窗 | **通过**。预览只有一个 `.ProseMirror`（`contenteditable=false`），`Esc` 回编辑；深色 `data-theme=dark`、`bg rgb(21,23,26)`，刷新后保持；1024×700 与 1440×900 `scrollWidth === innerWidth`，批注栏在窄窗出现 | `.tmp/e2e-r30-p2v.mjs`；`p5-*.png` |
| 6 控制台 0 error / 错误路径 | **通过**。9 次运行 error 0、pageerror 0；无句柄保存、撞名改名、超大文件被拒都是可见中文提示 | 各脚本 `## errors []` |

补充核对（不是缺陷）：脏文档时树内「＋新建文件」与 `Ctrl+Alt+N` 都会弹「这篇还有没保存的改动（取消 / 不保存 / 保存并切换）」，选「不保存」后磁盘保留原内容——没有静默丢字（`p2-dirty-new.png`）。

---

## 已核对、不是缺陷的项（避免下一轮重复查）

- **选区加粗**：`Shift+Home` 选「加粗这行」后**等 500 ms** 再按 `Ctrl+B` 得到 `<p><strong>加粗这行</strong></p>`；鼠标选中后点工具栏「粗体」得到 `双击**选词**`。即：必须给 ProseMirror 同步 DOM 选区的时间，否则按键会落到旧的折叠选区。上一轮若报「Ctrl+B 不加粗」，先查脚本时序。
- **大纲折叠**：折叠 `.outline-toggle` 后行集合从「一 | 一甲 | 一乙 | 二」变「一 | 二」；光标在被折叠子树里打字后仍保持折叠（`afterTyping:"▸ | 一 | 二"`），当前节高亮挪到最外层被折叠的祖先（`activeAfter:"一"`）——与 `src/lib/outlineTree.ts` 注释一致，不存在「打字把折叠展开」。
- **删除脏文件后撤销**：正文正确恢复（含未保存补充），所以第 1 条只限「干净文件」。
- **删除失败文案**「回收站副本校验失败，已保留原文件。」只出现在假文件系统不认 `ArrayBuffer` 时，`.tmp/r30-fsa.mjs` 补上分支后不再出现；不是产品缺陷。
- **改名成功提示**仍是「已刷新：新增 1 个，消失 1 个」——第 29 轮第 2 条，本轮不重复计。
- **源码模式保存**：磁盘字节 = 源码框（`# 源码\n\n改过的内容。\n\n- 新列表\n`），回到编辑视图后正确解析为 H1/段落/列表。
- **预览/深色/窄窗/焦点环/表格 Tab**：见上表，均通过。

## 去重说明（本轮不计入 actionable）

- 第 29 轮第 2 条（改名提示「已刷新：新增 1 个，消失 1 个」）本轮复现，仍未修，但已属旧条目，不重复计。
- 第 29 轮第 5 条（超大文件打开后编辑区仍是上一篇）：本轮从文件树再次复现「提示 + 正文留在上一篇 + 树选中项仍是上一篇」，但**提示文案**受陈旧模块影响（见下节），真实源码行为无法在本环境判定，不重复计。
- 第 21/22 轮 `D5` 草稿新旧不分、第 17 轮 B1/B3/B5 保存竞态：未重复。

## 环境异常（重要，影响 T1 验收口径）

**dev server 提供的 `/src/App.tsx` 转换产物与磁盘不一致**：

- 磁盘 `src/App.tsx:2126-2137` 的 `openWorkspaceFile` 已用 `tooLargeNote(file.name)`（「超过 5.5 MiB，仍在「…」」）；
- 但 `Invoke-WebRequest http://localhost:5175/src/App.tsx` 取到的模块里，`openWorkspaceFile` 的 catch 仍是旧的 `text: messageOf(error)`；同一模块里 `tooLargeNote` 定义与 `openSingleFile` 用法已是新版。
- 运行时实测文件树打开 6 MiB 文件，提示是 `workspace.ts:250` 的原文「文件太大，暂不支持（上限 5.5 MiB）。」，不是新版文案（`.tmp/e2e-r30-verify.mjs` 的 `## bigfile`；`p6-bigfile.png`），且树选中项与正文都留在上一篇 `普通.md`。

结论：这是 AGENTS §8 记录的「陈旧模块」现象，**不是**磁盘代码的问题。按纪律本轮未重启 dev server，所以 T1 大文件文案在文件树入口的效果记为 UNVERIFIED，下一轮重启 dev server 后再判。

## UNVERIFIED（本轮测不了，写清原因）

1. **真实目录句柄的删除/撤销**：假句柄没有权限模型；第 1 条的字节结果在假 FSA 上确定复现，但真实 Chrome/宿主目录下 `.current.md` 与恢复顺序相同（代码同一路径），建议在真实文件夹至少手测一次。
2. **只读 / 文件占用 / 网络盘保存失败**：假句柄无法让 `createWritable` 抛 `NotAllowedError`。
3. **中文输入法、宿主（WebView2）、macOS**：不在本轮环境。
4. **超大文件提示（文件树入口）**：见上节陈旧模块，需重启 dev server 后复验。
