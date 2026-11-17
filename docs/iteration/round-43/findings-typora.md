# 第 43 轮 Typora 对照与写作体验（finder-typora）

- 轮次参数：`round=43`、`nn=43`；轮前 startSha `0f83e1f80f57d93e0860282a0d3b0bc2b7953750`（`git log --oneline -5` 实测首行一致，工作树只有 `docs/iteration/round-43/`、`shots/round-43/` 未跟踪）
- 环境：dev server `http://localhost:5175`（未另起、未重启）、CDP `9223`、每次 E2E 前 `node .tmp/reset.mjs 9223`；未启动 Edge、未 kill `msedge`、未 `browser.close()`
- 只读：未改产品代码、未 commit、未 push、未碰 `release/`
- 本轮真跑 10 条用户路径（全部在真应用里，见 §1）：行内 HTML 与正文 `<br>`、手写表头建表、插入菜单建表 + 列宽拖拽 + 源码看宽度、拖入 `.md` 文件、富文本粘贴 / Ctrl+Shift+V 纯文本粘贴、网页图片粘贴、F11 全屏、Ctrl+滚轮缩放、专注模式提示、设置面板选项盘点
- 脚本（只读）：`.tmp/e2e-r43-typora.mjs`、`-2.mjs`、`-3.mjs`、`-4.mjs`、`-5.mjs`
- 截图：`shots/round-43/typora-current.png`、`typora-settings.png`、`typora-typed-table-header.png`、`typora-table-inserted.png`、`typora-colwidth-source.png`、`typora-focus-mode.png`（本目录还有其余 finder 的截图）
- 控制台：产品代码无报错；只有无栈的 `Cannot read properties of undefined (reading 'id'/'url')` 与浏览器翻译扩展 `chrome-extension://…OfscreenTranslate` 噪声（第 42 轮已判为环境噪声，本轮复现同样两条）

## 0. 结论先行（7 条，全部本轮实测；与第 42 轮 10 条不重复）

第 42 轮已报 10 条（行内 HTML、Mermaid 主题缓存、表格对齐/重排、手写表头建表、自动配对、`--` 智能标点、源码行号、Ctrl+滚轮与全屏、图片落盘规则、gap 表过期）。本轮**先逐条复测**（哪三条仍未修见 §9 末条），再找上轮没覆盖的面：

| # | 发现 | 级别 | 用户收益 | 改动面 |
| :--- | :--- | :--- | :--- | :--- |
| 1 | 把 `.md` 文件拖进窗口没有任何反应，且 `drop` 没有 `preventDefault`；宿主 `NavigationStarting` 只记日志不取消 | P1 | Typora 用户的第一习惯是拖文件开；现在静默失败。真实宿主里还可能整页导航到 `file://`，把编辑会话顶掉 | `App.tsx` 加 window 级 drop/`dragover` 守卫 + 提示，约 25 行；宿主可选加一行取消非应用导航 |
| 2 | 专注模式首次开启没有提示条（Typora 有「专注模式已开启…可以在视图菜单关闭」+「不再显示」） | P2 | 正文突然变暗，用户不知道是谁改的、也不知道怎么退；F8 用户尤其困惑 | `App.tsx` 专注开关 + 一条可关闭 notice，约 20 行 |
| 3 | 表格列宽拖拽只在会话内有效，源码里没有任何宽度（`\|     \|     \|     \|`） | P2（文档） | 拖完列宽重开就没了；`docs/typora-gap.md:31` 没写这条限制，规划会误判为「已与 Typora 对齐」 | 只改文档；若要持久化，得写 `<table>` HTML，不建议 |
| 4 | Mermaid 图没有「复制源码 / 在新页打开」入口 | P2 | 技术写作要把图画到别处（PR、文档站）时，只能回编辑器里翻围栏源码 | `MermaidPreview` 加 1 个按钮 + 剪贴板，约 30 行 |
| 5 | 图片缩放缺失（gap 表「缺的」最后一项，上轮未覆盖） | P2 | 截图/示意图尺寸不可控，导出后一屏一张；Typora 可拖拽 | 纯 MD 无处存宽度，要写 HTML `<img width>` 或引 sidecar；先做「点击看原始尺寸」更稳，约 40 行 |
| 6 | 快捷键对话框没列 `Ctrl+Shift+V`（纯文本粘贴实测可用） | P2 | 网页复制来的内容默认带粗体/链接；能去格式的键存在但没人知道 | `ShortcutsDialog.tsx:10-48` 加一行，1 行 |
| 7 | `docs/typora-gap.md` 仍有两行与实测不符：`:49`「粘贴为纯文本 无」、`:56`「视图缩放 无」 | P2（文档） | 规划依据失真；`:56` 还与同文件 `:25`「字号缩放 有」自相矛盾 | 单文件两行 |

## 1. 跑过的路径与原始读数

命令统一是 `node .tmp/e2e-r43-typora*.mjs 9223`，每个脚本自己 `localStorage.clear()` + reload。原始输出摘录：

| 路径 | 关键读数 | 判定 |
| :--- | :--- | :--- |
| 行内 HTML（`<kbd>`/`<mark>`/`<sup>`） | `{"kbdEls":0,"markEls":0,"supEls":0,"literalInText":true}` | 不渲染（与第 42 轮同结论，仍未修） |
| 正文行内 `<br>` | `{"brInParagraphs":0,"lastText":"第一行<br>第二行"}` | 字面（同上） |
| 手写表头 + 回车 | `{"table":false,"text":"\| 甲 \| 乙 \|"}` | 不建表（同上，仍未修） |
| 插入菜单 → 表格 | `{"exists":true,"rows":3,"cols":["min-width: 25px;",…],"toolbar":true}`；`插入` 菜单项 `["文件 ▾","表格","代码块","引用","任务列表","分割线","图片","公式","公式块","链接"]` | 可用 |
| 表格列宽拖拽 | 拖到 310 px 后 DOM `colwidth="310"`、`colgroup col` `width: 310px`；源码模式 `\|     \|     \|     \|` | 可拖，**不写盘** |
| 拖入 `.md` | `dragover.defaultPrevented=true`、`drop.defaultPrevented=false`、文档不变 | 无处理（本页新发现） |
| Ctrl+V / Ctrl+Shift+V | 同一剪贴板（html=`<b>富文本加粗</b>`、text=`纯文本加粗`）：Ctrl+V → `<strong>富文本加粗</strong>`；Ctrl+Shift+V → `纯文本加粗`，`strong:0` | 纯文本粘贴**已可用**（浏览器原生路径） |
| 网页图片（剪贴板只有 `text/html` 的 `<img src=https://…>`） | `{"imgs":1}`，`defaultPrevented:true` | 可用，插成远程图片节点 |
| F11 | `{"fs":false,"inner":[1440,900]}` → 按后完全相同 | 无全屏（上轮已报） |
| Ctrl+滚轮 | `--editor-size` 17px→17px、`zoom:1`→`1`、`dpr:1`→`1` | 不缩放（上轮已报） |
| 专注模式 | `{"hasHintBar":false}`，body 里无提示条 | 无提示（本页新发现） |
| 设置面板 | 小节：主题 / 自动保存 / 智能标点与配对 / 接口地址 / API Key / 模型 / 正文字号 / 联网核对 / 批注提示词；`mentionsAssets:false, mentionsZoom:false, mentionsFullscreen:false` | 无图片目录、无缩放、无全屏 |

## 2. P1 拖入 `.md` 文件没有任何反应（且未 `preventDefault`）

**用户收益**：从资源管理器把 `.md` 拖进窗口，是 Typora/大多数编辑器的第一入口。现在拖上去什么都不发生，用户会以为文件坏了或者应用没响应。

**现状证据**：
- 合成事件（真 DataTransfer + 真 File，类型 `text/markdown`）：`dragover.defaultPrevented=true`（ProseMirror 的 dragover 挡了）、`drop.defaultPrevented=false`，文档文本不变（`.tmp/e2e-r43-typora.mjs` 的 `T5_drop_md`）。
- 代码：唯一的 drop/paste 处理是 `src/App.tsx:861-868`（`handleDrop`）与 `:869-875`（`handlePaste`），两者都只取 `file.type.startsWith('image/')`，否则 `return false`；全仓库 `git grep -nE "addEventListener\('(drop|dragover|dragenter|dragleave)'|onDrop" -- src` **0 命中**，`host` 里也没有任何拖放配置。
- 宿主不兜底：`host/Program.cs:1616-1620` 的 `OnNavigationStarting` 只写日志（`Log("navigation starting " + e.Uri)`），没有 `e.Cancel = true`；`host/Program.cs:1491` 只关了浏览器加速键。
- 未被拦住的 `drop` 在 Chromium 里的默认动作是导航到 `file://`；脏文档有 `beforeunload` 兜底（`src/App.tsx:3323-3337`），干净文档会直接换页。**真实宿主里这一条未验证**（合成事件按规范不会触发导航）。

**实现要点**：
- `App.tsx` 在 editor 外挂 window 级 `dragover`（只在 `dataTransfer.types` 含 `Files` 时 `preventDefault()`，否则不影响正文内部拖放）与 `drop`：命中 `.md`/`.markdown` 时**不要静默**，用现有 `show()`/`setNotice()` 提示「拖入的文件不会直接打开：用 文件 → 打开文件，或 Ctrl+Alt+O」；同时一律 `preventDefault()` 关掉导航这条路。
- 不要尝试把拖动得到的 `File` 当文档打开：Chromium 的 drop 给不出可写句柄，只能读一份副本，保存时会退回另存为，语义与「打开文档」不一致，反而更容易丢改动。
- 真正的「拖入即打开」要等宿主：WebView2 的 `CoreWebView2.WebMessageReceived` 已有通道，可在宿主读 drag-drop 的路径再投 `open-file` 消息；这是另一轮的事，macOS 宿主同改。
- 宿主侧最小加一条：`OnNavigationStarting` 里取消非应用页面的导航（白名单 `http://127.0.0.1:<port>` 或虚拟域），防住同类顶页路径。

**体积与风险**：约 300–500 B gzip。风险在 `dragover` 的判定：写宽了会让正文里拖动选中的段落失效（ProseMirror 自己的拖放要靠这个事件）。先只对 `types.includes('Files')` 生效，并在 E2E 里回归「拖选段落」与「拖入图片仍写 assets」。

**建议优先级**：P1（静默失败 + 一条未拦的导航路径，成本很小）。

## 3. P2 专注模式首次开启没有提示条

**用户收益**：Typora 在 F8 之后顶部给一条「专注模式已开启 / 可以在视图菜单中关闭」，带「不再显示」勾选（`docs/iteration/typora-features.md` §5.2 已记这条差距）。Sidelight 点「专注」后正文直接压暗，没有解释；新用户会以为正文坏了。

**现状证据**：点顶栏「专注」后，`document.body.innerText` 不含 `专注模式已开启|可以在.*关闭|不再显示`，`[class*="notice"], [role="status"]` 里只有一条 API Key 提示（`.tmp/e2e-r43-typora5.mjs` 的 `C1_focus_hint`）；截图 `shots/round-43/typora-focus-mode.png`。代码里专注只是 `focusMode` 开关 + `renderFocus` 装饰（`src/App.tsx:413`、`:1779`），没有任何一次性提示。

**实现要点**：复用 `show()`/`setNotice()` 那条通道，`kind: 'info'`，文案「专注模式已开启：非当前段变暗。再点一次「专注」退出。」；「不再显示」写进 `settings`（`src/lib/settings.ts` 加一个布尔，默认 `false`），只在首次开启时弹。不要用阻塞式对话框。

**体积与风险**：约 250 B gzip + 设置项 1 个。风险低；注意不要与现有「自动保存排队中」「未配置 API Key」两条提示抢位置（同一条 notice 通道按顺序覆盖即可）。

**建议优先级**：P2（一次性的引导，价值中等、成本极低）。

## 4. P2 表格列宽只在会话内，`docs/typora-gap.md:31` 没写这条限制

**用户收益**：写作者拖完列宽会认为「排好了」；保存重开宽度全丢。文档现在写「表头边界可拖拽改列宽（第 37 轮）」，读起来像是持久能力，规划会据此认为表格已与 Typora 对齐。

**现状证据**：
- 拖拽后 DOM：`th` 的 `colwidth="310"`、`colgroup col` 的 `style="min-width: 25px; width: 310px;"`（`.tmp/e2e-r43-typora5.mjs` 的 `B1_colwidth_dom`）。
- 同一文档切源码模式：`|     |     |     |` / `| --- | --- | --- |` / 两行空行，**没有任何宽度信息**（`B2_source_markdown`）；截图 `shots/round-43/typora-colwidth-source.png`。
- 代码侧 `git grep -nE "colwidth|tableLayout|table-layout" -- src` **0 命中**：宽度是 Tiptap 表格节点自带属性，`tiptap-markdown` 的表格序列化只写 `|` 语法，所以宽度天生不进 markdown。

**实现要点**：只改文档一行——`docs/typora-gap.md:31` 补「列宽只在会话内，markdown 表格语法不存宽度；重开回默认」。不建议为此写 HTML `<table>`（会打破「正文字节保真」与纯 markdown 约定，Typora 同样不持久，见 `.tmp/typora-ref/resources/Docs/Table Editing.md` 的 `Resize Table` 段：只描述拖拽，没有宽度写回）。

**体积与风险**：文档 1 行，产品 0 改动。

**建议优先级**：P2（文档精度；写清楚就能避免下一轮重复投入）。

## 5. P2 Mermaid 图没有「复制源码 / 在新页打开」入口

**用户收益**：Mermaid 是技术写作刚需（第 36 轮已做惰性渲染）。把同样的图贴到 PR、文档站、聊天窗口时，现在只能回编辑区找到围栏手工复制；渲染出的 SVG 也没有放大查看的入口。

**现状证据**：
- `git grep -nE "copy|复制|导出" -- src/components/PreviewPane.tsx src/lib/mermaidPreview.ts src/App.tsx` 命中的都是 `errorCopy`（错误文案）与文档切换注释，Mermaid 渲染体附近没有任何按钮。
- 已有的：主题跟随（`src/lib/mermaidLazy.ts:51-54` 按 `data-theme` 取 `dark`/`default`，但第 42 轮报的「切换主题后旧 SVG 不重画」需按缓存键复核）、错误态（`src/lib/mermaidPreview.ts:31-35` 加 `is-error` 并显示提示文案）。两者都有。截图参考 `shots/round-43/r43-ui-18-mermaid-dark.png`（UI finder 本轮产出）。

**实现要点**：在 `MermaidPreview` 的包裹节点上加一个 `hover`/`focus-within` 才出现的小按钮组（键盘可达，`aria-label="复制 Mermaid 源码"`）：用节点自带的 `code` 属性（当前渲染函数已经拿到源码）写 `navigator.clipboard.writeText`，成功后走 `show()`。不要引图标库，用文字按钮。若要多做一步，「放大」用 `MermaidPreview` 已有的 svg 字符串在 `window.open` 的新窗口里注入（无跨站风险，`securityLevel: 'strict'` 已开）。

**体积与风险**：约 400–600 B gzip。风险低；重点是按钮不能出现在导出 HTML 与预览面板里（`src/lib/export.ts` 只拿 `editor.getHTML()`，Mermaid 在导出里本来就是源码围栏，天然不受影响）。

**建议优先级**：P2（有明确写作用途，成本小）。

## 6. P2 图片缩放缺失（gap 表最后一项，上轮 10 条未覆盖）

**用户收益**：插入的截图默认按正文宽度铺满，一张流程图就占一屏。Typora 可以点图选原始尺寸、拖拽改宽、加对齐。

**现状证据**：`git grep -nE "img.*resize|resizeImage|imageResize|width.*img" -- src/styles.css src/App.tsx` **0 命中**；设置面板没有图片相关小节（§1 的 `T7_settings`）；`src/lib/asset.ts` 只负责落盘。gap 表把它列为「缺的」最后一项、P2（`docs/typora-gap.md:70`）。

**实现要点（按风险从低到高，建议只做第一档）**：
1. **只读信息 + 提示**：点图片时在状态栏/小浮层显示原始尺寸与本行渲染宽度（`img.naturalWidth/naturalHeight` 现成），不动文档。约 40 行。
2. 若要做可调宽度：markdown 图片语法里没有宽度位，只能写 HTML（`<img src="assets/x.png" width="480">`）或 frontmatter/sidecar 记录。前者会把正文从纯 markdown 变成 HTML（第 41 轮的实体转义与 `repairHtml` 都要重新兜），后者引入第二处状态。**不建议**在没有 ADR 的情况下做。
3. Typora 的做法是往 `<td>`/`<img>` 写内联 style（`Docs/Table Editing.md` 的 alignment 段也这样），与本项目的「逐字节保真」目标冲突，不照搬。

**体积与风险**：第一档约 300 B gzip、零数据风险；第二档会碰保存保真，风险高，另立 ADR。

**建议优先级**：P2（先给信息，不做宽度编辑）。

## 7. P2 快捷键对话框没列 `Ctrl+Shift+V`（纯文本粘贴其实可用）

**用户收益**：从网页/微信复制的内容默认带粗体、链接、行内代码色。能去格式的键**已经能用**，但没人知道：快捷键表里没有，`docs/typora-gap.md:49` 还写着「粘贴为纯文本 无」。

**现状证据**：
- 同一份剪贴板（`text/html: <b>富文本加粗</b>`、`text/plain: 纯文本加粗`）：`Ctrl+V` 插入 `<strong>富文本加粗</strong>`；`Ctrl+Shift+V` 插入纯文本、`strong` 计数 0（`.tmp/e2e-r43-typora2.mjs` 的 `P1_plain_CtrlV` / `P2_plain_CtrlShiftV`）。
- 这是浏览器原生编辑命令，页面没写任何处理器；`src/App.tsx:869-875` 的 `handlePaste` 只处理图片文件。
- `src/components/ShortcutsDialog.tsx:10-48` 三组共 23 条，没有 `Ctrl+Shift+V`（`Ctrl+Alt+0`、`Ctrl+Shift+P` 等都在）。

**实现要点**：在「编辑与批注」组加一行 `['Ctrl+Shift+V', '粘贴为纯文本']`；同时改 `docs/typora-gap.md:49`。桌面宿主里这条键是否被 `AreBrowserAcceleratorKeysEnabled = false`（`host/Program.cs:1491`）影响**未验证**，若宿主证实不可用，再补一个显式的 `paste` 分支取 `text/plain`。

**体积与风险**：1 行 + 1 行文档；约 0 B（对话框是纯文本数组）。风险零。

**建议优先级**：P2（发现性，成本几乎为零）。

## 8. P2 `docs/typora-gap.md` 两行仍与实测不符

第 42 轮已报「gap 表过期」，本轮复测后**仍然存在**的两行（其余计数本轮核对无误）：

| 位置 | 现在写的 | 实测 |
| :--- | :--- | :--- |
| `docs/typora-gap.md:49` | 「粘贴为纯文本 / 无 / P1 / Ctrl+Shift+V」 | 可用（§7 的实测）；应移进「已经有的」，或改成「有，浏览器原生键，未在桌面宿主验证」 |
| `docs/typora-gap.md:56` | 「视图缩放 / 无 / P1 / Ctrl+滚轮与比例重置」 | 「无整页缩放」才准确：同文件 `:25` 已列「字号缩放 有；Ctrl+= / Ctrl+- / Ctrl+Alt+0」。建议改写为「整页缩放（含侧栏与工具栏）无；正文字号缩放已有」 |
| `docs/typora-gap.md:31` | 「表头边界可拖拽改列宽（第 37 轮）」 | 缺限定：只在会话内（§4） |

计数核对：`## 已经有的（30）` 表实测 **30 行**、`## 缺的（11）` 实测 **11 项**，计数本身没错；错在内容粒度与过期的两条。`docs/iteration/typora-features.md` 是 11-16 的调研记录（历史件），其 §5.1 的 Top 8（Ctrl+P、表格键盘、标题键、Ctrl+K、Ctrl+/、侧栏直达、字数明细、Mermaid）**本轮已逐项在 `src/components/ShortcutsDialog.tsx:10-48` 与代码里核到全部落地**（Mermaid 第 36 轮；「文件列表」子项按设计不做），建议只在 §5.1 顶上加一句「8 项均已落地，实时状态以 `docs/typora-gap.md` 为准」，不必重写。

**建议优先级**：P2（文档；两行 + 一句）。

## 9. 试过但**没有**问题的路径（防止误报，也是本轮的负结果）

- **网页图片粘贴**：剪贴板只有 `text/html` 的 `<img src="https://example.com/pic.png">` 时，页面 `preventDefault` 并插入 **1 个** `<img>`（`.tmp/e2e-r43-typora5.mjs` 的 `A2_after_web_image`），不会丢图也不会把 HTML 当纯文本塞进正文。
- **插入菜单建表**：`插入 ▾` → `表格` 得到 3×3、`rows:3`、三个 `colgroup col` 全部 `min-width:25px`、`.table-bar` 出现（`M2_table`）；列宽手柄 `.column-resize-handle` 3 个（`M3_col_resize_handle`）。
- **大纲折叠**：`button[aria-expanded]` 有 4 个（3 个大纲节点 + 1 个批注抽屉），与 `src/components/Outline.tsx:56` 一致（`.tmp/e2e-r43-typora2.mjs` 的 `O1_outline`）。
- **字数明细**：状态栏可见 `38 字 · 阅读约 1 分钟`（`shots/round-43/typora-current.png` 左下）；明细面板第 42 轮已验，本轮不重复。
- **设置面板完整盘点**：主题（明/暗/跟随）、自动保存、智能标点与配对、接口地址、API Key、模型、正文字号、联网核对、批注提示词——没有图片目录、整页缩放、全屏三项（§1 的 `T7_settings`，截图 `shots/round-43/typora-settings.png`），与「缺的」列表一致。
- **行内 HTML / 正文 `<br>` / 手写表头建表**：三项本轮复测**仍未修**，与第 42 轮结论一致；本轮不重复计入建议，只作状态记录（供 lead 排优先级）。

## 10. 未验证

- **拖入文件在 Windows 宿主里的真实行为**：WebView2 是否真的导航到 `file://`、是否有下载提示、`beforeunload` 是否挡住——本机只有浏览器 CDP，合成事件按规范不触发导航。补测方法：打包宿主后拖一个 `.md` 进去，看 `host` 日志的 `navigation starting` 行是否出现。
- **`Ctrl+Shift+V` 在宿主里是否仍可用**：`AreBrowserAcceleratorKeysEnabled = false` 后浏览器加速键被关，纯文本粘贴是否随之失效没有真机验证。补测方法同上：宿主里按一次，看是否有格式。
- **专注模式提示在宿主与 macOS 宿主里的一致性**：只测了浏览器版。
- **真机 Typora 的 Mermaid「复制源码」入口**：只在 `frame.js` 里见到渲染逻辑，没有跑到 0.11.18 的图右键菜单（`docs/iteration/typora-features.md` §8 已把多项标 UNVERIFIED）。本轮按「对写作者有用」提出，不按「Typora 有」提出。
