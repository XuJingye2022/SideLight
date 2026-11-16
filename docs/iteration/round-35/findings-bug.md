# 第 35 轮 · 缺陷猎人（端到端，只读）报告

- 环境：`http://localhost:5175` 已在跑（未重启、未另起 dev server）；headless Edge CDP **9222**。每次运行前 `node .tmp/reset.mjs 9222`；未启动浏览器、未 kill msedge。
- 只读产品代码，未改任何产品文件。`git status` 只有本轮新目录 `docs/iteration/round-35/` 与 `shots/round-35/`（轮前 SHA `e64c2fc`）。
- 本轮我实际跑过 8 次脚本运行，全部挂了 console/pageerror 监听：**error 0、pageerror 0**（每次结尾 `## errors []`）。
- 本轮脚本（全部新建、可复跑；日志同名 `.log` 在 `.tmp/`）：
  - `.tmp/e2e-r35b-bug-main.mjs`（路径 1 的前半 + 路径 3 标题 + 路径 5/6，后半被未处理的切换框挡住，见 note）
  - `.tmp/e2e-r35b-bug-b.mjs`（路径 1 引用/代码块、路径 3 键盘、路径 4 往返、路径 5 视图/设置/溢出、路径 6 取消保存）
  - `.tmp/e2e-r35b-bug-probe.mjs`（切文档后 Ctrl+1、源码 Esc、源码+查找 Esc、反引号输入规则、自动保存风险门）
  - `.tmp/e2e-r35b-bug-probe2.mjs`（源码查找 ✕ 按钮对照、保存后撤销、全部替换撤销、「需手动保存」）
  - `.tmp/e2e-r35b-bug-probe3.mjs`（Esc 关 6 种浮层后的焦点与击键矩阵、新建文件夹）
  - `.tmp/e2e-r35b-bug-probe4.mjs`（源码+查找 Esc 的机理对照：焦点在查找框 vs 焦点在源码框）
  - `.tmp/e2e-r35b-bug-probe5.mjs`（路径 2 文件树、预览+查找 Esc）
  - `.tmp/e2e-r35b-bug-probe6.mjs`（预览 Esc / 快速打开 Esc 各 2 次复现）
- 另有同轮早前一次中止的运行（5:10–5:18）留下的 `.tmp/e2e-r35-bug-*.mjs` 与 `.log`：本轮在「源码/预览 Esc 焦点」「旧版改名的落盘字节」「5.5 MiB 拒绝」几处引用它的日志，每处都标了来源，没有把它的结论当成本轮我自己的实测。
- 截图：`shots/round-35/` 下 `b1-formatted.png`、`b1-reload.png`、`b3-quickopen.png`、`c1-quote-code.png`、`c2-roundtrip.png`、`c3-quickopen.png`、`c4-preview-esc.png`、`c5-1024.png`、`c5-1440.png`、`c5-dark.png`、`c6-abort.png`、`p-src-esc.png`、`p-src-find-esc.png`、`p4-src-find-esc.png`、`p5-tree.png`、`p5-preview-find.png`、`p6-preview-0.png`、`p6-preview-1.png`、`p2-undo-after-save.png`、`p2-manual-save.png`、`p3-esc-focus.png`、`p-autosave-gate.png`、`p-backticks.png`、`p-ctrl1-switch.png`。

---

## 1（P1，静默吞键）退出预览、退出源码、Esc 关快速打开：焦点都掉在 `body`，下一次击键全部丢失

**复现 A（预览，2/2；另有单独 2 次，共 4/4）**

1. 打开文件夹 → 点开 `甲.md` → 正文点一下。
2. `Ctrl+Shift+P` 进预览（`.ProseMirror` 变 `contenteditable="false"`）。
3. 按 `Esc` 回编辑模式，**不点正文**，直接打字。

**复现 B（源码，2/2；另有单独 1 次，共 3/3）**

1. 同上打开 `甲.md`。
2. `Ctrl+/` 进源码（`textarea.source-editor`）。
3. 按 `Esc` 退出源码，直接打字。

**复现 C（快速打开，2/2；另 1 次，共 3/3）**

1. `Ctrl+P` 打开快速打开，输入 `乙`（列表出现 `乙.md`）。
2. 按 `Esc` 关闭浮层，直接打字。

**证据**

```
## preview-esc-x2 [{"after":{"active":"BODY.","editable":"true"},"lenBefore":8,"lenAfter":8,"landed":false},
                   {"after":{"active":"BODY.","editable":"true"},"lenBefore":8,"lenAfter":8,"landed":false}]   （.tmp/e2e-r35b-bug-probe6.log）
## quickopen-esc-x2 [{"after":{"active":"BODY.","find":false},"lenBefore":8,"lenAfter":8,"landed":false},
                     {"after":{"active":"BODY.","find":false},"lenBefore":8,"lenAfter":8,"landed":false}]      （同上）
## esc-source {"pm":true,"textarea":false,"editable":"true","active":"BODY.","len":8,"status":"5 字 …","lenBefore":8}（.tmp/e2e-r35b-bug-probe3.log）
## esc-preview {"pm":true,"textarea":false,"editable":"true","active":"BODY.","len":8,…,"lenBefore":8}          （同上）
## esc-quickopen {"after":{"active":"BODY.",…},"lenBefore":8,"lenAfter":8,"landed":false}                       （同上）
## B1 {"src":{"textarea":true,"active":"BODY."},"afterEsc":{"textarea":false,"pm":true,"active":"BODY."},"lenBefore":8,"lenAfter":8,"landed":false}   （.tmp/e2e-r35-bug-probe2.log，同轮早前运行，2 次相同）
## preview-esc-typing {"pBefore":{"preview":true,"active":"BODY"},"pTyped":{"active":"BODY.","text":"甲|第一段。|第二段。|",…},"landed":false}            （.tmp/e2e-r35-bug-probe3.log，同轮早前运行）
```

- `landed:false` 是每次击键前后正文 `innerText.length` 都不变（8 → 8）；控制台无错误，没有提示。
- 只有「Esc 退出」这一条链有问题：**第 34 轮修好的 `Ctrl+F → Esc` 这次实测正常**（`## find-esc-rich {"landed":true}`，`.tmp/e2e-r35b-bug-b.log`），所以不是旧问题复发，是同一根因的另外三条路径没修。

**根因（代码侧）**

- `focusEditor()` 已经存在：`src/App.tsx:327`；第 34 轮只在查找分支调用它：`src/App.tsx:3502-3506`。
- 源码 / 预览的 Esc 分支只切视图、不还焦点：`src/App.tsx:3533-3541`（`toggleSourceRef.current()` / `togglePreviewRef.current()`），而 `switchView` 本身也不碰焦点：`src/App.tsx:3762-3785`。`toggleSource` / `togglePreview` 分别在 `:3787-3789`、`:3828-3830`。
- 快速打开：选中文件会还焦点（`src/App.tsx:5086-5087` 的 `focusEditor()`），**Esc 关闭不会**（`src/App.tsx:5089` 只有 `setQuickOpen(false)`）；Esc 由 `src/components/QuickOpen.tsx:74-77` 调 `onClose`。

**期望 vs 实际**：这三种 Esc 都是「看完就继续写」的收尾动作，期望焦点回正文；实际焦点落在 `body`，下一次击键被丢弃，用户会以为键盘或输入法坏了。

**建议**：把这三处都接到 `focusEditor()`（与 `:3504` 一致）；更稳的写法是在打开浮层时记住 `document.activeElement`，关闭后恢复，源码分支如果仍停在源码则聚焦 `textarea.source-editor`。回归测试建议直接连做：进预览 → Esc → 打字断言落进正文，源码、快速打开同理。

---

## 2（P2，一次按键两个动作）查找框开着时按 `Esc`，在源码/预览模式里会连带退出源码/预览

**复现（源码 5/5、预览 3/3）**

1. 打开 `甲.md` → `Ctrl+/` 进源码（或 `Ctrl+Shift+P` 进预览）。
2. `Ctrl+F` 打开查找（焦点在 `.find-input`）。
3. 按一次 `Esc`。

**证据**

```
## A1 {"textarea":true,"pm":false,"find":true,"active":"INPUT.find-input"}
## A2-focus-in-find {"textarea":false,"pm":true,"find":false,"active":"DIV.tiptap ProseMirror editor "}   （.tmp/e2e-r35b-bug-probe4.log）
## B1 {"textarea":true,"pm":false,"find":true,"active":"TEXTAREA.source-editor","findOpen":true}
## B2-focus-in-textarea {"textarea":true,"pm":false,"find":false,"active":"TEXTAREA.source-editor"}        （同上，对照组）
## preview-find-esc-x2 [{"pre":{"find":true,"editable":"false"},"post":{"find":false,"editable":"true","active":"DIV"}}, {…}]（.tmp/e2e-r35b-bug-probe6.log）
## C-src-find-esc [{"s2":{"find":true,"textarea":true,…},"s3":{"find":false,"textarea":false,"pm":true,"active":"DIV"}}, {…}]（.tmp/e2e-r35b-bug-probe.log，2 次相同）
```

- A 组：焦点在查找框，一次 `Esc` 后**查找关了、源码也退了**（`textarea:false`）。
- B 组对照：焦点先点到源码框、查找框仍开着，再按 `Esc`，**只有查找关**（`textarea:true` 不变）。同一次按键，只因焦点不同就少了一个动作。
- 机理：`FindBar` 自己的 Esc 处理先关查找（`src/components/FindBar.tsx:46-53`，替换框同 `:75-82`；App 的 `onClose` 在 `src/App.tsx:4588-4591`），事件继续冒泡到 window 级监听（`src/App.tsx:3490`）；`findOpen` 在监听依赖里（`:3672`），此时新闭包里已是 `false`，于是同一个 Esc 落到 `sourceMode` / `previewMode` 分支（`:3534`、`:3538`）再退一层。

**期望 vs 实际**：Esc 应该只关最上面一层（查找）；实际连视图一起退，用户正在源码里改的东西（已按「切回」规则落回正文）上下文被打断。好在退出后焦点落在 `.ProseMirror`，继续打字能进正文（`active:"DIV.tiptap ProseMirror editor"`），所以不是 P1。

**建议**：在 `FindBar` 的 Esc 处理里 `event.stopPropagation()`（或 `preventDefault()` 后由外层检查 `defaultPrevented`，或把 `findOpen` 改成 ref 读取），让一个 Esc 只处理一次。

---

## 六条路径实测结果（没有新缺陷的部分）

| 路径 | 做了什么 | 结果 | 证据 |
| --- | --- | --- | --- |
| 1 空文档 → 格式 → 保存 → 刷新 | 工作区里新建 `未命名.md` → 用 Markdown 输入规则打 `## 二级标题`、`**加粗的字**`、`- 列表甲/- 列表乙` → 另起一篇打 `> 引用一行`（生成 `<blockquote>`）与 ` ```js` + 正文（生成 `<pre>`）→ `Ctrl+S` → 读假 FS 字节 → 刷新、重开工作区、重开该文件 | 通过。`h2/strong/ul/li` 均生成；主脚本落盘 `## 二级标题\n\n**加粗的字**\n\n- 列表甲\n- 列表乙\n- &gt; 引用一行\n- \`\`\`js\n- const a = 1\n\n`（`>` 与反引号按行内字面量转义，重开仍是同一段文字）；另起的引用/代码块篇落盘 `> 引用一行\n>\n> 正文段\n>\n> \`\`\`jsconst\na = 1\n\`\`\`\n\n`，编辑器里出 `<blockquote>` 与 `<pre><code class="language-jsconst">`；刷新后 `h2/strong/ul/li` 全在，文章名仍是 `未命名.md` | `b1-formatted.png`、`b1-reload.png`、`c1-quote-code.png`；`.tmp/e2e-r35b-bug-main.log` 的 `## path1-*`、`.tmp/e2e-r35b-bug-b.log` 的 `## quote-code` |
| 2 文件树 新建/重命名/删除/展开/刷新/当前文档随动 | 打开文件夹 → 展开 `sub` → 开子目录文档 → `＋ 新建文件`（落工作区根 `未命名.md`）→ 写字 `Ctrl+S` → 右键当前项（菜单：重命名 / 删除（移到回收站））→ 右键删非当前 `乙.md` → 确认「移到回收站」 | 通过。新建/保存字节正确；删除后树里消失、写进 `.sidelight/trash/20261117-061302-5j4z4w-乙.md`、提示「已移到回收站：乙.md」；当前文档不动。重命名用同轮早前一次运行的日志复核：改名后写入 `改名后.md` 且字节为编辑器内容（`.tmp/e2e-r35-bug-b.log` 的 `## renamed-dirty`/`## renamed-bytes`） | `p5-tree.png`；`.tmp/e2e-r35b-bug-probe5.log` 的 `## t1`–`## t10` |
| 3 键盘 | `Ctrl+1–6/0`（每次先确认焦点在 `.ProseMirror`）、`Ctrl+K`、`Ctrl+M`、`Ctrl+P` 选另一篇、`Ctrl+F`→`Esc`→打字、表格 `Tab`/`Ctrl+Enter`、字号 | 通过（焦点问题见第 1 条）。标题依次 `H1/H2/H3/H4/H5/H6/P` 且每步 `activeBefore:true`；`Ctrl+K` 出 2 个输入框且焦点在 `INPUT.link-editor-input`；`Ctrl+M` 出数学节点、焦点在 `INPUT.math-inline-input`；快速打开后焦点已在正文、`QP` 落入正文（`landed:true`）；`Ctrl+F→Esc→打字` 落进正文（`landed:true`，第 34 轮修复有效）；字号 18→19→18→17（复位键 `Ctrl+Alt+0`）；表格 `Tab`/`Ctrl+Enter` 加行 3→3→4（同轮早前 probe2 日志） | `.tmp/e2e-r35b-bug-main.log` 的 `## headings`、`.tmp/e2e-r35b-bug-b.log` 的 `## ctrl-k`/`## ctrl-m`/`## quick-open-focus`/`## find-esc-rich`、`.tmp/e2e-r35-bug-probe2.log` 的 `## table-tab` |
| 4 公式/表格/脚注/frontmatter/行内 HTML/callout → 源码 → 保存往返 | 165 B 样例（frontmatter + callout + 行内公式 + 对齐表格 + 脚注 + `<kbd>`）→ 读源码逐字节比较 → 回富文本改表格单元格 → `Ctrl+S` | 通过。源码与文件 `equal:true`（165/165）；保存后 frontmatter 仍在第 1 行、`\| :--- \| ---: \|` 保留、`[^1]: 脚注定义。` 保留、`> [!note]` 与 `<kbd>Ctrl</kbd>` 保留；单元格改动落盘（`\| 甲2 \| 乙 \|`）；无风险确认框、提示「已保存 富文本.md」 | `c2-roundtrip.png`；`.tmp/e2e-r35b-bug-b.log` 的 `## source-equal`/`## roundtrip-save` |
| 5 源码/预览/专注/打字机/设置/字号/主题/窄窗 | 字号快捷键；`Ctrl+Shift+P` 预览再 `Esc`；设置对话框点「深色」→保存→刷新；1024×700 与 1440×900 量溢出 | 通过（焦点见第 1 条）。预览 `contenteditable=false` → `Esc` 回 `true`；深色保存后 `data-theme="dark"`、`rgb(21,23,26)`，刷新后仍是 `dark`；两种视口 `scrollWidth === innerWidth`（1024/1024、1440/1440），越界元素 0 | `c4-preview-esc.png`、`c5-dark.png`、`c5-1024.png`、`c5-1440.png`；`.tmp/e2e-r35b-bug-b.log` 的 `## font-size`/`## settings`/`## overflow` |
| 6 控制台 0 error / 错误路径 | 8 次运行全程挂 console/pageerror；另存为 picker 抛 `AbortError`（取消）；大文件拒绝引用同轮早前日志 | 通过。8 次运行 `## errors []`；取消保存出「已取消保存。」且脏字仍在编辑器（`stillHasText:true`）；5.5 MiB 拒绝：点击 `超大.md` 不出编辑器、提示「「超大.md」超过 5.5 MiB，仍在「富文本.md」」（同轮早前 `e2e-r35-bug-b.log` 的 `## bigfile-click`，非同一次运行） | `c6-abort.png`；各日志末尾 `## errors []` |

## note（重复项、不算缺陷、脚本失效，不计入 actionable）

- **重复（前轮已列）**：① 改名成功后提示「已刷新：新增 1 个，消失 1 个」——第 29 轮 findings-bug 第 2 条；② 删除确认框仍写「要恢复，用文件管理器把 trash 里的文件移回原位」而提示里就有「撤销」——第 33 轮 findings-bug 第 2 条。
- **与第 1 条同族但按现有设计不算缺陷**：`Esc` 关设置对话框、快捷键一览后焦点回到触发按钮（`BUTTON.file-menu-trigger`），关字数明细后回到 `.stats-trigger`（第 30 轮有意为之）。这些是对话框惯例，只是也会丢一次击键，本轮不列为缺陷。
- **实测过、不是缺陷**：
  - 自动保存被风险门拦下时不弹框、不写盘，状态栏转「需手动保存」，风险横幅同时在场：`## E-autosave-gate {"timeline":[…"需手动保存"…],"bytesChanged":false}`（`.tmp/e2e-r35b-bug-probe.log`）。
  - 保存后 `Ctrl+Z`：正文回到保存前的 5 字，脏标记出现，2 秒自动保存把那 5 字写盘；随后切文档会正常弹「取消 / 不保存 / 保存并切换」（`.tmp/e2e-r35b-bug-probe2.log` 的 `## undo-after-undo`/`## undo-switch`）。撤销后自动写盘是既定设计，不是覆盖事故。
  - 全部替换后用 `Ctrl+Z` 能整批撤回，保存字节正确（`## replace-undo`，同上）。
  - 段落以 ` ```jsconst ` 开头时被代码块输入规则吃掉并变成围栏语言 `jsconst`（`## D-plain`，`.tmp/e2e-r35b-bug-probe.log`）：这是标准 Markdown 围栏输入行为，我最初的用例写错了，不算缺陷。
  - 新建文件夹菜单会调 `window.prompt`（`src/App.tsx:2340`）；我最初让对话框 accept 空串，于是静默取消，不是死菜单。
  - 空目录 `assets` 在树里正常显示；删除非当前文件不影响当前文档。
- **不可复现（不报）**：一次运行里 `Ctrl+1` 连续两次无效（`.tmp/e2e-r35b-bug-main.log` 的 `## ctrl1-fresh-doc`：`block:"P"` 两次），但专门重跑时 `Ctrl+1` 稳定生效（`## A-same-doc-ctrl1`/`## A-after-switch-ctrl1` 都是 `H1`，且监听到 keydown 到达 window），判为当时页面里有未处理的切换确认框导致，不是产品缺陷。
- **脚本失效（不是产品缺陷）**：主脚本在快速打开选 `富文本.md` 时没处理「这篇还有没保存的改动」三选一，之后 `.ProseMirror` 被遮罩判定为 inert，`path3-keys`/`path5`/`path4`/`path6` 四段 `TimeoutError` 中断（日志里 `## quick-open` 已记录该对话框）；同一路径已由脚本 B 复跑通过。路径 2 的重命名步骤选择器写错（实际类名 `.tree-rename-input`，不是 `.tree-actions input`），所以本轮改名没有自己的新日志。

## UNVERIFIED（本轮测不了）

1. **真实磁盘与宿主（WebView2）/ macOS / 中文输入法 / 屏幕阅读器**：全部 E2E 都在假 FSA（`window.showDirectoryPicker` stub，`.tmp/r30-fsa.mjs`）上跑；第 1 条的焦点问题走同一套 React/DOM 代码路径，但没在真实安装包上复测。
2. **文件树「刷新」入口**：本轮找不到可见的刷新按钮/菜单项（第 34 轮也记了找不到），所以「刷新后当前文档随动」没有可复测的入口；补测方法：用 `文件 ▾ → 打开文件夹…` 重选一次目录。
3. **只读写入失败（`NotAllowedError`）**：本轮只测了 picker 取消（`AbortError`），第 34 轮验过只读提示，未复测。
4. **焦点环可见性**：只量了文件树行的 `outline: solid 2px rgb(43, 109, 100)`、`:focus-visible` 为 true（同轮早前运行 `.tmp/e2e-r35-bug-c.log` 的 `## tree-focus-ring`），没有逐个控件断言。
5. **大文件拒绝提示**：只引用同轮早前一次运行的日志，没有在本轮自己的运行里重跑 5.5 MiB 用例。
6. **专注/打字机模式的具体行为**：只确认按钮存在，没有断言滚动跟随与居中规则。
