# 第 7 轮缺陷侦察（finder: r7-bug）

主题：Markdown 往返保真与 `.md` 关联。只侦察，未改产品代码。

- 仓库 `D:\Documents\SidelightProgram`，HEAD `92a3ac6`（产品代码等同 `d5e7b8d`），版本 0.19.0。
- 验证方式：`npm run roundtrip`；`.tmp/r7-bug/probe.mjs` 复刻 App 保存管线跑边界样本；CDP 9222 连 `http://localhost:5173`，用 stub 文件选择器走真实「打开 → 编辑 → Ctrl+S」路径；`.tmp/r7-bug/host-sim.mjs` 用模拟的 `/__doc` 响应与 `postMessage` 走宿主保存分支。
- 复现脚本：`.tmp/r7-bug/probe.mjs`、`browser.mjs`、`browser2.mjs`、`two.mjs`、`host-sim.mjs`。日志：`.tmp/r7-bug/probe.log`、`browser.log`、`browser2.log`、`host-sim.log`。
- 截图：`shots/round-07/ref-link-banner.png`、`ref-link-source-mode.png`、`ref-link-save-dialog.png`、`table-save-dialog.png`、`table-edited.png`。
- `npm run roundtrip` 重写 `docs/roundtrip-report.md` 后哈希不变（`CE95BBE3…`）；`git status` 未见产品代码改动。

## 结论

roundtrip 仍 3/7 完全保真：`03-footnotes`、`05-html-block`、`07-math` 通过；`01`、`06` 只差空行，`02` 表格被规范化，`04` 引用式链接定义被删。

比报告数字更严重的是**守卫只在浏览器路径的第一次保存生效**：宿主双击打开的 `.md` 直接写回、不弹差异；风险横幅只提示，不拦保存；横幅给的出口「改用源码模式」显示的是已改写内容，不是原文件。风险检测只覆盖「引用式链接定义」一种语法，表格、多行脚注、含 `&` 的 HTML 都会静默改坏。

## 1. roundtrip 逐样本结果（`npm run roundtrip`）

| 配置 | 完全保真 |
| :--- | ---: |
| 仅 StarterKit | 0 / 7 |
| StarterKit + 表格 + 任务列表 | 0 / 7 |
| 当前应用（扩展 + 保真修复） | 3 / 7 |

当前应用逐样本：

| 样本 | 结果 | 删除/新增 | 原因分类 |
| :--- | :--- | ---: | :--- |
| 01-obsidian-note.md | 有变化 | -1 / +0 | 空行：frontmatter 结束 `---` 与正文之间的空行被吞 |
| 02-table.md | 有变化 | -3 / +5 | 表格分隔行被规范化（`|:-----|-----:|` → `| :--- | ----: |`）；列宽重排；表格前多一个空行 |
| 03-footnotes.md | 完全保真 | 0 / 0 | — |
| 04-reference-links.md | 有变化 | -4 / +1 | 引用式链接定义被删，引用改成行内链接 |
| 05-html-block.md | 完全保真 | 0 / 0 | — |
| 06-task-list.md | 有变化 | -0 / +1 | 空行：任务列表与普通列表之间插入空行，一个列表被拆成两个 |
| 07-math.md | 完全保真 | 0 / 0 | — |

补充：报告里的 `normalize()` 先 `replace(/\s+$/, '')`（`scripts/roundtrip.mjs:37`），所以**文件末尾换行丢失**不计入 diff。以换行结尾的文档，实际保存后末尾换行已丢（见 B3）。

## 2. 缺陷

### B1 宿主双击打开的 `.md` 保存时没有任何差异确认；风险横幅不拦保存

**现象（已验证：模拟宿主响应；真实宿主进程未运行）**
宿主文档由 `applyHostPayload` 载入时把 `saveWarned` 设为 `true`（`src/App.tsx:688`）。`saveFile` 的宿主分支排在保存前对比之前（`src/App.tsx:1612-1623`）：只判 `dirty`，然后 `sendHostSave(text)`，`SaveDialog` 永不出现。风险横幅只有「改用源码模式」和「知道了」两个按钮（`src/App.tsx:2771-2780`），保存函数不读 `risks`。

用模拟 `/__doc` 响应（正文即 `04-reference-links.md`，`readOnly: false`）让页面进入宿主模式：文档名、风险横幅都正常出现；改文末一个字后按 `Ctrl+S`，**没有差异框，也没有文件选择器**，直接发出一条 `postMessage`：

```
{"v":1,"type":"save","id":1,"text":"# 引用式链接\n\n参考 [Tiptap](https://tiptap.dev) 与 [CodeMirror](https://codemirror.net)，还有 [行内链接](https://tauri.app)。 追加。"}
```

两行 `[tiptap]: …` 定义不在正文里。

浏览器路径的对照实验证明「提示一次后就不再提示」：打开 `04-reference-links.md`，改文末，第一次保存弹差异；点「仍然保存」后第二次保存直接写入（`browser.log`：`refSecondDialogOpen: 0`，`refWriteCountAfterSecond: 2`）。宿主路径连这第一次都没有。

**复现**
1. 用宿主打开 `fixtures/markdown/04-reference-links.md`（或任何带引用式链接定义、表格的 `.md`）。
2. 在别处改一个字，按 `Ctrl+S`。
3. 预期：弹差异或拒绝保存。实际（按代码推断）：直接写回，`[tiptap]: …` 两行定义消失。

**证据**
- `src/App.tsx:688`、`1612-1623`、`1633-1640`；`src/components/SaveDialog.tsx:50`（文案「这次只提示一次」）。
- `browser.log` 的第二次保存无对话框；`ref-link-save-dialog.png` 是浏览器路径唯一一次提示。
- `host-sim.log`：`saveDialog: 0`、`pickerCalled: false`、`hostMessages` 里是带改写正文的 save 消息。
- 真实宿主 `http://127.0.0.1:47821/__doc` 当前不可达；C# 宿主进程本身未验证。

**影响**
上一轮刚做完的「双击 `.md` 写回」绕过了唯一防线。用户看不到任何提示，引用式链接定义、表格格式、多行脚注会被静默写回。除 git 外不可恢复。

**建议**
- 宿主分支也走保存前对比：至少每篇文档第一次保存必弹；之后只在「删除行来自原始文件且不是用户编辑」时再弹。
- 把 `risks` 接进保存：有风险语法且这次 diff 包含规范化删除 → 显示差异，「仍然保存」才写。
- 文案不要写「这次只提示一次」，改成「这篇文档后续保存不再提示」。

**难度** 中（要区分用户编辑与规范化，不能每次保存都打扰）。

---

### B2 引用式链接：富文本保存必删定义；「改用源码模式」显示的是已改写内容

**现象（已验证，浏览器真实保存路径）**
打开 `04-reference-links.md`：横幅出现，正文只剩链接文字。点横幅的「改用源码模式」，textarea 内容是

```
# 引用式链接

参考 [Tiptap](https://tiptap.dev) 与 [CodeMirror](https://codemirror.net)，还有 [行内链接](https://tauri.app)。
```

两行定义已经不在。保存写入的也是这份内容（`refWrites`，`refSavedHasDefs: [false]`）。原因是源码模式的内容来自 `currentMarkdown()`（`src/App.tsx:2035-2039`），而 `currentMarkdown()` 由编辑器序列化得到；定义在载入解析时就丢了。

引用式图片同样丢内容：`![图][img]` + `[img]: https://x.test/a.png` 保存后只剩「图」（`probe.log` B7），图片节点消失。

**复现**
1. 打开 `fixtures/markdown/04-reference-links.md`。
2. 点横幅「改用源码模式」，检查 textarea：没有 `[tiptap]:`。
3. 回到富文本，`Ctrl+S`，在差异框点「仍然保存」。写入文件无定义块，引用全部变成行内链接。

**证据**
- `browser.log`：`refSourceHasDefs: false`、`refWrites`、`refDialogText`（`−[tiptap]… −[cm]… +参考 [Tiptap](…)`）。
- `shots/round-07/ref-link-source-mode.png`、`ref-link-save-dialog.png`。
- `probe.log` 的 B7；`docs/roundtrip-report.md` 的 04 段（-4 / +1）。

**影响**
引用式链接是 Obsidian、Typora、Pandoc 常见写法。保存一次就永久改成行内链接，定义块删除。横幅把用户引向的「源码模式」不能恢复原文，只显示坏掉的结果；用户以为安全，实际要手工补回。这违反本轮「不许提示了但照样改坏」的要求。

**建议**
- 首次进入源码模式时用原始文件正文（`originalText` 或宿主正文）初始化 `sourceText`，不要从编辑器序列化；用户改过正文后再按现在的规则合并。
- 富文本保存遇到 `risks` 时强制走差异确认（与 B1 同一处改）。
- 长期：为引用式链接增加解析/序列化支持，或在载入时保留定义块（像 frontmatter、脚注那样摘出去、保存时拼回）。

**难度** 中（源码初始化 + 保存闸门；完整保真另算，偏大）。

---

### B3 表格每次保存都改分隔行与列宽、多插空行；以换行结尾的文档保存后丢末尾换行

**现象（已验证，浏览器真实保存 + 探针）**
- 只改表格**外**的段落，保存后表格 3 行全变：`|:-----|-----:|:----:|` → `| :--- | ----: | :----: |`，每列宽度按内容重算（`tableSavedSeparator`）。
- 改表格**内**文字也改分隔行；「改列宽」在富文本里没有对应概念，保存时总是按内容重算。
- 表格前、后各多一个空行：`# 三个月的账\n\n\n| …`、`| 书 …|\n\n\n表格后面`（`tableWrites`）。
- 以换行结尾的文档，保存产物末尾没有换行：`refWrites`、`tableWrites`、`htmlWrite`、`footWrite` 都以 `。` 结尾。四篇原文都以 `\n` 结尾。
- 表格文档没有风险横幅（`tableBanner: "NO BANNER"`）。

**复现**
1. 打开 `fixtures/markdown/02-table.md`。
2. 光标放到表格后的段落，输入「 追加。」。
3. `Ctrl+S`：差异框列出表格全部行；确认后写入的分隔行已规范化，末尾无换行。

**证据**
- `browser.log`：`tableWrites`、`tableDialogText`、`tableSavedSeparator`、`tableCellWrite`。
- `shots/round-07/table-save-dialog.png`、`table-edited.png`。
- `probe.log` T1–T4；`docs/roundtrip-report.md` 02 段（-3 / +5）。

**影响**
每个表格文档每次保存都产生大 diff，git 噪音，无法与外部工具协作。末尾换行丢失影响所有文档（POSIX 工具和 diff 会显示 `\ No newline at end of file`）。本轮目标是「保真或拒绝」，现在两样都没有。

**建议**
- 短期：把「表格」加进风险检测；保存前对比里把表格行变化单独提示；序列化后若原文以换行结尾则补 `\n`。
- 长期：表格节点保存原始分隔行/列宽（node attrs 或源文本映射），保存时原样输出未改动的表格。

**难度** 小（检测 + 末尾换行）；大（表格逐字节保真）。

---

### B4 含 `&` 的 HTML 标签、自动链接、HTML 注释被写坏，且没有风险提示

**现象（已验证，浏览器真实保存 + 探针）**
保存后的实际内容（`browser2.log` 的 `htmlWrite`）：

```
&lt;a href="[https://x.test/?a=1&amp;b=2"&gt;链接</a>](https://x.test/?a=1&b=2">链接&lt;/a>)

自动链接 &lt;[https://example.com/a?b=1&gt;](https://example.com/a?b=1>) 与注释：

&lt;!-- 这是注释 --&gt;
```

输入是 `<a href="https://x.test/?a=1&b=2">链接</a>`、`<https://example.com/a?b=1>`、`<!-- 这是注释 -->`。原因：`repairHtml` 的正则用 `[^&\n]*?` 排除 `&`（`src/lib/html.ts:1`），属性里带 `&` 的标签还原不了；`escapeHtmlForParse` 只转义 `<`（`src/lib/html.ts:22`），自动链接和注释没有对应的还原规则。

**复现**
1. 打开含上述三行的 `.md`。
2. `Ctrl+S`，确认差异框。写入内容变成实体与链接混合的乱码。
3. 同一文档没有风险横幅。

**证据**
- `browser2.log`：`htmlWrite`、`htmlBanner: "NO BANNER"`。
- `probe.log` H1、H3、H4；对照 H5/H6（无 `&` 的 `<kbd>`、`<div>` 能还原，样例 `05-html-block.md` 因此判「完全保真」）。

**影响**
合法 Markdown 被写坏，渲染结果可能完全不同。现有 fixture 只覆盖无 `&` 的标签，测试给人「HTML 已保真」的错觉。

**建议**
- 不按「标签形状」猜：解析前只转义 schema 不认识的标签，保存时按同一张表还原；或把行内 HTML 与 HTML 块整段摘出、原样拼回（和 frontmatter/脚注同一策略）。
- 补 fixture：属性含 `&` 的标签、自动链接、HTML 注释、`<br>`、带空格的 `<a href>`。

**难度** 中。

---

### B5 多行脚注定义被拆成行内链接 + 代码块；对话框还说「脚注已经原样保留」

**现象（已验证，浏览器真实保存 + 探针）**
输入：

```
正文[^1]。

[^1]: 第一行
    续行文字
```

保存后：`正文[^1](第一行)。` + ` ```\n续行文字\n``` `（`browser2.log` 的 `footWrite`）。没有风险横幅。差异框文案仍写「frontmatter 与脚注已经原样保留」（`src/components/SaveDialog.tsx:37`）。

原因：`extractFootnotes` 只认「从第一个定义行到文末，中间只允许空行、每行都是定义行」的块（`src/lib/footnotes.ts:23-35`）；缩进续行不匹配，整块不摘出，按普通段落解析。

**复现**
1. 打开上面的脚注文档。
2. 改文末一个字，`Ctrl+S`，确认保存。写入内容如上。

**证据**
- `browser2.log`：`footWrite`、`footBanner: "NO BANNER"`。
- `probe.log` F2、F3（两段式脚注同样坏）。
- `src/lib/footnotes.ts:23-35`、`src/components/SaveDialog.tsx:37`。

**影响**
Pandoc / Obsidian 的多行脚注会被破坏；用户在同一屏看到「脚注已经原样保留」，判断被误导。

**建议**
- 提取规则支持缩进续行与「空行 + 缩进」的后续段落；识别不了的脚注定义要进风险检测。
- 对话框文案改成「已识别的 frontmatter 与脚注原样保留」。

**难度** 中。

## 3. 风险语法检测覆盖（`findRiskySyntax`）

实现只有一条正则（`src/App.tsx:139-143`）：匹配 `^\[…\]:\s+\S+` 的行，并排除 `[^…]:` 脚注定义。没有对应测试。

| 语法 | 是否提示 | 实际保存结果 | 证据 |
| :--- | :--- | :--- | :--- |
| 引用式链接定义 | 是 | 定义被删，改行内链接 | roundtrip 04；browser |
| 引用式图片定义 | 是 | 图片节点消失，只剩 alt 文字 | probe B7 |
| 表格 | 否 | 分隔行、列宽、空行被重写 | browser table |
| 多行脚注 | 否 | 链接 + 代码块 | browser2 foot |
| 行内 HTML（无 `&`） | 否 | 能还原 | roundtrip 05 |
| 行内 HTML（含 `&`） | 否 | 写坏成实体与链接混合 | browser2 html |
| 自动链接 / HTML 注释 | 否 | 转成 `&lt;…` | probe H3、H4 |
| 数学公式 | 否 | 能还原 | roundtrip 07 |
| callout | 否 | 能还原 | roundtrip 01（除空行） |
| 硬换行 `\` 结尾 | 否 | 变两个空格 + 换行 | probe B2 |
| setext 标题、缩进代码、`***` 分隔线 | 否 | 改成 `#`、围栏、`---` | probe B3–B5 |
| 任务列表 | 否 | 任务列表与普通列表之间插空行 | roundtrip 06 |
| frontmatter | 否 | 保留，但后面空行被吞 | probe two.mjs |

误报：代码围栏里的 `[a]: https://x.test` 会触发横幅，但保存没有损失（`probe.log` findRiskySyntax 段）。`^` 行首匹配也认不出缩进代码块里的定义。

## 4. `.md` 关联现状（只读查询，未写注册表）

本机实测（2026-11-15）：

- `HKCU\Software\Classes\.md`：键存在，**没有默认值，没有子 ProgID**，只有 `OpenWithProgids`。
- `HKCU\Software\Classes\.md\OpenWithProgids`：只有一个值 `VSCode.md`（空值）。
- `HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\FileExts\.md\UserChoice`：**不存在**。
- 同路径 `OpenWithList`：`a = Code.exe`（MRU）。
- `HKLM\Software\Classes\.md`：不存在。
- `HKCR\.md`：无默认值；`HKCR\.md\OpenWithProgids` 只有 `VSCode.md`；`HKCR\VSCode.md` 默认值「Markdown 源文件」。
- 没有 `Sidelight.md` 或 `Applications\Sidelight.exe` 的 ProgID。

Opt-in 能做到：注册 `HKCU\Software\Classes\Sidelight.md`（含友好名与 `shell\open\command`）、写 `HKCU\...\.md\OpenWithProgids\Sidelight.md`（空值）、可选注册 `Applications\Sidelight.exe`（`FriendlyAppName`、`SupportedTypes\.md`）。这样 Sidelight 进入「打开方式」候选列表，卸载对称删除。

Opt-in 做不到：不能设默认程序。Windows 8+ 的默认程序记录在 `UserChoice`，受哈希保护；安装器写入会被系统判为篡改或直接拒绝。也不能承诺「双击即用 Sidelight」；本机现在连默认 `.md` 处理程序都没有，双击很可能弹「选择打开方式」（未验证）。`/S` 静默安装不应写关联（`packaging/README.md:55` 的备忘）。

实施约束：`packaging/installer.nsi` 当前只有 `MUI_PAGE_DIRECTORY` 与 `MUI_PAGE_INSTFILES`（第 30-31 行），没有 `MUI_PAGE_COMPONENTS`。直接加 `Section /o "…"` 用户看不到这个选项，必须先加组件页或自定义页；这会多一个安装页。卸载段在第 106-112 行，对称删除也放这里。

这四条与第 6 轮 `docs/iteration/round-06/findings-ship.md` 的 S4 结论一致；本轮只补了本机注册表现状与 NSIS 页面约束。

## 5. 优化机会（最多 3 条）

1. **roundtrip 的归一化掩盖了真实损失**：`normalize()` 的 `replace(/\s+$/, '')`（`scripts/roundtrip.mjs:37`）把末尾换行和结尾空行都吃掉，报告因此看不到 B3 的「丢末尾换行」。建议改成只统一 `\r\n`、逐行去行尾空白，保留末尾换行；否则门禁永远显示 3/7 而真实保存更差。
2. **风险检测应独立成库并加测试**：`findRiskySyntax` 现在埋在 `App.tsx:139`，一条正则、零测试、会误报代码围栏。抽到 `src/lib/risk.ts`，用「语法 → 提示语 → 是否内容丢失」的表驱动，配单测；B1 的保存闸门也需要同一个判定。
3. **序列化/修复链重复四处**：`src/App.tsx:153`、`577`、`1598` 与 `scripts/roundtrip.mjs:31-32` 各写一遍 `repairCalloutMarkers(repairHtml(repairMath(repairFootnoteRefs(...))))`。抽成一个函数，并让它返回「触发了哪些修复」，供风险检测和保存差异分类复用。

## 6. 未验证

- 真实宿主进程（`127.0.0.1:47821` 不可达）：B1 用模拟 `/__doc` + `postMessage` 走通了前端宿主分支，C# 宿主本身的接收/落盘未验证（不碰真实文件）。
- Windows 11「打开方式」界面是否显示只注册了 `OpenWithProgids` 的应用：需要真人点界面，未验证。
- 系统文件选择器：探针用 stub 替换 `showOpenFilePicker`/`showSaveFilePicker`，真实选择器的行为未测。
