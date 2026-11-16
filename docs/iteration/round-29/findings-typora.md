# 第 29 轮 · Typora 对照与写作体验改进（findings-typora）

- 角色：Typora 对照与写作体验侦察（只读产品代码）
- 环境：Windows 11、Node 24.21、dev server `http://localhost:5175`、headless Edge CDP `127.0.0.1:9223`
- 对照样本：`.tmp/typora-ref`（Typora 0.11.18 解包）、`shots/typora/`（71 张）、`docs/iteration/typora-features.md`、`docs/typora-gap.md`
- 实测脚本：`.tmp/e2e-r29-typora.mjs`、`.tmp/e2e-r29-typora2.mjs`；原始输出 `.tmp/e2e-r29-typora.json`、`.tmp/e2e-r29-typora2.json`
- 截图：`shots/round-29/r29-typora-outline.png`、`shots/round-29/r29-typora-sidebar.png`、`shots/round-29/r29-typora-input-probe.png`

## 摘要

10 项改进建议里，0 项需要新增运行时依赖；9 项可在现有模块内完成；1 项（Mermaid）经体积测算**不建议**在 2 MB 级 WebView2 包体预算内做，理由见第 4 节。6 项已在 Sidelight 现状上实际跑过并留证据：字数点击无明细、大纲无折叠、行内 HTML 不渲染、无智能标点、贴图无落盘规则、表格无列宽手柄。

`docs/typora-gap.md` 已过期：至少 3 项已实现却仍写「无」（新建/重命名/删除、快速打开 Ctrl+P、缩放），1 项自相矛盾（最近文件写「有」却列在「缺」节），1 项描述不准（主题不只「跟随系统的明暗」）。核对结果见第 5 节。

## 1. 实测方法与结果总表

源码模式写入一段覆盖 6 个行为的 Markdown，再切回富文本解析（走产品自己的 `applySource` 路径），随后读 DOM 与状态栏。

```
Ctrl+/ → 填 textarea.source-editor → Ctrl+/ → 读 .doc-column .ProseMirror
```

| # | 行为 | 实测结果 | 证据 |
| :--- | :--- | :--- | :--- |
| 1 | 字数点击明细 | 点 `.status-left` 前后 `document.body` 元素数都是 88，弹出层 0 个；该元素不是按钮 | `.tmp/e2e-r29-typora.json` → `steps.wordcountClick` |
| 2 | 大纲折叠 | 3 个 `.outline-item`，`aria-expanded` 0 个，折叠按钮 0 个 | 同上 → `steps.outline`；`r29-typora-outline.png` |
| 3 | 行内 HTML 渲染 | `<kbd>`/`<mark>` 元素 0 个；段落文字仍是 `<kbd>Ctrl</kbd>` 原文 | 同上 → `steps.inlineHtml` |
| 4 | 智能标点 | 键盘输入 `"q"`、`a -- b`、`...`，弯引号/破折号/省略号全部 0 个，文字原样 | `.tmp/e2e-r29-typora2.json` → `typedSmartPunct` |
| 5 | Mermaid | ```mermaid 块变成 1 个 `pre`，编辑器内 `svg` 0 个、mermaid 节点 0 个 | `.tmp/e2e-r29-typora.json` → `steps.mermaid` |
| 6 | 表格列宽拖拽 | 有 `table` 与 `colgroup`，`.column-resize-handle` 0 个，表元素无 `resizable` 类 | 同上 → `steps.table` |
| 7 | 粘贴为纯文本 | 派发带 `text/html` 的 paste，`strong` 1 个、`ul li` 1 个，只进了 HTML 文本（`加粗来源`），纯文本（`纯文本来源`）没进 | 同上 → `steps.pastePlain` |
| 8 | 图片落盘规则 | 无文件夹句柄贴 PNG：`img.src` 是 `data:image/png;base64,iV…`，提示「图片暂时内联在正文里；打开文件夹后再拖入，才会存成 assets 相对路径。」 | `.tmp/e2e-r29-typora2.json` → `imageInsert` |
| 9 | 全屏 | 页面按钮里没有全屏入口；`host/Program.cs` 无 `FormBorderStyle`/全屏分支 | `.tmp/e2e-r29-typora.json` → `chrome.fullscreenControls`；`host/Program.cs:1491`（只关了加速键） |
| 10 | 主题 | `<html data-theme="system">`，设置只有浅色/深色/跟随系统三种 | `.tmp/e2e-r29-typora.json` → `steps.theme`；`src/components/SettingsDialog.tsx:48-50` |

## 2. 改进建议（按收益/成本排序）

### 2.1 字数点击弹出明细（含选区）— P1，S

**用户收益**：长文写作每天都在看进度。Typora 状态栏随选区变成「9 / 195 词」（`shots/typora/01-live-preview.png`、`typora-features.md:53`）。中文作者需要「字符 / 词 / 句 / 段 / 阅读时间 / 选区内」六项，尤其段落数与选区计数。

**现状证据**：`src/components/StatusBar.tsx:32-34` 只把 `formatStats(stats)` 放在一个 `span` 里，无 `onClick`、无 `role`，实测点击不产生任何 DOM 变化。数据侧已够用：`src/lib/wordcount.ts:47-57` 已算出 `cjk`、`words`、`chars`、`paragraphs`、`minutes`，缺 `sentences` 与「选区内」一项。

**实现要点**：
1. `src/lib/wordcount.ts`：`TextStats` 加 `sentences`；`countText` 用「中英文句末标点 + 换行」切句（`[。！？!?；;]` 与 `.` 后接空格），保持纯整数计数。
2. `StatusBar.tsx`：把 `.status-left` 的字数改成 `<button type="button" aria-expanded>`，点击切换 `<dl class="stats-detail">`；Esc 关闭、点外部关闭。
3. `src/App.tsx:4721`：已有 `stats`，再传 `selectionStats = countText(editor.state.doc.textBetween(from,to,'\n'))`，选区为空时隐藏该行。
4. `src/lib/wordcount.test.ts` 补 3 条：句数、选区子串、零值。

**体积与风险**：新增约 60–90 行 TSX/CSS，首屏 gzip 增量预计 <400 B（可直接内联，不必 lazy）。风险：状态栏变可点击后键盘焦点顺序变化，需保证 `Tab` 只在状态栏内走一次；`aria-expanded` 与 `useDialogFocus.ts` 的既有约定保持一致。

**建议优先级**：P1，1 轮内可完成。

### 2.2 大纲折叠（可展开/收起子级）— P1，S

**用户收益**：长文标题到三、四级时，平铺大纲比正文还长。Typora 大纲可折叠（`typora-features.md:113`、`typora-gap.md:52`）。折叠后一屏能看到全书结构。

**现状证据**：`src/lib/outline.ts:18-32` 的 `extractOutline` 只产出扁平 `{id, level, text, pos}` 数组；`src/components/Outline.tsx:25-38` 逐条渲染按钮，用 `paddingLeft=(level-1)*10` 表达层级，没有父节点概念。实测 3 个标题全部展开，`aria-expanded` 与 `.outline-toggle` 都是 0。

**实现要点**：
1. `outline.ts`：新增 `buildOutlineTree(items)`，按 level 单调栈补 `parentId`/`hasChildren`；`extractOutline` 不动，避免破坏 `activeOutlineId` 的既有测试。
2. `Outline.tsx`：折叠态用 `useState<Set<string>>`，只在有子级的行渲染 `▸/▾` 切换按钮（`aria-expanded`）；折叠时子级不渲染。
3. 判断「当前章节」被折叠：`activeOutlineId` 命中被折叠节点时，把祖先链展开（`sets` 追加祖先 id），保证 `aria-current` 永远可见。
4. `src/lib/outline.test.ts` 补树构建与「折叠后仍能定位当前节」两条。

**体积与风险**：约 50 行，首屏增量 <200 B。风险：折叠状态是否持久化；建议先只存在组件内存（Typora 也是会话内），不做 localStorage，避免新键。

**建议优先级**：P1，1 轮内可完成。

### 2.3 粘贴为纯文本（Ctrl+Shift+V）— P1，S

**用户收益**：从网页、Word、AI 对话框复制内容时，常把字体、颜色、链接、列表带进 Markdown。Typora 用 `Ctrl+Shift+V` 只贴文字（`typora-features.md:84`，标 UNVERIFIED）。

**现状证据**：`src/App.tsx:777-783` 的 `handlePaste` 只筛 `image/*`，其余全部交给 ProseMirror 默认粘贴。实测带 `text/html` 的 paste 保住了 `strong` 与 `ul li`，纯文本字段被丢弃。代码里也没有 `Ctrl+Shift+V` 的键位（`src/App.tsx` 键盘分支见 3516、3556-3568，均无）。

**实现要点**：
1. `App.tsx:777` 的 `handlePaste` 开头加分支：`if ((event.ctrlKey || event.metaKey) && event.shiftKey) { const text = event.clipboardData?.getData('text/plain') ?? ''; if (!text) return false; view.dispatch(view.state.tr.insertText(text)); return true }`。
2. 粘贴后按当前 markdown 段落规则切段：把 `\r\n` 归一成 `\n`，空行分段（Typora 也分段）；实现放 `src/lib/` 一个小函数，便于测试。
3. `ShortcutsDialog.tsx` 与 README 键位表各加一行。

**体积与风险**：约 30 行，首屏增量可忽略。风险：宿主已设 `AreBrowserAcceleratorKeysEnabled = false`（`host/Program.cs:1491`），`Ctrl+Shift+V` 会到页面；macOS 宿主未验证 `Cmd+Shift+V`（UNVERIFIED）。粘贴纯文本会丢失公式/表格结构，属于预期行为，需在提示里说一次。

**建议优先级**：P1，1 轮内可完成。

### 2.4 表格列宽拖拽 — P1，M（有保真风险，需配套）

**用户收益**：中文表格列宽按内容分布经常失衡。Typora 表头悬浮工具条 + 可拖拽列宽（`typora-features.md:46`、`Docs/Table Editing.md`）。

**现状证据**：`src/App.tsx:119-128` 的 `ReusableTable` 只重写了 `renderMarkdown`，没有 `configure({ resizable })`；注册处 `App.tsx:722` 也只写 `ReusableTable`。实测 `colgroup` 有（Tiptap 默认渲染），`.column-resize-handle` 0 个、`resizable` 类无。

**实现要点**：
1. `App.tsx:722` 改 `ReusableTable.configure({ resizable: true, handleWidth: 5, cellMinWidth: 80 })`，并引入 Tiptap 表格的 `TableCell`/`TableHeader` 默认渲染即可（表格扩展自带列手柄）。
2. **保真配套（必须同轮）**：`colwidth` 属性会被 `renderMarkdown` 写进 GFM 表格找不到位置，导致 markdown 字节变化。`App.tsx:120-127` 的 `renderMarkdown` 里要剥离列宽；`src/lib/tableReuse.ts` 的「未动过的表格整块复用原文」要保证拖动列宽算「动过」，走重新排版路径，并在保存前的差异门（`src/lib/diff.ts`）里体现。
3. 补测：不改列的表格仍逐字节复用（现有 roundtrip 5/7 不能退）。

**体积与风险**：约 20 行配置 + 剥离逻辑，首屏增量 <100 B（列手柄样式由 Tiptap 表格扩展的 CSS 提供，本仓库未引其 CSS，需要补 ~10 行 `.column-resize-handle` 样式）。风险最高的一项：会改变表格 markdown 形态，必须与差异门、roundtrip 一起验。

**建议优先级**：P1，但排在 2.1–2.3 之后；若本轮任务排满，只做配置不做剥离会破坏保真，**不可拆开**。

### 2.5 图片落盘规则（`assets/` / `<文件名>.assets/` / 相对路径）— P1，M

**用户收益**：Typora 三种落盘规则：相对路径、`./assets`、`${filename}.assets`，且支持 frontmatter 里的 `typora-copy-images-to`（`Docs/Use Images in Typora.md:48-70`）。中文作者常把文章与配图放同一目录树，`<文件名>.assets/` 能避免多个文档共用 `assets/` 时同名冲突。

**现状证据**：`src/lib/asset.ts:42-52` 的 `writeAsset` 硬编码 `getDirectoryHandle('assets', {create:true})`，返回固定 `assets/${fileName}`；`App.tsx:3793-3814` 的 `insertImageFile` 只在有文件夹句柄时落盘，否则内联。实测无句柄贴图得到 `data:image/png;base64,…` 与提示语（原文见第 1 节第 8 行）。

**实现要点**：
1. `asset.ts`：`writeAsset(dir, fileName, blob, rule)`，`rule = { kind: 'assets' | 'filename-assets' | 'relative', docName?: string }`；`pathForRule()` 纯函数，便于测试。
2. `settings.ts`：`Settings` 加 `imageFolder: 'assets' | 'filename-assets' | 'relative'`（默认 `assets`，不改变现状），`loadSettings` 做白名单校验。
3. `App.tsx:3793` 读设置；`filename-assets` 用现成的 `docName`；`relative` 时不建目录，只在同目录写文件并返回 `./name.png`。
4. `SettingsDialog.tsx` 加三选一；README「现在能做什么」补一行。
5. `asset.test.ts` 补三种规则的路径断言。

**体积与风险**：约 80 行，首屏增量 <300 B。风险：`relative` 与 `filename-assets` 会往文档同级目录建新文件夹，属于用户可见的文件系统变化，需要在设置里写清；无句柄时仍走内联，不能报错。

**建议优先级**：P1，1 轮内可完成。

### 2.6 智能标点（默认关，避开 IME）— P2，M

**用户收益**：中文写作里直引号与破折号是高频输入。Typora 把直引号转弯引号、`--` 转破折号（`typora-gap.md:41`）。

**现状证据**：实测键盘输入 `"q"`、`a -- b`、`...` 全部原样（`typedSmartPunct`）。代码里唯一的 `InputRule` 在 `src/lib/mathInput.ts:17-45`（公式），没有 `src/lib/typography.ts` 之类模块。

**实现要点**：
1. 新建 `src/lib/typography.ts`，写一个 Tiptap `Extension` + `addInputRules`：`/^\.\.\.$/` → `…`；`/^--$/` → `—`；成对直引号转弯引号。
2. 必须跳过：代码块、行内代码、公式、以及 `event.isComposing`（中文输入法组合期间）。Tiptap 的 `InputRule` 在组合输入时仍会触发，需在 `handleTextInput` 层用 `view.composing` 拦一次。
3. 中文场景建议只做「省略号 + 破折号」，直引号转弯引号改成可选开关：中文作者多用直角引号「」，直接换成“”反而要改回来。
4. 默认关闭，设置里加一个「智能标点」开关；`settings.ts` 加 `smartPunct: false`。

**体积与风险**：约 100 行 + 3 条测试，首屏 <400 B。风险最高的是输入法：本机从未验过真实 IME（`AGENTS.md:73` 未验清单），智能标点与 IME 组合输入叠加是新的未验面。默认关可把风险压到最低。

**建议优先级**：P2，等 IME 在真实宿主上验过一轮再做。

### 2.7 行内 HTML 白名单渲染（`kbd` / `mark` / `br`）— P2，M

**用户收益**：技术写作用 `<kbd>Ctrl</kbd>`、`<mark>`、`<br>` 表达按键与换行。Typora 渲染成键盘样式（`typora-gap.md:39`）。

**现状证据**：实测 `<kbd>Ctrl</kbd>` 在正文里就是这段文字本身（`inlineHtml.kbdEls = 0`）。`src/lib/html.ts` 全程只做 `escapeHtmlForParse`/`repairHtml`（转实体再还原），没有渲染分支；这是有意的保真设计。

**实现要点**：
1. 新建 `src/lib/inlineHtml.ts`：解析 JSON 白名单 `['kbd','mark','br','sub','sup','abbr']`，命中则转成一个自定义 Mark（如 `htmlInline`）或 attr；未命中仍按实体文字走现有 `repairHtml` 路径。
2. 序列化必须还原原文：在 `src/lib/serializeDocument.ts:52` 的 repair 链里，由 mark 的 `renderMarkdown` 吐出原始 `<kbd>…</kbd>`。
3. 差异门与 roundtrip：`html.test.ts` 现有断言依赖「转实体再还原」，改渲染后需要新增「渲染后保存字节不变」的用例；`npm run roundtrip` 的 5/7 不能退。

**体积与风险**：约 120 行，首屏 <500 B。风险：这是与「逐字节保真」直接冲突的一项，任何 mark 化都会丢原始空白与属性（`<kbd class="x">`）。建议只做标签集合且不带属性；带属性的标签继续按文字保留。

**建议优先级**：P2。README 已把「行内 HTML 只保真不渲染」写成已知限制，改动收益明确但回归面大，建议单独一轮。

### 2.8 Mermaid 渲染 — P2，L（体积不达标，本轮不做）

**用户收益**：技术写作刚需，Typora 内置（`typora-features.md:26`、`Docs/Draw Diagrams With Markdown.md:42-121`）。

**现状证据**：`src` 全目录 grep `mermaid` 无匹配；实测 ```mermaid 块渲染成 1 个 `pre`（`preTexts: ["graph LR\n  A-->B"]`），编辑器内 `svg` 0 个。体积测算与首屏方案见第 4 节。

**建议优先级**：P2，本轮不建议实施。

### 2.9 主题体系：色板去重 + 自定义 CSS 变量导入 — P2，S/M

**用户收益**：Typora 内置 5 套主题（`resources/style/themes`：github 8,649 B、newsprint 10,966 B、night 17,529 B、pixyll 10,997 B、whitey 4,892 B）并可加载自定义 CSS（`Docs/Custom Themes.md`）。Sidelight 只有浅/深/跟随系统三态（`settings.ts:4`、`SettingsDialog.tsx:48-50`），对长时间写作只够用，不够护眼微调。

**现状证据**：`src/styles.css:1-33` 浅色变量、`:36-62` 手动深色变量、`:65-…` 跟随系统深色变量——同一套深色色板写了两遍（26 行 × 2）。实测 `<html data-theme="system">`。

**实现要点**：
1. 先把深色色板抽成一处：用 `matchMedia('(prefers-color-scheme: dark)')` 在首帧前（`src/main.tsx` 顶部，`render` 之前）把 `data-theme` 解析成 `light`/`dark` 写死到 `<html>`，删掉 `@media` 那一份重复变量。收益：少 26 行、消除两处漂移、无运行时开销。
2. 再开放「自定义主题」：只允许覆盖 `:root` 里的 CSS 变量白名单（`--paper`、`--ink`、`--accent` 等），文件写 `.sidelight/theme.css`，启动读取后注入一个 `<style>`；不解析、不执行任意 CSS 选择器。
3. 设置里加「主题：浅色 / 深色 / 跟随系统 / 自定义」四档。

**体积与风险**：第 1 步约 −26 行、0 增量；第 2 步约 80 行（读取需走宿主/FSA 文件路径，属另一轮）。风险：首帧前解析系统主题会把「跟随系统」从纯 CSS 改成 JS，若 `matchMedia` 监听漏了系统切换会不跟随——需要监听器。自定义 CSS 是用户输入进 DOM，必须只接受 `--var: value` 形态。

**建议优先级**：P2；第 1 步（去重）可顺手在任何一轮做。

### 2.10 全屏（宿主层 F11）— P2，S/M

**用户收益**：Typora 有 F11 全屏与 Ctrl+Shift+= 缩放（`typora-features.md:72`、`76`）。全屏写作减少干扰；缩放 Sidelight 已有（见第 5 节，差距表过期）。

**现状证据**：页面按钮里无全屏入口（`chrome.fullscreenControls: []`）；`host/Program.cs` 只有 `:1491` 的加速键开关与 `:1753` 的最小化恢复，没有全屏分支。macOS 宿主同样未查（`host-mac/` 未运行过）。

**实现要点**：宿主层改 `host/Program.cs`：拦 `F11`，切 `FormBorderStyle = None` + `WindowState = Maximized`（保留退出键 Esc），菜单「视图」加一项；macOS 侧 `host-mac/` 对应 `toggleFullScreen:`。页面侧不需要改动。
**不建议**用 `requestFullscreen()`：WebView2 里会让页面元素全屏、顶部工具栏一起消失，且行为与宿主窗口状态不同步。

**体积与风险**：宿主代码约 40 行，安装包增量可忽略；但宿主改动会触发安装包重打与 `host-smoke` 重跑，属独立一轮的量。风险：全屏下 `Alt+F4`/Esc 的关闭路径需要在真机验（现有未验清单已有「真实 Alt+F4」项）。

**建议优先级**：P2，与宿主轮合并做。

### 2.11 不建议做（本轮明确排除）

- **文件列表形态的侧栏**（`typora-gap.md:53`）：Sidelight 有文件树 + `Ctrl+P` 快速打开（`src/components/QuickOpen.tsx`、`App.tsx:33/3516`），两种形态并存会加侧栏状态与键位分支，收益不足。
- **主题商店、Pandoc 导入导出、MathJax、自动更新器**：理由与 `typora-features.md:117-127` 相同，不重复。
- **照搬 Typora 的 Electron/CodeMirror 渲染层**：Sidelight 是 Tiptap + WebView2，源码模式是 `textarea.source-editor`（`App.tsx:4606-4608`，实测可用），换成 CodeMirror 要引依赖，违反体积底线。

## 3. 为什么这些改进适合 2 MB 级 WebView2 应用

- 建议里 9 项是「已有数据换个出口」：字数数据（`wordcount.ts`）、大纲数据（`outline.ts`）、图片落盘（`asset.ts`）、表格配置（`ReusableTable`）、粘贴钩子（`handlePaste`）都已在首屏里，改动不引入新 chunk。
- 唯一会新增依赖的是 Mermaid，测算后不达标（第 4 节）。
- 不做后台常驻、不联网、不建新缓存目录；唯一涉及写盘的是图片落盘规则，仍只写文档同级目录（符合 `AGENTS.md:51` 的缓存边界，且图片不是缓存）。

## 4. Mermaid 懒加载体积测算与首屏预算方案

### 4.1 已测事实

| 项 | 数值 | 来源 |
| :--- | :--- | :--- |
| mermaid 最新版本 | 12.3.0 | `npm view mermaid version`（本机执行，输出见本轮日志） |
| 包解压体积 | 123,623,192 B（约 123.6 MB） | `npm view mermaid dist.unpackedSize` |
| 文件数 | 1,405 | `npm view mermaid dist.fileCount` |
| 首屏预算 | 285,783 B / 上限 286,000 B，余 **217 B** | `docs/iteration/STATE.md:52`、`README.md:96` |
| `dist` 当前 | 1,461,334 B | `docs/iteration/STATE.md:52` |
| Windows 安装包 | setup 824,209 B、portable 910,360 B | `docs/iteration/STATE.md:54` |
| 安装包预算 | 内部 820,000 B、硬线 850,000 B | `README.md:96` |

### 4.2 结论

1. **首屏不受影响**：把 Mermaid 拆成 `import('mermaid')` 的异步 chunk 后，首屏 gzip 不增长，217 B 余量不会被吃掉。这一条与 KaTeX 惰性加载（ADR-0012）同构，技术上可复用同一套模式。
2. **安装包先破线**：硬线 850,000 B 与当前 setup 824,209 B 之间只剩 **25,791 B**。任何可观的前端 chunk 都会进 `dist` → 进安装包，25.8 KB 的余量装不下 Mermaid 的流程图/时序图全家桶。`npm view` 的 123.6 MB 是整个多格式包，不能直接当 chunk 大小，但它足以说明「这不是几 KB 的功能」。
3. 因此：**默认启用 Mermaid 与安装包硬线二选一**。要抬硬线属于对外承诺变化，按 `AGENTS.md:15` 必须回到产品负责人。

### 4.3 如果下一轮仍要做，按这个顺序先量后做

1. 在 `.tmp/` 起一个一次性 Vite 工程（不进 `package.json`）：`import mermaid from 'mermaid'`，只注册 `flowchart` + `sequence` 两个 diagram，`vite build`，量 `dist/assets/*.js` 的 raw 与 gzip。
2. 判定门槛（建议值，需产品确认）：chunk gzip ≤ 60,000 B 才进默认安装包；60,000–120,000 B 只做「按钮触发下载/本地可选组件」；> 120,000 B 不做。
3. 渲染侧限制：`securityLevel: 'strict'`、不开 `htmlLabels`、代码块 `startOnLoad=false`，只对光标离开且内容 hash 变化的块渲染；导出 HTML 保留 ` ```mermaid ` 源码块，不注入 SVG。
4. 降级：未知语法不报错，保留代码块并给一条状态栏提示，与现有 `errorCopy.ts` 文案风格一致。

**UNVERIFIED**：Mermaid 实际 tree-shaken 后的 chunk gzip 大小未测（本机 npm 缓存写权限被沙箱拒绝，`npm pack` 未完成；`cdn.jsdelivr.net` 直连失败）。下一轮补测方法见上。

## 5. `docs/typora-gap.md` 过期核对

结论：**过期**。「已有 21 / 缺 18」的计数不成立，修正后至少是 **24 有 / 14 缺**（另有 1 项描述不准）。

| 差距表位置 | 表中写的 | 实际 | 证据 |
| :--- | :--- | :--- | :--- |
| `typora-gap.md:59` | 新建、重命名、删除文件「无」 | **已实现**：顶栏文件菜单新建/另存为、文件树头「＋ 新建文件」、右键删除进 `.sidelight/trash/`、同目录重命名 | `README.md:53-55`；`src/components/FileMenu.tsx`、`src/components/TreeActions.tsx`、`src/lib/trash.ts`、`src/lib/rename.ts` |
| `typora-gap.md:61` | 快速打开（Ctrl+P 模糊搜索）「无」 | **已实现** | `src/components/QuickOpen.tsx`；`src/App.tsx:33`（lazy import）、`App.tsx:3516`（Ctrl+P 分支）、`App.tsx:4904-4913`（渲染） |
| `typora-gap.md:50` | 缩放「无，Ctrl+滚轮与比例重置」 | **已实现**：字号 12–26，`Ctrl+=` / `Ctrl+-` / `Ctrl+0` | `src/lib/settings.ts:27-28`、`src/App.tsx:3556-3568`、`README.md:51`；缺的只是 `Ctrl+滚轮` |
| `typora-gap.md:62` | 最近文件写在「缺的」节里，备注却是「有（8 条…）」 | **自相矛盾**，应移到「已有」 | `README.md:59`、ADR-0009 |
| `typora-gap.md:81` | 主题「只有跟随系统的明暗」 | **不准**：已有浅色 / 深色 / 跟随系统三档，可手动切 | `src/lib/settings.ts:4`、`src/components/SettingsDialog.tsx:48-50`、`App.tsx:663-665` |
| `typora-gap.md:60` | 拖入文件或文件夹打开「无」 | **未过期**：`handleDrop` 只接 `image/*`，拖 `.md` 或文件夹无效 | `src/App.tsx:769-776` |
| `typora-gap.md:39` | 行内 HTML 不渲染 | **未过期**：实测确实是文字 | 第 1 节第 3 行 |
| `typora-gap.md:41-43` | 智能标点 / 自动配对 / 粘贴纯文本「无」 | **未过期**：智能标点与纯文本粘贴实测均无 | 第 1 节第 4、7 行 |
| `typora-gap.md:52` | 大纲折叠「无」 | **未过期**：实测无折叠 | 第 1 节第 2 行 |
| `typora-gap.md:69` | Mermaid「无」 | **未过期**：实测是代码块 | 第 1 节第 5 行 |

顺带发现：`README.md:78` 写的「已有 21 项，缺 18 项」需要与差距表同步改；`docs/typora-gap.md:84-92` 的「建议的下一批」把已完成的「全局搜索与最近文件」仍列为待做，需一并更新。另，`typora-gap.md` 缺一项真实差距：**表格列宽拖拽**（未在表中列出，属于「表格行列」能力的子项）。

## 6. 未验证

- 真实中文输入法下的智能标点（没有可用的 IME 自动化；本机从未验过 IME）。
- `Ctrl+Shift+V` 在 Windows 宿主与 macOS WKWebView 里是否被系统层截走（只在页面层确认无键位实现）。
- 表格列宽拖拽的产品效果（只确认了「无手柄」，没有实现原型）。
- Mermaid 实际 tree-shaken chunk 的 raw/gzip（npm 缓存写权限被拒、jsdelivr 直连失败，见第 4 节）。
- F11 全屏在 WebView2 与 WKWebView 的真实窗口行为。
- Typora 侧的智能标点与粘贴纯文本行为（`typora-features.md:160` 已标 UNVERIFIED，本轮未重跑 Typora）。
