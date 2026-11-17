# 第 39 轮 Typora 对照与写作体验（finder-typora，只读）

- 轮次：39 · 轮前 `59a4f933dfd411039c939b1e70d7bbdcd7ed82f8` · 报告目录 `docs/iteration/round-39/`
- 环境：dev server `http://localhost:5175`（未重启）、CDP 9223、每组前 `node .tmp/reset.mjs 9223`
- 实测脚本（只读，不改产品代码）：`.tmp/e2e-r39-typora.mjs` … `e2e-r39-typora7.mjs`；原始输出 `.tmp/r39-typora-e2e{,2,3,4,5}.json`、`.tmp/r39-typora{,2,3,4,5,6,7}.log`
- 截图：`shots/round-39/t1…t18`（见第 11 节）
- 输入资料：`docs/iteration/typora-features.md`、`docs/typora-gap.md`、`.tmp/typora-ref/resources/Docs/`（`Table Editing.md`、`Code Fences Language Support.md`、`Markdown Reference.md`、`Custom Shortcut Keys.md`）、`shots/typora/`

一句话结论：本轮实测推翻两个「以为有」的判断，挖出 **2 条 P1**：① 表格单元格里的 Shift+Enter 换行会被应用自己写成 `<br>`，但重开文档后显示成字面 `3A<br>B`（自产自读不一致）；② 编辑视图里的链接没有任何「打开」出口（普通点击和 Ctrl+点击都只弹编辑浮层）。其余 4 条是写作高频的小改进（代码块高亮/语言切换、专注与打字机键位、表格内 Enter、标题首 Backspace），外加 Typora 差距表要补 2 行。

## 0. 本轮真跑过的 7 组（全部有输出）

| # | 项 | 实测结果 | 证据 |
| :--- | :--- | :--- | :--- |
| 1 | 表格列对齐渲染 | **没问题**：`:---`/`:---:`/`---:` 载入后 `th/td` 的 `style="text-align:left/center/right"`，视觉对齐正确；改一格再序列化，分隔行仍是 `\| :--- \| :---: \| ---: \|` | `.tmp/r39-typora-e2e2.json` `.A_*`、`shots/round-39/t1-table-align.png` |
| 2 | 表格最后一格按 Tab | **没问题**：行数 3 → 4，自动加一行 | `.B_tabLastCell`、`t6-table-tab-last.png` |
| 3 | 表格单元格 Shift+Enter | **有问题**：编辑器里渲染成真换行（`<p>3A<br>B</p>`），序列化成 `\| 3A<br>B \|`；把这段源码重新载入（等价保存后重开）变成 `<p>3A&lt;br&gt;B</p>`，屏幕上是字面 `3A<br>B` | `.tmp/r39-typora-e2e3.json` `.A_srcAfterShiftEnter`/`.A_afterReload`、`t4`、`t9`、`t17-br-reload-minimal.png` |
| 4 | 正文 Shift+Enter（对照） | **没问题**：写成行尾两空格硬换行，重载仍是 `<br>` 元素 | `.tmp/r39-typora7.log` |
| 5 | 链接点击 / Ctrl+点击 | **有问题**：普通点击与 Ctrl+点击都只打开编辑浮层（`activeElement=INPUT:link-editor-input`），无 popup、页面 URL 不变；浮层只有「文字 / 地址」两个输入，没有打开或复制按钮 | `.tmp/r39-typora-e2e.json` `.C_afterPlainClick`/`.C_afterCtrlClick`、`.tmp/r39-typora-e2e5.json` `.B_popover`、`t2-link-click.png` |
| 6 | 代码块语法高亮 / 语言切换 | **有问题**：`<pre><code class="language-js">` 内 `spanCount:0`、单一颜色 `rgb(29,32,35)`；工具条 16 个按钮里没有语言选择 | `.tmp/r39-typora-e2e.json` `.D_code`、`.tmp/r39-typora-e2e4.json` `.D_codeBlock`、`t3-code-block.png` |
| 7 | 专注 / 打字机键位与提示 | **部分**：点顶栏按钮有效（正文压暗 + 顶栏高亮 + 状态栏 `专注` chip）；`F8` 无反应；快捷键对话框里没有 F8/F9，也没有全屏与粘贴为纯文本 | `.tmp/r39-typora-e2e2.json` `.D_afterF8`/`.D_afterClick`、`.tmp/r39-typora-e2e4.json` `.C_shortcuts`、`t7-focus-mode.png`、`t15-shortcuts.png` |

补充实测（用于排除误报，见第 9 节）：任务列表勾选、Excel/网页 HTML 表格粘贴、表格对齐保真、表格末尾 Tab 加行、正文自动链接、预览面板链接 `target="_blank"`（点后应用页不跳走）。

## 1. P1 表格单元格换行：应用自己写出的 `<br>`，重开变字面文字

**用户收益**：表格是中文写作者做对照表的常用块。单元格里想换行（Shift+Enter）时，Sidelight 当场显示正确；**保存重开后却看到 `3A<br>B` 这样的尖括号文字**，用户第一反应是「文档坏了 / 图片或换行丢了」。这不是内容丢失：`.md` 字节仍是 `<br>`，但阅读体验直接坏掉，而且用户会去手工删字符。

**现状证据**（可复现）
1. 载入 `# 单元格换行` + 一张 3 列表；点最后一个单元格，按 `End`、输入 `A`、`Shift+Enter`、输入 `B`。
2. DOM 是 `<p>3A<br>B</p>`（真换行）——`shots/round-39/t4-table-cell-break.png`。
3. 切源码：`| 甲   | 乙   | 3A<br>B |`（`.A_srcAfterShiftEnter`）。
4. 把这段源码原样经源码框载回（与保存后重开走同一条 Markdown 解析路径）：`cellHtml = "<p>3A&lt;br&gt;B</p>"`、`hasBrElement:false`、`literalBrText:true`（`.A_afterReload`）——`shots/round-39/t9-cell-br-reload.png` 里两个单元格都显示字面 `3A<br>B`。
5. 最小复现（不经过 Shift+Enter，直接给 Markdown）：正文 `正文第一行<br>正文第二行` 与单元格 `A<br>B` 都变字面（`.tmp/r39-typora6.log`、`t17-br-reload-minimal.png`）。所以根因是**行内 HTML `<br>` 不解析**；表格只是唯一会让应用自己产出 `<br>` 的场景。

**为什么不触发保存前对比**：`src/lib/risk.ts:286` 的 `hardBreakLosses` 只检查行末 `\`，`htmlLosses`（`:328`）对 `<br>` 不报；且 `src/lib/tableReuse.ts:97-116` 只对「未改动」的表格整块复用原文，改一格就退让给序列化，这才暴露出自产的 `<br>`。保存门不会拦，用户也没有任何提示。

**实现要点（最小闭环，不碰正文序列化）**
- 解析侧：在 Markdown → ProseMirror 之后再走一遍小助手 `splitBrInTableCells(doc)`（纯函数可 Node 单测）：遍历 `tableCell` 里的文字节点，把字面 `<br>` / `<br/>` 切成 `hardBreak` 节点。序列化侧已经正确写 `<br>`（`@tiptap/markdown` 的 hardBreak），不必改。
- 更完整的做法与第 3 项「行内 HTML 白名单」合并（`kbd|br|sub|sup`），一次把 `<kbd>`、`<br>` 都解决；只修 `<br>` 也能独立交付，约 0.4–0.8 KB。
- 验收：`npm run roundtrip` 加一条「表格单元格含 `<br>`」用例；再补一条断言「Shift+Enter 后源码含 `<br>`、重载后 `td br` 元素数 1、`td` 文本里 0 处字面 `<br>`」。

**风险**：单元格里出现字面 `<br>` 的旧文档会被自动变成换行（这是想要的，但要在 CHANGELOG 写明）；表格内没有硬换行语法，不能改写成 `  \n`。
**优先级：P1**（自产自读不一致，最伤信任）。

## 2. P1 编辑视图没有「打开链接」的出口

**用户收益**：写作者在正文里补链接（Typora 里 `Ctrl+点击` 直接打开），Sidelight 现在**只能编辑、不能打开**：普通点击弹浮层，`Ctrl+点击` 也被同一个处理吞掉（无 popup、URL 不变）。想核对「这个地址对不对」只能导出或手动复制到浏览器，而这正是写作时每篇都会做的动作。

**现状证据**
- `src/App.tsx:861-869`：`handleClick` 命中 `<a>` 时一律 `event.preventDefault()` 再 `openLinkRef.current(...)`，没有修饰键分支。
- `src/components/LinkEditor.tsx:42-99`：浮层只有两个输入框与一条提示「普通链接用 Enter 保存，Esc 取消」，没有「打开」「复制」按钮。
- E2E：`.C_afterPlainClick` = 无事件、`focusedTag:"INPUT:link-editor-input"`；`.C_afterCtrlClick` = `{events:[], pageUrl:"http://localhost:5175/"}`。截图 `t2-link-click.png`。
- 对照：预览面板的链接带 `target="_blank"`（`.tmp/r39-typora-e2e3.json` `.C_previewLinks`），点后应用页不跳走（`.C_afterPreviewLinkClick.nav` 为空）——**打开外链的机制在预览里已经存在**，编辑视图缺的只是入口。

**实现要点**
- `handleClick` 里先判 `event.ctrlKey || event.metaKey`：`http/https/mailto` 走 `window.open(href, '_blank', 'noopener')`，其余 scheme 只提示不打开；普通点击保持现在的就地编辑（不改变已验证行为）。
- `LinkEditor` 底部加「打开」「复制」两个按钮（复制用 `navigator.clipboard.writeText`，失败回退 `document.execCommand('copy')` 或提示手动复制）。
- 宿主（WebView2/WKWebView）：`window.open` 在 WebView2 里会触发 `NewWindowRequested`，宿主不处理时可能开一个空窗或没反应；要么宿主 `ShellExecute` 交给默认浏览器，要么 web 层用「复制链接 + toast『已复制，请到浏览器打开』」兜底。**宿主行为本轮未验**，标 UNVERIFIED。

**体积与风险**：约 0.4–0.7 KB（无新依赖）。风险点：不能把 `javascript:`/`data:` 交给浏览器；普通点击语义绝不能变（已有键盘验收覆盖点链接编辑）。
**优先级：P1**（每篇都会碰，且 Typora 有明确对应手势）。

## 3. P2 代码块没有语法高亮，也没有语言切换入口

**用户收益**：技术笔记与教程里代码块是主要阅读对象。Typora 官方文档（`.tmp/typora-ref/resources/Docs/Code Fences Language Support.md`）列出 40+ 语言的高亮；Silelight 现在整块单色（`spanCount:0`），长代码块读起来吃力。语言只能靠手写围栏，改语言要进源码。

**现状证据**
- `<pre><code class="language-js">`，`spanCount:0`、`codeColor:"rgb(29, 32, 35)"`，即只有等宽字体无高亮（`.tmp/r39-typora-e2e.json` `.D_code`、`t3-code-block.png`）。
- `package.json` 无 `lowlight`/`highlight.js`/`prism` 等（`git grep` 0 命中）；`src/App.tsx:4549` 只有 `toggleCodeBlock` 按钮，工具条 16 个按钮里没有语言选择（`.tmp/r39-typora-e2e4.json` `.D_codeBlock`）。

**实现要点（两段，可分开交付）**
1. **语言切换（0 依赖、~0.5 KB）**：光标在 codeBlock 内时，工具条出现一个 `<select>`（值来自 node attrs.language），改完 `updateAttributes('codeBlock', { language })`。这一步独立有价值，不必等高亮。
2. **高亮（要产品负责人点头）**：照 `src/lib/katexLazy.ts` / `mermaidLazy.ts` 的惰性模式做 `src/lib/codeHighlight.ts` + 动态 import，**首屏 0 B**（`npm run verify` 的首屏集合仍是 `files=3` 一类断言要同步）。两种候选：① 手写一个 ~6–8 KB 的词法着色（js/ts/json/css/html/bash/python/markdown，只做注释/字符串/数字/关键字四类 token）；② 引一个按需 chunk 的现成库（体积与许可要记录）。AGENTS §4 要求「不新增运行时依赖，除非省下的代码比依赖大」，所以①或「单独一轮 + 产品负责人批准」是更稳的路径。
3. 预览面板与 HTML 导出要共用同一份高亮结果，否则又会出现「编辑有、导出没有」（Mermaid 已经踩过这个坑，见 `docs/typora-gap.md:34`）。

**风险**：着色必须只改 DOM、不改 Markdown 字节，否则 `npm run roundtrip` 与保存门会乱；错误语言/未知语言要静默降级为纯文本。**体积**：语言切换约 0.5 KB；高亮若引库另计（需批准）。
**优先级：P2（语言切换可先做；高亮单独一轮）**。

## 4. P2 专注 / 打字机没有键盘入口，也没有首次提示

**用户收益**：Typora 用 `F8` 专注、`F9` 打字机（`docs/iteration/typora-features.md:71`）。Sidelight 两个功能都实现了（点击有效、状态栏有 chip），但**没有键位、快捷键表里也不写**，写作者只能离开键盘去点顶栏。开启后没有任何提示条，打字机模式一开正文突然滚动，容易被当成故障。

**现状证据**
- `F8` / `F9` 按下后 `.app` 的 class 仍是 `app`、状态栏 `.status-chip` 仍是空数组（`.tmp/e2e-r39-typora8.mjs` 实测，输出 `before/afterF8/afterF9` 三份相同）；点「专注」按钮后 `t7-focus-mode.png` 显示正文压暗、顶栏高亮、状态栏出现「专注」chip（`.D_afterClick` 只量了 body class，以截图为准）。
- 快捷键对话框 23 个 `<kbd>` 里没有 F8/F9，也没有全屏与粘贴为纯文本（`.tmp/r39-typora-e2e4.json` `.C_shortcuts`、`t15-shortcuts.png`）；实现位置 `src/App.tsx:4627-4644`（两个按钮），状态在 `:411-412`，无 keydown 分支。

**实现要点**：`onKeyDown` 加 `F8` → `setFocusMode(v => !v)`、`F9` → `setTypewriterMode(v => !v)`（源码/预览模式里忽略，同 `:3816` 的既有判断）；`ShortcutsDialog.tsx:28-46` 加两行「视图」组。首次开启时在顶部放一条可关闭提示（Typora 有「不再显示」勾选），用现有 toast/提示组件即可，不必新写一套。
**体积与风险**：约 0.2 KB（键位）+ 0.3 KB（提示条）。风险：别抢宿主 F8（宿主已关浏览器加速键）；提示条要能 Esc 关。
**优先级：P2**（成本极低，日常手感提升）。

## 5. P2 表格单元格里按 Enter 静默无效，输入的字符并入上一个单元格

**用户收益**：在单元格里想换行时，多数人第一反应是 Enter。现在按 Enter 什么都不发生，接着输入的字符直接拼进当前单元格（实测 `甲` → `甲新行`），用户会以为输入法或编辑器卡了。

**现状证据**：载入 3 列表，点第一格、`End`、`Enter`、输入 `新行`；结果 `rowCount:2`（没加行）、`cellTexts:["甲新行","乙","3"]`、正文段落数 1（`.tmp/r39-typora-e2e3.json` `.B_cellEnter`、`t11-cell-enter.png`）。Typora 的帮助文档（`Docs/Table Editing.md`）只写 `Ctrl+Enter` 加行、`Shift+Ctrl+L` 删行，没写单元格内 Enter 的语义，所以 **Typora 侧行为本轮 UNVERIFIED**。

**实现要点（先定语义，二选一）**
- A（保守）：Enter 在单元格内等价 Shift+Enter（插入硬换行），至少不再静默吞键。
- B（Typora 风格）：Enter 跳到同列下一行首格，最后一格按 Enter 触发加行（与 Tab 末格加行一致）。
两种都只需在 Tiptap 的 table keymap 里加一条；删行键位顺带核对：Sidelight 用 `Ctrl+L`（`ShortcutsDialog` 写的是「表格内 Ctrl+Enter / Ctrl+L」），Typora 文档写 `Shift+Ctrl+L`，不一致，可在文档或键位表里统一。
**体积**：约 0.2 KB。**优先级：P2**（先定语义再做，避免又来一轮返工）。

## 6. P2 标题开头按 Backspace 不退回正文

**用户收益**：手滑把一行打成标题（`## `）后，本能是 Backspace 退回去。Sidelight 现在是空操作（`H2` 原样保留），要救只能知道 `Ctrl+0` 或去点工具条。这是每个写作者每天都会碰的小摩擦。

**现状证据**：载入 `## 二级标题` 后点标题、`Home`、`Backspace`：`h2Count` 仍 1、首块仍是 `H2`、文本不变（`.tmp/r39-typora-e2e4.json` `.B_backspaceAtHeadingStart`、`t14-heading-backspace.png`）。`git grep Backspace -- src/App.tsx` 0 命中，说明没有自定义 keymap，是 Tiptap 默认行为。
**实现要点**：加一条 keymap —— 光标在 heading 开头且 `event.key === 'Backspace'` 且无选区时 `setParagraph()`（保留文字）；若前面有段落则按现有 `joinBackward` 合并，不要抢。验收：H1–H6 各一条、开头有/无前置段落各一条，且不影响列表内的 Backspace（列表归 `ListItem` 管）。
**风险**：Backspace 是最敏感键之一，必须在 `scripts/keyboard-acceptance.mjs` 里补断言，避免又出现「一次按键两个动作」（第 35 轮 Esc 教训）。
**体积**：约 0.2 KB。**优先级：P2**。

## 7. P2 文档：`docs/typora-gap.md` 要补两行（缺的 11 → 13）

**核对结论**：计数本身是准的——「已经有的（29）」29 行、「缺的（11）」3+3+1+1+1+2=11 行，与 `README.md` / `AGENTS.md` 的 29 项有 / 11 项缺一致；抽查的 6 行（`typora-gap.md:46` 行内 HTML、`:47` 粘贴纯文本、`:54` 视图缩放、`:56` 全屏、`:63` 工作区图片、`:75` 全局搜索）与代码/本轮实测一致，未见需要改写的措辞。**问题在漏项**：

| 要补的行 | 放在哪 | 现状 | 优先级 |
| :--- | :--- | :--- | :--- |
| 代码块语法高亮 + 语言切换 | 「编辑与格式」缺的表（`:45-49`） | 无（`.D_code` spanCount 0、无语言选择） | P1/P2 |
| 表格单元格内硬换行（`<br>` 往返） | 「编辑与格式」缺的表 | 应用会写 `<br>`，但自己不解析（第 1 项） | P1 |

补完后计数是 **29 有 / 13 缺**，`README.md` 的「29 项有、11 项缺」与 `AGENTS.md` §6 的同一句要一起改（第 37 轮就是这么做的，见 STATE 第 37 轮记录）。另外 `:31` 表格行列那行建议加一句「单元格内换行写 `<br>`」，否则下一个人还会以为表格换行是好的。

## 8. 上轮已报、本轮复核仍有效（不重复计数）

| 项 | 状态 | 证据 |
| :--- | :--- | :--- |
| 全屏 F11 缺失 | 未变（本轮没重跑，沿用 r38） | `round-38/findings-typora.md` §2 |
| `Ctrl+滚轮` 改字号 | 未变 | 同上 §4 |
| 大纲「全部折叠/展开」 | 未变 | 同上 §5 |
| 粘贴为纯文本 `Ctrl+Shift+V` | 未变；本轮 `.C_shortcuts` 的 23 个键位里仍没有 | `.tmp/r39-typora-e2e4.json` `.C_shortcuts` |
| 行内 HTML 渲染 | 未变；本轮新增「表格里自产 `<br>`」这个受害者场景，见第 1 项 | `.tmp/r39-typora6.log`、`.tmp/r39-typora7.log` |
| 拖入 `.md`、图片落盘规则、全局搜索、`colwidth` 导出 | 未变 | 同上 §6–§10 |

## 9. 试过没问题的路径（免得下一轮重复劳动）

1. **表格列对齐**：渲染有 `text-align`，改数据后分隔行仍带 `:`（`.tmp/r39-typora-e2e2.json` `.A_*`）。
2. **表格最后一格 Tab**：自动加行（3→4 行）。
3. **正文 Shift+Enter**：写成行尾两空格硬换行，重载后是真 `<br>`（`.tmp/r39-typora7.log`）。
4. **任务列表勾选**：点 checkbox 生效，`checked` 从 `[false,true]` 变 `[true,true]`（`.tmp/r39-typora-e2e.json` `.B_task*`）。
5. **从网页/Excel 粘贴富文本表格**：带 `text/html` 的 `<table>` 直接变成 Markdown 表格（`.A_pasteTable`/`.A_source`）。
6. **正文里的裸 URL**：输入即自动成链接，序列化为 `[url](url)`（`.tmp/r39-typora-e2e2.json` `.E_autolink`/`.E_source`）。
7. **预览面板链接**：带 `target="_blank"`，点击不把应用页带走（`.tmp/r39-typora-e2e3.json` `.C_previewLinks`/`.C_afterPreviewLinkClick`）。

## 10. 角色重点方向逐条对照（本轮定位）

| 方向 | 本轮判断 |
| :--- | :--- |
| 主题体系 | 差距表已列 P2（明/暗/跟随系统三档，无自定义主题）；本轮未找到新证据，不计数 |
| 图片落盘规则（`${filename}.assets`） | r38 §8 已报，仍缺；不重复计数 |
| 表格列宽拖拽 | 已有（37 轮）；本轮另测对齐与末格 Tab，均正常 |
| 行内 HTML 渲染 | 仍缺；本轮把它与第 1 项（表格 `<br>`）绑定，说明它是「自产自读」问题的根因 |
| 粘贴为纯文本 | 仍缺；r38 §7 已报 |
| 全屏 / 缩放 | 仍缺；r38 §2/§4 已报 |
| 文件列表形态 | 差距表 P2；不重复 |
| 字数明细细化 | 已有（30 轮） |
| 大纲折叠细化 | 折叠有，「全部折叠/展开」与持久化缺（r38 §5） |
| Mermaid 进阶 | b 半（相同代码 SVG id 唯一）已排下一轮优先①；主题/错误态/复制源码未做 |
| 智能标点细化 | 33 轮 + 38 轮已修 `\|` 行；本轮未发现新问题 |
| 快捷输入 | 裸 URL 自动链接正常；代码块语言、表格内 Enter、标题 Backspace 三处摩擦见第 3/5/6 项 |

## 11. 截图索引（`shots/round-39/`）

| 文件 | 内容 |
| :--- | :--- |
| `t1-table-align.png` | 三列左/中/右对齐渲染 |
| `t2-link-click.png` | 点链接后的就地编辑浮层（只有文字/地址，无打开按钮） |
| `t3-code-block.png` | 代码块单色（无高亮） |
| `t4-table-cell-break.png` | 单元格 Shift+Enter 后当场是真换行 |
| `t6-table-tab-last.png` | 末格 Tab 后新增一行 |
| `t7-focus-mode.png` | 专注模式生效（正文压暗、状态栏 chip） |
| `t8-autolink.png` | 裸 URL 自动成链接 |
| `t9-cell-br-reload.png` | 重载后单元格显示字面 `3A<br>B`（P1 主证据） |
| `t10-cell-literal-br.png` | 手工输入 `<br>` 也是字面 |
| `t11-cell-enter.png` | 单元格内 Enter 无效、字符并入 |
| `t12-preview-links.png`、`t13-after-preview-link.png` | 预览面板链接 `_blank`、点后应用页不跳走 |
| `t14-heading-backspace.png` | 标题开头 Backspace 无变化 |
| `t15-shortcuts.png` | 快捷键表 23 个键位（无 F8/F9/全屏/纯文本） |
| `t16-preview-mermaid.png` | 预览视图里的 Mermaid（本轮测量较粗，未作结论） |
| `t17-br-reload-minimal.png`、`t18-para-hardbreak.png` | `<br>` 最小复现与正文硬换行对照 |

## 12. UNVERIFIED 与补测方法

1. **保存到磁盘后的真实重开**：本轮用「源码框载入同一段 Markdown」复现（与保存后重开同一条解析路径），没有 FSA 句柄写盘。补测：打开文件夹 → 表格里 Shift+Enter → `Ctrl+S` → 关闭再打开该文件，看单元格是否仍是字面 `<br>`。
2. **宿主里打开链接**：`window.open` 在 WebView2 的 `NewWindowRequested` 行为未验。补测：重建宿主后点「打开」，确认交给默认浏览器；未处理时应不弹空白窗。
3. **Ctrl+滚轮缩放**（r38 §4）：宿主内是否被 Chromium 页面缩放吃掉，仍未验。
4. **Typora 侧**：本机只有 0.11.18 的参考资料与截图，本轮没有启动 Typora（版本时间炸弹）。第 5 项「单元格内 Enter」与第 6 项「标题 Backspace」的 Typora 对应行为属于**推断**，标 UNVERIFIED；`Docs/Table Editing.md` 只证实 `Ctrl+Enter` 加行与 `Shift+Ctrl+L` 删行。
5. **代码块高亮的体积**：本轮只做了空闲研究，没有写原型，`lazy chunk` 的真实 gzip 未测；若产品负责人同意引库，先用 `scripts/measure-first-screen.mjs` 验证首屏不变，再单独量化点击后的下载量。
6. **预览面板 Mermaid**：本轮在预览视图量到 `svgCount:0`，但没断言预览 pane 真的打开，因此不作为「差距表过期」的证据；补测用 r38 的 `Ctrl+Shift+P` 路径数图。

## 13. 给 planner 的排序建议

1. **表格单元格 `<br>` 往返**（P1，约 0.4–0.8 KB，纯解析侧，不碰序列化；与行内 HTML 白名单可合并）。
2. **编辑视图打开链接**（P1，约 0.4–0.7 KB；web 先行、宿主兜底复制）。
3. **代码块语言切换**（P2，0 依赖 0.5 KB；高亮单独一轮，要产品负责人批准依赖）。
4. **F8/F9 键位 + 首次提示条**（P2，约 0.5 KB）。
5. **表格内 Enter 语义**（P2，先定 A/B 方案）。
6. **标题开头 Backspace**（P2，补 keyboard-acceptance 断言）。
7. **差距表补两行 + 计数 29/13 + README/AGENTS 同步**（文档，10 分钟）。

排序依据仍是看板：稳定性 > 核心功能 > 体积优化 > 节省 Token > 速度。前两项都属于「用户当场就会撞上、结果看起来像坏了」，优先于加新功能。
