# 第 30 轮 · Typora 对照与写作体验（findings-typora）

- 角色：Typora 对照与写作体验侦察（只读产品代码，未改产品代码）
- 环境：Windows 11、Node 24.21、dev server `http://localhost:5175`、headless Edge CDP `127.0.0.1:9223`
- 对照样本：`.tmp/typora-ref`（Typora 0.11.18 解包，217.6 MB）、`shots/typora/`（71 张）、`docs/iteration/typora-features.md`、`docs/typora-gap.md`
- 实测脚本：`.tmp/e2e-r30-typora.mjs`、`.tmp/e2e-r30-typora2.mjs`、`.tmp/e2e-r30-typora3.mjs`、`.tmp/e2e-r30-typora4.mjs`
- 原始输出：`.tmp/e2e-r30-typora.json`、`.tmp/e2e-r30-typora2.json`、`.tmp/e2e-r30-typora3.json`、`.tmp/e2e-r30-typora4.json`
- 截图：`shots/round-30/r30-typora-outline.png`、`r30-typora-find.png`、`r30-typora-autopair.png`、`r30-typora-list-tab.png`、`r30-typora-codeblock.png`
- 体积测算工程：`.tmp/measure-r30/mermaid/`（mermaid 12.3.0）、`.tmp/measure-r30/hl/`（highlight.js）

## 摘要

本轮只读实测 10 项行为，给出 8 条改进建议：3 条全新（列表 Tab/Shift+Tab 缩进、代码块语法高亮、查找选项）、1 条在旧项上扩一半（纯文本粘贴扩成双向剪贴板，其中「复制为 Markdown」是新功能）、3 条复提（字数明细、表格列宽、图片落盘规则，只补新证据不重复实现细节）、1 条是 Mermaid 的体积结论与决策项。

Mermaid 的体积**首次实测完成**（上一轮标 UNVERIFIED）：完整构建 87 个 JS 文件，raw 5,170,520 B / gzip 1,483,283 B；最省加载路径（入口 + 12 个静态依赖）gzip 163,172 B。首屏余量 162 B、安装包硬线余量 25,791 B，**默认内置不可行**。结论与门槛见第 4 节。

`docs/typora-gap.md` 仍然过期，且表头计数与自己表的行数不一致（表头写「缺 18」，实际列了 19 行）。第 29 轮刚实现的大纲折叠现在**实测可用**（3 行折成 1 行，`aria-expanded` 从 true 变 false），差距表仍写「无」。修正后为 **26 有 / 17 缺**，核对明细见第 3 节。

## 1. 本轮实测现状

方法：用 `Ctrl+/` 进源码模式写入含 3 级标题、`js` 代码块、`mermaid` 块、行内 HTML、表格的 Markdown，再切回富文本（走产品自己的 `applySource` 路径），随后读 DOM；列表与自动配对用真实键盘事件；查找用 `Ctrl+F`。

| # | 行为 | 实测结果 | 证据 |
| :--- | :--- | :--- | :--- |
| 1 | 字数点击明细 | `.status-left` 是 `SPAN`，文案「56 字 · 阅读约 1 分钟」，无按钮、无 `aria-expanded`；点击前后 `body` 元素数都是 91，弹出层 0 个 | `.tmp/e2e-r30-typora.json` → `steps.wordcountClick` |
| 2 | 大纲折叠（第 29 轮实现） | 折叠前 3 项、2 个 `.outline-toggle`（`aria-expanded="true"`）；点第一个后剩 1 项，`aria-expanded="false"` | 同上 → `steps.outlineFold`；`r30-typora-outline.png` |
| 3 | 代码块语法高亮 | DOM 是 `<pre><code class="language-js">const a = 1</code></pre>`，`code` 内 `span` 数 0，可访问样式表里没有 `hljs`/`.token` 规则 | `.tmp/e2e-r30-typora4.json`；`r30-typora-codeblock.png` |
| 4 | 查找条选项 | `.find-bar` 有 2 个输入框、5 个按钮（↑、↓、✕、替换、全部替换）；无大小写、无整词、无正则开关 | `.tmp/e2e-r30-typora.json` → `steps.findBar`；`r30-typora-find.png` |
| 5 | 列表 Tab 缩进 | 两项列表在第二项按 Tab：无嵌套 `ul`（`li > ul` 为 0），正文写入两个空格，源码模式读到 `- 乙  `（行尾双空格） | `.tmp/e2e-r30-typora2.json` → `afterTabSource` |
| 6 | 列表 Shift+Tab 反缩进 | 光标在列表项按 Shift+Tab：列表与文本不变，焦点离开正文，落到 `BUTTON.file-tree-open-wide` | `.tmp/e2e-r30-typora3.json` → `after.activeEl` |
| 7 | 自动配对括号/引号 | 输入 `a(` 后是 `a(`；再输入 `"` 后是 `a("`，没有自动补右括号或右引号 | `.tmp/e2e-r30-typora.json` → `steps.autoPair` |
| 8 | 表格列宽拖拽 | 有 `table` 与 `colgroup`，`.column-resize-handle` 0 个，表格无 `resizable` 类 | 同上 → `steps.table` |
| 9 | 行内 HTML | `<kbd>`/`<mark>` 元素 0 个，段落文字是 `<kbd>Ctrl</kbd> 与 <mark>高亮</mark>。` 原文 | 同上 → `steps.inlineHtml` |
| 10 | Mermaid | ` ```mermaid ` 块在编辑器里是 1 个 `pre`，`svg` 0 个、mermaid 节点 0 个 | 同上 → `steps.mermaid` |

补充源码核对（未跑界面也能确认）：

- `src/App.tsx:759-767`：`handleKeyDown` 里 Tab 只在表格内放行；其他位置 `insertText('  ')`，没有 `sinkListItem`/`liftListItem`（全目录 grep 无匹配）。
- `src/App.tsx:769-776`、`777-783`：`handleDrop`/`handlePaste` 只筛 `image/*`，拖 `.md` 或文件夹无效。
- `src/components/ShortcutsDialog.tsx:10-47`：快捷键清单没有 `Ctrl+Shift+V`、没有 `Ctrl+Shift+C`、没有 F8/F9/F11。
- `src/lib/asset.ts:40-52`：`writeAsset` 固定写 `assets/` 并返回 `assets/${fileName}`，没有落盘规则参数。
- `src/lib/find.ts:3,17-45`：`FindOptions` 已有 `caseSensitive`，但 `src/App.tsx:1691` 固定传 `{ caseSensitive: false }`，界面也没开关。
- `host/Program.cs`：全文只有 `:1491` 的 `AreBrowserAcceleratorKeysEnabled = false` 和 `:1753` 的最小化恢复；没有全屏分支、没有 `AllowExternalDrop`。

## 2. 改进建议（按收益/成本排序）

以下建议都落在 Tiptap + WebView2 的现有模块内，不照搬 Typora 的 Electron/CodeMirror 架构。唯一需要新增依赖的是 2.3 的 highlight.js（懒加载 chunk，可选）；其余不引库。

### 2.1 状态栏字数点击弹出明细（含选区内计数）— P1，S

**用户收益**：长文写作每天看进度。Typora 状态栏随选区显示「9 / 195 词」（`shots/typora/01-live-preview.png`、`typora-features.md:53`）。中文作者需要字符、词、句、段、阅读时间、**选区内**六项；段落数与选区计数目前无处可看。

**现状证据**：`src/components/StatusBar.tsx:32-34` 把 `formatStats(stats)` 放在一个 `span` 里，无 `onClick`、无 `role`、无 `aria-expanded`；点击不产生 DOM 变化（第 1 节第 1 行）。数据侧：`src/lib/wordcount.ts:47-57` 已算出 `cjk`、`words`、`chars`、`paragraphs`、`minutes`，缺 `sentences`；`src/App.tsx:479/815/916` 已有 `stats`，`4745-4746` 传给 `StatusBar`。这是第 29 轮发现里唯一明确「第 30 轮必须补」的项（`docs/iteration/STATE.md:124`）。

**实现要点**：
1. `src/lib/wordcount.ts`：`TextStats` 加 `sentences`。切句规则用「中英文句末标点 + 换行」：`[。！？!?；;]` 与 `.` 后接空白；纯整数计数，不引依赖。
2. `src/components/StatusBar.tsx`：只把字数文本改成 `<button type="button" class="stats-trigger" aria-expanded>`，现有的「元数据 / 保存到 / 草稿已恢复 / 自动保存」四个 chip 保持为兄弟节点，不要包进按钮。
3. `src/App.tsx`：新增 `selectionStats`：编辑器 `onSelectionUpdate` 时 `countText(state.doc.textBetween(from, to, '\n'))`，选区为空传 `null`；详情层用 `<dl>` 列六项，Esc 与点外部关闭；打开时把焦点留在触发按钮。
4. `src/lib/wordcount.test.ts` 补 3 条：句数、选区子串、空文本零值。

**体积与风险**：约 80–100 行 TSX/CSS，首屏 gzip 增量 <400 B（数据与组件都已在首屏，不新增 chunk）。风险：`.status-left` 里已有 chip 与自动保存状态，改成按钮后要保证 Tab 只在状态栏多走一次，且自动保存提示的文字不被读屏重复朗读。

**建议优先级**：P1，1 轮内可完成。这是本轮唯一「计划里明确点名必须做」的项。

### 2.2 列表 Tab / Shift+Tab 缩进与反缩进 — P1，S（新）

**用户收益**：多级列表是中文写作的常态。Typora 的 Tab 把列表项降一级、Shift+Tab 升一级（`typora-gap.md:42`）。现在 Tab 在列表里插入两个空格，Shift+Tab 直接把焦点弹出正文。

**现状证据**：第 1 节第 5、6 行。源码 `- 乙  ` 的两个行尾空格有实际后果：Markdown 里行尾双空格等于硬换行，保存后可能变成 `<br>` 语义（切回富文本时又被裁掉，属于「按 Tab 后保存结果和屏幕不一致」）。`src/App.tsx:759-767` 只有「表格内放行、开头保留跳过链接、其余插入两个空格」三条分支。

**实现要点**：
1. 在 `handleKeyDown` 里先判断祖先节点是否 `listItem` / `taskItem`；是则 `sinkListItem('listItem')`（Tab）与 `liftListItem('listItem')`（Shift+Tab），返回 `true`。
2. 非列表保持现有「插入两个空格」。列表分支接管 Tab 之后，上表第 5 行的「行尾双空格」问题随之消失；非列表的行尾双空格仍存在（第 24 轮的设计），建议单独立项再处理，不要与本项混在一起。
3. 现有约定不能破：文档开头 Tab 仍跳过（`:765`），`event.isComposing` 仍放行（中文输入法组合期间不吞 Tab）。
4. 加一条 E2E 到现有键盘脚本（`scripts/` 下 round-27 的键盘验收）：列表两项 → Tab 变嵌套 → Shift+Tab 退回。

**体积与风险**：约 25 行，首屏增量 <100 B。风险：Tab 是「第一下跳到正文」的无障碍入口（`ShortcutsDialog.tsx:72`），列表内接管后要保证正文外 Tab 语义不变；Shift+Tab 现在用于「回顶栏」，只在列表内接管，其他位置保持原样。

**建议优先级**：P1，1 轮内可完成。

### 2.3 代码块语法高亮（语言按需 chunk）— P2，M（新，体积已量）

**用户收益**：技术写作者的代码块现在全是单色等宽。Typora 支持 100+ 语言的 CodeMirror 高亮（`.tmp/typora-ref/resources/Docs/Code Fences Language Support.md:3-124`）。Sidelight 已经把语言写进 DOM（`class="language-js"`），缺的只是着色。

**现状证据**：第 1 节第 3 行：`<pre><code class="language-js">` 内 0 个 `span`，全页无高亮 CSS 规则；`src/App.tsx:710` 的 `StarterKit.configure({ strike: false })` 没有代码块高亮扩展，依赖里也没有 lowlight/highlight.js（`package.json` 未列）。

**实现要点**：
1. **不改正文 DOM**：用 ProseMirror 的 `Decoration.inline` 给 `pre code` 的 token 区间加 class（如 `hljs-keyword`），不切换 nodeView、不插 `span`。序列化只读文本，装饰不进 Markdown；这一点必须写进注释，避免以后有人把高亮改成改写 DOM 导致保真回归。
2. 懒加载：`import('highlight.js/lib/core')` + 每种语言 `import('highlight.js/lib/languages/…')`；只在光标离开代码块且内容 hash 变化时重算；未注册语言保留纯文本。
3. 体积（本轮实测）：核心 + 9 种语言（js/ts/python/bash/json/markdown/css/xml/sql）打包 raw 63,150 B、gzip **20,942 B**，是独立 chunk，首屏不受影响。安装包侧：硬线 850,000 B 减当前 setup 824,209 B 只剩 25,791 B，内部预算 820,000 B **已经超 4,209 B**（`README.md:96`），所以这一项必须与产品负责人确认预算，或默认只带 3–4 种语言并把语言表做成可选。
4. 配色：只加 8–10 个 token 颜色变量，跟随明暗主题；不要引主题包。

**体积与风险**：首屏 +0；安装包约 +20 KB（按 gzip 估算，NSIS 压缩后的真实增量未测）。风险：高亮计算在超大代码块上可能卡（建议单块 >100 KB 跳过并提示）；装饰重算要防抖。

**建议优先级**：P2（中文写作者收益中等，但技术写作刚需）。若本轮预算只剩一项新功能，优先 2.1 与 2.2，不做本项。

### 2.4 查找条：区分大小写 + 整词 — P2，S（新）

**用户收益**：改人名、变量名、英文术语时，`foo` 会命中 `Foo`、`food`。Typora 的查找条有 Aa 与整词两个开关（`typora-features.md:50`）。中文作者写技术文章、引用代码标识符时用得上。

**现状证据**：第 1 节第 4 行；`src/lib/find.ts:17-45` 的算法**已经支持** `caseSensitive`，`src/App.tsx:1691` 硬编码 `{ caseSensitive: false }`，`src/components/FindBar.tsx:37-91` 没有开关 UI。

**实现要点**：
1. `FindOptions` 加 `wholeWord: boolean`；在 `findAll` 命中后检查左右字符是否拉丁字母/数字/下划线（中文不做整词，按现有子串语义），命中边界不符则跳过并从 `start+1` 继续。
2. `FindBar.tsx` 加两个 `aria-pressed` 按钮（`Aa`、整词），`App.tsx` 增加 `caseSensitive`/`wholeWord` 状态并传给 `findAll`；命中计数沿用现有 `position / total`。
3. `src/lib/find.test.ts` 补 3 条：大小写命中数、`food` 不被 `foo` 整词命中、中文查询在整词开启时行为不变。

**体积与风险**：约 50 行，首屏 <150 B。风险：整词定义在 CJK 与混合文本里容易误判，必须把「中文不做整词」写进测试；`toLowerCase` 的长度变化坑已在 `find.ts:20-21` 注释里，别在此基础上再叠一层。

**建议优先级**：P2，1 轮内可完成。

### 2.5 剪贴板双向：纯文本粘贴 + 复制为 Markdown — P2，S/M（新）

**用户收益**：从网页、Word、AI 对话框复制内容时，常把字体、颜色、链接、列表带进 Markdown（第 1 节第 7 行的粘贴测试：HTML 版进了正文、纯文本版被丢弃）。反向场景：把一段正文粘到公众号、GitHub issue 或邮件里，需要带 Markdown 标记的纯文本。Typora 有 `Ctrl+Shift+V` / `Ctrl+Shift+C`（`typora-features.md:84`，行为在 Typora 侧未实测）。

**现状证据**：`ShortcutsDialog.tsx:10-47` 无这两个键；`src/App.tsx:777-783` 的 `handlePaste` 只处理图片，其余交给 ProseMirror 默认粘贴；全目录 grep 无 `Shift+C`/放纯文本分支。

**实现要点**：
1. 纯文本粘贴：在 `handlePaste` 开头判 `(ctrlKey||metaKey) && shiftKey`，取 `clipboardData.getData('text/plain')`，按 `\r?\n` 归一后分段插入；空文本直接返回。这条与第 29 轮 2.3 相同，复提是因为仍未做。
2. 复制为 Markdown：选中文本 → 用现有序列化链（`src/lib/serializeDocument.ts`）把选区转 Markdown → `navigator.clipboard.writeText`；失败时退回 `document.execCommand('copy')` 的 textarea 方案。
3. `ShortcutsDialog.tsx` 与 README 键位表各加一行；测试：paste 事件带 html+plain 两个字段时只进纯文本（可直接扩 `scripts/acceptance.mjs` 的粘贴用例）。

**体积与风险**：约 60 行，首屏 <200 B。风险：WebView2 里 `navigator.clipboard` 读取需要用户手势与权限，宿主未验证；写剪贴板可能被策略拒。两个方向都要有失败提示，不能静默。

**建议优先级**：P2，1 轮内可完成；先做纯文本粘贴，复制为 Markdown 可拆下一轮。

### 2.6 表格列宽拖拽 — P1，M（复提，上轮已提仍未做）

**用户收益**：中文表格列宽按内容分布经常失衡，Typora 表头可拖拽调列宽（`typora-features.md:46`）。本轮复验仍是「有 `table` 与 `colgroup`、手柄 0 个、无 `resizable` 类」（第 1 节第 8 行）。

**现状证据**：`src/App.tsx:119-128` 的 `ReusableTable` 只重写 `renderMarkdown`；`App.tsx:722` 注册时未 `configure({ resizable })`。实现细节与保真风险见第 29 轮 `findings-typora.md` 2.4，本轮不重复。

**变化**：`docs/typora-gap.md` 的「缺」表里**没有这一行**，属于漏记；补表时一并加。另注意 `colwidth` 会进入序列化，必须同轮剥离，否则破坏「未动过的表格整块复用原文」。

**建议优先级**：P1，但必须与保真剥离同轮，不可拆开。

### 2.7 图片落盘规则（`assets/` / `<文件名>.assets/` / 相对路径）— P1，M（复提，上轮已提仍未做）

**用户收益**：Typora 有三种落盘规则与 frontmatter 的 `typora-copy-images-to`（`.tmp/typora-ref/resources/Docs/Use Images in Typora.md:48-70`）。中文作者常把文章与配图放同一目录树，`<文件名>.assets/` 能避免多篇共用 `assets/` 时同名冲突。

**现状证据**：`src/lib/asset.ts:40-52` 硬编码 `assets/`；`src/App.tsx:3818-3849` 的 `insertImageFile` 只在有文件夹句柄时落盘，否则内联 data URI（第 29 轮实测提示语见那轮报告第 1 节第 8 行）。实现细节见第 29 轮 2.5。

**建议优先级**：P1；本轮若只做一项「文件系统可见改动」，选这一项。

### 2.8 Mermaid：本轮实测结论是「不做」，先把预算决定权交回产品负责人 — P2（决策项）

**用户收益**：技术写作刚需，Typora 内置（`typora-features.md:26`、`Docs/Draw Diagrams With Markdown.md`）。Sidelight 现在把 ` ```mermaid ` 块渲染成普通代码块（第 1 节第 10 行）。

**本轮实测**（`.tmp/measure-r30/mermaid/`，mermaid 12.3.0，Vite 8 + oxc 压缩）：

| 项 | 数值 |
| :--- | :--- |
| 构建产物 | 87 个 JS 文件，raw 5,170,520 B，gzip **1,483,283 B** |
| 入口 `m.js` | raw 148,237 B，gzip 44,265 B |
| 入口 + 12 个静态依赖（首屏外最省加载路径） | raw 663,795 B，gzip **163,172 B** |
| 单图类型最大 chunk | `elk` gzip 458,665 B；`cytoscape` 138,438 B；`katex` 76,549 B |
| 只注册 flowchart/sequence | **不是配置项**：`import 'mermaid/core'` 没有产出可用包（构建输出只剩 45 B 与一条裸 import）；包内最小入口 `dist/mermaid.core.mjs` 也有 55,022 B raw，且要自己注册图类型，等于维护一个 mermaid 定制构建 |

对照预算（`README.md:96`、`docs/iteration/STATE.md:52,54`）：首屏 285,838 / 上限 286,000（余 **162 B**）；Windows setup 824,209 / 内部预算 820,000（**已超 4,209 B**）/ 硬线 850,000（余 **25,791 B**）。

**结论与建议**：
1. 默认内置 Mermaid 不成立：最省路径也要 163 KB gzip，是硬线余量的 6 倍多；而且 mermaid 12 自带一份 KaTeX chunk（gzip 76,549 B），与现有按需 KaTeX 功能重复。
2. 可行方向只有三条，都必须由产品负责人选：a) 抬安装包硬线（对外承诺变化，`AGENTS.md:15` 要回人）；b) 做成可选的本地组件（启动仍不联网，但用户显式触发下载会新增联网下载面：校验、缓存、失败提示都要做，属于新的对外承诺）；c) 不做，保留代码块并给一条「Mermaid 未渲染」的提示。
3. 在决定之前，实施方不要为 Mermaid 引依赖；本轮把它从「未知大小」改成「已量、不可行」即可。

## 3. `docs/typora-gap.md` 过期核对（本轮更新）

结论：**仍然过期**。表头写「缺的（18）」，但「缺」节实际列了 19 行，计数先自相矛盾；第 29 轮实现的大纲折叠也没更新。

| 差距表位置 | 表中写的 | 实际（本轮证据） |
| :--- | :--- | :--- |
| `typora-gap.md:59` | 新建、重命名、删除文件「无」 | 已实现（第 29 轮已核：`FileMenu`、`TreeActions`、`trash.ts`、`rename.ts`；本轮未复跑界面） |
| `typora-gap.md:61` | 快速打开 Ctrl+P「无」 | 已实现（`QuickOpen.tsx`，`Ctrl+P` 在快捷键清单之外；第 29 轮已核） |
| `typora-gap.md:50` | 缩放「无」 | 已实现：字号 12–26，`Ctrl+=`/`Ctrl+-`（`ShortcutsDialog.tsx:44`、`README.md` 现状节） |
| `typora-gap.md:52` | 大纲折叠「无」 | **本轮实测已实现**：3 项折成 1 项、`aria-expanded` 切换（第 1 节第 2 行；`Outline.tsx:17-68`） |
| `typora-gap.md:62` | 最近文件写在「缺」节，备注却是「有」 | 自相矛盾，应移到「已有」（`README.md:59`、ADR-0009） |
| `typora-gap.md:81` | 主题「只有跟随系统的明暗」 | 不准：浅色 / 深色 / 跟随系统三档（`SettingsDialog.tsx:48-50`；`settings.ts:4`） |
| `typora-gap.md:39` | 行内 HTML 不渲染 | 未过期（第 1 节第 9 行） |
| `typora-gap.md:40` | 自动配对「无」 | 未过期（第 1 节第 7 行） |
| `typora-gap.md:41` | 智能标点「无」 | 未过期（第 29 轮实测；本轮未重跑） |
| `typora-gap.md:42` | 缩进与反缩进「无」 | 未过期，且更糟：Tab 写行尾双空格、Shift+Tab 弹出焦点（第 1 节第 5、6 行） |
| `typora-gap.md:43` | 粘贴为纯文本「无」 | 未过期（第 29 轮实测） |
| `typora-gap.md:60` | 拖入文件或文件夹「无」 | 未过期（`App.tsx:769-776` 只接图片） |
| `typora-gap.md:69` | Mermaid「无」 | 未过期（第 1 节第 10 行） |
| `typora-gap.md:84-92` | 「建议的下一批」把「全局搜索与最近文件」列为待做 | 最近文件已有；全局搜索仍无 |

**应新增的「缺」行**（表中漏记）：
- 表格列宽拖拽（P1，见 2.6）。
- 代码块语法高亮（P2，见 2.3；Typora 的 `Code Fences Language Support.md` 是证据）。
- 字数点击明细（P1，见 2.1；`typora-gap.md:17` 只写「字数与阅读时间 有」，没写明细缺）。

**修正后的计数**：从「缺」移到「有」5 项（缩放、大纲折叠、新建/重命名/删除、快速打开、最近文件），新增「缺」3 项，得到 **26 有 / 17 缺**。`README.md:78` 的「已有 21 项，缺 18 项」需同步改，`STATE.md` 里的同类数字也一样。

## 4. Mermaid 体积测算方法（可复现）

```text
.tmp/measure-r30/mermaid/
  package.json                  # 私有，只装 mermaid 12.3.0（不碰仓库 package.json）
  entry-full.js                 # import mermaid from 'mermaid'
  vite.config.js                # Vite 8.3.8，minify 'oxc'（本机无 esbuild，'esbuild' 会报错）
  measure.mjs                   # 逐个文件 gzipSync(level 9)，并按入口静态 import 汇总 eager 成本
```

- 构建命令：在 `.tmp/measure-r30/mermaid` 下 `node ../../../node_modules/vite/bin/vite.js build`（用本仓库的 Vite，避免再装构建器）。依赖安装用 `npm install mermaid@latest --prefix .tmp/measure-r30/mermaid --cache .tmp/measure-r30/npm-cache`；默认 npm 缓存目录被沙箱拒写（EPERM），必须把 `--cache` 指到 `.tmp`。
- 统计口径：`measure.mjs` 读 `dist-full/m.js`，用 `/from"\.\/assets\/([^"]+)"/g` 找静态依赖；动态 import 的图类型 chunk 不计入 eager。gzip 用 level 9，与 `scripts/measure-first-screen.mjs:42` 同口径，可直接对比。
- 限制：不是「只注册 flowchart」的裁剪构建。包内有 `dist/mermaid.core.mjs`（raw 55,022 B），但只注册 flowchart/sequence 要自己注册图类型并维护定制构建，不是配置项；因此 163 KB 是**全格式 API 的最省加载路径**，裁剪后的真实值只会更小，但工程成本更高。
- 安装包增量的压缩比未测（NSIS 侧），本报告用 gzip 近似；这条标 UNVERIFIED。

## 5. 未验证

- 真实中文输入法下按 Tab/Shift+Tab、以及智能标点与 IME 组合输入的交互（本机无可用 IME 自动化，`AGENTS.md` 未验清单已有）。
- WebView2 里 `navigator.clipboard` 的读权限与写权限（Ctrl+Shift+V / Ctrl+Shift+C 的宿主侧行为）；macOS `Cmd+Shift+V/C` 未测。
- highlight.js 高亮后的大代码块性能（>100 KB 单块未压测）。
- 安装包对新增懒加载 chunk 的真实增量（NSIS 压缩后），本报告用 gzip 近似。
- 表格列宽拖拽的产品效果（只确认「无手柄」，未做原型；`colwidth` 对差异门的影响需实施时实测）。
- Typora 侧的整词查找、代码块高亮、复制为 Markdown 行为：只按官方文档与截图，未在 Typora 0.11.18 里重跑。
- F11 全屏在 WebView2 / WKWebView 的真实窗口行为（宿主层，本轮未改）。

## 6. 证据文件索引

- 实测脚本与输出：`.tmp/e2e-r30-typora.mjs`、`2.mjs`、`3.mjs`、`4.mjs`；对应 `.json` 与 `.progress.log`。
- 截图：`shots/round-30/r30-typora-outline.png`（折叠后）、`r30-typora-find.png`（查找条无选项）、`r30-typora-autopair.png`（无自动配对）、`r30-typora-list-tab.png`（列表 Tab 结果）、`r30-typora-codeblock.png`（代码块无高亮）。
- 体积测算：`.tmp/measure-r30/mermaid/`（mermaid）、`.tmp/measure-r30/hl/`（highlight.js，raw 63,150 / gzip 20,942）。
- 对照样本：`.tmp/typora-ref/resources/Docs/Code Fences Language Support.md`、`Use Images in Typora.md`、`Custom Shortcut Keys.md`；`shots/typora/01`、`02`、`50`、`61`、`63`、`64`、`67`。
