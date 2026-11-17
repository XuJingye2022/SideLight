# 第 48 轮 · 验收报告（tester）

- 轮次：`round=48`、`nn=48`；轮前 `startSha=5673b1dee5623cc72fe87b37d563c1d7444224ff`（开工实测 `git rev-parse HEAD` 同值）。
- 环境：dev server `http://localhost:5175`（未重启）；CDP **9222**（`.tmp/reset.mjs 9222` 每段前跑）；未启动 Edge、未 kill `msedge`、未 `browser.close()`、未 push、未改 `release/`。
- 独立复验：**未读 `impl.md`**。只读 `plan.md`、`git diff` 与本轮源码，自写 `.tmp/tester48-t1.mjs`、`.tmp/tester48-t2.mjs`、`.tmp/tester48-probe.mjs`、`.tmp/tester48-probe2.mjs`。
- **结论：PASS-WITH-UNVERIFIED**。T1/T2/T4 计划验收项全部从零复验通过；UNVERIFIED 见 §七。

## 一、门禁（真实输出）

| 门 | 命令 | 结果 |
| :--- | :--- | :--- |
| 类型检查 | `npx tsc --noEmit` | exit **0**，无输出 |
| 测试 | `npm test` | **32 个文件、414 条，0 fail**（32 行 `ℹ tests` 求和 = 414） |
| 往返 | `npm run roundtrip` | rich **5/7**、source **7/7**（`02-table`/`03-footnotes`/`05`/`07` ok；`04-reference-links` −4 +1 首次保存拦截 2；`06-task-list` −0 +1）；`docs/roundtrip-report.md` 无 diff |
| 构建 + 首屏 | `npm run verify` | **PASS**。末行 `total raw=950357 gzip=294123 headroom=25877 files=3 max=320000`；`target=310000 gap=15877`；`gzip 省下 656234 B（69.1%）`；主 chunk `index-Bx-dU1eB.js` **913,110 B raw / 286,198 B gzip**（`dist/assets` 最大 `index-*.js` 实测同名同值） |

首屏比第 47 轮 293,751 B **+372 B**（文档写的 +372 与实测一致）；内部预算余 15,877 B，硬线余 25,877 B。

## 二、T1 复验：表格内块级越界守卫（30 条断言，29 PASS + 1 条测试自身断言无效）

脚本 `.tmp/tester48-t1.mjs`（CDP 9222 + 假工作区 `.tmp/r30-fsa.mjs`；种子 `表.md` 3×3、`嵌套.md` 2×2、`空格.md`）。每条断言打印读数：

| # | 断言 | 读数 | 判定 |
| :--- | :--- | :--- | :--- |
| 1 | 单元格里 `Ctrl+Shift+L` 不删行、侧栏照常开关、盘上不变 | `rows 3→3→3`；`sidebarCollapsed false→true→false`；`dirty:false`；两次 `diskSame:true` | PASS |
| 2 | `Ctrl+L` 正对照：删行仍可用、撤销回 3 行 | `rows 3→2`；`Ctrl+Z` 后 `3`、`dirty:false` | PASS |
| 3 | 单元格 `Ctrl+2`：不造标题、提示含「表格」、存盘无 `## 一`、重开仍是 `甲/乙/一/二` | `headingInCell:0`、`cellHtml:"<p>一</p>"`、`toast:"表格单元格里不能用命令插入标题或块级内容：Markdown 表格只装行内内容"`、`dirty:false`、`diskSame:true`、`hasHashHeading:false`、`reopened cells:["甲","乙","一","二"]` | PASS |
| 4 | 鼠标入口·工具条 H1：同上，且存盘逐字节不变 | `headingInCell:0`、`cellHtml:"<p>一</p>"`、toast 含「表格」、`dirty:false`、`diskSame:true`、`hasHash:false`、重开 `cells` 同 1 条 | PASS |
| 5 | 鼠标入口·插入菜单「代码块」 | `preInCell:0`、toast 含「表格」、`dirty:false` | PASS |
| 6 | 公式块·菜单「公式块」 | `blockMathInCell:0`、`blockMathAll:0`、`mathPopups:0`、`cellHtml:"<p>一</p>"`、toast 同时含「块级公式」「表格」、`dirty:false`、`diskSame:true`、`hasDollar:false` | PASS |
| 6b | 公式块·`Ctrl+Shift+M`（等 7 s 让上一条 toast 过期再按） | 同一组读数，toast 仍含「块级公式」「表格」，盘上仍无 `$$` | PASS |
| 6c | 单元格里打 `$$` + 回车（impl 额外接的 `mathInput` 守卫） | `blockMathInCell:0`、`blockMathAll:0`、`rows:2`、toast 含「块级公式」「表格」、盘上该行 `"| $$  | 二   |"`（无 `<br>`） | PASS |
| 7 | 正对照：表格外 `Ctrl+2` 出 `h2:1`；单元格 `Ctrl+B` 出 `strong:1`；单元格 `Ctrl+M` 出 `inlineMathInCell:1` | 见读数 | PASS（`Ctrl+M` 的弹层断言无效，见下） |
| 7b | 正对照：表格外 `Ctrl+Shift+M` 仍开公式弹层 | `mathPopups:1`、toast 无「表格」 | PASS |
| 8 | 控制台/页面错误 | `z-errors {"errors":[]}` | PASS |

**唯一一条「FAIL」是我自己加的过严断言**：`a7-cell-inline-math-works` 还要求 `textarea.math-inline-input`（弹层）≥1，实测 0；但同一操作在**表格外**（`.tmp/tester48-probe.mjs` 的 `p2-outside-inline-popup`，100/300/700/1200 ms 采样）同样是 `popups:0`，且 `inlineMathAll:1`。这是既有行为，不是本轮回归；计划对 `Ctrl+M` 的验收口径就是 `inlineMathInCell:1`，故按 PASS 记，断言本身作废。

**静态对照（改前/改后）**：

- `git grep -n inTableAncestry -- src`：0 → **5**（`App.tsx:67` import、`:830` `handleKeyDown`、`:3602` `selectionInTable`；`mathInput.ts:4` import、`:79` 回车守卫）。计划预期 ≥3，含 impl 额外接入的 `mathInput`。
- `git grep -n guardBlockInTable -- src`：0 → **10**（定义 `:3606`；deps `:3853`；标题分支 `:3782`；工具条 H1 `:4829`、H2 `:4841`；插入菜单 5 条 `:4744/4752/4760/4768/4776`）。计划写 9 是没算 deps 行；实际 10 与「deps 必须加」的要求自洽。
- `git grep -n selectionInTable -- src`：0 → **5**（`:3597` 定义、`:3607` 守卫体、`:3611` 守卫 deps、`:4335` 公式块守卫、`:4357` 公式块 effect deps），与计划逐字一致；公式块守卫在 `nodeAt` 早返回（`:4328-4332`）**之后**。
- `Select-String` 的 `event.key.toLowerCase() === 'l'` 行：改后同在 `:838`，含 `!event.shiftKey && !event.altKey`。
- 提示文案：`表格单元格里不能用命令插入标题或块级内容` = **1**（改前 0）；`表格单元格里不能放块级公式` = **2**（App.tsx 的 `mathInput` 回调 + 公式块守卫；计划预期 1，多出的是同文案的第二处入口）；正向对照 `只有编辑视图支持` = **10**（与 plan 一致，证明中文匹配有牙）。
- 负对照（`read` 实测）：`:4781-4816` 的「图片 / 公式 / 链接」三个菜单项与 `:4846-4857` 的 B/I 按钮**都没有** `guardBlockInTable`；表格工具条无守卫；「公式块」菜单项本身不挂守卫（守卫在 `openMathAtCursorRef` effect 内，一处盖两个入口）。

## 三、T2 复验：源码改字保存后回编辑不再假脏（8 条断言全 PASS）

脚本 `.tmp/tester48-t2.mjs`（种子 `甲.md="# 甲\n\n甲的第一段。\n"`、`乙.md="# 乙\n\n乙的第一段。"`）：

| # | 断言 | 读数 | 判定 |
| :--- | :--- | :--- | :--- |
| 0 | 一个字都不改，进出源码：不假脏、不整篇重解析 | `mode edit`、`dirty:false`；`sl-parse-done marks0=3 → marks1=3` | PASS |
| 1 | `甲.md` 源码 `Ctrl+End` 打「加一句。」→ `Ctrl+S` | `mode:"source"`、`dirty:false`、盘上 `"# 甲\n\n甲的第一段。\n加一句。\n"` | PASS |
| 2 | `Ctrl+/` 回编辑（**判别性断言**，改前 `dirty:true`） | `mode:"edit"`、`dirty:false` | PASS |
| 3 | 再按 `Ctrl+S` 不写盘 | `changedOnSecondSave:false`、`dirty:false` | PASS |
| 4 | `乙.md`（原文不以换行结尾）同路径 | 回编辑 `dirty:false`；盘上 `"# 乙\n\n乙的第一段。加一句。"`、`endsWithNewline:false` | PASS |
| 5 | 正对照：编辑视图打字 → 脏；`Ctrl+Z` → 干净 | `before:false → afterType:true → afterUndo:false` | PASS |
| 6 | 控制台/页面错误 | `errors:[]` | PASS |

**静态对照**：`normalizeForBaseline` 0 → **4**（`baseline.ts` 定义 + `App.tsx:1909` 源码模式脏判断、`:2857` `prepareSave`、`:3962` `applySource`；另加 import 与单测，`git grep` 只数引用）。`normalizedSource !== baselineRef.current` **1 → 0**。反向钉：`normalizedSource === serializeBodyNow` **1 → 1**（`skipReparse` 未动）；`sourceText === sourceBaselineRef.current &&` **1 → 1**（`:3919`；不带 `&&` 的全文件 3 处 `:1903/:1908/:3919`，与 plan-review rev-2 一致）。`applySource` deps 已含 `originalText`（`:3963`）。

## 四、T4 复验：对外文档九处数字

全部取当次实测，改前/改后计数用 `Select-String -SimpleMatch`（计数按**行**）：

- `README.md`：`288,411`/`910,048`/`293,751`/`26,249`/`30 个文件`/`30 个测试文件` 均 **0**；`294,123` 与 `25,877` 各 1 行（`:114` 同一行两处 294,123：头条 + 当前值）；`32 个文件` 1、`414 条` 1；`:116` 主 chunk `第 48 轮 913,110 B raw（index-Bx-dU1eB.js）` 与 `dist/assets` 最大文件同名同值；百分比 `−19.4%` = `Math.round((364960−294123)/364960*1000)/10`；余量 25,877 = 320000−294123、15,877 = 310000−294123。
- `AGENTS.md`：`第 47 轮记 30 个文件`/`测试 30 个文件 400 条`/`293,751`/`26,249` 均 **0**；`第 48 轮记 32 个文件` 1、`测试 32 个文件 414 条` 1、`294,123` 1、`25,877` 1。
- `docs/iteration/STATE.md`：`29 个文件 380 条` **0**；`30 文件 400 条` **2**（只剩 `:64`/`:126` 的第 47 轮历史）；`293,751` 4→**3**（`:64`/`:65`/`:126` 历史保留）、`26,249` 3→**2**、`288,411` **3**（历史不动）；`第 30–47 轮` **0 → 第 30–48 轮 1**；`第 47 轮 \`npm run verify\`` **0 → 第 48 轮 1**；`:55` 的 `total raw=950357 gzip=294123 headroom=25877 files=3 max=320000` 与 verify 末行逐字一致。
- 三处 `<N>`（README/AGENTS/STATE）**逐字一致 = 414**，文件数 32 = `package.json` 的 `.test.ts` 计数（实测 32）。
- `package.json` 版本仍 **0.32.1**（`npm test` 的 32 行来自新增两个测试文件；无版本 bump）；`release/` 未改；`.tmp/iteration/common.md:36` 已是 45,000,000 / 50,000,000（本地文件，不进提交）。
- `docs/CHANGELOG.md` 的 `## Unreleased` 内第 48 轮条目四条（T1/T2/门禁/文档）与实测一致；UNVERIFIED 段与本报告 §七一致。

## 五、回归与补充探针

- `$$` + 回车的**正对照**（`.tmp/tester48-probe.mjs` 的 `p4-dollar-enter-outside`）：表格外仍 `blockMathAll:1` + `popups:1` —— `mathInput.ts` 新守卫没有误伤正文。
- `Ctrl+Shift+M` 表格外仍开弹层（`p2`/T1-7b）：`mathPopups:1`，无「表格」提示。
- 编辑视图打字置脏 / 撤销回基线变干净（T2-5）：第 45 轮语义不回归。
- 本轮未跑 `keyboard-acceptance` 等大套件：T1 的键盘改动只在表格分支（`handleKeyDown` 的 `Ctrl+L`）与 window 标题分支，二者都由 T1-1/T1-2/T1-7 的正反例直接覆盖；`Ctrl+Shift+L` 非表格行为由 T1-1 两按覆盖。`npm test` 32 文件 414 条已含序列化与保存链单测。

## 六、计划偏差（非缺陷）

1. `guardBlockInTable` 静态计数 10 而非计划写的 9：多出的是 `useCallback` 的 deps 行；计划第 3 步明确要求把它加进 window effect deps，故 10 为自洽值。
2. `inTableAncestry` 5 处而非 ≥3：`mathInput.ts` 额外接了一处表格守卫（单元格里打 `$$` + 回车），`CHANGELOG` 已写、E2E 已复验（T1-6c），不误伤正文（§五）。
3. `表格单元格里不能放块级公式` 在 `App.tsx` 出现 2 处（`mathInput` 回调 + 公式块 effect）：同一句文案两个入口，T1-6/T1-6b/6c 分别钉住。
4. T1 正对照的「`Ctrl+M` 弹层」断言是我加错的（见 §二），按计划口径改判 PASS，产品无问题。
5. T3（ui F4 占位符）按计划 §〇 砍单：探针 `p1-placeholder` 实测仍是 `"Segoe UI", …` / `16px` / `line-height:normal`，而 `.doc-body` 是 Source Han Serif / `17px` / `33.15px` —— 与计划 §五 UNVERIFIED 描述一致，未修。

## 七、UNVERIFIED（写清哪条、为什么、下轮怎么补）

1. **表格单元格里手打 `# ` / `> ` / `- ` 仍造块级节点**（本轮设计不修，plan §二 首行）。实测（`.tmp/tester48-probe2.mjs`，空单元格）：`<h1>x</h1>` / `<blockquote><p>x</p></blockquote>` / `<ul><li><p>x</p></li></ul>` 各 1，`Ctrl+S` 盘上 `| # x | > x | - x |`（结构丢失、重开变字面）。下轮第一项：`filterTransaction` 或 `handleTextInput` 二选一，E2E 钉「手打 `# ` → `h:0` 且盘上逐字节不变」。
2. **粘贴带标题/代码块的 Markdown 进单元格**未实测（与手打同一根因）。下轮与第 1 条一起量。
3. **T3（ui F4）占位符样式**本轮按预算砍单，未修（读数见 §六 第 5 条）。下轮第二项，纯 CSS 3 行 + 计算样式 E2E。
4. **宿主 WebView2 / 真实 IME / 125%、150% 缩放 / AltGr**：本会话为非交互沙箱，宿主窗口起不来，浏览器只有 CDP。下轮按既有办法记 UNVERIFIED 或交真人。
5. **1 MB 文档下「全部替换」冻结**（code F1）本轮按计划不修、未测量；计划 §二 已排「测量先行」，不属本轮验收面。

## 八、证据文件

- 脚本：`.tmp/tester48-t1.mjs`、`.tmp/tester48-t2.mjs`、`.tmp/tester48-probe.mjs`、`.tmp/tester48-probe2.mjs`（`.tmp/` 不进版本控制）。
- 截图：`shots/round-48/test-t1-table-keys.png`、`shots/round-48/test-t2-source-dirty.png`（未覆盖 impl 的 `impl-*.png` 与 finder 的 `bug-*`/`r48-*`）。
- 复跑：先 `node .tmp/reset.mjs 9222`，再 `node .tmp/tester48-t1.mjs` / `node .tmp/tester48-t2.mjs`。
