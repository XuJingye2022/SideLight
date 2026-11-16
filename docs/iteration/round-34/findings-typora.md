# 第 34 轮 · Typora 对照与写作体验（findings-typora）

- 角色：Typora 对照与写作体验侦察（只读产品代码；未改产品代码、未 push、未动 `release/`）
- 环境：Windows 11、dev server `http://localhost:5175`、CDP `127.0.0.1:9223`（每轮先 `node .tmp/reset.mjs 9223`）
- 基线：`main` @ `186dfeb`（第 33 轮后），版本 0.32.1
- 对照样本：`.tmp/typora-ref`（Typora 0.11.18 解包：`frame.js`、`window.html`、`Docs/`、`style/themes`）、`shots/typora/`（71 张）、`docs/typora-gap.md`、`docs/iteration/typora-features.md`
- 本轮脚本：`.tmp/e2e-r34-typora.mjs`（21 项断言，15 PASS，6 项失败已逐条分辨）、`.tmp/e2e-r34-typora2.mjs`（智能标点落点与链接入口探针）、`.tmp/e2e-r34-typora3.mjs`（表格列对齐保真探针）、`.tmp/e2e-r34-typora-shots.mjs`、`.tmp/e2e-r34-typora-shot3.mjs`（证据截图）
- 日志：`.tmp/e2e-r34-typora.log`、`e2e-r34-typora2.log`、`e2e-r34-typora3.log`、`e2e-r34-typora-shots.log`、`e2e-r34-typora-shot3.log`
- 截图：`shots/round-34/typora-pair-backspace.png`、`typora-link-editor.png`、`typora-tree-menu.png`、`typora-settings.png`
- 首屏（本轮实跑）：`node scripts/measure-first-screen.mjs` → `total raw=929933 gzip=285891 files=2 max=286000` **PASS**，余 **109 B**；安装包 `release\Sidelight-0.32.1-win-x64-setup.exe` **824,595 B**，距 850,000 B 硬线余 **25,405 B**

## 摘要

本轮实测 22 项（21 项断言 + 表格对齐保真探针），给出 **10 条可执行建议**（P1 三条、P2 七条）。**新发现 4 条**（链接不能打开、文件树无副本/资源管理器/排序、代码块无语言标签与复制、字数明细无「行」），**复提 6 条**（工作区图片破图、表格列宽拖拽、大纲全部折叠/过滤、查找大小写整词、禅模式/全屏、侧栏宽度），其中前两条第 32–33 轮已连续提过两次。第 33 轮的智能标点与自动配对**已落地并本轮实测通过**。

最值得排在下一轮的是**链接打开**：Typora 点链接展开编辑、`Ctrl+点击`在浏览器打开（`Docs/Markdown Reference.md:250`）；Sidelight 点链接只出编辑浮层（`LinkEditor.tsx:46-90` 只有「文字」「地址」两个输入框，无按钮），全仓库搜不到 `window.open`，宿主也没有 `NewWindowRequested`/`Process.Start`——**正文里的链接没有任何打开入口**。截图 `typora-link-editor.png` 就是全部交互。

字节约束比上轮更紧：首屏只剩 **109 B**，任何进主 chunk 的改动都要同轮省字节；懒加载 chunk 不计入首屏（`scripts/measure-first-screen.mjs` 只统计 `index.html` 直接引用的文件，照 KaTeX 的先例）。

`docs/typora-gap.md` 仍然过期（第 3 节给逐行修正），本轮复核结论与第 32、33 轮一致：应改为「已有 28 / 缺 15」。 

## 1. 本轮实测（Sidelight 现状）

方法：`node .tmp/reset.mjs 9223` → `installFakeWorkspace` 装假 FSA 工作区与固定文档 → 走产品自己的「打开文件夹 → 点文件」路径 → 真实键盘/鼠标。原值都在日志里。

| # | 行为 | 实测结果 | 证据 |
| :--- | :--- | :--- | :--- |
| 1 | 智能标点：双连字符 / 省略号（第 33 轮能力复核） | `a--b` → `a—b`，`c...d` → `c…d` | `e2e-r34-typora.log` → `## smart` |
| 2 | 智能标点：直引号（第 33 轮能力复核） | 探针单独跑：输入 `"引用"` → 正文 `“引用”`（首轮断言读错了段落，非产品问题） | `e2e-r34-typora2.log` → `## blocks` |
| 3 | 中文后半角标点（第 33 轮能力复核） | 输入 `配对测试:` → 正文 `配对测试：` | `e2e-r34-typora-shot3.log` → `## afterType` |
| 4 | 自动配对左括号 + 关闭符越过 | 输入 `(` 得 `()`；再输入 `)` 仍是 `()`，不重复插入 | `## smart` → `pair1`、`pair2` |
| 5 | **成对退格** | `()` 内按一次退格 → 只剩 `)`，左半边被删、右半边留存 | `## smart` → `pairBack: ")"`；`typora-pair-backspace.png` |
| 6 | 复制为 Markdown（Ctrl+Shift+C） | 剪贴板保持哨兵值 `__unchanged__`；`ShortcutsDialog.tsx` 无此行；`App.tsx` 无 `ClipboardItem`/`clipboard.write` 分支 | `## copyMarkdown` |
| 7 | 粘贴 Excel 式 HTML 表格 | 表格数 1 → 2，**粘贴成功**（首轮断言把「成功」写成失败） | `## pasteTable` → `pasteHtml.n=2` |
| 8 | 粘贴 TSV 纯文本（记事本表） | 表格数仍 2，**未生成表格**，按普通段落插入 | `## pasteTable` → `pasteTsv.n=2` |
| 9 | 表格列宽拖拽 | `.column-resize-handle` 0 个；工具条 7 个按钮 `上插入/下插入/左插入/右插入/删行/删列/删表`，无移动行列、无对齐、无复制表格 | `## table` |
| 10 | 表格列对齐（`:---:`）保真 | 载入后单元格 `text-align: left/right/center`；改一格保存后分隔行仍是 `\| :--- \| ---: \| :---: \|`，**对齐不丢** | `e2e-r34-typora3.log` → `## saved`、`## separator` |
| 11 | 工作区图片 | `src="assets/pic.png"` → 解析成 `http://localhost:5175/assets/pic.png`，`naturalWidth=0` → 破图 | `## image` |
| 12 | 大纲 | 逐条折叠仍在（第 29 轮；`Outline.tsx:52-69` 的 `outline-toggle`。本轮样本只有 1 个标题，重复现多级折叠，按第 33 轮实测 4 项/1 个 toggle 记）；无「全部折叠/全部展开/过滤」按钮，无过滤输入框 | `## outline` |
| 13 | 侧栏宽度 | `.sidebar` 218 px，`[class*="resiz"]`、`[role="separator"]` 均 0 | `## sidebar` |
| 14 | 查找条 | 5 个按钮：上一处/下一处/关闭/替换/全部替换；`aria-pressed` 0 个；`App.tsx:1737` 仍写死 `{ caseSensitive: false }` | `## find` |
| 15 | 文件树行菜单 | 右键只有「重命名」「删除（移到回收站）」；树头有 ＋新建（新建文件/新建文件夹）、刷新、更多；无创建副本、无复制路径、无在资源管理器中显示、无展开/折叠全部、无排序控件 | `## treeMenu`；`TreeActions.tsx:252-273`；`typora-tree-menu.png` |
| 16 | 链接打开 | 点正文链接只出就地编辑浮层（文字 + 地址 + 「普通链接用 Enter 保存，Esc 取消」），**没有「打开」入口**；`LinkEditor.tsx` 无打开按钮；`src/` 无 `window.open`（唯一外链 anchor 是批注来源 `MarginRail.tsx:191` 的 `target="_blank"`）；`host/` 无 `Process.Start`/`NewWindowRequested` | `typora-link-editor.png`；`e2e-r34-typora-shots.log` → `## linkUi` |
| 17 | 全屏 / 禅模式 | 工具条只有「专注」「打字机」「源码」「预览」；无全屏/禅模式按钮；页面里按 F11 不进 `document.fullscreenElement`（无头 CDP 下不可靠，见第 6 节） | `## fullscreen` |
| 18 | 代码块 | `pre` 内 span=0、无 `data-language`、无按钮；`class="language-javascript"` 在但没有任何标签或复制入口 | `## codeBlock` |
| 19 | 行内 HTML / Mermaid | `.ProseMirror` 内 `kbd`=0、`mark`=0；`pre svg`=0 | `## unrendered` |
| 20 | 字数明细 | 7 行：中日韩字/拉丁词/合计/字符/句/段/阅读 + 选区；**没有「行」**（Typora 底栏有 Lines） | `## stats`；`StatsDetail.tsx:82-88` |
| 21 | 设置里的图片落盘规则 | 设置对话框无图片目录选择；`asset.ts:47-52` 固定 `assets/` | `## settings`；`typora-settings.png` |
| 22 | 控制台 | 全程 0 error | `## errors` |

补充源码核对（不跑界面也能确认）：

- 文件树排序固定按名称：`src/lib/workspace.ts:106-107` 两行 `collator.compare(a.name, b.name)`；Typora 侧栏菜单有自然序/名称/修改时间三种（`window.html` 的 `ty-sort-by-natural-btn`、`ty-sort-by-date-btn`）。
- 表格列对齐解析与复用：`src/lib/tableReuse.ts:42-56` 的 `alignmentOf` 把分隔行对齐带进复用键；本轮实测改表格后仍保留对齐，**不要把它当数据丢失报**。
- 智能标点插件只有 `handleTextInput` 一个 prop（`src/lib/smartTyping.ts`），没有 `handleKeyDown`，所以退格不参与配对，这是第 5 项的根因。

## 2. 改进建议（按收益/成本排序）

**全轮字节前提**：首屏余 109 B，下列第 1、2、3、5 项若走主 chunk 必须先配省字节任务；第 4 项是懒加载 chunk，首屏 0 B。

### 2.1 工作区里的图片仍是破图（复提第 32、33 轮 2.1，三提） — P1，M

**用户收益**：截图、示意图、封面图是中文写作常规内容。Typora 默认按相对当前文件显示本地图，并可设「相对路径 / 任意目录 / `${filename}.assets`」（`Docs/Use Images in Typora.md`；`window.html` 的 `image-create-folder-confirm` 对话框）。Sidelight 插入时文件确实写进 `assets/`，但编辑器把相对路径按页面 URL 解析，用户只看到 `naturalWidth=0`。**这是唯一「看起来已经做了、实际不可用」的功能。**

**现状证据**：第 1 节第 11、21 项；`src/lib/asset.ts:47-52` 固定返回 `assets/<name>`；`src/App.tsx:730` 的 `Image.configure({ allowBase64: true })` 没有加载通道；`host/Program.cs` 只有 `/__doc`、`/__draft`、`/__recent`、`/__annotations` 四个路由（静态文件从 `wwwRoot` 的 dist 读）。

**实现要点**（与第 33 轮相同，补字节路径）：

1. 新文件 `src/lib/imageResolver.ts` 走**动态 import**（照 `katexLazy.ts`），首屏 0 B；`(dirHandle, relPath)` → Blob → object URL，`Map` 缓存 + LRU 32 条撤销。
2. `Image` 的 `addNodeView()`：DOM 仍是 `<img>`，`src` 用 blob URL，`data-md-src` 存原相对路径；`renderHTML` 与 Markdown 序列化继续读 `node.attrs.src`，**存盘字节不变**。
3. `host/Program.cs` 加 `/__asset?path=` 只读路由（限工作区内，出界 403），与 `/__doc` 同款校验；宿主里否则无解。
4. 顺带补落盘规则（体积 0，只改 `asset.ts` 与一个设置项）：`assets/`（现状）/ 与文档同级 / `${filename}.assets/`；`settings.ts` 加 `imageFolder`，设置文案在惰性 `SettingsDialog` chunk，不进首屏。
5. 可选：图片右键 25%–200% 缩放（Typora 的图片菜单有；`window.html` 的 `zoom-img-menu`），等显示修好再做。

**体积与风险**：解析器是懒 chunk，首屏 <100 B；NodeView 注册代码约 40 行会进主 chunk，需要同轮省字节（或把 NodeView 也包进扩展的 `addNodeView` 里动态加载）。风险：blob URL 生命周期（撤销后节点仍引用会闪空白）、大图内存、重开权限三态下句柄失效要降级为破图并给 `title`。

### 2.2 链接只能编辑，不能打开 — P1，S（新）

**用户收益**：文档里的参考链接、资料链接、图片出处，写作者要不定期点开核对。Typora 的行为是「点链接展开编辑，`Ctrl+点击` 在浏览器打开」（`Docs/Markdown Reference.md:250`）。Sidelight 现在点链接只出现编辑浮层，用户没有任何打开入口（第 1 节第 16 项，截图 `typora-link-editor.png`）。

**现状证据**：`src/components/LinkEditor.tsx:46-90` 只有「文字」「地址」两个 `input` 和一句提示，没有按钮；`src/` 全量搜索 `window.open` 为 0，正文链接没有任何打开通道；唯一的 `<a target="_blank">` 是批注来源 `src/components/MarginRail.tsx:191`（宿主没有 `NewWindowRequested` 处理，WebView2 里它是否真打开也未验）；`host/` 无 `Process.Start`、无 `ShellExecute`。

**实现要点**：

1. `LinkEditor` 加一个「打开 ↗」按钮（`aria-label="在浏览器中打开链接"`），只在 `href` 能过 `new URL()` 且协议是 http/https 时启用；`Enter` 仍是保存、`Ctrl+Enter` 或按钮打开，不改变现有键位。
2. 浏览器/开发态：`window.open(href, '_blank', 'noopener')`；宿主态：发一条 `sidelight:open-external` 的 `postMessage`，由 `host/Program.cs` 在 `WebMessageReceived` 里用 `Process.Start(new ProcessStartInfo(href) { UseShellExecute = true })` 打开，**只允许 http/https**，其余给可见错误。
3. `event.ctrlKey || event.metaKey` 的链接点击直达打开（Typora 同款），普通点击仍编辑。
4. 快捷键表加一行可选；`ShortcutsDialog` 已有分组，加一行约 30 B。
5. 测试：`LinkEditor` 纯逻辑抽成 `openableHref(href): string | null` 单测（http/https 通过、`javascript:`/`file:`/空 拒绝）；宿主分支记 UNVERIFIED（本机浏览器态）。

**体积与风险**：前端约 30 行 + 宿主约 15 行，首屏 <250 B，需同轮省字节。风险：`javascript:` 协议必须挡住；WebView2 里 `window.open` 会触发 `NewWindowRequested`，若宿主不处理就是静默无反应，所以要么统一走 postMessage，要么两条都接；macOS 的 `WKWebView` 打开外部链接另验。

### 2.3 表格列宽拖拽 + 键盘走格（复提第 32、33 轮 2.6，三提） — P1，M

**用户收益**：中文表格按内容长短自动分列常失衡（截图里 3 列都 `min-width:25px`）；写作者要么忍受挤压要么改源。Typora 光标在表内就出工具条、可拖列宽、可设列对齐（`Docs/Table Editing.md:46-66`）。Sidelight 工具条只有增删 7 个按钮（第 1 节第 9 项）。

**实现要点**（与第 33 轮同，补对齐结论）：

1. `Table.configure({ resizable: true, handleWidth: 5 })`；`styles.css` 加 `.column-resize-handle`。
2. **序列化必须剥 `colwidth`**：GFM 不表达列宽，不剥会让「保存前对比」每次报规范化。列对齐（`:---:`）已有保真（第 1 节第 10 项），不需要额外处理。
3. 列宽是视图态，重开回到自动布局，在 `title` 写一句。
4. 同轮可加「列对齐左/中/右」三按钮：`tableCell` 的 `align` 属性已由解析路径写入（`text-align`），改完要验证保存后分隔行是对应的 `:---`（现有 `tableReuse` 只在未改动时整块复用，改动后需确认 Tiptap 序列化会写对齐——**未验证**，实现前先跑 5 分钟探针）。

**体积与风险**：prosemirror-tables 的 `columnResizing` 段约 10.8 KB 未压缩，估 **+1.5–2 KB gzip**，**直接吃掉全部 109 B 余量且超线**。所以实现轮必须：先把 `Table.configure` 这段做成惰性（表格文档才加载），或同轮配一个省字节任务（如把 `SettingsDialog`/`ShortcutsDialog` 再拆、去掉未用字体子集）。风险：`tableReuse` 复用键只看 header/separator/rows，列宽不能进键。

### 2.4 代码块语言标签 + 复制按钮（0 依赖子集） — P2，S（新）

**用户收益**：技术写作、教程、脚本示例常带代码块。Sidelight 现在既没有语法高亮（第 1 节第 18 项），也没有语言标签与「复制」按钮；Typora 支持 30+ 语言高亮并可改语言（`Docs/Code Fences Language Support.md:1-30`）。高亮要引依赖（第 33 轮 2.5，等产品负责人），但**语言标签 + 复制按钮 0 依赖**，先把「这块是什么语言、怎么拿走」补上。

**实现要点**：

1. 照 `katexLazy` 思路，`CodeBlock` 的 NodeView 用动态 import 的 `src/lib/codeBlockUi.ts`：hover 时右上角显示语言名（`language-javascript` → `JavaScript`，未知语言显示原文）+「复制」按钮；点击写 `navigator.clipboard.writeText(node.textContent)`，成功后 1.5 秒「已复制」。
2. 语言名点击可下拉改语言（Typora 的 `md-fences-adv-panel`）：改 `node.attrs.language`，序列化 fence 行跟着变；第一版可以只做标签，下拉留 P2。
3. 复制按钮不能影响选区与光标；`aria-label` 齐全；`pre` 的 `renderHTML` 不变，**存盘字节不变**。

**体积与风险**：UI 部分做成懒 chunk，首屏 0 B；NodeView 注册约 15 行进主 chunk。风险：代码块内嵌套按钮会打断文本选择（用 `contenteditable=false` 的 float 按钮）；26 个语言别名映射要小表；`navigator.clipboard` 在 WebView2 里需要权限/焦点，失败要回 silent + `title` 提示。

### 2.5 成对退格（第 33 轮从 T1 移出的已知限制，本轮实测仍是缺口） — P2，S

**用户收益**：打 `(` 得 `()` 后，退一步想删掉整个空括号，现在要按两次退格，第一次只删左半边，留下孤零零的 `)`（第 1 节第 5 项，截图 `typora-pair-backspace.png`）。Typora 的自动配对带成对退格（`Docs/Change Log.md:432` 记过 quote auto pair 修复）。

**实现要点**：在 `smartTyping.ts` 加一个 `handleKeyDown`（只在 `Backspace`、空选区、光标左右正好是本插件产生的空配对 `()`/`[]`/`{}`/`“”`/`‘’` 时 `preventDefault` 一次删两侧）。判断「本插件产生」不必记账：只认「左右正好成对且中间无字符」即可；代码块/行内代码/IME 组合态跳过。

**体积与风险**：约 20–25 行 + 4 条单测，首屏约 150–250 B，**破 109 B 余量**，需同轮省字节或与别的改动共用一个省字节任务。风险：不要抢普通退格（非空配对必须放行）；表格单元格内也生效没问题；`反引号` 不配对，不参与。

### 2.6 大纲「全部折叠 / 全部展开 / 过滤」（复提第 33 轮 2.8） — P2，S

**用户收益**：长文几十个标题时逐条点三角很慢；写作者更常要「先收起全部分支看结构」。Typora 大纲右键有 Expand All / Collapse All / Filter（`window.html` 的 `outline-menu`）。Sidelight 只有逐条折叠（`Outline.tsx:52-69` 的 `outline-toggle`），没有全部入口（第 1 节第 12 项）。

**实现要点**：`Outline.tsx` 顶部两个按钮（`全部折叠` → `setCollapsed(new Set(hasChildren 的 id))`、`全部展开` → `new Set()`）；过滤输入框按标题文本不区分大小写匹配、命中项连同祖先显示、空结果给「没有匹配的标题」。折叠/过滤状态都只在会话内，别写 localStorage。

**体积与风险**：约 45 行 + 3 条 `outlineTree` 单测，首屏 <350 B（需省字节）。风险：过滤打开时 `aria-current` 仍要指向可见项；`expandAncestors` 与过滤的交互要测。

### 2.7 文件树：创建副本 / 在资源管理器中显示 / 按修改时间排序 — P2，M（新）

**用户收益**：写作者常用「复制一章当模板」「打开图片所在文件夹」「按最近改动找昨天的稿」。Typora 文件菜单有 Rename / Duplicate / Delete / Copy File Path / Open File Location / Expand All / Collapse All，侧栏底部有自然序/名称/修改时间排序（`window.html` 的 `file-menu`、`ty-sort-by-date-btn`；`Docs/Change Log.md:534` 记「support duplicate file in file tree」）。Sidelight 行菜单只有重命名/删除（第 1 节第 15 项），树固定按名称排序（`workspace.ts:106-107`）。

**实现要点**：

1. 「创建副本」：读原文件 → 同目录写 `名称 副本.md`（重名自动加序号）→ 刷新树并选中新文件；复用 `rename.ts` 的重名探测逻辑，走 `.sidelight` 之外的普通写入，不进 trash。
2. 「在资源管理器中显示」：浏览器态无解，宿主态发 `sidelight:reveal` 消息（`ShellExecute("explorer.exe", "/select," + path)`）；按钮只在宿主态出现或禁用并给 `title`。**宿主发路径有隐私面**，只发工作区内文件。
3. 排序：`settings.ts` 加 `treeSort: 'name' | 'mtime'`；`readDirectory` 需要 `lastModified`（`File.getFile()` 的 `lastModified` 已在假环境里，真实 FSA 也有），排序放 `workspace.ts` 纯函数并单测；只在「更多」菜单加两项，不新增工具栏。
4. 展开/折叠全部可顺手加在树头菜单（纯 UI 状态，`FileTree` 已有展开态集合）。

**体积与风险**：约 80–120 行 + 3–4 条单测；首屏取决于是否全塞进懒 chunk（`TreeActions` 已是懒加载 chunk，菜单项放进去首屏基本为 0）。风险：副本大文件要复用 `MAX_SIZE` 拒绝；`lastModified` 排序在假 FSA 下都相同，测试要注入固定 mtime；宿主 `explorer /select` 中文路径要引号与转义。

### 2.8 查找条「区分大小写 / 整词」 — P2，S（复提第 32、33 轮）

**用户收益**：查 `API`、`String`、`Ctrl+K` 时大小写不敏感会掺无关命中，替换容易改错。Typora 查找条有 Case Sensitive 与 Whole Word 两个按钮（`window.html` 的 `searchpanel-case-option-btn`、`searchpanel-word-option-btn`）。Sidelight：`App.tsx:1737` 写死 `{ caseSensitive: false }`，`FindBar.tsx` 只有 5 个按钮，`src/lib/find.ts:3,22-29` 已支持 `caseSensitive`（第 1 节第 14 项）。

**实现要点**：`FindBar` 加两个 `aria-pressed` 按钮；`FindOptions` 加 `wholeWord`（中文不做词边界，只在含拉丁词时启用或标注「仅对英文生效」）；`App.tsx:1737` 的选项改成 state。

**体积与风险**：约 40 行，首屏 <250 B（需省字节）。风险：查找高亮与替换全部要把选项一起传下去，漏一处就静默不对称。

### 2.9 禅模式 / 全屏 — P2，S（复提第 32、33 轮）

**用户收益**：写作时去掉侧栏、工具栏、状态栏。Typora 有 F11 与 `typora-fullscreen`（`typora-features.md:72`）。Sidelight 现在只有「专注」「打字机」（第 1 节第 17 项）。`document.fullscreenEnabled === true`，但无头 CDP 下 F11 不进 fullscreen，宿主里行为未验。

**实现要点**：纯前端禅模式 —— `html.zen` 隐藏 `.sidebar`、`.toolbar`、`.status-bar`，保留 `.margin-rail`（批注可达）与查找条；`Esc` 退出；入口加在视图按钮组，快捷键 `Ctrl+Shift+.`（避开已用键位）；真全屏另开一轮（宿主 `CoreWebView2.ContainsFullScreenElementChanged`）。

**体积与风险**：约 20 行 CSS + 15 行 JS，首屏 <150 B。风险：隐藏状态栏后保存状态不可见（可留左下角最小条）；`Esc` 与批注浮层抢键。

### 2.10 字数明细加「行」— P2，S（新，成本最低）

**用户收益**：Typora 底栏字数的明细表里有「Lines」，长文按行判断进度比按段直观（`window.html` 的 `footer-line-count-td`）。Sidelight 7 行明细没有「行」（第 1 节第 20 项：中日韩字/拉丁词/合计/字符/句/段/阅读）。

**实现要点**：`StatsDetail.tsx:82-88` 加一行 `['行', number(countLines(text)), '按正文换行与块计，与源码行数不同口径']`；`wordcount.ts` 加 `countLines` 并单测（空文档 0、单段 1、标题与段落各 1 行；口径要与「段」的说明区分清楚，别再出现第 32 轮「同一数显示两次」的坑）。

**体积与风险**：约 15 行 + 3 条测试，首屏 <120 B（与 `StatsDetail` 是否惰性加载有关，需量）。风险：口径含糊——写清「正文行」不是源码行，否则用户拿它对照源码会以为错。

## 3. `docs/typora-gap.md` 过期核对

与第 32、33 轮结论一致：文件仍是「已有 21 / 缺 18」，但两个表实际 21 行 / **19 行**，且下列条目已不成立（本轮逐条复核）。

| 表里写的 | 实际 | 证据 |
| :--- | :--- | :--- |
| 「缺」：自动配对括号与引号（P1） | **已有**（第 33 轮；本轮 `( `→`()`、`)` 越过） | 第 1 节第 4 项；`src/lib/smartTyping.ts` |
| 「缺」：智能标点（P1） | **已有**（第 33 轮；`"…"`→`“…”`、`--`→`—`、`...`→`…`、中文后半角逗号/冒号/问号/叹号） | 第 1 节第 1–3 项；`e2e-r34-typora2.log` |
| 「缺」：缩放（P1） | **已有**（设置字号 + `Ctrl+=`/`Ctrl+-`/`Ctrl+0`，第 5、27 轮），且「已有」表里也写着「字号与缩放：有」，自相矛盾 | `settings.ts`；第 33 轮报告 3 节 |
| 「缺」：大纲折叠（P2，「现在只有平铺」） | **已有**（第 29 轮），仍无「全部折叠/过滤」 | 第 1 节第 12 项；`Outline.tsx:52-69` |
| 「缺」：新建、重命名、删除文件（P1） | **已有**（第 12–13、28 轮：删除进 trash、同目录重命名、新建文件/文件夹） | `TreeActions.tsx:196-273`；第 1 节第 15 项 |
| 「缺」：快速打开（P2） | **已有**（第 27 轮 Ctrl+P） | `src/components/QuickOpen.tsx` |
| 「缺」：最近文件（P2，备注已写「有（8 条，可清除，仅桌面版）」） | 行放错表 | `docs/typora-gap.md:62` |
| 「缺」：缩进与反缩进（P1） | **部分**：列表内 Tab/Shift+Tab 可缩进；段落 Tab 插两个空格，不是整体缩进/反缩进 | `App.tsx:780-795` |
| 「缺」：主题（P2，「只有跟随系统的明暗」） | 措辞过期：浅色 / 深色 / 跟随系统三档 | `settings.ts` 三档 |
| 「缺」：粘贴为纯文本（P1） | **应删**：Chromium 原生 `Ctrl+Shift+V` 已是纯文本粘贴（第 33 轮 critic 实测 `Control+V` 得 `<strong>`、`Control+Shift+V` 得纯文本），不是缺口 | `round-33/plan.md` 2.4 顶部注记 |
| 「已有」：图片拖入与粘贴 | 落盘可用，但**编辑器里显示为破图**（第 2.1 节） | 第 1 节第 11 项 |
| 未进表 | **链接打开**（Typora `Ctrl+点击`，Sidelight 无入口） | 第 2.2 节；`Docs/Markdown Reference.md:250` |
| 未进表 | **表格列宽拖拽 / 列对齐 UI** | 第 2.3 节；`Docs/Table Editing.md:46-66` |
| 未进表 | **代码块语法高亮 + 语言标签** | 第 2.4 节；`Docs/Code Fences Language Support.md:1-30` |
| 未进表 | **源码模式行号与语法高亮**（Typora 用 CodeMirror；Sidelight 是纯 `textarea.source-editor`） | `typora-features.md:26` |
| 未进表 | **文件树排序 / 创建副本 / 在资源管理器显示** | 第 2.7 节；`workspace.ts:106-107`；`window.html` 文件菜单 |
| 表头计数 | 「缺的（18）」下实际 19 行；「已有（21）」下 21 行 | 逐行计数 |

**建议修正**：把上表 **7 行**移到「已有」（21 → **28**：智能标点、自动配对、缩放、大纲折叠、新建/重命名/删除、快速打开、最近文件），删掉「粘贴为纯文本」（19 → 11），「缩进」改「部分」，「主题」改「三档」，「图片」行加「编辑器显示待修」；「缺」表补 4 行（链接打开、表格列宽拖拽、代码块高亮 + 语言标签、源码模式行号与高亮），得到「缺」**15** 行。若把「全部折叠/过滤」「查找大小写/整词」「禅模式/全屏」「侧栏宽度」「文件树排序/副本/资源管理器」也单列成行，则「缺」变 19 行，表头相应写「已有（28）/ 缺的（19）」；不单列就写进已有条目的备注。改完表头计数要与逐行数一致（现在的「缺的（18）」和实际 19 行就对不上）。

## 4. Mermaid：体积与首屏预算方案（复核 ADR-0017，第 32 轮实测）

角色要求「先做懒加载体积测算与首屏预算方案」。本轮只读，不能装依赖、不能构建，所以**不给新的估算数字**，只把 ADR-0017 的数字和本轮环境对齐，并指出一个被忽略的结论：

1. **首屏预算**：惰性加载方案首屏 0 B（`measure-first-screen.mjs` 只统计 `index.html` 直接引用的文件；KaTeX 已是先例，ADR-0012）。这条成立，不是障碍。
2. **真实障碍是安装包**：ADR-0017 实测 mermaid@11.12.0 的 `dist/mermaid.core.mjs` 43,725 B raw 只是入口，它还有 **48 条静态 import**（`dist/chunks/mermaid.core/*.mjs`，1,932,828 B raw / **402,939 B gzip**）；安装包预估 **1,474,881 B**，破 850,000 B 硬线 624,881 B。本轮核对当前安装包 824,595 B、余量 25,405 B，数字仍对得上。
3. **「只留 flowchart + sequence」的选项 2 帮不上忙**：ADR 的档 1b 已经是「主入口 + 它的静态依赖」，不包括任何按图类型的按需 chunk。也就是说，配置级子集**省不掉**这 1.93 MB raw——除非改 mermaid 源码或自己写渲染器（不现实）。**真正可选的只剩「放宽安装包硬线」或「不做」**，建议把 ADR-0017 的选项 2 标为「经分析不可行」，免得下一轮再排一次可行性实测。
4. 若产品负责人选「放宽线」：实现照 ADR 的方案（`mermaidLazy.ts` + `mermaidRender.ts`，只在文档含 ```` ```mermaid ```` 时 `await import()`，渲染失败降级为代码块 + 一句提示，Markdown 导出保留 fence 源码），实现后必须**用真安装包字节替换 ADR 的预估表**（ADR-0017「未验」第 1 条）。
5. 本轮实测 Sidelight 仍把 mermaid 当普通代码块（第 1 节第 19 项：`pre svg`=0，全程无 mermaid 请求），与 ADR 描述一致。

## 5. 不建议做

- **换 MathJax**：Typora 用 MathJax，Sidelight 的按需 KaTeX 首屏更小（`typora-features.md:119`）。
- **Pandoc 导入/导出、PicGo 上传、拼写检查、主题商店**：重依赖或与中文写作收益不匹配（沿用第 33 轮结论）。
- **文件树/文件列表双形态**：一棵树够用，Ctrl+P 已覆盖查找；本轮新增的「排序」比双形态更省。
- **粘贴 TSV 自动转表格**：Excel/Word 复制自带 `text/html`，Sidelight 已能成表（第 1 节第 7 项）；只对「记事本里的 TSV」不生效，收益窄，不做。「粘贴为纯文本」是 Chromium 原生，别再排。
- **复制为 Markdown（Ctrl+Shift+C）**：本轮复测确实没有（第 1 节第 6 项），但它是「把文档片段带到别的编辑器」的辅助能力，优先级低于打开链接、图片显示；等首屏余量解决再评估（`getMarkdown()` 派生链已有，实现不难）。
- **表格工具条的「移动行列/复制表格/美化源码」**：Tiptap 没有现成移动行列命令（要 `deleteRow` + `addRowBefore` 拼），且「美化源码」与「未改动的表格整块复用原文」的字节保真冲突（会主动改写用户原文），不做。
- **源码模式换成 CodeMirror**：重依赖，违反「不为一个功能引一个库」；行号可先用 `textarea` 的 CSS 计数列（另立 P2）。
- **主题体系（自定义 CSS）**：维护面大，三档主题够用。

## 6. UNVERIFIED 与测不了的原因

| 项 | 为什么没验证 | 怎么补 |
| :--- | :--- | :--- |
| 宿主（Windows WebView2）里的链接打开 / 工作区图片 | 本轮只跑 `localhost:5175`；宿主侧只做静态核对（`host/Program.cs` 无 `Process.Start`/`NewWindowRequested`，无 `/__asset`） | 实现后跑 `host-smoke`：在真文件夹里插一张图、点一个 `https://` 链接，看是否起浏览器 |
| F11 在页面里是否真全屏 | 无头 CDP 下 `page.keyboard.press('F11')` 不触发 `document.fullscreenElement`，不等于产品行为 | 宿主里跑 `CoreWebView2.ContainsFullScreenElementChanged`；浏览器态手按 F11 看 `document.fullscreenElement` |
| 代码块高亮/语言标签的真实体积 | 只读角色，不装依赖、不构建 | 实现轮 `npx vite build --outDir .tmp/build-rNN` + `measure-first-screen.mjs --dir`，并量安装包 |
| 新增主 chunk 改动（链接按钮、成对退格、大纲按钮、查找开关、字数行）的真实首屏增量 | 本轮不能改代码、不能构建；109 B 余量下每一项都可能超 | 实现轮每个任务先量后写（照第 33 轮「决策点 A」的做法），超线时按「懒 chunk / 省字节」二选一 |
| 文件树按修改时间排序的真实 mtime | 假 FSA 的 `File` 都带当前时间；`readDirectory` 现在不读 `lastModified` | 实现后在一个真文件夹里放两个不同日期的 `.md`，切换排序看顺序 |
| 拖入文件/文件夹打开、`.md` 关联等既有 UNVERIFIED | 本轮未重测 | 沿用 `round-33/findings-typora.md` 第 5 节 |

本轮未复制 Typora 的任何图标、主题、代码或文档原文进仓库；只保留截图与行为记录（`.tmp/typora-ref` 仍在 `.gitignore` 内）。
