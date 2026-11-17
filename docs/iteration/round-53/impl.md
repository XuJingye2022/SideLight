# 第 53 轮执行报告（executor）

参数：round=53 / startSha `86ba2d1` / 0.32.1 / dev `:5175` / CDP 9222。状态：**A1 实现完成、功能项全过，1 MB 两条时延门槛未达（PARTIAL）**。

## A1（B-115）源码态只 hidden、不卸载编辑器

改动文件：`src/App.tsx`（+34/−4）。
1. 渲染分支 `:5373-5408`：拆开两个三元——源码框单独 `{sourceMode && …}`；编辑态 `div.doc-layout` 加 `hidden={sourceMode}`，`EditorContent`/`MarginRail` 不再随源码卸载；预览仍整块卸载。
2. `:591-600` 新增 `sourceScrollTopRef`，`:4222-4241` 退出源码后双 rAF 还原 `scrollTop`（≤1 px 不动）。
3. 进源码两处入口（`switchView :4210`、`enterSourceFor :563`）在 `setViewMode` 前记 `scrollTop`。
4. `:2136` 批注定位守卫与 deps 未动；隐藏期不调 `focusEditor()`；`applySource`/脏基线未动。

## 实测（`.tmp/e2e-r53-a1.mjs`，改前后同脚本：1 MB 7 轮、100 KB 20 轮，1440×900）

| 指标 | 改前 | 改后 | 目标 |
| :--- | ---: | ---: | :--- |
| 1 MB 进源码 p50 | 9,921 ms | **1,100 ms** | ≤300 ✗ |
| 1 MB 进 long task max | 8,998 ms | **1,015 ms** | 无 >500 ✗ |
| 1 MB 退出 p50 | 2,054 ms | **495 ms** | ≤300 ✗ |
| 100 KB 进 p95 | 305 ms | **116 ms** | ≤120 ✓ |
| 100 KB 出 p95 | 232 ms | **72 ms** | ≤120 ✓ |

其余验收：`sl-parse-done` 前后相等（1 MB 3/3、100 KB 4/4）✓；源码 hash 同改前（`1557349733` / `2403853241`）✓；源码态 `.ProseMirror` 1 个 / 44,446 块 / `contenteditable=true` / `textContent` hash `2840984326` 与编辑态同 ✓；退出后同 hash ✓；预览态编辑器 `.ProseMirror` 0 个 ✓；`scrollTop` 差 0 px（改前 −11,955）✓；console 0 ✓。JSON：`.tmp/r53-a1-*.json`。

功能回归 `.tmp/e2e-r53-a1-func.mjs`：源码框追加「第三段新内容。」→ 退出正文含该段 ✓；**Ctrl+Z 不能撤销**是既有设计（`setMarkdown` 走 `addToHistory:false`，`App.tsx:1061/1080`），非本轮回归，R5 该断言与现状冲突。截图 `shots/round-53/a1-source-hidden.png`。

## 未达门槛的成因（已量化）

- `.tmp/e2e-r53-a1-tavariants.mjs`：1 MB 文本挂进 `<textarea>` **仅布局**就 486–831 ms（默认 527 / `wrap=off` 486；500 KB 只 104 ms，近线性），同文本 `<pre>` 仅 153 ms → 进源码 1.1 s 里 0.5–0.7 s 是 textarea 原生排版，与卸载无关。
- `.tmp/e2e-r53-a1-probe.mjs`：隐藏 44,446 块 35 ms、显示回来 284–297 ms、`scrollTop` 还原 0 ms → 退出 495 ms ≈ 重排 284 + `applySource` 序列化 ~91 + 渲染/焦点。
- 计划按「textarea 几乎免费（`initTextarea` 17 ms）」定的 300 ms 在 textarea 方案下不可达；达标须换显示机制（源码虚拟化或非 textarea 只读文本层），建议 B 轮/BACKLOG 另立条目。

## 门禁

`npx tsc --noEmit` exit 0；`npm test` 34 文件 **442 条 0 fail**；`npm run verify` **PASS** `gzip=296135`（+80 B），硬线余 23,865 / 内部余 13,865。未 commit、未改版本与 `release/`；`roundtrip` 未跑（只改视图挂载），日志 `.tmp/r53-exec-{test,verify}.log`。

## CHANGELOG 建议

`源码模式不再卸载编辑器：1 MB 文档切源码不再冻结（进 9.9 s→1.1 s、出 2.1 s→0.5 s），进出保留阅读位置，源码/预览外观与行为不变。`

## 踩坑（新）

1. 1 MB 文本进 `<textarea>` 本身就是 0.5–0.7 s 原生排版，`wrap`/`contain`/`spellcheck` 都降不下来（同文本 `<pre>` 只 153 ms）；拿 textarea 当只读源码会误判性能目标。
2. `hidden` 收起布局后 `scrollTop` 夹到 0，且 `focus()` 引起的滚动排在 rAF **之后**：还原要查两次 rAF（只查一次时 1 MB 失败、100 KB 成功，易假绿）。
3. 预览面板根节点也带 `.ProseMirror` 类（`PreviewPane.tsx:79`，纯排版），判预览无编辑器须数 `.ProseMirror:not(.preview-pane)`。

另：`AGENTS.md` 第 8 节「源码模式里 `.ProseMirror` 不在 DOM」已不成立（现在在 DOM、`display:none`，`focus()` 仍空操作），交 scribe 同步。

---

# 返修记录（executor-fix，按 `test.md` 四条失败项）

参数同上（round=53、dev `:5175`、CDP 9222、轮前 `86ba2d1`）。结论：**四条里修好 1 条（1 MB 退出），其余 3 条按实测卡在机制下界，需改门槛或换源码渲染方式**。下面所有复验都用 tester 自己的脚本（`.tmp/e2e-r53-tester-{a1,small,func}.mjs`），数字可直接对照 `test.md`。

## 改动（3 处，未扩大范围）

1. `src/App.tsx:424`、`:2081-2092`、`:5528`：源码模式字数从渲染表达式改成停下 200 ms 再算（`sourceStats`）。`countText` 在 1 MB 上是 47 ms（`.tmp/r53-a1-prof.json`），原来进出源码与源码里每打一个键都重扫一遍。
2. `src/styles.css:106-122`：源码态编辑视图仍带 `hidden` 属性，但用新类 `.source-hidden` 压过 `[hidden]` 的 `display:none`，改成「保留排版 + 尺寸收成 0」（`height:0`、`overflow:hidden`、`visibility:hidden`、`scale(0)`）。`hidden` 属性、`.ProseMirror` 的 rect 为 0、`textContent`、`contenteditable` 都不变；`getComputedStyle().display` 由 `none` 变 `grid`（几何/无障碍等价：不可见、不可聚焦、不进无障碍树）。
3. `src/styles.css:1597-1600`：`.source-editor { contain: layout paint }`（同页 A/B：进 1082→1003、出 577→493，`.tmp/r53-fix-ab-contain.json`）。

## 复验（改后，同脚本）

| 指标 | 门槛 | test.md（改前） | 返修后 | 判 |
| :--- | :--- | ---: | ---: | :--- |
| 1 MB 进源码 p50 | ≤300 | 1111 | **1105**（p95 1399） | ✗ |
| 1 MB 进 long task | 0 | 7/7（769–1067） | **7/7（811–1260）** | ✗ |
| 1 MB 退出 p50 | ≤300 | 497 | **285**（7 轮 283–332） | ✓ |
| 100 KB 进 p95 | ≤120 | 122 | **125**（p50 105） | ✗ |
| 100 KB 出 p95 | ≤120 | 73 | 48 | ✓ |

- 结构与行为（`.tmp/r53-fix-a1-after2.json`）：`shapeOk=true`（7/7 轮 `.ProseMirror` 1 个、44,446 块、`contenteditable=true`、`textContent` hash 2840984326 相等、`pmVisible=false`、`hidden=true`）；`sl-parse-done` 3→3；`srcLen=1,000,012`、`srcHash=1557349733` 同改前；`scrollDiff` 7/7 为 0；预览态 `.ProseMirror` 0；console 0。
- 功能（`.tmp/r53-fix-func.log`）：与 tester 那次逐项相同（源码改段→Esc→正文含新内容、焦点回正文、`focus()` 打 hidden 编辑器无效、源码→预览→编辑、`.dirty`）——唯一差异是上面说的 `display: none → grid`。
- 截图（`.tmp/e2e-r53-fix-shot.mjs`，1 MB）：`shots/round-53/fix-source-1mb.png`（源码框有字、焦点环在）、`shots/round-53/fix-exit-1mb.png`（退出后正文正常、`scrollTop` 从 4000 还原到 4000）。

## 剩下 3 条为什么修不动（都是实测下界，不是没做）

- **1 MB 进源码**：`.tmp/e2e-r53-fix-costsplit.mjs` 在同页先把 1 MB 文本塞进一个同规格 textarea 单独量——**555–761 ms 就是原生排版本身**，而整次进源码 1180–1319 ms。即使把外围全砍掉也过不了 300。变体（`.tmp/r53-fix-variants2`，`e2e-r53-fix-variants2.mjs`）：默认 484、`contain:strict` 364、`wrap:off`+`contain` 350、`<pre>` 125–168；`content-visibility:auto` 只是把成本挪到 paint（合计 664 vs 638）。`wrap:off` 是唯一能再降的维度，代价是中文长行不再折行，不接受。
- **进源码 long task**：同一个 555–761 ms 排版天然是一条 >500 ms 任务。要拆成多帧只能分块写 `value`，累计成本更高（超线性）。
- **100 KB p95 125**：p50 105 已达标，剩下 20 ms 是 textarea 排版 ~60–70 + dev React + `waitForFunction` 的 rAF 轮询粒度（0–16.7 ms）；与改前的 122 同属抖动。改前 122/改后 125 不构成回归。

## 建议（超出 executor-fix 权限，交根代理/planner）

1. **换源码渲染方式**：源码框改成「`<pre>` 只读显示 + 可见窗内的输入层/分行虚拟化」。这会改动验收契约（现行要求 `textarea.value` = 全文、源码态 `.ProseMirror` rect 为 0），契约要与实现一起改。
2. **或按实测下界重设门槛**：进 p50 ≤700、进 long task 0 条 >800、出 p50 ≤300（已达成 285）、100 KB p95 ≤135。

## 门禁

`npm test` 34 文件 **442 条 0 fail**（`.tmp/r53-fix-test.log`）；`npm run verify` **PASS** `gzip=296230`（改前 296135，+95 B；内部余 13,770 / 硬线余 23,770，`.tmp/r53-fix-verify.log`）；`scripts/keyboard-acceptance.mjs` **51/52**（唯一 FAIL 仍是既存 B-209；`Ctrl+/ 切源码`、`Esc 退出源码回编辑` 均 PASS，`.tmp/r53-fix-keyboard.log`；`shots/round-05` 已还原）。`tsc --noEmit` exit 0（含在 build 里）。`roundtrip` 未跑：只动视图挂载/CSS/字数计算，未改序列化。

## 踩坑（返修新增）

4. 源码态用 `display:none` 收起 1 MB 编辑器，退出时要重建 44,446 块排版 **299–411 ms**；改成「保留排版 + `height:0`/`visibility:hidden`/`scale(0)`」后退出 568→283 ms，且 `.ProseMirror` 的 `getBoundingClientRect().width` 仍是 0（`scale(0)` 也作用到子节点 rect）。
5. `content-visibility: auto` + `contain-intrinsic-size` 会把 textarea 的排版成本整段挪到 paint 帧（合计 664 vs 638），拿它当「布局免费」会假绿。
6. A/B 必须同页交替（注入 `<style>` 切 `contain`），跨进程重复测量 1 MB textarea 的波动有 ±25%（484–762 ms）。
7. tester 的 `.tmp/e2e-r53-tester-a1.mjs` 会覆盖写 `.tmp/r53-a1-tester.json`：返修复跑后那份数据是本轮的，改前那次只剩 `.tmp/r53-tester-a1.log`；返修两次的数据另存 `.tmp/r53-fix-a1-after{,2}.json`。
