# 第 64 轮两轮计划（修订 1）

> 修订 1（planner-revision）照 `plan-review.md` H1–H6 修；结构/范围未变、未加任务。执行前在 `BACKLOG.md` 加 `B-137`（大纲跟随）、`B-138`（大纲键盘/语义）。
> 共用：E2E 前 `node .tmp/reset.mjs 9222`；两门每轮各一次；不 push/不改 `release/`/0.32.1；25 分钟。

## A 轮

### A1｜B-115 源码态保留编辑器，按实测重定门槛
backlog_id：`B-115`；files：`src/App.tsx`、`src/styles.css`
1. 改前不测：基线 `.tmp/r62-b1-a.json`（enterTotal.p50 9,826 / exitTotal.p50 2,121）。改后跑一次 `.tmp/e2e-r53-tester-a1v2.mjs`，另存 `.tmp/r64-impl-a1-after.json`；100 KB 用 `small` 段，不跑独立 small 脚本。
2. 重落 53 轮机制（`round-53/impl.md:8-10`）：`:5559` 三元拆三段，类名/层级不动（a1v2 按它们取数）：源码块退出即卸载，预览整块卸载，编辑块 `hidden={sourceMode}` 常驻，`EditorContent`/`MarginRail` 不卸载。
3. `.source-hidden` 恒加（不做「退 >600 才加」条件开关）：`height:0;overflow:hidden;visibility:hidden;scale(0)`，`display:grid` 压过 `[hidden]`（否则退出重建 44,446 块 299–411 ms）。
4. 进源码前记 `scrollRef.current.scrollTop`（`switchView` `:4371`、`enterSourceFor` `:576`，在 `setViewMode` 前），退出后双 rAF 还原（单 rAF 在 1 MB 假绿）；`hidden` 期不调 `focusEditor()`（`:351`/`:2141` 会命中隐藏节点）。
5. 门槛照抄键名（**别读 `big.enter.p50`/`big.exit.p50`：同步点击耗时，改前 0/79 也过**）：`big.enterTotal.p50 ≤1,500`、`big.exitTotal.p50 ≤600`、`longTasksEnter/Exit` 无 >2,500、`scrollDiff` 全 0、`shapeOk`、`inSrc.display='grid'`、`srcHash=1557349733`、`parse` 3→3、`preview.pmCount=0`、`consoleErrorCount=0`、`small.enterTotal.p50≤200`、`small.exitTotal.p50≤200`。
6. 未达标回滚不 commit 并写报告+BACKLOG；达标 fixed 附数字，余项留 P2。
验收：上列全过 + `.tmp/e2e-r53-tester-func.mjs`（改段→Esc→正文含新内容、焦点回正文；第 4 步 Ctrl+Z 按既有设计不成立，`addToHistory:false`，只记录）。
超时：A1 超 12 分则 A2 顺延（写原因）。

### A2｜大纲跟随当前章节（B-137）
backlog_id：`B-137`；files：`src/components/Outline.tsx`、`src/lib/outlineTree.ts`、`src/lib/outline.test.ts`
1. 行加 `data-outline-id`，`rows` 用 `useMemo`；`useEffect([visibleId, rows])` 按矩形差调容器 `scrollTop`（越界才滚），一次 rAF；容器 `.outline-pane > .file-tree-list` 从树容器 `parentElement` 取（**不用 `querySelector`**：文件树同名且 `hidden`）；禁用 `scrollIntoView`；面板不可见、rect 0、非大纲页签跳过。
2. 纯函数 `nearestScrollTop()` 进 `outlineTree.ts`，单测 4 条（上/下/已可见/相等）。
验收（`.tmp/e2e-r64-impl-a2-outline-follow.mjs`，夹具同 `e2e-r64-ui-a.mjs:9-16`）：改前 `.tmp/r64-ui-a.json` 的 `outlineActiveScroll` 是 `visible:false`，须变 true。点**正文** h2「第40节」（先只滚 `.doc-scroll`，再 `page.mouse.click(rect 中心)`；**不用 `locator.click()`**，它会把条目滚进视野、改前也过）：点前容器 `scrollTop===0`、该条 rect 在容器外；点后 300 ms 当前条=第40节、rect 全在容器内（±1）、`scrollTop>0`、焦点不在 `.outline`、窗口 `scrollTop===0`。点正文 h1「甲章」回顶；手滚 200 不被抢；折叠祖先后点 h3 子条目仍现。截图 `shots/round-64/a2-outline-follow.png`。

## B 轮

### B1｜大纲键盘与列表语义（B-138）
backlog_id：`B-138`；files：`src/components/Outline.tsx`、`src/lib/outlineTree.ts`、`src/lib/outline.test.ts`、`src/styles.css`
1. `nav.outline-list` → `div role="tree" aria-label="大纲"`（landmark 留）；条目 `role="treeitem"`+`aria-level`，有子级加 `aria-expanded`；扁平 treeitem，不建 group。
2. roving 随焦点迁移：`tabIndex = id === (focusedId ?? visibleId ?? rows[0].id) ? 0 : -1`，每行 `onFocus` 设 `focusedId`、不在 `rows` 时回退 `visibleId`。只让当前条为 0 不是 roving（焦点第 5 条、当前第 1 条时 Tab 回来落回第 1 条）。
3. 键位：Up/Down 前后、Home/End 首尾、Left 收起（无子级跳父级）、Right 展开、Enter/Space 走原生 click→`jumpTo`。
4. 折叠钮 `tabIndex=-1`+`aria-hidden`，仍可鼠标点。
验收（`.tmp/e2e-r64-impl-b1-outline-kb.mjs`）：`.outline [tabindex="0"]`=1；treeitem 数=条目数、`aria-level` 对；从 `#sidebar-tab-outline` 1 次 Tab 落条目、再 1 次离开 `.outline`；**ArrowDown 后新条 0、旧条 −1，Tab 出去 Shift+Tab 回来仍在该条**；ArrowLeft 后 `aria-expanded=false` 且子条目不渲染；Enter 后选区起=标题 pos+1、焦点在 `.ProseMirror`。

### B2｜B-115 复核与余项定案（B 轮第一项）
backlog_id：`B-115`；files：`round-64/impl.md`、`BACKLOG.md`（必要时 `src/App.tsx`、`src/styles.css`）
**排 B 轮第一项**（A 轮已 commit、工作区干净）；B1 后做会污染 diff。
1. 开工记 HEAD 与 `git status --porcelain`（应空）；reset 后复跑 a1v2 → `.tmp/r64-impl-b2-recheck.json`：`enterTotal.p50`/`exitTotal.p50` 比 A1 退化 >15% 判红，其余按 A1 第 5 条。
2. diff：正常路径 `git diff --stat` 为空；真落改动只许 `src/App.tsx`/`src/styles.css`，hunk 只含 `.source-hidden` 与双 rAF，大纲三文件不得出现。
3. 1 MB 源码态打 10 字：**只记录、不设门槛**（`App.tsx:5701` 全篇 `countText` 47 ms 是既有行为，另立 P2）；断言 `textarea.source-editor.value` +10、`sl-parse-done` 不增、Ctrl+F 开关后焦点回 `.source-editor`。
4. 达标写定案；未达标二选一：(a) 留改动按实测落门槛；(b) 回滚记 deferred 并写「≤300 ms 需换 `<pre>`/虚拟化，需产品决策」。不重复 53 轮返修。
验收：recheck 过同一门槛；diff 口径如上；B-115 有定案数字。

## 不做与交接
P2 留 deferred；不动 `release/`。`BRIEF.md:6` 轮次/HEAD 过期，交 scribe 与 README/CHANGELOG/STATE 回写。
