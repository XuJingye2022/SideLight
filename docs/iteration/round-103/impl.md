# 第 103 轮实现（executor · A1/A2）

startSha `08f6581`（=HEAD）。A1 修 + A2 证，回滚 0 条。改动 3 文件 `+125/−13`，**`App.tsx` 0 行、`styles.css` 0 行**。

## A1 当前篇那行以内存为准（P2）—— DONE

- `reviewFiles.ts`：新 `countOpenAnnotations`（口径 = `reviewStatusOf === 'open'`），`collectReviewFiles` 原循环改调它；新 `applyLiveReviewRow(result, live)`——null 或 `total===0` 原样返回，否则按 path 去旧行、插 live、`compareRows` 重排、超 `DEFAULT_MAX_ROWS` 截 50 并置 `truncated`。
- `MarginRail.tsx`：渲染期算 `liveReviewRow`（`activePath` 非空且 `annotations.length>0` 时 open 由内存算、total 取 `annotations.length`）与 `reviewRows`；空态改判 `reviewRows === null || reviewRows.rows.length === 0`（CR-2），capped / truncated / 行渲染全走 `reviewRows`；文案/类名/`aria-current`/点击语义不动。
- 测试 13 → **17**（替换并重排、磁盘缺行补行、total 0/null 原样返回、50 行截断）。
- 静态 `git grep -cE 'applyLiveReviewRow|countOpenAnnotations' -- src`：改前 **exit 1（0 命中）** → 3 文件 **13 行**。

## A2 真机复现 + 回归 + 体积 —— DONE

`.tmp/e2e-r103-review-live.mjs`（假 FSA，CDP 57270、1440×900），JSON `.tmp/r103-review-live.json`，**改后 19/19 PASS、pageerror 0**：

- T2（a.md 2 条 = in-progress + open；open 那张改 resolved）→ 150 ms 开面板 **`open 0 · 共 2 条`**，停 1,800 ms 同值；冲刷后磁盘也 0 open。
- S2（d.md 3 条 = 2 open + 1 resolved；按 CR-1 只改卡片①）→ 200 ms 开面板 **`open 1 · 共 3 条`**。
- S3（e.md 磁盘 1 条；点第 4 段 + `.analyze-button` 造 1 条新 open）→ 造出后 **54 ms** 开面板，该行 **`open 2 · 共 2 条`**，同次 evaluate 读到磁盘仍只 `["e1"]`。
- 不波及：sub/b 行文本 4 采全同、关掉再开同值、`aria-current` 跟当前篇、0 error。
- **改前基线**（同脚本对 HEAD，`git stash push --` 三文件）**14/19**：5 条红全是目标断言、值正是旧值——T2 `open 1 · 共 2 条`（两采）、S2 `open 2 · 共 3 条`、S3 `open 1 · 共 1 条`、关掉再开仍旧值（`.tmp/r103-review-live-before.json`）。
- 回归 `.tmp/e2e-r101-review.mjs` **57/57 exit 0**，跑完 `git checkout -- shots/round-101/`；截图 `shots/round-103/review-live.png`（T2 面板：d 2/共 3、e 1/共 1、sub/b 1/共 1、**a open 0 · 共 2 条** 当前行高亮）。

## 体积

| 口径 | HEAD | 本轮 | 结论 |
| :--- | ---: | ---: | :--- |
| gate `--max 320000` | 315,155 | **315,151**（−4） | PASS，余 4,849，±100 内 |
| `MarginRail-*.js` gzip(9) | 6,573 | **6,700**（+127） | ≤6,980 ✓ |
| 真实首载 = gate + chunk（B-229） | 321,728 | **321,851**（+123） | 超 1,851（lead 定口径） |

## 门禁

`npx tsc --noEmit` 0；`npm run build` 0；`npm test` **61 文件 865 条 0 fail**（`.tmp/r103-npmtest.log`）；`measure-first-screen --max 320000` **PASS**。`roundtrip` 未跑（未动编辑器）。

## 建议

- CHANGELOG 一行：`- 修复：右侧「在审文件」里当前篇那行的 open / 共 N 条改用内存批注计算，改完复核状态立刻开面板不再显示旧数。`
- BACKLOG：B-228 补「当前篇那行以内存为准」；B-229 改 321,851。
- 边界：`total === 0` 保留磁盘行（写盘可能在飞），重开即真值。
- 计划外未做：CR-4（切档丢待写批注）只静态推断，交 lead 入池。

## 新踩坑（3 条）

1. 在审面板先画「正在读…」：直接读 `.rail-review-row` 会拿到 0 行（实测 37 ms 仍空态），要先 `waitForSelector`。
2. 改前基线要换同一 dev server 的代码：`git stash push -- <三文件>` + 摸 `LastWriteTime`，并复核 served 模块命中 `applyLiveReviewRow`（HEAD 0 / 改后 2）。
3. 改档位只换 `reviewStatus`、`total` 不变；验「total 已含未落盘条目」必须真造一条——模拟流在「段内只有一句」时恰好 1 条 evaluation，先等卡片 +1（回包约 1.3 s）再开面板。
