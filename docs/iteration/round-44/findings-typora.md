# 第 44 轮 Typora 对照与写作体验（finder-typora）

- 轮次参数：`round=44`、`nn=44`；轮前 startSha `d22807f4361a32d06a49f6645d610511f3ce7bb7`（`git rev-parse HEAD` 实测一致，工作树干净，轮前无未跟踪改动）
- 环境：dev server `http://localhost:5175`（未另起、未重启）、CDP `9223`、每次 E2E 前 `node .tmp/reset.mjs 9223`；未启动 Edge、未 kill `msedge`、未 `browser.close()`
- 只读：未改产品代码、未 commit、未 push、未碰 `release/`
- 本轮真跑 5 条主路径、13 组读数（全部在真应用里，见 §1）：源码种子→富文本的大纲折叠、脚注可见性、输入规则（8 种）、表格键盘快捷键、Mermaid 错误态；另跑暗色主题打印媒体、预览里的 Mermaid、源码模式选区字数、字数明细面板
- 脚本（只读）：`.tmp/e2e-r44-typora-a.mjs`、`.tmp/e2e-r44-typora-b.mjs`
- 截图：`shots/round-44/typora-*.png`（13 张，见 §11）
- 控制台：产品代码无新增报错；只有第 42 轮已判为环境噪声的无栈 `Cannot read properties of undefined (reading 'id'/'url')` 与浏览器翻译扩展 `chrome-extension://…OfscreenTranslate` 噪声（本轮复现同样两条，未计入发现）

## 0. 结论先行（7 条，全部本轮实测；与第 39–43 轮不重复）

| # | 发现 | 级别 | 用户收益 | 改动面 |
| :--- | :--- | :--- | :--- | :--- |
| 1 | 手打 `- [ ] ` 不建任务项，只得到普通列表；保存写成 `- \[ \] xxx`，Markdown 语义被改 | P1 | 任务清单是写作日常；Typora 用户的第一写法失效，且盘上多了反斜杠 | `App.tsx` 加 TaskList/TaskItem 的 input rule + 序列化用例，约 60–80 行 |
| 2 | 暗色主题下打印：正文是浅色字（`rgb(233,230,224)`），`@media print` 没有改配色 | P1 | 打印/另存 PDF 出来近乎白纸；文档级功能失效 | `styles.css` 打印块加 6–8 行色变量覆盖，0 JS |
| 3 | 大纲折叠按「标题节点位置」记 id，在标题前改一个字，折叠全部静默展开 | P2 | 长文折叠本来是为了专注，一改前文就全弹开，用户以为是 bug | `outlineTree.ts`/`Outline.tsx` 换稳定键 + 全部折叠/展开，约 50 行 |
| 4 | 脚注定义在编辑视图完全不可见，`[^1]` 也不是上标；只能进源码模式改、进预览看 | P2 | 写脚注时要来回切源码；不知道定义写了什么 | 最小档：`[^1]` 渲染成上标 + `title` 显示定义，约 30 行；完整档要可编辑脚注区 |
| 5 | 只读预览与 HTML 导出不含 Mermaid 图（编辑视图有 SVG，预览只剩围栏源码） | P2 | 打印/导出给别人的文档里图没了；Typora 导出带图 | 预览复用已渲染 SVG + 导出内联，约 80–120 行 |
| 6 | 源码模式里选中文字，状态栏不显示选区字数（编辑视图有「选区 N 字」） | P2 | 长文在源码里改时无法知道选中多少字 | `App.tsx:5128` 一处 + textarea 选区事件，约 15 行 |
| 7 | 文档过期：`docs/iteration/typora-features.md` 有 12+ 处写「无/缺」而产品已有；`docs/typora-gap.md` 没收录本轮 3 个新缺口 | P2（文档） | planner 会照着旧报告重复排已做的事 | 单文件加过期横幅 + gap 表 3 行、计数 31/10 → 31/13 |

## 1. 跑过的路径与原始读数

命令统一是 `node .tmp/e2e-r44-typora-{a,b}.mjs 9223`，两个脚本各自 `localStorage.clear()` + reload；脚本用「源码模式写 Markdown → Ctrl+/ 回富文本」这条路种文档，走的是应用自己的解析链（`App.tsx:3903-3934` `switchView` → `applySource`）。

| 路径 | 关键读数 | 判定 |
| :--- | :--- | :--- |
| 大纲折叠（三级标题） | 折叠前 `["Chapter A","Chapter B","Chapter B1","Chapter B2","Chapter C"]`；折叠 B 后 `["Chapter A","Chapter B","Chapter C"]`、`aria-expanded ["true","false"]` | 折叠本身可用（负结果） |
| 文首插一个字后 | 行变回 `["XChapter A","Chapter B","Chapter B1","Chapter B2","Chapter C"]`、`expanded ["true","true"]` | **折叠丢了**（F3） |
| 脚注文档（编辑视图） | `editorHasRef:true, editorHasDefinition:false, anyUiShowsDefinition:false` | **定义不可见**（F4） |
| 同一文档（预览） | `viewMode:"preview"`、`previewText:"Footnote demoBody text with a note[^1].注释The footnote definition body."`、`hasFootnoteSection:true` | 预览才有定义；引用仍是字面 `[^1]` |
| 任务列表（从 Markdown 载入） | `taskLists:1, checkboxes:2`；回车续写 → `checkboxes:3, checked:[false,true,false]` | 载入与续写正常（负结果） |
| 手打 `- [ ] typed checkbox line` | DOM：`taskLists:1, plainUls:1`，文本尾部 `[ ] typed checkbox line`；源码输出：`- \[ \] typed checkbox line` | **不建任务项 + 转义**（F1） |
| 输入规则逐条 | `- `→`ul`；`1. `→`ol`；`> `→`blockquote`；`## `→`h2`；` ``` `→`pre`；`---`→`hr`；列表/引用/有序列表按 Enter 续写 | 全部可用（负结果） |
| 表格工具条 + 键盘 | 7 个按钮：上/下插入行、左/右插入列、删除行、删除列、删除整表；`Ctrl+Enter` 行数 2→3；`Ctrl+L` 3→2 | 可用（负结果） |
| Mermaid 语法错误（`A --> ` 缺目标） | `cls:"mermaid-preview ProseMirror-widget is-error"`、文本「图表没渲染出来，代码块内容仍是原文，可以继续编辑。」、`hasSvg:false` | 错误态已做好（负结果） |
| 暗色主题（屏幕） | `data-theme:"dark"`、`bodyBg:rgb(21,23,26)`、`pColor:rgb(233,230,224)`、`--paper:#15171a`、`--ink:#e9e6e0` | 正常 |
| 暗色主题（打印媒体） | `printPColor:rgb(233,230,224)`、`printHtmlBg:rgb(21,23,26)`、`printColorScheme:"dark"`、顶栏已 `display:none` | **打印配色没改**（F2） |
| 源码模式选区 | `viewMode:"source"`，状态栏 `"6 字 · 阅读约 1 分钟源码"`，无选区 pill（`selectionPill:false`） | **无选区字数**（F6） |
| 字数明细面板 | 字段：`中日韩字/拉丁词/合计/字符/句/段/阅读/选区` | 无「行」（并入 F7 建议） |
| 预览里的 Mermaid | 编辑视图 `.mermaid-preview svg` = 1；预览 `.preview-pane svg` = 0、`pre` = 1、文本 `"Diagramgraph TD\n  A --> B"` | **预览/导出丢图**（F5） |

## 2. P1 手打 `- [ ] ` 不建任务项，保存还把 `[ ]` 转义成 `\[ \]`

**用户收益**：任务清单是写作日常。Typora 里打 `- [ ] ` 空格那一刻就变成任务项（`docs/iteration/typora-features.md` 把任务列表记为 Sidelight 已有能力，`docs/typora-gap.md:13` 也写「有」）。现在同一个动作只得到普通列表项，字面 `[ ]` 留在正文；保存到盘上是 `- \[ \] typed checkbox line`。

**现状证据**：
- E2E：输入 `- [ ] typed checkbox line` 后 DOM `taskLists:1, plainUls:1`，纯文本尾部 `[ ] typed checkbox line`；切源码读全文得到 `- \[ \] typed checkbox line`（`.tmp/e2e-r44-typora-b.mjs` 的 `B1_typed_checkbox_dom` / `B1_typed_checkbox_source`）。
- 对照：同一脚本里用 Markdown 载入 `- [ ] first task` 能得到真任务项（`taskLists:1, checkboxes:2`），回车还能续写未勾选的新项（`checked:[false,true,false]`）——**解析链会做，输入链不会**。
- 转义来自 `@tiptap/markdown` 的序列化（普通列表项文本以 `[ ]` 开头时按字面转义），产品没有 Post-processing 还原。源码模式显示的就是将要写盘的内容（`App.tsx:3910-3917`）。

**实现要点**：
- 在 `src/App.tsx:773` 的 extensions 数组里给 `TaskList`/`TaskItem` 补 input rule（可仿 `src/lib/mathInput.ts:30-58` 的写法）：段落文本匹配 `^- \[( |x|X)\] $` 时 `setTaskList().toggleTaskList()`，并迁移已有文字。`- [x] ` 直接建成已勾选项。
- 序列化侧加一条「任务项文本以 `[ ` 开头时不转义」的保护，或在 `src/lib/tableCellBreaks.ts` 同层加一个 `unescapeTaskMarkers` 纯函数（进 `setMarkdown` 前处理），并加单测（任务项、普通列表、正文里真的写了 `\[` 的三种输入）。
- 不要动 `~~`/`~` 那条链（`src/lib/tilde.ts` 是行内 token 扩展，与输入规则不同层，第 40 轮已实测 `del()` 覆盖法无效）。

**体积与风险**：约 500–800 B gzip + 3–4 条单测。风险在 input rule 的触发面：`[` 是链接/脚注语法常用字符，规则必须锚定「段首 `- ` + `[ ] ` 结尾」；要回归「正文里输入 `- [text](url)`」「引用式链接定义 `[label]:`」（`src/lib/footnotes.ts:2`）不被误建任务项。

**建议优先级**：P1（Typora 用户的高频输入路径，且会污染盘上 Markdown）。

## 3. P1 暗色主题下打印是浅色字，`@media print` 没改配色

**用户收益**：写作到成稿常有「打印一份看看」或「另存 PDF 发人」的动作。现在深色主题下点顶栏「导出 → 打印 / PDF」（`App.tsx:4603-4613` 的 `window.print()`），正文是 `rgb(233,230,224)` 的浅字；Chromium 默认不打印背景色，于是浅字落在白纸上，几乎看不见。`docs/typora-gap.md:30` 把「打印」记为已支持。

**现状证据**：
- E2E（`page.emulateMedia({ media: 'print' })` 后读计算样式）：`printPColor:"rgb(233,230,224)"`、`printHtmlBg:"rgb(21,23,26)"`、`printColorScheme:"dark"`，顶栏/侧栏/状态栏已 `display:none`（`stillVisible:[]`）。截图 `shots/round-44/typora-dark-print-media.png` 就是打印媒体下的整页：深底浅字、无 UI 框。
- 代码：打印块 `src/styles.css:1939-1970` 只做 `display:none` 与布局，没有任何颜色覆盖；深色变量在 `src/styles.css:36-62`（`--paper:#15171a`、`--ink:#e9e6e0`），`color-scheme: dark`（`:37`）。
- 同一缺陷按代码外推到导出的 HTML：`src/lib/export.ts:54-55` 的 `:root { color-scheme: light dark }` + `:121-127` 的 `@media (prefers-color-scheme: dark)` 让导出文件按**读者系统**变深色，且同样没有 `@media print` 覆盖。这条是代码推断，未打开导出文件实测（见 §10）。

**实现要点**：
- 只在打印块加变量覆盖，不动屏幕样式，例如在 `src/styles.css:1939` 的 `@media print` 里加：
  `:root, html[data-theme='dark'], html:not([data-theme='light']) { color-scheme: light; --paper:#fff; --paper-raised:#fff; --ink:#1d2023; --ink-soft:#3b3f44; --ink-faint:#5a6066; --line:#d4cfc4; --line-strong:#b9b3a7; }` 并给 `.editor` 设 `background:#fff`。
- 顺带给 `src/lib/export.ts` 的 `STYLES` 加同样一段 `@media print`（导出文件打印也走这条路）。
- 不要用 `-webkit-print-color-adjust: exact`：那会把整页刷成墨黑的深底，比现在更糟。

**体积与风险**：CSS 约 200 B gzip、导出字符串约 200 B（不进首屏 JS）。风险极低；注意深色下的 `--mark`/`--accent`（`:46-59`）在打印里要选可读的深色版本，别直接沿用。

**建议优先级**：P1（打印是已承诺能力，深色主题用户 100% 命中）。

## 4. P2 大纲折叠按节点位置记 id，改一个前文字母就全部静默展开

**用户收益**：长文里折叠大纲是为了把注意力放在当前节。现在折叠后，在前面任何段落里改一个字（甚至只是把光标移到文首打一句话），所有折叠全部展开，用户会以为是随机行为；折叠状态也不跨文档保留，也没有「全部折叠/全部展开」。

**现状证据**：
- E2E：`A1_after_fold_B` 折叠成功（`rows:["Chapter A","Chapter B","Chapter C"]`、`aria-expanded:["true","false"]`，截图 `typora-outline-folded.png`）；在文首打一个 `X` 后 `A1_after_typing_at_start` 行变回 5 行、`expanded:["true","true"]`（截图 `typora-outline-after-edit.png`）。
- 代码：折叠集合 `Set<string>`（`src/components/Outline.tsx:17`），id 由标题**节点起始位置**生成：`id: \`h-${offset}\``（`src/lib/outline.ts:24`，注释也写「数字是标题节点在文档里的起始位置」）。插入一个字，后续标题 offset 全部 +1，旧 id 不再匹配；`rows` 的过滤（`Outline.tsx:33-40`）于是把所有行都放出来。
- 折叠状态只在面板内存里（`Outline.tsx:11-13` 注释「会话内有效，不持久化」）；`docs/typora-gap.md:35` 只写了「会话内有效，不持久化」，没写这条编辑后丢失。

**实现要点**：
- 换稳定键：方案 A（最小）——`extractOutline` 的 id 改成「级别 + 标题文字 + 同文字出现序号」，`h-${level}:${text}#${n}`；代价是改标题文字时该节折叠丢失（可接受，且不再受前文编辑影响）。方案 B——`Outline` 保留 `collapsed` 的「级别 + 文字」键，在 `items` 变化时用 `useMemo` 做一次旧键→新键映射（按顺序贪心匹配），编辑段落不影响，改标题也能守住。
- 加两个按钮（`aria-label="全部折叠"` / `"全部展开"`）：对 `nodes.filter(hasChildren)` 一次性 add/clear。
- 若要多做一步，折叠集合按文档 key 存 `sessionStorage`（与 `src/lib/session.ts` 的会话缓存同层），切换文档不串。
- 回归：`src/lib/outlineTree.test.ts` 已覆盖 `expandAncestors`/`visibleActiveId`，新增「插字后折叠仍有效」用例。

**体积与风险**：约 400–600 B gzip（面板在懒加载块里，不进首屏）+ 2–4 条单测。风险：`activeId` 自动展开祖先的逻辑（`Outline.tsx:20-22`）依赖 id，改键后要保证同一套 id 语义；别在 `visibleActiveId` 里混用两套 id。

**建议优先级**：P2（长文写作会碰到，改动小、无数据风险）。

## 5. P2 脚注定义在编辑视图完全不可见，`[^1]` 也不是上标

**用户收益**：脚注是论文式写作（中文注释、参考文献）的常用件。现在编辑视图里只看到正文里的字面 `[^1]`，脚注定义被抽到内存里（`src/App.tsx:473-477`），屏幕上任何位置都看不到「这条注释写了什么」；要改脚注正文只能进源码模式，要看效果只能切预览。Typora 里引用是上标数字，点一下跳到定义再跳回。

**现状证据**：
- E2E：载入 `Body text with a note[^1].` + 定义块后，编辑视图 `editorHasRef:true, editorHasDefinition:false`，整页 `document.body.innerText` 也 `anyUiShowsDefinition:false`（截图 `typora-footnote-edit.png`）。
- 同一文档切预览：`hasFootnoteSection:true`，预览文本里有 `注释The footnote definition body.`（截图 `typora-footnote-preview.png`）——说明预览与导出会渲染定义（`PreviewPane.tsx:62`、`export.ts:33-45`），只有编辑视图不倒出来。
- 代码：编辑视图只拿正文 `setMarkdown(footnoteSplit.body)`（`App.tsx:473-477`、`:1053-1059`、`:3112-3117`），`footnotes` 状态只用于拼回与预览；保存时 `joinFootnotes(body, footnotesRef.current)`（`App.tsx:913`）。字节保真已有单测（`src/lib/footnotes.test.ts`）。
- 引用在编辑器里是普通文本，序列化时靠 `repairFootnoteRefs` 还原（`src/lib/footnotes.ts:85-87`），没有上标标记。

**实现要点（建议只做第一档，第二档另立 ADR）**：
- 第一档（无数据风险）：`setMarkdown` 之后把正文里的 `[^id]` 换成带 `data-footnote` 的 inline 节点或 mark 装饰（装饰就能做：`src/lib/decorations.ts` 已有同类插件），显示成 `<sup>1</sup>`，`title` 填对应定义文本，`getHTML()` 不变、保存字节不变（守卫：序列化前把 sup 还原成 `[^id]`）。
- 第二档：编辑区下方加「脚注」区，按 `footnotes.ts` 的 `blocks`（已带 `gapBefore`）逐条渲染可编辑 `textarea`，改完用 `joinFootnotes` 拼回。风险在字节保真（空行/续行/引用式链接定义混排），必须复用 `blocks` 而不是重新按行拼。
- 别把定义直接塞回正文尾部：`extractFootnotes` 的摘出规则（`:62-73`）依赖「尾部块组」，塞回去会让每次载入重复摘取。

**体积与风险**：第一档约 300 B gzip + 3 条单测（sup 渲染、空定义、`[^1]` 在代码块里不处理）；第二档约 1.2–1.5 KB gzip，必须配 roundtrip 用例。风险：`[^` 与引用式链接定义（`[label]:`）共用语法，装饰只认 `[^`。

**建议优先级**：P2（写作高频但不阻断；先做只读可见性，编辑区留到单独一轮）。

## 6. P2 只读预览与 HTML 导出不含 Mermaid 图

**用户收益**：编辑视图里能看见图（第 36 轮），但切预览、导出 HTML、打印都会丢图——只剩围栏源码。技术写作把文档发给别人时图是核心内容。`docs/typora-gap.md:34` 把「预览面板与 HTML 导出不含图」写成已知限制，但没进「建议的下一批」。

**现状证据**：
- E2E：同一篇 ```mermaid 文档，编辑视图 `.mermaid-preview svg` = 1；切预览后 `.preview-pane svg` = 0、`pre` = 1，预览文本是 `"Diagramgraph TD\n  A --> B"`（`.tmp/e2e-r44-typora-b.mjs` 的 `B3_mermaid_editor_vs_preview`，截图 `typora-mermaid-preview.png`）。
- 代码：Mermaid 是 ProseMirror 装饰 widget，`src/lib/mermaidPreview.ts:11` 注释明确「widget 是装饰，`getHTML()` 看不到它」；预览吃 `editor?.getHTML()`（`App.tsx:5018`），导出吃 `replaceMathHtml(options.bodyHtml, …)`（`export.ts:179`），两处都拿不到 SVG。
- 已渲染的 SVG 就在 `svgCache`（`mermaidPreview.ts:16`）里，只是没人取。

**实现要点**：
- 给 `src/lib/mermaidLazy.ts` 加一个 `getRenderedSvg(code)`（按 hash 查 `svgCache`，miss 时返回 null），预览与导出一致调用。
- 预览：`PreviewPane` 已有「先渲染占位、加载后 `useSyncExternalStore` 重画」的 KaTeX 模式（`PreviewPane.tsx:38-72`），把 mermaid 图按同一模式塞进 `<pre><code class="language-mermaid">` 的位置；`ensureMermaid()` 可复用。
- 导出：`buildHtmlDocument` 是同步函数，先在调用处把正文里每个 mermaid 围栏的 SVG 取出来（miss 就 `await ensureMermaid()` 再 render），用占位符替换；导出的 SVG 已是 `securityLevel` 处理过的字符串，直接内联，不要引外部脚本。
- 回归：`src/lib/mermaidLazy.test.ts` 加「缓存命中/未命中」两条；导出测试断言 HTML 里出现 `<svg` 且不含 `<script`。

**体积与风险**：约 600 B–1 KB gzip（mermaid 本体仍在懒加载 chunk）。风险：SVG 内联后 `id` 冲突（第 37 轮已记 b 项未做，同名图两次导出会撞 id，先给每个 `<svg>` 前缀）；导出的 HTML 必须自包含，不能带 mermaid 运行时。

**建议优先级**：P2（技术写作价值明确，成本中等）。

## 7. P2 源码模式选中文字，状态栏不显示选区字数

**用户收益**：编辑视图里选中一段，状态栏会出现「选区 N 字」（`StatusBar.tsx:52-56`）；同一操作在源码模式（Ctrl+/）里什么都不显示。长文在源码里做结构修改时，选了多少字没有反馈。

**现状证据**：
- E2E：`viewMode:"source"`，在 `textarea.source-editor` 里 `setSelectionRange(2,10)` 后，状态栏文本只有 `"6 字 · 阅读约 1 分钟源码"`，`selectionPill:false`（`.tmp/e2e-r44-typora-b.mjs` 的 `B4_source_selection_status`，截图 `typora-source-selection.png`）。
- 代码：`selectionWords={viewMode === 'edit' ? selection.words : 0}`（`src/App.tsx:5128`）；`selection` 来自编辑器选区，源码模式没有编辑器（`App.tsx:5126` 的状态栏 stats 已经对源码做了 `splitFrontmatter(sourceText).body` 的特判，选区这条没做）。

**实现要点**：
- 给 `switchView('source')` 与 `textarea` 的 `onSelect` 记 `selectionStart/End`（存 state），源码模式下 `selectionWords = countText(sourceText.slice(start, end))` 的合计；预览模式保持 0（无选区）。
- 字数明细面板的「选区」行（`StatsDetail.tsx:114-119`）同口径传值，源码模式下不再显示「未选中文本」。
- 顺带给面板加一行「行」（`text.split('\n').length`）：Typora 状态栏字数明细里有 Lines，本项目只有 字/词/字符/句/段。`countText`（`src/lib/wordcount.ts`）可扩一个 `lines` 字段，单测同步。

**体积与风险**：约 80–120 B gzip + 2 条单测。风险：`onSelect` 在每次拖动都触发，计数要防抖或只在 `selectionchange` 时算一次（`countText` 是纯函数，成本低，不必防抖）。

**建议优先级**：P2（成本最低的一档一致性）。

## 8. P2 文档过期：`typora-features.md` 12+ 处现状失真，`typora-gap.md` 没收录本轮新缺口

**用户收益**：planner 每轮读这两份文档排任务。`docs/iteration/typora-features.md` 是 2026-11-16 的调研快照，但没有任何「现状已过期」的标记，而 §3 的「Sidelight 现状」列、§5.1「缺失且值得做」、§5.2「已有但更难用」、§6「优先级 Top 8」仍把已实现的能力写成缺：

| 位置 | 文档写法 | 实测/其它文档 |
| :--- | :--- | :--- |
| `typora-features.md:43`（#2 文件树/大纲） | 「不能折叠大纲」 | 已可折叠（`docs/typora-gap.md:35`，本轮 E2E 复现） |
| `typora-features.md:46`（#5 表格） | 「无键盘走格/加行」 | Tab 走格、`Ctrl+Enter` 加行、`Ctrl+L` 删行均已可用（`typora-gap.md:31`，本轮实测行数 2→3→2） |
| `typora-features.md:51`（#10 快速打开） | 「无」 | 已有 `Ctrl+P` 快速打开（`typora-gap.md:39`） |
| `typora-features.md:94-101`（§5.1） | 8 行「缺失且值得做」：Ctrl+P、Ctrl+K、表格键盘、标题快捷键、源码 Ctrl+/、侧栏直达、字数明细、大纲折叠 | 全部已实现（`typora-gap.md:25/31/35/39`、README 当前状态） |
| `typora-features.md:106-116`（§5.2） | 「源码模式只有按钮」「另存为 Ctrl+Alt+S」「查找是面板」 | Ctrl+/ 有键位、查找已有 `Aa`/整词（第 41 轮）、`Ctrl+Shift+S` 另存为副本 |
| `typora-features.md:130-137`（§6） | Top 8 里前 7 项都列为待做 | 前 7 项全部已上，只剩 Mermaid |

建议：在 `typora-features.md` 顶部加一行「**现状以 `docs/typora-gap.md` 为准（2026-11-17 复核）；本文 §3、§5、§6 的『Sidelight 现状』列是 11-16 的快照，不要当待办列表**」，再按上表修正 §5.1/§6（或直接删掉已做的 7 项只留 Mermaid 与不建议做项）。

同时 `docs/typora-gap.md`：本轮发现 3 个新缺口（任务列表手打、暗色打印、脚注定义编辑），建议补成「缺的（13）」并在「建议的下一批」（`:85-93`）里按「先堵数据损失，再补日常必需」插入：暗色打印 → 任务列表手打 → 脚注定义可见性。`:16`「示例工作区」字样仍在，但 `src/lib/workspace.ts:68/244/259` 还保留「示例文件（无句柄）」分支，这条**不算过期**，本轮复核后撤回该疑点。

**体积与风险**：文档 0 字节产品体积。**建议优先级**：P2（多半轮规划风险，成本几分钟）。

## 9. 试过、判断没有问题的路径（负结果，免得下一轮重复劳动）

1. **输入规则齐全**：`- `→列表、`1. `→有序列表、`> `→引用、`## `→H2、` ``` `→代码块、`---`→分割线；列表/有序列表/引用按 Enter 都续写，空项退出（`.tmp/e2e-r44-typora-a.mjs` 的 `A3_input_rules`，截图 `typora-input-rules.png`）。
2. **表格键盘**：工具条 7 个按钮齐全（上/下插入行、左/右插入列、删行、删列、删表）；`Ctrl+Enter` 加行、`Ctrl+L` 删行实测生效（截图 `typora-table-keys.png`）。
3. **任务列表从 Markdown 载入与续写**：勾选状态保留（`checked:[false,true,false]`），回车新项未勾选。
4. **Mermaid 错误态**：不抛原始英文解析错误，给中文提示且保留源码可编辑（`is-error`，截图 `typora-mermaid-error.png`）。
5. **大纲折叠本体**：`aria-expanded` 正确切换、子项隐藏、`hasChildren` 才显示折叠按钮；光标进折叠子树时自动展开祖先（`Outline.tsx:20-22`）。
6. **预览的脚注与 frontmatter**：预览 `注释` 小节与 frontmatter 都按导出样式渲染（`PreviewPane.tsx:62`）。
7. **暗色屏幕配色**：`rgb(21,23,26)` 底 + `rgb(233,230,224)` 字，与 `styles.css:38-41` 一致（截图 `typora-dark-mode.png`）。

## 10. 上几轮已报、本轮复核仍未修（不重复计数）

行内 HTML 与正文 `<br>` 不渲染（39/42/43）、手写表头行 + Enter 不建表（41/42/43）、Ctrl+滚轮不缩放与无全屏（42/43）、图片落盘规则不可选（42）、专注模式无首次提示（41/43）、拖入 `.md` 无反应（43）、Mermaid 不跟主题切换（42）、源码模式无行号（41/42）、智能标点 `--`/`---`（41/42）、`[toc]` 不渲染（40）、表格列宽不持久（43）、Mermaid 无复制源码入口（43）。本轮未逐条复测，均按上轮记录保留。

## 11. UNVERIFIED

1. **真实宿主（WebView2）打印的最终颜色**：本轮用 CDP `emulateMedia({media:'print'})` 复现了浅字+深底的计算样式，但没有在宿主里走「Microsoft Print to PDF」并打开 PDF 确认。补测：宿主里「导出 → 打印 / PDF」→ 打印到 PDF → 用 PDF 阅读器看文字色；或用 CDP `Page.printToPDF` 后检查产物。
2. **导出 HTML 在读者暗色系统下打印**：只按 `export.ts:54-55,121-127` 代码推断（导出文件无 `@media print` 覆盖），未打开导出文件实测。
3. **任务列表手打规则在中文 IME 下**：E2E 是 ASCII 键盘注入，`[` 在中文输入法里可能走不同路径（标点转换），未实测。
4. **折叠状态跨文档是否串**：浏览器态没有 FSA 句柄，无法真写盘换文档；用「源码种子 + 新建」可以模拟，本轮没跑。若 planner 要修，补这条 E2E。
5. **脚注定义是否还有其它入口**：编辑视图 `innerText`、侧栏、状态栏、页边批注都没有定义文本，本轮按「编辑视图没有」下结论；未穷举「查找」（源码模式查找被锁，`FindBar` 的 `unavailableReason`）与宿主文档路径。
6. **字数明细加「行」的口径**：Typora 的 Lines 是否含 frontmatter、是否算空行未核对（`Docs/*.md` 无对应说明），实现前要先定口径。

## 12. 给 planner 的排序建议

按「先堵功能受损，再补日常必需，再做体验细化」：

1. **暗色主题打印配色**（发现 2，CSS 级、风险最低、100% 命中深色用户）。
2. **任务列表手打 `- [ ] `**（发现 1，输入链高频且污染盘上 Markdown，需要加 input rule + 序列化回归）。
3. **大纲折叠换稳定键 + 全部折叠/展开**（发现 3，长文专注体验，纯前端）。
4. **脚注引用上标 + 定义只读可见**（发现 4 第一档，无数据风险；可编辑脚注区另立一轮并配 roundtrip）。
5. **预览/导出的 Mermaid 图**（发现 5，技术写作价值明确，注意 SVG id 唯一）。
6. **源码模式选区字数 + 字数明细加「行」**（发现 6，最便宜的一致性）。
7. **两份 Typora 文档的过期修正**（发现 7，可与其他任务同批做，几分钟）。

排序理由：发现 1、2 都是「功能在，结果不对」，用户会认为产品坏了；发现 3–6 是体验与能力缺口；发现 7 只影响规划的准确性，成本最低可以顺手做。
