# 第 110 轮计划（revision 1；单轮）

> revision 1（planner-revision）：已按 `plan-review.md` 修 P1-1/P1-2/P2-1/P2-2/P2-3，任务不变；改法见各任务。

## 0 前提（planner 已核）

- `src/styles.css:1332-1343` 现为 **`min-height: 24px`**（第 107 轮 `a8ffa57` 修 B-236），`.rail-head`（`:1234-1241`）无 `height` → 35×16 是 r107 前读数。
- 三路 CSS 字节均含目标块：`?direct` 78,141 B（`min-height: 24px` 10 处，`height: 16px` 剩 2 处非目标钮）、无 query 82,356 B、`dist/assets/index-DO7Px368.css` 压缩形 10 处。
- 真机 ego CDP 57270 冷加载：两钮 [1122,140,35,24]/[1164,140,35,24]、`.rail-head` [879,140,320,24]、间距 7、计算 `min-height`/`height` 均 `24px`。默认不改产品代码，A1 复现 16 才走 A2。

## 1 体积（硬线 320,000）

- 门 `node scripts/measure-first-screen.mjs` = **315,220 B**（raw 1,022,532、PASS、余 **4,780**）；题面 312,423 / 余 7,577 是第 93 轮旧数。常驻 chunk `MarginRail-DlKTSYQT.js` gzip9 6,779 → 真实首载 **321,999**（超线 1,999，B-229 `open`，不属本轮）。
- 本轮净增：A1/A3 **0 B**；仅 A2 改 CSS 时预算 **315,260 = 315,220+40**（与 A2 验收同一数；预期实际约 +10，40 是上限）。

## 2 任务

### A1 真机复现与分级（backlog_id: B-236）

- 文件：`src/styles.css:1332-1343`（只读）、`src/lib/touchTargets.test.ts`（只读）、`.tmp/e2e-r110-a1-hitarea.mjs`（新写）、`docs/iteration/round-110/impl.md`。
- 步骤：① 冷加载等 `.rail-diff-open`；视口照 `.tmp/e2e-r107-targets.mjs:63-66`（`ctx.newCDPSession(page)` + `Emulation.setDeviceMetricsOverride(1440,900)`）并 `evaluate` 回读 `innerWidth/innerHeight`：回读 1440×900 按它记；override ok 但回读不变 = 会话挂错 target，换页面会话重试；仍不变按实际值记（高度/间距与视口无关，横向按回读视口判）。② 量 rect 与 `min-height`/`height`/`padding`/`font-size`/`line-height`，从 `document.styleSheets` 打印命中**整块**规则。③ 反事实注入 `height:16px!important;min-height:0!important`→期望 35×16，撤掉→35×24。④ 三路 CSS 字节用 node 脚本对照，不用 grep。
- 验收：两钮 rect 高 ≥24（期望 24）、计算 `min-height`=24px、间距 7、`.rail-head` 无 `height` 且 rect 高 24；反事实 16 / 撤掉 24。写 `impl.md`：(a) **35×24→陈旧读数、不改代码**，字节与反事实 JSON 记 BACKLOG B-236；(b) 35×16→进 A2。门：不改 `src/` 时 `npm test` **62 文件 877 条 0 fail**、measure **315,220/PASS**。
- 风险：长开 ego 页可能持旧 CSS（AGENTS §8），判「产品没修」前先冷加载。

### A2 仅当 A1 复现 35×16：命中区撑到 24×24（backlog_id: B-236）

- 文件：`src/styles.css`（A1 步骤② 命中的实际生效规则）、`src/lib/touchTargets.test.ts`（只可加强）。
- 步骤：① 按 CSSOM 整块**只改命中那条**：`min-height: 24px`、删同块 <24 的 `height`（照 HEAD `:1332-1343` 形态）。HEAD 该块已无 `height`，若真复现 16 只能是另一条更晚胜出的 `height` 规则或旧 CSS——先打印再改，不许猜。② 不用 `::before{inset}` / padding 退路（不改按钮 rect；无 `position:relative` 会找错祖先；padding 顶高 `.rail-head`）；不改宽、`.rail-head` 高度、面板定位、间距 7、在审右缘，不碰 `.rail-chat-reset`（已 24）。
- 验收：真机 rect 高 ≥24 且计算 `min-height`=24px、间距 7、在审右缘差 0；`touchTargets.test.ts` **3/3**；负向对照：备份后临时把该块改回 `height:16px` → 该单测**红**（exit 非 0），还原后 3/3，两次输出都贴（DOM 注入改不动读文件的静态单测）；`npm run verify` gzip ≤**315,260** 且 ≤320,000；`npm test` 62 文件 877 条 0 fail。
- 风险：`.rail-head`/`.rail-tabs` 历史几何会变——历史数字不改，只加本轮新值（r107 已记 head 24、tabs 底 − head 底 仍 39）。

### A3 回归与台账（backlog_id: B-236）

- 文件：`docs/iteration/BACKLOG.md`（B-236）、`docs/iteration/round-110/test.md`；只用既有 `.tmp` 脚本。
- 步骤：① 先备份 4 份证据到 `.tmp/r110-backup-<原名>`：`r107-targets-before.json`、`r107-tester-geom.json`、`r100-tester-diff.json`、`r101-e2e-review.json`。**禁止无参跑** `node .tmp/e2e-r107-targets.mjs`（`:10` 默认 before、`:412` 写 `r107-targets-before.json`、`:414-420` 不判几何——会覆盖 r107 16px 基线，PASS 是空 PASS）；本轮不用它，需跑只许 `--phase after` 且在备份后。② 几何：`node .tmp/r107-tester-geom.mjs`（无参、自包含、**23 项**），期望 **23/23**、0 pageerror；覆盖 1440×900 / 1256×808 / 1024×700 三档横溢 0，写 `.tmp/r107-tester-geom.json` 与 `shots/round-107/targets-{notes,chat}.png`。③ 面板：`node .tmp/e2e-r100-diff.mjs`（**43/43**，写 `shots/round-100/diff.png`）、`node .tmp/e2e-r101-review.mjs`（**57/57**，写 `shots/round-101/review-{list,truncated}.png`）。④ `git checkout -- shots/round-100 shots/round-101 shots/round-107`；断言 `git status --porcelain` 只剩 `?? docs/iteration/round-110/`、` M docs/iteration/BACKLOG.md`（A2 触发时加 ` M src/styles.css`、` M src/lib/touchTargets.test.ts`）。
- 验收：geom **23/23**（贴 summary 行）、r100 **43/43**、r101 **57/57**、0 pageerror；`npm test`/`verify` 与 A1 台账逐字一致；`git status` 只剩上述路径；BACKLOG B-236 补「第 110 轮真机复测 35×24；16px 改前值以第 107 轮 `.tmp/r107-targets-before.json` 为准（已备份）」，状态保持 `fixed`。
- 风险：r107 脚本选择器可能被 r108–109 改动打偏——先 `node --check`，命中不到先改脚本再判产品；历史截图必须还原（AGENTS §8 同类）。

## 3 边界

- 不碰 `.rail-count` 与 `.keybinding-status` 剩余 `height:16px`；不改 `.rail-head` 结构、不重做 24×24 全量审计、不做 B-229（另轮）。
- 不 push、不改 `release/`、版本仍 0.32.1、CHANGELOG 走 `## Unreleased`。
