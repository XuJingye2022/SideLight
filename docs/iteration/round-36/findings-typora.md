# 第 36 轮 · Typora 对照与写作体验（finder-typora）

- 角色：finder-typora，只读。本轮未修改任何产品代码。
- 轮前 startSha：`b3509c9f2610a480dc6878187c767267abd12678`
- 环境：dev server `http://localhost:5175`（未另起）、CDP **9223**、开跑前已执行 `node .tmp/reset.mjs 9223`。
- 探针：`.tmp/e2e-r36-typora.mjs`（A–G）、`.tmp/e2e-r36-typora2.mjs`（H）
- 原始输出：`.tmp/r36-typora-probe.log`、`.tmp/r36-typora-probe2.log`
- 截图：`shots/round-36/probe-a-inline-html.png`、`probe-b-mermaid.png`、`probe-c-table.png`、`probe-d-stats.png`、`probe-e-outline.png`、`probe-g-paste.png`、`probe-h-paste-real.png`
- 参考：`docs/iteration/typora-features.md`、`docs/typora-gap.md`、`.tmp/typora-ref/resources/Docs/`（`Markdown Reference.md`、`Table Editing.md`、`Use Images in Typora.md`、`Draw Diagrams With Markdown.md`）

## 1. 本轮真跑过的项（7 组，全部有输出）

| # | 项 | 实测结果 |
| :-: | :--- | :--- |
| A | 行内 HTML | 输入 `<kbd>Ctrl</kbd> 和 <sup>2</sup> 与 <mark>重点</mark>` 后，`.ProseMirror` 里 `kbd`/`sup`/`mark` 元素 **0 个**，正文是 `&lt;kbd&gt;Ctrl&lt;/kbd&gt;…` 的转义文本。保真成立，渲染没有。`PROBE-A` |
| B | Mermaid | 敲 ```` ```mermaid ```` + `graph TD; A-->B` 得到 1 个 `pre`，`svg` **0 个**，`mermaid` 相关请求 **0 条**。`shots/round-36/probe-b-mermaid.png` |
| C | 表格列宽 | 插入 3×3 表：`colgroup` 3 个 `<col style="min-width:25px">`，`.column-resize-handle` **0 个**；把首列右边界拖 78 px 后三列仍是 `192/192/192`，`cursor: auto`。`PROBE-C1/C2` |
| D | 字数点击明细 | 点状态栏字数打开 `#stats-detail`：中日韩字 23 / 拉丁词 12 / 合计 35 / 字符 79 / 句 5 / 段 2 / 阅读 1 分钟 / 选区「未选中文本」。真实鼠标拖选后 `.status-selection` = **选区 18 字**。`PROBE-D2`、`PROBE-H1` |
| E | 大纲折叠 | `# 一级标题`（带子项）+ `# 另一个一级` 生成 1 个 `.outline-toggle`；点击后可见项 3→**2**，`aria-expanded="false"`。折叠能用。`PROBE-E2/E3` |
| F | 缩放 | Ctrl+滚轮：`17px → 17px`（无效）；Ctrl+= 两次：`17px → 19px`（有效）。`PROBE-F` |
| G/H | 粘贴 | 真实剪贴板（`text/html`+`text/plain`）Ctrl+V → `<strong>粗体字</strong>和<em>斜体</em>`；Ctrl+Shift+V → 纯文本、无标记。浏览器原生行为，Sidelight 无自有实现。`PROBE-H2/H3/H4` |
| H5 | 代码块语言 | `pre.className` 为空，语言在子元素：`code.language-mermaid`、`code.language-js`。`src/styles.css` 无 `.language-*` 规则，全仓无高亮库。`PROBE-H5` |

## 2. `docs/typora-gap.md` 过期核对（结论：18 条「缺」里 8 条已不缺、2 条半对）

| gap 表条目 | 表里写 | 实际 | 证据 |
| :--- | :--- | :--- | :--- |
| 自动配对括号与引号 | 无 | **已有** | `src/lib/smartTyping.ts`；`src/lib/settings.ts:23-24` `smartPunctuation` |
| 智能标点 | 无 | **已有**（第 33 轮） | 同上 + `smartTyping.test.ts` |
| 缩进与反缩进 | 无 | **已有**：列表 Tab/Shift+Tab；正文 Tab 插 2 空格 | `src/App.tsx:787-811` |
| 大纲折叠 | 无 | **已有** | `src/components/Outline.tsx:17,49-70`；`PROBE-E3` |
| 新建、重命名、删除文件 | 无 | **已有** | `ADR-0013`、`ADR-0014`、`src/lib/rename.ts`、`src/components/TreeActions.tsx`、`src/lib/trash.ts` |
| 快速打开（Ctrl+P） | 无 | **已有** | `src/components/QuickOpen.tsx`、`STATE.md:60` |
| 最近文件 | 有（表里重复列在两边） | 仍有 | `/__recent` 只回哈希 id |
| 粘贴为纯文本 | 无 | **能用**：Chromium 原生 Ctrl+Shift+V（无自有代码） | `PROBE-H4` |
| 缩放 | 无 | **半对**：Ctrl+= / Ctrl+- / Ctrl+0 已有（`src/App.tsx:3655-3667`）；Ctrl+滚轮缺 | `PROBE-F` |
| 主题 | 只有跟随系统的明暗 | **半对**：已有浅 / 深 / 跟随系统三档（`src/lib/settings.ts:4,90-93`；`src/styles.css:36,66`）；仍无主题体系 | 设置面板 |
| 自定义快捷键 | 无 | **半对**：有只读快捷键对话框（`src/components/ShortcutsDialog.tsx`），不能改键 | 同左 |
| 行内 HTML 渲染、高亮/上下标/TOC/emoji、全屏、文件列表形态、拖入文件或文件夹、图片缩放、Mermaid、全局搜索 | 无 | **仍然缺** | `PROBE-A`、`PROBE-B`、`grep fullscreen=0`、`grep imageResize=0`、`src/lib/search.ts` 只做联网核对 |

修正后的计数：**约 29 项有、10 项缺**（不是 README/AGENTS 里的「21 有、18 缺」）。缺的 10 项＝行内 HTML、高亮/上下标/TOC/emoji、全屏、文件列表形态、拖入 .md/文件夹、图片缩放、Mermaid、全局搜索、主题体系、自定义快捷键；另两项部分缺＝Ctrl+滚轮缩放、宿主里的 Ctrl+Shift+V。

## 3. 可执行建议（9 条）

### 3.1 Mermaid 惰性渲染落地（P0，`ADR-0017` 已批，本轮第一件事）

- 用户收益：技术写作的流程图、时序图、甘特图直接成图；Typora 内置同一能力（`.tmp/typora-ref/resources/Docs/Draw Diagrams With Markdown.md:42-119`）。
- 现状证据：`PROBE-B2` 显示 `svg 0`、`mermaid 请求 0`；代码块语言只到 `code.language-mermaid`（`PROBE-H5`）。
- 实现要点：新建 `src/lib/mermaidLazy.ts`（别名 + shim，照 `src/lib/katexLazy.ts`）+ `src/lib/mermaidRender.ts`（`initialize({startOnLoad:false, securityLevel:'strict'})` + `render`）；在 `src/App.tsx:735` 附近的扩展列表里把 `StarterKit` 的 `codeBlock` 换成带 `addNodeView()` 的扩展，NodeView 判断 `node.attrs.language === 'mermaid'` 时 `await import()`，否则渲染原 `<pre><code>`；导出复用 `src/App.tsx:3831` 的 `await ensureKatex()` 写法。
- 体积：首屏 **0 B**；含图文档首次渲染 +413,672 B gzip（`ADR-0017` 档 1b）；安装包预估 **1,474,881 B**（内部线 1,800,000 内）。打包后必须用真实安装包字节替换预估。
- 风险与坑：① 语言属性在 `node.attrs.language`，DOM 上读 `pre.className` 读不到（`PROBE-H5` 实测空串），别照 `pre` 找；② 异步渲染要按内容 hash 缓存，避免每次 transaction 重渲染；③ 未知语法降级为原代码块 + 一行提示，不吞内容；④ `d3`/`dompurify`/`chevrotain`/`cytoscape` 四个外部依赖未量，装完看 Vite 真实 chunk 组。

### 3.2 代码块语言徽标 + 轻量语法高亮（P1，新发现）

- 用户收益：读代码块不费眼；`mermaid`/`js`/`json` 一眼可辨。Typora 有 `Docs/Code Fences Language Support.md` 与高亮。
- 现状证据：`code.language-js` 存在但 `pre.className` 空、无 `.language-*` CSS、`package.json` 无高亮库（`PROBE-H5`）。
- 实现要点：与 3.1 共用同一个 code block NodeView，右上角显示语言徽标（0 B）；高亮另做，先测算 `lowlight` + 常用 12 种语言的 gzip，**超过 15 KB 不做**。
- 体积与风险：徽标 0 B；高亮库进首屏会吃 310,000 B 内部预算（当前余 23,944 B），只能惰性进 chunk。

### 3.3 表格列宽拖拽 + 列对齐（P1）

- 用户收益：宽表不再被平均分配列宽；写作时能控制「第一列窄、内容列宽」。
- 现状证据：`PROBE-C1/C2`——`.column-resize-handle` 0 个、拖动无变化、三列固定 192 px。
- 实现要点：`Table.configure({ resizable: true, lastColumnResizable: false })`（选项见 `node_modules/@tiptap/extension-table/dist/index.d.ts:79,109`）；补 `.column-resize-handle` 与 `.resize-cursor` 的 CSS（`src/styles.css:624` 附近）；`colwidth` 读取写在表格工具条（`src/App.tsx:4603`）。
- 体积与风险：0 B 新依赖。**坑：GFM 管道表不存列宽**——宽度只在 `colwidth` 属性里，序列化会丢。建议只当视图态（重开复位）并在工具条提示；要持久只能写 `<colgroup>` HTML 表，会破坏 GFM，不建议。列对齐（`|:--:|`）能否往返需先跑 `npm run roundtrip` 实测（UNVERIFIED）。

### 3.4 图片落盘规则与禁 base64 内联（P1，数据安全向）

- 用户收益：无文件夹句柄时插图片，现在把 base64 塞进 `.md`，文件膨胀且不可移植；Typora 默认写相对路径（`Docs/Use Images in Typora.md:48-70`，可选 `${filename}.assets`）。
- 现状证据：有句柄写 `assets/<base36>-<name>`（`src/lib/asset.ts:42-53`）；无句柄写 data URL（`src/App.tsx:3936-3937`）；目录名写死 `assets`。
- 实现要点：`src/lib/settings.ts:6-25` 加 `imageDir: 'assets' | 'filename-assets'`；`writeAsset`（`src/lib/asset.ts:42`）按规则拼目录，`filename-assets` 用 `${docBase}.assets`；无句柄时改成「先保存，再插图片」的可见提示，不再写 data URL。
- 体积与风险：0 B。默认保持 `assets`，新规则 opt-in，避免旧文档路径漂移。

### 3.5 全屏 + Ctrl+滚轮缩放（P1）

- 用户收益：Typora F11 全屏、Ctrl+滚轮改字号（`docs/iteration/typora-features.md:76`）；Sidelight 目前 Ctrl+滚轮无效。
- 现状证据：`grep fullscreen|requestFullscreen src` = 0；`PROBE-F` `17px → 17px`；Ctrl+= 有效（`src/App.tsx:3655-3667`）。
- 实现要点：顶栏加全屏按钮 + `document.documentElement.requestFullscreen()`（Esc 退出）；编辑器容器 `onWheel` 判 `event.ctrlKey` 调 `setFontSize`（`src/App.tsx:1729`），`Ctrl+0` 已有重置；源码/预览两态同步。
- 体积与风险：0 B。坑：WebView2 里 F11 可能被宿主吞（`host/` 已有 `AreBrowserAcceleratorKeysEnabled=false`），键位要走页面层；全屏 API 在宿主里的实际表现未验。

### 3.6 行内 HTML 白名单渲染（P2）

- 用户收益：`<kbd>` 出键盘样式、`<mark>` 出高亮、`<sup>/<sub>` 出上下标。这三样也是「高亮/上下标」缺失的最低成本替代。
- 现状证据：`PROBE-A`——元素 0 个、正文是转义文本；`src/lib/html.ts:1-23` 只做转义/还原。
- 实现要点：在 `src/App.tsx:735` 的扩展表里加白名单 Node（`kbd`/`mark`/`sup`/`sub`/`br`，各 `parseHTML`/`renderHTML`）；`escapeHtmlForParse`（`src/lib/html.ts:21`）只对非白名单标签转义；`repairHtml`（`:7`）保持原样。
- 体积与风险：0 B。**硬风险**：往返保真。必须跑 `npm run roundtrip` + `scripts/fidelity-acceptance.mjs`；`a`/`img`/`table` 不进白名单（与现有节点冲突）。

### 3.7 拖入 `.md` / 文件夹打开（P1）

- 用户收益：从资源管理器拖一篇稿子进来，是最快的打开方式；Typora 支持（`docs/iteration/typora-features.md`，gap 表仍记「无」）。
- 现状证据：`handleDrop`（`src/App.tsx:813-820`）只过滤 `image/*`，拖 `.md` 进去无反应、无提示。
- 实现要点：编辑器外层加 `dragover`（必须 `preventDefault`）与 `drop`，先试 `DataTransferItem.getAsFileSystemHandle()` 取目录/文件句柄，成功就走现有打开逻辑；失败退回读 `File` + 只读横幅。必须先过「切换文档」三选一（脏文档拦截）。
- 体积与风险：0 B。坑：`getAsFileSystemHandle` 在 WebView2 里的支持未验。

### 3.8 大纲折叠补齐（P2）

- 用户收益：50+ 标题的长文要「全部折叠」再逐节展开。
- 现状证据：折叠本身已实现（`src/components/Outline.tsx:17,49-70`；`PROBE-E3` 3→2 项）；缺的是折叠状态持久化与「全部折叠/展开」，且 gap 表仍写「无」。
- 实现要点：`collapsed` 的 `Set` 存 sessionStorage（或跟随现有缓存键），大纲头加两个按钮；`expandAncestors`（`src/lib/outlineTree.ts:29`）已有，复用它保证当前章节可见。
- 体积与风险：0 B。

### 3.9 `docs/typora-gap.md` 全表核对（P1，维护）

- 用户收益：内部文档不再误导计划。现在 18 条「缺」里 8 条已经实现、2 条半对（见第 2 节）。
- 做法：按第 2 节表改成「约 29 有 / 10 缺」；把 Mermaid 从「缺」改成「第 36 轮做」；`README.md` 与 `AGENTS.md` 的「21 项有、18 项缺」同步改。
- 体积与风险：0 B。风险：改数与 README 同时落地，避免又一处过期。

### 不建议做（与 `docs/iteration/typora-features.md` §5.3 一致，本轮复核仍成立）

- 主题体系 / 自定义 CSS 主题（Typora `Docs/Custom Themes.md`）：维护面大，三档明暗已够。
- 全局搜索（Ctrl+Shift+F）：跨文件读句柄是异步瀑布，收益集中在多文件项目；`src/lib/search.ts` 现在是联网核对，改名会混淆。等 3.7 落地后再做。
- 文件列表双形态、Pandoc 导入导出、Electron 架构、MathJax 换 KaTeX：不照搬。

## 4. UNVERIFIED

1. **列对齐往返**：`|:--:|` 保存后能否保留，本轮没跑 `npm run roundtrip`，也没有插入对齐语法的手段。
2. **`getAsFileSystemHandle` 在 WebView2 宿主里的行为**：本机没有重建宿主，只在 Chromium 侧看代码。
3. **宿主里的 Ctrl+Shift+V**：`AreBrowserAcceleratorKeysEnabled=false` 是否连粘贴加速键一起关掉，未验；浏览器侧 `PROBE-H4` 是原生生效。
4. **F11 / 全屏 API 在 WebView2 的表现**：未启动宿主。
5. **mermaid 真装进去后的 `dist` 体积与请求瀑布**：本轮未改 `package.json`、未 `npm install`，`ADR-0017` 的 413,672 B / 1,474,881 B 仍是包外预估。
6. **大纲折叠状态的现有持久化**：只确认内存里有效，没测重开。
