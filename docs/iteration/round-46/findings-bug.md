# 第 46 轮 · 缺陷猎人报告（finder-bug）

- 轮次：round 46　　轮前 startSha：`39e4f0211f43b7edaca82d468d0997f029151e3c`（实测 `git rev-parse HEAD` 同值）
- 环境：dev server `http://localhost:5175`（未重启，`/src/main.tsx` 200）、CDP 9222（未启动 Edge、未 kill msedge）、每套脚本前 `node .tmp/reset.mjs 9222`。假 FSA 工作区用 `.tmp/r30-fsa.mjs`，全部只读产品代码。
- 结论：**1 条新发现可执行（P2）**；第 45 轮两条 F1/F2 实测**均未复现**（F1 已修、F2 判为上一轮脚本时序假阴），控制台全程 0 error（4 套脚本 `errors: []`）。
- 截图：`shots/round-46/` 里本角色生成的 10 张（关键 3 张在文末引用）。

---

## F1（P2）在工作区新建的文件按 Ctrl+S 落盘，结尾少一个换行；同一保存动作有两条字节约定

**复现步骤**（脚本 `.tmp/e2e-r46-bug-b.mjs` 的 `## b1-newfile`，日志 `.tmp/r46-b.log`；另见 `.tmp/e2e-r46-bug-a.mjs` 的 `## p2-newfile-saved`，`.tmp/r46-a.log`）

1. 打开假工作区（种子里已有 `甲.md`、`乙.md`），点树头「＋ 新建」，得到 `未命名.md`（toast「已新建 未命名.md」）。
2. 点正文，输入「新建正文」，等 300 ms。
3. 按 `Ctrl+S`。读假盘上的字节：`newBytes:"新建正文"`、**`endsNl:false`**。
4. 对照同一会话里「打开已有文件再保存」：`## p1-bytes` 的 `saved1` 以 ```` ```\n\n ```` 结尾（有换行）；第 45 轮 `甲.md` 保存字节同样以 `丁\n` 结尾（`docs/iteration/round-45/findings-bug.md` F1 的 `## d1-saved`）。
5. 重开该文件：`dirty:false`、切源码仍 `dirty:false`（没有变成第 45 轮 F1 那种脏，仅字节差异）。

**期望 vs 实际**
- 期望：新建的 `.md` 与「打开已有文件再保存」走同一套尾换行约定，落盘以 `\n` 结尾；否则同一动作在不同入口产出两种字节。
- 实际：新文件没有结尾换行。第 4 步的推论（按 `src/App.tsx:2834` 的代码路径成立，本轮未单独实测）：之后再随便改一个字保存，`prepareSave` 会把换行补上，文件在用户没敲回车的地方多出一个字节变化——对「打开→保存逐字节不变」的口径是噪音。

**根因**
- `src/App.tsx:2831-2836` `prepareSave()`：
  `let normalized = currentMarkdown()...; if (originalText !== null && originalText.endsWith('\n') && !normalized.endsWith('\n')) normalized += '\n'`
  只在原文本来有尾换行时才补。新文档 `originalText === null`，于是永远不补。
- 新建工作区文件的写盘入口 `src/App.tsx:2678-2691` `saveIntoWorkspace` 直接 `writeNode(file, withEol)`，`withEol` 就是上面没补换行的值。

**修复建议**
1. `prepareSave` 对「首次保存（`originalText === null`，或 `hasSavedBaselineRef.current === false`）」保证有且仅有一个尾换行，对已有文件继续按原文保留。
2. 加单测（纯函数层最好）：新建文档序列化结果 `endsWith('\n') === true`；已有文件不含尾换行时保存后仍不含；含尾换行时保存后只多一个。
3. E2E 断言可直接抄 `.tmp/e2e-r46-bug-b.mjs` 的 b1 段：`readFakeFile(page,'未命名.md')` 断言 `endsWith('\n')`。

**影响面**：仅新建文件首次保存的字节；不丢数据、不改正文内容。发现于真实路径（路径 1/2 都经过它），两次独立运行结果一致（`.tmp/r46-a.log`、`.tmp/r46-b.log`）。

---

## 旧条目复测（不计入 actionable）

- **第 45 轮 F2（`Ctrl+K` 预填缺字）本轮未复现**：同样 `Home` + `Shift+→`×3 选中「甲的第」，浮层「链接文字」= `"甲的第"`（3 字，与选区等长）；`End`+`Shift+Home` 整行 → 预填整行全文（`.tmp/r46-b.log` 的 `## b5-keyboard`：`sel3:"甲的第"` / `linkPrefill.text:"甲的第"` / `selAll:"甲的第一段文字。第二处文字。"` / `linkPrefillAll` 同值）。差别：本轮每次扩选后停 300 ms 再按 `Ctrl+K`，第 45 轮是连按。判为**上一轮脚本没有等待 ProseMirror 选区同步**造成的假阴，产品侧未改任何代码；建议下一轮用同一脚本复测一次再决定是否销掉这条待办。
- **第 45 轮 F1（恢复态误判脏）已修并复验**：首次启动 → 格式化 → `Ctrl+S`（假 picker 存 `另存为.md`）→ 刷新，恢复后 `name:"另存为.md"`、`dirty:false`，源码框值 = `localStorage['sidelight.doc.v1'].text`，标题跟随（`.tmp/r46-a.log` 的 `## p1-saved`/`## p1-reloaded`）。**恢复后切源码的专项回归**（`.tmp/e2e-r46-bug-e.mjs`，`.tmp/r46-e.log`）：打开 `甲.md` 打「丁」保存（盘上 `# 甲\n\n甲的第一段文字。丁\n`）→ 刷新 → `restored {name:"甲.md", mode:"edit", dirty:false}` → `Ctrl+/` 进源码 `{mode:"source", dirty:false, srcLen:15, endsNl:true}` → 回编辑仍 `false` → 再点 `乙.md` **不弹**「切换文档」（`dialog.open:false`，`name:"乙.md"`）。第 45 轮 F1 不再复现。
- **改名/删除/撤销路径未在本轮重跑**：`＋ 新建` 按钮旁的行操作菜单本轮脚本没取到（选择器过期，`.tmp/r46-a.log` 的 `## p2-rename skipped`），未判产品失败；该路径第 45 轮 a4/a6/a7 已实测，不在本轮重复计。

---

## 8 条路径的覆盖与判定

| # | 路径 | 结论 | 证据 |
| --- | --- | --- | --- |
| 1 | 空文档输入 → 加粗/标题/列表/引用/代码块 → 保存 → 刷新恢复 | 通过（字节尾见 F1） | `r46-a.log` p1-dom：`h1:1 / strong:["粗体文字"] / ul:1 / li:1 / quote:1 / pre:1`；p1-bytes：`# 第一章\n\n**粗体文字**\n\n- 列表项\n\n> 引用文字\n\n\`\`\`js\nconst a = 1\n\`\`\`\n\n`；p1-reloaded：`dirty:false`、标题 `另存为.md — Sidelight` |
| 2 | 打开文件夹 → 树打开/新建/展开/刷新 | 通过（改名/删除由第 45 轮背书） | `r46-a.log` p2-tree 7 行；p2-expand-assets `aria-expanded:true` 出现 `assets/图.md`，再点收起；p2-refresh 无假差异提示；p2-newfile toast「已新建 未命名.md」、树 8 行；`r46-b.log` b1 新建 → 保存 → 重开 |
| 3 | 键盘与焦点 | 通过 | `r46-b.log` b5：`Ctrl+K` 预填 = 选区；`Ctrl+1` h1 1→2、`Ctrl+0` 回 1；`Ctrl+F` 焦点 `find-input`，`Esc` 后回 `.ProseMirror`（`contenteditable:true`）；`Ctrl+M` 焦点 `math-inline-input`（`aria-label`「行内公式 LaTeX」），输入 `x^2` 回车得 `.katex` 1 个 |
| 4 | 公式/表格/脚注/坏 Mermaid 往返 | 通过（frontmatter/引用式链接未在界面重跑，见 UNVERIFIED） | `r46-c.log` c1：源码里删掉脚注定义后 `Ctrl+S` 弹「保存前确认」，按钮「在源码模式看原文 / 取消 / 仍然保存」，假盘字节**仍是原文**（守卫有效）；c2 坏 Mermaid：`svg:0`、0 错误、正文无替换（本段脚本在切换文档确认框处中止，fence 原文逐字未证） |
| 5 | 源码/预览/专注/打字机/字号/窄窗 | 通过 | `r46-b.log` b2：源码 `mode:source`、`dirty:false`；`Ctrl+Shift+P` 预览 `.preview-column` 有文本；专注 `app focus-mode`；打字机按钮 `is-on`；`Ctrl+=` 17→18 px；b4 窄窗 1024×700 宽表（8 列）与 220 字长链接：`docScroll cw=sw=806`、`overflowButtons:0`、`pageXOverflow:0`，预览态 `796/796`，截图 `bug-b-narrow-wide-table.png`、`bug-b-narrow-long-url.png`、`bug-b-narrow-wide-table-preview.png` |
| 6 | 控制台 0 error；错误路径 | 通过 | 四套脚本 `## z-errors {"errors":[]}`；脚注守卫见路径 4；6 MB 拒绝分支由第 45 轮背书（本轮未重跑） |
| 7 | 大文档 100 KB / 1 MB | **UNVERIFIED** | 本轮时间预算只跑小文档。补法：`.tmp/make-bigfile.mjs` 生成后按第 39 轮 `.tmp/e2e-r39-code-1mb-multi.mjs` 的 `performance.mark` 口径取最后一条 |
| 8 | 自动保存 / 撤销重做 / 字数面板 | 通过 | `r46-d.log` d1：打字 3.4 s 后 `dirty:false`、「已自动保存」、盘上有新字；`Ctrl+Z` → `dirty:true` 正文回原样，`Ctrl+Shift+Z` → `dirty:false`；字数面板 `open:true`、焦点 `stats-detail`、中日韩字 19/字符 21/句 3/段 1，`Esc` 后焦点回 `stats-trigger` |

**特意验证、没有问题的点**
- 恢复态不再「切一次源码就变脏」：恢复文档进源码 `mode:"source", dirty:false`，回编辑仍 `false`（`.tmp/r46-a.log` p1-reloaded；`.tmp/r46-b.log` b2 的 `srcMode.dirty:false`）。
- 新文件重开、再进源码都不脏（b1 的 `reopenNew`/`reopenNewSource`）——F1 只是字节约定，不是第 45 轮 F1 的同类脏问题。
- 窄窗长链接不撑破布局（`pageXOverflow:0`），表格与工具栏都不越界。
- 脚注定义丢失拦截仍有效，取消后盘上字节不变（c1 `disk` 等于原文）。

---

## UNVERIFIED（写清怎么补）

1. **路径 7 的 100 KB / 1 MB**：载入、滚动、逐键 p95、保存。补法见上表。
2. **`Ctrl+K` 鼠标拖选路径**：本轮只跑键盘选区（与第 45 轮 UNVERIFIED 1 同一条）。
3. **frontmatter / 引用式链接 / 表格 / callout / 行内 HTML 的界面内往返**：本轮靠既有 `npm run roundtrip` 与 fidelity 套件背书，没有逐条在界面重跑（本轮未跑 `npm test`/`roundtrip`，那是 tester 的活）。
4. **坏 Mermaid 的 fence 原文逐字断言**：`r46-c.log` c2 只拿到 `svg:0` 与 0 错误，取 `pre.textContent` 时脚本在「切换文档」确认框处中止；补法：先 `Ctrl+S` 消除脏状态再切文件。
5. **文件树改名/删除/撤销**：本轮脚本选择器过期（行操作按钮未取到），未判产品失败；补法：用第 45 轮 `.tmp/e2e-r45-bug-a.mjs` 的选择器。
6. **主题设置对话框**：本轮按 `[aria-label*="设置"]`/`[title*="设置"]` 没找到入口（`.tmp/r46-b.log` b3 的按钮清单里只有「文件/大纲/…」），设置应在「文件」菜单里；主题切换本身第 45 轮已实测。
7. **宿主/真机**：WebView2 写回、`close-request`、IME、macOS 全部未测。

---

## 本轮脚本（可重跑，均带 `node .tmp/reset.mjs 9222` 前置）

| 脚本 | 覆盖 | 日志 |
| --- | --- | --- |
| `.tmp/e2e-r46-bug-a.mjs` | 路径 1/2/5（空文档格式化→picker 保存→刷新恢复；树打开/新建/展开/刷新） | `.tmp/r46-a.log` |
| `.tmp/e2e-r46-bug-b.mjs` | **F1 证据** + 路径 3/5（新文件保存字节、视图、字号、窄窗溢出、Ctrl+K/1/0/F/M） | `.tmp/r46-b.log` |
| `.tmp/e2e-r46-bug-c.mjs` | 路径 4/6（脚注守卫、坏 Mermaid、控制台） | `.tmp/r46-c.log` |
| `.tmp/e2e-r46-bug-d.mjs` | 路径 8（自动保存、撤销重做、字数面板） | `.tmp/r46-d.log` |
| `.tmp/e2e-r46-bug-e.mjs` | 第 45 轮 F1 回归（刷新恢复 → 切源码 → 切另一篇） | `.tmp/r46-e.log` |

截图：`shots/round-46/bug-a1-format.png`（格式化后的正文）、`shots/round-46/bug-b-narrow-wide-table.png`（1024 宽 8 列表格无溢出）、`shots/round-46/bug-c-footnote-guard.png`（脚注定义丢失拦截框）。
