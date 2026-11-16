# 第 33 轮 · Typora 对照与写作体验（findings-typora）

- 角色：Typora 对照与写作体验侦察（只读产品代码；未改产品代码、未 push、未动 `release/`）
- 环境：Windows 11、dev server `http://localhost:5175`、CDP `127.0.0.1:9223`（每轮先 `node .tmp/reset.mjs 9223`）
- 基线：`main` @ `e9d90a8`（第 32 轮后），版本 0.32.1
- 对照样本：`.tmp/typora-ref`（Typora 0.11.18 解包：`frame.js` 1.5 MB、`window.html`、`Docs/` 17 篇、`style/themes`）、`shots/typora/`（71 张）、`docs/typora-gap.md`、`docs/iteration/typora-features.md`
- 实测脚本：`.tmp/e2e-r33-typora.mjs`（21 项断言，15 PASS；6 项失败已逐条分辨：4 项是脚本把光标落错位置、1 项断言写错（`language-*` 类名存在）、1 项合成粘贴无结论）、`.tmp/e2e-r33-typora2.mjs`（7 项，4 PASS，缺 2 项因脚本假设）、`.tmp/e2e-r33-typora3.mjs`（2 项，全 PASS）；原始输出在 `.tmp/e2e-r33-typora*.log`
- 截图：`shots/round-33/typora-smartpunct.png`、`typora-codeblock.png`、`typora-table-bar.png`、`typora-selection-chip.png`
- 首屏（本轮跑）：`node scripts/measure-first-screen.mjs` → `total raw=927947 gzip=285052 files=2 max=286000` **PASS**，余 **948 B**

## 摘要

本轮实测 15 个行为，给出 **10 条可执行建议**（P1 六条、P2 四条）。**4 条新发现**（智能标点、自动配对、代码块语法高亮、侧栏宽度），**2 条复核仍未修**（工作区图片破图、表格列宽拖拽），**2 条复提**（粘贴为纯文本、全屏/禅模式），**2 条是既有能力的小扩展**（大纲全部折叠/过滤、查找大小写与整词）。

写作体验上最扎眼的一条是**标点**：中文写作者日常输入 `"引用"`、`--`、`...`，Sidelight 全部原样保留；输入 `(`、`[`、`"` 也不补右半边。这两件事是同一个输入钩子，适合一轮做完。证据：`e2e-r33-typora2.log` 的 `## punct` 返回原文 `"引用" a--b c...d`，`## pair` 返回 `(["`。

第 32 轮的两条 P1 已修完并复核通过：字数明细「段」= 5（编辑模式，`paraCount.p=5`），状态栏中文选区显示「选区 5 字」（`e2e-r33-typora3.log`）。**工作区图片破图、表格列宽拖拽仍未修**，与本轮新增的 4 条一起排在待办池。

`docs/typora-gap.md` 仍然过期，与第 32 轮核对结论一致，本轮未修正：5 行该移到「已有」、1 行放错表、表头计数与行数不符（详见第 3 节）。

## 1. 本轮实测（Sidelight 现状）

方法：`.tmp/reset.mjs 9223` 清状态 → `installFakeWorkspace` 装假 FSA 工作区与固定文档 → 走产品自己的「打开文件夹 → 点文件」路径 → 真实键盘/鼠标。每条断言的原值都在日志里。

| # | 行为 | 实测结果 | 证据 |
| :--- | :--- | :--- | :--- |
| 1 | 智能标点：直引号 | 输入 `"引用"` 后正文仍是 ASCII 直引号，`curly=false` | `e2e-r33-typora2.log` → `## punct` |
| 2 | 智能标点：双连字符 / 省略号 | `a--b` 未变破折号（`dash=false`），`c...d` 未变省略号（`ellipsis=false`） | 同上 |
| 3 | 中文后的半角标点 | `中文` 后输入 `,` 保持半角，正文为 `中文,句`（大纲里同样显示 `中文,句`） | `e2e-r33-typora.log` → `## outline`；`e2e-r33-typora2.log` → `## punct` |
| 4 | 自动配对括号与引号 | 依次输入 `(` `[` `"`，正文是 `(["`，无右括号/右引号 | `e2e-r33-typora2.log` → `## pair` |
| 5 | 代码块语法高亮 | `<pre><code class="language-javascript">` 内 **span=0**、`hljs/token` 类 0 个；`styles.css:634` 的 `.editor pre code` 只给 `background:none` | `e2e-r33-typora.log` → `## codeBlock`；`e2e-r33-typora2.log` → `## code` |
| 6 | 表格列宽拖拽 | `.column-resize-handle` **0 个**；2 个 `col` 只有 `min-width: 25px`；工具条 7 个按钮 `上插入/下插入/左插入/右插入/删行/删列/删表`，无移动/美化 | `e2e-r33-typora.log` → `## table`；`e2e-r33-typora3.log` → `## tableBar` |
| 7 | 侧栏宽度 | `.sidebar` 计算宽度 218 px；`[class*="resiz"]` 与 `[role="separator"]` 均 0；按住右缘拖 80 px 后仍是 218 px | `e2e-r33-typora.log` → `## sidebar`；`styles.css:1330` |
| 8 | 大纲 | 4 项、1 个折叠按钮（第 29 轮），**无**「全部折叠/全部展开/过滤」按钮、**无**过滤输入框 | `e2e-r33-typora.log` → `## outline` |
| 9 | 字数明细（复核第 32 轮） | 5 个正文段落 + 4 个标题的文档显示 `段 5`；7 行明细齐全 | `e2e-r33-typora.log` → `## stats` |
| 10 | 状态栏选区计数（复核第 32 轮） | 选中「这是一段用」5 字 → 状态栏出现 `选区 5 字` | `e2e-r33-typora3.log` → `## selectionChip` |
| 11 | 行内 HTML 渲染 | `kbd=0`、`mark=0`，正文原样显示标签 | `e2e-r33-typora.log` → `## unrendered` |
| 12 | Mermaid | ```mermaid 仍是普通代码块，`pre` 内 svg=0，全程 0 个含 mermaid 的请求 | 同上 |
| 13 | 工作区图片 | `src="assets/pic.png"` → 解析成 `http://localhost:5175/assets/pic.png`，`naturalWidth=0` → 破图 | `e2e-r33-typora.log` → `## image` |
| 14 | Ctrl+滚轮缩放 | 17 px → 17 px，字号不变（缩放只有设置与 Ctrl+= / - / 0） | `e2e-r33-typora.log` → `## zoom` |
| 15 | 粘贴为纯文本 / URL 贴选区变链接 | `App.tsx` 无 `Ctrl+Shift+V` 分支、无 `text/plain` 专用粘贴、`ShortcutsDialog` 无「纯文本」行；URL 贴到选区的合成粘贴被 ProseMirror `preventDefault`，**未测出结论** | `e2e-r33-typora.log` → `## pasteUrl`、`## plainPaste` |

补充源码核对（不跑界面也能确认）：

- `src/lib/asset.ts:52` 固定返回 `assets/<name>`，没有 `${filename}.assets` 或可配置目录；`src/lib/workspace.ts:135` 注释也是「图片要存到它旁边的 assets/ 里」。
- `host/Program.cs:297-312` 只注册 `/__doc`、`/__draft`、`/__recent`、`/__annotations` 四个路由；静态文件从 `wwwRoot`（dist）拼（`host/Program.cs:342`）。宿主没有工作区文件路由 → 宿主里工作区图片同样不可能显示。
- `src/styles.css:1330` `.sidebar { width: 218px }`，无变量、无拖拽条；`.sidebar.is-collapsed` 是 44 px。
- `src/components/Outline.tsx:52-69` 只有逐个标题的 `outline-toggle`，`collapsed` 是组件内 `Set`，没有「全部」入口。
- `src/App.tsx:1728` `findAll(index, query, { caseSensitive: false })` 仍写死（第 32 轮已提，未修）。
- `src/App.tsx:787-795` 段落里 Tab 插两个空格；列表内 Tab/Shift+Tab 缩进（`:780-786`）。所以差距表的「缩进与反缩进：无」应写「部分」。
- `src/App.tsx:4859` `selectionWords={viewMode === 'edit' ? selection.words : 0}`，`StatusBar.tsx:53-55` 渲染「选区 N 字」——第 32 轮这条已闭环。

## 2. 改进建议（按收益/成本排序）

全部落在现有 Tiptap + WebView2 模块内；只有 2.5（代码块高亮）需要新依赖，且是懒加载 chunk，首屏 0 B。

### 2.1 工作区里的图片仍是破图 — P1，S–M（复提第 32 轮 2.1，仍未修）

**用户收益**：截图、示意图、封面图是中文写作的常规内容。Typora 默认按「相对当前文件」显示本地图，并可设「相对路径 / 任意目录 / `${filename}.assets`」（`Docs/Use Images in Typora.md` → Use Relative Path、Copy image files to target folder；`Docs/Change Log.md:250` 记 `${filename}`/`${filepath}` 变量）。Sidelight 插入时文件确实写进了 `assets/`，但编辑器把相对路径按页面 URL 解析，用户看到灰框 + 替代文字；导出 HTML 也打不开。**这是唯一「看起来已经做了、实际不可用」的功能。**

**现状证据**：本轮第 1 节第 13 项：`src="assets/pic.png"` → `http://localhost:5175/assets/pic.png`，`naturalWidth=0`。`src/lib/asset.ts:52` 固定返回 `assets/<name>`；`App.tsx:719` 的 `Image` 没有解析通道；宿主只有 4 个 `__` 路由、静态文件从 dist 读（`host/Program.cs:297-312`、`:342`）。

**实现要点**（沿用第 32 轮 2.1 的方案，补一条落盘规则）：

1. `src/lib/imageResolver.ts`：入参 `(dirHandle, relPath)`，用 `file.text()` / `Blob` 生成 blob URL，`Map` 缓存 + LRU（32 条）撤销；目录句柄失效时回落到原 `src` 并给 `title`「找不到这张图」。
2. `Image` 加 `addNodeView()`：DOM 仍是 `<img>`，`src` 用 blob URL，`data-md-src` 存原相对路径；`renderHTML` 与 Markdown 序列化继续读 `node.attrs.src`，**存盘字节不变**。
3. 宿主侧：`host/Program.cs` 加 `/__asset?path=<相对路径>` 只读路由（限工作区内、出界 403），与 `/__doc` 同款校验。
4. 顺带补 Typora 的落盘规则（体积 0，只改 `asset.ts:42-52` 与一个设置项）：`assets/`（现状）/ `./`（与文档同级）/ `${filename}.assets/`；`settings.ts` 加 `imageFolder: 'assets' | 'sibling' | 'filename-assets'`。
5. 打开文档时批量预解码（并发 4），避免逐张闪。（可选 P2）图片右键 25%–200% 缩放，Typora 的图片菜单有（`window.html` → `zoom-img-menu`）。

**体积与风险**：约 110 行 + 1 个设置项 + 1 个测试文件，首屏增量估 **+1.0–1.5 KB**；首屏余 948 B → 需同轮省字节或做成懒加载 NodeView。风险：blob URL 生命周期（撤销后节点仍引用会闪空白）、大图内存、重开权限三态下目录句柄失效要降级为破图。

### 2.2 智能标点：直引号 / 破折号 / 省略号 / 中文全角 — P1，S（新）

**用户收益**：中文写作的引号、破折号、省略号有固定形态（`“”`、`——`、`……`），作者不该为了打对符号切输入法或事后手改。Typora 有 `Edit → Smart Punctuation`，含「Convert on Input / Convert on Rendering」两种时机与「Preferred smart dash」选项（`window.html` → `remap-punctuation`、`frame.js` 的 `setSmartyPantsTiming`；`Docs/Change Log.md:102` 记「Converting smart quotes / dashes 可撤销」、`:197` 记「可选破折号样式」）。Sidelight 现在是原文照收（第 1 节第 1–3 项）。

**实现要点**：

1. 新文件 `src/lib/smartTyping.ts`：导出一个 ProseMirror 插件，用 `handleTextInput` 拦截字符；`"` 根据前一个字符决定开引号还是闭引号，`'` 同理，`--` → `—`，`...` → `…`。
2. 中文上下文转换：前一个字符是 CJK（`\u4e00-\u9fff` 等）时，把 `,` `.` `;` `:` `?` `!` 换成全角 `，` `。` `；` `：` `？` `！`。这一条只对**中文后**生效，英文照旧，避免把 `1,000`、`a,b` 改坏。
3. 硬性排除：`event.isComposing` 为真、位于 `codeBlock` / `code` / 行内公式 / 数学块时不转换；粘贴走 `handlePaste` 不转换（只对键盘输入生效）。
4. 撤销粒度：一次替换用一个 transaction，`Ctrl+Z` 能一步撤回（Typora 也是这个承诺）。
5. `settings.ts` 加 `smartPunctuation: boolean`（默认 `true`，与 Typora 一致），`SettingsDialog` 加一行开关并写一句「只作用于输入，不改已有正文」。
6. 测试：`src/lib/smartTyping.test.ts` 补 6 条（中英引号、破折号、省略号、中文后半角逗号、代码块不转换、英文数字不转换）。

**体积与风险**：约 80 行 + 1 个设置项 + 6 条测试，首屏 <250 B。风险：中文输入法的组合态（Typora 自己在 `Docs/Change Log.md:421` 记过「Fix quote and brackets when using Chinese IME」）；用户粘贴的引号不该被改；`…` 与 `...` 在 Markdown 里等义，保存字节会变，要提示「按输入规则改了正文」。

### 2.3 自动配对括号与引号 — P1，S（新）

**用户收益**：写 `（`、`[`、`"` 时自动补右边，减少一次击键和一类漏闭合错误。Typora 默认开，还扩展到 `*` `` ` `` `~` `_` `$` `^` `=`（`frame.js` 的 `autoPairExtendSymbol`；`Docs/Change Log.md:432` 记过「Fix quote auto pair issue」）。Sidelight 现在输入 `(["` 就只剩这三个字符（第 1 节第 4 项）。

**实现要点**：

1. 同一个 `src/lib/smartTyping.ts` 插件里做：`(`→`()`、`[`→`[]`、`{`→`{}`、`"`→`“”`/`""`、`'`→`‘’`/`''`、`` ` ``→`` `` ``（Typora 的引号与 2.2 的智能引号共用一张映射表，避免两处规则打架）。
2. 有选区时包住选区：选中 `文字` 按 `(` 得 `(文字)`，光标落在外侧。
3. 退格删空成对括号：左右两边正好是本对括号且中间空时，一次退格删两边。
4. 关闭符「越过」：下一个字符就是要补的关闭符时，只移动光标不重复插入。
5. 排除代码块内？Typora 代码块里也补，但 Sidelight 代码块里补引号更容易出错，建议代码块内**不补**（在设置项提示里写清）。
6. 测试：与 2.1 同一个测试文件补 4 条（配对、包选区、退格成对删、关闭符越过）。

**体积与风险**：约 60 行 + 4 条测试，首屏 <200 B。风险：与 2.2 的引号转换冲突（同一次输入只能出一个字符，规则表必须单一来源）；IME 组合态跳过；撤销粒度。

### 2.4 粘贴为纯文本（Ctrl+Shift+V）+ 粘贴 URL 到选区变链接 — P1，S（复提，第 32 轮已提）——**已关闭：两条都是内置能力，不要再排**

> **第 33 轮 critic 实测（CDP 9222，产品代码零改动）**：
> 1. **粘贴为纯文本**：`Ctrl+Shift+V` 本来就是 Chromium 的纯文本粘贴——同一份 `text/html + text/plain` 剪贴板，`Control+V` 得 `<p>标题</p><p><strong>粗</strong></p>`，`Control+Shift+V` 得 `<p>标题</p><p>粗</p>`（`.tmp/e2e-r33-critic-richtml.mjs`）。
> 2. **URL 贴选区变链接**：Tiptap 的 `Link` 由 StarterKit 默认注册（`@tiptap/starter-kit/src/starter-kit.ts:243-244`，`src/App.tsx:720` 没关 `link`），`linkOnPaste` 默认 `true`（`@tiptap/extension-link/src/link.ts:258`），`helpers/pasteHandler.ts:25-49` 在「选区非空 + 粘贴文本整体是链接」时 `setMark(link,{href})`。实测：选中 `文字` 贴 `https://example.com` → `<a href="https://example.com">文字</a>`；空选区贴同一 URL 自动成链；`https://example.com 说明` 只给 URL 加链（重跑 `.tmp/e2e-r33-critic-linkpaste.mjs` 复现）。
> 3. 代码块里贴 URL 也不会成链：`<pre><code>https://example.com</code></pre>`、`a[href]=0`（`.tmp/e2e-r33-critic-codepaste.mjs`；行内代码那一段同脚本的选区落点不准，只记「`a[href]=0`」，不据此下结论），所以「加排除分支」也没有可见差异。
>
> **结论：下面 1–4 条实现要点与「体积与风险」全部作废，不要再排。** 若将来要动这一块，只剩「复制为 Markdown（Ctrl+Shift+C）」是真正没有的；它要等 `getMarkdown()` 的派生结果，另立条目再评估。

**用户收益（当时记录）**：从网页 / Word / 微信粘一段引用时，用户要文字不要对方的 `h2`、`strong`、颜色。Typora 的编辑菜单有「Paste as Plain Text」（`window.html` → `paste_as_plain`，快捷键 Ctrl+Shift+V），旁边还有「Copy as Markdown」（Ctrl+Shift+C）。Sidelight 的 `handlePaste`（`App.tsx:805-811`）只处理 `image/*`，其余交给 ProseMirror 默认解析；快捷键表里也没有这一行（第 1 节第 15 项）。

**实现要点**：

1. `App.tsx:805` 的 `handlePaste` 增加分支：`(event.ctrlKey || event.metaKey) && event.shiftKey` 时 `preventDefault()`，取 `clipboardData.getData('text/plain')`。
2. 插入不解析 Markdown：按行切分后逐块 `insertContent({ type: 'paragraph', content: [{ type: 'text', text: line }] })`；代码块内粘贴保留原换行。
3. 同一分支里做「URL 贴到选区」：有非空选区且剪贴板文本能过 `new URL()` 时，用 `setLink` 把选区变链接（Typora 的行为，本轮合成粘贴没能给出结论，见第 5 节）。
4. `ShortcutsDialog.tsx` 加两行：`Ctrl+Shift+V 粘贴为纯文本`、`Ctrl+Shift+C 复制为 Markdown`（后者可选）。

**体积与风险**：约 45 行 + 2 条测试，首屏 <200 B。风险：宿主已关浏览器加速键（`host/Program.cs` 的 `AreBrowserAcceleratorKeysEnabled=false`），Ctrl+Shift+V 能到页面；macOS 的 ⌘⇧V 未验证；「复制为 Markdown」要等 `getMarkdown()` 的派生结果（已有 `deriveTimerRef` 那条链，取最近一次即可）。

### 2.5 代码块语法高亮（懒加载） — P1，M（新）

**用户收益**：技术写作、教程、示意的代码块现在是一片同色文字，读者看不出关键字与字符串。Typora 内置 30+ 语言的语法高亮，并有语言下拉（`Docs/Code Fences Language Support.md:1-25`、`window.html` 的 `md-fences-adv-panel`）。Sidelight 解析时保留了 `class="language-javascript"`，但**没有任何 token 渲染**（第 1 节第 5 项），等于信息已经在手边、只差渲染。

**实现要点**：

1. 照 KaTeX 惰性化的既有做法（ADR-0012、`src/lib/katexLazy.ts`、`katexLoader.ts`）做 `src/lib/codeHighlightLazy.ts`：文档里出现 `codeBlock` 且 language 已知时才 `await import('./codeHighlight.ts')`，**首屏 0 B**。
2. 依赖选 `highlight.js/lib/core` + 显式注册 10–12 个语言（js/ts/json/html/css/bash/python/rust/go/java/sql/yaml/markdown），不引全量包；渲染时按 `node.attrs.language` 取 `hljs.highlight(source, { language })`，未知语言降级为纯文本。
3. CodeBlock 加 `addNodeView()`：DOM 仍是 `<pre><code>`，只把高亮后的 token 写进 `innerHTML`；Markdown 序列化继续读 `node.textContent`，**存盘字节不变**。
4. 样式：`src/styles.css` 加一组 `.hljs-keyword/string/comment/...` 变量色（深浅两套，约 30 行），跟随现有 `--accent` / `--ink` 主题。
5. 语言标签：代码块右上角一个只读的小标签（`language-javascript` → `JavaScript`），下拉切换语言是 Typora 的形态，可以先不做。
6. 回归：`roundtrip` 必须过；代码块复制出去仍是源码；100 KB 文档滚动不卡（只在 NodeView 挂载时渲染一次，不监听每次输入）。

**体积与风险**：估算 **+15–20 KB gzip（懒加载 chunk，首屏 0 B）**，安装包 +15–20 KB（粗估，未实测）。风险：新增 1 个运行时依赖（AGENTS 要求 README 记一行理由与 gzip 数）；高亮结果写 `innerHTML` 需确认只来自库自身输出；未知语言要静默降级；深浅主题都要能读。**验证方法**：装包后 `npx vite build --outDir .tmp/build-hl`，看 `dist/assets` 里新 chunk 的 gzip 与 `measure-first-screen.mjs` 是否仍是 285,052 B。

**说明**：本项是 2 MB 级 WebView2 应用可接受的唯一新增依赖方案；如果评估后仍嫌重，可只做「等宽字体 + 行号」这一小步（P2，约 40 行、0 依赖）。

### 2.6 表格列宽拖拽 — P1，M（复提第 32 轮 2.4，仍未做）

**用户收益**：中文表格按内容长短自动分列常失衡，作者现在只能改 Markdown 源。Typora 光标在表内就出悬浮工具条、可拖列宽（`Docs/Table Editing.md`；`typora-features.md:46`）。Sidelight 的表格工具条只有 7 个增删按钮（第 1 节第 6 项）。

**实现要点**（与第 32 轮相同，补两点新证据）：

1. `App.tsx:729` 注册 `ReusableTable` 时 `Table.configure({ resizable: true, handleWidth: 5 })`；`styles.css` 加 `.column-resize-handle`（`--accent` 半透明）。
2. **序列化必须剥 `colwidth`**：`src/lib/tableReuse.ts` 的「未改动表格整块复用」与 Markdown 表格语法都不表达列宽，不剥会让「保存前对比」每次报规范化。
3. 列宽是视图态，重开文件回到自动布局 —— 在 `title` 里写一句，避免被当 bug。
4. 可选同轮加「行/列上移下移」（Typora 右键菜单 `move_row_up` 等，快捷键 Alt+↑↓←→）：Tiptap 表格命令没有现成的移动行，需要用 `deleteRow` + `addRowBefore` 拼；**M 级，建议单独一轮**。

**体积与风险**：prosemirror-tables 的 `columnResizing` 段约 10.8 KB 未压缩，按本项目压缩率估 **+1.5–2 KB gzip**。**首屏只剩 948 B，实现轮必须先配一个「省字节」任务**（或把 2.1 图片与 2.6 列宽分两轮）。

### 2.7 侧栏宽度可拖拽并记忆 — P2，S（新）

**用户收益**：218 px 固定宽度里，中文书名 + 目录层级长的文件名会被截断；大屏用户希望侧栏更宽，小屏用户希望更窄。Typora 有独立拖拽条 `#typora-sidebar-resizer`，宽度存进 `sidebarWidth` 选项并落到 CSS 变量 `--sidebar-width`（`window.html:... id="typora-sidebar-resizer"`、`frame.js` 的 `bindLiveResize`）。

**现状证据**：`styles.css:1330` 写死 `width: 218px`；页面里 `[class*="resiz"]`、`[role="separator"]` 都是 0；按住右缘拖 80 px 宽度不变（第 1 节第 7 项，218 → 218）。

**实现要点**：

1. `.sidebar` 右侧加 6–8 px 的 `role="separator"` `aria-orientation="vertical"` 拖拽条；`mousedown` 记起点、`mousemove` 改 CSS 变量 `--sidebar-w`，范围 160–420 px。
2. `settings.ts` 加 `sidebarWidth: number`（默认 218），`loadSettings` 用 `clamp` 校验；双击拖拽条复位 218。
3. 键盘可达：拖拽条可聚焦，`←`/`→` 每次 ±8 px，`Home` 复位。
4. 窄窗（`min-width: 1120px` 之外，见 `styles.css:121`）不启用，避免挤压正文。

**体积与风险**：约 30 行 + 1 个设置项 + 2 条测试，首屏 <300 B。风险：拖拽时正文列宽联动（现在 `.doc-layout` 是 `minmax(0, 36rem) 260px` 居中网格，`styles.css:255`），要确认改侧栏不触发正文重排闪烁；触屏设备没有实现。

### 2.8 大纲「全部折叠 / 全部展开」与过滤 — P2，S（新）

**用户收益**：长文（几十个标题）里逐条点三角很慢；写作者更常见的是「先收起所有分支再看结构」。Typora 大纲右键菜单有 `Expand All` / `Collapse All` / `Filter` / `Highlight Current Header`（`window.html` → `outline-menu`）。Sidelight 已有逐条折叠（第 29 轮，本轮复核 1 个 toggle、4 项，见第 1 节第 8 项）。

**实现要点**：

1. `src/components/Outline.tsx` 顶部加一行两个按钮：`全部折叠`（`setCollapsed(new Set(所有 hasChildren 的 id))`）与 `全部展开`（`new Set()`）；沿用现有 `outline-item` 样式，不新增组件。
2. 过滤：输入框按 `node.text` 做大小写不敏感包含匹配，命中的标题**连同祖先**显示；过滤时不禁用折叠，但过滤结果为空显示「没有匹配的标题」。
3. 快捷键可选（`Ctrl+Shift+O` 折叠全部），先不加。
4. 测试：`src/lib/outlineTree.test.ts` 补 3 条（折叠集合、过滤含祖先、过滤空结果）。

**体积与风险**：约 45 行 + 3 条测试，首屏 <350 B。风险：过滤 + 自动展开祖先（现有 `expandAncestors`）交互要保证 `aria-current` 仍指向可见项；折叠状态本来就不持久化，过滤状态也不持久化，别顺手加 localStorage（`Outline.tsx:13` 注释明确会话内有效）。

### 2.9 全屏 / 禅模式 — P2，S（复提第 32 轮 2.9）

**用户收益**：写作时去掉侧栏、工具栏、状态栏。Typora 有 F11 与 `typora-fullscreen` 类（`frame.js` 的 `fullscreen` 处理；`typora-features.md:72`）。Sidelight 现在没有入口，`document.fullscreenEnabled === true`（第 32 轮实测），宿主里真 `requestFullscreen()` 的行为未验证。

**实现要点**：纯前端禅模式 —— `html.zen` class 隐藏 `.sidebar`、`.toolbar`、`.status-bar`，保留 `.margin-rail`（批注可达）与查找条；`Esc` 退出；入口放「视图」区与快捷键表（`Ctrl+Shift+Z` 或 `F11`）。0 依赖，约 20 行 CSS + 15 行 JS。

**体积与风险**：首屏 <150 B。风险：隐藏状态栏后字数与保存状态不可见（可保留左下角最小状态条）；宿主真全屏另开一轮（`CoreWebView2.ContainsFullScreenElementChanged`）。

### 2.10 查找条「区分大小写 / 整词」 — P2，S（复提第 32 轮 2.6）

**用户收益**：查 `API`、`Ctrl+K`、`String` 时大小写不敏感会掺进无关命中；替换更容易改错。Typora 的查找条有 Case Sensitive 与 Whole Word 两个按钮（`window.html` → `searchpanel-case-option-btn`、`searchpanel-word-option-btn`）。Sidelight：`App.tsx:1728` 写死 `{ caseSensitive: false }`，`FindBar.tsx` 只有 5 个按钮，`src/lib/find.ts:3,22-29` 已支持 `caseSensitive`。

**实现要点**：`FindBar` 加两个 `aria-pressed` 按钮；`FindOptions` 加 `wholeWord`；中文不做词边界（只在含拉丁词时启用或标注「仅对英文生效」）。

**体积与风险**：约 40 行，首屏 <250 B。本轮未新增实测（第 32 轮已测：`[aria-pressed]` 0 个）。

## 3. `docs/typora-gap.md` 过期核对

本轮复核后结论与第 32 轮一致：文件仍是 21 有 / 18 缺，以下条目过期或漏项。

| 表里写的 | 实际 | 证据 |
| :--- | :--- | :--- |
| 「缺」：缩放（P1） | **已有**（设置字号 12–26 + `Ctrl+=` / `Ctrl+-` / `Ctrl+0`），且「已有」表里也写着「字号与缩放：有」，自相矛盾 | `docs/typora-gap.md:25`、`:51`；`settings.ts:27-28` |
| 「缺」：大纲折叠（P2，「现在只有平铺」） | **已有**（第 29 轮），本轮实测 4 项 1 个折叠按钮、`aria-expanded` 可翻 | `docs/typora-gap.md:52`；`e2e-r33-typora.log` → `## outline` |
| 「缺」：新建、重命名、删除文件（P1） | **已有**（第 12–13、28 轮：删除进 trash、同目录重命名、新建） | `docs/typora-gap.md:59` |
| 「缺」：快速打开（P2） | **已有**（第 27 轮 Ctrl+P） | `docs/typora-gap.md:61` |
| 「缺」：最近文件（备注已写「有（8 条）」） | 行放错表 | `docs/typora-gap.md:62` |
| 「缺」：缩进与反缩进（P1） | **部分**：列表内 Tab/Shift+Tab 可缩进；段落 Tab 插两个空格，不是整体缩进/反缩进 | `App.tsx:780-795` |
| 「缺」：主题（P2，「只有跟随系统的明暗」） | 措辞过期：浅色 / 深色 / 跟随系统三档 | `settings.ts:4`、`:12-13` |
| 未进表 | **表格列宽拖拽**（Typora 有，Sidelight 缺） | 第 1 节第 6 项；`Docs/Table Editing.md` |
| 未进表 | **代码块语法高亮 + 语言标签**（Typora 有 30+ 语言） | 第 1 节第 5 项；`Docs/Code Fences Language Support.md:1-25` |
| 未进表 | **源码模式行号与语法高亮**（Typora 用 CodeMirror；Sidelight 是纯 `textarea.source-editor`） | `App.tsx` 源码模式；`typora-features.md:26` |
| 未进表 | **智能标点 / 自动配对 / 粘贴为纯文本 / 复制为 Markdown / 侧栏宽度** 已在上表 P1 或缺失 | 第 2 节；`window.html` 菜单项 |
| 表头计数 | 「缺的（18）」下实际 19 行；「已有（21）」下 21 行 | 逐行计数 |

建议修正：把 5 行移到「已有」（21 → 26），「缺」改为 14 行并补 3 行（17），表头写「缺的（17）」；「已有」里把图片一行改成「图片拖入与粘贴 | **落盘正常，但编辑器里显示为破图**（见第 33 轮 2.1）」；另在「已有」补一行「字数明细 | 中日韩字/拉丁词/合计/字符/句/段/阅读时间 + 选区内计数（Typora 的行数/字符/阅读/选区四项均已覆盖，行数口径是「段」不是源码行）」。

## 4. 本轮不建议做

- **换 MathJax**：Typora 用 MathJax，Sidelight 的按需 KaTeX 首屏更小（`typora-features.md:119`）。不动。
- **Pandoc 导入/导出链、PicGo 上传**：重依赖，违反「不为一个功能引一个库」。
- **主题商店 / 自定义 CSS 主题体系**：维护面大；主题三档 + 正文字体族已经够（字体族见第 32 轮 2.7）。
- **拼写检查（Typora 多语言拼写）**：WebView2 没有 Electron 的拼写服务，要么引词典库、要么走系统 API，收益对中文写作低（中文不适用）。本轮不做。
- **文件树 / 文件列表双形态**：一棵树够用，`Ctrl+P` 已覆盖查找。
- **TOC / emoji / 高亮 / 上下标扩展**：P2 且都要加扩展，等首屏省出字节再说。

## 5. UNVERIFIED 与测不了的原因

| 项 | 为什么没验证 | 怎么补 |
| :--- | :--- | :--- |
| ~~「URL 贴到选区变链接」Sidelight 是否真的做不到~~ **已解答（第 33 轮 critic 实测）：内置已支持，不需要做** | 合成 `ClipboardEvent` 被 ProseMirror `preventDefault` 接走，正文没有插入（`e2e-r33-typora.log` → `## pasteUrl`：`dispatched=false, defaultPrevented=true`，链接数 1→1）。源码里也没有 `text/plain` 专用分支 | 已用真实剪贴板 + 真实 `Control+V` 验完：Tiptap `linkOnPaste` 生效，结论见 2.4 顶部注记 |
| 宿主（Windows WebView2）里工作区图片同样破图 | 本轮只跑了 `localhost:5175`；宿主侧只做了路由静态核对（`host/Program.cs:297-312`、`:342`） | 实现图片解析后跑 `host-smoke`，在真文件夹插一张图看网络面板 |
| 代码块高亮的真实体积 | 只读角色，不能装依赖、不能构建 | 实现轮 `npm run build`，看 `dist/assets` 新 chunk 的 gzip，并与本节估算 15–20 KB 对照 |
| 智能标点与中文 IME 的组合态 | 需要真人输入法；Playwright 的 `insertText` 不产生组合事件 | 实现后请人工用微软拼音测：输入中按 `"`、`,`、`--` 各一次，确认不与组合态抢字符 |
| macOS 的 ⌘⇧V、侧栏拖拽、禅模式 Esc | 本机是 Windows，macOS 宿主不在 | 记进 macOS 真机清单 |
| 第 32 轮已列的其他 UNVERIFIED（真实 FSA 文件夹插图、导出 HTML 相对图、Typora 自动配对/智能标点的真实键位） | 本轮未重测 | 沿用 `docs/iteration/round-32/findings-typora.md:210-221` 的补测方法 |

本轮未复制 Typora 的任何图标、主题、代码或文档原文进仓库；只保留截图与行为记录（`.tmp/typora-ref` 仍在 `.gitignore` 内）。
