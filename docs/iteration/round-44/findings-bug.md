# 第 44 轮 · 缺陷猎人（端到端，只读）报告

- 轮次：round=44，nn=44，报告目录 `docs/iteration/round-44`，CDP 端口 9222。
- 轮前 `startSha=d22807f4361a32d06a49f6645d610511f3ce7bb7`；收工时 `git rev-parse HEAD` 仍是 `d22807f`，`git status --porcelain` 只有 `?? docs/iteration/round-44/` 与 `?? shots/round-44/`（`.tmp/` 被忽略）。产品代码 0 改动。
- 环境：dev server `http://localhost:5175`（未另起、未重启、未 kill `msedge`）；CDP 9222 上的 headless Edge；每个脚本前跑 `node .tmp/reset.mjs 9222`。
- 本轮新增可执行条目：**2 条，都是 P2（1 条指标口径缺陷、1 条「禁用却不解释」的可用性缺口）**。真跑 8 条路径中的 6 条 + 2 条额外专项；2 条 UNVERIFIED 写在最后一节。
- 本轮**关闭**第 43 轮的一条 UNVERIFIED：真实图片拖入正文（第 43 轮说合成 DataTransfer 进不了 ProseMirror）——加 `clientX/clientY` 就能进，见 §note.3。

## 结论摘要

1. **P2**：**同一个文档，编辑视图 11 字，源码视图 28 字**。状态栏在源码模式用「源码原文」算字数（把链接地址、图片路径这类 Markdown 语法也算成拉丁词），编辑/预览视图用正文文本算。切一次 `Ctrl+/`，数字跳 2.5 倍，标签却一模一样（都是「N 字 · 阅读约 N 分钟」）。作者按字数控制篇幅时会被误导。
2. **P2**：**预览 / 源码视图里 7 个工具栏按钮被禁用，但不说明原因**。第 43 轮给 `插入 ▾`、`H1`、`H2`、`B`、`I`、`S`、`</>` 加了 `disabled={viewMode !== 'edit'}`，`title` 仍是「粗体 / 斜体 / 行内代码」这类功能名（`插入 ▾` 连 `title` 都没有）；同一行的「专注 / 打字机」却会切成「只有编辑视图支持」。用户看到灰按钮，悬停后得不到「为什么不能按」。

---

## 1（P2，指标口径缺陷）源码模式的字数是「源码口径」，与编辑/预览不一致，切换视图数字会跳

**复现步骤**（`.tmp/e2e-r44-bug-e.mjs`）

1. 假工作区种 `口径.md`：`# 口径\n\n见 [链接](https://example.com/very/long/path) 与图片 ![图](assets/a-pic.png)。\n\n正文[^1]。\n\n[^1]: 脚注定义正文。\n`。
2. 「文件 ▾ → 打开文件夹…」→ 点 `口径.md`，读状态栏（编辑态）。
3. 点状态栏字数入口，看明细面板。
4. 按 `Ctrl+/` 进源码模式，再读状态栏；`Ctrl+/` 回来，再按 `Ctrl+Shift+P` 进预览读一次。

**证据**（`.tmp/e2e-r44-bug-e.log`、`.tmp/e2e-r44-bug-a.log`）

| 步骤 | 观察 |
| --- | --- |
| `## e5-edit-stats` | `{"mode":"edit","bar":"11 字 · 阅读约 1 分钟","paras":2}` |
| `## e6-stats-detail` | 明细面板：「中日韩字 **10** / 拉丁词 **1** / 合计 **11** / 字符 16 / 句 2 / 段 2 / 阅读 1 分钟」 |
| `## e7-source-stats` | `{"mode":"source","bar":"28 字 · 阅读约 1 分钟"}` —— **同一文档，只切了视图** |
| `## e8-preview-stats` | `{"mode":"preview","bar":"11 字 · 阅读约 1 分钟"}` —— 预览与编辑一致，只有源码不一致 |
| `## b0`→`## b1`（另一份文档，`.tmp/e2e-r44-bug-b.log`） | `甲.md`：编辑 `7 字` → 同一文档进源码 `10 字`，差值正是 `https` / `example` / `com` 三个拉丁词；`## a9`→`## a10`（另一篇 `甲.md`）14 → 17 同理 |

截图：`shots/round-44/bug-a-preview.png`（预览态），源码态读数见日志。

**根因**

- `src/App.tsx:5125`：`stats={sourceMode ? countText(splitFrontmatter(sourceText).body) : stats}` —— 源码模式直接把**原始 Markdown 文本**交给 `countText`。
- 编辑态来自 `src/App.tsx:1017`（另有 `:900`）：`setStats(countText(current.state.doc.textContent))` —— 用编辑器正文的纯文本，链接地址与图片路径不在 `textContent` 里。
- `src/lib/wordcount.ts:47-57`：`countText` 对传入文本数中日韩字与「拉丁词」，因此 `](https://example.com/very/long/path)`、`![图](assets/a-pic.png)` 里的 10 个拉丁片段在源码态被计入、编辑态不计入。
- 预览态（`e8`）与编辑态相同，说明这不是「源码才是正确口径」，而是两种口径混用。

**期望 vs 实际**

- 期望：同一个文档、同一个标签，字数不因换视图而变；要变就给出口径说明（例如「源码 28 字」）。
- 实际：切到源码模式，`11 字` 变 `28 字`，`阅读约 N 分钟` 也跟着可能变（长文里会跳分钟数）。作者用状态栏控制篇幅时，数字不可信。

**修复建议**（三选一，成本都小）

1. 源码模式沿用编辑态 `stats`，只在源码文本被编辑后按同一口径重算（`sourceText === sourceBaselineRef.current` 时直接用 `stats`）。
2. 给源码模式改标签：`formatStats` 加一个前缀「源码 N 字」，或状态栏 title 写清「按 Markdown 源文计」。
3. 若要保留源码口径，先把 `](…)`、`![…](…)`、围栏 info string、行内 HTML 属性剥掉再 `countText`（要补 `wordcount.test.ts` 用例：链接地址与图片路径不计入）。

**成本**：S（`App.tsx:5125` 一处表达式；方案 3 另加一个纯函数 + 单测）。

---

## 2（P2，可用性缺口）预览 / 源码里被禁用的工具栏按钮不解释原因，与「专注 / 打字机」不同

**复现步骤**（`.tmp/e2e-r44-bug-a.mjs`、`.tmp/e2e-r44-bug-f.mjs`）

1. 打开任意文档，按 `Ctrl+Shift+P` 进预览（或 `Ctrl+/` 进源码）。
2. 悬停工具栏的 `插入 ▾`、`B`、`I`、`S`、`</>`。
3. 对照同一行右侧的「专注」「打字机」的悬停提示。

**证据**

| 步骤 | 观察 |
| --- | --- |
| `## a1-preview-buttons` | `{"buttons":{"insertMenu":{"disabled":true},"bold":{"disabled":true},"toolbarVisible":true}}`；源码态 `## a7-source-buttons` 同 |
| `shots/round-44/bug-a-preview.png` | 预览态工具栏：`插入 ▾ H1 H2 B I S </>` 全部 0.4 透明度（`src/styles.css:142-145` 的 `button:disabled`），没有任何文字说明 |
| 代码对照 | `src/App.tsx:4646`（插入 ▾）只有 `disabled={viewMode !== 'edit'}`，无 `title`；`:4714`（H1）、`:4723`（H2）、`:4732`（B）、`:4738`（I）、`:4741`（S）、`:4744`（`</>`）的 `title` 是「粗体 / 斜体 / 删除线 / 行内代码」；而 `:4755-4756`（专注）、`:4764-4765`（打字机）的 `title` 按视图切换成「只有编辑视图支持」 |
| `## f0`（另一条脚本） | 预览态试图点「专注」：Playwright 报「element is not enabled」→ 证明 `专注 / 打字机` 早在第 43 轮前就是同一口径的禁用，并且**有**解释 |

**期望 vs 实际**

- 期望（产品自己第 42/43 轮的写法）：只读视图里的入口要说明「为什么不能按」，`FindBar` 在预览态写「预览是只读视图，不支持查找与替换」、专注 / 打字机写「只有编辑视图支持」。
- 实际：第 43 轮新禁用的 6 个按钮只有灰度和光标变化；`插入 ▾` 悬停完全没有提示，`B` 悬停只说「粗体」。用户不知道是「这个视图不能编辑」还是「功能坏了」。

**修复建议**

- 给这 7 个按钮加同一句 `title`：`viewMode === 'edit' ? '粗体' : '只有编辑视图支持'`（`插入 ▾` 用 `'插入（只有编辑视图支持）'`），与 `:4756` 的写法保持一致；`aria-disabled` 不需要，原生 `disabled` 已够。
- 可选：预览态在工具栏左端加一句 `.toolbar-note`「只读预览：切回编辑（Ctrl+Shift+P）」——但最小改动是 `title`。

**成本**：S（6 处 `title` 条件表达式）。

---

## 路径实测结果（本轮真跑，截图在 `shots/round-44/`）

| 路径 | 做了什么 | 结果 | 证据 |
| --- | --- | --- | --- |
| 1 新建 → 输入 → 排版 → 保存 → 刷新恢复 | 树头「＋ 新建」→ 打「甲标题」→ `Ctrl+2` → `Ctrl+B` 加粗 → 列表一项 → `Ctrl+S` → 用盘上字节重装假工作区 → reload → 重开文件夹 → 打开 `未命名.md` | 通过。字节 `## 甲标题\n\n**加粗句**\n\n- 一项\n\n`、提示「已保存 未命名.md」；重开后 HTML `<h2>甲标题</h2><p><strong>加粗句</strong></p><ul>…`、标题 `未命名.md — Sidelight`、`dirty:false` | `.tmp/e2e-r44-bug-d.log` 的 `## d1`–`## d2` |
| 2 文件树 | 新建（落盘，`files` 4 条）→ 右键 `树.md` 看到菜单 → 尝试重命名 | 部分通过。右键菜单两项「重命名 / 删除（移到回收站）」（`## d3`）；**重命名与删除+撤销本轮脚本没打中**（我的输入框/确认框选择器过期，`## d4` 文件列表未变），第 43 轮已真跑通过 —— 记 UNVERIFIED，不判产品失败 | `.tmp/e2e-r44-bug-d.log` 的 `## d3`–`## d4` |
| 3 键盘 | `Ctrl+1`（预览态）、`Ctrl+K`、`Ctrl+M`、`Ctrl+/`（进/出源码）、`Ctrl+Shift+P`、`Esc`（回编辑）、`Ctrl+End`、`Ctrl+A` + `Ctrl+B`（预览态）、`Ctrl+S` | 通过。预览态 `Ctrl+K/M` 只弹「这个视图不能插入公式或链接：先按 Ctrl+/ 或 Ctrl+Shift+P 回编辑」且 `dirty:false`、无弹层（第 43 轮 P1 已修好，`## a2`/`## a3`）；预览态 `Ctrl+1` 正文不变（`## a4`）；源码里点进 `textarea` 后 `Ctrl+/` 能退出并落正文（`## b1`→`## b3`，`XY` 进正文、`dirty:true`）；`Ctrl+S` 字节 `…# XY\n`（`## b5`）；预览态 `Ctrl+A`+`Ctrl+B` 无 `strong`（`## c4`）；`Esc` 从预览回编辑（`## b10`、`## c5`） | `.tmp/e2e-r44-bug-a.log`、`.tmp/e2e-r44-bug-b.log`、`.tmp/e2e-r44-bug-c.log` |
| 4 样张往返 | `样张.md`（frontmatter + 脚注定义含 `**粗体**` + `$x^2$` + 行内 `<kbd>` + 单波浪号 + callout + 表格 + mermaid）打开 → `Ctrl+S` → 逐字节比对 | 通过：`same:true`、`diff:0`；编辑视图 `katex:1`、`svg:1`、`s:0`（`H~2~O` 没变删除线）；无风险对话框 | `.tmp/e2e-r44-bug-d.log` 的 `## d7`–`## d8` |
| 5 视图 / 窄窗 | 预览 + 公式文档（KaTeX 就绪、无「加载中」）、1024×700 窄窗、字数入口 | 通过：`式.md` 预览 `katex:1`、`math-pending-note:null`（`## c3`）；1024×700 `scrollW=clientW=1024`、无横向溢出（`## d9`，`shots/round-44/bug-d-narrow.png`）。深色主题本轮未重新量 → UNVERIFIED | `.tmp/e2e-r44-bug-c.log` 的 `## c3`、`.tmp/e2e-r44-bug-d.log` 的 `## d9` |
| 6 控制台与错误路径 | 6 份脚本全程挂 `console`/`pageerror`/`requestfailed`；含禁用按钮点击失败（预期）、删改失败分支 | 通过：5 份脚本末行 `## z-errors` 都是 `{"errors":[]}`（`d` 脚本的 z 行亦为空），没有页面异常 | 各 `.log` 末行 |
| 7 大文档 | `大100.md`（1,200 段、种子 **147,548 B**）：打开 → 点正文 → `Ctrl+End` → 连打 3 字 → `Ctrl+S` | 通过：载入 2,542 ms（含等 2.5 s 的窗口）、1,200 个 `p`、`42,003 字`、`scrollHeight 100,269`；`Ctrl+End` 后 `scrollTop 99,241`（到底）；逐键 **29 / 31 / 26 ms**；保存后字节 +3 且含 `甲乙丙`、提示「已保存 大100.md」 | `.tmp/e2e-r44-bug-e.log` 的 `## e1`–`## e4` |
| 8 重开恢复 / 最近 / 草稿 / 批注 | 未真跑 | UNVERIFIED（见下表） | — |
| 额外 A：拖入文件 | 编辑态：非图片 `note.txt` 拖到正文、真 PNG 拖到正文（**带 clientX/clientY**）、PNG 拖到工具栏 | 通过：`.txt` 只弹「拖入的文件不会直接打开…」正文不变（`## b6`）；**PNG 进正文 `imgs:1`、`dirty:true`、无提示**（`## c1`，`shots/round-44/bug-c-drop-png.png`），`Ctrl+S` 后字节 `![pic.png](assets/mwkhr8ou-pic.png)`（`## c2`）；PNG 拖到工具栏只弹提示（`## a15`、`## b8`） | `.tmp/e2e-r44-bug-b.log`、`.tmp/e2e-r44-bug-c.log` |
| 额外 B：只读视图边界 | 预览态点工具栏禁用按钮、点链接、开导出菜单、开设置；源码态开「文件 ▾」菜单 | 通过：导出菜单在预览态可用（`HTML / Markdown / 纯文本 / 打印 / PDF`，`## a6`）；文件菜单在源码态可用（新建 / 关闭 / 另存为 / 打开文件 / 打开文件夹 / 查找替换全部 `disabled:false`，`## a8`）；预览链接 `<a href="https://example.com">` 是 `cursor:pointer`、点击未被任何监听器 `preventDefault`（`## d10`，URL 未跳转是 headless 无外网，不是产品拦截） | `.tmp/e2e-r44-bug-a.log`、`.tmp/e2e-r44-bug-d.log` |

## note（去重、按设计、脚本注意，不计入 actionable）

- **与第 42/43 轮不重复**：第 42 轮 P1「预览里替换没锁」、第 43 轮 P1「预览里 `Ctrl+M`/`Ctrl+K` 改正文」、第 43 轮 P2「弹层 `Esc` 连带退出视图」本轮**全部复测为已修**：`## a2`/`## a3` 只弹提示、`dirty:false`、无弹层；`## b3` 源码态 `Ctrl+/` 正常退出且文本落正文；`.tmp/e2e-r43-bug-h` 的弹层 Esc 路径未再复现（本轮未重跑该脚本）。
- **与 STATE.md 待办池不重复**：待办池没有「源码字数口径」与「禁用按钮无解释」这两条；`docs/iteration/round-4*/findings-*.md` 也没有（`docs/qa-report.md:78` 是 0.10.3 的「源码模式里字数不更新」，早已修，与口径不同）。
- **正向结论（本轮关闭第 43 轮 UNVERIFIED）**：真实图片拖入正文可用。第 43 轮 `impl.md:171` 说「合成的 DataTransfer 走不进 ProseMirror 的 `handleDrop`」，原因是 `prosemirror-view` 的 `handleDrop`（`node_modules/prosemirror-view/dist/index.cjs:3651-3655`）先做 `view.posAtCoords(eventCoords(event))`，`clientX/clientY` 为 0 时返回 null 直接 return，走不到 props 的 `handleDrop`。补上坐标后：`## c1` 得到 `imgs:1`、`dirty:true`、`toast:null`，`Ctrl+S` 后盘上字节 `![pic.png](assets/mwkhr8ou-pic.png)`。**窗口层拖入守卫尊重 `defaultPrevented`，没有把图片插入拦掉**。后续脚本要测拖入，必须带 `clientX/clientY`（`.tmp/e2e-r44-bug-c.mjs` 的 `dropOn`）。
- **按设计，不算缺陷**：① 预览 / 源码里 `插入 ▾`、`H1 H2 B I S </>`、`专注`、`打字机` 全部 `disabled`（第 43 轮统一口径，`App.tsx:4646`、`4714-4746`、`4755`、`4764`）；② 预览态 `Ctrl+1–6/0` 静默无效（不弹提示），与 `Ctrl+K/M` 的提示不一致，但无害，不单独报；③ 预览态导出菜单与文件菜单仍可用（只读视图允许导出 / 换文件）；④ 表格工具条在预览态隐藏（`viewMode === 'edit' && …`，`App.tsx:4839`）；⑤ 拖入 `.md` 弹「不会直接打开」而不是打开文件——第 43 轮的产品决定。
- **脚本注意（下一轮复用）**：
  - 测「预览」前先进预览再点击目标：`.preview-pane a` 的坐标与 `.doc-column .ProseMirror` 不同，用 `boundingBox()` 取。
  - 拖入必须带 `clientX/clientY`（见上）。
  - 文件树重命名 / 删除的输入框与确认框选择器本轮已过期（`.tree-actions input`、`button.danger` 都没命中），下一轮先 `page.evaluate` dump 一次真实 DOM 再写选择器。
  - `button:has-text("专注")` 在预览态是 `disabled`，`page.click` 会 30 s 超时——这正是「禁用生效」的证据，别当脚本失败。
  - toast 会活 6 s：连续断言前先等文案消失（第 43 轮 `impl.md:196` 已记）。

## UNVERIFIED

| 项 | 为什么 | 怎么补测 |
| --- | --- | --- |
| 路径 2 的「重命名 / 删除 → 撤销恢复」 | 本轮脚本选择器过期（`## d4` 文件列表未变、`## d5`/`## d6` 没打印），不是产品失败 | 下一轮先 dump 文件树右键面板的 DOM 再写选择器；或直接跑 `scripts/tree-acceptance.mjs`（第 42 轮 54/56，2 条为旧断言） |
| 路径 8：重开恢复、最近文件、草稿、批注与选区联动 | 假 FSA 句柄写不进 IndexedDB（第 40/42/43 轮同结论）；浏览器态没有 `/__annotations`、`/__draft` | `scripts/session-acceptance.mjs` + `host-smoke` |
| 深色主题下的对比度（工具栏禁用态、状态栏、预览） | 本轮只跑了浅色；`shots/round-44/` 里其它 finder 的深色截图不是我的样本，没量数值 | 切深色后取 `getComputedStyle` 前景/背景算比值，目标 ≥ 4.5:1；禁用态（0.4 透明度）也要量一次 |
| 1 MB 大文档载入与逐键 | 第 39 轮 dev 两遍实测约 220 s，本轮只跑 147 KB（2.5 s 载入、逐键 26–31 ms） | 单独排一次，按第 39 轮的 5 个 `performance.mark` 口径取最后一条 |
| 真实 IME（组合输入期间的 `Esc` / `Ctrl+/`）、真盘 / 网络盘 / 中文长路径 | 本机无 IME 自动化、只有假 FSA 句柄 | 真人 + 宿主 `host-smoke` |
| 宿主 WebView2 里的真实拖入与导航取消 | 浏览器态只有合成 DragEvent；宿主 `OnNavigationStarting` 本轮未变 | 宿主冒烟加一次拖入断言 |
| macOS / Intel Mac / 签名公证 | 本机是 Windows | 交给 CI 与真人 |
