# 第 38 轮 · 缺陷猎人（端到端，只读）报告

- 轮次：round=38，轮前 `startSha=bb52c6a23045042c18a08748547ef796f2e4890f`（`docs: round-37 看板记录提交哈希`），收工时 `git rev-parse HEAD` 仍是 `bb52c6a`。
- 环境：dev server `http://localhost:5175`（未另起、未重启，`/src/main.tsx` 返回 200）；CDP 9222（未启动 Edge、未 kill msedge）；每段 E2E 前 `node .tmp/reset.mjs 9222`。
- 只读：`git status --porcelain` 只有未跟踪的 `docs/iteration/round-38/` 与 `shots/round-38/`，产品代码 0 改动。
- 本报告新增可执行条目：**2 条（均 P2）**。六条主路径本轮全部真跑，未发现新的 P0/P1（见路径表）。两条新缺陷分别在第 37 轮刚上线的「表格列宽拖拽」与第 33 轮上线的「智能标点」边界上。

## 结论摘要

1. **列宽拖拽只是视图态**：拖完后 `Ctrl+Z` 撤不到它（撤掉的是上一次文字输入），切一次源码/预览再回来列宽立即回到均分。README 只承诺「重开按内容重新均分」，没说「切视图也复位」。
2. **正文里手打 GFM 表格分隔行会被智能标点改坏**：`| --- | --- |` 变成 `| —- | —- |`，表格永远不成立，文件里留下的就是坏写法。单独打 `---` 出分隔线（HR）是正常的，问题只出在「一行里有其它字符」时。

---

## 1（P2，视图态与撤销栈不一致）表格列宽拖拽：`Ctrl+Z` 撤不到列宽，切一次源码/预览就恢复均分

**复现步骤**

1. 打开一篇含表格的文档（`表.md`：3 列表头 `甲/乙/丙`）。
2. 鼠标移到第一列表头右边界，等 `.column-resize-handle` 竖线出现，按住往右拖 80 px，松开。
3. 观察列宽：`[192,192,192]` → `[270,148,148]`，第一列 `<col>` 变成 `min-width: 25px; width: 270px;`。
4. 按 `Ctrl+Z`（用户预期：撤掉刚才的列宽改动）。连按 4 次，列宽始终 `[270,148,148]`。
5. 换一段复测：先在单元格外的段落里打两个字母（dirty 变 true），再拖一次列宽，再 `Ctrl+Z`：第 1 次没变化，第 2 次把刚打的字撤掉（`dirty` false）——**撤销栈里的上一步是文字，不是列宽**。
6. 再复测：拖完列宽后按 `Ctrl+/` 进源码，再按 `Ctrl+/` 回富文本，列宽 `[365,200]` → `[288,288]`，`<col>` 上的 `width` 消失。

**证据**

- `.tmp/e2e-r38-bug2.log` → `## resize-dragged`：`{"handleSeen":true,"widths":[270,148,148],"cellAttrs":[null,null,null],"cols":["min-width: 25px; width: 270px;","min-width: 25px;","min-width: 25px;"]}`——单元格没有 `data-colwidth`，宽度只落在 `<col>` 上。
- 同日志 `## resize-undo-seq`：4 次 `Ctrl+Z` 的 `widths` 全是 `[270,148,148]`；第 2 次 `dirty` 从 `true` 变 `false`（撤掉的是打字）。
- `.tmp/e2e-r38-bug3.log` → `## resize-viewswitch`：`before [288,288]` → `afterDrag [365,200]`（`col` 有 `width: 365px`）→ `afterSwitch [288,288]`（`col` 回到只有 `min-width`）。
- 截图：`shots/round-38/probe-resize-undo.png`、`shots/round-38/probe-resize-viewswitch.png`。
- 代码：`src/App.tsx:778` `ReusableTable.configure({ resizable: true })`；`src/styles.css:691` `.editor .column-resize-handle`；`node_modules/prosemirror-tables/dist/index.js:2534-2541` 的 `displayColumnWidth` 只调 `updateColumnsOnResize` 改 `<colgroup>`，而拖拽路径下单元格 `colwidth` 始终是 `null`（`## resize-dragged` 的 `cellAttrs`）。源码视图切换会重建表格 DOM，`<colgroup>` 按默认均分重生成，宽度丢。
- 第 37 轮实施报告只验了「拖后 `dirty` 仍 false、保存字节不变」，没验撤销与切视图。

**期望 vs 实际**

- 期望：拖完列宽，`Ctrl+Z` 撤掉这次拖拽（或至少在拖拽后不把更早的文字改动当成上一步）；`README.md:74` 的「列宽不写进 Markdown，重开按内容重新均分」若成立，同一次会话内切源码再回来也不该复位。
- 实际：撤销栈越过列宽直接撤文字（用户以为在撤列宽，实际丢了刚打的字）；切一次视图列宽归零，功能像没生效。

**修复建议**

- 方案 A（首选，改动小）：拖拽结束时（`mouseup`）把宽度写进文档——给表头/单元格 `colwidth` 属性赋值，让列宽进文档模型和撤销栈；序列化层继续剥 `colwidth`（`tableReuse` 已按原文整块复用，保存字节不变）。验收：拖后 `Ctrl+Z` 一次列宽回 `[192,192,192]`；切源码再回列宽保持。
- 方案 B（不改模型）：在 `.column-resize-handle` 的 `title` 里写明「列宽只是视图，切换源码/预览或重开都会复位」，并补 README `:74` 的限制句；不需要撤销的承诺也写清。
- 补一条 e2e：拖宽 → `Ctrl+Z` → 断言 `<col>` 宽度回默认；拖宽 → `Ctrl+/` 两次 → 断言宽度仍在。

## 2（P2，输入被改写）正文里手打 Markdown 表格分隔行，`---` 被智能标点改成 `—-`，表格永远建不成

**复现步骤**

1. 打开任意文档，光标放到正文段落末尾，`Enter` 新建一段。
2. 打 `| 甲 | 乙 |`，`Enter`。
3. 打 `| --- | --- |`。
4. 观察：屏幕上出现的是 `| —- | —- |`；表头/单元格始终是普通段落，`.ProseMirror table` 0 个。
5. 保存后文件里就是 `| —- | —- |`；这份 Markdown 在 Typora/GFM 里也不再是表格。

**证据**

- `.tmp/e2e-r38-bug2.log` → `## typed-table`：`{"text":"…| 甲 | 乙 |\n| —- | —- |…","rows":0}`，html 里是普通块（探针受光标落点干扰出现了 `<h1>`，但 `—-` 与 `rows:0` 与另一份独立日志一致）。
- `.tmp/e2e-r38-bug.log` → `## probe-pipe`：`{"tail":"…| —- | —- |","rows":0}`（干净上下文，第二次独立复现）。
- 对照组同日志 `## probe-dash3`：`{"hrCount":1}`——单独一行打 `---` 仍能出水平分隔线（HR），说明缺陷不是「智能标点整体失效」，而是「`--` 先被替换，第三根 `-` 落在 `—` 后面，分隔行写法被破坏」。
- 截图：`shots/round-38/probe-smart.png`、`shots/round-38/probe-typed-table.png`。
- 代码：`src/lib/smartTyping.ts:57` `if (inserted === '-' && last === '-') return { kind: 'replace', from: -1, to: 0, text: '—' }`——只看光标前一个字符，不看当前行是不是以 `|` 开头的表格行。

**期望 vs 实际**

- 期望：Sidelight 不把管道表解析成表格是已知能力边界（工具栏可插表），但**不应改写用户输入**。用户手写的 GFM 分隔行应原样留在正文与文件里，至少不该静默变成不能解析的写法。
- 实际：`---` 在表格行里被换成 `—-`，没有提示；用户看不出「表格没建起来」与「写法坏了」的区别，存盘后不可原地恢复（只能逐字改回，再被改掉）。

**修复建议**

- 在 `smartInput` 里加一条行上下文（或让插件在 dispatch 前判）：当前文本块以 `|` 开头（或光标所在行匹配 `^\s*\|`）时，`--` 不替换成 `—`；`setting 里「智能标点」关闭时本来就正常，但默认是开的。
- 补单测：`smartInput('| --', '-', ' |')` 返回 `null`；`smartInput('', '-', '')` 保留现有 HR 行为。
- 若决定不做管道表自动解析，也可以只在「行内有 `|`」时不动 `--`，并在 `README` 的「现在不能做什么」写一句「正文里手打的管道表格按纯文本保存」，避免用户试三次。

---

## 六条路径实测结果（本轮全部真跑）

| 路径 | 做了什么 | 结果 | 证据 |
| --- | --- | --- | --- |
| 1 空文档 → 加粗/标题/列表/引用/代码块 → 保存 → 刷新恢复 | 文件菜单「新建文件」→ 打 `## 二级标题`、`**加粗的字**`、`- 列表甲/列表乙`、`> 引用一行`、`1. 有序甲`、```` ``` ```` + 回车 + `const x = 1` → `Ctrl+S` → 读假 FS 字节 → reload + 重新打开 | 通过。`h2/strong/ul/pre/code` 都生成；落盘 108 B；reload 后结构与文档名 `未命名.md` 都在。`> 引用`/`1. 有序` 接在列表项后成为列表续行（Markdown 语义，不是缺陷）。 | `shots/round-38/p1-formatted.png`、`p1-reload.png`；`.tmp/e2e-r38-bug.log` 的 `## path1-*` |
| 2 文件树 展开/新建/重命名/删除/撤销/刷新 | 展开 `sub`（treeitem 9→10）→ 开 `sub/子目录.md` → 新建并保存 → 行内「⋯」→ 重命名 `改名后.md` → 「⋯」→「删除（移到回收站）」→ 确认 → toast「撤销」→ 树头「刷新文件树」 | 通过。重命名后字节同步；删除后当前文档切走、树里消失、toast 有撤销；撤销恢复字节与原项；刷新后 items=11。**注**：本轮脚本重命名命中的是另一篇（选择器写错，见 note），产品行为本身正确。 | `shots/round-38/p2-tree.png`；`.tmp/e2e-r38-bug.log` 的 `## path2-*` |
| 3 键盘 | `Ctrl+1–6/0`、`Ctrl+K`、`Ctrl+M`、`Ctrl+P`、`Ctrl+F`→`Esc`→打字、表格 `Tab`/`Ctrl+Enter`、键盘 Tab 后焦点环 | 通过。标题依次 `H1…H6/P`；`Ctrl+K` 2 个输入框、焦点 `link-editor-input`；`Ctrl+M` 1 个 `math-inline-input`；快速打开 8 个 option；`Ctrl+F→Esc→打字` 落进正文；表格 `Ctrl+Enter` 行数 3→4；焦点环 `solid 2px rgb(43, 109, 100)`。 | `shots/round-38/p3-focus.png`；`.tmp/e2e-r38-bug.log` 的 `## path3-*` |
| 4 样张（frontmatter/公式/行内 HTML/脚注/callout/表格）源码往返 | 打开 `样张.md`（154 B）→ `Ctrl+/` 源码与磁盘**逐字节相同** → 源码追加一行 `Ctrl+S`（165 B，toast 已保存）→ 回富文本 | 通过的部分：源码 `equalToDisk:true`、追加落盘、`<kbd>`/`[!NOTE]`/脚注定义**原样留在文件里**。富文本里 `<kbd>`/`[!NOTE]` 按字面文本显示——与本轮 `findings-typora.md` 第 3 条重复，不计入 actionable。 | `shots/round-38/p4-rich.png`；`.tmp/e2e-r38-bug.log` 的 `## path4-*` |
| 5 源码/预览/专注/字号/设置/主题/窄窗 | `Ctrl+/` 源码再切回；工具栏「预览」再 `Esc`；「专注」；`Ctrl+Alt+=/-/0`；设置点「深色」并保存；1440×900 与 1024×700 量溢出 | 通过。源码焦点在 `TEXTAREA.source-editor`；预览 `contenteditable=false`；`focus-mode` 类可加可去；字号 17→18→17→17；深色保存后 `data-theme="dark"`、`rgb(21, 23, 26)`；两种视口 `scrollWidth===innerWidth`（1440/1440、1024/1024），越界元素 0。 | `shots/round-38/p5-1440.png`、`p5-1024.png`、`p5-dark.png`、`p5-settings.png`；`.tmp/e2e-r38-bug.log` 的 `## path5-*` |
| 6 控制台 0 error / 错误路径 | 无工作区时 `Ctrl+S`（picker 抛 `AbortError`）；打开 6 MB `超大.md`；全程挂 `console`+`pageerror` | 通过。取消保存：toast「保存失败：用户取消。改动还在，可以再试一次。」，`dirty` 仍 true；6 MiB 被拒：「「超大.md」超过 5.5 MiB，仍在「甲.md」」，当前文档不变；三份脚本末尾 `## errors []`。 | `.tmp/e2e-r38-bug.log`、`-bug2.log`、`-bug3.log` 的 `## cancel-*`、`## path6-*`、`## errors []`；`shots/round-38/probe-autosave.png` |

额外探测（第 33/37 轮功能的边界，不在六条主路径内）：

| 探测 | 结果 | 证据 |
| --- | --- | --- |
| 源码模式保存后回富文本，会不会被 2 s 自动保存改写脚注文件 | 通过：回富文本 `dirty:true`，等 4.5 s 无自动保存、无弹框，磁盘逐字节不变（`[^1]:` 仍在）。`dirty` 只因富文本序列化与原文有损（第 34 轮脚注门会拦手动保存）。 | `.tmp/e2e-r38-bug2.log` 的 `## src-saved`、`## src-back-rich`、`## src-autosave-wait` |
| `Ctrl+End` / `Ctrl+Home` 光标落点（上一段探针疑似跳错） | 通过：`Ctrl+End` 落末段 `P` `offset 5` 并原地打字；`Ctrl+Home` 落 `H1` `offset 0`。段首探针里的 `<h1>` 是脚本噪声（见 note） | `.tmp/e2e-r38-bug3.log` 的 `## caret-*` |
| 拖列宽后保存字节 | 通过：`colwidth` 0 命中，Markdown 逐字节不变（第 37 轮断言复验） | `.tmp/e2e-r38-bug.log` 的 `## probe-resize-bytes` |

## note（重复项、按设计、脚本失效，不计入 actionable）

- **重复（前轮或本轮其它 finder 已列，只复核）**：
  - 行内 HTML（`<kbd>`/`<sub>`）在富文本里按字面显示 → 本轮 `findings-typora.md` 第 3 条。
  - 存盘把 `&`/`<`/`>` 写成实体（本轮 `## path1-saved` 里 `- &gt; 引用一行`）→ 第 36 轮 `findings-bug.md` 第 4 条。
  - 表格 `colwidth` 不该进导出 → 本轮 `findings-typora.md` 第 10 条（STATE 下一轮优先 ②）。
  - 重命名后 toast「已刷新：新增 1 个，消失 1 个」、删除确认框里「用文件管理器恢复」与 toast 撤销并存 → 旧账（第 29/33 轮），本轮分别再次出现（`## path2-*` 与 `## path2-delete-dialog`）。
- **按设计，不计**：
  - 列宽不写进 Markdown、重开复位（README `:74` 已写）；**本轮新增的是「切视图也复位 + 撤不到」**，见第 1 条。
  - 源码保存后回富文本 `dirty:true`：富文本解析与原文有损，第 34 轮脚注门会拦截手动保存，没有静默改写。
  - 富文本里 `> 引用`/`1. 有序` 接在列表项后成为列表续行：Markdown 语义。
- **脚本失效（不是产品缺陷，供下一轮复用）**：
  - **文件树行内「⋯」要用 `.tree-row:has([data-path$="/名字.md"]) .tree-row-more`**；直接写 `.file-tree [role="treeitem"][data-path$="/名字.md"] .tree-row-more` 时 `.tree-row-more` 是 treeitem 的**兄弟**，选择器会落到别的行（本轮 `path2` 把另一篇改了名）。
  - 新建文档的实际名是 `未命名 2.md`（`未命名.md` 已存在时），脚本按 `/未命名/` 找第一个会拿错。
  - 「无句柄保存取消」必须在**没有打开工作区文档**的上下文里测；已打开工作区文档时 `Ctrl+S` 走原地保存，picker stub 不触发（第一版脚本因此假通过）。
  - `page.locator('.ProseMirror p').click()` 后立刻 `Control+End` 再 `Enter`，在空文档边界会落进上一个 H1，产生「手打表格变 H1」的假象；干净复测（脚本 C）光标位置正确。
  - 含中文的 E2E 脚本只用 `write` 工具写，不用 PowerShell 管道改写（AGENTS §8）。

## UNVERIFIED（本轮测不了）

| 项 | 为什么 | 怎么补测 |
| --- | --- | --- |
| 列宽在宿主（WebView2）里的持久化与切视图行为 | CDP 9222 是浏览器 + 假 FSA 句柄，不是宿主 | 宿主里跑同一段拖拽 + `Ctrl+/` 往返，看 `<col>` 是否复位 |
| 触屏/触控板拖拽列宽 | 本机只有鼠标事件模拟 | 真机触控板拖一次，确认 `column-resize-handle` 命中区 |
| 真实 IME 下智能标点对 `--`/`---` 的处理 | 无中文输入法自动化 | 真输入法里打一行表格分隔行，看是否同样变 `—-` |
| 列宽拖拽在导出 HTML 里的表现 | 与 `findings-typora.md` 第 10 条重合，本轮不重复计数 | 导出后 grep `colwidth`/`<col` |
