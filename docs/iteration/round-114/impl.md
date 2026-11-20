# 第 114 轮 A 轮实现（轮前 `531b650`）

状态：**A1、A2 完成**。

## A1 读接口 + 单测（B-247）

- `revisions.ts`：`revisionKeyHash`（:205）、`parseRevisionName`（:222）加 `export`，实现不动。
- `revisionList.ts`（新）：`RevisionSummary{name,savedAt,bytes,total,open,label}`、`formatSavedAt`（本地 `MM-DD HH:MM:SS` 补零）、`revisionLabel`、`findSnapshotsDir`（照 `cache.ts:104-114`，无 create）、`listRevisions(parent,key,max=8)`：只收 `kind==='file'` 且本键文件名（他键/坏名/旧格式不读）；savedAt 降序取前 max；逐个 `getFile()`→`parseRevision`，坏档跳过不补位；savedAt 取文件名、bytes/批注数取 JSON、open 按 `reviewStatusOf`；永不抛。
- `revisions.test.ts` +8（28→36）：无 `.sidelight`→[] 且 `root.dirs` 不新增；有 `.sidelight` 无 revisions→[] 不建；他键/坏名/旧格式 0 读；降序；10 份读 8；坏档跳过；JSON `savedAt:0` 用文件名；格式补零。
- 命令：`revisions.test.ts` **36/36**。静态：`listRevisions` 改前 0（exit 1）→**12 行**；新文件 `getDirectoryHandle\([^)]*create` **0**、`git grep -F 'revisionsDir('` **0**（对照 revisions.ts 2 行 create）；写侧旧用例保持。
- 坑：`notbase36` 是合法 base36，坏名要用非 8 位 hex 的 id。

## A2 入口 + 文档

- `MarginRail.tsx`：`Props` 加 `getRevisionSource`；`snapData`（null=不渲染，[]=空态）；`openReview` 与 `collectReviewFiles` 并行跑 `loadSnapshots(run)`（`await import('../lib/revisionList.ts')` 惰性）；`closeReview`/切页签/`docName` 变推进 `reviewRunRef` 并清 `snapData`（`docName` 变同时收面板）；在审 sheet 列表后加 `section.rail-snap` + `h3` + `ul.rail-snap-rows>li.rail-snap-row.rail-diff-row`（只渲染 `label`）+ 空态 + note。
- `App.tsx`：`getRevisionSource`＝`cacheDirFor()` + `cacheKey(docNameRef.current)`。
- `styles.css`：+39 行（6 条 `.rail-snap*`，0 删除）。
- `README.md`：「现在不能做什么」+1 行，含与 note 逐字同句。
- `.tmp/e2e-r114-a1-snapshots.mjs`（新；假 FSA 记 `read:/create:/write:/remove:`）。

E2E（ego CDP 57270、1440/1024 两档）**30/30 PASS**、0 pageerror（`.tmp/r114-e2e-snapshots.json`），14 条全过：开前 S 读 0 写 0 不建 `.sidelight`（夹具先清掉打开文件夹建的 trash）＋空态；Ctrl+S 1 份、改字再存 2 份、同正文第三次 digest 去重；种 7+坏名+他键（含 `savedAt:0`）；再开 8 行、`read:R` 恰 8、S 下写 0；严格降序；首行正则；`savedAt:0` 显文件名时刻；open/总数/字节对种子；note＝README；无工作区只提示；读取中关面板 0 行；换文档 `.rail-snap` 0 且 parse +1；两档横溢 0；`.rail-review-row` 0、0 pageerror。截图 `shots/round-114/revision-snapshots.png`。

## 体积（三数）

- 门 `--max 315900` **PASS gzip 315,464**（余 436；净 +246；`.tmp/r114-verify.log`）。
- 常驻 `MarginRail` gzip9 **7,337**（+421），未达计划 ≤6,980：`plan-review.md` H1 已判 6,980 无实现路径、建议 ≤7,400/只报实测，本轮在该口径内。
- 惰性 `revisionList` gzip9 **616**（不计首屏/合计）。
- **合计 315,464+7,337＝322,801，超硬线 2,801 B**（改前 322,134，+667）。

## 门禁

`tsc` 0；`npm test` **62 文件 892 条 0 fail**；`roundtrip` 不跑；回归 r101 57/57、r100 43/43、r105 33/33。

CHANGELOG：`- 「在审」面板列出修订快照：按保存时刻显示最近 8 份的字节数与批注数（只读，不存正文、不能回滚）。`

## 新踩坑

1. **`Get-Content -Raw|-replace|Set-Content` 把含中文的 UTF-8 读成 ANSI**：整文件乱码且吃掉模板反引号（TS1005/TS1160）；改源码文字用 write/edit。
2. **`parseRevisionName` 的 base36 判定宽**：第二段全 `[0-9a-z]` 即合法（`notbase36` 也合法），坏名用非 hex id。
3. **打开文件夹本来会建 `.sidelight/trash`**（`ensureTrashDir`）：验「无 `.sidelight`」要先清这层，否则 CR-1 恒红；面板自身 0 create。
