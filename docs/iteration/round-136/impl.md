# 第 136 轮实现（executor）

轮前 `a9f2d50`。未 commit/push，未改 `release/`、`package.json`。

## A1 测量脚本报真实首载 — DONE
`scripts/measure-first-screen.mjs`：`RESIDENT=[/^MarginRail-.*\.js$/]` 扫 assets，按「seed + 静态 import 传递闭包（门里已计的入口排除，CR-6）」逐文件 gzip9；新增 `resident …`/`real …`/`total=… resident=… real=…`、`--real-max`（显式才 FAIL exit 1）、`--no-resident`（复旧口径、无 real 行）；守卫「0 命中 → FAIL 常驻 chunk 未找到」「seed 已在门里 → FAIL 重复计数」（两条放在总门 FAIL 之前，否则被它盖掉）。`total/--max/--target/banned/headroom` 与 WARN 文案不动；口径注释改「门 / 真实首载 = 门 + 常驻」。
A2 前旧 dist 实测（与计划一致）：exit 0、`total=316131 resident=7999 real=324130` + WARN；`--no-resident` exit 0；`--real-max 320000` exit 1；`.tmp/r136-tiny`（只拷 index.html + 3 产物）exit 1 常驻未找到；`.tmp/r136-dup`（index.html 加 modulepreload MarginRail）exit 1 重复计数。`ci.yml:39`、`release.yml:82/155` 走默认口径 exit 0。

## A2 按需拆 R1/R2/asset — DONE
- `src/App.tsx`：删 `searchWeb`、`assetFileName/writeAsset` 静态导入；`verifySources` / `insertImageFile` 内各 1 处 `await import('./lib/search.ts')`、`('./lib/asset.ts')`。
- 新 `src/lib/reviewScan.ts`：搬 `collectReviewFiles` + `atLeast`/`directoryKey`/`DEFAULT_MAX_FILES`；从 reviewFiles 导入新导出的 `compareRows` 与 `countOpenAnnotations`/`hasUnclosedReview`/`REVIEW_MAX_ROWS`/类型，单向不循环。
- `reviewFiles.ts` 103 行（删搬走部分与否用的导入）；`MarginRail.tsx` 静态导入去 `collectReviewFiles`，`openReview` 改 `await import('../lib/reviewScan.ts')` 并补 `catch {}`（CR-7，原来只有 try/finally）；`reviewFiles.test.ts` 改从 reviewScan 导入。
- 门禁：`npm run build` exit 0；`npm test` **69 文件 955 条 0 fail**（条数不变）；grep 门全过（两静态 0、两 `await import(` 各 1、MarginRail 的 reviewFiles 导入块无 collectReviewFiles、reviewScan 动态 1）。`diffView` 未动。
- 三数：门 **315,279**（headroom 4,721）、常驻 **7,801**（`MarginRail-A4g6K6g6.js` raw 22,217、闭包 1）、真实首载 **323,080**（raw 1,045,482）。

## A3 门禁与残差 — DONE（不翻口径）
`npx tsc --noEmit`、`npm run verify` exit 0；`npm test` 0 fail。真实首载超硬线 **3,080 B** → 保留旧 total/headroom、`--no-resident` 仍在、B-229 保持 open、不写 PASS。残差（A2 前 → 后）：门 −852、常驻 −198、真实首载 −1,050。下一轮 R4+R3 才够。
E2E `.tmp/e2e-r136-a2.mjs`（ego CDP 57270、1440×900、假 FSA + 假 fetch）**21/21**、0 pageerror（`.tmp/r136-a2-e2e.json`）：① 出处 2 条（tavily 请求 +1）；② 在审 2 行「待处理 2 · 共 2 条」/「待处理 1 · 共 1 条」+ 快照 1 行；③ 对话 2 条、切页签往返仍 2 条、`#rail-panel-chat` 仍是 `#rail-tab-chat` 的 aria-controls 目标；④ abort `**/reviewScan*` 后 busy 消失 + 空态 + 0 pageerror。
截图（2 张）：`shots/round-136/review-panel.png`、`shots/round-136/verify-sources.png`。

## CHANGELOG 一行
首屏门新增「真实首载 = 门 + 常驻」报告（默认门禁不变）；联网核对 / 图片写盘 / 在审扫描改按需加载，首屏 315,279 B、真实首载 323,080 B。

## 新踩坑
1. dev server 又交旧模块：磁盘与 `/src/App.tsx` 已新，`/src/components/MarginRail.tsx` 却 0 命中 `reviewScan`；`LastWriteTime = Get-Date` 即恢复（AGENTS §8 只记 CSS 与 App.tsx）。
2. 没改动时 `Ctrl+S` 按既有设计不写盘：E2E 想造修订快照要先打一个字。
3. 故意 abort 动态 import 时浏览器自己打 `Failed to load resource: net::ERR_FAILED`，判「0 console error」会假红；拆成 pageerror=0 + 只放行这条资源行。
