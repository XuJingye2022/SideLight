# 第 65 轮 test（B 轮）

结论：**PASS**。B1（B-138）复跑 34/34 + 补测 8/8；B2（B-115 复核）复跑与 A1 持平，余项全过；门禁两门各一次 PASS。未读 `impl.md`。
轮前 startSha `ec20c99`，开工时 HEAD 未变；工作区改动只有 B1 声明的 4 个文件 + `BACKLOG.md`。

## 门禁
- `npm run verify`（exit 0）：build 通过，首屏 gzip **300,980 B**（内部 310,000 / 硬线 320,000，余 19,020；比第 64 轮 +9）。
- `npm test`（exit 0）：40 文件 **520 条** 0 fail（第 64 轮 517 + 本轮 outline 新增 3 条）。单独 `node --experimental-strip-types src/lib/outline.test.ts` 17/17（14→17）。
- roundtrip 未跑：未动编辑器与序列化（改动只在大纲组件、纯函数、CSS）。日志 `.tmp/r65-tester-{test,verify}.log`。

## B1｜大纲键盘与列表语义（B-138）
reset 9222 后从零复跑 `.tmp/e2e-r64-impl-b1-outline-kb.mjs`：**34/34、0 控制台错误**（`.tmp/r65-tester-b1-outline-kb.json`），截图 2 张。关键读数：
- `.outline [tabindex="0"]` 恒 1（含折叠后）；treeitem 4 条 = 条目数；`aria-level` `1/2/3/2`；容器 `div[role=tree][aria-label=大纲]`；有子级行 `aria-expanded=true`、无子级不带该属性。
- 从 `#sidebar-tab-outline` Tab 1 次落进「甲章」、再 Tab 1 次离开 `.outline`；Shift+Tab 回同一行。
- ArrowDown 后新条 `tabindex=0`、旧条 `-1`（仍恰 1 个 0）；Tab 出去再 Shift+Tab 回来仍停在「第1节」。
- ArrowLeft 后 `aria-expanded=false`、子行「第1节小节」不渲染（3 行），焦点不丢；ArrowRight 展开回 4 行。
- Enter：焦点进 `.ProseMirror`，选区 `anchorOffset=0` 落在 `H2「第2节」`（标题 pos 36 ⇒ pos+1）；End/Home 落首尾。
补测（自写 `.tmp/e2e-r65-tester-space.mjs`，8/8、0 错误）：**Space** 同样走原生 click 跳章节（焦点回正文、落 `H2「第2节」`）；折叠钮 `tabindex=-1` + `aria-hidden=true` 且保留 `aria-label`，**鼠标点仍收起**（行 3 条、`aria-expanded=false`、仍 1 个 tabindex 0）。
回归 `.tmp/e2e-r64-impl-a2-outline-follow.mjs` **26/26**（B-137：点正文 h2 后 `scrollTop=466`、当前条 832–856 在容器内、点 h1 回 0、手滚 200 不抢、折叠后 h3 仍现）；跑完已 `git checkout -- shots/round-64/` 还原。

## B2｜B-115 复核与余项
- 复跑 a1v2 → `.tmp/r65-tester-b2-recheck.json`：夹具 A 7 轮进 p50 **1,173** / 退 **299** ms，对 A1（`.tmp/r64-tester-a1.json` 1,210 / 298）为 **−3.1% / +0.3%**（红线 15% 未触发）。A1 第 5 条门槛全过：进 ≤1,500、退 ≤600、long task max **1,173 / 212**（<2,500）、`scrollDiff` 全 0、`shapeOk`、每轮 `inSrc.display=grid`、`srcHash=1557349733`、parse 3→3、`preview.pmCount=0`、`consoleErrorCount=0`；100 KB 20 轮进 122 / 退 55（≤200）。
- 1 MB 源码态打 10 字（只记录，不设门槛）→ `.tmp/r65-tester-b2-typing.json`：`textarea.source-editor.value` 1,000,012 → 1,000,022（+10），尾串以 `qwertyuiop` 结；`sl-parse-done` 3→3→3；`Ctrl+F` 后焦点回 `TEXTAREA.source-editor`。成本：10 字 2,121 ms、每键约 1 条 ~120 ms long task，按计划只记录并另立 **B-139 P2**（`src/App.tsx:5731` 源码态每次渲染对全篇 `countText`）。
- diff 口径：`git diff --name-only` = `BACKLOG.md`、`Outline.tsx`、`outline.test.ts`、`outlineTree.ts`、`styles.css`；`git diff -- src/App.tsx` **0 行**；`src/styles.css` 仅 1 个 hunk（+11 行：`.outline-list` 网格与 `.outline-item:focus-visible` 焦点环），无 `.source-hidden`/双 rAF 新 hunk ⇒ B2 未落代码（正常路径 diff 为空）。B2 是 B 轮第一项，开工瞬间的 `git status` 无法回放；佐证：HEAD 仍为轮前 startSha、App.tsx 0 行 diff。
- 定案数字：1 MB 进 1,173–1,210 / 退 298–304 ms（两方独立复跑），门槛进 ≤1,500 / 退 ≤600。

## 偏差与未验
- 计划 B2 第 3 条要求「另立 P2」，执行方未加行；本轮由 tester 补 `B-139`（open，P2）。
- UNVERIFIED：真实屏幕阅读器对 tree/treeitem 的播报（只验 DOM 语义）、真宿主 WebView2、真实中文 IME、真实 FSA 句柄。
- 截图 2 张：`shots/round-65/b1-outline-kb-focus.png`（焦点环在「第1节」行内）、`shots/round-65/b1-outline-kb-collapsed.png`。原始日志 `.tmp/r65-*`。
