# 第 133 轮计划（P2：在审文件截断提示的篇数漂移）— revision 1

参数：round 133；startSha `f3699520efcd7bcaaaabd5fc8c111a781859734d`（HEAD `f369952`，工作区干净）；报告 `docs/iteration/round-133/`。本文件是修订 1，逐条修 `plan-review.md` 的 CR-1…CR-5；任务、范围、体积口径不变。

**执行顺序（CR-5）**：先 A2 第 1–2 步（HEAD 码 before）→ A1 改码 → A2 第 3–6 步。漏了 before 就 `git stash push -- src/lib/reviewFiles.ts src/components/MarginRail.tsx` 换回，跑完 `pop`，记两份改前 SHA256 与 `git stash list` 0（同第 131/132 轮）。

缺陷：上限 50、文案写 49。`MarginRail.tsx:1010-1012` 用 `reviewRows.rows.length` 拼文案；`reviewFiles.ts:104` 的 `liveClosed` 只删当前篇行（50→49），`:111` 的 `truncated` 保留 → 文案 49。证据：`.tmp/r131-finder.json` 的 `reviewGeom.truncatedNote` / `statusLive.afterClose`。

范围：`src/lib/reviewFiles.ts`、`src/components/MarginRail.tsx`、`src/lib/reviewFiles.test.ts`，加 `.tmp/e2e-r101-review.mjs` 一行断言（`.tmp/` 自忽略）；不动 `App.tsx` / `styles.css` / 编辑器 / 序列化；不 push、不碰 `release/`、不重启 5175。

## 0 体积

- HEAD：门 gzip **316,134 B**（余 3,866）、懒 chunk `MarginRail-*.js` gzip9 **7,878 B**（B-229 合计 324,012 超线仍 open，本批只按 +Δ 记）。
- 本批全在懒 chunk（`App.tsx:20` 的 `lazy(…)`）→ 首屏净增 **0 B**（±10），懒 chunk 预计 **50–120 B**；两条线都不破。

## A1 截断提示改固定上限，与 LIVE 行删除解耦

文件：`src/lib/reviewFiles.ts`、`src/components/MarginRail.tsx`、`src/lib/reviewFiles.test.ts`、`.tmp/e2e-r101-review.mjs`（backlog_id 空，收尾登记）

1. `DEFAULT_MAX_ROWS` → `export const REVIEW_MAX_ROWS = 50`，**5 行全改**：`:40` 声明、`:90` JSDoc、`:107`、`:110`、`:134`（CR-3）。
2. `applyLiveReviewRow` 后加 `export function reviewTruncatedNote(result: Pick<ReviewFilesResult, 'truncated'>): string | null`：假 → `null`，真 → ``在审文件太多，最多显示 ${REVIEW_MAX_ROWS} 篇。``。只收 `truncated`，结构上读不到 `rows`；「最多显示」在 49 行时仍真。
3. `MarginRail.tsx:29` import 加该函数；`:461` 后 `const reviewNote = reviewRows ? reviewTruncatedNote(reviewRows) : null`；`:1010-1012` 改 `{reviewNote && <p className="rail-diff-empty">{reviewNote}</p>}`。
4. 测试尾追加 3 条（20→23，夹具现成）：① 50 行截断 → 文案逐字 `在审文件太多，最多显示 50 篇。` 且 `REVIEW_MAX_ROWS === 50`；② 同一结果再 `applyLiveReviewRow(…, true)` → 49 行、`truncated` 真、文案与 ① 逐字相等（比 ① 的返回值，不写第二个字面量）——确定性回归；③ 60 篇假 FSA → rows 50 / truncated / 文案含「50 篇」，未截断 → `null`。
5. **CR-1**：`.tmp/e2e-r101-review.mjs:454` 改 `sheet.empty.some((text) => text.includes('在审文件太多') && text.includes('最多显示 50 篇'))`，第 ⑮ 条名与 capped 半句不动。

验收：`node --experimental-strip-types src/lib/reviewFiles.test.ts` **23/23**（基线 20/20 已实测）；`git grep -n DEFAULT_MAX_ROWS -- src` 改前 **5 行**（40/90/107/110/134，正向对照）改后 **0** exit 1；`git grep -nF '在审文件太多' -- src` 改后 **2 文件各 1 行**（`reviewFiles.ts` 返回值 + `reviewFiles.test.ts` 逐字期望串）、`MarginRail.tsx` 0（CR-4）；`git diff --stat` 只 3 个 `src/` 文件；负向：`REVIEW_MAX_ROWS` 改 49 → ① 红 exit 1，恢复后 23/23。

风险：stale 模块用 A2 身份门判；不改 `ReviewFilesResult` 结构。

## A2 真机复现 + 门禁

文件：`.tmp/e2e-r133-review-note.mjs`（改自 `.tmp/e2e-r131-finder.mjs` 的 52 篇夹具与 S4 段），`before|after` 分相跑；`shots/round-133/review-note.png`。每相先 `node .tmp/reset.mjs 57270`，ego CDP 57270、1440×900、假 FSA，结果 `.tmp/r133-{before,after}.json`。

1. **before（A1 前，HEAD 码）**：身份门 `fetch('/src/lib/reviewFiles.ts')` 数 `reviewTruncatedNote` = **0**；52 篇（a.md + n01–n51 各 1 条 open）→ 开「在审」→ rows **50**、文案含「只显示前 50 篇。」。
2. **复现 49（CR-2）**：`.rail-diff-close` → `wait 400` → `.note .note-status` `selectOption('resolved')` → **`wait 150`** → 点 `.rail-review-open` → `wait 900`；记 `t改档` / `t点击`，断言差 **<600 ms**（`App.tsx:2210-2213` 防抖）。rows **49**、`.is-current` **0**、文案含「只显示前 49 篇。」。超窗或 rows≠49 重跑整相，**不得记「复现不了」**；落盘后重开不算复现（`collectReviewFiles` 排除当前篇，51→50 行看着对）。
3. **after（A1 后，身份门 ≥1）**：rows 50 + 文案逐字 `在审文件太多，最多显示 50 篇。`；按第 2 步时序结项再开（同一 <600 ms 窗口，超窗重跑）→ rows **49**、`.is-current` 0、文案逐字同上；改回 open 再开 → rows 50、文案同上；0 pageerror；截图 1 张。
4. **回归（CR-1）**：`node .tmp/e2e-r101-review.mjs` → **57/57**、exit 0、0 pageerror；跑完 `git checkout -- shots/round-101/` 并 `git status` 复核。
5. 门禁：`npm test` **951 条 0 fail**（948 基线）；`node scripts/measure-first-screen.mjs --max 316400` exit 0，记 gzip 与 `gzipSync(dist/assets/MarginRail-*.js,{level:9})`；`roundtrip` 不跑。
6. 收尾：`impl.md` / `test.md`（两相数值、时间差、JSON 路径）；BACKLOG 加 P2 行（建议 B-265，ID 由 lead 定）；CHANGELOG 由 scribe 批末同步。

验收：before 50/49 且时间差有记录；after 两态文案都逐字 50、rows 50→49→50；r101 57/57；门 gzip ≤ **316,400**、懒 chunk ≤ **8,050**（余 172）；0 pageerror。风险：touch 两个 `src/` 后重跑；ego 断线重连，不改 9222–9226。

## 不做

- 不加「已隐藏 N 篇」口径（要改结果结构）。
- 不动 GlobalSearch「只显示前 200 处」。
- 不碰 diff 面板、修订快照、对话页签、批注卡与样式。
