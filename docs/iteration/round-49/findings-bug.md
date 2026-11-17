# 第 49 轮 5 路 缺陷猎人报告（finder-bug）

- 轮次：round 49　轮前 startSha：`57e2a81748090e63b88b1ad4f998ca3b689e347f`（`git rev-parse HEAD` 同值；`git status --porcelain` 未新增产品代码改动，本角色只读）
- 环境：dev server `http://localhost:5175` 已在跑（未起、未重启）；CDP 9222（未启动 Edge、未 kill msedge）；每个脚本前 `node .tmp/reset.mjs 9222`；假 FSA 工作区复用 `.tmp/r30-fsa.mjs`。未 push，未动 `release/`。
- 结论：**2 条本轮新发现可执行（P1 × 1、P2 × 1）**。11 条路径真跑；本角色 6 套脚本 `CONSOLE_ERRORS` 全空。
- 截图：`shots/round-49/` 里本角色 20 张（关键 5 张文末列出）。

---

## F1（P1）正文里的命名 HTML 实体首次保存被二次转义：`&nbsp;` → `&amp;nbsp;`，文件语义变了且无提示

**复现步骤**（脚本 `.tmp/e2e-r49-ent.mjs`，日志 `.tmp/r49-ent.log`；截图 `.tmp/e2e-r49-shot.mjs`）
1. 打开假工作区，`实体.md` 种子内容是 `甲&nbsp;乙\n`。
2. 点开 `实体.md`。编辑器段落文本读回 `甲&nbsp;乙`（6 个字面字符，`hasNbspChar:false`，没有 U+00A0）。
3. `Ctrl+/` 进源码框：**保存前** `textarea.value` = `"甲&nbsp;乙\n"`（截图 `bug-f1-source-before.png`）。
4. `Ctrl+/` 回正文，按一次 `Ctrl+S`，提示「已保存 实体.md」。再进源码框：`textarea.value` = `"甲&amp;nbsp;乙\n"`（截图 `bug-f1-source-after.png`）。
5. 盘上字节（假 FSA 读回）：`"甲&amp;nbsp;乙\n"` —— 比种子多 4 个字符，**没有**弹「保存前确认」。
6. 用盘上字节重新播种并重开同一篇：正文仍是 `甲&nbsp;乙`（`hasNbspChar:false`），再存一次字节不变（`stable2:true`）。即：**第一次保存静默改写，之后稳定**。

**同类三种位置都成立**（同一日志）
| 用例 | 种子 | 保存后盘上 | 说明 |
| --- | --- | --- | --- |
| `e1-nbsp.md` | `甲&nbsp;乙\n` | `甲&amp;nbsp;乙\n` | 正文行内 |
| `e2-more.md` | `甲&copy;&hellip;&#8212;乙\n` | `甲&amp;copy;&amp;hellip;—乙\n` | 命名实体都被转义；**数字实体 `&#8212;` 反而被解码成 `—`**（同一行两种口径） |
| `e5-table.md` | `\| 甲 \|\n\| --- \|\n\| a&nbsp;b \|` | `\| 甲            \|\n\| ------------ \|\n\| a&amp;nbsp;b \|` | 表格里也中招，而且**没动过的表格**同时被重排成补空格版本（第 10 轮的「未改动表格整块写回原文」在这条路径上失效，因为单元格内容被改了就走了重排分支） |
| `e6-line-nbsp.md` | `第一段。\n&nbsp;\n第二段。\n` | `第一段。\n&amp;nbsp;\n第二段。\n` | 用户**手写**的整行 `&nbsp;` 空段落——第 40 轮 `blankParagraphs.ts` 明确承诺「用户手写的 `&nbsp;` 段落原样」，实际保存层把它改了 |
| `e3-inline-code.md` / `e4-fence.md` | ``甲 `&nbsp;` 乙`` / 围栏里 `&nbsp;` | 逐字节相同（`same:true`） | **行内代码与围栏不受影响**（`mapOutsideCode` 跳过了代码段），说明缺陷只在正文/表格文本路径 |

**期望 vs 实际**
- 期望：原文写的是什么实体，保存后还是什么字节（第 40/41 轮对 `H~2~O`、`<!-- -->`、`<` `>` `&` 都是按这个标准修的）；或者至少弹一次「保存前确认」说明 `&nbsp;` 会变 `&amp;nbsp;`。
- 实际：静默改写。`&nbsp;` 在 HTML/CommonMark 里是「不换行空格」，`&amp;nbsp;` 是 6 个字面字符——**文件的语义变了**。按 HTML 实体规则可推：其它 Markdown 渲染器（GitHub、Typora、Obsidian）打开改写后的文件会显示字面 `&nbsp;`，而作者写的是空格。此推断**未在 Typora 实测**（本机无 GUI Typora，见 UNVERIFIED）。
- 与既有承诺矛盾：`src/lib/html.ts:18-19` 的注释写「原文里真的写过某条实体时，那一类整篇保持不动」，`src/lib/blankParagraphs.ts:6-7` 写「用户手写的 `&nbsp;` 段落原样」，两处意图与实际相反。

**根因**（`src/lib/html.ts`）
- 序列化器 `@tiptap/core` 的 `encodeHtmlEntities`（`node_modules/@tiptap/core/dist/index.js:4264`）把每个 `&` 写成 `&amp;`。编辑器里 `&nbsp;` 是字面文本（解析层不认命名实体：`&copy;`/`&hellip;` 同样显示字面，而 `&#8212;` 能解码成 `—`），于是保存链拿到 `&amp;nbsp;`。
- `repairHtml` 负责把实体还原，但 `src/lib/html.ts:39-45` 的 `&amp;` 分支只做「前视守卫」：`ENTITY_AHEAD`（`:11`）看到 `&amp;` 后面紧跟 `nbsp;` 就**保持不动**（`:44`）——这条守卫是为「新文档里打的字面 `&lt;`」设计的（`html.test.ts:121-126`），代价是所有命名实体都不再还原。
- 对照：标签分支（`:26-36`）有 `source.includes(...)` 的原文对照还原，`&amp;` 分支没有等价逻辑；`source` 已在手（`:22`），改造成本低。

**修复建议**
1. `repairHtml` 的 `&amp;` 分支加原文对照：`source !== null` 且 `source` 里对应位置写过 `&<name>;` 时还原成 `&<name>;`（与 `ESCAPED_TAG` 同一思路），`source === null` 保持现状以保住 `html.test.ts:121-126` 的字面 `&lt;` 守卫。
2. 单测补三组：`repairHtml('甲&amp;nbsp;乙', '甲&nbsp;乙') === '甲&nbsp;乙'`、`&copy;`/`&hellip;`、以及负例 `repairHtml('&amp;lt;', null) === '&amp;lt;'` 不变。
3. E2E 钉一条：种子 `甲&nbsp;乙` → `Ctrl+S` → 盘上逐字节等于种子、且**不弹**保存前确认。
4. 顺手定「数字实体」口径：`&#8212;` 目前被解码成 `—`（保存后字节变化、渲染不变），与命名实体保持不动相反；两条路选一条并写进 `html.test.ts`。

**影响面**：路径 2/4/7（打开→保存往返、表格编辑、粘贴含实体的文档）都会经过。真实文档里 `&nbsp;` 常见于从 Typora/网页复制的中文排版文本。可撤销（`Ctrl+Z` 只回编辑器，**不能**回盘上字节——再保存一次又写回改写版），所以判 P1 不判 P0。

---

## F2（P2）大纲折叠状态不跨文档保留：切走再回来又全展开

**复现步骤**（脚本 `.tmp/e2e-r49-ent.mjs` 的 `b4-outline-collapse` / `b4b-outline-back`，日志 `.tmp/r49-ent.log`）
1. 假工作区打开 `大纲.md`（`# 一` / `## 一甲` / `## 一乙` / `# 二`），再点侧栏「大纲」页签。
2. 读到 4 条 `.outline-item`：`["一","一甲","一乙","二"]`。截图 `bug-b4-outline.png`。
3. 点「折叠/展开「一」」按钮（`aria-label`，FileTree 头按钮同一获取方式；大纲项本身无折叠控件）：剩 `["一","二"]`。
4. 切到 `b-docB.md`，再切回 `大纲.md`，点「大纲」页签：又是 `["一","一甲","一乙","二"]`（截图 `bug-b4-outline-back.png`）。

**期望 vs 实际**
- 期望：同一篇文档在本次会话里折叠过的标题，切走再回来仍是折叠（至少会话内记住，与页签选择、滚动位置一致）。
- 实际：折叠状态随「重新打开文档」丢失，长文每次切回都要重新折一遍。不丢数据，判 P2。

**根因与建议**：大纲折叠集合现在只存在于 `Outline` 组件本地状态（`src/components/Outline.tsx:75` 一带用 `outline-item`/`is-active` 渲染），文档切换重建组件时不带任何键。建议按文档标识（`docName` 或批注链用的 cacheKey）存一份内存 `Map<string, Set<number>>`，切文档时读回；不必落盘。补一条 E2E（折叠 → 切走 → 切回 → 仍折叠）。

---

## 11 条路径的实测与判定

| # | 路径 | 结论 | 证据 |
| --- | --- | --- | --- |
| 1 | 工作区打开 + 逐篇打开 16 篇种子 | 通过 | `.tmp/r49-fid.log`、`r49-beh.log`：`data-path` 点击均返回 true，无「文件不存在」 |
| 2 | 打开 → `Ctrl+S` → 盘上字节（14 篇构造保真） | **F1 一类**；其余通过 | `r49-fid.log`：`f2`（`3. 三` 起始编号保真）、`f3`（行尾两空格硬换行保真）、`f4`（围栏内制表符保真）、`f12`（两空格嵌套列表保真）`same:true`；`f1/f5/f6/f7/f8/f9/f11/f13/f14` 是被序列化器归一化（见 note） |
| 3 | 可能丢内容的构造往返 11 篇 | 通过（除 F1 的 `g8`） | `r49-beh.log`：`g1-align`（`\| :--- \| ---: \|` 对齐保真）、`g2-pipe`（`a \| b` 转义竖线保真）、`g3-inlinecode`（双反引号内含反引号保真）、`g4-linktitle`、`g5-imgtitle`（标题保真）、`g6-footnote`（脚注 4 空格续行保真）、`g7-escape`（`\*`/`\_` 保真）、`g9-quote-list`（引用+嵌套列表保真）全部 `same:true` |
| 4 | 实体保真 6 篇（含重开与二次保存） | **F1** | `r49-ent.log` 的 `## e1/e2/e5/e6`；`e3/e4` 通过 |
| 5 | 文件树新建文件：主「＋ 新建」× 3 + 「新建选项 ▾」菜单 × 2 | 通过 | `.tmp/r49-tree3.log` `## t7-main-new`：新建 `未命名 2/3/4.md`，每次 toast「已新建 …」，当前文档随动，已有的 `未命名.md` 内容 `占用名。` 未被覆盖；`.tmp/r49-tree2.log` `## t4-menu`/`## t5-second`：菜单项 `["新建文件","新建文件夹"]`，同样去重命名 |
| 6 | 跨文档撤销（A 打字后不保存切 B，B 里连按 3 次 `Ctrl+Z`） | 通过（无跨文档污染） | `r49-beh.log` `## b1-cross-doc-undo`：`inB1.text:"B 的正文。"`、`dirty:false`，A 的盘上字节仍是种子（`diskA2 === seedA`） |
| 7 | `Ctrl+F` → `Ctrl+/` → 两次 `Esc` 的落点 | 通过 | `r49-beh.log` `## b2-find-mode`：源码态 `.find-bar` 仍在、给出「源码模式下不支持查找定位与替换…」、计数为空；第一个 `Esc` 关查找（模式仍 `source`，焦点 `source-editor`），第二个 `Esc` 回 `edit` 且焦点在 `.ProseMirror`（`insideEditor:true`） |
| 8 | 大纲折叠 + 跨文档切换 | **F2** | 见 F2 |
| 9 | 跨段选区 + 字数明细面板 | 通过 | `r49-beh.log` `## b5-selection-stats`：选区 23 字符 → 面板「选区 12 字 / 15 字符 / 7 句」（字符数不含空白，15 与手算一致）、`role=dialog` aria-label「字数明细」、`Esc` 后焦点回 `stats-trigger` |
| 10 | 第 48 轮两条修复回归（表格里 `Ctrl+Shift+L` / `Ctrl+2`）+ 保存字节 | 通过（修复守住） | `r49-beh.log` `## b6-table-guard`：`Ctrl+Shift+L` 后 `rows:2` 不变、侧栏 `collapsed:true`；`Ctrl+2` 后 `headingInCell:0` 且提示「表格单元格里不能用命令插入标题或块级内容…」；`Ctrl+S` 后 `same:true`、盘上字节与种子逐字节相同 |
| 11 | 窄窗 1024×700 + 表格工具条 | 通过（无溢出） | `r49-beh.log` `## b7-narrow`：`.doc-scroll` `cw=sw=980`、`pageOverflow:0`、工具条 7 个按钮都可见（53/41 px 宽）；截图 `bug-b7-narrow.png` |

控制台：6 套脚本（`r49-fid`、`r49-beh`、`r49-ent`、`r49-tree`、`r49-tree2`、`r49-tree3`）的 `## z-errors` 全为 `{"errors":[]}`（0 error、0 pageerror、无 favicon 之外的噪声）。

---

## note（重复项、按设计、脚本注意，不计入 actionable）

1. **归一化改写一族已在本仓库记录为「不保真、改成规范写法」**：`* `/`+ ` 列表 → `- `、`***` → `---`、`_斜体_` → `*斜体*`、`1)` → `1.`、`~~~` 围栏 → ``` ```、`# 标题 #` → `# 标题`、setext `===` → `#`、4 空格缩进代码 → 围栏、`甲行\` 行尾反斜杠换行 → 两空格。依据 `docs/iteration/round-07/findings-bug.md:231`（「setext 标题、缩进代码、`***` 分隔线 → 否 → 改成 `#`、围栏、`---`」）与 README 的「富文本模式会改写引用式链接、表格对齐…」表述。本轮实测这 9 项都**语义等价**、二次保存稳定，不重复报。
2. `&`/`<`/`>` 的逐个实体还原（第 36 轮 P2、第 41 轮 P1）已由 `repairHtml` 修好：`repairHtml('A &amp; B')` 的现有单测与第 41 轮 20 条假 FSA 种子都绿；F1 是**命名实体**这一支的遗漏，不是同一问题复发。
3. **表格单元格里手打 `# `/`> `/`- ` 与粘贴带标题的 Markdown 仍会造块级节点**：第 48 轮 `STATE.md:65` 已列为下一轮第一项（本轮表内 `Ctrl+2` 与工具条入口已被第 48 轮守卫拦住），不重复。
4. **源码模式字数用源码原文口径**（编辑 11 字 / 源码 28 字）在第 44 轮优先项里，未报。
5. **编辑视图看不到 frontmatter**（只在源码框里）属第 47 轮 typora F4 已列，未报。
6. 表格里 `Tab` 会全选目标格内容（第 48 轮复核为 `prosemirror-tables` 的 `TextSelection.between` 语义、与 Excel/Typora 一致），不报。
7. **脚本注意**：`.tmp/e2e-r49-tree.mjs` 的第一版探针用 `aria-label="新建文件"` 找主按钮，但 `FileTree.tsx:389-397` 的主按钮只带 `title`（`aria-label` 在 `▾` 的「新建选项」上），所以那版 `## t1-newfile` 的 `added:[]` 是**探针错**，不是产品缺陷；改用 `.tree-new-main` 后 `r49-tree3.log` 全绿（见路径 5）。
8. 第 48 轮 F1/F2（`Ctrl+Shift+L` 误删行、表格里 `Ctrl+1–6` 造标题）本轮回归守住（路径 10）。

---

## UNVERIFIED（本轮测不了，写清怎么补）

1. **改写后的 `&amp;nbsp;` 在 Typora/Obsidian/GitHub 的实际显示**：本机只有 headless Edge 的 CDP，没有 GUI 版 Typora；`&nbsp;` 与 `&amp;nbsp;` 的渲染差异是按 HTML 实体规则推的。补测：用 Typora 打开改写前后的同一文件对比一行文本。
2. **真实磁盘的同一路径**：本轮全用假 FSA（`.tmp/r30-fsa.mjs`）；真实 FSA/宿主 `/__doc` 写回的字节未测（r48 已记同类 UNVERIFIED）。
3. **1 MB / 100 KB 大文档逐键与载入**：本轮 25 分钟预算内未跑；最近数据仍是第 48 轮 110 KB（`sl-parse-done - sl-load-start = 83 ms`、逐键 p50 19 ms）。
4. **深色主题、200% 缩放、真实 IME**：本轮只测 1024×700 与 1440×900；深色与缩放未跑。
5. **草稿 / 最近文件 / 批注与选区联动**：需要宿主 `/__draft`、`/__recent`、`/__annotations`，浏览器态无 host，本轮未造。补测走 `host-smoke` 或宿主 E2E。
6. **F2 的体验口径**：大纲折叠「该不该持久」没有产品文档规定，本轮按「切回同一篇应记住」判 P2 改进；若产品负责人认为每次重新打开都全展开是有意行为，本条降为 note。

---

## 关键截图

- `shots/round-49/bug-f1-source-before.png` —— 保存前源码框 `甲&nbsp;乙`。
- `shots/round-49/bug-f1-source-after.png` —— 同一次 `Ctrl+S` 之后源码框 `甲&amp;nbsp;乙`。
- `shots/round-49/bug-f1-table-source.png` —— 表格单元格被改成 `a&amp;nbsp;b` 且表格被重排。
- `shots/round-49/bug-b4-outline.png` / `bug-b4-outline-back.png` —— 折叠前 4 条 / 折叠后 2 条 / 切回又 4 条。
- `shots/round-49/bug-t7-main-newfile.png` —— 「＋ 新建」连点三次得到 `未命名 2/3/4.md`，占用名未被覆盖。
