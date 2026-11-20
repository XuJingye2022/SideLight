# 第 139 轮计划审查（critic · revision 2 复核）

结论：**PASS（PASS-WITH-NOTES）**。旧 CR-1…CR-5 逐条已改；余 2 条 P1 属验收与口径细节，改字即可。

基线我独立复跑：`node scripts/measure-first-screen.mjs` → `total=315611 resident=7838 real=323449`（headroom −3449）；`MarginRail-DANUDNjd.js` raw 22,306 / gzip9 7,838；`git status` 只多 `docs/iteration/round-139/`。与 §0 逐项相同。

## 旧漏洞复核

- **CR-1 ✓**：A1 第 1 条只允许 `lazy(() => import(…))`、第 2 条按开合挂载；验收①②③ 覆盖「新 chunk 出现 / `git diff scripts/measure-first-screen.mjs` 为空 / `resident=` 不降即回滚」。实测 `MarginRail.tsx:301` 的 `diffOpen`、`:365` 的 `reviewActive` 都自带 `!appDialogOpen`，谓词不必新造，静态门 `railModalGate.test.ts:72` 仍会盯。
- **CR-2 ✓**：A1 第 2 条就地 `<Suspense fallback={null}>`、不依赖 `App.tsx:6172`；探针补「首点后 `.margin-rail` 恒在」（焦点部分见 N-1）。
- **CR-3 ✓**：§0 换实测（`autoVerify` 453、四库 2,383），A2 先量再判、无 319,600 承诺。我按 `.tmp/measure-modules5.mjs` 复算：`railFull−railNoLib` 的增量口径成立（`autoVerify.ts` 源 2,641 / gzip9 1,641，453 是产物口径，合理）。
- **CR-4 ✓**：兜底①删除，只留兜底②；四门同步清单（`railDiffA11y`/`railModalGate`/`reviewLabelWording`/`revisionRefresh`）+ A2 三门（`chat`/`railChatReset`/`railDrawerGate`）与实查一致（读 `MarginRail.tsx` 的测试恰这 7 个加 `autoVerify`/`annotations` 两门读卡片段、不搬）。
- **CR-5 ✓**：≤4 次构建；`e2e-r100-diff.mjs`/`e2e-r101-review.mjs`/`e2e-r96-a1-chat.mjs` 实测都在 `.tmp/`。

## N-1（P1）A2 探针的焦点断言不可复现，必假红

`plan.md:32`「末态 `.rail-chat-input` 有焦点」。现状没有「切到对话页签即聚焦输入框」的路径：`src/App.tsx:1033` 打开抽屉只 focus `.rail-close`；`MarginRail.tsx:241` 只在 `send()` 内、`:279` 只在收流 finally。照抄会红，还会引执行方给 textarea 加 autoFocus。

修法（4 步）① 点 `#rail-tab-chat` → `#rail-panel-chat` 无 `hidden`、`.rail-chat-input` 在 DOM；② 脚本自己 `.focus()` 并打一句；③ 首次点「对比」→ 等 600 ms：`#rail-panel-chat` 里那句仍在（turns 未丢）、`.margin-rail` 在、`activeElement` 在 `.rail-diff-sheet` 内；④ Esc → `.rail-diff-rows` 消失、焦点回 `.rail-diff-open`。③④ 才是 CR-2 要守的状态与焦点。

## N-2（P1）A3 翻口径的连带面没写

`ci.yml:39`、`release.yml:82/155` 都是裸 `node scripts/measure-first-screen.mjs`（实查无 flag）。默认口径一翻，CI 与发布门同步变成 real ≤320,000，不改 workflow 就生效；本轮不 push，CI 结论只能记 UNVERIFIED。翻完 real 余量只剩约 2–3 KB，下一轮任何 `src/` 增量先红。

修法：A3 验收加 3 条 ① 报告写明「CI/release 三处调用语义随默认口径变化、无文件改动」；② 记「CI 未验（不 push）」；③ `docs/adr/0012` 与 README 写「真实首载 320,000 是硬线，加静态代码前先跑 verify 量 real」。

## P2（不阻塞，执行时顺手）

1. 兜底② 触发带 `320,001–320,300` 与实测 453 不一致：320,301–320,453 会白停。上界改 `320,000+453=320,453`，或先量后判。
2. A3「headroom 改判 real」要动 `measure-first-screen.mjs:111-114` 的 <5% WARN 块——它在常驻计算（`:143`）之前，不搬就仍按 total 报余量。
3. `lazy()` 必须写在 `MarginRail.tsx` 模块顶层；写进组件体内每次渲染换身份，面板反复卸载重挂。
4. A1 验收⑥ 的 `total` 净增 ≤+300 实际不会动（拆出面板只在常驻 chunk）；`__vitePreload` 已被 `App.tsx` 其余 lazy 引进入口，预期 0 变化。真正要盯的是 `resident=`。
5. 预算：A1 8 / A2 9 / A3 6 分钟，加 4 次构建与三套 E2E 偏紧；超时就按 CR-3 收在 A2、B-229 留 `open`，不翻口径。
