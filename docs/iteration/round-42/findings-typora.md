# 第 42 轮 Typora 对照与写作体验（finder-typora）

- 轮前 startSha：`5b7a1f5733c04b2c8bbf80987bf1119634541bbd`（`git log -1` 实测，工作区干净）
- 环境：dev server `http://localhost:5175`、CDP `9223`、每次 E2E 前 `node .tmp/reset.mjs 9223`
- 本轮真跑 12 条用户路径：行内 HTML 与 `<br>`、表格对齐与编辑保存、表格工具条、图片相对路径与图片粘贴、字数明细、大纲折叠、Mermaid 亮/暗主题与错误态、字号缩放（Ctrl+滚轮 / Ctrl+=）、Ctrl+K、富文本粘贴与 Ctrl+Shift+V、源码模式、专注模式
- 脚本（只读，未改产品代码）：`.tmp/e2e-r42-typora-a.mjs`、`-b.mjs`、`-c.mjs`、`-d.mjs`；日志 `.tmp/e2e-r42-typora-{a,b,c,d}.log`
- 截图：`shots/round-42/`（本轮 25 张，前缀 `t1-`–`t4-`，见 §15；本目录还有其余 finder 的截图）
- 控制台：干净路径（脚本 D）`pageerror`/`console error` **0 条**；脚本 A/B 里共 6 条无栈的 `Cannot read properties of undefined`（reading `id` / reading `url`，A 两条、B 四条＝重载后再来一对），脚本 C 抓到同类环境里的浏览器翻译扩展错误（`chrome-extension://nmhdhpibnnopknkmonacoephklnflpho/offscreen/offscreenTranslate.js`）；这些无栈错误归不到产品代码，按环境噪声记，见 §13

## 0. 结论先行（10 条，全部有本轮实测）

| # | 项 | 级别 | 用户收益 | 改动面 |
| :--- | :--- | :--- | :--- | :--- |
| 1 | 行内 HTML 与正文 `<br>` 不渲染（编辑态与预览态都是字面） | P1 | `<kbd>`、`<u>`、`<sub>`/`<sup>`、`<br>` 是技术写作与排版常用写法；现在既不好看也不一致（表格单元格的 `<br>` 已渲染，正文不渲染） | 白名单 mark + 解析；先做 `<br>` 档约 40 行 |
| 2 | Mermaid 图不跟随主题切换（旧 SVG 被缓存） | P2 | 深色主题下第一次渲染的图仍是亮色底，刺眼；重载才恢复 | `mermaidLazy.ts` 缓存键 + 主题监听，约 30 行 |
| 3 | 表格工具条没有列对齐按钮，也不能拖动行列重排 | P2 | 对齐写法能渲染、能保存，但没有入口；Typora 有对齐图标与拖拽重排 | 3 个按钮 + Tiptap `align` attr；重排另算 |
| 4 | 手写表头行 `\| A \| B \|` + Enter 不建表 | P2 | Typora 用户最顺手的建表路径；现在只得到字面文本 | 一个 Enter 输入规则，约 50 行 |
| 5 | Markdown 自动配对缺失（只配对括号与引号） | P2 | `**粗体**`、`` `代码` ``、`~~删除~~`、`$x$` 少打一半标记 | `smartTyping.ts` 扩表，风险中高 |
| 6 | 智能标点：`--` 直接出 `—`，`---` 留残 `-` | P2 | 英文 en dash（`2020–2025`）打不出；`a---b` 得到 `a—-b` | `smartTyping.ts:61`，约 10 行 |
| 7 | 源码模式没有行号 | P2 | 长文定位「第 300 行」靠数字符；Typora 有行号 | textarea 左侧槽 + 滚动同步，约 60 行 |
| 8 | Ctrl+滚轮不缩放字号；应用内没有全屏入口 | P2 | 写作时最直觉的手势无效；宿主没绑 F11（真机未验） | 轮事件映射 `setFontSize`；全屏要宿主配合 |
| 9 | 图片落盘规则不可选（恒为 `assets/<时间戳>-名`） | P2 | 静态站作者要 `${filename}.assets` 或自定义目录；现在只能事后手改 | `asset.ts:47` + 设置项，约 30 行 |
| 10 | `docs/typora-gap.md` 过期：粘贴为纯文本已可用、缺的少 4 行 | P2（文档） | 规划依据失真；本轮实测推翻「粘贴为纯文本无」 | 单文件 |

## 1. P1 行内 HTML 与正文 `<br>` 不渲染

**用户收益**：技术写作常用 `<kbd>Ctrl</kbd>`、`<u>强调</u>`、`H<sub>2</sub>O`、`E=mc<sup>2</sup>`；中文排版里 `<br>` 也常用于诗句、地址、卡片。Typora 直接渲染，并且导出保留。

**现状证据（真实应用，假工作区种子文档）**：
- 种子 `# 行内 HTML\n\n按 <kbd>Ctrl</kbd> 加 <u>下划线</u>，水是 H<sub>2</sub>O，能量 E=mc<sup>2</sup>。\n\n行尾<br>换行。\n`
- 编辑视图 DOM：`kbd/u/sub/sup/br/mark` 计数全部 **0**；`innerText` 是字面 `按 <kbd>Ctrl</kbd> 加 <u>下划线</u>…行尾<br>换行。`（`.tmp/e2e-r42-typora-a.log` 的 `facts.inline`；截图 `shots/round-42/t1-inline-html-edit.png`）
- 预览视图同样：`kbd/u/sub/sup/br` 全 **0**，预览 HTML 里是 `&lt;kbd&gt;`（截图 `t1-inline-html-preview.png`）
- 保存字节与种子**逐字节相同**（`same:true`，无保存对比对话框）：说明是「保真不渲染」，不是数据丢失。
- 代码路径：载入时 `escapeHtmlForParse` 把 `<` 与 `</` 转义（`src/App.tsx:1002`；`src/lib/html.ts:64`），单测还把 `<kbd>` 的转义锁成预期（`src/lib/html.test.ts:136`）；预览直接复用 `editor.getHTML()`（`src/App.tsx:4919` → `src/components/PreviewPane.tsx:55`），所以两处一起是字面。表格单元格的 `<br>` 是例外：`splitTableCellBreaks` 在载入时只对 `tableCell`/`tableHeader` 还原 hardBreak（`src/lib/tableCellBreaks.ts`，第 39 轮）。
- 第 41 轮刚改过同一段转义逻辑（`AGENTS.md` §8 最后两条），所以**不能**再放宽 `escapeHtmlForParse` 的 `<` 判定，否则会回归第 41 轮的保真点。

**Typora 行为**：内置文档明确说明 `<u>` 与任意行内 HTML 可用：`Docs/Markdown Reference.md:344-346`（`<u>Underline</u>` becomes <u>Underline</u>）、`:374-376`（HTML 可给 Markdown 补样式）；上下标在偏好里开启后 `H~2~O`、`X^2^` 直接渲染（`:362-368`）。

**实现要点（两档，建议先做 A）**：
- **A 档（S，约 40 行）**：只做正文 `<br>`。把 `splitTableCellBreaks` 的判定从「只 tableCell/tableHeader」放宽到「所有文本块，但不含 `codeBlock` 与行内代码」，把文本里的 `<br>` 换成 `hardBreak`；序列化仍写 `<br>`（沿用第 39 轮表格那套）。收益立竿见影，风险与第 39 轮同源。
- **B 档（M）**：给 `kbd/u/mark/sub/sup` 加 mark（Tiptap `Mark` + `parseHTML`/`renderHTML`）；载入时只放行白名单标签，其余仍走 `escapeHtmlForParse`。序列化必须写回原标签，避免第 41 轮的实体解码与 `repairHtml` 打架（`src/lib/html.ts:20`）。不要引第三方 sanitizer，白名单本身只有 5 个标签。

**体积与风险**：A 档 gzip ≈ 0–300 B；B 档 +800–1,500 B。风险集中在「转义 / 还原」两段与第 41 轮新逻辑的重叠，必须补单测与逐字节 E2E（种子 `<kbd>` 在代码围栏、行内代码里仍原样）。

**建议优先级**：P1（Typora 已有、作者写技术文档每天用；A 档可独立落地）。

## 2. P2 Mermaid 图不跟随主题切换（旧 SVG 被缓存）

**用户收益**：深色主题下写图表的人看到的仍是白底亮色图；切到深色后不重载页面就不对，亮色模式下切回也一样。这是最能一眼看出的不协调。

**现状证据（真实应用，亮色渲染后切深色）**：
- 亮色渲染：节点填充 `rgb(236, 236, 255)`、节点描边 `rgb(147, 112, 219)`、文字 `rgb(51, 51, 51)`（`.tmp/e2e-r42-typora-b.log` 的 `facts.mermaid.light`；截图 `t2-mermaid-light.png`）
- 设置面板点「深色」并保存后：`document.documentElement[data-theme]` 已是 `dark`，**图的五个读数完全不变**（`rgb(236, 236, 255)` 等；`facts.mermaid.afterThemeSwitch`，截图 `t2-mermaid-after-theme-switch.png`）
- 重载页面、深色下首次渲染：节点填充 `rgb(31, 32, 32)`、描边 `rgb(204, 204, 204)`、文字 `rgb(204, 204, 204)`（`facts.mermaid.darkFirst`，截图 `t2-mermaid-dark-first.png`）——说明主题只在**首次初始化**生效。
- 代码：`themeName()` 读 `data-theme`，但 `configure()` 有 `initialized` 守卫，只 `initialize` 一次（`src/lib/mermaidLazy.ts:51-65`）；`svgCache` 只按代码 hash 缓存（`:31`、`:90-101`）；`mermaidPreview.ts` 里还有第二份 `svgCache`，同样只按 hash（`src/lib/mermaidPreview.ts:16`）。

**Typora 行为**：深色主题单独引 `mermaid.dark.css`（`.tmp/typora-ref/resources/style/themes/night.css` 第 1 行 `@import "night/mermaid.dark.css";`），图表与界面同色。

**实现要点**：把主题纳入缓存键（`hash + ':' + themeName()`）；主题变化时 `mermaid.initialize({ theme })` 重新初始化并清空两份缓存；`App.tsx:723-726` 已有主题同步 effect，可在那里发一个事件/订阅，或让 `MermaidPreview` 读一个「主题版本号」并 `dispatch` 一次空事务重建 decoration。不要重排整个文档。

**体积与风险**：约 25–40 行，gzip < 300 B。风险低；注意两处缓存都要清（`mermaidLazy` 与 `mermaidPreview`），否则只改一处仍会看到旧图。

**建议优先级**：P2（视觉明显、改动小）。顺带：错误态已有一句可读提示（见 §11），不用改。

## 3. P2 表格工具条没有列对齐按钮，也不能拖动行/列重排

**用户收益**：GFM 的列对齐（`:---:`）现在只能手写；Typora 在表格工具条上给对齐图标，还能拖左边框/上边框重排行列。Sidelight 的对齐**渲染与保存都已经正确**，只差入口，属于低成本高一致性的一刀。

**现状证据**：
- 种子表 `| 左 | 中 | 右 |\n| :--- | :---: | ---: |\n| 甲 | 乙 | 丙 |`：三列 `getComputedStyle(...).textAlign` 分别是 `left / center / right`，单元格 inline style 也是 `text-align: center;`（`facts.alignment`；截图 `t1-aligned-table.png`）
- 改最后一个单元格 `己→己改` 后 `Ctrl+S`：保存字节仍是 `| :--- | :---: | ---: |`，**对齐没丢**（`facts.alignmentEdit.save.bytes`；无保存对比对话框）
- 工具条只有 7 个按钮：上插入 / 下插入 / 左插入 / 右插入 / 删行 / 删列 / 删表；`alignControl:false`；单元格 `draggable` 计数 0（`.tmp/e2e-r42-typora-c.log` 的 `facts.tableBar`；截图 `t3-table-bar.png`）
- 代码：工具条 `src/App.tsx:4741-4766`；默认单元格 `text-align: left`（`src/styles.css:713-720`）；Tiptap 表格扩展本身支持 `align`（`node_modules/@tiptap/extension-table` 的 `parseAlign`/`normalizeTableCellAlign`），当前没有调用点。
- 插入表格固定 3×3（`src/App.tsx:4577`），Typora 可拖网格选行列（`Docs/Table Editing.md:46-52`）。

**Typora 行为**：列对齐从工具条改（`Docs/Table Editing.md:54-66`），行列可拖拽重排（`:68-70`），建表可拖网格（`:46-52`）。

**实现要点**：
- 对齐（S）：工具条加「左 / 中 / 右」三个按钮，对当前列所有 `tableCell/tableHeader` 调 `setCellAttribute('align', value)`（或遍历列）；markdown 序列化已经会写 `:---:`（本轮保存字节证明）。再给按钮加 `aria-pressed` 与当前列状态。
- 重排（M）：需要自定义表格插件（拖拽 handle + `moveRow`/`moveColumn` 命令），不建议与对齐同任务做。
- 建表尺寸（S）：把固定 3×3 改成一个小网格选择器或 `rows`/`cols` 两个数字输入，默认 3×3。

**体积与风险**：对齐 + 尺寸约 60 行 + CSS，gzip +400 B 以内。风险：改列对齐后表格会退出「整块复用原文」，序列化会补空格（本轮实测：改单元格后保存字节已规范化空格，但分隔行保留），需要补一条「改对齐后保存再打开仍是 `:---:`」的往返测试。

**建议优先级**：P2（表格是核心功能；对齐入口比拖拽重排便宜得多，先做对齐与尺寸）。

## 4. P2 手写表头行 + Enter 不建表

**用户收益**：Typora 用户从零写表时先敲 `| A | B |` 再回车，得到一张 2 列表；现在只得到一行字面文本，必须回工具栏点「插入表格」。

**现状证据（真实应用）**：空文档输入 `| A | B |` 再 Enter，`.ProseMirror table` 计数 **0**，正文是 `| A | B |\n\n`（`.tmp/e2e-r42-typora-b.log` 的 `facts.tableTyping`；截图 `t2-table-typing.png`）。第 41 轮同一路径结论相同。

**Typora 行为**：`Docs/Table Editing.md:18-30`「simplify write down a table header in markdown」+ Return；表必须有表头、至少一行一列。

**实现要点**：新扩展处理 Enter：当前段落整段匹配 `^\s*\|(.+)\|\s*$`、光标在段尾、且下一行不是分隔行时，按未转义 `|` 切出 n 列，`insertTable({ rows: 2, cols: n, withHeaderRow: true })` 替换该段，再把原表头文字填回第一行。不要在 `handleTextInput` 里做（正文里 `|` 很常见，表格分隔行已有专门防线 `src/lib/smartTyping.ts:59`）。

**体积与风险**：约 40–60 行，gzip +400–700 B。风险：只匹配「整段就是表头行」；表格里按 Enter 不改（`Ctrl+Enter` 已有）；补一条「含 `|` 的普通句子按 Enter 不建表」的单测。

**建议优先级**：P2（建表高频，但不是数据安全）。

## 5. P2 Markdown 自动配对缺失

**用户收益**：写 `**重点**`、`` `code` ``、`~~删除~~`、`$x$` 时省一半击键，也少漏闭合。Typora 偏好里有「Auto pair common Markdown syntax」（第 41 轮从 Preferences 字符串与 Change Log 取得证据）。

**现状证据（真实应用，逐项输入后读 DOM）**：`**bo`→`**bo`、`*it`→`*it`、`` `co ``→`` `co ``、`~~st`→`~~st`、`$x`→`$x`；`(pa`→`(pa)`（`.tmp/e2e-r42-typora-b.log` 的 `facts.input`）。代码：唯一配对表 `PAIRS = '()[]{}'`（`src/lib/smartTyping.ts:16`），引号单列（`:41-49`）；设置文案只写「智能标点与自动配对括号」（`src/components/SettingsDialog.tsx:88`）。

**实现要点**：在 `smartInput` 里加 Markdown 配对表（`**`、`*`、`_`、`` ` ``、`~~`、`$`）。触发条件必须窄：光标前不是同一符号、后面是空白或行尾、不在行首 `* ` 列表里、不在 `---` 分隔线里、不在代码标记内（沿用 `smartTyping.ts:95-103`）。`~` 要区分 `~~` 与单个 `~`（第 40 轮刚为 `H~2~O` 加了 `src/lib/tilde.ts`，别让配对把单波浪号变成删除线）。设置里新增独立开关，默认关或与「自动配对括号」分开（默认值交产品负责人）。

**体积与风险**：约 30–40 行 + 单测，gzip +300–600 B。**风险中高**（中文输入法、列表、行内代码、单波浪号四条线都会碰）；必须独立任务 + `keyboard-acceptance` 回归。

**建议优先级**：P2（收益大，但放最后做）。

## 6. P2 智能标点：`--` 与 `---` 的处理和 Typora 不同

**用户收益**：英文写作要 en dash（`2020–2025`）现在打不出；`a---b` 会得到 `a—-b`，句中多一个可见连字符。

**现状证据（真实应用，键盘逐字输入）**：`a--b`→`a—b`（em dash）、`a---b`→`a—-b`（em dash + 残留 hyphen）（`.tmp/e2e-r42-typora-b.log` 的 `facts.input.dash2`/`dash3`）。代码：`if (inserted === '-' && last === '-') return { kind: 'replace', from: -1, to: 0, text: '—' }`（`src/lib/smartTyping.ts:61`）；单测把 em dash 写死（`src/lib/smartTyping.test.ts:34`）。

**Typora 行为**：SmartyPants 标准映射 `--`→`–`（en dash）、`---`→`—`（em dash）。证据：Typora 渲染层把正文 `\u2013` 还原成 `--`、`\u2014` 还原成 `---`（`.tmp/typora-ref/resources/appsrc/window/frame.js`，`node -e` 的 `indexOf('u2013')` = 45,724，同一段含 `replace(/\u2013/g,"--").replace(/\u2014/g,"---")`）；`docs/iteration/typora-features.md:28` 记「`--` 转破折号」。

**实现要点（两档）**：
- 小档：第三根 `-` 紧跟 `—` 时把它吞掉（`a---b` → `a—b`），中文破折号行为不变；不引 en dash。
- 大档：设置加「破折号风格：中文（`--`→`—`）/ 英文（`--`→`–`、`---`→`—`）」；`smartInput` 读设置。补 `---`、`----`、分隔线互不干扰的单测。

**体积与风险**：小档约 6 行、gzip ≈ 0 B；大档约 20 行。风险：表格分隔行已有专门防线（`smartTyping.ts:59`，第 38 轮），新增规则不要碰任何含 `|` 的行；`---` 行首仍由分隔线输入规则处理（本轮未复测，第 41 轮验过三种分隔线都正常）。

**建议优先级**：P2。

## 7. P2 源码模式没有行号

**用户收益**：切源码模式改表格/围栏时，能直接说「第 42 行」；对照外部 diff、报错行号也方便。

**现状证据（真实应用）**：源码模式容器 `.doc-layout.source-layout` 的子节点只有 `DIV.source-note` 与 `TEXTAREA.source-editor`；`.line-number/.line-numbers/.source-gutter/.gutter` 计数 **0**；带高亮 class 的 span **0**（`.tmp/e2e-r42-typora-c.log` 的 `facts.source`；截图 `t3-source-mode.png`）。代码：`src/App.tsx:4896-4917` 直接渲染 textarea，`spellCheck={false}`。

**Typora 行为**：源码模式基于 CodeMirror，左侧行号 + 语法高亮（`docs/iteration/typora-features.md:26`；`shots/typora/61-source-mode.png`）。

**实现要点**：只做行号槽，不引语法高亮库。textarea 左侧加 `div`，行数 = `value.split('\n').length`；`onScroll` 同步 `translateY(-scrollTop)`；字号/行高与 textarea 一致，等宽数字。按 `value` 缓存行数，只在内容变化时重算（1 MB 文档不要每帧 split）。不要用 `<pre>` 垫底（和 IME 组合输入打架）。

**体积与风险**：约 50–70 行 + CSS，gzip +500–800 B。风险：横向滚动时行号不能跟着动；源码框内容变化频繁，注意缓存。

**建议优先级**：P2。

## 8. P2 Ctrl+滚轮不缩放字号；应用内没有全屏入口

**用户收益**：写作最直觉的手势是按住 Ctrl 滚轮调字号（Typora 与多数编辑器都有）；桌面宿主没有绑定 F11（源码 0 命中，真机未验）。

**现状证据（真实应用）**：
- 字号读数 `--editor-size: 17px`，正文段落 computed `17px`；鼠标在正文上 `Control + wheel(-120)` 后仍是 `17px`、`visualViewport.scale` 仍 1；按 `Ctrl+=` 才变 `18px`（`.tmp/e2e-r42-typora-b.log` 的 `facts.zoom`；脚本 D 复核 17→18→19→18→17，`facts.fontSize`）。
- 快捷键对话框没有「缩放 / 滚轮 / 全屏」条目（`facts.shortcuts`，截图 `t2-shortcuts.png`）。
- `F11` 后 `document.fullscreenElement === false`（`.tmp/e2e-r42-typora-c.log` 的 `facts.fullscreen`；headless 下浏览器级 F11 测不准，见 §13）。
- 代码：字号只绑了三组按键（`src/App.tsx:3728-3738`）；`Select-String` 在 `src/` 下搜 `wheel|Wheel|fullscreen|FullScreen|requestFullscreen` **0 命中**；`host/` 的 `grep`（`F11|FullScreen|fullscreen`）也 **0 命中**。
- Typora：菜单有全屏 F11、放大/缩小/实际大小（`docs/iteration/typora-features.md:72-76`）。

**实现要点**：
- 滚轮（S）：在 `.doc-column` 或 editor DOM 上监听 `wheel`，`event.ctrlKey` 时 `preventDefault()` 并按方向 `setFontSize(current ± 1)`（节流 50 ms），复用现有 `setFontSize`（`src/App.tsx:1788`）。触控板捏合也会发 `ctrlKey+wheel`，正好同一映射。
- 全屏（S/M，要宿主）：浏览器态可先 `document.documentElement.requestFullscreen()`；Windows 宿主里更稳的是 C# 侧 F11 切换 `FormBorderStyle.None + WindowState.Maximized`，并在菜单加「全屏」项。宿主改动单独一轮，回归加速键与退出全屏。

**体积与风险**：约 20–30 行，gzip < 400 B。风险：滚轮事件要 `passive:false` 才能 `preventDefault`；全屏 Esc 退出后焦点回正文。

**建议优先级**：P2。

## 9. P2 图片落盘规则不可选（恒为 `assets/<时间戳>-名`）

**用户收益**：静态站作者（Jekyll/Hugo/VitePress）常要图片落到 `${filename}.assets/` 或 `_media/`；现在只能事后手改路径。Typora 提供「相对路径 / 复制到指定文件夹 / `typora-copy-images-to`」三种。

**现状证据（真实应用，假工作区）**：
- 在工作区文档里用粘贴事件（与 `Ctrl+V` 同一条 `handlePaste` 路径）粘一张 PNG：文件系统多出 `assets/mwkchr3v-粘贴.png`，正文与保存字节都是 `![粘贴.png](assets/mwkchr3v-粘贴.png)`（`.tmp/e2e-r42-typora-d.log` 的 `facts.imagePaste`；截图 `t4-image-paste.png`）
- 设置面板字段只有：主题、自动保存、智能标点、接口地址、API Key、模型、正文字号、联网核对、批注提示词；`hasImageRule:false`（`facts.settings`；截图 `t4-settings.png`）
- 代码：`const assets = await dir.getDirectoryHandle('assets', { create: true })`，路径写死 `assets/${fileName}`（`src/lib/asset.ts:47`、`:52`）；插入调用点 `src/App.tsx:3994-4008`。
- Typora：相对路径开关、复制到目标文件夹、frontmatter `typora-copy-images-to`（`Docs/Use Images in Typora.md:48-70`）；`docs/iteration/typora-features.md:47` 也记了三种落盘规则。

**实现要点**：设置加「图片目录」文本框（默认 `assets`，支持 `{filename}` 占位符），`writeAsset` 读它并 `getDirectoryHandle(folder, { create: true })`；路径写进正文时仍用相对路径。先只支持单一目录名（可含 `/`），不做 PicGo/图床上传。若文档在子目录，目录相对文档所在目录建（沿用 `parentDirectory`）。

**体积与风险**：约 25–40 行 + 设置项，gzip +300 B。风险：目录创建失败要可见提示；同一目录并发粘贴由时间戳前缀防重名；1 MB 文档不涉及。

**建议优先级**：P2。

## 10. P2 `docs/typora-gap.md` 过期：计数与 5 处内容

**核对方法与结果**：
- 用 `node -e` 按小节数表格数据行：「已经有的（30）」= **30 行**（与标题一致）；「缺的（11）」6 张子表共 **11 行**（与标题一致）。**计数本身没错，错在内容。**
- 本轮实测推翻一行、漏 4 行、1 行描述过期：

| 位置 | 现状 | 应改为 | 证据 |
| :--- | :--- | :--- | :--- |
| `docs/typora-gap.md:49` | `粘贴为纯文本 \| 无 \| P1 \| Ctrl+Shift+V` | **有（Chromium 原生，宿主待验）** | 本轮真实剪贴板：`Ctrl+V` 保留 `<strong>`（1 个），`Ctrl+Shift+V` 结果为 `<p>粗体与普通文字</p>`（strong=0），文字不丢（`.tmp/e2e-r42-typora-c.log` 的 `facts.pastePlain`） |
| `docs/typora-gap.md:42` 起「缺的（11）」 | 缺 4 行 | 补：打开链接的出口（浏览器打开）、标题开头 Backspace 退回正文、复制为 Markdown（`Ctrl+Shift+C`）、表格列对齐与行列重排 | 前三条为第 39/40 轮，第四条本轮 §3；`grep` 四词在 gap 文件均 **0 命中** |
| `docs/typora-gap.md:24` | `查找与替换 \| …Ctrl+F 打开，命中全部高亮…` | 补「第 41 轮起有区分大小写 / 整词两个开关」 | `docs/iteration/round-41/impl.md` T3、STATE 第 41 轮 |
| `docs/typora-gap.md:31` | 表格行列行 | 补「列对齐已有渲染与保存，但工具条没有入口」 | 本轮 §3 证据 |
| `docs/CHANGELOG`/README 计数 | 30 有 / 11 缺 | 若把粘贴为纯文本移入「有」并补 4 行：**31 有 / 14 缺**；若这条按宿主未验保留在「缺」：**30 有 / 15 缺** | 同上 |

**其他过期点（可不改）**：`docs/iteration/typora-features.md:43` 还写「不能折叠大纲」——第 29 轮已实现折叠；`:50` 的查找形态差异——第 41 轮已加 `Aa`/整词，只剩通栏 vs 面板的位置差异。该文件是带日期的调研报告，可在开头加一句「§3/§5 的现状列以 `typora-gap.md` 为准」。

**体积与风险**：纯文档。**建议优先级**：P2，和 §3 或 §1 任一同轮改。

## 11. 实测过、判断没有问题的路径（免得下一轮重复劳动）

| 路径 | 结果 |
| :--- | :--- |
| 表格列对齐渲染 | `:---` / `:---:` / `---:` 三列 computed `left/center/right`，单元格 inline style 正确（`t1-aligned-table.png`） |
| 改单元格后保存 | 分隔行 `\| :--- \| :---: \| ---: \|` 保留，字节除单元格文字与空格规范化外无损失（`facts.alignmentEdit.save`） |
| Ctrl+K 选中文字变链接 | 选中「链接文字」按 Ctrl+K → 就地链接编辑框（文字已填），地址填 `https://example.com` + Enter → `<a href="https://example.com">链接文字</a>`（`t3-ctrl-k.png`） |
| 从网页复制富文本再 Ctrl+V | 标题变 `h2`、粗体变 `strong`、链接与两项列表都保留（`t2-paste-rich.png`） |
| Ctrl+Shift+V 粘贴为纯文本 | **Chromium 原生支持**：粗体被去掉，文字保留（见 §10） |
| 图片相对路径解析 | `assets/pic.png` 显示为 `blob:` URL，`naturalWidth:1`（`facts.image`） |
| 字号缩放 | Ctrl+= 17→18→19、Ctrl+- 回 18、Ctrl+Alt+0 回 17；正文 computed 跟随（脚本 D `facts.fontSize`） |
| Mermaid 错误态 | 坏语法只给一句「图表没渲染出来，代码块内容仍是原文，可以继续编辑。」，代码原文保留，无 svg（`t3-mermaid-error.png`） |
| 大纲折叠 | 5 行 → 折叠第一章后剩 2 行；`aria-expanded` 同步；无 JS 错误（`t2-outline-collapsed.png`） |
| 图片粘贴落盘 | 工作区里粘贴 PNG 写入 `assets/` 并写相对路径（`t4-image-paste.png`） |
| 干净路径控制台 | 脚本 D `pageerror` 0、`console error` 0；其他脚本里有两条无栈 `Cannot read properties of undefined`，按环境噪声记（见 §13） |

## 12. 上几轮已报、本轮复核仍有效（不重复计数）

- **拼写检查固定关闭**：`.ProseMirror` 的 `spellcheck="false"`、源码 textarea `spellCheck={false}`（`src/App.tsx:812`、`:4914`）；设置面板无拼写项（`facts.settings.hasSpellcheck:false`）。第 41 轮 §4。
- **专注模式无首次提示**：`app` 已是 `app focus-mode`，页面无任何 toast，全文不含「专注模式已开启 / 不再显示」（`facts.focus`；`t3-focus-mode.png`）。第 41 轮 §7。
- **大纲缺「全部折叠/展开」、折叠不持久**：`.outline` 内 0 个 `input`，无「全部折叠/展开」按钮；折叠集合只存在组件 state（`src/components/Outline.tsx:17`）。第 38 轮 §5。
- **Mermaid 图不能复制源码、预览面板不含图**：预览态 `.preview-column` 里 `svg=0 / pre=1 / .mermaid-preview=0`（`t3-mermaid-preview-mode.png`）；图 widget 本身只有 `div` + `svg`，没有任何按钮（`src/lib/mermaidPreview.ts:72-80`），错误态预览也一样（`facts.mermaidError.buttonsInPreview` 为空，全页无「复制」字样）。这是 ADR-0017 接受的范围，若产品负责人要对齐 Typora 的「导出含图」（`Docs/Draw Diagrams With Markdown.md:5`）再单独立项。
- **字数明细的句数口径**：种子含 5 句正文 + 1 个标题，面板显示「句 6」；`countSentences` 按换行与 `；` 切分（`src/lib/wordcount.ts:72-78`），中文分号不是句末。另「阅读」提示写「按 300 字/分钟估算」，但实现是中文 300 字/分、英文 200 词/分（`wordcount.ts:39-44`、`src/components/StatsDetail.tsx:89`）。属细化了（P2），本轮未计入 10 条。
- **仍缺的 Typora 项**（gap 表内，未新增）：文件列表形态、视图缩放（Ctrl+= 是字号不是视图）、拖入 `.md`/文件夹打开、全局搜索、图片缩放、自定义主题、自定义快捷键。

## 13. UNVERIFIED 与补测方法

- **宿主 WebView2 的拼写检查**：只在 dev 浏览器读到属性；红波浪线是否出现未验。补测：宿主打开英文文档、把 `spellcheck` 改 true，看 `teh` 是否标红。
- **宿主里的 `Ctrl+Shift+V`**：浏览器内核已验证原生去格式；宿主设了 `AreBrowserAcceleratorKeysEnabled=false`，编辑命令是否仍透传未验。补测：宿主里复制网页富文本再按 Ctrl+Shift+V。
- **F11 全屏**：headless 浏览器里 `fullscreenElement` 恒 false，不能代表真实窗口行为；宿主源码 `grep` 0 命中只能说明「应用没绑」。补测：真实宿主窗口按 F11，看是否进全屏、Esc 是否退出。
- **Mermaid 主题切换后的真实观感**：用 computed color 判定；未做真人视觉验收（截图 `t2-mermaid-after-theme-switch.png` 可看）。
- **Typora 侧复跑**：本轮用 Typora 0.11.18 的 Docs、themes 与 `frame.js` 作参考，没有启动 Typora 实测 `--`/`---`、建表与主题切换；映射结论来自文档与主题 CSS。
- **图片落盘规则**：只验证了当前默认行为与设置缺项；没有验证自定义目录实现的可行性（未改代码）。
- **无栈 `Cannot read properties of undefined`**：脚本 A/B 在交互后共 6 条（A 两条；B 载入一对 + 重载一对 = 四条），没有 stack，脚本 D 的干净路径为 0；归因为页面里的浏览器翻译扩展噪声（脚本 C 抓到扩展自身的 `OffscreenTranslate` 错误），但未在无扩展 profile 里复跑。补测：用干净 profile（或关掉该扩展）重跑同一脚本，确认 0 条。

## 14. 给 planner 的排序

1. **§1 A 档：正文 `<br>` 渲染**（P1，S，第 39 轮同源做法，收益立刻可见）
2. **§2 Mermaid 主题缓存**（P2，S，视觉问题一眼能验，改动 30 行）
3. **§10 gap 表修订**（P2，文档，和 §3 同轮）
4. **§3 表格对齐按钮 + 建表尺寸**（P2，S，表格是核心功能）
5. **§4 表头行 + Enter 建表**（P2，S，写作高频）
6. **§8 Ctrl+滚轮缩放**（P2，S；全屏单独跟宿主任务）
7. **§6 智能标点残 hyphen**（P2，小档 6 行）
8. **§9 图片目录设置**（P2，S，静态站作者）
9. **§7 源码行号**（P2，纯前端）
10. **§5 Markdown 自动配对**（P2，收益大但回归面最大，最后单独一轮）

理由：前 4 项都是「渲染/入口」缺口，改动小、用户每天碰；§5 同时碰中文输入法、列表、行内代码、单波浪号四条线，必须单独验收。

## 15. 证据截图索引（`shots/round-42/`）

| 文件 | 内容 |
| :--- | :--- |
| `t1-aligned-table.png` | 带 `:---` / `:---:` / `---:` 的表格渲染（左/中/右） |
| `t1-inline-html-edit.png` | 编辑态行内 HTML 显示字面 |
| `t1-inline-html-preview.png` | 预览态同样字面 |
| `t1-image-drop.png` | 图片相对路径解析（blob） |
| `t2-stats.png` | 字数明细面板 |
| `t2-outline-collapsed.png` | 大纲折叠后 |
| `t2-mermaid-light.png` | Mermaid 亮色 |
| `t2-mermaid-after-theme-switch.png` | 切深色后图表不变（问题） |
| `t2-mermaid-dark-first.png` | 深色下首次渲染（对照） |
| `t2-table-typing.png` | 表头行 + Enter 不建表 |
| `t2-ctrl-k-selection.png` | Ctrl+K 选中文字就地链接框 |
| `t2-paste-rich.png` | 富文本 Ctrl+V |
| `t2-shortcuts.png` | 快捷键对话框（无纯文本/全屏/缩放） |
| `t3-table-bar.png` | 表格工具条 7 个按钮 |
| `t3-mermaid-error.png` | Mermaid 错误态 |
| `t3-mermaid-preview-mode.png` | 预览模式里是代码块不是图 |
| `t3-source-mode.png` | 源码模式无行号 |
| `t3-focus-mode.png` | 专注模式无提示条 |
| `t3-paste-plain.png` | Ctrl+Shift+V 去格式 |
| `t4-settings.png` | 设置面板（无图片/拼写/自定义快捷键项） |
| `t4-image-paste.png` | 粘贴 PNG 写入 `assets/` |
