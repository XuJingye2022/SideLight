# 第 42 轮 · 缺陷猎人（端到端，只读）报告

- 轮次：round=42，nn=42，报告目录 `docs/iteration/round-42`，CDP 端口 9222。
- 轮前 `startSha=5b7a1f5733c04b2c8bbf80987bf1119634541bbd`；收工时 `git rev-parse HEAD` 仍是 `5b7a1f5`（工作树只有本报告目录与 `shots/round-42/`，`.tmp` 被忽略）。
- 环境：dev server `http://localhost:5175`（未另起、未重启、未 kill `msedge`）；CDP 9222 上已开的 headless Edge；每段 E2E 前跑 `node .tmp/reset.mjs 9222`。
- 只读：产品代码 0 改动。本轮新增文件只有 `docs/iteration/round-42/`、`shots/round-42/bug-*.png`、`.tmp/e2e-r42-bug-{a,a2,b,c,d}.mjs` 与同名 `.log`。
- 本轮新增可执行条目：**2 条（1 条 P1、1 条 P2）**。真跑路径 8 条（其中 2 条只跑完一部分，见 UNVERIFIED）。

## 结论摘要

1. **P1**：**预览（只读）模式里查找替换完全可用**。`Ctrl+F` 打开查找条，`替换` 与 `全部替换` 都不是 disabled，点下去直接改正文、`dirty` 变 true，退出预览按 `Ctrl+S` 就写盘。同一功能在源码模式里是**锁住的**（有 `.find-note` 说明 + 两个按钮 disabled），预览模式没有任何提示或限制。
2. **P2**：**块引用后紧跟的裸 HTML 块（中间没有空行）会在「打开 → 保存」后并进引用**。`> 引用行` 下一行 `<p>html 段</p>`，打开后编辑器里这一行变成块引用内的一段**字面标签文字**（`&lt;p&gt;html 段&lt;/p&gt;`），保存后文件变成 `> <p>html 段</p>`。中间隔一个空行则逐字节保真。

---

## 1（P1，只读视图里改正文并落盘）预览模式里「替换 / 全部替换」没有锁

**复现步骤**

1. `node .tmp/reset.mjs 9222`，假工作区种入 `甲.md`：`# 甲\n\n第一句在正文里。第二句也在正文里。\n`。
2. 「文件 ▾ → 打开文件夹…」→ 点 `甲.md`。
3. `Ctrl+Shift+P` 进预览（`.preview-pane` 的 `contenteditable=false`，`window.__slState.viewMode === 'preview'`）。
4. `Ctrl+F` → 查找框填 `正文`，替换框填 `段落`。
5. 点「替换」，再点「全部替换」。
6. `Esc` 退出查找条 → `Ctrl+Shift+P` 回编辑 → `Ctrl+S`。

**证据**（`.tmp/e2e-r42-bug-c.log`，脚本 `.tmp/e2e-r42-bug-c.mjs`）

| 步骤 | 观察 |
| --- | --- |
| `## c0-preview` | `{"mode":"preview","editable":"false","paneEditable":"false"}` —— 两个 pane 都不可编辑 |
| `## c1-findbar` | `{"note":null,"count":"1 / 2","buttons":[Aa:false, ab:false, ↑:false, ↓:false, ✕:false, **替换:false, 全部替换:false**]}` |
| `## c2-replace-one` | `dirty0:false` → `dirty:true`，正文 `第一句在正文里` → `第一句在**段落**里`，`.preview-pane` 同步变 |
| `## c3-replace-all` | 正文 `第二句也在段落里`，`count:"无结果"`，`mode:"preview"`（仍在预览态） |
| `## c4-saved` | 盘上已是 `# 甲\n\n第一句在段落里。第二句也在段落里。\n`，`seedSame:false`，无任何对话框 |
| `## c5-source-locked` | 对照：源码模式 `.find-note` = 「源码模式下不支持查找定位与替换：切回富文本（Ctrl+/）再查」，`替换`/`全部替换` 都是 `disabled:true` |

第二次独立复现（`.tmp/e2e-r42-bug-b.log` 的 `## v1`–`## v3`）：同一路径在 `往返.md` 上做 `全部替换`，`dirty:false → true`，退出预览 `Ctrl+S` 后字节里出现 `改过了`（`hasNew:true`）。

截图：`shots/round-42/bug-c1-preview.png`（进入预览）、`bug-c2-preview-find.png`（查找条在预览里、按钮可用）、`bug-c3-after-replace.png`（替换后预览里的正文已改）。

**根因**

- `src/App.tsx:4720-4724` 的 `unavailableReason` 只判了 `sourceMode`，没有判 `previewMode`：
  ```ts
  unavailableReason={ sourceMode ? '源码模式下不支持查找定位与替换：切回富文本（Ctrl+/）再查' : undefined }
  ```
- `src/App.tsx:3669-3673` 的 `Ctrl+F`/`Ctrl+H` 分支也没有预览守卫，所以预览态照常 `setFindOpen(true)`。
- `replaceCurrent`（`src/App.tsx:1835-1840`）与 `replaceEvery`（`src/App.tsx:1842-1854`）直接对编辑器文档做 `insertText`/`delete`，不管当前视图是否只读。

**期望 vs 实际**

- 期望：预览是只读视图。第 39 轮给源码模式加了「不支持查找替换」的说明与禁用，预览应与之一致；至少不能在没有提示的情况下改正文。Typora 的预览态也不允许替换。
- 实际：预览里替换直接生效，查找条没有任何说明，`dirty` 静默变 true，随后 `Ctrl+S` 落盘。用户以为在只读视图里找词，实际改了要保存的正文。

**修复建议**

- `unavailableReason` 改成 `sourceMode ? … : previewMode ? '预览是只读视图，不支持替换：切回编辑（Ctrl+Shift+P）再替换' : undefined`。若希望预览里只能「找」不能「换」，把 `FindBar` 的替换区单独禁用，而不是整条锁死。
- 顺带确认 `Ctrl+F` 在预览里的定位高亮是否可见：本轮 `count` 有值但 `.ProseMirror` 不在可视区，用户看不到命中位置（同一处再补一条提示更稳）。
- 复测点：`.tmp/e2e-r42-bug-c.mjs`，断言 `## c1` 里 `note` 非空、`替换`/`全部替换` 都 `disabled:true`，且 `## c4` 的 `seedSame:true`。

**成本**：S（一处三元表达式；要「只锁替换」则再改 `FindBar` 两个按钮的 `disabled`）。

## 2（P2，保真缺口）块引用后紧跟的裸 HTML 块被并进引用

**复现步骤**

1. 假工作区种入 `乙.md`：`> 引用行\n<p>html 段</p>\n`（`<p>` 紧跟引用行，**中间没有空行**）。
2. 打开 `乙.md`，看正文。
3. 按一次 `Ctrl+S`，读回假 FS 字节。

**证据**（`.tmp/e2e-r42-bug-c.log` 的 `## c6-乙.md`；解析态见 `.tmp/e2e-r42-bug-d.log` 的 `## q1-html`）

- 打开后富文本 HTML：`<blockquote><p>引用行\n&lt;p&gt;html 段&lt;/p&gt;</p></blockquote>` —— 这一行被并进**引用内的同一段**，而且是**字面标签文本**（`&lt;p&gt;`），用户在编辑器里看到 `<p>html 段</p>` 这几个字符。
- `Ctrl+S` 后字节：`> 引用行\n> <p>html 段</p>\n`（`same:false`，无对话框、无提示）。
- 对照：`丙.md` = `> [!NOTE]\n> 注释行\n\n<p>隔一行 html</p>\n`（隔一个空行）→ `same:true`，逐字节保真。
- 上游对照（node + 本仓库 `marked`）：`marked.parse('> 引用行\n<p>html 段</p>\n')` 得到 `"<blockquote>\n<p>引用行</p>\n</blockquote>\n<p>html 段</p>\n"` —— 裸 HTML 块在**引用之外**。所以并进引用是应用自己的解析链引入的，不是 CommonMark 的读法。

**根因（推断，只读未改代码）**

- `src/App.tsx:1002` 载入时 `manager.parse(escapeHtmlForParse(protectMathPairs(body)))`。`src/lib/html.ts` 的 `escapeHtmlForParse` 把行首 `<p>` 转成 `&lt;p&gt;` → 这一行不再是 HTML 块，变成普通段落行 → CommonMark 的**懒续行**规则把它并进前一行所在的块引用段落 → Tiptap 里就是一个引用段落。
- 保存侧 `repairHtml` 把它还原成 `<p>…</p>`（因为 `original.includes` 命中），但**层级已经变了**，于是写成 `> <p>…</p>`。二次打开稳定（不再继续漂移）。
- 与第 41 轮第 1 条同源：`escapeHtmlForParse` 只管「不会被 Tiptap 吞掉」，没管「转换后会不会改变块结构」。

**期望 vs 实际**

- 期望：裸 HTML 块（type 6）在引用之后应保持顶层；至少不要变成引用里的字面标签文字。
- 实际：结构漂移一次（顶层块 → 引用子节点），编辑器里显示字面标签，保存后文件多一行 `> ` 前缀。内容不丢，但渲染与结构都变了。

**修复建议**：`escapeHtmlForParse` 对「行首、整行就是一个块级标签」的情况不要转义（或用占位符保护后由 `restore` 原样放回顶层）；`html.test.ts` 加两条：`> 引用\n<p>x</p>` 与 `> [!NOTE]` 后跟裸 HTML。

**成本**：S–M。

---

## 路径实测结果（本轮真跑，截图在 `shots/round-42/`）

| 路径 | 做了什么 | 结果 | 证据 |
| --- | --- | --- | --- |
| 1 新建 → 输入 → 排版 → 保存 → 刷新恢复 | 树头「＋ 新建」→ `标题一` → `Ctrl+2` → 加粗 → 列表两项 → `Ctrl+S` → 重装假工作区（种子换成盘上字节）→ reload → 重开文件夹 → 打开 | 通过。`已新建 未命名.md`；字节 `## 标题一\n\n**加粗的词**\n\n- 列表项一列表项二\n- &gt; 一段引用\n\n`；reload 后富文本 HTML 与保存前一致，标题 `未命名.md — Sidelight`，大纲面板有「标题一」 | `.tmp/e2e-r42-bug-a.log` 的 `## a0`–`## a5` |
| 2 文件树 | 新建（落盘）、写字保存、右键重命名 `改名.md`（标题随动）、删除到回收站、点 toast「撤销」恢复 | 通过。回收站路径 `.sidelight/trash/20261117-145415-3f6s5b-改名.md`；`撤销` 后 `甲.md` 字节回到 `# 甲\n\n甲的正文。\n` | `.tmp/e2e-r42-bug-a.log` 的 `## a2`–`## a9`；`.tmp/e2e-r42-bug-a2.log` 的 `## p4`–`## p5`；`shots/round-42/bug-a-tree.png` |
| 3 键盘 | `Ctrl+1–6/0`、`Ctrl+K`、`Ctrl+M`、`Ctrl+P`、`Ctrl+F`→`Esc` 后打字、焦点环 | 通过。块标签 `["H1","H2","H3","H4","H5","H6","P"]`；链接框 `link-editor-input`（文字/地址/普通链接用 Enter 保存）；公式框 `math-inline-input`（占位「输入 LaTeX，例如 x^2」）；快速打开 3 个 `role=option`；`Esc` 后焦点回 `.ProseMirror` 且 `Z` 落进正文 | `.tmp/e2e-r42-bug-a.log` 的 `## b1`–`## b7`、`.tmp/e2e-r42-bug-a2.log` 的 `## p3` |
| 4 样张往返 | 一份含 frontmatter、脚注定义、`$x^2$`、行内 `<kbd>`、callout、裸 HTML 段、mermaid 围栏、表格的 `往返.md`：打开 → `Ctrl+S` → 逐字节比对 | 12/13 行保真；唯一差异是裸 HTML 段 → **第 2 条**。表格 1 个、mermaid 围栏原文 `graph TD; A-->B;` 不变、`$x^2$` 原样 | `.tmp/e2e-r42-bug-b.log` 的 `## r0`–`## r2`、`## c6-*` |
| 5 源码 / 预览 / 字号与主题 / 窄窗 | `Ctrl+/` 源码（`.source-editor` 有值、替换锁住）、`Ctrl+Shift+P` 预览（`doc-layout preview-layout`、`.preview-pane` 有值）、深色与 1024×700 未跑完（见 UNVERIFIED） | 部分通过 + **发现第 1 条** | `.tmp/e2e-r42-bug-b.log` 的 `## v1`、`## s1`；`.tmp/e2e-r42-bug-c.log` 的 `## c0`–`## c5` |
| 6 控制台与错误路径 | 全程挂 `console`/`pageerror`/`requestfailed`（4 份脚本）；含表格、源码、预览、大文件、删除撤销 | 通过。`## z-errors` 全部 `{"errors":[],"failed":[]}` | 各 `.log` 末行 |
| 7 大文档 100 KB | `大100.md`（900 段）打开、`Ctrl+End`、连打 4 个字、`Ctrl+S` | 通过。打开 **143 ms**、逐键 **25/20/22/22 ms**、保存窗口 2.5 s 内 `已保存`、字节 29,595 B。1 MB 未跑 | `.tmp/e2e-r42-bug-b.log` 的 `## b1`–`## b3` |
| 8 选区、字数、重开 | `Ctrl+A` 看状态栏与字数面板 | 通过 + 旧账复核：`选区 7 字`；面板「句 2」对「选区 7 字 / 9 字符 / 3 句」= 第 41 轮第 4 条，仍在 | `.tmp/e2e-r42-bug-b.log` 的 `## w1`–`## w2` |

## note（旧账、按设计、脚本注意，不计入 actionable）

- **旧账复核（前轮已列，本轮再次复现，不重复计）**：
  - 字数明细「句」全文值与选区值不一致（第 41 轮第 4 条）：本轮 `## w2` 再次出现（全文 2 句 / 选区 3 句）。
  - 重命名后提示「已刷新：新增 1 个，消失 1 个」（第 29 轮 findings-bug 第 2 条）：本轮 `## a6` 再次出现。
  - 多行/含 `&` 的 HTML 注释仍写成实体（第 41 轮第 3 条）：本轮未重跑，不重复计。
- **按设计**：列表项里打 `> 一段引用` 保持字面 `- &gt; 一段引用`（第 41 轮块首 `&gt;` 守卫）；首启空白 `未命名.md`；「新建」只换内存文档，`Ctrl+S` 才落盘。
- **脚本注意（下一轮复用）**：
  - 快速打开的行数不能拿 `[role="option"], .quick-open li` 求并集：每个 `<li>` 里包一个 `button[role=option]`，会数出双倍（本轮先误判「每个文件重复两次」，`## p3-quickopen-dom` 用 `li` 单口径复核为 3 条、无重复）。
  - 删除确认框的按钮文案是「移到回收站」，不是「删除」；「撤销」是 toast 里的按钮，`Ctrl+Z` 在树焦点下不会恢复已删除文件（本轮 `a9` 因此是空操作，不是产品缺陷；`p5` 点 toast 按钮成功）。
  - 表格文件能正常打开（`## p1-table-html`：`tables:1`、`td:2`、`col style="min-width: 25px;"`）；`## b8` 超时是前一步 `Ctrl+Z` 后树焦点导致的脚本状态问题，不是产品缺陷。

## UNVERIFIED

| 项 | 为什么 | 怎么补测 |
| --- | --- | --- |
| 表格 `Tab` 与 `Ctrl+Enter`（路径 3 的第二段） | 脚本 A 在 `## b8` 因上面那条脚本状态问题超时中止，未重跑 | 单独写 `.tmp/e2e-r42-table.mjs`：点 `td` → `Tab` → 打字 → `Ctrl+Enter`，断言行数 +1 与字节 |
| 深色主题、字号、1024×700 窄窗（路径 5 的后半段） | 脚本 A 在 `## b8` 超时，没走到 `## c5`/`## c6` | 沿用第 41 轮 `## e14`–`## e16` 的断言重跑 |
| 1 MB 载入与逐键 | 第 39 轮 dev 两遍实测约 220 s，本轮 25 分钟预算内跑不完 | 单独排一次，按第 39 轮的 5 个 `performance.mark` 口径取最后一条 |
| 预览态替换在真实宿主（`/__doc`）下的落盘 | 浏览器态没有 `/__doc`，走的是假 FSA 分支 | 宿主 `host-smoke` 加一条：预览里 `Ctrl+F` + 全部替换 → 读 `/__doc` 是否已变 |
| 第 2 条的改前对照（是否第 41 轮之前就有） | 只读角色没有回滚构建；第 41 轮改的是「代码里的 `<` 不转义」，块级 HTML 的转义两轮都在 | 用 `.tmp/build-r41` 之类的旧构建复跑 `.tmp/e2e-r42-bug-c.mjs` 的 `## c6` |
| 真实盘 / 网络盘 / 中文长路径下的两条 | 本机只有假 FSA 句柄 | 宿主 `host-smoke` 或真人真盘 |
| 重开恢复 / 最近文件 / 草稿 / 批注与选区联动 | 假句柄有方法但写不进 IndexedDB（第 40 轮同结论）；浏览器态没有 `/__annotations`、`/__draft` | `scripts/session-acceptance.mjs` + `host-smoke` |
