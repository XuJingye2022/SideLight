# 第 68 轮 test（tester 复验）

**结论：PASS**。A1/A2/A3 验收全过；轮前 FAIL 的 A3 回归（快速打开选文件后焦点落树行）已修复并复验。门禁通过，本报告后 commit 推进 HEAD（轮前 `ffaae68`）。

## 门禁
- `npm run verify` exit 0：首屏 gzip **301,694 B**（内部 310,000，余 18,306；轮前 300,980，+714）。`.tmp/r68-tester2-verify.log`
- `npm test` exit 0：**40 文件 520 条，pass 520 / fail 0**。`.tmp/r68-tester2-test.log`
- `roundtrip` 未跑：diff 不含编辑器内核与 markdown 序列化。

## A1（B-148）PASS — `.tmp/e2e-r68-tester-a1.mjs` → `.tmp/r68-tester2-a1.json`（10/10 true，0 错误）
1 MB（1,000,012 字符）源码打 `Q` 后 350 ms 点退出：`big.md` 写 **1 次**（1,000,013，尾 `Q`），写盘 op 仅 1 条，drafts(len>0) **0**；退出后再等 3 s **0 写**。再打 `R` 等 3.4 s（自动保存先写 1 次 1,000,014）再退出：退出后 0 写、0 草稿。`autoSave:false`：草稿 **1**（`.sidelight/drafts/big.md` 1,000,013）、`big.md` 不变 1,000,012。代码：`src/App.tsx:3672-3675` 在 `:3676 await performCommit` 前清 `draftTimerRef` 并推 `draftGenerationRef`，失败仍走 `writeDraftFallback`。

## A2（B-145）PASS — `.tmp/e2e-r68-tester-a2.mjs` → `.tmp/r68-tester2-a2.json`（13/13，0 错误）
100 KB（seed 100,010）源码 `imeSetComposition('zhong')` 停 2.6 s：`small.md` 不变 100,010、无写盘 op、`sidelight.doc.v1` 无 `zhong`、drafts 0。提交「中」后 **2,034 ms** 写 100,011：len 100,011、`count('中')` 2,323→2,324、无 `zhong`、`indexOf('中')`=0。H1：组合未提交时 Esc 退源码 → **1,593 ms** 出现写（100,016，含拼音，内容归 B2）；再打 1 字 3.4 s 内再写 1（100,017）。1 MB `autoSave:false`：组合期 drafts 0、`big.md` 不变 1,000,012；提交后草稿 1,000,013 含「中」、无 `zhong`。代码：`src/App.tsx:697`（`sourceComposingRef`）、`:742`（草稿门）、`:5784`（有界 60 s）、`:3740-3742`（退出源码清零）。

## A3（B-146/B-147）PASS — `.tmp/e2e-r68-tester-a3.mjs` → `.tmp/r68-tester2-a3.json`（18/18，0 错误）
树行 opener 打开后 `activeElement=.quick-open-input`、`aria-modal=true`/`role=dialog`/`[inert]` 6；Tab **60 次 0 逃出**且不关；列表钮 Esc 关、`[inert]` 0、焦点回 `.ProseMirror`、**不还原树行**；源码视图 Esc 回 `textarea.source-editor`；预览 Esc 不抢焦点。焦点环：聚焦 `rgb(43,109,100)` + `0 0 0 2px`，失焦 `rgb(228,223,212)`/`none`。截图 `shots/round-68/quickopen-trap.png`、`quickopen-trap-tester.png`。代码：`useDialogFocus.ts:20-24`/`:71`、`QuickOpen.tsx:21`/`:57-59`、`App.tsx:378`/`:395`/`:2586`/`:4082-4086`/`:4110`、`FileTree.tsx:120`、`styles.css:2718`。

**上轮 FAIL 项复验**：`.tmp/e2e-r68-tester-a3-select.mjs` → `.tmp/r68-tester2-a3-select.json`：树行先获焦后 Ctrl+P 点列表项，300/900/1800 ms 均 `DIV.ProseMirror`（上轮同脚本为 `DIV.tree-file.is-active`）；无树焦点 `.tmp/e2e-r68-tester-a3-select2.json` 亦正文；补测选中源码态文档 `.tmp/e2e-r68-tester2-a3-src.mjs` → `.tmp/r68-tester2-a3-src.json`：焦点进 `textarea.source-editor`、`[inert]` 0（8/8）。

## 回归
- `.tmp/e2e-r62-b2.mjs`（B-120 停笔草稿）：100 KB 停笔 3.6 s 文档 1 写 36,029 B / 草稿 0；`autoSave:false` 文档 0 / 草稿 1 写 36,008 B；0 错误。
- `.tmp/e2e-r66-impl-b1.mjs`（B-144 遮罩）：1 MB 未改动进 p50 1,219 / 退 294 ms、parse 3→3、无遮罩；改 10 字退出 **4,470 ms**（≤5,330）、遮罩 101 ms 于第二帧、4,119 ms 长任务晚于遮罩、焦点回 `.ProseMirror`；0 错误。
- `.tmp/e2e-r49-tree.mjs` 属 common.md 已登记的过期 `tree` 脚本，只作冒烟（0 错误），不作判定依据。

## UNVERIFIED
- 真实中文 IME（CDP `imeSetComposition` 造组合）、WebView2 宿主内的快速打开/组合输入、真实 FSA 与真实 1 MB 磁盘文件（合成工作区）、真实屏幕阅读器。
- `keyboard-acceptance`/`session`/`theme` 未跑：本轮 A3 焦点路径已由 4 个自写脚本 + 1 个既有脚本覆盖。
