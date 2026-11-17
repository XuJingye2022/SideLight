# 第 38 轮 Typora 对照与写作体验（finder-typora，只读）

- 轮次：38 · 轮前 `bb52c6a23045042c18a08748547ef796f2e4890f` · 报告目录 `docs/iteration/round-38/`
- 环境：dev server `http://localhost:5175`（未重启）、CDP 9223、`node .tmp/reset.mjs 9223` 后实测
- 实测脚本：`.tmp/e2e-r38-typora.mjs`（只读，不改产品代码）；原始输出 `.tmp/r38-typora-e2e.json`
- 截图证据：`shots/round-38/t1-relative-image-broken.png`、`t2-inline-html-typing.png`、`t3-after-all.png`
- 输入资料：`docs/iteration/typora-features.md`、`docs/typora-gap.md`、`.tmp/typora-ref`（`Docs/`、`style/themes`、`window.html`）、`shots/typora/`（71 张）

一句话结论：Typora 差距表**大体仍然准确**，但发现 2 个「功能写了有、实际用起来坏」的项（工作区图片插入即破图、行内 HTML 只显字面），外加 6 个成本小、写作者每天会碰的改进。研究文档 `typora-features.md` 的「Sidelight 现状」列已明显过期（8 处把已实现写成缺失）。

## 0. 本轮实测覆盖（5 项真跑）

| 项 | 实测结果 | 证据 |
| :--- | :--- | :--- |
| 相对路径图片 | `assets/a.png` → `naturalWidth 0`（破图），同一篇里的 data URL → `naturalWidth 1`（正常） | `t1-relative-image-broken.png`、`r38-typora-e2e.json` `.A_image` |
| 行内 HTML 打字 | `<kbd>Ctrl</kbd>`、`x<sub>2</sub>` 全部按字面文字显示，`querySelector('kbd')` 与 `querySelector('sub')` 均为 false | `t2-inline-html-typing.png`、`.B_inlineHtml` |
| 粘贴富文本 | `<strong>` 保留、外站 `style`（颜色/字体）被丢弃 | `.C_paste` |
| 全屏 / 视图缩放 | F11 无反应（`document.fullscreenElement=false`）；`Ctrl+Shift+=` 走的是字号（17px→18px→19px）；Fullscreen API 本引擎可用 | `.D_afterF11`、`.D_fullscreenApi.supported=true` |
| 拖入 `.md` | 无任何反应，正文不含文件内容 | `.E_dropMd` |

补充：本次实测发现「源码改动后点『回到富文本编辑』会弹确认框」，这是设计内的保护，脚本需点「继续」才继续（已记入 `.tmp/e2e-r38-typora.mjs` 的 `backToRich()`，后续复用脚本别再踩）。

## 1. P1 工作区相对路径图片：插入即破图（最该修）

**用户收益**：这是当前最伤写作体验的一条。打开文件夹后拖入或粘贴图片，Sidelight 会把图片写进 `assets/`，**同时正文里立刻显示破图**——用户会以为图片没存进去。同一篇里换成 data URL 就正常，说明不是渲染管线问题，是相对路径没有解析。

**现状证据**
- 路径写死：`src/lib/asset.ts:52` `return \`assets/${fileName}\``；写入位置 `asset.ts:47`（文档同级 `assets/`）。
- 插入后直接把相对路径塞给图片节点：`src/App.tsx:3965` `setImage({ src: relative, alt: file.name })`。
- 实测：`.A_image` = `[{src:"assets/a.png", complete:true, naturalWidth:0, renderedW:86}, {src:"data:image/png;base64…", naturalWidth:1}]`；网络侧 `http://localhost:5175/assets/a.png` 返回 `200 text/html`（Vite SPA 回退），所以控制台连 404 都没有，用户拿不到任何线索。
- 截图 `shots/round-38/t1-relative-image-broken.png`：破图图标 + alt「相对路径」。

**实现要点（关键：不必先改宿主）**
`docs/typora-gap.md:63` 写「修复要宿主 `/__asset` 路由」。实测判断这条注释把成本估高了——浏览器层已经有全部材料：
1. `workspace.rootHandle` 与 `parentDirectory(workspace, docPath)`（`src/lib/workspace.ts:138`）已经能把文档目录解析成 `FileSystemDirectoryHandle`。
2. 新增 `src/lib/assetResolve.ts`：`resolveAsset(src)` 对非 `data:`/`http:`/`blob:` 的 src，走 `parentDirectory()` → `getDirectoryHandle` 逐段 → `getFileHandle` → `createObjectURL`，配一个 `Map<src, blobUrl>` 缓存，文档切换时 `revokeObjectURL` 全清。
3. 渲染侧用 Tiptap Image 的 NodeView（或 `renderHTML` 读 module 级 Map）把 `src` 换成 blob URL，**正文节点和 `.md` 字节一律保持 `assets/a.png`**。这是硬约束：不能为了显示去改文档，否则保存会改写正文、`npm run roundtrip` 直接挂。
4. 载入文档后扫一遍图片节点做一次解析（空 transaction 或 `editor.view.dispatch` 触发重绘）。
5. 宿主单独打开的单文件没有目录句柄——这条留宿主 `/__asset`（`asset.ts` 写入路径已经知道绝对位置，宿主按 argv 目录拼），标 UNVERIFIED，等宿主轮。

**体积与风险**：新增约 1.5–2.5 KB 源码（无新依赖）；风险集中在 blob URL 泄漏（不 revoke 会一直占内存）与「文档切换后旧 URL 失效导致偶发破图」，用「切文档清 Map + 重扫」能盖住。**不碰序列化**，所以 `npm run roundtrip` 的 5/7、7/7 不受影响。

**优先级：P1**（建议下一轮第一项）。

## 2. P1 全屏缺失（F11）

**用户收益**：专注写作时全屏是 Typora 的常规动作（F11）。Sidelight 现在只能靠宿主窗口最大化，顶栏、侧栏、状态栏都还在，专注模式也只是压暗非当前段。

**现状证据**
- 全局快捷键表 `src/App.tsx:3686-3699` 只有字号三条；`ShortcutsDialog.tsx:42-48`「视图与字号」组里没有全屏。
- 实测：`F11` 按下后 `document.fullscreenElement=false`（`.D_afterF11`）。
- 实测：本引擎**支持** Fullscreen API，`.D_fullscreenApi.supported=true`（`requestFullscreen()` → `fullscreenElement` 非空 → `exitFullscreen()` 成功）。也就是说浏览器与 WebView2 都能直接调，不必等宿主。

**实现要点**：`onKeyDown` 里加 `event.key === 'F11'` → `document.fullscreenElement ? exitFullscreen() : documentElement.requestFullscreen()`；状态用 `fullscreenchange` 同步到顶栏一个「全屏」按钮；`ShortcutsDialog` 加一行。
**风险**：① 退出全屏时浏览器自己会吃 Esc，需确认 Esc 语义不被抢（现有 Esc 分支多，见 `FindBar` 的 `stopPropagation` 教训）；② 宿主里 WebView2 的 Fullscreen API 只会把 WebView 铺满窗口，WinForms 是否要去边框要实测（`host/` 未改，标 UNVERIFIED）。**体积**：约 0.3–0.5 KB。
**优先级：P1**（纯 web 层可交付，宿主细节可后续）。

## 3. P1/P2 行内 HTML 只显字面（`<kbd>`、`<sub>`、`<br>`）

**用户收益**：中文技术写作里 `<kbd>`、`<br>`、`x<sub>2</sub>` 很常见；Typora 渲染成键盘/换行/下标，Sidelight 现在把标签当文字显示，读者看到一堆尖括号。

**现状证据**
- 实测 `.B_inlineHtml`：`hasKbdElement:false`、`hasSubElement:false`、`innerTextTail:"按键 <kbd>Ctrl</kbd> 与 x<sub>2</sub>。"`；截图 `t2-inline-html-typing.png`。
- 源码保真没问题：同一篇切源码 `.B_sourceTail` 是 `kbd>Ctrl</kbd> 与 x<sub>2</sub>。`（未被转义成 `&lt;`）。
- `src` 里没有任何 `inlineHtml`/`rawHtml` 节点（grep 0 命中），`asset.ts` 之外也没有 HTML 白名单。

**实现要点**：加一个行内原子节点 `inlineHtml`，`attrs.tag` 限白名单 `kbd|br|sub|sup|mark|u|s`；`parseHTML` 按标签逐条注册；NodeView 用 `document.createElement(tag)` 生成（**不要 innerHTML**，避免脚本注入），只把节点里的文字作为 `textContent`；`renderHTML`/序列化输出 `<tag>文字</tag>` 原样字节。
**风险**：`npm run roundtrip` 的 `01-obsidian-note.md` 含 `<kbd>Ctrl</kbd>`，节点化后必须逐字节一致；`<br>` 与 Markdown 硬换行（行尾两空格 / `\`）的优先级要定清。**体积**：约 1.5–2.5 KB。
**优先级：P2 靠前**（收益真、但会碰 roundtrip 门禁，适合单独一轮）。

## 4. P2 `Ctrl+滚轮` 改字号（写作时最直觉的手势）

**现状证据**：`src` 全局没有 `wheel` 监听（grep `'wheel'` 0 命中）；字号只有 `Ctrl+=` / `Ctrl+-` / `Ctrl+Alt+0`（`App.tsx:3686-3699`）。实测字号缩放本身正常（17→18→19px）。
**收益**：写完一篇想整体放大看，普通人第一反应是 Ctrl+滚轮；现在会触发浏览器整页缩放（宿主虽关了加速键，但页面里 Ctrl+wheel 仍可能被 Chromium 吃掉，需实测）。
**实现要点**：`.doc-column` 上 `wheel` 监听，`event.ctrlKey` 时 `preventDefault()` 并 `setFontSize(clampFontSize(±1))`，注意 `{ passive: false }`。**体积**：约 0.2 KB。**优先级：P2**。

## 5. P2 大纲：缺「全部折叠/展开」，折叠不持久

**现状证据**：`src/components/Outline.tsx:17` `useState<Set<string>>`，只有逐节点 `outline-toggle`（`:52-69`），没有任何「全部折叠」入口；折叠集合随组件存活，不写 localStorage（`:11-14` 注释已承认）。
**收益**：20 篇 50 节的笔记里，逐节点折叠太慢；重开文档要重新折。
**要点**：大纲头加两个按钮（全部折叠＝`new Set(有子节点 ids)`；全部展开＝`new Set()`）＋按文档路径把折叠集合存 localStorage（加条数上限）。**风险**：节点 id 是按位置生成的，换文档后旧 id 可能命中别的节（`outline.ts`/`outlineTree.ts` 的 id 规则），持久化必须带「文档键」，否则会出现「打开新文档时莫名其妙少几节」。**体积**：约 0.5 KB。**优先级：P2**。

## 6. P2 拖入 `.md` / 文件夹没有反应

**现状证据**：实测 `.E_dropMd` = `{defaultPrevented:false, textHasDoc:false}`；`App.tsx:845-851` 的 `handleDrop` 只挑 `file.type.startsWith('image/')`，非图片直接 `return false`。
**要点**：第一步（纯 web）把 `text/markdown`/`.md` 读成文本，走「新建文档」路径，文件名用 `file.name`，并提示「保存需要选择位置」；第二步（宿主）才是真正的原地打开——WinForms 表单接 `DragDrop`，把路径当 argv 交给 `/__doc`，宿主已有这套机制（`host/`）。
**收益**：从资源管理器拖一篇进来就能读；但**不能像 Typora 一样原地保存**（浏览器/WebView2 不给 `File` 的真实路径），诚实写明。**优先级：P2**。

## 7. P2 粘贴为纯文本（`Ctrl+Shift+V`）

**现状证据**：实测 `.C_paste` = `<strong>` 保留 1 个、`spanStyles:[]`——外站颜色/字体被 schema 自动丢掉（好消息：污染比预想小），但标题层级、列表、链接仍会带进来；`ShortcutsDialog` 与 `App.tsx` 无 `Ctrl+Shift+V` 绑定，`handlePaste`（`App.tsx:853`）只处理图片文件。
**要点**：keydown 置「纯文本」标志 → `handlePaste` 先判图片、再判标志 → `insertText(clipboardData.getData('text/plain'))`，粘贴/按键抬起后清标志。不要用 `navigator.clipboard.readText()`（需要权限/WebView2 会弹）。**体积**：约 0.3 KB。**优先级：P2**。

## 8. P2 图片落盘规则不可选

**现状证据**：`src/lib/asset.ts:52` 固定 `assets/`；设置里没有图片相关项（`SettingsDialog.tsx` 无「图片」分组）。
**收益**：Typora 支持 `./assets` 与 `${filename}.assets`；按文档分目录后，删笔记能连带删图，不会留一堆孤儿图。
**要点**：`writeAsset(dir, fileName, blob, rule)`，设置里加「图片存放：`assets/`（默认）/`<文档名>.assets/`」，老文档不迁移。**风险**：默认值必须保持不变，否则生成路径变化会碰保存门。**体积**：约 0.6 KB＋设置 UI 一行。**优先级：P2**。

## 9. P2 全局搜索（跨文件）

**现状证据**：`docs/typora-gap.md:75` 列 P2「全局搜索 无」；`Ctrl+P`（快速打开）只按文件名/路径匹配，不搜正文。
**收益**：笔记库最常用的动作是「我记得写过……在哪篇」。对写作者价值高于「文件列表形态」。
**要点**：复用快速打开浮层（`src/components/QuickOpen.tsx`），结果列表分两组「文件名 / 正文命中」；正文扫描用 `workspace.rootHandle` 递归读文件（跳过 `.sidelight/`、跳过 `>2 MB`、文件数上限如 200），中文按字面 `includes` 匹配（`src/lib/search.ts` 已有查找用的匹配函数可复用），命中行给「文件 · 行号 · 片段」，点击打开并跳到命中（现有查找条可定位）。**风险**：大目录首搜会读几百个文件，必须给上限与进度提示；不要新增依赖。**优先级：P2（收益最高的一条 P2）**。

## 10. P2 表格 `colwidth` 不该进导出（第 37 轮遗留，顺手核对）

`src/App.tsx:13` 只 import 了 `TableCell`/`TableHeader`，`:780-781` 直接交给 `Table`，没有 `renderHTML` 覆盖。第 37 轮加了 `resizable: true` 后，列宽会写进 cell 的 `colwidth` 属性与 `<col style>`（第 37 轮证据 `colwidth`/`<col style="278px">`）。Typora 的列宽只影响显示，不落进 Markdown/HTML。**要点**：STATE「下一轮优先 ②」写的是给 `TableCell`/`TableHeader` 加 `renderHTML: () => null`——**照字面做会把所有 `<td>`/`<th>` 一起吃掉**，表格会塌掉。正确做法是覆盖 `renderHTML` 时保留 `colspan`/`rowspan`、只剔 `colwidth`（以及 `columnResizing` 的 `<col style>` 不进导出），再补两条断言：HTML 导出字符串里 `colwidth` 0 命中、Markdown 正文逐字节不变。这条与 STATE 的 ② 重合，planner 并进同一任务即可，但**验收描述要照着改**。**优先级：P2**。

## 11. `docs/typora-gap.md` 与 `docs/iteration/typora-features.md` 过期核对

**`docs/typora-gap.md`（第 37 轮刚复核过，28/12）：基本准确**，逐条抽查结果：

| 行 | 表述 | 核对 |
| :--- | :--- | :--- |
| `:63` | 工作区相对路径图片「修复要宿主 `/__asset` 路由」 | **报价过高**：浏览器层用目录句柄就能做（见第 1 项），建议改成「先浏览器层 blob URL，宿主单文件再补 `/__asset`」 |
| `:54` | 视图缩放「无」 | 准确（`Ctrl+=` 是字号，实测 17→18→19px），但**用户可感差距被高估**：正文字号已可缩放，缺的是图象/整体缩放。建议备注一句，P1 可降 P2 |
| `:46` | 行内 HTML「保真但不渲染」 | 准确（实测）；补一句「输入 `<kbd>` 保真不转义」 |
| `:47` | 粘贴为纯文本「无」 | 准确；补「外站颜色/字体已被丢弃，缺的是去标题/列表/链接」 |
| `:62` | 拖入文件或文件夹「无」 | 准确（实测无反应）；补「浏览器层只能导入为新文档，原地保存要宿主」 |
| `:35` | 大纲折叠「会话内有效，不持久化」 | 准确（`Outline.tsx:17`） |

**`docs/iteration/typora-features.md`（第 16 轮的研究报告）：明显过期，建议本轮或下轮花 10 分钟改「Sidelight 现状」列**。至少 8 处把已实现写成缺失，会误导 planner 重复立项：

| 行 | 过期表述 | 现状 |
| :--- | :--- | :--- |
| `:43` | 「不能切列表形态，**不能折叠大纲**」 | 大纲可折叠（第 29 轮） |
| `:46` | 表格「**无键盘走格/加行**」 | 有：Tab 走格、Ctrl+Enter 加行、Ctrl+L 删行（`ShortcutsDialog.tsx:29`） |
| `:49` | 「**没有**『选中文字按 Ctrl+K 变链接』」 | 有（`ShortcutsDialog.tsx:31`） |
| `:51` | 快速打开「**无**」 | 有（`ShortcutsDialog.tsx:26`，第 27 轮） |
| `:96-102` | §5.1「缺失且值得做」9 条里 6 条已实现 | Ctrl+P、Ctrl+K、表格键盘、标题快捷键、源码 `Ctrl+/`、侧栏直达、字数明细、大纲折叠 |
| `:110` | 「源码模式只有按钮」 | 有 `Ctrl+/`（`ShortcutsDialog.tsx:28`） |
| `:111` | 「大纲平铺」 | 可折叠 |
| `:112` | 「表格只有工具条」 | 键盘路径与列宽拖拽都有 |

建议做法：只改「Sidelight 现状」列与 §5.1 表，保留 Typora 侧的观察（那部分仍然有效）。这是文档改动，不是产品代码。

## 12. 未验证（UNVERIFIED）与补测方法

1. **宿主内的 Fullscreen API**：只在 CDP Edge（同版本 Chromium）里验了 `supported=true`；WebView2 宿主是否要配合 `ContainsFullScreenElementChanged` 去掉窗口边框，未验 → 需重建宿主后 `host-smoke` 加一条断言。
2. **宿主内 `Ctrl+滚轮`**：宿主关的是浏览器加速键，页面里的滚轮缩放是否被 Chromium 页面缩放吃掉，未验 → 宿主跑一次，量 `--editor-size` 是否变化、页面是否整体缩放。
3. **真实图片文件**（非 data URL）在 `assets/` 里的解析：本轮没有真实文件夹句柄（CDP 页面无 FSA 授权，无法脚本化 `showDirectoryPicker`），所以第 1 项只证了「相对路径不解析」这个事实；修完必须用真人打开文件夹 + 拖图实测。
4. **真实粘贴**（系统剪贴板里同时有 HTML 与纯文本）：本轮用合成 `ClipboardEvent` 验路由，`Ctrl+Shift+V` 键位在 WebView2 里是否能到页面未验。
5. **Typora 侧的图片落盘三规则、全屏行为**：本机只有 0.11.18 的截图与研究记录（`docs/iteration/typora-features.md:47`），按第 16 轮已记「未测」沿用，未新开 Typora。
6. `colwidth` 进导出的具体形态（`getHTML()` 里是 `colwidth` 属性还是 `<col style>`）本轮未实测，只做静态判断；建议改成断言后再修。

## 13. 建议排序（给 planner）

1. 工作区相对路径图片显示（P1，实测破图，收益最大，不碰序列化）
2. 全屏 F11（P1，本引擎已证 API 可用，约 0.4 KB）
3. 行内 HTML 白名单渲染（P2 靠前，会碰 roundtrip，单独排）
4. `Ctrl+滚轮` 字号 + 大纲「全部折叠」+ 粘贴为纯文本（三条加起来约 1 KB，可并成一个「写作手势」任务）
5. 全局搜索（P2，收益高但成本 M，建议单独一轮）
6. 拖入 `.md`、图片落盘规则、`colwidth` 导出清理、文档过期修正（可零散收尾）

排序依据沿用看板：稳定性 > 核心功能 > 体积优化 > 节省 Token > 速度。前两项都属于「写了有、用起来坏」，优先于加新功能。
