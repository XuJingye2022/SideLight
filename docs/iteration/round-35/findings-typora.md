# 第 35 轮 finder-typora 发现（写作体验与 Typora 对照）

- 角色：finder-typora（只读产品代码，不改 `src/`、`host/`）
- 轮次：round=35；轮前 startSha=`e64c2fce75a372fb6f072ba312e7164b4e710d94`（HEAD `e64c2fc`）
- 日期：2026-11-17
- 环境：dev server `http://localhost:5175`（未重启）；CDP 9223（`node .tmp/reset.mjs 9223` 后连）；1440×900
- Typora 参考：`.tmp/typora-ref`（0.11.18 解包）、`shots/typora/`（71 张）、`docs/iteration/typora-features.md`、`docs/typora-gap.md`
- 实测脚本（本轮新写，只读产品）：`.tmp/e2e-r35-typora-probe.mjs`
- 证据截图：`shots/round-35/typora-doc.png`、`typora-settings.png`、`typora-stats.png`、`typora-window.png`
- 实测样本文档：`体验测试.md`（H1/H2/H3 + 行内 HTML + 2 列表格 + ```` ```mermaid ```` + 相对路径图片 + 末尾段），用 `.tmp/r30-fsa.mjs` 的假 FSA 工作区装载

## 1. 结论

1. **Mermaid 是唯一“写作者刚需 + 完全缺失”的项**，产品负责人已在 `docs/iteration/STATE.md:159` 定调「完整实现、首屏 0 B、体积取最小」。`docs/adr/0017-mermaid-lazy-loading.md` 的结论（“本轮不实现”“破 850,000 B 硬线”）已过期，需改成“接受”并按新预算复算（第 5 节）。
2. **工作区图片全部破图，是当前最伤写作体验的缺陷**：正文里 `![截图](assets/pic.png)` 实测 `naturalWidth=0`，因为宿主只把 `dist` 当静态根、没有取图片字节的路由（`host/Program.cs:297-317`、`:340-357`）。Typora 的等价路径由 Electron 直接读盘，Sidelight 必须补一条受目录约束的资产路由。
3. 行内 HTML（`<kbd>`/`<mark>`/`<u>`）实测仍显示成字面文本；全屏实测没有任何入口；表格实测列宽不可拖、无列宽句柄；这三项与 `docs/typora-gap.md` 一致。
4. **`docs/typora-gap.md` 严重过期**：10 条写成“无”的能力已经实现（智能标点、自动配对、缩进、缩放、大纲折叠、新建/重命名/删除、快速打开、主题三档、粘贴纯文本、最近文件），还有 1 条与同文件“已经有的”表自相矛盾（缩放），且“缺的（18）”标题下实际列了 19 行。第 6 节给逐行对照。
5. **“粘贴为纯文本”不必做**：Chromium 原生 Ctrl+Shift+V 实测已能落纯文本（无 `<strong>`），只需写进快捷键表。这类“看着缺、其实有”的项先做实测，能省一轮。

## 2. 实测结果（9 项，Sidelight 现状）

`page.on('request')` 全程记录；探针数据见脚本输出 `## RESULT {...}`。

| # | 能力 | 实测结果 | 判定 |
| :--- | :--- | :--- | :--- |
| P1 | 行内 HTML 渲染 | `kbd`/`mark`/`u` 元素各 0 个；`innerText` 含字面 `<kbd>Ctrl</kbd>`；`innerHTML` 里是转义的 `&lt;kbd&gt;` | **缺**，与 gap 表一致 |
| P2 | Mermaid | 编辑器内 `svg` 0 个、`pre` 1 个、`code.className='language-mermaid'`、代码文本原样；本次载入全程含 `mermaid` 的请求 **0 条** | **缺**，与 gap 表一致 |
| P3 | 表格列宽拖拽 | 拖表头右边界 +60 px 前后列宽都是 `[288,288]`、表宽 576；无 `.column-resize-handle`；`table.innerHTML` 无 `colwidth` | **缺** |
| P4 | 粘贴：富文本 vs 纯文本 | Ctrl+V 落 `<strong>粗体字</strong>`；Ctrl+Shift+V 落纯文本、无 `strong`（`supported=true`，剪贴板两种 MIME 都写入了） | **已有（浏览器原生）** |
| P5 | 全屏 | `document.fullscreenEnabled=true`（API 可用）但顶栏 11 个按钮无“全屏”；快捷键对话框全文无“全屏/F11”；host 无任何全屏代码 | **缺入口** |
| P6 | 大纲折叠 | 点第一条 `▸/▾` 后大纲项 3 → 1，再点恢复 | **已有**（第 29 轮） |
| P7 | 字数明细 | 面板 8 行：中日韩字 59 / 拉丁词 17 / 合计 76 / 字符 127 / 句 5 / 段 4 / 阅读 1 分钟 / 选区（未选中时给占位文案） | **已有**，无“行”行 |
| P8 | 设置项 | 主题三档（浅色/深色/跟随系统）；无图片落盘规则；无粘贴选项；正文字号 12–26；智能标点开关 | 主题三档**已有**，图片规则**缺** |
| P9 | 相对路径图片 | `src="assets/pic.png"` → `http://localhost:5175/assets/pic.png`，`naturalWidth=0`、`complete=true`、显示宽度 52 px（破图占位） | **缺陷**（见第 3 节 A2） |

截图证据：`typora-doc.png` 一屏同时可见“行内 HTML 字面文本 + 均分列表格 + mermaid 当普通代码块 + 破图占位”；`typora-settings.png` 可见主题三档与“无图片规则”。`typora-stats.png` 可见 8 行字数明细。

## 3. 建议（9 项，按收益/成本排序）

体积口径：当前首屏 gzip **285,937 B**（`node scripts/measure-first-screen.mjs` → `total raw=930008 gzip=285937 headroom=63`，仍按旧 286,000 算）；新预算内部 310,000 / 硬线 320,000（`STATE.md:159`），即页面代码还有 **约 24 KB gzip** 余量。下面第 2–9 项页面增量合计约 8 KB gzip，装得下。

### A1（P0）Mermaid 惰性渲染

- **用户收益**：技术写作里流程图/时序图是刚需。Typora 内置（`Docs/Draw Diagrams With Markdown.md:42-126`，`shots/typora/02-window-maximized.png`）；Sidelight 现在只能看源码。
- **现状证据**：P2 实测 `svg=0`、`language-mermaid`、0 条 mermaid 请求；`package.json` 依赖里无 mermaid；`docs/adr/0017-mermaid-lazy-loading.md:11-17` 结论“本轮不实现”已被产品负责人推翻（`STATE.md:159`）。
- **实现要点**：
  1. `src/lib/mermaidLazy.ts`：照 `src/lib/katexLazy.ts` 的写法（状态 + 订阅 + `await import('mermaid')` 单例），首屏不 import。
  2. `src/lib/mermaidRender.ts`：只暴露 `render(id, code)`，内部 `initialize({ startOnLoad: false, securityLevel: 'strict', theme: document.documentElement.dataset.theme })`；返回 SVG 字符串。
  3. 渲染挂点：`src/App.tsx:746` 一带的扩展列表里加一个只对 `codeBlock` 且 `language==='mermaid'` 生效的 NodeView（或 decoration 覆盖层，取改动小的那个：NodeView 才能把 SVG 放进块内且不碰序列化）。
  4. 降级：未知语法 `catch` 后原样显示代码块 + 一句“图形语法有误，已按源码显示”，不抛错、不吞内容。
  5. 源码模式不渲染；预览与导出 HTML 复用 `src/App.tsx:3878` 的 `await ensureKatex()` 同类写法，把 SVG 内联进 `buildHtmlDocument`。
  6. 主题切换要重渲染（复用 `src/App.tsx:680-683` 的 `data-theme` 变化点）。
- **体积与风险**：首屏 **0 B**（动态 import）；安装包按 ADR-0017 档 1b 实测预估 **824,595 + 1,976,553×0.329 ≈ 1,474,881 B**，新内部预算 1,800,000 B、硬线 2,000,000 B，余量约 325 KB（真实值必须装完后重打 Windows 包实测，替换 ADR 预估）。打开含图文档要多下 ≥402,939 B gzip（ADR-0017:51）。风险：编辑器滚动重排性能、43–73 个请求瀑布、未知语法渲染失败路径，三项都要真机测。
- **门禁**：`npm run build`、`npm run verify`（首屏必须仍 ≤ 现预算）、`npm test`（新增 mermaid 降级单测）、`npm run roundtrip`（fence 源码必须逐字节保留）。

### A2（P0/P1）工作区相对路径图片显示

- **用户收益**：打开任何带图的笔记，现在满屏破图；插入图片后立刻也是破图，等于图片功能不可用。
- **现状证据**：P9 `srcAttr=assets/pic.png`、`abs=http://localhost:5175/assets/pic.png`、`naturalWidth=0`；`src/lib/asset.ts:42-52` 只负责写 `assets/`；`host/Program.cs:297-317` 只有 `/__doc`、`/__draft`、`/__recent`、`/__annotations` 四条特殊路由，其余走 `wwwRoot`（`host/Program.cs:340-357`），没有取文档同级图片的通路；`src/App.tsx` 里搜不到 `__asset`/`objectURL` 之类的解析代码。
- **实现要点**：
  1. host 新增 `GET /__asset?p=<相对路径>`：以当前文档目录为根（复用 `host/Program.cs:350-357` 的 `GetFullPath` + 前缀校验 + 拒绝 `..`/盘符/UNC 的同一套），只允许图片扩展名，返回 `image/*` 字节，禁缓存或短缓存；同时在 `docs/adr/` 补一条 ADR（新增对外可见的路由面）。
  2. 页面侧统一 `resolveAssetSrc(src)`：绝对 URL / data: 原样；相对路径在宿主里改成 `/__asset?p=`，浏览器里用工作区句柄 `getFile` + `URL.createObjectURL`（用完 revoke）；解析不到时保留原 `src` 并给一次提示，不改正文。
  3. 预览与导出走同一函数（`src/components/PreviewPane.tsx`、`src/lib/export.ts`），导出 HTML 时把相对路径改绝对或内联 data URL，否则导出的 HTML 也是破图。
- **体积与风险**：页面约 1–2 KB gzip；host 约 +4 KB C#（安装包增量可忽略）。风险：目录穿越必须复用现有拒绝表、中文路径、网络盘/OneDrive 占位文件（`AGENTS.md` 未验清单已有同类项）。

### A3（P1）图片落盘规则（相对路径 / `assets/` / `${filename}.assets`）

- **用户收益**：静态站作者（Jekyll/Hugo）需要 `_media/`、`${filename}.assets` 这类固定落点；现在写死 `assets/`，用户只能事后手工搬文件。
- **现状证据**：`src/lib/asset.ts:42-52` 写死 `dir/assets/`；`src/App.tsx:3918-3945` 无设置项，无工作区时退化成 base64 并提示；P8 实测设置里搜不到“图片”。
- **Typora 参照（0.11.18 实测范围）**：`Docs/Use Images in Typora.md:48-70` 有“Use relative path if possible”与“Copy image file to folder”，落点写进 frontmatter 键 `typora-copy-images-to`（`frame.js` 里该字符串出现 2 次，`resources/apps/window/frame.js`）。`${filename}.assets` 在 0.11.18 的 `frame.js` 里出现 **0 次**，属新版行为，本轮不当作既有对照（见第 7 节 UNVERIFIED）。
- **实现要点**：`settings.ts` 加 `imageDir: 'assets' | 'same-folder' | 'doc-name-assets'`（默认 `assets`，保持现行为）；`writeAsset(dir, fileName, blob, rule, docName)` 按规则算目录与相对路径；读文档时若 frontmatter 有 `typora-copy-images-to`，优先用它（只读不写回，避免改用户文件）；设置面板加一行说明“只影响之后插入的图片，不改已有正文”。
- **体积与风险**：约 1.5 KB gzip。风险：相对路径必须 POSIX 分隔符、`../` 不出工作区；frontmatter 键解析要复用 `frontmatter.ts`，不要新写解析器。

### A4（P1）行内 HTML 渲染（白名单，不改序列化）

- **用户收益**：`<kbd>`、`<mark>`、`<u>`、`<sup>`、`<sub>`、`<br>` 是中文技术写作常用；Typora 直接渲染（`Docs/Markdown Reference.md:344`“Underline is powered by raw HTML”、`:374-376` HTML 支持说明）。现在这些标签在正文里是肉眼噪音。
- **现状证据**：P1 实测 `kbd/mark/u` 元素 0 个、字面文本可见；`src/lib/html.ts:1-23` 只做转义/还原；`src/lib/html.test.ts` 只测字节保真。
- **实现要点（关键：不改序列化，零数据风险）**：写一个 ProseMirror decoration 插件（放 `src/lib/inlineHtml.ts`）：遍历文本节点，用正则匹配白名单标签对，给“开标签/闭标签”自身加 `display:none` 的 inline decoration，给中间内容套 `inline-html-{tag}` 类；样式在 `src/styles.css` 里按白名单给视觉效果（kbd 边框、mark 底色、u 下划线、sup/sub 字号）。渲染只发生在装饰层，文档内容、`getMarkdown()`、保存前差异门全部不受影响。未知标签不动（保持现字面文本）。
- **体积与风险**：约 2–3 KB gzip，无新依赖。风险：跨 mark 的标签（`<kbd>**粗**</kbd>`）要能跨节点匹配，否则漏渲染；HTML 导出要不要跟着渲染要单独定（本轮建议先不动导出，保字节）。

### A5（P1）全屏

- **用户收益**：长文写作要满屏。Typora 有 F11 与 `body.typora-fullscreen`（`frame.js` 里 `typora-fullscreen` 出现 2 次）；Sidelight 现在要按浏览器 F11，宿主里还按不出来。
- **现状证据**：P5 `document.fullscreenEnabled=true`、顶栏 11 个按钮无全屏、快捷键对话框无 F11/全屏；`host/Program.cs:1491` `core.Settings.AreBrowserAcceleratorKeysEnabled = false`（浏览器加速键已关，F11 到不了页面）；`host-mac/*.swift` 搜 `fullScreen` 0 处。
- **实现要点**：页面加 `document.documentElement.requestFullscreen()` + `fullscreenchange` 同步按钮态，键位绑 **F11**（宿主已关浏览器加速键，页面自己收）；顶栏“视图”区加一个与专注/打字机同排的按钮；macOS WKWebView 的 Fullscreen API 行为未验，先在宿主里补一个 `toggleFullscreen` 菜单项兜底。
- **体积与风险**：约 0.5 KB gzip。风险：WebView2 里 `requestFullscreen` 会顶掉窗口边框，退出要可靠（Esc 与按钮都要能退）；宿主 `AreBrowserAcceleratorKeysEnabled=false` 下 F11 是否被页面收到需真宿主跑一次。

### A6（P1）拖入 `.md` 文件打开

- **用户收益**：Typora 的常见用法是把笔记拖进窗口；Sidelight 拖 `.md` 进去毫无反应（连提示都没有）。
- **现状证据**：`src/App.tsx:812-826` 的 `handleDrop`/`handlePaste` 只过滤 `image/*`，其余 `return false`；P0 探针里拖入 `.md` 不会换文档。gap 表 `docs/typora-gap.md:60` 也记为缺（这一条是准确的）。
- **实现要点**：`handleDrop` 增加 `.md/.markdown/.txt` 分支：`file.text()` 读入 → 走现有“外来文档”路径（无句柄，保存走另存为）→ 若当前 dirty，走 `src/App.tsx:5046` 附近的“切换文档”三选一，不能静默覆盖；文件夹拖入先只做提示或直接调 `showDirectoryPicker` 让用户选（WebView2/FSA 都不能从 drop 拿目录句柄，别承诺）。
- **体积与风险**：约 1 KB gzip。风险：宿主 WebView2 的 `AllowExternalDrop` 默认值未在本轮验证（页面在浏览器里已验证 `dataTransfer.files` 可读），真宿主拖放要单独回归。

### A7（P1/P2）表格列宽拖拽

- **用户收益**：技术写作表格列宽均分很难看（P3 实测 288/288），长表格读不了。Typora 0.11.18 的表格尺寸是表头工具条的弹出网格（`frame.js` 里 `.md-resize-table` 出现 8 次），**列宽拖拽未在该版本核实**；列宽拖拽本身是通用富文本编辑器的预期，建议做，但不要写成“Typora 已有”。
- **现状证据**：P3 拖拽前后列宽相同、无 `.column-resize-handle`、无 `colwidth`；`src/App.tsx:125-135` 的 `ReusableTable = Table.extend({...})` 未 `configure({ resizable: true })`。
- **实现要点**：`ReusableTable.configure({ resizable: true })`（`@tiptap/extension-table` 的 `TableOptions.resizable` 已存在，`node_modules/@tiptap/extension-table/dist/index.d.ts:67-109`），补 `.column-resize-handle` 与 `.resize-cursor` 的 CSS；**必须**在 markdown 序列化层剥掉 `colwidth`（GFM 表格没有列宽语法），否则保存前差异门会把每张表判成“格式损失”，把用户吓住。
- **体积与风险**：约 0.3 KB gzip + 复用现有依赖（无新依赖）。风险：`colwidth` 泄漏进 Markdown 是本项唯一 P0 级风险，实施时先跑 `npm run roundtrip` 与“保存前对比”用例，再谈拖拽。

### A8（P2）排版偏好：行宽 / 行距 / 字体

- **用户收益**：中文长文对行宽敏感（Typora 用户大量用自定义 CSS 调这个）。现状只能调字号（12–26 px）。
- **现状证据**：`src/lib/settings.ts:6-25` 只有 `fontSize`/`theme`；`SettingsDialog.tsx:43-50` 主题三档；无行宽/行距/字体项。
- **实现要点**：`styles.css` 已有 `--editor-size` 变量用法（`src/App.tsx:1725`），再加 `--editor-width`、`--editor-line-height`、`--editor-font`；设置里给 3 个档位选择（窄/标准/宽、紧凑/标准/宽松、系统/宋/黑），存 localStorage；不引入字体文件（用系统字体栈），避免体积。
- **体积与风险**：约 1 KB gzip。风险：`--editor-size` 的现有用户值要能平滑共存；不要做成自由数值输入，档位更省体积也更稳。

### A9（P2）大纲折叠增强：全部折叠/展开 + 折叠状态持久化

- **用户收益**：长文里逐条点折叠太慢；现在折叠集合只在内存（`src/components/Outline.tsx:13` 注释明说“会话内有效，不持久化”），切文档/重开就全展开。
- **现状证据**：P6 折叠本身可用（3→1）；`Outline.tsx:15-89` 无“全部折叠/展开”入口；`docs/typora-gap.md:52` 还写着“大纲折叠 无”（已过期）。
- **实现要点**：标题行加两个小按钮（全部折叠/全部展开，只对小屏幕允许收进 `⋯`）；折叠集合按文档键存 localStorage（新增独立键，沿用 `settings.ts:27` 的 `sidelight.*.v1` 命名；这是纯视图状态，不写 `.sidelight/`）；大纲重算（重新抽标题）时清理失效 id。
- **体积与风险**：约 0.5 KB gzip。风险：几乎无；注意不要持久化成“打开就看不到当前节”，保留现有 `expandAncestors` 行为（`Outline.tsx:19-22`）。

## 4. 建议不做 / 已具备（避免重复排期）

| 方向 | 结论 | 证据 |
| :--- | :--- | :--- |
| 智能标点、自动配对 | **已做，不要重做** | `src/lib/smartTyping.ts:33-67`；设置开关 `settings.ts:24` |
| 列表缩进 / 反缩进 | **已做** | 快捷键表“列表内 Tab / Shift+Tab 缩进 / 反缩进”（P5 实测对话框文本） |
| 粘贴为纯文本 | **Chromium 原生已可用** | P4 实测 Ctrl+Shift+V 无 `<strong>`；只需补进快捷键表 |
| 字号缩放 | **已做** | `settings.ts:29-30`、`App.tsx:1725`、Ctrl+=/-/0 |
| 字数明细（字符/词/句/段/阅读/选区） | **已做**，只差“行”一行（价值低） | P7；`StatsDetail.tsx:81-89` |
| 主题自定义 CSS / 主题商店 | **不做**：维护面大、与轻量冲突；改用 A8 的排版三档 | `docs/iteration/typora-features.md:121` |
| 文件列表形态侧栏 | P2，本轮不做 | gap 表 L53 准确；`docs/iteration/typora-features.md:125` |
| 全局搜索 | P2，本轮不做 | STATE 未排期 |
| Pandoc 导出链 / MathJax | **不做** | `typora-features.md:119-120` |

## 5. ADR-0017 与预算需要同步改

`docs/adr/0017-mermaid-lazy-loading.md` 的“决定”“状态”两节写在产品负责人改预算之前，现在与 `STATE.md:159` 冲突：

- 旧：安装包内部 820,000 / 硬线 850,000；Mermaid 档 1b 预估 1,474,881 B“破硬线 624,881 B”→ 结论“不实现”。
- 新（产品负责人 2026-11-17）：内部 1,800,000 / 硬线 2,000,000；首屏内部 310,000 / 硬线 320,000。
- 按新预算，档 1b 预估 1,474,881 B **在内部预算内**（余 325,119 B），档 2（2,355,122 B）才破硬线。结论应改为“接受：先按 Vite 真实 chunk 图实现，装完后重打包实测，若真实增量落进档 2 区间再回到产品负责人”。
- 同时更新：`AGENTS.md` 的体积数字与“下一步”、`README.md` 的“对 Typora 的差距 21 项有、18 项缺”（见第 6 节）、`docs/typora-gap.md` 全表。

## 6. `docs/typora-gap.md` 过期核对（逐行）

文件自称“已经有的（21）”（L7）与“缺的（18）”（L33，但表里实际 19 行）。逐行核对后：**应改为“已有 31”“缺 12”**（把下面 10 条从缺移到有；另新增图片落盘规则、表格列宽拖拽、排版偏好三条）。

| gap 表行 | 原文 | 实际 | 代码证据 |
| :--- | :--- | :--- | :--- |
| L40 | 自动配对括号与引号 无 | **已做** | `src/lib/smartTyping.ts:39-54`（配对 `()[]{}`、引号开闭、`skip` 越过） |
| L41 | 智能标点 无 | **已做** | `smartTyping.ts:56-64`（`--`→—、`...`→…、中文后半角标点→全角）；第 33 轮交付 |
| L42 | 缩进与反缩进 无 | **已做** | `src/App.tsx:784-801`（列表内 Tab 缩进 / Shift+Tab 反缩进）+ 快捷键表“列表内 Tab / Shift+Tab” |
| L43 | 粘贴为纯文本 无 | **原生已可用**（应用无自己的实现） | P4 实测 |
| L50 | 缩放 无 | **已做**，而且与 L25「字号与缩放 有」自相矛盾 | `settings.ts:29-30`、`App.tsx:1725`、Ctrl+=/-/0 |
| L52 | 大纲折叠 无 | **已做** | `src/components/Outline.tsx:52-69`；P6 实测 3→1 |
| L59 | 新建、重命名、删除文件 无 | **已做** | 第 12/13/28 轮；`FileTree.tsx:394`“新建文件”、`TreeActions.tsx`、`rename.ts` |
| L61 | 快速打开（Ctrl+P 模糊搜索） 无 | **已做** | `src/components/QuickOpen.tsx:11-62`；快捷键表 Ctrl+P |
| L62 | 最近文件 有（8 条，可清除，仅桌面版） | **这一行自己写着“有”，却排在“缺的”表里** | `host/Program.cs:307`、`recent.json` |
| L81 | 主题 只有跟随系统的明暗 | **三档**：浅色/深色/跟随系统 | `settings.ts:4,13`；`SettingsDialog.tsx:43-50`；P8 截图 |
| L84-93 | 建议的下一批：行内 HTML、主题、全局搜索、最近文件 | 最近文件已完成（L62 自己写着“有”） | `host/Program.cs:307`、`recent.json` |

仍然准确的“缺”：行内 HTML 渲染（L39）、高亮/上下标/TOC/emoji（L44）、全屏（L51）、文件列表形态（L53）、拖入文件或文件夹打开（L60）、图片缩放（L68）、Mermaid（L69）、全局搜索（L75）、自定义快捷键（L82），再加本报告新增的三条：图片落盘规则、表格列宽拖拽、排版偏好。

另：`docs/typora-features.md:43-53` 的“Sidelight 现状”列也过期（写着“不能切列表形态，不能折叠大纲”“已有字数与阅读时间”“表格无键盘走格/加行”），与本报告第 2 节实测不一致，与 gap 表一起改。

## 7. UNVERIFIED

1. **`${filename}.assets` 落盘规则不是 Typora 0.11.18 的行为**：该字符串在 `.tmp/typora-ref/resources/appsrc/window/frame.js` 里出现 0 次（`node .tmp/probe-frame.mjs`），只有 `typora-copy-images-to`（2 次）。属新版 Typora，未核实。
2. **Typora 0.11.18 是否有列宽拖拽**：`frame.js` 只有 `.md-resize-table` 弹出网格，无 `colwidth`/`column-resize`（各 0 次）。A7 的理由按“通用富文本预期”写，不按“Typora 已有”写。
3. **宿主里的图片显示**：本轮图片实测在浏览器 dev 页面完成（`naturalWidth=0`）；宿主里同样破图是按 `host/Program.cs:297-357` 的静态根推断，未在真宿主窗口里跑一遍。
4. **宿主里的 F11 与拖放**：`AreBrowserAcceleratorKeysEnabled=false` 下页面能否收到 F11、WebView2 `AllowExternalDrop` 默认值，均未在真宿主验证。
5. **Mermaid 真实包体积**：只用 ADR-0017 的 npm 包实测数（`.tmp/measure-mermaid.mjs`，`mermaid-pkg` 本轮已不在 `.tmp`），没有真实装进 `dist` 重打包；实施轮必须用真安装包字节替换预估。
6. **macOS**：WKWebView 的 Fullscreen API、⌘ 系按键、图片对象 URL，均未在真机跑（本机 Windows）。
7. **Mermaid 渲染在 WebView2 里的性能**（43–73 个请求、编辑器滚动重排）未测。

## 8. 给 planner 的最短路径

本轮预算下先做 **A2 + A4 + A5**（页面 ~4 KB gzip，零新依赖，风险低，都直接改善“打开一篇真实带图带格式的笔记”的体验），Mermaid（A1）单独一轮并把 ADR 改“接受”；A3/A6/A7/A8/A9 排到下一批。若本轮必须只做一件体积大且对外可见的事，就是 A1，且必须先改 ADR-0017 结论与 `STATE.md` 预算表述，再动手。
