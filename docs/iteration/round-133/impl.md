# 第 133 轮实现（executor）

参数：round 133，startSha `f369952`；顺序按 CR-5：A2 第 1–2 步（HEAD 码 before）→ A1 改码 → A2 第 3–6 步。

## A1 截断提示改固定上限，与 LIVE 行删除解耦：DONE

- `src/lib/reviewFiles.ts:40` `DEFAULT_MAX_ROWS` → `export const REVIEW_MAX_ROWS = 50`，5 处旧引用全换（`:90` JSDoc、`:107`、`:110`、`:145`）；`:116-124` 新 `reviewTruncatedNote(result: Pick<ReviewFilesResult,'truncated'>)`：真 → `在审文件太多，最多显示 ${REVIEW_MAX_ROWS} 篇。`、假 → `null`，结构上读不到 `rows`。
- `src/components/MarginRail.tsx:24` import；`:463-464` `reviewNote`；`:1013-1015` JSX 用它（旧的 `reviewRows.truncated` + `rows.length` 已删）。
- `src/lib/reviewFiles.test.ts` 20→23：① 50 行截断逐字 + `REVIEW_MAX_ROWS === 50`；② liveClosed 删行 50→49 后文案用同函数 50 行结果对照（不写第二个字面量，回应 plan-review P2-3）；③ 60 篇假 FSA 截 50 行含「50 篇」、未截断 `null`。
- 负向：`REVIEW_MAX_ROWS` 改 49 → 测试 ① 红 exit 1；改回后 23/23 pass exit 0。

静态门（改前 → 改后）：

- `git grep -n DEFAULT_MAX_ROWS -- src/lib/reviewFiles.ts`：5 行（40/90/107/110/134）→ 0、exit 1。按 plan-review P1-2 用 scoped 门；`-- src` 全域 7→2（只剩 `diffView.ts` 同名常量），未动 diffView。
- `git grep -n REVIEW_MAX_ROWS -- src/lib/reviewFiles.ts`：7 行（40/90/107/110/116/123/145）；计划写 5 是加函数前的口径。
- `git grep -nF '在审文件太多' -- src`：`reviewFiles.ts:123`、`reviewFiles.test.ts:409` 各 1；`MarginRail.tsx` 0。
- `git diff --stat`：只 3 个 src 文件（MarginRail +7/−2、test +40/−1、reviewFiles +21/−5）。

## A2 真机复现 + 门禁：DONE

新 `.tmp/e2e-r133-review-note.mjs`（52 篇夹具，改自 r131 finder 的 S4；before|after 分相）。

- before（HEAD 码，身份门两模块 `reviewTruncatedNote` 均 0）：`.tmp/r133-before.json` 7/7 pass。首开 rows 50 +「只显示前 50 篇。」；改档 resolved 后 **173.9 ms** 点开 → rows 49、`.is-current` 0 +「只显示前 49 篇。」；0 pageerror。
- after（身份门 reviewFiles **1**、MarginRail **2** 且旧串 0）：`.tmp/r133-after.json` **11/11**、0 pageerror。rows **50→49→50**、三态文案恒逐字；时间差 **187.2 ms**；截图 `shots/round-133/review-note.png`（49 行态）。
- 回归 `node .tmp/e2e-r101-review.mjs`：**57/57** PASS、exit 0、0 pageerror；跑完 `git checkout -- shots/round-101/` 无残留。
- 门禁：`npx tsc --noEmit` exit 0；`npm test` 68 文件 **951 条 0 fail**；`npm run verify` gzip **316,135 B**（HEAD 316,134，净 +1）PASS；`measure-first-screen --max 316400` exit 0（余 265）；新 `MarginRail-CA2BPyQ0.js` raw 22,309 / gzip9 **7,907**（+27/+29，≤8,050 余 143）。

## 计划偏差（不扩大范围）

- 静态门与体积门按 plan-review P1-1/P1-2：先 build 再量新 dist；静态门 scoped + 全域对照。
- plan-review P2-4：同时改 `.tmp/r101-tester-review.mjs:540-541` 旧断言（.tmp 自忽略）。
- BACKLOG 已加 B-265（`fixed`；ID 由 lead 确认）。

## CHANGELOG 建议（scribe 并入）

- 修复：在审文件面板截断提示改为固定上限「最多显示 50 篇」，当前篇结项后行数 50→49 不再写成「只显示前 49 篇」。

## 新踩坑（≤3）

1. **Vite 交付 MarginRail 混合版本**：import 已含新符号、JSX 仍是旧串，页面照旧显示「只显示前 50 篇」——只看 `reviewFiles.ts` 的身份门会假绿。touch 组件文件后恢复；e2e 门改为同时断组件模块旧串 0。
2. **`git grep DEFAULT_MAX_ROWS -- src` 改前 7 行不是 5**：`diffView.ts` 同名常量 2 行，按 5→0 判会误红；静态门要 scoped。
3. **PowerShell 整文件回写做负向要用无 BOM UTF-8**（`Text.UTF8Encoding($false)`），否则 `git diff` 整篇翻红。

## 未验

- 真 WebView2/真实 IME/macOS 未跑；before 相身份门只 `rec`（值 0/0），after 相已 `check`。
