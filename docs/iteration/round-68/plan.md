# 第 68 轮 plan（A/B 两轮）· revision 2

startSha `ffaae68`=HEAD；CDP 9222，E2E 前 `node .tmp/reset.mjs 9222`；dev 5175 不重启；不启 Edge、不 push、不改 `release/`；版本 0.32.1。新 P1 **2**（B-146/B-148）＋既存 open 1（B-145），B-147 随 A3；按 H1–H6 修订。

## A 轮（3 任务，25 min）

### A1｜B-148 源码改字后 2 s 内退出写两次盘（`src/App.tsx`）
1. BACKLOG P1 补 B-148（findings-code F1）。
2. `runAutoSave` 磁盘分支 `:3621` 守卫后、`performCommit`（`:3622`）前清草稿计时器并 `draftGenerationRef.current += 1`（同 `:3024-3029`）；失败仍走 `writeDraftFallback:3630`；宿主分支 `:3599-3619` 不动。
3. 验收 `.tmp/e2e-r68-impl-a1.mjs`（改自 r68-finder-code2）：1 MB 源码打 1 字→2 s 内退出：`big.md` 写 1 次、drafts 0；等 3.4 s 再退仍 1；`autoSave:false` drafts 1、`big.md` 不变。drafts 按 `len>0` 计（H6，`len:0` 不计）；改前 1,000,034+1,000,035。
4. 门禁 `verify`、`test`。风险：提前推代际作废在飞草稿。

### A2｜B-145 源码态组合输入不写盘（`src/App.tsx`）
1. `:661` 旁加 `sourceComposingRef`。textarea（`:5699-5704`）：`compositionstart`→ref=true、`composeUntilRef=now+60_000`（不用 `Infinity`，H1）；`compositionend`→ref=false、`+400`、`scheduleAutoSaveRef.current()`、`scheduleDraftRef.current(e.currentTarget.value)`（否则提交后无草稿）；`blur`→两者清零（H1）。
2. effect（`:3681` 后）：`sourceMode` 变 false 时两 ref 清零（卸载不保证 blur，H1）。
3. `scheduleDraft:702` 开头门只限源码（`sourceMode && sourceComposingRef.current` return；`:748` 依赖加 `sourceMode`，否则闭包恒 false）；编辑器组合路径不动（否则 end 后丢草稿）。
4. 验收 `.tmp/e2e-r68-impl-a2.mjs`（改自 r67-delta-ime，seed `small.md`+`big.md`）：100 KB 组合 `zhong` 停 2.6 s→`small.md` 不变、`sidelight.doc.v1` 无 `zhong`、drafts 0；提交「中」后 ≤3.4 s 写 **100_011 B**：`len===100_011 && count('中')===seed中数+1 && !includes('zhong')`（位置无关，H2；记 `indexOf('中')`，不按尾字）。1 MB `autoSave:false`：组合期 drafts 0、提交后含「中」。
5. H1 追加：组合未提交时 Esc 退源码→3.4 s 内须有 `small.md` 写（`Infinity` 永不写）；再打 1 字，3.4 s 内再写 1。只断有写，内容归 B2。
6. 门禁同 A1。风险：CDP 非真 IME（WebView2 UNVERIFIED）。

### A3｜B-146 快速打开焦点困锁与 Esc（+B-147）
1. `useDialogFocus:17` 加三参 `overlaySelector='.overlay'`、四参 `restoreFocus=true`；`:29` 用 `closest(overlaySelector)`；`:58-70` 仅四参 true 时还原焦点（H3）。
2. `QuickOpen`：删 `:17-19` 自聚焦（交 hook `focusables()[0]`）；加 `dialogRef`+`useDialogFocus(true, dialogRef, '.quick-open-backdrop', false)`；`.quick-open` 加 `ref`、`aria-modal="true"`、`tabIndex={-1}`；删输入框 Esc `:74-77`（Esc 走 App）。
3. `App`：`dialogOpen:4020-4021` 加 `quickOpen`；globalSearch Esc 分支后（`:4034-4040`）加 `quickOpen` 分支：非组合中则 `preventDefault()`+`closeQuickOpen()`+return；`closeQuickOpen`=关后按 `viewMode`：source→`focusSourceEditor()`、edit→`focusEditor()`、preview 不聚焦（同 `closeGlobalSearch`，H3-b）；依赖表 `:4281-4306` 补两者；`:6052-6055` `onClose` 改用它。
4. B-147：`styles.css:2715` 后加 `.quick-open-input:focus`（照 `:2779-2783` 的边框色+2px 光晕）；`BACKLOG.md:74` 补状态列（`fixed`/砍则 `deferred`），末列 68。
5. 验收 `.tmp/e2e-r68-impl-a3.mjs`（改自 ui-finder3，opener=树按钮）：打开后 activeElement 是 `.quick-open-input` 且在 `.quick-open` 内；Tab 60 次全在框内（改前逃到 BODY/.skip-link）；Esc 关闭、`[inert]` 0、焦点回 `.ProseMirror`（**不断言还原树按钮**）；源码视图 Esc 后回 `textarea.source-editor`；打开前 activeElement 不在 `.quick-open` 内；`borderColor`≠失焦值且 `boxShadow≠'none'`；0 错误；截图 `shots/round-68/quickopen-trap.png`。
6. 门禁 `verify`、`test`。风险：hook 先摘 inert 再还原；App 两个 focus 辅助已是 rAF。

## B 轮（先 10 min delta，再执行）

### B1｜delta 回归（`.tmp/r68-delta.json`）
以下均在 `.tmp/`：`e2e-r67-delta.mjs`（B-115 进≤1,500/退≤600、100 KB≤200/≤400、`scrollDiff` 0、parse 3→3）、A1/A2/A3 脚本、`e2e-r62-b2.mjs`（编辑停笔 1 写/0 草稿）、`e2e-r68-finder-code.mjs` 的 `exitSourceEdited`（≤5,330）。红先修 A 轮，B2 顺延；>10% 单列。

### B2｜B-149 组合输入第二、三出口：Ctrl+S 与退出源码（先测后修）
1. 测 `.tmp/e2e-r68-impl-b2.mjs`（改自 r67-delta-ime）：源码 `imeSetComposition('zhong')` 时 a) Ctrl+S；b) Esc /「回到富文本」；各记 `textarea.value`（Esc/blur 前后）、正文首段、**整篇**盘内容。
2. 修：a) 写拼音→`requestSave:3279` 顶部：`sourceMode && sourceComposingRef.current` 时 `show('先完成候选字，再保存')` 并 return。b) 落拼音而非「中」→退出前 `textarea.blur()` 后**等一次 `compositionend`（≤300 ms）**再读 `liveSource`，**不得只 blur 照旧读值**（H4）；等不到且比对 blur 前后 value 确认丢字→提示「先完成候选字，再退出」并 return（不卸载、盘不变）。拦退只在确认丢字时启用，文本仍在的退出不拦，A2 的 Esc 断言才不假红。
3. 两条都不写→B-149 `verified`；余时复核 A1–A3 边界。
4. 验收：a/b 各 2 轮；组合期 0 写且有提示；提交后 Ctrl+S 写 100_011 含「中」不含 `zhong`；Esc 退出后正文含「中」不含 `zhong`、≤3.4 s 写盘；拦退分支给「value 前后对比＋盘不变＋组合结束后再 Esc 可退」，CDP 造不出 compositionend 记 UNVERIFIED；0 错误。门禁 `verify`、`test`。

收尾：BACKLOG 五项状态、`round-68/{impl,test}.md`、日志 `.tmp/`。
