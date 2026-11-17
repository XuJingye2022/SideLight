# 第 39 轮 · 缺陷猎人（端到端，只读）报告

- 轮次：round=39，轮前 `startSha=59a4f933dfd411039c939b1e70d7bbdcd7ed82f8`（`chore: 安装包硬线放宽到 50 MB，循环改为 5 路端到端且不设轮次上限`）；收工时 `git rev-parse HEAD` 仍是 `59a4f93`。
- 环境：dev server `http://localhost:5175`（未另起、未重启）；CDP 9222（未启动 Edge、未 kill msedge）；每段 E2E 前 `node .tmp/reset.mjs 9222`。
- 只读：`git status --porcelain` 只有未跟踪的 `docs/iteration/round-39/` 与 `shots/round-39/`，产品代码 0 改动。
- 本轮新增可执行条目：**2 条（1 条 P1，1 条 P2）**。路径 1/3/4/5/6/7/8 真跑，文件树只跑了「展开 + 打开」（重命名/删除/撤销没跑，见文末 UNVERIFIED）；全程控制台 0 error。

## 结论摘要

1. **第 38 轮的「工作区相对路径图片」只支持同目录与根级 `assets/`**：`../assets/pic.png` 与 `../assets/my%20pic.png` 一律静默破图（`naturalWidth: 0`，`src` 原样留在相对路径上），没有提示、没有占位文案。Typora 默认「笔记放子目录 + 图片放仓库根 `assets/`」正好是这种写法，README 却写「打开文件夹后，相对路径图片在编辑视图与预览面板里正常显示」。
2. **源码模式下查找替换作用在一个已经卸载的编辑器实例上**：查找计数正常（`1 / 2`），点「全部替换」后计数变「无结果」，但源码框、切回富文本后的正文、保存字节都不变，`dirty` 仍 `false`、没有 toast。用户以为替换了，实际被丢弃。

---

## 1（P1，新功能缺口 + 静默失败）`../` 与 `%20` 相对路径图片不显示，且无任何提示

**复现步骤**

1. `node .tmp/reset.mjs 9222`，用 `.tmp/r30-fsa.mjs` 的假工作区种入：`assets/pic.png`（真 PNG，1×1）、`assets/my pic.png`（文件名含空格）、`章节/同.png`、`根.md`、`章节/一.md`。
2. `章节/一.md` 内容（保存后逐字节不变）：

   ```
   # 一

   ![上级](../assets/pic.png)

   ![空格上级](../assets/my pic.png)

   ![编码上级](../assets/my%20pic.png)

   ![同目录](同.png)

   ![带标题](同.png "标题甲")
   ```

3. 「文件 ▾ → 打开文件夹…」→ 展开 `章节` → 点 `一.md`。
4. 观察编辑视图里的五张图。

**证据**

- `.tmp/e2e-r39-bug-b.log` → `## img-root`：`[{"alt":"根图","src":"blob:http://localh","nw":1,"title":""}]`——根级 `assets/pic.png` 正常（第 38 轮的能力在）。
- 同日志 `## tree-after-expand`：`["示例文集/章节","示例文集/章节/一.md",…]`（确认打开的是子目录里的文档）。
- 同日志 `## img-sub`：
  `[{"alt":"上级","src":"../assets/pic.png","nw":0,"title":""},{"alt":"编码上级","src":"../assets/my%20pic","nw":0,"title":""},{"alt":"同目录","src":"blob:http://localh","nw":1,"title":""},{"alt":"带标题","src":"blob:http://localh","nw":1,"title":"标题甲"}]`
  → `../` 两条 `naturalWidth: 0` 且 `src` 停在上游给的相对路径（浏览器按页面 URL 解析成 `http://localhost:5175/assets/pic.png`，404）；同目录 `同.png` 与带 title 的正常。
- 同日志 `## img-doc-bytes`：`"# 一\n\n![上级](../assets/pic.png)\n\n…"`——文件字节没被改写，数据没坏，只是显示不了。
- 截图：`shots/round-39/p4-img-root.png`（根级正常）、`shots/round-39/p4-img-sub.png`（子目录两条破图）。
- 代码：`src/App.tsx:4008-4013`——`const clean = src.startsWith('./') ? src.slice(2) : src`、`const parts = clean.split('/').filter(Boolean)`，然后按段 `getDirectoryHandle(segment)`。`..` 被当成真实目录名（不存在 → `catch` → `return null`），`%20` 不解码（真实文件名是空格）；`assetResolve.ts:109-111` 失败只 `return null`、不写缓存、不通知订阅者，NodeView 就停在原始相对路径上，界面上没有任何破图提示。
- README `:46` 的承诺「打开文件夹后，相对路径图片在编辑视图与预览面板里正常显示，Markdown 里仍是 `assets/…`」，与实测边界不符；`docs/typora-gap.md:37` 同。
- 第 38 轮验收只覆盖同目录与根级（`报告.md → 章节/一.md` 引用的是能在该目录解析成功的路径），`../` 与 URL 编码没进断言。

**期望 vs 实际**

- 期望：`../assets/pic.png` 解析到父目录显示；`%20` 解码后再找文件。失败时至少有可识别提示（alt 文案/破图占位），不要静默显示成空白。
- 实际：最常见的 Typora 目录布局（笔记在 `章节/`，图片在仓库根 `assets/`，Typora 写出 `../assets/`）全部静默破图；含空格的文件名（Typora 编辑路径时写 `%20`）同样破图。

**修复建议**

- `src/App.tsx:4008` 处把路径规范化：先 `decodeURIComponent` 每段（try/catch，`%` 不合法时保留原文），再逐段解析，`..` 弹上一层（不能弹到工作区根之外），`.` 跳过；工作区根外的 `..` 返回 null。
- `assetImage.ts` 的 `bind()` 在解析失败时给 `img` 加 `data-asset-missing` 并设 `alt` fallback（或 `<span>` 占位「图片未找到」），别把原始相对路径留在 `src` 上——浏览器会去 dev server 打 404。
- 补单测（`assetResolve.test.ts` 只测了纯函数）：规范化函数覆盖 `../`、`./`、`%20`、根外 `..`；e2e 补「子目录文档引用 `../assets/x.png` → `naturalWidth: 1`」与「引用 `%20` 路径 → `naturalWidth: 1`」。
- README `:46`、`typora-gap.md:37` 在修好前写明限制：只支持同目录与向下相对路径。

## 2（P2，动作静默丢失）源码模式下「全部替换」改的是隐藏的富文本实例，切回富文本或保存时被丢弃

**复现步骤**

1. 假工作区种入 `甲.md`：`# 甲\n\n甲的正文。\n第二段正文。\n`。
2. 「文件 ▾ → 打开文件夹…」→ 打开 `甲.md`。
3. `Ctrl+/` 进源码模式（`textarea.source-editor` 出现，焦点在源码框）。
4. `Ctrl+F` → 在「查找」输入框打 `正文`：计数 `1 / 2`（说明匹配走的是富文本 doc）。
5. 在「替换为」输入框打 `ZZ` → 点「全部替换」。
6. 观察：计数变「无结果」、「全部替换」按钮变灰；源码框内容不变；`dirty` 仍 `false`、没有 toast。
7. `Ctrl+/` 回富文本：正文仍是「甲的正文。|第二段正文。」，一处都没替换。保存字节也不变。

**证据**

- `.tmp/e2e-r39-bug-e.log`（干净上下文，单次独立复现）：
  - `## typed`：`{"bar":"1 / 2|↑|↓|✕|替换|全部替换","textarea":"# 甲\n\n甲的正文。\n第二段正文。\n","dirty":false}`；
  - `## filled`：同上（替换值 `ZZ`）；
  - `## after-all`：`{"all":"clicked","bar":"无结果|↑|↓|✕|替换|全部替换","textarea":"# 甲\n\n甲的正文。\n第二段正文。\n","dirty":false,"toast":null,"replaceDisabled":true}`；
  - `## back-rich`：`{"domText":"甲|甲的正文。|第二段正文。","dirty":false}`。
- `.tmp/e2e-r39-bug-a.log` 的独立第二次复现：`## p5-find-source`（`count:"1 / 1"`、`matches:0`）→ `## p5-replace-source`（`textarea:"# 甲\n\n甲的正文。\n"`、`dirty:false`、`toast:null`）。
- 截图：`shots/round-39/p5-replace-source.png`（源码框未变、计数已变「无结果」）、`shots/round-39/p5-find-source.png`。
- 代码：匹配来自 `editor.state.doc`（`src/App.tsx:1773-1783`），替换派发到同一个 `editor`（`src/App.tsx:1812-1817`、`1819-1831`）；源码模式只渲染 `textarea`（`src/App.tsx:4856` 起），富文本 Editor 实例还在、但 DOM 不在页面上；`FindBar` 在源码模式仍然照常渲染（`src/App.tsx:4684`）。切回富文本会用 `sourceText` 重新解析（`src/App.tsx:3923`），隐藏实例上的改动自然被丢掉。`renderFind` 装饰的是一个不在页面的 DOM，所以 `matches:0`、看不到高亮。
- 补充（不是缺陷，避免误判）：在富文本模式里，不填「替换为」直接点「替换」会把当前匹配**删掉**——这是「空替换串」的正常语义（`replaceEvery` 走 `transaction.delete`），不是数据丢失 bug。

**期望 vs 实际**

- 期望：源码模式下要么禁用这两个按钮并说明「源码模式不支持替换」，要么对 `sourceText` 做替换并标 dirty、走保存门。
- 实际：按钮可点、计数反馈像已成功，改动被静默丢弃；用户在源码模式里替换后保存，文件一个字节都没变。

**修复建议**

- 最省事：`FindBar` 增加 `disabledReason`，`sourceMode` 时把「替换」「全部替换」置灰并加 `title="源码模式下不支持替换"`；查找本身可保留（它只在富文本 doc 上定位，源码态无高亮，也建议说明）。
- 完整做法：`replaceEvery`/`replaceCurrent` 在 `sourceMode` 时改为改 `sourceText`（`decode`/`encode` 走现有 `splitFrontmatter` 逻辑），替换后 `setSourceText` + 标 dirty，让 `performCommit` 的差异门照常拦。
- 补 e2e：源码态搜到 2 处 → 全部替换 → 断言 textarea 含 `ZZ`、`dirty:true`、保存字节含 `ZZ`；或断言按钮 disabled。

---

## 路径实测结果（本轮真跑，截图在 `shots/round-39/`）

| 路径 | 做了什么 | 结果 | 证据 |
| --- | --- | --- | --- |
| 1 新建 → 加粗/标题/列表/引用/代码块/表格 → 保存 → 关闭 → 重开 | 假工作区「新建文件」→ 打 `## 二级标题`、`**加粗的字**`、`- 列表甲/列表乙`、`> 引用一行`、`1. 有序甲`、管道表 3 行、```` ``` ```` + `const x = 1` → `Ctrl+S` → 读假 FS 字节 → 文件菜单「关闭文档」→ 树里重开 | 通过（保存/重开链路）。落盘 108 B；重开后 `h2/strong/ul/pre` 都在。**已知语义**：`> 引用` 与 `1. 有序` 接在列表项后成为列表续行（第 38 轮已记）；手打管道表仍是普通段落（能力边界）；`>` 在文件里写成 `&gt;`（第 36 轮已记）。 | `.tmp/e2e-r39-bug-a.log` 的 `## p1-typed`/`## p1-saved`/`## p1-reopen-shape`；`shots/round-39/p1-formatted.png`、`p1-reopen.png` |
| 3 键盘 | `Ctrl+1–6/0`（光标所在块的 tag）、`Ctrl+K`、`Ctrl+M`、`Ctrl+P`、`Ctrl+F`→`Esc`→打字、表格 `Tab`/`Ctrl+Enter`、`Tab` 焦点环 | 通过。标题依次 `H1→H6→P`；`Ctrl+K` 出现 `link-editor-input` 且焦点在内；`Ctrl+M` 出现 `math-inline-input`；快速打开 9 个 option、焦点 `quick-open-input`；`Ctrl+F` 焦点 `INPUT.find-input`，`Esc` 后打字落进正文（`…乙的正文。焦点回正文`）；表格点首格后 `Tab` 换格、`Ctrl+Enter` 行数 2→3；焦点环 `solid 2px rgb(43, 109, 100)`。 | `.tmp/e2e-r39-bug-a.log` 的 `## p3-*`；`.tmp/e2e-r39-bug-b.log` 的 `## headings`、`.tmp/e2e-r39-bug-c.log` 的 `## table-keys`；`shots/round-39/p3-focus.png`、`p3-table.png` |
| 4 图片（第 38 轮功能边界） | 根目录 `assets/` 图、子目录文档的同目录图、`../assets/`、`%20`、带 title | **发现第 1 条**：`../` 与 `%20` 破图；其余正常。 | `.tmp/e2e-r39-bug-b.log` 的 `## img-*`；`shots/round-39/p4-img-*.png` |
| 5 源码/预览/字号/设置/主题/窄窗 | `Ctrl+/` 往返；工具栏「预览」→`Esc`；`Ctrl+Alt+=/-/0`；设置里点「深色」；1440×900 与 1024×700 量溢出 | 通过。预览 `contenteditable=false`、`Esc` 后焦点回 `.ProseMirror`；字号 17→18→17；深色 `data-theme="dark"`、`rgb(21, 23, 26)`；两种视口 `scrollWidth===innerWidth`（1440/1440、1024/1024），越界元素 0。 | `.tmp/e2e-r39-bug-a.log` 的 `## p5-*`；`shots/round-39/p5-preview.png`、`p5-dark.png`、`p5-vp1440.png`、`p5-vp1024.png` |
| 5b 源码态查找替换 | 源码模式 `Ctrl+F` 搜 `正文` → 填 `ZZ` → 全部替换 → 回富文本 | **发现第 2 条**：计数 1/2→无结果，正文/源码/字节都不变。 | `.tmp/e2e-r39-bug-e.log`；`shots/round-39/p5-replace-source.png` |
| 6 控制台 0 error + 错误路径 | 全程挂 `console`+`pageerror`；无句柄 `Ctrl+S`（`AbortError`）；6 MiB 文件 | 通过。取消保存 toast「已取消保存。」、`dirty` 仍 true；6 MiB 被拒「「超大.md」超过 5.5 MiB，仍在「大1M.md」」，当前文档不变；三份日志末尾 `## errors []`。 | `.tmp/e2e-r39-bug-a.log`、`-b.log`、`-c.log`、`-e.log` 的 `## errors []`；`shots/round-39/p6-save-cancel.png`、`p6-bigfile.png` |
| 7 大文档 | 100 KB（37 KB 文本 / 900 段）打开、`Ctrl+End`、逐键、`Ctrl+S`；244 KB 文本（7,000 段）打开与滚动 | 通过，记录数字：100 KB 打开 **162 ms**、逐键 **21–29 ms**、保存 **38 ms**；244 KB / 7,000 段打开 **4,202 ms**、滚动到底 **831 ms**。无卡死、无丢字。 | `.tmp/e2e-r39-bug-b.log` 的 `## perf-*`；`shots/round-39/p7-1m.png` |
| 8 选区计数/大纲（部分） | `Ctrl+A` 看状态栏、点「大纲」、看树项 | 通过。状态栏出现「5 字 · 阅读约 1 分钟选区 5 字」；大纲 10 个 treeitem。**字数明细面板没打开**（脚本点到了「打字机」，见 note）。 | `.tmp/e2e-r39-bug-a.log` 的 `## p8-selection`、`## p8-outline`；`shots/round-39/p8-outline.png`、`p8-stats.png` |

## note（重复项、按设计、脚本失效，不计入 actionable）

- **重复（前轮已列，本轮只复核）**：
  - 第 38 轮 `findings-bug.md` 第 1 条（表格列宽 `Ctrl+Z` 撤不到、切视图复位）仍未修，属 STATE 待办②（`colwidth` 导出清理）同一块代码，本轮未再复测。
  - 存盘把 `>` 写成 `&gt;`（`## p1-saved` 的 `- 列表乙&gt; 引用一行`）→ 第 36 轮 `findings-bug.md`。
  - 手打管道表不成表格（`## p1-reopen-shape` 的 `table:false`）→ 能力边界，第 38 轮已记。
  - 第 38 轮已修的「表格分隔行被智能标点改写」本轮复验：`## p1-saved` 里 `| --- | --- |` 原样保留，`emdash:false`，确认修复有效。
- **按设计，不计**：
  - 富文本里不填替换串点「替换」会删掉当前匹配：空替换串的正常语义。
  - `> 引用`/`1. 有序` 接在列表项后成为列表续行：Markdown 语义。
  - 6 MiB 被拒、无句柄取消保存：都是预期错误路径。
- **脚本失效（不是产品缺陷，供下一轮复用）**：
  - `button:has-text("字")` 会先命中「**打字机**」——要点字数明细必须用 `^\d+\s*字` 文本或 `aria-label`；本轮的 `p8-stats*` 截图与 `stats-*` 日志作废。
  - 假 FS 的种子只在 `addInitScript` 时生效：`page.reload()` 会把本轮新建/保存过的文件清回种子。要测「刷新恢复」必须在 reload 前用新种子再调一次 `installFakeWorkspace`，否则树里找不到刚保存的文件。
  - `.file-tree [role="treeitem"][data-path$="/一.md"]` 这类选择器在子目录折叠时匹配不到：先点 `data-path$="/章节"` 展开。
  - 判断标题快键落点不能用 `.ProseMirror > *`（那是首块，文档首个 H1 永远不变）：要按 `window.getSelection().anchorNode` 向上找最近的 `H1–H6/P`。
  - `src/lib/smartTyping.ts:59` 新加的 `lineBefore.includes('|')` 会让「一行里有 `|` 的普通散文」也不再转 `—`（如 `甲 | 乙 -- 丙`）。只影响观感、不改数据，本轮不算 actionable，记录备查。

## UNVERIFIED（本轮测不了 / 没时间跑）

| 项 | 为什么 | 怎么补测 |
| --- | --- | --- |
| 文件树 重命名 / 删除 / 撤销 / 刷新 | 本轮时间用光，只跑了展开与打开 | 复跑第 38 轮 `e2e-r38-bug.mjs` 的 path2 段（选择器用 `button[aria-label="甲.md 的操作"]` 与 `[role="menuitem"]`） |
| 字数明细面板 | 脚本点到了「打字机」 | 用 `^\d+\s*字` 文本找按钮，断言面板内容、焦点进面板、`Esc` 关闭 |
| 样张（frontmatter/公式/脚注/callout/行内 HTML/表格）源码往返 | 本轮只覆盖源码框开关与替换 | 复跑第 38 轮 path4 脚本 |
| 重开恢复 / 草稿 / 批注与选区联动 | 浏览器侧没有批注来源（无 key、宿主才写 `/__annotations`） | 宿主 `host-smoke` 或 `.tmp/append-ann.mjs` 预置批注后复测 |
| 触屏/触控板、真实 IME、150%/200% 缩放 | 本机只有鼠标键盘模拟 | 真机 |
| 宿主 / macOS 下的两项新发现 | CDP 是浏览器 + 假 FSA 句柄 | 宿主里跑同一段图片与替换用例 |
