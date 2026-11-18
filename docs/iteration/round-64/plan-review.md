# 第 64 轮计划审查（复审 · 修订 1）

**PASS**（无新 P0/P1；P2×6 见末，不阻塞）。只读，未改产品代码；首版审查留 `.tmp/r64-plan-review-rev0.md`。
核对：HEAD `368431c`=startSha，工作区仅未跟踪 `round-64/`、`shots/round-64/`。

## 上一版 6 条核对

- H1 已修（`plan.md:14`）：键名逐字钉住。实测 `.tmp/r53-a1-tester-v2.json`：`big.enterTotal.p50`=1,098、`big.exitTotal.p50`=296、`longTasks*`≤1,295/214、`inSrc.display="grid"`、`srcHash=1557349733`、`preview.pmCount=0`、`consoleErrorCount=0`、`small.enterTotal.p50`=116；基线 `.tmp/r62-b1-a.json`=9,826/2,121，与 `plan.md:10` 一致。门槛 1,500/600 可达。
- H2 已修（`plan.md:23`）：点正文 h2、`page.mouse.click(rect)`、禁 `locator.click()`；先断言改前 `scrollTop=0` 且条目在容器外；容器写 `.outline-pane .file-tree-list`（`styles.css:504-508` 有 `overflow-y:auto`）。真夹具可滚：`findings-ui.md:9` scrollHeight 1,242 / clientHeight 752。
- H3 已修（`plan.md:35-37`）：B2 排 B 轮第一项（A 轮 tester 已 commit）；diff 收窄到 `App.tsx`/`styles.css`，大纲三文件不得出现。
- H4 已修（`plan.md:12`）：`.source-hidden` 恒加，不按 600 ms 条件；`plan.md:40` 打 10 字只记录，`App.tsx:5701` 的 47 ms 另立 P2。
- H5 已修（`plan.md:30,33`）：加 `focusedId` 回退链与「ArrowDown 新条 0/旧条 −1、Tab 回条」断言。
- H6 已修（`plan.md:10,17`）：不重跑改前；两门每轮一次；A1 超 12 分 A2 顺延。

## 新 P2（不阻塞，修不修都不改结论）

1. [P2] A2 的「容器从树容器 `parentElement` 取」指代不清：`nav.outline-list`（B1 后即 `role="tree"`）的 parent 是不滚动的 `.outline` aside；真容器是 aside 的 parent `.file-tree-list`（`App.tsx:5493-5495`、`styles.css:504-508`）。修：写明「取 `.outline` aside 的 parentElement」或由 App 传 ref，别按 nav 取。
2. [P2] a1v2 脚本写死 `.tmp/r53-a1-tester-v2.json`（`e2e-r53-tester-a1v2.mjs:191`）；按 `plan.md:10` 直接跑会覆盖 53 轮证据（`round-53/test.md:6,14`、BACKLOG B-115 都引用它）。修：跑前 `Copy-Item` 备份，或复制脚本改输出路径。
3. [P2] `plan.md:13` 的 `:2141` 不是 `focusEditor` 调用（`App.tsx:2141` 是 `if (!dir) return`）；退出源码那次调用在 `:4399`。修：行号改 `:351`/`:4399`。
4. [P2] A2「点 h1 甲章回顶」没写怎么把 h1 滚进视口（只滚 `.doc-scroll`，与正文 h2 同一口径）。修：写成「先滚 `.doc-scroll` 再 `page.mouse.click`」。另：别拿 `.tmp/r64-ui-a.json` 的 `paneScrollTop/scrollH`（量的是 aside，恒 0/752）当改前容器读数。
5. [P2] B1 验收漏了 `plan.md:31` 自己列的 Home/End、无子级 Left 跳父级、Space；`treeitem 数=条目数` 要在全展开态测。修：补三条断言。
6. [P2] B2「退化 >15% 判红」偏紧：同机制两次实测 exitTotal p50 495（`.tmp/r53-a1-after.json`）vs 296（tester v2）；且 A 轮已 commit 时「回滚」要写命令（`git revert <sha>` 或 `git checkout <sha>^ -- src/…`），`git checkout --` 无效。修：>15% 先同脚本复跑取中位；回滚写明命令。

## 另记

- 100 KB 门槛从 round-53「进 p95 ≤120」换成「p50 ≤200」（v2 p95=131 本不达原门槛，`round-53/test.md:15`）；作护栏可接受，但请注明「p95 只记录不判」。
- 基准证：round 53 机制「结构断言全过、无功能回归」已由 `round-53/test.md:21-36` 记录，重落风险低；但两次读数别混脚本（`e2e-r53-a1.mjs` 与 a1v2 不是同一份）。
- `plan.md:3` 的 B-137/B-138 号未被占用（B-136 已存在），执行前先入 `BACKLOG.md`。
- 本轮 5 路侦察无其它 P0/P1（`findings-bug.md:3`、`findings-code.md:38`、`findings-ship.md:36`、`findings-typora.md:4`），范围与「2×P1 大纲 + B-115」一致。
