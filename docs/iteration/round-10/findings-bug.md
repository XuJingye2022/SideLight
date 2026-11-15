# 第 10 轮缺陷侦察（表格 / 空行 / 引用式链接）

侦察人：r10-bug（只读，未改 `src/`、`host/`）。基线 commit `24bb46a`（第 9 轮 `fa06aa1` 之后），版本 0.22.0。

命令与证据文件：

- `npm run roundtrip` 已跑，`docs/roundtrip-report.md` 与提交版逐字节相同（`git status --porcelain` 为空）。
- 逐行对比脚本 `.tmp/r10-dump.mjs`（App 管线原样复制 + 每行 JSON）。
- 机制实验 `.tmp/r10-probe.mjs`（空行个数、列表分块、表格首尾换行、`Table.extend`）、`.tmp/r10-proto.mjs`（表格块原样复用原型）、`.tmp/r10-fallback.mjs`（改值/加列/改对齐/删行时退让）、`.tmp/r10-perf.mjs`（保存门耗时）、`.tmp/r10-browser.mjs`（CDP 9222，`/__doc` 注入 fixture，日志 `.tmp/r10-browser.log`）。
- 截图：`shots/round-10/bug-01..06-*.png`。

## 总览

| 编号 | 一句话 | 影响 | 可修性 | 难度 |
| :--- | :--- | :--- | :--- | :--- |
| B1 | 表格首尾各多一个空行；分隔行与列宽被重算（02） | P0，本轮主目标 | 可修，原型已验证 | 中 |
| B2 | 引用式链接定义在解析时被吃掉（04）；默认源码模式有必须同时做的 seed | P1，本轮主目标 | 可修，代价小 | 小 |
| B3 | frontmatter 后那 1 个空行在解析阶段丢（01） | P2 | 可修，局部 | 小到中 |
| B4 | 任务列表后接普通列表必多一个空行（06） | P3，只影响排版 | 不建议修 | 大 |
| B5 | 02 修好后保存门仍会弹框，口径必须同步改 | P1，改 02 的前置 | 可修 | 小 |

---

## B1 表格：前后多一个空行 + 分隔行与列宽被重算（02）

**现象与复现**

`npm run roundtrip`，「当前应用」列 `02-table.md` 记 `-3 +5`。原样载入、不做任何编辑，序列化结果：

```
 1  # 三个月的账          1  # 三个月的账
 2  (空)                  2  (空)
 3  | 项目 | 一月 | 二月 |  3  (空)                       ← 多一个空行
 4  |:-----|-----:|:----:|  4  | 项目  | 一月   | 二月   |  ← 分隔行 + 填充都变
 5  | 房租 | 3200 | 3200 |  5  | :--- | ----: | :----: |
 6  | 书   | 180  | 240  |  6  | 房租  | 3200 | 3200 |
 7  (空)                    7  | 书   | 180  | 240  |      ← 与原文一致
 8  表格后面的一段话。        8  (空)                       ← 多一个空行
                            9  (空)
                           10  表格后面的一段话。
```

逐行差异原因：

| 行 | 原文 | 输出 | 原因 |
| :--- | :--- | :--- | :--- |
| 表格前空行 | 1 个 | 2 个 | 表格渲染结果自带一个前导 `\n`，再叠上 doc 级块分隔 |
| 表头 | `| 项目 | 一月 | 二月 |` | `| 项目  | 一月   | 二月   |` | 按列最大文本长度重新填充空格 |
| 分隔行 | `|:-----|-----:|:----:|` | `| :--- | ----: | :----: |` | 短横线数 = `max(3, 列宽)`，短横线数与对齐两侧空格都重写 |
| 数据行 1 | `| 房租 | 3200 | 3200 |` | `| 房租  | 3200 | 3200 |` | 第一列填充从 2 字变 3 字（列宽 3） |
| 数据行 2 | `| 书   | 180  | 240  |` | 同原文 | 原文件填充恰好等于计算结果 |
| 表格后空行 | 1 个 | 2 个 | 每行自带结尾 `\n`，再叠 doc 级块分隔 |

**单元格内容、列数、行数、对齐都没变**：浏览器里读到 `rows=[["项目","一月","二月"],["房租","3200","3200"],["书","180","240"]]`、`cols=3`（`.tmp/r10-browser.log` 第 8 行）。所以这是纯格式损失，不是数据损失。

**根因（两段，各有确切位置）**

1. 空行：`node_modules/@tiptap/extension-table/dist/kit/index.js:508` 的 `let out = "\n"` 让表格渲染结果带一个前导换行；每行渲染又以 `\n` 结尾（同文件 `:519-521`）。doc 级用 `"\n\n"` 连接块（`node_modules/@tiptap/extension-document/dist/index.js:13`：`h.renderChildren(node.content, "\n\n")`），于是表格前后各出现 3 个 `\n`（2 个空行）。表格在文档开头时表现为开头多一个空行，两表相邻时中间 3 个空行。
2. 分隔行与列宽：`renderTableToMarkdown`（同文件 `:467`）先按单元格文本 `.length` 算 `colWidths`（`:489-498`，最小 3，CJK 按 1 个字符计），再用 `dashCount = Math.max(3, w)` 重生成分隔行（`:511-518`）。原文件的 5 个短横线与手工填充从来不进文档模型，所以任何一次序列化都会重算。

**可插入点与最小实现（已用原型验证，未接入 App）**

1. **裁掉表格渲染的首尾换行**。App 侧用 `Table.extend({ renderMarkdown(node, helpers) { return this.parent.call(this, node, helpers).replace(/^\n+/, '').replace(/\n+$/, '') } })` 注册自己的表格扩展。`this.parent` 在 Tiptap 3 的 `extend` 覆写里可用——实测返回真实渲染结果（`.tmp/r10-probe.mjs` 实验 1）。效果：02 的空行增量从 +2 变 0；表格在文档开头不再有前导空行；两表相邻从 3 个空行变 1 个；引用块内表格少了两个只有 `>` 的空行。不改 `node_modules`，不换序列化器。
2. **未改动的表格逐行复用原文**。新增纯函数 `reuseTables(original, serialized)`：把原文与序列化结果的表格块都切成「表头单元格 + 分隔行 + 数据行」，用「表头归一化文本 + 列数 + 对齐三元组 + 全部数据单元格文本」做键；命中就把序列化结果中的整块替换成原文那几行。实测：02 修完与原文**逐字节相同**；`| 书   | 180  | 240  |` 这类本就对齐的行也被保留，因为整块复用而不是逐字段拼。

**退让规则（`.tmp/r10-fallback.mjs`，逐条实测）**

| 编辑动作 | 复用是否命中 | 结果 |
| :--- | :--- | :--- |
| 不动 | 命中 | 与原文逐字节相同 |
| 改一个单元格的值 | 不命中 | 规范输出：`| 项目  | 一月   | 二月   |` / `| :--- | ----: | :----: |` / 内容为新值 |
| 加一列 | 不命中 | 规范输出，新列或旧列对齐按文档里的 `align` 重新生成 |
| 改对齐 | 不命中 | 规范输出，新对齐正确写出 |
| 删一行 | 不命中 | 规范输出，剩余行保留 |

即「内容没动才有保真，内容动了就退让」，退让后**内容不丢**，只重排分隔行与填充。

**接线点**

- `src/App.tsx` 有**两份**序列化实现：`serializeBody`（`:148`）与 `currentMarkdown`（`:1780`）。表格复用要接在两者之后，否则「保存」和「基线/草稿」看到的文本不一样。
- `scripts/roundtrip.mjs:28` 的 `throughApp` 是第三份拷贝，必须接同一步，否则报告与 App 不一致。
- 表格块识别必须跳过 ``` / ~~~ 代码块内的行，否则代码块里的 `| a |` + `|---|` 会被当成表格匹配。`src/lib/risk.ts:34` 的 `fenceMap` 可直接复用（它有同样的问题，见 B5 附带说明）。

**影响**：不修，用户每次保存 02 这类文档都要过保存门，且手工列宽在文件里永久丢失；修好则 02 从「被拦截」变「完全保真」。

**难度**：中。约 120–160 行纯函数（含单测）+ 2 处接线 + 1 个 `Table.extend`。原型已跑通，但**未接进 App**，也未在真实编辑器里验证 `getMarkdown()` 走的是自定义扩展（`Table.extend` 只影响 `MarkdownManager` 里的注册顺序，需确认 App 的 managed editor 用的是同一份扩展列表）。

---

## B2 引用式链接：定义块在解析时被吃掉（04），默认源码模式有两个必须一起做的动作

**现象与复现**

`npm run roundtrip`，04 记 `-4 +1`：

```
- 参考 [Tiptap][tiptap] 与 [CodeMirror][cm]，还有 [行内链接](https://tauri.app)。
- (空)
- [tiptap]: https://tiptap.dev
- [cm]: https://codemirror.net
+ 参考 [Tiptap](https://tiptap.dev) 与 [CodeMirror](https://codemirror.net)，还有 [行内链接](https://tauri.app)。
```

两行定义被删，两个引用被改写为行内链接，URL 保留了。定义块根本不进文档模型（marked 在词法阶段消费掉，Tiptap 只拿到 link mark 的 href），所以「解析 → 序列化」必然写成行内形式。

**现状证据（CDP 实测，`/__doc` 注入 04）**

- 载入即出横幅：「这篇载入时就有会被改写的结构（2 类）：引用式链接定义 [tiptap]: … 会被丢掉，正文里的链接会被改写成行内形式；… [cm] …」，带按钮「在源码模式打开原文」「知道了」（`bug-01-ref-links-banner.png`）。
- 源码模式显示原文：源码框 7 行，含 `[tiptap]: https://tiptap.dev`（`bug-02-ref-links-source.png`）。
- 未打字往返源码↔编辑后 `dirty=false`，源码按钮 `title=源码：显示文件原文`（`bug-03-ref-links-after-toggle.png`）。宿主打开文档时 `baselineRef` 存的是**原文**（`App.tsx:795`），所以源码内容与原文相等时不会误标脏——这点之前担心过，实测没问题。
- 未编辑时 `Ctrl+S` 不弹框（走「没有改动，未写入」）。
- 改动后保存门工作正常：改字再 `Ctrl+S` 会弹 `SaveDialog`（02 已实测同一路径，`bug-06-table-save-gate.png`）。

**识别规则（复用现有实现，别另写一套）**

`src/lib/risk.ts:46`：

```ts
const REF_DEFINITION = /^\[([^\]^][^\]]*)\]:\s*(\S.*)$/
```

- 行首必须是 `[`，标签不能为空、首字符不能是 `^`（排除 `[^1]:` 脚注定义）。
- `: ` 后必须有非空内容（URL）。
- `fenceMap`（`risk.ts:34`）逐行标注是否在 ``` / ~~~ 代码块内，代码块里的「定义」不算。
- `referenceLosses`（`risk.ts:60`）还要求「URL 在输出里仍存在」才算被改写，避免把「用户整段删掉」误判成序列化损失。

已知不覆盖（未验证，按 CommonMark 推断）：缩进 ≤3 空格的定义、跨行 title（下一行 `"标题"`）、`[label]` 短引用形式、标签大小写与内部空白归一（CommonMark 视 `[Foo]` 与 `[foo]` 为同一标签，这里按字面比较）。做「默认源码模式」时用同一正则即可，不要另立标准，否则会出现「横幅说会丢、默认却不切源码」。

**默认源码模式最小实现**

- 判定：从 `risk.ts` 导出 `hasReferenceDefinitions(text): boolean`（跑一遍 `fenceMap` + `REF_DEFINITION`），与保存门共用。
- 两个接线点：`loadIntoEditor`（`App.tsx:1540` 现在写死 `setViewMode('edit')`）与 `applyHostPayload`（`:775`，宿主打开文档的唯一入口，**当前完全不设 `viewMode`**）。
- **必须同时 seed 两个状态**：`setSourceText(text)` 与 `sourceBaselineRef.current = text`。理由：
  - `currentMarkdown()`（`:1781`）在源码模式直接返回 `sourceText`。只切 `viewMode` 不 seed，`sourceText` 仍是空串，`Ctrl+S` 会写一个空文件。
  - `sourceBaselineRef` 不 seed，`:1367` 的源码脏检查与 `:1370` 的草稿写入都拿空串当基准，会把文档误标脏并写草稿。
  - 不能靠 `switchView`（`:2701`）里的 seed，因为载入路径不经过它。
- 退出源码的既有路径不用改：`applySource`（`:2675`）会把源码写回编辑器，`:2694` 用 `sourceText` 与 `baselineRef` 重算脏。

**源码保存是否逐字节保真**：**是**（未编辑时）。`currentMarkdown` 源码分支原样返回 `sourceText`（`:1781`）；`prepareSave`（`:1793`）只在原文以换行结尾时补回末尾换行，并按 `eolRef` 还原 CRLF；源码框在 `dirty=false` 时显示 `rawTextRef`（`:2710`），即文件原文。`frontmatter`/脚注在源码模式下不参与拼接（`currentMarkdown` 先判 `sourceMode` 再拼），所以不会重复拼入。

**富文本切换后定义是否丢**：**丢，而且是载入时就已经丢**（解析阶段），不是切视图才丢。附带影响：编辑视图的自动草稿也用编辑器序列化（`:680`），崩溃恢复到草稿时定义已经没了；文件本身仍由保存门拦。

**影响**：04 只有走源码路径才保真；默认富文本打开时每次真实保存都要用户点一次确认。默认源码模式如果漏了 seed，后果是**保存空文件**，比现在的损失更严重。

**难度**：小（判定 ~10 行 + 2 处接线 + 2 处 seed + 1 条测试）。风险集中在 seed 遗漏，必须加一条「源码模式默认打开后 `Ctrl+S` 写出的字节等于原文」的测试。

---

## B3 01：frontmatter 后那一个空行在解析阶段丢

**现象与复现**

01 在「当前应用」列记 `-1 +0`，唯一删掉的行是空行：

```
5  ---                5  ---
6  (空)    ← 丢       6  # 周记
7  # 周记
```

其余 13 行完全一致（callout、任务列表、frontmatter 三行都保住了）。

**根因（实测 `.tmp/r10-probe.mjs` 实验 3）**

`splitFrontmatter`（`src/lib/frontmatter.ts:39`）返回的 body 以 `\n` 开头。marked 把开头这 1 个换行当成 `space` token；`@tiptap/markdown` 的 `createImplicitEmptyParagraphsFromSpace`（`node_modules/@tiptap/markdown/dist/index.js:609-619`）用「`\n\n` 出现次数 − 1」算要补几个空段落，`\n` 只有 1 个换行、出现 0 次 → 0 个空段落。序列化时也就没有东西可补。**丢在解析，不在序列化**。

空行个数实测（frontmatter 与第一个标题之间）：

| 原文空行 | 输出空行 | 结论 |
| ---: | ---: | :--- |
| 0 | 0 | 对 |
| 1 | 0 | **丢**（01 就是这种） |
| 2 | 2 | 对 |
| 3 | 2 | 少 1 |

**局部修法（不碰编辑器）**

- `SplitResult` 增一个字段记「body 开头的换行数」；`joinFrontmatter` 拼回时补 `max(0, 原数 − 当前数)` 个 `\n`。四种情况全部精确。
- App 侧接线：`:760`、`:802`、`:1503`、`:1508`、`:1784`（`:680` 草稿同理）。`scripts/roundtrip.mjs:33` 也走同一个 join，报告才会跟着变。
- **门禁影响**：`src/lib/frontmatter.test.ts:46/50/55/60` 用 `deepEqual` 断言整个 `SplitResult` 对象，加字段会直接红。要么改这 4 条断言，要么把「开头空行数」做成独立导出函数（例如 `leadingNewlines(text)`），`SplitResult` 保持不变。后者对现有测试零影响，推荐。

**风险**：拼接时多补的换行可能落在「用户把第一个块删空」的边界上（body 只剩空行）。规则写成「只补原文有、当前缺的部分」，且当前 body 为空串时不补，即可避免。

**影响**：只是排版，但恰好是 brief 里点名的 01。空行不在保存门里（`risk.ts:284` 的 `blank-lines` 是 `blocking: false`），所以现在是**静默改写**。

**难度**：小到中（`frontmatter.ts` ~20 行 + 6 处接线 + 1 条新用例）。

---

## B4 06：任务列表后接普通列表，中间必多一个空行

**现象与复现**

06 记 `-0 +1`：`- [x] 已完成` 与 `- 普通条目` 之间多一个空行。浏览器里 5 个 `li`：2 个 checkbox 项 + 3 个普通项（`.tmp/r10-browser.log` 最后一行）。

**根因**

Tiptap 的列表结构互斥：`taskList` 只能装 `taskItem`，`bulletList` 只能装 `listItem`。一篇 markdown 列表里混着 `[ ]` 项与普通项时，parse 必然拆成两个顶层块；doc 级用 `"\n\n"` 连接（`extension-document/dist/index.js:13`），两个列表之间必然出现一个空行。

实测（`.tmp/r10-probe.mjs` 实验 5）：原文「两个列表之间无空行」与「有空行」的序列化结果**完全相同**。也就是说当前模型无法区分这两者，输出只能选一种写法。普通列表后接任务列表同样如此。

**影响**：只影响排版，不丢内容。二次往返已收敛（实验 4：四个样本第二遍与第一遍完全相同），不会持续漂移。空行不在保存门里，不拦也不提示。

**建议**：本轮不做。信息在 parse 阶段就没有了；要保真只能沿用表格的「原样复用」思路（该段列表在保存时逐行复用，条件是列表项文本序列一致），代价与收益不成比例。若产品要求「不许静默」，只加一条 `blocking: false` 的提示（「列表间空行会被规范化」），不要加拦截。

**难度**：大（不建议本轮做）。

---

## B5 02 修好之后保存门口径必须同步改，否则「修好了还弹框」

**现象（今天就能复现，CDP 实测）**

- `/__doc` 注入 02 → 载入即挂横幅：「表格分隔行会被重排（列宽与对齐写法变化，单元格内容不动）」，样例 `|:-----|-----:|:----:|`（`bug-04-table-loaded.png`）。
- 不动时 `Ctrl+S` 不弹（没有改动，未写入）。
- 在表格里敲一个字，再 `Ctrl+S` → 弹 `SaveDialog`：「保存后这些写法会被改写 … 表格分隔行会被重排 … 影响 1 处 `|:-----|-----:|:----:|` … 仍然保存 / 取消 / 在源码模式看原文」（`bug-05-table-edited.png`、`bug-06-table-save-gate.png`）。

**为什么必须跟着改**

`tableLosses`（`src/lib/risk.ts:90-125`）只比较 `separator.trim()` 是否相同，与「单元格内容变没变」无关。

- 表格保真做好后：内容没动 → 整块复用原文 → 基线里没有这条 loss → 不弹框（正确）。
- 内容一动（改值/加列/删行/改对齐）→ 复用退让 → 分隔行按列宽重生成 → 这条 loss 仍在基线里 → **每次保存都弹框**。而这时重排是不可避免且无害的。

即：不跟着改，用户改一个表格单元格的代价从「无感」变成「每次保存点一次确认」，比现在更烦。

**建议（按代价排序，推荐 1 + 2 一起）**

1. 把 `table-separator` 改成 `blocking: false`（`risk.ts:118`），弹框里降级到「等价改写（不拦保存）」那一栏。1 行。
2. 基线先在「复用后的序列化」上算（`baselineLosses` 前跑 `reuseTables`），内容没动时基线天然为空。配合 1，只有真改了表格才会看到一行不拦的提示。
3. 删掉 `tableLosses`。会丢掉「表格被重排」的可见提示，不推荐。

**附带（与 brief 的「修不了就纳入保存门分类」相反）**：01/06 已经实测**不在门里**——浏览器载入 01、06 均无横幅（`risk.ts:284` 的 `blank-lines` 是 `blocking: false`）。现状是「不拦也不提示」。要满足「不许静默」，只能加 `blocking: false` 的提示项，不能加 blocking，否则每次保存普通文档都会被拦。

**难度**：小（`risk.ts` 1–3 行 + 1 条 risk 单测）。

---

## 优化机会（最多 3 条）

**O1 保存门对全文重复扫描**：`classify`（`risk.ts:254`）先算一遍 `fenceMap(beforeText)`，接着 `tableLosses`、`footnoteLosses`、`htmlLosses`、`hardBreakLosses` 各自又对 before 与 after 各算一遍，一次保存约 10 遍全文按行正则。实测 2 MB / 32 万行文档 `classify` 一次 **339 ms**（`.tmp/r10-perf.mjs`），同步跑在主线程。改法：`classify` 里算一次 before/after 的 `fenceMap`，作为参数传进各 `*Losses`；同一文本的分类结果按内容缓存。零行为变化。

**O2 三份重复序列化**：`App.tsx:148`（`serializeBody`）、`App.tsx:1780`（`currentMarkdown`）、`scripts/roundtrip.mjs:28`（`throughApp`）是同一段管线抄了三遍。本轮要接的「表格复用」和「frontmatter 空行」都得接三次，漏一处就出现「报告说保真、App 仍改写」。抽一个 `serializeDocument(editor, { frontmatter, footnotes, original })` 供三处调用，顺带让报告的「走的是 App 真正的保存流程」名副其实。

**O3 保存时对原文重复分类**：载入时 `baselineLosses(original, serialized)` 算一次，保存时 `activeLosses` 又对 `original` 重算一次（`App.tsx:1885`、`:2162`）。基线非空（04/02 这类文档）时，每次保存多花一次全文扫描。可把基线的 `after` 文本一起存下，`normalized` 与它相同就直接复用基线结果。

## 未验证 / 边界

- 表格复用**只在脚本原型里验证**，未接进 App，也未验证 `Table.extend` 在真实编辑器 `getMarkdown()` 路径上生效（`MarkdownManager` 的扩展列表与 App 的 editor 扩展列表是两处配置）。
- 引用定义识别的「缩进 ≤3 / 跨行 title / 短引用 / 大小写归一」未逐条实测，按 CommonMark 规则推断。
- 06 的「原样复用」方案未做原型。
- 未验真实保存到磁盘（本机 `showSaveFilePicker` 路径），源码模式的字节保真结论来自 `currentMarkdown`/`prepareSave` 代码路径 + 未编辑时 `sourceText` 等于原文的实测。
