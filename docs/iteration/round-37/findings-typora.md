# 第 37 轮侦察：Typora 对照与写作体验（finder-typora）

- 角色：只读侦察，不改产品代码、不改 `release/`、不 push。
- 轮前 startSha：`ee5c1f7e637a5da0f79b811ff4c31c94eba3fc76`（`docs: round-36 看板记录提交哈希`）
- 证据：CDP 9223 + dev server `http://localhost:5175`；探针脚本 `.tmp/e2e-r37-typora.mjs`、`.tmp/e2e-r37-typora3.mjs`、`.tmp/e2e-r37-typora4.mjs`；截图 `shots/round-37/`。
- 首屏预算：实测 288,256 B gzip（第 36 轮 `npm run verify`），本轮不重构建，余量 **21,744 B** 到内部线 310,000 B。

## 0. 结论先行

1. `docs/typora-gap.md` 明显过期：**7 条能力已实现却仍写「无」**，另有 3 处表内自相矛盾，计数 22/17 应改为 **29/10**。这是本轮最便宜的一笔收益（纯文档，0 B）。
2. 写作者收益最高且体积最便宜的三项：**表格列宽拖拽（JS 已在主包，0 B）**、**行内 HTML 白名单渲染**、**工作区相对路径图片显示**。
3. 「粘贴为纯文本」不是真缺：Chromium 原生 `Ctrl+Shift+V` 在浏览器里已能去格式（探针实测），但宿主关了浏览器加速键、快捷键对话框也没登记，属于「可能已有、未验证、未告知」。

## 1. 实测证据（Sidelight 现状）

| # | 项目 | 方法 | 结果 | 证据 |
| :--- | :--- | :--- | :--- | :--- |
| A | 行内 HTML 渲染 | 键盘输入 `按 <kbd>Ctrl</kbd> 保存，<mark>高亮</mark>，H<sub>2</sub>O。` | `kbd/mark/sub` 元素各 **0** 个；DOM 是转义文本 `<p>按 &lt;kbd&gt;Ctrl&lt;/kbd&gt; …` | `shots/round-37/typora-inline-html.png` |
| B | 表格列宽拖拽 | 粘贴 3 列表格 → 点进单元格 → 在第一、二列边界按下拖动 90 px | 工具条在（`表格 上插入 下插入 左插入 右插入 删行 删列 删表`）；`.column-resize-handle` **0** 个；列宽 194/190/191 → 拖动后 **194/190/191 不变** | `shots/round-37/typora-table.png`；`tableDom`/`tableDrag` JSON |
| C | 视图缩放 | `Ctrl+=` 后读 `--editor-size`；再向 `.ProseMirror` 派发 `wheel{ctrlKey:true, deltaY:-120}` | 字号 17px → **18px**；滚轮事件 `defaultPrevented=false`、字号**不变** | `fontSizeBefore/AfterCtrlPlus/ctrlWheel` |
| D | 粘贴为纯文本 | 剪贴板写入 `text/html='<p><b>粗体词</b>与<i>斜体词</i></p>'` + `text/plain='粗体词与斜体词'`，分别按 Ctrl+V、Ctrl+Shift+V | Ctrl+V：`strong=1 em=1`；Ctrl+Shift+V：`strong=0 em=0`，文字相同 | `.tmp/e2e-r37-typora4.mjs` 输出 |
| E | 大纲折叠 | 键盘造 5 个标题 → 切「大纲」页签 → 点第一个折叠箭头 | 折叠前 5 项、2 个 `aria-expanded=true`；折叠后 **2 项**、`aria-expanded=false` | `shots/round-37/typora-outline.png`；`outline` JSON |
| F | 快速打开 Ctrl+P | 按 Ctrl+P | 浮层出现（`.quick-open-backdrop`/`.quick-open-input`，占位「按文件名或路径过滤」） | `quickOpen` JSON |
| G | 字数明细 | 点状态栏「126 字」 | 面板出现：中日韩字/拉丁词/合计/字符/句/段/阅读/选区 | `shots/round-37/typora-stats-detail.png`（第 1 版探针） |
| H | 主题可选项 | 打开设置 | 主题三项「浅色 / 深色 / 跟随系统」；只有字号滑块 12–26，无行高/字族 | `shots/round-37/typora-settings.png`；`settings` JSON |
| I | 侧栏形态 | 读 `[role=tab]` | 只有「文件 / 大纲」两个页签，无文件列表形态（`.file-list` 不存在） | `chrome` JSON |
| J | 拖入文件 | 读源码 `handleDrop` | 只收 `file.type.startsWith('image/')`，其余 `return false` | `src/App.tsx:824-831` |

## 2. `docs/typora-gap.md` 过期核对（可直接照改）

### 2.1 已实现却写「无」的 7 条（缺 → 有）

| 行 | 现文档写法 | 实测/源码 | 建议改法 |
| :--- | :--- | :--- | :--- |
| `:41` | 自动配对括号与引号 \| 无 \| P1 | 第 33 轮已实现，`src/lib/smartTyping.ts:33,71`（设置可关） | 移到「已经有的」：自动配对括号引号，有；只在键盘输入时生效，设置可关 |
| `:42` | 智能标点 \| 无 \| P1 | 同上（`smartInput` 命中直引号/双连字符） | 移到「已经有的」 |
| `:43` | 缩进与反缩进 \| 无 \| P1 | 列表内 Tab/Shift+Tab：`src/App.tsx:798-812`；正文 Tab 插 2 空格：`src/App.tsx:814-822`；表格 Tab 走格：`:814-816` | 移到「已经有的」，注明「列表与表格内缩进/走格」 |
| `:53` | 大纲折叠 \| 无 \| P2 | `src/components/Outline.tsx:17,49-57`；探针 E：折叠后 5 → 2 项 | 移到「已经有的」 |
| `:60` | 新建、重命名、删除文件 \| 无 \| P1 | 第 12/13/28 轮：`src/components/TreeActions.tsx:264,271`、`src/lib/trash.ts`、`src/lib/rename.ts` | 移到「已经有的」，注明删除进 `.sidelight/trash/`、可撤销 |
| `:61` | 快速打开（Ctrl+P 模糊搜索）\| 无 \| P2 | `src/components/QuickOpen.tsx:50-59`；探针 F 浮层出现 | 移到「已经有的」 |
| `:63` | 最近文件 \| 有（8 条…）\| P2 | 这一行**写在「缺的」表里**，内容却是「有」 | 移到「已经有的」 |

### 2.2 表内自相矛盾 3 处

| 位置 | 矛盾 | 事实（探针） | 建议 |
| :--- | :--- | :--- | :--- |
| `:25` vs `:51` | 「有」表写「字号与缩放 有；Ctrl+= / Ctrl+- / Ctrl+0」，「缺的」表写「缩放 无；Ctrl+滚轮与比例重置」 | Ctrl+= 改的是字号（17→18px），Ctrl+滚轮不被接管 | 拆成两行：字号缩放（有）、视图缩放（无，仅字号） |
| `:27` vs `:40` | 行内 HTML 同时出现在「有」（保真未渲染）与「缺的」（P1） | 探针 A：不渲染，原文保留 | 只留在「缺的」，删掉「有」表那行 |
| `:81` | 主题 \| 只有跟随系统的明暗 \| P2 | 设置里有浅色/深色/跟随系统三项 | 改为「明/暗/跟随系统三档；无自定义主题」 |

### 2.3 备注需补一句

- `:29` 表格行列：备注只写「工具条，可增删行列与整表」。实测键盘路径已在：Tab 走格、`Ctrl+Enter` 下方加行、`Ctrl+L` 删行（`src/App.tsx:786-795`）。建议备注补「键盘：Tab 走格、Ctrl+Enter 加行、Ctrl+L 删行」。

### 2.4 计数

- 7 条从「缺的」移到「已经有的」→ **有 29 / 缺 10**（都是 22+7 / 17−7）。`README.md`、`AGENTS.md` 第 6 节、`STATE.md` 里出现的「22 项有 / 17 项缺」要一起改。

## 3. 改进建议（按收益/成本排序）

### P1-1 表格列宽拖拽：JS 已在主包，成本≈CSS
- **用户收益**：中文表格列宽不拖就永远是均分，长表格要横着读；Typora 是表头边界拖拽。写作者每天用。
- **现状证据**：`src/App.tsx:127-136` 的 `ReusableTable` 只覆盖 `renderMarkdown`，没有 `resizable`；`:757` 注册时也没有 `.configure({ resizable: true })`。探针 B：`<colgroup>` 里 3 个 `<col style="min-width: 25px">`，`.column-resize-handle` 0 个，拖 90 px 列宽不变。
- **实现要点**：
  1. `node_modules/@tiptap/extension-table/dist/index.js:769` 显示 `resizable` 打开后才挂 `columnResizing`；已装的 `@tiptap/extension-table@3.34` 支持 `Table.configure({ resizable: true })`（`index.d.ts:79`）。
  2. **主包已含该插件的字符串**：`dist/assets/index-CkPNnBZ0.js` 有 1 处 `column-resize-handle`（当前 `resizable=false` 也打进去了，说明整块 `@tiptap/pm/tables` 静态导入，tree-shaking 拿不掉）。→ 打开 `resizable` 的 **JS 增量应为 0 B**，只需加 CSS。
  3. `src/styles.css:685` 已有 `.editor .tableWrapper`，补 `.column-resize-handle`（2 px 竖线 + `cursor: col-resize`），或在 `TableView` 外层加 hover 高亮。
  4. 序列化：`renderMarkdown` 只用单元格文字，`colwidth` 属性不落 Markdown；跑 `npm run roundtrip` 的 rich 5/7、source 7/7 与 `src/lib/tableReuse.ts` 的「整块复用原文」用例，确认未改动表格不再被判脏。
- **体积与风险**：CSS 估 200–400 B raw（<200 B gzip），JS 0；必须用 `npm run verify` 实测首屏，预算只余 21,744 B。风险：`colwidth` 若被序列化会给表格加 `<colgroup>` 破坏「未改动表格整块复用原文」（第 10 轮），验收要带这条。
- **优先级**：P1（1 轮内可完成，与 Tab 走格互补）。

### P1-2 行内 HTML 白名单渲染（kbd / mark / sup / sub / u / br）
- **用户收益**：中文技术写作与博客搬运常带 `<kbd>`、`<mark>`；现在整段显示成 `<kbd>Ctrl</kbd>` 字样，读者见原文。Typora 渲染成键盘样式。
- **现状证据**：探针 A：`kbd/mark/sub` 元素 0 个，DOM 是 `&lt;kbd&gt;`；`src/lib/html.ts:21-23` 解析前把标签转实体（为保证不丢内容），`:7-9` 保存时再还原。`docs/typora-gap.md:40` 记 P1「保真但不渲染」。
- **实现要点**：新 `src/lib/inlineHtml.ts` 写 5 个自定义 mark（不用新依赖；`@tiptap/extension-subscript` 是另一个包，违反「不加依赖」）＋ 一个 node view 处理 `<br>`；解析只在 `escapeHtmlForParse` 的白名单前缀上放行（其余仍转义），序列化仍走 `repairHtml`，保证「未知标签逐字保真」。渲染用 `<kbd>/<mark>/<sub>` DOM，样式进 `styles.css`。
- **体积与风险**：估 +1.5–2.5 KB raw（<1 KB gzip），要实测。风险：a) 白名单外的 HTML 必须继续逐字保真（`src/lib/html.test.ts` 现有断言）；b) 保存前差异门不能因为渲染新增换行；c) HTML 导出要保留同样标签；d) 安全：只允许固定标签，不注入属性。
- **优先级**：P1。

### P1-3 工作区相对路径图片的显示 + 落盘规则
- **用户收益**：写作时插图是刚需。现在 `assets/xxx.png` 只写进正文、编辑器与预览都不解析工作区路径，作者看到的是一张破图（第 32/33/34 轮连续记录）。Typora 还有 `./assets` 与 `${filename}.assets` 两种落盘规则。
- **现状证据**：`src/lib/asset.ts:42-52` 硬编码 `assets/` 目录、返回 `assets/${fileName}`；`src/App.tsx:747` `Image.configure({ allowBase64: true })`，无自定义 `src` 解析；全文 `git grep` 无图片路径重写逻辑。
- **实现要点**：
  1. 前端：给定文档所在目录句柄时，用 `URL.createObjectURL(await dir.getFileHandle(...).getFile())` 生成 blob URL，交给 Image 扩展的 `src`；卸载时 revoke（避免内存涨）。
  2. 落盘规则：`SettingsDialog` 加两项「`assets/`（默认）」与「`${filename}.assets/`」，改 `writeAsset(dir, fileName, blob, mode)`；`asset.test.ts` 加两条。
  3. 宿主（Windows 走 `http://127.0.0.1:47821` 时）：新增 `GET /__asset?path=`，只在工作区根下解析、拒绝 `..`、返回正确 MIME；`host-smoke` 加一条 200/404 断言。macOS 宿主同路径需要同一路由。
- **体积与风险**：前端 <1 KB；宿主路由约 +1.5 KB C#（进安装包，不进首屏）。风险：路径穿越（必须 canonicalize 后比对根）、网络盘/OneDrive 占位文件读失败要有可见提示。宿主改动要单独跑 `host-smoke`。
- **优先级**：P1（体验断点，且已连挂 3 轮）。

### P1-4 视图缩放（Ctrl+滚轮真缩放 + 重置）
- **用户收益**：长期盯屏要临时放大看细节、缩小看结构；现在只能改字号（12–26），宽表与长行不会跟着缩。Typora 有 `Ctrl+Shift+= / Ctrl+Shift+- / Ctrl+Shift+9` 与 Ctrl+滚轮。
- **现状证据**：探针 C：Ctrl+= 只把 `--editor-size` 从 17px 改到 18px；向编辑区派发带 `ctrlKey` 的 wheel 不被接管（`defaultPrevented=false`，字号不变）；`git grep wheel` 在 `src/` 0 命中；`src/App.tsx:3667-3677` 只有字号加减与复位。
- **实现要点**：`src/App.tsx` 编辑器容器挂 `onWheel`（`ctrlKey → preventDefault`，step 10%，clamp 80–200%），状态写进 `settings.zoom`；`Ctrl+Shift+= / - / 9` 三键接入现有 keydown 分支；应用方式用 CSS 变量 `--zoom` 配 `zoom: var(--zoom)`（Chromium 支持，宿主同引擎）或 wrapper `transform` + 宽度补偿；状态栏非 100% 时显示「缩放 125%」。不改字号，两套并存。
- **体积与风险**：<0.4 KB。风险：`zoom` 与页边批注定位、选区坐标互相影响 → 必须回归 `MarginRail` 与「点链接就地编辑」的坐标；导出不受影响。若 `zoom` 有坐标问题，退化为只缩放 `.ProseMirror` 内容宽度。
- **优先级**：P1（写完一轮可测）。

### P2-5 主题：正文字族与行高预设（不引主题市场）
- **用户收益**：中文长文校对要衬线体（宋体/思源宋）与更宽行距；现在只有明暗三档和字号。
- **现状证据**：探针 H：设置只有「浅色 / 深色 / 跟随系统」与字号 12–26；`src/lib/settings.ts:13,37,90-93` 只有 `theme` 与 `fontSize`，无 `fontFamily`/`lineHeight`；`docs/typora-gap.md:81` 写「只有跟随系统的明暗」（已过期，本来就有三档）。
- **实现要点**：`Settings` 加 `fontFamily: 'sans'|'serif'|'mono'` 与 `lineHeight: 1.6|1.8|2.0`，映射到 `styles.css` 的 `--editor-font`/`--editor-leading`；`src/lib/export.ts:162` 的 HTML 导出同步取这两个值，保证「编辑所见 = 导出所得」；`settings.test.ts` 加默认值与越界回退。
- **体积与风险**：<0.5 KB；三个字族都用系统已装字体，不新增 woff2（若用思源宋则另算，先不做）。风险：导出测试要多断言一行；主题设置迁移要兼容旧值。
- **优先级**：P2。

### P2-6 拖入 `.md` 直接打开
- **用户收益**：Typora 用户习惯把文件拖进窗口；现在拖 `.md` 完全没反应（只有图片被接收），作者会以为应用坏了。
- **现状证据**：`src/App.tsx:824-831` `handleDrop` 过滤 `file.type.startsWith('image/')` 后 `return false`；无其他 drop 处理。`docs/typora-gap.md:61` 记「拖入文件或文件夹打开 无」。
- **实现要点**：`handleDrop` 分支里用 `event.dataTransfer.items[i].getAsFileSystemHandle()`（Chromium 支持）拿句柄 → 走现有「打开文件」路径；拿不到句柄时给一条 toast「拖入打开需要桌面版」而不是静默。宿主侧要 `CoreWebView2Controller.AllowExternalDrop = true` 并在 `Drop` 事件里把路径转给页面（`postMessage`），这一半单独一轮做。
- **体积与风险**：前端 <0.6 KB；宿主 +1–2 KB C#。风险：宿主 drop 的路径白名单与编码（中文路径）；拖入时未保存改动的守卫要复用现有三选一。
- **优先级**：P2（前端分支便宜，宿主分支有风险）。

### P2-7 大纲折叠状态持久化 + 全部折叠/展开
- **用户收益**：折叠本身已有（探针 E）；但 `src/components/Outline.tsx:13` 明确写「只把折叠集合留在内存里（会话内有效，不持久化）」，长文刷新即复原。整篇折叠/展开也缺。
- **实现要点**：折叠集合按文档键存 `.sidelight/` 或 localStorage（与其他 UI 状态一致，勿新增目录），加「全部折叠 / 全部展开」两个按钮（`Outline` 头部），键盘 `Ctrl+Shift+1` 保持不变。
- **体积与风险**：<0.4 KB。风险：文档切换时按 key 取回；坏掉的键值要回退为空集，不要抛错。
- **优先级**：P2。

### P2-8 纯文本粘贴的显式入口与快捷键登记
- **用户收益**：从网页/Word 粘到正文经常带一堆行内格式，作者要「粘成纯文本」。
- **现状证据**：探针 D：浏览器里 `Ctrl+V` 保留粗斜体（strong=1/em=1），`Ctrl+Shift+V` 得纯文本（strong=0/em=0）——**引擎已支持**。但：a) `ShortcutsDialog` 与 `src/App.tsx` 里没有 `粘贴`/`Ctrl+Shift+V` 字样（`git grep` 0 命中）；b) 宿主设了 `AreBrowserAcceleratorKeysEnabled=false`（`host/Program.cs:1491`），这条加速键在桌面版是否还生效 **UNVERIFIED**。
- **实现要点**：先做一次宿主验证（`host-smoke` 加一条：真实剪贴板写富文本 → 页面 `Ctrl+Shift+V` → 断言无 `strong`）；若被吞，则在 keydown 拦截 `Ctrl+Shift+V`，用 `navigator.clipboard.readText()` 读取并 `insertText`（WebView2 需要宿主放行 `PermissionRequested` 的 ClipboardRead），失败给可见提示。无论哪条路，都要把这条快捷键写进 `ShortcutsDialog`。
- **体积与风险**：0–0.2 KB（前端）；宿主权限放行 +0.3 KB C#。风险：剪贴板读取失败要有降级提示，不能静默。
- **优先级**：P2（先验证再决定写不写代码）。

### P2-9 专注/打字机补 F8 / F9（Typora 键位）
- **用户收益**：写作者用键盘切专注/打字机；现在只能点顶栏「专注」「打字机」两个按钮（探针 `chrome`：按钮存在，无 F8/F9）。
- **现状证据**：`git grep -E "\bF8\b|\bF9\b" src/` 0 命中；`src/App.tsx:4544-4549` 只有按钮。Typora 的键位见 `docs/iteration/typora-features.md:71`。
- **实现要点**：现有 window keydown 分支加 `event.key === 'F8' / 'F9'`（无修饰键、非输入态），复用现有 `setFocusMode`/`setTypewriterMode`；`ShortcutsDialog` 与 README 键盘表同步；宿主已关浏览器加速键，F8 不会被抢。
- **体积与风险**：<0.1 KB。风险：F8 在部分输入法里是候选翻页键——中文 IME 未验证（与全项目其它 IME 项同批验证）。
- **优先级**：P2。

## 4. 体积与预算对齐

- 首屏：288,256 B / 内部 310,000 B，余 21,744 B。本轮 9 条建议里，只有 P1-2（行内 HTML）与 P1-3（前端图片解析）会实质增加首屏；P1-1 的 **JS 增量预计 0 B**（`column-resize-handle` 已在 `dist/assets/index-CkPNnBZ0.js` 里）。
- 安装包：1,299,777 B（第 36 轮 dry-run）/ 内部 1,800,000，余 500,000 B。宿主侧改动（`/__asset`、拖入打开、剪贴板权限）合计估 +3–4 KB C#，空间充足。
- 新依赖：以上 9 条**都不需要新运行时依赖**。

## 5. UNVERIFIED

| 项 | 为什么 | 下一轮怎么补 |
| :--- | :--- | :--- |
| 宿主里 `Ctrl+Shift+V` 是否生效 | 探针只在浏览器（Chromium 加速键可用）验到；宿主设了 `AreBrowserAcceleratorKeysEnabled=false` | `host-smoke` 用真实剪贴板写富文本，按 Ctrl+Shift+V，断言无 `strong` |
| 表格 `resizable: true` 的 JS 增量确为 0 B | 只做了 `dist` 字符串检查，没有实际改配置后构建 | 实施轮改配置后跑 `npm run verify` 对比 288,256 B |
| 列宽是否会被序列化进 Markdown | 未开 `resizable`，无法观察 `colwidth` 落盘 | 同上，跑 `npm run roundtrip` 与 `tableReuse` 用例 |
| 拖入文件在宿主下的路径传递 | WebView2 的 `AllowExternalDrop` + `Drop` 事件未实测 | 单独一轮改宿主 + `host-smoke`，中文路径必测 |
| 缩放对页边批注坐标的影响 | 未实现，无法测 | 实施轮用「长文批注定位」用例回归（第 30 轮那套） |
| 中文 IME 下 F8/F9 | 全项目同类未验（无真实 IME） | 与既有 IME 项同批真人验证 |

## 6. 明确不建议做的

- **MathJax / Pandoc / 主题商店 / 自动更新器 / 原生 7 菜单栏 / 文件列表与文件树双形态**：理由见 `docs/iteration/typora-features.md:117-127`，本轮复核仍然成立。
- **跨文件全局搜索**：`docs/typora-gap.md:75` 记 P2，本轮不碰（与体积/稳定性排序一致）。

## 7. 给 planner 的排序建议

1. 先做 **2.1/2.2 的差距表修正**（0 B，顺手把 README/AGENTS/STATE 的 22/17 改成 29/10）。
2. 再取 **P1-1 表格列宽拖拽**（最便宜、每天用）＋ **P2-9 F8/F9**（一行键位）合成一个小任务。
3. **P1-3 图片路径** 单独一个任务（要动宿主，需 `host-smoke`）。
4. **P1-2 行内 HTML** 与 **P1-4 缩放** 各自一轮，避免同改 `App.tsx` 与 `styles.css` 冲突。
