# 第 34 轮 · 缺陷猎人（端到端，只读）报告

- 环境：`http://localhost:5175` 已在跑（未重启、未另起 dev server）；headless Edge CDP **9222**（探针另用 9223 并行）。每次运行前 `node .tmp/reset.mjs <端口>`。
- 只读产品代码，未改任何产品文件；`git status` 只有本轮新目录 `docs/iteration/round-34/` 与 `shots/round-34/`。
- 本轮脚本（全部新建，可复跑）：
  - `.tmp/e2e-r34-bug-a.mjs`（路径 1 + 跨文档撤销 + 新建后撤销）
  - `.tmp/e2e-r34-bug-b.mjs`（路径 2 前半 + 查找替换；在新建菜单处中断，见 note）
  - `.tmp/e2e-r34-bug-c.mjs`（路径 2 + 路径 4，脚注改写在这里首次出现）
  - `.tmp/e2e-r34-bug-d.mjs`（路径 3 + 路径 5 + 路径 6）
  - `.tmp/e2e-r34-bug-probe1.mjs`（切文档「不保存」与自动保存的时间线）
  - `.tmp/e2e-r34-bug-probe2.mjs`（脚注定义在文末：正常）
  - `.tmp/e2e-r34-bug-probe3.mjs`（脚注定义在中间：风险横幅阻断脚本）
  - `.tmp/e2e-r34-bug-probe4.mjs`（载入即中间定义：横幅 + 保存确认框）
  - `.tmp/e2e-r34-bug-probe5.mjs`（**P0 最小复现**）
  - `.tmp/e2e-r34-bug-probe6.mjs`（快速打开选当前篇、Ctrl+F 焦点、主题保存/持久化）
  - `.tmp/e2e-r34-bug-probe7.mjs`（自动保存完成后切文档；Ctrl+F → Esc → 打字落点）
  - `.tmp/e2e-r34-bug-probe8.mjs`（快速打开后焦点）
  - 日志：同名 `.log` 在 `.tmp/`。
- 挂了 console/pageerror 监听、跑完的 **9 次运行**：**error 0、pageerror 0**（每次结尾 `## errors []`；`e2e-r34-typora.log` 属另一位 finder，不计入）。
- 截图：`shots/round-34/` 下 `b1-reload.png`、`b1-undo-crossdoc.png`、`b1-newdoc-undo.png`、`b2-tree.png`、`b2-tree-after.png`、`b3-keyboard.png`、`b4-top-insert.png`、`b4-rich.png`、`b5-preview.png`、`b5-dark.png`、`b5-narrow.png`、`b5-wide.png`、`b6-readonly.png`、`probe1-discard.png`、`probe2-footnote.png`、`probe5-foot-9222.png`、`probe6-quick-clean.png`、`probe6-quick-dirty.png`、`probe6-theme-dark.png`、`probe7-find-esc.png`、`probe7-switch-after-autosave.png`、`probe8-quick-focus.png`。

---

## 1（P0，静默数据损坏）源码模式在文末脚注块后再追加内容，回富文本保存时脚注定义被改写成行内链接，没有任何提示

**复现（最小步骤 3/3 一致；日志保留第 1 次，另两次输出相同）**

1. 造一篇合法 Markdown（脚注定义在文末）：

```markdown
# 脚注篇

引用[^1]。

[^1]: 定义文字。
```

2. 打开文件夹 → 点开这篇（富文本，无风险横幅）。
3. `Ctrl+/` 进源码 → `Ctrl+End` → 输入 `\n末尾段。\n` → `Ctrl+S`。此刻保存是**正确的**（定义仍在）。
4. `Ctrl+/` 回富文本，**不改任何字**，直接 `Ctrl+S`。

**实际落盘字节（`.tmp/e2e-r34-bug-probe5.log`）**

```
## bytes-after-source     "# 脚注篇\n\n引用[^1]。\n\n[^1]: 定义文字。\n\n末尾段。\n"
## bytes-after-rich-save  "# 脚注篇\n\n引用[^1](定义文字。)。\n\n末尾段。\n"
## verdict {"corrupt":true,"defLost":true}
## confirm-clicked null        ← 没有任何确认框
## rich-save-1 {"notice":"已保存 脚注.md","banner":null,"dialog":null}
```

- 脚注定义 `[^1]: 定义文字。` 消失，被塞进 `[^1](定义文字。)`：在别的编辑器（含 Typora/GitHub）里这是一个**坏链接**，不再是脚注。正文里 `[^1]` 这个引用也不再指向任何定义。
- 保存提示仍是「已保存 脚注.md」，无风险横幅、无确认框；结束态 `Ctrl+/` 读到的源码就是坏文本（`## source-now`）。
- 同一台机器上「定义留在文末」的对照组正常：`.tmp/e2e-r34-bug-probe2.log` 的 `## foot-bytes-save-edit` 仍是 `[^1]: 这是脚注定义。`。

**首次出现的完整链路**（`.tmp/e2e-r34-bug-c.log`，路径 4）：带 frontmatter/callout/表格/脚注的文档 → 源码态追加 → 源码保存干净 → 回富文本在正文顶部打一个字 → `Ctrl+S` → `## top-saved` 的 tail 变成 `脚注引用[^1](脚注定义。)。`。

**根因（代码侧）**

- `src/lib/footnotes.ts:62-73`：`extractFootnotes` 只把**文末连续的** `[^id]:`/`[label]:` 块摘出去；定义后面一旦出现普通段落（第 45 行 `parseBlocks` 返回 null），定义就原样留在正文里，交给富文本解析。
- 富文本保存时该段被序列化成 `[^1](定义文字。)`；`src/lib/footnotes.ts:85-86` 的 `repairFootnoteRefs` 只还原 `\[^1\]`，管不了这种形态。
- 保存门看的是「载入时的基线风险」：`src/App.tsx:2833` 用 `activeLosses(originalText, normalized, baselineLossesRef.current)`，基线在载入时算（`src/App.tsx:1012-1020`、`:1993-2004`）。本例的风险是**用户编辑后才引入**的（定义被追加段落挤出文末块），基线里没有，所以不弹框。判定逻辑本身能识别这类损失：`src/lib/risk.ts:129-174` 的 `footnoteLosses` 会在「原文有定义、正文仍引用、保存后定义没了」时报 `footnote-loss`。

**对照（不是缺陷的部分）**：如果文档**载入时**定义就已经不在文末，应用会拦——`.tmp/e2e-r34-bug-probe4.log`：

```
## risk-banner "这篇载入时就有会被改写的结构（1 类）：脚注 [^1] 的定义在保存后会消失（正文还在引用它）|在源码模式打开原文|知道了"
## M-save-noedit dialog "保存后这些写法会被改写|…|取消|仍然保存"
```

所以缺口很具体：**只有「载入后编辑把定义挤出文末块」这一条路径没有护栏**，而它恰好是「在文末追加一段」这种最常见的动作。

**期望 vs 实际**：用户只是往文末加了一段，脚注定义就静默坏掉；没有任何提示、没有 `取消` 机会，磁盘已被覆盖。

**建议**：保存前把 `activeLosses` 的判定改为「不论是否在基线里，只要本次输出会丢文末脚注/引用定义就拦一次」——基线只用来决定「载入时横幅」，不要用来免除保存确认；或在 `extractFootnotes` 里把「正文中间的 `[^id]:` 定义」也标记为风险，序列化时逐字节保留。回归测试建议直接覆盖本报告的 4 步复现，断言保存后 `[^1]: 定义文字。` 仍在。

---

## 2（P1，静默吞键）`Ctrl+F` 后按 `Esc` 关查找，焦点掉到 `body`，接着打字不进正文

**复现（2/2）**

1. 打开任意文档 → 正文点一下 → `Ctrl+F`（`.find-input` 获得焦点，正常）。
2. 不再点别处，按 `Esc` 关查找框。
3. 直接打字。

**证据**

```
## find-focus-check {"open":true,"focusInFind":"INPUT.find-input","afterEsc":"BODY.","stillOpen":false}      （.tmp/e2e-r34-bug-probe6.log）
## find-esc-then-type {"landedInEditor":false,"active":"BODY.","status":"5 字 · 阅读约 1 分钟"}              （.tmp/e2e-r34-bug-probe7.log，打字前后字数都是 5）
```

- 关框前后正文都没有变化，字数不变，说明按键被丢弃；控制台无错误。
- 代码侧：`src/App.tsx:3490-3493` 的 Escape 分支只有 `setFindOpen(false)`，没有把焦点还给编辑器；对比侧栏那段（`:3486-3488`）就显式 `railToggleRef.current?.focus()`。

**期望 vs 实际**：查找是「看完就继续写」的流程，关框应回到刚才的位置继续输入；实际是下一次击键全部丢失，用户会以为键盘或输入法坏了。

**建议**：`Esc` 关查找后 `editor.commands.focus()`（找不到编辑器时退回 `.ProseMirror` 元素 focus）。同一条也建议给 `onFind` 打开时记下焦点来源。

---

## 3（P2，焦点不回正文）快速打开（`Ctrl+P`）选中文件后焦点留在文件树，接着打字丢键

**复现（2/2）**

1. 打开文件夹 → 点开 `甲.md`。
2. `Ctrl+P` → 输入 `乙` → `Enter`（正确打开 `乙.md`）。
3. 不点正文，直接打字。

**证据**

```
## quick-open-clean {"before":{"docTitle":"乙.md","active":"DIV.tree-file is-active"},"after":{"active":"DIV.tree-file is-active","editor":"乙\n\n乙的正文。"},"landed":false,"editorChanged":false}   （.tmp/e2e-r34-bug-probe8.log）
```

`landed:false`：`PALETTETYPED` 这 12 个字符一个都没进正文，状态栏仍是 5 字。

**期望 vs 实际**：快速打开的目的就是「跳到某篇继续写」；实际打开后必须再用鼠标点正文才能输入。

**建议**：打开完成后把焦点交给编辑器（或至少把焦点放到正文区域），与 Typora/VS Code 的「Enter 后进入编辑器」一致。

---

## 4（P2，无意义确认）快速打开选中**当前正在编辑的那一篇**，会弹「切到它之前要保存吗」

**复现（2/2，需要当前文档有未保存改动）**

1. 打开 `甲.md`，改一个字（保持脏）。
2. `Ctrl+P` → 输入 `甲` → `Enter`。

**证据**

```
## quick-current-dirty {"docTitle":"甲.md","dialog":"这篇还有没保存的改动|切到「甲.md」之前，要先把当前这篇存下来吗？|取消|不保存|保存并切换"}
## quick-dirty-btns ["取消","不保存","保存并切换"]            （.tmp/e2e-r34-bug-probe6.log）
```

- 干净状态下选当前篇是静默关框、无弹框（`## quick-current-clean`）。
- 代码侧：`src/App.tsx:2111-2126` 的 `requestLoad` 只看 `dirty`，不比较目标文件与 `activeFile`；所以「打开同一篇」也走切换确认。快速打开的 `onSelect` 在 `src/App.tsx:5063-5070`。

**期望 vs 实际**：目标是同一篇，没有切换可言；实际弹一个「要保存吗」的三选一，用户容易误点「不保存」。

**建议**：`requestLoad` 开头加一句「`file?.path === activeFile?.path && name === docName` 时直接返回（或只关浮层）」。

**附带**：同一条路径也意味着在文件树里点当前已打开且脏的文件会弹同一个框（`openWorkspaceFile` → `requestLoad`，未单独复测）。

---

## 六条路径实测结果（没有新缺陷的部分）

| 路径 | 做了什么 | 结果 | 证据 |
| --- | --- | --- | --- |
| 1 空文档 → 格式 → 保存 → 刷新 | 空 `未命名.md` → 打标题行走 `Ctrl+1`、`Ctrl+B` 加粗一行、`- ` 造列表两项、`> ` 造引用 → `Ctrl+S`（无工作区句柄，stub picker 落 `另存为.md`）→ 读盘 → 刷新 | 通过。HTML 依次为 `<h1>`、`<strong>`、`<ul><li>`、`<blockquote>`；磁盘字节 `# 一级标题\n\n**加粗的一段字**\n\n- 列表甲\n- 列表乙\n\n> 引用一行\n\n`；刷新后正文完整，状态栏「20 字 · 草稿 04:02」 | `b1-reload.png`；`e2e-r34-bug-a.log` 的 `## formatted`/`## saved-bytes`/`## reload-has-all` |
| 2 文件树 新建/重命名/删除/展开/刷新/当前文档随动 | 打开文件夹、展开 `sub`、开子目录文档；`＋ 新建 ▾` → 新建文件 ×3（自动命名 `未命名.md`、`未命名 2.md`、`未命名 3.md`）；当前文档改名 `未命名 3.md → 改名后` 后 `Ctrl+S`；右键删非当前 `乙.md`；找刷新入口 | 通过。改名后保存写进 `改名后.md` 且字节为编辑器内容；删除后树里消失、磁盘出现 `.sidelight/trash/20261117-040641-226743-乙.md`、提示「已移到回收站：乙.md」；当前文档不随删除的非当前文件变动 | `b2-tree.png`、`b2-tree-after.png`；`e2e-r34-bug-c.log` 的 `## renamed-bytes`/`## deleted-files` |
| 3 键盘 | `Ctrl+1–6/0`、`Ctrl+K`、`Ctrl+M`、`Ctrl+P`、`Ctrl+/`、表格 `Tab`×5 + `Ctrl+Enter`、`Ctrl+F`/`Esc` | 通过（第 2 条除外）。标题级别依次 `H1/H2/H3/H4/H5/H6/P`；`Ctrl+K` 打开行内链接编辑器（`INPUT.link-editor-input`，文字/地址两栏）；`Ctrl+M` 出现 `data-type="inline-math"` 节点；`Ctrl+/` 进 `textarea.source-editor` 再回 `contenteditable=true`；表格 `Tab` 在末格加行（`rowsBefore 2 → rowsAfter 4`），`Ctrl+Enter` 再加一行并落盘 | `b3-keyboard.png`；`e2e-r34-bug-d.log` 的 `## heading-levels`/`## ctrl-k`/`## source-toggle`/`## table-tab` |
| 4 公式/表格/脚注/frontmatter/行内 HTML/callout → 源码 → 保存往返 | 172 B 样例：frontmatter + callout + 行内公式 + 对齐表格 + 脚注 + `<kbd>`；读源码逐字节比较；源码态追加后保存；富文本顶部插字；表格单元格写 `甲2` | 通过（脚注见第 1 条）。源码与磁盘 `equal:true`（172/172）；源码态追加落盘且 frontmatter/表格对齐 `\| :--- \| ---: \|`/脚注定义全保真；顶部插字后 frontmatter 仍在第 1 行（`topTextBeforeFrontmatter:false`）；表格单元格改动落盘 `| 甲甲2 | 乙   |` | `b4-top-insert.png`、`b4-rich.png`；`e2e-r34-bug-c.log` |
| 5 源码/预览/专注/打字机/设置/字号/主题/窄窗 | 字号 `Ctrl+=`×2、`Ctrl+-`；`Ctrl+Shift+P` 进预览（`contenteditable=false`）再 `Esc` 回编辑；设置对话框选「深色」→ 保存 → 刷新；1024×700 与 1440×900 量溢出 | 通过。字号 17→18→19→18（`Ctrl+0` 不改变，复位键是文档里写的 `Ctrl+Alt+0`，见 `ShortcutsDialog.tsx:45`）；预览 `Esc` 回 `contenteditable=true`；深色保存后 `data-theme="dark"`、刷新后仍是 `dark`（`rgb(21, 23, 26)`）；两种视口 `scrollWidth === innerWidth`（1024/1024、1440/1440），越界元素 0 | `b5-preview.png`、`b5-dark.png`、`b5-narrow.png`、`b5-wide.png`；`e2e-r34-bug-d.log`、`probe6.log` |
| 6 控制台 0 error / 错误路径 | 另存为 picker 抛 `AbortError`（取消）；目标 `createWritable` 抛 `NotAllowedError`（只读）；9 次跑完的运行全程挂 console/pageerror | 通过。「已取消保存。」与「保存失败：只读。改动还在，可以再试一次。」都出现，脏字仍在编辑器里；9 次运行 `## errors []` | `b6-readonly.png`；`e2e-r34-bug-d.log`、各 `## errors []` |

## note（重复项、不算缺陷、脚本失效，不计入 actionable）

- **重复（前轮已列）**：① 改名成功后提示「已刷新：新增 1 个，消失 1 个」（`e2e-r34-bug-c.log` 的 `## renamed-dirty`）——第 29 轮 findings-bug 第 2 条，`src/App.tsx:2231`；② 删除确认框仍写「要恢复，用文件管理器把 trash 里的文件移回原位」，而提示里就有「撤销」（`## delete-dialog`）——第 33 轮 findings-bug 第 2 条；③ 源码模式字数含 Markdown 标记、字数明细「段」口径——第 31/32 轮 note。
- **不是缺陷（实测过）**：
  - 切文档弹「取消 / 不保存 / 保存并切换」时选「不保存」，脏字**不会**落盘：`.tmp/e2e-r34-bug-probe1.log` 时间线里 `甲bytes` 在 `+6243ms` 停在 `…脏字Q\n`（`脏字R` 从未写盘），`after-discard-*` 四次采样都不变；另一处 `e2e-r34-bug-a.log` 里 `甲PLUS` 确实在磁盘上，但 probe1 的同型时间线（`## +4773ms idle-watch` 出现「已自动保存 04:05」）说明那是空闲 2 秒的自动保存先写掉了，不是「不保存」失效。
  - 自动保存写完后切文档**不弹**确认框：`.tmp/e2e-r34-bug-probe7.log` 的 `## switch-after-autosave` 无 dialog，`## switch-dialog-btns []`。
  - 跨文档撤销不串：切到 `乙.md` 后第一次 `Ctrl+Z` 只撤掉 `乙PLUS`，再按三次不变，`乙.md` 磁盘字节仍是 `# 乙\n\n乙的正文。\n`（`e2e-r34-bug-a.log` 的 `## 乙-undo1..4`/`## 乙-bytes`）。
  - 新建空文档后 `Ctrl+Z` 三次是无操作，不会把上一篇内容倒灌进来（`## new-doc-undo1..3`）。
  - 表格 `Tab`/`Ctrl+Enter` 加行、`\|` 转义、对齐行保留都正常（脚本 C 的 `## table-cell-saved`、脚本 D 的 `## table-bytes`）。
  - 行内 HTML 在富文本里显示为字面量 `<kbd>`，但保存后逐字节保真（`top-saved` 里 `<kbd>Ctrl</kbd>` 仍在），按现有设计不报。
- **脚本失效（不是产品缺陷）**：
  - `.tmp/e2e-r34-bug-b.mjs` 找新建菜单用 text/role 匹配失败（正确入口是 `button[aria-label="新建选项"]`，第 33 轮 probe2 就这么写），中断后面的用例；同一路径已由脚本 C 覆盖。
  - 脚本 C/D 里「新建文件」我预置了 `window.prompt` 回答，实际产品不弹 prompt、直接建 `未命名.md`；预置值被忽略，不是缺陷。
  - 脚本 D 的 `Ctrl+F` 那一段夹在「快速打开弹了切换框」之后，属于失效步骤；已用 probe6/probe7 单独复测（见第 2 条）。
  - `e2e-r34-bug-probe3.mjs` 在切换文件时被新出现的 `.risk-banner`（结构风险提示）挡住鼠标而超时；那是产品预期行为（probe4 专门记录了横幅文案），不是回归。

## UNVERIFIED（本轮测不了）

1. **大文件错误路径**：假 FS 里塞 6 MiB 文件后，用「刷新」入口找不回（`## bigfile-in-tree {"refresh":null,"count":0}`——按 text/aria-label `/刷新/` 都没找到入口），所以 5.5 MiB 拒绝提示本轮**未复测**；第 33 轮已验过，补测方法：用 `文件 ▾ → 打开文件夹…` 重新选一次目录，或 `Ctrl+P` 直接搜文件名。
2. **焦点环可见性**：只验证了焦点落点（`INPUT.find-input` / `DIV.tree-file is-active` / `BODY`），未逐个断言 `:focus-visible` 轮廓；第 16 轮 theme 27/27 覆盖过对比度，本轮不重复。
3. **真实磁盘上的脚注复现**：本条 P0 在假 FSA（`window.showDirectoryPicker` stub）上稳定 3/3；真实 Chrome/宿主走同一 `performCommit` 写入路径，但没有在真盘手测。补测：用 `npm run dev` 打开真目录，按第 1 条 4 步做一次，比较 `git diff` 前后的 `.md` 字节。
4. **宿主（WebView2）/ macOS / 中文输入法 / 屏幕阅读器**：不在本轮环境。
5. **专注/打字机模式的具体行为**：只确认工具栏有「专注」「打字机」两个按钮存在（`## toolbar-buttons`），没有断言滚动跟随与居中规则；属于未测项，不是未通过。
