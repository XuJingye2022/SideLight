# 第 45 轮 Typora 对照与写作体验（finder-typora）

- 轮次参数：`round=45`、`nn=45`；轮前 startSha `021cbd35d0a0422e519b5c008a3d47fca1bdccbb`（`git rev-parse HEAD` 实测一致，工作树干净）
- 环境：dev server `http://localhost:5175`（未另起、未重启）、CDP `9223`、每次 E2E 前 `node .tmp/reset.mjs 9223`；未启动 Edge、未 kill `msedge`、未 `browser.close()`、未 push、未碰 `release/`
- 只读：未改产品代码、未 commit
- 本轮真跑 7 条路径、约 20 组读数（全部在真应用里，见 §1）：正文栏宽（1440/1920 两档）、预览里的文档内锚点、大纲点击后的焦点与可输入性、Mermaid 渲染后切主题、表格最后一格按 Tab、正文 Shift+Enter、点图片
- 脚本（只读）：`.tmp/e2e-r45-typora-a.mjs`（§1 的 P1/P2，输出在终端）、`.tmp/e2e-r45-typora-b.mjs`（P3–P7，输出写 `.tmp/r45-typora-b.log`，末尾 `DONE`）
- 截图：`shots/round-45/typora-*.png`（9 张，见 §10）
- 控制台：产品代码无新增报错；只有第 42/44 轮已判为环境噪声的无栈 `Cannot read properties of undefined (reading 'id'/'url')` 与翻译扩展 `chrome-extension://…OfscreenTranslate` 噪声（本轮同样出现，未计入发现）

## 0. 结论先行（7 条，全部本轮实测或本轮读码核对）

| # | 发现 | 级别 | 用户收益 | 改动面 |
| :--- | :--- | :--- | :--- | :--- |
| 1 | 正文栏宽写死 `36rem`=576 px，窗口从 1440 到 1920 都不变；每行约 33 字，右侧留 386–1,126 px 空白 | P2 | 大屏写作行太短、屏幕大半空着；Typora 是 860/1024/1200 三档随窗口放宽 | `src/styles.css:262-268` 三档 CSS 变量 + 设置项，约 40 行 |
| 2 | 文档内锚点跳转完全不可用：预览标题没有 id（`(no id)`），点 `#chapter-b` 后 `scrollTop` 仍是 0、URL hash 不变；导出 HTML 也没有 id | P1 | 长文目录、`[toc]`、交叉引用全都要 id 才能工作，Typora 有 | `PreviewPane` + `export.ts` 渲染后补 id，约 60–90 行 |
| 3 | Mermaid 图不跟主题：颜色只在首次初始化读一次；切深色后图仍是浅色，同会话里新插入的图也是浅色；`跟随系统` 永远按浅色初始化 | P2 | 深色写作时图与纸面不一致；`system`+深色系统用户 100% 命中 | `mermaidLazy.ts:51-65` + 缓存按主题分键 + 订阅主题，约 60 行 |
| 4 | 图片没有 alt / title 的编辑入口：点图只把焦点给正文，不弹任何面板 | P2 | 图片说明是存档与无障碍必需；Typora 双击图片可改说明/尺寸 | 复用 `InlinePopover` 做选中图片浮层，约 80–120 行 |
| 5 | 没有目录句柄时（首启空白文档、单文件打开），相对路径图是 404 破图，不给「图片未找到」占位 | P2 | 与第 39 轮的占位机制不一致，用户看得到破图但拿不到原因 | `assetImage.ts` 解析返 null 时也走占位，约 20 行 |
| 6 | `docs/typora-gap.md` 与 `docs/iteration/typora-features.md` 仍有 3 处过期/不完整 | P2（文档） | planner 照旧文档排任务，会重复排已做的事或漏掉新缺口 | 两份 Markdown，几分钟 |
| 7 | 复核仍未修：字数明细没有「行」、源码模式没有选区字数（第 44 轮 F6） | P2 | planner 若按「已做」处理会漏掉这条 | `StatsDetail.tsx:82-90` 一行 + `App.tsx:5128` 一处 |

## 1. 跑过的路径与原始读数

命令：`node .tmp/e2e-r45-typora-a.mjs 9223`、`node .tmp/e2e-r45-typora-b.mjs 9223`。两个脚本都先 `localStorage.clear()` + reload；种文档走「源码模式写 Markdown → `Ctrl+/` 回富文本」，是应用自己的解析链。

| 路径 | 关键读数 | 判定 |
| :--- | :--- | :--- |
| 正文栏宽 @1440 | `columnWidth:576`、`paragraphWidth:576`、`scrollWidth:1222`、`sidebarWidth:218`、`railWidth:260`、`fontSize:17px`、`lineHeight:33.15px`、段 5 行、每行约 **33 字**、`bodyChars:146` | **写死**（F1） |
| 正文栏宽 @1920 | 同上 `columnWidth:576`、`paragraphWidth:576`，`scrollWidth:1702` | **不随窗口放宽**（F1） |
| 预览里的锚点 | `viewMode:"preview"`、`headingIds:["(no id)","(no id)"]`、`anchorHrefs:["#chapter-b"]`；点 (608,213) 后 `scrollTop:0`、`hash:""`、`url:"http://localhost:5175/"` | **点了不跳**（F2） |
| 大纲点击 | 点最后一项后 `activeElement` 是 `DIV .tiptap.ProseMirror…ProseMirror-focused`、`insideEditor:true`；直接打字 `Z` 落入正文（`tail:"…Alpha body.\n\nZChapter B…"`） | 正常（负结果） |
| Mermaid 浅色初渲 | `dataTheme:"system"`、`shapeFills:["rgb(236, 236, 255)"×3]`、`labelColors:["rgb(51, 51, 51)"×2]`、`svgLen:8311`、`boxBg:"rgb(255, 253, 248)"` | 基准 |
| 设置里点「深色」 | `dataTheme:"dark"`、`boxBg` 变 `rgb(28, 31, 35)`，但 `shapeFills` / `labelColors` **一字不变**、`svgLen` 仍是 8311 | **图不重渲**（F3） |
| 保存深色后再种一篇新图 | `dataTheme:"dark"`、新图 `shapeFills` 仍是 `rgb(236, 236, 255)`、`svgLen:8283` | **同会话新图也浅色**（F3） |
| 切回浅色 | `dataTheme:"light"`、`shapeFills` 仍 `rgb(236, 236, 255)` | 缓存不失效（F3） |
| 表格最后一格按 Tab | 行 2 → 3、单元格 4 → 6、`activeTag:"DIV"`（ProseMirror 容器，正常） | 会自动加行（负结果，与 Typora 一致） |
| 正文 Shift+Enter | 段 1 个、`br` 1 个、`innerHTML:"AB<br>C"`；源码模式是 `"# Soft break\n\nAB  \nC"`（两个尾空格 = 硬换行） | 语义正确（负结果） |
| 点图片 | `imgFound:true`、`missingFound:false`、`src:"assets/nope.png"`、`alt:"替代文本"`；点后 `activeElement` 是编辑器、`editingUi:[]` | **无编辑入口**（F4）；无句柄时不占位（F5） |

## 2. P2 正文栏宽写死 576 px，1920 宽屏上仍是 576

**用户收益**：写作软件的主界面就是正文。本轮实测：窗口 1440 时正文占 `1222` 的滚动区里只有 576 px，窗口拉到 1920 时滚动区涨到 1702 px，正文**仍是 576 px**——右侧多出 1,126 px 空白（截图 `typora-width-1920.png` 能直接看出来）。每行约 33 个汉字、行高 33.15 px。对照 Typora 内置主题：`#write` 默认 `max-width: 860px`，≥1400 px 视口放宽到 1024、≥1800 px 放宽到 1200（`.tmp/typora-ref/resources/style/themes/github.css:52-68`；`night.css:48` 是 914）。

**现状证据**：
- E2E（脚本 A 的 `P1_1440` / `P1_1920`）：`columnWidth` 两档都是 `576`，`paragraphWidth` 都是 `576`；`fontSize:17px`、`lineHeight:33.15px`、`lineChars:33`。
- 代码：`.doc-layout { grid-template-columns: minmax(0, 36rem) 260px; }`（`src/styles.css:262-268`），预览布局同一写法（`src/styles.css:2384`）；没有任何随视口变化的断点，也没有用户可调项（`docs/typora-gap.md:56` 把「视图缩放」列为缺，但没记这条实数）。
- 字号可以调（设置里 12–26），但字号变大时栏宽不变，行内字数会继续减少。

**实现要点**：
- 最小档（零 JS）：`src/styles.css:262` 的 `36rem` 换成一个 CSS 变量，按视口三档放宽（`@media (min-width:1400px){--doc-width:44rem}`、`@media (min-width:1800px){--doc-width:52rem}`），与 Typora 的 860/1024/1200 同一个思路，但用 `rem` 以跟随字号。预览布局（`:2384`）读同一个变量。
- 第二档：设置里加「正文宽度：标准 / 宽 / 更宽」，存 `settings`（`src/lib/settings.ts` 已有 `fontSize` 同款流程），把变量写到 `<html>` 上。
- 顺带覆盖 `docs/typora-gap.md:56` 的「视图缩放」：`Ctrl+滚轮` 只改这个宽度变量，不改整页缩放（整页缩放会把侧栏与工具栏一起缩，体验更差）。

**体积与风险**：CSS 约 150 B gzip + 设置项约 300 B。风险：窄窗（<1024）必须回落到 100%，否则出现横向溢出；`doc-layout` 里 260 px 的批注栏不能被挤掉（第 24 轮为窄窗做过自动开批注，要复测）。回归：`Ctrl+=` / `Ctrl+-` 字号缩放与 `Ctrl+Alt+0` 复位不受影响。

## 3. P1 文档内锚点跳转不可用（预览没有标题 id，导出也没有）

**用户收益**：中文写作里写长文必带目录（Typora 支持 `[toc]` 与标题锚点）。现在写 `[跳到第二章](#chapter-b)`：编辑视图点它只弹链接编辑框（`src/App.tsx:874-882` 的 `handleClick` 对任何 `a` 都 `preventDefault()` 后开编辑浮层）；切预览点它什么都不发生。

**现状证据**：
- E2E（脚本 A 的 `P2_preview_before` / `P2_preview_after_click`）：预览里 h1/h2 的 `id` 都是 `(no id)`；链接 `href="#chapter-b"` 存在；在链接中心 (608,213) 真点一下后 `scrollTop:0`、`hash:""`、`url` 仍是原地址。
- 代码：预览是 `dangerouslySetInnerHTML` 直接塞 marked 出的 HTML（`src/components/PreviewPane.tsx:82`），没有任何给标题加 id 的步骤；导出侧 `src/lib/export.ts` 全文没有 `id=` / `slug` / `heading` 相关代码（`Select-String` 0 命中），所以导出文件里的锚点同样断。
- 对照：`docs/typora-gap.md:50` 把「高亮、上下标、TOC、emoji」列为 P2 缺；`[toc]` 的整行还原在第 40 轮余量项里顺延（`STATE.md:63`）。这三点是同一根因：**渲染后没有给标题发 id**。

**实现要点**：
- 新增 `src/lib/headingIds.ts`：把 marked 渲染后的每个 `h1–h6` 文本转 slug（小写、空格换 `-`、保留中文、去掉标点），同名加 `-2`、`-3`；返回 `Map<text, id>`。纯函数，可 Node 单测（中文、重名、纯标点标题）。
- 预览：`PreviewPane` 在 `html` 生成后用 `DOMParser` 注入 id（`marked` 的 `renderer.heading` 也能做，但 `PreviewPane` 不止一处吃 marked，统一在注入层做更稳）。
- 导出：`buildHtmlDocument`（`src/lib/export.ts`）先把正文 HTML 过一遍同一个 slug 函数再输出；锚点链接的 `href` 用 `encodeURIComponent` 对齐（中文标题会变成 `%E7%AC%AC…`）。
- 预览里的锚点点击：`onClick` 拦截 `a[href^="#"]`，`event.preventDefault()` 后 `pane.querySelector('[id="…"]').scrollIntoView({ block: 'start' })`。
- `[toc]` 扩展可在此基础上后续做：找 `[toc]` 整行，按 headingIds 生成列表。

**体积与风险**：约 400–700 B gzip + 3–5 条单测（slug、重名、中文、预览点击滚动）。风险：① 标题文字里带行内标记（`**粗**`）时要点 `.textContent` 取纯文本；② 导出文件必须自包含（只用 `scrollIntoView` 的内联 `<script>` 可以，或干脆只留 id 让浏览器原生锚点工作——**导出的 HTML 用原生 `<a href="#id">` 即可跳，不需要脚本**；预览才需要拦截）。

## 4. P2 Mermaid 图不跟主题，且 `跟随系统` 永远按浅色初始化

**用户收益**：深色主题下写技术文档，图会一直保持浅色（浅色节点 + 浅纸底），而且**同一次会话里新插入的图也一样**——不是「旧图没刷新」，是整套颜色被锁死。第 42/43 轮报过「Mermaid 不跟主题切换」，本轮补上量化读数与更深的根因。

**现状证据**：
- E2E（`P4_mermaid_light` → `P4_mermaid_dark_after_switch`）：浅色初渲 `shapeFills` 三项都是 `rgb(236, 236, 255)`、`labelColors` 两项 `rgb(51, 51, 51)`、`svgLen:8311`；在设置面板点「深色」（`data-theme` 变 `dark`、`boxBg` 从 `rgb(255, 253, 248)` 变 `rgb(28, 31, 35)`）之后，`shapeFills` / `labelColors` / `svgLen` **一模一样**。
- E2E（`P4_mermaid_fresh_in_dark`）：深色下重新种一篇 `graph LR` 的新图，`shapeFills` 仍是 `rgb(236, 236, 255)`、`svgLen:8283`——新图也没换主题。
- 代码：`themeName()` 只认 `document.documentElement.getAttribute('data-theme') === 'dark'`（`src/lib/mermaidLazy.ts:51-55`），`data-theme` 是 `system` 时一律返回 `default`；`:57-65` 的 `configure()` 用 `initialized` 守卫只跑一次；`svgCache`（`:31`）与 `mermaidPreview.ts:16-21` 的两份缓存都只按代码 hash 分键，没有主题维度。所以：① 切主题后不重渲；② 同会话新图沿用第一次初始化的主题；③ `system` + 深色系统永远浅色图。
- 截图：`typora-mermaid-light.png`（浅色纸）、`typora-mermaid-dark-stale.png`（深色纸 + 同一个浅色图）、`typora-mermaid-dark-fresh.png`（深色下新建的图仍浅色）。

**实现要点**：
- `themeName()` 改成：`data-theme === 'dark'` → `dark`；`'light'` → `default`；`'system'` → `matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'default'`。
- `configure()` 去掉一次性守卫的副作用：把已配置的主题记下来，主题变化时重新 `initialize({ theme })` 并清空 `svgCache` / `errorCache`（`mermaidLazy.ts:31`、`mermaidPreview.ts:16-17`、`mermaidLazy.ts:100` 的 `svgCache` 也要清），然后 `domCache` 里已挂的 widget 重新 `scheduleRender`。
- 订阅：`App.tsx:717-720` 那个设置 effect 里 `data-theme` 变化时调一个 `onThemeChange()`；或者 `mermaidPreview` 里 `MutationObserver` 看 `data-theme` 属性（更内聚，不碰 App）。
- 缓存按 `${theme}:${hash}` 分键，避免浅深两份互相覆盖。

**体积与风险**：约 300–500 B gzip + 2 条单测（`themeName` 三态、主题切换后缓存清空）。风险：① 重渲是 async，切主题瞬间会闪一下「图表渲染中…」，可以让旧 SVG 留着直到底图换掉；② 深色图在 `securityLevel:'strict'` 下同一份代码渲两次的 SVG id 会变（第 37 轮记的 b 项），重渲时注意不要叠加两个 `<svg>`；③ 别在 `initialize` 失败时抛错（已有 `lastError` 兜底）。

## 5. P2 图片没有 alt / title 的编辑入口，点了只把焦点给正文

**用户收益**：中文作者的图多带说明（图 1、示意图），存档和发布都靠 `alt`/`title`。现在图片在编辑视图里只能被整体选中，没有任何地方能改 `alt` 或 `title`，也不能给图片加说明——Typora 双击图片有「图片说明/尺寸」入口。`docs/typora-gap.md:70` 只把「图片缩放」列为 P2 缺，没记这条。

**现状证据**：
- E2E（`P7_image_click`）：载入 `![替代文本](assets/nope.png)` 后 `imgFound:true`、`alt:"替代文本"`、`src:"assets/nope.png"`；在图片中心真点一下后 `activeElement` 还是 `.ProseMirror`、`editingUi:[]`（没有 `.link-editor` / `.inline-popover` / `.dialog`）。截图 `typora-image-click.png`。
- 代码：图片是 `ResolvingImage` NodeView（`src/lib/assetImage.ts`，第 38 轮），只负责把 `src` 换成 blob URL；`App.tsx:861-873` 只处理「拖入/粘贴图片文件」，没有任何选中图片后的浮层入口；链接与公式共用的 `InlinePopover`（`src/components/InlinePopover.tsx`）没接图片。

**实现要点**：
- 给 `ResolvingImage` 加 `selectable: true` 之外的点击处理：单击选中图片节点时，用 `InlinePopover` 在图片下方挂一个两项表单「替代文本 / 标题」（与 `LinkEditor` 同款），回车确认写回节点 attrs。
- 序列化：`![alt](src "title")`——项目现有序列化由 `@tiptap/markdown` 负责（`src/lib/serializeDocument.ts`），先确认它已支持 title；不支持就在保存链加一条纯函数把 `![alt](src)` 补成带 title 的形式（**只在用户真的填了 title 时写**，否则字节不变，参照第 39/41 轮的「不动原文」纪律）。
- 说明文字（图下方的 caption）不要做：Markdown 没有标准语法，会破坏保真。

**体积与风险**：约 300–600 B gzip（浮层与 `LinkEditor` 复用），0 新依赖。风险：① 点图片不能顺手触发「选中整段」的旧行为，回归「点图后直接打字」路径；② title 含中文引号时要转义；③ 无句柄时 `src` 是原始相对路径，浮层里要照原样显示，不能换成 blob URL。

## 6. P2 没有目录句柄时，相对路径图片是 404 破图，不给「图片未找到」占位

**用户收益**：第 39 轮给「打开文件夹后解析失败」加了虚线占位与「图片未找到」（`docs/typora-gap.md:37`）。但**没有句柄**的两种常见场景——首启的空白 `未命名.md`、宿主里单独打开的 `.md`——**不走这条路**，浏览器直接按相对地址请求，得到 404 破图，用户看不出是「缺图」还是「路径写错」还是「需要打开文件夹」。

**现状证据**：
- E2E（`P7_image_click` 的 `imgInfo`）：`imgFound:true`、`missingFound:false`、`placeholderText:""`、`src:"assets/nope.png"`——`data-asset-missing` 占位没有出现。
- 代码：第 39 轮的占位走的是「有目录句柄、解析失败」分支；没有句柄时解析器返回 null，`assetImage.ts` 就直接留着原文 `src`（这与第 38 轮「单文件打开按前缀校验返回 null，不显示别处的图」一致），但 null 的两种含义（没有句柄 / 真的缺文件）在 UI 上没区分。

**实现要点**：
- `ResolvingImage` 把 null 拆成两种：`noHandle`（显示「打开文件夹后可显示图片」）与 `notFound`（沿用第 39 轮的「图片未找到：<原路径>」）。判据用 `resolveAssetSegments` 的入参（有没有 dirHandle），不要靠猜。
- 预览面板（`PreviewPane.tsx:62`）同口径，避免「编辑视图破图、预览也破图」两处文案不一致。

**体积与风险**：约 150 B gzip + 2 条单测。风险：① 宿主文档路径（`/__doc`）没有目录句柄，会立刻命中新占位——要先确认宿主里相对图本来就显示不了（`docs/typora-gap.md:37` 写「单文件打开与 HTML 导出仍显示不了」），别把宿主能显示的情况误判成缺图；② 占位不能吞掉 `alt` 文本（读屏要用）。

## 7. P2 文档过期：`typora-gap.md` 与 `typora-features.md` 仍有 3 处要改

本轮按角色要求核对了两份文档的计数与内容。

- **计数本身是对的**：`docs/typora-gap.md` 的「已经有（31）」表里以 `| 有` 开头的行实测 **31** 行，与标题一致；「缺的（10）」六个小节的行数 2+3+1+1+1+2 = **10**，也一致。这条**不是**过期（撤回该疑点）。
- **过期 1**：`docs/typora-gap.md:35` 只写「大纲折叠 有；会话内有效，不持久化」，漏了第 44 轮实测的「在标题前改一个字，折叠全部静默展开」（`Outline.tsx:17` + `outline.ts:24` 的位置 id，第 44 轮 `typora-outline-after-edit.png`），该问题至今未修。
- **过期 2**：`docs/typora-gap.md:34` 把「预览面板与 HTML 导出不含图」写在「已经有」一行里当备注，没进「缺的」表、也没进 `:85-93` 的「建议的下一批」；第 44 轮 F5 已实测（预览 `svg` 0 个、`pre` 1 个），planner 照表排任务会漏掉。
- **过期 3**：`docs/iteration/typora-features.md:94-101`（§5.1 八行「缺失且值得做」）与 `:130-137`（§6 Top 8 前 7 项）仍把 Ctrl+P、Ctrl+K、表格键盘、标题快捷键、源码 Ctrl+/、侧栏直达、字数明细、大纲折叠列为待做，实际全部已实现（`docs/typora-gap.md` 对应行、README 当前状态）。第 44 轮 F7 已提，本轮复核仍原样。

**建议**：`typora-features.md` 顶部加一行「现状以 `docs/typora-gap.md` 为准（2026-11-17 复核）；本文 §3/§5/§6 的『Sidelight 现状』列是 11-16 的快照」；`typora-gap.md` 补两行（正文栏宽/视口三档、预览与导出的标题 id），并把预览导出缺图移进「缺的」。**体积 0 B**。

## 8. P2 复核仍未修：字数明细没有「行」、源码模式没有选区字数

第 44 轮 F6 报过，本轮读码复核未变：`StatsDetail.tsx:82-90` 的字段仍是 `中日韩字 / 拉丁词 / 合计 / 字符 / 句 / 段 / 阅读`，没有「行」；`:114-119` 的选区行在源码模式拿不到值（`App.tsx:5128` 仍是 `viewMode === 'edit' ? selection.words : 0`）。这条不作为新发现重复计数，只提醒 planner：第 44 轮已把它并进「源码模式字数口径」任务，若那批没做，下轮还会出现。

## 9. 试过、判断没有问题的路径（负结果，免得下一轮重复劳动）

1. **大纲点击后可以直接写**：点大纲项后 `activeElement` 就是 `.ProseMirror`（`App.tsx:3990-3993` 的 `jumpTo` 里 `focus().setTextSelection().scrollIntoView()`），紧接着打字 `Z` 落在正文里（`tail:"…Alpha body.\n\nZChapter B…"`）。不需要额外修。
2. **表格最后一格按 Tab 会自动加行**：行 2 → 3、单元格 4 → 6，与 Typora 表格式键盘一致（第 44 轮只测了格间移动，本轮补末格这一档）。
3. **正文 Shift+Enter 是硬换行且往返正确**：DOM `<br>`、源码 `AB  \nC`（两尾空格 = CommonMark hard break），重开会变回 `<br>`。
4. **查找条键盘入口齐全**：`FindBar.tsx:97-105` 有「上一处 / 下一处 / 关闭」三个带 `aria-label` 的按钮，第 41 轮的 `Aa` / 整词两个开关也在（`:79-96`）。Typora 的箭头在 Sidelight 有对等物。
5. **Mermaid 错误态**：第 44 轮实测给中文提示且保留源码，本轮未复测，按上轮结论保留。
6. **切主题后正文/纸面配色本身是对的**：`boxBg` 从 `rgb(255, 253, 248)` 变 `rgb(28, 31, 35)`，只有图没跟（F3）。

## 10. 截图（`shots/round-45/`）

| 文件 | 内容 |
| :--- | :--- |
| `typora-width-1440.png` | 1440 窗口下的正文栏（576 px 与两侧留白） |
| `typora-width-1920.png` | 1920 窗口下正文栏仍是 576 px，右侧大块空白 |
| `typora-preview-anchor.png` | 预览里 `[jump to B](#chapter-b)` 与两个没有 id 的标题 |
| `typora-outline-focus.png` | 点大纲项后焦点回到正文 |
| `typora-mermaid-light.png` | 浅色纸 + 浅色 Mermaid 图（基准） |
| `typora-mermaid-dark-stale.png` | 切深色后纸变深、图仍是浅色（F3） |
| `typora-mermaid-dark-fresh.png` | 深色下新建的图仍按浅色渲（F3） |
| `typora-table-tab-last.png` | 末格 Tab 后新增的一行 |
| `typora-image-click.png` | 点图片后没有任何编辑浮层（F4） |
| `typora-softbreak-source.png` | Shift+Enter 在源码模式里的 `AB␠␠\nC` |

## 11. UNVERIFIED

1. **预览里点锚点为什么连 URL hash 都不变**：读数 `hash:""`、`scrollTop:0`；`PreviewPane.tsx` 里没有 click 拦截（`Select-String` 对 `onClick|preventDefault|href` 0 命中），理论上浏览器应至少改 hash。可能是预览容器 CSS 拦截了点击，也可能是坐标系落点偏了。结论「点了不跳」成立（有截图），但「hash 不变」的机制没定论。补测：在预览里用 `page.evaluate` 给 `a` 加 `id` 后 `a.click()`，看 `location.hash` 是否变化；或查 `.preview-pane` 的计算 `pointer-events`。
2. **正文栏宽放宽后的 Tiptap 行为**：只量了现状，没有改 CSS 试「44rem / 52rem 会不会出现横向溢出或批注栏挤压」。补测：DevTools 就地改 `grid-template-columns` 后量 `scrollWidth === clientWidth` 与 `.margin-rail` 位置（1024/760 两档）。
3. **Mermaid 深色主题的实际观感**：本轮只读了 `fill` / `color`，没在真深色里看过 mermaid 的 `dark` 主题渲染结果（是否和 Sidelight 的纸色协调）。补测：临时把 `theme:'dark'` 写进 `initialize` 后截图。
4. **图片浮层（F4）与宿主/无句柄两态的交互**：只测了无句柄的破图路径，没测有目录句柄时点真实的图。
5. **真实 IME**：本轮所有输入都是 CDP 键盘注入；中文 IME 下的 `#`（锚点链接）、图片 alt 输入未测。
6. **导出 HTML 的锚点**：只做了代码核对（`export.ts` 里 `id=`/`slug` 0 命中），没有真导出文件后点链接。

## 12. 给 planner 的排序建议

1. **预览与导出的标题 id + 锚点跳转**（F2，P1；一次改动同时铺好 `[toc]` 的地基，收益随文档长度放大）。
2. **Mermaid 主题跟随**（F3，P2；已有第 42/43 轮记录，本轮把根因定位到 `initialized` 与缓存键，改动集中在两个小文件）。
3. **正文栏宽三档**（F1，P2；纯 CSS + 一个设置项，先把「大屏行太长/太短」这条体验补齐，顺带覆盖 gap 里的「视图缩放」）。
4. **图片 alt/title 浮层**（F4，P2；复用 `InlinePopover`，注意字节保真）。
5. **无句柄时的图片占位**（F5，P2；与第 39 轮的占位机制同源，成本最低的补丁）。
6. **两份 Typora 文档的过期修正**（F6，P2 文档；可与上面任一条同批做，几分钟）。

排序理由：F2 是能力缺失且牵连 `[toc]`；F3/F1 是「看着不那么像 Typora」的主因，成本低；F4/F5 是图片链的两个小口子；F6 只影响规划准确性。
