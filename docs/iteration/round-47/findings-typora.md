# 第 47 轮 Typora 对照与写作体验（finder-typora）

- 轮次参数：`round=47`、`nn=47`；轮前 `startSha=d429211164a6a94dfbcf6a580a857d9beb5371c6`（`git rev-parse HEAD` 实测一致）
- 环境：dev server `http://localhost:5175`（未另起、未重启）；CDP `9223`；每次 E2E 前 `node .tmp/reset.mjs 9223`；未启动 Edge、未 kill `msedge`、未 `browser.close()`、未 push、未碰 `release/`
- 只读：未改 `src/`、未改 `docs/` 旧文件、未 commit（`git status --porcelain` 只有 `?? docs/iteration/round-47/`、`?? shots/round-47/`）
- 本轮真跑 9 组路径、约 45 组读数（全部在真应用里，见 §1）：字号缩放 vs 整页缩放、快捷键一览与全屏、自动链接、行内代码与围栏里的智能标点、代码块高亮、Mermaid 有效/无效、表格 Tab、分隔线三种写法、Shift+Enter 往返、frontmatter 入口、F8/F9、打印媒体
- 脚本（只读）：`.tmp/e2e-r47-typora-a.mjs`（`.tmp/r47-typora-a.log`）、`-b.mjs`（`.tmp/r47-typora-b.log`）、`-c.mjs`（`.tmp/r47-typora-c.log`）、`-d.mjs`（`.tmp/r47-typora-d.log`）、`-e.mjs`（`.tmp/r47-typora-e.log`）、`-f.mjs`（`.tmp/r47-typora-f.log`）、`-g.mjs`（`.tmp/r47-typora-g.log`）、`-h.mjs`（`.tmp/r47-typora-h.log`，补拍源码模式截图）、`-i.mjs`（`.tmp/r47-typora-i.log`，残留节点与 body 高度的因果对照）；每个脚本 `page.close()` + `process.exit(0)`
- 截图：`shots/round-47/r47-*.png` 共 22 张（见 §9；与同目录其他 finder 的 `bug-*`/`code-*`/`r47-ui-*` 不混用）
- 控制台：只有第 42/44/45/46 轮已判为环境噪声的无栈 `Cannot read properties of undefined (reading 'id'/'url')` 与翻译扩展 `chrome-extension://…OfscreenTranslate` 噪声；产品代码本轮 **0 个新报错**

## 0. 结论先行（6 条可执行；1–4 为第 47 轮新发现，5–6 为复核与文档）

| # | 发现 | 级别 | 用户收益 | 改动面 |
| :--- | :--- | :--- | :--- | :--- |
| 1 | Mermaid 语法错误后，mermaid 自带错误图（炸弹 + `Syntax error in text / mermaid version 11.12.0`）残留在 `<body>` 直接子节点 `#dmermaid-preview-N`，滚到底可见；**切到无图文档也不消失**，整页多出滚动条 | P1（新） | 写错图语法后页面底部永远挂一句英文报错和炸弹图，用户以为应用坏了；重载前一直在 | `mermaidLazy.ts` 渲染入口加 `suppressErrorRendering` 或清理 `#d<id>`，约 5 行 + 1 条断言 |
| 2 | **反引号写法的行内代码里，`--` / `...` 被智能标点改成 `—` / `…`**，保存后 `.md` 字节就是错的（`` `--dry-run` `` → `` `—dry-run` ``） | P1（新） | 命令行参数、版本号、正则片段被静默改写，复制出去的命令不能跑；用 `Ctrl+E` 建的代码反而不受影响，用户找不到规律 | `smartTyping.ts` 加「本行有未闭合反引号」判定，约 15 行 + 2 条单测 |
| 3 | Mermaid 渲染成功后**源码块与图同时显示**（pre 80 px + 图 70 px），打印/PDF 里也是「源码 + 图」两份 | P2（新） | 图多的长文里每个图占两倍高度；Typora 渲染后隐藏源码、点图再编辑 | `.mermaid-preview.is-ready` 时把相邻 `pre` 折成「源码」摘要行，约 30–50 行 |
| 4 | 编辑视图**看不到也改不了 frontmatter**：状态栏「元数据」是 `SPAN` 不是按钮，没有对话框、没有只读块；只能 `Ctrl+/` 进源码改 YAML | P2（新） | 改 tags/标题/日期要切源码、滚到文首、再切回来；预览里反而能看到（编辑视图没有） | 状态栏 chip 变按钮 + 只读 YAML 对话框 +「在源码里编辑」，约 40 行，不改字节 |
| 5 | 代码块**没有语法高亮也没有语言标签**（`code.language-js` 只做属性；无高亮库）；第 33/36 轮已报，`typora-gap.md` 第 37 轮重写时把这行丢了 | P2（复核未修） | 技术写作里代码块是一整段单色字；Typora 有 120+ 语言高亮 | 最小档「语言标签 + 复制」0 依赖约 30 行；高亮需引库，要产品负责人批 |
| 6 | 两份 Typora 文档仍过期：`typora-features.md:43/44/51/98/109`（第 46 轮 F9 已报未改）；`typora-gap.md:34/41/49` 需补注，「缺的（10）」漏了代码高亮与拼写检查两行 | P2（文档） | planner 照旧文档会重复排已做项、漏排真缺口 | 两个 Markdown，几分钟；README/AGENTS 的 31/10 计数同步 |

## 1. 跑过的路径与原始读数

| 路径 | 关键读数 | 判定 |
| :--- | :--- | :--- |
| `Ctrl+=` ×3 与 `Ctrl+-`、`Ctrl+Alt+0` | 正文 `17 → 20 → 19 → 17 px`（`--editor-size` 同步）；侧栏 `16 px`、状态栏 `12 px` **全程不动**；`rootZoom:1`（`.tmp/r47-typora-a.log` `A1_zoom`） | 只有正文字号缩放，无整页缩放（第 42/43 轮已报，不重复计） |
| 快捷键一览 | 点 `button[aria-label="快捷键"]` 打开；全文无「全屏 / F11」，也无 F8/F9；末尾仍有「Ctrl+N / Ctrl+O / Ctrl+Shift+S 被浏览器保留（新窗口 / 打开 / 另存网页），没有绑定」（`A2_fullscreen`，截图 `r47-shortcuts-dialog.png`） | 全屏与专注键位仍缺（重复，不单列） |
| 自动链接 | 打 `https://example.com/r47` 与裸域名 `example.org/a` 后都变 `<a href>`（`http://` 自动补全，`target=_blank`）（`A3_autolink`） | 正常（负结果，与 Typora 一致） |
| 行内代码旁敲 `--` / `...` | `` `--flag` `` → 代码内容 **`—flag`**；`` `a...b` `` → **`a…b`**；源码 `` `—flag` ``、`` `a…b` ``（`A4`、`C1`；截图 `r47-inline-code-punct-editor.png`、`r47-inline-code-punct-source.png`） | **缺陷 F2** |
| 对照：`Ctrl+E` 建的行内代码 | 同样打 `--flag`，代码内容保持 `--flag`，源码 `` `--flag` ``（`B5_ctrl_e_code`） | 守卫只在 mark 已生效时有效（F2 根因的证据） |
| 围栏代码块里的 `a--b ...c "d" --flag` | 原样保留，源码一字不动（`A4_smarttyping_fence`） | 正常（负结果） |
| 代码块（```js 与无语言） | `pre.className=""`、`code.className="language-js"`；`spanCount 0`、`tokenCount 0`、`anyToolbar 0`；字色单色 `rgb(29,32,35)`（`A5_code_highlight`；截图 `r47-code-fence.png`） | **缺高亮/标签 F5** |
| Mermaid 有效图 | `.mermaid-preview.mermaid-preview…is-ready` 1 个、SVG 1 个；`pre.is-mermaid` 源码块 **仍在**，pre 高 80 px、SVG 高 70 px（`A6_valid`、`B2_mermaid_both`；截图 `r47-mermaid-both.png`） | **源码与图双份 F3** |
| Mermaid 无效图 | 我们的 `is-error` 提示「图表没渲染出来，代码块内容仍是原文，可以继续编辑。」正常显示；但 DOM 里另有 `text.error-text → g → svg#mermaid-preview-1 → div#dmermaid-preview-1 → BODY` 两处可见英文文本；切到无图文档后 **仍在**；`bodyScrollHeight 1013 > innerHeight 900`（`A6_invalid`、`E1`–`E3`；截图 `r47-mermaid-error-stray-scrolled.png`） | **缺陷 F1** |
| 表格 Tab | 第 1 格 Tab 到第 2 格；连按 5 次到末格后 **再 Tab 自动加一行**（`tr 3 → 4`、格子 `9 → 12`），焦点仍留在表格；`.table-bar` 7 个按钮在（`A7_table_tab`；截图 `r47-table-tab.png`） | 正常（负结果，与 Typora 方向一致） |
| 输入规则：引用 / 有序列表 / 分隔线 | `> 引用` + Enter + Enter 正常退出引用（`blockquote:1`、后文段落在外）；`1. 第一项` + Enter 续成第二项（`ol` 1、`li` 2）；空段落里 `---`、`***`、`___` **不带** Enter/空格时不转换，带 Enter 或空格都得到 `hr:1`、源码写 `---`（`A8`、`F_*`） | 正常（负结果；我最初把「`***` 后不按 Enter」判成缺陷，复测后撤回，见 §8 第 3 条） |
| Shift+Enter 硬换行 | 正文写 `第一行  \n第二行`、列表写 `- 列表项一  \n续行`；重新解析后正文是 `<p>第一行<br>第二行</p>`、列表是 `<li><p>…<br>续行</p></li>`，源码与输入一致（`B1`、`C3`；截图 `r47-shift-enter.png`、`r47-list-hardbreak.png`） | 正常（负结果，往返稳定） |
| frontmatter 文档 | 状态栏只有 1 个按钮（字数），「元数据」是 `SPAN`、`title=""`；全页无「元数据/frontmatter」按钮；编辑器正文只有标题与内容；源码里有 YAML。预览（`Ctrl+Shift+P`）里 YAML 显示成块（`B3`、`C4`；截图 `r47-frontmatter.png`、`r47-frontmatter-preview.png`） | **缺入口 F4** |
| F8 / F9 | 按 F8、F9 后 `.app` class 仍是 `app`（无 `focus-mode`），状态栏无「专注/打字机」chip（`B4_f8_f9`；截图 `r47-f8-f9.png`） | 缺键位（第 30/31/41/43 轮已报，不重复计） |
| 打印媒体（`emulateMedia:print`） | 顶栏/工具栏/侧栏/页边/状态栏 `display:none`；`.mermaid-preview` 与 `pre` 都可见，宽度随 1440 铺开（`G2_print`；截图 `r47-print-media.png`） | 打印里也是「源码 + 图」双份（并入 F3） |

## 2. F1（P1，新）Mermaid 语法错误后，mermaid 自带的错误图残留成 `body` 子节点，切文档不消失

**用户收益**：Mermaid 语法写错是常态，尤其刚开始用图。现在页面上会同时出现两套错误信息：我们自己的中文提示条（正常、说清「代码还是原文」），以及 mermaid 库塞进 `#dmermaid-preview-1` 的一张「炸弹图标 + Syntax error in text + mermaid version 11.12.0」的英文图。后者不跟随文档生命周期：本轮实测**切到一篇完全没有图的文档后，它仍在 DOM 里可见**，而且把整页撑到 1013 px（可视 900 px），多出一条页面滚动条。截图 `r47-mermaid-error-stray-scrolled.png` 里能看到炸弹与两行英文停在状态栏下方。

**现状证据**：
- 日志 `.tmp/r47-typora-e.log`：
  - `E1_error_doc`：命中的父链是 `text.error-text → g → svg#mermaid-preview-1 → DIV.#dmermaid-preview-1 → BODY`，`visibility:visible`、`display:block`、`opacity:1`；
  - `E2_error_doc_scrolled`：`window.scrollTo(0,2000)` 后 `bodyScrollTop:113`，文本随页面滚进视野；
  - `E3_new_doc` / `E3_new_doc_scrolled`：重新载入一篇无图文档后 `hasMermaidWidget:0`，同一组错误文本仍在。
- 因果对照 `.tmp/r47-typora-i.log`（同一页面，三步量同一组数）：
  - `I0_blank`：`document.body.children` 只有 `DIV#root` 与 `SCRIPT`，`scrollHeight:900`（无页级滚动）；
  - `I1_after_error`：children 多出 `DIV#dmermaid-preview-1`，`scrollHeight:1013`；
  - `I2_stray`：该节点 `y:900`、`h:113`，正好落在视口下沿之外；
  - `I3_after_remove`：手动 `remove()` 后 children 回到两项、`scrollHeight` 回到 **900**。三个读数把「多出的 113 px 与页级滚动条」钉在这一个残留节点上。
- 早期读数 `.tmp/r47-typora-c.log` 的 `C4_frontmatter_preview` 也把这两行英文算进了 `document.body.innerText`，说明它在别的文档里也在。
- 代码：`src/lib/mermaidLazy.ts:126` 的 `mermaid.render('mermaid-preview-${renderSeq}', code)` 抛出后，`:131-134` 只把错误翻成一句话返回；mermaid 11 在 `render()` 失败时把错误 SVG 写进它自己创建、挂在 `body` 下的 `#d<renderId>` 容器，我们没有清理。我们自己的提示写进 widget 的那条链正常（`src/lib/mermaidPreview.ts:54-62` 记 `errorCache`，`:37-41` 写 `is-error` 文本）。

**实现要点**（最小档，二选一，建议两个都做）：
1. `ensureMermaid()` 里初始化时加 `suppressErrorRendering: true`（mermaid 11 支持该配置），让库不再往页面写错误图；错误语义仍由 `renderDiagram` 的 `{ error }` 承担。
2. `renderDiagram` 用 `try/finally` 在 `await mermaid.render(...)` 结束后删掉 `document.getElementById('d' + id)`（id 用局部变量保存，别用 `renderSeq` 现算），防止未来配置变化又漏出来。

**体积与风险**：约 5–8 行 + 1 条单测/断言，0 依赖，gzip < 100 B。风险：`suppressErrorRendering` 只影响错误路径；要确认正常 SVG 不受影响（`mermaidLazy.test.ts` 现有 4 条 + 本轮 `A6_valid` 的 SVG=1 是基线）。回归：切主题重绘（第 46 轮）与 `errorCache` 仍工作。

## 3. F2（P1，新）反引号行内代码里的 `--` / `...` 被智能标点改写，保存字节已错

**用户收益**：中文技术写作里 `` `--dry-run` ``、`` `a...b` `` 这类行内代码极常见（命令行参数、版本号、正则）。本轮实测：先在编辑视图打 `` 参数 `--dry-run` 与 `a...b` 结束 ``，屏幕上的行内代码已经变成 `—dry-run` 与 `a…b`；`Ctrl+/` 读源码是 `` 参数 `—dry-run` 与 `a…b` 结束 ``。也就是说 **Ctrl+S 会把破折号写进用户本想保持原样的代码**，复制出去的命令直接失效。更迷惑的是：用 `Ctrl+E` 先切代码再打 `--flag`，结果原样保留（`B5_ctrl_e_code` 的 `src` = `` `--flag` ``），两条路径行为不一致。

**现状证据**：
- `.tmp/r47-typora-a.log` 的 `A4_smarttyping_inline`：`codes:["—flag","a…b"]`，`inlineSource` = `` `—flag` `` / `` `a…b` ``；`.tmp/r47-typora-c.log` 的 `C1_inline_code_punct` 复现：`codes:["—dry-run","a…b"]`，源码 `` `—dry-run` ``；补拍脚本 `.tmp/r47-typora-h.log` 的 `H1_inline_code` 第三次复现（编辑视图 `codes:["—dry-run","a…b"]`、源码 `参数 `—dry-run` 与 `a…b` 结束`）。
- 截图：`shots/round-47/r47-inline-code-punct-editor.png`（编辑视图里就是破折号）、`r47-inline-code-punct-source.png`（**停在源码模式**拍的：textarea 里就是 `—dry-run` / `a…b`）。
- 根因：`src/lib/smartTyping.ts:95-103` 的守卫只看 `state.storedMarks ?? $from.marks()` 与 `rangeHasMark`。反引号写法下，输入 `--` 的瞬间 code mark **还没建立**——mark 是 `@tiptap` 的反引号输入规则在**收尾反引号**那一下才套到中间文字上的。于是 `:60-61` 的 `-- → —`、`:62` 的 `... → …` 先执行，收尾反引号再把被改过的文字包进代码。`Ctrl+E` 路径在打字前 mark 已生效，所以守卫命中（B5 的对照就是证据）。
- 另外：`***`/`___` 的复测说明智能标点本身在代码外工作正常（§8），所以这不是「标点功能坏了」，而是「代码围栏识别时机」的问题。

**实现要点**：
1. 在 `smartInput` 增加一个上下文参数（与现有 `lineBefore` 同路，只在这几种命中时才算）：光标前本行内**未转义反引号个数为奇数** → 视为「正在写行内代码」→ `return null`。实现上用 `parent.textBetween(0, offset)` 的 `lastIndexOf('`')` 判奇偶即可，不要每键全文扫描（1 MB 文档每键成本要守住）。
2. 也可在插件里先判 `state.doc.textBetween(lineStart, from)`，把结果传进纯函数；纯函数保持可单测。
3. 补单测：`未闭合反引号后的 -- / ... 不替换`、`闭合后普通段落仍替换`、`Ctrl+E 的 mark 路径由现有守卫兜住`。

**体积与风险**：约 15–20 行 + 2–3 条单测，<250 B gzip。风险：① `--` 在正文里仍要替换（已有 round 38 的 `|` 守卫先例，照同一条路走）；② 用户可能只想输入一个字面反引号（奇数判定会暂缓替换一个字符，收尾后如不再是代码则下个 `-` 仍会替换，影响可控）；③ 真机 IME 组合期间本来就有 `composing` 挡板，不改。

## 4. F3（P2，新）Mermaid 源码块与渲染图双份显示，打印/PDF 也是两份

**用户收益**：每张 Mermaid 图在编辑区里同时占「代码块 + 图」两块高度。本轮实测一张 3 行图：`pre` 高 80 px、图 70 px，合计约 150 px；10 张图的文章就多出 1500 px 的滚动。打印/另存 PDF 也一样：`emulateMedia:print` 下 `pre` 与 SVG 都 `display:block`，宽度铺到 1440（`G2_print`）。Typora 的做法是渲染后隐藏源码，点图再编辑（`typora-features.md:43` 的「块级在 Enter 或失焦后渲染」；`Draw Diagrams With Markdown.md` 还写明 HTML/PDF 导出包含渲染后的图）。

**现状证据**：
- `.tmp/r47-typora-b.log` 的 `B2_mermaid_both`：`preVisible:true`、`preHeight:80`、`svgHeight:70`、`bothVisible:true`、`preText:"graph LR\n  A[写] --> B[读]"`。
- 截图：`shots/round-47/r47-mermaid-both.png`（代码块在上、图在下）、`r47-print-media.png`（打印媒体下两份都在）。
- 代码：`src/lib/mermaidPreview.ts:78-87` 的 `makePreview()` 造 `.mermaid-preview` 装饰 widget，挂在代码块之后；代码块本身没有折叠/隐藏逻辑。

**实现要点**（最小档）：
1. CSS：`.ProseMirror pre.is-mermaid:has(+ .mermaid-preview.is-ready)` 之类不易跨兄弟节点直接命中，建议在 widget 上加 `data-mermaid-state="ready"`，并用一个小的 ProseMirror 装饰 class 给相邻 `pre` 加 `is-collapsed`（或直接由 `makePreview` 在挂载时给 `pre` 设 `data-rendered="true"`）。
2. 折叠成一行「源码（graph LR）」按钮，点击展开/收起；`@media print` 下强制折叠，避免 PDF 出现「源码 + 图」两份。
3. 不要动第 46 轮的 `renderKey`/`widget.spec.key` 与主题重绘逻辑（`Decoration.widget` 的 key 必须继续带 `pos` 与主题键）。

**体积与风险**：约 30–50 行（CSS 为主）<500 B gzip。风险：折叠后光标还能不能进代码块改源码（点按钮展开即可）；查找替换命中在折叠块里要不要自动展开；打印折叠要确认不影响「导出 HTML」（HTML 导出本来就不含图，见 ADR-0017:104）。

## 5. F4（P2，新）编辑视图看不到也改不了 frontmatter，只能进源码模式

**用户收益**：Sidelight 的设计是 frontmatter 不进正文（`docs/typora-gap.md:21`），但编辑视图里连只读展示都没有：本轮实测一篇带 `title/tags` 的文档，编辑视图正文只有标题与内容，状态栏「元数据」是 `SPAN`（无 `title`、无点击），全页没有任何「元数据/frontmatter」按钮；用户改 tags 必须记住 `Ctrl+/`、滚到文首、改 YAML、再 `Ctrl+/` 回来。预览里反而能看到 YAML（`PreviewPane.tsx:62` 的 `renderFrontmatter`），所以「预览能看到、写的时候看不到也改不了」是反直觉的。改 tags 是写作者的高频动作（发布、分类），收益明确。

**现状证据**：
- `.tmp/r47-typora-b.log` 的 `B3_frontmatter`：`barButtons:["4 字 · 阅读约 1 分钟"]`；`chip:[{tag:"SPAN",text:"元数据",title:""}]`；`metaButtons:[]`；`editorText:"正文\n\n内容。"`；`frontmatterVisible:false`；`sourceHasFrontmatter:true`。
- `.tmp/r47-typora-c.log` 的 `C4_frontmatter_preview`：预览面板文本 = `title: 元数据测试\ntags:\n  - 写作` + 正文；截图 `r47-frontmatter.png`、`r47-frontmatter-preview.png`。
- 代码：`src/components/StatusBar.tsx:57-58` 是纯 `<span>`；`src/App.tsx:5186` 只传 `hasFrontmatter`；全仓无 frontmatter 编辑器（只有 `splitFrontmatter/joinFrontmatter`）。

**实现要点**（两档，第一档就够）：
1. 状态栏「元数据」改成 `<button aria-haspopup="dialog">`，点开只读 YAML 对话框（复用 `ShortcutsDialog`/`SaveDialog` 的壳与 `useDialogFocus`），底部一个「在源码里编辑」按钮调 `enterSourceFor`；关闭后焦点回按钮。
2. 进阶：编辑视图顶部加一个不进入 ProseMirror 文档树的只读折叠块（显示 `title`/`tags` 摘要），仍然只读，保存字节不变。
3. 不要做的：把 YAML 塞进 Tiptap 文档（会破坏「frontmatter 单独保存、逐字节一致」的现有保证，第 31/32/43 轮都验过）。

**体积与风险**：约 40–60 行 + 复用现有对话框样式，<600 B gzip。风险：对话框打开时自动保存/关窗守卫（`App.tsx:3591` 已有 `dialogOpen` 聚合）；YAML 只读展示要保留原文缩进（别 trim 掉 `-` 的缩进）。

## 6. F5（P2，复核未修）代码块没有语法高亮，也没有语言标签

**用户收益**：技术写作/读书笔记里代码块是常客，现在是一整段单色字（`firstLineColor:rgb(29,32,35)`），语言只存在 `code.language-js` 属性里，编辑视图与预览都不显示。Typora 用 CodeMirror 支持 120+ 语言（`.tmp/typora-ref/resources/Docs/Code Fences Language Support.md`）。第 33 轮把「代码块语法高亮」列为新发现，第 36 轮复核（`findings-typora.md:22` 的 H5，`code.language-js`、全仓无高亮库），但第 37 轮重写 `typora-gap.md` 时这一行没进表，所以现在文档里看不出这个缺口。

**现状证据**：
- `.tmp/r47-typora-a.log` 的 `A5_code_highlight`：两个 `pre`，`codeClass:"language-js"` / `""`，`spanCount:0`、`tokenCount:0`、`anyToolbar:0`，字色单色；截图 `shots/round-47/r47-code-fence.png`。
- `package.json` 依赖只有 13 个（Tiptap 系 + katex + mermaid + react），没有 highlight/lowlight/shiki/prism。
- `docs/typora-gap.md` 的「缺的（10）」：行内 HTML、高亮/上下标/TOC/emoji、视图缩放、全屏、文件列表、拖入文件、图片缩放、全局搜索、主题、自定义快捷键——没有代码高亮。

**实现要点**：
1. 最小档（0 依赖，约 30 行）：给 `pre` 加语言标签（从 `code.language-*` 读）与「复制代码」按钮；标签用现有 chip 样式，复制用 `navigator.clipboard.writeText(pre.innerText)`，失败降级 toast。这能立刻缓解「看不出是什么语言」。
2. 高亮档：引 `lowlight`（约 20–30 KB gzip，要产品负责人批，且违反「不新增运行时依赖」默认线）；建议先做最小档，高亮单独评估。若做，必须继续惰性加载，首屏不加字节，且 `mermaid`/`katex` 围栏不套高亮。

**体积与风险**：最小档 <400 B gzip；高亮档要过首屏门（291 KB 当前余量 ~19 KB）与依赖审批。风险：语言标签不能进入 `.md` 字节（只做 DOM）；复制按钮的点击不能把光标移出代码块。

## 7. F6（P2，文档）两份 Typora 文档仍过期/缺行

| 文件:行 | 现在写的 | 实际（本轮复核） |
| :--- | :--- | :--- |
| `docs/iteration/typora-features.md:43` | 「不能折叠大纲」 | 第 29 轮就有折叠；本轮 `.outline-toggle` 的 `aria-expanded` 仍正常（`A2` 对话框/大纲均可用；第 46 轮 F9 已报） |
| `docs/iteration/typora-features.md:44` | 源码模式「有，但无键位」 | `Ctrl+/` 可用（本轮各脚本的 `seed()` 与 `readSource()` 全靠它，反复成功） |
| `docs/iteration/typora-features.md:51` | 快速打开「无」 | `Ctrl+P` 打开 `.quick-open`（第 46 轮已实测；本轮未重测） |
| `docs/iteration/typora-features.md:98`、`:109` | 「源码模式 Ctrl+/ 现在只能点按钮」 | 同上 |
| `docs/typora-gap.md:34` | Mermaid「预览面板与 HTML 导出不含图」 | 仍准确（ADR-0017:104 明确未做）；但**打印媒体下图在、源码也在**，可补一句 |
| `docs/typora-gap.md:41` | 粘贴为纯文本「浏览器原生键，桌面宿主未验证」 | 浏览器侧第 46 轮 B4 已实测可用，可去掉「浏览器原生键」的保留说法，保留「桌面宿主未验证」 |
| `docs/typora-gap.md:49` | 行内 HTML「保真但不渲染」 | 应补「预览与导出也不渲染」（第 46 轮 F2 的实测）；本轮未重测 |
| `docs/typora-gap.md:43`（「缺的（10）」计数） | 10 | 补「代码块语法高亮/语言标签」与「拼写检查」（第 41 轮 F4）后应为 12；README/AGENTS 的「31 项有、10 项缺」同步 |

**收益**：planner 读旧文档会重复排已做的快捷键（`Ctrl+P`/`Ctrl+/`/大纲折叠），并漏掉真缺口（代码高亮、拼写检查）。**改动面**：两个 Markdown；建议在 `typora-features.md` 顶部加一行「过期横幅（2026-11-17 第 47 轮核）」并按上表订正。

## 8. 试过、但判断没有问题的路径（负结果，防止下轮重复）

1. **自动链接**：`https://example.com/r47` 与裸域名 `example.org/a` 都即时变链接，`href` 正确（`A3_autolink`）。
2. **表格键盘**：Tab 逐格前进；末格再 Tab **自动加一行**（`tr 3→4`），焦点留在表格，`.table-bar` 7 个按钮在（`A7_table_tab`）。
3. **分隔线输入规则**：空段落里 `---`/`***`/`___` 不带 Enter/空格时不转换（源码把这几个字符转义成 `\*\*\*`/`\_\_\_`，是为了保持字面显示），**带 Enter 或空格都得到 `hr:1` 且源码写 `---`**（`F_*` 9 组）。我最初（`A8`、`C2`）把「`***` 后不按 Enter」判成缺陷，复测后撤回：Typora 的 `Markdown Reference.md` 也要求「Inputting `***` or `---` on a blank line and pressing `return`」。
4. **引用 / 有序列表**：`> 引用` + 两次 Enter 正常退出引用块；`1. 第一项` + Enter 续项（`A8`）。
5. **围栏代码里的标点**：`a--b ...c "d" --flag` 原样保留（`A4`）——智能标点只误伤反引号行内代码（F2）。
6. **Shift+Enter 硬换行往返**：正文写两空格软换行、列表项续行，重新解析后都还原为 `<br>`（`B1`、`C3`）。
7. **Mermaid 有效渲染**：1 个 SVG、`is-ready`；错误时我们自己的中文提示条正常（`A6`）。
8. **打印媒体**：顶栏/工具栏/侧栏/页边/状态栏都隐藏，图与代码块可见（`G2`）——图不丢，问题只是双份（F3）。
9. **前轮结论更正（非本轮缺陷）**：第 46 轮 F3 写「表格唯一入口是工具条，只在光标已在表里时出现」；代码里 `插入 ▾` 菜单第一项就是「表格」（`src/App.tsx:4705` 的 `chain.insertTable({rows:3, cols:3, withHeaderRow:true})`）。本行仅为代码证据（未点击实测），供 planner 不要据此重排入口。

## 9. 截图（`shots/round-47/`）

| 文件 | 内容 |
| :--- | :--- |
| `r47-inline-code-punct-editor.png` | 反引号行内代码里的 `—dry-run` / `a…b`（F2） |
| `r47-inline-code-punct-source.png` | 源码模式里同样是 `—dry-run` / `a…b`（F2 的直接证据） |
| `r47-mermaid-error-stray-scrolled.png` | 无效图后页面底部的炸弹 + `Syntax error in text / mermaid version 11.12.0`（F1） |
| `r47-mermaid-error-stray-top.png` / `-newdoc.png` | 同一残留：初始位置与切到无图文档后 |
| `r47-mermaid-error-repro.png` | 无效图的编辑视图（我们自己的中文提示正常） |
| `r47-after-mermaid-error-switch.png` | 切到无图文档后编辑区（残留图在视口外，DOM 里仍可见） |
| `r47-mermaid-both.png` | 有效图：代码块 + 图双份（F3） |
| `r47-print-media.png` | 打印媒体下源码与图都在（F3） |
| `r47-frontmatter.png` | 带 frontmatter 的编辑视图（看不到 YAML，状态栏只有「元数据」） |
| `r47-frontmatter-preview.png` | 同一文档的预览：YAML 显示成块（F4 对照） |
| `r47-code-fence.png` | 代码块无高亮、无语言标签（F5） |
| `r47-shortcuts-dialog.png` | 快捷键一览：无全屏 / F8 / F9 |
| `r47-zoom-body-font.png` | `Ctrl+=` 只放大正文（侧栏/状态栏不变） |
| `r47-table-tab.png` | 表格 Tab 到末格后自动加行 |
| `r47-autolink.png` | 自动链接（负结果） |
| `r47-stars-hr-editor.png` | `***` 输入中间态（未按 Enter） |
| `r47-shift-enter.png` / `r47-list-hardbreak.png` | Shift+Enter 往返（负结果） |
| `r47-mermaid-valid.png` | 有效 Mermaid 渲染 |

## 10. 未验证 / 下一轮怎么补

- **宿主 WebView2 下的 F1/F3**：本轮只在 CDP Chromium（dev server）里实测；宿主里 `body` 滚动、打印对话框、`requestFullscreen` 行为未测。补测：宿主打开一篇无效 Mermaid 文档，看窗口底部是否出现英文错误图；再 `Ctrl+P` 打印预览看是否两份。
- **真实中文 IME 下的 F2**：本轮键盘输入是 Playwright `keyboard.type`，没有组合态；实现修复后需真人用微软拼音在反引号行内代码里打 `--`，确认不误伤（`AGENTS.md` 未验清单已有 IME 项）。
- **F2 修复的回归面**：`smartTyping.test.ts` 现有多条；要确认「未闭合反引号」判定不会让正文里的 `--` 漏转换（例如 `代码 a`--b` 的场景本就不该转换，属预期）。
- **F4 的 UI 方案**未做原型；只读对话框的焦点顺序、Esc、与自动保存守卫的交互要实测。
- **F5 高亮档的体积**：未引库，未量 gzip；若产品负责人批，先按惰性 chunk 量首屏增量（当前 291 KB 余量约 19 KB）。
- **本轮未重测**：粘贴为纯文本（第 46 轮 B4）、行内 HTML 两态（第 46 轮 C1）、重开滚动位置（第 46 轮 C3）；结论仍按第 46 轮记录保留。
