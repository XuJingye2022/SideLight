# 第 135 轮计划审查（critic，revision 1 复审，只读）

**结论：PASS**（0×P0、0×P1；3×P2 不阻塞）。上一版 1×P1 + 4×P2 全部修掉，下面每条都是本机实跑复核，不是转述计划。

## 上一版漏洞：已修
- P1-1 ✓ A3 第 5 条列全 `:436`（模板）/`:444`（`（open 0）`）/`:460`（正则第 4 组），并给 `Select-String -Pattern '（open'` 守卫。本机实跑守卫输出 **3 行：436/444/460**，与 node 实读一致。
- P2-2 ✓ 取「test.md 明记一次性脚本」路线，7 个断 `open N · 共 M 条` + 2 个断快照行，方向对。
- P2-3 ✓ 计数限定 `-- src/components/MarginRail.tsx src/lib/revisionList.ts`。改前实测：`open ${row.open}` **1**、`按 open` **1**、`（open ` **2**、两文件 `REVIEW_STATUS_LABELS.open` **0**（exit 1），与目标的 1→0 / 1→0 / 2→0 / 0→2 逐项相等。
- P2-4 ✓ 只有硬线 320,000 是停止线，`--max 316200` 只记 Δ、超了不改文案凑字节。
- P2-5（上版附带）✓ A3 第 3 条改成落盘证据（`__vfs.files` 含 `"reviewStatus":"in-progress"`、不含 `处理中`、`status` 仍 `pending`）；`955` = 952+3 一致。

## 本机独立核对
- HEAD `2eeff4a`，工作区只多 `docs/iteration/round-135/`。门 `measure-first-screen.mjs`：gzip **316,137**、余硬线 3,863；`MarginRail-Dc6iBNG5.js` gzip9 **7,992**、`revisionList-B6PRvZi-.js` gzip9 **578** → B-229 **324,129**。与 §0 逐项相同。
- 行号（node 实读，1,087 行）：`MarginRail.tsx:1016`、`:1054`，`revisionList.ts:30`、`:32`；`REVIEW_STATUS_LABELS.open='待处理'`（`annotations.ts:37`）。
- 夹具可行：label 取「文件名 savedAt + JSON `bytes` + 四态计数」（`revisionList.ts:57-71`），`parseRevision` 只硬要求 `v===1`/`id`/`key`（`revisions.ts:71-95`），计划那份 JSON 能过；`.rail-snap-row` 只渲染 `{row.label}`（`MarginRail.tsx:1071-1072`），`^\d\d-\d\d …（待处理 1）$` 可断。
- 断言面没有漏：`revisions.test.ts` 只 `:510` 测名与 `:521` 正则含旧文案；r101 只 `:363-365` 断产品文案（`:455` 是测名）；`src` 其余 `（open` 命中都在注释或测试里。

## 剩余 P2（不阻塞，执行时顺手改）
- P2-A｜A2 引「`railDiffA11y.test.ts:22-25` 先摘注释」行号不对：`:22-25` 是 `sliceFrom`，摘注释的 `source()` 在 **`:14-18`**。修：写「照 `:14-18` 的 `source()`」，或直接写两条正则（`/\*…\*/` 与行首 `//`）。
- P2-B｜A3 第 6 条的旧脚本行数复核不了：我按「含 `· 共` 或 `open N`」数得 11/16/14/14/4/1/1/2，计划写 11/13/14/10/4/1/1 + `r114-tester-snap:114`——数法不同。修：test.md 不写死行数，改成「这 8 个脚本断旧文案 `open N · 共 M 条`／快照行，属第 101/103/105/107/114 轮一次性脚本，不纳入回归」，计划第 6 条同步成这一句。
- P2-C｜A3 第 1 条「先 Ctrl+S 造 1 份快照」是硬依赖：r101 假 FSA 会按需建目录（`.tmp/e2e-r101-review.mjs:140-147`），可做；但覆盖 JSON 前先断言 `[...__vfs.files.keys()].filter(k=>k.startsWith('.sidelight/revisions/')).length===1`（r114 脚本 `:269-270` 同写法），否则造快照失败会让后面 3 条断言一起红、难定位。

## 不阻塞
- `--max 316200` 余 63 B，入口只换定长哈希，预期 exit 0；真 exit 1 属门过紧，报 lead，不改文案。
- B-229 合计超线 4,129 是旧账，不归本轮；BACKLOG 无本队列条目，交 lead 收口。
- 复核脚本：`.tmp/r135-critic-lines.mjs`、`.tmp/r135-critic-oldscripts.mjs`。
