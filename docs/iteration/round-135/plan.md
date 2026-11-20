# 第 135 轮计划（P2：在审列表与修订快照行仍写英文 open）— 单轮 · revision 1

参数：round 135；startSha `2eeff4a7…`（=HEAD、工作区干净）；报告 `docs/iteration/round-135/`。只做用户队列第 9 条（术语一致性）。
revision 1 按 `plan-review.md` 修 1×P1+4×P2（r114 三行、旧脚本口径、计数限两文件、320,000 停止线、盘上枚举+955）；范围不变。

## 现状（本轮逐行核对）
- 下拉已中文（`annotations.ts:31` 英文枚举 + `:35-40` 中文文案，`a8985f6` 第 128 轮）；存盘仍英文枚举。
- 三处显示仍英文：`MarginRail.tsx:1016` `按 open 数排序`、`:1054` `` `open ${row.open} · 共 ${row.total} 条` ``、`revisionList.ts:32` `` `… · 批注 ${total} 条（open ${open}）` ``（`:30` 注释）。
- 计数/排序不动（`reviewFiles.ts:66`、`revisionList.ts:66`）。

## 定案
三处统一取 `REVIEW_STATUS_LABELS.open`（单源）；枚举/存盘/排序键不改（改回英文推翻第 128 轮）。

## 0 体积（硬线 320,000）
- 现值（实跑）：门 gzip **316,137**（3 文件、raw 1,025,609、余 3,863）；chunk gzip9 `MarginRail-Dc6iBNG5.js` **7,992**、`revisionList-B6PRvZi-.js` **578**。B-229 口径（门+MarginRail）= **324,129**（超线 4,129，旧账，只记 Δ）。
- 本轮 Δ：三处都在懒 chunk，入口只多定长哈希字符 → 首屏预期 316,137±32；两 chunk gzip 合计 +25…45 → B-229 合计 324,154…324,174，仍超线。
- 门槛：只有硬线 **320,000** 是停止线。`verify` exit 0；`--max 316200` 预期 exit 0（余 63）。超了不改文案凑字节，记 Δ 报 lead。

## A1 产品码（2 文件 3 处）
1. `MarginRail.tsx:1016` → `按待处理数排序`。
2. `MarginRail.tsx:1054` → `` `${REVIEW_STATUS_LABELS.open} ${row.open} · 共 ${row.total} 条` ``（`:9` 已 import）。
3. `revisionList.ts:1` 增 `REVIEW_STATUS_LABELS` import；`:30` 注释改「（待处理数）」、`:32` 改单源插值。
4. 只改这三处与该行注释；不动 annotations.ts / styles.css / 计数排序 / 面板结构 / 其他内部注释（如 `:442`）。
验收（**计数只限两产品文件**，新门针串不计入；改前值本机已跑）：`git grep -cF`，`-- src/components/MarginRail.tsx` 下 `'open ${row.open}'` **1→0**、`'按 open 数排序'` 1→0；`-- src/lib/revisionList.ts` 下 `'（open '` **2→0**、`'（${REVIEW_STATUS_LABELS.open}'` **0→1**；两文件合数 `'REVIEW_STATUS_LABELS.open'` **0→2**。`npm run build` exit 0；`git diff --stat` 产品码只 2 文件。

## A2 单测与静态门（0 首屏字节）
`revisions.test.ts`、新 `src/lib/reviewLabelWording.test.ts`、`package.json`
1. `revisions.test.ts:510` 测名、`:521` 正则改「（待处理 1）」。
2. 新门 3 条（照 `railDiffA11y.test.ts:22-25` 先摘注释）：① `revisionLabel(1_700_000_000_000,6,2,1)` = `formatSavedAt(...)` 拼 `· 6 B · 批注 2 条（待处理 1）` 且不含 `open`；② MarginRail 摘注释后无 `open ${row.open}`/`按 open`，`REVIEW_STATUS_LABELS.open` 恰 1；③ revisionList 含之恰 1、无 `（open ${open}`。
3. `package.json` 的 `test` 串尾追加该文件。
4. 负向：`:1054` 换回 `open ${row.open}` → ≥1 红 exit 1；SHA256 还原后绿。
验收：`npm test` 68→**69 文件**、952→**955 条** 0 fail（+1 文件 +3 条；以实跑为准）。

## A3 真机 + 门禁 + 回归
`.tmp/e2e-r135-labels.mjs`（底 `.tmp/e2e-r101-review.mjs`）、`shots/round-135/review-labels.png`
1. `node .tmp/reset.mjs 57270`；ego CDP 57270、1440×900，dev 5175 不重启。夹具照 r101 `:38-54`（a.md 2 open+1 resolved、sub/b.md 1 open+1 in-progress）；a.md 快照：先 `Ctrl+S` 造 1 份，再按其文件名 hash 覆盖 JSON 为 `{v:1,id,key:'a',savedAt:0,bytes:6,annotations:[open,resolved],notes:[]}`。
2. 开「在审」：表头 `按待处理数排序`；行 `待处理 2 · 共 3 条`/`待处理 1 · 共 2 条`；sheet `innerText` 的 `/\bopen\b/` **0**；快照行匹配 `^\d\d-\d\d \d\d:\d\d:\d\d · 6 B · 批注 2 条（待处理 1）$`。
3. 枚举未坏（P2-5 盘上证据）：下拉 `selectedOptions` 中文、`value` 英文；改一卡到 in-progress → 停 1,600 ms → `window.__vfs.files.get('.sidelight/annotations/a.json')`（r101 `:161`）含 `"reviewStatus":"in-progress"`、不含 `处理中`、`status` 仍 `pending`。
4. 几何：`.rail-diff-sheet`/`.rail-snap-row` 的 `scrollWidth−clientWidth` 0（1440/1024×700）、行不重叠、钮 24×24、0 pageerror。
5. 回归先改期望文案（`.tmp` 用 edit 工具改，别用 PowerShell 替换、中文会坏）：`e2e-r101-review.mjs:363-365`（`open 2`→`待处理 2`、`open 1`→`待处理 1`）；`r114-tester-e2e.mjs:436` 模板、`:444` 真实快照行、`:460` 正则 `（open (\d+)）`→`（待处理 (\d+)）`——三行缺一，⑤逐行相等与⑧ total/open 解析必红；改前先 `Select-String -Path .tmp/r114-tester-e2e.mjs -Pattern '（open'` 确 3 处。跑 r101 **57/57**、r114 **27/27**（项数同改前）。
6. 其余一次性脚本不改，`test.md` 记「不纳入回归」（P2-2）：`e2e-r103-review-live` 11、`e2e-r105-review-closed` 13、`r103-tester-e2e` 14、`r105-tester-e2e` 10、`r101-tester-review` 4、`r103-tester-before` 1、`r107-tester-geom` 1 断 `open N · 共 M 条`；`r114-tester-snap:114`、`e2e-r114-a1-snapshots:364` 断快照行（行数实跑）。
7. 门禁：`verify` exit 0；`measure --max 316200` exit 0；报门 gzip、两 chunk gzip9、B-229 合计。超 320,000 停手报 lead。
8. 截图 1 张（两行 + 快照行）。不 push、不改 `release/`。

## 不做 / 风险
- BACKLOG 无这条（`git grep '术语'` 0），planner 不入池；建议 lead 收口记 P2。不动 `annotations.ts`、不做全应用术语扫描、不处理 B-229。
- 风险：1024 折行 → 几何断言兜；旧脚本按 `open N` 取样假红 → 第 5/6 步分新旧；体积超线 → 报 lead，不改文案。
- CDP 9222–9226 不用，真机走 ego 57270；门禁以实跑为准。
