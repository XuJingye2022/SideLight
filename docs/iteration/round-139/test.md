# 第 139 轮 tester 独立验收 · B-229 真实首载 ≤320,000

轮前 `0a99076`。只读 `plan.md`、`git diff`、`BACKLOG.md`；结论全部本轮实测，不采用 `impl.md` 数字；r100/r101/r96 是前几轮既有脚本，只作回归复跑。

## 结论：PASS

## 门禁

| 项 | 命令 | 实测 |
| :--- | :--- | :--- |
| verify（默认口径） | `npm run verify` | **exit 0**；`total=315616 resident=4190 real=319806 headroom=194`；`WARN 真实首载超过内部预算 310000`（只 WARN）、`PASS` |
| 全量测试 | `npm test` | **71 文件 975 条 0 fail**（基线 70/968；链尾加 `firstScreenBudget.test.ts` 4 条） |
| 构建复现 | `npm run build` ×2 | 同名同字节：`index-CeZdXAGs.js`、`MarginRail-fR6tpMt8.js` raw 11,604；两次 `real` 均 319,806 |

## B-229 验收

1. **真实首载 ≤320,000**：门 **315,616** + 常驻 `MarginRail-fR6tpMt8.js` gzip9 **4,190** = **319,806**（余 194）。gzip9 用独立 `zlib.gzipSync(level:9)` 复算 = 4,190；`dist/index.html` 只有 entry / runtime / css 三条，三个面板 chunk 不在 modulepreload。
2. **`verify` 默认口径 = real 且硬线 320,000**：`--max 319805` **exit 1**（real 319,806 越 1 B）而 `--no-resident --max 319805` **exit 0**（门 315,616 不越）⇒ 默认判 real、`--no-resident` 复旧口径（无 `real` 行、`gap` 按首屏、`target` 判 total）；`--max 300000` exit 1；`--max 400000 --real-max 400000` exit 0；默认 `--target 310000` 只 WARN。
3. **按需拆（不砍功能，只挪加载时机）**：dev server 首载 900 ms 内三面板请求 **0**；点「对比」→ `RailDiffPanel.tsx`、「在审」→ `RailReviewPanel.tsx`、首切「对话」→ `RailChat.tsx` 各 **1**；dist 三 chunk gzip9 **1,344 / 2,089 / 2,482**；常驻 7,838 → **4,190**；`total` 315,611 → 315,616（**+5 B**）。
4. **行为回归**（ego CDP 57270、1440×900，先 `reset.mjs 57270`）：自写 `.tmp/r139-tester-lazy.mjs` **13/13、0 pageerror / 0 console error**（首载不拉 chunk；首开面板后 `.margin-rail` 同节点、焦点进 sheet、Esc 关闭并回「对比」/「在审」入口；对话 2 turn、切页签往返不丢；两页签两入口都在）。既有脚本：r100 **43/43**、r101 **57/57**、r96 **33/33**（跑后 `git checkout -- shots/round-{96,100,101}`，工作树无截图残留）。
5. **静态门（独立复算）**：`MarginRail.tsx` 的 `lazy(() => import('./X.tsx'))` **3**、三面板静态说明符 **0**、`lib/chat.ts` **0**；`RailChat.tsx` 的 chat.ts 1、`RailDiffPanel.tsx` 的 diffView 1、`RailReviewPanel.tsx` 的 reviewFiles 1。四门改读新文件、断言未放宽（`railDiffA11y` 另加 2 条硬门）。
6. **新门负向**：删 `if (budgetGzip > budgetMax)` 的 exit 分支 → `firstScreenBudget.test.ts` **2 红 exit 1**；备份 SHA256 `6DBF94EE…` 拷回后 4/4、SHA256 等值、`git diff` 无残留。

## 偏差 / 风险（不判 FAIL）

- real 余量仅 **194 B**：在验收线内，但下一次静态增量会让默认门变红——按新口径属预期行为，不是缺陷。
- `--max 316200` 一类旧调用现在会红（头注释已写明）；`ci.yml:39`、`release.yml:82/155` 仍裸调用，语义随默认翻成 real ≤320,000。不 push，**CI 未验**。

## UNVERIFIED

真 WebView2 宿主、真实中文 IME、生产环境 gzip 传输（以脚本口径为准）、CI 三处调用实跑。

## 证据路径

- 门禁：`.tmp/r139-tester-verify.log`、`.tmp/r139-tester-test.log`
- 按需拆：`.tmp/r139-tester-lazy.log` / `.json`、`.tmp/r139-tester-serve-grep.mjs`
- 回归：`.tmp/r139-tester-r100.log`、`.tmp/r139-tester-r101.log`、`.tmp/r139-tester-r96.log`
- 负向：`.tmp/r139-measure-backup.mjs`（SHA256 `6DBF94EE9C91F11CB372A2F50A7C62F050FF6DD997C87265CC25955492B21E14`）
- 截图（执行方、本 tester 未新增以守 ≤2 张）：`shots/round-139/{rail-chat-lazy,rail-diff-lazy}.png`
