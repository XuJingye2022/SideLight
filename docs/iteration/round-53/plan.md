# 第 53 轮计划（planner）· revision 1

- 按 `plan-review.md` H1–H6 修订，不新增任务：A2 删步骤③、补菜单验收；A1 只常驻源码；断言改 `textContent`；B1 收 `markBaseline` 覆盖 6 赋值 + 源码出口重记；B1 门槛改相对值 + 先探针；A 轮只放 A1 与 B1 基线，A2 移 B 轮首位，B2/B3 砍（B 轮已满、原计划写「可砍」）。
- 参数：`round=53`、`nn=53`、报告 `docs/iteration/round-53`、`startSha=86ba2d1`、0.32.1、dev `:5175`、CDP 9222（E2E 前 `node .tmp/reset.mjs 9222`）；不 push、不改 `release/`；CHANGELOG `## Unreleased`。
- 排序 B-115 > B-116 > B-014；不排：`release/` 里 0.32.1 包是 0.31.1 资源（交根代理）、B-003/B-004 顺延、B-112/B-113 顺延（B-112 连 `:52` 计数）。tester 后补 BACKLOG B-114（交根代理）、B-115、B-116（证据 `findings-ship/code.md`）。
- 预算：A 25 = A1 15 + B1 基线 5 + 门禁 5；B 25 = delta 5 + A2 8 + B1 9 + 门禁 3。

## A 轮

### A1（B-115，P1）1 MB 切源码冻结 9.96–11.48 s

文件：`src/App.tsx:5350-5381`（渲染分支）、`:5295-5308`（`main.doc-scroll`）、`:4187-4218`、`:2128-2181`；`src/styles.css:103`。

步骤：① `.tmp/e2e-r53-a1.mjs`（种子照 `.tmp/e2e-r51-bug-4.mjs:5-12`，加 100 KB 对照；记进出 p50、long task、`sl-parse-done`、hash、节点数/textContent/contenteditable、`scrollTop`、console），改前跑存 `.tmp/r53-a1-before.json`。② 只常驻源码：`previewMode` 仍整块卸载；源码态只给编辑态 `doc-layout` 加 `hidden`，`EditorContent`/`MarginRail` 不卸载。③ `:2129` 守卫与 `:2181` deps 不动；隐藏期不调 `focusEditor()`；`applySource`、脏基线不动。④ 进出源码 `scrollTop` 差 ≤1 px，超了 rAF 还原。

验收：1 MB 进 p50 ≤300 ms、无 >500 ms long task（改前 9,960–11,480 ms）；出 ≤300 ms；100 KB 进出 p95 ≤120 ms；`sl-parse-done` 前后同值；源码 hash 同改前；节点数相等、`contenteditable` 仍 `true`、**`textContent` 相等（不用 `innerText`，不渲染时按规范等于 textContent）**；预览态仍无 `.ProseMirror`；console 0。门禁 `build`/`verify`（记首屏字节）/`test`。风险：AGENTS 第 8 节前提失效（scripts 无断言）、`coordsAtPos` 已有 fallback、Esc 分派。

## B 轮

### B0（delta 5 min）

重跑 A1 脚本；采 A2 基线 `.tmp/r53-a2-before.json`。可选 F11：桩 `requestFullscreen`/`exitFullscreen`/`fullscreenElement`（getter）+ `fullscreenchange`，断进出各一次；`App.tsx:3903` 靠 `fullscreenElement` 分流，少桩必假阴。结论写 `impl.md` 留 B-112。

### A2（B-014，P1）整页缩放 130% 起横向溢出

文件：`src/styles.css:113-134`、`:184-193`、`:1309-1318`；`src/App.tsx:1873-1906`。

步骤：① 基线：1440×900/1024×768、100% 的 `.topbar`/`.toolbar`/`.app`/`.doc-column` rect 与 130/150/180/200% 的 `scrollWidth-clientWidth`。② `.app{min-width:calc(1120px / var(--page-zoom,1))}`（`#root` 宽已 = 视口/zoom），同步 `:113-118` 注释，`overflow:hidden` 不动。③ **不给 `.topbar`/`.toolbar`/`.file-menu-wrap`/`.export-wrap`/`.toolbar-group` 加任何 `overflow(-x/-y)`**：一轴 auto 另一轴也算 auto，会裁 `top:30px` 的 `.file-menu`（`:383`）、`.export-menu`（`:1969`）、`.menu`（`:1373`）。④ 200% 末位控件出界只做不造裁剪容器的收缩（`.doc-name` 已 ellipsis `:212-225`；可用 `.topbar>*{min-width:0}`），不动按钮尺寸、不加媒体查询、不动打印。

验收：130/150/180/200% `documentElement.scrollWidth<=clientWidth`（改前 26/250/586/810）；130/150% 顶栏末位控件 `rect.right<=innerWidth` 且 `.doc-column`≥320 px；180/200% 顶栏末位控件完整可见；`.toolbar` 只记位置。`.doc-column`>0（200% 约 150 px 记 BACKLOG）；**200% 开文件菜单、导出菜单、工具条「插入 ▾」：rect 四边在视口内、`elementFromPoint` 命中菜单项并点中生效（照 `critic-overflow.mjs`）**；100% 下 1440/1024 rect 等于基线；截图 `shots/round-53/a2-zoom-200.png`。门禁 `build`/`verify`/`test`。

### B1（B-116，P1）1 MB 逐键 p50 126 / p95 149 ms（A 轮先测）

文件：`src/App.tsx:958-966`、`:1104/:1145/:1215/:2281/:2798/:3664`（赋值 6 处）、`:962/:2075-2077/:2909/:4180`（比较 5 处）、`:3011-3028`、`:4150-4181`。

A 轮先测：`.tmp/e2e-r53-b1.mjs`（1 MB 30 键 + 100 KB 对照，`PerformanceObserver`）跑改前；另测 `doc.eq()` 中位（各 30 次）存 `.tmp/r53-b1-probe.json`。

步骤：① 探针 ≤5 ms 直接用，5–30 ms 记 `impl.md`，>30 ms 走④退路。② 收 `markBaseline(text, docSnapshot=null)` 同写 `baselineRef`/`baselineDocRef`，**6 处赋值全走它**（`:1104/:1145/:1215/:2281/:3664` 传 `editor.state.doc`；`:2798` 编辑态传 doc、源码保存传 null 由③重记）。③ `applySource` 的 `setMarkdown` 分支后：`normalizeForBaseline(sourceText, originalText)===baselineRef.current` 时 `baselineDocRef=editor.state.doc`；`:4180` text 比较保留。④ `onUpdate`：`baselineDocRef!==null` 用 `editor.state.doc.eq(baselineDocRef)`，null 才退回 text 比较（只在源码里保存过到退出之间）。⑤ `:2909`「没变别写」命中补 `baselineDocRef=editor.state.doc`。⑥ 300 ms 空闲 `getMarkdown()` 保留；`doc.eq` 超预算走退路「doc 变更先置脏，300 ms 空闲校正且早于自动保存决定」。

验收：1 MB 30 键 p50 ≤ 改前 1/3（同轮实测中位，126→≤42 ms）、0 条 >100 ms long task；100 KB p50 ≤8 ms、0 long task；**生产 p95 记 UNVERIFIED**（dev 数，`findings-code.md:27`）。脏：打字 `true`、`Ctrl+Z` 回原样 `false`、无改动 `Ctrl+S` 仍出「没有改动，未写入。」、**源码保存→退出 `false`→打字 `true`→`Ctrl+Z` `false`**、开工作区文件 `false`（`:2281`）、宿主写回打桩（`:3664`）`false`（不可行记 UNVERIFIED）；`npm test` 脏链全绿。门禁 `build`/`verify`/`test`（动序列化才加 `roundtrip`）。风险：脏语义（关窗确认、宿主草稿抑制）、F3 不扩大。
