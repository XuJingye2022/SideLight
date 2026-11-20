# 第 135 轮 tester 独立验收

判定 **PASS**。tester 未读 `impl.md`；只读 `plan.md`、`git diff`、`BACKLOG.md`，证据全为本轮实跑。
参数：round 135；轮前 startSha `2eeff4a7b715573bb1f3ef1b904f22a8fe4bbad8`（= HEAD、树干净）；环境：dev `http://localhost:5175`（不重启）、ego 浏览器 **CDP 57270**（1440×900 / 1024×700）、假 FSA；9222–9226 未用。

## A1 产品码（2 文件 3 处）— PASS

`git grep -cF`（改前取 `HEAD`）：

| 文件 | 针串 | 改前 | 改后 |
| :--- | :--- | :--- | :--- |
| `MarginRail.tsx` | `open ${row.open}` | 1 | **0** |
| 同上 | `按 open 数排序` | 1 | **0** |
| `revisionList.ts` | `（open ` | 2 | **0** |
| 同上 | `（${REVIEW_STATUS_LABELS.open}` | 0 | **1** |
| 两文件合数 | `REVIEW_STATUS_LABELS.open` | 0 | **2**（各 1） |

`git diff --stat -- src/components/MarginRail.tsx src/lib/revisionList.ts` = 2 文件 5+/5−；产品码只这 2 文件（其余为 `revisions.test.ts`、`package.json`、新测试文件）。三处实际文案：`:1016`「按待处理数排序」、`:1054` `${REVIEW_STATUS_LABELS.open} ${row.open} · 共 ${row.total} 条`、`revisionList.ts:32` `…（${REVIEW_STATUS_LABELS.open} ${open}）`；枚举/存盘/排序键未动。

## A2 单测 + 新静态门 — PASS

- 新 `src/lib/reviewLabelWording.test.ts` **3 条**（先摘注释；① `revisionLabel(1_700_000_000_000,6,2,1)` = `formatSavedAt(...)` 拼「· 6 B · 批注 2 条（待处理 1）」且不含 `open`；② MarginRail 无 `open ${row.open}` / `按 open`、单源恰 1；③ revisionList 无 `（open `、单源恰 1），已挂 `package.json` test 链尾。
- 负向：把 `MarginRail.tsx:1054` 换回 `open ${row.open}` → **1 红 exit 1**（`.tmp/r135-tester-negative.log`）；SHA256 `0A0F8048DADC267018B691658EFD536CD084AB8BD2ABFDA0D19D9D631364237C` 逐字节还原后 **3/3 exit 0**（`.tmp/r135-tester-positive.log`）。
- `revisions.test.ts:521` 正则改为 `（待处理 1）`，全链实跑 **69 文件 955 条 0 fail**（改前 68/952，+1 文件 +3 条，`.tmp/r135-tester-npmtest.log`）。

## A3 真机 + 枚举证据 + 回归 — PASS

自写 `.tmp/r135-tester-labels.mjs`（底 r101 假工作区；a.md 2 open + 1 resolved、sub/b.md 1 open + 1 in-progress、c.md 无批注；先 `Ctrl+S` 造 1 份快照再按文件名覆盖 JSON 为 `{v:1,bytes:6,annotations:[open,resolved]}`）：

- 身份门：dev 交付的 MarginRail = 新文案（旧串 0、单源恰 1）、revisionList 单源恰 1、无「（open 」。
- 表头「按待处理数排序」；行 **「待处理 2 · 共 3 条」/「待处理 1 · 共 2 条」**；`sheet.innerText` 的 `/\bopen\b/` = **0**；快照行「11-20 21:40:41 · 6 B · 批注 2 条（待处理 1）」逐字命中 `^\d\d-\d\d \d\d:\d\d:\d\d · 6 B · 批注 2 条（待处理 1）$`；c.md 不出现、2 行。
- 几何：`.rail-diff-sheet` / `.rail-snap-row` 的 `scrollWidth−clientWidth` = **0/0**（1440/1024 两档）、两行不重叠、sheet 在视口内、关闭钮 / 在审 / 对比三钮高 **24**（宽 23.58/35/35，≥24 口径）。
- 枚举：3 卡下拉 `selectedOptions` 中文、`value` 英文；四档 `open/in-progress/resolved/wont-fix` →「待处理/处理中/已解决/不修复」；改一卡到 in-progress 后 **1,600 ms** 读 `.sidelight/annotations/a.json` 含 `"reviewStatus":"in-progress"`、不含「处理中」、三态 in-progress/open/resolved、该条 `status` 仍 `pending`，卡上显示「处理中」。
- **23/23、0 pageerror / 0 console error**（`.tmp/r135-tester-labels.json`）；截图 `shots/round-135/review-labels.png`。
- 回归（期望文案已更新为 `待处理`，项数同改前）：`.tmp/e2e-r101-review.mjs` **57/57 exit 0**、`.tmp/r114-tester-e2e.mjs` **27/27 exit 0**；跑后 `git checkout -- shots/round-101/`，`shots/` 无残留。计划列的一次性脚本（`e2e-r103/r105` 等断 `open N`）未纳入回归。

## 门禁与体积

- `npm run verify` **exit 0 PASS**：tsc + vite build + host-www 99 文件；门 gzip **316,131 B**（raw 1,025,609、files=3、headroom 3,869，≤320,000）。
- `node scripts/measure-first-screen.mjs --max 316200` **exit 0**（余 69 B）。
- 懒 chunk gzip9：`MarginRail-mKbKnT4r.js` raw 22,721 / **7,999**、`revisionList-DW8Pa-J8.js` raw 958 / **585**；B-229 口径（门+常驻 chunk）= **324,130**（对第 134 轮 324,129 净 **+1**，超硬线 **4,130**，属旧账 B-229 仍 `open`，只记 Δ，不改文案凑字节）。
- `npm test` **69 文件 955 条 0 fail**；`roundtrip` 不跑（未动编辑器/序列化）。

## 说明 / UNVERIFIED

- BACKLOG 无这条（用户队列第 9 条术语一致性，planner 未入池）；按 plan 不加行，建议 lead 收口记 P2。
- 未验证：真 WebView2 宿主、真实中文 IME。负向改动已按 SHA256 还原，工作树只剩本轮改动。
- 证据：`.tmp/r135-tester-*.{json,log,mjs}`（labels / negative / positive / verify / npmtest / reg-r101 / reg-r114）；截图 `shots/round-135/review-labels.png`。
