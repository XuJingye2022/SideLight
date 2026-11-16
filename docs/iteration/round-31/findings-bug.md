# 第 31 轮 · 缺陷猎人（端到端，只读）报告

- 环境：`http://localhost:5175`（未重启），headless Edge CDP **9222**；每个脚本前跑 `node .tmp/reset.mjs 9222`。只读产品代码，未改任何产品文件。
- 开工先核对模块新鲜度：`GET /src/App.tsx` 里文件树入口已是新版 `tooLargeNote`（`text: error instanceof Error && error.message.includes("文件太大") ? tooLargeNote(file.name) : …`），字数统计已是 `splitFrontmatter(sourceText).body`。第 30 轮记的「陈旧模块」在本轮**已消失**，结论对应当前磁盘代码。
- 脚本（本轮新建）：`.tmp/e2e-r31-a.mjs`（路径 1+3+6 + 字数明细/替换/导出/关闭文档探针）、`.tmp/e2e-r31-b.mjs`（路径 2+4+5）、`.tmp/e2e-r31-c.mjs`（删除撤销探针 + 路径 4/5）、`.tmp/e2e-r31-d.mjs`（P0 二次复现 + 源码选区计数 + 表格 Tab）。
- 假工作区：复用 `.tmp/r30-fsa.mjs`（`write()` 支持 ArrayBuffer）。
- 截图：`shots/round-31/p1-format.png`、`p1-saved.png`、`p1-reload.png`、`p3-keyboard.png`、`p2-undo.png`、`p2-restored.png`、`p2-undo-mismatch.png`、`p2-undo-mismatch2.png`、`p2-tree.png`、`p4-source.png`、`p4-saved.png`、`p5-dark.png`、`p5-narrow.png`、`p5-wide.png`、`p5-final.png`、`p6-stats.png`、`p6-closeguard.png`、`p6-probe.png`。
- 4 次运行控制台 **error 0、pageerror 0**（`## errors []`）。

---

## 1（P0，数据丢失）删除当前文档后点「撤销」：保存目标切到恢复的文件，下一次保存把另一篇的正文写进恢复的文件

**复现（2/2 次，两个不同文件）**

1. 打开假工作区，点开 `干净.md`（正文 A）。
2. 文件树选中 `干净.md`，按 `Delete` → 点「移到回收站」。应用自动打开下一篇 `普通.md`（正文 B），树选中 `普通.md`。
3. 点提示里的「撤销」。提示变「已恢复 干净.md」，**文件树把 `干净.md` 高亮为当前文档，但正文区仍是 `普通.md` 的内容**。
4. 不点文件树，直接在正文末尾输入并等自动保存（约 3 秒，或按 `Ctrl+S`）。

**证据（`.tmp/e2e-r31-c.mjs`，原文打印）**

```
## A undone (未点树) {"selected":["示例文集/干净.md"], "editor":"普通\n\n普通内容。", "notice":"已恢复 干净.md"}
## A typed+autosave {"selected":["示例文集/干净.md"], "editor":"普通\n\n普通内容。【输入标记】",
                      "status":"10 字 / 已自动保存 01:19", "notice":"已保存 干净.md"}
## A 干净.md bytes "# 普通\n\n普通内容。【输入标记】\n"
## A 普通.md bytes "# 普通\n\n普通内容。\n"
```

第二次（`.tmp/e2e-r31-d.mjs`，文件换成 `甲.md`/`乙.md`）：

```
## D undone {"selected":["示例文集/甲.md"], "editor":"乙\n\n乙的正文。", "notice":"已恢复 甲.md"}
## D typed  {"selected":["示例文集/甲.md"], "editor":"乙\n\n乙的正文。【第二次标记】", "notice":"已保存 甲.md"}
## D 甲.md  "# 乙\n\n乙的正文。【第二次标记】\n"
## D 乙.md  "# 乙\n\n乙的正文。\n"
```

截图 `shots/round-31/p2-undo-mismatch.png`：标题栏写 `干净.md`、树高亮 `干净.md`、正文却是「普通 / 普通内容。【输入标记】」、提示「已保存 干净.md」。

**期望 vs 实际**：撤销删除后应回到删除前的状态。实际是「恢复的文件」被挂上保存目标，正文区还是另一篇；**下一次保存把另一篇的正文整篇写进恢复的文件，原内容（正文 A）被覆盖，磁盘上再也找不到**。用户看到标题与树都指向恢复的文件，没有机会察觉写错了对象。

**根因**

1. `src/App.tsx:2356-2369`：撤销按钮的 `onClick` 闭包调用的是**删除那一刻捕获的** `refreshTree`；该实例的闭包里 `activeFile` 还是被删的 `干净.md`（`refreshTree` 依赖 `[activeFile, show]`，见 `src/App.tsx:2204`）。
2. `src/App.tsx:2172-2183`：`refreshTree` 拿到 `targetPath=干净.md`，找到恢复后的 `rebound` 就执行 `setActiveFile(rebound)` 且 `saveTargetRef.current = rebound.handle`——**只换身份，不换正文**。正文区仍是第 2 步自动打开的 `普通.md`。
3. `src/App.tsx:2336-2347` 的删除分支本来会 `loadIntoEditor(...)` 重新载入，但撤销分支没有对应的载入/回滚逻辑。

**修复建议**

1. 撤销分支不要复用陈旧 `refreshTree`：显式传 `refreshTree({ activePath: null })`（不接管保存目标），或在恢复后只刷新树、不 `setActiveFile`/`saveTargetRef`。
2. 更稳的守卫：`refreshTree` 里 `rebound` 与 `fileRef.current?.path` 不一致时，**不要**改 `activeFile` 与 `saveTargetRef`；要接的话必须先 `loadIntoEditor(await readNode(rebound))`。
3. 若恢复的正是被删的当前文档，恢复后应把正文切回该文件（第 2 步已经把它换走了，用户预期看到的是恢复的那篇）。
4. 补 e2e：打开 A → 删除 A（自动开 B）→ 撤销 → 已恢复文件字节不变（当前会被覆盖）→ 直接输入并保存 → 断言 B 的字节不变、A 的字节等于删除前。

---

## 2（P2，计数）源码模式选中文本后，字数明细的「选区」仍显示「未选中文本」

**复现**

1. 点开 `丙.md`，按 `Ctrl+/` 进源码模式。
2. 在源码文本框里 `Ctrl+A` 全选（`textarea.selectionStart/End` 覆盖全文）。
3. 点状态栏字数。

**证据（`.tmp/e2e-r31-d.mjs`）**

```
## D source-selection-stats {"textareaSelected":"# 丙\n\n丙的正文。\n", "stats":"5 字 · 阅读约 1 分钟",
   "panel":{"rows":["字","字符","词","句","段","阅读","选区"],
            "values":["5","7","5","2","2","1 分钟","未选中文本"]}}
```

**根因**：`src/App.tsx:3787-3796` 的 `openStatsDetail` 只用 `editor.state.selection`（富文本编辑器选区）。源码模式的选区在 `<textarea>` 上，ProseMirror 选区是旧的/折叠的，于是永远显示「未选中文本」。同一个函数里已经按 `sourceMode` 分了正文来源（`splitFrontmatter(sourceText).body`），选区没有一起分。

**期望 vs 实际**：选中的文本应显示「N 字 / M 字符 / K 句」。实际源码模式选不选都一样，面板这一行等于失效。

**修复建议**：`sourceMode` 时读源码文本框的 `selectionStart/selectionEnd` 并 `sourceText.slice(...)`；或在源码模式下把「选区」行改为「源码视图不计选区」以免误导。

---

## 3（P2，展示）字数明细里「字」与「词」永远是同一个数：两行冗余、容易误读

**证据**（两次运行）

| 正文 | 字 | 字符 | 词 |
| --- | --- | --- | --- |
| `中文正文 abc` / `第二段结束。`（`p6-stats.png`） | 10 | 13 | 10 |
| 源码 `# 丙\n\n丙的正文。\n`（源码选区探针） | 5 | 7 | 5 |

**根因**：`src/components/StatsDetail.tsx:70-74` 里 `const total = stats.cjk + stats.words`，然后「字」`number(total)`、「词」`number(total)` —— 两行是同一个表达式。`词` 的 tooltip 写「中日韩字 + 拉丁词」，等于承认它就是总数。

**期望 vs 实际**：「字数明细」应能区分汉字数与词数（中文写作者最想看的两个数）。实际两行恒等，一行为纯冗余；用户会以为「词」算出来的东西和「字」不同，但永远一样。

**修复建议**：`字` 用 `stats.cjk`（或 `cjk + words` 并在行内写清口径），`词` 用 `stats.words`（中日韩按字 + 拉丁按词），两行互为补充；或直接删掉一行并保留 tooltip 口径说明。

---

## 4（P2，可访问性）字数明细面板打开后焦点不进入面板，键盘/读屏用户无法读到内容

**证据**

- `.tmp/e2e-r31-a.mjs`：点 `.stats-trigger` 后面板出现、`aria-expanded="true"`，但 `activeIsTrigger: true`——焦点还在触发按钮上；`Esc` 关闭后焦点被送回触发按钮（`src/App.tsx:3436-3437`）。
- 面板 `src/components/StatsDetail.tsx:81-88`：`role="dialog"`，没有 `tabIndex`，面板里也没有任何可聚焦元素，打开时没有聚焦动作。
- 面板只在 `Esc` 或点外面时关闭，键盘用户打开后无法用 Tab 进入面板内容，读屏也不会自动朗读一个从未获得焦点的非模态对话框。

**修复建议**：打开时把焦点移到面板容器（`panelRef.current?.focus()` + `tabIndex={-1}`），关闭时还给触发按钮；或把面板改成 `role="status"`/`aria-live` 的一段可读文本，配合 `aria-controls`。

---

## 六条路径实测结果

| 路径 | 结果 | 证据 |
| --- | --- | --- |
| 1 空文档 → 加粗/标题/列表/引用/代码块 → 保存 → 刷新恢复 | **通过**。`<h2>二级标题</h2>`、`<strong>正文加粗字</strong>`、`<ul><li>`、`<blockquote>`、`<pre><code>` 均正确；无句柄 `Ctrl+S` 走 `showSaveFilePicker` stub 落 `另存为.md`，磁盘字节 = `## 二级标题\n\n**正文加粗字**\n\n- 列表甲\n- 列表乙\n\n> 引用一行\n\n```\nconst a = 1\n```\n\n`；`reload` 后正文完整恢复 | `.tmp/e2e-r31-a.mjs`；`p1-format.png`、`p1-saved.png`、`p1-reload.png` |
| 2 文件树新建/重命名/删除/展开/刷新/撤销 | **通过（撤销内容已修）**。新建 `未命名.md` 可保存（字节 `新文件内容。`）；同目录撞名被拒「已有同名文件，没有覆盖它。」且文件未丢；正常改名后树与 `active` 同步；`sub` 展开/刷新正常，当前文档随动；**第 30 轮 P0（撤销恢复 0 字节）已修复**：干净文件撤销恢复 `# 干净\n\n干净的正文。\n`，脏文件撤销恢复 `# 脏的\n\n原文。未保存的补充。\n`，回收站条目 `# 干净\n\n干净的正文。\n` 正确。**唯一缺陷是本报告第 1 条：删当前文档后撤销的保存目标错位** | `.tmp/e2e-r31-b.mjs`、`.tmp/e2e-r31-c.mjs`；`p2-tree.png`、`p2-undo.png`、`p2-restored.png` |
| 3 键盘 | **通过**。`Ctrl+K`→`link-editor`（placeholder `https://`）；`Ctrl+M`→公式输入（placeholder「输入 LaTeX，例如 x^2」）；`Ctrl+P`→「按文件名或路径过滤」；`Ctrl+1–6/0`→H1…H6/P；`Ctrl+F`→`1 / 3`，Enter→`2 / 3`，Esc 关闭；插入表格后 `Tab` 跳到下一格（`一格`/`二格` 分处两格，`focusedInTable:true`），`Ctrl+Enter` 3→4 行，`Ctrl+L` 4→3 行；`Ctrl+Z` 4→3；焦点环 `2px solid rgb(43,109,100)` | `.tmp/e2e-r31-a.mjs`、`.tmp/e2e-r31-d.mjs`；`p3-keyboard.png` |
| 4 公式/表格/脚注/frontmatter/行内 HTML/callout 编辑 → 源码 → 保存往返 | **通过**。源码框与磁盘**逐字节相同**（215 B，`equal:true`）；保存后 frontmatter、`$$` 公式、`[^1]` 脚注、`[!note]` callout、`<kbd>` 全部保留；补的句子只出现在末尾 | `.tmp/e2e-r31-c.mjs`；`p4-source.png`、`p4-saved.png` |
| 5 源码/预览/专注/打字机/设置/字号/窄窗 | **通过**。专注/打字机状态 chip 正确；预览只有一个 `.ProseMirror`、`contenteditable=false`，Esc 回编辑；深色 `data-theme=dark`、`bg rgb(21,23,26)`，刷新后保持；字号 17→18px；1024×700 与 1440×900 均 `scrollWidth === innerWidth` | `.tmp/e2e-r31-b.mjs`、`.tmp/e2e-r31-c.mjs`；`p5-*.png` |
| 6 控制台 0 error / 错误路径 | **通过**。4 次运行 error 0；无句柄保存、撞名改名、脏文档关闭文档都有可见中文提示（关闭文档弹「取消 / 不保存 / 保存并切换」，文案里写的是「切到「未命名.md」之前」） | 各脚本 `## errors []`；`p6-closeguard.png` |

补充：导出菜单四项（`HTML / Markdown / 纯文本 / 打印 / PDF`）实测第一项产出 `另存为.html` 并提示「已导出 另存为.html」；查找替换 `甲甲 甲乙 甲` → 全部替换 `乙乙 乙乙 乙`，计数 `1 / 4` → 「无结果」。

---

## 去重说明（本轮不计入 actionable）

- **第 30 轮第 1 条（删除干净文件后撤销恢复 0 字节）已修并复验**：本轮干净/非当前/脏三种删除撤销都恢复出完整原文；不再重复计。
- **第 30 轮第 2 条只修了一半**：源码模式已剥 frontmatter（`src/App.tsx:4775` 用 `splitFrontmatter(sourceText).body`），但 Markdown 标记仍算进「字」。同一篇富文本样本：编辑视图 `37 字`、源码视图 `55 字`（`## stats-source-vs-edit`）。属于旧条目，不重复计。
- **第 29 轮第 2 条（改名提示「已刷新：新增 1 个，消失 1 个」）本轮仍复现**，未修，已属旧条目。
- 第 21/22 轮 D5 草稿新旧不分、第 17 轮 B1/B3/B5 保存竞态：本轮未复现（删除前 `waitForCommit`、自动保存 2 秒防抖正常）。

## UNVERIFIED（本轮测不了）

1. **真实目录句柄**：假句柄没有权限模型；第 1 条在假 FSA 上 2/2 复现，真实 Chrome/宿主走同一代码路径，但建议在真实文件夹再手测一次「删除当前文档 → 撤销 → 输入 → 保存」。
2. **只读 / 文件占用 / 网络盘保存失败**：假句柄无法让 `createWritable` 抛 `NotAllowedError`。
3. **中文输入法、宿主（WebView2）、macOS、屏幕阅读器实录**：不在本轮环境；第 4 条的可访问性结论来自代码与焦点实测，未做读屏实录。
4. **撤销后刷新页面**：假句柄不能存进 IndexedDB，刷新后文件树为空，无法验证「撤销后再刷新是否恢复」。
