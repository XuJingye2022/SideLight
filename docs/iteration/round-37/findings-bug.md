# 第 37 轮 · 缺陷猎人（端到端，只读）报告

- 轮次：round=37，轮前 `startSha=ee5c1f7e637a5da0f79b811ff4c31c94eba3fc76`（`docs: round-36 看板记录提交哈希`）
- 环境：dev server `http://localhost:5175`（未另起/未重启，`/src/main.tsx` 200）；CDP 9222（未启动 Edge、未 kill msedge）；每段 E2E 前 `node .tmp/reset.mjs 9222`
- 只读：`git status --porcelain` 只有未跟踪的 `docs/iteration/round-37/` 与 `shots/round-37/`，产品代码 0 改动
- 本报告新增可执行条目：**2 条（均 P2）**。六条主路径本轮全部真跑，未发现新的 P0/P1（详见路径表）；两条新缺陷来自第 36 轮新功能 Mermaid 的边界探测。

## 结论摘要

1. 第 36 轮交付的 Mermaid 惰性渲染在**顶层代码块**下工作正常：首渲染、改代码重渲染、`Ctrl+Z` 撤销回原图、`Ctrl+Shift+Z` 重做、复制不进剪贴板、`--` 不被智能标点改写、只在文档末尾/开头也渲染。证据见 note 的「实测非缺陷」。
2. 新缺陷都在**嵌套围栏**与**相同代码的缓存复用**上，各 1 条，均 P2（无数据丢失，属功能静默缺失/实现与 ADR 不符）。

---

## 1（P2，功能静默缺失）列表项或引用块里的 ```mermaid 围栏永不渲染，且没有任何提示

**复现步骤**

1. 工作区里放一篇 `列表图.md`，内容：`# 列表图` / 空行 / `- 一项` / 空行 / 两个空格缩进的 mermaid 围栏（`  ```` ```mermaid ```` / `  graph TD` / `    M --> N` / `  ```` ``` ````） / 空行 / `尾段。`。
2. 打开该文档，等 2 s。
3. 观察：代码块本身正常显示、可以编辑，但**没有** `.mermaid-preview` 预览。
4. 换一篇把围栏放进引用块（`> ```` ```mermaid ```` / `> graph TD` / `>   Q --> R` / `> ```` ``` ````），结果相同。

**证据**

- `.tmp/e2e-r37-bug-mermaid2.log` 的 `## M4-list`：`{"docName":"列表图.md","codes":["graph TD\n  M --> N"],"previewCount":0,"liCode":1,"topCode":1}`；`## M4-verdict {"previewCount":0,"liCode":1}`
- `.tmp/e2e-r37-bug-mermaid.log` 的 `## m-quote`：`{"previewCount":0,"codes":["graph TD\n  Q --> R"],"blockquotePreview":0}`；同一段 `## m-quote-verdict` 给出 DOM：`<blockquote><pre><code class="language-mermaid">graph TD Q --&gt; R</code></pre></blockquote>`——节点是 mermaid 语言代码块，只是没有被插件看到
- 截图：`shots/round-37/m4-list.png`、`shots/round-37/m5-quote.png`（图区只有代码块，无预览）
- 代码：`src/lib/mermaidLazy.ts:109-117` 的 `listMermaidBlocks` 只做 `doc.forEach`（仅顶层子节点）；`src/lib/mermaidPreview.ts:82-97` 的 `build()` 只从它取块

**期望 vs 实际**

- 期望：`> ```mermaid` 或列表项里的围栏也渲染预览；做不到时给一句提示（README/ADR 记已知限制）。
- 实际：静默不渲染。用户看不出「围栏没被识别」和「图坏了」的区别；ADR-0017 的「已知限制」清单（`docs/adr/0017-mermaid-lazy-loading.md:106-111`）也没写这一条。

**修复建议**

- 改 `listMermaidBlocks` 用 `doc.descendants((node, pos) => …)` 收集任意深度的 `codeBlock`，`pos` 直接用回调位置（widget 位置仍是 `pos + nodeSize`）；需补一条单测「嵌套围栏也能出预览」。
- 若决定只支持顶层：在 `mermaidPreview.ts` 里给嵌套围栏挂一条一次性提示（或 `.is-mermaid` 之外的弱标记），并同步 `docs/adr/0017-mermaid-lazy-loading.md` 的已知限制与 README。

## 2（P2，实现与 ADR 不符）同一文档两段相同 mermaid 代码共用同一份 SVG 字符串，DOM 里 id 重复

**复现步骤**

1. 打开一篇含两段**完全相同** mermaid 代码的文档（`双图.md`：两个 `graph TD` / `A --> B`）。
2. 等渲染完成，数 `.mermaid-preview svg` 与 svg 内的 `[id]`。

**证据**

- `.tmp/e2e-r37-bug-mermaid.log` 的 `## m-dup`：两个 widget 的 `htmlLen` 都是 8267，`hash` 都是 `dw9r6c`——同一份字符串
- 同一份日志 `## m-dup-verdict`：`{"previewCount":2,"svgs":2,"totalIds":18,"dupIds":["mermaid-preview-1_flowchart-v2-pointEnd x2","mermaid-preview-1_flowchart-v2-pointStart x2","L_A_B_0 x2","flowchart-A-0 x2", …]}`——18 个 id 里 8 类重复
- 截图：`shots/round-37/m4-dup.png`
- 代码：`src/lib/mermaidPreview.ts:16` 的 `svgCache = new Map<string,string>()`、`:23-46` 的 `applyContent`/`refreshLivePreviews`、`:72-80` 的 `makePreview`——缓存键只有代码 hash，两个 widget 取到同一份 SVG 字符串
- 与文档冲突：`docs/adr/0017-mermaid-lazy-loading.md:110` 写「同一文档里两段相同代码**各渲染一次**（不做跨块共享，避免共用 DOM 节点错位）」

**期望 vs 实际**

- 期望（按 ADR）：每块独立渲染，SVG 里的 id（`mermaid-preview-N` 前缀、`flowchart-A-0` 等）各块唯一。
- 实际：第二块复用第一块的 SVG 字符串，两棵子树带**同一批 id**（HTML 不合法；`url(#id)` 会解析到先出现的那一份）。本轮未观察到可见错位（两张图都出 svg、都是 `is-ready`），所以按 P2 记；但一旦某块被编辑后重新渲染、另一块仍指向旧 id 时，无法保证箭头 marker 引用仍正确。

**修复建议**

- `svgCache` 的键从 `hash` 改为 `${pos}:${hash}` 或 `hash + renderSeq`，或在插入前把 SVG 中 `mermaid-preview-N` 前缀统一替换成每实例唯一前缀（如 `mm-${hash}-${pos}`），保证 id 唯一。
- 同步修改 `docs/adr/0017-mermaid-lazy-loading.md:110`：要么承认做了跨块共享（并说明 id 处理），要么按上面改实现；另补一条 e2e：「两个相同围栏 → 两棵 SVG 的 id 交集为空」。

---

## 六条路径实测结果（本轮全部真跑）

| 路径 | 做了什么 | 结果 | 证据 |
| --- | --- | --- | --- |
| 1 空文档 → 加粗/标题/列表 → 保存 → 刷新恢复 | 「新建文件」→ 打 `## 二级标题`、`**加粗的字**`、`- 列表甲/列表乙`、`> 引用一行`、`1. 有序甲` → `Ctrl+S` → 读假 FS 字节 → 刷新后重新打开 | 通过。`h2/strong/ul/li` 生成；落盘 `## 二级标题\n\n**加粗的字**\n\n- 列表甲\n- 列表乙\n- &gt; 引用一行\n- 1. 有序甲\n- \n\n`；刷新恢复后结构与文档名 `未命名.md` 都在。（`> 引用`/`1. 有序` 接在列表项后成为列表续行，是 Markdown 语义，不是缺陷。） | `shots/round-37/p1-formatted.png`、`p1-reload.png`；`.tmp/e2e-r37-bug-paths.log` 的 `## path1-*` |
| 2 文件树 展开/新建/重命名/删除/撤销/刷新 | 展开 `sub`（treeitem 7→8）→ 开 `sub/子目录.md` → 新建并保存 `未命名 2.md` → 选中 `乙.md` 点行内「⋯」→ 重命名 `乙改名.md` → 行内「⋯」→「删除（移到回收站）」→ 确认框「移到回收站」→ toast「撤销」→ 树头「刷新文件树」 | 通过。重命名后文档名、树、假盘字节同步（`# 乙\n\n乙的正文。\n`）；删除后当前文档切到 `甲.md`、树里消失、toast 有「撤销」；撤销恢复树项与原字节；刷新把树外新增的 `新加.md` 带进来（toast「已刷新：新增 1 个，消失 0 个」）。 | `shots/round-37/t1-tree.png`；`.tmp/e2e-r37-bug-tree2.log` 的 `## rename-verdict`、`## delete-verdict`、`## refresh-verdict` |
| 3 键盘 | `Ctrl+1–6/0`、`Ctrl+K`、`Ctrl+M`、`Ctrl+P`、`Ctrl+F`→`Esc`→打字、表格 `Tab`/`Ctrl+Enter`、键盘 Tab 后焦点环 | 通过。标题依次 `H1…H6/P`；`Ctrl+K` 出 2 个输入框、焦点 `link-editor-input`；`Ctrl+M` 出 `math-inline-input`；快速打开 1 个浮层、3 个 option（与 3 个文件一一对应，无重复）；`Ctrl+F→Esc→打字` 落进正文；表格 `Ctrl+Enter` 行数 3→4；焦点环 `outline: solid 2px rgb(43, 109, 100)`。 | `shots/round-37/p3-focus.png`、`q1-quickopen.png`；`.tmp/e2e-r37-bug-paths.log` 的 `## path3-*`、`.tmp/e2e-r37-bug-final.log` 的 `## Q1-verdict` |
| 4 公式/表格/脚注/frontmatter/行内 HTML/callout → 源码 → 保存往返 | 184 B 样张（frontmatter + `$…$` + `<kbd>` + 脚注 + `> [!NOTE]` + 表格 + `$$`）→ `Ctrl+/` 源码逐字节比 → 追加一行 `Ctrl+S` → 回富文本再 `Ctrl+S` | 源码与磁盘 `equalToDisk:true`（184/184）；源码追加后落盘 192 B、追加内容在；回富文本 `Ctrl+S` 弹「脚注定义在保存后会消失」确认框（第 34 轮设计），点「仍然保存」后脚注定义被内联成 `[^1](脚注正文。)`（见 note，属已有行为不是本轮新缺陷）。富文本里 `<kbd>`、`[!NOTE]`、`[^1]` 都按字面文本显示（`kbd:0/sup:0/callout:0/blockquote:1`），保存后原写法仍在。 | `shots/round-37/p4-rich.png`、`p4-source.png`、`p4-dom.png`；`.tmp/e2e-r37-bug-fidelity.log`、`.tmp/e2e-r37-bug-dom.log` 的 `## dom` |
| 5 源码/预览/专注/打字机/设置/字号/主题/窄窗 | `Ctrl+/` 源码再切回；工具栏「预览」再 `Esc`；「专注」「打字机」；`Ctrl+Alt+=/-/0`；设置里点「深色」并保存；1440×900 与 1024×700 量溢出 | 通过。源码焦点在 `TEXTAREA.source-editor`，切回焦点回正文；预览 `contenteditable=false`、`Esc` 回正文；`focus-mode` 类可加可去；字号 17→18→17→17；深色保存后 `data-theme="dark"`、`rgb(21,23,26)`，刷新仍 `dark`；两种视口 `scrollWidth===innerWidth`（1440/1440、1024/1024），越界元素 0。 | `shots/round-37/p5-settings.png`、`p5-dark.png`、`p5-1024.png`、`p5-1440.png`；`.tmp/e2e-r37-bug-paths.log` 的 `## path5-*` |
| 6 控制台 0 error / 错误路径 | 9 次运行，其中 8 次全程挂 `console`+`pageerror`（DOM 探针只 dump 结构，未挂）；无工作区时 `Ctrl+S`（picker 抛 `AbortError`）；打开 6 MB `超大.md` | 通过。8 个日志末尾都是 `## errors []`；取消保存出「保存失败：用户取消。改动还在，可以再试一次。」且脏字仍在；6 MB 文件被拒：「「超大.md」超过 5.5 MiB，仍在「甲.md」」，当前文档不变。 | 各日志末尾 `## errors []`；`.tmp/e2e-r37-bug-paths.log` 的 `## path6-cancel-verdict`、`## path6-bigfile-verdict` |

额外探测（第 36 轮新功能，不在六条主路径内）：

| 探测 | 结果 | 证据 |
| --- | --- | --- |
| mermaid 改代码后重渲染 / 撤销 / 重做 | 通过：改代码后预览 SVG 长度 8283→9615（新 id `mermaid-preview-17`），`Ctrl+Z` 回 8283（原 id），`Ctrl+Shift+Z` 回 9615 | `.tmp/e2e-r37-bug-codeedit2.log` 的 `## C-verdict`、`## C-undo-verdict`、`## C-redo-verdict`；`shots/round-37/m7-code-edit.png`、`m8-after-undo.png` |
| 代码块内打 `-->` | 通过：代码内 `-->` 原样保留，智能标点没有转成 `—`（与设置文案「代码块内不转换」一致） | `.tmp/e2e-r37-bug-codeedit2.log` 的 `## C-verdict {"keptArrow":true,"convertedDash":false}`；`shots/round-37/q2-codeblock-smart.png` |
| 全选复制 | 通过：剪贴板纯文本/HTML 不含 `mermaid-preview` 或「图表渲染中…」 | `.tmp/e2e-r37-bug-mermaid2.log` 的 `## M2-copy` |
| 图的文档位置边界（整篇只有图 / 图在首块 / 图在末块） | 通过：三种都是 1 个预览、`is-ready`、有 svg（174×85） | `.tmp/e2e-r37-bug-positions.log` 的 `## pos-*`；`shots/round-37/m9-pos-*.png` |
| 两段相同代码 | 见第 2 条 | `## m-dup` / `## m-dup-verdict` |
| 列表项/引用块里的围栏 | 见第 1 条 | `## M4-list` / `## m-quote` |

## note（重复项、按设计、脚本失效，不计入 actionable）

- **重复（前轮已列，本轮只复核）**：① 重命名成功后提示「已刷新：新增 1 个，消失 1 个」（第 29 轮 findings-bug 第 2 条）；② 删除确认框写「要恢复，用文件管理器把 trash 里的文件移回原位」，而紧随的 toast 就有「撤销」（第 33 轮 findings-bug 第 2 条）。两条本轮再次复现。
- **已知/按设计，不计**：
  - 富文本里 `<kbd>`、`[!NOTE]`、`[^1]` 按字面文本显示（`## dom`：`<p>Inline HTML &lt;kbd&gt;Ctrl&lt;/kbd&gt; and note[^1].</p>`、`<blockquote><p>[!NOTE] Callout body.</p></blockquote>`）。README 只承诺「保真」，不承诺富文本渲染；保存后写法仍在。
  - 回富文本后 `Ctrl+S` 弹「脚注定义在保存后会消失」并允许「仍然保存」，保存后定义内联为 `[^1](脚注正文。)`。这是第 34 轮刻意加的拦截（有确认框、不静默），不是本轮新缺陷。
  - 切主题不重绘 Mermaid（`docs/adr/0017-mermaid-lazy-loading.md:109` 已列）。
  - HTML 导出/预览面板不含图（同 ADR 第 108 行）。
  - 重命名后 toast「已刷新：新增 1 个，消失 1 个」与删除提示里的「用文件管理器恢复」是上表两条旧账。
- **源码框 caret 在 0（STATE「下一轮优先 ①」）**：本轮没有复测，**不当作新条目**。要复测：`Ctrl+/` 后不点击直接打字，看是否插到文首（第 36 轮验收观察项）。
- **本轮脚本失效（不是产品缺陷，供下一轮复用）**：
  - `data-path` 带工作区名前缀：实际值是 `示例文集/甲.md`，不是 `甲.md`；`[data-path$="图.md"]` 会同时匹配 `图.md`/`双图.md`/`引用图.md`，要用 `[data-path$="/图.md"]`。这导致第一版脚本打开了错误的文档（`.tmp/e2e-r37-bug-mermaid.log` 的 `## m-render` 里 `docName` 是 `列表图.md`）。
  - `.tree-row-more` 是 treeitem 的**兄弟**（`src/components/FileTree.tsx:296-339`），段落选择器要写 `.tree-row:has([data-path$="/乙.md"]) .tree-row-more`；沿用第 36 轮路径脚本里的 `${rowSel} .tree-row-more` 会超时（`.tmp/e2e-r37-bug-paths.log` 的 `## SECTION-FAIL path2-tree`）。
  - 在 mermaid 代码块里定位光标不要用 `Ctrl+End`（会跳到文末），点 `pre code` 后按 `End`/`Enter` 即可（`.tmp/e2e-r37-bug-codeedit2.log` 已验证光标在 `pre` 内）。
  - `Ctrl+P` 列表最初看着像重复，是选择器把 `[role="option"]` 与 `.quick-open-list li` 两次抓取的结果；实测 1 个浮层、3 个 option（`## Q1-verdict`），不是缺陷。
  - 用 PowerShell `Get-Content | Set-Content` 改含中文的 `.tmp/*.mjs` 会把中文写坏（本轮踩了一次，已用 write 重写）；见 AGENTS §8。
- **M3 方向键跨图证据不可用**：点击段落后连按 `ArrowDown`，`anchorNode` 文本依次是 `图`→`第一段。`，与预期（进入代码块/下一段）不符，但该段前有 `Ctrl+A` 复制与选区残留，无法排除脚本干扰，记为 UNVERIFIED，不据此判缺陷。

## UNVERIFIED（本轮测不了）

| 项 | 为什么 | 怎么补测 |
| --- | --- | --- |
| 方向键上下跨过 Mermaid 预览的行为 | 本轮 M3 段证据被前面选区污染（见 note） | 干净页面里：点「第一段。」末尾 → `ArrowDown`×3，每步 dump `selection.anchorNode` 的父块，确认不跳回标题、不跳过段落 |
| 两段相同代码时箭头 marker 的实际可见性 | 只数了重复 id，没有逐张图比 `url(#…)` 解析结果 | 截图两张图并用 `getComputedStyle`/DOM 检查 `marker` 引用，或在改一块后再看另一块箭头 |
| 真实模型下的分析/批注与 Mermaid 混排 | 无 API Key，只用本地模拟 | 配真 Key 分析含图文档一次 |
| 宿主（WebView2）里的 Mermaid 与围栏编辑 | CDP 9222 是浏览器，不是宿主 | `host-smoke` 式真宿主跑一遍（mermaid chunk 在 file:// / 127.0.0.1 下的加载路径） |
| 150%/200% 缩放、1024 以下窄窗 | 只测 1024×700 与 1440×900 | 设缩放后量溢出与抽屉遮罩 |
| 列表/引用内围栏在 Typora 的实际表现 | 只测了 Sidelight | 用 `.tmp/typora-ref` / 真实 Typora 打开同一篇对比，决定是「补实现」还是「记限制」 |
