# CHANGELOG

版本号在 `package.json`。每发一版加一节，最近的在上面。

## Unreleased（第 29–50 轮，未发版）

数据安全 + 大纲折叠；计划里的 T2（状态栏字数点击明细）**未做**，留待下一轮。第 30 轮补上字数明细、修删除撤销丢正文，并给安装器版本与发版流水线加门。

**第 30 轮（同一未发版区间）**

- 状态栏字数可点：弹出「字数明细」面板（字 / 字符 / 词 / 句 / 段 / 阅读时间 + 选区内字、字符、句），`Esc` 或点面板外面关闭，焦点回触发按钮；面板是 footer 的兄弟节点，不吃状态栏的整栏文本。新增 `countSentences`（`src/lib/wordcount.ts`，3 条单测）。
- 源码模式字数先剥 frontmatter（`src/App.tsx` 状态栏取值），同一篇在编辑/源码间因元数据跳变的问题修掉；`[文字](url)` 这类链接目标造成的残留跳变另记，见第 30 轮报告。
- **修数据丢失**：删除干净文件后「撤销」恢复成 0 字节，还把 `.sidelight/trash/` 里的两份副本一起删掉。现在干净文件（`text === null`）不写 `.current.md`；撤销改为收集 trash 条目（只收 `kind === 'file'`）后按「`.current.md` 非空才优先、否则整份备份」选源；新增纯函数 `shouldWriteCurrent` / `pickTrashSource` 与 `src/lib/trash.test.ts`（6 条）。
- 首屏回收：`PreviewPane` 与 `export.ts` 改按需加载（导出时才取模板），首屏 gzip 285,838 → **284,529 B**（上限 286,000，余 1,471 B）。
- 安装器版本不再写死：`packaging/installer.nsi` 的 `VIProductVersion` / `FileVersion` 改用 `${APPVERSION}.0`（0.31.1.0 曾随 0.32.1 发出去）；`packaging/installer.ps1` 出包后断言 `FileVersion` 并打印 820,000 B 目标线差值。`release.yml` 两个构建 job 补 `npm test` / 首屏体积门，`ci.yml` 补便携 zip。
- 测试：`npm test` 18 个文件 **260** 条（251 + 删除撤销 6 + 句数 3）。
- UNVERIFIED：真实盘句柄上的删除 + 撤销（假 FSA 无权限模型，`move()` 分支总被走到，copy 分支本轮跑不到）。超大文件新提示本轮已按文件树入口实测通过（dev server 已交付新模块，`tooLargeNote` 3 处）。

- 保存成功后不再写陈旧草稿：`finishSaved` 先停草稿计时器再推进代际；草稿回调在 `parentDirectory` 前后、`writeCache` 之后各判一次 `stale()`，在飞的一轮写下了也补删（`src/App.tsx:845-874`、`:2521-2529`）。
- 超过 5.5 MiB 的文件被拒时，提示写清正文「仍在『哪一篇』」，不再让人以为窗口里是新文件、`Ctrl+S` 写错篇；文件选择器与文件树两条入口共用 `tooLargeNote`（`src/App.tsx:2105,2112,2133`）。文件树入口的实测被陈旧模块挡住，见 `docs/iteration/round-29/test.md` 的 UNVERIFIED。
- 大纲可折叠：新增 `src/lib/outlineTree.ts`（`buildOutlineTree`/`expandAncestors`/`visibleActiveId`）；`Outline.tsx` 两列 grid + 折叠按钮（行内 style，不进首屏 CSS）；当前节被折叠时高亮最外层折叠祖先（`aria-current="location"`），光标回到子节自动展开；折叠状态只在内存。
- 查找：查询为空时不再显示「无结果」（`src/components/FindBar.tsx:56`）。
- 删掉 5 段 0 引用 CSS（`.sr-only`、`.popover-title/note/actions`、`.dialog-input,`）。
- `scripts/measure-first-screen.mjs` 默认上限改 286,000，CI 不再单独传 `--max`；ADR-0012 判据行同步。
- 首屏 gzip **285,838 B**（≤286,000，余 162 B）；测试 `npm test` 17 个文件 **251** 条（248 + T3 的 3 条）；`draft-acceptance` 57/57、`keyboard-acceptance` 49/49。

**第 31 轮（同一未发版区间）**

- **修数据丢失**：删除当前文档后「撤销」、改名「非当前文档」两条路径都会把保存目标切到别的文件，下一次保存把当前正文写进它（实测覆盖掉被改名/被删文件的原文）。`refreshTree` 的 adopt 分支加不变量守卫（只有编辑器里载入的就是这个文件，才接 `activeFile` 与保存目标），撤销按钮改用最新的 `refreshTreeRef` 而不是删除那一刻的闭包（`src/App.tsx`）。回归锁 13/13：撤销后 `甲.md` 字节不变、改名非当前文档后 `丙二.md` 字节不变、改名当前文档仍写新路径、新建文件仍能保存。
- 字数明细按口径分行：中日韩字 / 拉丁词 / 合计 / 字符 / 句 / 段 / 阅读，每行 `title` 写清算法（中日韩字含汉字、日文假名、韩文谚文；合计 = 中日韩字 + 拉丁词）。打开后焦点进面板，`Esc` 关闭并回焦点到状态栏字数按钮（`src/components/StatsDetail.tsx`）。
- 点正文里的链接恢复就地编辑：`openLinkRef` 补上赋值，点击后贴着链接弹出文字 / 地址浮层（Esc 取消，不新开标签页）；列表项内 `Tab` / `Shift+Tab` 缩进 / 反缩进（`sinkListItem` / `liftListItem`），不再往行尾插两个空格。快捷键一览补一行。回归 15/15（链接、Ctrl+K、列表 3a–3d、表格 Tab、文档开头 Tab）。
- 门禁与文档：`@tiptap/extension-strike` 显式声明为直接依赖（此前只是 `@tiptap/starter-kit` 的传递依赖，换安装布局就会构建失败，字节不变）；`settings` / `prompt` / `katexLazy` 三个测试文件挂进 `npm test`（**21 文件 272 条**）；README 删掉不存在的「示例工作区」入口、说明链接的直接依赖；便携包说明不再指向包里没有的 `README.md`，`.md` 关联改按已定的 opt-in 描述。
- 首屏 gzip **284,761 B**（≤286,000，余 1,239 B；比第 30 轮 +232 B）。本轮不发版，实测命令与原始输出见 `docs/iteration/round-31/test.md`。
- UNVERIFIED：真实目录句柄上的「删除 → 撤销 → 保存」与「改名非当前文档 → 保存」（假 FSA 无权限模型）；列表嵌套的存盘字节（e2e 只验源码文本与 DOM 重解析）；真实中文输入法下的 Tab 与链接点击。

**第 32 轮（同一未发版区间）**

- 修 Windows 上 `Ctrl+Shift+P` 预览快捷键无声失效：`App.tsx` 的按键条件里多了 `!event.ctrlKey`，只有 macOS 的 `Cmd+Shift+P` 能命中；快捷键一览与预览按钮 tooltip 一直在宣传这个键。`keyboard-acceptance` 补 3 条断言（进预览 / 不被 `Ctrl+P` 抢走 / `Esc` 回编辑），52/52。
- 状态栏随选区显示「选区 N 字」：`SelectionState` 加 `words`（中日韩字 + 拉丁词，与字数明细的选区行同口径），选区折叠即不渲染；源码/预览态按 `viewMode === 'edit'` 归零，不显示旧选区。
- 字数明细「段」改按正文文本块计（新增 `countParagraphs`）：段落与列表项各算 1，标题与表格不计，代码块整块算 1；编辑与源码两模式同口径（改前编辑模式恒为 1、源码模式数非空行），面板提示与脚注写明口径。`wordcount.test.ts` +4 条。
- 构建期体积护栏 + Mermaid 决策：`vite.config.ts` 的 `chunkSizeWarningLimit` 从 1200 降到 950（主 chunk 894,163 B，留约 56 kB 缓冲），注释与 README 换成实测字节；新增 [ADR 0017](adr/0017-mermaid-lazy-loading.md)——Mermaid 首屏 0 B 的惰性方案可行，但安装包真实增量（主入口 + 48 个静态依赖 1,976,553 B raw）把包推过 850,000 B 硬线，**本轮不实现**，需产品负责人三选一。
- 测试：`npm test` 21 个文件 **276** 条（272 + 句段 4）；首屏 gzip **285,052 B**（≤286,000，余 948 B）；`keyboard-acceptance` 52/52、`qa17` 7/7。
- UNVERIFIED：Windows 宿主里实按 `Ctrl+Shift+P`（本机只浏览器实测）；macOS `Cmd+Shift+P`；全选 1 MB 时的选区计数耗时；源码模式解析失败后的回退路径（面板新旧口径一致性）；mermaid 真装进 `dist` 后重打的安装包字节；`qa16` / `qa10` 两条脚本已过期（见下条），本轮未修。
- 已知测试脚本过期（非本轮引入，基线同样失败）：`scripts/qa16.mjs:81` 等 `.editor a`——链接插入早已改成行内浮层，脚本还在等 `window.prompt` 的返回；`scripts/qa10.mjs:24` 等第 3 个 `p`——首启已是空文档，脚本还按演示文档写。

**第 33 轮（同一未发版区间）**

- 智能标点与自动配对（只作用于键盘输入）：直引号按上下文变弯引号、`--` → `—`、`...` → `…`、中文后的 `, ; : ? !` 变全角，左括号与开引号补右半边、光标落在里侧，有选区时把选区套起来；`---` 仍出分隔线、`` `a` `` 仍出内联代码、`don't` 与 `1990's` 的撇号原样。代码块、行内代码、组合输入不转换；设置里可关（`智能标点与自动配对括号`，旧存档读出为开）。收益面是**西文态 / 半角态与中英混排输入**；真实中文输入法中文态是否本来就上屏全角，本机无真人输入法，**未验证**。新增 `src/lib/smartTyping.ts` 与 8 条单测；e2e 13 组全过；首屏 gzip **285,891 B**（≤286,000，余 109 B）。
- 验收与发版门禁的版本号不再写死：`packaging/verify-installer.ps1` 三处判据改用脚本已有的 `$version`（此前写死 `0.31.1`——正确的 0.32.1 包会被判 2 个 FAIL，而 `FileVersion=0.31.1.0` 的坏包反而通过）；`release.yml` 的 `windows-build` 在上传前新增 `setup FileVersion` 断言（本地正反例已复验）；`packaging/README.md` 的门槛文案改成脚本真实输出。
- 测试：`npm test` 22 个文件 **285** 条（276 + 智能标点 8 + 设置旧存档 1）；`roundtrip` source 7/7。
- 已知限制（本轮不做）：中文后的 `.` 不转 `。`；反引号不配对（保 `` `a` `` → 内联代码）；没有成对退格（一次退格删一个字符）；中文后的 `!` 紧跟 `[` 时不转，保住 `![图](a.png)`；`——` 不能在空段落开头连打（三根 `-` 就出分隔线，要 `——` 先打一个别的字）。

**第 34 轮（同一未发版区间）**

- **修数据丢失（P0）**：保存会把脚注定义改写成 `[^1](定义文字。)`，而自动保存路径此前不弹框——用户只打一个字，2 秒后定义被静默丢掉。`src/lib/risk.ts` 新增 `footnote-loss` 分类：基线为空但原文有脚注定义时仍比对，且只放过这一种损失；手动保存与自动保存共用 `activeLosses`，自动保存命中后状态栏显示「需手动保存」，保存对话框文案同步（`src/components/SaveDialog.tsx`）。`src/lib/diff.test.ts` +2 条；回归锁 6/6（含自动保存路径，取消后字节不变）。
- 焦点回正文：`Esc` 关查找、查找条「关闭」、快速打开选中之后都回到 `.ProseMirror`；同一篇文档被再次打开时直接聚焦、不再弹「切换文档」（`isSameEntry` 身份比较）。
- 门禁：新增 `npm run verify`（build + 首屏 gzip 字节门），`measure-first-screen.mjs` 汇总行加 `headroom`；失败反例 exit 1 已实测。
- 测试 `npm test` 22 文件 **287** 条；首屏 gzip **285,937 B**（≤286,000，余 63 B）；`keyboard-acceptance` 52/52；`tree-acceptance` 54/56（两条为既有脚本过期）。
- UNVERIFIED：真实磁盘句柄上的脚注拦截；1 MB 带脚注文档的自动保存周期开销；真实中文输入法下的 Esc 后打字；宿主/WebView2 里的焦点修复；`npm run verify` 在 CI 两个 runner 上的字节一致性。

**第 35 轮（同一未发版区间）**

- 体积护栏换挡（产品负责人 2026-11-17 决定）：首屏 gzip 内部预算 **310,000 B** / 硬线 **320,000 B**，安装包内部 **1,800,000 B** / 硬线 **2,000,000 B**。`scripts/measure-first-screen.mjs` 新增 `--target`（超内部预算只 WARN、不 exit，硬线仍 exit 1），汇总行保留 `headroom` 并另起一行打印 `target=… gap=…`；`packaging/{installer,portable,verify-installer}.ps1`、`packaging/README.md`、README、AGENTS、STATE、ADR-0012/0017 同步。CI 不写死预算字面量（改前 6 处、改后 0 处，有改前正向对照）。便携 zip 门槛与安装包共用 2,000,000 B 硬线，不另设内部预算。`--target 280000` 曾把 `280000` 当目录（`readFileSync` ENOENT），`positional` 改为跳过所有 `--` flag 及其后一个值，正反例 exit 1 / exit 0 各一次。
- **AI 提示词拆分**：格式与安全规则（JSON Lines 协议与示例、`quote` 约束、最多 1 条 revision、`overall` 总评、不编事实不换语体、`<前文>/<选区>/<后文>` 标记）内置为 `ANALYSIS_SYSTEM_PROMPT`，不进设置、不可编辑；设置里只剩「批注提示词（作者偏好）」，字段改名 `analysisPrompt` → `userPrompt`。旧存档按指纹迁移：第 26–34 轮默认提示词（795 字，FNV-1a `ebaf07b2`）自动换成新的 `DEFAULT_USER_PROMPT`，自定义值原样保留、不删不改写；`promptVersion` 升 3，自定义值保留原版本标记。落盘不再写 `analysisPrompt`。逐条追问的 system 提到 `DISCUSS_SYSTEM_PROMPT`。删掉「提示词里没提 JSON 格式」这条已失效的事后警告（格式规则已内置）；设置对话框的字号钳制原样保留。
- **Esc 后焦点回正文**：退出预览、退出源码、关快速打开之后，焦点回到 `.ProseMirror`，下一次击键不再静默丢失（退出后 `activeElement` 曾是 `body`，4/4、3/3、3/3 复现）。`FindBar` 的两个 Esc 分支改成 `preventDefault()` + `stopPropagation()`，一个 Esc 只关查找，不再连带退出源码/预览；关闭查找后按模式分派焦点——源码模式回 `textarea.source-editor`（`.ProseMirror` 不在 DOM，`focusEditor()` 是空操作），预览模式显式不聚焦（预览 pane `contentEditable=false` 且无 `tabindex`，只读、快捷键由 window 处理），再按一次 Esc 才退出预览并聚焦正文。
- 测试：`npm test` 22 个文件 **295** 条（287 + 提示词拆分 8，全部走既有测试文件，未新建文件）；`npx tsc --noEmit`、`npm run build`、`npm run verify`、`npm run roundtrip` 均 exit 0；首屏 gzip **286,056 B**（预算内部 310,000 / 硬线 320,000，距硬线余 33,944 B）；主 chunk `index-CYKrmZl7.js` 895,227 B raw / 279,028 B gzip。本轮不发版，原始命令输出与截图见 `docs/iteration/round-35/` 与 `shots/round-35/`。
- UNVERIFIED：真模型在格式/偏好分离后是否更听话（无 Key，只验了请求体形状）；安装包新预算线的真实字节（本轮不打包，只做静态与语法检查）；CI 换线后的实际绿（不 push）；`packaging/verify-installer.ps1` 新增体积段的真机运行（会写 `release/`）；`scripts/qa15.mjs` 因提示词拆分失效的 4 行（不在任何门禁里，下一轮修）；WKWebView 下的 Esc 焦点行为（本机 Windows）；预览模式下关查找后焦点暂时在 `body`（只读视图无输入目标，下一轮可加 `tabIndex={-1}` + `.preview-pane:focus { outline: none }`）。

**第 36 轮（同一未发版区间）**

- **Mermaid 图表（产品负责人第 32 轮批准，ADR-0017 落地）**：```` ```mermaid ```` 代码块下面挂一个预览 widget，`graph TD; A-->B` 这类流程图直接出图。实现是「ProseMirror 插件 + 装饰」，不改 codeBlock 节点、不改 Markdown 序列化：`src/lib/mermaidLazy.ts`（惰性 loader / 按 code 缓存 / 失败不抛错 / 测试钩子）+ `src/lib/mermaidLoader.ts`（只被动态 `import()`，同 `katexLoader.ts`）+ `src/lib/mermaidPreview.ts`（插件，400 ms 防抖、同 hash 复用 widget DOM）+ `src/mermaid-dist.d.ts`。首屏 **0 B**：`dist/index.html` 0 处 `mermaid`、首屏集合 `files=3` 不含 mermaid chunk；打开含图文档才下载 `mermaidLoader` chunk（27.51 kB gzip）与对应图类型 chunk。渲染失败把 widget 换成 `is-error` + 一句「图表没渲染出来，代码块内容仍是原文，可以继续编辑。」，代码块文本逐字不动（E2E 已验证）。依赖 `mermaid` 精确锁 11.12.0（`AGENTS.md` §4 的例外，理由与实测见 ADR-0017）。
- **修数据丢失**：「全部替换」不再清空页边批注。`replaceEvery` 里那句 `setAnnotations([])` 删掉后，整篇替换与普通编辑走**同一条**事务映射路径（`src/App.tsx` 的既有 `transaction` 监听器：`addToHistory === false` 才跳过），批注自动跟随，不需要第二套位置算法。E2E：种子批注「很蓝」、「天空」→「天」三处不等长全部替换后，正文变「天很蓝。天很蓝。另一段也有天。」、批注仍是 1 条且高亮仍是「很蓝」（单次映射 from 3→2、to 5→4；双映射会缩成「很」）、`.sidelight/annotations/批注.json` 里 `to - from === 2`；`Ctrl+Z` 后位置回到 3–5，条数不变。
- **修丢键**：进源码框后焦点不再掉在 `body`。三个入口（`enterSourceFor`、`switchView`、工具栏「源码」）与 `Ctrl+/` 现在都用模块级 `focusSourceEditor()`（rAF + `textarea.source-editor`，与关查找条同一选择器）；`Ctrl+/` 退出源码回正文（`focusEditor()`），打字真的落进正文。载入即源码（含引用式链接定义的文档）**不抢焦点**，E2E 专门拦这条回归。
- 发版：`.github/workflows/release.yml:262` 的 `while read` 管道后补 `|| true`——`grep -- '-macos-arm64.zip'` 在 0.29.0 起资产改名后必然 0 命中，`pipefail` + `set -e` 让同一 tag 的重发必红。
- 文档：`README.md` 依赖从「两组」改「三组」并补 Mermaid 一行（`AGENTS.md` §4 要求）+ 首屏/安装包实测数字；`docs/typora-gap.md` 的 Mermaid 从「无」改「有（第 36 轮，惰性渲染）」；ADR-0017 补「第 36 轮实测」节，用真字节替换预估并明写四处偏离原方案。
- 门禁：`npx tsc --noEmit`、`npm test`（**23 个文件 301 条**，新增 `src/lib/mermaidLazy.test.ts` 6 条）、`npm run roundtrip`（`docs/roundtrip-report.md` 无 diff，source 7/7 等值）、`npm run verify`、`npm run build` 全 exit 0；首屏 gzip **288,256 B**（+2,200 B，预算内部 310,000 / 硬线 320,000，距硬线余 31,744 B）；安装包 `-AssocDryRun` 实测 **1,299,777 B**（正式包预估 1,297,630 B，内部预算 1,800,000 / 硬线 2,000,000 内）。
- UNVERIFIED：正式安装包字节（只跑 dry-run，跳过 2,000,000 硬判）；WebView2 宿主里的真实 mermaid 渲染（只用 CDP 浏览器）；HTML 导出与预览面板的图形（本轮不做，见 ADR-0017 已知限制）；中文输入法下的源码框聚焦（`keyboard.type` 只发 ASCII）；>1 MB 文档含 5+ 张图的滚动性能（只测 1 张图）；mermaid 各类图的真实报错文案（只测一个坏语法样本）。

**第 37 轮（同一未发版区间）**

本轮按计划 §3 的**单执行代理降级方案**执行：只做 T1 + T3 最小集，**T2（Mermaid 嵌套围栏 + SVG id 按实例唯一）整体顺延第 38 轮**（第 36 轮功能尚未发版，晚一轮没有对外影响；不压缩 E2E）。T4 零字节、四条正反例全过，提前收工后顺手做了。

- **表格列宽可拖拽**：`ReusableTable` 改 `configure({ resizable: true })`，`columnResizing` 插件本就在静态依赖里（JS 增量 0 B，只加 CSS）。`styles.css` 新增 `.column-resize-handle` 竖线与 `.editor.resize-cursor` 光标，并给 `.editor th, .editor td` 补 `position: relative`（handle 是插在单元格里的 widget，没有定位祖先会跑位）。E2E 拖第一列表头右边界 +90 px：`handleSeen:true`、首列 192 → 278 px（+86）、`<col style="width: 278px">` 出现；拖前 `dirty=false`，拖后仍 `false`、`Ctrl+S` 后字节与拖前逐字节相同（列宽不进 Markdown）。
- **修「进源码后首次击键插到文首」**：`focusSourceEditor(ratio?)` 按富文本光标的相对位置落 caret（`selectionStart = round(len × ratio)`），`Ctrl+/` 与横幅/确认框两条入口都传比例；关查找条那条路径**不传** ratio（一次 Esc 不能丢写作位置）。顺序改成「先 setSelectionRange 再 focus」——反序实测视野停在文首（本次实测 `scrollTop` 0 → 2640 / 5209）。E2E 用 120 段长文：`Ctrl+/` 后 `active=TEXTAREA.source-editor`、`selectionStart 1936 / 3857`（ratio 0.502）、`scrollTop 2640 < max 5209`、打 `ZZZ` 落在光标处（`selectionStart === before + 3`）；`Ctrl+F` → `Esc` 后 `selectionStart` 不变（1939 → 1939）。
- **文档**：`docs/typora-gap.md` 全表复核——7 条已实现却仍写「无」的移进「已经有的」（自动配对括号与引号、智能标点、缩进与反缩进、大纲折叠、新建/重命名/删除文件、快速打开、最近文件），删掉重复的「行内 HTML 有保真」行（「缺的」里已有「保真但不渲染」），「字号与缩放」拆成「字号缩放（有，`Ctrl+Alt+0` 复位）」与「视图缩放（无）」，主题改「明 / 暗 / 跟随系统三档」，表格行列补「表头边界可拖拽改列宽」，新增「工作区相对路径图片显示」一条（`assets/a.png` 显示破图，P1）。计数按行重算：**已有 28 项、缺 12 项**（改前标题写 22/17，实际缺表本来就有 18 行）；`README.md:82` 与 `AGENTS.md` 的同一句同步；`README.md:50` 能力句补「表头边界可拖拽改列宽」，`:74` 补限制句「列宽不写进 Markdown，重开按内容重新均分」。
- 门禁：`npx tsc --noEmit` exit 0；`npm test` **23 个文件 301 条**全过（T1 不加单测，与第 36 轮同）；`npm run roundtrip` rich 5/7、source 7/7（与第 36 轮同，`04-reference-links.md` 与 `06-task-list.md` 的既有差异不变）；`npm run build` exit 0；首屏 gzip **288,411 B**（+155 B，只多 T1 的 CSS；`files=3`，首屏集合无 `mermaid`/`lazy`/`katex`；内部预算 310,000 / 硬线 320,000，距硬线余 31,589 B）。
- **T4（零字节，`scripts/measure-first-screen.mjs`）**：距硬线不足 5% 时打一行 `WARN 首屏距硬线 …`——预算余量从 21,744 B 掉到 0 之前不再静默（第 36 轮刚单轮 +2,200 B）。只提醒，不改参数、不改 exit 码。四条正反例按计划全过：默认 `headroom=31744` 无 WARN、`PASS`、exit 0；`--max 300000` 出 WARN（余 11,744 B）仍 `PASS`；`--max 288000` 仍 `FAIL` exit 1（WARN 不吞 FAIL）；`--target 280000` 不报 ENOENT、打「超过内部预算」、exit 0。
- UNVERIFIED：WebView2 宿主里的表格拖拽与源码框 caret（本轮只用 CDP 浏览器）；拖过的表在 HTML 导出里会带出 `colwidth="278"`（DOM 已实测；没有 `<colgroup>`，宽度不生效）——本轮按计划不改，第 38 轮给 `TableCell`/`TableHeader` 的 `colwidth` 加 `renderHTML: () => null` 并用 E2E 断言导出片段；暗色主题与 150%/200% 缩放屏下的 handle/caret；真实中文 IME 下的源码框 caret。

**第 38 轮（同一未发版区间）**

- **工作区相对路径图片能显示**（`assets/xxx.png` 原名破图，P1，第 32/33/34 轮连续记录）：新增 `src/lib/assetResolve.ts`（模块级缓存 + 在飞去重 + 代际 + 订阅，纯函数可在 Node 单测）与 `src/lib/assetImage.ts`（`ResolvingImage` NodeView，只把 DOM 的 `src` 换成本地 blob URL）。正文节点与 `.md` 字节不变，仍是 `assets/…`（保存后逐字节等于种子，0 处 `blob:`）。编辑视图、预览面板都能显示；换目录（根 → `sub/` → 回根）两个方向都对，图片不因切文档串到别篇。单文件打开（无目录句柄）与宿主文档**不**按工作区根解析，避免显示别人的图。E2E 十段全绿；`npm test` 24 个文件 **311** 条（新增 `assetResolve.test.ts` 5 条）。
- **修预览面板在源码态载入后永久破图**：源码模式下编辑器不挂载、没有 NodeView，缓存没人填；`PreviewPane` 改为自订阅 + 自发起解析（`useSyncExternalStore` 快照 = 资产版本号）。红/绿对照实测：去掉该 effect 时 `naturalWidth:0`、`src` 仍是 `assets/d.png`；恢复后 `naturalWidth:1`、`src` 是 `blob:`。
- **智能标点不再改写含 `|` 的行**（数据保真）：手打的 GFM 表格分隔行 `| --- | --- |` 原样保留，不再变成 `| —- | —- |`。`smartInput` 加第 4 个可选参数 `lineBefore`（只在按 `-` 时由插件传入整行文本），命中返回 `null` 让后面的横向分隔线输入规则照常收到输入（空段落打 `---` 仍出 HR，E2E 实测 `hrCount:1`）。
- **Mermaid：列表项与引用块里的围栏也渲染**（第 37 轮顺延的 a 半）：`listMermaidBlocks` 由 `doc.forEach` 改 `doc.descendants`，嵌套节点用绝对 `pos` 挂 widget。E2E 三篇（列表项 / 引用块 / 顶层）各 `previewCount:1`、`isReady:true`、`svgCount:1`，代码块原文逐字不变。b 半（两段相同代码的 SVG id 按实例唯一）仍不在本轮。
- 文档：`docs/typora-gap.md` 把「工作区相对路径图片显示」从「缺的」移进「已经有的」（**29 项有 / 11 项缺**），「文件与工作区」子计数 2 → 1，下一批重排 3 条；`README.md` 能力句与限制句同步（单文件打开仍显示不了），智能标点限制补一句；`AGENTS.md` 测试计数与差距计数同步；ADR-0017 已知限制补一行。
- 门禁：`npx tsc --noEmit` exit 0；`npm test` **24 个文件 311 条**全过；`npm run roundtrip` rich 5/7、source 7/7（不碰序列化）。
- UNVERIFIED：真实文件夹句柄与权限三态（CDP 是假 FSA）；宿主（WebView2）单文件打开时的相对路径图片（宿主只有 `/__doc`，无目录句柄，按其路由要宿主轮）；插入图片后「立刻显示」（假盘 `createWritable().write()` 把 Blob 当文本写，PNG 会坏）；宿主内 NodeView 的图片选中/拖拽；真实中文 IME 下表格分隔行的输入；大量图片（>50 张）的 blob 内存与切文档撤销；暗色主题与 150%/200% 缩放屏下的图片与预览。

**第 39 轮（同一未发版区间）**

- **表格单元格里的 `<br>` 能读回来了**（P1，自产自读不一致）：单元格里 `Shift+Enter` 当场是真换行、`.md` 里也是 `<br>`，但载入时 `escapeHtmlForParse` 把 `<br>` 转成文字，重开就显示成字面 `3A<br>B`。新增纯函数 `src/lib/tableCellBreaks.ts`（只在 `tableCell`/`tableHeader` 内部把文本节点切成 text / hardBreak，无表文档返回同一对象不复制；带格式的文本不拆，避免 `**A<br>B**` 第一次保存变成 `**A**<br>**B**` 让这张表退出整块复用）与 `src/lib/tableCellBreaks.test.ts`（8 条），接进 `setMarkdown`。E2E：载入 `| A<br>B | c |` 后 `th/td br` 1 个、单元格文本不含字面 `<br>`、`Ctrl+S` 字节逐字节等于种子；另做真实路径（`Shift+Enter` → 源码含 `<br>` → 切回富文本仍读成换行）。
- **相对路径图片支持 `../` 与 `%20`，解析失败给可见占位**（P1，静默失败）：原来把 `..` 当目录名、`%20` 不解码，两条都静默破图。`assetResolve.ts` 新增纯函数 `resolveAssetSegments`（逐段处理，空段与 `.` 跳过，`..` 从文档目录弹一层、弹出工作区根返回 `null`，非法编码保留原段），`App.tsx` 的解析器改为从工作区根走（保留「工作区名前缀」来源校验，单文件打开/宿主仍不解析）。`assetImage.ts` 改为**解析成功前不写 `src`**：真实目录下改前会先请求相对 URL（dev server 对破图回 SPA 回退 `200 text/html`），改后 `nope.png` 请求数 **1 → 0**（红绿两次输出见 `round-39/impl.md`）；解析不到时加 `data-asset-missing`、`alt`/`title` 写「图片未找到」，`styles.css` 给虚线占位。宿主/单文件（无文档路径）按原样直接显示，不标缺失。`assetResolve.test.ts` 新增 12 条断言。
- **源码模式下查找替换不再假装成功**（P2，静默丢失）：源码态匹配来自隐藏的富文本实例，点「全部替换」计数清零、按钮变灰，但源码框、正文、保存字节都不变。`FindBar` 新增 `unavailableReason`，有值时四个按钮 `disabled`、`.find-count` 留空、渲染 `.find-note` 说明「源码模式下不支持查找定位与替换」；**查找框 `Enter`/`Shift+Enter` 与替换框 `Enter` 都 `preventDefault()` 后直接 return**（只把按钮 `disabled` 拦不住替换框 Enter）。E2E 有牙判据：替换框按 Enter 后 `localStorage['sidelight.doc.v1']` 与按前逐字节相同（改前实测 73 → 69），源码框与 `dirty` 不变；富文本路径不回归（`1 / 2`、全部替换落 2 处、`dirty:true`），`Esc` 一次只关查找。
- **1 MB 载入去掉一次重复的全文序列化**（稳定性/测量诚信）：`loadIntoEditor` 原先对同一条正文调两次入参逐字相同的 `serializeDocument`，提出成一条 `serialized` 给 `baselineLosses` 与 `baselineRef` 共用（语义不变：同一字符串、`\r\n` 归一位置不变）。另加 **8 处行内 DEV 埋点**（`sl-load-start` / `sl-parse-done` / `sl-dispatch-done` / `sl-serialize-done` / `sl-sync-done`，写成 `if (import.meta.env.DEV) performance.mark(...)`，生产由压缩器整句删除）：源码 `performance.mark(` 8 行正向对照、`.tmp/build-r39` 产物 5 个标签 0 命中。本轮实测四段数字与口径见 `docs/iteration/round-39/impl.md`；**不要**把「去掉重复序列化」当成载入变快（1 MB/37,450 段里它只值 ≈64 ms）。
- 体积护栏第二次放宽补记：安装包内部 **45,000,000 B** / 硬线 **50,000,000 B**（产品负责人 2026-11-17）；Mermaid 之后第 39 轮真实打包实测 setup **1,300,711 B**、portable zip **1,622,355 B**。第 35/36 轮条目里写的 1,800,000 / 2,000,000 是历史口径（第 39 轮前口径），保留原文。
- 文档：`docs/typora-gap.md` 计数 **29/11 → 30/11**（新增「表格单元格内换行往返」，图片行补 `../`/`%20` 与占位）；`README.md` 图片句、查找替换句、体积数字与 `packaging/README.md` 体积段同步；测试计数按 `npm test` 实测更新。
- 门禁：`npx tsc --noEmit` exit 0；`npm test` **25 个文件 320 条**全过（新增 `tableCellBreaks.test.ts` 8 条 + `assetResolve.test.ts` +12 条）；`npm run roundtrip` rich 5/7、source 7/7；`.tmp/build-r39` 里 5 个埋点标签 **0 命中**（源码正向对照 `performance.mark(` **8 行**）；首屏 gzip **290,021 B**（比第 38 轮 +591 B，`files=3`，预算内部 310,000 / 硬线 320,000，PASS）。

**第 40 轮（同一未发版区间）**

- **打开→保存不再改写 `H~2~O`（单波浪号）与 `<!-- -->`**（P1，两处保存字节损坏）：GFM 默认把单个 `~` 当删除线，`H~2~O` 解析成 strike 后写回 `H~~2~~O`；`repairHtml` 的字符类不认 `!`，注释被存成 `&lt;!-- --&gt;`。`src/lib/tilde.ts` 注册 marked 行内扩展，只把「不成对的单个 `~`」当文本（`return false` 是空操作——marked 的 `use()` 会落回基础 GFM 规则，实测无效）；`src/lib/html.ts` 的字符类加 `!`，且**只在原文真有同一条未转义片段时**还原注释（避免把讲转义的段落、代码样例改成真标签）。两条 repair 共用新模块 `src/lib/codeScan.ts` 的 `mapOutsideCode`：围栏（含 `> ```` 引用块围栏）、行内代码不参与改写；`repairTildes` 另跳过行内 `$…$` 与 `$$` 块公式。`~~删除线~~` 仍是删除线；E2E 保存字节逐字节等于种子（`H~2~O`、`<!-- 给编辑看的备注 -->` 原样，0 处 `&lt;!--`、0 处 `~~2~~`）。
- **正文里手写的 `\~` 会还原成 `~`**（语义等价，`\~` 在 Markdown 里本就渲染为 `~`）：代码、行内代码、引用块围栏、公式里的 `\~` 一个字节都不动。
- **只读预览恢复正文排版**（P1，连续 3 轮顺延）：预览原来没有排版容器——标题无衬线 32px、正文 16px 无行高、表格无边框、引用无边线。正文排版选择器由 `.editor` 改 `.doc-body`（编辑态同时带两个类），`PreviewPane` 包上 `.doc-layout.preview-layout > .doc-column.preview-column`，预览与编辑同一套排版：Source Han Serif 17px/1.95、36rem 限宽（实测 `576 px`）、表格边框与表头底色、引用左边线 2px（1024 视口也不横向溢出）。顺带修字数明细面板 941px：`maxWidth 360px` + `overflow-wrap: anywhere`（实测 360×285）。
- **连续空段落不再往 `.md` 写 `&nbsp;`**（P2，字节污染）：在标题前或正文中间连按两次 Enter 再保存会多一行字面 `&nbsp;`。新增纯函数 `src/lib/blankParagraphs.ts`，只对正文调用（`joinFootnotes(collapseBlankParagraphs(reused), footnotes)`），规则只收「含整行 `&nbsp;` 的空行段」：围栏内、脚注块、用户手写的 `&nbsp;` 段落、只按一次 Enter 的字节都不动。E2E：文首双击 Enter → 保存 `"\n\n# 标题\n\n正文。\n"`（0 处 `&nbsp;`）、二次保存字节不变；围栏 4 个空行与脚注块 `\n\n\n` 逐字节原样。
- **窗口/标签标题始终跟随当前文档**（P2，身份错）：改过一次文件名后，浏览器标签一直停在改名前那篇的新名字。`document.title` 收成单一来源（`useEffect` 跟 `docName`），删掉 5 处手写标题；`scripts/host-save-acceptance.mjs` 三条断言同步改成与同一次读取的 `docName` 比对。E2E：打开 `键.md` → 改名 `键改.md` → 打开 `乙.md`，标题依次是 `键.md — Sidelight` / `键改.md — Sidelight` / `乙.md — Sidelight`。
- 同时删掉 `Ctrl+N` 新建路径里两行完全重复的「已新建 …」提示。
- 门禁：`npx tsc --noEmit` exit 0；`npm test` **27 个文件 345 条**全过（新增 `tilde.test.ts` 13 条 + `blankParagraphs.test.ts` 9 条 + `html.test.ts` +3 条）；`npm run roundtrip` rich 5/7、source 7/7；`.tmp/build-r40` + measure 首屏 gzip **290,723 B**（比第 39 轮 +702 B，`files=3`，内部 310,000 / 硬线 320,000，余 29,277 B，PASS）。
- UNVERIFIED（本轮）：多行 HTML 注释（`<!--\n…\n-->`）仍还原不了；注释内含 `&` 的仍不还原；同一段文字既写成真注释又用同一段文字讲转义时，讲转义那段仍会被改成真注释；列表项里的围栏与代码内容含仿围栏行；公式里的 `~` 仍会被序列化器转义成 `\~`；宿主窗口标题（`host/Program.cs` 没有 `document.title → Form.Text`）；`scripts/host-save-acceptance.mjs` 改动后未跑（需连 CDP 9222 且会写 `shots/round-06/`）；深色主题下的预览排版与真机缩放；1 MB 文档的 `mapOutsideCode` 耗时。

**第 41 轮（同一未发版区间）**

- **打开→保存不再把正文与代码里的 `<` `>` `&` 写成实体**（P1，静默改字节且保存风险门看不见）。序列化器对非代码文本调 `encodeHtmlEntities`（`& → &amp;`、`< → &lt;`、`> → &gt;`），而 `repairHtml` 只认得「完整标签形状」，于是 `a < b`、`x<3`、`A & B`、`a > b`、围栏里的 `if (a<b)`、行内代码里的 `<kbd>` 全部被改写；反过来讲转义的段落 `写成 &lt;div&gt; 才是字面。` 被还原成真标签。修法：`escapeHtmlForParse` 改走 `mapOutsideCode`（围栏与行内代码不转义，围栏内容才能原样写回）；`repairHtml` 在围栏/行内代码之外做**单遍**实体解码，带三条守卫——① 原文里真的写过这条实体就整类保持（讲转义的段落一个字节不动）；② `&amp;` 只在解出来的 `&` 不会自成实体时才解（`&amp;lt;` 保持，否则作者写的字面 4 字符会变成 1 个 `<`）；③ `&gt;` 落在块首（含引用/列表标记之后）时保持，否则会变成引用块标记。标签还原加名字守卫：原文里没写过该标签名就保持实体（`&lt;div&gt;`、`&lt;/div&gt;` 不再变成真标签）。`mapOutsideCode` 的回调加第二参数 `start`（绝对偏移），`lineStart` 在每行最开头累加，三支共用（`src/lib/codeScan.ts`、`src/lib/html.ts`）。
- **「还有没保存的改动」对话框开着时自动保存不写盘**（P1，用户点「不保存」内容仍留在盘上）。缺陷根因是 2 s 计时器捕获调度那一刻的 `runAutoSave` 闭包；只读 state 的守卫在对话框打开后仍看到旧值。改成五个条件全读 ref（`pendingSwitch` / `pendingConfirm` / `closeRequested` / `closeGuardOpen` / `settingsOpen`，一条 effect 统一同步），并加一条并集 effect：任一对开着就撤掉已排队的自动保存，全关掉且还脏就重新排队（`src/App.tsx`）。
- **查找加「区分大小写 / 整词」两个开关**（P1，用户可见收益）：`FindOptions` 加 `wholeWord`，`findAll` 按命中两端的 ASCII 词字符过滤（`state` 不命中 `states`；中文没有词边界，整词对中文等于不生效，按钮 `title` 写明）；`FindBar` 第一行加 `Aa` / `ab` 两个按钮，带 `aria-pressed` 与按下态样式（复用 `.find-bar button`）。开关只在会话内有效，不落盘。
- 风险门文案更正：`HTML 注释会被丢掉` → `HTML 注释的写法会被改动`（实际是写成实体，不是丢掉）。
- 门禁：`npx tsc --noEmit` exit 0；`npm test` **28 个文件 362 条**全过（新增 `risk.test.ts` 3 条、`html.test.ts` 改写 1 条 + 新增 16 条口径、`find.test.ts` +3 条、`package.json` 的 `scripts.test` 追加一条）；`npm run roundtrip` rich 5/7、source 7/7；`.tmp/build-r41` + measure 首屏 gzip **291,317 B**（比第 40 轮 +594 B，`files=3`，内部 310,000 / 硬线 320,000，余 28,683 B，PASS）。
- UNVERIFIED（本轮）：宿主 `close-request` 下的自动保存拦截（浏览器态没有 host，补测口径写进 `docs/iteration/round-41/impl.md`）；4 空格缩进代码块里的 `<` 仍会被转义（`mapOutsideCode` 只认围栏与行内代码，改前改后字节相同，不算回归）；「缩进 ≥4 的 ``` + 后面跟裸 HTML 行」这种混写文档会丢标签（改前保留实体文本，改后 `<div>` 被当 HTML 块，见 impl.md 已知限制）；多行/含 `&` 的注释与同一篇里既写实体又写裸 `&` 的混写文档；`scripts/data-safety-acceptance.mjs` 因 `.editor` 过期选择器在 148 行崩溃（AGENTS §8 已知的脚本问题，不是本轮回归，该套件记 UNVERIFIED）。独立验收证据见 `docs/iteration/round-41/test.md`（tester 自跑三个 E2E 脚本与全部门禁）。

**第 42 轮（同一未发版区间）**

- **修数据安全缺口：预览（只读）里能改正文并落盘**（P1）。预览下 `Ctrl+F` 后「替换 / 全部替换」可用，点下去正文立刻改、`dirty` 变 true，退出预览按 `Ctrl+S` 就写盘，旁边没有任何说明。现在 `FindBar` 的 `unavailableReason` 增第三态（预览），四个动作按钮置灰并显示说明；`replaceCurrent` / `replaceEvery` 各自第一行加 `if (previewMode) return` 兜底（`src/App.tsx`）。**可见代价**：预览里查找条整体锁住，命中计数不再显示、上一处/下一处不可用，与源码模式同一语义（只锁替换需要给 `FindBar` 加第三态并重写第 39 轮断言，排在下一轮）。
- **键盘正向离开正文**（P1，WCAG 2.1.2 键盘陷阱）：正文里按 `Esc` 把焦点移到正文之后的状态栏字数入口（`.status-bar .stats-trigger`，只打开只读面板、无副作用），Tab 不再被正文吞掉；不选页边批注卡片，因为卡片按钮是「采纳 / 忽略 / 联网核对」，误按 Enter 会改正文或发请求。新分支加 `event.isComposing || keyCode === 229` 守卫（组合输入期间不夺焦），并只加在这个分支，不改查找/设置/源码/预览既有的 Esc 行为。正文里 `Tab` 仍是插入两个空格（第 24 轮）。
- 工具栏 6 个格式按钮（H1/H2/B/I/S/行内代码）加 `aria-pressed` 与按下态 `.is-on`，复用既有 `.toolbar button.is-on` 样式（零新增 CSS）；I/S/`</>` 用组合类名保住原有的斜体 / 删除线 / 等宽打字样式。
- 表格工具条：7 个按钮补 `title`，删除三项加 `.is-danger` 用危险色，插入组与删除组之间加分隔线（`src/App.tsx`、`src/styles.css`）。
- 正文按键盘进入时不再套整列 2px 焦点框：`.doc-body:focus-visible { outline: none }` + `.doc-scroll:has(.doc-body:focus-visible) { box-shadow: inset 0 2px 0 0 var(--accent) }`，指示器钉在滚动容器上，长文滚到中段仍可见。
- **退出源码不再无条件整篇重解析**（P1 性能）：`applySource` 先判「源码框没动过 且 正文现在序列化出来就是这段」再决定是否 `setMarkdown`。判据必须用新抽出的 `serializeBodyNow()`——`currentMarkdown()` 在源码模式里返回 `sourceText`，拿它比会恒真、源码编辑被静默丢掉。`sl-parse-done` 物证：不改源码进出一次计数不变，改一个字再退出 +1。实测 `sourceToggle.outMs`：100 KB/1,024 段 **242 → 88 ms**、1 MB/1,024 段 **1,323 → 333 ms**、1 MB/4,096 段 **5,537 → 477 ms**（`sl-parse-done` 不再增加；剩余时间主要是 4k 段 DOM 重建）。
- 三个全文扫描型 repair 加精确守卫（都是必要条件，不是启发式）：`repairTildes` 查 `\~`、`repairCalloutMarkers` 查 `\[!`、`repairHtml` 查 `&lt;`/`&amp;`/`&gt;`。1 MB 实测每键：`repairTildes` 2.8 → 0 ms、`repairCalloutMarkers` 0.9 → 0 ms、`repairHtml` 1.6 → **0.6 ms**（独立验收实测两次都是 0.6；计划门槛 ≤0.6，三次 `includes` 各 0.2 ms 是必跑成本）、`serializeDocument` 合计 8.5 → **3.2–4.8 ms**（实施与验收两次实测）。
- 保存唯一出口补单测：新增 `src/lib/serializeDocument.test.ts`（10 条，假源 `{ getMarkdown }`，不引入 tiptap），覆盖尾部换行/CRLF 结尾、frontmatter 与注释脚注拼接、三条 repair 与原文实体守卫、表格块复用、连续空段落收口。
- 门禁：`npx tsc --noEmit` exit 0；`npm test` **29 个文件 372 条**全过（新增 `serializeDocument.test.ts` 10 条，`package.json` 的 `scripts.test` 末尾追加）；`npm run roundtrip` rich 5/7、source 7/7；`fidelity-acceptance` 19/19、`keyboard-acceptance` 52/52；`npm run verify` 首屏 gzip **291,766 B**（比第 41 轮 +449 B，内部 310,000 / 硬线 320,000，余 28,234 B，PASS）。
- UNVERIFIED（本轮）：真实中文输入法组合输入期间按 `Esc` 不夺焦、不丢拼音候选（CDP 造不出真 IME）；预览/源码锁定的组合在真机上的观感；`docs/iteration/round-42/impl.md` 记了 3 处与计划的偏差（`keyboard-acceptance` 改到全部改动后跑一次、T3 验收 2(c) 挪到 (b) 之前、`repairHtml` 实测优于 0.6 ms 门槛）。

**第 43 轮（同一未发版区间）**

- **预览（只读）真正只读：编辑命令一律无效**（P1，数据安全，续第 42 轮同一契约）。第 42 轮只锁了查找替换，同一契约下 `Ctrl+K`/`Ctrl+M`、工具条格式按钮、插入菜单与表格条仍会改正文并触发自动保存（改前实测：预览里点 H1 后 `h1` 1→2、`dirty:true`，2.6 s 后字节被写脏）。统一改成「`viewMode !== 'edit'` 就挡」：`run()` 加守卫（工具条格式 / 插入命令 / 表格条的唯一出口）、window `keydown` 的 `Ctrl+K` 与 `Ctrl+M`/`Ctrl+Shift+M` 先 `preventDefault()` 再给一条「先按 Ctrl+/ 或 Ctrl+Shift+P 回编辑」提示、`Ctrl+1–6`/`Ctrl+0` 静默早退、6 个格式按钮与「插入 ▾」加 `disabled`、表格条只在编辑视图渲染、`openMathAtCursorRef` / `openLinkAtCursorRef` 各自第一行加守卫、`switchView` 离开编辑时收起插入菜单（图片 / 公式 / 链接三项不走 `run()`）。`FindBar` 的替换、专注 / 打字机、表格条现在同一套只读口径。**可见变化**：预览与源码里 `Ctrl+K`、`Ctrl+M`、工具条格式 / 插入命令、表格条一律不可用（源码里点格式按钮不再改隐藏文档）。
- **预览按 `katexLazy` 的契约自行 `ensureKatex`**（防御性修复，不是「修好了公式卡死」）。`renderToString` 的契约是「未就绪返回空串、调用方先 await `ensureKatex()`」，预览是唯一没履约的调用方；`PreviewPane` 新增一条 `useEffect`（`hasMath && !ready` 时发起加载）。**口径**：正常路径由 `setMarkdown` 的预取覆盖，验收断言 9 **改前也是绿的**（`.tmp/e2e-r43-impl-t1.before.log`：`katex:2`、`pendingNote:0`）；真正卡死的是「在预览里按 `Ctrl+M` 插空公式」，该入口已被上一条守卫堵住。本条只锁契约，不得当作修复证据。
- **拖入 `.md` 不再静默失败、也不再导航**（P1）。改前 `dragover.defaultPrevented=true`（ProseMirror 挡了）但 `drop.defaultPrevented=false`，文档无变化、无提示。新增 window 级 drag 守卫：`dragover` 只在 `types` 含 `Files` 时 `preventDefault()`；`drop` 判 `event.defaultPrevented` 后让开（图片拖入由 ProseMirror 的 `handleDrop` 先接住），否则挡下并提示「拖入的文件不会直接打开：请用「文件 → 打开文件」（Ctrl+Alt+O）」。E2E：编辑区内与编辑区外都 `dropPrevented:true` + 提示、正文与 `location.href` 不变、`dirty:false`；下层已 `preventDefault` 的 drop 不弹提示。宿主 `OnNavigationStarting` 的导航取消本轮不做。
- **公式 / 链接弹层 `Esc` 只取消弹层**（P2，与第 35 轮 `FindBar` 同族）：`MathInlineEditor` 与 `LinkEditor`（两个输入框）的 `Escape` 分支补 `event.stopPropagation()`，一次按键不再既关弹层又退出源码 / 预览。E2E：弹层开着 → `Ctrl+Shift+P` 进预览 → 一次 `Esc`，`.link-editor` 0 且 `viewMode` 仍是 `preview`（改前是 `edit`）；编辑态 `Esc` 仍取消弹层（正对照）。
- **两个精确快路径 + 死符号清理**（P2，性能 / 内部质量）：
  - `classify` 归一化 CRLF 后加**精确等价短路**（`if (beforeText === afterText) return []`）：六个损失族与空行判定全部要求前后不同，相等时不可能有损失；省掉 `diffLines` 数空行（1 MB / 2,050 行实测 76.8 ms）。`risk.test.ts` 新增 5 条（表格+标题 / 脚注 / 公式+注释 / CRLF 归一 / 正对照，`npm test` 372 → 377 条）。**这 5 条改前也是绿的**（`risk.test.ts:14-17` 已有同型断言），只锁语义；快路径落地的正向证据是 `git grep -n "if (beforeText === afterText) return" -- src/lib/risk.ts` = 1。
  - `applySource` 把 `syncDocInfo(editor)` 移进 `if (!skipReparse)` 块：源码往返且正文一字未变时不再重算大纲 / 字数 / 当前章节（1 MB 约 24 ms）；`setDirty` 留在块外。E2E 正对照（改源码 → 回编辑）：大纲含新标题、`.stats-trigger` 11 字 → 12 字、`dirty:true`；跳过支（100 KB）：`sl-parse-done` 5 → 5、正文不变、`dirty:false`。**这一条改前也绿**（改前无条件跑），锁的是「条件写反」。
  - 删死符号：`App.tsx` 的 `serializeBody`（0 调用）与悬空注释、`session.ts` 的 `clearSession`（0 引用）、`App.tsx` 的 `serializeDocumentBody` import；`src/lib/serializeDocument.ts` 的 `serializeDocumentBody` **保留**（`scripts/fidelity-acceptance.mjs` 三条活引用，改后 `git grep` 仍 4 命中）。
  - 首屏口径注记：`scripts/measure-first-screen.mjs` 头注释与 `README.md` 写清尺子只数 `dist/index.html` 的静态引用，不含启动后立刻动态 import 的 `MarginRail-*.js`（gzip 2,327 B），实际首载 ≈ total + 2,327 B；不动 `--max/--target` 阈值。
- **发布文档与发现性**（P2）：
  - `README.md` 下载节新增 Windows 首次安装块：**先看 Microsoft WebView2 运行时**（Windows 11 自带；没有时安装器中止安装，给下载链接）、SmartScreen「更多信息 → 仍要运行」、默认安装路径与「开始菜单 / 卸载见 `packaging/README.md`（尚未人工验）」、Windows 可用的校验命令 `Get-FileHash` / `certutil`、便携包；macOS 校验行改成「校验（macOS）」。
  - `README.md` 查找替换句后加粘贴说明（`Ctrl+V` 保留格式、`Ctrl+Shift+V` 纯文本，浏览器原生键、桌面宿主未验证）；「现在不能做什么」的键盘边界补第四条（预览 / 源码里工具条格式、插入命令与表格条都不可用）。
  - 计数一次改齐：`README.md` 差距 **29/11 → 31/10**、`docs/typora-gap.md` 三处标题 `已经有的（30）→（31）`、`缺的（11）→（10）`、`编辑与格式（3）→（2）`、`AGENTS.md` 末句 `30 项有、11 项缺 → 31 项有、10 项缺`；`typora-gap.md` 搬一行「粘贴为纯文本」（标「浏览器原生键」）、列宽补「只在本次会话内」、视图缩放区分整页 / 正文字号、拖入行补第 43 轮现状。
  - `ShortcutsDialog` 加 `Ctrl+Shift+V` 行（标签写明「浏览器原生键」），文件头注释从「不写浏览器保留的组合」改成「浏览器原生键必须标注来源」。
- 门禁：`npx tsc --noEmit` exit 0；`npm test` **29 个文件 377 条**全过（`risk.test.ts` +5）；`npm run roundtrip` rich 5/7、source 7/7；`npm run verify` 首屏 gzip **292,046 B**（比第 42 轮 +280 B，内部 310,000 / 硬线 320,000，余 27,954 B，PASS）。
- UNVERIFIED（本轮）：真实拖入图片（合成的 `DataTransfer` 走不进 ProseMirror 的 `handleDrop`，只能验证「下层已 `preventDefault` 就不弹提示」）、宿主 WebView2 里的拖入与导航、`Ctrl+Shift+V` 在桌面宿主里的行为、真实中文输入法下弹层 `Esc`、首屏刻度外的 `MarginRail` 增量（按静态读数 ≈2,327 B 计）。

**第 44 轮（同一未发版区间）**

- **手打 `- [ ] ` / `- [x] ` 直接建任务项，保存写回 `- [ ] `**（P1，数据安全）。改前在无序列表里打 `- [ ] 甲` 只得到普通列表项，字面 `[ ]` 留在正文，`Ctrl+S` 后盘上是 `- \[ \] 甲`——反斜杠写进了用户的 `.md`。新增 `src/lib/taskListInput.ts`：输入规则只在 `bulletList > listItem` 里生效，把当前 `listItem` 换成 `taskList > taskItem`（列表前后各留一段，兄弟项一个字节不动），规则末尾必须字面空格（`\s` 会被 Enter 复用而误触发）。同时去掉 `TaskItem` 自带的输入规则（它在 `listItem` 里恒失败，却会在普通段落里把字面 `[ ] ` 变成任务项；现在单打 `[ ] ` 保持字面，与 Typora 一致）。E2E U1–U8 全过：任务项计数 / `data-checked` / 续写 / 回车续项 / `[x]` 勾选 / 保存字节 `- [ ] 甲乙`、`- [x] 已办`（无 `\[`）/ 三个负例（链接行、单打 `[ ] `、有序列表 `1. [ ] 甲`）/ 普通项不被吃掉。
- **深色主题下打印 / 另存 PDF 用浅底深字**（P1，用户可见）。`@media print` 原来只隐藏界面、没覆盖配色，深色用户打印得到 `rgb(233, 230, 224)` 的浅字落在白纸上。`src/styles.css` 的打印块加一组打印专用变量（三个选择器覆盖默认浅色 / 手动深色 / 跟随系统深色，`--paper`/`--paper-raised`/`--panel` 用纯白省墨），`src/lib/export.ts` 的导出模板加 `@media print` 块。E2E V1–V4：屏幕媒体下深色不变（`rgb(233, 230, 224)`）、打印媒体下 `rgb(29, 32, 35)` + `color-scheme: light` + `--paper: #fff`、还原屏幕不变、去掉 `data-theme` 后系统深色 + 打印仍是浅底深字。
- **只读视图里 7 个工具栏按钮与「分析本段」说清为什么不能点**（P2，用户可见）。预览 / 源码里这些按钮灰着，悬停只说功能名。现在编辑态是功能名（`插入：表格 / 代码块 / 引用 / 任务列表 / 分割线 / 图片 / 公式 / 公式块 / 链接`、`一级标题（Ctrl+1）` 等），非编辑态统一「只有编辑视图支持」；「分析本段」在非编辑态禁用并同样说明，空文档时提示「先写一句，或选中一段要分析的文字」（与 `Ctrl+Enter` 的 toast 同口径）。
- **模拟分析不再误报「模型没按约定格式回」**（P2，正确性）。`mockItems` 的单句分支缺 `meta`，而收尾只在收到 `meta` 时认为格式正常，于是任何短段落的模拟分析都会报一次格式错。单句分支补齐同一条意图说明（`src/lib/ai.ts`），`errorCopy.test.ts` +2 条。
- 门禁：`npx tsc --noEmit` exit 0；`npm test` **29 个文件 380 条**全过（377 + 导出 1 + 模拟分析 2）；`npm run roundtrip` rich 5/7、source 7/7；`npm run verify` 首屏 gzip **292,681 B**（比第 43 轮 +635 B，内部 310,000 / 硬线 320,000，余 27,319 B，PASS）；`keyboard-acceptance` **52/52**（tester 独立复跑，跑完已还原 `shots/round-05/`）。
- UNVERIFIED（本轮）：真实中文输入法下的 `[` / `]`（E2E 是 ASCII 注入）；真机「打印到 PDF」的产物（本机无打印机、宿主窗口起不来，只到 `emulateMedia({media:'print'})` 的计算样式层）；导出 HTML 在浏览器里打印的实测（只有按位置切片的单测）；`packaging/README.txt` 的那行改动本轮没有包可验。

**第 45 轮（同一未发版区间）**

- **刷新 / 重开恢复出来的文档，只切视图不再被误判成「有未保存改动」**（P1，数据安全）。改前用户一个字都没改，按一次 `Ctrl+/` 看源码，状态就变成脏：点另一篇弹「切换文档」三选一，按 `Ctrl+S` 会把恢复出来的正文另存成 `未命名.md`，用户以为改动已写回原文件。根因是恢复路径没留下「原文」——保存基线由整串原文生成（带尾换行），而源码模式兜底的 `serializeBodyNow()` 拿不到 `original`，两者只差一个 `\n`。现在 `useState` 恢复器多带一个 `raw`（整串，含 frontmatter 与脚注定义），首次载入 effect 与 `loadIntoEditor` 同口径写 `setOriginalText` / `rawTextRef` / 基线。E2E I1–I6 全过（14 条断言）：恢复后 `Ctrl+/` 恒 `dirty:false`、源码框与 `localStorage` 逐字节相同、切另一篇不弹框、真改一个字仍变脏（正对照）；**I5 走恢复分支**并断言源码框前 3 行是 `---` / `title: 丙` / `---`、末尾是 `丙的正文。\n`，用来守「误把 body 当 raw」（误用时 frontmatter 会整体消失）。**修的是「误判脏」，不是保存落点**：恢复态没有文件句柄时 `Ctrl+S` 仍走「在工作区根建 `未命名.md`」，这是第 28 轮的既定行为，本轮不动。
- **页边批注三处可见性**（P1 + P2×2，用户可见）。
  - 窄窗（≤1119px）抽屉遮罩从 `button` 改成 `div` + `role="presentation"`：原来它是 `<button>`，`button:hover:not(:disabled)`（特异度 0,2,1）压过 `.rail-backdrop` 的 `rgba(18,20,22,0.32)`，指针必然停在满屏遮罩上 → 整页正文被染成 `--accent-wash` 实色（预览态更直接是整屏空白，截图 3,835 B 纯色 → 修后 42,744 B）。改后计算背景 `rgba(18, 20, 22, 0.32)`、`elementFromPoint` 命中 `DIV.rail-backdrop`、`.doc-column` 字数前后相等、深色主题同值；键盘出口不变（抽屉「关闭批注」+ `Esc`）。
  - 预览 / 源码视图不再渲染「批注」开关（那两个视图本来就不渲染页边栏，开关带 `aria-controls="margin-rail"` 却指向不存在的节点）；切到非编辑视图时把抽屉状态收掉，避免只剩遮罩没有面板。
  - 修订卡的「→」回到行内流：`.note-diff` 由 `display:flex; flex-wrap:wrap` 改回 `display:block`，`.diff-arrow` 补 `margin: 0 4px`（JSX 三个 span 之间没有空白，这 4 px 是必需的）。箭头落在旧文末行或与新文同行都合格，断言用「主判据 + 反箭头独行守卫」两条同时成立；1440 与 1024 抽屉两处都过。
- **安装器三处**（P1 + P2×2，安装 / 体积）。`packaging/installer.nsi`：① `SetOutPath "$INSTDIR\www"` 之前加 `RMDir /r "$INSTDIR\www"`——原来每次升级都把上一版的整份 `www` 留在原地，每升一次 +3.85 MB；实测放一个旧 hashed chunk 后重装，改前 `staleChunkStillThere=True`、`www` 98 文件 / 3,853,094 B，改后 `False`、97 文件 / 3,848,092 B（等于 `dist`）。② 主节加 `SectionIn RO`，组件页里这一项灰选、不可取消（原来取消唯一必装节后安装器照常报成功、磁盘上什么都没有）。③ 加 `MUI_ICON` / `MUI_UNICON` / `Icon` 指向 `packaging\sidelight.ico`（与宿主 exe 同一份）：提取 32×32 图标算哈希，改后 `new == host`、`new != old`。
- 门禁：`npx tsc --noEmit` exit 0；`npm test` **29 个文件 380 条**全过（本轮不加单测，条数不变）；`npm run roundtrip` rich 5/7、source 7/7；`npm run verify` 首屏 gzip **292,707 B**（比第 44 轮 +26 B，内部 310,000 / 硬线 320,000，余 27,293 B，PASS；主 chunk 910,048 B raw / 284,889 B gzip）；`installer.ps1 -AssocDryRun` 实测 setup **1,304,634 B**（固定 `dist` 下连编两次同值；只写 `.tmp`，`release/` 三份文件 SHA256 开工前后逐字节相同）。
- UNVERIFIED（本轮）：`setOriginalText(raw)` 的**保存字节**效果无断言覆盖（恢复态无句柄，保存落点是 `.tmp` 的固有路径；源码框、`dirty`、`localStorage` 三样读数都不经过这个 state）——只与 `loadIntoEditor` 对齐口径，不承诺字节变化；组件页「取消勾选主节 → 装出空目录」的 UI 复现（向导点击不可脚本化，只有 NSIS 语义 + `SectionIn RO` 静态计数）；setup.exe 图标的真机观感（只到 32×32 提取哈希）；`typora-gap.md` / `typora-features.md` 3 处过期（按计划排下轮，本轮未改）。

**第 46 轮（同一未发版区间）**

- **卸载只删自己写的文件**（P1，数据安全）。`packaging/installer.nsi` 的卸载段原来是 `RMDir /r "$INSTDIR"`——目录页（`:48`）允许把安装目录指到任意已有目录，用户选成 `D:\Apps` 时卸载会把整个目录连同别人的文件一起删掉。现在按名单逐个 `Delete`（8 个载荷 + `assoc-plan.txt` + `host.log*` + `state\recent.json*` + `uninstall.exe`），`www\` 与 `webview2-data\` 仍递归删（整目录都是我们的 / WebView2 的），宿主状态目录只删自己的 `recent.json*` 再非递归删空目录，最后才非递归 `RMDir "$INSTDIR"`。实测（静默装到 `.tmp`，A/B 两段）：A 段放两个用户文件 + `host.log`/`host.log.1` + `state\{recent.json,mine.txt}`，卸载后 `keepMe=True herDoc=True userStateKept=True recentGone=True logGone=True`，目录只剩用户那三样；B 段干净目录（只放 `state\recent.json`）卸载后 `dirExists=False`。改前用旧包跑 A 段是 `keepMe=False herDoc=False userStateKept=False dirExists=False`。
- **发布链两道「别装错包」的门**（P1 + P2×2，安装）。① `installer.ps1` / `portable.ps1` 断言 `host\bin\Sidelight.exe` 的 FileVersion 等于 `package.json`（原来只验 setup 自己，而 setup 的版本本来就由 `package.json` 带入，stale `host\bin` 测不出来）：把 `package.json` 临时改 0.32.2 时两条都 exit 1 并打印「FileVersion 是 0.32.1.0，package.json 是 0.32.2」，改回 0.32.1 后 `git diff -- package.json` 为空。② `verify-installer.ps1` 开头打印 setup 的大小 / mtime / FileVersion 并与 `host\bin` 比批次，不同批记 UNVERIFIED（不再默默验旧包）；加 `-Setup <路径>`（相对路径按仓库根解析）与 `-PreflightOnly` 两个参数。实测默认的 `release/` 旧包报 `setup=824,595 B … FileVersion=0.31.1.0` + `UNVERIFIED … 装的是别的批次的包`、`preflight（1 UNVERIFIED）`；当轮新包 `0 UNVERIFIED`。③ `%LOCALAPPDATA%` 不可写时 marker 写不进只记 UNVERIFIED、不再抛错退出（受限环境原来一条断言都不跑）。`README.md` / `packaging/README.md` 不再写死安装包字节（每版都不同，只留「以 Release 页 `SHA256SUMS-<版本>.txt` 为准」）。
- **页边「整体评价」不再压住批注卡与模拟提示**（P1，用户可见）。卡片是绝对定位、纵向位置只按正文坐标算，页边栏自己的「未配置 API Key」提示与「我的理解」完全不参与，而面板 `position: sticky; bottom: 0` 停在栏中间当挡板：1440×900 下卡 0 与面板重叠 93 px（3 个按钮全被挡）、模拟提示与卡 0 完全重叠（50 px，一个字看不到）；窄窗抽屉里末卡按钮下半被切 28 px。现在 `App.tsx` 的 layout effect 先量出栏内流内内容底边（`flowBottom`）作为 `floor` 起点，再把「最后一张卡底 − flowBottom」作为 `railSpace` 传给 `MarginRail`，后者插一个 `aria-hidden` 的 `.rail-cards-space` 给面板让位；`.rail-overall` 加 `pointer-events: none`（head/body 仍 `auto`），抽屉里改用 `position: static`。实测 1440×900：卡 0 `top=262`、按钮命中 0 被挡（改前 3）、提示完整（`noticeBottom=249.97 < card0Top=262`）、门 A1/A2 全绿（滚到底 `lastCardBottom=298.5 < panelTop=310.97`）；抽屉 `panel.top=631.03 > lastCardBottom=619.03`（改前重叠 28）。已知残差：静止时末卡底部约 16 px 落在钉住的面板头后面（`795.5 − 779.4`），滚约 20 px 即可点——本轮只承诺「第 1 张卡静止可点 + 每张卡都能滚到不被覆盖」，消掉残差要走「面板改 static」（会改变长文档里的常驻行为），留给产品负责人拍板。
- **Mermaid 图跟着主题重绘**（P1，用户可见）。原来 `configure()` 只在首次加载后跑一次（`ensureMermaid()` 在 `mermaid` 非空时直接返回），缓存又只按代码 hash 分键：浅色下画好的图切深色后连线仍是 `rgb(51,51,51)`，落在 `rgb(28,31,35)` 的容器上对比度 **1.31:1**（WCAG 对图形对象要求 3:1）。现在：`ensureMermaid()` 早退分支也过 `configure()`、`configure()` 用 `appliedTheme` 守卫同主题不重复 `initialize`；新增纯函数 `resolveMermaidTheme(attr, prefersDark)` 与 `mermaidTheme()`，`system` 跟随系统深色；`renderDiagram()` 入口取一次主题供读、`await` 之后再取一次算写键（避免把浅色 SVG 写进深色键）；预览层缓存键改 `theme|hash`、widget `key` 带上 renderKey，插件装 `MutationObserver`（`data-theme`）与 `matchMedia` 的 change 监听，主题真变时才清缓存重建。实测浅色 `rgb(51,51,51)` → 深色 `rgb(211,211,211)`，对比度 **11.05**（文字 10.3），`previewCount` 仍 1、每个预览一个 svg，切回浅色回到原值；单测 +4 条 `resolveMermaidTheme`。
- 门禁：`npx tsc --noEmit` exit 0；`npm test` **29 个文件 384 条**全过（380 + 4）；`npm run roundtrip` rich 5/7、source 7/7；`npm run verify` 首屏 gzip **293,205 B**（比第 45 轮 +498 B，内部 310,000 / 硬线 320,000，余 26,795 B，PASS；主 chunk 285,359 B gzip）；`installer.ps1 -AssocDryRun` 实测 setup **1,305,407 B**（payload 0.32.1.0，只写 `.tmp`；`release/` 三份文件 SHA256 开工前后逐字节相同）。
- UNVERIFIED（本轮）：`system` + 系统主题变化的**真机**切换（沙箱不能改系统主题；只有纯函数单测 + `matchMedia` 代码路径）；`verify-installer.ps1` 的完整整跑（被第 21/22/25 轮就有的「运行中卸载 exit 0 但文件未删」挡住——定向跑里先 `FAIL 运行中卸载未按预期失败`，随后 `--version` 的 `Start-Process` 因 exe 处于 delete-pending 报 `Access is denied` 提前退出；「卸载残留」与「用户数据保留」两条改由 A/B 探针证明）；安装包字节每版都不同，不回填文档。

**第 47 轮（同一未发版区间）**

- **行内 HTML 白名单渲染**（P1，用户可见 / 核心功能）。改前 `<kbd>Ctrl</kbd>` 在正文里是字面文本（`kbd:0`），Typora 会渲染成键帽。现在 `kbd` / `mark` / `sub` / `sup` 四种**不带属性、成对、同一行、内容里没有 `<` 或 `&`** 的标签在编辑视图与预览里是真样式（`src/lib/inlineHtmlTags.ts` 的四个 mark + `src/styles.css` 的键帽 / 底色 / 上下标），保存写回原标签。解析路径的还原**前移到转义之前**（`escapeInlineHtml` 先把真成对标签换成占位符，再跑原来的 `<` 转义，最后换回）：转义后再还原会把作者本来写的 `&lt;kbd>` 实体改成真标签。E2E 四篇文档全绿：渲染篇 `kbd:3`（正文 1 + 表格单元格 1 + 列表项 1）/`mark`·`sub`·`sup` 各 1、围栏里 0 个、字面负例段（`<kbd class="x">`、单开、空对 `<kbd></kbd>`、`<kbd> </kbd>`）`kbd:0`、预览面板同样计数、**盘上字节与播种逐字节相同**（`diskSame:true`，`dirty:false`）；实体篇 `diskSame:true` 且 `kbd:0`；嵌套篇（`<kbd><mark>x</mark></kbd>`）`kbd:0`/`mark:1`/`diskSame:true`；行首篇 `mark:1`。Node 单测只能判「转义结果」与「手搓 doc → `manager.serialize` 写回原标签」（`按 <kbd>Ctrl</kbd> 加 Enter，看 <mark>重点</mark>、H<sub>2</sub>O、x<sup>2</sup>。` vs 不注册 mark 的 `按 Ctrl 加 Enter，看 重点、H2O、x2。`），**判不了浏览器里 mark 是否生效**（`@tiptap/markdown` 在 Node 里把 HTML 当字面文本）——真判据是 E2E。
- **反引号行内代码里的字符不再被智能标点改写**（P1，数据安全）。改前在编辑视图里打 `` `--flag` `` 得到 `` `—flag` ``、`` `a...b` `` 得到 `` `a…b` ``，`Ctrl+S` 把破折号写进用户字节。根因是反引号写法下 code mark 要等收尾反引号才建立，输入过程中的「已在代码里」守卫看不到它。新增纯函数 `hasUnclosedBacktick`（数未转义反引号，奇数即在代码里），守卫放在 `smartInput` 顶部，`lineBefore` 的取数从「只按 `-` / `.`」扩到一组会触发规则的键（引号、括号、`- . , ; : ? !` 与反引号）。E2E：源码与盘上都是 `` `--dry-run` `` / `` `a...b` `` / `` `grep "foo"` `` / `` `中文?` ``，普通段落 `甲 -- 乙` 仍变 `甲 — 乙`（回归）。
- **Mermaid 语法错误的图不再留在 `body` 下**（P1，用户可见）。改前语法写错后 mermaid 11.12 会把错误图塞进它自己创建、挂在 `body` 的 `#dmermaid-preview-N`：切到完全没有图的文档后还在，页高从 900 px 撑到 1013 px。现在 `initialize` 加 `suppressErrorRendering: true`，`renderDiagram` 用 `try/finally` 调新的 `removeMermaidContainer(id)`（依赖注入，Node 里不碰 `document`）。E2E 四步（坏图运行中 / 切到无图 / 好图 / 切回坏图）`[id^="dmermaid-preview-"]` 全为 **0**、`body` 里没有 `Syntax error in text`、`scrollHeight` 回到 **900**、好图 `.is-ready` 的 svg 仍 1 个。
- **补第 38 轮的 UNVERIFIED：工作区插图后立刻显示**（P1，验证）。产品侧本来就写了「先 `resolveAsset` 再插节点」，但假盘把 Blob 当 UTF-8 文本解码，写进去的 PNG 字节已坏，所以一直没有真证据。假盘 `createWritable()` 改成二进制安全：**只对「`Blob` 且 MIME 非 `text/*`」**存 `data:<type>;base64,`，`ArrayBuffer` / 视图仍按文本存（trash 的删除与撤销走 `ArrayBuffer`，改了会让既有 E2E 假红）。E2E：`.ProseMirror img` 1 个、`src` 是 `blob:`、`naturalWidth/naturalHeight` 各 **1**、`complete:true`；假盘 `assets/<时间戳>-shot.png` 是 `data:image/png;base64,…` 且解码前 8 字节为 PNG 魔数 `89 50 4e 47 0d 0a 1a 0a`；`Ctrl+S` 后 `.md` 写 `![shot.png](assets/…)` 且不含 `data:image`；切走再切回图仍 `naturalWidth:1`；`consoleErrors:[]`、失败请求 0。
- 门禁：`npx tsc --noEmit` exit 0；`npm test` **30 个文件 400 条**全过（384 + 行内 HTML 10 + 智能标点 4 + Mermaid 2）；`npm run roundtrip` rich 5/7、source 7/7（`docs/roundtrip-report.md` 无改动）；`npm run verify` 首屏 gzip **293,751 B**（比第 46 轮 +546 B，内部 310,000 / 硬线 320,000，余 26,249 B，PASS；主 chunk 912,306 B raw / 285,826 B gzip）。
- 文档：`docs/typora-gap.md` 把「行内 HTML 渲染」从「缺的」移进「已经有的」（**32 项有 / 9 项缺**，编辑与格式 2 → 1），「高亮、上下标、TOC、emoji」改成只差 `==高亮==` / `^上标^` / `~下标~` 语法与 TOC / emoji；`README.md` 的能力句、测试计数与差距计数同步；`AGENTS.md` 的能力句、测试计数与差距计数同步。
- UNVERIFIED（本轮）：真实宿主（WebView2）里的行内 HTML 渲染与插图（本会话是非交互沙箱，宿主窗口起不来，只到浏览器 + CDP）；真实中文输入法下的反引号行内代码直击键（E2E 是 `keyboard.type` 的 ASCII 注入）；`<kbd>` 出现在 HTML 导出里的观感（导出走 `editor.getHTML()`，与预览同源，本轮只断言了预览面板）；同一文档里「真标签 + 字面实体」混排时的字节变化（既有 `repairHtml` 的 `source.includes` 守卫导致，改前改后同值，非本轮引入）。安装包字节不回填文档（以 Release 页 `SHA256SUMS-<版本>.txt` 为准）。

**第 48 轮（同一未发版区间）**

- **表格单元格里的块级命令一律拦下**（P1，数据安全）：改前在单元格里按 `Ctrl+2` 造出 `<h2>`，`Ctrl+S` 把 `## 一` 写进单元格、重开变成字面文本；`Ctrl+Shift+L` 还会顺手删掉一整行（同时开关侧栏）。工具条 H1/H2 与「插入」菜单的表格 / 代码块 / 引用 / 任务列表 / 分割线走同一条命令；公式块（`$$…$$`，`group:"block"`）经「插入 → 公式块」与 `Ctrl+Shift+M` 能无声塞进单元格，单元格里打 `$$` 再回车经 `mathInput` 的 Enter 快捷键也能造 blockMath。新增纯函数 `inTableAncestry`（`src/lib/tableScope.ts`，无 PM 依赖、可 Node 单测）；`handleKeyDown` 复用同一判据，`Ctrl+L` 删行补 `!shiftKey && !altKey`；新增 `selectionInTable` / `guardBlockInTable`，标题分支、工具条 H1/H2、插入菜单 5 条块级命令、`openMathAtCursorRef` 的块级公式守卫（插在「光标落在已有公式上」的早返回**之后**）全部走它；`mathInput.ts` 的 Enter 命中表格时 `return true`（吞掉回车、不插入）并回调提示。E2E（CDP 9222 + 假工作区）：`Ctrl+Shift+L` 行数 3→3、侧栏 false→true→false、盘上逐字节不变；`Ctrl+L` 2（正对照）、撤销回 3；单元格 `Ctrl+2` / 工具条 H1 / 插入→代码块 / 插入→公式块 / `Ctrl+Shift+M` 五种入口全部 `headingInCell:0`、`preInCell:0`、`blockMathInCell:0`、`blockMathAll:0`、`mathPopups:0`、提示含「表格」、`diskSame:true`、重开单元格仍是 `甲/乙/一/二`；单元格里打 `$$` + 回车 `blockMathInCell:0`、盘上该行 `| $$  | 二   |`（无 `<br>`）；正对照：表格外 `Ctrl+2` 出 `h2`、单元格 `Ctrl+B` 出 `<strong>x</strong>`、`Ctrl+M` 出 `inlineMathInCell:1`（行内 mark 与行内公式不误伤）。
- **源码改字保存后回编辑不再假脏**（P1，数据安全）：改前源码里改一个字 → `Ctrl+S`（`dirty:false`）→ `Ctrl+/` 回编辑 `dirty:true`（正文与盘上一致），再按一次 `Ctrl+S` 是一次空写盘。根因是三处判据不同源：`prepareSave` 会把「原文以换行结尾而正文没有」补一个 `\n` 写进基线，`applySource` 与源码模式的脏判断却拿未补的串去比。新增纯函数 `normalizeForBaseline`（`src/lib/baseline.ts`），三处都换成它（`prepareSave`、`applySource` 的 `setDirty`、源码模式 `setDirty`）；`skipReparse` 判据一字未动（补换行会让它恒 false，1 MB 文档会退回整篇 reparse）。E2E：`甲.md`（原文以换行结尾）源码加「加一句。」保存 → 回编辑 `dirty:false`、再保存 `changedOnSecondSave:false`；`乙.md`（原文不以换行结尾）同路径 `dirty:false` 且盘上无末尾换行；一个字都不改进出源码 `dirty:false` 且 `sl-parse-done` 计数 3→3（不整篇重解析）；编辑视图打字 `dirty:true`、撤销回基线 `dirty:false`。
- 门禁：`npx tsc --noEmit` exit 0；`npm test` **32 个文件 414 条**全过（400 + `tableScope` 8 + `baseline` 6）；`npm run roundtrip` rich 5/7、source 7/7（`docs/roundtrip-report.md` 无改动）；`npm run verify` 首屏 gzip **294,123 B**（比第 47 轮 +372 B，内部 310,000 / 硬线 320,000，余 25,877 B，PASS；主 chunk `index-Bx-dU1eB.js` 913,110 B raw / 286,198 B gzip）。
- 文档：`README.md`、`docs/iteration/STATE.md`、`AGENTS.md` 九处数字订正（测试 30 文件 400 条 → 32 文件 414 条、首屏 293,751 → 294,123、余量 26,249 → 25,877、主 chunk `第 45 轮 910,048 B raw` → `第 48 轮 913,110 B raw（index-Bx-dU1eB.js）`、`第 30–47 轮` → `第 30–48 轮`、`第 47 轮 npm run verify` → `第 48 轮`、首屏历史链补 `→ 48 轮 +372`）；`.tmp/iteration/common.md` 的安装包预算行同步成 45,000,000 / 50,000,000（本地文件，不进提交）。
- UNVERIFIED（本轮）：表格单元格里**手打** `# ` / `> ` / `- ` 仍会经输入规则造块级节点（本轮只封命令入口，下轮做）；粘贴带标题 / 代码块的 Markdown 进单元格未实测；宿主 WebView2、真实 IME、`Ctrl+Alt+L`（AltGr）、125%/150% 缩放。

**第 49 轮（同一未发版区间）**

- **命名 HTML 实体保存时不再被二次转义**（P1，数据安全）：改前打开一篇写着 `甲&nbsp;乙` 的 `.md`，按一次 `Ctrl+S` 盘上就变成 `甲&amp;nbsp;乙`（多 4 字节、无任何提示）——`&nbsp;` 是不换行空格，`&amp;nbsp;` 是 6 个字面字符，GitHub / Typora / Obsidian 打开会显示字面 `&nbsp;`；表格单元格 `| a&nbsp;b |` 与手写的整行 `&nbsp;` 空段落同样中招。现在 `repairHtml` 在 `source !== null` 时用 `mapOutsideCode` 扫一遍原文，按**出现次数**记下代码外的真实体（`&nbsp;` / `&copy;` / `&hellip;` 这类命名实体），本稿同名 `&amp;<名>;` 的条数与原文一样多才逐一解回；原文里用 `&amp;<名>;` 讲转义时该名字保守地整条保持；解析层自己会解码的 `amp` / `lt` / `gt` / `quot` / 数字实体不参与计数（否则手打的字面 `&lt;` 会被解成真 `<`）。单测 +9 条；E2E e1–e7 全绿（e1 `disk === seed` 且 `stable2:true`、e5 表格重开仍是 1 张表、e7 正文里另有字面 `&amp;` 也 SAME；e2 的数字实体按既有口径解码、`same:false` 已在报告写清原因）；1 MB 文档 908 处 `&nbsp;` 一次往返逐字节相同，`repairHtml` 13.8–16.0 ms（无 source 4.2–6.3 ms）。
- **`<mark>` 高亮可见 + 代码块字号 + Mermaid 错误色 + 按钮 24 px**（P2，用户可见）：`<mark>` 的底原来与纸底 1.04:1、与行内代码底 1.01:1（第 47 轮刚能渲染，实际等于看不见），现在改用新 token `--mark-bg`（浅 `#f0e0bd` / 深 `#453618`，四处主题块都有，打印块给浅色），对纸底的 RGB 距离浅 53.3 / 深 57.2、对行内代码底 51.2 / 41.8，字对比度 12.55:1 / 9.4:1；代码块字号 12.72 → 15.3 px（`pre` 0.86em → 0.9em、`pre code` 继承），不低于行内代码的 14.79 px 且仍小于正文 17 px；Mermaid 错误提示改用 `var(--danger)` + `color-mix` 边线（浅 5.36:1 / 深 6.92:1，改前深色 3.03:1）；查找条与表格工具条的 7 个按钮都加 `min-height: 24px`（23 → 24，宽度 25.4–66 px 按实测记录，两条条子都不换行、不横向溢出）。侧栏页签 hover 复测：非当前页签 hover 后背景变 `--accent-wash`、文字变 `--accent-ink`，**本来就没有缺陷**（finder 那次 hover 的是当前页签，`is-active` 与全局 hover 同特异性且在后），本轮不改 CSS。
- **中文上下文里 `--` 出 `——`**（P2，用户可见）：改前打 `--` 只得到一个 `—`（半个中文破折号），要 `----` 才凑出 `——`。现在光标**紧邻**汉字（前一个字符或后一个字符是汉字）时产出 `——`，空段落 / 纯 ASCII / 空格隔开仍是一个 `—`（`甲 -- 乙` → `甲 — 乙`，第 47 轮口径不变）；这也是为保住空段落 `---` + 空格出分隔线（HorizontalRule 的输入规则靠 `—-`）。单测 +2 条（6 个断言）；E2E：编辑视图 / 源码 / `Ctrl+S` 盘上都是 `中文——中文`，`word--word` → `word—word`，`甲 -- 乙` → `甲 — 乙`，空段落 `---` / `***` + 空格仍出分隔线，手打 `| --- | --- |` 与围栏里打的 `a--b--` 原样。
- 门禁：`npx tsc --noEmit` exit 0；`npm test` **32 个文件 425 条**全过（414 + 实体 9 + 破折号 2）；`npm run roundtrip` rich 5/7、source 7/7（`docs/roundtrip-report.md` 无改动）；`npm run verify` 首屏 gzip **294,373 B**（比第 48 轮 +250 B，内部 310,000 / 硬线 320,000，余 25,627 B，PASS；主 chunk 913,822 B raw / 286,419 B gzip）；`keyboard-acceptance` **52/52**（跑完已还原 `shots/round-05/`）。
- 已知限制（本轮不修）：`&#8212;` 这类**数字实体**在打开时被解析层解码成字符，重新保存字节会变（渲染不变，`README.md` 已写）；`source` 是整个文件（含 frontmatter 与脚注定义）而 `markdown` 只有正文，计数口径在极罕见情形下不齐；同一名字既有原文真实体又有手打的字面实体时，条数不齐就整类保持（该文件里的 F1 不修，但不改用户字节）；`，--` 这类全角标点紧邻的 `--` 仍是一个 `—`（`CJK` 只认汉字 / 假名 / 谚文）。
- UNVERIFIED（本轮）：真实宿主 WebView2 里的实体往返；真实磁盘 / 网络盘 / OneDrive 写回的字节；系统级深色（`prefers-color-scheme: dark`）下 `--mark-bg` 的观感；真实彩色打印 / 另存 PDF 里 `<mark>` 的新底色；真实中文输入法下 `--` 的产出（无 IME 自动化）；1 MB 文档在**应用内**一次 `Ctrl+S` 的耗时（只有 `repairHtml` 的 Node 读数）。

**第 50 轮（同一未发版区间）**

- **预览与 HTML 导出保留脚注续行**（P1，数据安全）：`renderFootnotes` 原来逐行 `filter(line => line.startsWith('[^'))`，缩进续行 `    续行接着写` 被丢掉——只读预览的「注释」与 HTML 导出的 `<li>` 都只剩第一行（原文件不变，用户看到的与交出去的成品比原文少一行）。现在先切条目再拼行：定义行开新条、缩进续行（4 空格或 tab，与 `footnotes.ts:3` 同一套判据）接当前条、块内空行不结束当前条、`[label]:` 引用定义与正文行结束当前条，续行用 `<br>` 连接（逐行转义后再拼）。`export.test.ts` +4 条（单条续行、多条续行、引用定义隔离、定义+空行+续行）。
- **导出 Markdown 走保存同一差异门**（P1，数据安全）：脚注定义不在文末的文档 `Ctrl+S` 会弹「保存前确认」，同一篇「导出 → Markdown」却静默写出改写后的正文。现在 `exportAs` 的 markdown 分支用 `activeLosses` 判一次，有损失时给**持久**提示（不弹模态框，导出照旧写出）：标签走新参数 `lossLabels(losses, true)`，把「在保存后」换成「在导出后」、「保存时」换成「导出时」；提示带「知道了」按钮，是唯一关闭入口（`Esc` 不清提示）。E2E：`fn-mid.md` 导出后无对话框、提示含「脚注 [^1] … 在导出后会消失」、6.5 s 后仍在、点「知道了」消失；`fn-end.md` 对照无提示无按钮。
- **「全部替换」按文本节点批量提交**（P1，性能）：1 MB / 39,936 命中点一次「全部替换」原来卡 51.8 s 的 `view.dispatch`（第 48 轮基线；本轮改前实测 **46,637 ms / 39,936 步**）。现在按文本节点分组，一个文本节点一个 `replaceWith` 步骤（1,024 段 → 1,024 步），文本算术抽成纯函数 `src/lib/replaceRanges.ts` 的 `applyReplacements`（+3 条单测、已进 `npm test`）。改后 **519.7 ms / 1,024 步**（−98.9%）；100 KB 档 **614.7 → 89.6 ms**（4,096 → 1,024 步）；`Ctrl+Z` 一次全回、正文长度不变量（`docChars === docChars0 − matchCount`）成立、替换词继承原 `marks`（粗体不丢）、跨文本节点命中整单退回旧路径（`甲**乙**丙` 查 `甲乙` → `Q丙`）。**两条语义守卫**：相邻命中重叠（`aaa` 里查 `aa`）整单退回旧路径，结果与今天一致；被批注盖住的文本节点也退回逐条替换——整节点替换会把节点内的批注区间一起映射塌（实测 `.annot` 1 → 0、store 被清空），批注 E2E 现已 PASS（替换后批注存活、位置 3–5 → 2–4、`Ctrl+Z` 回 3–5）。
- **排版与点击区一批**（P2，用户可见）：`h4` 之前落 UA 默认、与 `strong` 完全同形（17 px / 700），现在 1.08em（18.36 px）/ 600 / 行高 1.45；`h2`/`h3` 补显式行高 1.35 / 1.4（继承 `.doc-body` 的 1.95 时两行 H2 行盒间隔 44 px，现在 30.29）；空稿占位符与正文同一条排版链（`padding: 0`、`font-family: var(--font-read)`、17 px、行高 1.95；改前是 16 px `Segoe UI` / 行盒 21 px，键入第一个字时换字族、基线跳约 6 px）；工具栏 11 个按钮统一 24 px、`</>` 字号 11 → 12 px（规则收紧到 `.toolbar-group > button`，`插入 ▾` 下拉 9 项仍是 30 px / 左对齐，不被压扁）；状态栏字数按钮点击区 16 → 24 px 并加 `aria-label="字数明细"`。
- 门禁：`npx tsc --noEmit` exit 0；`npm test` **33 个文件 432 条**全过（425 + 导出 4 + 替换区间 3）；`npm run verify` 首屏 gzip **294,913 B**（比第 49 轮 +540 B，内部 310,000 / 硬线 320,000，余 25,087 B，PASS；主 chunk `index-xYcRGlyW.js` 915.27 kB raw / 290.31 kB gzip）；本轮没动 Markdown 序列化，`roundtrip` 未跑。
- UNVERIFIED（本轮）：真实宿主 WebView2 里的预览/HTML 导出脚注与导出提示；真实磁盘 / 网络盘上的「全部替换」响应（dev server + 假工作区）；生产构建下的「全部替换」读数（dev + StrictMode 口径）；真实中文输入法下的占位符切换；系统 150% / 200% 缩放下的工具栏 24 px 与状态栏点击区；打印 / PDF 输出下的 h4 与标题行高。

**第 51 轮（同一未发版区间）**

- **保存不再每次整篇读回旧文件、无改动不再写盘**（P1，性能 + 数据安全）：1 MB `big.md` 打一个字 `Ctrl+S`，`File.text` 读全文 **0 次**、`createWritable` **1 次**，磁盘含新字（1,648 ms）；紧接着再按一次 `Ctrl+S` 四个计数全 0 并提示「没有改动，未写入。」。`rememberDisk` 在 6 个入口记下磁盘快照（正文 + UTF-8 字节数 + mtime），保存前只有三样全中才复用，否则读全文；空文件的 `''` 是有效正文（打「甲」保存 `text=0`），外部改过盘（字节数 / mtime 对不上）时读全文再写；`requestSave` 的新门只在 `goal==='file'` 且读同步 `dirtyRef`，「另存为」永不过门（不动字点另存为仍写盘）。`performCommit` 在 target 存在且 `normalized===baselineRef` 时直接返回，不进 `finishSaved`。新增 `src/lib/saveDisk.ts` + 8 条单测。
- **整页缩放（`Ctrl+Shift+=` / `-` / `0`、`Ctrl+滚轮`）**（P1，用户可见）：`--page-zoom` 是无单位倍数，`#root` 的 `zoom` 与 `height: calc(100vh / 倍数)` 一起缩；`--editor-size` 完全不动（三次放大后仍 17 px，`Ctrl+=` 才是 17→18 px）。键位用 `event.code`（`Ctrl+Shift+=` 的 key 是 `+`、`Ctrl+Shift+-` 是 `_`，旧分支接不住），排在字号两条之前；`Ctrl+滚轮` 100 ms 节流并 `preventDefault`。实测 1.1 / 1.2 / 1.3 → 1.2 → 1，100/110/120% 无横纵滚动条，刷新后仍 120%，设置持久化 `pageZoom`（clamp 50–200，旧存档读出 100）；快捷键对话框补三行。
- **视图四钮有 `aria-pressed`**（P2，可访问性）：专注 / 打字机 / 源码 / 预览加 `aria-pressed` 与容器 `role="group" aria-label="视图"`，源码 / 预览互斥；全文 `aria-pressed` 6 → 10。`scripts/data-safety-acceptance.mjs` 三处过期选择器 `.editor` → `.ProseMirror, .source-editor` 修好（含「回到富文本编辑」），脚本从卡住恢复到 20 PASS（其余 5 条过期期望见 `docs/iteration/round-51/test.md`）。
- 门禁：`npm run verify` PASS，首屏 gzip **295,476 B**（比第 50 轮 +563，内部 310,000 / 硬线 320,000，余 24,524）；`npm test` **34 个文件 442 条**全过（432 + `saveDisk` 8 + `settings` 2）；本轮未动 Markdown 序列化，`roundtrip` 未跑。
- UNVERIFIED（本轮）：写盘期间切换 / 删除的回滚分支（假 FSA 造不出写盘期身份变化）；真实磁盘 `lastModified` 粒度（NTFS 1–2 s）下的同秒外部改动；宿主 WebView2 内的 `Ctrl+滚轮` 缩放；真实 IME 组合输入下的 `Ctrl+Shift+=`。

## 0.32.1 — 2026-11-16

用户报的三个问题：首次启动空白、关闭文档、工作区里的原地保存。

- 首次启动打开一篇空的 `未命名.md`，不再加载旧 localStorage 里的示例名；新建立刻可用。
- 文件菜单新增「关闭文档」；脏文档走现有三选一（取消 / 存草稿 / 丢弃）。
- 有工作区且当前文档还没有句柄时，`Ctrl+S` 直接在根目录建 `未命名.md`（重名则 `未命名 2.md`），不弹系统另存为；显式「另存为」仍走系统 picker。
- 测试：`npm test` 17 文件 **248** 条；`session` 18/18、`newfile` 23/23、`keyboard` 49/49。
- 首屏 gzip **285,783 B**（临时预算 286,000 B，余 217 B）。
- UNVERIFIED：真实重开权限、150%/200% 缩放屏、真模型提示词质量、真实 DeepSeek 搜索（无 Key）、macOS 快捷键、旧会话已丢弃批注不可恢复。
- 体积与 SHA256 见 Release 页的 `SHA256SUMS-0.32.1.txt`。

## 0.32.0 — 2026-11-16

七项修复 + Typora 快速键；核心是会话恢复与宿主批注协议。

- 会话恢复：重新打开恢复上次的文件夹、当前文件与批注；IndexedDB 只存文件句柄，权限三态（已授权 / 需重新授权 / 不可用），失败退化为「最近打开」；重新授权后 `Ctrl+S` 原地保存。
- 宿主批注：`GET /__annotations` 只读当前文档同目录 `.sidelight/annotations/<CacheKey>.json`（没有回 404，上限 512 KiB）；新增 `annotations-save` 原子写回，只读 / 不可写回 `READONLY` / `IO`，拒绝伪造路径。
- 批注协议 v2：新增「整体评价」与「未定位」条目（`{v:2,annotations,notes}`，兼容旧数组，迁移前备份）；重跑分析按窗口替换，未定位批注不再丢。
- 提示词压缩到 796 字，并要求一条全文总评。
- 高分屏：manifest 声明 `PerMonitorV2, PerMonitor`，`GetProcessDpiAwareness` 实测 2；WinForms 配置节经实测会让宿主启动失败，未启用。
- 搜索：新增 DeepSeek 官方 Search 接口（Key 可与模型 Key 相同），401/402/429 有可读错误文案。
- 快捷键：Ctrl+K 链接、Ctrl+M 公式、Ctrl+P 快速打开、Ctrl+1–6 标题、Ctrl+0 正文、Ctrl+/ 源码、表格 Tab 走格与 Ctrl+Enter、侧栏 Ctrl+Shift+1/3/L。
- 测试：17 文件 **248** 条；`session` 15/15、`annotation` 8/8、`host-smoke` 8/8、`host-annotation` 6/6、`keyboard` 49/49。
- 首屏 gzip **285,997 B**（临时预算 286,000 B，余 3 B）。
- UNVERIFIED：真实重开权限、150%/200% 缩放屏、真模型提示词质量、真实 DeepSeek 搜索（无 Key）、macOS 快捷键、旧会话里已丢弃的批注不可恢复。
- 体积与 SHA256 见 Release 页的 `SHA256SUMS-0.32.0.txt`。

## 0.31.1 — 2026-11-16

最终版：窄窗与键盘细节、Windows 单实例与安装检测、macOS 平台补齐。

- 窄窗：分析时自动打开批注抽屉，并显示批注条数。
- 文件菜单加「查找」入口。
- 正文里按 Tab 插入两个空格（不再跳焦点）。
- Windows：`--version` 打印版本；exe 文件版本与 NSIS `VIProductVersion` 对齐 setup `VersionInfo`。
- Windows 单实例：再次启动恢复并置前已有窗口。
- Windows 安装/卸载运行检测：程序在跑时安装会被拦截（实测 exit=1、exe 不变）；卸载场景 exit 0、文件未删，记 **UNVERIFIED**。
- macOS：Finder 双击 `.md`（Apple Event）、Dock 点击重开、关于菜单显示版本、端口占用时激活已有实例；CI 编译与 self-test/verify 待首次跑。
- 测试：`npm test` 16 文件 **234** 条；`keyboard` 37/37。
- 首屏 gzip **285,781 B**（临时预算 286,000 B，数据安全例外，余 219 B）。
- 体积与 SHA256 见 Release 页的 `SHA256SUMS-0.31.1.txt`。

## 0.31.0 — 2026-11-16

数据安全例外版本：修草稿、写入门、删除兜底、公式与脚注保真。

- 浏览器草稿恢复：只对文件夹里的文档生效；重新打开时恢复草稿内容。
- 三条写路统一 256 KiB 门：超过上限不再整篇写 `localStorage`，避免同步写阻塞。
- 打开文件 5.5 MiB 门：与写回上限一致，超限直接拒绝并提示。
- 删除脏文件：trash 保留原始字节 + SHA256 + `.current.md`，缓存文件复制校验；撤销时按校验结果全部搬回。
- 公式：`\$` 不再参与配对；`价格 \$100 与 $x^2$` 只识别 `$x^2$`，保存不二次转义。
- 脚注：续行只认 4 空格/tab，2 空格段首正文不再被吞；块内空行保留。
- CRLF 尾部空行：按换行对数保留 0–5 个尾部空行，不再写 `&nbsp;` 增长；三次往返字节稳定。
- 测试：`npm test` 16 文件 **234** 条；`draft` 61/61、`tree` 56/56、`bigfile` 3/3；`roundtrip` source 7/7。
- 首屏 gzip **285,471 B**；本轮**临时预算 286,000 B**（数据安全例外，STATE 记理由），余 529 B。
- 延后：宿主/本地草稿合并单弹窗、状态栏草稿来源标注、BOM 断言、公式/脚注全部数据安全验收脚本（需 dev）。
- 体积与 SHA256 见 Release 页的 `SHA256SUMS-0.31.0.txt`。

## 0.30.4 — 2026-11-16

两项 P0：脚注保真与删除脏文件的兜底。

- 脚注续行与混合尾块：`extractFootnotes` 支持 2+ 空格或 tab 续行，以及「脚注块 + `[ref]:` 引用定义」混合尾部；`joinFootnotes` 按块间空行拼回，两次往返逐字节稳定。富文本不再把 `[^a]` 解析成链接、把续行当代码块。
- 脚注定义消失拦截：只在「原文有定义、正文仍有引用、保存后定义消失」时 blocking；用户把引用与定义一起删掉不拦。
- 删除脏文件：把最新正文、草稿与批注一起移入工作区 `.sidelight/trash/`，撤销时全部搬回；`保存后删除` 分支按预算砍掉、延后。
- 测试：`npm test` 16 文件 **213** 条（新增 8 条脚注/风险用例）；`tree` 56/56、`stale` 4/4、`newfile` 23/23；`roundtrip` source 7/7。
- 首屏 gzip **284,903 B**（≤285,000，余 97 B）。
- 延后到第 22–25 轮：C2/C3、D2/D3、F4、性能、UX、安装相关项。
- 体积与 SHA256 见 Release 页的 `SHA256SUMS-0.30.4.txt`。

## 0.30.3 — 2026-11-16

性能修复：把正文派生移出按键同步路径。

- `onUpdate` 同步只做 dirty、统计与自动保存；正文派生（4 个正则、草稿、`localStorage` 写入）移进 300 ms 防抖。
- 1 MB 文档载入从 **5.8–9.3 s 降到 1284 ms**。
- 10 KB 冒烟 p95 5.0–7.2 ms（多次测量波动，未达稳定）；**100 KB 与 1 MB 的逐键 p95 未测**（只测了载入），不作为验收数字。
- 草稿验收 `draft` **61/61**；`npm test` 16 文件 205 条。
- 首屏 gzip **284,766 B**（≤285,000，余 234 B）。
- 延后（不计入本轮）：P2 可访问性项、memo 化。
- 体积与 SHA256 见 Release 页的 `SHA256SUMS-0.30.3.txt`。

## 0.30.2 — 2026-11-16

收尾修复与数字更正；仍是 0.30.x，不升 1.0。

- 草稿清理：保存成功后重新发出 `draft-clear`，清掉对应文档的草稿（此前 `draft-acceptance` 57/58 的漏清）。升级说明：0.30.1 可能残留含正文的草稿，升级后打开该文档再保存一次，或手动删 `.sidelight/drafts/`。
- 性能数字更正：0.30.1 的单次冒烟数字**不可复现**；统一改为「仅 10 KB 冒烟，未达稳定；100 KB/1 MB 未测，不作为验收数字」。
- 不升 1.0 的理由：macOS 真机、签名/公证、Intel 运行、100 KB–1 MB 性能仍未验；隐私声明待产品负责人确认。0.30.2 作为第 20 轮收尾版本。
- 测试 16 个文件 205 条；首屏 gzip 仍 **284,730 B**（≤285,000，余 270 B）。
- 体积与 SHA256 见 Release 页的 `SHA256SUMS-0.30.2.txt`。

## 0.30.1 — 2026-11-16

数据安全修复优先；性能只记录实测，未测的写明未测。

- 保存回包跨文档覆盖（B1）：保存请求带文档标识，晚到的回包不会写进另一篇文档。
- 保存中丢字（B3）：保存期间继续输入不再被回包覆盖，以最新正文为准。
- 文件上限下沉到 `readNode`（5.5 MiB）：6.1 MiB 拒绝并提示，5.2 MiB 允许；不再先读进内存再判断。
- 每个按键少一次序列化：统计与大纲共用一次序列化结果。
- 统计与大纲 180 ms 防抖，长文输入不每键重算。
- 超过 256 KB 的正文不再整篇写进 `localStorage`，避免同步写阻塞。
- dirty 状态改由版本号推导，避免多处手写布尔值不一致。
- 性能：**仅 10 KB 冒烟，未达稳定**；100 KB 与 1 MB **未测**（perf 脚本在 1 MB 挂起），不作为验收数字。
- 延后（不计入本轮）：memo 化、B4/B5、2 MB 读取进度条。
- 测试：`stale` 4/4、`host-save` 64/64、`bigfile` 3/3、`tree` 49/49、`theme` 27/27、`keyboard` 35/35；`npm test` 16 文件 205 条。
- 首屏 gzip **284,730 B**（≤285,000，余 270 B）。
- 体积与 SHA256 见 Release 页的 `SHA256SUMS-0.30.1.txt`。

## 0.30.0 — 2026-11-16

可访问性收尾：大纲页签真正隐藏文件树、深色对比度与焦点环、错误提示可被读屏播报。

- 大纲页签：文件树真正隐藏（`display:none`、rect 高 0，节点仍在 DOM），切回时恢复滚动位置（`tree-acceptance` 49/49）。
- 深色主题：颜色 token 化，浅/深 × 8 组 × 3 状态共 48 组对比度检查——**43 组适用、5 组排除**（大字号/禁用态等不适用），适用组全部通过（`theme-acceptance` 27/27）。
- 焦点：统一焦点环（含源码模式）；`prefers-reduced-motion` 下不播动画。
- 表单：输入边界 3:1 对比；正文编辑器加 `aria-label="正文编辑器"`。
- 错误反馈：保存失败 toast 用 `role="alert"`；一次 notice 只更新一个 live region，toast 内按钮不被 `aria-hidden` 包住。
- 测试：`tree-acceptance` 49/49、`theme-acceptance` 27/27（48 组中 43 组适用、全部通过）、`keyboard-acceptance` 35/35；`npm test` 16 文件 205 条。
- **P2 延后**（不计入本轮达标）：骨架 `role="dialog"`/`aria-busy`、批注卡 `tabIndex`/Enter 跳句、正文开头 Tab 回环删除。
- 首屏 gzip 283,826 → **284,210 B**（≤285,000，余 790 B）。
- 体积：Windows 安装包 **817,983 B**、Windows 便携 zip **902,274 B**、macOS Universal zip **890,004 B**；SHA256 见 Release 页的 `SHA256SUMS-0.30.0.txt`。
- （本条与更早条目的数字均为发布后回填。）
## 0.29.0 — 2026-11-16

macOS 改为 Universal 包，签名/公证可选，self-test 与发布流程加固。

- macOS Universal：arm64 与 x86_64 各用一次 `swift build --triple <arch>-apple-macosx13.0 --scratch-path`，每片先 `lipo -archs` 断言单一架构，再 `lipo -create`；两片 `minos` 都是 13.0。产物固定 `Sidelight-<版本>-macos-universal.zip`（不再按 `uname -m` 命名）。x86_64 片失败先试 `--arch`，仍失败直接 `::error::` 禁止发布，不拿 arm64 冒充。
- self-test 加固：`--self-test --require-bundle` 必须在 `.app` 内运行、禁止回退 `cwd/dist`；6 项断言（首页 200 + `id="root"`、静态 JS、`/__doc`、`/__recent`、未知路径 404、`Host: evil` 403 用原始 socket）。
- 签名/公证可选：`host-mac/sign.sh` 完整 keychain 链 + `codesign --keychain`（不加 `--deep`）+ `notarytool submit --wait` + `stapler staple`；公证 zip 只装 `.app`，staple 后用 `STAGE_DIR` 重打发布 zip（保住 `README.txt`）。无 Apple secrets 时走 ad-hoc，Release 首行标注「**未签名、未公证**」；有 secrets 但签名/公证失败则 job 失败，不静默降级。
- 发布流程：`release.yml` 的 `workflow_dispatch` 增加必填 `tag`；preflight 校验 `v<version>`；release job 先断言 3 个资产、用显式文件名生成 `SHA256SUMS-<版本>.txt`、再断言 4 个文件并 `sha256sum -c`；同 tag 重跑删除旧的 arm64 资产（`overwrite_files`）。
- Edit 菜单：撤销/重做/剪切/拷贝/粘贴/全选，全部 `target = nil` 走 first responder（`undo:`/`redo:` 由 WKWebView 的 `undoManager` 处理）。
- zip 内多一份 `README.txt`（Gatekeeper 三档、签名三态、Intel、数据位置、校验方式）。
- 测试 16 个文件 205 条；首屏 gzip 仍 283,826 B（≤285,000，余 1,174 B）。体积：Windows 安装包 **817,994 B**、Windows 便携 zip **901,920 B**、macOS Universal zip **889,644 B**（fat 头两片：x86_64 0x1000007 / arm64 0x100000c，zip 内含 `README.txt`）；SHA256 校验和见 Release 页的 `SHA256SUMS-0.29.0.txt`。
- 未验：真实 Intel Mac 与 Rosetta、真实签名/公证（本机无证书）、图标真机显示、WKWebView 的 ⌘C/⌘V/⌘Z、`--triple` 交叉编译 x86_64（CI 首次实跑）。
## 0.28.1 — 2026-11-16

修复版：只改可访问性与测试，不改功能。

- 可访问性：自动聚焦后首个 Tab 仍落到 skip link（自动聚焦不再破坏键盘导航）。
- 测试：导出菜单用例改用 `menuitem` 角色断言。
- 测试 16 个文件 205 条；首屏 gzip 仍 283,826 B（≤285,000）。体积：Windows 安装包 **817,821 B**、Windows 便携 zip **901,922 B**、macOS arm64 zip **773,067 B**；SHA256 校验和见 Release 页的 `SHA256SUMS-0.28.1.txt`。
## 0.28.0 — 2026-11-16

【体积与 SHA256 见 Release 页的 `SHA256SUMS-0.28.0.txt`；本机构建约 setup 817,886 B / zip 901,866 B。】

新建文件保存修复、首次使用与延后项收尾、发布自动化；首屏 gzip **283,775 B**（≤285,000，余 1,225 B）。

- 新建文件保存：修「打开 a.md → ＋新建 → 保存」把 a.md 覆盖的问题；新文件首次手动保存前保持 0 字节；外部删除/改名后 `Ctrl+S` 不再写旧路径；`refreshWorkspace` 分 `adopt` / `check` 两种语义。
- 首次使用：焦点与占位、文档身份一致、模拟批注去重、demo 死代码清理。
- 延后项收尾：侧栏 `tablist`、文件树展开态、空文件夹提示、超长文件名、导出菜单。
- 发布自动化：新增 `release.yml`（tag `v*` 或手动 `publish`）；preflight 校验 tag = `package.json` = CHANGELOG；Windows / macOS 构建只上传 artifact；单个 release job 生成 `SHA256SUMS` 并 `sha256sum -c` 后发布，同 tag 重跑幂等（`overwrite_files`）。
- CI：`windows-host` 与 `macos-host` 转为必过；`install-verify` 仍只手动触发。
- 测试 16 个文件 205 条；体积与 SHA256 见 Release 页的 `SHA256SUMS-0.28.0.txt`（本机构建约 setup 817,886 B / zip 901,866 B）。
## 0.27.0 — 2026-11-16

跨平台：Windows 与 macOS 各一套原生宿主。

- macOS 原生宿主（Swift + AppKit + WKWebView + Network.framework，arm64）：`host-mac/` 提供 `/__doc`、`/__draft`、`/__recent` 与同一套 `save`/`draft-*`/`recent-*`/`close-answer` 协议，编码（BOM/UTF-8/GB18030）、EOL、原子写、草稿与最近记录、关窗三选一与 Windows 宿主对等。
- 宿主桥抽成 WebView2 / WKWebView 双通道：页面只依赖 `postMessage` 语义，Windows 走 `window.chrome.webview`，macOS 走 `window.webkit.messageHandlers.sidelight` 与 `sidelight-host` 事件。
- Windows 仍是 per-user NSIS 安装包 + 便携 zip，行为不变。
- Intel Mac 暂未构建（只在 arm64 runner 上出包）。
- 首屏 gzip **284,973 B**（≤285,000，余 27 B）。
- 测试 16 个文件 205 条；版本 0.27.0。
- 产物：Windows 安装包 **817,242 B**（SHA256 `974A035701AFEE5D75048D6ACB2C5D3B592809C2B5331BBE31C5CE9BAE2D4704`）、Windows 便携 zip **899,986 B**（SHA256 `0CEC9036C0C586E71D2DD7DBA9EF46A4B236F90376CF5E4A015EFE59DBF44C95`）、macOS arm64 zip **770,783 B**（SHA256 `259ADDF217695D77805B724F5C03170EF9BC7D7A4EBF1348E8B6870610D8557B`）。
- macOS 包**未签名、未公证**，仅 arm64，要求 macOS 13+；首次打开需右键「打开」或 `xattr -dr com.apple.quarantine`。

## 0.26.0 — 2026-11-16



文件树同目录重命名；首屏 gzip 守住 **284,973 B**（≤285,000，余 27 B），安装包内部预算调到 820,000 B。

- 文件树：右键文件可重命名；同目录、只接受 `.md` / `.markdown`，目标已存在拒绝（二次探测只收窄 TOCTOU），`move()` 唯一路径、无「复制 + 删除」回退。
- 大小写重命名分两段（临时名 → 目标名）；第二段失败保留临时名并报错，不回滚。
- 缓存：草稿/批注写到新 key 成功后才删旧 key；失败保留旧文件。
- 当前文档：改名后 `currentPath` 指新路径，`Ctrl+S` 写新路径；不触发保存门。
- 最近记录不迁移：旧条目下次打开回 `FILE_GONE`，用户可移除。
- 不做：目录重命名、跨目录移动、自动补 `.md`。
- 可访问性：大纲 `aria-current` 本次修好（当前章节高亮能被读屏识别）。侧栏 `tablist` 与文件树展开态/空文件夹提示 **延后**，不计入本轮达标（首屏余量只剩 27 B）。
- 测试 16 个文件 205 条；体积：构建产物 1,434,502 B（首屏 gzip 284,973 B ≤285,000，余 27 B）；安装包 **817,347 B**（SHA256 `FE2EF144D06AAA4F9667ADB1934929082C77D78FE2A1BD690BD6B16F3F08A268`）、便携 zip 899,829 B（SHA256 `9C18FC9CA29F7311010E3D2570F2C6AE6C6A8358EDD0C6951D24FAD232CB98BC`）（内部预算 820,000 B，硬线 850,000 B 不动）。
## 0.25.0 — 2026-11-16

文件树删除（trash 语义）与首屏守卫修复；首屏 gzip 守住 **284,134 B**（≤285,000，余 866 B）。

- 文件树：右键文件可删除；文件移到工作区 `.sidelight/trash/<时间戳>-<原名>`（重名加随机后缀，跨盘失败回退「复制 + SHA-256 校验 + 删源」）。只删文件，不能移动/复制/重命名，不能删目录。
- 没有应用内恢复：trash 只增不减、不自动清理、卸载不删；恢复要在资源管理器里手动挪回。
- 刷新重绑：外部改动不监听，点刷新重新扫描工作区、重建文件树并保持当前文档高亮。
- 未验：真人右键菜单与确认框、从 trash 恢复、网络盘/OneDrive 占位文件、超长路径与中文文件名、并发删除同一文件。
- 可访问性：文件树删除的菜单与确认框走键盘与焦点管理（Esc 取消、确认按钮默认焦点）。侧栏 tablist 与大纲 `aria-current` 两项**因首屏预算延后**，不计入本轮达标（见 ADR-0013）。
- 测试数与产物体积、校验和见 0.26.0。

## 0.24.0 — 2026-11-16

KaTeX 惰性加载：公式不再拖首屏，首屏 gzip 364,960 → 282,809 B（−22.5%）。

- 首屏：KaTeX 的 JS 与 CSS 拆成独立 chunk（gzip 77,660 B），第一次渲染公式时才下载；首屏集合只剩 index 的 JS 与 CSS。
- 未达成：265 KiB（271,360 B）不可达，实测 282,809 B，差 11,449 B；全量 stub 上限也只有 279,087 B。原因与 Kill 结果见 [ADR-0012](adr/0012-katex-lazy-loading.md)。
- 公式：含公式的首屏非阻塞预取 KaTeX chunk；预取失败显示可重试的失败态，正文不受影响。
- 块级公式按 `$$…$$` 推断 displayMode；导出在 KaTeX 未加载时走保底路径。
- 测试数与产物体积、校验和见 0.25.0。
- 未验：真实 WebView2 冷启动、离线时 chunk 失败与重试、CLI 下 `npm test` 看不到 alias、`katexLazy.test.ts` 尚未挂入 `npm test`

## 0.23.0 — 2026-11-16

表格按原块写回；含引用式链接定义的文档默认用源码模式打开。

- 表格：载入时记下每个表格的原文块（分隔行、对齐标记、单元格内空格、表格前后空行）。保存时若表格签名（表头单元格、每行单元格、列数）与原文一致，整块写回原文，不再重排分隔行与列宽。
- 边界：改过单元格值、增删行列或改对齐的表格，保存时按编辑器规范重新排版，并且**不会**弹保存确认。只承诺「没动过的表格不会被改」，不承诺「表格永远保真」。表格前后 ≥2 空行会规范化成一个。
- 引用式链接：含 `[id]: url` 定义块的文档打开时直接进源码模式，顶部提示说明原因；切回富文本后首次保存仍拦一次。
- 往返报告改三栏口径：富文本 **5 / 7** 完全保真、源码路径 **7 / 7** 等值（未编辑）、富文本首次保存仍拦截 **1 / 7**（04 引用式链接），不再只给一个「3 / 7」。逐样本表见 `docs/roundtrip-report.md`。
- 测试数与产物体积、校验和见 0.24.0。
- 未验：真实宿主源码模式保存的字节、表格复用只保证行内字节、缩进/跨行 title 的定义行识别

## 0.22.0 — 2026-11-16

最近打开、日志脱敏与 CI 首跑修复。

- 最近打开：宿主记住最近 8 篇（同路径去重并置顶）；`/__recent` 只回哈希 `id`、`name` 与 `/` 分隔的目录，不含路径与 `openedAt`；支持清除、撤销一次、逐条移除；失效文件回 `STALE` / `FILE_GONE`。浏览器里不显示。
- 日志：所有路径点只记 basename（含 `forward applied`、`pipe sent` 不再记载荷）；首次启动把旧 `host.log` 归档为 `host.log.bad` 并写 `log migrated`，之后超过 1 MB 轮转 `host.log.1`。
- CI：`windows-host` 下载前建 `.tmp`；`installer.ps1` 自动建 `release/`；首跑只手动 dispatch `windows-host`，`install-verify` 等其绿并 `if: success()`；仍不设必过。
- 数据与隐私：README 新增「数据与隐私」节，只写事实，**待产品负责人确认后**再作为对外承诺。
- 测试数与产物体积、校验和见 0.23.0。
- 未验：真人重启后最近列表、`recent.json` 写失败、网络盘失效、卸载保留该目录、日志迁移的真机场景

## 0.21.0 — 2026-11-15

宿主文档的草稿兜底与关窗三选一。

- 草稿：宿主把正文写到文档同目录 `.sidelight/drafts/<cacheKey>.md`（UTF-8 无 BOM、LF、原子替换），键与浏览器 `cacheKey()` 一致；`/__draft` 只读、6 MB 上限、`no-store`、Host 校验。
- 关窗三选一：有未保存改动时点 × 只发一次 `close-request`，页面回「取消 / 存草稿 / 丢弃」；取消留窗、存草稿写成功才关、丢弃先清草稿再关；5 s 无答案保持窗口。
- 自动保存只覆盖安全子集：有差异门风险时不自动写盘。
- 设置与菜单的临界问题修复（详见本轮 A 组报告）。
- 草稿只存本机、不发网络；卸载不删文档目录里的 `.sidelight`。
- 测试数与产物体积、校验和见 0.23.0。
- 未验：真实 Alt+F4、注销/关机、真实 IME 组合输入下的关窗，`save-draft` 写失败（只读目录）的可见错误路径

## 0.20.0 — 2026-11-15

数据保真拦截、`.md` 打开方式候选（opt-in）。

- 数据保真：引用式链接、表格对齐、多行脚注等写法在富文本模式下会被改写时，保存前显示差异类别并要求确认；选「改用源码模式保存」写原文，正常编辑（改值、删行）不弹。四条保存路径（含双击打开的宿主文档）统一走这道门，不静默改写。roundtrip 的 02/04 样本被拦下，03/05/07 逐字节保真。
- `.md` 关联改成 opt-in：安装器多一个组件页，默认不勾「在「打开方式」中加入 Sidelight」；勾选只写 HKCU `Software\Classes`（ProgID `Sidelight.md` + `.md\OpenWithProgids` + `Applications\Sidelight.exe`），不碰 `UserChoice`、`FileExts` 与 `.md` 默认程序；`/S` 静默安装不写。
- 卸载对称删除关联登记：`OpenWithProgids` 用 `/ifempty`，保留其他候选（如 `VSCode.md`）。
- 关联方案与边界见 [ADR-0007](adr/0007-markdown-association.md)。
- 测试数与产物体积、校验和见 0.23.0。
- 未验：勾选关联后「打开方式」是否出现、卸载后是否残留、真人交互安装、宿主写回真实场景；`.md` 双击直接打开本轮不做

## 0.19.0 — 2026-11-15

宿主写回通道：双击 `.md` 打开后可以写回原文件，编码、BOM 与换行不变。

- 写回：`GET /__doc` 给页面正文与元数据（编码 / BOM / EOL / mtime / readOnly），页面不拿路径；保存走 `postMessage`，宿主用同目录临时文件 + `File.Replace`（失败回退 `MoveFileEx(REPLACE_EXISTING|WRITE_THROUGH)`）原子替换，失败时原文件不变、临时文件清理。
- 编码：BOM → 严格 UTF-8 → 严格 GBK（`ExceptionFallback`）；解码/编码失败回 `ENCODING`，不写 `?`、不写 U+FFFD；无 BOM 但含 NUL 判 UTF-16 或拒绝。
- 换行：`crlf` / `lf` / `mixed` 按打开时还原；`mixed` 行数不符回 `EOL_MISMATCH`；结尾换行与原文件一致。
- 授权：只写 argv / 单实例转发记录的当前文件；保存消息带 `path` / `fileName` / `file` 一律 `BAD_REQUEST`；`/__doc` 只 GET、只认 `Host: 127.0.0.1:47821`、`Cache-Control: no-store`、不加 CORS、不含完整路径。
- 前端：保存请求 10 s 超时；转发打开的文件可写（先更新 `currentPath` 再 reload）；只读横幅改成可写提示。
- 大文件：正文不再走 `localStorage`，改由 `/__doc` 与 `postMessage` 承载；解析上限 6 MB，超过时显示「文件过大，暂不支持（上限 6 MB）」并清空正文。
- 保存状态机：保存中 / 已保存 / 失败可重试；失败不丢改动，状态栏同步显示当前文件名。
- 冷启动：有未保存草稿时先确认再恢复，不静默覆盖。
- 测试 16 个文件 177 条。
- 体积与测试：测试 16 个文件 177 条；产物体积与校验和见 0.21.0。
- 未验：文件被占用、网络盘、中文路径、真人双击下的写回；`.md` 关联本轮不做。

## 0.18.0 — 2026-11-15

主题与键盘可达、导出公式保真、字体裁剪。

- 主题：浅色 / 深色 / 跟随系统三档。
- 快捷键：`Ctrl+S` 保存、`Ctrl+F` 查找、`Ctrl+Enter` 分析等常用操作键盘可达。
- 导出：HTML 导出里的公式用 MathML 并保留 TeX 源码；纯文本导出保留公式源码。
- 构建口径：显式设 `chunkSizeWarningLimit: 1200`；不拆 KaTeX（`@tiptap/extension-mathematics` 顶层静态 import，原因见 README「为什么不拆 KaTeX」）。
- 字体裁剪：只发 woff2，并删掉 4 个装饰 face（Fraktur / Caligraphic / SansSerif 的粗/斜体）；KaTeX 字体 256,168 B / 19 文件 → **213,664 B / 15 文件**（另 1 个 face 内联），只影响 dist 与安装包，不影响首屏。
- 体积与测试：测试 16 个文件 177 条；产物体积与校验和见 0.21.0

## 0.17.0 — 2026-11-15

首次给用户可见的「能装、能读、能看清错误」一轮，同时补记第 1、2 轮（那两轮版本号仍是 0.16.3，没有单独发版）。

- 宿主改用**回环固定端口** `http://127.0.0.1:47821` 提供 `www`：同一份字节实测首屏 FCP 2,040 ms → 296 ms，转发文件触发的 reload 52 ms；origin 固定，API Key 与草稿不再随重启丢失（见 [ADR-0005](adr/0005-loopback-fixed-origin.md)）。旧 origin `https://sidelight.local` 的 localStorage 会一次性丢失，首次公开前不做迁移。
- 宿主在转发文件前先问前端脏不脏（转发前确认，`window.__slState.dirty`）：有未保存改动先确认，`dirty` 未知时按脏处理，不静默覆盖。
- 长路径（309 字符、带与不带 `\\?\`）、启动失败（缺 `www`、端口被占、WebView2 数据目录不可写）都会给中文错误窗，不再只是静默退出。
- 窄窗：≤1119px 断点内单栏、不横向滚动，页边栏收进「批注」抽屉（Esc 关闭、焦点回按钮）；1024 宽下保存 / 设置 / 源码 / 预览都在视口内。
- 错误反馈改成「原因 + 下一步」：401/403 给「打开设置」，断网与 500 说清下一步，错误 `role="alert"` 且不自动消失；保存与导出失败也有中文提示，失败不改脏标记。
- 首次使用三处说法一致：文档名 `示例 · 未命名.md`、文件树「现在打开的是示例」；「试用示例」真的打开第一篇并显示选中态（`aria-current`）。
- 小字统一到 12px（设置字段名、页签、查找计数、风险条按钮等），对比度按 WCAG AA 复核。
- 体积：构建只发 woff2 字体（KaTeX 字体 1,072,948 B / 59 文件 → 256,168 B / 19 文件）；构建产物体积见 0.18.0。
- 新增 per-user NSIS 安装器与便携 zip（`packaging/installer.ps1`、`packaging/portable.ps1`）：无需管理员，装进 `%LOCALAPPDATA%\Programs\Sidelight`；缺 WebView2 运行时时直接给下载指引并中止；卸载不删 `%LOCALAPPDATA%\Sidelight` 里的用户数据（[打包说明](../packaging/README.md)）。字节与校验和见 0.18.0。
- 新建与另存为：顶栏「文件」菜单（新建 / 另存为 / 打开文件 / 打开文件夹）与文件树头「＋ 新建文件」；没有文件句柄时保存走系统保存对话框，保存成功给持久提示（不自动消失）；示例文档加「示例」徽标。
- 宿主 argv 打开的文档显示只读横幅：保存只能另存为，不再假装写回原文件。
- 源码模式下导出取当前源码内容，不再用编辑器内核里的旧正文。
- 保存的干净/脏判定改成与保存基线比较，保存成功后不再误报「有未保存改动」。
- 货币不再吞字：`$5 到 $10` 这种两边带空白的成对 `$` 按文字处理，打字与载入两条路径都保真（第 01 轮修复）。
- 应用图标：exe、窗口标题栏、开始菜单快捷方式都用同一枚青绿图标（`packaging/sidelight.ico`，第 02 轮）。
- 测试：16 个文件 171 条，0 失败（新增「错误文案」6 条）。
- 未验（首个安装包）：HKCU 卸载项、开始菜单快捷方式、默认安装路径、真人双击与 SmartScreen、中文输入法、`.md` 关联。卸载保留 `%LOCALAPPDATA%\Sidelight` 用户数据。
- 补记第 1、2 轮：MIT LICENSE、CONTRIBUTING、CI、`.gitattributes`/`.nvmrc`；批注焦点与 `aria-modal`；模拟批注标注；次要文字对比度与 12px 小字；WebView2 宿主 spike 与便携 zip。

## 0.16.3 — 2026-11-15

修：整篇一个大段落时，批注还是只有开头。

- 上一版按段落切段，段落本身超过 1500 字就整段被截断——粘贴来的文档常常就是一大段。
- 现在超长段落内部再按句号切，每片不超过 1500 字，逐片分析。
- 实测 3.2 万字的单段文档：批注从 3 条（全在开头）变成 72 条，最远一处到 96%。
- 每段单独组装上下文（本片 + 前后各一小段），不再依赖整块文字。
- 新增 1 个测试（长段落按句子切开、拼接还原原文），测试总数 162。
- 新增 `scripts/diag-longdoc-single.mjs`：单段长文的覆盖断言。

## 0.16.2 — 2026-11-15

修：一万字文档后面没有批注。

- 原因：选区超长时只取前 1500 字送模型，后面的字根本没进分析，所以只有开头有批注。
- 现在超长选区按整块切成若干段（每段 ≤1500 字），逐段分析，批注覆盖整个选区。
- 实测一万字全选：批注从 1 条变成 17 条，最远一处落在文档 90% 的位置。
- 新增 `splitSelection` 与 4 个测试（切段、短选区、超长单块、无选区），测试总数 162。
- 新增 `scripts/diag-longdoc-annot.mjs`：断言批注覆盖到文档后段。

## 0.16.1 — 2026-11-15

修：键盘打不出公式。之前的公式只能从「插入」菜单创建。

- 打 `$x^2$` 直接得到行内公式，句子中间也可以。
- 空行里打 `$$` 再回车，得到块级公式，并立刻弹出就地编辑；内容为空时保留这个公式块，不再被失焦删掉。
- 一整行只有 `$$latex$$` 时转成块级公式。
- 原因：Tiptap 数学扩展只带 `$$…$$`（行内）与 `$$$…$$$`（块级）的输入规则，单 `$` 与「`$$` + 回车」都没实现。
- 新增 `scripts/diag-math-typing.mjs`：7 项断言，连跑三次均通过。

## 0.16.0 — 2026-11-15

公式按 Typora 的方式改：就地展开源码、就地预览，不再有输入框弹窗。

- 行内公式：点一下就展开成 `$…$` 源码并全选，光标在原位编辑；公式下方浮出实时预览；点别处立刻收回成渲染结果。
- 块级公式：点一下在原位置出现输入框，下面紧跟渲染预览，Enter 完成、Esc 取消、点别处也算完成。
- 块级为什么不用「展开成源码」：扩展的输入规则会把 `$$…$$` 当场收成行内公式，源码态保不住；所以块级保留贴住公式的输入框。
- 新增 `scripts/qa18.mjs`：12 项断言覆盖展开、预览、收回、源码写回与块级提交。

## 0.15.0 — 2026-11-15

公式改成就地编辑，修视图切换丢字。

- 点行内或块级公式，输入框直接盖在公式的位置上，下面紧跟 KaTeX 实时预览；Enter 完成，Esc 取消，点别处也算完成。没有弹窗、没有按钮条。
- 公式编辑改用 Mathematics 扩展自带的 `onClick`，位置由节点自己给，不再从 DOM 反推。
- 修视图切换丢字：源码里改过的内容，切到预览、再切回源码时会丢。现在三种视图统一走一个切换函数，离开源码前先把内容写回正文。
- 长文锚定、字数同步保持 0.14.0 的状态。
- 新增 `scripts/qa17.mjs`，10 项断言全过（4 项视图切换 + 6 项公式就地编辑）。

## 0.14.0 — 2026-11-15

修长文批注错位，链接与公式改成原地编辑，加只读预览。

- 批注锚定只在这次送出的选区（没有选区时光标所在整块）里找引文；重复句不再绑到别的段落。全文唯一的引文才允许回退全篇。
- 载入文档、源码切回后，字数、大纲、当前章节立刻刷新（之前停在旧值）。
- 链接与公式改成贴着元素的浮层：Enter 保存，Esc 关闭，点外面关闭；窄屏自动夹在视口内。
- 新增「预览」视图（Ctrl+Shift+P）：只读渲染全文、frontmatter、脚注与公式；Esc 回到编辑。
- 源码、预览、专注、打字机四者互斥，状态栏只显示当前生效的视图。
- 新增 4 个测试（窗口内定位、重复句按序、唯一引文回退、窗口外不回退），总数 158。

## 0.13.0 — 2026-11-15

批注员先想清楚「作者要干什么」，再决定查什么。

- 默认提示词重写：先问谁在读、读完要做什么、手上有什么，把意图压成一句话；再由「读者还缺什么」推出检查标准，不背文体对照表。产品需求、历史考据、自我总结只作例子。
- 意图由模型放在 JSONL 第一行（`kind: meta`），页边栏顶部显示为「我的理解」，不写进正文、不进导出、不参与采纳；判错可点「判错了，重来」重跑。
- 只认第一条 meta，后面的忽略，也不会因此卡住批注；模型没按格式回（缺 meta）会提示重试。
- 提示词可在设置里改写，带「恢复默认」；改到不含 JSON 字样时会提醒模型可能不按约定回。
- 新增 1 个测试（meta 解析与不参与定位），测试总数 154。

## 0.12.0 — 2026-11-15

批注能追问了，也能联网找出处。

- 追问：每条批注底部有「追问」，就地展开对话；模型拿到原文、批注与上下文回答，线程跟着批注存进 `.sidelight`。
- 联网核对：每条批注有「联网核对」，用配置好的搜索服务查一次，把带链接的出处列在卡片里；没配就禁用并说明原因。
- 出处下方有「让侧灯按这些出处重写核实」：把出处编号带进追问，让模型只依据给定出处重写「核实」段，出处不足要说缺什么。
- 搜索服务可选 Tavily 或博查，用户自带 Key，默认关闭；请求与响应解析有 7 个测试。
- 新增 7 个测试（搜索请求与解析），测试总数 153；新增 `scripts/qa12.mjs`（追问）与 `scripts/qa13.mjs`（联网核对）。
- 调研结论存进 [docs/research/web-verification.md](research/web-verification.md)：大陆可直连的服务、模型自带联网工具、抓取路线的条款风险、以及引用幻觉的量化证据。

## 0.11.0 — 2026-11-15

修三条交互缺陷，界面不再撒谎。

- 视图模式自洽：进入源码模式会关掉专注与打字机，并禁用这两个开关；状态栏只显示真正生效的模式。
- 点页边批注会选中正文里对应的句子并滚到眼前；专注模式下也随之切换到那一段。
- 链接可点开编辑：点正文里的链接弹地址框，改地址或清空退回普通文字。
- 公式可点开编辑：点行内或块级公式弹 LaTeX 编辑框，带实时 KaTeX 预览；清空后保存即删除。
- 新增端到端脚本 `scripts/qa11.mjs`，12 项断言全过。

## 0.10.3 — 2026-11-15

按质量报告收尾，22 条全部处理完。

- 撤销采纳后，那条建议会回到页边，不再是「撤销了但建议永远消失」。
- 源码模式往返不再清空批注：切回时按引文重新定位，正文里还有的留下。
- 源码模式的状态栏字数跟着源码走；提示改到全局 toast，源码模式下也看得见。
- CRLF 文件保存后保持 CRLF，Windows 上不再整篇变 LF。
- 超过 4000 行的文档改用「公共前后缀」差分，只改一行也只会显示那一处，不再显示整篇变化。
- 修复：整篇替换（载入文档、源码切回）不再把所有批注位置映射到文档开头。
- 新增 1 个差分测试，测试总数 146。

## 0.10.2 — 2026-11-15

按质量报告修第三批。

- 导出 HTML 带上 YAML frontmatter（小字块）与脚注（文末「注释」列表），不再丢内容。
- 没有磁盘句柄时保存会明确提示「已下载一份副本」，并保持未保存标记；要写回原文件得用「打开文件夹」。
- 模拟批注的 quote 与 replacement 用同一段原文，采纳不再出现半句重复。
- 对话框开着时全局快捷键让路；`Esc` 依次关查找、设置、保存对比、切换确认与菜单；点菜单外面自动关闭。
- 保存对比点「取消」不再被当成「已经看过」，下次保存会重新提示。
- 分析起点改用文档位置换算出的文本下标，靠后选区不会从错误位置找引文。
- 新增 5 个导出测试，测试总数 145。

## 0.10.1 — 2026-11-15

按质量报告修第二批。

- 设置对话框每次打开同步当前设置：用快捷键调过的字号不会再被「保存」盖回去。
- 字号在保存路径上统一夹取，填 999 会被夹到 26，填 0 不会让正文消失。
- 空文档不再显示「阅读约 1 分钟」。
- 查找跳转与替换不再抢焦点，可以连按 Enter 一直跳。
- 「分析选中」按上下文改文案：有选区是「分析选中」，没有是「分析本段」。
- 分析请求加了并发守卫；切换文档时掐断进行中的请求，结果不再落到新文档上。

## 0.10.0 — 2026-11-15

修掉四条会丢数据的缺陷，缓存改存到文档旁边的 `.sidelight`。

- 切换文档前先拦：有未保存改动时给「保存并切换 / 放弃改动 / 取消」。
- 源码模式下保存写出的是源码内容，不再是编辑前的旧正文；源码下的改动也会置脏、写草稿。
- 载入文档不进撤销栈，`Ctrl+Z` 不再把上一篇的正文拉进当前文件。
- 批注位置跟着事务映射走，手动编辑、查找替换之后不再漂移；采纳前用引文复核位置，对不上就提示重新分析。
- 草稿补上脚注与公式修复；localStorage 写失败不再中断字数与大纲更新。
- 新增 `.sidelight` 缓存目录：文档同级（打开文件夹时在工作区根目录）下存 `drafts/<名字>.md` 与 `annotations/<名字>.json`；保存成功后删草稿，重开文档恢复批注。
- 新增 23 个缓存测试，测试总数 140；新增端到端脚本 `scripts/qa7.mjs` 用浏览器文件系统验缓存读写。

## 0.9.1 — 2026-11-15

加了一条验收脚本，把这一阶段的目标逐条在真浏览器里验一遍。

- `npm run acceptance`：草稿恢复、查找命中、公式渲染、表格工具条、导出 HTML、frontmatter / 脚注 / 行内 HTML 保真、控制台零错误，九项全过。
- 差距表把「自动保存与草稿恢复」从缺移到有。

## 0.9.0 — 2026-11-15

数学公式能用，钱不会变成公式。

- 行内 `$E=mc^2$` 与块级 `$$…$$` 由 KaTeX 渲染，工具栏「插入 → 公式 / 公式块」可直接插。
- 货币写法不误判：开头的 `$` 后带空白、结尾的 `$` 前带空白的成对符号按普通文字处理，`价格 $5 到 $10` 保持原样。
- 公式里的反斜杠在往返时被写成两个，保存时还原。
- 往返报告加入公式样本，当前应用 3/7 完全保真。
- 新增 10 个测试（公式保护与还原），测试总数 114。

## 0.8.0 — 2026-11-15

有了出口，表格能改。

- 导出：HTML（样式内联，单文件可直接发）、Markdown、纯文本，以及打印 / 存 PDF。
- 表格工具条：光标进入表格时出现，可上插行、下插行、左插列、右插列、删行、删列、删表。
- 打印样式：只留正文，隐藏工具栏、侧栏、页边批注与状态栏。
- 新增 5 个测试（导出模板与文件名），测试总数 104。

## 0.7.0 — 2026-11-15

行内 HTML 不再被吃掉，Obsidian 的 callout 也保住了。

- 行内 HTML：解析前把标签的尖括号转成实体，标签就以文字形式留在正文里；保存时再还原。`<kbd>Ctrl</kbd>` 现在打开再保存一字不差。
- callout：`> [!note] 想法` 被编辑器转义成 `> \[!note\] 想法`，保存时还原。
- 风险提示收窄到只剩引用式链接一项。
- 往返报告新增第三列「当前应用」，走真实保存流程：0/6 提升到 2/6 完全保真（脚注、HTML 块）。
- 新增 13 个测试（HTML 7、callout 6），测试总数 99。

## 0.6.0 — 2026-11-15

脚注不再被改坏。

- 脚注定义块从正文里摘出来单独保存，拼回时逐字节一致；行内 `[^1]` 引用会从编辑器转义过的 `\[^1\]` 还原。
- 风险提示不再把脚注算进去：脚注已经能保住，只剩行内 HTML 与引用式链接。
- 源码模式里能看到并编辑脚注定义。
- 新增 9 个测试（脚注提取、拼回、引用还原），测试总数 86。

## 0.5.0 — 2026-11-15

查找替换与字号。

- 查找：`Ctrl + F` 打开，命中全部高亮，当前一处加重；`Enter` 下一处，`Shift + Enter` 上一处。
- 替换：单条替换与全部替换；替换后其余批注按差值平移。
- 字号：设置里可调（12–26），`Ctrl + =` 放大、`Ctrl + -` 缩小、`Ctrl + 0` 复位；存在本地设置里。
- 新增 11 个测试（查找命中与循环），测试总数 77。

## 0.4.0 — 2026-11-15

图片能进来了，读不全的语法不再闷着。

- 图片：工具栏「插入 → 图片」，也支持把图片拖进正文或从剪贴板粘贴。有文件夹句柄时写进 `assets/` 并写成相对路径；没有句柄时先内联，并提示原因。
- 语法风险提示：打开用到行内 HTML、脚注或引用式链接的文档时，顶部出现一条提示，可一键切到源码模式编辑。
- 浮动「分析」按钮只在真有选区时出现，不再跟着光标乱跑。
- 修复：页边提示按内容区分普通提示与错误，错误才用红色。
- 新增 11 个测试（图片文件命名），测试总数 66。

## 0.3.0 — 2026-11-15

堵数据损失：frontmatter 不再被毁，保存前先给你看改了什么。

- YAML frontmatter 单独保存，不进编辑器，拼回时逐字节一致；源码模式里也能看到与编辑。
- 保存前格式对比：第一次保存一篇从磁盘打开（或示例文件）的文档时，把被规范化的行列出来，确认后才写。
- 草稿与文件名一起恢复：刷新后文档名、元数据、正文都回来，状态栏标出恢复时间。
- 状态栏新增「元数据」标记。
- 示例工作区加了一篇带 frontmatter、行内 HTML、脚注的笔记，用来演示对比窗口。
- 新增 21 个测试（frontmatter 12、行差分 9），测试总数 55。

## 0.2.0 — 2026-11-15

补 Typora 的常用视图能力，并把差距写成表。

- 大纲面板：侧栏切「文件 / 大纲」，按标题层级列出，当前章节高亮，点击跳转。
- 源码模式：可编辑原始 Markdown，与所见即所得互切。
- 专注模式：光标所在块之外压暗。
- 打字机模式：光标保持在视口中部。
- 底部状态栏：字数、阅读时间，以及源码、专注、打字机三个状态标记。
- 工具栏：插入（表格、代码块、引用、任务列表、分割线、链接）与格式（H1、H2、粗体、斜体、删除线、行内代码）。
- 快捷键 Ctrl+S 保存。
- 新增 15 个测试（大纲 7、字数 8），测试总数 34。
- 新增 [docs/typora-gap.md](typora-gap.md)：对照官方文档逐项列出已有 10 项、缺 28 项。

## 0.1.0 — 2026-11-15

把右侧结果列表换成页边批注，加上工作区文件树。

- 左侧文件树：可打开文件夹、单个 `.md` 文件，或试用内存示例工作区；当前文件高亮。
- 批注锚定到正文范围：正文里高亮，页边对着那一句放卡片，两处共用同一对位置。
- 批注分两型：修订带改写文字，可逐条「采纳」，采纳后正文被替换、其余批注重算位置；评价只给判断，只有「知道了」。
- 选区旁浮出「分析」按钮，`Ctrl + Enter` 同样触发。
- AI 返回格式从三段文本改为 JSON Lines，边流边定位边渲染。
- 新增 13 个批注解析与锚定测试，测试总数 19。

## 0.0.1 — 2026-11-15

第一版浏览器原型。

- 双栏编辑：Tiptap 3.34，覆盖标题、粗斜体、列表、引用、代码块、链接、表格、任务列表。
- 拖选文字按 `Ctrl + Enter` 触发分析，右侧卡片流式显示概述、建议、核实。
- 卡片支持取消、重试、复制、删除。
- 文档自动存本地，可打开与保存 `.md`。
- 设置里填接口地址、API Key、模型名，走 OpenAI 兼容协议；没填时走模拟流。
- 上下文组装有 6 个单元测试；Markdown 往返损失有测量脚本与报告。
