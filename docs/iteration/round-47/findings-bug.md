# 第 47 轮 · 缺陷猎人报告（finder-bug）

- 轮次：round 47　　轮前 startSha：`d429211164a6a94dfbcf6a580a857d9beb5371c6`（实测 `git rev-parse HEAD` 同值，`git status --porcelain` 空）
- 环境：dev server `http://localhost:5175` 已在跑（未启动、未重启）；CDP 9222（未启动 Edge、未 kill msedge）；每套脚本前 `node .tmp/reset.mjs 9222`。假 FSA 工作区用 `.tmp/r30-fsa.mjs`。只读产品代码，未改一行。
- 结论：**1 条本轮新发现可执行（P1）**；8 条路径全部真跑；5 套脚本 `CONSOLE_ERRORS` 全空（`errors: []`）。
- 截图：`shots/round-47/` 里本角色生成的 13 张（关键 3 张在文末引用）。

---

## F1（P1）源码模式改字后保存，切回编辑视图被误判成「脏」：出现脏点、切文档弹「切换文档」、Ctrl+S 变成一次无意义的重复写盘

**复现步骤**（脚本 `.tmp/e2e-r47-bug-d.mjs` 的 `## d1-source-dirty`，日志 `.tmp/r47-d.log`；后果见 `.tmp/e2e-r47-bug-e.mjs` 的 `## e1-dirty-consequence`，`.tmp/r47-e.log`）

1. 打开假工作区，点 `甲.md`（种子 `# 甲\n\n甲的第一段。\n`），点正文。
2. `Ctrl+/` 进源码模式；点源码框，`Ctrl+End`，打「加一句。」（**不按 Enter**，文本这时不以换行结尾）。
3. `Ctrl+S`。读状态：`{"mode":"source","dirty":false,"toast":"已保存 甲.md"}`，假盘字节 `"# 甲\n\n甲的第一段。\n加一句。\n"`（多出的尾换行是 `prepareSave` 补的）。
4. `Ctrl+/` 回编辑视图。**`dirty` 变成 `true`**，文档没再改一个字。
5. 这一步最直观：点树里的 `乙.md`，弹出「切换文档」三选一（`{"label":"切换文档","text":"这篇还有没保存的改动|切到「乙.md」之前，要先把当前这篇存下来吗？","buttons":["取消","不保存","保存并切换"]}`，截图 `shots/round-47/bug-e-switch-guard.png`）。按「取消」后文档保持 `dirty:true`。
6. 回编辑视图直接再按一次 `Ctrl+S`：写盘字节与第 3 步**完全相同**（`changedOnSecondSave:false`），脏才消失——证明这次「脏」没有任何内容变化，只是一次假警报加一次空写盘。

**正向对照（同一脚本族，`.tmp/e2e-r47-bug-g.mjs`）**：第 2 步打完字后**按一次 Enter**（源码文本以换行结尾）再保存，回编辑 `{"mode":"edit","dirty":false}`。同一操作序列，只差结尾那一个换行，脏标记结果相反。另对照「进源码→不出字→回编辑」也是 `dirty:false`（`ctlSrc`/`ctlBack`），说明缺陷只在「源码里编辑并保存过」这一支出现。

**期望 vs 实际**
- 期望：保存成功后，只要正文与刚写入的字节相同，切回哪个视图都不应算脏；切文档不该拦，`Ctrl+S` 不该再写一次。
- 实际：保存后回编辑视图立刻显示未保存标记；切文件/关窗会走「切换文档」或未保存拦截；再保存一次写回相同字节后脏才消失。

**根因**（`src/App.tsx`）
- 保存收尾把**补齐过结尾换行**的文本写进基线：`src/App.tsx:2848-2853` 的 `prepareSave()` 在 `originalText.endsWith('\n')` 且当前文本不以换行结尾时执行 `normalized += '\n'`；`src/App.tsx:2627` 的 `baselineRef.current = normalized` 落的就是这个加了换行的值；假盘上也能看到 `加一句。\n`。
- 离开源码时的脏判定**没有做同一套归一化**：`src/App.tsx:3911` 只做 `sourceText.replace(/\r\n/g, '\n')`，`src/App.tsx:3932` 用 `setDirty(normalizedSource !== baselineRef.current)` 直接比字符串。源码框里的文本（光标停在末尾、没有尾换行）比基线少那一个 `\n`，于是恒判脏。
- 第 45 轮 F1 修了「恢复态一切源码就脏」的那一支（同一条 `applySource`），但没做第 45 轮建议里的「容忍/补齐结尾换行」，所以这一支（源码里编辑并保存后回编辑）仍然活着。

**修复建议**
1. 在 `applySource()` 里用与保存相同的归一化再比：把 `normalizedSource` 也过一遍「原文以换行结尾则补齐换行」的规则（可以抽一个 `normalizeForBaseline(text, originalText)` 纯函数，`prepareSave` 与 `applySource` 共用），或直接与 `baselineRef.current` 比 CRLF 归一化后的值。
2. 加纯函数单测：`originalText="# a\n"`、当前源码 `"# a\n\nb"` → 归一化后应等于 `"# a\n\nb\n"`，判不脏；当前源码真的多一个字 → 判脏。
3. E2E 断言抄 `.tmp/e2e-r47-bug-d.mjs` 的 d1 段：保存后 `backToEdit.dirty === false`；再补一条「切另一篇不弹切换框」。

**影响面**：只影响源码模式编辑并保存后的脏状态，不丢数据（第 6 步证明字节不变）；但每次「源码里改 → 保存 → 回编辑」都会出现假脏点，并可能拦住切文档/关窗。真实路径 4/1 都会经过它。

---

## 其余发现（与前轮重复，不算本轮 actionable，写进 note）

1. **工作区新建文件首次 `Ctrl+S` 落盘结尾没有换行（`endsNl:false`，`newBytes:"新建正文"`）**——第 46 轮 `findings-bug.md` F1 的原样复现（`.tmp/r47-b.log` 的 `## b7-newfile`；同一会话里打开已有文件再保存则是 `"# 甲\n\n...改名后一句。\n"`）。本轮仍未修，不重复计数，但它与 F1 是同一族「保存基线尾换行不一」问题，建议一起修。
2. **重命名成功后弹「已刷新：新增 1 个，消失 1 个」**（`.tmp/r47-b.log` 的 `## b4-rename`：`toast:"已刷新：新增 1 个，消失 1 个"`）——第 29 轮 findings-bug 第 2 条，第 30–34 轮均复现，不重复计数。
3. **行内 HTML 只保真不渲染**：`<kbd>Ctrl</kbd>` 在正文里是字面文本（`## c1-fidelity` 的 `kbd:0`、`kbdLiteralText:true`，`.tmp/r47-c.log`）——`docs/typora-gap.md` 与第 22 轮 findings-typora 已列，不重复计数。

---

## 8 条路径的覆盖与判定

| # | 路径 | 结论 | 证据 |
| --- | --- | --- | --- |
| 1 | 空文档输入 → 加粗/标题/列表/引用/代码块 → 保存（picker stub）→ 刷新恢复 | 通过（落盘尾换行见 note 1） | `.tmp/r47-a.log` `## a1-saved`：`h1:1 / strong:["粗体文字"] / ul:1 / li:1 / quote:1 / pre:1`，盘上 `"# 第一章\n\n**粗体文字**\n\n- 列表项\n\n> 引用文字\n\n```js\nconst a = 1\n```\n\n"`（55 B，`endsNl:true`）；`## a1-reloaded`：刷新后 `dirty:false`、`h1:1`、`pre:1`、标题 `另存为.md — Sidelight`；`## a1-reloaded-source`：源码框内容 = 盘上字节且 `dirty:false`；截图 `shots/round-47/bug-a-format.png`、`bug-a-saved.png` |
| 2 | 打开文件夹 → 树打开/新建/展开/刷新/重命名/删除/撤销，当前文档随动 | 通过（两处旧文案/字节见 note） | `.tmp/r47-b.log`：`## b1-open` 打开 `甲.md` 正文正确；`## b2-expand` `aria-expanded:true` 且多出 `assets/图.md`；`## b3-refresh` 无假差异；`## b4-rename` `甲.md→甲改.md`，树/标题/当前文档同步、旧键 `null`、字节不变；`## b5-save-after-rename` 写回 `甲改.md`；`## b6-delete-undo` 脏文件删除有确认框、进 `trash/`（3 个文件）、撤销后树里恢复 `甲改.md`；`## b7-newfile` 新建→保存见 note 1；截图 `bug-b-rename.png`、`bug-b-delete.png`、`bug-b-undo.png` |
| 3 | 键盘：`Ctrl+K`/`M`/`P`/`1–6/0`/`/`、`Ctrl+F`+`Esc`、表格 `Tab` 与 `Ctrl+Enter`、焦点回正文 | 通过 | `.tmp/r47-b.log` `## b8-keys`：`Ctrl+K` 预填 `"乙的正"` 与选区等长（3 字）；`Ctrl+M` 聚焦 `math-inline-input`、输入 `x^2` 出 `.katex` 1；`Ctrl+2` 加出 H2、`Ctrl+0` 回段落；`## b9-find` 查找框焦点 `find-input`、计数 `1 / 1`、`Esc` 后焦点回 `.ProseMirror`（`contenteditable:true`）；`## b10-quickopen` `Ctrl+P` 聚焦 `quick-open-input`、输入「丙」回车切到 `丙.md`；`## b11-table` 插入 3×3（9 格）、`Tab` 换格、`Ctrl+Enter` 后行数 4、保存写出表格；截图 `bug-b-table.png`。查找计数另用空白页复核（`.tmp/e2e-r47-probe7.mjs`：`# 乙` + 正文含「乙」→ `1 / 2`、2 个高亮），标题里的命中算得对 |
| 4 | 公式/表格/frontmatter/callout/脚注/Mermaid/引用式链接：编辑 → 源码 → 保存往返 | 往返通过；渲染项部分未证 | `.tmp/r47-c.log` `## c1-fidelity`：`h1:1 katex:1 table:1 mermaidSvg:1`；`## c1-roundtrip`：源码 242 字 → 盘 248 字、`appendOnly:true`（前 242 字逐字保留，只多「新增一句。\n」）、`dirty:false`；`## c1-reopen` 切走再切回 `h1:1 katex:1 table:1`；`## c2-refdoc` 含引用式链接的文档默认源码模式，保存后字节 `same:true`；`## c3-badmermaid` 坏 Mermaid `svg:0`、`pre` 原文、0 错误；截图 `bug-c-fidelity.png` |
| 5 | 源码/预览/专注/打字机/设置/字号/主题；1024×700 与 1440×900 无溢出 | 通过 | `.tmp/r47-d.log` `## d2-views`：字 14.62→15.48 px；设置对话框 `label:"设置"`、按钮 `浅色/深色/跟随系统/恢复默认/快捷键/取消/保存`；选深色后 `data-theme:dark`、body `rgb(21, 23, 26)`；1024 宽：宽表 `docScroll cw=sw=806`、`overflowButtons:0`、`pageXOverflow:0`，长链接同值，预览 `preview:true`、`over:0`；截图 `bug-d-narrow-wide.png`、`bug-d-narrow-longurl.png`、`bug-d-narrow-preview.png` |
| 6 | 控制台 0 error；错误路径 | 通过 | 五套脚本 `## z-errors` 全 `{"errors":[]}`；另存为取消（picker 抛 `AbortError`）：toast「已取消保存。」、`dirty` 保持 `true`、盘上字节不变（`.tmp/r47-d.log` `## d3-cancel-save`：`diskSame:true`）；坏 Mermaid 见路径 4；6 MB 拒绝分支本轮未重跑（第 45 轮背书） |
| 7 | 大文档 110 KB（1,001 段）载入 / 滚动 / 逐键 / 保存 | 通过 | `.tmp/r47-f.log` `## f1-big100k`：`size:110023 B`、`loadMs:150`、5 个 mark 各 3 条（单遍 parse 78 ms / dispatch 7 / serialize 3 / sync 2）、滚动到底 13 ms、逐键 15 次 p50 **23 ms** / max **24 ms**、保存后盘 38,026 字且尾 `字字字字字字字字字字字\n`、`dirty:false`；截图 `bug-f-big.png` |
| 8 | 自动保存 / 撤销重做 / 字数面板 / 刷新恢复 | 通过 | `.tmp/r47-a.log` `## a2-undo-redo`：`Ctrl+Z` 回原样（脏仍 true）、`Ctrl+Shift+Z` 重做回来；`## a3-stats`：面板 `label:"字数明细"`、焦点 `stats-detail`、中日韩字 20 / 拉丁词 3 / 合计 23 / 字符 29 / 句 1 / 段 5、`Esc` 后焦点回 `stats-trigger`（BUTTON）；恢复态切换源码见路径 1。**无句柄单文件时自动保存不写盘**（`.tmp/r47-a.log` `## a2-autosave`：打字后 3.6 s 仍 `dirty:true`、无「已自动保存」提示）——代码 `src/App.tsx:3211-3212` 要求存在保存落点，符合设计，不判缺陷，只记录 |

**特意验证、没有问题的点**
- 恢复态（刷新后）不脏：`a1-reloaded`、`a1-reloaded-source` 都是 `dirty:false`（第 45 轮 F1 修复仍有效）。
- 改名后 `Ctrl+S` 写回新文件名，旧键读回 `null`；删除脏文件走确认框，撤销把文件搬回树里，正文与批注一起回来。
- 窄窗 1024×700 下宽表、长链接、预览都没有横向溢出，工具栏按钮没有一个越过视口右边。
- 110 KB 文末逐键 p50 23 ms（第 44 轮 code#2 说 1 MB 文末逐键 28 s，这里是 110 KB 的实测，不能外推到 1 MB）。
- 另存为取消不吞改动：`dirty` 仍 true、盘上字节不变、给「已取消保存。」提示。
- 查找框关闭后重新打开会保留上次的 query（探针 `.tmp/e2e-r47-probe6.mjs`：关掉后重开 `value:"乙"`，再打字变 `"乙乙"`）；与 VS Code 同行为，不判缺陷。本轮探针一度把它误读成「查找无结果」，复核后排除。

---

## UNVERIFIED（写清怎么补）

1. **1 MB 文档**：本轮只跑 110 KB。补法：`.tmp/make-bigfile.mjs` 生成后按 `.tmp/e2e-r47-bug-f.mjs` 的 `performance.mark` 口径取每个 name 的最后一条；第 39 轮 1 MB 在 dev 下单遍 parse ≈110 s，要单独留时间预算。
2. **callout / 脚注上标 / frontmatter 的 DOM 渲染**：本轮用的选择器（`.callout`、`.footnote-ref`、`[data-frontmatter]`）都是猜的，取到 0 不能判失败；正文里只确认了 Mermaid/KaTeX/表格。补法：先在 `src/` 里查真实类名或截图人工看。
3. **源码模式里点「回到富文本编辑」按钮**（`backToRich`，`src/App.tsx:3976`）是否也走同一条假脏分支：本轮只测了 `Ctrl+/`。补法：保存后点工具栏那个按钮，读 `dirty`。
4. **宿主 / WebView2 / 真机 IME**：没测（浏览器态只有假 FSA）。
5. **`Ctrl+K` 鼠标拖选路径**、**主题「跟随系统」真机切换**、**150%/200% 缩放屏**：沿用前轮 UNVERIFIED，本轮没重跑。

---

## 本轮脚本（可重跑，均带 `node .tmp/reset.mjs 9222` 前置）

| 脚本 | 覆盖 | 日志 |
| --- | --- | --- |
| `.tmp/e2e-r47-bug-a.mjs` | 路径 1/8（格式化→picker 保存→刷新恢复；撤销重做；字数面板） | `.tmp/r47-a.log` |
| `.tmp/e2e-r47-bug-b.mjs` | 路径 2/3（树打开/展开/刷新/改名/删除/撤销/新建；Ctrl+K/M/P/1/0/F、表格 Tab/Ctrl+Enter） | `.tmp/r47-b.log` |
| `.tmp/e2e-r47-bug-c.mjs` | 路径 4（全要素渲染、源码往返、引用式链接保存、坏 Mermaid） | `.tmp/r47-c.log` |
| `.tmp/e2e-r47-bug-d.mjs` | **F1 证据** + 路径 5/6（源码保存回编辑脏、字号/主题/窄窗、另存为取消） | `.tmp/r47-d.log` |
| `.tmp/e2e-r47-bug-e.mjs` | **F1 后果**（切文档被拦）+ 100 KB 首跑（被 F1 的切换框挡住，改用 f） | `.tmp/r47-e.log` |
| `.tmp/e2e-r47-bug-f.mjs` | 路径 7（110 KB 载入/滚动/逐键/保存） | `.tmp/r47-f.log` |
| `.tmp/e2e-r47-bug-g.mjs` | F1 正向对照（源码结尾带换行 → 不脏） | 见输出 |
| `.tmp/e2e-r47-probe*.mjs` | 排障探针（假 FSA 种子传参、切换守卫、查找计数口径），其中 probe4–7 用于排除「查找漏标题」「切换后查找失效」两个假疑点 | 见输出 |

截图：`shots/round-47/bug-e-switch-guard.png`（假脏拦切换）、`bug-d-source-dirty.png`（保存后回编辑的状态）、`bug-f-big.png`（110 KB 文档）、`bug-b-rename.png`、`bug-c-fidelity.png`。
