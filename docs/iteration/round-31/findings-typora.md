# 第 31 轮 · Typora 对照与写作体验（findings-typora）

- 角色：Typora 对照与写作体验侦察（只读产品代码，未改产品代码）
- 环境：Windows 11、Node 24.21、dev server `http://localhost:5175`、浏览器 CDP `127.0.0.1:9223`
- 对照样本：`.tmp/typora-ref`（Typora 0.11.18 解包）、`shots/typora/`（71 张）、`docs/iteration/typora-features.md`、`docs/typora-gap.md`
- 实测脚本：`.tmp/e2e-r31-typora.mjs`、`.tmp/e2e-r31-typora2.mjs`、`.tmp/e2e-r31-typora3.mjs`
- 原始输出：`.tmp/e2e-r31-typora.json`、`.tmp/e2e-r31-typora2.json`、`.tmp/e2e-r31-typora3.json`、`.tmp/e2e-r31-typora.progress.log`
- 截图：`shots/round-31/r31-stats-detail.png`、`r31-list-tab.png`、`r31-table-inline-html.png`、`r31-link-editor.png`
- 代码基线：`main` @ `5b36b71`（round-30），版本 0.32.1

## 摘要

本轮实测 15 项行为，给出 10 条改进建议。其中 **4 条新发现**：① 点正文里的链接完全没有反应（`openLinkRef` 声明后从未赋值，`src/App.tsx:519`、`:797`），而且应用内没有任何打开外部浏览器的路径（`host/Program.cs` 无 `NewWindowRequested`/`Process.Start`）；② 第 30 轮刚上线的字数明细里「字」与「词」两行同值（46/46），等于一个空行；③ 状态栏不随选区显示计数（Typora 显示「9 / 195 词」）；④ 自动配对括号引号仍缺。**3 条复提**（列表 Tab 缩进、表格列宽、图片落盘规则）：只补新证据，不重复实现细节；行内 HTML 渲染仍在「已提但仍未做」表里，不占本轮 10 条。**2 条新角度**：专注/打字机缺 F8/F9 与首次提示；应用内全屏可以走纯前端「禅模式」，绕开必须单独一轮的宿主改动。

体积：首个屏 gzip **284,529 B / 上限 286,000 B，余 1,471 B**（本轮 `node scripts/measure-first-screen.mjs` → PASS，2 个文件）。本轮建议的首屏增量合计估算 <1.2 KB（不含表格列宽）。

`docs/typora-gap.md` **仍然过期**，且表头「缺的（18）」与自己表的 19 行不符（脚本计数确认）。第 29 轮实现的大纲折叠、0.32.x 已发的新建/重命名/删除、快速打开、缩放、三档主题都还写在「缺」里，其中「缩放」同时出现在「已有」与「缺」。修正后 **26 有 / 17 缺**，明细见第 3 节。

## 1. 本轮实测现状

方法：`Ctrl+/` 进源码模式写入含 2 级标题、表格、行内 HTML、外链的 Markdown，再切回富文本（走产品自己的 `applySource`）；列表、自动配对、F8/F9 用真实键盘事件；字数明细、查找条、快捷键一览用真实点击/按键。`reset.mjs 9223` 在本轮开测前跑过，页面无 localStorage/IndexedDB 旧状态。

| # | 行为 | 实测结果 | 证据 |
| :--- | :--- | :--- | :--- |
| 1 | 字数明细面板（第 30 轮上线） | `.stats-trigger` 是 `BUTTON`、`aria-haspopup=dialog`；点开出现 `.stats-detail`（`role=dialog`），行：字 46 / 字符 80 / 词 46 / 句 5 / 段 1 / 阅读 1 分钟 / 选区「未选中文本」；Esc 关闭、焦点回到按钮、`aria-expanded` 由 true 变 false | `.tmp/e2e-r31-typora.json` → `steps.wordcount`；`r31-stats-detail.png` |
| 2 | 明细「字」「词」同值 | 两行都是 `46`；`词` 行取的是 `cjk + words` 的合计（`StatsDetail.tsx:70-79`），与「字」完全重复 | 同上；`src/components/StatsDetail.tsx:72-79` |
| 3 | 状态栏选区计数 | 选中「第一章 起点」后，`.status-left` 仍是「46 字 · 阅读约 1 分钟」，无选区 chip，`hasSelectionChip = 0` | `steps.selection` |
| 4 | 列表 Tab 缩进 | 两项列表在第二项按 Tab：`li > ul` 仍为 0，正文多出两个空格（`项目二   `，行尾双空格 = Markdown 硬换行） | `steps.listTab`；`r31-list-tab.png` |
| 5 | 列表 Shift+Tab | 无嵌套、无文本变化，焦点仍在正文（本轮未复现第 30 轮的「焦点弹出到按钮」） | `steps.listTab.afterShiftTab` |
| 6 | 自动配对括号/引号 | 输入 `括号(` → `括号(`；再输 `"` → `括号("引号`。没有右括号、没有右引号 | `steps.typing` |
| 7 | 智能标点 | 输入 `--` 原样保留；切源码读回 `括号("引号--破折`，字节与屏幕一致（没有转弯引号、没有破折号） | `steps.typing.sourceBytes` |
| 8 | 表格列宽拖拽 | 1 个 `table`、有 `colgroup`、`.column-resize-handle` 0 个、`resizable` 类 false、`col` 只有 `min-width: 25px` | `steps.table` |
| 9 | 行内 HTML | `<kbd>` 0 个、`<mark>` 0 个；段落文字是 `<kbd>Ctrl</kbd> 与 <mark>高亮</mark>。` 原文 | `steps.inlineHtml`；`r31-table-inline-html.png` |
| 10 | 点击正文链接 | 正文有 1 个 `<a target="_blank" rel="noopener noreferrer nofollow" href="https://example.com/page">`；点击后 `.link-editor` **不出现**、页面数 2→2（没有新标签）、焦点仍在正文 | `.tmp/e2e-r31-typora2.json` → `anchors`、`afterClick`、`pagesAfter` |
| 11 | Ctrl+K 链接浮层 | 有选区时打开 `.link-editor`：两个输入框（文字 / 地址），**0 个按钮**；提示只有「Enter 保存，Esc 取消」 | 同上 → `ctrlK`；`LinkEditor.tsx:107-109` |
| 12 | F8 / F9 | 按 F8、F9 后 `.app` 的 class 不变、`.status-right` 无「专注」「打字机」chip | `steps.focusKeys` |
| 13 | 查找条 | `.find-bar` 可见，2 个输入框、5 个按钮（↑ ↓ ✕ 替换 全部替换），无 `aria-pressed` 选项 | `steps.findBar` |
| 14 | 拖入 `.md` 文件 | 合成 `drop` 事件（`File('dropped.md')`）后 `defaultPrevented = false`，正文与文件树都不变 | `steps.dropFile` |
| 15 | 快捷键一览 | 无 `Ctrl+Shift+V`、无 F8/F9/F11、无全屏；末尾仍写「Ctrl+N / Ctrl+O / Ctrl+Shift+S 被浏览器保留，没有绑定」 | `steps.shortcutsDialog` |

补充源码核对（不跑界面也能确认）：

- `src/App.tsx:519` 声明 `openLinkRef`，`:797` 调用它；全仓库（`src` 递归）只有这两处，**没有赋值**。所以 `handleClick` 对链接 `preventDefault` 之后什么都不做，点击被静默吞掉。
- `src/App.tsx:766-774`：Tab 分支只有「表格内放行、文档开头跳过、其余 `insertText('  ')`」三条；`event.shiftKey` 在 `:766` 直接 `return false`，Shift+Tab 没有任何缩进/反缩进逻辑。
- `src/App.tsx:776-790`：`handleDrop`/`handlePaste` 只筛 `image/*`，`.md` 与文件夹一律不接。
- `src/App.tsx:4427-4441`：专注/打字机只有两个按钮 `onClick`，全局 `keydown`（`:3417-3565`）里没有 F8/F9；`ShortcutsDialog.tsx:41-46` 的「视图与字号」组也没有这两行。
- `host/Program.cs`：全文只有 `:1491` 的 `AreBrowserAcceleratorKeysEnabled = false` 与 `:1753` 的最小化恢复；`Select-String` 查 `FullScreen`、`NewWindowRequested`、`Process.Start` 均无命中。
- `src/lib/asset.ts:40-52`：`writeAsset` 固定写 `assets/` 并返回 `assets/${fileName}`，没有落盘规则参数。

## 2. 改进建议（按收益/成本排序）

2.1–2.4、2.7–2.9 都落在现有 Tiptap + WebView2 模块内，不引依赖；2.5 用已在依赖里的 Tiptap `resizable`；2.6、2.10 也都不引库。

### 2.1 点链接没反应，且应用内不能打开外链 — P1，S（新）

**用户收益**：写完要核对引文、打开自己贴的参考链接，是每天的收尾动作。Typora 点链接直接交系统浏览器（`typora-gap.md:27` 的对照项，`shots/typora/02-window-maximized.png` 里链接可点）。现在 Sidelight 里点链接**什么都没发生**：既不弹编辑框，也不开浏览器。用户会以为链接坏了。

**现状证据**：第 1 节第 10、11 项；`App.tsx:519` 声明、`:797` 调用的 `openLinkRef` 从未赋值（仓库内仅 2 处匹配）；`LinkEditor.tsx:107-109` 只有提示文字、没有「打开」按钮；`host/Program.cs` 没有 `NewWindowRequested` 处理，也没有任何 `Process.Start`。

**实现要点**：

1. 前端先恢复设计意图：在 `useEffect` 里给 `openLinkRef.current` 赋值（照 `openLinkAtCursorRef` 的写法，`App.tsx:3880-3909`）：`const pos = view.posAtDOM(anchor, 0)`，取该位置的 `link` mark，`setLinkEdit({ text, href, from, to, focus: 'text', anchor })`。这样单击链接至少回到「就地编辑」，与 `Ctrl+K` 一致。
2. `LinkEditor` 增加「打开链接」「复制地址」两个按钮（现在是 0 个按钮）；「打开链接」经 `hostBridge` 发一条新消息，非宿主环境退化为对 `href` 做 `navigator.clipboard.writeText` 并提示「已复制，浏览器里打开」。
3. 宿主加 `core.NewWindowRequested += (_, e) => { e.Handled = true; OpenExternal(e.Uri); }`，`OpenExternal` 只放行 `http`/`https`/`mailto`（其余记一条日志并忽略，禁止 `file:` 与带参数命令）。同时给当前链接的 `target="_blank"` 兜底：即使页面没拦住，也走同一条白名单。
4. 回归：`Ctrl+K` 行为不变；编辑模式下点链接不再「无反应」；导出 HTML 里的链接保持原样。

**体积与风险**：前端约 40 行，首屏增量 <250 B；宿主约 25 行。**宿主改动按 `typora-features.md:167` 要单独一轮**并跑 `host-smoke` 回归加速键与「0 控制台错误」。风险：`Process.Start` 打开外部 URL 是新安全面，白名单协议必须硬编码；macOS 宿主要用 `NSWorkspace.open`，本轮没做。若本轮只做前端部分，就把「打开外链」留给宿主轮，前端只恢复点击弹编辑框。

### 2.2 字数明细：「字」「词」同值，状态栏不显示选区 — P1，S（新）

**用户收益**：中文作者每天看字数判断进度。第 30 轮的明细面板方向对，但两行重复（46/46），用户看不出「词」有什么意义；选区数又必须点开面板才看得到。Typora 是反过来：状态栏随选区显示「9 / 195 词」（`typora-features.md:53`，`shots/typora/01-live-preview.png`）。

**现状证据**：第 1 节第 1–3 项；`StatsDetail.tsx:70-79`：`total = cjk + words`，然后 `['字', total]` 与 `['词', total]` 两行都传 `total`；`:104` 的选区行只给「字 / 字符 / 句」；`StatusBar.tsx:38-48` 的按钮文案只来自 `formatStats(stats)`，没有选区参数。数据侧 `wordcount.ts:47-57` 已算出 `cjk`、`words`、`chars`、`paragraphs`、`minutes`，`:72-77` 有 `countSentences`。

**实现要点**：

1. 明细行改为：汉字（`cjk`）、拉丁词（`words`）、合计（`cjk + words`）、字符、句、段、阅读。术语全篇统一，不改统计口径。
2. `StatusBar` 增加 `selectionText?: string` 参数，非空时在触发按钮后加一个只读 chip「选区 N 字」；`selectionStats` 在 `onSelectionUpdate` 里更新，沿用现有 180 ms 防抖节奏（`App.tsx:818-823` 同类写法）。
3. `StatsDetail` 的「词」行加 `title` 说明「拉丁词数，不含中日韩字」，避免和「合计」混淆。
4. `wordcount.test.ts` 补 2 条：中文标点不进 `cjk`；选区子串的 `countText` 与整篇口径一致。

**体积与风险**：约 30 行，首屏 <300 B。风险：每次选区变化都 `setState` 会让大文件拖慢，必须防抖；状态栏 chip 变多后窄窗要 `truncate`，不要挤掉自动保存提示。

### 2.3 列表 Tab / Shift+Tab 缩进与反缩进 — P1，S（复提，仍未做）

**用户收益**：多级列表是中文写作常态。Typora 的 Tab 降一级、Shift+Tab 升一级（`typora-gap.md:42`）。现在 Tab 往正文里插入两个空格，Shift+Tab 没有任何反应。

**现状证据**：第 1 节第 4、5 项；`App.tsx:766-774`。Tab 写出的行尾双空格在 Markdown 里是硬换行语义，保存后可能变成 `<br>`——「按 Tab 后保存结果和屏幕不一致」。这是本轮复现 R30 第 1 节第 5 项的同一个现象。

**实现要点**：

1. 在 Tab 分支前判断 `editor.isActive('listItem') || editor.isActive('taskItem')`；是则 Tab → `sinkListItem('listItem')`，Shift+Tab → `liftListItem('listItem')`，各自 `preventDefault()` 并返回 `true`。
2. 保留现有约定：`event.isComposing` 放行（`:766` 已有）；文档开头 Tab 跳过（`:771-772`）只留在非列表分支；表格内 Tab 仍跳格（`:767-768`）。
3. E2E 补一条到现有键盘验收脚本：两项列表 → Tab 产生嵌套 `ul` → Shift+Tab 退回顶层。

**体积与风险**：约 20 行，首屏 <100 B。风险：Shift+Tab 现在是「回顶栏」的无障碍路径（`ShortcutsDialog.tsx:72`），只在列表内接管，其他位置必须保持原样。

### 2.4 自动配对括号与引号 — P1，S（新提；差距表 P1 未做）

**用户收益**：中文写作里 `（`、`「`、`**`、`` ` `` 都是左右成对；每次补右半是纯开销。Typora 有该能力且做成开关（`Change Log.md:843`「Auto pair for normal mark…」、`:1007`「Add options to auto pair co…」）。

**现状证据**：第 1 节第 6 项；`typora-gap.md:40`；`src/App.tsx:715-741` 的扩展列表里没有自动配对扩展，`handleKeyDown`/`handlePaste` 也没有插入右半的分支。

**实现要点**：

1. 用 `editorProps.handleTextInput(view, from, to, text)`：只处理单字符；`view.composing` 为真直接返回 false（中文输入法组合期间不能介入）；代码块与行内代码内跳过。
2. 配对表：`(`→`)`、`[`→`]`、`{`→`}`、`"`→`"`、`'`→`'`、`（`→`）`、`「`→`」`；`` ` `` 只在行内代码语境配对。
3. 「收尾即跳过」：输入右括号且右侧正好是同一字符时，只移动光标不插入（避免 `))`）。
4. 判定放纯函数 `src/lib/autopair.ts`：`nextText(char, before, after, selectionEmpty)` 返回「插入什么、光标走几步」；单测 8 条：空格后补右半、已有右半跳过、选区被包裹、IME 组合期间不插入、代码块内不配对、`"` 与智能标点叠加时先转换再配对。
5. 设置项「自动配对」（默认开）进 `settings.ts` 与 `SettingsDialog`，与 Typora 的开关对齐。

**体积与风险**：约 70 行 + 8 条测试，首屏 <400 B。风险：与智能标点叠加有先后顺序；真实 IME 下的 `compositionend` 时序本轮无法测（见第 5 节）。

### 2.5 表格列宽拖拽 — P1，M（复提，本轮仍未做）

**用户收益**：中文表格按内容分布的列宽经常失衡，Typora 表头图标可直接拖（`Table Editing.md:46-50`）。

**现状证据**：第 1 节第 8 项；`App.tsx:119-128` 的 `ReusableTable` 只重写 `renderMarkdown`；`:729-733` 注册 `Table` 时未 `configure({ resizable })`。

**实现要点与风险**：实现细节见 R29 2.4 与 R30 2.6，不再重复。本轮只补两条硬要求：① `colwidth` 必须从 Markdown 序列化里剥离（`tableReuse.ts` 的「未动过的表格整块复用」会因此失效）；② Tiptap 的列宽插件代码在现有依赖里（`@tiptap/extension-table`），但首屏 CSS + 插件可能 +2 KB 以上，而首屏只剩 **1,471 B**（第 4 节），**必须先跑 `measure-first-screen.mjs` 再决定同轮还是拆轮**。

### 2.6 图片落盘规则（`assets/` / `<文档名>.assets/` / 相对路径）— P1，M（复提，本轮仍未做）

**用户收益**：Typora 有「相对路径 if possible」与 frontmatter 的 `typora-copy-images-to`（`Use Images in Typora.md:48-50`、`:68`）。多篇共用 `assets/` 时同名会冲突；`<文档名>.assets/` 是中文作者更常见的组织方式。

**现状证据**：`asset.ts:40-52` 硬编码 `assets/`；`App.tsx:776-790` 只在有文件夹句柄时落盘。实现细节见 R29 2.5，不重复。本轮补一条：`rename.ts` 改名时只迁缓存键，**不迁图片目录**；如果先上 `<文档名>.assets/`，改名后相对路径会断，所以第一版建议只做「子目录名可配置」（默认 `assets`），目录改名联动单独立项。

### 2.7 专注/打字机键位 F8/F9 与首次提示 — P2，S（新）

**用户收益**：Typora 用 F8/F9 切专注与打字机，首次开启弹一条可关闭的提示（`typora-features.md:45`、`:71`）。Sidelight 只有顶栏两个按钮、静默开启，用户不知道开了、也不知道怎么关。

**现状证据**：第 1 节第 12、15 项；`App.tsx:4427-4441` 只有按钮；全局 `keydown`（`:3417-3565`）没有 F8/F9；`ShortcutsDialog.tsx:41-46` 也没有这两行。

**实现要点**：在全局 `keydown` 里加 `F8` → `setFocusMode(v => !v)`、`F9` → `setTypewriterMode` + `requestAnimationFrame(typewriterRef.current)`（`:4441` 已有同样调用）；首次开启时在状态栏加一条「专注模式已开启（F8 关闭）」chip，附「不再显示」把偏好写进 `settings.ts`；快捷键一览补两行。

**体积与风险**：约 20 行，首屏 <200 B。风险：F8/F9 在输入法与屏幕阅读器里可能有含义，只在非输入框路径触发；macOS 上 F8 常需 Fn 组合，键位表要注明。

### 2.8 应用内全屏（禅模式，纯前端）— P2，S/M（新角度）

**用户收益**：Typora 用 F11 全屏（`typora-features.md:72`）。现在 Sidelight 的宿主层没有全屏分支（`host/Program.cs` 全文无 `FullScreen`），改宿主按 `typora-features.md:167` 要单独一轮并回归加速键；但「写作时不看侧栏和顶栏」这个需求可以先用 CSS 做掉。

**现状证据**：`host/Program.cs` 只有 `:1491` 加速键与 `:1753` 最小化恢复；`App.tsx:4184` 的 `.app` 已经有 `focus-mode`/`rail-open` 这类 class 的先例，加一个 `zen` 类即可。

**实现要点**：`.app.zen` 下隐藏 `.topbar`、`.sidebar`、`.status-bar`、页边批注栏，正文列居中加宽；全局 keydown 加 `F11`：先 `await document.documentElement.requestFullscreen()`，抛错就只切 `zen` 类；Esc 退出（沿用现有 Esc 优先级链，`App.tsx:3433-3485` 末尾加一支）；顶栏与快捷键一览各加一处入口。

**体积与风险**：约 35 行 CSS + 10 行 TS，首屏 <400 B。风险：WebView2 的 Fullscreen API 需要宿主侧设置，**本轮未验证**；F11 可能仍被窗口层截走，所以 CSS 退化路径必须可用；打印/导出的样式要忽略 `zen`。

### 2.9 拖入 `.md` 文件打开 — P2，S（新证据）

**用户收益**：把文件从资源管理器拖进 Typora 就能开（`typora-gap.md:60`，P1）。现在拖进来毫无反应，用户会以为应用卡了。

**现状证据**：第 1 节第 14 项；`App.tsx:776-783` 的 `handleDrop` 只接 `image/*`。

**实现要点**：`handleDrop` 里对 `file.name` 以 `.md`/`.markdown` 结尾的文件读 `file.text()`，走现有「切换文档」脏检查（`pendingSwitch`）后载入为宿主文档（无句柄时保存走 picker 或草稿）；目录用 `webkitGetAsEntry()?.isDirectory` 识别并提示「用『打开文件夹』」；多文件只取第一个并提示。

**体积与风险**：约 40 行，<250 B。风险：拖入触发脏检查弹窗时要保证取消后不丢当前文档；不能挡住图片拖入；真实 OS 拖放的 `file.type` 可能是空串，判断要按扩展名而不是 MIME（本轮用合成事件，真实拖放未测）。

### 2.10 表格列对齐与键盘建表 — P2，M（新，建议下轮再做）

**用户收益**：Typora 表头工具条可设列对齐并序列化成 `:---:`（`Table Editing.md:54-66`），也可以只打表头行 + Enter 建表（`:20-26`）。Sidelight 现在只能手改源码对齐，表格工具条 7 个按钮全是增删（`App.tsx:4490-4514`）。

**实现要点**：`TableCell`/`TableHeader` 加 `textAlign` 属性；Markdown 序列化写 `:---`/`---:`/`:---:`；`tableReuse.ts` 的整块复用要识别对齐变化；工具条加 3 个 `aria-pressed` 按钮。键盘建表用 `InputRule` 匹配「一行以 `|` 开头且以 `|` 结尾、按 Enter」，转成两列表头。

**体积与风险**：约 80 行，首屏 <600 B。风险：与 2.5 同轮会叠加序列化风险，建议拆开；本轮不推荐。

### 已提但仍未做（不重复展开）

| 项 | 首次提出 | 本轮核对 |
| :--- | :--- | :--- |
| 粘贴为纯文本 / 复制为 Markdown | R29 2.3、R30 2.5 | 仍未做（`handlePaste` 只处理图片） |
| 查找条大小写 / 整词 | R30 2.4 | 仍未做（第 1 节第 13 项，5 个按钮无选项） |
| 代码块语法高亮 | R30 2.3 | 未复测；源码无高亮扩展 |
| 行内 HTML 渲染 | R29 2.7 | 仍未做（第 1 节第 9 项） |
| Mermaid | R29 2.8、R30 2.8 | 结论不变：最省路径 163 KB gzip，默认内置不可行，等产品负责人决策 |

## 3. `docs/typora-gap.md` 过期核对（本轮更新）

计数用脚本核过：`## 已经有的（21）` 表里 21 行（与表头一致）；`## 缺的（18）` 表里 **19 行**（表头与内容不符）。

| 差距表位置 | 表中写的 | 实际（本轮证据） |
| :--- | :--- | :--- |
| `:17` 字数与阅读时间「有」 | 只写状态栏 | 已有明细面板（第 1 节第 1 项），应补「点开有字符/句/段/阅读与选区内计数」 |
| `:39` 行内 HTML 不渲染 | 保真不渲染 | 未过期（第 1 节第 9 项） |
| `:40` 自动配对「无」 | 无 | 未过期（第 1 节第 6 项） |
| `:41` 智能标点「无」 | 无 | 未过期（第 1 节第 7 项） |
| `:42` 缩进与反缩进「无」 | 无 | 未过期，且更糟：Tab 写行尾双空格、Shift+Tab 无动作（第 1 节第 4、5 项） |
| `:43` 粘贴为纯文本「无」 | 无 | 未过期（源码只接图片） |
| `:44` 高亮/上下标/TOC/emoji「无」 | 无 | 未复测（沿用 R29 结论） |
| `:50` 缩放「无」 | 无 | **过期**：与本表 `:25`「字号与缩放 有」自相矛盾（`README.md` 现状节也有） |
| `:51` 全屏「无」 | 无 | 未过期（`host/Program.cs` 无全屏分支） |
| `:52` 大纲折叠「无」 | 无 | **过期**：第 29 轮已实现，`Outline.tsx:56` 的 `aria-expanded` 仍在；R30 实测 3 行折成 1 行 |
| `:53` 文件列表形态「无」 | 无 | 未过期（侧栏只有 files/outline 两个页签，`App.tsx:4521-4531`） |
| `:59` 新建/重命名/删除「无」 | 无 | **过期**：`FileMenu.tsx`、`TreeActions.tsx`、`lib/rename.ts`、`lib/trash.ts` 都在，0.32.x 已发 |
| `:60` 拖入文件或文件夹「无」 | 无 | 未过期（第 1 节第 14 项） |
| `:61` 快速打开 Ctrl+P「无」 | 无 | **过期**：`App.tsx:3552-3555` 绑定 Ctrl+P，`QuickOpen.tsx` 有实现 |
| `:62` 最近文件 | 写在「缺」节，现状却写「有（8 条…）」 | **自相矛盾**，应移到「已有」 |
| `:69` Mermaid「无」 | 无 | 未过期（R30 体积结论不变） |
| `:81` 主题「只有跟随系统的明暗」 | 只有明暗 | **过期**：`SettingsDialog.tsx:43-70` 是浅色 / 深色 / 跟随系统三档 |
| `:84-92` 建议的下一批 | 列了「全局搜索与最近文件」「主题与自定义快捷键」 | 「最近文件」已有；「自定义快捷键」与主题细项仍缺；「行内 HTML 渲染」仍在（与 `:88` 一致） |

**应新增的「缺」行**（当前表漏记）：

- 表格列宽拖拽（P1，见 2.5）。
- 代码块语法高亮（P2，见 R30 2.3）。
- 点击链接打开外部浏览器 / 默认应用（P1，见 2.1）。
- 表格列对齐（P2，见 2.10）。

**修正后的计数**：从「缺」移到「有」5 项（缩放、大纲折叠、新建/重命名/删除、快速打开、最近文件）→ 缺 14；新增 3 行「缺」（列宽、代码高亮、外链）→ **缺 17**；「有」从 21 变 **26**。`README.md:79` 的「已有 21 项，缺 18 项」与 `docs/iteration/STATE.md` 里的同类数字需同步改成 **26 / 17**。

## 4. 为什么适合 2 MB 级 WebView2 应用

本项目没有 Electron 运行时，首屏预算只剩 1,471 B，所以每条建议都要过体积关：

| 项 | 首屏 gzip 估算 | 依据 |
| :--- | :--- | :--- |
| 2.1 链接点击修复 + 打开按钮（前端部分） | <250 B | 复用 `LinkEditor`，只加 2 个按钮与一个 `useEffect` 赋值 |
| 2.2 明细行拆分 + 状态栏选区 chip | <300 B | `wordcount.ts` 的数据已算出，无新算法 |
| 2.3 列表 Tab/Shift+Tab | <100 B | 两个 Tiptap 命令，无新模块 |
| 2.4 自动配对 | <400 B | 一个纯函数 + `handleTextInput`，无库 |
| 2.7 F8/F9 + 提示 | <200 B | 两个 keydown 分支 + 现有 chip 样式 |
| 2.8 禅模式 | <400 B | 纯 CSS class + 一个键位；Fullscreen API 是浏览器内置 |
| 2.9 拖入 `.md` | <250 B | 复用现有 `pendingSwitch` 与文档载入链 |
| 2.5 表格列宽 | **≥2 KB，需先量** | Tiptap 列宽插件 + CSS；当前余量 1,471 B，可能超 |
| 2.10 表格对齐 | <600 B | 序列化分支 + 3 个按钮；风险在保真不在体积 |

本轮实测数据（`node scripts/measure-first-screen.mjs`）：

```text
   892443   277501  /assets/index-BVO7nHXS.js
    33784     7028  /assets/index-BLxN31Mr.css
total raw=926227 gzip=284529 files=2 max=286000
PASS
```

Windows setup 侧：824,209 B / 内部预算 820,000 B（已超 4,209 B）/ 硬线 850,000 B（余 25,791 B），来自 R30 记录，本轮未重测（`release/` 未动）。

结论：2.1、2.2、2.3、2.7、2.9 合计估算 <1.2 KB，可以同轮做完；2.4 也放得下，但要在 `npm run build` 后重跑 `measure` 确认还剩余量。2.5 与 2.10 必须单独立项并先量体，两者不要同轮。

## 5. 未验证

- 真实中文输入法下的自动配对与智能标点（本机无可用 IME 自动化，`AGENTS.md` 未验清单已有）。
- WebView2 的 Fullscreen API 与 F11 是否到达页面（宿主本轮未跑，只读源码）。
- 宿主里点击外链的默认行为：未处理 `NewWindowRequested` 时 WebView2 是静默丢弃还是开系统浏览器，本轮只确认「页面没有新标签」。
- 真实 OS 拖放的 `.md`：本轮用合成 `DragEvent` + `DataTransfer`，真实拖放的 `file.type` 可能为空串。
- 安装包对新增代码的真实增量（NSIS 压缩后），本报告用首屏 gzip 近似。
- 大纲折叠本轮未重跑界面（只读源码 + R30 实测证据）。
- 状态栏选区计数在源码模式与预览模式下的口径（只在编辑模式测过）。
- Typora 0.11.18 侧的自动配对、F8/F9、表格列宽只按内置文档与 R30 截图核对，本轮未在 Typora 里重跑。

## 6. 证据索引

- 实测脚本与输出：`.tmp/e2e-r31-typora.mjs` / `.json` / `.progress.log`；`.tmp/e2e-r31-typora2.mjs` / `.json`；`.tmp/e2e-r31-typora3.mjs` / `.json`。
- 截图：`shots/round-31/r31-stats-detail.png`（明细面板与字/词同值）、`r31-list-tab.png`（列表 Tab 无嵌套）、`r31-table-inline-html.png`（表格无手柄、行内 HTML 未渲染）、`r31-link-editor.png`（点击链接后无浮层）。
- 源码：`src/App.tsx:519`、`:766-774`、`:776-790`、`:793-807`、`:3417-3565`、`:3880-3909`、`:4427-4441`、`:4490-4514`、`:4521-4531`；`src/components/StatsDetail.tsx:70-107`；`src/components/StatusBar.tsx:38-48`；`src/components/LinkEditor.tsx:107-109`；`src/components/SettingsDialog.tsx:43-70`；`src/components/ShortcutsDialog.tsx:41-46`；`src/lib/wordcount.ts:47-77`；`src/lib/asset.ts:40-52`；`host/Program.cs:1491`、`:1753`。
- Typora 参考：`resources/Docs/Table Editing.md:20-26`、`:34`、`:46-50`、`:54-66`；`Use Images in Typora.md:48-50`、`:68`；`Quick Start.md:33-37`；`Change Log.md:843`、`:1007`；`typora-features.md:45`、`:53`、`:71-72`。
- 体积：`node scripts/measure-first-screen.mjs` 本轮输出（上表）。
