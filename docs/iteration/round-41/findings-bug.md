# 第 41 轮 · 缺陷猎人（端到端，只读）报告

- 轮次：round=41，nn=41，报告目录 `docs/iteration/round-41`，CDP 端口 9222。
- 轮前 `startSha=25297acee40d40fec4bcbe770c416f43faaf2d7a`；收工时 `git rev-parse HEAD` 仍是 `25297ac`。
- 环境：dev server `http://localhost:5175`（未另起、未重启）；CDP 9222 的 headless Edge（未启动 Edge、未 kill msedge）；每段 E2E 前跑 `node .tmp/reset.mjs 9222`。
- 只读：产品代码 0 改动。本轮新增文件只有 `docs/iteration/round-41/`、`shots/round-41/bug-*.png` 与 `.tmp/e2e-r41-bug-*.mjs|.log`。
- 本轮新增可执行条目：**4 条（2 条 P1、2 条 P2）**。8 条路径真跑。

## 结论摘要

1. **P1**：正文代码围栏与行内代码里的 `<` 在**载入时**就被改成 `&lt;`，编辑器里当场显示 `&lt;`，`Ctrl+S` 把它写回 `.md`，**没有任何提示**。`a<b` 这种常见写法也中招。保存风险门看不见它（基线在解析之后算）。
2. **P1**：自动保存与「这篇还有没保存的改动」对话框竞态。对话框开着时自动保存仍会写盘，`dirty` 被清成 `false`；用户点「不保存」也拦不住已经发生的写盘。
3. **P2**：第 40 轮的 HTML 注释保真只覆盖「单行、不含 `&`」的注释。多行注释、带 `&` 的注释、属性含 `&` 的行内标签保存后都被改成 `&lt;!--…--&gt;` 一类实体（有提示，点「仍然保存」即写坏）。
4. **P2**：字数明细同一个面板里，「句」的全文值与选区值口径不同：全选整篇后，全文 2 句、选区 3 句。

---

## 1（P1，数据被静默改写）代码围栏 / 行内代码里的 `<` 被改成 `&lt;`，`Ctrl+S` 写回文件

**复现步骤**

1. `node .tmp/reset.mjs 9222`，假工作区种入 4 篇：围栏里 `<div class="a">x</div>`、围栏里 `if (a<b) { count++ }`、行内代码 `` `<kbd>` ``、围栏里 `<kbd>Ctrl</kbd>`。
2. 「文件 ▾ → 打开文件夹…」→ 依次点这 4 篇。
3. 看正文代码块内容（不编辑、不按键）。
4. 按一次 `Ctrl+S`，读回假 FS 字节。

**证据**（`.tmp/e2e-r41-bug-h.log`）

| 文件 | 打开后代码块内容 | 保存提示 | 保存字节 |
| --- | --- | --- | --- |
| `h1-围栏div.md` | `&lt;div class="a">x&lt;/div>` | 无（`dialog:null`） | `&lt;div class="a">x&lt;/div>` ← 原为 `<div class="a">x</div>` |
| `h2-围栏比较.md` | `if (a&lt;b) { count++ }` | 无 | `if (a&lt;b) { count++ }` |
| `h3-行内code.md` | `` `&lt;kbd>` `` | 无 | `` `&lt;kbd>` `` |
| `h4-围栏kbd.md` | `&lt;kbd>Ctrl&lt;/kbd>` | 无 | `&lt;kbd>Ctrl&lt;/kbd>` |

四条 `same:false`、四条 `dialog:null`、`dirty:false`（打开即算「没改过」），所以用户看不到任何异常，只是习惯性按 `Ctrl+S` 就写坏。截图 `shots/round-41/bug-h-code-html.png`。

**根因**

- `src/lib/html.ts:31-33` 的 `escapeHtmlForParse` 是全文字符替换 `/<(?=[a-zA-Z/!])/g → '&lt;'`，**没有代码感知**。
- 载入链在 `src/App.tsx:2051` 调 `setMarkdown`，`src/App.tsx:983` 是 `manager.parse(escapeHtmlForParse(protectMathPairs(body)))`，所以围栏/行内代码里的 `<` 在解析前就被转义，进入正文的就是字面 `&lt;`。
- 保存侧的 `repairHtml`（`src/lib/html.ts:13`）用 `mapOutsideCode` 跳过围栏，所以**不会**把它还原——围栏里的字节因此永久漂移。
- 风险门看不见：`src/App.tsx:2060` 的基线是 `baselineLosses(text, serialized)`，而 `serialized` 已经含 `&lt;`；`baselineLosses` 只认几种固定损失（`src/lib/risk.ts:16` 的 `html-comment` 等），「标签形状被转义」不在其中，于是无提示。

**期望 vs 实际**

- 期望：代码围栏与行内代码逐字节保真（第 40 轮 T1 已把围栏里的 `~`、字面实体锁成 SAME）。至少保存前要提示「代码块里的 `<` 会被改写」。
- 实际：打开即改，保存静默写坏；`a<b` 这类非 HTML 的代码也中招，影响面比「写 HTML 样例」大。

**修复建议**

- 让 `escapeHtmlForParse` 复用 `src/lib/codeScan.ts` 的 `mapOutsideCode`（围栏、引用块围栏、行内代码不参与）。`tableCellBreaks` 是同一个「自产自读不一致」家族，可照第 39 轮的写法加纯函数与单测。
- 补两条单测：围栏 `if (a<b)`、行内代码 `` `<kbd>` ``，断言 `escapeHtmlForParse` 后字节不变。
- 复测点：`.tmp/e2e-r41-bug-h.mjs`，断言 4 条 `same:true`、`dialog:null`。

**成本**：S（一处 import + 两条单测），但要复查 `<br>` 表格单元格与行内 `<kbd>` 两条旧路径不回归。

**去重说明**：第 40 轮 `plan.md:556` 把「代码围栏/行内代码里的真 HTML 标签」记为已知项并写「这一条不修」；它不在 `docs/iteration/STATE.md` 待办池，也没进任何 findings。本轮的新事实是：**静默、无提示、`dirty:false` 下直接 `Ctrl+S` 即写坏、`a<b` 也中招**，按新证据计 1 条。

## 2（P1，用户明确选择被违背）自动保存在「还有没保存的改动」对话框开着时仍写盘，点「不保存」也拦不住

**复现步骤**

1. `node .tmp/reset.mjs 9222`，打开假工作区 → 打开 `甲.md` → 正文里打一句 `不该被保存的一句。`。
2. 立刻「文件 ▾ → 新建」，弹出「这篇还有没保存的改动 / 切到「未命名.md」之前，要先把当前这篇存下来吗？」。
3. 什么都不点，等 2.6 秒。
4. 点「不保存」。

**证据**（`.tmp/e2e-r41-bug-i.log`）

- `## i0-dialog-open`：`{"dialog":"这篇还有没保存的改动|切到「未命名.md」之前…|取消|不保存|保存并切换","dirty":true,"bytes":"# 甲\n\n甲的正文。\n"}`
- `## i1-while-dialog`（2.6 s 后，对话框仍开着）：`{"dialogStillOpen":true,"dirty":false,"bytes":"# 甲\n\n甲的正文。不该被保存的一句。\n"}` ← **磁盘已被写**
- `## i2-after-discard`（点「不保存」后）：`{"name":"未命名.md","bytesOld":"# 甲\n\n甲的正文。不该被保存的一句。\n","bytesNew":null}` ← 用户选了「不保存」，内容仍在盘上
- 更细的时间线（`.tmp/e2e-r41-bug-d.log` 的 `## d1-autosave-dialog`）：对话框开着时每 250 ms 采样，第 `ms:1865` 起 `dirty:false`、`bytesHas:true`，对话框一直是 `dialog:true`。
- 截图：`shots/round-41/bug-i1-dialog-while-autosaved.png`、`shots/round-41/bug-i2-after-discard.png`、`shots/round-41/bug-d-autosave-dialog.png`。

**根因**

- 自动保存的守卫在 `src/App.tsx:3156`：`if (pendingConfirm !== null || pendingSwitch !== null || …) return`。但计时器在 `src/App.tsx:3223-3230` 里捕获的是**调度那一刻的** `runAutoSave` 闭包；`pendingSwitch` 变成非 null 后 React 会生成新的回调，已经排队的 `setTimeout` 仍调用旧回调，守卫看到的 `pendingSwitch` 是 `null`。
- 打开对话框（`setPendingSwitch`）时没有任何一处 `cancelAutoSaveRef.current()`：调用点在 `src/App.tsx:1086/2066/2259/2317/2416/2871`，全部是载入/刷新/删除/改名/手动保存。

**期望 vs 实际**

- 期望：对话框开着时自动保存停住；用户点「不保存」就真的不写。`runAutoSave` 的 `pendingSwitch` 分支本来就是这个意图（第 8 轮 `impl-a.md:32` 写明）。
- 实际：对话框开着仍在 2 s 后写盘；对话框继续挂着「还没保存」的旧文案（`dirty` 已 false）；点「不保存」只是切走文档，写过的字节留着。

**修复建议**

- 用 ref 快照守卫：`pendingSwitchRef`/`pendingConfirmRef` 在 `runAutoSave` 里读 ref（与 `dirtyRef`、`savingRef` 同一写法）；再加一个 effect：`pendingSwitch || pendingConfirm` 变真时 `cancelAutoSaveRef.current()`。
- 复测点：`.tmp/e2e-r41-bug-i.mjs`，断言 `## i1` 时 `dirty:true` 且 `bytes` 不含新句子；点「不保存」后 `bytesOld` 保持原样。

**成本**：S（一处 ref + 一个 effect）。

## 3（P2，保真缺口）多行 / 含 `&` 的 HTML 注释与行内标签保存后被改成实体

**复现步骤**

1. 假工作区种入 `<!-- 多行\n第二行 -->`、`<!-- a & b -->`、`<kbd title="a & b">键</kbd>` 三篇。
2. 打开 → `Ctrl+S` → 读字节。多行注释与属性含 `&` 的两篇会先弹「保存后这些写法会被改写」。
3. 点「仍然保存」。

**证据**（`.tmp/e2e-r41-bug-b.log`）

- `## c1-多行注释.md`：`same:false`，字节 `# 注释\n\n&lt;!-- 多行\n第二行\n--&gt;\n\n正文。\n`；提示「HTML 注释会被丢掉 / 影响 1 处」。
- `## c2-带and注释.md`：字节 `&lt;!-- a &amp; b --&gt;`；同一提示。
- `## c4-attr-and.md`：字节 `&lt;kbd title="a &amp; b"&gt;键</kbd>`（开标签坏、闭标签还原）；提示「含 & 的行内 HTML 会被转义（& 变 &amp;）」。
- 对照 `## c3-重复注释.md`：两条**相同**的单行无 `&` 注释 `same:true`——说明第 40 轮的 `original.includes` 判定本身对重复单行注释是好的，缺口只在换行与 `&`。
- 二次打开再保存稳定（`## c1-多行注释.md-round2`：`stable:true`），不是逐次恶化。

**根因**：`src/lib/html.ts:3` 的 `ESCAPED_TAG = /&lt;(\/?[a-zA-Z!][^&\n]*?)&gt;/g` 的字符类排除 `&` 与换行，所以多行注释、属性含 `&` 的标签匹配不到，`restore` 不发生。

**期望 vs 实际**

- 期望：第 40 轮的目标是「打开→保存逐字节不变」，单行注释做到了，多行/带 `&` 也应一致；`risk.ts` 的提示文案「注释会被丢掉」也不准确（会被写成实体，不是删掉）。
- 实际：有提示但「仍然保存」即写坏；提示文案与真实结果不一致。

**修复建议**：`ESCAPED_TAG` 放宽到允许跨行与 `&`（如 `/&lt;(\/?[a-zA-Z!][\s\S]*?)&gt;/g`，仍靠 `original.includes` 兜底防误还原）；`html.test.ts` 加多行、含 `&`、`<!DOCTYPE>` 三条。提示文案改成「HTML 注释/标签会被写成实体」。

**成本**：S–M。

## 4（P2，数字口径自相矛盾）字数明细里「句」的全文值与选区值不一致

**复现步骤**

1. 假工作区种入 `# 标题\n\n第一句。第二句。\n`，打开。
2. 点正文 → `Ctrl+A` → 点状态栏字数。
3. 看面板：「句 2」，同一面板「选区 8 字 / 10 字符 / **3 句**」——选中的就是全文。

**证据**（`.tmp/e2e-r41-bug-g.log`）

- `## g2-标题加段.md`：`selText:"标题\n第一句。第二句。"`，面板 `…|句|2|段|1|…|选区|8 字 / 10 字符 / 3 句|…`
- 对照 `## g1-纯段落.md`：单段 `第一句。第二句。第三句。` → 全文 3 句、选区 3 句（一致）。
- 对照 `## g3-两段.md`：全文 3 句、选区 3 句（一致）。差异只在**标题/块边界**上。

**根因**：`src/components/StatsDetail.tsx:87` 用 `countSentences(text)`，`text` 是全文，来自 `doc.textContent`（块之间**没有分隔符**，`src/App.tsx:898/1015`）；`:117` 用 `countSentences(selection)`，`selection` 是 `getSelection().toString()`（块之间有 `\n`），而 `countSentences`（`src/lib/wordcount.ts:72`）按换行也切句。同一段文本两条入口的结果因此不同。

**期望 vs 实际**

- 期望：同一个面板里两个「句」数对同一文本应一致；至少口径说明要和数字对上。
- 实际：全选整篇能同时看到 2 与 3，用户无法判断哪个对。

**修复建议**：全文侧也用「带块分隔符的文本」算句（例如 `doc.textBetween(0, doc.content.size, '\n')` 或把 `text` 换成同一来源），或选区侧按段落合并后再切句；补一条单测锁「标题 + 一段」的句数。

**成本**：S。

---

## 路径实测结果（本轮真跑，截图在 `shots/round-41/`）

| 路径 | 做了什么 | 结果 | 证据 |
| --- | --- | --- | --- |
| 1 新建 → 输入 → 排版 → 保存 → 刷新恢复 | 树头「＋ 新建」→ 打 `标题一` → `Ctrl+2` → 加粗一段 → 列表 → 引用 → `Ctrl+S` → 重装假工作区（种子换成磁盘字节）→ reload → 重开文件夹 → 打开该文件 | 通过。`已新建 未命名.md`、字节 `## 标题一\n\n**加粗的词**\n\n- 列表项一列表项二\n- &gt; 一段引用\n\n`；reload 后重开富文本 html 与保存前一致、标题 `未命名.md — Sidelight`；切 `甲.md`/`乙.md` 标题跟着变（第 40 轮修好）；「关闭文档」回空白 | `.tmp/e2e-r41-bug-a.log` 的 `## a2`–`## a9` |
| 2 文件树 | 新建（`未命名.md` 落盘）、写字保存、重命名 `改名.md`（标题随动）、删到 trash、撤销恢复、外部新增后刷新 | 通过。`files` 与字节如日志；删除落到 `.sidelight/trash/20261117-133454-3f1k4g-改名.md`；撤销后字节 `新建文件正文。` 回来；刷新 `已刷新：新增 1 个，消失 0 个`。改名后的提示是「已刷新：新增 1 个，消失 1 个」= 旧账 | `.tmp/e2e-r41-bug-d.log` 的 `## d4`–`## d9`；`shots/round-41/bug-d-tree.png` |
| 3 键盘 | `Ctrl+1–6/0`、`Ctrl+K`、`Ctrl+M`、`Ctrl+P`、`Ctrl+F`→`Esc` 后打字、表格 `Tab`→`甲`→`Ctrl+Enter`、`Tab` 焦点环 | 通过。块标签 `["H1","H2","H3","H4","H5","H6","P"]`；链接/公式输入框拿到焦点；快速打开 3 个 option；`Esc` 后焦点回 `.ProseMirror` 且 `Z` 落进正文；表格 3→4 行；焦点环 `solid 2px rgb(43, 109, 100)` | `.tmp/e2e-r41-bug-e.log` 的 `## e0`–`## e7` |
| 4 样张往返 | 13 个对抗种子：多行注释、`&` 注释、重复注释、属性含 `&`、波浪号四处、frontmatter、字面 `&nbsp;` 段落、围栏注释 + 代码围栏/行内代码 `<` 四种 | 通过 6 条（单波浪号、`~~删除线~~`、链接 `~`、链接文字 `~`、frontmatter、重复注释）；**发现第 1、3 条** | `.tmp/e2e-r41-bug-b.log`、`.tmp/e2e-r41-bug-h.log` |
| 5 源码/预览/深色/窄窗 | `Ctrl+/` 往返、预览、`Esc`、设置里「深色」再「跟随系统」、1440×900 与 1024×700 | 通过。源码 `mode:source` 焦点在 `.source-editor`，退出回 `.ProseMirror`；预览 `mode:preview`、`.preview-column` 576 px、`.doc-body.preview-pane`；`Esc` 回编辑；深色 `data-theme=dark`、`rgb(21, 23, 26)`；1024 下 `scrollWidth===innerWidth=1024`、越界元素 0 | `.tmp/e2e-r41-bug-e.log` 的 `## e11`–`## e16`；`shots/round-41/bug-e-preview.png`、`bug-e-dark.png`、`bug-e-narrow.png` |
| 6 控制台与错误路径 | 全程挂 `console`/`pageerror`/`requestfailed`；6 MiB 文件；保存风险对话框三条路径（仍保存 / 取消 / 源码看原文） | 通过。6 份日志都是 `errors:[]`、`failed:[]`；6 MiB 被拒 `「大6.md」超过 5.5 MiB，仍在「大100.md」`、当前文档不变 | 各 `.log` 末行；`shots/round-41/bug-e-bigfile.png` |
| 7 大文档 100 KB | `大100.md`（900 段）打开、`Ctrl+End`、连打 4 个字、`Ctrl+S` | 通过。打开 **223 ms**、逐键 **24/18/14/18 ms**、保存后 **44,899 B** 且含末字；1 MB 本轮未跑（见 UNVERIFIED） | `.tmp/e2e-r41-bug-e.log` 的 `## e17`–`## e19` |
| 8 选区/字数/重开 | `Ctrl+A` 看状态栏与字数面板、`Esc` 焦点；路径 1 的重开与路径 2 的撤销恢复 | 通过 + **发现第 4 条**。`选区 15 字`；面板 `role` 标签「字数明细」、焦点在面板内、`Esc` 回 `.stats-trigger`；**第 4 条**见 `## g2` | `.tmp/e2e-r41-bug-e.log` 的 `## e8`–`## e10`；`.tmp/e2e-r41-bug-g.log`；`shots/round-41/bug-e-stats.png` |

## note（旧账、按设计、脚本注意，不计入 actionable）

- **旧账复核（前轮已列，本轮再次复现，不重复计）**：
  - 重命名后提示「已刷新：新增 1 个，消失 1 个」——第 29 轮 findings-bug 第 2 条；本轮 `## d6` 再次出现（`src/App.tsx:2291` 的 diff 提示，`handleRenamedFile` 自己不提示）。
  - 字数明细「段/句」按 `textContent` 口径——第 31/32 轮 note 已列。第 4 条是它的**成对矛盾**（同一面板两个数不一致），位置与判据不同，按新条目计。
  - 表格序列化会把单元格里的 `>` 写成 `&gt;`（路径 1 的 `- &gt; 一段引用`）：等价改写、无提示，第 10 轮起就有；不算新缺陷，但说明「解析/序列化期改写」不在风险门视野里（与第 1 条同源）。
- **第 1 条的相邻现象**：围栏里的 `<!-- 代码里的注释 -->` 会触发「HTML 注释会被丢掉」提示（`.tmp/e2e-r41-bug-b.log` 的 `## c9-围栏注释.md`，`dialog` 文本把代码围栏里的注释当正文注释）。修第 1 条时顺手要让 `risk.ts` 的注释扫描也跳过围栏。
- **按设计**：首启空白 `未命名.md`；「新建」只换内存文档不建文件（`Ctrl+S` 才落盘）；关闭文档与新建走同一个 `newDocument`（脏时都会弹「取消 / 不保存 / 保存并切换」）。
- **脚本事卫生（下一轮复用要注意）**：
  - 假 FSA 的 `window.__fsState` 在 reload 后会回到种子；要测「刷新恢复」必须 `installFakeWorkspace` 再装一次、种子换成刚读到的字节（本轮 `e2e-r41-bug-a.mjs` 的做法）。多个 init script 按加入顺序执行，后者覆盖前者。
  - `Ctrl+End` 在这个 headless 会话里不保证把光标送到文末（第 40 轮已记），本轮路径 7 的「末字」断言靠 `bytes.includes('字')`，没靠光标位置。
  - 字数面板打开时会抢焦点；`Esc` 后焦点回 `.stats-trigger`，要再按 `Ctrl+A` 必须先点回正文（本轮 `e2e-r41-bug-f.mjs` 第一版因此假阴，「选区」显示「未选中文本」）。
  - 「切换文档」对话框的 `.dialog` 与删除确认框共用类名；`关闭文档` 也会出现同一个「切到「未命名.md」之前…」文案，判 dialog 要连按钮一起读。

## UNVERIFIED

| 项 | 为什么 | 怎么补测 |
| --- | --- | --- |
| 真实盘 / 网络盘 / 宿主里第 1 条的写坏 | 本机只有假 FSA 句柄（`getFile`/`createWritable` 桩），没在真盘与 WebView2 宿主里读回字节 | 宿主 `host-smoke` 加一条：打开含 ``` ```js if (a<b) ``` ``` 的文件 → `Ctrl+S` → 比对磁盘字节 |
| 生产构建（`dist`）里的同一路径 | dev server 与生产共用 `src/`，但本轮只在 dev 跑过 | 用 `.tmp/build-r41` + `serve-dist.mjs` 复跑 `.tmp/e2e-r41-bug-h.mjs` |
| 自动保存竞态在宿主文档（`/__doc`）下的表现 | 浏览器态没有 `/__doc`，`hostDoc` 为 null，走的是 `performCommit` 分支 | 宿主 `host-smoke` 里开对话框等 2.5 s，读 `/__doc` 是否已变 |
| 重开恢复 / 最近文件 / 草稿 / 批注与选区联动 | 假句柄有方法但写不进 IndexedDB（第 40 轮同结论）；浏览器态没有 `/__annotations`、`/__draft` 宿主接口 | `scripts/session-acceptance.mjs` + `host-smoke` 的最近/草稿/批注断言 |
| 1 MB 载入与逐键 | 第 39 轮 dev 两遍实测约 220 s，本轮 25 分钟预算内跑不完 | 单独排一次，按第 39 轮的 5 个 `performance.mark` 口径取最后一条 |
| 真实 IME、150%/200% 缩放、macOS 宿主 | 环境只有模拟键鼠与 Windows | 真机 |
