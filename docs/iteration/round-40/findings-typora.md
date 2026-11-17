# 第 40 轮 Typora 对照与写作体验（finder-typora）

- 轮前 startSha：`504dedd22b1133c7629bc1a437ca24b8a8889322`
- 环境：dev server `http://localhost:5175`、CDP `9223`、`node .tmp/reset.mjs 9223` 已跑
- 本轮真跑：6 组（`t1`–`t8` 截图 8 张）、2 组 Node 保真探针、1 组剪贴板实测
- 脚本：`.tmp/e2e-r40-typora-a.mjs`、`-b`、`-c`、`-d`、`-e`、`-f`、`.tmp/e2e-r40-fidelity.mjs`、`.tmp/e2e-r40-fidelity2.mjs`
- 只读：未改产品代码；未 push；未动 `release/`

## 0. 结论先行

本轮 6 条可执行项。两条是**真实数据损坏**（单波浪号下标、HTML 注释），都在「打开既有文档 → 改别处 → 保存」这条日常路径上，不是功能缺失：

| # | 项 | 级别 | 改动面 |
| :--- | :--- | :--- | :--- |
| 1 | `H~2~O` 载入即被当删除线，保存写成 `H~~2~~O` | P1 | `src/lib/` 预处理一处 + 单测 |
| 2 | `<!-- 注释 -->` 保存后变 `&lt;!-- 注释 --&gt;` | P1 | `src/lib/html.ts:1` 一行正则 + 单测 |
| 3 | `[toc]` 保存后被转义成 `\[toc\]`，且不渲染 | P2 | 同一条修复链 |
| 4 | 表格工具栏没有列对齐与行/列重排入口（Typora 有） | P2 | `src/App.tsx:4706` 工具条 + 对齐属性 |
| 5 | 复制出去只有裸文本，没有 Markdown 源（缺「复制为 Markdown」） | P2 | Tiptap `clipboardTextSerializer`，一处 |
| 6 | `docs/typora-gap.md` 过期：11 条应到 15 条，另有 2 行需补注 | P2（文档） | 单文件 |

## 1. P1 单波浪号下标 `H~2~O`：打开即变删除线，保存写成 `~~2~~`

**用户收益**：Typora 迁移用户的下标写法不再被改坏；`~` 也不会和删除线互相污染。

**复现（真实应用）**：
1. 在「未命名.md」里用源码态输入：`这是 ==高亮重点== 与 X^2^ 与 H~2~O 的句子。`
2. 切回编辑模式：`H~2~O` 里的 `2` 变成**删除线**（截图 `shots/round-40/t1-rich-literal.png`，中间那行 `H2O` 的 `2` 带删除线）。
3. 再切源码态看应用自己写出的 Markdown：`这是 ==高亮重点== 与 X^2^ 与 H~~2~~O 的句子。`（截图 `shots/round-40/t2-source-after-parse.png`）。
4. `Ctrl+S` 写盘时写的就是这条源码串。

**Node 探针**（`.tmp/e2e-r40-fidelity.mjs`，App 同款保存链路）：
```
原文: "==重点== 与 X^2^ 与 H~2~O。\n\n尾段。\n"
写出: "==重点== 与 X^2^ 与 H~~2~~O。\n\n尾段改过。\n"
```
对照：`X^2^` 保真、`~~删除线~~` 保真、`==重点==` 保真（只是不渲染）。**只有单 `~` 被改写**。

**根因与实现要点**：Markdown 解析把 `~2~` 当成交替的 strike 标记（写成 `~~`），序列化时按 Schema 输出 `~~2~~`。两条路：
- 解析前把「不成对的单个 `~`」转义（`src/lib/math.ts` 的 `protectMathPairs` 是同一模式，在 `src/App.tsx` 的 `escapeHtmlForParse(protectMathPairs(...))` 链上加一个 `protectSingleTildes`），保存时在 `src/lib/serializeDocument.ts` 的 repair 链里还原。风险：`~~删除线~~`、代码块内的 `~` 不能被误伤，参考 `escapeHtmlForParse` 的围栏处理。
- 或配置 strike 的 Markdown 解析只接受 `~~`（更彻底，依赖库行为，需先确认 `@tiptap/markdown` 是否暴露 tokenizer 配置）。

**体积与风险**：纯函数 + 约 20 行，gzip 增量 < 300 B；主风险是误伤删除线与行内代码，需补单测（`src/lib/html.test.ts` 旁边新增 `tilde.test.ts` 一类）。
**建议优先级**：P1，修复面最小、用户可见度最高。

## 2. P1 HTML 注释 `<!-- -->` 保存后被转义

**用户收益**：给编辑/自己留的注释在 `.md` 里保持原样；别的渲染器（GitHub、Typora、pandoc）不再显示 `&lt;!-- ... --&gt;`。

**复现（真实应用）**：同一组截图，源码态第 4 行是 `&lt;!-- 给编辑看的备注 --&gt;`（`shots/round-40/t2-source-after-parse.png`）。原文是 `<!-- 给编辑看的备注 -->`。再切回编辑态，正文显示字面 `<!-- 给编辑看的备注 -->`，所以这是**保存字节被改**，不是显示问题。

**Node 探针**：
```
原文: "# 标题\n\n<!-- 这是给编辑看的备注 -->\n\n正文。\n"
写出: "# 标题\n\n&lt;!-- 这是给编辑看的备注 --&gt;\n\n正文改过。\n"
```
对照：`<kbd>Ctrl</kbd>`（`F` 行）、`<u>下划线</u>`（`J` 行）、`<div align="center">`（`K` 行）全部**原样保真**——同一条 `repairHtml` 链只漏了 `!` 开头。

**根因与实现要点**：`src/lib/html.ts:1` 的 `ESCAPED_TAG = /&lt;(\/?[a-zA-Z][^&\n]*?)&gt;/g` 只认字母和 `/`；解析前 `escapeHtmlForParse`（同文件 :21-22）会把 `<!` 转成 `&lt;!`，还原时匹配不到。修法：字符类改成 `[a-zA-Z/!]`（如再稳一点加 `?`，覆盖 `<?xml`），`src/lib/html.test.ts` 加注释往返用例。**注意**：`a &lt; b` 这种比较符号仍不能被还原（现有测试已守）。

**体积与风险**：一行正则，gzip ≈ 0 B；风险是 `<!` 开头但不是注释的文本被还原成标签——Markdown 里本来就按 HTML 处理，可接受，加单测即可。
**建议优先级**：P1（数据损坏、修复成本一行）。

## 3. P2 `[toc]`：不渲染，保存还被转义成 `\[toc\]`

**用户收益**：Typora 用户迁移过来的长文不再少一节目录；即使暂不做目录，至少不把 `[toc]` 改写成 `\[toc\]`（别处渲染会看见反斜杠）。

**证据（真实应用）**：源码态输出 `# 第一章\n\n\[toc\]\n\n…`（截图 `t2-source-after-parse.png`）；编辑态 `[toc]` 只是字面文本（`t1-rich-literal.png`）。Node 探针 `G` 行同样是 `\[\toc\]` 形态（`"\\[toc\\]"`）。

**Typora 行为**：`Docs/Markdown Reference.md:189-191`，输入 `[toc]` 回车即生成自动更新的目录。

**实现要点（两档）**：
- 小：把单独成行的 `[toc]`/`[TOC]` 列入「保护 → 还原」链（和 `protectMathPairs` 同层），保存字节回到 `[toc]`；**不改渲染**。
- 大：新增一个 TOC 节点/装饰，从 `src/lib/outlineTree.ts` 的标题树生成，编辑视图与预览/HTML 导出都用它（导出塞 `src/lib/export.ts`）。这一档要处理「标题改了目录跟着改」和导出无 DOM 的情况，成本 M。

**体积与风险**：小档 +约 200 B；大档要新组件与导出分支，+2–4 KB gzip，建议单独一轮。
**建议优先级**：P2（先做小档保真，目录渲染按用户呼声再排）。

## 4. P2 表格工具栏：没有列对齐入口，也没有行/列拖动重排

**用户收益**：表格对齐不用回源码手写 `:--:`；行顺序调整不用剪切粘贴。

**现状证据（真实应用）**：
- 光标进表格后工具条文字是 `表格 上插入 下插入 左插入 右插入 删行 删列 删表`，**0 个对齐按钮**（截图 `shots/round-40/t5-table-bar.png`；源码 `src/App.tsx:4706-4730`）。
- 但**渲染是对的**：同一张表 `| :-- | :--: | --: |` 的单元格 `text-align` 分别是 `left / center / right`（DOM 实测，见 `t5` 截图第一行「左 / 中 / 右」）。
- 保存也对：改一格后写出的分隔行仍是 `| :--- | :---: | ---: |`（Node 探针 `C` 行），未改动时整块逐字节复用（`D` 行）。

**Typora 行为**：`Docs/Table Editing.md:64-70`（工具条上选对齐、拖拽移动行/列），`:34-38`（`Ctrl+Enter` 加行、`Shift+Ctrl+L` 删行——注意 Sidelight 现在是 `Ctrl+L`）。

**实现要点**：对齐用 Tiptap 的 cell 属性（解析已经能识别对齐，DOM 上已有 `style="text-align:…"`；给 `TableCell`/`TableHeader` 加 `textAlign` 属性，工具条加四个按钮，序列化时把属性写回分隔行，走 `src/lib/tableReuse.ts` 的签名比对）。重排用 `moveRow`/`moveColumn` 命令或拖拽手柄，成本比对齐高。
**体积与风险**：对齐 +约 600 B，风险在序列化：必须让 `reuseTables` 的签名把对齐也算进去（已经在 `signatureOf` 里算 alignment，改属性后签名变化会「退让」成序列化结果——这是对的）；重排另算。
**建议优先级**：P2（对齐先做，重排可延后）。

## 5. P2 复制出去只有裸文本，没有 Markdown 源

**用户收益**：选中一段带格式的文字粘到微信 / 邮件 / 终端 / 代码托管时，Markdown 标记还在；不用回头补 `**`。

**现状证据（真实剪贴板）**：`.tmp/e2e-r40-typora-b.mjs` 在编辑器里选中「这里有 **粗体**、`行内代码` 与 [链接](https://example.com)。」后按 `Ctrl+C`，读剪贴板：
```
text/plain: "这里有 粗体、行内代码 与 链接。"
types: ["text/plain", "text/html"]
```
`text/html` 有（粘到富文本编辑器不丢），但 `text/plain` 里没有 `**`、反引号与链接地址。`src/App.tsx` 只有图片粘贴的处理（:856），没有 `copy`/`clipboardTextSerializer`，`src/components/ShortcutsDialog.tsx` 也没有「复制为 Markdown」。

**Typora 行为**：`Docs/Quick Start.md:29`「Copy Markdown source by default」——开启后复制同时给 HTML 与 Markdown；`:37` 另有「粘贴为纯文本」`shift+cmd+v`。

**实现要点**：给编辑器加 ProseMirror 的 `clipboardTextSerializer`（Tiptap `editorProps`），把选区序列化成 Markdown 放进 `text/plain`——不用新依赖，只影响 `text/plain`，粘到微信就是带标记的纯文本。想更保守可加一个 `Ctrl+Shift+C`「复制为 Markdown」命令，默认行为不变。
**体积与风险**：约 30 行 + 序列化调用，gzip +300–600 B；风险是复制大选区时的耗时（只序列化选区，不是全文）与行内公式/图片的 Markdown 形态，需一条 e2e 断言。
**建议优先级**：P2（写作高频，但改动碰剪贴板，放在数据修复之后）。

## 6. P2 `docs/typora-gap.md` 过期：11 → 15，另有两行要补注

**核对命令与结果**（`node -e` 数表格行）：`有 30`、`缺 11`，与标题「已经有的（30）」「缺的（11）」一致；但第 39 轮与本轮的结论没入表。

**要补的行（4 条，缺 11 → 15）**：
1. 打开链接的出口（第 39 轮 `findings-typora.md` §2：编辑视图点链接能编辑、没有「在浏览器打开」）。
2. 标题开头 Backspace 退回正文（第 39 轮 §6）。
3. 复制为 Markdown / 复制时带 Markdown 源（本轮 §5；Typora `Docs/Quick Start.md:29`）。
4. 表格列对齐与行/列重排入口（本轮 §4；Typora `Docs/Table Editing.md:64-70`）。

**要改的两行**：
- `docs/typora-gap.md:48`「行内 HTML 渲染｜保真但不渲染」：保真**不成立**——`<!-- -->` 保存会被转义（本轮 §2），应写成「`kbd`/`u`/`div` 保真不渲染，HTML 注释会被转义」。
- `docs/typora-gap.md:50`「高亮、上下标、TOC、emoji｜无」：补一句 `~` 单波浪号与删除线冲突会被改写（本轮 §1），否则实现上下标时容易再踩。

**建议优先级**：P2，文档改动，和 1–2 的修复同轮落地。

## 7. 试过、判断没有问题的路径（免得下一轮重复劳动）

全部有输出，脚本与截图见文首。除非注明，均为本轮实测。

| 路径 | 结果 |
| :--- | :--- |
| 表格列对齐渲染 | `text-align` 左/中/右正确（`t5` 截图） |
| 表格末格 `Tab` 自动加行 | 2 行 3 格 → 3 行 6 格（`e2e-r40-typora-b`） |
| 任务列表勾选框点击 | `data-checked` false → true |
| 粘贴网页富文本 | `<strong>`/`<em>`/`<ul>` 保留（strong=1、em=1、li=2，截图 `t8-paste-html.png`） |
| 代码围栏语言 | ```` ```python ````、```` ```js ```` 保存后仍在（源码态与 `e2e-r40-typora-d` 的 `closedSource`） |
| 图片/链接 title | `![图](a.png "说明")`、`[文](url "说明")` 往返逐字保真（探针 `L`、`M`） |
| HTML 块 `<div align>` | 文本往返保真（探针 `K`） |
| `~~删除线~~`、`^上标^`、行尾两空格换行 | 往返保真（探针 `O`、`P`、`I`） |
| 源码 ↔ 富文本切换 | 干净重跑不串文档（`e2e-r40-typora-d.mjs`：`after1` / `sourceAfterFill` / `after2` 三段一致） |
| 控制台 | 两组 e2e 都是 0 条 console error / pageerror |
| mermaid 坏语法 | 给提示「图表没渲染出来，代码块内容仍是原文」，不静默吞（第 36 轮实现，本轮 `t3` 复现） |

## 8. 上几轮已报、本轮复核仍然有效（不重复计数）

- 粘贴为纯文本 `Ctrl+Shift+V`：仍无；`src/App.tsx` 无对应键位，`ShortcutsDialog` 未列（第 37/38 轮）。
- 全屏、视图缩放（Ctrl+滚轮）：仍无（第 37/38 轮）。
- 行内 HTML 渲染（`<kbd>`、`<u>`）：仍是字面（截图 `t1` 倒数第二行）。本轮新增的是「注释会被转义」，算在 §2。
- 代码块无语法高亮、无语言切换入口：本轮 DOM 复核仍是 `pre` 无 class、块内 0 按钮（第 39 轮 §3）。
- 图片落盘规则（`${filename}.assets`）：仍只有 `assets/`（第 36/38 轮）。
- 大纲折叠不持久、无全部折叠：第 38 轮。
- 拖入 `.md`/文件夹打开：第 38 轮。

## 9. 截图索引（`shots/round-40/`）

| 文件 | 内容 |
| :--- | :--- |
| `t1-rich-literal.png` | 编辑态：`[toc]`、`==高亮==`、`X^2^`、`H2O`（`2` 带删除线）、`<kbd>`、`<u>`、对齐表格、任务列表 |
| `t2-source-after-parse.png` | 源码态（= Ctrl+S 写出的字节）：`\[toc\]`、`H~~2~~O`、`&lt;!-- … --&gt;` |
| `t3-reload.png` | 用上一步字节重新载入后的正文；与 `t1` 逐像素相同（重载后渲染一致，SHA256 都是 `2603dcd5…`） |
| `t4-typed.png` | 键盘输入 `==重点==` / `H~2~O` 的表现（输入路径会转义成 `\~`） |
| `t5-table-bar.png` | 表格工具条 7 个按钮、无对齐入口；对齐渲染正确 |
| `t6-code-block.png` | 代码块形态（无语言徽标/复制按钮） |
| `t7-code-only-doc.png` | 只有代码围栏的文档载入正常 |
| `t8-paste-html.png` | 粘贴网页富文本后保留粗体/斜体/列表 |

## 10. UNVERIFIED 与补测方法

- **真实磁盘写回**：本轮用「源码态内容」代表 `Ctrl+S` 写出的字节（浏览器 dev 环境没有文件句柄），并用 `serializeDocument` 同链路 Node 探针复核。补测：宿主模式打开一个含 `H~2~O`、`<!-- -->` 的 `.md`，改一段后 `Ctrl+S`，`git diff`/字节比较。
- **Typora 侧复跑**：`~`/`^`/`==` 在 Typora 里要先在偏好设置打开（`Docs/Markdown Reference.md:362-372` 写明），本轮只读文档，没在 Typora 里复跑这三条。
- **从 Word/富文本程序的真实粘贴**：本轮用 `navigator.clipboard.write` 构造 `text/html` + `Ctrl+V`，可信但不等价于 Word 的 `mso-*` 标签。补测：Word 里复制一段带标题/表格的内容，粘进 Sidelight。
- **表格重排的 Typora 侧拖拽**：`Docs/Table Editing.md:70` 只说「drag & drop」，没有键位；未实测 Typora 的拖拽手柄形态。
- **复制为 Markdown 的选区边界**：本轮只测了一行内联样式，跨块（标题+列表+表格）选区未测。

## 11. 给 planner 的排序

1. **§1 单波浪号**（P1，数据损坏、纯函数、单测就能守）
2. **§2 HTML 注释**（P1，一行正则 + 单测；与 §3 共用 repair 链，合一个任务做）
3. **§3 `[toc]` 保真**（P2，和 §2 同一条修复链，顺手）
4. **§6 差距表更新**（P2，文档，随 1–3 同轮）
5. **§5 复制为 Markdown**（P2，碰剪贴板，单独任务）
6. **§4 表格对齐按钮**（P2，碰序列化，放最后或下一轮）

理由：前四项都在「打开 → 保存」这条路径上，改动小、回归面窄；§5、§4 都是体验增强，留出独立验收空间。
