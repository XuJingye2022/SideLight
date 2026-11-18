# 第 65 轮执行报告（executor）

round=65 / 轮前 `ec20c99`（= startSha）/ 0.32.1 / dev `:5175` / CDP 9222。**B2、B1 完成，两门全绿**；未 commit、未改版本与 `release/`。按 `round-64/plan.md:37` 先 B2 后 B1（B1 改动会污染 B2 的 diff 口径）。

## B2（B-115 复核与余项定案）— 完成

1. 开工 HEAD = startSha；`git status --porcelain` 只有 `?? docs/iteration/round-65/`（finder-delta 未跟踪报告），无已跟踪改动。
2. 复跑 a1v2（`.tmp/e2e-r64-impl-b2-recheck.mjs` 为逐字节副本、只改输出路径）：big.enterTotal p50 **1,198**（A1 1,234，−2.9%；门槛 ≤1,500）、exitTotal p50 **304**（302，+0.7%；≤600）；longTask 最大 **1,141/217**；scrollDiff 全 0、shapeOk、每轮 `display='grid'`、srcHash 1557349733、parse 3→3、preview.pmCount 0、0 控制台错误；small 124/56。**无 >15% 退化**。
3. `git diff --stat` 为空；A1 提交 `ec20c99` 的 App.tsx/styles.css hunk 只含 `.source-hidden`、`sourceScrollTopRef`+双 rAF、三段视图分支，大纲三文件未出现。
4. 1 MB 源码态打 10 字（只记录）：value 1,000,012→1,000,022、10 键 2,166 ms、long task 9 条 80–270 ms、`sl-parse-done` 3→3；`Ctrl+F` 后 `Esc` 焦点回 `textarea.source-editor`；0 错误。逐键全篇 `countText` 属既有行为，不设门槛。
5. 定案：B-115 维持 fixed，数字入 BACKLOG。

## B1（B-138 大纲键盘与列表语义）— 完成

文件 `src/components/Outline.tsx`、`src/lib/outlineTree.ts`、`src/lib/outline.test.ts`、`src/styles.css`。

1. `div role="tree" aria-label="大纲"`；行 `role="treeitem"`+`aria-level`，有子级才 `aria-expanded`；折叠钮 `tabIndex=-1`+`aria-hidden`（保留 `aria-label`，鼠标仍可点）。
2. roving：`resolveRovingId()`（最后聚焦行→当前章节→首行），`onFocus` 记 `focusedId`；`.outline [tabindex="0"]` 恒 1；`visibleRows()` 移入 `outlineTree.ts`。
3. 键位 ↑/↓、Home/End、← 收起/跳父级、→ 展开/进子行，Enter/Space 走原生 click→`jumpTo`；单测 14→17。
4. E2E `.tmp/e2e-r64-impl-b1-outline-kb.mjs` **34/34、0 错误**：4 行/levels 1,2,3,2；Tab 进/出各 1 次、Shift+Tab 回原条；ArrowDown 新条 0/旧条 −1，Tab 出再回仍同条；ArrowLeft 后 `aria-expanded=false`、子行不渲染，ArrowRight 恢复；Home/End；**Enter 后焦点在 `.ProseMirror`、anchor=「第2节」标题文字 offset 0（id h-36 → pos+1=37）**。截图 `shots/round-65/b1-outline-kb-{focus,collapsed}.png`。
5. 回归：B-137 脚本 26/26 全过（`.tmp/r65-b1-a2-regress.log`）；被重写的 `shots/round-64/a2-outline-follow.png` 已 `git checkout --` 还原。

## 门禁

`npx tsc --noEmit` 0；`npm test` **40 文件 520 条 0 fail**（`.tmp/r65-exec-test.log`；517→520）；`npm run verify` **PASS** gzip **300,980 B**（余 9,020，+9 B；`.tmp/r65-exec-verify.log`）。`roundtrip` 未跑：未改编辑器/序列化。

## 交接

`round-64/impl.md` 已 4,095 B（超 4 KB 上限），B 轮结果记本文件。CHANGELOG 建议：`侧栏大纲支持键盘：↑/↓ 换条、←/→ 收起展开、Home/End 首尾、Enter 跳章节；tree/treeitem 语义与 roving tabindex，Tab 出再回停在同一行。`

## 踩坑（新，3 条）

1. 折叠隐藏的是子行，被折叠的父行仍在：单测首版写成整行消失，红。
2. 折叠钮的 `aria-label` 不能删：B-137 E2E 与鼠标路径按它找钮。
3. 大纲页签 Tab 一次即落首条 treeitem（文件树 `inert`），再 Tab 才离开 `.outline`。
