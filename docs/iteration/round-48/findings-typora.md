# 第 48 轮 Typora 对照与写作体验（finder-typora）

- 轮次参数：`round=48`、`nn=48`；轮前 `startSha=5673b1dee5623cc72fe87b37d563c1d7444224ff`（`git rev-parse HEAD` 实测一致，轮前工作树干净）
- 环境：dev server `http://localhost:5175`（未另起、未重启）；CDP `9223`；每轮 E2E 前 `node .tmp/reset.mjs 9223`；未启动 Edge、未 kill `msedge`、未 `browser.close()`、未 push、未碰 `release/`
- 只读：未改 `src/`、未改 `docs/` 旧文件、未 commit（`git status --porcelain` 只有 `?? docs/iteration/round-48/`、`?? shots/round-48/`）
- 本轮真跑 8 组路径、约 30 组读数（全部在真应用里，见 §1）：表格对齐渲染与保存、脚注引用两态、frontmatter 入口、代码块与代码块内 Tab、Mermaid 有效/无效/打印、大纲折叠与跨文档、字数明细、插图落盘
- 脚本（只读）：`.tmp/e2e-r48-typora-a.mjs`（`.tmp/r48-typora-a.log`）、`-b.mjs`（`.tmp/r48-typora-b.log`）、`-c.mjs`（`.tmp/r48-typora-c.log`）；均 `page.close()` + `process.exit(0)`
- 截图：`shots/round-48/r48-*.png` 共 12 张（见 §10；与同目录其他 finder 的 `bug-*`/`code-*`/`r48-ui-*`/`ship-*` 不混用）
- 控制台：只有第 42/44/45/46 轮已判为环境噪声的无栈 `Cannot read properties of undefined (reading 'id'/'url')` 与翻译扩展 `chrome-extension://…OfscreenTranslate` 噪声；产品代码本轮 **0 个新报错**

## 0. 结论先行（8 条可执行：4 条本轮新发现 F1/F5/F6/F7 + 3 条第 47 轮复核仍未修 F2/F3/F4 + 1 条文档订正 F8）

| # | 发现 | 级别 | 用户收益 | 改动面 |
| :--- | :--- | :--- | :--- | :--- |
| 1 | **脚注引用 `[^1]` 在编辑视图与预览里都是字面文本**，不是上标、点不动；预览却把定义收成「注释」区——写的时候看不到与那段的联系 | P1（新） | 中文写作里脚注常见（注释/出处）；现在只能看到一堆 `[^1]` 方括号，找不到第几条 | `src/lib/` 加一个纯函数认引用 + 装饰 widget 显示上标、点击滚到定义；`PreviewPane` 同步渲染，约 60–90 行 |
| 2 | **Mermaid 源码块与渲染图双份显示**，打印/PDF 里也是两份；预览图没有任何按钮（无「复制源码」） | P2（第 47 轮 F3 复核，未修） | 每张图多占 80 px；导出 PDF 里图下面挂着源码 | `mermaidPreview.ts` 渲染完成后把相邻 `pre` 折成一行摘要、`@media print` 强制折叠；约 30–50 行 |
| 3 | **代码块没有语言标签、没有复制按钮、没有语法高亮**（`code.language-js` 只是个属性） | P2（第 47 轮 F5 复核，未修） | 技术写作里代码是一整段单色字，也看不出是什么语言 | 最小档 30 行（DOM 层标签 + `navigator.clipboard`）；高亮要引库需产品负责人批 |
| 4 | **编辑视图看不到也改不了 frontmatter**：状态栏「元数据」是 `SPAN`，全页没有入口 | P2（第 47 轮 F4 复核，未修） | 改 tags/日期要 `Ctrl+/` 进源码、滚到文首、再切回 | 状态栏 chip 变按钮 + 只读 YAML 对话框（复用 `ShortcutsDialog` 壳），约 40–60 行 |
| 5 | **大纲缺过滤框与「全部折叠/全部展开」**：只有逐个标题的三角按钮；跨文档切回来折叠被自动展开 | P2（新） | 长文（50+ 标题）里找一节要滚很久；Typora 的 `#outline-menu` 有 Filter / Expand All / Collapse All | `Outline.tsx` 加 `<input type="search">` 过滤 + 两个按钮，`outlineTree.ts` 补纯函数 + 单测，约 50 行 |
| 6 | **字数明细缺「行」**（Typora 的字数面板有 Minutes / Lines / Words / Characters） | P2（新，缺口细化） | 交稿前按行数对进度是写作者常用口径；现在只有段与句 | `StatsDetail.tsx` 加一行 `行` = 换行数，约 5 行 + 1 条单测，<100 B |
| 7 | **表格工具条只有增删，没有移动行/列，也没有对齐设置**（Typora 表格菜单有 Move Row Up/Down、Move Column Left/Right、Copy Table） | P2（新，缺口细化） | 调换两行/两列只能剪切粘贴；想改对齐只能进源码写 `:---:` | 对齐三项最省（Tiptap 3 单元格内置 `align` 属性，序列化已会写 `:---`）；移动行列要自写命令，另评估 |
| 8 | **两份 Typora 文档仍过期**：`typora-features.md` 5 处写「无」，`typora-gap.md`「缺的（9）」漏 4 行（代码高亮/语言标签、拼写检查、图片落盘规则、大纲过滤与全部折叠） | P2（文档） | planner 照旧文档会重复排已做项、漏掉真缺口 | 两个 Markdown；README/AGENTS 的「32 项有、9 项缺」同步改为「32 / 13」 |

排序建议：1（脚注，写作高频且现在两态不一致）→ 8（文档，几分钟，先把 planner 的输入修正）→ 4 → 5 → 2 → 3 → 6 → 7。

## 1. 跑过的路径与原始读数

| 路径 | 关键读数 | 判定 |
| :--- | :--- | :--- |
| 表格对齐（`\| :--- \| ----: \|` 文档） | `TH`/`TD` 都有 `style="text-align: right;"`，computed `textAlign: "right"`；`tableStyle: "min-width: 50px;"`（A1 `alignDom`；截图 `r48-table-align-editor.png`） | **已渲染（负结果）** |
| 同上：改一格再保存 | 点第 2 列第 1 行 → `End` → 打 `1`（`3200→32001`），`dirty:true`，`Ctrl+S` 后盘上仍是 `\| :--- \| -----: \|`（`savedHasLeftMarker:true`、`savedHasRightMarker:true`、`sourceAfterHead` 同）；整表被规范化成对齐空格的写法（`savedLen 73` vs `seedLen 62`） | **对齐不丢（负结果）**；只是没有工具条入口 |
| 脚注（`正文引用[^1]…` + 两条定义） | 编辑视图 `<p>正文里的引用[^1]，还有第二处[^2]。</p>`，`sup:0`、`anchors:0`；预览 `sup:0`、`anchors:0`，文本尾部多出「注释」+ 两条定义（`A2`；截图 `r48-footnote-editor.png`、`r48-footnote-preview.png`） | **缺陷/缺口 F1** |
| frontmatter 文档 | 状态栏 chip `[{tag:"SPAN", text:"元数据", title:null, role:null}]`；`metaButtons:[]`；编辑区文本不含 `title:`，`hr:0`（`A3`；截图 `r48-frontmatter-statusbar.png`） | **缺入口 F4（复核）** |
| 代码块（`js` 围栏） | `preClass:""`、`codeClass:"language-js"`、`spanCount:0`、字色 `rgb(29, 32, 35)`、块内周边 `buttonCount:0`、`preHtml:"<pre><code class=\"language-js\">const a = 1</code></pre>"`（`A4`；截图 `r48-code-fence.png`） | **缺标签/复制/高亮 F3（复核）** |
| 代码块里按 Tab | 落在 `pre code` 里按 Tab：`active:"DIV"`（仍是 `.ProseMirror`）、`codeText:"const a = 1  "`（两个空格） | **正常（负结果）** |
| Mermaid 有效图 | `is-ready`，`pre.is-mermaid` 高 **80 px**，`.mermaid-preview` 高 **103 px**、`svg:1`、`buttonsInPreview:0`、全页「复制」按钮 `[]`（B1；截图 `r48-mermaid-both.png`） | **双份 F2（复核）** |
| 打印媒体（`emulateMedia:print`） | `preDisplay:"block"`（80 px）、`previewDisplay:"block"`（103 px）——两份都进 PDF（B1 `printDom`；截图 `r48-mermaid-print.png`） | 并入 F2 |
| Mermaid 坏语法 | 把围栏内容改成 `graph TD; A-->` 后：`stray:[]`、`bodyChildren:2`、`scrollHeight 900 == innerHeight 900`、`hasSyntaxError:false`（B1-bad；截图 `r48-mermaid-error.png`） | **第 47 轮修复有效（负结果）** |
| 大纲（5 个标题、2 个可折叠节点） | 折叠前 `rows:5`、`toggles:2`、`inputs:0`；点第一个三角后 `rows:2`、`expanded:["false"]`；切到别的文档再切回：`rows:5`、`expanded:["true","true"]`（自动展开回原状）（C1；截图 `r48-outline-collapsed.png`、`r48-outline.png`） | **缺过滤/全部折叠 F5**；跨文档折叠不保留 |
| 字数明细 | 点 `.stats-trigger` 打开，`dt` = 中日韩字 / 拉丁词 / 合计 / 字符 / 句 / 段 / 阅读 / 选区；Esc 关闭后焦点回 `.stats-trigger`（C2；截图 `r48-stats-detail.png`） | 正常；**缺「行」F6** |
| 插图（`shot.png` 1×1 PNG，经工具栏隐藏 input） | 盘上新增 `assets/mwksenfg-shot.png`；保存后 `.md` 为 `![shot.png](assets/mwksenfg-shot.png)`，`img.naturalWidth:1`、`alt:"shot.png"`（C3；截图 `r48-image-insert.png`） | **落盘规则固定、文件名被改写 F7**（并入第 8 条文档与 7 的背景） |

## 2. F1（P1，新）脚注引用不是上标、点不动；编辑与预览都不给「第几条 → 哪一段定义」的联系

**用户收益**：中文写作里脚注用于出处、补充说明。Typora 把 `[^1]` 渲染成上标数字，且支持「引用与定义之间快速跳转」（`.tmp/typora-ref/resources/Docs/Change Log.md:273`：`Support quick jump between footnote definitions and references.`）。Sidelight 现在两个视图都把 `[^1]` 当普通字符（`sup:0`、`anchors:0`），预览还额外在文末列出「注释 第一条脚注。第二条脚注。」——写的时候看不出第几条对应哪一段，读者也点不动。

**现状证据**：
- `.tmp/r48-typora-a.log` 的 `## a2-footnote`：`footDom: {editorText:"脚注\n\n正文里的引用[^1]，还有第二处[^2]。", sup:0, anchors:0, firstPhtml:"<p>正文里的引用[^1]，还有第二处[^2]。</p>"}`；`footPreview: {mode:"preview", sup:0, anchors:0, text:"…注释\n第一条脚注。\n第二条脚注。"}`。
- 截图：`shots/round-48/r48-footnote-editor.png`（编辑视图就是方括号）、`r48-footnote-preview.png`（预览末尾「注释」区）。
- 代码：`src/lib/footnotes.ts` 只做「定义块单独保存」的拆分与拼回；`src/App.tsx` 的编辑器里没有任何 `[^` 的装饰；`PreviewPane.tsx` 有 frontmatter/表格的渲染分支，脚注只在文末收定义。`docs/typora-gap.md:26` 的「行内引用还原」准确，但没写「不渲染」。

**实现要点**（最小档，不改字节）：
1. 新纯函数 `findFootnoteRefs(text)`（返回 `{label, from, to}`），只在文本块里、跳过代码围栏与行内代码，可 Node 单测。
2. 仿 Mermaid 的做法用 `Decoration.inline` 给 `[^1]` 套 `<sup class="fn-ref">1</sup>`，**只做 DOM 展示**；点击时按 label 找文末定义块并 `scrollIntoView` + 落光标；`key` 带 label 与位置防复用。
3. 预览面板同步：`PreviewPane` 里把 `[^N]` 换成 `<sup><a href="#fn-N">`，定义区 id 对齐。

**体积与风险**：约 60–90 行 + 2 条单测，<600 B gzip，零依赖。风险：① 不能写进 `.md`（只能装饰，保存必须仍是原字节——第 40/41 轮往返口径都要求逐字节）；② 不能误伤代码里的 `[^1]`、链接文本、脚注定义行本身；③ 与查找高亮装饰叠加时的优先级要实测。

## 3. F2（P2，第 47 轮 F3 复核仍未修）Mermaid 源码与图双份，打印/PDF 也是两份

**用户收益**：本轮实测一张 3 行图：`pre` 80 px + 图 103 px，合计约 183 px；十张图就是近 2000 px 的额外滚动。打印/另存 PDF 同样两份（`preDisplay:block` + `previewDisplay:block`），Typora 是渲染后隐藏源码、点图再编辑（`docs/iteration/typora-features.md:43`）。

**现状证据**：B1 的 `mermaidDom`（`preHeight:80`、`previewHeight:103`、`svg:1`、`previewClass:"mermaid-preview ProseMirror-widget is-ready"`）；`printDom`；截图 `r48-mermaid-both.png`、`r48-mermaid-print.png`。代码：`src/lib/mermaidPreview.ts:78-87` 只挂 widget，`Decoration.node(..., {class:'is-mermaid'})` 没有折叠逻辑；预览内 `buttonsInPreview:0`，全页无「复制」按钮。

**实现要点**：
1. 渲染完成（`is-ready`）时给相邻 `pre` 加 `data-mermaid-collapsed="true"`，CSS 收成一行「源码（graph LR）▸」，点击展开；纯 CSS 折叠无法跨兄弟节点选择，建议由 `makePreview` 在 `applyContent` 时给前一个兄弟 `pre` 设置属性（装饰 DOM，不进文档）。
2. `@media print` 下强制折叠，PDF 只出图。
3. 预览图角上加「复制源码」小按钮（`navigator.clipboard.writeText(block.code)`），失败走现有 toast。

**体积与风险**：约 30–50 行（CSS 为主），<500 B gzip。风险：折叠后光标要能进代码块改源码（点开即可）；查找命中在折叠块里要自动展开；不要动第 46 轮的 `renderKey`/`spec.key`（`mermaidPreview.ts:107-112`）。

## 4. F3（P2，第 47 轮 F5 复核仍未修）代码块没有语言标签、没有复制按钮、没有高亮

**现状证据**：A4 `codeDom`：`preClass:""`、`codeClass:"language-js"`、`spanCount:0`、`color:"rgb(29, 32, 35)"`（单色）、`buttonCount:0`；`package.json` 依赖仍只有 Tiptap 系 + katex + mermaid + react。截图 `r48-code-fence.png`。`docs/typora-gap.md` 的「缺的（9）」里没有这一行（第 33/36/47 轮三次记录，第 37 轮重写表时丢了）。

**实现要点**：最小档 0 依赖（约 30 行）：从 `code.language-*` 读语言名，在 `pre` 角上渲染 chip + 「复制代码」按钮；点击用 `navigator.clipboard.writeText(pre.innerText)`，按钮不能把光标移出代码块。高亮档要引 `lowlight`（约 20–30 KB gzip）并继续惰性加载，首屏当前 293,751 B、余量 26,249 B，需产品负责人批。

## 5. F4（P2，第 47 轮 F4 复核仍未修）编辑视图没有 frontmatter 入口

**现状证据**：A3：`chips:[{tag:"SPAN", cls:"status-chip status-chip-quiet", text:"元数据", title:null, role:null}]`、`metaButtons:[]`、`frontmatterInEditor:false`。代码：`src/components/StatusBar.tsx:57` 是纯 `<span>`；`src/App.tsx:5184-5186` 只传 `hasFrontmatter`。截图 `r48-frontmatter-statusbar.png`。

**实现要点**：chip 改 `<button aria-haspopup="dialog" aria-expanded>` → 只读 YAML 对话框（复用 `ShortcutsDialog`/`useDialogFocus` 的壳与样式），底部「在源码里编辑」调 `enterSourceFor`；关闭后焦点回按钮。不要动的：YAML 不能进 Tiptap 文档树（会破坏「frontmatter 单独保存、逐字节一致」，第 31/32/43/47 轮都验过）。

**体积与风险**：约 40–60 行，<600 B gzip。风险：对话框开着时自动保存/关窗守卫（`App.tsx` 的 `dialogOpen` 聚合）要一起加；YAML 只读展示别 trim 掉列表缩进。

## 6. F5（P2，新）大纲缺过滤框与「全部折叠/全部展开」，跨文档切回折叠丢失

**用户收益**：长文 50+ 标题时，大纲只能滚；Typora 的 `#outline-menu` 有 `Filter`、`Expand All`、`Collapse All`、`Collapsible Outline` / `Flat Outline`（`.tmp/typora-ref/resources/window.html` 的 `id="outline-menu"` 菜单项）。本轮实测 Sidelight `inputs:0`，只有 2 个逐个标题的三角按钮；折叠后再切走再切回，`expanded` 回到 `["true","true"]`（`Outline.tsx:20-22` 的 `expandAncestors` 因当前节变化自动展开）。

**现状证据**：C1 `outline0/outline1/outline2`；截图 `r48-outline-collapsed.png`、`r48-outline.png`。

**实现要点**：`Outline.tsx` 顶部加 `<input type="search" aria-label="过滤标题">`，过滤只影响可见行、不改折叠集合；加两个按钮「全部折叠 / 全部展开」调 `outlineTree.ts` 的纯函数（可单测）。跨文档折叠要不要按文件名存内存 Map，属于产品取舍：当前自动展开是「当前节不能消失」的合理行为，**过滤框是主要收益**。

**体积与风险**：约 50 行 + 2 条单测，<700 B gzip。风险：过滤时 `activeId` 可能被筛掉，要回退到「过滤结果里最接近的祖先」；键盘 Tab 顺序要连着读。

## 7. F6（P2，新，缺口细化）字数明细缺「行」；拼写检查整个不在表里

**用户收益**：Typora 状态栏字数面板是「Minutes / Lines / Words / Characters」+「In Selection: Words / Characters」（`window.html` 的 `#footer-word-count-info` 里 `footer-line-count-td` 等）。Sidelight 的字数明细更细（中日韩字、拉丁词、合计、字符、句、段、阅读、选区），但独缺「行」——按行数估进度（投稿字数按行/稿纸算）时没有数。

**现状证据**：C2 `terms:["中日韩字","拉丁词","合计","字符","句","段","阅读","选区"]`；截图 `r48-stats-detail.png`。代码 `src/components/StatsDetail.tsx:82-90` 的 `rows` 数组没有行数项。

**实现要点**：`rows` 加 `['行', String(text.split('\n').length), '按换行切分；源码模式按源码原文行数']`，与「段」并列；单测放进 `wordcount.test.ts`。

## 8. F7（P2，新，缺口细化）表格工具条没有移动行/列与对齐设置

**用户收益**：Typora 表格右键菜单有 Add Row Above/Below、**Move Row Up/Down（Alt+↑/↓）**、**Move Column Left/Right（Alt+←/→）**、Delete Row/Column、Copy Table、Prettify Source Code（`window.html` 的 `id="table-menu"`）。Sidelight 只有 7 个按钮（上插入/下插入/左插入/右插入/删行/删列/删表，`src/App.tsx:4899-4920`），没有移动、没有对齐。对齐本身是支持的（A1：`th`/`td` 有 `text-align`，保存后 `:---` / `-----:` 保留），缺的只是入口。

**实现要点**：
1. 对齐三项最省：Tiptap 3 的 `TableCell`/`TableHeader` **内置 `align` 属性**（`node_modules/@tiptap/extension-table/dist/index.js:126` 的 `align: createAlignAttribute()`，`parseAlign` 优先读内联 `text-align`），所以给当前列批量 `setNodeMarkup` 设 `align: 'left' | 'center' | 'right'` 即可，序列化已会产出 `:---` / `:---:` / `---:`（A1 的保存读数就是证据）。
2. 移动行列要自写 `moveRow`/`moveColumn` 命令（换 `tr` 内容 + 映射选区），约 40 行，建议单独一轮做并配 E2E（移动后保存字节、撤销一次还原）。

## 9. F8（P2，文档）两份 Typora 文档仍过期；差距表计数与真缺口不一致

**现状**（本轮逐条复核）：

| 文件:行 | 现在写的 | 实际 |
| :--- | :--- | :--- |
| `docs/iteration/typora-features.md:43` | 「不能折叠大纲」 | 有折叠（本轮 C1：`rows 5→2`、`aria-expanded:false`） |
| `docs/iteration/typora-features.md:44` | 源码模式「有，但无键位」 | `Ctrl+/` 可用（第 27 轮起；本轮 A 脚本的 `readSource` 全靠它，反复成功） |
| `docs/iteration/typora-features.md:51` | 快速打开「无」 | `Ctrl+P` 有（第 27/46 轮实测） |
| `docs/iteration/typora-features.md:98`、`:109` | 「源码模式 Ctrl+/ 现在只能点按钮」 | 同上 |
| `docs/typora-gap.md` 缺的 9 行 | 计数与表格一致（本轮数：已有 32 行、缺 9 行） | 缺 4 行：**代码块语法高亮/语言标签**（第 33/36/47 轮记录）、**拼写检查**（Typora 有 `#footer-spell-check` 面板，含「Auto Detect Language / Disable Spell Check」「Select Spell Check Language」；Sidelight `src/App.tsx:820` 硬编码 `spellcheck:'false'`）、**图片落盘规则**（Typora 三种，`typora-features.md:47`；Sidelight 固定 `assets/` 且文件名加 base36 前缀，本轮 C3 读到 `assets/mwksenfg-shot.png`）、**大纲过滤/全部折叠**（本轮 C1 + Typora `#outline-menu`） |
| `docs/typora-gap.md:23`（图片行）、`:17`（字数行）、`:31`（表格行列） | 只写了已有能力 | 备注可补：图片无落盘规则选择；字数明细无「行」；表格无移动行列与对齐入口 |

**改动面**：两个 Markdown；README/AGENTS 的「32 项有、9 项缺」同步改为「32 / 13」。建议在 `typora-features.md` 顶部加一行「过期横幅（2026-11-17 第 48 轮核）」并按上表订正，避免 planner 第五次重复排 `Ctrl+P`/`Ctrl+/`/大纲折叠。

## 10. 试过、但判断没有问题的路径（负结果，防止下轮重复）

1. **表格对齐不丢**：`:---` / `-----:` 文档里改一个单元格值再保存，盘上分隔行仍是 `| :--- | -----: |`（A1）。编辑视图也按列渲染对齐（`text-align: right` 的内联样式）。缺的只有工具条入口（F7 第 1 档）。
2. **代码块里 Tab**：插两个空格、焦点仍在 `.ProseMirror`（A4 `tabInCode`）。
3. **Mermaid 错误图清理**：坏语法后 `stray:[]`、`bodyChildren:2`、无页级滚动、无 `Syntax error` 文本（B1-bad）——第 47 轮 T3 的修复有效，**不要再当缺陷排**。
4. **大纲折叠按钮**：`aria-expanded` 正确翻转、子项收起（`rows 5→2`）；「当前节被折叠自动展开祖先」是刻意行为（`Outline.tsx:20-22` 注释），不算缺陷。
5. **字数明细 Esc**：`Esc` 关闭后焦点回 `.stats-trigger`（C2），无焦点丢失。
6. **插图落盘与显示**：`assets/` 创建、二进制按字节写、正文写相对路径、`naturalWidth:1`（C3）——第 47 轮 T4 的修复有效。
7. **切换文档守卫**：脏文档点文件树会弹「这篇还有没保存的改动 / 取消 / 不保存 / 保存并切换」（本轮 A 脚本被它拦过一次，属预期设计，不是缺陷）。
8. **表格 Tab / 智能标点 / 行内 HTML** 本轮未重测，结论按第 47 轮记录保留（`docs/iteration/round-47/findings-typora.md` §8）。

## 11. 未验证 / 下一轮怎么补

- **宿主 WebView2 下的 F1/F2/F7**：本轮只在 CDP Chromium（dev server）里测；宿主里的上标装饰点击、打印对话框（`Ctrl+P` → 系统预览）、`Alt+↑` 是否被宿主吞掉都未测。补测：宿主打开带脚注/图的文档，点 `[^1]` 看是否滚到定义；`Ctrl+P` 看 PDF 是否只剩图。
- **F1 装饰与查找/批注叠加**：未做原型；`Decoration.inline` 与查找高亮、页边批注定位的优先级要实测。
- **F5 过滤框与键盘**：未实现；`activeId` 被过滤掉时的回退行为要定。
- **F7 移动行列的撤销语义**：未实现，未量字节与 `sl-parse-done`。
- **Typora 侧未重测**：本轮读的是 `.tmp/typora-ref` 的 `window.html`/`Docs` 静态文本（`typora-features.md:158-163` 已记录自动化注入的偏差），没有重新运行 Typora。

## 12. 截图（`shots/round-48/`，本轮 12 张）

| 文件 | 内容 |
| :--- | :--- |
| `r48-table-align-editor.png` | 对齐表：金额列右对齐（F7 背景；负结果） |
| `r48-footnote-editor.png` | 脚注引用在编辑视图是字面 `[^1]`（F1） |
| `r48-footnote-preview.png` | 预览：引用仍是字面，文末「注释」区（F1） |
| `r48-frontmatter-statusbar.png` | 状态栏「元数据」是 chip，无入口（F4） |
| `r48-code-fence.png` | 代码块：无语言标签、无复制、单色（F3） |
| `r48-mermaid-both.png` | 源码块 + 渲染图双份（F2） |
| `r48-mermaid-print.png` | 打印媒体下两份都在（F2） |
| `r48-mermaid-error.png` | 坏语法：无残留错误图（负结果） |
| `r48-outline-collapsed.png` | 大纲折叠后只剩两个顶级项（F5 背景） |
| `r48-outline.png` | 大纲面板：无过滤框（F5） |
| `r48-stats-detail.png` | 字数明细 8 项，缺「行」（F6） |
| `r48-image-insert.png` | 插图落盘 `assets/mwksenfg-shot.png`（F7/文档背景） |
