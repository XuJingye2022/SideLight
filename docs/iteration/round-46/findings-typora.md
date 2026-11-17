# 第 46 轮 Typora 对照与写作体验（finder-typora）

- 轮次参数：`round=46`、`nn=46`；轮前 startSha `39e4f0211f43b7edaca82d468d0997f029151e3c`（`git rev-parse HEAD` 实测一致，位于 `round-45` commit 之上）
- 环境：dev server `http://localhost:5175`（未另起、未重启）、CDP `9223`、每次 E2E 前 `node .tmp/reset.mjs 9223`；未启动 Edge、未 kill `msedge`、未 `browser.close()`、未 push、未碰 `release/`
- 只读：未改产品代码、未 commit
- 本轮真跑 11 条路径、约 30 组读数（全部在真应用里，见 §1）：无句柄粘贴图片、行内 HTML 两态、手打表格表头、富文本粘贴、URL 粘贴到选区、`Ctrl+Shift+V`、复制后的剪贴板、表格对齐往返、手打脚注、预览点外链、重开后的滚动位置、`---` 与智能标点、任务项预览、深色预览、`[toc]`、`Ctrl+P`/大纲折叠核实
- 脚本（只读）：`.tmp/e2e-r46-typora-a.mjs`（日志 `.tmp/r46-typora-a.log`）、`-b.mjs`（`.tmp/r46-typora-b.log`）、`-c.mjs`（`.tmp/r46-typora-c.log`）、`-d.mjs`（`.tmp/r46-typora-d.log`）、`-e.mjs`（`.tmp/r46-typora-e.log`）；每个脚本末尾 `page.close()` + `process.exit(0)`
- 截图：`shots/round-46/typora-*.png`（17 张，见 §10）
- 控制台：产品代码无新增报错；只有第 42/44/45 轮已判为环境噪声的无栈 `Cannot read properties of undefined (reading 'id'/'url')` 与翻译扩展 `chrome-extension://…OfscreenTranslate` 噪声（本轮同样出现，未计入发现）

## 0. 结论先行（9 条，全部本轮实测；与第 39–45 轮不重复）

| # | 发现 | 级别 | 用户收益 | 改动面 |
| :--- | :--- | :--- | :--- | :--- |
| 1 | 没有文件夹时粘贴图片，正文里塞进整张图的 base64（一张 481 KB 截图 → 642,006 字源码）；且 **超过 256 KiB 就完全不写浏览器草稿**，正是这类文档失去崩溃兜底 | P1 | 单文件用户（Typora 的默认用法）第一张截图就毁掉 .md 体积与草稿恢复 | `insertImageFile` 改「先提示选目录」+ `persistDocKey` 放宽/分片，约 60–100 行 |
| 2 | 行内 HTML（`<kbd> <mark> <sup> <u>`）在编辑视图**和预览**里都是字面 `&lt;kbd&gt;`；`typora-gap.md:49` 只写「保真但不渲染」，漏了预览与导出也不渲染 | P1 | 技术写作复制 `<kbd>Ctrl</kbd>` 后只能读到转义文本；Typora 渲染 | 预览/导出先过白名单，约 50 行；编辑视图另算 |
| 3 | 手打 Markdown 表头 `\| 甲 \| 乙 \|` 再按 Enter **不建表**，只留一行字面文本（Typora 官方文档明写这是建表方式） | P2 | 从 Typora 过来的第一个建表动作失效，必须去工具条点 | 表格 input rule，约 40–60 行 + 单测 |
| 4 | 表格工具条 7 个按钮全是有插入/删除，**没有列对齐**；而 `:---` / `:---:` / `---:` 三种对齐在往返里保得住（改单元格后原样写回） | P2 | 对齐只能进源码手写；既然能保真，补 3 个按钮不会坏文件 | 工具条加 3 个按钮 + 命令，约 50 行 |
| 5 | 选中富文本复制，剪贴板只有 `text/html` + `text/plain`（`**粗体**` 变成纯文字），**没有「复制为 Markdown」** | P2 | 把内容贴进别的 .md / issue / 聊天时格式全丢；Typora 有 Ctrl+Shift+C | `handleCopy`/菜单项复用序列化器，约 60–90 行 |
| 6 | 重新打开文档回到文首：滚到 1600 px 后 reload，正文恢复但 `scrollTop` 回 0 | P2 | 长文每次重开都要重新找位置；Typora 每篇记住滚动位置 | 存/取 `scrollTop`（`App.tsx` 仅 1 处 scrollTop，是打字机），约 30 行 |
| 7 | 图片落盘只有一条硬规则 `assets/<base36 时间戳>-原名.png`：没有相对路径模式、没有每篇 `${filename}.assets`、不读 `typora-copy-images-to` | P2 | 一个文件夹里几十篇共用一个大 `assets/`；搬走一篇文档时图不跟着走 | `asset.ts` 加规则枚举 + 设置项，约 80 行 |
| 8 | 手打 `[^1]` 不建脚注引用（无 `sup`、无脚注 UI），定义在编辑视图也不可见（第 44 轮 F4 仍在） | P2 | 写脚注要先写正文再进源码手补定义 | 脚注 input rule + 只读上标，约 60 行 |
| 9 | `docs/iteration/typora-features.md` 至少 5 处过期（第 43/44/45 轮已提，仍未改）：`:43` 折叠大纲、`:44` 源码无键位、`:51` 快速打开「无」、`:98`/`:109` 同上 | P2（文档） | planner 照旧文档会重复排已做的事 | 一个 Markdown，几分钟 |

## 1. 跑过的路径与原始读数

| 路径 | 关键读数 | 判定 |
| :--- | :--- | :--- |
| 无句柄粘贴 900×600 PNG | `pngBytes:481472`、`dataUrlLen:641986`；源码 `![截图.png](data:image/png;base64,i…` 共 **642,006 字**、`hasDataUrl:true`；toast「图片暂时内联在正文里；打开文件夹后再拖入，才会存成 assets 相对路径。」 | **内联 base64**（F1） |
| 同一文档的浏览器草稿 | 3.5 s 后 `localStorage`：`sidelight.doc.v1` 只有 60 字（空文档的旧值），含图正文一条都没写 | **草稿兜底失效**（F1，`App.tsx:642` 的 256 KiB 门） |
| 行内 HTML（编辑视图） | `innerText` 是 `按 <kbd>Ctrl</kbd> 保存…`，DOM `kbd/mark/sup/u` 各 **0** 个，`innerHTML` 是 `&lt;kbd&gt;` | **字面**（F2） |
| 行内 HTML（预览） | `view:"preview"`，同样 `kbd/mark/sup/u` 各 **0**、`kbdHtml:null`、`innerHTML` 也是 `&lt;kbd&gt;` | **预览也不渲染**（F2） |
| 手打 `\| 甲 \| 乙 \|` + Enter | `tables:0`、段落文本 `["\| 甲 \| 乙 \|",""]`、源码原样 | **不建表**（F3） |
| 富文本粘贴（`text/html` 带颜色/字号/表格） | 外链、`<b>`、`<i>`、列表、表格都转成 Markdown；内联样式全丢（无 `span`）；表格补一行空表头 `\|     \|     \|` | 可用（负结果） |
| 选中文字粘贴 URL | 选区「点我选中」变成 `<a href="https://example.com/a-b">` | 可用（负结果） |
| `Ctrl+Shift+V` | 粘贴后 `strong:0, em:0`；对照 `Ctrl+V` 是 `strong:1, em:1` | 可用（负结果，`typora-gap.md:41` 准确） |
| 复制后的剪贴板 | `text/plain:"这段有粗体和 代码。"`、`text/html:"<p data-pm-slice=…><strong>粗体</strong>…"`，**无 Markdown** | **缺「复制为 Markdown」**（F5） |
| 对齐表格改一个单元格 | 改前 `th` 是 `text-align:left/center/right`；改后源码仍是 `\| :--- \| :---: \| ---: \|`，正文 `3X` | **对齐保得住**（F4 的前提） |
| 表格工具条 | `.table-bar` 在，`count:7`、labels `上插入/下插入/左插入/右插入/删行/删列/删表`、`alignHits:0` | **无对齐按钮**（F4） |
| 手打 `正文一句[^1]` | DOM `sup:0`、`anchors:0`、脚注 UI 0 个；源码 `正文一句[^1]` | **不建脚注**（F8） |
| 预览点外链 | 预览里 `<a href="https://example.com/r46" target="_blank">`；点击后 `location.href` 仍是 `http://localhost:5175/` | 正常（负结果，新窗口打开） |
| 重开文档的阅读位置 | 滚到 `scrollTop:1600`，草稿 2,208 字；reload 后 `scrollTop:0`、60 段正文恢复 | **回文首**（F6） |
| `---` 与智能标点 | 空段落打 `---` → `hr:1`，源码 `---`；再打 `___` 不出 HR、源码 `\_\_\_`（转义） | 正常（负结果，第 44 轮结论复现） |
| 任务项在预览 | 编辑 `checkbox:2`、预览 `checkbox:2`，HTML 是 `ul[data-type=taskList] > li > label > input` | 正常（负结果） |
| 深色主题下的预览 | `theme:dark`、`pColor:rgb(233,230,224)`、`codeBg:rgb(34,48,46)`、`thBorder:rgb(42,46,51)`、`--paper:#15171a` | 正常（负结果，补齐第 40 轮 UNVERIFIED「深色预览」） |
| `[toc]` | 编辑与预览都留字面 `[toc]`，`links:0` | 缺（与 gap 表 P2 一致，本轮不单列） |
| `Ctrl+P` / 大纲折叠 / `Ctrl+/`（核过期文档） | `.quick-open` 打开、placeholder「按文件名或路径过滤」；大纲 4 行、折叠按钮 `aria-expanded:["true","true"]`；`Ctrl+/` 进 `view:"source"` | 三项都已实现（F9 的证据） |

## 2. P1 没有文件夹时粘贴图片：base64 进正文，草稿兜底同时失效

**用户收益**：Typora 最常见的用法是「单文件 + 图片自动落盘」。Sidelight 在无工作区时（首启空白文档、单文件打开）粘贴图片，会把整张图变成 `data:image/png;base64,…` 写进 Markdown 正文。本轮实测一张 **481,472 B** 的 PNG 变成 **641,986 字** 的 data URL，整篇源码 **642,006 字**（`.tmp/r46-typora-d.log` 的 `D2_inline_image`）。按 base64 膨胀 4/3 估算：一张 4 MB 手机截图 → 约 5.4 MB 正文，正好顶到 `App.tsx:2236` 的「超过 5.5 MiB」保存门与 `App.tsx:245` 的 6 MB 宿主载入上限——三张截图就把文档做成打不开的文件。

**更严重的一半**：`persistDocKey` 对超过 **256 KiB** 的正文直接 `return`（`src/App.tsx:640-648`，注释写「>256KiB 不写」）。实测同一文档 3.5 s 后 `localStorage` 里 `sidelight.doc.v1` 仍是 60 字（`D2_inline_image.state.keys`）。也就是说：**含一张截图的文档在浏览器里没有草稿兜底**，崩溃/误关就丢，而用户看到的 toast 只说「暂时内联在正文里」（`src/App.tsx:4110`），没有提丢失风险。

**现状证据**：
- 代码：`src/App.tsx:4087-4116` 的 `insertImageFile`：有目录句柄走 `writeAsset`，否则 `fileToDataUrl` + `setImage({ src: dataUrl })`。
- 读数：`.tmp/r46-typora-a.log` 的 `A5_image_paste`（`srcLen:641986`、`sourceLen:642015`、`sourceHasDataUrl:true`）；`.tmp/r46-typora-d.log` 的 `D2_inline_image`。
- 截图：`shots/round-46/typora-image-inline.png`（编辑视图里的图）、`shots/round-46/typora-inline-image-source.png`（源码里那条 `data:image/png;base64,i…`）。

**实现要点**（最小档）：
1. `insertImageFile` 没有 `dir` 时不 insert data URL，改为弹现有 `SaveDialog`/目录选择（或提示「先打开文件夹」并给出按钮），把「内联」改成显式选项而不是默认。
2. 确需内联时给一条可用路径：`persistDocKey` 对「含 data URL 的文档」不要把上限压到 256 KiB；最小改法是把草稿拆成「正文文本上限」+「图片单独键」，或对超过上限的文档写 IndexedDB（`session.ts` 已有 IndexedDB 用法）。
3. Typora 的做法可以照抄最小版：粘贴时先确定落盘目录（`Use Images in Typora.md` 的 `typora-copy-images-to` 段），Sidelight 已有 `assets/` 写入链，只差「没有句柄时不要内联」这一道闸。

**体积与风险**：不新增依赖；改动集中在 `App.tsx` 两个函数。风险：单文件用户会多一步选目录，必须把取消路径做通（取消后不清 dirty、不插入）。回归：`asset.test.ts` 的命名用例、第 39 轮占位与 `../` 解析、草稿恢复 57/57。

## 3. P1 行内 HTML 在编辑视图与只读预览里都不渲染

**用户收益**：技术写作里 `<kbd>`、`<mark>`、`<sup>`、`<u>` 是常用写法，Sidelight 文档自带的示例（`scripts/demo-folder.mjs` 里 `按 <kbd>Ctrl</kbd> + Enter`）也这么写。本轮实测：编辑视图 `innerText` 就是字面 `<kbd>Ctrl</kbd>`，DOM 里 `kbd/mark/sup/u` 各 0 个，`innerHTML` 是 `&lt;kbd&gt;`；**切到只读预览，同样 0 个、同样转义**（`.tmp/r46-typora-c.log` 的 `C1_inline_html`）。`docs/typora-gap.md:49` 只写「保真但不渲染」，没写「预览也不渲染」——用户按「预览应该能看渲染效果」的直觉会再次落空。

**现状证据**：
- 日志 `C1_inline_html`：`edit.kbd:0 / edit.innerHTML:"…&lt;kbd&gt;Ctrl&lt;/kbd&gt;…"`；`prev.kbd:0 / prev.innerHTML` 同上。
- 截图：`shots/round-46/typora-inline-html-edit.png`、`shots/round-46/typora-inline-html-preview.png`（两张几乎一模一样，是「预览也不渲染」的直接证据）。
- 渲染链：`PreviewPane.tsx:60-63` 用 `dangerouslySetInnerHTML` 喂 `bodyHtml`，`bodyHtml` 来自编辑器的 `getMarkdown`/HTML 序列化，HTML 在 `src/lib/html.ts` 的 `repairHtml` 里是按实体保护的。

**实现要点**（分两步，第一步就能兑现大部分收益）：
1. 预览 + HTML 导出：在 `renderBody`/`export.ts` 的渲染后处理里做白名单标签还原（`kbd mark sup sub u ins del small abbr br`），只对只读副本生效，正文节点与 .md 字节不动。
2. 编辑视图再进一步：用 inline atom/mark NodeView 渲染白名单标签，写回时仍输出原标签；不做也要保证第 1 步不破坏 `escapes.test.ts` 与第 41 轮的 `<` `>` `&` 保真（必须继续 0 处 `<` 被误还原）。

**体积与风险**：白名单约 40–60 行、<500 B gzip。风险：预览渲染的 HTML 来自用户文档，必须严格白名单（不还原 `<script>`、`<style>`、`on*` 属性）；导出侧同一条白名单。回归：`html.test.ts`、`escapes.test.ts`、第 41 轮 20 条假 FSA 种子里的「字面实体」用例。

## 4. P2 手打 Markdown 表格表头 + Enter 不建表

**用户收益**：Typora 官方文档（`.tmp/typora-ref/resources/Docs/Table Editing.md`「Create Table in Typora」）明确：写下 `|First Header | Second Header|` 再按 `Return` 就得到一张表。Sidelight 的 7 种输入规则里没有表格这一条：本轮打 `| 甲 | 乙 |` 再 Enter，`tables:0`，得到的是段落 `| 甲 | 乙 |` 加一个空段落（`.tmp/r46-typora-a.log` 的 `A2_typed_table`，截图 `shots/round-46/typora-typed-table.png`）。从 Typora 过来的人第一个建表动作就会落空。

**现状证据**：`A2_typed_table` 的 `res.tables:0`、`ps:["| 甲 | 乙 |",""]`、`source` 原样；表格唯一入口是工具条（`App.tsx` 的 `table-bar`，只在光标已在表里时出现，`C2` 首次探测也证实没有「插入表格」按钮产出）。

**实现要点**：在表格扩展旁加一条 input rule：段落文本匹配 `^\|(.+)\|$`（至少 2 个单元格，去掉首尾空）时，按 `Return` 把该段落换成 Table（表头 + 1 空行）。Typora 不要求分隔行，Sidelight 可同样接受「只有表头一行」。要复用 `Table` 的 `createTable` 命令，并保证：① 单元格文本原样搬进去；② 只有表头时补分隔行；③ 撤销一次回退。

**体积与风险**：约 40–60 行 + 3 条单测，<400 B gzip。风险：`|` 是正文常用符号（`a || b`、命令行），规则必须要求**整段只有一行且首尾都是 `|`**；与智能标点的「含 `|` 的行不做 `--` 转换」守卫（`smartTyping.ts:59`）不冲突。回归：`tableReuse` 整块复用、第 39 轮单元格 `<br>`。

## 5. P2 表格工具条没有列对齐（对齐本身能往返，补按钮安全）

**用户收益**：GFM 的列对齐（`:---` / `:---:` / `---:`）Typora 有对齐按钮，Sidelight 只能进源码手写。本轮实测 `.table-bar` 的 7 个按钮是 `上插入/下插入/左插入/右插入/删行/删列/删表`，`alignHits:0`（`.tmp/r46-typora-d.log` 的 `D1_table_bar`；代码 `src/App.tsx:4876-4901`，截图 `shots/round-46/typora-table-bar.png`）。

**关键前提已经验证过**：同一轮里 `B1_aligned_table` 显示，带对齐的表格**改一个单元格后仍原样写回** `| :--- | :---: | ---: |`（`shots/round-46/typora-table-align.png`）。所以补对齐按钮不会引入「改一次就丢对齐」的新数据损失，风险比想象的小。

**实现要点**：`table-bar` 的插入组与删除组之间加 3 个按钮（左/中/右对齐）＋「清除」；命令直接给表头与整列的 `th`/`td` 写 `text-align`，序列化侧已经有「对齐写回 `:---:`」的能力（B1 已证）；按钮 `aria-label` 与现有 `title` 风格一致，危险色不用于对齐。

**体积与风险**：约 50 行 CSS 复用现有按钮样式，<450 B gzip。风险：对齐只在表头/单元格 `style` 上，第 37 轮列宽也写在 `col` 上，两者不能互相覆盖；导出 HTML 已带 `text-align`（`export.test.ts` 有覆盖），要补一条 `:---:` 往返用例（B1 可改成单测）。

## 6. P2 没有「复制为 Markdown」

**用户收益**：写完一段要贴到别的 Markdown 文件、GitHub issue 或聊天里，选中的 `**粗体**` 复制出来只剩纯文字。本轮实测剪贴板两种 flavor：`text/plain:"这段有粗体和 代码。"`、`text/html:"…<strong>粗体</strong>…"`，**没有 `text/markdown`**（`.tmp/r46-typora-b.log` 的 `B3_copy_clipboard`）。Typora 的 Quick Start 有 Ctrl+Shift+C「Copy as Markdown」。

**现状证据**：`B3_copy_clipboard` 只有两条 flavor；代码里没有 `text/markdown`、没有 `handleCopy`（`src/App.tsx` 只有 `handlePaste`/`handleDrop`，`App.tsx:863-877`）。

**实现要点**：编辑器 `handleCopy`（或有选区时响应 `Ctrl+Shift+C`）把当前选区序列化成 Markdown：最小改法是临时把选区块内容喂给现有序列化链（`serializeDocument` 的 Markdown 侧是编辑器 `getMarkdown`，对 slice 不可直接用，需要 `markdownManager.serialize(node)`；`scripts/roundtrip` 已有 manager 可用于验证），写入 `text/markdown` 并同时保留 `text/plain`。菜单「导出」旁加一项「复制为 Markdown」，与 Typora 的 Ctrl+Shift+C 对齐。

**体积与风险**：约 60–90 行；不引依赖（manager 已在包里）。风险：slice 序列化会漏 frontmatter/脚注（选区本来就只该出正文），必须显式排除；`text/markdown` 在桌面宿主（WebView2）的剪贴板支持要单独验证。

## 7. P2 重开文档回到文首，没有阅读位置记忆

**用户收益**：长文重开（关掉再打开、或 reload 恢复草稿）要重新滚到上次的地方。本轮实测：滚到 `scrollTop:1600` 后 reload，正文 60 段恢复、`view:"edit"` 恢复，但 `scrollTop:0`（`.tmp/r46-typora-c.log` 的 `C3_reading_position`）。

**现状证据**：`C3_reading_position` 的 `before.scrollTop:1600` / `after.scrollTop:0`；代码侧 `src/App.tsx` 只有 **1 处** `scrollTop`（`:1876`，打字机模式居中），`src/lib/cache.ts`、`src/lib/session.ts`、`src/components/PreviewPane.tsx` 都是 **0 处**——全仓没有「记录/恢复滚动位置」的代码。

**实现要点**：在 `.doc-scroll` 上节流记录 `scrollTop`，按「文档路径（或 draftKey）」存进 `session`/`cache` 的现有存储层；载入完成后 rAF 里恢复一次，并在用户手动滚动后停止自动恢复。Typora 的行为是每篇独立记忆，切文档回来也在原处。

**体积与风险**：约 30 行，<300 B gzip。风险：恢复时要保证「大纲点击跳转」「查找命中跳转」优先于恢复；切到源码/预览再回来不要用旧值覆盖用户当前位置；`scrollTop` 数值在字号变化后会漂移，按段落比例存更稳。

## 8. P2 图片落盘只有一条 `assets/` 规则

**用户收益**：Typora 提供三种（`Use Images in Typora.md`）：默认用图片原路径、`Use relative path if possible`、以及「拷进指定目录」（含 frontmatter `typora-copy-images-to`）。Sidelight 写死一种：`assets/<base36 时间戳>-<安全名>.<ext>`（`src/lib/asset.ts:36` 的时间戳前缀、`:47` 的 `getDirectoryHandle('assets', { create: true })`、`:52` 返回 `assets/${fileName}`）。后果：一个工作区里所有文档共用一个扁平 `assets/`，几十篇以后既难找也难搬；文件名前缀让 `logo.png` 变成 `mg3k2-1-logo.png`，和作者原来引用的路径对不上。

**现状证据**：代码三行如上；命名单测在 `src/lib/asset.test.ts`。本轮无句柄路径已实测（§2），有句柄路径本轮未跑（要真目录句柄，属 `data-safety` 套件范围，第 38 轮已实测过写入正确）。

**实现要点**：`asset.ts` 加 `mode: 'assets' | 'relative' | 'filename'`；`writeAsset` 按模式选目录（`filename` 模式用 `${docName}.assets`），`assetFileName` 加 `keepName` 选项（去掉时间戳前缀，重名时加 `-2`）。设置里加三选一，默认保持现状 `assets`，不做破坏性变更；已有文档不受影响。

**体积与风险**：约 80 行 + 设置项；<700 B gzip。风险：改落盘规则会让同一篇文档的图片分散在两个目录，规则必须「按文档首次落盘时固定」，不能中途漂移；`assetResolve` 的解析前缀（第 38/39 轮）要同步识别新目录。

## 9. P2 手打 `[^1]` 不建脚注引用

**用户收益**：脚注是写作常用（Sidelight 自己的示例文档就写 `Markdown[^1]`）。本轮实测手打 `正文一句[^1]`：DOM `sup:0`、`anchors:0`、没有任何脚注 UI，源码原样 `[^1]`（`.tmp/r46-typora-b.log` 的 `B2_typed_footnote`，截图 `shots/round-46/typora-footnote-typed.png`）。配合第 44 轮 F4（定义在编辑视图不可见、`[^1]` 不是上标），脚注在编辑视图里从头到尾都不像脚注。

**现状证据**：`B2_typed_footnote`；第 44 轮 `round-44/findings-typora.md` F4 的 `editorHasDefinition:false` 仍在（本轮未复测定义可见性，只复测了输入路径）。

**实现要点**：最小档三件事，一次做完最省：① 输入 `[^…]` 时按「源码里的脚注定义集合」生成只读上标 NodeView，写回仍是 `[^n]`；② 编辑视图底部加只读「脚注」区显示定义文本（不可编辑即可）；③ 手打定义 `[^1]: 文本` 的 input rule 可以不做，先让现有定义可见。完整档才需要可编辑脚注区。

**体积与风险**：约 60 行；<600 B gzip。风险：`[^` 是正文合法文本（正则、数组下标），只在「同文档存在同名定义」时才渲染上标；序列化必须逐字节写回 `[^1]`（第 39 轮脚注链已保证定义块字节，别破坏）。

## 10. 文档过期（第 43/44/45 轮已提，仍未改）

`docs/iteration/typora-features.md` 本轮再核实一遍，至少 5 处与产品不符（本轮 `Ctrl+P`/`Ctrl+/`/大纲折叠都实测可用，见 §1 末行）：

| 行 | 现在写的 | 实际 |
| :--- | :--- | :--- |
| `:43` | 「已有树与大纲，不能切列表形态，**不能折叠大纲**」 | 大纲折叠第 29 轮就有，`docs/typora-gap.md:35` 也写「有」 |
| `:44` | 「有，但**无键位**」（源码模式） | `Ctrl+/` 可用（`src/App.tsx:3957`；本轮 `E_stale_claims.source`） |
| `:51` | 快速打开「**无**」 | `Ctrl+P` 打开 `.quick-open`（`App.tsx:3731`；本轮 `E_stale_claims.quick`） |
| `:98` | 「源码模式 Ctrl+/ \| **现在只能点按钮**」 | 同上 |
| `:109` | 「源码模式只有按钮 \| 差一个键位」 | 同上 |

`docs/typora-gap.md` 本轮核对到 2 处需要补一行（不是全错）：`:49` 行内 HTML 应补「预览与导出也不渲染」（第 3 节）；`:41` 粘贴为纯文本本轮浏览器实测可用，可以去掉「浏览器原生键」的保留说法并把「桌面宿主未验证」保留。

**用户收益**：planner 照旧文档排任务会重复排第 27 轮已做的快捷键，漏掉本轮真正的新缺口。**改动面**：一个 Markdown，`typora-features.md` 顶部加「过期横幅（2026-11-17，第 46 轮核）」并按上表订正 5 行；`typora-gap.md` 补 2 行说明。

## 11. 截图（`shots/round-46/`）

| 文件 | 内容 |
| :--- | :--- |
| `typora-image-inline.png` | 无文件夹粘贴图片后编辑视图（图在，但 src 是 data URL） |
| `typora-inline-image-source.png` | 源码模式里的 `![截图.png](data:image/png;base64,i…` |
| `typora-inline-html-edit.png` | 行内 HTML 在编辑视图：字面 `&lt;kbd&gt;` |
| `typora-inline-html-preview.png` | 同一文档的只读预览：同样字面（F2 的直接证据） |
| `typora-typed-table.png` | 手打 `\| 甲 \| 乙 \|` + Enter 后的段落 |
| `typora-table-bar.png` | 表格工具条 7 个按钮（无对齐） |
| `typora-table-align.png` | 对齐表格改单元格后仍 `:---:` |
| `typora-rich-paste.png` | 富文本粘贴结果（样式丢、结构在） |
| `typora-paste-url.png` | 粘贴 URL 到选区变链接 |
| `typora-tasklist-preview.png` | 预览里的任务项复选框 |
| `typora-dark-preview.png` | 深色主题下的预览面板 |
| `typora-footnote-typed.png` | 手打 `[^1]` 仍是字面 |
| `typora-preview-link-before.png` / `-after.png` | 预览点外链前后（未导航，`target=_blank`） |
| `typora-hr-dashes.png` | `---` 出 HR（智能标点未破坏） |
| `typora-toc.png` | `[toc]` 字面 |

## 12. 未验证 / 下一轮怎么补

- **有目录句柄时的图片落盘**（§8 的模式新增）：本轮没跑，需要真目录句柄；补测方法：走 `data-safety` 套件的假 FSA，或宿主里真实打开文件夹后粘贴两张同名图，看是否 `-2` 命名且不覆盖。
- **`Ctrl+Shift+C`（复制为 Markdown）在桌面 WebView2 的剪贴板**：本轮只在 Chromium CDP 里读了 Chromium 剪贴板；宿主侧需要 `host-smoke` 或真机验证。
- **含 base64 图片的 .md 真实保存**：本轮无句柄无法完成 Ctrl+S（会走系统 picker），642,006 字的写入体积是源码框读数推算，不是盘上实测；补测：打开文件夹后粘贴同一张图，看盘上 .md 字节数。
- **`[^1]` 上标化后的序列化字节**：本轮没做（功能未实现），实现后必须补「打开→保存逐字节」用例。
- **打印/导出里新白名单标签的样式**（§3 第 1 步实现后）：本轮只验证了「现在不渲染」。
- **图片内联路径的草稿上限改法**（§2 第 2 步）：256 KiB 这个门是第 8 轮以来一直存在的设计，改动前要先确认它挡的是配额而不是性能；本轮只记录了「超限即不写草稿」这一事实，没有改。
- 未测：真实 IME 下的 `|` 表格输入、真机高 DPI 下的表格列宽与对齐按钮布局、macOS 宿主。
