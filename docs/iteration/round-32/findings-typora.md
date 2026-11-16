# 第 32 轮 · Typora 对照与写作体验（findings-typora）

- 角色：Typora 对照与写作体验侦察（只读产品代码，未改产品代码、未 push、未动 `release/`）
- 环境：Windows 11、Node 24.21、dev server `http://localhost:5175`、CDP `127.0.0.1:9223`
- 对照样本：`.tmp/typora-ref`（Typora 0.11.18 解包，375 文件 / 217.6 MB）、`shots/typora/`（71 张）、`docs/iteration/typora-features.md`、`docs/typora-gap.md`
- 代码基线：`main` @ `64002a8`（round-31），版本 0.32.1，工作树干净
- 实测脚本：`.tmp/e2e-r32-typora.mjs` → `.tmp/e2e-r32-typora.log`（21 项断言，14 PASS）；`.tmp/e2e-r32-typora2.mjs` → `.tmp/e2e-r32-typora2.log`（9 项断言，7 PASS）
- 截图：`shots/round-32/typora-image-inserted.png`、`typora-image-broken.png`、`typora-outline-collapsed.png`、`typora-table.png`、`typora-stats.png`
- 首屏实测（本轮跑）：`node scripts/measure-first-screen.mjs` → `raw=927127 gzip=284761 files=2 max=286000` **PASS**，余 **1,239 B**

## 摘要

本轮实测 14 个行为，给出 **9 条改进建议**（P1 五条、P2 四条）。其中 **3 条新发现**、**3 条复提补新证**、**2 条由「能力已在库、UI 未接」翻成低成本**：

1. **新 P1：工作区里的图片一律显示成破图**。插入图片时文件确实写进 `assets/`、Markdown 也写成 `assets/xxx.png`，但编辑器把相对路径按页面 URL 解析（`http://localhost:5175/assets/...`），Vite 回 SPA 兜底 HTML，`naturalWidth=0`。宿主同理：`host/Program.cs:342` 只从 `wwwRoot`（dist）读静态文件。用户插完图看到破图，导出 HTML 也打不开。
2. **新 P1：字数明细「段」在编辑模式恒为 1**。5 段正文 + 4 个标题的文档显示「段 1」，加一个 2 行代码块后变「段 2」——它只数 `doc.textContent` 里的换行，而 ProseMirror 的 `textContent` 不插块分隔符。同一文档源码模式显示「段 16」（非空行数）。两个模式口径不一致。
3. **新 P1：状态栏不跟选区显示计数**。选中 6 字后状态栏仍是「69 字 · 阅读约 1 分钟」。但 `selection.chars` 已在 state 里（`App.tsx:348`、`:901-907`），只差传给 `StatusBar`。
4. **复提 + 量化：表格列宽拖拽**。实测 `.column-resize-handle` = 0，`col` 只有 `min-width: 25px`；但 `dist/assets/index-*.js` 里 `colwidth` 已有 34 处、`columnResizing` **0 处** —— prosemirror-tables 主体已打进包，缺的只是列宽插件。估算增量 1.5–2 KB gzip，首屏只剩 1,239 B，必须同轮别处省。
5. **翻成低成本：查找大小写/整词**。`src/lib/find.ts:3,22-29` 已支持 `caseSensitive`，`App.tsx:1716` 写死 `{caseSensitive:false}`，`FindBar.tsx` 没有开关。接一个 `aria-pressed` 按钮即可。
6. **Mermaid 体积已测算**：mermaid 11.12.0 主 chunk 539,838 B raw / **150,471 B gzip**，全部 43 个懒加载 chunk 合计 **≈770,559 B gzip（≈752 KB）**，20 个依赖（cytoscape 435 KB、chevrotain 316 KB）；12.3.0 解包 123.6 MB / 1405 文件。首屏预算方案见 2.8。

`docs/typora-gap.md` **仍然过期**：19 行「缺」里有 5 行其实已实现（缩放、大纲折叠、新建/重命名/删除、快速打开、最近文件），另有 2 项 Typora 能力根本没进表（表格列宽拖拽、源码模式行号/高亮）。修正后 **26 有 / 14 缺（补两行后 16 缺）**，明细见第 3 节。

## 1. 本轮实测（Sidelight 现状）

方法：`node .tmp/reset.mjs 9223` 清状态 → 用 `.tmp/r30-fsa.mjs` 的假 FSA 工作区装一篇固定文档 → 走产品自己的打开文件夹/打开文件路径 → 真实点击与按键。断言与原始输出都在 `.log` 里。

| # | 行为 | 实测结果 | 证据 |
| :--- | :--- | :--- | :--- |
| 1 | 大纲折叠（Round 29 实现） | 侧栏切到「大纲」页签后有 4 条：第一章 / 1.1 / 1.1.1 / 1.2；2 个折叠按钮，`aria-expanded` 由 true 翻 false，子项 4→1 | `e2e-r32-typora2.log` → `## outline`；`typora-outline-collapsed.png` |
| 2 | 表格列宽拖拽 | `table` 有 `tableWrapper`、2 个 `col`，`style="min-width: 25px;"`；`.column-resize-handle` 0 个，`[class*="resize"]` 0 个 | `e2e-r32-typora.log` → `## table`；`typora-table.png` |
| 3 | 行内 HTML 渲染 | `kbd` 0 个、`mark` 0 个，正文原样显示 `<kbd>Ctrl</kbd> 与 <mark>高亮</mark>` | 同上 → `## inlineHtml` |
| 4 | 文档里的本地图片 | `<img src="assets/pic.png">` → 解析成 `http://localhost:5175/assets/pic.png`，HTTP 200（SPA 兜底 HTML），`complete=true` 但 `naturalWidth=0` → 破图 | 同上 → `## image`；`typora-image-broken.png` |
| 5 | 插入图片（走产品 `input[type=file][accept="image/*"]`） | 正文写入 `![截图.png](assets/mwjkvvv5-截图.png)`，假工作区写成 `assets/mwjkvvv5-截图.png`，`naturalWidth` 仍 0 | `e2e-r32-typora2.log` → `## insertImage`；`typora-image-inserted.png` |
| 6 | Mermaid | ```mermaid 代码块按普通代码块渲染（`language-mermaid`），`svg` 0 个，全程 0 个含 `mermaid` 的请求（没有懒加载） | `e2e-r32-typora.log` → `## mermaid` |
| 7 | 字数明细面板 | 点 `.stats-trigger` 打开，7 行：中日韩字 57 / 拉丁词 12 / 合计 69 / 字符 118 / 句 6 / **段 2** / 阅读 1 分钟；Esc 关闭 | 同上 → `## statsEdit`；`typora-stats.png` |
| 8 | 「段」口径（无代码块对照） | 5 个正文段落 + 4 个标题的文档显示 **段 1**；上一行有 2 行代码块的文档显示 **段 2** → 只数代码块内换行 | `e2e-r32-typora2.log` → `## statsNoCode` |
| 9 | 「段」口径（源码模式） | 同一文档 `Ctrl+/` 后显示 **段 16**（= 非空行数，标题/列表/表格行都算），字符 118→175（含 Markdown 语法符） | `e2e-r32-typora.log` → `## sourceMode` |
| 10 | 选区计数 | 选中「第一段第一句」（6 字）后 `.status-left` 仍为「69 字 · 阅读约 1 分钟」；明细面板选区行 =「6 字 / 6 字符 / 1 句」 | 同上 → `## selection` |
| 11 | 粘贴网页 HTML | 合成 `paste`（`text/html` + `text/plain`）后 `preventDefault` 生效，正文出现 `strong` 1 个、`h2` 1 个、`a` 1 个 → 富文本保留 | 同上 → `## paste` |
| 12 | 查找条 | `.find-bar` 5 个按钮（↑ ↓ ✕ 替换 全部替换），`[aria-pressed]` 0 个、checkbox 0 个 | 同上 → `## findBar` |
| 13 | 正文字体 | `.ProseMirror` 计算样式 `font-family: "Source Han Serif SC", "Noto Serif SC", "Songti SC", SimSun, Georgia, serif`（写死），`font-size: 17px` | 同上 → `## env` |
| 14 | 全屏能力 | `document.fullscreenEnabled === true`；`ShortcutsDialog.tsx` 里无「全屏 / F11」、无「纯文本 / Shift+V」、无字体项 | 同上 → `## env` / `shortcutsSrc` |

补充源码核对（不跑界面也能确认）：

- `src/App.tsx:3815`：明细正文取 `editor.state.doc.textContent`；`src/lib/wordcount.ts:54` 的「段」= `text.split(/\r?\n/)` 后非空行数。两者相撞：PM 的 `textContent` 不在块之间插换行，所以编辑模式只有代码块内的换行能被数到。
- `src/App.tsx:719` 注册 `Image.configure({ allowBase64: true })`，正文节点的 `src` 会原样进 Markdown；`src/lib/asset.ts:42-52` 的 `writeAsset` 固定写 `assets/` 并返回 `assets/<name>`。全仓库没有把工作区文件变 blob URL 的代码（`src` 下只有 `App.tsx:2482` 一处 `createObjectURL`，用于下载/导出）。
- `src/App.tsx:729` 注册 `ReusableTable`，没有 `Table.configure({ resizable: true })`；`dist/assets/index-BARs10TG.js` 里 `columnResizing` 0 处、`colwidth` 34 处。
- `src/App.tsx:1716`：`findAll(index, query, { caseSensitive: false })` 写死；`src/lib/find.ts:3,22-29` 已有 `caseSensitive` 分支。
- `src/App.tsx:348`、`:901-907`：`SelectionState` 已有 `chars`（AI 气泡 `:4272` 在用）；`src/components/StatusBar.tsx:21-48` 的 props 没有选区。
- `host/Program.cs:342`：静态文件只从 `wwwRoot`（dist）拼路径，出界即 403；宿主没有 `/assets`、`/__img` 一类工作区文件路由（路由只有 `/__doc`、`/__draft`、`/__annotations`、`/__recent`）。

## 2. 改进建议（按收益/成本排序）

全部落在现有 Tiptap + WebView2 模块内；只有 2.8（Mermaid）需要新依赖，且是懒加载、单独 ADR。

### 2.1 工作区图片显示不出来：相对路径没有解析通道 — P1，S–M（新）

**用户收益**：截图、示意图、封面图是中文写作的常规内容。Typora 默认按「相对当前文件」显示本地图（`Docs/Use Images in Typora.md:86`）。现在 Sidelight 插完图看到的是一个破图框（证据 5 的截图里就是灰框 + `截图.png` 替代文字），用户会以为图片丢了；导出 HTML 后同样打不开。**这是本轮唯一「看起来已经做了、实际不可用」的功能。**

**现状证据**：第 1 节第 4、5 项；`App.tsx:719`、`:3871-3902`；`asset.ts:42-52`；`styles.css:1734`（`.editor img` 只给样式）；`host/Program.cs:342`。

**实现要点**：

1. 新增 `src/lib/imageResolver.ts`：入参 `(dirHandle, relPath)`，返回 `{ url, revoke }`；内部 `Map<string, string>` 缓存，按 `.sidelight/cache` 之外的相对路径键；同一进程内不去重数据库读取，超过 32 条按 LRU 撤销。
2. 给 `Image` 加 `addNodeView()`：DOM 仍是 `<img>`，`src` 用 blob URL，另加 `data-md-src` 保存原相对路径；`renderHTML` 与 Markdown 序列化继续读 `node.attrs.src`，**保证存盘字节不变**。
3. 解析失败（文件不存在 / 无目录句柄 / `data:` URL）时回落到原 `src`，并给一个 `title` 说明「找不到这张图」，不要静默破图。
4. 打开文档时先扫一遍 `image` 节点批量解码（并发 4），避免逐张闪。
5. 回归：`roundtrip` 必须过（`renderHTML` 与序列化路径没变）；假工作区里插入 → 重开 → 图仍显示；「未改动的表格整块复用」不受影响。

**体积与风险**：约 90 行 + 1 个测试文件，首屏增量估算 +1.0–1.5 KB（NodeView 注册 + resolver），**需要先从别处省 1,239 B 预算**或把 NodeView 也做成 `lazy()`（编辑器创建时一次性加载，仍会算进首屏）。风险：blob URL 生命周期（撤销后节点仍引用会闪空白）、大图内存、目录句柄失效（重开权限三态）时要降级为破图并提示。

### 2.2 字数明细「段」口径错，两模式不一致 — P1，S（新）

**用户收益**：写作者用「段」判断章节切分；现在编辑模式永远显示 1，长文也没有变化，等于一个没用的行。Typora 状态栏给的是「词 + 选区内」，不误导（`shots/typora/01-live-preview.png`）。

**现状证据**：第 1 节第 7–9 项；`App.tsx:3815`；`wordcount.ts:47-57`（`:54`）；`StatsDetail.tsx:79-87`。实测三组数：5 段 + 4 标题 → 段 1；加 2 行代码块 → 段 2；同一文档源码模式 → 段 16。

**实现要点**：

1. 编辑模式取带块分隔符的文本：`editor.state.doc.textBetween(0, editor.state.doc.content.size, '\n', '\n')`，再让 `countText` 用 `/\n{2,}/` 分段；或者直接数顶层块：`doc.children` 里 type 为 `paragraph`/`heading`/`listItem`/`blockquote` 的节点。后者与 ProseMirror 语义一致，建议选它。
2. 源码模式复用同一个定义：`splitFrontmatter(sourceText).body` 解析成 PM doc 后数块（`editor.markdown.parse`），不要再用「非空行数」。
3. 面板脚注写清「段 = 非空正文块（段落、标题、列表项）」；`段` 与 `句` 的口径各写一句 `title`。
4. 单测补 4 条：两段无空行、标题不算正文段、列表项各算 1 段、代码块内换行不算段。

**体积与风险**：约 25 行 + 4 条测试，首屏 <200 B。风险：`textBetween` 在 1 MB 文档上是 O(n) 字符串拼接，只在打开面板时算一次即可（现有实现也是这样），不要在 `onUpdate` 里跑。

### 2.3 状态栏随选区显示计数 — P1，S（复提，仍未做）

**用户收益**：Typora 状态栏「9 / 195 词」随选中变化（`typora-features.md:53`）；写作者常靠选一段看进度。现在必须点开面板才知道选了多少。

**现状证据**：第 1 节第 10 项：选中 6 字，`.status-left` 仍是「69 字 · 阅读约 1 分钟」。数据已有：`App.tsx:348`（`SelectionState.chars`）、`:901-907`、`:958`、`:1034`。

**实现要点**：`StatusBar` 增 `selectionChars?: number`；非 0 时在触发按钮后加 `.status-chip`「选区 6 字」，0 时整块不渲染（不占位）；窄窗（<900 px）用 `truncate` 并 `title` 放全文。样式复用现有 `.status-chip`。

**体积与风险**：约 10 行，首屏 <150 B。风险：`onSelectionUpdate` 每次按键都 `setState`（已有），chip 只读 `selection.chars`，不会再加一次渲染压力。

### 2.4 表格列宽拖拽 — P1，M（复提，本轮补了成本数据）

**用户收益**：中文表格列宽按内容长短失衡是常态；Typora 光标在表内就出工具条，可拖列宽（`Docs/Table Editing.md:46-50`）。Sidelight 现在只能改 Markdown 源。

**现状证据**：第 1 节第 2 项；`App.tsx:729`；`dist/assets/index-BARs10TG.js` 中 `columnResizing` 0 处、`colwidth` 34 处（prosemirror-tables 的表格命令已经在包里，缺的只是列宽插件）。

**实现要点**（R29 2.4 / R30 2.6 已写细节，这里只补硬约束）：

1. `Table.configure({ resizable: true, handleWidth: 5 })`；样式加 `.column-resize-handle`（用 `--accent` 半透明）。
2. **序列化必须剥 `colwidth`**：`tableReuse.ts` 的「未改动的表格整块复用」与 Markdown 表格语法都不表达列宽；不剥会让「保存前对比」每次都报「表格被规范化」，也可能把 `colwidth` 写进 HTML。
3. Tiptap 列宽来自 `prosemirror-tables` 的 `columnResizing` 插件：`node_modules/prosemirror-tables/dist/index.js` 里该段源码 10,773 B（未压缩），按本项目实测压缩率（`index.js` 893,343 B → 284,761 gzip 中的 JS 部分 277,733 B ≈ 31%）估算 **+1.5–2 KB gzip**（含 CSS）。
4. **首屏只剩 1,239 B**：实现轮必须先跑 `node scripts/measure-first-screen.mjs`；超了就从别处省（例如 2.1 的 NodeView 与列宽分两轮，或把 `MarginRail` 的样式再裁一次）。

**体积与风险**：估算 +1.5–2 KB gzip → 首屏会破线，**建议与「省字节」任务同轮**。风险：列宽是编辑器视图态，不进 Markdown，用户重开文件后列宽会回到自动布局（要在 `title` 里说明，避免被当成 bug）。

### 2.5 粘贴为纯文本（Ctrl+Shift+V） — P1，S（新）

**用户收益**：从网页/Word/聊天窗口粘一段引用时，用户要的是文字，不是对方的加粗、颜色、标题层级。实测富文本粘贴会把 `h2`、`strong`、`a` 全带进来（第 1 节第 11 项），写完还得逐个清。Typora 有该键位（`Docs/Quick Start.md`，`typora-features.md:84` 标 UNVERIFIED）。

**现状证据**：`App.tsx:802-808` 的 `handlePaste` 只处理 `image/*`，其余交给 ProseMirror 默认解析；`:3446-3455` 的 `productCombo` 清单里没有 `v`；快捷键一览没有这一行（第 1 节第 14 项）。

**实现要点**：

1. 在 `handlePaste` 前加判断：`(event.ctrlKey || event.metaKey) && event.shiftKey` 时 `preventDefault()`，取 `event.clipboardData.getData('text/plain')`。
2. 插入方式必须**不解析 Markdown**：按行切分后逐块 `insertContent({ type: 'paragraph', content: [{ type: 'text', text: line }] })`，或 `tr.replaceSelectionWith(schema.text(text))` 后再拆块；否则粘贴 `**加粗**` 会被当成语法。
3. 纯文本粘贴进代码块时保留原换行（走代码块自己的 text 节点）。
4. 快捷键一览加「Ctrl+Shift+V 粘贴为纯文本」，`ShortcutsDialog` 的输入组。

**体积与风险**：约 35 行 + 2 条测试，首屏 <200 B。风险：WebView2 宿主已关浏览器加速键（`host/Program.cs:1491`），Ctrl+Shift+V 能到页面；macOS 的 ⌘⇧V 未验证。

### 2.6 查找条加「区分大小写 / 整词」 — P2，S（新；能力已在库里）

**用户收益**：查 `Ctrl+K`、`API`、`String` 这类标识符时，大小写不敏感会掺进一堆无关命中；替换时更容易改错。

**现状证据**：第 1 节第 12 项；`App.tsx:1716` 写死 `caseSensitive: false`；`find.ts:3,22-29` 已支持；`FindBar.tsx:58-88` 只有 5 个按钮。

**实现要点**：`FindBar` 加两个 `aria-pressed` 切换按钮（Aa / 整词），把 `caseSensitive`、`wholeWord` 放进 `FindOptions`；`wholeWord` 用前后边界判断（`find.ts` 里加两条正则分支，中日韩字符不做词边界，避免「中文整词」误伤）。命中计数与「全部替换」沿用现有流程。

**体积与风险**：约 40 行，首屏 <250 B（FindBar 已在惰性 chunk 里，`App.tsx:33`）。风险：整词开关对中文语义不成立 → UI 上只在含拉丁词时启用，或直接标「仅对英文生效」。

### 2.7 正文字体族可选 — P2，S（新）

**用户收益**：中文写作者对正文字体有强偏好（宋体看长文、黑体看屏、等宽对代码）。现在字体族写死在 `styles.css:28`（思源宋 → Noto Serif → 宋体 → Georgia），设置里只有字号 12–26（`settings.ts:27-28`）。Typora 有专门文档教改字体（`Docs/Custom Font.md`）。

**现状证据**：第 1 节第 13 项；`styles.css:28`；`settings.ts:6-41`；`export.ts:173` 导出用 `${font}` 自己的字体栈。

**实现要点**：

1. `Settings` 加 `readingFont: 'serif' | 'sans' | 'mono'`（默认 serif），沿用 `loadSettings` 的校验写法；`App.tsx:1698` 附近把 `--font-read` 的覆盖写进 `document.documentElement.style`。
2. 三个值只映射到系统字体栈，**不打包字体**（0 字节）；设置页加一行 select，与主题三档同一形态。
3. 导出 HTML 读同一个栈（`export.ts:173`），否则导出与屏幕不一致。
4. `settings.test.ts` 补 2 条：非法值回落默认、切换后 CSS 变量生效。

**体积与风险**：约 30 行，首屏 <200 B。风险：只在 Windows 上验证过字体存在性；macOS 的「宋体」回退要人工看一眼。

### 2.8 Mermaid 懒加载：体积测算与首屏预算方案 — P2，L（独立一轮 + ADR）

**用户收益**：技术写作里流程图/时序图是刚需，Typora 内置（`Docs/Draw Diagrams With Markdown.md:42-64`，`shots/typora/02-window-maximized.png`）。现在 ```mermaid 只是普通代码块（第 1 节第 6 项），用户得自己截图。

**体积实测（本轮新数据，来源见下）**：

| 项 | 数值 | 来源 |
| :--- | :--- | :--- |
| mermaid 11.12.0 主 chunk | 539,838 B raw / **150,471 B gzip** | bundlephobia API |
| 全部懒加载 chunk（43 个） | 合计 **≈770,559 B gzip / ≈2.9 MB raw** | 同上 `assets[]` 逐项相加 |
| 依赖数 | 20 个直接依赖（cytoscape 435 KB、chevrotain 316 KB、marked 79 KB；**katex 259 KB 本项目已有**） | 同上 `dependencySizes` |
| mermaid 12.3.0 | 解包 123,623,192 B / 1405 文件，`engines.node >= 22.12` | npm registry `mermaid@latest` |
| Sidelight 当前首屏 | 284,761 B gzip / 上限 286,000 B，余 1,239 B | `scripts/measure-first-screen.mjs` |
| 当前安装包（Windows setup） | 824,209 B | `STATE.md:55` |

**首屏预算方案**：不静态引；照 KaTeX 惰性化的既有做法（`src/lib/katexLazy.ts`、`katexLoader.ts`、`src/katex-dist.d.ts`、ADR-0012）做一个 `src/lib/mermaidLazy.ts`，**首屏 0 B 增量**，只在文档含 ```mermaid 时 `await import('./mermaidRender.ts')`。ADI 要写清三条：① 首屏预算不变，但「打开含图的文档」要额外下 150 KB gzip，需在 README 记一行理由与 gzip 数；② 安装包会涨（dist 里多 ~540 KB raw，NSIS LZMA 估算 +150–200 KB → 约 0.97–1.03 MB，**必须重测并决定是否放宽 1 MB 线**）；③ 渲染失败（未知语法）降级为代码块 + 一条提示，不抛错、不吞内容。

**实现要点**：`mermaidRender.ts` 只做 `mermaid.initialize({ startOnLoad: false, securityLevel: 'strict' })` + `render`；用 `IntersectionObserver` 或「文档含 fence」触发；渲染结果按源码字符串缓存；Markdown 导出保留 fence 源码；HTML 导出在导出路径里 `await ensureMermaid()` 后再渲染（复用 KaTeX 导出等待的写法 `App.tsx:3831`）。

**风险**：20 个传递依赖（供应链面）、innerHTML 渲染（用 mermaid 自带 DOMPurify + `securityLevel: 'strict'`）、43 个 chunk 的请求数、编辑器滚动时的重排性能。**建议单独一轮 + ADR，不塞进小修补轮。**

### 2.9 全屏 / 禅模式 — P2，S（复提，本轮只补可验证成本）

**用户收益**：写作时全屏去掉侧栏、工具栏、状态栏。Typora 有 F11（`typora-features.md:72`）。

**现状证据**：第 1 节第 14 项：`document.fullscreenEnabled === true`；`ShortcutsDialog` 无全屏项；`host/Program.cs` 无 `FullScreen`/`ContainsFullScreenElement` 处理（第 1 节源码核对）。真 `requestFullscreen()` 在 WebView2 里会触发宿主的 `ContainsFullScreenElementChanged`，行为未经宿主验证。

**实现要点**：先用**纯前端禅模式**（`html.zen` class 隐藏 `.sidebar`、`.toolbar`、`.status-bar`，`Esc` 退出，`Ctrl+Shift+Z` 或菜单项进入），0 字节依赖、无宿主改动；真全屏留给宿主轮（`CoreWebView2.ContainsFullScreenElementChanged` + 窗口样式）。

**体积与风险**：约 20 行 CSS + 15 行 JS，首屏 <150 B。风险：禅模式下批注面板与查找条的可达性（隐藏侧栏后 `.margin-rail` 要保留）。

## 3. `docs/typora-gap.md` 过期核对

| 表里写的 | 实际 | 证据 |
| :--- | :--- | :--- |
| 「缺」：大纲折叠（P2，备注「现在只有平铺」） | **已有**（第 29 轮），本轮实测折叠 4→1、`aria-expanded` 翻转 | `docs/typora-gap.md:52`；`e2e-r32-typora2.log` `## outline` |
| 「缺」：缩放（P1） | **已有**（设置字号 + `Ctrl+=`/`-`/`0`），且「已有」表里同时写着「字号与缩放 | 有」，表内自相矛盾 | `docs/typora-gap.md:25`、`:51`；`App.tsx:3620-3630` |
| 「缺」：新建、重命名、删除文件（P1，「只能靠系统资源管理器」） | **已有**（第 12–13 轮 + 28 轮：树内删除进 trash、同目录重命名、新建文件） | `docs/typora-gap.md:59`；`STATE.md:53`、`:76-77` |
| 「缺」：快速打开（P2） | **已有**（第 27 轮 Ctrl+P） | `docs/typora-gap.md:61`；`STATE.md:57` |
| 「缺」：最近文件（P2，备注已写「有（8 条）」） | 行放错表：备注说「有」，仍列在「缺的（18）」里 | `docs/typora-gap.md:62` |
| 「缺」：缩进与反缩进（P1） | **部分**：列表内 Tab/Shift+Tab 已可用（第 31 轮），普通段落缩进/反缩进仍无 | `App.tsx:766-792`；`STATE.md:53` |
| 「缺」：主题（P2，「只有跟随系统的明暗」） | 措辞过期：现有浅色 / 深色 / 跟随系统三档（`settings.ts:12-13`、`styles.css:36-70`） | 同上 |
| 未进表 | **表格列宽拖拽**（Typora 有，Sidelight 缺） | `Docs/Table Editing.md:46-50`；第 1 节第 2 项 |
| 未进表 | **源码模式行号与语法高亮**（Typora 用 CodeMirror；Sidelight 是纯 `textarea.source-editor`） | `App.tsx:4716-4717`；`typora-features.md:26` |
| 表头计数 | 「缺的（18）」下实际 19 行；「已有（21）」下 21 行 | 逐行计数 |

建议修正：把 5 行移到「已有」（21 → 26），「缺」改为 14 行并补 2 行（16），表头写「缺的（16）」，并在「已有」里修正图片一行：「图片拖入与粘贴 | **落盘正常，但编辑器里显示为破图**（见 2.1）」。

## 4. 本轮不建议做

- **换 MathJax**：Typora 用 MathJax，Sidelight 的按需 KaTeX 首屏更小（`typora-features.md:119`）。不动。
- **Pandoc 导入/导出链**：重依赖，违反「不为一个功能引一个库」。
- **CSS 主题商店 / 自定义 CSS**：维护面大。字体族（2.7）已经能覆盖大部分审美诉求，且 0 字节。
- **源码模式换成 CodeMirror**：会引入新依赖 + 首屏预算已满；差距表里记一行就够。
- **文件树 / 文件列表双形态**：一棵树够用，`Ctrl+P` 已覆盖查找场景。

## 5. UNVERIFIED 与测不了的原因

| 项 | 为什么没验证 | 怎么补 |
| :--- | :--- | :--- |
| 宿主（Windows WebView2）里图片是否同样破图 | 本轮只在 `localhost:5175` 的浏览器环境实测；宿主侧只做了静态代码判断（`host/Program.cs:342` 只服务 `wwwRoot`），没跑宿主窗口 | 实现 2.1 后跑 `host-smoke`，在真文件夹插一张图看是否 404 |
| 假 FSA 工作区里写入的图片字节是否是真 PNG | 假句柄的 `createWritable` 把 Blob 按文本拼接（`.tmp/r30-fsa.mjs`），只能证明路径与相对引用正确 | 用真实文件夹句柄手测一次插入 + 重开 |
| 插入图片在真实文件夹句柄下的显示 | 同上（浏览器无权限弹窗可用） | 同上 |
| mermaid 引入后的真实打包体积 | 未安装依赖、未跑构建（只读角色，且不允许新增依赖） | 实现轮 `npm run build` 后看 `dist/assets` 里 mermaid chunk 的 gzip，并与 bundlephobia 的 150,471 B 对照 |
| 导出 HTML 里相对图片路径是否可用 | 未实测导出后打开 | 导出到文档同目录再打开 HTML |
| macOS 的 ⌘⇧V、字体回退、禅模式 Esc | macOS 宿主与真机都不在本机 | 记进 macOS 真机清单 |
| Typora 的自动配对 / 智能标点行为 | 本轮未重测 Typora（沿用 `typora-features.md:160` 的 UNVERIFIED 说明） | 无需；差距表已列 P1 |
| 真 IME 下 2.5 的纯文本粘贴 | 需要真人输入法 | 手工测一次中文输入中按 Ctrl+Shift+V |

本轮未复制 Typora 的任何图标、主题、代码或文档原文进仓库；只保留截图与行为记录（`.tmp/typora-ref` 仍在 `.gitignore` 内）。
