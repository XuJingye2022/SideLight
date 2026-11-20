# 第 135 轮执行报告（round 135 / startSha 2eeff4a7）

## A1 三处显示取 REVIEW_STATUS_LABELS.open —— DONE
- `src/components/MarginRail.tsx:1016` 表头 → `按待处理数排序`；`:1054` → `${REVIEW_STATUS_LABELS.open} ${row.open} · 共 ${row.total} 条`。
- `src/lib/revisionList.ts:1` 加 `REVIEW_STATUS_LABELS` import；`:30` 注释改「（待处理数）」；`:32` → `…批注 ${total} 条（${REVIEW_STATUS_LABELS.open} ${open}）`。
- 未动 annotations.ts / styles.css / 计数与排序。
- `git grep -cF`（改前用 `HEAD --` 同口径；中文模式走 `.tmp/r135-pat-*.txt`）：`open ${row.open}` 1→0、`按 open 数排序` 1→0、`（open ` 2→0、`（${REVIEW_STATUS_LABELS.open}` 0→1、两文件 `REVIEW_STATUS_LABELS.open` 0→2。`git diff --stat` 产品码只这 2 文件；build exit 0。

## A2 单测 + 新静态门 —— DONE
- `revisions.test.ts:510` 测名、`:521` 正则改「（待处理 1）」。
- 新 `src/lib/reviewLabelWording.test.ts` 3 条：① `revisionLabel(1_700_000_000_000,6,2,1)` = `formatSavedAt(...)` 拼 `· 6 B · 批注 2 条（待处理 1）` 且不含 `open`；② MarginRail 摘注释后无 `open ${row.open}` / `按 open`、单源恰 1；③ revisionList 含之恰 1、无「（open 」。`package.json` test 链尾追加。
- `npm test` **69 文件 955 条 0 fail**（68/952 → +1 文件 +3 条）。负向：`:1054` 换回旧串 → **1 红 exit 1**；SHA256 还原后 3/3 绿。

## A3 真机 + 门禁 + 回归 —— DONE
- 新 `.tmp/e2e-r135-labels.mjs`（底 r101；ego CDP 57270、dev 5175 不重启、1440×900 / 1024×700）：**23/23 PASS、0 pageerror**（`.tmp/r135-e2e-labels.json`）。表头「按待处理数排序」；行「待处理 2 · 共 3 条」「待处理 1 · 共 2 条」；sheet innerText `/\bopen\b/`=**0**；快照行 `11-20 21:35:30 · 6 B · 批注 2 条（待处理 1）` 匹配计划正则；下拉 selectedOptions 中文 / value 英文（四档逐项）；改一卡 in-progress 后 618 ms 盘上 `a.json` 含 `"reviewStatus":"in-progress"`、无「处理中」、`status` 仍 `pending`；sheet 与 `.rail-snap-row` 横向溢出 0、行不重叠、两入口 35×24、关闭钮 23.58×24。
- 快照夹具按 plan P2-C：Ctrl+S 后先断言 `.sidelight/revisions/` 恰 1 份，再按其文件名覆盖 JSON（bytes:6、1 open + 1 resolved）。P2-A 用两条正则摘注释，未引旧行号。
- 回归先改期望：`.tmp/e2e-r101-review.mjs:363-365`、`.tmp/r114-tester-e2e.mjs:436/:444/:460` → r101 **57/57**、r114 **27/27**（项数同改前）；跑后 `git checkout -- shots/round-101/` 还原被覆盖的历史截图。
- 不纳入回归（plan P2-B）：e2e-r103-review-live、e2e-r105-review-closed、r103-tester-before、r103-tester-e2e、r105-tester-e2e、r101-tester-review、r107-tester-geom、r114-tester-snap、e2e-r114-a1-snapshots 断旧文案。
- 门禁：`verify` exit 0（gzip **316131 B**，改前 316137、Δ−6，余 3869）；`measure --max 316200` exit 0（余 69）；chunk gzip9 `MarginRail` **7999**（+7）、`revisionList` **585**（+7）→ B-229 口径 **324130**（改前 324129、Δ+1，仍超线 4130，旧账）。首屏未破 320000。`npx tsc --noEmit` exit 0；`roundtrip` 不跑（未动编辑器/序列化）。

## 截图 / CHANGELOG
- `shots/round-135/review-labels.png`
- CHANGELOG 一行建议：「右侧在审列表与修订快照的待处理数改为中文「待处理」，与四态下拉同一套文案。」

## 新踩坑
1. `git grep` 的中文模式经 PowerShell 控制台会乱码（回执出现 `锛坥pen`），计数不可信：模式写进 `.tmp/*.txt` 用 `git grep -cF -f <file>`，改前用 `HEAD --` 同口径对照。
2. `.tmp/e2e-r101-review.mjs` 会覆盖已跟踪的 `shots/round-101/*.png`，跑完立刻 `git checkout -- shots/round-101/`。
3. 快照行的字节只读 JSON 里的 `bytes`（不与正文比对）；覆盖夹具时保留原文件名（其 `savedAt` 为准）即可控时刻。
