# 第 67 轮独立验收（tester）

轮前 `86708a1`；dev 5175 未重启；CDP 9222/9225，每段 E2E 前 `node .tmp/reset.mjs <端口>`。未读 `impl.md` 先写脚本，再对照任务验收。环境限制照旧：真实 WebView2 宿主、真实磁盘 FSA、中文 IME 未验。

## 门禁（本机单次）

| 门 | 结果 |
| :-- | :-- |
| `npm run verify` | **PASS**，首屏 gzip **301,383 B**（文件 3 个，内部 310,000 / 硬线 320,000，余 18,617），主 chunk `index-DDszgRq2.js` 292,439 B gzip |
| `npm test` | **40 文件 / 520 条，520 pass / 0 fail**（逐文件求和，`.tmp/r67-tester-test.log`） |
| `npm run roundtrip` | rich **6/8**、source **8/8**（`04-reference-links.md`、`06-task-list.md` 为既有差异，与轮前同） |

## B1 delta 回归 — 全绿

执行方产物 `.tmp/r66-delta.json` 的 `gates` 三项全 true；tester 重跑四个源脚本核对（`.tmp/r67-tester-{b115,a1,a2,code}.json`）：

| 项 | 本轮实测 | 门槛 |
| :-- | :-- | :-- |
| 1 MB 进 p50 / 退 p50（B-115，7 轮） | **1,191**（991–1,397）/ **297**（290–338）ms | ≤1,500 / ≤600 |
| 100 KB 进 p50 / 退 p50（20 轮） | **122** / **55** ms | ≤200 / ≤600 |
| long task max（1 MB 进 / 退） | 1,209 / 218 ms | 只记录 |
| `scrollDiff` | 1 MB 7 轮、100 KB 20 轮**全 0** | 全 0 |
| `sl-parse-done` | 1 MB **3→3**、100 KB **4→4**；`shapeOk` 两档 true | 3→3 |
| A1（B-143 源码停笔自动保存） | 四档 verdict 全 true | 全 true |
| A2（1 MB 源码打字 10 字） | 关 p50 **2,887**、开 **2,894** ms；两档判定全 true | 关 ≤2,900 |
| finder-code 基线含 `exitSourceEdited` | 有：1 MB total 5,068 / 4,140 ms 长任务 / parse 3→4；100 KB total 604 / parse 5→6（`.tmp/r67-tester-code.json`） | 只记录（B-144 改前 4,954） |
| 控制台错 | 四个脚本全 0 | 0 |

偏差 >10%：**无**。按 tester 复测值对既有基线：B-115 进 1,191 对 1,198（−0.6%）、退 297 对 304（−2.3%）、A2 关 2,887 对 2,810（+2.7%）、开 2,894 对 2,892（+0.1%）、改字退出 total 5,068 对 4,954（+2.3%）。B1 无红，B2 条件成立。

## B2（B-144）源码改字后退出先绘遮罩 — 全绿

独立脚本 `.tmp/e2e-r66-impl-b1.mjs` 复跑 → `.tmp/r67-tester-b2.json`（1 MB：1,000,012 字符；100 KB：100,010）：

| 断言 | 1 MB 改 10 字退出 | 100 KB |
| :-- | :-- | :-- |
| 点击 → 第二个 rAF | **101 ms**（≤250），遮罩已在屏 | 20 ms |
| 遮罩 rect + elementFromPoint | 0,0,1440×900；hit `DIV.source-applying-note`、`insideMask:true`、`inTextarea:false` | 同左 |
| 长任务 | **4,119 ms @ start 20,067 > maskRafAt 20,039**；另含 50/50/90/125/60 ms | 85 ms 一条 |
| 总时长 | **4,470 ms**（≤5,330） | **145 ms**（≤700） |
| 遮罩消失后 | `[data-source-applying]` **0**、正文尾含 `zxcvbnmasd`、parse **3→4**、焦点回 `.ProseMirror`、`sourceShown:false` | 同左，parse 5→6 |
| 1 MB 未改动 ×5 进 / 退 | 进 p50 **1,219** / 退 **294** ms、parse **3→3**、`maskSeen:0` | — |

其他出口（`.tmp/r67-tester-b2-flows.json`，3/3 全 true、0 错）：→预览（遮罩用上、预览含新字、parse+1）、→`Esc`（遮罩用上、正文含新字、焦点回正文）、→「回到富文本编辑」确认框→继续（对话框出现、遮罩用上、parse+1、焦点回）。截图 `shots/round-67/source-applying-mask.png`（58,189 B，756×488）为执行方 screencast 帧，tester 目视核对文案「正在应用源码改动…」与状态栏「自动保存排队中」；遮罩几何与命中由本轮实量。

## 判定：PASS

验收全绿，无回归。未修不列本轮：`B-145`（源码态自动保存无 IME 组合守卫，finder-delta 本轮新登记 P1，已进 BACKLOG，下一轮做）。

UNVERIFIED：真实磁盘 FSA 与真实 1 MB 文件（用合成工作区）；真实中文 IME 在两个 rAF 窗口内击键（CDP 只发 ASCII）；WebView2 宿主内的遮罩帧与重解析；真实读屏对 `role="status"` 的播报。
