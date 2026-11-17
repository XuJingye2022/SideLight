# 第 49 轮 Typora 对照与写作体验（finder-typora）

- 轮次参数：`round=49`、`nn=49`；轮前 `startSha=57e2a81748090e63b88b1ad4f998ca3b689e347f`（`git rev-parse HEAD` 实测一致；开工时工作树只有其他 finder 的 `?? docs/iteration/round-49/`、`?? shots/round-49/`）
- 环境：dev server `http://localhost:5175`（未另起、未重启）；CDP `9223`；每段 E2E 前 `node .tmp/reset.mjs 9223`；未启动 Edge、未 kill `msedge`、未 `browser.close()`、未 push、未碰 `release/`
- 只读：未改 `src/`、未改任何已提交文档、未 commit
- 本轮真跑 5 组路径、约 28 组读数（全部在真应用里）：分隔线输入、智能标点、粘贴（富文本与纯文本）、主题保存与刷新持久、字号缩放与 Ctrl+滚轮、行内 HTML 打字 vs 载入、表格列宽拖拽边界
- 脚本：`.tmp/e2e-r49-typora-a.mjs`（`.tmp/r49-typora-a.log`）、`-b.mjs`（`b.log`）、`-c.mjs`（`c.log`）、`-d.mjs`（`d.log`，未取到读数）、`-e.mjs`（`e.log`）；每个都 `page.close()` + `process.exit(0)`
- 截图：`shots/round-49/r49-*.png` 15 张（下表 13 张 + `r49-a-final.png`/`r49-c-final.png` 两次收尾帧；与同目录其他 finder 的 `bug-*`/`code-*`/`r49-ui-*`/`ship-*` 不混用）
- 控制台：6 条错误全是第 42/44/45/46/48 轮已判为环境噪声的 `Cannot read properties of undefined (reading 'id'/'url')` ×4 与 `OfscreenTranslate: …` ×2；**产品代码 0 个新报错**

## 0. 结论先行（6 条可执行：5 条本轮新发现 / 细化 + 1 条文档订正）

| # | 发现 | 级别 | 用户收益 | 改动面 |
| :--- | :--- | :--- | :--- | :--- |
| 1 | **行内 HTML 只有「从文件载入」才渲染**；在编辑视图里打字输入 `<mark>重点</mark>` 不变成真样式（`marks:0`、`kbds:0`），同一段文字存盘重开（或经源码模式回填）才出现键帽/底色 | P2（新） | 写技术文时按 Typora 习惯边写边看键帽，现在看到的是裸标签，会以为语法写错 | 给四个白名单标签各加一条输入规则（成对收尾时把中间文本套上对应 mark），或做 DOM 层装饰；约 40–60 行，不改序列化 |
| 2 | **视图缩放只剩「正文」一档：`Ctrl+滚轮` 完全无反应**，`Ctrl+=` 只改 `--editor-size`（17→18→19 px），侧栏 16 px、状态栏 12 px 不变；全页无「全屏」入口 | P1（新，缺口细化；与 `typora-gap.md:56` 的 P1 一致） | 读者把窗口拖小或换高分屏时，Typora 的 `Ctrl+滚轮` 是第一反应；现在按下去没有任何反馈 | 接 `Ctrl+滚轮` → 整页 `zoom`/`--ui-scale`（或先给「此版本不支持视图缩放」的 toast）；全屏用 `requestFullscreen` + 顶栏按钮，约 30–50 行 |
| 3 | **中文破折号打不出来**：`--` 被换成单个 `—`，中文排版要的是 `——`（两个 em dash）；四个短横才得到 `——`，且没有任何提示 | P2（新） | 中文写作者高频用破折号，现在要么记「打四个短横」，要么手动补一个 | `smartTyping.ts:87` 的 `--` 分支加中文上下文判定（前后有 CJK 就产出 `——`），或设置里加「中文破折号」开关；约 15 行 + 单测 |
| 4 | **表格列宽把手不可见、不可发现**：只有鼠标进到列边界 5 px 内才出现 4 px 淡色把手（合成 mousemove 一次出现 3 个 `.column-resize-handle`），没有「恢复默认列宽」，也没有键盘路径 | P2（新，体验） | 用户不会知道表头可以拖；拖坏了也回不去 | 表头 hover 时给列边界画一条常显细线 + 工具条加「恢复列宽」；约 20–30 行 CSS + 1 个命令 |
| 5 | **图片落盘规则固定 `assets/`、文件名被加 base36 前缀**：`asset.ts:29-37` 强制 `时间戳36进制-原名`，`asset.ts:47` 固定 `assets` 目录；设置面板 6 个字段里没有落盘规则 | P2（新，缺口细化；本轮未重测插图路径） | 素材库里 `assets/mwksenfg-shot.png` 这种名字无法搜索；Typora 支持「与文档同名目录 / 保留原名」 | `Settings` 加 `imageFolder: 'assets' | '${filename}.assets'` 与「保留原名」开关，默认不变；约 40 行 + 2 条单测 |
| 6 | **两份 Typora 文档仍未订正**：`typora-gap.md:42` 说行内 HTML「编辑视图与预览都生效」（实测打字不生效），`:31` 表格列宽没写把手不可见；「缺的（9）」仍漏第 48 轮 F8 点出的 4 类（代码块高亮/语言标签、拼写检查、图片落盘规则、大纲过滤与全部折叠） | P2（文档，第 48 轮 F8 未落地） | planner 照旧表会漏排真缺口、重复排已做项 | 两个 Markdown + README/AGENTS 的「32 / 9」同步 |

排序建议：3（中文破折号，最省且天天碰）→ 1（行内 HTML 输入规则）→ 2（Ctrl+滚轮反馈）→ 6（文档，几分钟）→ 4 → 5。

## 1. 跑过的路径与原始读数

| 路径 | 关键读数 | 判定 |
| :--- | :--- | :--- |
| 空段落打 `---` + 空格 | `.ProseMirror hr:1`（`a1-dash-space`；截图 `r49-hr-typing.png`） | **正常（负结果）** |
| 同上 `***` + 空格、`___` + 空格 | `hr:2`、`hr:3`；`html` 是三个 `<hr>` 夹空段落（`a1-star-space`、`a1-underscore-space`） | **正常（负结果）** |
| 打 `中文--中文----中文...` | 上屏 `中文—中文——中文…`（`a2-dash-dots`） | **`--` 只给一个 `—` → F3** |
| 粘贴网页 HTML（h2+strong+em+a+table）`Ctrl+V` | 落地真 `h2`、`strong`、`em`、`a[target=_blank]`、真表格（`a3-paste-rich`；截图 `r49-paste-rich.png`） | **正常（负结果）** |
| 同一剪贴板 `Ctrl+Shift+V` | `strongs/em/h2:0`，表格退化成 4 行纯文本，换行保留（`a3-paste-plain`） | **正常（负结果）** |
| 空文档打字 `<mark>重点</mark> 与 <kbd>Ctrl</kbd>` | `.ProseMirror mark:0`、`kbd:0`（`a4-inline-html`） | **F1 打字不渲染** |
| 从假文件夹载入含 `<kbd><mark><sub><sup>` 的 `行内.md` | 段落 HTML 是 `<p>按 <kbd>Ctrl</kbd> + <mark>重点</mark> 触发，H<sub>2</sub>O，x<sup>2</sup>。</p>`（`b2-typed.lastP`；截图 `r49-inline-html-loaded.png`） | **载入即渲染（与 F1 两态不一致）** |
| 设置面板：主题三档 | `浅色/深色/跟随系统`，`aria-checked` 正确（`c1-dialog`；截图 `r49-theme-dark-settings.png`） | **正常** |
| 点「深色」→ 预览 | `data-theme: dark`、`body bg rgb(21,23,26)`（`c1-after-pick-dark`） | **正常** |
| 点「保存」→ 刷新页面 | `sidelight.settings.v1` 里 `"theme":"dark"`，刷新后仍 `dark`（`c1-after-save`、`c1-after-reload`） | **正常（负结果）** |
| 深色下 `<mark>` / `<kbd>` 对比度 | kbd 前景 `rgb(233,230,224)` / 底 `rgb(28,31,35)` = **13.28:1**；mark 底是 `color(srgb 0.122 0.167 0.163)`（脚本没解析这种新旧混写，肉眼可读，见截图 `r49-theme-dark-doc.png`） | **正常（负结果）** |
| `Ctrl+=` ×2、`Ctrl+Alt+0` | `--editor-size` 17→18→19→17；`doc-body` 跟着变；`file-tree` 恒 16 px、`status-bar` 恒 12 px（`a5-font-size`） | **整页缩放无（F2）** |
| 编辑器上发 `wheel`（`ctrlKey:true`） | 字号与 `--editor-size` 都不变（`a5-ctrl-wheel`） | **F2：无任何反应** |
| 全页找「全屏」 | `document.fullscreenEnabled:true`，`innerText` 里无「全屏」，`fullscreenElement:false`（`a5-fullscreen`） | **F2：无入口** |
| 表格（3 列）载入后点单元格 | `th` 宽 `[129,129,317]`、`col` 只有 `min-width: 25px`、`.column-resize-handle:0`（`c2-before`、`c2-after-cell-click`） | 把手默认不存在 |
| 同一表格边界发合成 `mousemove`（`clientX = 右边界-2`） | `.ProseMirror` 加 `resize-cursor`，`.column-resize-handle:3`（`e1-synth-mousemove`；截图 `r49-table-synth.png`） | **功能在（负结果）；但只在 5 px 内显形 → F4** |
| 真实鼠标在边界拖 90 px（脚本 C） | 宽度与 `col` 样式都没变（`c2-after-drag`） | **测具污染**：C 脚本前面的设置面板遮罩没关，鼠标事件被遮罩吃掉（E 的合成事件绕过了命中测试）；**不判产品缺陷** |

## 2. F1（P2，新）行内 HTML 只在「载入解析」时渲染，打字输入不渲染

**用户收益**：`docs/typora-gap.md:42` 与 README 都写「四种白名单标签在编辑视图与预览里成为真样式」。实测这只对「从 `.md` 解析进来的」文本成立；当面打字时标签是普通文字，写作者看不到键帽/底色，只能保存重开或进源码模式回填才看见。Typora 是边打边渲染，行为与文档承诺不一致。

**现状证据**：
- `.tmp/r49-typora-a.log` 的 `## a4-inline-html {"marks":0,"kbds":0}`：空文档里打 `<mark>重点</mark> 与 <kbd>Ctrl</kbd>`，DOM 里 0 个 `mark`/`kbd`。
- `.tmp/r49-typora-b.log` 的 `b2-typed.lastP`：从文件载入的同一句话是 `<p>按 <kbd>Ctrl</kbd> + <mark>重点</mark> 触发，H<sub>2</sub>O，x<sup>2</sup>。</p>`——真元素；截图 `shots/round-49/r49-inline-html-loaded.png`。
- 代码：`src/lib/inlineHtmlTags.ts:38-51` 的 `inlineMark()` 只给了 `parseHTML` / `renderHTML` / `renderMarkdown`，**没有 `addInputRules`**，所以输入路径永远进不到 mark；`src/App.tsx:807-809` 只是把 `...inlineMarks` 注册进扩展表。

**实现要点**（最小档，不动字节）：
1. 给四个 mark 各加一条 `InputRule`：`/<mark>([^<&\n]+)<\/mark>$/` 收尾时把匹配段替换成带 mark 的文本；靠 `markdownOptions.htmlReopen` 已经保证序列化仍写回 `<mark>…</mark>`（第 47 轮已验逐字节）。
2. 规则必须跳过代码块与行内代码（与 `smartTyping` 的排除 1/2/3 同口径），否则代码里的 `<kbd>` 会被吃掉。
3. 输入法组合期间（`view.composing`）放行。

**体积与风险**：约 40–60 行 + 3 条单测，<500 B gzip，零依赖。风险：① 不能改保存字节（第 40/41/47 轮往返口径）；② 已支持的「带属性 / 单开 / 跨行」必须继续保真不渲染；③ 与 `html.ts` 的 `repairHtml` 路径别重复转换。

## 3. F2（P1，新，缺口细化）`Ctrl+滚轮` 无反应，`Ctrl+=` 只管正文；没有全屏入口

**用户收益**：Typora 用 `Ctrl+Shift+=` / `Ctrl+Shift+-` / `Ctrl+Shift+9` 做整页缩放，`F11` 全屏（`docs/iteration/typora-features.md:72`、`:76`）。Sidelight 的 `docs/typora-gap.md:56` 已记「整页缩放无」，但没记「`Ctrl+滚轮` 按下去毫无反馈」——用户无法判断是没做还是坏了，这是最容易补的一档。

**现状证据**：`a5-font-size` `{s0:{editorVar:"17px",docBody:"17px",sidebar:"16px",statusBar:"12px"}, s1:18, s2:19, s3:17}`；`a5-ctrl-wheel` 字号与变量都不变；`a5-fullscreen` `{enabled:true, hasFullscreenText:false}`。代码：`src/App.tsx:1800` 只写 `--editor-size`，`src/styles.css:570` 是全仓唯一使用点（`git grep "--editor-size"` 只有这两处）。

**实现要点**：
1. 最小档：`document` 上监听 `wheel` 且 `ctrlKey`，`preventDefault` 后调现有 `setFontSize`（复用 `clampFontSize`），得到「缩正文」的可预期行为，并给一条 toast 说明「只缩放正文，侧栏与状态栏不变」。
2. 完整档：新增 `--ui-scale`，`.app` 上 `zoom: var(--ui-scale)`（Chromium/WebView2 支持），侧栏与状态栏一起缩；`Ctrl+0` 恢复。
3. 全屏：顶栏加按钮 + `document.documentElement.requestFullscreen()`，`Esc` 退出（先看 `App.tsx` 的 window keydown 分支，别与「Esc 关查找」抢，第 35 轮坑）。

**体积与风险**：约 30–50 行，<400 B gzip。风险：`zoom` 在 WebView2（Chromium 109+）可用，但 `Ctrl+滚轮` 与浏览器默认缩放要 `preventDefault`，别把页面整体缩放两次；`E2E` 里要断言 `--editor-size` 与侧栏字号。

## 4. F3（P2，新）`--` 只换成一个 `—`，中文破折号 `——` 打不出来

**用户收益**：中文写作里破折号是常规标点（占两个汉字位）。现在打 `--` 得到 `—`（一个 em dash，视觉上比中文破折号短一半），要打 `----` 才凑出 `——`；没有人会猜到这个规则。

**现状证据**：`a2-dash-dots` 读数 `中文—中文——中文…`（输入 `中文--中文----中文...`）。代码：`src/lib/smartTyping.ts:87` 的 `inserted === '-' && last === '-'` 无条件产出 `'—'`，没有 CJK 判定（同文件 23 行有现成 `CJK` 正则，第 92 行已在用它判半角标点）。

**实现要点**：`smartInput(before, inserted, after, lineBefore)` 已有 `before`，改成「`before` 或 `after` 含 CJK → 产出 `'——'`」，并在 `replace` 分支把光标放到两个 em dash 之后（现成逻辑按 `text.length` 落位，不用改）。补 2 条单测：中文后 `--` → `——`；英文 `word--word` → `—`。若要稳妥，`Settings` 加 `chineseDash`（默认开）。

**体积与风险**：约 15 行 + 2 条单测，<150 B gzip。风险：① 表格分隔行 `| --- |` 已被 `lineBefore.includes('|')` 守卫（`:85`），改动不能碰那条；② 三连 `---` + 空格的分隔线转换本轮实测正常（`a1-*`），改完必须重跑这三条断言。

## 5. F4（P2，新，体验）表格列宽把手不可发现，也没有「恢复默认列宽」

**用户收益**：`docs/typora-gap.md:31` 说「表头边界可拖拽改列宽」。功能确实在（合成 mousemove 一次出现 3 个把手），但把手是 `position:absolute; width:4px; background:var(--accent); pointer-events:none`（`src/styles.css:735-744`），**只在 `activeHandle > -1` 时挂进 DOM**——也就是鼠标必须先进到列边界 5 px 内（prosemirror-tables `handleWidth` 默认 5）。作者不知道有这功能；拖坏了 Markdown 又不存宽度（`:31` 已注明只在本会话有效），没有「恢复」按钮。

**现状证据**：`c2-after-cell-click` `{handles:0}`、`c2-hover` `cursor:"auto"`；`e1-synth-mousemove` `{proseClass:"… resize-cursor", handles:3}`、`thAttr:null`、`col` 只有 `min-width:25px`。截图 `shots/round-49/r49-table-synth.png`。

**实现要点**：
1. 表头 `th:hover` 时用 CSS 画一条常显的列边界细线（纯 CSS，不指望 `activeHandle`），或在工具条加「列宽：拖动表头边界调整」一行提示。
2. 工具条加「恢复列宽」：把当前表所有单元格 `colwidth` 清成 `null`（一条 `setNodeMarkup` 链或 `tr.setNodeAttribute`），并让 `updateColumns` 重算；配 1 条 E2E（拖宽 → 点恢复 → 宽度回到载入值）。
3. 不动 `ReusableTable` 的 `renderMarkdown`（`src/App.tsx:134-143`）。

**体积与风险**：约 20–30 行，<300 B gzip。风险：把手是 widget，别用 `pointer-events` 变化破坏拖拽命中区；「恢复列宽」要能与撤销栈配合（一次事务）。

## 6. F5（P2，新，缺口细化）图片落盘规则固定 `assets/` + base36 前缀；设置里没有选项

**用户收益**：Typora 有三档落盘规则（`docs/iteration/typora-features.md:47`：相对路径 / `./assets` / `${filename}.assets`）。Sidelight 固定写 `assets/`，而且文件名被改成 `时间戳36进制-原名`，实测落盘是 `assets/mwksenfg-shot.png`（第 48 轮 C3）。素材目录里这类名字无法按原文件名搜索/替换，也不符合「一篇文档一个素材目录」的整理习惯。

**现状证据**：`src/lib/asset.ts:29-37` `assetFileName()` 强制 `${timestamp.toString(36)}-${body}.${ext}`；`asset.ts:42-52` 固定 `dir.getDirectoryHandle('assets', { create: true })` 并返回 `assets/${fileName}`。设置面板本轮实测字段只有 6 个：`接口地址 / API Key / 模型 / 正文字号（12–26） / 联网核对（可选） / 批注提示词（作者偏好）`（`b3-settings-open.fieldLabels`），**没有落盘规则**。本轮未重跑插图路径（时间用在上面 5 条），引第 48 轮 C3 读数。

**实现要点**：`Settings` 加 `imageFolder: 'assets' | 'document'`（`document` = `${文档名}.assets`）与 `keepImageName: boolean`；`writeAsset(dir, fileName, blob, options)` 里改目录名与文件名生成；`assetResolve.ts` 的 `isRelativeAsset` 已支持 `sub/assets/b.png` 形式（`assetResolve.test.ts:18-20`），解析侧不用改。默认值保持现状，避免老文档路径变化。

**体积与风险**：约 40 行 + 2 条单测，<500 B gzip。风险：`${filename}.assets` 要处理同名文件与空文件名；写盘失败路径已有 toast（第 48 轮 C3 的 `createWritable` 报错走了同一条提示）。

## 7. F6（P2，文档）`docs/typora-gap.md` 与 `typora-features.md` 仍过期；「缺的（9）」计数与真缺口不一致

本轮逐条复核（计数本身一致：已有 32 行、缺 9 行）：

| 文件:行 | 现在写的 | 实际 |
| :--- | :--- | :--- |
| `docs/typora-gap.md:42` | 行内 HTML「编辑视图与预览都生效」 | 只有从文件解析时生效；编辑视图打字不渲染（本轮 `a4-inline-html`） |
| `docs/typora-gap.md:31` | 表格「表头边界可拖拽改列宽」 | 功能在，但把手只在 5 px 内显形、无恢复入口（本轮 `e1-*`、`c2-*`） |
| `docs/typora-gap.md:41` | 粘贴为纯文本「浏览器原生键，桌面宿主未验证」 | 浏览器里本轮实测可用（`a3-paste-plain`）；宿主仍 UNVERIFIED |
| `docs/typora-gap.md`「缺的（9）」 | 9 行 | 仍漏第 48 轮 F8 的 4 类：代码块高亮/语言标签、拼写检查、图片落盘规则、大纲过滤与全部折叠 |
| `docs/iteration/typora-features.md:43,44,51,98,109` | 「不能折叠大纲」「源码模式无键位」「Ctrl+P 无」 | 第 48 轮 F8 已列，仍未订正 |
| `docs/typora-gap.md:56`（视图缩放） | 「整页缩放无；正文字号缩放已有」 | 可补一句「`Ctrl+滚轮` 无反应、无全屏入口」，免得当成已做 |

**改动面**：两个 Markdown + README/AGENTS 的「32 项有、9 项缺」→ 建议改「32 / 13」，并在 `typora-features.md` 顶部加一行「过期横幅（2026-11-17 第 49 轮复核）」。

## 8. 试过、但判断没有问题的路径（负结果，防止下轮重复）

1. **分隔线输入完好**：`---`、`***`、`___` 各加一个空格都在空段落里生成 `<hr>`（`hr:1 → 2 → 3`）。不要因为 `smartTyping.ts:87` 改 `--` 就以为分隔线坏了——本轮实测就是证据。
2. **粘贴富文本**：网页 HTML 剪贴板（h2+strong+em+a+table）`Ctrl+V` 落地成真标题、粗斜、外链、真表格，表格没有丢列。
3. **粘贴为纯文本**：同一剪贴板 `Ctrl+Shift+V` 得到纯文本 4 行，`strong/em/h2/table` 全为 0。
4. **主题保存与持久化**：设置里点「深色」当场 `data-theme=dark`，点「保存」后 `localStorage['sidelight.settings.v1'].theme` 是 `dark`，整页刷新仍是 `dark`；对话框按钮组是 `浅色 / 深色 / 跟随系统 / 恢复默认 / 快捷键 / 取消 / 保存`。
5. **深色下 kbd 对比度**：13.28:1，远高于 WCAG AA。
6. **表格列宽插件是注册着的**：合成 mousemove 后 `.ProseMirror` 有 `resize-cursor`、DOM 里 3 个 `.column-resize-handle`——第 37 轮的功能没坏，坏的是「可发现性」（F4）。
7. **控制台**：6 条错误全是旧噪声（`reading 'id'/'url'`、`OfscreenTranslate`），本轮产品代码 0 新报错。
8. **「保存失败：file.handle.createWritable is not a function」**：这是我假工作区的 FileSystemHandle 没实现 `createWritable`，**不是产品缺陷**，第 48 轮的假工作区也是同款（只读），不要再报。

## 9. 未验证 / 下一轮怎么补

- **F1 的输入规则原型**：没写原型；`Decoration` 与输入规则两条路的取舍未量。补测：实现后跑 `npm test` + 打开带四种标签的文档做「打字 / 载入 / 保存 / 重开」四条断言。
- **F2 的整页缩放**：`zoom` 在 WebView2 宿主里的表现未测；宿主 `Ctrl+滚轮` 是否被 WebView2 吞掉未测（`AreBrowserAcceleratorKeysEnabled` 只关加速键，滚轮另说）。
- **F4 的真实拖拽**：本轮真实鼠标拖拽被设置面板遮罩污染（脚本 C 顺序问题），只有合成事件读数。下一轮：单独开页 → 直开表格 → 鼠标进边界 → 拖 90 px → 量 `th` 宽，再点「恢复列宽」（若已实现）。
- **F5 的插图路径**：本轮没重跑插入图片（`page.setInputFiles` 到隐藏 input），落盘名与目录引第 48 轮 C3。
- **宿主/打包版**：全部读数来自 dev server（CDP Chromium）；WebView2 宿主里的 `Ctrl+滚轮`、`全屏`、行内 HTML 输入未测。
- **Typora 侧**：本轮只读 `.tmp/typora-ref` 的静态文档与 `docs/iteration/typora-features.md`，没有重新运行 Typora。

## 10. 截图（`shots/round-49/`，下表 13 张 + 2 张收尾帧）

| 文件 | 内容 |
| :--- | :--- |
| `r49-hr-typing.png` | 空段落打 `---` + 空格后的分隔线与尾部空段落（负结果） |
| `r49-paste-rich.png` | 网页 HTML 粘贴成真标题/粗斜/表格（负结果） |
| `r49-inline-html-loaded.png` | 从文件载入的 `<kbd>/<mark>/<sub>/<sup>` 是真样式（F1 对照） |
| `r49-inline-html-typed.png` | 同一编辑器里打字输入的标签仍是字面（F1） |
| `r49-inline-html-source-roundtrip.png` | 源码模式回填后的行内 HTML（F1 的两态差异） |
| `r49-theme-dark-settings.png` | 设置面板主题三档，切深色即时预览（负结果） |
| `r49-theme-dark-dialog.png` | 脚本 A 里的设置面板与深色预览（负结果） |
| `r49-theme-pick-dark.png` | 主题预览：`data-theme=dark`、深底（负结果） |
| `r49-theme-dark-doc.png` | 深色正文与 `<mark>` / `<kbd>` 的对比（负结果） |
| `r49-theme-after-reload.png` | 刷新后主题仍是深色（负结果） |
| `r49-table-open.png` | 载入的 3 列表格（F4 背景） |
| `r49-table-synth.png` | 边界悬停时出现 3 个 `.column-resize-handle`（F4 证据） |
| `r49-table-drag.png` | 真实鼠标拖拽后的宽度（脚本 C 被遮罩污染，不作产品证据） |
