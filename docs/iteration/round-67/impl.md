# 第 67 轮执行报告（executor）

轮前 `86708a1`；dev 5175 未重启；CDP 9222（finder-code 基线 9225）；未 push、未改 `release/`。

## B1 delta 回归 — DONE

复跑 A1/A2、B-115（源码未改动进/退）、finder-code 基线（含 `exitSourceEdited`），合成 `.tmp/r66-delta.json`。

| 项 | 结果 | 门槛 |
| :--- | :--- | :--- |
| 1 MB 进 / 退 p50 | **1,156**（998–1,381）/ **299**（291–325）ms | ≤1,500 / ≤600 |
| 100 KB 进 p50 | **122** ms（117–135） | ≤200 |
| `scrollDiff` | 7 + 20 轮全 0 | 全 0 |
| `sl-parse-done` | 3→3（1 MB）、4→4（100 KB）；`shapeOk:true` | 3→3 |
| A1 四档 + 负向 / A2 三档 | 全 true；A2 1 MB 源码打字 p50 2,853（关）/ 2,897（开） | 关 ≤2,900 |
| 控制台错 | 0 | 0 |

偏差 >10%：无（B-115 −3.5% / −1.6%、A2 +1.5% / +0.2%、`exitSourceEdited` +2.3%）。改前基线：1 MB 改字退出 total 4,954、长任务 4,274、parse 3→4；100 KB total 589、parse 5→6（`.tmp/r67-delta-code.json`）。

## B2（B-144）源码改字后退出：先绘「正在应用」遮罩，再整篇重解析 — DONE

- `src/App.tsx`：新增 `sourceApplying` state/ref；离开源码且改过字时先 `setSourceApplying(true)`，双 rAF + `setTimeout(0)` 后才 `applySource`（长任务晚于遮罩帧），完成同批收遮罩并 `setViewMode`；未改动退出仍走原同步 `skipReparse`。`applySource(textOverride?)` 取 textarea 现值（两帧内击键不丢）；聚焦按帧重试到编辑块摘掉 `hidden` 再 `focus()` + `restoreSourceScroll()`。
- `src/styles.css`：`.source-applying` 固定盖视口（`fixed`；`.source-layout` 绝对定位的中心会落到视口外，`elementFromPoint` 命不中）+ `.source-applying-note`。带 `data-source-applying`、`role="status"`、`aria-live="polite"`。

验证 `.tmp/e2e-r66-impl-b1.mjs` → `.tmp/r67-impl-b2.json`：

| 断言 | 1 MB 改 10 字退出 | 100 KB |
| :--- | :--- | :--- |
| 点击→第二个 rAF | **107 ms**（≤250），`maskAtRaf:true` | 21 ms |
| rect + elementFromPoint | 0,0,1440×900；hit `source-applying-note`，`insideMask:true`、`inTextarea:false` | 同左 |
| 长任务 | **4,085 ms @ start 19,851** > `maskRafAt` 19,822；含 ≥4,000 | 87 ms |
| 总时长 | **4,443 ms**（≤5,330） | **143 ms**（≤700） |
| 遮罩消失后 | 遮罩 0、正文尾含 `zxcvbnmasd`、parse 3→4、焦点回 `.ProseMirror`、源码收起 | 同左，5→6 |
| 1 MB 未改动 ×5 | 进 p50 1,170 / 退 300、parse 3→3、`maskSeen:0` | — |

其他出口同路径（`.tmp/e2e-r67-b2-flows.json` 全 true、0 错）：→预览、→Esc、→「回到富文本编辑」确认框→继续（遮罩用上、parse+1、焦点回）。

截图 `shots/round-67/source-applying-mask.png`（真实遮罩帧）：长任务期间 `Page.captureScreenshot` 要等任务结束（4.1 s 超时），改用 `Page.startScreencast` 由合成器发帧（`.tmp/e2e-r67-b2-screencast.mjs`）。

门禁全绿：`npx tsc --noEmit` 0；`npm test` **40 文件 / 520 条，520 pass / 0 fail**；`npm run verify` **PASS**，首屏 gzip **301,383 B**（预算 310,000；+403 B）；`npm run roundtrip` rich 6/8、source 8/8。改后 B-115：进 1,197 / 退 297、100 KB 进 118、`scrollDiff` 全 0、parse 3→3、0 错。

CHANGELOG 建议：`- 第 67 轮（B-144）：1 MB 文档源码改字后退出，先显示「正在应用源码改动…」遮罩再整篇重解析（点击→遮罩 107 ms，4.2 s 长任务排在遮罩帧之后）。`

## 新踩坑

1. **1 MB 重解析后编辑块重新显示还要 ~400 ms**（44,446 块）：单次 rAF 的 `focusEditor()` 落在 `hidden` 未摘时静默失效（焦点停 body）；按帧重试到无 `hidden` 再 focus，再还原 scroll。
2. **长任务卡住主线程时 CDP `Page.captureScreenshot` 截不到遮罩**（实测 4.1 s 超时）；`Page.startScreencast` 由合成器发帧，能拿到（记得 ack）。
3. **遮罩双 rAF 窗口里 textarea 仍收键**：`applySource` 用 textarea 现值，否则旧 `sourceText` 吞掉最后一击键。
