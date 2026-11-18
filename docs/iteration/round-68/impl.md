# 第 68 轮 impl（executor）+ 返修（executor-fix）

HEAD=`ffaae68`；端口 9222（E2E 前 `node .tmp/reset.mjs 9222`）；dev 5175 未重启。

## 返修｜A3 选文件焦点回归（唯一失败项）— 完成
- **根因**：`onSelect` 去掉立即聚焦后，`FileTree.tsx` 的 `activePath` effect 在排 rAF **前**判「焦点已在 `.ProseMirror`」，此时未命中 → 把焦点给树行；判据本身还会被同帧其它聚焦排程翻盘。
- **改动 3 处**：
  1. `App.tsx:6149`：`setQuickOpen(false)` 后立即 `focusCurrentView()`（恢复第 34 轮既有行为，CHANGELOG:56）。
  2. `App.tsx:378-410`：`focusCurrentView` 正文选择器改 `.ProseMirror:not(.preview-pane)`（预览无聚焦落点）；新增 `focusCurrentViewWhenReady`（按帧盯 ≤20 帧：焦点掉回 body 或仍在写作面就接回当前视图，去了别的控件立即放手），`.then` 改用它。
  3. `FileTree.tsx:117-122`：把「别抢」判据挪进 rAF 内（`activeElement.closest('.ProseMirror, textarea.source-editor')`），抢之前再判一次。
- **证据**：失败项复现 `.tmp/e2e-r68-tester-a3-select.mjs` 绿 ×3（300/900/1800 均 `.ProseMirror`，`.tmp/r68-fix-select-stab{1,2,3}.json`）；无树焦点变体绿（`.tmp/r68-fix-select2-v3.json`）；tester 全量 A3 → `allPass:true`、0 错误（`.tmp/r68-fix-a3-v3.json`）。
- **三态入口** `.tmp/e2e-r68-fix-scenarios.mjs`（`.tmp/r68-fix-scen-v3.json`）：预览态点选→`.ProseMirror`、源码态点选编辑态文档→`.ProseMirror`、编辑态点选源码态文档→`textarea.source-editor`；HEAD 对照 `.tmp/r68-fix-scen-head.json` 为「树行 / BODY / BODY」。
- **只加立即聚焦不够**（tester 建议的 1 行）：tester 的 A3 脚本 `select` 项在 900 ms 仍判树行（`.tmp/r68-fix-a3-run2.json`，帧序竞态），连判据一起挪才稳定。
- 未动 Esc 关闭路径、Tab 困锁、焦点环；A3 其余 17 条仍全绿。

## A1｜B-148 源码改字后 2 s 内退出双写 — 完成
`App.tsx:3666-3674`：`await performCommit` 前清 `draftTimerRef` 并 `draftGenerationRef += 1`；失败仍 `writeDraftFallback`。`.tmp/e2e-r68-impl-a1.mjs` → `.tmp/r68-impl-a1.json`（allPass）：1 MB 源码打 1 字后 2 s 内退出 → `big.md` 写 1 次、drafts 0；等 3.4 s 再退仍 1 次；`autoSave:false` 草稿 1、盘不变。

## A2｜B-145 源码态组合不写盘 — 完成
`App.tsx:676-677/718-722/767/3717-3723/5756-5777`：`sourceComposingRef`、源码态草稿门、退出源码清 ref、textarea 接 compositionstart/end/blur。`.tmp/r68-impl-a2.json`（allPass）：100 KB 组合 `zhong` 停 2.6 s 盘不变、drafts 0；提交后 2,026 ms 写 100,011（含「中」、无 zhong）。UNVERIFIED：真 IME / WebView2。

## A3｜B-146 + B-147 — 完成（见上「返修」）
`useDialogFocus.ts:22-25/37/71`；`QuickOpen.tsx:21/51-60`；`App.tsx:2583-2590` `closeQuickOpen`、`:4138` `dialogOpen` 加 quickOpen、`:4189` Esc 分支；`styles.css:2717-2722` 焦点环。截图 `shots/round-68/quickopen-trap.png`。

## BACKLOG / CHANGELOG
B-148 新增（fixed）；B-145/B-146/B-147 → `fixed` 并补证据。CHANGELOG 建议：源码态改字 2 秒内退出只写一次盘；组合期不写盘；快速打开加焦点困锁、Esc 随时可关、关闭/选中后焦点回正文（含预览/源码态），输入框补焦点环。

## 门禁（返修后）
`tsc --noEmit` exit 0；`npm test` exit 0、40 文件 **520 条** fail 0（`.tmp/r68-fix-test.log`）；`npm run verify` PASS、首屏 gzip **301,694 B**（内部 310,000，余 18,306；返修前 301,574，+120，`.tmp/r68-fix-verify.log`）。roundtrip 未跑：未动内核与序列化。

## 新踩坑
1. 切视图后立刻断言旧态会假绿：等 `waitForSelector('textarea.source-editor', { state: 'visible' })`。
2. 结果 JSON 别带 `localStorage` 整串；判「≤3.4 s 写」用 `__fsLog` 的 `op.t - performance.now()`。
3. 焦点用例按「点选前处在哪个视图」分场景；`await` 后单帧 rAF 会抢在 commit 前聚焦旧 DOM。
