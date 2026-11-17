# 第 53 轮验收（复验）· A1（B-115）1 MB 切源码

**结论：FAIL（不 commit）。** 返修把退出 2054 → 296 ms、100 KB 进 254 → 116 ms，但主门槛「1 MB 进源码 p50 ≤300 ms、无 >500 ms long task」仍未达（1098 ms、7/7 轮各一条 823–1295 ms）。机制按计划落地、结构断言全过、无功能回归。

- 环境：dev `http://localhost:5175`、CDP 9222（`node .tmp/reset.mjs 9222` 后跑）；轮前 `86ba2d1`；工作树 = `src/App.tsx`+`src/styles.css`（返修）+`BACKLOG.md`（轮前），未提交。
- 复验脚本（tester 自有脚本对本轮代码重跑，测量口径与上一遍相同）：`.tmp/e2e-r53-tester-a1v2.mjs`、`-func.mjs`；数据 `.tmp/r53-a1-tester-v2.json`、`.tmp/r53-tester-a1v2.log`、`.tmp/r53-tester-func-v2.log`；改前对照 `.tmp/r53-a1-before.json`。

## 一、性能（主门槛未达）

| 指标 | 门槛 | 改前 | 实测 | 判 |
| :--- | :--- | :--- | :--- | :--- |
| 1 MB 进源码 p50 | ≤300 ms | 9921（9700–10443） | **1098**（928–1422，n=7） | ✗ |
| 1 MB 进 >500 ms long task | 0 | 7/7 轮 8.6–9.1 s | **7/7 轮各 1 条**（1144/993/1197/831/883/1295/823） | ✗ |
| 1 MB 退出 p50 | ≤300 ms | 2054（1933–2170） | **296**（280–334；p95 334，1/7 轮 >300） | ✓（p95 见观察 1） |
| 100 KB 进 p95 | ≤120 ms | 305 | **131**（p50 116，n=20） | ✗ |
| 100 KB 出 p95 | ≤120 ms | 232 | 61（p50 54） | ✓ |

- 冻结从 9.9 s 降到 1.1 s（9×），但 300 ms 仍差 3.7×；剩下的是 1 MB `<textarea>` 首帧排版，返修只改了外围（`contain: layout paint` 与隐藏方式）。
- 改前数据取自 `.tmp/r53-a1-before.json`（enterTotal p50 9921、exit 2054、small p95 305），非本轮重跑（工作树已改）。

## 二、结构断言（全过，7/7 与 20/20 轮）

- `sl-parse-done`：1 MB 3→3、100 KB 4→4（前后同值）。
- 源码 hash 1557349733、1,000,012 字符，与改前 `.tmp/r53-a1-before.json:64-65` 相同。
- hidden 前后：`.ProseMirror` 1 个、children 44,446 相等、`contenteditable="true"`、`textContent` len 844,454 / hash 2840984326 每轮相等（用 `textContent`，未用 `innerText`）；源码态 `pmVisible=false`、`hidden=true`、`display:grid`（0 尺寸）。
- 预览态：编辑器 `.ProseMirror` 0、`.preview-pane` 1；回编辑 4,648 块、ce true。
- 进出源码 `scrollTop` 差 0（1 MB 7/7、100 KB 20/20，基线 12000）——返修的 rAF 还原有效。
- console 0（重载 + 27 次往返 + 功能脚本，无 error/pageerror）。

## 三、功能与回归（`.tmp/r53-tester-func-v2.log`）

- 源码里追加一段→Esc→正文含新内容、焦点回正文（`focusInEditor:true`）；回编辑后 `hidden=false`、ce true、44,446 块不重建。
- 源码态对 hidden 编辑器调 `focus()` 无效（焦点仍在 TEXTAREA）——不抢源码框焦点。
- 源码→预览→编辑：预览期 0 个编辑器 `.ProseMirror`，回编辑 1 个、正文在。
- 既有行为未变：源码改动经 `setMarkdown(addToHistory:false)` 退出后 `Ctrl+Z` 撤不掉；状态栏「未保存」文案不出现（与上一遍 `.tmp/r53-tester-func.log:45` 相同，非本轮引入）。
- 只跑 1 个回归脚本（上条功能脚本）；`keyboard-acceptance` 本轮未重跑（上一遍 51/52，唯一 FAIL 为既存 B-209）。

## 四、门禁

- `npm run verify`：PASS；首屏 gzip **296,230 B**（内部 310,000 / 硬线 320,000，余 23,770）。`.tmp/r53-tester-verify.log`
- `npm test`：exit 0，**34 文件 442 条全过**（`.tmp/r53-tester-test.log`；BRIEF 的 33/432 已过期）。

## 五、可复现失败清单

1. `node .tmp/e2e-r53-tester-a1v2.mjs` → `big.enterTotal.p50=1098`（要求 ≤300）。
2. 同脚本 → `big.longTasksEnter` 7/7 轮各 1 条 >500 ms（823–1295）。
3. 同脚本 → `small.enterTotal.p95=131`（要求 ≤120）。

## 六、非阻断观察

1. 退出 p95 334 ms、1/7 轮 >300 ms：门槛只写「退出 ≤300 ms」，按 p50 达标；若要 p95 也进 300 需再收 ~35 ms。
2. `src` 仍用 1 MB `<textarea>`：改前定位到单帧 986 ms 来自它的首帧排版（`.tmp/r53-tester-phase.log`）。要继续打 300 ms 门槛，只能换源码渲染方式（`<pre>` 分行 / 虚拟化），或由 planner 按实测改门槛（本轮未改）。
3. `src/App.tsx:5223` 注释「源码模式里 .ProseMirror 不在 DOM」已过期（无功能影响）。
4. BACKLOG 仍无 B-115 行；建议由根代理补：B-115 open，证据 `docs/iteration/round-53/test.md`（enter p50 1098 / long task 7/7 / 100 KB p95 131）。
5. 源码字数改 200 ms 延时计算（`src/App.tsx:2086`）：进源码头 200 ms 内状态栏沿用编辑态数字，属可见变化，本轮未在验收项内。
