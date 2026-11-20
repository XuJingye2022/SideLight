# 第 139 轮计划审查（critic）

结论：**REVISE**。§0 基线我复跑全部对上（`total=315611 resident=7838 real=323449 headroom=-3449`，`MarginRail-DANUDNjd.js` raw 22,306），方向对（按开合拆三块面板）；下面 5 条必须改，P2 不阻塞。

## CR-1（P0）A1 没写「动态 import + 按开合挂载」
「搬文件」不等于不进常驻：`MarginRail.tsx` 只要还静态 import 两个新面板，rollup 仍把它们留在 `MarginRail-*.js`，real 一字节不降，而两面板 E2E 照样全绿。加两条硬门：① 只允许 `lazy(() => import('./RailDiffPanel.tsx'))`／`lazy(() => import('./RailReviewPanel.tsx'))`，挂载条件 `diffOpen && !appDialogOpen`／`reviewActive && !appDialogOpen`；② A1/A2 阶段 `git diff scripts/measure-first-screen.mjs` 必须为空（不许改 `RESIDENT` 名单凑数），构建后 `dist/assets` 须出现两个新 chunk 且 `resident=` 实测下降，不降就回滚。

## CR-2（P0）缺 Suspense 边界
`App.tsx:6172` 的 `<Suspense fallback={null}>` 包着整个 `MarginRail`。子面板 `lazy()` 首次挂载会让 React 把这棵子树换成 null：右栏消失一帧、`turns`/`diffOpen` state 与焦点全丢，正撞 B-230/B-264 的回焦断言（焦点回 `body`）。每个 `lazy()` 外就地包 `<Suspense fallback={null}>`，并加 E2E：首点「对话／对比／在审」后 `.margin-rail` 仍在、`.rail-chat-input` 有焦点。

## CR-3（P1）估算主项没量
§0 的 3,385 是「含依赖上界」，而 `diff.ts` 经 `risk.ts:1`（App 保存前对比）、`workspace.ts`/`annotations.ts` 都已在门里，真能走的是三库自身代码；反向「面板 JSX」才是主项：按源切片 gzip9 量 `MarginRail.tsx` 整 14,215、五段（`:169-296/:353-491/:860-949/:951-1009/:1011-1100`）7,563＝53.2%，但跨区冗余会让降幅低于此比例。两边 ±1 KB 漂，319,600 不能当承诺。改法：A1 先量 `resident` 写进计划；判据改「A2 量完 real ≤320,000 才做 A3；>320,300 停、B-229 留 open、不翻口径」。

## CR-4（P1）兜底①会打红三门且没量
拆样式要动 `railDiffA11y.test.ts:28,66`（读 `styles.css` 的 `.rail-diff-rows {`）、`touchTargets.test.ts:19-24,110-119`（`.rail-diff-open`/`.rail-review-open`/`.rail-chat-reset`）、`themes.test.ts`（对话输入框对比度），省多少也没量。删兜底①，只留②（`autoVerify` 改 `await import()`，现由 `App.tsx:51-56` 静态 import，属门内字节也计入 real），并先量其 gzip 贡献。

## CR-5（P1）构建次数超预算
A1 build+measure → A2 两次 build → A3 `verify`（含 build）＝4–5 次全量构建 + 两套 E2E，25 分钟多半半截。每阶段 build 一次（验确定性就记 `dist/assets` 文件名+字节对比），E2E 复用 `.tmp/e2e-r101-review.mjs`(57/57)、`.tmp/e2e-r100-diff.mjs`(43/43)、`.tmp/e2e-r96*`，不新写。

## P2（不阻塞）
`--no-resident` 时 `--target`/`headroom` 回旧口径未写明；`:98` 的 `headroom` 与 real 行重名不同义；`realMax = --real-max ?? max` 让惯用的 `--max 316200` 变成真实首载门（会突然红，头注释要写）；ADR-0012 记着首屏口径，翻口径后按 AGENTS §7 补一笔。
