# 第 41 轮 Typora 对照与写作体验（finder-typora）

- 轮前 startSha：`25297acee40d40fec4bcbe770c416f43faaf2d7a`（当前 HEAD，工作区干净）
- 环境：dev server `http://localhost:5175`、CDP `9223`、每次先跑 `node .tmp/reset.mjs 9223`
- 本轮真跑 7 条用户路径：输入智能标点、Markdown 自动配对、手写表头建表、查找大小写/整词、源码模式、专注模式、代码围栏与 `[toc]` 往返
- 脚本：`.tmp/e2e-r41-typora-a.mjs`、`.tmp/e2e-r41-typora-b.mjs`（均为只读，未改产品代码；未 push、未动 `release/`）
- 控制台：两脚本 `console error` / `pageerror` 都是 **0 条**

## 0. 结论先行（8 条，全部有本轮实测）

| # | 项 | 级别 | 用户收益 | 改动面 |
| :--- | :--- | :--- | :--- | :--- |
| 1 | 查找没有「区分大小写 / 整词」开关 | P1 | 查 `State` 不会连 `state`、`states` 一起亮；库已支持大小写，只差 UI | `FindBar.tsx` + `App.tsx:1794` |
| 2 | 手写表头行 `\| A \| B \|` + Enter 不建表 | P2 | Typora 用户最顺手的建表路径；现在只得到字面文本 | 一个输入规则，约 50 行 |
| 3 | 自动配对只覆盖括号/引号，不含 Markdown 符号 | P2 | `**粗体**`、`` `代码` ``、`~~删除~~` 少打一半标记 | `smartTyping.ts` 扩表，风险高 |
| 4 | 拼写检查固定关闭，设置里也没有开关 | P2 | 中英混写时英文错字无人提示；Typora 有「Spell Check」语言选项 | `App.tsx:803` + 设置项，约 15 行 |
| 5 | 源码模式是裸 textarea，没有行号 | P2 | 长文定位（第 300 行）靠肉眼数；Typora 源码模式左侧有行号 | 行号槽 + 滚动同步，无新依赖 |
| 6 | 智能标点把 `--` 换成 `—`：打不出 en dash，句中 `---` 留残 `-` | P2 | `a---b` 现在得到 `a—-b`；Typora 是 `--`→`–`、`---`→`—` | `smartTyping.ts:61`，约 10 行 |
| 7 | 专注模式没有首次提示条 | P2 | 第一次开 F8 后不知道还能关；Typora 弹「专注模式已开启 / 不再显示」 | 复用现有 toast，约 30 行 |
| 8 | `docs/typora-gap.md` 计数与行过期 | P2（文档） | 规划依据失真；「缺的」应 11 → 15 | 单文件 |

## 1. P1 查找没有大小写与整词开关（库已支持，UI 没接）

**用户收益**：写代码/英文术语时只查 `State`；也能只查整词 `state`，不被 `states` 干扰。这是 Ctrl+F 每天用的路径。

**现状证据（真实应用）**：
- 文档 `# State` + `state 与 STATE，还有 states。`，`Ctrl+F` 输入 `state`，面板显示 **`1 / 4`**，四处命中全部高亮（`shots/round-41/t2-find.png`）。这说明默认不区分大小写，且按子串匹配。
- 查找条只有 5 个按钮：`上一处 / 下一处 / 关闭查找 / 替换 / 全部替换`，2 个输入框，0 个 checkbox/开关（E2E DOM 实测）。
- 代码里 `FindOptions` 只有 `caseSensitive`（`src/lib/find.ts:3`），`findAll` 已按它分流（`find.ts:22-23`），单元测试也覆盖了两种模式（`src/lib/find.test.ts:7-8`）。但调用点把值写死：`findAll(index, query, { caseSensitive: false })`（`src/App.tsx:1794`）。
- 整词匹配在 `find.ts` 里根本没有字段。
- 设置与快捷键对话框都没有入口。

**Typora 行为**：顶部通栏查找条右侧有 `Aa`（大小写）与整词按钮（`shots/typora/63-find.png`；`docs/iteration/typora-features.md:50`）。

**实现要点**：
- `FindBar.tsx:36-79` 加两个 toggle 按钮（`Aa`、`ab`），props 传 `caseSensitive` / `wholeWord` 与回调。
- `App.tsx` 加两个 state，传给 `findAll`；`FindOptions` 扩为 `{ caseSensitive: boolean; wholeWord: boolean }`。
- 整词判定放在 `findAll` 里：命中区间两端字符不接 `[A-Za-z0-9_]` 才算（中文无词边界，整词开关对中文等同关闭；这一条要写进 UI title）。
- 命中、跳转、替换全部走 `matches` 同一个数组，无第二条路径。

**体积与风险**：约 40 行 UI + 10 行过滤，gzip +400 B 以内。风险只在「整词」边界定义，补 2 条单测即可（`find.test.ts`）。

**建议优先级**：P1（改动最小、频率最高，且库已备好）。

## 2. P2 手写表头行 + Enter 不建表

**用户收益**：Typora 用户迁移后，写 `| 姓名 | 年龄 |` 回车就是一张表；现在要回工具栏点「插入表格」再填。

**现状证据（真实应用）**：空文档输入 `| A | B |` 再 Enter，正文仍是字面 `| A | B |`，DOM 里 `table` 数量 **0**（`.tmp/e2e-r41-typora-a.mjs` 输出的 `facts.tableByTyping`；`shots/round-41/t1-table-typing.png`）。

**Typora 行为**：`Docs/Table Editing.md:20`「To create a table in Typora, you could simplify write down a table header in markdown」；该文档还写明必须有表头与至少一行一列（`:30`）。

**实现要点**：新增一个小扩展，处理 `Enter`：当前段落全文匹配 `^\s*\|(.+)\|\s*$` 且光标在段尾时，按 `|` 切列数 `n`，用 Tiptap 的 `insertTable({ rows: 2, cols: n, withHeaderRow: true })` 替换该段落，再把原表头文字填回第一行。不要在 `handleTextInput` 里做（`|` 在正文里很常见）。

**体积与风险**：约 40–60 行 + CSS 无变化，gzip +400–700 B。风险：只匹配「整段就是表头行」，正文里含 `|` 的句子不受影响；表格中间按 Enter 不加行（已有 `Ctrl+Enter`）。

**建议优先级**：P2（建表高频，但不是数据安全）。

## 3. P2 自动配对只覆盖括号与引号，Markdown 符号不配对

**用户收益**：写 `**重点**`、`` `code` ``、`~~删除~~`、`$x$` 时省一半击键，也不容易漏闭合。

**现状证据（真实应用，逐项输入后读 DOM）**：

| 输入 | 结果 | 说明 |
| :--- | :--- | :--- |
| `**bo` | `**bo` | 不配对 |
| `*it` | `*it` | 不配对 |
| `` `co `` | `` `co `` | 不配对 |
| `~~st` | `~~st` | 不配对 |
| `$x` | `$x` | 不配对 |
| `(pa` | `(pa)` | 括号配对正常 |

代码：`PAIRS = '()[]{}'` 是唯一配对表（`src/lib/smartTyping.ts:16`），引号单列（`:41-49`）。设置文案也写明只做括号（`src/components/SettingsDialog.tsx:88`「智能标点与自动配对括号」）。

**Typora 行为**：偏好设置「Auto Pair」下有两项：「Auto pair brackets and quotes」与 **「Auto pair common Markdown syntax」**（`.tmp/typora-ref/resources/page-dist/static/js/Preferences.962926a4.9420e568.chunk.js` 内字符串；`Docs/Change Log.md:1007`「Add options to auto pair common markdown symbols, like `<code>*_` etc.」）。

**实现要点**：在 `smartInput` 里加一张 Markdown 配对表：`**`、`*`、`_`、`` ` ``、`~~`、`$`。只在「光标前不是同一符号、且后面是空白/行尾」时补闭合符，避免 `snake_case` 与列表开头被误补。**必须**同时满足：
- 单波浪号 `H~2~O` 已经是第 40 轮刚修的保真点（`src/lib/tilde.ts`），`~` 配对要区分 `~~` 与单个 `~`；
- 代码标记内的输入不配对（沿用 `smartTyping.ts:95-103` 的判定）；
- 行首 `* ` / `- ` 列表与 `---` 分隔线不配对。

**体积与风险**：约 30–40 行 + 单测，gzip +300–600 B。**风险偏高**（中文输入法、列表、行内代码、单波浪号都会碰到），建议作为独立任务并默认关闭开关，或放在 `SettingsDialog` 里与「自动配对括号」分开。

**建议优先级**：P2（体验收益大，但回归面比 1、2 大）。

## 4. P2 拼写检查固定关闭，也没有设置项

**用户收益**：中英混写时把 `teh`、`recieve` 标出来；Typora 默认开、可选语言。

**现状证据**：
- 编辑器属性写死：`attributes: { class: 'editor doc-body', spellcheck: 'false', 'aria-label': '正文编辑器' }`（`src/App.tsx:803`）。真实 DOM 也是 `spellcheck="false"`、`contenteditable="true"`（E2E `facts.spellcheck`）。
- 源码模式 textarea 也写死 `spellCheck={false}`（`src/App.tsx:4883`）。
- `SettingsDialog.tsx` 无「拼写」相关项（grep 0 命中）。

**Typora 行为**：偏好设置「Spell Check」提供 `Auto Detect Language / Disable Spell Check / en-US / en-GB / …`（同一份 Preferences chunk 字符串）。

**实现要点**：设置加一个「拼写检查」开关（默认开，中文用户可关）；用 `useEffect` 对 `editor.view.dom` 调 `setAttribute('spellcheck', on ? 'true' : 'false')`，不必重建编辑器。WebView2 的拼写建议来自 Chromium，无需新依赖。

**体积与风险**：约 15 行，gzip < 300 B。风险：中文正文可能满屏红波浪线，所以必须可关、且首次默认值要产品负责人定；宿主 WebView2 是否启用拼写服务需真机验证（见 UNVERIFIED）。

**建议优先级**：P2。

## 5. P2 源码模式没有行号

**用户收益**：Typora 用户切源码模式大多是为了改表格/围栏这类结构，行号能把「第 42 行」直接说清，也方便对照外部 diff。

**现状证据（真实应用）**：
- 源码模式 DOM：父容器 `.doc-layout.source-layout` 只有两个子节点 `DIV.source-note` 与 `TEXTAREA.source-editor`；`.line-number` / `.gutter` 节点数 **0**，带高亮 class 的 span **0**，`pre` **0**（E2E `facts.source`；`shots/round-41/t3-source-mode.png`）。textarea 属性 `rows="2"`（高度靠 CSS）。
- 代码：`src/App.tsx:4881` 直接渲染 `<textarea className="source-editor">`，`:4867` 是说明条。

**Typora 行为**：源码模式基于 CodeMirror，左侧行号 + 语法高亮（`docs/iteration/typora-features.md:26`；`shots/typora/61-source-mode.png`）。

**实现要点**：只做行号槽，不引语法高亮库（引库违反「不新增运行时依赖」）。在 textarea 左侧加一个 `div`，行数 = `value.split('\n').length`，`onScroll` 时同步 `transform: translateY(-scrollTop)`；字号/行高与 textarea 一致，等宽字体。**不要**用 `<pre>` 垫底，会和 IME 组合输入打架。

**体积与风险**：约 50–70 行（组件 + CSS），gzip +500–800 B。风险：1 MB 文档每次 `split`（可改为按 `value` 缓存 + 只在内容变化时重算）；textarea 横向滚动时行号不能跟着动。

**建议优先级**：P2（源码模式是低频但高价值的辅助视图）。

## 6. P2 智能标点：`--` 直接变 `—`，`---` 在句中留残 `-`

**用户收益**：英文写作要 en dash（`2020–2025`）时现在打不出来；`a---b` 得到 `a—-b`，多一个可见连字符。

**现状证据（真实应用，键盘逐字输入后读 DOM）**：

| 输入 | 结果 |
| :--- | :--- |
| `a--b` | `a—b`（em dash） |
| `a---b` | `a—-b`（em dash + 残留 hyphen） |
| `a...b` | `a…b` |
| `"hi"` | `“hi”` |

代码：`if (inserted === '-' && last === '-') return { kind: 'replace', from: -1, to: 0, text: '—' }`（`src/lib/smartTyping.ts:61`）；单测已经把 em dash 写死（`src/lib/smartTyping.test.ts:34`）。

**Typora 行为**：SmartyPants 标准映射 `--`→`–`（en dash）、`---`→`—`（em dash）。证据：Typora 渲染层在判分隔线时把正文的 `\u2013` 还原成 `--`、`\u2014` 还原成 `---`（`.tmp/typora-ref/resources/appsrc/window/frame.js` 字节偏移 45723 附近：`.replace(/\u2013/g,"--").replace(/\u2014/g,"---")`）；`docs/iteration/typora-features.md:28` 记「`--` 转破折号」。

**实现要点（两档）**：
- 小档：第三根 `-` 紧跟 `—` 时把它吞掉（`a---b` → `a—b`），中文破折号行为不变；不引 en dash。
- 大档：加设置「破折号风格：中文（`--`→`—`）/ 英文（`--`→`–`、`---`→`—`）」，`smartInput` 读设置；单测补 `---`、`----` 与分隔线互不干扰。

**体积与风险**：小档约 6 行、gzip ≈ 0 B；大档约 20 行。风险：表格分隔行已有专门防线（`smartTyping.ts:59`，第 38 轮），新增规则不要再碰 `|` 行；`---` 在行首仍须交给分隔线输入规则（本轮实测 `---` / `***` / `___` + Enter 都能出 `<hr>`，正常）。

**建议优先级**：P2。

## 7. P2 专注模式没有首次提示条

**用户收益**：第一次误触「专注」后知道按哪里退出；Typora 用一条带「不再显示」的提示解决。

**现状证据（真实应用）**：点顶栏「专注」后 `.app` 变成 `app focus-mode`，正文其它段落压暗（`shots/round-41/t4-focus-mode.png`）；同一时刻 `[role=status] / [role=alert] / .toast / .hint` 节点数 **0**，全文不含「专注模式已开启」「不再显示」（E2E `facts.focus`）。代码只有按钮切换（`src/App.tsx:4631-4637`）。

**Typora 行为**：F8 专注后顶部出现提示条「专注模式已开启 / 可以在 视图 菜单中关闭」，带「不再显示」勾选（`docs/iteration/typora-features.md:45`；`shots/typora/65-focus-mode.png`）。

**实现要点**：复用现有 toast（保存成功提示已有持久提示组件）；首次开启时显示，带「不再显示」把标记写进设置（`src/lib/settings.ts`），后续不再弹。

**体积与风险**：约 25–35 行，gzip +300 B。风险低；注意专注模式下 toast 不要被压暗样式影响。

**建议优先级**：P2。

## 8. P2 `docs/typora-gap.md` 过期：缺的仍是 11，应为 15

**核对命令与结果**：`node -e` 按 `##` 分节数表格行：`已经有的（30）` 数据行 30 行（标题一致）；`缺的（11）` 数据行 11 行（标题一致）。所以**计数本身与表一致**，但与实际能力不符——第 40 轮 §6 已列 4 条该进「缺的」，本轮复核**一条都没补**：

| 该补的行 | 来源 | 在本文件里的命中 |
| :--- | :--- | :--- |
| 打开链接的出口（在浏览器打开） | 第 39 轮 §2 | grep `浏览器打开` = 0 |
| 标题开头 Backspace 退回正文 | 第 39 轮 §6 | grep `Backspace` = 0 |
| 复制为 Markdown（`Ctrl+Shift+C`） | 第 40 轮 §5 | grep `复制为 Markdown` = 0 |
| 表格列对齐与行/列重排入口 | 第 40 轮 §4 | grep `对齐` 只命中字号缩放行 |

**建议**：把「缺的（11）」改为 15，插入上述 4 行（都放 P2/P1 对应分节）；同时把「高亮、上下标、TOC、emoji」一行的备注补一句：第 40 轮起 `==高亮==`、`X^2^`、`H~2~O` 是**保真不渲染**，实现上下标时不要和删除线/单波浪号冲突。
**体积与风险**：纯文档。**建议优先级**：P2，随 1–3 任意一条落地的同一轮改。

## 9. 试过、判断没有问题的路径（免得下一轮重复劳动）

全部为本轮真跑，脚本与截图见文首。

| 路径 | 结果 |
| :--- | :--- |
| `---` / `***` / `___` 在空段落 + Enter | 三种都变 `<hr>`，0 控制台错误 |
| 代码围栏内的 `a--b` | 原样保留（`facts.codeFence.pre=1`，文本 `a--b`），智能标点未误伤 |
| 引号与括号配对 | `"hi"` → `“hi”`；`(pa` → `(pa)` |
| `...` → `…` | 正常 |
| 专注模式压暗 | 非当前段透明度变化，工具栏与状态栏仍可用（`t4`） |
| 查找上一处/下一处/全部替换 | 按钮齐全，`1 / 4` 计数与高亮一致（`t2`） |
| 源码模式往返 | `# 标题` 与中文正文一致；`[toc]` 仍被转义（见 §10，另计） |
| 两脚本控制台 | 0 条 error / pageerror |

## 10. 上几轮已报、本轮复核仍有效（不重复计数）

- `[toc]` 仍不渲染，保存被转义：本轮实测源码回写为 `\[toc\]`（`shots/round-41/t6-toc.png`，第 40 轮 §3）。
- 粘贴为纯文本 `Ctrl+Shift+V`：仍无（第 40 轮 §8；`src/App.tsx` 无对应键位）。
- 全屏、视图缩放（Ctrl+滚轮）：仍无（第 37/38/40 轮）。
- 行内 HTML（`<kbd>`、`<u>`）：仍是字面（第 40 轮 §8）。
- 图片落盘规则（`${filename}.assets`）：仍只有 `assets/`（第 36/38 轮）。
- 大纲折叠不持久、无全部折叠（第 38 轮）。
- 拖入 `.md` / 文件夹打开（第 38 轮）。

## 11. UNVERIFIED 与补测方法

- **宿主 WebView2 的拼写检查**：只在浏览器 dev 环境读到了 `spellcheck` 属性；红波浪线与右键建议是否在 WebView2 宿主里出现，未验证。补测：宿主里打开一篇英文文档，把 `spellcheck` 改为 true，看 `teh` 是否有波浪线。
- **整词匹配的 CJK 行为**：本报告建议「中文等同关闭」是设计选择，未做用户测试。
- **Typora 侧复跑**：本轮只读 Typora 的 `Docs` 与 `frame.js`/Preferences 字符串，没有启动 Typora 实测 `--`/`---` 的输入结果与「Auto pair common Markdown syntax」的实际效果；映射结论来自 SmartyPants 归一化代码。
- **手写表头建表的 Typora 实际交互**：只依据 `Docs/Table Editing.md:20`，未在 Typora 里复跑。
- **真实写回**：本轮所有输入都在 dev 浏览器，没有磁盘写回；`[toc]` 的转义用的是源码态内容（与 Ctrl+S 同链路，但未跑宿主）。

## 12. 给 planner 的排序

1. **§1 查找大小写/整词**（P1，库已支持，改 UI 与一个选项字段）
2. **§8 差距表更新**（P2，文档，和 §1 同轮）
3. **§2 表头行 + Enter 建表**（P2，一个输入规则，写作高频）
4. **§6 智能标点残 hyphen**（P2，小档 6 行；英文 en dash 另议）
5. **§7 专注提示**（P2，复用 toast）
6. **§4 拼写检查开关**（P2，需产品负责人定默认值）
7. **§5 源码行号**（P2，纯前端，无依赖）
8. **§3 Markdown 自动配对**（P2，收益大但回归面最大，放最后或单独一轮）

理由：前 3 项都在「查找/输入」高频路径、改动小；§6、§7 是细节补丁；§4 需要一次默认值决策；§5 是独立小 UI；§3 碰输入法、列表、单波浪号三条刚修过的线，必须单独验收。
