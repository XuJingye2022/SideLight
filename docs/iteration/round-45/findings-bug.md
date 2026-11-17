# 第 45 轮 · 缺陷猎人报告（finder-bug）

- 轮次：round 45　　轮前 startSha：`021cbd35d0a0422e519b5c008a3d47fca1bdccbb`（实测 `git rev-parse HEAD` 同值）
- 环境：dev server `http://localhost:5175`（未重启）、CDP 9222、每套脚本前 `node .tmp/reset.mjs 9222`
- 方式：Playwright `connectOverCDP` + `.tmp/r30-fsa.mjs` 的假 FSA 工作区，真跑界面，全部只读产品代码
- 结论：**2 条新发现可执行**（P1 ×1、P2 ×1），另 3 条旧条目复现只记 note，控制台全程 0 error

---

## F1（P1）刷新/重开后没改一个字，切一次源码就变「脏」：弹「切换文档」、Ctrl+S 另存出新文件

**复现步骤**（脚本 `.tmp/e2e-r45-bug-d.mjs`，日志 `.tmp/r45-d.log`；同现象在 `.tmp/e2e-r45-bug-e.mjs` / `.tmp/r45-e.log` 复现）

1. 打开假工作区，点 `甲.md`，正文末尾输入「丁」，`Ctrl+S`。盘上得到 `# 甲\n\n甲的第一段文字。第二处文字。丁\n`（`## d1-saved`）。
2. 刷新页面（F5）。应用从 `localStorage['sidelight.doc.v1']` 恢复正文：`name=甲.md`、`dirty=false`、文件树为空（`## d2-restored`）。
3. 按一次 `Ctrl+/` 进源码，**不改任何字符**。立即读 `window.__slState.dirty` → `true`（`## d3-dirty-impact` 的 `srcOn`）。
4. 再按 `Ctrl+/` 回编辑视图，`dirty` 仍是 `true`（`srcOff`）。
5. 打开文件夹，点 `乙.md` → 弹出「切换文档」确认框：
   `dialog: "切换文档"`、正文「切到「乙.md」之前，要先把当前这篇存下来吗？」、按钮「取消 / 不保存 / 保存并切换」（截图 `shots/round-45/bug-d-switch-prompt.png`）。
6. 点「取消」后按 `Ctrl+S`：toast「已保存到 未命名.md」，`__slState.name` 从 `甲.md` 变成 `未命名.md`（`## d4-save-after-view`）。

**期望 vs 实际**
- 期望：只切视图、不改字，文档保持 `dirty=false`；切文档与关窗不弹确认；`Ctrl+S` 不产生新文件。
- 实际：恢复出来的文档一进源码就变脏，触发「切换文档」三选一；无句柄时 `Ctrl+S` 落成一篇新的 `未命名.md`，用户会以为原文件已被保存。

**字节级证据（为什么脏）**
- `localStorage['sidelight.doc.v1']` 的正文 = `"# 甲\n\n甲的第一段文字。第二处文字。丁\n"`（末尾有换行）。
- 同一时刻源码框值 = `"# 甲\n\n甲的第一段文字。第二处文字。丁"`（**末尾没有换行**，`srcEndsWithNewline:false`）。
- 保存基线由 `serializeDocument()` 生成，带结尾换行：`src/App.tsx:1031-1035`。
- 刷新恢复后 `rawTextRef.current === null`，`switchView('source')` 只能走 `currentMarkdown()` 兜底：`src/App.tsx:3913-3922`。
- 源码态 effect 直接按字节比 `sourceText !== baselineRef.current`：`src/App.tsx:1885-1892`。两者只差结尾换行，于是判成脏。

**修复建议**
1. 会话恢复（`localStorage` / 草稿）后把 `rawTextRef.current` 设成与基线同源的文本；或 `switchView('source')` 在 `rawTextRef` 为空时用 `baselineRef.current` 兜底，不用 `currentMarkdown()`。
2. 源码态脏判定前统一归一化（例如两边都 `replace(/\r\n/g,'\n')` 后比较，并容忍/补齐结尾换行），避免「只差一个尾换行」变成脏。
3. 加回归：载入后「只切源码再切回」→ `dirty` 必须恒 `false`；再点另一篇不出现「切换文档」。可用本轮 `.tmp/e2e-r45-bug-d.mjs` 的 d2/d3 段直接扩断言。

**影响面**：只在「刷新/重开后恢复」的文档上出现（首启空白文档 `Ctrl+/` 实测 `dirty` 保持 `false`，`.tmp/r45-f.log` 的 `## f1-blank-source`；假工作区里正常打开的文档也不脏，`.tmp/r45-b.log` 的 `## b1-view-toggle-dirty`）。恢复场景恰好是用户高频路径（重开应用、刷新）。

---

## F2（P2）键盘扩选后按 Ctrl+K：链接文字只带选区的一部分，回车后残缺文字被写成链接

**复现步骤**（`.tmp/e2e-r45-bug-f.mjs` 的 `## f3-link-prefill`；另见 `.tmp/e2e-r45-bug-e.mjs` 的 `## e1-link-prefill`、`.tmp/e2e-r45-bug-g.mjs` 的 `## g1`）

1. 打开 `甲.md`，正文段落是「甲的第一段文字。第二处文字。」，点段落把光标放进去。
2. 按 `Home`，再按 `Shift+→` 三次。读 `window.getSelection().toString()` = `"甲的第"`（3 字）。
3. 按 `Ctrl+K`。浮层「文字」框的值只有 `"甲"`（1 字）。
4. 在「地址」框填 `https://e.com`，回车。正文里 `a.textContent` 只有 `"甲"`，剩下的「的第」留在链接外面；存盘同样只有 1 字进链接。
5. 换成长度再测：`Home` + `Shift+→` 五次（选区 `"甲的第一段"`，5 字）→ 浮层 `"甲的第一"`（4 字）；2 字选区 → 1 字。
6. 对照：`End` 之后 `Shift+Home`（整段 15 字）→ 浮层是完整的 15 字。

**期望 vs 实际**
- 期望：`Ctrl+K` 的「文字」框预填选区全文，用户直接回车就得到整段链接。
- 实际：预填只到选区前 N-1～N-2 字（实测 2→1、3→1、5→4），回车后只有前缀变链接；用户通常不会先检查这个框。

**证据**
- 浮层文字长度与选区长度不一致：`sel5:"甲的第一段"` / `link5.text:"甲的第一"`（`## e1-link-prefill`）；`sel3:"甲的第"` / `link3.text:"甲"` / 结果 `anchors:["甲"]`（`## f3-link-prefill`）。
- 截图：`shots/round-45/bug-g-link-prefill.png`。
- 涉及代码：`src/App.tsx:4159-4186`（`openLinkAtCursorRef.current` 里 `editor.state.doc.textBetween(from, to, ' ')`）。

**根因（未定，给下一步）**：整段 `Shift+Home` 正常、`Home` 起头的 `Shift+→` 扩选会缺字，说明 `Ctrl+K` 读到的 ProseMirror 选区与 DOM 选区在这条路径上不同步（缺 1～2 字不稳定）。下一轮先 dump `editor.view.state.selection` 与 `window.getSelection()` 的逐次按键读数再改。

**修复建议**
1. 在 `openLinkAtCursorRef` 开头强制同步一次选区（例如先 `editor.commands.focus()` 再读，或下一帧再读 `editor.state.selection`）。
2. 打开浮层时用 `to - from` 长度自检：若 `text.length !== to - from`，退回用 DOM 选区文本 `window.getSelection().toString()`。
3. 加 E2E：`Home` + `Shift+→`×3 → 浮层 `value.length === 3`；`End` + `Shift+Home` → 等于整段。现有 `keyboard-acceptance` 只断言「`Ctrl+K` 能打开浮层」，没有断言预填文字。

---

## 旧条目复现（不计入 actionable）

- **改名后的 toast 仍是「已刷新：新增 1 个，消失 1 个」**（`.tmp/r45-a.log` 的 `## a4-rename`）：第 29 轮 bug 第 2 条，第 13/31 轮复现，本轮仍未修；`handleRenamedFile` 走 `refreshTree({mode:'adopt'})`，`src/App.tsx:2301` 的 diff 提示照旧覆盖。用户会以为文件被别人动过。
- **`.find-bar` 没有 `role="search"`**（`.tmp/r45-b.log` 的 `## b3-find-esc`：`role:null`）：第 44 轮待办池「界面细化」已列，不重复。
- **源码模式字数口径、`[toc]`、表格 `colwidth` 导出清理、Mermaid SVG id 唯一**：都在 `STATE.md` 待办池，本轮未重复计。

---

## 8 条路径的覆盖与判定

| # | 路径 | 结论 | 证据 |
| --- | --- | --- | --- |
| 1 | 新建/格式化 → 保存 → 重开 | 通过（除 F1 的刷新恢复分支） | `r45-a.log` a2/a5/a8：新建 `未命名.md` 立即成为当前文档并落盘；改名后 `Ctrl+S` 写新名、旧键消失、标题跟随；切走再切回正文来自磁盘、`dirty:false`、字节一致 |
| 2 | 文件树 新建/展开/改名/删除/撤销/刷新 | 通过（改名 toast 为旧条目） | `r45-a.log` a1/a2/a3/a4/a6/a7：脏文件删除确认文案正确（「未保存的正文与批注一起删除；撤销会一起搬回」）、trash 收到 `.md` + `.draft` + `.current.md`、点「撤销」文件与草稿都回来（`已恢复 甲改.md`） |
| 3 | 键盘与焦点 | 通过（`Ctrl+K` 见 F2） | `r45-c.log` c1/c3/c4：`Ctrl+M` 出 `$a^2+b^2$` 并落盘；`Ctrl+P` 焦点在 `quick-open-input`、输入「表」过滤到 1 项、回车打开 `表.md`；`Ctrl+1` h1 1→2、`Ctrl+0` 回 1、段落 1→2；`r45-b.log` b3：`Ctrl+F` 后 `Esc` 焦点回 `.ProseMirror`（`contenteditable:true`）；`r45-a.log` a9：`Ctrl+=`/`Ctrl+-` 字号 17→18→16；`r45-f.log` f4：表格 `Tab` 列 0→1、`Ctrl+Enter` 出表格且表格条保留 |
| 4 | 公式/表格/任务项/坏 Mermaid/查找替换 往返 | 通过（frontmatter 等由既有套件覆盖） | `r45-c.log` c1/c2/c5：公式 `$a^2+b^2$`、链接 `[https://…](https://…)`、替换文本 `甲<乙>&$1` 在正文与存盘字节里**逐字节原样**（`$` 没被当正则）；`r45-d.log` d7：坏 Mermaid 只多一个 `is-error` 提示，`pre` 里 fence 原文不变、0 个 `svg`、0 错误；`r45-f.log` f6：勾选任务项后盘上 `- [x] 第一项` |
| 5 | 视图/主题/字号/窄窗 | 通过 | `r45-a.log` a9/a10：源码/预览/专注（`.app.focus-mode`）/打字机（`.is-on`）都生效；设置里点「深色」后 `data-theme=dark`、body `rgb(21,23,26)`（截图 `bug-a-settings-dark.png`）；1440x900 与 1024x700 都 `scrollWidth == clientWidth`、0 个越界按钮（`bug-a-narrow.png`） |
| 6 | 控制台与错误路径 | 通过 | A/C/D/E/F/G/H/I 九套脚本 `errors: []`、`requestfailed` 0（仅 favicon 例外已排除）；6 MB 文件给出可见拒绝「「大.md」超过 5.5 MiB，仍在「甲.md」」且正文不变（`r45-h.log`，截图 `bug-h-big-file.png`）；无句柄保存走新建路径并给「已保存到 未命名.md」提示 |
| 7 | 大文档 100 KB / 1 MB | **UNVERIFIED** | 本轮只跑了 6 MB 拒绝分支。1 MB 载入数据见第 39 轮（单遍 parse ≈110 s），本轮时间预算内未复测 |
| 8 | 重开恢复/自动保存/撤销重做/字数面板/删除撤销 | 通过（恢复态见 F1） | `r45-i.log` i1：只打字 2 s 后自动保存落盘、`dirty:false`、「已自动保存 18:46」；i2：`Ctrl+Z` → `dirty:true`、`Ctrl+Shift+Z` → 回基线 `dirty:false`；i4：字数面板打开后焦点在 `stats-detail`、`Esc` 回到 `.stats-trigger`；删除撤销见路径 2 |

**没有发现问题、特意验证过的点**
- 首启空白文档进出源码**不会**变脏（与 F1 对照，说明缺陷只在恢复分支）。
- 假工作区里正常打开的文档进出源码**不会**变脏，`sl-parse-done` 计数不增加（`## b1-view-toggle-dirty`：`start/afterSourceOn/afterSourceOff/afterPreviewOn/afterPreviewOff` 全 `false`，`parseMarks:3`）。
- 查找替换的替换串里 `$&`/`$1` 不被展开、`<` `>` `&` 不被当 HTML（数据保真正常）。
- `Ctrl+P` 的列表项重复只是我的选择器同时命中 `li` 与 `[role=option]`，产品侧 4 个文件 = 4 项。

---

## UNVERIFIED（写清怎么补）

1. **F2 的鼠标选区路径**：`page.dblclick('.ProseMirror p')` 这次选中的是空处（`mouseSel:""`），没验证「鼠标拖选 + Ctrl+K」。补法：用 `page.mouse.move/down/move/up` 精确拖过 3–5 个字，再按 `Ctrl+K` 读浮层值。
2. **F1 的关窗确认**：浏览器态没有宿主「关窗三选一」，只验证了「切换文档」。补法：跑宿主（WebView2）或注入 `close-request` 后再测。
3. **路径 7 的 100 KB / 1 MB**：载入、滚动、逐键 p95、保存。补法：`.tmp/make-bigfile.mjs` 生成后按第 39 轮 `.tmp/e2e-r39-code-1mb-multi.mjs` 的埋点口径取 `performance.mark` 最后一条。
4. **最近文件 / 草稿对话框 / 恢复提示**：本轮没点「继续上次」，只测了 `localStorage` 正文恢复。补法：清 IndexedDB 后重开，验证「继续上次」按钮与三种权限态。
5. **frontmatter/脚注/inline HTML/callout 的应用内往返**：本轮靠既有 `npm run roundtrip` 与 fidelity 套件背书，没有逐条在界面上重跑。
6. **焦点环像素级颜色**：本轮只验证焦点落点（`activeElement`），没有量 `outline`/`box-shadow`；第 42 轮有 `outline:none + inset 阴影` 的记录。
7. **一次未复现的怪状态**：`.tmp/r45-c.log` 里打开带 Mermaid 的文件后再点另一篇，Playwright 报树元素 `inert`；用 `.tmp/e2e-r45-bug-d.mjs` 重跑 6 次都 `inert:false`（`## d6`/`## d7`），判为当次脚本状态残留，未计为缺陷。若下一轮再遇到，先 dump `sidebarTab` 与 `hidden/inert` 两个属性。

---

## 本轮脚本（可重跑，均带 `node .tmp/reset.mjs 9222` 前置）

| 脚本 | 覆盖 | 日志 |
| --- | --- | --- |
| `.tmp/e2e-r45-bug-a.mjs` | 路径 1/2/5（编辑保存重开、树操作、视图主题窄窗） | `.tmp/r45-a.log` |
| `.tmp/e2e-r45-bug-b.mjs` | 路径 3/6（键盘、查找、错误路径；`b7` 之后因残留浮层中断，已由 C/F 补齐） | `.tmp/r45-b.log` |
| `.tmp/e2e-r45-bug-c.mjs` | 公式/链接/标题/快速打开/替换/恢复/错误路径 | `.tmp/r45-c.log` |
| `.tmp/e2e-r45-bug-d.mjs` | **F1 复现 + 用户可见影响**、链接焦点、Mermaid 后树状态 | `.tmp/r45-d.log` |
| `.tmp/e2e-r45-bug-e.mjs` | F1 字节证据、F2 第一次读数 | `.tmp/r45-e.log` |
| `.tmp/e2e-r45-bug-f.mjs` | F2 复现 + 表格键 + 6 MB + 任务勾选 | `.tmp/r45-f.log` |
| `.tmp/e2e-r45-bug-g.mjs` | F2 鼠标/键盘对照 | `.tmp/r45-g.log` |
| `.tmp/e2e-r45-bug-h.mjs` | 6 MB 拒绝路径干净复测 | `.tmp/r45-h.log` |
| `.tmp/e2e-r45-bug-i.mjs` | 自动保存/撤销重做/字数面板 | `.tmp/r45-i.log` |

截图都在 `shots/round-45/bug-*.png`（20 张），报告只引用关键的 4 张。
