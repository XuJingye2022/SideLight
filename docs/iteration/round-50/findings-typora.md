# 第 50 轮 Typora 对照与写作体验（finder-typora）

- 轮次参数：round=50，轮前 startSha=`6ae9be39ee5007da2ebcdffd636da21675dc6694`，dev server `http://localhost:5175`，CDP 9223。
- 只读：未改产品代码。本轮新增文件只有本报告、`.tmp/e2e-r50-typora*.mjs` 与 `shots/round-50/0*.png`、`shots/round-50/10-*.png`。
- 实测脚本：`.tmp/e2e-r50-typora.mjs`（7 条路径，假 FSA 文件夹「写作集」含 3 篇文档 + 可写句柄）、`.tmp/e2e-r50-typora-image.mjs`（单文件无工作区插图）。
- 截图：`shots/round-50/01-frontmatter-edit-view.png` … `10-single-file-image-base64.png`。
- 控制台：两段脚本各监听 `console.error` 与 `pageerror`，结果都是 `[]`（第 2 段 `consoleErrors: []`）。页面无请求失败。

## 结论先说

8 条可执行建议：**P1 四条**（单文件插图写 base64、源码模式无行号/行列、frontmatter 编辑视图不可见、全屏与整页缩放缺失），**P2 三条**（图片落盘规则写死、代码块无语言标签与复制、`==高亮==` 仍字面），**P2 文档一条**（`docs/iteration/typora-features.md` 现状列过期）。另核 `docs/typora-gap.md` 计数准确（32 / 9），但缺 4 条本轮实测的缺口。

---

## T1（P1）单文件模式插图把图片 base64 写进正文

- **用户收益**：不打开文件夹（双击 `.md` 打开、或只开一篇）是常见路径。现在贴一张 200 KB 截图，`.md` 会多出约 270 KB base64，文件体积、保存耗时、下次载入都变差，且这份 `.md` 换到别的编辑器里是一行巨长的 URL。
- **现状证据**：
  - 实测（`.tmp/e2e-r50-typora-image.mjs`，无工作区，向正文粘贴 1×1 PNG）：`imgCount:1`、`isDataUrl:true`、源码框 `![shot.png](data:image/png;base64,iVBORw0KGgoAAAANSU…`、`hasDataImage:true`、`totalLength:143`；截图 `shots/round-50/10-single-file-image-base64.png`。
  - 代码：`src/App.tsx:4133-4159`。有目录句柄走 `writeAsset`（`:4143`）；没有目录句柄时 `fileToDataUrl` 后 `setImage({ src: dataUrl })`（`:4153-4156`），只弹一条 3 秒提示「图片暂时内联在正文里」。
  - `docs/typora-gap.md:23` 只写「有文件夹句柄时写进 `assets/`」，没写无句柄会内联。
- **实现要点**：`App.tsx` 的 `insertImageFile` 里把「无句柄」分支改成三选一：① 取消插入；② 插入但不内联（写占位 `![](图片名.png)` 并提示「图片未落盘」）；③ 走宿主 `/__asset`（`docs/iteration/STATE.md:72` 第 ⑥ 项已在待办池）直接写到文档同级目录。最小改法：把 ② 做成默认，一次确认框（复用 `pendingConfirm` 三选一壳）。
- **体积与风险**：新增约 60 行 + 一个确认框分支，估算 +600…+900 B gzip。风险：三选一会打断写作流；② 会让正文出现暂时破图，需要可见占位（`assetImage.ts` 的「图片未找到」占位可复用）。
- **建议优先级**：P1（先修，数据体积风险）。可与 `STATE.md:72` 的宿主 `/__asset` 合并成一轮。

## T2（P1）源码模式是裸 `textarea`：无行号、无「行:列」

- **用户收益**：源码模式用于「改一行字、查一处标记」。长篇（数百行）里现在没有行号，也没有光标位置，改完回头找不到自己在哪；Typora 的源码模式是 CodeMirror，有行号与语法高亮。
- **现状证据**：
  - 实测（`元数据.md` 10 行）：`hasTextarea:true`、`taClasses:"source-editor"`、`gutters:0`（`.line-numbers/.cm-gutter/[class*=lineno]` 全 0）、字号 13 px 等宽。截图 `shots/round-50/02-source-mode-no-gutter.png`。
  - 代码：`src/App.tsx:5128-5133` 是受控 `<textarea className="source-editor" value={sourceText}>`；外层只有「源码模式 · 文件原文」与「回到富文本编辑」两个控件。
  - Typora 侧：`docs/iteration/typora-features.md:44`（源码模式左侧行号、语法高亮）、`shots/typora/61-source-mode.png`。
- **实现要点**：最小档（推荐先做）在状态栏加「第 N 行 · 共 M 行」：源码框 `onChange` 里用已有的 `sourceText` 数换行，O(n) 但只在该视图；或用 `selectionStart` 推行列，逐键成本低。第二档：`.source-editor` 左侧一条同步滚动的行号列（absolutely positioned div，`scrollTop` 同步），不做语法高亮（要引库，违反「不为功能引库」）。
- **体积与风险**：最小档 +300 B 左右；行号列 +1.2…1.5 KB。风险：行号列与换行折行（`soft wrap`）对不齐——行号列只按「逻辑行」算，折行时会错位，要么源码框关折行（`white-space: pre; overflow-x: auto`），要么不做行号只做「行:列」。
- **建议优先级**：P1（先做最小档）。

## T3（P1）frontmatter 在编辑视图完全不可见

- **用户收益**：带 YAML 的文档（博客、笔记模板）占写作场景不小。现在编辑视图里看不到、也改不了元数据；状态栏只有一个不可点的「元数据」小标签。改标题、改 tags 必须切源码模式，切回来又容易踩「源码改字后回编辑假脏」这类历史坑。
- **现状证据**：
  - 实测（`元数据.md`，frontmatter 4 行 + `# 周记` + 一段）：`innerTextHasTitle:false`、`innerTextHasTags:false`、`fmNodes:0`、首行 `"周记"`、编辑器高度 **92.89 px**（只排了标题与一段）。截图 `shots/round-50/01-frontmatter-edit-view.png`。
  - 状态栏只有标签：`src/components/StatusBar.tsx:57` `{hasFrontmatter && <span className="status-chip status-chip-quiet">元数据</span>}`，无 `onClick`。
  - 预览面板会渲染 frontmatter：`src/App.tsx:5136` 把 `frontmatter` 传给 `PreviewPane`；编辑视图不渲染。
  - `docs/typora-gap.md:21` 写「YAML frontmatter 有，单独保存不进编辑器」——按「不进编辑器」算特性，但它同时没把「编辑视图看不到」列成缺口。
- **实现要点**：编辑视图顶部加一条折叠条（`<details>` 或一行按钮「元数据 · 4 项」），点开用第 48 轮计划里的只读对话框壳（`ShortcutsDialog` 样式）显示 YAML 原文；保存链不动（`frontmatterRef` 已是唯一来源，`App.tsx:2838`）。第二档：折叠条里直接可编辑（要过 `splitFrontmatter`/`joinFrontmatter` 与字节护栏，风险高，不建议本轮）。
- **体积与风险**：+1.0…1.5 KB gzip。风险：与专注模式/空白文档首屏布局、与「载入即 dirty = false」的基线（只读展示不写回即可）。
- **建议优先级**：P1（第 48 轮计划 F4，一直顺延；本轮给出证据）。

## T4（P1）全屏与整页缩放缺失（`docs/typora-gap.md:56,57` 已列 P1，本轮补实测与落地冲突）

- **用户收益**：全屏写作去掉窗口边框与浏览器 UI；整页缩放让 1440 屏上想放大看的人不必改系统 DPI。现在只有正文字号缩放（12–26），工具栏/侧栏/状态栏不跟着变。
- **现状证据**（同一页面连续测）：
  - `F11` 后 `document.fullscreenElement = false`（无任何反应）。
  - `Ctrl+滚轮 -120×3` 后 `devicePixelRatio 1 → 1`、`root 16px → 16px`、正文 `17px → 17px`、`visualViewport.scale 1 → 1`（无任何反应）。
  - 对照：`Ctrl+=` 让正文 `17px → 18px`（字号缩放链路正常，`src/App.tsx:3819-3827`）。截图 `shots/round-50/03-after-ctrl-wheel-and-f11.png`。
  - `src/` 全目录 grep `requestFullscreen|fullscreen|F11` = 0 命中；grep `wheel` = 0 命中。
- **实现要点**：`html { --ui-scale }` + `calc()` 只缩 UI 尺寸（侧栏宽度、按钮高、状态栏字号），正文仍由 `--editor-size` 管；键位按 Typora 用 `Ctrl+Shift+=` / `Ctrl+Shift+-` / `Ctrl+Shift+0`。**注意冲突**：`App.tsx:3819` 的分支是 `mod && (key === '=' || key === '+')`，不判 `shiftKey`，所以 `Ctrl+Shift+=` 现在会被字号缩放吃掉；改 UI 缩放前要先在 3819/3824 两处加 `!event.shiftKey`。全屏用 `document.documentElement.requestFullscreen()`（WebView2 Chromium 支持），宿主侧确认 F11 没被 `AreBrowserAcceleratorKeysEnabled=false` 之后的宿主消息吃掉（UNVERIFIED）。
- **体积与风险**：+500…+800 B gzip（纯 CSS 变量 + 3 个键位分支）。风险：改 3819 的 shiftKey 判断会动到既有 keyboard 验收（`scripts/keyboard-acceptance.mjs`）；UI 缩放会让 1024 窄窗出现横向滚动，要给上限（90%–150%）。
- **建议优先级**：P1（gap 表已 P1，本轮补「先加 `!shiftKey`」这条落地前提）。

## T5（P2）图片落盘规则写死 `assets/`

- **用户收益**：静态站作者（Jekyll/Hugo）习惯「每篇一个 `${filename}.assets`」或 `_media` 目录；同一工作区里多篇文档共用 `assets/` 时，图片堆在一个目录里，搬走一篇要手动挑图。Typora 用前置设置 + 每篇 frontmatter 的 `typora-copy-images-to` 解决。
- **现状证据**：
  - 代码：`src/lib/asset.ts:40-52`，`writeAsset` 里 `getDirectoryHandle('assets', { create: true })`，返回路径固定 `assets/${fileName}`；`assetFileName`（`:29-37`）也没有按文档名分目录。
  - 调用点：`src/App.tsx:4143`。
  - 设置面板实测项：`["浅色","深色","跟随系统","自动保存（停笔 2 秒）","智能标点与自动配对括号","接口地址","API Key","模型","正文字号（12–26）","联网核对（可选）","批注提示词（作者偏好）","恢复默认","快捷键","取消","保存"]`，没有任何图片选项（`hasImageRule:false`）。截图 `shots/round-50/09-settings-panel.png`。
  - Typora 侧：`.tmp/typora-ref/resources/Docs/Use Images in Typora.md:52-68`（复制到指定目录、可写进 YAML `typora-copy-images-to`）。
- **实现要点**：`settings` 加 `imageFolderRule: 'assets' | '${filename}.assets' | 'custom'`，`writeAsset(dir, fileName, blob, rule, docName)` 里算出目录名后再 `getDirectoryHandle`。解析侧不用改：`src/lib/assetResolve.ts` 已支持任意相对路径（`resolveAssetSegments` 只处理 `segments`），第 39 轮起 `../` 与 `%20` 都能读。
- **体积与风险**：+400…+600 B gzip（设置面板一行 + 目录名计算）。风险：默认必须是现在的 `assets`（老文档不迁移）；`${filename}.assets` 里文档改名后目录不跟（Typora 同样不跟），要在设置项下写一行说明。
- **建议优先级**：P2（一轮内可做，等 T1 的 `/__asset` 一起）。

## T6（P2）代码块没有语言标签与复制按钮；Mermaid 图旁没有「复制源码」

- **用户收益**：技术写作里复制一段命令/代码是高频动作；现在只能手动拖选，容易漏或多带一行。Mermaid 图渲染成 SVG 后，源码还在上方代码块里（可选中），但渲染块本身没有「复制源码」入口。
- **现状证据**：实测 `图表与格式.md`：`svgCount:1`、`.ProseMirror` 内两个 `pre` 的 `buttons` 都是 `0`（`allButtonLabels: []`）；`[class*="lang"]` 命中的是代码文本本身，说明没有语言标签元素。截图 `shots/round-50/06-mermaid-and-code-block.png`。
- **实现要点**：编辑视图代码块用 NodeView（`src/components/` 下新增 CodeBlockView）在右上角渲染「语言 + 复制」两个小控件；复制走 `navigator.clipboard.writeText(view.state.doc.textBetween(...))`，失败退回 `document.execCommand('copy')` 或提示。语言从 Tiptap CodeBlock 的 `language` attr 取（fence info 已能往返，见第 39 轮表格/围栏测试）。Mermaid 渲染块（`src/lib/mermaidPreview.ts`）加一个「复制源码」按钮，读同一 fence 文本。
- **体积与风险**：+900…+1200 B gzip（NodeView + 两个按钮 + CSS）。风险：NodeView 换掉默认 code block 后要回归「打开→保存逐字节不变」与 `Ctrl+/` 源码一致；按钮要进 Tab 顺序并带 `aria-label`（第 42 轮工具条同类问题）。
- **建议优先级**：P2（第 48 轮曾排「F3 语言标签 + 复制」，一直没做；本轮确认仍缺）。

## T7（P2）`==高亮==` 仍按字面显示（`docs/typora-gap.md:50` 已列 P2，建议提前）

- **用户收益**：中文笔记里 `==重点==` 比 `<mark>重点</mark>` 常用得多。第 47 轮已让 `<mark>` 渲染真样式，但没人会为高亮打 HTML 标签。
- **现状证据**：实测在正文打 `这里 ==要突出== 的句子。` → `marks:0`、段落文本仍是 `这里 ==要突出== 的句子。`；`Ctrl+S` 后假盘字节 `.md` 里也是字面 `==`（未丢字符）。截图 `shots/round-50/07-eq-highlight-syntax.png`。
- **实现要点**：抄第 40 轮 `src/lib/tilde.ts` 的模式（marked 行内扩展把成对符号变 token，不成对留 text），新增 `src/lib/highlightSyntax.ts`：只认同一行内成对的 `==…==`，反引号/围栏/公式内不动；写回仍出 `==`（Markdown 序列化器加一条）。风险点：`===`（分隔线变体）要先排除，表格行（含 `|`）按第 38 轮 `lineBefore` 口径跳过。
- **体积与风险**：+700…+1000 B gzip + 单测。风险：漏一处序列化就会把 `==` 写成交替字符；必须先跑 `npm run roundtrip`。
- **建议优先级**：P2（gap 表 P2，但写作收益高于其它 P2；可与行内 HTML 一起做）。

## T8（P2，文档）`docs/iteration/typora-features.md` 的现状列过期；`docs/typora-gap.md` 缺 4 行

- **用户收益**：planner / critic 按这份报告排任务，过期行会导致重复排已做完的事（第 48 轮排「F3 语言标签 + 复制」，而 features 表把表格键盘、Ctrl+/、Ctrl+P 都写成缺）。
- **现状证据（逐条对照代码，都是「报告写无、实际已有」）**：
  - `typora-features.md:43` 第 2 行「不能折叠大纲」→ `src/components/Outline.tsx:17,49-56` 有 `collapsed` 状态与 `aria-expanded`；`docs/typora-gap.md:35` 也写「有」。
  - `typora-features.md:44` 第 3 行「源码模式…但无键位」→ `Ctrl+/` 已实现（`src/App.tsx:3792-3794` → `toggleSourceRef`，`docs/typora-gap.md:14`）。
  - `typora-features.md:46` 第 5 行「有工具条，无键盘走格/加行」→ 表格 Tab / Ctrl+Enter 已有（`docs/typora-gap.md:31`）。
  - `typora-features.md:51` 第 10 行「快速打开 无」→ Ctrl+P 已有（`docs/typora-gap.md:39`）。
  - 同文件 `:92-102`（§5.1 建议表）与 `:130-137`（§6 Top 8）整列过期（前 7 项都已完成）。
- **`docs/typora-gap.md` 计数核对**：标题「已经有的（32）」「缺的（9）」与表体一致——脚本数：`已经有的` 区 33 行表格行（1 行表头 + 32 数据行）、`缺的` 区 15 行（6 个分组表头 + 9 数据行）。所以计数本身不是问题；问题是**缺 4 条本轮实测的缺口**：
  1. frontmatter 在编辑视图不可见（T3）；
  2. 源码模式无行号/行列（T2）；
  3. 图片落盘规则不可配（T5）；
  4. 代码块无语言标签/复制（T6）。
  另「全屏」「视图缩放」已在缺的清单里（`:56,57`），本轮补了实测。修订后应为「已经有的（32）」「缺的（13）」，并同步 `AGENTS.md:74` 末尾「当前 32 项有、9 项缺」。
  （T1 单文件 base64 不是 Typora 能力差距，是产品缺陷，建议写进 `docs/qa-report.md` 或 STATE 待办，不进差距表。）
- **实现要点**：只改文档：features 表 4 行 + §5.1/§6 加一行「本节写于第 43 轮，下列项多数已完成，见 `docs/typora-gap.md`」；gap 表加 4 行并改两个标题数字；`AGENTS.md` 计数改 32/13。给过期文档加横幅比逐条改更省（第 49 轮已有先例）。
- **体积与风险**：产品体积 0 B。风险：无（要保证数字与表体行数一致，改完再数一遍）。
- **建议优先级**：P2（一次提交，可与其它文档批次同轮）。

---

## 试过、判断没有问题的路径（避免下轮重复）

1. **大纲折叠**：`长文.md` 40 个同级 `##` 下 `[class*="outline"] [aria-expanded]` 为 0。查代码后确认这是对的——`src/components/Outline.tsx:49-56` 只在「有子标题」时渲染折叠控件，40 个叶子标题没有折叠对象。**不是缺陷**，本轮没有截图 `04-outline-collapsed.png`（脚本在该分支跳过）。
2. **字数明细面板**（`shots/round-50/05-wordcount-panel.png`）：`中日韩字 400 / 拉丁词 80 / 合计 480 / 字符 582 / 句 40 / 段 40 / 阅读 2 分钟 / 选区 未选中文本`，并解释「段按正文文本块计：段落与列表项各算 1，标题与表格不计，代码块整块算 1」。Typora 0.11.18 的明细弹层在 `shots/typora/93-wordcount-popup.png` 里被 UAC 对话框挡住，无法逐项对照（UNVERIFIED），但 Sidelight 这套口径本身自洽，不报缺口。
3. **源码模式字数口径**：`src/App.tsx:5244` 是 `sourceMode ? countText(splitFrontmatter(sourceText).body) : stats`，即「源码去掉 frontmatter 后数」。实测 `元数据.md` 源码视图显示 `11 字`，与正文可见字数一致，与「源码原文 17 个汉字」不同但口径已明确（第 44 轮待办 ① 已落地）。**不报缺口**。
4. **富文本粘贴**：合成 `paste` 事件带 `text/html`（`<h2>` + `<strong>` + `<a>`）后 `strong:1`、`links:1`，标题变成纯文本。这与 Typora 文档 Quick Start.md:35-37 一致（默认保留样式、想纯文本要 `Ctrl+Shift+V`），Sidelight 的 `docs/typora-gap.md:41` 也按「浏览器原生键」记。真实 `Ctrl+Shift+V` 无法自动化（需要系统剪贴板）→ 仍记 UNVERIFIED，与既有记录一致。
5. **Mermaid 渲染**：`svgCount:1`，没有错误图残留（第 47 轮已修），代码块原文保留。除 T6 的复制入口外无问题。
6. **字号缩放键位**：`Ctrl+=` 生效（17→18 px）、`Ctrl+Alt+0` 复位在 `src/App.tsx:3829`，与 `docs/typora-gap.md:25` 的写法一致，非过期。

## UNVERIFIED

- WebView2 宿主里 `Ctrl+Shift+V`（粘贴为纯文本）是否到达页面：浏览器里由 Chromium 原生处理，自动化无法造系统剪贴板；补测方法：宿主内复制一段带样式的网页文本，按 `Ctrl+Shift+V`，看正文是否只有纯文本。
- 宿主内 `F11` / `Ctrl+Shift+=` 是否被宿主截获：本轮只测浏览器页面。补测：`host/` 起窗口后按 F11，看 `document.fullscreenElement`。
- Typora 0.11.18 代码块是否有复制按钮：`resources/Docs` 里 `Markdown Reference.md:136` 只提表格工具条的 copy，未提代码块；截图 `shots/typora/02-window-maximized.png` 可再核但本轮未逐像素看。T6 的「Typora 有」不作断言。
- 真实图片（200 KB 级）下的 base64 体积与保存耗时：本轮用 1×1 PNG 证明路径，未量真实截图。
