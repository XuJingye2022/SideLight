# 第 36 轮 · 缺陷猎人（端到端，只读）报告

- 环境：`http://localhost:5175` 已在跑（未重启、未另起 dev server；`/src/main.tsx` 返回 200）；headless Edge CDP **9222**。每次运行前 `node .tmp/reset.mjs 9222`；未启动浏览器、未 kill msedge。未 push、未改 `release/`。
- 只读产品代码，未改任何产品文件。轮前 SHA `b3509c9`；本轮新增只有 `docs/iteration/round-36/`、`shots/round-36/` 与 `.tmp/e2e-r36-*`。
- 视口：**1440×900**（除窄窗对照 1024×700）。窗口内媒体查询 `max-width:1119px` 会把页边批注变成**全屏抽屉**（`src/styles.css:2314-2389`），窄窗下抽屉会盖住查找条右侧按钮 —— 本轮所有替换类证据都在 1440×900 下取，属测试环境选择，不是产品缺陷（见 note）。
- 本轮实跑 11 个脚本（`probe1` 只用来定位「点击被抽屉拦截」的原因，没有产出结论），全部挂 console/pageerror 监听：**error 0、pageerror 0**（每个日志末尾 `## errors []`）。
- 本轮脚本（全部新建、可复跑；同名 `.log` 在 `.tmp/`）：
  - `.tmp/e2e-r36-bug-a.mjs`（路径 4 扩展：任务列表 / 公式 / 嵌套列表 / 围栏空行 / 转义竖线 / 自动链接 / HTML 注释 / 硬换行保真）
  - `.tmp/e2e-r36-bug-b.mjs`（路径 1、2、3、5、6）
  - `.tmp/e2e-r36-bug-probe2.mjs`（替换串按 HTML 解析；`&` 落盘）
  - `.tmp/e2e-r36-bug-probe3/4.mjs`（批注丢失、`&amp;` 往返；含一次脚本失效，见 note）
  - `.tmp/e2e-r36-bug-probe5.mjs`（替换按钮点不动的机理：窄窗抽屉遮住）
  - `.tmp/e2e-r36-bug-probe6.mjs`（1440×900 下的批注丢失 + `&` 往返，本报告第 1、4 条主证据）
  - `.tmp/e2e-r36-bug-probe7.mjs`（文件树重命名/删除/撤销/刷新；进入源码后的焦点；批注能否靠 Ctrl+Z 恢复）
  - `.tmp/e2e-r36-bug-probe8.mjs`（替换串含 `< & >` 的实际落点）
  - `.tmp/e2e-r36-bug-probe9.mjs`（任务列表续写/勾选保存字节；数学篇源码一致与保存字节）
- 截图（本轮我产出的）：`shots/round-36/` 下 `a1-misc-rich.png`、`a2-tasks.png`、`a3-math.png`、`b1-located.png`、`b2-after-replaceall.png`、`b3-after-reload.png`、`c1-amp.png`、`p1-formatted.png`、`p1-reload.png`、`p2-tree.png`、`p3-focus.png`、`p3-ann-undo.png`、`p4-enter-source.png`、`p5-settings.png`、`p5-dark.png`、`p5-1024.png`、`p5-1440.png`、`p8-replace-html.png`、`a5-replace.png`、`d4-findbar.png`、`d7-after-force.png`。（同目录下的 `probe-a…probe-h` 不是我跑的，未用于本报告结论。）

---

## 1（P1，静默丢数据）「全部替换」会清空当前文档的全部页边批注，并把它们从 `.sidelight/annotations/<key>.json` 里抹掉；`Ctrl+Z` 不恢复

**复现**

1. 打开文件夹 → 打开 `批注.md`（内容 `天空很蓝。天空很蓝。另一段也有天空。`）。
2. 正文里点一下 → 点「分析本段（模拟）」→ 右侧页边出现 1 张批注卡，状态栏上方 `aria-label` 变「批注（1 条）」。
3. `Ctrl+F` → 查找 `天空`、替换为 `苍穹` → 点「全部替换」。
4. 观察：正文三处都变成 `苍穹`（正确）；但右侧批注卡消失、「批注（0 条）」、正文里的 `.annot` 高亮也没了。
5. 再按 `Ctrl+Z`：正文回到 `天空很蓝。…`，批注仍然 0 条。
6. 刷新页面、重开工作区、重开 `批注.md`：仍是 0 条 —— 磁盘上的批注也已经是空的。

**证据**

```
## B1-files {"before":[".sidelight/annotations/批注.json"],"railBtn":"批注（1 条）","noteQuotes":1}
## B1-store "{\"v\":2,\"annotations\":[{\"id\":\"3e59729e-…\",\"kind\":\"evaluation\",\"status\":\"pending\",\"from\":11,\"to\":19,\"quote\":\"另一段也有天空。\",\"note\":\"这句是整段的重心，位置偏后；读者读到才知道你要说什么。\"}],\"notes\":[{…\"kind\":\"overall\"…}]}"
## B2-verdict {"railBefore":"批注（1 条）","railAfter":"批注（0 条）","quotesBefore":1,"quotesAfter":0,
               "storeStillThere":true,"storeAfter":"{\"v\":2,\"annotations\":[],\"notes\":[{…overall…}]}",
               "body":"苍穹很蓝。苍穹很蓝。另一段也有苍穹。","toast":"已保存 批注.md"}
## B3-verdict {"railBtn":"批注（0 条）","noteQuotes":0,"body":"苍穹很蓝。…","store":[".sidelight/annotations/批注.json"]}
## ann-verdict {"before":{"railBtn":"批注（1 条）","quotes":1},"afterReplaceAll":{"railBtn":"批注（0 条）","quotes":0},
                "afterUndo":{"railBtn":"批注（0 条）","quotes":0,"text":"天空很蓝。天空很蓝。另一段也有天空。"}}
```
（全部来自 `.tmp/e2e-r36-bug-probe6.log` 与 `.tmp/e2e-r36-bug-probe7.log`；截图 `b1-located.png` 有卡、`b2-after-replaceall.png` 与 `b3-after-reload.png` 没卡、`p3-ann-undo.png` 是撤销后仍 0 条。）

- 没有确认框、没有提示；唯一 toast 是「已保存 批注.md」。
- 同一查找条上的单个「替换」不清批注（源码注释写明位置由事务映射跟随，`src/App.tsx:1776-1781`）。两个相邻按钮行为不同。

**根因**

- `replaceEvery` 在事务之后直接 `setAnnotations([])`：`src/App.tsx:1783-1796`（清除在 `:1795`）。
- 批注持久化 effect 把空数组写回（并删旧键）：`src/App.tsx:1690-1717`；`annotations:[]` 时要么 `removeCache`（`:1706-1708`，本次因还有 overall 便签而走写空数组 `:1711`）。
- `replaceCurrent` 没有这句（`:1776-1781`）。

**期望 vs 实际**：期望「全部替换」只改正文，批注随位置映射移动（或至少先提示「这会清掉 3 条批注」并可撤销）；实际是正文改了、批注与磁盘缓存被静默清空且不可撤销。批注里可能已有用户点过「追问」「联网核对」的内容，丢了只能重跑分析。

**建议**：删掉 `:1795` 的 `setAnnotations([])`，让事务映射带位置（与 `replaceCurrent` 一致）；若确实要清，改成显式确认 + 进撤销栈。回归测试：分析出批注 → 全部替换 → 断言 rail 仍 N 条且 `.sidelight/annotations/<key>.json` 的 `annotations` 非空；再断言 `Ctrl+Z` 后正文与批注同时回到原样。

---

## 2（P1，静默吞键）进入源码模式后焦点不在源码框：`Ctrl+/` 后打字、点工具栏「源码」后打字，全部丢失

**复现 A（快捷键）**

1. 打开文件夹 → 打开 `甲.md` → 正文点一下。
2. 按 `Ctrl+/` 进源码模式（`textarea.source-editor` 出现，内容是该篇原文）。
3. 直接打字（不点文本框）。

**复现 B（工具栏按钮）**

1. 同上，切回富文本后用鼠标点工具栏「源码」。
2. 直接打字。

**证据**

```
## enter-src-ctrl-slash {"active":"BODY.","src":"# 甲\n\n甲的正文。【改名前的字】\n"}
## enter-src-typed     {"active":"BODY.","src":"# 甲\n\n甲的正文。【改名前的字】\n"}
## enter-src-verdict   {"beforeLen":18,"afterLen":18,"active":"BODY.","typedLanded":false}
## enter-src-button    {"active":"BUTTON.is-on","hasTextarea":true}
```
（`.tmp/e2e-r36-bug-probe7.log`；`## path5-source` 在 `.tmp/e2e-r36-bug-b.log` 里同样是 `active:"BODY."`。截图 `p4-enter-source.png`。）

- `typedLanded:false`：打了 6 个字，源码框长度 18 → 18，一个都没进去；没有提示、没有报错。
- 同一路径的退出方向（`Esc` 回正文）第 35 轮已修（本轮 `## path3-find-esc-typing landed:true` 复核正常），**进入方向没修**。

**根因**

- 进源码的唯一入口 `enterSourceFor` 只设文本与视图，不碰焦点：`src/App.tsx:511-518`。
- `switchView` 也不聚焦：`src/App.tsx:3761-3784`；`toggleSource` 只是调它（`:3786-3788`）。
- `<textarea className="source-editor">` 没有 `autoFocus`，也没有 ref 聚焦：`src/App.tsx:4772-4777`。
- 团队已经在另一条路径上补过同样的坑：关查找条时会 `requestAnimationFrame` 聚焦源码框，注释就写着「源码模式里 .ProseMirror 不在 DOM，focusEditor() 是空操作，焦点会掉到 body」：`src/App.tsx:4587-4593`。进入源码时缺这一句。

**期望 vs 实际**：期望进源码就能改字（进源码的目的就是改原文）；实际要先点一下文本框，否则整段击键被丢，用户会以为键盘坏了。

**建议**：在 `setViewMode('source')` 之后（`switchView` 的 `next === 'source'` 分支，`:3765-3775`）用 `requestAnimationFrame` 聚焦 `textarea.source-editor`，与 `:4591` 同写法；工具栏按钮点击也算（按钮会抢焦点，必须 rAF 之后设）。回归测试：`Ctrl+/` → 直接 `keyboard.type('X')` → 断言源码框值含 `X`；工具栏入口同样一条。

---

## 3（P2，一致性与内容）「替换」把替换串按 HTML 解析，「全部替换」按纯文本：同一个替换串两种结果

**复现**

1. 打开 `替换.md`（`abc 一行。` / `def 一行。`）。
2. `Ctrl+F`，查找 `abc`，替换为 `<b>X</b>` → 点「替换」：正文变成**粗体 X**（`<b>` 被吃成格式）。
3. 查找 `def`，替换为 `<i>Y</i>` → 点「全部替换」：正文变成**字面** `<i>Y</i>`。

**证据**

```
## A2-single-replace html "<h1>替换</h1><p><strong>X</strong> 一行。</p>…"   ## A2-verdict {"bold":true,"literal":false}
## A3-replace-all   html "…<p>&lt;i&gt;Y&lt;/i&gt; 一行。</p>…"             ## A3-verdict {"italicNode":false,"literalEscaped":true}
## 替换 "qqq" -> "<b>X</b>"      {"text":"替换|X 一行。…","html":"…<p><strong>X</strong> 一行。</p>…"}
## 替换 "rrr" -> "AT&T <div>"    {"text":"…|AT&T <div> 一行。","html":"…AT&amp;T &lt;div&gt; 一行。…"}
## bytes "# 替换\n\n**X** 一行。\n\na&lt;b 一行。\n\n甲 &lt; 乙 一行。\n\nAT&amp;T <div> 一行。\n"
```
（`.tmp/e2e-r36-bug-probe2.log`、`.tmp/e2e-r36-bug-probe8.log`；截图 `a5-replace.png`、`p8-replace-html.png`。）

- 机理：`replaceCurrent` 用 `editor.commands.insertContentAt(..., replacement)`（`src/App.tsx:1780`），Tiptap 对字符串做 HTML 判定的内容按 HTML 解析；`replaceEvery` 用 `transaction.insertText(replacement, …)`（`:1790`），永远按纯文本。
- 附加不一致：`a<b`、`甲 < 乙` 走哪条都仍是字面；但 `AT&T <div>` 落盘时 `<div>` 原样保留（`AT&amp;T <div> 一行。`），而 `甲 < 乙` 落盘成 `甲 &lt; 乙` —— 同一篇里两种写法。

**期望 vs 实际**：期望「替换」与「全部替换」对同一替换串给出同一结果（都应当是用户输入的字面文本，除非产品明确支持「用 HTML 替换」）；实际是同一串在两条按钮上得到「粗体」与「字面」两种正文，落盘字节也不同。

**建议**：`replaceCurrent` 改成与 `replaceEvery` 一致的 `insertText`/`insertContentAt(..., { parseOptions })` 纯文本路径，或两边都先 `escapeHtmlForParse`（`src/lib/html.ts` 已有该函数）。回归测试：替换串 `<b>X</b>` 在「替换」「全部替换」两条路径下正文 text 都等于 `<b>X</b>` 字面。

---

## 4（P2，源码保真 + 无提示）保存会把正文里的 `&`、`<`、`>` 改写成 HTML 实体，未改动的行也一起改，风险横幅不提示

**复现**

1. 打开文件夹（假句柄）→ 打开 `和号.md`：

   ```
   甲 & 乙 一行。

   原样 &amp; 文本。

   小于号 a<b 一行。
   ```

2. 源码模式（`Ctrl+/`）读原文：与磁盘逐字节一致（`甲 & 乙 一行。` / `a<b`）。
3. 回富文本，在文末追加一行「新增一行。」→ `Ctrl+S`。
4. 读文件：**没动过的两行**被改写。

**证据**

```
## C0-source "甲 & 乙 一行。\n\n原样 &amp; 文本。\n\n小于号 a<b 一行。\n"
## C1-save1  "甲 &amp; 乙 一行。\n\n原样 &amp; 文本。\n\n小于号 a&lt;b 一行。\n\n新增一行。\n"
## C2-source "甲 &amp; 乙 一行。\n\n原样 &amp; 文本。\n\n小于号 a&lt;b 一行。\n\n新增一行。\n"
## C3-verdict {"doubleEscaped":false,"ampPreservedPlain":false,"ampEscaped":true,"ltPreserved":false,"ltEscaped":true,"riskBefore":null}
```
（`.tmp/e2e-r36-bug-probe6.log`；截图 `c1-amp.png`。另一处同现象：路径 1 保存出的 `- &gt; 引用一行`，`.tmp/e2e-r36-bug-b.log` 的 `## path1-saved`。）

- 往返**语义安全**：重开后正文仍是 `甲 & 乙`、`a<b`，再存一次也不会变成 `&amp;amp;`（`doubleEscaped:false`）。所以不是逐次恶化，是「源码被静默改写」。
- 打开时没有风险横幅（`riskBefore:null`）：`src/lib/risk.ts` 只把 `&` 的改写限制在「行内 HTML 标签内含 `&`」这一种（`risk.ts:232-243`），纯文本 `&`/`<` 不在检测范围。
- 用户可见影响：源码模式里看到的不是自己写的字（`&` → `&amp;`）；版本控制里出现没动过的行；与「保存前对比会拦下会被改写的结构」的既有承诺不一致（同篇自动链接、HTML 注释都被拦了，见 `a1-misc-rich.png` 的横幅）。

**期望 vs 实际**：期望没编辑的字符原样落盘，或至少在横幅里说「保存后 `&` 会变成 `&amp;`」；实际静默改写且不提示。

**建议**：序列化后按行做最小修复（把文本节点里的 `&amp;`/`&lt;`/`&gt;` 还原成原字符，仅在真需要转义的位置保留），或把这类改写加进 `risk.ts` 的检测与横幅（与 `html-ampersand` 并列），让用户在保存前看见。回归测试：含 `&`、`<` 的段落 → 改别处 → 保存 → 断言那两行字节不变。

---

## 5（P2，文案误导）模拟分析明明出了批注卡，仍弹「模型没按约定格式回，重试一次看看。」

**复现**

1. 打开 `批注.md`（单句/短段落，或把光标停在某一）→ 点「分析本段（模拟）」。
2. 右侧出现 1 张批注卡、「批注（1 条）」。
3. 页面底部同时弹 toast「模型没按约定格式回，重试一次看看。」

**证据**

```
## B1-annotated {"railBtn":"批注（1 条）","noteQuotes":1,"toast":"模型没按约定格式回，重试一次看看。"}
## ann-before    {"railBtn":"批注（1 条）","quotes":1,"toast":"模型没按约定格式回，重试一次看看。"}
```
（`.tmp/e2e-r36-bug-probe6.log`、`.tmp/e2e-r36-bug-probe7.log`；截图 `b1-located.png` 右下角就是这个 toast，而批注卡在旁边。）

**根因**：toast 的条件是「没收到 `meta`（意图说明）」：`src/App.tsx:1493-1495`；但模拟数据在「单句/短段落」分支只返回 `evaluation` + `overall`，**根本不产生 `meta`**：`src/lib/ai.ts:262-272`（对比多句分支 `:274-277` 才有 `meta`）。于是短段落每次都会报「格式错」。

**期望 vs 实际**：期望成功就是成功（或说明「这段太短，只给一条」）；实际是默认（未配 Key）路径下每分析一次就弹一条自相矛盾的错误。

**建议**：toast 条件加上「且没有新增任何批注」（`addedCount === 0`），或让模拟数据在所有分支都带一条 `meta`。回归测试：单句分析 → 断言批注 1 条且无「格式」toast。

---

## 六条路径实测结果（没有新缺陷的部分）

| 路径 | 做了什么 | 结果 | 证据 |
| --- | --- | --- | --- |
| 1 空文档 → 标题/加粗/列表 → 保存 → 刷新恢复 | 工作区「新建文件」→ 用 Markdown 输入规则打 `## 二级标题`、`**加粗的字**`、`- 列表甲/列表乙`、`> 引用一行`、`1. 有序甲` → `Ctrl+S` → 读假 FS 字节 → 刷新（注入字节后）重开工作区重开该篇 | 通过。`h2/strong/ul/li` 均生成；落盘 `## 二级标题\n\n**加粗的字**\n\n- 列表甲\n- 列表乙\n- &gt; 引用一行\n- 1. 有序甲\n- \n\n`；刷新后四个结构全在、文档名仍是 `未命名.md`。（`> 引用`/`1. 有序` 接在列表项后面被当成列表续行，是 Markdown 正确行为，不是缺陷。） | `p1-formatted.png`、`p1-reload.png`；`.tmp/e2e-r36-bug-b.log` 的 `## path1-*` |
| 2 文件树 展开/新建/重命名/删除/撤销/刷新 | 展开 `sub`（treeitem 7→8）→ 开 `sub/子目录.md` → 新建并保存 `未命名 2.md` → 右键当前行「重命名」→ `改名后.md` → 右键 `乙.md`「删除（移到回收站）」→ 删前确认框 → toast「撤销」→ 刷新文件树 | 通过。展开正常；新建落盘；重命名后文档名与树同步、**字节跟着走**（`# 甲\n\n甲的正文。【改名前的字】\n`）；删除进 `.sidelight/trash/20261117-070858-126k5e-乙.md`、树里消失、当前文档不动；撤销恢复 `乙.md` 与原字节、树里回来；刷新不出错（5 项）、当前文档不变。 | `p2-tree.png`；`.tmp/e2e-r36-bug-probe7.log` 的 `## tree-*` |
| 3 键盘 | `Ctrl+1–6/0`、`Ctrl+K`、`Ctrl+M`、`Ctrl+P`、`Ctrl+F`→`Esc`→打字、表格 `Tab`/`Ctrl+Enter`、键盘 Tab 后的焦点环 | 通过。标题依次 `H1/H2/H3/H4/H5/H6/P`；`Ctrl+K` 出 2 个输入框、焦点 `link-editor-input`；`Ctrl+M` 出数学输入、焦点 `math-inline-input`；快速打开出列表；`Ctrl+F→Esc→打字` 落进正文（`landed:true`，第 34 轮修复有效）；表格 `Ctrl+Enter` 加行 3→4（`Tab` 只在单元格间走，3→3 属预期）；焦点环 `outline: solid 2px rgb(43, 109, 100)` 可见。 | `p3-focus.png`；`.tmp/e2e-r36-bug-b.log` 的 `## path3-*` |
| 4 未测过的构件保真：任务列表 / 块公式 / 嵌套列表 / 围栏空行 / 转义竖线 / 自动链接 / HTML 注释 / 硬换行 | 261 B 样例 → 源码模式逐字节比 → 回富文本不改直接 `Ctrl+S` → 读字节；任务列表另起一篇续写一条、点复选框后再存；数学篇同样源码比对 + 保存 | 通过（除第 4 条的实体改写）。源码与磁盘 `equal:true`（261/261、数学 49/49）；未编辑保存字节完全不变；任务列表 `ul[data-type="taskList"]` 3 项复选框状态 `[false,true,false]`；续写落盘 `- [ ] 新增一条`，点第一项复选框后落盘 `- [x] 未完成甲`、DOM 变 `[true,true,false,false]`；块公式与行内公式重开后 `.katex` 2 个、文本正确；嵌套列表/有序 `start="3"`/围栏内空行/`a \| b` 单元格都保真；自动链接与 HTML 注释被风险横幅提前拦下（「自动链接 … 会被改写；HTML 注释会被丢掉」）。 | `a1-misc-rich.png`、`a2-tasks.png`、`a3-math.png`；`.tmp/e2e-r36-bug-a.log` 的 `## misc-*`/`## reopen-*`、`.tmp/e2e-r36-bug-probe9.log` 的 `## tasks-*`/`## math-*` |
| 5 源码/预览/专注/打字机/设置/字号/主题/窄窗 | `Ctrl+/` 源码再切回；工具栏「预览」再 `Esc`；「专注」「打字机」；字号 `Ctrl+Alt+=/-/0`；设置里点「深色」并保存；1440×900 与 1024×700 量溢出 | 通过（焦点问题见第 2 条）。预览 `contenteditable=false` → `Esc` 回 `true`；`focus-mode` 类可加可去；字号 17→18→17→17（复位）；深色保存后 `data-theme="dark"`、`rgb(21,23,26)`，刷新后仍是 `dark`；两种视口 `scrollWidth === innerWidth`（1440/1440、1024/1024），越界元素 0。 | `p5-settings.png`、`p5-dark.png`、`p5-1024.png`、`p5-1440.png`；`.tmp/e2e-r36-bug-b.log` 的 `## path5-*` |
| 6 控制台 0 error / 错误路径 | 7 次运行全程挂 console/pageerror；无工作区时 `Ctrl+S` 走 picker stub 抛 `AbortError`；`超大.md`（6 MB）点开 | 通过。7 次运行全是 `## errors []`；取消保存出「保存失败：用户取消。改动还在，可以再试一次。」且脏字仍在（`text:"取消保存的一行。"`）；6 MB 文件不出编辑器，提示「「超大.md」超过 5.5 MiB，仍在「甲.md」」，当前文档不变。 | `.tmp/e2e-r36-bug-probe7.log` 等各日志末尾 `## errors []`；`## path6-*` 在 `.tmp/e2e-r36-bug-b.log` |

## note（重复项、不算缺陷、脚本失效，不计入 actionable）

- **重复（前轮已列，本轮只复核）**：① 重命名成功后提示「已刷新：新增 1 个，消失 1 个」（第 29 轮 findings-bug 第 2 条）；② 删除确认框写「要恢复，用文件管理器把 trash 里的文件移回原位」，而紧接着的 toast 就有「撤销」（第 33 轮 findings-bug 第 2 条）。两条本轮都再次复现，未计入 actionable。
- **与第 35 轮同族但触发点不同**：第 35 轮第 1 条修的是「退出预览/退出源码/Esc 关快速打开」焦点掉 body；本轮第 2 条是**进入**源码不聚焦。本轮实测退出方向已正常（`## path3-find-esc-typing landed:true`）。修复落点相邻（都在 `switchView`/`enterSourceFor`），但触发路径不同，按新条目计入。
- **`&`→`&amp;` 与第 21 轮不是同一条**：第 21 轮报的是**公式内容**被 HTML 转义（`repairMath` 只折反斜杠）；本轮第 4 条是**正文纯文本**。第 21 轮那处修完后，正文这处仍在。
- **窄窗抽屉遮住查找条按钮（不是缺陷，是测试环境）**：756×488 下 `max-width:1119px` 让页边批注变成 `inset:0` 的抽屉（`styles.css:2366-2389`），`document.elementFromPoint` 在「全部替换」按钮中心返回 `ASIDE.margin-rail`，Playwright 报 `<aside id="margin-rail"> … intercepts pointer events`（`.tmp/e2e-r36-bug-probe5.log` 的 `## D5-click-fail`）。抽屉本就是遮罩层，点空白处会关闭，所以不算缺陷；本报告的替换类证据改在 1440×900 取。
- **实测过、不是缺陷**：
  - 任务列表勾选/取消、续写一条、保存字节正确（`- [ ]` / `- [x]` 保留，见 `## tasks-bytes-after-check`）。
  - 块公式 `$$` 与行内 `$…$` 重开后 `.katex` 正常渲染。
  - `- ` 空列表项被序列化成一行 `- `，重开后仍是空项，不丢结构。
  - 表格 `Tab` 在单元格间移动不新增行（`Ctrl+Enter` 才加行）——与第 27/31 轮记录一致。
  - 设置对话框「深色」是即时预览、点「保存」才落盘，取消会还原（对话框文案与现实一致）。
  - 源码模式未编辑时显示磁盘原文（逐字节一致，261/261）。
- **脚本失效（不是产品缺陷）**：
  - `.tmp/e2e-r36-bug-b.mjs` 的路径 2 用 `.tree-row-more` 作 treeitem 的**子元素**选择器，实际它是 treeitem 的**兄弟**（`FileTree.tsx:296-339`），点击超时；该段在 probe7 用右键菜单重跑通过。
  - 脚本 A 在风险横幅在场时按 `Ctrl+S` 弹出「保存后这些写法会被改写」确认框（自定义对话框），挡住后续点树；不是产品问题（该确认框是第 34 轮的设计）。
  - `installFakeWorkspace` 的 `addInitScript` 在每次 `reload` 时重新播种文件，第一版脚本刷新后读到的还是种子内容（probe3 的 `B3`/`C2` 因此失效）；probe6/probe7 已改成「刷新后注入全部文件再重开」。
  - 一次「分析本段」按钮文本是「分析选中（模拟）」（有选区时），用 `button:has-text("分析本段")` 会 0 命中；改用 `.analyze-button`。
- **可复现性说明**：第 1、2、3、4 条主证据各跑过 2 次以上（probe6 与 probe7、probe2 与 probe8），结论一致。

## UNVERIFIED（本轮测不了）

| 项 | 为什么 | 怎么补测 |
| --- | --- | --- |
| 真实模型下「全部替换」清批注 | 无 API Key，只用本地模拟批注 | 配真 Key 分析一次 → 全部替换 → 看 rail 与 `.sidelight/annotations` |
| 真实文件系统下的 `.sidelight/annotations` 删除 | 假 FSA 句柄，`removeCache` 走的是内存实现 | 真文件夹 + 真 Edge/宿主，删后看磁盘 |
| 中文输入法下的源码框聚焦 | 无 IME，`keyboard.type` 只发 ASCII | 真人 IME 组合输入，`Ctrl+/` 后直接打中文 |
| 宿主（WebView2）里源码框聚焦与批注清理 | CDP 9222 是浏览器，不是宿主 | `host-smoke` 式真宿主跑一遍 |
| 150%/200% 缩放屏、1024 以下更窄窗 | 只测 1024×700 与 1440×900 两个视口 | 设缩放后量溢出与抽屉遮罩 |
| 替换串同时含 NUL/超长/多行 | 本轮只测 `<b>X</b>`、`a<b`、`甲 < 乙`、`AT&T <div>` | 多行替换串与 10k 字替换串再各跑一次 |
