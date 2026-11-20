# 第 133 轮测试记录（tester 独立验收）

结论：**A1 / A2 PASS**。未读 `impl.md`，只读 `plan.md`、`plan-review.md`、`git diff`、`BACKLOG.md`。环境：ego 浏览器 CDP 57270、1440×900、dev `http://localhost:5175`、假 FSA 52 篇（a.md + m01–m51 各 1 条 open 批注）；每相先 `node .tmp/reset.mjs 57270`。自写脚本 `.tmp/r133-tester-a2.mjs before|after`，证据 `.tmp/r133-tester-{before,after}.json`。

## A1 静态门 + 单测

- `node --experimental-strip-types src/lib/reviewFiles.test.ts`：**23/23 pass、exit 0**（HEAD 树基线 **20/20**）。
- 负向 `REVIEW_MAX_ROWS` 改 49 → **exit 1**，测试 ①「50 行截断时逐字写「最多显示 50 篇」」红（另有 5 条随常量 49 一并红）；改回后 23/23，`reviewFiles.ts` SHA256 `2380DC43C31155288F3CE9EEDDF51F22E4D1AC426552463FF82E72FAAFF68E45` 复原。
- `git grep -n DEFAULT_MAX_ROWS -- src/lib/reviewFiles.ts`：HEAD **5 行（40/90/107/110/134）** → 改后 **0 行、exit 1**；对照 `-- src/lib/diffView.ts` 改前后都 **2 行**（30/58）。`-- src` 全域 HEAD **7 → 2**（见偏差 1）。
- `git grep -n REVIEW_MAX_ROWS -- src/lib/reviewFiles.ts`：**7 行**（40/90/107/110/116/123/145）。
- `git grep -nF '在审文件太多' -- src`：`reviewFiles.ts` **1 行**（`:123` 返回值）、`reviewFiles.test.ts` **1 行**（`:409` 期望串）、`MarginRail.tsx` **0**。
- `git diff --stat`：`src/` 只 3 个文件（+61/−8），另有 `BACKLOG.md` 1 行。

## A2 真机 before / after

| 相 | 身份门（fetch 模块串） | 首开 | 结项后 <600 ms 重开 | 结果 |
| :--- | :--- | :--- | :--- | :--- |
| before（HEAD 码） | reviewFiles `reviewTruncatedNote` **0** / MarginRail **0** 且旧串「在审文件太多，只显示前」**1** | rows **50**、`.is-current` 1、「在审文件太多，只显示前 50 篇。」 | 改档→点击 **187.9 ms**；rows **49**、`.is-current` **0**、「只显示前 **49** 篇。」（缺陷复现） | **9/9 PASS**、0 pageerror |
| after | reviewFiles **1** / MarginRail **2**、旧串 **0** | rows **50**、`.is-current` 1、逐字「在审文件太多，最多显示 50 篇。」 | 改档→点击 **188.9 ms**；rows **49**、`.is-current` 0、文案**同一句逐字** | **13/13 PASS**、0 pageerror |
| after 第 3 态 | — | 改回 open 再开：rows **50**、文案同上逐字 | — | 同上 |

- 两态文案取自 `.rail-diff-empty` 的 `textContent.trim()` 逐字比对（数组内含该串、且不含「只显示前」）。
- 换码只走 `git stash push --` 三个 src 文件 → 跑完 `pop`；三文件 SHA256 改前/改后**逐项相等**、`git stash list` **0**。
- 截图 `shots/round-133/review-note.png`（49 行态：列表首行 m01.md、a.md 不在列、提示写 50）。

## 回归与门禁

- `.tmp/e2e-r101-review.mjs`：**57/57 PASS、exit 0、0 pageerror**；跑后 `git checkout -- shots/round-101/`，`git status` 无该目录残留。
- `.tmp/e2e-r100-diff.mjs`（同组件对比面板）：**43/43 PASS、exit 0**；跑后还原 `shots/round-100/`。
- `npm test`：**68 文件 951 条、pass 951、fail 0**（exit 0）。
- `npm run verify`：**PASS**（tsc + vite build + host-www 镜像 99 文件）。`node scripts/measure-first-screen.mjs --max 316400`：**exit 0**、raw **1,025,609** / gzip **316,135 B** / headroom **265**（对 132 轮 316,134 净 **+1 B**）。
- 懒 chunk `dist/assets/MarginRail-CA2BPyQ0.js`：raw **22,309**、gzip9 **7,907**（≤8,050，余 143；改前 22,282 / 7,878，净 +27 / +29）。B-229 口径合计 **324,042**（超硬线 4,042，B-229 仍 `open`，只记）。
- `roundtrip` 不跑（未动编辑器 / 序列化）。

## 偏差（不判 FAIL）

1. 任务书「`git grep -n DEFAULT_MAX_ROWS -- src` 改后 0 行 exit 1」照字面不成立：HEAD 的 `src/lib/diffView.ts:30,58` 已有同名常量，全域只能 7→2。按 `plan-review.md` P1-2 的修正口径判 scoped `reviewFiles.ts` 5→0（并留 diffView 2→2 对照）。
2. 计划估首屏净增 0 B（±10），实测 **+1 B**（懒 chunk 哈希换名进入口），验收线 316,400 内。
3. before 相身份门比任务书更严：除 reviewFiles 计数 0，另断组件模块旧串 ≥1，排除 Vite 混合版本。

## UNVERIFIED

真 WebView2 宿主、真实中文 IME（52 篇夹具走假 FSA）、macOS；原生打印不涉。
